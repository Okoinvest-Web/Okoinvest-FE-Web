// src/lib/plattform/backend/frappe/eg-gruendung.js
//
// Frappe-Adapter WP5 „Gründungsdienstleistung, Wechsel, Vereinsorganisation, Förder-Check, Lieferantenpflichten“.
// Methoden in oekoinvest_app.plattform.api.eg_gruendung – Signaturen identisch zu backend/demo/eg-gruendung.js (Vertrag:
// docs/EG-SCHNITTSTELLEN.md Abschnitt 4, Ergänzungen docs/eg/gruendung.md). Frappe prüft Rolle und Kontext selbst.
//
// Orchestrierung über Paketgrenzen (wie im Demo-Backend, ohne Zyklus über die Fassade backend/eg.js). Jede dieser Aktionen
// lässt Frappe zuerst prüfen (Rechte, Status) und führt erst dann die Operationen der anderen Pakete aus:
//   signatur              – PDF „Angebot und Auftrag“ hier rendern → Signatur-Modul (service.signaturAnlegen) → verknüpfen
//   gemeinschaft_anlegen  – WP1 egGemeinschaftSpeichern + egGemeinschaftStatus (Statuspfad) → verknüpfen
//   probeabrechnung       – WP4 abPeriodeAnlegen (art „probe“) + Vorschau → Kontrollvergleich in Frappe speichern
//   Schritt erledigt      – Felder/Status setzt Frappe mit den WP1-Regeln in einer Transaktion; Ereignis an WP2 sendet der Adapter
//   Import ausführen      – Plan aus Frappe → WP1 egCsvImport/egMassenaktion/egTarifSpeichern → Ergebnis ablegen → WP2 EC_PODLIST
//   Organe, Auflösung     – WP1 egOrganSpeichern/egOrganBeenden bzw. egGemeinschaftStatus

import { createHash } from "node:crypto";
import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { EG_EREIGNISSE, GEMEINSCHAFT_STATUS } from "../../eg/modell";
import { GR_PAKETE, gemeinschaftAusAuftrag, statusPfad } from "../../eg/gruendung";
import { probeKontrollwerte, probePeriode, umstellungsplan } from "../../eg/wechsel";
import { VORLAGEN, dokumentDaten, vorlageRendern } from "../../eg/vertraege";
import { egDokumentPdf } from "../../server/eg-gruendung-pdf";
import { egCsvImport, egGemeinschaft, egGemeinschaftSpeichern, egGemeinschaftStatus, egMassenaktion, egNetzbetreiber, egOrganBeenden, egOrganSpeichern, egTarifSpeichern } from "./eg-stamm";
import * as eda from "./eg-eda";
import * as abrechnung from "./eg-abrechnung";
import { signaturAnlegen } from "./service";

Object.assign(METHODEN, {
  grAuftraege: "eg_gruendung.auftraege",
  grAuftrag: "eg_gruendung.auftrag",
  grAuftragAnlegen: "eg_gruendung.auftrag_anlegen",
  grAuftragAktion: "eg_gruendung.auftrag_aktion",
  grSchrittAktion: "eg_gruendung.schritt_aktion",
  grDokumentErzeugen: "eg_gruendung.dokument_erzeugen",
  grImportVorschau: "eg_gruendung.import_vorschau",
  grImportAusfuehren: "eg_gruendung.import_ausfuehren",
  grFoerdercheck: "eg_gruendung.foerdercheck",
  grVersammlungen: "eg_gruendung.versammlungen",
  grAufloesung: "eg_gruendung.aufloesung",
});

const SYSTEM = { id: "system-eg", rollen: ["admin"], backofficeRollen: ["leitung"], system: true };
const sha256 = (t) => createHash("sha256").update(String(t), "utf8").digest("hex");
const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");
const liste = (l) => (Array.isArray(l) ? l.slice(0, 5000).map((x) => ({ schluessel: String(x.schluessel || ""), name: String(x.name || ""), kwh: Number(x.kwh) || 0, betragEur: Number(x.betragEur) || 0 })).filter((x) => x.schluessel) : []);

/** Ereignis an WP2/WP4 (wie backend/eg.js egEreignisSenden; Fehler des Empfängers werden als Meldung zurückgegeben) */
async function ereignisSenden(name, payload) {
  const e = EG_EREIGNISSE[name];
  const ziel = e?.operation ? { ...eda, ...abrechnung }[e.operation] : null;
  if (typeof ziel !== "function") return { zugestellt: false };
  try {
    return { zugestellt: true, ergebnis: await ziel(SYSTEM, e.argument ? payload?.[e.argument] : payload) };
  } catch (x) {
    return { zugestellt: false, fehler: x?.status === 501 ? `${e.operation} ist noch nicht verfügbar (Ereignis vorgemerkt).` : x?.message || "Fehler" };
  }
}

// ================================================================ Aufträge

export const grAuftraege = (n, filter = {}) => aufruf("grAuftraege", { filter }, n);
export const grAuftrag = (n, id) => aufruf("grAuftrag", { id }, n);
export const grAuftragAnlegen = (n, { daten = {} } = {}) => aufruf("grAuftragAnlegen", { daten }, n);

export async function grAuftragAktion(n, id, { aktion = "", ...d } = {}) {
  const senden = (daten) => aufruf("grAuftragAktion", { id, daten }, n);
  if (!["signatur", "gemeinschaft_anlegen", "probeabrechnung"].includes(aktion)) return senden({ aktion, ...d });
  await senden({ aktion }); // Vorprüfung in Frappe (403/409 bzw. { ok: true })
  const a = await grAuftrag(n, id);

  if (aktion === "signatur") {
    const nb = await egNetzbetreiber(n).catch(() => []);
    const dok = vorlageRendern(VORLAGEN.gruendungsauftrag, dokumentDaten({ auftrag: { ...a, paketLabel: GR_PAKETE[a.paket]?.label }, netzbetreiber: Array.isArray(nb) ? nb : nb?.netzbetreiber || [], eingaben: {}, heute: a.heute }));
    const pdf = egDokumentPdf(dok, { sha256: sha256(dok.text), kopfzeile: "Angebot und Auftrag" });
    const s = await signaturAnlegen(n, { titel: `Auftrag ${a.angebot.nummer} – ${a.arbeitsname}`, art: "sonstiges", pdfBase64: Buffer.from(pdf).toString("base64"), dateiname: `auftrag-${a.angebot.nummer}.pdf`, fristTage: 21, nachricht: "Bitte prüfen und unterschreiben Sie den Auftrag zur Gründungsdienstleistung.", unterzeichner: [{ kontoId: a.auftraggeberKontoId }] });
    return senden({ aktion: "signatur_verknuepfen", signaturId: s?.id || s?.vorgang?.id || "" });
  }

  if (aktion === "gemeinschaft_anlegen") {
    const g = await egGemeinschaftSpeichern(n, { daten: gemeinschaftAusAuftrag(a, d.daten || {}) });
    const meldungen = [];
    let status = g.status;
    for (const s of statusPfad(status, a.paket === "wechsel" ? "aktiv" : "in_gruendung")) {
      try {
        status = (await egGemeinschaftStatus(n, g.id, { nach: s, grund: `Gründungsauftrag ${a.id}` })).status;
      } catch (e) {
        meldungen.push(`Status „${GEMEINSCHAFT_STATUS[s]?.label || s}“ noch nicht erreicht: ${e.message}`);
        break;
      }
    }
    return { ...(await senden({ aktion: "gemeinschaft_verknuepfen", gemeinschaftId: g.id })), meldungen };
  }

  // probeabrechnung
  const plan = umstellungsplan({ stichtag: a.stichtag, heute: a.heute });
  const von = String(d.von || plan.parallelVon || "");
  const bis = String(d.bis || plan.parallelBis || "");
  let neu = [];
  let wp4;
  try {
    const p = await abrechnung.abPeriodeAnlegen(n, a.gemeinschaftId, probePeriode({ von, bis }));
    const pid = p?.id || p?.periode?.id;
    const v = await abrechnung.abPeriodeAktion(n, pid, { aktion: "vorschau" });
    // WP4 liefert die Vorschau als { periode: { vorschau: { belege[] } } } – Belege → Kontrollzeilen (eg/wechsel.js)
    neu = liste(probeKontrollwerte(v?.periode?.vorschau?.belege || v?.vorschau?.belege || []));
    wp4 = { ok: true, text: `Probe-Periode ${pid || ""} angelegt (${datumDe(von)} bis ${datumDe(bis)}).` };
  } catch (e) {
    wp4 = { ok: false, text: e?.status === 501 ? "Die Probe-Abrechnung (WP4) ist noch nicht verfügbar – Vergleich mit den übergebenen Werten." : `Probe-Abrechnung nicht möglich: ${e.message}` };
    neu = liste(d.neu);
  }
  return senden({ aktion: "kontrolle_speichern", alt: liste(d.alt), neu, von, bis, wp4, toleranzEur: Number(d.toleranzEur) || 0.05, toleranzKwh: Number(d.toleranzKwh) || 0.5 });
}

export async function grSchrittAktion(n, id, { schritt = "", aktion = "", ...d } = {}) {
  const r = await aufruf("grSchrittAktion", { id, daten: { schritt, aktion, ...d } }, n);
  if (r?.ereignis && r.gemeinschaftId) {
    const ev = await ereignisSenden(r.ereignis, { gemeinschaftId: r.gemeinschaftId });
    r.meldungen = [...(r.meldungen || []), ev.zugestellt ? "EDA-Erstanmeldung kann starten (Ereignis an WP2 zugestellt)." : `Ereignis „${r.ereignis}“: ${ev.fehler || "ohne Empfänger"}`];
  }
  return r;
}

// ================================================================ Dokumente, Förder-Check

export const grDokumentErzeugen = (n, { gemeinschaftId = "", auftragId = "", vorlage = "", daten = {}, dokumentId = "", speichern = true } = {}) =>
  aufruf("grDokumentErzeugen", { gemeinschaftId, auftragId, vorlage, daten, dokumentId, speichern }, n);
export const grFoerdercheck = (n, { gemeinschaftId = "", auftragId = "", daten = {}, speichern = false } = {}) => aufruf("grFoerdercheck", { gemeinschaftId, auftragId, daten, speichern }, n);

// ================================================================ Import (Wechsel)

export const grImportVorschau = (n, gemeinschaftId, daten = {}) => aufruf("grImportVorschau", { gemeinschaftId, daten }, n);

export async function grImportAusfuehren(n, importId, { ohneFehlerzeilen = true, tarifUebernehmen = true } = {}) {
  const p = await aufruf("grImportAusfuehren", { importId, daten: { phase: "plan", ohneFehlerzeilen } }, n);
  const { plan, gemeinschaftId: gid } = p;
  const ergebnis = { angelegt: 0, geaendert: 0, aktiviert: 0, tarifId: "", fehlerZeilen: p.fehlerZeilen, uebersprungen: p.uebersprungen, podlist: "", meldungen: [] };
  try {
    if (plan.zeilen) {
      const r = await egCsvImport(n, gid, { art: "mitglieder", csv: plan.csv, ausfuehren: true });
      ergebnis.angelegt = r.angelegt;
      ergebnis.geaendert = r.geaendert;
    }
    const nr = new Set(plan.mitglieder.filter((m) => m.status === "aktiv").map((m) => String(m.mitgliedsnummer)));
    if (nr.size) {
      const mg = (await egGemeinschaft(n, gid)).mitglieder || [];
      const ids = mg.filter((m) => m.status === "aufgenommen" && nr.has(String(m.mitgliedsnummer))).map((m) => m.id);
      if (ids.length) {
        const r = await egMassenaktion(n, gid, { aktion: "mitglied_status", ids, werte: { nach: "aktiv" } });
        ergebnis.aktiviert = r.geaendert ?? r.anzahl ?? 0;
        if (r.fehler?.length) ergebnis.meldungen.push(`${r.fehler.length} Mitglied(er) nicht aktiviert.`);
      }
    }
    if (tarifUebernehmen && plan.tarif && plan.tarif.bezugspreisCt !== null && plan.tarif.einspeisepreisCt !== null) {
      try {
        const t = await egTarifSpeichern(n, { gemeinschaftId: gid, daten: { bezeichnung: `Übernommen aus ${p.anbieterLabel}`, gueltigAb: p.stichtag || p.heute, bezugspreisCt: plan.tarif.bezugspreisCt, einspeisepreisCt: plan.tarif.einspeisepreisCt, status: "entwurf" } });
        ergebnis.tarifId = t.id;
      } catch (e) {
        ergebnis.meldungen.push(`Tarif nicht übernommen: ${e.message}`);
      }
    }
  } catch (e) {
    await aufruf("grImportAusfuehren", { importId, daten: { phase: "abschliessen", ergebnis: { ...ergebnis, fehler: e.message } } }, n).catch(() => null);
    throw e;
  }
  const ev = await ereignisSenden("eg.import.uebernommen", { gemeinschaftId: gid });
  ergebnis.podlist = ev.zugestellt ? "EC_PODLIST angefordert – Abgleich Soll/Ist folgt (WP2)." : ev.fehler || "kein Empfänger";
  return aufruf("grImportAusfuehren", { importId, daten: { phase: "abschliessen", ergebnis, soll: plan.soll, zuordnungNummern: plan.mitglieder.map((m) => ({ alt: m.alteNummer, neu: m.mitgliedsnummer, saldoEur: m.saldoEur })) } }, n);
}

// ================================================================ Verein, Auflösung

export async function grVersammlungen(n, gemeinschaftId, { aktion = "", id = "", daten = {} } = {}) {
  if (aktion === "organ_speichern") await egOrganSpeichern(n, { gemeinschaftId, id: id || null, daten });
  else if (aktion === "organ_beenden") await egOrganBeenden(n, id, { bis: daten?.bis });
  else return aufruf("grVersammlungen", { gemeinschaftId, daten: { aktion, id, daten } }, n);
  return aufruf("grVersammlungen", { gemeinschaftId, daten: {} }, n);
}

export async function grAufloesung(n, gemeinschaftId, { aktion = "lesen", punkt = "", erledigt = true, notiz = "", grund = "" } = {}) {
  const daten = { aktion, punkt, erledigt, notiz, grund };
  if (aktion === "starten" || aktion === "abschliessen") {
    await aufruf("grAufloesung", { gemeinschaftId, daten: { ...daten, phase: "pruefen" } }, n);
    await egGemeinschaftStatus(n, gemeinschaftId, aktion === "starten" ? { nach: "in_aufloesung", grund } : { nach: "aufgeloest", grund: grund || "Auflösung abgeschlossen (Checkliste vollständig)" });
  }
  return aufruf("grAufloesung", { gemeinschaftId, daten }, n);
}

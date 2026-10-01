// src/lib/plattform/backend/demo/eg-abrechnung.js
//
// Demo-Backend WP4 „Abrechnung, Steuer, Zahlung, Vereinsbuchhaltung“ – Referenz für plattform/api/eg_abrechnung.py.
// Vertrag: docs/EG-SCHNITTSTELLEN.md, Abschnitt 4 (WP4). Regeln: src/lib/plattform/eg/{abrechnung,ust,belege,ersparnis,
// zahlung,buchhaltung}.js. Daten unter db.egAbrechnung (eigene Sammlung): perioden, belege, zahlungen (Läufe, Importe,
// Einzelzahlungen), buchungen, zaehler (Nummernkreise je Gemeinschaft), einstellungen, verrechnet, pruefvermerke, anfang.
//
// Rechte (eg/rechte.js, je Gemeinschaft; ohne Rolle → 404, mit Rolle ohne Recht → 403):
//   abrechnung_vorschau ≥ 1  Perioden und Vorschau sehen; anlegen/berechnen: zusätzlich Kassier, Vorstand oder Organisator
//   abrechnung_freigabe_1/2  Vier-Augen: Kassier (1. Auge) und Obmann/Vorstand (2. Auge), zwei verschiedene Konten;
//                            Freigaben gelten nur für den Fingerabdruck der Vorschau (neu berechnet → Freigaben verfallen)
//   abrechnung_versand 2     Versand (Organisator); Belege erscheinen im Mitgliedsportal (WP6 liest über abBelege)
//   sepa 2                   Zahlungsläufe (pain.008/pain.001), Kontoauszug, Mahnlauf, Zahlung erfassen; die Datei steht
//                            erst nach Freigabe durch eine zweite Person (sepa 2 oder Vorstand) bereit (Fachkonzept 5)
//   buchhaltung ≥ 1          E/A-Rechnung, Kassabuch, UVA, Exporte (protokolliert); schreiben (Buchung, Kassa) = 2
//   buchhaltung_pruefen 2    Prüfvermerk der Rechnungsprüfung
//   eigene_daten             Mitglied sieht nur eigene, versendete Belege (ohne interne Prüfpfade), eigene Jahresbescheinigung
// Zusätzlich zum Vertrag (Patch an WP1 für EG_OPERATIONEN): abEinstellungenSpeichern, abZahlungslaufAktion, abZahlungErfassen,
// abBuchungSpeichern, abPruefvermerk, abMandate.

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import { egStufe, egRechteVon } from "../../eg/rechte";
import { kennzahlen as egKennzahlen } from "../../eg/stamm";
import { MITGLIED_ARTEN } from "../../eg/modell";
import { EINSTELLUNGEN_STANDARD, PERIODEN_ARTEN, PERIODE_AKTIONEN, PERIODE_STATUS, abrechnungBerechnen, abrechnungFruehestens, altwerteLesen, faelligkeit, freigabePruefen, periodeBereinigen, periodeVorschlag, probeVergleich, vorschauFingerabdruck } from "../../eg/abrechnung";
import { BELEG_OFFEN, BELEG_STATUS, BELEG_TYPEN, belegFuerMitglied, belegInhalt, belegLuecken, belegOffen, belegStornieren, nummernVergeben, naechsteNummer, statusNachZahlung } from "../../eg/belege";
import { kuMonitor } from "../../eg/ust";
import { MAHN_FAIR, ZAHLUNG_ARTEN, camtAbgleich, egMahnvorschlag, mandatPruefen, zahlungsdatei, zahlungslaufBilden, ruecklastschriftGebuehr } from "../../eg/zahlung";
import { BUCHUNG_KATEGORIEN, EG_KONTEN, EXPORT_ARTEN, buchungBereinigen, buchungenAusZahlung, eaRechnung, exportErzeugen, jahresbescheinigung, kassabuch, pruefvermerkBereinigen, uvaVorbereitung } from "../../eg/buchhaltung";
import { mahnText } from "../../buchhaltung/mahnwesen";
import { ibanMaskiert } from "../../mitglied/basis";
import { intern } from "../demo";
import { aendern } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { egIntern } from "./eg-stamm";
import * as energie from "./eg-energie";
import { DEMO_EINSTELLUNGEN, EG_ABRECHNUNG_SEED_VERSION, ersatzwerte, werteAusWp3 } from "./eg-abrechnung-seed";

const { protokoll, benachrichtigen, nutzerById, nameVon } = intern;
const { lesenBereit, kontext, gemeinschaftVon, heute, E } = egIntern;
const SYS = () => ({ id: "system-eg", rollen: ["admin"], backofficeRollen: ["leitung"], system: true });
const A = (db) => db.egAbrechnung;
const leer = () => ({ v: EG_ABRECHNUNG_SEED_VERSION, perioden: [], belege: [], zahlungen: [], buchungen: [], zaehler: {}, einstellungen: {}, verrechnet: {}, pruefvermerke: [], anfang: {} });
const meta = (n) => ({ erstelltAm: jetzt(), erstelltVon: n?.system ? null : n?.id || null, geaendertAm: jetzt(), geaendertVon: n?.system ? null : n?.id || null });
const geaendert = (o, n) => Object.assign(o, { geaendertAm: jetzt(), geaendertVon: n?.system ? null : n?.id || null });
const datumOk = (v) => /^\d\d\d\d-\d\d-\d\d$/.test(String(v || ""));
const eur = (x) => `${(Math.round((Number(x) || 0) * 100) / 100).toFixed(2).replace(".", ",")} €`;
const nameM = (m) => m?.person?.firma || `${m?.person?.vorname || ""} ${m?.person?.nachname || ""}`.trim();
const fach = (fn) => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof PlattformFehler) throw e;
    throw ungueltig(e?.message || "Ungültige Eingabe.");
  }
};

// ================================================================ Zugriff

/** Gemeinschaft + Kontext; ohne Rolle 404, ohne eines der Rechte 403. `rechte`: [[recht, stufe], …] (eines genügt) */
function zugriff(db, n, gid, rechte, text = "Ihre Rolle in dieser Gemeinschaft erlaubt diese Aktion nicht.") {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const g = gemeinschaftVon(db, gid);
  if (!g) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  const k = kontext(db, n, g);
  if (!k.rollen.length && !k.backofficeStufe) throw nichtGefunden("Gemeinschaft nicht gefunden.");
  if (!rechte.some(([r, s]) => egStufe(k, r) >= s)) throw verboten(text);
  return { g, k };
}
const stufen = (k) => ({ vorschau: egStufe(k, "abrechnung_vorschau"), freigabe1: egStufe(k, "abrechnung_freigabe_1"), freigabe2: egStufe(k, "abrechnung_freigabe_2"), versand: egStufe(k, "abrechnung_versand"), sepa: egStufe(k, "sepa"), buchhaltung: egStufe(k, "buchhaltung"), pruefen: egStufe(k, "buchhaltung_pruefen"), tarife: egStufe(k, "tarife") });
const darfRechnen = (s) => s.vorschau >= 2 || (s.vorschau >= 1 && (s.freigabe1 >= 2 || s.freigabe2 >= 2));
const einstellungenVon = (db, gid) => ({ ...EINSTELLUNGEN_STANDARD, ...(A(db).einstellungen[gid] || {}) });
const lieferantenpflichtenVon = (db, g) => egKennzahlen(g, E(db)).lieferantenpflichten;

// ================================================================ Energiedaten (WP3) und Demo-Bestand

/** Periodenwerte von WP3 (Systemkonto – das Recht ist hier bereits geprüft); bei 501/Fehler Ersatzwerte (Demo) */
async function periodenwerte(db, g, von, bis) {
  const tarife = E(db).tarife.filter((t) => t.gemeinschaftId === g.id);
  try {
    const r = await energie.enPeriodenwerte(SYS(), g.id, von, bis);
    const w = werteAusWp3(r, { tarife, von, bis });
    if (w.length) return { werte: w, quelle: "netzbetreiber", hinweis: r?.hinweis || "" };
  } catch (e) {
    if (!(e instanceof PlattformFehler)) console.warn("[eg-abrechnung] Periodenwerte WP3:", e?.message);
  }
  return { werte: ersatzwerte({ g, x: E(db), von, bis }), quelle: "ersatz", hinweis: "Energiedaten des Netzbetreibers (WP3) nicht verfügbar – Ersatzdaten (Demo) zur Vorführung, im Echtbetrieb nicht abrechenbar." };
}

function berechnen(db, g, p, werte, { mitgliederFilter = null } = {}) {
  const x = E(db);
  return abrechnungBerechnen({
    gemeinschaft: g, periode: p, mitglieder: x.mitglieder.filter((m) => m.gemeinschaftId === g.id && (!mitgliederFilter || mitgliederFilter.includes(m.id))), zaehlpunkte: x.zaehlpunkte,
    teilnahmen: x.teilnahmen.filter((t) => t.gemeinschaftId === g.id), tarife: x.tarife.filter((t) => t.gemeinschaftId === g.id), anlagen: x.anlagen.filter((a) => a.gemeinschaftId === g.id),
    netzbetreiber: x.netzbetreiber, werte, einstellungen: einstellungenVon(db, g.id), verrechnet: A(db).verrechnet[g.id] || { beitritt: [], beitrag: [] }, lieferantenpflichten: lieferantenpflichtenVon(db, g), heute: heute(),
  });
}

/** Freigegebene Belege einer Vorschau anlegen (Nummern, Datum, Fälligkeit, Prüfsumme, Verrechnungsvermerke) */
function belegeFinalisieren(db, g, p, entwuerfe, datum) {
  const a = A(db);
  const mitIds = entwuerfe.map((b) => ({ ...b, id: neueId("EBL") }));
  const { nummern, zaehler } = nummernVergeben(mitIds, a.zaehler[g.id] || {}, Number(datum.slice(0, 4)));
  a.zaehler[g.id] = zaehler;
  const ein = einstellungenVon(db, g.id);
  const ver = (a.verrechnet[g.id] ||= { beitritt: [], beitrag: [] });
  const neu = mitIds.map((b) => {
    const f = { ...b, nummer: nummern[b.id], datum, faelligAm: faelligkeit(datum, ein.zahlungszielTage), status: "final", zahlungen: [], mahnungen: [], periodeId: p.id, ...meta(null), demo: true };
    f.hash = sha256(belegInhalt(f));
    for (const v of b.verrechnet || []) {
      const [art, mid, j] = v.split(":");
      if (art === "beitritt" && !ver.beitritt.includes(mid)) ver.beitritt.push(mid);
      if (art === "beitrag" && !ver.beitrag.includes(`${mid}:${j}`)) ver.beitrag.push(`${mid}:${j}`);
    }
    return f;
  });
  a.belege.push(...neu);
  return neu;
}

function zahlungBuchen(db, g, b, { betrag, datum, art, referenz = "", zahlungId = null, n = null, geldkonto = "2800" }) {
  b.zahlungen = [...(b.zahlungen || []), { betrag: Math.abs(betrag), datum, art, referenz, zahlungId }];
  b.status = statusNachZahlung(b);
  geaendert(b, n);
  for (const z of buchungenAusZahlung(b, { betrag: Math.abs(betrag), datum, id: zahlungId }, { geldkonto })) A(db).buchungen.push({ id: neueId("EBU"), gemeinschaftId: g.id, ...z, ...meta(n) });
}

async function bereit() {
  const db = await lesenBereit();
  if ((db.egAbrechnung?.v || 0) >= EG_ABRECHNUNG_SEED_VERSION) return db;
  // Seed: Energiedaten außerhalb der Schreibsperre holen (WP3 liest und seedet selbst)
  const g = E(db).gemeinschaften.find((x) => x.seedSchluessel === "sonnenland");
  const monate = [];
  let s = heute();
  if (g) {
    for (let i = 0; i < 3; i++) {
      const p = periodeVorschlag("monat", s);
      monate.unshift(p);
      s = p.von;
    }
  }
  const werte = [];
  for (const p of monate) werte.push(await periodenwerte(db, g, p.von, p.bis));
  await aendern(async (d) => {
    if ((d.egAbrechnung?.v || 0) >= EG_ABRECHNUNG_SEED_VERSION) return;
    d.egAbrechnung = leer();
    if (!g || !d.eg?.gemeinschaften?.some((x) => x.id === g.id)) return;
    try {
      seed(d, g, monate, werte);
    } catch (e) {
      console.warn("[plattform-demo] EG-Abrechnung: Demodaten nicht ergänzt:", e?.message);
      d.egAbrechnung = leer();
    }
  });
  return lesenBereit();
}

function seed(d, g, monate, werte) {
  const a = A(d);
  const ein = structuredClone(DEMO_EINSTELLUNGEN);
  const erzeugerZp = new Set(d.eg.zaehlpunkte.filter((z) => z.richtung === "erzeugung").map((z) => z.id));
  for (const t of d.eg.teilnahmen.filter((t) => t.gemeinschaftId === g.id && erzeugerZp.has(t.zaehlpunktId))) ein.gutschriftverfahren[t.mitgliedId] = { zugestimmtAm: monate[0].von, widersprochenAm: "" };
  a.einstellungen[g.id] = ein;
  a.anfang[g.id] = { [monate[0].von.slice(0, 4)]: { bank: 2400, kassa: 35 } };
  monate.forEach((m, i) => {
    const p = { id: neueId("EPR"), gemeinschaftId: g.id, ...m, probe: false, status: "offen", freigaben: [], fingerabdruck: "", vorschau: null, hinweise: [], datenquelle: werte[i].quelle, verlauf: [{ am: jetzt(), text: "Periode angelegt (Demo)" }], ...meta(null), demo: true };
    a.perioden.push(p);
    if (i === monate.length - 1) return; // jüngste Periode bleibt offen: Vorschau und Vier-Augen-Freigabe zum Ausprobieren
    const r = berechnen(d, g, p, werte[i].werte);
    const datum = abrechnungFruehestens(p.bis) < heute() ? abrechnungFruehestens(p.bis) : heute();
    const fp = vorschauFingerabdruck(r.belege);
    const belege = belegeFinalisieren(d, g, p, r.belege, datum);
    Object.assign(p, {
      status: i === 0 ? "abgeschlossen" : "versendet", kennzahlen: r.kennzahlen, kontrolle: r.kontrolle, fingerabdruck: fp, freigegebenAm: `${datum}T09:30:00.000Z`,
      freigaben: [{ auge: 1, kontoId: null, name: "Karin Kassier (Demo)", am: `${datum}T08:00:00.000Z`, fingerabdruck: fp }, { auge: 2, kontoId: null, name: "Otto Obmann (Demo)", am: `${datum}T09:30:00.000Z`, fingerabdruck: fp }],
    });
    p.verlauf.push({ am: `${datum}T09:30:00.000Z`, text: `Freigegeben (Kassier + Obmann, Demo): ${belege.length} Belege` });
    for (const b of belege) {
      b.status = "versendet";
      b.versendetAm = `${datum}T10:00:00.000Z`;
      // ältere Periode vollständig bezahlt; jüngere: Lastschriften und Gutschriften bezahlt, Überweiser teils offen (Mahnbeispiel)
      const zahlt = i === 0 || b.zahlweg?.art === "lastschrift" || b.typ === "gutschrift" || b.mitgliedsnummer % 3 !== 0;
      if (zahlt) zahlungBuchen(d, g, b, { betrag: Math.abs(b.summen.brutto), datum: b.faelligAm < heute() ? b.faelligAm : heute(), art: b.typ === "gutschrift" ? "pain001" : b.zahlweg?.art === "lastschrift" ? "pain008" : "ueberweisung", referenz: b.nummer });
    }
  });
  for (const [datum, konto, betrag, satz, text, geldkonto, belegNr] of [
    [monate[0].von, "7300", 89.4, 20, "Plattform- und Organisatorgebühr (Demo)", "2800", "ER-DEMO-01"],
    [monate[1].von, "7600", 214, 0, "Vereins-Haftpflichtversicherung (Demo)", "2800", "ER-DEMO-02"],
    [monate[1].bis, "4890", 120, 0, "Spenden Sommerfest (Kassa, Demo)", "2700", "Q-DEMO-01"],
    [monate[1].bis, "7600", 18.6, 20, "Getränke Sommerfest (Kassa, Demo)", "2700", "Q-DEMO-02"],
    [monate[0].bis, "7700", 6.9, 0, "Kontoführung (Demo)", "2800", "BK-DEMO-01"],
  ]) a.buchungen.push({ id: neueId("EBU"), gemeinschaftId: g.id, ...buchungBereinigen({ datum, konto, betrag, ustSatz: satz, text, geldkonto, belegNr }), ...meta(null), demo: true });
}

// ================================================================ Ausgabe

const MASKE = (iban) => (iban ? ibanMaskiert(iban) : "");
function belegAusgabe(b, { voll = true } = {}) {
  const basis = {
    ...b, typLabel: BELEG_TYPEN[b.typ]?.label || b.typ, statusLabel: BELEG_STATUS[b.status]?.label || b.status, ton: BELEG_STATUS[b.status]?.ton || "neutral", brutto: b.summen?.brutto, offen: belegOffen(b),
    zahlweg: b.zahlweg ? { ...b.zahlweg, iban: undefined, ibanMaskiert: MASKE(b.zahlweg.iban) } : null, pdfUrl: `/api/portal/eg/${b.gemeinschaftId}/abrechnung/belege/${b.id}/pdf`,
  };
  return voll ? basis : belegFuerMitglied(basis);
}
function periodeAusgabe(p, { mitBelegen = false, db = null } = {}) {
  const v = p.vorschau;
  return {
    ...p, artLabel: PERIODEN_ARTEN[p.art] || p.art, statusLabel: PERIODE_STATUS[p.status]?.label || p.status, ton: PERIODE_STATUS[p.status]?.ton || "neutral", aktionen: PERIODE_AKTIONEN[p.status] || [],
    fruehestens: abrechnungFruehestens(p.bis),
    vorschau: v ? { ...v, belege: mitBelegen ? v.belege : undefined, anzahlBelege: v.belege?.length || 0 } : null,
    anzahlBelege: db ? A(db).belege.filter((b) => b.periodeId === p.id).length : undefined,
  };
}

// ================================================================ Perioden

export async function abPerioden(n, gemeinschaftId) {
  const db = await bereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, [["abrechnung_vorschau", 1], ["buchhaltung", 1], ["sepa", 1]]);
  const a = A(db);
  const s = stufen(k);
  const belege = a.belege.filter((b) => b.gemeinschaftId === g.id);
  const offen = belege.filter((b) => BELEG_OFFEN.includes(b.status));
  const ein = einstellungenVon(db, g.id);
  return {
    gemeinschaft: { id: g.id, name: g.name, kurzname: g.kurzname, modell: g.modell, ustStatus: g.ustStatus, uid: g.uid, creditorId: g.creditorId, iban: MASKE(g.iban), abrechnungsrhythmus: g.abrechnungsrhythmus, lieferantenpflichten: lieferantenpflichtenVon(db, g), dienstleistung: !!g.dienstleistung?.aktiv },
    perioden: a.perioden.filter((p) => p.gemeinschaftId === g.id).sort((x, y) => (x.von < y.von ? 1 : x.von > y.von ? -1 : 0)).map((p) => periodeAusgabe(p, { db })),
    vorschlaege: ["monat", "quartal", "jahr"].map((art) => periodeVorschlag(art, heute())),
    kennzahlen: {
      offeneForderungen: Math.round(offen.filter((b) => b.typ === "rechnung").reduce((x, b) => x + belegOffen(b), 0) * 100) / 100,
      offeneGutschriften: Math.round(offen.filter((b) => b.typ === "gutschrift").reduce((x, b) => x + belegOffen(b), 0) * 100) / 100,
      ueberfaellig: offen.filter((b) => b.typ === "rechnung" && b.faelligAm < heute()).length, belegeJahr: belege.filter((b) => String(b.datum).startsWith(heute().slice(0, 4))).length, luecken: belegLuecken(belege),
    },
    ku: kuIntern(db, g),
    einstellungen: s.tarife >= 1 || s.buchhaltung >= 1 ? ein : { zahlungszielTage: ein.zahlungszielTage },
    mitglieder: E(db).mitglieder.filter((m) => m.gemeinschaftId === g.id && !["abgelehnt", "interessent"].includes(m.status)).map((m) => ({ id: m.id, mitgliedsnummer: m.mitgliedsnummer, name: nameM(m), art: m.art, artLabel: MITGLIED_ARTEN[m.art]?.label || m.art, schutzbeduerftig: !!m.schutzbeduerftig })),
    zahlungslaeufe: a.zahlungen.filter((z) => z.gemeinschaftId === g.id).sort((x, y) => (x.erstelltAm < y.erstelltAm ? 1 : -1)).slice(0, 30).map(({ xml, schluessel, ...z }) => ({ ...z, hatDatei: !!xml, anzahlSchluessel: (schluessel || []).length })),
    rechte: egRechteVon(k), rollen: k.rollen, stufen: s, darfRechnen: darfRechnen(s), heute: heute(),
  };
}

export async function abPeriodeAnlegen(n, gemeinschaftId, { von = "", bis = "", art = "monat", probe = false } = {}) {
  const db = await bereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, [["abrechnung_vorschau", 1]]);
  if (!darfRechnen(stufen(k))) throw verboten("Perioden legen Kassier, Vorstand oder der Organisator an.");
  return aendern((d) => {
    const vorhandene = A(d).perioden.filter((p) => p.gemeinschaftId === g.id);
    const p0 = fach(() => periodeBereinigen({ von, bis, art, probe }, { heute: heute(), vorhandene }));
    const p = { id: neueId("EPR"), gemeinschaftId: g.id, von: p0.von, bis: p0.bis, art: p0.art, probe: p0.probe, status: p0.probe ? "probe" : "offen", freigaben: [], fingerabdruck: "", vorschau: null, hinweise: p0.hinweise, verlauf: [{ am: jetzt(), text: p0.probe ? "Probe-Abrechnung angelegt" : "Periode angelegt", von: n.id }], ...meta(n) };
    A(d).perioden.push(p);
    protokoll(d, n, "eg_abrechnung", "eg_gemeinschaft", g.id, `${p.probe ? "Probe-Abrechnung" : "Abrechnungsperiode"} ${p.von} bis ${p.bis} angelegt`);
    return periodeAusgabe(p);
  });
}

const blockierend = (v) => (v?.pruefung?.fehler || []).length;

export async function abPeriodeAktion(n, id, daten = {}) {
  const aktion = String(daten.aktion || "");
  const db = await bereit();
  const p0 = A(db).perioden.find((p) => p.id === String(id || ""));
  if (!p0) throw nichtGefunden("Periode nicht gefunden.");
  const { g, k } = zugriff(db, n, p0.gemeinschaftId, [["abrechnung_vorschau", 1], ["buchhaltung", 1]]);
  const s = stufen(k);
  if (aktion === "lesen") return { periode: periodeAusgabe(p0, { mitBelegen: true, db }), belege: A(db).belege.filter((b) => b.periodeId === p0.id).map((b) => belegAusgabe(b)), stufen: s, darfRechnen: darfRechnen(s), kontoId: n.id };
  if (aktion !== "beleg_stornieren" && !(PERIODE_AKTIONEN[p0.status] || []).includes(aktion)) throw konflikt(`Im Status „${PERIODE_STATUS[p0.status]?.label || p0.status}“ ist „${aktion || "?"}“ nicht möglich.`);

  if (aktion === "vorschau") {
    if (!darfRechnen(s)) throw verboten("Die Vorschau berechnen Kassier, Vorstand oder der Organisator.");
    const w = await periodenwerte(db, g, p0.von, p0.bis);
    return aendern((d) => {
      const p = A(d).perioden.find((x) => x.id === p0.id);
      const r = berechnen(d, g, p, w.werte);
      const fp = vorschauFingerabdruck(r.belege);
      const gueltig = (p.freigaben || []).filter((f) => f.fingerabdruck === fp);
      if (p.freigaben?.length && !gueltig.length) p.verlauf.push({ am: jetzt(), text: "Zahlen geändert – bisherige Freigaben verfallen.", von: n.id });
      Object.assign(p, { vorschau: { ...r, hinweiseDaten: [...(p.hinweise || []), ...(w.hinweis ? [w.hinweis] : [])], berechnetAm: jetzt(), berechnetVon: n.id }, fingerabdruck: fp, freigaben: gueltig, datenquelle: w.quelle, status: p.probe ? "probe" : gueltig.length ? "freigabe_teilweise" : "vorschau", kennzahlen: r.kennzahlen, kontrolle: r.kontrolle });
      p.verlauf.push({ am: jetzt(), text: `Vorschau berechnet: ${r.belege.length} Belege, ${r.pruefung.fehler.length} blockierende Prüfungen`, von: n.id });
      geaendert(p, n);
      protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, `Vorschau ${p.von} bis ${p.bis}: ${r.belege.length} Belege`);
      return { periode: periodeAusgabe(p, { mitBelegen: true }) };
    });
  }

  if (aktion === "freigeben") {
    const ergebnis = await aendern((d) => {
      const p = A(d).perioden.find((x) => x.id === p0.id);
      const f = freigabePruefen(p, { stufen: { freigabe1: s.freigabe1, freigabe2: s.freigabe2 }, kontoId: n.id, fingerabdruck: String(daten.fingerabdruck || ""), blockierendeFehler: blockierend(p.vorschau) });
      if (!f.ok) throw s.freigabe1 >= 2 || s.freigabe2 >= 2 ? konflikt(f.grund) : verboten(f.grund);
      p.freigaben.push({ auge: f.auge, kontoId: n.id, name: nameVon(d, n.id), am: jetzt(), fingerabdruck: p.fingerabdruck });
      p.verlauf.push({ am: jetzt(), text: `Freigabe ${f.auge}. Auge (${f.auge === 1 ? "Kassier" : "Vorstand"}) – ${nameVon(d, n.id)}`, von: n.id });
      if (!f.vollstaendig) {
        p.status = "freigabe_teilweise";
        geaendert(p, n);
        protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, `Freigabe ${f.auge}. Auge`);
        return { periode: periodeAusgabe(p), vollstaendig: false };
      }
      const neu = belegeFinalisieren(d, g, p, p.vorschau.belege, heute());
      p.status = "freigegeben";
      p.freigegebenAm = jetzt();
      geaendert(p, n);
      protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, `Abrechnung freigegeben (Vier-Augen): ${neu.length} Belege ${neu[0]?.nummer || ""} bis ${neu[neu.length - 1]?.nummer || ""}`);
      return { periode: periodeAusgabe(p), vollstaendig: true, belege: neu.length };
    });
    if (ergebnis.vollstaendig) {
      try {
        const { egEreignisSenden } = await import("../eg");
        await egEreignisSenden("eg.periode.freigegeben", { gemeinschaftId: g.id, periodeId: p0.id });
      } catch (e) {
        console.warn("[eg-abrechnung] Ereignis eg.periode.freigegeben:", e?.message);
      }
    }
    return ergebnis;
  }

  if (aktion === "versenden") {
    if (s.versand < 2) throw verboten("Belege versendet der Organisator (Betriebsführung).");
    return aendern((d) => {
      const p = A(d).perioden.find((x) => x.id === p0.id);
      const belege = A(d).belege.filter((b) => b.periodeId === p.id && b.status === "final");
      let portal = 0;
      for (const b of belege) {
        b.status = "versendet";
        b.versendetAm = jetzt();
        const m = E(d).mitglieder.find((x) => x.id === b.mitgliedId);
        b.versandweg = m?.rechnungsweg || "email";
        const u = m?.kontoId ? nutzerById(d, m.kontoId) : null;
        if (u) {
          portal++;
          benachrichtigen(d, u, { art: "system", titel: `${BELEG_TYPEN[b.typ].label} ${b.nummer}`, text: `${g.name}: ${BELEG_TYPEN[b.typ].label} für ${b.von.split("-").reverse().join(".")} bis ${b.bis.split("-").reverse().join(".")} über ${eur(Math.abs(b.summen.brutto))} steht im Portal.`, link: "/portal/eg", objektArt: "eg_beleg", objektId: b.id }, { mail: false });
        }
      }
      p.status = "versendet";
      p.versendetAm = jetzt();
      p.verlauf.push({ am: jetzt(), text: `${belege.length} Belege versendet (${portal} ins Portal, übrige per E-Mail bzw. Post)`, von: n.id });
      geaendert(p, n);
      protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, `${belege.length} Belege versendet`);
      return { periode: periodeAusgabe(p), versendet: belege.length };
    });
  }

  if (aktion === "abschliessen") {
    if (s.freigabe1 < 2 && s.versand < 2) throw verboten("Abschließen dürfen Kassier oder Organisator.");
    return aendern((d) => {
      const p = A(d).perioden.find((x) => x.id === p0.id);
      p.status = "abgeschlossen";
      p.verlauf.push({ am: jetzt(), text: "Periode abgeschlossen", von: n.id });
      geaendert(p, n);
      protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, "Periode abgeschlossen");
      return { periode: periodeAusgabe(p) };
    });
  }

  if (aktion === "stornieren" || aktion === "beleg_stornieren") {
    if (s.freigabe1 < 2 && s.freigabe2 < 2) throw verboten("Stornieren dürfen Kassier oder Vorstand.");
    const grund = String(daten.grund || "").trim();
    if (grund.length < 5) throw ungueltig("Bitte einen Grund für das Storno angeben (mind. 5 Zeichen).");
    const korrekturWerte = aktion === "beleg_stornieren" && daten.korrektur ? await periodenwerte(db, g, p0.von, p0.bis) : null;
    return aendern((d) => {
      const p = A(d).perioden.find((x) => x.id === p0.id);
      const ziel = A(d).belege.filter((b) => b.periodeId === p.id && b.typ !== "storno" && b.status !== "storniert" && (aktion === "stornieren" || b.id === daten.belegId));
      if (!ziel.length) throw nichtGefunden("Kein stornierbarer Beleg gefunden.");
      const datum = heute();
      const jahr = Number(datum.slice(0, 4));
      const stornos = [];
      for (const b of ziel) {
        if (b.zahlungslaufId && !["bezahlt", "teilbezahlt"].includes(b.status)) throw konflikt(`${b.nummer} steckt in einem offenen Zahlungslauf – Lauf zuerst verwerfen.`);
        const nr = naechsteNummer(A(d).zaehler[g.id] || {}, "storno", jahr);
        A(d).zaehler[g.id] = { ...(A(d).zaehler[g.id] || {}), [nr.schluessel]: nr.n };
        const st = fach(() => belegStornieren(b, { nummer: nr.nummer, datum, grund }));
        Object.assign(st, { id: neueId("EBL"), ...meta(n) });
        st.hash = sha256(belegInhalt(st));
        b.status = "storniert";
        b.storniertDurch = st.nummer;
        geaendert(b, n);
        A(d).belege.push(st);
        stornos.push(st);
        const gezahlt = (b.zahlungen || []).reduce((x, y) => x + y.betrag, 0);
        if (gezahlt > 0) for (const z of buchungenAusZahlung(st, { betrag: gezahlt, datum, id: null })) A(d).buchungen.push({ id: neueId("EBU"), gemeinschaftId: g.id, ...z, text: `${z.text} (Rückabwicklung – Erstattung bzw. Rückforderung klären)`, ...meta(n) });
        const ver = A(d).verrechnet[g.id];
        if (ver) for (const v of b.verrechnet || []) {
          const [art, mid, j] = v.split(":");
          if (art === "beitritt") ver.beitritt = ver.beitritt.filter((x) => x !== mid);
          if (art === "beitrag") ver.beitrag = ver.beitrag.filter((x) => x !== `${mid}:${j}`);
        }
      }
      let korrektur = [];
      if (korrekturWerte) {
        const mid = ziel[0].mitgliedId;
        const r = berechnen(d, g, p, korrekturWerte.werte, { mitgliederFilter: [mid] });
        if (r.pruefung.fehler.some((f) => f.mitgliedId === mid)) throw konflikt("Der Korrekturbeleg hat blockierende Prüfungen – bitte Daten klären.");
        korrektur = belegeFinalisieren(d, g, p, r.belege.filter((x) => x.typ === ziel[0].typ).map((x) => ({ ...x, korrekturVon: ziel[0].nummer })), datum);
      }
      if (aktion === "stornieren") p.status = "storniert";
      p.verlauf.push({ am: jetzt(), text: `${stornos.length} Stornobeleg(e)${korrektur.length ? ` und ${korrektur.length} Korrekturbeleg(e)` : ""}: ${grund}`, von: n.id });
      geaendert(p, n);
      protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, `Storno ${stornos.map((x) => x.nummer).join(", ")}: ${grund}`);
      return { periode: periodeAusgabe(p), stornos: stornos.map((x) => belegAusgabe(x)), korrektur: korrektur.map((x) => belegAusgabe(x)) };
    });
  }

  if (aktion === "verwerfen") {
    if (!darfRechnen(s)) throw verboten("Verwerfen dürfen Kassier, Vorstand oder Organisator.");
    return aendern((d) => {
      A(d).perioden = A(d).perioden.filter((x) => x.id !== p0.id);
      protokoll(d, n, "eg_abrechnung", "eg_gemeinschaft", g.id, `Periode ${p0.von} bis ${p0.bis} verworfen`);
      return { verworfen: true };
    });
  }

  if (aktion === "vergleich") {
    if (!p0.vorschau) throw konflikt("Bitte zuerst die Probe-Abrechnung berechnen.");
    const alt = altwerteLesen(String(daten.csv || "").slice(0, 200000));
    if (!alt.werte.length) throw ungueltig(alt.fehler.slice(0, 3).join(" ") || "Keine Altwerte erkannt.");
    return aendern((d) => {
      const p = A(d).perioden.find((x) => x.id === p0.id);
      p.vergleich = { ...probeVergleich(p.vorschau.belege, alt.werte), fehler: alt.fehler.slice(0, 20), am: jetzt() };
      geaendert(p, n);
      protokoll(d, n, "eg_abrechnung", "eg_periode", p.id, `Probe-Vergleich: ${p.vergleich.auffaellig} Abweichungen`);
      return { periode: periodeAusgabe(p, { mitBelegen: true }) };
    });
  }
  throw ungueltig("Unbekannte Aktion.");
}

// ================================================================ Belege

export async function abBelege(n, { gemeinschaftId = "", mitgliedId = "", periodeId = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await bereit();
  const x = E(db);
  const sicht = (b) => !["entwurf", "final"].includes(b.status); // Mitglieder sehen Belege erst nach dem Versand
  const absteigend = (a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : a.nummer < b.nummer ? 1 : -1);
  if (mitgliedId) {
    const m = x.mitglieder.find((y) => y.id === mitgliedId);
    if (!m) throw nichtGefunden("Mitglied nicht gefunden.");
    const k = kontext(db, n, gemeinschaftVon(db, m.gemeinschaftId));
    const eigen = !!m.kontoId && m.kontoId === n.id;
    const organ = egStufe(k, "abrechnung_vorschau") >= 1 || egStufe(k, "buchhaltung") >= 1;
    if (!eigen && !organ) throw nichtGefunden("Mitglied nicht gefunden.");
    return { belege: A(db).belege.filter((b) => b.mitgliedId === m.id && (organ || sicht(b))).sort(absteigend).map((b) => belegAusgabe(b, { voll: organ })) };
  }
  if (!gemeinschaftId) {
    const meine = new Set(x.mitglieder.filter((m) => m.kontoId && m.kontoId === n.id).map((m) => m.id));
    return { belege: A(db).belege.filter((b) => meine.has(b.mitgliedId) && sicht(b)).sort(absteigend).map((b) => belegAusgabe(b, { voll: false })) };
  }
  const { g } = zugriff(db, n, gemeinschaftId, [["abrechnung_vorschau", 1], ["buchhaltung", 1], ["sepa", 1]]);
  const liste = A(db).belege.filter((b) => b.gemeinschaftId === g.id && (!periodeId || b.periodeId === periodeId));
  return { belege: liste.sort(absteigend).map((b) => belegAusgabe(b)), luecken: belegLuecken(liste) };
}

/** Daten für das Beleg-PDF (die API-Route rendert mit eg/beleg-pdf.js) – Abruf wird protokolliert */
export async function abBelegPdf(n, id) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await bereit();
  const b = A(db).belege.find((x) => x.id === String(id || ""));
  if (!b) throw nichtGefunden("Beleg nicht gefunden.");
  const g = gemeinschaftVon(db, b.gemeinschaftId);
  const m = E(db).mitglieder.find((x) => x.id === b.mitgliedId);
  const k = kontext(db, n, g);
  const eigen = !!m?.kontoId && m.kontoId === n.id && !["entwurf", "final"].includes(b.status);
  if (!eigen && egStufe(k, "abrechnung_vorschau") < 1 && egStufe(k, "buchhaltung") < 1) throw nichtGefunden("Beleg nicht gefunden.");
  await aendern((d) => protokoll(d, n, "eg_abrechnung", "eg_beleg", b.id, `Beleg ${b.nummer} als PDF abgerufen`));
  return { beleg: belegAusgabe(b), dateiname: `${b.nummer}.pdf` };
}

// ================================================================ Zahlungen

export async function abZahlungslauf(n, gemeinschaftId, { art = "pain008", belegIds = null, ausfuehrungAm = "" } = {}) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["sepa", 2]], "Zahlungsläufe erstellen Kassier bzw. Organisator.");
  if (!["pain008", "pain001"].includes(art)) throw ungueltig("Unbekannte Zahlungsart.");
  const h = heute();
  const am = datumOk(ausfuehrungAm) && ausfuehrungAm >= h ? ausfuehrungAm : h;
  return aendern((d) => {
    const belege = A(d).belege.filter((b) => b.gemeinschaftId === g.id);
    const letzte = {};
    for (const b of belege) for (const z of b.zahlungen || []) if (z.art === "pain008" && (!letzte[b.mitgliedId] || z.datum > letzte[b.mitgliedId])) letzte[b.mitgliedId] = z.datum;
    const lauf = zahlungslaufBilden({ art, belege, mitglieder: E(d).mitglieder.filter((m) => m.gemeinschaftId === g.id), gemeinschaft: g, heute: h, belegIds: Array.isArray(belegIds) && belegIds.length ? belegIds.map(String) : null, aufrechnung: einstellungenVon(d, g.id).aufrechnung, letzteEinzuege: letzte });
    if (!lauf.anzahl) return { lauf: { ...lauf, id: null }, hinweis: "Keine offenen Belege für diesen Zahlungslauf." };
    const id = neueId("EZA");
    const nachrichtId = `${String(g.kurzname || "EG").replace(/\s+/g, "")}-${art === "pain008" ? "DD" : "CT"}-${id.slice(-6)}`;
    const xml = fach(() => zahlungsdatei(art, lauf, { gemeinschaft: g, nachrichtId, erstelltAm: jetzt(), ausfuehrungAm: am }));
    const z = { id, gemeinschaftId: g.id, art, artLabel: ZAHLUNG_ARTEN[art], status: "erzeugt", ausfuehrungAm: am, anzahl: lauf.anzahl, summe: lauf.summe, posten: lauf.posten.map((p) => ({ ...p, iban: MASKE(p.iban) })), uebersprungen: lauf.uebersprungen, verrechnungen: lauf.verrechnungen, xml, sha256: sha256(xml), freigaben: [{ kontoId: n.id, name: nameVon(d, n.id), am: jetzt() }], ...meta(n) };
    A(d).zahlungen.push(z);
    for (const p of lauf.posten) {
      const b = A(d).belege.find((x) => x.id === p.belegId);
      b.zahlungslaufId = id;
      for (const vid of p.verrechnet) {
        const v = A(d).belege.find((x) => x.id === vid);
        v.zahlungslaufId = id;
        v.verrechnetMit = p.nummer;
      }
    }
    protokoll(d, n, "eg_abrechnung", "eg_zahlung", id, `${ZAHLUNG_ARTEN[art]}: ${lauf.anzahl} Posten, ${eur(lauf.summe)}`);
    const { xml: datei, ...ohne } = z;
    return { lauf: { ...ohne, hatDatei: !!datei }, hinweis: "Datei erzeugt – Download nach Freigabe durch eine zweite berechtigte Person (Vier-Augen)." };
  });
}

/** Zahlungslauf: freigeben (2. Person) | datei | eingereicht | verwerfen */
export async function abZahlungslaufAktion(n, zahlungId, { aktion = "" } = {}) {
  const db = await bereit();
  const z0 = A(db).zahlungen.find((x) => x.id === String(zahlungId || ""));
  if (!z0) throw nichtGefunden("Zahlungslauf nicht gefunden.");
  const { k } = zugriff(db, n, z0.gemeinschaftId, [["sepa", 1], ["abrechnung_freigabe_2", 2]]);
  const s = stufen(k);
  if (aktion === "datei") {
    if (!["freigegeben", "eingereicht", "gebucht"].includes(z0.status)) throw konflikt("Die Datei steht nach der Freigabe durch eine zweite Person bereit.");
    if (s.sepa < 2) throw verboten("Download nur für Kassier bzw. Organisator.");
    await aendern((d) => protokoll(d, n, "eg_abrechnung", "eg_zahlung", z0.id, "Zahlungsdatei heruntergeladen"));
    return { dateiname: `${z0.art}-${z0.id}.xml`, inhalt: z0.xml, mime: "application/xml" };
  }
  return aendern((d) => {
    const z = A(d).zahlungen.find((x) => x.id === z0.id);
    if (aktion === "freigeben") {
      if (z.status !== "erzeugt") throw konflikt("Der Lauf ist bereits freigegeben.");
      if (s.sepa < 2 && s.freigabe2 < 2) throw verboten("Freigeben dürfen Kassier, Organisator oder Vorstand.");
      if ((z.freigaben || []).some((f) => f.kontoId === n.id)) throw konflikt("Vier-Augen-Prinzip: Die Freigabe muss eine andere Person erteilen.");
      z.freigaben.push({ kontoId: n.id, name: nameVon(d, n.id), am: jetzt() });
      z.status = "freigegeben";
    } else if (aktion === "eingereicht") {
      if (s.sepa < 2) throw verboten("Nur Kassier bzw. Organisator.");
      if (z.status !== "freigegeben") throw konflikt("Erst freigeben, dann einreichen.");
      z.status = "eingereicht";
      z.eingereichtAm = jetzt();
    } else if (aktion === "verwerfen") {
      if (s.sepa < 2) throw verboten("Nur Kassier bzw. Organisator.");
      if (z.status === "gebucht") throw konflikt("Gebuchte Läufe können nicht verworfen werden.");
      z.status = "verworfen";
      for (const b of A(d).belege.filter((x) => x.zahlungslaufId === z.id && !["bezahlt", "teilbezahlt"].includes(x.status))) {
        delete b.zahlungslaufId;
        delete b.verrechnetMit;
      }
    } else throw ungueltig("Unbekannte Aktion.");
    geaendert(z, n);
    protokoll(d, n, "eg_abrechnung", "eg_zahlung", z.id, `Zahlungslauf: ${aktion}`);
    const { xml, ...ohne } = z;
    return { lauf: { ...ohne, hatDatei: !!xml } };
  });
}

/** Kontoauszug camt.053/054: Vorschau (ohne `ausfuehren`) bzw. Übernahme sicherer und bestätigter Zuordnungen */
export async function abCamtImport(n, gemeinschaftId, { xml = "", ausfuehren = false, zuordnungen = {} } = {}) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["sepa", 2]], "Kontoauszüge importieren Kassier bzw. Organisator.");
  if (String(xml).length > 5000000) throw ungueltig("Datei zu groß (höchstens 5 MB).");
  const r = fach(() => camtAbgleich(xml, A(db).belege.filter((b) => b.gemeinschaftId === g.id)));
  if (!ausfuehren) return { buchungen: r.buchungen.slice(0, 500), ruecklastschriften: r.ruecklastschriften, anzahl: r.buchungen.length };
  return aendern((d) => {
    const imp = { id: neueId("EZA"), gemeinschaftId: g.id, art: "camt", artLabel: ZAHLUNG_ARTEN.camt, status: "gebucht", anzahl: 0, summe: 0, schluessel: [], ...meta(n) };
    const schon = new Set(A(d).zahlungen.filter((z) => z.gemeinschaftId === g.id && z.art === "camt").flatMap((z) => z.schluessel || []));
    let uebernommen = 0;
    let rl = 0;
    let doppelt = 0;
    r.buchungen.forEach((bu, i) => {
      const key = `${bu.datum}|${bu.betrag}|${bu.richtung}|${bu.referenz}|${bu.zweck}`.slice(0, 300);
      if (schon.has(key)) {
        doppelt++;
        return;
      }
      const belegId = zuordnungen[String(i)] || (["sicher", "ruecklastschrift"].includes(bu.vorschlag.art) ? bu.vorschlag.belegId : null);
      const b = belegId ? A(d).belege.find((x) => x.id === belegId && x.gemeinschaftId === g.id) : null;
      if (!b) return;
      imp.schluessel.push(key);
      if (bu.vorschlag.art === "ruecklastschrift") {
        const vorher = (b.zahlungen || []).filter((z) => z.art === "pain008").reduce((s, z) => s + z.betrag, 0);
        b.zahlungen = (b.zahlungen || []).filter((z) => z.art !== "pain008");
        b.status = b.zahlungen.length ? "teilbezahlt" : "versendet";
        b.ruecklastschrift = { am: bu.datum, grund: r.ruecklastschriften.find((x) => x.nummer === b.nummer)?.grundText || "Rücklastschrift", gebuehr: ruecklastschriftGebuehr(null) };
        delete b.zahlungslaufId;
        if (vorher > 0) for (const z of buchungenAusZahlung(b, { betrag: vorher, datum: bu.datum, id: imp.id })) A(d).buchungen.push({ id: neueId("EBU"), gemeinschaftId: g.id, ...z, betrag: -Math.abs(z.betrag), ust: -Math.abs(z.ust || 0), text: `Rücklastschrift: ${z.text}`, ...meta(n) });
        rl++;
        return;
      }
      zahlungBuchen(d, g, b, { betrag: bu.betrag, datum: bu.datum, art: "camt", referenz: bu.referenz || bu.zweck, zahlungId: imp.id, n });
      uebernommen++;
      imp.summe += bu.betrag;
    });
    imp.anzahl = uebernommen;
    imp.summe = Math.round(imp.summe * 100) / 100;
    A(d).zahlungen.push(imp);
    for (const z of A(d).zahlungen.filter((x) => x.gemeinschaftId === g.id && x.status === "eingereicht")) if (A(d).belege.filter((b) => b.zahlungslaufId === z.id).every((b) => ["bezahlt", "storniert"].includes(b.status))) z.status = "gebucht";
    protokoll(d, n, "eg_abrechnung", "eg_zahlung", imp.id, `Kontoauszug: ${uebernommen} Zahlungen, ${rl} Rücklastschriften, ${doppelt} Dubletten`);
    return { uebernommen, ruecklastschriften: rl, doppelt, import: imp.id };
  });
}

/** Zahlung manuell erfassen (Barzahlung, Überweisung ohne Kontoauszug) */
export async function abZahlungErfassen(n, belegId, { betrag, datum = "", geldkonto = "2800", referenz = "" } = {}) {
  const db = await bereit();
  const b0 = A(db).belege.find((x) => x.id === String(belegId || ""));
  if (!b0) throw nichtGefunden("Beleg nicht gefunden.");
  const { g } = zugriff(db, n, b0.gemeinschaftId, [["sepa", 2]], "Zahlungen erfassen Kassier bzw. Organisator.");
  const x = Math.round(Number(String(betrag ?? "").replace(",", ".")) * 100) / 100;
  const offen = belegOffen(b0);
  if (!(x > 0) || x > offen + 0.009) throw ungueltig(`Betrag zwischen 0,01 € und ${eur(offen)}.`);
  const t = datumOk(datum) && datum <= heute() ? datum : heute();
  return aendern((d) => {
    const b = A(d).belege.find((y) => y.id === b0.id);
    const zid = neueId("EZA");
    A(d).zahlungen.push({ id: zid, gemeinschaftId: g.id, art: "manuell", artLabel: ZAHLUNG_ARTEN.manuell, status: "gebucht", anzahl: 1, summe: x, belegId: b.id, ...meta(n) });
    zahlungBuchen(d, g, b, { betrag: x, datum: t, art: "manuell", referenz: String(referenz).slice(0, 80), zahlungId: zid, n, geldkonto: geldkonto === "2700" ? "2700" : "2800" });
    protokoll(d, n, "eg_abrechnung", "eg_beleg", b.id, `Zahlung ${eur(x)} zu ${b.nummer} erfasst`);
    return { beleg: belegAusgabe(b) };
  });
}

export async function abMahnlauf(n, gemeinschaftId, { ausfuehren = false, belegIds = [] } = {}) {
  const db = await bereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, [["sepa", 1], ["buchhaltung", 1]]);
  const h = heute();
  const ein = einstellungenVon(db, g.id);
  const mVon = new Map(E(db).mitglieder.map((m) => [m.id, m]));
  const liste = A(db).belege.filter((b) => b.gemeinschaftId === g.id).map((b) => ({ b, v: egMahnvorschlag(b, h, ein.mahnwesen || MAHN_FAIR, { schutzbeduerftig: !!mVon.get(b.mitgliedId)?.schutzbeduerftig }) })).filter((x) => x.v).map(({ b, v }) => ({ belegId: b.id, nummer: b.nummer, empfaenger: b.empfaenger?.name || "", offen: belegOffen(b), faelligAm: b.faelligAm, ...v }));
  if (!ausfuehren) return { vorschlaege: liste, konfig: ein.mahnwesen || MAHN_FAIR };
  if (stufen(k).sepa < 2) throw verboten("Mahnungen erstellen Kassier bzw. Organisator.");
  return aendern((d) => {
    let anzahl = 0;
    const kreis = `MA-${h.slice(0, 4)}`;
    for (const x of liste.filter((y) => y.faellig && (!belegIds.length || belegIds.includes(y.belegId)))) {
      const b = A(d).belege.find((y) => y.id === x.belegId);
      const zn = (A(d).zaehler[g.id]?.[kreis] || 0) + 1;
      A(d).zaehler[g.id] = { ...(A(d).zaehler[g.id] || {}), [kreis]: zn };
      const m = { nr: `${kreis}-${String(zn).padStart(5, "0")}`, stufe: x.stufe, label: x.label, am: jetzt(), frist: x.frist, gebuehr: x.gebuehr, zinsen: x.zinsen || 0, pauschale: 0, gesamt: x.gesamt, sozial: x.sozial };
      m.text = mahnText({ nummer: b.nummer, rechnungsdatum: b.datum, faelligAm: b.faelligAm }, m);
      b.mahnungen = [...(b.mahnungen || []), m];
      b.status = "gemahnt";
      const mg = mVon.get(b.mitgliedId);
      const u = mg?.kontoId ? nutzerById(d, mg.kontoId) : null;
      if (u) benachrichtigen(d, u, { art: "system", titel: `${x.label} zu ${b.nummer}`, text: `${g.name}: Bitte begleichen Sie ${eur(x.gesamt)} bis ${x.frist.split("-").reverse().join(".")}. Bei Fragen oder Zahlungsschwierigkeiten melden Sie sich bitte – wir finden eine Lösung.`, link: "/portal/eg", objektArt: "eg_beleg", objektId: b.id }, { mail: false });
      anzahl++;
    }
    protokoll(d, n, "eg_abrechnung", "eg_gemeinschaft", g.id, `Mahnlauf: ${anzahl} Mahnungen`);
    return { anzahl };
  });
}

export async function abMandate(n, gemeinschaftId) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["sepa", 1]]);
  const h = heute();
  return {
    mandate: E(db).mitglieder.filter((m) => m.gemeinschaftId === g.id && ["aufgenommen", "aktiv", "gekuendigt"].includes(m.status)).sort((a, b) => a.mitgliedsnummer - b.mitgliedsnummer)
      .map((m) => ({ mitgliedId: m.id, mitgliedsnummer: m.mitgliedsnummer, name: nameM(m), referenz: m.sepaMandat?.referenz || "", datum: m.sepaMandat?.datum || "", status: m.sepaMandat?.status || "", iban: MASKE(m.iban), pruefung: mandatPruefen(m.sepaMandat || {}, { iban: m.iban, heute: h }) })),
  };
}

// ================================================================ Buchhaltung

function kuIntern(db, g) {
  const jahr = heute().slice(0, 4);
  const belege = A(db).belege.filter((b) => b.gemeinschaftId === g.id && b.nummer && b.status !== "storniert");
  const imJahr = (j) => belege.filter((b) => String(b.datum).startsWith(j));
  const rechnungen = (j) => imJahr(j).filter((b) => b.typ === "rechnung");
  const gut = imJahr(jahr).filter((b) => b.typ === "gutschrift");
  const monate = Math.max(1, new Set(imJahr(jahr).map((b) => b.von.slice(0, 7))).size);
  return kuMonitor({
    ustStatus: g.ustStatus, jahr: Number(jahr), monateErfasst: monate, umsatzBrutto: rechnungen(jahr).reduce((s, b) => s + b.summen.brutto, 0), vorjahrBrutto: rechnungen(String(Number(jahr) - 1)).reduce((s, b) => s + b.summen.brutto, 0),
    rcSteuer: gut.reduce((s, b) => s + (b.summen.rcSteuer || 0), 0), vorsteuer: gut.reduce((s, b) => s + b.summen.ust, 0), umsatzNetto: rechnungen(jahr).reduce((s, b) => s + b.summen.netto, 0),
  });
}

export async function abKleinunternehmer(n, gemeinschaftId) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["buchhaltung", 1], ["abrechnung_vorschau", 1]]);
  return { monitor: kuIntern(db, g), gemeinschaft: { id: g.id, name: g.name, ustStatus: g.ustStatus, ustOptionSeit: g.ustOptionSeit || "" } };
}

const quartalBis = (j, q) => `${j}-${String(q * 3).padStart(2, "0")}-${q === 1 || q === 4 ? "31" : "30"}`;

export async function abBuchungen(n, gemeinschaftId, { jahr = "" } = {}) {
  const db = await bereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, [["buchhaltung", 1]], "Die Buchhaltung sehen Kassier, Vorstand, Rechnungsprüfung und Organisator.");
  const j = /^20\d\d$/.test(String(jahr)) ? String(jahr) : heute().slice(0, 4);
  const a = A(db);
  const buchungen = a.buchungen.filter((b) => b.gemeinschaftId === g.id);
  const imJahr = buchungen.filter((b) => String(b.datum).startsWith(j));
  const belege = a.belege.filter((b) => b.gemeinschaftId === g.id);
  const anfang = a.anfang[g.id]?.[j] || { bank: 0, kassa: 0 };
  const offen = belege.filter((b) => BELEG_OFFEN.includes(b.status));
  const ea = eaRechnung(buchungen, j, { anfang, offeneForderungen: offen.filter((b) => b.typ === "rechnung").reduce((s, b) => s + belegOffen(b), 0), offeneVerbindlichkeiten: offen.filter((b) => b.typ === "gutschrift").reduce((s, b) => s + belegOffen(b), 0) });
  return {
    gemeinschaft: { id: g.id, name: g.name, ustStatus: g.ustStatus, rechtsform: g.rechtsform }, jahr: Number(j),
    buchungen: imJahr.sort((x, y) => (x.datum < y.datum ? 1 : -1)), ea, kassabuch: kassabuch(imJahr, { anfangsbestand: anfang.kassa }),
    uva: [1, 2, 3, 4].map((q) => ({ quartal: q, ...uvaVorbereitung(belege, { von: `${j}-${String(q * 3 - 2).padStart(2, "0")}-01`, bis: quartalBis(j, q), ustStatus: g.ustStatus }) })),
    ku: kuIntern(db, g), luecken: belegLuecken(belege), pruefvermerke: a.pruefvermerke.filter((x) => x.gemeinschaftId === g.id), konten: BUCHUNG_KATEGORIEN, exportArten: EXPORT_ARTEN, kontenplan: EG_KONTEN,
    belege: belege.filter((b) => String(b.datum).startsWith(j)).map((b) => ({ id: b.id, nummer: b.nummer, typ: b.typ, datum: b.datum, empfaenger: b.empfaenger?.name || "", brutto: b.summen.brutto, status: b.status, hash: b.hash, pdfUrl: `/api/portal/eg/${g.id}/abrechnung/belege/${b.id}/pdf` })),
    rechte: egRechteVon(k), stufen: stufen(k), heute: heute(),
  };
}

export async function abBuchungSpeichern(n, gemeinschaftId, { daten = {} } = {}) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["buchhaltung", 2]], "Buchungen erfassen Kassier bzw. Organisator.");
  const b = fach(() => buchungBereinigen(daten));
  if (b.datum > heute()) throw ungueltig("Buchungen nicht in der Zukunft.");
  return aendern((d) => {
    const neu = { id: neueId("EBU"), gemeinschaftId: g.id, ...b, ...meta(n) };
    if (b.geldkonto === "2700") {
      const kb = kassabuch([...A(d).buchungen.filter((x) => x.gemeinschaftId === g.id && x.datum.slice(0, 4) === b.datum.slice(0, 4)), neu], { anfangsbestand: A(d).anfang[g.id]?.[b.datum.slice(0, 4)]?.kassa || 0 });
      if (kb.fehler.length) throw ungueltig(kb.fehler[0]);
    }
    A(d).buchungen.push(neu);
    protokoll(d, n, "eg_abrechnung", "eg_buchung", neu.id, `Buchung ${b.belegNr}: ${b.text} ${eur(b.betrag)}`);
    return { buchung: neu };
  });
}

export async function abPruefvermerk(n, gemeinschaftId, { daten = {} } = {}) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["buchhaltung_pruefen", 2]], "Den Prüfvermerk erteilt die Rechnungsprüfung.");
  const v = fach(() => pruefvermerkBereinigen(daten));
  return aendern((d) => {
    const x = { id: neueId("EBU"), gemeinschaftId: g.id, ...v, jahr: v.jahr || Number(heute().slice(0, 4)) - 1, prueferId: n.id, pruefer: nameVon(d, n.id), am: jetzt() };
    x.hash = sha256(JSON.stringify([x.gemeinschaftId, x.jahr, x.ergebnis, x.text, x.stichproben, x.prueferId, x.am]));
    A(d).pruefvermerke.push(x);
    protokoll(d, n, "eg_abrechnung", "eg_gemeinschaft", g.id, `Prüfvermerk ${x.jahr}: ${x.ergebnis}`);
    return { pruefvermerk: x };
  });
}

export async function abExport(n, gemeinschaftId, { art = "ea", jahr = "" } = {}) {
  const db = await bereit();
  const { g } = zugriff(db, n, gemeinschaftId, [["buchhaltung", 1]], "Exporte für Kassier, Vorstand, Rechnungsprüfung und Organisator.");
  const j = /^20\d\d$/.test(String(jahr)) ? Number(jahr) : Number(heute().slice(0, 4));
  if (!EXPORT_ARTEN[art] && art !== "paket") throw ungueltig("Unbekannte Exportart.");
  const a = A(db);
  const buchungen = a.buchungen.filter((b) => b.gemeinschaftId === g.id);
  const belege = a.belege.filter((b) => b.gemeinschaftId === g.id);
  const anfang = a.anfang[g.id]?.[String(j)] || { bank: 0, kassa: 0 };
  const ea = eaRechnung(buchungen, j, { anfang });
  const kassa = kassabuch(buchungen.filter((b) => String(b.datum).startsWith(String(j))), { anfangsbestand: anfang.kassa });
  await aendern((d) => protokoll(d, n, "eg_abrechnung", "eg_gemeinschaft", g.id, `Export ${art} ${j}`));
  if (art === "paket") {
    const inhalt = JSON.stringify({
      gemeinschaft: { name: g.name, zvr: g.zvrZahl, ustStatus: g.ustStatus }, jahr: j, erstelltAm: jetzt(), ea, kassabuch: kassa,
      uva: [1, 2, 3, 4].map((q) => uvaVorbereitung(belege, { von: `${j}-${String(q * 3 - 2).padStart(2, "0")}-01`, bis: quartalBis(j, q), ustStatus: g.ustStatus })),
      belegjournal: belege.filter((b) => String(b.datum).startsWith(String(j))).map((b) => ({ nummer: b.nummer, typ: b.typ, datum: b.datum, mitgliedsnummer: b.mitgliedsnummer, netto: b.summen.netto, ust: b.summen.ust, brutto: b.summen.brutto, status: b.status, hash: b.hash })),
      luecken: belegLuecken(belege), pruefvermerke: a.pruefvermerke.filter((x) => x.gemeinschaftId === g.id),
      eigendeckungKwh: Math.round(a.perioden.filter((p) => p.gemeinschaftId === g.id && p.status !== "storniert" && !p.probe && p.von.startsWith(String(j))).reduce((s, p) => s + (p.kennzahlen?.eigendeckung || 0), 0) * 1000) / 1000,
      hinweis: "Jahresabschluss-Paket für Rechnungsprüfung und Steuerberatung (VerG § 21). Eigendeckung: Grundlage der Erklärung zur Elektrizitätsabgabe (bilanzielle Aufzeichnungen, BMF 03.11.2023). Keine Steuerberatung.",
    }, null, 1);
    return { dateiname: `${String(g.kurzname || "EG").replace(/\s+/g, "-")}_Jahresabschluss_${j}.json`, inhalt, mime: "application/json" };
  }
  return exportErzeugen(art, { buchungen, belege, jahr: j, gemeinschaft: g, konten: einstellungenVon(db, g.id).konten || {}, ea, kassa });
}

export async function abJahresbescheinigung(n, mitgliedId, { jahr = "" } = {}) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
  const db = await bereit();
  const m = E(db).mitglieder.find((x) => x.id === String(mitgliedId || ""));
  if (!m) throw nichtGefunden("Mitglied nicht gefunden.");
  const g = gemeinschaftVon(db, m.gemeinschaftId);
  const k = kontext(db, n, g);
  if (!(m.kontoId && m.kontoId === n.id) && egStufe(k, "buchhaltung") < 1) throw nichtGefunden("Mitglied nicht gefunden.");
  const j = /^20\d\d$/.test(String(jahr)) ? Number(jahr) : Number(heute().slice(0, 4));
  const zps = E(db).teilnahmen.filter((t) => t.mitgliedId === m.id).map((t) => E(db).zaehlpunkte.find((z) => z.id === t.zaehlpunktId)).filter((z) => z?.anlageId);
  const kwp = zps.reduce((s, z) => s + (Number(E(db).anlagen.find((a) => a.id === z.anlageId)?.kwp) || 0), 0);
  const gut = A(db).belege.filter((b) => b.mitgliedId === m.id && (b.typ === "gutschrift" || (b.typ === "storno" && b.ursprungTyp === "gutschrift")) && !["entwurf"].includes(b.status));
  return { gemeinschaft: { name: g.name }, mitglied: { mitgliedsnummer: m.mitgliedsnummer, name: nameM(m) }, ...jahresbescheinigung(gut, { jahr: j, mitglied: m, anlagenKwp: kwp }) };
}

export async function abEinstellungenSpeichern(n, gemeinschaftId, { daten = {} } = {}) {
  const db = await bereit();
  const { g, k } = zugriff(db, n, gemeinschaftId, [["tarife", 2], ["buchhaltung", 2]], "Einstellungen ändern Vorstand (Tarifgruppen, Rabatte) bzw. Kassier (Zahlungsziel, Gutschriftverfahren).");
  const s = stufen(k);
  const zahl = (v, min, max) => {
    if (v === null || v === "" || v === undefined) return null;
    const x = Number(String(v).replace(",", "."));
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : null;
  };
  return aendern((d) => {
    const neu = { ...einstellungenVon(d, g.id) };
    if (s.buchhaltung >= 2) {
      if (daten.zahlungszielTage !== undefined) neu.zahlungszielTage = Math.round(zahl(daten.zahlungszielTage, 7, 60) ?? 14);
      if (daten.mitgliedsbeitragArt) neu.mitgliedsbeitragArt = daten.mitgliedsbeitragArt === "echt" ? "echt" : "unecht";
      if (daten.aufrechnung !== undefined) neu.aufrechnung = !!daten.aufrechnung;
      if (daten.gutschriftverfahren && typeof daten.gutschriftverfahren === "object") {
        for (const [mid, v] of Object.entries(daten.gutschriftverfahren).slice(0, 2000)) {
          if (!E(d).mitglieder.some((m) => m.id === mid && m.gemeinschaftId === g.id)) continue;
          neu.gutschriftverfahren = { ...neu.gutschriftverfahren, [mid]: { zugestimmtAm: datumOk(v?.zugestimmtAm) ? v.zugestimmtAm : "", widersprochenAm: datumOk(v?.widersprochenAm) ? v.widersprochenAm : "" } };
        }
      }
    }
    if (s.tarife >= 2 || s.buchhaltung >= 2) for (const f of ["netzApCt", "efbApCt", "referenzLieferantCt", "referenzEinspeisungCt"]) if (daten[f] !== undefined) neu[f] = zahl(daten[f], 0, 100);
    if (s.tarife >= 2) {
      if (Array.isArray(daten.gruppen)) neu.gruppen = daten.gruppen.slice(0, 20).map((x, i) => ({ id: String(x.id || `G${i + 1}`).slice(0, 20), label: String(x.label || "Tarifgruppe").slice(0, 80), mitgliedIds: (x.mitgliedIds || []).map(String).slice(0, 2000), mitgliedArten: (x.mitgliedArten || []).filter((a) => MITGLIED_ARTEN[a]), bezugspreisCt: zahl(x.bezugspreisCt, 0, 100), einspeisepreisCt: zahl(x.einspeisepreisCt, 0, 100), grund: String(x.grund || "").slice(0, 200) }));
      if (Array.isArray(daten.rabatte)) neu.rabatte = daten.rabatte.slice(0, 20).map((x, i) => ({ id: String(x.id || `R${i + 1}`).slice(0, 20), label: String(x.label || "Rabatt").slice(0, 80), art: x.art === "betrag" ? "betrag" : "pct", wert: zahl(x.wert, 0, x.art === "betrag" ? 1000 : 100) || 0, bezug: ["energie", "gebuehren", "alles"].includes(x.bezug) ? x.bezug : "energie", mitgliedIds: (x.mitgliedIds || []).map(String).slice(0, 2000), mitgliedArten: (x.mitgliedArten || []).filter((a) => MITGLIED_ARTEN[a]), gueltigAb: datumOk(x.gueltigAb) ? x.gueltigAb : "", gueltigBis: datumOk(x.gueltigBis) ? x.gueltigBis : "", beschluss: String(x.beschluss || "").slice(0, 120) }));
    }
    A(d).einstellungen[g.id] = neu;
    protokoll(d, n, "eg_abrechnung", "eg_gemeinschaft", g.id, "Abrechnungseinstellungen geändert");
    return { einstellungen: neu };
  });
}

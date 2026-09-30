// src/lib/plattform/backend/demo/finanzen.js
//
// Finanzen & Abrechnung im Demo-Backend – Referenz für Frappe plattform/api/finanzen.py (Vertrag: docs/API.md,
// Abschnitt „Finanzen & Abrechnung“). Bildet ab, was im Betrieb ERPNext übernimmt (Purchase Invoice = Pacht-Gutschrift, Sales Invoice =
// Contracting-/Provisionsrechnung, Asset, Project), ohne ERPNext: Belege liegen unter db.finanzen.
//
// Rechte (jede Operation prüft selbst):
//   Backoffice    – Rolle admin mit Bereich „finanzen“ (rechte.js): lesen ≥ 1 (Leitung, Buchhaltung, Transaktion, Nur lesen,
//                   Projektleitung); schreiben = 2 (Leitung, Buchhaltung): Läufe, Zahlungsstatus, Verträge, SEPA-Export
//   Empfänger     – sieht nur eigene Belege: Konto `empfaengerId` bzw. Mitglied der Organisation `organisationId`
//                   (Contracting-Kunden, Anbieter-Organisationen); Pachtverträge nur als Eigentümer
//   Auszahlungen  – nur bei verifiziertem KYC mit geprüfter Bankverbindung (kycAuszahlung, finanzen-kern.js)

import { PlattformFehler, konflikt, nichtGefunden, ungueltig, verboten } from "../../fehler";
import * as v from "../../validierung";
import * as F from "../../finanzen/index.js";
import { darfLesen, darfSchreiben } from "../../rechte";
import { intern } from "../demo";
import { aendern, lesen } from "./speicher";
import { jetzt, neueId, sha256 } from "./hilfen";
import { teamRolle } from "./teams";
import * as anlagenDemo from "./anlagen";
import {
  FIN_SCHEMA, OEKOINVEST_ID, SYSTEM_FINANZEN, anlageGesellschaft, anlageGesellschaftId, belegMelden, einstellungen, gesellschaftFuer, gesellschaftenListe, kycAuszahlung, laufAusfuehren, leer,
  klaerfallSchliessenKyc, pachtSteuerVorlage, provisionNachziehen, vertragFuerFaelligkeit,
} from "./finanzen-kern";
import { finanzenSeed } from "./finanzen-seed";

const { protokoll, nutzerById, nameVon } = intern;

const istAdmin = (n) => !!n?.rollen?.includes("admin");
const finLesen = (n) => istAdmin(n) && darfLesen(n, "finanzen");
const finSchreiben = (n) => istAdmin(n) && darfSchreiben(n, "finanzen");

function angemeldet(n) {
  if (!n) throw new PlattformFehler(401, "Bitte melden Sie sich an.");
}
function leseNoetig(n) {
  angemeldet(n);
  if (!finLesen(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Lesen." : "Nur für das Backoffice (Buchhaltung).");
}
function schreibNoetig(n) {
  angemeldet(n);
  if (!finSchreiben(n)) throw verboten(istAdmin(n) ? "Ihre Backoffice-Rolle erlaubt im Bereich „Finanzen & Abrechnung“ kein Schreiben." : "Nur für das Backoffice (Buchhaltung).");
}

// ================================================================ Datenbestand

/** Anlagen-Stammdaten + Zählerstand-Monatswerte für Contracting und Umsatzbeteiligung (außerhalb der Schreibsperre laden) */
async function vorabLaden(db, { art = "alle", anlageIds = null, vertragIds = null } = {}) {
  const liste = await anlagenDemo.anlagen(SYSTEM_FINANZEN, {});
  const roh = (await lesen()).anlagen?.anlagen || [];
  const pacht = art === "pacht" || art === "alle";
  const contracting = art === "contracting" || art === "alle";
  const umsatz = new Set(
    pacht ? (db.finanzen?.pachtvertraege || []).filter((p) => p.modell === "umsatz" && p.anlageId && (!vertragIds?.length || vertragIds.includes(p.id))).map((p) => p.anlageId) : []
  );
  const anlagen = {};
  for (const a of liste) {
    const fuerContracting = contracting && !!a.vertrag && (!anlageIds?.length || anlageIds.includes(a.id));
    if (!fuerContracting && !umsatz.has(a.id)) continue;
    try {
      const d = await anlagenDemo.anlage(SYSTEM_FINANZEN, a.id);
      const zeilen = await anlagenDemo.zaehlerMonatswerte(SYSTEM_FINANZEN, a.id);
      anlagen[a.id] = { anlage: { id: d.id, name: d.name, kwp: d.kwp, land: d.land, typ: d.typ, kunde: d.kunde, organisation: d.organisation }, roh: roh.find((x) => x.id === a.id) || null, vertrag: d.vertrag, messpunkte: d.messpunkte, zeilen };
    } catch (e) {
      console.warn("[plattform-finanzen] Anlage", a.id, e?.message);
    }
  }
  return { anlagen };
}

async function lesenBereit() {
  const db = await lesen();
  if ((db.finanzen?.v || 0) >= FIN_SCHEMA) return db; // nie „zurück“ befüllen (ältere, noch nicht neu übersetzte Module im Dev-Server)
  const vorab = await vorabLaden(db).catch((e) => {
    console.warn("[plattform-finanzen] Anlagen für Demo-Daten nicht geladen:", e?.message);
    return { anlagen: {} };
  });
  await aendern(async (d) => {
    if ((d.finanzen?.v || 0) >= FIN_SCHEMA) return;
    d.finanzen = leer();
    try {
      finanzenSeed(d, { vorab });
    } catch (e) {
      console.warn("[plattform-finanzen] Demo-Daten nicht vollständig ergänzt:", e?.message);
    }
  });
  return lesen();
}

async function aendernBereit(fn) {
  await lesenBereit();
  return aendern(fn);
}

/** Provisionen ohne Rechnung sofort abrechnen (Provision entsteht beim Verkauf → Sales Invoice) */
async function provisionenNachziehen(db) {
  const fehlt = db.provisionen.some((p) => ["offen", "in_rechnung"].includes(p.status) && !db.finanzen.belege.some((b) => b.schluessel === `PV:${p.id}` && b.status !== "storniert"));
  if (!fehlt) return db;
  await aendern((d) => laufAusfuehren(d, SYSTEM_FINANZEN, { art: "provision", stichtag: F.heute() }));
  return lesen();
}

// ================================================================ Ausgabe

const HEUTE = () => F.heute();

function zugriff(db, n, b) {
  if (!n || !b) return null;
  if (finLesen(n)) return "backoffice";
  if (b.empfaengerId && b.empfaengerId === n.id) return "empfaenger";
  if (b.organisationId && teamRolle(db, n.id, b.organisationId)) return "team";
  return null;
}

function belegAusgabe(db, n, b, { detail = false, backoffice = false } = {}) {
  const heute = HEUTE();
  const zs = F.zahlungsstatus(b, heute);
  const basis = {
    id: b.id, nummer: b.nummer, art: b.art, artLabel: F.ABRECHNUNG_ARTEN[b.art].label, beleg: b.beleg, titel: b.titel,
    empfaenger: b.partei?.name || "", zeitraum: b.zeitraum, rechnungsdatum: b.rechnungsdatum, faelligAm: b.faelligAm,
    netto: b.netto, steuerBetrag: b.steuer.betrag, steuerSatz: b.steuer.satz, brutto: b.brutto, waehrung: b.waehrung,
    status: b.status, zahlungsstatus: zs, zahlungsstatusLabel: F.ZAHLUNGSSTATUS[zs]?.label || zs, bezahltAm: b.bezahltAm,
    bezugText: b.bezugText, kennzahlen: b.kennzahlen || {},
    gesellschaftId: b.gesellschaftId || OEKOINVEST_ID, gesellschaft: b.aussteller?.name || "",
    bezug: { pachtvertragId: b.bezug?.pachtvertragId || null, anlageId: b.bezug?.anlageId || null, provisionId: b.bezug?.provisionId || null, projektId: b.bezug?.projektId || null, monat: b.bezug?.monat || null, phase: b.bezug?.phase || null },
  };
  if (backoffice) {
    Object.assign(basis, {
      empfaengerId: b.empfaengerId, organisationId: b.organisationId, erpnext: b.erpnext, laufId: b.laufId, zahlungslaufId: b.zahlungslaufId,
      mahnungen: b.mahnungen || [], mahnhinweis: F.mahnhinweis(b, heute), pflichtFehlt: b.pflichtFehlt || [], hinweise: b.hinweise || [],
    });
    if (b.art === "pacht") {
      const k = kycAuszahlung(db, { kontoId: b.empfaengerId, flaecheId: b.bezug?.flaecheId || null });
      basis.auszahlung = { ok: k.ok, gruende: k.gruende, ibanMaskiert: F.ibanMaskieren(k.iban), quelle: k.quelle, kycStatus: k.status };
    }
  } else if (b.art === "pacht") {
    const k = kycAuszahlung(db, { kontoId: b.empfaengerId, flaecheId: b.bezug?.flaecheId || null });
    basis.auszahlung = { ok: k.ok, ibanMaskiert: F.ibanMaskieren(k.iban), hinweis: k.ok ? "" : "Die Auszahlung erfolgt, sobald Ihre Verifizierung inkl. Bankverbindung abgeschlossen ist (Portal → Verifizierung)." };
  }
  if (!detail) return basis;
  return {
    ...basis,
    partei: b.partei, aussteller: b.aussteller, positionen: b.positionen, steuer: b.steuer, erklaerung: b.erklaerung || [], zaehlerstaende: b.zaehlerstaende || [],
    erinnerungen: (b.mahnungen || []).length,
    // Zahlungsziel für Rechnungen: Geschäftskonto der ÖkoInvest GmbH (kein Geheimnis, steht auf jeder Rechnung)
    bankverbindung: b.beleg === "rechnung" ? (() => {
      const g = gesellschaftFuer(db, b.gesellschaftId);
      return g.iban ? { name: g.name, iban: F.ibanNormalisieren(g.iban).replace(/(.{4})/g, "$1 ").trim(), bic: g.bic || "", beispiel: !!g.beispielIban } : null;
    })() : null,
  };
}

function vertragAusgabe(db, pt, { backoffice = false } = {}) {
  const heute = HEUTE();
  const vf = vertragFuerFaelligkeit(db, pt);
  const jahr = Number(heute.slice(0, 4));
  let jahrespacht = null;
  let erklaerung = [];
  if (pt.modell === "indexiert" && pt.index) {
    const r = F.indexiertePacht({ ...pt.index, basisBetrag: pt.pachtJahr, tabelle: db.finanzen.vpi }, jahr);
    jahrespacht = r.betrag;
    erklaerung = F.indexErklaerung({ ...pt.index, basisBetrag: pt.pachtJahr }, r, F.INDEX_REIHEN[pt.index.reihe]?.label);
  } else if (pt.modell === "fest") {
    jahrespacht = pt.pachtJahr;
    erklaerung = [`Feste Jahrespacht ${F.euro(pt.pachtJahr)} ohne Indexanpassung.`];
  } else if (pt.umsatz) {
    erklaerung = [`${F.rund(pt.umsatz.anteil * 100, 2).toLocaleString("de-DE")} % der Stromerlöse der Anlage (vereinbarter Erlös ${F.zahlDe(pt.umsatz.erloesCtKwh, 3)} ct/kWh), mindestens ${F.euro(pt.umsatz.mindestJahr)} pro Jahr.`];
  }
  const nf = F.naechsteFaelligkeit(vf, heute);
  let naechste = null;
  if (nf) {
    const r = F.pachtPositionen(pt, nf, { indexTabelle: db.finanzen.vpi, ertragKwh: pt.modell === "umsatz" ? 0 : null });
    naechste = { faelligAm: nf.faelligAm, zeitraum: { von: nf.von, bis: nf.bis }, phase: nf.phase, betrag: r.netto, mindestens: pt.modell === "umsatz" && nf.phase === "pacht" };
  }
  const ende = F.laufzeitEnde(pt.beginn, pt.laufzeitJahre);
  const aus = {
    id: pt.id, bezeichnung: pt.bezeichnung, objektArt: pt.objektArt, objektLabel: F.PACHT_OBJEKTE[pt.objektArt] || pt.objektArt, land: pt.land, flaecheHa: pt.flaecheHa,
    flaecheId: pt.flaecheId, anlageId: pt.anlageId, modell: pt.modell, modellLabel: F.PACHTMODELLE[pt.modell]?.label || pt.modell,
    pachtJahr: pt.pachtJahr, index: pt.index, umsatz: pt.umsatz, reservierungJahr: pt.reservierungJahr,
    vertragsdatum: pt.vertragsdatum, beginnArt: pt.beginnArt, beginnLabel: F.BEGINN_ARTEN[pt.beginnArt] || "", beginn: pt.beginn || "", laufzeitJahre: pt.laufzeitJahre, ende: ende || "",
    faelligkeit: pt.faelligkeit, faelligkeitLabel: F.RHYTHMEN[pt.faelligkeit]?.label || "", zahlweise: pt.zahlweise, zahlweiseLabel: F.ZAHLWEISEN[pt.zahlweise] || "", zahlungszielTage: pt.zahlungszielTage,
    status: pt.status, statusLabel: F.PACHTVERTRAG_STATUS[pt.status]?.label || pt.status,
    jahrespachtAktuell: jahrespacht, erklaerung, naechsteZahlung: naechste,
    steuer: { vorlage: pachtSteuerVorlage(pt), label: F.STEUERVORLAGEN[pachtSteuerVorlage(pt)]?.label || "" },
  };
  if (backoffice) {
    const u = nutzerById(db, pt.eigentuemerId);
    Object.assign(aus, {
      eigentuemerId: pt.eigentuemerId, eigentuemer: u ? { id: u.id, name: nameVon(db, u.id), email: u.email } : null,
      gesellschaftId: pt.gesellschaftId || null, gesellschaft: pt.gesellschaftId ? gesellschaftFuer(db, pt.gesellschaftId).name : anlageGesellschaft(db, (db.anlagen?.anlagen || []).find((a) => a.id === pt.anlageId)).name,
      steuervorlage: pt.steuervorlage || "", steuerOption: !!pt.steuerOption, kleinunternehmer: !!pt.kleinunternehmer, bemerkung: pt.bemerkung || "",
      belege: db.finanzen.belege.filter((b) => b.bezug?.pachtvertragId === pt.id).length,
      auszahlung: (() => {
        const k = kycAuszahlung(db, { kontoId: pt.eigentuemerId, flaecheId: pt.flaecheId || null });
        return { ok: k.ok, gruende: k.gruende, ibanMaskiert: F.ibanMaskieren(k.iban), quelle: k.quelle, kycStatus: k.status };
      })(),
      erstelltAm: pt.erstelltAm, geaendertAm: pt.geaendertAm,
    });
  }
  return aus;
}

// ================================================================ Portal (Eigentümer, Contracting-Kunden, Anbieter)

/** Eigene Abrechnungen mit Jahresübersicht, Verträgen (Indexierung erklärt) und nächster Zahlung */
export async function meineAbrechnungen(n, { jahr } = {}) {
  angemeldet(n);
  let db = await lesenBereit();
  if (n.rollen?.includes("anbieter")) db = await provisionenNachziehen(db);
  const eigene = db.finanzen.belege.filter((b) => b.status !== "storniert" && (b.empfaengerId === n.id || (b.organisationId && teamRolle(db, n.id, b.organisationId))));
  const jahre = [...new Set(eigene.map((b) => Number(String(b.zeitraum?.von || b.rechnungsdatum).slice(0, 4))))].sort((a, b) => b - a);
  const aktuell = Number(HEUTE().slice(0, 4));
  const j = Number(jahr) && jahre.includes(Number(jahr)) ? Number(jahr) : jahre.includes(aktuell) ? aktuell : jahre[0] || aktuell;
  const imJahr = (b) => String(b.zeitraum?.von || "").startsWith(String(j));
  const sortiert = (liste) => liste.sort((a, b) => String(b.zeitraum?.von).localeCompare(String(a.zeitraum?.von)) || String(b.nummer).localeCompare(String(a.nummer)));
  const summen = (liste) => ({
    anzahl: liste.length, netto: F.summe(liste, "netto"), brutto: F.summe(liste, "brutto"),
    bezahlt: F.summe(liste.filter((b) => b.status === "bezahlt"), "brutto"), offen: F.summe(liste.filter((b) => ["offen", "angewiesen"].includes(b.status)), "brutto"),
  });
  const aus = (liste) => sortiert(liste).map((b) => belegAusgabe(db, n, b));

  const pacht = eigene.filter((b) => b.art === "pacht");
  const vertraege = db.finanzen.pachtvertraege.filter((p) => p.eigentuemerId === n.id && p.status !== "entwurf").map((p) => vertragAusgabe(db, p));
  const naechste = vertraege.map((x) => x.naechsteZahlung && { ...x.naechsteZahlung, vertrag: x.bezeichnung }).filter(Boolean).sort((a, b) => a.faelligAm.localeCompare(b.faelligAm))[0] || null;
  const kyc = pacht.length || vertraege.length ? kycAuszahlung(db, { kontoId: n.id }) : null;

  const contracting = eigene.filter((b) => b.art === "contracting");
  const monate = {};
  for (const b of contracting.filter(imJahr)) {
    const m = b.bezug?.monat || b.zeitraum.von.slice(0, 7);
    monate[m] ||= { monat: m, kwh: 0, netto: 0, brutto: 0, anlagen: 0 };
    monate[m].kwh += Number(b.kennzahlen?.gelieferteKwh) || 0;
    monate[m].netto = F.rund2(monate[m].netto + b.netto);
    monate[m].brutto = F.rund2(monate[m].brutto + b.brutto);
    monate[m].anlagen += 1;
  }
  const provision = eigene.filter((b) => b.art === "provision");

  return {
    jahr: j, jahre: jahre.length ? jahre : [aktuell],
    pacht: {
      sichtbar: pacht.length > 0 || vertraege.length > 0,
      belege: aus(pacht), jahr: summen(pacht.filter(imJahr)), vertraege, naechsteZahlung: naechste,
      auszahlung: kyc ? { ok: kyc.ok, ibanMaskiert: F.ibanMaskieren(kyc.iban), hinweis: kyc.ok ? "" : "Auszahlungen erfolgen erst nach abgeschlossener Verifizierung mit geprüfter Bankverbindung." } : null,
    },
    contracting: { sichtbar: contracting.length > 0, belege: aus(contracting), jahr: summen(contracting.filter(imJahr)), monate: Object.values(monate).sort((a, b) => a.monat.localeCompare(b.monat)) },
    provision: { sichtbar: provision.length > 0, belege: aus(provision), jahr: summen(provision.filter(imJahr)) },
  };
}

/** Beleg im Detail (Empfänger, Organisation, Backoffice); fremde → 403 */
export async function abrechnung(n, id) {
  angemeldet(n);
  const db = await lesenBereit();
  const b = db.finanzen.belege.find((x) => x.id === v.kennung(id));
  if (!b) throw nichtGefunden("Abrechnung nicht gefunden.");
  const zg = zugriff(db, n, b);
  if (!zg) throw verboten("Diese Abrechnung gehört nicht zu Ihrem Konto.");
  return belegAusgabe(db, n, b, { detail: true, backoffice: zg === "backoffice" });
}

/** Daten für das PDF (gleiche Rechte wie abrechnung) – der PDF-Aufbau liegt in finanzen/beleg-pdf.js */
export async function abrechnungPdfDaten(n, id, { ip = "" } = {}) {
  const b = await abrechnung(n, id);
  await aendern((db) => protokoll(db, n, "abrechnung_pdf", "abrechnung", b.id, `PDF ${b.nummer} abgerufen`, ip)).catch(() => {});
  return b;
}

// ================================================================ Backoffice: Übersicht, Belege

export async function finanzCockpit(n) {
  leseNoetig(n);
  let db = await lesenBereit();
  db = await provisionenNachziehen(db);
  const heute = HEUTE();
  const fin = db.finanzen;
  const forderungen = fin.belege.filter((b) => b.beleg === "rechnung" && b.status === "offen");
  const ueber = forderungen.filter((b) => F.zahlungsstatus(b, heute) === "ueberfaellig");
  const gutschriften = fin.belege.filter((b) => b.art === "pacht" && b.status === "offen");
  const gesperrt = gutschriften.filter((b) => !kycAuszahlung(db, { kontoId: b.empfaengerId, flaecheId: b.bezug?.flaecheId || null }).ok);
  const jahr = heute.slice(0, 4);
  const imJahr = (b) => b.status !== "storniert" && String(b.zeitraum?.von).startsWith(jahr);
  const e = einstellungen(db);
  const warnungen = [];
  if (!e.firma.uid) warnungen.push("UID-Nummer der ÖkoInvest GmbH fehlt in den Finanzeinstellungen – Pflichtangabe auf Rechnungen (§ 11 Abs. 1 UStG 1994).");
  if (e.auftraggeber.beispiel) warnungen.push("Für SEPA-Dateien ist eine Beispiel-IBAN hinterlegt (Demo). Im Betrieb die Geschäftskonto-IBAN in den Finanzeinstellungen pflegen.");
  const pflicht = fin.belege.filter((b) => b.status === "offen" && (b.pflichtFehlt || []).length).length;
  if (pflicht) warnungen.push(`${pflicht} offene Belege mit unvollständigen Pflichtangaben (Details am Beleg).`);
  return {
    heute,
    einstellungen: { firma: e.firma, auftraggeber: { name: e.auftraggeber.name, ibanMaskiert: F.ibanMaskieren(e.auftraggeber.iban), beispiel: e.auftraggeber.beispiel }, zahlungszielTage: e.zahlungszielTage, erpnext: e.erpnext },
    kennzahlen: {
      forderungenOffen: F.summe(forderungen, "brutto"), forderungenAnzahl: forderungen.length,
      ueberfaellig: F.summe(ueber, "brutto"), ueberfaelligAnzahl: ueber.length,
      gutschriftenOffen: F.summe(gutschriften, "brutto"), gutschriftenAnzahl: gutschriften.length, gutschriftenGesperrt: gesperrt.length,
      klaerfaelleOffen: fin.klaerfaelle.filter((k) => k.status === "offen").length,
      pachtvertraegeAktiv: fin.pachtvertraege.filter((p) => p.status === "aktiv").length,
      jahr: { pacht: F.summe(fin.belege.filter((b) => b.art === "pacht" && imJahr(b)), "netto"), contracting: F.summe(fin.belege.filter((b) => b.art === "contracting" && imJahr(b)), "netto"), provision: F.summe(fin.belege.filter((b) => b.art === "provision" && imJahr(b)), "netto") },
    },
    // Auswertung je Gesellschaft (ÖkoInvest GmbH / SPV) – Grundlage für spätere Bankfinanzierung (DSCR je SPV)
    jeGesellschaft: gesellschaftenListe(db).map((g) => {
      const eigene = fin.belege.filter((b) => (b.gesellschaftId || OEKOINVEST_ID) === g.id && imJahr(b));
      return {
        id: g.id, name: g.name, spv: g.spv,
        erloese: { contracting: F.summe(eigene.filter((b) => b.art === "contracting"), "netto"), provision: F.summe(eigene.filter((b) => b.art === "provision"), "netto") },
        pachtaufwand: F.summe(eigene.filter((b) => b.art === "pacht"), "netto"),
        forderungenOffen: F.summe(eigene.filter((b) => b.beleg === "rechnung" && b.status === "offen"), "brutto"),
        anlagen: (db.anlagen?.anlagen || []).filter((a) => anlageGesellschaftId(db, a) === g.id).length,
      };
    }).filter((g) => g.id === OEKOINVEST_ID || g.anlagen || g.erloese.contracting || g.pachtaufwand),
    mahnvorschlaege: ueber.map((b) => ({ ...belegAusgabe(db, n, b, { backoffice: true }) })).filter((b) => b.mahnhinweis?.faellig).slice(0, 20),
    laeufe: fin.laeufe.slice(0, 8).map((l) => ({ id: l.id, art: l.art, artLabel: F.LAUF_ARTEN[l.art], stichtag: l.stichtag, monat: l.monat, am: l.am, vonName: l.vonName, erzeugt: l.erzeugt.length, summe: F.summe(l.erzeugt, "brutto"), klaerfaelle: l.klaerfaelle.length, vorhanden: l.vorhanden })),
    zahlungslaeufe: fin.zahlungslaeufe.slice(0, 8),
    warnungen,
    darfSchreiben: finSchreiben(n),
  };
}

export async function finanzAbrechnungen(n, { art = "", status = "", q = "", limit = 300 } = {}) {
  leseNoetig(n);
  const db = await lesenBereit();
  const heute = HEUTE();
  const such = v.text(q, 80).toLowerCase();
  return db.finanzen.belege
    .filter((b) => !art || b.art === art)
    .filter((b) => !status || (status === "ueberfaellig" ? F.zahlungsstatus(b, heute) === "ueberfaellig" : b.status === status))
    .filter((b) => !such || [b.nummer, b.partei?.name, b.bezugText, b.id].join(" ").toLowerCase().includes(such))
    .sort((a, b) => String(b.rechnungsdatum).localeCompare(String(a.rechnungsdatum)) || String(b.nummer).localeCompare(String(a.nummer)))
    .slice(0, Math.min(1000, Number(limit) || 300))
    .map((b) => belegAusgabe(db, n, b, { backoffice: true }));
}

/** Zahlungsstatus pflegen: bezahlt | offen | mahnen | storno */
export async function abrechnungAktion(n, id, { aktion, datum, grund } = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const b = db.finanzen.belege.find((x) => x.id === v.kennung(id));
    if (!b) throw nichtGefunden("Abrechnung nicht gefunden.");
    const heute = HEUTE();
    if (aktion === "bezahlt") {
      if (!["offen", "angewiesen"].includes(b.status)) throw konflikt("Nur offene Belege können als bezahlt markiert werden.");
      if (b.art === "pacht") {
        const k = kycAuszahlung(db, { kontoId: b.empfaengerId, flaecheId: b.bezug?.flaecheId || null });
        if (!k.ok) throw new PlattformFehler(409, `Keine Auszahlung ohne abgeschlossene Verifizierung: ${k.gruende.join(" ")}`, "kyc");
      }
      const d = F.istDatum(datum) ? datum : heute;
      if (d > heute) throw ungueltig("Das Zahlungsdatum darf nicht in der Zukunft liegen.");
      b.status = "bezahlt";
      b.bezahltAm = d;
      provisionNachziehen(db, n, b);
      belegMelden(db, b, "bezahlt");
    } else if (aktion === "offen") {
      if (b.status !== "angewiesen") throw konflikt("Nur angewiesene Zahlungen können zurückgesetzt werden.");
      b.status = "offen";
      b.zahlungslaufId = null;
    } else if (aktion === "mahnen") {
      if (b.beleg !== "rechnung" || F.zahlungsstatus(b, heute) !== "ueberfaellig") throw konflikt("Erinnern nur bei überfälligen Rechnungen.");
      const h = F.mahnhinweis(b, heute);
      b.mahnungen = [...(b.mahnungen || []), { am: jetzt(), stufe: Math.max(1, h?.stufe || 1), label: h?.label || "Zahlungserinnerung", vonId: n.id }];
      belegMelden(db, b, "erinnerung");
    } else if (aktion === "storno") {
      const g = v.mehrzeilig(grund, 500);
      if (g.length < 5) throw ungueltig("Bitte geben Sie einen Grund für die Stornierung an (mind. 5 Zeichen).");
      if (!["offen"].includes(b.status)) throw konflikt("Nur offene Belege können storniert werden (bezahlte/angewiesene zuerst zurücksetzen bzw. Gutschrift korrigieren).");
      b.status = "storniert";
      b.stornoGrund = g;
      b.storniertAm = jetzt();
    } else throw ungueltig("Unbekannte Aktion.");
    protokoll(db, n, `abrechnung_${aktion}`, "abrechnung", b.id, `${b.nummer}: ${aktion}${grund ? ` – ${v.text(grund, 120)}` : ""}`);
    return belegAusgabe(db, n, b, { detail: true, backoffice: true });
  });
}

// ================================================================ Abrechnungslauf

/** Lauf starten: { art: pacht|contracting|provision|alle, stichtag?, monat? (Contracting JJJJ-MM), trockenlauf?, vertragIds?, anlageIds? } */
export async function abrechnungslauf(n, daten = {}) {
  schreibNoetig(n);
  const art = v.auswahl(daten.art, F.LAUF_ARTEN, "");
  if (!art) throw ungueltig("Bitte wählen Sie die Art des Laufs.");
  const heute = HEUTE();
  const stichtag = F.istDatum(daten.stichtag) ? daten.stichtag : heute;
  if (stichtag > F.plusTage(heute, 62)) throw ungueltig("Der Stichtag darf höchstens zwei Monate in der Zukunft liegen.");
  const monat = /^20\d\d-(0[1-9]|1[0-2])$/.test(String(daten.monat || "")) ? daten.monat : F.vormonat(stichtag.slice(0, 7));
  if (monat >= heute.slice(0, 7)) throw ungueltig("Contracting wird erst nach Monatsende abgerechnet (Monatswerte des Messstellenbetreibers).");
  const ids = (x) => (Array.isArray(x) ? x.map((i) => v.kennung(i)).filter(Boolean).slice(0, 200) : []);
  const opt = { art, stichtag, monat, trockenlauf: v.wahr(daten.trockenlauf), vertragIds: ids(daten.vertragIds), anlageIds: ids(daten.anlageIds) };
  const db = await lesenBereit();
  const vorab = art === "provision" ? { anlagen: {} } : await vorabLaden(db, { art, anlageIds: opt.anlageIds.length ? opt.anlageIds : null, vertragIds: opt.vertragIds.length ? opt.vertragIds : null });
  return aendern((d) => laufAusfuehren(d, n, { ...opt, vorab }));
}

// ================================================================ Pachtverträge

export async function pachtvertraege(n, { status = "", q = "" } = {}) {
  leseNoetig(n);
  const db = await lesenBereit();
  const such = v.text(q, 80).toLowerCase();
  return db.finanzen.pachtvertraege
    .filter((p) => !status || p.status === status)
    .filter((p) => !such || [p.bezeichnung, p.id, nameVon(db, p.eigentuemerId)].join(" ").toLowerCase().includes(such))
    .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de"))
    .map((p) => vertragAusgabe(db, p, { backoffice: true }));
}

/** Vertrag: Backoffice oder Eigentümer (fremd → 403) */
export async function pachtvertrag(n, id) {
  angemeldet(n);
  const db = await lesenBereit();
  const p = db.finanzen.pachtvertraege.find((x) => x.id === v.kennung(id));
  if (!p) throw nichtGefunden("Pachtvertrag nicht gefunden.");
  if (finLesen(n)) return vertragAusgabe(db, p, { backoffice: true });
  if (p.eigentuemerId !== n.id) throw verboten("Dieser Pachtvertrag gehört nicht zu Ihrem Konto.");
  return vertragAusgabe(db, p);
}

function vertragFelder(db, d, alt = {}) {
  const has = (k) => Object.hasOwn(d, k) || !alt.id;
  const f = {};
  if (has("eigentuemerId")) {
    const k = v.kennung(d.eigentuemerId);
    const u = k ? nutzerById(db, k) : null;
    if (!u) throw ungueltig("Bitte wählen Sie das Konto des Eigentümers.");
    if (!u.rollen.some((r) => ["flaeche", "landwirt"].includes(r))) throw ungueltig("Das Konto hat keine Eigentümer-Rolle (Flächeneigentümer/Landwirt).");
    f.eigentuemerId = u.id;
  }
  if (has("bezeichnung")) f.bezeichnung = v.text(d.bezeichnung, 120);
  if (has("objektArt")) f.objektArt = v.auswahl(d.objektArt, F.PACHT_OBJEKTE, alt.objektArt || "flaeche");
  if (has("land")) f.land = v.auswahl(d.land, ["AT", "DE", "CH"], alt.land || "");
  if (has("flaecheHa")) f.flaecheHa = v.zahl(d.flaecheHa, { min: 0, max: 100000, stellen: 4 }) ?? 0;
  if (has("modell")) f.modell = v.auswahl(d.modell, F.PACHTMODELLE, alt.modell || "");
  if (has("pachtJahr")) f.pachtJahr = v.zahl(d.pachtJahr, { min: 0, max: 1e8, stellen: 2 }) ?? 0;
  if (has("reservierungJahr")) f.reservierungJahr = v.zahl(d.reservierungJahr, { min: 0, max: 1e7, stellen: 2 }) ?? 0;
  if (has("vertragsdatum")) f.vertragsdatum = F.datumOderLeer(d.vertragsdatum);
  if (has("beginnArt")) f.beginnArt = v.auswahl(d.beginnArt, F.BEGINN_ARTEN, alt.beginnArt || "inbetriebnahme");
  if (has("beginn")) f.beginn = F.datumOderLeer(d.beginn);
  if (has("laufzeitJahre")) f.laufzeitJahre = Math.round(v.zahl(d.laufzeitJahre, { min: 1, max: 60 }) ?? 0);
  if (has("faelligkeit")) f.faelligkeit = v.auswahl(d.faelligkeit, F.RHYTHMEN, alt.faelligkeit || "jaehrlich");
  if (has("zahlweise")) f.zahlweise = v.auswahl(d.zahlweise, F.ZAHLWEISEN, alt.zahlweise || "vorschuessig");
  if (has("zahlungszielTage")) f.zahlungszielTage = Math.round(v.zahl(d.zahlungszielTage, { min: 0, max: 90 }) ?? 14);
  if (has("steuervorlage")) f.steuervorlage = v.auswahl(d.steuervorlage, F.STEUERVORLAGEN, "");
  if (has("steuerOption")) f.steuerOption = v.wahr(d.steuerOption);
  if (has("kleinunternehmer")) f.kleinunternehmer = v.wahr(d.kleinunternehmer);
  if (has("status")) f.status = v.auswahl(d.status, F.PACHTVERTRAG_STATUS, alt.status || "entwurf");
  if (has("bemerkung")) f.bemerkung = v.mehrzeilig(d.bemerkung, 1000);
  if (has("flaecheId")) f.flaecheId = v.kennung(d.flaecheId) || null;
  if (has("anlageId")) f.anlageId = v.kennung(d.anlageId) || null;
  if (has("gesellschaftId")) {
    const g = v.text(d.gesellschaftId, 40);
    f.gesellschaftId = g && g !== OEKOINVEST_ID ? g : null; // leer = ÖkoInvest GmbH bzw. Eigentümergesellschaft der verknüpften Anlage
  }
  if (has("index")) {
    const i = d.index || {};
    const land = f.land || alt.land;
    f.index = {
      reihe: v.auswahl(i.reihe, F.INDEX_REIHEN, land === "DE" ? "VPI-DE-2020" : land === "CH" ? "LIK-CH-2020" : "VPI-AT-2020"),
      basisJahr: Math.round(v.zahl(i.basisJahr, { min: 2000, max: 2100 }) ?? 0),
      basisIndex: v.zahl(i.basisIndex, { min: 1, max: 1000, stellen: 3 }),
      schwellePct: v.zahl(i.schwellePct, { min: 0, max: 25, stellen: 2 }) ?? 0,
      anteilPct: v.zahl(i.anteilPct, { min: 0, max: 100, stellen: 1 }) ?? 100,
      nurErhoehung: v.wahr(i.nurErhoehung),
    };
  }
  if (has("umsatz")) {
    const u = d.umsatz || {};
    let anteil = v.zahl(u.anteil, { min: 0, max: 100, stellen: 5 });
    if (anteil !== null && anteil > 0.5) anteil = anteil / 100; // Eingabe in Prozent
    f.umsatz = { anteil: anteil ?? 0, erloesCtKwh: v.zahl(u.erloesCtKwh, { min: 0, max: 100, stellen: 3 }) ?? 0, mindestJahr: v.zahl(u.mindestJahr, { min: 0, max: 1e8, stellen: 2 }) ?? 0 };
  }
  const neu = { ...alt, ...f };
  v.pflicht(neu.bezeichnung?.length >= 3, "Bitte geben Sie eine Bezeichnung an (mind. 3 Zeichen).");
  v.pflicht(!!neu.land, "Bitte wählen Sie das Land der Fläche.");
  v.pflicht(!!neu.modell, "Bitte wählen Sie das Pachtmodell.");
  v.pflicht(!!neu.vertragsdatum, "Bitte geben Sie das Vertragsdatum an.");
  v.pflicht(neu.laufzeitJahre > 0, "Bitte geben Sie die Laufzeit in Jahren an (1–60).");
  if (neu.beginn) v.pflicht(neu.beginn >= neu.vertragsdatum, "Der Pachtbeginn liegt vor dem Vertragsdatum.");
  if (neu.modell !== "umsatz") v.pflicht(neu.pachtJahr > 0, "Bitte geben Sie die Jahrespacht an.");
  if (neu.modell === "indexiert") v.pflicht(neu.index?.basisJahr > 0, "Bitte geben Sie das Basisjahr des Index an.");
  if (neu.modell === "umsatz") {
    v.pflicht(neu.umsatz?.anteil > 0 && neu.umsatz?.erloesCtKwh > 0, "Bitte geben Sie Umsatzanteil und Erlös je kWh an.");
    v.pflicht(!!neu.anlageId, "Für die Umsatzbeteiligung muss die Anlage verknüpft sein (Ertrag aus den Zählerstand-Monatswerten).");
  }
  if (neu.flaecheId) {
    const fl = db.flaechen.find((x) => x.id === neu.flaecheId);
    if (!fl) throw ungueltig("Fläche nicht gefunden.");
    if (fl.nutzerId !== neu.eigentuemerId) throw ungueltig("Die Fläche gehört nicht zum gewählten Eigentümer.");
  }
  if (neu.anlageId && !(db.anlagen?.anlagen || []).some((a) => a.id === neu.anlageId)) throw ungueltig("Anlage nicht gefunden.");
  if (neu.gesellschaftId && !gesellschaftFuer(db, neu.gesellschaftId).bekannt) throw ungueltig("Gesellschaft nicht im Gesellschaftsverzeichnis.");
  return neu;
}

export async function pachtvertragSpeichern(n, { id = null, daten = {} } = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const alt = id ? db.finanzen.pachtvertraege.find((x) => x.id === v.kennung(id)) : null;
    if (id && !alt) throw nichtGefunden("Pachtvertrag nicht gefunden.");
    const neu = vertragFelder(db, daten || {}, alt || {});
    const t = jetzt();
    if (alt) {
      Object.assign(alt, neu, { geaendertAm: t });
      protokoll(db, n, "pachtvertrag_geaendert", "pachtvertrag", alt.id, `Pachtvertrag geändert: ${Object.keys(daten || {}).join(", ")}`.slice(0, 280));
      return vertragAusgabe(db, alt, { backoffice: true });
    }
    const p = { ...neu, id: neueId("PT"), erstelltAm: t, geaendertAm: t };
    db.finanzen.pachtvertraege.push(p);
    protokoll(db, n, "pachtvertrag_angelegt", "pachtvertrag", p.id, `Pachtvertrag angelegt: ${p.bezeichnung}`);
    return vertragAusgabe(db, p, { backoffice: true });
  });
}

/** Auswahllisten für das Vertragsformular: Eigentümer-Konten, deren Flächen, Anlagen */
export async function pachtAuswahl(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return {
    eigentuemer: db.nutzer.filter((u) => u.aktiv && u.rollen.some((r) => ["flaeche", "landwirt"].includes(r))).map((u) => ({ id: u.id, name: nameVon(db, u.id), email: u.email })).sort((a, b) => a.name.localeCompare(b.name, "de")),
    flaechen: db.flaechen.filter((f) => f.nutzerId).map((f) => ({ id: f.id, bezeichnung: f.bezeichnung, nutzerId: f.nutzerId, ha: f.ha, land: f.land })),
    anlagen: (db.anlagen?.anlagen || []).map((a) => ({ id: a.id, name: a.name, land: a.land, kwp: a.kwp })),
    steuervorlagen: Object.entries(F.STEUERVORLAGEN).map(([id, s]) => ({ id, label: s.label, land: s.land })),
    gesellschaften: gesellschaftenListe(db).map((g) => ({ id: g.id, name: g.name, spv: g.spv })),
  };
}

// ================================================================ Klärfälle

export async function klaerfaelle(n, { status = "offen" } = {}) {
  leseNoetig(n);
  const db = await lesenBereit();
  return db.finanzen.klaerfaelle
    .filter((k) => !status || status === "alle" || k.status === status)
    .sort((a, b) => String(b.zuletztAm).localeCompare(String(a.zuletztAm)))
    .slice(0, 300)
    .map((k) => ({ ...k, statusLabel: F.KLAERFALL_STATUS[k.status]?.label || k.status, artLabel: F.ABRECHNUNG_ARTEN[k.art]?.label || k.art }));
}

export async function klaerfallAktion(n, id, { aktion, kommentar = "" } = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const k = db.finanzen.klaerfaelle.find((x) => x.id === v.kennung(id));
    if (!k) throw nichtGefunden("Klärfall nicht gefunden.");
    if (k.status !== "offen") throw konflikt("Der Klärfall ist bereits abgeschlossen.");
    const text = v.mehrzeilig(kommentar, 1000);
    if (!["erledigt", "verworfen"].includes(aktion)) throw ungueltig("Unbekannte Aktion.");
    if (text.length < 3) throw ungueltig("Bitte kurz begründen (z. B. „Monatswert nachgetragen“).");
    k.status = aktion;
    k.kommentar = text;
    k.erledigtAm = jetzt();
    k.erledigtVon = n.id;
    protokoll(db, n, `klaerfall_${aktion}`, "klaerfall", k.id, `${k.bezugText}: ${text}`.slice(0, 280));
    return { ...k, statusLabel: F.KLAERFALL_STATUS[k.status]?.label };
  });
}

// ================================================================ Zahlungsvorschlag und SEPA

/** Offene Pacht-Gutschriften bis Stichtag (Standard heute + 14 Tage) je Eigentümer, mit KYC-Freigabe */
export async function zahlungsvorschlag(n, { bis } = {}) {
  leseNoetig(n);
  const db = await lesenBereit();
  const stichtag = F.istDatum(bis) ? bis : F.plusTage(HEUTE(), 14);
  const gruppen = new Map();
  for (const b of db.finanzen.belege.filter((x) => x.art === "pacht" && x.status === "offen" && x.faelligAm <= stichtag)) {
    const k = kycAuszahlung(db, { kontoId: b.empfaengerId, flaecheId: b.bezug?.flaecheId || null });
    const gid = b.gesellschaftId || OEKOINVEST_ID;
    const schluessel = `${gid}|${b.empfaengerId}`;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, { kontoId: b.empfaengerId, empfaenger: b.partei?.name || nameVon(db, b.empfaengerId), gesellschaftId: gid, gesellschaft: gesellschaftFuer(db, gid).name, ibanMaskiert: F.ibanMaskieren(k.iban), kycStatus: k.status, belege: [], summe: 0, ok: true, gruende: [] });
    const g = gruppen.get(schluessel);
    g.belege.push({ id: b.id, nummer: b.nummer, zeitraum: b.zeitraum, faelligAm: b.faelligAm, brutto: b.brutto, ok: k.ok, gruende: k.gruende, bezugText: b.bezugText });
    g.summe = F.rund2(g.summe + b.brutto);
    if (!k.ok) {
      g.ok = false;
      g.gruende = [...new Set([...g.gruende, ...k.gruende])];
    }
  }
  const eintraege = [...gruppen.values()].sort((a, b) => Number(b.ok) - Number(a.ok) || a.empfaenger.localeCompare(b.empfaenger, "de"));
  return {
    bis: stichtag, eintraege,
    summeFrei: F.summe(eintraege.filter((e) => e.ok), "summe"), summeGesperrt: F.summe(eintraege.filter((e) => !e.ok), "summe"),
    // Auftraggeberkonten je zahlender Gesellschaft (eine SEPA-Datei je Gesellschaft)
    auftraggeber: [...new Set(eintraege.map((e) => e.gesellschaftId))].map((id) => {
      const g = gesellschaftFuer(db, id);
      return { gesellschaftId: id, name: g.name, ibanMaskiert: F.ibanMaskieren(g.iban), ibanOk: F.ibanPruefen(g.iban), beispiel: !!g.beispielIban };
    }),
  };
}

/**
 * SEPA-Überweisungsdatei (pain.001.001.09) für die gewählten Gutschriften erzeugen. Nur Leitung/Buchhaltung.
 * Jeder Beleg: Pacht-Gutschrift, offen, KYC verifiziert + geprüfte Bankverbindung – sonst 409 (nichts wird erzeugt).
 */
export async function sepaExport(n, { ids = [], ausfuehrungAm } = {}, { ip = "" } = {}) {
  schreibNoetig(n);
  const liste = [...new Set((Array.isArray(ids) ? ids : []).map((i) => v.kennung(i)).filter(Boolean))].slice(0, 500);
  if (!liste.length) throw ungueltig("Bitte wählen Sie mindestens eine Gutschrift.");
  const heute = HEUTE();
  const datum = F.istDatum(ausfuehrungAm) ? ausfuehrungAm : F.plusTage(heute, 1);
  if (datum < heute) throw ungueltig("Das Ausführungsdatum liegt in der Vergangenheit.");
  return aendernBereit((db) => {
    const gesperrt = [];
    const zahlungen = [];
    const belege = [];
    for (const id of liste) {
      const b = db.finanzen.belege.find((x) => x.id === id);
      if (!b || b.art !== "pacht") throw nichtGefunden("Gutschrift nicht gefunden.");
      if (b.status !== "offen") throw konflikt(`${b.nummer} ist nicht offen (${F.ABRECHNUNG_STATUS[b.status]?.label || b.status}).`);
      const k = kycAuszahlung(db, { kontoId: b.empfaengerId, flaecheId: b.bezug?.flaecheId || null });
      if (!k.ok) {
        gesperrt.push(`${b.nummer} (${b.partei?.name}): ${k.gruende.join(" ")}`);
        continue;
      }
      belege.push(b);
      zahlungen.push({ endToEndId: b.nummer, betrag: b.brutto, name: k.kontoinhaber || b.partei?.name, iban: k.iban, bic: k.bic, verwendungszweck: `Gutschrift ${b.nummer} ${b.bezugText}` });
    }
    if (gesperrt.length) throw new PlattformFehler(409, `Keine Auszahlung ohne abgeschlossene Verifizierung (KYC) und geprüfte Bankverbindung: ${gesperrt.join(" · ")}`, "kyc");
    const gids = [...new Set(belege.map((b) => b.gesellschaftId || OEKOINVEST_ID))];
    if (gids.length > 1) throw ungueltig("Die Gutschriften stammen von verschiedenen Gesellschaften – bitte je Gesellschaft (Auftraggeberkonto) eine SEPA-Datei erzeugen.");
    const ges = gesellschaftFuer(db, gids[0]);
    if (!F.ibanPruefen(ges.iban)) throw ungueltig(`Die IBAN der zahlenden Gesellschaft (${ges.name}) fehlt oder ist ungültig – bitte im Gesellschaftsverzeichnis bzw. in den Finanzeinstellungen pflegen.`);
    const zlId = neueId("ZL");
    const xml = F.pain001({ nachrichtId: zlId, erstelltAm: jetzt(), ausfuehrungAm: datum, auftraggeber: { name: ges.name, iban: ges.iban, bic: ges.bic }, zahlungen });
    const zl = { id: zlId, am: jetzt(), ausfuehrungAm: datum, gesellschaftId: ges.id, gesellschaft: ges.name, anzahl: zahlungen.length, summe: F.summe(zahlungen, "betrag"), belegIds: belege.map((b) => b.id), sha256: sha256(xml), vonId: n.id, vonName: nameVon(db, n.id), status: "erstellt", beispielIban: !!ges.beispielIban };
    db.finanzen.zahlungslaeufe.unshift(zl);
    for (const b of belege) {
      b.status = "angewiesen";
      b.zahlungslaufId = zlId;
      if (b.bezug?.pachtvertragId) klaerfallSchliessenKyc(db, `KYC:${b.empfaengerId}:${b.bezug.pachtvertragId}`);
    }
    protokoll(db, n, "sepa_export", "zahlungslauf", zlId, `SEPA-Datei ${zlId}: ${zl.anzahl} Zahlungen, ${F.euro(zl.summe)} (SHA-256 ${zl.sha256.slice(0, 16)}…)`, ip);
    return { xml, dateiname: `SEPA-${zlId}-${datum}.xml`, zahlungslauf: zl };
  });
}

/** Zahlungslauf bestätigen (Bank hat ausgeführt → alle Gutschriften bezahlt) oder verwerfen (zurück auf offen) */
export async function zahlungslaufAktion(n, id, { aktion } = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const zl = db.finanzen.zahlungslaeufe.find((x) => x.id === v.kennung(id));
    if (!zl) throw nichtGefunden("Zahlungslauf nicht gefunden.");
    if (zl.status !== "erstellt") throw konflikt("Der Zahlungslauf ist bereits abgeschlossen.");
    const belege = db.finanzen.belege.filter((b) => zl.belegIds.includes(b.id) && b.status === "angewiesen");
    if (aktion === "bestaetigen") {
      for (const b of belege) {
        b.status = "bezahlt";
        b.bezahltAm = zl.ausfuehrungAm <= HEUTE() ? zl.ausfuehrungAm : HEUTE();
        belegMelden(db, b, "bezahlt");
      }
      zl.status = "ausgefuehrt";
    } else if (aktion === "verwerfen") {
      for (const b of belege) {
        b.status = "offen";
        b.zahlungslaufId = null;
      }
      zl.status = "verworfen";
    } else throw ungueltig("Unbekannte Aktion.");
    zl.abgeschlossenAm = jetzt();
    protokoll(db, n, `zahlungslauf_${aktion}`, "zahlungslauf", zl.id, `${zl.id}: ${aktion} (${belege.length} Gutschriften)`);
    return zl;
  });
}

// ================================================================ Index (VPI)

export async function vpiWerte(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  return { reihen: F.INDEX_REIHEN, werte: [...db.finanzen.vpi].sort((a, b) => a.reihe.localeCompare(b.reihe) || a.jahr - b.jahr) };
}

export async function vpiSpeichern(n, { reihe, jahr, wert, quelle } = {}) {
  schreibNoetig(n);
  const r = v.auswahl(reihe, F.INDEX_REIHEN, "");
  const j = Math.round(v.zahl(jahr, { min: 1990, max: 2100 }) ?? 0);
  const w = v.zahl(wert, { min: 1, max: 1000, stellen: 3 });
  if (!r || !j || w === null) throw ungueltig("Bitte Reihe, Jahr und Indexwert (Jahresdurchschnitt) angeben.");
  return aendernBereit((db) => {
    let e = db.finanzen.vpi.find((x) => x.reihe === r && x.jahr === j);
    if (!e) db.finanzen.vpi.push((e = { reihe: r, jahr: j }));
    Object.assign(e, { wert: w, quelle: v.text(quelle, 200) || F.INDEX_REIHEN[r].quelle, geaendertAm: jetzt(), geaendertVon: n.id });
    protokoll(db, n, "vpi", "finanzen", `${r}-${j}`, `Indexwert ${r} ${j} = ${w}`);
    return e;
  });
}

// ================================================================ Anlagenbuchhaltung (AfA)

export async function finanzAnlagen(n) {
  leseNoetig(n);
  const db = await lesenBereit();
  const jahr = Number(HEUTE().slice(0, 4));
  return (db.anlagen?.anlagen || []).map((a) => {
    const as = db.finanzen.assets.find((x) => x.anlageId === a.id) || null;
    const regel = as?.regel || (["AT", "DE", "CH"].includes(a.land) ? a.land : "AT");
    const ges = anlageGesellschaft(db, a);
    const plan = as ? F.afaPlan({ anschaffungswert: as.anschaffungswert, nutzungsdauerJahre: as.nutzungsdauerJahre, inbetriebnahme: as.inbetriebnahme, regel }) : [];
    return {
      anlageId: a.id, name: a.name, typ: a.typ, land: a.land, kwp: a.kwp, inbetriebnahme: a.inbetriebnahme || "",
      gesellschaftId: ges.id, gesellschaft: ges.name, erpnextCompany: ges.erpnextCompany,
      aktiviert: !!as, asset: as, regel, regelText: F.AFA.regeln[regel]?.text || "",
      vorschlag: { nutzungsdauerJahre: F.standardNutzungsdauer(a.typ), regel },
      plan, afaJahr: plan.find((p) => p.jahr === jahr)?.afa ?? 0, buchwert: as ? F.buchwert(plan, jahr, as.anschaffungswert) : null,
    };
  });
}

export async function finanzAnlageSpeichern(n, anlageId, daten = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const a = (db.anlagen?.anlagen || []).find((x) => x.id === v.kennung(anlageId));
    if (!a) throw nichtGefunden("Anlage nicht gefunden.");
    const w = v.zahl(daten.anschaffungswert, { min: 1, max: 1e10, stellen: 2 });
    const nd = Math.round(v.zahl(daten.nutzungsdauerJahre, { min: 1, max: 50 }) ?? 0);
    const ib = F.datumOderLeer(daten.inbetriebnahme) || a.inbetriebnahme || "";
    if (!w || !nd || !ib) throw ungueltig("Bitte Anschaffungswert, Nutzungsdauer und Inbetriebnahme angeben.");
    let as = db.finanzen.assets.find((x) => x.anlageId === a.id);
    if (!as) db.finanzen.assets.push((as = { id: neueId("AA"), anlageId: a.id, erpnextAsset: null, erstelltAm: jetzt() }));
    Object.assign(as, { gesellschaftId: anlageGesellschaftId(db, a), anschaffungswert: w, nutzungsdauerJahre: nd, inbetriebnahme: ib, regel: v.auswahl(daten.regel, ["AT", "DE", "CH"], a.land || "AT"), bemerkung: v.text(daten.bemerkung, 200), geaendertAm: jetzt() });
    protokoll(db, n, "anlage_aktiviert", "anlage", a.id, `AfA: ${F.euro(w)} über ${nd} Jahre ab ${ib}`);
    return as;
  });
}

// ================================================================ Projektcontrolling (Ist-Kosten für die Projektentwicklung)

const darfEntwicklungLesen = (n) => finLesen(n) || (istAdmin(n) && darfLesen(n, "entwicklung"));

function kostentraegerListe(db) {
  const eigene = db.finanzen.kostentraeger.map((k) => ({ ...k, quelle: "finanzen" }));
  // Entwicklungsprojekte des Teams Projektentwicklung (falls in dieser Datenbank vorhanden) – tolerant gelesen
  const ep = (db.entwicklung?.projekte || []).map((p) => ({ id: p.id, bezeichnung: p.titel || p.name || p.id, mwp: Number(p.mwp) || null, budget: Number(p.budget?.gesamt ?? p.budgetGesamt ?? p.budget) || null, kostenstelle: "Projektentwicklung", quelle: "entwicklung" }));
  return [...eigene, ...ep.filter((p) => !eigene.some((e) => e.id === p.id))];
}

function istFuer(db, kt) {
  const kosten = db.finanzen.kosten.filter((k) => k.projektId === kt.id);
  const vergleich = F.budgetVergleich({ kosten, budget: kt.budget ?? null, mwp: kt.mwp });
  return { projektId: kt.id, bezeichnung: kt.bezeichnung, mwp: kt.mwp, quelle: "plattform", ...vergleich, positionen: kosten.sort((a, b) => b.datum.localeCompare(a.datum)), kostenarten: F.KOSTENARTEN };
}

export async function entwicklungKosten(n) {
  angemeldet(n);
  if (!darfEntwicklungLesen(n)) throw verboten("Nur für das Backoffice (Buchhaltung/Projektentwicklung).");
  const db = await lesenBereit();
  return kostentraegerListe(db).map((kt) => {
    const i = istFuer(db, kt);
    return { ...i, positionen: undefined, anzahl: i.positionen.length };
  });
}

/** Ist-Kosten eines Entwicklungsprojekts (API für das Entwicklungsmodul: Budget vs. Ist, Kosten je MWp) */
export async function entwicklungIst(n, projektId) {
  angemeldet(n);
  if (!darfEntwicklungLesen(n)) throw verboten("Nur für das Backoffice (Buchhaltung/Projektentwicklung).");
  const db = await lesenBereit();
  const kt = kostentraegerListe(db).find((k) => k.id === v.kennung(projektId));
  if (!kt) {
    // unbekanntes Projekt: Ist 0 (noch keine Kosten gebucht) statt Fehler – das Entwicklungsmodul kann jederzeit fragen
    return { projektId: v.kennung(projektId), quelle: "plattform", ist: 0, jeArt: {}, budget: null, abweichung: null, quote: null, ampel: "offen", jeMwp: null, positionen: [] };
  }
  return istFuer(db, kt);
}

export async function entwicklungKostenBuchen(n, daten = {}) {
  schreibNoetig(n);
  return aendernBereit((db) => {
    const kt = kostentraegerListe(db).find((k) => k.id === v.kennung(daten.projektId));
    if (!kt) throw ungueltig("Kostenträger bzw. Entwicklungsprojekt nicht gefunden.");
    const betrag = v.zahl(daten.betrag, { min: -1e9, max: 1e9, stellen: 2 });
    const datum = F.datumOderLeer(daten.datum) || HEUTE();
    if (!betrag) throw ungueltig("Bitte einen Betrag angeben (Gutschriften negativ).");
    const k = { id: neueId("PK"), projektId: kt.id, kostenart: v.auswahl(daten.kostenart, F.KOSTENARTEN, "sonstiges"), betrag, datum, beleg: v.text(daten.beleg, 60), beschreibung: v.text(daten.beschreibung, 200), quelle: "manuell", erstelltAm: jetzt(), vonId: n.id };
    db.finanzen.kosten.push(k);
    protokoll(db, n, "projektkosten", "entwicklung", kt.id, `${F.KOSTENARTEN[k.kostenart]}: ${F.euro(betrag)} (${k.beleg || "ohne Beleg"})`);
    return k;
  });
}


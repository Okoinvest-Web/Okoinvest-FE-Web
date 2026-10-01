// src/lib/plattform/eg/wechsel.js
//
// WP5 – Wechsel einer bestehenden Gemeinschaft zu ÖkoInvest (Fachkonzept 2.6; Marktanalyse 5 Punkt 11 „Wechselgarantie“):
// Import von Mitgliedern, Zählpunkten, Tarifen und offenen Posten aus CSV bzw. aus Excel kopierten Tabellen (Tab-getrennt)
// gängiger Anbieter mit Spaltenzuordnung, Plausibilitätsprüfung, Importplan für die WP1-Operationen (egCsvImport u. a.),
// Umstellungsplan mit Stichtag, Kontrollabrechnung (Vergleich mit der letzten Altabrechnung) und ElWG-Anpassungspaket.
// Reine Funktionen; Python-Spiegel plattform/eg_gruendung_kern.py (Testvektoren eg/testdaten/gruendung/wechsel.json).
//
// Die Spaltennamen der Anbieterprofile beruhen auf typischen Exporten bzw. Annahmen (zu bestätigen) – der Assistent zeigt
// die Zuordnung immer an und lässt sie ändern. XLSX-Dateien bitte als CSV speichern oder die Zellen kopieren und einfügen.

import { CONSENT_MIGRATION, EG_MODELLE, LIEFERANTENPFLICHT_KW, MITGLIED_ARTEN, STEUERSTATUS_ERZEUGER, TF_MAX, TF_MIN } from "./modell.js";
import { zaehlpunktPruefen } from "./zaehlpunkt.js";
import { uidPruefen } from "./stamm.js";
import { iban as ibanPruefen } from "../mitglied/basis.js";
import { WECHSEL_SCHRITTE, datumGueltig, plusTage, tageBis } from "./gruendung.js";

export const IMPORT_MAX_ZEILEN = 5000;
export const IMPORT_STATUS = { vorschau: "Vorschau", geprueft: "Geprüft", ausgefuehrt: "Übernommen", fehlgeschlagen: "Fehlgeschlagen", verworfen: "Verworfen" };

/** Zielfelder des Imports mit Synonymen (normalisierte Spaltennamen) */
export const IMPORT_FELDER = {
  mitgliedsnummer: { label: "Mitgliedsnummer", syn: ["mitgliedsnummer", "mitgliedsnr", "mitgliednr", "mitgliednummer", "teilnehmernummer", "teilnehmernr", "participantnumber", "memberid", "kundennummer", "nr"] },
  art: { label: "Mitgliedsart", syn: ["mitgliedsart", "art", "typ", "kundentyp", "teilnehmertyp", "participanttype", "rolle"] },
  vorname: { label: "Vorname", syn: ["vorname", "firstname", "vname"] },
  nachname: { label: "Nachname", syn: ["nachname", "familienname", "zuname", "lastname", "name"] },
  firma: { label: "Firma", syn: ["firma", "firmenname", "unternehmen", "organisation", "company", "companyname"] },
  strasse: { label: "Straße", syn: ["strasse", "strassehausnummer", "adresse", "anschrift", "street"] },
  plz: { label: "PLZ", syn: ["plz", "postleitzahl", "zip", "zipcode"] },
  ort: { label: "Ort", syn: ["ort", "wohnort", "stadt", "city"] },
  email: { label: "E-Mail", syn: ["email", "emailadresse", "mail"] },
  telefon: { label: "Telefon", syn: ["telefon", "telefonnummer", "tel", "mobil", "phone"] },
  iban: { label: "IBAN", syn: ["iban", "bankverbindung", "kontonummer"] },
  sepa_referenz: { label: "SEPA-Mandatsreferenz", syn: ["mandatsreferenz", "mandatreferenz", "sepamandat", "separeferenz", "mandat", "mandatereference"] },
  sepa_datum: { label: "SEPA-Mandatsdatum", syn: ["mandatsdatum", "mandatdatum", "sepadatum", "mandatedate"] },
  steuerstatus: { label: "Steuerstatus Erzeuger", syn: ["steuerstatus", "ustatus", "umsatzsteuerstatus", "umsatzsteuer", "taxstatus", "steuer"] },
  uid: { label: "UID", syn: ["uid", "uidnummer", "ustid", "vatid"] },
  zaehlpunkt: { label: "Zählpunkt", syn: ["zaehlpunkt", "zaehlpunktnummer", "zaehlpunktbezeichnung", "zpnummer", "zp", "meteringpoint", "meteringpointid", "messpunkt"] },
  richtung: { label: "Energierichtung", syn: ["energierichtung", "richtung", "direction", "zptyp", "zaehlpunkttyp", "bezugeinspeisung"] },
  teilnahmefaktor: { label: "Teilnahmefaktor (%)", syn: ["teilnahmefaktor", "tf", "tnf", "participationfactor", "anteilprozent", "anteil"] },
  aufteilungsschluessel: { label: "Aufteilungsschlüssel (%)", syn: ["aufteilungsschluessel", "verteilschluessel", "statischeraufteilungsschluessel", "allocation"] },
  consent_id: { label: "Consent-ID", syn: ["consentid", "consent", "zustimmungsid"] },
  aktiv_seit: { label: "Aktiv seit", syn: ["aktivseit", "aktiviertam", "gueltigab", "teilnahmeab", "validfrom", "beginn"] },
  kwp: { label: "Anlagenleistung (kWp)", syn: ["kwp", "anlagenleistung", "pvleistung", "engpassleistung", "leistungkwp", "leistung"] },
  tarif_bezug_ct: { label: "Bezugspreis (ct/kWh netto)", syn: ["bezugspreis", "bezugspreisct", "preisbezug", "arbeitspreisbezug", "verbrauchspreis", "tarifbezug"] },
  tarif_einspeisung_ct: { label: "Einspeisepreis (ct/kWh netto)", syn: ["einspeisepreis", "einspeisepreisct", "preiseinspeisung", "einspeisetarif", "erzeugerpreis", "tarifeinspeisung"] },
  offener_saldo_eur: { label: "Offener Saldo (€)", syn: ["offenersaldo", "saldo", "offenerbetrag", "offeneposten", "forderung"] },
  beitritt_am: { label: "Beitritt am", syn: ["beitrittam", "beitrittsdatum", "mitgliedseit", "eintrittsdatum"] },
  status: { label: "Status", syn: ["mitgliedsstatus", "status", "zustand"] },
};
export const IMPORT_FELD_IDS = Object.keys(IMPORT_FELDER);

/**
 * Anbieterprofile: Erkennungsspalten (normalisiert), Hinweise zum Export. Werte (zu bestätigen) – Zuordnung bleibt änderbar.
 */
export const ANBIETER_PROFILE = {
  energiedigital: { label: "energiedigital", erkennung: ["zaehlpunktbezeichnung", "tarifgruppe", "teilnehmerstatus"], export: "Export der Mitglieder- bzw. Zählpunktliste im Verwaltungsbereich als CSV bzw. Excel (Bezeichnung zu bestätigen).", quelle: "energiedigital.at (Datenimport aus Vorsystemen beworben)" },
  eegfaktura: { label: "EEG Faktura", erkennung: ["participantnumber", "meteringpoint", "participationfactor", "tariffname"], export: "Teilnehmer- und Zählpunktliste exportieren; Beim Wechsel aus dem EDA-Portal erfolgt laut FAQ eine Neuerfassung per Excel.", quelle: "docs.eegfaktura.at (FAQ)" },
  egon: { label: "EGON", erkennung: ["mitgliedsnummer", "zaehlpunktnummer", "energierichtung", "tarifname"], export: "Mitgliederliste aus der Verwaltung exportieren (Format zu bestätigen).", quelle: "egon.energy" },
  eda_portal: { label: "EDA-Anwenderportal / Zählpunktliste", erkennung: ["consentid", "energierichtung", "teilnahmefaktor", "gueltigab"], export: "Zählpunktliste der Gemeinschaft (ECMPList) aus dem EDA-Anwenderportal; Personendaten aus der eigenen Mitgliederliste ergänzen.", quelle: "HA II 5.5; ebutilities.at/schemas/160" },
  koordinationsstelle: { label: "Excel-Tool der Koordinationsstelle", erkennung: ["zaehlpunkt", "verbrauchkwh", "erzeugungkwh"], export: "Tabellenblatt mit Teilnehmern als CSV speichern.", quelle: "energiegemeinschaften.gv.at/tools" },
  generisch: { label: "Andere Tabelle", erkennung: [], export: "Erste Zeile mit Spaltennamen, eine Zeile je Zählpunkt eines Mitglieds.", quelle: "" },
};

// ---------------------------------------------------------------- Lesen und Zuordnen

/** Spaltenname normalisieren: Kleinbuchstaben, Umlaute, nur Buchstaben und Ziffern */
export function spalteNormalisieren(s) {
  return String(s ?? "").trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/\W+/g, "").replace(/_/g, "");
}

/**
 * Tabelle lesen (CSV mit ; oder , bzw. Tabulator aus Excel). Anführungszeichen nach RFC 4180.
 * @returns {{kopf:string[], kopfNorm:string[], zeilen:string[][], trenner:string}}
 */
export function tabelleLesen(roh, { maxZeilen = IMPORT_MAX_ZEILEN } = {}) {
  const s = String(roh || "").replace(/^﻿/, "");
  const erste = s.split(/\r?\n/, 1)[0] || "";
  const anzahl = (z) => erste.split(z).length - 1;
  const trenner = anzahl("\t") > 0 && anzahl("\t") >= anzahl(";") ? "\t" : anzahl(";") >= anzahl(",") ? ";" : ",";
  const alle = [];
  let feld = "";
  let zeile = [];
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"' && s[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQ = false;
      else feld += c;
    } else if (c === '"' && feld === "") inQ = true;
    else if (c === trenner) { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      zeile.push(feld);
      feld = "";
      if (zeile.some((x) => x.trim() !== "")) alle.push(zeile);
      zeile = [];
      if (alle.length > maxZeilen + 1) break;
    } else feld += c;
  }
  if (feld !== "" || zeile.length) { zeile.push(feld); if (zeile.some((x) => x.trim() !== "")) alle.push(zeile); }
  if (!alle.length) return { kopf: [], kopfNorm: [], zeilen: [], trenner };
  const kopf = alle[0].map((x) => x.trim());
  return { kopf, kopfNorm: kopf.map(spalteNormalisieren), zeilen: alle.slice(1, maxZeilen + 1).map((z) => kopf.map((_, i) => String(z[i] ?? "").trim())), trenner };
}

/** Anbieter anhand der Spalten erkennen → { anbieter, treffer, sicherheit: hoch|mittel|keine } */
export function anbieterErkennen(kopfNorm = []) {
  let best = { anbieter: "generisch", treffer: 0 };
  for (const [id, p] of Object.entries(ANBIETER_PROFILE)) {
    const t = p.erkennung.filter((e) => kopfNorm.includes(e)).length;
    if (t > best.treffer) best = { anbieter: id, treffer: t };
  }
  return { ...best, sicherheit: best.treffer >= 3 ? "hoch" : best.treffer >= 2 ? "mittel" : "keine" };
}

/**
 * Spaltenzuordnung vorschlagen: { zielfeld: spaltenindex }. Erst exakte Synonyme, dann Teiltreffer (≥ 4 Zeichen).
 * „name“ gilt als Nachname nur, wenn kein eindeutigerer Nachname-Kopf existiert.
 */
export function zuordnungVorschlagen(kopfNorm = []) {
  const z = {};
  const belegt = new Set();
  for (const runde of ["exakt", "teil"]) {
    for (const [feld, def] of Object.entries(IMPORT_FELDER)) {
      if (z[feld] !== undefined) continue;
      for (const syn of def.syn) {
        const i = kopfNorm.findIndex((k, j) => !belegt.has(j) && (runde === "exakt" ? k === syn : syn.length >= 4 && k.length >= 4 && (k.startsWith(syn) || k.endsWith(syn))));
        if (i >= 0) {
          z[feld] = i;
          belegt.add(i);
          break;
        }
      }
    }
  }
  return z;
}

/** Zuordnung bereinigen (nur bekannte Zielfelder, Spaltenindex innerhalb des Kopfs, jede Spalte höchstens einmal) */
export function zuordnungBereinigen(z = {}, spalten = 0) {
  const out = {};
  const belegt = new Set();
  for (const f of IMPORT_FELD_IDS) {
    const i = Number(z?.[f]);
    if (z?.[f] === undefined || z?.[f] === null || z?.[f] === "" || !Number.isInteger(i) || i < 0 || i >= spalten || belegt.has(i)) continue;
    out[f] = i;
    belegt.add(i);
  }
  return out;
}

// ---------------------------------------------------------------- Werte normieren

const t = (v, max = 160) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const ART = { privat: "privat", privatperson: "privat", haushalt: "privat", person: "privat", natuerlich: "privat", natuerlicheperson: "privat", verbraucher: "privat", landwirt: "landwirt", landwirtschaft: "landwirt", unternehmen: "kmu", firma: "kmu", kmu: "kmu", betrieb: "kmu", gewerbe: "kmu", grossunternehmen: "grossunternehmen", gemeinde: "gemeinde", kommune: "gemeinde", gebietskoerperschaft: "gemeinde", oeffentlich: "oeffentlich", verein: "verein", private: "privat", company: "kmu", municipality: "gemeinde" };
const RICHTUNG = { verbrauch: "verbrauch", bezug: "verbrauch", consumption: "verbrauch", verbraucher: "verbrauch", c: "verbrauch", erzeugung: "erzeugung", einspeisung: "erzeugung", generation: "erzeugung", erzeuger: "erzeugung", produktion: "erzeugung", g: "erzeugung", lieferung: "erzeugung" };
const STEUER = { kleinunternehmer: "kleinunternehmer", ku: "kleinunternehmer", regelbesteuert: "regelbesteuert", regelbesteuerung: "regelbesteuert", ustpflichtig: "regelbesteuert", regel: "regelbesteuert", pauschalierterlandwirt: "pauschalierter_landwirt", pauschaliert: "pauschalierter_landwirt", landwirtpauschaliert: "pauschalierter_landwirt", nichtunternehmerisch: "nicht_unternehmerisch", privat: "nicht_unternehmerisch", keine: "nicht_unternehmerisch", gemeindebga: "gemeinde_bga", bga: "gemeinde_bga" };
const STATUS = { aktiv: "aktiv", active: "aktiv", aufgenommen: "aktiv", mitglied: "aktiv", ausgetreten: "ausgeschieden", ausgeschieden: "ausgeschieden", inaktiv: "ausgeschieden", beendet: "ausgeschieden", gekuendigt: "gekuendigt", antrag: "antrag", offen: "antrag", neu: "antrag", interessent: "interessent" };

/** Zahl mit Komma oder Punkt („1.234,5“, „1234.5“, „12 %“) → Zahl bzw. null */
export function zahlLesen(v) {
  let s = String(v ?? "").replace(/%|€|\s|ct|kwp|kWp|EUR/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
/** Datum TT.MM.JJJJ, TT.MM.JJ, JJJJ-MM-TT → ISO bzw. "" */
export function datumLesen(v) {
  const s = String(v ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return datumGueltig(s) ? s : "";
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
  if (!m) return "";
  const j = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${j}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return datumGueltig(iso) ? iso : "";
}
/** Teilnahmefaktor: „100“, „100 %“, „0,6“ (Anteil) → ganze Prozent bzw. null */
export function tfLesen(v) {
  const roh = String(v ?? "").trim();
  const n = zahlLesen(roh);
  if (n === null) return null;
  if (n > 0 && n <= 1 && /,|\./.test(roh) && !roh.includes("%")) return Math.round(n * 100);
  return n;
}
const nachSchluessel = (map, v) => map[spalteNormalisieren(v)] || "";

/**
 * Zeilen anhand der Zuordnung in Datensätze übersetzen (eine Zeile = ein Zählpunkt eines Mitglieds).
 * @returns {object[]} Datensätze { zeile, mitglied, zaehlpunkt, teilnahme, anlage, tarif, saldoEur, schluessel }
 */
export function zeilenAbbilden(zeilen = [], zuordnung = {}) {
  const w = (z, f) => (zuordnung[f] === undefined ? "" : t(z[zuordnung[f]], 300));
  return zeilen.map((z, i) => {
    const firma = w(z, "firma");
    let art = nachSchluessel(ART, w(z, "art"));
    if (!art) art = firma ? "kmu" : "privat";
    const ib = w(z, "iban").replace(/\s/g, "").toUpperCase();
    const ref = w(z, "sepa_referenz");
    const email = w(z, "email").toLowerCase();
    const nr = w(z, "mitgliedsnummer").replace(/^0+(?=\d)/, "");
    const m = {
      mitgliedsnummer: nr, art,
      person: { vorname: w(z, "vorname"), nachname: w(z, "nachname"), firma, strasse: w(z, "strasse"), plz: w(z, "plz").replace(/^A-?/i, ""), ort: w(z, "ort"), email, telefon: w(z, "telefon") },
      iban: ib, sepaMandat: ref ? { referenz: ref.slice(0, 35), datum: datumLesen(w(z, "sepa_datum")), status: "aktiv" } : null,
      steuerstatusErzeuger: nachSchluessel(STEUER, w(z, "steuerstatus")), uid: w(z, "uid").replace(/\s/g, "").toUpperCase(),
      beitrittAm: datumLesen(w(z, "beitritt_am")), status: nachSchluessel(STATUS, w(z, "status")) || "aktiv",
    };
    const zp = w(z, "zaehlpunkt").replace(/\s|-|\./g, "").toUpperCase();
    const richtungRoh = w(z, "richtung");
    let richtung = nachSchluessel(RICHTUNG, richtungRoh);
    const kwp = zahlLesen(w(z, "kwp"));
    if (!richtung && zp) richtung = kwp ? "erzeugung" : "";
    const tf = tfLesen(w(z, "teilnahmefaktor"));
    const consent = w(z, "consent_id");
    const schluessel = nr ? `nr:${nr}` : email ? `mail:${email}` : `name:${spalteNormalisieren(`${m.person.vorname}${m.person.nachname}${firma}${m.person.plz}`)}`;
    return {
      zeile: i + 2, schluessel, mitglied: m,
      zaehlpunkt: zp ? { nummer: zp, richtung, richtungRoh } : null,
      teilnahme: zp ? { teilnahmefaktor: tf, aufteilungsschluesselPct: zahlLesen(w(z, "aufteilungsschluessel")), consentId: consent, gueltigAb: datumLesen(w(z, "aktiv_seit")) } : null,
      anlage: kwp ? { kwp } : null,
      tarif: { bezugspreisCt: zahlLesen(w(z, "tarif_bezug_ct")), einspeisepreisCt: zahlLesen(w(z, "tarif_einspeisung_ct")) },
      saldoEur: zahlLesen(w(z, "offener_saldo_eur")),
    };
  });
}

// ---------------------------------------------------------------- Plausibilität

/**
 * Plausibilitätsprüfung der Datensätze.
 * @param {object[]} ds Datensätze (zeilenAbbilden)
 * @param {{gemeinschaft?:object, netzbetreiber?:object[], bestandZaehlpunkte?:string[], heute?:string}} k
 * @returns {{fehler:object[], warnungen:object[], hinweise:object[], zeilenStatus:object, kennzahlen:object, ok:boolean}}
 */
export function plausibilitaet(ds = [], { gemeinschaft = null, netzbetreiber = [], bestandZaehlpunkte = [] } = {}) {
  const fehler = [];
  const warnungen = [];
  const hinweise = [];
  const F = (zeile, feld, text) => fehler.push({ zeile, feld, text });
  const W = (zeile, feld, text) => warnungen.push({ zeile, feld, text });
  const modell = gemeinschaft?.modell || "";
  const nbIds = gemeinschaft?.netzbetreiber || [];
  const zpGesehen = new Map();
  const nrNamen = new Map();
  const mailSchluessel = new Map();
  const tarife = new Set();
  let kwpSumme = 0;
  let ohneConsent = 0;
  let migration = 0;
  let saldo = 0;
  let aufteilung = 0;
  const mitglieder = new Set();
  for (const d of ds) {
    const m = d.mitglied;
    const z = d.zeile;
    mitglieder.add(d.schluessel);
    if (!m.person.nachname && !m.person.firma) F(z, "nachname", "Name bzw. Firma fehlt.");
    if (!MITGLIED_ARTEN[m.art]) F(z, "art", "Mitgliedsart unbekannt.");
    if (modell === "eeg" && m.art === "grossunternehmen") F(z, "art", "Großunternehmen sind in einer EEG nicht zulässig (ElWG § 6 Abs. 1 Z 61) – möglich ist eine BEG.");
    if (m.iban && !ibanPruefen(m.iban)) F(z, "iban", "IBAN ungültig (Prüfsumme).");
    if (m.sepaMandat && !m.iban) F(z, "sepa_referenz", "SEPA-Mandat ohne IBAN.");
    if (m.sepaMandat && !m.sepaMandat.datum) W(z, "sepa_datum", "Mandatsdatum fehlt – Lastschrift erst nach Ergänzung.");
    if (m.iban && !m.sepaMandat) W(z, "sepa_referenz", "IBAN ohne SEPA-Mandat – Zahlung per Überweisung.");
    if (m.steuerstatusErzeuger && !STEUERSTATUS_ERZEUGER[m.steuerstatusErzeuger]) F(z, "steuerstatus", "Steuerstatus unbekannt.");
    if (STEUERSTATUS_ERZEUGER[m.steuerstatusErzeuger]?.uidPflicht && !uidPruefen(m.uid)) F(z, "uid", "Regelbesteuerte Erzeuger bzw. Gemeinden mit BgA brauchen eine gültige UID (Reverse Charge).");
    if (m.uid && !uidPruefen(m.uid)) F(z, "uid", "UID-Format ATU + 8 Ziffern.");
    if (m.person.plz && !/^\d{4}$/.test(m.person.plz)) W(z, "plz", "PLZ ist nicht vierstellig.");
    if (m.mitgliedsnummer) {
      const name = spalteNormalisieren(`${m.person.vorname}${m.person.nachname}${m.person.firma}`);
      if (nrNamen.has(m.mitgliedsnummer) && nrNamen.get(m.mitgliedsnummer) !== name) F(z, "mitgliedsnummer", `Mitgliedsnummer ${m.mitgliedsnummer} ist mehreren Personen zugeordnet.`);
      nrNamen.set(m.mitgliedsnummer, name);
    }
    if (m.person.email) {
      if (mailSchluessel.has(m.person.email) && mailSchluessel.get(m.person.email) !== d.schluessel) W(z, "email", "Dieselbe E-Mail-Adresse bei mehreren Mitgliedern.");
      mailSchluessel.set(m.person.email, d.schluessel);
    }
    if (typeof d.saldoEur === "number") saldo += d.saldoEur;
    if (d.tarif.bezugspreisCt !== null || d.tarif.einspeisepreisCt !== null) {
      tarife.add(`${d.tarif.bezugspreisCt ?? ""}|${d.tarif.einspeisepreisCt ?? ""}`);
      for (const [k, v] of Object.entries(d.tarif)) if (v !== null && (v < 0 || v > 60)) W(z, k, `Preis ${v} ct/kWh ist ungewöhnlich (erwartet 0–60 ct netto).`);
    }
    if (!d.zaehlpunkt) {
      W(z, "zaehlpunkt", "Kein Zählpunkt – Mitglied wird ohne Teilnahme übernommen (förderndes Mitglied bzw. Ergänzung später).");
      continue;
    }
    const p = zaehlpunktPruefen(d.zaehlpunkt.nummer, { netzbetreiber });
    if (!p.ok) {
      F(z, "zaehlpunkt", p.fehler);
      continue;
    }
    for (const h of p.hinweise) W(z, "zaehlpunkt", h);
    if (nbIds.length && p.netzbetreiberId && !nbIds.includes(p.netzbetreiberId)) W(z, "zaehlpunkt", "Zählpunkt liegt bei einem Netzbetreiber, der für diese Gemeinschaft nicht hinterlegt ist.");
    if (zpGesehen.has(p.wert)) F(z, "zaehlpunkt", `Zählpunkt doppelt (auch Zeile ${zpGesehen.get(p.wert)}).`);
    zpGesehen.set(p.wert, z);
    if (bestandZaehlpunkte.includes(p.wert)) W(z, "zaehlpunkt", "Zählpunkt ist in der Gemeinschaft bereits erfasst – vorhandene Teilnahme bleibt, keine Dublette.");
    if (!d.zaehlpunkt.richtung) F(z, "richtung", `Energierichtung unbekannt („${d.zaehlpunkt.richtungRoh || "leer"}“) – erwartet Verbrauch/Bezug bzw. Erzeugung/Einspeisung.`);
    const tf = d.teilnahme.teilnahmefaktor;
    if (tf === null) W(z, "teilnahmefaktor", "Teilnahmefaktor fehlt – 100 % angenommen.");
    else if (!Number.isInteger(tf) || tf < TF_MIN || tf > TF_MAX) F(z, "teilnahmefaktor", `Teilnahmefaktor ${tf} – erlaubt sind ganze Prozent ${TF_MIN}–${TF_MAX} (ElWG § 71 Abs. 5).`);
    if (!d.teilnahme.consentId) ohneConsent++;
    else if (d.teilnahme.consentId === CONSENT_MIGRATION) migration++;
    if (gemeinschaft?.verteilmodell === "statisch" && d.zaehlpunkt.richtung === "verbrauch") {
      if (d.teilnahme.aufteilungsschluesselPct === null) W(z, "aufteilungsschluessel", "Statisches Modell: Aufteilungsschlüssel fehlt.");
      else aufteilung += d.teilnahme.aufteilungsschluesselPct;
    }
    if (d.zaehlpunkt.richtung === "erzeugung") {
      if (!d.anlage) W(z, "kwp", "Erzeugungszählpunkt ohne Anlagenleistung – § 69-Schwelle nicht prüfbar.");
      else kwpSumme += d.anlage.kwp;
    }
  }
  const zps = [...zpGesehen.keys()].length;
  if (ohneConsent) hinweise.push({ text: `${ohneConsent} Zählpunkt(e) ohne Consent-ID – sie werden beim Abgleich mit der Zählpunktliste des Netzbetreibers (EC_PODLIST) ergänzt.`, quelle: "HA II 5.5" });
  if (migration) hinweise.push({ text: `${migration} Altzuordnung(en) mit Consent-ID „Migration“ (vor 03.10.2022) – gültig.`, quelle: "HA II 7.2" });
  if (tarife.size > 1) warnungen.push({ zeile: 0, feld: "tarif", text: `${tarife.size} verschiedene Preiskombinationen – übernommen wird der häufigste Preis als Tarif, Abweichungen als individuelle Preise prüfen.` });
  if (gemeinschaft?.verteilmodell === "statisch" && aufteilung && Math.abs(aufteilung - 100) > 0.05) warnungen.push({ zeile: 0, feld: "aufteilungsschluessel", text: `Summe der Aufteilungsschlüssel ${Math.round(aufteilung * 10) / 10} % – der Netzbetreiber normiert erst über 100 % (HA II).` });
  if (kwpSumme > LIEFERANTENPFLICHT_KW.allgemein) hinweise.push({ text: `Erzeugungsleistung laut Import ${Math.round(kwpSumme * 10) / 10} kWp – Lieferantenpflichten nach § 69 ElWG prüfen.`, quelle: "ElWG § 69" });
  if (modell && !EG_MODELLE[modell]) warnungen.push({ zeile: 0, feld: "modell", text: "Modell der Gemeinschaft unbekannt." });
  const zeilenStatus = {};
  for (const d of ds) zeilenStatus[d.zeile] = "ok";
  for (const w of warnungen) if (w.zeile) zeilenStatus[w.zeile] = "warnung";
  for (const f of fehler) zeilenStatus[f.zeile] = "fehler";
  return {
    ok: !fehler.length, fehler, warnungen, hinweise, zeilenStatus,
    kennzahlen: { zeilen: ds.length, mitglieder: mitglieder.size, zaehlpunkte: zps, verbrauch: ds.filter((d) => d.zaehlpunkt?.richtung === "verbrauch").length, erzeugung: ds.filter((d) => d.zaehlpunkt?.richtung === "erzeugung").length, ohneConsent, migrationConsent: migration, kwp: Math.round(kwpSumme * 100) / 100, tarife: tarife.size, saldoEur: Math.round(saldo * 100) / 100, fehlerZeilen: Object.values(zeilenStatus).filter((x) => x === "fehler").length },
  };
}

// ---------------------------------------------------------------- Importplan (Ausführung über WP1)

/** CSV-Vorlage von WP1 (egCsvImport) */
export const WP1_CSV_SPALTEN = ["mitgliedsnummer", "art", "vorname", "nachname", "firma", "strasse", "plz", "ort", "email", "iban", "sepa_referenz", "sepa_datum", "steuerstatus", "uid", "zaehlpunkt", "richtung", "teilnahmefaktor", "kwp"];
const csvFeld = (v) => {
  const s = String(v ?? "");
  return /;|"|\n|\r/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Plan für die Übernahme: CSV im WP1-Format (eine Zeile je Zählpunkt; Mitglieder werden über die vorhergesagte neue
 * Mitgliedsnummer zusammengeführt), Status-Liste, Tarif-Vorschlag, Soll-Liste für den EC_PODLIST-Abgleich, Salden.
 * @param {object[]} ds Datensätze (ohne Fehlerzeilen)
 * @param {{bestand?:{mitgliedsnummer:number, email:string}[], ausschliessen?:number[]}} o
 */
export function importPlan(ds = [], { bestand = [], ausschliessen = [] } = {}) {
  const raus = new Set(ausschliessen);
  const liste = ds.filter((d) => !raus.has(d.zeile));
  const erst = [...new Set(liste.map((d) => d.schluessel))];
  const pos = new Map(erst.map((k, i) => [k, i]));
  const nrAlt = (k) => Number(liste.find((d) => d.schluessel === k)?.mitglied.mitgliedsnummer) || 1e12;
  const reihenfolge = [...erst].sort((a, b) => nrAlt(a) - nrAlt(b) || pos.get(a) - pos.get(b));
  let naechste = 1 + bestand.reduce((m, x) => Math.max(m, Number(x.mitgliedsnummer) || 0), 0);
  const nummer = new Map();
  for (const k of reihenfolge) {
    const d = liste.find((x) => x.schluessel === k);
    const vorh = d.mitglied.person.email ? bestand.find((b) => b.email && b.email === d.mitglied.person.email) : null;
    nummer.set(k, { neu: !vorh, nummer: vorh ? Number(vorh.mitgliedsnummer) : naechste++ });
  }
  const zeilen = [];
  const gesehen = new Set();
  for (const k of reihenfolge) {
    for (const d of liste.filter((x) => x.schluessel === k)) {
      const m = d.mitglied;
      const n = nummer.get(k);
      const nr = n.neu && !gesehen.has(k) ? "" : String(n.nummer);
      gesehen.add(k);
      zeilen.push([nr, m.art, m.person.vorname, m.person.nachname, m.person.firma, m.person.strasse, m.person.plz, m.person.ort, m.person.email, m.iban, m.sepaMandat?.referenz || "", m.sepaMandat?.datum || "", m.steuerstatusErzeuger || "", m.uid, d.zaehlpunkt?.nummer || "", d.zaehlpunkt?.richtung || "", d.zaehlpunkt ? d.teilnahme.teilnahmefaktor ?? 100 : "", d.anlage?.kwp ?? ""]);
    }
  }
  const csv = [WP1_CSV_SPALTEN.join(";"), ...zeilen.map((z) => z.map(csvFeld).join(";"))].join("\r\n") + "\r\n";
  const zaehl = new Map();
  for (const d of liste) {
    if (d.tarif.bezugspreisCt === null && d.tarif.einspeisepreisCt === null) continue;
    const k = `${d.tarif.bezugspreisCt ?? ""}|${d.tarif.einspeisepreisCt ?? ""}`;
    zaehl.set(k, (zaehl.get(k) || 0) + 1);
  }
  const haeufig = [...zaehl.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  const tarif = haeufig ? { bezugspreisCt: haeufig[0].split("|")[0] === "" ? null : Number(haeufig[0].split("|")[0]), einspeisepreisCt: haeufig[0].split("|")[1] === "" ? null : Number(haeufig[0].split("|")[1]) } : null;
  return {
    csv, zeilen: zeilen.length,
    mitglieder: reihenfolge.map((k) => {
      const d = liste.find((x) => x.schluessel === k);
      return { schluessel: k, mitgliedsnummer: nummer.get(k).nummer, neu: nummer.get(k).neu, alteNummer: d.mitglied.mitgliedsnummer, status: d.mitglied.status, saldoEur: Math.round(liste.filter((x) => x.schluessel === k).reduce((s, x) => s + (x.saldoEur || 0), 0) * 100) / 100 };
    }),
    tarif,
    soll: liste.filter((d) => d.zaehlpunkt).map((d) => ({ zaehlpunkt: d.zaehlpunkt.nummer, richtung: d.zaehlpunkt.richtung, teilnahmefaktor: d.teilnahme.teilnahmefaktor ?? 100, consentId: d.teilnahme.consentId || "", gueltigAb: d.teilnahme.gueltigAb || "", aufteilungsschluesselPct: d.teilnahme.aufteilungsschluesselPct })),
  };
}

// ---------------------------------------------------------------- Umstellungsplan, Kontrollabrechnung

const monatVon = (iso) => String(iso).slice(0, 7);
const ersterDesMonats = (iso, plusMonate = 0) => {
  const [j, m] = String(iso).slice(0, 7).split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1 + plusMonate, 1, 12));
  return d.toISOString().slice(0, 10);
};

/**
 * Umstellungsplan zum Stichtag (erster Abrechnungsmonat bei ÖkoInvest = Monat des Stichtags, Fachkonzept 2.6 Punkt 4).
 * @returns {{stichtag, letzteAltabrechnung, parallelVon, parallelBis, ersteAbrechnungAb, termine:{datum,schluessel,label,vergangen}[], warnungen:string[]}}
 */
export function umstellungsplan({ stichtag = "", heute = "" } = {}) {
  const w = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(stichtag))) return { stichtag: "", letzteAltabrechnung: "", parallelVon: "", parallelBis: "", ersteAbrechnungAb: "", termine: [], warnungen: ["Bitte einen Stichtag wählen (Monatserster)."] };
  let s = stichtag;
  if (s.slice(8, 10) !== "01") {
    s = ersterDesMonats(s, 1);
    w.push(`Der Stichtag ist immer ein Monatserster – verschoben auf ${s.split("-").reverse().join(".")}.`);
  }
  const vorlauf = heute ? tageBis(heute, s) : 99;
  if (vorlauf < 28) w.push(`Nur ${vorlauf} Tage bis zum Stichtag – empfohlen sind mindestens 8 Wochen (Mandat, EDA-Rolle, Mitgliederinformation, Parallellauf).`);
  const termine = WECHSEL_SCHRITTE.filter((x) => x.frist?.art === "stichtag").map((x) => {
    const d = plusTage(s, x.frist.tage);
    return { datum: d, schluessel: x.s, label: x.label, vergangen: heute ? d < heute : false };
  });
  const ersteAbrechnungAb = `${ersterDesMonats(s, 1).slice(0, 8)}20`;
  termine.push({ datum: ersteAbrechnungAb, schluessel: "erste_abrechnung", label: "Erste Abrechnung bei ÖkoInvest (frühestens am 20. des Folgemonats)", vergangen: false });
  termine.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  if (termine.some((x) => x.vergangen)) w.push("Einige Termine liegen bereits in der Vergangenheit – Stichtag später wählen oder Schritte sofort erledigen.");
  return { stichtag: s, letzteAltabrechnung: monatVon(ersterDesMonats(s, -1)), parallelVon: ersterDesMonats(s, -1), parallelBis: plusTage(s, -1), ersteAbrechnungAb, termine, warnungen: w };
}

/**
 * Probe-Periode für WP4 (abPeriodeAnlegen mit probe: true): Art nach Länge des Parallelzeitraums (Monat, Quartal, Jahr) –
 * WP4 kennt keine Art „probe“, Probe-Perioden sind normale Perioden mit probe = true (ohne Überlappungsprüfung, nie freigebbar).
 */
export function probePeriode({ von = "", bis = "" } = {}) {
  const v = String(von || "").slice(0, 10);
  const b = String(bis || "").slice(0, 10);
  const monate = /^\d{4}-\d{2}/.test(v) && /^\d{4}-\d{2}/.test(b) ? (Number(b.slice(0, 4)) - Number(v.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(v.slice(5, 7)) + 1 : 1;
  return { von: v, bis: b, art: monate <= 1 ? "monat" : monate <= 3 ? "quartal" : "jahr", probe: true };
}

/**
 * Belege der WP4-Probe-Abrechnung → Zeilen für kontrollVergleich: Schlüssel = Mitgliedsnummer (Rechnung) bzw.
 * „Mitgliedsnummer-G“ (Gutschrift), kWh = Eigendeckung bzw. eingebrachte Menge, Betrag = Netto des Belegs.
 * @param {{mitgliedsnummer:number, typ:string, empfaenger?:{name?:string}, energie?:object, summen?:{netto:number}}[]} belege
 */
export function probeKontrollwerte(belege = []) {
  return (Array.isArray(belege) ? belege : []).filter((b) => b && b.mitgliedsnummer !== undefined && b.mitgliedsnummer !== null && b.mitgliedsnummer !== "").map((b) => {
    const gut = b.typ === "gutschrift";
    return { schluessel: gut ? `${b.mitgliedsnummer}-G` : String(b.mitgliedsnummer), name: String(b.empfaenger?.name || ""), kwh: Number(gut ? b.energie?.eingebracht : b.energie?.eigendeckung) || 0, betragEur: Number(b.summen?.netto) || 0 };
  });
}

/**
 * Kontrollabrechnung: Werte der letzten Altabrechnung gegen die Probe-Abrechnung (WP4) bzw. eigene Rechnung vergleichen.
 * alt/neu: [{ schluessel, name?, kwh, betragEur }]
 */
export function kontrollVergleich(alt = [], neu = [], { toleranzEur = 0.05, toleranzKwh = 0.5 } = {}) {
  const A = new Map(alt.map((x) => [String(x.schluessel), x]));
  const N = new Map(neu.map((x) => [String(x.schluessel), x]));
  const keys = [...new Set([...A.keys(), ...N.keys()])].sort();
  const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
  const zeilen = keys.map((k) => {
    const a = A.get(k);
    const n = N.get(k);
    if (!a) return { schluessel: k, name: n.name || "", altKwh: null, neuKwh: r2(n.kwh), diffKwh: null, altEur: null, neuEur: r2(n.betragEur), diffEur: null, status: "nur_neu", erklaerung: "Nur in der neuen Abrechnung – z. B. Zählpunkt erst seit diesem Monat aktiv oder im Altsystem nicht abgerechnet." };
    if (!n) return { schluessel: k, name: a.name || "", altKwh: r2(a.kwh), neuKwh: null, diffKwh: null, altEur: r2(a.betragEur), neuEur: null, diffEur: null, status: "nur_alt", erklaerung: "Fehlt in der neuen Abrechnung – Zählpunkt im Import bzw. in der Zählpunktliste des Netzbetreibers prüfen." };
    const dk = r2((Number(n.kwh) || 0) - (Number(a.kwh) || 0));
    const de = r2((Number(n.betragEur) || 0) - (Number(a.betragEur) || 0));
    const gleich = Math.abs(dk) <= toleranzKwh && Math.abs(de) <= toleranzEur;
    const erkl = gleich ? "" : Math.abs(dk) > toleranzKwh ? "Energiemenge weicht ab – Ersatzwerte (L2/L3), Nachlieferungen des Netzbetreibers oder Teilnahmefaktor prüfen." : "Gleiche Energiemenge, anderer Betrag – Preis, Rundung, Gebühren oder Umsatzsteuer prüfen.";
    return { schluessel: k, name: n.name || a.name || "", altKwh: r2(a.kwh), neuKwh: r2(n.kwh), diffKwh: dk, altEur: r2(a.betragEur), neuEur: r2(n.betragEur), diffEur: de, status: gleich ? "gleich" : "abweichung", erklaerung: erkl };
  });
  const s = (st) => zeilen.filter((z) => z.status === st).length;
  return { zeilen, summe: { anzahl: zeilen.length, gleich: s("gleich"), abweichung: s("abweichung"), nurAlt: s("nur_alt"), nurNeu: s("nur_neu"), diffEur: r2(zeilen.reduce((x, z) => x + (z.diffEur || 0), 0)), diffKwh: r2(zeilen.reduce((x, z) => x + (z.diffKwh || 0), 0)) }, toleranz: { eur: toleranzEur, kwh: toleranzKwh } };
}

// ---------------------------------------------------------------- ElWG-Anpassungspaket (Bestand)

/**
 * Checkliste der ElWG-Anpassung für eine bestehende Gemeinschaft (Fachkonzept 2.6 Punkt 6; Koordinationsstelle
 * „Änderungen für bestehende Energiegemeinschaften“). Frist: Stichtag des Wechsels bzw. „sobald wie möglich“.
 * @param {object} g Gemeinschaft (mit kennzahlen)
 * @param {{mitglieder?:object[], dokumente?:object[], stichtag?:string}} k
 */
export function elwgAnpassung(g = {}, { mitglieder = [], dokumente = [], stichtag = "" } = {}) {
  const hat = (vorlage) => dokumente.some((d) => d.vorlage === vorlage && d.stand >= "2026-10-01");
  const lp = !!g.kennzahlen?.lieferantenpflichten;
  const p = [
    { id: "statuten", text: "Statuten auf §§ 65–72 ElWG umstellen (Verweise, Mehrfachteilnahme, Organisator, ggf. Online-Versammlung)", pflicht: EG_MODELLE[g.modell]?.rechtsperson === true, erfuellt: hat("statuten_verein") || hat("statuten_egen") || /elwg/i.test(String(g.statutenVersion || "")), vorlage: g.rechtsform === "egen" ? "statuten_egen" : "statuten_verein", quelle: "ElWG § 188, § 189 Abs. 17; Mustervorlagen Erneuerbare Energie Wien" },
    { id: "vertraege", text: "Teilnahme- und Erzeugerverträge anpassen und den Mitgliedern zur Zustimmung vorlegen (Nachtrag)", pflicht: true, erfuellt: hat("elwg_nachtrag") || (hat("teilnahmevertrag") && hat("erzeugervertrag")), vorlage: "elwg_nachtrag", quelle: "Koordinationsstelle: Verträge sollen angepasst werden" },
    { id: "lieferantenpflichten", text: `Lieferantenpflichten (§ 69 ElWG): AGB und Informationsblatt${lp ? "" : " – derzeit unter der Schwelle"}`, pflicht: lp, erfuellt: !lp || (hat("agb") && hat("informationsblatt")), vorlage: "agb", quelle: "ElWG § 69" },
    { id: "rhythmus", text: "Wahl zwischen Monats- und Jahresrechnung je Mitglied erfassen", pflicht: lp, erfuellt: !lp || mitglieder.every((m) => !["aktiv", "aufgenommen"].includes(m.status) || !!m.abrechnungsrhythmus), quelle: "ElWG § 69 Abs. 3" },
    { id: "organisator", text: "Organisator bestellen und dem Netzbetreiber anzeigen", pflicht: !!g.dienstleistung?.aktiv, erfuellt: !g.dienstleistung?.aktiv || !!g.organisatorAngezeigtAm, vorlage: "organisator_anzeige", quelle: "ElWG § 68 Abs. 2" },
    { id: "nahebereich", text: "Nahebereichs-ID und Zonelevel mit dem Netzbetreiber abstimmen (Betreibervertrag)", pflicht: ["eeg", "beg", "gea"].includes(g.modell), erfuellt: !!g.nahebereichRef && !!g.zonelevel, quelle: "HA II 7.1; ebUtilities-Konzept 04/2026 (zu bestätigen)" },
    { id: "datenschutz", text: "Datenschutzinformation aktualisieren (Organisator als Auftragsverarbeiter)", pflicht: true, erfuellt: hat("datenschutz"), vorlage: "datenschutz", quelle: "DSGVO Art. 13, 28" },
    { id: "kontrolle", text: "BEG: Kontrollklausel in den Statuten prüfen", pflicht: g.modell === "beg", erfuellt: g.modell !== "beg" || hat("statuten_verein") || hat("statuten_egen"), quelle: "ElWG § 67 Abs. 3" },
    { id: "grossunternehmen", text: "EEG: keine Großunternehmen unter den Mitgliedern", pflicht: g.modell === "eeg", erfuellt: g.modell !== "eeg" || !mitglieder.some((m) => m.art === "grossunternehmen" && ["aktiv", "aufgenommen", "gekuendigt"].includes(m.status)), quelle: "ElWG § 6 Abs. 1 Z 61; EAG § 79 Abs. 2" },
    { id: "kommunikation", text: "Mitglieder zur Netzentgelt-Übergangsregelung bis 31.12.2026 und zur neuen Verordnung ab 2027 informieren", pflicht: false, erfuellt: false, quelle: "Fachkonzept 0 Punkt 2; Marktanalyse 1.5 (Widerspruch zu bestätigen)" },
  ].map((x) => ({ ...x, frist: x.pflicht ? stichtag || "" : "", status: x.erfuellt ? "erfuellt" : x.pflicht ? "offen" : "empfohlen" }));
  return { punkte: p, offen: p.filter((x) => x.status === "offen").length, erfuellt: p.filter((x) => x.status === "erfuellt").length, stichtag };
}

/** Benachrichtigung der Mitglieder zum Wechsel (Portal/E-Mail) */
export function wechselNachricht({ name = "", stichtag = "", altdienstleister = "" } = {}) {
  const d = stichtag ? stichtag.split("-").reverse().join(".") : "";
  return {
    titel: `Ihre Energiegemeinschaft „${name}“: neue Betriebsführung${d ? ` ab ${d}` : ""}`,
    text: `Ab ${d || "dem Stichtag"} übernimmt die ÖkoInvest GmbH die Betriebsführung${altdienstleister ? ` (bisher ${altdienstleister})` : ""}. Ihre Zählpunkte bleiben angemeldet – Sie müssen beim Netzbetreiber nichts tun. Rechnungen und Gutschriften finden Sie künftig im Mitgliederportal.`,
  };
}

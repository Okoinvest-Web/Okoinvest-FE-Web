// src/lib/plattform/eg/buchhaltung.js
//
// Vereinsbuchhaltung der Energiegemeinschaft (WP4, Kür 9): Kontenplan, Buchungen nach dem Zuflussprinzip (Einnahmen-
// Ausgaben-Rechnung), Kassabuch, Vermögensübersicht, Vereinsgröße (VerG §§ 21, 22), UVA-Vorbereitung, Rechnungsprüfung
// (Prüfvermerk), Exporte für die Steuerberatung (BMD, RZL, DATEV über buchhaltung/export.js) und Jahresbescheinigung
// für Erzeuger (§ 3 Abs. 1 Z 39 EStG). Reine Funktionen; Python-Spiegel: plattform/eg_abrechnung_kern.py.
//
// Quellen: VerG 2002 § 21 (Rechnungswesen, Einnahmen-Ausgaben-Rechnung mit Vermögensübersicht, Rechnungsprüfung),
// § 22 (über 1 Mio. € Einnahmen oder Ausgaben in zwei Folgejahren: Jahresabschluss; über 3 Mio. €: erweiterter
// Abschluss); EStG § 19 (Zuflussprinzip); UStG § 21 (UVA monatlich, bis 100.000 € Vorjahresumsatz vierteljährlich);
// Formular U 30 (Kennzahlen (zu bestätigen)); EStG § 3 Abs. 1 Z 39 (12.500 kWh, 35 kWp, 25 kW). Keine Steuerberatung.

import { rund2 } from "../mitglied/basis.js";
import { bmdCsv, datevCsv, kontenPruefen } from "../buchhaltung/export.js";

/** Ordnung nach Codepunkten (gleiches Ergebnis in JS und Python) */
const vgl = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const EG_KONTEN = {
  "2700": { label: "Kassa", art: "geld" },
  "2800": { label: "Bank", art: "geld" },
  "2000": { label: "Forderungen Mitglieder", art: "bestand" },
  "3300": { label: "Verbindlichkeiten Erzeuger", art: "bestand" },
  "2500": { label: "Vorsteuer", art: "steuer" },
  "2510": { label: "Vorsteuer Reverse Charge (§ 19 Abs. 1c)", art: "steuer" },
  "3500": { label: "Umsatzsteuer", art: "steuer" },
  "3510": { label: "Umsatzsteuer Reverse Charge (§ 19 Abs. 1c)", art: "steuer" },
  "4000": { label: "Erlöse Stromlieferung an Mitglieder", art: "einnahme" },
  "4010": { label: "Erlöse Gebühren (Grund-, Zählpunkt-, Beitrittsgebühr)", art: "einnahme" },
  "4800": { label: "Mitgliedsbeiträge", art: "einnahme" },
  "4890": { label: "Sonstige Einnahmen (Förderungen, Zinsen, Spenden)", art: "einnahme" },
  "5000": { label: "Stromeinkauf Erzeuger (Gutschriften)", art: "ausgabe" },
  "7300": { label: "Plattform, Dienstleistung, Organisator", art: "ausgabe" },
  "7600": { label: "Verwaltung (Porto, Büro, Versicherung)", art: "ausgabe" },
  "7700": { label: "Bankspesen", art: "ausgabe" },
  "7800": { label: "Steuerberatung, Rechtsberatung", art: "ausgabe" },
  "7890": { label: "Sonstige Ausgaben", art: "ausgabe" },
  "9000": { label: "Durchlaufende Posten / Umbuchung", art: "neutral" },
};
export const BUCHUNG_KATEGORIEN = Object.fromEntries(Object.entries(EG_KONTEN).filter(([, k]) => ["einnahme", "ausgabe"].includes(k.art)).map(([nr, k]) => [nr, k.label]));
export const VEREIN_SCHWELLEN = { jahresabschluss: 1000000, erweitert: 3000000 };
export const UVA_VIERTELJAEHRLICH_BIS = 100000;
export const ESTG_PV = { kwh: 12500, kwp: 35, kw: 25, quelle: "§ 3 Abs. 1 Z 39 EStG 1988 (Einspeisung natürlicher Personen; gilt auch bei Lieferung an Energiegemeinschaften, BMF)" };

/** Erlöskonto je Positionsart */
export const kontoFuerPosition = (art) => (art === "einspeisung" ? "5000" : art === "mitgliedsbeitrag" ? "4800" : art === "bezug" ? "4000" : "4010");

/**
 * Buchungen zu einer Zahlung auf einen Beleg (Zuflussprinzip): Aufteilung des Zahlbetrags anteilig auf die
 * Erlös-/Aufwandskonten und die Steuer des Belegs. Rückgabe neutraler Buchungszeilen.
 * @param {object} b Beleg  @param {{betrag:number, datum:string, art:string, id?:string}} z Zahlung (Betrag positiv)
 */
export function buchungenAusZahlung(b, z, { geldkonto = "2800" } = {}) {
  const brutto = Math.abs(Number(b.summen?.brutto) || 0);
  if (!(brutto > 0)) return [];
  const anteil = Math.min(1, (Number(z.betrag) || 0) / brutto);
  const vorzeichen = b.typ === "storno" ? -1 : 1;
  const ausgabe = (b.typ === "storno" ? b.ursprungTyp : b.typ) === "gutschrift";
  const jeKonto = {};
  for (const p of b.positionen || []) {
    const k = kontoFuerPosition(p.art);
    jeKonto[k] = (jeKonto[k] || 0) + Math.abs(Number(p.netto) || 0);
  }
  const basis = { datum: z.datum, belegId: b.id || null, belegNr: b.nummer, zahlungId: z.id || null, geldkonto, quelle: "zahlung", mitgliedId: b.mitgliedId };
  const zeilen = Object.entries(jeKonto).sort(([a], [c]) => vgl(a, c)).map(([konto, netto]) => ({ ...basis, konto, kategorie: ausgabe ? "ausgabe" : "einnahme", text: `${ausgabe ? "Gutschrift" : "Rechnung"} ${b.nummer} – ${EG_KONTEN[konto].label}`, betrag: rund2(vorzeichen * netto * anteil), ust: 0, ustArt: "" }));
  for (const s of b.summen?.zeilen || []) {
    if (s.art === "ust" && s.betrag) zeilen.push({ ...basis, konto: ausgabe ? "2500" : "3500", kategorie: ausgabe ? "ausgabe" : "einnahme", text: `${ausgabe ? "Vorsteuer" : "Umsatzsteuer"} ${s.satz} % ${b.nummer}`, betrag: rund2(vorzeichen * Math.abs(s.betrag) * anteil), ust: rund2(vorzeichen * Math.abs(s.betrag) * anteil), ustArt: `ust${s.satz}` });
  }
  // Rundungsdifferenz auf die erste Zeile
  const soll = rund2(vorzeichen * (Number(z.betrag) || 0));
  const ist = rund2(zeilen.reduce((x, y) => x + y.betrag, 0));
  if (zeilen.length && Math.abs(soll - ist) >= 0.01 && Math.abs(soll - ist) < 0.05) zeilen[0].betrag = rund2(zeilen[0].betrag + soll - ist);
  return zeilen;
}

/** Buchung (manuell bzw. Kassa) prüfen; wirft Error */
export function buchungBereinigen(d = {}) {
  const datum = String(d.datum || "").slice(0, 10);
  if (!/^\d\d\d\d-\d\d-\d\d$/.test(datum)) throw new Error("Bitte ein Buchungsdatum angeben.");
  const konto = String(d.konto || "");
  if (!BUCHUNG_KATEGORIEN[konto]) throw new Error("Bitte ein Einnahmen- oder Ausgabenkonto wählen.");
  const betrag = rund2(Number(String(d.betrag ?? "").replace(",", ".")));
  if (!Number.isFinite(betrag) || betrag <= 0 || betrag > 1000000) throw new Error("Bitte einen Betrag über 0 € angeben.");
  const ustSatz = [0, 10, 13, 20].includes(Number(d.ustSatz)) ? Number(d.ustSatz) : 0;
  const text = String(d.text || "").replace(/\s+/g, " ").trim().slice(0, 140);
  if (!text) throw new Error("Bitte einen Buchungstext angeben.");
  const geldkonto = d.geldkonto === "2700" ? "2700" : "2800";
  const belegNr = String(d.belegNr || "").trim().slice(0, 40);
  if (!belegNr) throw new Error("Bitte die Belegnummer bzw. Quittung angeben (Belegprinzip).");
  const ust = ustSatz ? rund2(betrag - betrag / (1 + ustSatz / 100)) : 0;
  return { datum, konto, kategorie: EG_KONTEN[konto].art, betrag, ust, ustArt: ustSatz ? `ust${ustSatz}` : "", text, geldkonto, belegNr, quelle: geldkonto === "2700" ? "kassa" : "manuell" };
}

/** Kassabuch: chronologisch, laufende Nummer, Saldo; Kassastand darf nie negativ sein */
export function kassabuch(buchungen = [], { anfangsbestand = 0 } = {}) {
  let saldo = rund2(anfangsbestand);
  const fehler = [];
  const zeilen = buchungen.filter((b) => b.geldkonto === "2700").sort((a, b) => vgl(a.datum, b.datum) || vgl(String(a.id || ""), String(b.id || ""))).map((b, i) => {
    const ein = b.kategorie === "einnahme" ? b.betrag : 0;
    const aus = b.kategorie === "ausgabe" ? b.betrag : 0;
    saldo = rund2(saldo + ein - aus);
    if (saldo < 0) fehler.push(`Kassastand negativ am ${b.datum} (lfd. Nr. ${i + 1}) – Buchung fehlt oder Datum falsch.`);
    return { nr: i + 1, datum: b.datum, belegNr: b.belegNr, text: b.text, einnahme: rund2(ein), ausgabe: rund2(aus), saldo };
  });
  return { zeilen, endbestand: saldo, fehler };
}

/**
 * Einnahmen-Ausgaben-Rechnung eines Jahres mit Vermögensübersicht (VerG § 21).
 * @param {object[]} buchungen  @param {{bank:number, kassa:number}} anfang Anfangsbestände
 */
export function eaRechnung(buchungen = [], jahr, { anfang = { bank: 0, kassa: 0 }, offeneForderungen = 0, offeneVerbindlichkeiten = 0, vorjahrEinnahmen = null } = {}) {
  const imJahr = buchungen.filter((b) => String(b.datum).slice(0, 4) === String(jahr));
  const summeJe = (kat) => {
    const je = {};
    for (const b of imJahr.filter((x) => x.kategorie === kat)) je[b.konto] = rund2((je[b.konto] || 0) + b.betrag);
    return Object.entries(je).sort(([a], [b]) => vgl(a, b)).map(([konto, betrag]) => ({ konto, label: EG_KONTEN[konto]?.label || konto, betrag }));
  };
  const einnahmen = summeJe("einnahme");
  const ausgaben = summeJe("ausgabe");
  const summeE = rund2(einnahmen.reduce((s, x) => s + x.betrag, 0));
  const summeA = rund2(ausgaben.reduce((s, x) => s + x.betrag, 0));
  const geld = (konto) => rund2(imJahr.filter((b) => b.geldkonto === konto).reduce((s, b) => s + (b.kategorie === "einnahme" ? b.betrag : b.kategorie === "ausgabe" ? -b.betrag : 0), 0));
  const bankEnde = rund2((Number(anfang.bank) || 0) + geld("2800"));
  const kassaEnde = rund2((Number(anfang.kassa) || 0) + geld("2700"));
  const gross = Math.max(summeE, summeA);
  let vereinsgroesse = "klein";
  let vereinsText = "Einnahmen-Ausgaben-Rechnung mit Vermögensübersicht genügt (VerG § 21).";
  if (gross > VEREIN_SCHWELLEN.erweitert) {
    vereinsgroesse = "gross";
    vereinsText = "Über 3 Mio. €: erweiterter Jahresabschluss und Abschlussprüfung, wenn auch im Vorjahr überschritten (VerG § 22 Abs. 2) (zu bestätigen).";
  } else if (gross > VEREIN_SCHWELLEN.jahresabschluss) {
    vereinsgroesse = "mittel";
    vereinsText = vorjahrEinnahmen !== null && Number(vorjahrEinnahmen) > VEREIN_SCHWELLEN.jahresabschluss ? "Zwei Jahre über 1 Mio. €: ab dem folgenden Jahr Jahresabschluss (Bilanz, GuV) nach VerG § 22 Abs. 1." : "Über 1 Mio. € Einnahmen bzw. Ausgaben: Folgt ein zweites Jahr, ist ein Jahresabschluss nach VerG § 22 Abs. 1 nötig.";
  }
  return {
    jahr: Number(jahr), einnahmen, ausgaben, summeEinnahmen: summeE, summeAusgaben: summeA, ergebnis: rund2(summeE - summeA),
    vermoegen: { bankAnfang: rund2(anfang.bank || 0), kassaAnfang: rund2(anfang.kassa || 0), bankEnde, kassaEnde, geldEnde: rund2(bankEnde + kassaEnde), offeneForderungen: rund2(offeneForderungen), offeneVerbindlichkeiten: rund2(offeneVerbindlichkeiten), reinvermoegen: rund2(bankEnde + kassaEnde + Number(offeneForderungen) - Number(offeneVerbindlichkeiten)) },
    vereinsgroesse, vereinsText, anzahlBuchungen: imJahr.length,
    quelle: "VerG 2002 §§ 21, 22",
  };
}

/**
 * UVA-Vorbereitung (Sollbesteuerung nach Belegdatum (zu bestätigen)) – Kennzahlen U 30 (zu bestätigen).
 * @param {object[]} belege finale Belege (Rechnungen, Gutschriften, Stornos) im Zeitraum
 */
export function uvaVorbereitung(belege = [], { von, bis, ustStatus = "kleinunternehmer" } = {}) {
  const im = belege.filter((b) => b.nummer && b.datum >= von && b.datum <= bis && b.status !== "entwurf");
  let kz000 = 0;
  let kz022 = 0;
  let kz016 = 0;
  let rcBasis = 0;
  let vst13 = 0;
  for (const b of im) {
    const typ = b.typ === "storno" ? b.ursprungTyp : b.typ;
    for (const z of b.summen?.zeilen || []) {
      if (typ === "rechnung") {
        if (z.art === "ust" && z.satz === 20) kz022 += z.basis;
        if (z.art === "befreit") kz016 += z.basis;
        if (z.art !== "nicht_steuerbar") kz000 += z.basis;
      } else if (typ === "gutschrift") {
        if (z.art === "rc") rcBasis += z.basis;
        if (z.art === "ust" && z.satz === 13) vst13 += z.betrag;
      }
    }
  }
  const regel = ustStatus === "regelbesteuert";
  const ust20 = rund2(kz022 * 0.2);
  const rcSteuer = rund2(rcBasis * 0.2);
  const vorsteuer = regel ? rund2(vst13) : 0;
  const vorsteuerRc = regel ? rcSteuer : 0;
  const zahllast = rund2(ust20 + rcSteuer - vorsteuer - vorsteuerRc);
  return {
    von, bis, ustStatus,
    kennzahlen: [
      { kz: "000", label: "Gesamtbetrag der Bemessungsgrundlagen (Lieferungen, sonstige Leistungen)", betrag: rund2(kz000) },
      { kz: "016", label: "davon steuerfrei ohne Vorsteuerabzug – Kleinunternehmer § 6 Abs. 1 Z 27", betrag: rund2(kz016) },
      { kz: "022", label: "davon 20 % Normalsteuersatz (Bemessungsgrundlage)", betrag: rund2(kz022), steuer: ust20 },
      { kz: "057", label: "Steuerschuld gemäß § 19 Abs. 1c (Strom an Wiederverkäufer) – Bemessungsgrundlage", betrag: rund2(rcBasis), steuer: rcSteuer },
      { kz: "060", label: "Gesamtbetrag der Vorsteuern (u. a. 13 % pauschalierte Landwirte)", betrag: vorsteuer },
      { kz: "066", label: "Vorsteuern betreffend die Steuerschuld gemäß § 19 Abs. 1c", betrag: vorsteuerRc },
    ],
    zahllast,
    hinweis: regel ? "Regelbesteuert: UVA monatlich, bei Vorjahresumsatz bis 100.000 € vierteljährlich (§ 21 UStG)." : "Kleinunternehmer: keine Vorsteuer; die Steuerschuld aus Reverse Charge ist trotzdem zu erklären und abzuführen (Fachkonzept 4.5) (zu bestätigen).",
    quelle: "Formular U 30 – Kennzahlen (zu bestätigen); UStG §§ 19, 21",
  };
}

/** Rechnungsprüfung: Prüfvermerk validieren (VerG § 21 Abs. 2–5) */
export function pruefvermerkBereinigen(d = {}) {
  const ergebnis = ["ohne_beanstandung", "mit_hinweisen", "beanstandet"].includes(d.ergebnis) ? d.ergebnis : "";
  if (!ergebnis) throw new Error("Bitte das Prüfergebnis wählen.");
  const text = String(d.text || "").trim().slice(0, 4000);
  if (ergebnis !== "ohne_beanstandung" && text.length < 10) throw new Error("Bitte Hinweise bzw. Beanstandungen beschreiben.");
  const stichproben = (Array.isArray(d.stichproben) ? d.stichproben : []).map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 200);
  return { ergebnis, text, stichproben, jahr: Number(d.jahr) || null };
}

export const EXPORT_ARTEN = { bmd: "BMD NTCS (CSV)", rzl: "RZL (CSV) (Feldbelegung zu bestätigen)", datev: "DATEV-Buchungsstapel (CSV)", ea: "Einnahmen-Ausgaben-Rechnung (CSV)", kassabuch: "Kassabuch (CSV)", belegjournal: "Belegjournal (CSV)" };

const csvFeld = (v) => {
  let s = v === null || v === undefined ? "" : typeof v === "number" ? rund2(v).toFixed(2).replace(".", ",") : String(v);
  if (typeof v !== "number" && /^(=|\+|-|@|\t|\r)/.test(s)) s = `'${s}`;
  return /;|"|\n|\r/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvAus = (kopf, zeilen) => "﻿" + [kopf.join(";"), ...zeilen.map((z) => z.map(csvFeld).join(";"))].join("\r\n") + "\r\n";

/** Neutrale Buchungen in Zeilen für buchhaltung/export.js (soll/haben) */
function exportZeilen(buchungen) {
  return buchungen.filter((b) => b.kategorie === "einnahme" || b.kategorie === "ausgabe").map((b) => {
    const ein = b.kategorie === "einnahme";
    const betrag = Math.abs(b.betrag);
    const storno = b.betrag < 0;
    const [soll, haben] = ein !== storno ? [b.geldkonto, b.konto] : [b.konto, b.geldkonto];
    return { datum: b.datum, beleg: b.belegNr, text: b.text, betrag, soll, haben, steuerVorlage: b.ustArt || "", steuerBetrag: Math.abs(b.ust || 0), steuerSatz: b.ustArt ? Number(b.ustArt.slice(3)) / 100 : 0, typ: ein ? "rechnung" : "gutschrift" };
  });
}

/**
 * Export erzeugen → { dateiname, inhalt, mime }.
 * @param {"bmd"|"rzl"|"datev"|"ea"|"kassabuch"|"belegjournal"} art
 */
export function exportErzeugen(art, { buchungen = [], belege = [], jahr, gemeinschaft = {}, konten = {}, ea = null, kassa = null, erzeugtAm = "" } = {}) {
  const kurz = String(gemeinschaft.kurzname || gemeinschaft.name || "EG").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 30);
  const imJahr = buchungen.filter((b) => String(b.datum).slice(0, 4) === String(jahr)).sort((a, b) => vgl(a.datum, b.datum));
  const name = (x, endung = "csv") => `${kurz}_${x}_${jahr}.${endung}`;
  if (art === "datev") {
    const k = kontenPruefen(konten);
    return { dateiname: name("DATEV"), inhalt: datevCsv(exportZeilen(imJahr), k, { von: `${jahr}-01-01`, bis: `${jahr}-12-31`, erzeugtAm: erzeugtAm || `${jahr}-12-31T00:00:00.000Z` }), mime: "text/csv; charset=windows-1252" };
  }
  if (art === "bmd") {
    const k = kontenPruefen(konten);
    return { dateiname: name("BMD"), inhalt: bmdCsv(exportZeilen(imJahr), k), mime: "text/csv; charset=utf-8" };
  }
  if (art === "rzl") {
    const zeilen = exportZeilen(imJahr).map((z) => [z.datum.split("-").reverse().join("."), z.beleg, z.soll, z.haben, z.betrag, z.steuerSatz ? String(Math.round(z.steuerSatz * 100)) : "", z.steuerBetrag || "", z.text]);
    return { dateiname: name("RZL"), inhalt: csvAus(["Belegdatum", "Belegnummer", "Konto", "Gegenkonto", "Betrag", "Steuerprozent", "Steuerbetrag", "Buchungstext"], zeilen), mime: "text/csv; charset=utf-8" };
  }
  if (art === "kassabuch") {
    const k = kassa || kassabuch(imJahr);
    return { dateiname: name("Kassabuch"), inhalt: csvAus(["Lfd. Nr.", "Datum", "Beleg", "Text", "Einnahme", "Ausgabe", "Kassastand"], k.zeilen.map((z) => [String(z.nr), z.datum, z.belegNr, z.text, z.einnahme, z.ausgabe, z.saldo])), mime: "text/csv; charset=utf-8" };
  }
  if (art === "belegjournal") {
    const liste = belege.filter((b) => b.nummer && String(b.datum).slice(0, 4) === String(jahr)).sort((a, b) => vgl(a.nummer, b.nummer));
    return { dateiname: name("Belegjournal"), inhalt: csvAus(["Nummer", "Typ", "Datum", "Mitgliedsnr.", "Empfänger", "Zeitraum", "Netto", "USt", "Brutto", "RC-Steuer", "Status", "Prüfsumme"], liste.map((b) => [b.nummer, b.typ, b.datum, String(b.mitgliedsnummer ?? ""), b.empfaenger?.name || "", `${b.von} bis ${b.bis}`, b.summen.netto, b.summen.ust, b.summen.brutto, b.summen.rcSteuer || 0, b.status, (b.hash || "").slice(0, 16)])), mime: "text/csv; charset=utf-8" };
  }
  const e = ea || eaRechnung(buchungen, jahr);
  const zeilen = [
    ...e.einnahmen.map((x) => ["Einnahme", x.konto, x.label, x.betrag]),
    ["Summe Einnahmen", "", "", e.summeEinnahmen],
    ...e.ausgaben.map((x) => ["Ausgabe", x.konto, x.label, x.betrag]),
    ["Summe Ausgaben", "", "", e.summeAusgaben],
    ["Ergebnis (Überschuss/Fehlbetrag)", "", "", e.ergebnis],
    ["Vermögen: Bank zum Jahresende", "2800", "", e.vermoegen.bankEnde],
    ["Vermögen: Kassa zum Jahresende", "2700", "", e.vermoegen.kassaEnde],
    ["Offene Forderungen", "2000", "", e.vermoegen.offeneForderungen],
    ["Offene Verbindlichkeiten", "3300", "", e.vermoegen.offeneVerbindlichkeiten],
  ];
  return { dateiname: name("Einnahmen-Ausgaben"), inhalt: csvAus(["Art", "Konto", "Bezeichnung", "Betrag"], zeilen), mime: "text/csv; charset=utf-8" };
}

/**
 * Jahresbescheinigung für einen Erzeuger (kWh und € je Jahr) mit Hinweis zur Einkommensteuerbefreiung.
 * @param {object[]} gutschriften finale Gutschriften und deren Stornos des Mitglieds
 */
export function jahresbescheinigung(gutschriften = [], { jahr, mitglied = {}, anlagenKwp = 0, anschlussKw = null, mengenOhneEntgelt = 0 } = {}) {
  const im = gutschriften.filter((b) => String(b.bis).slice(0, 4) === String(jahr) && b.nummer && b.status !== "entwurf");
  const kwh = Math.round((im.reduce((s, b) => s + (b.typ === "storno" ? -1 : 1) * (b.positionen || []).filter((p) => p.art === "einspeisung").reduce((x, p) => x + (Number(p.mengeRoh ?? p.menge) || 0), 0), 0) + Number(mengenOhneEntgelt)) * 1000) / 1000;
  const netto = rund2(im.reduce((s, b) => s + b.summen.netto, 0));
  const ust = rund2(im.reduce((s, b) => s + b.summen.ust, 0));
  const natuerlich = ["privat", "landwirt"].includes(mitglied.art);
  const befreitMoeglich = natuerlich && kwh <= ESTG_PV.kwh && Number(anlagenKwp) <= ESTG_PV.kwp && (anschlussKw === null || Number(anschlussKw) <= ESTG_PV.kw);
  return {
    jahr: Number(jahr), kwh, netto, ust, brutto: rund2(netto + ust), belege: im.map((b) => b.nummer),
    estg: { befreitMoeglich, text: natuerlich ? (befreitMoeglich ? "Einkünfte aus der Einspeisung bis 12.500 kWh sind bei Anlagen bis 35 kWp und 25 kW Anschlussleistung in der Regel einkommensteuerfrei (§ 3 Abs. 1 Z 39 EStG)." : "Die Grenzen des § 3 Abs. 1 Z 39 EStG (12.500 kWh, 35 kWp, 25 kW) sind überschritten – Einkünfte sind zu erklären.") : "Für Unternehmen und Gemeinden gilt die Befreiung nach § 3 Abs. 1 Z 39 EStG nicht.", quelle: ESTG_PV.quelle },
    hinweis: "Diese Bescheinigung ersetzt keine Steuerberatung.",
  };
}

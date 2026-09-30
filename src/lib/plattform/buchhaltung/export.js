// src/lib/plattform/buchhaltung/export.js
//
// Buchungsexport an die Steuerberatung – reine Funktionen:
//   DATEV   Buchungsstapel im DATEV-Format (EXTF, Formatkategorie 21), Semikolon, Dezimalkomma, Belegdatum TTMM
//   BMD     Buchungsimport BMD NTCS (CSV, Semikolon): satzart;konto;gkonto;belegnr;belegdat;buchsymbol;buchcode;prozent;steuercode;betrag;steuer;text
//   OP      Offene-Posten-Liste (Excel-CSV)
//
// WICHTIG: Kontenrahmen, Personenkonten, BU-/Steuerschlüssel und Buchungssymbole sind KONFIGURIERBAR und nur als
// Beispiel vorbelegt (DE: SKR03-übliche Nummern, AT: EKR-übliche Nummern). Vor dem ersten Echtimport mit der
// Steuerberatung abstimmen und einen Testimport durchführen (Feldumfang je DATEV-/BMD-Version prüfen).
// Mit ERPNext kommen die Buchungen aus dem Hauptbuch; dieser Export dient dem Eigenbetrieb ohne ERPNext.

import { rund2 } from "../finanzen/basis.js";

export const EXPORT_FORMATE = { datev: "DATEV-Buchungsstapel (CSV)", bmd: "BMD NTCS Buchungsimport (CSV)", op: "Offene-Posten-Liste (CSV)" };

export const KONTEN_STANDARD = Object.freeze({
  datev: {
    beraternummer: "", mandantennummer: "", sachkontenlaenge: 4, wjBeginn: "01-01",
    debitor: "10000", kreditor: "70000", bank: "1200",
    erloes: { provision: "8400", contracting: "8400", provision_rc: "8338", contracting_rc: "8337" },
    aufwand: { pacht: "4210" },
    buSchluessel: {}, // Steuervorlage → BU-Schlüssel (z. B. „DE-USt-19“: "3") – mit Steuerberatung festlegen
  },
  bmd: {
    debitor: "200000", kreditor: "330000", bank: "2800",
    erloes: { provision: "4000", contracting: "4000", provision_rc: "4030", contracting_rc: "4030" },
    aufwand: { pacht: "7400" },
    buchsymbol: { rechnung: "AR", gutschrift: "ER", storno: "AR", zahlung: "BK" },
    steuercode: {}, // Steuervorlage → BMD-Steuercode (z. B. „AT-USt-20“: "1") – mit Steuerberatung festlegen
  },
});

/** Kontenzuordnung zusammenführen (nur bekannte Schlüssel, Werte als Ziffernfolgen) */
export function kontenPruefen(k = {}) {
  const z = (x, std) => (/^[0-9]{1,9}$/.test(String(x ?? "").trim()) ? String(x).trim() : std);
  const t = (x, std) => (/^[0-9A-Za-z]{0,6}$/.test(String(x ?? "").trim()) ? String(x ?? "").trim() : std);
  const map = (o = {}, std = {}) => Object.fromEntries(Object.keys(std).map((key) => [key, z(o?.[key], std[key])]));
  const frei = (o = {}) => Object.fromEntries(Object.entries(o || {}).filter(([a, b]) => /^[A-Za-z0-9-]{2,40}$/.test(a) && /^[0-9A-Za-z]{1,6}$/.test(String(b))).slice(0, 40).map(([a, b]) => [a, String(b)]));
  const D = KONTEN_STANDARD.datev;
  const B = KONTEN_STANDARD.bmd;
  const d = k.datev || {};
  const b = k.bmd || {};
  return {
    datev: {
      beraternummer: /^\d{4,7}$/.test(String(d.beraternummer || "")) ? String(d.beraternummer) : "",
      mandantennummer: /^\d{1,5}$/.test(String(d.mandantennummer || "")) ? String(d.mandantennummer) : "",
      sachkontenlaenge: [4, 5, 6, 7, 8].includes(Number(d.sachkontenlaenge)) ? Number(d.sachkontenlaenge) : D.sachkontenlaenge,
      wjBeginn: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(d.wjBeginn || "")) ? d.wjBeginn : D.wjBeginn,
      debitor: z(d.debitor, D.debitor), kreditor: z(d.kreditor, D.kreditor), bank: z(d.bank, D.bank),
      erloes: map(d.erloes, D.erloes), aufwand: map(d.aufwand, D.aufwand), buSchluessel: frei(d.buSchluessel),
    },
    bmd: {
      debitor: z(b.debitor, B.debitor), kreditor: z(b.kreditor, B.kreditor), bank: z(b.bank, B.bank),
      erloes: map(b.erloes, B.erloes), aufwand: map(b.aufwand, B.aufwand),
      buchsymbol: Object.fromEntries(Object.keys(B.buchsymbol).map((key) => [key, t(b.buchsymbol?.[key], B.buchsymbol[key]) || B.buchsymbol[key]])),
      steuercode: frei(b.steuercode),
    },
  };
}

const zahlKomma = (x) => rund2(Math.abs(Number(x) || 0)).toFixed(2).replace(".", ",");
const feld = (s) => `"${String(s ?? "").replace(/"/g, '""').replace(/[\r\n;]+/g, " ").slice(0, 60)}"`;
const ttmm = (iso) => `${String(iso).slice(8, 10)}${String(iso).slice(5, 7)}`;
const ohneBindestrich = (iso) => String(iso || "").replace(/-/g, "");

/**
 * Buchungszeilen (neutral) aus Belegen, Stornos und Zahlungen eines Zeitraums.
 * posten: [{ typ: rechnung|gutschrift|storno|zahlung, datum, nummer, art, brutto, netto, steuerBetrag, steuerVorlage, steuerArt, steuerSatz, text, richtung? }]
 * Rückgabe: [{ datum, beleg, text, betrag, soll: {art, konto}, haben: {art, konto}, steuerVorlage, steuerBetrag, steuerSatz, typ }]
 */
export function buchungen(posten, konten, format = "datev") {
  const k = konten[format];
  const rc = (p) => p.steuerArt === "reverse_charge" || p.steuerArt === "nicht_steuerbar";
  const erloes = (p) => k.erloes[`${p.art}${rc(p) ? "_rc" : ""}`] || k.erloes[p.art] || k.erloes.provision;
  const aus = [];
  for (const p of posten) {
    const basis = { datum: p.datum, beleg: p.nummer, text: String(p.text || "").slice(0, 60), steuerVorlage: p.steuerVorlage || "", steuerBetrag: rund2(p.steuerBetrag || 0), steuerSatz: Number(p.steuerSatz || 0), typ: p.typ };
    if (p.typ === "rechnung") aus.push({ ...basis, betrag: rund2(p.brutto), soll: k.debitor, haben: erloes(p) });
    else if (p.typ === "gutschrift") aus.push({ ...basis, betrag: rund2(p.brutto), soll: k.aufwand.pacht, haben: k.kreditor });
    else if (p.typ === "storno") {
      // Storno kehrt die Ursprungsbuchung um (Rechnung: Erlös an Debitor; Gutschrift: Kreditor an Aufwand)
      if (p.ursprung === "gutschrift") aus.push({ ...basis, betrag: rund2(Math.abs(p.brutto)), soll: k.kreditor, haben: k.aufwand.pacht });
      else aus.push({ ...basis, betrag: rund2(Math.abs(p.brutto)), soll: erloes(p), haben: k.debitor });
    } else if (p.typ === "zahlung") {
      if (p.richtung === "ausgang") aus.push({ ...basis, steuerVorlage: "", steuerBetrag: 0, betrag: rund2(p.brutto), soll: k.kreditor, haben: k.bank });
      else aus.push({ ...basis, steuerVorlage: "", steuerBetrag: 0, betrag: rund2(p.brutto), soll: k.bank, haben: k.debitor });
    }
  }
  return aus.filter((b) => b.betrag > 0).sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.beleg).localeCompare(String(b.beleg)));
}

/** DATEV-Buchungsstapel (Text; Zeichensatz beim Download Windows-1252/ISO-8859-1) */
export function datevCsv(zeilen, konten, { von, bis, erzeugtAm = new Date().toISOString(), bezeichnung = "OekoInvest Plattform" } = {}) {
  const d = konten.datev;
  const jahr = String(von || "").slice(0, 4) || String(erzeugtAm).slice(0, 4);
  const wj = `${jahr}${d.wjBeginn.replace("-", "")}`;
  const zeit = String(erzeugtAm).replace(/[:.TZ-]/g, "") /* Reihenfolge der Zeichenklasse bewusst: Bindestrich am Anfang plus Doppelpunkt hielt der Tailwind-Scan für eine CSS-Klasse */.slice(0, 17).padEnd(17, "0");
  const kopf = [
    '"EXTF"', 700, 21, '"Buchungsstapel"', 13, zeit, "", '"RE"', '"OekoInvest"', '""', d.beraternummer || "", d.mandantennummer || "", wj, d.sachkontenlaenge,
    ohneBindestrich(von), ohneBindestrich(bis), feld(bezeichnung), '""', 1, 0, 0, '"EUR"', "", '""', "", "", '""', '""',
  ].join(";");
  const spalten = ['"Umsatz (ohne Soll/Haben-Kz)"', '"Soll/Haben-Kennzeichen"', '"WKZ Umsatz"', '"Kurs"', '"Basis-Umsatz"', '"WKZ Basis-Umsatz"', '"Konto"', '"Gegenkonto (ohne BU-Schlüssel)"', '"BU-Schlüssel"', '"Belegdatum"', '"Belegfeld 1"', '"Belegfeld 2"', '"Skonto"', '"Buchungstext"'].join(";");
  const koerper = zeilen.map((z) => [zahlKomma(z.betrag), '"S"', '"EUR"', "", "", "", z.soll, z.haben, feld(d.buSchluessel[z.steuerVorlage] || ""), ttmm(z.datum), feld(String(z.beleg).replace(/[^A-Za-z0-9$&%*+\-/]/g, "").slice(0, 36)), '""', "", feld(z.text)].join(";"));
  return [kopf, spalten, ...koerper].join("\r\n") + "\r\n";
}

/** BMD-Buchungsimport (CSV, UTF-8 mit BOM) */
export function bmdCsv(zeilen, konten) {
  const b = konten.bmd;
  const kopf = "satzart;konto;gkonto;belegnr;belegdat;buchsymbol;buchcode;prozent;steuercode;betrag;steuer;text";
  const datum = (iso) => `${String(iso).slice(8, 10)}.${String(iso).slice(5, 7)}.${String(iso).slice(0, 4)}`;
  const text = (s) => String(s || "").replace(/[;\r\n"]+/g, " ").slice(0, 60);
  const symbol = (z) => b.buchsymbol[z.typ] || b.buchsymbol.rechnung;
  const koerper = zeilen.map((z) => [0, z.soll, z.haben, text(z.beleg), datum(z.datum), symbol(z), 1, z.steuerSatz ? String(rund2(z.steuerSatz * 100)).replace(".", ",") : "", b.steuercode[z.steuerVorlage] || "", zahlKomma(z.betrag), z.steuerBetrag ? zahlKomma(z.steuerBetrag) : "", text(z.text)].join(";"));
  return "﻿" + [kopf, ...koerper].join("\r\n") + "\r\n";
}

/** Offene-Posten-Liste als Excel-CSV (UTF-8 mit BOM, Formel-Schutz) */
export function opCsv(liste) {
  const w = (v) => {
    let s = v === null || v === undefined ? "" : typeof v === "number" ? String(rund2(v)).replace(".", ",") : String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const kopf = ["Beleg", "Art", "Empfänger", "Gesellschaft", "Rechnungsdatum", "Fällig am", "Tage überfällig", "Altersklasse", "Brutto", "Gezahlt", "Offen", "Mahnstufe", "Mahnkosten", "Status"];
  const zeilen = liste.map((o) => [o.nummer, o.artLabel, o.empfaenger, o.gesellschaft, o.rechnungsdatum, o.faelligAm, o.tageUeberfaellig, o.altersklasseLabel, o.brutto, o.gezahlt, o.offen, o.mahnstufe || "", o.mahnkosten, o.statusLabel].map(w).join(";"));
  return "﻿" + [kopf.join(";"), ...zeilen].join("\r\n") + "\r\n";
}

/** Zeichenkette für den DATEV-Download in ISO-8859-1 wandeln (Zeichen außerhalb → Ersatz) */
export function latin1(text) {
  return String(text).replace(/€/g, "EUR").replace(/[„“”]/g, '"').replace(/[‚‘’]/g, "'").replace(/[–—]/g, "-").replace(/[^\x00-\xff]/g, "?");
}

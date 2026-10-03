// src/lib/anfrage/feiertage.js
//
// Gesetzliche Feiertage für die SLA-Messung im Lead-Desk (Welle 2, Paket B3). Reine Funktionen, Client + Server.
// Nur landesweit geltende Tage; regionale Feiertage (Bundesland, Kanton) sind bewusst NICHT enthalten.
//
// Quellen (Primärrecht):
//  - DE: Feiertagsgesetze der Länder; die neun hier geführten Tage gelten in allen 16 Ländern, der 3. Oktober
//    zusätzlich bundesrechtlich (Einigungsvertrag Art. 2 Abs. 2). Übersicht: https://www.bmi.bund.de (Feiertage).
//  - AT: Arbeitsruhegesetz § 7 Abs. 2 (ARG, BGBl. Nr. 144/1983 i. d. g. F.), https://www.ris.bka.gv.at
//    (Karfreitag ist seit 2019 kein allgemeiner Feiertag mehr – „persönlicher Feiertag“ § 7a ARG, daher nicht enthalten).
//  - CH: bundesrechtlich nur der 1. August (Art. 110 Abs. 3 BV, Art. 20a Abs. 1 ArG). Neujahr, Auffahrt und
//    Weihnachtstag gelten nach der Übersicht des Bundesamts für Justiz in allen Kantonen – als „zu prüfen“ markiert.
//
// TODO Rechtsabteilung/Betrieb: regionale Feiertage je Bundesland (z. B. Fronleichnam, Allerheiligen in DE-Ländern),
// je Kanton (Karfreitag, Ostermontag, Pfingstmontag, Stephanstag, Berchtoldstag …) und betriebliche Schließtage
// ergänzen, sobald die Lead-Desks einem Standort zugeordnet sind.

const ZWEI = (n) => String(n).padStart(2, "0");
const tag = (j, m, t) => `${j}-${ZWEI(m)}-${ZWEI(t)}`;

/** Ostersonntag (gregorianisch, Anonymer Gregorianischer Algorithmus / Meeus–Jones–Butcher) → "JJJJ-MM-TT" */
export function osterSonntag(jahr) {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const t = ((h + l - 7 * m + 114) % 31) + 1;
  return tag(jahr, monat, t);
}

/** "JJJJ-MM-TT" + n Tage (UTC-Kalenderrechnung, keine Zeitzone im Spiel) */
export function tagePlus(datum, n) {
  const [j, m, t] = datum.split("-").map(Number);
  const d = new Date(Date.UTC(j, m - 1, t + n));
  return tag(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

const OSTERN = { karfreitag: -2, ostermontag: 1, himmelfahrt: 39, pfingstmontag: 50, fronleichnam: 60 };

/** Feiertage je Land: [{ datum, name, geltung: "landesweit" | "zu_pruefen" }] */
const REGELN = {
  DE: [
    { fest: [1, 1], name: "Neujahr" },
    { ostern: "karfreitag", name: "Karfreitag" },
    { ostern: "ostermontag", name: "Ostermontag" },
    { fest: [5, 1], name: "Tag der Arbeit" },
    { ostern: "himmelfahrt", name: "Christi Himmelfahrt" },
    { ostern: "pfingstmontag", name: "Pfingstmontag" },
    { fest: [10, 3], name: "Tag der Deutschen Einheit" },
    { fest: [12, 25], name: "1. Weihnachtstag" },
    { fest: [12, 26], name: "2. Weihnachtstag" },
  ],
  AT: [
    { fest: [1, 1], name: "Neujahr" },
    { fest: [1, 6], name: "Heilige Drei Könige" },
    { ostern: "ostermontag", name: "Ostermontag" },
    { fest: [5, 1], name: "Staatsfeiertag" },
    { ostern: "himmelfahrt", name: "Christi Himmelfahrt" },
    { ostern: "pfingstmontag", name: "Pfingstmontag" },
    { ostern: "fronleichnam", name: "Fronleichnam" },
    { fest: [8, 15], name: "Mariä Himmelfahrt" },
    { fest: [10, 26], name: "Nationalfeiertag" },
    { fest: [11, 1], name: "Allerheiligen" },
    { fest: [12, 8], name: "Mariä Empfängnis" },
    { fest: [12, 25], name: "Christtag" },
    { fest: [12, 26], name: "Stefanitag" },
  ],
  CH: [
    { fest: [1, 1], name: "Neujahr", geltung: "zu_pruefen" },
    { ostern: "himmelfahrt", name: "Auffahrt", geltung: "zu_pruefen" },
    { fest: [8, 1], name: "Bundesfeier" },
    { fest: [12, 25], name: "Weihnachtstag", geltung: "zu_pruefen" },
  ],
};

export const FEIERTAG_LAENDER = Object.freeze(Object.keys(REGELN));

const cache = new Map();

/** Alle landesweiten Feiertage eines Jahres, nach Datum sortiert. Unbekanntes Land → []. */
export function feiertage(land, jahr) {
  const regeln = REGELN[land];
  if (!regeln || !Number.isInteger(jahr)) return [];
  const k = `${land}|${jahr}`;
  if (!cache.has(k)) {
    const ostern = osterSonntag(jahr);
    const liste = regeln
      .map((r) => ({ datum: r.fest ? tag(jahr, r.fest[0], r.fest[1]) : tagePlus(ostern, OSTERN[r.ostern]), name: r.name, geltung: r.geltung || "landesweit" }))
      .sort((a, b) => a.datum.localeCompare(b.datum));
    cache.set(k, Object.freeze(liste.map(Object.freeze)));
  }
  return cache.get(k);
}

/** Ist "JJJJ-MM-TT" in diesem Land ein (landesweiter) Feiertag? Liefert den Namen oder "". */
export function feiertagName(land, datum) {
  const jahr = Number(String(datum).slice(0, 4));
  return feiertage(land, jahr).find((f) => f.datum === datum)?.name || "";
}

export const istFeiertag = (land, datum) => !!feiertagName(land, datum);

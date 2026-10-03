// src/lib/anfrage/sla.js
//
// SLA-Messung für den Lead-Desk (Welle 2, Paket B3): Frist bis zum Erstkontakt in Geschäftsstunden je Land
// (Zeitzone, Wochenende, landesweite Feiertage aus feiertage.js), Ampel, Überfälligkeit sowie Median und P90.
// Reine Funktionen, Client + Server. Frappe-Spiegel: plattform/api/einwilligung.py (sla_*).
//
// NUR INTERN. Öffentlich gibt es keine Zeitzusage (Welle-1-Regel; Masterplan 5.5: erst nach 4 Wochen gemessenem
// Nachweis). Zielwerte laut Masterplan 5.5:
//   h1         A-Lead mit Rückrufwunsch: < 1 Geschäftsstunde
//   h4         Großspeicher, Investor, Kommune: 4 Geschäftsstunden
//   taggleich  Fläche ab 20 ha: am selben Geschäftstag (Eingang in der letzten Geschäftsstunde oder danach → nächster Geschäftstag)
//   wt2        Rest: 2 Werktage (= 2 volle Geschäftstage ab Eingang, gleiche Uhrzeit)
//
// Geschäftszeit Mo–Fr 08:00–17:00 Ortszeit ist eine ANNAHME (TODO Inhaber/Vertrieb: Besetzungszeiten je Desk, E7).
// Land unbekannt → Kalender des Backoffice in Wien (AT). Regionale Feiertage: TODO (siehe feiertage.js).

import { feiertagName, tagePlus } from "./feiertage.js";

export const GESCHAEFTSZEIT = Object.freeze({
  DE: { tz: "Europe/Berlin", von: 8, bis: 17, kalender: "DE" },
  AT: { tz: "Europe/Vienna", von: 8, bis: 17, kalender: "AT" },
  CH: { tz: "Europe/Zurich", von: 8, bis: 17, kalender: "CH" },
  unbekannt: { tz: "Europe/Vienna", von: 8, bis: 17, kalender: "AT" },
});

export const SLA_KLASSEN = Object.freeze({
  h1: { label: "A-Lead mit Rückruf", ziel: "unter 1 Geschäftsstunde", minuten: 60, gelbMin: 15 },
  h4: { label: "Großspeicher, Investor, Kommune", ziel: "4 Geschäftsstunden", minuten: 240, gelbMin: 60 },
  taggleich: { label: "Fläche ab 20 ha", ziel: "am selben Geschäftstag", gelbMin: 120 },
  wt2: { label: "Standard", ziel: "2 Werktage", werktage: 2, gelbMin: 240 },
});
export const SLA_KLASSEN_IDS = Object.freeze(Object.keys(SLA_KLASSEN));

/** Endgültige SLA-Klasse: A-Lead mit Rückrufwunsch → h1, sonst die Klasse aus der Routing-Matrix */
export function slaKlasse({ basis, score, rueckruf } = {}) {
  if (score === "A" && rueckruf === true) return "h1";
  return SLA_KLASSEN_IDS.includes(basis) ? basis : "wt2";
}

const zeitVon = (land) => GESCHAEFTSZEIT[land] || GESCHAEFTSZEIT.unbekannt;

// ------------------------------------------------------------ Zeitzonen ohne Bibliothek (Intl)

const formate = new Map();
function format(tz) {
  if (!formate.has(tz)) formate.set(tz, new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  return formate.get(tz);
}

/** Ortszeit-Teile eines Zeitpunkts */
function teile(ms, tz) {
  const p = Object.fromEntries(format(tz).formatToParts(new Date(ms)).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  return { j: p.year, m: p.month, t: p.day, h: p.hour === 24 ? 0 : p.hour, min: p.minute, s: p.second };
}

/** Abstand Ortszeit − UTC in Minuten zum Zeitpunkt ms */
function versatz(ms, tz) {
  const x = teile(ms, tz);
  return (Date.UTC(x.j, x.m - 1, x.t, x.h, x.min, x.s) - Math.floor(ms / 1000) * 1000) / 60000;
}

/** Ortsdatum "JJJJ-MM-TT" eines Zeitpunkts */
export function ortsDatum(ms, tz) {
  const x = teile(ms, tz);
  return `${x.j}-${String(x.m).padStart(2, "0")}-${String(x.t).padStart(2, "0")}`;
}

/** Ortszeit (Datum + volle Stunde) → UTC-Millisekunden, sommerzeitfest */
function ortZuUtc(datum, stunde, tz) {
  const [j, m, t] = datum.split("-").map(Number);
  const roh = Date.UTC(j, m - 1, t, stunde);
  const erst = roh - versatz(roh, tz) * 60000; // Näherung; zweiter Schritt korrigiert an Umstellungstagen
  return roh - versatz(erst, tz) * 60000;
}

const wochentag = (datum) => {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t)).getUTCDay();
};

/** Geschäftstag im Land? (Mo–Fr, kein landesweiter Feiertag) */
export function istGeschaeftstag(land, datum) {
  const w = wochentag(datum);
  if (w === 0 || w === 6) return false;
  return !feiertagName(zeitVon(land).kalender, datum);
}

/** Geschäftszeitfenster [start, ende] eines Tages in UTC-ms oder null */
function fenster(land, datum) {
  if (!istGeschaeftstag(land, datum)) return null;
  const z = zeitVon(land);
  return [ortZuUtc(datum, z.von, z.tz), ortZuUtc(datum, z.bis, z.tz)];
}

const MAX_TAGE = 400;
const zeitpunkt = (x) => (x instanceof Date ? x.getTime() : typeof x === "number" ? x : Date.parse(x));

/** Frist (ISO) für Eingang, Klasse und Land; ungültiger Eingang → null */
export function fristBerechnen(eingang, klasse, land) {
  const ms = zeitpunkt(eingang);
  if (!Number.isFinite(ms)) return null;
  const k = SLA_KLASSEN[klasse] || SLA_KLASSEN.wt2;
  const z = zeitVon(land);
  let datum = ortsDatum(ms, z.tz);
  if (klasse === "taggleich") {
    for (let i = 0; i < MAX_TAGE; i++, datum = tagePlus(datum, 1)) {
      const f = fenster(land, datum);
      if (f && f[1] - Math.max(ms, f[0]) >= 60 * 60000) return new Date(f[1]).toISOString();
    }
    return null;
  }
  let rest = (k.minuten ?? k.werktage * (z.bis - z.von) * 60) * 60000;
  for (let i = 0; i < MAX_TAGE; i++, datum = tagePlus(datum, 1)) {
    const f = fenster(land, datum);
    if (!f) continue;
    const start = Math.max(ms, f[0]);
    if (start >= f[1]) continue;
    if (rest <= f[1] - start) return new Date(start + rest).toISOString();
    rest -= f[1] - start;
  }
  return null;
}

/** Geschäftsminuten zwischen zwei Zeitpunkten im Land (nur Geschäftszeit zählt) */
export function geschaeftsMinuten(von, bis, land) {
  const a = zeitpunkt(von);
  const b = zeitpunkt(bis);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  const z = zeitVon(land);
  let datum = ortsDatum(a, z.tz);
  const ende = ortsDatum(b, z.tz);
  let summe = 0;
  for (let i = 0; i < MAX_TAGE * 3 && datum <= ende; i++, datum = tagePlus(datum, 1)) {
    const f = fenster(land, datum);
    if (f) summe += Math.max(0, Math.min(b, f[1]) - Math.max(a, f[0]));
  }
  return Math.round(summe / 60000);
}

const dauerText = (min) => (min >= 120 ? `${Math.round(min / 6) / 10} h`.replace(".", ",") : `${min} min`);

/**
 * SLA-Stand eines Leads.
 *  { eingang, erstkontaktAm, klasse, land, jetzt }
 * → { klasse, frist, status: erledigt|verspaetet|offen|faellig|ueberfaellig|unbekannt, ampel, ueberfaellig,
 *     kalenderMin, geschaeftsMin, text }
 */
export function slaAuswerten({ eingang, erstkontaktAm = null, klasse = "wt2", land = "unbekannt", jetzt = Date.now() } = {}) {
  const k = SLA_KLASSEN[klasse] ? klasse : "wt2";
  const ein = zeitpunkt(eingang);
  if (!Number.isFinite(ein)) return { klasse: k, frist: null, status: "unbekannt", ampel: "grau", ueberfaellig: false, kalenderMin: null, geschaeftsMin: null, text: "Kein Eingang" };
  const frist = fristBerechnen(ein, k, land);
  const fristMs = Date.parse(frist);
  const kontakt = erstkontaktAm ? zeitpunkt(erstkontaktAm) : NaN;
  if (Number.isFinite(kontakt)) {
    const kalenderMin = Math.max(0, Math.round((kontakt - ein) / 60000));
    const geschaeftsMin = geschaeftsMinuten(ein, kontakt, land);
    const inFrist = kontakt <= fristMs;
    return { klasse: k, frist, status: inFrist ? "erledigt" : "verspaetet", ampel: inFrist ? "gruen" : "gelb", ueberfaellig: false, kalenderMin, geschaeftsMin, text: `Erstkontakt nach ${dauerText(geschaeftsMin)} Geschäftszeit${inFrist ? "" : " (nach Frist)"}` };
  }
  const now = zeitpunkt(jetzt);
  if (now > fristMs) return { klasse: k, frist, status: "ueberfaellig", ampel: "rot", ueberfaellig: true, kalenderMin: null, geschaeftsMin: null, text: `Überfällig seit ${dauerText(geschaeftsMinuten(fristMs, now, land))} Geschäftszeit` };
  const restMin = Math.round((fristMs - now) / 60000);
  if (restMin <= SLA_KLASSEN[k].gelbMin) return { klasse: k, frist, status: "faellig", ampel: "gelb", ueberfaellig: false, kalenderMin: null, geschaeftsMin: null, text: `Fällig in ${dauerText(restMin)}` };
  return { klasse: k, frist, status: "offen", ampel: "gruen", ueberfaellig: false, kalenderMin: null, geschaeftsMin: null, text: `Frist läuft (${dauerText(geschaeftsMinuten(now, fristMs, land))} Geschäftszeit)` };
}

// ------------------------------------------------------------ Median / P90

/** Median (Mittel der beiden mittleren Werte bei gerader Anzahl) und P90 (Nearest-Rank) */
export function kennzahlen(werte = []) {
  const x = werte.filter((w) => typeof w === "number" && Number.isFinite(w)).sort((a, b) => a - b);
  const n = x.length;
  if (!n) return { anzahl: 0, median: null, p90: null };
  const median = n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2;
  const p90 = x[Math.max(0, Math.ceil(0.9 * n) - 1)];
  return { anzahl: n, median, p90 };
}

function gruppe(liste) {
  const erledigt = liste.filter((l) => l.sla.status === "erledigt" || l.sla.status === "verspaetet");
  return {
    anzahl: liste.length,
    mitErstkontakt: erledigt.length,
    inFrist: liste.filter((l) => l.sla.status === "erledigt").length,
    offen: liste.filter((l) => ["offen", "faellig", "ueberfaellig"].includes(l.sla.status)).length,
    ueberfaellig: liste.filter((l) => l.sla.ueberfaellig).length,
    ohneZustaendigkeit: liste.filter((l) => l.ohneZustaendigkeit).length,
    geschaeftsMin: kennzahlen(erledigt.map((l) => l.sla.geschaeftsMin)),
    kalenderMin: kennzahlen(erledigt.map((l) => l.sla.kalenderMin)),
  };
}

/**
 * Auswertung über viele Leads: leads = [{ land, typ, eingang, erstkontaktAm, klasse, ohneZustaendigkeit }]
 * → { gesamt, jeLand: { DE: … }, jeTyp: { … }, jeLandTyp: [{ land, typ, … }], leads (mit sla) }
 */
export function slaAuswertung(leads = [], { jetzt = Date.now() } = {}) {
  const mit = leads.map((l) => ({ ...l, sla: l.sla || slaAuswerten({ eingang: l.eingang, erstkontaktAm: l.erstkontaktAm, klasse: l.klasse, land: l.land, jetzt }) }));
  const nach = (f) => {
    const m = new Map();
    for (const l of mit) {
      const s = f(l);
      if (!m.has(s)) m.set(s, []);
      m.get(s).push(l);
    }
    return m;
  };
  return {
    gesamt: gruppe(mit),
    jeLand: Object.fromEntries([...nach((l) => l.land || "unbekannt")].map(([s, l]) => [s, gruppe(l)])),
    jeTyp: Object.fromEntries([...nach((l) => l.typ || "kontakt")].map(([s, l]) => [s, gruppe(l)])),
    jeLandTyp: [...nach((l) => `${l.land || "unbekannt"}|${l.typ || "kontakt"}`)].map(([s, l]) => ({ land: s.split("|")[0], typ: s.split("|")[1], ...gruppe(l) })).sort((a, b) => a.land.localeCompare(b.land) || a.typ.localeCompare(b.typ)),
    leads: mit,
  };
}

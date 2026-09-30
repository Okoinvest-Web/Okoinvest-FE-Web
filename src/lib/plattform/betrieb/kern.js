// src/lib/plattform/betrieb/kern.js
//
// Betriebsführung der ÖkoInvest-Anlagen – reine Regeln (Client, Server und Node-Tests; nur relative Importe).
// Frappe: plattform/betrieb_kern.py (gleiche Werte und Regeln). Daten: backend/betrieb.js, Auswertung: betrieb/auswertung.js.
//
//   Störung als Ticket:  SLA je Schwere (Reaktion = Quittierung, Lösung = Behebung), Ursache, Ertragsausfall
//   Serviceaufträge:     Techniker/Dienstleister/Hersteller beauftragen – Zustandsautomat
//   Versicherungsfall:   Meldung, Regulierung – Zustandsautomat mit Pflichtangaben und Meldefrist
//   Wartungsplan:        wiederkehrende Wartung je Land (DE/AT/CH), Fälligkeiten
//   Prüfprotokoll:       Messwerte je String (IEC 62446-1), Thermografie (IEC TS 62446-3), Bewertung
//   Ersatzteile:         Bestand, Mindestbestand, Nachbestellvorschlag
//   Kennzahlen:          Performance Ratio (mit Einstrahlung), Ist/Soll, energetische Verfügbarkeit
//   Zählerablesung:      Plausibilisierung (Eichfrist, Monitoring-Abgleich, Prognose) vor der Contracting-Abrechnung
//
// Fachlicher Hinweis: Normen, Intervalle und Schwellen sind Orientierungswerte. Maßgeblich sind Betriebsführungs- und
// Versicherungsverträge, Herstellervorgaben, die Gefährdungsbeurteilung und die Bewertung durch Elektrofachkräfte.

import { ALLGEMEIN, ERLOESE } from "../../invest/markt.js";

export class BetriebFehler extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const ungueltig = (m) => new BetriebFehler(422, m);
const konflikt = (m) => new BetriebFehler(409, m);

const TAG_MS = 86400e3;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const datumMs = (d) => (/^\d{4}-\d{2}-\d{2}/.test(String(d || "")) ? Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`) : NaN);
export const tageZwischen = (von, bis) => Math.round((datumMs(bis) - datumMs(von)) / TAG_MS);

/** Monate zu einem Datum addieren (Monatsende wird gekappt: 31.01. + 1 → 28./29.02.) */
export function plusMonate(datum, monate) {
  const ms = datumMs(datum);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const ziel = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + Number(monate || 0), 1));
  const letzter = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0)).getUTCDate();
  ziel.setUTCDate(Math.min(d.getUTCDate(), letzter));
  return iso(ziel.getTime());
}

// ================================================================ Störung als Ticket: SLA

/**
 * Standard-SLA je Schwere (Stunden). Reaktion = Quittierung durch den Betrieb, Lösung = Status „behoben“.
 * Standardwerte der Betriebsführung – abweichende Zusagen aus dem Betriebsführungs-/Contracting-Vertrag gehen vor.
 */
export const SLA_STOERUNG = {
  kritisch: { reaktionH: 2, loesungH: 24 },
  hoch: { reaktionH: 4, loesungH: 48 },
  mittel: { reaktionH: 24, loesungH: 120 },
  niedrig: { reaktionH: 48, loesungH: 240 },
  info: { reaktionH: 72, loesungH: null },
};

function fristTeil(startMs, stunden, erledigtIso, jetzt) {
  if (!stunden) return null;
  const bis = startMs + stunden * 3600e3;
  const erledigt = erledigtIso ? Date.parse(erledigtIso) : null;
  const massgeblich = erledigt ?? jetzt;
  return {
    bis: new Date(bis).toISOString(),
    erledigt: erledigt !== null,
    erfuellt: erledigt !== null && erledigt <= bis,
    verletzt: massgeblich > bis,
    restMin: erledigt === null ? Math.round((bis - jetzt) / 60000) : null,
    anteilVerbraucht: Math.max(0, (massgeblich - startMs) / (bis - startMs)),
  };
}

/** SLA-Stand einer Störung: { reaktion, loesung, ampel: gruen|gelb|rot, text } */
export function slaStatus(s, jetzt = Date.now()) {
  const d = SLA_STOERUNG[s?.schwere] || SLA_STOERUNG.mittel;
  const start = Date.parse(s?.erkanntAm);
  if (!Number.isFinite(start)) return null;
  const reaktion = fristTeil(start, d.reaktionH, s.quittiertAm, jetzt);
  const loesung = fristTeil(start, d.loesungH, s.behobenAm, jetzt);
  const teile = [reaktion, loesung].filter(Boolean);
  const offen = teile.filter((t) => !t.erledigt);
  const ampel = teile.some((t) => t.verletzt) ? "rot" : offen.some((t) => t.anteilVerbraucht >= 0.75) ? "gelb" : "gruen";
  const naechste = offen.sort((a, b) => a.restMin - b.restMin)[0];
  const text = teile.some((t) => t.verletzt)
    ? `SLA verletzt (${[reaktion?.verletzt && "Reaktion", loesung?.verletzt && "Lösung"].filter(Boolean).join(", ")})`
    : naechste
      ? `${naechste === reaktion ? "Reaktion" : "Lösung"} bis ${new Date(naechste.bis).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "short", timeStyle: "short" })}`
      : "SLA eingehalten";
  return { vorgabe: d, reaktion, loesung, ampel, text };
}

// ================================================================ Ursachen

/** Ursachenkategorien (Pflicht beim Beheben). versicherbar = typischer Fall für die PV-(Allgefahren-)Versicherung */
export const URSACHEN = {
  wechselrichter: { label: "Wechselrichter (Defekt, Fehlercode)", versicherbar: false },
  modul: { label: "PV-Modul (Bruch, Hotspot, Delamination)", versicherbar: false },
  dc_verkabelung: { label: "DC-Verkabelung / Steckverbinder", versicherbar: false },
  schutzorgan: { label: "Schutzorgan ausgelöst (Sicherung, RCD, Überspannungsschutz)", versicherbar: false },
  ueberspannung: { label: "Überspannung / Blitz", versicherbar: true },
  netz: { label: "Netzstörung / Abschaltung durch Netzbetreiber", versicherbar: false },
  einspeisemanagement: { label: "Einspeisemanagement / Redispatch (Netzbetreiber)", versicherbar: false },
  kommunikation: { label: "Kommunikation (Datenlogger, Internet, SIM)", versicherbar: false },
  speicher: { label: "Speicher / BMS", versicherbar: false },
  witterung: { label: "Sturm, Hagel, Schneelast", versicherbar: true },
  tiere: { label: "Tierverbiss (z. B. Marder)", versicherbar: true },
  vandalismus: { label: "Vandalismus / Diebstahl", versicherbar: true },
  brand: { label: "Brand / Feuer", versicherbar: true },
  verschmutzung: { label: "Verschmutzung / Verschattung", versicherbar: false },
  bedienung: { label: "Bedien- oder Montagefehler", versicherbar: false },
  unbekannt: { label: "Unbekannt / nicht reproduzierbar", versicherbar: false },
};

/** Behebung: Ursache und Maßnahme sind Pflicht (Nachweis für Kunde, Versicherung und Bank-Reporting) */
export function behebungPruefen({ ursacheKategorie, massnahme } = {}) {
  if (!URSACHEN[ursacheKategorie]) throw ungueltig("Bitte vor dem Beheben die Ursache auswählen (Reiter „Ursache & Ertragsausfall“).");
  if (String(massnahme || "").trim().length < 5) throw ungueltig("Bitte die durchgeführte Maßnahme beschreiben (mind. 5 Zeichen).");
  return true;
}

// ================================================================ Ertragsausfall

/** Tageslänge in Stunden je Monat bei rund 48° N (DACH-Mittel, astronomisch gerundet) */
const TAGESLAENGE_H = [8.6, 10.0, 11.9, 13.7, 15.3, 16.1, 15.7, 14.3, 12.4, 10.6, 9.0, 8.2];

/** Sommerzeit (MESZ) nach EU-Regel: letzter Sonntag im März bis letzter Sonntag im Oktober, jeweils 01:00 UTC */
function sommerzeit(ms) {
  const j = new Date(ms).getUTCFullYear();
  const letzterSonntag = (monat) => {
    const d = new Date(Date.UTC(j, monat + 1, 0, 1));
    return d.getTime() - d.getUTCDay() * TAG_MS;
  };
  return ms >= letzterSonntag(2) && ms < letzterSonntag(9);
}

/**
 * Erwartete PV-Erzeugung (kWh) im Zeitraum [vonMs, bisMs) aus der Jahresprognose: Monatsanteil (markt.js) je Tag,
 * innerhalb des Tages als Sinusbogen zwischen Sonnenauf- und -untergang (Ortszeit Mitteleuropa, 15-Minuten-Schritte).
 */
export function erwarteteEnergieKwh({ jahresKwh = 0, vonMs, bisMs } = {}) {
  const jahr = Number(jahresKwh) || 0;
  if (!(jahr > 0) || !(bisMs > vonMs)) return 0;
  const anteile = ALLGEMEIN.pvMonatsanteile || Array(12).fill(1 / 12);
  const schritt = 15 * 60e3;
  let summe = 0;
  for (let t = vonMs; t < bisMs; t += schritt) {
    const dt = Math.min(schritt, bisMs - t);
    const mitte = t + dt / 2;
    const lokal = new Date(mitte + (sommerzeit(mitte) ? 2 : 1) * 3600e3);
    const m = lokal.getUTCMonth();
    const L = TAGESLAENGE_H[m];
    const mittag = 12.2 + (sommerzeit(mitte) ? 1 : 0); // Sonnenhöchststand ≈ 12:10 MEZ im DACH-Mittel
    const stunde = lokal.getUTCHours() + lokal.getUTCMinutes() / 60 + lokal.getUTCSeconds() / 3600;
    const x = (stunde - (mittag - L / 2)) / L;
    if (x <= 0 || x >= 1) continue;
    const tageImMonat = new Date(Date.UTC(lokal.getUTCFullYear(), m + 1, 0)).getUTCDate();
    const tagKwh = (jahr * anteile[m]) / tageImMonat;
    summe += tagKwh * (Math.PI / (2 * L)) * Math.sin(Math.PI * x) * (dt / 3600e3);
  }
  return summe;
}

/**
 * Ertragsausfall einer Störung: erwartete Erzeugung im Ausfallzeitraum × betroffener Anteil.
 * Bewertung: Eigenverbrauchsanteil zum Arbeitspreis des Contracting-Vertrags (entgangener Stromverkauf), Rest zum
 * Marktwert Solar (Einspeisung). Ohne Vertrag nur Marktwert. Schätzung – maßgeblich sind Zählerwerte und Verträge.
 */
export function ertragsausfall({ jahresKwh = 0, von, bis, betroffenPct = 100, arbeitspreisCt = null, eigenverbrauchQuote = null, einspeiseCt = ERLOESE.merchantCt } = {}) {
  const vonMs = Date.parse(von);
  const bisMs = Date.parse(bis);
  if (!Number.isFinite(vonMs) || !Number.isFinite(bisMs)) throw ungueltig("Bitte Beginn und Ende des Ausfalls angeben.");
  if (bisMs <= vonMs) throw ungueltig("Das Ende des Ausfalls muss nach dem Beginn liegen.");
  if (bisMs - vonMs > 400 * TAG_MS) throw ungueltig("Ausfallzeitraum höchstens 400 Tage – längere Ausfälle bitte abschnittsweise erfassen.");
  if (bisMs > Date.now() + 5 * 60e3) throw ungueltig("Das Ende des Ausfalls darf nicht in der Zukunft liegen (für laufende Ausfälle „bis jetzt“ verwenden).");
  const anteil = Math.min(100, Math.max(0, Number(betroffenPct) || 0)) / 100;
  const sollKwh = erwarteteEnergieKwh({ jahresKwh, vonMs, bisMs });
  const ausfallKwh = sollKwh * anteil;
  const q = arbeitspreisCt === null || arbeitspreisCt === undefined ? 0 : eigenverbrauchQuote === null || eigenverbrauchQuote === undefined ? 0.7 : Math.min(1, Math.max(0, Number(eigenverbrauchQuote)));
  const erloesCtKwh = q * (Number(arbeitspreisCt) || 0) + (1 - q) * (Number(einspeiseCt) || 0);
  return {
    stunden: Math.round(((bisMs - vonMs) / 3600e3) * 10) / 10,
    sollKwh: Math.round(sollKwh * 10) / 10,
    ausfallKwh: Math.round(ausfallKwh * 10) / 10,
    betroffenPct: anteil * 100,
    eigenverbrauchQuote: q,
    erloesCtKwh: Math.round(erloesCtKwh * 1000) / 1000,
    ausfallEur: Math.round(ausfallKwh * erloesCtKwh) / 100,
    annahme: arbeitspreisCt === null || arbeitspreisCt === undefined ? "Marktwert Solar (ohne Contracting-Vertrag)" : eigenverbrauchQuote === null || eigenverbrauchQuote === undefined ? "Eigenverbrauchsanteil 70 % (Annahme)" : "Eigenverbrauchsanteil aus Monitoring",
  };
}

// ================================================================ Serviceaufträge

export const AUFTRAG_ARTEN = {
  techniker: "Eigener Techniker",
  dienstleister: "O&M-Dienstleister / Elektrofachbetrieb",
  hersteller: "Herstellerservice (Garantie/Gewährleistung)",
  netzbetreiber: "Meldung an den Netzbetreiber",
};
export const AUFTRAG_STATUS = {
  angelegt: "Angelegt",
  beauftragt: "Beauftragt",
  terminiert: "Termin vereinbart",
  vor_ort: "Techniker vor Ort",
  erledigt: "Erledigt",
  storniert: "Storniert",
};
export const AUFTRAG_UEBERGAENGE = {
  angelegt: ["beauftragt", "storniert"],
  beauftragt: ["terminiert", "vor_ort", "erledigt", "storniert"],
  terminiert: ["vor_ort", "erledigt", "storniert"],
  vor_ort: ["erledigt"],
  erledigt: [],
  storniert: [],
};
export const AUFTRAG_OFFEN = ["angelegt", "beauftragt", "terminiert", "vor_ort"];

/** Statuswechsel eines Serviceauftrags prüfen – liefert die zu setzenden Felder */
export function auftragUebergang(auftrag, neu, daten = {}, heute = iso(Date.now())) {
  const alt = auftrag?.status || "angelegt";
  if (!AUFTRAG_STATUS[neu]) throw ungueltig("Unbekannter Status.");
  if (!(AUFTRAG_UEBERGAENGE[alt] || []).includes(neu)) throw konflikt(`Von „${AUFTRAG_STATUS[alt]}“ nach „${AUFTRAG_STATUS[neu]}“ ist nicht möglich.`);
  const patch = { status: neu };
  if (neu === "beauftragt") {
    if (String(auftrag.dienstleister || daten.dienstleister || "").trim().length < 2) throw ungueltig("Bitte den Auftragnehmer angeben.");
    patch.beauftragtAm = new Date().toISOString();
  }
  if (neu === "terminiert") {
    const termin = String(daten.termin || auftrag.termin || "");
    if (!/^\d{4}-\d{2}-\d{2}/.test(termin)) throw ungueltig("Bitte den Termin angeben.");
    patch.termin = termin.slice(0, 16);
  }
  if (neu === "erledigt") {
    const bericht = String(daten.bericht ?? auftrag.bericht ?? "").trim();
    if (bericht.length < 10) throw ungueltig("Bitte einen kurzen Einsatzbericht erfassen (mind. 10 Zeichen).");
    patch.bericht = bericht;
    patch.erledigtAm = String(daten.erledigtAm || heute).slice(0, 10);
    if (patch.erledigtAm > heute) throw ungueltig("Das Erledigt-Datum darf nicht in der Zukunft liegen.");
  }
  if (neu === "storniert") {
    const grund = String(daten.grund || "").trim();
    if (grund.length < 3) throw ungueltig("Bitte einen Stornogrund angeben.");
    patch.stornoGrund = grund;
  }
  return patch;
}

// ================================================================ Versicherungsfall

export const VERSICHERUNG_ARTEN = {
  allgefahren: "PV-Allgefahren- bzw. Elektronikversicherung (Sachschaden)",
  ertragsausfall: "Ertragsausfall / Betriebsunterbrechung",
  haftpflicht: "Betreiberhaftpflicht (Schaden Dritter)",
};
export const VERSICHERUNG_STATUS = {
  entwurf: "Entwurf",
  gemeldet: "Gemeldet",
  in_pruefung: "In Prüfung (Gutachter)",
  reguliert: "Reguliert",
  abgelehnt: "Abgelehnt",
  zurueckgezogen: "Zurückgezogen",
};
export const VERSICHERUNG_UEBERGAENGE = {
  entwurf: ["gemeldet", "zurueckgezogen"],
  gemeldet: ["in_pruefung", "reguliert", "abgelehnt", "zurueckgezogen"],
  in_pruefung: ["reguliert", "abgelehnt"],
  reguliert: [],
  abgelehnt: [],
  zurueckgezogen: [],
};
export const VERSICHERUNG_OFFEN = ["entwurf", "gemeldet", "in_pruefung"];
/** Interne Meldefrist ab Schadentag. Gesetzlich: in der Regel unverzüglich nach Kenntnis (DE § 30 VVG, AT § 33 VersVG, CH Art. 38 VVG) */
export const MELDEFRIST_TAGE = 7;
export const MELDEFRIST_HINWEIS = "Versicherungsfälle sind in der Regel unverzüglich nach Kenntnis anzuzeigen (DE § 30 VVG, AT § 33 VersVG, CH Art. 38 VVG). Maßgeblich sind die Versicherungsbedingungen; Schadenstelle nicht vor Freigabe durch den Versicherer verändern, außer zur Schadenminderung.";

export function meldefristBis(schadentag) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(schadentag || "")) ? iso(datumMs(schadentag) + MELDEFRIST_TAGE * TAG_MS) : "";
}

/** Statuswechsel eines Versicherungsfalls prüfen (fall = aktueller Stand inkl. neuer Angaben) */
export function versicherungUebergang(fall, neu, daten = {}, heute = iso(Date.now())) {
  const alt = fall?.status || "entwurf";
  if (!VERSICHERUNG_STATUS[neu]) throw ungueltig("Unbekannter Status.");
  if (!(VERSICHERUNG_UEBERGAENGE[alt] || []).includes(neu)) throw konflikt(`Von „${VERSICHERUNG_STATUS[alt]}“ nach „${VERSICHERUNG_STATUS[neu]}“ ist nicht möglich.`);
  const f = { ...fall, ...daten };
  const patch = { status: neu };
  if (neu === "gemeldet") {
    if (String(f.versicherer || "").trim().length < 2) throw ungueltig("Bitte den Versicherer angeben.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.schadentag || ""))) throw ungueltig("Bitte den Schadentag angeben.");
    if (!(Number(f.schadenEur) > 0) && !(Number(f.ertragsausfallEur) > 0)) throw ungueltig("Bitte die geschätzte Schadenhöhe bzw. den Ertragsausfall angeben.");
    if (String(f.schadenbeschreibung || "").trim().length < 10) throw ungueltig("Bitte den Schaden beschreiben (mind. 10 Zeichen).");
    patch.gemeldetAm = String(daten.gemeldetAm || heute).slice(0, 10);
    if (patch.gemeldetAm > heute) throw ungueltig("Das Meldedatum darf nicht in der Zukunft liegen.");
    patch.verspaetet = !!f.meldefristBis && patch.gemeldetAm > f.meldefristBis;
  }
  if (neu === "reguliert") {
    const e = Number(daten.erstattetEur ?? f.erstattetEur);
    if (!Number.isFinite(e) || e < 0) throw ungueltig("Bitte den erstatteten Betrag angeben (0 möglich).");
    patch.erstattetEur = Math.round(e * 100) / 100;
    patch.reguliertAm = heute;
  }
  if (neu === "abgelehnt" || neu === "zurueckgezogen") {
    if (String(daten.grund || "").trim().length < 3) throw ungueltig("Bitte eine Begründung angeben.");
    patch.abschlussGrund = String(daten.grund).trim();
  }
  return patch;
}

// ================================================================ Wartungsplan (wiederkehrend)

/**
 * Standard-Wartungsplan je Land. art = WARTUNG_ARTEN aus anlagen.js. nurSpeicher: nur bei Anlagen mit Speicher.
 * Intervalle sind Orientierungswerte (Hersteller, Gefährdungsbeurteilung, Versicherungsauflagen gehen vor).
 */
const GEMEINSAM = [
  { art: "inspektion", bezeichnung: "Jährliche Inspektion (Sichtprüfung Module, Unterkonstruktion, Verkabelung, Wechselrichter, Schutzeinrichtungen)", intervallMonate: 12, norm: "IEC 62446-2 (Wartung von PV-Systemen), Herstellervorgaben", vorlaufTage: 30 },
  { art: "thermografie", bezeichnung: "Thermografie Module und DC-/AC-Verteiler", intervallMonate: 12, norm: "IEC TS 62446-3 (Aufnahme bei mindestens 600 W/m² Einstrahlung)", vorlaufTage: 45, hinweis: "Oft Auflage der Versicherung; Termin in die einstrahlungsreichen Monate legen." },
  { art: "reinigung", bezeichnung: "Modulreinigung nach Bedarf (Verschmutzungsverlust prüfen)", intervallMonate: 24, norm: "Herstellervorgaben (Garantiebedingungen, zulässige Reinigungsmittel)", vorlaufTage: 30, hinweis: "Agri-PV, Tierhaltung, Staub oder geringe Neigung: häufiger." },
  { art: "software", bezeichnung: "Firmware-Update Wechselrichter und Datenlogger", intervallMonate: 12, norm: "Herstellervorgaben; Sicherheitsupdates", vorlaufTage: 14 },
  { art: "inspektion", bezeichnung: "Speicher: Herstellerwartung (BMS, Klimatisierung, Brandschutz, Kapazitätstest)", intervallMonate: 12, norm: "Herstellervorgaben; DE: VDE-AR-E 2510-50", vorlaufTage: 30, nurSpeicher: true },
];
export const WARTUNG_VORLAGEN = {
  DE: [
    { art: "pruefung", bezeichnung: "Wiederkehrende Prüfung der elektrischen Anlage (E-Check / DGUV Vorschrift 3)", intervallMonate: 48, norm: "DGUV Vorschrift 3, DIN VDE 0105-100; Prüfverfahren DIN EN 62446-1 (VDE 0126-23-1)", vorlaufTage: 60, hinweis: "Richtwert für ortsfeste Anlagen 4 Jahre – Intervall nach Gefährdungsbeurteilung festlegen." },
    ...GEMEINSAM,
  ],
  AT: [
    { art: "pruefung", bezeichnung: "Wiederkehrende Überprüfung der elektrischen Anlage (Prüfbefund)", intervallMonate: 60, norm: "ESV 2012, OVE E 8101; PV: OVE R 11-1", vorlaufTage: 60, hinweis: "In Arbeitsstätten in der Regel höchstens alle 5 Jahre – kürzer, wenn Betriebsstätte oder Versicherer es verlangen." },
    ...GEMEINSAM,
  ],
  CH: [
    { art: "pruefung", bezeichnung: "Periodische Kontrolle mit Sicherheitsnachweis (SiNa)", intervallMonate: 60, norm: "NIV, NIN (SN 411000)", vorlaufTage: 90, hinweis: "Kontrollperiode nach NIV-Anhang je nach Objekt – bitte objektbezogen festlegen; Kontrolle durch unabhängiges Kontrollorgan." },
    ...GEMEINSAM,
  ],
};

/** Vorgeschlagene Pläne für eine Anlage (ohne bereits vorhandene gleicher Art + Bezeichnung) */
export function planVorschlag(anlage = {}, vorhandene = []) {
  const vorlage = WARTUNG_VORLAGEN[anlage.land] || WARTUNG_VORLAGEN.DE;
  const mitSpeicher = anlage.typ === "speicher" || Number(anlage.speicherKwh) > 0;
  const ohnePv = anlage.typ === "speicher";
  return vorlage
    .filter((p) => (p.nurSpeicher ? mitSpeicher : !(ohnePv && ["thermografie", "reinigung"].includes(p.art))))
    .filter((p) => !vorhandene.some((x) => x.art === p.art && x.bezeichnung === p.bezeichnung))
    .map((p) => ({ ...p }));
}

/** Nächste Fälligkeit nach Durchführung */
export const naechsteFaelligkeit = (datum, intervallMonate) => plusMonate(datum, Math.max(1, Number(intervallMonate) || 12));

/** Stand eines Plans: ueberfaellig | faellig (innerhalb Vorlauf) | geplant | inaktiv */
export function planStand(plan, heute = iso(Date.now())) {
  if (!plan?.aktiv) return { stufe: "inaktiv", tage: null };
  if (!plan.naechsteFaelligkeit) return { stufe: "faellig", tage: 0, text: "Erste Fälligkeit festlegen" };
  const tage = tageZwischen(heute, plan.naechsteFaelligkeit);
  const vorlauf = Number(plan.vorlaufTage) || 30;
  return { tage, stufe: tage < 0 ? "ueberfaellig" : tage <= vorlauf ? "faellig" : "geplant" };
}

// ================================================================ Prüfprotokoll

export const PRUEF_ARTEN = {
  wiederkehrend: "Wiederkehrende Prüfung (E-Check / DGUV V3 / ESV / NIV)",
  erstpruefung: "Erstprüfung / Inbetriebnahmeprüfung (IEC 62446-1)",
  thermografie: "Thermografie (IEC TS 62446-3)",
  inspektion: "Inspektion / Sichtprüfung",
  reinigung: "Reinigungsnachweis",
};
/** Zuordnung Prüfart → Wartungsart (anlagen.js WARTUNG_ARTEN) */
export const PRUEF_WARTUNG_ART = { wiederkehrend: "pruefung", erstpruefung: "pruefung", thermografie: "thermografie", inspektion: "inspektion", reinigung: "reinigung" };
export const PRUEF_ERGEBNIS = { bestanden: "Bestanden – ohne Mängel", maengel: "Mängel – Betrieb zulässig, Behebung nötig", nicht_bestanden: "Nicht bestanden – Gefahr, Anlage(nteil) freischalten" };
/** Standard-Prüfpunkte (Sichtprüfung/Funktion) */
export const PRUEF_PUNKTE = {
  sicht_module: "Module, Unterkonstruktion, Befestigung ohne Befund",
  sicht_verkabelung: "Verkabelung, Steckverbinder, Kabelführung ohne Befund",
  schutzleiter: "Durchgängigkeit Schutz- und Potentialausgleichsleiter",
  ueberspannungsschutz: "Überspannungsschutz (SPD) in Ordnung",
  rcd: "Fehlerstrom-Schutzeinrichtung (RCD) ausgelöst und in Ordnung",
  wechselrichter: "Wechselrichter: Funktion, Kühlung, Anzeigen/Fehlerspeicher",
  kennzeichnung: "Kennzeichnung, Warnhinweise, Feuerwehrplan / Abschaltstelle",
  dokumentation: "Anlagendokumentation vollständig (IEC 62446-1)",
};

/** Mindest-Isolationswiderstand nach IEC 62446-1 (Tabelle Prüfspannung): Uoc ≤ 120 V → 0,5 MΩ, sonst 1 MΩ */
export const mindestIsolationMOhm = (uocV) => (Number(uocV) > 0 && Number(uocV) <= 120 ? 0.5 : 1);

/**
 * Bewertung eines Prüfprotokolls (Orientierung für die Elektrofachkraft, die das Ergebnis verantwortet):
 *   strings [{bezeichnung, uocV, uocSollV, iscA, rIsoMOhm}] · punkte {id: true|false} · thermografie [{ort, deltaK, text}]
 *   maengel [{text, schwere: gering|mittel|gefahr}]
 * → { ergebnis, befunde: [{text, stufe: hinweis|mangel|gefahr}] }
 */
export function pruefungBewerten({ strings = [], punkte = {}, thermografie = [], maengel = [] } = {}) {
  const befunde = [];
  const zahl = (x) => (x === null || x === undefined || x === "" ? null : Number(x));
  const iscListe = strings.map((s) => zahl(s.iscA)).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  const iscMedian = iscListe.length ? iscListe[Math.floor(iscListe.length / 2)] : null;
  const uocListe = strings.map((s) => zahl(s.uocV)).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  const uocMedian = uocListe.length ? uocListe[Math.floor(uocListe.length / 2)] : null;
  for (const s of strings) {
    const name = String(s.bezeichnung || "String");
    const uoc = zahl(s.uocV);
    const soll = zahl(s.uocSollV);
    const riso = zahl(s.rIsoMOhm);
    const isc = zahl(s.iscA);
    if (Number.isFinite(riso)) {
      const min = mindestIsolationMOhm(uoc);
      if (riso < min) befunde.push({ text: `${name}: Isolationswiderstand ${riso.toLocaleString("de-DE")} MΩ unter Mindestwert ${min.toLocaleString("de-DE")} MΩ (IEC 62446-1)`, stufe: "gefahr" });
    }
    const ref = Number.isFinite(soll) && soll > 0 ? soll : uocMedian;
    if (Number.isFinite(uoc) && ref && Math.abs(uoc - ref) / ref > 0.05) befunde.push({ text: `${name}: Leerlaufspannung ${uoc.toLocaleString("de-DE")} V weicht mehr als 5 % vom ${Number.isFinite(soll) && soll > 0 ? "Sollwert" : "Median der Strings"} ab – Modulanzahl, Verschaltung bzw. Bypass-Dioden prüfen`, stufe: "mangel" });
    if (Number.isFinite(isc) && iscMedian && iscListe.length >= 3 && Math.abs(isc - iscMedian) / iscMedian > 0.1) befunde.push({ text: `${name}: Kurzschlussstrom weicht mehr als 10 % vom Median ab – Verschattung, Verschmutzung oder Moduldefekt prüfen (Einstrahlung während der Messung beachten)`, stufe: "hinweis" });
  }
  for (const [id, ok] of Object.entries(punkte || {})) {
    if (ok === false && PRUEF_PUNKTE[id]) befunde.push({ text: `Prüfpunkt nicht in Ordnung: ${PRUEF_PUNKTE[id]}`, stufe: ["schutzleiter", "rcd"].includes(id) ? "gefahr" : "mangel" });
  }
  for (const t of thermografie) {
    const dk = zahl(t.deltaK);
    if (!Number.isFinite(dk)) continue;
    const ort = String(t.ort || "Befund");
    if (dk > 20) befunde.push({ text: `Thermografie ${ort}: ΔT ${dk.toLocaleString("de-DE")} K – kurzfristig beheben`, stufe: "mangel" });
    else if (dk >= 10) befunde.push({ text: `Thermografie ${ort}: ΔT ${dk.toLocaleString("de-DE")} K – Maßnahme planen`, stufe: "mangel" });
    else if (dk > 0) befunde.push({ text: `Thermografie ${ort}: ΔT ${dk.toLocaleString("de-DE")} K – beobachten`, stufe: "hinweis" });
  }
  for (const m of maengel) {
    const t = String(m.text || "").trim();
    if (t) befunde.push({ text: t, stufe: m.schwere === "gefahr" ? "gefahr" : m.schwere === "gering" ? "hinweis" : "mangel" });
  }
  const ergebnis = befunde.some((b) => b.stufe === "gefahr") ? "nicht_bestanden" : befunde.some((b) => b.stufe === "mangel") ? "maengel" : "bestanden";
  return { ergebnis, befunde };
}

// ================================================================ Ersatzteile

export const ERSATZTEIL_BEWEGUNG = { zugang: "Zugang (Lieferung)", entnahme: "Entnahme (Einsatz)", korrektur: "Inventurkorrektur" };

/** Bestand nach einer Bewegung – kein negativer Bestand; Korrektur setzt den gezählten Bestand */
export function bestandNach(teil, { art, menge } = {}) {
  const m = Number(menge);
  if (!ERSATZTEIL_BEWEGUNG[art]) throw ungueltig("Unbekannte Bewegungsart.");
  if (!Number.isFinite(m) || m < 0 || (art !== "korrektur" && m === 0)) throw ungueltig("Bitte eine gültige Menge angeben.");
  const alt = Number(teil?.bestand) || 0;
  const neu = art === "zugang" ? alt + m : art === "entnahme" ? alt - m : m;
  if (neu < 0) throw konflikt(`Nicht genug auf Lager (Bestand ${alt}).`);
  return Math.round(neu * 1000) / 1000;
}

/** Nachbestellvorschlag: Bestand ≤ Mindestbestand → auf Zielbestand (Standard: doppelter Mindestbestand) auffüllen */
export function nachbestellung(teil) {
  const min = Number(teil?.mindestbestand) || 0;
  const bestand = Number(teil?.bestand) || 0;
  if (!(min > 0) || bestand > min) return null;
  const ziel = Math.max(Number(teil.zielbestand) || 0, min * 2, min + 1);
  return { menge: Math.round((ziel - bestand) * 1000) / 1000, grund: bestand === 0 ? "Kein Bestand" : `Bestand ${bestand} ≤ Mindestbestand ${min}` };
}

// ================================================================ Fristen

/** Stufe einer Frist: ueberfaellig (< 0 Tage) · dringend (≤ 30) · bald (≤ 90) · spaeter */
export function fristStufe(tage) {
  if (tage === null || tage === undefined) return "fehlt";
  return tage < 0 ? "ueberfaellig" : tage <= 30 ? "dringend" : tage <= 90 ? "bald" : "spaeter";
}

/**
 * Fristen einer Anlage: Eichgültigkeit abrechnungsrelevanter Zähler, Garantieende von Komponenten (180 Tage Vorlauf:
 * Garantieinspektion vor Ablauf), Wartungspläne, Meldefristen offener Versicherungsfälle.
 * → [{art, titel, datum, tage, stufe, bezug:{art,id}}], sortiert nach Dringlichkeit
 */
export function fristenErmitteln({ anlage = {}, komponenten = [], messpunkte = [], plaene = [], versicherungen = [] } = {}, heute = iso(Date.now())) {
  const liste = [];
  const add = (art, titel, datum, bezug, horizont = 180) => {
    const tage = datum ? tageZwischen(heute, datum) : null;
    if (tage !== null && tage > horizont) return;
    liste.push({ art, titel, datum: datum || "", tage, stufe: fristStufe(tage), bezug, anlageId: anlage.id || null });
  };
  for (const m of messpunkte.filter((x) => x.abrechnungsrelevant)) {
    add("eichung", `Eichgültigkeit Zähler ${m.zaehlernummer}${m.eichgueltigBis ? "" : " – nicht gepflegt"}`, m.eichgueltigBis || "", { art: "messpunkt", id: m.id }, 365);
  }
  for (const k of komponenten.filter((x) => x.garantieBis)) {
    add("garantie", `Garantieende ${k.hersteller || ""} ${k.modell || k.artLabel || k.art}`.replace(/\s+/g, " ").trim(), k.garantieBis, { art: "komponente", id: k.id }, 180);
  }
  for (const p of plaene.filter((x) => x.aktiv)) {
    add("wartung", p.bezeichnung, p.naechsteFaelligkeit || heute, { art: "plan", id: p.id }, Math.max(90, Number(p.vorlaufTage) || 30));
  }
  for (const f of versicherungen.filter((x) => x.status === "entwurf" && x.meldefristBis)) {
    add("versicherung", `Meldefrist Versicherungsfall ${f.versicherer || ""}`.trim(), f.meldefristBis, { art: "versicherung", id: f.id }, 60);
  }
  const rang = { ueberfaellig: 0, fehlt: 1, dringend: 2, bald: 3, spaeter: 4 };
  return liste.sort((a, b) => rang[a.stufe] - rang[b.stufe] || (a.tage ?? -1e9) - (b.tage ?? -1e9));
}

// ================================================================ Kennzahlen (Performance Ratio, Verfügbarkeit)

/**
 * Monats-/Jahreskennzahlen:
 *   performanceIndex = Ist / Soll (Prognose aus Region, Bauart, Alterung – ohne Wetterbereinigung)
 *   pr (Performance Ratio, IEC 61724-1) = Ist / (kWp × Einstrahlung in Modulebene in kWh/m²) – nur mit Einstrahlungswert
 *   verfuegbarkeit (energetisch) = 1 − Ausfallenergie / Sollenergie
 */
export function kennzahlen({ kwp = 0, istKwh = null, sollKwh = null, einstrahlungKwhM2 = null, ausfallKwh = 0 } = {}) {
  const ist = Number(istKwh);
  const soll = Number(sollKwh);
  const H = Number(einstrahlungKwhM2);
  const p = Number(kwp);
  const pr = Number.isFinite(ist) && H > 0 && p > 0 ? ist / (p * H) : null;
  const verf = soll > 0 ? Math.min(1, Math.max(0, 1 - (Number(ausfallKwh) || 0) / soll)) : null;
  return {
    istKwh: Number.isFinite(ist) ? ist : null,
    sollKwh: soll > 0 ? soll : null,
    performanceIndex: Number.isFinite(ist) && soll > 0 ? ist / soll : null,
    spezErtragKwhKwp: Number.isFinite(ist) && p > 0 ? ist / p : null,
    pr,
    prPlausibel: pr === null ? null : pr >= 0.5 && pr <= 1.0,
    verfuegbarkeit: verf,
    ausfallKwh: Number(ausfallKwh) || 0,
  };
}

/** Ausfallenergie je Monat (JJJJ-MM) aus Störungen mit erfasstem Ertragsausfall (anteilig nach Ausfallstunden) */
export function ausfallJeMonat(stoerungen = []) {
  const erg = {};
  for (const s of stoerungen) {
    const kwh = Number(s.ertragsausfall?.ausfallKwh ?? s.ausfallKwh);
    const von = Date.parse(s.ausfallBeginn);
    const bis = Date.parse(s.ausfallEnde);
    if (!(kwh > 0) || !Number.isFinite(von) || !(bis > von)) continue;
    const dauer = bis - von;
    let t = von;
    while (t < bis) {
      const d = new Date(t);
      const naechster = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
      const ende = Math.min(bis, naechster);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      erg[key] = (erg[key] || 0) + (kwh * (ende - t)) / dauer;
      t = ende;
    }
  }
  return erg;
}

// ================================================================ Zählerablesung plausibilisieren

const monatsende = (monat) => (/^\d{4}-\d{2}$/.test(String(monat || "")) ? iso(Date.UTC(Number(monat.slice(0, 4)), Number(monat.slice(5)), 0)) : "");

/**
 * Plausibilisierung eines Zählerstand-Monatswerts (vor der Freigabe zur Contracting-Abrechnung):
 *   - Eichfrist: abgelaufen am Monatsende → fehler (nicht abrechenbar; DE § 33 MessEG, AT MEG, CH MessMV)
 *   - Monitoring-Abgleich (MQTT): Abweichung > 10 % warnung, > 25 % fehler
 *   - Prognose (nur Erzeugung): < 50 % oder > 150 % des Solls → warnung
 * eingabe: { monat, menge, monitoringKwh, sollKwh, eichgueltigBis, istErzeugung }
 */
export function plausibilisieren({ monat, menge = null, monitoringKwh = null, sollKwh = null, eichgueltigBis = "", istErzeugung = false } = {}) {
  const befunde = [];
  let eichFehler = false;
  const ende = monatsende(monat);
  if (!eichgueltigBis) befunde.push({ text: "Eichgültigkeit des Zählers nicht gepflegt – bitte am Messpunkt nachtragen.", stufe: "warnung" });
  else if (ende && ende > eichgueltigBis) {
    eichFehler = true;
    befunde.push({ text: `Eichfrist am ${eichgueltigBis.split("-").reverse().join(".")} abgelaufen – Messwerte dürfen in der Regel nicht abgerechnet werden (DE § 33 MessEG, AT MEG, CH MessMV). Zählertausch veranlassen, Menge ggf. rechnerisch ermitteln.`, stufe: "fehler" });
  }
  const m = menge === null || menge === undefined ? null : Number(menge);
  if (m === null) befunde.push({ text: "Erster Monatswert dieses Registers – die Menge ergibt sich ab dem Folgemonat.", stufe: "hinweis" });
  const mon = Number(monitoringKwh);
  if (m !== null && mon > 0) {
    const abw = (m - mon) / mon;
    const t = `Abweichung zum Monitoring ${(abw * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % (Zähler ${Math.round(m).toLocaleString("de-DE")} kWh, Monitoring ${Math.round(mon).toLocaleString("de-DE")} kWh)`;
    if (Math.abs(abw) > 0.25) befunde.push({ text: `${t} – Ablesung, Wandlerfaktor und Zählerzuordnung prüfen.`, stufe: "fehler" });
    else if (Math.abs(abw) > 0.1) befunde.push({ text: `${t}.`, stufe: "warnung" });
  }
  const soll = Number(sollKwh);
  if (istErzeugung && m !== null && soll > 0 && (m < soll * 0.5 || m > soll * 1.5)) befunde.push({ text: `Erzeugung ${Math.round((m / soll) * 100)} % der Prognose – Ausfälle bzw. Ablesung prüfen.`, stufe: "warnung" });
  const rang = { hinweis: 1, warnung: 2, fehler: 3 };
  const stufe = befunde.reduce((s, b) => (rang[b.stufe] > (rang[s] || 0) ? b.stufe : s), "ok");
  return { stufe, befunde, eichFehler, abrechenbar: !eichFehler };
}

/** Freigabe eines Monatswerts: Eichfehler blockiert (409), sonstige Fehler nur mit Begründung (422) */
export function freigabePruefen(befund, begruendung = "") {
  if (befund?.eichFehler) throw konflikt("Freigabe nicht möglich: Die Eichfrist des Zählers ist abgelaufen.");
  if (befund?.stufe === "fehler" && String(begruendung || "").trim().length < 10) throw ungueltig("Der Wert ist auffällig – bitte die Freigabe begründen (mind. 10 Zeichen).");
  return true;
}

// ================================================================ Berichtszeitraum

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** „JJJJ-MM“ (Monatsbericht) oder „JJJJ“ (Jahresbericht) → { art, von, bis (exklusiv), monate, label } */
export function berichtZeitraum(z, jetzt = Date.now()) {
  const s = String(z || "");
  const heute = new Date(jetzt);
  let von;
  let bis;
  let art;
  if (/^20\d\d-(0[1-9]|1[0-2])$/.test(s)) {
    art = "monat";
    von = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5)) - 1, 1);
    bis = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5)), 1);
  } else if (/^20\d\d$/.test(s)) {
    art = "jahr";
    von = Date.UTC(Number(s), 0, 1);
    bis = Date.UTC(Number(s) + 1, 0, 1);
  } else throw ungueltig("Zeitraum als JJJJ-MM (Monatsbericht) oder JJJJ (Jahresbericht) angeben.");
  if (von > jetzt) throw ungueltig("Der Berichtszeitraum liegt in der Zukunft.");
  const monate = [];
  for (let d = new Date(von); d.getTime() < bis; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) monate.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  const label = art === "monat" ? `${MONATE[Number(s.slice(5)) - 1]} ${s.slice(0, 4)}` : `Jahr ${s}`;
  return { art, schluessel: s, von: new Date(von).toISOString(), bis: new Date(Math.min(bis, Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), heute.getUTCDate() + 1))).toISOString(), bisVoll: new Date(bis).toISOString(), monate, label, laufend: bis > jetzt };
}

// src/lib/plattform/hr/index.js
//
// HR & interne Steuerung – Konstanten und reine Funktionen (Client, Server, Tests):
//   Abwesenheiten → automatische Vertretung, Auslastung, Zeiterfassung, Wissensdatenbank.
// Frappe spiegelt die Regeln in plattform/hr/vertretung.py. Optional mit HRMS (Employee, Holiday List,
// Leave Application, Timesheet), sonst eigene Datensätze der Plattform.

export const ABWESENHEIT_ARTEN = {
  urlaub: "Urlaub",
  krank: "Krankheit",
  fortbildung: "Fortbildung",
  dienstreise: "Dienstreise",
  sonstiges: "Sonstiges",
};
export const ABWESENHEIT_ART_IDS = Object.keys(ABWESENHEIT_ARTEN);

export const TAETIGKEITEN = {
  akquise: "Akquise & Flächensicherung",
  planung: "Planung & Genehmigung",
  netz: "Netzanschluss",
  gutachten: "Gutachten & Prüfungen",
  gemeinde: "Gemeinde & Bürgerbeteiligung",
  transaktion: "Transaktion & Datenraum",
  verwaltung: "Verwaltung",
};
export const TAETIGKEIT_IDS = Object.keys(TAETIGKEITEN);

export const WISSEN_KATEGORIEN = {
  prozesse: "Prozesse & Abläufe",
  recht: "Recht & Förderung",
  technik: "Technik & Netz",
  vertrieb: "Akquise & Kommunikation",
  vorlagen: "Vorlagen & Checklisten",
  it: "Portal & IT",
};
export const WISSEN_KATEGORIE_IDS = Object.keys(WISSEN_KATEGORIEN);

export const HR_GRENZEN = { stundenTagMax: 12, abwesenheitTageMax: 120, wissenInhalt: 20000, vertretungTiefe: 4 };

const tagTeil = (x) => String(x || "").slice(0, 10);

/** Ist der Mitarbeiter am Tag abwesend? Liefert die Abwesenheit oder null */
export function abwesenheitAm(abwesenheiten = [], kontoId, tag) {
  const t = tagTeil(tag);
  return abwesenheiten.find((a) => a.mitarbeiterId === kontoId && a.status !== "abgelehnt" && a.von <= t && t <= a.bis) || null;
}

/**
 * Vertretung für einen Mitarbeiter an einem Tag. Reihenfolge: Vertretung der Abwesenheit → Standardvertretung
 * des Mitarbeiters → (Kette bis Tiefe 4) → null, wenn niemand verfügbar ist. Feiertage gelten für alle gleich
 * und lösen daher keine Vertretung aus.
 * @param {object} p  mitarbeiterId, tag, abwesenheiten [{mitarbeiterId,von,bis,vertretungId,status}],
 *                    mitarbeiter { [kontoId]: { vertretungId, aktiv } }
 * @returns { id, kette: [ids], grund } | null  (id === mitarbeiterId, wenn anwesend)
 */
export function vertretungFinden({ mitarbeiterId, tag, abwesenheiten = [], mitarbeiter = {} }) {
  const kette = [mitarbeiterId];
  let aktuell = mitarbeiterId;
  for (let i = 0; i <= HR_GRENZEN.vertretungTiefe; i++) {
    const ab = abwesenheitAm(abwesenheiten, aktuell, tag);
    if (!ab && mitarbeiter[aktuell]?.aktiv !== false) return { id: aktuell, kette, grund: i === 0 ? "anwesend" : "vertretung" };
    const naechster = ab?.vertretungId || mitarbeiter[aktuell]?.vertretungId || null;
    if (!naechster || kette.includes(naechster)) return null;
    kette.push(naechster);
    aktuell = naechster;
  }
  return null;
}

/**
 * Auslastung (0–150 %) aus Wochenkapazität (Stunden) und Last: Termine (Minuten, nächste 7 Tage), offene Aufgaben
 * (je 1 h), offene Tickets (je 1,5 h), laufende Signaturvorgänge (je 0,25 h). Transparente Näherung für die Team-Übersicht.
 */
export function auslastung({ kapazitaetStunden = 38.5, terminMinuten = 0, aufgabenOffen = 0, ticketsOffen = 0, signaturenOffen = 0, abwesendeTage = 0 } = {}) {
  const kap = Math.max(0, kapazitaetStunden * (1 - Math.min(5, abwesendeTage) / 5));
  const last = terminMinuten / 60 + aufgabenOffen * 1 + ticketsOffen * 1.5 + signaturenOffen * 0.25;
  const prozent = kap > 0 ? Math.min(150, Math.round((last / kap) * 100)) : last > 0 ? 150 : 0;
  return { prozent, stundenLast: Math.round(last * 10) / 10, stundenKapazitaet: Math.round(kap * 10) / 10, ampel: prozent >= 100 ? "hoch" : prozent >= 75 ? "mittel" : "frei" };
}

/** Tage (inkl.) zwischen zwei Kalendertagen */
export function tageZwischen(von, bis) {
  const a = new Date(`${von}T12:00:00Z`).getTime();
  const b = new Date(`${bis}T12:00:00Z`).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) / 86400e3) + 1 : 0;
}

/** Schnittstelle Projektentwicklung/Finanzen: Stunden je Projekt und Tätigkeit summieren */
export function zeitenSummieren(eintraege = []) {
  const jeProjekt = {};
  for (const z of eintraege) {
    const k = z.projektId || z.erpProjekt || "ohne";
    const p = (jeProjekt[k] ||= { projektId: z.projektId || null, erpProjekt: z.erpProjekt || null, stunden: 0, taetigkeiten: {} });
    p.stunden = Math.round((p.stunden + Number(z.stunden || 0)) * 100) / 100;
    p.taetigkeiten[z.taetigkeit] = Math.round(((p.taetigkeiten[z.taetigkeit] || 0) + Number(z.stunden || 0)) * 100) / 100;
  }
  return Object.values(jeProjekt).sort((a, b) => b.stunden - a.stunden);
}

/** Einfache Volltextsuche (Titel stärker gewichtet) */
export function wissenTreffer(artikel, q) {
  const worte = String(q || "").toLowerCase().split(/\s+/).filter((w) => w.length >= 2).slice(0, 8);
  if (!worte.length) return 1;
  const titel = String(artikel.titel || "").toLowerCase();
  const text = `${artikel.inhalt || ""} ${(artikel.tags || []).join(" ")}`.toLowerCase();
  let punkte = 0;
  for (const w of worte) {
    if (titel.includes(w)) punkte += 3;
    else if (text.includes(w)) punkte += 1;
    else return 0;
  }
  return punkte;
}

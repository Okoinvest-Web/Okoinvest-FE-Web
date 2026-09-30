// src/lib/plattform/rechte.js
//
// Feine Rechte im Backoffice: Unterrollen für Konten mit der Rolle `admin`.
//
//   leitung      – alles (Standard für Backoffice-Konten ohne Unterrolle – rückwärtskompatibel)
//   akquise      – Anfragen, Flächen-Pipeline, CRM, Aufgaben, Vorlagen
//   transaktion  – Projekte, NDA/LOI, CRM, Aufgaben, Vorlagen
//   buchhaltung  – Provisionen, Berichte, Exporte
//   lesen        – nur lesen (keine Änderungen)
//
// Stufen je Bereich: 0 = kein Zugriff, 1 = lesen, 2 = schreiben. Mehrere Unterrollen → Maximum je Bereich.
// Durchgesetzt in allen Admin-APIs (server/route.js → adminRechtPruefen) und Admin-Seiten (server/seite.js);
// die Seitenleiste blendet Bereiche ohne Leserecht aus. Frappe: plattform/rechte.py (gleiche Tabelle).
//
// Client- und serverseitig nutzbar (keine Node-Importe).

export const BACKOFFICE_ROLLEN = {
  leitung: { label: "Leitung", text: "Vollzugriff inkl. Rechteverwaltung, Automationen und Nutzer." },
  akquise: { label: "Akquise", text: "Anfragen, Flächen-Pipeline, Gebiete, CRM, Aufgaben und Vorlagen." },
  transaktion: { label: "Transaktion", text: "Projektfreigabe, NDA & LOI, Verkauf, CRM und Aufgaben." },
  buchhaltung: { label: "Buchhaltung", text: "Provisionen und Rechnungsstatus, Berichte und Exporte." },
  lesen: { label: "Nur lesen", text: "Sieht alle Bereiche außer der Rechteverwaltung, ändert nichts." },
  betrieb: { label: "Betrieb", text: "Anlagen & Monitoring: Störungs-Leitstand, Anlagen, Geräte, Zähler und Wartung." }, // Anlagen & Monitoring
};
export const BACKOFFICE_ROLLEN_IDS = Object.keys(BACKOFFICE_ROLLEN);

export const BEREICHE = {
  cockpit: "Cockpit",
  vorgaenge: "Vorgänge",
  flaechen: "Flächen",
  akquise: "Akquise & Gebiete",
  projekte: "Projekte",
  interessen: "NDA & LOI",
  provisionen: "Provisionen",
  aufgaben: "Aufgaben",
  crm: "CRM",
  vorlagen: "Vorlagen",
  automationen: "Automationen",
  berichte: "Berichte",
  export: "CSV-Export",
  postausgang: "Postausgang",
  nutzer: "Nutzer",
  protokoll: "Protokoll",
  rechte: "Rechte",
  anlagen: "Anlagen & Monitoring", // Anlagen & Monitoring
  sonstiges: "Weitere Admin-Funktionen",
};
export const BEREICH_IDS = Object.keys(BEREICHE);

// Reihenfolge der Spalten: leitung, akquise, transaktion, buchhaltung, lesen
const M = {
  cockpit: [2, 1, 1, 1, 1],
  vorgaenge: [2, 2, 1, 1, 1],
  flaechen: [2, 2, 1, 0, 1],
  akquise: [2, 2, 1, 0, 1],
  projekte: [2, 1, 2, 1, 1],
  interessen: [2, 0, 2, 1, 1],
  provisionen: [2, 0, 1, 2, 1],
  aufgaben: [2, 2, 2, 2, 1],
  crm: [2, 2, 2, 1, 1],
  vorlagen: [2, 2, 2, 1, 1],
  automationen: [2, 1, 1, 0, 1],
  berichte: [2, 1, 1, 2, 1],
  export: [2, 1, 1, 1, 0],
  postausgang: [2, 1, 1, 0, 1],
  nutzer: [2, 1, 1, 1, 1],
  protokoll: [2, 1, 1, 1, 1],
  rechte: [2, 0, 0, 0, 0],
  anlagen: [2, 0, 0, 1, 1], // Anlagen & Monitoring (Buchhaltung: Verträge/Zähler lesen)
  sonstiges: [2, 1, 1, 1, 1],
};
// Anlagen & Monitoring: Spalte „betrieb“ (6.) – nur Anlagen schreiben, Cockpit/Aufgaben/Nutzer lesen bzw. Aufgaben schreiben
const BETRIEB_SPALTE = { cockpit: 1, aufgaben: 2, anlagen: 2, nutzer: 1 };
for (const [b, z] of Object.entries(M)) if (z.length < 6) z[5] = BETRIEB_SPALTE[b] ?? 0;
const SPALTE = { leitung: 0, akquise: 1, transaktion: 2, buchhaltung: 3, lesen: 4, betrieb: 5 };

/** Rechte-Matrix { bereich: { rolle: stufe } } – für Anzeige und Prüfung */
export const RECHTE_MATRIX = Object.fromEntries(
  Object.entries(M).map(([b, stufen]) => [b, Object.fromEntries(BACKOFFICE_ROLLEN_IDS.map((r) => [r, stufen[SPALTE[r]]]))])
);

/** Unterrollen eines Kontos (ohne Angabe → leitung). Nicht-Admins → [] */
export function unterrollen(n) {
  if (!n?.rollen?.includes("admin")) return [];
  const r = (Array.isArray(n.backofficeRollen) ? n.backofficeRollen : String(n.backofficeRollen || "").split(","))
    .map((x) => String(x).trim())
    .filter((x) => BACKOFFICE_ROLLEN[x]);
  return r.length ? [...new Set(r)] : ["leitung"];
}

/** Stufe (0–2) eines Kontos in einem Bereich */
export function stufe(n, bereich) {
  const zeile = RECHTE_MATRIX[bereich] || RECHTE_MATRIX.sonstiges;
  return unterrollen(n).reduce((m, r) => Math.max(m, zeile[r] ?? 0), 0);
}

export const darfLesen = (n, bereich) => stufe(n, bereich) >= 1;
export const darfSchreiben = (n, bereich) => stufe(n, bereich) >= 2;

/** Bereich je Objektart (Statuswechsel, Zuweisung, Aufgaben am Objekt, Export) */
export const BEREICH_FUER_ART = {
  vorgang: "vorgaenge",
  flaeche: "flaechen",
  projekt: "projekte",
  interesse: "interessen",
  provision: "provisionen",
  vorgaenge: "vorgaenge",
  flaechen: "flaechen",
  projekte: "projekte",
  interessen: "interessen",
  provisionen: "provisionen",
};

/** Bereich einer Admin-API aus dem Pfad (/api/admin/<teil>/…) */
const API_BEREICH = {
  uebersicht: "cockpit",
  vorgaenge: "vorgaenge",
  flaechen: "flaechen",
  projekte: "projekte",
  interessen: "interessen",
  provisionen: "provisionen",
  aufgaben: "aufgaben",
  nutzer: "nutzer",
  "demo-links": "nutzer",
  aktivitaeten: "protokoll",
  protokoll: "protokoll",
  postausgang: "postausgang",
  crm: "crm",
  akquise: "akquise",
  gebiete: "akquise",
  automationen: "automationen",
  vorlagen: "vorlagen",
  berichte: "berichte",
  rechte: "rechte",
  dealroom: "interessen", // Deal-Room (Q&A, Datenraum) – Transaktion
  bieter: "interessen", // Bieterverfahren – Transaktion
  anlagen: "anlagen", // Anlagen & Monitoring
};

/**
 * Welche Rechte braucht eine Admin-API? Liefert [{ bereich, stufe }] (alle müssen erfüllt sein).
 * `body` wird für Status/Zuweisung (Objektart) und Aufgaben mit Bezug ausgewertet.
 */
export function apiAnforderungen({ pfad, methode = "GET", body, params = {}, recht } = {}) {
  const schreiben = !["GET", "HEAD", "OPTIONS"].includes(String(methode).toUpperCase());
  const teile = String(pfad || "").split("?")[0].split("/").filter(Boolean); // ["api","admin",teil,…]
  const teil = teile[2] || "";
  const st = schreiben ? 2 : 1;
  if (recht) return [].concat(recht).map((r) => (typeof r === "string" ? { bereich: r, stufe: st } : r));
  if (teil === "status" || teil === "zuweisen") {
    return [{ bereich: BEREICH_FUER_ART[body?.art] || "sonstiges", stufe: 2 }];
  }
  if (teil === "export") {
    const art = params?.art || teile[3];
    return [{ bereich: "export", stufe: 1 }, { bereich: BEREICH_FUER_ART[art] || "sonstiges", stufe: 1 }];
  }
  if (teil === "berichte") return [{ bereich: "berichte", stufe: 1 }]; // PDF/CSV-Abruf ist Lesen
  const anf = [{ bereich: API_BEREICH[teil] || "sonstiges", stufe: st }];
  if (teil === "aufgaben" && schreiben && body?.bezugArt && BEREICH_FUER_ART[body.bezugArt]) {
    anf.push({ bereich: BEREICH_FUER_ART[body.bezugArt], stufe: 1 });
  }
  if (teil === "automationen" && teile[3] === "testlauf") anf[0].stufe = 1; // Testlauf ändert nichts
  if (teil === "vorlagen" && teile[3] === "vorschau") anf[0].stufe = 1;
  return anf;
}

/** Fehlende Rechte (leer = erlaubt) */
export function fehlendeRechte(n, anforderungen) {
  return anforderungen.filter((a) => stufe(n, a.bereich) < a.stufe);
}

/** Bereich einer Admin-Seite (/portal/admin/<teil>) */
const SEITEN_BEREICH = {
  "": "cockpit",
  aufgaben: "aufgaben",
  vorgaenge: "vorgaenge",
  flaechen: "flaechen",
  akquise: "akquise",
  projekte: "projekte",
  interessen: "interessen",
  deals: "provisionen",
  nutzer: "nutzer",
  postausgang: "postausgang",
  crm: "crm",
  automationen: "automationen",
  vorlagen: "vorlagen",
  berichte: "berichte",
  protokoll: "protokoll",
  rechte: "rechte",
  anlagen: "anlagen", // Anlagen & Monitoring
};

export function seitenBereich(pfad) {
  const teile = String(pfad || "").split("?")[0].split("/").filter(Boolean); // ["portal","admin",teil]
  if (teile[0] !== "portal" || teile[1] !== "admin") return null;
  return SEITEN_BEREICH[teile[2] || ""] || "sonstiges";
}

export const STUFE_LABEL = ["–", "lesen", "schreiben"];

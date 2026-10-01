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
  compliance: { label: "Compliance", text: "KYC/KYB: Verifizierungen prüfen, Unterlagen einsehen, Sanktionsabgleich, Risikoeinstufung." }, // KYC/KYB
  projektleitung: { label: "Projektleitung", text: "Projektentwicklung: Entwicklungsprojekte, Meilensteine, Risiken, Kosten, Gutachter; CRM und Aufgaben." }, // Projektentwicklung
  energie: { label: "Energie", text: "Energiebeschaffung: Handelsdesk, Terminkurve, Pool-Portfolio, Kundenanalyse, Ausschreibungen, Lieferantenstamm." }, // Energiebeschaffung
  eg: { label: "Energiegemeinschaften", text: "Betriebsführung und Gründung von Energiegemeinschaften (ElWG): Stammdaten, Mitglieder, Zählpunkte, EDA, Abrechnung als Organisator." }, // Energiegemeinschaften ElWG (WP1)
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
  compliance: "Compliance (KYC/KYB)", // KYC/KYB
  entwicklung: "Projektentwicklung", // Projektentwicklung
  finanzen: "Finanzen & Abrechnung", // ERPNext-Finanzen & Abrechnung
  finanzierung: "Finanzierung & Banken", // Bankfinanzierung Eigenbetrieb, Covenants, Geschäftsmodell
  signatur: "Elektronische Unterschrift", kalender: "Termine & Kalender", support: "Service & Support", team: "Team & HR", wissen: "Wissensdatenbank", // Dokumente, Signatur, Termine, Service & HR
  gesellschaften: "Gesellschaften & SPV-Gründung", bonitaet: "Bonitätsauskünfte", register: "Registerauskünfte", // Dienste: Firmen, Bonität, Identität
  geodaten: "Geodaten & Akquise-Karte", // Geodaten & Akquise-Engine
  sonstiges: "Weitere Admin-Funktionen",
  energie: "Energiebeschaffung", // Energiebeschaffung & Versorger-Ausschreibung
  grundbuch: "Grundbuch & Dienstbarkeiten", closing: "Deal-Abschluss (Closing)", // Grundbuch & Closing
  genossenschaft: "Genossenschaft & Energiegemeinschaften", kommunen: "Kommunen & Gemeinden", // Mitglied/Genossenschaft und Gemeindecockpit (Team 5)
  pachtakte: "Pachtakten (Kündigung, Eigentümerwechsel, Rückbau)", // Team 1: Pachtakte nach Vertragsschluss
  portfolio: "Portfolio & Beteiligungen", // Investor-Portfolio nach dem Kauf (Kapitalabrufe, Ausschüttungen, Berichte)
  eg: "Energiegemeinschaften (ElWG)", // Energiegemeinschaften ElWG (WP1): /portal/admin/eg, /api/admin/eg
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
  entwicklung: [2, 1, 1, 1, 1], // Projektentwicklung (Akquise/Transaktion/Buchhaltung/Lesen: nur lesen)
  compliance: [1, 0, 0, 0, 0], // KYC/KYB: Leitung sieht Warteschlange/Status (keine Unterlagen), sonst nur Unterrolle „compliance“
  finanzen: [2, 0, 1, 2, 1, 0, 0, 1], // ERPNext-Finanzen & Abrechnung: Buchhaltung/Leitung schreiben (Läufe, SEPA), Transaktion/Lesen/Projektleitung lesen
  finanzierung: [2, 0, 2, 2, 1, 0, 0, 1], // Bankfinanzierung: Leitung/Transaktion/Buchhaltung schreiben (Entscheidung nur Leitung), Lesen/Projektleitung lesen
  // Signatur, Termine, Service & HR – alle 8 Spalten (leitung, akquise, transaktion, buchhaltung, lesen, betrieb, compliance, projektleitung)
  signatur: [2, 2, 2, 1, 1, 0, 1, 1],
  kalender: [2, 2, 2, 1, 1, 2, 1, 2],
  support: [2, 1, 1, 1, 1, 2, 1, 1],
  team: [2, 1, 1, 1, 1, 1, 1, 1],
  wissen: [2, 2, 2, 2, 1, 2, 2, 2],
  // Dienste – alle 8 Spalten (leitung, akquise, transaktion, buchhaltung, lesen, betrieb, compliance, projektleitung)
  gesellschaften: [2, 0, 2, 1, 1, 0, 0, 1], // SPV-Gründung: Leitung/Transaktion schreiben
  bonitaet: [2, 0, 2, 0, 0, 0, 2, 0], // Bonität: nur Leitung, Transaktion, Compliance (Ergebnisse vertraulich)
  register: [2, 1, 2, 1, 1, 0, 2, 1], // Registerabruf (Firmenbuch/Handelsregister/Zefix)
  geodaten: [2, 2, 0, 0, 0, 0, 0, 0], // Geodaten & Akquise-Karte: nur Leitung und Akquise (Flächenkandidaten, Export, Übernahme)
  // Grundbuch & Closing – 8 Spalten (leitung, akquise, transaktion, buchhaltung, lesen, betrieb, compliance, projektleitung)
  grundbuch: [2, 2, 2, 1, 1, 1, 0, 2], // Dienstbarkeiten: Akquise/Transaktion/Projektleitung schreiben, Betrieb (Anlagen) lesen
  closing: [2, 0, 2, 1, 1, 0, 1, 1], // Deal-Abschluss: Leitung/Transaktion schreiben, Buchhaltung/Compliance/Projektleitung lesen
  pachtakte: [2, 2, 1, 2, 1, 1, 0, 1], // Pachtakten: Leitung/Akquise/Buchhaltung schreiben, Transaktion/Lesen/Betrieb/Projektleitung lesen
  portfolio: [2, 0, 2, 2, 1, 1, 0, 1], // Portfolio: Leitung/Transaktion/Buchhaltung schreiben, Lesen/Betrieb/Projektleitung lesen
  sonstiges: [2, 1, 1, 1, 1],
};
// Anlagen & Monitoring: Spalte „betrieb“ (6.) – nur Anlagen schreiben, Cockpit/Aufgaben/Nutzer lesen bzw. Aufgaben schreiben
const BETRIEB_SPALTE = { cockpit: 1, aufgaben: 2, anlagen: 2, nutzer: 1 };
for (const [b, z] of Object.entries(M)) if (z.length < 6) z[5] = BETRIEB_SPALTE[b] ?? 0;
// KYC/KYB: Spalte „compliance“ (7.) – Compliance schreiben, Cockpit/Nutzer/Protokoll lesen, Aufgaben schreiben
const COMPLIANCE_SPALTE = { cockpit: 1, aufgaben: 2, nutzer: 1, protokoll: 1, compliance: 2 };
for (const [b, z] of Object.entries(M)) if (z.length < 7) { if (z.length < 6) z[5] = 0; z[6] = COMPLIANCE_SPALTE[b] ?? 0; }
// Projektentwicklung: Spalte „projektleitung“ (8.) – Entwicklung und CRM schreiben, Aufgaben schreiben, übrige Kernbereiche lesen
const PROJEKTLEITUNG_SPALTE = { cockpit: 1, aufgaben: 2, flaechen: 1, akquise: 1, projekte: 1, crm: 2, vorlagen: 1, berichte: 1, nutzer: 1, entwicklung: 2 };
for (const [b, z] of Object.entries(M)) if (z.length < 8) { while (z.length < 7) z.push(0); z[7] = PROJEKTLEITUNG_SPALTE[b] ?? 0; }
// Energiebeschaffung: Bereich „energie“ (Leitung schreiben, Buchhaltung/Lesen lesen) und Spalte „energie“ – Energie
// schreiben, CRM/Aufgaben schreiben, Cockpit/Nutzer/Berichte/Vorgänge lesen. Spalte = nächste freie Position.
M.energie = M.energie || [2, 0, 0, 1, 1];
const ENERGIE_SPALTE = { cockpit: 1, vorgaenge: 1, aufgaben: 2, crm: 2, vorlagen: 1, berichte: 1, nutzer: 1, energie: 2, kalender: 2, wissen: 1 };
const SPALTE = { leitung: 0, akquise: 1, transaktion: 2, buchhaltung: 3, lesen: 4, betrieb: 5, compliance: 6, projektleitung: 7, energie: 8 };
for (const z of Object.values(M)) { while (z.length < 8) z.push(0); }
for (const [b, z] of Object.entries(M)) z[8] = ENERGIE_SPALTE[b] ?? 0; // Energiebeschaffung
// Mitglied/Genossenschaft und Gemeindecockpit (Team 5) – alle 9 Spalten (leitung, akquise, transaktion, buchhaltung, lesen,
// betrieb, compliance, projektleitung, energie): Genossenschaft schreiben Leitung/Buchhaltung (Einzahlungen, Ausschüttungen)
// und Energie (Energiegemeinschaften), Compliance liest; Kommunen schreiben Leitung/Akquise/Projektleitung.
M.genossenschaft = [2, 1, 1, 2, 1, 0, 1, 0, 2];
M.kommunen = [2, 2, 1, 1, 1, 0, 0, 2, 0];
// Energiegemeinschaften ElWG (WP1): Bereich „eg“ (Leitung schreiben; Buchhaltung, Lesen, Compliance, Energie lesen) und Spalte
// „eg“ (10.) – Betriebsführung/Organisator: eg schreiben, CRM/Aufgaben/Signatur/Kalender schreiben, Kernbereiche lesen.
M.eg = [2, 0, 0, 1, 1, 0, 1, 0, 1];
const EG_SPALTE = { cockpit: 1, vorgaenge: 1, aufgaben: 2, crm: 2, vorlagen: 1, berichte: 1, nutzer: 1, signatur: 2, kalender: 2, support: 1, wissen: 1, genossenschaft: 1, kommunen: 1, eg: 2 };
SPALTE.eg = 9;
for (const [b, z] of Object.entries(M)) { while (z.length < 9) z.push(0); z[9] = EG_SPALTE[b] ?? 0; }

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
  compliance: "compliance", // KYC/KYB
  entwicklung: "entwicklung", // Projektentwicklung
  finanzen: "finanzen", // ERPNext-Finanzen & Abrechnung
  finanzierung: "finanzierung", // Bankfinanzierung Eigenbetrieb
  signatur: "signatur", termine: "kalender", support: "support", hr: "team", wissen: "wissen", // Signatur, Termine, Service & HR
  gesellschaften: "gesellschaften", bonitaet: "bonitaet", register: "register", // Dienste: Firmen, Bonität, Identität
  geodaten: "geodaten", // Geodaten & Akquise-Engine
  energie: "energie", // Energiebeschaffung & Versorger-Ausschreibung
  grundbuch: "grundbuch", closing: "closing", // Grundbuch & Closing
  genossenschaft: "genossenschaft", energiegemeinschaften: "genossenschaft", kommunen: "kommunen", // Team 5: Genossenschaft, Energiegemeinschaften, Kommunen
  gutachter: "entwicklung", // Gutachteraufträge (Angebot, Beauftragung, Abnahme, Rechnung) – Zahlung zusätzlich „finanzen“ (Route)
  pachtakte: "pachtakte", // Pachtakte (Team 1)
  portfolio: "portfolio", // Investor-Portfolio
  eg: "eg", // Energiegemeinschaften ElWG (WP1–WP6): /api/admin/eg/**
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
  dealroom: "interessen", // Deal-Room-Übersicht (Gebote, Q&A, Zugriffe) – wie die API /api/admin/dealroom
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
  compliance: "compliance", // KYC/KYB
  entwicklung: "entwicklung", // Projektentwicklung
  finanzen: "finanzen", // ERPNext-Finanzen & Abrechnung
  finanzierung: "finanzierung", // Bankfinanzierung Eigenbetrieb
  kalender: "kalender", support: "support", team: "team", wissen: "wissen", // Termine, Service & HR
  gesellschaften: "gesellschaften", bonitaet: "bonitaet", // Dienste: Firmen, Bonität, Identität
  energie: "energie", // Energiebeschaffung
  grundbuch: "grundbuch", closing: "closing", // Grundbuch & Closing
  genossenschaft: "genossenschaft", energiegemeinschaften: "genossenschaft", kommunen: "kommunen", // Team 5: Genossenschaft, Energiegemeinschaften, Kommunen
  gutachter: "entwicklung", // Gutachteraufträge (Angebot, Beauftragung, Abnahme, Rechnung) – Zahlung zusätzlich „finanzen“ (Route)
  pachtakten: "pachtakte", // Pachtakte (Team 1)
  portfolio: "portfolio", // Investor-Portfolio
  eg: "eg", // Energiegemeinschaften ElWG (WP1–WP6): /portal/admin/eg/**
  hinweis: "cockpit", // Team 8: vertraulicher Geldwäsche-Hinweis an Compliance (alle Backoffice-Rollen)
};

export function seitenBereich(pfad) {
  const teile = String(pfad || "").split("?")[0].split("/").filter(Boolean); // ["portal","admin",teil]
  if (teile[0] !== "portal" || teile[1] !== "admin") return null;
  if (teile[2] === "akquise" && ["karte", "kampagnen", "gemeinden", "sperrliste"].includes(teile[3])) return "geodaten"; // Geodaten & Akquise-Karte, Kampagnen, Gemeinde-Screening (A1b)
  return SEITEN_BEREICH[teile[2] || ""] || "sonstiges";
}

export const STUFE_LABEL = ["–", "lesen", "schreiben"];

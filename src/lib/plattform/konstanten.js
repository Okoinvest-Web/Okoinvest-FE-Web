// src/lib/plattform/konstanten.js
//
// Stammlisten der Plattform (Rollen, Typen, Status-Bezeichnungen, Länder).
// Client- und serverseitig nutzbar – keine Node-Importe.

/** Rollen eines Kontos (mehrere je Konto möglich). `admin` ist nie selbst wählbar. */
export const ROLLEN = [
  { id: "flaeche", label: "Flächeneigentümer", kurz: "Fläche", text: "Fläche verpachten oder einbringen – Status von der Vorprüfung bis zum Betrieb verfolgen." },
  { id: "landwirt", label: "Landwirt", kurz: "Landwirt", text: "Agri-PV auf dem eigenen Betrieb: verpachten, selbst investieren oder Mitglied der Genossenschaft werden." },
  { id: "investor", label: "Investor", kurz: "Investor", text: "Projekte in allen Phasen prüfen, Suchprofil hinterlegen, NDA und Datenraum digital." },
  { id: "anbieter", label: "Projektentwickler / Anbieter", kurz: "Anbieter", text: "Projekte in die Börse stellen – geprüft, vertraulich, Provision nur bei Abschluss." },
  { id: "unternehmen", label: "Unternehmen", kurz: "Unternehmen", text: "Reststrom-Pool, Solarcarport oder Speicher: Anfragen und Angebote an einem Ort." },
  { id: "mitglied", label: "Mitglied / Bürger", kurz: "Mitglied", text: "Genossenschaft und Energiegemeinschaften: Beteiligung und Status einsehen." },
  { id: "kommune", label: "Kommune / Gemeinde", kurz: "Kommune", text: "Projekte im Gemeindegebiet ab Planung, Beteiligungsmodelle und Bauleitplanung begleiten." }, // Onboarding B1: eigene Rolle (vorher „unternehmen“)
];

export const ROLLE_ADMIN = { id: "admin", label: "Backoffice", kurz: "Admin" };
export const ROLLEN_IDS = ROLLEN.map((r) => r.id);
export const ALLE_ROLLEN_IDS = [...ROLLEN_IDS, "admin"];
export const rolleLabel = (id) => (id === "admin" ? ROLLE_ADMIN.label : id === ROLLE_GUTACHTER.id ? ROLLE_GUTACHTER.label : id === ROLLE_LIEFERANT.id ? ROLLE_LIEFERANT.label : id === "bank" ? "Bank / Finanzierungspartner" : ROLLEN.find((r) => r.id === id)?.label || id);
/** Projektentwicklung: externe Rolle „Gutachter / Planer“ – nicht selbst wählbar, nur per Einladung zu einem Entwicklungsprojekt */
export const ROLLE_GUTACHTER = { id: "gutachter", label: "Gutachter / Planer", kurz: "Gutachter" };
/** Energiebeschaffung: externe Rolle „Energieversorger / Lieferant“ – nicht selbst wählbar, nur per Einladung aus dem Lieferantenstamm */
export const ROLLE_LIEFERANT = { id: "lieferant", label: "Energieversorger / Lieferant", kurz: "Lieferant" };
/** Bankfinanzierung Eigenbetrieb: externe Rolle „Bank“ – nicht selbst wählbar, nur per Einladung zu einer Finanzierungsanfrage (sieht nur das freigegebene Bankenpaket) */
export const ROLLE_BANK = { id: "bank", label: "Bank / Finanzierungspartner", kurz: "Bank" };

/** Anfragetypen laut Formularvertrag (docs/BRIEFING.md) */
export const VORGANG_TYPEN = {
  flaeche: "Fläche verpachten",
  agri: "Agri-PV",
  investor: "Investment",
  projekt: "Projekt anbieten",
  reststrom: "Reststrom-Pool",
  energiegemeinschaft: "Energiegemeinschaft",
  genossenschaft: "Genossenschaft",
  kommune: "Kommune",
  carport: "Solarcarport",
  speicher: "Großspeicher",
  kontakt: "Allgemeine Anfrage",
};
export const VORGANG_TYP_IDS = Object.keys(VORGANG_TYPEN);

/** Rolle, die zu einem Anfragetyp passt (Registrierung nach Anfrage) */
export const ROLLE_FUER_TYP = {
  flaeche: "flaeche",
  agri: "landwirt",
  investor: "investor",
  projekt: "anbieter",
  reststrom: "unternehmen",
  carport: "unternehmen",
  speicher: "unternehmen",
  kommune: "kommune", // Onboarding B1: eigene Rolle Kommune
  genossenschaft: "mitglied",
  energiegemeinschaft: "mitglied",
  kontakt: "flaeche",
};

export const PROJEKT_TYPEN = {
  freiflaeche: "Freiflächen-PV",
  agri: "Agri-PV",
  carport: "Solarcarport / Parkplatz",
  speicher: "Batteriegroßspeicher",
  hybrid: "PV mit Speicher",
  dach: "Dach-PV (Gewerbe/Halle)",
};
export const PROJEKT_TYP_IDS = Object.keys(PROJEKT_TYPEN);

export const LAENDER = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
export const LAND_IDS = Object.keys(LAENDER);

export const BUNDESLAENDER = {
  DE: [
    "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen", "Mecklenburg-Vorpommern",
    "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
  ],
  AT: ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"],
  CH: [
    "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft", "Basel-Stadt", "Bern", "Freiburg", "Genf", "Glarus",
    "Graubünden", "Jura", "Luzern", "Neuenburg", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen", "Tessin",
    "Thurgau", "Uri", "Waadt", "Wallis", "Zug", "Zürich",
  ],
};

export const NETZANSCHLUSS = {
  offen: "Noch nicht angefragt",
  angefragt: "Netzanfrage gestellt",
  zusage: "Netzanschlusszusage liegt vor",
  reserviert: "Kapazität reserviert",
  vorhanden: "Anschluss vorhanden (Bestand)",
};

export const FLAECHE_NUTZUNG = {
  acker: "Ackerland",
  gruenland: "Grünland",
  konversion: "Konversionsfläche",
  gewerbe: "Gewerbe- / Parkfläche",
  sonstige: "Sonstige",
  dach: "Dachfläche",
};

export const PREIS_MODUS = {
  gesamt: "Kaufpreis gesamt",
  proKwp: "Preis je kWp",
  anfrage: "Auf Anfrage",
};

export const DOKUMENT_KATEGORIEN = {
  allgemein: "Allgemein",
  datenraum: "Datenraum (nur nach NDA)",
  vertrag: "Vertrag / Angebot",
  plan: "Lageplan / Karte",
};

/** Beziehungsarten für Nachrichten und Dokumente */
export const BEZUG_ARTEN = ["vorgang", "flaeche", "projekt", "interesse", "nutzer"];
export const BEZUG_LABEL = { vorgang: "Anfrage", flaeche: "Fläche", projekt: "Projekt", interesse: "Projektinteresse", nutzer: "Allgemein" };

/** Upload-Regeln (Demo und Frappe identisch) */
export const UPLOAD = {
  maxBytes: 10 * 1024 * 1024,
  typen: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" },
};

/** Text der Klick-NDA – Version wird mit Zeitstempel und IP protokolliert. */
export const NDA = {
  version: "2026-09",
  titel: "Vertraulichkeitsvereinbarung (Klick-NDA)",
  absaetze: [
    "Ich verpflichte mich, alle Informationen und Unterlagen zu diesem Projekt, die mir über die Projektbörse von ÖkoInvest zugänglich gemacht werden, vertraulich zu behandeln und ausschließlich zur Prüfung eines möglichen Erwerbs bzw. einer Beteiligung zu verwenden.",
    "Eine Weitergabe an Dritte ist nur an Berater (Rechtsanwälte, Steuerberater, finanzierende Banken) zulässig, die ihrerseits zur Verschwiegenheit verpflichtet sind.",
    "Ich werde den Projektanbieter, Flächeneigentümer, Netzbetreiber oder die Standortgemeinde nicht ohne vorherige Abstimmung mit ÖkoInvest direkt kontaktieren (Umgehungsschutz).",
    "Die Verpflichtung gilt für zwei Jahre ab Annahme. Auf Verlangen lösche ich erhaltene Unterlagen.",
  ],
  // ENTWURF – Wortlaut vor Livegang juristisch prüfen lassen (siehe docs/PLATTFORM.md).
};

/** Provisionsvereinbarung für Anbieter – Text wird mit Zeitstempel und IP protokolliert. */
export const PROVISIONS_VEREINBARUNG = {
  version: "2026-09",
};

/**
 * Benachrichtigungen (Glocke im Portal-Kopf) – Ereignisarten.
 * `mail`: Standard für den E-Mail-Versand (je Konto änderbar), `admin`: nur für das Backoffice relevant.
 */
export const BENACHRICHTIGUNG_ARTEN = {
  status: { label: "Statuswechsel", text: "Ihr Vorgang, Ihre Fläche oder Ihr Projekt hat einen neuen Status.", mail: true },
  nachricht: { label: "Neue Nachrichten", text: "Das Backoffice hat Ihnen geschrieben oder ein Dokument bereitgestellt.", mail: true },
  nda: { label: "NDA-Freigabe & Datenraum", text: "Ihr Datenraum wurde freigegeben oder Ihre LOI beantwortet.", mail: true, rollen: ["investor"] },
  suchprofil: { label: "Neue passende Projekte", text: "Ein neu veröffentlichtes Projekt passt zu Ihrem Suchprofil.", mail: true, rollen: ["investor"] },
  anfrage: { label: "Neue Anfragen", text: "Über die Website ist eine neue Anfrage eingegangen.", mail: true, admin: true },
  aufgabe: { label: "Aufgaben & Wiedervorlagen", text: "Ihnen wurde eine Aufgabe zugewiesen oder eine Wiedervorlage ist fällig.", mail: true, admin: true },
  // Login, Sicherheit & Teams: E-Mail immer (nicht abschaltbar, daher nicht in den Einstellungen)
  sicherheit: { label: "Sicherheit & Anmeldungen", text: "Anmeldung von einem neuen Gerät, Zwei-Faktor, E-Mail-Änderung, Kontosperre.", mail: true, fest: true },
  // Anlagen & Monitoring: neue Störung an einer eigenen Anlage (Kunde) bzw. an einer betreuten Anlage (Backoffice)
  stoerung: { label: "Anlagenstörungen", text: "An einer Ihrer PV-Anlagen oder Speicher wurde eine Störung erkannt.", mail: true, rollen: ["unternehmen"] },
  // Projektentwicklung: Fortschritt „Wo steht mein Projekt?“ (Eigentümer, Co-Investoren), Fristen und Gutachten-Aufträge
  entwicklung: { label: "Projektentwicklung", text: "Fortschritt Ihres Projekts, fällige Fristen und zugewiesene Gutachten.", mail: true, rollen: ["flaeche", "landwirt", "investor", "gutachter"] },
  // Dokumente, Signatur, Termine, Service & HR
  signatur: { label: "Elektronische Unterschrift", text: "Ein Dokument liegt zur Unterschrift bereit, wurde unterschrieben oder widerrufen.", mail: true },
  termin: { label: "Termine", text: "Terminbestätigung, Umbuchung, Absage und Erinnerung.", mail: true },
  ticket: { label: "Support-Anfragen", text: "Antworten und Statuswechsel zu Ihren Support-Tickets.", mail: true },
  // ERPNext-Finanzen & Abrechnung: neue Pachtabrechnung/Rechnung, Zahlung ausgeführt bzw. eingegangen, Zahlungserinnerung
  abrechnung: { label: "Abrechnungen & Zahlungen", text: "Neue Pachtabrechnung, Rechnung, Zahlungseingang oder Zahlungserinnerung.", mail: true, rollen: ["flaeche", "landwirt", "unternehmen", "anbieter"] },
  // Energiebeschaffung: Fristen des Stromvertrags, Ausschreibung/Freigabe (Kunde), Angebotsanfragen und Ergebnisse (Lieferant)
  energie: { label: "Energiebeschaffung", text: "Kündigungsfristen, Angebotsvergleich zur Freigabe, Angebotsanfragen, Fristen und Zuschläge.", mail: true, rollen: ["unternehmen", "lieferant"] },
  // Finanzierung: Bankfinanzierung (Anfrage, Term Sheet, Entscheidung, Covenant-Ampel) – Bank und Backoffice
  finanzierung: { label: "Finanzierung & Banken", text: "Finanzierungsanfragen, Term Sheets, Entscheidungen und Covenant-Frühwarnungen.", mail: true, rollen: ["bank", "investor"] },
  // Portfolio: Kapitalabrufe, Ausschüttungen, neue Dokumente/Berichte, Covenant-Hinweise zu gekauften Anlagen und Beteiligungen
  portfolio: { label: "Portfolio & Beteiligungen", text: "Kapitalabrufe, Ausschüttungen, neue Dokumente und Covenant-Hinweise zu Ihren Anlagen und Beteiligungen.", mail: true, rollen: ["investor"] },
};
export const BENACHRICHTIGUNG_ART_IDS = Object.keys(BENACHRICHTIGUNG_ARTEN);

/** Standard-Einstellungen „per E-Mail benachrichtigen“ je Ereignisart */
export function mailEinstellungenStandard() {
  return Object.fromEntries(Object.entries(BENACHRICHTIGUNG_ARTEN).map(([k, a]) => [k, !!a.mail]));
}

/** Ereignisarten, die für ein Konto mit diesen Rollen sichtbar/einstellbar sind */
export function benachrichtigungArtenFuer(rollen = []) {
  const admin = rollen.includes("admin");
  return BENACHRICHTIGUNG_ART_IDS.filter((k) => {
    const a = BENACHRICHTIGUNG_ARTEN[k];
    if (a.fest) return false; // immer per E-Mail, nicht einstellbar
    if (a.admin) return admin;
    if (a.rollen) return admin || a.rollen.some((r) => rollen.includes(r));
    return true;
  });
}

/** Aufgaben / Wiedervorlagen im Backoffice */
export const AUFGABE_STATUS = { offen: "Offen", erledigt: "Erledigt" };
export const AUFGABE_BEZUG_ARTEN = ["vorgang", "flaeche", "projekt", "interesse"];

/** Suchprofil-Alarm: Standard-Schwelle des Matching-Scores (Investor kann 50–100 wählen) */
export const SUCHPROFIL_SCHWELLE = { standard: 70, min: 50, max: 100 };

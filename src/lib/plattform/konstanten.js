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
];

export const ROLLE_ADMIN = { id: "admin", label: "Backoffice", kurz: "Admin" };
export const ROLLEN_IDS = ROLLEN.map((r) => r.id);
export const ALLE_ROLLEN_IDS = [...ROLLEN_IDS, "admin"];
export const rolleLabel = (id) => (id === "admin" ? ROLLE_ADMIN.label : ROLLEN.find((r) => r.id === id)?.label || id);

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
  kommune: "unternehmen",
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

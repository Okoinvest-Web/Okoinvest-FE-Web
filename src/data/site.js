// src/data/site.js
//
// Zentrale Stammdaten der ÖkoInvest-Website. Alles, was an mehreren Stellen
// erscheint (Domain, Registerdaten, Kontakt, Kennzahlen), steht NUR hier.
//
// QUELLEN: Registerangaben aus dem österreichischen Firmenbuch (FN 541505g,
// Landesgericht Ried im Innkreis) – identisch mit src/data/unternehmen.js der
// Ökovolt-DE-Website. Geschäftsführung laut Unternehmenskommunikation.
//
// PLATZHALTER (vor Livegang prüfen – Komponenten blenden null-Werte aus):
//   - SITE.url               Produktivdomain noch nicht festgelegt
//   - KONTAKT.telefon/email  noch nicht freigegeben
//   - UID-Nummer             noch nicht hinterlegt

export const SITE = {
  name: "ÖkoInvest",
  firma: "ÖkoInvest GmbH",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.oekoinvest.com").replace(/\/$/, ""),
  claim: "Flächen. Projekte. Kapital. Strom.",
  kurz: "Projektentwicklung für Freiflächen-PV, Agri-PV und Solarcarports – mit Projektbörse, Investoren-Plattform und virtuellem Kraftwerk für den Mittelstand.",
  gruppe: "ÖKOVOLT Gruppe",
  gruppeUrl: "https://www.oekovolt.de",
  gruppeAtUrl: "https://www.oekovolt.com",
};

export const GESELLSCHAFT = {
  name: "ÖkoInvest GmbH",
  sitz: "Gewerbegebiet 10",
  plz: "5121",
  ort: "Ostermiething",
  land: "Österreich",
  register: "FN 541505g",
  gericht: "Landesgericht Ried im Innkreis",
  eingetragen: "10. September 2020",
  geschaeftsfuehrung: ["Andreas Wegscheider", "Manuel Thaler"],
  uid: null,
  gegenstand: "Projektentwicklung, Errichtung und Betrieb von Photovoltaik-Kraftwerken (Freifläche, Agri-PV), Contracting und Stromlieferverträge (PPA)",
  beteiligungen: [
    { name: "GFL – PV-Kraftwerk GmbH", register: "FN 617005k", anteil: "100 %", text: "Betrieb von PV-Kraftwerken" },
    { name: "HIL PV Kraftwerk GmbH", register: "FN 646495d", anteil: "50 %", text: "Gemeinschaftsgesellschaft mit der Prime Energy Solutions GmbH" },
  ],
};

export const KONTAKT = {
  telefon: null, // z. B. "+43 6278 …" – erst nach Freigabe eintragen
  telefonHref: null,
  email: null, // z. B. "office@oekoinvest.com"
  strasse: GESELLSCHAFT.sitz,
  ort: `${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}`,
  land: GESELLSCHAFT.land,
  oeffnungszeiten: [
    { tage: "Mo – Do", zeit: "08:00 – 16:00" },
    { tage: "Fr", zeit: "08:00 – 13:00" },
  ],
};

/**
 * Kennzahlen, die auf der Website genannt werden dürfen.
 * `entwicklungMwProJahr`: Vorgabe der Geschäftsführung (rund 50 MWp pro Jahr
 * gehen neu in die Entwicklung; Baureife typischerweise erst Jahre später).
 */
export const KENNZAHLEN = {
  entwicklungMwProJahr: 50,
  erfahrungSeit: 2010,
  gruppeGegruendet: 2010,
  maerkte: ["Deutschland", "Österreich", "Schweiz"],
};

export const SOCIAL = [];

/** Absolute URL zu einem Pfad */
export const abs = (pfad = "/") => `${SITE.url}${pfad === "/" ? "" : pfad}`;

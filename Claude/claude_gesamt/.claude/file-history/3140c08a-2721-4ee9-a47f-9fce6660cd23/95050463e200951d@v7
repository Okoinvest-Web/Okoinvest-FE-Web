// src/data/site.js
//
// Zentrale Stammdaten der ÖkoInvest-Website. Alles, was an mehreren Stellen
// erscheint (Domain, Registerdaten, Kontakt, Kennzahlen), steht NUR hier.
//
// QUELLEN: Registerangaben aus dem österreichischen Firmenbuch (FN 541505g,
// Landesgericht Ried im Innkreis) – identisch mit src/data/unternehmen.js der
// Ökovolt-DE-Website. Geschäftsführung laut Unternehmenskommunikation.
//
// Kontaktdaten und UID vom Inhaber freigegeben (Oktober 2026).
// PLATZHALTER (vor Livegang prüfen – Komponenten blenden null-Werte aus):
//   - SITE.url               Produktivdomain oekoinvest.com (Sicherung der Domain läuft)
//
// URL-LOGIK (Paket I): SITE.url kommt aus NEXT_PUBLIC_SITE_URL. Ohne den Wert
// bricht ein Produktions-Build ab; in Entwicklung/Tests gilt die Produktions-
// URL. Indexiert wird nur mit NEXT_PUBLIC_SITE_ENV=production auf der
// Produktionsdomain (INDEXIERBAR). Prüfungen: src/lib/indexsteuerung.js.

import { ermittleSiteUrl, istIndexierbar } from "../lib/indexsteuerung.js";

// process.env.* bewusst ausgeschrieben: Next.js ersetzt nur so zur Build-Zeit.
const SITE_URL = ermittleSiteUrl({ siteUrl: process.env.NEXT_PUBLIC_SITE_URL, nodeEnv: process.env.NODE_ENV });

/** true nur in der echten Produktion – sonst noindex und robots.txt „Disallow: /“. */
export const INDEXIERBAR = istIndexierbar({
  nodeEnv: process.env.NODE_ENV,
  siteEnv: process.env.NEXT_PUBLIC_SITE_ENV,
  siteUrl: SITE_URL,
});

export const SITE = {
  name: "ÖkoInvest",
  firma: "ÖkoInvest GmbH",
  url: SITE_URL,
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
  uid: "ATU76000505",
  vertretung: "Die Geschäftsführer vertreten jeweils selbstständig (alleinvertretungsberechtigt).",
  // Angaben nach § 5 Abs. 1 Z 4–6 ECG – abgeleitet aus dem Sitz (Bezirk Braunau am Inn, Oberösterreich);
  // Prüfung durch die Rechtsabteilung vorgesehen (Fachgruppe und konkrete Gewerbeberechtigungen bestätigen).
  kammer: "Wirtschaftskammer Oberösterreich",
  aufsichtsbehoerde: "Bezirkshauptmannschaft Braunau am Inn",
  berufsrecht: { text: "Gewerbeordnung 1994 (GewO)", url: "https://www.ris.bka.gv.at" },
  // Gesellschafter laut Firmenbuch (vom Inhaber übermittelt, Oktober 2026) – Offenlegung nach § 25 Abs. 2 MedienG
  gesellschafter: [
    { name: "AW Holding GmbH", anteil: "25,80 %" },
    { name: "PV GmbH", anteil: "25,80 %" },
    { name: "Photonos GmbH", anteil: "25,80 %" },
    { name: "Ökovolt Solartechnik GmbH", anteil: "22,60 %" },
  ],
  gegenstand: "Projektentwicklung, Errichtung und Betrieb von Photovoltaik-Kraftwerken (Freifläche, Agri-PV), Contracting und Stromlieferverträge (PPA)",
  beteiligungen: [
    { name: "GFL – PV-Kraftwerk GmbH", register: "FN 617005k", anteil: "100 %", text: "Betrieb von PV-Kraftwerken" },
    { name: "HIL PV Kraftwerk GmbH", register: "FN 646495d", anteil: "50 %", text: "Gemeinschaftsgesellschaft mit der Prime Energy Solutions GmbH" },
  ],
};

export const KONTAKT = {
  telefon: "+43 6278 71030",
  telefonHref: "tel:+43627871030",
  email: "office@oekoinvest.com",
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

/**
 * Pressekontakt (Welle 3, Paket NL – Newsroom /newsroom). Bis der Inhaber eine eigene Ansprechperson bzw. ein
 * Pressepostfach freigibt, gelten die allgemeinen Kontaktdaten. TODO-Inhaber: ansprechpartner/funktion/email
 * (z. B. presse@…) festlegen; null-Werte blendet die Seite aus.
 */
export const PRESSE = {
  ansprechpartner: null,
  funktion: null,
  email: KONTAKT.email,
  telefon: KONTAKT.telefon,
  telefonHref: KONTAKT.telefonHref,
};

/**
 * Länderangaben für das Länderrouting (Welle 2): einzige Quelle für Ländernamen und
 * länderbezogene Kontaktangaben. src/lib/land/laender.js setzt daraus Präfix, Sprache
 * und Währung zusammen.
 *
 * postfach: Team-Postfach je Land. TODO-Inhaber: offen (at@/de@/ch@ oder alles an
 * office@?). Bis zur Entscheidung null; Komponenten zeigen dann KONTAKT.email.
 */
export const LAENDER_ANGABEN = {
  DE: { name: "Deutschland", inLand: "in Deutschland", fuerLand: "für Deutschland", postfach: null, en: { name: "Germany", inLand: "in Germany", fuerLand: "for Germany" } },
  AT: { name: "Österreich", inLand: "in Österreich", fuerLand: "für Österreich", postfach: null, en: { name: "Austria", inLand: "in Austria", fuerLand: "for Austria" } },
  CH: { name: "Schweiz", inLand: "in der Schweiz", fuerLand: "für die Schweiz", postfach: null, en: { name: "Switzerland", inLand: "in Switzerland", fuerLand: "for Switzerland" } },
};

/** Absolute URL zu einem Pfad */
export const abs = (pfad = "/") => `${SITE.url}${pfad === "/" ? "" : pfad}`;

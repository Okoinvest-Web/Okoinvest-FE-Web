// src/lib/boerse/neutralitaet.js
//
// Neutralität der Projektbörse (Welle 3, Paket B10; Masterplan B10, Dossier I4 „Neutralität und
// Governance der Projektbörse“).
//
// 1. Badges je Inserat – NUR als Funktion mit festen Kriterien. Ein Badge erscheint nur, wenn das
//    Backend das zugrunde liegende Feld AUSDRÜCKLICH meldet (true/false). Fehlt das Feld, gibt es
//    kein Badge – lieber keine Kennzeichnung als eine geratene (§ 5/§ 5a UWG, UWG-AT, Art. 3 UWG-CH).
//      gruppenprojekt  eigenprojekt === true            Anbieter ist eine Gesellschaft der ÖKOVOLT Gruppe
//      fremdinserat    eigenprojekt === false           Anbieter gehört nicht zur Gruppe
//      gruppeBeteiligt gruppeBeteiligt === true         Gruppe ist Interessent/Bieter bei einem Fremdinserat
//      vorgeprueft     unterlagenVorgeprueft === true   Backoffice hat die Kernunterlagen auf Vollständigkeit
//                                                       und Plausibilität geprüft (keine Due Diligence)
//    Die Felder liefert die öffentliche Projektion (src/lib/plattform/oeffentlich.js). Heute setzt
//    weder das Demo-Backend noch Frappe (boerse_eintrag) sie – also erscheinen noch keine Badges.
//    Offener Punkt: Pflichtfeld „Anbieter“ am Projekt im Backoffice (Bericht B10).
//
// 2. Rechtliche Einordnung je Land (keine Börse im Sinne von BörsG/BörseG 2018/FinfraG) – strikt
//    getrennt, ENTWURF bis zur Prüfung durch die Rechtsabteilung (Strang R).
//
// Reines Modul ohne Server-Abhängigkeiten (node --test).

/** Badge-Definitionen: Kriterium, Kurztext und Erklärung je Sprache. */
export const BADGES = Object.freeze({
  gruppenprojekt: Object.freeze({
    id: "gruppenprojekt",
    ton: "gruppe",
    pruefe: (p) => p?.eigenprojekt === true,
    de: { label: "Gruppenprojekt", kriterium: "Der Anbieter ist eine Gesellschaft der ÖKOVOLT Gruppe. Wir kennzeichnen das bei jedem Inserat, in Liste und Exposé." },
    en: { label: "Group project", kriterium: "The seller is a company of the ÖKOVOLT Group. We label this on every listing, in the list and in the exposé." },
  }),
  fremdinserat: Object.freeze({
    id: "fremdinserat",
    ton: "neutral",
    pruefe: (p) => p?.eigenprojekt === false,
    de: { label: "Fremdinserat", kriterium: "Der Anbieter gehört nicht zur ÖKOVOLT Gruppe. Es gelten die Regeln der Informationsbarriere." },
    en: { label: "Third-party listing", kriterium: "The seller does not belong to the ÖKOVOLT Group. The information barrier rules apply." },
  }),
  gruppeBeteiligt: Object.freeze({
    id: "gruppeBeteiligt",
    ton: "hinweis",
    // Nur bei Fremdinseraten sinnvoll: Bei Gruppenprojekten ist die Gruppe ohnehin Partei.
    pruefe: (p) => p?.eigenprojekt === false && p?.gruppeBeteiligt === true,
    de: { label: "Gruppe interessiert", kriterium: "Eine Gesellschaft der ÖKOVOLT Gruppe hat als Interessentin eine NDA angefragt oder bietet mit. Sie bekommt dieselben Informationen und Fristen wie alle anderen." },
    en: { label: "Group interested", kriterium: "A company of the ÖKOVOLT Group has requested an NDA as an interested party or is bidding. It receives the same information and deadlines as everyone else." },
  }),
  vorgeprueft: Object.freeze({
    id: "vorgeprueft",
    ton: "pruefung",
    pruefe: (p) => p?.unterlagenVorgeprueft === true,
    de: { label: "Unterlagen vorgeprüft", kriterium: "Das Backoffice hat die Kernunterlagen – Flächensicherung, Planungsstand und Netzanschluss – auf Vollständigkeit und Plausibilität geprüft. Das ersetzt keine Due Diligence." },
    en: { label: "Documents pre-checked", kriterium: "The back office has checked the core documents – land securing, planning status and grid connection – for completeness and plausibility. This does not replace due diligence." },
  }),
});

/** Reihenfolge der Anzeige. */
export const BADGE_REIHENFOLGE = Object.freeze(["gruppenprojekt", "fremdinserat", "gruppeBeteiligt", "vorgeprueft"]);

/**
 * Badges eines Projekts (öffentliche Projektion) in Anzeigereihenfolge.
 * Testdatensätze bekommen nie Badges (sie erscheinen ohnehin nicht öffentlich).
 * @returns {string[]} Badge-IDs
 */
export function badgesFuer(p) {
  if (!p || typeof p !== "object") return [];
  return BADGE_REIHENFOLGE.filter((id) => BADGES[id].pruefe(p));
}

/** Text eines Badges in der Sprache ("de" | "en"); unbekannt → null. */
export function badgeText(id, sprache = "de") {
  const b = BADGES[id];
  if (!b) return null;
  return sprache === "en" ? b.en : b.de;
}

/**
 * Anteil der Fremdinserate (Messgröße Masterplan B10) – nur über Projekte mit ausdrücklicher
 * Anbieterangabe. Ohne solche Projekte: null (keine Zahl zeigen, statt 0 % oder 100 % zu raten).
 */
export function anteilFremdinserate(projekte) {
  const mitAngabe = (Array.isArray(projekte) ? projekte : []).filter((p) => p && typeof p.eigenprojekt === "boolean");
  if (!mitAngabe.length) return null;
  return mitAngabe.filter((p) => p.eigenprojekt === false).length / mitAngabe.length;
}

/** Stand der rechtlichen Einordnung (Entwurf, Strang R). */
export const RECHT_STAND = "9. Oktober 2026";

/**
 * Rechtliche Einordnung je Land – „keine Börse im Rechtssinn“. Strikt getrennt: Jede Länderfassung
 * zeigt NUR ihren Abschnitt; die gemeinsame Seite zeigt alle drei, je mit Land beschriftet.
 * Wortlaut ist ENTWURF (Prüfung Rechtsabteilung je Land offen, Bericht B10).
 */
export const RECHTSRAHMEN = Object.freeze({
  DE: Object.freeze({
    de: {
      land: "Deutschland",
      gesetz: "Börsengesetz (BörsG)",
      punkte: [
        "Die Projektbörse ist keine Börse im Sinne des Börsengesetzes (BörsG) und kein Handelsplatz für Finanzinstrumente. Sie ist eine Plattform, auf der Projektrechte und Anlagen vorgestellt und Interessenten nachgewiesen bzw. vermittelt werden.",
        "Es gibt keinen Börsenpreis und keine automatische Zusammenführung von Kauf- und Verkaufsaufträgen. Verträge schließen Anbieter und Käufer direkt miteinander.",
        "ÖkoInvest erbringt keine Anlageberatung und keine Anlage- oder Finanzvermittlung. Die Prüfung des Projekts (Due Diligence) bleibt Sache des Käufers.",
      ],
    },
    en: {
      land: "Germany",
      gesetz: "Stock Exchange Act (Börsengesetz, BörsG)",
      punkte: [
        "The project exchange is not an exchange within the meaning of the German Stock Exchange Act (BörsG) and not a trading venue for financial instruments. It is a platform on which project rights and plants are presented and interested parties are introduced.",
        "There is no exchange price and no automatic matching of buy and sell orders. Sellers and buyers conclude contracts directly with each other.",
        "ÖkoInvest does not provide investment advice or investment or financial brokerage. Reviewing the project (due diligence) remains the buyer's responsibility.",
      ],
    },
  }),
  AT: Object.freeze({
    de: {
      land: "Österreich",
      gesetz: "Börsegesetz 2018 (BörseG 2018)",
      punkte: [
        "Die Projektbörse ist keine Börse im Sinne des Börsegesetzes 2018 (BörseG 2018) und kein Handelsplatz für Finanzinstrumente. Sie ist eine Plattform, auf der Projektrechte und Anlagen vorgestellt und Interessenten nachgewiesen bzw. vermittelt werden.",
        "Es gibt keinen Börsenkurs und keine automatische Zusammenführung von Aufträgen. Verträge schließen Anbieter und Käufer direkt miteinander.",
        "ÖkoInvest erbringt keine Anlageberatung und keine Wertpapierdienstleistungen. Die Prüfung des Projekts (Due Diligence) bleibt Sache des Käufers.",
      ],
    },
    en: {
      land: "Austria",
      gesetz: "Stock Exchange Act 2018 (Börsegesetz 2018, BörseG 2018)",
      punkte: [
        "The project exchange is not an exchange within the meaning of the Austrian Stock Exchange Act 2018 (BörseG 2018) and not a trading venue for financial instruments. It is a platform on which project rights and plants are presented and interested parties are introduced.",
        "There is no exchange price and no automatic matching of orders. Sellers and buyers conclude contracts directly with each other.",
        "ÖkoInvest does not provide investment advice or investment services. Reviewing the project (due diligence) remains the buyer's responsibility.",
      ],
    },
  }),
  CH: Object.freeze({
    de: {
      land: "Schweiz",
      gesetz: "Finanzmarktinfrastrukturgesetz (FinfraG)",
      punkte: [
        "Die Projektbörse ist keine Börse und kein multilaterales Handelssystem im Sinne des Finanzmarktinfrastrukturgesetzes (FinfraG). Sie ist eine Plattform, auf der Projektrechte und Anlagen vorgestellt und Interessenten nachgewiesen bzw. vermittelt werden.",
        "Es gibt keinen Börsenkurs und keine automatische Zusammenführung von Aufträgen. Verträge schliessen Anbieter und Käufer direkt miteinander.",
        "ÖkoInvest erbringt keine Anlageberatung und keine Finanzdienstleistungen. Die Prüfung des Projekts (Due Diligence) bleibt Sache des Käufers.",
      ],
    },
    en: {
      land: "Switzerland",
      gesetz: "Financial Market Infrastructure Act (FinfraG)",
      punkte: [
        "The project exchange is not a stock exchange or multilateral trading facility within the meaning of the Swiss Financial Market Infrastructure Act (FinfraG). It is a platform on which project rights and plants are presented and interested parties are introduced.",
        "There is no exchange price and no automatic matching of orders. Sellers and buyers conclude contracts directly with each other.",
        "ÖkoInvest does not provide investment advice or financial services. Reviewing the project (due diligence) remains the buyer's responsibility.",
      ],
    },
  }),
});

/**
 * Abschnitte der rechtlichen Einordnung für eine Seite: Länderfassung → nur ihr Land,
 * gemeinsame Seite (land null) → alle drei in DACH-Reihenfolge.
 * @returns {{ code: string, land: string, gesetz: string, punkte: string[] }[]}
 */
export function rechtsrahmenFuer(land, sprache = "de") {
  const s = sprache === "en" ? "en" : "de";
  const codes = land && Object.hasOwn(RECHTSRAHMEN, land) ? [land] : ["DE", "AT", "CH"];
  return codes.map((code) => ({ code, ...RECHTSRAHMEN[code][s] }));
}

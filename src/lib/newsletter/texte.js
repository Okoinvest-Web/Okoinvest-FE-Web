// src/lib/newsletter/texte.js – Wortlaute des Newsletters (Welle 3, Paket NL)
//
// ┌──────────────────────────────────────────────────────────────────────────────────────────────┐
// │ ENTWURF · Prüfung Rechtsabteilung (Strang R). Alle Einwilligungs- und Hinweistexte hier sind  │
// │ bestmöglich formuliert, aber nicht freigegeben. Jede Textänderung → NEWSLETTER_TEXT_VERSION    │
// │ erhöhen: Der SHA-256 des gezeigten Wortlauts steht im Einwilligungsprotokoll.                  │
// └──────────────────────────────────────────────────────────────────────────────────────────────┘
//
// Rechtliche Linie (zu prüfen durch die Rechtsabteilung, je Land):
//  - E-Mail-Werbung nur mit vorheriger, ausdrücklicher Einwilligung: DE § 7 Abs. 2 Nr. 2 UWG, AT § 174 Abs. 3 TKG 2021
//    (auch B2B), CH Art. 3 Abs. 1 lit. o UWG. Nachweis über Double-Opt-in (Protokoll art "einwilligung" + "doi").
//  - Die Einwilligung ist die Anmeldung selbst (eigene Handlung „Anmelden“), Themen-Häkchen sind nie vorbelegt.
//  - Abmeldung jederzeit, kostenlos, mit einem Klick (Link in jeder E-Mail, RFC 8058 List-Unsubscribe-Post).
//  - Die Bestätigungs-Mail enthält keine Werbung.
// Rein, ohne Abhängigkeiten (Browser, Server, node:test).

import { THEMEN, themaIn } from "./themen.js";

export const NEWSLETTER_TEXT_VERSION = "ENTWURF-2026-10-09";
export const KENNZEICHNUNG_RECHT = "Entwurf · Prüfung Rechtsabteilung";

/** Bestätigungslink gültig (Stunden) – danach werden die Angaben gelöscht. TODO Datenschutz: Frist bestätigen. */
export const DOI_STUNDEN = 48;

const LAND = {
  de: { DE: "Deutschland", AT: "Österreich", CH: "die Schweiz" },
  en: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
};

const liste = (teile, und) => (teile.length > 1 ? `${teile.slice(0, -1).join(", ")} ${und} ${teile.at(-1)}` : teile[0] || "");

/** Ausgewählte Themen als Satzteil („Fristen & Förderung und Marktdaten“) */
export function themenSatz(themen, sprache = "de") {
  const titel = THEMEN.filter((t) => themen.includes(t.id)).map((t) => themaIn(t, sprache).titel);
  return liste(titel, sprache === "en" ? "and" : "und");
}

/**
 * Einwilligungstext genau so, wie er beim Absenden gilt (Hash → Protokoll art "einwilligung", zweck "newsletter").
 * Land und Themen sind Teil des Wortlauts – der Nachweis zeigt so, wofür eingewilligt wurde.
 */
export function einwilligungsText({ land, themen, sprache = "de" }) {
  if (sprache === "en") {
    return `I would like to receive the ÖkoInvest newsletter for ${LAND.en[land] || "my country"} by e-mail on the topics ${themenSatz(themen, "en")}. I will confirm my subscription via the link in an e-mail. I can unsubscribe at any time with one click via the link in every e-mail.`;
  }
  return `Ich möchte den Newsletter von ÖkoInvest für ${LAND.de[land] || "mein Land"} per E-Mail zu den Themen ${themenSatz(themen, "de")} erhalten. Die Anmeldung bestätige ich über den Link in einer E-Mail. Abmelden kann ich mich jederzeit mit einem Klick über den Link in jeder E-Mail.`;
}

/** Hinweis unter dem Formular (Information, keine eigene Einwilligung) */
export const HINWEIS = Object.freeze({
  de: {
    kern: "Wir nutzen Ihre E-Mail-Adresse nur für diesen Newsletter und speichern Ihre Einwilligung als Nachweis. Ohne Bestätigung löschen wir die Adresse nach 48 Stunden.",
    verweisVor: "Einzelheiten und Ihre Rechte finden Sie in der",
    verweisLink: "Datenschutzerklärung",
  },
  en: {
    kern: "We only use your e-mail address for this newsletter and keep a record of your consent. Without confirmation, we delete the address after 48 hours.",
    verweisVor: "Details and your rights are set out in our",
    verweisLink: "privacy policy",
  },
});

/** Bestätigungsseite (Hash → Protokoll art "doi") */
export const DOI = Object.freeze({
  textId: "newsletter_doi",
  de: { titel: "Newsletter bestätigen", text: "Ja, ich habe diesen Newsletter bestellt und bestätige meine E-Mail-Adresse.", knopf: "Anmeldung bestätigen" },
  en: { titel: "Confirm newsletter", text: "Yes, I subscribed to this newsletter and confirm my e-mail address.", knopf: "Confirm subscription" },
});

export const ANMELDUNG_TEXT_ID = "newsletter_anmeldung";
export const ABMELDUNG_TEXT_ID = "newsletter_abmeldung";

/** Bestätigungs-Mail: keine Werbung, kein Ergebnis, keine Personendaten außer der Adresse selbst */
export function bestaetigungsMail({ link, sprache = "de", land }) {
  if (sprache === "en") {
    return {
      betreff: "Please confirm: ÖkoInvest newsletter",
      text: `You subscribed to the ÖkoInvest newsletter for ${LAND.en[land] || "your country"} on our website. Please open the link and confirm your e-mail address there. Only then will you receive the newsletter. The link is valid for ${DOI_STUNDEN} hours. If you did not subscribe, please ignore this e-mail – your details will then be deleted automatically.`,
      link,
      linkText: "Confirm subscription",
    };
  }
  return {
    betreff: "Bitte bestätigen: Newsletter von ÖkoInvest",
    text: `Sie haben auf unserer Website den Newsletter von ÖkoInvest für ${LAND.de[land] || "Ihr Land"} bestellt. Bitte öffnen Sie den Link und bestätigen Sie dort Ihre E-Mail-Adresse. Erst danach erhalten Sie den Newsletter. Der Link ist ${DOI_STUNDEN} Stunden gültig. Haben Sie nichts bestellt, ignorieren Sie diese E-Mail bitte – dann verfallen Ihre Angaben automatisch.`,
    link,
    linkText: "Anmeldung bestätigen",
  };
}

/** Begrüßung nach der Bestätigung – enthält den Abmeldelink (wie jede spätere Ausgabe) */
export function willkommensMail({ link, abmeldeUrl, sprache = "de", land, themen }) {
  if (sprache === "en") {
    return {
      betreff: "Welcome: ÖkoInvest newsletter",
      text: `Thank you for confirming. You will receive the newsletter for ${LAND.en[land] || "your country"} on the topics ${themenSatz(themen, "en")}. You can unsubscribe at any time with one click via the link in every e-mail.`,
      link,
      linkText: "Manage or unsubscribe",
      kopfzeilen: { "List-Unsubscribe": `<${abmeldeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    };
  }
  return {
    betreff: "Willkommen: Newsletter von ÖkoInvest",
    text: `Danke für Ihre Bestätigung. Sie erhalten den Newsletter für ${LAND.de[land] || "Ihr Land"} zu den Themen ${themenSatz(themen, "de")}. Abmelden können Sie sich jederzeit mit einem Klick über den Link in jeder E-Mail.`,
    link,
    linkText: "Verwalten oder abmelden",
    kopfzeilen: { "List-Unsubscribe": `<${abmeldeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

/** Antworttexte der API (ohne Personendaten; gleich, ob die Adresse schon angemeldet ist – keine Ausforschung) */
export const ANTWORT = Object.freeze({
  de: { angefordert: `Fast geschafft: Wir haben Ihnen einen Bestätigungslink geschickt. Bitte öffnen Sie ihn innerhalb von ${DOI_STUNDEN} Stunden – erst dann ist die Anmeldung aktiv.`, aus: "Der Newsletter startet mit dem Livegang." },
  en: { angefordert: `Almost done: we have sent you a confirmation link. Please open it within ${DOI_STUNDEN} hours – only then is your subscription active.`, aus: "The newsletter starts when the site goes live." },
});

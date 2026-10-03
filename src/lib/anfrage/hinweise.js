// src/lib/anfrage/hinweise.js
//
// Datenschutz-Hinweis und optionale Einwilligungen im Anfrageformular (Paket C, Welle 1).
//
// ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
// │ ENTWURF – KEINE FREIGABE. Alle Texte in dieser Datei sind Platzhalter des Agenten-Teams.      │
// │ Den finalen Wortlaut liefert Strang R (Rechtstexte, Anwalt). Bis dahin: Seite nicht öffentlich │
// │ bzw. noindex. Jede Textänderung → VERSION erhöhen (der Hash wird je Eintrag gespeichert).      │
// └─────────────────────────────────────────────────────────────────────────────────────────────┘
//
// Rechtliche Linie laut Masterplan Abschnitt 5 (zu prüfen durch Strang R):
//  - Die Bearbeitung der Anfrage stützt sich auf Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahme auf
//    Anfrage) – dafür wird KEINE Einwilligung verlangt, sondern informiert (Hinweis, kein Pflicht-Häkchen).
//  - Ein ausdrücklich gewählter Rückruf ist Teil der Anfrage (lit. b); die Nummer wird nur dafür genutzt.
//  - Werbeanrufe und Werbe-Mails nur mit eigener, nicht vorbelegter Einwilligung
//    (DE § 7 UWG; AT § 174 TKG 2021, auch B2B; CH Art. 3 Abs. 1 lit. o UWG) – drei getrennte Häkchen.
//  - Die Weitergabe an Partner setzt benannte Partner voraus; solange keine benannt sind, bleibt das
//    Häkchen ausgeblendet (aktiv: false).

export const HINWEIS_VERSION = "ENTWURF-2026-10-03";

/** Hinweis statt Pflicht-Einwilligung (der vollständige Text wird mit Version und Hash beim Vorgang gespeichert) */
const HINWEIS_KERN = "Wir verarbeiten Ihre Angaben, um Ihre Anfrage zu beantworten. Eine Einwilligung ist dafür nicht nötig.";
const HINWEIS_VERWEIS_VOR = "Einzelheiten und Ihre Rechte finden Sie in der";
const HINWEIS_VERWEIS_LINK = "Datenschutzerklärung";
export const HINWEIS = Object.freeze({
  id: "hinweis_anfrage",
  rechtsgrundlage: "Art. 6 Abs. 1 lit. b DSGVO",
  version: HINWEIS_VERSION,
  kern: HINWEIS_KERN,
  verweisVor: HINWEIS_VERWEIS_VOR,
  verweisLink: HINWEIS_VERWEIS_LINK, // Link auf /datenschutz
  text: `${HINWEIS_KERN} ${HINWEIS_VERWEIS_VOR} ${HINWEIS_VERWEIS_LINK}.`,
  // Englische Seiten (/en): eigener Wortlaut, eigener Hash
  en: Object.freeze({
    kern: "We process your details to answer your enquiry. No consent is needed for this.",
    verweisVor: "Details and your rights are set out in our",
    verweisLink: "privacy policy (in German)",
    text: "We process your details to answer your enquiry. No consent is needed for this. Details and your rights are set out in our privacy policy (in German).",
  }),
});

/** Rückruf-Wunsch (Teil der Anfrage, keine Werbeeinwilligung) */
export const RUECKRUF = Object.freeze({
  id: "rueckruf",
  version: HINWEIS_VERSION,
  text: "Bitte rufen Sie mich zu dieser Anfrage zurück.",
  zusatz: "Dann brauchen wir Ihre Telefonnummer. Wir nutzen sie nur für diese Anfrage.",
  en: Object.freeze({ text: "Please call me back about this enquiry.", zusatz: "We then need your phone number. We use it only for this enquiry." }),
});

/**
 * Optionale, getrennte Einwilligungen – nie vorbelegt, nie Voraussetzung für die Anfrage.
 *  nurMitTelefon: nur anzeigen, wenn das Formular ein Telefonfeld hat
 *  aktiv: false → nicht anzeigen und serverseitig nicht annehmen
 */
export const EINWILLIGUNGEN = Object.freeze([
  Object.freeze({
    id: "werbeanruf",
    zweck: "werbeanruf", // Einwilligungsprotokoll (src/lib/anfrage/protokoll.js)
    version: HINWEIS_VERSION,
    nurMitTelefon: true,
    aktiv: true,
    text: "Ja, ÖkoInvest darf mich auch später telefonisch zu passenden eigenen Angeboten ansprechen. Ich kann das jederzeit widerrufen.",
    textEn: "Yes, ÖkoInvest may also call me later about suitable offers of its own. I can withdraw this at any time.",
  }),
  Object.freeze({
    id: "newsletter",
    zweck: "newsletter", // gilt erst nach Double-Opt-in (Eintrag art "doi", Paket B4)
    version: HINWEIS_VERSION,
    nurMitTelefon: false,
    aktiv: true,
    // TODO Strang R + Betrieb: Double-Opt-in-Strecke fehlt noch – bis dahin wird nur der Wunsch gespeichert (doi: "ausstehend"), es geht nichts raus.
    text: "Ja, ich möchte Fachinformationen und Fristen-Hinweise für mein Land per E-Mail erhalten. Die Anmeldung bestätige ich per E-Mail; Abmeldung jederzeit.",
    textEn: "Yes, I would like to receive market information and deadline alerts for my country by e-mail. I will confirm by e-mail; unsubscribe at any time.",
  }),
  Object.freeze({
    id: "partner",
    zweck: "weitergabe_partner",
    version: HINWEIS_VERSION,
    nurMitTelefon: false,
    aktiv: false, // TODO Strang R: Partner namentlich benennen, erst dann einschalten
    text: "Ja, meine Anfrage darf an folgende Partner weitergegeben werden: [Partnerliste folgt – Strang R].",
    textEn: "Yes, my enquiry may be passed on to the following partners: [partner list to follow].",
  }),
]);

export const EINWILLIGUNG_IDS = Object.freeze(EINWILLIGUNGEN.filter((e) => e.aktiv).map((e) => e.id));

/**
 * Welle 2, Paket B3: Häkchen-ID → Zweck im Einwilligungsprotokoll (werbeanruf | newsletter | weitergabe_partner).
 * Es gibt KEINE mutmaßliche Einwilligung (auch nicht B2B): Nur ein ausdrücklich gesetztes Häkchen erzeugt einen Eintrag.
 */
export const zweckFuer = (id) => EINWILLIGUNGEN.find((e) => e.id === id)?.zweck || "";

/** Wortlaut je Sprache (Standard Deutsch) */
export const einwilligungText = (e, sprache) => (sprache === "en" && e.textEn ? e.textEn : e.text);
export const hinweisText = (sprache) => (sprache === "en" ? HINWEIS.en.text : HINWEIS.text);

/** Für das Formular: welche Häkchen werden angezeigt? */
export function einwilligungenFuer({ mitTelefon }) {
  return EINWILLIGUNGEN.filter((e) => e.aktiv && (!e.nurMitTelefon || mitTelefon));
}

/**
 * Eingabe des Formulars → Protokoll-Einträge (nur erteilte, nur bekannte, nur aktive).
 * hash: Funktion text → Hex-Hash (Server: SHA-256); am: Zeitstempel (ISO).
 * Telefon-Einwilligung ohne Telefonnummer wird verworfen. sprache: "en" → Hash über den englischen Wortlaut.
 */
export function einwilligungenAufbereiten(eingabe, { hash, am, telefon, sprache }) {
  const roh = eingabe && typeof eingabe === "object" && !Array.isArray(eingabe) ? eingabe : {};
  const out = [];
  for (const e of EINWILLIGUNGEN) {
    if (!e.aktiv || roh[e.id] !== true) continue;
    if (e.nurMitTelefon && !telefon) continue;
    out.push({ id: e.id, erteilt: true, am, version: e.version, sprache: sprache === "en" ? "en" : "de", textHash: hash(einwilligungText(e, sprache)), ...(e.id === "newsletter" ? { doi: "ausstehend" } : {}) });
  }
  return out;
}

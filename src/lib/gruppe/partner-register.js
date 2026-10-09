// src/lib/gruppe/partner-register.js
//
// Register der Gruppen- und Partnerkennungen (Welle 2, Paket GRP – Masterplan B11, Abschnitt 7 „Gruppenreichweite“).
//
// Zweck: Anfragen, die über Websites der ÖKOVOLT-Gruppe oder über Partner kommen, mit einer KENNUNG messbar
// machen – offengelegt, ohne Cookie, ohne Versand und OHNE Provisionslogik (Stop-Liste: keine Provisionen vor
// Klärung der Erlaubnisse). Das Register ist reine Konfiguration: Client- und serverseitig nutzbar, keine Node-Importe.
//
// Regeln für Einträge:
//  - `kennung`: kurzer, NICHT personenbezogener Slug (a–z, 0–9, Bindestrich, 3–40 Zeichen). Keine Personennamen,
//    keine E-Mail-Adressen, keine Kundennummern. Die Kennung steht offen in Links (utm_source).
//  - `art`: gruppe | kammer | maschinenring | stadtwerk | installateur. `gruppe` → Kanal „Gruppe“ (utm_medium=gruppe),
//    alle übrigen → Kanal „Partner“ (utm_medium=partner).
//  - `land`: DE | AT | CH – das Land, für das der Verweis gedacht ist (Länderrouting /de /at /ch folgt).
//  - `status`: aktiv | entwurf. Im Produktionsmodus greifen NUR aktive Einträge (siehe kennungFinden()).
//  - `ziele`: erlaubte Pfadschlüssel aus ZIELE (Positivliste für den Kurzlink /p/<kennung>?z=<schlüssel>).
//  - `name`: Anzeigename in der Offenlegung („Sie kommen über <name>“).
//  - `offenlegung`: optionaler eigener Offenlegungstext; sonst gilt der Standardtext (src/components/Gruppe/Offenlegung.js).
//
// TODO-Inhaber (Entscheidung E9, Masterplan): Echte Gruppengesellschaften und Partner trägt AUSSCHLIESSLICH der
// Inhaber ein – nach Abstimmung in der Gruppe bzw. mit dem Partner und nach Prüfung durch die Rechtsabteilung
// (Offenlegung, ggf. Bestandskundenansprache § 7 Abs. 3 UWG, CH erst nach Klarstellung zur Ökovolt Schweiz AG).
// Bis dahin stehen hier nur BEISPIEL-Einträge mit status "entwurf"; sie wirken nur in Entwicklung und Tests.
// Prüfung Rechtsabteilung: Offenlegungstexte und Zulässigkeit je Partnerart.

/** Partnerarten (Anzeige) */
import { einstiegPfad, pfad } from "../land/index.js";

export const PARTNER_ARTEN = {
  gruppe: "ÖKOVOLT-Gruppe",
  kammer: "Kammer",
  maschinenring: "Maschinenring",
  stadtwerk: "Stadtwerk",
  installateur: "Installationsbetrieb",
};

/** Kanal (wie src/lib/herkunft.js → kanal()) je Partnerart */
export const kanalFuerArt = (art) => (art === "gruppe" ? "Gruppe" : "Partner");
/** utm_medium je Partnerart */
export const mediumFuerArt = (art) => (art === "gruppe" ? "gruppe" : "partner");

export const REGISTER_LAENDER = ["DE", "AT", "CH"];

/**
 * Zielpfade als PFADSCHLÜSSEL (Pfad ohne Länderpräfix). zielPfad() löst sie über src/lib/land je Land auf
 * (Ländermodell: jede öffentliche Seite gibt es gemeinsam und unter /de, /at, /ch). Nur diese Ziele sind über den Kurzlink erreichbar (kein offener Redirect).
 */
export const ZIELE = {
  start: { pfad: "/", label: "Startseite" },
  flaeche: { pfad: "/flaeche-verpachten", label: "Fläche verpachten" },
  dach: { pfad: "/dachflaeche-verpachten", label: "Dachfläche verpachten" },
  landwirte: { pfad: "/landwirte", label: "Landwirte" },
  agri: { pfad: "/agri-pv", label: "Agri-PV" },
  kommunen: { pfad: "/kommunen", label: "Kommunen" },
  flaechencheck: { pfad: "/flaechencheck", label: "Flächencheck" },
  unternehmen: { pfad: "/unternehmen", label: "Über uns" },
  kontakt: { pfad: "/kontakt", label: "Kontakt" },
};

/**
 * Länderpräfix aktiv (Ländermodell): Ziele werden je Land über src/lib/land aufgelöst, z. B. ("flaeche", "AT") →
 * "/at/flaeche-verpachten" – dieselbe Seite, Inhalte für Österreich; "start" führt auf die Startseite des Landes
 * (/de, /at, /ch). Ohne gültiges Land: die gemeinsame Seite ohne Präfix.
 */
export const LAENDER_PRAEFIX_AKTIV = true;

/** Pfadschlüssel → interner Pfad (oder null bei unbekanntem Schlüssel). */
export function zielPfad(schluessel, land, { praefix = LAENDER_PRAEFIX_AKTIV } = {}) {
  const z = Object.hasOwn(ZIELE, schluessel) ? ZIELE[schluessel] : null;
  if (!z) return null;
  if (!praefix) return z.pfad;
  if (!REGISTER_LAENDER.includes(land)) return z.pfad === "/" ? "/" : pfad(z.pfad);
  return z.pfad === "/" ? einstiegPfad(land) : pfad(z.pfad, land);
}

const KENNUNG_MUSTER = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
/** Formal gültige Kennung? (vor jedem Registerzugriff) */
export const kennungGueltig = (k) => typeof k === "string" && KENNUNG_MUSTER.test(k) && !k.includes("--");

// ---------------------------------------------------------------------------------------------------------------
// EINTRÄGE – nur Beispiel-Platzhalter (status "entwurf"). TODO-Inhaber: echte Einträge nach E9 ergänzen.
// Bewusst keine echten Firmen-, Kammer-, Stadtwerk- oder Personennamen und keine Kennzahlen.
// ---------------------------------------------------------------------------------------------------------------
export const PARTNER_REGISTER = Object.freeze([
  {
    kennung: "beispiel-gruppe-de",
    art: "gruppe",
    land: "DE",
    status: "entwurf",
    name: "eine Website der ÖKOVOLT Gruppe (Beispiel)",
    ziele: ["start", "flaeche", "dach", "kommunen", "flaechencheck"],
    todo: "TODO-Inhaber: Verweis von oekovolt.de – Kennung und Zielseiten nach Abstimmung in der Gruppe festlegen.",
  },
  {
    kennung: "beispiel-gruppe-at",
    art: "gruppe",
    land: "AT",
    status: "entwurf",
    name: "eine Website der ÖKOVOLT Gruppe (Beispiel)",
    ziele: ["start", "flaeche", "kommunen", "flaechencheck"],
    todo: "TODO-Inhaber: Verweis von oekovolt.com – Kennung und Zielseiten nach Abstimmung in der Gruppe festlegen.",
  },
  {
    kennung: "beispiel-installateur-de",
    art: "installateur",
    land: "DE",
    status: "entwurf",
    name: "einen Installationsbetrieb (Beispiel)",
    ziele: ["start", "dach", "kontakt"],
    todo: "TODO-Inhaber: Installateurnetz – je Betrieb eine Kennung, erst nach schriftlicher Abstimmung.",
  },
  {
    kennung: "beispiel-kammer-at",
    art: "kammer",
    land: "AT",
    status: "entwurf",
    name: "eine Kammer (Beispiel)",
    ziele: ["start", "landwirte", "agri"],
    todo: "TODO-Inhaber: Kammern (z. B. Landwirtschaftskammer) – nur nach Zustimmung der Kammer.",
  },
  {
    kennung: "beispiel-maschinenring-de",
    art: "maschinenring",
    land: "DE",
    status: "entwurf",
    name: "einen Maschinenring (Beispiel)",
    ziele: ["start", "landwirte", "flaechencheck"],
    todo: "TODO-Inhaber: Maschinenringe – nur nach Zustimmung.",
  },
  {
    kennung: "beispiel-stadtwerk-de",
    art: "stadtwerk",
    land: "DE",
    status: "entwurf",
    name: "ein Stadtwerk (Beispiel)",
    ziele: ["start", "kommunen"],
    todo: "TODO-Inhaber: Stadtwerke – nur nach Zustimmung.",
  },
]);

/** Produktionsmodus: dann greifen nur aktive Einträge. */
export const istProduktion = () => typeof process !== "undefined" && process.env?.NODE_ENV === "production";

/**
 * Eintrag zu einer Kennung – oder null (unbekannt, formal ungültig, oder Entwurf im Produktionsmodus).
 * `register` und `produktion` nur für Tests überschreibbar.
 */
export function kennungFinden(kennung, { produktion = istProduktion(), register = PARTNER_REGISTER } = {}) {
  const k = String(kennung ?? "").trim().toLowerCase();
  if (!kennungGueltig(k)) return null;
  const e = register.find((x) => x.kennung === k);
  if (!e || !PARTNER_ARTEN[e.art] || !REGISTER_LAENDER.includes(e.land)) return null;
  if (e.status !== "aktiv" && (produktion || e.status !== "entwurf")) return null;
  return e;
}

/** Alle wirksamen Einträge (für die Admin-Auswertung und den Verweis-Baustein). */
export function wirksameEintraege({ produktion = istProduktion(), register = PARTNER_REGISTER } = {}) {
  return register.filter((e) => kennungFinden(e.kennung, { produktion, register }));
}

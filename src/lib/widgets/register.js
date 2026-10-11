// src/lib/widgets/register.js
//
// Partner-Widgets (Welle 4, Paket WIDGETS; Masterplan B5/B7/B11 „Widgets und White-Label für Stadtwerke“).
//
// Einbettbare Mini-Werkzeuge für Stadtwerke, Gemeindewerke und Verbände: schlanke HTML-Seiten unter
// /widgets/<name>, die ein Partner per <iframe> in die eigene Website einbettet. Grundsätze (DSGVO):
//
//  - KEINE Cookies, KEIN Tracking, KEIN JavaScript im Embed: Die Widgets sind reines HTML + Inline-CSS,
//    der Spar-Kurzrechner rechnet serverseitig über ein GET-Formular. Es entsteht kein Besucherprofil.
//  - Die Partner-Kennung (?partner=…) dient NUR dem Lead-Herkunftsnachweis: Sie wird an die Links aus dem
//    Widget heraus als utm_source/utm_medium angehängt; die Lead-Kette ordnet sie serverseitig über
//    herkunftBereinigen() (src/lib/gruppe/kanal.js) dem Kanal „Partner“ zu – nur WIRKSAME Kennungen aus dem
//    Partner-Register zählen, alles andere fällt auf „Kampagne“ zurück. Keine Provisionslogik.
//  - Einbettung: Die Widget-Routen geben eine EIGENE CSP mit frame-ancestors aus (Standard: * – jede Seite
//    darf einbetten; per Umgebungsvariable WIDGET_FRAME_ANCESTORS auf eine Positivliste einschränkbar,
//    z. B. "https://www.stadtwerk-beispiel.at https://*.verband.at"). Die globalen Kopfzeilen
//    (frame-ancestors 'self', X-Frame-Options) nehmen /widgets/ deshalb aus (next.config.mjs).
//  - Attribution: Jedes Widget trägt sichtbar „bereitgestellt von ÖkoInvest“ mit Link.
//  - noindex: Widgets sind keine eigenständigen Seiten (X-Robots-Tag und <meta name="robots">).
//
// Dieses Modul ist reine Konfiguration + Hilfsfunktionen ohne I/O (testbar mit node --test).

import { kennungFinden, kennungGueltig, mediumFuerArt } from "../gruppe/partner-register.js";

/** Länder, für die Widgets ausgespielt werden (Kleinbuchstaben wie im URL-Parameter ?land=). */
export const WIDGET_LAENDER = Object.freeze(["de", "at", "ch"]);

/** Sprachen der Widget-Texte. */
export const WIDGET_SPRACHEN = Object.freeze(["de", "en"]);

/** Register der Widgets (Stufe 1). Pfad = /widgets/<id>. */
export const WIDGETS = Object.freeze({
  "eg-sparrechner": Object.freeze({
    id: "eg-sparrechner",
    titel: "EG-Spar-Kurzrechner",
    titelEn: "Energy community quick calculator",
    beschreibung: "Grobe Jahres-Näherung der Ersparnis in einer Energiegemeinschaft (Österreich) – vereinfachte Eingaben, gerechnet mit dem Rechenkern des Energiegemeinschafts-Rechners.",
    beschreibungEn: "Rough annual estimate of savings in an energy community (Austria) – simplified inputs, computed with the same engine as the full calculator.",
    laender: Object.freeze(["at"]), // Rechenkern und Regeltabellen gelten für Österreich; DE/CH zeigen einen Hinweis
    hoehe: 560, // empfohlene iframe-Höhe in px (Einbettungs-Snippet)
  }),
  fristen: Object.freeze({
    id: "fristen",
    titel: "Fristen-Ticker",
    titelEn: "Deadline ticker",
    beschreibung: "Die nächsten Förder- und Gebotsfristen des Landes aus dem Faktenregister – mit Quelle und Stand, abgelaufene Einträge verschwinden automatisch.",
    beschreibungEn: "Upcoming funding and bidding deadlines for the selected country from the fact register – with source and date; expired items disappear automatically.",
    laender: WIDGET_LAENDER,
    hoehe: 420,
  }),
});

export const WIDGET_IDS = Object.freeze(Object.keys(WIDGETS));

/**
 * ?land=… bereinigen: Unbekanntes fällt auf das Standard-Land des Widgets zurück. Ein BEKANNTES Land
 * bleibt aber auch dann erhalten, wenn das Widget es (noch) nicht rechnet – das Widget zeigt dann den
 * ehrlichen Länderhinweis statt stillschweigend mit Werten eines anderen Landes zu rechnen.
 */
export function widgetLand(roh, widgetId) {
  const l = typeof roh === "string" ? roh.toLowerCase() : "";
  if (WIDGET_LAENDER.includes(l)) return l;
  return (WIDGETS[widgetId]?.laender || WIDGET_LAENDER)[0];
}

/** ?sprache=… bereinigen (Standard de). */
export const widgetSprache = (roh) => (roh === "en" ? "en" : "de");

/**
 * ?partner=… bereinigen – NUR formale Prüfung (Slug-Muster aus dem Partner-Register), kein Registerzwang:
 * Auch eine formal gültige, noch nicht eingetragene Kennung darf im Link stehen; die Lead-Kette stuft sie
 * dann serverseitig als „Kampagne“ ein (herkunftBereinigen). Ungültige Werte werden verworfen (null).
 */
export const widgetPartner = (roh) => (kennungGueltig(roh) ? roh : null);

/**
 * utm-Parameter für Links aus dem Widget heraus (Lead-Herkunftsnachweis).
 * Mit eingetragener Kennung: utm_medium passend zur Partnerart (gruppe|partner); sonst "partner".
 * Rückgabe: URLSearchParams-tauglicher Eintrag { utm_source, utm_medium, utm_campaign } oder null ohne Kennung.
 */
export function utmFuerPartner(partner, widgetId, optionen = {}) {
  if (!kennungGueltig(partner)) return null;
  const eintrag = kennungFinden(partner, optionen);
  return {
    utm_source: partner,
    utm_medium: eintrag ? mediumFuerArt(eintrag.art) : "partner",
    utm_campaign: `widget-${WIDGETS[widgetId] ? widgetId : "unbekannt"}`,
  };
}

/** Absolute Ziel-URL eines Links aus dem Widget heraus, inkl. utm-Nachweis. */
export function widgetZiel(basis, pfad, { partner = null, widgetId = "" } = {}) {
  const url = new URL(pfad, basis);
  const utm = utmFuerPartner(partner, widgetId);
  if (utm) for (const [k, v] of Object.entries(utm)) url.searchParams.set(k, v);
  return url.toString();
}

const ANCESTOR = /^(\*|'self'|'none'|https?:\/\/[a-z0-9*][a-z0-9.*-]*(:\d{1,5})?)$/i;

/**
 * frame-ancestors aus der Umgebungsvariable WIDGET_FRAME_ANCESTORS (durch Leerzeichen getrennte Quellen).
 * Standard "*": jede Seite darf einbetten (Entscheidung Stufe 1 – die Widgets zeigen nur öffentliche
 * Informationen, keine Personendaten; dokumentiert auf /partner/widgets). TODO-Inhaber: Für den Betrieb
 * entscheiden, ob eine Positivliste der Partner-Domains gesetzt wird. Ungültige Einträge werden verworfen;
 * bleibt nichts übrig, gilt wieder "*".
 */
export function frameAncestors(wert = process.env.WIDGET_FRAME_ANCESTORS) {
  const teile = String(wert || "").trim().split(/\s+/).filter(Boolean).filter((t) => ANCESTOR.test(t));
  if (!teile.length) return "*";
  if (teile.includes("*")) return "*";
  return teile.join(" ");
}

/**
 * Antwort-Kopfzeilen einer Widget-Route: eigene CSP (kein Skript, keine fremden Quellen, Einbettung laut
 * frameAncestors), noindex, keine Cookies nötig → zwischenspeicherbar.
 */
export function widgetKopfzeilen({ ancestors = frameAncestors(), maxAge = 600 } = {}) {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": [
      "default-src 'none'",
      "style-src 'unsafe-inline'", // nur das eigene Inline-<style>
      "img-src data:",
      "form-action 'self'",
      "base-uri 'none'",
      `frame-ancestors ${ancestors}`,
    ].join("; "),
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": `public, max-age=${maxAge}`,
  };
}

/**
 * Einbettungs-Snippet für die Dokumentationsseite /partner/widgets (zum Kopieren).
 * title am iframe = Barrierefreiheit; die Höhe ist eine Empfehlung, das Widget scrollt sonst intern.
 */
export function embedSnippet({ widgetId, land, partner = null, sprache = "de", basis }) {
  const w = WIDGETS[widgetId];
  if (!w) return "";
  const url = new URL(`/widgets/${w.id}`, basis);
  url.searchParams.set("land", widgetLand(land, widgetId));
  if (sprache === "en") url.searchParams.set("sprache", "en");
  if (kennungGueltig(partner)) url.searchParams.set("partner", partner);
  const titel = sprache === "en" ? `${w.titelEn} – ÖkoInvest` : `${w.titel} – ÖkoInvest`;
  return `<iframe src="${url.toString()}" title="${titel}" width="100%" height="${w.hoehe}" style="border:0;border-radius:12px;max-width:640px" loading="lazy"></iframe>`;
}

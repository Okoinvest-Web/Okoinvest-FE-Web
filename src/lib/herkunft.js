// src/lib/herkunft.js
//
// Kampagnen-Zuordnung für Anfragen – bewusst OHNE Cookies und OHNE Browserspeicher:
// Beim ersten Seitenaufruf werden UTM-Parameter, verweisende Domain und Einstiegsseite
// im Arbeitsspeicher der geöffneten Website gehalten (bleibt bei Navigation innerhalb der Seite
// erhalten, endet beim Schließen/Neuladen). Übertragen wird nur zusammen mit einer Anfrage.
//
// Datenschutz (Paket B, Welle 1):
// - Einmalcodes und Tokens nie im Klartext: Pfade laufen durch pfadBereinigen() (src/lib/ereignis/pfade.js):
//   /angebot/<code> → /angebot/h-<SHA-256-Präfix>, /einladung/…, /portal/…, /login/link/… → nur der Bereich.
// - Klick-IDs von Werbenetzwerken (gclid, gbraid, wbraid, msclkid, li_fat_id) bleiben NUR im Arbeitsspeicher.
//   Mit der Anfrage geht lediglich, WELCHE Art von Klick-ID vorlag (z. B. "gclid") – nie der Wert.
//   Der Wert ist über klickIds() abrufbar, darf aber erst nach einer Werbe-Einwilligung (eigene Kategorie,
//   folgt) und nach Aufnahme in die Datenschutzerklärung weitergegeben werden.
// - KI-Assistenten werden vor Suchmaschinen erkannt (gemini.google.com ist keine Google-Suche; ChatGPT hängt
//   utm_source=chatgpt.com an).

import { pfadBereinigen } from "@/lib/ereignis/pfade";

let erfasst = null;
let klick = null; // { gclid?, gbraid?, … } – nur Arbeitsspeicher, nie im Rückgabeobjekt von herkunft()

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const KLICK_IDS = ["gclid", "gbraid", "wbraid", "msclkid", "li_fat_id"];
const kurz = (v, n = 100) => String(v || "").replace(/[^\p{L}\p{N} _.\-/:+|]/gu, "").slice(0, n);

function eigeneDomain(host, eigenerHost) {
  return /(^|\.)oekoinvest\.(com|at|de|ch)$/.test(host) || host === eigenerHost;
}

/** Nur für Tests: Zustand zurücksetzen */
export function _zuruecksetzen() {
  erfasst = null;
  klick = null;
}

/**
 * Einmalig beim ersten Laden aufrufen (HerkunftErfassen in LayoutWrapper).
 * `umgebung` nur für Tests: { href, referrer, jetzt }.
 */
export function herkunftErfassen(umgebung) {
  if (erfasst) return;
  if (!umgebung && typeof window === "undefined") return;
  const href = umgebung?.href ?? window.location.href;
  const ref = umgebung?.referrer ?? document.referrer;
  const url = new URL(href);
  const utm = Object.fromEntries(UTM.map((k) => [k, kurz(url.searchParams.get(k))]).filter(([, v]) => v));

  const ids = Object.fromEntries(KLICK_IDS.map((k) => [k, kurz(url.searchParams.get(k), 200)]).filter(([, v]) => v));
  klick = Object.keys(ids).length ? ids : null;

  let referrer = "";
  try {
    const r = ref ? new URL(ref) : null;
    if (r && !eigeneDomain(r.host, url.host)) referrer = r.host.replace(/^www\./, "");
  } catch {
    /* ungültig */
  }

  const einstieg = pfadBereinigen(url.pathname);
  erfasst = {
    ...utm,
    referrer,
    einstieg,
    ...(klick ? { klick_id_typ: Object.keys(klick).join(",") } : {}),
    zeit: (umgebung?.jetzt || new Date()).toISOString(),
  };
}

const KI = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|copilot\.cloud\.microsoft|you\.com|chat\.mistral\.ai|chat\.deepseek\.com|meta\.ai|grok\.com|phind\.com|poe\.com)$/i;
const SUCHE = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|ecosia\.org|yahoo\.[a-z.]+|qwant\.com|startpage\.com|search\.brave\.com|yandex\.[a-z.]+)$/i;

/** Kanal grob klassifizieren (für Auswertungen). Exportiert für Tests. */
export function kanal(h) {
  const medium = (h.utm_medium || "").toLowerCase();
  const quelle = (h.utm_source || "").toLowerCase().replace(/^www\./, "");
  const r = (h.referrer || "").toLowerCase();
  // 1. KI-Assistenten zuerst – vor Kampagne und Suchmaschine
  if (KI.test(quelle) || /^(chatgpt|perplexity|claude|gemini|copilot)$/.test(quelle) || KI.test(r)) return "KI-Assistent";
  // 2. Anzeigen: bezahltes Medium oder Klick-ID eines Werbenetzwerks
  if (/cpc|ppc|paid|ads?$/.test(medium) || h.klick_id_typ) return "Anzeige";
  if (h.utm_source || h.utm_medium) {
    if (/social/.test(medium)) return "Social Media";
    if (/mail|newsletter/.test(medium)) return "E-Mail";
    if (/qr|print|flyer|offline/.test(medium)) return "Offline/QR";
    return "Kampagne";
  }
  if (!r) return "Direkt";
  if (SUCHE.test(r)) return "Suchmaschine";
  if (/facebook\.|instagram\.|linkedin\.|xing\.|(^|\.)t\.co$|(^|\.)x\.com$|threads\.net|mastodon|social\.|youtube\./.test(r)) return "Social Media";
  return "Verweis";
}

/** Daten zum Mitsenden mit einer Anfrage. `seite` = aktuelle Seite (bereinigt). */
export function herkunft(umgebung) {
  if (!umgebung && typeof window === "undefined") return null;
  if (!erfasst) herkunftErfassen(umgebung);
  const h = erfasst || {};
  const pfad = umgebung?.href ? new URL(umgebung.href).pathname : window.location.pathname;
  return { ...h, kanal: kanal(h), seite: pfadBereinigen(pfad) };
}

/** Klick-IDs aus dem Arbeitsspeicher – NUR nach Werbe-Einwilligung verwenden (siehe Kopf). */
export function klickIds() {
  return klick ? { ...klick } : null;
}

/** Kompakte Textzeile für Backends ohne eigene Felder (z. B. bestehende Kontaktanfrage). */
export function herkunftText(h = herkunft()) {
  if (!h) return "";
  const teile = [
    `Kanal: ${h.kanal}`,
    h.utm_source && `Quelle: ${h.utm_source}`,
    h.utm_medium && `Medium: ${h.utm_medium}`,
    h.utm_campaign && `Kampagne: ${h.utm_campaign}`,
    h.utm_term && `Keyword: ${h.utm_term}`,
    h.referrer && `Verweis: ${h.referrer}`,
    h.einstieg && `Einstieg: ${h.einstieg}`,
    h.seite && `Seite: ${h.seite}`,
  ].filter(Boolean);
  return `[Herkunft] ${teile.join(" · ")}`;
}

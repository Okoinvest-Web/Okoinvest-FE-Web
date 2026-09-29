// src/lib/herkunft.js
//
// Kampagnen-Zuordnung für Anfragen – bewusst OHNE Cookies und OHNE Browserspeicher:
// Beim ersten Seitenaufruf werden UTM-Parameter, verweisende Domain und Einstiegsseite
// im Arbeitsspeicher der geöffneten Website gehalten (bleibt bei Navigation innerhalb der Seite
// erhalten, endet beim Schließen/Neuladen). Übertragen wird nur zusammen mit einer Anfrage.

let erfasst = null;

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const kurz = (v, n = 100) => String(v || "").replace(/[^\p{L}\p{N} _.\-/:+|]/gu, "").slice(0, n);

function eigeneDomain(host) {
  return /(^|\.)oekoinvest\.(com|at|de|ch)$/.test(host) || host === location.host;
}

/** Einmalig beim ersten Laden aufrufen (HerkunftErfassen in LayoutWrapper). */
export function herkunftErfassen() {
  if (typeof window === "undefined" || erfasst) return;
  const url = new URL(window.location.href);
  const utm = Object.fromEntries(UTM.map((k) => [k, kurz(url.searchParams.get(k))]).filter(([, v]) => v));

  let referrer = "";
  try {
    const r = document.referrer ? new URL(document.referrer) : null;
    if (r && !eigeneDomain(r.host)) referrer = r.host.replace(/^www\./, "");
  } catch {
    /* ungültig */
  }

  // Einmal-Tokens nie übernehmen
  const einstieg = url.pathname.replace(/^\/(scan|fortsetzen)\/.*/, "/$1").slice(0, 200);
  erfasst = { ...utm, referrer, einstieg, zeit: new Date().toISOString() };
}

/** Kanal grob klassifizieren (für Auswertungen). */
function kanal(h) {
  const medium = (h.utm_medium || "").toLowerCase();
  if (h.utm_source || h.utm_medium) {
    if (/cpc|ppc|paid|ads?$/.test(medium)) return "Anzeige";
    if (/social/.test(medium)) return "Social Media";
    if (/mail|newsletter/.test(medium)) return "E-Mail";
    if (/qr|print|flyer|offline/.test(medium)) return "Offline/QR";
    return "Kampagne";
  }
  const r = h.referrer || "";
  if (!r) return "Direkt";
  if (/google\.|bing\.|duckduckgo\.|ecosia\.|yahoo\.|qwant\./.test(r)) return "Suchmaschine";
  if (/chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google|copilot\.microsoft/.test(r)) return "KI-Assistent";
  if (/facebook\.|instagram\.|linkedin\.|xing\.|t\.co$|x\.com|threads\.net|mastodon|social\.|youtube\./.test(r)) return "Social Media";
  return "Verweis";
}

/** Daten zum Mitsenden mit einer Anfrage. `seite` = aktuelle Seite. */
export function herkunft() {
  if (typeof window === "undefined") return null;
  if (!erfasst) herkunftErfassen();
  const h = erfasst || {};
  return { ...h, kanal: kanal(h), seite: window.location.pathname.replace(/^\/(scan|fortsetzen)\/.*/, "/$1").slice(0, 200) };
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

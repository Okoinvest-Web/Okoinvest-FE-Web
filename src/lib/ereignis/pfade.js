// src/lib/ereignis/pfade.js
//
// Welche Seiten dürfen gemessen werden, und wie werden Pfade vor der Weitergabe bereinigt?
//
// 1. POSITIVLISTE für Google Analytics und ereignis(): Gemessen wird nur, was hier ausdrücklich steht.
//    Neue öffentliche Bereiche müssen bewusst ergänzt werden – Portal, Einladungen (Tokens im Pfad), Anmelde-Links,
//    Kampagnen-Einmalcodes (/angebot/<code>), Styleguide und API sind dadurch automatisch ausgeschlossen.
// 2. BEREINIGUNG für die Kampagnen-Herkunft (src/lib/herkunft.js → CRM): Tokens und Codes nie im Klartext.
//    /angebot/<code> wird zu /angebot/h-<16 Hex-Zeichen von SHA-256(code)>; so lässt sich im Backoffice die Kampagne
//    zuordnen (Code hashen und vergleichen), ohne dass der Code selbst in CRM, Berichten oder Logs steht.
//    Alle anderen Token-Pfade werden auf ihren Bereich gekürzt (/einladung, /portal, /login/link …).

import { sha256Hex } from "./sha256.js";

/** Erstes Pfadsegment öffentlicher Bereiche (Stand src/app, 10/2026). "" = Startseite. */
export const OEFFENTLICHE_BEREICHE = Object.freeze([
  "",
  "agri-pv",
  "barrierefreiheit",
  "bedingungen",
  "bestandsanlagen",
  "dachflaeche-verpachten",
  "datenschutz",
  "en",
  "energie-live",
  "energiegemeinschaften",
  "faq",
  "flaeche-verpachten",
  "flaechencheck",
  "freiflaeche",
  "genossenschaft",
  "grossspeicher",
  "impressum",
  "investoren",
  "kommunen",
  "kontakt",
  "landwirte",
  "marktdaten",
  "nutzungsbedingungen",
  "projektboerse",
  "prozess",
  "ratgeber",
  "rechner",
  "referenzen",
  "regionen",
  "registrieren",
  "reststrom",
  "solarcarport",
  "termin",
  "unternehmen",
  "virtuelles-kraftwerk",
  "warum-oekoinvest",
  "wissen",
]);

const BEREICHE = new Set(OEFFENTLICHE_BEREICHE);
// Nur „normale“ Pfadzeichen; alles andere (kodierte Tokens, Steuerzeichen) wird nicht gemessen
const SICHERER_PFAD = /^\/[A-Za-z0-9\-_/.]*$/;

/** Darf diese Seite gemessen werden? (Pfad ohne Query/Fragment) */
export function oeffentlicherPfad(pfad) {
  const p = String(pfad || "");
  if (!SICHERER_PFAD.test(p) || p.length > 200 || p.includes("..")) return false;
  const erstes = p.split("/")[1] || "";
  return BEREICHE.has(erstes);
}

/** Kurzer Hash eines Einmalcodes (16 Hex-Zeichen = 64 Bit von SHA-256) */
export function codeHash(code) {
  return sha256Hex(String(code || "")).slice(0, 16);
}

const ERSETZEN = [
  [/^\/angebot\/([^/?#]+).*$/, (_, code) => `/angebot/h-${codeHash(decodeURIComponentSicher(code))}`],
  [/^\/einladung(\/.*)?$/, () => "/einladung"],
  [/^\/login\/link(\/.*)?$/, () => "/login/link"],
  [/^\/portal(\/.*)?$/, () => "/portal"],
  [/^\/(scan|fortsetzen|tv)\/.*$/, (_, b) => `/${b}`],
  [/^\/api(\/.*)?$/, () => "/api"],
];

function decodeURIComponentSicher(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Pfad für die Weitergabe (Herkunft im CRM) bereinigen: Query und Fragment weg, Tokens/Codes nie im Klartext.
 * Unbekannte Pfade mit ungewöhnlichen Zeichen werden auf "/" gekürzt.
 */
export function pfadBereinigen(pfad) {
  let p = String(pfad || "").split(/[?#]/)[0] || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  for (const [muster, ersatz] of ERSETZEN) {
    if (muster.test(p)) return p.replace(muster, ersatz);
  }
  if (!SICHERER_PFAD.test(p)) return "/";
  return p.slice(0, 200);
}

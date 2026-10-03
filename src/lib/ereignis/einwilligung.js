// src/lib/ereignis/einwilligung.js
//
// Einwilligung aus dem Cookie-Banner lesen und schreiben – EINE Stelle für Banner, Google Analytics und ereignis().
//
// Cookie „cookieConsent“ (technisch notwendig, 12 Monate, SameSite=Lax) enthält:
//   { v: <Fassung des Banner-Texts>, zeit: <ISO-Zeitpunkt der Auswahl>, essential: true, statistics, googleAnalytics }
// Fehlt die Fassung oder ist sie veraltet, gilt das als „keine Entscheidung“: Es wird nichts geladen und der Banner
// fragt neu (z. B. nach Änderung der Texte oder einer neuen Kategorie). Ein serverseitiges Einwilligungsprotokoll
// (Nachweis nach Art. 7 Abs. 1 DSGVO) folgt mit dem Einwilligungs-Ledger (Masterplan Abschnitt 5.3) – hier nicht.

/** Bei jeder inhaltlichen Änderung der Banner-Texte oder Kategorien hochzählen → alle Besucher werden neu gefragt. */
export const EINWILLIGUNG_VERSION = "2026-10-w1b";
export const EINWILLIGUNG_COOKIE = "cookieConsent";
export const EINWILLIGUNG_LAUFZEIT_S = 60 * 60 * 24 * 365; // 12 Monate (so in der Datenschutzerklärung beschrieben)
/** Browser-Ereignis nach jeder Änderung (GoogleAnalytics hört darauf) */
export const EINWILLIGUNG_EREIGNIS = "ov-consent";

export const OHNE_EINWILLIGUNG = Object.freeze({ essential: true, statistics: false, googleAnalytics: false });

function cookieWert(cookieText, name) {
  const roh = String(cookieText || "")
    .split(/;\s*/)
    .find((c) => c.startsWith(`${name}=`));
  return roh ? roh.slice(name.length + 1) : null;
}

/**
 * Gespeicherte Auswahl oder null (kein Cookie, ungültig, alte Fassung).
 * `cookieText` nur für Tests – im Browser wird document.cookie gelesen.
 */
export function einwilligungLesen(cookieText) {
  const quelle = cookieText ?? (typeof document !== "undefined" ? document.cookie : "");
  const wert = cookieWert(quelle, EINWILLIGUNG_COOKIE);
  if (!wert) return null;
  try {
    const d = JSON.parse(decodeURIComponent(wert));
    if (!d || typeof d !== "object" || d.v !== EINWILLIGUNG_VERSION) return null;
    return {
      v: d.v,
      zeit: typeof d.zeit === "string" ? d.zeit.slice(0, 40) : "",
      essential: true,
      statistics: d.statistics === true && d.googleAnalytics === true,
      googleAnalytics: d.statistics === true && d.googleAnalytics === true,
    };
  } catch {
    return null;
  }
}

/** Neue, vollständige Einwilligung aus einer Auswahl (nur ausdrückliches true zählt). */
export function einwilligungErstellen(auswahl = {}, jetzt = new Date()) {
  const statistik = auswahl.statistics === true || auswahl.googleAnalytics === true;
  return { v: EINWILLIGUNG_VERSION, zeit: jetzt.toISOString(), essential: true, statistics: statistik, googleAnalytics: statistik };
}

/** Darf gemessen werden? Nur bei gültiger, aktueller Einwilligung in „Statistik“. */
export function statistikErlaubt(cookieText) {
  if (cookieText === undefined && typeof document === "undefined") return false;
  return einwilligungLesen(cookieText)?.googleAnalytics === true;
}

// src/lib/ereignis/senden.js
//
// ereignis(name, daten) – zählt eine Aktion in Google Analytics, aber NUR wenn alles zutrifft:
//   1. gültige, aktuelle Einwilligung in „Statistik“ (Cookie-Banner, siehe einwilligung.js)
//   2. Google Analytics ist geladen und auf dieser Seite aktiv (window.ovMessungAktiv, gesetzt von
//      components/Statistik/GoogleAnalytics.js – nur auf Seiten der Positivliste)
//   3. die aktuelle Seite steht auf der Positivliste (pfade.js)
//   4. der Name steht im Ereigniskatalog unten
// Sonst passiert nichts – kein Puffern, kein Nachsenden, kein Speichern im Browser.
//
// Parameter: nur Zahlen, Wahrheitswerte und kurze Texte aus festen Schlüsseln. Werte, die wie E-Mail-Adresse,
// Telefonnummer, IBAN, URL oder Token aussehen, werden verworfen. Niemals Namen, Freitexte oder IDs übergeben.
//
// Rückgabe: true, wenn das Ereignis an gtag übergeben wurde (für Tests und Fehlersuche), sonst false.

import { statistikErlaubt } from "./einwilligung.js";
import { oeffentlicherPfad } from "./pfade.js";

/**
 * Ereigniskatalog (Lead-Trichter, angelehnt an die GA4-Empfehlungen für Lead-Generierung).
 * Neue Ereignisse hier ergänzen und in GA4 als Schlüsselereignis markieren, wo sinnvoll.
 */
export const EREIGNISSE = Object.freeze({
  generate_lead: "Anfrage gesendet",
  sign_up: "Registrierung abgeschlossen",
  termin_gebucht: "Termin gebucht",
  rechner_ergebnis: "Rechnerergebnis angezeigt (einmal je Rechner und Seitenbesuch)",
  rechner_anfrage_klick: "Klick auf „Anfrage zum Ergebnis“",
  bericht_angefordert: "Bericht angefordert",
  flaechencheck_abgeschlossen: "Flächencheck abgeschlossen",
  projekt_expose_ansicht: "Exposé in der Projektbörse geöffnet",
  datei_download: "Datei heruntergeladen",
  formular_schritt: "Schritt in einem mehrstufigen Formular erreicht",
});

/** Erlaubte Parameter-Schlüssel */
export const PARAMETER = Object.freeze([
  "lead_typ", // flaeche | agri | investor | projekt | reststrom | kommune | eg | …
  "markt", // DE | AT | CH
  "quelle_formular",
  "rolle",
  "rechner_id",
  "art",
  "schritt",
  "datei_typ",
  "anzahl",
  "wert_klasse", // grobe Klasse (z. B. "5-20 ha"), nie exakte personenbezogene Werte
]);
const PARAMETER_SET = new Set(PARAMETER);

// Muster für Werte, die nie an Google gehen dürfen
const VERDAECHTIG = [
  /@/, // E-Mail
  /(?:\+|\b00)\d|\d[\d\s/().-]{6,}\d/, // Telefonnummer bzw. lange Ziffernfolge
  /\b[A-Z]{2}\d{2}[A-Z0-9 ]{10,}/i, // IBAN
  /https?:|www\.|\/\//i, // URL
  /[A-Za-z0-9_-]{24,}/, // Token-artige Zeichenkette
];

function wertSauber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, 60);
  if (!t || VERDAECHTIG.some((re) => re.test(t))) return undefined;
  return t;
}

/** Parameter auf Positivliste und unverdächtige Werte reduzieren (exportiert für Tests) */
export function parameterBereinigen(daten) {
  if (!daten || typeof daten !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(daten)) {
    if (!PARAMETER_SET.has(k)) continue;
    const w = wertSauber(v);
    if (w !== undefined) out[k] = w;
  }
  return out;
}

/** Darf jetzt überhaupt gemessen werden? */
export function messungMoeglich() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!statistikErlaubt()) return false;
  if (window.ovMessungAktiv !== true || typeof window.gtag !== "function") return false;
  return oeffentlicherPfad(window.location?.pathname);
}

export function ereignis(name, daten) {
  try {
    if (!Object.prototype.hasOwnProperty.call(EREIGNISSE, name)) return false;
    if (!messungMoeglich()) return false;
    window.gtag("event", name, parameterBereinigen(daten));
    return true;
  } catch {
    return false; // Statistik darf nie stören
  }
}

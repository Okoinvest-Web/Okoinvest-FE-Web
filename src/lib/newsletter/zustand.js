// src/lib/newsletter/zustand.js – Zustand eines Newsletter-Abos (Welle 3, Paket NL). Rein, ohne Abhängigkeiten.
//
//   "offen"       angemeldet, Bestätigung ausstehend (höchstens DOI_STUNDEN)
//   "aktiv"       bestätigt – erhält den Newsletter, bis zur Abmeldung
//   "abgemeldet"  abgemeldet (Grabstein ohne Personendaten)
//   "ersetzt"     durch eine neuere, bestätigte Anmeldung derselben Adresse ersetzt (Grabstein)
//   "abgelaufen"  nicht rechtzeitig bestätigt (Grabstein, Angaben gelöscht)
//   null          unbekannt

export const ABO_ZUSTAENDE = Object.freeze(["offen", "aktiv", "abgemeldet", "ersetzt", "abgelaufen"]);

/** Grabsteine (ohne Personendaten) verschwinden nach so vielen Tagen. */
export const GRABSTEIN_TAGE = 400;

export function aboZustand(abo, jetztMs = Date.now()) {
  if (!abo) return null;
  if (["aktiv", "abgemeldet", "ersetzt", "abgelaufen"].includes(abo.status)) return abo.status;
  const ablauf = Date.parse(abo.ablauf || "");
  if (!Number.isFinite(ablauf) || jetztMs > ablauf) return "abgelaufen";
  return "offen";
}

// src/lib/eg-angebot/preisblatt.js – öffentliches Preisblatt der EG-Software Österreich (Welle 3, Paket B7)
//
// Masterplan B7: „öffentliches Preisblatt … öffentlicher Preis je Zählpunkt“. Die STRUKTUR steht
// (Einrichtung einmalig, Grundgebühr je Gemeinschaft, Betrag je Zählpunkt – je Paket), die BETRÄGE
// nicht: Im Code und in den Unterlagen gibt es keine freigegebenen Preise (Pakete-Abschnitt der
// Software-Seite: „Preise auf Anfrage“). Darum gilt:
//   - Solange FREIGABE.freigegeben false ist, zeigt die Seite für jeden Posten „Preis auf Anfrage“
//     und den Vermerk „Freigabe durch den Inhaber ausstehend“ – auch wenn ein Betrag eingetragen wäre.
//   - Beträge trägt nur der Inhaber ein (netto, EUR), zusammen mit freigegeben: true, stand und freigabeDurch.
//   - preisblatt.test.mjs sichert ab, dass ohne Freigabe kein Betrag im Register steht (keine erfundenen Preise).
// Reine Funktionen ohne Importe aus Next.js (node:test lädt das Modul direkt).

/** Freigabe-Vermerk des Preisblatts. Inhaberpunkt: Beträge und Freigabe stehen aus. */
export const FREIGABE = Object.freeze({
  freigegeben: false,
  stand: null, // ISO-Datum der Freigabe
  freigabeDurch: null, // z. B. "Geschäftsführung"
  waehrung: "EUR",
  ustSatz: 0.2, // Umsatzsteuer AT (Normalsatz) – für die Brutto-Angabe, sobald Beträge freigegeben sind
});

/** Preisposten in Anzeigereihenfolge. */
export const POSTEN = Object.freeze([
  Object.freeze({ id: "einrichtung", art: "einmalig" }),
  Object.freeze({ id: "grundgebuehr", art: "monatlich" }),
  Object.freeze({ id: "zaehlpunkt", art: "monatlich" }),
]);

/** Pakete wie auf /energiegemeinschaften/software (Abschnitt Pakete, gleiche ids ohne „paket-“). */
export const PAKETE = Object.freeze(["software", "betrieb", "gruendung"]);

/**
 * Beträge netto in EUR je Paket und Posten. null = nicht freigegeben, "entfaellt" = Posten gibt es im Paket nicht.
 * Gründung ist eine einmalige Leistung; der laufende Betrieb läuft danach über Software oder Betriebsführung.
 */
export const PREISE = Object.freeze({
  software: Object.freeze({ einrichtung: null, grundgebuehr: null, zaehlpunkt: null }),
  betrieb: Object.freeze({ einrichtung: null, grundgebuehr: null, zaehlpunkt: null }),
  gruendung: Object.freeze({ einrichtung: null, grundgebuehr: "entfaellt", zaehlpunkt: "entfaellt" }),
});

const istBetrag = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;

/**
 * Anzeige eines Postens.
 * @returns {{ status: "betrag" | "anfrage" | "entfaellt", netto: number|null, brutto: number|null }}
 */
export function postenAnzeige(paket, posten, { freigabe = FREIGABE, preise = PREISE } = {}) {
  const roh = preise?.[paket]?.[posten];
  if (roh === "entfaellt") return { status: "entfaellt", netto: null, brutto: null };
  if (!freigabe?.freigegeben || !istBetrag(roh)) return { status: "anfrage", netto: null, brutto: null };
  const brutto = Math.round(roh * (1 + (freigabe.ustSatz ?? 0)) * 100) / 100;
  return { status: "betrag", netto: roh, brutto };
}

/** Tabelle des Preisblatts: je Paket die Posten mit Anzeige. */
export function preisblatt(optionen) {
  return PAKETE.map((paket) => ({ paket, posten: POSTEN.map((p) => ({ ...p, ...postenAnzeige(paket, p.id, optionen) })) }));
}

/** Ist mindestens ein Betrag öffentlich sichtbar? (false, solange nicht freigegeben) */
export function hatOeffentlichePreise(optionen) {
  return preisblatt(optionen).some((z) => z.posten.some((p) => p.status === "betrag"));
}

/**
 * Laufende Kosten im Jahr (netto) für eine Zahl von Zählpunkten – nur mit freigegebenen Beträgen,
 * sonst null (nie mit Platzhaltern rechnen).
 */
export function jahresKosten(paket, zaehlpunkte, optionen) {
  const n = Number(zaehlpunkte);
  if (!Number.isFinite(n) || n < 0) return null;
  const g = postenAnzeige(paket, "grundgebuehr", optionen);
  const z = postenAnzeige(paket, "zaehlpunkt", optionen);
  if (g.status === "entfaellt" && z.status === "entfaellt") return null;
  if (g.status === "anfrage" || z.status === "anfrage") return null;
  const monat = (g.netto ?? 0) + (z.netto ?? 0) * Math.round(n);
  return Math.round(monat * 12 * 100) / 100;
}

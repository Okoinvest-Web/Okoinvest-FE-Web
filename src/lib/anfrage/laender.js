// src/lib/anfrage/laender.js
//
// Länderlogik für Anfragen (Paket C, Welle 1): Land aus dem Kontext bestimmen, PLZ-Regel je Land,
// länderrichtige Begriffe. Reine Funktionen ohne React und ohne Server-Abhängigkeiten – genutzt vom
// Anfrageformular (Client), vom Demo-Backend (Server) und von den Tests. Die Frappe-Seite spiegelt
// dieselbe Logik in Backend-Import/…/plattform/api/anfrage.py (_land_bestimmen).

export const ANFRAGE_LAENDER = Object.freeze(["DE", "AT", "CH"]);

/** PLZ-Muster je Land: DE 5 Ziffern, AT 4 Ziffern, CH 4 Ziffern */
export const PLZ_MUSTER = Object.freeze({ DE: /^\d{5}$/, AT: /^\d{4}$/, CH: /^\d{4}$/ });
export const PLZ_BEISPIEL = Object.freeze({ DE: "86825", AT: "5020", CH: "8001" });

/** "at", " CH " → "AT" | "CH"; alles andere → "" */
export function landNormal(wert) {
  const s = typeof wert === "string" ? wert.trim().toUpperCase() : "";
  return ANFRAGE_LAENDER.includes(s) ? s : "";
}

/** Land aus fachlichen Zusatzdaten: Regionsseiten schicken daten.land, der Flächencheck daten.eingaben.land */
export function landAusDaten(daten) {
  if (!daten || typeof daten !== "object") return "";
  return landNormal(daten.land) || landNormal(daten.eingaben?.land) || "";
}

/**
 * Land einer Anfrage, in dieser Reihenfolge:
 *  1. ausdrücklich gewähltes bzw. übergebenes Land (kontakt.land)
 *  2. Land aus dem Kontext der Seite (daten.land / daten.eingaben.land)
 *  3. eindeutige PLZ: nur 5 Ziffern sind eindeutig (Deutschland); 4 Ziffern können AT oder CH sein → offen
 * Ergebnis "" heißt: Land unbekannt.
 */
export function anfrageLand(kontakt, daten) {
  const direkt = landNormal(kontakt?.land) || landAusDaten(daten);
  if (direkt) return direkt;
  const plz = String(kontakt?.plz ?? "").trim();
  return PLZ_MUSTER.DE.test(plz) ? "DE" : "";
}

/** Passt die PLZ zum Land? Leere PLZ ist immer in Ordnung (Feld ist optional). Unbekanntes Land: 4 oder 5 Ziffern. */
export function plzPasst(land, plz) {
  const s = String(plz ?? "").trim();
  if (!s) return true;
  const l = landNormal(land);
  if (l) return PLZ_MUSTER[l].test(s);
  return /^\d{4,5}$/.test(s);
}

/** Begriff für das Grundstück im Kataster – „Flurstück“ gibt es nur in Deutschland */
export const GRUNDSTUECK = Object.freeze({
  DE: { einzahl: "Flurstück", mehrzahl: "Flurstücke", genau: "flurstückgenau" },
  AT: { einzahl: "Grundstücksnummer", mehrzahl: "Grundstücke", genau: "grundstücksgenau" },
  CH: { einzahl: "Parzelle", mehrzahl: "Parzellen", genau: "parzellengenau" },
});
export const grundstueck = (land) => GRUNDSTUECK[landNormal(land)] || { einzahl: "Flurstück bzw. Grundstücksnummer/Parzelle", mehrzahl: "Flurstücke bzw. Grundstücke/Parzellen", genau: "grundstücksgenau" };

/** Wizard-Nutzung → Nutzungsschlüssel der Fläche im Backend (konstanten.js FLAECHE_NUTZUNG) */
export const NUTZUNG_ALIAS = Object.freeze({ parkplatz: "gewerbe", deponie: "sonstige" });

/** Welle 2, Paket B3: Land eines Leads ist Pflicht – DE | AT | CH oder ausdrücklich "unbekannt" (nie leer, nie still DE) */
export const leadLand = (wert) => landNormal(wert) || "unbekannt";

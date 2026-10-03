// src/lib/ereignis/index.js
//
// Messung von Aktionen (Lead-Trichter) – feuert nur mit Einwilligung, siehe senden.js.
//
// Verwendung in Client-Komponenten (Anschluss der Formulare: Paket C):
//   import { useEreignis } from "@/lib/ereignis";
//   const melden = useEreignis();
//   … nach erfolgreichem Absenden: melden("generate_lead", { lead_typ: "flaeche", markt: "AT" });
//
//   import { useEreignisEinmal } from "@/lib/ereignis";
//   useEreignisEinmal("rechner_ergebnis", { rechner_id: "pacht", markt: "DE" }, ergebnisSichtbar);
//
// Außerhalb von React: import { ereignis } from "@/lib/ereignis";

"use client";

import { useCallback, useEffect, useRef } from "react";
import { ereignis } from "./senden.js";

export { ereignis, EREIGNISSE, PARAMETER, parameterBereinigen, messungMoeglich } from "./senden.js";
export { statistikErlaubt, einwilligungLesen, EINWILLIGUNG_VERSION, EINWILLIGUNG_EREIGNIS } from "./einwilligung.js";
export { oeffentlicherPfad, pfadBereinigen } from "./pfade.js";

/** Stabile Funktion zum Melden eines Ereignisses (ändert sich nicht zwischen Renders). */
export function useEreignis() {
  return useCallback((name, daten) => ereignis(name, daten), []);
}

/**
 * Meldet ein Ereignis höchstens einmal je Komponenten-Lebenszeit, sobald `bedingung` wahr wird.
 * Wird es ohne Einwilligung nicht gesendet, gilt es NICHT als gemeldet (kein Nachsenden aus einem Puffer –
 * erst ein späteres erneutes Eintreten nach Einwilligung zählt).
 */
export function useEreignisEinmal(name, daten, bedingung = true) {
  const gemeldet = useRef(false);
  const datenRef = useRef(daten);
  datenRef.current = daten;
  useEffect(() => {
    if (!bedingung || gemeldet.current) return;
    if (ereignis(name, datenRef.current)) gemeldet.current = true;
  }, [name, bedingung]);
}

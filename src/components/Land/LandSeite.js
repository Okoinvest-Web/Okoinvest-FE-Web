// Länderfassung einer Seite (/de, /at, /ch und /en/de, /en/at, /en/ch) – DIESELBE Seitenkomponente
// wie die gemeinsame Seite; die Routen unter src/app/(laender)/[land]/… und src/app/(en)/en/[land]/…
// (erzeugt mit scripts/landfassungen.mjs) reichen sie hierüber weiter:
//
//   import Seite from "@/app/(stamm)/rechner/pacht/page";
//   import { landSeite } from "@/components/Land/LandSeite";
//   export default landSeite(Seite);
//
// Deutschland und Österreich: die Seite unverändert. Schweiz: dieselbe Seite, alle Texte ohne „ß“
// (Schweizer Schreibweise, ./SchweizSeite.js) – zentral für die ganze Seite, damit nicht
// jeder Baustein einzeln daran denken muss. Design, Inhalt und Aufbau bleiben identisch.

import { createElement } from "react";
import { landAusPraefix } from "@/lib/land/laender";
import { schreibweiseSeite } from "./SchweizSeite";

export function landSeite(Seite) {
  async function LandSeite(props) {
    const p = (await props.params) || {};
    const seite = createElement(Seite, props);
    if (landAusPraefix(p.land) !== "CH") return seite;
    return schreibweiseSeite(seite, "CH");
  }
  LandSeite.displayName = `Land(${Seite.displayName || Seite.name || "Seite"})`;
  return LandSeite;
}

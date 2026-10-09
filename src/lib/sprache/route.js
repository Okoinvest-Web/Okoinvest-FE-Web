// src/lib/sprache/route.js – englische Routen auf DIESELBE Seitenkomponente (Sprachmodell)
//
// Die Routen unter src/app/(en)/en/… und src/app/(en)/en/[land]/… (erzeugt mit
// scripts/landfassungen.mjs) kopieren keine Seite. Sie reichen die deutsche Seite aus
// src/app/(stamm)/… weiter und setzen nur params.sprache = "en":
//
//   import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/rechner/pacht/page";
//   import { englisch, englischeMetadaten } from "@/lib/sprache/route";
//   export default englisch(Seite);
//   export const generateMetadata = englischeMetadaten(metadaten);
//
// Die Seite liest Land UND Sprache mit seitenLand(params) (src/lib/land/seite.js), Bausteine
// darunter mit spracheDerAnfrage() bzw. useSprache() im Browser.

import { createElement } from "react";

/** params (Promise oder Objekt) um sprache ergänzen. */
export const mitSprache = (params, sprache = "en") => Promise.resolve(params).then((p) => ({ ...(p || {}), sprache }));

/** Seitenkomponente in einer Sprache. */
export function englisch(Seite) {
  function EnglischeSeite(props) {
    return createElement(Seite, { ...props, params: mitSprache(props.params, "en") });
  }
  EnglischeSeite.displayName = `Englisch(${Seite.displayName || Seite.name || "Seite"})`;
  return EnglischeSeite;
}

/** generateMetadata in einer Sprache (ohne eigene Metadaten der Seite: undefined). */
export function englischeMetadaten(generateMetadata) {
  if (typeof generateMetadata !== "function") return undefined;
  return function englischeMetadata(props, parent) {
    return generateMetadata({ ...props, params: mitSprache(props.params, "en") }, parent);
  };
}

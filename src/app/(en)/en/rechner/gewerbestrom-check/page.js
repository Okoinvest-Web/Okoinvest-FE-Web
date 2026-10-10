// Englische Fassung von /rechner/gewerbestrom-check (/en) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/rechner/gewerbestrom-check/page.js; Sprache "en" über params.sprache.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/rechner/gewerbestrom-check/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
export default englisch(Seite);
export const generateMetadata = englischeMetadaten(metadaten);

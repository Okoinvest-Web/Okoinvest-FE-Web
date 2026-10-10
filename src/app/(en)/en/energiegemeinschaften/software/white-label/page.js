// Englische Fassung von /energiegemeinschaften/software/white-label (/en) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/energiegemeinschaften/software/white-label/page.js; Sprache "en" über params.sprache.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/energiegemeinschaften/software/white-label/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
export default englisch(Seite);
export const generateMetadata = englischeMetadaten(metadaten);

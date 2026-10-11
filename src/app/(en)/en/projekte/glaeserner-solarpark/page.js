// Englische Fassung von /projekte/glaeserner-solarpark (/en) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/projekte/glaeserner-solarpark/page.js; Sprache "en" über params.sprache.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/projekte/glaeserner-solarpark/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
export default englisch(Seite);
export const generateMetadata = englischeMetadaten(metadaten);

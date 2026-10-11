// Englische Fassung von /marktdaten/strompreise-schweiz (/en) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/marktdaten/strompreise-schweiz/page.js; Sprache "en" über params.sprache.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/marktdaten/strompreise-schweiz/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
export default englisch(Seite);
export const generateMetadata = englischeMetadaten(metadaten);

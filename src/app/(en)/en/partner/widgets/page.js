// Englische Fassung von /partner/widgets (/en) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/partner/widgets/page.js; Sprache "en" über params.sprache.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/partner/widgets/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
export default englisch(Seite);
export const generateMetadata = englischeMetadaten(metadaten);

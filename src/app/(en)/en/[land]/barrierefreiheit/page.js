// Englische Fassung von /barrierefreiheit (/en/de, /en/at, /en/ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/barrierefreiheit/page.js; Sprache "en" über params.sprache, das Land aus params.land.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/barrierefreiheit/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(englisch(Seite));
export const generateMetadata = englischeMetadaten(metadaten);

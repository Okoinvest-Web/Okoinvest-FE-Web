// Englische Fassung von /newsroom/[slug] (/en) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/newsroom/[slug]/page.js; Sprache "en" über params.sprache.
import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/newsroom/[slug]/page";
import { englisch, englischeMetadaten } from "@/lib/sprache/route";
export default englisch(Seite);
export const generateMetadata = englischeMetadaten(metadaten);
export { generateStaticParams } from "@/app/(stamm)/newsroom/[slug]/page";
export const dynamicParams = false;

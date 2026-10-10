// Länderfassung von /newsroom/[slug] (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/newsroom/[slug]/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/newsroom/[slug]/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata, generateStaticParams } from "@/app/(stamm)/newsroom/[slug]/page";
export const dynamicParams = false;

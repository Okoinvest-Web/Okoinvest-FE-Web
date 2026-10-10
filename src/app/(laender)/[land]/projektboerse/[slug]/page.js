// Länderfassung von /projektboerse/[slug] (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/projektboerse/[slug]/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/projektboerse/[slug]/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/projektboerse/[slug]/page";
export const dynamic = "force-dynamic";

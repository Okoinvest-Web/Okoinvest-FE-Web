// Länderfassung von /newsletter (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/newsletter/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/newsletter/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/newsletter/page";

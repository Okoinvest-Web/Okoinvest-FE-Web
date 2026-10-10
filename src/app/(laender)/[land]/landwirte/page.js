// Länderfassung von /landwirte (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/landwirte/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/landwirte/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/landwirte/page";

// Länderfassung von /energie-live (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/energie-live/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/energie-live/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/energie-live/page";
export const revalidate = 900;

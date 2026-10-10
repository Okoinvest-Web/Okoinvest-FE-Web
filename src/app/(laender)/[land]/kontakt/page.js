// Länderfassung von /kontakt (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/kontakt/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/kontakt/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/kontakt/page";

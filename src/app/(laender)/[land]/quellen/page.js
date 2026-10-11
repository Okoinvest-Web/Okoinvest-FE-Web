// Länderfassung von /quellen (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/quellen/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/quellen/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/quellen/page";
export const revalidate = 3600;

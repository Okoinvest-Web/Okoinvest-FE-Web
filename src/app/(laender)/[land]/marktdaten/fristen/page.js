// Länderfassung von /marktdaten/fristen (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/marktdaten/fristen/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/marktdaten/fristen/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/marktdaten/fristen/page";
export const revalidate = 3600;

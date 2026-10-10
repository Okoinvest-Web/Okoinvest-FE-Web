// Länderfassung von /marktdaten/ausschreibungen (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/marktdaten/ausschreibungen/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/marktdaten/ausschreibungen/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/marktdaten/ausschreibungen/page";
export const revalidate = 3600;

// Länderfassung von /virtuelles-kraftwerk (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/virtuelles-kraftwerk/page.js; das Land kommt aus params.land.
import Seite from "@/app/(stamm)/virtuelles-kraftwerk/page";
import { landSeite } from "@/components/Land/LandSeite";
export default landSeite(Seite);
export { generateMetadata } from "@/app/(stamm)/virtuelles-kraftwerk/page";
export const revalidate = 900;

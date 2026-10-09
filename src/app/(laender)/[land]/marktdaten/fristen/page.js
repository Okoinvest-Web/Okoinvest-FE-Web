// Länderfassung von /marktdaten/fristen (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/marktdaten/fristen/page.js; das Land kommt aus params.land.
export { default, generateMetadata } from "@/app/(stamm)/marktdaten/fristen/page";
export const revalidate = 3600;

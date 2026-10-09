// Länderfassung von /marktdaten (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/marktdaten/page.js; das Land kommt aus params.land.
export { default, generateMetadata } from "@/app/(stamm)/marktdaten/page";
export const revalidate = 900;

// Länderfassung von /regionen/[slug] (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.
// Dieselbe Seite wie src/app/(stamm)/regionen/[slug]/page.js; das Land kommt aus params.land.
export { default, generateMetadata, generateStaticParams } from "@/app/(stamm)/regionen/[slug]/page";
export const dynamicParams = false;

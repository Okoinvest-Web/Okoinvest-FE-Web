// src/lib/fakten/daten/umlagen-de.js
//
// Umlagen (DE) – Paket FRI. Die Daten stehen in umlagen-2027.js (bisher nur DE); dieses Modul
// filtert sie auf DE. Eingebunden in ../index.js. Vertrag: ../schema.js.

import UMLAGEN_2027 from "./umlagen-2027.js";

const MODUL = { name: "umlagen-de", land: "DE", fakten: UMLAGEN_2027.filter((f) => f.land === "DE") };

export default MODUL;

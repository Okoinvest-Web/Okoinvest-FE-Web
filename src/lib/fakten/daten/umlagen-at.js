// src/lib/fakten/daten/umlagen-at.js
//
// Umlagen (AT) – Paket FRI. Die Daten stehen in umlagen-2027.js (bisher nur DE); dieses Modul
// filtert sie auf AT. Eingebunden in ../index.js. Vertrag: ../schema.js.

import UMLAGEN_2027 from "./umlagen-2027.js";

const MODUL = { name: "umlagen-at", land: "AT", fakten: UMLAGEN_2027.filter((f) => f.land === "AT") };

export default MODUL;

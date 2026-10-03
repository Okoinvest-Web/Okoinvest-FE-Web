// src/lib/fakten/daten/umlagen-ch.js
//
// Umlagen (CH) – Paket FRI. Die Daten stehen in umlagen-2027.js (bisher nur DE); dieses Modul
// filtert sie auf CH. Eingebunden in ../index.js. Vertrag: ../schema.js.

import UMLAGEN_2027 from "./umlagen-2027.js";

const MODUL = { name: "umlagen-ch", land: "CH", fakten: UMLAGEN_2027.filter((f) => f.land === "CH") };

export default MODUL;

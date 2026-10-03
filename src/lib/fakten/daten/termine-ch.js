// src/lib/fakten/daten/termine-ch.js
//
// Termine (CH) – Paket FRI. Die Daten stehen in termine-2026.js (und je Jahr weiteren Dateien);
// dieses Modul filtert sie auf CH. Eingebunden in ../index.js. Vertrag: ../schema.js.

import TERMINE_2026 from "./termine-2026.js";

const MODUL = { name: "termine-ch", land: "CH", fakten: TERMINE_2026.filter((f) => f.land === "CH") };

export default MODUL;

// src/lib/fakten/daten/termine-de.js
//
// Termine (DE) – Paket FRI. Die Daten stehen in termine-2026.js (und je Jahr weiteren Dateien);
// dieses Modul filtert sie auf DE. Eingebunden in ../index.js. Vertrag: ../schema.js.

import TERMINE_2026 from "./termine-2026.js";

const MODUL = { name: "termine-de", land: "DE", fakten: TERMINE_2026.filter((f) => f.land === "DE") };

export default MODUL;

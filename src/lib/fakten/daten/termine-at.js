// src/lib/fakten/daten/termine-at.js
//
// Termine (AT) – Paket FRI. Die Daten stehen in termine-2026.js (und je Jahr weiteren Dateien);
// dieses Modul filtert sie auf AT. Eingebunden in ../index.js. Vertrag: ../schema.js.

import TERMINE_2026 from "./termine-2026.js";

const MODUL = { name: "termine-at", land: "AT", fakten: TERMINE_2026.filter((f) => f.land === "AT") };

export default MODUL;

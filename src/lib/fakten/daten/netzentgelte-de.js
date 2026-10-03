// src/lib/fakten/daten/netzentgelte-de.js
//
// Netzentgelte (DE) – Paket FRI. Die Daten stehen in netzentgelte-2027.js; dieses Modul
// filtert sie auf DE. Eingebunden in ../index.js. Vertrag: ../schema.js.

import NETZENTGELTE_2027 from "./netzentgelte-2027.js";

const MODUL = { name: "netzentgelte-de", land: "DE", fakten: NETZENTGELTE_2027.filter((f) => f.land === "DE") };

export default MODUL;

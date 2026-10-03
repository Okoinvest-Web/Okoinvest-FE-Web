// src/lib/fakten/daten/netzentgelte-at.js
//
// Netzentgelte (AT) – Paket FRI. Die Daten stehen in netzentgelte-2027.js; dieses Modul
// filtert sie auf AT. Eingebunden in ../index.js. Vertrag: ../schema.js.

import NETZENTGELTE_2027 from "./netzentgelte-2027.js";

const MODUL = { name: "netzentgelte-at", land: "AT", fakten: NETZENTGELTE_2027.filter((f) => f.land === "AT") };

export default MODUL;

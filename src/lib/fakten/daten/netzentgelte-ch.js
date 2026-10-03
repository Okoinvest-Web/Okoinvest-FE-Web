// src/lib/fakten/daten/netzentgelte-ch.js
//
// Netzentgelte (CH) – Paket FRI. Die Daten stehen in netzentgelte-2027.js; dieses Modul
// filtert sie auf CH. Eingebunden in ../index.js. Vertrag: ../schema.js.

import NETZENTGELTE_2027 from "./netzentgelte-2027.js";

const MODUL = { name: "netzentgelte-ch", land: "CH", fakten: NETZENTGELTE_2027.filter((f) => f.land === "CH") };

export default MODUL;

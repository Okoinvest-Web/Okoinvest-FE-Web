// scripts/eg-modell-export.mjs – erzeugt den Python-Spiegel des EG-Datenmodells aus src/lib/plattform/eg/modell.js
//
//   node scripts/eg-modell-export.mjs            # schreibt Backend-Import/…/plattform/eg_modell.py
//   node scripts/eg-modell-export.mjs --pruefen  # Exit 1, wenn die Datei veraltet ist (für Tests/CI)
//
// Alle Konstanten in GROSSBUCHSTABEN werden übernommen (Werte als Python-Literale).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(WURZEL, "Backend-Import", "oekoinvest_app", "oekoinvest_app", "plattform", "eg_modell.py");
const m = await import(pathToFileURL(path.join(WURZEL, "src", "lib", "plattform", "eg", "modell.js")).href);

const py = (v, ind = "") => {
  if (v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number" || typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => py(x)).join(", ") + "]";
  const e = Object.entries(v);
  if (!e.length) return "{}";
  const flach = e.every(([, x]) => x === null || typeof x !== "object");
  if (flach && JSON.stringify(v).length < 110) return "{" + e.map(([k, x]) => `${JSON.stringify(k)}: ${py(x)}`).join(", ") + "}";
  return "{\n" + e.map(([k, x]) => `${ind}\t${JSON.stringify(k)}: ${py(x, ind + "\t")},`).join("\n") + `\n${ind}}`;
};

const namen = Object.keys(m).filter((k) => k === k.toUpperCase());
let out = `# Copyright (c) 2026, ÖkoInvest GmbH
#
# Gemeinsames Datenmodell Energiegemeinschaften (ElWG §§ 65–72) – Python-Spiegel von src/lib/plattform/eg/modell.js
# (dort ist die Wahrheit; Vertrag: docs/EG-SCHNITTSTELLEN.md). Abgleich: plattform/tests/test_eg_stamm_kern.py (Node-Export).
# ERZEUGT mit scripts/eg-modell-export.mjs – nicht von Hand ändern, sondern modell.js ändern und neu erzeugen.
# Hinweis: Schlüssel von ZONELEVEL, NETZEBENEN und MARKTPHASEN sind wie in JSON Zeichenketten ("1" … "7").

`;
for (const k of namen) out += `${k} = ${py(m[k])}\n\n`;
out = out.trimEnd() + "\n";

if (process.argv.includes("--pruefen")) {
  const ist = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, "utf8") : "";
  if (ist !== out) {
    console.error("eg_modell.py ist veraltet – node scripts/eg-modell-export.mjs ausführen.");
    process.exit(1);
  }
  console.log("eg_modell.py aktuell.");
} else {
  fs.writeFileSync(ZIEL, out);
  console.log(`geschrieben: ${path.relative(WURZEL, ZIEL)} (${namen.length} Konstanten)`);
}

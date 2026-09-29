// scripts/ratgeber-index.mjs
//
// Erzeugt src/content/ratgeber/index.js aus allen Artikeldateien im Ordner.
// Aufruf nach jedem neuen Artikel:  node scripts/ratgeber-index.mjs
// Deterministisch (alphabetisch), mehrfaches Ausführen ist unkritisch.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src", "content", "ratgeber");

const dateien = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".js") && f !== "index.js" && !f.startsWith("_"))
  .sort();

const name = (f) => "a_" + f.replace(/\.js$/, "").replace(/[^a-zA-Z0-9]/g, "_");

const inhalt = `// AUTOMATISCH ERZEUGT von scripts/ratgeber-index.mjs – nicht von Hand bearbeiten.
${dateien.map((f) => `import ${name(f)} from "./${f.replace(/\.js$/, "")}";`).join("\n")}

export const INHALTE = [
${dateien.map((f) => `  ${name(f)},`).join("\n")}
];
`;

fs.writeFileSync(path.join(dir, "index.js"), inhalt);
console.log(`index.js: ${dateien.length} Artikel`);

// test/hilfen/aufloesen.mjs – Auflöse-Hook zu registrieren.mjs (nur für Tests)
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(WURZEL, "src");
const klein = (p) => (process.platform === "win32" ? p.toLowerCase() : p);
const imProjekt = (p) => klein(p).startsWith(klein(WURZEL)) && !p.includes(`${path.sep}node_modules${path.sep}`);

function kandidat(basis) {
  for (const p of [basis, `${basis}.js`, `${basis}.mjs`, path.join(basis, "index.js")]) {
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

export async function resolve(spezifizierer, kontext, weiter) {
  let basis = null;
  if (spezifizierer.startsWith("@/")) basis = path.join(SRC, spezifizierer.slice(2));
  else if ((spezifizierer.startsWith("./") || spezifizierer.startsWith("../")) && kontext.parentURL?.startsWith("file:")) {
    const eltern = fileURLToPath(kontext.parentURL);
    if (imProjekt(eltern)) basis = path.resolve(path.dirname(eltern), spezifizierer);
  }
  if (basis && imProjekt(basis)) {
    const datei = kandidat(basis);
    if (datei && /\.m?js$/.test(datei)) return { url: pathToFileURL(datei).href, shortCircuit: true, format: "module" };
  }
  return weiter(spezifizierer, kontext);
}

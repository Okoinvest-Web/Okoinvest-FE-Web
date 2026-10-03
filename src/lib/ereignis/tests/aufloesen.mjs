// Test-Hilfe: löst "@/…" (jsconfig paths) und Importe ohne Dateiendung wie Next.js auf.
// Nur für node:test – wird von registrieren.mjs eingebunden.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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
    basis = path.resolve(path.dirname(fileURLToPath(kontext.parentURL)), spezifizierer);
  }
  if (basis) {
    const datei = kandidat(basis);
    if (datei) return { url: pathToFileURL(datei).href, shortCircuit: true, format: "module" };
  }
  return weiter(spezifizierer, kontext);
}

// scripts/onboarding-pfade-export.mjs
//
// Exportiert die deklarativen Onboarding-Pfade (src/lib/plattform/onboarding/pfade/*.js) als JSON für die Frappe-App:
//   node scripts/onboarding-pfade-export.mjs          → schreibt Backend-Import/oekoinvest_app/oekoinvest_app/plattform/onboarding_pfade.json
//   node scripts/onboarding-pfade-export.mjs --pruefen → nur vergleichen (Exit 1, wenn die JSON-Datei veraltet ist)
// Eine Quelle: Website und Frappe werten dieselben Definitionen aus (motor.js ↔ onboarding_kern.py).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(WURZEL, "Backend-Import/oekoinvest_app/oekoinvest_app/plattform/onboarding_pfade.json");

/** Endungslose Importe („./investor“, „@/lib/…“) wie im Next.js-Bundler auflösen */
export function aufloesungRegistrieren() {
  registerHooks({
    resolve(spezifizierer, kontext, weiter) {
      let s = spezifizierer;
      if (s.startsWith("@/")) s = pathToFileURL(path.join(WURZEL, "src", s.slice(2))).href;
      if ((s.startsWith(".") || s.startsWith("file:")) && !/\.(m?js|json)$/.test(s)) {
        for (const endung of [".js", "/index.js"]) {
          try {
            return weiter(s + endung, kontext);
          } catch {
            /* nächste Endung */
          }
        }
      }
      return weiter(s, kontext);
    },
  });
}

export async function pfadeLaden() {
  aufloesungRegistrieren();
  return import(pathToFileURL(path.join(WURZEL, "src/lib/plattform/onboarding/pfade/index.js")).href);
}

export function exportDaten(m) {
  return {
    version: 1,
    hinweis: "Automatisch erzeugt aus src/lib/plattform/onboarding/pfade/*.js (scripts/onboarding-pfade-export.mjs) – nicht von Hand ändern.",
    pfade: m.PFADE,
    touren: Object.keys(m.TOUREN),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const m = await pfadeLaden();
  const json = JSON.stringify(exportDaten(m), null, 1) + "\n";
  if (process.argv.includes("--pruefen")) {
    const alt = existsSync(ZIEL) ? readFileSync(ZIEL, "utf8") : "";
    if (alt !== json) {
      console.error("onboarding_pfade.json ist veraltet – bitte `node scripts/onboarding-pfade-export.mjs` ausführen.");
      process.exit(1);
    }
    console.log("onboarding_pfade.json ist aktuell.");
  } else {
    writeFileSync(ZIEL, json, "utf8");
    console.log(`geschrieben: ${path.relative(WURZEL, ZIEL)} (${m.PFADE.length} Pfade, ${m.PFADE.reduce((s, p) => s + p.schritte.length, 0)} Schritte)`);
  }
}

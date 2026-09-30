// node scripts-check.mjs – Syntaxprüfung aller Quelldateien (node --check), ohne Pakete zu laden
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const dateien = [...readdirSync("src").map((d) => `src/${d}`), ...readdirSync("test").map((d) => `test/${d}`)].filter((d) => /\.m?js$/.test(d));
let fehler = 0;
for (const d of dateien) {
  try {
    execFileSync(process.execPath, ["--check", d], { stdio: "pipe" });
    console.log(`ok   ${d}`);
  } catch (e) {
    fehler++;
    console.log(`FEHL ${d}\n${e.stderr}`);
  }
}
process.exit(fehler ? 1 : 0);

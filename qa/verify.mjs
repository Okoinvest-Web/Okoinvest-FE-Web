#!/usr/bin/env node
// qa/verify.mjs – EIN Freigabe-Befehl: npm run verify (Paket F)
//
// Läuft streng seriell (8 GB RAM, Dev-Server läuft nebenher; kein next build):
//   1. Unit- und Charakterisierungstests (node:test)  – Gate
//   2. selbsttest() aller Rechner                       – Gate
//   3. Claim-Lint                                       – Bericht (Welle 1), Gate mit --streng
//   4. axe auf 10 Kernseiten (Ratsche gegen Baseline)   – Gate, braucht Dev-Server
//   5. Funnel-E2E mit abgefangenen POSTs                – Gate, braucht Dev-Server
//
// Optionen:
//   --ohne-browser   Schritte 4–5 auslassen (Ergebnis dann ausdrücklich „unvollständig“)
//   --streng         Claim-Lint-Fehler brechen ab
//   --nur 1,3        nur diese Schritte
// Umgebung: QA_BASIS_URL (Standard http://localhost:3100), PLAYWRIGHT_PFAD
// Ergebnis: Konsole + qa/out/verify-<zeitstempel>.json (mit Commit-SHA und Zahl geänderter Dateien)

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BASIS, ladePlaywright, serverErreichbar } from "./browser.mjs";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(WURZEL, "qa", "out");
const BUDGET_S = 600; // Abnahme Paket F: unter 10 Minuten

const args = process.argv.slice(2);
const ohneBrowser = args.includes("--ohne-browser");
const streng = args.includes("--streng");
const nurIdx = args.indexOf("--nur");
const nur = nurIdx >= 0 ? new Set(args[nurIdx + 1].split(",").map(Number)) : null;

const NODE = process.execPath;
const OHNE_WARNUNG = ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "./test/hilfen/registrieren.mjs"];
const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const claimJson = join(OUT, `claims-${stempel}.json`);
const axeJson = join(OUT, `axe-${stempel}.json`);

const SCHRITTE = [
  {
    nr: 1,
    name: "Unit- und Charakterisierungstests (node:test)",
    befehl: [...OHNE_WARNUNG, "--test", "--test-concurrency=1", "test/charakterisierung/*.test.mjs", "test/rechner/eigenschaften.test.mjs", "test/qa/*.test.mjs", "src/**/*.test.mjs"],
  },
  { nr: 2, name: "selbsttest() aller Rechner", befehl: [...OHNE_WARNUNG, "--test", "test/rechner/selbsttest.test.mjs"] },
  { nr: 3, name: "Claim-Lint", befehl: ["qa/claim-lint.mjs", "--json", claimJson, ...(streng ? ["--streng"] : [])], bericht: !streng },
  { nr: 4, name: "axe – 10 Kernseiten", befehl: ["qa/axe.mjs", "--json", axeJson], browser: true },
  { nr: 5, name: "Funnel-E2E (POSTs abgefangen)", befehl: [...OHNE_WARNUNG, "--test", "--test-concurrency=1", "qa/e2e/funnel.e2e.mjs"], browser: true },
];

function laufe(befehl) {
  return new Promise((ok) => {
    const p = spawn(NODE, befehl, { cwd: WURZEL, stdio: "inherit", env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" } });
    p.on("close", (code) => ok(code ?? 1));
    p.on("error", () => ok(1));
  });
}

function git(...a) {
  const r = spawnSync("git", a, { cwd: WURZEL, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

const start = Date.now();
const ergebnis = [];
let browserGrund = "";
if (!ohneBrowser && SCHRITTE.some((s) => s.browser && (!nur || nur.has(s.nr)))) {
  if (!(await ladePlaywright())) browserGrund = "Playwright nicht gefunden (PLAYWRIGHT_PFAD setzen, siehe qa/README.md)";
  else if (!(await serverErreichbar())) browserGrund = `Dev-Server unter ${BASIS} nicht erreichbar (npm run dev)`;
}

for (const s of SCHRITTE) {
  if (nur && !nur.has(s.nr)) continue;
  const kopf = `── ${s.nr}/${SCHRITTE.length} ${s.name} `;
  console.log(`\n${kopf}${"─".repeat(Math.max(4, 78 - kopf.length))}`);
  if (s.browser && ohneBrowser) {
    console.log("übersprungen (--ohne-browser)");
    ergebnis.push({ ...s, status: "übersprungen", sekunden: 0 });
    continue;
  }
  if (s.browser && browserGrund) {
    console.log(`FEHLER: ${browserGrund}`);
    ergebnis.push({ ...s, status: "fehler", sekunden: 0, grund: browserGrund });
    continue;
  }
  const t0 = Date.now();
  const code = await laufe(s.befehl);
  const sekunden = Math.round((Date.now() - t0) / 1000);
  ergebnis.push({ ...s, status: code === 0 ? "ok" : s.bericht ? "bericht" : "fehler", code, sekunden });
}

const gesamt = Math.round((Date.now() - start) / 1000);
let claims = null;
if (existsSync(claimJson)) {
  try {
    claims = JSON.parse(readFileSync(claimJson, "utf8")).zusammenfassung;
  } catch {
    /* Bericht unlesbar – nur Zusammenfassung fehlt */
  }
}

console.log(`\n${"═".repeat(78)}\nverify – Zusammenfassung`);
for (const e of ergebnis) {
  const zeichen = { ok: "✓", fehler: "✗", bericht: "•", übersprungen: "–" }[e.status];
  const extra = e.nr === 3 && claims ? ` (${claims.fehler} Fehler, ${claims.hinweise} Hinweise – Bericht)` : e.grund ? ` (${e.grund})` : "";
  console.log(`  ${zeichen} ${e.nr} ${e.name.padEnd(46)} ${String(e.sekunden).padStart(4)} s${extra}`);
}
const fehlgeschlagen = ergebnis.filter((e) => e.status === "fehler");
const unvollstaendig = ergebnis.some((e) => e.status === "übersprungen") || !!nur;
console.log(`  Dauer gesamt: ${Math.floor(gesamt / 60)} min ${gesamt % 60} s${gesamt > BUDGET_S ? `  ⚠ über dem Budget von ${BUDGET_S / 60} min` : ""}`);
const urteil = fehlgeschlagen.length ? "ROT" : unvollstaendig ? "GRÜN (unvollständig)" : "GRÜN";
console.log(`  Ergebnis: ${urteil}`);

mkdirSync(OUT, { recursive: true });
const protokoll = {
  zeit: new Date().toISOString(),
  commit: git("rev-parse", "HEAD"),
  geaenderteDateien: (git("status", "--porcelain") || "").split("\n").filter(Boolean).length,
  basis: BASIS,
  node: process.version,
  urteil,
  sekunden: gesamt,
  schritte: ergebnis.map(({ nr, name, status, code, sekunden, grund }) => ({ nr, name, status, code, sekunden, grund })),
  claims,
  berichte: { claims: existsSync(claimJson) ? claimJson : null, axe: existsSync(axeJson) ? axeJson : null },
};
const datei = join(OUT, `verify-${stempel}.json`);
writeFileSync(datei, JSON.stringify(protokoll, null, 1), "utf8");
console.log(`  Protokoll: ${datei}`);
process.exitCode = fehlgeschlagen.length ? 1 : 0;

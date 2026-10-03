// test/rechner/selbsttest.test.mjs
//
// Führt selbsttest() aller Module unter src/lib aus, die eine solche Funktion
// exportieren (automatisch gefunden – neue Rechner sind ohne Pflege dabei).
// Rückgabeformate im Bestand: Array von Fehlertexten oder { fehler: [...] }.

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { WURZEL } from "../charakterisierung/snapshot.mjs";

function dateien(ordner, liste = []) {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) dateien(p, liste);
    else if (/\.m?js$/.test(n) && !/\.test\.m?js$/.test(n)) liste.push(p);
  }
  return liste;
}

const MIT_SELBSTTEST = dateien(join(WURZEL, "src", "lib")).filter((p) => /export\s+(async\s+)?function\s+selbsttest\s*\(/.test(readFileSync(p, "utf8")));

test("selbsttest() gefunden", () => {
  assert.ok(MIT_SELBSTTEST.length >= 13, `nur ${MIT_SELBSTTEST.length} Module mit selbsttest() gefunden`);
});

for (const p of MIT_SELBSTTEST) {
  const name = relative(WURZEL, p).replace(/\\/g, "/");
  test(`selbsttest ${name}`, async () => {
    const m = await import(pathToFileURL(p).href);
    const r = await m.selbsttest();
    const fehler = Array.isArray(r) ? r : Array.isArray(r?.fehler) ? r.fehler : null;
    assert.ok(fehler, `unbekanntes Rückgabeformat von selbsttest(): ${JSON.stringify(r)?.slice(0, 200)}`);
    assert.deepEqual(fehler, [], `selbsttest meldet Fehler:\n  ${fehler.join("\n  ")}`);
  });
}

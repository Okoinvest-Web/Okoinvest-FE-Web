// test/rechner/eigenschaften.test.mjs
//
// Eigenschaftstests über alle Charakterisierungsfälle – unabhängig von konkreten Zahlen:
//  - kein Fall wirft
//  - keine NaN/Infinity in den Ausgaben (ein NaN landet sonst als „NaN €“ beim Nutzer)
//  - einfache Monotonie: mehr Fläche → mehr Pacht (DE, Festpacht)

import test from "node:test";
import assert from "node:assert/strict";
import { RECHNER } from "../charakterisierung/faelle.mjs";
import { fuehreAus, ladeModul } from "../charakterisierung/snapshot.mjs";

function finde(wert, pruef, pfad = "", treffer = []) {
  if (pruef(wert)) treffer.push(pfad || "(Wurzel)");
  else if (wert && typeof wert === "object") for (const [k, v] of Object.entries(wert)) finde(v, pruef, pfad ? `${pfad}.${k}` : k, treffer);
  return treffer;
}
const istUngueltig = (v) => v === "§NaN" || v === "§Infinity" || v === "§-Infinity";

for (const [name, r] of Object.entries(RECHNER)) {
  test(`Eigenschaften ${name}`, async (t) => {
    const m = await ladeModul(r.modul);
    for (const [fall, fn] of Object.entries(r.faelle)) {
      await t.test(fall, () => {
        const aus = fuehreAus(fn, m);
        assert.ok(!(aus && typeof aus === "object" && "§wirft" in aus), `${name}/${fall} wirft: ${aus?.["§wirft"]}`);
        const schlecht = finde(aus, istUngueltig);
        assert.deepEqual(schlecht.slice(0, 10), [], `${name}/${fall}: NaN/Infinity an ${schlecht.length} Stelle(n)`);
      });
    }
  });
}

test("Pacht wächst mit der Fläche (DE, fest)", async () => {
  const { pachtRechnung } = await ladeModul(RECHNER.pacht.modul);
  const summe = (h) => pachtRechnung({ ha: h, regionId: "de-sued", modell: "fest" }).summeSolar;
  const werte = [1, 5, 12, 50].map(summe);
  for (let i = 1; i < werte.length; i++) assert.ok(werte[i] > werte[i - 1], `nicht monoton: ${werte.join(" / ")}`);
});

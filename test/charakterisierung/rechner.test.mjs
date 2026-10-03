// test/charakterisierung/rechner.test.mjs
//
// Golden-Master-Vergleich: heutige Rechner-Ausgaben gegen die eingecheckten Snapshots.
//   node --test test/charakterisierung/rechner.test.mjs
// Snapshots bewusst neu schreiben (nur mit Begründung im PR, siehe README):
//   npm run test:snapshots:aktualisieren
// Lesbarer Abweichungsbericht (Markdown) für den PR:
//   npm run test:snapshots:diff

import test from "node:test";
import assert from "node:assert/strict";
import { RECHNER } from "./faelle.mjs";
import { abweichungen, aktuelleAusgaben, leseSnapshot } from "./snapshot.mjs";

for (const name of Object.keys(RECHNER)) {
  test(`Charakterisierung ${name}`, async (t) => {
    const snap = leseSnapshot(name);
    assert.ok(snap, `Kein Snapshot für ${name} – erst „npm run test:snapshots:aktualisieren“ ausführen.`);
    const jetzt = await aktuelleAusgaben(name);
    const faelle = new Set([...Object.keys(snap.faelle), ...Object.keys(jetzt.faelle)]);
    for (const fall of faelle) {
      await t.test(fall, () => {
        assert.ok(fall in snap.faelle, `Fall „${fall}“ ist neu – Snapshot aktualisieren.`);
        assert.ok(fall in jetzt.faelle, `Fall „${fall}“ fehlt in faelle.mjs, steht aber im Snapshot.`);
        const diff = abweichungen(snap.faelle[fall], jetzt.faelle[fall]);
        if (diff.length) {
          const zeilen = diff.slice(0, 25).map((d) => `  ${d.pfad}: ${d.alt} → ${d.neu}`);
          if (diff.length > 25) zeilen.push(`  … und ${diff.length - 25} weitere`);
          assert.fail(`${name}/${fall}: ${diff.length} Abweichung(en) gegenüber dem Snapshot\n${zeilen.join("\n")}`);
        }
      });
    }
  });
}

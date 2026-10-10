// Welle 3, Paket B6: Bericht-Baustein für den Flächenpass – Positivliste, Geometrieprüfung, Neuberechnung,
// Vorgangsdaten (Fläche und ha im Lead), keine Geldwerte, Annahmenbuch.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/flaechenpass.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { neuRechnen } from "./neuRechnen.js";
import { vorgangDaten } from "./dienst.js";
import { annahmenbuchFuer } from "./annahmenbuch.js";

const RECHTECK = "13,48;13.004,48;13.004,48.003;13,48.003";
const status = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return 200;
};

test("Flächenpass im Bericht: Server misst die Fläche selbst (ha aus dem Browser zählt nicht)", () => {
  const r = neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { region: "bayern", flaeche: RECHTECK, ha: 999, netz: "1-3", verkehr: "bis500", benachteiligt: "ja" } });
  assert.ok(Math.abs(r.eingaben.ha - 9.93) < 0.1, `ha ${r.eingaben.ha}`);
  assert.equal(r.eingaben.flaeche, RECHTECK);
  assert.equal(r.vorgangTyp, "flaeche");
  assert.equal(r.ergebnis.urteil.text.includes("von 100 Punkten"), true);
  assert.ok(r.ergebnis.listen.some((l) => l.titel.startsWith("Rechtsrahmen Bayern")), "Rechtsrahmen aus den Regionsdaten");
  assert.match(r.pruefId, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
});

test("Flächenpass: Fläche und ha gehen in den Vorgang (flache Werte, keine Personendaten)", () => {
  const r = neuRechnen({ rechner: "flaechenpass", land: "AT", eingaben: { region: "oberoesterreich", flaeche: RECHTECK, uw: "bis5" } });
  const d = vorgangDaten({ rechner: r.rechner, land: r.land, eingaben: r.eingaben, pruefId: r.pruefId, stand: r.stand, ergebnis: r.ergebnis });
  assert.equal(d.land, "AT");
  assert.ok(d.ha > 9 && d.ha < 11);
  assert.equal(typeof d.eingaben.flaeche, "string", "Geometrie als Zeichenkette (Lead-Daten erlauben nur flache Werte)");
  assert.equal(d.eingaben.region, "oberoesterreich");
});

test("Flächenpass: ungültige Eingaben → 422", () => {
  const ok = { region: "bayern", ha: 10 };
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: ok })), 200);
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { ...ok, flaeche: "13,48;13.01,48.01;13.01,48;13,48.01" } })), 422, "Selbstüberschneidung");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { ...ok, flaeche: "2,40;2.1,40;2.1,40.1" } })), 422, "außerhalb DACH");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { ...ok, flaeche: { type: "Polygon" } } })), 422, "kein Objekt");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "AT", eingaben: ok })), 422, "Bayern ≠ AT");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { ha: 10 } })), 422, "Bundesland fehlt");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { region: "bayern" } })), 422, "weder Fläche noch Größe");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { ...ok, netz: "nah" } })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "DE", eingaben: { ...ok, score: 100 } })), 422, "Ergebnisfelder werden nicht angenommen");
  assert.equal(status(() => neuRechnen({ rechner: "flaechenpass", land: "CH", eingaben: { ha: 5, fff: "ja" } })), 200, "Schweiz ohne Bundesland");
});

test("Flächenpass: kein Geldwert im Bericht, Annahmenbuch mit Quelle und Stand", () => {
  for (const [land, e] of [["DE", { region: "bayern", ha: 12 }], ["AT", { region: "niederoesterreich", ha: 12, zone: "ja" }], ["CH", { ha: 6, eignung: "ja" }]]) {
    const r = neuRechnen({ rechner: "flaechenpass", land, eingaben: e });
    const text = JSON.stringify(r.ergebnis);
    assert.doesNotMatch(text, /€|CHF|Pacht pro Jahr/, `${land}: Geldwert im Bericht`);
    const buch = annahmenbuchFuer("flaechenpass", r.eingaben);
    assert.ok(buch.eintraege.length >= 3);
    for (const x of buch.eintraege) assert.ok(x.quelle?.titel && (x.stand || x.zuPruefen), `${land}: ${x.id} ohne Quelle/Stand`);
  }
});

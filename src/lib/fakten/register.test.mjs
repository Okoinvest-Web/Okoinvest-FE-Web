// Tests Welle 2, Paket B1 – Register (register.js, index.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { erstelleRegister } from "./register.js";
import { fakt, faktWert, fakten, alleFakten, quellenListe, registerPruefen, DATENMODULE } from "./index.js";

const basis = { einheit: "x", quelle: { titel: "Test", url: "https://example.org/" }, abruf: "2026-10-03", gueltigAb: null, gueltigBis: null, status: "geprueft", pruefer: "Test", klasse: "B" };
const testRegister = () =>
  erstelleRegister([
    {
      name: "a",
      land: "DE",
      fakten: [
        { ...basis, id: "t.wert", land: "DE", wert: 1 },
        { ...basis, id: "t.technik", land: "DACH", wert: { min: 1, max: 2 } },
      ],
      quellen: { allgemein: [{ titel: "Q", url: "https://example.org/q" }] },
    },
    [
      { ...basis, id: "t.wert", land: "CH", wert: 2 },
      { ...basis, id: "t.umlage", land: "DE", wert: 10, gueltigAb: "2026-01-01", gueltigBis: "2026-12-31", klasse: "A" },
      { ...basis, id: "t.umlage", land: "DE", wert: 11, gueltigAb: "2027-01-01", gueltigBis: "2027-12-31", klasse: "A" },
      { ...basis, id: "t.entwurf", land: "DE", wert: 99, status: "entwurf" },
    ],
  ]);

test("fakt(id, land): Landeswert, DACH-Rückfall, kein Rückfall auf ein anderes Land", () => {
  const r = testRegister();
  assert.equal(r.fakt("t.wert", "DE").wert, 1);
  assert.equal(r.fakt("t.wert", "ch").wert, 2, "Kleinschreibung erlaubt");
  assert.equal(r.fakt("t.wert", "AT"), null, "AT bekommt NICHT den DE- oder CH-Wert");
  assert.equal(r.fakt("t.technik", "AT").land, "DACH");
  assert.equal(r.fakt("gibt.es.nicht", "DE"), null);
});

test("zeitliche Versionen: Stichtag wählt die geltende Fassung", () => {
  const r = testRegister();
  assert.equal(r.fakt("t.umlage", "DE", { stichtag: "2026-06-30" }).wert, 10);
  assert.equal(r.fakt("t.umlage", "DE", { stichtag: "2027-01-01" }).wert, 11);
  assert.equal(r.fakt("t.umlage", "DE", { stichtag: "2025-06-30" }).wert, 10, "vor der ersten Fassung: früheste");
});

test("Entwürfe werden nie als Wert geliefert (nur mit mitEntwurf)", () => {
  const r = testRegister();
  assert.equal(r.fakt("t.entwurf", "DE"), null);
  assert.equal(r.fakt("t.entwurf", "DE", { mitEntwurf: true }).wert, 99);
});

test("faktWert liefert eine Kopie – das Register bleibt unverändert", () => {
  const r = testRegister();
  const w = r.faktWert("t.technik", "DE");
  w.min = 1000;
  assert.equal(r.faktWert("t.technik", "DE").min, 1);
  assert.ok(Object.isFrozen(r.fakt("t.wert", "DE")));
  assert.equal(r.faktWert("nicht.da"), undefined);
});

test("fakten({ land, klasse, praefix, status }) filtert, DACH zählt zum Land", () => {
  const r = testRegister();
  assert.equal(r.fakten({ land: "DE" }).length, 5);
  assert.equal(r.fakten({ land: "DE", mitDach: false }).length, 4);
  assert.equal(r.fakten({ klasse: "A" }).length, 2);
  assert.equal(r.fakten({ praefix: "t.um" }).length, 2);
  assert.equal(r.fakten({ status: "entwurf" }).length, 1);
  assert.equal(r.alleFakten().length, 6);
  assert.deepEqual(r.quellenListe("DE"), [{ titel: "Q", url: "https://example.org/q" }]);
});

test("pruefen() meldet Dubletten (id + land + gueltigAb)", () => {
  const r = erstelleRegister([[{ ...basis, id: "t.d", land: "DE", wert: 1 }], [{ ...basis, id: "t.d", land: "DE", wert: 2 }]]);
  const p = r.pruefen();
  assert.equal(p.ok, false);
  assert.match(p.fehler.join("\n"), /Dublette t\.d/);
});

test("echtes Register: Vertrag erfüllt, keine Dubletten, alle Module eingebunden", () => {
  const p = registerPruefen();
  assert.equal(p.ok, true, p.fehler.join("\n"));
  assert.ok(p.anzahl >= 90, `zu wenige Fakten: ${p.anzahl}`);
  assert.ok(DATENMODULE.length >= 12, "de, at, ch + FRI-Module (Termine, Umlagen, Netzentgelte je Land)");
  assert.equal(alleFakten().length, p.anzahl);
});

test("Abnahme c: 0 Fakten ohne quelle oder abruf", () => {
  const ohne = alleFakten().filter((f) => !f.quelle?.titel || !f.abruf);
  assert.deepEqual(
    ohne.map((f) => f.id),
    []
  );
});

test("echte Werte: Stichproben aus markt.js unverändert übernommen", () => {
  assert.equal(faktWert("pacht.ackerProHa"), 407);
  assert.equal(faktWert("kommune.hebesatz"), 4.09);
  assert.equal(faktWert("erloese.negativAnteilSolar"), 0.234);
  assert.equal(faktWert("region.ch.ertrag", "CH"), 1130);
  assert.deepEqual(faktWert("pacht.freiflaecheProHa", "DE"), { min: 1500, mittel: 2800, max: 4500 });
  assert.equal(fakt("freiflaeche.degradation", "CH").land, "DACH");
  assert.equal(fakt("pacht.freiflaecheProHa", "CH"), null, "kein CHF-Pachtwert belegt → Lücke");
  assert.equal(fakten({ land: "DE", praefix: "zuschlag.freiflaeche." }).length, 5);
  assert.equal(quellenListe("DE").length, 8);
});

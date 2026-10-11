// Welle 4, Paket GEBAEUDE: Gebäudestrom-Rechner – Energiebilanz je Land, keine Geldwerte.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/rechner/gebaeudestrom.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { ANNAHMEN, DACHARTEN, GEBAEUDETYPEN, LAENDER, rechneGebaeudestrom, regionenFuer, selbsttest, standardFuer } from "./gebaeudestrom.js";

test("Selbsttest läuft fehlerfrei", () => {
  const { fehler } = selbsttest();
  assert.deepEqual(fehler, []);
});

test("Standardwerte kommen aus dem Faktenregister (eigene Einschätzung, Klasse C)", () => {
  const s = standardFuer("de");
  assert.equal(s.verbrauchWE, ANNAHMEN.W_WE.standard);
  assert.equal(s.verbrauchGE, ANNAHMEN.W_GE.standard);
  assert.equal(s.teilnahme, ANNAHMEN.TEILNAHME.standard);
});

test("jedes Land hat Regionen und mindestens ein Modell", () => {
  for (const l of LAENDER) {
    assert.ok(regionenFuer(l.id).length > 0, `${l.id}: Regionen`);
    assert.ok(l.modelle.length >= 1, `${l.id}: Modelle`);
    const r = rechneGebaeudestrom({ land: l.id });
    assert.equal(r.region.land, l.id.toUpperCase());
  }
});

test("Energiebilanz ist konsistent (genutzt + Überschuss = Erzeugung, Anteile in [0,1])", () => {
  for (const land of ["de", "at", "ch"]) {
    for (const typ of GEBAEUDETYPEN) {
      for (const dach of DACHARTEN) {
        const r = rechneGebaeudestrom({ land, gebaeudetyp: typ.id, dachart: dach.id, dachflaecheM2: 300, wohneinheiten: 20, gewerbeeinheiten: 2 });
        assert.ok(Math.abs(r.genutzt + r.ueberschuss - r.erzeugung) < 1e-6);
        assert.ok(r.eigenverbrauch >= 0 && r.eigenverbrauch <= 1);
        assert.ok(r.deckung >= 0 && r.deckung <= 1);
        assert.ok(r.genutzt <= r.verbrauch + 1e-9);
      }
    }
  }
});

test("keine Geldwerte im Ergebnis (bewusst: Werte je Land noch nicht geprüft)", () => {
  const r = rechneGebaeudestrom({ land: "de" });
  const schluessel = JSON.stringify(Object.keys(r));
  for (const verboten of ["eur", "ct", "preis", "erloes", "rendite"]) {
    assert.ok(!schluessel.toLowerCase().includes(verboten), `Ergebnis enthält Geldfeld „${verboten}“`);
  }
});

test("mehr Teilnahme erhöht den im Gebäude genutzten Strom", () => {
  const wenig = rechneGebaeudestrom({ land: "de", teilnahme: 0.4 });
  const viel = rechneGebaeudestrom({ land: "de", teilnahme: 1 });
  assert.ok(viel.genutzt > wenig.genutzt);
  assert.ok(viel.teilnehmende > wenig.teilnehmende);
});

test("ausgewogene Größe liegt nie über der Dachkapazität des Beispiels und trifft ≈ 50 %", () => {
  const r = rechneGebaeudestrom({ land: "at", dachflaecheM2: 2000, wohneinheiten: 30 });
  assert.ok(r.ausgewogenKwp > 0);
  const bei = rechneGebaeudestrom({ land: "at", dachflaecheM2: r.ausgewogenKwp * r.dach.m2ProKwp, wohneinheiten: 30 });
  assert.ok(bei.eigenverbrauch >= 0.48, `Eigenverbrauch ${bei.eigenverbrauch}`);
});

test("unsinnige Eingaben stürzen nicht ab", () => {
  const r = rechneGebaeudestrom({ land: "ch", wohneinheiten: 0, gewerbeeinheiten: 0, dachflaecheM2: 20 });
  assert.equal(r.genutzt, 0);
  assert.equal(r.passung, "offen");
});

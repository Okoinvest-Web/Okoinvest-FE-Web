// Welle 4, Paket GEBAEUDE: Bericht-Baustein Gebäudestrom – Feldregeln, Länderprüfung, Zusammenfassung ohne Geldwerte.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/gebaeudestrom.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { neuRechnen, RECHNER } from "./neuRechnen.js";

test("Positivliste: gebaeudestrom ist registriert, ohne Geldwerte, Vorgangstyp dach", () => {
  assert.ok(RECHNER.gebaeudestrom);
  assert.equal(RECHNER.gebaeudestrom.geldwerte, false);
  assert.equal(RECHNER.gebaeudestrom.vorgangTyp, "dach");
});

test("rechnet für DE, AT und CH (keine Länder-Sperre, da keine Geldwerte)", () => {
  for (const land of ["DE", "AT", "CH"]) {
    const r = neuRechnen({ rechner: "gebaeudestrom", land, eingaben: { wohneinheiten: 15, dachflaecheM2: 150 } });
    assert.equal(r.land, land);
    assert.ok(r.ergebnis.kennzahlen.length >= 4, land);
    assert.ok(r.pruefId.includes("-"));
  }
});

test("Zusammenfassung enthält keine Währungszeichen", () => {
  const r = neuRechnen({ rechner: "gebaeudestrom", land: "CH", eingaben: { wohneinheiten: 10, dachflaecheM2: 100 } });
  const text = JSON.stringify(r.ergebnis);
  assert.ok(!/[€]|CHF|Rp\./.test(text), "Bericht ohne Geldwerte");
});

test("Region oder Modell aus dem falschen Land → 422", () => {
  assert.throws(() => neuRechnen({ rechner: "gebaeudestrom", land: "AT", eingaben: { regionId: "de-sued" } }), /passen nicht/);
  assert.throws(() => neuRechnen({ rechner: "gebaeudestrom", land: "DE", eingaben: { modell: "gea" } }), /passen nicht/);
});

test("unbekannte Felder und Bereichsverletzungen → 422", () => {
  assert.throws(() => neuRechnen({ rechner: "gebaeudestrom", land: "DE", eingaben: { preis: 12 } }), /Unbekannte Eingabe/);
  assert.throws(() => neuRechnen({ rechner: "gebaeudestrom", land: "DE", eingaben: { wohneinheiten: 2.5 } }), /Ungültige Eingabe/);
  assert.throws(() => neuRechnen({ rechner: "gebaeudestrom", land: "DE", eingaben: { dachflaecheM2: 5 } }), /Ungültige Eingabe/);
});

test("fehlende Felder kommen aus den Landesstandards", () => {
  const r = neuRechnen({ rechner: "gebaeudestrom", land: "AT", eingaben: {} });
  assert.equal(r.eingaben.land, "at");
  assert.ok(r.eingaben.regionId.startsWith("at"));
  assert.equal(r.eingaben.modell, "gea");
});

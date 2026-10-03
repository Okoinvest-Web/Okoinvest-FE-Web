// Tests Welle 2, Paket B1 – Währung je Land (waehrung.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { waehrungFuer, waehrungInfo, fmtGeld, fmtKleinbetrag, fmtZahl, einheitFuer, fmtFaktWert } from "./waehrung.js";

test("Währung je Land: DE/AT Euro, CH Franken", () => {
  assert.equal(waehrungFuer("DE"), "EUR");
  assert.equal(waehrungFuer("at"), "EUR");
  assert.equal(waehrungFuer("CH"), "CHF");
  assert.equal(waehrungFuer("CHF"), "CHF");
  assert.equal(waehrungFuer("xx"), "EUR");
  assert.equal(waehrungInfo("CH").klein, "Rp.");
});

test("CHF in Schweizer Schreibweise, deterministisch (Hochkomma, Punkt)", () => {
  assert.equal(fmtGeld(1234567, "CH"), "CHF 1’234’567");
  assert.equal(fmtGeld(1234.5, "CH", { stellen: 2 }), "CHF 1’234.50");
  assert.equal(fmtKleinbetrag(4.8, "CH"), "4.8 Rp./kWh");
  assert.equal(fmtZahl(1130, "CH"), "1’130");
});

test("Euro wie bisher (de-DE)", () => {
  assert.equal(fmtGeld(1234.4, "DE"), "1.234 €");
  assert.equal(fmtGeld(1234.6, "AT"), "1.235 €");
  assert.equal(fmtKleinbetrag(4.8, "DE"), "4,8 ct/kWh");
  assert.equal(fmtGeld(NaN, "CH"), "–");
});

test("Einheiten für CH: € → CHF, ct → Rp.", () => {
  assert.equal(einheitFuer("€/ha·a", "CH"), "CHF/ha·a");
  assert.equal(einheitFuer("ct/kWh", "CH"), "Rp./kWh");
  assert.equal(einheitFuer("ct/kWh", "DE"), "ct/kWh");
});

test("fmtFaktWert: Zahl, Spanne, Anteil, Text, Liste, Tabelle", () => {
  const f = (wert, einheit, land = "DE") => ({ wert, einheit, land });
  assert.equal(fmtFaktWert(f({ min: 1500, mittel: 2800, max: 4500 }, "€/ha·a")), "1.500–4.500 €/ha·a");
  assert.equal(fmtFaktWert(f(0.234, "Anteil")), "23,4 %");
  assert.equal(fmtFaktWert(f(0.004, "Anteil/Jahr")), "0,4 %/Jahr");
  assert.equal(fmtFaktWert(f(620, "CHF/kW", "CH")), "620 CHF/kW");
  assert.equal(fmtFaktWert(f(10.35, "ct/kWh", "CH")), "10.35 Rp./kWh");
  assert.equal(fmtFaktWert(f("2 × 5 Jahre Option", "Text")), "2 × 5 Jahre Option");
  assert.equal(fmtFaktWert(f(["MV", "BB"], "Liste")), "MV, BB");
  assert.equal(fmtFaktWert(f([[1, 0]], "Tabelle")), "Tabelle");
  assert.equal(fmtFaktWert(null), "–");
});

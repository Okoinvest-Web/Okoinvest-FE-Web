// Tests der PLZ-Prüfung je Land:  node --test src/lib/plattform/validierung.plz.test.mjs
// Plattform-Armee, Paket DB (Datenqualität): DE 5 Ziffern, AT/CH 4 Ziffern, unbekanntes Land generisch.
import test from "node:test";
import assert from "node:assert/strict";
import { plz, plzLand } from "./validierung.js";

test("plz: generische Prüfung bleibt unverändert", () => {
  assert.equal(plz("86825"), "86825");
  assert.equal(plz("5121"), "5121");
  assert.equal(plz("ab"), ""); // zu kurz
  assert.equal(plz("12345678901"), "1234567890"); // text() kürzt auf 10 Zeichen (Bestandsverhalten)
});

test("plzLand DE: genau 5 Ziffern", () => {
  assert.equal(plzLand("86825", "DE"), "86825");
  assert.equal(plzLand("01067", "DE"), "01067"); // führende 0 (Dresden) gültig
  assert.equal(plzLand("5121", "DE"), "");
  assert.equal(plzLand("868251", "DE"), "");
  assert.equal(plzLand("8682a", "DE"), "");
});

test("plzLand AT: 4 Ziffern ohne führende 0", () => {
  assert.equal(plzLand("5121", "AT"), "5121");
  assert.equal(plzLand("1010", "AT"), "1010");
  assert.equal(plzLand("0121", "AT"), "");
  assert.equal(plzLand("86825", "AT"), "");
});

test("plzLand CH: 4 Ziffern ohne führende 0", () => {
  assert.equal(plzLand("8001", "CH"), "8001");
  assert.equal(plzLand("0800", "CH"), "");
  assert.equal(plzLand("80011", "CH"), "");
});

test("plzLand: unbekanntes/fehlendes Land fällt auf generische Prüfung zurück", () => {
  assert.equal(plzLand("SW1A 1AA", ""), "SW1A 1AA");
  assert.equal(plzLand("75008", undefined), "75008");
  assert.equal(plzLand("", "DE"), "");
  assert.equal(plzLand(null, "AT"), "");
});

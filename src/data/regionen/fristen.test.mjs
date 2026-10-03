// Tests für die befristeten Hinweise (Fristenkästen W0-2): node --test src/data/regionen/fristen.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fristenAT, fristenCH, EAG_CALL_AT } from "./fristen.js";

const VOR_EAG = Date.parse("2026-10-03T12:00:00+02:00");
const LETZTER_EAG_TAG = Date.parse("2026-10-22T23:59:00+02:00");
const NACH_EAG = Date.parse("2026-10-23T00:00:00+02:00");

test("EAG-Call erscheint bis einschließlich 22.10.2026 und danach nicht mehr", () => {
  assert.equal(fristenAT(VOR_EAG).length, 1);
  assert.equal(fristenAT(LETZTER_EAG_TAG).length, 1);
  assert.deepEqual(fristenAT(NACH_EAG), []);
});

test("Pronovo-Runde 4/2026 erscheint bis einschließlich 01.11.2026 und danach nicht mehr", () => {
  assert.equal(fristenCH(Date.parse("2026-11-01T23:59:00+01:00")).length, 1);
  assert.deepEqual(fristenCH(Date.parse("2026-11-02T00:00:00+01:00")), []);
});

test("Einträge haben das Format von recht[] mit Quelle (https)", () => {
  for (const e of [...fristenAT(VOR_EAG), ...fristenCH(VOR_EAG)]) {
    assert.equal(typeof e.titel, "string");
    assert.equal(typeof e.text, "string");
    assert.match(e.quelle.url, /^https:\/\//);
    assert.ok(e.quelle.titel.length > 0);
  }
});

test("Daten im Text stimmen mit den geprüften Originalangaben überein", () => {
  const [eag] = fristenAT(VOR_EAG);
  assert.match(eag.text, /8\. Oktober 2026/);
  assert.match(eag.text, /22\. Oktober 2026/);
  assert.equal(EAG_CALL_AT.ende, NACH_EAG);
  const [pronovo] = fristenCH(VOR_EAG);
  assert.match(pronovo.text, /18\. Oktober bis und mit 1\. November 2026/);
  assert.match(pronovo.text, /CHF 620\/kW/);
});

test("CH-Text ohne ß", () => {
  for (const e of fristenCH(VOR_EAG)) assert.doesNotMatch(`${e.titel} ${e.text}`, /ß/);
});

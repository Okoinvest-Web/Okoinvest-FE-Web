// Tests des Demo-Guards:  node --test src/lib/plattform/demoGuard.test.mjs
// Abnahme Paket A: Demo-Login in Produktion nicht möglich.
import test from "node:test";
import assert from "node:assert/strict";
import { demoErlaubt, demoPruefung } from "./demoGuard.js";

const PROD = { NODE_ENV: "production", PLATTFORM_DEMO: "1" };

test("Entwicklung: Demo erlaubt", () => {
  assert.equal(demoErlaubt({ NODE_ENV: "development" }), true);
});

test("Produktion ohne PLATTFORM_DEMO: kein Demo", () => {
  assert.equal(demoErlaubt({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.example.org" }), false);
});

test("Produktion mit PLATTFORM_DEMO=1, aber ohne URL: gesperrt (Rückfall auf Produktionsdomain)", () => {
  assert.equal(demoErlaubt(PROD), false);
});

test("Produktion mit PLATTFORM_DEMO=1 auf der Produktionsdomain: gesperrt", () => {
  for (const url of ["https://www.oekoinvest.com", "https://oekoinvest.com/", "https://WWW.OEKOINVEST.COM", "https://www.oekoinvest.com.:443"]) {
    assert.equal(demoErlaubt({ ...PROD, NEXT_PUBLIC_SITE_URL: url }), false, url);
    assert.equal(demoErlaubt({ ...PROD, NEXT_PUBLIC_SITE_URL: "https://demo.example.org", PLATTFORM_BASIS_URL: url }), false, `Basis ${url}`);
  }
});

test("Produktion mit ungültiger URL: gesperrt", () => {
  assert.equal(demoErlaubt({ ...PROD, NEXT_PUBLIC_SITE_URL: "kein url" }), false);
});

test("Vorführinstanz auf eigener Domain: erlaubt", () => {
  const p = demoPruefung({ ...PROD, NEXT_PUBLIC_SITE_URL: "https://demo.oekoinvest.example" });
  assert.deepEqual(p, { erlaubt: true, grund: "vorführung" });
});

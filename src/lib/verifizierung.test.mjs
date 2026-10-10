// Welle 3, Paket NL: Bestätigungscodes Search Console / Bing nur aus Umgebungsvariablen, nur gültige Codes.
import test from "node:test";
import assert from "node:assert/strict";
import { verifizierungMetadaten, verifizierungsCode } from "./verifizierung.js";

test("ohne Werte: kein Meta-Tag", () => {
  assert.deepEqual(verifizierungMetadaten({}), {});
  assert.deepEqual(verifizierungMetadaten({ google: "", bing: "   " }), {});
});

test("gültige Codes: google bzw. msvalidate.01", () => {
  assert.deepEqual(verifizierungMetadaten({ google: " abcDEF_123-xyz " }), { verification: { google: "abcDEF_123-xyz" } });
  assert.deepEqual(verifizierungMetadaten({ bing: "0123456789ABCDEF0123456789ABCDEF" }), { verification: { other: { "msvalidate.01": "0123456789ABCDEF0123456789ABCDEF" } } });
  assert.deepEqual(Object.keys(verifizierungMetadaten({ google: "abcdefgh", bing: "12345678" }).verification).sort(), ["google", "other"]);
});

test("ungültige Werte (ganzes Meta-Tag, Anführungszeichen, zu kurz) werden verworfen", () => {
  assert.equal(verifizierungsCode('<meta name="google-site-verification" content="abc">'), null);
  assert.equal(verifizierungsCode('abc"def'), null);
  assert.equal(verifizierungsCode("abc"), null);
  assert.equal(verifizierungsCode("a".repeat(101)), null);
  assert.equal(verifizierungsCode(undefined), null);
});

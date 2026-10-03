// Tests der Open-Redirect-Prüfung:  node --test src/lib/plattform/sicheresZiel.test.mjs
// Abnahme Paket A: "/%09/evil.com" leitet nicht weiter.
import test from "node:test";
import assert from "node:assert/strict";
import { sicheresZiel } from "./client.js";

const BASIS = "https://www.oekoinvest.com/";
// Wohin würde ein Browser mit diesem Ziel tatsächlich gehen?
const herkunft = (ziel) => new URL(ziel, BASIS).origin;

test("/%09/evil.com (nach Dekodierung Tab) wird abgelehnt", () => {
  const weiter = new URLSearchParams("weiter=/%09/evil.com").get("weiter");
  assert.equal(weiter, "/\t/evil.com");
  assert.equal(sicheresZiel(weiter, "/portal"), "/portal");
});

test("bekannte Umgehungen landen nie auf fremder Herkunft", () => {
  const angriffe = [
    "//evil.com", "/\\evil.com", "/\\/evil.com", "\\\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com",
    "/ /evil.com", "https://evil.com", "http:evil.com", "javascript:alert(1)", `/${String.fromCharCode(0xa0)}/evil.com`, `/${String.fromCharCode(0x2028)}/evil.com`, `/${String.fromCharCode(0x200b)}/evil.com`,
    "%2F%2Fevil.com", "evil.com", "", "/api/auth/logout", "/API/auth/logout", "/portal/../api/x", "/api",
  ];
  for (const a of angriffe) {
    const z = sicheresZiel(a, "/portal");
    assert.equal(herkunft(z), new URL(BASIS).origin, `Angriff ${JSON.stringify(a)} → ${z}`);
    assert.ok(!/^\/api(\/|$)/i.test(z), `API-Ziel ${JSON.stringify(a)} → ${z}`);
  }
});

test("Steuerzeichen, Backslash und API führen zum Standard", () => {
  for (const a of ["/\t/evil.com", "/\\evil.com", "/api/auth/logout", "/portal/../api/x", "//evil.com"]) {
    assert.equal(sicheresZiel(a, "/std"), "/std", JSON.stringify(a));
  }
});

test("interne Pfade bleiben erhalten (normalisiert)", () => {
  assert.equal(sicheresZiel("/portal"), "/portal");
  assert.equal(sicheresZiel("/portal/anfragen/A-123?tab=dok#x"), "/portal/anfragen/A-123?tab=dok#x");
  assert.equal(sicheresZiel("/portal/boerse/%2F%2Fevil.com"), "/portal/boerse/%2F%2Fevil.com");
  assert.equal(sicheresZiel("/portal/./profil"), "/portal/profil");
  assert.equal(sicheresZiel("/apiarbeit"), "/apiarbeit");
  assert.equal(sicheresZiel(undefined, "/x"), "/x");
});

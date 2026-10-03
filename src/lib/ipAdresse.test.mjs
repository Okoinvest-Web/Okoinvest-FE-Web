// Tests der Client-IP-Ermittlung:  node --test src/lib/ipAdresse.test.mjs
// Abnahme Paket A: Ein gefälschter X-Forwarded-For umgeht das Rate-Limit nicht.
import test from "node:test";
import assert from "node:assert/strict";
import { ipAdresse, proxyHops } from "./ipAdresse.js";

const anfrage = (kopf) => new Request("http://localhost/api/auth/passwort-vergessen", { headers: kopf });
const OHNE = {}; // Modus X-Real-IP (keine TRUSTED_PROXY_HOPS)

test("Standard: nur X-Real-IP zählt, X-Forwarded-For[0] wird ignoriert", () => {
  const r = anfrage({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
  assert.equal(ipAdresse(r, OHNE), "203.0.113.7");
});

test("Standard: ohne X-Real-IP keine Adresse – auch nicht aus X-Forwarded-For", () => {
  assert.equal(ipAdresse(anfrage({ "x-forwarded-for": "1.2.3.4" }), OHNE), "");
});

test("gefälschter X-Forwarded-For ändert den Rate-Limit-Schlüssel nicht (beide Modi)", () => {
  for (const env of [OHNE, { TRUSTED_PROXY_HOPS: "1" }]) {
    const schluessel = new Set();
    for (let i = 0; i < 50; i++) {
      const gefaelscht = `10.0.${i}.${i}`;
      // nginx-Muster: Modus 1 überschreibt (X-Real-IP), Modus 2 hängt die echte Adresse rechts an
      const kopf = env.TRUSTED_PROXY_HOPS
        ? { "x-forwarded-for": `${gefaelscht}, 198.51.100.9` }
        : { "x-real-ip": "198.51.100.9", "x-forwarded-for": gefaelscht };
      schluessel.add(`passwort:${ipAdresse(anfrage(kopf), env) || "ohne-ip"}`);
    }
    assert.deepEqual([...schluessel], ["passwort:198.51.100.9"], `Modus ${JSON.stringify(env)}`);
  }
});

test("Rate-Limit-Simulation: ab der 6. Anfrage gesperrt trotz wechselnder X-Forwarded-For", () => {
  // gleiches Fenster-Prinzip wie server/rateLimit.js (passwort: 5/h)
  const zaehler = new Map();
  const erlaubt = (k) => (zaehler.set(k, (zaehler.get(k) || 0) + 1), zaehler.get(k) <= 5);
  const ergebnisse = Array.from({ length: 8 }, (_, i) =>
    erlaubt(`passwort:${ipAdresse(anfrage({ "x-real-ip": "198.51.100.9", "x-forwarded-for": `192.0.2.${i}` }), OHNE)}`),
  );
  assert.deepEqual(ergebnisse, [true, true, true, true, true, false, false, false]);
});

test("TRUSTED_PROXY_HOPS: n-ter Wert von rechts", () => {
  const kopf = { "x-forwarded-for": "6.6.6.6, 203.0.113.5, 10.0.0.2", "x-real-ip": "10.0.0.2" };
  assert.equal(ipAdresse(anfrage(kopf), { TRUSTED_PROXY_HOPS: "1" }), "10.0.0.2");
  assert.equal(ipAdresse(anfrage(kopf), { TRUSTED_PROXY_HOPS: "2" }), "203.0.113.5");
  // Liste kürzer als Hop-Zahl → nicht vertrauenswürdig
  assert.equal(ipAdresse(anfrage({ "x-forwarded-for": "203.0.113.5" }), { TRUSTED_PROXY_HOPS: "2" }), "");
  // X-Real-IP wird im Hop-Modus ignoriert
  assert.equal(ipAdresse(anfrage({ "x-real-ip": "203.0.113.5" }), { TRUSTED_PROXY_HOPS: "1" }), "");
});

test("ungültige Werte werden verworfen", () => {
  assert.equal(ipAdresse(anfrage({ "x-real-ip": "<script>" }), OHNE), "");
  assert.equal(ipAdresse(anfrage({ "x-real-ip": "2001:db8::1" }), OHNE), "2001:db8::1");
  assert.equal(ipAdresse(anfrage({ "x-forwarded-for": "1.1.1.1, evil" }), { TRUSTED_PROXY_HOPS: "1" }), "");
});

test("proxyHops: nur 1–10, sonst Modus X-Real-IP", () => {
  assert.equal(proxyHops({}), 0);
  assert.equal(proxyHops({ TRUSTED_PROXY_HOPS: "abc" }), 0);
  assert.equal(proxyHops({ TRUSTED_PROXY_HOPS: "0" }), 0);
  assert.equal(proxyHops({ TRUSTED_PROXY_HOPS: "-1" }), 0);
  assert.equal(proxyHops({ TRUSTED_PROXY_HOPS: "11" }), 0);
  assert.equal(proxyHops({ TRUSTED_PROXY_HOPS: " 2 " }), 2);
});

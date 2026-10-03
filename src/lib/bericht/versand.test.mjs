// Welle 2, Paket B4: versandErlaubt(), Token (nur Hash, Fristen), Server-Zähler ohne Kennung.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/versand.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { versandErlaubt, versandStatus, VERSAND_AUS_TEXT, ABSENDER } from "./versand.js";
import { tokenErzeugen, tokenHash, berichtZustand, bestaetigungBis, berichtBis } from "./token.js";
import { berichtZaehlen, berichtZaehlerStand, _berichtZaehlerLeeren } from "./zaehler.js";

test("versandErlaubt: nur Demo oder ausdrücklicher Testversand außerhalb der Produktion", () => {
  assert.equal(versandErlaubt({ backend: "frappe", env: {} }), false, "Frappe ohne Testflag");
  assert.equal(versandErlaubt({ backend: "frappe", env: { BERICHT_TESTVERSAND: "0" } }), false);
  assert.equal(versandErlaubt({ backend: "frappe", env: { BERICHT_TESTVERSAND: "1" } }), true, "Frappe mit Testflag (Testsystem)");
  assert.equal(versandErlaubt({ backend: "frappe", env: { BERICHT_TESTVERSAND: "1", NEXT_PUBLIC_SITE_ENV: "production" } }), false, "Produktion: nie");
  assert.equal(versandErlaubt({ backend: "frappe", env: { BERICHT_TESTVERSAND: "1", NEXT_PUBLIC_SITE_ENV: " Production " } }), false);
  assert.equal(versandErlaubt({ backend: "demo", env: {} }), true, "Demo: Postausgang");
  assert.equal(versandErlaubt({ backend: "demo", env: { NEXT_PUBLIC_SITE_ENV: "production" } }), false, "auch Demo nicht bei SITE_ENV=production");
  assert.equal(versandErlaubt({ backend: null, env: { BERICHT_TESTVERSAND: "1" } }), false, "ohne Backend");
  assert.equal(versandErlaubt({ backend: "frappe", env: { BERICHT_TESTVERSAND: "1", NEXT_PUBLIC_SITE_ENV: "staging" } }), true);
  const aus = versandStatus({ backend: "frappe", env: {} });
  assert.deepEqual(aus, { versand: false, modus: "aus", text: VERSAND_AUS_TEXT });
  assert.equal(versandStatus({ backend: "demo", env: {} }).modus, "demo");
  assert.equal(ABSENDER.name, null, "kein Absendername vor dem Livegang (TODO Inhaber/B0)");
});

test("Token: 32 Byte zufällig, gespeichert wird nur der SHA-256", () => {
  const { token, hash } = tokenErzeugen();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(token, "base64url").length, 32);
  assert.equal(hash, createHash("sha256").update(token).digest("hex"));
  assert.notEqual(tokenErzeugen().token, token);
  assert.equal(tokenHash("kurz"), null);
  assert.equal(tokenHash(`${token}x`), null);
  assert.equal(tokenHash(null), null);
});

test("Zustand und Fristen: 48 h Bestätigung, 30 Tage Bericht, danach abgelaufen", () => {
  const t0 = Date.parse("2026-10-03T10:00:00Z");
  const offen = { status: "offen", ablauf: bestaetigungBis(new Date(t0)), bestaetigtAm: null };
  assert.equal(berichtZustand(offen, t0 + 47 * 3600e3), "offen");
  assert.equal(berichtZustand(offen, t0 + 49 * 3600e3), "abgelaufen");
  const best = { status: "bestaetigt", ablauf: berichtBis(new Date(t0)), bestaetigtAm: new Date(t0).toISOString() };
  assert.equal(berichtZustand(best, t0 + 29 * 864e5), "bestaetigt");
  assert.equal(berichtZustand(best, t0 + 31 * 864e5), "abgelaufen");
  assert.equal(berichtZustand({ ablauf: null }, t0), "abgelaufen");
  assert.equal(berichtZustand(null, t0), null);
});

test("Zähler: nur Tag × Ereignis × Rechner × Land, Unbekanntes wird „?“", () => {
  _berichtZaehlerLeeren();
  berichtZaehlen({ ereignis: "angefordert", rechner: "pacht", land: "DE", email: "x@y.de" }, { log: false });
  berichtZaehlen({ ereignis: "spam", rechner: "<script>", land: "FR" }, { log: false });
  const keys = Object.keys(berichtZaehlerStand());
  assert.equal(keys.length, 2);
  assert.ok(keys.some((k) => /^bericht\|\d{4}-\d{2}-\d{2}\|angefordert\|pacht\|DE$/.test(k)));
  assert.ok(keys.some((k) => k.endsWith("|?|?|?")));
  assert.ok(!keys.join().includes("@"));
});

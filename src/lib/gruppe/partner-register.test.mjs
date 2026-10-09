// Welle 2, Paket GRP – Partner-Register: nur Platzhalter, formale Regeln, Zielpfade je Land
import { test } from "node:test";
import assert from "node:assert/strict";
import { kennungFinden, kennungGueltig, PARTNER_ARTEN, PARTNER_REGISTER, REGISTER_LAENDER, ZIELE, zielPfad, wirksameEintraege } from "./partner-register.js";

test("Register enthält nur Entwurfs-Platzhalter mit TODO (Abnahme e)", () => {
  assert.ok(PARTNER_REGISTER.length > 0);
  for (const e of PARTNER_REGISTER) {
    assert.equal(e.status, "entwurf", e.kennung);
    assert.match(e.kennung, /^beispiel-/, e.kennung);
    assert.match(e.name, /\(Beispiel\)$/, e.kennung);
    assert.match(e.todo, /^TODO-Inhaber/, e.kennung);
    assert.equal(e.offenlegung, undefined, "eigene Offenlegungstexte erst nach Freigabe");
    assert.ok(!/provision|vergütung|prämie|bonus|\d+\s*%|€/i.test(JSON.stringify(e)), `keine Vergütungs-/Kennzahlaussage: ${e.kennung}`);
  }
});

test("Einträge formal gültig: Kennung, Art, Land, Ziele", () => {
  const gesehen = new Set();
  for (const e of PARTNER_REGISTER) {
    assert.ok(kennungGueltig(e.kennung), e.kennung);
    assert.ok(!gesehen.has(e.kennung), `doppelt: ${e.kennung}`);
    gesehen.add(e.kennung);
    assert.ok(PARTNER_ARTEN[e.art], e.art);
    assert.ok(REGISTER_LAENDER.includes(e.land), e.land);
    assert.ok(e.ziele.length && e.ziele.every((z) => Object.hasOwn(ZIELE, z)), e.kennung);
  }
  assert.deepEqual(Object.keys(PARTNER_ARTEN).sort(), ["gruppe", "installateur", "kammer", "maschinenring", "stadtwerk"]);
});

test("Kennung: kurze Slugs, keine Personen- oder Pfadmuster", () => {
  for (const k of ["ab", "a@b.de", "Max Mustermann", "x".repeat(41), "-abc", "abc-", "a--b", "../etc", "abc/def", "%2f%2f", ""]) {
    assert.equal(kennungGueltig(k), false, k);
  }
  for (const k of ["abc", "stadtwerk-x-de", "a1-b2"]) assert.equal(kennungGueltig(k), true, k);
});

test("Entwurf greift nur außerhalb der Produktion", () => {
  assert.ok(kennungFinden("beispiel-gruppe-de", { produktion: false }));
  assert.equal(kennungFinden("beispiel-gruppe-de", { produktion: true }), null);
  assert.equal(wirksameEintraege({ produktion: true }).length, 0);
  assert.equal(kennungFinden("BEISPIEL-GRUPPE-DE", { produktion: false })?.kennung, "beispiel-gruppe-de");
  const gesperrt = [{ kennung: "xyz", art: "gruppe", land: "DE", status: "gesperrt" }];
  assert.equal(kennungFinden("xyz", { produktion: false, register: gesperrt }), null);
});

test("Zielpfade als Schlüssel – Länderpräfix vorbereitet", () => {
  // Ländermodell: jede öffentliche Seite hat eine Länderfassung – Auflösung über src/lib/land
  assert.equal(zielPfad("flaeche", "AT", { praefix: false }), "/flaeche-verpachten");
  assert.equal(zielPfad("flaeche", "AT"), "/at/flaeche-verpachten");
  assert.equal(zielPfad("flaechencheck", "AT"), "/at/flaechencheck");
  assert.equal(zielPfad("kontakt", "CH"), "/ch/kontakt");
  assert.equal(zielPfad("start", "CH", { praefix: true }), "/ch");
  assert.equal(zielPfad("start", "XX", { praefix: true }), "/");
  assert.equal(zielPfad("flaeche", "XX"), "/flaeche-verpachten", "ohne gültiges Land: gemeinsame Seite");
  assert.equal(zielPfad("gibtsnicht", "DE"), null);
  assert.equal(zielPfad("__proto__", "DE"), null);
  for (const z of Object.values(ZIELE)) assert.match(z.pfad, /^\/[a-z-]*$/);
});

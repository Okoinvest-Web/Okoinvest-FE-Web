import { test } from "node:test";
import assert from "node:assert/strict";
import { fehlercodePruefen, minderleistungPruefen, offlinePruefen } from "../src/regeln.js";
import { plausibilisieren } from "../src/plausibel.js";
import { Zugaenge, authAnfrage, passwortPruefen } from "../src/auth.js";
import { scryptSync, randomBytes } from "node:crypto";

const J = Date.parse("2026-09-30T10:15:00Z");
const vorMin = (m) => new Date(J - m * 60e3).toISOString();

test("Offline nach X Minuten, nur Anlagen in Betrieb mit Gerät", () => {
  const anlagen = [{ id: "AL-1", status: "betrieb", geraete: 1 }, { id: "AL-2", status: "betrieb", geraete: 1 }, { id: "AL-3", status: "planung", geraete: 1 }, { id: "AL-4", status: "betrieb", geraete: 0 }];
  const letzte = new Map([["AL-1", { ts: vorMin(20) }], ["AL-2", { ts: vorMin(3) }], ["AL-3", { ts: vorMin(90) }], ["AL-4", { ts: vorMin(90) }]]);
  const b = offlinePruefen(anlagen, letzte, { jetzt: J, offlineMinuten: 15 });
  assert.deepEqual(b.map((x) => x.anlageId), ["AL-1"]);
  assert.equal(b[0].schwere, "hoch");
  assert.equal(offlinePruefen(anlagen, new Map([["AL-2", { ts: vorMin(1), statusOffline: true }]]), { jetzt: J }).length, 1);
});

test("Fehlercode", () => {
  assert.equal(fehlercodePruefen("AL-1", "GZ-1", { ts: vorMin(0), pvKw: 3 }), null);
  const b = fehlercodePruefen("AL-1", "GZ-1", { ts: vorMin(0), fehlercode: "E-1107" });
  assert.equal(b.regel, "fehlercode");
  assert.match(b.schluessel, /E-1107/);
});

test("Minderleistung im Regionsvergleich nur bei Sonne", () => {
  const w = (id, pv, kwp = 100) => ({ anlageId: id, regionId: "de-sued", kwp, pvKw: pv, ts: vorMin(1) });
  const sonne = [w("A", 60), w("B", 62), w("C", 58), w("D", 20)];
  assert.deepEqual(minderleistungPruefen(sonne, { jetzt: J }).map((b) => b.anlageId), ["D"]);
  const nacht = [w("A", 5), w("B", 6), w("C", 5), w("D", 1)];
  assert.equal(minderleistungPruefen(nacht, { jetzt: J }).length, 0);
  assert.equal(minderleistungPruefen(sonne.slice(1), { jetzt: J }).length, 0); // zu wenige Vergleichsanlagen
});

test("Plausibilisierung: Zähler rückwärts und Sprung", () => {
  const vorher = { ts: vorMin(10), erzeugungKwh: 1000, netzbezugKwh: 500, einspeisungKwh: 200 };
  let r = plausibilisieren({ ts: vorMin(0), erzeugungKwh: 990, pvKw: 50 }, vorher, { kwp: 100 });
  assert.equal(r.wert.erzeugungKwh, undefined);
  assert.equal(r.befunde[0].regel, "zaehler_rueckwaerts");
  assert.equal(r.plausibel, false);
  r = plausibilisieren({ ts: vorMin(0), erzeugungKwh: 1100 }, vorher, { kwp: 100 }); // 100 kWh in 10 min bei 100 kWp
  assert.equal(r.befunde[0].regel, "zaehler_sprung");
  r = plausibilisieren({ ts: vorMin(0), erzeugungKwh: 1015 }, vorher, { kwp: 100 });
  assert.equal(r.befunde.length, 0);
  assert.equal(r.plausibel, true);
});

test("Passwort-Hash (scrypt, Format der Website) und Broker-ACL", async () => {
  const salt = randomBytes(16);
  const hash = `scrypt$16384$8$1$${salt.toString("base64")}$${scryptSync("geheim-geraet-passwort-123", salt, 64, { N: 16384, r: 8, p: 1 }).toString("base64")}`;
  assert.equal(await passwortPruefen("geheim-geraet-passwort-123", hash), true);
  assert.equal(await passwortPruefen("falsch", hash), false);
  assert.equal(await passwortPruefen("x", null), false);
  const z = new Zugaenge({ laden: async () => [{ benutzer: "anl-al-26-abc123-gz-26-xyz789", passwortHash: hash, anlageId: "AL-26-ABC123", geraetId: "GZ-26-XYZ789", gesperrt: false }], dienstBenutzer: "dienst", dienstPasswort: "d".repeat(32) });
  await z.aktualisieren();
  const u = "anl-al-26-abc123-gz-26-xyz789";
  assert.equal(await authAnfrage(z, "/auth/user", { username: u, password: "geheim-geraet-passwort-123" }), 200);
  assert.equal(await authAnfrage(z, "/auth/user", { username: u, password: "falsch" }), 403);
  assert.equal(await authAnfrage(z, "/auth/acl", { username: u, topic: "oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte", acc: 2 }), 200);
  assert.equal(await authAnfrage(z, "/auth/acl", { username: u, topic: "oekoinvest/v1/AL-26-OTHER1/GZ-26-XYZ789/messwerte", acc: 2 }), 403);
  assert.equal(await authAnfrage(z, "/auth/acl", { username: u, topic: "oekoinvest/v1/#", acc: 4 }), 403);
  assert.equal(await authAnfrage(z, "/auth/superuser", { username: "dienst" }), 403);
  assert.equal(await authAnfrage(z, "/auth/acl", { username: "dienst", topic: "oekoinvest/v1/+/+/+", acc: 4 }), 200);
  assert.equal(await authAnfrage(z, "/auth/acl", { username: "dienst", topic: "oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte", acc: 2 }), 403);
  assert.deepEqual(await authAnfrage(z, "/auth/emqx", { username: u, password: "geheim-geraet-passwort-123" }), { result: "allow" });
});

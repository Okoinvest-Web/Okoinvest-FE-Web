import { test } from "node:test";
import assert from "node:assert/strict";
import { heartbeatPruefen, messwertPruefen, publishErlaubt, statusPruefen, topicLesen } from "../src/schema.js";

const J = Date.parse("2026-09-30T10:15:30Z");

test("Topic-Schema", () => {
  assert.deepEqual(topicLesen("oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte"), { anlageId: "AL-26-ABC123", geraetId: "GZ-26-XYZ789", kanal: "messwerte" });
  assert.equal(topicLesen("oekoinvest/v2/AL-26-ABC123/GZ-26-XYZ789/messwerte"), null);
  assert.equal(topicLesen("oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/befehl"), null);
  assert.equal(topicLesen("oekoinvest/v1/al-26-abc123/GZ-26-XYZ789/messwerte"), null);
  assert.equal(topicLesen("oekoinvest/v1/AL-26-ABC123/+/messwerte"), null);
  assert.equal(topicLesen("oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte/x"), null);
});

test("ACL: nur eigene Anlage und eigenes Gerät", () => {
  const z = { anlageId: "AL-26-ABC123", geraetId: "GZ-26-XYZ789", gesperrt: false };
  assert.equal(publishErlaubt(z, "oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte"), true);
  assert.equal(publishErlaubt(z, "oekoinvest/v1/AL-26-OTHER1/GZ-26-XYZ789/messwerte"), false);
  assert.equal(publishErlaubt(z, "oekoinvest/v1/AL-26-ABC123/GZ-26-FREMD1/messwerte"), false);
  assert.equal(publishErlaubt({ ...z, gesperrt: true }, "oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte"), false);
  assert.equal(publishErlaubt(null, "oekoinvest/v1/AL-26-ABC123/GZ-26-XYZ789/messwerte"), false);
});

test("Messwert gültig", () => {
  const r = messwertPruefen(JSON.stringify({ v: 1, ts: "2026-09-30T10:15:00Z", pv_leistung_kw: 412.5, erzeugung_kwh: 1284512.4, speicher_leistung_kw: -12, wechselrichter_status: "ok", fehlercode: null, unbekannt: 1 }), { jetzt: J });
  assert.equal(r.ok, true);
  assert.equal(r.wert.pvKw, 412.5);
  assert.equal(r.wert.speicherKw, -12);
  assert.equal(r.wert.wechselrichterStatus, "ok");
});

test("Messwert ungültig", () => {
  assert.equal(messwertPruefen("kein json", { jetzt: J }).fehler, "kein_json");
  assert.equal(messwertPruefen(JSON.stringify({ v: 2, ts: "2026-09-30T10:15:00Z", pv_leistung_kw: 1 }), { jetzt: J }).fehler, "version");
  assert.equal(messwertPruefen(JSON.stringify({ v: 1, ts: "2026-10-01T10:15:00Z", pv_leistung_kw: 1 }), { jetzt: J }).fehler, "ts_zukunft");
  assert.equal(messwertPruefen(JSON.stringify({ v: 1, ts: "2026-09-01T10:15:00Z", pv_leistung_kw: 1 }), { jetzt: J }).fehler, "ts_zu_alt");
  assert.equal(messwertPruefen(JSON.stringify({ v: 1, ts: "2026-09-30T10:15:00Z" }), { jetzt: J }).fehler, "keine_messgroesse");
  const r = messwertPruefen(JSON.stringify({ v: 1, ts: "2026-09-30T10:15:00Z", pv_leistung_kw: -5, speicher_soc_pct: 140, verbrauch_kw: "12" }), { jetzt: J });
  assert.equal(r.ok, false);
  assert.equal(messwertPruefen("x".repeat(9000), { jetzt: J }).fehler, "zu_gross");
});

test("Heartbeat und Status", () => {
  assert.equal(heartbeatPruefen(JSON.stringify({ v: 1, ts: "2026-09-30T10:15:00Z" }), { jetzt: J }), "2026-09-30T10:15:00.000Z");
  assert.equal(heartbeatPruefen("{}", { jetzt: J }), null);
  assert.equal(statusPruefen("offline"), "offline");
  assert.equal(statusPruefen("kaputt"), null);
});

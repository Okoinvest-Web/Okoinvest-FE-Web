// Tests Welle 2, Paket B1 – Vertrag des Faktenregisters (schema.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { faktValidieren, istAbgelaufen, istInKraft, anzeigeStatus, istIsoDatum, datumDe, datumLang, monatJahr, HINWEIS_ABGELAUFEN } from "./schema.js";

const gut = () => ({
  id: "test.wert",
  wert: 4.8,
  einheit: "ct/kWh",
  land: "DE",
  quelle: { titel: "Bundesnetzagentur", url: "https://www.bundesnetzagentur.de/" },
  abruf: "2026-10-03",
  gueltigAb: null,
  gueltigBis: "2026-12-31",
  status: "geprueft",
  pruefer: "Paket E · Zweitprüfung TODO-E6",
  klasse: "A",
  notiz: "Test",
});

test("gültiger Fakt besteht den Vertrag", () => {
  const v = faktValidieren(gut());
  assert.equal(v.ok, true, v.fehler.join("\n"));
  assert.deepEqual(v.fehler, []);
});

test("Pflichtfelder: fehlende quelle, abruf, pruefer, klasse, land … werden gemeldet", () => {
  for (const [feld, wert] of [
    ["quelle", undefined],
    ["abruf", undefined],
    ["abruf", "03.10.2026"],
    ["pruefer", ""],
    ["klasse", "D"],
    ["land", "FR"],
    ["status", "ok"],
    ["einheit", ""],
    ["id", "Gross.am.Anfang"],
    ["wert", undefined],
  ]) {
    const f = { ...gut(), [feld]: wert };
    assert.equal(faktValidieren(f).ok, false, `${feld}=${wert} müsste ein Fehler sein`);
  }
});

test("status geprueft verlangt eine https-URL; eigene Einschätzung darf ohne URL zu_pruefen sein", () => {
  assert.equal(faktValidieren({ ...gut(), quelle: { titel: "x", url: null } }).ok, false);
  assert.equal(faktValidieren({ ...gut(), quelle: { titel: "x", url: "http://unsicher.example" }, status: "zu_pruefen" }).ok, false);
  const eigen = faktValidieren({ ...gut(), quelle: { titel: "Eigene Einschätzung", url: null, art: "eigen" }, status: "zu_pruefen", klasse: "C" });
  assert.equal(eigen.ok, true);
  assert.deepEqual(eigen.warnungen, []);
  const ohneUrl = faktValidieren({ ...gut(), quelle: { titel: "Pressemitteilung", url: null }, status: "zu_pruefen" });
  assert.equal(ohneUrl.ok, true);
  assert.equal(ohneUrl.warnungen.length, 1, "Quelle ohne URL ist eine Warnung");
});

test("wert null nur als dokumentierte Lücke (nicht geprüft)", () => {
  assert.equal(faktValidieren({ ...gut(), wert: null }).ok, false);
  assert.equal(faktValidieren({ ...gut(), wert: null, status: "zu_pruefen" }).ok, true);
});

test("gueltigAb nach gueltigBis ist ein Fehler", () => {
  assert.equal(faktValidieren({ ...gut(), gueltigAb: "2027-01-01", gueltigBis: "2026-12-31" }).ok, false);
});

test("istAbgelaufen: Stichtag nach gueltigBis, am Stichtag selbst noch gültig, Status abgelaufen", () => {
  const f = gut();
  assert.equal(istAbgelaufen(f, "2026-12-31"), false);
  assert.equal(istAbgelaufen(f, "2027-01-01"), true);
  assert.equal(istAbgelaufen(f, new Date("2027-06-01T12:00:00Z")), true);
  assert.equal(istAbgelaufen({ ...f, gueltigBis: null }, "2099-01-01"), false);
  assert.equal(istAbgelaufen({ ...f, gueltigBis: null, status: "abgelaufen" }, "2020-01-01"), true);
  assert.equal(istAbgelaufen(null), false);
});

test("istInKraft und anzeigeStatus (abgelaufen geht vor geprüft)", () => {
  assert.equal(istInKraft({ ...gut(), gueltigAb: "2027-01-01" }, "2026-12-31"), false);
  assert.equal(istInKraft({ ...gut(), gueltigAb: "2027-01-01" }, "2027-01-01"), true);
  assert.equal(anzeigeStatus(gut(), "2026-10-03"), "geprueft");
  assert.equal(anzeigeStatus(gut(), "2027-01-02"), "abgelaufen");
  assert.equal(anzeigeStatus({ ...gut(), status: "zu_pruefen" }, "2026-10-03"), "zu_pruefen");
  assert.equal(HINWEIS_ABGELAUFEN, "Stand abgelaufen, wird geprüft");
});

test("Datumshilfen", () => {
  assert.equal(istIsoDatum("2026-02-30"), false);
  assert.equal(istIsoDatum("2026-02-28"), true);
  assert.equal(datumDe("2026-07-17"), "17.07.2026");
  assert.equal(datumLang("2025-03-01"), "1. März 2025");
  assert.equal(datumLang("2025-12-01"), "1. Dezember 2025");
  assert.equal(monatJahr("2026-09-01"), "September 2026");
  assert.equal(datumDe("kaputt"), "");
});

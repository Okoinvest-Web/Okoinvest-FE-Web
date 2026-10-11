// test/land/energie-zonen.test.mjs – Länderwahl für den Strommarkt (Welle Strommarkt live je Land)
//
// Prüft ohne Netz (fetch gemockt):
//  - getSpotPrices wählt die Gebotszone je Land (DE → bzn=DE-LU, AT → bzn=AT, CH → bzn=CH)
//  - Fallback aWATTar: api.awattar.de (DE), api.awattar.at (AT); CH hat KEINEN Fallback → leer
//  - getGeneration wählt country=de|at|ch und führt die Nuclear-Reihe (CH) als kernkraft
//  - marktLand normalisiert (null/unbekannt → DE)
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getSpotPrices, getGeneration, getEnergySnapshot, marktLand, MARKT_ZONEN } from "../../src/lib/energy.js";

const echteFetch = globalThis.fetch;
let abrufe = [];

function mockFetch(antwort) {
  globalThis.fetch = async (url) => {
    abrufe.push(String(url));
    const a = antwort(String(url));
    if (a instanceof Error) throw a;
    return { ok: true, json: async () => a };
  };
}

beforeEach(() => {
  abrufe = [];
});
afterEach(() => {
  globalThis.fetch = echteFetch;
});

const heute = Math.floor(Date.now() / 1000);
const preisAntwort = (schrittSek) => ({
  unix_seconds: [heute, heute + schrittSek, heute + 2 * schrittSek],
  price: [100, 90, 80],
});

test("marktLand normalisiert Land und Zonen sind wie an der API verifiziert", () => {
  assert.equal(marktLand(null), "DE");
  assert.equal(marktLand(undefined), "DE");
  assert.equal(marktLand("de"), "DE");
  assert.equal(marktLand("AT"), "AT");
  assert.equal(marktLand("ch"), "CH");
  assert.equal(marktLand("XX"), "DE");
  // Probeabruf 11.10.2026: /price?bzn=AT (96 Viertelstundenwerte), /price?bzn=CH (24 Stundenwerte), EUR/MWh
  assert.equal(MARKT_ZONEN.DE.bzn, "DE-LU");
  assert.equal(MARKT_ZONEN.AT.bzn, "AT");
  assert.equal(MARKT_ZONEN.CH.bzn, "CH");
  assert.equal(MARKT_ZONEN.AT.country, "at");
  assert.equal(MARKT_ZONEN.CH.awattar, null);
});

test("getSpotPrices: Zone je Land, Auflösung aus den Zeitstempeln", async () => {
  mockFetch((url) => (url.includes("/price") ? preisAntwort(900) : new Error("unerwartet " + url)));
  const at = await getSpotPrices("AT");
  assert.ok(abrufe[0].includes("bzn=AT"), abrufe[0]);
  assert.equal(at.zone, "AT");
  assert.equal(at.aufloesungMin, 15);
  assert.equal(at.punkte.length, 3);

  abrufe = [];
  mockFetch((url) => (url.includes("/price") ? preisAntwort(3600) : new Error("unerwartet " + url)));
  const ch = await getSpotPrices("CH");
  assert.ok(abrufe[0].includes("bzn=CH"), abrufe[0]);
  assert.equal(ch.aufloesungMin, 60); // CH handelt stündlich

  abrufe = [];
  mockFetch((url) => (url.includes("/price") ? preisAntwort(900) : new Error("unerwartet " + url)));
  await getSpotPrices(); // Standard DE
  assert.ok(abrufe[0].includes("bzn=DE-LU"), abrufe[0]);
});

test("getSpotPrices-Fallback: aWATTar je Land, CH ehrlich leer", async () => {
  // Energy-Charts gestört → DE fällt auf api.awattar.de zurück
  mockFetch((url) => (url.includes("energy-charts") ? new Error("kaputt") : { data: [{ start_timestamp: 1, marketprice: 50 }] }));
  const de = await getSpotPrices("DE");
  assert.equal(de.quelle, "aWATTar");
  assert.ok(abrufe.some((u) => u.startsWith("https://api.awattar.de/")), abrufe.join(", "));

  abrufe = [];
  const at = await getSpotPrices("AT");
  assert.equal(at.quelle, "aWATTar");
  assert.ok(abrufe.some((u) => u.startsWith("https://api.awattar.at/")), abrufe.join(", "));

  abrufe = [];
  const ch = await getSpotPrices("CH");
  assert.equal(ch.quelle, null); // kein schlüsselfreier Fallback für CH
  assert.deepEqual(ch.punkte, []);
  assert.ok(!abrufe.some((u) => u.includes("awattar")), "CH darf aWATTar nicht abrufen");
});

test("getGeneration: country je Land, Nuclear (CH) wird als kernkraft geführt", async () => {
  const erzeugung = {
    unix_seconds: [heute],
    production_types: [
      { name: "Solar", data: [100] },
      { name: "Load", data: [8000] },
      { name: "Nuclear", data: [3000] },
      { name: "Renewable share of load", data: [42] },
    ],
  };
  mockFetch((url) => (url.includes("public_power") ? erzeugung : new Error("unerwartet " + url)));
  const ch = await getGeneration("CH");
  assert.ok(abrufe[0].includes("country=ch"), abrufe[0]);
  assert.deepEqual(ch.serien.kernkraft, [3000]);

  abrufe = [];
  const at = await getGeneration("at");
  assert.ok(abrufe[0].includes("country=at"), abrufe[0]);

  abrufe = [];
  await getGeneration();
  assert.ok(abrufe[0].includes("country=de"), abrufe[0]);
});

test("getEnergySnapshot: Land wird normalisiert und mitgegeben", async () => {
  mockFetch((url) =>
    url.includes("/price")
      ? preisAntwort(900)
      : { unix_seconds: [heute], production_types: [{ name: "Solar", data: [100] }, { name: "Load", data: [8000] }] }
  );
  const s = await getEnergySnapshot("at");
  assert.equal(s.land, "AT");
  assert.equal(s.preis.zone, "AT");
  assert.ok(abrufe.some((u) => u.includes("bzn=AT")) && abrufe.some((u) => u.includes("country=at")), abrufe.join(", "));
});

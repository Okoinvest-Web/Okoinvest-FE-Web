// Welle 4, Parkplatz-Hub: Schnell-Check Solarpflicht, Potenzial und GEIG – reine Logik.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUNDESLAND_SLUGS,
  GMODG_2030,
  PFLICHT_REGELN,
  geigCheck,
  parkplatzCheck,
  potenzial,
  pruefePflicht,
} from "./parkplatz.js";
import { CARPORT } from "../invest/markt.js";
import { META } from "../../data/regionen/meta.js";

test("Pflicht-Regeln decken alle 16 Bundesländer ab und passen zu den Regions-Slugs", () => {
  const deSlugs = META.filter((r) => r.land === "DE").map((r) => r.slug);
  assert.equal(BUNDESLAND_SLUGS.length, 16);
  for (const slug of BUNDESLAND_SLUGS) assert.ok(deSlugs.includes(slug), `unbekannter Slug ${slug}`);
  for (const slug of deSlugs) assert.ok(PFLICHT_REGELN[slug], `Regel fehlt für ${slug}`);
});

test("jede Regel hat Grundlage; Pflicht-Länder haben Schwelle, Art und Quelle", () => {
  for (const [slug, r] of Object.entries(PFLICHT_REGELN)) {
    assert.ok(r.grundlage, `Grundlage fehlt: ${slug}`);
    if (!r.keine) {
      assert.ok(Number.isInteger(r.schwelle) && r.schwelle > 0, `Schwelle fehlt: ${slug}`);
      assert.ok(["mehr", "ab"].includes(r.art), `Art fehlt: ${slug}`);
    }
  }
  // Quelle ist immer gesetzt (eigene oder Ratgeber-Quelle)
  assert.ok(pruefePflicht({ land: "DE", region: "hessen", stellplaetze: 60 }).quelle.titel);
});

test("Schwellen: mehr als 35 heißt ab dem 36. Stellplatz (BW), ab 50 einschließlich (RLP)", () => {
  assert.equal(pruefePflicht({ land: "DE", region: "baden-wuerttemberg", stellplaetze: 35 }).status, "nein");
  assert.equal(pruefePflicht({ land: "DE", region: "baden-wuerttemberg", stellplaetze: 36 }).status, "ja");
  assert.equal(pruefePflicht({ land: "DE", region: "rheinland-pfalz", stellplaetze: 49 }).status, "nein");
  assert.equal(pruefePflicht({ land: "DE", region: "rheinland-pfalz", stellplaetze: 50 }).status, "ja");
  assert.equal(pruefePflicht({ land: "DE", region: "schleswig-holstein", stellplaetze: 70 }).status, "nein");
  assert.equal(pruefePflicht({ land: "DE", region: "schleswig-holstein", stellplaetze: 71 }).status, "ja");
});

test("Länder ohne Pflicht und Brandenburg (aufgehoben) liefern nein mit Code", () => {
  assert.deepEqual(
    ["bayern", "sachsen", "thueringen"].map((r) => pruefePflicht({ land: "DE", region: r, stellplaetze: 500 }).status),
    ["nein", "nein", "nein"]
  );
  const bb = pruefePflicht({ land: "DE", region: "brandenburg", stellplaetze: 500 });
  assert.equal(bb.status, "nein");
  assert.equal(bb.code, "aufgehoben");
});

test("Situationen: Bestand nein, Sanierung nur NI/SH, Erweiterung ehrlich unklar", () => {
  assert.equal(pruefePflicht({ land: "DE", region: "niedersachsen", stellplaetze: 100, situation: "bestand" }).status, "nein");
  assert.equal(pruefePflicht({ land: "DE", region: "niedersachsen", stellplaetze: 100, situation: "sanierung" }).status, "ja");
  assert.equal(pruefePflicht({ land: "DE", region: "schleswig-holstein", stellplaetze: 100, situation: "sanierung" }).status, "ja");
  assert.equal(pruefePflicht({ land: "DE", region: "baden-wuerttemberg", stellplaetze: 100, situation: "sanierung" }).status, "nein");
  // Hamburg erfasst Erweiterungen ausdrücklich, BW nicht → unklar
  assert.equal(pruefePflicht({ land: "DE", region: "hamburg", stellplaetze: 100, situation: "erweiterung" }).status, "ja");
  assert.equal(pruefePflicht({ land: "DE", region: "baden-wuerttemberg", stellplaetze: 100, situation: "erweiterung" }).status, "unklar");
  assert.equal(pruefePflicht({ land: "DE", region: "hamburg", stellplaetze: 20, situation: "erweiterung" }).status, "nein");
});

test("Saarland: öffentliche Parkplätze unabhängig von der Schwelle", () => {
  assert.equal(pruefePflicht({ land: "DE", region: "saarland", stellplaetze: 20, betreiber: "gewerblich" }).status, "nein");
  assert.equal(pruefePflicht({ land: "DE", region: "saarland", stellplaetze: 20, betreiber: "oeffentlich" }).status, "ja");
  assert.equal(pruefePflicht({ land: "DE", region: "saarland", stellplaetze: 35, betreiber: "gewerblich" }).status, "ja");
});

test("Österreich und Schweiz: ehrlich unklar, keine erfundenen Regeln", () => {
  assert.deepEqual(pruefePflicht({ land: "AT", stellplaetze: 500 }), { status: "unklar", code: "at", regel: null, quelle: null });
  assert.equal(pruefePflicht({ land: "CH", stellplaetze: 500 }).code, "ch");
});

test("Potenzial: Stellplätze × kWp je Stellplatz, Mindestumfang nur mit Anteil", () => {
  const p = potenzial({ stellplaetze: 100 });
  assert.equal(p.kwp, Math.round(100 * CARPORT.kwpProStellplatz));
  assert.equal(p.mindestKwp, null);
  assert.equal(p.flaecheM2, Math.round(100 * CARPORT.stellplatzM2));
  assert.equal(potenzial({ stellplaetze: 100, umfangAnteil: 0.6 }).mindestKwp, Math.round(p.kwp * 0.6));
});

test("GEIG: Neubau > 6, Renovierung > 10, Bestand > 20 – nur Deutschland", () => {
  assert.deepEqual(geigCheck({ land: "DE", stellplaetze: 100, situation: "neubau" }), { greift: true, paragraph: "§ 7 GEIG", leitungJe: 3, leitungStellplaetze: 34, ladepunkteMin: 1 });
  assert.equal(geigCheck({ land: "DE", stellplaetze: 6, situation: "neubau" }).greift, false);
  assert.equal(geigCheck({ land: "DE", stellplaetze: 11, situation: "sanierung" }).paragraph, "§ 8 GEIG");
  assert.equal(geigCheck({ land: "DE", stellplaetze: 21, situation: "bestand" }).paragraph, "§ 10 GEIG");
  assert.equal(geigCheck({ land: "DE", stellplaetze: 20, situation: "bestand" }).greift, false);
  assert.equal(geigCheck({ land: "AT", stellplaetze: 100 }), null);
});

test("parkplatzCheck: Gesamtergebnis mit Pflicht, Potenzial, GEIG und 2030-Hinweis", () => {
  const r = parkplatzCheck({ land: "DE", region: "nordrhein-westfalen", stellplaetze: 120, situation: "neubau" });
  assert.equal(r.pflicht.status, "ja");
  assert.equal(r.potenzial.kwp, Math.round(120 * CARPORT.kwpProStellplatz));
  assert.equal(r.potenzial.mindestKwp, Math.round(r.potenzial.kwp * 0.3));
  assert.equal(r.geig.greift, true);
  assert.equal(r.gmodg2030, GMODG_2030);
  const at = parkplatzCheck({ land: "AT", stellplaetze: 120 });
  assert.equal(at.pflicht.status, "unklar");
  assert.equal(at.geig, null);
  assert.equal(at.gmodg2030, null);
  // unter der Schwelle: kein Mindestumfang
  assert.equal(parkplatzCheck({ land: "DE", region: "nordrhein-westfalen", stellplaetze: 10 }).potenzial.mindestKwp, null);
});

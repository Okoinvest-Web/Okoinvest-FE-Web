// test/rechner/laender.test.mjs
//
// Welle 2, Paket B1 – Länderfähigkeit der vier Bericht-Rechner und Abnahmekriterien:
//  (d) Land als Parameter: DE identisch zu bisher, AT/CH sperren sichtbar (Rechenbasis DE)
//  (e) Abweichung Rechner zu Regionsseite für den DE-Standardfall unter 3 %
//  (f) keine Importe aus src/lib/fakten/daten/* außerhalb src/lib/fakten
// Läuft mit der Modulauflösung aus test/hilfen (npm test, verify Schritt 1).

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pachtRechnung, annahmenPacht, PACHT_FAKTEN } from "../../src/lib/rechner/pacht.js";
import { flaechencheck, annahmenFlaechencheck } from "../../src/lib/rechner/flaechencheck.js";
import { rechneKommune, annahmenKommune } from "../../src/lib/rechner/kommune.js";
import { pruefePachtangebot, annahmenPachtangebot } from "../../src/lib/rechner/pachtangebot.js";
import { REGIONEN as REGIONSSEITEN, regionFuer } from "../../src/data/regionen/index.js";
import { META } from "../../src/data/regionen/meta.js";
import { kennzahlen } from "../../src/components/Region/rechnung.js";
import { fmtGeldLand, fmtCtLand } from "../../src/lib/rechner/annahmen.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* ------------------------------------------------------------------ */
/* (d) Land als Parameter                                              */
/* ------------------------------------------------------------------ */

/** Ergebnis ohne das Echo der Eingabe (das enthält das übergebene Feld „land“) */
const ohneEingabe = (ergebnis) => {
  const kopie = { ...ergebnis };
  delete kopie.eingabe;
  return kopie;
};

test("(d) land: \"DE\" liefert dasselbe wie der bisherige Aufruf ohne Land", () => {
  assert.deepEqual(pachtRechnung({ land: "DE" }), pachtRechnung());
  assert.deepEqual(ohneEingabe(rechneKommune({ land: "DE" })), ohneEingabe(rechneKommune()));
  assert.deepEqual(ohneEingabe(pruefePachtangebot({ land: "DE" })), ohneEingabe(pruefePachtangebot()));
  assert.deepEqual(flaechencheck({ land: "DE", regionId: "de-sued" }), flaechencheck({ regionId: "de-sued" }));
});

test("(d) Land aus der Region, wenn kein Land übergeben wird – und umgekehrt die Standardregion des Landes", () => {
  assert.deepEqual(pachtRechnung({ land: "CH" }), pachtRechnung({ regionId: "ch" }));
  assert.deepEqual(ohneEingabe(pruefePachtangebot({ land: "CH" })), ohneEingabe(pruefePachtangebot({ regionId: "ch" })));
  assert.equal(rechneKommune({ land: "AT" }).eingabe.regionId, "at");
  assert.equal(pachtRechnung({ land: "AT" }).region.id, "at");
});

test("(d) AT und CH sperren sichtbar (kein Euro-/Franken-Ergebnis als gültig ausgegeben)", () => {
  for (const land of ["AT", "CH"]) {
    assert.equal(pachtRechnung({ land }).sperre?.land, land, `pacht ${land}`);
    assert.equal(pruefePachtangebot({ land }).sperre?.land, land, `pachtangebot ${land}`);
    assert.equal(rechneKommune({ land }).sperre?.land, land, `kommune ${land}`);
    const f = flaechencheck({ land });
    assert.equal(f.sperre?.land, land, `flaechencheck ${land}`);
    assert.equal(f.pachtJahr, null, "keine Pachtspanne für gesperrte Länder");
    assert.equal(f.pacht30, null);
  }
  assert.equal(flaechencheck({ land: "CH" }).netzProKwp, null, "keine €-Netzkosten für CH");
  assert.equal(pachtRechnung({ land: "DE" }).sperre, null);
});

test("(d) Annahmenbuch je Bericht-Rechner: jeder Fakt mit Quelle und Stand", () => {
  for (const [name, buch] of [
    ["pacht", annahmenPacht()],
    ["flaechencheck", annahmenFlaechencheck()],
    ["kommune", annahmenKommune()],
    ["pachtangebot", annahmenPachtangebot()],
  ]) {
    assert.equal(buch.waehrung, "EUR", name);
    for (const e of buch.eintraege) {
      assert.ok(!e.fehlt, `${name}: ${e.id} fehlt im Register`);
      assert.ok(e.quelle?.titel && e.abruf, `${name}: ${e.id} ohne Quelle/Stand`);
    }
  }
  assert.equal(annahmenPacht().eintraege.length, PACHT_FAKTEN.length);
  const ch = annahmenPacht({ land: "CH" });
  assert.equal(ch.land, "CH");
  assert.equal(ch.rechenbasis, "DE");
  assert.equal(ch.sperre.land, "CH");
});

test("(d) Format je Land: CHF in Schweizer Schreibweise", () => {
  assert.equal(fmtGeldLand(28000, "CH"), "CHF 28’000");
  assert.equal(fmtGeldLand(28000, "DE"), "28.000 €");
  assert.equal(fmtCtLand(4.8, "CH"), "4.8 Rp./kWh");
});

/* ------------------------------------------------------------------ */
/* (e) Rechner ↔ Regionsseite, DE-Standardfall                         */
/* ------------------------------------------------------------------ */

const DE_SEITEN = META.filter((m) => m.land === "DE");
const abweichung = (a, b) => Math.abs(a / b - 1);

test("(e) DE-Standardfall (Süddeutschland, 10 ha): Regionsseite und Pachtrechner weichen unter 3 % ab", () => {
  const standard = DE_SEITEN.filter((m) => m.markt === "de-sued");
  assert.ok(standard.length >= 2, "Bayern und Baden-Württemberg zählen zur Standardregion");
  for (const m of standard) {
    const k = kennzahlen(regionFuer(m.slug), m);
    const rechner = pachtRechnung({ ha: 10, regionId: m.markt });
    const kwhSeite = k.gwh * 1e6;
    assert.ok(abweichung(kwhSeite, rechner.kwh) < 0.03, `${m.slug}: Ertrag Seite ${Math.round(kwhSeite)} kWh vs. Rechner ${Math.round(rechner.kwh)} kWh (${(abweichung(kwhSeite, rechner.kwh) * 100).toFixed(1)} %)`);
    // Pacht über 30 Jahre: gleiche Eingaben wie die Seite (indexiert, Mitte der Spanne)
    const mitte = (k.spanne.min + k.spanne.max) / 2;
    const pacht = pachtRechnung({ ha: 10, regionId: m.markt, modell: "index", proHa: mitte });
    assert.ok(abweichung(k.pacht30Mittel, pacht.summeSolar) < 0.03, `${m.slug}: Pacht 30 J. Seite ${Math.round(k.pacht30Mittel)} vs. Rechner ${Math.round(pacht.summeSolar)}`);
    assert.ok(k.spanne.min >= 1500 && k.spanne.max <= 4500, "Regionsspanne liegt in der Register-Spanne pacht.freiflaecheProHa (DE)");
  }
});

test("(e) Übersicht aller DE-Regionsseiten (Diagnose, kein Gate): Ertragsabweichung Seite ↔ Rechner", (t) => {
  const zeilen = DE_SEITEN.map((m) => {
    const k = kennzahlen(regionFuer(m.slug), m);
    const r = pachtRechnung({ ha: 10, regionId: m.markt });
    return { seite: m.slug, region: m.markt, abw: abweichung(k.gwh * 1e6, r.kwh) };
  });
  const ueber = zeilen.filter((z) => z.abw >= 0.03);
  t.diagnostic(`${zeilen.length} DE-Seiten, davon ${ueber.length} mit ≥ 3 % Ertragsabweichung: ${ueber.map((z) => `${z.seite} ${(z.abw * 100).toFixed(1)} %`).join(", ") || "keine"}`);
  assert.equal(REGIONSSEITEN.length > 0, true);
});

/* ------------------------------------------------------------------ */
/* (f) Datenmodule nur über src/lib/fakten/index.js                    */
/* ------------------------------------------------------------------ */

function dateien(ordner, liste = []) {
  for (const name of readdirSync(ordner)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = path.join(ordner, name);
    if (statSync(p).isDirectory()) dateien(p, liste);
    else if (/\.(m?js|jsx|tsx?)$/.test(name)) liste.push(p);
  }
  return liste;
}

test("(f) keine Importe aus src/lib/fakten/daten/* außerhalb src/lib/fakten", () => {
  const fakten = path.join(WURZEL, "src", "lib", "fakten") + path.sep;
  const verstoesse = [];
  for (const ordner of ["src", "qa", "test"]) {
    for (const datei of dateien(path.join(WURZEL, ordner))) {
      if (datei.startsWith(fakten)) continue;
      const text = readFileSync(datei, "utf8");
      if (/(?:from\s+|import\s*\(\s*)["'][^"']*fakten\/daten[^"']*["']/.test(text)) verstoesse.push(path.relative(WURZEL, datei));
    }
  }
  assert.deepEqual(verstoesse, []);
});

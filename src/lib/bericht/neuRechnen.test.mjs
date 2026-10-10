// Welle 2, Paket B4: Neuberechnung, Positivliste, Eingabeprüfung, Prüf-ID, Annahmenbuch.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/neuRechnen.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { RECHNER_IDS, neuRechnen, pruefIdFuer, rechnerVon } from "./neuRechnen.js";
import { annahmenbuchFuer, HINWEIS_RECHENLOGIK } from "./annahmenbuch.js";
import { pachtRechnung } from "../rechner/pacht.js";
import { pruefePachtangebot, STANDARD as PA_STANDARD } from "../rechner/pachtangebot.js";
import { flaechencheck } from "../rechner/flaechencheck.js";
import { rechneKommune, STANDARD as K_STANDARD } from "../rechner/kommune.js";

const FAELLE = {
  pacht: { land: "DE", eingaben: { ha: 12.5, regionId: "de-ost", modell: "umsatz", proHa: 2800, umsatzAnteil: 0.07, mindestProHa: 1800, laufzeit: 30, ackerProHa: 407, dbProHa: 450, vorlaufJahre: 2, reservierungProHa: 200 } },
  pachtangebot: { land: "DE", eingaben: { ...PA_STANDARD, ha: 33, modell: "kombi", indexArt: "fest", indexSatz: 0.02 } },
  flaechencheck: { land: "DE", eingaben: { land: "DE", regionId: "de-sued", ha: 18, nutzung: "acker", besonderheiten: ["randstreifen", "hang"], netz: "1-3", eigentum: "verpachtet" } },
  kommune: { land: "DE", eingaben: { ...K_STANDARD, mwp: 35, hebesatz: 3.8, gemeindeflaeche: true, anteilGemeinde: 0.5 } },
};
const BROWSER = { pacht: pachtRechnung, pachtangebot: pruefePachtangebot, flaechencheck, kommune: rechneKommune };
const ohneLandEcho = (x) => {
  const k = structuredClone(x);
  if (k.eingabe) delete k.eingabe.land;
  return k;
};
const status = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return 200;
};

test("Positivliste: genau die freigegebenen Rechner, alles andere → 422", () => {
  assert.deepEqual([...RECHNER_IDS].sort(), ["flaechencheck", "flaechenpass", "gewerbestrom", "kommune", "pacht", "pachtangebot", "ratsvorlage"]);
  for (const r of ["solarpark", "beteiligung", "__proto__", "constructor", "", null, 7, "PACHT"]) {
    assert.equal(status(() => rechnerVon(r)), 422, String(r));
    assert.equal(status(() => neuRechnen({ rechner: r, eingaben: {}, land: "DE" })), 422, String(r));
  }
});

test("Neuberechnung = Rechnerfunktion (wie im Browser gerechnet)", () => {
  for (const [id, f] of Object.entries(FAELLE)) {
    const r = neuRechnen({ rechner: id, eingaben: f.eingaben, land: f.land });
    assert.deepEqual(r.roh, BROWSER[id]({ ...r.eingaben, land: r.land }), `${id}: = Rechnerfunktion`);
    // Browser ruft ohne land auf: identisch bis auf das Echo eingabe.land
    assert.deepEqual(ohneLandEcho(r.roh), ohneLandEcho(BROWSER[id]({ ...f.eingaben })), `${id}: wie im Browser`);
    assert.equal(r.land, "DE");
    assert.ok(r.ergebnis.kennzahlen.length >= 3, `${id}: Kennzahlen`);
    assert.ok(r.ergebnis.rechenweg.length >= 2, `${id}: Rechenweg`);
  }
});

test("Manipulierte Client-Ergebnisse spielen keine Rolle: Eingaben mit Ergebnisfeldern → 422", () => {
  for (const feld of ["ergebnis", "summeSolar", "ersteJahrespacht", "score", "barwert"]) {
    const e = { ...FAELLE.pacht.eingaben, [feld]: 999999999 };
    assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: e, land: "DE" })), 422, feld);
  }
  // Zusatzfelder außerhalb der Eingaben werden von neuRechnen gar nicht gelesen
  const a = neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "DE", ergebnis: { summeSolar: 1 } });
  const b = neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "DE" });
  assert.deepEqual(a.ergebnis, b.ergebnis);
  assert.equal(a.pruefId, b.pruefId);
});

test("Eingaben: Typ und Bereich je Feld", () => {
  const p = FAELLE.pacht.eingaben;
  const falsch = [
    { ...p, ha: "12" },
    { ...p, ha: -1 },
    { ...p, ha: 1e9 },
    { ...p, ha: Number.NaN },
    { ...p, laufzeit: 30.5 },
    { ...p, modell: "geschenkt" },
    { ...p, regionId: "mond" },
    { ...p, umsatzAnteil: 0.9 },
  ];
  for (const e of falsch) assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: e, land: "DE" })), 422, JSON.stringify(e).slice(0, 80));
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: null, land: "DE" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: [], land: "DE" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "flaechencheck", eingaben: { ...FAELLE.flaechencheck.eingaben, besonderheiten: ["x"] }, land: "DE" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "kommune", eingaben: { ...FAELLE.kommune.eingaben, paragraph6: "ja" }, land: "DE" })), 422);
  // fehlende Felder: Standardwerte des Rechners (wie im Browser)
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: {}, land: "DE" })), 200);
});

test("Land: Pflicht, passend zur Region, gesperrte Länder ohne Geldwerte", () => {
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "FR" })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "AT" })), 422, "Region de-ost ≠ AT");
  assert.equal(status(() => neuRechnen({ rechner: "pacht", eingaben: { ...FAELLE.pacht.eingaben, regionId: "at" }, land: "AT" })), 422, "AT gesperrt");
  assert.equal(status(() => neuRechnen({ rechner: "kommune", eingaben: { ...FAELLE.kommune.eingaben, regionId: "ch" }, land: "CH" })), 422);
  const fc = neuRechnen({ rechner: "flaechencheck", eingaben: { ...FAELLE.flaechencheck.eingaben, land: "AT", regionId: "at" }, land: "AT" });
  assert.ok(fc.ergebnis.sperre, "Sperrhinweis");
  assert.ok(!JSON.stringify(fc.ergebnis.kennzahlen).includes("€"), "keine €-Kennzahlen für AT");
  assert.equal(status(() => neuRechnen({ rechner: "flaechencheck", eingaben: { ...FAELLE.flaechencheck.eingaben, land: "DE", regionId: "at" }, land: "DE" })), 422);
  assert.equal(neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "de" }).land, "DE");
});

test("Prüf-ID: deterministisch, hängt an Eingaben, Land, Rechner und Stand der Rechenlogik", () => {
  const a = neuRechnen({ rechner: "pacht", eingaben: FAELLE.pacht.eingaben, land: "DE" });
  const b = neuRechnen({ rechner: "pacht", eingaben: { ...FAELLE.pacht.eingaben }, land: "DE" });
  assert.match(a.pruefId, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
  assert.equal(a.pruefId, b.pruefId);
  assert.notEqual(a.pruefId, neuRechnen({ rechner: "pacht", eingaben: { ...FAELLE.pacht.eingaben, ha: 13 }, land: "DE" }).pruefId);
  assert.notEqual(a.pruefId, pruefIdFuer({ rechner: "pacht", land: "DE", eingaben: a.eingaben, stand: "1999-01-01" }));
  assert.equal(a.pruefId, pruefIdFuer({ rechner: "pacht", land: "DE", eingaben: a.eingaben }));
});

test("Annahmenbuch: jede Annahme mit Quelle und Stand, „zu prüfen“ sichtbar markiert", () => {
  for (const [id, f] of Object.entries(FAELLE)) {
    const r = neuRechnen({ rechner: id, eingaben: f.eingaben, land: f.land });
    const buch = annahmenbuchFuer(id, r.eingaben);
    assert.ok(buch.eintraege.length >= 3, `${id}: Einträge`);
    for (const x of buch.eintraege) {
      assert.ok(x.quelle?.titel, `${id}/${x.id}: Quelle`);
      assert.match(String(x.stand || ""), /^\d{4}-\d{2}-\d{2}$/, `${id}/${x.id}: Stand`);
      assert.ok(x.statusText, `${id}/${x.id}: Status`);
      assert.equal(x.zuPruefen, x.status !== "geprueft", `${id}/${x.id}: Markierung`);
      if (x.herkunft === "rechenlogik") assert.match(x.statusText, new RegExp(HINWEIS_RECHENLOGIK));
    }
    assert.ok(buch.eintraege.some((x) => x.zuPruefen), `${id}: mind. ein „zu prüfen“ (Stand B1: 79 Werte offen)`);
  }
});

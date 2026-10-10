// Welle 3, Paket B8: Bericht-Baustein „Ratsvorlage Solarpark (Muster)“ – Positivliste, Länderregeln, Neuberechnung,
// Vorgangsdaten (Gemeinde im Lead), Annahmenbuch.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/ratsvorlage.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { neuRechnen } from "./neuRechnen.js";
import { vorgangDaten } from "./dienst.js";
import { annahmenbuchFuer } from "./annahmenbuch.js";
import { MUSTER_HINWEIS } from "./ratsvorlage.js";

const status = (fn) => {
  try {
    fn();
  } catch (e) {
    return [e.status, e.code];
  }
  return [200];
};

test("Ratsvorlage DE: Zahlen wie der Kommunal-Rechner, Landesregel getrennt, Beschluss als Muster", () => {
  const eingaben = { gemeinde: "Musterhausen", bundesland: "brandenburg", mwp: 20, hebesatz: 4, paragraph6: true };
  const r = neuRechnen({ rechner: "ratsvorlage", land: "DE", eingaben });
  const k = neuRechnen({ rechner: "kommune", land: "DE", eingaben: { mwp: 20, hebesatz: 4, paragraph6: true, regionId: "de-ost" } });
  assert.equal(r.vorgangTyp, "kommune");
  assert.match(r.pruefId, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
  const wert = (x, label) => x.ergebnis.kennzahlen.find((z) => z.label === label)?.wert;
  assert.equal(wert(r, "Summe 20 Jahre"), wert(k, "Summe 20 Jahre"));
  assert.equal(wert(r, "Summe 30 Jahre"), wert(k, "Summe 30 Jahre"));
  assert.equal(wert(r, "Landesrecht BbgEESG"), "40.000 €");
  const v = r.ergebnis.vorlage;
  assert.equal(v.land, "DE");
  assert.equal(v.gemeinde, "Musterhausen");
  assert.ok(v.beschluss.some((b) => b.includes("§ 6 EEG") && b.includes("BbgEESG")));
  assert.ok(v.sachverhalt.some((s) => s.includes("§ 6 Abs. 4 EEG")));
  assert.equal(v.muster, MUSTER_HINWEIS);
  assert.match(MUSTER_HINWEIS, /ohne Rechtsberatung/);
  assert.ok(v.finanzen.some((f) => /nicht enthalten/.test(f)), "Landesbetrag nicht addiert");
});

test("Ratsvorlage AT: keine Geldwerte, Widmungsschritte mit Quellen", () => {
  const r = neuRechnen({ rechner: "ratsvorlage", land: "AT", eingaben: { gemeinde: "St. Pantaleon", bundesland: "oberoesterreich", mwp: 5 } });
  const alles = JSON.stringify({ k: r.ergebnis.kennzahlen, v: r.ergebnis.vorlage, t: r.ergebnis.tabelle });
  assert.doesNotMatch(alles, /€|ct\/kWh|Hebesatz/);
  assert.equal(r.ergebnis.tabelle, null);
  assert.ok(r.ergebnis.listen.find((l) => l.titel === "Prüfpunkte vor der Widmung").eintraege.every((e) => /\(https:\/\//.test(e.text)));
  assert.ok(r.ergebnis.vorlage.beschluss.some((b) => b.includes("Flächenwidmungsplans")));
  assert.equal(r.vorgangTyp, "kommune");
});

test("Ratsvorlage: Länder- und Eingabeprüfung (422)", () => {
  assert.deepEqual(status(() => neuRechnen({ rechner: "ratsvorlage", land: "CH", eingaben: { gemeinde: "Bern" } })), [422, "land_gesperrt"]);
  assert.equal(status(() => neuRechnen({ rechner: "ratsvorlage", land: "DE", eingaben: { bundesland: "bayern" } }))[0], 422, "Gemeinde fehlt");
  assert.equal(status(() => neuRechnen({ rechner: "ratsvorlage", land: "DE", eingaben: { gemeinde: "<b>x</b>", bundesland: "bayern" } }))[0], 422, "Sonderzeichen");
  assert.equal(status(() => neuRechnen({ rechner: "ratsvorlage", land: "AT", eingaben: { gemeinde: "Linz", bundesland: "bayern" } }))[0], 422, "Bundesland passt nicht zum Land");
  assert.equal(status(() => neuRechnen({ rechner: "ratsvorlage", land: "AT", eingaben: { gemeinde: "Linz", bundesland: "oberoesterreich", hebesatz: 4 } }))[0], 422, "AT ohne Geldwert-Felder");
  assert.equal(status(() => neuRechnen({ rechner: "ratsvorlage", land: "DE", eingaben: { gemeinde: "Linz", bundesland: "bayern", regionId: "de-nord" } }))[0], 422, "Region nur über das Bundesland");
});

test("Ratsvorlage: Gemeinde und Bundesland gehen flach in den Vorgang, Annahmenbuch mit Landesregel", () => {
  const r = neuRechnen({ rechner: "ratsvorlage", land: "DE", eingaben: { gemeinde: "Bad Musterbach", bundesland: "sachsen-anhalt", mwp: 12 } });
  const d = vorgangDaten({ rechner: r.rechner, land: r.land, eingaben: r.eingaben, pruefId: r.pruefId, stand: r.stand, ergebnis: r.ergebnis });
  assert.equal(d.land, "DE");
  assert.equal(d.quelle, "bericht_ratsvorlage");
  assert.equal(d.eingaben.gemeinde, "Bad Musterbach");
  assert.equal(d.eingaben.bundesland, "sachsen-anhalt");
  assert.ok(Object.values(d.eingaben).every((x) => ["string", "number", "boolean"].includes(typeof x)));
  const buch = annahmenbuchFuer("ratsvorlage", r.eingaben);
  const ids = buch.eintraege.map((e) => e.id);
  assert.ok(ids.includes("kommune.landesregel.sachsen-anhalt.ctKwh"));
  assert.ok(ids.includes("kommune.beteiligungCt"));
  const at = annahmenbuchFuer("ratsvorlage", { gemeinde: "Linz", bundesland: "oberoesterreich" });
  assert.equal(at.land, "AT");
  assert.ok(at.eintraege.some((e) => e.id === "recht.elwg.gemeinschaftenAb" && e.herkunft === "register"));
  assert.ok(!at.eintraege.some((e) => e.id === "solarpark.rechenlogik"));
});

test("Ratsvorlage AT: Annahmenbuch ohne deutsche Quellen der Rechenlogik (Prüfer B8)", () => {
  const at = annahmenbuchFuer("ratsvorlage", { gemeinde: "Gmunden", bundesland: "oberoesterreich", mwp: 20 });
  assert.equal(at.land, "AT");
  assert.deepEqual(at.quellenRechenlogik, []);
  const de = annahmenbuchFuer("ratsvorlage", { gemeinde: "Haar", bundesland: "bayern", mwp: 20 });
  assert.ok(de.quellenRechenlogik.length > 0);
});

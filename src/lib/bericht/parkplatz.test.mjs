// Welle 4, Parkplatz-Hub: Bericht-Baustein Schnell-Check – Positivliste, Neuberechnung,
// keine Geldwerte, ehrliche AT/CH-Fassung, Annahmenbuch.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/parkplatz.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { neuRechnen } from "./neuRechnen.js";
import { vorgangDaten } from "./dienst.js";
import { annahmenbuchFuer } from "./annahmenbuch.js";

const status = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return 200;
};

test("Parkplatz im Bericht: DE mit Bundesland – Pflicht mit Rechtsgrundlage und Quelle, kein Geldwert", () => {
  const r = neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { region: "nordrhein-westfalen", stellplaetze: 120, situation: "neubau", betreiber: "gewerblich" } });
  assert.equal(r.vorgangTyp, "carport");
  assert.equal(r.ergebnis.urteil.titel, "Solarpflicht greift voraussichtlich");
  assert.match(r.ergebnis.urteil.text, /BauO NRW/);
  assert.ok(r.ergebnis.kennzahlen.some((k) => k.label.includes("PV-Potenzial")));
  assert.ok(r.ergebnis.rechenweg.some((z) => z.includes("recht.nrw.de")), "Quelle im Rechenweg");
  assert.ok(!JSON.stringify(r.ergebnis).includes("€"), "keine Geldwerte im Bericht");
  assert.match(r.pruefId, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
});

test("Parkplatz: AT/CH ehrlich unklar, ohne Region, ohne erfundene Regeln", () => {
  const at = neuRechnen({ rechner: "parkplatz", land: "AT", eingaben: { stellplaetze: 200, situation: "neubau", betreiber: "gewerblich" } });
  assert.equal(at.ergebnis.urteil.titel, "Solarpflicht im Einzelfall zu prüfen");
  assert.match(at.ergebnis.urteil.text, /keine flächendeckende Solarpflicht/);
  const ch = neuRechnen({ rechner: "parkplatz", land: "CH", eingaben: { stellplaetze: 200, situation: "neubau", betreiber: "gewerblich" } });
  assert.match(ch.ergebnis.urteil.text, /Kantone/);
  // DE ohne Bundesland und AT mit Bundesland → 422
  assert.equal(status(() => neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { stellplaetze: 100 } })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "parkplatz", land: "AT", eingaben: { stellplaetze: 100, region: "hamburg" } })), 422);
});

test("Parkplatz: ungültige Eingaben → 422 (Positivliste)", () => {
  assert.equal(status(() => neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { region: "hamburg", stellplaetze: 0 } })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { region: "hamburg", stellplaetze: 10.5 } })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { region: "paris", stellplaetze: 100 } })), 422);
  assert.equal(status(() => neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { region: "hamburg", stellplaetze: 100, preis: 99 } })), 422);
});

test("Parkplatz: Vorgangsdaten flach, mit Prüf-ID und Kennzahlen, ohne Personendaten", () => {
  const r = neuRechnen({ rechner: "parkplatz", land: "DE", eingaben: { region: "saarland", stellplaetze: 20, situation: "neubau", betreiber: "oeffentlich" } });
  assert.equal(r.ergebnis.urteil.titel, "Solarpflicht greift voraussichtlich", "Saarland: öffentliche Parkplätze ohne Schwelle");
  const d = vorgangDaten({ rechner: r.rechner, land: r.land, eingaben: r.eingaben, pruefId: r.pruefId, stand: r.stand, ergebnis: r.ergebnis });
  assert.equal(d.quelle, "bericht_parkplatz");
  assert.equal(d.land, "DE");
  assert.equal(d.eingaben.region, "saarland");
  assert.equal(d.eingaben.stellplaetze, 20);
  assert.ok(d.bericht.kennzahlen.length >= 3);
});

test("Parkplatz: Annahmenbuch nennt kWp je Stellplatz und die Pflicht-Übersicht als Rechenlogik", () => {
  const b = annahmenbuchFuer("parkplatz", { land: "DE", region: "hamburg", stellplaetze: 100 });
  assert.equal(b.hinweis, "", "kein Fallback-Hinweis");
  const ids = b.eintraege.map((x) => x.id);
  assert.ok(ids.includes("carport.kwpProStellplatz"));
  assert.ok(ids.includes("parkplatz.pflichtregeln"));
  assert.ok(b.eintraege.every((x) => x.zuPruefen), "Rechenlogik-Zeilen sind als „zu prüfen“ markiert");
});

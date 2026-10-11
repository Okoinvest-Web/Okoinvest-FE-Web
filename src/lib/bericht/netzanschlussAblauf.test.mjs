// Welle 4, Paket NETZ2: Bericht-Baustein des Ablauf-Begleiters Netzanschluss.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/netzanschlussAblauf.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { neuRechnen } from "./neuRechnen.js";
import { annahmenbuchFuer } from "./annahmenbuch.js";
import { schrittIds } from "../rechner/netzanschlussAblauf.js";

const status = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return 200;
};

test("Alle drei Länder liefern einen Bericht – ohne Geldwerte", () => {
  for (const land of ["DE", "AT", "CH"]) {
    const r = neuRechnen({ rechner: "netzanschluss", eingaben: { erledigt: [] }, land });
    assert.equal(r.land, land);
    assert.ok(r.ergebnis.kennzahlen.length >= 3, `${land}: Kennzahlen`);
    const text = JSON.stringify(r.ergebnis);
    assert.ok(!/€|CHF|EUR\b/.test(text), `${land}: keine Geldwerte im Bericht`);
    const liste = r.ergebnis.listen.find((l) => l.art === "schritte");
    assert.ok(liste.eintraege.length >= 5, `${land}: Schritte im Bericht`);
    assert.ok(liste.eintraege.every((x) => x.text.includes("Unterlagen:")), `${land}: Dokumenten-Checkliste je Schritt`);
    assert.ok(r.ergebnis.listen.some((l) => l.art === "ablehnungen"), `${land}: Ablehnungsgründe`);
  }
});

test("Fristen: DE mit § 8 EEG, AT/CH mit offenem Hinweis statt Zahlen", () => {
  const de = neuRechnen({ rechner: "netzanschluss", eingaben: {}, land: "DE" });
  assert.ok(JSON.stringify(de.ergebnis.kennzahlen).includes("§ 8"), "DE: gesetzliche Frist");
  for (const land of ["AT", "CH"]) {
    const r = neuRechnen({ rechner: "netzanschluss", eingaben: {}, land });
    assert.ok(r.ergebnis.hinweise.some((h) => h.includes("kein geprüfter Wert")), `${land}: offener Frist-Hinweis`);
  }
});

test("Status und Prüf-ID: erledigte Schritte ändern Ergebnis und ID, Reihenfolge wird normiert", () => {
  const ids = schrittIds("de");
  const a = neuRechnen({ rechner: "netzanschluss", eingaben: { erledigt: [ids[1], ids[0]] }, land: "DE" });
  const b = neuRechnen({ rechner: "netzanschluss", eingaben: { erledigt: [ids[0], ids[1]] }, land: "DE" });
  assert.deepEqual(a.eingaben.erledigt, [ids[0], ids[1]], "normierte Reihenfolge");
  assert.equal(a.pruefId, b.pruefId, "Reihenfolge egal");
  const leer = neuRechnen({ rechner: "netzanschluss", eingaben: { erledigt: [] }, land: "DE" });
  assert.notEqual(a.pruefId, leer.pruefId);
  assert.equal(a.roh.anzahlErledigt, 2);
  const stufen = a.ergebnis.listen[0].eintraege.map((x) => x.stufeText);
  assert.deepEqual(stufen.slice(0, 3), ["erledigt", "erledigt", "als Nächstes"]);
});

test("Eingabeprüfung: fremde Schritt-IDs, falsches Land, unbekannte Felder → 422", () => {
  assert.equal(status(() => neuRechnen({ rechner: "netzanschluss", eingaben: { erledigt: ["de-begehren"] }, land: "AT" })), 422, "DE-Schritt in AT");
  assert.equal(status(() => neuRechnen({ rechner: "netzanschluss", eingaben: { erledigt: ["kaputt"] }, land: "DE" })), 422, "unbekannte ID");
  assert.equal(status(() => neuRechnen({ rechner: "netzanschluss", eingaben: { summe: 1 }, land: "DE" })), 422, "unbekanntes Feld");
  assert.equal(status(() => neuRechnen({ rechner: "netzanschluss", eingaben: {}, land: "FR" })), 422, "Land");
});

test("Annahmenbuch: Eintrag der Rechenlogik vorhanden", () => {
  const buch = annahmenbuchFuer("netzanschluss", { erledigt: [] });
  assert.ok(buch.eintraege.some((x) => x.id === "netzanschluss.ablauf"));
  for (const x of buch.eintraege) assert.ok(x.quelle?.titel && x.statusText, x.id);
});

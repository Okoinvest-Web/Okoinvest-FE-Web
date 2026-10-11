// Reine Regeln des Deal-Rooms: Umgehungsschutz (Anonymisierung), Pseudonyme, Freigabestufen,
// Wasserzeichen-Dateiname, Gebotsrechnung, Pipeline-Spalten. Spiegel: plattform/dealroom_regeln.py.
import test from "node:test";
import assert from "node:assert/strict";
import {
  anonymisieren, gebotBindefristAbgelaufen, gebotGesamt, gebotProKwp, investorStufe, ordnerVorschlag, pipelineSpalte,
  pseudonymBuchstabe, qaOeffentlicherStatus, wasserzeichenName,
} from "./dealroom.js";

test("anonymisieren entfernt E-Mail, Telefonnummern und Links (Umgehungsschutz)", () => {
  const faelle = [
    "Melden Sie sich direkt: max.mustermann@beispiel-fonds.de",
    "Rufen Sie an unter +43 664 1234567 oder 0664/1234567.",
    "Details unter https://beispiel.example/datenraum bzw. www.beispiel.example",
  ];
  for (const text of faelle) {
    const a = anonymisieren(text);
    assert.equal(a.bereinigt, true, text);
    assert.ok(a.text.includes("[Kontaktangabe entfernt]"), text);
    assert.ok(!/@|https?:|www\.|664/.test(a.text), a.text);
  }
  const harmlos = anonymisieren("Wie hoch ist der Reihenabstand der Module?");
  assert.equal(harmlos.bereinigt, false);
});

test("pseudonymBuchstabe: A…Z, dann AA (stabil für mehr als 26 Interessenten)", () => {
  assert.equal(pseudonymBuchstabe(0), "A");
  assert.equal(pseudonymBuchstabe(25), "Z");
  assert.equal(pseudonymBuchstabe(26), "AA");
  assert.equal(pseudonymBuchstabe(27), "AB");
});

test("investorStufe: Stufe 2 erst nach LOI bzw. Zulassung zur verbindlichen Runde", () => {
  assert.equal(investorStufe(null), 0);
  assert.equal(investorStufe({ status: "gemerkt" }), 0);
  assert.equal(investorStufe({ status: "nda_freigegeben" }), 1);
  assert.equal(investorStufe({ status: "nda_freigegeben" }, { verbindlichZugelassen: true }), 2);
  assert.equal(investorStufe({ status: "loi_abgegeben" }), 2);
  assert.equal(investorStufe({ status: "loi_angenommen" }), 2);
});

test("wasserzeichenName: Empfänger und Datum im Dateinamen, Endung bleibt", () => {
  const name = wasserzeichenName("Pachtvertrag Nord.pdf", { vorname: "Eva", nachname: "Beispiel" }, new Date("2026-10-11T10:00:00Z"));
  assert.ok(name.startsWith("Pachtvertrag Nord - vertraulich fuer Eva Beispiel 2026-10-11"), name);
  assert.ok(name.endsWith(".pdf"));
  // Gefährliche Zeichen werden ersetzt, Länge gedeckelt
  const boese = wasserzeichenName('a/b\\c:d*e?"f<g>h|.pdf', {});
  assert.ok(!/[\\/:*?"<>|]/.test(boese.replace(".pdf", "")), boese);
});

test("gebotGesamt/gebotProKwp rechnen beide Preis-Modi ineinander um", () => {
  const mwp = 10;
  assert.equal(gebotGesamt({ preisModus: "proKwp", preisProKwp: 105 }, mwp), 1050000);
  assert.equal(gebotGesamt({ preisModus: "gesamt", preis: 900000 }, mwp), 900000);
  assert.equal(gebotProKwp({ preisModus: "gesamt", preis: 900000 }, mwp), 90);
  assert.equal(gebotGesamt({ preisModus: "proKwp", preisProKwp: 105 }, 0), null, "ohne MWp kein Gesamtpreis");
});

test("gebotBindefristAbgelaufen: Zuschlag nur auf noch bindende Gebote", () => {
  const heute = "2026-10-11";
  assert.equal(gebotBindefristAbgelaufen({ gueltigBis: "2026-10-10" }, heute), true, "gestern abgelaufen");
  assert.equal(gebotBindefristAbgelaufen({ gueltigBis: "2026-10-11" }, heute), false, "läuft heute noch");
  assert.equal(gebotBindefristAbgelaufen({ gueltigBis: "2026-12-31" }, heute), false, "in der Zukunft");
  assert.equal(gebotBindefristAbgelaufen({ gueltigBis: "" }, heute), false, "ohne Bindefrist keine Sperre");
  assert.equal(gebotBindefristAbgelaufen(null, heute), false);
});

test("pipelineSpalte folgt dem Interesse-Status (NDA → Datenraum → Angebot → Verhandlung → gewonnen/verloren)", () => {
  assert.equal(pipelineSpalte({ status: "gemerkt" }), "beobachten");
  assert.equal(pipelineSpalte({ status: "nda_angefragt" }), "nda");
  assert.equal(pipelineSpalte({ status: "nda_freigegeben" }), "datenraum");
  assert.equal(pipelineSpalte({ status: "nda_freigegeben" }, { gebotAbgegeben: true }), "angebot");
  assert.equal(pipelineSpalte({ status: "loi_abgegeben" }), "angebot");
  assert.equal(pipelineSpalte({ status: "loi_angenommen" }), "verhandlung");
  assert.equal(pipelineSpalte({ status: "nda_freigegeben" }, { zuschlag: true }), "verhandlung");
  assert.equal(pipelineSpalte({ status: "abgeschlossen" }), "gewonnen");
  assert.equal(pipelineSpalte({ status: "abgelehnt" }), "verloren");
});

test("qaOeffentlicherStatus zeigt Investoren nur offen/beantwortet/abgelehnt (keine internen Stufen)", () => {
  assert.equal(qaOeffentlicherStatus("eingereicht"), "offen");
  assert.equal(qaOeffentlicherStatus("freigegeben"), "offen");
  assert.equal(qaOeffentlicherStatus("beantwortet"), "offen");
  assert.equal(qaOeffentlicherStatus("veroeffentlicht"), "beantwortet");
  assert.equal(qaOeffentlicherStatus("abgelehnt"), "abgelehnt");
});

test("ordnerVorschlag ordnet Unterlagen dem Datenraum-Index zu", () => {
  assert.equal(ordnerVorschlag({ checkliste: "pacht" }), "flaeche");
  assert.equal(ordnerVorschlag({ name: "Netzanschlusszusage.pdf" }), "netz");
  assert.equal(ordnerVorschlag({ name: "Ertragsgutachten P50 P90.pdf" }), "ertrag");
  assert.equal(ordnerVorschlag({ name: "Unbekannt.xyz" }), "allgemein");
});

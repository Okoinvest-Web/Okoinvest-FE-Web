// src/lib/sprache/gruppe1.test.mjs – Übersetzer-Gruppe 1 (Börse, Investoren, Unternehmen, Recht)
//
//   node --test src/lib/sprache/gruppe1.test.mjs
//
// - Register: übersetzte Seiten indexierbar, englische Rechtstexte übersetzt, aber noindex
//   (Vermerk index: false bis zur Freigabe durch die Rechtsabteilung) und nicht in der Sitemap.
// - Meldungen der Formulare: bekannte Prüfmeldungen englisch, unbekannte bleiben deutsch.
// - Formate: Eurobeträge und Termine im englischen Format.

import test from "node:test";
import assert from "node:assert/strict";
import { UEBERSETZT, uebersetzt, uebersetztIndexierbar } from "./seiten.js";
import { meldungFuer } from "./meldungen.js";
import { fmtEuro } from "./format.js";
import { TERMIN_ARTEN_EN, terminArt, zeitraumTextEn } from "./termine.js";
import { TERMIN_ARTEN } from "../plattform/termine/index.js";
import { alternates, fassungIndexierbar } from "../land/pfad.js";
import { abs } from "../../data/site.js";

const SEITEN = ["/investoren", "/projektboerse", "/projektboerse/anbieten", "/projektboerse/karte", "/bestandsanlagen", "/kontakt", "/termin", "/unternehmen", "/referenzen", "/warum-oekoinvest", "/prozess"];
const RECHT = ["/impressum", "/barrierefreiheit", "/datenschutz", "/nutzungsbedingungen", "/bedingungen/projektboerse", "/bedingungen/energiebeschaffung", "/bedingungen/lieferanten", "/bedingungen/banken"];

test("Gruppe 1: Seiten übersetzt und indexierbar, Exposés über das Muster", () => {
  for (const k of SEITEN) {
    assert.equal(uebersetzt(k), true, `${k} nicht übersetzt`);
    assert.equal(uebersetztIndexierbar(k), true, `${k} nicht indexierbar`);
    assert.equal(fassungIndexierbar(k, null, "en"), true, `${k}: englische Fassung nicht indexierbar`);
  }
  assert.equal(uebersetzt("/projektboerse/irgendein-projekt"), true, "Exposé-Muster /projektboerse/[slug]");
});

test("Gruppe 1: Rechtstexte übersetzt (kein Hinweis), aber noindex und ohne hreflang bis zur Freigabe", () => {
  for (const k of RECHT) {
    assert.equal(uebersetzt(k), true, `${k} nicht übersetzt`);
    assert.equal(UEBERSETZT[k].index, false, `${k}: Vermerk index: false fehlt`);
    assert.equal(uebersetztIndexierbar(k), false, `${k} darf noch nicht indexiert werden`);
    assert.equal(fassungIndexierbar(k, null, "en"), false, `${k}: englische Fassung indexierbar`);
    assert.deepEqual(alternates(k, null, { sprache: "en" }), { canonical: abs(`/en${k}`) }, `${k}: ohne Cluster`);
  }
});

test("Formularmeldungen: bekannte Meldungen englisch, Deutsch bleibt Deutsch", () => {
  assert.equal(meldungFuer("Bitte ausfüllen.", "en"), "Please fill in this field.");
  assert.equal(meldungFuer("Bitte ausfüllen.", "de"), "Bitte ausfüllen.");
  assert.equal(meldungFuer("Der Vorname ist zu kurz (mindestens 1 Zeichen).", "en"), "The first name is too short (at least 1 character).");
  assert.equal(meldungFuer("Die Nachricht ist zu lang (höchstens 5000 Zeichen).", "en"), "The message is too long (at most 5000 characters).");
  assert.match(meldungFuer("Deutsche Postleitzahlen haben 5 Ziffern, z. B. 86825. Liegt der Ort in Österreich oder der Schweiz? Dann bitte oben das Land ändern.", "en"), /^German postcodes have 5 digits, e\.g\. 86825\. Is the place in Austria or Switzerland\?/);
  assert.equal(meldungFuer("Postleitzahlen in der Schweiz haben 4 Ziffern, z. B. 8001.", "en"), "Swiss postcodes have 4 digits, e.g. 8001.");
  assert.equal(meldungFuer("Unbekannte Servermeldung", "en"), "Unbekannte Servermeldung");
  assert.equal(meldungFuer("", "en"), "");
});

test("Formate: Euro und Termine englisch", () => {
  assert.equal(fmtEuro(1234567.4, "en"), "€1,234,567");
  assert.equal(fmtEuro(1234567.4, "de"), "1.234.567 €");
  assert.match(zeitraumTextEn("2026-10-06T08:00:00Z", "2026-10-06T09:30:00Z"), /^Tue, 06 Oct 2026, 10:00–11:30 \(Vienna\/Berlin time\)$/);
  for (const id of Object.keys(TERMIN_ARTEN)) assert.ok(TERMIN_ARTEN_EN[id]?.label, `Terminart ${id} ohne englischen Namen`);
  assert.equal(terminArt(TERMIN_ARTEN.besichtigung, "besichtigung", "en").dauer, TERMIN_ARTEN.besichtigung.dauer, "Dauer bleibt aus der Konfiguration");
  assert.equal(terminArt(TERMIN_ARTEN.besichtigung, "besichtigung", "de").label, TERMIN_ARTEN.besichtigung.label);
});

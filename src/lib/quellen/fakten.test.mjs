// src/lib/quellen/fakten.test.mjs – Tests der Fakten-Suche /quellen (Welle 4, Paket FAKTEN)
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/quellen/fakten.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { HINWEIS_ABGELAUFEN } from "../fakten/index.js";
import { LIZENZ, alsCsv, alsJsonExport, ankerFuer, datasetSchema, filtere, quellenEintraege, quellenZusammenfassung, themaVon, trifft, wertText } from "./fakten.js";

const HEUTE = "2026-10-11";

const fakt = (extra = {}) => ({
  id: "pacht.testwert",
  wert: 3000,
  einheit: "€/ha·a",
  land: "DE",
  quelle: { titel: "Testquelle", url: "https://example.org/quelle" },
  abruf: "2026-10-01",
  gueltigAb: null,
  gueltigBis: null,
  status: "geprueft",
  pruefer: "Test · Zweitprüfung TODO-E6",
  klasse: "B",
  herkunft: "test",
  ...extra,
});

test("ankerFuer: stabil, klein geschriebenes Land, id unverändert", () => {
  assert.equal(ankerFuer("pacht.freiflaecheProHa", "DE"), "fakt-de-pacht.freiflaecheProHa");
  assert.equal(ankerFuer("termin.eegGebot", "DACH"), "fakt-dach-termin.eegGebot");
});

test("wertText: Zahl, Spanne, Wahrheitswert, Tabelle, offener Wert", () => {
  assert.equal(wertText(2500), "2.500");
  assert.equal(wertText({ min: 2000, max: 3500 }), "2.000 bis 3.500");
  assert.equal(wertText({ min: 2000, mittel: 2800, max: 3500 }), "2.000 bis 3.500 (Mittel 2.800)");
  assert.equal(wertText(true), "ja");
  assert.equal(wertText([1, 2, 3]), "Tabelle mit 3 Einträgen");
  assert.equal(wertText(null), "– (Wert offen)");
});

test("quellenEintraege: schließt Entwürfe aus und fasst Versionen zusammen", () => {
  const liste = [
    fakt(),
    fakt({ id: "umlage.kwkg", klasse: "A", gueltigAb: "2026-01-01", wert: 0.277 }),
    fakt({ id: "umlage.kwkg", klasse: "A", gueltigAb: "2027-01-01", wert: 0.3, status: "zu_pruefen" }),
    fakt({ id: "pacht.entwurf", status: "entwurf" }),
  ];
  const e = quellenEintraege({ heute: HEUTE, liste });
  assert.equal(e.length, 2); // Entwurf fehlt, zwei Versionen = ein Eintrag
  const kwkg = e.find((x) => x.id === "umlage.kwkg");
  assert.equal(kwkg.wert, 0.277); // am Stichtag geltende Version
  assert.equal(kwkg.weitereVersionen.length, 1);
  assert.equal(kwkg.weitereVersionen[0].gueltigAb, "2027-01-01");
  assert.equal(kwkg.anker, "fakt-de-umlage.kwkg");
  assert.equal(kwkg.thema, themaVon("umlage.kwkg"));
});

test("quellenEintraege: abgelaufene Werte sind sichtbar markiert (HINWEIS_ABGELAUFEN)", () => {
  const e = quellenEintraege({ heute: HEUTE, liste: [fakt({ gueltigBis: "2025-12-31", klasse: "A" })] });
  assert.equal(e[0].abgelaufen, true);
  assert.equal(e[0].status, "abgelaufen");
  assert.equal(e[0].hinweis, HINWEIS_ABGELAUFEN);
});

test("filtere: Land, Thema, Klasse, Status und Volltext (UND-verknüpft, ohne Umlaut-Hürden)", () => {
  const liste = [fakt(), fakt({ id: "termin.gebot", land: "AT", klasse: "A", status: "zu_pruefen", quelle: { titel: "EAG Fördertermin Österreich", url: "https://example.org/eag" } })];
  const e = quellenEintraege({ heute: HEUTE, liste });
  assert.equal(filtere(e, { land: "AT" }).length, 1);
  assert.equal(filtere(e, { thema: "pacht" })[0].id, "pacht.testwert");
  assert.equal(filtere(e, { klasse: "A" })[0].land, "AT");
  assert.equal(filtere(e, { status: "geprueft" })[0].id, "pacht.testwert");
  assert.equal(filtere(e, { text: "fordertermin osterreich" }).length, 1); // normalisiert ö→o
  assert.equal(filtere(e, { text: "gebot nicht-vorhanden" }).length, 0);
  assert.ok(trifft(e[0], ""));
});

test("Echtes Register: Einträge vorhanden, Anker eindeutig, keine Entwürfe", () => {
  const e = quellenEintraege({ heute: HEUTE });
  assert.ok(e.length >= 100, `erwartet ≥ 100 Einträge, waren ${e.length}`);
  const anker = new Set(e.map((x) => x.anker));
  assert.equal(anker.size, e.length, "Anker müssen eindeutig sein");
  assert.ok(e.every((x) => x.status !== "entwurf"));
  assert.ok(e.every((x) => x.quelleTitel && x.abruf && x.pruefer), "jeder Eintrag trägt Quelle, Abruf und Prüfer");
});

test("alsCsv: Kopfzeile, Anführung von Semikolon/Anführungszeichen, Lizenzspalte", () => {
  const e = quellenEintraege({ heute: HEUTE, liste: [fakt({ notiz: 'Spanne; "brutto"', wert: { min: 1, max: 2 } })] });
  const csv = alsCsv(e);
  const zeilen = csv.trim().split("\r\n");
  assert.equal(zeilen.length, 2);
  assert.ok(zeilen[0].startsWith("id;land;thema;wert;einheit;klasse;status"));
  assert.ok(zeilen[1].includes('"Spanne; ""brutto"""'), "Semikolon und Anführungszeichen RFC-4180-gequotet");
  assert.ok(zeilen[1].includes('"{""min"":1,""max"":2}"'), "Objektwerte als JSON");
  assert.ok(zeilen[1].includes("CC BY 4.0"));
});

test("alsJsonExport und datasetSchema: Lizenz CC BY 4.0, Zitier-URLs, Downloads", () => {
  const e = quellenEintraege({ heute: HEUTE, liste: [fakt()] });
  const j = alsJsonExport(e, { heute: HEUTE, basis: "https://www.oekoinvest.com" });
  assert.equal(j.lizenz.url, LIZENZ.url);
  assert.equal(j.anzahl, 1);
  assert.equal(j.fakten[0].url, "https://www.oekoinvest.com/quellen#fakt-de-pacht.testwert");
  const s = datasetSchema({ heute: HEUTE, anzahl: 1 });
  assert.equal(s["@type"], "Dataset");
  assert.equal(s.license, LIZENZ.url);
  assert.deepEqual(
    s.distribution.map((d) => d.contentUrl),
    ["https://www.oekoinvest.com/quellen/fakten.csv", "https://www.oekoinvest.com/quellen/fakten.json"]
  );
});

test("quellenZusammenfassung: zählt ohne Entwürfe, nennt letzten Abruf", () => {
  const z = quellenZusammenfassung({ heute: HEUTE, liste: [fakt(), fakt({ id: "x.entwurf", status: "entwurf" }), fakt({ id: "y.offen", status: "zu_pruefen" })] });
  assert.equal(z.fakten, 2);
  assert.equal(z.geprueft, 1);
  assert.equal(z.zuPruefen, 1);
  assert.equal(z.letzterAbruf, "2026-10-01");
});

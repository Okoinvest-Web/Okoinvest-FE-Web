// Tests für den CH-Strompreis-Atlas (Welle 4, Paket CHATLAS): Datenintegrität und Auswertung.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ATLAS_GEMEINDEN, ATLAS_JAHRE, ATLAS_KANTONE, ATLAS_KATEGORIEN, ATLAS_LIZENZ } from "../../data/strompreisatlasCh.js";
import { alsCsv, alsJson, CSV_SPALTEN, exportZeilen, gemeindeWerte, kantonsWerte, spannweite, veraenderung } from "./strompreisatlasCh.js";

const KATS = Object.keys(ATLAS_KATEGORIEN);

test("Kantone: je Jahr und Kategorie genau 26 Kantone, ohne Dubletten", () => {
  for (const jahr of ATLAS_JAHRE) {
    for (const kat of KATS) {
      const werte = kantonsWerte(jahr, kat);
      assert.equal(werte.length, 26, `${jahr}/${kat}`);
      assert.equal(new Set(werte.map((x) => x.abk)).size, 26);
      assert.equal(new Set(werte.map((x) => x.nr)).size, 26);
    }
  }
});

test("Kantone: Werte plausibel (Rp./kWh, Bestandteile vorhanden, keine negativen Werte)", () => {
  for (const x of ATLAS_KANTONE) {
    assert.ok(x.total > 5 && x.total < 80, `${x.jahr} ${x.kategorie} ${x.abk}: total ${x.total}`);
    for (const f of ["energie", "netz", "abgaben", "netzzuschlag"]) {
      assert.ok(typeof x[f] === "number" && x[f] >= 0, `${x.abk} ${f}`);
    }
    // Mediane der Bestandteile ≈ Median Total (Abweichung erlaubt, aber nicht beliebig groß)
    const summe = x.energie + x.netz + x.abgaben + x.netzzuschlag;
    assert.ok(Math.abs(summe - x.total) < 6, `${x.jahr} ${x.kategorie} ${x.abk}: Summe ${summe} vs. Total ${x.total}`);
  }
});

test("Gemeinden: nur bekannte Jahre/Kategorien, Betreiber benannt, Werte positiv", () => {
  assert.ok(ATLAS_GEMEINDEN.length >= 30);
  for (const x of ATLAS_GEMEINDEN) {
    assert.ok(ATLAS_JAHRE.includes(x.jahr));
    assert.ok(KATS.includes(x.kategorie));
    assert.ok(Number.isInteger(x.bfs) && x.bfs > 0);
    assert.ok(x.betreiber.length > 2);
    assert.ok(x.total > 5 && x.total < 80);
  }
});

test("kantonsWerte/gemeindeWerte: unbekanntes Jahr oder Kategorie → leere Liste", () => {
  assert.deepEqual(kantonsWerte("2019", "H4"), []);
  assert.deepEqual(kantonsWerte("2026", "H9"), []);
  assert.deepEqual(gemeindeWerte("x", "C3"), []);
});

test("spannweite: min <= max, beide aus den Kantonswerten", () => {
  for (const jahr of ATLAS_JAHRE) {
    for (const kat of KATS) {
      const s = spannweite(jahr, kat);
      assert.ok(s && s.min.total <= s.max.total);
      assert.ok(kantonsWerte(jahr, kat).some((x) => x.abk === s.min.abk));
    }
  }
});

test("veraenderung: 26 Kantone mit delta = nach - von", () => {
  for (const kat of KATS) {
    const liste = veraenderung(kat);
    assert.equal(liste.length, 26);
    for (const x of liste) assert.ok(Math.abs(x.delta - (x.nach - x.von)) < 1e-9);
  }
});

test("Export: CSV mit Kopfzeile und allen Zeilen, JSON mit Lizenz und Quellen", () => {
  const zeilen = exportZeilen();
  assert.equal(zeilen.length, ATLAS_KANTONE.length + ATLAS_GEMEINDEN.length);
  const csv = alsCsv();
  const csvZeilen = csv.trim().split("\n");
  assert.equal(csvZeilen[0], CSV_SPALTEN.join(","));
  assert.equal(csvZeilen.length, zeilen.length + 1);
  const json = alsJson();
  assert.equal(json.einheit, "Rp./kWh");
  assert.ok(json.lizenz.wortlaut.includes("Open use"));
  assert.ok(json.quellen.kantone.url.includes("opendata.swiss"));
});

test("Lizenz: Wortlaut, Fundstelle und Prüfdatum dokumentiert", () => {
  assert.ok(ATLAS_LIZENZ.url.includes("terms_open"));
  assert.ok(ATLAS_LIZENZ.fundstelle.includes("terms-of-use"));
  assert.equal(ATLAS_LIZENZ.geprueft, "2026-10-11");
});

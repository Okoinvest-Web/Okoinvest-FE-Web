// Tests Ausschreibungs-Monitor (Welle 3, Paket B9): Datenvertrag, Ländertrennung, Termine, Export.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MONITOR_QUELLEN, RUNDEN, SERIEN, TERMINE } from "../../data/ausschreibungsmonitor.js";
import { AUSSCHREIBUNGEN } from "../../data/marktdaten.js";
import { CSV_SPALTEN, alsCsv, alsJson, csvZelle, exportZeilen, jahresWerte, letzteErgebnisse, letzteRunde, quellenFuer, rundenDer, serienFuer, termineAm, ueberzeichnung } from "./monitor.js";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const zahlOderNull = (v) => v === null || (typeof v === "number" && Number.isFinite(v));

test("Datenvertrag: jede Reihe hat Runden, Quellen mit https-URL und eine Einheit", () => {
  assert.equal(new Set(SERIEN.map((s) => s.id)).size, SERIEN.length);
  for (const s of SERIEN) {
    assert.ok(["DE", "AT", "CH"].includes(s.land), s.id);
    assert.ok(s.einheit && s.name && s.nameEn && s.wert && s.wertEn, s.id);
    assert.ok(Array.isArray(RUNDEN[s.id]) && RUNDEN[s.id].length > 0, `${s.id}: keine Runden`);
    for (const q of s.quellen) assert.match(MONITOR_QUELLEN[q]?.url || "", /^https:\/\//, `${s.id}: Quelle ${q}`);
  }
});

test("Datenvertrag: Runden plausibel, keine Doppelten, Zahlen oder null (nie geschätzt)", () => {
  for (const [id, liste] of Object.entries(RUNDEN)) {
    const daten = liste.map((x) => x.datum);
    assert.equal(new Set(daten).size, daten.length, `${id}: doppelter Gebotstermin`);
    for (const x of liste) {
      const wo = `${id} ${x.datum}`;
      assert.match(x.datum, ISO, wo);
      for (const k of ["volumen", "gebote", "zuschlag", "nGebote", "nZuschlaege", "mittel", "min", "max", "hoechst"]) assert.ok(zahlOderNull(x[k]), `${wo}: ${k}`);
      if (x.quelle) assert.ok(MONITOR_QUELLEN[x.quelle], `${wo}: Quelle ${x.quelle} unbekannt`);
      assert.ok(typeof x.zuschlag === "number" && x.zuschlag >= 0, `${wo}: Zuschlagsmenge fehlt`);
      if (x.mittel != null) {
        assert.ok(x.min <= x.mittel && x.mittel <= x.max, `${wo}: Ø außerhalb der Spanne`);
        if (x.hoechst != null) assert.ok(x.max <= x.hoechst, `${wo}: Zuschlag über Höchstwert`);
      }
      if (x.nZuschlaege != null && x.nGebote != null) assert.ok(x.nZuschlaege <= x.nGebote, wo);
    }
  }
});

test("Erstes Segment DE ist dieselbe Reihe wie /marktdaten (keine zweite Datenhaltung)", () => {
  const s1 = rundenDer("de-solar1");
  assert.equal(s1.length, AUSSCHREIBUNGEN.length);
  assert.deepEqual(s1.map((x) => [x.datum, x.mittel]), AUSSCHREIBUNGEN.map((a) => [a.datum, a.mittel]));
});

test("Österreich: Gebotsmenge und Anzahl sind nicht veröffentlicht → null, Höchstpreis nur 2026", () => {
  for (const x of RUNDEN["at-eag-pv"]) {
    assert.equal(x.gebote, null);
    assert.equal(x.nGebote, null);
    assert.equal(x.hoechst === null || x.datum.startsWith("2026"), true, x.datum);
  }
  assert.equal(ueberzeichnung(RUNDEN["at-eag-pv"][0]), null);
});

test("Ländertrennung: serienFuer und Export liefern nur das gewählte Land", () => {
  for (const l of ["DE", "AT", "CH"]) {
    assert.ok(serienFuer(l).length > 0);
    assert.ok(serienFuer(l).every((s) => s.land === l));
    assert.ok(exportZeilen(l).every((z) => z.land === l));
    assert.ok(letzteErgebnisse(l, 50).every((z) => z.land === l));
    assert.ok(alsJson(l, "2026-10-09").reihen.every((s) => s.land === l));
  }
  assert.equal(serienFuer("XX").length, 0);
  assert.equal(serienFuer(null).length, SERIEN.length);
  assert.deepEqual(new Set(exportZeilen(null).map((z) => z.land)), new Set(["DE", "AT", "CH"]));
});

test("letzteRunde überspringt Runden ohne Ø-Wert", () => {
  assert.equal(letzteRunde("ch-gmp").datum, "2026-08-01");
  assert.equal(letzteRunde("de-innovation").datum, "2026-09-01");
  assert.equal(letzteRunde("gibt-es-nicht"), null);
});

test("jahresWerte: mengengewichtet nur über Runden mit Wert", () => {
  const j2023 = jahresWerte("de-innovation").find((j) => j.jahr === 2023);
  assert.equal(j2023.termine, 2);
  // Mai 2023 ohne veröffentlichten Wert → Ø nur aus September 2023
  assert.equal(j2023.mittel, 8.33);
  const ch2025 = jahresWerte("ch-gmp").find((j) => j.jahr === 2025);
  assert.ok(Math.abs(ch2025.mittel - (8.6 * 2.2 + 8.5 * 0.3) / 2.5) < 1e-9);
});

test("Termine: kommend, laufend und ausstehend je Stichtag", () => {
  const { kommend, ausstehend } = termineAm("2026-10-09");
  assert.ok(kommend.every((x) => x.datum >= "2026-10-09"));
  assert.deepEqual(kommend.map((x) => x.datum), [...kommend.map((x) => x.datum)].sort());
  // DE zweites Segment 1.10.2026 und AT 24.09.2026: vorbei, Ergebnis noch nicht veröffentlicht
  assert.ok(ausstehend.some((x) => x.serie === "de-solar2" && x.datum === "2026-10-01"));
  assert.ok(ausstehend.some((x) => x.serie === "at-eag-pv" && x.datum === "2026-09-24"));
  // Pronovo Runde 4/2026: Fenster 18.10.–1.11.2026
  assert.equal(termineAm("2026-10-20", "CH").kommend.every((x) => x.laufend), true);
  assert.equal(termineAm("2026-10-09", "CH").kommend.some((x) => x.laufend), false);
  // Termine mit Ergebnis erscheinen nicht als offen
  for (const x of TERMINE) assert.ok(!RUNDEN[x.serie].some((y) => y.datum === x.datum) || !termineAm("2020-01-01").kommend.includes(x));
  // Land: nur eigene Termine
  assert.ok(termineAm("2026-10-09", "AT").kommend.every((x) => x.serie.startsWith("at-")));
});

test("CSV: Kopf, eine Zeile je Runde, Punkt als Dezimaltrenner, leere Zelle für null", () => {
  const csv = alsCsv("AT");
  const zeilen = csv.trimEnd().split("\r\n");
  assert.equal(zeilen[0], CSV_SPALTEN.join(","));
  assert.equal(zeilen.length, 1 + RUNDEN["at-eag-pv"].length);
  assert.match(zeilen.at(-1), /^"AT","at-eag-pv",.*"2026-06-11","ct\/kWh",179\.033,,181\.439,,,6\.4,4\.61,6\.69,7\.77,false,"https:\/\//);
  assert.equal(csvZelle(null), "");
  assert.equal(csvZelle('a"b'), '"a""b"');
  assert.equal(csvZelle("=SUMME(A1)"), `"'=SUMME(A1)"`);
});

test("JSON: Lizenz CC BY 4.0, Quellen, keine englischen Hilfsfelder", () => {
  const j = alsJson(null, "2026-10-09");
  assert.equal(j.lizenz.name, "CC BY 4.0");
  assert.equal(j.land, "DACH");
  assert.ok(j.quellen.length >= 6 && j.quellen.every((q) => /^https:\/\//.test(q.url)));
  assert.ok(j.reihen.every((s) => s.runden.every((x) => !("notizEn" in x))));
  assert.ok(quellenFuer("CH").every((q) => q.url.includes("pronovo.ch")));
  JSON.parse(JSON.stringify(j));
  // Schweiz: Quelle je Runde ist das Cockpit des Jahres
  const ch = exportZeilen("CH");
  assert.ok(ch.every((z) => z.quelle_url === MONITOR_QUELLEN[`cockpit${z.gebotstermin.slice(0, 4)}`].url));
});

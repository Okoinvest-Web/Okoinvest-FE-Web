// Welle 3, Paket B6: Flächenpass Stufe 1 – Geometrie, Normalisierung, Bewertung, Checkliste, keine Geldwerte.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/rechner/flaechenpass.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { GRENZEN, checkliste, flaecheKennzahlen, flaecheLesen, flaecheText, flaechenpass, fragenFuer, normalisieren, regionenFuer, selbstueberschneidend } from "./flaechenpass.js";
import { FLAECHENPASS_TEXTE, angabeText, kriteriumZeile } from "./flaechenpassTexte.js";
import { bewerte } from "../plattform/geodaten/scoring.js";

// Rechteck ca. 300 m × 334 m bei 48° N (≈ 10 ha)
const RECHTECK = "13,48;13.004,48;13.004,48.003;13,48.003";

test("Geometrie: Rechteck wird gelesen und richtig gemessen (±1 %)", () => {
  const g = flaecheLesen(RECHTECK);
  assert.equal(g.fehler, undefined);
  const k = flaecheKennzahlen(g.geometrie);
  // 0,004° Länge × cos(48°) × 111,19 km = 297,6 m; 0,003° Breite = 333,6 m → 9,93 ha
  assert.ok(Math.abs(k.ha - 9.93) < 0.1, `ha ${k.ha}`);
  assert.ok(k.kompaktheit > 0.9, "Rechteck ist kompakt");
  assert.deepEqual(k.schwerpunkt, [13.002, 48.0015]);
});

test("Geometrie: ungültige Eingaben werden abgelehnt", () => {
  assert.equal(flaecheLesen("13,48;13.1,48").fehler, "punkte");
  assert.equal(flaecheLesen(Array.from({ length: 61 }, (_, i) => `13.${i},48`).join(";")).fehler, "punkte");
  assert.equal(flaecheLesen("13,48;13.01,48.01;13.01,48;13,48.01").fehler, "ueberschneidung");
  assert.equal(flaecheLesen("2,40;2.1,40;2.1,40.1").fehler, "ausserhalb");
  assert.equal(flaecheLesen("13,48;13.0001,48;13.0001,48.0001").fehler, "klein");
  assert.equal(flaecheLesen("10,48;11,48;11,49;10,49").fehler, "gross");
  assert.equal(flaecheLesen("13,48;abc;13,49").fehler, "format");
  assert.equal(flaecheLesen({}).fehler, "format");
  assert.equal(flaecheLesen("x".repeat(2001)).fehler, "format");
});

test("Geometrie: Text ohne Schlusspunkt, 6 Nachkommastellen; Selbstüberschneidung erkannt", () => {
  assert.equal(flaecheText([[13.1234567, 48], [13.2, 48], [13.2, 48.1], [13.1234567, 48]]), "13.123457,48;13.2,48;13.2,48.1");
  assert.equal(selbstueberschneidend([[0, 0], [1, 1], [1, 0], [0, 1]]), true);
  assert.equal(selbstueberschneidend([[0, 0], [1, 0], [1, 1], [0, 1]]), false);
});

test("Normalisierung: Region passt zum Land, unbekannte Felder fallen weg, ha aus der Fläche", () => {
  const e = normalisieren({ region: "bayern", flaeche: RECHTECK, ha: 500, zone: "ja", verkehr: "bis200", foo: 1 }, "DE");
  assert.equal(e.region, "bayern");
  assert.ok(Math.abs(e.ha - 9.93) < 0.1, "ha aus der Zeichnung, nicht aus der Angabe");
  assert.equal(e.zone, undefined, "AT-Frage gilt nicht in DE");
  assert.equal(e.verkehr, "bis200");
  assert.equal(e.foo, undefined);
  assert.equal(normalisieren({ region: "bayern" }, "AT").region, null, "Bayern ist keine Region in AT");
  assert.equal(normalisieren({}, "CH").region, "schweiz");
  assert.equal(normalisieren({ ha: 99999 }, "CH").ha, GRENZEN.haMax);
});

test("Zusatzfragen je Land und Widmungsart", () => {
  assert.deepEqual(fragenFuer("DE", "bayern"), ["verkehr", "benachteiligt"]);
  assert.deepEqual(fragenFuer("AT", "oberoesterreich"), ["uw"]);
  assert.deepEqual(fragenFuer("AT", "niederoesterreich"), ["zone"]);
  assert.deepEqual(fragenFuer("AT", "tirol"), []);
  assert.deepEqual(fragenFuer("CH", "schweiz"), ["eignung", "vorbelastet", "fff"]);
  assert.equal(regionenFuer("DE").length, 16);
  assert.equal(regionenFuer("AT").length, 9);
});

test("Bewertung = Scoring-Engine (unverändert) mit den abgeleiteten Merkmalen", () => {
  const p = flaechenpass({ region: "bayern", flaeche: RECHTECK, netz: "1-3", verkehr: "bis500", benachteiligt: "ja", schutz: "nein", siedlung: "gt300" }, "DE");
  assert.ok(p.score >= 0 && p.score <= 100);
  assert.equal(p.land, "DE");
  assert.equal(p.gezeichnet, true);
  assert.ok(p.kriterien.some((k) => k.id === "kulisse" && k.punkte > 0), "EEG-Kulisse zählt");
  assert.deepEqual(p.offen, ["kapazitaet"], "nur die Netzkapazität bleibt offen");
  // Gegenprobe: gleiche Merkmale direkt in die Engine
  const direkt = bewerte({ ha: p.ha, kompaktheit: p.kompaktheit, neigungGrad: 2, exposition: "eben", nutzung: { acker: p.ha }, schutz: [], siedlungAbstandM: 500, netz: null, widmung: { status: "unklar" }, bundesland: "Bayern", land: "DE", kulisse: { randstreifenAnteil: 1, benachteiligtAnteil: 1, konversionAnteil: 0 } });
  assert.equal(p.kriterien.find((k) => k.id === "kulisse").punkte, direkt.kriterien.find((k) => k.id === "kulisse").punkte);
});

test("Unbekanntes wird nicht erfunden: offen, Netz vorsichtig 5 km", () => {
  const p = flaechenpass({ region: "oberoesterreich", ha: 8 }, "AT");
  assert.equal(p.netzAngenommen, true);
  assert.equal(p.netzKm, 5);
  for (const x of ["schutz", "siedlung", "netz", "kapazitaet", "uw"]) assert.ok(p.offen.includes(x), x);
  const c = checkliste(p);
  assert.ok(c.angaben.filter((a) => a.stufe === "offen").length >= 4);
});

test("Ausschlussgründe deckeln: Naturschutz auf der Fläche, unter 2 ha, sehr steil", () => {
  assert.ok(flaechenpass({ region: "bayern", ha: 20, schutz: "natur" }, "DE").score <= 15);
  assert.ok(flaechenpass({ region: "bayern", ha: 1.5 }, "DE").score <= 25);
  assert.ok(flaechenpass({ region: "bayern", ha: 20, neigung: "steil", exposition: "nord" }, "DE").score <= 20);
});

test("Checkliste: Antworten je Land, Rechtsrahmen nur mit Quelle", () => {
  const de = checkliste(flaechenpass({ region: "bayern", ha: 10, verkehr: "weiter", benachteiligt: "nein" }, "DE"), {
    recht: [{ titel: "A", quelle: { titel: "Q", url: "https://example.org" } }, { titel: "ohne Quelle" }],
    kulisse: { schwierig: ["Wiesenbrüter"] },
  });
  assert.equal(de.angaben.find((a) => a.id === "kulisseDE").stufe, "pruefen");
  assert.deepEqual(de.recht.map((r) => r.titel), ["A"]);
  assert.deepEqual(de.restriktionen, ["Wiesenbrüter"]);
  const at = checkliste(flaechenpass({ region: "niederoesterreich", ha: 10, zone: "nein" }, "AT"));
  assert.equal(at.angaben.find((a) => a.id === "zoneAT").stufe, "kritisch");
  const ch = checkliste(flaechenpass({ ha: 10, eignung: "ja", fff: "ja" }, "CH"));
  assert.equal(ch.angaben.find((a) => a.id === "standortCH").stufe, "gut");
  assert.equal(ch.angaben.find((a) => a.id === "fffCH").stufe, "kritisch");
});

test("Keine Geldwerte, Texte in DE und EN vollständig", () => {
  for (const [land, e] of [["DE", { region: "bayern", ha: 10 }], ["AT", { region: "niederoesterreich", ha: 10, schutz: "landschaft" }], ["CH", { ha: 10, fff: "ja" }]]) {
    const p = flaechenpass(e, land);
    for (const sprache of ["de", "en"]) {
      const t = FLAECHENPASS_TEXTE[sprache];
      const texte = [...p.kriterien.map((k) => kriteriumZeile(k, p, t, sprache)), ...checkliste(p).angaben.map((a) => angabeText(a, p, t))];
      for (const x of texte) {
        assert.ok(x.titel || x.label, `${land}/${sprache}: Titel fehlt`);
        assert.ok(typeof x.text === "string" && x.text.length > 0, `${land}/${sprache}: Text fehlt für ${x.titel || x.label}`);
        assert.doesNotMatch(x.text, /€|EUR|CHF|Fr\.\s/, `${land}/${sprache}: Geldwert in ${x.text}`);
      }
    }
  }
});

test("Prüfer B6: benachteiligtes Gebiet allein – Kulisse nur mit Hinweis auf Länder-Einschränkung; Mindestgröße aus SCHWELLEN", () => {
  for (const sprache of ["de", "en"]) {
    const t = FLAECHENPASS_TEXTE[sprache];
    const p = flaechenpass({ region: "bayern", ha: 10, verkehr: "weiter", benachteiligt: "ja" }, "DE");
    const a = checkliste(p).angaben.find((x) => x.id === "kulisseDE");
    assert.equal(a.stufe, "gut");
    assert.ok(angabeText(a, p, t).text.endsWith(t.angaben.kulisseDE.benachteiligtHinweis));
    const r = flaechenpass({ region: "bayern", ha: 10, verkehr: "bis200", benachteiligt: "nein" }, "DE");
    const b = checkliste(r).angaben.find((x) => x.id === "kulisseDE");
    assert.ok(!angabeText(b, r, t).text.includes(t.angaben.kulisseDE.benachteiligtHinweis));
  }
  assert.ok(checkliste(flaechenpass({ region: "bayern", ha: 1.9 }, "DE")).angaben.some((x) => x.id === "klein"));
  assert.ok(!checkliste(flaechenpass({ region: "bayern", ha: 2 }, "DE")).angaben.some((x) => x.id === "klein"));
});

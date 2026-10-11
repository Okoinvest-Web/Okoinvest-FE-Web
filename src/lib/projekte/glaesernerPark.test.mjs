// Tests Gläserner Solarpark (Welle 4, Paket GLAESERN): Datenobjekt und Demo-Verlauf
import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_PARK, PARKS, parkBySlug, demoLeistungKw, demoTagesverlauf, demoTagesMwh } from "./glaesernerPark.js";

test("Beispielpark ist als Demo gekennzeichnet", () => {
  assert.equal(DEMO_PARK.demo, true);
  assert.match(DEMO_PARK.name.de, /Beispiel/);
  assert.equal(DEMO_PARK.kennzahlen.beispiel, true);
  assert.equal(DEMO_PARK.pacht.beispiel, true);
  assert.equal(DEMO_PARK.gemeinde.beispiel, true);
  assert.equal(parkBySlug("glaeserner-solarpark"), DEMO_PARK);
  assert.equal(parkBySlug("gibt-es-nicht"), null);
  assert.ok(PARKS.length >= 1);
});

test("Kennzahlen sind aus dem Faktenregister abgeleitet und plausibel", () => {
  const k = DEMO_PARK.kennzahlen;
  assert.equal(k.kwp, 9800);
  assert.ok(k.flaecheHa > 9 && k.flaecheHa < 13, `Fläche ${k.flaecheHa} ha`);
  assert.ok(k.ertragMwhJahr > 9000 && k.ertragMwhJahr < 12000, `Ertrag ${k.ertragMwhJahr} MWh`);
  // Pacht-Beispielrechnung konsistent: Fläche × Mittelwert
  assert.equal(DEMO_PARK.pacht.jahrMittel, Math.round(k.flaecheHa * DEMO_PARK.pacht.proHa.mittel));
  // Gemeinde: kWh × ct/kWh → €
  assert.equal(DEMO_PARK.gemeinde.zahlungJahr, Math.round((k.ertragMwhJahr * 1000 * DEMO_PARK.gemeinde.eeg6CtProKwh) / 100));
});

test("Bautagebuch ist chronologisch, jeder Eintrag zweisprachig mit Status", () => {
  const b = DEMO_PARK.bautagebuch;
  assert.ok(b.length >= 6);
  for (let i = 1; i < b.length; i++) assert.ok(b[i].datum >= b[i - 1].datum, `${b[i].datum} nach ${b[i - 1].datum}`);
  for (const e of b) {
    assert.ok(["fertig", "laufend", "geplant"].includes(e.status));
    assert.ok(e.titel.de && e.titel.en && e.text.de && e.text.en);
  }
});

test("Texte ohne Umwelt-Werbeaussagen und ohne Garantieversprechen (Claim-Regeln)", () => {
  const alles = JSON.stringify(DEMO_PARK);
  for (const muster of [
    /klimaneutral/i, /CO[2₂]-neutral/i, /klimafreundlich/i, /umweltfreundlich/i, /klimapositiv/i, /emissionsfrei/i, /umweltschonend/i,
    /garantier/i, /risikofrei/i, /nachhaltig/i, /\bgrüne[rnms]?\b/i,
  ]) {
    assert.ok(!muster.test(alles), `Reizwort gefunden: ${muster}`);
  }
});

test("Demo-Verlauf: deterministisch, nachts null, nie über kWp", () => {
  const mittag = new Date(2026, 5, 15, 12, 30, 0, 0);
  const nacht = new Date(2026, 5, 15, 2, 0, 0, 0);
  const a = demoLeistungKw(DEMO_PARK, mittag);
  const b = demoLeistungKw(DEMO_PARK, new Date(mittag));
  assert.equal(a, b, "gleicher Zeitpunkt → gleicher Wert");
  assert.ok(a > 0, "mittags im Juni erzeugt der Demo-Park");
  assert.equal(demoLeistungKw(DEMO_PARK, nacht), 0);
  for (let h = 0; h < 24; h++) {
    const kw = demoLeistungKw(DEMO_PARK, new Date(2026, 0, 10, h, 0, 0, 0));
    assert.ok(kw >= 0 && kw <= DEMO_PARK.kennzahlen.kwp, `Stunde ${h}: ${kw} kW`);
  }
});

test("Demo-Tagesverlauf und Tagessumme passen zur Kurve", () => {
  const d = new Date(2026, 5, 15, 14, 0, 0, 0);
  const tag = demoTagesverlauf(DEMO_PARK, d);
  assert.equal(tag.length, 49); // 24 h im 30-Minuten-Raster inkl. 0 und 24
  assert.ok(tag.every((p) => p.kw >= 0 && p.kw <= DEMO_PARK.kennzahlen.kwp));
  const bisJetzt = demoTagesverlauf(DEMO_PARK, d, { bisJetzt: true });
  assert.ok(bisJetzt.length < tag.length);
  const mwh = demoTagesMwh(DEMO_PARK, d);
  assert.ok(mwh > 0 && mwh < (DEMO_PARK.kennzahlen.kwp * 24) / 1000, `Tagessumme ${mwh} MWh`);
});

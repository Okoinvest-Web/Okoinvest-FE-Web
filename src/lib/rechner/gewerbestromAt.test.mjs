// Tests: AT-Gewerbestrom-Vorbereitung SNE-VO 2027 (Welle 4, Paket ATSNE) – node --test
import test from "node:test";
import assert from "node:assert/strict";
import {
  NETZEBENEN_AT,
  BESTANDTEILE_AT,
  ELEKTRIZITAETSABGABE_AT,
  EAG_FOERDERBEITRAG_AT,
  STANDARD_AT,
  STUNDEN_JAHR,
  atEingaben,
  benutzungsstunden,
  atCheck,
} from "./gewerbestromAt.js";

test("Netzebenen: 7 Ebenen aus dem Faktenregister, NE 1–7, mit Label", () => {
  assert.equal(NETZEBENEN_AT.length, 7);
  assert.deepEqual(
    NETZEBENEN_AT.map((e) => e.nr),
    [1, 2, 3, 4, 5, 6, 7]
  );
  for (const e of NETZEBENEN_AT) {
    assert.match(e.id, /^ne[1-7]$/);
    assert.match(e.label, /^NE \d · /);
  }
});

test("Entgeltbestandteile: Struktur der SNE-V 2018 mit Paragraphenangabe, keine Zahlenwerte", () => {
  assert.equal(BESTANDTEILE_AT.length, 5);
  const ids = BESTANDTEILE_AT.map((b) => b.id);
  assert.deepEqual(ids, ["netznutzung", "netzverlust", "netzbereitstellung", "systemdienstleistung", "messleistung"]);
  for (const b of BESTANDTEILE_AT) {
    assert.match(b.par, /SNE-V 2018/);
    assert.equal(typeof b.titel, "string");
    // Struktur, kein Entgeltwert: kein Feld "wert" oder "ct"
    assert.ok(!("wert" in b) && !("ct" in b));
  }
});

test("Elektrizitätsabgabe: Regelsatz 1,5 ct/kWh am RIS geprüft (§ 4 Abs. 2 ElAbgG)", () => {
  assert.equal(ELEKTRIZITAETSABGABE_AT.wert, 1.5);
  assert.equal(ELEKTRIZITAETSABGABE_AT.einheit, "ct/kWh");
  assert.equal(ELEKTRIZITAETSABGABE_AT.status, "geprueft");
  assert.equal(ELEKTRIZITAETSABGABE_AT.land, "AT");
  assert.match(ELEKTRIZITAETSABGABE_AT.quelle.url, /^https:\/\/www\.ris\.bka\.gv\.at\//);
});

test("EAG-Förderbeitrag: Mechanik belegt, Satz bewusst offen (wert null, zu_pruefen)", () => {
  assert.equal(EAG_FOERDERBEITRAG_AT.wert, null);
  assert.equal(EAG_FOERDERBEITRAG_AT.status, "zu_pruefen");
  assert.match(EAG_FOERDERBEITRAG_AT.quelle.url, /^https:\/\/www\.ris\.bka\.gv\.at\//);
});

test("atEingaben: Standardwerte, Klammerung und unbekannte Netzebene", () => {
  assert.deepEqual(atEingaben(), STANDARD_AT);
  assert.deepEqual(atEingaben({ netzebene: "quatsch", verbrauchKwh: "abc", leistungKw: NaN }), STANDARD_AT);
  const e = atEingaben({ netzebene: "ne5", verbrauchKwh: -5, leistungKw: 9e9 });
  assert.equal(e.netzebene, "ne5");
  assert.equal(e.verbrauchKwh, 0);
  assert.equal(e.leistungKw, 500000);
});

test("Benutzungsstunden: Verbrauch/Leistung, null ohne Leistung", () => {
  assert.equal(benutzungsstunden(250000, 100), 2500);
  assert.equal(benutzungsstunden(250000, 0), null);
  assert.equal(benutzungsstunden(0, 100), null);
});

test("atCheck: plausibel bis 8760 h, unplausibel darüber, null ohne Leistung", () => {
  const ok = atCheck({ netzebene: "ne5", verbrauchKwh: 500000, leistungKw: 120 });
  assert.equal(ok.ebene.id, "ne5");
  assert.ok(ok.benutzungsstunden > 0 && ok.benutzungsstunden <= STUNDEN_JAHR);
  assert.equal(ok.plausibel, true);

  const zuViel = atCheck({ netzebene: "ne7", verbrauchKwh: 1000000, leistungKw: 10 });
  assert.equal(zuViel.plausibel, false);

  const offen = atCheck({ netzebene: "ne7", verbrauchKwh: 100000, leistungKw: 0 });
  assert.equal(offen.benutzungsstunden, null);
  assert.equal(offen.plausibel, null);
});

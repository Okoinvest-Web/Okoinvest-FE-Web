// Welle 2, Paket GRP – herkunftBereinigen(), offenlegungDaten(), kanalAuswertung() (src/lib/gruppe/kanal.js)
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { herkunftBereinigen, kanalAuswertung, KANAELE, offenlegungDaten } from "./kanal.js";
import { kennungFinden, PARTNER_REGISTER } from "./partner-register.js";

const DEV = { produktion: false };
const PROD = { produktion: true };
const AKTIV = [
  { kennung: "test-gruppe-de", art: "gruppe", land: "DE", status: "aktiv", name: "Testgruppe", ziele: ["start"] },
  { kennung: "test-partner-at", art: "stadtwerk", land: "AT", status: "aktiv", name: "Testpartner", ziele: ["start", "kommunen"] },
  { kennung: "test-entwurf-de", art: "installateur", land: "DE", status: "entwurf", name: "Entwurf", ziele: ["start"] },
];

describe("herkunftBereinigen()", () => {
  test("bekannte Kennung (Entwicklung) → Kanal und Kennung", () => {
    assert.deepEqual(herkunftBereinigen({ utm_source: "beispiel-installateur-de", utm_medium: "partner" }, DEV), { kanal: "Partner", partnerKennung: "beispiel-installateur-de" });
    assert.deepEqual(herkunftBereinigen({ utm_source: "beispiel-gruppe-de", utm_medium: "gruppe" }, DEV), { kanal: "Gruppe", partnerKennung: "beispiel-gruppe-de" });
  });
  test("Produktionsmodus: Entwurfs-Kennungen werden verworfen", () => {
    assert.deepEqual(herkunftBereinigen({ utm_source: "beispiel-installateur-de", utm_medium: "partner" }, PROD), { kanal: "Kampagne", partnerKennung: null });
    assert.deepEqual(herkunftBereinigen({ utm_source: "test-entwurf-de", utm_medium: "partner" }, { ...PROD, register: AKTIV }), { kanal: "Kampagne", partnerKennung: null });
    // alle mitgelieferten Register-Einträge sind Entwürfe → in Produktion greift keiner
    for (const e of PARTNER_REGISTER) assert.equal(kennungFinden(e.kennung, PROD), null, e.kennung);
  });
  test("Produktionsmodus: aktive Kennung greift", () => {
    assert.deepEqual(herkunftBereinigen({ utm_source: "test-partner-at", utm_medium: "partner" }, { ...PROD, register: AKTIV }), { kanal: "Partner", partnerKennung: "test-partner-at" });
  });
  test("unbekannte Kennung → verworfen", () => {
    assert.deepEqual(herkunftBereinigen({ utm_source: "gibt-es-nicht", utm_medium: "partner" }, DEV), { kanal: "Kampagne", partnerKennung: null });
    assert.deepEqual(herkunftBereinigen({ utm_source: "<script>", utm_medium: "gruppe" }, DEV), { kanal: "Kampagne", partnerKennung: null });
    assert.deepEqual(herkunftBereinigen({ utm_medium: "partner" }, DEV), { kanal: "Kampagne", partnerKennung: null });
  });
  test("Art muss zum Kanal passen (Partner-Kennung mit medium=gruppe zählt nicht)", () => {
    assert.deepEqual(herkunftBereinigen({ utm_source: "test-partner-at", utm_medium: "gruppe" }, { ...PROD, register: AKTIV }), { kanal: "Kampagne", partnerKennung: null });
  });
  test("echter Gruppen-Referrer ohne Kennung bleibt Gruppe", () => {
    assert.deepEqual(herkunftBereinigen({ referrer: "oekovolt.de" }, PROD), { kanal: "Gruppe", partnerKennung: null });
    assert.deepEqual(herkunftBereinigen({ referrer: "oekovolt.com", utm_medium: "partner", utm_source: "unbekannt" }, PROD), { kanal: "Gruppe", partnerKennung: null });
  });
  test("Browser-Kanal wird ignoriert, Server rechnet neu", () => {
    assert.deepEqual(herkunftBereinigen({ kanal: "Partner", referrer: "google.de" }, DEV), { kanal: "Suchmaschine", partnerKennung: null });
    assert.deepEqual(herkunftBereinigen(null), { kanal: "Direkt", partnerKennung: null });
    assert.deepEqual(herkunftBereinigen(["x"]), { kanal: "Direkt", partnerKennung: null });
  });
  test("KI-Assistent hat Vorrang", () => {
    assert.deepEqual(herkunftBereinigen({ utm_source: "chatgpt.com", utm_medium: "partner" }, DEV), { kanal: "KI-Assistent", partnerKennung: null });
  });
  test("alle Ergebnis-Kanäle stehen in KANAELE", () => {
    for (const h of [{}, { referrer: "oekovolt.de" }, { utm_medium: "partner" }, { referrer: "bing.com" }, { utm_medium: "cpc" }]) {
      assert.ok(KANAELE.includes(herkunftBereinigen(h, DEV).kanal));
    }
  });
});

describe("offenlegungDaten()", () => {
  test("nur bei Gruppe/Partner", () => {
    assert.equal(offenlegungDaten({ referrer: "google.de" }, DEV), null);
    assert.equal(offenlegungDaten({}, DEV), null);
  });
  test("Partner mit Name aus dem Register", () => {
    const d = offenlegungDaten({ utm_source: "test-partner-at", utm_medium: "partner" }, { ...PROD, register: AKTIV });
    assert.equal(d.kanal, "Partner");
    assert.equal(d.name, "Testpartner");
    assert.equal(d.land, "AT");
  });
  test("Gruppen-Referrer ohne Kennung → allgemeiner Gruppen-Hinweis", () => {
    assert.deepEqual(offenlegungDaten({ referrer: "oekovolt.de" }, PROD), { kanal: "Gruppe", kennung: null, art: null, land: null, name: null, text: null });
  });
});

describe("kanalAuswertung()", () => {
  const opt = { ...PROD, register: AKTIV };
  const vorgaenge = [
    { status: "neu", land: "DE", herkunft: { kanal: "Gruppe", partnerKennung: "test-gruppe-de" }, kontakt: { email: "a@example.com" } },
    { status: "abgeschlossen", land: "AT", herkunft: { utm_source: "test-partner-at", utm_medium: "partner" } },
    { status: "neu", land: "", herkunft: { referrer: "oekovolt.com" } },
    { status: "neu", land: "CH", herkunft: { referrer: "google.ch" } },
    { status: "neu", land: "DE", herkunft: { utm_source: "erfunden", utm_medium: "partner" } },
    null,
  ];
  const a = kanalAuswertung(vorgaenge, opt);
  test("zählt je Kanal und Land", () => {
    assert.equal(a.gesamt, 5);
    const [g, p] = a.kanaele;
    assert.equal(g.anfragen, 2);
    assert.deepEqual(g.laender, { DE: 1, AT: 0, CH: 0, "–": 1 });
    assert.equal(p.anfragen, 1);
    assert.equal(p.abgeschlossen, 1);
    assert.deepEqual(p.laender, { DE: 0, AT: 1, CH: 0, "–": 0 });
  });
  test("je Kennung mit Registerstatus", () => {
    const k = Object.fromEntries(a.kennungen.map((x) => [x.kennung || `ohne:${x.kanal}`, x]));
    assert.equal(k["test-gruppe-de"].registerStatus, "aktiv");
    assert.equal(k["test-partner-at"].registerLand, "AT");
    assert.equal(k["ohne:Gruppe"].anfragen, 1);
    assert.equal(k.erfunden, undefined);
  });
  test("keine Personendaten in der Ausgabe", () => {
    const s = JSON.stringify(a);
    assert.ok(!s.includes("@"), s);
    assert.ok(!s.includes("example.com"));
  });
});

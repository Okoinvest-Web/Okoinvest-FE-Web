// Welle 2, Paket GRP – Kanäle „Gruppe“ und „Partner“ in src/lib/herkunft.js (kanal, herkunftErfassen)
//   npm test  bzw.  node --import ./test/hilfen/registrieren.mjs --test src/lib/gruppe/herkunft.test.mjs
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { herkunft, herkunftErfassen, kanal, _zuruecksetzen } from "../herkunft.js";

describe("kanal(): Gruppe und Partner", () => {
  test("Referrer oekovolt.de / oekovolt.com → Gruppe", () => {
    assert.equal(kanal({ referrer: "oekovolt.de" }), "Gruppe");
    assert.equal(kanal({ referrer: "oekovolt.com" }), "Gruppe");
    assert.equal(kanal({ referrer: "shop.oekovolt.de" }), "Gruppe");
    assert.equal(kanal({ referrer: "OEKOVOLT.COM" }), "Gruppe");
  });
  test("ähnliche Fremddomains sind KEINE Gruppe", () => {
    assert.equal(kanal({ referrer: "fake-oekovolt.de" }), "Verweis");
    assert.equal(kanal({ referrer: "oekovolt.de.evil.com" }), "Verweis");
    assert.equal(kanal({ referrer: "oekovolt.at" }), "Verweis");
  });
  test("utm_medium=gruppe|partner", () => {
    assert.equal(kanal({ utm_source: "beispiel-gruppe-de", utm_medium: "gruppe" }), "Gruppe");
    assert.equal(kanal({ utm_source: "beispiel-installateur-de", utm_medium: "partner" }), "Partner");
    assert.equal(kanal({ utm_source: "x", utm_medium: "Partner" }), "Partner");
    // ausdrückliches Medium vor Gruppen-Referrer
    assert.equal(kanal({ utm_medium: "partner", referrer: "oekovolt.de" }), "Partner");
  });
  test("Reihenfolge: KI-Assistent vor Gruppe/Partner vor Anzeige vor Kampagne", () => {
    assert.equal(kanal({ utm_source: "chatgpt.com", utm_medium: "partner" }), "KI-Assistent");
    assert.equal(kanal({ referrer: "perplexity.ai", utm_medium: "gruppe" }), "KI-Assistent");
    assert.equal(kanal({ referrer: "oekovolt.de", klick_id_typ: "gclid" }), "Gruppe");
    assert.equal(kanal({ utm_medium: "partner", utm_campaign: "herbst" }), "Partner");
    assert.equal(kanal({ utm_source: "oekovolt.de", utm_medium: "newsletter" }), "E-Mail");
    assert.equal(kanal({ utm_source: "irgendwas", utm_medium: "kooperation" }), "Kampagne");
  });
  test("bestehende Kanäle unverändert", () => {
    assert.equal(kanal({ referrer: "google.de" }), "Suchmaschine");
    assert.equal(kanal({ utm_source: "google", utm_medium: "cpc" }), "Anzeige");
    assert.equal(kanal({ utm_source: "newsletter", utm_medium: "email" }), "E-Mail");
    assert.equal(kanal({ referrer: "linkedin.com" }), "Social Media");
    assert.equal(kanal({ referrer: "example.org" }), "Verweis");
    assert.equal(kanal({}), "Direkt");
  });
});

describe("herkunftErfassen(): Gruppen-Verweis nur im Arbeitsspeicher", () => {
  beforeEach(() => _zuruecksetzen());
  test("Referrer der Gruppe bleibt erhalten, Kanal Gruppe", () => {
    herkunftErfassen({ href: "https://www.oekoinvest.com/flaeche-verpachten", referrer: "https://www.oekovolt.de/projekte" });
    const h = herkunft({ href: "https://www.oekoinvest.com/kontakt" });
    assert.equal(h.referrer, "oekovolt.de");
    assert.equal(h.kanal, "Gruppe");
  });
  test("Kurzlink-Parameter → Partner mit Kennung als utm_source", () => {
    herkunftErfassen({ href: "https://www.oekoinvest.com/dachflaeche-verpachten?utm_source=beispiel-installateur-de&utm_medium=partner", referrer: "" });
    const h = herkunft({ href: "https://www.oekoinvest.com/dachflaeche-verpachten" });
    assert.equal(h.kanal, "Partner");
    assert.equal(h.utm_source, "beispiel-installateur-de");
  });
  test("kein Cookie und kein Browserspeicher", () => {
    const vorher = { document: globalThis.document, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
    let geschrieben = false;
    const doc = {};
    Object.defineProperty(doc, "cookie", {
      configurable: true,
      get: () => "",
      set: () => {
        geschrieben = true;
      },
    });
    const speicher = {
      getItem: () => null,
      setItem: () => {
        geschrieben = true;
      },
    };
    globalThis.document = doc;
    globalThis.localStorage = speicher;
    globalThis.sessionStorage = speicher;
    try {
      herkunftErfassen({ href: "https://www.oekoinvest.com/?utm_source=beispiel-gruppe-de&utm_medium=gruppe", referrer: "https://oekovolt.com/" });
      assert.equal(herkunft({ href: "https://www.oekoinvest.com/kontakt" }).kanal, "Gruppe");
      assert.equal(geschrieben, false);
    } finally {
      Object.assign(globalThis, vorher);
    }
  });
});

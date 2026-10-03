// Tests Paket B (Datenschutz & Messung) – ausführen mit:
//   node --import ./src/lib/ereignis/tests/registrieren.mjs --test src/lib/ereignis/tests/
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { sha256Hex } from "../sha256.js";
import { EINWILLIGUNG_VERSION, einwilligungErstellen, einwilligungLesen, statistikErlaubt } from "../einwilligung.js";
import { oeffentlicherPfad, pfadBereinigen, codeHash } from "../pfade.js";
import { ereignis, parameterBereinigen } from "../senden.js";
import { herkunft, herkunftErfassen, kanal, klickIds, _zuruecksetzen } from "../../herkunft.js";

const cookieMit = (wert) => `foo=1; cookieConsent=${encodeURIComponent(JSON.stringify(wert))}; bar=2`;

describe("sha256", () => {
  test("stimmt mit node:crypto überein", () => {
    for (const t of ["", "abc", "ÄÖÜ ß €", "x".repeat(55), "y".repeat(56), "z".repeat(64), "q".repeat(1000)]) {
      assert.equal(sha256Hex(t), createHash("sha256").update(t, "utf8").digest("hex"), `Text der Länge ${t.length}`);
    }
  });
});

describe("Einwilligung", () => {
  test("ohne Cookie, mit altem Cookie (ohne Fassung) und mit fremder Fassung: keine Einwilligung", () => {
    assert.equal(einwilligungLesen(""), null);
    assert.equal(einwilligungLesen(cookieMit({ essential: true, googleAnalytics: true, statistics: true })), null);
    assert.equal(einwilligungLesen(cookieMit({ v: "alt", googleAnalytics: true, statistics: true })), null);
    assert.equal(statistikErlaubt(cookieMit({ essential: true, googleAnalytics: true, statistics: true })), false);
    assert.equal(einwilligungLesen("cookieConsent=%7Bkaputt"), null);
  });
  test("neue Einwilligung enthält Fassung und Zeitstempel", () => {
    const e = einwilligungErstellen({ statistics: true }, new Date("2026-10-03T10:00:00Z"));
    assert.equal(e.v, EINWILLIGUNG_VERSION);
    assert.equal(e.zeit, "2026-10-03T10:00:00.000Z");
    assert.equal(statistikErlaubt(cookieMit(e)), true);
  });
  test("Ablehnen = keine Statistik; nur ausdrückliches true zählt", () => {
    assert.equal(statistikErlaubt(cookieMit(einwilligungErstellen({}))), false);
    assert.equal(statistikErlaubt(cookieMit(einwilligungErstellen({ statistics: "true" }))), false);
    assert.equal(statistikErlaubt(cookieMit({ v: EINWILLIGUNG_VERSION, statistics: true, googleAnalytics: false })), false);
  });
});

describe("Positivliste", () => {
  test("öffentliche Seiten werden gemessen", () => {
    for (const p of ["/", "/kontakt", "/rechner/pacht", "/projektboerse/solarpark-x", "/en/contact", "/ratgeber/abc"]) assert.equal(oeffentlicherPfad(p), true, p);
  });
  test("Token-, Portal- und Anmeldeseiten nie", () => {
    for (const p of [
      "/einladung/abc123token",
      "/einladung/bank/xyz",
      "/einladung/gutachter/xyz",
      "/einladung/lieferant/xyz",
      "/portal",
      "/portal/admin/crm/K-1",
      "/login",
      "/login/link",
      "/login/link/abc",
      "/angebot/CODE123",
      "/angebot",
      "/scan/abc",
      "/fortsetzen/abc",
      "/tv",
      "/api/anfrage",
      "/design",
      "/passwort-vergessen",
      "/kontakt/%2e%2e/portal",
      "/unbekannt",
    ])
      assert.equal(oeffentlicherPfad(p), false, p);
  });
});

describe("Pfad-Bereinigung (Herkunft im CRM)", () => {
  test("Codes gehasht, Tokens entfernt", () => {
    assert.equal(pfadBereinigen("/angebot/GEHEIM42"), `/angebot/h-${codeHash("GEHEIM42")}`);
    assert.ok(!pfadBereinigen("/angebot/GEHEIM42").includes("GEHEIM42"));
    assert.equal(codeHash("GEHEIM42"), createHash("sha256").update("GEHEIM42").digest("hex").slice(0, 16));
    assert.equal(pfadBereinigen("/einladung/bank/tok-123"), "/einladung");
    assert.equal(pfadBereinigen("/login/link/tok"), "/login/link");
    assert.equal(pfadBereinigen("/portal/admin/kyc/F-1"), "/portal");
    assert.equal(pfadBereinigen("/scan/abc"), "/scan");
    assert.equal(pfadBereinigen("/kontakt?email=a@b.de#x"), "/kontakt");
    assert.equal(pfadBereinigen("/<script>"), "/");
  });
});

describe("Herkunft", () => {
  beforeEach(() => _zuruecksetzen());
  test("Klick-IDs nur im Arbeitsspeicher, mit der Anfrage nur der Typ", () => {
    herkunftErfassen({ href: "https://www.oekoinvest.com/agri-pv?gclid=ABC-geheim-123&utm_source=google&utm_medium=cpc", referrer: "https://www.google.com/" });
    const h = herkunft({ href: "https://www.oekoinvest.com/kontakt" });
    assert.equal(h.klick_id_typ, "gclid");
    assert.ok(!JSON.stringify(h).includes("ABC-geheim-123"));
    assert.equal(h.kanal, "Anzeige");
    assert.deepEqual(klickIds(), { gclid: "ABC-geheim-123" });
  });
  test("Einstieg über Angebots-Code: nur Hash", () => {
    herkunftErfassen({ href: "https://www.oekoinvest.com/angebot/PERS0NLICH", referrer: "" });
    const h = herkunft({ href: "https://www.oekoinvest.com/einladung/tok123" });
    assert.equal(h.einstieg, `/angebot/h-${codeHash("PERS0NLICH")}`);
    assert.equal(h.seite, "/einladung");
    assert.ok(!JSON.stringify(h).includes("PERS0NLICH") && !JSON.stringify(h).includes("tok123"));
  });
  test("KI-Herkunft vor Suchmaschine und Kampagne", () => {
    assert.equal(kanal({ referrer: "gemini.google.com" }), "KI-Assistent");
    assert.equal(kanal({ referrer: "copilot.microsoft.com" }), "KI-Assistent");
    assert.equal(kanal({ referrer: "chatgpt.com" }), "KI-Assistent");
    assert.equal(kanal({ utm_source: "chatgpt.com" }), "KI-Assistent");
    assert.equal(kanal({ referrer: "perplexity.ai" }), "KI-Assistent");
    assert.equal(kanal({ referrer: "google.de" }), "Suchmaschine");
    assert.equal(kanal({ referrer: "bing.com" }), "Suchmaschine");
    assert.equal(kanal({ utm_source: "newsletter", utm_medium: "email" }), "E-Mail");
    assert.equal(kanal({}), "Direkt");
  });
});

describe("ereignis() feuert nur mit Einwilligung", () => {
  let gesendet;
  const vorher = { window: globalThis.window, document: globalThis.document };
  beforeEach(() => {
    gesendet = [];
    globalThis.document = { cookie: "" };
    globalThis.window = { location: { pathname: "/kontakt" }, ovMessungAktiv: true, gtag: (...a) => gesendet.push(a) };
  });
  afterEach(() => {
    globalThis.window = vorher.window;
    globalThis.document = vorher.document;
  });

  test("ohne Einwilligung: nichts", () => {
    assert.equal(ereignis("generate_lead", { lead_typ: "flaeche" }), false);
    assert.equal(gesendet.length, 0);
  });
  test("nach Ablehnen: nichts", () => {
    globalThis.document.cookie = cookieMit(einwilligungErstellen({}));
    assert.equal(ereignis("generate_lead", { lead_typ: "flaeche" }), false);
    assert.equal(gesendet.length, 0);
  });
  test("alte Einwilligung ohne Fassung: nichts", () => {
    globalThis.document.cookie = cookieMit({ essential: true, statistics: true, googleAnalytics: true });
    assert.equal(ereignis("generate_lead", {}), false);
    assert.equal(gesendet.length, 0);
  });
  test("mit Einwilligung auf öffentlicher Seite: gesendet, Parameter bereinigt", () => {
    globalThis.document.cookie = cookieMit(einwilligungErstellen({ statistics: true }));
    assert.equal(ereignis("generate_lead", { lead_typ: "flaeche", markt: "AT", email: "a@b.de", quelle_formular: "max@muster.at", rolle: "+43 664 1234567" }), true);
    assert.deepEqual(gesendet, [["event", "generate_lead", { lead_typ: "flaeche", markt: "AT" }]]);
  });
  test("mit Einwilligung, aber nicht öffentliche Seite oder GA nicht aktiv: nichts", () => {
    globalThis.document.cookie = cookieMit(einwilligungErstellen({ statistics: true }));
    globalThis.window.location.pathname = "/einladung/tok";
    assert.equal(ereignis("generate_lead", {}), false);
    globalThis.window.location.pathname = "/kontakt";
    globalThis.window.ovMessungAktiv = false;
    assert.equal(ereignis("generate_lead", {}), false);
    assert.equal(gesendet.length, 0);
  });
  test("unbekannter Ereignisname: nichts", () => {
    globalThis.document.cookie = cookieMit(einwilligungErstellen({ statistics: true }));
    assert.equal(ereignis("beliebig", {}), false);
    assert.equal(gesendet.length, 0);
  });
  test("Parameter-Filter verwirft PII-artige Werte", () => {
    assert.deepEqual(parameterBereinigen({ markt: "DE", schritt: 2, art: "https://x.de/?t=1", datei_typ: "IBAN DE89370400440532013000", wert_klasse: "5-20 ha" }), {
      markt: "DE",
      schritt: 2,
      wert_klasse: "5-20 ha",
    });
  });
});

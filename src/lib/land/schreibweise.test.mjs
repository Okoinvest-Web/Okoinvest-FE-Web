// Schweizer Schreibweise ohne „ß“ (W3-0): zentraler Helfer und Einbindung in uebersetze()/inhaltFuer()
import test from "node:test";
import assert from "node:assert/strict";
import { ohneEszett, schreibweiseFuer, schweizerSchreibweise } from "./schreibweise.js";
import { inhaltFuer } from "./inhalte.js";
import { inhaltFuerSprache, setzeLandQuelle, uebersetze } from "../sprache/woerterbuch.js";

test("ohneEszett: ß → ss, ẞ → SS, sonst unverändert", () => {
  assert.equal(ohneEszett("Großspeicher an der Straße"), "Grossspeicher an der Strasse");
  assert.equal(ohneEszett("GROẞ"), "GROSS");
  assert.equal(ohneEszett("Fläche"), "Fläche");
  assert.equal(ohneEszett(42), 42);
  assert.equal(ohneEszett(null), null);
});

test("schweizerSchreibweise: tief, technische Felder und Nicht-Texte bleiben", () => {
  const icon = () => null;
  const element = { $$typeof: Symbol.for("react.transitional.element"), props: { children: "Größe" } };
  const datum = new Date(0);
  const ein = { titel: "Großspeicher", href: "/rechner/großspeicher", icon, liste: [{ name: "Maßnahme", id: "maß" }, "Fuß"], el: element, datum, zahl: 3 };
  const aus = schweizerSchreibweise(ein);
  assert.equal(aus.titel, "Grossspeicher");
  assert.equal(aus.href, "/rechner/großspeicher");
  assert.equal(aus.icon, icon, "technisches Feld");
  assert.deepEqual(aus.liste, [{ name: "Massnahme", id: "maß" }, "Fuss"]);
  assert.equal(aus.el, element);
  assert.equal(aus.datum, datum);
  assert.equal(aus.zahl, 3);
  assert.equal(ein.titel, "Großspeicher", "Eingabe bleibt unverändert");
  const ohne = { a: "Fläche", b: ["x"] };
  assert.equal(schweizerSchreibweise(ohne), ohne, "ohne ß dieselbe Referenz");
});

test("schweizerSchreibweise: Textfunktionen umschreiben, Komponenten nicht; stabile Hülle", () => {
  const lead = (n) => `${n} Maße`;
  function Karte() {
    return "Größe";
  }
  const a = schweizerSchreibweise({ lead, Karte });
  assert.equal(a.lead(2), "2 Masse");
  assert.equal(a.Karte, Karte);
  assert.equal(schweizerSchreibweise({ lead }).lead, a.lead, "gleiche Hülle je Funktion");
  assert.deepEqual(schweizerSchreibweise({ f: () => [{ x: "Fuß" }] }).f(), [{ x: "Fuss" }]);
});

test("schreibweiseFuer: nur Schweiz", () => {
  assert.equal(schreibweiseFuer("Größe", "CH"), "Grösse");
  assert.equal(schreibweiseFuer("Größe", "ch"), "Grösse");
  for (const l of ["DE", "AT", null, undefined, "xx"]) assert.equal(schreibweiseFuer("Größe", l), "Größe");
});

test("inhaltFuer und uebersetze: Schweiz ohne ß, andere Länder unverändert", () => {
  const INHALT = { gemeinsam: { titel: "Großspeicher", lead: "Maß" }, AT: { lead: "Ausmaß" } };
  assert.deepEqual(inhaltFuer(INHALT, "CH"), { titel: "Grossspeicher", lead: "Mass" });
  assert.deepEqual(inhaltFuer(INHALT, "AT"), { titel: "Großspeicher", lead: "Ausmaß" });
  assert.deepEqual(inhaltFuer(INHALT, null), { titel: "Großspeicher", lead: "Maß" });

  const TEXTE = { de: { t: "Schließen", liste: ["Größe"] }, en: { t: "Close" } };
  assert.deepEqual(uebersetze(TEXTE, "de", "CH"), { t: "Schliessen", liste: ["Grösse"] });
  assert.deepEqual(uebersetze(TEXTE, "en", "CH"), { t: "Close", liste: ["Grösse"] });
  assert.deepEqual(uebersetze(TEXTE, "de", "AT"), { t: "Schließen", liste: ["Größe"] });
  assert.deepEqual(uebersetze(TEXTE, "de"), { t: "Schließen", liste: ["Größe"] });

  assert.deepEqual(inhaltFuerSprache({ de: { gemeinsam: { a: "Straße" } } }, "CH", "de"), { a: "Strasse" });
});

test("uebersetze ohne Land: Land der Server-Anfrage (setzeLandQuelle)", () => {
  const TEXTE = { de: { t: "Größe" } };
  try {
    setzeLandQuelle(() => "CH");
    assert.equal(uebersetze(TEXTE, "de").t, "Grösse");
    assert.equal(uebersetze(TEXTE, "de", "DE").t, "Größe", "ausdrückliches Land hat Vorrang");
    setzeLandQuelle(() => {
      throw new Error("außerhalb einer Anfrage");
    });
    assert.equal(uebersetze(TEXTE, "de").t, "Größe");
  } finally {
    setzeLandQuelle(null);
  }
  assert.equal(uebersetze(TEXTE, "de").t, "Größe");
});

test("JSON-LD (QM Welle 3): Texte in der Schweiz ohne „ß“, Adressen und andere Länder unverändert", async () => {
  const { jsonLdFuer, landDerAusgabe, setzeAusgabeLand } = await import("./schreibweise.js");
  const daten = { "@type": "FAQPage", name: "Großspeicher", url: "https://example.org/straße", item: "/maße", liste: [{ text: "Fläche größer", zahl: 3 }] };
  assert.equal(jsonLdFuer(daten, "DE"), daten);
  assert.equal(jsonLdFuer(daten, null), daten);
  assert.deepEqual(jsonLdFuer(daten, "CH"), { "@type": "FAQPage", name: "Grossspeicher", url: "https://example.org/straße", item: "/maße", liste: [{ text: "Fläche grösser", zahl: 3 }] });
  assert.equal(landDerAusgabe(), null);
  setzeAusgabeLand(() => "CH");
  assert.equal(landDerAusgabe(), "CH");
  setzeAusgabeLand(() => {
    throw new Error("außerhalb einer Anfrage");
  });
  assert.equal(landDerAusgabe(), null);
  setzeAusgabeLand(null);
});

// test/qa/claim-lint.test.mjs – Regeln des Claim-Lints (Treffer und Nicht-Treffer)

import test from "node:test";
import assert from "node:assert/strict";
import { globZuRegex, pruefeText, sammleDateien } from "../../qa/claim-lint.mjs";
import { PAKETE } from "../../qa/claim-lint/regeln.mjs";

const regeln = (text, datei = "src/app/x/page.js") => pruefeText(datei, text).map((f) => `${f.regel}:${f.stufe}`);

test("Reizwörter werden gefunden", () => {
  assert.deepEqual(regeln("Wir garantieren Ihnen 3.000 €"), ["garantiert:fehler"]);
  assert.deepEqual(regeln('<p>Immer der günstigste Tarif</p>'), ["immer-guenstigste:fehler", "superlativ:hinweis"]);
  assert.deepEqual(regeln("Die Pioniere der Agri-PV"), ["pionier:fehler"]);
  assert.deepEqual(regeln("Nur geprüfte Projekte"), ["geprueft:fehler"]);
  assert.deepEqual(regeln("aktiv in 3 Ländern"), ["drei-laender:fehler"]);
  assert.deepEqual(regeln('tag: "Beliebt" }'), ["beliebt:fehler"]);
  assert.deepEqual(regeln("Die meistgelesenen Ratgeber"), ["beliebt:fehler"]);
  assert.deepEqual(regeln("klimaneutral erzeugt"), ["umwelt-generisch:fehler"]);
  assert.deepEqual(regeln('"@type": "Offer",'), ["jsonld-offer:fehler"]);
  assert.deepEqual(regeln('availability: "https://schema.org/InStock"'), ["jsonld-offer:fehler"]);
  assert.deepEqual(regeln("Daten alle 5 Minuten aktualisiert"), ["energie-live-takt:fehler"]);
  assert.deepEqual(regeln("Wir sind die Nr. 1 in Bayern"), ["marktfuehrer:fehler"]);
});

test("Gesetzeszitate und Eingabe-Platzhalter sind kein Fund", () => {
  assert.deepEqual(regeln("§ 15 Abs. 3 Nr. 1 EStG"), []);
  assert.deepEqual(regeln('["Sonstige bauliche Anlagen", "Nr. 1", "z. B. Deponien"]'), []);
  assert.deepEqual(regeln('<input placeholder="z. B. Musterstadt" />'), []);
  assert.deepEqual(regeln('{ name: "region", platzhalter: "z. B. Unterallgäu" }'), []);
  assert.deepEqual(regeln("Herkunftsnachweise bestehen"), []);
});

test("Kommentare: Reizwörter ignoriert, TODO nur als Hinweis", () => {
  assert.deepEqual(regeln("// nicht „garantiert“ schreiben"), []);
  assert.deepEqual(regeln("// TODO Telefonnummer nach Freigabe"), ["todo:hinweis"]);
  assert.deepEqual(regeln('telefon: "TODO"'), ["todo:fehler"]);
});

test("Platzhalter und null-Kontakt", () => {
  assert.deepEqual(regeln("Anschrift: [Anschrift einsetzen]"), ["platzhalter-wort:fehler"]);
  assert.deepEqual(regeln("  telefon: null,"), ["null-kontakt:fehler"]);
  assert.deepEqual(regeln("href={`mailto:${null}`}"), ["null-kontakt:fehler"]);
  assert.deepEqual(regeln("const ENTWURF = true;"), ["entwurf-flag:fehler"]);
});

test("Testdaten", () => {
  assert.deepEqual(regeln('titel: "Freifläche Thurgau (Demo)"'), ["testdaten:fehler"]);
  assert.deepEqual(regeln("Max Mustermann"), ["testdaten:fehler"]);
});

test("Ausnahme mit Begründung (claim-ok)", () => {
  assert.deepEqual(regeln("// claim-ok: EEG-Vergütung ist gesetzlich festgelegt (§ 19 EEG)\nDer Zuschlag ist 20 Jahre garantiert"), []);
  assert.deepEqual(regeln("garantiert // claim-ok: ok"), ["garantiert:fehler"], "Begründung zu kurz → zählt nicht");
});

test("ß in CH-Texten", () => {
  assert.deepEqual(regeln("text: \"Grösse und Strasse\"", "src/data/regionen/schweiz.js"), []);
  assert.deepEqual(regeln("text: \"Größe\"", "src/data/regionen/schweiz.js"), ["ch-eszett:fehler"]);
  assert.deepEqual(regeln("{ land: \"CH\", text: \"Straße\" }", "src/data/x.js"), ["ch-eszett:fehler"]);
  assert.deepEqual(regeln("{ land: \"DE\", text: \"Straße\" }", "src/data/x.js"), []);
});

test("Glob und Paket-Listen", () => {
  assert.ok(globZuRegex("src/app/projektboerse/[slug]/**").test("src/app/projektboerse/[slug]/page.js"));
  assert.ok(!globZuRegex("src/app/projektboerse/page.js").test("src/app/projektboerse/karte/page.js"));
  assert.ok(globZuRegex("src/components/Home/**").test("src/components/Home/Hero/Bild.js"));
  const d = sammleDateien(PAKETE.D);
  assert.ok(d.includes("src/data/unternehmen.js") && d.includes("src/app/(stamm)/impressum/page.js"), "Paket D unvollständig");
  assert.ok(d.every((p) => !p.startsWith("src/app/portal/") && !p.startsWith("src/app/(stamm)/portal/")));
});

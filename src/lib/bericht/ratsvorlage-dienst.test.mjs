// Welle 3, Paket B8: Ratsvorlage über die Lead-Kette – Anfordern → Double-Opt-in → Vorgang „kommune“ mit Gemeinde und
// Bundesland (Routing je Land) → Vorlage lesbar. Läuft gegen eine WEGWERF-Demo-Datei im Temp-Ordner; keine Mail geht raus.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/ratsvorlage-dienst.test.mjs

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-b8-"));
let demo;
let demoBericht;
let kette;
let dienst;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  delete process.env.PLATTFORM_BACKEND; // Demo
  demo = await import("../plattform/backend/demo.js");
  demoBericht = await import("../plattform/backend/demo/bericht.js");
  kette = await import("../plattform/backend/demo/leadkette.js");
  dienst = await import("./dienst.js");
});
after(() => {
  process.chdir(START);
  try {
    rmSync(ORDNER, { recursive: true, force: true });
  } catch {
    /* Windows: Datei evtl. noch gesperrt */
  }
});

const db = () => {
  try {
    return JSON.parse(readFileSync(path.join(ORDNER, ".data", "plattform.json"), "utf8"));
  } catch {
    return {};
  }
};
const deps = () => ({ bericht: demoBericht, anfrage: demo, kette, versandErlaubt: () => true, jetzt: () => new Date() });
const mail = () => `b8-${Math.random().toString(36).slice(2)}@example.com`;

async function durchlauf(land, eingaben) {
  const email = mail();
  const r = await dienst.berichtAnfordern(
    { body: { rechner: "ratsvorlage", land, eingaben, kontakt: { vorname: "Rita", nachname: "Ratsmitglied", email } }, basisUrl: "http://localhost:3100" },
    deps()
  );
  assert.equal(r.ok, true);
  const token = db().postausgang.find((x) => x.an === email && x.art === "bericht_doi")?.link?.split("/bericht/")[1];
  assert.ok(token, "Bestätigungslink im Demo-Postausgang");
  assert.equal((await dienst.berichtLesen({ token }, deps())).zustand, "offen", "vor dem Double-Opt-in keine Vorlage");
  await dienst.berichtBestaetigen({ token }, deps());
  const vg = db().vorgaenge.at(-1);
  const lesen = await dienst.berichtLesen({ token }, deps());
  return { vg, lesen, email };
}

test("DE: Vorgang „kommune“ mit Gemeinde und Bundesland, Vorlage nach Bestätigung lesbar, ohne Personendaten", async () => {
  await demoBericht.berichtAufraeumen(); // Demo-Datei anlegen
  const { vg, lesen, email } = await durchlauf("DE", { gemeinde: "Musterhausen", bundesland: "brandenburg", mwp: 20 });
  assert.equal(vg.typ, "kommune");
  assert.equal(vg.kontakt.land, "DE");
  assert.equal(vg.daten.gemeinde, "Musterhausen");
  assert.equal(vg.daten.bundesland, "Brandenburg", "Bundesland als Name für das Routing je Gebiet");
  assert.equal(vg.daten.quelle, "bericht_ratsvorlage");
  assert.equal(lesen.zustand, "bestaetigt");
  assert.equal(lesen.bericht.rechner, "ratsvorlage");
  assert.equal(lesen.bericht.ergebnis.vorlage.gemeinde, "Musterhausen");
  assert.ok(!JSON.stringify(lesen.bericht).includes(email), "Vorlage ohne E-Mail-Adresse");
  assert.ok(!/Ratsmitglied/.test(JSON.stringify(lesen.bericht)), "Vorlage ohne Namen");
});

test("AT: Vorgang mit Land AT (Routing je Land), Vorlage ohne Geldwerte", async () => {
  const { vg, lesen } = await durchlauf("AT", { gemeinde: "St. Pantaleon", bundesland: "oberoesterreich" });
  assert.equal(vg.typ, "kommune");
  assert.equal(vg.kontakt.land, "AT");
  assert.equal(vg.daten.gemeinde, "St. Pantaleon");
  assert.equal(vg.daten.bundesland, "Oberösterreich");
  assert.equal(lesen.bericht.ergebnis.vorlage.land, "AT");
  assert.doesNotMatch(JSON.stringify(lesen.bericht.ergebnis.kennzahlen), /€/);
});

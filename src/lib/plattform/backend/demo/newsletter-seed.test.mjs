// Plattform-Armee, Paket MARKETING (Prüfer): Demo-Seed für das Newsletter-Backoffice.
// Läuft gegen eine WEGWERF-Demo-Datei in einem Temp-Ordner (nicht gegen .data/ des Projekts).
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/plattform/backend/demo/newsletter-seed.test.mjs

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-marketing-seed-"));
let seed;
let nl;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  delete process.env.PLATTFORM_BACKEND; // Demo
  await import("../demo.js"); // registriert den Seed (seedSetzen) für speicher.js
  seed = await import("./newsletter-seed.js");
  nl = await import("./newsletter.js");
});
after(() => {
  process.chdir(START);
  try {
    rmSync(ORDNER, { recursive: true, force: true });
  } catch {
    /* Windows: Datei evtl. noch gesperrt */
  }
});

test("Seed legt Demo-Abos an: 3 aktiv, 1 offen, 1 Abmeldungs-Grabstein – konsistent mit Kette und Personenzeilen", async () => {
  await seed.newsletterSeedBereit();
  const d = await nl.newsletterUebersicht();
  assert.equal(d.kennzahlen.aktiv, 3);
  assert.equal(d.kennzahlen.offen, 1);
  assert.equal(d.kennzahlen.abmeldungen30, 1);

  // Jeder lebende Empfänger hat E-Mail (@example.com) und eine sichtbare Einwilligungskette
  assert.equal(d.abos.length, 4);
  for (const a of d.abos) {
    assert.match(a.email, /@example\.com$/);
    assert.ok(a.einwilligungen.length >= 1, "Einwilligung protokolliert");
  }
  const aktive = d.abos.filter((a) => a.zustand === "aktiv");
  assert.ok(aktive.every((a) => a.ampel === "erteilt" && a.einwilligungen.some((e) => e.art === "doi")));
  assert.deepEqual([...new Set(aktive.map((a) => a.land))].sort(), ["AT", "CH", "DE"]);

  // Grabstein ohne Personendaten
  assert.equal(d.abmeldungen.length, 1);
  assert.deepEqual(Object.keys(d.abmeldungen[0]).sort(), ["am", "id", "status"]);

  // Versandliste: Widerrufene Adresse taucht nicht auf
  const de = await nl.newsletterEmpfaenger({ land: "DE", thema: "fristen_foerderung" });
  assert.deepEqual(de.map((e) => e.email), ["nl-landwirt@example.com"]);
});

test("Seed ist idempotent: zweiter Lauf ändert nichts", async () => {
  await seed.newsletterSeedBereit();
  const d = await nl.newsletterUebersicht();
  assert.equal(d.kennzahlen.aktiv, 3);
  assert.equal(d.abos.length, 4);
  assert.equal(d.abmeldungen.length, 1);
});

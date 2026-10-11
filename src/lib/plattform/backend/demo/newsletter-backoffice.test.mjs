// Plattform-Armee, Paket MARKETING: Newsletter-Backoffice – Übersicht, Export (Art. 15/20) und Löschung (Art. 17)
// gegen das Demo-Backend. Läuft gegen eine WEGWERF-Demo-Datei in einem Temp-Ordner (nicht gegen .data/ des Projekts).
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/plattform/backend/demo/newsletter-backoffice.test.mjs

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-marketing-"));
let nl;
let protokoll;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  delete process.env.PLATTFORM_BACKEND; // Demo
  await import("../demo.js"); // registriert den Seed (seedSetzen) für speicher.js
  nl = await import("./newsletter.js");
  protokoll = await import("../../../anfrage/protokoll.js");
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
const HASH = (n) => n.repeat(64); // 64 Hex-Zeichen
const inZukunft = () => new Date(Date.now() + 48 * 3600e3).toISOString();

async function anlegen({ email, land = "AT", themen = ["fristen_foerderung"], tokenHash }) {
  return nl.newsletterAnlegen({
    tokenHash,
    email,
    land,
    sprache: "de",
    themen,
    quelle: "marktdaten",
    kanal: "web",
    ablauf: inZukunft(),
    protokoll: { textId: "newsletter_de", textVersion: "TEST-1", textHash: HASH("a") },
    mail: { betreff: "Bitte bestätigen", text: "…", link: "http://localhost:3100/newsletter/abo/x" },
  });
}

test("Übersicht: Kennzahlen, Matrix je Land/Thema, Empfänger mit E-Mail und Einwilligungsverlauf", async () => {
  // Basis zuerst lesen: der erste Zugriff legt die Demo-Datenbank samt Fachmodul-Seeds an
  // (demo/vorbereiten.js, Schritt "newsletter" → newsletter-seed.js) – Erwartungen daher als Differenz.
  const basis = await nl.newsletterUebersicht();
  const a = await anlegen({ email: "aktiv@example.com", land: "AT", themen: ["fristen_foerderung", "marktdaten"], tokenHash: HASH("b") });
  const r = await nl.newsletterBestaetigen({ tokenHash: HASH("b"), doi: { textId: "newsletter_doi", textVersion: "TEST-1", textHash: HASH("c") } });
  assert.equal(r.zustand, "aktiv");
  await anlegen({ email: "offen@example.com", land: "DE", themen: ["marktdaten"], tokenHash: HASH("d") });

  const u = await nl.newsletterUebersicht();
  assert.equal(u.kennzahlen.aktiv, basis.kennzahlen.aktiv + 1);
  assert.equal(u.kennzahlen.offen, basis.kennzahlen.offen + 1);
  assert.equal(u.matrix.AT?.fristen_foerderung || 0, (basis.matrix.AT?.fristen_foerderung || 0) + 1);
  assert.equal(u.matrix.AT?.marktdaten || 0, (basis.matrix.AT?.marktdaten || 0) + 1);
  assert.equal(u.matrix.DE?.marktdaten || 0, basis.matrix.DE?.marktdaten || 0); // offen zählt nicht als Empfänger

  const aktiv = u.abos.find((x) => x.id === a.id);
  assert.equal(aktiv.zustand, "aktiv");
  assert.equal(aktiv.email, "aktiv@example.com");
  assert.equal(aktiv.ampel, "erteilt");
  assert.deepEqual(aktiv.einwilligungen.map((e) => e.art), ["einwilligung", "doi"]); // DSGVO: Kette sichtbar
  for (const e of aktiv.einwilligungen) assert.ok(!JSON.stringify(e).includes("example.com"), "Einwilligungen ohne Personendaten");

  const offen = u.abos.find((x) => x.email === "offen@example.com");
  assert.equal(offen.zustand, "offen");
  assert.equal(offen.ampel, "doi_ausstehend");
});

test("Export je Empfänger (Art. 15/20): Abo, E-Mail, Einwilligungen – unbekannte Abos 404", async () => {
  const u = await nl.newsletterUebersicht();
  const a = u.abos.find((x) => x.email === "aktiv@example.com");
  const e = await nl.newsletterExport({ aboId: a.id });
  assert.equal(e.email, "aktiv@example.com");
  assert.equal(e.abo.land, "AT");
  assert.equal(e.einwilligungen.length, 2);
  await assert.rejects(() => nl.newsletterExport({ aboId: "NL-gibtsnicht" }), (f) => f.status === 404);
});

test("Löschung je Empfänger (Art. 17): Widerruf im Protokoll, E-Mail weg, Grabstein – danach kein Export mehr", async () => {
  const vorher = await nl.newsletterUebersicht();
  const a = vorher.abos.find((x) => x.email === "aktiv@example.com");

  const r = await nl.newsletterLoeschen({ aboId: a.id });
  assert.deepEqual(r, { geloescht: true, bereits: false });

  const u = await nl.newsletterUebersicht();
  assert.equal(u.kennzahlen.aktiv, vorher.kennzahlen.aktiv - 1);
  assert.equal(u.kennzahlen.abmeldungen30, vorher.kennzahlen.abmeldungen30 + 1);
  assert.ok(u.abmeldungen.some((g) => g.id === a.id && g.status === "abgemeldet"));

  const d = db();
  const ps = protokoll.pseudonym("aktiv@example.com");
  const widerruf = d.leadKette.find((e) => e.pseudonym === ps && e.art === "widerruf");
  assert.equal(widerruf.kanal, "art17_loeschung");
  assert.ok(!d.leadPersonen.some((p) => p.email === "aktiv@example.com"), "Personenzeile gelöscht");
  assert.ok(!JSON.stringify(d.newsletterAbos).includes("example.com"), "Grabsteine ohne Personendaten");
  assert.equal(protokoll.kanalAmpel(d.leadKette, ps, "newsletter").erlaubt, false, "Kanal-Ampel gesperrt");

  await assert.rejects(() => nl.newsletterExport({ aboId: a.id }), (f) => f.status === 404);
  assert.deepEqual(await nl.newsletterLoeschen({ aboId: a.id }), { geloescht: true, bereits: true });
  const empfaenger = await nl.newsletterEmpfaenger({ land: "AT", thema: "fristen_foerderung" });
  assert.ok(!empfaenger.some((e) => e.email === "aktiv@example.com"), "gelöschte Adresse nie in der Versandliste");
});

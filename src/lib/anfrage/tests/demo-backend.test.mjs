// Paket C (Welle 1): anfrageAnlegen im Demo-Backend – Land bleibt erhalten, Flächencheck-Daten kommen an,
// Hinweis/Einwilligungen werden protokolliert, Zähler ohne Kennung, Team-Postfach je Land.
// Läuft gegen eine WEGWERF-Demo-Datei in einem Temp-Ordner (nicht gegen .data/ des Projekts), es geht keine Mail raus.
//
//   node --import ./src/lib/ereignis/tests/registrieren.mjs --test "src/lib/anfrage/tests/*.test.mjs"

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-c-"));
let demo;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  process.env.ANFRAGE_POSTFACH_AT = "team-at@example.invalid";
  delete process.env.ANFRAGE_POSTFACH_CH;
  demo = await import("../../plattform/backend/demo.js");
});
after(() => {
  process.chdir(START);
  try {
    rmSync(ORDNER, { recursive: true, force: true });
  } catch {
    /* Windows: Datei evtl. noch gesperrt */
  }
});

const db = () => JSON.parse(readFileSync(path.join(ORDNER, ".data", "plattform.json"), "utf8"));
const kontakt = (x = {}) => ({ vorname: "Test", nachname: "Paket C", email: `paketc-${Math.random().toString(36).slice(2)}@example.com`, ...x });

test("AT-PLZ 5020 über das Land-Feld: angenommen, Land AT bleibt (Vorgang und Fläche)", async () => {
  const r = await demo.anfrageAnlegen({ typ: "flaeche", kontakt: kontakt({ plz: "5020", land: "AT" }), daten: { quelle: "test" }, herkunft: { kanal: "Direkt" }, ip: "" });
  assert.equal(r.vorgang.land, "AT");
  const d = db();
  const vg = d.vorgaenge.find((x) => x.id === r.id);
  assert.equal(vg.kontakt.land, "AT");
  assert.equal(vg.kontakt.plz, "5020");
  assert.equal(d.flaechen.find((f) => f.id === r.vorgang.flaecheId).land, "AT");
});

test("CH-PLZ 8001 ohne Land-Feld, Land nur im Seitenkontext (Regionsseite): Land CH, Kanton aus regionName", async () => {
  const r = await demo.anfrageAnlegen({ typ: "flaeche", kontakt: kontakt({ plz: "8001" }), daten: { region: "schweiz", regionName: "Zürich", land: "CH" }, herkunft: {}, ip: "" });
  const d = db();
  const f = d.flaechen.find((x) => x.id === r.vorgang.flaecheId);
  assert.equal(d.vorgaenge.find((x) => x.id === r.id).kontakt.land, "CH");
  assert.equal(f.land, "CH", "vorher: DE");
  assert.equal(f.bundesland, "Zürich");
});

test("Regionsseite Salzburg: Bundesland aus regionName, Zuständigkeit nach Gebiet Österreich", async () => {
  const r = await demo.anfrageAnlegen({ typ: "flaeche", kontakt: kontakt({ plz: "5020" }), daten: { region: "salzburg", regionName: "Salzburg", land: "AT" }, herkunft: {}, ip: "" });
  const d = db();
  const vg = d.vorgaenge.find((x) => x.id === r.id);
  const f = d.flaechen.find((x) => x.id === r.vorgang.flaecheId);
  assert.equal(f.bundesland, "Salzburg");
  const gebietAT = d.bo?.gebiete?.find((g) => g.land === "AT");
  assert.ok(gebietAT?.mitarbeiterId, "Demo-Seed hat ein besetztes Gebiet Österreich");
  assert.equal(vg.zustaendigId, gebietAT.mitarbeiterId, "Vorgang dem Team Österreich zugewiesen (vorher: niemand)");
  assert.equal(f.zustaendigId, gebietAT.mitarbeiterId);
});

test("Flächencheck 12 ha: ha = 12, Nutzung als ID, Land aus daten.eingaben", async () => {
  // So sendet der Wizard (FlaechenWizard.js → Ergebnis → daten): flach UND unter eingaben
  const daten = { quelle: "flaechencheck", land: "AT", ha: 12, nutzung: "gruenland", eingaben: { land: "AT", flaecheHa: 12, nutzungId: "gruenland", nutzung: "Grünland" }, ergebnis: { ampel: "gruen", punkte: 72 } };
  const r = await demo.anfrageAnlegen({ typ: "flaeche", kontakt: kontakt({ plz: "4020" }), daten, herkunft: {}, ip: "" });
  const f = db().flaechen.find((x) => x.id === r.vorgang.flaecheId);
  assert.equal(f.ha, 12);
  assert.equal(f.nutzung, "gruenland");
  assert.equal(f.land, "AT");
  // Altformat (nur eingaben, Nutzung als Label) wird ebenfalls gelesen
  const alt = await demo.anfrageAnlegen({ typ: "flaeche", kontakt: kontakt(), daten: { eingaben: { land: "CH", flaecheHa: 12, nutzung: "Acker" } }, herkunft: {}, ip: "" });
  const fa = db().flaechen.find((x) => x.id === alt.vorgang.flaecheId);
  assert.equal(fa.ha, 12);
  assert.equal(fa.land, "CH");
  // Parkplatz aus dem Wizard → Gewerbe-/Parkfläche
  const pp = await demo.anfrageAnlegen({ typ: "flaeche", kontakt: kontakt(), daten: { land: "DE", ha: 2, nutzung: "parkplatz" }, herkunft: {}, ip: "" });
  assert.equal(db().flaechen.find((x) => x.id === pp.vorgang.flaecheId).nutzung, "gewerbe");
});

test("Unbekanntes Land: 4-stellige PLZ bleibt offen (kein stilles DE am Vorgang)", async () => {
  const r = await demo.anfrageAnlegen({ typ: "kontakt", kontakt: kontakt({ plz: "5020" }), daten: {}, herkunft: {}, ip: "" });
  assert.equal(db().vorgaenge.find((x) => x.id === r.id).kontakt.land, "");
  const de = await demo.anfrageAnlegen({ typ: "kontakt", kontakt: kontakt({ plz: "87719" }), daten: {}, herkunft: {}, ip: "" });
  assert.equal(db().vorgaenge.find((x) => x.id === de.id).kontakt.land, "DE");
});

test("Hinweis statt Pflicht-Einwilligung: Text, Version, Hash und optionale Einwilligungen am Vorgang", async () => {
  const r = await demo.anfrageAnlegen({
    typ: "kontakt",
    kontakt: kontakt({ telefon: "+43 662 123456", land: "AT" }),
    daten: { rueckrufGewuenscht: true },
    herkunft: {},
    ip: "",
    einwilligungText: "Hinweistext",
    hinweis: { version: "ENTWURF-X", rechtsgrundlage: "Art. 6 Abs. 1 lit. b DSGVO", textHash: "a".repeat(64) },
    einwilligungen: [
      { id: "werbeanruf", erteilt: true, am: "2026-10-03T10:00:00.000Z", version: "ENTWURF-X", textHash: "b".repeat(64), sprache: "de" },
      { id: "newsletter", erteilt: false },
    ],
  });
  const e = db().vorgaenge.find((x) => x.id === r.id).einwilligung;
  assert.equal(e.art, "hinweis");
  assert.equal(e.version, "ENTWURF-X");
  assert.equal(e.textHash.length, 64);
  assert.deepEqual(e.optional.map((x) => x.id), ["werbeanruf"]);
  assert.equal(db().vorgaenge.find((x) => x.id === r.id).daten.rueckrufGewuenscht, true);
});

test("Team-Postfach je Land: AT konfiguriert → Hinweis-Mail ohne Personendaten; CH nicht konfiguriert → keine", async () => {
  const at = await demo.anfrageAnlegen({ typ: "investor", kontakt: kontakt({ land: "AT", firma: "Geheim GmbH" }), daten: {}, herkunft: {}, ip: "" });
  const ch = await demo.anfrageAnlegen({ typ: "investor", kontakt: kontakt({ land: "CH" }), daten: {}, herkunft: {}, ip: "" });
  const post = db().postausgang || [];
  const mailAT = post.find((m) => m.an === "team-at@example.invalid" && m.betreff.includes(at.id));
  assert.ok(mailAT, "Mail an Team-Postfach AT");
  assert.ok(!/Paket C|Geheim|example\.com/.test(`${mailAT.betreff} ${mailAT.text}`), "keine Personendaten in der Team-Mail");
  assert.ok(!post.some((m) => m.betreff?.includes(ch.id) && /^team-/.test(m.an)), "CH ohne Postfach");
});

test("Zähler im Demo-Backend: nur Tag|Typ|Land|Kanal", async () => {
  const z = db().anfrageZaehler || {};
  assert.ok(Object.keys(z).length > 0);
  for (const k of Object.keys(z)) assert.match(k, /^\d{4}-\d{2}-\d{2}\|[a-z_?]+\|(DE|AT|CH|\?)\|[^|@]+$/);
  assert.ok(Object.keys(z).some((k) => k.includes("|flaeche|AT|Direkt")));
});

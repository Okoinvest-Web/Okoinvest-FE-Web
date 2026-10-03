// Welle 2, Paket B3: Lead-Kette im Demo-Backend – anfrageAnlegen → Lead-Meta, getrennte Personendaten, Protokoll;
// Art. 17, IP-Löschung nach 30 Tagen, Kanal-Ampel über die Fassade, Lead-Desk.
// Läuft gegen eine WEGWERF-Demo-Datei in einem Temp-Ordner (nicht gegen .data/ des Projekts); es geht keine Mail raus.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/anfrage/leadkette.test.mjs

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-b3-"));
let demo;
let kette;
let fassade;
let protokoll;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  delete process.env.PLATTFORM_BACKEND; // Demo
  demo = await import("../plattform/backend/demo.js");
  kette = await import("../plattform/backend/demo/leadkette.js");
  fassade = await import("../plattform/backend/leadkette.js");
  protokoll = await import("./protokoll.js");
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
const sha = (s) => createHash("sha256").update(s).digest("hex");
const mail = () => `b3-${Math.random().toString(36).slice(2)}@example.com`;
const HINWEIS = { id: "hinweis_anfrage", version: "ENTWURF-2026-10-03", rechtsgrundlage: "Art. 6 Abs. 1 lit. b DSGVO", textHash: sha("Hinweis") };
const admin = () => {
  const u = db().nutzer.find((x) => x.email === "admin@example.com");
  return { ...u, rollen: ["admin"], backofficeRollen: ["leitung"] };
};

async function anfrage({ email = mail(), land, typ = "kontakt", daten = {}, telefon = "", einwilligungen = [], ip = "203.0.113.77", plz = "" } = {}) {
  const r = await demo.anfrageAnlegen({
    typ,
    kontakt: { vorname: "Bert", nachname: "Beispielmann", email, telefon, land, plz, firma: "Testhof KG" },
    daten,
    herkunft: { kanal: "Direkt" },
    ip,
    einwilligungText: "Hinweis",
    hinweis: HINWEIS,
    einwilligungen: einwilligungen.map((id) => ({ id, erteilt: true, am: new Date().toISOString(), version: "ENTWURF-2026-10-03", sprache: "de", textHash: sha(id) })),
  });
  return { ...r, email };
}

const PERSONEN = [/@/, /beispielmann|testhof|bert\b/i, /\+\d|\b\d{3,}[ /-]?\d{4,}\b/, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/];

test("Anfrage: Land Pflicht (unbekannt statt leer), Routing, Score, SLA-Klasse, Personenzeile getrennt", async () => {
  const at = await anfrage({ land: "AT", typ: "flaeche", daten: { ha: 25 }, telefon: "+43 662 123456" });
  const unb = await anfrage({ plz: "5020" });
  const d = db();
  const vg = d.vorgaenge.find((x) => x.id === at.id);
  assert.equal(vg.land, "AT");
  assert.equal(vg.herkunft.lead.land, "AT");
  assert.equal(vg.herkunft.lead.typ, "flaeche");
  assert.equal(vg.herkunft.lead.groesse.klasse, "gross");
  assert.equal(vg.herkunft.lead.slaKlasse, "taggleich");
  assert.ok(["A", "B", "C"].includes(vg.herkunft.lead.score.klasse) && vg.herkunft.lead.score.begruendung);
  assert.ok(vg.herkunft.lead.frist);
  assert.ok(vg.zustaendigId, "Gebiet Österreich besetzt (Demo-Seed)");
  assert.equal(vg.herkunft.lead.zustaendigQuelle, "gebiet");
  assert.equal(vg.ip, "", "keine IP am Vorgang");
  assert.equal(vg.einwilligung.ip, "");
  const vu = d.vorgaenge.find((x) => x.id === unb.id);
  assert.equal(vu.land, "unbekannt");
  assert.equal(vu.kontakt.land, "", "Kontakt bleibt wie bisher leer (Paket C)");
  assert.equal(vu.zustaendigId, null);
  assert.equal(vu.herkunft.lead.ohneZustaendigkeit, true);
  const p = d.leadPersonen.find((x) => x.vorgangId === at.id);
  assert.equal(p.email, at.email);
  assert.equal(p.ipGekuerzt, "203.0.113.0", "IP nur gekürzt");
  assert.equal(p.pseudonym, vg.herkunft.lead.pseudonym);
  // Aktivitätsprotokoll (unveränderlich) ohne E-Mail und ohne IP
  const akt = d.aktivitaeten.filter((x) => x.objektId === at.id);
  assert.ok(akt.length >= 1);
  for (const a of akt) {
    assert.ok(!a.text.includes("@"), "keine E-Mail im Aktivitätsprotokoll");
    assert.equal(a.ip || "", "");
  }
});

test("(a) Protokoll: Hinweis + nur ausdrücklich erteilte Einwilligungen, Kette ok, keine Personendaten in Einträgen", async () => {
  const r = await anfrage({ land: "DE", telefon: "+49 89 1234567", einwilligungen: ["werbeanruf", "newsletter"] });
  const d = db();
  const ps = d.vorgaenge.find((x) => x.id === r.id).herkunft.lead.pseudonym;
  const eigene = d.leadKette.filter((e) => e.pseudonym === ps);
  assert.deepEqual(eigene.map((e) => `${e.art}:${e.zweck}`), ["hinweis:anfrage", "einwilligung:werbeanruf", "einwilligung:newsletter"]);
  assert.equal(protokoll.protokollPruefen(d.leadKette).ok, true);
  for (const e of d.leadKette) {
    for (const [feld, wert] of Object.entries(e)) {
      if (feld === "zeit") continue;
      const s = String(wert).replace(/[0-9a-f]{64}/g, "#");
      for (const m of PERSONEN) assert.ok(!m.test(s), `${feld}: ${wert}`);
    }
  }
});

test("(c) Kanal-Ampel über die Fassade: Werbeanruf erlaubt nach Einwilligung, Newsletter erst nach DOI, gesperrt nach Widerruf", async () => {
  const r = await anfrage({ land: "CH", telefon: "+41 44 1234567", einwilligungen: ["werbeanruf", "newsletter"] });
  const ohne = await anfrage({ land: "CH", telefon: "+41 44 7654321" });
  assert.equal(await fassade.werbekanalErlaubt({ email: ohne.email, zweck: "werbeanruf" }), false, "ohne Häkchen: gesperrt (keine mutmaßliche Einwilligung)");
  await assert.rejects(fassade.werbekanalSicherstellen({ email: ohne.email, zweck: "werbeanruf" }), (e) => e.status === 403 && !e.message.includes("@"));
  assert.equal(await fassade.werbekanalErlaubt({ email: r.email.toUpperCase(), zweck: "werbeanruf" }), true);
  assert.equal(await fassade.werbekanalErlaubt({ email: r.email, zweck: "newsletter" }), false, "DOI ausstehend");
  await fassade.protokollAnhaengen({ email: r.email, art: "doi", zweck: "newsletter", textId: "newsletter_doi", textVersion: "ENTWURF-2026-10-03", textHash: sha("doi"), kanal: "doi_link", land: "CH" });
  assert.equal(await fassade.werbekanalErlaubt({ email: r.email, zweck: "newsletter" }), true);
  const w = await kette.widerrufen(admin(), { vorgangId: r.id, zweck: "werbeanruf", kanal: "telefon" });
  assert.equal(w.stand.stand, "widerrufen");
  assert.equal(await fassade.werbekanalErlaubt({ email: r.email, zweck: "werbeanruf" }), false, "nach Widerruf");
  await assert.rejects(fassade.protokollAnhaengen({ email: r.email, art: "einwilligung", zweck: "werbeanruf", textId: "werbeanruf", textVersion: "V1", textHash: sha("x"), kanal: "web_formular", land: "CH", telefon: "+41" }), /unbekanntes Feld/);
  assert.equal(protokoll.protokollPruefen(db().leadKette).ok, true);
});

test("(b) Art. 17: Personenzeile entfernt, Kontakt geschwärzt, offene Einwilligungen widerrufen, Kette bleibt verifizierbar", async () => {
  const r = await anfrage({ land: "DE", telefon: "+49 30 1234567", einwilligungen: ["werbeanruf"] });
  const ps = db().vorgaenge.find((x) => x.id === r.id).herkunft.lead.pseudonym;
  const vorKette = db().leadKette.length;
  const erg = await kette.personLoeschen(admin(), { vorgangId: r.id, grund: "Löschersuchen per E-Mail" });
  assert.equal(erg.ketteOk, true);
  assert.ok(erg.entfernt >= 1);
  assert.deepEqual(erg.widerrufen, ["werbeanruf"]);
  const d = db();
  assert.ok(!d.leadPersonen.some((p) => p.vorgangId === r.id || p.pseudonym === ps), "Personenzeile weg");
  const vg = d.vorgaenge.find((x) => x.id === r.id);
  assert.equal(vg.email, "");
  assert.equal(vg.kontakt.telefon, "");
  assert.ok(!JSON.stringify(vg).includes(r.email), "E-Mail nirgends mehr am Vorgang");
  assert.equal(vg.herkunft.lead.pseudonym, ps, "Pseudonym bleibt als Minimaldatensatz");
  assert.ok(vg.herkunft.lead.loeschung.nachweisBis > vg.herkunft.lead.loeschung.am);
  for (const k of d.bo.kontakte.filter((x) => (x.bezuege || []).some((b) => b.id === r.id))) assert.notEqual(k.email, r.email, "CRM-Kontakt geschwärzt");
  assert.equal(d.leadKette.length, vorKette + 1, "nur ein Widerruf angehängt, nichts gelöscht");
  assert.ok(d.leadKette.some((e) => e.pseudonym === ps && e.art === "einwilligung"), "Einwilligungseintrag bleibt (Nachweis)");
  assert.equal(protokoll.protokollPruefen(d.leadKette).ok, true);
  // Nachweis wiederfindbar: wer die E-Mail kennt, findet das Pseudonym
  assert.equal(protokoll.pseudonym(r.email), ps);
  assert.equal(await fassade.werbekanalErlaubt({ email: r.email, zweck: "werbeanruf" }), false);
});

test("(b) IP älter als 30 Tage wird entfernt, jüngere bleibt", async () => {
  const r = await anfrage({ land: "AT", ip: "198.51.100.23" });
  const p0 = db().leadPersonen.find((x) => x.vorgangId === r.id);
  assert.equal(p0.ipGekuerzt, "198.51.100.0");
  await kette.ipAufraeumen({ jetztMs: Date.now() + 29 * 86400000 });
  assert.equal(db().leadPersonen.find((x) => x.vorgangId === r.id).ipGekuerzt, "198.51.100.0", "nach 29 Tagen noch da");
  const { entfernt } = await kette.ipAufraeumen({ jetztMs: Date.now() + 31 * 86400000 });
  assert.ok(entfernt >= 1);
  const p = db().leadPersonen.find((x) => x.vorgangId === r.id);
  assert.equal(p.ipGekuerzt, "");
  assert.equal(p.email, r.email, "nur die IP wird gelöscht, nicht die Anfrage");
});

test("(d) Lead-Desk: 100 % der Anfragen mit Land und zuständig oder „ohne Zuständigkeit“; SLA, Median/P90, Kette", async () => {
  for (const land of ["DE", "AT", "CH", undefined]) for (const typ of ["investor", "speicher", "kommune", "reststrom"]) await anfrage({ land, typ, daten: typ === "kommune" ? {} : { mw: 5 } });
  const n = admin();
  const r = await kette.leadDesk(n, { tage: 400 });
  assert.ok(r.anzahl > 10);
  for (const l of r.leads) {
    assert.ok(["DE", "AT", "CH", "unbekannt"].includes(l.land), `${l.id} Land`);
    assert.ok(l.zustaendig || l.ohneZustaendigkeit === true, `${l.id} Zuständigkeit`);
    assert.ok(l.sla?.status && l.score?.klasse);
  }
  assert.equal(r.kette.ok, true);
  assert.ok(r.auswertung.jeLand.DE && r.auswertung.gesamt.anzahl === r.anzahl);
  assert.ok(r.desks.every((d) => d.todo.startsWith("TODO Inhaber")));
  assert.ok(!JSON.stringify(r.leads).includes("@"), "keine E-Mail in der Lead-Liste");
  const nurAt = await kette.leadDesk(n, { land: "AT", tage: 400 });
  assert.ok(nurAt.leads.length > 0 && nurAt.leads.every((x) => x.land === "AT"));
  await assert.rejects(kette.leadDesk({ ...n, rollen: ["flaeche"] }, {}), (e) => e.status === 403);
  await assert.rejects(kette.leadDesk(null, {}), (e) => e.status === 401);
});

test("Absagecode mit Begründung; Erstkontakt wird beim ersten Statuswechsel erkannt", async () => {
  const r = await anfrage({ land: "DE", typ: "investor" });
  const n = admin();
  await assert.rejects(kette.absageSetzen(n, r.id, { code: "erfunden" }), (e) => e.status === 422);
  await assert.rejects(kette.absageSetzen(n, r.id, { code: "sonstiges" }), /Begründung/);
  const a = await kette.absageSetzen(n, r.id, { code: "region" });
  assert.match(a.absage.begruendung, /Region/);
  await demo.statusWechsel(n, { art: "vorgang", id: r.id, nach: "in_pruefung", als: "admin" });
  const desk = await kette.leadDesk(n, { tage: 400 });
  const l = desk.leads.find((x) => x.id === r.id);
  assert.equal(l.absage.code, "region");
  assert.ok(desk.absagen.some((x) => x.code === "region" && x.begruendungen.length >= 1));
  assert.ok(["erledigt", "verspaetet"].includes(l.sla.status), "Statuswechsel = Erstkontakt");
  assert.ok(db().vorgaenge.find((x) => x.id === r.id).herkunft.lead.erstkontaktAm, "Erstkontakt am Lead festgehalten");
});

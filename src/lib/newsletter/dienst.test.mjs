// Welle 3, Paket NL: Newsletter je Land – Anmelden → Double-Opt-in → Abmelden gegen das Demo-Backend.
// Läuft gegen eine WEGWERF-Demo-Datei in einem Temp-Ordner (nicht gegen .data/ des Projekts); es geht keine Mail raus.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/newsletter/dienst.test.mjs

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-nl-"));
let nl;
let dienst;
let kette;
let protokoll;
let texte;
let themen;
let versand;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  delete process.env.PLATTFORM_BACKEND; // Demo
  nl = await import("../plattform/backend/demo/newsletter.js");
  kette = await import("../plattform/backend/demo/leadkette.js");
  dienst = await import("./dienst.js");
  protokoll = await import("../anfrage/protokoll.js");
  texte = await import("./texte.js");
  themen = await import("./themen.js");
  versand = await import("./versand.js");
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
const mail = () => `nl-${Math.random().toString(36).slice(2)}@example.com`;
let uhr = null;
const deps = (extra = {}) => ({ nl, aktiv: () => true, jetzt: () => (uhr ? new Date(uhr) : new Date()), ...extra });
const BASIS = "http://localhost:3100";

async function anmelden({ email = mail(), land = "AT", gewaehlt = ["fristen_foerderung", "energiegemeinschaften"], sprache, extra = {} } = {}) {
  const r = await dienst.anmelden({ body: { email, land, themen: gewaehlt, sprache, quelle: "marktdaten", ...extra }, basisUrl: BASIS }, deps());
  const m = db().postausgang?.find((x) => x.an === email && x.art === "newsletter_doi");
  const token = m?.link?.split("/newsletter/abo/")[1] || null;
  return { r, email, token, m };
}
const eintraege = (email) => db().leadKette.filter((e) => e.pseudonym === protokoll.pseudonym(email)).map((e) => `${e.art}/${e.zweck}/${e.kanal}`);

test("Themen: nur bekannte, ohne Doppel, keine Vorauswahl; Land und Sprache normalisiert", () => {
  assert.deepEqual(themen.themenNormal(["marktdaten", "x", "marktdaten", "fristen_foerderung"]), ["fristen_foerderung", "marktdaten"]);
  assert.deepEqual(themen.themenNormal("marktdaten"), []);
  assert.equal(themen.THEMEN.length, 4);
  assert.equal(themen.newsletterLand(" ch "), "CH");
  assert.equal(themen.newsletterLand("FR"), "");
  assert.equal(themen.newsletterSprache("fr"), "de");
});

test("Einwilligungstext enthält Land und Themen; jede Änderung ändert den Hash", () => {
  const a = texte.einwilligungsText({ land: "AT", themen: ["marktdaten"], sprache: "de" });
  const b = texte.einwilligungsText({ land: "CH", themen: ["marktdaten"], sprache: "de" });
  const c = texte.einwilligungsText({ land: "AT", themen: ["marktdaten", "flaechen_pacht"], sprache: "de" });
  assert.match(a, /Österreich/);
  assert.match(a, /Marktdaten/);
  assert.match(b, /die Schweiz/);
  assert.match(c, /Marktdaten und Flächen & Pacht/);
  assert.match(texte.einwilligungsText({ land: "DE", themen: ["marktdaten"], sprache: "en" }), /Germany/);
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.doesNotMatch(a + b + c, /grün|klimaneutral/i);
});

test("Versand-Sperre: nur Demo-Backend und nie in Produktion", () => {
  assert.equal(versand.newsletterAktiv({ backend: "demo", env: {} }), true);
  assert.equal(versand.newsletterAktiv({ backend: "demo", env: { NEXT_PUBLIC_SITE_ENV: "production" } }), false);
  assert.equal(versand.newsletterAktiv({ backend: "frappe", env: {} }), false);
  assert.deepEqual(versand.newsletterStatus({ backend: null, env: {} }), { aktiv: false, modus: "aus" });
});

test("Gesperrt (vor Livegang): 503 ohne Daten anzunehmen", async () => {
  const email = mail();
  await assert.rejects(dienst.anmelden({ body: { email, land: "DE", themen: ["marktdaten"] }, basisUrl: BASIS }, deps({ aktiv: () => false })), (e) => e.status === 503 && e.code === "newsletter_aus");
  assert.equal((db().leadPersonen || []).some((p) => p.email === email), false);
});

test("Eingabeprüfung: E-Mail, Land und mindestens ein Thema sind Pflicht (422, ohne den Wert zu nennen)", async () => {
  const fall = async (body, feld) =>
    assert.rejects(dienst.anmelden({ body, basisUrl: BASIS }, deps()), (e) => e.status === 422 && e.code === feld && !String(e.message).includes("@"));
  await fall({ email: "kein-at", land: "DE", themen: ["marktdaten"] }, "email");
  await fall({ email: mail(), land: "", themen: ["marktdaten"] }, "land");
  await fall({ email: mail(), land: "FR", themen: ["marktdaten"] }, "land");
  await fall({ email: mail(), land: "DE", themen: [] }, "themen");
  await fall({ email: mail(), land: "DE" }, "themen");
});

test("Honeypot: gleiche Antwort, nichts gespeichert", async () => {
  const email = mail();
  const r = await dienst.anmelden({ body: { email, land: "DE", themen: ["marktdaten"], website: "spam" }, basisUrl: BASIS }, deps());
  assert.equal(r.ok, true);
  assert.equal((db().leadPersonen || []).some((p) => p.email === email), false);
});

test("Anmeldung: offenes Abo ohne Klartext-Token und ohne E-Mail, Einwilligung protokolliert, Kanal erst nach DOI", async () => {
  const { r, email, token, m } = await anmelden();
  assert.equal(r.ok, true);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/, "Link mit Token im Demo-Postausgang");
  assert.match(m.hinweis, /nicht versendet/);
  assert.doesNotMatch(`${m.betreff} ${m.text}`, /Angebot|Rabatt|jetzt kaufen/i, "Bestätigungs-Mail ohne Werbung");
  const d = db();
  const abo = d.newsletterAbos.at(-1);
  const roh = JSON.stringify(abo);
  assert.ok(!roh.includes(token), "Klartext-Token nicht gespeichert");
  assert.ok(!roh.includes("@"), "keine E-Mail im Abo");
  assert.equal(abo.status, "offen");
  assert.equal(abo.land, "AT");
  assert.deepEqual(abo.themen, ["fristen_foerderung", "energiegemeinschaften"]);
  assert.equal(d.leadPersonen.find((p) => p.id === abo.personId).zweck, "newsletter_ausstehend");
  assert.deepEqual(eintraege(email), ["einwilligung/newsletter/web_formular"]);
  const e = d.leadKette.filter((x) => x.pseudonym === protokoll.pseudonym(email))[0];
  assert.equal(e.textHash, (await import("../bericht/anforderung.js")).sha256(texte.einwilligungsText({ land: "AT", themen: abo.themen, sprache: "de" })));
  assert.equal(e.land, "AT");
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "newsletter" }), false, "erst nach DOI");
  assert.deepEqual(await dienst.lesen({ token }, deps()), { zustand: "offen", abo: { land: "AT", sprache: "de", themen: abo.themen, bestaetigtAm: null } });
  assert.equal(protokoll.protokollPruefen(d.leadKette).ok, true, "Kette intakt");
});

test("Bestätigung: DOI protokolliert, Kanal frei, Willkommens-Mail mit Ein-Klick-Abmeldung (RFC 8058); zweite Bestätigung idempotent", async () => {
  const { email, token } = await anmelden({ land: "CH", gewaehlt: ["marktdaten"] });
  const r = await dienst.bestaetigen({ token, basisUrl: BASIS }, deps());
  assert.deepEqual(r, { ok: true, bereits: false });
  assert.deepEqual(eintraege(email), ["einwilligung/newsletter/web_formular", "doi/newsletter/doi_link"]);
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "newsletter" }), true);
  const w = db().postausgang.find((x) => x.an === email && x.art === "newsletter_willkommen");
  assert.equal(w.kopfzeilen["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(w.kopfzeilen["List-Unsubscribe"], /\/api\/newsletter\/abmelden\?token=/);
  assert.deepEqual(await dienst.bestaetigen({ token, basisUrl: BASIS }, deps()), { ok: true, bereits: true });
  assert.deepEqual(await nl.newsletterEmpfaenger({ land: "CH", thema: "marktdaten" }).then((l) => l.filter((x) => x.email === email).length), 1);
  assert.equal((await nl.newsletterEmpfaenger({ land: "DE", thema: "marktdaten" })).some((x) => x.email === email), false, "Länder getrennt");
  assert.equal((await nl.newsletterEmpfaenger({ land: "CH", thema: "flaechen_pacht" })).some((x) => x.email === email), false, "nur gewählte Themen");
});

test("Abmeldung mit einem Klick: Widerruf protokolliert, Personendaten gelöscht, Kanal gesperrt; erneut idempotent", async () => {
  const { email, token } = await anmelden({ land: "DE", gewaehlt: ["flaechen_pacht"] });
  await dienst.bestaetigen({ token, basisUrl: BASIS }, deps());
  assert.deepEqual(await dienst.abmelden({ token }, deps()), { ok: true, bereits: false });
  assert.deepEqual(eintraege(email), ["einwilligung/newsletter/web_formular", "doi/newsletter/doi_link", "widerruf/newsletter/abmeldelink"]);
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "newsletter" }), false);
  assert.equal(db().leadPersonen.some((p) => p.email === email), false, "E-Mail gelöscht");
  assert.deepEqual(await dienst.lesen({ token }, deps()), { zustand: "abgemeldet" });
  assert.deepEqual(await dienst.abmelden({ token }, deps()), { ok: true, bereits: true });
  assert.equal((await nl.newsletterEmpfaenger({ land: "DE", thema: "flaechen_pacht" })).some((x) => x.email === email), false);
  await assert.rejects(dienst.bestaetigen({ token, basisUrl: BASIS }, deps()), (e) => e.status === 409);
});

test("Abmelden schon vor der Bestätigung möglich", async () => {
  const { email, token } = await anmelden({ land: "AT", gewaehlt: ["marktdaten"] });
  await dienst.abmelden({ token }, deps());
  assert.deepEqual(eintraege(email), ["einwilligung/newsletter/web_formular", "widerruf/newsletter/abmeldelink"]);
  assert.equal(db().leadPersonen.some((p) => p.email === email), false);
});

test("Ablauf: nach 48 Stunden 410, Angaben gelöscht", async () => {
  const { email, token } = await anmelden({ land: "DE", gewaehlt: ["marktdaten"] });
  uhr = new Date(Date.now() + 49 * 3600e3).toISOString();
  try {
    await assert.rejects(dienst.bestaetigen({ token, basisUrl: BASIS }, deps()), (e) => e.status === 410);
    assert.equal(db().leadPersonen.some((p) => p.email === email), false);
    assert.deepEqual(await dienst.lesen({ token }, deps()), { zustand: "abgelaufen" });
  } finally {
    uhr = null;
  }
});

test("Neue Anmeldung derselben Adresse: ersetzt das alte Abo erst mit der Bestätigung; eine fremde Anmeldung sperrt das bestehende Abo nicht", async () => {
  const email = mail();
  const erst = await anmelden({ email, land: "DE", gewaehlt: ["marktdaten"] });
  await dienst.bestaetigen({ token: erst.token, basisUrl: BASIS }, deps());
  // Zweite Anmeldung (z. B. Themenwechsel oder durch Dritte): bestehende Einwilligung bleibt grün
  const zweit = await anmelden({ email, land: "AT", gewaehlt: ["energiegemeinschaften"] });
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "newsletter" }), true, "bestehendes Abo bleibt aktiv");
  assert.deepEqual(eintraege(email), ["einwilligung/newsletter/web_formular", "doi/newsletter/doi_link"], "neue Einwilligung nur vorgemerkt");
  assert.equal((await nl.newsletterEmpfaenger({ land: "DE", thema: "marktdaten" })).some((x) => x.email === email), true);
  await dienst.bestaetigen({ token: zweit.token, basisUrl: BASIS }, deps());
  assert.deepEqual(eintraege(email), ["einwilligung/newsletter/web_formular", "doi/newsletter/doi_link", "einwilligung/newsletter/web_formular", "doi/newsletter/doi_link"]);
  assert.equal((await nl.newsletterEmpfaenger({ land: "DE", thema: "marktdaten" })).some((x) => x.email === email), false, "altes Abo ersetzt");
  assert.equal((await nl.newsletterEmpfaenger({ land: "AT", thema: "energiegemeinschaften" })).some((x) => x.email === email), true);
  assert.equal(db().leadPersonen.filter((p) => p.email === email).length, 1, "nur eine Personenzeile");
  assert.deepEqual(await dienst.lesen({ token: erst.token }, deps()), { zustand: "ersetzt" });
  assert.equal(protokoll.protokollPruefen(db().leadKette).ok, true);
});

test("Ungültige oder unbekannte Token: 404 bzw. zustand null", async () => {
  await assert.rejects(dienst.bestaetigen({ token: "kurz", basisUrl: BASIS }, deps()), (e) => e.status === 404);
  await assert.rejects(dienst.abmelden({ token: "A".repeat(43) }, deps()), (e) => e.status === 404);
  assert.deepEqual(await dienst.lesen({ token: "../x" }, deps()), { zustand: null });
});

test("Englisch: eigener Wortlaut und englische Mails", async () => {
  const { email, token, m } = await anmelden({ land: "AT", sprache: "en", gewaehlt: ["marktdaten"] });
  assert.match(m.betreff, /confirm/i);
  await dienst.bestaetigen({ token, basisUrl: BASIS }, deps());
  const w = db().postausgang.find((x) => x.an === email && x.art === "newsletter_willkommen");
  assert.match(w.text, /Austria/);
  const sha = (await import("../bericht/anforderung.js")).sha256;
  const doi = db().leadKette.filter((x) => x.pseudonym === protokoll.pseudonym(email) && x.art === "doi")[0];
  assert.equal(doi.textHash, sha(texte.DOI.en.text));
});

test("Prüfer: Abmeldelink einer älteren Mail (ersetztes Abo) beendet das aktuelle Abo; Hinweisseite in der Sprache des Abos", async () => {
  const email = mail();
  const erst = await anmelden({ email, land: "DE", gewaehlt: ["marktdaten"], sprache: "en" });
  await dienst.bestaetigen({ token: erst.token, basisUrl: BASIS }, deps());
  const zweit = await anmelden({ email, land: "CH", gewaehlt: ["marktdaten"], sprache: "en" });
  await dienst.bestaetigen({ token: zweit.token, basisUrl: BASIS }, deps());
  assert.deepEqual(await dienst.lesen({ token: erst.token }, deps()), { zustand: "ersetzt", sprache: "en" });
  // RFC 8058 aus der alten Willkommens-Mail
  assert.deepEqual(await dienst.abmelden({ token: erst.token }, deps()), { ok: true, bereits: false });
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "newsletter" }), false);
  assert.equal((await nl.newsletterEmpfaenger({ land: "CH", thema: "marktdaten" })).some((x) => x.email === email), false);
  assert.equal(db().leadPersonen.some((p) => p.email === email), false, "E-Mail gelöscht");
  assert.deepEqual(await dienst.lesen({ token: zweit.token }, deps()), { zustand: "abgemeldet", sprache: "en" });
  assert.deepEqual(await dienst.abmelden({ token: erst.token }, deps()), { ok: true, bereits: true });
  const w = db().leadKette.filter((x) => x.pseudonym === protokoll.pseudonym(email) && x.art === "widerruf");
  assert.equal(w.length, 1);
  assert.equal(w[0].land, "CH", "Widerruf mit dem Land des aktuellen Abos");
  assert.equal(protokoll.protokollPruefen(db().leadKette).ok, true);
});

// Welle 2, Paket B4: Anfordern → Double-Opt-in → Bericht gegen das Demo-Backend.
// Läuft gegen eine WEGWERF-Demo-Datei in einem Temp-Ordner (nicht gegen .data/ des Projekts); es geht keine Mail raus.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/bericht/dienst.test.mjs

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const START = process.cwd();
const ORDNER = mkdtempSync(path.join(tmpdir(), "paket-b4-"));
let demo;
let demoBericht;
let kette;
let dienst;
let neu;
let protokoll;

before(async () => {
  process.chdir(ORDNER); // speicher.js legt .data/ unter process.cwd() an
  delete process.env.PLATTFORM_BACKEND; // Demo
  demo = await import("../plattform/backend/demo.js");
  demoBericht = await import("../plattform/backend/demo/bericht.js");
  kette = await import("../plattform/backend/demo/leadkette.js");
  dienst = await import("./dienst.js");
  neu = await import("./neuRechnen.js");
  protokoll = await import("../anfrage/protokoll.js");
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
const mail = () => `b4-${Math.random().toString(36).slice(2)}@example.com`;
let uhr = null; // ISO-Zeit für jetzt(); null = echte Zeit
const deps = (extra = {}) => ({ bericht: demoBericht, anfrage: demo, kette, versandErlaubt: () => true, jetzt: () => (uhr ? new Date(uhr) : new Date()), ...extra });

const PACHT = { ha: 12, regionId: "de-sued", modell: "fest", proHa: 3100, laufzeit: 30, ackerProHa: 407, dbProHa: 450, vorlaufJahre: 0, reservierungProHa: 200, umsatzAnteil: 0.06, mindestProHa: 1500 };
// Kette: Muster wie B3 (leadkette.test.mjs). Berichtsdaten enthalten Beträge wie „+9.300 €“ – dort die Klartexte prüfen.
const PERSONEN = [/@/, /beispielmann|berta\b/i, /\+\d|\b\d{3,}[ /-]?\d{4,}\b/];
const KLARTEXT = [/@/, /beispielmann|berta\b/i, /1234567/];

async function anfordern({ email = mail(), telefon, rechner = "pacht", eingaben = PACHT, land = "DE", einwilligungen, extra = {} } = {}) {
  const r = await dienst.berichtAnfordern(
    { body: { rechner, eingaben, land, kontakt: { vorname: "Berta", nachname: "Beispielmann", email, ...(telefon ? { telefon } : {}) }, einwilligungen, ...extra }, basisUrl: "http://localhost:3100" },
    deps()
  );
  const m = db().postausgang.find((x) => x.an === email && x.art === "bericht_doi");
  const token = m?.link?.split("/bericht/")[1] || null;
  return { r, email, token };
}

test("(a)(d) Anforderung ohne Telefon: angenommen, Server rechnet neu, Token nur als Hash, KEIN Vorgang vor DOI", async () => {
  await demoBericht.berichtAufraeumen(); // Demo-Datei anlegen (Seed), damit die Zählung stimmt
  const vorher = db().vorgaenge.length;
  const { r, email, token } = await anfordern({ extra: { ergebnis: { ersteJahrespacht: 999999999 } } });
  assert.equal(r.ok, true);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/, "Link mit Token im (Demo-)Postausgang");
  const d = db();
  const b = d.berichte.at(-1);
  const roh = JSON.stringify(b);
  assert.ok(!roh.includes(token), "Klartext-Token nicht gespeichert");
  assert.equal(b.tokenHash.length, 64);
  assert.deepEqual(KLARTEXT.filter((m) => m.test(roh)).map(String), [], "keine Personendaten im Berichtsdatensatz");
  const soll = neu.neuRechnen({ rechner: "pacht", eingaben: PACHT, land: "DE" });
  assert.deepEqual(b.ergebnis.kennzahlen, soll.ergebnis.kennzahlen, "Ergebnis = Neuberechnung, Client-Wert ignoriert");
  assert.ok(!roh.includes("999999999") && !roh.includes("999.999.999"));
  assert.equal(b.pruefId, soll.pruefId);
  assert.equal(d.vorgaenge.length, vorher, "ohne DOI kein Vorgang");
  const p = d.leadPersonen.find((x) => x.id === b.personId);
  assert.equal(p.zweck, "bericht_ausstehend");
  assert.equal(p.telefon, "");
  assert.equal(p.email, email);
  const ps = protokoll.pseudonym(email);
  const eintraege = d.leadKette.filter((e) => e.pseudonym === ps);
  assert.deepEqual(eintraege.map((e) => `${e.art}/${e.zweck}`), ["einwilligung/bericht"]);
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "bericht" }), false, "Bericht-Kanal erst nach DOI");
  const lesen = await dienst.berichtLesen({ token }, deps());
  assert.equal(lesen.zustand, "offen");
  assert.equal(lesen.bericht.ergebnis, undefined, "ohne DOI kein Bericht");
});

test("(b) Nach DOI: genau ein Vorgang mit Land und Rechnerdaten, Ketteneintrag doi ohne Personendaten, Bericht lesbar", async () => {
  const { email, token } = await anfordern({ telefon: "+49 89 1234567", einwilligungen: { newsletter: true, werbeanruf: false } });
  const vorher = db().vorgaenge.length;
  const r1 = await dienst.berichtBestaetigen({ token, ip: "203.0.113.9" }, deps());
  assert.deepEqual(r1, { ok: true, bereits: false });
  const r2 = await dienst.berichtBestaetigen({ token }, deps());
  assert.equal(r2.bereits, true, "zweite Bestätigung ändert nichts");
  const d = db();
  assert.equal(d.vorgaenge.length, vorher + 1, "genau ein Vorgang");
  const vg = d.vorgaenge.at(-1);
  assert.equal(vg.typ, "flaeche");
  assert.equal(vg.land, "DE");
  assert.equal(vg.daten.quelle, "bericht_pacht");
  assert.equal(vg.daten.bericht.rechner, "pacht");
  assert.match(vg.daten.bericht.pruefId, /^[0-9A-F-]{19}$/);
  assert.ok(vg.daten.bericht.kennzahlen.length >= 3);
  assert.equal(vg.daten.eingaben.ha, 12);
  assert.ok(vg.einwilligung.optional.some((e) => e.id === "newsletter"), "Newsletter nur über das eigene Häkchen");
  assert.ok(!vg.einwilligung.optional.some((e) => e.id === "werbeanruf"));
  const ps = protokoll.pseudonym(email);
  const eintraege = d.leadKette.filter((e) => e.pseudonym === ps);
  const doi = eintraege.filter((e) => e.art === "doi");
  assert.equal(doi.length, 1, "genau ein DOI-Eintrag");
  assert.equal(doi[0].zweck, "bericht");
  assert.equal(doi[0].kanal, "doi_link");
  const kettenText = JSON.stringify(eintraege);
  assert.deepEqual(PERSONEN.filter((m) => m.test(kettenText)).map(String), [], `Kette ohne Personendaten: ${kettenText.slice(0, 600)}`);
  assert.equal(protokoll.protokollPruefen(d.leadKette).ok, true, "Kette intakt");
  assert.equal(await kette.werbekanalErlaubt({ email, zweck: "bericht" }), true, "Bericht-Kanal nach DOI offen");
  const b = d.berichte.find((x) => x.vorgangId === vg.id);
  assert.ok(b.bestaetigtAm);
  assert.ok(!d.leadPersonen.some((p) => p.id !== b.personId && p.zweck === "bericht_ausstehend" && p.pseudonym === ps), "ausstehende Personenzeile gelöscht");
  assert.equal(d.leadPersonen.find((p) => p.id === b.personId)?.vorgangId, vg.id, "Verweis auf die Personenzeile des Vorgangs");
  const lesen = await dienst.berichtLesen({ token }, deps());
  assert.equal(lesen.zustand, "bestaetigt");
  assert.ok(lesen.bericht.ergebnis.annahmen.eintraege.length > 3, "Annahmenbuch im Bericht");
  assert.deepEqual(KLARTEXT.filter((m) => m.test(JSON.stringify(lesen))).map(String), [], "Bericht ohne Personendaten");
});

test("(a) Abgelaufenes Token → 410, unbekanntes/ungültiges → 404", async () => {
  const { token } = await anfordern();
  uhr = new Date(Date.now() + 49 * 3600e3).toISOString();
  try {
    await assert.rejects(dienst.berichtBestaetigen({ token }, deps()), (e) => e.status === 410);
    assert.equal((await dienst.berichtLesen({ token }, deps())).zustand, "abgelaufen");
    await demoBericht.berichtAufraeumen({ jetztMs: Date.parse(uhr) });
    await assert.rejects(dienst.berichtBestaetigen({ token }, deps()), (e) => e.status === 410, "Grabstein: weiter 410");
    const b = db().berichte.find((x) => x.status === "abgelaufen");
    assert.equal(b.ergebnis, undefined, "nach Ablauf keine Inhalte mehr");
    assert.equal(b.personId, undefined);
  } finally {
    uhr = null;
  }
  // Berichtslink 30 Tage nach Bestätigung
  const z = await anfordern();
  await dienst.berichtBestaetigen({ token: z.token }, deps());
  uhr = new Date(Date.now() + 31 * 864e5).toISOString();
  try {
    assert.equal((await dienst.berichtLesen({ token: z.token }, deps())).zustand, "abgelaufen");
  } finally {
    uhr = null;
  }
  await assert.rejects(dienst.berichtBestaetigen({ token: "A".repeat(43) }, deps()), (e) => e.status === 404);
  await assert.rejects(dienst.berichtBestaetigen({ token: "kaputt" }, deps()), (e) => e.status === 404);
});

test("(a) Nur 4 Rechner, sonst 422 – und nichts wird gespeichert", async () => {
  const vorher = db().berichte.length;
  await assert.rejects(anfordern({ rechner: "solarpark" }), (e) => e.status === 422);
  await assert.rejects(anfordern({ eingaben: { ...PACHT, ha: "viel" } }), (e) => e.status === 422);
  assert.equal(db().berichte.length, vorher);
});

test("(c) Versand aus: 503 mit ehrlichem Text, keine Daten angenommen", async () => {
  const vorher = JSON.stringify(db().berichte);
  const personen = db().leadPersonen.length;
  await assert.rejects(
    dienst.berichtAnfordern({ body: { rechner: "pacht", eingaben: PACHT, land: "DE", kontakt: { vorname: "A", nachname: "B", email: mail() } }, basisUrl: "" }, deps({ versandErlaubt: () => false })),
    (e) => e.status === 503 && e.message === "Berichtsversand startet mit dem Livegang."
  );
  assert.equal(JSON.stringify(db().berichte), vorher);
  assert.equal(db().leadPersonen.length, personen);
});

test("Kontakt: Name und E-Mail Pflicht, Telefon freiwillig, Honeypot verwirft still", async () => {
  await assert.rejects(
    dienst.berichtAnfordern({ body: { rechner: "pacht", eingaben: PACHT, land: "DE", kontakt: { vorname: "A", email: mail() } }, basisUrl: "" }, deps()),
    (e) => e.status === 422
  );
  await assert.rejects(
    dienst.berichtAnfordern({ body: { rechner: "pacht", eingaben: PACHT, land: "DE", kontakt: { vorname: "A", nachname: "B", email: "kein-mail" } }, basisUrl: "" }, deps()),
    (e) => e.status === 422
  );
  const vorher = db().berichte.length;
  const r = await dienst.berichtAnfordern({ body: { rechner: "pacht", eingaben: PACHT, land: "DE", website: "bot", kontakt: { vorname: "A", nachname: "B", email: mail() } }, basisUrl: "" }, deps());
  assert.equal(r.ok, true);
  assert.equal(db().berichte.length, vorher, "Honeypot: nichts gespeichert");
});

test("Alle vier Rechner: Anforderung + DOI → Vorgang mit passendem Typ", async () => {
  const { STANDARD: PA } = await import("../rechner/pachtangebot.js");
  const { STANDARD: K } = await import("../rechner/kommune.js");
  const faelle = [
    ["pachtangebot", PA, "DE", "flaeche"],
    ["flaechencheck", { land: "AT", regionId: "at", ha: 8, nutzung: "gruenland", besonderheiten: [], netz: "unbekannt", eigentum: "allein" }, "AT", "flaeche"],
    ["kommune", K, "DE", "kommune"],
  ];
  for (const [rechner, eingaben, land, typ] of faelle) {
    const { token } = await anfordern({ rechner, eingaben, land });
    await dienst.berichtBestaetigen({ token }, deps());
    const vg = db().vorgaenge.at(-1);
    assert.equal(vg.typ, typ, rechner);
    assert.equal(vg.land, land, rechner);
    assert.equal(vg.daten.bericht.rechner, rechner);
  }
});

// Welle 2, Paket B3: Einwilligungsprotokoll – Pseudonym, Eintragsform, Hash-Kette, Kanal-Ampel, IP-Kürzung.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/anfrage/protokoll.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  NACHWEIS_FRIST_JAHRE, PROTOKOLL_KANAELE, anhaengen, eintragErstellen, emailNormal, ipKuerzen, ipLoeschenAb, kanalAmpel, ketteForm, nachweisBis,
  pepper, protokollPruefen, pseudonym, werbekanalErlaubt, werbekanalSicherstellen,
} from "./protokoll.js";
import { EINWILLIGUNGEN, zweckFuer } from "./hinweise.js";

const h = (s) => createHash("sha256").update(s).digest("hex");
const PEPPER = "test-pepper-mindestens-zweiunddreissig-zeichen-lang";
const MAIL = "Erika.Muster@Example.com";
const ps = pseudonym(MAIL, { pepper: PEPPER });
const basis = (x = {}) => ({ pseudonym: ps, art: "einwilligung", zweck: "werbeanruf", textId: "werbeanruf", textVersion: "ENTWURF-2026-10-03", textHash: h("Text"), kanal: "web_formular", land: "AT", ...x });

// Muster für Personendaten: E-Mail, Telefonnummer (mind. 6 Ziffern mit Trennern), IPv4, IPv6, typische Namen aus den Tests
const PERSONEN_MUSTER = [/@/, /\+\d|\b\d{3,}[ /-]?\d{4,}\b/, /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, /\b[0-9a-f]{1,4}(:[0-9a-f]{1,4}){2,7}\b/i, /erika|muster/i];
function ohnePersonendaten(eintraege) {
  for (const e of eintraege) {
    for (const [feld, wert] of Object.entries(e)) {
      if (["pseudonym", "hash", "prevHash", "textHash"].includes(feld)) {
        assert.match(String(wert), /^[0-9a-f]{64}$|^$/, `${feld} ist ein Hash`);
        continue;
      }
      if (feld === "zeit" || feld === "am") continue; // ISO-Zeitstempel
      const ohneHashes = String(wert).replace(/[0-9a-f]{64}/g, "#");
      for (const m of PERSONEN_MUSTER) assert.ok(!m.test(ohneHashes), `Feld ${feld} sieht nach Personendaten aus: ${wert}`);
    }
  }
}

test("Pseudonym: HMAC-SHA-256 über die normalisierte E-Mail, abhängig vom Pepper", () => {
  assert.match(ps, /^[0-9a-f]{64}$/);
  assert.equal(pseudonym("  erika.muster@example.COM ", { pepper: PEPPER }), ps, "Groß/klein und Leerraum egal");
  assert.notEqual(pseudonym(MAIL, { pepper: `${PEPPER}x` }), ps, "anderer Pepper → anderes Pseudonym");
  assert.notEqual(ps, h(emailNormal(MAIL)), "kein reiner SHA-256 (ohne Pepper nicht nachrechenbar)");
  assert.throws(() => pseudonym("", { pepper: PEPPER }), /gültige E-Mail/);
});

test("Pepper: Produktion ohne Pepper → 503, Entwicklung → Testwert, gesetzter Pepper wird genutzt", () => {
  assert.throws(() => pepper({ NODE_ENV: "production" }), (e) => e.status === 503 && !/pepper/i.test(e.message));
  assert.throws(() => pepper({ NODE_ENV: "production", LEAD_PSEUDONYM_PEPPER: "zu-kurz" }), (e) => e.status === 503);
  assert.equal(pepper({ NODE_ENV: "production", LEAD_PSEUDONYM_PEPPER: PEPPER }), PEPPER);
  assert.ok(pepper({ NODE_ENV: "development" }).length >= 32);
});

test("Eintragsform: nur erlaubte Felder mit festen Mustern – Personendaten passen in kein Feld", () => {
  const e = eintragErstellen(basis({ zeit: "2026-10-03T08:00:00.000Z" }));
  assert.deepEqual(Object.keys(e).sort(), ["art", "id", "kanal", "land", "pseudonym", "textHash", "textId", "textVersion", "zeit", "zweck"]);
  assert.match(e.id, /^EP-[0-9A-Z]{12,}$/);
  const schlecht = [
    { pseudonym: MAIL }, { textId: "erika@example.com" }, { textId: "+43 662 123456" }, { textVersion: "Erika Muster" }, { textVersion: "192.168.1.20" },
    { kanal: "erika@example.com" }, { art: "mutmasslich" }, { zweck: "kaltakquise" }, { textHash: "" }, { art: "hinweis" }, { zweck: "anfrage" }, { zeit: "gestern" },
  ];
  for (const x of schlecht) assert.throws(() => eintragErstellen(basis(x)), (f) => f.status === 422 && !/erika|example|192\.168|\+43/i.test(f.message), JSON.stringify(x));
  assert.equal(eintragErstellen(basis({ land: "xx" })).land, "unbekannt");
  assert.equal(eintragErstellen(basis({ art: "widerruf", textHash: "" })).textHash, "", "Widerruf ohne Text-Hash erlaubt");
  assert.equal(eintragErstellen(basis({ art: "hinweis", zweck: "anfrage" })).zweck, "anfrage");
  assert.ok(PROTOKOLL_KANAELE.includes("doi_link"));
});

function kette() {
  const k = [];
  anhaengen(k, basis({ art: "hinweis", zweck: "anfrage", textId: "hinweis_anfrage", zeit: "2026-10-01T08:00:00.000Z" }));
  anhaengen(k, basis({ zeit: "2026-10-01T08:00:00.000Z" }));
  anhaengen(k, basis({ zweck: "newsletter", textId: "newsletter", zeit: "2026-10-01T08:00:01.000Z" }));
  anhaengen(k, basis({ art: "doi", zweck: "newsletter", textId: "newsletter_doi", kanal: "doi_link", zeit: "2026-10-01T09:00:00.000Z" }));
  anhaengen(k, basis({ art: "widerruf", zweck: "werbeanruf", textId: "widerruf", textHash: "", kanal: "abmeldelink", zeit: "2026-10-02T09:00:00.000Z" }));
  return k;
}

test("(a) Kette verifizierbar: verifyChain ok, jeder Eintrag zeigt auf den Vorgänger", () => {
  const k = kette();
  const r = protokollPruefen(k);
  assert.equal(r.ok, true);
  assert.equal(r.geprueft, 5);
  assert.equal(k[0].prevHash, "0".repeat(64));
  for (let i = 1; i < k.length; i++) assert.equal(k[i].prevHash, k[i - 1].hash);
  assert.equal(r.letzterHash, k.at(-1).hash);
});

test("(a) Manipulation erkannt: Feld geändert, Eintrag gelöscht, umsortiert, eingefügt", () => {
  for (const [name, f] of [
    ["textHash geändert", (k) => (k[1].textHash = h("anderer Text"))],
    ["Zweck geändert", (k) => (k[1].zweck = "newsletter")],
    ["Widerruf → Einwilligung", (k) => (k[4].art = "einwilligung")],
    ["Land geändert", (k) => (k[2].land = "DE")],
    ["Kanal geändert", (k) => (k[3].kanal = "backoffice")],
    ["Zeit geändert", (k) => (k[0].zeit = "2026-09-01T08:00:00.000Z")],
    ["Pseudonym getauscht", (k) => (k[2].pseudonym = h("x"))],
    ["Eintrag gelöscht", (k) => k.splice(4, 1) && k.splice(2, 1)],
    ["umsortiert", (k) => ([k[1], k[2]] = [k[2], k[1]])],
    ["eingefügt", (k) => k.splice(2, 0, { ...k[1], id: "EP-EINGEFUEGT00" })],
  ]) {
    const k = kette();
    f(k);
    const r = protokollPruefen(k);
    assert.equal(r.ok, false, name);
    assert.ok(r.fehler.length >= 1, name);
  }
  // Löschen des letzten Eintrags bricht keine Verweise, ist aber am bekannten Kopf-Hash erkennbar
  const k = kette();
  const kopf = k.at(-1).hash;
  k.pop();
  assert.notEqual(protokollPruefen(k).letzterHash, kopf);
});

test("(a) Kein Personendatum in Ketteneinträgen (auch nicht in der Kettenform für den Hash)", () => {
  const k = kette();
  ohnePersonendaten(k);
  ohnePersonendaten(k.map(ketteForm));
  assert.ok(!JSON.stringify(k).toLowerCase().includes("erika"));
});

test("anhaengen: unbekannte Felder und doppelte IDs werden abgewiesen (append-only, nichts Zusätzliches)", () => {
  const k = [];
  assert.throws(() => anhaengen(k, { ...basis(), email: MAIL }), (e) => e.status === 422 && !e.message.includes("@"));
  assert.throws(() => anhaengen(k, { ...basis(), telefon: "+43 1 234567" }), /unbekanntes Feld/);
  const e = anhaengen(k, basis());
  assert.throws(() => anhaengen(k, basis({ id: e.id })), /doppelt/);
  assert.equal(k.length, 1);
});

test("(c) Kanal-Ampel: ohne Einwilligung false, nach ausdrücklicher Einwilligung true, nach Widerruf false", () => {
  const k = [];
  assert.equal(werbekanalErlaubt(k, ps, "werbeanruf"), false, "leer → gesperrt");
  anhaengen(k, basis({ art: "hinweis", zweck: "anfrage", textId: "hinweis_anfrage" }));
  assert.equal(werbekanalErlaubt(k, ps, "werbeanruf"), false, "Hinweis (lit. b) ist keine Einwilligung");
  anhaengen(k, basis());
  assert.equal(werbekanalErlaubt(k, ps, "werbeanruf"), true, "ausdrückliche Einwilligung");
  assert.equal(werbekanalErlaubt(k, h("andere Person"), "werbeanruf"), false, "gilt nur für dieses Pseudonym");
  assert.equal(werbekanalErlaubt(k, ps, "weitergabe_partner"), false, "gilt nur für diesen Zweck");
  anhaengen(k, basis({ art: "widerruf", textHash: "", textId: "widerruf", kanal: "telefon" }));
  assert.equal(werbekanalErlaubt(k, ps, "werbeanruf"), false, "nach Widerruf");
  assert.equal(kanalAmpel(k, ps, "werbeanruf").stand, "widerrufen");
  assert.throws(() => werbekanalSicherstellen(k, ps, "werbeanruf"), (e) => e.status === 403 && e.code === "einwilligung_fehlt" && !e.message.includes(ps));
  anhaengen(k, basis());
  assert.equal(werbekanalErlaubt(k, ps, "werbeanruf"), true, "erneute Einwilligung nach Widerruf");
});

test("(c) Newsletter/Bericht erst nach Double-Opt-in; DOI ohne Einwilligung gilt nicht", () => {
  const k = [];
  anhaengen(k, basis({ art: "doi", zweck: "bericht", textId: "bericht_doi", kanal: "doi_link" }));
  assert.equal(werbekanalErlaubt(k, ps, "bericht"), false, "DOI ohne vorherige Einwilligung");
  anhaengen(k, basis({ zweck: "newsletter", textId: "newsletter" }));
  assert.equal(kanalAmpel(k, ps, "newsletter").stand, "doi_ausstehend");
  assert.equal(werbekanalErlaubt(k, ps, "newsletter"), false);
  anhaengen(k, basis({ art: "doi", zweck: "newsletter", textId: "newsletter_doi", kanal: "doi_link" }));
  assert.equal(werbekanalErlaubt(k, ps, "newsletter"), true);
  assert.equal(werbekanalErlaubt(k, ps, "anfrage"), false, "kein Werbe-Zweck");
});

test("Häkchen aus hinweise.js: drei getrennte Zwecke, keine Vorbelegung", () => {
  assert.deepEqual(EINWILLIGUNGEN.map((e) => zweckFuer(e.id)), ["werbeanruf", "newsletter", "weitergabe_partner"]);
  assert.equal(zweckFuer("unbekannt"), "");
  for (const e of EINWILLIGUNGEN) assert.ok(!("vorbelegt" in e) && !("standard" in e), "kein Standardwert");
});

test("IP kürzen und Fristen", () => {
  assert.equal(ipKuerzen("203.0.113.77"), "203.0.113.0");
  assert.equal(ipKuerzen("::ffff:198.51.100.9"), "198.51.100.0");
  assert.equal(ipKuerzen("2001:db8:85a3:8d3:1319:8a2e:370:7348"), "2001:db8:85a3::");
  assert.equal(ipKuerzen("2001:db8::1"), "2001:db8:0::");
  assert.equal(ipKuerzen("999.1.1.1"), "");
  assert.equal(ipKuerzen("unbekannt"), "");
  assert.equal(ipKuerzen(""), "");
  assert.equal(ipLoeschenAb("2026-10-01T00:00:00.000Z"), "2026-10-31T00:00:00.000Z");
  assert.equal(nachweisBis("2026-10-01T00:00:00.000Z"), `${2026 + NACHWEIS_FRIST_JAHRE}-10-01T00:00:00.000Z`);
});

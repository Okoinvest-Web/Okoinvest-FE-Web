// Paket C (Welle 1): Länderlogik, Hinweis/Einwilligungen, Server-Zähler – reine Funktionen.
//
//   node --import ./src/lib/ereignis/tests/registrieren.mjs --test "src/lib/anfrage/tests/*.test.mjs"

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { anfrageLand, grundstueck, landAusDaten, landNormal, plzPasst } from "../laender.js";
import { EINWILLIGUNGEN, HINWEIS, einwilligungenAufbereiten, einwilligungenFuer, hinweisText } from "../hinweise.js";
import { _zaehlerLeeren, anfrageZaehlen, zaehlerSchluessel, zaehlerStand } from "../zaehler.js";

const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");

test("Land: Formular schlägt Kontext, Kontext schlägt PLZ", () => {
  assert.equal(anfrageLand({ land: "AT" }, { land: "CH" }), "AT");
  assert.equal(anfrageLand({}, { land: "AT", region: "salzburg" }), "AT"); // Regionsseite
  assert.equal(anfrageLand({}, { eingaben: { land: "CH" } }), "CH"); // Flächencheck
  assert.equal(anfrageLand({ land: "at" }, {}), "AT");
  assert.equal(anfrageLand({ plz: "87719" }, {}), "DE");
  assert.equal(anfrageLand({ plz: "5020" }, {}), "", "4 Ziffern sind nicht eindeutig (AT oder CH)");
  assert.equal(anfrageLand({ land: "FR" }, { land: "XX" }), "");
  assert.equal(landNormal(" ch "), "CH");
  assert.equal(landAusDaten(null), "");
});

test("PLZ-Regel je Land: DE 5, AT 4, CH 4 Ziffern; unbekannt tolerant", () => {
  assert.ok(plzPasst("AT", "5020"));
  assert.ok(plzPasst("CH", "8001"));
  assert.ok(plzPasst("DE", "87719"));
  assert.ok(!plzPasst("DE", "5020"));
  assert.ok(!plzPasst("AT", "87719"));
  assert.ok(!plzPasst("CH", "80011"));
  assert.ok(plzPasst("", "5020") && plzPasst("", "87719") && !plzPasst("", "123"));
  assert.ok(plzPasst("AT", ""), "leere PLZ ist erlaubt");
});

test("Begriff Grundstück je Land: kein „Flurstück“ in AT/CH", () => {
  assert.equal(grundstueck("DE").einzahl, "Flurstück");
  assert.equal(grundstueck("AT").einzahl, "Grundstücksnummer");
  assert.equal(grundstueck("CH").einzahl, "Parzelle");
  for (const l of ["AT", "CH"]) assert.ok(!/flurst/i.test(Object.values(grundstueck(l)).join(" ")), l);
});

test("Einwilligungen: getrennt, optional, Partner bleibt aus, Telefon-Häkchen nur mit Telefonfeld", () => {
  const mit = einwilligungenFuer({ mitTelefon: true }).map((e) => e.id);
  const ohne = einwilligungenFuer({ mitTelefon: false }).map((e) => e.id);
  assert.deepEqual(mit, ["werbeanruf", "newsletter"]);
  assert.deepEqual(ohne, ["newsletter"]);
  assert.ok(!mit.includes("partner"), "Partner-Häkchen erst mit benannten Partnern (Strang R)");
  for (const e of EINWILLIGUNGEN) assert.match(e.version, /^ENTWURF-/, "Texte sind als Entwurf markiert");
  assert.match(HINWEIS.version, /^ENTWURF-/);
  assert.equal(HINWEIS.text, `${HINWEIS.kern} ${HINWEIS.verweisVor} ${HINWEIS.verweisLink}.`);
});

test("Einwilligungen aufbereiten: nur true, nur bekannte/aktive, Hash über den gezeigten Wortlaut", () => {
  const am = "2026-10-03T10:00:00.000Z";
  assert.deepEqual(einwilligungenAufbereiten(undefined, { hash: sha256, am, telefon: "" }), []);
  assert.deepEqual(einwilligungenAufbereiten({ werbeanruf: "true", newsletter: 1, partner: true, erfunden: true }, { hash: sha256, am, telefon: "+43 1 234567" }), []);
  const r = einwilligungenAufbereiten({ werbeanruf: true, newsletter: true }, { hash: sha256, am, telefon: "+43 1 234567" });
  assert.deepEqual(r.map((x) => x.id), ["werbeanruf", "newsletter"]);
  assert.equal(r[0].textHash, sha256(EINWILLIGUNGEN[0].text));
  assert.equal(r[1].doi, "ausstehend", "Newsletter erst nach Double-Opt-in");
  // Werbeanruf ohne Telefonnummer ist sinnlos → verworfen
  assert.deepEqual(einwilligungenAufbereiten({ werbeanruf: true }, { hash: sha256, am, telefon: "" }), []);
  // englischer Wortlaut → eigener Hash
  const en = einwilligungenAufbereiten({ newsletter: true }, { hash: sha256, am, telefon: "", sprache: "en" });
  assert.equal(en[0].sprache, "en");
  assert.notEqual(en[0].textHash, r[1].textHash);
  assert.notEqual(hinweisText("en"), hinweisText("de"));
});

test("Server-Zähler: ohne Kennung, nur grobe Merkmale", () => {
  _zaehlerLeeren();
  const s = anfrageZaehlen({ ereignis: "angelegt", typ: "flaeche", land: "AT", kanal: "KI-Assistent", email: "x@y.de", ip: "1.2.3.4" }, { log: false });
  assert.deepEqual(Object.keys(s).sort(), ["ereignis", "kanal", "land", "tag", "typ"]);
  assert.match(s.tag, /^\d{4}-\d{2}-\d{2}$/);
  const unsauber = zaehlerSchluessel({ ereignis: "angelegt", typ: "<script>", land: "FR", kanal: "https://chatgpt.com/x?id=1" });
  assert.deepEqual([unsauber.typ, unsauber.land, unsauber.kanal], ["?", "?", "?"]);
  anfrageZaehlen({ ereignis: "angelegt", typ: "flaeche", land: "AT", kanal: "KI-Assistent" }, { log: false });
  const stand = zaehlerStand();
  assert.equal(Object.values(stand)[0], 2);
  assert.ok(!JSON.stringify(stand).includes("@") && !JSON.stringify(stand).includes("1.2.3.4"));
});

test("Welle 2 (GRP/B3): Zähler kennt die Kanäle „Gruppe“ und „Partner“, alles Unbekannte bleibt „?“", () => {
  assert.equal(zaehlerSchluessel({ ereignis: "angelegt", typ: "flaeche", land: "AT", kanal: "Gruppe", tag: "2026-10-03" }).kanal, "Gruppe");
  assert.equal(zaehlerSchluessel({ ereignis: "angelegt", typ: "flaeche", land: "AT", kanal: "Partner", tag: "2026-10-03" }).kanal, "Partner");
  assert.equal(zaehlerSchluessel({ ereignis: "angelegt", typ: "flaeche", land: "AT", kanal: "beispiel-installateur-de", tag: "2026-10-03" }).kanal, "?", "keine Kennung im Zähler");
});

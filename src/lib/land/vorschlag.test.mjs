// Ländervorschlag, Länderwahl-Cookie und Navigation je Land (Welle 2)
import { test } from "node:test";
import assert from "node:assert/strict";
import { LAND_COOKIE, landAusCookie, landAusSprache, landCookieZeile, landVorschlag } from "./index.js";
import { navLink, navigationFuer } from "./navigation.js";

test("Accept-Language: Region nach q-Wert, sonst nichts", () => {
  assert.equal(landAusSprache("de-AT,de;q=0.9,en;q=0.8"), "AT");
  assert.equal(landAusSprache("de;q=0.9,de-CH;q=0.8"), "CH");
  assert.equal(landAusSprache("en-US,de-DE;q=0.5"), "DE");
  assert.equal(landAusSprache("de-DE;q=0.2,de-AT;q=0.7"), "AT");
  assert.equal(landAusSprache("de"), null);
  assert.equal(landAusSprache("fr-FR,en"), null);
  assert.equal(landAusSprache(""), null);
  assert.equal(landAusSprache(null), null);
  assert.equal(landAusSprache("de-AT;q=0"), null, "q=0 heißt: nicht gewünscht");
});

test("Vorschlag: Sprache vor Geo-Header; nur DE/AT/CH; nie eine Weiterleitung", () => {
  assert.deepEqual(landVorschlag({ acceptLanguage: "de-CH", geo: "AT" }), { vorschlag: "CH", quelle: "sprache" });
  assert.deepEqual(landVorschlag({ acceptLanguage: "de", geo: "at" }), { vorschlag: "AT", quelle: "geo" });
  assert.deepEqual(landVorschlag({ acceptLanguage: "de", geo: "FR" }), { vorschlag: null, quelle: null });
  assert.deepEqual(landVorschlag({}), { vorschlag: null, quelle: null });
  for (const k of Object.keys(landVorschlag({ acceptLanguage: "de-AT" }))) assert.ok(["vorschlag", "quelle"].includes(k));
});

test("Cookie „land“: lesen nur gültiger Werte, Zeile nur für gültige Länder", () => {
  assert.equal(LAND_COOKIE, "land");
  assert.equal(landAusCookie("a=1; land=AT; b=2"), "AT");
  assert.equal(landAusCookie("land=xx"), null);
  assert.equal(landAusCookie("landx=AT"), null);
  assert.equal(landAusCookie(""), null);
  assert.match(landCookieZeile("ch"), /^land=CH; Path=\/; Max-Age=\d+; SameSite=Lax; Secure$/);
  assert.equal(landCookieZeile("ch", { https: false }).includes("Secure"), false);
  assert.equal(landCookieZeile("<script>"), null);
});

test("Navigation je Land: fehlende Seiten mit sichtbarem „gilt für …“, Stamm unverändert", () => {
  const alleItems = (nav) => nav.flatMap((n) => n.groups.flatMap((g) => g.items));
  const de = alleItems(navigationFuer("DE"));
  const at = alleItems(navigationFuer("AT"));
  const ch = alleItems(navigationFuer("CH"));
  const finde = (liste, name) => liste.find((i) => i.name === name);
  assert.equal(finde(de, "Pachtrechner").href, "/de/rechner/pacht");
  assert.equal(finde(de, "Pachtrechner").giltFuer, null);
  assert.equal(finde(at, "Pachtrechner").href, "/de/rechner/pacht");
  assert.equal(finde(at, "Pachtrechner").giltFuer, "für Deutschland");
  assert.equal(finde(at, "Flächencheck").href, "/at/flaechencheck");
  assert.equal(finde(at, "Flächencheck").giltFuer, null);
  assert.equal(finde(ch, "Flächencheck").href, "/de/flaechencheck");
  assert.equal(finde(de, "Software für Energiegemeinschaften").href, "/at/energiegemeinschaften/software");
  assert.equal(finde(de, "Software für Energiegemeinschaften").giltFuer, "für Österreich");
  assert.equal(finde(at, "Investoren").href, "/investoren");
  assert.equal(finde(at, "Ratgeber").href, "/wissen/ratgeber");
  for (const i of [...de, ...at, ...ch]) assert.match(i.href, /^\//, `${i.name}: ${i.href}`);
  assert.deepEqual(navLink("/kontakt", "CH"), { href: "/kontakt", giltFuer: null });
});

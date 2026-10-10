// Sprachmodell: URL-Struktur, Sprachwechsel, Wörterbuch, Register, canonical/hreflang, Sitemap, Routen
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../../data/site.js";
import { SEITEN, alternates, entsprechung, fassungIndexierbar, hreflang, sprachEntsprechung } from "../land/index.js";
import { seitenEintraege } from "../land/sitemaps.js";
import { UMZUG, treffer, zielFuer } from "../land/umzug.js";
import { EN_LAENDERINHALT, UEBERSETZT, fehlendeTexte, inhaltFuerSprache, ohneSprache, sprachCookieZeile, spracheAusCookie, spracheAusPfad, uebersetze, uebersetzt, zusammenfuehren } from "./index.js";
import { startseitenZiel } from "../land/vorschlag.js";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const abs = (p) => `${SITE.url}${p === "/" ? "" : p}`;

test("Sprache aus Pfad und Präfix", () => {
  assert.equal(spracheAusPfad("/en"), "en");
  assert.equal(spracheAusPfad("/en/at/x"), "en");
  assert.equal(spracheAusPfad("/energie-live"), "de");
  assert.equal(ohneSprache("/en"), "/");
  assert.equal(ohneSprache("/en/at/x"), "/at/x");
  assert.equal(ohneSprache("/en?x=1"), "/?x=1");
});

test("Sprachwechsler: dieselbe Seite im selben Land, Seiten ohne Fassung → Startseite der Sprache", () => {
  assert.deepEqual(sprachEntsprechung("/at/freiflaeche", "en"), { href: "/en/at/freiflaeche", art: "entsprechung" });
  assert.deepEqual(sprachEntsprechung("/en/at/freiflaeche", "de"), { href: "/at/freiflaeche", art: "entsprechung" });
  assert.deepEqual(sprachEntsprechung("/", "en"), { href: "/en", art: "entsprechung" });
  assert.deepEqual(sprachEntsprechung("/en", "de"), { href: "/", art: "entsprechung" });
  assert.deepEqual(sprachEntsprechung("/login", "en"), { href: "/en", art: "einstieg" });
  assert.deepEqual(entsprechung("/en/rechner/pacht", "AT"), { href: "/en/at/rechner/pacht", art: "entsprechung" });
});

test("Cookie „sprache“: nur gültige Werte", () => {
  assert.equal(spracheAusCookie("a=1; sprache=en"), "en");
  assert.equal(spracheAusCookie("sprache=fr"), null);
  assert.match(sprachCookieZeile("en"), /^sprache=en; Path=\/; Max-Age=\d+; SameSite=Lax; Secure$/);
  assert.equal(sprachCookieZeile("xx"), null);
});

test("Startseite: Weiterleitung nur mit gespeicherter Wahl (Land und/oder Sprache)", () => {
  assert.equal(startseitenZiel(undefined, undefined), null);
  assert.equal(startseitenZiel("AT", undefined), "/at");
  assert.equal(startseitenZiel(undefined, "en"), "/en");
  assert.equal(startseitenZiel("CH", "en"), "/en/ch");
  assert.equal(startseitenZiel(undefined, "de"), null);
  assert.equal(startseitenZiel("XX", "fr"), null);
});

test("Wörterbuch: Rückfall Deutsch, tiefe Zusammenführung, Listen je Index, Funktionen", () => {
  const Icon = () => null;
  const T = { de: { a: "Hallo", b: { c: "Welt", icon: Icon }, l: [{ k: "eins", href: "/x" }, { k: "zwei", href: "/y" }], n: 5 }, en: { a: "Hello", l: [{ k: "one" }], n: (x) => x * 2 } };
  const en = uebersetze(T, "en");
  assert.equal(en.a, "Hello");
  assert.equal(en.b.c, "Welt", "fehlender Schlüssel → Deutsch");
  assert.equal(en.b.icon, Icon);
  assert.deepEqual(en.l, [{ k: "one", href: "/x" }, { k: "zwei", href: "/y" }]);
  assert.equal(en.n, 10);
  assert.equal(uebersetze(T, "de"), T.de);
  assert.equal(uebersetze({ de: 1 }, "en"), 1);
  assert.throws(() => uebersetze({ en: 1 }, "en"), /de/);
  assert.deepEqual(fehlendeTexte(T.de, T.en), ["b.c", "l.1.k"]);
  assert.deepEqual(zusammenfuehren([1, 2], undefined), [1, 2]);
});

test("Länder UND Sprache: ohne englische Länderfassung bleibt der deutsche Länderinhalt", () => {
  const I = { de: { gemeinsam: { t: "DACH" }, AT: { t: "EAG" } }, en: { gemeinsam: { t: "DACH en" } } };
  assert.deepEqual(inhaltFuerSprache(I, null, "en"), { t: "DACH en" });
  assert.deepEqual(inhaltFuerSprache(I, "DE", "en"), { t: "DACH en" });
  assert.deepEqual(inhaltFuerSprache(I, "AT", "en"), { t: "EAG" }, "nie englischer Gemeinsam-Text auf AT");
  assert.deepEqual(inhaltFuerSprache({ ...I, en: { ...I.en, AT: { t: "EAG en" } } }, "AT", "en"), { t: "EAG en" });
  assert.deepEqual(inhaltFuerSprache(I, "AT", "de"), { t: "EAG" });
});

test("Register UEBERSETZT: nur Seiten aus dem Register, jeder Eintrag mit Vermerk", () => {
  for (const [k, v] of Object.entries(UEBERSETZT)) {
    assert.ok(Object.hasOwn(SEITEN, k), `${k} nicht im Register`);
    assert.ok(v.stand && v.grundlage && v.pruefer, `${k}: Vermerk unvollständig`);
  }
  for (const l of Object.keys(EN_LAENDERINHALT)) for (const k of Object.keys(EN_LAENDERINHALT[l])) assert.ok(UEBERSETZT[k], `${l} ${k}: nicht übersetzt`);
  assert.equal(uebersetzt("/"), true);
  assert.equal(uebersetzt("/ratgeber/moor-pv"), false);
  assert.equal(uebersetzt("/ratgeber/solarpark-pacht-pro-hektar"), true, "einzeln freigegebener Artikel");
});

test("canonical, noindex und hreflang der englischen Fassungen", () => {
  // übersetzt: eigenes canonical, im Cluster, indexierbar
  assert.deepEqual(hreflang("/"), { de: abs("/"), en: abs("/en"), "x-default": abs("/") });
  assert.deepEqual(alternates("/", null, { sprache: "en" }), { canonical: abs("/en"), languages: hreflang("/") });
  assert.deepEqual(alternates("/"), { canonical: abs("/"), languages: hreflang("/") }, "wechselseitig");
  assert.equal(fassungIndexierbar("/", null, "en"), true);
  // englische Länderfassung ohne EN-Länderinhalt: noindex, ohne Cluster
  assert.deepEqual(alternates("/", "AT", { sprache: "en" }), { canonical: abs("/en/at") });
  assert.equal(fassungIndexierbar("/", "AT", "en"), false);
  // nicht übersetzt: noindex, canonical auf sich selbst
  assert.deepEqual(alternates("/ratgeber/moor-pv", null, { sprache: "en" }), { canonical: abs("/en/ratgeber/moor-pv") });
  assert.equal(fassungIndexierbar("/ratgeber/moor-pv", null, "en"), false);
  assert.equal(fassungIndexierbar("/marktdaten/fristen", null, "en"), false);
});

test("Sitemap: englische Fassungen nur, wenn übersetzt", () => {
  const pfade = seitenEintraege().map((x) => new URL(x.url).pathname);
  assert.ok(pfade.includes("/en"));
  assert.ok(pfade.includes("/en/rechner/pacht"), "übersetzter Rechner in der Sitemap");
  assert.ok(!pfade.includes("/en/marktdaten/fristen") && !pfade.includes("/en/at") && !pfade.includes("/en/investors"));
  const en = seitenEintraege().find((x) => x.url === abs("/en"));
  assert.deepEqual(en.alternates.languages, hreflang("/"));
});

test("alte englische Adressen: 308 ohne Kette auf /en/<deutscher Pfad>", () => {
  for (const [alt, neu] of [["/en/investors", "/en/investoren"], ["/en/project-exchange", "/en/projektboerse"], ["/en/sell-your-project", "/en/projektboerse/anbieten"], ["/en/contact", "/en/kontakt"]]) {
    const t = treffer(alt);
    assert.equal(t.length, 1, alt);
    assert.equal(zielFuer(t[0], alt), neu);
    assert.equal(treffer(neu).length, 0, `${neu}: Kette`);
  }
  assert.ok(UMZUG.every((r) => r.permanent === true));
});

test("englische Routen: jede Seite unter /en und /en/[land], reine Weiterleitung auf dieselbe Seite", () => {
  const APP = join(WURZEL, "src", "app");
  const seiten = (dir, l = []) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) seiten(p, l);
      else if (n === "page.js") l.push(p);
    }
    return l;
  };
  const EN = join(APP, "(en)", "en");
  for (const k of Object.keys(SEITEN)) {
    for (const basis of [EN, join(EN, "[land]")]) {
      const d = join(basis, ...(k === "/" ? [] : k.slice(1).split("/")), "page.js");
      assert.ok(existsSync(d), `${relative(APP, d)} fehlt`);
      const q = readFileSync(d, "utf8");
      assert.match(q, basis === EN ? /^export default englisch\(Seite\);$/m : /^export default landSeite\(englisch\(Seite\)\);$/m); // Land: Schweiz ohne „ß“ (LandSeite.js)
      assert.match(q, new RegExp(`from "@/app/\\(stamm\\)${k === "/" ? "" : k.replace(/[[\]]/g, "\\$&")}/page";`));
    }
  }
  // Einzige Ausnahme: der 404-Fänger /en/[land]/[...unbekannt] (W3-0) – rendert nie Inhalt, nur notFound().
  const faenger = join(EN, "[land]", "[...unbekannt]", "page.js");
  const alle = seiten(EN);
  assert.ok(alle.includes(faenger), "404-Fänger /en/[land]/[...unbekannt] fehlt");
  const fq = readFileSync(faenger, "utf8");
  assert.match(fq, /notFound\(\);/);
  assert.doesNotMatch(fq, /englisch\(|from "@\/app\/\(stamm\)/, "404-Fänger darf keine Seite rendern");
  assert.equal(alle.filter((p) => p !== faenger).length, Object.keys(SEITEN).length * 2, "keine eigenen englischen Seiten außerhalb des Registers");
  const layout = readFileSync(join(APP, "(en)", "layout.js"), "utf8");
  assert.match(layout, /<Wurzel lang="en" sprache="en" land=\{LAND_AUS_PFAD\}>/);
  assert.match(readFileSync(join(EN, "[land]", "layout.js"), "utf8"), /generateStaticParams\(\)[\s\S]*LAND_CODES/);
});

test("inhaltFuerSprache: englische gemeinsame Werte überschreiben nie einen Länderwert (QM)", () => {
  const I = {
    de: { gemeinsam: { fakt: { wert: "90", text: "DE" }, titel: "Titel" }, AT: { fakt: { wert: "0", text: "EAG" } } },
    en: { gemeinsam: { fakt: { wert: "90", text: "DE en" }, titel: "Title" }, AT: { fakt: { text: "EAG en" } } },
  };
  assert.deepEqual(inhaltFuerSprache(I, "AT", "en"), { fakt: { wert: "0", text: "EAG en" }, titel: "Title" });
  assert.deepEqual(inhaltFuerSprache(I, null, "en"), { fakt: { wert: "90", text: "DE en" }, titel: "Title" });
});

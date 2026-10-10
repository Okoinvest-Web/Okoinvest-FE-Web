// Ländermodell: Pfade, Länderwechsel, canonical/hreflang, noindex-Register und Länderinhalte
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE } from "../../data/site.js";
import {
  LAENDERINHALT,
  LAND_CODES,
  SEITEN,
  alternates,
  eigenerInhalt,
  entsprechung,
  hatLandfassung,
  hreflang,
  htmlLang,
  indexierbar,
  inhaltFuer,
  landAusPfad,
  landHinweisText,
  ohneLand,
  pfad,
  seiteFuer,
  zahlenModus,
} from "./index.js";

const abs = (p) => `${SITE.url}${p === "/" ? "" : p}`;

test("pfad(): gemeinsam ohne Präfix, Land mit Präfix, Bereiche ohne Länderfassung unverändert", () => {
  assert.equal(pfad("/rechner/pacht"), "/rechner/pacht");
  assert.equal(pfad("/rechner/pacht", null), "/rechner/pacht");
  assert.equal(pfad("/rechner/pacht", "AT"), "/at/rechner/pacht");
  assert.equal(pfad("/rechner/pacht", "at"), "/at/rechner/pacht");
  assert.equal(pfad("/", "CH"), "/ch");
  assert.equal(pfad("/", null), "/");
  assert.equal(pfad("/flaechencheck?x=1#check", "DE"), "/de/flaechencheck?x=1#check");
  assert.equal(pfad("/regionen/tirol", "DE"), "/de/regionen/tirol");
  assert.equal(pfad("/ratgeber/moor-pv", "AT"), "/at/ratgeber/moor-pv");
  assert.equal(pfad("/projektboerse/solarpark-x", "CH"), "/ch/projektboerse/solarpark-x");
  for (const p of ["/portal", "/portal/boerse", "/login", "/registrieren", "/einladung/abc", "/api/rechner/bericht", "/en/investors", "/angebot/x", "/termin/verwalten", "/design"]) {
    assert.equal(pfad(p, "AT"), p, p);
  }
  assert.equal(pfad("https://example.org/de/x", "AT"), "https://example.org/de/x");
  assert.equal(pfad("#anfrage", "AT"), "#anfrage");
  assert.equal(pfad("/unbekannt", "AT"), "/unbekannt", "unbekannte Pfade bleiben, wie sie sind");
  // Welle-2-Name und vorhandenes Präfix
  assert.equal(pfad("/wissen/ratgeber/moor-pv"), "/ratgeber/moor-pv");
  assert.equal(pfad("/de/rechner/pacht", "AT"), "/at/rechner/pacht");
  assert.equal(pfad("/de/rechner/pacht"), "/rechner/pacht");
  // Sprachmodell: Sprache vor Land vor Seite
  assert.equal(pfad("/rechner/pacht", null, "en"), "/en/rechner/pacht");
  assert.equal(pfad("/rechner/pacht", "AT", "en"), "/en/at/rechner/pacht");
  assert.equal(pfad("/", null, "en"), "/en");
  assert.equal(pfad("/", "CH", "en"), "/en/ch");
  assert.equal(pfad("/en", "AT"), "/en/at", "Sprache des Pfades bleibt, Land wird gesetzt");
  assert.equal(pfad("/en/at/freiflaeche"), "/en/freiflaeche");
  assert.equal(pfad("/en/at/freiflaeche", "AT", "de"), "/at/freiflaeche");
  assert.equal(pfad("/portal", "AT", "en"), "/portal");
  assert.equal(pfad("/wissen/ratgeber/moor-pv", "DE", "en"), "/en/de/ratgeber/moor-pv");
});

test("jede öffentliche Seite hat eine Länderfassung, geschlossene Bereiche nicht", () => {
  for (const k of Object.keys(SEITEN)) {
    const konkret = k.replace("[slug]", k.startsWith("/regionen") ? "tirol" : "beispiel");
    assert.ok(hatLandfassung(konkret), konkret);
    assert.equal(ohneLand(konkret), false, konkret);
  }
  for (const p of ["/portal", "/login", "/en", "/api", "/bericht/x", "/p/abc"]) {
    assert.equal(hatLandfassung(p), false, p);
    assert.equal(ohneLand(p), true, p);
  }
  assert.equal(seiteFuer("/regionen/gibt-es-nicht"), null);
});

test("landAusPfad(): Land und Schlüssel", () => {
  assert.deepEqual(landAusPfad("/at/rechner/pacht"), { sprache: "de", land: "AT", schluessel: "/rechner/pacht" });
  assert.deepEqual(landAusPfad("/ch"), { sprache: "de", land: "CH", schluessel: "/" });
  assert.deepEqual(landAusPfad("/de/"), { sprache: "de", land: "DE", schluessel: "/" });
  assert.deepEqual(landAusPfad("/rechner/pacht?x"), { sprache: "de", land: null, schluessel: "/rechner/pacht" });
  assert.deepEqual(landAusPfad("/deutschland"), { sprache: "de", land: null, schluessel: "/deutschland" });
  assert.deepEqual(landAusPfad("/en"), { sprache: "en", land: null, schluessel: "/" });
  assert.deepEqual(landAusPfad("/en/at/rechner/pacht"), { sprache: "en", land: "AT", schluessel: "/rechner/pacht" });
  assert.deepEqual(landAusPfad("/energie-live"), { sprache: "de", land: null, schluessel: "/energie-live" }, "/energie… ist kein Sprachpräfix");
});

test("Länderwechsler: dieselbe Seite im anderen Land, sonst Startseite des Landes", () => {
  assert.deepEqual(entsprechung("/rechner/pacht", "AT"), { href: "/at/rechner/pacht", art: "entsprechung" });
  assert.deepEqual(entsprechung("/at/rechner/pacht", "CH"), { href: "/ch/rechner/pacht", art: "entsprechung" });
  assert.deepEqual(entsprechung("/", "DE"), { href: "/de", art: "entsprechung" });
  assert.deepEqual(entsprechung("/at", "CH"), { href: "/ch", art: "entsprechung" });
  assert.deepEqual(entsprechung("/regionen/tirol", "DE"), { href: "/de/regionen/tirol", art: "entsprechung" });
  assert.deepEqual(entsprechung("/login", "AT"), { href: "/at", art: "einstieg" });
  assert.deepEqual(entsprechung("/en/investors", "CH"), { href: "/en/ch", art: "einstieg" });
  assert.deepEqual(entsprechung("/en/at/freiflaeche", "CH"), { href: "/en/ch/freiflaeche", art: "entsprechung" }, "Sprache bleibt");
});

test("noindex-Register: Länderfassungen nur mit eigenem Inhalt indexierbar", () => {
  for (const k of Object.keys(SEITEN).filter((x) => !SEITEN[x].dynamisch)) {
    assert.equal(indexierbar(k), SEITEN[k].index !== false, `gemeinsam ${k}`);
    for (const l of LAND_CODES) assert.equal(indexierbar(k, l), SEITEN[k].index !== false && Object.hasOwn(LAENDERINHALT[l], k), `${l} ${k}`);
  }
  assert.equal(indexierbar("/flaechencheck", "AT"), true);
  assert.equal(indexierbar("/flaechencheck", "CH"), false);
  assert.equal(indexierbar("/rechner/pacht", "DE"), false, "ohne eigenen DE-Inhalt: noindex, die gemeinsame Seite ist indexiert");
  assert.equal(indexierbar("/marktdaten/fristen"), false);
  // jeder Eintrag trägt einen Freigabe-Vermerk
  for (const l of LAND_CODES) {
    for (const [k, v] of Object.entries(LAENDERINHALT[l])) {
      assert.ok(Object.hasOwn(SEITEN, k), `${l}: ${k} nicht im Register`);
      assert.ok(v.stand && v.grundlage && v.pruefer, `${l} ${k}: Vermerk unvollständig`);
    }
  }
});

test("canonical und hreflang: x-default = gemeinsame Seite, nur Länder mit eigenem Inhalt, wechselseitig", () => {
  const cluster = hreflang("/flaechencheck");
  // Seit Gruppe 2 übersetzt: englische Fassung und englische AT-Fassung (EN_LAENDERINHALT) im Cluster
  assert.deepEqual(cluster, {
    de: abs("/flaechencheck"),
    "de-AT": abs("/at/flaechencheck"),
    en: abs("/en/flaechencheck"),
    "en-AT": abs("/en/at/flaechencheck"),
    "x-default": abs("/flaechencheck"),
  });
  assert.deepEqual(alternates("/flaechencheck"), { canonical: abs("/flaechencheck"), languages: cluster });
  assert.deepEqual(alternates("/flaechencheck", "AT"), { canonical: abs("/at/flaechencheck"), languages: cluster });
  assert.deepEqual(alternates("/flaechencheck", "CH"), { canonical: abs("/ch/flaechencheck") }, "noindex-Fassung ohne Cluster");
  // Seite ohne Länderinhalt und ohne englische Fassung im Cluster (noindex-Entwurf)
  assert.deepEqual(alternates("/marktdaten/fristen"), { canonical: abs("/marktdaten/fristen") });
  assert.deepEqual(alternates("/rechner/pacht", "DE"), { canonical: abs("/de/rechner/pacht") });
  // Sprachpaar der Basis-Metadaten (de/en) bleibt erhalten
  const mitEn = alternates("/", null, { languages: { de: abs("/"), en: abs("/en"), "x-default": abs("/") } });
  assert.deepEqual(mitEn, { canonical: abs("/"), languages: { de: abs("/"), en: abs("/en"), "x-default": abs("/") } });
  // wechselseitig: jedes Mitglied eines Clusters liefert dieselbe Tabelle
  for (const k of Object.keys(SEITEN).filter((x) => !SEITEN[x].dynamisch)) {
    const t = hreflang(k);
    for (const l of LAND_CODES) if (eigenerInhalt(k, l)) assert.deepEqual(alternates(k, l).languages, t, `${l} ${k}`);
  }
});

test("html lang: gemeinsam de, Länder de-DE/de-AT/de-CH", () => {
  assert.equal(htmlLang(null), "de");
  assert.equal(htmlLang("AT"), "de-AT");
  assert.equal(htmlLang("ch"), "de-CH");
});

test("Länderinhalte: inhaltFuer mit Rückfall auf gemeinsam, zahlenModus, Hinweistext", () => {
  const T = { gemeinsam: { titel: "DACH", lead: "allgemein" }, AT: { lead: "EAG" }, CH: "nur Text" };
  assert.deepEqual(inhaltFuer(T, null), { titel: "DACH", lead: "allgemein" });
  assert.deepEqual(inhaltFuer(T, "DE"), { titel: "DACH", lead: "allgemein" }, "DE ohne Eintrag = gemeinsam");
  assert.deepEqual(inhaltFuer(T, "AT"), { titel: "DACH", lead: "EAG" });
  assert.equal(inhaltFuer(T, "CH"), "nur Text");
  assert.equal(inhaltFuer({ gemeinsam: 1, AT: 2 }, "at"), 2);
  assert.throws(() => inhaltFuer({ AT: 1 }, "AT"), /gemeinsam/);
  assert.equal(zahlenModus(null), "gemeinsam");
  assert.equal(zahlenModus("DE"), "zeigen");
  assert.equal(zahlenModus("AT"), "hinweis");
  assert.equal(zahlenModus("CH", ["DE", "CH"]), "zeigen");
  assert.equal(landHinweisText("CH"), "Rechenwerte für die Schweiz werden geprüft – Ergebnis auf Anfrage");
  assert.equal(landHinweisText("AT", "Pachtwerte"), "Pachtwerte für Österreich werden geprüft – Ergebnis auf Anfrage");
});

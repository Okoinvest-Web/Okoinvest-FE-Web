// Ländermodell: Adressen von vor Welle 2 bleiben ohne Weiterleitung erreichbar; nur
// Welle-2-Adressen leiten per 308 um – ohne Ketten, ohne Schleifen, nur interne Ziele.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { UMZUG, treffer, zielFuer } from "./umzug.js";
import { hatLandfassung, landAusPfad } from "./index.js";

const ALT = JSON.parse(readFileSync(new URL("../../../test/land/alte-sitemap.json", import.meta.url), "utf8")).pfade;

// Ausnahme laut Entscheidung 2: die alten englischen Adressen (/en/investors …) leiten auf /en/<deutscher Pfad> um.
const EN_ALT_QUELLEN = new Set(["/en/investors", "/en/project-exchange", "/en/sell-your-project", "/en/contact"]);

test("Pfade von vor Welle 2: keine Weiterleitung, jede Seite hat ihre Länder- und Sprachfassung", () => {
  for (const p of ALT) {
    if (EN_ALT_QUELLEN.has(p)) continue;
    assert.equal(treffer(p).length, 0, `${p} darf nicht umgeleitet werden (gemeinsame Seite wie vor Welle 2)`);
    assert.ok(hatLandfassung(landAusPfad(p).schluessel), `${p}: keine Länderfassung`);
  }
});

test("Welle-2-Adressen: genau eine 308-Weiterleitung auf die neue Adresse", () => {
  const fall = (q, ziel) => {
    const t = treffer(q);
    assert.equal(t.length, 1, `${q}: ${t.length} Regeln`);
    assert.equal(t[0].permanent, true);
    assert.equal(zielFuer(t[0], q), ziel);
  };
  fall("/wissen/ratgeber", "/ratgeber");
  fall("/wissen/ratgeber/moor-pv", "/ratgeber/moor-pv");
  fall("/ch/marktzugang-check", "/ch");
  fall("/ch/parzellen-vorpruefung", "/ch");
  // alte englische Adressen → dieselbe Seite unter /en mit deutschem Pfad
  fall("/en/investors", "/en/investoren");
  fall("/en/project-exchange", "/en/projektboerse");
  fall("/en/sell-your-project", "/en/projektboerse/anbieten");
  fall("/en/contact", "/en/kontakt");
  for (const p of ["/en", "/en/investoren", "/en/at/freiflaeche", "/en/de"]) assert.equal(treffer(p).length, 0, p);
  // Welle-2-Länderadressen gibt es weiter (gleiche Seite, Land als Kontext) – keine Regel
  for (const p of ["/de/rechner/pacht", "/at/flaechencheck", "/at/regionen/tirol", "/de", "/at", "/ch"]) assert.equal(treffer(p).length, 0, p);
});

test("keine Ketten und keine Schleifen, nur interne Ziele mit Seite", () => {
  const quellen = new Set(UMZUG.filter((r) => !r.source.includes(":")).map((r) => r.source));
  for (const r of UMZUG) {
    const beispiel = r.source.replace(":slug", "moor-pv");
    const ziel = zielFuer(r, beispiel);
    assert.ok(ziel.startsWith("/") && !ziel.startsWith("//"), `${r.source}: externes Ziel`);
    assert.notEqual(ziel, beispiel, `${r.source}: Schleife`);
    assert.ok(!quellen.has(ziel) && treffer(ziel).length === 0, `${r.source} → ${ziel}: Kette`);
    assert.ok(hatLandfassung(landAusPfad(ziel).schluessel), `${r.source} → ${ziel}: Ziel ist keine Seite`);
  }
});

test("next.config.mjs bindet die Tabelle über redirects() ein", async () => {
  const cfg = (await import("../../../next.config.mjs")).default;
  const r = await cfg.redirects();
  assert.equal(r.length, UMZUG.length);
  assert.ok(r.every((x) => x.permanent === true));
});

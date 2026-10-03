// Tests umzug.js – Abnahme (b): jeder alte öffentliche Pfad genau eine 308-Weiterleitung, keine Ketten, keine Schleifen
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { UMZUG, treffer, zielFuer } from "./umzug.js";
import { freigegeben, landAusPfad, zoneFuer } from "./index.js";

const ALT = JSON.parse(readFileSync(new URL("../../../test/land/alte-sitemap.json", import.meta.url), "utf8")).pfade;

test("alle alten Sitemap-Pfade: Stamm bleibt, alles andere genau eine Weiterleitung", () => {
  let umgezogen = 0;
  for (const p of ALT) {
    const t = treffer(p);
    const zone = zoneFuer(p);
    if (zone !== "land" && !p.startsWith("/ratgeber")) {
      assert.equal(t.length, 0, `${p} (Stamm/ohne Präfix) darf nicht umgeleitet werden`);
      continue;
    }
    assert.equal(t.length, 1, `${p}: ${t.length} Weiterleitungen statt genau einer`);
    assert.equal(t[0].permanent, true, `${p}: muss 308 sein`);
    umgezogen++;
  }
  assert.ok(umgezogen > 90, `nur ${umgezogen} umgezogen`);
});

test("keine Ketten und keine Schleifen: kein Ziel ist selbst eine Quelle", () => {
  for (const p of ALT) {
    for (const r of treffer(p)) {
      const ziel = zielFuer(r, p);
      assert.ok(ziel.startsWith("/") && !ziel.startsWith("//"), `${p}: externes Ziel ${ziel}`);
      assert.notEqual(ziel, p, `${p}: Schleife`);
      assert.equal(treffer(ziel).length, 0, `${p} → ${ziel} ist wieder eine Quelle (Kette)`);
    }
  }
  // auch über die Tabelle selbst (exakte Quellen)
  const quellen = new Set(UMZUG.filter((r) => !r.source.includes(":")).map((r) => r.source));
  for (const r of UMZUG) assert.ok(!quellen.has(r.destination), `${r.source} → ${r.destination}: Kette`);
});

test("Ziele sind freigegebene Länderseiten bzw. der Ratgeber im Stamm", () => {
  for (const p of ALT) {
    for (const r of treffer(p)) {
      const ziel = zielFuer(r, p);
      if (ziel.startsWith("/wissen/ratgeber")) continue;
      const { land, schluessel } = landAusPfad(ziel);
      assert.ok(land, `${p} → ${ziel}: kein Land`);
      assert.ok(freigegeben(schluessel, land), `${p} → ${ziel}: Ziel nicht freigegeben`);
    }
  }
  const ein = (q) => UMZUG.find((r) => r.source === q)?.destination;
  assert.equal(ein("/rechner/pacht"), "/de/rechner/pacht");
  assert.equal(ein("/regionen/tirol"), "/at/regionen/tirol");
  assert.equal(ein("/regionen/bayern"), "/de/regionen/bayern");
  assert.equal(ein("/regionen/schweiz"), "/ch");
  assert.equal(ein("/energiegemeinschaften/rechner"), "/at/energiegemeinschaften/rechner");
  assert.equal(ein("/marktdaten/fristen"), "/de/marktdaten/fristen");
  assert.equal(zielFuer(treffer("/ratgeber/moor-pv")[0], "/ratgeber/moor-pv"), "/wissen/ratgeber/moor-pv");
});

test("next.config.mjs bindet die Tabelle über redirects() ein", async () => {
  const cfg = (await import("../../../next.config.mjs")).default;
  const r = await cfg.redirects();
  assert.equal(r.length, UMZUG.length);
  assert.ok(r.every((x) => x.permanent === true));
});

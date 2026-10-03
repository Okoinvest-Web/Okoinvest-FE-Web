// Tests Welle 2, Paket B1 – Gate des Faktenregisters (pruefen.js, qa/fakten-check.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pruefeFakten } from "./pruefen.js";
import { alleFakten } from "./index.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const basis = { einheit: "x", land: "DE", quelle: { titel: "Test", url: "https://example.org/" }, abruf: "2026-10-03", gueltigAb: null, gueltigBis: null, status: "geprueft", pruefer: "Test", klasse: "B", wert: 1 };

test("echtes Register am 03.10.2026: GRÜN, 0 ohne Quelle/Abruf", () => {
  const b = pruefeFakten(alleFakten(), { heute: "2026-10-03" });
  assert.equal(b.urteil, "GRÜN", JSON.stringify(b.vertragsfehler));
  assert.equal(b.zusammenfassung.ohneQuelle, 0);
  assert.equal(b.zusammenfassung.ohneAbruf, 0);
  assert.equal(b.zusammenfassung.abgelaufenKlasseA, 0);
  assert.ok(b.zusammenfassung.zuPruefen > 0, "zu_pruefen erscheint als Warnung");
});

test("abgelaufener Klasse-A-Fakt macht das Gate ROT", () => {
  const b = pruefeFakten([{ ...basis, id: "t.a", klasse: "A", gueltigBis: "2026-01-31" }], { heute: "2026-10-03" });
  assert.equal(b.urteil, "ROT");
  assert.deepEqual(
    b.abgelaufenA.map((f) => f.id),
    ["t.a"]
  );
});

test("abgelaufener Klasse-B/C-Fakt ist nur eine Warnung", () => {
  const b = pruefeFakten([{ ...basis, id: "t.b", gueltigBis: "2026-01-31" }], { heute: "2026-10-03" });
  assert.equal(b.urteil, "GRÜN");
  assert.equal(b.warnungen.abgelaufenBC.length, 1);
});

test("Fakt ohne Quelle oder Abruf macht das Gate ROT", () => {
  assert.equal(pruefeFakten([{ ...basis, id: "t.q", quelle: undefined }]).urteil, "ROT");
  assert.equal(pruefeFakten([{ ...basis, id: "t.r", abruf: undefined }]).urteil, "ROT");
});

test("Abnahme c: qa/fakten-check.mjs – Exit 0 im Normalfall, Exit 1 mit abgelaufenem Klasse-A-Testfakt", () => {
  const lauf = (...a) => spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "qa/fakten-check.mjs", "--stdout-json", ...a], { cwd: WURZEL, encoding: "utf8" });
  const normal = lauf("--heute", "2026-10-03");
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(JSON.parse(normal.stdout).urteil, "GRÜN");
  const rot = lauf("--heute", "2026-10-03", "--testfakt-abgelaufen");
  assert.equal(rot.status, 1, "abgelaufener Klasse-A-Testfakt muss das Gate (und damit verify) rot machen");
  assert.equal(JSON.parse(rot.stdout).urteil, "ROT");
});

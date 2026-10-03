// Abnahme (c), statisch: stufen.js gegen die Routen im Dateisystem.
//  - Jede Seite der Länderzonen hat genau eine Route unter src/app/(laender)/[land]/… und umgekehrt.
//  - Jede Route prüft ihr Land mit landDerSeite(params, <eigener Schlüssel>) → 404 für nicht
//    freigegebene Kombinationen, und setzt Metadaten mit landMetadata(<eigener Schlüssel>, …).
//  - Außerhalb der Länderzonen liegt keine Seite, die zu einer Länderzone gehört.
// Die Laufzeitprüfung gegen den Dev-Server (Status je Land) steht in qa/e2e/land.e2e.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { EINSTIEG, SEITEN, zoneFuer } from "./index.js";

const APP = fileURLToPath(new URL("../../app/", import.meta.url));
const ZONE = join(APP, "(laender)", "[land]");

function seiten(dir, liste = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) seiten(p, liste);
    else if (n === "page.js") liste.push(p);
  }
  return liste;
}

/** Route einer page.js ohne Routengruppen: src/app/(stamm)/kontakt/page.js → /kontakt */
const route = (datei, basis = APP) =>
  "/" +
  relative(basis, datei)
    .split(sep)
    .slice(0, -1)
    .filter((t) => !/^\(.+\)$/.test(t))
    .join("/");

const zonenRouten = seiten(ZONE).map((d) => ({ datei: d, schluessel: route(d, ZONE) === "/" ? EINSTIEG : route(d, ZONE) }));

test("jede Seite aus SEITEN hat ihre Route und jede Route ist in SEITEN", () => {
  const routen = new Set(zonenRouten.map((r) => r.schluessel));
  for (const k of Object.keys(SEITEN)) assert.ok(routen.has(k), `Route fehlt für ${k || "(Einstieg)"}`);
  for (const r of routen) assert.ok(Object.hasOwn(SEITEN, r), `Route ${r} fehlt in stufen.js`);
});

test("jede Route prüft Land und Freigabe mit ihrem eigenen Schlüssel", () => {
  for (const { datei, schluessel } of zonenRouten) {
    const q = readFileSync(datei, "utf8");
    if (SEITEN[schluessel]?.dynamisch) {
      assert.match(q, /landDerSeite\(params, schluesselAus\)/, `${schluessel}: landDerSeite fehlt`);
      assert.match(q, /landMetadata\(schluesselAus,/, `${schluessel}: landMetadata fehlt`);
      assert.match(q, /generateStaticParams\(\{ params \}\)[\s\S]*regionenSlugs\(/, `${schluessel}: generateStaticParams nicht aus stufen.js`);
      continue;
    }
    const k = schluessel === EINSTIEG ? "EINSTIEG" : JSON.stringify(schluessel);
    assert.ok(q.includes(`landDerSeite(params, ${k})`), `${schluessel || "(Einstieg)"}: landDerSeite(params, ${k}) fehlt`);
    assert.ok(q.includes(`landMetadata(${k},`), `${schluessel || "(Einstieg)"}: landMetadata(${k}, …) fehlt`);
    assert.ok(!/export const metadata\b/.test(q), `${schluessel}: statische metadata statt landMetadata`);
  }
  const layout = readFileSync(join(ZONE, "layout.js"), "utf8");
  assert.match(layout, /dynamicParams = false/);
  assert.match(layout, /generateStaticParams\(\)[\s\S]*LAND_CODES/);
});

test("außerhalb der Länderzonen liegt keine Seite einer Länderzone", () => {
  const ausserhalb = seiten(APP).filter((d) => !d.startsWith(ZONE));
  assert.ok(ausserhalb.length > 100);
  for (const d of ausserhalb) {
    const r = route(d);
    assert.notEqual(zoneFuer(r.replace(/\/\[[^\]]+\]/g, "/x")), "land", `${relative(APP, d)} gehört in eine Länderzone (oder in zonen.js)`);
  }
});

test("Root-Layouts: lang je Zone, kein gemeinsames app/layout.js", () => {
  assert.throws(() => statSync(join(APP, "layout.js")), "src/app/layout.js darf es nicht mehr geben (ein Root-Layout je Routengruppe)");
  assert.match(readFileSync(join(APP, "(stamm)", "layout.js"), "utf8"), /lang="de"/);
  assert.match(readFileSync(join(APP, "(en)", "layout.js"), "utf8"), /lang="en"/);
  assert.match(readFileSync(join(ZONE, "layout.js"), "utf8"), /lang=\{info\.lang\}/);
  assert.ok(statSync(join(APP, "global-not-found.js")).isFile());
});

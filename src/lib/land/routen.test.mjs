// Ländermodell, statisch: Register gegen die Routen im Dateisystem.
//  - Jede Seite aus SEITEN liegt gemeinsam unter src/app/(stamm)/…/page.js, ruft seitenLand(params)
//    auf und exportiert ihre Metadaten über seitenMetadata().
//  - Ihre Länderfassung unter src/app/(laender)/[land]/…/page.js ist eine reine Weiterleitung auf
//    DIESELBE Seitenkomponente (scripts/landfassungen.mjs --pruefen).
//  - Keine öffentliche Seite außerhalb des Registers; keine Länder-Übersichtsseiten mehr.
// Die Laufzeitprüfung gegen den Dev-Server steht in qa/e2e/land.e2e.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SEITEN, hatLandfassung, ohneLand } from "./index.js";

const WURZEL = fileURLToPath(new URL("../../../", import.meta.url));
const APP = join(WURZEL, "src", "app");
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

test("Länderfassungen: jede Seite gemeinsam + Weiterleitung auf dieselbe Komponente (landfassungen --pruefen)", () => {
  const r = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/landfassungen.mjs", "--pruefen"], { cwd: WURZEL, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

// 404-Fänger für unbekannte Unterseiten (W3-0): keine Seite, nur notFound() im Länder- bzw. englischen
// Root-Layout (lang und Land-Links der 404 stimmen). Ausnahme in scripts/landfassungen.mjs.
const FAENGER = join(ZONE, "[...unbekannt]", "page.js");
const istFaenger = (d) => d === FAENGER;

test("404-Fänger der Länder- und englischen Fassungen rendern nie Inhalt", () => {
  for (const d of [FAENGER, join(APP, "(en)", "en", "[land]", "[...unbekannt]", "page.js")]) {
    const code = readFileSync(d, "utf8").split("\n").filter((z) => z.trim() && !z.trim().startsWith("//"));
    assert.ok(code.some((z) => /^import \{ notFound \} from "next\/navigation";/.test(z.trim())), relative(APP, d));
    assert.ok(code.some((z) => /^\s*notFound\(\);/.test(z)), relative(APP, d));
    assert.ok(!code.some((z) => /return|<\w/.test(z)), `${relative(APP, d)}: rendert Inhalt`);
  }
});

test("Länderrouten enthalten keinen eigenen Seiteninhalt (kein Kopieren von Seiten)", () => {
  for (const d of seiten(ZONE).filter((x) => !istFaenger(x))) {
    const q = readFileSync(d, "utf8");
    const code = q.split("\n").filter((z) => z.trim() && !z.trim().startsWith("//"));
    // Weiterleitung über landSeite() (src/components/Land/LandSeite.js): dieselbe Seite, in der Schweiz ohne „ß“
    assert.ok(code.length <= 7, `${relative(APP, d)}: mehr als eine Weiterleitung`);
    assert.match(code[0], /^import Seite from "@\/app\/\(stamm\)[^"]*\/page";$/, relative(APP, d));
    assert.equal(code[1], 'import { landSeite } from "@/components/Land/LandSeite";', relative(APP, d));
    assert.equal(code[2], "export default landSeite(Seite);", relative(APP, d));
    for (const z of code.slice(3)) assert.match(z, /^export (\{ \w+(, \w+)* \} from "@\/app\/\(stamm\)[^"]*\/page"|const \w+ = ("[^"]*"|\d+|true|false));$/, `${relative(APP, d)}: ${z}`);
  }
  const routen = seiten(ZONE).filter((x) => !istFaenger(x)).map((d) => route(d, ZONE));
  assert.deepEqual(new Set(routen), new Set(Object.keys(SEITEN)), "Länderrouten = Register");
});

test("jede öffentliche Seite steht im Register; Seiten außerhalb gehören zu Bereichen ohne Länderfassung", () => {
  const gemeinsam = seiten(join(APP, "(stamm)")).map((d) => route(d));
  assert.ok(gemeinsam.length > 100);
  for (const r of gemeinsam) {
    if (Object.hasOwn(SEITEN, r)) continue;
    const konkret = r.replace(/\[[^\]]+\]/g, "x");
    assert.ok(ohneLand(konkret) && !hatLandfassung(konkret), `${r}: öffentliche Seite ohne Registereintrag (src/lib/land/seiten.js)`);
  }
});

test("Root-Layouts: gleicher Rahmen, lang je Land, Land als Kontext; keine Länder-Übersichtsseite", () => {
  assert.throws(() => statSync(join(APP, "layout.js")), "src/app/layout.js darf es nicht geben (ein Root-Layout je Routengruppe)");
  assert.match(readFileSync(join(APP, "(stamm)", "layout.js"), "utf8"), /<Wurzel lang="de">/);
  const land = readFileSync(join(ZONE, "layout.js"), "utf8");
  assert.match(land, /const lang = landInfo\(code\)\?\.lang \|\| "de";/);
  assert.match(land, /<Wurzel lang=\{lang\} land=\{code\}>/);
  assert.match(land, /generateStaticParams\(\)[\s\S]*LAND_CODES/);
  assert.match(readFileSync(join(ZONE, "page.js"), "utf8"), /import Seite from "@\/app\/\(stamm\)\/page";\r?\nimport \{ landSeite \} from "@\/components\/Land\/LandSeite";\r?\nexport default landSeite\(Seite\);/, "/de, /at, /ch zeigen die echte Startseite");
  assert.match(readFileSync(join(WURZEL, "src", "components", "Wurzel", "Wurzel.js"), "utf8"), /<LandProvider land=\{land\}>/);
});

test("Startseite: nie zwischengespeichert, Weiterleitung nur mit Cookie (Middleware)", () => {
  const mw = readFileSync(join(WURZEL, "src", "middleware.js"), "utf8");
  assert.match(mw, /matcher: \["\/",/);
  assert.match(mw, /request\.cookies\.get\(LAND_COOKIE\)/);
  assert.match(mw, /"Cache-Control", "private, no-store, max-age=0"/);
  assert.doesNotMatch(mw, /accept-language|x-vercel-ip-country|cf-ipcountry/i, "keine Weiterleitung nach Sprache oder IP");
  assert.match(readFileSync(join(APP, "(stamm)", "page.js"), "utf8"), /export const dynamic = "force-dynamic";/);
  assert.doesNotMatch(readFileSync(join(ZONE, "page.js"), "utf8"), /dynamic/, "/de, /at, /ch bleiben statisch");
});

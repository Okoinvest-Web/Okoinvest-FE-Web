#!/usr/bin/env node
// scripts/landfassungen.mjs – Länder- und Sprachfassungen der öffentlichen Seiten erzeugen und prüfen
//
//   node scripts/landfassungen.mjs             Routen schreiben:
//                                                src/app/(laender)/[land]/…   /de|at|ch/<seite>
//                                                src/app/(en)/en/…            /en/<seite>
//                                                src/app/(en)/en/[land]/…     /en/de|at|ch/<seite>
//   node scripts/landfassungen.mjs --pruefen   nur prüfen: Exit 1, wenn eine Route fehlt, abweicht
//                                              oder keine Seite im Register (src/lib/land/seiten.js) hat
//
// Sprachfassungen (Sprachmodell, src/lib/sprache): Die englischen Routen reichen DIESELBE Seite
// weiter und setzen nur params.sprache = "en" (src/lib/sprache/route.js):
//
//   import Seite, { generateMetadata as metadaten } from "@/app/(stamm)/rechner/pacht/page";
//   import { englisch, englischeMetadaten } from "@/lib/sprache/route";
//   export default englisch(Seite);
//   export const generateMetadata = englischeMetadaten(metadaten);
//
// Jede Seite aus SEITEN existiert gemeinsam unter src/app/(stamm)/<pfad>/page.js. Ihre
// Länderfassung ist eine reine Weiterleitung auf DIESELBE Seitenkomponente – kein Kopieren:
//
//   import Seite from "@/app/(stamm)/rechner/pacht/page";
//   import { landSeite } from "@/components/Land/LandSeite";
//   export default landSeite(Seite);
//   export { generateMetadata } from "@/app/(stamm)/rechner/pacht/page";
//
// landSeite() (src/components/Land/LandSeite.js) gibt die Seite unverändert weiter; nur in der
// Schweiz (/ch, /en/ch) schreibt es alle Texte der Seite ohne „ß“ (Schweizer Schreibweise).
//
// Next.js reicht params.land ("de" | "at" | "ch") an die Seite durch; die Seite liest es mit
// seitenLand(params). Routen-Einstellungen (dynamic, revalidate, dynamicParams …) muss Next.js
// statisch in der Datei sehen – sie werden als Literal übernommen; generateStaticParams wird
// weitergereicht.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SEITEN } from "../src/lib/land/seiten.js";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(WURZEL, "src", "app");
const GEMEINSAM = join(APP, "(stamm)");
const LAND = join(APP, "(laender)", "[land]");
const EN = join(APP, "(en)", "en");
const EN_LAND = join(EN, "[land]");
const pruefen = process.argv.includes("--pruefen");

const KONFIG = /^export const (dynamic|revalidate|dynamicParams|fetchCache|runtime|preferredRegion|maxDuration) = ("[^"\n]*"|\d+|true|false);\s*$/gm;

/**
 * Einstellungen, die nur für die gemeinsame Seite gelten: Die Startseite „/“ ist dynamisch und
 * wird nie zwischengespeichert (Entscheidung 6: Weiterleitung nur mit Cookie „land“, Middleware);
 * ihre Länderfassungen /de, /at, /ch bleiben statisch.
 */
const NUR_GEMEINSAM = { "/": ["dynamic"] };

const datei = (basis, k) => join(basis, ...(k === "/" ? [] : k.slice(1).split("/")), "page.js");

/** Inhalt der Länderroute für einen Schlüssel. */
export function landRoute(k, quelle) {
  const modul = `@/app/(stamm)${k === "/" ? "" : k}/page`;
  const namen = [];
  if (/export (const|async function|function) generateMetadata\b/.test(quelle)) namen.push("generateMetadata");
  if (/export (const|async function|function) generateStaticParams\b/.test(quelle)) namen.push("generateStaticParams");
  const konfig = [...quelle.matchAll(KONFIG)].filter((m) => !(NUR_GEMEINSAM[k] || []).includes(m[1])).map((m) => `export const ${m[1]} = ${m[2]};`);
  return [
    `// Länderfassung von ${k} (/de, /at, /ch) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.`,
    `// Dieselbe Seite wie src/app/(stamm)${k === "/" ? "" : k}/page.js; das Land kommt aus params.land.`,
    `import Seite from "${modul}";`,
    `import { landSeite } from "@/components/Land/LandSeite";`,
    `export default landSeite(Seite);`,
    ...(namen.length ? [`export { ${namen.join(", ")} } from "${modul}";`] : []),
    ...konfig,
    "",
  ].join("\n");
}

/** Inhalt der englischen Route (gemeinsam oder Land) für einen Schlüssel. */
export function enRoute(k, quelle, { land = false } = {}) {
  const modul = `@/app/(stamm)${k === "/" ? "" : k}/page`;
  const statisch = /export (const|async function|function) generateStaticParams\b/.test(quelle);
  const konfig = [...quelle.matchAll(KONFIG)].filter((m) => !(NUR_GEMEINSAM[k] || []).includes(m[1])).map((m) => `export const ${m[1]} = ${m[2]};`);
  return [
    `// Englische Fassung von ${k} (${land ? "/en/de, /en/at, /en/ch" : "/en"}) – erzeugt mit scripts/landfassungen.mjs, nicht von Hand ändern.`,
    `// Dieselbe Seite wie src/app/(stamm)${k === "/" ? "" : k}/page.js; Sprache "en" über params.sprache${land ? ", das Land aus params.land" : ""}.`,
    `import Seite, { generateMetadata as metadaten } from "${modul}";`,
    `import { englisch, englischeMetadaten } from "@/lib/sprache/route";`,
    ...(land ? [`import { landSeite } from "@/components/Land/LandSeite";`, `export default landSeite(englisch(Seite));`] : [`export default englisch(Seite);`]),
    `export const generateMetadata = englischeMetadaten(metadaten);`,
    ...(statisch ? [`export { generateStaticParams } from "${modul}";`] : []),
    ...konfig,
    "",
  ].join("\n");
}

function seiten(dir, liste = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) seiten(p, liste);
    else if (n === "page.js") liste.push(p);
  }
  return liste;
}

const fehler = [];
let geschrieben = 0;
for (const k of Object.keys(SEITEN)) {
  const q = datei(GEMEINSAM, k);
  if (!existsSync(q)) {
    fehler.push(`gemeinsame Seite fehlt: ${relative(WURZEL, q)}`);
    continue;
  }
  const quelle = readFileSync(q, "utf8");
  if (!/seitenLand\(params\)/.test(quelle)) fehler.push(`${k}: Seite ruft seitenLand(params) nicht auf`);
  if (!/seitenMetadata\(/.test(quelle)) fehler.push(`${k}: Metadaten nicht über seitenMetadata()`);
  if (/export const metadata\b/.test(quelle)) fehler.push(`${k}: statische metadata – Länderfassung bekäme kein eigenes canonical/noindex`);
  for (const [ziel, soll] of [
    [datei(LAND, k), landRoute(k, quelle)],
    [datei(EN, k), enRoute(k, quelle)],
    [datei(EN_LAND, k), enRoute(k, quelle, { land: true })],
  ]) {
    const ist = existsSync(ziel) ? readFileSync(ziel, "utf8").replace(/\r\n/g, "\n") : null;
    if (ist === soll) continue;
    if (pruefen) fehler.push(`${relative(WURZEL, ziel)} ${ist === null ? "fehlt" : "weicht ab"} (node scripts/landfassungen.mjs)`);
    else {
      mkdirSync(dirname(ziel), { recursive: true });
      writeFileSync(ziel, soll);
      geschrieben++;
    }
  }
}

// Umgekehrt: keine Länder- oder Sprachroute ohne Registereintrag
// Ausnahme: die 404-Fänger für unbekannte Unterseiten ([...unbekannt], rufen nur notFound() auf,
// damit die 404 im Länder- bzw. englischen Root-Layout mit passendem lang erscheint).
const FAENGER = [join(LAND, "[...unbekannt]", "page.js"), join(EN_LAND, "[...unbekannt]", "page.js")];
const bekannt = new Set([...FAENGER, ...Object.keys(SEITEN).flatMap((k) => [datei(LAND, k), datei(EN, k), datei(EN_LAND, k)])]);
for (const d of [...seiten(LAND), ...(existsSync(EN) ? seiten(EN) : [])]) if (!bekannt.has(d)) fehler.push(`Länder-/Sprachroute ohne Registereintrag: ${relative(WURZEL, d).split(sep).join("/")}`);

if (fehler.length) {
  console.error(`Länder- und Sprachfassungen: ${fehler.length} Fehler`);
  for (const f of fehler) console.error("  - " + f);
  process.exit(1);
}
console.log(pruefen ? `Länder- und Sprachfassungen: ${Object.keys(SEITEN).length} Seiten × 3 Routen, alle vorhanden und aktuell.` : `Länder- und Sprachfassungen: ${geschrieben} Routen geschrieben (${Object.keys(SEITEN).length} Seiten).`);

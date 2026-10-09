#!/usr/bin/env node
// scripts/codemod-links.mjs – interne Links ohne feste Länderpräfixe (Ländermodell)
//
//   node scripts/codemod-links.mjs              Trockenlauf: Bericht, nichts wird geschrieben
//   node scripts/codemod-links.mjs --schreiben  Dateien ändern
//   node scripts/codemod-links.mjs --pruefen    nur prüfen: Exit 1, wenn noch feste Präfixe stehen
//                                               (Gate in npm run verify, Schritt 7)
//
// Im Ländermodell hängt die Link-Komponente (src/components/Land/Link.js) das Land der Seite
// selbst an. Interne Links stehen deshalb OHNE Präfix im Code und im Text, so wie vor Welle 2:
//   "/de/rechner/pacht"         → "/rechner/pacht"
//   "[Pachtrechner](/at/flaechencheck)" → "[Pachtrechner](/flaechencheck)"
//   "/wissen/ratgeber/x"        → "/ratgeber/x"        (Welle-2-Name, umzug.js leitet weiter)
// Gezählt wird nur ein Pfad, der direkt nach einem Anführungszeichen, Backtick, „(“ oder
// Leerzeichen beginnt und dessen Rest eine Seite aus dem Register ist (externe Adressen wie
// https://…/de/… bleiben unberührt). Ausgenommen: src/lib/land, src/lib/sprache und die Land-/Sprache-Bausteine (Pfadlogik selbst), Tests und
// Prüfskripte, die Präfixe bewusst als Daten führen.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { hatLandfassung } from "../src/lib/land/seiten.js";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const schreiben = args.includes("--schreiben");
const pruefen = args.includes("--pruefen");

const BEREICHE = ["src", "public/llms.txt", "Backend-Import/oekoinvest_app/oekoinvest_app/plattform"];
const AUSGENOMMEN = [/^src\/lib\/land\//, /^src\/lib\/sprache\//, /^src\/components\/Land\//, /^src\/components\/Sprache\//, /\.test\.mjs$/, /\.e2e\.mjs$/, /^src\/lib\/indexsteuerung\.js$/, /^src\/lib\/gruppe\/partner-register\.js$/, /\/testdaten\//];
const ENDUNGEN = /\.(m?js|txt|json|py)$/;

// Pfad nach Anführungszeichen, Backtick, „(“, Leerzeichen – oder nach der eigenen Domain (llms.txt)
const PRAEFIX = /(?<=["'`(\s]|oekoinvest\.com)\/(de|at|ch)(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)(?=[#?"'`)\s,.;:]|$)/gm;
const WELLE2 = /(?<=["'`(\s]|oekoinvest\.com)\/wissen\/ratgeber(?=[/#?"'`)\s,.;:]|$)/gm;

const rel = (p) => relative(WURZEL, p).split(sep).join("/");

function dateien(pfad, liste = []) {
  let s;
  try {
    s = statSync(pfad);
  } catch {
    return liste;
  }
  if (s.isFile()) {
    if (ENDUNGEN.test(pfad)) liste.push(pfad);
    return liste;
  }
  for (const n of readdirSync(pfad)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    dateien(join(pfad, n), liste);
  }
  return liste;
}

/** Ersetzt feste Präfixe und Welle-2-Namen in einem Text. @returns {{ text: string, funde: string[] }} */
export function bereinigen(text) {
  const funde = [];
  let neu = text.replace(PRAEFIX, (treffer, _land, rest) => {
    if (!hatLandfassung(rest)) return treffer;
    funde.push(treffer);
    return rest;
  });
  neu = neu.replace(WELLE2, (treffer) => {
    funde.push(treffer);
    return "/ratgeber";
  });
  return { text: neu, funde };
}

const bericht = [];
for (const b of BEREICHE) {
  for (const d of dateien(join(WURZEL, b))) {
    const r = rel(d);
    if (AUSGENOMMEN.some((m) => m.test(r))) continue;
    const q = readFileSync(d, "utf8");
    const { text, funde } = bereinigen(q);
    if (!funde.length) continue;
    bericht.push({ datei: r, funde });
    if (schreiben) writeFileSync(d, text);
  }
}

const anzahl = bericht.reduce((s, b) => s + b.funde.length, 0);
for (const b of bericht.slice(0, 40)) console.log(`${b.datei}: ${b.funde.length} (${[...new Set(b.funde)].slice(0, 4).join(", ")})`);
if (bericht.length > 40) console.log(`… und ${bericht.length - 40} weitere Dateien`);
console.log(`Feste Länderpräfixe/Welle-2-Namen in Links: ${anzahl} in ${bericht.length} Dateien${schreiben ? " – ersetzt" : ""}.`);
if (pruefen && anzahl) process.exit(1);

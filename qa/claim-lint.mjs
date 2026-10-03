#!/usr/bin/env node
// qa/claim-lint.mjs – Claim-Lint (Paket F)
//
// Sucht Reizwörter, Platzhalter, Testdaten und ß in CH-Texten in den öffentlich
// ausgelieferten Quellen. Regeln: qa/claim-lint/regeln.mjs.
//
// Aufruf:
//   node qa/claim-lint.mjs                         ganzer Standardumfang, Bericht
//   node qa/claim-lint.mjs --paket D               nur die Dateien von Paket D
//   node qa/claim-lint.mjs --dateien "src/app/impressum/**,src/data/site.js"
//   node qa/claim-lint.mjs --regeln reizwort,testdaten   nur diese Arten (oder Regel-IDs)
//   node qa/claim-lint.mjs --streng                Exit-Code 1 bei Treffern der Stufe „fehler“
//   node qa/claim-lint.mjs --hinweise              auch Hinweise einzeln ausgeben
//   node qa/claim-lint.mjs --json qa/out/claims.json
//
// Ohne --streng ist der Exit-Code 0 (Welle 1: Funde werden berichtet, nicht blockiert).

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUSGENOMMEN, CH_DATEIEN, CH_REGEL, CH_ZEILE, PAKETE, REGELN, STANDARD_UMFANG } from "./claim-lint/regeln.mjs";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---- Argumente ---------------------------------------------------------------
export function argumente(argv) {
  const a = { paket: null, dateien: null, regeln: null, streng: false, hinweise: false, json: null, still: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const wert = () => argv[++i];
    if (k === "--paket") a.paket = wert();
    else if (k === "--dateien") a.dateien = wert().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--regeln") a.regeln = wert().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--streng") a.streng = true;
    else if (k === "--hinweise") a.hinweise = true;
    else if (k === "--json") a.json = wert();
    else if (k === "--still") a.still = true;
    else if (!k.startsWith("--")) (a.dateien ||= []).push(k);
  }
  return a;
}

// ---- Glob (nur * und **) -----------------------------------------------------
export function globZuRegex(glob) {
  let r = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") { i++; r += "(?:.*/)?"; } else r += ".*";
      } else r += "[^/]*";
    } else r += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${r}$`);
}
const passt = (pfad, globs) => globs.some((g) => globZuRegex(g).test(pfad));

function alleDateien(ordner, liste = []) {
  if (!existsSync(ordner)) return liste;
  const st = statSync(ordner);
  if (st.isFile()) return liste.concat(ordner);
  for (const n of readdirSync(ordner)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) alleDateien(p, liste);
    else liste.push(p);
  }
  return liste;
}

// Startordner eines Globs (alles vor dem ersten *)
const basis = (g) => {
  const i = g.indexOf("*");
  const vor = i < 0 ? g : g.slice(0, i);
  return i < 0 ? vor : vor.slice(0, vor.lastIndexOf("/") + 1) || ".";
};

export function sammleDateien(globs) {
  const gefunden = new Set();
  for (const g of globs) {
    for (const p of alleDateien(join(WURZEL, basis(g)))) {
      const rel = relative(WURZEL, p).replace(/\\/g, "/");
      if (/\.(js|jsx|mjs|ts|tsx|md|mdx|txt|json)$/.test(rel) && passt(rel, [g]) && !passt(rel, AUSGENOMMEN)) gefunden.add(rel);
    }
  }
  return [...gefunden].sort();
}

// ---- Prüfung ---------------------------------------------------------------------
const istKommentar = (zeile) => /^\s*(\/\/|\/\*|\*|\{\s*\/\*|<!--)/.test(zeile);
const AUSNAHME = /claim-ok:\s*\S{3,}/;

export function pruefeText(rel, text, { regeln = null } = {}) {
  const zeilen = text.split(/\r?\n/);
  const aktiv = REGELN.filter((r) => !regeln || regeln.includes(r.art) || regeln.includes(r.id));
  const chAktiv = !regeln || regeln.includes("ch-eszett");
  const chDatei = passt(rel, CH_DATEIEN);
  const funde = [];
  zeilen.forEach((zeile, i) => {
    if (AUSNAHME.test(zeile) || (i > 0 && AUSNAHME.test(zeilen[i - 1]))) return;
    const kommentar = istKommentar(zeile);
    for (const r of aktiv) {
      if (kommentar && !r.auchKommentar) continue;
      if (r.ausserWenn && r.ausserWenn.test(zeile)) continue;
      const m = zeile.match(r.muster);
      if (!m) continue;
      const stufe = kommentar ? r.auchKommentar : r.stufe;
      funde.push({ datei: rel, zeile: i + 1, regel: r.id, art: r.art, stufe, treffer: m[0].trim().slice(0, 60), text: r.text, auszug: zeile.trim().slice(0, 160) });
    }
    if (chAktiv && !kommentar && zeile.includes("ß") && (chDatei || CH_ZEILE.test(zeile))) {
      funde.push({ datei: rel, zeile: i + 1, regel: CH_REGEL.id, art: CH_REGEL.art, stufe: CH_REGEL.stufe, treffer: (zeile.match(/\S*ß\S*/) || ["ß"])[0].slice(0, 60), text: CH_REGEL.text, auszug: zeile.trim().slice(0, 160) });
    }
  });
  return funde;
}

export function lauf(opt) {
  let umfang = STANDARD_UMFANG;
  if (opt.paket) {
    umfang = PAKETE[opt.paket.toUpperCase()];
    if (!umfang) throw new Error(`Unbekanntes Paket „${opt.paket}“ (bekannt: ${Object.keys(PAKETE).join(", ")})`);
  }
  if (opt.dateien) umfang = opt.dateien;
  const dateien = sammleDateien(umfang);
  const funde = dateien.flatMap((rel) => pruefeText(rel, readFileSync(join(WURZEL, rel), "utf8"), { regeln: opt.regeln }));
  return { umfang, dateien: dateien.length, funde };
}

function bericht({ umfang, dateien, funde }, opt) {
  const fehler = funde.filter((f) => f.stufe === "fehler");
  const hinweise = funde.filter((f) => f.stufe === "hinweis");
  const zaehle = (liste, k) => liste.reduce((o, f) => ((o[f[k]] = (o[f[k]] || 0) + 1), o), {});
  const aus = [];
  aus.push(`Claim-Lint: ${dateien} Dateien (${opt.paket ? `Paket ${opt.paket}` : opt.dateien ? "Dateiliste" : "Standardumfang"}), ${fehler.length} Fehler, ${hinweise.length} Hinweise`);
  if (fehler.length) {
    aus.push("", "Fehler je Art: " + Object.entries(zaehle(fehler, "art")).map(([k, v]) => `${k} ${v}`).join(" · "));
    aus.push("Fehler je Regel: " + Object.entries(zaehle(fehler, "regel")).map(([k, v]) => `${k} ${v}`).join(" · "));
  }
  if (hinweise.length) aus.push("Hinweise je Regel: " + Object.entries(zaehle(hinweise, "regel")).map(([k, v]) => `${k} ${v}`).join(" · "));
  const zeige = opt.hinweise ? funde : fehler;
  let letzte = "";
  for (const f of zeige) {
    if (f.datei !== letzte) aus.push("", f.datei);
    letzte = f.datei;
    aus.push(`  ${String(f.zeile).padStart(4)}  ${f.stufe === "fehler" ? "✗" : "·"} [${f.regel}] „${f.treffer}“  – ${f.text}`);
  }
  if (!opt.still) console.log(aus.join("\n"));
  return { fehler: fehler.length, hinweise: hinweise.length };
}

// ---- CLI -------------------------------------------------------------------------
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opt = argumente(process.argv.slice(2));
  const ergebnis = lauf(opt);
  const z = bericht(ergebnis, opt);
  if (opt.json) {
    mkdirSync(dirname(resolve(opt.json)), { recursive: true });
    writeFileSync(opt.json, JSON.stringify({ ...ergebnis, zusammenfassung: z }, null, 1), "utf8");
  }
  if (opt.streng && z.fehler > 0) process.exitCode = 1;
}

#!/usr/bin/env node
// qa/link-pruefung.mjs – interne Links aller öffentlichen Seiten gegen den Dev-Server (Welle 2, Länderrouting)
//
//   node qa/link-pruefung.mjs                 alle Seiten aus /sitemap/{stamm,de,at,ch}.xml
//   node qa/link-pruefung.mjs --max 40        nur die ersten 40 Seiten (Stichprobe)
//   node qa/link-pruefung.mjs --json qa/out/links.json
//
// Ersatz für den Crawl-Diff gegen einen Produktions-Build, der auf dem 8-GB-Rechner nicht läuft
// (Masterplan Abschnitt 4; der echte Crawl-Diff ist ein offener Punkt für Staging).
// Geprüft wird jeder interne Link (<a href="/…">) jeder Seite:
//   ✗ 404/5xx                       – kaputter Link
//   ✗ Weiterleitung (3xx)           – interner Link zeigt noch auf einen alten Pfad (soll direkt aufs Ziel)
//   ✗ Kette                         – Weiterleitung, deren Ziel wieder weiterleitet
// Seiten selbst laufen seriell (Dev-Server, 8 GB RAM). Ergebnis: Exit 1 bei Fehlern.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { BASIS, serverErreichbar } from "./browser.mjs";

const args = process.argv.slice(2);
const maxIdx = args.indexOf("--max");
const MAX = maxIdx >= 0 ? Number(args[maxIdx + 1]) : Infinity;
const jsonIdx = args.indexOf("--json");
const JSON_DATEI = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const SITEMAPS = ["stamm", "de", "at", "ch"];
const IGNORIEREN = /^\/(_next|api|portal|login|registrieren|passwort-vergessen|einladung|angebot|bericht|p\/|img|geo|icon|apple-touch|manifest|sitemap|robots|llms\.txt|termin\/verwalten)/;

async function hole(pfad) {
  for (let v = 1; ; v++) {
    try {
      const r = await fetch(BASIS + pfad, { redirect: "manual", signal: AbortSignal.timeout(180_000) });
      if (r.status >= 500 && v < 3) {
        await new Promise((ok) => setTimeout(ok, 4000));
        continue;
      }
      return r;
    } catch (e) {
      if (v >= 3) throw e;
      // Dev-Server startet neu (Wächter, bis zu 2 Minuten) → warten, bis er wieder antwortet
      const t0 = Date.now();
      while (Date.now() - t0 < 180_000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
    }
  }
}

if (!(await serverErreichbar())) {
  console.error(`Dev-Server unter ${BASIS} nicht erreichbar.`);
  process.exit(2);
}

// 1) Seiten aus den Sitemaps
const seiten = [];
for (const id of SITEMAPS) {
  const xml = await (await hole(`/sitemap/${id}.xml`)).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) seiten.push(new URL(m[1]).pathname);
}
const zuPruefen = [...new Set(seiten)].slice(0, MAX);
console.log(`Link-Prüfung: ${zuPruefen.length} Seiten aus ${SITEMAPS.length} Sitemaps gegen ${BASIS}`);

// 2) Links je Seite sammeln
const links = new Map(); // ziel → Set(quellen)
const seitenFehler = [];
for (const [i, s] of zuPruefen.entries()) {
  const r = await hole(s);
  if (r.status !== 200) {
    seitenFehler.push(`${s}: Seite selbst ${r.status}`);
    await r.body?.cancel();
    continue;
  }
  const html = await r.text();
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#]*)(#[^"]*)?"/g)) {
    const roh = m[1].replace(/&amp;/g, "&");
    if (!roh.startsWith("/") || roh.startsWith("//")) continue;
    const ziel = roh.split("?")[0] || "/";
    if (IGNORIEREN.test(ziel)) continue;
    if (!links.has(ziel)) links.set(ziel, new Set());
    links.get(ziel).add(s);
  }
  if ((i + 1) % 20 === 0) console.log(`  … ${i + 1}/${zuPruefen.length} Seiten gelesen`);
}

// 3) Ziele prüfen
const fehler = [...seitenFehler];
let ok = 0;
for (const [ziel, quellen] of links) {
  const r = await hole(ziel);
  const beispiel = [...quellen].slice(0, 2).join(", ");
  if (r.status >= 300 && r.status < 400) {
    const weiter = new URL(r.headers.get("location"), BASIS).pathname;
    const r2 = await hole(weiter);
    const kette = r2.status >= 300 && r2.status < 400;
    fehler.push(`${ziel} → ${r.status} ${weiter}${kette ? " → KETTE" : ""} (verlinkt auf ${beispiel})`);
    await r2.body?.cancel();
  } else if (r.status !== 200) {
    fehler.push(`${ziel}: ${r.status} (verlinkt auf ${beispiel})`);
  } else ok++;
  await r.body?.cancel();
}

console.log(`\nInterne Linkziele: ${links.size}, in Ordnung: ${ok}, Fehler: ${fehler.length}`);
for (const f of fehler) console.log(`  ✗ ${f}`);
if (JSON_DATEI) {
  mkdirSync(dirname(resolve(JSON_DATEI)), { recursive: true });
  writeFileSync(resolve(JSON_DATEI), JSON.stringify({ zeit: new Date().toISOString(), seiten: zuPruefen.length, ziele: links.size, ok, fehler }, null, 1), "utf8");
}
process.exit(fehler.length ? 1 : 0);

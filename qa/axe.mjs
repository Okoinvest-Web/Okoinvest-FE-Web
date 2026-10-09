#!/usr/bin/env node
// qa/axe.mjs – Barrierefreiheit (axe-core) auf 10 Kernseiten gegen den laufenden Dev-Server (Paket F)
//
//   node qa/axe.mjs                       prüfen gegen qa/axe-baseline.json (Gate)
//   node qa/axe.mjs --baseline-schreiben  heutigen Stand als Baseline festhalten
//   node qa/axe.mjs --breiten 1440,390    zusätzlich mobil (Standard: 1440)
//   node qa/axe.mjs --seiten /,/kontakt   nur diese Seiten (Länderzonen mit Präfix, z. B. /de/reststrom)
//   node qa/axe.mjs --json qa/out/axe.json
//
// Regeln: WCAG 2.0/2.1/2.2 A+AA (axe-Tags). Gate-Logik (Ratsche, damit Welle 1 nicht an
// Altlasten scheitert, aber nichts schlechter wird):
//   ✗ Fehler  – eine Regel der Stufe „serious“/„critical“, die für diese Seite NICHT in der Baseline steht
//   ! Warnung – mehr betroffene Elemente als in der Baseline, oder neue „minor“/„moderate“-Regel
//   Ziel (Masterplan): serious + critical = 0; dann Baseline leeren.
// Seite mit Cookie-Banner: „/“ zusätzlich ohne Einwilligungs-Cookie (Banner offen).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { axePfad, lade, ladePlaywright, neuerKontext, serverErreichbar, zeit } from "./browser.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HIER, "axe-baseline.json");

// 10 Kernseiten: Einstiege je Zielgruppe, Funnel, Rechner, Börse, Kontakt
// Ländermodell: gemeinsame Seiten wie vor Welle 2 (Länderfassungen nutzen dieselben Komponenten)
export const KERNSEITEN = ["/", "/flaechencheck", "/freiflaeche", "/landwirte", "/investoren", "/kommunen", "/reststrom", "/rechner/pacht", "/projektboerse", "/kontakt"];
const BANNER_SEITE = "/ (Cookie-Banner offen)";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SCHWER = new Set(["serious", "critical"]);

function argumente(argv) {
  const a = { schreiben: false, breiten: [1440], seiten: KERNSEITEN, json: null, banner: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--baseline-schreiben") a.schreiben = true;
    else if (k === "--breiten") a.breiten = argv[++i].split(",").map(Number);
    else if (k === "--seiten") a.seiten = argv[++i].split(",");
    else if (k === "--json") a.json = argv[++i];
    else if (k === "--ohne-banner") a.banner = false;
  }
  return a;
}

async function pruefeSeite(browser, axeQuelle, pfad, breite, { consent = true } = {}) {
  const ctx = await neuerKontext(browser, { breite, consent });
  const page = await ctx.newPage();
  try {
    let status = await lade(page, pfad, { warten: 1500 });
    // Kernseiten existieren immer: ein 404/5xx kommt im Dev-Modus vor, wenn der Server gerade neu kompiliert oder
    // vom Wächter neu gestartet wird (QM Welle 2: /de/flaechencheck einmal 404, direkt danach 200) → einmal wiederholen.
    if (status !== 200) {
      await page.waitForTimeout(10000);
      status = await lade(page, pfad, { warten: 1500 });
    }
    if (status !== 200) return { status, fehler: `HTTP ${status}` };
    await page.addScriptTag({ content: axeQuelle });
    const erg = await page.evaluate(async (tags) => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, hilfe: v.help, knoten: v.nodes.length, ziele: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
    }, TAGS);
    return { status, verstoesse: erg };
  } catch (e) {
    return { status: 0, fehler: String(e).split(/\r?\n/)[0].slice(0, 200) };
  } finally {
    await ctx.close();
  }
}

function bewerte(ergebnisse, baseline) {
  const fehler = [];
  const warnungen = [];
  for (const [schluessel, r] of Object.entries(ergebnisse)) {
    if (r.fehler) {
      fehler.push(`${schluessel}: Seite nicht prüfbar (${r.fehler})`);
      continue;
    }
    const basis = baseline[schluessel] || {};
    for (const v of r.verstoesse) {
      const alt = basis[v.id];
      if (alt === undefined) {
        (SCHWER.has(v.impact) ? fehler : warnungen).push(`${schluessel}: neue Regel ${v.id} (${v.impact}, ${v.knoten}×) – ${v.hilfe} → ${v.ziele.join(" | ")}`);
      } else if (v.knoten > alt) {
        warnungen.push(`${schluessel}: ${v.id} (${v.impact}) ${alt} → ${v.knoten} Elemente`);
      }
    }
  }
  return { fehler, warnungen };
}

export async function laufAxe(opt) {
  const start = Date.now();
  const pw = await ladePlaywright();
  if (!pw) throw new Error("Playwright nicht gefunden (PLAYWRIGHT_PFAD setzen, siehe qa/README.md)");
  const axe = axePfad();
  if (!axe) throw new Error("axe-core nicht gefunden");
  if (!(await serverErreichbar())) throw new Error("Dev-Server nicht erreichbar (npm run dev, Port 3100)");
  const axeQuelle = readFileSync(axe, "utf8");
  const browser = await pw.chromium.launch();
  const ergebnisse = {};
  try {
    for (const breite of opt.breiten) {
      for (const pfad of opt.seiten) {
        const t = Date.now();
        const schluessel = breite === 1440 ? pfad : `${pfad} @${breite}`;
        ergebnisse[schluessel] = await pruefeSeite(browser, axeQuelle, pfad, breite);
        const r = ergebnisse[schluessel];
        const s = r.verstoesse ? r.verstoesse.filter((v) => SCHWER.has(v.impact)).length : "?";
        console.log(`  ${schluessel.padEnd(22)} ${r.fehler ? "FEHLER " + r.fehler : `${r.verstoesse.length} Regeln verletzt (${s} serious/critical)`}  ${zeit(t)}`);
      }
    }
    if (opt.banner) {
      ergebnisse[BANNER_SEITE] = await pruefeSeite(browser, axeQuelle, "/", 1440, { consent: false });
      const r = ergebnisse[BANNER_SEITE];
      console.log(`  ${BANNER_SEITE.padEnd(22)} ${r.fehler ? "FEHLER " + r.fehler : `${r.verstoesse.length} Regeln verletzt`}`);
    }
  } finally {
    await browser.close();
  }
  return { ergebnisse, dauer: zeit(start) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opt = argumente(process.argv.slice(2));
  try {
    const { ergebnisse, dauer } = await laufAxe(opt);
    if (opt.json) {
      mkdirSync(dirname(resolve(opt.json)), { recursive: true });
      writeFileSync(opt.json, JSON.stringify(ergebnisse, null, 1), "utf8");
    }
    const gesamt = Object.values(ergebnisse).flatMap((r) => r.verstoesse || []);
    const schwer = gesamt.filter((v) => SCHWER.has(v.impact));
    console.log(`axe: ${Object.keys(ergebnisse).length} Prüfungen in ${dauer}; ${gesamt.length} Regelverstöße, davon ${schwer.length} serious/critical (${schwer.reduce((s, v) => s + v.knoten, 0)} Elemente)`);
    if (opt.schreiben) {
      const baseline = {};
      for (const [k, r] of Object.entries(ergebnisse)) {
        if (r.fehler) {
          console.error(`Baseline NICHT geschrieben: ${k} nicht prüfbar (${r.fehler})`);
          process.exit(1);
        }
        baseline[k] = Object.fromEntries(r.verstoesse.map((v) => [v.id, v.knoten]));
      }
      writeFileSync(BASELINE, JSON.stringify({ _hinweis: "Altlasten-Stand für die axe-Ratsche (qa/axe.mjs). Nur verkleinern; Ziel: leer.", _stand: new Date().toISOString().slice(0, 10), ...baseline }, null, 1) + "\n", "utf8");
      console.log(`Baseline geschrieben: ${BASELINE}`);
    } else {
      const roh = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
      const { fehler, warnungen } = bewerte(ergebnisse, roh);
      warnungen.forEach((w) => console.log(`  ! ${w}`));
      fehler.forEach((f) => console.log(`  ✗ ${f}`));
      // Verbesserungen sichtbar machen: Regeln in der Baseline, die nicht mehr auftreten
      for (const [k, regeln] of Object.entries(roh)) {
        if (k.startsWith("_") || !ergebnisse[k]?.verstoesse) continue;
        const jetzt = new Set(ergebnisse[k].verstoesse.map((v) => v.id));
        const weg = Object.keys(regeln).filter((id) => !jetzt.has(id));
        if (weg.length) console.log(`  ✓ ${k}: behoben ${weg.join(", ")} – Baseline verkleinern (--baseline-schreiben)`);
      }
      if (fehler.length) process.exitCode = 1;
    }
  } catch (e) {
    console.error(`axe: ${e.message}`);
    process.exitCode = 1;
  }
}

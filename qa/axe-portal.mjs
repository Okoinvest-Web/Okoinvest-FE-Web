#!/usr/bin/env node
// qa/axe-portal.mjs – Barrierefreiheit (axe-core) auf Portalseiten MIT Demo-Login (Paket UIUX, Plattform-Armee)
//
//   node qa/axe-portal.mjs                       prüfen gegen qa/axe-portal-baseline.json (Gate)
//   node qa/axe-portal.mjs --baseline-schreiben  heutigen Stand als Baseline festhalten
//   node qa/axe-portal.mjs --breiten 1440,390    zusätzlich mobil (Standard: 1440,390)
//   node qa/axe-portal.mjs --rollen admin,investor   nur diese Rollen
//   node qa/axe-portal.mjs --shots <ordner>      Screenshot je Prüfung (Belege vorher/nachher)
//   node qa/axe-portal.mjs --json qa/out/axe-portal.json
//
// Läuft NUR gegen das lokale Demo-Backend (Demo-Konten aus src/lib/plattform/backend/demo/seed.js).
// Anmeldung wie qa/e2e/*.e2e.mjs über POST /api/auth/login im Browser-Kontext (Cookie geteilt).
// Zusätzlich je Seite drei Strukturprüfungen (UX-Audit Q8/Q10): genau eine h1, ein main-Landmark,
// kein horizontaler Überlauf bei 390 px.
// Gate-Logik wie qa/axe.mjs (Ratsche): neue serious/critical-Regel = Fehler, mehr Elemente = Warnung.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { axePfad, lade, ladePlaywright, neuerKontext, serverErreichbar, zeit, BASIS } from "./browser.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HIER, "axe-portal-baseline.json");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SCHWER = new Set(["serious", "critical"]);
const PASSWORT = process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!";

// Kernseiten je Rolle: Startübersicht + die Hauptarbeitswege (UX-Audit „12 Kernwege“).
// Querschnittsseiten (Profil, Sicherheit, Dokumente …) nur einmal (Rolle flaeche), damit der Lauf schnell bleibt.
export const ROLLEN = {
  flaeche: {
    email: "flaeche@example.com",
    seiten: ["/portal", "/portal/anfragen", "/portal/flaechen", "/portal/pachtvertraege", "/portal/entwicklung", "/portal/abrechnungen", "/portal/verifizierung", "/portal/dokumente", "/portal/profil", "/portal/sicherheit", "/portal/support", "/portal/benachrichtigungen", "/portal/nachrichten", "/portal/termine"],
  },
  investor: { email: "investor@example.com", seiten: ["/portal", "/portal/boerse", "/portal/pipeline", "/portal/portfolio", "/portal/finanzierung", "/portal/closing"] },
  anbieter: { email: "anbieter@example.com", seiten: ["/portal", "/portal/projekte"] },
  unternehmen: { email: "unternehmen@example.com", seiten: ["/portal", "/portal/anlagen", "/portal/energie", "/portal/energie/beschaffung", "/portal/anliegen"] },
  mitglied: { email: "mitglied@example.com", seiten: ["/portal", "/portal/beteiligung", "/portal/eg"] },
  kommune: { email: "kommune@example.com", seiten: ["/portal", "/portal/kommune"] },
  bank: { email: "bank@example.com", seiten: ["/portal", "/portal/bank"] },
  gutachter: { email: "gutachter@example.com", seiten: ["/portal", "/portal/gutachter"] },
  lieferant: { email: "lieferant@example.com", seiten: ["/portal", "/portal/ausschreibungen"] },
  admin: {
    email: "admin@example.com",
    seiten: ["/portal/admin", "/portal/admin/aufgaben", "/portal/admin/vorgaenge", "/portal/admin/leads", "/portal/admin/flaechen", "/portal/admin/projekte", "/portal/admin/interessen", "/portal/admin/dealroom", "/portal/admin/entwicklung", "/portal/admin/anlagen", "/portal/admin/pachtakten", "/portal/organisation", "/portal/admin/rechte", "/portal/admin/finanzen/buchhaltung", "/portal/admin/akquise/karte"],
  },
};

function argumente(argv) {
  const a = { schreiben: false, breiten: [1440, 390], rollen: Object.keys(ROLLEN), json: null, shots: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--baseline-schreiben") a.schreiben = true;
    else if (k === "--breiten") a.breiten = argv[++i].split(",").map(Number);
    else if (k === "--rollen") a.rollen = argv[++i].split(",");
    else if (k === "--json") a.json = argv[++i];
    else if (k === "--shots") a.shots = argv[++i];
  }
  return a;
}

/** Demo-Anmeldung im Kontext (Cookie wird mit den Seiten geteilt); wirft bei Fehlschlag. */
async function anmelden(ctx, email) {
  const r = await ctx.request.post(`${BASIS}/api/auth/login`, {
    headers: { Origin: BASIS, "Content-Type": "application/json" },
    data: { email, passwort: PASSWORT },
  });
  if (r.status() !== 200) throw new Error(`Demo-Anmeldung ${email}: HTTP ${r.status()}`);
}

async function pruefeSeite(page, axeQuelle, pfad, breite, shots, schluessel) {
  let status = await lade(page, pfad, { warten: 1500 });
  if (status !== 200) {
    await page.waitForTimeout(8000);
    status = await lade(page, pfad, { warten: 1500 });
  }
  if (status !== 200) return { status, fehler: `HTTP ${status}` };
  // Auf eingeloggten Zustand prüfen: Portalseiten leiten ohne Sitzung auf /login um
  if (/\/login/.test(page.url())) return { status, fehler: "nicht angemeldet (Umleitung auf /login)" };
  if (shots) {
    mkdirSync(shots, { recursive: true });
    const name = schluessel.replace(/[^a-z0-9@-]+/gi, "_").replace(/^_+|_+$/g, "");
    await page.screenshot({ path: join(shots, `${name}.png`), fullPage: breite === 390 }).catch(() => {});
  }
  await page.addScriptTag({ content: axeQuelle });
  const erg = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    const struktur = [];
    const h1 = document.querySelectorAll("h1").length;
    if (h1 !== 1) struktur.push({ id: "struktur-h1", impact: "moderate", hilfe: `Seite hat ${h1} h1-Überschriften (erwartet: 1)`, knoten: Math.max(h1, 1), ziele: ["h1"] });
    if (!document.querySelector("main")) struktur.push({ id: "struktur-main", impact: "moderate", hilfe: "Kein <main>-Landmark", knoten: 1, ziele: ["body"] });
    const ueberlauf = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (ueberlauf > 8) struktur.push({ id: "struktur-ueberlauf", impact: "serious", hilfe: `Horizontaler Überlauf ${ueberlauf}px`, knoten: 1, ziele: ["html"] });
    return r.violations
      .map((v) => ({ id: v.id, impact: v.impact, hilfe: v.help, knoten: v.nodes.length, ziele: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }))
      .concat(struktur);
  }, TAGS);
  return { status, verstoesse: erg };
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

export async function laufAxePortal(opt) {
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
      for (const rolle of opt.rollen) {
        const def = ROLLEN[rolle];
        if (!def) {
          console.error(`  Rolle unbekannt: ${rolle}`);
          continue;
        }
        const ctx = await neuerKontext(browser, { breite });
        try {
          await anmelden(ctx, def.email);
          const page = await ctx.newPage();
          // Mobil nur Startübersicht + die zwei wichtigsten Arbeitsseiten (Laufzeit), Desktop alles
          const seiten = breite === 1440 ? def.seiten : def.seiten.slice(0, 3);
          for (const pfad of seiten) {
            const t = Date.now();
            const schluessel = `${rolle} ${pfad}${breite === 1440 ? "" : ` @${breite}`}`;
            ergebnisse[schluessel] = await pruefeSeite(page, axeQuelle, pfad, breite, opt.shots, schluessel).catch((e) => ({ status: 0, fehler: String(e).split(/\r?\n/)[0].slice(0, 200) }));
            const r = ergebnisse[schluessel];
            const s = r.verstoesse ? r.verstoesse.filter((v) => SCHWER.has(v.impact)).length : "?";
            console.log(`  ${schluessel.padEnd(44)} ${r.fehler ? "FEHLER " + r.fehler : `${r.verstoesse.length} Regeln verletzt (${s} serious/critical)`}  ${zeit(t)}`);
          }
        } catch (e) {
          ergebnisse[`${rolle} (Anmeldung)${breite === 1440 ? "" : ` @${breite}`}`] = { status: 0, fehler: String(e.message || e).slice(0, 200) };
          console.log(`  ${rolle}: FEHLER ${e.message || e}`);
        } finally {
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  return { ergebnisse, dauer: zeit(start) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opt = argumente(process.argv.slice(2));
  try {
    const { ergebnisse, dauer } = await laufAxePortal(opt);
    if (opt.json) {
      mkdirSync(dirname(resolve(opt.json)), { recursive: true });
      writeFileSync(opt.json, JSON.stringify(ergebnisse, null, 1), "utf8");
    }
    const gesamt = Object.values(ergebnisse).flatMap((r) => r.verstoesse || []);
    const schwer = gesamt.filter((v) => SCHWER.has(v.impact));
    console.log(`axe-portal: ${Object.keys(ergebnisse).length} Prüfungen in ${dauer}; ${gesamt.length} Regelverstöße, davon ${schwer.length} serious/critical (${schwer.reduce((s, v) => s + v.knoten, 0)} Elemente)`);
    if (opt.schreiben) {
      const baseline = {};
      for (const [k, r] of Object.entries(ergebnisse)) {
        if (r.fehler) {
          console.error(`Baseline NICHT geschrieben: ${k} nicht prüfbar (${r.fehler})`);
          process.exit(1);
        }
        baseline[k] = Object.fromEntries(r.verstoesse.map((v) => [v.id, v.knoten]));
      }
      writeFileSync(BASELINE, JSON.stringify({ _hinweis: "Altlasten-Stand für die axe-Ratsche auf Portalseiten (qa/axe-portal.mjs). Nur verkleinern; Ziel: leer.", _stand: new Date().toISOString().slice(0, 10), ...baseline }, null, 1) + "\n", "utf8");
      console.log(`Baseline geschrieben: ${BASELINE}`);
    } else {
      const roh = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
      const { fehler, warnungen } = bewerte(ergebnisse, roh);
      warnungen.forEach((w) => console.log(`  ! ${w}`));
      fehler.forEach((f) => console.log(`  ✗ ${f}`));
      for (const [k, regeln] of Object.entries(roh)) {
        if (k.startsWith("_") || !ergebnisse[k]?.verstoesse) continue;
        const jetzt = new Set(ergebnisse[k].verstoesse.map((v) => v.id));
        const weg = Object.keys(regeln).filter((id) => !jetzt.has(id));
        if (weg.length) console.log(`  ✓ ${k}: behoben ${weg.join(", ")} – Baseline verkleinern (--baseline-schreiben)`);
      }
      if (fehler.length) process.exitCode = 1;
    }
  } catch (e) {
    console.error(`axe-portal: ${e.message}`);
    process.exitCode = 1;
  }
}

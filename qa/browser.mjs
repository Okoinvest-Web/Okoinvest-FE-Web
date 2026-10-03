// qa/browser.mjs – gemeinsame Browser-Hilfen für axe und Funnel-E2E (Paket F)
//
// Playwright ist bewusst KEINE Projekt-Abhängigkeit (Welle 1: keine neuen npm-Pakete).
// Gesucht wird in dieser Reihenfolge:
//   1. Umgebungsvariable PLAYWRIGHT_PFAD (Ordner, der node_modules/playwright enthält, oder node_modules selbst)
//   2. node_modules des Projekts (z. B. in CI per „npm i --no-save playwright“)
//   3. ~/claude-browser/node_modules (lokale Werkzeugkiste)
// axe-core liegt im Projekt bereits transitiv (eslint-plugin-jsx-a11y) vor; Fallback wie oben.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const BASIS = (process.env.QA_BASIS_URL || "http://localhost:3100").replace(/\/$/, "");

// Nur notwendige Cookies – gleiches Format wie src/components/Cookies/cookiecomponent.js (saveConsent)
export const CONSENT_NOTWENDIG = { essential: true, functional: false, googleMaps: false, statistics: false, googleAnalytics: false };

function suchorte() {
  const orte = [];
  if (process.env.PLAYWRIGHT_PFAD) {
    const p = resolve(process.env.PLAYWRIGHT_PFAD);
    orte.push(p.endsWith("node_modules") ? dirname(p) : p);
  }
  orte.push(WURZEL, join(homedir(), "claude-browser"));
  return orte;
}

function finde(paket, datei = "") {
  for (const ort of suchorte()) {
    try {
      const req = createRequire(join(ort, "noop.js"));
      return req.resolve(datei ? `${paket}/${datei}` : paket);
    } catch {
      /* nächster Ort */
    }
  }
  return null;
}

export async function ladePlaywright() {
  const pfad = finde("playwright");
  if (!pfad) return null;
  const m = await import(pathToFileURL(pfad).href);
  return m.chromium ? m : m.default;
}

export function axePfad() {
  const p = finde("axe-core", "axe.min.js");
  return p && existsSync(p) ? p : null;
}

/** Prüft, ob der Dev-Server antwortet (ohne ihn zu starten oder zu beenden). */
export async function serverErreichbar(basis = BASIS, ms = 30000) {
  try {
    // statische Datei aus public/ – antwortet auch, während der Dev-Server Seiten kompiliert
    const r = await fetch(basis + "/icon.svg", { signal: AbortSignal.timeout(ms), redirect: "manual" });
    return r.status > 0 && r.status < 500;
  } catch {
    return false;
  }
}

export async function neuerKontext(browser, { breite = 1440, consent = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: breite < 700 ? 844 : 900 }, reducedMotion: "reduce", locale: "de-DE" });
  if (consent) {
    await ctx.addCookies([{ name: "cookieConsent", value: encodeURIComponent(JSON.stringify(CONSENT_NOTWENDIG)), url: BASIS }]);
  }
  // Externe Dienste nie aufrufen (Analytics, Karten-Kacheln …) – Prüfungen bleiben lokal und datensparsam
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  return ctx;
}

/** Seite laden; ein noch sichtbares Cookie-Banner (z. B. nach Formatwechsel) mit „Nur notwendige“ schließen. */
export async function lade(page, pfad, { warten = 1200, versuche = 3 } = {}) {
  let r = null;
  for (let v = 1; ; v++) {
    try {
      // erst DOM, dann höchstens 45 s auf „load“ (hängende Nebenressourcen im Dev-Modus sollen nicht blockieren)
      r = await page.goto(BASIS + pfad, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForLoadState("load", { timeout: 45000 }).catch(() => {});
      break;
    } catch (e) {
      // Dev-Server startet neu (Wächter) oder kompiliert noch → warten und erneut versuchen; andere Fehler sofort melden
      if (v >= versuche || !/ERR_CONNECTION_(REFUSED|RESET)|ERR_EMPTY_RESPONSE|ERR_ABORTED|Timeout [0-9]+ms exceeded/.test(String(e))) throw e;
      const t0 = Date.now();
      while (Date.now() - t0 < 120000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
    }
  }
  await page.waitForTimeout(warten);
  const knopf = page.getByRole("button", { name: /^(Nur notwendige|Weiter ohne Einwilligung|Alle ablehnen)/i }).first();
  if (await knopf.isVisible().catch(() => false)) await knopf.click({ timeout: 3000 }).catch(() => {});
  return r ? r.status() : 0;
}

export const zeit = (start) => `${((Date.now() - start) / 1000).toFixed(1)} s`;

// Filmstreifen einer Animation: Bilder im Zeitverlauf + Messung von Layout-Sprüngen (CLS) und langen Tasks.
// Aufruf: node film.mjs <url> <ausgabeordner> [breite=1440] [--el=<css>] [--reduced] [--hover=<css>]
//   ohne --el: Bilder direkt nach dem Laden (Hero-Choreografie)
//   --el:      erst zum Element scrollen, dann Bilder (Scroll-Animationen)
//   --hover:   nach dem Film über das Element fahren und Hover-Zustand aufnehmen
//   --reduced: prefers-reduced-motion simulieren (Inhalt muss trotzdem sofort sichtbar sein)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [url, out = "./film", breiteArg = "1440", ...rest] = process.argv.slice(2);
const w = Number(breiteArg) || 1440;
const el = rest.find((a) => a.startsWith("--el="))?.slice(5);
const hover = rest.find((a) => a.startsWith("--hover="))?.slice(8);
const reduced = rest.includes("--reduced");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: w, height: w < 700 ? 844 : 900 },
  reducedMotion: reduced ? "reduce" : "no-preference",
});
// Cookie-Banner vorab ausblenden, damit er nichts verdeckt
await ctx.addInitScript(() => {
  try { localStorage.setItem("cookie-consent", "necessary"); } catch {}
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls = (window.__cls || 0) + e.value; }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long = (window.__long || 0) + 1; }).observe({ type: "longtask", buffered: true });
});
const page = await ctx.newPage();
const fehler = [];
page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
page.on("pageerror", (e) => fehler.push(String(e)));

const zeiten = [0, 150, 300, 500, 800, 1200, 2000];
await page.goto(url, { waitUntil: "commit", timeout: 180000 });
await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 1500 }).catch(() => {});
const tag = (el || "laden").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").slice(0, 40);

if (el) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(800);
  const ziel = page.locator(el).first();
  // knapp unter den sichtbaren Bereich setzen, dann hineinscrollen, damit Eintritts-Animationen auslösen
  await ziel.evaluate((n) => window.scrollTo(0, n.getBoundingClientRect().top + window.scrollY - window.innerHeight - 50));
  await page.waitForTimeout(300);
  await ziel.evaluate((n) => window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY - 80, behavior: "instant" }));
}
let start = Date.now();
for (const t of zeiten) {
  const warte = t - (Date.now() - start);
  if (warte > 0) await page.waitForTimeout(warte);
  const datei = `${out}/w${w}${reduced ? "-reduced" : ""}-${tag}-t${String(t).padStart(4, "0")}.png`;
  await page.screenshot({ path: datei });
  console.log(datei);
}
if (hover) {
  await page.locator(hover).first().hover().catch(() => {});
  await page.waitForTimeout(400);
  const datei = `${out}/w${w}-${tag}-hover.png`;
  await page.screenshot({ path: datei });
  console.log(datei);
}
const cls = await page.evaluate(() => window.__cls || 0);
const lang = await page.evaluate(() => window.__long || 0);
const breite = await page.evaluate(() => document.documentElement.scrollWidth);
console.log(`CLS=${cls.toFixed(3)}${cls > 0.1 ? " (ZU HOCH, Ziel < 0.1)" : ""} lange_Tasks=${lang} scrollWidth=${breite}${breite > w ? " ÜBERLAUF" : ""} Fehler=${fehler.length}`);
fehler.slice(0, 4).forEach((f) => console.log("  ! " + f.slice(0, 180)));
await browser.close();

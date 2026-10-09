// Rechner: Regler per Tastatur bewegen, Ergebnis-Anfrage-Karte filmen, dann Anfrage klicken
// und prüfen, ob die Nachricht am Ziel vorbelegt ist.
// Aufruf: node rech-interakt.mjs <url> <ordner> [breite] [--reduced] [--regler=<index>]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [url, out = "./ri", breiteArg = "1440", ...rest] = process.argv.slice(2);
const w = Number(breiteArg) || 1440;
const reduced = rest.includes("--reduced");
const regler = Number(rest.find((a) => a.startsWith("--regler="))?.slice(9) ?? 0);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
await ctx.addInitScript(() => {
  try { localStorage.setItem("cookie-consent", "necessary"); } catch {}
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls = (window.__cls || 0) + e.value; }).observe({ type: "layout-shift", buffered: true });
});
const page = await ctx.newPage();
const fehler = [];
page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
page.on("pageerror", (e) => fehler.push(String(e)));
await page.goto(url, { waitUntil: "load", timeout: 180000 });
await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 1500 }).catch(() => {});
await page.waitForTimeout(1200);
const karte = page.locator("[data-ergebnis-anfrage]").first();
await karte.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, 120));
await page.waitForTimeout(400);
const range = page.locator('input[type="range"]').nth(regler);
await range.evaluate((el) => el.focus({ preventScroll: true })); await karte.scrollIntoViewIfNeeded();
for (let i = 0; i < 6; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(60); }
const t0 = Date.now();
for (const t of [0, 500, 900, 1300, 2200]) {
  const warte = t - (Date.now() - t0);
  if (warte > 0) await page.waitForTimeout(warte);
  await karte.screenshot({ path: `${out}/w${w}-karte-t${String(t).padStart(4, "0")}.png` }).catch(() => {});
}
const cls = await page.evaluate(() => window.__cls || 0);
const knopf = karte.locator("a[data-ov-cta]").first();
const ziel = await knopf.getAttribute("href");
await knopf.click();
await page.waitForURL((u) => !u.pathname.startsWith(new URL(url).pathname), { timeout: 300000 }).catch((e) => console.log("kein Wechsel", String(e).slice(0, 120)));
await page.waitForLoadState("load");
await page.waitForTimeout(2500);
const nachricht = await page.locator("textarea").first().inputValue().catch(() => "(kein Textfeld)");
await page.locator("textarea").first().scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: `${out}/w${w}-ziel.png` });
console.log(`CLS=${cls.toFixed(3)} ziel=${ziel} url=${page.url()} Fehler=${fehler.length}`);
console.log(`Nachricht: ${nachricht}`);
if (fehler.length) console.log(fehler.slice(0, 3).join("\n"));
await browser.close();

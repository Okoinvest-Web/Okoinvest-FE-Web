// CLS beim Scrollen messen + Position fester Leisten pruefen
import { chromium } from "playwright";
const [url, breite = "1440"] = process.argv.slice(2);
const w = Number(breite);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, hasTouch: w < 700, isMobile: w < 700 });
await ctx.addInitScript(() => {
  try { localStorage.setItem("cookie-consent", "necessary"); } catch {}
  window.__shifts = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shifts.push({ v: e.value, t: Math.round(e.startTime), src: e.sources?.map((s) => (s.node?.nodeName || "") + "." + (s.node?.className?.toString?.().slice(0, 50) || "")) }); }).observe({ type: "layout-shift", buffered: true });
});
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push(String(e)));
page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
await page.goto(url, { waitUntil: "load", timeout: 180000 });
await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 1500 }).catch(() => {});
await page.waitForTimeout(1500);
const vor = await page.evaluate(() => window.__shifts.reduce((a, s) => a + s.v, 0));
for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(120); }
await page.waitForTimeout(800);
const r = await page.evaluate(() => ({ shifts: window.__shifts, h: document.documentElement.scrollHeight }));
console.log(JSON.stringify({ clsLaden: vor.toFixed(4), clsGesamt: r.shifts.reduce((a, s) => a + s.v, 0).toFixed(4), shifts: r.shifts.filter((s) => s.v > 0.001), fehler }, null, 1));
await browser.close();

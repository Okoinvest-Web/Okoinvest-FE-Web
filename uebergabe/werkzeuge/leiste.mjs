// Prüft: verdeckt die feste Leiste unten (MobileCta / Nach-oben) nach dem Scrollen Bedienelemente?
import { chromium } from "playwright";
const [url, breite = "390"] = process.argv.slice(2);
const w = Number(breite);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1024 }, hasTouch: true, isMobile: w < 700 });
await ctx.addInitScript(() => { try { localStorage.setItem("cookie-consent", "necessary"); } catch {} });
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push(String(e)));
await page.goto(url, { waitUntil: "load", timeout: 180000 });
await page.waitForTimeout(1200);
const H = await page.evaluate(() => document.documentElement.scrollHeight);
let stopps = 0, sichtbar = 0, verdeckt = 0, btt = 0;
const beispiele = [];
for (let y = 700; y < H; y += 377) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const leiste = document.querySelector(".ov-mobile-cta");
    const knopf = document.querySelector(".ov-nach-oben");
    const sicht = (el) => el && +getComputedStyle(el).opacity > 0.5 && getComputedStyle(el).pointerEvents !== "none";
    const ziele = [...document.querySelectorAll('main :is(button, a[class*="rounded-full"], input, select, textarea, summary)')].filter((e) => e.offsetParent);
    const ueber = (el) => {
      if (!sicht(el)) return null;
      const b = el.getBoundingClientRect();
      const hit = ziele.find((z) => { const a = z.getBoundingClientRect(); return a.width && a.bottom > b.top + 4 && a.top < b.bottom - 4 && a.right > b.left + 4 && a.left < b.right - 4; });
      if (!hit) return ""; const a = hit.getBoundingClientRect(); return (hit.innerText || hit.getAttribute("aria-label") || hit.tagName + "[" + hit.type + "] " + hit.className.toString().slice(0,60)).slice(0, 120) + " top=" + Math.round(a.top) + " h=" + Math.round(a.height) + " barTop=" + Math.round(b.top) + " vh=" + innerHeight;
    };
    return { leiste: ueber(leiste), knopf: ueber(knopf) };
  });
  stopps++;
  if (r.leiste !== null) sichtbar++;
  if (r.knopf !== null) btt++;
  if (r.leiste) { verdeckt++; beispiele.push("Leiste über: " + r.leiste);
    console.log("DEBUG", y, JSON.stringify(await page.evaluate(() => new Promise((res) => { const els = [...document.querySelectorAll("main input[type=range]")]; const io = new IntersectionObserver((es) => { res(es.map((e) => [e.isIntersecting, Math.round(e.boundingClientRect.top), e.target.closest("[class*=overflow]")?.className.toString().slice(0, 80)])); io.disconnect(); }, { rootMargin: `-${innerHeight - 104}px 0px 0px 0px` }); els.forEach((e) => io.observe(e)); }))));
    await page.waitForTimeout(1500);
    console.log("DEBUG später", await page.evaluate(() => document.body.classList.contains("ov-cta-sichtbar")));
  }
  if (r.knopf) { verdeckt++; beispiele.push("Knopf über: " + r.knopf); }
}
// Fokus in ein Feld
const feld = await page.$('main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), main textarea');
let fokus = "kein Feld";
if (feld) { await feld.scrollIntoViewIfNeeded(); await feld.focus(); await page.waitForTimeout(700); fokus = await page.evaluate(() => "Leiste " + (document.body.classList.contains("ov-cta-sichtbar") ? "SICHTBAR" : "weg")); }
console.log(JSON.stringify({ url, stopps, leisteSichtbar: sichtbar, knopfSichtbar: btt, verdeckt, beispiele: beispiele.slice(0, 6), fokus, fehler }));
await browser.close();

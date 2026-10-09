import { chromium } from "playwright";
const [url, out, breite = "1440", y = "0"] = process.argv.slice(2);
const w = Number(breite);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, hasTouch: w < 700, isMobile: w < 700 });
await ctx.addInitScript(() => { try { localStorage.setItem("cookie-consent", "necessary"); } catch {} });
const page = await ctx.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push(String(e)));
page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
await page.goto(url, { waitUntil: "load", timeout: 180000 });
await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 1500 }).catch(() => {});
await page.waitForTimeout(1000);
for (const yy of y.split(",").map(Number)) {
  if (yy < 0) { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); }
  else { await page.mouse.wheel(0, 0); await page.evaluate((v) => window.scrollTo(0, v), yy); }
  await page.mouse.wheel(0, 10); await page.waitForTimeout(1200);
  const f = `${out}-y${yy}.png`;
  await page.screenshot({ path: f });
  const info = await page.evaluate(() => ({ cta: document.body.classList.contains("ov-cta-sichtbar"), btt: getComputedStyle(document.querySelector(".ov-nach-oben") || document.body).opacity, el: (() => { const e = document.elementFromPoint(innerWidth / 2, 20); return e?.tagName + "." + (e?.className?.toString?.().slice(0, 40) || ""); })() }));
  console.log(f, JSON.stringify(info));
}
console.log("fehler", JSON.stringify(fehler));
await browser.close();

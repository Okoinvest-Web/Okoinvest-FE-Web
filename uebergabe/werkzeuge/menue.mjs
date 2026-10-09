import { chromium } from "playwright";
const D = process.argv[2];
const browser = await chromium.launch();
for (const w of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("cookie-consent", "necessary"); } catch {} });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3100/freiflaeche", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
  await page.waitForTimeout(800);
  if (w < 1000) {
    await page.click('button[aria-label="Menü öffnen"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${D}/menue-${w}.png` });
    const ok = await page.evaluate(() => { const d = document.querySelector('[role="dialog"][aria-label="Menü"]'); const r = d.getBoundingClientRect(); const e = document.elementFromPoint(r.width / 2, 300); return { inMenu: d.contains(e), r: [r.top, r.height] }; });
    console.log(w, JSON.stringify(ok));
  } else {
    await page.hover('nav[aria-label="Hauptnavigation"] button');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${D}/mega-${w}.png` });
    const ok = await page.evaluate(() => { const m = document.querySelector("#ov-mega a[href]"); const r = m.getBoundingClientRect(); const e = document.elementFromPoint(r.left + 10, r.top + 10); return { linkTop: Math.round(r.top), hit: m.contains(e) || m === e }; });
    console.log(w, JSON.stringify(ok));
    // Klick in Inhalt unterhalb der sichtbaren Kopfleiste (Bereich 70–120 px) muss den Inhalt treffen
    await page.mouse.move(700, 600); await page.waitForTimeout(500);
    console.log("unter Kopf", await page.evaluate(() => { const e = document.elementFromPoint(700, 100); return e.closest("header") ? "HEADER (blockiert)" : "Inhalt " + e.tagName; }));
  }
  await ctx.close();
}
await browser.close();

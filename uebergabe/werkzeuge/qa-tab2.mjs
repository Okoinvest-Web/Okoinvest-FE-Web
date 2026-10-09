import { chromium } from "playwright";
const [url, outDir, startSel, n = "12"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "cookieConsent", value: encodeURIComponent(JSON.stringify({ essential: true })), url: "http://localhost:3100" }]);
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "load", timeout: 180000 }); await p.waitForTimeout(2000);
if (startSel) await p.focus(startSel);
for (let i = 0; i < +n; i++) {
  await p.keyboard.press("Tab"); await p.waitForTimeout(900);
  const info = await p.evaluate(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); const lab = e.labels && e.labels[0]; const lr = lab ? lab.getBoundingClientRect() : null; const cs = getComputedStyle(e); return `${e.tagName}[${e.type||""}] name=${e.name||""} aria=${e.getAttribute("aria-label")||""} text="${(lab?lab.textContent:e.textContent||"").trim().replace(/\s+/g," ").slice(0,40)}" top=${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} op=${cs.opacity} labelTop=${lr?Math.round(lr.top):"-"}`; });
  console.log(i + 1, info);
  await p.screenshot({ path: `${outDir}/t${String(i+1).padStart(2,"0")}.png` });
}
await b.close();

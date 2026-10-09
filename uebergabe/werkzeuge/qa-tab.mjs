import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:3100/energiegemeinschaften/software";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "cookieConsent", value: encodeURIComponent(JSON.stringify({ essential: true })), url: "http://localhost:3100" }]);
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "load", timeout: 180000 }); await p.waitForTimeout(2000);
const h = await p.evaluate(() => [...document.querySelectorAll("main h1, main h2, main h3, main h4, h1")].filter((e,i,a)=>a.indexOf(e)===i).map(e => +e.tagName[1] + " " + e.textContent.trim().slice(0, 60)));
console.log("H1 gesamt:", await p.evaluate(() => document.querySelectorAll("h1").length));
let prev = 1, spr = [];
for (const x of h) { const l = +x[0]; if (l > prev + 1) spr.push(x); prev = l; }
console.log("Sprünge:", spr);
console.log(h.join("\n"));
const out = [];
for (let i = 0; i < 40; i++) {
  await p.keyboard.press("Tab"); await p.waitForTimeout(80);
  out.push(await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return "BODY"; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const vis = r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && +cs.opacity > 0.05; const ring = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== "none"; return `${vis ? "" : "UNSICHTBAR "}${ring ? "" : "KEIN-RING "}${e.tagName} "${(e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g," ").slice(0, 40)}" ${Math.round(r.top)}`; }));
  if (i === 6 || i === 20 || i === 32) await p.screenshot({ path: `${process.argv[3] || "."}/tab-${i}.png` });
}
console.log(out.map((o, i) => i + 1 + ": " + o).join("\n"));
await b.close();

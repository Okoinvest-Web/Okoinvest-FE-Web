import { chromium } from "playwright";
const [out] = process.argv.slice(2);
const texte = ["Die Gemeinschaft führen", "Der Verein läuft mit", "Strom aus der Nachbarschaft", "Abrechnung als geführte Routine"];
const b = await chromium.launch();
for (const w of [1440, 768, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addCookies([{ name: "cookieConsent", value: encodeURIComponent(JSON.stringify({ essential: true })), url: "http://localhost:3100" }]);
  const p = await ctx.newPage(); const fehler = []; p.on("pageerror", e => fehler.push(String(e)));
  await p.goto("http://localhost:3100/energiegemeinschaften/software", { waitUntil: "load", timeout: 180000 }); await p.waitForTimeout(1500);
  for (const [i, t] of texte.entries()) {
    const h = p.locator(`h1:has-text("${t}"), h2:has-text("${t}"), h3:has-text("${t}")`).first();
    await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
    const zeilen = await h.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); const rects = [...r.getClientRects()]; const tops = [...new Set(rects.map(x => Math.round(x.top)))]; return tops.length; });
    // Zeilenanfänge mit Gedankenstrich ermitteln
    const strichVorn = await h.evaluate(el => { const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, res = false; while ((n = tw.nextNode())) { const i = n.data.indexOf("–"); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const a = r.getBoundingClientRect(); const elr = el.getBoundingClientRect(); if (a.left - elr.left < 4) res = true; } return res; });
    console.log(w, t, "Zeilen", zeilen, strichVorn ? "STRICH AM ZEILENANFANG" : "ok");
    await h.screenshot({ path: `${out}/h-${w}-${i}.png` });
  }
  console.log(w, "Fehler", fehler.length);
  await ctx.close();
}
await b.close();

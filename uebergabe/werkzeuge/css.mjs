import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3100/zz-motion-test", { waitUntil: "load", timeout: 180000 });
console.log(await page.evaluate(() => {
  const out = [];
  out.push("supports view(): " + CSS.supports("animation-timeline: view()") + " ua " + navigator.userAgent.match(/Chrome\/[\d.]+/));
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { const t = r.cssText; if (t.includes("ov-parallax") || t.includes("scroll-fortschritt")) out.push(t.slice(0, 400)); } } catch {} }
  return out.join("\n");
}));
await browser.close();

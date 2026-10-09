import { chromium } from "playwright";
const [url, sel, y] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: "load", timeout: 180000 });
await p.waitForTimeout(800);
const r = await p.evaluate(([sel, y]) => {
  const el = document.querySelector(sel);
  const cs = getComputedStyle(el);
  const box = el.parentElement.getBoundingClientRect();
  document.documentElement.style.scrollBehavior="auto"; window.scrollTo(0, box.top + scrollY - Number(y));
  return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => {
    const cs2 = getComputedStyle(el); const bb = el.parentElement.getBoundingClientRect(); const eb = el.getBoundingClientRect();
    res({ name: cs2.animationName, tl: cs2.animationTimeline, rs: cs2.animationRangeStart, re: cs2.animationRangeEnd, tf: cs2.transform, parentTop: bb.top, parentH: bb.height, fillBottom: eb.bottom });
  })));
}, [sel, y]);
console.log(JSON.stringify(r));
await b.close();

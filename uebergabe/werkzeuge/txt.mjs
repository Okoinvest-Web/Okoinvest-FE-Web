// Gerenderten Seitentext mit Playwright prüfen: node txt.mjs <url> <suchbegriff> [...]
import { chromium } from "playwright";
const [url, ...such] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(url, { waitUntil: "load", timeout: 180000 }); await p.waitForTimeout(1500);
const t = await p.evaluate(() => document.body.innerText);
for (const s of such) console.log(`${t.includes(s) ? "gefunden " : "FEHLT    "} ${s}`);
await b.close();

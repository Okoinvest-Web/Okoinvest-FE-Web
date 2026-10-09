import { chromium } from "playwright";
const [url, breite = "1440"] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(breite), height: 900 } }); await ctx.addInitScript(() => { try { localStorage.setItem("cookie-consent", "necessary"); } catch {} }); const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log(m.text().slice(0, 3000)));
page.on("pageerror", (e) => console.log("PAGEERR", String(e).slice(0, 2000)));
await page.goto(url, { waitUntil: "load", timeout: 180000 });
await page.waitForTimeout(2500);
await browser.close();

// Schnellprüfung vieler Seiten nacheinander in einem Browser:
// HTTP-Status, Konsolenfehler, horizontaler Überlauf, Bild des oberen Bildschirms.
// Aufruf: node check.mjs <basis-url> <ausgabeordner> <breiten> <pfad1> <pfad2> ...
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [basis, out, breitenArg, ...pfade] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
// Cookie-Banner vorab wegklicken, indem wir es einmal schließen
let bannerZu = false;

for (const w of breitenArg.split(",").map(Number)) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: w < 700 ? 844 : 900 });
  for (const pfad of pfade) {
    const fehler = [];
    const onC = (m) => m.type() === "error" && fehler.push(m.text());
    const onE = (e) => fehler.push(String(e));
    page.on("console", onC);
    page.on("pageerror", onE);
    let status = 0;
    try {
      const r = await page.goto(basis + pfad, { waitUntil: "load", timeout: 180000 });
      status = r ? r.status() : 0;
      await page.waitForTimeout(1500);
      if (!bannerZu) {
        await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 4000 }).then(() => { bannerZu = true; }).catch(() => {});
      }
      const breite = await page.evaluate(() => document.documentElement.scrollWidth);
      const overlay = await page.locator("nextjs-portal").count();
      const name = pfad.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "start";
      await page.screenshot({ path: `${out}/w${w}-${name}.png` });
      const ok = status === 200 && breite <= w && fehler.length === 0;
      console.log(`${ok ? "OK  " : "!!  "} w${w} ${pfad}  status=${status} breite=${breite}${breite > w ? " ÜBERLAUF" : ""} fehler=${fehler.length}${overlay ? " (Dev-Overlay)" : ""}`);
      fehler.slice(0, 3).forEach((f) => console.log("       ! " + f.slice(0, 180)));
    } catch (e) {
      console.log(`!!   w${w} ${pfad}  LADEFEHLER ${String(e).slice(0, 120)}`);
    }
    page.off("console", onC);
    page.off("pageerror", onE);
  }
  await page.close();
}
await browser.close();

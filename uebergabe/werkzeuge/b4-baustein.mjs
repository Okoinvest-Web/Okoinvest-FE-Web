// Bericht-Baustein (Paket B4) je Rechner: geschlossen und geöffnet, 1440/390
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [basis, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const SEITEN = [["pacht", "/rechner/pacht"], ["pachtangebot", "/rechner/pachtangebot-check"], ["kommune", "/rechner/kommune"], ["flaechencheck", "/flaechencheck"]];
const b = await chromium.launch();
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: "cookieConsent", value: encodeURIComponent(JSON.stringify({ essential: true, functional: false, googleMaps: false, statistics: false, googleAnalytics: false })), url: basis }]);
  await ctx.addInitScript(() => window.sessionStorage.setItem("ov-flaechencheck", JSON.stringify({ schritt: 4, land: "DE", regionId: "de-sued", ha: 14, nutzung: "acker", besonderheiten: [], netz: "1-3", eigentum: "allein" })));
  const p = await ctx.newPage();
  for (const [r, pfad] of SEITEN) {
    const fehler = [];
    p.removeAllListeners("pageerror"); p.on("pageerror", (e) => fehler.push(String(e)));
    await p.goto(basis + pfad, { waitUntil: "load", timeout: 180000 });
    await p.getByRole("button", { name: /^Nur notwendige/ }).first().click({ timeout: 4000 }).catch(() => {});
    const box = p.locator(`[data-bericht-anfordern="${r}"][data-bericht-status="an"]`);
    await box.waitFor({ timeout: 120000 });
    await box.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
    await box.screenshot({ path: `${out}/w${w}-${r}-zu.png` });
    await box.getByRole("button", { name: "Bericht anfordern" }).click();
    await p.waitForTimeout(700);
    await box.screenshot({ path: `${out}/w${w}-${r}-offen.png` });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log(`w${w} ${r} breite=${sw}${sw > w ? " ÜBERLAUF" : ""} fehler=${fehler.length}`);
  }
  await ctx.close();
}
await b.close();

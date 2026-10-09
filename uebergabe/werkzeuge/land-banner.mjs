// Welle 2, Länderrouting: Bilder von Länderhinweis (Banner), Länderwechsler und Navigation je Land.
// Aufruf: node land-banner.mjs <basis-url> <ausgabeordner>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [basis = "http://localhost:3100", out = "."] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const consent = { name: "cookieConsent", value: encodeURIComponent(JSON.stringify({ essential: true, functional: false, googleMaps: false, statistics: false, googleAnalytics: false })), url: basis };

async function seite(breite, locale = "de-DE") {
  const ctx = await browser.newContext({ viewport: { width: breite, height: breite < 700 ? 844 : 900 }, locale, reducedMotion: "reduce" });
  await ctx.addCookies([consent]);
  const page = await ctx.newPage();
  const fehler = [];
  page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
  page.on("pageerror", (e) => fehler.push(String(e)));
  return { ctx, page, fehler };
}

for (const breite of [1440, 390]) {
  // 1) Banner: de-DE-Besucher auf /at/flaechencheck
  const a = await seite(breite);
  await a.page.goto(`${basis}/at/flaechencheck`, { waitUntil: "load", timeout: 180000 });
  await a.page.waitForTimeout(1500);
  await a.page.getByRole("button", { name: /^Nur notwendige/ }).first().click({ timeout: 8000 }).catch(() => {});
  const banner = a.page.getByRole("region", { name: "Ländervorschlag" });
  await banner.waitFor({ state: "visible", timeout: 60000 }).catch(() => {});
  await a.page.waitForTimeout(800);
  await a.page.screenshot({ path: `${out}/banner-w${breite}.png` });
  const cookieVorher = (await a.ctx.cookies(basis)).some((c) => c.name === "land");
  console.log(`w${breite} Banner sichtbar=${await banner.isVisible()} cookieVorKlick=${cookieVorher} fehler=${a.fehler.length}`);
  a.fehler.slice(0, 3).forEach((f) => console.log("   ! " + f.slice(0, 200)));
  await a.ctx.close();

  // 2) Länderwechsler und Navigation auf /at (Desktop: Live-Leiste; Mobil: Menü)
  const b = await seite(breite, "de-AT");
  await b.page.goto(`${basis}/at`, { waitUntil: "load", timeout: 180000 });
  await b.page.waitForTimeout(1500);
  await b.page.getByRole("button", { name: /^Nur notwendige/ }).first().click({ timeout: 8000 }).catch(() => {});
  await b.page.waitForTimeout(500);
  if (breite >= 1280) {
    await b.page.screenshot({ path: `${out}/wechsler-w${breite}.png`, clip: { x: 0, y: 0, width: breite, height: 140 } });
    await b.page.getByRole("button", { name: "Rechner & Tools" }).click().catch(() => {});
    await b.page.waitForTimeout(800);
    await b.page.screenshot({ path: `${out}/mega-at-w${breite}.png` });
  } else {
    await b.page.getByRole("button", { name: /Menü/ }).first().click().catch(() => {});
    await b.page.waitForTimeout(800);
    await b.page.getByRole("button", { name: "Rechner & Tools" }).click().catch(() => {});
    await b.page.waitForTimeout(600);
    await b.page.screenshot({ path: `${out}/menue-at-w${breite}.png` });
  }
  await b.page.keyboard.press("Escape").catch(() => {});
  const fuss = b.page.locator("footer");
  await fuss.scrollIntoViewIfNeeded();
  await b.page.waitForTimeout(600);
  await fuss.screenshot({ path: `${out}/fuss-at-w${breite}.png` });
  console.log(`w${breite} /at Navigation fehler=${b.fehler.length}`);
  b.fehler.slice(0, 3).forEach((f) => console.log("   ! " + f.slice(0, 200)));
  await b.ctx.close();
}
await browser.close();

// Paket B: Banner-Ablauf und Netzwerkprotokoll (Google-Anfragen) prüfen
import { chromium } from "playwright";
const [basis, out] = process.argv.slice(2);
const browser = await chromium.launch();
const log = (...a) => console.log(...a);

async function lauf(name, aktion, pfade) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const google = [];
  ctx.on("request", (r) => { if (/google|doubleclick|gtag/.test(r.url())) google.push(r.url()); });
  const page = await ctx.newPage();
  await page.goto(basis + "/kontakt", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${name}-banner.png` });
  await aktion(page);
  await page.waitForTimeout(800);
  const cookies = await ctx.cookies();
  const consent = cookies.find((c) => c.name === "cookieConsent");
  log(`[${name}] cookieConsent=${consent ? decodeURIComponent(consent.value) : "-"}`);
  log(`[${name}] Analytics-Cookies: ${cookies.filter((c) => /^_ga/.test(c.name)).map((c) => c.name).join(",") || "keine"}`);
  for (const p of pfade) {
    await page.goto(basis + p, { waitUntil: "load", timeout: 180000 });
    await page.waitForTimeout(1500);
    const skripte = await page.evaluate(() => [...document.scripts].filter((s) => /googletagmanager/.test(s.src)).length);
    const flags = await page.evaluate(() => ({ aktiv: window.ovMessungAktiv ?? null, geladen: window.ovGaGeladen ?? null }));
    log(`[${name}] ${p}: GA-Skripte=${skripte} ovMessungAktiv=${flags.aktiv} ovGaGeladen=${flags.geladen}`);
  }
  log(`[${name}] Google-Anfragen gesamt: ${google.length}${google.length ? " " + google.slice(0, 3).join(" | ") : ""}`);
  await ctx.close();
}

await lauf("ablehnen", (p) => p.locator("button", { hasText: "Nur notwendige" }).first().click(), ["/einladung/tok123", "/kontakt"]);
await lauf("weiter-ohne", async (p) => {
  await p.locator("button", { hasText: "Individuelle Einstellungen" }).first().click();
  await p.waitForTimeout(600);
  await p.locator("#statistics-cookies").check();
  await p.screenshot({ path: `${out}/detail-dialog.png` });
  await p.locator("button", { hasText: "Weiter ohne Einwilligung" }).first().click();
}, []);
await lauf("auswahl-speichern", async (p) => {
  await p.locator("button", { hasText: "Individuelle Einstellungen" }).first().click();
  await p.waitForTimeout(600);
  await p.locator("button", { hasText: "Auswahl speichern" }).first().click();
}, []);
await lauf("akzeptieren", (p) => p.locator("button", { hasText: "Alle akzeptieren" }).first().click(), ["/einladung/tok123", "/einladung/bank/tok", "/portal", "/login/link", "/angebot/CODE1", "/kontakt"]);
await browser.close();

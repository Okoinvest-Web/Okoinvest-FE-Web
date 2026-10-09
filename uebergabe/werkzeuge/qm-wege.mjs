// QM: Conversion-Wege durchklicken, NICHTS absenden (alle Nicht-GET an /api/* werden abgefangen).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const B = "http://localhost:3100";
const out = process.argv[2] || "./qm-wege";
const nur = process.argv[3];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const log = (...a) => console.log(...a);

async function neu(w = 1440) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("cookie-consent", "necessary"); } catch {} });
  await ctx.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const fehler = [];
  page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
  page.on("pageerror", (e) => fehler.push(String(e)));
  const banner = async () => page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 2500 }).catch(() => {});
  return { ctx, page, fehler, banner };
}

const tests = {
  async pacht() {
    const { ctx, page, fehler, banner } = await neu();
    await page.goto(B + "/rechner/pacht", { waitUntil: "load", timeout: 180000 });
    await banner();
    await page.waitForTimeout(1500);
    const link = page.locator('a[href="/flaechencheck#check"]').first();
    log("pacht: Übergabe-Link vorhanden:", await link.count());
    await link.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(/flaechencheck/, { timeout: 180000 }), link.click()]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => sessionStorage.getItem("ov-flaechencheck"));
    const kopf = await page.locator("#check h2").first().textContent().catch(() => "?");
    const ha = await page.locator("#check input[inputmode], #check input[type=text], #check input[type=number]").first().inputValue().catch(() => "?");
    log("pacht→check: Schritt-Überschrift:", kopf?.trim(), "| ha-Feld:", ha, "| Speicher:", st);
    await page.locator("#check").screenshot({ path: `${out}/pacht-check.png` }).catch(() => {});
    log("pacht: Fehler", fehler.length, fehler.slice(0, 2));
    await ctx.close();
  },
  async agri() {
    const { ctx, page, fehler, banner } = await neu();
    await page.goto(B + "/rechner/agri-pv", { waitUntil: "load", timeout: 180000 });
    await banner();
    await page.waitForTimeout(1500);
    const link = page.locator('a[href="/flaechencheck#check"]').first();
    log("agri: Übergabe-Link vorhanden:", await link.count());
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded();
      await Promise.all([page.waitForURL(/flaechencheck/, { timeout: 180000 }), link.click()]);
      await page.waitForTimeout(2500);
      log("agri→check:", (await page.locator("#check h2").first().textContent().catch(() => "?"))?.trim(), await page.evaluate(() => sessionStorage.getItem("ov-flaechencheck")));
    }
    log("agri: Fehler", fehler.length, fehler.slice(0, 2));
    await ctx.close();
  },
  async startreg() {
    const { ctx, page, fehler, banner } = await neu();
    await page.goto(B + "/", { waitUntil: "load", timeout: 180000 });
    await banner();
    await page.waitForTimeout(1200);
    await page.getByRole("tab", { name: /Investor/ }).first().click().catch(() => log("kein Tab Investor"));
    await page.waitForTimeout(400);
    const reg = page.locator('a[href^="/registrieren?rolle="]').first();
    log("start: Registrier-Link:", await reg.getAttribute("href").catch(() => "-"));
    const cta = await page.evaluate(() => [...document.querySelectorAll("section a")].filter((a) => a.href.includes("rolle=investor")).map((a) => a.textContent.trim()));
    log("start: Investor-Links auf der Seite:", JSON.stringify(cta));
    await Promise.all([page.waitForURL(/registrieren/, { timeout: 180000 }), reg.click()]);
    await page.waitForLoadState("load");
    await page.waitForTimeout(2500);
    const gewaehlt = await page.evaluate(() => [...document.querySelectorAll('[data-feld="rollen"] input:checked')].map((i) => i.closest("label").textContent.trim().slice(0, 30)));
    log("registrieren: vorgewählt:", JSON.stringify(gewaehlt), "| Text Rolle:", (await page.locator("form").first().textContent()).match(/Investor[^.]{0,40}/)?.[0]);
    await page.screenshot({ path: `${out}/reg-preset.png` });
    await page.goto(B + "/registrieren", { waitUntil: "load", timeout: 180000 });
    await page.waitForTimeout(2000);
    // Tastatur: Tab bis zur ersten Rollenkarte, Leertaste umschalten
    await page.locator('[data-feld="rollen"] input').nth(0).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Space");
    const nach = await page.locator('[data-feld="rollen"] input').nth(0).isChecked();
    log("registrieren: Leertaste schaltet Karte 1 →", nach);
    await page.locator('[data-feld="rollen"]').screenshot({ path: `${out}/reg-rollen-fokus.png` });
    log("start/reg: Fehler", fehler.length, fehler.slice(0, 2));
    await ctx.close();
  },
  async startanfrage() {
    const { ctx, page, fehler, banner } = await neu(390);
    await page.goto(B + "/", { waitUntil: "load", timeout: 180000 });
    await banner();
    await page.waitForTimeout(1200);
    const cta = page.getByRole("link", { name: /Fläche kostenlos prüfen/ }).first();
    log("start(390): Hero-CTA href:", await cta.getAttribute("href"));
    await Promise.all([page.waitForURL(/flaechencheck/, { timeout: 180000 }), cta.click()]);
    await page.waitForTimeout(2000);
    // Tastatur bis zum ersten Land-Chip
    const land = page.locator("#check button, #check input").first();
    log("check(390): erstes Bedienelement:", (await land.textContent().catch(() => ""))?.trim().slice(0, 30));
    log("start→check: Fehler", fehler.length, fehler.slice(0, 2));
    await ctx.close();
  },
  async kontakt() {
    const { ctx, page, fehler, banner } = await neu(390);
    await page.goto(B + "/kontakt?anliegen=kommune", { waitUntil: "load", timeout: 180000 });
    await banner();
    await page.waitForTimeout(1500);
    const form = page.locator("form").first();
    await form.scrollIntoViewIfNeeded();
    // Absenden mit leeren Feldern → Fokus aufs erste ungültige Feld (es wird nichts gesendet: Validierung + API-Sperre)
    await form.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(600);
    const fokus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.getAttribute("name") || document.activeElement?.id, live: document.querySelectorAll('[aria-live="polite"],[aria-live="assertive"],[role="alert"]').length }));
    log("kontakt: nach leerem Absenden Fokus:", JSON.stringify(fokus));
    await page.screenshot({ path: `${out}/kontakt-fehler-390.png` });
    log("kontakt: Fehler", fehler.length, fehler.slice(0, 2));
    await ctx.close();
  },
  async mobil() {
    const { ctx, page, fehler, banner } = await neu(390);
    for (const p of ["/investoren", "/reststrom", "/energiegemeinschaften", "/kommunen", "/freiflaeche"]) {
      await page.goto(B + p, { waitUntil: "load", timeout: 180000 });
      await banner();
      await page.waitForTimeout(1000);
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(1200);
      const t = await page.evaluate(() => {
        const l = document.querySelector(".ov-mobile-cta");
        if (!l) return "keine Leiste";
        const a = l.querySelectorAll("a")[1];
        const r = a.getBoundingClientRect();
        return `${a.textContent.trim()} → ${a.getAttribute("href")} | inert=${l.inert} | Breite Text ok=${a.scrollWidth <= a.clientWidth + 1}`;
      });
      log(`mobil ${p}: ${t}`);
      await page.screenshot({ path: `${out}/mobil${p.replace(/\//g, "_")}.png` });
    }
    log("mobil: Fehler", fehler.length, fehler.slice(0, 2));
    await ctx.close();
  },
};
for (const [n, f] of Object.entries(tests)) {
  if (nur && !nur.split(",").includes(n)) continue;
  try { await f(); } catch (e) { log(`!! ${n}: ${String(e).slice(0, 200)}`); }
}
await browser.close();

// Sichtprüfung Lead-Desk (Welle 2, Paket B3): Admin-Login (Demo), /portal/admin/leads bei 1440 und 390,
// Konsolenfehler, Überlauf, Ganzseiten-Bild. Optional: 2 echte Demo-Anfragen (--anfragen).
// Aufruf: node b3-leads.mjs <basis> <ausgabeordner> [--anfragen]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [basis, out, ...rest] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const h = { Origin: basis, "Content-Type": "application/json" };

if (rest.includes("--anfragen")) {
  const anfragen = [
    { typ: "flaeche", kontakt: { vorname: "Sicht", nachname: "Prüfung", email: "b3.sicht.at@example.com", telefon: "+43 662 000000", land: "AT", plz: "5020" }, daten: { ha: 24, nachricht: "Sichtprüfung B3 – bitte ignorieren" }, rueckruf: true, einwilligungen: { werbeanruf: true }, herkunft: {} },
    { typ: "speicher", kontakt: { vorname: "Sicht", nachname: "Prüfung", email: "b3.sicht.unbekannt@example.com" }, daten: { groesse: "10-50" }, einwilligungen: { newsletter: true }, herkunft: {} },
  ];
  for (const a of anfragen) {
    const r = await ctx.request.post(`${basis}/api/anfrage`, { headers: h, data: a });
    console.log("anfrage", r.status());
  }
}

const login = await ctx.request.post(`${basis}/api/auth/login`, { headers: h, data: { email: "admin@example.com", passwort: process.env.PLATTFORM_DEMO_PASSWORT || "Demo-2026!" } });
console.log("login", login.status(), JSON.stringify(await login.json()).slice(0, 120));

for (const w of [1440, 390]) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: w < 700 ? 844 : 900 });
  const fehler = [];
  page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
  page.on("pageerror", (e) => fehler.push(String(e)));
  const pfad = rest.find((x) => x.startsWith("/")) || "/portal/admin/leads";
  const r = await page.goto(basis + pfad, { waitUntil: "load", timeout: 240000 });
  await page.waitForTimeout(2500);
  await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 3000 }).catch(() => {});
  const breite = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `${out}/w${w}-full.png`, fullPage: true });
  await page.screenshot({ path: `${out}/w${w}-oben.png` });
  console.log(`${r?.status() === 200 && breite <= w && !fehler.length ? "OK  " : "!!  "} w${w} ${pfad} status=${r?.status()} url=${page.url().replace(basis, "")} breite=${breite} fehler=${fehler.length}`);
  fehler.slice(0, 5).forEach((f) => console.log("   !", f.slice(0, 200)));
  if (w === 1440) {
    // Dialog „Art. 17“ öffnen (nicht absenden) – Bild für die Sichtprüfung
    const knopf = page.getByRole("button", { name: "Art. 17" }).first();
    if (await knopf.count()) {
      await knopf.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/w${w}-dialog-loeschen.png` });
      await page.keyboard.press("Escape");
    }
  }
  await page.close();
}
await browser.close();

// Formular-Durchlauf für das Conversion-Kern-Paket (füllt aus, sendet NIE ab).
// node kern-fill.mjs <modus: registrieren|kontakt|flaeche> <basis> <out> [breite] [--reduced]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [modus, basis, out, breiteArg = "1440", ...rest] = process.argv.slice(2);
const w = Number(breiteArg);
const reduced = rest.includes("--reduced");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
await ctx.addInitScript(() => {
  try { localStorage.setItem("cookie-consent", "necessary"); } catch {}
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls = (window.__cls || 0) + e.value; }).observe({ type: "layout-shift", buffered: true });
});
// Absenden sicher verhindern: jede POST-Anfrage an /api wird abgebrochen
await ctx.route("**/api/**", (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
const page = await ctx.newPage();
const fehler = [];
page.on("console", (m) => m.type() === "error" && fehler.push(m.text().slice(0, 160)));
page.on("pageerror", (e) => fehler.push(String(e).slice(0, 160)));
const p = (n) => `${out}/${modus}-w${w}${reduced ? "-r" : ""}-${n}.png`;
const shot = async (n, el) => { const f = p(n); if (el) await page.locator(el).first().screenshot({ path: f }); else await page.screenshot({ path: f }); console.log(f); };
const zu = async (sel) => { await page.locator(sel).first().evaluate((n) => n.scrollIntoView({ block: "center", behavior: "instant" })); await page.waitForTimeout(250); };
const banner = () => page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 2500 }).catch(() => {});

if (modus === "registrieren") {
  await page.goto(basis + "/registrieren", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1500); await banner();
  await shot("0-start");
  await zu("[data-feld=rollen]");
  await page.locator("[data-feld=rollen] label").nth(2).click();
  await page.waitForTimeout(120);
  await shot("1-rolle-120ms");
  await page.waitForTimeout(500);
  await page.locator("input[name=vorname]").fill("Erika");
  await page.locator("input[name=nachname]").fill("Muster");
  await page.locator("input[name=email]").fill("erika@");
  await page.locator("input[name=telefon]").focus();
  await page.waitForTimeout(500);
  await zu("input[name=email]");
  await shot("2-fehler");
  await page.locator("input[name=email]").fill("erika@beispiel.de");
  await page.locator("input[name=passwort]").fill("Sonnen-Feld-2026");
  await page.locator("input[name=agb]").check();
  await page.waitForTimeout(700);
  await zu("button[type=submit]");
  await shot("3-bereit");
  // Leeres Absenden-Szenario nicht nötig; Fokus-Test: Tab-Reihenfolge der Rollenkarten
} else if (modus === "kontakt") {
  await page.goto(basis + "/kontakt", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1500); await banner();
  await zu("form button[type=submit]");
  await shot("0-leer");
  await page.locator("form input[name=vorname]").fill("Erika");
  await page.locator("form input[name=nachname]").fill("Muster");
  await page.locator("form input[name=email]").fill("erika@beispiel.de");
  await page.locator("form input[name=email]").blur();
  await page.waitForTimeout(600);
  await zu("form button[type=submit]");
  await shot("1-teil");
  await page.locator("form input[name=einwilligung]").check();
  await page.waitForTimeout(700);
  await shot("2-bereit");
} else if (modus === "flaeche") {
  await page.goto(basis + "/flaechencheck?ha=12&land=AT", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1800); await banner();
  await zu("[aria-label=Fortschritt]");
  await shot("0-uebernahme");
} else if (modus === "erfolg" || modus === "netzfehler") {
  // Antwort wird IM BROWSER simuliert (route.fulfill) – nichts erreicht den Server, keine Testdaten.
  await page.route("**/api/anfrage", (r) => r.fulfill(modus === "erfolg"
    ? { status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "A-TEST-0000" }) }
    : { status: 503, contentType: "text/plain", body: "" }));
  await page.goto(basis + "/kontakt", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1500); await banner();
  await page.locator("form input[name=vorname]").fill("Erika");
  await page.locator("form input[name=nachname]").fill("Muster");
  await page.locator("form input[name=email]").fill("erika@beispiel.de");
  await page.locator("form input[name=einwilligung]").check();
  await zu("form button[type=submit]");
  await page.locator("form button[type=submit]").click();
  const t0 = Date.now();
  for (const t of [100, 900, 1300, 1700, 2400]) {
    const warte = t - (Date.now() - t0); if (warte > 0) await page.waitForTimeout(warte);
    await shot(`zeit-${t}`);
  }
  console.log("Fokus:", await page.evaluate(() => document.activeElement?.tagName + " " + (document.activeElement?.textContent || "").slice(0, 40)));
} else if (modus === "ergebnis") {
  await page.goto(basis + "/flaechencheck?ha=12&land=AT", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(1800); await banner();
  const weiter = () => page.locator("button", { hasText: /^(Weiter|Nichts davon – weiter|Ergebnis anzeigen)/ }).first().click();
  await page.locator("input[name=nutzung]").first().locator("xpath=..").click();
  await weiter(); await page.waitForTimeout(500);
  await weiter(); await page.waitForTimeout(500);
  await page.locator("input[name=netz]").first().locator("xpath=..").click();
  await page.locator("input[name=eigentum]").first().locator("xpath=..").click();
  await weiter();
  const t0 = Date.now();
  for (const t of [60, 250, 500, 800, 1400]) {
    const warte = t - (Date.now() - t0); if (warte > 0) await page.waitForTimeout(warte);
    await shot(`1-tacho-${t}`);
  }
  await zu("#fc-anfrage");
  await shot("2-anfrage");
}
const cls = await page.evaluate(() => window.__cls || 0);
console.log(`CLS=${cls.toFixed(3)} Fehler=${fehler.length}`, fehler.slice(0, 3).join(" | "));
await browser.close();

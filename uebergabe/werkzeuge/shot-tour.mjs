// Screenshots einer Seite in mehreren Breiten, sammelt Konsolenfehler.
// Aufruf: node shot.mjs <url> <ausgabeordner> [breiten, z. B. 1440,768,390] [--full | --tiles | --el=<css>]
//   --el=<css> jedes passende Element einzeln aufnehmen, z. B. --el=[data-abschnitt=hero]
//   --full   eine Ganzseiten-Aufnahme (Reveal-Inhalte werden vorher sichtbar gemacht)
//   --tiles  eine Aufnahme je Bildschirmhöhe beim echten Scrollen (wie ein Mensch sieht)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [url, out = "./shots", breitenArg = "1440,390", ...rest] = process.argv.slice(2);
const full = rest.includes("--full");
const tiles = rest.includes("--tiles");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const w of breitenArg.split(",").map(Number)) {
  const h = w < 700 ? 844 : 900;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const fehler = [];
  page.on("console", (m) => m.type() === "error" && fehler.push(m.text()));
  page.on("pageerror", (e) => fehler.push(String(e)));
  for (let v = 0; v < 6; v++) { try { await page.goto(url, { waitUntil: "load", timeout: 120000 }); break; } catch (e) { console.log("  retry", String(e).slice(0, 80)); await new Promise((r) => setTimeout(r, 20000)); } }
  await page.waitForTimeout(600);
  // Cookie-Banner schließen, damit er keine Inhalte verdeckt
  await page.locator("button", { hasText: "Nur notwendige" }).first().click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const gesamt = await page.evaluate(() => document.documentElement.scrollHeight);

  const elArg = rest.find((a) => a.startsWith("--el="));
  if (elArg) {
    // einzelne Elemente (z. B. --el=[data-abschnitt=hero]) nacheinander ins Bild scrollen und aufnehmen
    const sel = elArg.slice(5);
    const els = await page.locator(sel).all();
    if (!els.length) console.log(`  ! kein Element für ${sel}`);
    let n = 0;
    for (const el of els) {
      await el.scrollIntoViewIfNeeded();
      // langsam durch das Element scrollen, damit Reveal-Inhalte sichtbar werden
      const box = await el.boundingBox();
      if (box) for (let d = 0; d < box.height; d += 300) { await page.mouse.wheel(0, 300); await page.waitForTimeout(100); }
      await page.waitForTimeout(900);
      const name = sel.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
      const datei = `${out}/w${w}-${name}${els.length > 1 ? "-" + n : ""}.png`;
      n++;
      await el.screenshot({ path: datei });
      console.log(datei);
    }
  } else if (tiles) {
    let n = 0;
    for (let y = 0; y < gesamt; y += h - 80) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(900);
      const datei = `${out}/w${w}-${String(n++).padStart(2, "0")}.png`;
      await page.screenshot({ path: datei });
      console.log(datei);
    }
  } else {
    // langsam durchscrollen, damit Reveal-Beobachter auslösen
    for (let y = 0; y < gesamt; y += 300) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const datei = `${out}/w${w}${full ? "-full" : ""}.png`;
    await page.screenshot({ path: datei, fullPage: full });
    console.log(datei);
  }
  const breite = await page.evaluate(() => document.documentElement.scrollWidth);
  const unsichtbar = await page.evaluate(() => [...document.querySelectorAll("section, h2, h3")].filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && getComputedStyle(el).opacity === "0"; }).length);
  console.log(`w${w}: Höhe=${gesamt} scrollWidth=${breite}${breite > w ? " (HORIZONTALER ÜBERLAUF)" : ""} unsichtbar=${unsichtbar} Fehler=${fehler.length}`);
  fehler.slice(0, 5).forEach((f) => console.log("  ! " + f.slice(0, 200)));
  await page.close();
}
await browser.close();

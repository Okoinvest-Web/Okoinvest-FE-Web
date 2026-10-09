// qa/e2e/sprache.e2e.mjs – Sprachmodell gegen den laufenden Dev-Server
//
//   node --test --test-concurrency=1 qa/e2e/sprache.e2e.mjs   (Dev-Server: QA_BASIS_URL, Standard http://localhost:3100)
//
// Abnahme (Vorgabe des Inhabers: einmal EN gewählt → alle Seiten englisch, bis man zurückschaltet):
//  - Jede Probe unter /en und /en/at erreichbar (200), <html lang="en">, canonical auf sich selbst.
//  - Übersetzte Seiten (UEBERSETZT) indexierbar mit hreflang; nicht übersetzte: noindex und der
//    Hinweis „not yet available in English“, Inhalt <main lang="de">.
//  - Sprachwahl: dieselbe Seite im selben Land, Cookie „sprache“ erst beim Klick, Links bleiben
//    in Sprache und Land; „/“ mit Cookie → gespeicherte Wahl; zurück auf DE wieder deutsch.
//  - Alte englische Adressen: genau eine 308.
// Es wird nichts gesendet (keine POSTs).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { BASIS, lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";
import { fassungIndexierbar } from "../../src/lib/land/index.js";
import { EN_ALT } from "../../src/lib/land/umzug.js";

const ZEIT = { timeout: 900_000 };
let browser;
let bereit = "";

before(async () => {
  if (!(await serverErreichbar())) return void (bereit = "Dev-Server nicht erreichbar (npm run dev, Port 3100)");
  const pw = await ladePlaywright();
  if (pw) browser = await pw.chromium.launch();
});
after(async () => browser?.close());

async function hole(pfad) {
  for (let v = 1; ; v++) {
    try {
      const r = await fetch(BASIS + pfad, { redirect: "manual", signal: AbortSignal.timeout(180_000) });
      if (r.status >= 500 && v < 3) {
        await new Promise((ok) => setTimeout(ok, 4000));
        continue;
      }
      return r;
    } catch (e) {
      if (v >= 3) throw e;
      const t0 = Date.now();
      while (Date.now() - t0 < 180_000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
    }
  }
}

/** Status und HTML; bricht die Verbindung ab (Dev-Server startet neu), bis zu 3 Versuche. */
async function seite(pfad) {
  for (let v = 1; ; v++) {
    try {
      const r = await hole(pfad);
      return { status: r.status, html: r.status === 200 ? await r.text() : (await r.body?.cancel(), "") };
    } catch (e) {
      if (v >= 3) throw e;
      const t0 = Date.now();
      while (Date.now() - t0 < 180_000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
    }
  }
}

const warteAufServer = async () => {
  const t0 = Date.now();
  while (Date.now() - t0 < 180_000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
};
const neustart = (e) => /ERR_CONNECTION|ERR_EMPTY_RESPONSE|ECONNRESET|Timeout/.test(String(e));

/** Link klicken und auf das Ziel warten; startet der Dev-Server dabei neu, das Linkziel nachladen (Cookie ist gesetzt). */
async function klickeUndWarte(page, link, muster) {
  const ziel = await link.getAttribute("href");
  await link.click();
  try {
    await page.waitForURL(muster, { timeout: 90_000 });
  } catch (e) {
    if (!neustart(e)) throw e;
    await warteAufServer();
    await lade(page, ziel, { warten: 2500 });
    await page.waitForURL(muster, { timeout: 90_000 });
  }
}

/** Seite direkt aufrufen (folgt Weiterleitungen), bei Neustart des Dev-Servers bis zu 3 Versuche. */
async function geheZu(page, pfad, muster) {
  for (let v = 1; ; v++) {
    try {
      await page.goto(BASIS + pfad, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForURL(muster, { timeout: 60_000 });
      return;
    } catch (e) {
      if (v >= 3 || !neustart(e)) throw e;
      await warteAufServer();
    }
  }
}

const PROBEN = ["/", "/rechner/pacht", "/freiflaeche", "/investoren", "/regionen/tirol"];

test("/en und /en/at: 200, lang en, canonical, noindex/hreflang nach Register, Hinweis bei fehlender Übersetzung", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const falsch = [];
  for (const k of PROBEN) {
    for (const land of [null, "AT"]) {
      const p = `/en${land ? "/at" : ""}${k === "/" ? "" : k}`;
      const { status, html } = await seite(p);
      if (status !== 200) {
        falsch.push(`${p}: ${status}`);
        continue;
      }
      const lang = /<html[^>]*\slang="([^"]+)"/.exec(html)?.[1];
      if (lang !== "en") falsch.push(`${p}: lang=${lang}`);
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] || "";
      if (!canonical.endsWith(p)) falsch.push(`${p}: canonical ${canonical}`);
      const noindex = [...html.matchAll(/<meta name="robots" content="([^"]+)"/g)].some((m) => m[1] === "noindex, follow");
      const soll = fassungIndexierbar(k, land, "en");
      if (soll === noindex) falsch.push(`${p}: noindex ${noindex}, Register indexierbar ${soll}`);
      const hinweis = html.includes("not yet available in English");
      const uebersetztSoll = fassungIndexierbar(k, null, "en");
      if (hinweis === uebersetztSoll) falsch.push(`${p}: Hinweis ${hinweis}`);
      if (uebersetztSoll && !land && !/hrefLang="en" href="[^"]*\/en"/.test(html) && k === "/") falsch.push(`${p}: hreflang en fehlt`);
    }
  }
  assert.deepEqual(falsch, []);
});

test("alte englische Adressen: genau eine 308 auf /en/<deutscher Pfad>", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  for (const { source, destination } of EN_ALT) {
    const r = await hole(source);
    await r.body?.cancel();
    assert.equal(r.status, 308, source);
    assert.equal(new URL(r.headers.get("location"), BASIS).pathname, destination);
    const z = await hole(destination);
    await z.body?.cancel();
    assert.equal(z.status, 200, destination);
  }
});

test("Sprachwahl: dieselbe Seite, Cookie erst nach Klick, Links bleiben englisch und im Land", ZEIT, async (t) => {
  assert.ok(!bereit, bereit);
  if (!browser) return t.skip("Playwright nicht gefunden");
  const keks = async (ctx, name) => (await ctx.cookies(BASIS)).find((c) => c.name === name)?.value || null;
  const fehler = [];
  const ctx = await neuerKontext(browser, { breite: 1440 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => !/ViewTransition|Transition was aborted/.test(String(e)) && fehler.push(String(e)));
  assert.equal(await lade(page, "/at/freiflaeche", { warten: 2500 }), 200);
  assert.equal(await keks(ctx, "sprache"), null, "kein Cookie ohne Wahl");
  const wahl = page.getByRole("navigation", { name: "Sprache", exact: true });
  await wahl.waitFor({ state: "visible", timeout: 60_000 });
  const en = wahl.getByRole("link", { name: "English" });
  assert.equal(await en.getAttribute("href"), "/en/at/freiflaeche");
  await klickeUndWarte(page, en, /\/en\/at\/freiflaeche$/);
  assert.equal(await keks(ctx, "sprache"), "en", "Cookie nach aktiver Wahl");
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  // Kopfleiste englisch, Hinweis da (Seite noch nicht übersetzt), Links bleiben unter /en/at
  await page.getByRole("navigation", { name: "Main navigation" }).waitFor({ state: "attached", timeout: 60_000 });
  const hrefs = await page.locator("footer a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const oeffentlich = hrefs.filter((h) => !/^\/(portal|login|registrieren)(\/|$|\?)/.test(h));
  assert.ok(oeffentlich.length > 20, `zu wenige Fußlinks: ${oeffentlich.length}`);
  assert.deepEqual(oeffentlich.filter((h) => !/^\/en\/at(\/|$|#|\?)/.test(h)), [], "Fußlinks außerhalb von /en/at");
  // Länderwechsel behält die Sprache
  const nachCh = page.getByRole("navigation", { name: "Choose country", exact: true }).getByRole("link", { name: "Content for Switzerland" });
  assert.equal(await nachCh.getAttribute("href"), "/en/ch/freiflaeche");
  // „/“ mit Cookies sprache=en, land=AT (vom Länderwechsel aus /at gibt es noch keins) → /en
  await geheZu(page, "/", /\/en$/);
  // zurück auf Deutsch
  const de = page.getByRole("navigation", { name: "Language", exact: true }).getByRole("link", { name: "Deutsch" });
  await de.waitFor({ state: "visible", timeout: 60_000 });
  await klickeUndWarte(page, de, (u) => u.pathname === "/");
  assert.equal(await keks(ctx, "sprache"), "de");
  assert.equal(await page.locator("html").getAttribute("lang"), "de");
  await ctx.close();
  assert.deepEqual(fehler, []);
});

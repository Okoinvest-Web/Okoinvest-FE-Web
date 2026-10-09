// qa/e2e/land.e2e.mjs – Ländermodell gegen den laufenden Dev-Server
//
//   node --test --test-concurrency=1 qa/e2e/land.e2e.mjs   (Dev-Server: QA_BASIS_URL, Standard http://localhost:3100)
//
// Abnahme (Vorgabe des Inhabers):
//  - Jede Seite gemeinsam (ohne Präfix) UND unter /de, /at, /ch erreichbar (200), gleiche Seite.
//  - <html lang> je Land, canonical/noindex/hreflang nach Register (src/lib/land/seiten.js).
//  - „/“ ohne Cookie: nie Weiterleitung (auch mit Geo-/Sprach-Headern), nie zwischengespeichert;
//    mit Cookie „land“: 307 auf /de, /at bzw. /ch.
//  - Länderwechsler: dieselbe Seite im anderen Land, setzt das Cookie erst beim Klick;
//    Links im Menü bleiben im Land.
//  - Welle-2-Adressen: genau eine 308 ohne Kette.
// Es wird nichts gesendet (keine POSTs).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { BASIS, lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";
import { LAND_CODES, indexierbar } from "../../src/lib/land/index.js";
import { UMZUG, zielFuer } from "../../src/lib/land/umzug.js";

const ZEIT = { timeout: 900_000 };
let browser;
let bereit = "";

before(async () => {
  if (!(await serverErreichbar())) return void (bereit = "Dev-Server nicht erreichbar (npm run dev, Port 3100)");
  const pw = await ladePlaywright();
  if (pw) browser = await pw.chromium.launch();
});
after(async () => browser?.close());

/** GET ohne Weiterleitung; bei Neustart/Kompilieren des Dev-Servers bis zu 3 Versuche. */
async function hole(pfad, headers = {}) {
  for (let v = 1; ; v++) {
    try {
      const r = await fetch(BASIS + pfad, { redirect: "manual", headers, signal: AbortSignal.timeout(180_000) });
      if (r.status >= 500 && v < 3) {
        await new Promise((ok) => setTimeout(ok, 4000));
        continue;
      }
      return r;
    } catch (e) {
      if (v >= 3) throw e;
      // Dev-Server startet neu (Wächter, bis zu 2 Minuten) → warten, bis er wieder antwortet
      const t0 = Date.now();
      while (Date.now() - t0 < 180_000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
    }
  }
}

/**
 * Link klicken und auf das Ziel warten. Startet der Dev-Server dabei neu (Wächter), wird nach dem
 * Neustart das vorher geprüfte Linkziel geladen – der Klick selbst hat das Cookie schon gesetzt.
 */
async function klickeUndWarte(page, link, muster) {
  const ziel = await link.getAttribute("href");
  await link.click();
  try {
    await page.waitForURL(muster, { timeout: 90_000 });
  } catch (e) {
    if (!/ERR_CONNECTION|ERR_EMPTY_RESPONSE|Timeout/.test(String(e))) throw e;
    const t0 = Date.now();
    while (Date.now() - t0 < 180_000 && !(await serverErreichbar(BASIS, 5000))) await new Promise((ok) => setTimeout(ok, 3000));
    await lade(page, ziel, { warten: 2500 });
    await page.waitForURL(muster, { timeout: 90_000 });
  }
}

const url = (k, land) => (land ?`/${land.toLowerCase()}${k === "/" ? "" : k}` : k);

// Prüfmenge (RAM-schonend für den Dev-Server): Stichproben je Bereich; die Vollständigkeit der
// Routen belegt statisch src/lib/land/routen.test.mjs (scripts/landfassungen.mjs --pruefen).
const PROBEN = ["/", "/flaechencheck", "/rechner/pacht", "/rechner/ppa", "/agri-pv", "/kommunen", "/energiegemeinschaften", "/regionen", "/regionen/tirol", "/investoren", "/kontakt", "/ratgeber/moor-pv", "/faq"];

test("jede Probe gemeinsam und in DE/AT/CH: 200, lang, canonical, noindex nach Register", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const falsch = [];
  for (const k of PROBEN) {
    for (const land of [null, ...LAND_CODES]) {
      const p = url(k, land);
      const r = await hole(p);
      if (r.status !== 200) {
        falsch.push(`${p}: ${r.status}`);
        await r.body?.cancel();
        continue;
      }
      const html = await r.text();
      const lang = /<html[^>]*\slang="([^"]+)"/.exec(html)?.[1];
      if (lang !== (land ? `de-${land}` : "de")) falsch.push(`${p}: lang=${lang}`);
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] || "";
      if (!canonical.endsWith(p === "/" ? "" : p)) falsch.push(`${p}: canonical ${canonical}`);
      const robots = [...html.matchAll(/<meta name="robots" content="([^"]+)"/g)].map((m) => m[1]);
      const noindexSeite = robots.includes("noindex, follow");
      // Länderfassungen ohne eigenen Inhalt: noindex; gemeinsame Seite und Länder mit Inhalt: nicht
      if (land && !indexierbar(k, land) !== noindexSeite) falsch.push(`${p}: noindex ${noindexSeite}, Register ${indexierbar(k, land)}`);
      if (!land && k !== "/" && noindexSeite) falsch.push(`${p}: gemeinsame Seite mit noindex`);
    }
  }
  assert.deepEqual(falsch, []);
});

test("hreflang: x-default = gemeinsame Seite, Länder mit eigenem Inhalt, im HTML wechselseitig", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const tabelle = async (p) => {
    const html = await (await hole(p)).text();
    return Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  };
  const gemeinsam = await tabelle("/flaechencheck");
  assert.ok(gemeinsam["x-default"]?.endsWith("/flaechencheck"), JSON.stringify(gemeinsam));
  assert.ok(gemeinsam["de-AT"]?.endsWith("/at/flaechencheck"), JSON.stringify(gemeinsam));
  assert.deepEqual(await tabelle("/at/flaechencheck"), gemeinsam);
  assert.deepEqual(await tabelle("/ch/flaechencheck"), {}, "noindex-Fassung ohne hreflang");
});

test("„/“: ohne Cookie nie Weiterleitung (auch mit Geo-/Sprach-Headern), mit Cookie 307, nie zwischengespeichert", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const geo = { "accept-language": "de-AT,de;q=0.9", "x-vercel-ip-country": "CH", "cf-ipcountry": "CH", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" };
  const ohne = await hole("/", geo);
  assert.equal(ohne.status, 200, "ohne Cookie keine Weiterleitung");
  assert.match(ohne.headers.get("cache-control") || "", /no-store/);
  assert.ok(!/(^|,\s*)land=/.test(ohne.headers.get("set-cookie") || ""), "kein Cookie ohne Klick");
  await ohne.body?.cancel();
  for (const land of LAND_CODES) {
    const mit = await hole("/?utm_source=x", { cookie: `land=${land}` });
    assert.equal(mit.status, 307, `Cookie ${land}`);
    assert.equal(new URL(mit.headers.get("location"), BASIS).pathname, `/${land.toLowerCase()}`);
    assert.equal(new URL(mit.headers.get("location"), BASIS).search, "?utm_source=x", "Query bleibt");
    assert.match(mit.headers.get("cache-control") || "", /no-store/);
    await mit.body?.cancel();
  }
  const kaputt = await hole("/", { cookie: "land=XX" });
  assert.equal(kaputt.status, 200, "ungültiges Cookie: keine Weiterleitung");
  await kaputt.body?.cancel();
  // Unterseiten leiten nie um (auch nicht mit Cookie) – die gemeinsame Seite bleibt erreichbar
  const unter = await hole("/rechner/pacht", { cookie: "land=AT" });
  assert.equal(unter.status, 200);
  await unter.body?.cancel();
});

test("Welle-2-Adressen: genau eine 308 auf das Ziel, Ziel ohne weitere Weiterleitung", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  for (const r of UMZUG) {
    const quelle = r.source.replace(":slug", "moor-pv");
    const a = await hole(quelle);
    assert.equal(a.status, 308, quelle);
    const ziel = new URL(a.headers.get("location"), BASIS).pathname;
    assert.equal(ziel, zielFuer(r, quelle));
    await a.body?.cancel();
    const b = await hole(ziel);
    assert.equal(b.status, 200, `${quelle} → ${ziel}: ${b.status}`);
    await b.body?.cancel();
  }
});

test("Länderwechsler: dieselbe Seite im anderen Land, Cookie erst nach Klick, Menülinks bleiben im Land", ZEIT, async (t) => {
  assert.ok(!bereit, bereit);
  if (!browser) return t.skip("Playwright nicht gefunden");
  const landCookie = async (ctx) => (await ctx.cookies(BASIS)).find((c) => c.name === "land")?.value || null;
  const fehler = [];

  const ctx = await neuerKontext(browser, { breite: 1440 });
  const page = await ctx.newPage();
  // Chromium meldet abgebrochene dokumentübergreifende View-Transitions (Weiterleitung von „/“,
  // Wechsel zwischen Root-Layouts) als pageerror – das ist kein Fehler der Seite.
  page.on("pageerror", (e) => !/ViewTransition|Transition was aborted/.test(String(e)) && fehler.push(String(e)));
  assert.equal(await lade(page, "/rechner/pacht", { warten: 2500 }), 200);
  assert.equal(await landCookie(ctx), null, "kein Cookie ohne Wahl");
  const wechsler = page.getByRole("navigation", { name: "Land wählen", exact: true });
  await wechsler.waitFor({ state: "visible", timeout: 60_000 });
  const nachAt = wechsler.getByRole("link", { name: "Inhalte für Österreich" });
  assert.equal(await nachAt.getAttribute("href"), "/at/rechner/pacht", "dieselbe Seite im anderen Land");
  await klickeUndWarte(page, nachAt, /\/at\/rechner\/pacht$/);
  assert.equal(await landCookie(ctx), "AT", "Cookie nach aktiver Wahl");
  assert.equal(await page.locator("html").getAttribute("lang"), "de-AT");
  // Rechner bekommt das Land: Länder-Sperre statt ungeprüfter Werte
  await page.locator("[data-laender-sperre='AT'], [data-land-hinweis='AT']").first().waitFor({ state: "attached", timeout: 60_000 });
  // Menü- und Fußlinks bleiben im Land
  const hrefs = await page.locator("footer a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  const oeffentlich = hrefs.filter((h) => !/^\/(portal|login|registrieren|en)(\/|$|\?)/.test(h));
  assert.ok(oeffentlich.length > 20, `zu wenige Fußlinks: ${oeffentlich.length}`);
  assert.deepEqual(oeffentlich.filter((h) => !/^\/at(\/|$|#|\?)/.test(h)), [], "Fußlinks außerhalb von /at");
  // Wechsel zurück nach DE behält die Seite
  const nachDe = page.getByRole("navigation", { name: "Land wählen", exact: true }).getByRole("link", { name: "Inhalte für Deutschland" });
  assert.equal(await nachDe.getAttribute("href"), "/de/rechner/pacht");
  await klickeUndWarte(page, nachDe, /\/de\/rechner\/pacht$/);
  assert.equal(await landCookie(ctx), "DE");
  // „/“ mit Cookie → /de
  await page.goto(BASIS + "/", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForURL(/\/de$/, { timeout: 60_000 });
  await ctx.close();
  assert.deepEqual(fehler, []);
});

// qa/e2e/land.e2e.mjs – Länderrouting gegen den laufenden Dev-Server (Welle 2, Masterplan Abschnitt 4)
//
//   node --test --test-concurrency=1 qa/e2e/land.e2e.mjs   (Dev-Server: QA_BASIS_URL, Standard http://localhost:3100)
//
// Abnahme
//  (c) Gestufter Start: /de vollständig, /at und /ch nur freigegebene Seiten (sonst 404), „in Vorbereitung“ mit noindex.
//  (d) Keine IP-/Geo-Weiterleitung, kein Vary auf Geo-Header, kein Cookie ohne Klick; Cookie „land“ erst nach aktiver Wahl.
//  plus: <html lang> je Zone, hreflang wechselseitig im HTML, alte Pfade 308 ohne Kette.
// Es wird nichts gesendet (keine POSTs).

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { BASIS, lade, ladePlaywright, neuerKontext, serverErreichbar } from "../browser.mjs";
import { LAND_CODES, SEITEN, stufe } from "../../src/lib/land/index.js";
import { UMZUG } from "../../src/lib/land/umzug.js";

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

const praefix = (land) => land.toLowerCase();

/** Der Länderhinweis erscheint erst nach der Entscheidung im Cookie-Banner – hier ausdrücklich „Nur notwendige“. */
async function cookieBannerEntscheiden(page) {
  const knopf = page.getByRole("button", { name: /^Nur notwendige/ }).first();
  await knopf.click({ timeout: 30_000 }).catch(() => {});
}
const url = (k, land) => `/${praefix(land)}${k}`;

// Prüfmenge (RAM-schonend für den Dev-Server – jede Route wird nur einmal kompiliert):
// DE je Gruppe Stichproben, AT/CH alle freigegebenen Seiten und Stichproben nicht freigegebener.
// Vollständigkeit von /de (jede Seite aus stufen.js hat ihre Route und prüft ihren Schlüssel) belegt statisch
// src/lib/land/routen.test.mjs; dass jede Seite der Sitemaps 200 liefert, belegt qa/link-pruefung.mjs.
const DE_PROBEN = ["", "/flaechencheck", "/rechner/pacht", "/agri-pv", "/kommunen", "/reststrom", "/energiegemeinschaften", "/regionen", "/faq", "/marktdaten/fristen"];
const NICHT_FREI = ["/rechner/pacht", "/agri-pv", "/kommunen", "/faq", "/energiegemeinschaften/rechner"];
const REGIONEN = ["/regionen/bayern", "/regionen/tirol", "/regionen/schweiz"];
function pruefmenge() {
  const faelle = [];
  for (const land of LAND_CODES) {
    const kandidaten = land === "DE" ? [...DE_PROBEN, ...REGIONEN, "/energiegemeinschaften/software"] : [...Object.keys(SEITEN).filter((k) => !SEITEN[k].dynamisch && stufe(k, land)), ...NICHT_FREI, ...REGIONEN];
    for (const k of new Set(kandidaten)) {
      const st = stufe(k, land);
      faelle.push({ land, k, erwartet: st ? 200 : 404, st });
    }
  }
  return faelle;
}

test("(c) gestufter Start: DE vollständig, AT/CH nur freigegeben, sonst 404", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const falsch = [];
  for (const f of pruefmenge()) {
    const r = await hole(url(f.k, f.land));
    if (r.status !== f.erwartet) falsch.push(`${url(f.k, f.land)}: ${r.status} statt ${f.erwartet}`);
    if (f.st === "vorbereitung") {
      const html = await r.text();
      assert.match(html, /In Vorbereitung/, `${url(f.k, f.land)}: Hinweis „in Vorbereitung“ fehlt`);
      assert.match(html, /<meta name="robots" content="noindex/, `${url(f.k, f.land)}: noindex fehlt`);
    } else await r.body?.cancel();
  }
  for (const p of ["/xx", "/DE", "/at/gibt-es-nicht"]) assert.equal((await hole(p)).status, 404, p);
  assert.deepEqual(falsch, []);
});

test("<html lang> je Zone und hreflang wechselseitig im HTML", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const sprache = async (p) => /<html[^>]*\blang="([^"]+)"/.exec(await (await hole(p)).text())?.[1];
  assert.equal(await sprache("/de"), "de-DE");
  assert.equal(await sprache("/at"), "de-AT");
  assert.equal(await sprache("/ch"), "de-CH");
  assert.equal(await sprache("/kontakt"), "de");
  assert.equal(await sprache("/en"), "en");
  const alternativen = async (p) => {
    const html = await (await hole(p)).text();
    return Object.fromEntries([...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], new URL(m[2]).pathname]));
  };
  const de = await alternativen("/de/flaechencheck");
  const at = await alternativen("/at/flaechencheck");
  assert.deepEqual(de, { "de-DE": "/de/flaechencheck", "de-AT": "/at/flaechencheck", "x-default": "/de/flaechencheck" });
  assert.deepEqual(at, de, "AT verweist mit derselben Tabelle zurück");
});

test("alte Pfade: genau eine 308 auf das Ziel, Ziel ohne weitere Weiterleitung", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const proben = UMZUG.filter((r) => !r.source.includes(":"));
  for (const r of proben) {
    const a = await hole(r.source);
    assert.equal(a.status, 308, `${r.source}: ${a.status}`);
    assert.equal(new URL(a.headers.get("location"), BASIS).pathname, r.destination, r.source);
  }
  const art = await hole("/ratgeber/moor-pv?x=1");
  assert.equal(art.status, 308);
  assert.equal(art.headers.get("location"), "/wissen/ratgeber/moor-pv?x=1", "Query bleibt erhalten");
  for (const ziel of ["/de/rechner/pacht", "/at/regionen/tirol", "/ch", "/wissen/ratgeber/moor-pv"]) {
    const z = await hole(ziel);
    assert.equal(z.status, 200, `${ziel}: ${z.status} (Kette oder Fehler)`);
    await z.body?.cancel();
  }
});

test("(d) keine Geo-Weiterleitung, kein Vary auf Geo, kein Cookie ohne Klick", ZEIT, async () => {
  assert.ok(!bereit, bereit);
  const geo = { "accept-language": "de-AT,de;q=0.9", "x-vercel-ip-country": "CH", "cf-ipcountry": "CH" };
  for (const p of ["/", "/de/rechner/pacht", "/at/flaechencheck", "/kontakt"]) {
    const r = await hole(p, geo);
    assert.equal(r.status, 200, `${p}: ${r.status} (keine Weiterleitung erwartet)`);
    const vary = (r.headers.get("vary") || "").toLowerCase();
    assert.ok(!/ip-country|cf-ipcountry|x-country|accept-language/.test(vary), `${p}: Vary ${vary}`);
    assert.ok(!/(^|,\s*)land=/.test(r.headers.get("set-cookie") || ""), `${p}: Cookie „land“ ohne Klick`);
    await r.body?.cancel();
  }
  const api = await hole("/api/land", geo);
  assert.equal(api.status, 200);
  assert.deepEqual(await api.json(), { vorschlag: "AT", quelle: "sprache" });
  assert.match(api.headers.get("cache-control") || "", /no-store/);
  assert.equal(api.headers.get("set-cookie"), null);
  assert.ok(!/ip-country|accept-language/i.test(api.headers.get("vary") || ""));
  const nurGeo = await (await hole("/api/land", { "accept-language": "de", "x-vercel-ip-country": "CH" })).json();
  assert.deepEqual(nurGeo, { vorschlag: "CH", quelle: "geo" });
});

test("(d) Banner schließbar per Tastatur ohne Cookie; Cookie „land“ erst nach Klick", ZEIT, async (t) => {
  assert.ok(!bereit, bereit);
  if (!browser) return t.skip("Playwright nicht gefunden");
  const landCookie = async (ctx) => (await ctx.cookies(BASIS)).find((c) => c.name === "land")?.value || null;

  // 1) Besucher mit de-DE auf /at/flaechencheck: Vorschlag DE erscheint, kein Cookie
  const ctx = await neuerKontext(browser, { breite: 1440 });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  assert.equal(await lade(page, "/at/flaechencheck", { warten: 2500 }), 200);
  await cookieBannerEntscheiden(page);
  const banner = page.getByRole("region", { name: "Ländervorschlag" });
  await banner.waitFor({ state: "visible", timeout: 60_000 });
  assert.equal(await landCookie(ctx), null, "Cookie vor jeder Wahl");
  // Tastatur: Fokus in das Banner, Esc schließt – keine Wahl, kein Cookie
  await banner.getByRole("button", { name: "Hinweis schließen" }).focus();
  await page.keyboard.press("Escape");
  await banner.waitFor({ state: "hidden", timeout: 10_000 });
  assert.equal(await landCookie(ctx), null, "Schließen ist keine Länderwahl");
  await lade(page, "/at/flaechencheck", { warten: 2500 });
  assert.equal(await banner.isVisible(), false, "geschlossen bleibt geschlossen (Sitzung)");
  await ctx.close();

  // 2) Aktive Wahl im Banner → Cookie und Wechsel auf die Entsprechung
  const ctx2 = await neuerKontext(browser, { breite: 390 });
  const p2 = await ctx2.newPage();
  await lade(p2, "/at/flaechencheck", { warten: 2500 });
  await cookieBannerEntscheiden(p2);
  const b2 = p2.getByRole("region", { name: "Ländervorschlag" });
  await b2.waitFor({ state: "visible", timeout: 60_000 });
  await b2.getByRole("link", { name: /Zu den Seiten für Deutschland/ }).click();
  await p2.waitForURL(/\/de\/flaechencheck$/, { timeout: 60_000 });
  assert.equal(await landCookie(ctx2), "DE");
  await ctx2.close();

  // 3) Länderwechsler: /de/rechner/pacht → AT hat keine Entsprechung → Einstieg /at, Cookie AT
  const ctx3 = await neuerKontext(browser, { breite: 1440 });
  const p3 = await ctx3.newPage();
  assert.equal(await lade(p3, "/de/rechner/pacht", { warten: 2500 }), 200);
  assert.equal(await landCookie(ctx3), null);
  const wechsler = p3.getByRole("navigation", { name: "Land wählen", exact: true });
  await wechsler.waitFor({ state: "visible", timeout: 60_000 });
  await wechsler.getByRole("link", { name: /Seiten für Österreich/ }).click();
  await p3.waitForURL(/\/at$/, { timeout: 60_000 });
  assert.equal(await landCookie(ctx3), "AT");
  // Navigation in AT: Pachtrechner zeigt sichtbar „(gilt für Deutschland)“ im Fußbereich
  assert.ok(await p3.getByText("(gilt für Deutschland)").first().isVisible().catch(() => false) || (await p3.content()).includes("(gilt für Deutschland)"));
  await ctx3.close();
  assert.deepEqual(fehler, []);
});

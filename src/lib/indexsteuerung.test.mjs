// Tests Paket I – Indexsteuerung (node:test, über npm test mit Modulauflösung aus test/hilfen)
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  PRODUKTIONS_URL,
  ermittleSiteUrl,
  istIndexierbar,
  robotsRegeln,
  ohneEntwuerfe,
  istEntwurf,
  spracheFuerPfad,
} from "./indexsteuerung.js";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Produktion ohne NEXT_PUBLIC_SITE_URL bricht ab", () => {
  assert.throws(() => ermittleSiteUrl({ nodeEnv: "production" }), /NEXT_PUBLIC_SITE_URL fehlt/);
  assert.throws(() => ermittleSiteUrl({ nodeEnv: "production", siteUrl: "" }), /NEXT_PUBLIC_SITE_URL fehlt/);
  assert.throws(() => ermittleSiteUrl({ nodeEnv: "production", siteUrl: "   " }), /NEXT_PUBLIC_SITE_URL fehlt/);
});

test("Produktion mit URL liefert Origin ohne Schrägstrich", () => {
  assert.equal(ermittleSiteUrl({ nodeEnv: "production", siteUrl: "https://www.oekoinvest.com/" }), PRODUKTIONS_URL);
  assert.equal(ermittleSiteUrl({ nodeEnv: "production", siteUrl: "https://staging.example.org" }), "https://staging.example.org");
});

test("Entwicklung ohne URL fällt auf die Produktions-URL zurück", () => {
  assert.equal(ermittleSiteUrl({ nodeEnv: "development" }), PRODUKTIONS_URL);
  assert.equal(ermittleSiteUrl({}), PRODUKTIONS_URL);
});

test("ungültige URLs werden in jeder Umgebung abgelehnt", () => {
  for (const nodeEnv of ["production", "development"]) {
    assert.throws(() => ermittleSiteUrl({ nodeEnv, siteUrl: "www.oekoinvest.com" }), /gültige absolute URL/);
    assert.throws(() => ermittleSiteUrl({ nodeEnv, siteUrl: "ftp://www.oekoinvest.com" }), /https:\/\//);
    assert.throws(() => ermittleSiteUrl({ nodeEnv, siteUrl: "https://www.oekoinvest.com/de" }), /nur Schema und Host/);
    assert.throws(() => ermittleSiteUrl({ nodeEnv, siteUrl: "https://u:p@www.oekoinvest.com" }), /nur Schema und Host/);
  }
});

test("Fehlermeldung enthält keinen gesetzten Wert (keine Geheimnisse im Log)", () => {
  try {
    ermittleSiteUrl({ nodeEnv: "production", siteUrl: "https://nutzer:geheim@host.example" });
    assert.fail("hätte werfen müssen");
  } catch (e) {
    assert.ok(!String(e.message).includes("geheim"));
  }
});

test("indexiert wird nur in echter Produktion auf der Produktionsdomain", () => {
  assert.equal(istIndexierbar({ nodeEnv: "production", siteEnv: "production", siteUrl: PRODUKTIONS_URL }), true);
  // Staging-Build: NODE_ENV=production, aber SITE_ENV=staging
  assert.equal(istIndexierbar({ nodeEnv: "production", siteEnv: "staging", siteUrl: "https://staging.example.org" }), false);
  // Staging, das versehentlich als production markiert ist, aber eine andere Domain hat
  assert.equal(istIndexierbar({ nodeEnv: "production", siteEnv: "production", siteUrl: "https://staging.example.org" }), false);
  // vergessene NEXT_PUBLIC_SITE_ENV → noindex (fehlertolerant)
  assert.equal(istIndexierbar({ nodeEnv: "production", siteUrl: PRODUKTIONS_URL }), false);
  // Entwicklung
  assert.equal(istIndexierbar({ nodeEnv: "development", siteEnv: "production", siteUrl: PRODUKTIONS_URL }), false);
});

test("robots.txt Nicht-Produktion: alles gesperrt, keine Sitemap", () => {
  const r = robotsRegeln({ indexierbar: false, siteUrl: "https://staging.example.org" });
  assert.deepEqual(r.rules, [{ userAgent: "*", disallow: "/" }]);
  assert.equal(r.sitemap, undefined);
});

test("robots.txt Produktion: Regeln nach E5", () => {
  const r = robotsRegeln({ indexierbar: true, siteUrl: PRODUKTIONS_URL });
  assert.equal(r.sitemap, "https://www.oekoinvest.com/sitemap.xml");
  // Welle 2: mehrere Sitemaps (je Land und Stamm)
  const mehr = robotsRegeln({ indexierbar: true, siteUrl: "https://www.oekoinvest.com", sitemaps: ["https://www.oekoinvest.com/sitemap/de.xml", "https://www.oekoinvest.com/sitemap/stamm.xml"] });
  assert.deepEqual(mehr.sitemap, ["https://www.oekoinvest.com/sitemap/de.xml", "https://www.oekoinvest.com/sitemap/stamm.xml"]);
  const gruppe = (ua) => r.rules.find((g) => (Array.isArray(g.userAgent) ? g.userAgent : [g.userAgent]).includes(ua));

  // Such- und Abrufcrawler: keine eigene Gruppe → "*" (öffentliche Seiten erlaubt)
  for (const ua of ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Bingbot", "Googlebot"]) {
    assert.equal(gruppe(ua), undefined, `${ua} soll unter * fallen`);
  }
  const alle = gruppe("*");
  assert.ok(alle.allow.includes("/"));
  for (const p of ["/api/", "/portal", "/einladung/", "/angebot/"]) assert.ok(alle.disallow.includes(p), `${p} gesperrt`);

  // GPTBot / Google-Extended: nur Wissensseiten
  for (const ua of ["GPTBot", "Google-Extended"]) {
    const g = gruppe(ua);
    assert.equal(g.disallow, "/");
    assert.ok(g.allow.includes("/wissen/")); // Ratgeber liegt seit Welle 2 unter /wissen/ratgeber
    assert.ok(g.allow.includes("/de/regionen") && g.allow.includes("/at/regionen"));
    assert.ok(!g.allow.includes("/"));
    assert.ok(!g.allow.some((p) => p.startsWith("/portal") || p.startsWith("/einladung") || p.includes("/energie-live")));
  }

  // CCBot und Bytespider komplett gesperrt
  for (const ua of ["CCBot", "Bytespider"]) {
    const g = gruppe(ua);
    assert.equal(g.disallow, "/");
    assert.equal(g.allow, undefined);
  }
});

test("Sitemap-Filter entfernt Entwurfsseiten", () => {
  assert.equal(istEntwurf("/nutzungsbedingungen"), true);
  assert.equal(istEntwurf("/datenschutz"), true);
  assert.equal(istEntwurf("/bedingungen/banken"), true);
  assert.equal(istEntwurf("/bedingungenxyz"), false);
  assert.equal(istEntwurf("/impressum"), false);
  const liste = [{ pfad: "/" }, { pfad: "/nutzungsbedingungen" }, { pfad: "/datenschutz" }, { pfad: "/impressum" }];
  assert.deepEqual(ohneEntwuerfe(liste).map((e) => e.pfad), ["/", "/impressum"]);
});

test("Sprache nach Pfad", () => {
  assert.equal(spracheFuerPfad("/en"), "en");
  assert.equal(spracheFuerPfad("/en/investors"), "en");
  assert.equal(spracheFuerPfad("/energie-live"), "de");
  assert.equal(spracheFuerPfad("/"), "de");
  assert.equal(spracheFuerPfad("/de/rechner/pacht"), "de-DE");
  assert.equal(spracheFuerPfad("/at"), "de-AT");
  assert.equal(spracheFuerPfad("/ch/marktzugang-check"), "de-CH");
  assert.equal(spracheFuerPfad("/datenschutz"), "de");
  assert.equal(spracheFuerPfad(null), "de");
});

// Nachweis „Produktions-Build ohne URL schlägt fehl“, ohne next build: site.js
// wird in einem eigenen Prozess mit NODE_ENV=production und ohne
// NEXT_PUBLIC_SITE_URL geladen – genau das passiert beim Sammeln der Seitendaten.
function ladeSite(env) {
  const kind = { ...process.env, ...env };
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete kind[k];
  const registrar = pathToFileURL(path.join(WURZEL, "test/hilfen/registrieren.mjs")).href;
  const site = pathToFileURL(path.join(WURZEL, "src/data/site.js")).href;
  return spawnSync(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "--import",
      registrar,
      "--input-type=module",
      "-e",
      `const m = await import(${JSON.stringify(site)}); console.log(JSON.stringify({ url: m.SITE.url, idx: m.INDEXIERBAR }));`,
    ],
    { env: kind, encoding: "utf8", cwd: WURZEL },
  );
}

test("site.js: Laden in Produktion ohne NEXT_PUBLIC_SITE_URL schlägt fehl", () => {
  const r = ladeSite({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: undefined, NEXT_PUBLIC_SITE_ENV: undefined });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /NEXT_PUBLIC_SITE_URL fehlt/);
});

test("site.js: Staging-Build ist nicht indexierbar, Produktion schon", () => {
  const staging = ladeSite({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.example.org", NEXT_PUBLIC_SITE_ENV: "staging" });
  assert.equal(staging.status, 0, staging.stderr);
  assert.deepEqual(JSON.parse(staging.stdout.trim()), { url: "https://staging.example.org", idx: false });

  const prod = ladeSite({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: PRODUKTIONS_URL, NEXT_PUBLIC_SITE_ENV: "production" });
  assert.equal(prod.status, 0, prod.stderr);
  assert.deepEqual(JSON.parse(prod.stdout.trim()), { url: PRODUKTIONS_URL, idx: true });
});

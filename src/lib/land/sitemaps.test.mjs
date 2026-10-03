// Abnahme (f): Sitemaps je Land enthalten nur indexierbare, freigegebene Seiten; der Stamm keine Länderseiten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE } from "../../data/site.js";
import { LAND_CODES, freigegeben, indexierbar, landAusPfad, zoneFuer } from "./index.js";
import { SITEMAP_IDS, STAMM_SEITEN, landEintraege, sitemapUrls } from "./sitemaps.js";

const pfadVon = (url) => new URL(url).pathname;

test("Sitemap-Kennungen und robots-URLs", () => {
  assert.deepEqual(SITEMAP_IDS, ["stamm", "de", "at", "ch"]);
  assert.deepEqual(sitemapUrls("https://www.oekoinvest.com"), [
    "https://www.oekoinvest.com/sitemap/stamm.xml",
    "https://www.oekoinvest.com/sitemap/de.xml",
    "https://www.oekoinvest.com/sitemap/at.xml",
    "https://www.oekoinvest.com/sitemap/ch.xml",
  ]);
});

test("Länder-Sitemaps: nur freigegeben, indexierbar, im eigenen Land, mit hreflang", () => {
  for (const land of LAND_CODES) {
    const e = landEintraege(land);
    const urls = new Set();
    for (const x of e) {
      assert.ok(x.url.startsWith(SITE.url), x.url);
      assert.ok(!urls.has(x.url), `doppelt: ${x.url}`);
      urls.add(x.url);
      const { land: l, schluessel } = landAusPfad(pfadVon(x.url));
      assert.equal(l, land, `${x.url} steht in der falschen Sitemap`);
      assert.ok(freigegeben(schluessel, land) && indexierbar(schluessel, land), `${x.url} nicht indexierbar`);
      const sprachen = x.alternates?.languages || {};
      assert.ok(sprachen["x-default"], `${x.url}: x-default fehlt`);
      assert.equal(sprachen[`de-${land}`], x.url, `${x.url}: Selbstverweis fehlt`);
      assert.ok(x.lastModified instanceof Date && !Number.isNaN(x.lastModified.getTime()));
      assert.ok(x.priority > 0 && x.priority <= 1);
    }
  }
  const de = landEintraege("DE").map((x) => pfadVon(x.url));
  assert.ok(de.includes("/de/rechner/pacht") && de.includes("/de/regionen/bayern") && de.includes("/de"));
  assert.ok(!de.includes("/de/marktdaten/fristen"), "noindex bis zur Freigabe (FRI)");
  assert.ok(!de.some((p) => p.startsWith("/de/regionen/tirol") || p.startsWith("/de/energiegemeinschaften/rechner")));
  const at = landEintraege("AT").map((x) => pfadVon(x.url));
  assert.ok(at.includes("/at/flaechencheck") && at.includes("/at/regionen/tirol") && at.includes("/at/energiegemeinschaften"));
  assert.ok(!at.includes("/at/rechner/pacht") && !at.includes("/at/regionen/bayern"));
  const ch = landEintraege("CH").map((x) => pfadVon(x.url));
  assert.deepEqual(ch, ["/ch"], "CH: nur Einstieg; „in Vorbereitung“ gehört nicht in die Sitemap");
});

test("Stamm-Sitemap: nie eine Seite der Länderzonen, nie Portal/Token-Strecken", () => {
  for (const s of STAMM_SEITEN) {
    assert.notEqual(zoneFuer(s.pfad), "land", s.pfad);
    assert.ok(!/^\/(portal|login|einladung|angebot|api|bericht|p)(\/|$)/.test(s.pfad), s.pfad);
  }
});

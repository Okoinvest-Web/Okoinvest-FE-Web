// Ländermodell: eine Sitemap (/sitemap.xml) – gemeinsame Seiten plus Länderfassungen mit eigenem Inhalt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE } from "../../data/site.js";
import { istEntwurf } from "../indexsteuerung.js";
import { indexierbar, landAusPfad } from "./index.js";
import { seitenEintraege } from "./sitemaps.js";

const pfadVon = (url) => new URL(url).pathname.replace(/^$/, "/");

test("Sitemap: nur indexierbare Seiten, keine Entwürfe, keine Dubletten, hreflang wie im <head>", () => {
  const e = seitenEintraege();
  const urls = new Set();
  for (const x of e) {
    assert.ok(x.url.startsWith(SITE.url), x.url);
    assert.ok(!urls.has(x.url), `doppelt: ${x.url}`);
    urls.add(x.url);
    const { land, schluessel } = landAusPfad(pfadVon(x.url));
    assert.ok(indexierbar(schluessel, land), `${x.url} ist nicht indexierbar`);
    assert.ok(!istEntwurf(schluessel), `${x.url}: Entwurf`);
    assert.ok(x.lastModified instanceof Date && !Number.isNaN(x.lastModified.getTime()));
    assert.ok(x.priority > 0 && x.priority <= 1);
    if (land) {
      const sprachen = x.alternates?.languages || {};
      const sprache = pfadVon(x.url).startsWith("/en/") ? "en" : "de";
      assert.equal(sprachen[`${sprache}-${land}`], x.url, `${x.url}: Selbstverweis fehlt`);
      assert.equal(sprachen["x-default"], `${SITE.url}${schluessel === "/" ? "" : schluessel}`, `${x.url}: x-default = gemeinsame Seite`);
    }
  }
  const pfade = e.map((x) => pfadVon(x.url));
  for (const p of ["/rechner/pacht", "/regionen/bayern", "/regionen/tirol", "/flaechencheck", "/investoren", "/ratgeber"]) assert.ok(pfade.includes(p), `${p} fehlt`);
  assert.ok(pfade.includes("/at/flaechencheck") && pfade.includes("/at/energiegemeinschaften"), "AT mit eigenem Inhalt");
  assert.ok(!pfade.includes("/de/rechner/pacht") && !pfade.includes("/ch/flaechencheck") && !pfade.includes("/at/rechner/pacht"), "Länderfassungen ohne eigenen Inhalt: noindex, nicht in der Sitemap");
  assert.ok(!pfade.includes("/marktdaten/fristen"), "noindex bis zur Freigabe (FRI)");
  assert.ok(!pfade.some((p) => /^\/(portal|login|einladung|angebot|api|bericht|p)(\/|$)/.test(p)));
  assert.ok(!pfade.some((p) => /^\/(nutzungsbedingungen|datenschutz|bedingungen)/.test(p)), "Entwürfe");
});

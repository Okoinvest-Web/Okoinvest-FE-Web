// Welle 3, Paket NL: Newsroom – Entwürfe sind nie öffentlich; Seiten noindex und nicht in der Sitemap.
import test from "node:test";
import assert from "node:assert/strict";
import { istOeffentlich, kurzprofil, meldungNachSlug, meldungen } from "./newsroom.js";
import { MELDUNGEN } from "../content/newsroom/index.js";
import { indexierbar, SEITEN } from "./land/seiten.js";
import { uebersetztIndexierbar } from "./sprache/seiten.js";

const FREI = { slug: "beispiel", typ: "fachbeitrag", status: "freigegeben", freigabe: { von: "Geschäftsführung", am: "2026-10-09" }, laender: ["AT"], datum: "2026-10-09", title: "T" };

test("Bestand: keine Meldung ist öffentlich (keine erfundenen Meldungen vor Freigabe)", () => {
  assert.deepEqual(meldungen(), []);
  assert.equal(MELDUNGEN.every((m) => !istOeffentlich(m)), true);
  assert.equal(meldungNachSlug("vorlage-fachbeitrag"), null);
});

test("öffentlich nur mit status freigegeben UND freigabe von/am", () => {
  assert.equal(istOeffentlich(FREI), true);
  assert.equal(istOeffentlich({ ...FREI, status: "entwurf" }), false);
  assert.equal(istOeffentlich({ ...FREI, freigabe: null }), false);
  assert.equal(istOeffentlich({ ...FREI, freigabe: { von: " ", am: "2026-10-09" } }), false);
  assert.equal(istOeffentlich({ ...FREI, laender: ["FR"] }), false);
  assert.equal(istOeffentlich({ ...FREI, slug: "../x" }), false);
});

test("Länder getrennt und neueste zuerst", () => {
  const quelle = [FREI, { ...FREI, slug: "de-alt", laender: ["DE"], datum: "2026-01-01" }, { ...FREI, slug: "de-neu", laender: ["DE"], datum: "2026-05-01" }];
  assert.deepEqual(meldungen({ land: "AT", quelle }).map((m) => m.slug), ["beispiel"]);
  assert.deepEqual(meldungen({ land: "DE", quelle }).map((m) => m.slug), ["de-neu", "de-alt"]);
  assert.equal(meldungen({ quelle }).length, 3);
});

test("Kurzprofil nur aus site.js, ohne Umweltclaims", () => {
  for (const s of ["de", "en"]) {
    const k = kurzprofil(s);
    assert.match(k, /Ostermiething/);
    assert.match(k, /FN 541505g/);
    assert.doesNotMatch(k, /grün|green|klimaneutral|climate.neutral/i);
  }
});

test("Register: /newsletter, /newsroom und Meldungen sind noindex (gemeinsam, Länder, Englisch)", () => {
  for (const k of ["/newsletter", "/newsroom", "/newsroom/x"]) {
    assert.ok(SEITEN[k] || SEITEN["/newsroom/[slug]"], k);
    assert.equal(indexierbar(k), false, k);
    for (const l of ["DE", "AT", "CH"]) assert.equal(indexierbar(k, l), false, `${k} ${l}`);
    assert.equal(uebersetztIndexierbar(k), false, `${k} en`);
  }
});

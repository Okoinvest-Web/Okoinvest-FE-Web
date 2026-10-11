// Welle 4, Paket WIDGETS: Partner-Widgets – Register, Kurzrechner-Fassade, Fristen-Ticker, HTML-Renderer.
//   node --import ./test/hilfen/registrieren.mjs --test src/lib/widgets/widgets.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { WIDGETS, WIDGET_IDS, embedSnippet, frameAncestors, utmFuerPartner, widgetKopfzeilen, widgetLand, widgetPartner, widgetSprache, widgetZiel } from "./register.js";
import { KURZ_MODELLE, KURZ_PROFILE, KURZ_STANDARD, egKurzRechnen, kurzEingaben } from "./egSparKurz.js";
import { tickerEintraege } from "./fristenTicker.js";
import { esc, widgetDokument } from "./html.js";
import { rechnerOeffentlich } from "../plattform/eg/interesse.js";

const BASIS = "https://www.example.test";

test("widgetLand: nur erlaubte Länder, sonst erster erlaubter Wert des Widgets", () => {
  assert.equal(widgetLand("at", "fristen"), "at");
  assert.equal(widgetLand("CH", "fristen"), "ch");
  assert.equal(widgetLand("fr", "fristen"), "de");
  assert.equal(widgetLand(null, "fristen"), "de");
  // Kurzrechner: Standard AT; ein bekanntes, aber nicht gerechnetes Land bleibt erhalten,
  // damit das Widget den ehrlichen Hinweis zeigt statt still mit AT-Werten zu rechnen
  assert.equal(widgetLand("de", "eg-sparrechner"), "de");
  assert.equal(widgetLand("at", "eg-sparrechner"), "at");
  assert.equal(widgetLand("fr", "eg-sparrechner"), "at");
});

test("widgetSprache und widgetPartner bereinigen Eingaben", () => {
  assert.equal(widgetSprache("en"), "en");
  assert.equal(widgetSprache("fr"), "de");
  assert.equal(widgetPartner("stadtwerk-beispiel"), "stadtwerk-beispiel");
  assert.equal(widgetPartner("Böse<script>"), null);
  assert.equal(widgetPartner("a"), null); // zu kurz
  assert.equal(widgetPartner(undefined), null);
});

test("utmFuerPartner: eingetragene Kennung → Medium je Art, unbekannte Kennung → partner, ungültige → null", () => {
  const register = [{ kennung: "beispiel-gruppe-at", art: "gruppe", land: "AT", status: "aktiv", name: "Beispiel", ziele: ["start"] }];
  const g = utmFuerPartner("beispiel-gruppe-at", "fristen", { produktion: false, register });
  assert.deepEqual(g, { utm_source: "beispiel-gruppe-at", utm_medium: "gruppe", utm_campaign: "widget-fristen" });
  const u = utmFuerPartner("nicht-eingetragen", "fristen", { produktion: false, register });
  assert.deepEqual(u, { utm_source: "nicht-eingetragen", utm_medium: "partner", utm_campaign: "widget-fristen" });
  assert.equal(utmFuerPartner("UNGÜLTIG", "fristen"), null);
});

test("widgetZiel hängt den utm-Herkunftsnachweis nur mit gültiger Kennung an", () => {
  const mit = new URL(widgetZiel(BASIS, "/kontakt", { partner: "stadtwerk-x", widgetId: "fristen" }));
  assert.equal(mit.searchParams.get("utm_source"), "stadtwerk-x");
  assert.equal(mit.searchParams.get("utm_medium"), "partner");
  const ohne = widgetZiel(BASIS, "/kontakt", { partner: null, widgetId: "fristen" });
  assert.ok(!ohne.includes("utm_"));
});

test("frameAncestors: Standard *, Positivliste wird übernommen, Ungültiges verworfen", () => {
  assert.equal(frameAncestors(undefined), "*");
  assert.equal(frameAncestors(""), "*");
  assert.equal(frameAncestors("https://www.stadtwerk.at https://*.verband.at"), "https://www.stadtwerk.at https://*.verband.at");
  assert.equal(frameAncestors("javascript:alert(1) 'self'"), "'self'");
  assert.equal(frameAncestors("ganz-kaputt ???"), "*"); // nichts Gültiges übrig → Standard
});

test("widgetKopfzeilen: eigene CSP ohne Skripte, noindex, nosniff", () => {
  const h = widgetKopfzeilen({ ancestors: "https://www.stadtwerk.at" });
  assert.ok(h["Content-Security-Policy"].includes("default-src 'none'"));
  assert.ok(h["Content-Security-Policy"].includes("frame-ancestors https://www.stadtwerk.at"));
  assert.ok(!h["Content-Security-Policy"].includes("script-src"));
  assert.equal(h["X-Robots-Tag"], "noindex, nofollow");
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.ok(!("Set-Cookie" in h));
});

test("embedSnippet: iframe mit Widget-URL, Land, Sprache und nur gültiger Partner-Kennung", () => {
  for (const id of WIDGET_IDS) {
    const s = embedSnippet({ widgetId: id, land: WIDGETS[id].laender[0], partner: "stadtwerk-x", sprache: "de", basis: BASIS });
    assert.ok(s.startsWith("<iframe src=\""), id);
    assert.ok(s.includes(`/widgets/${id}?land=`), id);
    assert.ok(s.includes("partner=stadtwerk-x"), id);
    assert.ok(s.includes("title="), id);
  }
  const en = embedSnippet({ widgetId: "fristen", land: "at", sprache: "en", basis: BASIS });
  assert.ok(en.includes("sprache=en"));
  const boese = embedSnippet({ widgetId: "fristen", land: "at", partner: "\"><script>", basis: BASIS });
  assert.ok(!boese.includes("partner="));
  assert.equal(embedSnippet({ widgetId: "gibtsnicht", land: "at", basis: BASIS }), "");
});

test("kurzEingaben: Rohwerte aus der Query werden geprüft, Unbekanntes fällt auf den Standard", () => {
  assert.deepEqual(kurzEingaben({}), KURZ_STANDARD);
  const e = kurzEingaben({ verbrauchKwh: "12000", profil: "gewerbe", modell: "beg" });
  assert.deepEqual(e, { verbrauchKwh: 12000, profil: "gewerbe", modell: "beg" });
  const kaputt = kurzEingaben({ verbrauchKwh: "-5", profil: "hacker", modell: "<img>" });
  assert.deepEqual(kaputt, KURZ_STANDARD);
});

test("egKurzRechnen: identisch mit dem Rechenkern des großen Rechners (keine eigene Rechenlogik)", () => {
  for (const profil of KURZ_PROFILE) {
    for (const modell of KURZ_MODELLE) {
      const kurz = egKurzRechnen({ verbrauchKwh: 4200, profil, modell });
      const voll = rechnerOeffentlich({ rolle: "verbraucher", deckung: "ausgewogen", jahr: 2026, verbrauchKwh: 4200, profil, modell });
      assert.equal(kurz.nettoEur, voll.nettoEur, `${profil}/${modell}`);
      assert.equal(kurz.quotePct, voll.quotePct, `${profil}/${modell}`);
      assert.ok(Number.isFinite(kurz.nettoEur));
    }
  }
});

const FRIST = (id, land, ende, extra = {}) => ({
  id: `termin.${id}`,
  land,
  einheit: "Termin",
  klasse: "A",
  status: "geprueft",
  abruf: "2026-10-03",
  gueltigBis: ende,
  quelle: { titel: `Quelle ${id}`, url: `https://example.test/${id}` },
  wert: { art: "stichtag", beginn: null, ende, titel: `Frist ${id}`, text: "…" },
  ...extra,
});

test("tickerEintraege: filtert Abgelaufenes und Entwürfe, sortiert, begrenzt, EN-Datumstext", () => {
  const liste = [
    FRIST("b", "AT", "2026-12-01"),
    FRIST("a", "AT", "2026-11-01"),
    FRIST("alt", "AT", "2026-01-01"), // abgelaufen
    FRIST("entwurf", "AT", "2026-12-24", { status: "entwurf" }),
    FRIST("dach", "DACH", "2026-11-15"),
  ];
  const heute = new Date("2026-10-11T12:00:00+02:00");
  const at = tickerEintraege("at", { heute, liste });
  assert.deepEqual(at.map((f) => f.id), ["termin.a", "termin.dach", "termin.b"]);
  assert.equal(at[0].titel, "Frist a");
  assert.ok(at[0].terminText.includes("November"));
  assert.ok(at[0].stand.startsWith("Stand "));
  const en = tickerEintraege("at", { heute, liste, sprache: "en", max: 1 });
  assert.equal(en.length, 1);
  assert.ok(en[0].stand.startsWith("As at "));
  assert.deepEqual(tickerEintraege("fr", { heute, liste }), []);
});

test("tickerEintraege: echtes Faktenregister liefert für DE/AT/CH gültige Einträge mit Quelle", () => {
  const heute = new Date("2026-10-11T12:00:00+02:00");
  for (const land of ["de", "at", "ch"]) {
    for (const f of tickerEintraege(land, { heute })) {
      assert.ok(f.titel, f.id);
      assert.ok(f.terminText, f.id);
      assert.ok(f.quelleTitel, f.id);
    }
  }
});

test("esc entschärft HTML in Text und Attributen", () => {
  assert.equal(esc(`<script>"a"&'b'`), "&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;");
});

test("widgetDokument eg-sparrechner (AT): Formular, Ergebnis, Attribution, noindex, KEIN Skript", () => {
  const html = widgetDokument({ widgetId: "eg-sparrechner", land: "at", sprache: "de", partner: "stadtwerk-x", basis: BASIS, query: { verbrauchKwh: "4000" } });
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes('lang="de"'));
  assert.ok(html.includes('name="robots" content="noindex'));
  assert.ok(html.includes('<form method="get"'));
  assert.ok(html.includes('value="4000"'));
  assert.ok(html.includes("bereitgestellt von"));
  assert.ok(html.includes("utm_source=stadtwerk-x"));
  assert.ok(html.includes("keine Cookies"));
  assert.ok(!html.includes("<script"));
  // Links brechen aus dem iframe aus
  assert.ok(html.includes('target="_top"'));
});

test("widgetDokument eg-sparrechner (DE): ehrlicher Hinweis statt Zahlen", () => {
  const html = widgetDokument({ widgetId: "eg-sparrechner", land: "de", sprache: "de", partner: null, basis: BASIS });
  assert.ok(html.includes("nur mit geprüften Werten für Österreich"));
  assert.ok(!html.includes("<form"));
});

test("widgetDokument fristen: englische Fassung mit Liste oder Leerhinweis, ohne Skript", () => {
  const html = widgetDokument({ widgetId: "fristen", land: "at", sprache: "en", partner: null, basis: BASIS, heute: new Date("2026-10-11T12:00:00+02:00") });
  assert.ok(html.includes('lang="en"'));
  assert.ok(html.includes("provided by"));
  assert.ok(html.includes("No cookies, no tracking"));
  assert.ok(!html.includes("<script"));
  assert.ok(html.includes("fristen") || html.includes("No current deadlines"));
});

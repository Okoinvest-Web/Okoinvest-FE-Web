// Tests der JSON-LD-Komponente:  node --test src/components/JsonLd.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JsonLd, { jsonLdText } from "./JsonLd.js";

const BOESE = '</script><script>alert(1)</script><!-- & -->';

function inhalt(html) {
  const m = html.match(/^<script type="application\/ld\+json"[^>]*>([\s\S]*)<\/script>$/);
  assert.ok(m, `kein einzelner JSON-LD-Block: ${html}`);
  return m[1];
}

test("</script> im Projekttitel rendert sicher", () => {
  const daten = { "@context": "https://schema.org", "@type": "Product", name: BOESE, description: `Text ${BOESE}` };
  const html = renderToStaticMarkup(createElement(JsonLd, { daten }));
  const roh = inhalt(html);
  // genau ein schließendes </script> (das eigene), kein zweites <script
  assert.equal(html.match(/<\/script/gi).length, 1);
  assert.equal(html.match(/<script/gi).length, 1);
  assert.ok(!/[<>&]/.test(roh), "unescapte <, > oder & im Inhalt");
  assert.ok(!roh.includes("<!--"));
  // Inhalt ist gültiges JSON und ergibt exakt die Originaldaten
  assert.deepEqual(JSON.parse(roh), daten);
});

test("Groß-/Kleinschreibung </SCRIPT> wird ebenfalls neutralisiert", () => {
  const html = renderToStaticMarkup(createElement(JsonLd, { daten: { name: "</SCRIPT ><img src=x onerror=alert(1)>" } }));
  assert.equal(html.match(/<\/script/gi).length, 1);
  assert.equal(JSON.parse(inhalt(html)).name, "</SCRIPT ><img src=x onerror=alert(1)>");
});

test("U+2028 und U+2029 werden escapt und bleiben verlustfrei", () => {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const daten = { name: `a${LS}b${PS}c` };
  const text = jsonLdText(daten);
  assert.ok(!text.includes(LS) && !text.includes(PS));
  assert.ok(text.includes("\\u2028") && text.includes("\\u2029"));
  assert.deepEqual(JSON.parse(text), daten);
});

test("normale Daten: Umlaute und URLs unverändert, Listen erlaubt", () => {
  const daten = [{ "@type": "Organization", name: "Ökoinvest", url: "https://www.oekoinvest.com/" }, { "@type": "WebSite" }];
  const text = jsonLdText(daten);
  assert.equal(text, JSON.stringify(daten));
  assert.deepEqual(JSON.parse(text), daten);
});

test("id und nonce werden als Attribute gesetzt", () => {
  const html = renderToStaticMarkup(createElement(JsonLd, { daten: { a: 1 }, id: "faq-jsonld", nonce: "abc123" }));
  assert.match(html, /^<script type="application\/ld\+json" id="faq-jsonld" nonce="abc123">/);
});

test("null/undefined rendert nichts", () => {
  assert.equal(renderToStaticMarkup(createElement(JsonLd, { daten: null })), "");
  assert.equal(renderToStaticMarkup(createElement(JsonLd, {})), "");
});

test("nicht darstellbare Daten scheitern laut", () => {
  assert.throws(() => jsonLdText(undefined), TypeError);
  assert.throws(() => jsonLdText(() => 1), TypeError);
  const zirkulaer = {};
  zirkulaer.selbst = zirkulaer;
  assert.throws(() => jsonLdText(zirkulaer), TypeError);
});

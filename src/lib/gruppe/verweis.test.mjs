// Welle 2, Paket GRP – Verweis-Baustein (src/components/Gruppe/VerweisBaustein.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { html, verweisHtml, verweisText, verweisUrl } from "../../components/Gruppe/VerweisBaustein.js";

const DEV = { produktion: false };

test("URL zeigt immer auf den eigenen Kurzlink", () => {
  assert.equal(verweisUrl({ kennung: "beispiel-gruppe-de", ziel: "flaeche", basis: "https://www.oekoinvest.com/", optionen: DEV }), "https://www.oekoinvest.com/p/beispiel-gruppe-de?z=flaeche");
  assert.equal(verweisUrl({ kennung: "beispiel-gruppe-de", ziel: "nicht-freigegeben", basis: "https://x.test", optionen: DEV }), "https://x.test/p/beispiel-gruppe-de");
  assert.equal(verweisUrl({ kennung: "unbekannt-abc", optionen: DEV }), null);
  assert.equal(verweisUrl({ kennung: "beispiel-gruppe-de", optionen: { produktion: true } }), null);
});

test("HTML: Offenlegung enthalten, kein Skript, keine Vergütungsaussage", () => {
  const s = verweisHtml({ kennung: "beispiel-gruppe-de", ziel: "flaeche", basis: "https://www.oekoinvest.com", optionen: DEV });
  assert.match(s, /Teil der ÖKOVOLT Gruppe/);
  assert.match(s, /href="https:\/\/www\.oekoinvest\.com\/p\/beispiel-gruppe-de\?z=flaeche"/);
  assert.ok(!/<script|<img|<iframe|onload|onclick|javascript:/i.test(s));
  assert.ok(!/provision|vergütung|prämie|bonus|garant/i.test(s));
  const t = verweisText({ kennung: "beispiel-installateur-de", optionen: DEV });
  assert.match(t, /Teil der ÖKOVOLT Gruppe/);
});

test("HTML-Escape", () => {
  assert.equal(html(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  const s = verweisHtml({ kennung: "beispiel-gruppe-de", basis: 'https://x.test/"><script>', optionen: DEV });
  assert.ok(!s.includes("<script>"));
});

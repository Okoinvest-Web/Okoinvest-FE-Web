// Schweizer Schreibweise für fest geschriebenes JSX (W3-0)
import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { schreibweiseBaum } from "./SchweizerSchreibweise.js";

function Karte({ titel, pill, children }) {
  return h("div", { "data-pill": pill?.text }, h("h3", null, titel), children);
}

const baum = () =>
  h(
    "section",
    { "aria-label": "Größe", className: "groß", id: "maß" },
    h("p", null, "Die Straße ", h("strong", null, "schließt"), " um 18 Uhr."),
    h(Karte, { titel: "Maßnahmen", pill: { text: "Fußweg", href: "/fuß" } }, h("span", null, "Grüße")),
    h("ul", null, ["Spaß", "Fluß"].map((x) => h("li", { key: x }, x))),
    h(Fragment, null, "Außen", h("a", { href: "/straße" }, "Weiß")),
  );

test("schreibweiseBaum: CH ohne ß in Texten und Text-Props, technische Props unverändert", () => {
  const html = renderToStaticMarkup(schreibweiseBaum(baum(), "CH"));
  assert.doesNotMatch(html.replace(/(class|id|href)="[^"]*"/g, ""), /ß/);
  assert.match(html, /aria-label="Grösse"/);
  assert.match(html, /class="groß"/);
  assert.match(html, /id="maß"/);
  assert.match(html, /href="\/straße"/);
  assert.match(html, /data-pill="Fussweg"/);
  assert.match(html, /Die Strasse <strong>schliesst<\/strong> um 18 Uhr\./);
  assert.match(html, /<li>Spass<\/li><li>Fluss<\/li>/);
});

test("schreibweiseBaum: andere Länder und gemeinsame Seite unverändert (gleiches Element)", () => {
  const b = baum();
  for (const l of ["DE", "AT", null]) assert.equal(schreibweiseBaum(b, l), b);
  const ohne = h("p", null, "Fläche");
  assert.equal(schreibweiseBaum(ohne, "CH"), ohne);
});

test("schreibweiseSeite (QM Welle 3): auch Text in eingebetteten Server-Bausteinen, Fehler-Bausteine bleiben im Baum", async () => {
  const { schreibweiseSeite } = await import("./SchweizSeite.js");
  const Innen = ({ wort }) => h("em", null, `${wort} außen`);
  const Baustein = ({ titel }) => h("div", { title: "Maß" }, h("h2", null, "Großspeicher: ", titel), h(Innen, { wort: "weiß" }));
  const Asynchron = async () => h("p", null, "Fließtext");
  const Kaputt = () => {
    throw new Error("Hook außerhalb des Renderns");
  };
  const KlientReferenz = Object.assign(() => h("b", null, "Straße im Klienten"), { $$typeof: Symbol.for("react.client.reference") });
  const seite = h(
    "main",
    { id: "maß" },
    h(Baustein, { titel: "Größe" }),
    h(Asynchron),
    [h(Baustein, { key: "a", titel: "Fuß" })],
    h(KlientReferenz, { label: "Schließen", href: "/straße" }, "Grüße"),
    h(Kaputt, { text: "Spaß" }),
  );
  assert.equal(await schreibweiseSeite(seite, "DE"), seite);
  assert.equal(await schreibweiseSeite(seite, null), seite);
  const neu = await schreibweiseSeite(seite, "CH");
  const kinder = neu.props.children;
  assert.equal(kinder[4].type, Kaputt, "Baustein mit Fehler bleibt als Baustein im Baum");
  assert.equal(kinder[4].props.text, "Spass");
  assert.equal(kinder[3].type, KlientReferenz, "Client-Komponente wird nicht ausgeführt");
  assert.deepEqual([kinder[3].props.label, kinder[3].props.href, kinder[3].props.children], ["Schliessen", "/straße", "Grüsse"]);
  const html = renderToStaticMarkup(h("main", neu.props, ...kinder.slice(0, 3)));
  assert.doesNotMatch(html.replace(/(id|href)="[^"]*"/g, ""), /ß/);
  assert.match(html, /<div title="Mass"><h2>Grossspeicher: Grösse<\/h2><em>weiss aussen<\/em><\/div>/);
  assert.match(html, /<p>Fliesstext<\/p>/);
  assert.match(html, /Grossspeicher: Fuss/);
});

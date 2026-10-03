// src/lib/plattform/ki/wissen.js
//
// Wissensbasis des Flächen-Assistenten: ausschließlich Inhalte der eigenen Website
// (Ratgeber unter src/content/ratgeber, Fachlexikon src/data/lexikon.js).
//  - wissensBlock(): stabiler Textblock für den System-Prompt (wird per Prompt-Caching wiederverwendet)
//  - suchen(frage): einfache Stichwortsuche – Quellenliste im KI-Modus und Antwort im Regelmodus
// Nur öffentliche Inhalte, keine Nutzerdaten.

import { INHALTE } from "@/content/ratgeber";
import { BEGRIFFE } from "@/data/lexikon";

const RATGEBER_KATEGORIEN = ["Fläche & Pacht", "Agri-PV & Landwirtschaft", "Recht & Genehmigung"];
const LEXIKON_KATEGORIEN = ["flaeche", "planung"];

const STOPP = new Set(
  "der die das den dem des ein eine einer eines einem einen und oder aber auch als am an auf aus bei bin bis da dann darf dass du er es für gibt hat habe haben hier ich ihr im in ist ja kann können mein meine meiner mit muss nach nicht noch nur ob sich sie sind so über um und von vor was wann warum wer wie wird wo zu zum zur sehr mehr welche welcher welches wieviel viel viele ab bekomme bekommt meiner unsere unser unserer einen eigentlich bitte gilt gelten".split(" ")
);

// Fettdruck entfernen, Markdown-Links behalten (die Oberfläche rendert nur interne Links)
const ohneMarkdown = (s) => String(s || "").replace(/\*\*/g, "");

function woerter(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß§\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOPP.has(w));
}

let cache = null;

function eintraege() {
  if (cache) return cache;
  const ratgeber = INHALTE.filter((a) => RATGEBER_KATEGORIEN.includes(a.kategorie)).map((a) => ({
    art: "ratgeber",
    id: a.slug,
    titel: a.kurzTitel || a.title,
    href: `/wissen/ratgeber/${a.slug}`,
    kurz: ohneMarkdown(a.excerpt || a.description),
    fazit: (a.kurzFazit || []).map(ohneMarkdown),
    faq: (a.faq || []).map((f) => ({ q: ohneMarkdown(f.q), a: ohneMarkdown(f.a) })),
    stichworte: [a.hauptKeyword, ...(a.keywords || [])].filter(Boolean).join(" "),
  }));
  const lexikon = BEGRIFFE.filter((b) => LEXIKON_KATEGORIEN.includes(b.kategorie)).map((b) => ({
    art: "lexikon",
    id: b.id,
    titel: b.begriff,
    href: `/wissen/lexikon#${b.id}`,
    kurz: ohneMarkdown(b.kurz),
    text: ohneMarkdown(b.text),
    stichworte: (b.synonyme || []).join(" "),
  }));
  const alle = [...ratgeber, ...lexikon].map((e) => ({
    ...e,
    index: {
      titel: new Set(woerter(`${e.titel} ${e.stichworte}`)),
      text: woerter(`${e.kurz} ${(e.fazit || []).join(" ")} ${(e.faq || []).map((f) => `${f.q} ${f.a}`).join(" ")} ${e.text || ""}`),
    },
  }));
  cache = { ratgeber, lexikon, alle };
  return cache;
}

/** Stabiler Wissensblock (Reihenfolge fest → Cache-Präfix bleibt gleich) */
export function wissensBlock() {
  const { ratgeber, lexikon } = eintraege();
  const r = ratgeber
    .map((a) => {
      const teile = [`### ${a.titel} — ${a.href}`, a.kurz];
      if (a.fazit.length) teile.push(`Kernaussagen:\n${a.fazit.map((x) => `- ${x}`).join("\n")}`);
      if (a.faq.length) teile.push(`Häufige Fragen:\n${a.faq.map((f) => `F: ${f.q}\nA: ${f.a}`).join("\n")}`);
      return teile.join("\n");
    })
    .join("\n\n");
  const l = lexikon.map((b) => `- ${b.titel} (${b.href}): ${b.kurz} ${b.text}`).join("\n");
  return `<wissen quelle="Website ÖkoInvest (Ratgeber und Fachlexikon)">\n## Ratgeber\n\n${r}\n\n## Fachlexikon\n\n${l}\n</wissen>`;
}

/** Stichwortsuche: beste Treffer mit Titel, Link, Kurztext und – falls passend – FAQ-Antwort */
export function suchen(frage, { anzahl = 3 } = {}) {
  const w = [...new Set(woerter(frage))];
  if (!w.length) return [];
  const { alle } = eintraege();
  const bewertet = alle
    .map((e) => {
      let punkte = 0;
      for (const x of w) {
        if (e.index.titel.has(x)) punkte += 4;
        else if ([...e.index.titel].some((t) => t.startsWith(x) || x.startsWith(t))) punkte += 2;
        punkte += Math.min(3, e.index.text.filter((t) => t === x || (x.length > 4 && t.startsWith(x))).length);
      }
      if (e.art === "ratgeber") punkte *= 1.15;
      let faq = null;
      if (e.faq?.length) {
        let best = 0;
        for (const f of e.faq) {
          const fw = new Set(woerter(f.q));
          const s = w.filter((x) => fw.has(x)).length;
          if (s > best) {
            best = s;
            faq = f;
          }
        }
        if (best < 2) faq = null;
      }
      return { e, punkte, faq };
    })
    .filter((x) => x.punkte >= 3)
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, anzahl);
  return bewertet.map(({ e, faq }) => ({ art: e.art, titel: e.titel, href: e.href, text: e.kurz, faq }));
}

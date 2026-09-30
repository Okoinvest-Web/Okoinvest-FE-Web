// Einfacher Markdown-Satz für die Handbücher (docs/handbuch/*.md) im Portal – Server-Komponente, ohne Fremdpakete.
// Unterstützt: Überschriften (#–###), Absätze, Listen (- / 1.), Zitate (>), Tabellen (|…|), `Code`, **fett**, [Links](…).
// Links: nur interne Portal-Pfade und andere Handbücher werden verlinkt; alles andere bleibt Text (kein fremdes Ziel).
// Nutzertext wird nie als HTML ausgegeben (React-Escaping). Mermaid-/Code-Blöcke erscheinen als vorformatierter Text.

import Link from "next/link";
import { HANDBUCH_IDS } from "@/lib/plattform/querschnitt";

function ziel(href) {
  const h = String(href || "");
  const md = h.match(/^\.\/([a-z-]+)\.md$/i);
  if (md && HANDBUCH_IDS.includes(md[1])) return `/portal/hilfe/handbuch/${md[1]}`;
  if (/^\/portal(\/|$)/.test(h) && !h.includes("[")) return h;
  return null;
}

function inline(text, schluessel = "i") {
  const teile = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let letzt = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > letzt) teile.push(text.slice(letzt, m.index));
    const t = m[0];
    const k = `${schluessel}-${i++}`;
    if (t.startsWith("`")) {
      const inhalt = t.slice(1, -1);
      const z = ziel(inhalt.split("?")[0]);
      teile.push(z ? <Link key={k} href={inhalt} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.9em] text-ov-800 hover:underline">{inhalt}</Link> : <code key={k} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.9em] text-ink-800">{inhalt}</code>);
    } else if (t.startsWith("**")) {
      teile.push(<strong key={k} className="font-semibold text-ink-900">{inline(t.slice(2, -2), k)}</strong>);
    } else {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      const z = ziel(href);
      teile.push(z ? <Link key={k} href={z} className="font-semibold text-ov-700 underline underline-offset-2 hover:text-ov-800">{label}</Link> : <span key={k}>{label}</span>);
    }
    letzt = m.index + t.length;
  }
  if (letzt < text.length) teile.push(text.slice(letzt));
  return teile;
}

export default function HandbuchText({ markdown = "" }) {
  const zeilen = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const bloecke = [];
  let i = 0;
  while (i < zeilen.length) {
    const z = zeilen[i];
    const k = `b-${i}`;
    if (!z.trim()) {
      i++;
      continue;
    }
    if (z.startsWith("```")) {
      const inhalt = [];
      i++;
      while (i < zeilen.length && !zeilen[i].startsWith("```")) inhalt.push(zeilen[i++]);
      i++;
      bloecke.push(<pre key={k} className="overflow-x-auto rounded-2xl bg-ink-50 p-4 text-[12.5px] leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200">{inhalt.join("\n")}</pre>);
      continue;
    }
    const h = z.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const Tag = h[1].length === 1 ? "h2" : h[1].length === 2 ? "h3" : "h4";
      const klasse = h[1].length === 1 ? "font-display text-[22px] font-extrabold text-ink-900" : h[1].length === 2 ? "mt-2 font-display text-[18px] font-bold text-ink-900" : "font-display text-[15.5px] font-bold text-ink-900";
      bloecke.push(<Tag key={k} className={klasse}>{inline(h[2], k)}</Tag>);
      i++;
      continue;
    }
    if (z.trim().startsWith("|")) {
      const reihen = [];
      while (i < zeilen.length && zeilen[i].trim().startsWith("|")) reihen.push(zeilen[i++]);
      const zellen = reihen.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r.replace(/\|/g, "|"))).map((r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      const [kopf, ...rest] = zellen;
      bloecke.push(
        <div key={k} className="overflow-x-auto rounded-2xl ring-1 ring-ink-200/70">
          <table className="w-full min-w-[28rem] text-left text-[13.5px]">
            <thead className="bg-sand-50 text-ink-600"><tr>{kopf.map((c, j) => <th key={j} scope="col" className="px-3 py-2 font-semibold">{inline(c, `${k}-h${j}`)}</th>)}</tr></thead>
            <tbody className="divide-y divide-ink-100">{rest.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top text-ink-700">{inline(c, `${k}-${ri}-${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*(-|\d+\.)\s+/.test(z)) {
      const geordnet = /^\s*\d+\./.test(z);
      const punkte = [];
      while (i < zeilen.length && /^\s*(-|\d+\.)\s+/.test(zeilen[i])) punkte.push(zeilen[i++].replace(/^\s*(-|\d+\.)\s+/, ""));
      const Tag = geordnet ? "ol" : "ul";
      bloecke.push(<Tag key={k} className={geordnet ? "list-decimal space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink-700" : "list-disc space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-ink-700"}>{punkte.map((p, j) => <li key={j}>{inline(p, `${k}-${j}`)}</li>)}</Tag>);
      continue;
    }
    if (z.startsWith(">")) {
      const inhalt = [];
      while (i < zeilen.length && zeilen[i].startsWith(">")) inhalt.push(zeilen[i++].replace(/^>\s?/, ""));
      bloecke.push(<blockquote key={k} className="rounded-2xl bg-navy-50 px-4 py-3 text-[14px] leading-relaxed text-navy-900">{inline(inhalt.join(" "), k)}</blockquote>);
      continue;
    }
    const absatz = [];
    while (i < zeilen.length && zeilen[i].trim() && !/^(#{1,3}\s|\||>|```|\s*(-|\d+\.)\s)/.test(zeilen[i])) absatz.push(zeilen[i++]);
    if (!absatz.length) absatz.push(zeilen[i++]);
    bloecke.push(<p key={k} className="text-[14.5px] leading-relaxed text-ink-700">{inline(absatz.join(" "), k)}</p>);
  }
  return <div className="space-y-4">{bloecke}</div>;
}

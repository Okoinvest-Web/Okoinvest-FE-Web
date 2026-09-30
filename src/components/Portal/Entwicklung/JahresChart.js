// src/components/Portal/Entwicklung/JahresChart.js
//
// MWp je (prognostiziertem) Inbetriebnahmejahr: Säulen gesamt (ov) und wahrscheinlichkeitsgewichtet (navy), Ziellinie
// 50 MWp/Jahr gestrichelt. Inline-SVG ohne Bibliothek, Tooltip über <title>, Tabelle als Alternative für Screenreader.

import { fmt } from "@/lib/rechner/annahmen";

const B = 640;
const H = 240;
const R = { l: 44, r: 12, o: 16, u: 30 };

export default function JahresChart({ jahre = [], ziel = 50 }) {
  if (!jahre.length) return <p className="text-[14px] text-ink-500">Noch keine Projekte mit Ziel-Inbetriebnahme.</p>;
  const max = Math.max(ziel * 1.15, ...jahre.map((j) => j.mwp)) || 1;
  const schritt = max > 150 ? 50 : max > 60 ? 20 : 10;
  const oben = Math.ceil(max / schritt) * schritt;
  const y = (w) => R.o + (H - R.o - R.u) * (1 - w / oben);
  const breite = (B - R.l - R.r) / jahre.length;
  const saeule = Math.min(26, breite / 3);
  const linien = [];
  for (let w = 0; w <= oben; w += schritt) linien.push(w);
  return (
    <figure className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-600">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-ov-500" />MWp gesamt</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-navy-700" />MWp gewichtet (Wahrscheinlichkeit)</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-sun-500" />Ziel {ziel} MWp/Jahr</span>
      </div>
      <svg viewBox={`0 0 ${B} ${H}`} className="block h-auto w-full" role="img" aria-label={`MWp je Inbetriebnahmejahr, Ziel ${ziel} MWp pro Jahr`}>
        {linien.map((w) => (
          <g key={w}>
            <line x1={R.l} x2={B - R.r} y1={y(w)} y2={y(w)} className="stroke-ink-100" strokeWidth="1" />
            <text x={R.l - 8} y={y(w) + 4} textAnchor="end" className="fill-ink-400 text-[11px]">{w}</text>
          </g>
        ))}
        {jahre.map((j, i) => {
          const x = R.l + i * breite + breite / 2;
          return (
            <g key={j.jahr}>
              <rect x={x - saeule - 1} y={y(j.mwp)} width={saeule} height={Math.max(0, y(0) - y(j.mwp))} rx="4" className="fill-ov-500">
                <title>{`${j.jahr}: ${fmt(j.mwp, 1)} MWp gesamt (${j.anzahl} Projekte)`}</title>
              </rect>
              <rect x={x + 1} y={y(j.mwpGewichtet)} width={saeule} height={Math.max(0, y(0) - y(j.mwpGewichtet))} rx="4" className="fill-navy-700">
                <title>{`${j.jahr}: ${fmt(j.mwpGewichtet, 1)} MWp gewichtet`}</title>
              </rect>
              <text x={x} y={H - 10} textAnchor="middle" className="fill-ink-600 text-[12px] font-semibold">{j.jahr}</text>
              {j.mwp > 0 && <text x={x - saeule / 2 - 1} y={y(j.mwp) - 5} textAnchor="middle" className="fill-ink-700 text-[10.5px] font-semibold">{fmt(j.mwp, 0)}</text>}
            </g>
          );
        })}
        <line x1={R.l} x2={B - R.r} y1={y(ziel)} y2={y(ziel)} className="stroke-sun-500" strokeWidth="2" strokeDasharray="6 5" />
        <text x={B - R.r} y={y(ziel) - 6} textAnchor="end" className="fill-ink-700 text-[11px] font-semibold">Ziel {ziel} MWp</text>
      </svg>
      <table className="sr-only">
        <caption>MWp je Inbetriebnahmejahr</caption>
        <thead><tr><th>Jahr</th><th>MWp gesamt</th><th>MWp gewichtet</th><th>Projekte</th></tr></thead>
        <tbody>{jahre.map((j) => <tr key={j.jahr}><td>{j.jahr}</td><td>{fmt(j.mwp, 1)}</td><td>{fmt(j.mwpGewichtet, 1)}</td><td>{j.anzahl}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Horizontale Balken (je Phase / Land): MWp mit Anzahl und Pipeline-Wert */
export function Balken({ zeilen = [], wertText }) {
  const max = Math.max(1, ...zeilen.map((z) => z.mwp));
  return (
    <ul className="space-y-3">
      {zeilen.map((z) => (
        <li key={z.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold text-ink-800">{z.label} <span className="font-normal text-ink-500">· {z.anzahl}</span></span>
            <span className="ov-num shrink-0 text-ink-700">{fmt(z.mwp, 1)} MWp{wertText ? ` · ${wertText(z)}` : ""}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-ov-500" style={{ width: `${(z.mwp / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

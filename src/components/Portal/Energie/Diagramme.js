// src/components/Portal/Energie/Diagramme.js
//
// SVG-Diagramme des Handelsdesks im Stil der Website (Energie live): Linien-/Treppenchart, gruppierte bzw. gestapelte
// Balken, Wochen-Heatmap. Ohne Hooks – in Server- und Client-Komponenten nutzbar. Skalierung über viewBox, Werte als
// <title> (Tooltip) und Tabellen-Alternative über `beschreibung` (aria-label).

import { cn } from "@/components/ui/cn";

export const FARBEN = {
  navy: "#1f5aa1",
  navyHell: "rgba(31,90,161,0.10)",
  gruen: "#669933",
  gruenDunkel: "#436621",
  gruenHell: "rgba(102,153,51,0.22)",
  sonne: "#f5a70f",
  grau: "#9aa3b2",
  raster: "#eef0f4",
  basis: "#c4cad5",
  text: "#6b7486",
  tinte: "#151a24",
};

const zahl = (x, s = 0) => (Number.isFinite(x) ? x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");

/** „Schöne“ Achse: {von, bis, schritt, ticks[]} */
export function achse(min, max, anzahl = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { von: 0, bis: 1, ticks: [0, 1] };
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const roh = (max - min) / anzahl;
  const p = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * p).find((s) => s >= roh) || 10 * p;
  const von = Math.floor(min / schritt) * schritt;
  const bis = Math.ceil(max / schritt) * schritt;
  const ticks = [];
  for (let t = von; t <= bis + schritt / 2; t += schritt) ticks.push(Math.round(t * 1e6) / 1e6);
  return { von, bis, schritt, ticks };
}

export function Legende({ eintraege = [], className }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-600", className)}>
      {eintraege.map((e) => (
        <li key={e.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm" style={{ background: e.farbe, opacity: e.gestrichelt ? 0.7 : 1 }} />
          {e.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * Linien- bzw. Treppenchart.
 * reihen: [{name, farbe, punkte: [{x (Zahl), y}], flaeche?, gestrichelt?, treppe?}]
 * xText(x) → Achsenbeschriftung; xTicks: Positionen; yEinheit: Text an der y-Achse
 */
export function LinienChart({ reihen = [], xTicks = [], xText = String, yEinheit = "", hoehe = 260, breite = 720, nullLinie = true, beschreibung = "", markierungen = [] }) {
  const alle = reihen.flatMap((r) => r.punkte);
  if (!alle.length) return <p className="text-[14px] text-ink-500">Keine Daten.</p>;
  const xs = alle.map((p) => p.x);
  const ys = alle.map((p) => p.y).filter(Number.isFinite);
  const PAD = { l: 48, r: 12, t: 14, b: 28 };
  const w = breite - PAD.l - PAD.r;
  const h = hoehe - PAD.t - PAD.b;
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ax = achse(Math.min(nullLinie ? 0 : Infinity, ...ys), Math.max(...ys), 5);
  const X = (x) => PAD.l + (xmax === xmin ? w / 2 : ((x - xmin) / (xmax - xmin)) * w);
  const Y = (y) => PAD.t + (1 - (y - ax.von) / (ax.bis - ax.von)) * h;
  const pfad = (r) => {
    let d = "";
    r.punkte.forEach((p, i) => {
      if (!Number.isFinite(p.y)) return;
      const x = X(p.x).toFixed(1);
      const y = Y(p.y).toFixed(1);
      if (!d) d = `M${x},${y}`;
      else d += r.treppe ? `H${x}V${y}` : `L${x},${y}`;
      if (i === r.punkte.length - 1 && r.treppe) d += `H${(X(p.x) + w / Math.max(1, r.punkte.length)).toFixed(1)}`;
    });
    return d;
  };
  return (
    <svg viewBox={`0 0 ${breite} ${hoehe}`} className="h-auto w-full" role="img" aria-label={beschreibung || `Diagramm${yEinheit ? ` (${yEinheit})` : ""}`}>
      {ax.ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={breite - PAD.r} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? FARBEN.basis : FARBEN.raster} strokeWidth={t === 0 ? 1.2 : 1} />
          <text x={PAD.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill={FARBEN.text}>
            {zahl(t, ax.schritt < 1 ? 1 : 0)}
          </text>
        </g>
      ))}
      {yEinheit && (
        <text x={4} y={10} fontSize="10.5" fill={FARBEN.text}>
          {yEinheit}
        </text>
      )}
      {markierungen.map((m) => (
        <g key={m.x}>
          <line x1={X(m.x)} x2={X(m.x)} y1={PAD.t} y2={PAD.t + h} stroke={FARBEN.sonne} strokeDasharray="4 3" />
          <text x={X(m.x) + 4} y={PAD.t + 10} fontSize="10.5" fill={FARBEN.tinte}>
            {m.text}
          </text>
        </g>
      ))}
      {reihen.map((r) =>
        r.flaeche ? <path key={`${r.name}-f`} d={`${pfad(r)}V${Y(Math.max(ax.von, 0))}H${X(r.punkte[0].x)}Z`} fill={r.flaeche} stroke="none" /> : null
      )}
      {reihen.map((r) => (
        <path key={r.name} d={pfad(r)} fill="none" stroke={r.farbe} strokeWidth={r.dicke || 1.8} strokeDasharray={r.gestrichelt ? "5 4" : undefined} strokeLinejoin="round">
          <title>{r.name}</title>
        </path>
      ))}
      {xTicks.map((x) => (
        <text key={x} x={X(x)} y={hoehe - 8} textAnchor="middle" fontSize="11" fill={FARBEN.text}>
          {xText(x)}
        </text>
      ))}
    </svg>
  );
}

/**
 * Gruppierte oder gestapelte Balken.
 * kategorien: [label], reihen: [{name, farbe, werte: [zahl|null]}], gestapelt: bool
 */
export function BalkenChart({ kategorien = [], reihen = [], gestapelt = false, yEinheit = "", hoehe = 240, breite = 720, beschreibung = "", format = (x) => zahl(x, 1), linie = null }) {
  if (!kategorien.length) return <p className="text-[14px] text-ink-500">Keine Daten.</p>;
  const PAD = { l: 48, r: 12, t: 14, b: 30 };
  const w = breite - PAD.l - PAD.r;
  const h = hoehe - PAD.t - PAD.b;
  const summen = kategorien.map((_, i) => (gestapelt ? reihen.reduce((s, r) => s + Math.max(0, r.werte[i] || 0), 0) : Math.max(...reihen.map((r) => r.werte[i] ?? 0))));
  const mins = kategorien.map((_, i) => Math.min(0, ...reihen.map((r) => r.werte[i] ?? 0)));
  const lw = linie ? linie.werte.filter(Number.isFinite) : [];
  const ax = achse(Math.min(0, ...mins, ...lw), Math.max(...summen, ...lw), 5);
  const Y = (y) => PAD.t + (1 - (y - ax.von) / (ax.bis - ax.von)) * h;
  const gruppe = w / kategorien.length;
  const bw = gestapelt ? Math.min(40, gruppe * 0.6) : Math.min(22, (gruppe * 0.75) / Math.max(1, reihen.length));
  const jedeN = Math.ceil(kategorien.length / 14);
  return (
    <svg viewBox={`0 0 ${breite} ${hoehe}`} className="h-auto w-full" role="img" aria-label={beschreibung || "Balkendiagramm"}>
      {ax.ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={breite - PAD.r} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? FARBEN.basis : FARBEN.raster} />
          <text x={PAD.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill={FARBEN.text}>
            {zahl(t, ax.schritt < 1 ? 1 : 0)}
          </text>
        </g>
      ))}
      {yEinheit && (
        <text x={4} y={10} fontSize="10.5" fill={FARBEN.text}>
          {yEinheit}
        </text>
      )}
      {kategorien.map((k, i) => {
        const x0 = PAD.l + gruppe * i + (gruppe - (gestapelt ? bw : bw * reihen.length)) / 2;
        let basis = 0;
        return (
          <g key={k}>
            {reihen.map((r, j) => {
              const v = r.werte[i];
              if (!Number.isFinite(v)) return null;
              const y0 = gestapelt ? basis : 0;
              const y1 = gestapelt ? basis + Math.max(0, v) : v;
              if (gestapelt) basis = y1;
              const x = gestapelt ? x0 : x0 + j * bw;
              const top = Y(Math.max(y0, y1));
              const hh = Math.abs(Y(y0) - Y(y1));
              return (
                <rect key={r.name} x={x} y={top} width={bw - (gestapelt ? 0 : 2)} height={Math.max(0.5, hh)} rx="2" fill={r.farbe} opacity={r.deckkraft ?? 1}>
                  <title>{`${k} · ${r.name}: ${format(v)}${yEinheit ? ` ${yEinheit}` : ""}`}</title>
                </rect>
              );
            })}
            {i % jedeN === 0 && (
              <text x={PAD.l + gruppe * (i + 0.5)} y={hoehe - 10} textAnchor="middle" fontSize="11" fill={FARBEN.text}>
                {k}
              </text>
            )}
          </g>
        );
      })}
      {linie && (
        <path
          d={linie.werte.map((v, i) => (Number.isFinite(v) ? `${i === 0 ? "M" : "L"}${(PAD.l + gruppe * (i + 0.5)).toFixed(1)},${Y(v).toFixed(1)}` : "")).join("")}
          fill="none"
          stroke={linie.farbe}
          strokeWidth="2"
          strokeDasharray="5 4"
        >
          <title>{linie.name}</title>
        </path>
      )}
    </svg>
  );
}

/** Wochen-Heatmap 7 × 24 (Mo–So × Stunde) */
export function Heatmap({ matrix = [], einheit = "", beschreibung = "", breite = 720 }) {
  const werte = matrix.flat().filter(Number.isFinite);
  if (!werte.length) return <p className="text-[14px] text-ink-500">Keine Daten.</p>;
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const PAD = { l: 30, t: 6, b: 22 };
  const zw = (breite - PAD.l - 6) / 24;
  const zh = 20;
  const tage = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const hoehe = PAD.t + 7 * zh + PAD.b;
  return (
    <svg viewBox={`0 0 ${breite} ${hoehe}`} className="h-auto w-full" role="img" aria-label={beschreibung || "Wochenprofil"}>
      {matrix.map((zeile, t) =>
        zeile.map((v, s) => {
          const a = max > min ? (v - min) / (max - min) : 0.5;
          return (
            <rect key={`${t}-${s}`} x={PAD.l + s * zw} y={PAD.t + t * zh} width={zw - 1.5} height={zh - 2} rx="2" fill={`rgba(31,90,161,${(0.08 + a * 0.85).toFixed(3)})`}>
              <title>{`${tage[t]} ${String(s).padStart(2, "0")}:00 – ${zahl(v, 1)} ${einheit}`}</title>
            </rect>
          );
        })
      )}
      {tage.map((d, t) => (
        <text key={d} x={2} y={PAD.t + t * zh + 14} fontSize="11" fill={FARBEN.text}>
          {d}
        </text>
      ))}
      {[0, 6, 12, 18, 23].map((s) => (
        <text key={s} x={PAD.l + s * zw + zw / 2} y={hoehe - 6} textAnchor="middle" fontSize="11" fill={FARBEN.text}>
          {`${s} h`}
        </text>
      ))}
    </svg>
  );
}

/** Quellenzeile unter Diagrammen (Pflicht bei CC BY 4.0) */
export function Quelle({ children, warnung = false }) {
  return <p className={cn("mt-2 text-[12px] leading-snug", warnung ? "font-medium text-ink-800" : "text-ink-500")}>{children}</p>;
}

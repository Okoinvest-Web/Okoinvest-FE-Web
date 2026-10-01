"use client";

// src/components/diagramme/HeatmapDiagramm.js
//
// Matrix-Heatmap: Wochenprofil 7 × 24, Lastgang 24 × 365 (Stunde × Tag), Monat × Stunde …
// Farbe in 9 Stufen aus SEQUENZ_NAVY / SEQUENZ_GRUEN bzw. DIVERGIEREND (farbenblind-sicher), Stufenlegende mit
// Min/Max, Fadenkreuz-Rahmen + Tooltip, Tastatur ← → (Spalte) ↑ ↓ (Zeile), Datentabelle, CSV, PNG.
// Große Matrizen (8.760 Zellen) ohne Lücken und ohne Einzel-Tooltips im DOM – Trefferprüfung rechnerisch.
//
// Props (serialisierbar):
//   matrix: number[][] (Zeilen × Spalten)   zeilen: string[]   spalten: string[]
//   spaltenBeschriftung?: [{ index, text }]  (sonst aus spalten, ausgedünnt)   zeilenJede?: Zahl (jede n-te Zeile beschriften)
//   spaltenTitel?: string[] (Tooltip), einheit, stellen, skala: "navy" | "gruen" | "divergierend", zellHoehe, titel, beschreibung

import { useMemo } from "react";
import { ACHSE, DIVERGIEREND, SEQUENZ_GRUEN, SEQUENZ_NAVY } from "@/components/ui/datenfarben";
import { DiagrammRahmen, Plot, useBreite } from "./Rahmen";
import { XBeschriftung } from "./Achsen";
import { SCHRIFT, textBreite, wertText } from "./skala";

const SKALEN = { navy: SEQUENZ_NAVY, gruen: SEQUENZ_GRUEN, divergierend: DIVERGIEREND };

/** Stufenlegende (server-tauglich): Farbstufen mit Min/Max-Beschriftung. */
export function StufenLegende({ farben, min, max, einheit, stellen, dunkel = false }) {
  return (
    <div className={dunkel ? "text-white/75" : "text-ink-600"}>
      <div className="flex items-center gap-2 text-[12px]">
        <span className="ov-num">{wertText(min, { stellen })}</span>
        <span aria-hidden="true" className="flex h-2.5 w-28 overflow-hidden rounded-full sm:w-36">
          {farben.map((c) => (
            <span key={c} className="h-full flex-1" style={{ background: c }} />
          ))}
        </span>
        <span className="ov-num">
          {wertText(max, { stellen })}
          {einheit ? ` ${einheit}` : ""}
        </span>
      </div>
    </div>
  );
}

export default function HeatmapDiagramm({
  matrix = [],
  zeilen = [],
  spalten = [],
  spaltenBeschriftung,
  spaltenTitel,
  zeilenJede,
  einheit = "",
  stellen,
  skala = "navy",
  zellHoehe,
  titel,
  untertitel,
  beschreibung,
  werkzeuge,
  dunkel = false,
  leerText = "Keine Daten.",
  className,
}) {
  const [ref, gemessen] = useBreite(720);
  const breite = Math.max(240, gemessen);
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  const farben = SKALEN[skala] || SEQUENZ_NAVY;
  const nz = matrix.length;
  const ns = Math.max(0, ...matrix.map((z) => z.length));

  const { min, max } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const z of matrix) {
      for (const v of z) {
        if (!Number.isFinite(v)) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    return { min: lo, max: hi };
  }, [matrix]);

  if (!nz || !ns || !Number.isFinite(min)) return <p className="text-[14px] text-ink-500">{leerText}</p>;

  const stufe = (v) => {
    if (!Number.isFinite(v)) return null;
    if (skala === "divergierend") {
      const m = Math.max(Math.abs(min), Math.abs(max)) || 1;
      return farben[Math.max(0, Math.min(farben.length - 1, Math.round(((v / m + 1) / 2) * (farben.length - 1))))];
    }
    const a = max > min ? (v - min) / (max - min) : 0.5;
    return farben[Math.max(0, Math.min(farben.length - 1, Math.floor(a * farben.length - 1e-9)))];
  };

  const jede = zeilenJede ?? (nz > 12 ? 6 : 1);
  const labelB = Math.max(...zeilen.map((z, i) => (i % jede === 0 ? textBreite(z) : 0)), 16);
  const P = { l: Math.ceil(labelB + 10), r: 4, t: 4, b: 24 };
  const zh = zellHoehe ?? (nz <= 7 ? 24 : nz <= 12 ? 18 : Math.max(7, Math.min(12, Math.floor(260 / nz))));
  const hoehe = P.t + nz * zh + P.b;
  const zw = (breite - P.l - P.r) / ns;
  const spalt = zw >= 6 && zh >= 10 ? 2 : 0;
  const rund = spalt ? Math.min(3, zw / 4) : 0;

  const xLabels = spaltenBeschriftung ? spaltenBeschriftung.map((b) => ({ pos: P.l + (b.index + 0.5) * zw, text: b.text })) : spalten.map((s, i) => ({ pos: P.l + (i + 0.5) * zw, text: s }));
  const zellName = (z, s) => `${zeilen[z] ?? z + 1} · ${spaltenTitel?.[s] ?? spalten[s] ?? s + 1}`;

  const indexAusPx = (x, y) => {
    const s = Math.floor((x - P.l) / zw);
    const z = Math.floor((y - P.t) / zh);
    if (s < 0 || s >= ns || z < 0 || z >= nz) return null;
    return z * ns + s;
  };
  const info = (i) => {
    const z = Math.floor(i / ns);
    const s = i % ns;
    const v = matrix[z]?.[s];
    return { x: P.l + (s + 0.5) * zw, y: P.t + z * zh, titel: zellName(z, s), zeilen: [{ name: "Wert", wert: wertText(v, { stellen, einheit }), farbe: stufe(v) || f.raster }] };
  };
  const fadenkreuz = (i) => {
    const z = Math.floor(i / ns);
    const s = i % ns;
    return (
      <rect
        x={P.l + s * zw - 1}
        y={P.t + z * zh - 1}
        width={Math.max(3, zw - spalt + 2)}
        height={zh - spalt + 2}
        rx={rund + 1}
        fill="none"
        stroke={dunkel ? "#ffffff" : "#151a24"}
        strokeWidth="2"
      />
    );
  };

  const tabelle = {
    kopf: ["", ...Array.from({ length: ns }, (_, s) => spaltenTitel?.[s] ?? spalten[s] ?? String(s + 1))],
    zeilen: matrix.map((zeile, z) => [zeilen[z] ?? String(z + 1), ...zeile.map((v) => wertText(v, { stellen }))]),
    csv: { kopf: ["", ...Array.from({ length: ns }, (_, s) => spaltenTitel?.[s] ?? spalten[s] ?? String(s + 1))], zeilen: matrix.map((zeile, z) => [zeilen[z] ?? String(z + 1), ...zeile.map((v) => (Number.isFinite(v) ? v : ""))]) },
  };

  const kurz = beschreibung || `${titel || "Heatmap"}: ${nz} × ${ns} Werte von ${wertText(min, { stellen, einheit })} bis ${wertText(max, { stellen, einheit })}`;

  return (
    <DiagrammRahmen
      titel={titel}
      untertitel={untertitel}
      beschreibung={kurz}
      tabelle={tabelle}
      werkzeuge={werkzeuge}
      dunkel={dunkel}
      className={className}
      kopfAktion={titel ? <StufenLegende farben={farben} min={min} max={max} einheit={einheit} stellen={stellen} dunkel={dunkel} /> : undefined}
    >
      <div ref={ref} className="min-w-0">
        <Plot breite={breite} hoehe={hoehe} anzahl={nz * ns} zeilenSchritt={ns} indexAusPx={indexAusPx} info={info} fadenkreuz={fadenkreuz} beschreibung={kurz} dunkel={dunkel}>
          <g className="ov-flaeche-ein" shapeRendering={spalt ? undefined : "crispEdges"}>
            {matrix.map((zeile, z) =>
              zeile.map((v, s) => {
                const c = stufe(v);
                if (!c) return null;
                return <rect key={`${z}-${s}`} x={P.l + s * zw} y={P.t + z * zh} width={Math.max(0.6, zw - spalt + (spalt ? 0 : 0.4))} height={zh - spalt + (spalt ? 0 : 0.4)} rx={rund} fill={c} />;
              })
            )}
          </g>
          {zeilen.map((zl, z) =>
            z % jede === 0 ? (
              <text key={`${zl}-${z}`} x={P.l - 8} y={P.t + z * zh + (zh - spalt) / 2} dy="0.34em" textAnchor="end" fontSize={SCHRIFT.achse} fill={f.text}>
                {zl}
              </text>
            ) : null
          )}
          <XBeschriftung eintraege={xLabels} P={P} breite={breite} hoehe={hoehe} dunkel={dunkel} />
        </Plot>
      </div>
      {!titel && (
        <div className="mt-2">
          <StufenLegende farben={farben} min={min} max={max} einheit={einheit} stellen={stellen} dunkel={dunkel} />
        </div>
      )}
    </DiagrammRahmen>
  );
}

// src/components/diagramme/Achsen.js
//
// Achsen und Raster für kartesische Diagramme (server- und client-tauglich, reine SVG-Elemente):
// Raster nur horizontal, Nulllinie betont, y-Beschriftung rechtsbündig, Einheit oben links,
// x-Beschriftung ohne Überlappung (ausduennen), Randlabels nach innen ausgerichtet.

import { ACHSE } from "@/components/ui/datenfarben";
import { achse, achsenText, ausduennen, SCHRIFT, textBreite } from "./skala";

/**
 * Rahmenmaße berechnen.
 *   yAchse: Ergebnis von achse(); rechts: zweite Achse (optional)
 *   einheit: Text über der y-Achse
 */
export function rahmenMasse({ breite, hoehe, yAchse, yText = achsenText, rechts, rechtsText, einheit, unten = 26, xBeschriftung = true }) {
  const labelL = Math.max(...yAchse.ticks.map((t) => textBreite(yText(t, yAchse.schritt))));
  const labelR = rechts ? Math.max(...rechts.ticks.map((t) => textBreite(rechtsText ? rechtsText(t) : achsenText(t, rechts.schritt)))) : 0;
  const P = {
    l: Math.ceil(Math.max(28, labelL + 10)),
    r: rechts ? Math.ceil(labelR + 10) : 10,
    t: einheit ? 24 : 10,
    b: xBeschriftung ? unten : 8,
  };
  return { P, innenB: Math.max(10, breite - P.l - P.r), innenH: Math.max(10, hoehe - P.t - P.b) };
}

/** y-Raster mit Beschriftung. Y: Skala Wert → px. */
export function YRaster({ yAchse, Y, P, breite, einheit, dunkel = false, yText = achsenText }) {
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  return (
    <g>
      {yAchse.ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={breite - P.r} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? f.achse : f.raster} strokeWidth={t === 0 ? 1.25 : 1} shapeRendering="crispEdges" />
          <text x={P.l - 8} y={Y(t)} dy="0.34em" textAnchor="end" fontSize={SCHRIFT.achse} fill={f.text} style={{ fontVariantNumeric: "tabular-nums" }}>
            {yText(t, yAchse.schritt)}
          </text>
        </g>
      ))}
      {einheit && (
        <text x={2} y={11} textAnchor="start" fontSize={SCHRIFT.achse} fill={f.text}>
          {einheit}
        </text>
      )}
    </g>
  );
}

/** Zweite y-Achse rechts (nur Beschriftung, kein Raster). */
export function YRechts({ achse: a, Y, P, breite, einheit, farbe, dunkel = false, text = (t) => achsenText(t, a.schritt) }) {
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  return (
    <g>
      {a.ticks.map((t) => (
        <text key={t} x={breite - P.r + 8} y={Y(t)} dy="0.34em" fontSize={SCHRIFT.achse} fill={farbe || f.text}>
          {text(t)}
        </text>
      ))}
      {einheit && (
        <text x={breite - 2} y={11} textAnchor="end" fontSize={SCHRIFT.achse} fill={farbe || f.text}>
          {einheit}
        </text>
      )}
    </g>
  );
}

/** x-Beschriftung: eintraege [{ pos, text }] – wird ausgedünnt, Ränder nach innen. */
export function XBeschriftung({ eintraege, P, breite, hoehe, dunkel = false }) {
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  const sichtbar = ausduennen(eintraege.filter((e) => e.text !== "" && e.text != null));
  return (
    <g>
      {sichtbar.map((e) => {
        const b = textBreite(e.text) / 2;
        const anker = e.pos + b > breite - 2 ? "end" : e.pos - b < Math.min(P.l, 4) ? "start" : "middle";
        return (
          <text key={`${e.pos}-${e.text}`} x={anker === "end" ? Math.min(e.pos, breite - 2) : e.pos} y={hoehe - P.b + 18} textAnchor={anker} fontSize={SCHRIFT.achse} fill={f.text}>
            {e.text}
          </text>
        );
      })}
    </g>
  );
}

export { achse };

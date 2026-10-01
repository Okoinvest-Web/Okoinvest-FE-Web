"use client";

// src/components/diagramme/DonutDiagramm.js
//
// Donut für Anteile (max. 4 Segmente laut DESIGN.md § 7 – Rest wird zu „Sonstige“ in ink-300 zusammengefasst).
// Segmente zeichnen sich nacheinander (Strich mit pathLength, ov-linie), Hover/Tastatur heben ein Segment hervor
// (andere blenden ab), Mitte zeigt Summe bzw. das aktive Segment. Legende mit Wert und Anteil, Datentabelle, CSV, PNG.
//
// Props: segmente [{ name, wert, farbe?, text? }], einheit, stellen, mitteLabel, mitteWert (Text), groesse, titel, beschreibung

import { useState } from "react";
import { ACHSE, kategorieFarbe } from "@/components/ui/datenfarben";
import { DiagrammRahmen, Plot } from "./Rahmen";
import { bogenLinie, wertText } from "./skala";

const SONSTIGE = "#c4cad5"; // ink-300 laut DESIGN.md § 7

export default function DonutDiagramm({ segmente = [], einheit = "", stellen, mitteLabel = "Summe", mitteWert, groesse = 200, maxSegmente = 4, titel, untertitel, beschreibung, werkzeuge, dunkel = false, leerText = "Keine Daten.", className }) {
  const [aktiv, setAktiv] = useState(null);
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  let liste = segmente.filter((s) => Number.isFinite(s.wert) && s.wert > 0).map((s, i) => ({ ...s, farbe: s.farbe || kategorieFarbe(i, dunkel) }));
  if (liste.length > maxSegmente) {
    const rest = liste.slice(maxSegmente - 1);
    liste = [...liste.slice(0, maxSegmente - 1), { name: "Sonstige", wert: rest.reduce((a, s) => a + s.wert, 0), farbe: SONSTIGE }];
  }
  const summe = liste.reduce((a, s) => a + s.wert, 0);
  if (!summe) return <p className="text-[14px] text-ink-500">{leerText}</p>;

  const g = groesse;
  const c = g / 2;
  const dicke = Math.max(14, g * 0.14);
  const r = c - dicke / 2 - 4;
  const luecke = liste.length > 1 ? 0.035 : 0;
  let winkel = 0;
  const boegen = liste.map((s) => {
    const a0 = winkel;
    const a1 = winkel + (s.wert / summe) * Math.PI * 2;
    winkel = a1;
    return { ...s, a0, a1, anteil: s.wert / summe };
  });
  const text = (s) => s.text ?? wertText(s.wert, { stellen, einheit });
  const pct = (a) => `${wertText(a * 100, { stellen: a < 0.1 ? 1 : 0 })} %`;

  const indexAusPx = (x, y) => {
    const dx = x - c;
    const dy = y - c;
    const d = Math.hypot(dx, dy);
    if (d < r - dicke / 2 - 4 || d > r + dicke / 2 + 6) return null;
    let a = Math.atan2(dx, -dy);
    if (a < 0) a += Math.PI * 2;
    return boegen.findIndex((b) => a >= b.a0 && a < b.a1);
  };
  const info = (i) => {
    const b = boegen[i];
    const am = (b.a0 + b.a1) / 2;
    return { x: c + (r + dicke / 2) * Math.sin(am), y: c - (r + dicke / 2) * Math.cos(am), titel: b.name, zeilen: [{ name: "Wert", wert: text(b), farbe: b.farbe }, { name: "Anteil", wert: pct(b.anteil) }] };
  };

  const kurz = beschreibung || `${titel || "Anteile"}: ${boegen.map((b) => `${b.name} ${pct(b.anteil)}`).join(", ")}`;
  const tabelle = {
    kopf: ["Segment", `Wert${einheit ? ` (${einheit})` : ""}`, "Anteil"],
    zeilen: [...boegen.map((b) => [b.name, text(b), pct(b.anteil)]), ["Summe", wertText(summe, { stellen, einheit }), "100 %"]],
    csv: { kopf: ["Segment", `Wert${einheit ? ` (${einheit})` : ""}`, "Anteil"], zeilen: boegen.map((b) => [b.name, b.wert, b.anteil]) },
  };
  const a = aktiv != null ? boegen[aktiv] : null;

  return (
    <DiagrammRahmen titel={titel} untertitel={untertitel} beschreibung={kurz} tabelle={tabelle} werkzeuge={werkzeuge} dunkel={dunkel} className={className}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="relative shrink-0" style={{ width: g, height: g }}>
          <Plot breite={g} hoehe={g} anzahl={boegen.length} indexAusPx={indexAusPx} info={info} beschreibung={kurz} dunkel={dunkel} onAktiv={setAktiv}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={f.raster} strokeWidth={dicke} />
            {boegen.map((b, i) => (
              <path
                key={b.name}
                d={bogenLinie(c, c, r, b.a0 + luecke / 2, Math.max(b.a0 + luecke / 2 + 0.001, b.a1 - luecke / 2))}
                pathLength="1"
                fill="none"
                stroke={b.farbe}
                strokeWidth={dicke}
                className="ov-linie"
                opacity={aktiv == null || aktiv === i ? 1 : 0.35}
                style={{ "--ov-delay": `${i * 160}ms`, transition: "opacity 180ms" }}
              />
            ))}
          </Plot>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={dunkel ? "text-[12px] text-white/70" : "text-[12px] text-ink-500"}>{a ? a.name : mitteLabel}</span>
            <span className={`ov-num font-display text-[20px] font-extrabold leading-tight ${dunkel ? "text-white" : "text-ink-900"}`}>{a ? pct(a.anteil) : mitteWert ?? wertText(summe, { stellen, einheit })}</span>
          </div>
        </div>
        <ul className={`min-w-0 flex-1 space-y-2 text-[13px] ${dunkel ? "text-white/80" : "text-ink-700"}`}>
          {boegen.map((b, i) => (
            <li key={b.name} className="flex items-center justify-between gap-3" onPointerEnter={() => setAktiv(i)} onPointerLeave={() => setAktiv(null)}>
              <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: b.farbe }} />
                <span className="truncate">{b.name}</span>
              </span>
              <span className="ov-num shrink-0">
                <span className={`font-semibold ${dunkel ? "text-white" : "text-ink-900"}`}>{text(b)}</span>
                <span className={dunkel ? "ml-2 text-white/60" : "ml-2 text-ink-500"}>{pct(b.anteil)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DiagrammRahmen>
  );
}

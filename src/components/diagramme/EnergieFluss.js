"use client";

// src/components/diagramme/EnergieFluss.js
//
// Sankey-artiger Energiefluss in Spalten, z. B. Erzeugung → Gemeinschaft → Verbrauch/Einspeisung
// (oder PV/Netz → Verbrauch/Speicher/Einspeisung). Bandbreite ∝ Energie, Farben nach festen ENERGIE-Bedeutungen,
// Knoten beschriftet mit Name und Wert (nie nur Farbe). Bänder blenden gestaffelt ein, Knoten wachsen;
// Hover/Tastatur heben einen Fluss hervor (andere blenden ab) und zeigen Wert + Anteil an der Quelle.
//
// Props:
//   knoten: [{ id, name, spalte: 0 | 1 | 2 …, farbe }]
//   fluesse: [{ von, nach, wert, farbe? }]       (farbe Standard: Farbe des Quellknotens)
//   einheit, stellen, hoehe, titel, untertitel, beschreibung, dunkel

import { useState } from "react";
import { ACHSE } from "@/components/ui/datenfarben";
import { DiagrammRahmen, Plot, useBreite } from "./Rahmen";
import { SCHRIFT, textBreite, wertText } from "./skala";

export default function EnergieFluss({ knoten = [], fluesse = [], einheit = "kWh", stellen, hoehe = 300, titel, untertitel, beschreibung, werkzeuge, dunkel = false, leerText = "Keine Daten.", className }) {
  const [ref, gemessen] = useBreite(720);
  const [aktiv, setAktiv] = useState(null);
  const breite = Math.max(280, gemessen);
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  const liste = fluesse.filter((x) => Number.isFinite(x.wert) && x.wert > 0 && knoten.some((k) => k.id === x.von) && knoten.some((k) => k.id === x.nach));
  if (!liste.length) return <p className="text-[14px] text-ink-500">{leerText}</p>;

  const txt = (v) => wertText(v, { stellen, einheit });
  const spalten = [...new Set(knoten.map((k) => k.spalte))].sort((a, b) => a - b);
  const durch = (k) => Math.max(liste.filter((x) => x.nach === k.id).reduce((s, x) => s + x.wert, 0), liste.filter((x) => x.von === k.id).reduce((s, x) => s + x.wert, 0));
  const schmal = breite < 520;
  const knotenB = 12;
  const abstandY = 14;

  // Platz für Beschriftung links (erste Spalte) und rechts (letzte Spalte)
  const labelBreite = (spalte) => Math.min(schmal ? 96 : 170, Math.max(40, ...knoten.filter((k) => k.spalte === spalte).map((k) => Math.max(textBreite(k.name, 12.5), textBreite(txt(durch(k)), 12.5)))) + 10);
  const P = { l: labelBreite(spalten[0]), r: labelBreite(spalten[spalten.length - 1]), t: spalten.length > 2 ? 40 : 10, b: 8 };
  const innenH = hoehe - P.t - P.b;
  const maxSumme = Math.max(...spalten.map((s) => knoten.filter((k) => k.spalte === s).reduce((a, k) => a + durch(k), 0)));
  const maxAnzahl = Math.max(...spalten.map((s) => knoten.filter((k) => k.spalte === s).length));
  const skala = (innenH - abstandY * (maxAnzahl - 1)) / (maxSumme || 1);
  const xSpalte = (s) => P.l + ((breite - P.l - P.r - knotenB) * spalten.indexOf(s)) / Math.max(1, spalten.length - 1);

  // Knoten-Positionen (je Spalte vertikal zentriert)
  const pos = new Map();
  spalten.forEach((s) => {
    const ks = knoten.filter((k) => k.spalte === s);
    const gesamt = ks.reduce((a, k) => a + durch(k) * skala, 0) + abstandY * (ks.length - 1);
    let y = P.t + (innenH - gesamt) / 2;
    ks.forEach((k) => {
      const h = Math.max(2, durch(k) * skala);
      pos.set(k.id, { ...k, x: xSpalte(s), y, h, rein: y, raus: y });
      y += h + abstandY;
    });
  });

  // Bänder (Reihenfolge stabil nach Eingabe)
  const baender = liste.map((x) => {
    const a = pos.get(x.von);
    const b = pos.get(x.nach);
    const h = x.wert * skala;
    const y0 = a.raus;
    const y1 = b.rein;
    a.raus += h;
    b.rein += h;
    const x0 = a.x + knotenB;
    const x1 = b.x;
    const xm = (x0 + x1) / 2;
    const d = `M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + h}C${xm},${y1 + h} ${xm},${y0 + h} ${x0},${y0 + h}Z`;
    const quelleSumme = liste.filter((z) => z.von === x.von).reduce((s, z) => s + z.wert, 0);
    return { ...x, d, x0, x1, y0, y1, h, farbe: x.farbe || a.farbe, anteil: x.wert / (quelleSumme || 1), vonName: a.name, nachName: b.name };
  });

  const indexAusPx = (px, py) => {
    let best = null;
    baender.forEach((b, i) => {
      if (px < b.x0 || px > b.x1) return;
      const u = (px - b.x0) / (b.x1 - b.x0 || 1);
      const s = u * u * (3 - 2 * u);
      const top = b.y0 + (b.y1 - b.y0) * s;
      if (py >= top - 2 && py <= top + Math.max(4, b.h) + 2) best = i;
    });
    return best;
  };
  const info = (i) => {
    const b = baender[i];
    return {
      x: (b.x0 + b.x1) / 2,
      y: (b.y0 + b.y1) / 2,
      titel: `${b.vonName} → ${b.nachName}`,
      zeilen: [{ name: "Energie", wert: txt(b.wert), farbe: b.farbe }],
      fuss: `${wertText(b.anteil * 100, { stellen: 0 })} % von ${b.vonName}`,
    };
  };

  const kurz = beschreibung || `${titel || "Energiefluss"}: ${baender.map((b) => `${b.vonName} nach ${b.nachName} ${txt(b.wert)}`).join(", ")}`;
  const tabelle = {
    kopf: ["Von", "Nach", `Energie${einheit ? ` (${einheit})` : ""}`, "Anteil an Quelle"],
    zeilen: baender.map((b) => [b.vonName, b.nachName, wertText(b.wert, { stellen }), `${wertText(b.anteil * 100, { stellen: 0 })} %`]),
    rechts: [2, 3],
    csv: { kopf: ["Von", "Nach", `Energie${einheit ? ` (${einheit})` : ""}`], zeilen: baender.map((b) => [b.vonName, b.nachName, b.wert]) },
  };

  const erste = spalten[0];
  const letzte = spalten[spalten.length - 1];

  return (
    <DiagrammRahmen titel={titel} untertitel={untertitel} beschreibung={kurz} tabelle={tabelle} werkzeuge={werkzeuge} dunkel={dunkel} className={className}>
      <div ref={ref} className="min-w-0">
        <Plot breite={breite} hoehe={hoehe} anzahl={baender.length} indexAusPx={indexAusPx} info={info} beschreibung={kurz} dunkel={dunkel} onAktiv={setAktiv}>
          {baender.map((b, i) => (
            <g key={`${b.von}-${b.nach}`} className="ov-flaeche-ein" style={{ animationDelay: `${300 + i * 90}ms` }}>
              <path
                d={b.d}
                fill={b.farbe}
                fillOpacity={dunkel ? 0.5 : 0.4}
                opacity={aktiv == null || aktiv === i ? 1 : 0.3}
                stroke={aktiv === i ? b.farbe : "none"}
                strokeOpacity="0.9"
                style={{ transition: "opacity 180ms" }}
              />
            </g>
          ))}
          {[...pos.values()].map((k, i) => {
            const links = k.spalte === erste;
            const rechts = k.spalte === letzte && !links;
            const lx = links ? k.x - 8 : rechts ? k.x + knotenB + 8 : k.x + knotenB / 2;
            const anker = links ? "end" : rechts ? "start" : "middle";
            const mittig = !links && !rechts;
            const ly = mittig ? k.y - 22 : k.y + k.h / 2 - 7;
            return (
              <g key={k.id}>
                <rect x={k.x} y={k.y} width={knotenB} height={k.h} rx="3" fill={k.farbe} className="ov-balken-y" style={{ "--i": i }} />
                <text x={lx} y={Math.max(11, ly)} textAnchor={anker} fontSize="12.5" fontWeight="600" fill={f.textStark}>
                  {k.name}
                </text>
                <text x={lx} y={Math.max(11, ly) + 15} textAnchor={anker} fontSize={SCHRIFT.achse} fill={f.text} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {txt(durch(k))}
                </text>
              </g>
            );
          })}
        </Plot>
      </div>
    </DiagrammRahmen>
  );
}

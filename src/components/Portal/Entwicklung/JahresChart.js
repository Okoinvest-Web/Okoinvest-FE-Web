// src/components/Portal/Entwicklung/JahresChart.js
//
// MWp je (prognostiziertem) Inbetriebnahmejahr: Säulen gesamt (ov) und wahrscheinlichkeitsgewichtet (navy), Ziellinie
// 50 MWp/Jahr gestrichelt.

import { fmt } from "@/lib/rechner/annahmen";
import { KATEGORIE_HELL, STATUS } from "@/components/ui/datenfarben";
import BalkenDiagramm from "@/components/diagramme/BalkenDiagramm";

// Darstellung über das Chart-System (BalkenDiagramm): Tooltip mit Projektzahl, Tastatur, Tabelle, CSV/PNG, Einlauf.
export default function JahresChart({ jahre = [], ziel = 50 }) {
  if (!jahre.length) return <p className="text-[14px] text-ink-500">Noch keine Projekte mit Ziel-Inbetriebnahme.</p>;
  return (
    <BalkenDiagramm
      kategorien={jahre.map((j) => String(j.jahr))}
      reihen={[
        { name: "MWp gesamt", farbe: KATEGORIE_HELL[1], werte: jahre.map((j) => j.mwp), texte: jahre.map((j) => `${fmt(j.mwp, 1)} MWp`) },
        { name: "MWp gewichtet (Wahrscheinlichkeit)", farbe: KATEGORIE_HELL[0], werte: jahre.map((j) => j.mwpGewichtet), texte: jahre.map((j) => `${fmt(j.mwpGewichtet, 1)} MWp`) },
      ]}
      referenz={[{ y: ziel, text: `Ziel ${ziel} MWp/Jahr`, farbe: STATUS.warn }]}
      zusatz={jahre.map((j) => ({ fuss: `${j.anzahl} ${j.anzahl === 1 ? "Projekt" : "Projekte"}` }))}
      yEinheit="MWp"
      hoehe={260}
      beschreibung={`MWp je Inbetriebnahmejahr, Ziel ${ziel} MWp pro Jahr: ${jahre.map((j) => `${j.jahr} ${fmt(j.mwp, 1)} MWp`).join(", ")}`}
    />
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

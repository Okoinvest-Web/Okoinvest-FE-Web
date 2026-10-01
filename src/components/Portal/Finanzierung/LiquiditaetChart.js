"use client";

// Liquiditätsverlauf: kumulierter Eigenkapital-Cashflow (nach Steuern, sofern eingerechnet) je Finanzierungsvariante als
// Linien (höchstens 3 gleichzeitig, feste Farbreihenfolge, geprüft mit dem Palette-Validator: Grün 700, Navy 500, Sonne –
// Sonne mit Linienstil als zweitem Merkmal und Direktbeschriftung). Darstellung über das Chart-System (LinienDiagramm):
// Fadenkreuz + Tooltip per Zeiger und Tastatur, Nulllinie, Legende, Direktlabels, Tabelle, CSV/PNG.

import { LINIENSTIL } from "@/components/ui/datenfarben";
import LinienDiagramm from "@/components/diagramme/LinienDiagramm";
import { teur } from "./teile";

export const LINIEN_FARBEN = ["#436621", "#1f5aa1", "#c98500"]; // ov-700, navy-500, sun-600 (ui/datenfarben)

export default function LiquiditaetChart({ reihen = [], titel = "Liquiditätsverlauf (kumulierter Eigenkapital-Cashflow)" }) {
  const T = Math.max(1, ...reihen.map((r) => r.werte.length - 1));
  return (
    <LinienDiagramm
      titel={titel}
      reihen={reihen.map((r, i) => ({ name: r.label, kurz: r.kurz, farbe: LINIEN_FARBEN[i], gestrichelt: i ? LINIENSTIL[i] : false, werte: r.werte, texte: r.werte.map((v) => teur(v)) }))}
      xBeschriftung={Array.from({ length: T + 1 }, (_, t) => ({ x: t, text: t === 0 ? "Start" : `J. ${t}` }))}
      xTitel={Array.from({ length: T + 1 }, (_, t) => (t === 0 ? "Start (Jahr 0)" : `Jahr ${t}`))}
      yEinheit="€"
      referenz={[{ y: 0, text: "" }]}
      direktLabels
      hoehe={260}
      beschreibung={`${titel}: ${reihen.map((r) => `${r.label} Endwert ${teur(r.werte[r.werte.length - 1])}`).join(", ")}`}
    />
  );
}

// src/components/Portal/Energie/Diagramme.js
//
// Diagramme des Handelsdesks und der Energie-Seiten – dünne, server-taugliche Hülle um das Chart-System
// (src/components/diagramme). Schnittstellen unverändert: LinienChart, BalkenChart, Heatmap, Legende, Quelle,
// FARBEN, achse. Formatfunktionen der Aufrufer (xText, format) werden hier auf dem Server ausgewertet und als
// fertige Texte übergeben – dadurch dürfen Server-Komponenten die Diagramme weiter direkt verwenden.
// Neu durch das Chart-System: gemessene Breite (Schrift unskaliert), Fadenkreuz + Tooltip per Zeiger und Tastatur,
// Einlauf-Animation, Datentabelle, CSV- und PNG-Export.

import { cn } from "@/components/ui/cn";
import { ACHSE, ENERGIE } from "@/components/ui/datenfarben";
import LinienDiagramm from "@/components/diagramme/LinienDiagramm";
import BalkenDiagramm from "@/components/diagramme/BalkenDiagramm";
import HeatmapDiagramm from "@/components/diagramme/HeatmapDiagramm";
import NeueLegende from "@/components/diagramme/Legende";
import { achse as skalaAchse } from "@/components/diagramme/skala";

export const FARBEN = {
  navy: ENERGIE.verbrauch,
  navyHell: "rgba(0,52,115,0.10)",
  gruen: ENERGIE.eigenverbrauch,
  gruenDunkel: "#436621",
  gruenHell: "rgba(102,153,51,0.22)",
  sonne: ENERGIE.erzeugung,
  grau: ENERGIE.prognose,
  raster: ACHSE.hell.raster,
  basis: ACHSE.hell.achse,
  text: ACHSE.hell.text,
  tinte: ACHSE.hell.textStark,
};

const zahl = (x, s = 0) => (Number.isFinite(x) ? x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }).replace(/^-/, "−") : "–");

/** „Schöne“ Achse: {von, bis, schritt, ticks[]} */
export const achse = skalaAchse;

/** Legende: eintraege [{ name, farbe, gestrichelt? }] */
export function Legende({ eintraege = [], className }) {
  return <NeueLegende className={className} eintraege={eintraege.map((e) => ({ name: e.name, farbe: e.farbe, stil: e.gestrichelt ? "linie" : e.stil, gestrichelt: e.gestrichelt }))} />;
}

/**
 * Linien- bzw. Treppenchart.
 * reihen: [{name, farbe, punkte: [{x (Zahl), y}], flaeche?, gestrichelt?, treppe?, dicke?}]
 * xText(x) → Achsenbeschriftung; xTicks: Positionen; yEinheit: Text an der y-Achse
 */
export function LinienChart({ reihen = [], xTicks = [], xText = String, yEinheit = "", hoehe = 260, nullLinie = true, beschreibung = "", markierungen = [] }) {
  const xs = [...new Set(reihen.flatMap((r) => r.punkte.map((p) => p.x)).filter(Number.isFinite))].sort((a, b) => a - b);
  const stellen = (() => {
    const ys = reihen.flatMap((r) => r.punkte.map((p) => p.y)).filter(Number.isFinite);
    const m = ys.length ? Math.max(...ys.map(Math.abs)) : 0;
    return m >= 100 ? 0 : m >= 10 ? 1 : 2;
  })();
  return (
    <LinienDiagramm
      reihen={reihen.map((r) => ({
        name: r.name,
        farbe: r.farbe,
        punkte: r.punkte.map((p) => ({ x: p.x, y: Number.isFinite(p.y) ? p.y : null })),
        flaeche: r.flaeche || false,
        gestrichelt: !!r.gestrichelt,
        treppe: !!r.treppe,
        dicke: r.dicke,
      }))}
      xBeschriftung={xTicks.map((x) => ({ x, text: String(xText(x) ?? "") }))}
      xTitel={xs.map((x) => String(xText(x) ?? ""))}
      yEinheit={yEinheit}
      yStellen={stellen}
      nullLinie={nullLinie}
      hoehe={hoehe}
      beschreibung={beschreibung || `Diagramm${yEinheit ? ` (${yEinheit})` : ""}`}
      markierungen={markierungen}
      legende={false}
    />
  );
}

/**
 * Gruppierte oder gestapelte Balken.
 * kategorien: [label], reihen: [{name, farbe, werte: [zahl|null], deckkraft?}], gestapelt: bool, linie?: {name, farbe, werte}
 */
export function BalkenChart({ kategorien = [], reihen = [], gestapelt = false, yEinheit = "", hoehe = 240, beschreibung = "", format = (x) => zahl(x, 1), linie = null }) {
  const mitEinheit = (v) => (Number.isFinite(v) ? `${format(v)}${yEinheit ? ` ${yEinheit}` : ""}` : null);
  return (
    <BalkenDiagramm
      kategorien={kategorien.map(String)}
      reihen={reihen.map((r) => ({ name: r.name, farbe: r.farbe, deckkraft: r.deckkraft, werte: r.werte.map((v) => (Number.isFinite(v) ? v : null)), texte: r.werte.map(mitEinheit) }))}
      gestapelt={gestapelt}
      linie={linie ? { name: linie.name, farbe: linie.farbe, werte: linie.werte.map((v) => (Number.isFinite(v) ? v : null)), texte: linie.werte.map(mitEinheit) } : null}
      yEinheit={yEinheit}
      hoehe={hoehe}
      beschreibung={beschreibung || "Balkendiagramm"}
      werteZeigen={false}
      legende={false}
    />
  );
}

const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Wochen-Heatmap 7 × 24 (Mo–So × Stunde) */
export function Heatmap({ matrix = [], einheit = "", beschreibung = "" }) {
  const h2 = (s) => String(s).padStart(2, "0");
  return (
    <HeatmapDiagramm
      matrix={matrix.map((z) => z.map((v) => (Number.isFinite(v) ? v : null)))}
      zeilen={TAGE.slice(0, matrix.length)}
      spalten={Array.from({ length: 24 }, (_, s) => `${s}`)}
      spaltenBeschriftung={[0, 6, 12, 18, 23].map((s) => ({ index: s, text: `${s} h` }))}
      spaltenTitel={Array.from({ length: 24 }, (_, s) => `${h2(s)}:00–${h2(s + 1)}:00`)}
      einheit={einheit}
      stellen={1}
      beschreibung={beschreibung || "Wochenprofil"}
    />
  );
}

/** Quellenzeile unter Diagrammen (Pflicht bei CC BY 4.0) */
export function Quelle({ children, warnung = false }) {
  return <p className={cn("mt-2 text-[12px] leading-snug", warnung ? "font-medium text-ink-800" : "text-ink-500")}>{children}</p>;
}

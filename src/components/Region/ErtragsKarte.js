// Kachelkarte DACH als Wärmebild des spezifischen Ertrags (PVGIS, kWh/kWp) – je Region eine Kachel,
// jede Kachel verlinkt die Regionalseite. Werte kommen aus den Regionaldaten, nichts ist fest verdrahtet.
import { cn } from "@/components/ui/cn";
import { META } from "@/data/regionen/meta";
import { REGIONEN } from "@/data/regionen";
import { fmt } from "@/lib/rechner/annahmen";
import s from "./region.module.css";
import { pfad, regionSchluessel } from "@/lib/land";

const ZELLE = 72;
const LUECKE = 6;
const SPALTEN = 8;
const ZEILEN = 7;

// Sequenzielle Skala in Markenfarben: kühl (Navy) → Grün → Sonne
export const ERTRAG_STUFEN = [
  { fill: "#1d3d6b", text: "#ffffff" },
  { fill: "#2f6a5a", text: "#ffffff" },
  { fill: "#4f8a2e", text: "#ffffff" },
  { fill: "#8cba58", text: "#03122b" },
  { fill: "#ffc53d", text: "#03122b" },
];

const ertragVon = Object.fromEntries(REGIONEN.map((r) => [r.slug, r.ertrag?.kwhProKwp]).filter(([, v]) => v));
const werte = Object.values(ertragVon);
export const ERTRAG_MIN = Math.min(...werte);
export const ERTRAG_MAX = Math.max(...werte);

export function ertragStufe(v) {
  if (!v) return null;
  const t = (v - ERTRAG_MIN) / Math.max(1, ERTRAG_MAX - ERTRAG_MIN);
  return Math.min(ERTRAG_STUFEN.length - 1, Math.floor(t * ERTRAG_STUFEN.length));
}

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };

export default function ErtragsKarte({ dunkel = true, einlauf = false, className }) {
  const breite = SPALTEN * ZELLE;
  const hoehe = ZEILEN * ZELLE;
  return (
    <figure className={cn("w-full", className)}>
      {/* einlauf: Wärmebild baut sich beim Laden von kühl nach sonnig auf (reines CSS, region.module.css) */}
      <svg viewBox={`0 0 ${breite} ${hoehe}`} role="group" aria-label="Spezifischer Ertrag je Region als Kachelkarte" className={cn("h-auto w-full select-none", einlauf && s.laden)} style={einlauf ? { "--ov-delay": "480ms" } : undefined}>
        <line x1={0} x2={breite} y1={5 * ZELLE - LUECKE / 2} y2={5 * ZELLE - LUECKE / 2} stroke={dunkel ? "rgba(255,255,255,0.18)" : "#d6dae2"} strokeDasharray="4 6" strokeWidth={1.5} />
        {META.map((m, i) => {
          const w = m.karte.w || 1;
          const x = m.karte.x * ZELLE + LUECKE / 2;
          const y = m.karte.y * ZELLE + LUECKE / 2;
          const bw = w * ZELLE - LUECKE;
          const bh = ZELLE - LUECKE;
          const v = ertragVon[m.slug];
          const stufe = ertragStufe(v) ?? 0;
          const f = ERTRAG_STUFEN[stufe];
          return (
            <a key={m.slug} href={pfad(regionSchluessel(m.slug))} aria-label={`${m.name} (${LAND_NAME[m.land]})${v ? `: ${fmt(v)} kWh/kWp` : ""}`} className={cn("group outline-none", s.kachel)} style={{ "--stufe": stufe, "--i": i % 6 }}>
              <title>{`${m.name}${v ? ` · ${fmt(v)} kWh/kWp` : ""}`}</title>
              <rect x={x} y={y} width={bw} height={bh} rx={14} fill={f.fill} className="transition-opacity duration-200 group-hover:opacity-85" />
              <rect x={x} y={y} width={bw} height={bh} rx={14} fill="none" strokeWidth={3} className="stroke-transparent group-hover:stroke-white/70 group-focus-visible:stroke-white" />
              <text x={x + bw / 2} y={y + bh / 2 + (v ? -2 : 7)} textAnchor="middle" fill={f.text} className="pointer-events-none font-display text-[19px] font-extrabold max-sm:[transform:translateY(9px)] max-sm:[transform-box:fill-box]">{m.kurz}</text>
              {v && (
                <text x={x + bw / 2} y={y + bh / 2 + 16} textAnchor="middle" fill={f.text} opacity="0.8" className="ov-num pointer-events-none text-[11.5px] font-semibold max-sm:hidden">{fmt(v)}</text>
              )}
            </a>
          );
        })}
      </svg>
      <figcaption className={cn("mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[12.5px]", dunkel ? "text-white/65" : "text-ink-600")}>
        <span className="flex items-center gap-2">
          <span className="ov-num">{fmt(ERTRAG_MIN)}</span>
          <span aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full">
            {ERTRAG_STUFEN.map((st) => <span key={st.fill} className="h-full w-7" style={{ background: st.fill }} />)}
          </span>
          <span className="ov-num">{fmt(ERTRAG_MAX)} kWh/kWp</span>
        </span>
        <span>Schematisch, nicht maßstäblich · PVGIS</span>
      </figcaption>
    </figure>
  );
}

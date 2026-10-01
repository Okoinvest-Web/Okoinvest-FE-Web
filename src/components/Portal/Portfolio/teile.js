// src/components/Portal/Portfolio/teile.js
//
// Anzeige-Bausteine des Portfolios (Server- und Client-tauglich, ohne Hooks): Formatierung, Ampel, Soll/Ist-Diagramm (Inline-SVG).

import { Badge } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";

export const eur = (x, land = "DE") => (x === null || x === undefined ? "–" : `${Math.round(Number(x)).toLocaleString("de-DE")} ${land === "CH" ? "CHF" : "€"}`);
export const mio = (x, land = "DE") => (x === null || x === undefined ? "–" : Math.abs(x) >= 1e6 ? `${(x / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mio. ${land === "CH" ? "CHF" : "€"}` : eur(x, land));
export const pct = (x, st = 1) => (x === null || x === undefined ? "–" : `${(Number(x) * 100).toLocaleString("de-DE", { minimumFractionDigits: st, maximumFractionDigits: st })} %`);
export const mwh = (kwh) => (kwh === null || kwh === undefined ? "–" : `${Math.round(Number(kwh) / 1000).toLocaleString("de-DE")} MWh`);
export const datum = (s) => (s ? new Date(`${String(s).slice(0, 10)}T12:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" }) : "–");
export const monatKurz = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }).replace(".", "");
export const monatLang = (m) => (m ? new Date(`${String(m).slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }) : "–");
export const dscrText = (x) => (x === null || x === undefined ? "–" : Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

const AMPEL = {
  gruen: { ton: "ok", label: "im Plan", punkt: "bg-ov-500" },
  gelb: { ton: "warn", label: "Beobachten", punkt: "bg-sun-500" },
  rot: { ton: "warn", label: "Kritisch", punkt: "bg-danger-600" },
  grau: { ton: "neutral", label: "keine Daten", punkt: "bg-ink-400" },
};

export function Ampel({ wert = "grau", label, className }) {
  const a = AMPEL[wert] || AMPEL.grau;
  return (
    <Badge ton={a.ton} className={className}>
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", a.punkt)} />
      {label || a.label}
    </Badge>
  );
}

/** Soll/Ist-Säulen je Monat (Soll = heller Balken, Ist = grün bzw. Sonne bei > 10 % unter Soll) */
export function ErtragDiagramm({ monate = [] }) {
  if (!monate.length) return null;
  const max = Math.max(1, ...monate.map((m) => Math.max(m.soll || 0, m.ist || 0)));
  const B = 640;
  const H = 180;
  const unten = 22;
  const s = B / monate.length;
  const bw = Math.max(6, s * 0.34);
  const hoehe = (w) => ((w || 0) / max) * (H - unten - 8);
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${B} ${H}`} role="img" aria-label="Erzeugung je Monat: Soll (P50) und Ist" className="h-auto w-full">
        <line x1="0" x2={B} y1={H - unten} y2={H - unten} className="stroke-ink-200" strokeWidth="1" />
        {monate.map((m, i) => {
          const x = i * s + s / 2;
          const hs = hoehe(m.soll);
          const hi = hoehe(m.ist);
          const schwach = m.abw !== null && m.abw < -0.1;
          return (
            <g key={m.monat}>
              <title>{`${monatLang(m.monat)}: Soll ${mwh(m.soll)}, Ist ${mwh(m.ist)}${m.abw !== null ? ` (${pct(m.abw)})` : ""}`}</title>
              <rect x={x - bw - 1} y={H - unten - hs} width={bw} height={hs} rx="2" className="fill-navy-100" />
              {m.ist !== null && <rect x={x + 1} y={H - unten - hi} width={bw} height={hi} rx="2" className={schwach ? "fill-sun-400" : "fill-ov-500"} />}
              <text x={x} y={H - 6} textAnchor="middle" className="fill-ink-500 text-[11px]">{monatKurz(m.monat)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-[12.5px] text-ink-600">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-navy-100" />Soll (P50)</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-ov-500" />Ist</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-sun-400" />Ist mehr als 10 % unter Soll</span>
      </figcaption>
    </figure>
  );
}

/** Balken „abgerufen / Zusage“ */
export function ZusageBalken({ zusage }) {
  if (!zusage?.zusage) return null;
  const b = Math.min(100, (zusage.bezahlt / zusage.zusage) * 100);
  const a = Math.min(100, (zusage.abgerufen / zusage.zusage) * 100);
  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`Abgerufen ${Math.round(a)} % der Zusage, bezahlt ${Math.round(b)} %`}>
        <div className="absolute inset-y-0 left-0 bg-ov-200" style={{ width: `${a}%` }} />
        <div className="absolute inset-y-0 left-0 bg-ov-600" style={{ width: `${b}%` }} />
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-600">
        Bezahlt {eur(zusage.bezahlt)} · abgerufen {eur(zusage.abgerufen)} · offen {eur(zusage.offen)} von {eur(zusage.zusage)}
      </p>
    </div>
  );
}

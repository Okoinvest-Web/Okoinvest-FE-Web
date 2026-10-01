"use client";

// Diagramme des Backoffice (Berichte) als eigene SVG-Komponenten im Stil der Rechner:
// feine Rasterlinien, Markenfarben, Tooltip per Zeiger/Tipp, Schrift unskaliert (useBreite).

import { useState } from "react";
import BalkenDiagramm from "@/components/diagramme/BalkenDiagramm";
import { fmt } from "@/lib/rechner/annahmen";

export const FARBEN = ["#aed083", "#7fb24a", "#558227", "#1f5aa1", "#041d42"];
export const LAND_FARBEN = { DE: "#669933", AT: "#1f5aa1", CH: "#f5a70f" };
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const monatKurz = (m) => `${MONATE[Number(m.slice(5)) - 1]}${m.slice(5) === "01" ? ` ${m.slice(2, 4)}` : ""}`;

export function Legende({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.linie ? <span className="h-[3px] w-5 rounded-full" style={{ background: i.farbe }} aria-hidden="true" /> : <span className="h-3 w-3 rounded-[3px]" style={{ background: i.farbe }} aria-hidden="true" />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Gruppierte Säulen über Monate (z. B. Trichterstufen je Monat) mit optionaler Linie.
 * reihen: [{ label, farbe, werte: [..] }], linie?: { label, farbe, werte }
 */
export function MonatsSaeulen({ monate, reihen, linie, format = (v) => fmt(v), titel }) {
  // Über das Chart-System (BalkenDiagramm): Fadenkreuz, Tastatur, Tabelle, CSV/PNG, Einlauf
  return (
    <BalkenDiagramm
      kategorien={monate.map(monatKurz)}
      kategorienTitel={monate.map((m) => `${MONATE[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`)}
      reihen={reihen.map((r) => ({ name: r.label, farbe: r.farbe, werte: r.werte.map((v) => v || 0) }))}
      linie={linie ? { name: linie.label, farbe: linie.farbe, werte: linie.werte.map((v) => v || 0), gestrichelt: false } : null}
      format={(v) => format(v)}
      werteZeigen={false}
      legende={false}
      hoehe={280}
      beschreibung={`${titel || "Säulendiagramm"} über ${monate.length} Monate: ${reihen.map((r) => `${r.label} gesamt ${format(r.werte.reduce((a, b) => a + b, 0))}`).join(", ")}`}
    />
  );
}

/** Trichter: Stufen als horizontale Balken mit Übergangsquote */
export function Trichter({ stufen, farbe = "#669933", titel }) {
  const max = Math.max(1, ...stufen.map((s) => s.anzahl));
  return (
    <ol className="space-y-2.5" aria-label={titel}>
      {stufen.map((s, i) => {
        const quote = i && stufen[i - 1].anzahl ? s.anzahl / stufen[i - 1].anzahl : null;
        const gesamt = i && stufen[0].anzahl ? s.anzahl / stufen[0].anzahl : null;
        return (
          <li key={s.id || s.label} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]">
            <span className="truncate text-ink-700">{s.label}</span>
            <span className="relative h-6 rounded-lg bg-ink-50">
              <span className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${Math.max(2, (s.anzahl / max) * 100)}%`, background: i === 0 ? "#1f5aa1" : farbe, opacity: 1 - i * 0.08 }} />
              {quote !== null && <span className="absolute inset-y-0 right-2 flex items-center whitespace-nowrap text-[11px] font-semibold text-ink-600">{fmt(quote * 100, 0)} %<span className="hidden sm:inline">&nbsp;der Vorstufe</span></span>}
            </span>
            <span className="ov-num w-16 text-right font-bold text-ink-900">{fmt(s.anzahl)}{gesamt !== null && <span className="block text-[10.5px] font-medium text-ink-500">{fmt(gesamt * 100, 0)} %</span>}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Horizontale Balken, optional gestapelt (werte je Schlüssel, z. B. Land).
 * eintraege: [{ label, wert }] oder [{ label, werte: { DE, AT, CH } }]
 */
export function Balken({ eintraege, farben = LAND_FARBEN, format = (v) => fmt(v), labels = {}, titel }) {
  const summe = (e) => (e.werte ? Object.values(e.werte).reduce((a, b) => a + (b || 0), 0) : e.wert || 0);
  const max = Math.max(1e-9, ...eintraege.map(summe));
  const [hover, setHover] = useState(null);
  return (
    <div>
      <ul className="space-y-2" aria-label={titel}>
        {eintraege.map((e, i) => (
          <li key={e.label} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <span className="truncate text-ink-700" title={e.label}>{e.label}</span>
            <span className="flex h-5 overflow-hidden rounded-md bg-ink-50" title={e.werte ? Object.entries(e.werte).map(([k, w]) => `${labels[k] || k}: ${format(w || 0)}`).join(" · ") : undefined}>
              {e.werte
                ? Object.entries(e.werte).map(([k, w]) => (w ? <span key={k} style={{ width: `${(w / max) * 100}%`, background: farben[k] || "#669933", opacity: hover == null || hover === i ? 1 : 0.6 }} /> : null))
                : <span style={{ width: `${Math.max(1, (summe(e) / max) * 100)}%`, background: e.farbe || "#669933" }} />}
            </span>
            <span className="ov-num min-w-[4.5rem] text-right font-bold text-ink-900">{format(summe(e))}</span>
          </li>
        ))}
      </ul>
      {eintraege.some((e) => e.werte) && <div className="mt-3"><Legende items={Object.keys(farben).map((k) => ({ label: labels[k] || k, farbe: farben[k] }))} /></div>}
    </div>
  );
}

/** Kleiner Ring (Quote 0–1) */
export function Ring({ quote, groesse = 56, label }) {
  const q = Math.max(0, Math.min(1, Number(quote) || 0));
  const r = groesse / 2 - 5;
  const u = 2 * Math.PI * r;
  return (
    <svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} role="img" aria-label={`${label || "Quote"} ${fmt(q * 100, 0)} %`}>
      <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth="6" />
      <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke={q >= 0.8 ? "#669933" : q >= 0.5 ? "#aed083" : "#f5a70f"} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${u * q} ${u}`} transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`} />
      <text x="50%" y="54%" textAnchor="middle" className="fill-ink-900 text-[12px] font-bold">{fmt(q * 100, 0)}%</text>
    </svg>
  );
}

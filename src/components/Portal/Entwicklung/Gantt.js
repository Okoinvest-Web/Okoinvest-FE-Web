"use client";

// Gantt-Ansicht der Meilensteine (eigene HTML/SVG-Komponente, ohne Bibliothek).
//  - Zoom Monat / Quartal / Jahr (Knöpfe, Tasten + und −), horizontal scrollbar, Namensspalte fixiert
//  - Soll als heller Rahmen, Ist bzw. Prognose als gefüllter Balken; kritischer Pfad dunkel umrandet und markiert,
//    Verzug rot (Verlängerung vom Soll-Ende bis heute), Heute-Linie, Abhängigkeiten als Linien (abschaltbar)
//  - Klick/Enter auf eine Zeile ruft onAuswahl(id) (Bearbeiten im Backoffice)

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui/cn";

const TAG = 86400e3;
const ZOOM = {
  monat: { label: "Monat", pxTag: 3.2 },
  quartal: { label: "Quartal", pxTag: 1.15 },
  jahr: { label: "Jahr", pxTag: 0.42 },
};
const ZOOM_IDS = Object.keys(ZOOM);
const ZEILE = 34;
const t = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).getTime();

export default function Gantt({ meilensteine = [], heute, onAuswahl, auswahl = null, kompakt = false }) {
  const [zoom, setZoom] = useState("quartal");
  const [nurKritisch, setNurKritisch] = useState(false);
  const [linien, setLinien] = useState(!kompakt);
  const scroller = useRef(null);
  const liste = useMemo(() => meilensteine.filter((m) => m.status !== "entfaellt" && (!nurKritisch || m.kritisch)), [meilensteine, nurKritisch]);
  const h = heute || new Date().toISOString().slice(0, 10);

  const { start, ende } = useMemo(() => {
    const werte = liste.flatMap((m) => [m.sollStart, m.sollEnde, m.istStart, m.istEnde, m.prognoseStart, m.prognoseEnde]).filter(Boolean).map(t);
    werte.push(t(h));
    const s = new Date(Math.min(...werte) - 20 * TAG);
    s.setUTCDate(1);
    const e = new Date(Math.max(...werte) + 45 * TAG);
    return { start: s.getTime(), ende: e.getTime() };
  }, [liste, h]);

  const px = ZOOM[zoom].pxTag;
  const x = (iso) => ((t(iso) - start) / TAG) * px;
  const breite = ((ende - start) / TAG) * px;

  // Achse: Monate (Monat/Quartal) bzw. Jahre
  const achse = useMemo(() => {
    const out = [];
    const d = new Date(start);
    while (d.getTime() < ende) {
      const iso = d.toISOString().slice(0, 10);
      const m = d.getUTCMonth();
      if (zoom === "monat") out.push({ iso, label: d.toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }) + (m === 0 ? ` ${d.getUTCFullYear()}` : ""), stark: m === 0 });
      else if (zoom === "quartal" && m % 3 === 0) out.push({ iso, label: `Q${m / 3 + 1}${m === 0 ? ` ${d.getUTCFullYear()}` : ""}`, stark: m === 0 });
      else if (zoom === "jahr" && m === 0) out.push({ iso, label: String(d.getUTCFullYear()), stark: true });
      d.setUTCMonth(m + 1);
    }
    return out;
  }, [start, ende, zoom]);

  // beim ersten Anzeigen und Zoomwechsel „heute“ in den sichtbaren Bereich scrollen
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, x(h) - el.clientWidth * 0.35);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, start]);

  useEffect(() => {
    const taste = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = ZOOM_IDS.indexOf(zoom);
      if (e.key === "+" && i > 0) setZoom(ZOOM_IDS[i - 1]);
      if (e.key === "-" && i < ZOOM_IDS.length - 1) setZoom(ZOOM_IDS[i + 1]);
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [zoom]);

  const zeileVon = new Map(liste.map((m, i) => [m.id, i]));
  const hoehe = liste.length * ZEILE;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Zeitmaßstab (Tasten + und −)" className="inline-flex items-center rounded-full bg-white p-1 ring-1 ring-ink-200/70">
          <button type="button" aria-label="Hineinzoomen" disabled={zoom === "monat"} onClick={() => setZoom(ZOOM_IDS[Math.max(0, ZOOM_IDS.indexOf(zoom) - 1)])} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-ink-50 disabled:opacity-40"><Plus aria-hidden="true" className="h-4 w-4" /></button>
          {ZOOM_IDS.map((z) => (
            <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)} className={cn("h-8 rounded-full px-3 text-[13px] font-semibold", zoom === z ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>{ZOOM[z].label}</button>
          ))}
          <button type="button" aria-label="Herauszoomen" disabled={zoom === "jahr"} onClick={() => setZoom(ZOOM_IDS[Math.min(ZOOM_IDS.length - 1, ZOOM_IDS.indexOf(zoom) + 1)])} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-ink-50 disabled:opacity-40"><Minus aria-hidden="true" className="h-4 w-4" /></button>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-ink-700 ring-1 ring-ink-200/70">
          <input type="checkbox" checked={nurKritisch} onChange={(e) => setNurKritisch(e.target.checked)} className="h-4 w-4 accent-navy-800" /> Nur kritischer Pfad
        </label>
        <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-ink-700 ring-1 ring-ink-200/70">
          <input type="checkbox" checked={linien} onChange={(e) => setLinien(e.target.checked)} className="h-4 w-4 accent-navy-800" /> Abhängigkeiten
        </label>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-600" aria-label="Legende">
          <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-ov-500" />Erledigt</li>
          <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-navy-600" />In Arbeit</li>
          <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-ink-300" />Geplant</li>
          <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm border border-dashed border-ink-400" />Soll</li>
          <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm ring-2 ring-navy-900" />Kritischer Pfad</li>
          <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-5 rounded-sm bg-red-500" />Verzug</li>
        </ul>
      </div>

      <div className="flex min-w-0 overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
        {/* Namensspalte */}
        <div className="w-[150px] shrink-0 border-r border-ink-100 sm:w-[260px]">
          <div className="flex h-9 items-center border-b border-ink-100 px-3 text-[12px] font-semibold uppercase tracking-wide text-ink-500">Meilenstein</div>
          <ul>
            {liste.map((m) => (
              <li key={m.id} style={{ height: ZEILE }} className={cn("flex items-center border-b border-ink-50 px-2", auswahl === m.id && "bg-ov-50")}>
                <button type="button" onClick={() => onAuswahl?.(m.id)} disabled={!onAuswahl} title={m.titel} className={cn("min-w-0 truncate rounded-lg px-1 text-left text-[12.5px] disabled:cursor-default", m.kritisch ? "font-bold text-navy-900" : "text-ink-800", m.ueberfaellig && "text-red-700", onAuswahl && "hover:underline")}>
                  {m.kritisch && <span className="sr-only">Kritischer Pfad: </span>}
                  {m.ueberfaellig && <span className="sr-only">Überfällig: </span>}
                  {m.titel}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Zeitachse */}
        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto" tabIndex={0} aria-label="Zeitachse, horizontal scrollbar">
          <div style={{ width: breite }} className="relative">
            <div className="relative h-9 border-b border-ink-100">
              {achse.map((a) => (
                <span key={a.iso} style={{ left: x(a.iso) }} className={cn("absolute top-0 flex h-full items-center whitespace-nowrap border-l pl-1.5 text-[11.5px]", a.stark ? "border-ink-300 font-semibold text-ink-700" : "border-ink-100 text-ink-500")}>{a.label}</span>
              ))}
            </div>
            <div className="relative" style={{ height: hoehe }}>
              {achse.map((a) => <span key={a.iso} aria-hidden="true" style={{ left: x(a.iso) }} className={cn("absolute inset-y-0 border-l", a.stark ? "border-ink-200" : "border-ink-50")} />)}
              {liste.map((m, i) => {
                const top = i * ZEILE;
                const sollL = m.sollStart ? x(m.sollStart) : null;
                const sollB = m.sollStart && m.sollEnde ? Math.max(3, x(m.sollEnde) - x(m.sollStart)) : 0;
                const s = m.status === "erledigt" ? m.istStart || m.sollStart : m.istStart || m.prognoseStart || m.sollStart;
                const e = m.status === "erledigt" ? m.istEnde || m.sollEnde : m.prognoseEnde || m.sollEnde;
                const l = s ? x(s) : 0;
                const b = s && e ? Math.max(4, x(e) - x(s)) : 0;
                const verzugL = m.ueberfaellig && m.sollEnde ? x(m.sollEnde) : null;
                const verzugB = verzugL !== null ? Math.max(3, x(h) - verzugL) : 0;
                const titel = `${m.titel}: Soll ${m.sollStart || "?"} – ${m.sollEnde || "?"}${m.istEnde ? `, erledigt ${m.istEnde}` : ""}${m.ueberfaellig ? `, ${m.verzugTage} Tage Verzug` : ""}${m.kritisch ? ", kritischer Pfad" : ""}`;
                return (
                  <div key={m.id} style={{ top, height: ZEILE }} className={cn("absolute inset-x-0 border-b border-ink-50", auswahl === m.id && "bg-ov-50/60")}>
                    {sollL !== null && <span aria-hidden="true" style={{ left: sollL, width: sollB }} className="absolute top-[7px] h-5 rounded-md border border-dashed border-ink-300" />}
                    {b > 0 && (
                      <span
                        role="img"
                        aria-label={titel}
                        title={titel}
                        onClick={() => onAuswahl?.(m.id)}
                        style={{ left: l, width: b }}
                        className={cn("absolute top-[10px] h-3.5 rounded-[4px]", onAuswahl && "cursor-pointer", m.status === "erledigt" ? "bg-ov-500" : m.status === "in_arbeit" ? "bg-navy-600" : "bg-ink-300", m.kritisch && "ring-2 ring-navy-900 ring-offset-1")}
                      />
                    )}
                    {verzugB > 0 && <span aria-hidden="true" style={{ left: verzugL, width: verzugB }} className="absolute top-[12px] h-2.5 rounded-r-[4px] bg-red-500" />}
                  </div>
                );
              })}
              {linien && (
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0" width={breite} height={hoehe}>
                  {liste.flatMap((m) =>
                    (m.nach || []).filter((v) => zeileVon.has(v)).map((v) => {
                      const vm = liste[zeileVon.get(v)];
                      const x1 = x(vm.status === "erledigt" ? vm.istEnde || vm.sollEnde : vm.prognoseEnde || vm.sollEnde);
                      const y1 = zeileVon.get(v) * ZEILE + ZEILE / 2;
                      const x2 = x(m.status === "erledigt" ? m.istStart || m.sollStart : m.prognoseStart || m.sollStart);
                      const y2 = zeileVon.get(m.id) * ZEILE + ZEILE / 2;
                      const kr = m.kritisch && vm.kritisch;
                      return <path key={`${v}-${m.id}`} d={`M${x1},${y1} H${Math.max(x1 + 4, x2 - 6)} V${y2} H${x2}`} fill="none" className={kr ? "stroke-navy-800" : "stroke-ink-300"} strokeWidth={kr ? 1.4 : 1} />;
                    })
                  )}
                </svg>
              )}
              <span aria-hidden="true" style={{ left: x(h) }} className="absolute inset-y-0 w-0.5 bg-sun-500" />
            </div>
            <span style={{ left: x(h) + 4 }} className="absolute top-1 rounded bg-sun-400 px-1 text-[10.5px] font-bold text-navy-950">heute</span>
          </div>
        </div>
      </div>
      {!liste.length && <p className="mt-3 text-[14px] text-ink-500">Keine Meilensteine für diese Auswahl.</p>}
    </div>
  );
}

"use client";

// src/components/diagramme/Rahmen.js
//
// Gemeinsamer Rahmen aller Diagramme des Chart-Systems:
//   DiagrammRahmen – Kopf (optional), Einlauf-Auslöser, Werkzeugleiste (Tabelle ↔ Diagramm, CSV, PNG), Legende,
//                    Textalternative und umschaltbare Datentabelle (WCAG 1.1.1 / 1.4.1).
//   Plot           – fokussierbare Zeichenfläche mit Fadenkreuz, Tooltip und Tastaturnavigation
//                    (← → Pos1 Ende Bild↑ Bild↓ Esc), Ansage der Werte über aria-live.
//   useBreite      – gemessene Breite (ResizeObserver) → Achsen in echten Pixeln, Schrift skaliert nie.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Download, ImageDown, Table2, ChartColumn } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { mitUebergang } from "@/components/ui/motion";
import { csvAus, dateiName, SCHRIFT } from "./skala";
import Legende from "./Legende";

/** Breite des Elements in px (Startwert für Server-HTML, danach gemessen). */
export function useBreite(standard = 720) {
  const ref = useRef(null);
  const [breite, setBreite] = useState(standard);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      if (w > 0) setBreite((alt) => (Math.abs(alt - w) >= 1 ? w : alt));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, breite];
}

function herunterladen(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** SVG als PNG (2×, weißer bzw. dunkler Grund, mit Titel). */
async function alsPng(svg, { titel, dunkel }) {
  const box = svg.getBoundingClientRect();
  const w = Math.round(box.width);
  const h = Math.round(box.height);
  const kopf = titel ? 36 : 12;
  const klon = svg.cloneNode(true);
  klon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  klon.setAttribute("width", w);
  klon.setAttribute("height", h);
  klon.querySelectorAll("[data-ohne-export]").forEach((n) => n.remove());
  const daten = new XMLSerializer().serializeToString(klon);
  const bild = new Image();
  bild.decoding = "async";
  await new Promise((ok, fehler) => {
    bild.onload = ok;
    bild.onerror = fehler;
    bild.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(daten)}`;
  });
  const f = 2;
  const c = document.createElement("canvas");
  c.width = (w + 24) * f;
  c.height = (h + kopf + 12) * f;
  const ctx = c.getContext("2d");
  ctx.scale(f, f);
  ctx.fillStyle = dunkel ? "#03122b" : "#ffffff";
  ctx.fillRect(0, 0, w + 24, h + kopf + 12);
  if (titel) {
    ctx.fillStyle = dunkel ? "#ffffff" : "#151a24";
    ctx.font = `700 15px ${SCHRIFT.familie}`;
    ctx.fillText(titel, 12, 24);
  }
  ctx.drawImage(bild, 12, kopf, w, h);
  await new Promise((ok) => c.toBlob((b) => (b && herunterladen(b, `${dateiName(titel)}.png`), ok()), "image/png"));
}

function Werkzeug({ icon: Icon, label, onClick, aktiv, dunkel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv === undefined ? undefined : aktiv}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ov-500",
        dunkel ? "text-white/75 hover:bg-white/10 hover:text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
        aktiv && (dunkel ? "bg-white/10 text-white" : "bg-ink-100 text-ink-900")
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );
}

/** Datentabelle (Alternative zum Diagramm). */
export function DatenTabelle({ tabelle, titel, dunkel }) {
  const rechts = new Set(tabelle.rechts ?? tabelle.kopf.map((_, i) => i).slice(1));
  return (
    <div className={cn("max-h-[22rem] overflow-auto rounded-2xl ring-1 ring-inset", dunkel ? "ring-white/10" : "ring-ink-200/70")} tabIndex={0} role="region" aria-label={`Datentabelle${titel ? `: ${titel}` : ""}`}>
      <table className="w-full min-w-max text-[13px]">
        {titel && <caption className="sr-only">{titel}</caption>}
        <thead className={cn("sticky top-0 z-[1]", dunkel ? "bg-[var(--ov-nacht-2)]" : "bg-sand-50")}>
          <tr>
            {tabelle.kopf.map((k, i) => (
              <th key={i} scope="col" className={cn("whitespace-nowrap px-3 py-2 text-[12px] font-semibold uppercase tracking-wide", dunkel ? "text-white/70" : "text-ink-500", rechts.has(i) ? "text-right" : "text-left")}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn("divide-y", dunkel ? "divide-white/10 text-white/85" : "divide-ink-100 text-ink-700")}>
          {tabelle.zeilen.map((z, j) => (
            <tr key={j} className={dunkel ? "hover:bg-white/5" : "hover:bg-ink-50"}>
              {z.map((v, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className={cn("whitespace-nowrap px-3 py-1.5 text-left font-medium", dunkel ? "text-white" : "text-ink-900")}>{v}</th>
                ) : (
                  <td key={i} className={cn("whitespace-nowrap px-3 py-1.5", rechts.has(i) && "ov-num text-right")}>{v}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Rahmen um ein Diagramm.
 *   titel, einheit, untertitel – optionaler Kopf (fehlt, wenn die umgebende Karte ihn trägt)
 *   beschreibung  – Kernaussage für Screenreader (Pflicht)
 *   tabelle       – { kopf: [], zeilen: [[]], csv?: { kopf, zeilen } (Rohzahlen), rechts?: [i] }
 *   legende       – [{ name, farbe, stil?: "flaeche"|"linie"|"strich"|"punkt", gestrichelt? }]
 *   werkzeuge     – Werkzeugleiste zeigen (Standard: ja, sobald eine Tabelle da ist)
 *   png           – PNG-Export anbieten (Standard: ja)
 */
export function DiagrammRahmen({ titel, einheit, untertitel, beschreibung, tabelle, legende, werkzeuge, png = true, dunkel = false, className, children, kopfAktion }) {
  const [ansicht, setAnsicht] = useState("diagramm");
  const ref = useRef(null);
  const id = useId();
  const mitWerkzeugen = werkzeuge ?? !!tabelle;
  const csv = useCallback(() => {
    if (!tabelle) return;
    herunterladen(new Blob([csvAus(tabelle.csv || tabelle)], { type: "text/csv;charset=utf-8" }), `${dateiName(titel || beschreibung)}.csv`);
  }, [tabelle, titel, beschreibung]);
  const bild = useCallback(() => {
    const svg = ref.current?.querySelector("svg[data-diagramm]");
    if (svg) alsPng(svg, { titel: titel || beschreibung, dunkel }).catch(() => {});
  }, [titel, beschreibung, dunkel]);

  return (
    <figure ref={ref} className={cn("ov-reveal min-w-0", className)} data-dir="ohne" aria-labelledby={titel ? `${id}-t` : undefined}>
      {(titel || kopfAktion) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {titel && (
              <p id={`${id}-t`} className={cn("font-display text-[16px] font-bold leading-snug", dunkel ? "text-white" : "text-ink-900")}>
                {titel}
                {einheit && <span className={cn("ml-1.5 text-[13px] font-semibold", dunkel ? "text-white/60" : "text-ink-500")}>in {einheit}</span>}
              </p>
            )}
            {untertitel && <p className={cn("mt-0.5 text-[13px]", dunkel ? "text-white/70" : "text-ink-500")}>{untertitel}</p>}
          </div>
          {kopfAktion}
        </div>
      )}
      <div className="min-w-0">
        {ansicht === "tabelle" && tabelle ? <DatenTabelle tabelle={tabelle} titel={titel || beschreibung} dunkel={dunkel} /> : children}
      </div>
      {(legende?.length > 0 || mitWerkzeugen) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {legende?.length > 0 ? <Legende eintraege={legende} dunkel={dunkel} /> : <span />}
          {mitWerkzeugen && (
            <div className="-mr-1.5 ml-auto flex items-center gap-0.5" role="toolbar" aria-label="Diagramm-Werkzeuge">
              {tabelle && (
                <Werkzeug
                  icon={ansicht === "tabelle" ? ChartColumn : Table2}
                  label={ansicht === "tabelle" ? "Diagramm" : "Tabelle"}
                  dunkel={dunkel}
                  onClick={() => mitUebergang(() => setAnsicht((a) => (a === "tabelle" ? "diagramm" : "tabelle")))}
                />
              )}
              {tabelle && <Werkzeug icon={Download} label="CSV" onClick={csv} dunkel={dunkel} />}
              {png && ansicht === "diagramm" && <Werkzeug icon={ImageDown} label="PNG" onClick={bild} dunkel={dunkel} />}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

/** Tooltip-Inhalt: Titel + Zeilen mit Farbmarke, Name, Wert. */
function TooltipInhalt({ titel, zeilen = [], fuss }) {
  return (
    <>
      {titel && <p className="mb-1 font-semibold text-white">{titel}</p>}
      {zeilen.map((z, i) => (
        <p key={i} className="flex items-center justify-between gap-4 leading-relaxed">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-white/75">
            {z.farbe && (
              <span
                aria-hidden="true"
                className={cn("inline-block shrink-0", z.stil === "linie" || z.stil === "strich" ? "h-[3px] w-3 rounded-full" : "h-2.5 w-2.5 rounded-[3px]")}
                style={{ background: z.farbe }}
              />
            )}
            <span className="truncate">{z.name}</span>
          </span>
          <span className="ov-num font-semibold text-white">{z.wert}</span>
        </p>
      ))}
      {fuss && <p className="mt-1 border-t border-white/15 pt-1 text-white/70">{fuss}</p>}
    </>
  );
}

/**
 * Interaktive Zeichenfläche.
 *   breite, hoehe   – Pixelmaße (viewBox = Pixel, Schrift unskaliert)
 *   anzahl          – Zahl der ansteuerbaren Datenpunkte
 *   indexAusPx(x,y) – Zeigerposition → Index (oder null)
 *   info(i)         – { x, y, titel, zeilen, fuss, ansage? } für Tooltip und Ansage
 *   fadenkreuz(i)   – zusätzliche SVG-Elemente für den aktiven Punkt (Linie, Marker)
 *   beschreibung    – Kernaussage (aria-label)
 *   onAktiv(i|null) – meldet den aktiven Index nach außen (z. B. Donut-Mitte)
 *   zeilenSchritt   – für Matrizen: ↑/↓ springen um eine Zeile (Heatmap)
 */
export function Plot({ breite, hoehe, anzahl, indexAusPx, info, fadenkreuz, beschreibung, dunkel = false, children, svgKlasse, zeilenSchritt = 1, onAktiv }) {
  const [aktiv, setAktiv] = useState(null);
  const [fokus, setFokus] = useState(false);
  const flaeche = useRef(null);
  const daten = aktiv != null && aktiv < anzahl ? info(aktiv) : null;

  useEffect(() => {
    if (aktiv != null && aktiv >= anzahl) setAktiv(null);
  }, [aktiv, anzahl]);
  const melden = useRef(onAktiv);
  melden.current = onAktiv;
  useEffect(() => {
    melden.current?.(aktiv);
  }, [aktiv]);

  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * breite;
    const y = ((e.clientY - box.top) / box.height) * hoehe;
    return indexAusPx(x, y);
  };
  const tasten = (e) => {
    if (!anzahl) return;
    const seite = Math.max(1, Math.round(anzahl / 10));
    const neu = {
      ArrowRight: (i) => Math.min(anzahl - 1, (i ?? -1) + 1),
      ArrowLeft: (i) => Math.max(0, (i ?? anzahl) - 1),
      ArrowUp: (i) => (zeilenSchritt > 1 ? Math.max(0, (i ?? 0) - zeilenSchritt) : Math.min(anzahl - 1, (i ?? -1) + 1)),
      ArrowDown: (i) => (zeilenSchritt > 1 ? Math.min(anzahl - 1, (i ?? -zeilenSchritt) + zeilenSchritt) : Math.max(0, (i ?? anzahl) - 1)),
      Home: () => 0,
      End: () => anzahl - 1,
      PageUp: (i) => Math.min(anzahl - 1, (i ?? -1) + seite),
      PageDown: (i) => Math.max(0, (i ?? anzahl) - seite),
    }[e.key];
    if (neu) {
      e.preventDefault();
      setAktiv((i) => neu(i));
    } else if (e.key === "Escape" && aktiv != null) {
      e.preventDefault();
      setAktiv(null);
    }
  };

  const ansage = daten ? daten.ansage ?? [daten.titel, ...(daten.zeilen || []).map((z) => `${z.name} ${z.wert}`), daten.fuss].filter(Boolean).join(", ") : "";
  const links = daten ? daten.x > breite * 0.58 : false;
  const oben = daten ? (daten.y ?? 0) > hoehe * 0.42 : false;

  return (
    <div className="relative min-w-0" style={{ height: hoehe }}>
      <div
        ref={flaeche}
        tabIndex={0}
        role="group"
        aria-roledescription="Diagramm"
        aria-label={`${beschreibung}. Mit den Pfeiltasten durch die Werte gehen.`}
        onKeyDown={tasten}
        onFocus={() => setFokus(true)}
        onBlur={() => {
          setFokus(false);
          setAktiv(null);
        }}
        className={cn("h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2", dunkel ? "focus-visible:ring-ov-300 focus-visible:ring-offset-navy-950" : "focus-visible:ring-ov-500")}
      >
        <svg
          data-diagramm=""
          width={breite}
          height={hoehe}
          viewBox={`0 0 ${breite} ${hoehe}`}
          aria-hidden="true"
          fontFamily={SCHRIFT.familie}
          className={cn("block max-w-full touch-pan-y select-none", svgKlasse)}
          onPointerMove={(e) => setAktiv(ausZeiger(e))}
          onPointerDown={(e) => setAktiv(ausZeiger(e))}
          onPointerLeave={(e) => e.pointerType === "mouse" && setAktiv(null)}
        >
          {children}
          {daten && fadenkreuz && fadenkreuz(aktiv) ? <g data-ohne-export="" pointerEvents="none">{fadenkreuz(aktiv)}</g> : null}
        </svg>
      </div>
      {daten && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-100 ease-ov-out motion-reduce:transition-none"
          style={{ transform: `translate(${Math.round(daten.x)}px, ${Math.round(Math.max(4, daten.y ?? 8))}px)` }}
        >
          <div
            className="w-max max-w-[15rem]"
            style={{ transform: `translate(${links ? "calc(-100% - 14px)" : "14px"}, ${oben ? "calc(-100% - 6px)" : "6px"})` }}
          >
            <div className="ov-tooltip rounded-xl bg-navy-950 px-3 py-2 text-[12.5px] shadow-e3 ring-1 ring-white/10">
              <TooltipInhalt titel={daten.titel} zeilen={daten.zeilen} fuss={daten.fuss} />
            </div>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {fokus ? ansage : ""}
      </p>
    </div>
  );
}

/** Kleine Hilfe: Breite messen + Plot zusammen (für Diagramme mit fester Höhe). */
export function useMessung(standard = 720) {
  const [ref, breite] = useBreite(standard);
  return useMemo(() => ({ ref, breite: Math.max(240, breite), schmal: breite < 520 }), [ref, breite]);
}

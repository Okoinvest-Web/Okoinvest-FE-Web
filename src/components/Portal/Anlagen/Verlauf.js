"use client";

// Diagramme Tag / Woche / Monat / Jahr (eigenes SVG, Tooltip per Zeiger und Tastatur) mit Soll-Ist.
//   Tag   – 15-Minuten-Werte: PV-Leistung (Fläche), Verbrauch (Linie), Speicher-Ladestand (gestrichelt, rechte Achse)
//   Woche – Stundenwerte, gleiche Darstellung
//   Monat – Tageswerte, Jahr – Monatswerte: Erzeugung als Säule (dunkel = vor Ort genutzt, hell = eingespeist),
//           Erwartung (Soll aus Region/kWp/Bauart) als Strich, Summe Ist/Soll
// Daten: /api/portal/anlagen/[id]/messdaten (Rechte prüft der Server). CSV-Export des gewählten Zeitraums.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Tooltip, useBreite } from "@/components/Rechner/bausteine";
import { kw, kwh } from "@/lib/plattform/anlagen";
import { pct } from "./teile";

const FARBE = { pv: "#669933", pvHell: "#cde3b1", eigen: "#436621", last: "#003473", soc: "#f5a70f", soll: "#151a24", netz: "#7fa7d6", raster: "#eef0f4" };
const BEREICHE = [
  { id: "tag", label: "Tag", aufloesung: "15min" },
  { id: "woche", label: "Woche", aufloesung: "1h" },
  { id: "monat", label: "Monat", aufloesung: "1d" },
  { id: "jahr", label: "Jahr", aufloesung: "1mon" },
];
const TZ = "Europe/Vienna";

function zeitraum(bereich, anker) {
  const d = new Date(anker);
  if (bereich === "tag") {
    const v = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return [v, new Date(v.getFullYear(), v.getMonth(), v.getDate() + 1)];
  }
  if (bereich === "woche") {
    const wt = (d.getDay() + 6) % 7;
    const v = new Date(d.getFullYear(), d.getMonth(), d.getDate() - wt);
    return [v, new Date(v.getFullYear(), v.getMonth(), v.getDate() + 7)];
  }
  if (bereich === "monat") {
    const v = new Date(d.getFullYear(), d.getMonth(), 1);
    return [v, new Date(v.getFullYear(), v.getMonth() + 1, 1)];
  }
  const v = new Date(d.getFullYear(), 0, 1);
  return [v, new Date(v.getFullYear() + 1, 0, 1)];
}

function verschieben(bereich, anker, r) {
  const d = new Date(anker);
  if (bereich === "tag") d.setDate(d.getDate() + r);
  else if (bereich === "woche") d.setDate(d.getDate() + 7 * r);
  else if (bereich === "monat") d.setMonth(d.getMonth() + r, 1);
  else d.setFullYear(d.getFullYear() + r, 0, 1);
  return d.getTime();
}

function titelText(bereich, von, bis) {
  const f = (d, o) => d.toLocaleDateString("de-DE", { timeZone: TZ, ...o });
  if (bereich === "tag") return f(von, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  if (bereich === "woche") return `${f(von, { day: "2-digit", month: "2-digit" })} – ${f(new Date(bis.getTime() - 1), { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  if (bereich === "monat") return f(von, { month: "long", year: "numeric" });
  return String(von.getFullYear());
}

export default function Verlauf({ anlage }) {
  const [bereich, setBereich] = useState("tag");
  const [anker, setAnker] = useState(null); // erst im Browser (Zeitzone des Nutzers, keine Hydration-Abweichung)
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(false);
  const def = BEREICHE.find((b) => b.id === bereich);
  useEffect(() => setAnker(Date.now()), []);
  const [von, bis] = useMemo(() => zeitraum(bereich, anker ?? 0), [bereich, anker]);
  const zukunft = von.getTime() > Date.now();
  const url = `/api/portal/anlagen/${anlage.id}/messdaten?von=${von.toISOString()}&bis=${bis.toISOString()}&aufloesung=${def.aufloesung}`;

  const holen = useCallback(async () => {
    if (anker == null) return;
    setLaedt(true);
    setFehler("");
    try {
      const r = await fetch(url, { cache: "no-store", credentials: "same-origin" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Fehler ${r.status}`);
      setDaten(j);
    } catch (e) {
      setFehler(e.message);
      setDaten(null);
    } finally {
      setLaedt(false);
    }
  }, [url, anker]);

  useEffect(() => {
    holen();
  }, [holen]);

  const punkte = useMemo(() => daten?.punkte || [], [daten]);
  const summe = useMemo(() => {
    const s = { erzeugung: 0, verbrauch: 0, netzbezug: 0, einspeisung: 0, eigen: 0, soll: 0 };
    for (const p of punkte) {
      s.erzeugung += p.erzeugungKwh || 0;
      s.verbrauch += p.verbrauchKwh || 0;
      s.netzbezug += p.netzbezugKwh || 0;
      s.einspeisung += p.einspeisungKwh || 0;
      s.eigen += p.eigenverbrauchKwh ?? Math.max(0, (p.verbrauchKwh || 0) - (p.netzbezugKwh || 0));
      s.soll += p.erwartetKwh || 0;
    }
    return s;
  }, [punkte]);
  const energie = bereich === "monat" || bereich === "jahr";

  return (
    <section aria-label="Verlauf" className="min-w-0 rounded-3xl bg-white ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
        <div role="group" aria-label="Zeitraum" className="flex rounded-full bg-sand-50 p-1 ring-1 ring-inset ring-ink-200">
          {BEREICHE.map((b) => (
            <button key={b.id} type="button" aria-pressed={bereich === b.id} onClick={() => setBereich(b.id)} className={cn("h-9 rounded-full px-3.5 text-[13.5px] font-semibold", bereich === b.id ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-white")}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setAnker(verschieben(bereich, anker, -1))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100" aria-label="Zurück">
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="min-w-[9rem] text-center text-[14px] font-semibold text-ink-900" aria-live="polite">{anker == null ? "" : titelText(bereich, von, bis)}</p>
          <button type="button" disabled={anker == null || bis.getTime() > Date.now()} onClick={() => setAnker(verschieben(bereich, anker, 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 disabled:opacity-30" aria-label="Weiter">
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setAnker(Date.now())} className="ml-1 h-9 rounded-full px-3 text-[13px] font-semibold text-ov-700 hover:bg-ov-50">Heute</button>
        </div>
      </div>
      <div className="px-2 pb-2 pt-3 md:px-3">
        {anker == null ? (
          <div className="m-3 h-[230px] animate-pulse rounded-2xl bg-ink-50 md:h-[280px]" aria-hidden="true" />
        ) : fehler ? (
          <p role="alert" className="m-3 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800 ring-1 ring-red-200">{fehler}</p>
        ) : zukunft ? (
          <p className="m-3 text-[14px] text-ink-500">Für diesen Zeitraum gibt es noch keine Werte.</p>
        ) : !punkte.length && !laedt ? (
          <p className="m-3 text-[14px] text-ink-500">Keine Messwerte in diesem Zeitraum.</p>
        ) : energie ? (
          <Saeulen punkte={punkte} bereich={bereich} laedt={laedt} mitPv={anlage.kwp > 0} />
        ) : (
          <Linien punkte={punkte} bereich={bereich} laedt={laedt} mitPv={anlage.kwp > 0} mitSpeicher={anlage.speicherKwh > 0} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-ink-100 bg-ink-100 sm:grid-cols-3 lg:grid-cols-6">
        {anlage.kwp > 0 && <Summe label="Erzeugung" wert={kwh(summe.erzeugung)} />}
        <Summe label="Verbrauch" wert={kwh(summe.verbrauch)} />
        {anlage.kwp > 0 && <Summe label="Eigenverbrauchsquote" wert={pct(summe.erzeugung ? summe.eigen / summe.erzeugung : null)} />}
        {anlage.kwp > 0 && <Summe label="Autarkie" wert={pct(summe.verbrauch ? summe.eigen / summe.verbrauch : null)} />}
        <Summe label="Netzbezug" wert={kwh(summe.netzbezug)} />
        <Summe label="Einspeisung" wert={kwh(summe.einspeisung)} />
      </div>
      {energie && anlage.kwp > 0 && summe.soll > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-4 md:px-6">
          <p className="text-[14px] text-ink-700">
            <span className="font-semibold text-ink-900">Soll-Ist:</span> Ist {kwh(summe.erzeugung)} · Soll {kwh(summe.soll)} ·{" "}
            <span className={cn("font-bold", summe.erzeugung / summe.soll < 0.9 ? "text-red-700" : "text-ov-700")}>{pct(summe.erzeugung / summe.soll)}</span>
            <span className="text-ink-500"> (Soll aus Region, kWp und Bauart, Monatsverteilung nach PVGIS; wetterbedingte Abweichungen von ± 10 % sind normal)</span>
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-5 py-3 text-[12.5px] text-ink-500 md:px-6">
        <span>Monitoring-Werte (MQTT) – nicht abrechnungsrelevant. Maßgeblich sind die geeichten Zähler.</span>
        <a href={`${url}&format=csv`} className="inline-flex items-center gap-1.5 font-semibold text-ov-700 hover:text-ov-800">
          <Download aria-hidden="true" className="h-4 w-4" /> CSV
        </a>
      </div>
    </section>
  );
}

function Summe({ label, wert }) {
  return (
    <div className="min-w-0 bg-white px-5 py-3">
      <p className="text-[12px] text-ink-500">{label}</p>
      <p className="ov-num truncate text-[15.5px] font-bold text-ink-900">{wert}</p>
    </div>
  );
}

const zeitLabel = (iso, bereich) => {
  const d = new Date(iso);
  if (bereich === "tag") return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (bereich === "woche") return d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (bereich === "monat") return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: TZ });
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
};

function useZeiger(n, W, P) {
  const [hover, setHover] = useState(null);
  const band = (W - P.l - P.r) / Math.max(1, n);
  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)));
  };
  const tasten = (e) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };
  return { hover, setHover, band, ausZeiger, tasten };
}

function Linien({ punkte, bereich, laedt, mitPv, mitSpeicher }) {
  const [ref, W] = useBreite(720);
  const schmal = W < 520;
  const H = schmal ? 230 : 280;
  const P = { l: 48, r: mitSpeicher ? 36 : 12, t: 14, b: 28 };
  const n = punkte.length;
  const { hover, setHover, band, ausZeiger, tasten } = useZeiger(n, W, P);
  const maxRoh = Math.max(1, ...punkte.map((p) => Math.max(p.pvKw || 0, p.verbrauchKw || 0)));
  const schritt = [1, 2, 5, 10, 20, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000].find((s) => maxRoh / s <= 5) || 10000;
  const max = Math.ceil(maxRoh / schritt) * schritt;
  const x = (i) => P.l + (i + 0.5) * band;
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const ySoc = (v) => P.t + (1 - v / 100) * (H - P.t - P.b);
  const pfad = (f) => punkte.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(f(p) || 0).toFixed(1)}`).join("");
  const flaeche = mitPv && n ? `${pfad((p) => p.pvKw)}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += schritt) ticks.push(v);
  const labelJede = Math.max(1, Math.ceil(n / (schmal ? 4 : 8)));
  const a = hover != null ? punkte[hover] : null;
  const maxP = punkte.reduce((m, p, i) => ((p.pvKw || 0) > (punkte[m]?.pvKw || 0) ? i : m), 0);

  return (
    <div ref={ref} className={cn("relative", laedt && "opacity-60")}>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
        role="img"
        tabIndex={0}
        onKeyDown={tasten}
        aria-label={`Leistungsverlauf (${bereich === "tag" ? "15 Minuten" : "Stunden"}): ${mitPv ? `Höchste PV-Leistung ${kw(punkte[maxP]?.pvKw)} um ${punkte[maxP] ? zeitLabel(punkte[maxP].ts, bereich) : "–"}. ` : ""}Pfeiltasten zeigen einzelne Werte.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">{v >= 1000 ? `${(v / 1000).toLocaleString("de-DE")} MW` : `${v} kW`}</text>
          </g>
        ))}
        {mitSpeicher && [0, 50, 100].map((v) => (
          <text key={v} x={W - P.r + 4} y={ySoc(v) + 4} className="fill-sun-500 text-[10px]">{v} %</text>
        ))}
        {flaeche && <path d={flaeche} fill={FARBE.pv} opacity="0.28" />}
        {mitPv && <path d={pfad((p) => p.pvKw)} fill="none" stroke={FARBE.pv} strokeWidth="2" strokeLinejoin="round" />}
        <path d={pfad((p) => p.verbrauchKw)} fill="none" stroke={FARBE.last} strokeWidth="1.8" strokeLinejoin="round" />
        {mitSpeicher && <path d={punkte.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${ySoc(p.speicherSocPct || 0).toFixed(1)}`).join("")} fill="none" stroke={FARBE.soc} strokeWidth="1.6" strokeDasharray="4 3" />}
        {punkte.map((p, i) =>
          i % labelJede === 0 ? (
            <text key={p.ts} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
              {bereich === "tag" ? zeitLabel(p.ts, "tag") : new Date(p.ts).toLocaleDateString("de-DE", { weekday: "short", timeZone: TZ })}
            </text>
          ) : null
        )}
        {a && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#97a0b0" strokeDasharray="3 3" />}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} onClick={(e) => setHover(ausZeiger(e))} />
      </svg>
      {a && (
        <Tooltip x={x(hover)} y={Math.max(0, y(Math.max(a.pvKw || 0, a.verbrauchKw || 0)) - 40)} breite={W}>
          <p className="font-semibold">{zeitLabel(a.ts, bereich)}</p>
          {mitPv && <p className="text-white/70">PV <span className="ov-num font-semibold text-white">{kw(a.pvKw)}</span></p>}
          <p className="text-white/70">Verbrauch <span className="ov-num font-semibold text-white">{kw(a.verbrauchKw)}</span></p>
          {(a.netzbezugKw || 0) > 0.05 ? (
            <p className="text-white/70">Netzbezug <span className="ov-num font-semibold text-white">{kw(a.netzbezugKw)}</span></p>
          ) : (
            <p className="text-white/70">Einspeisung <span className="ov-num font-semibold text-white">{kw(a.einspeisungKw)}</span></p>
          )}
          {mitSpeicher && <p className="text-white/70">Speicher <span className="ov-num font-semibold text-sun-300">{Math.round(a.speicherSocPct || 0)} %</span></p>}
          {a.fehlercode && <p className="text-sun-300">{a.fehlercode}</p>}
        </Tooltip>
      )}
      <Legende items={[mitPv && { farbe: FARBE.pv, label: "PV-Leistung" }, { farbe: FARBE.last, label: "Verbrauch" }, mitSpeicher && { farbe: FARBE.soc, label: "Speicher-Ladestand", strich: true }].filter(Boolean)} />
    </div>
  );
}

function Saeulen({ punkte, bereich, laedt, mitPv }) {
  const [ref, W] = useBreite(720);
  const schmal = W < 520;
  const H = schmal ? 230 : 280;
  const P = { l: 56, r: 12, t: 14, b: 28 };
  const n = punkte.length;
  const { hover, setHover, band, ausZeiger, tasten } = useZeiger(n, W, P);
  const wert = (p) => (mitPv ? p.erzeugungKwh || 0 : p.verbrauchKwh || 0);
  const maxRoh = Math.max(1, ...punkte.map((p) => Math.max(wert(p), p.erwartetKwh || 0)));
  const basis = 10 ** Math.floor(Math.log10(maxRoh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * basis).find((s) => maxRoh / s <= 5) || basis * 10;
  const max = Math.ceil(maxRoh / schritt) * schritt;
  const bw = Math.max(2, band * (bereich === "jahr" ? 0.62 : 0.7));
  const x = (i) => P.l + i * band + (band - bw) / 2;
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const ticks = [];
  for (let v = 0; v <= max + 1e-9; v += schritt) ticks.push(v);
  const labelJede = bereich === "jahr" ? (schmal ? 2 : 1) : schmal ? 7 : 3;
  const a = hover != null ? punkte[hover] : null;
  const eigen = (p) => p.eigenverbrauchKwh ?? Math.max(0, (p.verbrauchKwh || 0) - (p.netzbezugKwh || 0));

  return (
    <div ref={ref} className={cn("relative", laedt && "opacity-60")}>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
        role="img"
        tabIndex={0}
        onKeyDown={tasten}
        aria-label={`${mitPv ? "Erzeugung" : "Verbrauch"} je ${bereich === "jahr" ? "Monat" : "Tag"} mit Erwartung. Pfeiltasten zeigen einzelne Werte.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">{kwh(v).replace(" kWh", "")}</text>
          </g>
        ))}
        {punkte.map((p, i) => {
          const g = wert(p);
          const e = mitPv ? Math.min(g, eigen(p)) : 0;
          return (
            <g key={p.ts} opacity={hover == null || hover === i ? 1 : 0.55}>
              <rect x={x(i)} y={y(g)} width={bw} height={Math.max(0, y(0) - y(g))} rx={Math.min(3, bw / 3)} fill={mitPv ? FARBE.pvHell : FARBE.last} />
              {mitPv && <rect x={x(i)} y={y(e)} width={bw} height={Math.max(0, y(0) - y(e))} fill={FARBE.eigen} />}
              {p.erwartetKwh > 0 && <line x1={x(i) - 2} x2={x(i) + bw + 2} y1={y(p.erwartetKwh)} y2={y(p.erwartetKwh)} stroke={FARBE.soll} strokeWidth="2" />}
            </g>
          );
        })}
        {punkte.map((p, i) =>
          i % labelJede === 0 ? (
            <text key={`l${p.ts}`} x={x(i) + bw / 2} y={H - 8} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
              {bereich === "jahr" ? new Date(p.ts).toLocaleDateString("de-DE", { month: "short", timeZone: "UTC" }) : new Date(p.ts).toLocaleDateString("de-DE", { day: "numeric", timeZone: "UTC" })}
            </text>
          ) : null
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} onClick={(e) => setHover(ausZeiger(e))} />
      </svg>
      {a && (
        <Tooltip x={x(hover) + bw / 2} y={Math.max(0, y(Math.max(wert(a), a.erwartetKwh || 0)) - 40)} breite={W}>
          <p className="font-semibold">{zeitLabel(a.ts, bereich)}</p>
          {mitPv && <p className="text-white/70">Erzeugung <span className="ov-num font-semibold text-white">{kwh(a.erzeugungKwh)}</span></p>}
          {mitPv && <p className="text-white/70">davon vor Ort <span className="ov-num font-semibold text-ov-300">{kwh(Math.min(a.erzeugungKwh || 0, eigen(a)))}</span></p>}
          <p className="text-white/70">Verbrauch <span className="ov-num font-semibold text-white">{kwh(a.verbrauchKwh)}</span></p>
          <p className="text-white/70">Netzbezug <span className="ov-num font-semibold text-white">{kwh(a.netzbezugKwh)}</span></p>
          <p className="text-white/70">Einspeisung <span className="ov-num font-semibold text-white">{kwh(a.einspeisungKwh)}</span></p>
          {a.erwartetKwh > 0 && (
            <p className="text-white/70">
              Soll <span className="ov-num font-semibold text-white">{kwh(a.erwartetKwh)}</span> · Ist/Soll <span className="ov-num font-semibold text-white">{pct((a.erzeugungKwh || 0) / a.erwartetKwh)}</span>
            </p>
          )}
        </Tooltip>
      )}
      <Legende
        items={[
          mitPv && { farbe: FARBE.eigen, label: "Erzeugung vor Ort genutzt" },
          mitPv && { farbe: FARBE.pvHell, label: "eingespeist" },
          !mitPv && { farbe: FARBE.last, label: "Verbrauch" },
          mitPv && { farbe: FARBE.soll, label: "Erwartung (Soll)", strich: true },
        ].filter(Boolean)}
      />
    </div>
  );
}

function Legende({ items }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-3 text-[12px] text-ink-600">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("inline-block", i.strich ? "h-0.5 w-4" : "h-2.5 w-2.5 rounded-sm")} style={{ background: i.farbe }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowDownRight, ArrowUpRight, Leaf, Sun, Wind, Gauge, RefreshCw } from "lucide-react";
import { LiveDot } from "@/components/ui/LiveTicker";
import useLiveDaten from "./useLiveDaten";
import { preisTage, zeitfenster, ct, gw, uhr, spanne, zahl } from "./berechnung";

/**
 * Live-Kennzahlen im dunklen Seitenkopf: Börsenpreis jetzt (Hero-Zahl) mit
 * Tagesverlauf-Sparkline, Tagestief/-hoch, Erneuerbare, Solar, Wind, Last.
 */
export default function LiveKennzahlen({ initial }) {
  const { daten, jetzt } = useLiveDaten(initial);
  const tage = useMemo(() => preisTage(daten.preis, jetzt), [daten.preis, jetzt]);
  const e = daten.erzeugung || {};
  const heute = tage.heute;
  const aktuell = tage.aktuell;
  const fenster = useMemo(() => (heute ? zeitfenster(heute.punkte, 180, tage.schrittMs).guenstig : null), [heute, tage.schrittMs]);

  const nachts = e.solarMw != null && e.solarMw < 100;
  const eeAnteil = e.eeAnteil != null ? Math.round(e.eeAnteil) : null;

  // Position des aktuellen Preises innerhalb der Tagesspanne (0–1)
  const lage = heute && aktuell && heute.max.eurMwh > heute.min.eurMwh
    ? (aktuell.eurMwh - heute.min.eurMwh) / (heute.max.eurMwh - heute.min.eurMwh)
    : null;
  const einordnung = lage == null ? null : lage < 0.33 ? "eher günstig" : lage > 0.66 ? "eher teuer" : "mittleres Niveau";

  return (
    <div className="ov-hero-in mt-12 grid gap-4 lg:grid-cols-[1.25fr_1fr]" style={{ "--ov-delay": "300ms" }}>
      {/* Börsenpreis jetzt */}
      <div className="ov-glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <p className="flex items-center gap-2 font-semibold uppercase tracking-[0.14em] text-ov-300">
            <LiveDot />
            Live
            <span className="font-normal normal-case tracking-normal text-white/60">
              · Stand {daten.stand ? uhr(Date.parse(daten.stand)) : "–"} Uhr
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-white/50">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            aktualisiert alle 5 Min.
          </p>
        </div>

        <p className="mt-6 text-[15px] text-white/70">Börsenstrompreis jetzt</p>
        {aktuell ? (
          <>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-display font-extrabold leading-none tracking-tight text-white">
              <span className="text-[clamp(3.25rem,2.4rem+3.6vw,5.25rem)]">{ct(aktuell.eurMwh)}</span>
              <span className="text-[clamp(1.1rem,0.9rem+0.8vw,1.5rem)] font-bold text-white/70">ct/kWh</span>
            </p>
            <p className="mt-3 text-[14px] text-white/60">
              {spanne(aktuell.t, aktuell.t + tage.schrittMs)} · Day-Ahead, netto
              {einordnung && (
                <>
                  {" · "}
                  <span className={lage < 0.33 ? "font-semibold text-ov-300" : lage > 0.66 ? "font-semibold text-sun-300" : "text-white/80"}>{einordnung}</span> für heute
                </>
              )}
            </p>
          </>
        ) : (
          <p className="mt-2 max-w-md text-[16px] leading-relaxed text-white/75">
            Der aktuelle Börsenpreis ist gerade nicht abrufbar. Die Anzeige aktualisiert sich automatisch.
          </p>
        )}

        {heute && <Sparkline tag={heute} jetzt={jetzt} schrittMs={tage.schrittMs} fenster={fenster} aktuell={aktuell} />}

        {heute && (
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            <div>
              <dt className="flex items-center gap-1.5 text-[12.5px] text-white/55">
                <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
                Tagestief
              </dt>
              <dd className="mt-1 font-display text-[20px] font-extrabold text-white sm:text-[24px]">{ct(heute.min.eurMwh)} ct</dd>
              <dd className="text-[12.5px] text-white/55">um {uhr(heute.min.t)} Uhr</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[12.5px] text-white/55">
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-sun-300" />
                Tageshoch
              </dt>
              <dd className="mt-1 font-display text-[20px] font-extrabold text-white sm:text-[24px]">{ct(heute.max.eurMwh)} ct</dd>
              <dd className="text-[12.5px] text-white/55">um {uhr(heute.max.t)} Uhr</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-white/55">Ø heute</dt>
              <dd className="mt-1 font-display text-[20px] font-extrabold text-white sm:text-[24px]">{ct(heute.avg)} ct</dd>
              <dd className="text-[12.5px] text-white/55">{heute.negativStunden > 0 ? `${zahl(heute.negativStunden, heute.negativStunden % 1 ? 2 : 0)} h negativ` : "je kWh netto"}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Erzeugung */}
      <div className="grid grid-cols-2 gap-4">
        <Kachel
          icon={Leaf}
          farbe="text-ov-300"
          label="Erneuerbare"
          wert={eeAnteil != null ? `${eeAnteil} %` : "–"}
          sub={eeAnteil != null && eeAnteil > 100 ? "über 100 %: Überschuss" : "Anteil am Verbrauch"}
        >
          {eeAnteil != null && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full rounded-full bg-ov-400 transition-[width] duration-700" style={{ width: `${Math.min(eeAnteil, 100)}%` }} />
            </div>
          )}
        </Kachel>
        <Kachel
          icon={Sun}
          farbe="text-sun-300"
          label="Solar"
          wert={e.solarMw != null ? `${gw(e.solarMw)} GW` : "–"}
          sub={nachts ? "nachts keine Erzeugung" : e.solarAnteil != null ? `${Math.round(e.solarAnteil)} % des Verbrauchs` : "Einspeisung jetzt"}
        />
        <Kachel icon={Wind} farbe="text-navy-200" label="Wind" wert={e.windMw != null ? `${gw(e.windMw)} GW` : "–"} sub="an Land und auf See" />
        <Kachel icon={Gauge} farbe="text-white/80" label="Verbrauch" wert={e.lastMw != null ? `${gw(e.lastMw)} GW` : "–"} sub="Netzlast Deutschland" />
        <p className="col-span-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[12.5px] text-white/50">
          <span>Erzeugung: Stand {e.zeitpunkt ? `${uhr(e.zeitpunkt)} Uhr` : "–"}</span>
          <a href="#preisverlauf" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-white/80 hover:text-white">
            Zum Tagesverlauf
            <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </div>
  );
}

function Kachel({ icon: Icon, farbe, label, wert, sub, children }) {
  return (
    <div className="ov-glass flex flex-col rounded-3xl p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[13.5px] text-white/65">
        <Icon aria-hidden="true" className={`h-4 w-4 ${farbe}`} />
        {label}
      </p>
      <p className="mt-auto pt-6 font-display text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-extrabold leading-none tracking-tight text-white">{wert}</p>
      <p className="mt-2 text-[12.5px] leading-snug text-white/55">{sub}</p>
      {children}
    </div>
  );
}

/** Tagesverlauf im Kleinformat (Deko, Werte stehen daneben und im Diagramm) */
function Sparkline({ tag, jetzt, schrittMs, fenster, aktuell }) {
  const W = 600;
  const H = 84;
  const werte = tag.punkte.map((p) => p.eurMwh);
  const lo = Math.min(0, ...werte);
  const hi = Math.max(...werte, lo + 1);
  const x = (t) => ((t - tag.start) / (tag.ende - tag.start)) * W;
  const y = (v) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 12);
  let d = "";
  tag.punkte.forEach((p, i) => {
    d += `${i ? "L" : "M"}${x(p.t + schrittMs / 2).toFixed(1)},${y(p.eurMwh).toFixed(1)}`;
  });
  const jx = jetzt >= tag.start && jetzt < tag.ende ? x(jetzt) : null;

  return (
    <div className="mt-6" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[84px] w-full overflow-visible">
        {fenster && <rect x={x(fenster.start)} y="0" width={x(fenster.ende) - x(fenster.start)} height={H} fill="rgba(140,186,88,0.18)" rx="4" />}
        {lo < 0 && <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        <path d={`${d}L${W},${H}L0,${H}Z`} fill="rgba(255,255,255,0.06)" />
        <path d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {jx != null && <line x1={jx} x2={jx} y1="0" y2={H} stroke="#ffc53d" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="relative mt-2 flex justify-between text-[11.5px] text-white/45">
        <span>0 Uhr</span>
        {fenster && <span className="text-ov-300">Günstigste 3 h: {spanne(fenster.start, fenster.ende)}</span>}
        <span>24 Uhr</span>
      </div>
      {jx != null && aktuell && (
        <span className="sr-only">Aktueller Preis {ct(aktuell.eurMwh)} ct/kWh</span>
      )}
    </div>
  );
}

"use client";

import Link from "@/components/Land/Link";
import { ArrowUpRight, BatteryCharging, Leaf, Sun } from "lucide-react";
import useEnergyLive, { fmtCt, fmtGw, fmtUhr } from "@/components/ui/useEnergyLive";
import { LiveDot } from "@/components/ui/LiveTicker";
import { cn } from "@/components/ui/cn";
import { pfad } from "@/lib/land";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useSeitenLand } from "@/components/Land/LandKontext";

/** Sprachmodell: Texte (Zahlen über fmtCt/fmtGw mit Sprache). */
const TEXTE = {
  de: {
    sprache: "de",
    negativ: { titel: "Speicher laden, Last vorziehen", text: "Der Börsenpreis ist negativ – Abregeln und Laden lohnt sich." },
    guenstig: { titel: "Speicher laden, Last vorziehen", text: "Strom ist gerade deutlich günstiger als im Tagesmittel." },
    teuer: { titel: "Speicher entladen, Last verschieben", text: "Strom ist gerade deutlich teurer als im Tagesmittel." },
    normal: { titel: "Normalbetrieb nach Fahrplan", text: "Der Preis liegt nahe am Tagesmittel." },
    live: (l) => `Live · Strommarkt ${l}`,
    stand: (u) => `Stand ${u} Uhr`,
    laedt: "wird geladen …",
    jetzt: "Börsenpreis jetzt",
    schnitt: (v) => `Ø heute ${v} ct/kWh · Day-Ahead, netto`,
    da: "Day-Ahead, netto",
    solar: "Solar",
    ee: "Erneuerbare",
    signal: "Signal der Leitwarte (vereinfacht)",
    lade: "Live-Daten werden geladen",
    link: "Strommarkt live ansehen",
  },
  en: {
    sprache: "en",
    negativ: { titel: "Charge storage, bring load forward", text: "The exchange price is negative – curtailing and charging pay off." },
    guenstig: { titel: "Charge storage, bring load forward", text: "Power is currently much cheaper than the daily average." },
    teuer: { titel: "Discharge storage, shift load", text: "Power is currently much more expensive than the daily average." },
    normal: { titel: "Normal operation according to schedule", text: "The price is close to the daily average." },
    live: (l) => `Live · power market ${l}`,
    stand: (u) => `As of ${u}`,
    laedt: "loading …",
    jetzt: "Exchange price now",
    schnitt: (v) => `Avg. today ${v} ct/kWh · day-ahead, net`,
    da: "Day-ahead, net",
    solar: "Solar",
    ee: "Renewables",
    signal: "Control centre signal (simplified)",
    lade: "Loading live data",
    link: "View the power market live",
  },
};

/**
 * Live-Kennzahl für das virtuelle Kraftwerk: Börsenpreis jetzt im Verhältnis
 * zum Tagesmittel → vereinfachtes „Leitwarten-Signal" (laden / normal / entladen).
 * Rendert serverseitig einen ruhigen Platzhalter gleicher Höhe.
 * initial: Server-Schnappschuss (getEnergySnapshot, ohne Zeitreihen) für sofortige Anzeige
 * dunkel: für Navy-Flächen (Hero)
 */
export default function VppLiveSignal({ initial = null, dunkel = true, className }) {
  const w = useTexte(TEXTE);
  const land = useSeitenLand();
  const landKuerzel = land === "AT" || land === "CH" ? land : "DE";
  const d = useEnergyLive() || initial;
  const p = d?.preis?.aktuell;
  const avg = d?.preis?.heute?.avg;
  const e = d?.erzeugung;

  let signal = null;
  if (p && avg != null) {
    const abstand = p.eurMwh - avg;
    const schwelle = Math.max(Math.abs(avg) * 0.15, 10); // ≥ 1 ct/kWh Abstand
    if (p.eurMwh < 0) signal = { ton: "gruen", ...w.negativ };
    else if (abstand < -schwelle) signal = { ton: "gruen", ...w.guenstig };
    else if (abstand > schwelle) signal = { ton: "sonne", ...w.teuer };
    else signal = { ton: "neutral", ...w.normal };
  }

  const text = dunkel ? "text-white" : "text-ink-900";
  const sub = dunkel ? "text-white/60" : "text-ink-500";

  return (
    <div className={cn("rounded-3xl p-5 sm:p-6", dunkel ? "ov-glass" : "bg-white ring-1 ring-ink-200/70", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
        <p className={cn("flex items-center gap-2 font-semibold uppercase tracking-[0.14em]", dunkel ? "text-ov-300" : "text-ov-700")}>
          <LiveDot />
          {w.live(landKuerzel)}
        </p>
        <p className={sub}>{d?.stand ? w.stand(fmtUhr(d.stand)) : w.laedt}</p>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className={cn("text-[13.5px]", sub)}>{w.jetzt}</p>
          <p className={cn("mt-1 font-display text-[clamp(2.2rem,1.8rem+1.6vw,3rem)] font-extrabold leading-none tracking-tight", text)}>
            <span className="ov-num">{p ? fmtCt(p.eurMwh, 1, w.sprache) : "–"}</span>
            <span className={cn("ml-1.5 text-[16px] font-bold", sub)}>ct/kWh</span>
          </p>
          <p className={cn("mt-2 text-[12.5px]", sub)}>{avg != null ? w.schnitt(fmtCt(avg, 1, w.sprache)) : w.da}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className={cn("rounded-2xl p-3", dunkel ? "bg-white/[0.06]" : "bg-sand-50")}>
            <dt className={cn("flex items-center gap-1.5 text-[12px]", sub)}>
              <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-400" /> {w.solar}
            </dt>
            <dd className={cn("mt-1 font-display text-[19px] font-extrabold", text)}>{e?.solarMw != null ? `${fmtGw(e.solarMw, w.sprache)} GW` : "–"}</dd>
          </div>
          <div className={cn("rounded-2xl p-3", dunkel ? "bg-white/[0.06]" : "bg-sand-50")}>
            <dt className={cn("flex items-center gap-1.5 text-[12px]", sub)}>
              <Leaf aria-hidden="true" className="h-3.5 w-3.5 text-ov-400" /> {w.ee}
            </dt>
            <dd className={cn("mt-1 font-display text-[19px] font-extrabold", text)}>{e?.eeAnteil != null ? `${Math.round(e.eeAnteil)} %` : "–"}</dd>
          </div>
        </dl>
      </div>

      <div
        className={cn(
          "mt-5 flex items-start gap-3 rounded-2xl p-4",
          !signal && (dunkel ? "bg-white/[0.04]" : "bg-ink-50"),
          signal?.ton === "gruen" && "bg-ov-500/20 ring-1 ring-ov-400/40",
          signal?.ton === "sonne" && "bg-sun-400/15 ring-1 ring-sun-400/40",
          signal?.ton === "neutral" && (dunkel ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-ink-50 ring-1 ring-ink-200")
        )}
        aria-live="polite"
      >
        <BatteryCharging aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", signal?.ton === "sonne" ? "text-sun-400" : dunkel ? "text-ov-300" : "text-ov-600")} />
        <div className="min-w-0">
          <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", sub)}>{w.signal}</p>
          <p className={cn("mt-1 font-display text-[16.5px] font-bold leading-snug", text)}>{signal ? signal.titel : w.lade}</p>
          {signal && <p className={cn("mt-1 text-[13.5px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{signal.text}</p>}
        </div>
      </div>

      <Link href={pfad("/energie-live")} className={cn("mt-4 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold", dunkel ? "text-white/80 hover:text-white" : "text-ov-700 hover:text-ov-800")}>
        {w.link} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

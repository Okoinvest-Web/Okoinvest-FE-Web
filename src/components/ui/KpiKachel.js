import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "./cn";
import CountUp from "./CountUp";
import Sparkline from "./Sparkline";
import Skeleton from "./Skeleton";

/**
 * KPI-Kachel des Design-Systems 2.0 – eine Zahl, die führt.
 * Server-Komponente (Zähler und Sparkline animieren clientseitig/per CSS).
 *
 * label        Was gemessen wird („Erzeugung heute“)
 * wert         Zahl (zählt hoch) oder fertiger String („1,2 Mio. €“)
 * einheit      „kWh“, „%“, „MWp“ – kleiner neben der Zahl
 * stellen      Nachkommastellen bei Zahlen
 * trend        { wert: 4.2, text: "ggü. Vormonat", richtung: "hoch-gut" | "runter-gut" }
 *              Vorzeichen bestimmt den Pfeil; richtung, ob das gut (grün) oder schlecht (rot) ist.
 * verlauf      Zahlenliste → Sparkline
 * hinweis      Kleine Zeile unten („3 Datenräume frei“)
 * icon         Lucide-Icon oben rechts
 * ton          hell | dunkel | marke
 * href         ganze Kachel klickbar (Hover-Lift)
 * laedt        Skeleton statt Inhalt (gleiche Höhe)
 * groesse      m | l (l = Hero-Kachel mit ov-kpi-l)
 */
export default function KpiKachel({
  label,
  wert,
  einheit,
  stellen = 0,
  praefix = "",
  trend,
  verlauf,
  hinweis,
  icon: Icon,
  ton = "hell",
  href,
  laedt = false,
  groesse = "m",
  className,
}) {
  const dunkel = ton === "dunkel";
  const marke = ton === "marke";
  const aufDunkel = dunkel || marke;

  const flaeche = dunkel
    ? "ov-verlauf-nacht text-white ring-1 ring-white/10 shadow-kante"
    : marke
      ? "ov-verlauf-gruen text-white ring-1 ring-ov-700/30"
      : "bg-white text-ink-900 ring-1 ring-ink-200/70 shadow-e1";

  const inhalt = laedt ? (
    <div aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <Skeleton dunkel={aufDunkel} className="h-3.5 w-28" />
        {Icon && <Skeleton dunkel={aufDunkel} className="h-9 w-9 rounded-xl" />}
      </div>
      <Skeleton dunkel={aufDunkel} className={cn("mt-4 w-28", groesse === "l" ? "h-11" : "h-8")} />
      <Skeleton dunkel={aufDunkel} className="mt-3 h-3 w-36" />
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-[13px] font-medium leading-snug", aufDunkel ? "text-white/75" : "text-ink-500")}>{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
              aufDunkel ? "bg-white/10 text-ov-200" : "bg-ov-50 text-ov-600",
              href && !aufDunkel && "group-hover:bg-ov-600 group-hover:text-white"
            )}
          >
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <p className={cn(groesse === "l" ? "ov-kpi-l" : "ov-kpi", aufDunkel ? "text-white" : "text-ink-900")}>
          {typeof wert === "number" ? <CountUp value={wert} decimals={stellen} prefix={praefix} /> : <span className="ov-num">{wert}</span>}
          {einheit && <span className="ov-einheit">{einheit}</span>}
        </p>
        {verlauf?.length > 1 && <Sparkline werte={verlauf} ton={aufDunkel ? "hell" : "marke"} breite={groesse === "l" ? 128 : 96} hoehe={groesse === "l" ? 40 : 30} label={`Verlauf ${label}`} />}
      </div>
      {(trend || hinweis) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          {trend && <Trend {...trend} aufDunkel={aufDunkel} />}
          {hinweis && <span className={aufDunkel ? "text-white/70" : "text-ink-500"}>{hinweis}</span>}
        </div>
      )}
    </>
  );

  const klassen = cn(
    "group relative block min-w-0 rounded-3xl p-5 md:p-6",
    flaeche,
    href && "ov-lift ov-press",
    href && !aufDunkel && "hover:ring-ov-200",
    className
  );

  if (laedt) return <div className={klassen} aria-busy="true">{inhalt}</div>;
  return href ? (
    <Link href={href} className={klassen}>
      {inhalt}
      <ArrowRight aria-hidden="true" className={cn("absolute bottom-5 right-5 h-4 w-4 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100", aufDunkel ? "text-white/70" : "text-ov-600")} />
    </Link>
  ) : (
    <div className={klassen}>{inhalt}</div>
  );
}

/** Trend-Chip: Pfeil + Wert, Farbe nach Bedeutung (nicht nach Vorzeichen). */
export function Trend({ wert, text, richtung = "hoch-gut", einheit = "%", aufDunkel = false }) {
  const v = Number(wert) || 0;
  const gut = v === 0 ? null : richtung === "runter-gut" ? v < 0 : v > 0;
  const Icon = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : Minus;
  const farbe =
    gut === null
      ? aufDunkel ? "bg-white/10 text-white/80" : "bg-ink-100 text-ink-600"
      : gut
        ? aufDunkel ? "bg-ov-300/20 text-ov-200" : "bg-ov-50 text-ov-700"
        : aufDunkel ? "bg-danger-300/20 text-danger-200" : "bg-danger-50 text-danger-700";
  const zahl = `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toLocaleString("de-DE", { maximumFractionDigits: 1 })}${einheit ? " " + einheit : ""}`;
  return (
    <>
      <span className={cn("ov-num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", farbe)}>
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {zahl}
        <span className="sr-only">{gut === null ? "(unverändert)" : gut ? "(Verbesserung)" : "(Verschlechterung)"}</span>
      </span>
      {text && <span className={aufDunkel ? "text-white/70" : "text-ink-500"}>{text}</span>}
    </>
  );
}

// Faktenleiste unter dem Hero – Regeln in vier Zahlen (Werte aus GEMEINSCHAFTEN.rechner, keine Unternehmenskennzahlen).
import { CalendarCheck, Clock, Percent, Waypoints } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { GEMEINSCHAFTEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { fmtZahl } from "@/lib/sprache/format";
import { spracheDerAnfrage } from "@/lib/land/seite";

const at = GEMEINSCHAFTEN.rechner.at.rabatte.find((r) => r.id === "lokal");
const ch = GEMEINSCHAFTEN.rechner.ch.rabatte.find((r) => r.id === "leg40");

const FAKTEN = [
  { icon: CalendarCheck, wert: "2026", einheit: "Energy Sharing in DE", text: "möglich seit 1. Juni 2026 nach § 42c EnWG" },
  { icon: Percent, wert: `${fmt(at.anteil * 100)} %`, einheit: "Abschlag in Österreich", text: "auf den Netz-Arbeitspreis für geteilten Strom, EEG lokal" },
  { icon: Waypoints, wert: `${fmt(ch.anteil * 100)} %`, einheit: "Abschlag in der Schweiz", text: "auf die Netznutzung in der LEG, gleiche Netzebene" },
  { icon: Clock, wert: "15", einheit: "Minuten", text: "Raster, in dem der geteilte Strom über Smart Meter zugeordnet wird" },
];

/* Sprachmodell: englische Fassung (gleiche Werte) */
const FAKTEN_EN = [
  { wert: "2026", einheit: "Energy sharing in DE", text: "possible since 1 June 2026 under § 42c EnWG (German Energy Industry Act)" },
  { wert: `${fmtZahl(at.anteil * 100, 0, "en")} %`, einheit: "Discount in Austria", text: "on the grid energy charge for shared power, local EEG (renewable energy community)" },
  { wert: `${fmtZahl(ch.anteil * 100, 0, "en")} %`, einheit: "Discount in Switzerland", text: "on grid usage in the LEG (local electricity community), same grid level" },
  { wert: "15", einheit: "Minutes", text: "interval in which shared power is allocated via smart meters" },
];

export default function Fakten() {
  const en = spracheDerAnfrage() === "en";
  const fakten = en ? FAKTEN.map((f, i) => ({ ...f, ...FAKTEN_EN[i] })) : FAKTEN;
  return (
    <section data-abschnitt="fakten" aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">{en ? "The rules in figures" : "Regeln in Zahlen"}</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-2 row-start-1 lg:col-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-1 row-start-1 flex items-center gap-3">
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex"><f.icon className="h-4 w-4" /></span>
                  <span className="ov-kpi-l block w-full whitespace-nowrap text-right text-ink-900 max-lg:text-[1.75rem] lg:w-auto lg:text-left">{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

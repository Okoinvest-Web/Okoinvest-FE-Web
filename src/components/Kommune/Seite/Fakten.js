// Faktenleiste unter dem Hero – Rechtsrahmen in vier Zahlen (keine Unternehmenskennzahlen).
import { CalendarRange, HandCoins, Receipt, Route } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { KOMMUNE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const FAKTEN = [
  { icon: HandCoins, wert: fmt(KOMMUNE.beteiligungCt, 1), einheit: "ct/kWh nach § 6 EEG", text: "freiwillig an die Gemeinde – ab dem ersten Betriebsjahr" },
  { icon: Receipt, wert: `${fmt(KOMMUNE.gewerbesteuerStandort * 100)} %`, einheit: "Gewerbesteuer am Standort", text: "Zerlegung nach installierter Leistung (§ 29 GewStG)" },
  { icon: CalendarRange, wert: "1–2", einheit: "Jahre Bauleitplanung", text: "realistische Dauer des gesamten Verfahrens" },
  { icon: Route, wert: "200", einheit: "Meter privilegiert", text: "Streifen an Autobahn und Schiene (§ 35 Abs. 1 Nr. 8 b BauGB)" },
];

export default function Fakten() {
  return (
    <section data-abschnitt="fakten" aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">Rechtsrahmen in Zahlen</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {FAKTEN.map((f, i) => (
              <div
                key={f.einheit}
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

// Faktenleiste unter dem Hero – überlappt die Nachtbühne (Muster der Referenzseite).
// Mobil: Liste (Zahl rechts), ab sm 2×2, ab lg vier Spalten. Alle Werte aus DACH/Seiteninhalt.
import { CalendarClock, HandCoins, Ruler, ShieldCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Variante der Faktenleiste. fakten: [{ icon, wert, einheit, text }] */
export function FaktenLeiste({ titel, fakten }) {
  return (
    <section data-abschnitt="fakten" aria-label={titel} className="relative z-10 -mt-12 md:-mt-16">
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={f.einheit}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="row-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-2 row-start-1 flex items-center gap-3 lg:col-start-1">
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className={cn("ov-kpi-l ov-num block whitespace-nowrap text-right text-ink-900 lg:text-left", f.wert.length > 5 && "!text-[1.9rem] lg:!text-[2.25rem] xl:!text-[2.6rem]")}>{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default function Fakten({ dach }) {
  return (
    <FaktenLeiste
      titel="Dachpacht in Zahlen"
      fakten={[
        { icon: Ruler, wert: "1.000", einheit: "m² Dachfläche", text: "ab dieser Größe wird ein Dach für einen Betreiber interessant" },
        { icon: HandCoins, wert: `${dach.pachtProM2.min}–${dach.pachtProM2.max}`, einheit: "€ je m² und Jahr", text: "Orientierung für die feste Dachpacht" },
        { icon: CalendarClock, wert: String(dach.laufzeit), einheit: "Jahre Laufzeit", text: `ab Inbetriebnahme, dazu ${dach.verlaengerung}` },
        { icon: ShieldCheck, wert: "0 €", einheit: "für die Prüfung", text: "Erstprüfung, Angebot und Vertragsentwurf kostenfrei" },
      ]}
    />
  );
}

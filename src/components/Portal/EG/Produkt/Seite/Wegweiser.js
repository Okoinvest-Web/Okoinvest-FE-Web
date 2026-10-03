// Wegweiser „Direkt zu Ihrem Thema“ nach Zielgruppe
// Mobil: eine gruppierte Liste (kompakt, daumenfreundlich). Ab sm: Zielgruppen-Karten mit eigener Tönung.
import { ArrowRight, ChevronRight, HandCoins, Landmark, Sun, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Wegweiser nach Zielgruppe – Texte fassen nur Inhalte dieser Seite zusammen */
const WEGE = [
  { icon: Users, titel: "Vorstand", text: "Überblick, Freigaben, Pflichten nach ElWG", href: "#kassa", ton: "navy" },
  { icon: HandCoins, titel: "Kassa", text: "Abrechnung mit Vier-Augen-Freigabe", href: "#produkt-kassier", ton: "gruen" },
  { icon: Landmark, titel: "Gemeinde & Initiative", text: "Gründung, Sozialquote, eigene Anlagen", href: "#pakete", ton: "sand" },
  { icon: Sun, titel: "Mitglied", text: "Was spare ich, wie trete ich bei?", href: "#rechner", ton: "sonne" },
];

/** Tönung je Zielgruppe: Symbolfläche, Lichtfleck der Karte, Hover-Farbe */
const TON = {
  navy: { icon: "bg-navy-50 text-navy-600 ring-navy-100", licht: "bg-navy-200/50", hover: "sm:group-hover:bg-navy-600" },
  gruen: { icon: "bg-ov-50 text-ov-700 ring-ov-200", licht: "bg-ov-200/60", hover: "sm:group-hover:bg-ov-600" },
  sand: { icon: "bg-sand-100 text-ov-800 ring-sand-200", licht: "bg-sand-200/80", hover: "sm:group-hover:bg-ov-800" },
  sonne: { icon: "bg-sun-50 text-sun-700 ring-sun-200", licht: "bg-sun-200/60", hover: "sm:group-hover:bg-sun-600" },
};

export default function Wegweiser() {
  return (
    <nav data-abschnitt="wegweiser" aria-labelledby="wege-titel" className="bg-white pb-6 pt-14 md:pb-8 md:pt-20">
      <div className="ov-container">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 md:mb-7">
          <h2 id="wege-titel" className="ov-h3 text-ink-900">Direkt zu Ihrem Thema</h2>
          <p className="text-[14px] text-ink-500">Vier Einstiege – je nach Ihrer Rolle</p>
        </div>

        <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/80 max-sm:divide-y max-sm:divide-ink-100 max-sm:shadow-e1 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:rounded-none sm:bg-transparent sm:ring-0 lg:grid-cols-4">
          {WEGE.map((w) => {
            const ton = TON[w.ton];
            return (
              <li key={w.titel} className="flex">
                <a
                  href={w.href}
                  className={cn(
                    "group relative flex w-full items-center gap-4 px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 max-sm:hover:bg-ink-50",
                    "sm:isolate sm:transition-[transform,box-shadow] sm:duration-300 sm:ease-out sm:hover:shadow-e3 motion-safe:sm:hover:-translate-y-1 sm:flex-col sm:items-start sm:overflow-hidden sm:rounded-3xl sm:bg-white sm:p-6 sm:shadow-e1 sm:ring-1 sm:ring-ink-200/70 sm:focus-visible:ring-2 sm:focus-visible:ring-ov-500"
                  )}
                >
                  {/* Lichtfleck oben rechts (nur Karten) */}
                  <span aria-hidden="true" className={cn("pointer-events-none absolute -right-16 -top-16 -z-10 hidden h-44 w-44 rounded-full opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100 sm:block", ton.licht)} />

                  <span aria-hidden="true" className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset transition-colors duration-200 sm:group-hover:text-white sm:group-hover:ring-transparent", ton.icon, ton.hover)}>
                    <w.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>

                  <span className="min-w-0 flex-1 sm:mt-5">
                    <span className="block font-display text-[16px] font-bold leading-snug tracking-[-0.01em] text-ink-900 sm:text-[17px]">{w.titel}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-ink-600 sm:mt-1.5">{w.text}</span>
                  </span>

                  <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-400 sm:hidden" />
                  <span aria-hidden="true" className="mt-6 hidden items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 sm:mt-auto sm:inline-flex sm:pt-6">
                    Zum Abschnitt
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

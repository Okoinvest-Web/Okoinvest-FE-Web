// Faktenleiste der Seite /investoren – überlappt den Hero
// Mobil: Liste (Zahl rechts), ab sm 2×2, ab lg vier Spalten.
import { CalendarClock, Coins, Layers, Sprout } from "lucide-react";
import { cn } from "@/components/ui/cn";
import Zaehler from "@/components/motion/Zaehler";
import { KENNZAHLEN } from "@/data/site";
import { PHASEN } from "@/lib/invest/markt";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const FAKTEN = [
  { icon: Sprout, wert: `${KENNZAHLEN.entwicklungMwProJahr}`, zahl: Number(KENNZAHLEN.entwicklungMwProJahr), einheit: "MWp pro Jahr", text: "gehen in der Gruppe rund neu in die Entwicklung" },
  { icon: CalendarClock, wert: "15+", zahl: 15, nach: "+", einheit: "Jahre Solarerfahrung", text: `in der ÖKOVOLT Gruppe, seit ${KENNZAHLEN.erfahrungSeit}` },
  { icon: Layers, wert: String(PHASEN.length), zahl: PHASEN.length, einheit: "Einstiegsphasen", text: "von der gesicherten Fläche bis zur laufenden Anlage" },
  { icon: Coins, wert: "0 €", einheit: "für Käufer", text: "Suchprofil, NDA und Datenraum sind kostenfrei" },
];

const TEXTE = {
  de: { titel: "Auf einen Blick", fakten: FAKTEN },
  en: {
    titel: "At a glance",
    fakten: [
      { einheit: "MWp per year", text: "of new capacity entering development in the group, approx." },
      { einheit: "years of solar experience", text: `in the ÖKOVOLT Group, since ${KENNZAHLEN.erfahrungSeit}` },
      { einheit: "entry stages", text: "from secured land to the operating plant" },
      { wert: "€0", einheit: "for buyers", text: "search profile, NDA and data room are free of charge" },
    ],
  },
};

export default function Fakten() {
  const sprache = spracheDerAnfrage();
  const t = uebersetze(TEXTE, sprache);
  return (
    <section data-abschnitt="fakten" aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">{t.titel}</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {t.fakten.map((f, i) => (
              <div
                key={f.einheit}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:items-start lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="lg:order-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="flex items-center gap-3 lg:order-1">
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="ov-kpi-l block text-ink-900">
                    {/* Count-up nur mit den Werten, die hier ohnehin stehen; „0 €“ bleibt statisch */}
                    {Number.isFinite(f.zahl) && f.zahl > 0 ? <Zaehler wert={f.zahl} nach={f.nach} verzoegerung={i * 90} dauer={1100} sprache={sprache === "en" ? "en-GB" : undefined} /> : f.wert}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

import Reveal from "@/components/ui/Reveal";
import { spracheDerAnfrage } from "@/lib/land/seite";

/**
 * Fünf Verfahrensschritte in einer Zeile (Desktop). Eigene, kompaktere Variante von
 * ui/Steps: kleinere Überschriften mit Silbentrennung, damit lange Wörter wie
 * „Aufstellungsbeschluss“ in fünf Spalten nicht überlaufen.
 * items: [{ icon, title, text }]
 */
export default function RegionSchritte({ items = [] }) {
  return (
    <ol lang={spracheDerAnfrage() === "en" ? "en" : "de"} className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
      <div aria-hidden="true" className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-ov-300 to-transparent lg:block" />
      {items.map((s, i) => {
        const Icon = s.icon;
        return (
          <Reveal as="li" key={i} delay={i * 90} className="relative min-w-0">
            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-lg ring-1 ring-ov-200">
              {Icon ? <Icon aria-hidden="true" className="h-6 w-6" /> : String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-5 font-display text-[17.5px] font-bold leading-snug text-ink-900 [hyphens:auto]">
              <span className="mr-1.5 text-[13px] font-bold text-ov-700">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600 [hyphens:auto]">{s.text}</p>
          </Reveal>
        );
      })}
    </ol>
  );
}

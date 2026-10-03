// Themenwahl im Kopf von /faq: je Gruppe eine Kachel mit Anzahl der Fragen.
// Ein Klick setzt den Filter der Suche (Anker #<gruppe>).
import { ArrowRight } from "lucide-react";
import { THEMEN, themaIcon } from "./themen";

export default function ThemenKacheln({ gruppen = [] }) {
  return (
    <nav aria-labelledby="themen-titel" className="relative mx-auto max-w-[580px] lg:ml-auto lg:mr-0">
      <p id="themen-titel" className="mb-3 flex items-center justify-between gap-3 text-[13px] text-white/70">
        <span className="font-semibold text-white">Direkt zum Thema</span>
        <span>{gruppen.length} Themen</span>
      </p>
      <ul className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5 sm:gap-3">
        {gruppen.map((g, i) => {
          const Icon = themaIcon(g.id);
          return (
            <li key={g.id}>
              <a
                href={`#${g.id}`}
                className="group flex h-full flex-col rounded-2xl bg-white p-4 text-ink-900 shadow-e3 ring-1 ring-ink-200/60 transition-[transform,box-shadow] duration-200 hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-400 motion-safe:hover:-translate-y-0.5 sm:p-5"
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className={
                      i === 0
                        ? "ov-verlauf-gruen flex h-10 w-10 items-center justify-center rounded-xl text-white"
                        : "flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100 transition-colors group-hover:bg-ov-600 group-hover:text-white"
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="ov-num rounded-full bg-ink-50 px-2 py-0.5 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200">
                    {g.items.length} <span className="sr-only">Fragen</span>
                  </span>
                </span>
                <span lang="de" className="mt-4 flex items-center gap-1.5 break-words font-display text-[15px] font-bold leading-tight [hyphens:auto] sm:text-[16.5px]">
                  <span className="min-w-0">{g.titel}</span>
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-400 max-sm:hidden transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-ov-600 motion-reduce:transition-none" />
                </span>
                {THEMEN[g.id]?.kurz && <span className="mt-1 text-[13px] leading-snug text-ink-500 max-sm:hidden">{THEMEN[g.id].kurz}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

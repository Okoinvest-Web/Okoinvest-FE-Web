// Die vier Wege als Karten mit Stufenanzeigen (Server-Komponente)
// Die Stufen übersetzen die Texte aus wege.js (z. B. Risiko „gering“) in eine Skala 1–4 – keine neuen Zahlen.
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { WEGE } from "@/components/Agri/wege";

/** Stufen je Weg (1 = wenig, 4 = viel) – abgeleitet aus invest/risiko/aufwand/bewirtschaftung */
const STUFEN = {
  pacht: { invest: 0, risiko: 1, aufwand: 1, bewirtschaftung: 1 },
  eigen: { invest: 4, risiko: 4, aufwand: 3, bewirtschaftung: 4 },
  investor: { invest: 0, risiko: 2, aufwand: 2, bewirtschaftung: 4 },
  genossenschaft: { invest: 2, risiko: 3, aufwand: 2, bewirtschaftung: 4 },
};

const ZEILEN = [
  ["invest", "Eigenes Kapital"],
  ["risiko", "Risiko"],
  ["aufwand", "Ihr Aufwand"],
  ["bewirtschaftung", "Landwirtschaft"],
];

const BETONT = "eigen";

export default function WegeKarten() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {WEGE.map((w, i) => {
        const Icon = w.icon;
        const st = STUFEN[w.id];
        return (
          <Reveal as="li" key={w.id} delay={i * 70} id={`weg-${w.id}`} className="flex scroll-mt-28">
            <Link
              href={w.href}
              className={cn(
                "group relative isolate flex w-full flex-col overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 transition-[transform,box-shadow] duration-300 ease-out hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 motion-safe:hover:-translate-y-1 md:p-7"
              )}
            >
              <span aria-hidden="true" className={cn("pointer-events-none absolute -right-16 -top-16 -z-10 h-44 w-44 rounded-full opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100", w.id === BETONT ? "bg-sun-200/70" : "bg-ov-200/60")} />
              <div className="flex items-start justify-between gap-4">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200 transition-colors duration-200 group-hover:bg-ov-600 group-hover:text-white group-hover:ring-transparent">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span aria-hidden="true" className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] text-ink-100 transition-colors duration-300 group-hover:text-ov-100">
                  {w.buchstabe}
                </span>
              </div>
              <h3 className="mt-6 font-display text-[19px] font-bold leading-snug tracking-[-0.01em] text-ink-900">
                <span className="sr-only">Weg {w.buchstabe}: </span>
                {w.titel}
              </h3>
              <p className="mt-3 text-pretty text-[15px] leading-relaxed text-ink-600">{w.text}</p>

              <dl className="mt-6 space-y-3 border-t border-ink-100 pt-5">
                {ZEILEN.map(([key, label]) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <dt className="text-ink-500">{label}</dt>
                      <dd className="text-right font-semibold text-ink-800">{kurz(w[key])}</dd>
                    </div>
                    <div aria-hidden="true" className="mt-1.5 grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <span key={n} className={cn("h-1.5 rounded-full", n <= st[key] ? (key === "bewirtschaftung" ? "bg-ov-500" : "bg-navy-600") : "bg-ink-100")} />
                      ))}
                    </div>
                  </div>
                ))}
              </dl>

              <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[14.5px] font-semibold text-ov-700">
                Mehr erfahren
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
          </Reveal>
        );
      })}
    </ul>
  );
}

/** Kurzform des Tabellentexts (bis zum ersten Gedankenstrich bzw. Komma) */
function kurz(t) {
  return t.split(/ – |, /)[0];
}

// Ruhiger Abschluss: Weiterlesen-Karten statt zweitem Anfrage-Aufruf (das Formular steht darüber).
import Link from "@/components/Land/Link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/SectionHeading";
import T from "@/components/Sprache/T";

/** items: [{ href, icon, titel, text }] */
export default function Weiterlesen({ items = [], titel = <T de="Noch nicht so weit? Hier geht es weiter." en="Not quite ready yet? Here is where to go next." />, text, id = "weiterlesen-titel" }) {
  return (
    <section data-abschnitt="weiterlesen" aria-labelledby={id} className="bg-white">
      <div className="ov-container py-16 md:py-24">
        <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3"><T de="Weiterlesen" en="Read on" /></Eyebrow>
            <h2 id={id} className="ov-h3 text-balance text-ink-900 md:text-[30px]">
              {titel}
            </h2>
          </div>
          {text && <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">{text}</p>}
        </Reveal>

        <ul className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 lg:gap-5">
          {items.map(({ href, icon: Icon, titel: t, text: x }, i) => (
            <Reveal as="li" key={href} delay={i * 60} className="flex">
              <article className="group ov-card-hover relative flex w-full items-start gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 transition-colors focus-within:ring-2 focus-within:ring-ov-500 hover:bg-white sm:p-6 md:gap-5 md:p-7">
                {Icon && (
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/70 transition-colors duration-300 group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
                    <Icon className="h-[22px] w-[22px]" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[18px] font-bold leading-snug text-ink-900 md:text-[19px]">
                    <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
                      {t}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{x}</p>
                </div>
                <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-400 ring-1 ring-ink-200 transition-all duration-300 group-hover:bg-ov-50 group-hover:text-ov-700 group-hover:ring-ov-200 sm:flex">
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

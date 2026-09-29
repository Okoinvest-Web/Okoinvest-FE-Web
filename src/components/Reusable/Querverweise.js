import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Reveal from "@/components/ui/Reveal";

/**
 * Thematische Querverweise am Ende einer Seite.
 *
 * Zweck ist nicht Dekoration, sondern Struktur: Vor dieser Komponente hatte
 * praktisch keine Seite einen redaktionellen Eingangslink – jede war nur
 * ueber das Menue erreichbar. Jede Seite uebergibt 2–4 kuratierte Ziele
 * mit sprechendem Ankertext: items=[{ href, titel, text }].
 *
 * Rendert nichts, wenn keine Verweise uebergeben werden.
 */
export default function Querverweise({ items = [], ueberschrift = "Das könnte Sie auch interessieren" }) {
  const verweise = items;
  if (verweise.length === 0) return null;

  return (
    <section aria-labelledby="querverweise-titel" className="bg-white">
      <div className="ov-container py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-6 border-b border-ink-200 pb-6">
          <h2 id="querverweise-titel" className="ov-h3 text-ink-900 md:text-[28px]">
            {ueberschrift}
          </h2>
        </div>

        <ul className={`grid gap-4 sm:grid-cols-2 ${verweise.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {verweise.map((v, i) => (
            <Reveal as="li" key={v.href} delay={i * 70} className="flex">
              <article className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 focus-within:ring-2 focus-within:ring-ov-500 hover:bg-white">
                <span className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-400 ring-1 ring-ink-200 transition-all duration-300 group-hover:bg-ov-500 group-hover:text-white group-hover:ring-ov-500">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
                </span>
                <h3 className="font-display text-[18px] font-bold leading-snug text-ink-900">
                  {/* Stretched Link: genau EIN Link je Karte auf die Ziel-URL. */}
                  <Link href={v.href} className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
                    {v.titel}
                  </Link>
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{v.text}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

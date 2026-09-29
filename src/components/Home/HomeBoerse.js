import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import ProjektKarte from "@/components/Boerse/ProjektKarte";
import { backend } from "@/lib/plattform/backend";

/**
 * Die neuesten Projekte der Börse auf der Startseite – nur öffentliche
 * Teaser-Felder (liefert die Börse ohnehin nur so aus). Ist die Plattform
 * nicht erreichbar oder leer, rendert der Abschnitt gar nichts.
 */
export default async function HomeBoerse({ anzahl = 3 }) {
  let projekte = [];
  try {
    const daten = await backend().boerse(null, {});
    projekte = (daten?.projekte || []).slice(0, anzahl);
  } catch {
    return null;
  }
  if (projekte.length === 0) return null;

  return (
    <div className="mt-16 border-t border-ink-100 pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">Aktuell in der Börse</p>
          <p className="mt-2 font-display text-[clamp(1.35rem,1.1rem+0.8vw,1.75rem)] font-extrabold tracking-tight text-ink-900">Neue Projekte – anonymisiert bis zur NDA</p>
        </div>
        <Link href="/projektboerse" className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
          Alle Projekte <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-3">
        {projekte.map((p, i) => (
          <Reveal as="li" key={p.slug} delay={i * 80}>
            <ProjektKarte projekt={p} href={`/projektboerse/${p.slug}`} />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import Link from "@/components/Land/Link";
import ProjektKarte from "@/components/Boerse/ProjektKarte";
import { backend, istDemo } from "@/lib/plattform/backend";
import { istDemoAnsicht, sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const TEXTE = {
  de: {
    eyebrow: "Aktuell in der Börse",
    titel: "Neue Projekte – anonymisiert bis zur NDA",
    demoA: "Vorführdaten:",
    demoB: "fiktive Beispielprojekte, keine Angebote.",
    alle: "Alle Projekte",
    liste: "Neue Projekte",
    wischen: "Zur Seite wischen für weitere Projekte",
  },
  en: {
    eyebrow: "Currently on the exchange",
    titel: "New projects – anonymised until the NDA",
    demoA: "Demo data:",
    demoB: "fictitious sample projects, not offers.",
    alle: "All projects",
    liste: "New projects",
    wischen: "Swipe sideways for more projects",
  },
};

/**
 * Die neuesten Projekte der Börse auf der Startseite – nur öffentliche
 * Teaser-Felder (liefert die Börse ohnehin nur so aus). Ist die Plattform
 * nicht erreichbar oder leer, rendert der Abschnitt gar nichts.
 * Paket D: Testdatensätze nie, Demo-Projekte nur im Demo-Modus und dann mit Hinweis.
 */
export default async function HomeBoerse({ anzahl = 3 }) {
  let projekte = [];
  let demo = false;
  try {
    const daten = await backend().boerse(null, {});
    demo = istDemoAnsicht({ backendDemo: istDemo(), daten });
    projekte = sichtbareProjekte(daten?.projekte, { demo }).slice(0, anzahl);
  } catch {
    return null;
  }
  if (projekte.length === 0) return null;
  const t = uebersetze(TEXTE, spracheDerAnfrage());

  return (
    <div className="mt-16 border-t border-ink-100 pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">{t.eyebrow}</p>
          <p className="mt-2 font-display text-[clamp(1.35rem,1.1rem+0.8vw,1.75rem)] font-extrabold tracking-tight text-ink-900">{t.titel}</p>
          {demo && <p className="mt-2 text-[13.5px] text-ink-600"><strong className="font-semibold text-ink-900">{t.demoA}</strong> {t.demoB}</p>}
        </div>
        <Link href="/projektboerse" className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
          {t.alle} <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      {/* mobil als wischbare Reihe (Scroll-Snap), ab md als Raster */}
      <ul
        aria-label={t.liste}
        className="ov-no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0"
      >
        {projekte.map((p) => (
          <li key={p.slug} className="w-[84%] shrink-0 snap-start md:w-auto">
            <ProjektKarte projekt={p} href={`/projektboerse/${p.slug}`} />
          </li>
        ))}
      </ul>
      {projekte.length > 1 && <p className="mt-3 text-[12.5px] text-ink-500 md:hidden">{t.wischen}</p>}
    </div>
  );
}

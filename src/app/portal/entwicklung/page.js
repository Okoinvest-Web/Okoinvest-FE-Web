import Link from "next/link";
import { ArrowRight, HardHat } from "lucide-react";
import { Badge, Leer, SeitenKopf } from "@/components/Portal/ui";
import { Fortschritt } from "@/components/Portal/Entwicklung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";
import { LAENDER } from "@/lib/plattform/konstanten";

export const metadata = { title: "Projektentwicklung" };

const SICHT = { eigentuemer: "Ihre Fläche", investor: "Co-Development", gutachter: "Gutachten-Auftrag" };

export default async function EntwicklungMeine() {
  const n = await portalNutzer();
  const projekte = await laden(() => entwicklungBackend().entwicklungMeine(n));
  return (
    <>
      <SeitenKopf
        eyebrow="Projektentwicklung"
        titel="Wo steht mein Projekt?"
        text="Projekte, an denen Sie beteiligt sind – als Flächeneigentümer, Co-Investor oder Gutachter. Sie sehen den Fortschritt so, wie er für Ihre Rolle freigegeben ist."
      />
      {projekte.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {projekte.map((p) => (
            <li key={p.id}>
              <Link href={`/portal/entwicklung/${p.id}`} className="group block h-full rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(3,18,43,0.35)] hover:ring-ov-200 md:p-6">
                <div className="flex flex-wrap gap-1.5">{p.sichten.map((s) => <Badge key={s} ton="info">{SICHT[s]}</Badge>)}{p.kycErforderlich && <Badge ton="warn">Co-Development · Verifizierung erforderlich</Badge>}<Badge>{p.phaseLabel}</Badge></div>
                <h2 className="mt-3 font-display text-[19px] font-bold text-ink-900">{p.titel}</h2>
                <p className="text-[13.5px] text-ink-500">{[p.typLabel, p.gemeinde, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")}</p>
                <div className="mt-4"><Fortschritt wert={p.fortschritt} /></div>
                {p.eigentuemer?.inbetriebnahme && <p className="mt-3 text-[13.5px] text-ink-700">Inbetriebnahme voraussichtlich <strong>{p.eigentuemer.inbetriebnahme}</strong></p>}
                {p.gutachter && <p className="mt-3 text-[13.5px] text-ink-700">{p.gutachter.auftraege.length} Auftrag{p.gutachter.auftraege.length === 1 ? "" : "e"} · {p.gutachter.auftraege.filter((a) => a.ueberfaellig).length} überfällig</p>}
                <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700">Details <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Leer icon={HardHat} titel="Noch kein Projekt in Entwicklung" text="Sobald auf Ihrer Fläche ein Projekt entwickelt wird, Sie für ein Co-Development freigegeben sind oder einen Gutachten-Auftrag erhalten, sehen Sie hier den Fortschritt." />
      )}
    </>
  );
}

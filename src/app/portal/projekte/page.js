import Link from "next/link";
import { Eye, FolderKanban, Heart, KeyRound, Plus, FileSignature } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, Kennzahl, Leer, SeitenKopf, StatusBadge, Stepper } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { mwp, preisText } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { phaseById, PROVISION } from "@/lib/invest/markt";

export const metadata = { title: "Meine Projekte" };

export default async function Projekte() {
  const n = await portalNutzer({ rollen: ["anbieter"] });
  const projekte = await backend().projekte(n);
  const summe = (k) => projekte.reduce((s, p) => s + (p.statistik?.[k] || 0), 0);

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Projektbörse"
        titel="Meine Projekte"
        text={`Anonymer Teaser öffentlich, Details nur nach NDA. Provision ${PROVISION.verkaeufer.text}.`}
        aktionen={<Button href="/portal/projekte/neu" icon={Plus}>Projekt anlegen</Button>}
      />
      {projekte.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kennzahl label="Aufrufe" wert={fmt(summe("aufrufe"))} icon={Eye} hinweis="Exposé-Aufrufe gesamt" />
          <Kennzahl label="Merker" wert={fmt(summe("merker"))} icon={Heart} hinweis="Investoren mit Projekt auf der Merkliste" />
          <Kennzahl label="NDA-Anfragen" wert={fmt(summe("ndaAnfragen"))} icon={KeyRound} hinweis="Anfragen für den Datenraum" />
          <Kennzahl label="LOIs" wert={fmt(summe("lois"))} icon={FileSignature} hinweis="Abgegebene Absichtserklärungen" />
        </div>
      )}
      {projekte.length ? (
        <ul className="grid gap-4 xl:grid-cols-2">
          {projekte.map((p) => (
            <li key={p.id}>
              <Karte className="relative h-full transition-shadow hover:ring-ov-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-ink-500">{[PROJEKT_TYPEN[p.typ], LAENDER[p.land], p.region].filter(Boolean).join(" · ")}</p>
                    <h2 className="mt-1 font-display text-[18px] font-bold leading-snug text-ink-900">
                      <Link href={`/portal/projekte/${p.id}`} className="after:absolute after:inset-0 hover:text-ov-700">{p.titel}</Link>
                    </h2>
                  </div>
                  <StatusBadge art="projekt" status={p.status} />
                </div>
                <p className="mt-2 text-[14px] text-ink-600">{[mwp(p.mwp), p.phase ? phaseById(p.phase).kurz : null, preisText(p)].filter(Boolean).join(" · ")}</p>
                <div className="mt-4">
                  <Stepper art="projekt" status={p.status} kompakt />
                </div>
                <p className="mt-4 flex flex-wrap gap-4 border-t border-ink-100 pt-3 text-[13px] text-ink-600">
                  <span className="inline-flex items-center gap-1.5"><Eye aria-hidden="true" className="h-4 w-4 text-ink-400" /> {fmt(p.statistik.aufrufe)} Aufrufe</span>
                  <span className="inline-flex items-center gap-1.5"><Heart aria-hidden="true" className="h-4 w-4 text-ink-400" /> {fmt(p.statistik.merker)} Merker</span>
                  <span className="inline-flex items-center gap-1.5"><KeyRound aria-hidden="true" className="h-4 w-4 text-ink-400" /> {fmt(p.statistik.ndaAnfragen)} NDA</span>
                </p>
              </Karte>
            </li>
          ))}
        </ul>
      ) : (
        <Leer
          icon={FolderKanban}
          titel="Noch kein Projekt"
          text="In fünf Schritten zum geprüften Inserat: Grunddaten, Entwicklungsstand, Exposé, vertrauliche Angaben, Provisionsvereinbarung."
          aktion={<Button href="/portal/projekte/neu" pfeil>Erstes Projekt anlegen</Button>}
        />
      )}
    </div>
  );
}

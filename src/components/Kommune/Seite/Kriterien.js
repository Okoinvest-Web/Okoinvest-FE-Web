// Kriterienkatalog: links Einordnung, rechts ein „Musterblatt“ mit den typischen Kriterien als Prüfliste.
import { Check, Flower2, MapPinned, Maximize2, RotateCcw, Ruler, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const KRITERIEN = [
  { icon: MapPinned, k: "Flächen", v: "Vorbelastete Flächen zuerst (Autobahn, Schiene, Gewerbe), Bodengüte bzw. Ackerzahl als Schwelle, Agri-PV auf besseren Böden." },
  { icon: Ruler, k: "Abstände", v: "Mindestabstand zur Wohnbebauung, Sichtachsen und Ortsränder freihalten, Eingrünung." },
  { icon: Flower2, k: "Natur", v: "Schutzgebiete ausschließen, Biodiversitätsmaßnahmen, Wildkorridore, extensive Pflege oder Beweidung." },
  { icon: Maximize2, k: "Größe", v: "Obergrenze je Anlage oder Anteil an der Gemarkung, schrittweise Entwicklung." },
  { icon: Users, k: "Beteiligung", v: "§ 6-Vertrag, Angebote für Bürger, bevorzugt regionale Partner und Genossenschaften." },
  { icon: RotateCcw, k: "Rückbau", v: "Rückbauverpflichtung mit Sicherheitsleistung, Rückführung in landwirtschaftliche Nutzung." },
];

export default function Kriterien() {
  return (
    <Section tone="white" space="lg" id="kriterien" className="scroll-mt-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Kriterienkatalog"
            title="Klare Regeln statt Einzelfallstreit."
            lead="Viele Gemeinden beschließen einen Kriterienkatalog für Freiflächen-Photovoltaik. Er steuert, wo Solarparks entstehen dürfen – und macht Anfragen vergleichbar."
          />
          <Reveal className="mt-8 rounded-2xl bg-ov-50 p-5 ring-1 ring-ov-100">
            <p className="text-[15px] leading-relaxed text-ink-700">
              <span className="font-semibold text-ink-900">Warum das hilft:</span> Das spart Zeit im Verfahren und schafft Akzeptanz, weil alle Projektträger nach denselben Regeln bewertet werden.
            </p>
          </Reveal>
        </div>

        {/* Musterblatt */}
        <Reveal dir="right" className="relative">
          <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-6 -z-10 rotate-[1.5deg] rounded-[1.75rem] bg-sand-100 ring-1 ring-ink-200/70" />
          <div className="rounded-[1.75rem] bg-white shadow-e3 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-5 md:px-8">
              <div>
                <p className="ov-overline text-ink-400">Typische Kriterien</p>
                <p className="mt-1 font-display text-[18px] font-bold text-ink-900 md:text-[20px]">Kriterienkatalog Freiflächen-PV</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-[12.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">
                Beschluss im Gemeinderat
              </span>
            </div>
            <ul className="divide-y divide-ink-100">
              {KRITERIEN.map(({ icon: Icon, k, v }) => (
                <li key={k} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-6 py-5 md:grid-cols-[auto_9rem_minmax(0,1fr)] md:items-start md:gap-6 md:px-8">
                  <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-ov-600 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="flex items-center gap-2 font-display text-[16px] font-bold text-ink-900">
                    <Icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
                    {k}
                  </p>
                  <p className="col-start-2 text-[14.5px] leading-relaxed text-ink-600 md:col-start-3">{v}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

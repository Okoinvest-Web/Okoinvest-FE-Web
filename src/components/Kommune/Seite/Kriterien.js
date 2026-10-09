// Kriterienkatalog: links Einordnung, rechts ein „Musterblatt“ mit den typischen Kriterien als Prüfliste.
import { Check, Flower2, MapPinned, Maximize2, RotateCcw, Ruler, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const KRITERIEN = [
  { icon: MapPinned, k: "Flächen", v: "Vorbelastete Flächen zuerst (Autobahn, Schiene, Gewerbe), Bodengüte bzw. Ackerzahl als Schwelle, Agri-PV auf besseren Böden." },
  { icon: Ruler, k: "Abstände", v: "Mindestabstand zur Wohnbebauung, Sichtachsen und Ortsränder freihalten, Eingrünung." },
  { icon: Flower2, k: "Natur", v: "Schutzgebiete ausschließen, Biodiversitätsmaßnahmen, Wildkorridore, extensive Pflege oder Beweidung." },
  { icon: Maximize2, k: "Größe", v: "Obergrenze je Anlage oder Anteil an der Gemarkung, schrittweise Entwicklung." },
  { icon: Users, k: "Beteiligung", v: "§ 6-Vertrag, Angebote für Bürger, bevorzugt regionale Partner und Genossenschaften." },
  { icon: RotateCcw, k: "Rückbau", v: "Rückbauverpflichtung mit Sicherheitsleistung, Rückführung in landwirtschaftliche Nutzung." },
];

/** Sprachmodell: Texte (en nur Texte, je Index; AT ohne „§ 6-Vertrag“). */
const W = {
  de: {
    kriterien: KRITERIEN,
    at: (v) => v.replace("§ 6-Vertrag", "Beteiligungsvereinbarung"),
    eyebrow: "Kriterienkatalog",
    titel: "Klare Regeln statt Einzelfallstreit.",
    lead: "Viele Gemeinden beschließen einen Kriterienkatalog für Freiflächen-Photovoltaik. Er steuert, wo Solarparks entstehen dürfen – und macht Anfragen vergleichbar.",
    warumA: "Warum das hilft:",
    warumB: " Das spart Zeit im Verfahren und schafft Akzeptanz, weil alle Projektträger nach denselben Regeln bewertet werden.",
    typisch: "Typische Kriterien",
    blatt: "Kriterienkatalog Freiflächen-PV",
    beschluss: "Beschluss im Gemeinderat",
  },
  en: {
    kriterien: [
      { k: "Land", v: "Pre-impacted land first (motorway, railway, commercial), soil quality or arable land index as a threshold, agrivoltaics on better soils." },
      { k: "Distances", v: "Minimum distance to housing, keep sight lines and village edges clear, screening with greenery." },
      { k: "Nature", v: "Exclude protected areas, biodiversity measures, wildlife corridors, extensive management or grazing." },
      { k: "Size", v: "Upper limit per installation or share of the municipal area, step-by-step development." },
      { k: "Participation", v: "§ 6 agreement (German EEG), offers for citizens, preference for regional partners and cooperatives." },
      { k: "Decommissioning", v: "Decommissioning obligation with a security deposit, return to agricultural use." },
    ],
    at: (v) => v.replace("§ 6 agreement (German EEG)", "Participation agreement"),
    eyebrow: "Catalogue of criteria",
    titel: "Clear rules instead of case-by-case disputes.",
    lead: "Many municipalities adopt a catalogue of criteria for ground-mounted photovoltaics. It steers where solar parks may be built – and makes enquiries comparable.",
    warumA: "Why it helps:",
    warumB: " It saves time in the procedure and builds acceptance, because all project developers are assessed according to the same rules.",
    typisch: "Typical criteria",
    blatt: "Catalogue of criteria for ground-mounted PV",
    beschluss: "Adopted by the municipal council",
  },
};

export default function Kriterien() {
  const w = uebersetze(W, spracheDerAnfrage());
  return (
    <Section tone="white" space="lg" id="kriterien" className="scroll-mt-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={w.eyebrow}
            title={w.titel}
            lead={w.lead}
          />
          <Reveal className="mt-8 rounded-2xl bg-ov-50 p-5 ring-1 ring-ov-100">
            <p className="text-[15px] leading-relaxed text-ink-700">
              <span className="font-semibold text-ink-900">{w.warumA}</span>{w.warumB}
            </p>
          </Reveal>
        </div>

        {/* Musterblatt */}
        <Reveal dir="right" className="relative">
          <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-6 -z-10 rotate-[1.5deg] rounded-[1.75rem] bg-sand-100 ring-1 ring-ink-200/70" />
          <div className="rounded-[1.75rem] bg-white shadow-e3 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-5 md:px-8">
              <div>
                <p className="ov-overline text-ink-400">{w.typisch}</p>
                <p className="mt-1 font-display text-[18px] font-bold text-ink-900 md:text-[20px]">{w.blatt}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-[12.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">
                {w.beschluss}
              </span>
            </div>
            <ul className="divide-y divide-ink-100">
              {w.kriterien.map(({ icon: Icon, k, v }) => ({ icon: Icon, k, v: ["AT", "CH"].includes(landDerAnfrage()) ? w.at(v) : v })).map(({ icon: Icon, k, v }) => (
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

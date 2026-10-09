// Voraussetzungen – vier Prüffragen, Hallenschnitt als Detail, Asbest-Hinweis
import { CalendarClock, Flame, Hammer, PlugZap, Ruler } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import HallenSchnitt from "@/components/Dach/HallenSchnitt";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/** Sprachmodell: Texte (en nur Texte, Listen je Index). */
const W = {
  de: {
    fragen: (r) => [
      { f: "Trägt es?", t: "Statik", x: "Tragreserve für die Zusatzlast der Anlage – je nach Dach und System grob 12–25 kg/m² – plus Schnee- und Windlast am Standort. Nachweis durch einen Tragwerksplaner." },
      { f: "Hält es lange genug?", t: "Restnutzungsdauer", x: `Die Dachhaut sollte mindestens so lange halten wie der Vertrag – als Faustwert ${r} Jahre. Sonst zuerst sanieren; das spart später teure Demontagen.` },
      { f: "Ist der Brandschutz lösbar?", t: "Brandschutz", x: "Abstände zu Brandwänden, Lichtbändern und Rauchabzügen, geprüfte Kabelführung, Abschaltmöglichkeit für die Feuerwehr. Gebäudeversicherer früh einbinden." },
      { f: "Kommt der Strom ins Netz?", t: "Netzanschluss", x: "Freie Kapazität am Hausanschluss oder im Netz in der Nähe. Größere Anlagen brauchen meist eine eigene Übergabestation; die Netzanfrage stellen wir." },
    ],
    eyebrow: "Voraussetzungen",
    titel: "Was Ihr Dach mitbringen muss.",
    lead: "Vier Fragen entscheiden: Trägt es? Hält es lange genug? Ist der Brandschutz lösbar? Kommt der Strom ins Netz? Wir prüfen das mit Ihnen – und sagen offen, wenn ein Dach nicht passt.",
    asbestA: "Faserzement-Wellplatten",
    asbestB: " – bei Gebäuden vor 1993 häufig asbesthaltig – dürfen nicht überbaut oder angebohrt werden. Solche Dächer belegen wir erst nach einer Sanierung. Die Neueindeckung kann Teil des Pachtmodells sein.",
    schnittTitel: "So sitzt eine Anlage auf Ihrer Halle",
    schnittText: "Schnitt mit acht Prüfpunkten",
  },
  en: {
    fragen: (r) => [
      { f: "Will it bear the load?", t: "Structure", x: "Load reserve for the additional weight of the installation – roughly 12–25 kg/m² depending on the roof and system – plus snow and wind loads at the site. Verified by a structural engineer." },
      { f: "Will it last long enough?", t: "Remaining service life", x: `The roof membrane should last at least as long as the contract – as a rule of thumb ${r} years. Otherwise, renovate first; this saves expensive dismantling later.` },
      { f: "Can fire protection be solved?", t: "Fire protection", x: "Distances to fire walls, roof lights and smoke vents, approved cable routing, a shutdown option for the fire brigade. Involve the building insurer early." },
      { f: "Can the power reach the grid?", t: "Grid connection", x: "Free capacity at the building connection or in the nearby grid. Larger installations usually need their own transfer station; we submit the grid request." },
    ],
    eyebrow: "Requirements",
    titel: "What your roof needs to bring.",
    lead: "Four questions decide: will it bear the load? Will it last long enough? Can fire protection be solved? Can the power reach the grid? We check this with you – and say openly if a roof is not suitable.",
    asbestA: "Corrugated fibre cement sheets",
    asbestB: " – often containing asbestos in buildings from before 1993 – must not be built over or drilled. We only cover such roofs after renovation. The new roofing can be part of the lease model.",
    schnittTitel: "How an installation sits on your hall",
    schnittText: "Cross-section with eight checkpoints",
  },
};

export default function Voraussetzungen({ restnutzung }) {
  const w = uebersetze(W, spracheDerAnfrage());
  const ICONS = [Ruler, CalendarClock, Flame, PlugZap];
  const fragen = w.fragen(restnutzung).map((k, i) => ({ icon: ICONS[i], ...k }));
  return (
    <section data-abschnitt="voraussetzungen" aria-labelledby="voraussetzungen-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow={w.eyebrow}
          title={<span id="voraussetzungen-titel">{w.titel}</span>}
          lead={w.lead}
        />

        <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl bg-ink-200/70 ring-1 ring-ink-200/70 md:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {fragen.map((k, i) => (
            <Reveal as="li" key={i} delay={i * 70} className="relative flex flex-col bg-white p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="ov-num font-display text-[13px] font-bold text-ink-400">0{i + 1}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                  <k.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
              </div>
              <p className="mt-5 font-display text-[21px] font-bold leading-tight tracking-[-0.01em] text-ink-900">{k.f}</p>
              <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-ov-700">{k.t}</p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-6 flex gap-4 rounded-3xl bg-sun-50 p-5 ring-1 ring-sun-200 md:items-center md:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-300/40 text-sun-700">
            <Hammer aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="text-[14.5px] leading-relaxed text-ink-700">
            <strong className="text-ink-900">{w.asbestA}</strong>{w.asbestB}
          </p>
        </Reveal>

        <div className="mt-14 md:mt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <h3 className="ov-h3 text-ink-900">{w.schnittTitel}</h3>
            <p className="text-[14px] text-ink-500">{w.schnittText}</p>
          </div>
          <Reveal>
            <HallenSchnitt />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

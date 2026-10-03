// „Das Prinzip“: Text links, Illustration Nahebereich rechts, darunter drei Schritte (Erzeugen · Zuordnen · Reststrom).
import { PlugZap, Sun, Waypoints } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import GemeinschaftSvg from "@/components/Gemeinschaft/GemeinschaftSvg";

const SCHRITTE = [
  { icon: Sun, titel: "Erzeugen", text: "Eine oder mehrere Anlagen liefern Strom für die Mitglieder der Gemeinschaft." },
  { icon: Waypoints, titel: "Über das Netz zuordnen", text: "Wer wie viel bekommt, wird im Viertelstundenraster über Smart Meter zugeordnet." },
  { icon: PlugZap, titel: "Reststrom wie gewohnt", text: "Was die Gemeinschaft nicht decken kann, liefert weiterhin ein Energieversorger." },
];

export default function Prinzip() {
  return (
    <Section tone="white" space="lg" id="prinzip" className="scroll-mt-24">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <SectionHeading eyebrow="Das Prinzip" title="Eine Anlage, viele Nutzer – über das Netz" />
          <Reveal className="mt-6 space-y-4 text-[16.5px] leading-relaxed text-ink-600">
            <p>
              Eine Energiegemeinschaft teilt Strom aus einer oder mehreren Anlagen unter ihren Mitgliedern. Anders als beim Eigenverbrauch hinter dem Zähler fließt der Strom dabei über das öffentliche Netz. Wer wie viel bekommt, wird im Viertelstundenraster über Smart Meter zugeordnet.
            </p>
            <p>
              Den Reststrom, den die Gemeinschaft nicht decken kann, liefert weiterhin ein Energieversorger. Der Vorteil entsteht über einen <span className="font-semibold text-ink-900">fairen Preis innerhalb der Gemeinschaft</span> – und in Österreich und der Schweiz zusätzlich über <span className="font-semibold text-ink-900">reduzierte Netzentgelte</span>.
            </p>
          </Reveal>
        </div>
        <Reveal dir="right">
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-x-8 -bottom-4 top-8 -z-10 rounded-[2rem] bg-ov-100/60 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] shadow-e3 ring-1 ring-ink-200/70">
              <GemeinschaftSvg className="block h-auto w-full" />
            </div>
          </div>
        </Reveal>
      </div>

      <ol className="mt-14 grid gap-4 md:mt-16 lg:grid-cols-3 lg:gap-5">
        {SCHRITTE.map((s, i) => (
          <Reveal as="li" key={s.titel} delay={i * 80} className="relative flex gap-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
            <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-ov-100">
              <s.icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
            </span>
            <div className="min-w-0">
              <p className="font-display text-[17px] font-bold text-ink-900">
                <span className="sr-only">Schritt {i + 1}: </span>
                {s.titel}
              </p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

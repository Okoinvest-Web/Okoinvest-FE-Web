// Dunkler Anker in der Seitenmitte: Akzeptanz (vier Grundsätze, nummeriert) und Stadtwerke (drei Rollen als Glas-Karten).
import { Coins, Flower2, Handshake, Landmark, Megaphone, Sprout, Zap } from "lucide-react";
import { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { GEMEINSCHAFTEN } from "@/lib/invest/markt";

const AKZEPTANZ = [
  { icon: Megaphone, t: "Frühe Information", x: "Vorstellung im Gemeinderat vor dem Aufstellungsbeschluss, Bürgerabend mit Visualisierung und Zahlen." },
  { icon: Flower2, t: "Sichtbar gute Parks", x: "Eingrünung, Blühstreifen, Schafbeweidung, Durchlässe für Wild – im Konzept, nicht als Nachtrag." },
  { icon: Coins, t: "Beteiligung anbieten", x: "§ 6-Vertrag, Genossenschaftsanteile, regionale Stromangebote – bevor jemand danach fragt." },
  { icon: Sprout, t: "Landwirtschaft mitdenken", x: "Agri-PV auf guten Böden, faire Pacht, Einbindung der Bewirtschafter vor Ort." },
];
const STADTWERKE = [
  { icon: Handshake, t: "Beteiligung am Park", x: "Minderheits- oder Mehrheitsbeteiligung an der Projektgesellschaft – ab Baureife oder schon in der Entwicklung." },
  { icon: Zap, t: "PPA für die eigene Beschaffung", x: "Solarstrom aus der Region zu festen Preisen für Tarife, Liegenschaften und Großkunden." },
  { icon: Landmark, t: "Netz & Speicher", x: "Gemeinsame Netzplanung, Speicher an Umspannwerken, Energy Sharing im eigenen Netzgebiet." },
];

export default function Partner() {
  return (
    <section data-abschnitt="partner" aria-label="Akzeptanz und Stadtwerke" className="ov-verlauf-nacht relative isolate overflow-hidden py-20 text-white md:py-32">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-1/3 -z-10 h-[460px] w-[460px] rounded-full bg-navy-500/25 blur-[120px]" />

      <div className="ov-container grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        {/* Akzeptanz */}
        <div>
          <Reveal>
            <Eyebrow dark className="mb-4">Akzeptanz</Eyebrow>
            <h2 className="ov-h2 text-balance text-white lg:min-h-[2.2em]">Früh reden, offen rechnen.</h2>
          </Reveal>
          <ol className="mt-10">
            {AKZEPTANZ.map((p, i) => (
              <Reveal as="li" key={p.t} delay={i * 70} className="group grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-white/10 py-6 first:border-t-0 first:pt-0 last:pb-0">
                <span className="ov-num font-display text-[28px] font-extrabold leading-none tracking-tight text-ov-300/80">
                  <span className="sr-only">Grundsatz </span>0{i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2.5 font-display text-[18px] font-bold text-white">
                    <p.icon aria-hidden="true" className="h-[18px] w-[18px] text-ov-300" />
                    {p.t}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{p.x}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* Stadtwerke */}
        <div className="lg:pt-0">
          <Reveal>
            <Eyebrow dark className="mb-4">Stadtwerke</Eyebrow>
            <h2 className="ov-h2 text-balance text-white lg:min-h-[2.2em]">Partner statt Zuschauer.</h2>
          </Reveal>
          <ul className="mt-10 grid gap-4">
            {STADTWERKE.map((p, i) => (
              <Reveal as="li" key={p.t} delay={i * 80} className="flex gap-4 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10 backdrop-blur-sm md:p-6">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/30">
                  <p.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[17px] font-bold text-white">{p.t}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-white/70">{p.x}</p>
                </div>
              </Reveal>
            ))}
          </ul>
          <Reveal className="mt-6 rounded-2xl border border-dashed border-white/20 p-5">
            <p className="ov-overline text-white/60">Österreich und Schweiz</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">
              {GEMEINSCHAFTEN.at.titel} bzw. {GEMEINSCHAFTEN.ch.titel} – wir entwickeln die Beteiligung passend zum jeweiligen Rechtsrahmen.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Dunkler Anker in der Seitenmitte: Akzeptanz (vier Grundsätze, nummeriert) und Stadtwerke (drei Rollen als Glas-Karten).
import { Coins, Flower2, Handshake, Landmark, Megaphone, Sprout, Zap } from "lucide-react";
import { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { GEMEINSCHAFTEN } from "@/lib/invest/markt";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

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

/** Sprachmodell: Texte (en nur Texte, je Index). */
const W = {
  de: {
    akzeptanz: AKZEPTANZ,
    stadtwerke: STADTWERKE,
    at: (x) => x.replace("§ 6-Vertrag", "Beteiligungsvereinbarung"),
    label: "Akzeptanz und Stadtwerke",
    akzeptanzEyebrow: "Akzeptanz",
    akzeptanzTitel: "Früh reden, offen rechnen.",
    grundsatz: "Grundsatz ",
    swEyebrow: "Stadtwerke",
    swTitel: "Partner statt Zuschauer.",
    nachbarn: "Österreich und Schweiz",
    nachbarnText: `${GEMEINSCHAFTEN.at.titel} bzw. ${GEMEINSCHAFTEN.ch.titel} – wir entwickeln die Beteiligung passend zum jeweiligen Rechtsrahmen.`,
  },
  en: {
    akzeptanz: [
      { t: "Early information", x: "Presentation to the municipal council before the resolution to draw up a plan, a public evening with visualisations and figures." },
      { t: "Visibly good parks", x: "Screening with greenery, wildflower strips, sheep grazing, passages for wildlife – in the concept, not as an afterthought." },
      { t: "Offer participation", x: "§ 6 agreement (German EEG), cooperative shares, regional power offers – before anyone asks." },
      { t: "Keep agriculture in mind", x: "Agrivoltaics on good soils, a fair lease, involving the local farmers." },
    ],
    stadtwerke: [
      { t: "Stake in the park", x: "Minority or majority stake in the project company – from ready-to-build status or already during development." },
      { t: "PPA for your own procurement", x: "Solar power from the region at fixed prices for tariffs, properties and large customers." },
      { t: "Grid & storage", x: "Joint grid planning, storage at substations, energy sharing within your own grid area." },
    ],
    at: (x) => x.replace("§ 6 agreement (German EEG)", "Participation agreement"),
    label: "Acceptance and municipal utilities",
    akzeptanzEyebrow: "Acceptance",
    akzeptanzTitel: "Talk early, calculate openly.",
    grundsatz: "Principle ",
    swEyebrow: "Municipal utilities",
    swTitel: "Partners, not spectators.",
    nachbarn: "Austria and Switzerland",
    nachbarnText: "Renewable energy communities (EEG) and citizens’ energy communities (BEG) in Austria, or ZEV, vZEV and local electricity communities (LEG) in Switzerland – we develop participation to suit the respective legal framework.",
  },
};

export default function Partner() {
  const w = uebersetze(W, spracheDerAnfrage());
  // Länderinhalt: In Österreich gibt es keinen „§ 6-Vertrag“ (deutsches EEG)
  const akzeptanz = ["AT", "CH"].includes(landDerAnfrage()) ? w.akzeptanz.map((a) => ({ ...a, x: w.at(a.x) })) : w.akzeptanz;
  return (
    <section data-abschnitt="partner" aria-label={w.label} className="ov-verlauf-nacht relative isolate overflow-hidden py-20 text-white md:py-32">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-1/3 -z-10 h-[460px] w-[460px] rounded-full bg-navy-500/25 blur-[120px]" />

      <div className="ov-container grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        {/* Akzeptanz */}
        <div>
          <Reveal>
            <Eyebrow dark className="mb-4">{w.akzeptanzEyebrow}</Eyebrow>
            <h2 className="ov-h2 text-balance text-white lg:min-h-[2.2em]">{w.akzeptanzTitel}</h2>
          </Reveal>
          <ol className="mt-10">
            {akzeptanz.map((p, i) => (
              <Reveal as="li" key={i} delay={i * 70} className="group grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-white/10 py-6 first:border-t-0 first:pt-0 last:pb-0">
                <span className="ov-num font-display text-[28px] font-extrabold leading-none tracking-tight text-ov-300/80">
                  <span className="sr-only">{w.grundsatz}</span>0{i + 1}
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
            <Eyebrow dark className="mb-4">{w.swEyebrow}</Eyebrow>
            <h2 className="ov-h2 text-balance text-white lg:min-h-[2.2em]">{w.swTitel}</h2>
          </Reveal>
          <ul className="mt-10 grid gap-4">
            {w.stadtwerke.map((p, i) => (
              <Reveal as="li" key={i} delay={i * 80} className="flex gap-4 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10 backdrop-blur-sm md:p-6">
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
            <p className="ov-overline text-white/60">{w.nachbarn}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">{w.nachbarnText}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

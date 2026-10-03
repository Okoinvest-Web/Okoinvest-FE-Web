// Wertschöpfung: Einnahmen-Grafik (Beispielrechnung, Jahr für Jahr) + sechs Quellen in zwei Gruppen
// (direkt in den Haushalt · in der Region).
import Link from "next/link";
import { ArrowUpRight, Factory, HandCoins, MapPinned, Receipt, Share2, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { KOMMUNE, GEMEINSCHAFTEN, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import EinnahmenBalken, { EinnahmenTabelle, Legende } from "./EinnahmenBalken";
import { BEISPIEL, tsd } from "./daten";
import { pfad } from "@/lib/land";

const DIREKT = [
  {
    icon: HandCoins,
    marke: `bis ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh`,
    farbe: "bg-ov-500",
    title: "§ 6 EEG-Beteiligung",
    text: `Bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je kWh – freiwillig, per Vertrag, ab dem ersten Betriebsjahr. Bei EEG-Anlagen kann der Betreiber sie sich vom Netzbetreiber erstatten lassen.`,
  },
  {
    icon: Receipt,
    marke: `${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % am Standort`,
    farbe: "bg-sun-400",
    title: "Gewerbesteuer",
    text: `Bei Solaranlagen wird der Messbetrag zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % nach installierter Leistung auf die Standortgemeinde zerlegt (§ 29 GewStG). Sie steigt, wenn Abschreibung und Zinsen abgebaut sind.`,
  },
  {
    icon: MapPinned,
    marke: "30 Jahre, indexiert",
    farbe: "bg-navy-500",
    title: "Pacht auf Gemeindeflächen",
    text: "Stehen Module auf gemeindeeigenen Flächen, fließt die Pacht direkt in den Haushalt – über 30 Jahre, indexiert.",
  },
];

const REGION = [
  { icon: Users, title: "Bürgerbeteiligung", text: "Über die Genossenschaft beteiligen sich Bürger und Landwirte mit kleinen Anteilen – die Rendite bleibt in der Region.", href: pfad("/genossenschaft") },
  { icon: Share2, title: "Energy Sharing", text: GEMEINSCHAFTEN.de.text, href: pfad("/energiegemeinschaften") },
  { icon: Factory, title: "Regionale Wertschöpfung", text: "Aufträge für Tiefbau, Zaun, Pflege und Schafhaltung, Pacht für örtliche Eigentümer – und Einkommensteueranteile daraus." },
];

export default function Wertschoepfung() {
  const kpis = [
    ["§ 6 EEG pro Jahr", tsd(BEISPIEL.jahre[0].p6), "text-ov-700"],
    [`§ 6 über ${BEISPIEL.N} Jahre`, tsd(BEISPIEL.gesamt.p6), "text-ink-900"],
    [`Gewerbesteuer ab Jahr ${KOMMUNE.afaJahre + 1}`, BEISPIEL.gewStNachAfa ? `≈ ${tsd(BEISPIEL.gewStNachAfa)}/J.` : "–", "text-sun-700"],
    [`Summe ${BEISPIEL.L} Jahre`, tsd(BEISPIEL.gesamtLaufzeit.summe), "text-ink-900"],
  ];

  return (
    <Section tone="white" space="lg" id="wertschoepfung" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow="Wertschöpfung" title="Sechs Wege, wie der Park in der Gemeinde wirkt." />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">
            Nicht jede Quelle fließt ab dem ersten Tag – aber zusammen machen sie einen Solarpark zu einem der verlässlichsten Einnahmeposten einer Flächengemeinde.
          </p>
        </Reveal>
      </div>

      {/* Grafik: Einnahmen Jahr für Jahr */}
      <Reveal className="mt-12 overflow-hidden rounded-[2rem] bg-white shadow-e2 ring-1 ring-ink-200/70 md:mt-16">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
          <figure className="p-5 sm:p-7 md:p-9">
            <figcaption>
              <p className="ov-overline text-ov-700">Beispielrechnung</p>
              <p className="mt-2 font-display text-[20px] font-bold leading-snug tracking-[-0.01em] text-ink-900 md:text-[24px]">Einnahmen der Gemeinde, Jahr für Jahr</p>
              <p className="mt-1 text-[14px] text-ink-500">
                {fmt(BEISPIEL.eingabe.mwp)} MWp · Süddeutschland · Hebesatz {fmt(KOMMUNE.hebesatz * 100)} %
              </p>
            </figcaption>
            <Legende jahre={BEISPIEL.jahre} className="mt-5" />
            <div
              role="img"
              aria-label={`Balkendiagramm: § 6 EEG bringt ab Jahr 1 rund ${tsd(BEISPIEL.jahre[0].p6)} im Jahr; die Gewerbesteuer setzt nach Ende der Abschreibung ein und liegt danach bei rund ${tsd(BEISPIEL.gewStNachAfa)} im Jahr. Summe über ${BEISPIEL.L} Jahre: ${tsd(BEISPIEL.gesamtLaufzeit.summe)}.`}
              className="mt-8"
            >
              <EinnahmenBalken jahre={BEISPIEL.jahre} afaJahre={KOMMUNE.afaJahre} />
            </div>
            <EinnahmenTabelle jahre={BEISPIEL.jahre} />
          </figure>

          <div className="flex flex-col border-t border-ink-100 bg-sand-50/70 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-1 lg:gap-y-6">
              {kpis.map(([k, v, farbe], i) => (
                <div key={k} className={cn(i === 3 && "lg:border-t lg:border-ink-200 lg:pt-6")}>
                  <dt className="text-[13px] text-ink-600">{k}</dt>
                  <dd className={cn("ov-num mt-0.5 font-display text-[22px] font-extrabold tracking-tight md:text-[26px]", farbe)}>{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={pfad("/rechner/kommune")}
              className="group mt-7 inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ov-600 px-5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2 lg:mt-auto"
            >
              Mit Ihrem Hebesatz rechnen
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">Ohne Pacht auf Gemeindeflächen, vereinfachte Modellrechnung, Stand {STAND}.</p>
          </div>
        </div>
      </Reveal>

      {/* Quellen */}
      <div className="mt-16 md:mt-20">
        <h3 className="ov-overline text-ink-500">Direkt in den Haushalt</h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
          {DIREKT.map((q, i) => (
            <Reveal as="li" key={q.title} delay={i * 80} className="relative flex flex-col overflow-hidden rounded-[1.5rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
              <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1", q.farbe)} />
              <div className="flex items-center justify-between gap-3">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-ov-100">
                  <q.icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-sand-100 px-3 py-1 text-[12.5px] font-semibold text-ink-700">{q.marke}</span>
              </div>
              <p className="mt-5 font-display text-[19px] font-bold tracking-[-0.01em] text-ink-900">{q.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{q.text}</p>
            </Reveal>
          ))}
        </ul>

        <h3 className="ov-overline mt-12 text-ink-500">In der Region</h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
          {REGION.map((q, i) => {
            const inhalt = (
              <>
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ov-700 ring-1 ring-ink-200">
                  <q.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-display text-[17px] font-bold text-ink-900">
                    {q.title}
                    {q.href && <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />}
                  </span>
                  <span className="mt-1.5 block text-[14.5px] leading-relaxed text-ink-600">{q.text}</span>
                </span>
              </>
            );
            return (
              <Reveal as="li" key={q.title} delay={i * 80}>
                {q.href ? (
                  <Link href={q.href} className="ov-lift group flex h-full gap-4 rounded-[1.5rem] bg-sand-50 p-5 ring-1 ring-ink-200/70 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 md:p-6">
                    {inhalt}
                  </Link>
                ) : (
                  <div className="flex h-full gap-4 rounded-[1.5rem] bg-sand-50 p-5 ring-1 ring-ink-200/70 md:p-6">{inhalt}</div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

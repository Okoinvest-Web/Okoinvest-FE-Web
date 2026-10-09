// Wertschöpfung: Einnahmen-Grafik (Beispielrechnung, Jahr für Jahr) + sechs Quellen in zwei Gruppen
// (direkt in den Haushalt · in der Region).
import Link from "@/components/Land/Link";
import { ArrowUpRight, Factory, HandCoins, MapPinned, Receipt, Share2, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { KOMMUNE, GEMEINSCHAFTEN, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import EinnahmenBalken, { EinnahmenTabelle, Legende } from "./EinnahmenBalken";
import { BEISPIEL, tsdFuer } from "./daten";
import { landHinweisText, landHinweisTextEn, pfad } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { LandHinweis } from "@/components/Land/LandHinweis";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";

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

// Österreich (Länderinhalt): ohne § 6 EEG und Gewerbesteuer. Energiegemeinschaften nach ElWG (Koordinationsstelle,
// FAQ zum ElWG, abgerufen 04.10.2026); § 33 EAG (RIS) für vorbelastete Gemeindeflächen.
const DIREKT_AT = [
  {
    icon: MapPinned,
    marke: "30 Jahre, indexiert",
    farbe: "bg-navy-500",
    title: "Pacht auf Gemeindeflächen",
    text: "Stehen Module auf gemeindeeigenen Flächen, fließt die Pacht direkt in den Haushalt – über 30 Jahre, indexiert. Vorbelastete Flächen wie Deponien oder Altlasten sind vom EAG-Abschlag ausgenommen.",
  },
  {
    icon: Share2,
    marke: "ElWG seit 1.10.2026",
    farbe: "bg-ov-500",
    title: "Energiegemeinschaft",
    text: "Als Mitglied einer Erneuerbare-Energie-Gemeinschaft bezieht die Gemeinde Strom aus dem Park im Nahebereich – für Amtshaus, Schule oder Kläranlage.",
  },
  {
    icon: HandCoins,
    marke: "nach Vereinbarung",
    farbe: "bg-sun-400",
    title: "Beteiligung",
    text: "Beteiligungsmodelle für Gemeinde und Bürger vereinbaren wir projektbezogen. Zahlungen nach § 6 EEG und Gewerbesteuer sind deutsches Recht und gelten in Österreich nicht.",
  },
];

const REGION_AT = [
  { icon: Users, title: "Bürgerbeteiligung", text: "Über die Genossenschaft beteiligen sich Bürger und Landwirte mit kleinen Anteilen – die Rendite bleibt in der Region.", href: pfad("/genossenschaft") },
  { icon: Share2, title: "Energiegemeinschaften", text: "Seit 1. Oktober 2026 regelt das ElWG die gemeinsame Energienutzung neu – mit zusätzlichen Modellen neben EEG und BEG.", href: pfad("/energiegemeinschaften") },
  { icon: Factory, title: "Regionale Wertschöpfung", text: "Aufträge für Tiefbau, Zaun, Pflege und Schafhaltung, Pacht für örtliche Eigentümer." },
];

// Schweiz (Länderinhalt): ohne § 6 EEG und Gewerbesteuer. LEG seit 01.01.2026, vZEV seit 2025
// (src/components/Gemeinschaft/laender.js, src/data/laender/ch/energiegemeinschaften.js). Schreibweise ohne ß.
const DIREKT_CH = [
  {
    icon: MapPinned,
    marke: "30 Jahre, indexiert",
    farbe: "bg-navy-500",
    title: "Pacht auf Gemeindeflächen",
    text: "Stehen Module auf gemeindeeigenen Flächen, fliesst die Pacht direkt in den Haushalt – über 30 Jahre, indexiert.",
  },
  {
    icon: Share2,
    marke: "LEG seit 1.1.2026",
    farbe: "bg-ov-500",
    title: "Lokale Elektrizitätsgemeinschaft",
    text: "Als Teilnehmerin einer lokalen Elektrizitätsgemeinschaft (LEG) bezieht die Gemeinde Strom aus Anlagen innerhalb der Gemeinde – mit Abschlag auf das Netznutzungsentgelt.",
  },
  {
    icon: HandCoins,
    marke: "nach Vereinbarung",
    farbe: "bg-sun-400",
    title: "Beteiligung",
    text: "Beteiligungsmodelle für Gemeinde und Bürger vereinbaren wir projektbezogen. Zahlungen nach § 6 EEG und Gewerbesteuer sind deutsches Recht und gelten in der Schweiz nicht.",
  },
];

const REGION_CH = [
  { icon: Users, title: "Bürgerbeteiligung", text: "Über die Genossenschaft beteiligen sich Bürger und Landwirte mit kleinen Anteilen – die Rendite bleibt in der Region.", href: pfad("/genossenschaft") },
  { icon: Share2, title: "LEG und vZEV", text: "Seit 1. Januar 2026 können lokale Elektrizitätsgemeinschaften Strom innerhalb der Gemeinde teilen; virtuelle ZEV gibt es seit 2025.", href: pfad("/energiegemeinschaften") },
  { icon: Factory, title: "Regionale Wertschöpfung", text: "Aufträge für Tiefbau, Zaun, Pflege und Schafhaltung, Pacht für örtliche Eigentümer." },
];

// Englisch (Sprachmodell): Quellen je Index (gemeinsam und AT), gleiche Aussagen
const zEn = (n, s = 0) => fmtZahl(n, s, "en");
const DIREKT_EN = [
  {
    marke: `up to ${zEn(KOMMUNE.beteiligungCt, 1)} ct/kWh`,
    title: "§ 6 EEG participation",
    text: `Up to ${zEn(KOMMUNE.beteiligungCt, 1)} ct per kWh – voluntary, by contract, from the first year of operation. For EEG installations, the operator can have it reimbursed by the grid operator.`,
  },
  {
    marke: `${zEn(KOMMUNE.gewerbesteuerStandort * 100)} % at the site`,
    title: "Trade tax",
    text: `For solar installations, ${zEn(KOMMUNE.gewerbesteuerStandort * 100)} % of the tax base is allocated to the host municipality according to installed capacity (§ 29 GewStG, Trade Tax Act). It rises once depreciation and interest have been reduced.`,
  },
  {
    marke: "30 years, indexed",
    title: "Lease on municipal land",
    text: "If modules stand on municipal land, the lease flows directly into the budget – over 30 years, indexed.",
  },
];
const REGION_EN = [
  { title: "Citizen participation", text: "Through the cooperative, citizens and farmers participate with small shares – the return stays in the region." },
  { title: "Energy sharing", text: "Shared use of power from installations in the same region via the public grid – initially within one distribution system operator’s grid area, later also in neighbouring areas (§ 42c EnWG)." },
  { title: "Regional value creation", text: "Contracts for civil engineering, fencing, maintenance and sheep farming, lease for local owners – and income tax shares from them." },
];
const DIREKT_AT_EN = [
  { marke: "30 years, indexed", title: "Lease on municipal land", text: "If modules stand on municipal land, the lease flows directly into the budget – over 30 years, indexed. Pre-impacted land such as landfills or contaminated sites is exempt from the EAG reduction." },
  { marke: "ElWG since 1 Oct 2026", title: "Energy community", text: "As a member of a renewable energy community, the municipality draws power from the nearby park – for the town hall, school or sewage plant." },
  { marke: "by agreement", title: "Participation", text: "We agree participation models for the municipality and citizens on a project basis. Payments under § 6 EEG and trade tax are German law and do not apply in Austria." },
];
const DIREKT_CH_EN = [
  { marke: "30 years, indexed", title: "Lease on municipal land", text: "If modules stand on municipal land, the lease flows directly into the budget – over 30 years, indexed." },
  { marke: "LEG since 1 Jan 2026", title: "Local electricity community", text: "As a participant in a local electricity community (LEG), the municipality draws power from installations within the municipality – with a discount on the grid usage fee." },
  { marke: "by agreement", title: "Participation", text: "We agree participation models for the municipality and citizens on a project basis. Payments under § 6 EEG and trade tax are German law and do not apply in Switzerland." },
];
const REGION_CH_EN = [
  { title: "Citizen participation", text: "Through the cooperative, citizens and farmers participate with small shares – the return stays in the region." },
  { title: "LEG and vZEV", text: "Since 1 January 2026, local electricity communities can share power within the municipality; virtual self-consumption groups (vZEV) have existed since 2025." },
  { title: "Regional value creation", text: "Contracts for civil engineering, fencing, maintenance and sheep farming, lease for local owners." },
];
const REGION_AT_EN = [
  { title: "Citizen participation", text: "Through the cooperative, citizens and farmers participate with small shares – the return stays in the region." },
  { title: "Energy communities", text: "Since 1 October 2026, the ElWG (Austrian Electricity Industry Act) has reorganised shared energy use – with additional models alongside EEG and BEG." },
  { title: "Regional value creation", text: "Contracts for civil engineering, fencing, maintenance and sheep farming, lease for local owners." },
];

/** Sprachmodell: feste Texte des Abschnitts. */
const W = {
  de: {
    f: (n, s = 0) => fmt(n, s),
    kpi: { p6: "§ 6 EEG pro Jahr", p6N: (n) => `§ 6 über ${n} Jahre`, gewst: (j) => `Gewerbesteuer ab Jahr ${j}`, proJahr: "/J.", summe: (l) => `Summe ${l} Jahre` },
    eyebrow: "Wertschöpfung",
    titel: "Sechs Wege, wie der Park in der Gemeinde wirkt.",
    lead: "Nicht jede Quelle fließt ab dem ersten Tag – aber zusammen machen sie einen Solarpark zu einem der verlässlichsten Einnahmeposten einer Flächengemeinde.",
    atHinweis: (land) => `Die Beispielrechnung (§ 6 EEG und Gewerbesteuer) gilt für Deutschland. ${landHinweisText(land, "Einnahmen der Gemeinde")}.`,
    beispiel: "Beispielrechnung",
    grafikTitel: "Einnahmen der Gemeinde, Jahr für Jahr",
    kopf: (mwp, h) => `${mwp} MWp · Süddeutschland · Hebesatz ${h} %`,
    grafikLabel: (p6, gew, l, sum) => `Balkendiagramm: § 6 EEG bringt ab Jahr 1 rund ${p6} im Jahr; die Gewerbesteuer setzt nach Ende der Abschreibung ein und liegt danach bei rund ${gew} im Jahr. Summe über ${l} Jahre: ${sum}.`,
    rechnen: "Mit Ihrem Hebesatz rechnen",
    fuss: (stand) => `Ohne Pacht auf Gemeindeflächen, vereinfachte Modellrechnung, Stand ${stand}.`,
    direkt: "Direkt in den Haushalt",
    region: "In der Region",
  },
  en: {
    f: (n, s = 0) => zEn(n, s),
    kpi: { p6: "§ 6 EEG per year", p6N: (n) => `§ 6 over ${n} years`, gewst: (j) => `Trade tax from year ${j}`, proJahr: "/yr", summe: (l) => `Total over ${l} years` },
    eyebrow: "Value creation",
    titel: "Six ways the park benefits the municipality.",
    lead: "Not every source flows from day one – but together they make a solar park one of the most reliable sources of income for a rural municipality.",
    atHinweis: (land) => `The example calculation (§ 6 EEG and trade tax) applies to Germany. ${landHinweisTextEn(land, "Municipal income figures")}.`,
    beispiel: "Example calculation",
    grafikTitel: "Municipal income, year by year",
    kopf: (mwp, h) => `${mwp} MWp · southern Germany · trade tax multiplier ${h} %`,
    grafikLabel: (p6, gew, l, sum) => `Bar chart: § 6 EEG brings around ${p6} per year from year 1; trade tax starts after the end of depreciation and is then around ${gew} per year. Total over ${l} years: ${sum}.`,
    rechnen: "Calculate with your multiplier",
    fuss: (stand) => `Without lease on municipal land, simplified model calculation, as of ${datumText(stand, "en")}.`,
    direkt: "Directly into the budget",
    region: "In the region",
  },
};

export default function Wertschoepfung() {
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const tsd = tsdFuer(sprache);
  const t = inhaltFuerSprache(
    {
      de: { gemeinsam: { beispiel: true, direkt: DIREKT, region: REGION }, AT: { beispiel: false, direkt: DIREKT_AT, region: REGION_AT }, CH: { beispiel: false, direkt: DIREKT_CH, region: REGION_CH } },
      en: { gemeinsam: { direkt: DIREKT_EN, region: REGION_EN }, AT: { direkt: DIREKT_AT_EN, region: REGION_AT_EN }, CH: { direkt: DIREKT_CH_EN, region: REGION_CH_EN } },
    },
    land,
    sprache
  );
  const kpis = [
    [w.kpi.p6, tsd(BEISPIEL.jahre[0].p6), "text-ov-700"],
    [w.kpi.p6N(BEISPIEL.N), tsd(BEISPIEL.gesamt.p6), "text-ink-900"],
    [w.kpi.gewst(KOMMUNE.afaJahre + 1), BEISPIEL.gewStNachAfa ? `≈ ${tsd(BEISPIEL.gewStNachAfa)}${w.kpi.proJahr}` : "–", "text-sun-700"],
    [w.kpi.summe(BEISPIEL.L), tsd(BEISPIEL.gesamtLaufzeit.summe), "text-ink-900"],
  ];

  return (
    <Section tone="white" space="lg" id="wertschoepfung" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
        <SectionHeading eyebrow={w.eyebrow} title={w.titel} />
        <Reveal>
          <p className="ov-lead text-ink-600 lg:pb-1">{w.lead}</p>
        </Reveal>
      </div>

      {/* Grafik: Einnahmen Jahr für Jahr – in AT ohne deutsche Beispielwerte (LandHinweis) */}
      {!t.beispiel ? (
        <LandHinweis land={land} className="mt-12 md:mt-16" text={W.de.atHinweis(land)} textEn={W.en.atHinweis(land)} />
      ) : (
      <Reveal className="mt-12 overflow-hidden rounded-[2rem] bg-white shadow-e2 ring-1 ring-ink-200/70 md:mt-16">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
          <figure className="p-5 sm:p-7 md:p-9">
            <figcaption>
              <p className="ov-overline text-ov-700">{w.beispiel}</p>
              <p className="mt-2 font-display text-[20px] font-bold leading-snug tracking-[-0.01em] text-ink-900 md:text-[24px]">{w.grafikTitel}</p>
              <p className="mt-1 text-[14px] text-ink-500">{w.kopf(w.f(BEISPIEL.eingabe.mwp), w.f(KOMMUNE.hebesatz * 100))}</p>
            </figcaption>
            <Legende jahre={BEISPIEL.jahre} className="mt-5" />
            <div
              role="img"
              aria-label={w.grafikLabel(tsd(BEISPIEL.jahre[0].p6), tsd(BEISPIEL.gewStNachAfa), BEISPIEL.L, tsd(BEISPIEL.gesamtLaufzeit.summe))}
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
              {w.rechnen}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{w.fuss(STAND)}</p>
          </div>
        </div>
      </Reveal>
      )}

      {/* Quellen */}
      <div className="mt-16 md:mt-20">
        <h3 className="ov-overline text-ink-500">{w.direkt}</h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
          {t.direkt.map((q, i) => (
            <Reveal as="li" key={i} delay={i * 80} className="relative flex flex-col overflow-hidden rounded-[1.5rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
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

        <h3 className="ov-overline mt-12 text-ink-500">{w.region}</h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
          {t.region.map((q, i) => {
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
              <Reveal as="li" key={i} delay={i * 80}>
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

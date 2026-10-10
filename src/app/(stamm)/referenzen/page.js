import Link from "@/components/Land/Link";
import { ArrowUpRight, Building2, CalendarClock, FileCheck2, Gauge, Globe2, Hammer, HardHat, Landmark, LineChart, MapPin, PencilRuler, ScrollText, Sprout, Sun, Users, Zap, Handshake, Factory } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import DachKarte from "@/components/Referenzen/DachKarte";
import NachweisBuehne from "@/components/Referenzen/NachweisBuehne";
import NachtHero from "@/components/Unternehmen/NachtHero";
import Faktenleiste from "@/components/Unternehmen/Faktenleiste";
import { PARKS, referenzenFuer } from "@/data/referenzen";
import { KENNZAHLEN, SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const PFAD = "/referenzen";

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Referenzen: seit 2012 eigene Solarparks | ÖkoInvest",
  description:
    "Belegt statt behauptet: Die ÖKOVOLT Gruppe betreibt eigene Solarparks in Irsingen, Artern und Tilleda seit 2012 – mit eigener Rammtechnik, Bau und Betrieb.",
  keywords: ["ÖKOVOLT Referenzen", "Solarpark Betreiber", "Solarpark Tilleda", "Solarpark Artern", "Solarpark Irsingen", "Rammtechnik Photovoltaik"],
});

const ICONS = { PencilRuler, HardHat, Hammer, Gauge, Zap, Globe2 };

const ZIELGRUPPEN = [
  {
    icon: Sprout,
    titel: "Flächeneigentümer & Landwirte",
    text: "Ihr Vertragspartner kennt Solarparks über ihre ganze Laufzeit – vom Rammen der Fundamente bis zum Wechselrichtertausch. Pachtverträge und Rückbau planen wir aus Betreibersicht.",
    href: seitenPfad("/flaeche-verpachten"),
    link: "Fläche verpachten",
  },
  {
    icon: Landmark,
    titel: "Kommunen",
    text: "Parks mit eigener Betreibergesellschaft je Standort: klare Zuständigkeit für Gemeinde, Netzbetreiber und Behörden – auch Jahre nach der Inbetriebnahme.",
    href: seitenPfad("/kommunen"),
    link: "Für Kommunen",
  },
  {
    icon: LineChart,
    titel: "Investoren",
    text: "Projekte aus einer Gruppe, die selbst Betreiber ist: Projektgesellschaften nach bewährter Struktur und auf Wunsch Bau aus der Gruppe – mit eigener Rammtechnik.",
    href: "/investoren",
    link: "Für Investoren",
  },
  {
    icon: Handshake,
    titel: "Projektentwickler",
    text: "Wer ein Projekt über die Börse anbietet, spricht mit Leuten, die Due Diligence aus Käufer- und Betreibersicht kennen – und wissen, welche Unterlagen fehlen.",
    href: "/projektboerse/anbieten",
    link: "Projekt anbieten",
  },
  {
    icon: Factory,
    titel: "Unternehmen",
    text: "Die Gruppe baut PV und Speicher für Gewerbe und Industrie. Den Reststrom bündeln wir über das virtuelle Kraftwerk – mit Erfahrung aus dem eigenen Parkbetrieb.",
    href: seitenPfad("/reststrom"),
    link: "Reststrom-Pool",
  },
  {
    icon: Users,
    titel: "Bürger",
    text: "Beteiligung an Parks vor Ort über die Genossenschaft – entwickelt von einer Gruppe, die ihre eigenen Anlagen seit über einem Jahrzehnt selbst betreibt.",
    href: seitenPfad("/genossenschaft"),
    link: "Zur Genossenschaft",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: "Referenzen der ÖKOVOLT Gruppe",
  isPartOf: { "@id": `${abs("/")}/#website` },
  about: { "@id": `${SITE.url}/#organization` },
  mentions: PARKS.map((p) => ({
    "@type": "Organization",
    name: p.gesellschaft,
    address: { "@type": "PostalAddress", addressLocality: p.ort, addressRegion: p.region, addressCountry: "DE" },
  })),
};

// Englisch (Sprachmodell)
const metadataEn = rechnerMetadataEn({
  title: "References: own solar parks since 2012 | ÖkoInvest",
  description: "Proven, not claimed: the ÖKOVOLT Group has been operating its own solar parks in Irsingen, Artern and Tilleda since 2012 – with its own pile-driving, construction and operation.",
  keywords: ["ÖKOVOLT references", "solar park operator", "Tilleda solar park", "Artern solar park", "Irsingen solar park", "photovoltaic pile-driving"],
});

const TEXTE = {
  de: {
    schemaName: "Referenzen der ÖKOVOLT Gruppe",
    quelle: "Quelle",
    zielgruppen: ZIELGRUPPEN,
    brotkrumen: "Referenzen",
    hinweis: { label: "Belegt", text: "Jede Angabe mit Register oder Quelle" },
    titel1: "Nicht versprochen. ",
    titel2: "Gebaut – und selbst betrieben.",
    lead: "Die ÖKOVOLT Gruppe baut seit 2010 Solaranlagen und betreibt seit 2012 eigene Solarparks. Auf dieser Seite steht nur, was sich belegen lässt – mit Register und Quelle.",
    parksAnsehen: "Bestandsparks ansehen",
    kontakt: "Kontakt aufnehmen",
    chips: ["Je Park eine eigene Betreibergesellschaft", "Eigene Rammtechnik seit 2012", "Planung, Bau und Betrieb in einer Gruppe", "Kundenprojekte nur mit Zustimmung"],
    faktenTitel: "Belegte Kennzahlen der Gruppe",
    fakten: [
      { label: "Gegründet", text: "seither Planung, Bau und Inbetriebnahme aus einer Hand" },
      { label: "eigene Solarparks", text: "je Park eine eigene Betreibergesellschaft" },
      { label: "allein 2021", text: "errichtet von der österreichischen Schwester" },
      { label: "pro Jahr", text: "gehen neu in die Entwicklung" },
    ],
    bEyebrow: "Seit 2012 selbst betrieben",
    bTitel: "Wir kennen Solarparks nicht nur vom Bau.",
    bLead: "Die Gründer der Gruppe haben ihre ersten Solarparks nicht verkauft, sondern behalten. Sie werden bis heute in der Gruppe betrieben – über eine eigene Betreibergesellschaft je Park.",
    bText: "Daraus kommt das Wissen, das in der Entwicklung zählt: wie sich Ertrag, Wartung, Netzbetreiber und Vermarktung über zehn, zwölf, fünfzehn Jahre verhalten. Genau diese Erfahrung prüfen wir in jedem Projekt mit, das wir entwickeln oder über die Börse anbieten.",
    pEyebrow: "Bestandsparks",
    pTitel: "Jeder Park hat seine eigene Gesellschaft.",
    pLead: "Jede Anlage wird über eine eigene GmbH & Co. KG betrieben – so lassen sich Finanzierung, Haftung und Betrieb je Park sauber trennen. Leistungsangaben nennen wir nur dort, wo sie öffentlich belegt sind.",
    betreiber: "Betreibergesellschaft",
    imBetrieb: "Im Betrieb der Gruppe",
    eigentum: "Eigentum: Seit 2021 sind die Solarparks in der AWSM Beteiligung GmbH gebündelt, der Beteiligungsgesellschaft der Gründer Andreas Wegscheider und Susanne Messmer. Die ÖKOVOLT Solarstrom Betriebs GmbH führt als Komplementärin die Park-KGs. Die Parks sind kein Vermögen der ÖkoInvest GmbH.",
    kEyebrow: "DACH-Raum",
    kTitel: "Von Türkheim und Ostermiething aus.",
    kLead: "Die Muttergesellschaft sitzt im Allgäu, ÖkoInvest und die österreichische Schwester in Ostermiething im Innviertel. Die eigenen Parks liegen in Bayern, Thüringen und Sachsen-Anhalt.",
    koEyebrow: "Kompetenzen der Gruppe",
    koTitel: "Planung, Bau, Rammtechnik, Betrieb – in einer Gruppe.",
    koLead: "Jede Kompetenz mit der Gesellschaft, die sie trägt. Was die Gruppe nicht selbst macht, sagen wir dazu.",
    zEyebrow: "Was das für Sie bedeutet",
    zTitel: "Betreibererfahrung – je nachdem, wer Sie sind.",
    qEyebrow: "Quellen",
    qTitel: "Woher die Angaben stammen",
    qLead: (s) => `Stand: ${s}. Kundenprojekte, Zitate oder Logos veröffentlichen wir nur mit Zustimmung der Kunden.`,
    qRegister: "Registerangaben der ÖkoInvest GmbH:",
    qLink: "Über ÖkoInvest",
    quer: [
      { titel: "Über ÖkoInvest", text: "Rolle in der Gruppe, Geschäftsführung und Registerangaben." },
      { titel: "Projektprozess", text: "Von der Fläche bis zum Betrieb – Schritte, Dauer, Dokumente." },
      { titel: "Projektbörse", text: "Projekte in allen Phasen für Investoren im DACH-Raum." },
    ],
    ctaEyebrow: "Zusammenarbeiten",
    ctaTitel: "Mit einer Gruppe entwickeln, die selbst betreibt.",
    ctaText: "Fläche, Projekt oder Kapital: Sprechen Sie mit uns – ehrliche Ersteinschätzung, fester Ansprechpartner, Status im Portal.",
    ctaSekundaer: "Über ÖkoInvest",
  },
  en: {
    schemaName: "References of the ÖKOVOLT Group",
    quelle: "Source",
    zielgruppen: [
      { titel: "Landowners & farmers", text: "Your contractual partner knows solar parks over their entire life – from driving the foundation piles to replacing the inverters. We plan lease agreements and decommissioning from an operator's perspective.", link: "Lease your land" },
      { titel: "Municipalities", text: "Parks with their own operating company per site: clear responsibility for the municipality, grid operator and authorities – even years after commissioning.", link: "For municipalities" },
      { titel: "Investors", text: "Projects from a group that is itself an operator: project companies with a proven structure and, on request, construction by the group – with its own pile-driving equipment.", link: "For investors" },
      { titel: "Project developers", text: "If you offer a project on the exchange, you are talking to people who know due diligence from a buyer's and an operator's perspective – and know which documents are missing.", link: "Offer a project" },
      { titel: "Companies", text: "The group builds PV and storage for businesses and industry. We pool residual power via the virtual power plant – with experience from operating our own parks.", link: "Residual power pool" },
      { titel: "Citizens", text: "Participation in local parks through the cooperative – developed by a group that has been operating its own plants for more than a decade.", link: "Go to the cooperative" },
    ],
    brotkrumen: "References",
    hinweis: { label: "Proven", text: "Every statement backed by a register or source" },
    titel1: "Not promised. ",
    titel2: "Built – and operated ourselves.",
    lead: "The ÖKOVOLT Group has been building solar systems since 2010 and operating its own solar parks since 2012. This page only contains what can be proven – with register entries and sources.",
    parksAnsehen: "See operating parks",
    kontakt: "Get in touch",
    chips: ["Each park has its own operating company", "Own pile-driving equipment since 2012", "Planning, construction and operation in one group", "Customer projects only with consent"],
    faktenTitel: "Proven figures of the group",
    fakten: [
      { label: "Founded", text: "planning, construction and commissioning from a single source ever since" },
      { label: "own solar parks", text: "each park with its own operating company" },
      { label: "in 2021 alone", text: "installed by the Austrian sister company" },
      { label: "per year", text: "of new capacity enters development" },
    ],
    bEyebrow: "Operated in-house since 2012",
    bTitel: "We do not just know solar parks from building them.",
    bLead: "The founders of the group did not sell their first solar parks – they kept them. They are still operated within the group today – through a separate operating company for each park.",
    bText: "That is where the knowledge that counts in development comes from: how yield, maintenance, grid operators and marketing behave over ten, twelve, fifteen years. We apply exactly this experience to every project we develop or offer on the exchange.",
    pEyebrow: "Operating parks",
    pTitel: "Every park has its own company.",
    pLead: "Each plant is operated through its own GmbH & Co. KG (German limited partnership) – this keeps financing, liability and operation cleanly separated for each park. We only state capacity figures where they are publicly documented.",
    betreiber: "Operating company",
    imBetrieb: "Operated by the group",
    eigentum: "Ownership: since 2021, the solar parks have been pooled in AWSM Beteiligung GmbH, the holding company of the founders Andreas Wegscheider and Susanne Messmer. ÖKOVOLT Solarstrom Betriebs GmbH acts as general partner of the park limited partnerships. The parks are not assets of ÖkoInvest GmbH.",
    kEyebrow: "DACH region",
    kTitel: "Based in Türkheim and Ostermiething.",
    kLead: "The parent company is based in the Allgäu, ÖkoInvest and the Austrian sister company in Ostermiething in the Innviertel. The group's own parks are in Bavaria, Thuringia and Saxony-Anhalt.",
    koEyebrow: "Competences of the group",
    koTitel: "Planning, construction, pile-driving, operation – in one group.",
    koLead: "Each competence with the company that provides it. Where the group does not do something itself, we say so.",
    zEyebrow: "What this means for you",
    zTitel: "Operator experience – depending on who you are.",
    qEyebrow: "Sources",
    qTitel: "Where the information comes from",
    qLead: (s) => `As of: ${s}. We only publish customer projects, quotes or logos with the customer's consent.`,
    qRegister: "Register details of ÖkoInvest GmbH:",
    qLink: "About ÖkoInvest",
    quer: [
      { titel: "About ÖkoInvest", text: "Role in the group, management and register details." },
      { titel: "Project process", text: "From land to operation – steps, duration, documents." },
      { titel: "Project exchange", text: "Projects at every stage for investors in the DACH region." },
    ],
    ctaEyebrow: "Work with us",
    ctaTitel: "Develop with a group that operates its own plants.",
    ctaText: "Land, project or capital: talk to us – an honest initial assessment, a dedicated contact person, status in the portal.",
    ctaSekundaer: "About ÖkoInvest",
  },
};

function QuellenMarke({ ids, quelle = "Quelle" }) {
  return chBaum(
    <span className="ml-1 inline-flex gap-1 align-super text-[10.5px] font-semibold text-ov-700">
      {ids.map((id) => (
        <a key={id} href={`#quelle-${id}`} className="rounded px-0.5 hover:bg-ov-50" aria-label={`${quelle} ${id}`}>
          [{id}]
        </a>
      ))}
    </span>
  );
}

export default async function ReferenzenSeite({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const r = referenzenFuer(sprache);
  return chBaum(
    <div>
      <JsonLd daten={en ? { ...schema, name: t.schemaName, inLanguage: "en" } : schema} />

      <NachtHero
        mitLeiste
        breadcrumbs={[{ name: t.brotkrumen }]}
        hinweis={{ ...t.hinweis, href: "#quellen" }}
        title={
          <>
            {t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span>
          </>
        }
        lead={t.lead}
        actions={[
          { label: t.parksAnsehen, href: "#parks" },
          { label: t.kontakt, href: "/kontakt" },
        ]}
        chips={t.chips}
        buehne={<NachweisBuehne />}
      />

      <Faktenleiste
        titel={t.faktenTitel}
        unten="navy"
        items={[
          { icon: CalendarClock, wert: String(KENNZAHLEN.gruppeGegruendet), ...t.fakten[0] },
          { icon: Sun, wert: String(PARKS.length), ...t.fakten[1] },
          { icon: Globe2, wert: "30", einheit: "MWp", ...t.fakten[2] },
          { icon: LineChart, wert: `~${KENNZAHLEN.entwicklungMwProJahr}`, einheit: "MWp", ...t.fakten[3] },
        ]}
      />

      {/* ---------------- Seit 2012 selbst betrieben ---------------- */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-40 top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <SectionHeading
            dark
            eyebrow={t.bEyebrow}
            title={t.bTitel}
            lead={t.bLead}
          >
            <p className="mt-6 text-[15.5px] leading-relaxed text-white/70">
              {t.bText}
            </p>
          </SectionHeading>
          <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-white/15">
            {r.chronik.map((c, i) => (
              <Reveal as="li" key={c.jahr} delay={i * 70} className="relative flex gap-5">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ov-600 font-display text-[14px] font-extrabold text-white shadow-lg shadow-ov-900/40">
                  {c.jahr}
                </span>
                <div className="min-w-0 rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                  <h3 className="font-display text-[18px] font-bold text-white">{c.titel}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{c.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------------- Bestandsparks ---------------- */}
      <Section tone="sand" space="lg" id="parks" className="scroll-mt-24">
        <SectionHeading
          eyebrow={t.pEyebrow}
          title={t.pTitel}
          lead={t.pLead}
          className="mb-12"
        />
        <ul className="grid gap-5 lg:grid-cols-3">
          {r.parks.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 80} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-e2 ring-1 ring-ink-200/70">
              <div className="ov-verlauf-nacht relative flex items-center justify-between gap-4 px-6 py-5 text-white md:px-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sun-300 ring-1 ring-white/15">
                  <Sun aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold text-white ring-1 ring-white/15">{p.region}</span>
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-8">
              <h3 className="ov-h3 text-ink-900">{p.name}</h3>
              <p className="mt-1.5 flex items-start gap-1.5 text-[14.5px] text-ink-600">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                {p.ort}
              </p>
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-600">{p.text}</p>
              <dl className="mt-6 space-y-3 border-t border-ink-100 pt-5 text-[14.5px]">
                <div>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">{t.betreiber}</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">
                    {p.gesellschaft}
                    <QuellenMarke ids={["HR"]} quelle={t.quelle} />
                  </dd>
                  <dd className="text-[13.5px] text-ink-500">{p.register}</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">{t.imBetrieb}</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">
                    {p.seit}
                    <QuellenMarke ids={["U"]} quelle={t.quelle} />
                  </dd>
                </div>
                {p.eckdaten.map((e) => (
                  <div key={e.label}>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">{e.label}</dt>
                    <dd className="mt-0.5 font-medium text-ink-900">
                      {e.wert}
                      <QuellenMarke ids={[e.quelle]} quelle={t.quelle} />
                    </dd>
                  </div>
                ))}
              </dl>
              </div>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          {t.eigentum}
        </p>
      </Section>

      {/* ---------------- Karte ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow={t.kEyebrow}
          title={t.kTitel}
          lead={t.kLead}
          className="mb-12"
        />
        <Reveal>
          <DachKarte />
        </Reveal>
      </Section>

      {/* ---------------- Kompetenzen ---------------- */}
      <Section tone="green" space="lg">
        <SectionHeading
          eyebrow={t.koEyebrow}
          title={t.koTitel}
          lead={t.koLead}
          className="mb-12"
        />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {r.kompetenzen.map((k, i) => {
            const Icon = ICONS[k.icon] || Building2;
            return (
              <Reveal as="li" key={k.titel} delay={i * 70} className="rounded-3xl bg-white p-7 ring-1 ring-ov-100 md:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <h3 className="ov-h3 mt-6 text-ink-900">{k.titel}</h3>
                <p className="mt-1 text-[13.5px] font-semibold text-ov-700">{k.gesellschaft}</p>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{k.text}</p>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      {/* ---------------- Was das für Sie bedeutet ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow={t.zEyebrow} title={t.zTitel} className="mb-12" />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {t.zielgruppen.map((z, i) => (
            <Reveal as="li" key={z.titel} delay={i * 60} className="flex">
              <article className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-sand-50 p-7 ring-1 ring-ink-200/60 focus-within:ring-2 focus-within:ring-ov-500 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-500 group-hover:text-white group-hover:ring-ov-500">
                    <z.icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-ink-300 transition-colors group-hover:text-ov-600" />
                </div>
                <h3 className="ov-h3 mt-6 text-ink-900">{z.titel}</h3>
                <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-ink-600">{z.text}</p>
                <Link href={z.href} className="mt-5 text-[15px] font-semibold text-ov-700 outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
                  {z.link}
                </Link>
              </article>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ---------------- Quellen ---------------- */}
      <Section tone="sand" space="md" id="quellen" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow={t.qEyebrow} title={t.qTitel} lead={t.qLead(r.stand)}>
            <p className="mt-6 text-[14px] leading-relaxed text-ink-500">
              <ScrollText aria-hidden="true" className="mr-2 inline h-4 w-4 align-[-3px] text-ov-600" />
              {t.qRegister} <Link href="/unternehmen#register" className="font-semibold text-ov-700 underline underline-offset-2">{t.qLink}</Link>
            </p>
          </SectionHeading>
          <ol className="space-y-3">
            {r.quellen.map((q) => (
              <li key={q.id} id={`quelle-${q.id}`} className="scroll-mt-28 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
                <p className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md bg-ov-50 px-2 py-0.5 font-display text-[13px] font-extrabold text-ov-700">{q.id}</span>
                  <span className="min-w-0">
                    <a href={q.url} target="_blank" rel="noopener noreferrer" className="font-display text-[16px] font-bold text-ink-900 underline-offset-2 hover:text-ov-700 hover:underline">
                      {q.titel}
                    </a>
                    <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-600">{q.text}</span>
                  </span>
                  <FileCheck2 aria-hidden="true" className="ml-auto mt-0.5 hidden h-5 w-5 shrink-0 text-ov-500 sm:block" />
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/unternehmen", ...t.quer[0] },
          { href: seitenPfad("/prozess"), ...t.quer[1] },
          { href: "/projektboerse", ...t.quer[2] },
        ]}
      />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.kontakt, href: "/kontakt" }}
        secondary={{ label: t.ctaSekundaer, href: "/unternehmen" }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/referenzen", metadata, { en: metadataEn });

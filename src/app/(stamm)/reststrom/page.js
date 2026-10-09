import Link from "@/components/Land/Link";
import { ArrowRight, BatteryCharging, CalendarClock, Calculator, FileBarChart, Gauge, Handshake, Landmark, Scale, Search, Sun, TrendingDown, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import PreisBalken from "@/components/Reststrom/PreisBalken";
import ReststromAnfrage from "@/components/Reststrom/ReststromAnfrage";
import Hero from "@/components/Reststrom/Seite/Hero";
import Problem from "@/components/Reststrom/Seite/Problem";
import Zusammenspiel from "@/components/Reststrom/Seite/Zusammenspiel";
import { STROM } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { FAQ_RESTSTROM } from "@/data/faq";
import { FAQ_RESTSTROM_EN } from "@/data/faq-en";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";
import { STROM_EN, stromTeilEn } from "@/lib/sprache/rechnerBegriffe";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { LAENDER, landHinweisText, landHinweisTextEn } from "@/lib/land";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { faqFuerLand } from "@/components/Land/Laenderteile";

const PFAD = seitenPfad("/reststrom");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Strombeschaffung Mittelstand: Reststrom-Pool | ÖkoInvest",
  description:
    "Was PV und Speicher nicht decken, kaufen wir gebündelt: strukturierte Beschaffung, Solarstrom aus eigenen Parks und Flexibilität für günstigeren Reststrom.",
  keywords: ["Reststrom", "Strompool Mittelstand", "Gewerbestrom", "Strombeschaffung", "Solar-PPA", "Bündelung Strom", "Stromsteuer produzierendes Gewerbe"],
});

const metadataEn = rechnerMetadataEn({
  title: "Electricity procurement for SMEs: residual power pool | ÖkoInvest",
  description:
    "What PV and storage do not cover, we buy as a pool: structured procurement, solar power from our own parks and flexibility for lower-cost residual power.",
  keywords: ["residual power", "electricity pool for SMEs", "business electricity", "electricity procurement", "solar PPA", "pooled power purchasing", "electricity tax manufacturing"],
});

const summe = (arr) => arr.reduce((s, b) => s + b.ct, 0);
const beschaffung = STROM.bestandteile.find((b) => b.beeinflussbar);
const fix = STROM.bestandteile.filter((b) => !b.beeinflussbar);
const hebelMin = STROM.poolHebel.reduce((s, h) => s + h.ct.min, 0);
const hebelMax = STROM.poolHebel.reduce((s, h) => s + h.ct.max, 0);
const stromsteuer = STROM.bestandteile.find((b) => b.id === "stromsteuer");

const HEBEL_ICONS = { buendelung: Handshake, ppa: Sun, flex: BatteryCharging };
const HEBEL_TEXT = {
  buendelung:
    "Der Pool kauft den Bedarf vieler Betriebe gemeinsam und in mehreren Tranchen über einen längeren Zeitraum am Terminmarkt ein. Das senkt Aufschläge und glättet Preisspitzen.",
  ppa: `Solarstrom aus Parks der ÖKOVOLT Gruppe deckt per Liefervertrag (PPA) einen Teil der Tagesstunden – typischerweise ${fmt(STROM.ppaDeckungsanteil.min * 100)}–${fmt(STROM.ppaDeckungsanteil.max * 100)} % der Last in dieser Zeit, zu planbaren Preisen.`,
  flex: "Speicher im virtuellen Kraftwerk und verschiebbare Lasten legen Verbrauch in günstige Viertelstunden – und entlasten den Pool, wenn Strom knapp und teuer ist.",
};

const HEBEL_TEXT_EN = {
  buendelung:
    "The pool buys the demand of many businesses together and in several tranches over a longer period on the futures market. This reduces mark-ups and smooths price peaks.",
  ppa: `Solar power from parks of the ÖKOVOLT Group covers part of the daytime hours via a supply contract (PPA, power purchase agreement) – typically ${fmtZahl(STROM.ppaDeckungsanteil.min * 100, 0, "en")}–${fmtZahl(STROM.ppaDeckungsanteil.max * 100, 0, "en")} % of the load during that time, at predictable prices.`,
  flex: "Storage in the virtual power plant and shiftable loads move consumption into low-cost quarter-hours – and relieve the pool when power is scarce and expensive.",
};

const ABLAUF = [
  { icon: FileBarChart, title: "Lastgang oder Verbrauch", text: "Sie schicken uns Lastgang (RLM) oder Jahresverbrauch und Ihren aktuellen Vertrag – per Formular oder im Portal." },
  { icon: Search, title: "Analyse", text: "Wir zerlegen Ihren Preis, bewerten das Lastprofil und prüfen Laufzeit und Kündigungsfrist Ihres Vertrags." },
  { icon: Calculator, title: "Angebot", text: "Sie erhalten ein Pool-Angebot mit Preisbestandteilen, Beschaffungsstrategie und Laufzeit – transparent und vergleichbar." },
  { icon: Zap, title: "Wechsel", text: "Auf Wunsch übernehmen wir die fristgerechte Kündigung. Die Belieferung startet zum nächsten möglichen Termin." },
];

const VORAUSSETZUNGEN = [
  { t: "Ab etwa 100 MWh im Jahr", s: "Darunter ist der Hebel meist klein – wir prüfen es trotzdem gern." },
  { t: "RLM oder SLP", s: "Mit Lastgangmessung (in DE ab 100.000 kWh üblich) lässt sich am genauesten beschaffen. Standardlastprofile sind möglich." },
  { t: "Standort zunächst in Deutschland", s: "Österreich und Schweiz prüfen wir im Einzelfall." },
  { t: "Kündigungsfrist im Blick", s: "Viele Gewerbeverträge enden zum Jahresende und müssen Monate vorher gekündigt werden." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/rechner/reststrom"), titel: "Reststrom-Rechner", text: "Ihre Ersparnisspanne je Hebel – mit Preiszerlegung vorher/nachher." },
  { href: seitenPfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und Unternehmen im Verbund zusammenspielen." },
  { href: seitenPfad("/solarcarport"), titel: "Solarcarports", text: "Parkplatz-PV mit Ladepunkten – Erzeugung direkt beim Verbraucher." },
  { href: seitenPfad("/energie-live"), titel: "Strommarkt live", text: "Börsenpreis und negative Preise in Echtzeit verfolgen." },
  { href: "/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Grünstrom direkt vom Solarpark – Modelle, Laufzeit, Risiken." },
  { href: seitenPfad("/rechner/ppa"), titel: "PPA-Rechner", text: "Ersparnis und Risiko eines Solar-PPA in drei Preisszenarien." },
];

/* Sprachmodell: englische Fassung der Seitentexte (Rechenwerte unverändert) */
const TEXTE = {
  de: {
    hebelText: HEBEL_TEXT,
    ablauf: ABLAUF,
    voraussetzungen: VORAUSSETZUNGEN,
    querverweise: QUERVERWEISE,
  },
  en: {
    hebelText: HEBEL_TEXT_EN,
    ablauf: [
      { title: "Load profile or consumption", text: "You send us your load profile (RLM interval metering) or annual consumption and your current contract – via the form or in the portal." },
      { title: "Analysis", text: "We break down your price, assess the load profile and check the term and notice period of your contract." },
      { title: "Offer", text: "You receive a pool offer with price components, procurement strategy and term – transparent and comparable." },
      { title: "Switch", text: "If you wish, we take care of terminating your contract on time. Supply starts on the next possible date." },
    ],
    voraussetzungen: [
      { t: "From around 100 MWh a year", s: "Below that, the lever is usually small – but we are happy to check anyway." },
      { t: "RLM or SLP", s: "With interval metering (RLM, common in Germany from 100,000 kWh) procurement can be most precise. Standard load profiles (SLP) are possible." },
      { t: "Sites initially in Germany", s: "We review Austria and Switzerland case by case." },
      { t: "Keep an eye on the notice period", s: "Many business contracts end at the end of the year and have to be terminated months in advance." },
    ],
    querverweise: [
      { titel: "Residual power calculator", text: "Your savings range per lever – with a before/after price breakdown." },
      { titel: "Virtual power plant", text: "How parks, storage and companies work together in the network." },
      { titel: "Solar carports", text: "Car park PV with charging points – generation right at the consumer." },
      { titel: "Power market live", text: "Follow the exchange price and negative prices in real time." },
      { titel: "PPAs for companies", text: "Green power directly from the solar park – models, terms, risks." },
      { titel: "PPA calculator", text: "Savings and risk of a solar PPA in three price scenarios." },
    ],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Reststrom-Pool für den Mittelstand",
  serviceType: "Gebündelte Strombeschaffung für Unternehmen",
  description:
    "Gebündelte, strukturierte Beschaffung des Reststroms mittelständischer Unternehmen mit Solar-PPA aus Parks der ÖKOVOLT Gruppe und Flexibilität im virtuellen Kraftwerk. Belieferung über einen lizenzierten Energielieferanten.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: { "@type": "Country", name: "Deutschland" },
  audience: { "@type": "BusinessAudience", name: "Mittelständische Unternehmen" },
  url: abs(PFAD),
};
const schemaEn = {
  ...schema,
  name: "Residual power pool for SMEs",
  serviceType: "Pooled electricity procurement for businesses",
  description:
    "Pooled, structured procurement of the residual power of mid-sized companies with solar PPAs from parks of the ÖKOVOLT Group and flexibility in the virtual power plant. Supply via a licensed energy supplier.",
  areaServed: { "@type": "Country", name: "Germany" },
  audience: { "@type": "BusinessAudience", name: "Mid-sized companies" },
};

export default async function ReststromPage({ params }) {
  // Preiszerlegung, Hebel in ct/kWh und Stromsteuer sind Werte für Deutschland (STROM, lib/invest/markt):
  // gemeinsam mit Vermerk, in AT/CH LandHinweis statt Werten. Der Pool richtet sich derzeit an Betriebe in DE.
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const ct = (n, s = 1) => fmtZahl(n, s, sprache);
  const hebelLabel = (h) => (en ? STROM_EN.hebel[h.id] ?? h.label : h.label);
  const de = !land || land === "DE";
  return (
    <div>
      <JsonLd daten={en ? schemaEn : schema} />

      <Hero />
      <Problem />

      {/* Preisbestandteile */}
      <Section tone="sand" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow={en ? "Honestly calculated" : "Ehrlich gerechnet"}
            title={en ? "What can be changed in the electricity price – and what cannot" : "Was sich am Strompreis ändern lässt – und was nicht"}
            lead={
              en
                ? de
                  ? `Of around ${ct(summe(STROM.bestandteile))} ct/kWh net, only about ${ct(beschaffung.ct)} ct is procurement and sales. Grid fees, levies, the concession fee and electricity tax (around ${ct(summe(fix))} ct) are set by the legislator or the grid operator – nobody can negotiate them away.`
                  : "Only part of the electricity price is procurement and sales. Grid fees, levies and taxes are set by the legislator, the regulator or the grid operator – nobody can negotiate them away."
                : de
                ? `Von rund ${ct(summe(STROM.bestandteile))} ct/kWh netto sind nur etwa ${ct(beschaffung.ct)} ct Beschaffung und Vertrieb. Netzentgelte, Umlagen, Konzessionsabgabe und Stromsteuer (rund ${ct(summe(fix))} ct) legt der Gesetzgeber oder der Netzbetreiber fest – die kann niemand wegverhandeln.`
                : "Nur ein Teil des Strompreises ist Beschaffung und Vertrieb. Netzentgelte, Abgaben und Steuern legen Gesetzgeber, Regulator oder Netzbetreiber fest – die kann niemand wegverhandeln."
            }
          >
            {de && (
              <p className="mt-5 text-[14px] leading-relaxed text-ink-500">
                {en
                  ? "Rough breakdown for new contracts in Germany in 2026 (BDEW electricity price analysis – BDEW is the German energy industry association – and our own estimate). Grid fees vary greatly by region."
                  : "Grobe Aufteilung für Neuverträge 2026 in Deutschland (BDEW-Strompreisanalyse, eigene Einschätzung). Netzentgelte schwanken regional stark."}
              </p>
            )}
          </SectionHeading>
          {!de ? (
            <Reveal dir="right">
              <LandHinweis land={land} thema="Preisbestandteile" themaEn="Price components" className="shadow-xl" />
            </Reveal>
          ) : (
          <Reveal dir="right" className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 md:p-8">
            <PreisBalken
              sprache={sprache}
              zeilen={[{ titel: en ? "SME business electricity, net" : "Gewerbestrom Mittelstand, netto", teile: en ? STROM.bestandteile.map(stromTeilEn) : STROM.bestandteile }]}
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ov-800">
                  <TrendingDown aria-hidden="true" className="h-4 w-4" /> {en ? "Controllable" : "Beeinflussbar"}
                </p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-ink-900">{ct(beschaffung.ct)} ct/kWh</p>
                <p className="mt-1 text-[13px] text-ink-600">{en ? "This is where pooling, PPAs and flexibility come in." : "Hier setzen Bündelung, PPA und Flexibilität an."}</p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-700">
                  <Scale aria-hidden="true" className="h-4 w-4" /> {en ? "Fixed" : "Fest vorgegeben"}
                </p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-ink-900">{ct(summe(fix))} ct/kWh</p>
                <p className="mt-1 text-[13px] text-ink-600">{en ? "Grid, levies, charges, tax." : "Netz, Umlagen, Abgaben, Steuer."}</p>
              </div>
            </div>
          </Reveal>
          )}
        </div>
      </Section>

      {/* Lösung: drei Hebel */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative">
          <SectionHeading
            dark
            eyebrow={en ? "The solution" : "Die Lösung"}
            title={en ? "Three levers on procurement" : "Drei Hebel auf die Beschaffung"}
            lead={
              en
                ? de
                  ? "Taken together, based on current information we consider around one to four cents per kilowatt hour achievable. The calculator shows how much it is for you."
                  : `The pool is currently aimed at companies in Germany. ${landHinweisTextEn(land, "Savings figures")}.`
                : de
                ? "Zusammen halten wir nach aktuellem Stand etwa ein bis vier Cent je Kilowattstunde für erreichbar. Wie viel es bei Ihnen ist, zeigt der Rechner."
                : `Der Pool richtet sich derzeit an Unternehmen in Deutschland. ${landHinweisText(land, "Ersparniswerte")}.`
            }
            className="mb-10 md:mb-14"
          />
          <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
            {STROM.poolHebel.map((h, i) => {
              const Icon = HEBEL_ICONS[h.id] || Zap;
              return (
                <Reveal as="li" key={h.id} delay={i * 80} className="flex flex-col rounded-3xl bg-white/[0.04] p-7 ring-1 ring-white/10 md:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-500 text-white">
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="font-display text-[14px] font-bold text-ov-300">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="ov-h3 mt-6 text-white">{hebelLabel(h)}</h3>
                  <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-white/65">{t.hebelText[h.id]}</p>
                  {de && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="font-display text-[26px] font-extrabold tracking-tight text-white">
                      −{ct(h.ct.min)} {en ? "to" : "bis"} −{ct(h.ct.max)} <span className="text-[15px] font-semibold text-white/60">ct/kWh</span>
                    </p>
                    <div className="relative mt-3 h-2 rounded-full bg-white/10" aria-hidden="true">
                      <span className="absolute inset-y-0 rounded-full bg-gradient-to-r from-ov-400 to-ov-300" style={{ left: `${(h.ct.min / hebelMax) * 100}%`, width: `${((h.ct.max - h.ct.min) / hebelMax) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-[12px] text-white/55">
                      {en ? `on procurement of around ${ct(beschaffung.ct)} ct/kWh` : `auf die Beschaffung von rund ${ct(beschaffung.ct)} ct/kWh`}{!land && <> <GiltFuer dunkel /></>}
                    </p>
                  </div>
                  )}
                </Reveal>
              );
            })}
          </ol>
          <p className="mt-6 max-w-3xl text-[13.5px] leading-relaxed text-white/55">
            {en
              ? "Supply is provided by a licensed energy supplier that manages the balancing group. ÖkoInvest pools demand, contributes the group’s solar power and steers the procurement strategy."
              : "Die Belieferung erfolgt über einen lizenzierten Energielieferanten, der den Bilanzkreis führt. ÖkoInvest bündelt die Nachfrage, bringt den Solarstrom der Gruppe ein und steuert die Beschaffungsstrategie."}
          </p>
        </div>
      </Section>

      <Zusammenspiel />

      {/* Ablauf */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow={en ? "Process" : "Ablauf"}
          title={en ? "Into the pool in four steps" : "In vier Schritten in den Pool"}
          lead={en ? "You only decide once you have a specific offer with all price components on the table." : "Sie entscheiden erst, wenn Sie ein konkretes Angebot mit allen Preisbestandteilen auf dem Tisch haben."}
          className="mb-12 md:mb-16"
        />
        <Steps items={t.ablauf} />
        <Reveal className="mt-10 flex gap-3 rounded-2xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
          <CalendarClock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
          {en ? (
            <span>
              <strong className="text-ink-900">Watch notice periods:</strong> Many business electricity contracts renew automatically if they are not terminated in time –
              often three months or more before expiry. Tell us when your contract ends and we will plan the switch and procurement in good time.
            </span>
          ) : (
          <span>
            <strong className="text-ink-900">Kündigungsfristen beachten:</strong> Viele Gewerbestromverträge verlängern sich automatisch, wenn sie nicht rechtzeitig –
            oft drei Monate oder mehr vor Ablauf – gekündigt werden. Nennen Sie uns Ihr Vertragsende, dann planen wir den Wechsel und die Beschaffung
            rechtzeitig.
          </span>
          )}
        </Reveal>
        {/* Fristenkasten W0-2 (nur Text, rein informativ, kein Angebot für CH). Geprüft am 03.10.2026 am Original:
            Art. 11 Abs. 2 StromVV (SR 734.71), Stand 1. Juli 2026, fedlex.admin.ch. Die Frist gilt jährlich. */}
        <Reveal className="mt-4 flex gap-3 rounded-2xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
          <CalendarClock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
          {en ? (
            <span>
              <strong className="text-ink-900">Switzerland, every year by 31 October:</strong> End consumers with at least 100&nbsp;MWh annual consumption per
              consumption point who are still in basic supply (Grundversorgung, the regulated default tariff) can notify their distribution system operator by
              31&nbsp;October that they will use the free market from 1&nbsp;January of the following year. This permanently ends the grid operator’s obligation to
              supply – a return to basic supply is not provided for.{" "}
              <a
                href="https://www.fedlex.admin.ch/eli/cc/2008/226/en#art_11"
                className="font-medium text-ov-700 underline underline-offset-2 hover:text-ov-800"
                rel="noopener noreferrer"
                target="_blank"
              >
                Art.&nbsp;11(2) StromVV (Swiss Electricity Supply Ordinance)
              </a>
            </span>
          ) : (
          <span>
            <strong className="text-ink-900">Schweiz, jährlich bis 31. Oktober:</strong> Endverbraucher mit mindestens 100&nbsp;MWh Jahresverbrauch je
            Verbrauchsstätte, die noch in der Grundversorgung sind, können ihrem Verteilnetzbetreiber bis zum 31.&nbsp;Oktober mitteilen, dass sie ab
            1.&nbsp;Januar des Folgejahres den freien Markt nutzen. Damit entfällt die Lieferpflicht des Netzbetreibers endgültig – eine Rückkehr in die
            Grundversorgung ist nicht vorgesehen.{" "}
            <a
              href="https://www.fedlex.admin.ch/eli/cc/2008/226/de#art_11"
              className="font-medium text-ov-700 underline underline-offset-2 hover:text-ov-800"
              rel="noopener noreferrer"
              target="_blank"
            >
              Art.&nbsp;11 Abs.&nbsp;2 StromVV
            </a>
          </span>
          )}
        </Reveal>
      </Section>

      {/* Voraussetzungen */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={en ? "Requirements" : "Voraussetzungen"} title={en ? "Who the pool is right for" : "Für wen der Pool passt"} className="mb-8" />
            <ul className="space-y-4">
              {t.voraussetzungen.map((v, i) => (
                <Reveal as="li" key={i} delay={i * 60} className="flex gap-4 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
                  <Gauge aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                  <div>
                    <p className="font-semibold text-ink-900">{v.t}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{v.s}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <Reveal className="rounded-3xl bg-navy-950 p-7 text-white md:p-8">
              <Landmark aria-hidden="true" className="h-7 w-7 text-ov-300" />
              {de && en ? (
                <>
                  <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight">Electricity tax (Stromsteuer): relief from 2026</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
                    Since 2026, manufacturing businesses as well as agriculture and forestry in Germany pay only {ct(STROM.stromsteuerProduzierend, 2)} instead of{" "}
                    {ct(stromsteuer.ct, 2)} ct/kWh for electricity used for business purposes. This is not a service of the pool – but real money that many businesses
                    have not yet applied for. The responsible authority is the main customs office (Hauptzollamt).
                  </p>
                  <p className="mt-4 text-[14px] text-white/55">
                    At 500 MWh, that comes to around €{ct(((stromsteuer.ct - STROM.stromsteuerProduzierend) / 100) * 500000, 0)} a year.
                    {!land && <> <GiltFuer dunkel /></>}
                  </p>
                </>
              ) : de ? (
                <>
              <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight">Stromsteuer: Entlastung ab 2026</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
                Produzierendes Gewerbe sowie Land- und Forstwirtschaft zahlen in Deutschland seit 2026 für betrieblich genutzten Strom nur noch{" "}
                {ct(STROM.stromsteuerProduzierend, 2)} statt {ct(stromsteuer.ct, 2)} ct/kWh. Das ist keine Leistung des Pools – aber bares Geld, das viele Betriebe
                noch nicht beantragt haben. Zuständig ist das Hauptzollamt.
              </p>
              <p className="mt-4 text-[14px] text-white/55">
                Bei 500 MWh sind das rund {fmt(((stromsteuer.ct - STROM.stromsteuerProduzierend) / 100) * 500000)} € im Jahr.
                {!land && <> <GiltFuer dunkel /></>}
              </p>
                </>
              ) : en ? (
                <>
                  <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight">Taxes and charges {LAENDER[land].en.inLand}</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
                    Taxes, charges and possible relief are part of any honest price calculation – but not a service of the pool. {landHinweisTextEn(land, "Rules and rates")}.
                  </p>
                  <p className="mt-4 text-[14px] text-white/55">
                    <Link href="/kontakt" className="font-semibold text-ov-300 underline underline-offset-2 hover:text-white">
                      Enquire personally
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight">Steuern und Abgaben {LAENDER[land].inLand}</h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
                    Steuern, Abgaben und mögliche Entlastungen sind Teil jeder ehrlichen Preisrechnung – aber keine Leistung des Pools. {landHinweisText(land, "Regeln und Sätze")}.
                  </p>
                  <p className="mt-4 text-[14px] text-white/55">
                    <Link href="/kontakt" className="font-semibold text-ov-300 underline underline-offset-2 hover:text-white">
                      Persönlich anfragen
                    </Link>
                  </p>
                </>
              )}
            </Reveal>
            <Reveal delay={80} className="rounded-3xl bg-ov-50 p-7 ring-1 ring-ov-200 md:p-8">
              <Calculator aria-hidden="true" className="h-7 w-7 text-ov-600" />
              <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight text-ink-900">{en ? "What does your business save?" : "Was spart Ihr Betrieb?"}</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">
                {en
                  ? "Enter consumption, price, load profile and your own PV – the calculator shows the range per lever and the price breakdown before and after."
                  : "Verbrauch, Preis, Lastprofil und eigene PV eingeben – der Rechner zeigt die Spanne je Hebel und die Preiszerlegung vorher und nachher."}
              </p>
              <Link
                href={seitenPfad("/rechner/reststrom")}
                className="group mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700"
              >
                {en ? "To the residual power calculator" : "Zum Reststrom-Rechner"}
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Anfrage */}
      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow={en ? "Enquiry" : "Anfrage"}
            title={en ? "Request a pool offer" : "Pool-Angebot anfragen"}
            lead={
              en
                ? "The more we know about your power consumption, the more precise the offer. All consumption details are voluntary – with your power of attorney we can also retrieve the load profile from the grid operator."
                : "Je mehr wir über Ihren Strombezug wissen, desto genauer wird das Angebot. Alle Angaben zum Verbrauch sind freiwillig – den Lastgang können wir mit Ihrer Vollmacht auch beim Netzbetreiber abrufen."
            }
          >
            <ul className="mt-8 space-y-3 text-[15px] text-ink-700">
              {(en ? ["Free of charge and without obligation", "Status and documents in the portal", "A dedicated contact person"] : ["Kostenlos und unverbindlich", "Status und Unterlagen im Portal", "Fester Ansprechpartner"]).map((x) => (
                <li key={x} className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
                  {x}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 sm:p-8 md:p-10">
            <ReststromAnfrage />
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow={en ? "Frequently asked questions" : "Häufige Fragen"}
            title={en ? "The residual power pool explained" : "Reststrom-Pool verständlich erklärt"}
            lead={en ? "What the pool can do, what it cannot – and how the switch works." : "Was der Pool leisten kann, was nicht – und wie der Wechsel abläuft."}
          />
          <Faq items={faqFuerLand(uebersetze({ de: FAQ_RESTSTROM, en: FAQ_RESTSTROM_EN }, sprache), land, { sprache })} />
        </div>
      </Section>

      <Querverweise items={t.querverweise} />
      {en ? (
        <CtaBand
          eyebrow="Residual power pool"
          title="Pay less for the power you still need."
          text="Your savings range in one minute, followed by a personal response. With an honest price breakdown instead of a teaser offer."
          primary={{ label: "Calculate savings", href: seitenPfad("/rechner/reststrom") }}
          secondary={{ label: "Virtual power plant", href: seitenPfad("/virtuelles-kraftwerk") }}
        />
      ) : (
      <CtaBand
        eyebrow="Reststrom-Pool"
        title="Weniger zahlen für den Strom, den Sie noch brauchen."
        text="In einer Minute zur Ersparnisspanne, danach eine persönliche Rückmeldung. Mit ehrlicher Preiszerlegung statt Lockangebot."
        primary={{ label: "Ersparnis berechnen", href: seitenPfad("/rechner/reststrom") }}
        secondary={{ label: "Virtuelles Kraftwerk", href: seitenPfad("/virtuelles-kraftwerk") }}
      />
      )}
    </div>
  );
}

export const generateMetadata = seitenMetadata("/reststrom", metadata, { en: metadataEn });

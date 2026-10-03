import Link from "next/link";
import { ArrowRight, BatteryCharging, CalendarClock, Calculator, FileBarChart, Gauge, Handshake, Landmark, Scale, Search, Sun, TrendingDown, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import PreisBalken from "@/components/Reststrom/PreisBalken";
import ReststromAnfrage from "@/components/Reststrom/ReststromAnfrage";
import Hero from "@/components/Reststrom/Seite/Hero";
import Problem from "@/components/Reststrom/Seite/Problem";
import Zusammenspiel from "@/components/Reststrom/Seite/Zusammenspiel";
import { STROM } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { FAQ_RESTSTROM } from "@/data/faq";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/reststrom");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Strombeschaffung Mittelstand: Reststrom-Pool | ÖkoInvest",
  description:
    "Was PV und Speicher nicht decken, kaufen wir gebündelt: strukturierte Beschaffung, Solarstrom aus eigenen Parks und Flexibilität für günstigeren Reststrom.",
  keywords: ["Reststrom", "Strompool Mittelstand", "Gewerbestrom", "Strombeschaffung", "Solar-PPA", "Bündelung Strom", "Stromsteuer produzierendes Gewerbe"],
});

const ct = (n, s = 1) => fmt(n, s);
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
  { href: "/wissen/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Grünstrom direkt vom Solarpark – Modelle, Laufzeit, Risiken." },
  { href: seitenPfad("/rechner/ppa"), titel: "PPA-Rechner", text: "Ersparnis und Risiko eines Solar-PPA in drei Preisszenarien." },
];

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

export default async function ReststromPage({ params }) {
  await landDerSeite(params, "/reststrom");
  return (
    <div>
      <JsonLd daten={schema} />

      <Hero />
      <Problem />

      {/* Preisbestandteile */}
      <Section tone="sand" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Ehrlich gerechnet"
            title="Was sich am Strompreis ändern lässt – und was nicht"
            lead={`Von rund ${ct(summe(STROM.bestandteile))} ct/kWh netto sind nur etwa ${ct(beschaffung.ct)} ct Beschaffung und Vertrieb. Netzentgelte, Umlagen, Konzessionsabgabe und Stromsteuer (rund ${ct(summe(fix))} ct) legt der Gesetzgeber oder der Netzbetreiber fest – die kann niemand wegverhandeln.`}
          >
            <p className="mt-5 text-[14px] leading-relaxed text-ink-500">
              Grobe Aufteilung für Neuverträge 2026 in Deutschland (BDEW-Strompreisanalyse, eigene Einschätzung). Netzentgelte schwanken regional stark.
            </p>
          </SectionHeading>
          <Reveal dir="right" className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 md:p-8">
            <PreisBalken zeilen={[{ titel: "Gewerbestrom Mittelstand, netto", teile: STROM.bestandteile }]} />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ov-800">
                  <TrendingDown aria-hidden="true" className="h-4 w-4" /> Beeinflussbar
                </p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-ink-900">{ct(beschaffung.ct)} ct/kWh</p>
                <p className="mt-1 text-[13px] text-ink-600">Hier setzen Bündelung, PPA und Flexibilität an.</p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-700">
                  <Scale aria-hidden="true" className="h-4 w-4" /> Fest vorgegeben
                </p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-ink-900">{ct(summe(fix))} ct/kWh</p>
                <p className="mt-1 text-[13px] text-ink-600">Netz, Umlagen, Abgaben, Steuer.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Lösung: drei Hebel */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative">
          <SectionHeading
            dark
            eyebrow="Die Lösung"
            title="Drei Hebel auf die Beschaffung"
            lead="Zusammen halten wir nach aktuellem Stand etwa ein bis vier Cent je Kilowattstunde für erreichbar. Wie viel es bei Ihnen ist, zeigt der Rechner."
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
                  <h3 className="ov-h3 mt-6 text-white">{h.label}</h3>
                  <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-white/65">{HEBEL_TEXT[h.id]}</p>
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="font-display text-[26px] font-extrabold tracking-tight text-white">
                      −{ct(h.ct.min)} bis −{ct(h.ct.max)} <span className="text-[15px] font-semibold text-white/60">ct/kWh</span>
                    </p>
                    <div className="relative mt-3 h-2 rounded-full bg-white/10" aria-hidden="true">
                      <span className="absolute inset-y-0 rounded-full bg-gradient-to-r from-ov-400 to-ov-300" style={{ left: `${(h.ct.min / hebelMax) * 100}%`, width: `${((h.ct.max - h.ct.min) / hebelMax) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-[12px] text-white/55">auf die Beschaffung von rund {ct(beschaffung.ct)} ct/kWh</p>
                  </div>
                </Reveal>
              );
            })}
          </ol>
          <p className="mt-6 max-w-3xl text-[13.5px] leading-relaxed text-white/55">
            Die Belieferung erfolgt über einen lizenzierten Energielieferanten, der den Bilanzkreis führt. ÖkoInvest bündelt die Nachfrage, bringt den Solarstrom der
            Gruppe ein und steuert die Beschaffungsstrategie.
          </p>
        </div>
      </Section>

      <Zusammenspiel />

      {/* Ablauf */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="Ablauf"
          title="In vier Schritten in den Pool"
          lead="Sie entscheiden erst, wenn Sie ein konkretes Angebot mit allen Preisbestandteilen auf dem Tisch haben."
          className="mb-12 md:mb-16"
        />
        <Steps items={ABLAUF} />
        <Reveal className="mt-10 flex gap-3 rounded-2xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
          <CalendarClock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
          <span>
            <strong className="text-ink-900">Kündigungsfristen beachten:</strong> Viele Gewerbestromverträge verlängern sich automatisch, wenn sie nicht rechtzeitig –
            oft drei Monate oder mehr vor Ablauf – gekündigt werden. Nennen Sie uns Ihr Vertragsende, dann planen wir den Wechsel und die Beschaffung
            rechtzeitig.
          </span>
        </Reveal>
        {/* Fristenkasten W0-2 (nur Text, rein informativ, kein Angebot für CH). Geprüft am 03.10.2026 am Original:
            Art. 11 Abs. 2 StromVV (SR 734.71), Stand 1. Juli 2026, fedlex.admin.ch. Die Frist gilt jährlich. */}
        <Reveal className="mt-4 flex gap-3 rounded-2xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
          <CalendarClock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
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
        </Reveal>
      </Section>

      {/* Voraussetzungen */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Voraussetzungen" title="Für wen der Pool passt" className="mb-8" />
            <ul className="space-y-4">
              {VORAUSSETZUNGEN.map((v, i) => (
                <Reveal as="li" key={v.t} delay={i * 60} className="flex gap-4 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
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
              <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight">Stromsteuer: Entlastung ab 2026</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
                Produzierendes Gewerbe sowie Land- und Forstwirtschaft zahlen in Deutschland seit 2026 für betrieblich genutzten Strom nur noch{" "}
                {ct(STROM.stromsteuerProduzierend, 2)} statt {ct(stromsteuer.ct, 2)} ct/kWh. Das ist keine Leistung des Pools – aber bares Geld, das viele Betriebe
                noch nicht beantragt haben. Zuständig ist das Hauptzollamt.
              </p>
              <p className="mt-4 text-[14px] text-white/55">
                Bei 500 MWh sind das rund {fmt(((stromsteuer.ct - STROM.stromsteuerProduzierend) / 100) * 500000)} € im Jahr.
              </p>
            </Reveal>
            <Reveal delay={80} className="rounded-3xl bg-ov-50 p-7 ring-1 ring-ov-200 md:p-8">
              <Calculator aria-hidden="true" className="h-7 w-7 text-ov-600" />
              <h3 className="mt-5 font-display text-[22px] font-extrabold leading-tight text-ink-900">Was spart Ihr Betrieb?</h3>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">
                Verbrauch, Preis, Lastprofil und eigene PV eingeben – der Rechner zeigt die Spanne je Hebel und die Preiszerlegung vorher und nachher.
              </p>
              <Link
                href={seitenPfad("/rechner/reststrom")}
                className="group mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700"
              >
                Zum Reststrom-Rechner
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
            eyebrow="Anfrage"
            title="Pool-Angebot anfragen"
            lead="Je mehr wir über Ihren Strombezug wissen, desto genauer wird das Angebot. Alle Angaben zum Verbrauch sind freiwillig – den Lastgang können wir mit Ihrer Vollmacht auch beim Netzbetreiber abrufen."
          >
            <ul className="mt-8 space-y-3 text-[15px] text-ink-700">
              {["Kostenlos und unverbindlich", "Status und Unterlagen im Portal", "Fester Ansprechpartner"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
                  {t}
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
            eyebrow="Häufige Fragen"
            title="Reststrom-Pool verständlich erklärt"
            lead="Was der Pool leisten kann, was nicht – und wie der Wechsel abläuft."
          />
          <Faq items={FAQ_RESTSTROM} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Reststrom-Pool"
        title="Weniger zahlen für den Strom, den Sie noch brauchen."
        text="In einer Minute zur Ersparnisspanne, danach eine persönliche Rückmeldung. Mit ehrlicher Preiszerlegung statt Lockangebot."
        primary={{ label: "Ersparnis berechnen", href: seitenPfad("/rechner/reststrom") }}
        secondary={{ label: "Virtuelles Kraftwerk", href: seitenPfad("/virtuelles-kraftwerk") }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/reststrom", metadata);

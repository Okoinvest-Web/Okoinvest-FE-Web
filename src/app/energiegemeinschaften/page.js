import Link from "next/link";
import { ArrowRight, Building, Calculator, FileCheck2, Handshake, LayoutDashboard, Receipt, Sun, Users } from "lucide-react"; // ArrowRight, Calculator, LayoutDashboard, Link: WP6
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import LaenderVergleich from "@/components/Gemeinschaft/LaenderVergleich";
import LaenderTabs from "@/components/Gemeinschaft/LaenderTabs";
import GemeinschaftSvg from "@/components/Gemeinschaft/GemeinschaftSvg";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import { FAQ_GEMEINSCHAFT } from "@/data/faq";
import { abs } from "@/data/site";
import { STAND } from "@/lib/invest/markt";

const PFAD = "/energiegemeinschaften";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegemeinschaften in DE, AT & CH | ÖkoInvest",
  description:
    "Energy Sharing nach § 42c EnWG, EEG und BEG in Österreich, LEG in der Schweiz: Regeln im Vergleich – und wie ÖkoInvest Gemeinschaften mit Parkstrom versorgt.",
  keywords: ["Energiegemeinschaft", "Energy Sharing", "§ 42c EnWG", "Erneuerbare-Energie-Gemeinschaft", "Bürgerenergiegemeinschaft", "LEG Schweiz", "vZEV"],
});

const WEGE = [
  {
    icon: Sun,
    title: "Mit Parkstrom versorgen",
    text: "Wir bringen Strom aus Solarparks der Gruppe im zulässigen Nahebereich in bestehende oder neue Gemeinschaften ein – mit fairem, planbarem Preis.",
  },
  {
    icon: FileCheck2,
    title: "Gründen",
    text: "Satzung oder Statuten, Rechtsform, Teilnahmeverträge, Anmeldung beim Netzbetreiber: Wir begleiten Gemeinden, Vereine und Bürgerinitiativen durch die Gründung.",
  },
  {
    icon: Receipt,
    title: "Betreiben",
    text: "Geplant: Zuordnung der Viertelstundenwerte, Abrechnung und Mitgliederverwaltung als Dienstleistung – damit das Ehrenamt nicht an der Buchhaltung scheitert.",
  },
];

const QUERVERWEISE = [
  { href: "/genossenschaft", titel: "Energiegenossenschaft", text: "Bürger, Landwirte und Gemeinden als Miteigentümer der Parks." },
  { href: "/kommunen", titel: "Kommunen", text: "Wertschöpfung und Beteiligung vor Ort – von § 6 EEG bis Gewerbesteuer." },
  { href: "/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Erzeugung, Speicher und Verbrauch im Verbund zusammenwirken." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Energiegemeinschaften gründen, versorgen und betreiben",
  serviceType: "Beratung und Versorgung von Energiegemeinschaften",
  description: "Versorgung von Energiegemeinschaften mit Strom aus Solarparks sowie Begleitung bei Gründung und Betrieb in Deutschland, Österreich und der Schweiz.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: [
    { "@type": "Country", name: "Deutschland" },
    { "@type": "Country", name: "Österreich" },
    { "@type": "Country", name: "Schweiz" },
  ],
  url: abs(PFAD),
};

export default function EnergiegemeinschaftenPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        breadcrumbs={[{ name: "Energiegemeinschaften" }]}
        eyebrow="Energiegemeinschaften · DE · AT · CH"
        title={
          <>
            Strom aus der Region <span className="ov-text-gradient">gemeinsam nutzen.</span>
          </>
        }
        lead="In allen drei Ländern dürfen Bürger, Gemeinden und Betriebe inzwischen Strom aus erneuerbaren Anlagen teilen – über das öffentliche Netz. Die Regeln unterscheiden sich stark. Wir zeigen, was wo gilt, und versorgen Gemeinschaften mit Strom aus unseren Parks."
        image={{ src: "/img/solarpark-baeume.jpg", alt: "Solarpark am Waldrand" }}
        points={["Energy Sharing seit Juni 2026", "EEG und BEG in Österreich", "LEG in der Schweiz seit 2026", "Parkstrom für die Gemeinschaft"]}
        actions={[
          { label: "Länder vergleichen", href: "#vergleich" },
          { label: "Gemeinschaft anfragen", href: "#anfrage" },
        ]}
      />

      <Section tone="white" space="lg">
        <SplitMedia
          eyebrow="Das Prinzip"
          title="Eine Anlage, viele Nutzer – über das Netz"
          text={[
            "Eine Energiegemeinschaft teilt Strom aus einer oder mehreren Anlagen unter ihren Mitgliedern. Anders als beim Eigenverbrauch hinter dem Zähler fließt der Strom dabei über das öffentliche Netz. Wer wie viel bekommt, wird im Viertelstundenraster über Smart Meter zugeordnet.",
            "Den Reststrom, den die Gemeinschaft nicht decken kann, liefert weiterhin ein Energieversorger. Der Vorteil entsteht über einen fairen Preis innerhalb der Gemeinschaft – und in Österreich und der Schweiz zusätzlich über reduzierte Netzentgelte.",
          ]}
          aside={
            <div className="overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-ink-200/70">
              <GemeinschaftSvg className="block h-auto w-full" />
            </div>
          }
        />
      </Section>

      <Section tone="sand" space="lg" id="vergleich" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Ländervergleich"
          title={
            <>
              Drei Länder, <span className="ov-text-gradient">drei Modelle</span>
            </>
          }
          lead={`Die wichtigsten Unterschiede auf einen Blick – Stand ${STAND}. Die Regeln entwickeln sich schnell; im Einzelfall prüfen wir den aktuellen Stand mit Netzbetreiber und Behörden.`}
          className="mb-10 md:mb-12"
        />
        <Reveal>
          <LaenderVergleich />
        </Reveal>
      </Section>

      <Section tone="green" space="lg">
        <SectionHeading
          eyebrow="Im Detail"
          title="Was in Ihrem Land gilt"
          lead="Wählen Sie ein Land: So funktioniert das Modell, hier liegen die Grenzen – und das tragen wir bei."
          className="mb-8 md:mb-10"
        />
        <LaenderTabs />
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Unsere Rolle"
          title="Versorgen, gründen, betreiben"
          lead="Die Gemeinschaft gehört ihren Mitgliedern. Wir liefern Strom aus der Region und nehmen ihr die Arbeit ab, die viele Initiativen ausbremst."
          className="mb-10 md:mb-14"
        />
        <FeatureGrid items={WEGE} cols={3} />
        <Reveal className="mt-8 grid gap-4 rounded-3xl bg-navy-950 p-6 text-white md:grid-cols-[auto_1fr] md:items-center md:gap-8 md:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ov-500">
            <Handshake aria-hidden="true" className="h-7 w-7" />
          </span>
          <p className="text-[15.5px] leading-relaxed text-white/75">
            <strong className="text-white">Gemeinschaft plus Genossenschaft:</strong> Gerade in Deutschland setzt Energy Sharing voraus, dass die Anlage den
            Teilnehmenden zugeordnet ist. Eine Beteiligung über die geplante Energiegenossenschaft kann das ermöglichen – Mitglieder werden Miteigentümer und
            nutzen den Strom gemeinsam.
          </p>
        </Reveal>
      </Section>

      {/* WP6 Energiegemeinschaften (AT): Rechner und Plattform */}
      <Section tone="white" space="md">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { href: "/energiegemeinschaften/rechner", icon: Calculator, eyebrow: "Österreich · Rechner", titel: "Was bringt mir eine Energiegemeinschaft?", text: "Ersparnis aus Energiepreis, reduziertem Netzentgelt und Abgabe – für EEG, BEG und GEA, mit den Regeln 2026 und ab 2027." },
            { href: "/energiegemeinschaften/software", icon: LayoutDashboard, eyebrow: "Österreich · Plattform & Betrieb", titel: "Gemeinschaften gründen, führen und betreiben", text: "Mitgliederportal mit geführter Zustimmung beim Netzbetreiber, Mehrfachteilnahme, Abrechnung und Betriebsführung." },
          ].map((k) => (
            <Link key={k.href} href={k.href} className="group flex gap-4 rounded-[2rem] bg-navy-950 p-6 text-white transition-shadow hover:shadow-[0_24px_60px_-30px_rgba(3,18,43,0.7)] md:p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-500"><k.icon aria-hidden="true" className="h-6 w-6" /></span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">{k.eyebrow}</span>
                <span className="mt-1 flex items-center gap-1.5 font-display text-[20px] font-bold">{k.titel}<ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></span>
                <span className="mt-2 block text-[14.5px] leading-relaxed text-white/70">{k.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Anfrage"
            title="Gemeinschaft planen oder versorgen"
            lead="Erzählen Sie uns kurz, wo Sie stehen. Wir prüfen, welche Anlage in Ihrem Nahebereich in Frage kommt und welches Modell passt."
          >
            <ul className="mt-8 space-y-3 text-[15px] text-ink-700">
              {[
                { icon: Building, t: "Für Gemeinden, Vereine, Betriebe und Bürgerinitiativen" },
                { icon: Users, t: "Auch für bestehende Gemeinschaften" },
              ].map((x) => (
                <li key={x.t} className="flex items-center gap-2.5">
                  <x.icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  {x.t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 sm:p-8 md:p-10">
            <AnfrageMitDaten
              legende="Ihre Gemeinschaft"
              zusatz={[
                {
                  name: "anliegen",
                  label: "Worum geht es?",
                  art: "chips",
                  optionen: [
                    { id: "gruenden", label: "Gemeinschaft gründen" },
                    { id: "versorgen", label: "Mit Parkstrom versorgen" },
                    { id: "betreiben", label: "Betrieb & Abrechnung" },
                  ],
                },
                {
                  name: "land",
                  label: "Land",
                  art: "select",
                  optionen: [
                    { id: "DE", label: "Deutschland" },
                    { id: "AT", label: "Österreich" },
                    { id: "CH", label: "Schweiz" },
                  ],
                },
                {
                  name: "rolle",
                  label: "Sie sind",
                  art: "select",
                  optionen: [
                    { id: "gemeinde", label: "Gemeinde" },
                    { id: "verein", label: "Verein / Bürgerinitiative" },
                    { id: "unternehmen", label: "Unternehmen" },
                    { id: "privat", label: "Privatperson" },
                    { id: "bestehend", label: "Bestehende Gemeinschaft" },
                  ],
                },
                { name: "teilnehmer", label: "Ungefähre Zahl der Teilnehmenden", art: "zahl", platzhalter: "z. B. 40" },
                { name: "gemeindeOrt", label: "Gemeinde / Region", art: "text", platzhalter: "z. B. Ostermiething" },
              ]}
              formular={{
                typ: "energiegemeinschaft",
                felder: ["firma", "telefon", "plz", "nachricht"],
                button: "Anfrage senden",
              }}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Häufige Fragen"
            title="Energiegemeinschaften verständlich erklärt"
            lead="Energy Sharing, EEG, BEG, ZEV und LEG – die wichtigsten Antworten nach aktuellem Stand."
          />
          <Faq items={FAQ_GEMEINSCHAFT} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Gemeinsam statt allein"
        title="Strom aus der Region für Ihre Gemeinschaft."
        text="Ob Gemeinde, Verein oder Betrieb: Wir prüfen, welche Anlage im Nahebereich liegt, welches Modell passt und was es Ihren Mitgliedern bringt."
        primary={{ label: "Gemeinschaft anfragen", href: "#anfrage" }}
        secondary={{ label: "Zur Genossenschaft", href: "/genossenschaft" }}
      />
    </div>
  );
}

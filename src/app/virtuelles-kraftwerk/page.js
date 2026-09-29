import { Activity, BatteryCharging, Building2, Car, Factory, Gauge, LineChart, Radio, ShieldCheck, ShoppingCart, Sprout, Sun, Tractor, Users } from "lucide-react";
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
import EnergieflussGrafik from "@/components/Energie/EnergieflussGrafik";
import VppLiveSignal from "@/components/Energie/VppLiveSignal";
import { liveStart } from "@/components/Energie/liveStart";
import { FAQ_VPP } from "@/data/faq";
import { abs } from "@/data/site";

const PFAD = "/virtuelles-kraftwerk";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Virtuelles Kraftwerk für Parks & Mittelstand | ÖkoInvest",
  description:
    "Solarparks, Agri-PV, Speicher und Unternehmen im Verbund: Wie das virtuelle Kraftwerk von ÖkoInvest Strom vermarktet, Flexibilität nutzt und Preise senkt.",
  keywords: ["virtuelles Kraftwerk", "VPP", "Direktvermarktung", "Flexibilitätsvermarktung", "Redispatch 2.0", "Stromspeicher", "Solar-PPA"],
});

const LEISTUNGEN = [
  {
    icon: LineChart,
    title: "Direktvermarktung",
    text: "Prognose, Vermarktung und Fernsteuerung der Parks – mit Marktprämie nach EEG oder als ungeförderte Anlage per PPA. Bei negativen Preisen wird abgeregelt statt draufgezahlt.",
  },
  {
    icon: BatteryCharging,
    title: "Flexibilitätsvermarktung",
    text: "Speicher und verschiebbare Lasten werden in die günstigsten und teuersten Viertelstunden gelegt – Arbitrage am Spotmarkt und, nach Präqualifikation, Regelleistung im Pool.",
  },
  {
    icon: ShoppingCart,
    title: "Pool-Beschaffung",
    text: "Der Reststrom der Unternehmen wird gebündelt und in Tranchen beschafft, ergänzt um Solarstrom aus den Parks der Gruppe für die Tagesstunden.",
  },
  {
    icon: Gauge,
    title: "Monitoring & Meldewesen",
    text: "Erzeugung, Verbrauch und Speicherstände im Viertelstundenraster, Alarme bei Abweichungen und die Datenmeldungen für Redispatch 2.0 – gebündelt statt je Anlage.",
  },
];

const BAUSTEINE = [
  {
    icon: Sun,
    title: "Erzeuger",
    tag: "Tagsüber",
    text: "Freiflächen-Solarparks, Agri-PV und Solarcarports. Ost/West- und vertikale Anlagen verteilen die Erzeugung besser über den Tag als reine Südanlagen.",
  },
  {
    icon: BatteryCharging,
    title: "Speicher",
    tag: "Verschieben",
    text: "Großspeicher am Park oder Netzknoten und Gewerbespeicher bei den Unternehmen. Sie machen aus schwankender Erzeugung planbare Lieferung.",
  },
  {
    icon: Factory,
    title: "Verbraucher",
    tag: "Mittelstand",
    text: "Unternehmen mit Ein- bis Dreischichtbetrieb, Handel und Logistik. Ihr gebündelter Bedarf gibt dem Verbund Masse – und ihre Flexibilität senkt die Kosten.",
  },
];

const ZIELGRUPPEN = [
  { icon: Building2, title: "Unternehmen & Mittelstand", text: "Reststrom gebündelt einkaufen, Solarstrom aus den Parks für die Tagesstunden nutzen, Flexibilität zu Geld machen.", href: "/reststrom" },
  { icon: LineChart, title: "Investoren & Parkbetreiber", text: "Erlöse aus Direktvermarktung, PPA und Speicher kombinieren – mit einem Abnehmerpool, der die Vermarktung planbarer macht.", href: "/investoren" },
  { icon: Tractor, title: "Landwirte mit Agri-PV", text: "Ihre Anlage wird Teil des Verbunds; über die geplante Genossenschaft können Sie zusätzlich Mitglied werden.", href: "/landwirte" },
  { icon: Users, title: "Gemeinden & Gemeinschaften", text: "Energiegemeinschaften mit Strom aus Parks der Region versorgen – in DE, AT und CH nach den jeweiligen Regeln.", href: "/energiegemeinschaften" },
];

const REGELN = [
  { titel: "Direktvermarktung (EEG)", text: "Neuere Anlagen ab 100 kW vermarkten ihren Strom in der Regel direkt und müssen fernsteuerbar sein." },
  { titel: "Redispatch 2.0", text: "Seit Oktober 2021 sind Anlagen ab 100 kW in das Engpassmanagement der Netzbetreiber einbezogen – mit Daten- und Meldepflichten." },
  { titel: "Regelleistung", text: "Für Primär- und Sekundärregelleistung ist eine Präqualifikation beim Übertragungsnetzbetreiber nötig; kleine Einheiten dürfen im Pool anbieten." },
  { titel: "§ 14a EnWG", text: "Steuerbare Verbrauchseinrichtungen wie Wärmepumpen, Wallboxen und Speicher im Niederspannungsnetz erhalten reduzierte Netzentgelte, wenn der Netzbetreiber sie im Engpass dimmen darf." },
];

const QUERVERWEISE = [
  { href: "/reststrom", titel: "Reststrom-Pool Mittelstand", text: "Was PV und Speicher nicht decken – gebündelt und günstiger beschafft." },
  { href: "/grossspeicher", titel: "Großspeicher", text: "Batteriespeicher am Netzknoten und im Park – Erlösquellen und Planung." },
  { href: "/energie-live", titel: "Strommarkt live", text: "Börsenpreis, Solar-Capture-Rate und negative Preise in Echtzeit." },
  { href: "/rechner/reststrom", titel: "Reststrom-Rechner", text: "Ersparnis durch den Pool für Ihr Lastprofil in einer Minute." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Virtuelles Kraftwerk ÖkoInvest",
  serviceType: "Virtuelles Kraftwerk: Direktvermarktung, Flexibilitätsvermarktung, Pool-Beschaffung, Monitoring",
  description:
    "Verbund aus Solarparks, Agri-PV, Solarcarports, Speichern und mittelständischen Verbrauchern mit gemeinsamer Vermarktung und Beschaffung.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: [
    { "@type": "Country", name: "Deutschland" },
    { "@type": "Country", name: "Österreich" },
    { "@type": "Country", name: "Schweiz" },
  ],
  url: abs(PFAD),
};

export const revalidate = 900;

export default async function VirtuellesKraftwerkPage() {
  const live = await liveStart();
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Virtuelles Kraftwerk" }]}
        eyebrow="Virtuelles Kraftwerk"
        title={
          <>
            Viele Anlagen. <span className="ov-text-gradient-light">Ein Kraftwerk.</span>
          </>
        }
        lead="Wir verbinden Solarparks, Agri-PV, Solarcarports und Speicher mit dem Strombedarf mittelständischer Unternehmen. Eine Leitwarte plant im Viertelstundenraster, vermarktet gemeinsam und beschafft gemeinsam – das senkt Kosten auf beiden Seiten."
        points={["Erzeugung, Speicher und Verbrauch im Verbund", "Direktvermarktung und Flexibilität", "Gebündelte Beschaffung für den Mittelstand"]}
        actions={[
          { label: "Energiefluss ansehen", href: "#energiefluss" },
          { label: "Reststrom-Pool", href: "/reststrom" },
        ]}
      >
        <div className="ov-hero-in mt-12 max-w-2xl" style={{ "--ov-delay": "380ms" }}>
          <VppLiveSignal initial={live} />
        </div>
      </PageHero>

      <Section tone="white" space="lg">
        <SplitMedia
          eyebrow="Das Prinzip"
          title="Was ist ein virtuelles Kraftwerk?"
          text={[
            "Ein einzelner Solarpark liefert, wenn die Sonne scheint. Ein Unternehmen verbraucht, wenn es produziert. Beides passt selten genau zusammen – und genau diese Lücke kostet Geld: Mittags fällt der Börsenpreis, abends steigt er.",
            "Ein virtuelles Kraftwerk verbindet viele Anlagen über Software und Fernsteuerung zu einem Verbund. Es prognostiziert Erzeugung und Verbrauch, verschiebt Energie mit Speichern und flexiblen Lasten und tritt am Markt auf wie ein großes Kraftwerk. Physisch bleibt jede Anlage, wo sie ist.",
          ]}
          points={[
            { title: "Prognose", text: "Wetter, Lastgänge und Börsenpreise im Viertelstundenraster" },
            { title: "Steuerung", text: "Fahrpläne für Parks, Speicher und flexible Verbraucher" },
            { title: "Vermarktung", text: "gemeinsam statt jede Anlage für sich" },
          ]}
          image={{ src: "/img/pv-wind-abend.jpg", alt: "Photovoltaik- und Windanlagen in der Abendsonne" }}
        />
      </Section>

      <Section tone="sand" space="lg" id="energiefluss" className="scroll-mt-24">
        <SectionHeading
          eyebrow="So funktioniert unser Verbund"
          title={
            <>
              Energieflüsse im <span className="ov-text-gradient">Tagesverlauf</span>
            </>
          }
          lead="Wählen Sie eine Situation und tippen Sie auf die Bausteine. Die Grafik zeigt vereinfacht, wie die Leitwarte Erzeugung, Speicher und Verbrauch aufeinander abstimmt."
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale">
          <EnergieflussGrafik />
        </Reveal>
        <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
          Schematische Darstellung. Energie fließt physikalisch über das öffentliche Netz; die Zuordnung zu den Pool-Teilnehmern erfolgt bilanziell über den
          Bilanzkreis des Lieferanten.
        </p>
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Die drei Bausteine"
          title="Erzeuger, Speicher, Verbraucher"
          lead="Erst das Zusammenspiel macht den Verbund wertvoll: Erzeugung ohne Abnehmer ist Börsenrisiko, Verbrauch ohne eigene Erzeugung ist Preisrisiko."
          className="mb-10 md:mb-14"
        />
        <FeatureGrid items={BAUSTEINE} cols={3} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { icon: Sun, t: "Solarparks", s: "Freifläche, Süd oder Ost/West" },
            { icon: Sprout, t: "Agri-PV", s: "vertikal oder hoch aufgeständert" },
            { icon: Car, t: "Solarcarports", s: "Erzeugung direkt beim Verbraucher" },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 70} className="flex items-center gap-3 rounded-2xl bg-sand-50 px-5 py-4 ring-1 ring-ink-200/60">
              <x.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-sun-500" />
              <p className="text-[14.5px] text-ink-700">
                <strong className="font-semibold text-ink-900">{x.t}</strong> · {x.s}
              </p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-40 top-10 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative">
          <SectionHeading
            dark
            eyebrow="Leistungen"
            title="Was das virtuelle Kraftwerk leistet"
            lead="Vier Aufgaben, eine Leitwarte. Welche davon für Ihre Anlage oder Ihr Unternehmen sinnvoll sind, klären wir im Einzelfall."
            className="mb-10 md:mb-14"
          />
          <FeatureGrid items={LEISTUNGEN} cols={2} tone="dark" />
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Für wen" title="Wer vom Verbund profitiert" className="mb-8" />
            <FeatureGrid items={ZIELGRUPPEN} cols={2} />
          </div>
          <Reveal className="self-start rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-700">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Rahmen in Deutschland
            </p>
            <h3 className="mt-3 font-display text-[22px] font-bold leading-snug text-ink-900">Die Regeln, nach denen ein Verbund spielt</h3>
            <ul className="mt-6 space-y-5">
              {REGELN.map((r) => (
                <li key={r.titel} className="flex gap-3">
                  <Radio aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-600" />
                  <div>
                    <p className="font-semibold text-ink-900">{r.titel}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-ink-200 pt-5 text-[13.5px] leading-relaxed text-ink-500">
              <Activity aria-hidden="true" className="mr-1.5 inline h-4 w-4 align-[-3px] text-ov-600" />
              Unser Verbund wächst mit jedem Park und jedem Pool-Teilnehmer. Die Belieferung der Unternehmen erfolgt über einen lizenzierten Energielieferanten;
              Direktvermarktung und Regelleistung setzen wir mit präqualifizierten Partnern um.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Häufige Fragen"
            title="Virtuelles Kraftwerk verständlich erklärt"
            lead="Direktvermarktung, Speicher, Redispatch – die wichtigsten Antworten nach aktuellem Stand."
          />
          <Faq items={FAQ_VPP} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Teil des Verbunds werden"
        title="Anlage einbringen oder Reststrom bündeln?"
        text="Ob Solarpark, Speicher oder Stromverbrauch im Mittelstand: Wir prüfen, welche Rolle Ihre Anlage oder Ihr Unternehmen im virtuellen Kraftwerk spielen kann – kostenlos und unverbindlich."
        primary={{ label: "Reststrom-Ersparnis berechnen", href: "/rechner/reststrom" }}
        secondary={{ label: "Anfrage stellen", href: "/kontakt?anliegen=reststrom" }}
      />
    </div>
  );
}

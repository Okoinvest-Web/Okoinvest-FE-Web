import { Activity, BatteryCharging, Building2, Calculator, Car, Clock, Factory, Gauge, LineChart, Radio, ShoppingCart, Sprout, Sun, Tractor, Users } from "lucide-react";
import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import HeroBuehne from "@/components/Energie/Vpp/HeroBuehne";
import Prinzip from "@/components/Energie/Vpp/Prinzip";
import { Bausteine, Einstieg, FuerWen, Leistungen } from "@/components/Energie/Vpp/Abschnitte";
import Section from "@/components/ui/Section";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import EnergieflussGrafik from "@/components/Energie/EnergieflussGrafik";
import { liveStart } from "@/components/Energie/liveStart";
import { FAQ_VPP } from "@/data/faq";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/virtuelles-kraftwerk");

const metadata = rechnerMetadata({
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
  { icon: Building2, title: "Unternehmen & Mittelstand", text: "Reststrom gebündelt einkaufen, Solarstrom aus den Parks für die Tagesstunden nutzen, Flexibilität zu Geld machen.", href: seitenPfad("/reststrom") },
  { icon: LineChart, title: "Investoren & Parkbetreiber", text: "Erlöse aus Direktvermarktung, PPA und Speicher kombinieren – mit einem Abnehmerpool, der die Vermarktung planbarer macht.", href: "/investoren" },
  { icon: Tractor, title: "Landwirte mit Agri-PV", text: "Ihre Anlage wird Teil des Verbunds; über die geplante Genossenschaft können Sie zusätzlich Mitglied werden.", href: seitenPfad("/landwirte") },
  { icon: Users, title: "Gemeinden & Gemeinschaften", text: "Energiegemeinschaften mit Strom aus Parks der Region versorgen – in DE, AT und CH nach den jeweiligen Regeln.", href: seitenPfad("/energiegemeinschaften") },
];

const REGELN = [
  { titel: "Direktvermarktung (EEG)", text: "Neuere Anlagen ab 100 kW vermarkten ihren Strom in der Regel direkt und müssen fernsteuerbar sein." },
  { titel: "Redispatch 2.0", text: "Seit Oktober 2021 sind Anlagen ab 100 kW in das Engpassmanagement der Netzbetreiber einbezogen – mit Daten- und Meldepflichten." },
  { titel: "Regelleistung", text: "Für Primär- und Sekundärregelleistung ist eine Präqualifikation beim Übertragungsnetzbetreiber nötig; kleine Einheiten dürfen im Pool anbieten." },
  { titel: "§ 14a EnWG", text: "Steuerbare Verbrauchseinrichtungen wie Wärmepumpen, Wallboxen und Speicher im Niederspannungsnetz erhalten reduzierte Netzentgelte, wenn der Netzbetreiber sie im Engpass dimmen darf." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/reststrom"), icon: Building2, titel: "Reststrom-Pool Mittelstand", text: "Was PV und Speicher nicht decken – gebündelt und günstiger beschafft." },
  { href: seitenPfad("/grossspeicher"), icon: BatteryCharging, titel: "Großspeicher", text: "Batteriespeicher am Netzknoten und im Park – Erlösquellen und Planung." },
  { href: seitenPfad("/energie-live"), icon: Activity, titel: "Strommarkt live", text: "Börsenpreis, Solar-Capture-Rate und negative Preise in Echtzeit." },
  { href: seitenPfad("/rechner/reststrom"), icon: Calculator, titel: "Reststrom-Rechner", text: "Ersparnis durch den Pool für Ihr Lastprofil in einer Minute." },
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

export default async function VirtuellesKraftwerkPage({ params }) {
  await landDerSeite(params, "/virtuelles-kraftwerk");
  const live = await liveStart();
  return (
    <div>
      <JsonLd daten={schema} />

      <SeitenHero
        breadcrumbs={[{ name: "Virtuelles Kraftwerk" }]}
        pill={{ marke: "Live", text: "Börsenpreis und Signal der Leitwarte – jetzt", kurz: "Strommarkt live", href: seitenPfad("/energie-live") }}
        titel={
          <>
            Viele Anlagen. <span className="ov-text-gradient-light">Ein Kraftwerk.</span>
          </>
        }
        lead="Wir verbinden Solarparks, Agri-PV, Solarcarports und Speicher mit dem Strombedarf mittelständischer Unternehmen. Eine Leitwarte plant im Viertelstundenraster, vermarktet gemeinsam und beschafft gemeinsam – das senkt Kosten auf beiden Seiten."
        primaer={{ label: "Teil des Verbunds werden", href: "#anfrage" }}
        sekundaer={{ label: "Energiefluss ansehen", href: "#energiefluss", icon: Activity }}
        hinweis="Für Parkbetreiber, Investoren, Landwirte, Gemeinden und den Mittelstand"
        chips={["Erzeugung, Speicher und Verbrauch im Verbund", "Direktvermarktung und Flexibilität", "Gebündelte Beschaffung für den Mittelstand", "Monitoring und Meldewesen gebündelt"]}
        buehne={<HeroBuehne live={live} />}
        bildunterschrift="Verbund schematisch · Börsenpreis live (Day-Ahead, netto)"
      />

      <Faktenleiste
        titel="Regeln, nach denen ein Verbund spielt"
        items={[
          { icon: Clock, wert: "15 min", zahl: { wert: 15, nach: " min" }, einheit: "Viertelstundenraster", text: "Prognosen und Fahrpläne für Parks, Speicher und Verbraucher" },
          { icon: LineChart, wert: "100 kW", zahl: { wert: 100, nach: " kW" }, einheit: "Direktvermarktung", text: "neuere EEG-Anlagen ab 100 kW vermarkten in der Regel direkt" },
          { icon: Radio, wert: "2021", einheit: "Redispatch 2.0", text: "seit Oktober 2021 mit Daten- und Meldepflichten ab 100 kW" },
          { icon: Gauge, wert: "§ 14a", einheit: "EnWG", text: "reduzierte Netzentgelte für steuerbare Verbrauchseinrichtungen" },
        ]}
      />

      <Prinzip />

      <Section tone="sand" space="lg" id="energiefluss" data-abschnitt="energiefluss" aria-labelledby="energiefluss-titel" className="scroll-mt-24">
        <Kopf
          id="energiefluss-titel"
          eyebrow="So funktioniert unser Verbund"
          titel={
            <>
              Energieflüsse im <span className="ov-text-gradient">Tagesverlauf</span>
            </>
          }
          lead="Wählen Sie eine Situation und tippen Sie auf die Bausteine. Die Grafik zeigt vereinfacht, wie die Leitwarte Erzeugung, Speicher und Verbrauch aufeinander abstimmt."
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale" className="rounded-[2rem] bg-white p-3 shadow-e4 ring-1 ring-ink-200/70 sm:p-5">
          <EnergieflussGrafik />
        </Reveal>
        <p className="mt-5 text-[13px] leading-relaxed text-ink-500">
          Schematische Darstellung. Energie fließt physikalisch über das öffentliche Netz; die Zuordnung zu den Pool-Teilnehmern erfolgt bilanziell über den Bilanzkreis des Lieferanten.
        </p>
      </Section>

      <Bausteine
        items={BAUSTEINE}
        arten={[
          { icon: Sun, t: "Solarparks", s: "Freifläche, Süd oder Ost/West" },
          { icon: Sprout, t: "Agri-PV", s: "vertikal oder hoch aufgeständert" },
          { icon: Car, t: "Solarcarports", s: "Erzeugung direkt beim Verbraucher" },
        ]}
      />

      <Leistungen items={LEISTUNGEN} />

      <FuerWen zielgruppen={ZIELGRUPPEN} regeln={REGELN} />

      <Section tone="sand" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow="Häufige Fragen" titel="Virtuelles Kraftwerk verständlich erklärt" lead="Direktvermarktung, Speicher, Redispatch – die wichtigsten Antworten nach aktuellem Stand." />
          </div>
          <Faq items={FAQ_VPP} />
        </div>
      </Section>

      <Einstieg />

      <Weiterlesen items={QUERVERWEISE} titel="Tiefer einsteigen" text="Pool, Speicher und Strommarkt – in Ruhe nachlesen und rechnen." />
    </div>
  );
}

export const generateMetadata = landMetadata("/virtuelles-kraftwerk", metadata);

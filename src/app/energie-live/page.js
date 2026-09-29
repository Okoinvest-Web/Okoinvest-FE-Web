// energie-live/page.js – Strommarkt Deutschland live

import { Activity, AlertTriangle, BatteryCharging, Clock, Database, ExternalLink, Scale, Sun } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import LiveKennzahlen from "@/components/EnergieLive/LiveKennzahlen";
import PreisChart from "@/components/EnergieLive/PreisChart";
import ErzeugungChart from "@/components/EnergieLive/ErzeugungChart";
import Empfehlungen from "@/components/EnergieLive/Empfehlungen";
import MeritOrder from "@/components/EnergieLive/MeritOrder";
import CaptureRate from "@/components/EnergieLive/CaptureRate";
import { abs } from "@/data/site";
import { getEnergySnapshot } from "@/lib/energy";
import { preisTage, zeitfenster, ct, gw, uhr, spanne, tagLang } from "@/components/EnergieLive/berechnung";

export const revalidate = 900;

const PAGE_URL = abs("/energie-live");
const OG_BILD = abs("/img/solarpark-himmel.jpg");

export async function generateMetadata() {
  const title = "Strompreis Börse live: Day-Ahead & Capture-Rate | ÖkoInvest";
  let description =
    "Börsenstrompreis live: Day-Ahead-Preis in 15-Minuten-Werten, Solar-Capture-Rate, negative Preise und Strommix – eingeordnet für Unternehmen und Investoren.";
  try {
    const s = await getEnergySnapshot();
    const a = s.preis.aktuell;
    if (a) {
      description = `Börsenstrompreis jetzt ${ct(a.eurMwh)} ct/kWh. Day-Ahead in 15-Minuten-Werten, Solar-Capture-Rate, negative Preise und Strommix für Unternehmen und Investoren.`;
    }
  } catch {
    // statische Beschreibung genügt
  }
  return {
    title,
    description,
    keywords: [
      "Strompreis Börse aktuell",
      "Day-Ahead Preis heute",
      "Börsenstrompreis",
      "Strompreis live",
      "negative Strompreise",
      "EPEX Spot Preis",
      "Solar Capture Rate",
      "Capture Price Solar",
      "Strommix Deutschland",
    ],
    alternates: { canonical: PAGE_URL },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "de_DE",
      url: PAGE_URL,
      siteName: "ÖkoInvest",
      title: "Strommarkt Deutschland live – Börsenstrompreis & Strommix",
      description,
      images: [{ url: OG_BILD, width: 1280, height: 852, alt: "ÖkoInvest – Strommarkt live" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_BILD] },
  };
}

const FAQ = [
  {
    q: "Was ist der Day-Ahead-Preis?",
    a: "Der Day-Ahead-Preis ist der Großhandelspreis für Strom, der am Vortag in einer Auktion an der Strombörse (EPEX Spot) für jede Viertelstunde des Folgetages ermittelt wird. Die Ergebnisse für Deutschland und Luxemburg (Gebotszone DE-LU) werden gegen 13 Uhr veröffentlicht. Seit Oktober 2025 wird der Day-Ahead-Markt in 15-Minuten-Produkten gehandelt.",
  },
  {
    q: "Was zahlt ein Unternehmen im Vergleich zum Börsenpreis?",
    a: "Der Börsenpreis ist nur ein Teil des Gewerbestrompreises. Hinzu kommen Strukturierungs- und Vertriebskosten des Lieferanten, Netzentgelte, Umlagen, Konzessionsabgabe und Stromsteuer. Die meisten Betriebe haben einen Festpreis, der Monate im Voraus am Terminmarkt beschafft wurde – die Schwankungen der Day-Ahead-Preise kommen dann nur indirekt über den nächsten Vertrag an.",
  },
  {
    q: "Was ist die Solar-Capture-Rate?",
    a: "Die Capture-Rate setzt den durchschnittlichen Börsenerlös von Solarstrom (Capture-Preis, gewichtet mit der Einspeisung) ins Verhältnis zum Tagesdurchschnitt aller Viertelstunden (Base). Weil viele Solaranlagen gleichzeitig einspeisen, liegt der Capture-Preis im Sommer oft deutlich unter dem Base-Preis. Für ungeförderte Solarparks ist sie eine der wichtigsten Kennzahlen.",
  },
  {
    q: "Warum gibt es negative Strompreise?",
    a: "Negative Preise entstehen, wenn mehr Strom angeboten als nachgefragt wird – typischerweise an sonnigen, windigen Feiertagen oder Wochenenden zur Mittagszeit. Konventionelle Kraftwerke lassen sich nicht beliebig schnell herunterfahren, und viele ältere Solaranlagen speisen ungesteuert ein. Erzeuger zahlen dann dafür, dass jemand den Strom abnimmt.",
  },
  {
    q: "Was bedeuten negative Preise für einen Solarpark?",
    a: "Für Anlagen, die seit dem 25. Februar 2025 (Solarspitzengesetz) in Betrieb gehen, entfällt die Marktprämie in Zeiträumen mit negativen Börsenpreisen; diese Zeiten werden am Ende des Förderzeitraums angehängt. Direktvermarktete Parks werden in solchen Viertelstunden in der Regel abgeregelt. Speicher, PPAs und flexible Abnehmer machen Parks unabhängiger davon.",
  },
  {
    q: "Warum zählen Speicher und Flexibilität?",
    a: "Die Preisspanne zwischen Mittag und Abend wächst mit jedem zusätzlichen Gigawatt Solar. Speicher verschieben Strom in die teuren Stunden, flexible Verbraucher ziehen Last in die günstigen. Beides stabilisiert die Erlöse von Solarparks und senkt die Beschaffungskosten von Unternehmen – das ist der Kern eines virtuellen Kraftwerks.",
  },
  {
    q: "Woher stammen die Daten und wie aktuell sind sie?",
    a: "Börsenpreise und Stromerzeugung stammen von Energy-Charts des Fraunhofer-Instituts für Solare Energiesysteme ISE (Lizenz CC BY 4.0). Fällt diese Quelle aus, nutzen wir für die Preise ersatzweise die stündlichen Day-Ahead-Werte von aWATTar. Die Seite aktualisiert sich alle fünf Minuten; Erzeugungsdaten laufen mit etwas Verzögerung ein. Alle Angaben ohne Gewähr.",
  },
];

const QUERVERWEISE = [
  { href: "/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und Unternehmen die Preisspanne gemeinsam nutzen." },
  { href: "/reststrom", titel: "Reststrom-Pool Mittelstand", text: "Gebündelt und strukturiert beschaffen statt zum Stichtag." },
  { href: "/grossspeicher", titel: "Großspeicher", text: "Batteriespeicher am Netzknoten und im Park – Erlösquellen und Planung." },
  { href: "/rechner/solarpark", titel: "Solarpark-Renditerechner", text: "IRR und Cashflow mit EEG, PPA oder Marktwert." },
];

export default async function EnergieLivePage() {
  const s = await getEnergySnapshot();
  const jetzt = Date.parse(s.stand);
  const tage = preisTage(s.preis, jetzt);
  const fenster = tage.heute ? zeitfenster(tage.heute.punkte, 180, tage.schrittMs).guenstig : null;

  // Kompakte Startwerte für die Client-Bausteine (klein halten: RSC-Payload)
  const kompakt = {
    stand: s.stand,
    preis: { quelle: s.preis.quelle, aufloesungMin: s.preis.aufloesungMin, punkte: s.preis.punkte },
    erzeugung: {
      quelle: s.erzeugung.quelle,
      zeitpunkt: s.erzeugung.zeitpunkt,
      solarMw: s.erzeugung.solarMw,
      windMw: s.erzeugung.windMw,
      lastMw: s.erzeugung.lastMw,
      eeAnteil: s.erzeugung.eeAnteil,
      solarAnteil: s.erzeugung.solarAnteil,
    },
  };
  const nurErzeugung = { stand: s.stand, preis: null, erzeugung: s.erzeugung };
  const solarReihe = { zeiten: s.erzeugung.zeiten || [], werte: s.erzeugung.serien?.solar || [] };

  // Zitierfähiger Antwortsatz (auch ohne JavaScript im HTML)
  const antwort = tage.heute
    ? `Am ${tagLang(tage.heute.start)} kostet Strom an der Börse im Schnitt ${ct(tage.heute.avg)} ct/kWh (netto). Am günstigsten ist er um ${uhr(tage.heute.min.t)} Uhr mit ${ct(tage.heute.min.eurMwh)} ct/kWh, am teuersten um ${uhr(tage.heute.max.t)} Uhr mit ${ct(tage.heute.max.eurMwh)} ct/kWh${fenster ? `; das günstigste 3-Stunden-Fenster liegt zwischen ${spanne(fenster.start, fenster.ende)}` : ""}.`
    : "Der Day-Ahead-Preis wird für jede Viertelstunde des Folgetages an der Strombörse ermittelt und gegen 13 Uhr veröffentlicht.";

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${PAGE_URL}/#dataset`,
    name: "Strommarkt Deutschland live: Day-Ahead-Börsenstrompreis und Stromerzeugung nach Quelle",
    description:
      "Day-Ahead-Großhandelspreis für Strom in der Gebotszone Deutschland-Luxemburg in 15-Minuten-Auflösung sowie öffentliche Nettostromerzeugung nach Energieträger und Netzlast für Deutschland, fortlaufend aktualisiert.",
    url: PAGE_URL,
    keywords: ["Day-Ahead", "Börsenstrompreis", "Strommix", "Erneuerbare Energien", "Deutschland"],
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "Fraunhofer-Institut für Solare Energiesysteme ISE – Energy-Charts", url: "https://www.energy-charts.info" },
    publisher: { "@id": `${abs("/")}/#organization` },
    spatialCoverage: { "@type": "Place", name: "Deutschland" },
    temporalCoverage: tage.heute ? new Date(tage.heute.start).toISOString().slice(0, 10) : undefined,
    dateModified: s.stand,
    variableMeasured: [
      { "@type": "PropertyValue", name: "Day-Ahead-Preis DE-LU", unitText: "EUR/MWh" },
      { "@type": "PropertyValue", name: "Nettostromerzeugung je Energieträger", unitText: "MW" },
      { "@type": "PropertyValue", name: "Netzlast", unitText: "MW" },
      { "@type": "PropertyValue", name: "Anteil erneuerbarer Energien an der Last", unitText: "Prozent" },
    ],
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: abs("/api/energie/live?voll=1") },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}/#webpage`,
    url: PAGE_URL,
    name: "Strommarkt Deutschland live – Börsenstrompreis aktuell & Day-Ahead-Preis heute",
    description: antwort,
    isPartOf: { "@id": `${abs("/")}/#website` },
    about: { "@id": `${PAGE_URL}/#dataset` },
    dateModified: s.stand,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Wissen", href: "/ratgeber" }, { name: "Strommarkt live" }]}
        eyebrow="Energie live · Deutschland"
        title={
          <>
            Strommarkt Deutschland <span className="ov-text-gradient-light">live</span>
          </>
        }
        lead="Börsenstrompreis, Strommix und Solar-Capture-Rate – viertelstündlich aus offenen Daten des Fraunhofer ISE. Eingeordnet für Unternehmen, die Strom beschaffen, und Investoren, die Solarparks und Speicher bewerten."
      >
        <LiveKennzahlen initial={kompakt} />
      </PageHero>

      {/* Preisverlauf */}
      <Section tone="white" space="lg" id="preisverlauf" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Day-Ahead-Preis heute"
          title={
            <>
              Wann Strom heute <span className="ov-text-gradient">am günstigsten</span> ist
            </>
          }
          lead={antwort}
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale">
          <PreisChart initial={kompakt} />
        </Reveal>
      </Section>

      {/* Was bedeutet das für Sie? */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="Was bedeutet das für Sie?"
          title="Aus Börsendaten werden Entscheidungen"
          lead="Für Unternehmen zählt, wann Strom günstig ist und wie viel Flexibilität wert ist. Für Investoren zählt, welche Preisspanne ein Speicher heben kann – und was Solarstrom mittags tatsächlich erlöst."
          className="mb-10 md:mb-12"
        />
        <Empfehlungen initial={kompakt} />
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
          Orientierung, keine Beratung: Berechnet aus den veröffentlichten Day-Ahead-Preisen, netto und ohne Netzentgelte, Umlagen und Steuern. Was sich
          davon im eigenen Betrieb oder Projekt heben lässt, hängt von Vertrag, Messung und Flexibilität ab.
        </p>
      </Section>

      {/* Strommix */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Stromerzeugung nach Quelle"
          title={
            <>
              Der Strommix der <span className="ov-text-gradient">letzten 24 Stunden</span>
            </>
          }
          lead={
            s.erzeugung.eeAnteil != null
              ? `Zuletzt (${uhr(s.erzeugung.zeitpunkt)} Uhr) deckten erneuerbare Energien ${Math.round(s.erzeugung.eeAnteil)} % des Stromverbrauchs in Deutschland: ${gw(s.erzeugung.solarMw)} GW Solar und ${gw(s.erzeugung.windMw)} GW Wind bei einer Netzlast von ${gw(s.erzeugung.lastMw)} GW.`
              : "Wie viel Strom aus Sonne, Wind, Biomasse, Wasser, Kohle und Gas stammt – und wie sich das über den Tag verschiebt."
          }
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale">
          <ErzeugungChart initial={nurErzeugung} />
        </Reveal>
      </Section>

      {/* Solar-Capture-Rate */}
      <Section tone="sand" space="lg" id="capture-rate" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Für Investoren"
          title={
            <>
              Was Solarstrom heute <span className="ov-text-gradient">wirklich erlöst</span>
            </>
          }
          lead="Die Capture-Rate zeigt, wie viel ein Solarpark im Vergleich zum Tagesdurchschnitt an der Börse verdient. Sie sinkt, je mehr Solar gleichzeitig einspeist – und ist der Grund, warum Speicher, PPAs und flexible Abnehmer an Wert gewinnen."
          className="mb-10 md:mb-12"
        />
        <CaptureRate initial={kompakt} initialSolar={solarReihe} />
      </Section>

      {/* Merit-Order & negative Preise */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Hintergrund"
              title="Warum der Strompreis schwankt – und manchmal negativ wird"
              lead="An der Börse bestimmt das teuerste Kraftwerk, das zur Deckung der Nachfrage gerade noch gebraucht wird, den Preis für alle. Dieses Prinzip heißt Merit-Order."
            />
            <ul className="mt-10 space-y-6">
              {[
                {
                  icon: Scale,
                  titel: "Merit-Order",
                  text: "Kraftwerke werden nach ihren Grenzkosten sortiert. Wind und Sonne kosten fast nichts, Gas am meisten. Je mehr Erneuerbare einspeisen, desto weiter rechts endet die Kurve – und desto günstiger wird Strom.",
                },
                {
                  icon: AlertTriangle,
                  titel: "Negative Preise",
                  text: "Übersteigt das Angebot die Nachfrage, fällt der Preis unter null. Unflexible Kraftwerke und ungesteuerte Einspeisung zahlen dann lieber, als abzuschalten.",
                },
                {
                  icon: Sun,
                  titel: "Was das für Parks und Unternehmen heißt",
                  text: "Mittags ist Solarstrom an der Börse wenig wert, abends ist Strom teuer. Speicher, PPAs und flexible Verbraucher verbinden beide Seiten – genau das leistet ein virtuelles Kraftwerk.",
                },
              ].map((p, i) => (
                <Reveal as="li" key={p.titel} delay={i * 80} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300">
                    <p.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-[18px] font-bold text-white">{p.titel}</h3>
                    <p className="mt-1.5 text-[15.5px] leading-relaxed text-white/65">{p.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal dir="right">
            <MeritOrder />
          </Reveal>
        </div>
      </Section>

      {/* FAQ + Quellen */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Häufige Fragen"
              title="Börsenstrompreis verständlich erklärt"
              lead="Day-Ahead, Capture-Rate, negative Preise – die wichtigsten Antworten, Stand 2026."
            />
            <Reveal className="mt-10 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Database aria-hidden="true" className="h-4 w-4 text-ov-600" />
                Quellen & Methodik
              </h3>
              <ul className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-600">
                <li className="flex gap-2.5">
                  <Activity aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  <span>
                    Börsenpreise und Erzeugung:{" "}
                    <a href="https://www.energy-charts.info/?l=de&c=DE" target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                      Fraunhofer ISE – Energy-Charts
                      <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
                    </a>
                    , Lizenz{" "}
                    <a href="https://creativecommons.org/licenses/by/4.0/deed.de" target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                      CC BY 4.0
                    </a>
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <BatteryCharging aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  <span>Ersatzquelle für Preise: aWATTar (stündliche Day-Ahead-Werte)</span>
                </li>
                <li className="flex gap-2.5">
                  <Clock aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  <span>
                    Datenstand: {tagLang(jetzt)}, {uhr(jetzt)} Uhr · Aktualisierung alle 5 Minuten · Preise netto in ct/kWh (1 €/MWh = 0,1 ct/kWh)
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-[13px] text-ink-500">Alle Angaben ohne Gewähr. Keine Anlage- oder Tarifberatung.</p>
            </Reveal>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Vom Marktsignal zum Vorteil"
        title="Nutzen Sie die Preisspanne – als Unternehmen oder Investor."
        text="Unternehmen senken im Reststrom-Pool ihre Beschaffungskosten. Investoren finden auf der Projektbörse Solarparks und Speicherprojekte in allen Phasen."
        primary={{ label: "Reststrom-Ersparnis berechnen", href: "/rechner/reststrom" }}
        secondary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
      />
    </div>
  );
}

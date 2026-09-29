import Link from "next/link";
import { ArrowUpRight, Calculator, ClipboardCheck, Coins, Eye, FileText, Flower2, HandCoins, Handshake, Landmark, Megaphone, Receipt, Share2, Sprout, Users, Vote, Zap, Factory, MapPinned } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import { abs, SITE } from "@/data/site";
import { KOMMUNE, GEMEINSCHAFTEN, STAND } from "@/lib/invest/markt";
import { rechneKommune } from "@/lib/rechner/kommune";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/kommunen";
const TITEL = "Solarparks für Kommunen & Stadtwerke | ÖkoInvest";
const BESCHREIBUNG =
  "Was Solarparks Gemeinden bringen: Gewerbesteuer zu 90 % am Standort, § 6 EEG mit 0,2 ct/kWh, Pacht, Bürgerbeteiligung – dazu Bauleitplanung und Kriterien.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarpark Gemeinde", "Kommunalbeteiligung § 6 EEG", "Gewerbesteuer Solarpark", "Bauleitplanung Freiflächen-PV", "Kriterienkatalog Freiflächen-Photovoltaik", "Stadtwerke Solarpark", "Bürgerbeteiligung Solarpark"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/solarpark-baeume.jpg"), width: 1280, height: 852, alt: "Solarpark mit Bäumen am Rand" }] },
};

const beispiel = rechneKommune({ mwp: 20, paragraph6: true, gemeindeflaeche: false });
const tsd = (v) => (v >= 1e6 ? `${fmt(v / 1e6, 1)} Mio. €` : `${fmt(Math.round(v / 1000))} T€`);

const FAQ = [
  {
    q: "Was bringt ein Solarpark einer Gemeinde konkret?",
    a: `Drei direkte Einnahmen: die freiwillige Zahlung nach § 6 EEG von bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh ab dem ersten Jahr, die Gewerbesteuer – bei Solaranlagen zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % an der Standortgemeinde – und Pacht, wenn Gemeindeflächen genutzt werden. Bei einem 20-MWp-Park kommen allein aus § 6 EEG rund ${tsd(beispiel.jahre[0].p6)} im Jahr zusammen. Dazu kommen Aufträge für regionale Betriebe und Beteiligungsmöglichkeiten für Bürger.`,
  },
  {
    q: "Wie läuft das Bauleitplanverfahren?",
    a: "In der Regel stellt die Gemeinde einen vorhabenbezogenen oder angebotsbezogenen Bebauungsplan auf und ändert parallel den Flächennutzungsplan. Nach dem Aufstellungsbeschluss folgen die frühzeitige Beteiligung von Öffentlichkeit und Behörden, der Entwurf mit Umweltbericht, die öffentliche Auslegung, die Abwägung und der Satzungsbeschluss. Die Planungskosten trägt üblicherweise der Projektentwickler über einen städtebaulichen Vertrag. Realistisch sind ein bis zwei Jahre.",
  },
  {
    q: "Braucht jeder Solarpark einen Bebauungsplan?",
    a: "Nicht jeder. Nach § 35 Abs. 1 Nr. 8 b BauGB sind Freiflächenanlagen in einem 200-Meter-Streifen entlang von Autobahnen und Schienenwegen des übergeordneten Netzes mit mindestens zwei Hauptgleisen privilegiert. Kleine Agri-PV-Anlagen bis 2,5 ha Grundfläche mit räumlich-funktionalem Bezug zu einem landwirtschaftlichen Betrieb sind ebenfalls privilegiert. Auch dann bleibt die Gemeinde über ihr Einvernehmen beteiligt – und viele Betreiber bieten die § 6-Zahlung trotzdem an.",
  },
  {
    q: "Wozu ein Kriterienkatalog?",
    a: "Ein vom Gemeinderat beschlossener Kriterienkatalog macht transparent, welche Flächen für Solarparks in Frage kommen und welche Anforderungen gelten – etwa zu Bodengüte, Abstand zur Wohnbebauung, Landschaftsbild, Naturschutz, Größe, Bürgerbeteiligung und Rückbausicherheit. Das spart Zeit im Verfahren und schafft Akzeptanz, weil alle Projektträger nach denselben Regeln bewertet werden.",
  },
  {
    q: "Wie können sich Bürger beteiligen?",
    a: "Über eine Genossenschaft mit kleinen Anteilen, über Nachrangdarlehen oder über vergünstigte Stromtarife. Mit Energy Sharing nach § 42c EnWG können Bürger und Gemeinde künftig Strom aus Anlagen in der Region gemeinsam nutzen. Einige Bundesländer verlangen inzwischen ausdrücklich Beteiligungsangebote für Bürger und Gemeinden.",
  },
  {
    q: "Wie ist die Lage in Österreich und der Schweiz?",
    a: "In Österreich widmet die Gemeinde Flächen für Photovoltaik (z. B. als Grünland-Photovoltaik) im Rahmen der Raumordnung des Bundeslandes; ab bestimmten Größen ist eine UVP-Prüfung erforderlich. Eine Gewerbesteuer gibt es nicht – im Vordergrund stehen Pacht, Beteiligung und Erneuerbare-Energie-Gemeinschaften. In der Schweiz erfolgt die Bewilligung über die kommunale bzw. kantonale Nutzungsplanung; seit 2026 können lokale Elektrizitätsgemeinschaften (LEG) Strom innerhalb der Gemeinde teilen.",
  },
];

export default function KommunenSeite() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Solarparks und Beteiligungsmodelle für Kommunen und Stadtwerke",
    serviceType: "Projektentwicklung Freiflächen-PV mit kommunaler Beteiligung",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "Audience", audienceType: "Kommunen, Stadtwerke, Gemeinderäte" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        breadcrumbs={[{ name: "Kommunen & Stadtwerke" }]}
        eyebrow="Kommunen & Stadtwerke"
        title={
          <>
            Ein Solarpark, von dem <span className="ov-text-gradient">die Gemeinde etwas hat.</span>
          </>
        }
        lead="Gewerbesteuer, § 6 EEG-Beteiligung, Pacht und Bürgerbeteiligung: Wir entwickeln Solarparks mit der Gemeinde – transparent vom Aufstellungsbeschluss bis zum Betrieb."
        image={{ src: "/img/solarpark-baeume.jpg", alt: "Solarpark mit Bäumen am Rand in ländlicher Umgebung" }}
        points={["§ 6 EEG: 0,2 ct/kWh", "90 % Gewerbesteuer am Standort", "Planungskosten trägt der Entwickler", "Bürgerbeteiligung"]}
        actions={[
          { label: "Gespräch anfragen", href: "#anfrage" },
          { label: "Kommunal-Rechner", href: "/rechner/kommune", icon: Calculator },
        ]}
        badge={
          <div>
            <p className="text-[12.5px] font-medium text-ink-500">Beispiel 20 MWp, Hebesatz {fmt(KOMMUNE.hebesatz * 100)} %</p>
            <p className="ov-num mt-1 font-display text-[26px] font-extrabold tracking-tight text-ink-900">{tsd(beispiel.gesamtLaufzeit.summe)}</p>
            <p className="text-[13px] leading-snug text-ink-600">Einnahmen der Gemeinde über {beispiel.L} Jahre</p>
          </div>
        }
      />

      {/* ---------------- Wertschöpfung ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Wertschöpfung" title="Sechs Wege, wie der Park in der Gemeinde wirkt." lead="Nicht jede Quelle fließt ab dem ersten Tag – aber zusammen machen sie einen Solarpark zu einem der verlässlichsten Einnahmeposten einer Flächengemeinde." className="mb-12" />
        <FeatureGrid
          cols={3}
          items={[
            { icon: HandCoins, title: "§ 6 EEG-Beteiligung", text: `Bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je kWh – freiwillig, per Vertrag, ab dem ersten Betriebsjahr. Bei EEG-Anlagen kann der Betreiber sie sich vom Netzbetreiber erstatten lassen.` },
            { icon: Receipt, title: "Gewerbesteuer", text: `Bei Solaranlagen wird der Messbetrag zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % nach installierter Leistung auf die Standortgemeinde zerlegt (§ 29 GewStG). Sie steigt, wenn Abschreibung und Zinsen abgebaut sind.` },
            { icon: MapPinned, title: "Pacht auf Gemeindeflächen", text: "Stehen Module auf gemeindeeigenen Flächen, fließt die Pacht direkt in den Haushalt – über 30 Jahre, indexiert." },
            { icon: Users, title: "Bürgerbeteiligung", text: "Über die Genossenschaft beteiligen sich Bürger und Landwirte mit kleinen Anteilen – die Rendite bleibt in der Region.", href: "/genossenschaft" },
            { icon: Share2, title: "Energy Sharing", text: GEMEINSCHAFTEN.de.text, href: "/energiegemeinschaften" },
            { icon: Factory, title: "Regionale Wertschöpfung", text: "Aufträge für Tiefbau, Zaun, Pflege und Schafhaltung, Pacht für örtliche Eigentümer – und Einkommensteueranteile daraus." },
          ]}
        />

        <Reveal className="mt-10 grid gap-6 rounded-[2rem] bg-ov-50 p-6 ring-1 ring-ov-100 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">Beispielrechnung 20 MWp · Süddeutschland · Hebesatz {fmt(KOMMUNE.hebesatz * 100)} %</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["§ 6 EEG / Jahr", tsd(beispiel.jahre[0].p6)],
                [`§ 6 über ${beispiel.N} J.`, tsd(beispiel.gesamt.p6)],
                [`Gewerbesteuer ab J. ${KOMMUNE.afaJahre + 1}`, beispiel.gewStNachAfa ? `≈ ${tsd(beispiel.gewStNachAfa)}/J.` : "–"],
                [`Summe ${beispiel.L} Jahre`, tsd(beispiel.gesamtLaufzeit.summe)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[13px] text-ink-600">{k}</dt>
                  <dd className="ov-num font-display text-[22px] font-extrabold tracking-tight text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12.5px] text-ink-500">Ohne Pacht auf Gemeindeflächen, vereinfachte Modellrechnung, Stand {STAND}.</p>
          </div>
          <Link href="/rechner/kommune" className="group inline-flex items-center justify-center gap-2 self-start rounded-full bg-ov-600 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-ov-700 md:self-auto">
            Mit Ihrem Hebesatz rechnen <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </Section>

      {/* ---------------- Bauleitplanung ---------------- */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="Bauleitplanung"
          title="Die Gemeinde hat die Planungshoheit – wir tragen die Arbeit."
          lead="Für die meisten Solarparks braucht es einen Bebauungsplan. Planungsbüro, Gutachten und Verfahrenskosten übernimmt der Entwickler über einen städtebaulichen Vertrag."
          className="mb-14"
        />
        <Steps
          cols={3}
          items={[
            { icon: Vote, title: "Aufstellungsbeschluss", text: "Der Gemeinderat beschließt, einen Bebauungsplan aufzustellen – oft zusammen mit der Änderung des Flächennutzungsplans im Parallelverfahren." },
            { icon: Megaphone, title: "Frühzeitige Beteiligung", text: "Öffentlichkeit und Behörden werden früh informiert und können sich äußern (§§ 3 Abs. 1, 4 Abs. 1 BauGB)." },
            { icon: FileText, title: "Entwurf & Umweltbericht", text: "Planzeichnung, Begründung, Umweltbericht, Artenschutz, Blend- und ggf. Bodengutachten, Ausgleichskonzept." },
            { icon: Eye, title: "Öffentliche Auslegung", text: "Der Entwurf wird veröffentlicht; Stellungnahmen von Bürgern und Trägern öffentlicher Belange gehen ein." },
            { icon: ClipboardCheck, title: "Abwägung & Satzung", text: "Der Gemeinderat wägt die Stellungnahmen ab und beschließt den Bebauungsplan als Satzung (§ 10 BauGB)." },
            { icon: Zap, title: "Bekanntmachung & Bau", text: "Mit der Bekanntmachung tritt der Plan in Kraft. Es folgen Baugenehmigung bzw. -anzeige, Netzanschluss und Bau." },
          ]}
        />
        <p className="mt-10 max-w-3xl text-[14.5px] leading-relaxed text-ink-600">
          Ausnahmen: Entlang von Autobahnen und zweigleisigen Schienenwegen sind Freiflächenanlagen in einem 200-Meter-Streifen nach § 35 Abs. 1 Nr. 8 b BauGB privilegiert, ebenso kleine
          Agri-PV-Anlagen bis 2,5 ha mit Hofbezug. Die Gemeinde bleibt über ihr Einvernehmen beteiligt. Mehr im{" "}
          <Link href="/ratgeber/solarpark-genehmigung-bebauungsplan" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2">
            Ratgeber Genehmigung
          </Link>
          .
        </p>
      </Section>

      {/* ---------------- Kriterienkatalog ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Kriterienkatalog"
            title="Klare Regeln statt Einzelfallstreit."
            lead="Viele Gemeinden beschließen einen Kriterienkatalog für Freiflächen-Photovoltaik. Er steuert, wo Solarparks entstehen dürfen – und macht Anfragen vergleichbar. Typische Kriterien:"
          />
          <Reveal>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["Flächen", "Vorbelastete Flächen zuerst (Autobahn, Schiene, Gewerbe), Bodengüte bzw. Ackerzahl als Schwelle, Agri-PV auf besseren Böden."],
                ["Abstände", "Mindestabstand zur Wohnbebauung, Sichtachsen und Ortsränder freihalten, Eingrünung."],
                ["Natur", "Schutzgebiete ausschließen, Biodiversitätsmaßnahmen, Wildkorridore, extensive Pflege oder Beweidung."],
                ["Größe", "Obergrenze je Anlage oder Anteil an der Gemarkung, schrittweise Entwicklung."],
                ["Beteiligung", "§ 6-Vertrag, Angebote für Bürger, bevorzugt regionale Partner und Genossenschaften."],
                ["Rückbau", "Rückbauverpflichtung mit Sicherheitsleistung, Rückführung in landwirtschaftliche Nutzung."],
              ].map(([k, v]) => (
                <li key={k} className="rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70">
                  <p className="font-display text-[16px] font-bold text-ink-900">{k}</p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{v}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Akzeptanz & Stadtwerke ---------------- */}
      <Section tone="navy" space="lg">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading dark eyebrow="Akzeptanz" title="Früh reden, offen rechnen." />
            <ul className="mt-8 space-y-4">
              {[
                { icon: Megaphone, t: "Frühe Information", x: "Vorstellung im Gemeinderat vor dem Aufstellungsbeschluss, Bürgerabend mit Visualisierung und Zahlen." },
                { icon: Flower2, t: "Sichtbar gute Parks", x: "Eingrünung, Blühstreifen, Schafbeweidung, Durchlässe für Wild – im Konzept, nicht als Nachtrag." },
                { icon: Coins, t: "Beteiligung anbieten", x: "§ 6-Vertrag, Genossenschaftsanteile, regionale Stromangebote – bevor jemand danach fragt." },
                { icon: Sprout, t: "Landwirtschaft mitdenken", x: "Agri-PV auf guten Böden, faire Pacht, Einbindung der Bewirtschafter vor Ort." },
              ].map((p) => (
                <li key={p.t} className="flex gap-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                  <p.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-300" />
                  <div>
                    <p className="font-display text-[16px] font-bold text-white">{p.t}</p>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-white/65">{p.x}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading dark eyebrow="Stadtwerke" title="Partner statt Zuschauer." />
            <ul className="mt-8 space-y-4">
              {[
                { icon: Handshake, t: "Beteiligung am Park", x: "Minderheits- oder Mehrheitsbeteiligung an der Projektgesellschaft – ab Baureife oder schon in der Entwicklung." },
                { icon: Zap, t: "PPA für die eigene Beschaffung", x: "Solarstrom aus der Region zu festen Preisen für Tarife, Liegenschaften und Großkunden." },
                { icon: Landmark, t: "Netz & Speicher", x: "Gemeinsame Netzplanung, Speicher an Umspannwerken, Energy Sharing im eigenen Netzgebiet." },
              ].map((p) => (
                <li key={p.t} className="flex gap-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                  <p.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-300" />
                  <div>
                    <p className="font-display text-[16px] font-bold text-white">{p.t}</p>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-white/65">{p.x}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[14px] leading-relaxed text-white/60">
              Österreich und Schweiz: {GEMEINSCHAFTEN.at.titel} bzw. {GEMEINSCHAFTEN.ch.titel} – wir entwickeln die Beteiligung passend zum jeweiligen Rechtsrahmen.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------- Anfrage ---------------- */}
      <Section tone="sand" space="lg" id="anfrage">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Gespräch"
            title="Wir stellen uns im Gemeinderat vor."
            lead="Ob konkrete Fläche, Kriterienkatalog oder Stadtwerke-Beteiligung: Schildern Sie kurz Ihr Anliegen – wir melden uns mit einem Terminvorschlag."
          />
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
            <AuswahlAnfrage
              typ="kommune"
              felder={["firma", "telefon", "plz", "ort", "land", "nachricht"]}
              button="Gespräch anfragen"
              gruppen={[
                { id: "absender", legende: "Sie sind", optionen: [{ id: "gemeinde", label: "Gemeinde" }, { id: "stadtwerk", label: "Stadtwerk" }, { id: "landkreis", label: "Landkreis / Verband" }] },
                {
                  id: "themen",
                  legende: "Themen",
                  mehrfach: true,
                  start: ["solarpark"],
                  optionen: [
                    { id: "solarpark", label: "Solarpark" },
                    { id: "kriterien", label: "Kriterienkatalog" },
                    { id: "beteiligung", label: "Bürgerbeteiligung" },
                    { id: "carport", label: "Parkplätze" },
                    { id: "speicher", label: "Speicher" },
                  ],
                },
              ]}
            />
            <p className="mt-4 text-[12.5px] text-ink-500">Tipp: Im Feld „Unternehmen / Betrieb“ den Namen der Gemeinde bzw. des Stadtwerks angeben.</p>
          </div>
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Solarparks in der Gemeinde" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/rechner/kommune", titel: "Kommunal-Rechner", text: "§ 6 EEG, Gewerbesteuer und Pacht mit Ihrem Hebesatz – Jahr für Jahr." },
          { href: "/genossenschaft", titel: "Genossenschaft", text: "Bürger und Landwirte beteiligen sich am Solarpark vor Ort." },
          { href: "/solarcarport", titel: "Solarcarports", text: "Parkplätze an Rathaus, Schule und Bad – Solarpflicht und Ladepunkte." },
          { href: "/prozess", titel: "Projektablauf", text: "Von der Fläche bis zur Inbetriebnahme – alle Schritte im Überblick." },
        ]}
      />

      <CtaBand
        eyebrow="Für Kommunen"
        title="Planungshoheit bei Ihnen, Arbeit bei uns."
        text="Wir entwickeln Solarparks mit der Gemeinde – mit § 6-Vertrag, Beteiligungsangebot und offenen Zahlen. Die Planungskosten trägt der Entwickler."
        primary={{ label: "Gespräch anfragen", href: "#anfrage" }}
        secondary={{ label: "Kommunal-Rechner", href: "/rechner/kommune" }}
      />
    </div>
  );
}

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Kommune/Seite/Hero";
import Fakten from "@/components/Kommune/Seite/Fakten";
import Wertschoepfung from "@/components/Kommune/Seite/Wertschoepfung";
import Verfahren from "@/components/Kommune/Seite/Verfahren";
import Kriterien from "@/components/Kommune/Seite/Kriterien";
import Partner from "@/components/Kommune/Seite/Partner";
import Anfrage from "@/components/Kommune/Seite/Anfrage";
import { BEISPIEL as beispiel, tsd } from "@/components/Kommune/Seite/daten";
import { abs, SITE } from "@/data/site";
import { KOMMUNE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = pfad("/kommunen");
const TITEL = "Solarpark für Gemeinden: Planung & Beteiligung | ÖkoInvest";
const BESCHREIBUNG =
  "Was Solarparks Gemeinden bringen: Gewerbesteuer zu 90 % am Standort, § 6 EEG mit 0,2 ct/kWh, Pacht, Bürgerbeteiligung – dazu Bauleitplanung und Kriterien.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarpark Gemeinde", "Kommunalbeteiligung § 6 EEG", "Gewerbesteuer Solarpark", "Bauleitplanung Freiflächen-PV", "Kriterienkatalog Freiflächen-Photovoltaik", "Stadtwerke Solarpark", "Bürgerbeteiligung Solarpark"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/solarpark-baeume.jpg"), width: 1280, height: 852, alt: "Solarpark mit Bäumen am Rand" }] },
};


const FAQ = [
  {
    q: "Was bringt ein Solarpark einer Gemeinde konkret?",
    a: `Drei direkte Einnahmen: die freiwillige Zahlung nach § 6 EEG von bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh ab dem ersten Jahr, die Gewerbesteuer – bei Solaranlagen zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % an der Standortgemeinde – und Pacht, wenn Gemeindeflächen genutzt werden. Bei einem 20-MWp-Park kommen allein aus § 6 EEG rund ${tsd(beispiel.jahre[0].p6)} im Jahr zusammen. In mehreren Bundesländern – etwa Bayern (ab 5 MW), Brandenburg, Mecklenburg-Vorpommern, Niedersachsen, Saarland, Sachsen und Sachsen-Anhalt – schreiben Landesgesetze eine Beteiligung der Gemeinde vor; Details stehen im Ratgeber zur Kommunalbeteiligung. Dazu kommen Aufträge für regionale Betriebe und Beteiligungsmöglichkeiten für Bürger.`,
  },
  {
    q: "Wie läuft das Bauleitplanverfahren?",
    a: "In der Regel stellt die Gemeinde einen vorhabenbezogenen oder angebotsbezogenen Bebauungsplan auf und ändert parallel den Flächennutzungsplan. Nach dem Aufstellungsbeschluss folgen die frühzeitige Beteiligung von Öffentlichkeit und Behörden, der Entwurf mit Umweltbericht, die Veröffentlichung im Internet (§ 3 Abs. 2 BauGB), die Abwägung und der Satzungsbeschluss. Eine Vereinbarung über die § 6-Zahlung darf erst nach dem Satzungsbeschluss geschlossen werden (§ 6 Abs. 4 EEG). Die Planungskosten trägt üblicherweise der Projektentwickler über einen städtebaulichen Vertrag. Realistisch sind ein bis zwei Jahre.",
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
    a: "In Österreich widmet die Gemeinde Flächen für Photovoltaik (z. B. als Grünland-Photovoltaik) im Rahmen der Raumordnung des Bundeslandes; dazu kommen je nach Größe elektrizitäts- und naturschutzrechtliche Bewilligungen des Landes. Einen eigenen UVP-Tatbestand für Photovoltaik kennt das UVP-G nach aktuellem Stand nicht. Eine Gewerbesteuer gibt es nicht – im Vordergrund stehen Pacht, Beteiligung und Erneuerbare-Energie-Gemeinschaften. In der Schweiz braucht eine Anlage ausserhalb der Bauzone ein Baugesuch bei der Gemeinde und eine kantonale Ausnahmebewilligung, die es nur für standortgebundene Anlagen gibt (Art. 24ter RPG); eine Nutzungsplanung verlangen einzelne Kantone ab bestimmten Grössen. Anlagen über 5 MW, die nicht an Gebäuden angebracht sind, sind UVP-pflichtig. Seit 2026 können lokale Elektrizitätsgemeinschaften (LEG) Strom innerhalb der Gemeinde teilen.",
  },
];

export default async function KommunenSeite({ params }) {
  await landDerSeite(params, "/kommunen");
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
    // Spannungsbogen: Hero (navy) → Fakten → Wertschöpfung (white) → Bauleitplanung (sand) → Kriterien (white)
    // → Akzeptanz & Stadtwerke (navy, Anker Mitte) → Anfrage (sand) → FAQ (white) → Querverweise → CTA.
    <div className="[&_.ov-lead]:hyphens-manual [&_h2]:hyphens-manual! lg:[&_p]:hyphens-manual">
      <JsonLd daten={schema} />

      <Hero />
      <Fakten />
      <Wertschoepfung />
      <Verfahren />
      <Kriterien />
      <Partner />
      <Anfrage />

      {/* ---------------- FAQ ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Solarparks in der Gemeinde" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/rechner/kommune"), titel: "Kommunal-Rechner", text: "§ 6 EEG, Gewerbesteuer und Pacht mit Ihrem Hebesatz – Jahr für Jahr." },
          { href: pfad("/genossenschaft"), titel: "Genossenschaft", text: "Bürger und Landwirte beteiligen sich am Solarpark vor Ort." },
          { href: pfad("/solarcarport"), titel: "Solarcarports", text: "Parkplätze an Rathaus, Schule und Bad – Solarpflicht und Ladepunkte." },
          { href: pfad("/prozess"), titel: "Projektablauf", text: "Von der Fläche bis zur Inbetriebnahme – alle Schritte im Überblick." },
          { href: "/wissen/ratgeber/kommunale-beteiligung-6-eeg", titel: "Kommunale Beteiligung § 6 EEG", text: "Was die Gemeinde erhält und wie der Vertrag aussieht." },
          { href: "/wissen/ratgeber/buergerenergie-solarpark-akzeptanz", titel: "Bürgerenergie und Akzeptanz", text: "Solarparks gemeinsam mit der Region planen." },
        ]}
      />

      <CtaBand
        eyebrow="Für Kommunen"
        title="Planungshoheit bei Ihnen, Arbeit bei uns."
        text="Wir entwickeln Solarparks mit der Gemeinde – mit § 6-Vertrag, Beteiligungsangebot und offenen Zahlen. Die Planungskosten trägt der Entwickler."
        primary={{ label: "Gespräch anfragen", href: "#anfrage" }}
        secondary={{ label: "Kommunal-Rechner", href: pfad("/rechner/kommune") }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/kommunen", metadata);

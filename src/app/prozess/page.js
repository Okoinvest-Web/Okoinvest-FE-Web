import { Bell, FileText, LayoutDashboard, MessageSquare } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import ProzessTabs from "@/components/Prozess/ProzessTabs";
import { ZIELGRUPPEN } from "@/components/Prozess/prozessDaten";
import { FAQ_PROZESS } from "@/data/faq";
import { abs } from "@/data/site";

const PFAD = "/prozess";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Projektprozess: Von der Anfrage bis zum Betrieb | ÖkoInvest",
  description:
    "Schritte, Dauer, Dokumente und Portal-Status: So läuft die Zusammenarbeit für Flächeneigentümer, Landwirte, Investoren, Projektanbieter und Unternehmen.",
  keywords: ["Solarpark Ablauf", "Projektentwicklung Photovoltaik", "B-Plan Solarpark Dauer", "Projektbörse Ablauf", "Agri-PV Ablauf"],
});

const PORTAL = [
  { icon: LayoutDashboard, title: "Status in Echtzeit", text: "Jeder Vorgang hat eine Statusstufe. Sie sehen, wo Ihr Projekt steht und was als Nächstes kommt." },
  { icon: FileText, title: "Alle Dokumente an einem Ort", text: "Verträge, Gutachten, Pläne und Abrechnungen – versioniert und jederzeit abrufbar." },
  { icon: MessageSquare, title: "Direkter Draht", text: "Nachrichten an Ihren festen Ansprechpartner statt E-Mail-Ketten." },
  { icon: Bell, title: "Benachrichtigungen", text: "Wenn sich der Status ändert oder ein Dokument zur Unterschrift bereitliegt." },
];

const QUERVERWEISE = [
  { href: "/flaechencheck", titel: "Flächencheck", text: "Eignung und Pachtspanne Ihrer Fläche in wenigen Minuten." },
  { href: "/projektboerse", titel: "Projektbörse", text: "Projekte in allen Phasen – von Projektrechten bis Bestand." },
  { href: "/unternehmen", titel: "Über ÖkoInvest", text: "Wer hinter der Plattform steht: Gruppe, Gesellschaften, Pipeline." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "@id": `${abs(PFAD)}/#howto`,
  name: "Von der Fläche zum Solarpark – Ablauf mit ÖkoInvest",
  description: ZIELGRUPPEN[0].intro,
  totalTime: "P4Y",
  step: ZIELGRUPPEN[0].schritte.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.titel,
    text: `${s.wir} Dauer: ${s.dauer}.`,
  })),
};

export default function ProzessPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Projektprozess" }]}
        eyebrow="So arbeiten wir"
        title={
          <>
            Von der Anfrage bis zum Betrieb – <span className="ov-text-gradient-light">Schritt für Schritt.</span>
          </>
        }
        lead="Wie lange dauert was? Wer macht welchen Schritt? Welche Unterlagen brauchen Sie – und was sehen Sie im Portal? Wählen Sie Ihre Rolle und sehen Sie Ihren Weg."
        points={ZIELGRUPPEN.map((z) => z.label)}
      />

      <Section tone="sand" space="lg" id="ablauf" className="scroll-mt-24">
        <ProzessTabs />
        <p className="mx-auto mt-8 max-w-5xl text-[13px] leading-relaxed text-ink-500">
          Dauern sind typische Spannen im DACH-Raum nach aktuellem Stand und hängen stark von Gemeinde, Netzbetreiber und Genehmigungsbehörden ab. Wir nennen
          Ihnen für Ihr Projekt einen eigenen Zeitplan.
        </p>
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Das Portal"
          title="Ein Login für jeden Schritt"
          lead="Was Sie per Formular anfragen, wird zum Vorgang. Registrieren Sie sich mit derselben E-Mail-Adresse – dann sehen Sie ihn samt Status im Portal."
          className="mb-10 md:mb-14"
        />
        <FeatureGrid items={PORTAL} cols={4} />
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen zum Ablauf" lead="Dauer, Kosten, Portal – und was passiert, wenn es nicht klappt." />
          <Faq items={FAQ_PROZESS} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Der erste Schritt"
        title="Fünf Minuten für die Anfrage – wir machen den Rest."
        primary={{ label: "Fläche prüfen lassen", href: "/flaechencheck" }}
        secondary={{ label: "Zugang anlegen", href: "/registrieren" }}
      />
    </div>
  );
}

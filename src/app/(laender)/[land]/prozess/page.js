import { Bell, Euro, FileText, LayoutDashboard, ListChecks, MessageSquare, Route, Timer } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import ProzessTabs from "@/components/Prozess/ProzessTabs";
import RollenWahl from "@/components/Prozess/RollenWahl";
import { ZIELGRUPPEN } from "@/components/Prozess/prozessDaten";
import NachtHero from "@/components/Unternehmen/NachtHero";
import Faktenleiste from "@/components/Unternehmen/Faktenleiste";
import VorgangBuehne from "@/components/Kontakt/VorgangBuehne";
import { FAQ_PROZESS } from "@/data/faq";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/prozess");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Projektablauf Solarpark: Schritte, Dauer, Portal | ÖkoInvest",
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
  { href: seitenPfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung und Pachtspanne Ihrer Fläche in wenigen Minuten." },
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

export default async function ProzessPage({ params }) {
  await landDerSeite(params, "/prozess");
  const flaeche = ZIELGRUPPEN[0];
  const [jahre] = flaeche.gesamt.split(" Jahre");

  return (
    <div>
      <JsonLd daten={schema} />

      <NachtHero
        mitLeiste
        breadcrumbs={[{ name: "Projektprozess" }]}
        eyebrow="So arbeiten wir"
        title={
          <>
            Von der Anfrage bis zum Betrieb – <span className="ov-text-gradient-light">Schritt für Schritt.</span>
          </>
        }
        lead="Wie lange dauert was? Wer macht welchen Schritt? Welche Unterlagen brauchen Sie – und was sehen Sie im Portal? Wählen Sie Ihre Rolle und sehen Sie Ihren Weg."
        actions={[
          { label: "Ablauf ansehen", href: "#ablauf" },
          { label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") },
        ]}
        chips={["Dauer je Schritt als typische Spanne", "Wer was macht – Sie und wir", "Unterlagen je Schritt", "Statusstufen im Portal"]}
        buehne={<RollenWahl />}
      />

      <Faktenleiste
        titel="Der Prozess in Zahlen"
        items={[
          { icon: Route, wert: String(ZIELGRUPPEN.length), label: "Wege", text: "je nach Rolle – vom Eigentümer bis zum Unternehmen" },
          { icon: ListChecks, wert: String(flaeche.schritte.length), label: "Statusstufen", text: `von „${flaeche.schritte[0].portal}“ bis „${flaeche.schritte.at(-1).portal}“ – im Portal sichtbar` },
          { icon: Timer, wert: jahre, einheit: "Jahre", label: "bis zum Betrieb", text: "typisch für einen Solarpark auf Ihrer Fläche" },
          { icon: Euro, wert: "0", einheit: "€", label: "für Flächeneigentümer", text: "Entwicklung, Bau und Betrieb übernehmen wir" },
        ]}
      />

      <Section tone="sand" space="lg" id="ablauf" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Ihr Ablauf"
          title="Wer macht was – und wie lange dauert es?"
          lead="Jeder Schritt mit typischer Dauer, Ihren Aufgaben, unseren Aufgaben, den Unterlagen und der Statusstufe im Portal."
          className="mb-10 md:mb-12"
        />
        <ProzessTabs />
        <p className="mx-auto mt-8 max-w-5xl text-[13px] leading-relaxed text-ink-500">
          Dauern sind typische Spannen im DACH-Raum nach aktuellem Stand und hängen stark von Gemeinde, Netzbetreiber und Genehmigungsbehörden ab. Wir nennen
          Ihnen für Ihr Projekt einen eigenen Zeitplan.
        </p>
      </Section>

      <Section tone="white" space="lg" className="overflow-hidden">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Das Portal"
              title="Ein Login für jeden Schritt"
              lead="Was Sie per Formular anfragen, wird zum Vorgang. Registrieren Sie sich mit derselben E-Mail-Adresse – dann sehen Sie ihn samt Status im Portal."
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {PORTAL.map((p, i) => (
                <Reveal as="li" key={p.title} delay={i * 60} className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ov-600 ring-1 ring-ink-200">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-[16.5px] font-bold text-ink-900">{p.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{p.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal dir="right" className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-10 -z-0 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            <div className="relative">
              <VorgangBuehne hell />
            </div>
          </Reveal>
        </div>
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
        primary={{ label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") }}
        secondary={{ label: "Zugang anlegen", href: "/registrieren" }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/prozess", metadata);

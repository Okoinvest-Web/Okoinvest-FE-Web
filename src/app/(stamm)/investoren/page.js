import { ShieldCheck } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import Phasenmodell from "@/components/Investoren/Phasenmodell";
import PipelineGrafik from "@/components/Investoren/PipelineGrafik";
import DdCheckliste from "@/components/Investoren/DdCheckliste";
import InvestorAnfrage from "@/components/Investoren/InvestorAnfrage";
import Hero from "@/components/Investoren/Seite/Hero";
import Fakten from "@/components/Investoren/Seite/Fakten";
import Angebot from "@/components/Investoren/Seite/Angebot";
import Ablauf from "@/components/Investoren/Seite/Ablauf";
import Provision from "@/components/Investoren/Seite/Provision";
import { abs, KENNZAHLEN, SITE, sprachAlternates } from "@/data/site";
import { PHASEN, PROVISION, ERLOESE, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

const PFAD = "/investoren";
const TITEL = "Solarpark kaufen: Projektrechte, RTB & Bestand | ÖkoInvest";
const BESCHREIBUNG =
  "Solarpark kaufen im DACH-Raum: Projektrechte, baureife Parks und Bestand, Phasenmodell mit Preisen, Datenraum – für Investoren kostenfrei.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarpark kaufen", "Projektrechte Photovoltaik", "RTB Solarpark", "Solarprojekte Investor", "Bestandsanlage PV kaufen", "Co-Development Solar"],
  alternates: sprachAlternates("/investoren", "/en/investors"),
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/investoren-vor-ort.jpg"), width: 1280, height: 852, alt: "Symbolbild: Besichtigung eines Solarparks" }], // Stockmotiv, keine eigene Veranstaltung (Paket D)
  },
};

const FAQ = [
  {
    q: "Was kostet mich die Plattform als Investor?",
    a: `Nichts. Suchprofil, Exposés, NDA und Datenraum sind für Käufer kostenfrei. Wir finanzieren die Plattform über eine Erfolgsprovision, die der Verkäufer zahlt – ${PROVISION.verkaeufer.text}.`,
  },
  {
    q: "Welche Projekte bieten Sie an?",
    a: "Projekte aus der eigenen Entwicklung der ÖKOVOLT Gruppe und Projekte anderer Entwickler, die über die Projektbörse angeboten werden: Freiflächen- und Agri-PV, Parkplatz-PV und Großspeicher, in Deutschland, Österreich und der Schweiz – von der Flächensicherung bis zur Bestandsanlage. Jedes Projekt wird vor der Veröffentlichung auf Vollständigkeit der Kernunterlagen und Plausibilität geprüft – das ersetzt keine Due Diligence.",
  },
  {
    q: "Wie viele baureife Projekte sind verfügbar?",
    a: `Ehrlich: Die ÖKOVOLT Gruppe bringt rund ${KENNZAHLEN.entwicklungMwProJahr} MWp pro Jahr neu in die Entwicklung. Bis zur Baureife vergehen typischerweise zwei bis drei Jahre, manches Projekt scheitert am Netz oder an der Planung. Baureife Leistung entsteht also zeitversetzt. Wer früher einsteigt – etwa ab Netzzusage oder Aufstellungsbeschluss – hat mehr Auswahl und zahlt weniger, trägt aber mehr Risiko.`,
  },
  {
    q: "Wie läuft der Zugang zu vertraulichen Unterlagen?",
    a: "Öffentlich sehen Sie einen anonymen Exposé-Teaser mit Region, Größe, Phase und Eckdaten. Nach Registrierung und digitaler Vertraulichkeitsvereinbarung (NDA) erhalten Sie Zugriff auf den Datenraum mit Pachtverträgen, Planungsunterlagen, Netzzusage und Gutachten – jeder Zugriff wird protokolliert. Das vertrauliche Exposé als PDF enthält zusätzlich das Standard-Projektdatenblatt (Technik, Ertrag, Netz, Genehmigung, Vermarktung) mit seiner Vollständigkeit.",
  },
  {
    q: "Bieten Sie Co-Development an?",
    // Zielgruppe offengelegt (Paket D): Entwicklungsbeteiligung nicht öffentlich an Privatanleger bewerben.
    // Mindestbetrag (Empfehlung E15: 200.000 €) ist Inhaber-Entscheidung und steht deshalb noch nicht hier.
    a: "Ja – ausschließlich für professionelle und institutionelle Investoren, nicht für Privatanleger. Sie beteiligen sich früh an einem Projekt oder einer Pipeline und finanzieren die Entwicklungskosten mit; wir entwickeln bis zur Baureife. Üblich sind Meilensteinzahlungen und ein Vorkaufs- oder Übernahmerecht bei RTB. Mindestbetrag und Konditionen vereinbaren wir je Projekt. Frühe Phasen tragen ein hohes Risiko bis zum Totalverlust, wenn ein Projekt nicht genehmigt oder nicht angeschlossen wird.",
  },
  {
    q: "Kann ich auch mit kleineren Beträgen investieren?",
    a: "Direkt in Projektrechte investieren in der Regel professionelle Investoren ab einigen Hunderttausend Euro. Für Bürger und Landwirte ist eine Energiegenossenschaft mit kleinen Anteilen und Mitbestimmung in Vorbereitung; Anteile können dort noch nicht gezeichnet werden.",
  },
  {
    q: "Mit welchen Erlösen rechnen Käufer heute?",
    a: `In Deutschland mit dem Zuschlag aus der EEG-Ausschreibung (zuletzt ${ERLOESE.zuschlagsHistorie.map((z) => fmt(z.ct, 2)).join(", ")} ct/kWh im Durchschnitt der Gebotstermine 2025), mit PPA-Preisen grob zwischen ${fmt(ERLOESE.ppaCt.min, 1)} und ${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh oder mit Kombinationen. In Österreich über die EAG-Marktprämie oder Investitionszuschüsse, in der Schweiz u. a. über die Einmalvergütung. Der Solarpark-Renditerechner zeigt die Wirkung auf IRR und DSCR.`,
  },
];

export default function InvestorenSeite() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Vermittlung und Verkauf von Solarprojekten an Investoren",
    serviceType: "Projektrechte, baureife Projekte und Bestandsanlagen (Photovoltaik, Speicher)",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Investoren, Fonds, Stadtwerke, Family Offices" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <Hero />
      <Fakten />
      <Angebot />

      {/* ---------------- Pipeline ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <SectionHeading
            eyebrow="Pipeline – ehrlich erklärt"
            title={`Rund ${KENNZAHLEN.entwicklungMwProJahr} MWp pro Jahr neu in Entwicklung.`}
            lead="Das ist Leistung, die jedes Jahr neu in die Projektentwicklung geht – nicht Leistung, die morgen baureif ist. Von der Flächensicherung bis RTB vergehen typischerweise zwei bis drei Jahre."
          >
            <ul className="mt-7 space-y-3 text-[15.5px] leading-relaxed text-ink-700">
              {[
                "Frühe Phasen: große Auswahl, niedriger Preis je kWp, höheres Risiko.",
                "Ab Satzungsbeschluss: planbar, weniger Auswahl, höherer Preis.",
                "Über die Börse kommen Projekte weiterer Entwickler dazu – mit derselben Vollständigkeits- und Plausibilitätsprüfung.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                  {t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal className="min-w-0">
            <PipelineGrafik />
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Phasenmodell ---------------- */}
      <Section tone="white" space="lg" id="phasen">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="Phasenmodell" title="Risiko und Preis je Entwicklungsphase." lead="Marktspannen für Projektrechte in €/kWp – als Orientierung für Ihr Suchprofil und Ihre Kalkulation." />
          <Button href={pfad("/rechner/projektbewertung")} variant="secondary" pfeil className="shrink-0 self-start lg:self-auto">
            Projekt bewerten
          </Button>
        </div>
        <Phasenmodell />
      </Section>

      {/* ---------------- Due Diligence ---------------- */}
      <Section tone="sand" space="lg" id="due-diligence">
        <SectionHeading
          eyebrow="Due Diligence"
          title="Die Checkliste, mit der wir jedes Projekt prüfen."
          lead="Bevor ein Projekt in die Börse geht, prüfen wir die Kernunterlagen auf Vollständigkeit. Die vollständige Prüfung bleibt Ihre – diese Liste hilft dabei."
          className="mb-10"
        />
        <DdCheckliste />
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
          Orientierung, keine Rechts- oder Steuerberatung. Für Transaktionen empfehlen wir technische, rechtliche und steuerliche Berater – im Datenraum stellen wir alle Unterlagen dafür bereit.
        </p>
      </Section>

      <Ablauf />
      <Provision />

      {/* ---------------- Registrierung & Formular ---------------- */}
      <Section tone="navy" space="lg" id="suchprofil">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Suchprofil"
              title={<TextEnthuellung ausloeser="scrollen">Sagen Sie uns, was Sie suchen.</TextEnthuellung>}
              lead="Kurzprofil senden – wir melden uns mit passenden Projekten. Oder direkt ein Konto anlegen: Dann sehen Sie Matches, NDAs und Datenräume im Portal."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button href="/registrieren?rolle=investor" variant="white" pfeil magnetisch>
                Als Investor registrieren
              </Button>
              <Button href="/login" variant="outlineLight">
                Schon registriert? Anmelden
              </Button>
            </div>
            <ul className="mt-10 space-y-3 border-t border-white/10 pt-8 text-[14.5px] text-white/75">
              {["Kostenfrei und unverbindlich", "Vertraulich: Details erst nach NDA", `Stand der Marktangaben: ${STAND}`].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-8">
            <InvestorAnfrage dunkel phasen={PHASEN.map((p) => ({ id: p.id, kurz: p.kurz }))} />
          </div>
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Gut zu wissen für Investoren" lead="Weitere Fragen beantworten wir gern persönlich – nach Registrierung auch direkt im Portal." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/projektboerse", titel: "Projektbörse", text: "Aktuelle Projekte im DACH-Raum – Exposé-Teaser öffentlich, Details nach NDA." },
          { href: pfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR über die gesamte Laufzeit durchrechnen." },
          { href: pfad("/bestandsanlagen"), titel: "Bestandsanlagen", text: "Laufende Parks kaufen: Ertragswert, Restlaufzeit EEG, technische Due Diligence." },
          { href: "/wissen/ratgeber/projektrechte-kaufen-due-diligence", titel: "Ratgeber Due Diligence", text: "Worauf es beim Kauf von Projektrechten im Detail ankommt." },
        ]}
      />

      <CtaBand
        eyebrow="Für Investoren kostenfrei"
        title="Die richtigen Projekte, bevor sie jeder sieht."
        text="Legen Sie Ihr Suchprofil an. Wir gleichen es mit neuen Projekten aus eigener Entwicklung und aus der Börse ab – mit vorgeprüften Unterlagen; ein Ansprechpartner aus unserem Team meldet sich bei Ihnen."
        primary={{ label: "Als Investor registrieren", href: "/registrieren?rolle=investor" }}
        secondary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
      />
    </div>
  );
}

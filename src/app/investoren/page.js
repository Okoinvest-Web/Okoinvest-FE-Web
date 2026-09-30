import Link from "next/link";
import { ArrowUpRight, BadgePercent, Building2, FileSignature, FolderLock, Handshake, Layers, LineChart, Search, ShieldCheck, Sprout, Users, Zap, BatteryCharging, Scale, UserPlus } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import Phasenmodell from "@/components/Investoren/Phasenmodell";
import PipelineGrafik from "@/components/Investoren/PipelineGrafik";
import DdCheckliste from "@/components/Investoren/DdCheckliste";
import InvestorAnfrage from "@/components/Investoren/InvestorAnfrage";
import { abs, KENNZAHLEN, SITE, sprachAlternates } from "@/data/site";
import { PHASEN, PROVISION, ERLOESE, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const PFAD = "/investoren";
const TITEL = "Solarprojekte kaufen: Projektrechte & RTB | ÖkoInvest";
const BESCHREIBUNG =
  "Projektrechte, baureife Solarparks und Bestandsanlagen im DACH-Raum: Phasenmodell mit Preisen, Due-Diligence-Checkliste, Datenraum – für Investoren kostenfrei.";

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
    images: [{ url: abs("/img/investoren-vor-ort.jpg"), width: 1280, height: 852, alt: "Investoren bei der Besichtigung eines Solarparks" }],
  },
};

const rtb = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL = { mwp: 20, preis: Math.round((rtb.preisProKwp.min + rtb.preisProKwp.max) / 2) };
const beispielKaufpreis = BEISPIEL.mwp * 1000 * BEISPIEL.preis;

const FAQ = [
  {
    q: "Was kostet mich die Plattform als Investor?",
    a: `Nichts. Suchprofil, Exposés, NDA und Datenraum sind für Käufer kostenfrei. Wir finanzieren die Plattform über eine Erfolgsprovision, die der Verkäufer zahlt – ${PROVISION.verkaeufer.text}.`,
  },
  {
    q: "Welche Projekte bieten Sie an?",
    a: "Projekte aus der eigenen Entwicklung der ÖKOVOLT Gruppe und Projekte anderer Entwickler, die über die Projektbörse angeboten werden: Freiflächen- und Agri-PV, Parkplatz-PV und Großspeicher, in Deutschland, Österreich und der Schweiz – von der Flächensicherung bis zur Bestandsanlage. Jedes Projekt wird vor der Veröffentlichung auf Vollständigkeit der Kernunterlagen geprüft.",
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
    a: "Ja. Sie beteiligen sich früh an einem Projekt oder einer Pipeline und finanzieren die Entwicklungskosten mit; wir entwickeln bis zur Baureife. Üblich sind Meilensteinzahlungen und ein Vorkaufs- oder Übernahmerecht bei RTB. Die Konditionen vereinbaren wir je Projekt.",
  },
  {
    q: "Kann ich auch mit kleineren Beträgen investieren?",
    a: "Direkt in Projektrechte investieren in der Regel professionelle Investoren ab einigen Hunderttausend Euro. Bürger, Landwirte und Kleinanleger können sich über die Genossenschaft an Solarparks beteiligen – mit kleinen Anteilen und Mitbestimmung.",
  },
  {
    q: "Mit welchen Erlösen rechnen Käufer heute?",
    a: `In Deutschland mit dem Zuschlag aus der EEG-Ausschreibung (zuletzt ${ERLOESE.zuschlagsHistorie.map((z) => fmt(z.ct, 2)).join(", ")} ct/kWh im Durchschnitt der Gebotstermine 2025), mit PPA-Preisen grob zwischen ${fmt(ERLOESE.ppaCt.min, 1)} und ${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh oder mit Kombinationen. In Österreich über die EAG-Marktprämie oder Investitionszuschüsse, in der Schweiz über die Einmalvergütung. Der Solarpark-Renditerechner zeigt die Wirkung auf IRR und DSCR.`,
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
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: PROVISION.kaeufer.text },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="immersive"
        breadcrumbs={[{ name: "Für Investoren" }]}
        eyebrow="Für Investoren"
        title={
          <>
            Solarprojekte kaufen – <span className="ov-text-gradient-light">in der Phase, die zu Ihnen passt.</span>
          </>
        }
        lead="Projektrechte ab der Flächensicherung, baureife Solarparks, Bestandsanlagen und Co-Development im DACH-Raum. Geprüfte Unterlagen, digitaler Datenraum – und für Käufer kostenfrei."
        image={{ src: "/img/investoren-vor-ort.jpg", alt: "Investoren bei der Besichtigung eines Solarparks" }}
        actions={[
          { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
          { label: "Zur Projektbörse", href: "/projektboerse", icon: Search },
        ]}
        stats={[
          { value: KENNZAHLEN.entwicklungMwProJahr, suffix: " MWp", label: "rund so viel geht pro Jahr neu in Entwicklung" },
          { value: 15, suffix: "+", label: `Jahre Solarerfahrung der Gruppe (seit ${KENNZAHLEN.erfahrungSeit})` },
          { value: 0, suffix: " €", label: "Kosten für Käufer" },
        ]}
      />

      {/* ---------------- Angebot ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Was wir anbieten"
          title="Vom ersten Pachtvertrag bis zur laufenden Anlage."
          lead="Sie entscheiden, wie viel Entwicklungsrisiko Sie tragen wollen. Je früher der Einstieg, desto günstiger der Preis je kWp – und desto wichtiger ein Partner, der das Projekt bis zum Netz bringt."
          className="mb-12"
        />
        <FeatureGrid
          cols={3}
          items={[
            { icon: Layers, title: "Projektrechte in jeder Phase", text: "Von gesicherter Fläche über Netzzusage und Aufstellungsbeschluss bis zum Satzungsbeschluss – mit transparentem Stand und offenen Punkten." },
            { icon: FileSignature, title: "Baureife Projekte (RTB)", text: "Baurecht, Netzanschluss, Flächen und Gutachten liegen vor. Auf Wunsch mit EPC aus der Gruppe – eigene Rammtechnik inklusive." },
            { icon: Building2, title: "Bestandsanlagen & Secondary", text: "Laufende Solarparks mit Ertragshistorie, Förderung oder PPA – für Investoren, die Cashflow statt Entwicklungsrisiko suchen." },
            { icon: Handshake, title: "Co-Development", text: "Früh einsteigen, Entwicklung mitfinanzieren, Vorkaufsrecht bei Baureife sichern – mit Meilensteinzahlungen und klarer Governance." },
            { icon: BatteryCharging, title: "Speicher & Co-Location", text: "Batteriespeicher am selben Netzanschluss wie der Solarpark oder als eigenständiges Projekt an Netzknoten.", href: "/grossspeicher" },
            { icon: Users, title: "Beteiligung für Bürger", text: "Kleinere Beträge? Über die Genossenschaft beteiligen sich Bürger und Landwirte an Parks vor Ort.", href: "/genossenschaft" },
          ]}
        />
      </Section>

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
                "Über die Börse kommen Projekte weiterer Entwickler dazu – mit derselben Prüfung.",
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
          <Button href="/rechner/projektbewertung" variant="secondary" pfeil className="shrink-0 self-start lg:self-auto">
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

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="navy" space="lg">
        <SectionHeading dark eyebrow="Ablauf über die Plattform" title="Vom Suchprofil zum Closing – digital und nachvollziehbar." align="center" className="mb-14" />
        <Steps
          tone="dark"
          cols={3}
          items={[
            { icon: UserPlus, title: "Suchprofil", text: "Ticketgröße, Phasen, Länder und Technologien festlegen – einmal registrieren, jederzeit anpassen." },
            { icon: Zap, title: "Matching", text: "Passende Projekte kommen per Benachrichtigung, oft bevor sie öffentlich in der Börse stehen." },
            { icon: ShieldCheck, title: "NDA", text: "Digitale Vertraulichkeitsvereinbarung mit einem Klick – Voraussetzung für Details und Datenraum." },
            { icon: FolderLock, title: "Datenraum", text: "Pachtverträge, Planung, Netz, Gutachten und Fragen & Antworten an einem Ort, jeder Zugriff protokolliert. Das Exposé-PDF enthält das Projektdatenblatt." },
            { icon: FileSignature, title: "LOI", text: "Absichtserklärung mit Preis, Zahlungsstaffel und Exklusivität – Start der vertieften Prüfung." },
            { icon: Handshake, title: "SPA & Closing", text: "Kaufvertrag über Anteile oder Rechte, Übergabe der Projektgesellschaft, Begleitung bis zum Bau." },
          ]}
        />
      </Section>

      {/* ---------------- Provision ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="Provision – transparent"
            title="Für Investoren kostenfrei. Punkt."
            lead="Wir verdienen erst, wenn ein Projekt den Besitzer wechselt – und dann zahlt der Verkäufer. So bleibt unser Interesse klar: passende Projekte, die auch wirklich gebaut werden."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: LineChart, titel: "Investoren", wert: "0 €", text: PROVISION.kaeufer.text },
              { icon: BadgePercent, titel: "Verkäufer", wert: `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`, text: PROVISION.verkaeufer.text },
              { icon: Sprout, titel: "Flächeneigentümer", wert: "0 €", text: PROVISION.flaeche.text },
            ].map((k, i) => (
              <Reveal key={k.titel} delay={i * 70} className={i === 0 ? "rounded-3xl bg-ov-600 p-6 text-white" : "rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70"}>
                <k.icon aria-hidden="true" className={i === 0 ? "h-6 w-6 text-white" : "h-6 w-6 text-ov-600"} />
                <p className={i === 0 ? "mt-4 text-[13px] font-semibold text-white/85" : "mt-4 text-[13px] font-semibold text-ink-500"}>{k.titel}</p>
                <p className="ov-num mt-1 font-display text-[30px] font-extrabold tracking-tight">{k.wert}</p>
                <p className={i === 0 ? "mt-2 text-[14px] leading-relaxed text-white/85" : "mt-2 text-[14px] leading-relaxed text-ink-600"}>{k.text}</p>
              </Reveal>
            ))}
            <p className="text-[13.5px] leading-relaxed text-ink-600 sm:col-span-3">
              Beispiel: {BEISPIEL.mwp} MWp baureif zu {fmt(BEISPIEL.preis)} €/kWp = {fmtEur(beispielKaufpreis)} Kaufpreis. Die Provision von {fmtEur(beispielKaufpreis * PROVISION.verkaeufer.min)} bis{" "}
              {fmtEur(beispielKaufpreis * PROVISION.verkaeufer.max)} trägt der Verkäufer, nur bei Abschluss.
            </p>
          </div>
        </div>
      </Section>

      {/* ---------------- Werkzeuge ---------------- */}
      <Section tone="green" space="md">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { href: "/rechner/solarpark", icon: LineChart, titel: "Solarpark-Renditerechner", text: "Projekt- und EK-IRR, LCOE, DSCR und Cashflow über 30 Jahre – mit Sensitivitätsmatrix." },
            { href: "/rechner/projektbewertung", icon: Scale, titel: "Projektbewertung", text: "Kaufpreisspanne je kWp nach Phase, Netzanschluss, Größe und Vermarktung." },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="group ov-card-hover flex items-start gap-5 rounded-3xl bg-white p-6 ring-1 ring-ov-100 md:p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 transition-colors group-hover:bg-ov-500 group-hover:text-white">
                <t.icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 font-display text-[20px] font-bold text-ink-900">
                  {t.titel}
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-300 transition-colors group-hover:text-ov-600" />
                </span>
                <span className="mt-2 block text-[15px] leading-relaxed text-ink-600">{t.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------------- Registrierung & Formular ---------------- */}
      <Section tone="navy" space="lg" id="suchprofil">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Suchprofil"
              title="Sagen Sie uns, was Sie suchen."
              lead="Kurzprofil senden – wir melden uns mit passenden Projekten. Oder direkt ein Konto anlegen: Dann sehen Sie Matches, NDAs und Datenräume im Portal."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button href="/registrieren?rolle=investor" variant="white" pfeil>
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
          { href: "/rechner/solarpark", titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR über die gesamte Laufzeit durchrechnen." },
          { href: "/bestandsanlagen", titel: "Bestandsanlagen", text: "Laufende Parks kaufen: Ertragswert, Restlaufzeit EEG, technische Due Diligence." },
          { href: "/ratgeber/projektrechte-kaufen-due-diligence", titel: "Ratgeber Due Diligence", text: "Worauf es beim Kauf von Projektrechten im Detail ankommt." },
        ]}
      />

      <CtaBand
        eyebrow="Für Investoren kostenfrei"
        title="Die richtigen Projekte, bevor sie jeder sieht."
        text="Legen Sie Ihr Suchprofil an. Wir gleichen es mit neuen Projekten aus eigener Entwicklung und aus der Börse ab – mit geprüften Unterlagen und festem Ansprechpartner."
        primary={{ label: "Als Investor registrieren", href: "/registrieren?rolle=investor" }}
        secondary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
      />
    </div>
  );
}

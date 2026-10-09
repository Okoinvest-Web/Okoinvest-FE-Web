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
import { abs, KENNZAHLEN, SITE } from "@/data/site";
import { PHASEN, PROVISION, ERLOESE, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { faqFuerLand } from "@/components/Land/Laenderteile";

const PFAD = "/investoren";
const TITEL = "Solarpark kaufen: Projektrechte, RTB & Bestand | ÖkoInvest";
const BESCHREIBUNG =
  "Solarpark kaufen im DACH-Raum: Projektrechte, baureife Parks und Bestand, Phasenmodell mit Preisen, Datenraum – für Investoren kostenfrei.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarpark kaufen", "Projektrechte Photovoltaik", "RTB Solarpark", "Solarprojekte Investor", "Bestandsanlage PV kaufen", "Co-Development Solar"],
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
    AT: {
      a: "In Österreich über die Marktprämie nach dem Erneuerbaren-Ausbau-Gesetz (EAG) oder Investitionszuschüsse, mit PPA oder mit Kombinationen. Erlös- und Förderwerte für Österreich werden geprüft – Ergebnis auf Anfrage.",
    },
    CH: {
      a: "In der Schweiz u. a. über die Einmalvergütung, mit PPA oder mit Kombinationen. Erlös- und Förderwerte für die Schweiz werden geprüft – Ergebnis auf Anfrage.",
    },
  },
];

// Englisch (Sprachmodell): gleiche Aussagen, Zahlen im englischen Format, Länderfassungen AT/CH übersetzt.
const z = (n, s = 0) => fmtZahl(n, s, "en");
const metadataEn = {
  title: "Buy a solar park: project rights, RTB & operating assets | ÖkoInvest",
  description: "Buy a solar park in the DACH region: project rights, ready-to-build parks and operating assets, stage model with prices, data room – free of charge for investors.",
  openGraph: {
    title: "Buy a solar park: project rights, RTB & operating assets | ÖkoInvest",
    description: "Buy a solar park in the DACH region: project rights, ready-to-build parks and operating assets, stage model with prices, data room – free of charge for investors.",
    images: [{ alt: "Illustrative image: visit to a solar park" }],
  },
};

const FAQ_EN = [
  {
    q: "What does the platform cost me as an investor?",
    a: `Nothing. Search profile, exposés, NDA and data room are free of charge for buyers. We finance the platform through a success fee paid by the seller – ${z(PROVISION.verkaeufer.min * 100, 1)}–${z(PROVISION.verkaeufer.max * 100)} % of the purchase price, only on successful closing.`,
  },
  {
    q: "Which projects do you offer?",
    a: "Projects from the ÖKOVOLT Group's own development and projects from other developers offered via the project exchange: ground-mounted PV and agrivoltaics, car park PV and battery storage, in Germany, Austria and Switzerland – from land securing to operating assets. Before publication, every project is checked for completeness of the core documents and plausibility – this does not replace due diligence.",
  },
  {
    q: "How many ready-to-build projects are available?",
    a: `To be honest: the ÖKOVOLT Group puts around ${KENNZAHLEN.entwicklungMwProJahr} MWp of new capacity into development each year. Reaching ready-to-build typically takes two to three years, and some projects fail because of the grid or planning. Ready-to-build capacity therefore comes on stream with a time lag. Those who enter earlier – for instance from the grid commitment or the resolution to draw up a development plan – have more choice and pay less, but carry more risk.`,
  },
  {
    q: "How does access to confidential documents work?",
    a: "Publicly, you see an anonymous exposé teaser with region, size, stage and key data. After registering and signing a digital non-disclosure agreement (NDA), you get access to the data room with lease agreements, planning documents, grid commitment and expert reports – every access is logged. The confidential exposé PDF also contains the standard project data sheet (technology, yield, grid, permits, offtake) together with its completeness.",
  },
  {
    q: "Do you offer co-development?",
    a: "Yes – exclusively for professional and institutional investors, not for retail investors. You take an early stake in a project or a pipeline and co-finance the development costs; we develop the project to ready-to-build. Milestone payments and a right of first refusal or takeover right at RTB are customary. We agree the minimum amount and terms for each project. Early stages carry a high risk, up to a total loss, if a project is not permitted or not connected to the grid.",
  },
  {
    q: "Can I also invest smaller amounts?",
    a: "Direct investments in project rights are usually made by professional investors from a few hundred thousand euros. For citizens and farmers, an energy cooperative with small shares and a say in decisions is in preparation; shares cannot yet be subscribed there.",
  },
  {
    q: "What revenues do buyers expect today?",
    a: `In Germany, the award from the EEG tender (German Renewable Energy Sources Act; most recently ${ERLOESE.zuschlagsHistorie.map((x) => z(x.ct, 2)).join(", ")} ct/kWh on average across the 2025 bid dates), PPA prices roughly between ${z(ERLOESE.ppaCt.min, 1)} and ${z(ERLOESE.ppaCt.max, 1)} ct/kWh, or combinations. In Austria via the EAG market premium or investment grants, in Switzerland via the one-off remuneration (Einmalvergütung), among others. The solar park return calculator shows the effect on IRR and DSCR.`,
    AT: {
      a: "In Austria via the market premium under the Renewable Energy Expansion Act (EAG) or investment grants, with a PPA or with combinations. Revenue and subsidy figures for Austria are being reviewed – result on request.",
    },
    CH: {
      a: "In Switzerland via the one-off remuneration (Einmalvergütung), among others, with a PPA or with combinations. Revenue and subsidy figures for Switzerland are being reviewed – result on request.",
    },
  },
];

const TEXTE = {
  de: {
    schemaName: "Vermittlung und Verkauf von Solarprojekten an Investoren",
    schemaTyp: "Projektrechte, baureife Projekte und Bestandsanlagen (Photovoltaik, Speicher)",
    schemaPublikum: "Investoren, Fonds, Stadtwerke, Family Offices",
    pipeEyebrow: "Pipeline – ehrlich erklärt",
    pipeTitel: (mw) => `Rund ${mw} MWp pro Jahr neu in Entwicklung.`,
    pipeLead: "Das ist Leistung, die jedes Jahr neu in die Projektentwicklung geht – nicht Leistung, die morgen baureif ist. Von der Flächensicherung bis RTB vergehen typischerweise zwei bis drei Jahre.",
    pipePunkte: [
      "Frühe Phasen: große Auswahl, niedriger Preis je kWp, höheres Risiko.",
      "Ab Satzungsbeschluss: planbar, weniger Auswahl, höherer Preis.",
      "Über die Börse kommen Projekte weiterer Entwickler dazu – mit derselben Vollständigkeits- und Plausibilitätsprüfung.",
    ],
    phEyebrow: "Phasenmodell",
    phTitel: "Risiko und Preis je Entwicklungsphase.",
    phLead: "Marktspannen für Projektrechte in €/kWp – als Orientierung für Ihr Suchprofil und Ihre Kalkulation.",
    phLeadLand: "Je früher der Einstieg, desto mehr Auswahl und Risiko – und desto niedriger der Preis je kWp.",
    phButton: "Projekt bewerten",
    phThema: "Marktspannen je Entwicklungsphase",
    phThemaEn: "Market ranges per development stage",
    ddTitel: "Die Checkliste, mit der wir jedes Projekt prüfen.",
    ddLead: "Bevor ein Projekt in die Börse geht, prüfen wir die Kernunterlagen auf Vollständigkeit. Die vollständige Prüfung bleibt Ihre – diese Liste hilft dabei.",
    ddThema: "Prüfpunkte nach Planungs-, Förder- und Gesellschaftsrecht",
    ddThemaEn: "Checkpoints under planning, subsidy and company law",
    ddFuss1: "Orientierung, keine Rechts- oder Steuerberatung. ",
    ddFussRecht: "Die Liste folgt deutschem Recht (BauGB, EEG). ",
    ddFuss2: "Für Transaktionen empfehlen wir technische, rechtliche und steuerliche Berater – im Datenraum stellen wir alle Unterlagen dafür bereit.",
    spEyebrow: "Suchprofil",
    spTitel: "Sagen Sie uns, was Sie suchen.",
    spLead: "Kurzprofil senden – wir melden uns mit passenden Projekten. Oder direkt ein Konto anlegen: Dann sehen Sie Matches, NDAs und Datenräume im Portal.",
    registrieren: "Als Investor registrieren",
    anmelden: "Schon registriert? Anmelden",
    spPunkte: ["Kostenfrei und unverbindlich", "Vertraulich: Details erst nach NDA", (stand) => `Stand der Marktangaben: ${stand}`],
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Gut zu wissen für Investoren",
    faqLead: "Weitere Fragen beantworten wir gern persönlich – nach Registrierung auch direkt im Portal.",
    quer: [
      { titel: "Projektbörse", text: "Aktuelle Projekte im DACH-Raum – Exposé-Teaser öffentlich, Details nach NDA." },
      { titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR über die gesamte Laufzeit durchrechnen." },
      { titel: "Bestandsanlagen", text: "Laufende Parks kaufen: Ertragswert, Restlaufzeit EEG, technische Due Diligence.", textLand: "Laufende Parks kaufen: Ertragswert, Restlaufzeit der Förderung, technische Due Diligence." },
      { titel: "Ratgeber Due Diligence", text: "Worauf es beim Kauf von Projektrechten im Detail ankommt." },
    ],
    ctaEyebrow: "Für Investoren kostenfrei",
    ctaTitel: "Die richtigen Projekte, bevor sie jeder sieht.",
    ctaText: "Legen Sie Ihr Suchprofil an. Wir gleichen es mit neuen Projekten aus eigener Entwicklung und aus der Börse ab – mit vorgeprüften Unterlagen; ein Ansprechpartner aus unserem Team meldet sich bei Ihnen.",
    ctaBoerse: "Zur Projektbörse",
  },
  en: {
    schemaName: "Brokerage and sale of solar projects to investors",
    schemaTyp: "Project rights, ready-to-build projects and operating assets (photovoltaics, storage)",
    schemaPublikum: "Investors, funds, municipal utilities, family offices",
    pipeEyebrow: "Pipeline – honestly explained",
    pipeTitel: (mw) => `Around ${mw} MWp entering development every year.`,
    pipeLead: "This is capacity that enters project development each year – not capacity that will be ready-to-build tomorrow. From land securing to RTB typically takes two to three years.",
    pipePunkte: [
      "Early stages: wide choice, low price per kWp, higher risk.",
      "From adoption of the development plan: predictable, less choice, higher price.",
      "Projects from other developers join via the exchange – with the same completeness and plausibility check.",
    ],
    phEyebrow: "Stage model",
    phTitel: "Risk and price per development stage.",
    phLead: "Market ranges for project rights in €/kWp – as guidance for your search profile and your calculation.",
    phLeadLand: "The earlier the entry, the more choice and risk – and the lower the price per kWp.",
    phButton: "Value a project",
    ddTitel: "The checklist we use to review every project.",
    ddLead: "Before a project goes on the exchange, we check the core documents for completeness. The full review remains yours – this list helps you with it.",
    ddFuss1: "Guidance only, not legal or tax advice. ",
    ddFussRecht: "The list follows German law (BauGB, EEG). ",
    ddFuss2: "For transactions we recommend technical, legal and tax advisers – we provide all the documents for this in the data room.",
    spEyebrow: "Search profile",
    spTitel: "Tell us what you are looking for.",
    spLead: "Send a short profile – we will get back to you with suitable projects. Or create an account straight away: you will then see matches, NDAs and data rooms in the portal.",
    registrieren: "Register as an investor",
    anmelden: "Already registered? Sign in",
    spPunkte: ["Free of charge and without obligation", "Confidential: details only after NDA", (stand) => `Market data as of: ${datumText(stand, "en")}`],
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Good to know for investors",
    faqLead: "We are happy to answer further questions personally – after registering, also directly in the portal.",
    quer: [
      { titel: "Project exchange", text: "Current projects in the DACH region – exposé teasers public, details after NDA." },
      { titel: "Solar park return calculator", text: "Work out IRR, LCOE and DSCR over the entire term." },
      { titel: "Operating assets", text: "Buy operating parks: income value, remaining EEG term, technical due diligence.", textLand: "Buy operating parks: income value, remaining subsidy term, technical due diligence." },
      { titel: "Due diligence guide", text: "What matters in detail when buying project rights." },
    ],
    ctaEyebrow: "Free of charge for investors",
    ctaTitel: "The right projects, before everyone else sees them.",
    ctaText: "Create your search profile. We match it against new projects from our own development and from the exchange – with pre-checked documents; a contact person from our team will get in touch with you.",
    ctaBoerse: "Go to the project exchange",
  },
};

export default async function InvestorenSeite({ params }) {
  // Marktspannen je kWp (PHASEN) und die Due-Diligence-Liste folgen dem deutschen Markt bzw. Recht:
  // gemeinsam mit Vermerk, in AT/CH LandHinweis statt Eurowerten.
  const land = await seitenLand(params);
  const de = !land || land === "DE";
  const sprache = spracheDerAnfrage();
  const t = uebersetze(TEXTE, sprache);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t.schemaName,
    serviceType: t.schemaTyp,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: t.schemaPublikum },
    url: abs(PFAD),
    description: sprache === "en" ? metadataEn.description : BESCHREIBUNG,
    inLanguage: sprache === "en" ? "en" : "de",
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <Hero />
      <Fakten />
      <Angebot land={land} />

      {/* ---------------- Pipeline ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <SectionHeading
            eyebrow={t.pipeEyebrow}
            title={t.pipeTitel(KENNZAHLEN.entwicklungMwProJahr)}
            lead={t.pipeLead}
          >
            <ul className="mt-7 space-y-3 text-[15.5px] leading-relaxed text-ink-700">
              {t.pipePunkte.map((punkt) => (
                <li key={punkt} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                  {punkt}
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
          <SectionHeading
            eyebrow={t.phEyebrow}
            title={t.phTitel}
            lead={
              de ? (
                <>
                  {t.phLead}
                  {!land && (
                    <>
                      {" "}
                      <GiltFuer />
                    </>
                  )}
                </>
              ) : (
                t.phLeadLand
              )
            }
          />
          <Button href={pfad("/rechner/projektbewertung")} variant="secondary" pfeil className="shrink-0 self-start lg:self-auto">
            {t.phButton}
          </Button>
        </div>
        {de ? <Phasenmodell /> : <LandHinweis land={land} thema={TEXTE.de.phThema} themaEn={TEXTE.de.phThemaEn} />}
      </Section>

      {/* ---------------- Due Diligence ---------------- */}
      <Section tone="sand" space="lg" id="due-diligence">
        <SectionHeading
          eyebrow="Due Diligence"
          title={t.ddTitel}
          lead={t.ddLead}
          className="mb-10"
        />
        <DdCheckliste />
        {!de && <LandHinweis land={land} thema={TEXTE.de.ddThema} themaEn={TEXTE.de.ddThemaEn} zeile className="mt-6" />}
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
          {t.ddFuss1}
          {de ? "" : t.ddFussRecht}
          {t.ddFuss2}
          {!land && (
            <>
              {" "}
              <GiltFuer />
            </>
          )}
        </p>
      </Section>

      <Ablauf />
      <Provision land={land} />

      {/* ---------------- Registrierung & Formular ---------------- */}
      <Section tone="navy" space="lg" id="suchprofil">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow={t.spEyebrow}
              title={<TextEnthuellung ausloeser="scrollen">{t.spTitel}</TextEnthuellung>}
              lead={t.spLead}
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button href="/registrieren?rolle=investor" variant="white" pfeil magnetisch>
                {t.registrieren}
              </Button>
              <Button href="/login" variant="outlineLight">
                {t.anmelden}
              </Button>
            </div>
            <ul className="mt-10 space-y-3 border-t border-white/10 pt-8 text-[14.5px] text-white/75">
              {t.spPunkte.map((p) => (typeof p === "function" ? p(STAND) : p)).map((punkt) => (
                <li key={punkt} className="flex items-center gap-2.5">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" />
                  {punkt}
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
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={faqFuerLand(sprache === "en" ? FAQ_EN : FAQ, land, { sprache })} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/projektboerse", titel: t.quer[0].titel, text: t.quer[0].text },
          { href: pfad("/rechner/solarpark"), titel: t.quer[1].titel, text: t.quer[1].text },
          { href: pfad("/bestandsanlagen"), titel: t.quer[2].titel, text: de ? t.quer[2].text : t.quer[2].textLand },
          { href: "/ratgeber/projektrechte-kaufen-due-diligence", titel: t.quer[3].titel, text: t.quer[3].text },
        ]}
      />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.registrieren, href: "/registrieren?rolle=investor" }}
        secondary={{ label: t.ctaBoerse, href: "/projektboerse" }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/investoren", metadata, { en: metadataEn });

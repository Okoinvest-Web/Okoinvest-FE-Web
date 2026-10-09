import { Bell, Euro, FileText, LayoutDashboard, ListChecks, MessageSquare, Route, Timer } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import ProzessTabs from "@/components/Prozess/ProzessTabs";
import RollenWahl from "@/components/Prozess/RollenWahl";
import { ZIELGRUPPEN, zielgruppenSprache } from "@/components/Prozess/prozessDaten";
import NachtHero from "@/components/Unternehmen/NachtHero";
import Faktenleiste from "@/components/Unternehmen/Faktenleiste";
import VorgangBuehne from "@/components/Kontakt/VorgangBuehne";
import { FAQ_PROZESS } from "@/data/faq";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";
import { PROVISION } from "@/lib/invest/markt";
import { faqFuerLand } from "@/components/Land/Laenderteile";

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

// Englisch (Sprachmodell)
const metadataEn = rechnerMetadataEn({
  title: "Solar park project process: steps, duration, portal | ÖkoInvest",
  description: "Steps, duration, documents and portal status: how we work with landowners, farmers, investors, project sellers and companies.",
  keywords: ["solar park process", "photovoltaic project development", "development plan solar park duration", "project exchange process", "agrivoltaics process"],
});

const FAQ_PROZESS_EN = [
  {
    q: "How long does it take from land to a finished solar park?",
    a: "Realistically, two to four years. The biggest block of time is planning permission (a development plan, Bebauungsplan, in Germany; rezoning, Umwidmung, in Austria) and the grid connection commitment. Construction itself usually takes only a few months. We put around 50 MWp of new capacity into development each year – these projects usually only become ready-to-build years later.",
    AT: { a: "Realistically, two to four years. The biggest block of time is rezoning the land (Umwidmung) under the spatial planning law of the federal state and the grid connection commitment. Construction itself usually takes only a few months. We put around 50 MWp of new capacity into development each year – these projects usually only become ready-to-build years later." },
    CH: { a: "In Switzerland, this depends above all on the permit from the municipality and the canton and on the grid connection commitment; we only state a reliable duration after assessing the site. Construction itself usually takes only a few months. We put around 50 MWp of new capacity into development each year – these projects usually only become ready-to-build years later." },
  },
  {
    q: "What do I see in the portal?",
    a: "Your case with its current status, all documents (contracts, expert reports, plans), messages with your contact person and the next steps. Enquiries you made before registering appear automatically when you register with the same e-mail address.",
  },
  {
    q: "What does working with you cost me?",
    a: `Always free of charge for landowners; investors use the project exchange free of charge (search profile, NDA, data room). Sellers of projects pay ${fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en")}–${fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en")} % of the purchase price, only on successful closing.`,
  },
  {
    q: "What happens if the project fails?",
    a: "It happens – for example if the municipal council does not pass a resolution to draw up a development plan or no grid connection is possible. Landowners incur no costs as a result; the land-use agreement sets out when it ends. In the portal you can see at any time which stage your project is at and what it is currently waiting for.",
    AT: { a: "It happens – for example if the municipality does not rezone the land or no grid connection is possible. Landowners incur no costs as a result; the land-use agreement sets out when it ends. In the portal you can see at any time which stage your project is at and what it is currently waiting for." },
    CH: { a: "It happens – for example if the municipality or canton does not grant a permit or no grid connection is possible. Landowners incur no costs as a result; the land-use agreement sets out when it ends. In the portal you can see at any time which stage your project is at and what it is currently waiting for." },
  },
];

const TEXTE = {
  de: {
    schemaName: "Von der Fläche zum Solarpark – Ablauf mit ÖkoInvest",
    dauer: "Dauer",
    brotkrumen: "Projektprozess",
    eyebrow: "So arbeiten wir",
    titel1: "Von der Anfrage bis zum Betrieb – ",
    titel2: "Schritt für Schritt.",
    lead: "Wie lange dauert was? Wer macht welchen Schritt? Welche Unterlagen brauchen Sie – und was sehen Sie im Portal? Wählen Sie Ihre Rolle und sehen Sie Ihren Weg.",
    ablaufAnsehen: "Ablauf ansehen",
    flaeche: "Fläche prüfen lassen",
    chips: ["Dauer je Schritt als typische Spanne", "Wer was macht – Sie und wir", "Unterlagen je Schritt", "Statusstufen im Portal"],
    faktenTitel: "Der Prozess in Zahlen",
    fakten: [
      { label: "Wege", text: "je nach Rolle – vom Eigentümer bis zum Unternehmen" },
      { label: "Statusstufen", text: (a, b) => `von „${a}“ bis „${b}“ – im Portal sichtbar` },
      { einheit: "Jahre", label: "bis zum Betrieb", text: "typisch für einen Solarpark auf Ihrer Fläche" },
      { label: "für Flächeneigentümer", text: "Entwicklung, Bau und Betrieb übernehmen wir" },
    ],
    aEyebrow: "Ihr Ablauf",
    aTitel: "Wer macht was – und wie lange dauert es?",
    aLead: "Jeder Schritt mit typischer Dauer, Ihren Aufgaben, unseren Aufgaben, den Unterlagen und der Statusstufe im Portal.",
    aFuss: "Dauern sind typische Spannen im DACH-Raum nach aktuellem Stand und hängen stark von Gemeinde, Netzbetreiber und Genehmigungsbehörden ab. Wir nennen Ihnen für Ihr Projekt einen eigenen Zeitplan.",
    pEyebrow: "Das Portal",
    pTitel: "Ein Login für jeden Schritt",
    pLead: "Was Sie per Formular anfragen, wird zum Vorgang. Registrieren Sie sich mit derselben E-Mail-Adresse – dann sehen Sie ihn samt Status im Portal.",
    portal: PORTAL,
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Fragen zum Ablauf",
    faqLead: "Dauer, Kosten, Portal – und was passiert, wenn es nicht klappt.",
    quer: QUERVERWEISE,
    ctaEyebrow: "Der erste Schritt",
    ctaTitel: "Fünf Minuten für die Anfrage – wir machen den Rest.",
    zugang: "Zugang anlegen",
  },
  en: {
    schemaName: "From land to solar park – the process with ÖkoInvest",
    dauer: "Duration",
    brotkrumen: "Project process",
    eyebrow: "How we work",
    titel1: "From enquiry to operation – ",
    titel2: "step by step.",
    lead: "How long does what take? Who does which step? Which documents do you need – and what do you see in the portal? Choose your role and see your path.",
    ablaufAnsehen: "See the process",
    flaeche: "Have your land checked",
    chips: ["Duration per step as a typical range", "Who does what – you and us", "Documents per step", "Status stages in the portal"],
    faktenTitel: "The process in figures",
    fakten: [
      { label: "Paths", text: "depending on your role – from owner to company" },
      { label: "Status stages", text: (a, b) => `from “${a}” to “${b}” – visible in the portal` },
      { einheit: "years", label: "until operation", text: "typical for a solar park on your land" },
      { label: "for landowners", text: "we take care of development, construction and operation" },
    ],
    aEyebrow: "Your process",
    aTitel: "Who does what – and how long does it take?",
    aLead: "Every step with its typical duration, your tasks, our tasks, the documents and the status stage in the portal.",
    aFuss: "Durations are typical ranges in the DACH region as things stand and depend heavily on the municipality, grid operator and permitting authorities. We will give you a schedule for your own project.",
    pEyebrow: "The portal",
    pTitel: "One login for every step",
    pLead: "Whatever you request via a form becomes a case. Register with the same e-mail address – and you will see it, including its status, in the portal.",
    portal: [
      { title: "Real-time status", text: "Every case has a status stage. You can see where your project stands and what comes next." },
      { title: "All documents in one place", text: "Contracts, expert reports, plans and statements – versioned and available at any time." },
      { title: "A direct line", text: "Messages to your dedicated contact person instead of e-mail chains." },
      { title: "Notifications", text: "When the status changes or a document is ready for signature." },
    ],
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Questions about the process",
    faqLead: "Duration, costs, portal – and what happens if it does not work out.",
    quer: [
      { titel: "Land check", text: "Suitability and lease range for your land in a few minutes." },
      { titel: "Project exchange", text: "Projects at every stage – from project rights to operating assets." },
      { titel: "About ÖkoInvest", text: "Who is behind the platform: group, companies, pipeline." },
    ],
    ctaEyebrow: "The first step",
    ctaTitel: "Five minutes for the enquiry – we do the rest.",
    zugang: "Create account",
  },
};

export default async function ProzessPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const wege = zielgruppenSprache(sprache);
  const flaeche = wege[0];
  const [jahre] = ZIELGRUPPEN[0].gesamt.split(" Jahre");
  const seitenSchema = en
    ? {
        ...schema,
        name: t.schemaName,
        inLanguage: "en",
        description: flaeche.intro,
        step: flaeche.schritte.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.titel, text: `${s.wir} ${t.dauer}: ${s.dauer}.` })),
      }
    : schema;

  return (
    <div>
      <JsonLd daten={seitenSchema} />

      <NachtHero
        mitLeiste
        breadcrumbs={[{ name: t.brotkrumen }]}
        eyebrow={t.eyebrow}
        title={
          <>
            {t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span>
          </>
        }
        lead={t.lead}
        actions={[
          { label: t.ablaufAnsehen, href: "#ablauf" },
          { label: t.flaeche, href: seitenPfad("/flaechencheck") },
        ]}
        chips={t.chips}
        buehne={<RollenWahl />}
      />

      <Faktenleiste
        titel={t.faktenTitel}
        items={[
          { icon: Route, wert: String(wege.length), ...t.fakten[0] },
          { icon: ListChecks, wert: String(flaeche.schritte.length), ...t.fakten[1], text: t.fakten[1].text(flaeche.schritte[0].portal, flaeche.schritte.at(-1).portal) },
          { icon: Timer, wert: jahre, ...t.fakten[2] },
          { icon: Euro, wert: "0", einheit: "€", ...t.fakten[3] },
        ]}
      />

      <Section tone="sand" space="lg" id="ablauf" className="scroll-mt-24">
        <SectionHeading
          eyebrow={t.aEyebrow}
          title={t.aTitel}
          lead={t.aLead}
          className="mb-10 md:mb-12"
        />
        <ProzessTabs />
        <p className="mx-auto mt-8 max-w-5xl text-[13px] leading-relaxed text-ink-500">
          {t.aFuss}
        </p>
      </Section>

      <Section tone="white" space="lg" className="overflow-hidden">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={t.pEyebrow}
              title={t.pTitel}
              lead={t.pLead}
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {t.portal.map((p, i) => (
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
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={faqFuerLand(en ? FAQ_PROZESS_EN : FAQ_PROZESS, land, { sprache })} />
        </div>
      </Section>

      <Querverweise items={t.quer} />
      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        primary={{ label: t.flaeche, href: seitenPfad("/flaechencheck") }}
        secondary={{ label: t.zugang, href: "/registrieren" }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/prozess", metadata, { en: metadataEn });

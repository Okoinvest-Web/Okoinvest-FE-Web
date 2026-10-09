import Link from "@/components/Land/Link";
import { ArrowRight, Clock, ClipboardList, FileSearch, Handshake, LayoutDashboard, MapPin, MessageSquare, Phone } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import KontaktAnliegen from "@/components/Kontakt/KontaktAnliegen";
import DachKarte from "@/components/Kontakt/DachKarte";
import VorgangBuehne, { TAGE_EN } from "@/components/Kontakt/VorgangBuehne";
import NachtHero from "@/components/Unternehmen/NachtHero";
import st from "@/components/Unternehmen/vertrauen.module.css";
import { FAQ_KONTAKT } from "@/data/faq";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const PFAD = "/kontakt";

const metadata = {
  ...rechnerMetadata({
  pfad: PFAD,
  title: "Kontakt: Anfrage an das Projektteam | ÖkoInvest",
  description:
    "Fläche, Agri-PV, Investment, Projekt, Reststrom oder Genossenschaft: Wählen Sie Ihr Anliegen und schreiben Sie dem ÖkoInvest-Projektteam in Ostermiething.",
  keywords: ["ÖkoInvest Kontakt", "Solarpark Anfrage", "Fläche verpachten Anfrage", "Projektentwickler Kontakt", "Ostermiething"],
  }),
};

const TAGE = { "Mo – Do": ["Monday", "Tuesday", "Wednesday", "Thursday"], Fr: ["Friday"] };

const schema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: `Kontakt | ${SITE.name}`,
  isPartOf: { "@id": `${abs("/")}/#website` },
  mainEntity: {
    "@type": "Organization",
    "@id": `${abs("/")}/#organization`,
    name: GESELLSCHAFT.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: GESELLSCHAFT.sitz,
      postalCode: GESELLSCHAFT.plz,
      addressLocality: GESELLSCHAFT.ort,
      addressRegion: "Oberösterreich",
      addressCountry: "AT",
    },
    ...(KONTAKT.telefon ? { telephone: KONTAKT.telefon } : {}),
    ...(KONTAKT.email ? { email: KONTAKT.email } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: abs(PFAD),
      areaServed: ["DE", "AT", "CH"],
      availableLanguage: ["German"],
      hoursAvailable: KONTAKT.oeffnungszeiten.map((o) => {
        const [opens, closes] = o.zeit.split("–").map((s) => s.trim());
        return { "@type": "OpeningHoursSpecification", dayOfWeek: TAGE[o.tage] || [], opens, closes };
      }),
    },
  },
};

/** Was nach dem Absenden passiert – dieselben Aussagen wie im Kopf der Seite */
const ABLAUF = [
  { icon: ClipboardList, titel: "Anliegen wählen und senden", text: "Das Formular passt sich an. Unterlagen können Sie später im Portal hochladen." },
  { icon: FileSearch, titel: "Ihr Vorgang wird angelegt", text: "Und einem festen Ansprechpartner aus dem Projektteam zugeordnet." },
  { icon: Handshake, titel: "Wir melden uns", text: "Persönlich durch unser Team – kostenlos und unverbindlich." },
  { icon: LayoutDashboard, titel: "Status im Portal", text: "Mit derselben E-Mail-Adresse registrieren und den Stand jederzeit sehen." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/prozess"), titel: "Projektprozess", text: "Was nach Ihrer Anfrage passiert – Schritt für Schritt." },
  { href: seitenPfad("/faq"), titel: "Häufige Fragen", text: "Antworten für Eigentümer, Landwirte, Investoren und Unternehmen." },
  { href: "/unternehmen", titel: "Über ÖkoInvest", text: "Gruppe, Gesellschaften und Geschäftsführung." },
];

// Englisch (Sprachmodell)
const metadataEn = rechnerMetadataEn({
  title: "Contact: enquiry to the project team | ÖkoInvest",
  description: "Land, agrivoltaics, investment, project, residual power or cooperative: choose your topic and write to the ÖkoInvest project team in Ostermiething.",
  keywords: ["ÖkoInvest contact", "solar park enquiry", "lease land solar", "project developer contact", "Ostermiething"],
});

const FAQ_KONTAKT_EN = [
  {
    q: "How quickly will I get a reply?",
    a: "Every enquiry is created as a case and assigned to a person responsible for your country, who will get back to you personally. After registering, you can see the status in the portal.",
  },
  {
    q: "Why is there no phone number on the website?",
    a: "We are currently building up the platform's customer service. To make sure no enquiry gets lost, all requests currently go through the forms and the portal. If you would like a call back, enter your number in the form – we will get in touch.",
  },
  {
    q: "Which documents should I have to hand?",
    a: "For land: plot numbers or a map extract, size and current use. For the residual power pool: annual consumption or load profile and your current electricity contract. For projects: development status, grid request and land securing. Everything else can be uploaded later in the portal.",
  },
  {
    q: "Can I visit you in Ostermiething?",
    a: "Gladly, by appointment. Let us know via the form when it suits you – unfortunately we cannot always accommodate spontaneous visits.",
  },
];

const TEXTE = {
  de: {
    brotkrumen: "Kontakt",
    eyebrow: (ort) => `Kontakt · ${ort}`,
    titel1: "Ihr Anliegen, ",
    titel2: "unser Projektteam.",
    lead: "Wählen Sie, worum es geht – das Formular passt sich an. Jede Anfrage wird als Vorgang angelegt und einem festen Ansprechpartner zugeordnet. Im Portal verfolgen Sie den Status.",
    schreiben: "Anfrage schreiben",
    termin: "Termin buchen",
    chips: ["Persönliche Rückmeldung", "Status im Portal", "Kostenlos und unverbindlich"],
    anfrage: "Anfrage",
    schreibenSie: "Schreiben Sie uns",
    pflicht: "Pflichtfelder sind mit * markiert. Unterlagen können Sie später im Portal hochladen.",
    absenden: "Was nach dem Absenden passiert",
    ablauf: ABLAUF,
    schritt: (n) => `Schritt ${n}: `,
    adresse: "Adresse und Bürozeiten",
    land: KONTAKT.land,
    buerozeiten: "Bürozeiten",
    uhr: " Uhr",
    besuche: "Besuche in Ostermiething nach Terminvereinbarung.",
    lageAnsehen: "Lage ansehen",
    schon: "Schon eine Anfrage gestellt?",
    schonText: "Registrieren Sie sich mit derselben E-Mail-Adresse – Ihre Anfrage erscheint automatisch mit Status, Dokumenten und Nachrichten im Portal.",
    zugang: "Zugang anlegen",
    anmelden: "Anmelden",
    lageEyebrow: "Lage",
    lageTitel1: "Mitten im ",
    lageTitel2: "DACH-Raum",
    lageLead: (ort) => `Unser Sitz liegt in ${ort} im oberösterreichischen Innviertel, nahe der Grenze zu Bayern und unweit von Salzburg. Die Muttergesellschaft der Gruppe sitzt in Türkheim im Unterallgäu.`,
    lageText: "Wir arbeiten in Deutschland, Österreich und der Schweiz. Für Termine vor Ort kommen wir zu Ihrer Fläche, in Ihre Gemeinde oder Ihr Unternehmen.",
    karte: "Die Karte ist eine vereinfachte Darstellung und wird ohne Kartendienst geladen – es werden keine Daten an Dritte übertragen.",
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Vor der ersten Anfrage",
    faqLead: "Antwortzeiten, Unterlagen und Besuche.",
    quer: QUERVERWEISE,
    ctaEyebrow: "Schneller zur Einschätzung",
    ctaTitel: "Lieber gleich rechnen? Unsere Tools liefern erste Zahlen.",
    ctaPrimaer: "Fläche prüfen",
    ctaSekundaer: "Alle Rechner",
  },
  en: {
    brotkrumen: "Contact",
    eyebrow: (ort) => `Contact · ${ort}`,
    titel1: "Your request, ",
    titel2: "our project team.",
    lead: "Choose what it is about – the form adapts. Every enquiry is created as a case and assigned to a dedicated contact person. You can track the status in the portal.",
    schreiben: "Write an enquiry",
    termin: "Book an appointment",
    chips: ["Personal response", "Status in the portal", "Free of charge and without obligation"],
    anfrage: "Enquiry",
    schreibenSie: "Write to us",
    pflicht: "Required fields are marked with *. You can upload documents later in the portal.",
    absenden: "What happens after you submit",
    ablauf: [
      { titel: "Choose your topic and send", text: "The form adapts. You can upload documents later in the portal." },
      { titel: "Your case is created", text: "And assigned to a dedicated contact person from the project team." },
      { titel: "We get back to you", text: "Personally from our team – free of charge and without obligation." },
      { titel: "Status in the portal", text: "Register with the same e-mail address and see the status at any time." },
    ],
    schritt: (n) => `Step ${n}: `,
    adresse: "Address and office hours",
    land: "Austria",
    buerozeiten: "Office hours",
    uhr: "",
    besuche: "Visits to Ostermiething by appointment.",
    lageAnsehen: "View location",
    schon: "Already sent an enquiry?",
    schonText: "Register with the same e-mail address – your enquiry will appear automatically in the portal with status, documents and messages.",
    zugang: "Create account",
    anmelden: "Sign in",
    lageEyebrow: "Location",
    lageTitel1: "In the heart of the ",
    lageTitel2: "DACH region",
    lageLead: (ort) => `Our head office is in ${ort} in the Innviertel region of Upper Austria, close to the Bavarian border and not far from Salzburg. The group's parent company is based in Türkheim in the Unterallgäu district (Bavaria).`,
    lageText: "We work in Germany, Austria and Switzerland. For on-site appointments, we come to your land, your municipality or your company.",
    karte: "The map is a simplified illustration and is loaded without a map service – no data is transferred to third parties.",
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Before your first enquiry",
    faqLead: "Response times, documents and visits.",
    quer: [
      { titel: "Project process", text: "What happens after your enquiry – step by step." },
      { titel: "Frequently asked questions", text: "Answers for owners, farmers, investors and companies." },
      { titel: "About ÖkoInvest", text: "Group, companies and management." },
    ],
    ctaEyebrow: "A faster assessment",
    ctaTitel: "Prefer to run the numbers first? Our tools provide initial figures.",
    ctaPrimaer: "Check your land",
    ctaSekundaer: "All calculators",
  },
};

export default async function KontaktPage({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  return (
    <div>
      <JsonLd daten={en ? { ...schema, name: `Contact | ${SITE.name}`, inLanguage: "en" } : schema} />

      <NachtHero
        breadcrumbs={[{ name: t.brotkrumen }]}
        eyebrow={t.eyebrow(GESELLSCHAFT.ort)}
        title={
          <>
            {t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span>
          </>
        }
        lead={t.lead}
        actions={[
          { label: t.schreiben, href: "#formular" },
          { label: t.termin, href: "/termin?herkunft=kontakt" },
        ]}
        chips={t.chips}
        buehne={<VorgangBuehne />}
      />

      <Section tone="sand" space="lg" id="formular" className="scroll-mt-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-e4 ring-1 ring-ink-200/70 sm:p-8 md:p-12">
            <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
            <p className="ov-overline flex items-center gap-2 text-ov-700">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              {t.anfrage}
            </p>
            <h2 className="ov-h2 mt-4 text-ink-900">{t.schreibenSie}</h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">{t.pflicht}</p>
            <div className="mt-8 md:mt-10">
              <KontaktAnliegen />
            </div>
          </Reveal>

          <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal delay={60} className="rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
              <h2 className="font-display text-[17px] font-bold text-ink-900">{t.absenden}</h2>
              <ol className="relative mt-5 space-y-5">
                {t.ablauf.map((a, i) => (
                  <li key={a.titel} className="relative flex gap-4">
                    {/* Verbindung zeichnet sich Schritt für Schritt – zeigt die Reihenfolge nach dem Absenden */}
                    {i < t.ablauf.length - 1 && <span aria-hidden="true" className={`${st.linieY} absolute -bottom-5 left-[17px] top-9 w-px bg-ov-300`} style={{ "--t": `${350 + i * 260}ms` }} />}
                    <span aria-hidden="true" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 shadow-e1 ring-1 ring-ov-200">
                      <a.icon className="h-4 w-4" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ov-600 text-[10px] font-bold text-white">{i + 1}</span>
                    </span>
                    <div>
                      <p className="font-display text-[15.5px] font-bold leading-snug text-ink-900">
                        <span className="sr-only">{t.schritt(i + 1)}</span>
                        {a.titel}
                      </p>
                      <p className="mt-0.5 text-[14px] leading-snug text-ink-600">{a.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={120} className="rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
              <h2 className="sr-only">{t.adresse}</h2>
              <div className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                <address className="text-[15px] not-italic leading-relaxed text-ink-600">
                  <strong className="font-semibold text-ink-900">{GESELLSCHAFT.name}</strong>
                  <br />
                  {KONTAKT.strasse}, {KONTAKT.ort}
                  <br />
                  {t.land}
                </address>
              </div>
              <div className="mt-5 flex items-start gap-3 border-t border-ink-100 pt-5">
                <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-900">{t.buerozeiten}</p>
                  <dl className="mt-1.5 space-y-1 text-[15px]">
                    {KONTAKT.oeffnungszeiten.map((o) => (
                      <div key={o.tage} className="flex justify-between gap-4">
                        <dt className="text-ink-600">{en ? TAGE_EN[o.tage] ?? o.tage : o.tage}</dt>
                        <dd className="ov-num font-semibold text-ink-900">{o.zeit}{t.uhr}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{t.besuche}</p>
                </div>
              </div>
              {KONTAKT.telefon && (
                <a href={KONTAKT.telefonHref} className="mt-5 flex min-h-11 items-center gap-3 border-t border-ink-100 pt-5 font-display text-[17px] font-bold text-ink-900 hover:text-ov-700">
                  <Phone aria-hidden="true" className="h-5 w-5 text-ov-600" />
                  {KONTAKT.telefon}
                </a>
              )}
              <a href="#lage" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded text-[14.5px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                {t.lageAnsehen}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </Reveal>

            <Reveal delay={180} className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-3xl p-6 text-white md:p-7">
              <LayoutDashboard aria-hidden="true" className="relative h-6 w-6 text-ov-300" />
              <h2 className="relative mt-4 font-display text-[20px] font-extrabold leading-tight">{t.schon}</h2>
              <p className="relative mt-2.5 text-[14.5px] leading-relaxed text-white/75">
                {t.schonText}
              </p>
              <div className="relative mt-5 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/registrieren"
                  className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                >
                  {t.zugang}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full px-5 text-[14.5px] font-semibold text-white ring-1 ring-inset ring-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                >
                  {t.anmelden}
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg" id="lage" className="scroll-mt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={t.lageEyebrow}
              title={
                <>
                  {t.lageTitel1}<span className="ov-text-gradient">{t.lageTitel2}</span>
                </>
              }
              lead={t.lageLead(GESELLSCHAFT.ort)}
            />
            <Reveal className="mt-8 flex gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 ring-1 ring-ink-200">
                <MessageSquare className="h-5 w-5" />
              </span>
              <p className="text-[15px] leading-relaxed text-ink-600">
                {t.lageText}
              </p>
            </Reveal>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
              {t.karte}
            </p>
          </div>
          <Reveal dir="right" className="relative overflow-hidden rounded-[2rem] bg-sand-50 p-4 shadow-e3 ring-1 ring-ink-200/70 sm:p-8">
            <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0" />
            <DachKarte className="relative mx-auto block h-auto w-full max-w-[520px]" />
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={en ? FAQ_KONTAKT_EN : FAQ_KONTAKT} />
        </div>
      </Section>

      <Querverweise items={t.quer} />
      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        primary={{ label: t.ctaPrimaer, href: seitenPfad("/flaechencheck") }}
        secondary={{ label: t.ctaSekundaer, href: seitenPfad("/rechner") }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/kontakt", metadata, { en: metadataEn });

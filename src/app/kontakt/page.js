import { sprachAlternates } from "@/data/site";
import Link from "next/link";
import { ArrowRight, Clock, ClipboardList, FileSearch, Handshake, LayoutDashboard, MapPin, MessageSquare, Phone } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import KontaktAnliegen from "@/components/Kontakt/KontaktAnliegen";
import DachKarte from "@/components/Kontakt/DachKarte";
import VorgangBuehne from "@/components/Kontakt/VorgangBuehne";
import NachtHero from "@/components/Unternehmen/NachtHero";
import st from "@/components/Unternehmen/vertrauen.module.css";
import { FAQ_KONTAKT } from "@/data/faq";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";

const PFAD = "/kontakt";

export const metadata = {
  ...rechnerMetadata({
  pfad: PFAD,
  title: "Kontakt: Anfrage an das Projektteam | ÖkoInvest",
  description:
    "Fläche, Agri-PV, Investment, Projekt, Reststrom oder Genossenschaft: Wählen Sie Ihr Anliegen und schreiben Sie dem ÖkoInvest-Projektteam in Ostermiething.",
  keywords: ["ÖkoInvest Kontakt", "Solarpark Anfrage", "Fläche verpachten Anfrage", "Projektentwickler Kontakt", "Ostermiething"],
  }),
  alternates: sprachAlternates("/kontakt", "/en/contact"),
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
  { href: "/prozess", titel: "Projektprozess", text: "Was nach Ihrer Anfrage passiert – Schritt für Schritt." },
  { href: "/faq", titel: "Häufige Fragen", text: "Antworten für Eigentümer, Landwirte, Investoren und Unternehmen." },
  { href: "/unternehmen", titel: "Über ÖkoInvest", text: "Gruppe, Gesellschaften und Geschäftsführung." },
];

export default function KontaktPage() {
  return (
    <div>
      <JsonLd daten={schema} />

      <NachtHero
        breadcrumbs={[{ name: "Kontakt" }]}
        eyebrow={`Kontakt · ${GESELLSCHAFT.ort}`}
        title={
          <>
            Ihr Anliegen, <span className="ov-text-gradient-light">unser Projektteam.</span>
          </>
        }
        lead="Wählen Sie, worum es geht – das Formular passt sich an. Jede Anfrage wird als Vorgang angelegt und einem festen Ansprechpartner zugeordnet. Im Portal verfolgen Sie den Status."
        actions={[
          { label: "Anfrage schreiben", href: "#formular" },
          { label: "Termin buchen", href: "/termin?herkunft=kontakt" },
        ]}
        chips={["Persönliche Rückmeldung", "Status im Portal", "Kostenlos und unverbindlich"]}
        buehne={<VorgangBuehne />}
      />

      <Section tone="sand" space="lg" id="formular" className="scroll-mt-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-e4 ring-1 ring-ink-200/70 sm:p-8 md:p-12">
            <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
            <p className="ov-overline flex items-center gap-2 text-ov-700">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              Anfrage
            </p>
            <h2 className="ov-h2 mt-4 text-ink-900">Schreiben Sie uns</h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">Pflichtfelder sind mit * markiert. Unterlagen können Sie später im Portal hochladen.</p>
            <div className="mt-8 md:mt-10">
              <KontaktAnliegen />
            </div>
          </Reveal>

          <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal delay={60} className="rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
              <h2 className="font-display text-[17px] font-bold text-ink-900">Was nach dem Absenden passiert</h2>
              <ol className="relative mt-5 space-y-5">
                {ABLAUF.map((a, i) => (
                  <li key={a.titel} className="relative flex gap-4">
                    {/* Verbindung zeichnet sich Schritt für Schritt – zeigt die Reihenfolge nach dem Absenden */}
                    {i < ABLAUF.length - 1 && <span aria-hidden="true" className={`${st.linieY} absolute -bottom-5 left-[17px] top-9 w-px bg-ov-300`} style={{ "--t": `${350 + i * 260}ms` }} />}
                    <span aria-hidden="true" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 shadow-e1 ring-1 ring-ov-200">
                      <a.icon className="h-4 w-4" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ov-600 text-[10px] font-bold text-white">{i + 1}</span>
                    </span>
                    <div>
                      <p className="font-display text-[15.5px] font-bold leading-snug text-ink-900">
                        <span className="sr-only">Schritt {i + 1}: </span>
                        {a.titel}
                      </p>
                      <p className="mt-0.5 text-[14px] leading-snug text-ink-600">{a.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={120} className="rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7">
              <h2 className="sr-only">Adresse und Bürozeiten</h2>
              <div className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                <address className="text-[15px] not-italic leading-relaxed text-ink-600">
                  <strong className="font-semibold text-ink-900">{GESELLSCHAFT.name}</strong>
                  <br />
                  {KONTAKT.strasse}, {KONTAKT.ort}
                  <br />
                  {KONTAKT.land}
                </address>
              </div>
              <div className="mt-5 flex items-start gap-3 border-t border-ink-100 pt-5">
                <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-900">Bürozeiten</p>
                  <dl className="mt-1.5 space-y-1 text-[15px]">
                    {KONTAKT.oeffnungszeiten.map((o) => (
                      <div key={o.tage} className="flex justify-between gap-4">
                        <dt className="text-ink-600">{o.tage}</dt>
                        <dd className="ov-num font-semibold text-ink-900">{o.zeit} Uhr</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-500">Besuche in Ostermiething nach Terminvereinbarung.</p>
                </div>
              </div>
              {KONTAKT.telefon && (
                <a href={KONTAKT.telefonHref} className="mt-5 flex min-h-11 items-center gap-3 border-t border-ink-100 pt-5 font-display text-[17px] font-bold text-ink-900 hover:text-ov-700">
                  <Phone aria-hidden="true" className="h-5 w-5 text-ov-600" />
                  {KONTAKT.telefon}
                </a>
              )}
              <a href="#lage" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded text-[14.5px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                Lage ansehen
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </Reveal>

            <Reveal delay={180} className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-3xl p-6 text-white md:p-7">
              <LayoutDashboard aria-hidden="true" className="relative h-6 w-6 text-ov-300" />
              <h2 className="relative mt-4 font-display text-[20px] font-extrabold leading-tight">Schon eine Anfrage gestellt?</h2>
              <p className="relative mt-2.5 text-[14.5px] leading-relaxed text-white/75">
                Registrieren Sie sich mit derselben E-Mail-Adresse – Ihre Anfrage erscheint automatisch mit Status, Dokumenten und Nachrichten im Portal.
              </p>
              <div className="relative mt-5 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/registrieren"
                  className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                >
                  Zugang anlegen
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full px-5 text-[14.5px] font-semibold text-white ring-1 ring-inset ring-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                >
                  Anmelden
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
              eyebrow="Lage"
              title={
                <>
                  Mitten im <span className="ov-text-gradient">DACH-Raum</span>
                </>
              }
              lead={`Unser Sitz liegt in ${GESELLSCHAFT.ort} im oberösterreichischen Innviertel, nahe der Grenze zu Bayern und unweit von Salzburg. Die Muttergesellschaft der Gruppe sitzt in Türkheim im Unterallgäu.`}
            />
            <Reveal className="mt-8 flex gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 ring-1 ring-ink-200">
                <MessageSquare className="h-5 w-5" />
              </span>
              <p className="text-[15px] leading-relaxed text-ink-600">
                Wir arbeiten in Deutschland, Österreich und der Schweiz. Für Termine vor Ort kommen wir zu Ihrer Fläche, in Ihre Gemeinde oder Ihr Unternehmen.
              </p>
            </Reveal>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
              Die Karte ist eine vereinfachte Darstellung und wird ohne Kartendienst geladen – es werden keine Daten an Dritte übertragen.
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
          <SectionHeading eyebrow="Häufige Fragen" title="Vor der ersten Anfrage" lead="Antwortzeiten, Unterlagen und Besuche." />
          <Faq items={FAQ_KONTAKT} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Schneller zur Einschätzung"
        title="Lieber gleich rechnen? Unsere Tools liefern erste Zahlen."
        primary={{ label: "Fläche prüfen", href: "/flaechencheck" }}
        secondary={{ label: "Alle Rechner", href: "/rechner" }}
      />
    </div>
  );
}

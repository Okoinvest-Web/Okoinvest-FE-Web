import Link from "next/link";
import { ArrowRight, Clock, LayoutDashboard, MapPin, MessageSquare, Phone } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import KontaktAnliegen from "@/components/Kontakt/KontaktAnliegen";
import DachKarte from "@/components/Kontakt/DachKarte";
import { FAQ_KONTAKT } from "@/data/faq";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";

const PFAD = "/kontakt";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Kontakt: Anfrage an das Projektteam | ÖkoInvest",
  description:
    "Fläche, Agri-PV, Investment, Projekt, Reststrom oder Genossenschaft: Wählen Sie Ihr Anliegen und schreiben Sie dem ÖkoInvest-Projektteam in Ostermiething.",
  keywords: ["ÖkoInvest Kontakt", "Solarpark Anfrage", "Fläche verpachten Anfrage", "Projektentwickler Kontakt", "Ostermiething"],
});

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

const QUERVERWEISE = [
  { href: "/prozess", titel: "Projektprozess", text: "Was nach Ihrer Anfrage passiert – Schritt für Schritt." },
  { href: "/faq", titel: "Häufige Fragen", text: "Antworten für Eigentümer, Landwirte, Investoren und Unternehmen." },
  { href: "/unternehmen", titel: "Über ÖkoInvest", text: "Gruppe, Gesellschaften und Geschäftsführung." },
];

export default function KontaktPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        breadcrumbs={[{ name: "Kontakt" }]}
        eyebrow={`Kontakt · ${GESELLSCHAFT.ort}`}
        title={
          <>
            Ihr Anliegen, <span className="ov-text-gradient">unser Projektteam.</span>
          </>
        }
        lead="Wählen Sie, worum es geht – das Formular passt sich an. Jede Anfrage wird als Vorgang angelegt und einem festen Ansprechpartner zugeordnet. Im Portal verfolgen Sie den Status."
        image={{ src: "/img/planer-tablet.jpg", alt: "Projektplanerin mit Tablet auf einer Freifläche" }}
        points={["Antwort in der Regel binnen 2 Werktagen", "Fester Ansprechpartner", "Status im Portal", "Kostenlos und unverbindlich"]}
        actions={[
          { label: "Anfrage schreiben", href: "#formular" },
          { label: "Zum Portal", href: "/login" },
        ]}
      />

      <Section tone="sand" space="lg" id="formular" className="scroll-mt-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 sm:p-8 md:p-12">
            <p className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              Anfrage
            </p>
            <h2 className="ov-h2 mt-4 text-ink-900">Schreiben Sie uns</h2>
            <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-600">
              Pflichtfelder sind mit * markiert. Unterlagen können Sie später im Portal hochladen.
            </p>
            <div className="mt-10">
              <KontaktAnliegen />
            </div>
          </Reveal>

          <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal delay={80} className="rounded-3xl bg-white p-7 ring-1 ring-ink-200/70">
              <h3 className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900">
                <MapPin aria-hidden="true" className="h-5 w-5 text-ov-600" />
                Adresse
              </h3>
              <address className="mt-3 text-[15.5px] not-italic leading-relaxed text-ink-600">
                <strong className="font-semibold text-ink-900">{GESELLSCHAFT.name}</strong>
                <br />
                {KONTAKT.strasse}
                <br />
                {KONTAKT.ort}
                <br />
                {KONTAKT.land}
              </address>
              <a href="#lage" className="mt-3 inline-flex min-h-11 items-center gap-2 text-[14.5px] font-semibold text-ov-700 hover:text-ov-800">
                Lage ansehen
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </Reveal>

            <Reveal delay={140} className="rounded-3xl bg-white p-7 ring-1 ring-ink-200/70">
              <h3 className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900">
                <Clock aria-hidden="true" className="h-5 w-5 text-ov-600" />
                Bürozeiten
              </h3>
              <dl className="mt-3 space-y-1.5 text-[15px]">
                {KONTAKT.oeffnungszeiten.map((o) => (
                  <div key={o.tage} className="flex justify-between gap-4">
                    <dt className="text-ink-600">{o.tage}</dt>
                    <dd className="ov-num font-semibold text-ink-900">{o.zeit} Uhr</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-500">Besuche in Ostermiething nach Terminvereinbarung.</p>
            </Reveal>

            {KONTAKT.telefon && (
              <Reveal delay={170} className="rounded-3xl bg-white p-7 ring-1 ring-ink-200/70">
                <a href={KONTAKT.telefonHref} className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900">
                  <Phone aria-hidden="true" className="h-5 w-5 text-ov-600" />
                  {KONTAKT.telefon}
                </a>
              </Reveal>
            )}

            <Reveal delay={200} className="relative overflow-hidden rounded-3xl bg-navy-950 p-7 text-white">
              <div aria-hidden="true" className="absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-ov-500/30 blur-[80px]" />
              <LayoutDashboard aria-hidden="true" className="relative h-7 w-7 text-ov-300" />
              <h3 className="relative mt-5 font-display text-[21px] font-extrabold leading-tight">Schon eine Anfrage gestellt?</h3>
              <p className="relative mt-3 text-[15px] leading-relaxed text-white/70">
                Registrieren Sie sich mit derselben E-Mail-Adresse – Ihre Anfrage erscheint automatisch mit Status, Dokumenten und Nachrichten im Portal.
              </p>
              <div className="relative mt-6 flex flex-col gap-3">
                <Link
                  href="/registrieren"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700"
                >
                  Zugang anlegen
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/35 hover:bg-white/10">
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
              <MessageSquare aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
              <p className="text-[15px] leading-relaxed text-ink-600">
                Wir arbeiten in Deutschland, Österreich und der Schweiz. Für Termine vor Ort kommen wir zu Ihrer Fläche, in Ihre Gemeinde oder Ihr Unternehmen.
              </p>
            </Reveal>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
              Die Karte ist eine vereinfachte Darstellung und wird ohne Kartendienst geladen – es werden keine Daten an Dritte übertragen.
            </p>
          </div>
          <Reveal dir="right" className="overflow-hidden rounded-[2rem] bg-sand-50 p-4 shadow-xl ring-1 ring-ink-200/70 sm:p-8">
            <DachKarte className="mx-auto block h-auto w-full max-w-[520px]" />
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

import { FileSignature, FolderLock, KeyRound, Search, ShieldCheck, UserPlus, Coins, BadgePercent } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import HeroSzene from "@/components/Landing/HeroSzene";
import { InvestorenDashboard } from "@/components/illustrationen";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import BoerseListe from "@/components/Boerse/BoerseListe";
import { abs, SITE, sprachAlternates } from "@/data/site";
import { PROVISION, PHASEN } from "@/lib/invest/markt";
import { backend, istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const dynamic = "force-dynamic";

const PFAD = "/projektboerse";
const TITEL = "Projektbörse: Solarprojekte kaufen & anbieten | ÖkoInvest";
const BESCHREIBUNG =
  "Solarparks, Agri-PV, Parkplatz-PV und Großspeicher im DACH-Raum: geprüfte Projekte in allen Phasen, NDA per Klick, digitaler Datenraum – für Investoren kostenfrei.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: sprachAlternates("/projektboerse", "/en/project-exchange"),
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), width: 1280, height: 852, alt: "Reihen eines Solarparks" }],
  },
};

const ERLAUBTE_FILTER = ["typ", "land", "phase", "mwpMin", "mwpMax", "sortierung"];

const FAQ = [
  {
    q: "Was kostet die Projektbörse?",
    a: `Für Investoren ist die Börse ${PROVISION.kaeufer.text.replace("für Investoren ", "")}. Anbieter zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text} – keine Einstell- oder Listungsgebühren.`,
  },
  {
    q: "Warum sehe ich keine genaue Lage?",
    a: "Öffentlich zeigen wir nur Region, Bundesland bzw. Kanton und Eckdaten. Gemeinde, Flurstücke, Netzbetreiber und Unterlagen sehen registrierte Investoren erst, nachdem sie die Vertraulichkeitsvereinbarung akzeptiert haben und das Backoffice den Datenraum freigegeben hat. Das schützt Flächeneigentümer und Anbieter.",
  },
  {
    q: "Wie werden Projekte geprüft?",
    a: "Vor der Veröffentlichung prüft das Backoffice Angaben und Kernunterlagen auf Vollständigkeit und Plausibilität – etwa Flächensicherung, Stand der Bauleitplanung und Netzanschluss. Eine rechtliche und technische Due Diligence ersetzt das nicht; sie bleibt Aufgabe des Käufers.",
  },
  {
    q: "Welche Phasen gibt es?",
    a: `Wir unterscheiden ${PHASEN.length} Entwicklungsstände – von „${PHASEN[0].label}“ bis „${PHASEN[PHASEN.length - 1].label}“. Je weiter ein Projekt entwickelt ist, desto geringer das Risiko und desto höher der Preis je kWp.`,
  },
];

export default async function Projektboerse({ searchParams }) {
  const sp = await searchParams;
  const start = Object.fromEntries(ERLAUBTE_FILTER.map((k) => [k, typeof sp?.[k] === "string" ? sp[k].slice(0, 20) : ""]).filter(([, v]) => v));

  let daten = null;
  let fehler = "";
  try {
    daten = await backend().boerse(null, {});
  } catch (e) {
    fehler = e instanceof PlattformFehler ? e.message : "Die Projektbörse ist vorübergehend nicht erreichbar.";
    if (!(e instanceof PlattformFehler)) console.error("[projektboerse]", e);
  }
  const demo = istDemo();
  const kz = daten?.kennzahlen;

  const jsonLd = daten && {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Projektbörse ÖkoInvest",
    url: abs(PFAD),
    description: BESCHREIBUNG,
    publisher: { "@type": "Organization", name: SITE.firma, url: SITE.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: daten.projekte.length,
      itemListElement: daten.projekte.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`${PFAD}/${p.slug}`), name: p.titel })),
    },
  };

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Projektbörse", href: PFAD }]}
        eyebrow="Projektbörse DACH"
        title={<>Solarprojekte kaufen und verkaufen – <span className="ov-text-gradient-light">geprüft und vertraulich</span></>}
        lead="Freiflächen-PV, Agri-PV, Parkplatz-PV und Großspeicher in Deutschland, Österreich und der Schweiz – von der Flächensicherung bis zur Bestandsanlage. Öffentlich als anonymer Teaser, Details erst nach NDA."
        actions={[
          { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
          { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
        ]}
        stats={
          kz
            ? [
                { value: kz.anzahl, label: "Projekte in der Börse" },
                { value: kz.mwp, decimals: kz.mwp < 100 ? 1 : 0, suffix: " MWp", label: "Leistung gesamt" },
                { value: kz.laender, label: kz.laender === 1 ? "Land" : "Länder" },
              ]
            : []
        }
      >
        <HeroSzene>
          <InvestorenDashboard ton="dunkel" animiert />
        </HeroSzene>
      </PageHero>

      <Section tone="sand" space="md" id="projekte">
        {demo && (
          <p className="mb-6 rounded-2xl bg-sun-300/25 px-5 py-4 text-[14.5px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/50">
            <strong>Vorführdaten:</strong> Die Plattform läuft im Demo-Modus. Alle gezeigten Projekte sind fiktive Beispiele und keine Angebote.
          </p>
        )}
        {fehler ? (
          <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
            <p className="font-display text-[20px] font-bold text-ink-900">Projektbörse derzeit nicht verfügbar</p>
            <p className="mt-2 text-[15px] text-ink-600">{fehler}</p>
          </div>
        ) : (
          <BoerseListe projekte={daten.projekte} basisHref={`${PFAD}/`} start={start} />
        )}
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Ablauf" title="Vom Exposé zum Abschluss – alles im Portal" lead="Einheitlicher, nachvollziehbarer Prozess für beide Seiten. Jeder Schritt wird protokolliert." />
        <Steps
          className="mt-12"
          items={[
            { icon: UserPlus, title: "Registrieren & Suchprofil", text: "Kostenloses Investorenkonto mit Größe, Phasen, Ländern und Ticket. Passende Projekte zeigen wir zuerst." },
            { icon: Search, title: "Exposé prüfen", text: "Eckdaten, Phase, Netzanschluss und Preisindikation – anonym, ohne genaue Lage." },
            { icon: KeyRound, title: "NDA per Klick", text: "Vertraulichkeitsvereinbarung im Portal akzeptieren. Nach Freigabe öffnet sich der Datenraum." },
            { icon: FileSignature, title: "LOI & Abschluss", text: "Absichtserklärung digital abgeben, Due Diligence, Kaufvertrag – begleitet durch das Backoffice." },
          ]}
        />
      </Section>

      <Section tone="ink" space="lg">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="rounded-[2rem] bg-white p-8 ring-1 ring-ink-200/70 md:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span>
            <h2 className="ov-h3 mt-6 text-ink-900">Für Investoren: kostenfrei</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-600">Suchprofil, Merkliste, NDA und Datenraum sind für Investoren kostenfrei. Sie sehen Projekte aus der Entwicklung der ÖKOVOLT Gruppe und von weiteren Entwicklern.</p>
            <ul className="mt-5 space-y-2 text-[15px] text-ink-700">
              <li className="flex gap-2"><FolderLock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Datenraum mit Download-Protokoll</li>
              <li className="flex gap-2"><Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Matching nach Suchprofil</li>
            </ul>
            <Button href="/registrieren?rolle=investor" className="mt-7" pfeil>Investorenkonto anlegen</Button>
          </Reveal>
          <Reveal delay={100} className="ov-noise relative overflow-hidden rounded-[2rem] bg-navy-950 p-8 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ov-500/30 blur-[90px]" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ov-300"><BadgePercent aria-hidden="true" className="h-6 w-6" /></span>
            <h2 className="ov-h3 relative mt-6 text-white">Für Projektentwickler: Provision nur bei Erfolg</h2>
            <p className="relative mt-3 text-[16px] leading-relaxed text-white/70">Einstellen, prüfen lassen, vertraulich vermarkten. Die Provision beträgt {PROVISION.verkaeufer.text} – keine Listungsgebühren.</p>
            <ul className="relative mt-5 space-y-2 text-[15px] text-white/80">
              <li className="flex gap-2"><Coins aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Transparente Statistik: Aufrufe, Merker, NDA-Anfragen</li>
              <li className="flex gap-2"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Anonymer Teaser, Datenraum nur nach NDA</li>
            </ul>
            <Button href="/projektboerse/anbieten" variant="white" className="relative mt-7" pfeil>Projekt anbieten</Button>
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Häufige Fragen" title="Projektbörse: das Wichtigste in Kürze" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <CtaBand
        eyebrow="Projektbörse"
        title="Das passende Projekt nicht dabei?"
        text="Legen Sie ein Suchprofil an. Neue Projekte, die zu Ihren Kriterien passen, sehen Sie im Portal zuerst."
        primary={{ label: "Suchprofil anlegen", href: "/registrieren?rolle=investor" }}
        secondary={{ label: "Für Investoren", href: "/investoren" }}
      />
    </>
  );
}

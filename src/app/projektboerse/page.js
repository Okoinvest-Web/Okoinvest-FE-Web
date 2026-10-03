import Link from "next/link";
import { BadgePercent, Coins, FolderLock, Info, Map as MapIcon, Search, ShieldCheck } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";
import BoerseListe from "@/components/Boerse/BoerseListe";
import Hero from "@/components/Boerse/Seite/Hero";
import Marktbild from "@/components/Boerse/Seite/Marktbild";
import Ablauf from "@/components/Boerse/Seite/Ablauf";
import { abs, SITE, sprachAlternates } from "@/data/site";
import { PROVISION, PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { backend, istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { boersePill, istDemoAnsicht, sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";

export const dynamic = "force-dynamic";

const PFAD = "/projektboerse";
const TITEL = "PV-Projektbörse DACH: Solarparks & Projektrechte | ÖkoInvest";
// „vorgeprüft“ statt „geprüft“: Das Backoffice prüft nur Vollständigkeit und Plausibilität
// (siehe FAQ), keine Due Diligence (§ 5 UWG, Paket D).
const BESCHREIBUNG =
  "Solarparks, Agri-PV, Parkplatz-PV und Großspeicher im DACH-Raum: auf Plausibilität vorgeprüfte Projekte in allen Phasen, NDA per Klick, Datenraum – für Investoren kostenfrei, der Verkäufer zahlt die Provision.";

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

const SPANNE = `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100, 0)} %`;

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
  // Paket D: Testdatensätze nie, Demo-Projekte nur im Demo-Modus; Kennzahlen aus der gefilterten Liste
  const demo = istDemoAnsicht({ backendDemo: istDemo(), daten });
  const projekte = daten ? sichtbareProjekte(daten.projekte, { demo }) : [];
  const kz = daten && {
    anzahl: projekte.length,
    mwp: Math.round(projekte.reduce((s, p) => s + (Number(p.mwp) || 0), 0) * 10) / 10,
    laender: new Set(projekte.map((p) => p.land).filter(Boolean)).size,
  };
  const pill = boersePill(projekte, { demo });

  const jsonLd = daten && {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Projektbörse ÖkoInvest",
    url: abs(PFAD),
    description: BESCHREIBUNG,
    publisher: { "@type": "Organization", name: SITE.firma, url: SITE.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: projekte.length,
      itemListElement: projekte.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`${PFAD}/${p.slug}`), name: p.titel })),
    },
  };

  return (
    <>
      {jsonLd && <JsonLd daten={jsonLd} />}
      <Hero
        breadcrumbs={[{ name: "Projektbörse", href: PFAD }]}
        pill={{ ...pill, href: "#projekte" }}
        titel={<>Die Projektbörse für Solarprojekte&nbsp;– <span className="ov-text-gradient-light">vorgeprüft und vertraulich.</span></>}
        lead={<><span className="font-medium text-white">Freiflächen-PV, Agri-PV, Parkplatz-PV und Großspeicher</span> in Deutschland, Österreich und der Schweiz – von der Flächensicherung bis zur Bestandsanlage. Öffentlich als anonymer Teaser, Details erst nach NDA.</>}
        aktionen={[
          { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
          { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
        ]}
        hinweis={`Für Investoren kostenfrei · Anbieter zahlen ${SPANNE} Provision, nur bei Abschluss`}
        unten={
          <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
            <MapIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
            <span>Lieber nach Region suchen? <Link href="/projektboerse/karte" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">Zur Kartenansicht</Link></span>
          </p>
        }
      />
      {daten && <Marktbild projekte={projekte} kennzahlen={kz} />}

      <section id="projekte" aria-labelledby="projekte-titel" className="scroll-mt-20 bg-sand-50 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="ov-container">
          <SectionHeading className="mb-8 md:mb-10" eyebrow="Aktuelle Projekte" title={<span id="projekte-titel">Projekte in allen Phasen</span>} lead="Filtern Sie nach Typ, Land, Phase und Leistung – oder wechseln Sie zur Karte. Ihre Auswahl steht in der Adresse und lässt sich teilen." />
          {demo && (
            <p className="mb-6 flex items-start gap-3 rounded-2xl bg-sun-300/25 px-5 py-4 text-[14.5px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/50">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-700" />
              <span><strong>Vorführdaten:</strong> Die Plattform läuft im Demo-Modus. Alle gezeigten Projekte sind fiktive Beispiele und keine Angebote. Kennzahlen und Karte beziehen sich nur auf diese Beispiele.</span>
            </p>
          )}
          {fehler ? (
            <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
              <p className="font-display text-[20px] font-bold text-ink-900">Projektbörse derzeit nicht verfügbar</p>
              <p className="mt-2 text-[15px] text-ink-600">{fehler}</p>
            </div>
          ) : (
            <BoerseListe projekte={projekte} basisHref={`${PFAD}/`} start={start} />
          )}
        </div>
      </section>

      <Ablauf />

      <Section tone="ink" space="lg">
        <SectionHeading eyebrow="Zwei Seiten, ein Marktplatz" title="Fair für Käufer und Verkäufer" align="center" className="mx-auto mb-12 max-w-2xl md:mb-16" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="flex flex-col rounded-[2rem] bg-white p-7 shadow-e1 ring-1 ring-ink-200/70 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span>
              <p className="text-right"><span className="ov-num block font-display text-[40px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[48px]">0&nbsp;€</span><span className="mt-1 block text-[12.5px] text-ink-500">für Investoren</span></p>
            </div>
            <h3 className="ov-h3 mt-6 text-ink-900">Für Investoren: kostenfrei</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-600">Suchprofil, Merkliste, NDA und Datenraum sind für Investoren kostenfrei. Wir finanzieren die Börse über die Provision, die der Verkäufer bei Abschluss zahlt. Sie sehen Projekte aus der Entwicklung der ÖKOVOLT Gruppe und von weiteren Entwicklern.</p>
            <ul className="mt-6 grid gap-2.5 text-[15px] text-ink-700 sm:grid-cols-2">
              <li className="flex gap-2.5"><FolderLock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Datenraum mit Download-Protokoll</li>
              <li className="flex gap-2.5"><Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Matching nach Suchprofil</li>
            </ul>
            <div className="mt-auto pt-8"><Button href="/registrieren?rolle=investor" pfeil>Investorenkonto anlegen</Button></div>
          </Reveal>
          <Reveal delay={100} className="ov-noise relative flex flex-col overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ov-500/30 blur-[90px]" />
            <div className="relative flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ov-300"><BadgePercent aria-hidden="true" className="h-6 w-6" /></span>
              <p className="text-right"><span className="ov-num block font-display text-[40px] font-extrabold leading-none tracking-tight text-white md:text-[48px]">{SPANNE}</span><span className="mt-1 block text-[12.5px] text-white/60">nur bei Abschluss</span></p>
            </div>
            <h3 className="ov-h3 relative mt-6 text-white">Für Projektentwickler: Provision nur bei Erfolg</h3>
            <p className="relative mt-3 text-[16px] leading-relaxed text-white/70">Einstellen, auf Vollständigkeit und Plausibilität prüfen lassen, vertraulich vermarkten. Die Provision beträgt {PROVISION.verkaeufer.text} – keine Listungsgebühren.</p>
            <ul className="relative mt-6 grid gap-2.5 text-[15px] text-white/80 sm:grid-cols-2">
              <li className="flex gap-2.5"><Coins aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Transparente Statistik: Aufrufe, Merker, NDA-Anfragen</li>
              <li className="flex gap-2.5"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Anonymer Teaser, Datenraum nur nach NDA</li>
            </ul>
            <div className="relative mt-auto pt-8"><Button href="/projektboerse/anbieten" variant="white" pfeil>Projekt anbieten</Button></div>
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Häufige Fragen" title="Projektbörse: das Wichtigste in Kürze" />
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-600">Sie möchten ein Projekt vermarkten? <Link href="/projektboerse/anbieten" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:text-ov-800">So funktioniert das Anbieten</Link></p>
          </div>
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

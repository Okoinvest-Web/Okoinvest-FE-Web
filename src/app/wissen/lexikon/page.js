// src/app/wissen/lexikon/page.js

import Link from "next/link";
import { ArrowDown, BookOpen, Calculator, HelpCircle } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import LexikonExplorer from "@/components/Lexikon/LexikonExplorer";
import { BEGRIFFE, KATEGORIEN, LEXIKON_STAND, begriffeNachBuchstabe } from "@/data/lexikon";

const BASE_URL = "https://www.oekovolt.de";
const PAGE_URL = `${BASE_URL}/wissen/lexikon`;
const ANZAHL = BEGRIFFE.length;

const TITLE = `Photovoltaik-Lexikon: ${ANZAHL} Fachbegriffe A–Z | Ökovolt`;
const DESCRIPTION = `Photovoltaik einfach erklärt: ${ANZAHL} Fachbegriffe von Autarkiegrad über kWp und LFP bis Solarspitzengesetz und § 14a EnWG – präzise, aktuell (2026), mit Rechnern.`;

// Deutschlandspezifische Rechtsbegriffe (EEG, EnWG) -> kein hreflang.
export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["Photovoltaik Lexikon", "Photovoltaik Glossar", "PV Begriffe", "Solaranlage Fachbegriffe", "kWp Bedeutung", "Autarkiegrad", "Solarspitzengesetz"],
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "Ökovolt Deutschland",
    title: `Photovoltaik-Lexikon: ${ANZAHL} Fachbegriffe von A bis Z`,
    description: DESCRIPTION,
    images: [{ url: `${BASE_URL}/og-image.jpg`, width: 1200, height: 630, alt: "Ökovolt Photovoltaik-Lexikon" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Photovoltaik-Lexikon: ${ANZAHL} Fachbegriffe von A bis Z`,
    description: DESCRIPTION,
    images: [`${BASE_URL}/og-image.jpg`],
  },
};

const BELIEBT = ["autarkiegrad", "kwp", "einspeiseverguetung", "solarspitzengesetz", "paragraf-14a-enwg", "lfp", "ueberschussladen"];

export default function LexikonPage() {
  const gruppen = begriffeNachBuchstabe();
  const namen = Object.fromEntries(BEGRIFFE.map((b) => [b.id, b.begriff]));
  const fokus = BEGRIFFE.find((b) => b.id === "solarspitzengesetz");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "de-DE",
        isPartOf: { "@id": `${BASE_URL}/#website` },
        publisher: { "@id": `${BASE_URL}/#organization` },
        dateModified: LEXIKON_STAND,
        mainEntity: { "@id": `${PAGE_URL}/#termset` },
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${PAGE_URL}/#termset`,
        name: "Ökovolt Photovoltaik-Lexikon",
        description: "Fachbegriffe rund um Photovoltaik, Stromspeicher, E-Mobilität, Netzanschluss und Förderung in Deutschland.",
        url: PAGE_URL,
        inLanguage: "de-DE",
        publisher: { "@id": `${BASE_URL}/#organization` },
        hasDefinedTerm: BEGRIFFE.map((b) => ({
          "@type": "DefinedTerm",
          "@id": `${PAGE_URL}#${b.id}`,
          name: b.begriff,
          description: b.kurz,
          url: `${PAGE_URL}#${b.id}`,
          ...(b.synonyme?.length ? { alternateName: b.synonyme } : {}),
          inDefinedTermSet: { "@id": `${PAGE_URL}/#termset` },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Wissen", href: "/ratgeber" }, { name: "Photovoltaik-Lexikon" }]}
        eyebrow="Wissen · Stand September 2026"
        title={
          <>
            Photovoltaik-Lexikon: <span className="ov-text-gradient-light">Fachbegriffe</span> von A bis Z
          </>
        }
        lead="Von Autarkiegrad bis Zyklenfestigkeit: Jeder Begriff mit einer klaren Definition in einem Satz, einer verständlichen Erklärung und dem Weg zum passenden Rechner – geschrieben vom Fachbetrieb, nicht vom Werbetexter."
        stats={[
          { value: ANZAHL, label: "Fachbegriffe erklärt" },
          { value: KATEGORIEN.length, label: "Themenfelder" },
          { value: new Set(BEGRIFFE.filter((b) => b.link).map((b) => b.link.href.split("#")[0])).size, label: "verlinkte Rechner & Seiten" },
        ]}
      >
        {fokus && (
          <aside
            aria-label="Begriff im Fokus"
            className="ov-hero-in absolute top-[200px] hidden w-[380px] xl:block"
            style={{ "--ov-delay": "300ms", right: "max(2rem, calc((100vw - 80rem) / 2 + 2rem))" }}
          >
            <div aria-hidden="true" className="absolute -inset-6 rounded-[2.5rem] bg-ov-500/20 blur-3xl" />
            <div className="ov-glass relative rounded-[2rem] p-7">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Begriff im Fokus</p>
                <span aria-hidden="true" className="font-display text-[56px] font-extrabold leading-none text-white/10">S</span>
              </div>
              <p className="-mt-3 font-display text-[26px] font-extrabold tracking-tight text-white">{fokus.begriff}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-white/75">{fokus.kurz}</p>
              <a href={`#${fokus.id}`} className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-ov-300 hover:text-white">
                Ganze Erklärung lesen
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </aside>
        )}
        <div className="ov-hero-in mt-10" style={{ "--ov-delay": "460ms" }}>
          <p className="text-[13px] font-medium text-white/55">Oft gesucht:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {BELIEBT.map((id) => (
              <li key={id}>
                <a href={`#${id}`} className="ov-glass inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white">
                  {namen[id]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </PageHero>

      <Section tone="sand" space="md" className="md:pt-16">
        <LexikonExplorer gruppen={gruppen} kategorien={KATEGORIEN} namen={namen} />
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Vom Begriff zur Entscheidung"
          title="Verstanden – und jetzt?"
          lead="Das Lexikon erklärt die Begriffe. Was sie für Ihr Haus bedeuten, zeigen Rechner, Ratgeber und unsere Antworten auf die häufigsten Fragen."
          className="mb-12"
        />
        <FeatureGrid
          cols={3}
          items={[
            { icon: Calculator, title: "Solarrechner", text: "Ertrag, Autarkie und Amortisation mit Ihren eigenen Werten – inklusive 20-Jahres-Cashflow.", href: "/solarrechner" },
            { icon: BookOpen, title: "Ratgeber", text: "Einspeisevergütung, Kosten und Wallbox-Installation ausführlich und mit Stand 2026 erklärt.", href: "/ratgeber" },
            { icon: HelpCircle, title: "Häufige Fragen", text: "Kurze, ehrliche Antworten zu Planung, Förderung, Montage und Service.", href: "/faqs" },
          ]}
        />
        <p className="mt-10 text-[14px] leading-relaxed text-ink-500">
          Fehlt ein Begriff oder hat sich eine Regel geändert?{" "}
          <Link href="/kontakt" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
            Schreiben Sie uns
          </Link>{" "}
          – wir pflegen das Lexikon laufend.
        </p>
      </Section>

      <Querverweise pfad="/wissen/lexikon" />
      <CtaBand
        title="Genug Theorie? Wir rechnen Ihr Dach durch."
        text="Persönliche Beratung vom Fachbetrieb aus Türkheim – wir erklären jeden Begriff, der in Ihrem Angebot steht, und planen die Anlage, die wirklich zu Ihrem Verbrauch passt."
      />
    </>
  );
}

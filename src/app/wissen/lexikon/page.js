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
import { BEGRIFFE, KATEGORIEN, LEXIKON_STAND, begriffeNachBuchstabe, buchstabeVon } from "@/data/lexikon";
import { SITE, abs } from "@/data/site";

const PAGE_URL = abs("/wissen/lexikon");
const ANZAHL = BEGRIFFE.length;

const TITLE = `Lexikon Solarpark & Agri-PV: ${ANZAHL} Begriffe | ÖkoInvest`;
const DESCRIPTION = `${ANZAHL} Fachbegriffe aus Projektentwicklung, Genehmigung, Strommarkt und Investment – von Aufstellungsbeschluss über PPA bis Zuschlagswert, für DE, AT und CH.`;

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["Solarpark Lexikon", "Agri-PV Begriffe", "Photovoltaik Glossar Freifläche", "Projektrechte", "Ready-to-Build", "PPA Definition", "Energy Sharing"],
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "ÖkoInvest",
    locale: "de_DE",
    title: `Lexikon: ${ANZAHL} Fachbegriffe zu Solarpark, Agri-PV und Strommarkt`,
    description: DESCRIPTION,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), alt: "Modulreihen eines Solarparks" }],
  },
};

const BELIEBT = ["aufstellungsbeschluss", "dienstbarkeit", "din-spec-91434", "rtb", "ppa", "capture-rate", "energy-sharing"];
const FOKUS = "projektrechte";

export default function LexikonPage() {
  const gruppen = begriffeNachBuchstabe();
  const namen = Object.fromEntries(BEGRIFFE.map((b) => [b.id, b.begriff]));
  const beliebt = BELIEBT.filter((id) => namen[id]);
  const fokus = BEGRIFFE.find((b) => b.id === FOKUS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "de",
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@id": `${SITE.url}/#organization` },
        dateModified: LEXIKON_STAND,
        mainEntity: { "@id": `${PAGE_URL}/#termset` },
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${PAGE_URL}/#termset`,
        name: "ÖkoInvest-Lexikon",
        description: "Fachbegriffe zu Freiflächen-PV, Agri-PV, Genehmigung, Netzanschluss, Strommarkt, Projekttransaktionen und Energiegemeinschaften in Deutschland, Österreich und der Schweiz.",
        url: PAGE_URL,
        inLanguage: "de",
        publisher: { "@id": `${SITE.url}/#organization` },
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
        breadcrumbs={[{ name: "Ratgeber", href: "/ratgeber" }, { name: "Lexikon" }]}
        eyebrow="Wissen · Stand September 2026"
        title={
          <>
            Lexikon: <span className="ov-text-gradient-light">Fachbegriffe</span> von A bis Z
          </>
        }
        lead="Von Aufstellungsbeschluss bis Zuschlagswert: die Begriffe aus Pachtvertrag, Bebauungsplan, Netzanschluss, Ausschreibung und Projektkauf – jeweils mit einer Definition in einem Satz, einer Erklärung für Deutschland, Österreich und die Schweiz und dem Weg zum passenden Rechner."
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
                <span aria-hidden="true" className="font-display text-[56px] font-extrabold leading-none text-white/10">{buchstabeVon(fokus)}</span>
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
        {beliebt.length > 0 && (
          <div className="ov-hero-in mt-10" style={{ "--ov-delay": "460ms" }}>
            <p className="text-[13px] font-medium text-white/55">Oft gesucht:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {beliebt.map((id) => (
                <li key={id}>
                  <a href={`#${id}`} className="ov-glass inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white">
                    {namen[id]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PageHero>

      <Section tone="sand" space="md" className="md:pt-16">
        <LexikonExplorer gruppen={gruppen} kategorien={KATEGORIEN} namen={namen} />
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Vom Begriff zur Entscheidung"
          title="Verstanden – und jetzt?"
          lead="Das Lexikon erklärt die Begriffe. Was sie für Ihre Fläche, Ihr Projekt oder Ihren Strombezug bedeuten, zeigen Rechner, Ratgeber und die Antworten auf häufige Fragen."
          className="mb-12"
        />
        <FeatureGrid
          cols={3}
          items={[
            { icon: Calculator, title: "Rechner", text: "Pacht, Agri-PV, Solarpark, Projektbewertung und Reststrom – mit Marktannahmen, Stand September 2026.", href: "/rechner" },
            { icon: BookOpen, title: "Ratgeber", text: "Pachtvertrag, Bebauungsplan, EEG-Ausschreibung, Projektrechte und PPA ausführlich erklärt – mit Quellen.", href: "/ratgeber" },
            { icon: HelpCircle, title: "Häufige Fragen", text: "Kurze Antworten zu Flächencheck, Projektbörse, Portal und Provision.", href: "/faq" },
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

      <Querverweise
        items={[
          { href: "/flaechencheck", titel: "Flächencheck", text: "Eignet sich Ihre Fläche für Freiflächen- oder Agri-PV? Kostenfreie Ersteinschätzung." },
          { href: "/projektboerse", titel: "Projektbörse", text: "PV-Projekte in allen Phasen – von der Flächensicherung bis Ready-to-Build." },
          { href: "/rechner/pacht", titel: "Pachtrechner", text: "Was Ihre Fläche als Solarpark über die Laufzeit einbringen kann." },
          { href: "/ratgeber", titel: "Alle Ratgeber", text: "Fachartikel zu Fläche, Agri-PV, Recht, Investment und Strommarkt." },
        ]}
      />
      <CtaBand
        title="Genug Theorie? Wir prüfen Ihre Fläche oder Ihr Projekt."
        text="Wir erklären jeden Begriff, der in Ihrem Pachtangebot, Ihrem Exposé oder Ihrem Stromvertrag steht – und sagen Ihnen ehrlich, was Ihre Fläche oder Ihr Projekt hergibt."
      />
    </>
  );
}

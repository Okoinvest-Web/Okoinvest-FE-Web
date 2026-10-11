// quellen/page.js – Fakten-Suche: das Faktenregister als durchsuchbare Seite (Welle 4, Paket FAKTEN)
//
// Stufe 1 des Fakten-Assistenten (Masterplan GEO: Faktenregister → /quellen) – OHNE KI.
// Die Seite macht das komplette Faktenregister (src/lib/fakten) durchsuchbar: Volltext,
// Filter nach Land, Thema, Qualitätsstufe (Klasse A/B/C) und Prüfstand; jede Zahl mit Quelle,
// Abrufdatum und Prüfer, jeder Fakt mit stabiler Anker-URL (#fakt-<land>-<id>) für Zitate.
// Abgelaufene Werte sind sichtbar markiert (schema.js/pruefen.js, Masterplan H7).
// Export: /quellen/fakten.csv und /quellen/fakten.json unter CC BY 4.0.
//
// noindex: 116 von 159 Fakten tragen Status „Prüfung ausstehend“ (zweite Prüfperson E6 fehlt).
// Indexierung erst, wenn alle gezeigten Fakten am Original geprüft sind → Inhaberpunkt.
// Keine Rechenlogik, keine Leads – reine Dokumentations- und Zitierseite.

import { Database, Download, Scale } from "lucide-react";
import Section from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/SectionHeading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import FaktenSuche from "@/components/Quellen/FaktenSuche";
import { abs } from "@/data/site";
import { pfad } from "@/lib/land";
import { landDerAnfrage, seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";
import { LIZENZ, datasetSchema, quellenEintraege, quellenZusammenfassung } from "@/lib/quellen/fakten";
import { datumDe } from "@/lib/fakten";

// Schweiz (/ch, /en/ch): Texte ohne „ß“ (src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

// „Abgelaufen“ wirkt ohne neuen Build: Seite wird höchstens stündlich neu erzeugt.
export const revalidate = 3600;

const PFAD = pfad("/quellen");

const metadata = {
  title: "Fakten und Quellen | ÖkoInvest",
  description: "Das ÖkoInvest-Faktenregister zum Durchsuchen: Markt- und Rechtswerte zu Photovoltaik in Deutschland, Österreich und der Schweiz – jede Zahl mit Quelle, Abrufdatum, Prüfstand und zitierfähigem Link. Export als CSV und JSON (CC BY 4.0).",
  alternates: { canonical: abs(PFAD) },
  // Fachliche Zweitprüfung (E6) ausstehend; viele Fakten tragen „Prüfung ausstehend“ → nicht indexieren
  robots: { index: false, follow: true },
};

const metadataEn = {
  title: "Facts and sources | ÖkoInvest",
  description: "The ÖkoInvest fact register, searchable: market and legal values for photovoltaics in Germany, Austria and Switzerland – every figure with source, retrieval date, review status and a citable link. Export as CSV and JSON (CC BY 4.0).",
};

const TEXTE = {
  de: {
    wissen: "Wissen",
    quellen: "Fakten und Quellen",
    eyebrow: "Wissen · Faktenregister",
    titel: "Fakten und Quellen",
    lead1: "Jede Zahl dieser Website steht in unserem Faktenregister – mit Primärquelle, Abrufdatum, Prüfstand, Qualitätsstufe und Gültigkeit.",
    lead2: "Hier ist das komplette Register durchsuchbar. Jeder Fakt hat einen festen Link zum Zitieren; abgelaufene Werte sind deutlich markiert und erscheinen nie als aktuell.",
    entwurf: "Entwurf · fachliche Zweitprüfung ausstehend",
    zweit: "keine Rechts- oder Anlageberatung",
    stand: (z) => `${z.fakten} Fakten · davon ${z.geprueft} am Original geprüft, ${z.zuPruefen} in Prüfung${z.abgelaufen ? `, ${z.abgelaufen} abgelaufen` : ""} · letzter Abruf ${datumDe(z.letzterAbruf)}`,
    exportTitel: "Export",
    exportText: "Das Register steht als CSV und JSON unter der Lizenz CC BY 4.0 bereit (Namensnennung: „ÖkoInvest GmbH – Faktenregister“). Jede Zeile nennt ihre Primärquelle – deren Bedingungen gelten unabhängig davon weiter.",
    csv: "CSV herunterladen",
    json: "JSON herunterladen",
    fuss: "Die Qualitätsstufen: Klasse A = Recht, Förderung, Abgaben und Fristen; Klasse B = Markt- und Statistikwerte mit externer Quelle; Klasse C = eigene Einschätzungen aus der Projektpraxis (Orientierung, keine Messwerte). „Am Original geprüft“ heißt: Der Wert wurde an der verlinkten Primärquelle nachgelesen; die fachliche Zweitprüfung steht noch aus. Entwürfe zeigt diese Seite nicht. Maßgeblich ist immer die verlinkte Quelle in ihrer aktuellen Fassung.",
    enHinweis: null,
  },
  en: {
    wissen: "Knowledge",
    quellen: "Facts and sources",
    eyebrow: "Knowledge · fact register",
    titel: "Facts and sources",
    lead1: "Every figure on this website lives in our fact register – with primary source, retrieval date, review status, quality level and validity.",
    lead2: "The full register is searchable here. Every fact has a stable link for citations; expired values are clearly marked and never shown as current.",
    entwurf: "Draft · second specialist review pending",
    zweit: "not legal or investment advice",
    stand: (z) => `${z.fakten} facts · ${z.geprueft} checked against the original, ${z.zuPruefen} under review${z.abgelaufen ? `, ${z.abgelaufen} expired` : ""} · last retrieval ${datumDe(z.letzterAbruf)}`,
    exportTitel: "Export",
    exportText: "The register is available as CSV and JSON under the CC BY 4.0 licence (attribution: “ÖkoInvest GmbH – Faktenregister”). Each row names its primary source – whose own terms continue to apply.",
    csv: "Download CSV",
    json: "Download JSON",
    fuss: "Quality levels: class A = law, funding, levies and deadlines; class B = market and statistical values with an external source; class C = our own estimates from project practice (orientation, not measurements). “Checked against the original” means the value was verified at the linked primary source; the second specialist review is still pending. Drafts are not shown. The linked source in its current version is always authoritative.",
    enHinweis: "The facts themselves are kept in German (identifiers, values and source titles) so that citations match the German primary sources.",
  },
};

export default async function QuellenSeite({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const t = TEXTE[sprache] || TEXTE.de;
  const heute = new Date();
  const eintraege = quellenEintraege({ heute });
  const zusammenfassung = quellenZusammenfassung({ heute });
  const schema = datasetSchema({ heute, basis: abs(""), anzahl: eintraege.length });
  return chBaum(
    <>
      <JsonLd daten={schema} />
      <Section tone="sand" space="none" className="pb-10 pt-6 sm:pt-8 md:pb-14 md:pt-10">
        <Breadcrumbs items={[{ name: t.wissen, href: "/ratgeber" }, { name: t.quellen }]} className="mb-8 md:mb-12" />
        <div className="max-w-3xl">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="ov-h1 mt-4 text-balance text-ink-900">{t.titel}</h1>
          <p className="ov-lead mt-5 text-pretty text-ink-600">
            {t.lead1} {t.lead2}
          </p>
          {t.enHinweis ? <p className="mt-3 text-[13.5px] text-ink-500">{t.enHinweis}</p> : null}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">
              <Scale aria-hidden="true" className="h-3.5 w-3.5" />
              {t.entwurf}
            </span>
            <span className="text-[13px] text-ink-500">{t.zweit}</span>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-ink-600">
            <Database aria-hidden="true" className="h-4 w-4 text-ov-600" />
            {t.stand(zusammenfassung)}
          </p>
        </div>
      </Section>

      <Section tone="white" space="md">
        <FaktenSuche eintraege={eintraege} sprache={sprache} />
      </Section>

      <Section tone="sand" space="sm" aria-labelledby="quellen-export">
        <h2 id="quellen-export" className="font-display text-[19px] font-bold text-ink-900">
          {t.exportTitel}
        </h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-600">{t.exportText}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/quellen/fakten.csv" download className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-[14.5px] font-semibold text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:text-navy-700 hover:ring-navy-200">
            <Download aria-hidden="true" className="h-4 w-4" />
            {t.csv}
          </a>
          <a href="/quellen/fakten.json" download className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-[14.5px] font-semibold text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:text-navy-700 hover:ring-navy-200">
            <Download aria-hidden="true" className="h-4 w-4" />
            {t.json}
          </a>
          <a href={LIZENZ.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-2xl px-4 py-2 text-[14.5px] font-semibold text-navy-700 underline decoration-navy-300 underline-offset-2 hover:decoration-navy-500">
            {LIZENZ.name}
            <span className="sr-only"> (creativecommons.org)</span>
          </a>
        </div>
      </Section>

      <Section tone="white" space="sm">
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-500">{t.fuss}</p>
      </Section>
    </>
  );
}

export const generateMetadata = seitenMetadata("/quellen", metadata, { en: metadataEn });

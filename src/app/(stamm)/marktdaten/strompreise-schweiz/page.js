// marktdaten/strompreise-schweiz/page.js – CH-Strompreis-Atlas (Welle 4, Paket CHATLAS)
//
// Amtliche ElCom-Tarifkomponenten (Median je Kanton, Beispielstädte je Netzbetreiber) als statischer,
// versionierter Datenauszug über LINDAS, mit Abrufdatum und Downloads (CSV/JSON). Daten:
// src/data/strompreisatlasCh.js, Logik: src/lib/marktdaten/strompreisatlasCh.js.
//
// Lizenz am Original geprüft (11.10.2026): Nutzungsbedingung „Open use“ von opendata.swiss
// (https://opendata.swiss/terms-of-use#terms_open) – kommerzielle Nutzung erlaubt, Quellenangabe
// empfohlen; Wortlaut und Fundstelle in src/data/strompreisatlasCh.js und auf der Seite zitiert.
//
// Nur amtliche Bestandteile, keine Anbieter-Rangliste, keine Empfehlung. Schweizer Daten gelten
// nur für die Schweiz; auf /de und /at bleibt die Seite eine reine Daten-/Wissensseite.
// noindex bis zur fachlichen Zweitprüfung (E6): Register src/lib/land/seiten.js (index: false) und robots unten.

import { ArrowDown, Database, Download, ExternalLink, Mail, Scale } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import StrompreisAtlasCh from "@/components/Marktdaten/StrompreisAtlasCh";
import JsonLd from "@/components/JsonLd";
import { abs } from "@/data/site";
import { ATLAS_ABRUF, ATLAS_JAHRE, ATLAS_KATEGORIEN, ATLAS_LIZENZ, ATLAS_QUELLEN, ATLAS_STAND } from "@/data/strompreisatlasCh";
import { gemeindeWerte, kantonsWerte, spannweite, veraenderung } from "@/lib/marktdaten/strompreisatlasCh";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const PFAD = pfad("/marktdaten/strompreise-schweiz");
const DATEI = "/marktdaten/strompreise-schweiz/daten";

const metadata = {
  title: "Strompreis-Atlas Schweiz | ÖkoInvest",
  description:
    "Amtliche Strompreise der Schweiz je Kanton und Beispielstadt: Median-Tarife der ElCom mit allen Bestandteilen (Energie, Netznutzung, Abgaben, Netzzuschlag) – mit Quelle, Abrufdatum und Download als CSV und JSON.",
  alternates: { canonical: abs(PFAD) },
  // Fachliche Zweitprüfung (E6) ausstehend → nicht indexieren
  robots: { index: false, follow: true },
};

const metadataEn = {
  title: "Electricity price atlas Switzerland | ÖkoInvest",
  description:
    "Official Swiss electricity prices per canton and example city: ElCom median tariffs with all components (energy, grid usage, fees, grid surcharge) – with source, retrieval date and download as CSV and JSON.",
};

const datumLang = (iso, en) => {
  const m = en
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const [j, mo, t] = iso.split("-").map(Number);
  return en ? `${t} ${m[mo - 1]} ${j}` : `${t}. ${m[mo - 1]} ${j}`;
};

const rp = (v, en) => v.toLocaleString(en ? "en-CH" : "de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TEXTE = {
  de: {
    wissen: "Wissen",
    marktdaten: "Marktdaten",
    seite: "Strompreise Schweiz",
    eyebrow: "Marktdaten · Schweiz",
    titel: (
      <>
        Strompreis-Atlas <span className="ov-text-gradient">Schweiz</span>
      </>
    ),
    lead: "Die amtlichen Strompreise der ElCom für alle 26 Kantone und acht Beispielstädte: Median-Tarife je Verbrauchskategorie mit allen Bestandteilen – Energie, Netznutzung, Abgaben an das Gemeinwesen und Netzzuschlag. Für die Tarifjahre 2026 und 2027, als Tabelle und zum Herunterladen.",
    lead2: "Nur amtliche Werte aus den ElCom-Daten über LINDAS, unverändert übernommen, mit Quelle und Abrufdatum. Keine Anbieter-Rangliste, keine Schätzungen – die Daten gelten nur für die Schweiz.",
    entwurf: "Entwurf · fachliche Prüfung",
    zweit: (s) => `Datenauszug vom ${s} · Zweitprüfung ausstehend · keine Anlageberatung`,
    zumAtlas: "Zum Atlas",
    zuDaten: "Daten herunterladen",
    spanneTitel: "Spannweite je Tarifjahr",
    spanneText: (jahr, kat, min, max) =>
      `Tarifjahr ${jahr}, ${kat}: Der Kanton-Median reicht von ${min.total != null ? rp(min.total) : "–"} Rp./kWh (${min.name}) bis ${max.total != null ? rp(max.total) : "–"} Rp./kWh (${max.name}).`,
    atlasEyebrow: "Atlas",
    atlasTitel: "Median je Kanton und Beispielstädte",
    atlasLead:
      "Der Median je Kanton ist der mittlere Tarif aller Netzbetreiber des Kantons (Produkt „standard“). Er zeigt das Preisniveau, nicht den Tarif eines bestimmten Anbieters – den amtlichen Tarif Ihrer Gemeinde finden Sie bei der ElCom.",
    datenEyebrow: "Offene Daten",
    datenTitel: "Download, Lizenz und Methodik",
    datenLead: "Die amtlichen Ausgangsdaten stehen unter der offenen Nutzungsbedingung von opendata.swiss; unsere Zusammenstellung geben wir unter CC BY 4.0 weiter.",
    csv: "CSV herunterladen",
    json: "JSON herunterladen",
    umfang: "Enthält alle Kantons-Mediane und Beispielstädte für beide Tarifjahre und beide Kategorien, jede Zeile mit Ebene (Kanton/Gemeinde), Jahr und Kategorie.",
    nennung: "Namensnennung zum Beispiel so:",
    nennungText: "Quelle: ÖkoInvest CH-Strompreis-Atlas (CC BY 4.0) auf Basis der ElCom-Tarifdaten über LINDAS (opendata.swiss)",
    lizenzTitel: "Lizenz der Ausgangsdaten (am Original geprüft)",
    lizenzText: (datum) =>
      `Beide ElCom-Datensätze tragen auf opendata.swiss die Nutzungsbedingung „Open use“ (terms_open), gelesen am ${datum}. Wortlaut:`,
    lizenzFundstelle: "Fundstelle",
    methodik: "Methodik",
    methodikPunkte: [
      "Statischer, versionierter Datenauszug – kein Live-Abruf. Einmalig über den amtlichen SPARQL-Endpunkt von LINDAS (lindas.admin.ch) gezogen, Werte unverändert in Rp./kWh.",
      "Produkt „standard“, Kategorien H4 (Haushalt, 4'500 kWh/Jahr) und C3 (Gewerbe, 150'000 kWh/Jahr) – die Kategoriedefinitionen stammen wörtlich aus den ElCom-Stammdaten.",
      "Mediane der Bestandteile summieren sich nicht exakt zum Median des Totals, weil jeder Median je Spalte eigenständig gebildet wird.",
      "Beispielstädte: Zürich, Basel, Genf, Bern, Lausanne, Luzern, St. Gallen, Lugano – Tarif je Netzbetreiber; Städte mit mehreren Netzbetreibern erscheinen mehrfach. Was zum Abrufdatum nicht veröffentlicht war, fehlt – wir schätzen nichts.",
      "Keine Anbieter-Rangliste und keine Empfehlung: Tabellen sind alphabetisch sortiert, verglichen werden nur amtliche Bestandteile.",
    ],
    quellen: "Quellen",
    abruf: (a) => `abgerufen am ${a}`,
    stand: "Stand",
    fuss: "Keine Anlage-, Rechts- oder Tarifberatung; alle Angaben ohne Gewähr. Verbindlich ist der amtliche Tarif Ihres Netzbetreibers bzw. die ElCom-Tarifabfrage in ihrer aktuellen Fassung.",
    leadEyebrow: "Daten-Update",
    leadTitel: "Neue Tarifjahre direkt ins Postfach",
    leadText:
      "Die ElCom veröffentlicht die Tarife des Folgejahres jeweils ab Ende August. Wir melden uns, sobald der Atlas das neue Tarifjahr enthält. Kreuzen Sie dafür im Formular die E-Mail-Hinweise an; die Anmeldung bestätigen Sie per E-Mail.",
    leadPunkte: ["Hinweis, sobald neue Tarifjahre im Atlas sind", "Abmeldung jederzeit", "Rückruf nur, wenn Sie ihn wünschen"],
    formTitel: "Update-Hinweis anfordern",
    formText: "Name und E-Mail genügen. Telefon nur, wenn Sie einen Rückruf möchten.",
    formButton: "Hinweis anfordern",
    formErfolg: "Danke! Wir haben Ihre Anfrage erhalten. Falls Sie die E-Mail-Hinweise gewählt haben, bestätigen Sie die Anmeldung bitte über den Link in unserer E-Mail.",
    querverweise: [
      { href: "/marktdaten", titel: "Marktdaten Solar", text: "Zuschläge, Marktwert Solar, Capture Rate und Zubau – je Land gekennzeichnet." },
      { href: "/marktdaten/ausschreibungen", titel: "Ausschreibungs-Monitor", text: "Gebotstermine und Ergebnisse der PV-Ausschreibungen in DE, AT und CH." },
      { href: "/marktdaten/fristen", titel: "Fristen und Preisbestandteile", text: "Förder- und Gebotsfristen sowie Umlagen und Netzentgelte je Land." },
      { href: "/rechner", titel: "Rechner und Werkzeuge", text: "Rendite, Pacht und Eigenverbrauch mit geprüften Werten rechnen." },
    ],
  },
  en: {
    wissen: "Knowledge",
    marktdaten: "Market data",
    seite: "Electricity prices Switzerland",
    eyebrow: "Market data · Switzerland",
    titel: (
      <>
        Electricity price atlas <span className="ov-text-gradient">Switzerland</span>
      </>
    ),
    lead: "The official ElCom electricity prices for all 26 cantons and eight example cities: median tariffs per consumption category with all components – energy, grid usage, fees to public bodies and the grid surcharge. For the tariff years 2026 and 2027, as a table and for download.",
    lead2:
      "Official values only, taken unchanged from the ElCom data via LINDAS, with source and retrieval date. No supplier ranking, no estimates – the data apply to Switzerland only.",
    entwurf: "Draft · specialist review",
    zweit: (s) => `Data extract of ${s} · second review pending · not investment advice`,
    zumAtlas: "Go to the atlas",
    zuDaten: "Download data",
    spanneTitel: "Range per tariff year",
    spanneText: (jahr, kat, min, max) =>
      `Tariff year ${jahr}, ${kat}: the canton median ranges from ${min.total != null ? rp(min.total, true) : "–"} Rp./kWh (${min.name}) to ${max.total != null ? rp(max.total, true) : "–"} Rp./kWh (${max.name}).`,
    atlasEyebrow: "Atlas",
    atlasTitel: "Median per canton and example cities",
    atlasLead:
      "The median per canton is the middle tariff of all network operators in the canton (“standard” product). It shows the price level, not the tariff of a specific supplier – the official tariff for your municipality is available from ElCom.",
    datenEyebrow: "Open data",
    datenTitel: "Download, licence and methodology",
    datenLead: "The official source data are available under the open terms of use of opendata.swiss; we pass on our compilation under CC BY 4.0.",
    csv: "Download CSV",
    json: "Download JSON",
    umfang: "Contains all canton medians and example cities for both tariff years and both categories, each row with level (canton/municipality), year and category.",
    nennung: "Attribution, for example:",
    nennungText: "Source: ÖkoInvest Swiss electricity price atlas (CC BY 4.0) based on the ElCom tariff data via LINDAS (opendata.swiss)",
    lizenzTitel: "Licence of the source data (verified at the original)",
    lizenzText: (datum) =>
      `Both ElCom datasets carry the “Open use” terms of use (terms_open) on opendata.swiss, read on ${datum}. Wording:`,
    lizenzFundstelle: "Reference",
    methodik: "Methodology",
    methodikPunkte: [
      "Static, versioned data extract – no live retrieval. Pulled once via the official LINDAS SPARQL endpoint (lindas.admin.ch); values unchanged in Rp./kWh.",
      "“Standard” product, categories H4 (household, 4,500 kWh/year) and C3 (commercial, 150,000 kWh/year) – the category definitions are quoted from the ElCom master data.",
      "The medians of the components do not add up exactly to the median of the total, because each column's median is calculated independently.",
      "Example cities: Zurich, Basel, Geneva, Bern, Lausanne, Lucerne, St. Gallen, Lugano – tariff per network operator; cities with several network operators appear more than once. Anything not published at the retrieval date is missing – we do not estimate.",
      "No supplier ranking and no recommendation: tables are sorted alphabetically, and only official components are compared.",
    ],
    quellen: "Sources",
    abruf: (a) => `retrieved on ${a}`,
    stand: "as of",
    fuss: "No investment, legal or tariff advice; all information without guarantee. The official tariff of your network operator or the ElCom tariff lookup in its current version is authoritative. Most sources are available in German, French and Italian only.",
    leadEyebrow: "Data update",
    leadTitel: "New tariff years straight to your inbox",
    leadText:
      "ElCom publishes the tariffs for the following year from the end of August. We will let you know as soon as the atlas contains the new tariff year. To receive this, tick the e-mail alerts in the form; you confirm the subscription by e-mail.",
    leadPunkte: ["A note as soon as new tariff years are in the atlas", "Unsubscribe at any time", "Call-back only if you want one"],
    formTitel: "Request an update alert",
    formText: "Name and e-mail are enough. Phone only if you would like a call-back.",
    formButton: "Request alert",
    formErfolg: "Thank you! We have received your request. If you chose the e-mail alerts, please confirm the subscription via the link in our e-mail.",
    querverweise: [
      { titel: "Solar market data", text: "Awards, solar market value, capture rate and additions – labelled per country." },
      { titel: "Tender monitor", text: "Bidding dates and results of the PV tenders in DE, AT and CH." },
      { titel: "Deadlines and price components", text: "Funding and bidding deadlines and levies and network charges per country." },
      { titel: "Calculators and tools", text: "Calculate returns, lease and self-consumption with verified values." },
    ],
  },
};

/** Dataset-JSON-LD (über das escapende JsonLd). */
function datasetSchema(url) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: "CH-Strompreis-Atlas: amtliche ElCom-Tarife je Kanton und Beispielstadt",
    description:
      "Median-Strompreise je Kanton und Tarife je Netzbetreiber für Beispielstädte der Schweiz (Produkt standard, Kategorien H4 und C3, Tarifjahre 2026 und 2027) mit den Bestandteilen Energie, Netznutzung, Abgaben und Netzzuschlag, unverändert aus den amtlichen ElCom-Daten über LINDAS.",
    url,
    inLanguage: "de",
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "ÖkoInvest GmbH", url: abs("/") },
    publisher: { "@id": `${abs("/")}/#organization` },
    isBasedOn: [ATLAS_QUELLEN.kantone.url, ATLAS_QUELLEN.gemeinden.url],
    spatialCoverage: { "@type": "Place", name: "Schweiz" },
    temporalCoverage: `${ATLAS_JAHRE[0]}/${ATLAS_JAHRE[ATLAS_JAHRE.length - 1]}`,
    dateModified: ATLAS_STAND,
    keywords: ["Strompreis", "Schweiz", "ElCom", "Kanton", "Netznutzung", "Netzzuschlag", "LINDAS", "Open Data"],
    variableMeasured: [
      { "@type": "PropertyValue", name: "Totaler Elektrizitätstarif (Median bzw. je Netzbetreiber)", unitText: "Rp./kWh" },
      { "@type": "PropertyValue", name: "Energie, Netznutzung, Abgaben an das Gemeinwesen, Netzzuschlag", unitText: "Rp./kWh" },
    ],
    distribution: [
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: abs(`${DATEI}.csv`) },
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: abs(`${DATEI}.json`) },
    ],
  };
}

export default async function StrompreiseSchweizSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = TEXTE[sprache] || TEXTE.de;
  const url = abs(pfad("/marktdaten/strompreise-schweiz", land, sprache));
  const standText = datumLang(ATLAS_ABRUF, en);

  // Für den Browser: fertig gruppierte Werte (keine Funktionen)
  const kantone = {};
  const gemeinden = {};
  for (const jahr of ATLAS_JAHRE) {
    kantone[jahr] = {};
    gemeinden[jahr] = {};
    for (const kat of Object.keys(ATLAS_KATEGORIEN)) {
      kantone[jahr][kat] = kantonsWerte(jahr, kat);
      gemeinden[jahr][kat] = gemeindeWerte(jahr, kat);
    }
  }
  const deltas = Object.fromEntries(
    Object.keys(ATLAS_KATEGORIEN).map((kat) => [kat, Object.fromEntries(veraenderung(kat).map((x) => [x.abk, { delta: x.delta }]))])
  );
  const letztesJahr = ATLAS_JAHRE[ATLAS_JAHRE.length - 1];
  const spanneH4 = spannweite(letztesJahr, "H4");
  const spanneC3 = spannweite(letztesJahr, "C3");

  return (
    <>
      <JsonLd daten={datasetSchema(url)} />

      <Section tone="sand" space="none" className="pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: t.wissen, href: "/ratgeber" }, { name: t.marktdaten, href: pfad("/marktdaten") }, { name: t.seite }]} className="mb-8 md:mb-12" />
        <div className="max-w-3xl">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="ov-h1 mt-4 text-balance text-ink-900">{t.titel}</h1>
          <p className="ov-lead mt-5 text-pretty text-ink-600">{t.lead}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{t.lead2}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">
              <Scale aria-hidden="true" className="h-3.5 w-3.5" />
              {t.entwurf}
            </span>
            <span className="text-[13px] text-ink-500">{t.zweit(standText)}</span>
          </div>
          {spanneH4 && spanneC3 && (
            <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
              <p className="text-[13px] font-semibold text-ink-700">{t.spanneTitel}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{t.spanneText(letztesJahr, en ? ATLAS_KATEGORIEN.H4.nameEn : ATLAS_KATEGORIEN.H4.name, spanneH4.min, spanneH4.max)}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{t.spanneText(letztesJahr, en ? ATLAS_KATEGORIEN.C3.nameEn : ATLAS_KATEGORIEN.C3.name, spanneC3.min, spanneC3.max)}</p>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#atlas" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ov-600 px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
              {t.zumAtlas}
            </a>
            <a href="#daten" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14.5px] font-semibold text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:text-navy-700 hover:ring-navy-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              <Download aria-hidden="true" className="h-4 w-4" />
              {t.zuDaten}
            </a>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg" id="atlas" className="scroll-mt-24">
        <SectionHeading eyebrow={t.atlasEyebrow} title={t.atlasTitel} lead={t.atlasLead} className="mb-10 md:mb-12" />
        <StrompreisAtlasCh jahre={[...ATLAS_JAHRE]} kategorien={ATLAS_KATEGORIEN} kantone={kantone} gemeinden={gemeinden} veraenderung={deltas} sprache={sprache} />
      </Section>

      <Section tone="sand" space="lg" id="daten" className="scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.datenEyebrow} title={t.datenTitel} lead={t.datenLead} />
            <Reveal className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={`${DATEI}.csv`} download className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ov-600 px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
                  <Download aria-hidden="true" className="h-4 w-4" />
                  {t.csv}
                </a>
                <a href={`${DATEI}.json`} download className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14.5px] font-semibold text-ink-800 ring-1 ring-ink-200 transition-colors hover:text-navy-700 hover:ring-navy-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  <Download aria-hidden="true" className="h-4 w-4" />
                  {t.json}
                </a>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-600">{t.umfang}</p>
              <p className="mt-4 text-[13px] font-semibold text-ink-700">{t.nennung}</p>
              <p className="mt-1 rounded-xl bg-sand-50 px-3 py-2 text-[13px] leading-relaxed text-ink-700 ring-1 ring-ink-200/60">{t.nennungText}</p>
            </Reveal>
            <Reveal className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
              <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Scale aria-hidden="true" className="h-4 w-4 text-ov-600" />
                {t.lizenzTitel}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{t.lizenzText(datumLang(ATLAS_LIZENZ.geprueft, en))}</p>
              <blockquote className="mt-3 rounded-xl bg-sand-50 px-3 py-2 text-[13px] leading-relaxed text-ink-700 ring-1 ring-ink-200/60" lang="en">
                „{ATLAS_LIZENZ.wortlaut}“
              </blockquote>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
                {t.lizenzFundstelle}:{" "}
                <a href={ATLAS_LIZENZ.fundstelle} target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-current">
                  opendata.swiss – Terms of use
                  <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
                </a>{" "}
                ·{" "}
                <a href={ATLAS_LIZENZ.url} target="_blank" rel="noopener noreferrer license" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-current">
                  terms_open
                  <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
                </a>
              </p>
            </Reveal>
          </div>
          <div className="space-y-8">
            <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
              <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Database aria-hidden="true" className="h-4 w-4 text-ov-600" />
                {t.methodik}
              </h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-600 marker:text-ov-500">
                {t.methodikPunkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <h3 className="mt-6 font-display text-[17px] font-bold text-ink-900">{t.quellen}</h3>
              <ul className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-600">
                {Object.entries(ATLAS_QUELLEN).map(([id, x]) => (
                  <li key={id}>
                    <a href={x.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-current">
                      {en ? x.titelEn : x.titel}
                      <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
                    </a>
                    <span className="text-ink-500">
                      {" "}
                      · {t.stand} {x.stand}, {t.abruf(standText)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[13px] leading-relaxed text-ink-500">{t.fuss}</p>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg" id="update" className="scroll-mt-24">
        <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.leadEyebrow} title={t.leadTitel} lead={t.leadText} />
            <ul className="mt-8 space-y-3 text-[15px] text-ink-700">
              {t.leadPunkte.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <Reveal>
            <AnfrageFormular
              typ="kontakt"
              land={land || undefined}
              daten={{ quelle: "marktdaten/strompreise-schweiz", anliegen: "atlas-update", ...(land ? { land } : {}) }}
              felder={land ? ["firma", "telefon", "nachricht"] : ["firma", "land", "telefon", "nachricht"]}
              titel={t.formTitel}
              text={t.formText}
              button={t.formButton}
              erfolgText={t.formErfolg}
            />
          </Reveal>
        </div>
      </Section>

      <Querverweise items={TEXTE.de.querverweise.map((v, i) => (en ? { ...v, ...TEXTE.en.querverweise[i] } : v))} />
    </>
  );
}

export const generateMetadata = seitenMetadata("/marktdaten/strompreise-schweiz", metadata, { en: metadataEn });

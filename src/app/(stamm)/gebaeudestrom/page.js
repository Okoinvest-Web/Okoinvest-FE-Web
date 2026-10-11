// src/app/(stamm)/gebaeudestrom/page.js – Geschäftsfeld Gebäudestrom (Welle 4, Paket GEBAEUDE)
//
// PV auf dem Mehrparteien- oder Gewerbegebäude, Strom an die Einheiten im Haus – je Land im
// passenden Modell: DE Mieterstrom (§ 21 Abs. 3 EEG) und Gemeinschaftliche Gebäudeversorgung
// (§ 42b EnWG), AT Gemeinschaftliche Erzeugungsanlage (§ 16a ElWOG), CH ZEV/vZEV (Art. 17–18 EnG).
// Zielgruppen-Einstiege: Hausverwaltungen (#hausverwaltungen) und Wohnbaugesellschaften (#wohnbau).
// Ehrlich: KEINE Geldwerte (Zuschlagshöhe, Tarife, Netzentgelte erst nach Fachprüfung E6,
// Faktenregister src/lib/fakten/daten/gebaeudestrom.js). Lead: Rechner → Bericht (B4) und
// /kontakt?anliegen=dach (Lead-Kette B3). noindex bis zur Fachprüfung (Register index: false).
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur).

import { Building2, CheckCircle2, ClipboardList, FileText, Handshake, KeyRound, Scale, Sun, Users } from "lucide-react";
import Link from "@/components/Land/Link";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Reveal from "@/components/ui/Reveal";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import { abs } from "@/data/site";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const PFAD = seitenPfad("/gebaeudestrom");
const TITEL = "Gebäudestrom: Solarstrom vom Dach für alle im Haus | ÖkoInvest";
const BESCHREIBUNG =
  "PV auf dem Mehrparteien- oder Gewerbegebäude: Mieterstrom und Gemeinschaftliche Gebäudeversorgung (DE), Gemeinschaftliche Erzeugungsanlage (AT), ZEV/vZEV (CH). Modelle, Ablauf und Einstiege für Hausverwaltungen und Wohnbaugesellschaften – ohne Renditeversprechen.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Gebäudestrom", "Mieterstrom Mehrfamilienhaus", "Gemeinschaftliche Gebäudeversorgung", "Gemeinschaftliche Erzeugungsanlage", "ZEV Schweiz", "PV Hausverwaltung", "Wohnbaugesellschaft Photovoltaik"],
  alternates: { canonical: abs(PFAD) },
  robots: { index: false, follow: true }, // Fachprüfung offen (Register index: false)
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/gewerbedach.jpg"), width: 1280, height: 852, alt: "Photovoltaikanlage auf einem Gebäudedach" }],
  },
  twitter: { card: "summary_large_image", title: TITEL, description: BESCHREIBUNG, images: [abs("/img/gewerbedach.jpg")] },
};

const metadataEn = {
  title: "Building power: rooftop solar for everyone in the building | ÖkoInvest",
  description:
    "PV on apartment and commercial buildings: tenant electricity and shared building supply (DE), jointly operated generation plant (AT), ZEV/vZEV (CH). Models, process and entry points for property managers and housing companies – no promised returns.",
  keywords: () => ["building power", "tenant electricity apartment building", "shared building supply EnWG", "jointly operated generation plant Austria", "ZEV Switzerland", "PV property management", "housing company photovoltaics"],
  openGraph: { title: "Building power: rooftop solar for everyone in the building | ÖkoInvest", images: [{ alt: "Photovoltaic system on a building roof" }] },
};

const FAQ = [
  {
    q: "Was ist Gebäudestrom?",
    a: "Solarstrom vom Dach des eigenen Gebäudes, den die Wohnungen und Gewerbeeinheiten im Haus direkt nutzen – ohne Umweg über das öffentliche Netz. Je Land gibt es dafür ein eigenes Modell mit eigenen Regeln für Rollen, Messung und Abrechnung.",
  },
  {
    q: "Müssen alle Mieterinnen und Mieter mitmachen?",
    a: "Nein, die Teilnahme ist in allen Modellen freiwillig. Wer nicht teilnimmt, behält seinen Stromvertrag unverändert. Auch Teilnehmende brauchen weiterhin einen Lieferanten für den Reststrom, wenn die Sonne nicht scheint.",
  },
  {
    q: "Was kostet das und was bringt es finanziell?",
    a: "Das beziffern wir hier bewusst nicht: Die Höhe des Mieterstromzuschlags, Tarife und Netzentgelt-Folgen je Land sind bei uns noch in der fachlichen Prüfung – ungeprüfte Zahlen zeigen wir nicht. Der Rechner zeigt ehrlich die Energiebilanz; die Wirtschaftlichkeit rechnen wir im konkreten Projekt mit geprüften Werten vor.",
  },
  {
    q: "Wer betreibt die Anlage?",
    a: "Das hängt vom Modell ab: der Eigentümer, die Eigentümergemeinschaft, eine Wohnbaugesellschaft oder ein Dienstleister als Betreiber. Beim Mieterstrom übernimmt der Betreiber Lieferantenpflichten, bei § 42b EnWG, der GEA und dem ZEV bleibt die Rolle schlanker. Wir erklären die Unterschiede und übernehmen auf Wunsch die Betriebsführung.",
  },
  {
    q: "Funktioniert das auch bei einer Wohnungseigentümergemeinschaft (WEG)?",
    nurDE: "Beschlussfassung",
    a: "Ja. In Deutschland gehört die Entscheidung in die Eigentümerversammlung; seit der WEG-Reform ist die Errichtung einer PV-Anlage leichter beschließbar. Für den Beschluss bereiten wir die Unterlagen vor: Energiebilanz, Modellvergleich und Ablauf.",
  },
  {
    q: "Was passiert mit dem Überschuss?",
    a: "Strom, der nicht zeitgleich im Haus verbraucht wird, wird ins Netz eingespeist beziehungsweise vermarktet. Der Rechner zeigt diese Menge offen aus – eine zu große Anlage erkennt man daran sofort.",
  },
];

const FAQ_EN = [
  {
    q: "What is building power?",
    a: "Solar power from the building’s own roof, used directly by the flats and commercial units in the house – without a detour through the public grid. Each country has its own model with its own rules for roles, metering and billing.",
  },
  {
    q: "Do all tenants have to take part?",
    a: "No, participation is voluntary in all models. Anyone who does not take part keeps their electricity contract unchanged. Participants also still need a supplier for residual power when the sun is not shining.",
  },
  {
    q: "What does it cost and what is the financial benefit?",
    a: "We deliberately do not quantify that here: the level of the tenant electricity surcharge, tariffs and grid fee effects per country are still under expert review – we do not show unverified figures. The calculator honestly shows the energy balance; we work out the economics in a specific project with verified figures.",
  },
  {
    q: "Who operates the plant?",
    a: "That depends on the model: the owner, the owners’ association, a housing company or a service provider as operator. With tenant electricity, the operator takes on supplier duties; under § 42b EnWG, the GEA and the ZEV the role is leaner. We explain the differences and take over operations if desired.",
  },
  {
    q: "Does this also work for an owners’ association?",
    nurDE: "Resolutions",
    a: "Yes. In Germany the decision belongs in the owners’ meeting; since the WEG reform, resolving to install a PV system has become easier. We prepare the documents for the resolution: energy balance, model comparison and process.",
  },
  {
    q: "What happens to the surplus?",
    a: "Power that is not consumed in the building at the same time is fed into the grid or marketed. The calculator shows this volume openly – an oversized plant is immediately apparent.",
  },
];

const TEXTE = {
  de: {
    brot: "Gebäudestrom",
    eyebrow: "Geschäftsfeld · DE, AT und CH",
    titel: (
      <>
        Gebäudestrom: Solarstrom vom Dach – <span className="text-ov-700">für alle im Haus.</span>
      </>
    ),
    lead: "Mehrparteienhäuser und Gewerbegebäude haben Dächer, deren Strom direkt im Haus gebraucht wird. Wir planen, errichten und betreiben die Anlage – im passenden Modell Ihres Landes, mit ehrlicher Energiebilanz statt Renditeversprechen.",
    punkte: [
      { icon: Sun, titel: "Ein Dach, viele Nutzer", text: "Wohnungen und Gewerbe im Haus nutzen den Solarstrom direkt – freiwillig, der Reststrom kommt weiter vom Lieferanten." },
      { icon: Scale, titel: "Je Land das richtige Modell", text: "Mieterstrom oder § 42b EnWG in Deutschland, GEA in Österreich, ZEV/vZEV in der Schweiz – Recht, Zahlen und Begriffe bleiben strikt getrennt." },
      { icon: CheckCircle2, titel: "Ehrlich gerechnet", text: "Der Rechner zeigt Energiemengen und Anteile mit Quellen. Geldwerte erst, wenn sie fachlich geprüft sind." },
    ],
    aktion1: "Gebäudestrom-Rechner öffnen",
    aktion2: "Machbarkeit anfragen",
    fussnote: "Kostenlos und unverbindlich · Antwort von unserem Projektteam",
    modelleEyebrow: "Modelle",
    modelleTitel: "Vier Wege, ein Prinzip – je Land das passende Modell",
    modelleLead: "Der Strom vom eigenen Dach bleibt im Haus. Unterschiedlich sind Rollen, Messung und Abrechnung – und das Recht des Landes.",
    ihrLand: "Ihr Land",
    modelle: [
      {
        land: "DE",
        landName: "Deutschland",
        titel: "Mieterstrom",
        recht: "§ 21 Abs. 3 EEG 2023",
        punkte: [
          "Betreiber liefert den Solarstrom an die Haushalte im Gebäude bzw. Quartier – ohne Durchleitung durch das öffentliche Netz.",
          "Anspruch auf den Mieterstromzuschlag; der Betreiber übernimmt dafür Lieferantenpflichten.",
          "Die Höhe des Zuschlags nennen wir erst nach fachlicher Prüfung – ungeprüfte Beträge zeigen wir nicht.",
        ],
      },
      {
        land: "DE",
        landName: "Deutschland",
        titel: "Gemeinschaftliche Gebäudeversorgung",
        recht: "§ 42b EnWG",
        punkte: [
          "Der Dachstrom wird nach einem vereinbarten Schlüssel auf die Teilnehmenden verteilt.",
          "Der Betreiber wird dabei nicht Stromlieferant – deutlich schlankere Pflichten als beim Mieterstrom.",
          "Jeder Teilnehmende behält seinen eigenen Vertrag für den Reststrom.",
        ],
      },
      {
        land: "AT",
        landName: "Österreich",
        titel: "Gemeinschaftliche Erzeugungsanlage",
        recht: "§ 16a ElWOG 2010",
        punkte: [
          "Mehrere Teilnehmende am gemeinsamen Netzanschlusspunkt – typisch ein Mehrparteienhaus – betreiben gemeinsam die Anlage.",
          "Der Solarstrom wird nach einem vereinbarten Schlüssel aufgeteilt; gemessen wird über die Viertelstundenwerte.",
          "Teilnahme freiwillig, der Lieferant für den Reststrom bleibt frei wählbar.",
        ],
      },
      {
        land: "CH",
        landName: "Schweiz",
        titel: "ZEV und virtueller ZEV",
        recht: "Art. 17–18 EnG",
        punkte: [
          "Grundeigentümer und Mieter verbrauchen den Solarstrom gemeinsam und treten gegenüber dem Netzbetreiber als ein Endverbraucher auf.",
          "Beim virtuellen ZEV (vZEV) misst der Netzbetreiber über die bestehenden Zähler – ohne eigene Messinfrastruktur.",
          "Interne Abrechnung durch Eigentümer oder Verwaltung, auf Wunsch durch uns.",
        ],
      },
    ],
    modelleHinweis: "Rechtsstand je Land dokumentiert im Faktenregister; fachliche Zweitprüfung (E6) läuft. Diese Seite ersetzt keine Rechtsberatung.",
    zielEyebrow: "Für wen",
    zielTitel: "Einstiege für Profis mit vielen Gebäuden",
    ziel: [
      {
        id: "hausverwaltungen",
        icon: KeyRound,
        titel: "Hausverwaltungen",
        text: "Eigentümer fragen nach PV, die Abrechnung schreckt ab? Wir nehmen Ihnen den technischen und organisatorischen Teil ab – Sie bleiben Ansprechpartner Ihrer Eigentümer.",
        punkte: [
          "Energiebilanz und Modellvergleich je Gebäude – als Entscheidungsvorlage für die Eigentümerversammlung",
          "Teilnehmerverwaltung, Messkonzept und Abrechnung mit Dienstleistern, auf Wunsch aus einer Hand",
          "Ein Ansprechpartner für Ihr gesamtes Portfolio statt Einzellösungen je Haus",
        ],
        aktion: "Portfolio-Gespräch anfragen",
      },
      {
        id: "wohnbau",
        icon: Building2,
        titel: "Wohnbaugesellschaften & Genossenschaften",
        text: "Viele gleichartige Gebäude, ein Standard: Wir entwickeln mit Ihnen ein wiederholbares Gebäudestrom-Konzept – vom Pilotgebäude bis zum Rollout über den Bestand.",
        punkte: [
          "Priorisierung des Bestands: Welche Dächer zuerst? Energiebilanz je Gebäudetyp statt Bauchgefühl",
          "Ein Modell, ein Vertragsmuster, ein Abrechnungsweg – skalierbar über viele Gebäude",
          "Betrieb und Monitoring laufend, Berichte für Gremien und Aufsichtsrat",
        ],
        aktion: "Bestandsanalyse anfragen",
      },
    ],
    zielRechner: "Erst selbst rechnen?",
    ablaufEyebrow: "Ablauf",
    ablaufTitel: "Vom Dach zum Gebäudestrom – in vier Schritten",
    ablauf: [
      { title: "Energiebilanz", text: "Einheiten, Verbrauch, Dachfläche – der Rechner zeigt, ob Gebäude und Anlage zusammenpassen. Kostenlos, ohne Anmeldung." },
      { title: "Modellwahl", text: "Wir vergleichen die Modelle Ihres Landes für Ihr Gebäude: Rollen, Messung, Abrechnung – mit geprüften Zahlen im Projekt." },
      { title: "Beschluss & Verträge", text: "Entscheidungsvorlage für Eigentümerversammlung oder Gremium, Teilnahmevereinbarungen, Messkonzept mit dem Netzbetreiber." },
      { title: "Bau & Betrieb", text: "Errichtung durch Fachbetriebe der Gruppe, danach Betriebsführung, Monitoring und Abrechnung – so lange Sie wollen." },
    ],
    rahmenEyebrow: "Ehrlicher Rahmen",
    rahmenTitel: "Was Sie vorab wissen sollten",
    rahmen: [
      "Keine Renditeversprechen: Wirtschaftlichkeit rechnen wir erst im konkreten Projekt mit fachlich geprüften Werten vor – auf dieser Seite stehen bewusst keine Beträge.",
      "Die Teilnahme der Bewohnerinnen und Bewohner ist freiwillig; kalkulieren Sie konservativ mit einer Teilnahmequote unter 100 %.",
      "Statik, Denkmalschutz, Zählerplatz und Netzanschluss prüft die Fachplanung vor Ort – nicht jede Immobilie eignet sich.",
      "Diese Seite ersetzt keine Rechts- oder Steuerberatung; die Rechtsabteilung prüft die fertigen Unterlagen gesamthaft.",
    ],
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Gebäudestrom – häufige Fragen",
    faqLead: "Ihre Frage ist nicht dabei? Unser Projektteam beantwortet sie persönlich.",
    querverweise: [
      { href: "/rechner/gebaeudestrom", titel: "Gebäudestrom-Rechner", text: "Anlagengröße, Eigenverbrauch und Deckung für Ihr Gebäude – je Land im passenden Modell." },
      { href: "/dachflaeche-verpachten", titel: "Dachfläche verpachten", text: "Großes Gewerbedach ohne Eigenverbrauch im Haus? Pachtmodelle im Vergleich." },
      { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Strom über das Gebäude hinaus teilen – Modelle und Software je Land." },
    ],
    cta: {
      eyebrow: "Gebäudestrom",
      title: "Welches Modell passt zu Ihrem Gebäude?",
      text: "Schicken Sie uns Eckdaten zu Gebäude und Dach. Wir melden uns mit einer ersten Einschätzung – kostenlos und unverbindlich.",
      primary: { label: "Machbarkeit anfragen", href: "/kontakt?anliegen=dach#formular" },
      secondary: { label: "Erst selbst rechnen", href: "/rechner/gebaeudestrom" },
    },
  },
  en: {
    brot: "Building power",
    eyebrow: "Business area · DE, AT and CH",
    titel: (
      <>
        Building power: rooftop solar – <span className="text-ov-700">for everyone in the building.</span>
      </>
    ),
    lead: "Apartment and commercial buildings have roofs whose power is needed right inside the house. We plan, build and operate the plant – in your country’s appropriate model, with an honest energy balance instead of promised returns.",
    punkte: [
      { icon: Sun, titel: "One roof, many users", text: "Flats and businesses in the building use the solar power directly – voluntarily; residual power still comes from a supplier." },
      { icon: Scale, titel: "The right model per country", text: "Tenant electricity or § 42b EnWG in Germany, GEA in Austria, ZEV/vZEV in Switzerland – law, figures and terms remain strictly separate." },
      { icon: CheckCircle2, titel: "Honestly calculated", text: "The calculator shows energy volumes and shares with sources. Monetary values only once they have been professionally reviewed." },
    ],
    aktion1: "Open the building power calculator",
    aktion2: "Request a feasibility check",
    fussnote: "Free of charge and without obligation · answered by our project team",
    modelleEyebrow: "Models",
    modelleTitel: "Four routes, one principle – the appropriate model per country",
    modelleLead: "The power from your own roof stays in the building. What differs are roles, metering and billing – and each country’s law.",
    ihrLand: "Your country",
    modelle: [
      {
        land: "DE",
        landName: "Germany",
        titel: "Tenant electricity",
        recht: "§ 21 (3) EEG 2023",
        punkte: [
          "The operator supplies the solar power to households in the building or quarter – without passing through the public grid.",
          "Entitlement to the tenant electricity surcharge; in return the operator takes on supplier duties.",
          "We will only state the surcharge level after expert review – we do not show unverified amounts.",
        ],
      },
      {
        land: "DE",
        landName: "Germany",
        titel: "Shared building supply",
        recht: "§ 42b EnWG",
        punkte: [
          "The roof power is distributed to participants according to an agreed allocation key.",
          "The operator does not become an electricity supplier – much leaner duties than with tenant electricity.",
          "Each participant keeps their own contract for residual power.",
        ],
      },
      {
        land: "AT",
        landName: "Austria",
        titel: "Jointly operated generation plant",
        recht: "§ 16a ElWOG 2010",
        punkte: [
          "Several participants at a shared grid connection point – typically an apartment building – operate the plant together.",
          "The solar power is split according to an agreed key; metering uses the quarter-hourly values.",
          "Participation is voluntary; the supplier for residual power remains freely selectable.",
        ],
      },
      {
        land: "CH",
        landName: "Switzerland",
        titel: "ZEV and virtual ZEV",
        recht: "Art. 17–18 EnG",
        punkte: [
          "Property owners and tenants consume the solar power together and act as a single end consumer towards the grid operator.",
          "In a virtual ZEV (vZEV), the grid operator meters via the existing meters – no separate metering infrastructure.",
          "Internal billing by the owner or property manager, or by us if desired.",
        ],
      },
    ],
    modelleHinweis: "The legal basis per country is documented in our fact register; the second expert review (E6) is under way. This page is not legal advice.",
    zielEyebrow: "Who it is for",
    zielTitel: "Entry points for professionals with many buildings",
    ziel: [
      {
        id: "hausverwaltungen",
        icon: KeyRound,
        titel: "Property managers",
        text: "Owners ask about PV, but the billing puts you off? We take the technical and organisational part off your hands – you remain your owners’ point of contact.",
        punkte: [
          "Energy balance and model comparison per building – as a decision paper for the owners’ meeting",
          "Participant management, metering concept and billing with service providers, from a single source if desired",
          "One contact for your whole portfolio instead of one-off solutions per building",
        ],
        aktion: "Request a portfolio meeting",
      },
      {
        id: "wohnbau",
        icon: Building2,
        titel: "Housing companies & cooperatives",
        text: "Many similar buildings, one standard: together we develop a repeatable building power concept – from the pilot building to the rollout across your stock.",
        punkte: [
          "Prioritising the stock: which roofs first? Energy balance per building type instead of gut feeling",
          "One model, one contract template, one billing route – scalable across many buildings",
          "Ongoing operation and monitoring, reports for boards and committees",
        ],
        aktion: "Request a stock analysis",
      },
    ],
    zielRechner: "Want to run the numbers first?",
    ablaufEyebrow: "Process",
    ablaufTitel: "From roof to building power – in four steps",
    ablauf: [
      { title: "Energy balance", text: "Units, consumption, roof area – the calculator shows whether building and plant fit together. Free, no registration." },
      { title: "Choice of model", text: "We compare your country’s models for your building: roles, metering, billing – with verified figures in the project." },
      { title: "Resolution & contracts", text: "Decision paper for the owners’ meeting or board, participation agreements, metering concept with the grid operator." },
      { title: "Build & operate", text: "Construction by the group’s specialist companies, then operations, monitoring and billing – for as long as you want." },
    ],
    rahmenEyebrow: "Honest framework",
    rahmenTitel: "What you should know in advance",
    rahmen: [
      "No promised returns: we only work out the economics in a specific project with professionally verified figures – this page deliberately shows no amounts.",
      "Residents’ participation is voluntary; calculate conservatively with a participation rate below 100%.",
      "Statics, heritage protection, meter room and grid connection are checked by professional planning on site – not every property is suitable.",
      "This page is not legal or tax advice; our legal team reviews the final documents as a whole.",
    ],
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Building power – frequently asked questions",
    faqLead: "Your question isn’t here? Our project team will answer it personally.",
    querverweise: [
      { href: "/rechner/gebaeudestrom", titel: "Building power calculator", text: "Plant size, self-consumption and coverage for your building – in the appropriate model per country." },
      { href: "/dachflaeche-verpachten", titel: "Lease your roof", text: "Large commercial roof without on-site consumption? Lease models compared." },
      { href: "/energiegemeinschaften", titel: "Energy communities", text: "Share power beyond the building – models and software per country." },
    ],
    cta: {
      eyebrow: "Building power",
      title: "Which model suits your building?",
      text: "Send us the key figures for the building and roof. We will get back to you with a first assessment – free of charge and without obligation.",
      primary: { label: "Request a feasibility check", href: "/kontakt?anliegen=dach#formular" },
      secondary: { label: "Run the numbers first", href: "/rechner/gebaeudestrom" },
    },
  },
};

const schema = (en) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: en ? "Building power (rooftop solar for buildings)" : "Gebäudestrom (Solarstrom vom Gebäudedach)",
  serviceType: en
    ? "Planning, construction and operation of PV systems for on-site supply in buildings"
    : "Planung, Errichtung und Betrieb von PV-Anlagen zur Versorgung im Gebäude",
  audience: { "@type": "BusinessAudience", name: en ? "Property managers, housing companies, building owners" : "Hausverwaltungen, Wohnbaugesellschaften, Gebäudeeigentümer" },
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: [{ "@type": "Country", name: "Deutschland" }, { "@type": "Country", name: "Österreich" }, { "@type": "Country", name: "Schweiz" }],
  url: abs(PFAD),
});

function ModellKarte({ m, aktiv, ihrLand }) {
  return (
    <div className={`flex h-full flex-col rounded-3xl bg-white p-6 ring-1 transition-colors md:p-7 ${aktiv ? "ring-2 ring-ov-500" : "ring-ink-200/70"}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-600 ring-1 ring-inset ring-ink-200/70">
          {m.landName}
        </span>
        {aktiv && <span className="rounded-full bg-ov-100 px-2.5 py-1 text-[11px] font-bold text-ov-800">{ihrLand}</span>}
      </div>
      <h3 className="mt-4 font-display text-[19px] font-bold leading-snug text-ink-900">{m.titel}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-ov-700">
        <Scale aria-hidden="true" className="h-3.5 w-3.5" />
        {m.recht}
      </p>
      <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink-600">
        {m.punkte.map((p) => (
          <li key={p} className="flex gap-2.5">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
            <span className="min-w-0">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function GebaeudestromSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const faq = faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache });

  return (
    <>
      <JsonLd daten={schema(en)} />

      {/* Hero */}
      <Section tone="sand" space="none" className="pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: t.brot }]} className="mb-8 md:mb-12" />
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-xl">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 className="ov-h1 mt-4 text-balance text-ink-900">{t.titel}</h1>
            <p className="ov-lead mt-5 text-pretty text-ink-600">{t.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/rechner/gebaeudestrom" size="lg" pfeil data-ov-cta>
                {t.aktion1}
              </Button>
              <Button href="/kontakt?anliegen=dach#formular" variant="secondary" size="lg">
                {t.aktion2}
              </Button>
            </div>
            <p className="mt-4 text-[13px] text-ink-500">{t.fussnote}</p>
          </div>
          <Reveal>
            <ul className="space-y-4 rounded-3xl bg-white p-6 shadow-e2 ring-1 ring-ink-200/70 md:p-7">
              {t.punkte.map((p, i) => {
                const Icon = TEXTE.de.punkte[i].icon;
                return (
                  <li key={p.titel} className="flex gap-3.5">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[15.5px] font-bold leading-snug text-ink-900">{p.titel}</p>
                      <p className="mt-0.5 text-[14px] leading-snug text-ink-600">{p.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* Modelle je Land */}
      <Section tone="white" space="lg" id="modelle">
        <SectionHeading eyebrow={t.modelleEyebrow} title={t.modelleTitel} lead={t.modelleLead} className="mb-10 md:mb-12" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {t.modelle.map((m, i) => (
            <Reveal key={m.titel} delay={i * 60} className="flex">
              <ModellKarte m={m} aktiv={!!land && m.land === land} ihrLand={t.ihrLand} />
            </Reveal>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
          <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          {t.modelleHinweis}
        </p>
      </Section>

      {/* Zielgruppen-Einstiege */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow={t.zielEyebrow} title={t.zielTitel} className="mb-10 md:mb-12" />
        <div className="grid gap-5 lg:grid-cols-2">
          {t.ziel.map((z, i) => {
            const Icon = TEXTE.de.ziel[i].icon;
            return (
              <Reveal key={z.id} delay={i * 80}>
                <div id={z.id} className="flex h-full scroll-mt-28 flex-col rounded-3xl bg-white p-7 ring-1 ring-ink-200/70 md:p-8">
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-600 text-white shadow-e2">
                    <Icon className="h-5.5 w-5.5" />
                  </span>
                  <h3 className="mt-5 font-display text-[22px] font-bold leading-snug text-ink-900">{z.titel}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{z.text}</p>
                  <ul className="mt-5 space-y-2.5 text-[14px] leading-relaxed text-ink-600">
                    {z.punkte.map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                        <span className="min-w-0">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6">
                    <Button href="/kontakt?anliegen=dach#formular" pfeil data-ov-cta>
                      {z.aktion}
                    </Button>
                    <Link
                      href="/rechner/gebaeudestrom"
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg text-[14.5px] font-semibold text-ov-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                    >
                      {t.zielRechner}
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* Ablauf */}
      <Section tone="white" space="lg" id="ablauf">
        <SectionHeading eyebrow={t.ablaufEyebrow} title={t.ablaufTitel} className="mb-10 md:mb-14" />
        <Steps items={t.ablauf} />
      </Section>

      {/* Ehrlicher Rahmen */}
      <Section tone="white" space="none" className="pb-16 md:pb-24">
        <div className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-3xl p-7 text-white shadow-kante md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <SectionHeading eyebrow={t.rahmenEyebrow} title={t.rahmenTitel} dark />
            <ul className="space-y-4">
              {t.rahmen.map((p, i) => {
                const Icon = [Handshake, Users, ClipboardList, Scale][i] || Scale;
                return (
                  <li key={p} className="flex gap-3.5">
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-300" />
                    <span className="min-w-0 text-[15px] leading-relaxed text-white/80">{p}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={faq} />
        </div>
      </Section>

      <Querverweise items={t.querverweise} />
      <CtaBand {...t.cta} />
    </>
  );
}

export const generateMetadata = seitenMetadata("/gebaeudestrom", metadata, { en: metadataEn });

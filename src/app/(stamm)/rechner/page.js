// src/app/rechner/page.js – Hub „Rechner & Tools"
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Tool-Texte aus TOOLS_EN (src/components/Rechner/tools.js).

import Link from "@/components/Land/Link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import CountUp from "@/components/ui/CountUp";
import { TextEnthuellung } from "@/components/motion";
import HubBuehne from "@/components/Rechner/HubBuehne";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { TOOLS, TOOL_BEGRIFFE_EN, toolsFuer } from "@/components/Rechner/tools";
import { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import { VorschauAgri, VorschauBalken, VorschauCarport, VorschauCashflow, VorschauFlaeche, VorschauPacht, VorschauStrompreis, VorschauTreppe } from "@/components/Rechner/ToolVorschau";
import { rechneSolarpark } from "@/lib/rechner/solarpark";
import { rechneKommune } from "@/lib/rechner/kommune";
import { abs } from "@/data/site";
import { STAND } from "@/lib/invest/markt";
import JsonLd from "@/components/JsonLd";
import { landHinweisText, landHinweisTextEn, pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";

const PFAD = seitenPfad("/rechner");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Rechner für Solarparks, Pacht & Agri-PV | ÖkoInvest",
  description:
    "Kostenlose Rechner für den DACH-Raum: Flächencheck, Pacht, Agri-PV, Solarpark-Rendite, Projektbewertung, Reststrom, Solarcarport und Kommunal-Einnahmen.",
  keywords: ["Solarpark Rechner", "Pachtrechner Photovoltaik", "Agri-PV Rechner", "Projektbewertung Solar", "Solarcarport Rechner", "Solarpark Gemeinde Einnahmen"],
});

const metadataEn = rechnerMetadataEn({
  title: "Calculators for solar parks, leases & agrivoltaics | ÖkoInvest",
  description:
    "Free calculators for the DACH region: land check, lease, agrivoltaics, solar park returns, project valuation, residual power, solar carports and municipal income.",
  keywords: ["solar park calculator", "photovoltaic lease calculator", "agrivoltaics calculator", "solar project valuation", "solar carport calculator", "solar park municipal income"],
});

// Gruppen, Wegweiser und FAQ je Sprache (gleiche ids, Reihenfolge und Zuordnung)
const DE = {
  gruppen: [
    { id: "eigentuemer", kurz: "Eigentümer & Landwirte", titel: "Flächeneigentümer & Landwirte", text: "Eignet sich Ihre Fläche – und was bringt sie über 30 Jahre?", ids: ["flaechencheck", "pacht", "agri-pv"], weitere: ["pachtangebot-check", "dachpacht", "netzanschluss"] },
    { id: "investoren", kurz: "Investoren", titel: "Investoren & Entwickler", text: "Rendite, Finanzierung und Wert von Projekten in jeder Phase.", ids: ["solarpark", "projektbewertung"], weitere: ["grossspeicher", "bestandsanlage"] },
    { id: "unternehmen", kurz: "Unternehmen, Kommunen & Bürger", titel: "Unternehmen, Kommunen & Bürger", text: "Günstiger Strom, Parkplatz-PV, Einnahmen für die Gemeinde und Beteiligung.", ids: ["reststrom", "solarcarport", "kommune"], weitere: ["ppa", "energy-sharing", "eg-ersparnis", "beteiligung"] },
  ],
  wegweiser: [
    ["Fläche verpachten", "flaechencheck", "Eignung, Pachtspanne"],
    ["Pachtangebot vergleichen", "pacht", "Pacht über 30 Jahre"],
    ["Agri-PV auf dem eigenen Hof", "agri-pv", "Pacht vs. Investition"],
    ["Solarpark kaufen oder finanzieren", "solarpark", "IRR, LCOE, DSCR"],
    ["Projektrechte verkaufen", "projektbewertung", "Kaufpreis je kWp"],
    ["Stromkosten im Betrieb senken", "reststrom", "Ersparnis im Pool"],
    ["Parkplatz mit PV überdachen", "solarcarport", "Amortisation, Contracting"],
    ["Solarpark in der Gemeinde", "kommune", "Einnahmen je Quelle"],
    ["Angebot eines Projektierers prüfen", "pachtangebot-check", "Ampel je Klausel, Barwert"],
    ["Gewerbedach verpachten", "dachpacht", "Pachtspanne, Ertrag"],
    ["Netzanschluss abschätzen", "netzanschluss", "Kosten, Zeitrahmen"],
    ["Solarstrom per PPA beziehen", "ppa", "Ersparnis in drei Szenarien"],
    ["In einen Großspeicher investieren", "grossspeicher", "IRR, Amortisation"],
    ["Laufende PV-Anlage bewerten", "bestandsanlage", "Ertragswert, Wert je kWp"],
    ["Strom in der Gemeinschaft teilen", "energy-sharing", "Vorteil je Teilnehmer"],
    ["Als Bürger beteiligen", "beteiligung", "Ausschüttung in drei Szenarien"],
  ],
  faq: [
    {
      q: "Wie genau sind die ÖkoInvest-Rechner?",
      a: "Sie liefern eine fundierte Orientierung auf Basis offengelegter Marktannahmen – Einstrahlung, Baukosten, Pachtpreise, Ausschreibungsergebnisse und Finanzierungskonditionen. Jede Rechnerseite zeigt ihre Annahmen und Quellen. Verbindlich werden Zahlen erst mit Ertragsgutachten, Netzauskunft und konkreten Angeboten.",
    },
    {
      q: "Kosten die Rechner etwas?",
      a: "Nein. Alle Rechner sind kostenlos und ohne Anmeldung nutzbar. Erst wenn Sie eine Anfrage senden, übermitteln Sie Ihre Werte – auf Wunsch direkt aus dem Rechner.",
    },
    {
      q: "Gelten die Rechner auch für Österreich und die Schweiz?",
      a: "Die Ertrags- und Wirtschaftlichkeitsrechner enthalten Regionen für Deutschland, Österreich und die Schweiz. Förder- und Steuerregeln (etwa EEG-Zuschläge, § 6 EEG oder Gewerbesteuer) bilden sie nach deutschem Recht ab; die Unterschiede in Österreich und der Schweiz erläutern wir auf den jeweiligen Seiten.",
    },
    {
      q: "Wie aktuell sind die Annahmen?",
      a: `Stand ist ${STAND}. Wir aktualisieren die Werte an einer zentralen Stelle, sobald neue Ausschreibungsergebnisse, Kosten- oder Marktdaten vorliegen – alle Rechner übernehmen sie automatisch.`,
    },
  ],
  krume: "Rechner & Tools",
  kostenlos: "Kostenlos",
  ohne: "Ohne Anmeldung",
  ohneLang: "Ohne Anmeldung · Annahmen offengelegt",
  titel: (
    <>
      Erst rechnen, <span className="ov-text-gradient-light">dann entscheiden.</span>
    </>
  ),
  lead: (n) => `${n} kostenlose Werkzeuge für Flächen, Projekte, Kapital und Strom – mit offengelegten Marktannahmen für Deutschland, Österreich und die Schweiz.`,
  finden: "Rechner finden",
  vorhaben: "Nach Vorhaben wählen",
  kennzahlen: ["kostenlose Tools", "Länder im DACH-Raum", "Cashflow je Solarpark"],
  jSuffix: " J.",
  buehneGemeinsam: (gemeinsam) => `Beispielrechnung mit den Standardannahmen der Rechner${gemeinsam ? " (gilt für Deutschland)" : ""}`,
  buehneLand: (l) => `Beispielrechnung mit Annahmen für Deutschland · ${landHinweisText(l, "Rechenwerte")}`,
  beispielwerte: (l) => `${landHinweisText(l, "Beispielwerte")}.`,
  alleAria: "Alle Rechner und Tools",
  zielgruppeAria: "Rechner nach Zielgruppe",
  fuer: "Für",
  weitereAria: (k) => `Weitere Werkzeuge: ${k}`,
  cfBeispiel: "Beispiel 10 MWp · kumulierter Cashflow",
  treppe: "Werttreppe bis Baureife, €/kWp",
  p6: "§ 6 EEG (30 J.)",
  gewSt: "Gewerbesteuer (30 J.)",
  wegEyebrow: "Wegweiser",
  wegTitel: "Welcher Rechner passt zu Ihrer Frage?",
  wegText: "Wählen Sie das Werkzeug nach Ihrem Vorhaben – Ergebnisse lassen sich direkt in eine Anfrage übernehmen.",
  faqEyebrow: "Häufige Fragen",
  faqTitel: "Rechner & Tools – gut zu wissen",
  faqLead: "Transparent, kostenlos und ohne Anmeldung.",
  cta: {
    eyebrow: "Kostenlos & unverbindlich",
    title: "Aus Zahlen wird ein Projekt.",
    text: "Sie haben gerechnet – wir prüfen Fläche, Netz und Wirtschaftlichkeit mit echten Daten. Mit festem Ansprechpartner und Status im Portal.",
    primary: { label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") },
    secondary: { label: "Für Investoren", href: "/investoren" },
  },
  oeffnen: "Öffnen",
};

const EN = {
  gruppen: [
    { kurz: "Owners & farmers", titel: "Landowners & farmers", text: "Is your land suitable – and what will it earn over 30 years?" },
    { kurz: "Investors", titel: "Investors & developers", text: "Return, financing and value of projects in every phase." },
    { kurz: "Businesses, municipalities & citizens", titel: "Businesses, municipalities & citizens", text: "Cheaper power, car park PV, income for the municipality and participation." },
  ],
  wegweiser: [
    ["Lease your land", "flaechencheck", "Suitability, lease range"],
    ["Compare a lease offer", "pacht", "Lease over 30 years"],
    ["Agrivoltaics on your own farm", "agri-pv", "Lease vs. investment"],
    ["Buy or finance a solar park", "solarpark", "IRR, LCOE, DSCR"],
    ["Sell project rights", "projektbewertung", "Purchase price per kWp"],
    ["Cut your business’s power costs", "reststrom", "Savings in the pool"],
    ["Cover your car park with PV", "solarcarport", "Payback, contracting"],
    ["A solar park in your municipality", "kommune", "Income by source"],
    ["Check a developer’s offer", "pachtangebot-check", "Traffic light per clause, present value"],
    ["Lease a commercial roof", "dachpacht", "Lease range, yield"],
    ["Estimate the grid connection", "netzanschluss", "Costs, time frame"],
    ["Buy solar power via a PPA", "ppa", "Savings in three scenarios"],
    ["Invest in battery storage", "grossspeicher", "IRR, payback"],
    ["Value an operating PV plant", "bestandsanlage", "Income value, value per kWp"],
    ["Share power in a community", "energy-sharing", "Benefit per participant"],
    ["Participate as a citizen", "beteiligung", "Distribution in three scenarios"],
  ],
  faq: [
    {
      q: "How accurate are the ÖkoInvest calculators?",
      a: "They provide well-founded guidance based on disclosed market assumptions – irradiation, construction costs, lease prices, tender results and financing terms. Every calculator page shows its assumptions and sources. Figures only become binding with a yield assessment, grid information and specific offers.",
    },
    {
      q: "Do the calculators cost anything?",
      a: "No. All calculators are free of charge and can be used without registering. Only when you send an enquiry do you transmit your values – directly from the calculator if you wish.",
    },
    {
      q: "Do the calculators also apply to Austria and Switzerland?",
      a: "The yield and economics calculators include regions for Germany, Austria and Switzerland. Subsidy and tax rules (such as EEG awards, § 6 EEG or trade tax) are modelled under German law; we explain the differences in Austria and Switzerland on the respective pages.",
    },
    {
      q: "How up to date are the assumptions?",
      a: `They are as of ${datumText(STAND, "en")}. We update the values in one central place as soon as new tender results, cost or market data are available – all calculators adopt them automatically.`,
    },
  ],
  krume: "Calculators & tools",
  kostenlos: "Free",
  ohne: "No sign-up",
  ohneLang: "No sign-up · assumptions disclosed",
  titel: (
    <>
      Calculate first, <span className="ov-text-gradient-light">then decide.</span>
    </>
  ),
  lead: (n) => `${n} free tools for land, projects, capital and power – with disclosed market assumptions for Germany, Austria and Switzerland.`,
  finden: "Find a calculator",
  vorhaben: "Choose by project",
  kennzahlen: ["free tools", "countries in the DACH region", "cash flow per solar park"],
  jSuffix: " yrs",
  buehneGemeinsam: (gemeinsam) => `Example calculation with the calculators’ default assumptions${gemeinsam ? " (applies to Germany)" : ""}`,
  buehneLand: (l) => `Example calculation with assumptions for Germany · ${landHinweisTextEn(l, "Figures")}`,
  beispielwerte: (l) => `${landHinweisTextEn(l, "Example values")}.`,
  alleAria: "All calculators and tools",
  zielgruppeAria: "Calculators by target group",
  fuer: "For",
  weitereAria: (k) => `More tools: ${k}`,
  cfBeispiel: "Example 10 MWp · cumulative cash flow",
  treppe: "Value staircase to ready-to-build, €/kWp",
  p6: "§ 6 EEG (30 yrs)",
  gewSt: "Trade tax (30 yrs)",
  wegEyebrow: "Guide",
  wegTitel: "Which calculator answers your question?",
  wegText: "Choose the tool by your project – results can be carried straight into an enquiry.",
  faqEyebrow: "Frequently asked questions",
  faqTitel: "Calculators & tools – good to know",
  faqLead: "Transparent, free of charge and without sign-up.",
  cta: {
    eyebrow: "Free & without obligation",
    title: "From figures to a project.",
    text: "You have done the maths – we check land, grid and economics with real data. With a dedicated contact person and status in the portal.",
    primary: { label: "Have your land checked" },
    secondary: { label: "For investors" },
  },
  oeffnen: "Open",
};

const TAG_TON = {
  Neu: "bg-ov-100 text-ov-800",
  Profi: "bg-sun-100 text-sun-700",
  Beliebt: "bg-navy-50 text-navy-700",
};

export default async function RechnerHub({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  const f = formate(sprache);
  const tools = toolsFuer(sprache, land);
  const toolById = (id) => tools.find((x) => x.id === id);
  const tagText = (tag) => (en ? TOOL_BEGRIFFE_EN.tag[tag] ?? tag : tag);

  // Jedes Tool aus TOOLS erscheint genau einmal – neue Tools ohne Zuordnung landen in der letzten Gruppe
  const zugeordnet = new Set(t.gruppen.flatMap((g) => [...g.ids, ...g.weitere]));
  const gruppen = t.gruppen.map((g, i) => (i === t.gruppen.length - 1 ? { ...g, weitere: [...g.weitere, ...TOOLS.filter((x) => !zugeordnet.has(x.id)).map((x) => x.id)] } : g));

  // Beispielrechnungen für die Vorschauen – mit derselben Logik wie die Rechner
  const park = rechneSolarpark({ mwp: 10 });
  let kum = -park.investition.summe;
  const cf = [kum, ...park.jahre.map((j) => (kum += j.cfProjekt))];
  const gemeinde = rechneKommune({ mwp: 20 });

  const vorschau = {
    flaechencheck: <VorschauFlaeche />,
    pacht: <VorschauPacht />,
    "agri-pv": <VorschauAgri />,
    solarpark: (
      <div>
        <div className="mb-2 flex items-baseline justify-between text-[12.5px] text-ink-500">
          <span>{t.cfBeispiel}</span>
          <span className="ov-num font-semibold text-ink-700">LCOE {f.fmt(park.lcoeCt, 1)} ct</span>
        </div>
        <VorschauCashflow werte={cf} />
      </div>
    ),
    projektbewertung: (
      <div>
        <p className="mb-2 text-[12.5px] text-ink-500">{t.treppe}</p>
        <VorschauTreppe />
      </div>
    ),
    reststrom: <VorschauStrompreis />,
    solarcarport: <VorschauCarport />,
    kommune: (
      <VorschauBalken
        reihen={[
          { label: t.p6, wert: gemeinde.gesamtLaufzeit.p6, anzeige: f.fmtMio(gemeinde.gesamtLaufzeit.p6, 1), farbe: "#669933" },
          { label: t.gewSt, wert: gemeinde.gesamtLaufzeit.gewSt || 1, anzeige: f.fmtMio(gemeinde.gesamtLaufzeit.gewSt, 1), farbe: "#1f5aa1" },
        ]}
      />
    ),
  };

  // Länderfassung AT/CH: Vorschauen mit Beispielwerten für Deutschland durch den LandHinweis ersetzen
  // (der Flächencheck zeigt keine Werte).
  const vorschauImLand =
    land && land !== "DE"
      ? Object.fromEntries(
          Object.entries(vorschau).map(([id, v]) => [id, id === "flaechencheck" ? v : <p className="text-[12.5px] leading-relaxed text-ink-500">{t.beispielwerte(land)}</p>])
        )
      : vorschau;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: en ? "ÖkoInvest calculators & tools" : "ÖkoInvest Rechner & Tools",
    url: abs(PFAD),
    numberOfItems: tools.length,
    itemListElement: tools.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: abs(x.href), name: x.titel, description: x.text })),
  };

  return (
    <div>
      <JsonLd daten={itemList} />

      <section aria-labelledby="hub-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/4 -z-10 h-[460px] w-[460px] rounded-full bg-navy-400/25 blur-[120px]" />

        <div className="ov-container pb-32 pt-6 sm:pt-8 md:pb-40 md:pt-10">
          <Breadcrumbs items={[{ name: t.krume }]} dark className="ov-hero-in mb-8 md:mb-12" />

          <div className="grid items-center gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12 xl:gap-x-20">
            <div className="max-w-[38rem]">
              <p
                className="ov-hero-in inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] font-medium text-white/85 ring-1 ring-inset ring-white/15"
                style={{ "--ov-delay": "40ms" }}
              >
                <span className="rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{t.kostenlos}</span>
                <span className="sm:hidden">{t.ohne}</span>
                <span className="max-sm:hidden">{t.ohneLang}</span>
              </p>
              <h1 id="hub-titel" className="ov-h1 mt-6 text-balance md:mt-8">
                <TextEnthuellung verzoegerung={80}>{t.titel.props.children}</TextEnthuellung>
              </h1>
              <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
                {t.lead(TOOLS.length)}
              </p>
              <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
                <Button href="#werkzeuge" size="lg" icon={ArrowDown} magnetisch className="w-full sm:w-auto">
                  {t.finden}
                </Button>
                <Button href="#wegweiser" size="lg" variant="outlineLight" className="w-full sm:w-auto">
                  {t.vorhaben}
                </Button>
              </div>
              <dl className="ov-hero-in mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-7 md:mt-12" style={{ "--ov-delay": "340ms" }}>
                {[
                  { value: TOOLS.length, label: t.kennzahlen[0] },
                  { value: 3, label: t.kennzahlen[1] },
                  { value: 30, suffix: t.jSuffix, label: t.kennzahlen[2] },
                ].map((x) => (
                  <div key={x.label}>
                    <dt className="sr-only">{x.label}</dt>
                    <dd className="font-display text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] font-extrabold leading-none tracking-tight text-white">
                      <CountUp value={x.value} suffix={x.suffix} />
                    </dd>
                    <dd className="mt-2 text-[13px] leading-snug text-white/65">{x.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <figure className="ov-hero-in relative max-sm:hidden sm:px-6 lg:px-0" style={{ "--ov-delay": "220ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
              <HubBuehne park={park} cashflow={cf} />
              <figcaption className="mt-6 text-center text-[12px] text-white/60 sm:mt-16 lg:text-right">
                {/* Beispielwerte der Bühne = deutsche Standardannahmen: gemeinsam mit Vermerk, in AT/CH ausdrücklich als deutsches Beispiel */}
                {!land || land === "DE" ? t.buehneGemeinsam(!land) : t.buehneLand(land)}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="werkzeuge" aria-label={t.alleAria} className="relative z-10 -mt-20 scroll-mt-20 md:-mt-28">
        <div className="ov-container">
          <div className="divide-y divide-ink-100 rounded-[2rem] bg-white px-5 shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 sm:px-6 md:px-8">
            {/* Sprungnavigation: in einem Tipp zur eigenen Zielgruppe */}
            <nav aria-label={t.zielgruppeAria} className="ov-no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 py-5 sm:mx-0 sm:flex-wrap sm:px-0">
              <span className="mr-1 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">{t.fuer}</span>
              {gruppen.map((g) => (
                <a
                  key={g.id}
                  href={`#${g.id}`}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-sand-50 px-4 text-[14px] font-semibold text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  {g.kurz}
                  <span className="ov-num rounded-full bg-white px-1.5 text-[12px] font-bold text-ink-500 ring-1 ring-ink-200/70">{g.ids.length + g.weitere.length}</span>
                </a>
              ))}
            </nav>
            {gruppen.map((g) => (
              <section key={g.id} id={g.id} aria-labelledby={`${g.id}-titel`} className="scroll-mt-28 py-8 md:py-10">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                  <h2 id={`${g.id}-titel`} className="ov-h3 text-ink-900 md:text-[26px]">
                    {g.titel}
                  </h2>
                  <p className="text-[14.5px] text-ink-500">{g.text}</p>
                </div>
                <ul className={cn("grid gap-4 lg:gap-5", g.ids.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
                  {g.ids.map((id, i) => {
                    const tool = toolById(id);
                    if (!tool) return null;
                    return (
                      <Reveal as="li" key={id} delay={i * 60} className="flex">
                        <ToolKarte tool={tool} tagText={tagText(tool.tag)} oeffnen={t.oeffnen} ton={id === "solarpark" ? "dunkel" : "hell"} gross={g.ids.length === 2}>
                          {vorschauImLand[id]}
                        </ToolKarte>
                      </Reveal>
                    );
                  })}
                </ul>
                {g.weitere.length > 0 && (
                  <ul suppressHydrationWarning className={cn("ov-reveal ov-stagger mt-4 grid gap-3 md:grid-cols-2 lg:mt-5", g.weitere.length % 3 === 0 && "lg:grid-cols-3")} aria-label={t.weitereAria(g.kurz)}>
                    {g.weitere.map((id) => {
                      const tool = toolById(id);
                      if (!tool) return null;
                      return (
                        <li key={id} className="flex">
                          <ToolZeile tool={tool} tagText={tagText(tool.tag)} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>

      <Section tone="white" space="md" id="wegweiser" className="scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <SectionHeading eyebrow={t.wegEyebrow} title={t.wegTitel} className="max-w-2xl" />
          <p className="max-w-md text-pretty text-[15.5px] leading-relaxed text-ink-600 [hyphens:manual] lg:pb-2">{t.wegText}</p>
        </div>
        <ul suppressHydrationWarning className="ov-reveal ov-stagger mt-10 grid gap-3 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
          {t.wegweiser.map(([frage, id, ergebnis]) => {
            const tool = toolById(id);
            if (!tool) return null;
            const Icon = tool.icon;
            return (
              <li key={id} className="flex">
                <Link
                  href={tool.href}
                  className="group ov-lift flex w-full flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 transition-colors hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-display text-[16.5px] font-bold leading-snug text-ink-900">{frage}</span>
                    <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-700 motion-reduce:transition-none" />
                  </span>
                  <span className="mt-auto flex items-center gap-2.5 border-t border-ink-100 pt-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ov-50 text-ov-600 ring-1 ring-ov-100 transition-colors group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-ov-700">{tool.titel}</span>
                      <span className="block truncate text-[12.5px] text-ink-500">{ergebnis}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={t.faq} />
        </div>
      </Section>

      <CtaBand eyebrow={t.cta.eyebrow} title={t.cta.title} text={t.cta.text} primary={t.cta.primary} secondary={t.cta.secondary} />
    </div>
  );
}

function ToolKarte({ tool, tagText, oeffnen, ton, gross, children }) {
  const Icon = tool.icon;
  const dunkel = ton === "dunkel";
  return (
    <Link
      href={tool.href}
      className={cn(
        "group ov-lift flex w-full flex-col rounded-3xl p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2 md:p-7",
        dunkel ? "ov-verlauf-nacht text-white ring-1 ring-white/10 shadow-kante" : "bg-sand-50 ring-1 ring-ink-200/70 hover:bg-white hover:ring-ov-300"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", dunkel ? "bg-white/10 text-ov-300 ring-1 ring-white/15" : "bg-ov-50 text-ov-600 ring-1 ring-ov-100")}>
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        {tool.tag && <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-bold", dunkel ? "bg-sun-300 text-navy-950" : TAG_TON[tool.tag] || "bg-ink-100 text-ink-700")}>{tagText}</span>}
      </div>
      <h3 className={cn("mt-5 font-display font-extrabold leading-tight tracking-tight", gross ? "text-[24px]" : "text-[20px]", dunkel ? "text-white" : "text-ink-900")}>{tool.titel}</h3>
      <p className={cn("mt-2 text-[14.5px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-600")}>{gross ? tool.text : tool.kurz}</p>
      <div className="mt-6 flex flex-1 flex-col">
        <div className={cn("flex min-h-[150px] flex-1 flex-col justify-center rounded-2xl bg-white p-4", dunkel ? "shadow-e3" : "shadow-e1 ring-1 ring-ink-200/60")}>{children}</div>
      </div>
      <span className={cn("mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold", dunkel ? "text-ov-300" : "text-ov-700")}>
        {oeffnen}
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Kompakte Tool-Zeile für weitere Werkzeuge einer Zielgruppe */
function ToolZeile({ tool, tagText }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className="group ov-lift flex w-full items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-colors hover:ring-ov-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-100 transition-colors group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-[17px] font-bold leading-snug text-ink-900">{tool.titel}</span>
          {tool.tag && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TAG_TON[tool.tag] || "bg-ink-100 text-ink-700")}>{tagText}</span>}
        </span>
        <span className="mt-1 block text-[14px] leading-relaxed text-ink-600">{tool.kurz}</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-700" />
    </Link>
  );
}

export const generateMetadata = seitenMetadata("/rechner", metadata, { en: metadataEn });

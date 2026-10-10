import Link from "@/components/Land/Link";
import { BadgePercent, Coins, FileLock2, FolderLock, Info, Map as MapIcon, Scale, Search, ShieldCheck } from "lucide-react";
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
import LeererBestand from "@/components/Boerse/Seite/LeererBestand";
import { Badge } from "@/components/Boerse/Badges";
import { rechtsrahmenFuer } from "@/lib/boerse/neutralitaet";
import { abs, SITE } from "@/data/site";
import { PROVISION, PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { backend, istDemo } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { boersePill, istDemoAnsicht, sichtbareProjekte } from "@/lib/boerse/sichtbarkeit";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

export const dynamic = "force-dynamic";

const PFAD = "/projektboerse";
const TITEL = "PV-Projektbörse DACH: Solarparks & Projektrechte | ÖkoInvest";
// „vorgeprüft“ statt „geprüft“: Das Backoffice prüft nur Vollständigkeit und Plausibilität
// (siehe FAQ), keine Due Diligence (§ 5 UWG, Paket D).
const BESCHREIBUNG =
  "Solarparks, Agri-PV, Parkplatz-PV und Großspeicher im DACH-Raum: auf Plausibilität vorgeprüfte Projekte in allen Phasen, NDA per Klick, Datenraum – für Investoren kostenfrei, der Verkäufer zahlt die Provision.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
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

// Englisch (Sprachmodell)
const SPANNE_EN = `${fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en")}–${fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en")} %`;
const PROVISION_EN = `${SPANNE_EN} of the purchase price, only on successful closing`;
const metadataEn = {
  title: "PV project exchange DACH: solar parks & project rights | ÖkoInvest",
  description: "Solar parks, agrivoltaics, car park PV and battery storage in the DACH region: projects pre-checked for plausibility at every stage, NDA in one click, data room – free of charge for investors, the seller pays the commission.",
  openGraph: {
    title: "PV project exchange DACH: solar parks & project rights | ÖkoInvest",
    description: "Solar parks, agrivoltaics, car park PV and battery storage in the DACH region: projects pre-checked for plausibility at every stage, NDA in one click, data room – free of charge for investors, the seller pays the commission.",
    images: [{ alt: "Rows of a solar park" }],
  },
};

const FAQ_EN = [
  {
    q: "What does the project exchange cost?",
    a: `For investors, the exchange is free of charge (search profile, NDA, data room). Sellers pay a success fee of ${PROVISION_EN} – no listing or posting fees.`,
  },
  {
    q: "Why can I not see the exact location?",
    a: "Publicly, we only show the region, federal state or canton and key data. Registered investors only see the municipality, plots, grid operator and documents after they have accepted the non-disclosure agreement and the back office has approved access to the data room. This protects landowners and sellers.",
  },
  {
    q: "How are projects checked?",
    a: "Before publication, the back office checks the information and core documents for completeness and plausibility – for example land securing, the status of land-use planning and the grid connection. This does not replace legal and technical due diligence, which remains the buyer's responsibility.",
  },
  {
    q: "What stages are there?",
    a: `We distinguish ${PHASEN.length} development stages – from “${BEGRIFFE_EN.phase[PHASEN[0].id]}” to “${BEGRIFFE_EN.phase[PHASEN[PHASEN.length - 1].id]}”. The further a project has been developed, the lower the risk and the higher the price per kWp.`,
  },
];

const PILL_EN = {
  Demo: () => "Demo data – fictitious example projects",
  DACH: () => "Project exchange for solar and storage",
  Live: (n) => `${n} ${n === 1 ? "project" : "projects"} – browse now`,
};

const TEXTE = {
  de: {
    fehler: "Die Projektbörse ist vorübergehend nicht erreichbar.",
    schemaName: "Projektbörse ÖkoInvest",
    brotkrumen: "Projektbörse",
    titel1: "Die Projektbörse für Solarprojekte\u00a0– ",
    titel2: "vorgeprüft und vertraulich.",
    leadStark: "Freiflächen-PV, Agri-PV, Parkplatz-PV und Großspeicher",
    lead: " in Deutschland, Österreich und der Schweiz – von der Flächensicherung bis zur Bestandsanlage. Öffentlich als anonymer Teaser, Details erst nach NDA.",
    registrieren: "Als Investor registrieren",
    anbieten: "Projekt anbieten",
    hinweis: (s) => `Für Investoren kostenfrei · Anbieter zahlen ${s} Provision, nur bei Abschluss`,
    region: "Lieber nach Region suchen?",
    karte: "Zur Kartenansicht",
    eyebrow: "Aktuelle Projekte",
    titel: "Projekte in allen Phasen",
    lead2: "Filtern Sie nach Typ, Land, Phase und Leistung – oder wechseln Sie zur Karte. Ihre Auswahl steht in der Adresse und lässt sich teilen.",
    demo: "Vorführdaten:",
    demoText: " Die Plattform läuft im Demo-Modus. Alle gezeigten Projekte sind fiktive Beispiele und keine Angebote. Kennzahlen und Karte beziehen sich nur auf diese Beispiele.",
    nichtVerfuegbar: "Projektbörse derzeit nicht verfügbar",
    zweiEyebrow: "Zwei Seiten, ein Marktplatz",
    zweiTitel: "Fair für Käufer und Verkäufer",
    nullEuro: "0\u00a0€",
    fuerInvestoren: "für Investoren",
    invTitel: "Für Investoren: kostenfrei",
    invText: "Suchprofil, Merkliste, NDA und Datenraum sind für Investoren kostenfrei. Wir finanzieren die Börse über die Provision, die der Verkäufer bei Abschluss zahlt. Sie sehen Projekte aus der Entwicklung der ÖKOVOLT Gruppe und von weiteren Entwicklern.",
    invPunkte: ["Datenraum mit Download-Protokoll", "Matching nach Suchprofil"],
    invButton: "Investorenkonto anlegen",
    nurAbschluss: "nur bei Abschluss",
    entTitel: "Für Projektentwickler: Provision nur bei Erfolg",
    entText: (p) => `Einstellen, auf Vollständigkeit und Plausibilität prüfen lassen, vertraulich vermarkten. Die Provision beträgt ${p} – keine Listungsgebühren.`,
    entPunkte: ["Transparente Statistik: Aufrufe, Merker, NDA-Anfragen", "Anonymer Teaser, Datenraum nur nach NDA"],
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Projektbörse: das Wichtigste in Kürze",
    vermarkten: "Sie möchten ein Projekt vermarkten?",
    soGehts: "So funktioniert das Anbieten",
    ctaEyebrow: "Projektbörse",
    ctaTitel: "Das passende Projekt nicht dabei?",
    ctaText: "Legen Sie ein Suchprofil an. Neue Projekte, die zu Ihren Kriterien passen, sehen Sie im Portal zuerst.",
    ctaPrimaer: "Suchprofil anlegen",
    ctaSekundaer: "Für Investoren",
    neutralEyebrow: "Neutralität",
    neutralTitel: "Neutral – auch gegenüber der eigenen Gruppe",
    neutralText: "Die ÖKOVOLT Gruppe entwickelt selbst Projekte. Deshalb trennen wir Börse und eigene Projektentwicklung, kennzeichnen jedes Inserat und geben der Gruppe kein Vorkaufsrecht.",
    neutralPunkte: ["Informationsbarriere zur eigenen Projektentwicklung", "Gleiche Informationen und Fristen für alle Interessenten", "Keine Börse im Sinne des Börsenrechts – Verträge direkt zwischen Anbieter und Käufer"],
    neutralLink: "Neutralität & Regeln",
    faqNeutralQ: "Wie neutral ist die Projektbörse?",
    faqNeutralA: "Die ÖKOVOLT Gruppe entwickelt selbst Projekte. Vertrauliche Angaben aus Fremdinseraten erhält ihre Projektentwicklung nicht, jedes Inserat ist als Gruppenprojekt oder Fremdinserat gekennzeichnet, und die Gruppe hat kein Vorkaufsrecht. Ist sie interessiert, geht sie über die Börse wie jeder Investor. Alle Regeln stehen unter „Neutralität & Regeln“.",
    faqRechtQ: "Ist die Projektbörse eine Börse im rechtlichen Sinn?",
  },
  en: {
    fehler: "The project exchange is temporarily unavailable.",
    schemaName: "ÖkoInvest project exchange",
    brotkrumen: "Project exchange",
    titel1: "The exchange for solar projects\u00a0– ",
    titel2: "pre-checked and confidential.",
    leadStark: "Ground-mounted PV, agrivoltaics, car park PV and battery storage",
    lead: " in Germany, Austria and Switzerland – from land securing to operating assets. Public as an anonymous teaser, details only after NDA.",
    registrieren: "Register as an investor",
    anbieten: "Offer a project",
    hinweis: (s) => `Free of charge for investors · sellers pay ${s} commission, only on closing`,
    region: "Prefer to search by region?",
    karte: "Go to the map view",
    eyebrow: "Current projects",
    titel: "Projects at every stage",
    lead2: "Filter by type, country, stage and capacity – or switch to the map. Your selection is stored in the address and can be shared.",
    demo: "Demo data:",
    demoText: " The platform is running in demo mode. All projects shown are fictitious examples and not offers. Figures and map relate only to these examples.",
    nichtVerfuegbar: "Project exchange currently unavailable",
    zweiEyebrow: "Two sides, one marketplace",
    zweiTitel: "Fair for buyers and sellers",
    nullEuro: "€0",
    fuerInvestoren: "for investors",
    invTitel: "For investors: free of charge",
    invText: "Search profile, watchlist, NDA and data room are free of charge for investors. We finance the exchange through the commission the seller pays on closing. You see projects developed by the ÖKOVOLT Group and by other developers.",
    invPunkte: ["Data room with download log", "Matching by search profile"],
    invButton: "Create an investor account",
    nurAbschluss: "only on closing",
    entTitel: "For project developers: commission only on success",
    entText: () => `List your project, have it checked for completeness and plausibility, market it confidentially. The commission is ${PROVISION_EN} – no listing fees.`,
    entPunkte: ["Transparent statistics: views, saves, NDA requests", "Anonymous teaser, data room only after NDA"],
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Project exchange: the essentials at a glance",
    vermarkten: "Would you like to market a project?",
    soGehts: "How offering a project works",
    ctaEyebrow: "Project exchange",
    ctaTitel: "Not found the right project?",
    ctaText: "Create a search profile. You will see new projects that match your criteria first in the portal.",
    ctaPrimaer: "Create a search profile",
    ctaSekundaer: "For investors",
    neutralEyebrow: "Neutrality",
    neutralTitel: "Neutral – even towards our own Group",
    neutralText: "The ÖKOVOLT Group develops projects itself. That is why we separate the exchange from our own project development, label every listing and give the Group no right of first refusal.",
    neutralPunkte: ["Information barrier towards our own project development", "Same information and deadlines for all interested parties", "Not an exchange under stock exchange law – contracts directly between seller and buyer"],
    neutralLink: "Neutrality & rules",
    faqNeutralQ: "How neutral is the project exchange?",
    faqNeutralA: "The ÖKOVOLT Group develops projects itself. Its project development does not receive confidential information from third-party listings, every listing is labelled as a group project or third-party listing, and the Group has no right of first refusal. If it is interested, it goes through the exchange like every investor. All rules are set out under “Neutrality & rules”.",
    faqRechtQ: "Is the project exchange an exchange in the legal sense?",
  },
};

export default async function Projektboerse({ params, searchParams }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const spanne = en ? SPANNE_EN : SPANNE;
  const sp = await searchParams;
  // Länderfassung: Filter „Land“ vorgewählt (abwählbar); ein Filter aus der URL hat Vorrang
  const start = { ...(land ? { land } : {}), ...Object.fromEntries(ERLAUBTE_FILTER.map((k) => [k, typeof sp?.[k] === "string" ? sp[k].slice(0, 20) : ""]).filter(([, v]) => v)) };

  let daten = null;
  let fehler = "";
  try {
    daten = await backend().boerse(null, {});
  } catch (e) {
    fehler = e instanceof PlattformFehler ? e.message : t.fehler;
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
  // B10 „ehrlicher Bestand“: außerhalb des Demo-Modus ohne veröffentlichte Projekte → Einladung statt leerer Liste
  const leer = !!daten && !demo && projekte.length === 0;
  // Rechtliche Einordnung je Land (Länderfassung nur ihr Land, gemeinsam DE/AT/CH beschriftet)
  const recht = rechtsrahmenFuer(land, sprache);
  const faqRecht = {
    q: t.faqRechtQ,
    a: recht.length === 1 ? `${recht[0].punkte[0]} ${recht[0].punkte[1]}` : recht.map((r) => `${r.land}: ${r.punkte[0]}`).join(" "),
  };
  const faq = [...(en ? FAQ_EN : FAQ), { q: t.faqNeutralQ, a: t.faqNeutralA }, faqRecht];
  const pillDe = boersePill(projekte, { demo });
  const pill = en ? { ...pillDe, text: PILL_EN[pillDe.marke]?.(projekte.length) ?? pillDe.text } : pillDe;

  const jsonLd = daten && {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.schemaName,
    url: abs(PFAD),
    description: en ? metadataEn.description : BESCHREIBUNG,
    inLanguage: en ? "en" : "de",
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
        breadcrumbs={[{ name: t.brotkrumen, href: PFAD }]}
        pill={{ ...pill, href: "#projekte" }}
        titel={<>{t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span></>}
        lead={<><span className="font-medium text-white">{t.leadStark}</span>{t.lead}</>}
        aktionen={[
          { label: t.registrieren, href: "/registrieren?rolle=investor" },
          { label: t.anbieten, href: "/projektboerse/anbieten" },
        ]}
        hinweis={t.hinweis(spanne)}
        unten={
          <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
            <MapIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
            <span>{t.region} <Link href="/projektboerse/karte" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">{t.karte}</Link></span>
          </p>
        }
      />
      {daten && <Marktbild projekte={projekte} kennzahlen={kz} />}

      <section id="projekte" aria-labelledby="projekte-titel" className="scroll-mt-20 bg-sand-50 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="ov-container">
          <SectionHeading className="mb-8 md:mb-10" eyebrow={t.eyebrow} title={<span id="projekte-titel">{t.titel}</span>} lead={t.lead2} />
          {demo && (
            <p className="mb-6 flex items-start gap-3 rounded-2xl bg-sun-300/25 px-5 py-4 text-[14.5px] leading-relaxed text-ink-900 ring-1 ring-inset ring-sun-400/50">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-700" />
              <span><strong>{t.demo}</strong>{t.demoText}</span>
            </p>
          )}
          {fehler ? (
            <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
              <p className="font-display text-[20px] font-bold text-ink-900">{t.nichtVerfuegbar}</p>
              <p className="mt-2 text-[15px] text-ink-600">{fehler}</p>
            </div>
          ) : leer ? (
            <LeererBestand />
          ) : (
            <BoerseListe projekte={projekte} basisHref={`${PFAD}/`} start={start} />
          )}
        </div>
      </section>

      <Ablauf />

      <Section tone="ink" space="lg">
        <SectionHeading eyebrow={t.zweiEyebrow} title={t.zweiTitel} align="center" className="mx-auto mb-12 max-w-2xl md:mb-16" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="flex flex-col rounded-[2rem] bg-white p-7 shadow-e1 ring-1 ring-ink-200/70 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span>
              <p className="text-right"><span className="ov-num block font-display text-[40px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[48px]">{t.nullEuro}</span><span className="mt-1 block text-[12.5px] text-ink-500">{t.fuerInvestoren}</span></p>
            </div>
            <h3 className="ov-h3 mt-6 text-ink-900">{t.invTitel}</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-600">{t.invText}</p>
            <ul className="mt-6 grid gap-2.5 text-[15px] text-ink-700 sm:grid-cols-2">
              <li className="flex gap-2.5"><FolderLock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> {t.invPunkte[0]}</li>
              <li className="flex gap-2.5"><Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> {t.invPunkte[1]}</li>
            </ul>
            <div className="mt-auto pt-8"><Button href="/registrieren?rolle=investor" pfeil>{t.invButton}</Button></div>
          </Reveal>
          <Reveal delay={100} className="ov-noise relative flex flex-col overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ov-500/30 blur-[90px]" />
            <div className="relative flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ov-300"><BadgePercent aria-hidden="true" className="h-6 w-6" /></span>
              <p className="text-right"><span className="ov-num block font-display text-[40px] font-extrabold leading-none tracking-tight text-white md:text-[48px]">{spanne}</span><span className="mt-1 block text-[12.5px] text-white/60">{t.nurAbschluss}</span></p>
            </div>
            <h3 className="ov-h3 relative mt-6 text-white">{t.entTitel}</h3>
            <p className="relative mt-3 text-[16px] leading-relaxed text-white/70">{t.entText(PROVISION.verkaeufer.text)}</p>
            <ul className="relative mt-6 grid gap-2.5 text-[15px] text-white/80 sm:grid-cols-2">
              <li className="flex gap-2.5"><Coins aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> {t.entPunkte[0]}</li>
              <li className="flex gap-2.5"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> {t.entPunkte[1]}</li>
            </ul>
            <div className="relative mt-auto pt-8"><Button href="/projektboerse/anbieten" variant="white" pfeil>{t.anbieten}</Button></div>
          </Reveal>
        </div>
        {/* Welle 3, B10: Neutralitätsversprechen sichtbar, Details auf /projektboerse/neutralitaet */}
        <Reveal className="mt-5 grid gap-6 rounded-[2rem] bg-white p-7 shadow-e1 ring-1 ring-ink-200/70 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-12">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">{t.neutralEyebrow}</p>
            <h3 className="ov-h3 mt-3 text-ink-900">{t.neutralTitel}</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-600">{t.neutralText}</p>
            <div className="mt-5 flex flex-wrap gap-1.5" aria-hidden="true">
              <Badge id="gruppenprojekt" />
              <Badge id="fremdinserat" />
              <Badge id="vorgeprueft" />
            </div>
          </div>
          <div className="min-w-0">
            <ul className="grid gap-3">
              {t.neutralPunkte.map((x, i) => {
                const Icon = [FileLock2, ShieldCheck, Scale][i];
                return (
                  <li key={x} className="flex gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-[15px] leading-snug text-ink-700 ring-1 ring-ink-200/60">
                    <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                    {x}
                  </li>
                );
              })}
            </ul>
            <Button href="/projektboerse/neutralitaet" variant="secondary" pfeil className="mt-5">{t.neutralLink}</Button>
          </div>
        </Reveal>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} />
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-600">{t.vermarkten} <Link href="/projektboerse/anbieten" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:text-ov-800">{t.soGehts}</Link></p>
          </div>
          <Faq items={faq} />
        </div>
      </Section>

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.ctaPrimaer, href: "/registrieren?rolle=investor" }}
        secondary={{ label: t.ctaSekundaer, href: "/investoren" }}
      />
    </>
  );
}

export const generateMetadata = seitenMetadata("/projektboerse", metadata, { en: metadataEn });

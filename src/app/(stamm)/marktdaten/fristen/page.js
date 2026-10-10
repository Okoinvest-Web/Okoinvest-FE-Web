// marktdaten/fristen/page.js – Fristen und Preisbestandteile je Land aus dem Faktenregister (Welle 2, Paket FRI)
//
// Schlichte Übersicht: Termine (FristenListe) sowie Umlagen und Netzentgelte (BestandteileTabelle)
// für Deutschland, Österreich und die Schweiz. Daten: src/lib/fakten/daten/termine-2026.js,
// umlagen-2027.js, netzentgelte-2027.js – nichts davon steht in dieser Datei.
// noindex bis zur Fachfreigabe (zweite Prüfperson E6) und Prüfung Rechtsabteilung.
// Keine Countdowns, kein Angebot, keine Pressearbeit. Land ist Parameter der Bausteine –
// beim Länderrouting (/de, /at, /ch) wird je Land nur der passende Abschnitt übernommen.

import { CalendarDays, Scale } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Reveal from "@/components/ui/Reveal";
import FristenListe from "@/components/Fakten/FristenListe";
import BestandteileTabelle from "@/components/Fakten/BestandteileTabelle";
import { abs } from "@/data/site";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

// Ablauf wirkt ohne neuen Build: Seite wird höchstens stündlich neu erzeugt.
export const revalidate = 3600;

const PFAD = pfad("/marktdaten/fristen");

const metadata = {
  title: "Fristen und Preisbestandteile DACH | ÖkoInvest",
  description: "Förder- und Gebotsfristen 2026 sowie Umlagen und Netzentgelte 2027 für Deutschland, Österreich und die Schweiz – mit Quelle, Stand und Ablauf.",
  alternates: { canonical: abs(PFAD) },
  // Prüfung Rechtsabteilung + Fachfreigabe (E6) ausstehend → nicht indexieren
  robots: { index: false, follow: true },
};

const metadataEn = {
  title: "Deadlines and price components DACH | ÖkoInvest",
  description: "Funding and bidding deadlines 2026 and levies and network charges 2027 for Germany, Austria and Switzerland – with source, status and expiry.",
};

const LAENDER_EN = {
  DE: {
    name: "Germany",
    lead: "Bidding date of the EEG tender and publication dates for network charges and levies 2027. We only describe the structure of network charges – the values are in your network operator's price sheet.",
  },
  AT: {
    name: "Austria",
    lead: "Funding call for investment grants, bidding date for the EAG market premium and the status of the new system usage charges (Systemnutzungsentgelte) from 2027.",
  },
  CH: {
    name: "Switzerland",
    lead: "Pronovo auction round, deadline for market access and a link to ElCom's official 2027 electricity tariffs.",
  },
};

const TEXTE = {
  de: {
    wissen: "Wissen",
    marktdaten: "Marktdaten",
    fristen: "Fristen",
    eyebrow: "Marktdaten · Fristen und Preisbestandteile",
    titel: "Fristen 2026, Umlagen und Netzentgelte 2027",
    lead1: "Befristete Förder- und Gebotstermine sowie die amtlichen Preisbestandteile für 2027 – je Land, mit Quelle, Abrufdatum und Prüfstand.",
    lead2: "Abgelaufene Termine blenden wir aus. Werte, die noch nicht veröffentlicht sind, kennzeichnen wir als offen und schätzen sie nicht.",
    entwurf: "Entwurf · Prüfung Rechtsabteilung",
    zweit: "Fachliche Zweitprüfung ausstehend · keine Rechtsberatung",
    nav: "Länder auf dieser Seite",
    abschnitt: (l) => `Fristen und Preisbestandteile ${l}`,
    termine: "Termine",
    bestand: "Umlagen und Netzentgelte 2027",
    beschriftung: (n) => `Umlagen und Netzentgelte 2027, ${n}`,
    fuss: "Alle Angaben stammen aus amtlichen Quellen und sind je Eintrag mit Abrufdatum verlinkt. „Am Original geprüft“ heißt: Der Wortlaut wurde an der verlinkten Quelle nachgelesen; die fachliche Zweitprüfung steht noch aus. Maßgeblich ist immer die verlinkte Quelle in ihrer aktuellen Fassung.",
  },
  en: {
    wissen: "Knowledge",
    marktdaten: "Market data",
    fristen: "Deadlines",
    eyebrow: "Market data · deadlines and price components",
    titel: "Deadlines 2026, levies and network charges 2027",
    lead1: "Time-limited funding and bidding dates and the official price components for 2027 – per country, with source, retrieval date and review status.",
    lead2: "We hide dates that have passed. Values that have not yet been published are marked as open; we do not estimate them.",
    entwurf: "Draft · legal review",
    zweit: "Second specialist review pending · not legal advice",
    nav: "Countries on this page",
    abschnitt: (l) => `Deadlines and price components ${l}`,
    termine: "Dates",
    bestand: "Levies and network charges 2027",
    beschriftung: (n) => `Levies and network charges 2027, ${n}`,
    fuss: "All information comes from official sources and is linked per entry with its retrieval date. “Checked against the original” means the wording was verified at the linked source; the second specialist review is still pending. The linked source in its current version is always authoritative. Most sources are available in German only.",
  },
};

const LAENDER = [
  {
    land: "DE",
    id: "deutschland",
    name: "Deutschland",
    lead: "Gebotstermin der EEG-Ausschreibung sowie Veröffentlichungstermine für Netzentgelte und Umlagen 2027. Netzentgelte nennen wir nur in ihrem Aufbau – die Werte stehen im Preisblatt Ihres Netzbetreibers.",
  },
  {
    land: "AT",
    id: "oesterreich",
    name: "Österreich",
    lead: "Fördercall für Investitionszuschüsse, Gebotstermin der EAG-Marktprämie und der Stand zu den neuen Systemnutzungsentgelten ab 2027.",
  },
  {
    land: "CH",
    id: "schweiz",
    name: "Schweiz",
    lead: "Pronovo-Auktionsrunde, Frist für den Marktzugang und der Verweis auf die amtlichen Stromtarife 2027 der ElCom.",
  },
];

export default async function FristenSeite({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = TEXTE[sprache] || TEXTE.de;
  const laender = en ? LAENDER.map((l) => ({ ...l, ...LAENDER_EN[l.land] })) : LAENDER;
  const heute = new Date();
  return chBaum(
    <>
      <Section tone="sand" space="none" className="pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: t.wissen, href: "/ratgeber" }, { name: t.marktdaten, href: pfad("/marktdaten") }, { name: t.fristen }]} className="mb-8 md:mb-12" />
        <div className="max-w-3xl">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="ov-h1 mt-4 text-balance text-ink-900">{t.titel}</h1>
          <p className="ov-lead mt-5 text-pretty text-ink-600">
            {t.lead1} {t.lead2}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">
              <Scale aria-hidden="true" className="h-3.5 w-3.5" />
              {t.entwurf}
            </span>
            <span className="text-[13px] text-ink-500">{t.zweit}</span>
          </div>
          <nav aria-label={t.nav} className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {laender.map((l) => (
                <li key={l.land}>
                  <a
                    href={`#${l.id}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-[14.5px] font-semibold text-ink-800 ring-1 ring-ink-200/70 transition-colors hover:text-navy-700 hover:ring-navy-200"
                  >
                    <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">{l.land}</span>
                    {l.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Section>

      {laender.map((l, i) => (
        <Section key={l.land} tone={i % 2 === 0 ? "white" : "sand"} space="md" id={l.id} className="scroll-mt-24" aria-labelledby={`${l.id}-titel`}>
          <SectionHeading eyebrow={l.name} title={<span id={`${l.id}-titel`}>{t.abschnitt(l.land)}</span>} lead={l.lead} className="mb-10" />
          <Reveal>
            <h3 className="mb-4 inline-flex items-center gap-2 font-display text-[19px] font-bold text-ink-900">
              <CalendarDays aria-hidden="true" className="h-5 w-5 text-ov-600" />
              {t.termine}
            </h3>
            <FristenListe land={l.land} heute={heute} sprache={sprache} />
          </Reveal>
          <Reveal className="mt-12">
            <h3 className="mb-4 font-display text-[19px] font-bold text-ink-900">{t.bestand}</h3>
            <BestandteileTabelle land={l.land} heute={heute} beschriftung={t.beschriftung(l.name)} sprache={sprache} />
          </Reveal>
        </Section>
      ))}

      <Section tone="white" space="sm">
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-500">
          {t.fuss}
        </p>
      </Section>
    </>
  );
}

export const generateMetadata = seitenMetadata("/marktdaten/fristen", metadata, { en: metadataEn });

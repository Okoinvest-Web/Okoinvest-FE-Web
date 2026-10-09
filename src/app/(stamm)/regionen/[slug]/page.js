// src/app/regionen/[slug]/page.js – Regionalseite „Solarpark & Agri-PV in <Region>“
//
// Inhalte je Region: src/data/regionen/<slug>.js (recherchiert, mit Quellen).
// Kennzahlen: src/components/Region/rechnung.js auf Basis von src/lib/invest/markt.js.

import Link from "@/components/Land/Link";
import { notFound } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, Compass, Landmark, LayoutDashboard, MapPinned, Mountain, PlugZap, Sprout, XCircle,
} from "lucide-react";

import Hero from "@/components/Boerse/Seite/Hero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import RegionKarte from "@/components/Region/RegionKarte";
import RegionKennzahlen from "@/components/Region/RegionKennzahlen";
import RegionBuehne from "@/components/Region/RegionBuehne";
import RegionSchritte from "@/components/Region/RegionSchritte";
import QuelleLink from "@/components/Region/QuelleLink";
import Fett, { ohneFett } from "@/components/Region/Fett";
import { landFuer } from "@/components/Region/laender";
import { BEISPIEL_HA, kennzahlen } from "@/components/Region/rechnung";
import { nachbarnInSprache, regionFuer, regionFuerSprache } from "@/data/regionen";
import { abs } from "@/data/site";
import { PACHT, STAND } from "@/lib/invest/markt";
import { grundstueck } from "@/lib/anfrage/laender";
import JsonLd from "@/components/JsonLd";
import { LAENDER, REGION_LAND, linkFuer, pfad as seitenPfad, regionSchluessel } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { datumText, fmtZahl } from "@/lib/sprache/format";
import { fakt } from "@/lib/fakten";
import { faktEn, quelleTitelEn } from "@/lib/sprache/faktenEn";

/* Sprachmodell: befristete Fristen-Einträge (src/data/regionen/fristen.js) stammen aus dem Faktenregister;
   englisch über FAKTEN_EN (src/lib/sprache/faktenEn.js) – erkannt am deutschen Titel des Termin-Fakts. */
const FRISTEN_IDS = [["termin.eag.investitionszuschussCall3", "AT"], ["termin.pronovo.auktionRunde4", "CH"]];
function fristEn(p) {
  for (const [id, land] of FRISTEN_IDS) {
    const f = fakt(id, land);
    if (f?.wert?.titel && f.wert.titel === p.titel) {
      return { ...p, titel: faktEn(id, "titel") ?? p.titel, text: faktEn(id, "text") ?? p.text, quelle: p.quelle ? { ...p.quelle, titel: quelleTitelEn(p.quelle) } : p.quelle };
    }
  }
  return p;
}

export const dynamicParams = false;

// Alle Regionen – gemeinsam wie vor Welle 2 und in jeder Länderfassung (Ländermodell)
export function generateStaticParams() {
  return Object.keys(REGION_LAND).map((slug) => ({ slug }));
}

const schluesselAus = ({ slug }) => regionSchluessel(slug);

async function basisMetadata(land, { slug, sprache }) {
  const en = sprache === "en";
  const r = regionFuerSprache(slug, en ? "en" : "de");
  if (!r) return {};
  if (en) {
    return {
      title: r.seoTitel,
      description: r.beschreibung,
      openGraph: {
        type: "website",
        siteName: "ÖkoInvest",
        title: r.seoTitel,
        description: r.beschreibung,
        images: [{ url: abs(r.bild), width: 1280, height: 852, alt: `Solar park and agrivoltaics ${r.inName}` }],
      },
    };
  }
  return {
    title: r.seoTitel,
    description: r.beschreibung,
    openGraph: {
      type: "website",
      siteName: "ÖkoInvest",
      title: r.seoTitel,
      description: r.beschreibung,
      images: [{ url: abs(r.bild), width: 1280, height: 852, alt: `Solarpark und Agri-PV ${r.inName}` }],
    },
  };
}

export const generateMetadata = seitenMetadata(schluesselAus, basisMetadata);

/* Sprachmodell: feste Texte der Regionalseite je Sprache (Inhalte der Region: src/data/regionen/en/) */
const T = {
  de: {
    titelZeile: (r) => `Solarpark & Agri-PV ${r.inName}`,
    serviceType: "Projektentwicklung und Flächenpacht für Freiflächen-Photovoltaik und Agri-PV",
    audience: "Flächeneigentümer und Landwirte",
    schweizLand: "Schweiz",
    regionen: "Regionen",
    pillCh: "Schweiz · Bund und Kantone",
    pill: (landName, r) => `${landName} · ${r.name} · Stand ${STAND}`,
    praep: /^(mit|zwischen|vom|nur|im|in)\b/,
    flaecheAktion: "Fläche prüfen lassen", pacht: "Pacht berechnen", regionenIn: (land) => `Regionen ${LAENDER[land].inLand}`,
    hinweis: "Prüfung und Vertrag kostenfrei · persönliche Rückmeldung",
    versprechen: (k, r, landName, f) => [`Ertrag rund ${f(k.ertrag)} kWh/kWp`, r.netz?.uenb?.length ? `Übertragungsnetz: ${r.netz.uenb.join(", ")}` : `${landName}`, "Prüfung & Vertrag kostenfrei", "Status jederzeit im Portal"],
    bildunterschrift: `Orientierungswerte: PVGIS und Marktannahmen, Stand ${STAND}`,
    kennzahlen: (r) => `Kennzahlen ${r.inName}`,
    ausgangslage: "Ausgangslage", freiflaeche: (r) => `Freiflächen-PV ${r.inName}`, eckdaten: (r) => `Eckdaten ${r.name}`, inZahlen: (r) => `${r.name} in Zahlen`,
    bundesstadt: "Bundesstadt", hauptstadt: "Landeshauptstadt", flaeche: "Fläche", lf: (j) => `Landwirtschaftlich genutzt${j ? ` (${j})` : ""}`, acker: "davon Ackerland", einwohner: "Einwohner", solarertrag: "Solarertrag",
    recht: "Recht & Planung", rechtTitel: (r) => `Was ${r.inName} gilt`,
    rechtLead: (r) => `Die wichtigsten Regeln für Solarparks und Agri-PV ${r.inName} – recherchiert mit Quellen, Stand ${STAND}. Maßgeblich ist immer die aktuelle Fassung; wir prüfen Ihre Fläche im Einzelfall.`,
    kulisse: "Flächenkulisse", kulisseTitel: (r) => `Welche Flächen ${r.inName} infrage kommen`, gut: "Eher gut geeignet", schwierig: "Eher schwierig",
    ablauf: "Ablauf vor Ort", ablaufTitel: (r) => `Vom Acker zum Solarpark ${r.inName}`, entscheidet: "Wer entscheidet",
    agriTitel: (r) => `Agri-PV ${r.inName}: Strom und Landwirtschaft auf einer Fläche`, agriUeberblick: "Agri-PV im Überblick", agriRechner: "Agri-PV-Rechner",
    agriPacht: (f) => <>Agri-PV-Pacht liegt meist niedriger als bei Freiflächen-PV, dafür bleibt die Bewirtschaftung beim Landwirt{f}</>,
    agriPachtZahl: (k, e) => <>: bei {BEISPIEL_HA} ha etwa {e(k.agriPacht.min)}–{e(k.agriPacht.max)} im Jahr (Orientierung).</>,
    vorOrt: "Vor Ort", netzTitel: (r) => `Netz und Besonderheiten ${r.inName}`, stromnetz: "Stromnetz", uenb: "Übertragungsnetz", vnb: "Große Verteilnetzbetreiber",
    netzText: "Welcher Netzbetreiber für Ihre Fläche zuständig ist und wo Kapazität frei ist, klären wir mit der Netzanfrage – oft entscheidet sie über die Parkgröße.",
    quelle: "Quelle", neuesFenster: " (öffnet neues Fenster)",
    pachtIn: (r) => `Pacht ${r.inName}`, pachtGesperrt: (k) => `Pachtwerte: Rechenlogik für ${k.land === "CH" ? "die Schweiz" : "Österreich"} in Vorbereitung`,
    spanne: (k, f) => `${f(k.spanne.min)}–${f(k.spanne.max)} €/ha·a`,
    spanneAria: (k, f, p) => `Spanne ${f(k.spanne.min)} bis ${f(k.spanne.max)} Euro innerhalb der DACH-Spanne ${f(p.min)} bis ${f(p.max)} Euro`,
    eur: (v) => `${v} €`, dach: "DACH-Spanne",
    kantone: "Kantone", kantoneTitel: "Wie die Kantone Freiflächen-PV handhaben", kantoneLead: "Raumplanung und Bewilligung liegen in der Schweiz weitgehend bei den Kantonen. Eine grobe Übersicht – ohne Anspruch auf Vollständigkeit.",
    faq: "Häufige Fragen", faqTitel: (r) => `Solarpark ${r.inName}: Fragen von Flächeneigentümern`, faqLead: "Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich.",
    kostenlos: "Kostenlos & unverbindlich", meldenTitel: (r) => `Fläche ${r.inName} melden`,
    meldenLead: (r, g) => `Nennen Sie uns Gemeinde, Größe und – wenn zur Hand – die ${g}. Wir prüfen Planungsrecht, Netz und Einstrahlung Ihrer Fläche ${r.inName} am Kartentisch und melden uns persönlich.`,
    portalTitel: "Status Ihrer Fläche im Portal", portalText: "Prüfergebnis, Angebot, Vertragsentwürfe und Meilensteine an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.", zugang: "Zugang anlegen",
    formTitel: (r) => `Ihre Fläche ${r.inName}`, formText: "Bitte in der Nachricht ungefähre Größe, aktuelle Nutzung und – falls zur Hand – Gemarkung und Flurstücke angeben.", formButton: "Fläche melden",
    quellen: (n) => `Quellen und Stand der Recherche (${n})`, stand: (s) => ` · Stand ${s}`, gewaehr: "Alle Angaben ohne Gewähr und ohne Rechtsberatung. Gesetze, Verordnungen und Pläne ändern sich; maßgeblich ist die jeweils geltende Fassung.",
    weitere: "Weitere Regionen", rundCh: "Rund um die Schweiz", rund: (r) => `Rund um ${r.name}`, solarpark: (n) => `Solarpark ${n}`, alle: "Alle Regionen in Deutschland, Österreich und der Schweiz", karte: (r) => `Karte: ${r.name} und Nachbarregionen`,
    qvCheck: "Flächencheck", qvCheckText: (r) => `Ampel, Leistung und Pachtspanne Ihrer Fläche ${r.inName} in zwei Minuten.`, qvPacht: "Pachtrechner", qvPachtText: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre im Vergleich.",
    qvVerpachten: "Fläche verpachten", qvVerpachtenText: "Pachtmodelle, Vertrag, Rückbausicherheit und der Weg zur ersten Pacht.",
    ctaEyebrow: "Für Flächeneigentümer kostenfrei", ctaTitel: (r) => `Was ist Ihre Fläche ${r.inName} als Solarpark wert?`,
    ctaText: "Zwei Minuten im Flächencheck – mit Ampel, möglicher Leistung und Pachtspanne. Das Ergebnis landet auf Wunsch direkt bei unserem Flächenteam.", ctaPrimary: "Zum Flächencheck",
  },
  en: {
    titelZeile: (r) => `Solar park & agrivoltaics ${r.inName}`,
    serviceType: "Project development and land leasing for ground-mounted photovoltaics and agrivoltaics",
    audience: "Landowners and farmers",
    schweizLand: "Switzerland",
    regionen: "Regions",
    pillCh: "Switzerland · federal and cantonal level",
    pill: (landName, r) => `${landName} · ${r.name} · as of ${datumText(STAND, "en")}`,
    praep: /^(with|between|from|only|in)\b/,
    flaecheAktion: "Have your land checked", pacht: "Calculate lease", regionenIn: (land) => `Regions ${LAENDER[land].en.inLand}`,
    hinweis: "Assessment and contract free of charge · personal response",
    versprechen: (k, r, landName, f) => [`Yield around ${f(k.ertrag)} kWh/kWp`, r.netz?.uenb?.length ? `Transmission grid: ${r.netz.uenb.join(", ")}` : `${landName}`, "Assessment & contract free of charge", "Status in the portal at any time"],
    bildunterschrift: `Indicative values: PVGIS and market assumptions, as of ${datumText(STAND, "en")}`,
    kennzahlen: (r) => `Key figures ${r.inName}`,
    ausgangslage: "Starting point", freiflaeche: (r) => `Ground-mounted PV ${r.inName}`, eckdaten: (r) => `Key data ${r.name}`, inZahlen: (r) => `${r.name} in figures`,
    bundesstadt: "Federal city", hauptstadt: "State capital", flaeche: "Area", lf: (j) => `Agricultural land${j ? ` (${j})` : ""}`, acker: "of which arable land", einwohner: "Population", solarertrag: "Solar yield",
    recht: "Law & planning", rechtTitel: (r) => `What applies ${r.inName}`,
    rechtLead: (r) => `The key rules for solar parks and agrivoltaics ${r.inName} – researched with sources, as of ${datumText(STAND, "en")}. The current version always applies; we check your land case by case.`,
    kulisse: "Eligible land", kulisseTitel: (r) => `Which land is suitable ${r.inName}`, gut: "Rather well suited", schwierig: "Rather difficult",
    ablauf: "Process on the ground", ablaufTitel: (r) => `From field to solar park ${r.inName}`, entscheidet: "Who decides",
    agriTitel: (r) => `Agrivoltaics ${r.inName}: power and farming on the same land`, agriUeberblick: "Agrivoltaics at a glance", agriRechner: "Agrivoltaics calculator",
    agriPacht: (f) => <>Agrivoltaics lease is usually lower than for ground-mounted PV, but the farmer keeps farming the land{f}</>,
    agriPachtZahl: (k, e) => <>: for {BEISPIEL_HA} ha around {e(k.agriPacht.min)}–{e(k.agriPacht.max)} per year (indicative).</>,
    vorOrt: "On the ground", netzTitel: (r) => `Grid and special features ${r.inName}`, stromnetz: "Power grid", uenb: "Transmission grid", vnb: "Major distribution system operators",
    netzText: "Which grid operator is responsible for your land and where capacity is available, we clarify with the grid enquiry – it often decides the size of the park.",
    quelle: "Source", neuesFenster: " (opens in a new window)",
    pachtIn: (r) => `Lease ${r.inName}`, pachtGesperrt: (k) => `Lease values: calculation logic for ${k.land === "CH" ? "Switzerland" : "Austria"} in preparation`,
    spanne: (k, f) => `€${f(k.spanne.min)}–${f(k.spanne.max)}/ha·yr`,
    spanneAria: (k, f, p) => `Range ${f(k.spanne.min)} to ${f(k.spanne.max)} euros within the DACH range of ${f(p.min)} to ${f(p.max)} euros`,
    eur: (v) => `€${v}`, dach: "DACH range",
    kantone: "Cantons", kantoneTitel: "How the cantons handle ground-mounted PV", kantoneLead: "In Switzerland, spatial planning and permits are largely the responsibility of the cantons. A rough overview – without any claim to completeness.",
    faq: "Frequently asked questions", faqTitel: (r) => `Solar park ${r.inName}: questions from landowners`, faqLead: "Your question is not listed? Ask it in the form – we will answer personally.",
    kostenlos: "Free of charge & without obligation", meldenTitel: (r) => `Register your land ${r.inName}`,
    meldenLead: (r, g) => `Tell us the municipality, the size and – if you have them to hand – the ${g}. We check planning law, grid and irradiation for your land ${r.inName} at the map table and get back to you personally.`,
    portalTitel: "Status of your land in the portal", portalText: "Assessment result, offer, draft contracts and milestones in one place. Register with the same email address and your enquiry will appear automatically.", zugang: "Create an account",
    formTitel: (r) => `Your land ${r.inName}`, formText: "Please state the approximate size, current use and – if you have them to hand – the cadastral district and plot numbers in your message.", formButton: "Register land",
    quellen: (n) => `Sources and research status (${n})`, stand: (s) => ` · as of ${s}`, gewaehr: "All information without guarantee and without legal advice. Laws, ordinances and plans change; the version in force at the time applies. Most sources are official documents in German, cited under their original titles.",
    weitere: "More regions", rundCh: "Around Switzerland", rund: (r) => `Around ${r.name}`, solarpark: (n) => `Solar park ${n}`, alle: "All regions in Germany, Austria and Switzerland", karte: (r) => `Map: ${r.name} and neighbouring regions`,
    qvCheck: "Land check", qvCheckText: (r) => `Traffic light, capacity and lease range for your land ${r.inName} in two minutes.`, qvPacht: "Lease calculator", qvPachtText: "Fixed lease, indexed or revenue share over 30 years compared.",
    qvVerpachten: "Lease your land", qvVerpachtenText: "Lease models, contract, decommissioning security and the path to the first lease payment.",
    ctaEyebrow: "Free of charge for landowners", ctaTitel: (r) => `What is your land ${r.inName} worth as a solar park?`,
    ctaText: "Two minutes in the land check – with a traffic light, possible capacity and lease range. If you wish, the result goes straight to our land team.", ctaPrimary: "To the land check",
  },
};
/** Grundstücksbegriff des Landes (Mehrzahl) auf Englisch */
const GRUNDSTUECK_EN = { DE: "cadastral plot numbers (Flurstücke)", AT: "plot numbers (Grundstücksnummern)", CH: "plot numbers (Parzellen)" };

export default async function RegionSeite({ params }) {
  const { slug } = await params;
  if (!regionFuer(slug)) notFound();
  // Land der Seite (null = gemeinsam); der Inhalt richtet sich nach dem Land der Region
  const zonenLand = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = T[en ? "en" : "de"];
  // Sprachmodell: Region in der Sprache der Seite (englische Inhalte aus src/data/regionen/en/)
  const r = regionFuerSprache(slug, sprache);
  const fmt = (n, s = 0) => fmtZahl(n, s, sprache);
  const fmtEur = (n) => t.eur(fmtZahl(Math.round(n), 0, sprache));
  const zahl = (n) => (typeof n === "number" ? fmt(n) : n);
  const schluessel = schluesselAus({ slug });
  const lp = (k) => seitenPfad(k, zonenLand);
  const link = (k, label) => linkFuer(k, zonenLand, label);

  const land = landFuer(r.land, sprache);
  const k = kennzahlen(r, r);
  const umgebung = nachbarnInSprache(regionFuer(slug), sprache);
  const url = abs(seitenPfad(schluessel, zonenLand));
  const e = r.eckdaten || {};
  const titelZeile = t.titelZeile(r);

  const areaServed =
    r.land === "CH"
      ? { "@type": "Country", name: t.schweizLand }
      : { "@type": "State", name: r.name, containedInPlace: { "@type": "Country", name: land.name } };

  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: titelZeile,
          serviceType: t.serviceType,
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed,
          audience: { "@type": "Audience", audienceType: t.audience },
          url,
          description: r.beschreibung,
        }}
      />

      <Hero
        breadcrumbs={[{ name: t.regionen, href: lp("/regionen") }, { name: r.name }]}
        pill={{ marke: r.land === "CH" ? "CH" : r.land, text: r.land === "CH" ? t.pillCh : t.pill(land.name, r), href: "#ausgangslage" }}
        titel={
          en ? (
            <>
              Solar park & <span className="whitespace-nowrap">agrivoltaics</span> {r.inName}
              {t.praep.test(r.akzent || "") ? " " : ": "}
              <span className="ov-text-gradient-light">{r.akzent}</span>
            </>
          ) : (
          <>
            Solarpark & <span className="whitespace-nowrap">Agri-PV</span> {r.inName}
            {t.praep.test(r.akzent || "") ? " " : ": "}
            <span className="ov-text-gradient-light">{r.akzent}</span>
          </>
          )
        }
        lead={r.lead}
        aktionen={[
          { label: t.flaecheAktion, href: "#anfrage" },
          !zonenLand || zonenLand === "DE" ? link("/rechner/pacht", t.pacht) : { label: t.regionenIn(zonenLand), href: lp("/regionen") },
        ]}
        hinweis={t.hinweis}
        versprechen={t.versprechen(k, r, land.name, fmt)}
        buehne={<RegionBuehne region={r} k={k} />}
        bildunterschrift={t.bildunterschrift}
      />

      {/* Kennzahlen */}
      <section aria-label={t.kennzahlen(r)} className="relative z-10 -mt-12 bg-transparent md:-mt-16">
        <div className="ov-container">
          <h2 className="sr-only">{t.kennzahlen(r)}</h2>
          <RegionKennzahlen region={r} k={k} />
        </div>
      </section>

      {/* Ausgangslage */}
      <Section tone="white" space="md" id="ausgangslage" className="scroll-mt-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.ausgangslage} title={t.freiflaeche(r)} />
            <div className="mt-6 space-y-4 text-[16.5px] leading-relaxed text-ink-700">
              {r.einleitung?.map((p, i) => (
                <p key={i}>
                  <Fett>{p}</Fett>
                </p>
              ))}
            </div>
          </div>
          <Reveal as="aside" className="self-start rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7" aria-label={t.eckdaten(r)}>
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
              <MapPinned aria-hidden="true" className="h-4 w-4" />
              {t.inZahlen(r)}
            </p>
            <dl className="mt-4 divide-y divide-ink-200/70 text-[15px]">
              {e.hauptstadt && !["berlin", "hamburg", "bremen", "wien"].includes(r.slug) && <Zeile l={r.land === "CH" ? t.bundesstadt : t.hauptstadt} v={e.hauptstadt} />}
              {e.flaecheKm2 && <Zeile l={t.flaeche} v={`${zahl(e.flaecheKm2)} km²`} />}
              {e.lfHa && <Zeile l={t.lf(e.lfJahr)} v={`${zahl(e.lfHa)} ha`} />}
              {e.ackerHa && <Zeile l={t.acker} v={`${zahl(e.ackerHa)} ha`} />}
              {e.einwohner && <Zeile l={t.einwohner} v={zahl(e.einwohner)} />}
              <Zeile l={t.solarertrag} v={`${fmt(k.ertrag)} kWh/kWp`} />
            </dl>
            {e.quelle && <QuelleLink quelle={e.quelle} className="mt-4" />}
            {r.ertrag?.hinweis && <p className="mt-4 border-t border-ink-200/70 pt-4 text-[13.5px] leading-relaxed text-ink-600">{r.ertrag.hinweis}</p>}
          </Reveal>
        </div>
      </Section>

      {/* Recht & Planung */}
      {r.recht?.length > 0 && (
        <Section tone="sand" space="lg">
          <SectionHeading
            eyebrow={t.recht}
            title={t.rechtTitel(r)}
            lead={t.rechtLead(r)}
            className="mb-12"
          />
          <ul className="grid gap-4 md:grid-cols-2">
            {(en ? r.recht.map(fristEn) : r.recht).map((p, i) => (
              <Reveal as="li" key={i} delay={(i % 4) * 60} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/60 md:p-7">
                <div className="flex items-start gap-3">
                  <Landmark aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
                  <h3 className="font-display text-[17.5px] font-bold leading-snug text-ink-900">{p.titel}</h3>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                  <Fett>{p.text}</Fett>
                </p>
                {p.quelle && <QuelleLink quelle={p.quelle} className="mt-auto pt-4" />}
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {/* Flächenkulisse */}
      {r.kulisse && (
        <Section tone="white" space="lg">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow={t.kulisse} title={t.kulisseTitel(r)}>
              {r.kulisse.text && (
                <p className="mt-5 text-[16.5px] leading-relaxed text-ink-700">
                  <Fett>{r.kulisse.text}</Fett>
                </p>
              )}
            </SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              <Liste titel={t.gut} icon={CheckCircle2} ton="gut" punkte={r.kulisse.gut} />
              <Liste titel={t.schwierig} icon={XCircle} ton="schwierig" punkte={r.kulisse.schwierig} />
            </div>
          </div>
        </Section>
      )}

      {/* Ablauf & Behörden */}
      <Section tone="green" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.ablauf} title={t.ablaufTitel(r)} />
            {r.ablauf?.text && (
              <p className="mt-6 text-[16.5px] leading-relaxed text-ink-700">
                <Fett>{r.ablauf.text}</Fett>
              </p>
            )}
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">{land.schritteHinweis}</p>
          </div>
          {r.ablauf?.behoerden?.length > 0 && (
            <Reveal className="self-start rounded-3xl bg-white p-6 ring-1 ring-ov-100 md:p-7">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                <Building2 aria-hidden="true" className="h-4 w-4" />
                {t.entscheidet}
              </p>
              <ul className="mt-4 space-y-4">
                {r.ablauf.behoerden.map((b, i) => (
                  <li key={i}>
                    <p className="font-semibold text-ink-900">{b.name}</p>
                    <p className="mt-0.5 text-[14.5px] leading-relaxed text-ink-600">{b.rolle}</p>
                    {b.url && <QuelleLink quelle={{ url: b.url, titel: b.name }} className="mt-1" />}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
        <div className="mt-16">
          <RegionSchritte items={land.schritte} />
        </div>
      </Section>

      {/* Agri-PV */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow={en ? "Agrivoltaics" : "Agri-PV"} title={t.agriTitel(r)} />
            <div className="mt-6 space-y-4 text-[16.5px] leading-relaxed text-ink-700">
              {r.agri?.map((p, i) => (
                <p key={i}>
                  <Fett>{p}</Fett>
                </p>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              <Link href={lp("/agri-pv")} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
                {link("/agri-pv", t.agriUeberblick).label} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href={lp("/rechner/agri-pv")} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
                {link("/rechner/agri-pv", t.agriRechner).label} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid content-start gap-4">
            {land.agri.map((a, i) => (
              <Reveal key={i} delay={i * 60} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                  <Sprout aria-hidden="true" className="h-4 w-4" />
                  {a.t} · {land.name}
                </p>
                <p className="ov-num mt-2 font-display text-[22px] font-extrabold tracking-tight text-ink-900">{a.k}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{a.x}</p>
              </Reveal>
            ))}
            <p className="text-[13px] leading-relaxed text-ink-500">
              {t.agriPacht(k.pachtGesperrt ? "." : t.agriPachtZahl(k, fmtEur))}
            </p>
          </div>
        </div>
      </Section>

      {/* Besonderheiten & Netz */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow={t.vorOrt} title={t.netzTitel(r)} className="mb-12" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {r.netz && (
            <Reveal className="flex flex-col rounded-3xl bg-navy-950 p-6 text-white md:p-7 xl:row-span-2">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-300">
                <PlugZap aria-hidden="true" className="h-4 w-4" />
                {t.stromnetz}
              </p>
              {r.netz.uenb?.length > 0 && (
                <>
                  <p className="mt-4 text-[13px] text-white/60">{t.uenb}</p>
                  <p className="font-display text-[18px] font-bold">{r.netz.uenb.join(", ")}</p>
                </>
              )}
              {r.netz.vnb?.length > 0 && (
                <>
                  <p className="mt-4 text-[13px] text-white/60">{t.vnb}</p>
                  <ul className="mt-1 space-y-1 text-[15px] text-white/90">
                    {r.netz.vnb.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </>
              )}
              {r.netz.hinweis && <p className="mt-5 text-[14.5px] leading-relaxed text-white/70">{r.netz.hinweis}</p>}
              <p className="mt-5 text-[14px] leading-relaxed text-white/60">
                {t.netzText}
              </p>
              {r.netz.quelle?.url && (
                <a href={r.netz.quelle.url} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 text-[12.5px] font-medium text-ov-300 underline decoration-ov-300/50 underline-offset-2 hover:text-white">
                  {t.quelle}: {r.netz.quelle.titel}
                  <span className="sr-only">{t.neuesFenster}</span>
                </a>
              )}
            </Reveal>
          )}
          {r.besonderheiten?.map((b, i) => (
            <Reveal key={i} delay={i * 60} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/60 md:p-7">
              <p className="flex items-center gap-2 font-display text-[17.5px] font-bold text-ink-900">
                <Mountain aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                {b.titel}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                <Fett>{b.text}</Fett>
              </p>
            </Reveal>
          ))}
          {r.pacht?.begruendung && (
            <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/60 md:p-7">
              <p className="flex items-center gap-2 font-display text-[17.5px] font-bold text-ink-900">
                <Compass aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                {t.pachtIn(r)}
              </p>
              {k.pachtGesperrt ? (
                <p className="mt-2 text-[15px] font-semibold text-ov-700">{t.pachtGesperrt(k)}</p>
              ) : (
              <>
              <p className="ov-num mt-2 font-display text-[20px] font-extrabold text-ov-700">
                {t.spanne(k, fmt)}
              </p>
              <div className="mt-3" role="img" aria-label={t.spanneAria(k, fmt, PACHT.freiflaecheProHa)}>
                <div className="relative h-2 rounded-full bg-ink-100">
                  <span
                    className="absolute inset-y-0 rounded-full bg-ov-500"
                    style={{
                      left: `${((k.spanne.min - PACHT.freiflaecheProHa.min) / (PACHT.freiflaecheProHa.max - PACHT.freiflaecheProHa.min)) * 100}%`,
                      width: `${((k.spanne.max - k.spanne.min) / (PACHT.freiflaecheProHa.max - PACHT.freiflaecheProHa.min)) * 100}%`,
                    }}
                  />
                </div>
                <div aria-hidden="true" className="ov-num mt-1 flex justify-between text-[11px] text-ink-500"><span>{t.eur(fmt(PACHT.freiflaecheProHa.min))}</span><span>{t.dach}</span><span>{t.eur(fmt(PACHT.freiflaecheProHa.max))}</span></div>
              </div>
              </>
              )}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                <Fett>{r.pacht.begruendung}</Fett>
              </p>
            </Reveal>
          )}
        </div>
      </Section>

      {/* Kantone (nur Schweiz) */}
      {r.kantone?.length > 0 && (
        <Section tone="white" space="lg">
          <SectionHeading eyebrow={t.kantone} title={t.kantoneTitel} lead={t.kantoneLead} className="mb-12" />
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {r.kantone.map((c, i) => (
              <Reveal as="li" key={i} delay={(i % 3) * 60} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
                <p className="font-display text-[17.5px] font-bold text-ink-900">{c.name}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                  <Fett>{c.text}</Fett>
                </p>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {/* FAQ */}
      {r.faq?.length > 0 && (
        <Section tone={r.kantone?.length ? "sand" : "white"} space="lg">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <SectionHeading eyebrow={t.faq} title={t.faqTitel(r)} lead={t.faqLead} />
            <Faq items={r.faq.map((f) => ({ q: f.q, a: <Fett>{f.a}</Fett>, aText: ohneFett(f.a) }))} />
          </div>
        </Section>
      )}

      {/* Anfrage */}
      <Section tone={r.kantone?.length ? "white" : "sand"} space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={t.kostenlos}
              title={t.meldenTitel(r)}
              lead={t.meldenLead(r, en ? GRUNDSTUECK_EN[r.land] || GRUNDSTUECK_EN.DE : grundstueck(r.land).mehrzahl)}
            />
            <Reveal className="ov-noise relative mt-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
              <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
              <div className="relative">
                <LayoutDashboard aria-hidden="true" className="h-7 w-7 text-ov-300" />
                <p className="mt-4 font-display text-[20px] font-bold">{t.portalTitel}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">{t.portalText}</p>
                <Link href="/registrieren?rolle=flaeche" className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-300 hover:text-white">
                  {t.zugang} <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-[0_40px_80px_-50px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-9">
            <AnfrageFormular
              typ="flaeche"
              daten={{ region: r.slug, regionName: r.name, land: r.land, quelle: `regionen/${r.slug}` }}
              felder={["telefon", "plz", "ort", "nachricht"]}
              titel={t.formTitel(r)}
              text={t.formText}
              button={t.formButton}
            />
          </Reveal>
        </div>
      </Section>

      {/* Quellen */}
      {r.quellen?.length > 0 && (
        <Section tone="white" space="sm">
          <details className="group rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-8">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[18px] font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
              {t.quellen(r.quellen.length)}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-open:rotate-90" />
            </summary>
            <ul className="mt-5 grid gap-2.5 text-[14px] leading-relaxed text-ink-600 md:grid-cols-2">
              {r.quellen.map((q) => (
                <li key={q.url} className="min-w-0">
                  <a href={q.url} target="_blank" rel="noopener noreferrer" className="break-words text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                    {q.titel}
                    <span className="sr-only">{t.neuesFenster}</span>
                  </a>
                  {q.stand && <span className="text-ink-500">{t.stand(q.stand)}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-ink-500">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {t.gewaehr}
            </p>
          </details>
        </Section>
      )}

      {/* Nachbarregionen */}
      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.weitere} title={r.land === "CH" ? t.rundCh : t.rund(r)} className="mb-8" />
            <ul className="grid gap-3 sm:grid-cols-2">
              {umgebung.map((n) => (
                <li key={n.slug}>
                  <Link href={lp(regionSchluessel(n.slug))} className="group flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 hover:ring-ov-400">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink-900">{t.solarpark(n.name)}</span>
                      <span className="text-[13px] text-ink-600">{landFuer(n.land, sprache).name}{n.ertrag?.kwhProKwp ? ` · ${fmt(n.ertrag.kwhProKwp)} kWh/kWp` : ""}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={lp("/regionen")} className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-700 underline decoration-ov-300 underline-offset-4 hover:decoration-current">
              <Compass aria-hidden="true" className="h-4 w-4" />
              {t.alle}
            </Link>
          </div>
          <div className="rounded-[2rem] bg-white p-5 ring-1 ring-ink-200/70 md:p-8">
            <RegionKarte aktiv={r.slug} nachbarn={r.nachbarn} titel={t.karte(r)} />
          </div>
        </div>
      </Section>

      <Querverweise
        items={[
          { href: lp("/flaechencheck"), titel: t.qvCheck, text: t.qvCheckText(r) },
          { href: lp("/rechner/pacht"), titel: link("/rechner/pacht", t.qvPacht).label, text: t.qvPachtText },
          ...land.ratgeber.slice(0, r.land === "DE" ? 2 : 1),
          ...(r.land === "DE" ? [] : [{ href: lp("/flaeche-verpachten"), titel: link("/flaeche-verpachten", t.qvVerpachten).label, text: t.qvVerpachtenText }]),
        ]}
      />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel(r)}
        text={t.ctaText}
        primary={{ label: t.ctaPrimary, href: lp("/flaechencheck") }}
        secondary={link("/rechner/pacht", t.qvPacht)}
      />
    </div>
  );
}

function Zeile({ l, v }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-ink-600">{l}</dt>
      <dd className="ov-num text-right font-semibold text-ink-900">{v}</dd>
    </div>
  );
}

function Liste({ titel, icon: Icon, ton, punkte = [] }) {
  if (!punkte?.length) return null;
  const gut = ton === "gut";
  return (
    <Reveal className={gut ? "rounded-3xl bg-ov-50 p-6 ring-1 ring-ov-100" : "rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60"}>
      <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
        <Icon aria-hidden="true" className={gut ? "h-5 w-5 text-ov-600" : "h-5 w-5 text-ink-500"} />
        {titel}
      </p>
      <ul className="mt-4 space-y-2.5">
        {punkte.map((p, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-700">
            <span aria-hidden="true" className={gut ? "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" : "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400"} />
            <span>
              <Fett>{p}</Fett>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

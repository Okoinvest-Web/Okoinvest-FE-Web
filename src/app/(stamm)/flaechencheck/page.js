// src/app/flaechencheck/page.js – Flächencheck (Wizard)
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte); Länderinhalt CH über FLAECHENCHECK_CH_EN.
// Der Assistent übersetzt seine Anzeige selbst (src/components/Flaeche/flaechencheckEn.js).

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import FlaechenWizard from "@/components/Flaeche/FlaechenWizard";
import { CheckHero, SoBewertenWir } from "@/components/Flaeche/Check/Abschnitte";
import { AnnahmenBox } from "@/components/Rechner/RechnerSeite";
import { abs } from "@/data/site";
import { FREIFLAECHE, PACHT, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { LAENDER, linkFuer, pfad } from "@/lib/land";
import { grundstueck } from "@/lib/anfrage/laender";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { FLAECHENCHECK_CH, FLAECHENCHECK_CH_EN } from "@/data/laender/ch/flaechencheck";
import { chTexte } from "@/data/laender/ch/schreibung";
import { uebersetze, zusammenfuehren } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/flaechencheck");
const TITEL = "Flächencheck Solarpark: Eignet sich Ihre Fläche? | ÖkoInvest";
const BESCHREIBUNG =
  "Eignet sich Ihre Fläche für Solarpark oder Agri-PV? Lage, Größe, Nutzung und Netz angeben – Ampel, Leistung, Stromertrag und Pachtspanne in zwei Minuten.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/freiflaeche-begehung.jpg"), width: 1280, height: 852, alt: "Begehung einer Fläche für einen Solarpark" }],
  },
};

// FAQ je Land: Begriffe (Flurstück/Grundstück/Parzelle) aus src/lib/anfrage/laender.js; Kosten in € nur für DE
const faqFuer = (land) => [
  {
    q: "Wie genau ist der Flächencheck?",
    a: `Er ist eine erste, transparente Einschätzung auf Basis Ihrer Angaben und typischer Marktwerte – vergleichbar mit dem ersten Gespräch mit einem Projektentwickler. Netzkapazität, Planungsrecht, Schutzgebiete und Bodenverhältnisse prüfen wir anschließend ${grundstueck(land).genau}.`,
  },
  {
    q: "Was passiert mit meinen Angaben?",
    a: "Solange Sie das Formular nicht absenden, bleiben alle Angaben in Ihrem Browser. Senden Sie das Ergebnis ab, legen wir einen Vorgang an; registrieren Sie sich später mit derselben E-Mail, sehen Sie ihn samt Status im Portal.",
  },
  {
    q: "Warum ist die Netzentfernung so wichtig?",
    a:
      land === "DE"
        ? `Jeder Kilometer Mittelspannungskabel kostet grob ${fmt(FREIFLAECHE.kabelProMeter)} Tsd. €. Bei einem kleinen Park fällt das je Kilowatt stark ins Gewicht, bei einem großen kaum. Deshalb rechnet der Check die Netzkosten je kWp – und noch wichtiger ist, ob das Netz überhaupt Kapazität frei hat.`
        : "Die Kabeltrasse bis zum Netzanschlusspunkt fällt bei einem kleinen Park je Kilowatt stark ins Gewicht, bei einem großen kaum. Deshalb bewertet der Check die Netzentfernung je kWp – und noch wichtiger ist, ob das Netz überhaupt Kapazität frei hat.",
  },
  {
    q: "Meine Fläche ist rot – lohnt sich eine Anfrage trotzdem?",
    a: "Oft ja. Die Heuristik kennt Ihre Fläche nicht im Detail. Mit Nachbarflächen, als Agri-PV oder mit einem anderen Netzanschlusspunkt kann ein Projekt trotzdem möglich sein. Wenn nicht, sagen wir es Ihnen offen.",
  },
  {
    q: "Was kostet mich die Prüfung?",
    a: `Nichts. ${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)} – vom Flächencheck über das Pachtangebot bis zum Vertrag.`,
  },
];

// Englisch (Sprachmodell): FAQ je Land, inhaltlich identisch; „plots“ statt der Katasterbegriffe der Länder
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");
const faqFuerEn = (land) => [
  {
    q: "How accurate is the land check?",
    a: "It is an initial, transparent assessment based on your details and typical market values – comparable to a first conversation with a project developer. We then check grid capacity, planning law, protected areas and soil conditions plot by plot.",
  },
  {
    q: "What happens to my details?",
    a: "As long as you do not submit the form, all details stay in your browser. If you send the result, we open a case; if you later register with the same email address, you will see it and its status in the portal.",
  },
  {
    q: "Why is the distance to the grid so important?",
    a:
      land === "DE"
        ? `Each kilometre of medium-voltage cable costs roughly €${z(FREIFLAECHE.kabelProMeter)}k. For a small park this weighs heavily per kilowatt, for a large one hardly at all. That is why the check calculates grid costs per kWp – and even more important is whether the grid has any free capacity at all.`
        : "For a small park, the cable route to the grid connection point weighs heavily per kilowatt, for a large one hardly at all. That is why the check assesses the distance to the grid per kWp – and even more important is whether the grid has any free capacity at all.",
  },
  {
    q: "My land is red – is an enquiry still worthwhile?",
    a: "Often, yes. The heuristic does not know your land in detail. With neighbouring land, as agrivoltaics or with a different grid connection point, a project may still be possible. If not, we will tell you openly.",
  },
  {
    q: "What does the assessment cost me?",
    a: "Nothing. It is always free of charge for landowners – from the land check to the lease offer and the contract.",
  },
];

const metadataEnFuer = (land) =>
  !land || land === "DE"
    ? {
        title: "Solar park land check: is your land suitable? | ÖkoInvest",
        description: "Is your land suitable for a solar park or agrivoltaics? Enter location, size, use and grid – traffic light, capacity, power yield and lease range in two minutes.",
        openGraph: { title: "Solar park land check: is your land suitable? | ÖkoInvest", description: "Is your land suitable for a solar park or agrivoltaics? Enter location, size, use and grid – traffic light, capacity, power yield and lease range in two minutes.", images: [{ alt: "Site visit to land for a solar park" }] },
      }
    : {
        title: `Land check ${LAENDER[land].en.name}: is your land suitable for ground-mounted PV? | ÖkoInvest`,
        description: `Is your land ${LAENDER[land].en.inLand} suitable for ground-mounted PV or agrivoltaics? Enter location, size, use and grid – traffic light, capacity and power yield in two minutes.`,
        openGraph: { title: `Land check ${LAENDER[land].en.name} | ÖkoInvest`, description: `Traffic light, capacity and power yield of your land ${LAENDER[land].en.inLand} in two minutes.`, images: [{ alt: "Site visit to land for a solar park" }] },
      };

/** Feste Texte der Seite (en nur Texte). */
const TEXTE = {
  de: {
    jsonLdName: "ÖkoInvest Flächencheck",
    jsonLdText: BESCHREIBUNG,
    checkLabel: "Flächencheck",
    ampel: ["Ampel", "grün ab 65, gelb ab 40 Punkten"],
    bedarf: ["Flächenbedarf", `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`],
    mindest: ["Mindestgröße Solarpark", `ab ${FREIFLAECHE.mindestHa} ha`],
    deWerte: [
      ["Kabeltrasse Mittelspannung", `${fmt(FREIFLAECHE.kabelProMeter)} €/m`],
      ["Übergabestation", `${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp`],
      ["Pacht Freifläche", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha·a`],
      ["Pacht Agri-PV", `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha·a`],
      ["Indexierung Pacht", `${fmt(PACHT.indexierung * 100, 1)} % p. a.`],
    ],
    landWerte: (land) => ["Pacht und Kosten", `Werte gelten bisher nur für Deutschland – ${LAENDER[land].fuerLand} folgen sie nach fachlicher Prüfung`],
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Zum Flächencheck", lead: "Ihre Frage ist nicht dabei? Stellen Sie sie im Formular unter dem Ergebnis." },
    regionen: (land) => ({ titel: `Regionen ${LAENDER[land].inLand}`, text: "Widmung, Zonen und Bewilligungen je Bundesland – mit Quellen." }),
    freiflaeche: { titel: "Freiflächen-PV", text: "Flächenkriterien, EEG-Kulisse, Genehmigung in DE, AT und CH." },
    pacht: { titel: "Pachtrechner", text: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre." },
    verpachten: { titel: "Fläche verpachten", text: "Was im Vertrag steht und wie es bis zur ersten Pacht weitergeht." },
    agri: { titel: "Agri-PV", text: "Strom und Landwirtschaft auf derselben Fläche." },
    cta: {
      eyebrow: "Persönlich statt Formular",
      titel: "Lieber gleich mit dem Flächenteam sprechen?",
      text: (mehrzahl, was) => `Schicken Sie uns Ihre ${mehrzahl} – wir prüfen Netz, ${was} und Restriktionen und melden uns mit einer ehrlichen Einschätzung.`,
      was: { de: "Kulisse", ch: "Bauzone und Standortgebundenheit", at: "Widmung" },
      verpachten: "Fläche verpachten",
      kontakt: "Zum Kontakt",
      landwirte: "Für Landwirte",
      regionen: (land) => `Regionen ${LAENDER[land].inLand}`,
    },
  },
  en: {
    jsonLdName: "ÖkoInvest land check",
    jsonLdText: "Is your land suitable for a solar park or agrivoltaics? Enter location, size, use and grid – traffic light, capacity, power yield and lease range in two minutes.",
    checkLabel: "Land check",
    ampel: ["Traffic light", "green from 65, yellow from 40 points"],
    bedarf: ["Land required", `${z(FREIFLAECHE.haProMwp, 1)} ha per MWp`],
    mindest: ["Minimum solar park size", `from ${FREIFLAECHE.mindestHa} ha`],
    deWerte: [
      ["Medium-voltage cable route", `€${z(FREIFLAECHE.kabelProMeter)}/m`],
      ["Transfer station", `€${z(FREIFLAECHE.netzanschlussFixProMwp)}/MWp`],
      ["Ground-mounted lease", `€${z(PACHT.freiflaecheProHa.min)}–${z(PACHT.freiflaecheProHa.max)}/ha·yr`],
      ["Agrivoltaics lease", `€${z(PACHT.agriProHa.min)}–${z(PACHT.agriProHa.max)}/ha·yr`],
      ["Lease indexation", `${z(PACHT.indexierung * 100, 1)} % p.a.`],
    ],
    landWerte: (land) => [`Lease and costs – figures ${LAENDER[land].en.fuerLand} will follow after a specialist review`, "Germany only"],
    faqKopf: { eyebrow: "Frequently asked questions", titel: "About the land check", lead: "Your question is not listed? Ask it in the form below the result." },
    regionen: (land) => ({ titel: `Regions ${LAENDER[land].en.inLand}`, text: "Zoning, zones and permits by federal state – with sources." }),
    freiflaeche: { titel: "Ground-mounted PV", text: "Site criteria, EEG land categories, permitting in DE, AT and CH." },
    pacht: { titel: "Lease calculator", text: "Fixed lease, indexed or revenue share over 30 years." },
    verpachten: { titel: "Lease your land", text: "What the contract says and how it continues up to the first lease payment." },
    agri: { titel: "Agrivoltaics", text: "Power and farming on the same land." },
    cta: {
      eyebrow: "In person instead of a form",
      titel: "Prefer to talk to the land team straight away?",
      text: (_, was) => `Send us your plot numbers – we will check the grid, ${was} and restrictions and get back to you with an honest assessment.`,
      was: { de: "land categories", ch: "building zone and site-bound status", at: "zoning" },
      verpachten: "Lease your land",
      kontakt: "Contact us",
      landwirte: "For farmers",
      regionen: (land) => `Regions ${LAENDER[land].en.inLand}`,
    },
  },
};

export default async function FlaechencheckPage({ params }) {
  // Gemeinsame Seite: Inhalt wie vor Welle 2 (deutsche Werte, Länderwahl im Check selbst);
  // Länderfassung AT/CH: ohne ungeprüfte Pacht- und Kostenwerte, Begriffe des Landes
  const seitenland = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const w = uebersetze(TEXTE, sprache);
  const land = seitenland || "DE";
  const chInhalt = en ? zusammenfuehren(FLAECHENCHECK_CH, FLAECHENCHECK_CH_EN) : FLAECHENCHECK_CH;
  const faqBasis = en ? faqFuerEn(land) : faqFuer(land);
  const FAQ = chTexte(land === "CH" ? [...faqBasis, ...chInhalt.faq] : faqBasis, en ? null : land);
  const de = land === "DE";
  const ch = land === "CH"; // Schweiz: Begriffe und Verweise aus src/data/laender/ch/flaechencheck.js
  const link = (k, label) => linkFuer(k, seitenland, label);
  const gs = grundstueck(land);
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: w.jsonLdName,
          url: abs(pfad("/flaechencheck", seitenland)),
          description: w.jsonLdText,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: en ? "en" : LAENDER[land].lang,
          isAccessibleForFree: true,
          publisher: { "@id": `${abs("/")}/#organization` },
        }}
      />

      <CheckHero land={land} />

      <section id="check" aria-label={w.checkLabel} className="relative z-10 -mt-20 scroll-mt-24 pb-6 md:-mt-28 md:pb-10">
        <div className="ov-container">
          <FlaechenWizard land={seitenland} />
        </div>
      </section>

      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <SoBewertenWir />
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <AnnahmenBox
              giltFuer={seitenland ? null : "DE"}
              punkte={[w.ampel, w.bedarf, w.mindest, ...(de ? w.deWerte : [w.landWerte(land)])]}
              quellen={[
                { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
                ...(de ? [{ name: "Bundesnetzagentur", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" }] : []),
              ]}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} lead={w.faqKopf.lead} />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          ...(de
            ? []
            : [ch ? chInhalt.querverweisRegion : { href: pfad("/regionen", seitenland), ...w.regionen(land) }]),
          { href: pfad("/freiflaeche", seitenland), titel: link("/freiflaeche", w.freiflaeche.titel).label, text: ch ? chInhalt.freiflaecheText : w.freiflaeche.text },
          { href: pfad("/rechner/pacht", seitenland), titel: link("/rechner/pacht", w.pacht.titel).label, text: w.pacht.text },
          { href: pfad("/flaeche-verpachten", seitenland), titel: link("/flaeche-verpachten", w.verpachten.titel).label, text: w.verpachten.text },
          ...(de ? [{ href: pfad("/agri-pv"), ...w.agri }] : []),
        ]}
      />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={w.cta.text(gs.mehrzahl, de ? w.cta.was.de : ch ? w.cta.was.ch : w.cta.was.at)}
        primary={de ? { label: w.cta.verpachten, href: pfad("/flaeche-verpachten") } : { label: w.cta.kontakt, href: "/kontakt" }}
        secondary={de ? { label: w.cta.landwirte, href: pfad("/landwirte") } : ch ? chInhalt.ctaSecondary : { label: w.cta.regionen(land), href: pfad("/regionen", seitenland) }}
      />
    </div>
  );
}

// AT/CH: ohne Pachtspanne (Länder-Sperre, B1)
const metadataFuer = (land) =>
  !land || land === "DE"
    ? metadata
    : {
        ...metadata,
        title: `Flächencheck ${LAENDER[land].name}: Eignet sich Ihre Fläche für Freiflächen-PV? | ÖkoInvest`,
        description: `Eignet sich Ihre Fläche ${LAENDER[land].inLand} für Freiflächen-PV oder Agri-PV? Lage, Größe, Nutzung und Netz angeben – Ampel, Leistung und Stromertrag in zwei Minuten.`,
        openGraph: { ...metadata.openGraph, title: `Flächencheck ${LAENDER[land].name} | ÖkoInvest`, description: `Ampel, Leistung und Stromertrag Ihrer Fläche ${LAENDER[land].inLand} in zwei Minuten.` },
      };

export const generateMetadata = seitenMetadata("/flaechencheck", (land, p) =>
  p?.sprache === "en" ? uebersetze({ de: metadataFuer(land), en: metadataEnFuer(land) }, "en") : chTexte(metadataFuer(land), land)
);

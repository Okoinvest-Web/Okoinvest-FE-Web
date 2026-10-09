// src/app/rechner/projektbewertung/page.js – Projektbewertung nach Phase
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import ProjektbewertungRechner from "@/components/Rechner/ProjektbewertungRechner";
import { FREIFLAECHE, PHASEN, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";
import { begriffEn } from "@/lib/sprache/begriffe";

const PFAD = seitenPfad("/rechner/projektbewertung");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Projektbewertung Solarpark: Wert nach Phase | ÖkoInvest",
  description:
    "Was sind PV-Projektrechte wert? Kaufpreisspanne je kWp nach Phase, Netzanschluss, Größe und Vermarktung – mit Werttreibern, Risiko und Weg in die Projektbörse.",
  keywords: ["Projektrechte Solarpark Preis", "Solarpark Projekt verkaufen", "RTB Solarpark Preis", "Projektbewertung Photovoltaik", "Entwicklungsprämie Solar"],
});

const metadataEn = rechnerMetadataEn({
  title: "Solar park project valuation: value by phase | ÖkoInvest",
  description:
    "What are PV project rights worth? Purchase price range per kWp by phase, grid connection, size and marketing – with value drivers, risk and a route onto the project exchange.",
  keywords: ["solar park project rights price", "sell solar park project", "RTB solar park price", "photovoltaic project valuation", "solar development premium"],
});

const FAQ = [
  {
    q: "Wie werden Projektrechte für Solarparks bewertet?",
    a: "In der Praxis über einen Preis je kWp, der mit dem Entwicklungsstand steigt: Je weiter ein Projekt ist, desto geringer das Risiko für den Käufer. Neben der Phase entscheiden vor allem der Netzanschluss (Zusage, Kapazität, Entfernung), die Größe, die Erlössicherung über EEG-Zuschlag oder PPA sowie die Qualität von Pacht- und Planungsunterlagen. Professionelle Käufer rechnen zusätzlich rückwärts: Aus der erwarteten Rendite des fertigen Parks ergibt sich, wie viel sie für die Rechte zahlen können.",
    nurDE: "Marktspannen",
  },
  {
    q: "Wird der Kaufpreis auf einmal bezahlt?",
    a: "Bei frühen Projekten selten. Üblich sind gestaffelte Zahlungen: ein Teil bei Unterzeichnung, weitere Raten bei Meilensteinen wie Satzungsbeschluss, Baugenehmigung, Netzanschlussvertrag oder Baureife (RTB). So teilen Käufer und Verkäufer das Entwicklungsrisiko. Die Staffelung beeinflusst den Gesamtpreis oft stärker als kleine Unterschiede im Preis je kWp.",
  },
  {
    q: "Was bedeutet Ready-to-Build (RTB)?",
    a: "Ein Projekt ist baureif, wenn Baurecht (in der Regel ein rechtskräftiger Bebauungsplan und die Baugenehmigung), gesicherte Flächen für die Laufzeit, eine Netzanschlusszusage mit Einspeisepunkt und die wesentlichen Gutachten vorliegen. Ab dann kann gebaut werden – offen sind meist nur noch Vermarktung, Finanzierung und EPC-Vertrag.",
    // Länderfassung: Baurecht in den Begriffen des Landes (Widmung AT; Bewilligung Gemeinde/Kanton CH)
    AT: { a: "Ein Projekt ist baureif, wenn das Planungsrecht (in der Regel eine passende Flächenwidmung und die erforderlichen Bewilligungen nach Landesrecht), gesicherte Flächen für die Laufzeit, eine Netzanschlusszusage mit Einspeisepunkt und die wesentlichen Gutachten vorliegen. Ab dann kann gebaut werden – offen sind meist nur noch Vermarktung, Finanzierung und EPC-Vertrag." },
    CH: { a: "Ein Projekt ist baureif, wenn die Bewilligung von Gemeinde und Kanton, gesicherte Flächen für die Laufzeit, eine Netzanschlusszusage mit Einspeisepunkt und die wesentlichen Gutachten vorliegen. Ab dann kann gebaut werden – offen sind meist nur noch Vermarktung, Finanzierung und EPC-Vertrag." },
  },
  {
    q: "Was kostet der Verkauf über die ÖkoInvest-Projektbörse?",
    a: `Für Käufer nichts. Verkäufer zahlen eine Erfolgsprovision von ${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} % des Kaufpreises – nur, wenn ein Kaufvertrag zustande kommt. Einstellen, Exposé und Matching sind kostenfrei.`,
  },
  {
    q: "Warum mindert eine lange Kabeltrasse den Wert so stark?",
    a: `Weil der Käufer die Kosten trägt: Rund ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter Mittelspannungstrasse inklusive Tiefbau fallen bei einem 10-MWp-Projekt mit 5 km Trasse schnell mit über 50 €/kWp ins Gewicht – so viel wie die gesamte Entwicklungsprämie in frühen Phasen. Dazu kommen Wegerechte und Genehmigungen entlang der Trasse.`,
    nurDE: "Kostenwerte",
  },
];

const FAQ_EN = [
  {
    q: "How are project rights for solar parks valued?",
    a: "In practice via a price per kWp that rises with the development stage: the further a project has progressed, the lower the risk for the buyer. Besides the phase, the main factors are the grid connection (commitment, capacity, distance), size, revenue security via an EEG award or PPA, and the quality of the lease and planning documents. Professional buyers also calculate backwards: the expected return of the finished park determines how much they can pay for the rights.",
    nurDE: "Market ranges",
  },
  {
    q: "Is the purchase price paid in one go?",
    a: "Rarely for early-stage projects. Staggered payments are usual: part on signing, further instalments at milestones such as adoption of the development plan, building permit, grid connection contract or ready-to-build status (RTB). This way buyer and seller share the development risk. The payment schedule often affects the total price more than small differences in the price per kWp.",
  },
  {
    q: "What does ready-to-build (RTB) mean?",
    a: "A project is ready to build when planning permission (usually a legally binding development plan – Bebauungsplan – and the building permit), land secured for the term, a grid connection commitment with a feed-in point and the main surveys are in place. From then on construction can start – usually only marketing, financing and the EPC contract remain open.",
    AT: { a: "A project is ready to build when the planning law requirements (usually a suitable zoning designation – Flächenwidmung – and the permits required under state law), land secured for the term, a grid connection commitment with a feed-in point and the main surveys are in place. From then on construction can start – usually only marketing, financing and the EPC contract remain open." },
    CH: { a: "A project is ready to build when the permit from the municipality and canton, land secured for the term, a grid connection commitment with a feed-in point and the main surveys are in place. From then on construction can start – usually only marketing, financing and the EPC contract remain open." },
  },
  {
    q: "What does selling via the ÖkoInvest project exchange cost?",
    a: `Nothing for buyers. Sellers pay a success fee of ${e.fmt(PROVISION.verkaeufer.min * 100, 1)}–${e.pct(PROVISION.verkaeufer.max * 100)} of the purchase price – only if a purchase agreement is concluded. Listing, exposé and matching are free of charge.`,
  },
  {
    q: "Why does a long cable route reduce the value so much?",
    a: `Because the buyer bears the costs: around ${e.eur(FREIFLAECHE.kabelProMeter)} per metre of medium-voltage route including civil works quickly adds up to more than €50/kWp for a 10 MWp project with a 5 km route – as much as the entire development premium in early phases. On top come rights of way and permits along the route.`,
    nurDE: "Cost figures",
  },
];

const DE = {
  breadcrumb: "Projektbewertung",
  eyebrow: "Für Investoren & Entwickler",
  title: (
    <>
      Was ist Ihr Projekt <span className="ov-text-gradient-light">in dieser Phase wert?</span>
    </>
  ),
  lead: "Kaufpreisspanne je kWp und gesamt – nach Entwicklungsstand, Netzanschluss, Größe, Vermarktung und Land. Mit Werttreibern, Abschlägen und Risikoeinordnung.",
  chips: ["Sechs Phasen bis Bestand", "Netz, Größe, EEG/PPA", "DACH-weit", "Weg in die Projektbörse"],
  app: {
    name: "Projektbewertung für Solarprojekte",
    description: "Orientierende Bewertung von Photovoltaik-Projektrechten nach Entwicklungsphase mit Werttreibern und Risikoeinordnung.",
    featureList: ["Kaufpreisspanne je kWp und gesamt", "Sechs Entwicklungsphasen", "Zu- und Abschläge für Netzanschluss, Größe, Vermarktung", "Risikoeinordnung"],
  },
  annahmen: [
    ...PHASEN.map((p) => [p.label, `${fmt(p.preisProKwp.min)}–${fmt(p.preisProKwp.max)} €/kWp`]),
    ["Kabeltrasse", `${fmt(FREIFLAECHE.kabelProMeter)} €/m`],
    ["Provision Verkäufer", `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %, nur bei Abschluss`],
    ["Stand", STAND],
  ],
  quellen: [{ name: `Marktannahmen ÖkoInvest (Spannen DACH, Stand ${STAND})` }, { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" }],
  faqTitel: "Projektrechte bewerten – gut zu wissen",
  querverweise: [
    { href: "/projektboerse/anbieten", titel: "Projekt anbieten", text: "Exposé anlegen, Käufer mit passendem Suchprofil erreichen – Provision nur bei Abschluss." },
    { href: seitenPfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR – so rechnen Käufer den fertigen Park." },
    { href: "/investoren", titel: "Für Investoren", text: "Phasenmodell, Due-Diligence-Checkliste und Ablauf vom Suchprofil bis zum Closing." },
    { href: seitenPfad("/prozess"), titel: "Projektablauf", text: "Von der Flächensicherung bis zur Inbetriebnahme – alle Schritte und Dauern." },
  ],
  cta: {
    eyebrow: "Projektbörse",
    title: "Ihr Projekt verdient den richtigen Käufer.",
    text: "Stellen Sie Ihr Projekt anonym in die Börse. Wir prüfen die Unterlagen, gleichen mit Suchprofilen ab und begleiten NDA, Datenraum und Verhandlung.",
    primary: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
    secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
  },
};

const EN = {
  breadcrumb: "Project valuation",
  eyebrow: "For investors & developers",
  title: (
    <>
      What is your project worth <span className="ov-text-gradient-light">in this phase?</span>
    </>
  ),
  lead: "Purchase price range per kWp and in total – by development stage, grid connection, size, marketing and country. With value drivers, discounts and a risk assessment.",
  chips: ["Six phases up to operation", "Grid, size, EEG/PPA", "Across DACH", "Route onto the project exchange"],
  app: {
    name: "Project valuation for solar projects",
    description: "Indicative valuation of photovoltaic project rights by development phase, with value drivers and risk assessment.",
    featureList: ["Purchase price range per kWp and in total", "Six development phases", "Premiums and discounts for grid connection, size, marketing", "Risk assessment"],
  },
  annahmen: [
    ...PHASEN.map((p) => [begriffEn("phase", p.id, p.label), `${e.eur(p.preisProKwp.min)}–${e.eur(p.preisProKwp.max, "/kWp")}`]),
    ["Cable route", e.eur(FREIFLAECHE.kabelProMeter, "/m")],
    ["Seller’s fee", `${e.fmt(PROVISION.verkaeufer.min * 100, 1)}–${e.pct(PROVISION.verkaeufer.max * 100)}, only on closing`],
    ["As of", datumText(STAND, "en")],
  ],
  quellen: [{ name: `ÖkoInvest market assumptions (DACH ranges, as of ${datumText(STAND, "en")})` }, { name: "Bundesnetzagentur (Federal Network Agency) – solar tenders" }],
  faqTitel: "Valuing project rights – good to know",
  querverweise: [
    { titel: "Offer a project", text: "Create an exposé and reach buyers with a matching search profile – fee only on closing." },
    { titel: "Solar park return calculator", text: "IRR, LCOE and DSCR – how buyers calculate the finished park." },
    { titel: "For investors", text: "Phase model, due diligence checklist and the process from search profile to closing." },
    { titel: "Project process", text: "From securing the land to commissioning – all steps and durations." },
  ],
  cta: {
    eyebrow: "Project exchange",
    title: "Your project deserves the right buyer.",
    text: "List your project anonymously on the exchange. We review the documents, match them with search profiles and support you through NDA, data room and negotiation.",
    primary: { label: "Offer a project" },
    secondary: { label: "To the project exchange" },
  },
};

export default async function Page({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="projektbewertung"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<ProjektbewertungRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the project value arises</h2>
              <p>
                A solar project gains value with every milestone because a risk falls away: once the land is secured, the grid connection is still missing; with the grid commitment, planning permission is missing; with the adoption of the development plan, usually only the permit and final surveys are missing. The calculator starts with the market range of the chosen phase and shifts it with premiums and discounts.
              </p>
              <h3>What moves the price most</h3>
              <ul>
                <li>
                  <strong>Grid connection:</strong> the number one bottleneck in many regions. Reserved capacity or an early commitment is often worth more than a planning step.
                </li>
                <li>
                  <strong>Size:</strong> below about 8 MWp, the pool of buyers shrinks because due diligence and grid connection cost almost as much as for large projects.
                </li>
                <li>
                  <strong>Revenue security:</strong> an EEG award or a signed PPA makes the project bankable and shortens the time to construction.
                </li>
                <li>
                  <strong>Documents:</strong> clean lease contracts secured in the land register, yield assessments, environmental and glare reports and a complete data room speed up the sale.
                </li>
              </ul>
              <p>
                The ranges are guidance for a first conversation. They do not replace an expert valuation – for that, buyers model the finished park. With the <Link href={seitenPfad("/rechner/solarpark")}>solar park return calculator</Link> you can reproduce this view yourself.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>Wie der Projektwert entsteht</h2>
              <p>
                Ein Solarprojekt gewinnt mit jedem Meilenstein an Wert, weil ein Risiko wegfällt: Ist die Fläche gesichert, fehlt noch der Netzanschluss; mit der Netzzusage fehlt das Baurecht; mit
                dem Satzungsbeschluss fehlen meist nur noch Genehmigung und letzte Gutachten. Der Rechner startet mit der Marktspanne der gewählten Phase und verschiebt sie mit Zu- und Abschlägen.
              </p>
              <h3>Was den Preis am stärksten bewegt</h3>
              <ul>
                <li>
                  <strong>Netzanschluss:</strong> In vielen Regionen der Engpass Nummer eins. Eine reservierte Kapazität oder eine frühe Zusage ist oft mehr wert als ein Planungsschritt.
                </li>
                <li>
                  <strong>Größe:</strong> Unter etwa 8 MWp wird der Käuferkreis kleiner, weil Due Diligence und Netzanschluss fast gleich viel kosten wie bei großen Projekten.
                </li>
                <li>
                  <strong>Erlössicherung:</strong> Ein EEG-Zuschlag oder ein unterschriebener PPA macht das Projekt bankfähig und verkürzt die Zeit bis zum Bau.
                </li>
                <li>
                  <strong>Unterlagen:</strong> Saubere Pachtverträge mit Grundbuchsicherung, Ertragsgutachten, Umwelt- und Blendgutachten sowie ein vollständiger Datenraum beschleunigen den Verkauf.
                </li>
              </ul>
              <p>
                Die Spannen sind Orientierung für ein erstes Gespräch. Ein Wertgutachten ersetzen sie nicht – dafür rechnen Käufer den fertigen Park durch. Mit dem{" "}
                <Link href={seitenPfad("/rechner/solarpark")}>Solarpark-Renditerechner</Link> können Sie diese Sicht selbst nachvollziehen.
              </p>
            </div>
          )}
        </NurDEBlock>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/projektbewertung", metadata, { en: metadataEn });

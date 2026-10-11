// src/app/rechner/netzanschluss/page.js – Netzanschluss-Check für Solarparks
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import NetzanschlussRechner from "@/components/Rechner/NetzanschlussRechner";
import NetzanschlussBegleiter from "@/components/Rechner/NetzanschlussBegleiter";
import { FREIFLAECHE, SPEICHER } from "@/lib/invest/markt";
import { CLUSTER_ANTEIL, SPANNE } from "@/lib/rechner/netzanschluss";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/netzanschluss");
const N = FREIFLAECHE.netz;
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Netzanschluss-Check Solarpark: Kosten & Zeit | ÖkoInvest",
  description:
    "Netzanschluss für Solarpark prüfen: grobe Kosten für Kabeltrasse, Übergabestation und Umspannwerk, Zeitrahmen, Risiken und Tipps – mit Überbauung und Speicher.",
  keywords: ["Netzanschluss Solarpark Kosten", "Netzanschlussbegehren § 8 EEG", "Umspannwerk Solarpark", "Überbauung Netzanschluss", "Kabeltrasse Mittelspannung Kosten", "Netzverknüpfungspunkt"],
});

const metadataEn = rechnerMetadataEn({
  title: "Solar park grid connection check: costs & time | ÖkoInvest",
  description:
    "Check the grid connection for a solar park: rough costs for cable route, transfer station and substation, time frame, risks and tips – with overbuilding and storage.",
  keywords: ["solar park grid connection costs", "grid connection request § 8 EEG", "solar park substation", "overbuilding grid connection", "medium-voltage cable route costs", "grid connection point"],
});

const FAQ = [
  {
    q: "Was kostet der Netzanschluss eines Solarparks?",
    a: `Das hängt vor allem von Entfernung und Spannungsebene ab. Als grobe Orientierung rechnen wir mit rund ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter Mittelspannungstrasse, ${fmt(FREIFLAECHE.netzanschlussFixProMwp)} € je MWp für Übergabe- und Trafostationen und – bei großen Parks – mit einem eigenen Umspannwerk 110/20 kV in Millionenhöhe. Wenige Kilometer zur Mittelspannung sind meist gut tragbar; lange 110-kV-Trassen können die Wirtschaftlichkeit kippen.`,
    nurDE: "Kostenwerte",
  },
  {
    q: "Wer trägt welche Kosten?",
    a: "In Deutschland trägt der Anlagenbetreiber die Kosten für den Anschluss bis zum Netzverknüpfungspunkt (§ 16 EEG), der Netzbetreiber die Kosten für den Ausbau seines Netzes (§ 17 EEG). Für reine Einspeiser fällt in der Regel kein Baukostenzuschuss an – wohl aber für Netzbezug, etwa wenn ein Speicher aus dem Netz lädt.",
    nurDE: "Regeln zu Anschlusskosten",
  },
  {
    q: "Wie schnell muss der Netzbetreiber antworten?",
    a: `Nach § 8 Abs. 5 EEG muss er nach Eingang des Netzanschlussbegehrens unverzüglich einen genauen Zeitplan für die Bearbeitung übermitteln und spätestens nach ${N.pruefWochen} Wochen das Ergebnis der Netzverträglichkeitsprüfung samt Kostenvoranschlag vorlegen (§ 8 Abs. 6 EEG) – vorausgesetzt, das Begehren ist vollständig. Der Bau selbst dauert länger: je nach Ebene und Kapazität von rund einem bis zu mehreren Jahren.`,
    nurDE: "Fristen",
  },
  {
    q: "Was bedeutet Überbauung?",
    a: "Bei der Überbauung ist die Modulleistung größer als die Einspeiseleistung am Netzanschluss. Weil ein Solarpark seine volle Leistung nur an wenigen Stunden im Jahr erreicht, geht bei 70–80 % Anschlussleistung oft nur ein kleiner Teil des Ertrags verloren – mit einem Speicher noch weniger. Über eine flexible Netzanschlussvereinbarung nach § 8a EEG lässt sich die maximale Einspeisung vertraglich begrenzen.",
    nurDE: "Regeln",
  },
  {
    q: "Lohnt sich die Clusterung mit Nachbarprojekten?",
    a: `Oft ja: Eine gemeinsame Trasse oder ein gemeinsames Umspannwerk teilt die größten Kostenblöcke. Im Rechner nehmen wir an, dass Sie etwa ${fmt((1 - CLUSTER_ANTEIL) * 100)} % dieser Kosten tragen. Wichtig sind klare Verträge zu Kostenaufteilung, Bauabfolge und Haftung, falls ein Partner später baut.`,
    nurDE: "Kostenwerte",
  },
  {
    q: "Wie ist es in Österreich und der Schweiz?",
    a: "In Österreich erfolgt der Netzzugang beim Verteilnetzbetreiber; es fallen Netzzutrittsentgelte und – für Bezug – Netzbereitstellungsentgelte an, Kapazitäten werden je Netzbereich veröffentlicht. In der Schweiz gelten die Anschlussbedingungen des Verteilnetzbetreibers; notwendige Netzverstärkungen werden in der Regel über die Netzkosten getragen. Die Kostenbausteine im Rechner sind auf Deutschland kalibriert.",
  },
];

const FAQ_EN = [
  {
    q: "What does a solar park’s grid connection cost?",
    a: `That depends mainly on distance and voltage level. As a rough guide, we calculate with around ${e.eur(FREIFLAECHE.kabelProMeter)} per metre of medium-voltage route, ${e.eur(FREIFLAECHE.netzanschlussFixProMwp)} per MWp for transfer and transformer stations and – for large parks – a dedicated 110/20 kV substation costing millions. A few kilometres to the medium-voltage grid are usually quite affordable; long 110 kV routes can tip the economics.`,
    nurDE: "Cost figures",
  },
  {
    q: "Who bears which costs?",
    a: "In Germany, the plant operator bears the costs of the connection up to the grid connection point (§ 16 EEG), and the grid operator bears the costs of expanding its grid (§ 17 EEG). Pure feed-in plants usually pay no construction cost contribution – but grid consumption does, for example when a storage system charges from the grid.",
    nurDE: "Rules on connection costs",
  },
  {
    q: "How quickly must the grid operator respond?",
    a: `Under § 8(5) EEG, after receiving the grid connection request it must promptly send a precise schedule for processing it, and must present the result of the grid compatibility check, including a cost estimate, within ${N.pruefWochen} weeks at the latest (§ 8(6) EEG) – provided the request is complete. Construction itself takes longer: depending on voltage level and capacity, from around one to several years.`,
    nurDE: "Deadlines",
  },
  {
    q: "What does overbuilding mean?",
    a: "With overbuilding, the module capacity is greater than the feed-in capacity at the grid connection. Because a solar park only reaches its full output in a few hours a year, often only a small part of the yield is lost at 70–80% connection capacity – even less with storage. A flexible grid connection agreement under § 8a EEG can contractually limit the maximum feed-in.",
    nurDE: "Rules",
  },
  {
    q: "Is clustering with neighbouring projects worthwhile?",
    a: `Often yes: a shared cable route or a shared substation splits the largest cost blocks. In the calculator, we assume that you bear about ${e.pct((1 - CLUSTER_ANTEIL) * 100)} of these costs. Clear contracts on cost sharing, construction sequence and liability are important in case a partner builds later.`,
    nurDE: "Cost figures",
  },
  {
    q: "How does it work in Austria and Switzerland?",
    a: "In Austria, grid access is granted by the distribution system operator; grid access fees and – for consumption – grid provision fees apply, and capacities are published per grid area. In Switzerland, the connection conditions of the distribution system operator apply; necessary grid reinforcements are usually covered by grid costs. The cost components in the calculator are calibrated for Germany.",
  },
];

const DE = {
  breadcrumb: "Netzanschluss-Check",
  eyebrow: "Für Eigentümer, Projektierer und Investoren",
  title: (
    <>
      Der Netzanschluss entscheidet – <span className="ov-text-gradient-light">prüfen Sie ihn zuerst.</span>
    </>
  ),
  lead: "Größe, Entfernung, Spannungsebene und Netzkapazität eingeben: Sie erhalten grobe Kosten für Trasse, Stationen und Umspannwerk, einen Zeitrahmen, die wichtigsten Risiken und konkrete Tipps – inklusive Überbauung und Speicher.",
  chips: ["Kosten mit Spanne", "Zeitrahmen", "Überbauung & Speicher", "Ablauf-Begleiter DE · AT · CH"],
  app: {
    name: "Netzanschluss-Check Solarpark",
    description: "Grobe Kosten- und Zeitschätzung für den Netzanschluss eines Solarparks nach Größe, Entfernung, Spannungsebene und Netzkapazität – mit Überbauung, Speicher, Clusterung, Risiken und Tipps.",
    featureList: ["Kostenbausteine Kabel, Stationen, Umspannwerk", "Automatische Wahl der Spannungsebene", "Überbauung mit Abregelungsverlust", "Speicher und Baukostenzuschuss", "Zeitrahmen und Risiken", "Tipps zu § 8 und § 8a EEG", "Ablauf-Begleiter mit Dokumenten-Checkliste je Land (DE, AT, CH)", "Typische Ablehnungsgründe und Gegenmittel"],
  },
  annahmen: [
    ["MS-Kabeltrasse", `${fmt(FREIFLAECHE.kabelProMeter)} €/m`],
    ["Übergabe- & Trafostationen", `${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp`],
    ["Einschleifen MS-Leitung", `${fmt(N.einschleifen / 1000)} Tsd. €`],
    ["Schaltfeld Umspannwerk", `${fmt(N.uwFeld.min / 1000)}–${fmt(N.uwFeld.max / 1000)} Tsd. €`],
    ["110-kV-Kabel", `${fmt(N.hsKabelProKm.min / 1e6, 1)}–${fmt(N.hsKabelProKm.max / 1e6, 1)} Mio. €/km`],
    ["Umspannwerk 110/20 kV", `${fmt(N.kundenUwFix / 1e6)} Mio. € + ${fmt(N.kundenUwProMva / 1000)} Tsd. €/MVA`],
    ["Leistung je 20-kV-System", `${fmt(N.msSystemMw)} MW`],
    ["BKZ Speicher (Beispiel)", `${fmt(SPEICHER.bkzProKw.ms)} / ${fmt(SPEICHER.bkzProKw.hs)} €/kW MS/HS`],
    ["Prüffrist Netzbetreiber", `${N.pruefWochen} Wochen (§ 8 Abs. 6 EEG)`],
  ],
  quellen: [
    { name: "§ 8 EEG", url: "https://www.gesetze-im-internet.de/eeg_2014/__8.html" },
    { name: "§ 8a EEG", url: "https://www.gesetze-im-internet.de/eeg_2014/__8a.html" },
    { name: "§§ 16, 17 EEG", url: "https://www.gesetze-im-internet.de/eeg_2014/__16.html" },
    { name: "Kostenbausteine: eigene Einschätzung ÖkoInvest" },
  ],
  faqTitel: "Netzanschluss – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung und Pachtspanne Ihrer Fläche – die Netzentfernung fließt direkt ein." },
    { href: seitenPfad("/rechner/grossspeicher"), titel: "Großspeicher-Rechner", text: "Speicher am selben Anschluss: Erlöse, Baukostenzuschuss und Rendite." },
    { href: "/ratgeber/netzanschluss-solarpark", titel: "Ratgeber Netzanschluss", text: "Netzanschlussbegehren, Verknüpfungspunkt und Zeitplan im Detail." },
    { href: seitenPfad("/prozess"), titel: "Unser Prozess", text: "Von der Flächensicherung bis zur Inbetriebnahme – wann der Netzanschluss kommt." },
  ],
  cta: {
    eyebrow: "Netzanschluss zuerst",
    title: "Wir fragen den Netzanschluss für Ihre Fläche an.",
    text: "Als Projektentwickler stellen wir das Netzanschlussbegehren, prüfen Clusterung mit Nachbarprojekten und planen Überbauung und Speicher – für Flächeneigentümer kostenfrei.",
    primary: { label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") },
    secondary: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
  },
};

const EN = {
  breadcrumb: "Grid connection check",
  eyebrow: "For landowners, developers and investors",
  title: (
    <>
      The grid connection decides – <span className="ov-text-gradient-light">check it first.</span>
    </>
  ),
  lead: "Enter size, distance, voltage level and grid capacity: you get rough costs for the cable route, stations and substation, a time frame, the main risks and concrete tips – including overbuilding and storage.",
  chips: ["Costs with range", "Time frame", "Overbuilding & storage", "Process companion DE · AT · CH"],
  app: {
    name: "Solar park grid connection check",
    description: "Rough cost and time estimate for a solar park’s grid connection by size, distance, voltage level and grid capacity – with overbuilding, storage, clustering, risks and tips.",
    featureList: ["Cost components: cable, stations, substation", "Automatic choice of voltage level", "Overbuilding with curtailment loss", "Storage and construction cost contribution", "Time frame and risks", "Tips on § 8 and § 8a EEG", "Process companion with document checklist per country (DE, AT, CH)", "Typical rejection reasons and remedies"],
  },
  annahmen: [
    ["MV cable route", e.eur(FREIFLAECHE.kabelProMeter, "/m")],
    ["Transfer & transformer stations", e.eur(FREIFLAECHE.netzanschlussFixProMwp, "/MWp")],
    ["Loop-in to MV line", `€${e.fmt(N.einschleifen / 1000)}k`],
    ["Substation switchgear bay", `€${e.fmt(N.uwFeld.min / 1000)}–${e.fmt(N.uwFeld.max / 1000)}k`],
    ["110 kV cable", `€${e.fmt(N.hsKabelProKm.min / 1e6, 1)}–${e.fmt(N.hsKabelProKm.max / 1e6, 1)}m/km`],
    ["110/20 kV substation", `€${e.fmt(N.kundenUwFix / 1e6)}m + €${e.fmt(N.kundenUwProMva / 1000)}k/MVA`],
    ["Capacity per 20 kV system", `${e.fmt(N.msSystemMw)} MW`],
    ["Storage contribution (example)", `${e.eur(SPEICHER.bkzProKw.ms)} / ${e.eur(SPEICHER.bkzProKw.hs, "/kW")} MV/HV`],
    ["Grid operator review period", `${N.pruefWochen} weeks (§ 8(6) EEG)`],
  ],
  quellen: [{ name: "§ 8 EEG" }, { name: "§ 8a EEG" }, { name: "§§ 16, 17 EEG" }, { name: "Cost components: ÖkoInvest’s own estimate" }],
  faqTitel: "Grid connection – good to know",
  querverweise: [
    { titel: "Land check", text: "Suitability and lease range of your land – the distance to the grid is factored in directly." },
    { titel: "Battery storage calculator", text: "Storage at the same connection: revenues, construction cost contribution and return." },
    { titel: "Guide: grid connection", text: "Grid connection request, connection point and schedule in detail." },
    { titel: "Our process", text: "From securing the land to commissioning – when the grid connection comes." },
  ],
  cta: {
    eyebrow: "Grid connection first",
    title: "We request the grid connection for your land.",
    text: "As a project developer, we submit the grid connection request, assess clustering with neighbouring projects and plan overbuilding and storage – free of charge for landowners.",
    primary: { label: "Have your land checked" },
    secondary: { label: "Offer a project" },
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
      toolId="netzanschluss"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={
        <>
          <NetzanschlussRechner />
          {/* Netzanschluss 2.0 (Welle 4, Paket NETZ2): Ablauf-Begleiter je Land – auch für AT/CH,
              deshalb außerhalb der Länder-Sperre des Rechners */}
          <NetzanschlussBegleiter />
        </>
      }
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the grid connection check works</h2>
              <p>
                The <strong>connection capacity</strong> follows from module capacity and overbuilding. Up to about {e.fmt(N.grenzeMsMw)} MW, a connection to a medium-voltage line is usually possible; up to about {e.fmt(N.grenzeUwMw)} MW to the medium-voltage busbar of a substation; above that, usually only with a dedicated substation at 110 kV. For every {e.fmt(N.msSystemMw)} MW or part thereof, we calculate one 20 kV cable system; additional systems in the same route cost only {e.pct(N.zusatzSystemFaktor * 100)} because of the shared civil works.
              </p>
              <p>
                The cost range runs from {e.pct(SPANNE.min * 100)} to {e.pct(SPANNE.max * 100)} of the mid-point – crossings of roads, railways and watercourses, ground conditions and delivery times can push costs up considerably. The <strong>time frame</strong> counts from the complete grid connection request and lengthens if capacity is unknown or scarce.
              </p>
              <p>
                We evaluate <strong>overbuilding</strong> with an approximation for a fixed, south-facing plant: around {e.pct(N.abregelung.find((x) => x[0] === 0.8)[1] * 100, 1)} yield loss at 80% connection capacity, around {e.pct(N.abregelung.find((x) => x[0] === 0.7)[1] * 100)} at 70%. A storage system that draws from the grid pays a construction cost contribution (example rate {e.eur(SPEICHER.bkzProKw.ms, "/kW")} at medium voltage).
              </p>
              <p>
                More on the process in the guide <Link href="/ratgeber/netzanschluss-solarpark">Solar park grid connection</Link>; the effect of grid costs on the return is shown by the <Link href={seitenPfad("/rechner/solarpark")}>solar park return calculator</Link>.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>So rechnet der Netzanschluss-Check</h2>
              <p>
                Aus Modulleistung und Überbauung ergibt sich die <strong>Anschlussleistung</strong>. Bis etwa {fmt(N.grenzeMsMw)} MW ist in der Regel ein Anschluss an eine
                Mittelspannungsleitung möglich, bis etwa {fmt(N.grenzeUwMw)} MW an der Mittelspannungs-Sammelschiene eines Umspannwerks, darüber meist nur mit eigenem Umspannwerk an 110 kV. Je
                angefangene {fmt(N.msSystemMw)} MW rechnen wir ein 20-kV-Kabelsystem; weitere Systeme in derselben Trasse kosten wegen des gemeinsamen Tiefbaus nur {fmt(N.zusatzSystemFaktor * 100)} %.
              </p>
              <p>
                Die Kostenspanne reicht von {fmt(SPANNE.min * 100)} % bis {fmt(SPANNE.max * 100)} % des Mittelwerts – Querungen von Straßen, Bahnlinien und Gewässern, Bodenverhältnisse und
                Lieferzeiten können deutlich nach oben wirken. Der <strong>Zeitrahmen</strong> zählt ab dem vollständigen Netzanschlussbegehren und verlängert sich, wenn die Kapazität unbekannt
                oder knapp ist.
              </p>
              <p>
                Die <strong>Überbauung</strong> bewerten wir mit einer Näherung für eine fest aufgeständerte Süd-Anlage: bei 80 % Anschlussleistung rund{" "}
                {fmt(N.abregelung.find((x) => x[0] === 0.8)[1] * 100, 1)} % Ertragsverlust, bei 70 % rund {fmt(N.abregelung.find((x) => x[0] === 0.7)[1] * 100)} %. Ein Speicher mit Netzbezug
                zahlt einen Baukostenzuschuss (Beispielsatz {fmt(SPEICHER.bkzProKw.ms)} €/kW in der Mittelspannung).
              </p>
              <p>
                Mehr zum Ablauf im Ratgeber <Link href="/ratgeber/netzanschluss-solarpark">Netzanschluss Solarpark</Link>; die Wirkung der Netzkosten auf die Rendite zeigt der{" "}
                <Link href={seitenPfad("/rechner/solarpark")}>Solarpark-Renditerechner</Link>.
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

export const generateMetadata = seitenMetadata("/rechner/netzanschluss", metadata, { en: metadataEn });

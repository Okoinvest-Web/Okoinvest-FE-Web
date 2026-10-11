// src/app/(stamm)/kommunen/ratsvorlage/page.js – Kommunal-Rechner 2.0 mit Ratsvorlage (Welle 3, Paket B8)
//
// Einnahmen der Gemeinde wie /rechner/kommune (Rechenlogik unverändert) plus Landesrecht des Bundeslands; für
// Österreich die Widmungsschritte des Bundeslands ohne Geldwerte; für die Schweiz der Länderhinweis
// (tools.js: laender ["DE", "AT"]). Lead: druckfertige Ratsvorlage (Muster) über den Bericht-Baustein
// (/api/rechner/bericht, Rechner „ratsvorlage“, Vorgangstyp „kommune“ → Routing je Land).
// noindex bis zur Fachprüfung (src/lib/land/seiten.js index: false; englisch src/lib/sprache/seiten.js index: false).
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur). Regionsdaten in der Sprache der Seite.

import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import RatsvorlageWerkzeug from "@/components/Kommune/Ratsvorlage/RatsvorlageWerkzeug";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";
import { KOMMUNE, STAND } from "@/lib/invest/markt";
import { faktWert } from "@/lib/fakten";
import { BUNDESLAENDER } from "@/lib/rechner/kommunePflichten";
import { widmungskitAlle } from "@/lib/kommune/widmung";
import { regionName } from "@/data/regionen";
import { faqFuerLand } from "@/components/Land/Laenderteile";

const PFAD = seitenPfad("/kommunen/ratsvorlage");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Ratsvorlage Solarpark: Einnahmen & Landesrecht | ÖkoInvest",
  description:
    "Einnahmen der Gemeinde aus § 6 EEG, Gewerbesteuer und Pacht plus Landesrecht – als druckfertige Ratsvorlage. Jetzt Muster für den Gemeinderat erstellen.",
  keywords: ["Ratsvorlage Solarpark", "Beschlussvorlage Freiflächen-PV", "Gemeindebeteiligung Landesgesetz", "§ 6 EEG Gemeinderat", "Widmung Photovoltaik Gemeinde"],
});
// Fachprüfung offen (Register index: false): auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const metadataEn = rechnerMetadataEn({
  title: "Solar park council paper: income & state law | ÖkoInvest",
  description:
    "Municipal income from § 6 EEG, trade tax and lease, plus the states’ participation laws – as a print-ready council paper. Create your template now.",
  keywords: ["council paper solar park", "municipal resolution ground-mounted PV", "municipal participation state law", "§ 6 EEG municipal council", "zoning photovoltaics municipality Austria"],
});

const z = formate("de");
const e = formate("en");

const FAQ = [
  {
    q: "Was steht in der Ratsvorlage?",
    a: "Ein Beschlussvorschlag als Muster, der Sachverhalt mit Ihrer Gemeinde und Ihrem Bundesland, die finanziellen Auswirkungen aus der Rechnung, das Landesrecht mit Quelle, das weitere Verfahren und ein Annahmenbuch mit Quelle und Stand jeder Annahme. Felder wie Sitzungstermin und Vorlage-Nummer bleiben für Ihre Verwaltung frei.",
  },
  {
    q: "Ist die Vorlage rechtlich geprüft?",
    a: "Nein. Sie ist ein Muster ohne Rechtsberatung. Zuständigkeiten, Wortlaut und Verfahren richten sich nach der Gemeindeordnung Ihres Landes und der Geschäftsordnung Ihres Gemeinderats. Lassen Sie die Vorlage vor der Verwendung von Ihrer Verwaltung bzw. der Kommunalaufsicht prüfen.",
  },
  {
    q: "Warum wird die Zahlung nach Landesrecht nicht zur Summe addiert?",
    nurDE: "Regeln zur Gemeindebeteiligung",
    a: "Weil jedes Landesgesetz selbst regelt, ob und wie die Landeszahlung mit der Zahlung nach § 6 EEG verrechnet wird – in Bayern etwa können die 0,2 ct über eine Vereinbarung nach § 6 EEG erbracht werden. Wir zeigen den Betrag deshalb getrennt, als Orientierung im ersten Betriebsjahr. Alle Landeswerte sind am Gesetzestext noch zu prüfen und entsprechend markiert.",
  },
  {
    q: "Welche Bundesländer haben ein Beteiligungsgesetz für Solarparks?",
    nurDE: "Regeln zur Gemeindebeteiligung",
    a: "Nach der Länderübersicht der Fachagentur Wind und Solar Bayern (ab 5 MW), Brandenburg, Mecklenburg-Vorpommern, Niedersachsen, das Saarland, Sachsen und Sachsen-Anhalt. In den übrigen Ländern bleibt die freiwillige Zahlung nach § 6 EEG das zentrale Instrument. Für Sachsen nennen wir keinen Betrag, weil das Gesetz im September 2025 novelliert wurde und wir den geltenden Wert noch prüfen.",
  },
  {
    q: "Gibt es die Ratsvorlage auch für Österreich und die Schweiz?",
    a: "Für Österreich ja, ohne Geldwerte: Die Vorlage stellt Ablauf, Stellen und Prüfpunkte der Widmung in Ihrem Bundesland mit Quellen zusammen; Pacht- und Rechenwerte für Österreich werden geprüft. Für die Schweiz ist die Vorlage in Vorbereitung – wir besprechen Ihr Vorhaben gern persönlich.",
  },
  {
    q: "Was passiert mit meinen Angaben?",
    a: "Das Ergebnis sehen Sie ohne Angaben. Für die Ratsvorlage geben Sie Name und E-Mail an, Telefon ist freiwillig. Erst wenn Sie den Link in der Bestätigungs-E-Mail öffnen, erstellen wir die Vorlage und legen eine Anfrage bei unserem Kommunen-Team in Ihrem Land an.",
  },
];

const FAQ_EN = [
  {
    q: "What does the council paper contain?",
    a: "A draft resolution as a template, the facts with your municipality and federal state, the financial impact from the calculation, the state law with its source, the further procedure and a list of assumptions with source and date. Fields such as the meeting date and paper number are left blank for your administration. The council paper itself is in German.",
  },
  {
    q: "Has the template been legally reviewed?",
    a: "No. It is a template without legal advice. Responsibilities, wording and procedure follow your state’s municipal code and your council’s rules of procedure. Have the paper checked by your administration or the municipal supervisory authority before use.",
  },
  {
    q: "Why is the payment under state law not added to the total?",
    nurDE: "Rules on municipal participation",
    a: "Because each state law itself governs whether and how the state payment is offset against the payment under § 6 EEG – in Bavaria, for example, the 0.2 ct can be provided through an agreement under § 6 EEG. We therefore show the amount separately, as a guide value for the first operating year. All state values still have to be checked against the legal text and are marked accordingly.",
  },
  {
    q: "Which federal states have a participation law for solar parks?",
    nurDE: "Rules on municipal participation",
    a: "According to the overview of the Fachagentur Wind und Solar: Bavaria (from 5 MW), Brandenburg, Mecklenburg-Western Pomerania, Lower Saxony, Saarland, Saxony and Saxony-Anhalt. In the other states, the voluntary payment under § 6 EEG remains the key instrument. For Saxony we do not state an amount, because the act was amended in September 2025 and we are still checking the current rate.",
  },
  {
    q: "Is the council paper also available for Austria and Switzerland?",
    a: "For Austria, yes, without monetary values: the paper compiles the procedure, authorities and checkpoints for zoning in your federal state with sources; lease rates and figures for Austria are being reviewed. For Switzerland, the paper is in preparation – we are happy to discuss your project personally.",
  },
  {
    q: "What happens to my details?",
    a: "You see the result without entering any details. For the council paper you enter your name and email; phone is optional. Only when you open the link in the confirmation email do we create the paper and open an enquiry with our municipal team in your country.",
  },
];

const ANNAHMEN = {
  de: () => [
    ["§ 6 EEG", `${z.fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh`],
    ["Zerlegung Solar (§ 29 GewStG)", `${z.fmt(KOMMUNE.gewerbesteuerStandort * 100)} % Standort`],
    ["Hebesatz Ø Deutschland", `${z.fmt(KOMMUNE.hebesatz * 100)} %`],
    ["Länder mit Beteiligungsgesetz", (faktWert("kommune.laenderMitBeteiligungsgesetz", "DE") || []).join(", ")],
    ["Landeswerte", "Prüfung am Gesetzestext ausstehend"],
    ["Landeszahlung", "getrennt, nicht in der Summe"],
    ["Österreich", "ohne Geldwerte, Widmung aus Regionsdaten"],
    ["Stand", STAND],
  ],
  en: () => [
    ["§ 6 EEG", `${e.fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh`],
    ["Allocation for solar (§ 29 GewStG)", `${e.pct(KOMMUNE.gewerbesteuerStandort * 100)} to the site`],
    ["Average multiplier, Germany", e.pct(KOMMUNE.hebesatz * 100)],
    ["States with a participation law", (faktWert("kommune.laenderMitBeteiligungsgesetz", "DE") || []).join(", ")],
    ["State values", "review against the legal text pending"],
    ["State payment", "shown separately, not in the total"],
    ["Austria", "no monetary values, zoning from regional data"],
    ["As of", datumText(STAND, "en")],
  ],
};

const DE = {
  breadcrumb: "Ratsvorlage Solarpark",
  eyebrow: "Für Kommunen · Kommunal-Rechner 2.0",
  title: (
    <>
      Vom Solarpark <span className="ov-text-gradient-light">zur Ratsvorlage.</span>
    </>
  ),
  lead: "Einnahmen der Gemeinde aus § 6 EEG, Gewerbesteuer und Pacht, dazu das Beteiligungsgesetz Ihres Bundeslands – und auf Wunsch eine druckfertige Ratsvorlage als Muster für Ihren Gemeinderat.",
  chips: ["16 Bundesländer, Landesrecht mit Quelle", "Österreich: Widmung je Bundesland", "Ergebnis ohne Anmeldung", "Ratsvorlage als Muster"],
  app: {
    name: "Kommunal-Rechner 2.0 mit Ratsvorlage",
    description: "Berechnet die Einnahmen einer Gemeinde aus einem Solarpark, zeigt die Beteiligungspflichten des Bundeslands und erstellt eine druckfertige Ratsvorlage als Muster.",
    featureList: ["§ 6 EEG, Gewerbesteuer und Pacht", "Beteiligungsgesetze der Bundesländer mit Quelle", "Widmungsschritte je österreichischem Bundesland", "Ratsvorlage mit Beschlussvorschlag (Muster)", "Annahmenbuch mit Quelle und Stand"],
  },
  quellen: [
    { name: "EEG 2023 § 6", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html" },
    { name: "GewStG § 29", url: "https://www.gesetze-im-internet.de/gewstg/__29.html" },
    { name: "Fachagentur Wind und Solar – Länderübersicht", url: "https://www.fachagentur-wind-solar.de/solar/finanzielle-teilhabe/regelungen-zur-finanziellen-teilhabe" },
    { name: "Landesgesetze und Widmung: Regionsdaten ÖkoInvest (Quelle je Bundesland)" },
  ],
  faqTitel: "Ratsvorlage und Landesrecht",
  querverweise: [
    { href: seitenPfad("/kommunen/widmungskit"), titel: "Widmungskit Österreich", text: "Ablauf, Stellen und Prüfpunkte der Umwidmung je Bundesland – zum Abhaken und Drucken." },
    { href: seitenPfad("/rechner/kommune"), titel: "Kommunal-Rechner", text: "§ 6 EEG, Gewerbesteuer und Pacht Jahr für Jahr – mit Bericht." },
    { href: seitenPfad("/kommunen"), titel: "Für Kommunen & Stadtwerke", text: "Wertschöpfung, Bauleitplanung, Kriterienkataloge und Bürgerbeteiligung." },
    { href: seitenPfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "Energy Sharing, EEG in Österreich und LEG in der Schweiz." },
  ],
  cta: {
    eyebrow: "Für Kommunen",
    title: "Wir stellen das Vorhaben im Gemeinderat vor.",
    text: "Offen, mit Zahlen und ohne Verpflichtung – Projekt, Beteiligungsmodell und Verfahren aus einer Hand.",
    primary: { label: "Gespräch anfragen", href: seitenPfad("/kommunen#anfrage") },
    secondary: { label: "Für Kommunen", href: seitenPfad("/kommunen") },
  },
};

const EN = {
  breadcrumb: "Council paper for solar parks",
  eyebrow: "For municipalities · municipal calculator 2.0",
  title: (
    <>
      From solar park <span className="ov-text-gradient-light">to council paper.</span>
    </>
  ),
  lead: "Municipal income from § 6 EEG, trade tax and lease, plus the participation law of your federal state – and, if you wish, a ready-to-print council paper template for your municipal council.",
  chips: ["16 German states, state law with source", "Austria: zoning per federal state", "Result without sign-up", "Council paper as a template"],
  app: {
    name: "Municipal calculator 2.0 with council paper",
    description: "Calculates a municipality’s income from a solar park, shows the participation obligations of the federal state and creates a ready-to-print council paper template.",
    featureList: ["§ 6 EEG, trade tax and lease", "Participation laws of the German states with source", "Zoning steps per Austrian federal state", "Council paper with draft resolution (template)", "Assumptions with source and date"],
  },
  quellen: [
    { name: "EEG 2023 § 6 (German Renewable Energy Sources Act)" },
    { name: "GewStG § 29 (German Trade Tax Act)" },
    { name: "Fachagentur Wind und Solar – overview of the states" },
    { name: "State laws and zoning: ÖkoInvest regional data (source per federal state)" },
  ],
  faqTitel: "Council paper and state law",
  querverweise: [
    { titel: "Zoning kit Austria", text: "Procedure, authorities and checkpoints for rezoning per federal state – to tick off and print." },
    { titel: "Municipal calculator", text: "§ 6 EEG, trade tax and lease year by year – with report." },
    { titel: "For municipalities & public utilities", text: "Local value creation, land-use planning, criteria catalogues and citizen participation." },
    { titel: "Energy communities", text: "Energy sharing, EEG in Austria and LEG in Switzerland." },
  ],
  cta: {
    eyebrow: "For municipalities",
    title: "We present the project to the municipal council.",
    text: "Openly, with figures and without obligation – project, participation model and procedure from a single source.",
    primary: { label: "Request a meeting" },
    secondary: { label: "For municipalities" },
  },
};

const ERKLAERUNG = {
  de: (
    <div className="ov-prose max-w-none">
      <h2>So rechnet der Kommunal-Rechner 2.0</h2>
      <p>
        <strong>Einnahmen:</strong> genau wie der Kommunal-Rechner – § 6 EEG für geförderten Strom in der EEG-Förderphase, Gewerbesteuer aus dem Betriebsergebnis des Parks mit Abschreibung, Zinsen
        und Verlustvortrag, Pacht nur auf Gemeindeflächen. Die Ertragsregion folgt aus dem Bundesland.
      </p>
      <p>
        <strong>Landesrecht:</strong> Für die sieben Länder mit Beteiligungsgesetz rechnen wir einen Orientierungsbetrag für das erste Betriebsjahr nach der Formel des Gesetzes – je Kilowattstunde
        Einspeisung oder je Megawatt Leistung. Er steht getrennt neben der Summe, weil das Landesgesetz regelt, wie er mit § 6 EEG zusammenspielt.
      </p>
      <p>
        <strong>Österreich:</strong> Eine Gewerbesteuer wie in Deutschland gibt es nicht, und § 6 EEG ist deutsches Recht. Wir zeigen Ablauf, Stellen und Prüfpunkte der Widmung Ihres Bundeslands mit
        Quellen – ohne Geldwerte, bis die Rechenwerte für Österreich geprüft sind.
      </p>
      <h3>Vereinfachungen</h3>
      <ul>
        <li>Keine Mindestbesteuerung beim Verlustvortrag, keine Sonderabschreibungen.</li>
        <li>Ausnahmen der Landesgesetze (z. B. Agri-PV, Bürgerenergiegesellschaften) werden genannt, aber nicht gerechnet.</li>
        <li>Umlagen im kommunalen Finanzausgleich sind nicht berücksichtigt.</li>
      </ul>
    </div>
  ),
  en: (
    <div className="ov-prose max-w-none">
      <h2>How the municipal calculator 2.0 works</h2>
      <p>
        <strong>Income:</strong> exactly like the municipal calculator – § 6 EEG for subsidised power during the EEG support phase, trade tax from the park’s operating result with depreciation,
        interest and loss carry-forward, lease only on municipal land. The yield region follows from the federal state.
      </p>
      <p>
        <strong>State law:</strong> for the seven states with a participation law, we calculate a guide value for the first operating year using the formula of the law – per kilowatt hour fed in or
        per megawatt of capacity. It is shown separately next to the total, because the state law governs how it interacts with § 6 EEG.
      </p>
      <p>
        <strong>Austria:</strong> there is no trade tax as in Germany, and § 6 EEG is German law. We show the procedure, authorities and checkpoints for zoning in your federal state with sources –
        without monetary values until the figures for Austria have been reviewed.
      </p>
      <h3>Simplifications</h3>
      <ul>
        <li>No minimum taxation on loss carry-forwards, no special depreciation.</li>
        <li>Exceptions in the state laws (e.g. agrivoltaics, community energy companies) are stated but not calculated.</li>
        <li>Levies in the municipal fiscal equalisation scheme are not taken into account.</li>
      </ul>
    </div>
  ),
};

// Erklärung je Land: Österreich ohne deutsche Rechenregeln, Schweiz nur der Stand (Werkzeug zeigt den Länderhinweis)
const ERKLAERUNG_LAND = {
  AT: {
    de: (
      <div className="ov-prose max-w-none">
        <h2>So arbeitet das Werkzeug für Österreich</h2>
        <p>
          Eine Gewerbesteuer wie in Deutschland gibt es nicht, und die Zahlung nach § 6 EEG ist deutsches Recht. Für Ihr Bundesland zeigen wir deshalb, wie die <strong>Widmung</strong> läuft,
          welche <strong>Stellen</strong> beteiligt sind und welche <strong>Prüfpunkte</strong> das Land setzt – jeweils mit Quelle aus unseren Regionsdaten.
        </p>
        <p>Pacht- und Rechenwerte für Österreich werden geprüft; die Ratsvorlage für Österreich nennt deshalb keine Beträge.</p>
      </div>
    ),
    en: (
      <div className="ov-prose max-w-none">
        <h2>How the tool works for Austria</h2>
        <p>
          There is no trade tax as in Germany, and the payment under § 6 EEG is German law. For your federal state we therefore show how <strong>zoning</strong> works, which{" "}
          <strong>authorities</strong> are involved and which <strong>checkpoints</strong> the state sets – each with a source from our regional data.
        </p>
        <p>Lease rates and figures for Austria are being reviewed; the council paper for Austria therefore states no amounts.</p>
      </div>
    ),
  },
  CH: {
    de: (
      <div className="ov-prose max-w-none">
        <h2>Schweiz: in Vorbereitung</h2>
        <p>Bewilligung und Beteiligung hängen in der Schweiz von Kanton und Gemeinde ab. Die Ratsvorlage und die Rechenwerte für die Schweiz bereiten wir vor; bis dahin besprechen wir Ihr Vorhaben persönlich.</p>
      </div>
    ),
    en: (
      <div className="ov-prose max-w-none">
        <h2>Switzerland: in preparation</h2>
        <p>In Switzerland, permits and participation depend on the canton and municipality. We are preparing the council paper and the figures for Switzerland; until then, we discuss your project personally.</p>
      </div>
    ),
  },
};

// Kopf je Land: In Österreich und der Schweiz keine deutschen Rechtsbegriffe (§ 6 EEG, Gewerbesteuer) im Hero
const KOPF_LAND = {
  AT: {
    de: {
      lead: "Ablauf, beteiligte Stellen und Prüfpunkte der Widmung in Ihrem Bundesland – mit Quelle zu jedem Punkt, und auf Wunsch eine druckfertige Ratsvorlage als Muster für Ihren Gemeinderat.",
      chips: ["Alle neun Bundesländer", "Quelle zu jedem Prüfpunkt", "Ergebnis ohne Anmeldung", "Ratsvorlage als Muster"],
      featureList: ["Widmungsschritte je Bundesland", "Beteiligte Stellen und ihre Rolle", "Prüfpunkte mit Quelle", "Ratsvorlage mit Beschlussvorschlag (Muster)", "Annahmenbuch mit Quelle und Stand"],
    },
    en: {
      lead: "The zoning procedure, the authorities involved and the checkpoints in your federal state – with a source for every point, and, if you wish, a ready-to-print council paper template for your municipal council.",
      chips: ["All nine federal states", "A source for every checkpoint", "Result without sign-up", "Council paper as a template"],
      featureList: ["Zoning steps per federal state", "Authorities involved and their role", "Checkpoints with source", "Council paper with draft resolution (template)", "Assumptions with source and date"],
    },
  },
  CH: {
    de: {
      lead: "Die Ratsvorlage für die Schweiz bereiten wir vor: Bewilligung und Beteiligung hängen von Kanton und Gemeinde ab. Bis dahin besprechen wir Ihr Vorhaben persönlich.",
      chips: ["Schweiz in Vorbereitung", "Gespräch statt ungeprüfter Werte"],
      featureList: ["Ratsvorlage für die Schweiz in Vorbereitung"],
    },
    en: {
      lead: "We are preparing the council paper for Switzerland: permits and participation depend on the canton and municipality. Until then, we discuss your project personally.",
      chips: ["Switzerland in preparation", "A conversation instead of unreviewed figures"],
      featureList: ["Council paper for Switzerland in preparation"],
    },
  },
};

/** Daten für das Werkzeug:Bundesland-Namen in der Sprache der Seite, Widmungskit der AT-Länder (Regionsdaten) */
function werkzeugDaten(sprache) {
  const namen = Object.fromEntries([...BUNDESLAENDER.DE, ...BUNDESLAENDER.AT].map((b) => [b.slug, regionName(b.slug, sprache)]));
  const sortiert = (liste) => liste.map((b) => b.slug).sort((a, b) => namen[a].localeCompare(namen[b], sprache === "en" ? "en" : "de"));
  const widmung = Object.fromEntries(
    widmungskitAlle(sprache).map((k) => [k.slug, { name: k.name, ablauf: k.ablauf, stellen: k.stellen, pruefpunkte: k.pruefpunkte.map((p) => ({ titel: p.titel, quelle: p.quelle })), href: k.href }])
  );
  return { namen, bundeslaender: { DE: sortiert(BUNDESLAENDER.DE), AT: sortiert(BUNDESLAENDER.AT) }, widmung };
}

export default async function RatsvorlagePage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  const daten = werkzeugDaten(sprache);
  const kopf = KOPF_LAND[land]?.[en ? "en" : "de"] || null;
  const lead = kopf ? kopf.lead : t.lead;
  const chips = kopf ? kopf.chips : t.chips;
  const app = kopf ? { ...t.app, featureList: kopf.featureList } : t.app;
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="ratsvorlage"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={lead}
      chips={chips}
      app={app}
      rechner={<RatsvorlageWerkzeug {...daten} />}
      erklaerung={(ERKLAERUNG_LAND[land] || ERKLAERUNG)[en ? "en" : "de"]}
      annahmen={en ? ANNAHMEN.en() : ANNAHMEN.de()}
      quellen={t.quellen}
      faq={faqFuerLand(en ? FAQ_EN : FAQ, land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={kopf ? t.querverweise.filter((_, i) => i !== 1) /* Kommunal-Rechner (nur DE) nicht in AT/CH */ : t.querverweise}
      cta={t.cta}
      landHinweise={{
        CH: {
          de: "Die Ratsvorlage für die Schweiz ist in Vorbereitung: Bewilligung und Beteiligung hängen von Kanton und Gemeinde ab, Rechenwerte für die Schweiz werden geprüft. Wir besprechen Ihr Vorhaben gern persönlich.",
          en: "The council paper for Switzerland is in preparation: permits and participation depend on the canton and municipality, and figures for Switzerland are being reviewed. We are happy to discuss your project personally.",
        },
      }}
    />
  );
}

export const generateMetadata = seitenMetadata("/kommunen/ratsvorlage", metadata, { en: metadataEn });

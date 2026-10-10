// src/app/(stamm)/rechner/flaechenpass/page.js – Flächenpass Stufe 1 (Welle 3, Paket B6)
//
// Fläche einzeichnen oder Größe angeben → Größe in ha, Leistung, Ertrag, grobe Eignung aus der internen Scoring-Engine
// (src/lib/plattform/geodaten/scoring.js) und eine Checkliste der Restriktionen je Land. Rechtliche Aussagen nur aus
// veröffentlichten Texten bzw. den Regionsdaten mit Quelle (src/data/regionen/*.js), sonst „wird im Gespräch geprüft“.
// Keine Geldwerte (Pacht: Pachtrechner). Lead über den Bericht-Baustein (/api/rechner/bericht, Rechner „flaechenpass“).
// noindex bis zur Fachprüfung (src/lib/land/seiten.js index: false; englisch src/lib/sprache/seiten.js index: false).
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur). Regionsdaten in der Sprache der Seite.

import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import Flaechenpass from "@/components/Flaeche/Flaechenpass/Flaechenpass";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { chTexte } from "@/data/laender/ch/schreibung";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { FREIFLAECHE } from "@/lib/invest/markt";
import { SCORING_VERSION, SCHWELLEN } from "@/lib/plattform/geodaten/scoring";
import { NETZ_ANNAHME_KM, REGIONEN } from "@/lib/rechner/flaechenpass";
import { regionFuerSprache } from "@/data/regionen";

const PFAD = seitenPfad("/rechner/flaechenpass");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Flächenpass: Fläche einzeichnen, Eignung und Restriktionen | ÖkoInvest",
  description:
    "Fläche auf der Karte einzeichnen oder Größe angeben: Hektar, mögliche Leistung, Stromertrag, grobe Eignung und die Restriktionen Ihres Bundeslandes mit Quellen – für Deutschland, Österreich und die Schweiz.",
  keywords: ["Flächenpass Solarpark", "Fläche einzeichnen Solarpark", "Eignung Fläche Freiflächen-PV", "EEG-Flächenkulisse prüfen", "PV-Zonen Widmung", "Art. 24ter RPG Solaranlage"],
});
// Fachprüfung offen (Register index: false): auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const metadataEn = rechnerMetadataEn({
  title: "Land passport: draw your land, suitability and restrictions | ÖkoInvest",
  description:
    "Draw your land on the map or enter its size: hectares, possible capacity, power yield, rough suitability and the restrictions of your federal state with sources – for Germany, Austria and Switzerland.",
  keywords: ["land passport solar park", "draw land solar park", "suitability ground-mounted PV", "EEG land category", "PV zoning Austria", "Art. 24ter RPG solar"],
});

/** Regionsdaten für den Assistenten: Name, Ertrag, Rechtsrahmen (nur Titel + Quelle), Restriktionen – in der Sprache der Seite */
function regionenFuer(land, sprache) {
  const liste = land ? REGIONEN.filter((r) => r.land === land) : REGIONEN;
  const out = {};
  for (const r of liste) {
    const d = regionFuerSprache(r.slug, sprache);
    if (!d) continue;
    out[r.slug] = {
      name: d.name,
      ertrag: d.ertrag?.kwhProKwp || null,
      recht: (d.recht || []).filter((x) => x?.titel && x?.quelle?.url).slice(0, 8).map((x) => ({ titel: x.titel, quelle: { titel: x.quelle.titel, url: x.quelle.url } })),
      schwierig: (d.kulisse?.schwierig || []).slice(0, 8),
      href: `/regionen/${r.slug}`,
    };
  }
  return out;
}

function annahmenZeilen(sprache) {
  const f = formate(sprache);
  return sprache === "en"
    ? [
        ["Land required (ground-mounted, south, fixed)", `${f.fmt(FREIFLAECHE.haProMwp, 1)} ha per MWp`],
        ["Suitability traffic light", `green from ${SCHWELLEN.ampel.gruen}, yellow from ${SCHWELLEN.ampel.gelb} points`],
        ["Minimum size", `${SCHWELLEN.mindestHa} ha (below: capped)`],
        ["Grid distance unknown", `cautiously ${NETZ_ANNAHME_KM} km`],
        ["Shape without drawing", "workable shape assumed"],
        ["Yield", "PVGIS values per federal state (regional data)"],
        ["Grid capacity", "always open – asked from the grid operator"],
        ["Scoring version", SCORING_VERSION],
      ]
    : [
        ["Flächenbedarf (Freifläche Süd, fest)", `${f.fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`],
        ["Ampel der Eignung", `grün ab ${SCHWELLEN.ampel.gruen}, gelb ab ${SCHWELLEN.ampel.gelb} Punkten`],
        ["Mindestgröße", `${SCHWELLEN.mindestHa} ha (darunter gedeckelt)`],
        ["Netzentfernung unbekannt", `vorsichtig ${NETZ_ANNAHME_KM} km`],
        ["Form ohne Zeichnung", "brauchbare Form angenommen"],
        ["Ertrag", "PVGIS-Werte je Bundesland (Regionsdaten)"],
        ["Netzkapazität", "immer offen – Anfrage beim Netzbetreiber"],
        ["Version der Bewertung", SCORING_VERSION],
      ];
}

const FAQ = [
  {
    q: "Wie genau ist der Flächenpass?",
    a: "Er ist eine grobe Ersteinschätzung aus Ihren Angaben und der Bewertungslogik, mit der auch unser Flächenteam Flächen vorsortiert. Was Sie nicht wissen, setzen wir nicht als Wissen ein: Solche Punkte gehen mit einem mittleren Wert ein und stehen im Pass als „wird im Gespräch geprüft“. Netzkapazität, Planungsrecht und Schutzgebiete prüfen wir danach flächengenau.",
  },
  {
    q: "Was passiert mit meiner eingezeichneten Fläche?",
    a: "Solange Sie keinen Bericht anfordern, bleibt die Fläche in Ihrem Browser – berechnet wird dort. Erst wenn Sie den Bericht mit Name und E-Mail anfordern und den Link bestätigen, gehen Fläche, Größe und Ihre Antworten an uns, damit unser Flächenteam die Fläche prüfen kann.",
  },
  {
    q: "Warum lädt die Karte erst nach einem Klick?",
    a: "Die Kartenkacheln kommen direkt von einer Behörde (in Deutschland vom Bundesamt für Kartographie und Geodäsie, in Österreich von basemap.at, in der Schweiz von swisstopo). Dabei wird Ihre IP-Adresse an diesen Anbieter übertragen. Deshalb laden wir die Karte nur, wenn Sie das möchten. Ohne Karte geben Sie einfach die Größe an.",
  },
  {
    q: "Warum nennt der Flächenpass keine Pacht?",
    a: "Der Pass bewertet die Fläche, nicht den Vertrag. Für Deutschland rechnet der Pachtrechner die Spanne; für Österreich und die Schweiz nennen wir Pachtwerte erst nach der Prüfung Ihrer Fläche.",
  },
  {
    q: "Was ist der Unterschied zum Flächencheck?",
    a: "Der Flächencheck fragt in vier Schritten grob nach Lage, Größe und Netz. Der Flächenpass geht weiter: Sie zeichnen die Fläche ein, wir messen Größe und Form und zeigen die Restriktionen Ihres Bundeslandes mit Quellen.",
  },
];

const FAQ_EN = [
  {
    q: "How accurate is the land passport?",
    a: "It is a rough initial assessment based on your input and the evaluation logic our land team also uses to pre-sort sites. We do not treat what you do not know as fact: such points count with a medium value and appear in the passport as “checked in a conversation”. We then check grid capacity, planning law and protected areas precisely.",
  },
  {
    q: "What happens to the land I draw?",
    a: "As long as you do not request a report, the land stays in your browser – the calculation happens there. Only when you request the report with your name and email and confirm the link are the land, size and your answers sent to us, so that our land team can assess the site.",
  },
  {
    q: "Why does the map only load after a click?",
    a: "The map tiles come directly from a public authority (in Germany the Federal Agency for Cartography and Geodesy, in Austria basemap.at, in Switzerland swisstopo). This transfers your IP address to that provider. That is why we only load the map if you want it. Without the map, simply enter the size.",
  },
  {
    q: "Why does the land passport not show a lease?",
    a: "The passport assesses the land, not the contract. For Germany, the lease calculator works out the range; for Austria and Switzerland we only state lease values after assessing your land.",
  },
  {
    q: "How is it different from the land check?",
    a: "The land check asks roughly about location, size and grid in four steps. The land passport goes further: you draw the land, we measure size and shape and show your federal state’s restrictions with sources.",
  },
];

const DE = {
  breadcrumb: "Flächenpass",
  eyebrow: "Für Eigentümer · Flächenpass",
  title: (
    <>
      Ihre Fläche, <span className="ov-text-gradient-light">eingezeichnet und geprüft.</span>
    </>
  ),
  lead: "Fläche auf der Karte einzeichnen oder Größe angeben, sechs kurze Fragen beantworten: Sie erhalten Hektar, mögliche Leistung, Stromertrag, eine grobe Eignung und die Restriktionen Ihrer Region mit Quellen.",
  chips: ["Deutschland, Österreich, Schweiz", "Fläche bleibt im Browser", "Restriktionen mit Quellen", "Ohne Anmeldung"],
  app: {
    name: "Flächenpass",
    description: "Misst eine eingezeichnete Fläche, schätzt Leistung und Ertrag und bewertet die Eignung für Freiflächen-PV grob – mit länderspezifischer Checkliste der Restriktionen.",
    featureList: ["Fläche auf amtlicher Grundkarte einzeichnen", "Größe und Form aus der Zeichnung", "Leistung und Stromertrag je Bundesland", "Eignung mit Begründung je Kriterium", "Restriktionen je Land mit Quellen", "Bericht per E-Mail"],
  },
  quellen: [
    { name: "PVGIS (EU JRC)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
    { name: "§ 37 EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html" },
    { name: "§ 35 BauGB", url: "https://www.gesetze-im-internet.de/bbaug/__35.html" },
    { name: "RPG Art. 24ter", url: "https://www.lexfind.ch/tolv/257906/de" },
    { name: "Regionsdaten ÖkoInvest (Quellen je Bundesland)" },
  ],
  faqTitel: "Flächenpass – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/flaechencheck"), titel: "Flächencheck", text: "Die schnelle Ampel in vier Schritten – ohne Karte." },
    { href: seitenPfad("/rechner/pacht"), titel: "Pachtrechner", text: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre." },
    { href: seitenPfad("/regionen"), titel: "Regionen", text: "Recht, Kulisse und Behörden je Bundesland – mit Quellen." },
  ],
  cta: {
    eyebrow: "Persönlich statt Formular",
    title: "Lieber gleich mit dem Flächenteam sprechen?",
    text: "Schicken Sie uns Ihre Flurstücke oder Parzellen – wir prüfen Netz, Planungsrecht und Restriktionen und melden uns mit einer ehrlichen Einschätzung.",
    primary: { label: "Fläche verpachten", href: seitenPfad("/flaeche-verpachten") },
    secondary: { label: "Zum Kontakt", href: seitenPfad("/kontakt") },
  },
};

const EN = {
  breadcrumb: "Land passport",
  eyebrow: "For landowners · land passport",
  title: (
    <>
      Your land, <span className="ov-text-gradient-light">drawn and assessed.</span>
    </>
  ),
  lead: "Draw your land on the map or enter its size and answer six short questions: you get hectares, possible capacity, power yield, a rough suitability rating and your region’s restrictions with sources.",
  chips: ["Germany, Austria, Switzerland", "Land stays in your browser", "Restrictions with sources", "No sign-up"],
  app: {
    name: "Land passport",
    description: "Measures a drawn plot, estimates capacity and yield and roughly rates its suitability for ground-mounted PV – with a country-specific checklist of restrictions.",
    featureList: ["Draw your land on an official base map", "Size and shape from the drawing", "Capacity and power yield per federal state", "Suitability with reasons per criterion", "Restrictions per country with sources", "Report by email"],
  },
  quellen: [
    { name: "PVGIS (EU JRC)", url: "https://re.jrc.ec.europa.eu/pvg_tools/en/" },
    { name: "§ 37 EEG 2023 (German Renewable Energy Sources Act)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html" },
    { name: "§ 35 BauGB (German Federal Building Code)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html" },
    { name: "Swiss Spatial Planning Act, Art. 24ter", url: "https://www.lexfind.ch/tolv/257906/de" },
    { name: "ÖkoInvest regional data (sources per federal state)" },
  ],
  faqTitel: "Land passport – good to know",
  querverweise: [
    { titel: "Land check", text: "The quick traffic light in four steps – without a map." },
    { titel: "Lease calculator", text: "Fixed lease, indexed or revenue share over 30 years." },
    { titel: "Regions", text: "Law, land categories and authorities per federal state – with sources." },
  ],
  cta: {
    eyebrow: "In person instead of a form",
    title: "Prefer to talk to the land team straight away?",
    text: "Send us your plot numbers – we will check the grid, planning law and restrictions and get back to you with an honest assessment.",
    primary: { label: "Lease your land" },
    secondary: { label: "Contact us" },
  },
};

const ERKLAERUNG = {
  de: (
    <div className="ov-prose">
      <h2>So entsteht der Flächenpass</h2>
      <p>
        Aus der eingezeichneten Fläche messen wir <strong>Größe und Form</strong>: Kompakte Flächen lassen sich besser mit Modulreihen belegen als schmale Streifen. Mit dem Flächenbedarf je Megawatt
        ergibt sich die <strong>mögliche Leistung</strong>, mit dem PVGIS-Wert Ihres Bundeslandes der <strong>Stromertrag</strong>.
      </p>
      <p>
        Die <strong>Eignung</strong> bewertet dieselbe Logik, mit der unser Flächenteam Flächen vorsortiert: Größe, Form, Gelände, Nutzung, Abstand zur Siedlung, Netzentfernung, Planungsrecht und
        Flächenkulisse des Landes und Einstrahlung – zusammen 100 Punkte. Harte Ausschlussgründe wie ein Naturschutzgebiet deckeln die Punktzahl.
      </p>
      <h3>Was der Flächenpass nicht kann</h3>
      <ul>
        <li>Die freie Netzkapazität kennen – die erfragen wir beim Netzbetreiber.</li>
        <li>Schutzgebiete, Bodengüte und Zonen flächengenau abgleichen – das prüfen wir im nächsten Schritt.</li>
        <li>Eine Pacht oder einen Kaufpreis nennen – dafür gibt es den Pachtrechner und das Gespräch.</li>
      </ul>
    </div>
  ),
  en: (
    <div className="ov-prose">
      <h2>How the land passport is created</h2>
      <p>
        From the land you draw, we measure <strong>size and shape</strong>: compact plots can be filled with module rows more easily than narrow strips. The land required per megawatt gives the{" "}
        <strong>possible capacity</strong>, the PVGIS value of your federal state gives the <strong>power yield</strong>.
      </p>
      <p>
        The <strong>suitability</strong> is rated with the same logic our land team uses to pre-sort sites: size, shape, terrain, use, distance to settlements, grid distance, planning law and the
        country’s land category, and irradiation – 100 points in total. Hard exclusion criteria such as a nature reserve cap the score.
      </p>
      <h3>What the land passport cannot do</h3>
      <ul>
        <li>Know the free grid capacity – we ask the grid operator.</li>
        <li>Match protected areas, soil quality and zones precisely – we check this in the next step.</li>
        <li>State a lease or purchase price – the lease calculator and a conversation are there for that.</li>
      </ul>
    </div>
  ),
};

export default async function FlaechenpassPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  const faq = en ? FAQ_EN : chTexte(FAQ, land);
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="flaechenpass"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<Flaechenpass land={land} regionen={regionenFuer(land, sprache)} />}
      erklaerung={en ? ERKLAERUNG.en : schreibweiseBaum(ERKLAERUNG.de, land)}
      annahmen={annahmenZeilen(sprache)}
      quellen={t.quellen}
      faq={faq}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/flaechenpass", metadata, { en: metadataEn });

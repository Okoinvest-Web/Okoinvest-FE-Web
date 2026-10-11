// src/app/(stamm)/kommunen/widmungskit/page.js – AT-Widmungskit (Welle 3, Paket B8)
//
// Ablauf, beteiligte Stellen und Prüfpunkte der Umwidmung für einen Solarpark je österreichischem Bundesland –
// nur Aussagen aus den recherchierten Regionsdaten mit Quelle je Punkt (src/lib/kommune/widmung.js). Ohne Geldwerte.
// Deutschland und Schweiz: Länderhinweis der Seite (tools.js: laender ["AT"]) mit Verweis auf das Verfahren im Land.
// Lead: Ratsvorlage für Österreich über den Bericht-Baustein (Rechner „ratsvorlage“, Vorgangstyp „kommune“, Land AT).
// noindex bis zur Fachprüfung (src/lib/land/seiten.js index: false; englisch src/lib/sprache/seiten.js index: false).
//
// Sprachmodell: deutsche Texte in DE, englische in EN; Regionsdaten in der Sprache der Seite.

import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import Widmungskit from "@/components/Kommune/Widmungskit/Widmungskit";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { GEMEINSAM, widmungskitAlle } from "@/lib/kommune/widmung";
import { datumText } from "@/lib/sprache/format";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

const PFAD = seitenPfad("/kommunen/widmungskit");
const STAND_KIT = "9. Oktober 2026"; // = WIDMUNGSKIT_VERSION (src/lib/kommune/widmung.js)

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Widmungskit: PV-Umwidmung je Bundesland (AT) | ÖkoInvest",
  description:
    "Ablauf der Widmung für eine PV-Freiflächenanlage in Österreich: Stellen und Prüfpunkte je Bundesland, jede Angabe mit Quelle. Jetzt Checkliste drucken.",
  keywords: ["Widmung Photovoltaik Gemeinde", "Grünland-Photovoltaik Widmung", "Umwidmung PV-Freiflächenanlage", "Flächenwidmungsplan Photovoltaik", "PV-Zonen Bundesland"],
});
// Fachprüfung offen (Register index: false): auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const metadataEn = rechnerMetadataEn({
  title: "Zoning kit: PV rezoning in Austria | ÖkoInvest",
  description:
    "The zoning procedure for ground-mounted PV in Austria: authorities and checkpoints per federal state, every point with a source. Print the checklist now.",
  keywords: ["zoning photovoltaics municipality Austria", "Grünland-Photovoltaik zoning", "rezoning ground-mounted PV", "zoning plan photovoltaics", "PV zones Austria"],
});

const FAQ = [
  {
    q: "Wer entscheidet über die Widmung?",
    a: "Die Gemeinde: Der Gemeinderat ändert den Flächenwidmungsplan bzw. das örtliche Raumordnungsprogramm, etwa zu Grünland-Photovoltaik. Das Land gibt dafür Zonen, Kriterien und Größengrenzen vor und prüft die Widmung als Aufsichtsbehörde.",
  },
  {
    q: "Reicht die Widmung für den Bau?",
    a: "Nein. Je nach Größe kommen die elektrizitätsrechtliche Bewilligung des Landes und eine naturschutzrechtliche Bewilligung, meist bei der Bezirkshauptmannschaft, hinzu – dazu der Netzzugang beim Netzbetreiber. Welche Schwellen in Ihrem Bundesland gelten, steht bei den Prüfpunkten.",
  },
  {
    q: "Woher stammen die Prüfpunkte?",
    a: "Aus unseren Regionsdaten: Für jedes Bundesland haben wir Raumordnungsrecht, Leitfäden und Verordnungen recherchiert. Jeder Punkt nennt seine Quelle. Was wir nicht belegen konnten, steht hier nicht. Maßgeblich bleibt die geltende Fassung der Landesvorschriften.",
  },
  {
    q: "Gibt es auch Geldwerte für die Gemeinde?",
    a: "Nicht in diesem Kit. Eine Gewerbesteuer wie in Deutschland gibt es in Österreich nicht; im Vordergrund stehen Pacht, Beteiligungsmodelle und Erneuerbare-Energie-Gemeinschaften. Pacht- und Rechenwerte für Österreich werden geprüft – Zahlen besprechen wir persönlich.",
  },
  {
    q: "Was passiert, wenn ich die Ratsvorlage anfordere?",
    a: "Sie geben Name und E-Mail an, Telefon ist freiwillig. Erst nach Ihrer Bestätigung per Link erstellen wir die Vorlage mit den Prüfpunkten Ihres Bundeslands und legen eine Anfrage bei unserem Team für Österreich an. Die abgehakten Punkte bleiben in Ihrem Browser.",
  },
];

const FAQ_EN = [
  {
    q: "Who decides on the zoning?",
    a: "The municipality: the municipal council amends the zoning plan (Flächenwidmungsplan) or the local spatial planning programme, for example to ‘Grünland-Photovoltaik’. The state sets zones, criteria and size limits for this and reviews the zoning as the supervisory authority.",
  },
  {
    q: "Is zoning enough to build?",
    a: "No. Depending on size, the state’s permit under electricity law and a permit under nature conservation law, usually from the district authority (Bezirkshauptmannschaft), are also required – plus grid access from the grid operator. The thresholds that apply in your federal state are listed in the checkpoints.",
  },
  {
    q: "Where do the checkpoints come from?",
    a: "From our regional data: for each federal state we researched spatial planning law, guidelines and ordinances. Every point states its source. What we could not substantiate is not included here. The current version of the state regulations remains authoritative.",
  },
  {
    q: "Are there monetary values for the municipality?",
    a: "Not in this kit. Austria has no trade tax as in Germany; the focus is on lease, participation models and renewable energy communities. Lease rates and figures for Austria are being reviewed – we discuss figures personally.",
  },
  {
    q: "What happens when I request the council paper?",
    a: "You enter your name and email; phone is optional. Only after you confirm via the link do we create the paper with the checkpoints of your federal state and open an enquiry with our team for Austria. The points you ticked stay in your browser.",
  },
];

const DE = {
  breadcrumb: "Widmungskit Österreich",
  eyebrow: "Für Gemeinden in Österreich",
  title: (
    <>
      Umwidmung für Photovoltaik, <span className="ov-text-gradient-light">Schritt für Schritt.</span>
    </>
  ),
  lead: "Wie die Widmung für eine PV-Freiflächenanlage in Ihrem Bundesland läuft, wer beteiligt ist und was das Land vorab prüft – mit Quelle zu jedem Punkt, zum Abhaken und Drucken.",
  chips: ["Alle neun Bundesländer", "Quelle zu jedem Punkt", "Zum Abhaken und Drucken", "Ratsvorlage auf Wunsch"],
  app: {
    name: "Widmungskit Photovoltaik Österreich",
    description: "Checkliste für Gemeinden: Ablauf der Widmung, beteiligte Stellen und Prüfpunkte für PV-Freiflächenanlagen je österreichischem Bundesland, mit Quellen.",
    featureList: ["Ablauf der Widmung je Bundesland", "Beteiligte Stellen und ihre Rolle", "Prüfpunkte mit Quelle", "Checkliste zum Abhaken und Drucken", "Ratsvorlage als Muster"],
  },
  annahmen: [
    ["Grundlage", "Regionsdaten ÖkoInvest"],
    ["Quellen", "je Prüfpunkt verlinkt"],
    ["Geldwerte", "keine (werden geprüft)"],
    ["Befristete Hinweise", "nicht enthalten"],
    ["Stand", datumText(STAND_KIT, "de")],
  ],
  quellen: [{ name: "Raumordnungsrecht und Leitfäden der Länder (Quelle je Prüfpunkt)" }, { name: "Koordinationsstelle für Energiegemeinschaften – FAQs zum ElWG", url: "https://energiegemeinschaften.gv.at/faqs-zum-elwg/" }],
  faqTitel: "Widmung für Photovoltaik",
  querverweise: [
    { href: seitenPfad("/kommunen/ratsvorlage"), titel: "Ratsvorlage Solarpark", text: "Kommunal-Rechner 2.0 mit druckfertiger Ratsvorlage als Muster." },
    { href: seitenPfad("/regionen"), titel: "Regionen", text: "Widmung, Zonen und Behörden je Bundesland – mit Quellen." },
    { href: seitenPfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "EEG, BEG und die neuen Modelle nach ElWG – mit Strom aus dem Park." },
    { href: seitenPfad("/kommunen"), titel: "Für Kommunen", text: "Wertschöpfung, Verfahren und Beteiligung vor Ort." },
  ],
  cta: {
    eyebrow: "Für Gemeinden",
    title: "Wir begleiten die Widmung – mit offenen Zahlen.",
    text: "Wir stellen das Vorhaben im Gemeinderat vor und bereiten die Unterlagen für das Land vor. Die Planungskosten trägt der Entwickler.",
    primary: { label: "Gespräch anfragen", href: seitenPfad("/kommunen#anfrage") },
    secondary: { label: "Ratsvorlage", href: seitenPfad("/kommunen/ratsvorlage") },
  },
};

const EN = {
  breadcrumb: "Zoning kit Austria",
  eyebrow: "For municipalities in Austria",
  title: (
    <>
      Rezoning for photovoltaics, <span className="ov-text-gradient-light">step by step.</span>
    </>
  ),
  lead: "How zoning for a ground-mounted PV plant works in your federal state, who is involved and what the state checks in advance – with a source for every point, to tick off and print.",
  chips: ["All nine federal states", "A source for every point", "To tick off and print", "Council paper on request"],
  app: {
    name: "Zoning kit for photovoltaics in Austria",
    description: "Checklist for municipalities: zoning procedure, authorities involved and checkpoints for ground-mounted PV plants per Austrian federal state, with sources.",
    featureList: ["Zoning procedure per federal state", "Authorities involved and their role", "Checkpoints with source", "Checklist to tick off and print", "Council paper as a template"],
  },
  annahmen: [
    ["Basis", "ÖkoInvest regional data"],
    ["Sources", "linked for each checkpoint"],
    ["Monetary values", "none (being reviewed)"],
    ["Time-limited notices", "not included"],
    ["As of", datumText(STAND_KIT, "en")],
  ],
  quellen: [{ name: "Spatial planning law and guidelines of the states (source per checkpoint)" }, { name: "Coordination office for energy communities – FAQs on the ElWG" }],
  faqTitel: "Zoning for photovoltaics",
  querverweise: [
    { titel: "Council paper for solar parks", text: "Municipal calculator 2.0 with a ready-to-print council paper template." },
    { titel: "Regions", text: "Zoning, zones and authorities per federal state – with sources." },
    { titel: "Energy communities", text: "EEG, BEG and the new models under the ElWG – with power from the park." },
    { titel: "For municipalities", text: "Local value creation, procedure and participation." },
  ],
  cta: {
    eyebrow: "For municipalities",
    title: "We support the zoning – with open figures.",
    text: "We present the project to the municipal council and prepare the documents for the state. The developer bears the planning costs.",
    primary: { label: "Request a meeting" },
    secondary: { label: "Council paper" },
  },
};

const ERKLAERUNG = {
  de: (
    <div className="ov-prose max-w-none">
      <h2>So ist das Widmungskit aufgebaut</h2>
      <p>
        <strong>Ablauf und Stellen:</strong> wie die Widmung im gewählten Bundesland läuft und welche Stellen beteiligt sind – von der Gemeinde über die Raumordnung des Landes bis zur
        Bezirkshauptmannschaft und zum Netzbetreiber.
      </p>
      <p>
        <strong>Prüfpunkte:</strong> Zonen, Größengrenzen, Kriterienkataloge und Bewilligungsschwellen des Landes, jeweils mit der Quelle, auf die sich die Aussage stützt. Befristete Hinweise wie
        Fördercalls stehen auf den Regionsseiten.
      </p>
      <h3>Grenzen</h3>
      <ul>
        <li>Keine Rechtsberatung – maßgeblich sind die geltenden Landesvorschriften.</li>
        <li>Keine Geldwerte: Pacht- und Rechenwerte für Österreich werden geprüft.</li>
        <li>Ob eine konkrete Fläche widmungsfähig ist, klärt erst die Prüfung der Fläche.</li>
      </ul>
    </div>
  ),
  en: (
    <div className="ov-prose max-w-none">
      <h2>How the zoning kit is structured</h2>
      <p>
        <strong>Procedure and authorities:</strong> how zoning works in the selected federal state and which authorities are involved – from the municipality and the state’s spatial planning
        department to the district authority and the grid operator.
      </p>
      <p>
        <strong>Checkpoints:</strong> the state’s zones, size limits, criteria catalogues and permit thresholds, each with the source on which the statement is based. Time-limited notices such as
        funding calls are on the region pages.
      </p>
      <h3>Limits</h3>
      <ul>
        <li>Not legal advice – the current state regulations are authoritative.</li>
        <li>No monetary values: lease rates and figures for Austria are being reviewed.</li>
        <li>Whether a specific plot can be zoned is only clarified by assessing the plot.</li>
      </ul>
    </div>
  ),
};

export default async function WidmungskitPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  const kits = widmungskitAlle(sprache);
  // CH: Erklärung, FAQ und Kopf ohne „ß“ (Texte der Seite laufen durch den Baum)
  return schreibweiseBaum(
    <RechnerSeite
      pfad={PFAD}
      toolId="widmungskit"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<Widmungskit kits={kits} gemeinsam={GEMEINSAM[en ? "en" : "de"]} />}
      erklaerung={en ? ERKLAERUNG.en : ERKLAERUNG.de}
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={en ? FAQ_EN : FAQ}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
      landHinweise={{
        DE: {
          de: "Das Widmungskit gilt für Österreich. In Deutschland plant die Gemeinde über die Bauleitplanung mit Bebauungsplan und Flächennutzungsplan – Ablauf und Landesrecht zeigt die Ratsvorlage.",
          en: "The zoning kit applies to Austria. In Germany, the municipality plans through land-use planning with a development plan and land use plan – the council paper shows the procedure and state law.",
        },
        CH: {
          de: "Das Widmungskit gilt für Österreich. In der Schweiz braucht eine Anlage ausserhalb der Bauzone ein Baugesuch bei der Gemeinde und eine kantonale Ausnahmebewilligung (Art. 24ter RPG). Eine Checkliste für die Schweiz bereiten wir vor.",
          en: "The zoning kit applies to Austria. In Switzerland, an installation outside the building zone needs a building application to the municipality and a cantonal exemption permit (Art. 24ter RPG). We are preparing a checklist for Switzerland.",
        },
      }}
    />,
    land
  );
}

export const generateMetadata = seitenMetadata("/kommunen/widmungskit", metadata, { en: metadataEn });

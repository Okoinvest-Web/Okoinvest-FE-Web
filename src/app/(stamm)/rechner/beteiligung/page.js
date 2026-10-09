// src/app/rechner/beteiligung/page.js – Genossenschafts-/Bürgerbeteiligung (Illustration)
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import BeteiligungRechner from "@/components/Rechner/BeteiligungRechner";
import { FINANZIERUNG, FREIFLAECHE, GEMEINSCHAFTEN, ERLOESE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/beteiligung");
const B = GEMEINSCHAFTEN.beteiligung;
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Bürgerbeteiligung Solarpark: Rechner | ÖkoInvest",
  description:
    "Wie entsteht die Ausschüttung einer Energiegenossenschaft? Illustration aus dem Park-Cashflow in drei Szenarien – Risiken offen, keine Anlageberatung.",
  keywords: ["Bürgerbeteiligung Solarpark", "Energiegenossenschaft Rendite", "Genossenschaftsanteil Photovoltaik", "Solarpark beteiligen", "Bürgerenergie Rechner"],
});

const metadataEn = rechnerMetadataEn({
  title: "Citizen participation in solar parks: calculator | ÖkoInvest",
  description:
    "How does an energy cooperative’s distribution arise? An illustration based on the park’s cash flow in three scenarios – risks disclosed, no investment advice.",
  keywords: ["citizen participation solar park", "energy cooperative return", "cooperative share photovoltaics", "invest in a solar park", "community energy calculator"],
});

const FAQ = [
  {
    q: "Kann ich mich schon beteiligen?",
    a: "Nein. Die Genossenschaft ist im Aufbau, Satzung, Projektauswahl und Beteiligungsbedingungen stehen noch nicht fest. Sie können Ihr Interesse unverbindlich vormerken – registrierte Interessenten erhalten die Unterlagen zuerst. Vorher entsteht keinerlei Zahlungspflicht.",
  },
  {
    q: "Warum zeigt der Rechner so niedrige Werte in den ersten Jahren?",
    a: `Weil Solarparks überwiegend mit Bankdarlehen finanziert werden (im Modell ${fmt(FINANZIERUNG.fremdkapitalQuote * 100)} % Wunschquote über ${FINANZIERUNG.tilgungJahre} Jahre, begrenzt auf einen Schuldendienstdeckungsgrad von ${fmt(FINANZIERUNG.dscrZiel, 2)}). Solange getilgt wird, bleibt für das Eigenkapital wenig übrig. Außerdem muss die Genossenschaft Geld zurücklegen, um die Einlagen am Ende zurückzahlen zu können – das Eigenkapital im Park verzehrt sich über die Laufzeit. Erst danach ist ein Überschuss ausschüttungsfähig.`,
    nurDE: "Rechenwerte",
  },
  {
    q: "Welche Risiken hat eine Beteiligung?",
    a: "Genossenschaftsanteile sind unternehmerisches Eigenkapital: Ertrag, Strompreise, Betriebskosten und Zinsen können schlechter ausfallen als geplant; im schlechtesten Fall ist die Einlage ganz verloren. Es gibt keine Einlagensicherung. Anteile sind nicht börsengehandelt und nur mit Frist zum Geschäftsjahresende kündbar. Eine Nachschusspflicht kann die Satzung ausschließen – das ist vor dem Beitritt zu prüfen.",
  },
  {
    q: "Wer entscheidet über die Ausschüttung?",
    a: "Die Generalversammlung, auf Vorschlag von Vorstand und Aufsichtsrat. Jedes Mitglied hat dort grundsätzlich eine Stimme – unabhängig von der Zahl seiner Anteile. Ein Teil des Überschusses muss nach Gesetz und Satzung in die Rücklagen fließen.",
  },
  {
    q: "Wie werden Ausschüttungen versteuert?",
    a: `In Deutschland sind Ausschüttungen einer Genossenschaft Kapitalerträge: In der Regel fallen ${fmt(B.kapitalertragsteuer * 100, 3)} % Kapitalertragsteuer inklusive Solidaritätszuschlag an (zzgl. Kirchensteuer), soweit der Sparer-Pauschbetrag ausgeschöpft ist. In Österreich und der Schweiz gelten andere Regeln – fragen Sie Ihre Steuerberatung.`,
    nurDE: "Steuerregeln",
  },
  {
    q: "Ist das eine Anlageberatung?",
    a: "Nein. Der Rechner erklärt das Prinzip mit vorsichtigen Annahmen. Er ist weder eine Anlageberatung noch ein Angebot zum Erwerb von Anteilen und keine Zusage einer Ausschüttung. Maßgeblich sind allein die Unterlagen der Genossenschaft nach ihrer Gründung.",
  },
];

const FAQ_EN = [
  {
    q: "Can I already participate?",
    a: "No. The cooperative is being set up; its articles of association, project selection and participation terms have not yet been fixed. You can register your interest without obligation – registered parties receive the documents first. No payment obligation of any kind arises before then.",
  },
  {
    q: "Why does the calculator show such low values in the first years?",
    a: `Because solar parks are mostly financed with bank loans (in the model, a target debt ratio of ${e.pct(FINANZIERUNG.fremdkapitalQuote * 100)} over ${FINANZIERUNG.tilgungJahre} years, capped at a debt service coverage ratio of ${e.fmt(FINANZIERUNG.dscrZiel, 2)}). As long as the loan is being repaid, little remains for the equity. In addition, the cooperative has to set money aside so that it can repay the contributions at the end – the equity in the park is used up over the term. Only after that is a surplus distributable.`,
    nurDE: "Figures",
  },
  {
    q: "What risks does a participation involve?",
    a: "Cooperative shares are entrepreneurial equity: yield, electricity prices, operating costs and interest rates may turn out worse than planned; in the worst case, the contribution is lost entirely. There is no deposit protection. Shares are not traded on an exchange and can only be terminated with notice at the end of the financial year. The articles of association can exclude an obligation to make additional contributions – this must be checked before joining.",
  },
  {
    q: "Who decides on the distribution?",
    a: "The general meeting, on the proposal of the management board and supervisory board. In principle, each member has one vote there – regardless of the number of shares held. Part of the surplus must go into reserves under the law and the articles of association.",
  },
  {
    q: "How are distributions taxed?",
    a: `In Germany, a cooperative’s distributions are investment income: as a rule, ${e.pct(B.kapitalertragsteuer * 100, 3)} capital gains tax including the solidarity surcharge applies (plus church tax), once the saver’s allowance has been used up. Different rules apply in Austria and Switzerland – ask your tax adviser.`,
    nurDE: "Tax rules",
  },
  {
    q: "Is this investment advice?",
    a: "No. The calculator explains the principle using cautious assumptions. It is neither investment advice nor an offer to acquire shares, nor a commitment to any distribution. Only the cooperative’s documents after its formation are authoritative.",
  },
];

const DE = {
  breadcrumb: "Beteiligungsrechner",
  eyebrow: "Für Bürger, Landwirte und Gemeinden",
  title: (
    <>
      Wie entsteht die Ausschüttung <span className="ov-text-gradient-light">einer Energiegenossenschaft?</span>
    </>
  ),
  lead: "Eine Illustration, keine Zusage: Wir rechnen den Cashflow eines Solarparks in drei Szenarien und zeigen, was nach Bankdarlehen, Kosten, Rücklage und Kapitalerhalt für die Mitglieder übrig bleiben könnte.",
  chips: ["Drei Szenarien", "Aus dem Park-Cashflow", "Risiken offen benannt", "Keine Anlageberatung"],
  app: {
    name: "Beteiligungsrechner Energiegenossenschaft",
    description: "Illustriert mögliche Ausschüttungen einer Beteiligung an einer Energiegenossenschaft aus dem Cashflow eines Solarparks in drei Szenarien. Keine Anlageberatung, kein Angebot.",
    featureList: ["Anteile und Einlage", "Park-Cashflow nach Zins und Tilgung", "Kosten, Rücklage und Kapitalerhalt der Genossenschaft", "Szenarien schlecht, mittel, gut", "Kapitalertragsteuer optional"],
  },
  annahmen: [
    ["Anteil (Beispiel)", `${fmt(B.anteilEur)} €`],
    ["Kosten der eG", `${fmt(B.verwaltungAnteil * 100, 1)} % des Kapitals p. a.`],
    ["Rücklage", `${fmt(B.ruecklageAnteil * 100)} % des Überschusses`],
    ["Kapitalerhalt", "Einlage ÷ Laufzeit je Jahr"],
    ["Park: EEG / Laufzeit", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct · ${FREIFLAECHE.laufzeit} Jahre`],
    ["Park: Fremdkapital", `${fmt(FINANZIERUNG.fremdkapitalQuote * 100)} % · DSCR ${fmt(FINANZIERUNG.dscrZiel, 2)}`],
    ["Kapitalertragsteuer DE", `${fmt(B.kapitalertragsteuer * 100, 3)} %`],
    ["Status Genossenschaft", "im Aufbau"],
  ],
  quellen: [
    { name: "Genossenschaftsgesetz (GenG)", url: "https://www.gesetze-im-internet.de/geng/" },
    { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { name: "Parkmodell: Solarpark-Rechner ÖkoInvest" },
  ],
  faqTitel: "Beteiligung – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/genossenschaft"), titel: "Genossenschaft", text: "Aufbau, Mitbestimmung, Risiken und wie Sie Ihr Interesse vormerken." },
    { href: seitenPfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Für Landwirte: Pacht, Eigeninvestition oder Beteiligung im Vergleich." },
    { href: "/ratgeber/buergerenergie-solarpark-akzeptanz", titel: "Ratgeber Bürgerenergie", text: "Wie Beteiligung Akzeptanz schafft – und was Gemeinden davon haben." },
  ],
  cta: {
    eyebrow: "Genossenschaft im Aufbau",
    title: "Als Erste informiert werden.",
    text: "Merken Sie Ihr Interesse unverbindlich vor. Sobald Satzung und Unterlagen vorliegen, erhalten Sie diese zuerst – ohne jede Verpflichtung.",
    primary: { label: "Interesse vormerken", href: seitenPfad("/genossenschaft#interesse") },
    secondary: { label: "Zur Genossenschaft", href: seitenPfad("/genossenschaft") },
  },
};

const EN = {
  breadcrumb: "Participation calculator",
  eyebrow: "For citizens, farmers and municipalities",
  title: (
    <>
      How does an energy cooperative’s <span className="ov-text-gradient-light">distribution arise?</span>
    </>
  ),
  lead: "An illustration, not a commitment: we calculate a solar park’s cash flow in three scenarios and show what could be left for members after bank loans, costs, reserves and capital preservation.",
  chips: ["Three scenarios", "Based on the park’s cash flow", "Risks openly disclosed", "No investment advice"],
  app: {
    name: "Energy cooperative participation calculator",
    description: "Illustrates possible distributions from a participation in an energy cooperative, based on a solar park’s cash flow in three scenarios. No investment advice, no offer.",
    featureList: ["Shares and contribution", "Park cash flow after interest and repayment", "Costs, reserves and capital preservation of the cooperative", "Poor, base and good scenarios", "Capital gains tax optional"],
  },
  annahmen: [
    ["Share (example)", e.eur(B.anteilEur)],
    ["Cooperative costs", `${e.pct(B.verwaltungAnteil * 100, 1)} of capital p.a.`],
    ["Reserve", `${e.pct(B.ruecklageAnteil * 100)} of the surplus`],
    ["Capital preservation", "Contribution ÷ term per year"],
    ["Park: EEG / term", `${e.fmt(ERLOESE.eegFreiflaecheCt, 1)} ct · ${FREIFLAECHE.laufzeit} years`],
    ["Park: debt", `${e.pct(FINANZIERUNG.fremdkapitalQuote * 100)} · DSCR ${e.fmt(FINANZIERUNG.dscrZiel, 2)}`],
    ["Capital gains tax, Germany", e.pct(B.kapitalertragsteuer * 100, 3)],
    ["Cooperative status", "being set up"],
  ],
  quellen: [
    { name: "German Cooperatives Act (GenG)" },
    { name: "Bundesnetzagentur (Federal Network Agency) – solar tenders" },
    { name: "Park model: ÖkoInvest solar park calculator" },
  ],
  faqTitel: "Participation – good to know",
  querverweise: [
    { titel: "Cooperative", text: "Structure, co-determination, risks and how to register your interest." },
    { titel: "Agrivoltaics calculator", text: "For farmers: lease, own investment or participation compared." },
    { titel: "Guide: community energy", text: "How participation builds acceptance – and what municipalities gain from it." },
  ],
  cta: {
    eyebrow: "Cooperative being set up",
    title: "Be the first to be informed.",
    text: "Register your interest without obligation. As soon as the articles of association and documents are available, you will receive them first – with no commitment whatsoever.",
    primary: { label: "Register interest" },
    secondary: { label: "To the cooperative" },
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
      toolId="beteiligung"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<BeteiligungRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the participation calculator works</h2>
              <p>
                It is based on our <Link href={seitenPfad("/rechner/solarpark")}>solar park return calculator</Link> with its cautious default values – an EEG award of {e.fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh for 20 years, then market value, construction at {e.eur(FREIFLAECHE.capexProKwp.mittel, "/kWp")}, bank loans sized by debt service coverage. For the poor and the good scenario, we vary revenue, investment and operating costs.
              </p>
              <p>
                The cooperative holds a share in the equity of the park company and receives the same share of the cash flow after interest and repayment. From this we deduct its own costs, set aside a <strong>capital preservation</strong> amount (so that the contributions can be repaid at the end) and allocate {e.pct(B.ruecklageAnteil * 100)} of the surplus to the reserve. Only the remainder would be distributable. The return combines distributions and the repayment of the contribution into one annual figure.
              </p>
              <h3>Why we do not promise a return</h3>
              <p>
                A solar park is a solid but not a risk-free business: irradiation, electricity prices after the subsidy ends, curtailment, interest rates and operating costs fluctuate. The scenarios show the range – not the limits. How the cooperative is to be set up is explained under <Link href={seitenPfad("/genossenschaft")}>Cooperative</Link>.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>So rechnet der Beteiligungsrechner</h2>
              <p>
                Grundlage ist unser <Link href={seitenPfad("/rechner/solarpark")}>Solarpark-Renditerechner</Link> mit seinen vorsichtigen Standardwerten – EEG-Zuschlag {fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh für
                20 Jahre, danach Marktwert, Errichtung {fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp, Bankdarlehen nach Schuldendienstdeckung. Für das schlechte und das gute Szenario verändern wir
                Erlöse, Investition und Betriebskosten.
              </p>
              <p>
                Die Genossenschaft hält einen Anteil am Eigenkapital der Parkgesellschaft und erhält denselben Anteil am Cashflow nach Zins und Tilgung. Davon ziehen wir ihre eigenen Kosten ab,
                legen einen <strong>Kapitalerhalt</strong> zurück (damit die Einlagen am Ende zurückgezahlt werden können) und führen {fmt(B.ruecklageAnteil * 100)} % des Überschusses der Rücklage zu.
                Nur der Rest wäre ausschüttungsfähig. Die Rendite fasst Ausschüttungen und Rückzahlung der Einlage zu einem Jahreswert zusammen.
              </p>
              <h3>Warum wir keine Rendite versprechen</h3>
              <p>
                Ein Solarpark ist ein solides, aber kein risikoloses Geschäft: Einstrahlung, Strompreise nach Förderende, Abregelung, Zinsen und Betriebskosten schwanken. Die Szenarien zeigen die
                Bandbreite – nicht die Grenzen. Wie die Genossenschaft aufgebaut werden soll, lesen Sie unter <Link href={seitenPfad("/genossenschaft")}>Genossenschaft</Link>.
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

export const generateMetadata = seitenMetadata("/rechner/beteiligung", metadata, { en: metadataEn });

// src/app/(stamm)/rechner/gebaeudestrom/page.js – Gebäudestrom-Rechner (Welle 4, Paket GEBAEUDE)
//
// DE, AT und CH (TOOLS: laender DACH): Der Rechner rechnet NUR Energiemengen und Anteile – keine
// Geldwerte, solange Mieterstromzuschlag, Tarife und Netzentgelt-Folgen je Land nicht am Original
// geprüft sind (Faktenregister src/lib/fakten/daten/gebaeudestrom.js, status "zu_pruefen", E6).
// Rechenlogik: src/lib/rechner/gebaeudestrom.js. Bericht: src/lib/bericht/gebaeudestrom.js.
// noindex bis zur Fachprüfung (src/lib/land/seiten.js index: false; englisch src/lib/sprache/seiten.js).
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln: src/lib/sprache/woerterbuch.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import GebaeudestromRechner from "@/components/Rechner/GebaeudestromRechner";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { ANNAHMEN, DACHARTEN, GEBAEUDETYPEN } from "@/lib/rechner/gebaeudestrom";
import { SPEICHER_PLUS } from "@/lib/rechner/energySharing";

const PFAD = seitenPfad("/rechner/gebaeudestrom");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Gebäudestrom-Rechner: PV im Mehrparteienhaus | ÖkoInvest",
  description:
    "Wie viel Solarstrom vom Dach nutzen die Einheiten im Gebäude? Anlagengröße, Eigenverbrauch und Deckung für die Modelle in DE, AT und CH berechnen.",
  keywords: ["Mieterstrom Rechner", "Gemeinschaftliche Gebäudeversorgung 42b", "Gemeinschaftliche Erzeugungsanlage ElWOG", "ZEV Rechner", "PV Mehrfamilienhaus Eigenverbrauch", "Gebäudestrom"],
});

// Fachprüfung offen (Register index: false): auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const metadataEn = rechnerMetadataEn({
  title: "Building power calculator: apartment PV | ÖkoInvest",
  description:
    "How much rooftop solar do the units in a building use? Calculate plant size, self-consumption and coverage for DE, AT and CH building power models.",
  keywords: ["tenant electricity calculator Germany", "shared building supply 42b EnWG", "jointly operated generation plant Austria", "ZEV calculator Switzerland", "PV apartment building self-consumption"],
});

function annahmenZeilen(sprache) {
  const f = formate(sprache);
  const en = sprache === "en";
  const spanne = (w, einheit = "") => `${f.fmt(w.min)}–${f.fmt(w.max)}${einheit} (Start ${f.fmt(w.standard)}${einheit})`;
  const geneigt = DACHARTEN.find((d) => d.id === "geneigt");
  const flach = DACHARTEN.find((d) => d.id === "flach");
  const a = (id) => GEBAEUDETYPEN.find((g) => g.id === id).a;
  return en
    ? [
        ["Roof area per kWp, pitched roof", `${f.fmt(geneigt.m2ProKwp)} m² (yield factor ${f.fmt(geneigt.ertragFaktor, 2)})`],
        ["Roof area per kWp, flat roof", `${f.fmt(flach.m2ProKwp)} m² (yield factor ${f.fmt(flach.ertragFaktor, 2)})`],
        ["Specific yield", "by region (as in the other calculators)"],
        ["Consumption per residential unit", spanne(ANNAHMEN.W_WE, " kWh")],
        ["Consumption per commercial unit", spanne(ANNAHMEN.W_GE, " kWh")],
        ["Participation rate", `${f.fmt(ANNAHMEN.TEILNAHME.min * 100)}–${f.fmt(ANNAHMEN.TEILNAHME.max * 100)} % (start ${f.fmt(ANNAHMEN.TEILNAHME.standard * 100)} %)`],
        ["Simultaneity limit (residential / mixed / commercial)", `${f.fmt(a("wohn"), 2)} / ${f.fmt(a("gemischt"), 2)} / ${f.fmt(a("gewerbe"), 2)}`],
        ["Storage bonus on the simultaneity limit", `+${f.fmt(SPEICHER_PLUS, 2)}`],
        ["Monetary values (surcharge, tariffs, grid fees)", "deliberately not calculated"],
      ]
    : [
        ["Dachfläche je kWp, geneigtes Dach", `${f.fmt(geneigt.m2ProKwp)} m² (Ertragsfaktor ${f.fmt(geneigt.ertragFaktor, 2)})`],
        ["Dachfläche je kWp, Flachdach", `${f.fmt(flach.m2ProKwp)} m² (Ertragsfaktor ${f.fmt(flach.ertragFaktor, 2)})`],
        ["Spezifischer Ertrag", "je Region (wie in den übrigen Rechnern)"],
        ["Verbrauch je Wohneinheit", spanne(ANNAHMEN.W_WE, " kWh")],
        ["Verbrauch je Gewerbeeinheit", spanne(ANNAHMEN.W_GE, " kWh")],
        ["Teilnahmequote", `${f.fmt(ANNAHMEN.TEILNAHME.min * 100)}–${f.fmt(ANNAHMEN.TEILNAHME.max * 100)} % (Start ${f.fmt(ANNAHMEN.TEILNAHME.standard * 100)} %)`],
        ["Gleichzeitigkeitsgrenze (Wohnen / gemischt / Gewerbe)", `${f.fmt(a("wohn"), 2)} / ${f.fmt(a("gemischt"), 2)} / ${f.fmt(a("gewerbe"), 2)}`],
        ["Speicher-Aufschlag auf die Gleichzeitigkeitsgrenze", `+${f.fmt(SPEICHER_PLUS, 2)}`],
        ["Geldwerte (Zuschlag, Tarife, Netzentgelte)", "bewusst nicht gerechnet"],
      ];
}

const FAQ = [
  {
    q: "Welche Modelle rechnet der Rechner?",
    a: "Je Land das passende: In Deutschland Mieterstrom (§ 21 Abs. 3 EEG) und die Gemeinschaftliche Gebäudeversorgung (§ 42b EnWG), in Österreich die Gemeinschaftliche Erzeugungsanlage (§ 16a ElWOG), in der Schweiz den Zusammenschluss zum Eigenverbrauch (ZEV) und den virtuellen ZEV. Die Energiebilanz ist in allen Modellen dieselbe – unterschiedlich sind Rollen, Messung und Abrechnung.",
  },
  {
    q: "Warum zeigt der Rechner keine Euro- oder Franken-Beträge?",
    a: "Weil wir nur Werte zeigen, die an der Originalquelle geprüft sind. Die Höhe des Mieterstromzuschlags, Tarife und Netzentgelt-Folgen je Land sind bei uns noch in der fachlichen Prüfung. Bis dahin rechnet der Rechner ehrlich mit Energiemengen und Anteilen – das genügt, um zu sehen, ob Gebäude und Anlage zusammenpassen.",
  },
  {
    q: "Was ist der Unterschied zwischen Mieterstrom und § 42b EnWG?",
    nurDE: "Modellwahl",
    a: "Beim Mieterstrom wird der Betreiber Stromlieferant der Teilnehmenden und hat Anspruch auf den Mieterstromzuschlag (§ 21 Abs. 3 EEG) – mit den Pflichten eines Lieferanten. Bei der Gemeinschaftlichen Gebäudeversorgung (§ 42b EnWG) wird der Strom nach einem vereinbarten Schlüssel verteilt, ohne dass der Betreiber Lieferant wird; jeder behält seinen eigenen Stromvertrag für den Reststrom.",
  },
  {
    q: "Müssen alle im Haus mitmachen?",
    a: "Nein. Die Teilnahme ist in allen vier Modellen freiwillig. Wer nicht teilnimmt, bezieht seinen Strom unverändert vom eigenen Lieferanten. Deshalb rechnet der Rechner mit einer Teilnahmequote – konservativ mit 70 % als Startwert.",
  },
  {
    q: "Wie realistisch ist der Eigenverbrauchsanteil?",
    a: "Er ist bewusst vorsichtig geschätzt: Im Gebäude genutzt wird nur Strom, der zeitgleich erzeugt und verbraucht wird. Wir nähern das über eine Sättigungskurve mit einer Gleichzeitigkeitsgrenze je Nutzungsmix – dieselbe Methodik wie im Energy-Sharing-Rechner. Maßgeblich sind am Ende die Viertelstundenwerte des Messkonzepts.",
  },
  {
    q: "Was bringt ein Speicher?",
    a: "Er verschiebt Mittagsstrom in den Abend und erhöht so den im Haus genutzten Anteil – im Rechner als Aufschlag auf die Gleichzeitigkeitsgrenze abgebildet. Ob sich ein Speicher wirtschaftlich lohnt, hängt von Preisen ab, die wir hier bewusst nicht rechnen.",
  },
  {
    q: "Gilt der Rechner auch für Wohnungseigentümergemeinschaften?",
    a: "Ja. Ob Mietshaus, WEG oder gemischt genutztes Gebäude – entscheidend sind Einheiten, Verbrauch und Dachfläche. Für WEG und Wohnbaugesellschaften kommen Beschlussfassung und Abrechnung dazu; dabei unterstützen wir.",
  },
];

const FAQ_EN = [
  {
    q: "Which models does the calculator cover?",
    a: "The appropriate one per country: in Germany tenant electricity (§ 21 (3) EEG) and shared building supply (§ 42b EnWG), in Austria the jointly operated generation plant (§ 16a ElWOG), in Switzerland the self-consumption grouping (ZEV) and the virtual ZEV. The energy balance is the same in all models – what differs are roles, metering and billing.",
  },
  {
    q: "Why does the calculator not show euro or franc amounts?",
    a: "Because we only show figures verified at the original source. The level of the tenant electricity surcharge, tariffs and grid fee effects per country are still under expert review. Until then the calculator honestly works with energy volumes and shares – enough to see whether building and plant fit together.",
  },
  {
    q: "What is the difference between tenant electricity and § 42b EnWG?",
    nurDE: "Choice of model",
    a: "With tenant electricity, the operator becomes the participants’ electricity supplier and is entitled to the tenant electricity surcharge (§ 21 (3) EEG) – with a supplier’s duties. With shared building supply (§ 42b EnWG), the power is distributed according to an agreed key without the operator becoming a supplier; everyone keeps their own electricity contract for residual power.",
  },
  {
    q: "Does everyone in the building have to take part?",
    a: "No. Participation is voluntary in all four models. Anyone who does not take part continues to buy power from their own supplier. That is why the calculator uses a participation rate – conservatively starting at 70%.",
  },
  {
    q: "How realistic is the self-consumption share?",
    a: "It is deliberately cautious: only power generated and consumed at the same time is used in the building. We approximate this with a saturation curve and a simultaneity limit per usage mix – the same methodology as in the energy sharing calculator. In the end, the quarter-hourly values of the metering concept are authoritative.",
  },
  {
    q: "What does storage add?",
    a: "It shifts midday power into the evening and so increases the share used in the building – modelled as a bonus on the simultaneity limit. Whether storage pays off financially depends on prices, which we deliberately do not calculate here.",
  },
  {
    q: "Does the calculator also work for owners’ associations?",
    a: "Yes. Whether rental building, owners’ association or mixed-use building – what matters are units, consumption and roof area. For owners’ associations and housing companies, resolutions and billing come on top; we support both.",
  },
];

const DE = {
  breadcrumb: "Gebäudestrom-Rechner",
  eyebrow: "Für Gebäude · Mieterstrom, GGV, GEA, ZEV",
  title: (
    <>
      Solarstrom vom eigenen Dach – <span className="ov-text-gradient-light">für alle im Haus.</span>
    </>
  ),
  lead: "Einheiten, Verbrauch und Dachfläche eingeben: Der Rechner zeigt die mögliche Anlagengröße, wie viel Solarstrom im Gebäude genutzt wird und wer wie profitiert – je Land im passenden Modell. Ehrlich: nur Energiemengen, keine Renditeversprechen.",
  chips: ["DE · AT · CH mit eigenem Modell", "Konservative Annahmen mit Quelle", "Ohne Geldwerte bis zur Prüfung", "Bericht mit Rechenweg"],
  app: {
    name: "Gebäudestrom-Rechner",
    description: "Berechnet für ein Mehrparteien- oder Gewerbegebäude die mögliche PV-Anlagengröße, den im Gebäude genutzten Solarstrom und die Deckung des teilnehmenden Verbrauchs – für Mieterstrom, Gemeinschaftliche Gebäudeversorgung, GEA und ZEV/vZEV.",
    featureList: [
      "Modelle je Land: Mieterstrom und § 42b EnWG, § 16a ElWOG, ZEV/vZEV",
      "Anlagengröße aus Dachfläche und Dachform",
      "Eigenverbrauchsanteil über eine konservative Gleichzeitigkeits-Näherung",
      "Deckung des teilnehmenden Verbrauchs und Überschuss ins Netz",
      "Wer profitiert wie – je Modell erklärt",
      "Bericht mit Rechenweg und Annahmenbuch",
    ],
  },
  quellen: [
    { name: "EEG 2023, § 21 Abs. 3 (Mieterstromzuschlag)", url: "https://www.gesetze-im-internet.de/eeg_2014/__21.html" },
    { name: "EnWG, § 42b (Gemeinschaftliche Gebäudeversorgung)", url: "https://www.gesetze-im-internet.de/enwg_2005/__42b.html" },
    { name: "ElWOG 2010, § 16a (RIS)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007045" },
    { name: "EnG (SR 730.0), Art. 17–18 (ZEV)", url: "https://www.fedlex.admin.ch/eli/cc/2017/762/de" },
    { name: "Rechenannahmen: eigene Einschätzung ÖkoInvest" },
  ],
  faqTitel: "Gebäudestrom – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/gebaeudestrom"), titel: "Gebäudestrom für Gebäude", text: "Modelle, Ablauf und Einstiege für Hausverwaltungen und Wohnbaugesellschaften." },
    { href: seitenPfad("/dachflaeche-verpachten"), titel: "Dachfläche verpachten", text: "Großes Gewerbedach? Pachtmodelle und Dachstrom im Vergleich." },
    { href: seitenPfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "Strom über das Gebäude hinaus teilen – Modelle je Land." },
  ],
  cta: {
    eyebrow: "Gebäudestrom",
    title: "Passt Gebäudestrom zu Ihrem Haus?",
    text: "Schicken Sie uns Eckdaten zu Gebäude und Dach. Wir prüfen Machbarkeit und passendes Modell – kostenlos und unverbindlich.",
    primary: { label: "Machbarkeit anfragen", href: "/kontakt?anliegen=dach#formular" },
    secondary: { label: "So funktioniert Gebäudestrom", href: seitenPfad("/gebaeudestrom") },
  },
};

const EN = {
  breadcrumb: "Building power calculator",
  eyebrow: "For buildings · tenant electricity, GGV, GEA, ZEV",
  title: (
    <>
      Solar power from your own roof – <span className="ov-text-gradient-light">for everyone in the building.</span>
    </>
  ),
  lead: "Enter units, consumption and roof area: the calculator shows the possible plant size, how much solar power is used in the building and who benefits how – in the appropriate model per country. Honestly: energy volumes only, no promised returns.",
  chips: ["DE · AT · CH, each with its own model", "Conservative assumptions with sources", "No monetary values until reviewed", "Report with calculation method"],
  app: {
    name: "Building power calculator",
    description: "Calculates the possible PV plant size for an apartment or commercial building, the solar power used in the building and the coverage of participating consumption – for tenant electricity, shared building supply, GEA and ZEV/vZEV.",
    featureList: [
      "Models per country: tenant electricity and § 42b EnWG, § 16a ElWOG, ZEV/vZEV",
      "Plant size from roof area and roof shape",
      "Self-consumption share via a conservative simultaneity approximation",
      "Coverage of participating consumption and surplus to the grid",
      "Who benefits how – explained per model",
      "Report with calculation method and assumptions",
    ],
  },
  quellen: [
    { name: "German EEG 2023, § 21 (3) (tenant electricity surcharge)" },
    { name: "German EnWG, § 42b (shared building supply)" },
    { name: "Austrian ElWOG 2010, § 16a (RIS)" },
    { name: "Swiss Energy Act (EnG, SR 730.0), Art. 17–18 (ZEV)" },
    { name: "Calculation assumptions: ÖkoInvest’s own estimate" },
  ],
  faqTitel: "Building power – good to know",
  querverweise: [
    { titel: "Building power for buildings", text: "Models, process and entry points for property managers and housing companies." },
    { titel: "Lease your roof", text: "Large commercial roof? Lease models and rooftop power compared." },
    { titel: "Energy communities", text: "Share power beyond the building – models per country." },
  ],
  cta: {
    eyebrow: "Building power",
    title: "Does building power suit your property?",
    text: "Send us the key figures for the building and roof. We check feasibility and the appropriate model – free of charge and without obligation.",
    primary: { label: "Request a feasibility check" },
    secondary: { label: "How building power works" },
  },
};

export default async function GebaeudestromRechnerPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="gebaeudestrom"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<GebaeudestromRechner />}
      erklaerung={
        en ? (
          <div className="ov-prose">
            <h2>How the building power calculator works</h2>
            <p>
              From the roof area and roof shape, the calculator derives the possible <strong>plant size</strong> and, with the regional yield, the annual <strong>generation</strong> – the same technical assumptions as in our other calculators. The participating consumption comes from the number of units, their consumption and a <strong>participation rate</strong>: taking part is voluntary in every model.
            </p>
            <p>
              Only power generated and consumed at the same time counts as used in the building. We approximate this with a <strong>saturation curve</strong> and a simultaneity limit per usage mix – residential buildings consume mainly in the evening, commercial buildings during the day. Storage raises the limit. The result is the <strong>self-consumption share</strong>, the <strong>coverage</strong> of participating consumption and the surplus fed into the grid.
            </p>
            <h3>What the calculator deliberately does not do</h3>
            <ul>
              <li>No euro or franc amounts: surcharge levels, tariffs and grid fee effects per country are still under expert review – we do not show unverified figures.</li>
              <li>No promised returns: whether a project pays off depends on prices, contracts and billing in the chosen model.</li>
              <li>No legal advice: metering concept, resolutions and contracts need professional planning – that is where we come in.</li>
            </ul>
            <p>
              The <Link href={seitenPfad("/gebaeudestrom")}>building power page</Link> explains the models per country and the process for property managers and housing companies.
            </p>
          </div>
        ) : (
          <div className="ov-prose">
            <h2>So rechnet der Gebäudestrom-Rechner</h2>
            <p>
              Aus Dachfläche und Dachform leitet der Rechner die mögliche <strong>Anlagengröße</strong> ab, mit dem Regionsertrag die <strong>Jahreserzeugung</strong> – dieselben technischen Annahmen wie in unseren übrigen Rechnern. Der teilnehmende Verbrauch ergibt sich aus Einheiten, Verbrauch je Einheit und einer <strong>Teilnahmequote</strong>: Mitmachen ist in jedem Modell freiwillig.
            </p>
            <p>
              Im Gebäude genutzt wird nur Strom, der zeitgleich erzeugt und verbraucht wird. Das nähern wir über eine <strong>Sättigungskurve</strong> mit einer Gleichzeitigkeitsgrenze je Nutzungsmix – Wohngebäude verbrauchen vor allem abends, Gewerbe tagsüber. Ein Speicher hebt die Grenze an. Ergebnis sind der <strong>Eigenverbrauchsanteil</strong>, die <strong>Deckung</strong> des teilnehmenden Verbrauchs und der Überschuss, der ins Netz geht.
            </p>
            <h3>Was der Rechner bewusst nicht kann</h3>
            <ul>
              <li>Keine Euro- oder Franken-Beträge: Zuschlagshöhe, Tarife und Netzentgelt-Folgen je Land sind noch in der fachlichen Prüfung – ungeprüfte Zahlen zeigen wir nicht.</li>
              <li>Keine Renditeversprechen: Ob sich ein Projekt rechnet, hängt von Preisen, Verträgen und der Abrechnung im gewählten Modell ab.</li>
              <li>Keine Rechtsberatung: Messkonzept, Beschlüsse und Verträge gehören in die Fachplanung – genau dort unterstützen wir.</li>
            </ul>
            <p>
              Die <Link href={seitenPfad("/gebaeudestrom")}>Gebäudestrom-Seite</Link> erklärt die Modelle je Land und den Ablauf für Hausverwaltungen und Wohnbaugesellschaften.
            </p>
          </div>
        )
      }
      annahmen={annahmenZeilen(sprache)}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/gebaeudestrom", metadata, { en: metadataEn });

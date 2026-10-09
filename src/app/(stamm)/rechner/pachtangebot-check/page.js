// src/app/rechner/pachtangebot-check/page.js – Pachtangebot eines Projektierers prüfen
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import PachtangebotCheck from "@/components/Rechner/PachtangebotCheck";
import SectionHeading from "@/components/ui/SectionHeading";
import { FREIFLAECHE, PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { optionEn } from "@/lib/sprache/rechnerBegriffe";

const PFAD = seitenPfad("/rechner/pachtangebot-check");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Pachtangebot Solarpark prüfen: Klausel-Check | ÖkoInvest",
  description:
    "Pachtangebot für Solarpark oder Agri-PV prüfen: Barwert, Marktvergleich und Ampel für jede Klausel – Rückbau, Laufzeit, Grundbuch. Mit Fragenliste zum Drucken.",
  keywords: ["Pachtangebot Solarpark prüfen", "Pachtvertrag Photovoltaik Checkliste", "Solarpark Pachtvertrag Klauseln", "Rückbaubürgschaft Solarpark", "Dienstbarkeit Solarpark", "Reservierungsprämie Solarpark"],
});

const metadataEn = rechnerMetadataEn({
  title: "Check a solar park lease offer: clause check | ÖkoInvest",
  description:
    "Check a lease offer for a solar park or agrivoltaics: present value, market comparison and a traffic light for every clause – decommissioning, term, land register. With a printable question list.",
  keywords: ["check solar park lease offer", "photovoltaic lease contract checklist", "solar park lease clauses", "decommissioning bond solar park", "easement solar park", "reservation fee solar park"],
});

const FAQ = [
  {
    q: "Woran erkenne ich ein gutes Pachtangebot für einen Solarpark?",
    a: `Nicht allein an der Zahl pro Hektar. Entscheidend ist das Zusammenspiel: eine Pacht in der üblichen Spanne (Freifläche derzeit meist ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha), eine Wertsicherung über 30 Jahre, eine Reservierungsprämie bis Baubeginn, ein spätestes Datum für den Baubeginn, eine Bankbürgschaft für den Rückbau und klare Regeln, was passiert, wenn nicht gebaut wird. Ein hoher Hektarpreis nützt wenig, wenn die Fläche zehn Jahre ohne Zahlung blockiert ist.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Was ist der Unterschied zwischen Summe und Barwert?",
    a: "Die Summe addiert alle Zahlungen über die Laufzeit. Der Barwert rechnet jede Zahlung auf heute zurück – eine Pacht in 25 Jahren ist heute weniger wert als eine Zahlung im nächsten Jahr. Mit dem Barwert lassen sich Angebote mit unterschiedlicher Laufzeit, Indexierung und Vorlaufzeit fair vergleichen. Den Kalkulationszins können Sie im Rechner selbst wählen.",
  },
  {
    q: "Welche Rückbausicherheit sollte ich verlangen?",
    a: `Üblich und am belastbarsten ist eine unbefristete, selbstschuldnerische Bürgschaft einer Bank oder eines Versicherers, die spätestens mit Baubeginn vorliegt und die Rückbaukosten deckt – als Größenordnung rechnen wir mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp. Eine Konzernbürgschaft oder eine im Betrieb angesparte Rücklage ist schwächer, weil sie im Insolvenzfall fehlen kann.`,
    nurDE: "Richtwerte",
  },
  {
    q: "Warum soll die Dienstbarkeit ins Grundbuch – und in welchem Rang?",
    a: "Die finanzierende Bank des Solarparks verlangt eine beschränkte persönliche Dienstbarkeit, meist im ersten Rang. Nur so bleibt der Park auch bei einem Eigentümerwechsel oder einer Zwangsversteigerung gesichert. Für Sie wichtig: Die Eintragung sollte erst erfolgen, wenn der Bau tatsächlich kommt, oder mit einer Pflicht zur Löschung auf Kosten des Pächters verbunden sein. Bestehende Grundschulden müssen oft im Rang zurücktreten – sprechen Sie früh mit Ihrer Bank.",
  },
  {
    q: "Wie lange darf ein Projektierer meine Fläche reservieren?",
    a: `Planung, B-Plan-Verfahren und Netzanschluss dauern häufig ${PACHT.reservierungJahre.ueblich}–${PACHT.reservierungJahre.max} Jahre. Sinnvoll ist eine feste Frist bis zum spätesten Baubeginn, nach der der Vertrag automatisch endet, und eine Reservierungsprämie für jedes Jahr der Bindung. Verlängerungen sollten nur gegen eine höhere Prämie möglich sein.`,
    nurDE: "Richtwerte",
  },
  {
    q: "Was bedeutet die Verpachtung für Erbschaft- und Grundsteuer?",
    a: "Das ist ein oft unterschätzter Punkt. Für land- und forstwirtschaftliche Flächen gelten bei Erbschaft- und Schenkungsteuer günstige Regeln. Eine Fläche, die für einen Solarpark verpachtet wird, kann nach aktuellem Stand aus dem land- und forstwirtschaftlichen Vermögen herausfallen – eine allgemeine Sonderregel für klassische Freiflächen-PV gibt es nicht. Beziehen Sie Ihre Steuerberatung vor der Unterschrift ein.",
    nurDE: "Steuerregeln",
  },
  {
    q: "Werden meine Angaben gespeichert?",
    a: "Nein. Der Check läuft vollständig in Ihrem Browser. Wenn Sie möchten, dass wir Ihr Angebot gemeinsam ansehen oder Ihnen ein eigenes machen, nutzen Sie den Flächencheck – erst dann übermitteln Sie Daten an uns.",
  },
];

const FAQ_EN = [
  {
    q: "How do I recognise a good lease offer for a solar park?",
    a: `Not by the figure per hectare alone. What matters is how everything fits together: a lease within the usual range (ground-mounted currently mostly ${e.eur(PACHT.freiflaecheProHa.min)}–${e.eur(PACHT.freiflaecheProHa.max, "/ha")}), value protection over 30 years, a reservation fee until construction starts, a latest date for the start of construction, a bank guarantee for decommissioning and clear rules on what happens if nothing is built. A high price per hectare is of little use if the land is blocked for ten years without payment.`,
    nurDE: "Lease rates",
  },
  {
    q: "What is the difference between the total and the present value?",
    a: "The total adds up all payments over the term. The present value discounts each payment back to today – a lease payment in 25 years is worth less today than a payment next year. The present value allows a fair comparison of offers with different terms, indexation and lead times. You can choose the discount rate yourself in the calculator.",
  },
  {
    q: "What decommissioning security should I demand?",
    a: `The usual and most robust option is an unlimited, directly enforceable guarantee from a bank or insurer that is in place by the start of construction at the latest and covers the decommissioning costs – as an order of magnitude, we calculate with around ${e.eur(FREIFLAECHE.rueckbauProKwp, "/kWp")}. A parent company guarantee or a reserve built up during operation is weaker, because it may be missing in the event of insolvency.`,
    nurDE: "Guide values",
  },
  {
    q: "Why should the easement be entered in the land register – and with which ranking?",
    a: "The bank financing the solar park requires a limited personal easement (beschränkte persönliche Dienstbarkeit), usually ranking first. Only then does the park remain secured even if the owner changes or the land is sold at a forced auction. Important for you: the entry should only be made once construction is actually going ahead, or be combined with an obligation to have it deleted at the lessee’s expense. Existing land charges often have to step back in rank – talk to your bank early.",
  },
  {
    q: "How long may a developer reserve my land?",
    a: `Planning, the development plan procedure and grid connection often take ${PACHT.reservierungJahre.ueblich}–${PACHT.reservierungJahre.max} years. It makes sense to agree a fixed deadline for the latest start of construction, after which the contract ends automatically, and a reservation fee for every year of commitment. Extensions should only be possible against a higher fee.`,
    nurDE: "Guide values",
  },
  {
    q: "What does leasing mean for inheritance tax and property tax?",
    a: "This point is often underestimated. In Germany, favourable inheritance and gift tax rules apply to agricultural and forestry land. Land leased for a solar park may, as things stand, no longer count as agricultural and forestry assets – there is no general special rule for conventional ground-mounted PV. Involve your tax adviser before signing.",
    nurDE: "Tax rules",
  },
  {
    q: "Are my details stored?",
    a: "No. The check runs entirely in your browser. If you would like us to look at your offer together or make you an offer of our own, use the land check – only then do you send us any data.",
  },
];

const DE = {
  breadcrumb: "Pachtangebot prüfen",
  eyebrow: "Für Flächeneigentümer · Klausel-Check",
  title: (
    <>
      Pachtangebot erhalten? <span className="ov-text-gradient-light">Erst prüfen, dann unterschreiben.</span>
    </>
  ),
  lead: "Geben Sie die Eckdaten des Angebots ein: Sie erhalten Summe und Barwert, den Vergleich mit dem Markt, eine Ampel für jede wichtige Klausel und die Fragen, die Sie dem Projektierer stellen sollten.",
  chips: ["Bis zu 13 Klauseln im Check", "Barwert & Marktvergleich", "Fragenliste zum Drucken", "Daten bleiben im Browser"],
  app: {
    name: "Pachtangebot-Check Solarpark",
    description: "Prüft ein Pachtangebot für Freiflächen- oder Agri-PV: Zahlungsreihe, Summe, Barwert, Marktvergleich, Ampel-Bewertung der Vertragsklauseln und Fragen an den Projektierer.",
    featureList: [
      "Festpacht, Umsatzbeteiligung und Mindestpacht",
      "Barwert mit wählbarem Kalkulationszins",
      "Vergleich mit der marktüblichen Pachtspanne",
      "Ampel für Laufzeit, Indexierung, Reservierung, Rückbausicherheit, Kündigung, Nebenflächen, Dienstbarkeit",
      "Checkliste Fragen an den Projektierer",
      "Druckansicht",
    ],
  },
  methodik: {
    eyebrow: "So prüfen wir",
    title: "Ein Pachtvertrag bindet eine Generation. Jede Klausel zählt.",
    lead: "Der Check vergleicht Ihr Angebot mit dem, was im DACH-Raum derzeit üblich ist – nicht mit dem bestmöglichen Einzelfall. Er ersetzt keine anwaltliche Prüfung, zeigt aber, wo Sie nachfragen sollten.",
  },
  annahmen: [
    ["Pacht Freifläche (Spanne)", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha·a`],
    ["Pacht Agri-PV (Spanne)", `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha·a`],
    ["Umsatzbeteiligung üblich", `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} %`],
    ["Reservierungsprämie", `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha·a`],
    ["Frist bis Baubeginn", `üblich bis ${PACHT.reservierungJahre.ueblich}, max. ${PACHT.reservierungJahre.max} Jahre`],
    ["Laufzeit üblich", `${PACHT.laufzeit} Jahre + ${PACHT.verlaengerung}`],
    ["VPI-Indexierung (Vergleich)", `${fmt(PACHT.indexierung * 100, 1)} % p. a.`],
    ["Rückbaukosten (Größenordnung)", `${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp`],
    ["Anwaltliche Prüfung", `${fmt(PACHT.anwaltskosten.min)}–${fmt(PACHT.anwaltskosten.max)} €`],
    ["Kalkulationszins (Standard)", `${fmt(PACHT.diskontEigentuemer * 100, 1)} %`],
  ],
  quellen: [
    { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { name: "EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/" },
    { name: "Bewertungsgesetz § 158", url: "https://www.gesetze-im-internet.de/bewg/__158.html" },
    { name: "Marktspannen: eigene Einschätzung ÖkoInvest" },
  ],
  faqTitel: "Pachtangebot prüfen – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Pachtvertrag, Rückbausicherheit, Steuern und der Weg bis zur ersten Zahlung." },
    { href: seitenPfad("/rechner/pacht"), titel: "Pachtrechner", text: "Festpacht, indexiert oder Umsatz – über 30 Jahre im Vergleich zu Ackerbau." },
    { href: seitenPfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung, Leistung und realistische Pachtspanne Ihrer konkreten Fläche." },
  ],
  cta: {
    eyebrow: "Für Flächeneigentümer kostenfrei",
    title: "Vergleichen Sie mit einem zweiten Angebot.",
    text: "Wir prüfen Ihre Fläche und legen Ihnen ein schriftliches Angebot mit Vertragsentwurf vor – mit Bankbürgschaft für den Rückbau und klarer Frist bis Baubeginn. Ohne Kosten, ohne Verpflichtung.",
    primary: { label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") },
    secondary: { label: "Fläche verpachten", href: seitenPfad("/flaeche-verpachten") },
  },
};

const EN = {
  breadcrumb: "Check a lease offer",
  eyebrow: "For landowners · clause check",
  title: (
    <>
      Received a lease offer? <span className="ov-text-gradient-light">Check first, then sign.</span>
    </>
  ),
  lead: "Enter the key terms of the offer: you get the total and present value, a comparison with the market, a traffic light for every important clause and the questions you should ask the developer.",
  chips: ["Up to 13 clauses checked", "Present value & market comparison", "Printable question list", "Data stays in your browser"],
  app: {
    name: "Solar park lease offer check",
    description: "Checks a lease offer for ground-mounted PV or agrivoltaics: payment schedule, total, present value, market comparison, traffic-light assessment of the contract clauses and questions for the developer.",
    featureList: [
      "Fixed lease, revenue share and minimum lease",
      "Present value with selectable discount rate",
      "Comparison with the usual market lease range",
      "Traffic light for term, indexation, reservation, decommissioning security, termination, ancillary areas, easement",
      "Checklist of questions for the developer",
      "Print view",
    ],
  },
  methodik: {
    eyebrow: "How we check",
    title: "A lease contract binds a generation. Every clause counts.",
    lead: "The check compares your offer with what is currently usual in the DACH region – not with the best possible individual case. It does not replace a review by a lawyer, but shows where you should ask questions.",
  },
  annahmen: [
    ["Ground-mounted lease (range)", `${e.eur(PACHT.freiflaecheProHa.min)}–${e.eur(PACHT.freiflaecheProHa.max, "/ha·yr")}`],
    ["Agrivoltaic lease (range)", `${e.eur(PACHT.agriProHa.min)}–${e.eur(PACHT.agriProHa.max, "/ha·yr")}`],
    ["Typical revenue share", `${e.fmt(PACHT.umsatzbeteiligung.min * 100)}–${e.pct(PACHT.umsatzbeteiligung.max * 100)}`],
    ["Reservation fee", `${e.eur(PACHT.reservierungProHa.min)}–${e.eur(PACHT.reservierungProHa.max, "/ha·yr")}`],
    ["Deadline for start of construction", `usually up to ${PACHT.reservierungJahre.ueblich}, max. ${PACHT.reservierungJahre.max} years`],
    ["Typical term", `${PACHT.laufzeit} years + ${optionEn(PACHT.verlaengerung)}`],
    ["CPI indexation (comparison)", `${e.pct(PACHT.indexierung * 100, 1)} p.a.`],
    ["Decommissioning costs (order of magnitude)", e.eur(FREIFLAECHE.rueckbauProKwp, "/kWp")],
    ["Legal review", `${e.eur(PACHT.anwaltskosten.min)}–${e.eur(PACHT.anwaltskosten.max)}`],
    ["Discount rate (default)", e.pct(PACHT.diskontEigentuemer * 100, 1)],
  ],
  quellen: [
    { name: "Bundesnetzagentur (Federal Network Agency) – solar tenders" },
    { name: "EEG 2023 (German Renewable Energy Sources Act)" },
    { name: "German Valuation Act (BewG) § 158" },
    { name: "Market ranges: ÖkoInvest’s own estimate" },
  ],
  faqTitel: "Checking a lease offer – good to know",
  querverweise: [
    { titel: "Lease your land", text: "Lease contract, decommissioning security, taxes and the path to the first payment." },
    { titel: "Lease calculator", text: "Fixed, indexed or revenue-based – over 30 years compared with arable farming." },
    { titel: "Land check", text: "Suitability, capacity and realistic lease range of your specific plot." },
  ],
  cta: {
    eyebrow: "Free of charge for landowners",
    title: "Compare with a second offer.",
    text: "We review your land and send you a written offer with a draft contract – with a bank guarantee for decommissioning and a clear deadline for the start of construction. At no cost, with no obligation.",
    primary: { label: "Have your land checked" },
    secondary: { label: "Lease your land" },
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
      toolId="pachtangebot-check"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<PachtangebotCheck />}
      erklaerung={
        <>
          <SectionHeading eyebrow={t.methodik.eyebrow} title={t.methodik.title} lead={t.methodik.lead} />
          <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
            {en ? (
              <div className="ov-prose mt-8 max-w-2xl">
                <p>
                  Your details produce a <strong>payment schedule</strong>: a reservation fee until the expected start of construction, then the lease over the fixed term – fixed, indexed or as a revenue share based on the expected power yield in your region. From this we calculate the <strong>total</strong> and the <strong>present value</strong>. We calculate the same present value for a market-standard offer at the lower end, in the middle and at the upper end of the range – so you can see at a glance where your offer stands.
                </p>
                <p>
                  We then rate up to 13 contract points with a traffic light: <strong>market standard</strong>, <strong>ask questions</strong> or <strong>critical</strong>. All yellow and red points form your question list – supplemented by topics that should be settled in every contract, such as transfer to third parties or the tax consequences.
                </p>
                <h3>What the check cannot do</h3>
                <ul>
                  <li>Read the contract text: the exact wording is decisive – for example, what a revenue share refers to.</li>
                  <li>Assess your land: whether a higher lease is possible depends on the grid connection, eligible area and planning law. That is what the <Link href={seitenPfad("/flaechencheck")}>land check</Link> shows.</li>
                  <li>Assess taxes: income, inheritance and property tax belong in the hands of your tax adviser.</li>
                </ul>
                <p>
                  What a lease contract with us looks like is explained under <Link href={seitenPfad("/flaeche-verpachten")}>Lease your land</Link>; the pure lease amount over 30 years compared with arable farming is shown by the <Link href={seitenPfad("/rechner/pacht")}>lease calculator</Link>.
                </p>
              </div>
            ) : (
              <div className="ov-prose mt-8 max-w-2xl">
                <p>
                  Aus Ihren Angaben entsteht eine <strong>Zahlungsreihe</strong>: Reservierungsprämie bis zum erwarteten Baubeginn, danach die Pacht über die feste Laufzeit – fest, indexiert
                  oder als Umsatzbeteiligung auf den erwarteten Stromertrag Ihrer Region. Daraus rechnen wir die <strong>Summe</strong> und den <strong>Barwert</strong>. Denselben Barwert
                  bilden wir für ein marktübliches Angebot am unteren Rand, in der Mitte und am oberen Rand der Spanne – so sehen Sie auf einen Blick, wo Ihr Angebot steht.
                </p>
                <p>
                  Anschließend bewerten wir bis zu 13 Vertragspunkte mit einer Ampel: <strong>marktüblich</strong>, <strong>nachfragen</strong> oder <strong>kritisch</strong>. Aus allen gelben und
                  roten Punkten entsteht Ihre Fragenliste – ergänzt um Themen, die in jedem Vertrag geklärt sein sollten, etwa die Übertragung an Dritte oder die steuerlichen Folgen.
                </p>
                <h3>Was der Check nicht kann</h3>
                <ul>
                  <li>Den Vertragstext lesen: Entscheidend ist die genaue Formulierung – etwa, worauf sich eine Umsatzbeteiligung bezieht.</li>
                  <li>Ihre Fläche bewerten: Ob eine höhere Pacht möglich ist, hängt von Netzanschluss, Kulisse und Baurecht ab. Das zeigt der <Link href={seitenPfad("/flaechencheck")}>Flächencheck</Link>.</li>
                  <li>Steuern einschätzen: Einkommen-, Erbschaft- und Grundsteuer gehören in die Hände Ihrer Steuerberatung.</li>
                </ul>
                <p>
                  Wie ein Pachtvertrag mit uns aussieht, lesen Sie unter <Link href={seitenPfad("/flaeche-verpachten")}>Fläche verpachten</Link>; die reine Pachthöhe über 30 Jahre im Vergleich zum Ackerbau
                  zeigt der <Link href={seitenPfad("/rechner/pacht")}>Pachtrechner</Link>.
                </p>
              </div>
            )}
          </NurDEBlock>
        </>
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

export const generateMetadata = seitenMetadata("/rechner/pachtangebot-check", metadata, { en: metadataEn });

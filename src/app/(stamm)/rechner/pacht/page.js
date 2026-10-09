// src/app/rechner/pacht/page.js – Pachtrechner Solarpark
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import PachtRechner from "@/components/Flaeche/PachtRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { JahresSaeulen } from "@/components/Flaeche/Verpachten/Pachtmodelle";
import { pachtRechnung } from "@/lib/rechner/pacht";
import { ERLOESE, FREIFLAECHE, PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/pacht");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Pachtrechner Solarpark: Pacht über 30 Jahre | ÖkoInvest",
  description:
    "Solarpark-Pacht berechnen: Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre – im Vergleich zu Ackerpacht und Deckungsbeitrag. Kostenlos.",
  keywords: ["Pachtrechner Solarpark", "Solarpark Pacht berechnen", "Umsatzpacht Solarpark", "Pacht indexiert Photovoltaik", "Freiflächen PV Pacht"],
});

const metadataEn = rechnerMetadataEn({
  title: "Solar park lease calculator: lease over 30 years | ÖkoInvest",
  description:
    "Calculate your solar park lease: fixed, indexed or revenue-based over 30 years – compared with arable lease and gross margin. Free of charge.",
  keywords: ["solar park lease calculator", "calculate solar park lease", "revenue-based solar lease", "indexed PV lease", "ground-mounted PV lease"],
});

const FAQ = [
  {
    q: "Wie viel Pacht pro Hektar zahlt ein Solarpark?",
    a: `Im DACH-Raum liegen Solarpachten derzeit meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr. Hohe Werte gibt es für große Flächen mit nahem Netzanschluss in der EEG-Kulisse, niedrigere bei langen Kabeltrassen, kleinen Flächen oder schwierigem Baurecht.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Was ist besser: Festpacht oder Umsatzbeteiligung?",
    a: `Festpacht ist planbar und unabhängig vom Strompreis. Eine Umsatzbeteiligung von ${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} % lässt Sie an steigenden Strompreisen teilhaben, schwankt aber mit Ertrag und Preis. Viele Eigentümer wählen eine Kombination: Umsatzbeteiligung mit Mindestpacht – oder eine indexierte Festpacht.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Warum ist die Solarpacht so viel höher als die Ackerpacht?",
    a: `Weil auf einem Hektar rund ${fmt(1 / FREIFLAECHE.haProMwp, 1)} MWp Leistung stehen, die jährlich Strom für mehrere zehntausend Euro erzeugen. Die Pacht ist nur ein kleiner Teil davon. Dafür ist die Fläche 30 Jahre gebunden – die Rückgabe ist über Vertrag, Grundbuch und Rückbaubürgschaft gesichert.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Ist die Pacht vor Baubeginn schon fällig?",
    a: `Nein, die volle Pacht beginnt in der Regel mit dem Bau oder der Inbetriebnahme. Bis dahin zahlen wir meist eine Reservierungsprämie von ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar und Jahr, und Sie bewirtschaften weiter. Das können Sie im Rechner über „Vorlauf bis Baubeginn“ abbilden.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Wie wird die Pacht versteuert?",
    a: "Pachteinnahmen sind einkommensteuerpflichtig. Zudem kann die Verpachtung für einen Solarpark Grund- und Erbschaftsteuer beeinflussen. Der Rechner zeigt Werte vor Steuern – lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung prüfen.",
  },
];

const FAQ_EN = [
  {
    q: "How much lease per hectare does a solar park pay?",
    a: `In the DACH region, solar leases currently mostly range between ${e.eur(PACHT.freiflaecheProHa.min)} and ${e.eur(PACHT.freiflaecheProHa.max)} per hectare per year. Higher rates are paid for large plots with a nearby grid connection within the areas eligible under the EEG (German Renewable Energy Sources Act); lower rates apply to long cable routes, small plots or difficult planning law.`,
    nurDE: "Lease rates",
  },
  {
    q: "Which is better: a fixed lease or a revenue share?",
    a: `A fixed lease is predictable and independent of the electricity price. A revenue share of ${e.fmt(PACHT.umsatzbeteiligung.min * 100)}–${e.pct(PACHT.umsatzbeteiligung.max * 100)} lets you benefit from rising electricity prices, but fluctuates with yield and price. Many owners choose a combination: a revenue share with a minimum lease – or an indexed fixed lease.`,
    nurDE: "Lease rates",
  },
  {
    q: "Why is the solar lease so much higher than the arable lease?",
    a: `Because around ${e.fmt(1 / FREIFLAECHE.haProMwp, 1)} MWp of capacity stands on one hectare, generating electricity worth several tens of thousands of euros every year. The lease is only a small part of that. In return, the land is committed for 30 years – its return is secured by the contract, the land register and a decommissioning bond.`,
    nurDE: "Lease rates",
  },
  {
    q: "Is the lease already payable before construction starts?",
    a: `No – the full lease usually starts with construction or commissioning. Until then, we usually pay a reservation fee of ${e.eur(PACHT.reservierungProHa.min)}–${e.eur(PACHT.reservierungProHa.max)} per hectare per year, and you continue to farm the land. You can model this in the calculator under “Lead time until construction”.`,
    nurDE: "Lease rates",
  },
  {
    q: "How is the lease taxed?",
    a: "Lease income is subject to income tax. Leasing land for a solar park can also affect property tax and inheritance tax. The calculator shows figures before tax – have your tax adviser review your case before signing a contract.",
  },
];

/** Mini-Vergleich der drei Modelle (Beispiel 10 ha, Süd-DE, Standardwerte des Rechners) */
function ModellMinis({ en }) {
  const f = formate(en ? "en" : "de");
  const reihen = [
    { t: en ? "Fixed lease" : "Festpacht", x: en ? "constant" : "gleichbleibend", r: pachtRechnung({ modell: "fest" }), ton: "fill-ov-400" },
    { t: en ? "Indexed" : "Indexiert", x: en ? `+${f.pct(PACHT.indexierung * 100, 1)} p.a.` : `+${fmt(PACHT.indexierung * 100, 1)} % p. a.`, r: pachtRechnung({ modell: "index" }), ton: "fill-ov-600" },
    { t: en ? "Revenue" : "Umsatz", x: en ? "6% of revenue" : "6 % der Erlöse", r: pachtRechnung({ modell: "umsatz", umsatzAnteil: 0.06 }), ton: "fill-navy-500" },
  ];
  const max = Math.max(...reihen.flatMap((m) => m.r.jahre.map((j) => j.solar)));
  return (
    <Reveal className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
      {reihen.map((m) => (
        <div key={m.t} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
          <p className="font-display text-[15.5px] font-bold text-ink-900">{m.t}</p>
          <p className="text-[12.5px] text-ink-600">{m.x}</p>
          <div className="mt-3 rounded-xl bg-white px-2.5 pb-1.5 pt-2.5 ring-1 ring-ink-200/70">
            <JahresSaeulen jahre={m.r.jahre} max={max} ton={m.ton} />
          </div>
          <p className="mt-2 flex items-baseline justify-between text-[12.5px] text-ink-600">
            <span>{en ? "Year" : "Jahr"} 1–{PACHT.laufzeit}</span>
            <span className="ov-num font-bold text-ink-900">{en ? f.tsd(m.r.summeSolar) : `${fmt(Math.round(m.r.summeSolar / 1000))} Tsd. €`}</span>
          </p>
        </div>
      ))}
      <p className="text-[12.5px] leading-relaxed text-ink-500 sm:col-span-3">
        {en
          ? "Example: 10 ha in southern Germany with the calculator’s default values; each bar is one year. Nominal, before tax."
          : "Beispiel 10 ha in Süddeutschland mit den Standardwerten des Rechners; jede Säule ist ein Jahr. Nominal, vor Steuern."}
      </p>
    </Reveal>
  );
}

const DE = {
  breadcrumb: "Pachtrechner",
  eyebrow: "Pachtrechner Solarpark",
  title: <>Was bringt Ihre Fläche <span className="ov-text-gradient-light">in 30 Jahren?</span></>,
  lead: "Festpacht, indexiert oder Umsatzbeteiligung – Ihre Pacht über die gesamte Laufzeit, im direkten Vergleich zu Ackerpacht und eigenem Ackerbau.",
  chips: ["Kostenlos & ohne Anmeldung", "Drei Pachtmodelle", "Vergleich mit Ackerbau"],
  app: {
    name: "ÖkoInvest Pachtrechner Solarpark",
    description: "Berechnet die Pacht für Freiflächen-Photovoltaik je Hektar über die Laufzeit – Festpacht, indexiert oder Umsatzbeteiligung – im Vergleich zu Ackerpacht und Deckungsbeitrag.",
    featureList: ["Festpacht, Indexierung, Umsatzbeteiligung", "Mindestpacht", "Reservierungsprämie bis Baubeginn", "Vergleich Ackerpacht und Deckungsbeitrag", "Kumulierte Einnahmen über 20–40 Jahre"],
  },
  methodik: {
    eyebrow: "So rechnen wir",
    title: "Die Pacht ist planbar – der Vergleich zeigt, was sie wert ist.",
    lead: "Ein Solarpark bindet die Fläche für Jahrzehnte. Deshalb vergleichen wir nicht nur mit der Ackerpacht, sondern auch mit dem, was Sie selbst als Deckungsbeitrag erwirtschaften würden.",
  },
  annahmen: [
    ["Pacht Freifläche (Spanne)", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha·a`],
    ["Umsatzbeteiligung üblich", `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} %`],
    ["Indexierung", `${fmt(PACHT.indexierung * 100, 1)} % p. a.`],
    ["Flächenbedarf", `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`],
    ["Strompreis Jahr 1–20 / danach", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} / ${fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
    ["Degradation", `${fmt(FREIFLAECHE.degradation * 100, 1)} % p. a.`],
    ["Ackerpacht Ø Deutschland", `${fmt(PACHT.ackerProHa)} €/ha·a`],
    ["Reservierungsprämie", `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha·a`],
  ],
  quellen: [
    { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { name: "Destatis – Landwirtschaft", url: "https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Landwirtschaft-Forstwirtschaft-Fischerei/_inhalt.html" },
    { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  ],
  querverweise: [
    { href: seitenPfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Pachtvertrag, Rückbausicherheit, Steuern und der Weg bis zur ersten Zahlung." },
    { href: seitenPfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung, Leistung und Pachtspanne Ihrer konkreten Fläche." },
    { href: seitenPfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Wenn Sie weiter bewirtschaften möchten: Pacht, Eigeninvestition oder Beteiligung." },
  ],
  cta: {
    eyebrow: "Für Flächeneigentümer kostenfrei",
    title: "Aus der Rechnung ein echtes Pachtangebot machen?",
    text: "Wir prüfen Ihre Fläche am Kartentisch und legen Ihnen ein schriftliches Angebot mit Vertragsentwurf vor – ohne Kosten und ohne Verpflichtung.",
    primary: { label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") },
    secondary: { label: "Fläche verpachten", href: seitenPfad("/flaeche-verpachten") },
  },
};

const EN = {
  breadcrumb: "Lease calculator",
  eyebrow: "Solar park lease calculator",
  title: <>What will your land earn <span className="ov-text-gradient-light">over 30 years?</span></>,
  lead: "Fixed, indexed or revenue-based – your lease over the full term, compared directly with arable lease and farming the land yourself.",
  chips: ["Free & no sign-up", "Three lease models", "Comparison with arable farming"],
  app: {
    name: "ÖkoInvest solar park lease calculator",
    description: "Calculates the lease for ground-mounted photovoltaics per hectare over the term – fixed, indexed or revenue-based – compared with arable lease and gross margin.",
    featureList: ["Fixed lease, indexation, revenue share", "Minimum lease", "Reservation fee until construction", "Comparison with arable lease and gross margin", "Cumulative income over 20–40 years"],
  },
  methodik: {
    eyebrow: "How we calculate",
    title: "The lease is predictable – the comparison shows what it is worth.",
    lead: "A solar park commits the land for decades. That is why we compare it not only with the arable lease, but also with the gross margin you would earn by farming the land yourself.",
  },
  annahmen: [
    ["Ground-mounted lease (range)", `${e.eur(PACHT.freiflaecheProHa.min)}–${e.eur(PACHT.freiflaecheProHa.max, "/ha·yr")}`],
    ["Typical revenue share", `${e.fmt(PACHT.umsatzbeteiligung.min * 100)}–${e.pct(PACHT.umsatzbeteiligung.max * 100)}`],
    ["Indexation", `${e.pct(PACHT.indexierung * 100, 1)} p.a.`],
    ["Land required", `${e.fmt(FREIFLAECHE.haProMwp, 1)} ha per MWp`],
    ["Power price years 1–20 / thereafter", `${e.fmt(ERLOESE.eegFreiflaecheCt, 1)} / ${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
    ["Degradation", `${e.pct(FREIFLAECHE.degradation * 100, 1)} p.a.`],
    ["Average arable lease, Germany", e.eur(PACHT.ackerProHa, "/ha·yr")],
    ["Reservation fee", `${e.eur(PACHT.reservierungProHa.min)}–${e.eur(PACHT.reservierungProHa.max, "/ha·yr")}`],
  ],
  quellen: [
    { name: "Bundesnetzagentur (Federal Network Agency) – solar tenders" },
    { name: "Destatis (Federal Statistical Office) – agriculture" },
    { name: "PVGIS" },
  ],
  querverweise: [
    { titel: "Lease your land", text: "Lease contract, decommissioning security, taxes and the path to the first payment." },
    { titel: "Land check", text: "Suitability, capacity and lease range of your specific plot." },
    { titel: "Agrivoltaics calculator", text: "If you want to keep farming: lease, own investment or participation." },
  ],
  cta: {
    eyebrow: "Free of charge for landowners",
    title: "Turn the calculation into a real lease offer?",
    text: "We review your land on the map and send you a written offer with a draft contract – at no cost and with no obligation.",
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
      toolId="pacht"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<PachtRechner />}
      erklaerung={
        <>
          <SectionHeading eyebrow={t.methodik.eyebrow} title={t.methodik.title} lead={t.methodik.lead} />
          <ModellMinis en={en} />
          <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
            <div className="ov-prose mt-8 max-w-2xl">
              {en ? (
                <>
                  <p>
                    With a <strong>fixed lease</strong>, the amount stays the same over the term; with an <strong>indexed lease</strong>, it rises by {e.pct(PACHT.indexierung * 100, 1)} per year. We calculate the <strong>revenue share</strong> on the expected power yield in your region – for the first 20 years with the average EEG award value of {e.fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, thereafter cautiously with a market value of {e.fmt(ERLOESE.merchantCt, 1)} ct/kWh.
                  </p>
                  <p>
                    We project the arable lease and gross margin at the same rate so that the comparison remains fair. The <Link href={seitenPfad("/flaechencheck")}>land check</Link> shows what your specific plot can deliver; what goes into the lease contract is explained under <Link href={seitenPfad("/flaeche-verpachten")}>Lease your land</Link>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Bei der <strong>Festpacht</strong> bleibt der Betrag über die Laufzeit gleich, bei der <strong>indexierten Pacht</strong> steigt er mit {fmt(PACHT.indexierung * 100, 1)} % pro Jahr. Die <strong>Umsatzbeteiligung</strong> rechnen wir auf den erwarteten Stromertrag Ihrer Region – die ersten 20 Jahre mit dem durchschnittlichen EEG-Zuschlagswert von {fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, danach vorsichtig mit {fmt(ERLOESE.merchantCt, 1)} ct/kWh Marktwert.
                  </p>
                  <p>
                    Ackerpacht und Deckungsbeitrag schreiben wir mit derselben Rate fort, damit der Vergleich fair bleibt. Was Ihre konkrete Fläche hergibt, zeigt der <Link href={seitenPfad("/flaechencheck")}>Flächencheck</Link>; was im Pachtvertrag steht, lesen Sie unter <Link href={seitenPfad("/flaeche-verpachten")}>Fläche verpachten</Link>.
                  </p>
                </>
              )}
            </div>
          </NurDEBlock>
        </>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/pacht", metadata, { en: metadataEn });

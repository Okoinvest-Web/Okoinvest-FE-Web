// src/app/rechner/pacht/page.js – Pachtrechner Solarpark

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import PachtRechner from "@/components/Flaeche/PachtRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { JahresSaeulen } from "@/components/Flaeche/Verpachten/Pachtmodelle";
import { pachtRechnung } from "@/lib/rechner/pacht";
import { ERLOESE, FREIFLAECHE, PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const PFAD = seitenPfad("/rechner/pacht");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Pachtrechner Solarpark: Pacht über 30 Jahre | ÖkoInvest",
  description:
    "Solarpark-Pacht berechnen: Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre – im Vergleich zu Ackerpacht und Deckungsbeitrag. Kostenlos.",
  keywords: ["Pachtrechner Solarpark", "Solarpark Pacht berechnen", "Umsatzpacht Solarpark", "Pacht indexiert Photovoltaik", "Freiflächen PV Pacht"],
});

const FAQ = [
  {
    q: "Wie viel Pacht pro Hektar zahlt ein Solarpark?",
    a: `Im DACH-Raum liegen Solarpachten derzeit meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr. Hohe Werte gibt es für große Flächen mit nahem Netzanschluss in der EEG-Kulisse, niedrigere bei langen Kabeltrassen, kleinen Flächen oder schwierigem Baurecht.`,
  },
  {
    q: "Was ist besser: Festpacht oder Umsatzbeteiligung?",
    a: `Festpacht ist planbar und unabhängig vom Strompreis. Eine Umsatzbeteiligung von ${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} % lässt Sie an steigenden Strompreisen teilhaben, schwankt aber mit Ertrag und Preis. Viele Eigentümer wählen eine Kombination: Umsatzbeteiligung mit Mindestpacht – oder eine indexierte Festpacht.`,
  },
  {
    q: "Warum ist die Solarpacht so viel höher als die Ackerpacht?",
    a: `Weil auf einem Hektar rund ${fmt(1 / FREIFLAECHE.haProMwp, 1)} MWp Leistung stehen, die jährlich Strom für mehrere zehntausend Euro erzeugen. Die Pacht ist nur ein kleiner Teil davon. Dafür ist die Fläche 30 Jahre gebunden – die Rückgabe ist über Vertrag, Grundbuch und Rückbaubürgschaft gesichert.`,
  },
  {
    q: "Ist die Pacht vor Baubeginn schon fällig?",
    a: `Nein, die volle Pacht beginnt in der Regel mit dem Bau oder der Inbetriebnahme. Bis dahin zahlen wir meist eine Reservierungsprämie von ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar und Jahr, und Sie bewirtschaften weiter. Das können Sie im Rechner über „Vorlauf bis Baubeginn“ abbilden.`,
  },
  {
    q: "Wie wird die Pacht versteuert?",
    a: "Pachteinnahmen sind einkommensteuerpflichtig. Zudem kann die Verpachtung für einen Solarpark Grund- und Erbschaftsteuer beeinflussen. Der Rechner zeigt Werte vor Steuern – lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung prüfen.",
  },
];

/** Mini-Vergleich der drei Modelle (Beispiel 10 ha, Süd-DE, Standardwerte des Rechners) */
function ModellMinis() {
  const reihen = [
    { t: "Festpacht", x: "gleichbleibend", r: pachtRechnung({ modell: "fest" }), ton: "fill-ov-400" },
    { t: "Indexiert", x: `+${fmt(PACHT.indexierung * 100, 1)} % p. a.`, r: pachtRechnung({ modell: "index" }), ton: "fill-ov-600" },
    { t: "Umsatz", x: "6 % der Erlöse", r: pachtRechnung({ modell: "umsatz", umsatzAnteil: 0.06 }), ton: "fill-navy-500" },
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
            <span>Jahr 1–{PACHT.laufzeit}</span>
            <span className="ov-num font-bold text-ink-900">{fmt(Math.round(m.r.summeSolar / 1000))} Tsd. €</span>
          </p>
        </div>
      ))}
      <p className="text-[12.5px] leading-relaxed text-ink-500 sm:col-span-3">Beispiel 10 ha in Süddeutschland mit den Standardwerten des Rechners; jede Säule ist ein Jahr. Nominal, vor Steuern.</p>
    </Reveal>
  );
}

export default async function Page({ params }) {
  await landDerSeite(params, "/rechner/pacht");
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="pacht"
      breadcrumb="Pachtrechner"
      eyebrow="Pachtrechner Solarpark"
      title={<>Was bringt Ihre Fläche <span className="ov-text-gradient-light">in 30 Jahren?</span></>}
      lead="Festpacht, indexiert oder Umsatzbeteiligung – Ihre Pacht über die gesamte Laufzeit, im direkten Vergleich zu Ackerpacht und eigenem Ackerbau."
      chips={["Kostenlos & ohne Anmeldung", "Drei Pachtmodelle", "Vergleich mit Ackerbau"]}
      app={{
        name: "ÖkoInvest Pachtrechner Solarpark",
        description: "Berechnet die Pacht für Freiflächen-Photovoltaik je Hektar über die Laufzeit – Festpacht, indexiert oder Umsatzbeteiligung – im Vergleich zu Ackerpacht und Deckungsbeitrag.",
        featureList: ["Festpacht, Indexierung, Umsatzbeteiligung", "Mindestpacht", "Reservierungsprämie bis Baubeginn", "Vergleich Ackerpacht und Deckungsbeitrag", "Kumulierte Einnahmen über 20–40 Jahre"],
      }}
      rechner={<PachtRechner />}
      erklaerung={
        <>
          <SectionHeading
            eyebrow="So rechnen wir"
            title="Die Pacht ist planbar – der Vergleich zeigt, was sie wert ist."
            lead="Ein Solarpark bindet die Fläche für Jahrzehnte. Deshalb vergleichen wir nicht nur mit der Ackerpacht, sondern auch mit dem, was Sie selbst als Deckungsbeitrag erwirtschaften würden."
          />
          <ModellMinis />
          <div className="ov-prose mt-8 max-w-2xl">
            <p>
              Bei der <strong>Festpacht</strong> bleibt der Betrag über die Laufzeit gleich, bei der <strong>indexierten Pacht</strong> steigt er mit {fmt(PACHT.indexierung * 100, 1)} % pro Jahr. Die <strong>Umsatzbeteiligung</strong> rechnen wir auf den erwarteten Stromertrag Ihrer Region – die ersten 20 Jahre mit dem durchschnittlichen EEG-Zuschlagswert von {fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh, danach vorsichtig mit {fmt(ERLOESE.merchantCt, 1)} ct/kWh Marktwert.
            </p>
            <p>
              Ackerpacht und Deckungsbeitrag schreiben wir mit derselben Rate fort, damit der Vergleich fair bleibt. Was Ihre konkrete Fläche hergibt, zeigt der <Link href={seitenPfad("/flaechencheck")}>Flächencheck</Link>; was im Pachtvertrag steht, lesen Sie unter <Link href={seitenPfad("/flaeche-verpachten")}>Fläche verpachten</Link>.
            </p>
          </div>
        </>
      }
      annahmen={[
        ["Pacht Freifläche (Spanne)", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha·a`],
        ["Umsatzbeteiligung üblich", `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} %`],
        ["Indexierung", `${fmt(PACHT.indexierung * 100, 1)} % p. a.`],
        ["Flächenbedarf", `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`],
        ["Strompreis Jahr 1–20 / danach", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} / ${fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
        ["Degradation", `${fmt(FREIFLAECHE.degradation * 100, 1)} % p. a.`],
        ["Ackerpacht Ø Deutschland", `${fmt(PACHT.ackerProHa)} €/ha·a`],
        ["Reservierungsprämie", `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha·a`],
      ]}
      quellen={[
        { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
        { name: "Destatis – Landwirtschaft", url: "https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Landwirtschaft-Forstwirtschaft-Fischerei/_inhalt.html" },
        { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
      ]}
      faq={FAQ}
      querverweise={[
        { href: seitenPfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Pachtvertrag, Rückbausicherheit, Steuern und der Weg bis zur ersten Zahlung." },
        { href: seitenPfad("/flaechencheck"), titel: "Flächencheck", text: "Eignung, Leistung und Pachtspanne Ihrer konkreten Fläche." },
        { href: seitenPfad("/rechner/agri-pv"), titel: "Agri-PV-Rechner", text: "Wenn Sie weiter bewirtschaften möchten: Pacht, Eigeninvestition oder Beteiligung." },
      ]}
      cta={{
        eyebrow: "Für Flächeneigentümer kostenfrei",
        title: "Aus der Rechnung ein echtes Pachtangebot machen?",
        text: "Wir prüfen Ihre Fläche am Kartentisch und legen Ihnen ein schriftliches Angebot mit Vertragsentwurf vor – ohne Kosten und ohne Verpflichtung.",
        primary: { label: "Fläche prüfen lassen", href: seitenPfad("/flaechencheck") },
        secondary: { label: "Fläche verpachten", href: seitenPfad("/flaeche-verpachten") },
      }}
    />
  );
}

export const generateMetadata = landMetadata("/rechner/pacht", metadata);

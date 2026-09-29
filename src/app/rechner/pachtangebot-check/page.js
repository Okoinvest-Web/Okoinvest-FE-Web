// src/app/rechner/pachtangebot-check/page.js – Pachtangebot eines Projektierers prüfen

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import PachtangebotCheck from "@/components/Rechner/PachtangebotCheck";
import SectionHeading from "@/components/ui/SectionHeading";
import { FREIFLAECHE, PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/pachtangebot-check";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Pachtangebot Solarpark prüfen: Klausel-Check | ÖkoInvest",
  description:
    "Pachtangebot für Solarpark oder Agri-PV prüfen: Barwert, Marktvergleich und Ampel für jede Klausel – Rückbau, Laufzeit, Grundbuch. Mit Fragenliste zum Drucken.",
  keywords: ["Pachtangebot Solarpark prüfen", "Pachtvertrag Photovoltaik Checkliste", "Solarpark Pachtvertrag Klauseln", "Rückbaubürgschaft Solarpark", "Dienstbarkeit Solarpark", "Reservierungsprämie Solarpark"],
});

const FAQ = [
  {
    q: "Woran erkenne ich ein gutes Pachtangebot für einen Solarpark?",
    a: `Nicht allein an der Zahl pro Hektar. Entscheidend ist das Zusammenspiel: eine Pacht in der üblichen Spanne (Freifläche derzeit meist ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha), eine Wertsicherung über 30 Jahre, eine Reservierungsprämie bis Baubeginn, ein spätestes Datum für den Baubeginn, eine Bankbürgschaft für den Rückbau und klare Regeln, was passiert, wenn nicht gebaut wird. Ein hoher Hektarpreis nützt wenig, wenn die Fläche zehn Jahre ohne Zahlung blockiert ist.`,
  },
  {
    q: "Was ist der Unterschied zwischen Summe und Barwert?",
    a: "Die Summe addiert alle Zahlungen über die Laufzeit. Der Barwert rechnet jede Zahlung auf heute zurück – eine Pacht in 25 Jahren ist heute weniger wert als eine Zahlung im nächsten Jahr. Mit dem Barwert lassen sich Angebote mit unterschiedlicher Laufzeit, Indexierung und Vorlaufzeit fair vergleichen. Den Kalkulationszins können Sie im Rechner selbst wählen.",
  },
  {
    q: "Welche Rückbausicherheit sollte ich verlangen?",
    a: `Üblich und am belastbarsten ist eine unbefristete, selbstschuldnerische Bürgschaft einer Bank oder eines Versicherers, die spätestens mit Baubeginn vorliegt und die Rückbaukosten deckt – als Größenordnung rechnen wir mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp. Eine Konzernbürgschaft oder eine im Betrieb angesparte Rücklage ist schwächer, weil sie im Insolvenzfall fehlen kann.`,
  },
  {
    q: "Warum soll die Dienstbarkeit ins Grundbuch – und in welchem Rang?",
    a: "Die finanzierende Bank des Solarparks verlangt eine beschränkte persönliche Dienstbarkeit, meist im ersten Rang. Nur so bleibt der Park auch bei einem Eigentümerwechsel oder einer Zwangsversteigerung gesichert. Für Sie wichtig: Die Eintragung sollte erst erfolgen, wenn der Bau tatsächlich kommt, oder mit einer Pflicht zur Löschung auf Kosten des Pächters verbunden sein. Bestehende Grundschulden müssen oft im Rang zurücktreten – sprechen Sie früh mit Ihrer Bank.",
  },
  {
    q: "Wie lange darf ein Projektierer meine Fläche reservieren?",
    a: `Planung, B-Plan-Verfahren und Netzanschluss dauern häufig ${PACHT.reservierungJahre.ueblich}–${PACHT.reservierungJahre.max} Jahre. Sinnvoll ist eine feste Frist bis zum spätesten Baubeginn, nach der der Vertrag automatisch endet, und eine Reservierungsprämie für jedes Jahr der Bindung. Verlängerungen sollten nur gegen eine höhere Prämie möglich sein.`,
  },
  {
    q: "Was bedeutet die Verpachtung für Erbschaft- und Grundsteuer?",
    a: "Das ist ein oft unterschätzter Punkt. Für land- und forstwirtschaftliche Flächen gelten bei Erbschaft- und Schenkungsteuer günstige Regeln. Eine Fläche, die für einen Solarpark verpachtet wird, kann nach aktuellem Stand aus dem land- und forstwirtschaftlichen Vermögen herausfallen – eine allgemeine Sonderregel für klassische Freiflächen-PV gibt es nicht. Beziehen Sie Ihre Steuerberatung vor der Unterschrift ein.",
  },
  {
    q: "Werden meine Angaben gespeichert?",
    a: "Nein. Der Check läuft vollständig in Ihrem Browser. Wenn Sie möchten, dass wir Ihr Angebot gemeinsam ansehen oder Ihnen ein eigenes machen, nutzen Sie den Flächencheck – erst dann übermitteln Sie Daten an uns.",
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="pachtangebot-check"
      breadcrumb="Pachtangebot prüfen"
      eyebrow="Für Flächeneigentümer · Klausel-Check"
      title={
        <>
          Pachtangebot erhalten? <span className="ov-text-gradient-light">Erst prüfen, dann unterschreiben.</span>
        </>
      }
      lead="Geben Sie die Eckdaten des Angebots ein: Sie erhalten Summe und Barwert, den Vergleich mit dem Markt, eine Ampel für jede wichtige Klausel und die Fragen, die Sie dem Projektierer stellen sollten."
      chips={["Bis zu 13 Klauseln im Check", "Barwert & Marktvergleich", "Fragenliste zum Drucken", "Daten bleiben im Browser"]}
      app={{
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
      }}
      rechner={<PachtangebotCheck />}
      erklaerung={
        <>
          <SectionHeading
            eyebrow="So prüfen wir"
            title="Ein Pachtvertrag bindet eine Generation. Jede Klausel zählt."
            lead="Der Check vergleicht Ihr Angebot mit dem, was im DACH-Raum derzeit üblich ist – nicht mit dem bestmöglichen Einzelfall. Er ersetzt keine anwaltliche Prüfung, zeigt aber, wo Sie nachfragen sollten."
          />
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
              <li>Ihre Fläche bewerten: Ob eine höhere Pacht möglich ist, hängt von Netzanschluss, Kulisse und Baurecht ab. Das zeigt der <Link href="/flaechencheck">Flächencheck</Link>.</li>
              <li>Steuern einschätzen: Einkommen-, Erbschaft- und Grundsteuer gehören in die Hände Ihrer Steuerberatung.</li>
            </ul>
            <p>
              Wie ein Pachtvertrag mit uns aussieht, lesen Sie unter <Link href="/flaeche-verpachten">Fläche verpachten</Link>; die reine Pachthöhe über 30 Jahre im Vergleich zum Ackerbau
              zeigt der <Link href="/rechner/pacht">Pachtrechner</Link>.
            </p>
          </div>
        </>
      }
      annahmen={[
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
      ]}
      quellen={[
        { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
        { name: "EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/" },
        { name: "Bewertungsgesetz § 158", url: "https://www.gesetze-im-internet.de/bewg/__158.html" },
        { name: "Marktspannen: eigene Einschätzung ÖkoInvest" },
      ]}
      faq={FAQ}
      faqTitel="Pachtangebot prüfen – gut zu wissen"
      querverweise={[
        { href: "/flaeche-verpachten", titel: "Fläche verpachten", text: "Pachtvertrag, Rückbausicherheit, Steuern und der Weg bis zur ersten Zahlung." },
        { href: "/rechner/pacht", titel: "Pachtrechner", text: "Festpacht, indexiert oder Umsatz – über 30 Jahre im Vergleich zu Ackerbau." },
        { href: "/flaechencheck", titel: "Flächencheck", text: "Eignung, Leistung und realistische Pachtspanne Ihrer konkreten Fläche." },
      ]}
      cta={{
        eyebrow: "Für Flächeneigentümer kostenfrei",
        title: "Vergleichen Sie mit einem zweiten Angebot.",
        text: "Wir prüfen Ihre Fläche und legen Ihnen ein schriftliches Angebot mit Vertragsentwurf vor – mit Bankbürgschaft für den Rückbau und klarer Frist bis Baubeginn. Ohne Kosten, ohne Verpflichtung.",
        primary: { label: "Fläche prüfen lassen", href: "/flaechencheck" },
        secondary: { label: "Fläche verpachten", href: "/flaeche-verpachten" },
      }}
    />
  );
}

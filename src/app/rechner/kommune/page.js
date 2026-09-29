import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import KommuneRechner from "@/components/Rechner/KommuneRechner";
import { KOMMUNE, PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/kommune";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Kommunal-Rechner: Einnahmen aus dem Solarpark | ÖkoInvest",
  description:
    "Was bringt ein Solarpark der Gemeinde? § 6 EEG-Beteiligung, Gewerbesteuer (90 % Standort) und Pacht auf Gemeindeflächen – pro Jahr, über 20 und 30 Jahre.",
  keywords: ["Solarpark Gemeinde Einnahmen", "§ 6 EEG Kommune", "Gewerbesteuer Solarpark", "Kommunalbeteiligung Photovoltaik", "Solarpark Kommune Rechner"],
});

const FAQ = [
  {
    q: "Was ist die Zahlung nach § 6 EEG?",
    a: `Betreiber von Freiflächenanlagen dürfen den betroffenen Gemeinden bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je eingespeister Kilowattstunde zahlen – ohne Gegenleistung. Grundlage ist ein Vertrag zwischen Gemeinde und Betreiber, der schon vor der Genehmigung geschlossen werden darf. Bei EEG-geförderten Anlagen kann sich der Betreiber die Zahlung vom Netzbetreiber erstatten lassen. Einige Bundesländer machen die Beteiligung inzwischen verpflichtend oder verlangen zusätzliche Angebote an Bürger.`,
  },
  {
    q: "Wie viel Gewerbesteuer bleibt in der Gemeinde?",
    a: `Bei Solaranlagen wird der Gewerbesteuermessbetrag nach § 29 GewStG zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % nach der installierten Leistung auf die Standortgemeinde(n) zerlegt, nur 10 % nach den Arbeitslöhnen. Hat die Betreibergesellschaft ihren Sitz in der Gemeinde, fließt die Gewerbesteuer vollständig dorthin. Liegt der Park auf mehreren Gemarkungen, wird nach Leistungsanteilen aufgeteilt.`,
  },
  {
    q: "Warum zahlt ein Solarpark anfangs kaum Gewerbesteuer?",
    a: `Weil die Anlage über ${KOMMUNE.afaJahre} Jahre abgeschrieben wird und Zinsen für die Finanzierung anfallen – in den ersten Jahren ist der steuerliche Gewinn daher gering oder negativ, Verluste werden vorgetragen. Nach Ende der Abschreibung steigt die Gewerbesteuer deutlich. Wie früh sie einsetzt, hängt vor allem vom Stromerlös ab – im Rechner einstellbar.`,
  },
  {
    q: "Gilt das auch in Österreich und der Schweiz?",
    a: "Nein, der Rechner bildet die deutsche Rechtslage ab. In Österreich gibt es keine Gewerbesteuer; Gemeinden erhalten die Kommunalsteuer auf Löhne, die bei Solarparks gering ist – dort stehen Pacht, Beteiligungsmodelle und Energiegemeinschaften im Vordergrund. In der Schweiz hängt die Besteuerung von Kanton und Gemeinde ab.",
  },
  {
    q: "Welche weiteren Vorteile hat die Gemeinde?",
    a: "Einkommen- und Pachteinnahmen der Grundeigentümer vor Ort, Aufträge für regionale Betriebe bei Bau und Pflege, Bürgerbeteiligung über eine Genossenschaft und – seit Energy Sharing nach § 42c EnWG – die Möglichkeit, Strom aus dem Park in der Region gemeinsam zu nutzen. Diese Effekte sind im Rechner nicht enthalten.",
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="kommune"
      breadcrumb="Kommunal-Rechner"
      eyebrow="Für Kommunen & Stadtwerke"
      title={
        <>
          Was ein Solarpark <span className="ov-text-gradient-light">Ihrer Gemeinde bringt.</span>
        </>
      }
      lead="§ 6 EEG-Beteiligung, Gewerbesteuer mit 90 % am Standort und Pacht auf Gemeindeflächen – pro Jahr, über 20 Jahre und über die gesamte Laufzeit. Mit Ihrem Hebesatz."
      chips={["§ 6 EEG: 0,2 ct/kWh", "§ 29 GewStG: 90 % Standort", "Hebesatz einstellbar", "Jahr für Jahr"]}
      app={{
        name: "Kommunal-Rechner Solarpark",
        description: "Berechnet die Einnahmen einer Gemeinde aus einem Solarpark: § 6 EEG-Beteiligung, Gewerbesteuer und Pacht.",
        featureList: ["§ 6 EEG-Beteiligung", "Gewerbesteuer mit Zerlegung nach § 29 GewStG", "Pacht auf Gemeindeflächen", "Einnahmen über 20 und 30 Jahre", "Jahresverlauf je Quelle"],
      }}
      rechner={<KommuneRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Kommunal-Rechner</h2>
          <p>
            <strong>§ 6 EEG:</strong> {fmt(KOMMUNE.beteiligungCt, 1)} ct je erzeugter Kilowattstunde, ab dem ersten Betriebsjahr, sofern ein Vertrag geschlossen wird.
          </p>
          <p>
            <strong>Gewerbesteuer:</strong> Aus dem Betriebsergebnis des Parks (Erlöse minus Betrieb, Pacht, Abschreibung über {KOMMUNE.afaJahre} Jahre und Zinsen) ergibt sich der
            Gewerbeertrag. Zinsen über {fmt(KOMMUNE.hinzurechnungFreibetrag)} € werden zu {fmt(KOMMUNE.hinzurechnungZinsen * 100)} % hinzugerechnet, Verluste vorgetragen. Messzahl{" "}
            {fmt(KOMMUNE.messzahl * 100, 1)} % × Hebesatz × {fmt(KOMMUNE.gewerbesteuerStandort * 100)} % Standortanteil ergibt den Betrag für Ihre Gemeinde.
          </p>
          <p>
            <strong>Pacht:</strong> Nur wenn der Park auf gemeindeeigenen Flächen steht, mit {fmt(PACHT.indexierung * 100, 1)} % jährlicher Indexierung.
          </p>
          <h3>Vereinfachungen</h3>
          <ul>
            <li>Keine Mindestbesteuerung beim Verlustvortrag, keine Sonderabschreibungen.</li>
            <li>Finanzierung und Kosten nach den Standardwerten des Solarpark-Rechners.</li>
            <li>Einkommensteueranteile aus Pachten Privater und regionale Aufträge sind nicht enthalten.</li>
          </ul>
        </div>
      }
      annahmen={[
        ["§ 6 EEG", `${fmt(KOMMUNE.beteiligungCt, 1)} ct/kWh`],
        ["Zerlegung Solar (§ 29 GewStG)", `${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % Standort`],
        ["Steuermesszahl", `${fmt(KOMMUNE.messzahl * 100, 1)} %`],
        ["Hebesatz Ø Deutschland", `${fmt(KOMMUNE.hebesatz * 100)} %`],
        ["Abschreibung", `${KOMMUNE.afaJahre} Jahre linear`],
        ["Pacht Freifläche", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha`],
        ["Stand", STAND],
      ]}
      quellen={[
        { name: "EEG 2023 § 6", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html" },
        { name: "GewStG § 29", url: "https://www.gesetze-im-internet.de/gewstg/__29.html" },
        { name: "GewStG § 8", url: "https://www.gesetze-im-internet.de/gewstg/__8.html" },
      ]}
      faq={FAQ}
      faqTitel="Solarpark und Gemeindefinanzen"
      querverweise={[
        { href: "/kommunen", titel: "Für Kommunen & Stadtwerke", text: "Wertschöpfung, Bauleitplanung, Kriterienkataloge und Bürgerbeteiligung." },
        { href: "/genossenschaft", titel: "Genossenschaft", text: "Bürger und Landwirte beteiligen sich am Solarpark vor Ort." },
        { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Energy Sharing, EEG in Österreich und LEG in der Schweiz." },
        { href: "/rechner/pacht", titel: "Pachtrechner", text: "Solarpacht über 30 Jahre im Vergleich zu Ackerpacht und Deckungsbeitrag." },
      ]}
      cta={{
        eyebrow: "Für Kommunen",
        title: "Ein Solarpark, von dem die ganze Gemeinde etwas hat.",
        text: "Wir stellen Projekt, § 6-Vertrag und Beteiligungsmodell im Gemeinderat vor – offen, mit Zahlen und ohne Verpflichtung.",
        primary: { label: "Gespräch anfragen", href: "/kommunen#anfrage" },
        secondary: { label: "Für Kommunen", href: "/kommunen" },
      }}
    />
  );
}

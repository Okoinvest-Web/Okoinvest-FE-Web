// src/app/rechner/beteiligung/page.js – Genossenschafts-/Bürgerbeteiligung (Illustration)

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import BeteiligungRechner from "@/components/Rechner/BeteiligungRechner";
import { FINANZIERUNG, FREIFLAECHE, GEMEINSCHAFTEN, ERLOESE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/beteiligung";
const B = GEMEINSCHAFTEN.beteiligung;

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Bürgerbeteiligung Solarpark: Rechner | ÖkoInvest",
  description:
    "Wie entsteht die Ausschüttung einer Energiegenossenschaft? Illustration aus dem Park-Cashflow in drei Szenarien – Risiken offen, keine Anlageberatung.",
  keywords: ["Bürgerbeteiligung Solarpark", "Energiegenossenschaft Rendite", "Genossenschaftsanteil Photovoltaik", "Solarpark beteiligen", "Bürgerenergie Rechner"],
});

const FAQ = [
  {
    q: "Kann ich mich schon beteiligen?",
    a: "Nein. Die Genossenschaft ist im Aufbau, Satzung, Projektauswahl und Beteiligungsbedingungen stehen noch nicht fest. Sie können Ihr Interesse unverbindlich vormerken – registrierte Interessenten erhalten die Unterlagen zuerst. Vorher entsteht keinerlei Zahlungspflicht.",
  },
  {
    q: "Warum zeigt der Rechner so niedrige Werte in den ersten Jahren?",
    a: `Weil Solarparks überwiegend mit Bankdarlehen finanziert werden (im Modell ${fmt(FINANZIERUNG.fremdkapitalQuote * 100)} % Wunschquote über ${FINANZIERUNG.tilgungJahre} Jahre, begrenzt auf einen Schuldendienstdeckungsgrad von ${fmt(FINANZIERUNG.dscrZiel, 2)}). Solange getilgt wird, bleibt für das Eigenkapital wenig übrig. Außerdem muss die Genossenschaft Geld zurücklegen, um die Einlagen am Ende zurückzahlen zu können – das Eigenkapital im Park verzehrt sich über die Laufzeit. Erst danach ist ein Überschuss ausschüttungsfähig.`,
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
  },
  {
    q: "Ist das eine Anlageberatung?",
    a: "Nein. Der Rechner erklärt das Prinzip mit vorsichtigen Annahmen. Er ist weder eine Anlageberatung noch ein Angebot zum Erwerb von Anteilen und keine Zusage einer Ausschüttung. Maßgeblich sind allein die Unterlagen der Genossenschaft nach ihrer Gründung.",
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="beteiligung"
      breadcrumb="Beteiligungsrechner"
      eyebrow="Für Bürger, Landwirte und Gemeinden"
      title={
        <>
          Wie entsteht die Ausschüttung <span className="ov-text-gradient-light">einer Energiegenossenschaft?</span>
        </>
      }
      lead="Eine Illustration, keine Zusage: Wir rechnen den Cashflow eines Solarparks in drei Szenarien und zeigen, was nach Bankdarlehen, Kosten, Rücklage und Kapitalerhalt für die Mitglieder übrig bleiben könnte."
      chips={["Drei Szenarien", "Aus dem Park-Cashflow", "Risiken offen benannt", "Keine Anlageberatung"]}
      app={{
        name: "Beteiligungsrechner Energiegenossenschaft",
        description: "Illustriert mögliche Ausschüttungen einer Beteiligung an einer Energiegenossenschaft aus dem Cashflow eines Solarparks in drei Szenarien. Keine Anlageberatung, kein Angebot.",
        featureList: ["Anteile und Einlage", "Park-Cashflow nach Zins und Tilgung", "Kosten, Rücklage und Kapitalerhalt der Genossenschaft", "Szenarien schlecht, mittel, gut", "Kapitalertragsteuer optional"],
      }}
      rechner={<BeteiligungRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Beteiligungsrechner</h2>
          <p>
            Grundlage ist unser <Link href="/rechner/solarpark">Solarpark-Renditerechner</Link> mit seinen vorsichtigen Standardwerten – EEG-Zuschlag {fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh für
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
            Bandbreite – nicht die Grenzen. Wie die Genossenschaft aufgebaut werden soll, lesen Sie unter <Link href="/genossenschaft">Genossenschaft</Link>.
          </p>
        </div>
      }
      annahmen={[
        ["Anteil (Beispiel)", `${fmt(B.anteilEur)} €`],
        ["Kosten der eG", `${fmt(B.verwaltungAnteil * 100, 1)} % des Kapitals p. a.`],
        ["Rücklage", `${fmt(B.ruecklageAnteil * 100)} % des Überschusses`],
        ["Kapitalerhalt", "Einlage ÷ Laufzeit je Jahr"],
        ["Park: EEG / Laufzeit", `${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct · ${FREIFLAECHE.laufzeit} Jahre`],
        ["Park: Fremdkapital", `${fmt(FINANZIERUNG.fremdkapitalQuote * 100)} % · DSCR ${fmt(FINANZIERUNG.dscrZiel, 2)}`],
        ["Kapitalertragsteuer DE", `${fmt(B.kapitalertragsteuer * 100, 3)} %`],
        ["Status Genossenschaft", "im Aufbau"],
      ]}
      quellen={[
        { name: "Genossenschaftsgesetz (GenG)", url: "https://www.gesetze-im-internet.de/geng/" },
        { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
        { name: "Parkmodell: Solarpark-Rechner ÖkoInvest" },
      ]}
      faq={FAQ}
      faqTitel="Beteiligung – gut zu wissen"
      querverweise={[
        { href: "/genossenschaft", titel: "Genossenschaft", text: "Aufbau, Mitbestimmung, Risiken und wie Sie Ihr Interesse vormerken." },
        { href: "/rechner/agri-pv", titel: "Agri-PV-Rechner", text: "Für Landwirte: Pacht, Eigeninvestition oder Beteiligung im Vergleich." },
        { href: "/ratgeber/buergerenergie-solarpark-akzeptanz", titel: "Ratgeber Bürgerenergie", text: "Wie Beteiligung Akzeptanz schafft – und was Gemeinden davon haben." },
      ]}
      cta={{
        eyebrow: "Genossenschaft im Aufbau",
        title: "Als Erste informiert werden.",
        text: "Merken Sie Ihr Interesse unverbindlich vor. Sobald Satzung und Unterlagen vorliegen, erhalten Sie diese zuerst – ohne jede Verpflichtung.",
        primary: { label: "Interesse vormerken", href: "/genossenschaft#interesse" },
        secondary: { label: "Zur Genossenschaft", href: "/genossenschaft" },
      }}
    />
  );
}

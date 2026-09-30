// src/app/bedingungen/banken/page.js
//
// Vertraulichkeitsbedingungen für Banken (Bank-Portal, Bankenpaket) –
// ENTWURF zur anwaltlichen Prüfung, noindex bis zur Freigabe (siehe
// ../_teile.js). Fachgrundlage: docs/FINANZIERUNG.md, docs/PLATTFORM.md
// (Bank-Portal: Einladung mit persönlichem Link, nur freigegebene Bausteine,
// Abrufe protokolliert). Offene Punkte: Dauer der Vertraulichkeit,
// Weitergabe an Refinanzierer/Förderbanken, Verhältnis zu bankeigenen NDAs.

import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT } from "@/data/site";
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata } from "../_teile";

const PFAD = "/bedingungen/banken";

export const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Vertraulichkeitsbedingungen Banken | ÖkoInvest",
  beschreibung:
    "Entwurf der Vertraulichkeitsbedingungen für Banken im Bank-Portal: Nutzung des Bankenpakets, zulässige Weitergabe, Zugang, Protokoll, Datenschutz und Dauer.",
  bild: "/img/team-praesentation.jpg",
  bildAlt: "Team bei einer Präsentation",
});

const G = GESELLSCHAFT;

export default function VertraulichkeitBankenPage() {
  return (
    <LegalShell
      titel="Vertraulichkeitsbedingungen für Banken"
      pfad={PFAD}
      lead="Regeln für Banken und Finanzierungspartner, die im Bank-Portal Finanzierungsanfragen der ÖkoInvest-Gruppe prüfen und das Bankenpaket abrufen."
    >
      <EntwurfHinweis />

      <h2>§ 1 Geltung und Zugang</h2>
      <p>
        (1) Die {G.name} bzw. die jeweilige Projektgesellschaft („Anfragende“) lädt Banken über einen persönlichen, befristeten Link zu einer
        Finanzierungsanfrage ein. Mit dem ersten Abruf von Unterlagen erkennt die Bank diese Bedingungen an. Bestehende oder später
        abgeschlossene individuelle Vertraulichkeitsvereinbarungen gehen vor.
      </p>
      <p>
        (2) Der Zugang ist persönlich und an die eingeladene E-Mail-Adresse gebunden. Zugangsdaten und Links dürfen nicht weitergegeben werden;
        weitere Personen der Bank werden auf Anforderung eingeladen. Die Bank teilt mit, wenn eine berechtigte Person ausscheidet.
      </p>

      <h2>§ 2 Vertrauliche Informationen</h2>
      <p>
        Vertraulich sind alle Informationen, die der Bank im Zusammenhang mit der Anfrage zugänglich werden – insbesondere das{" "}
        <strong>Bankenpaket</strong> (Projektsteckbrief, Finanzmodell, Ertragsgutachten, Verträge, Genehmigungen, Grundbuch- und
        Dienstbarkeitsunterlagen), Rückfragen und Antworten sowie die Tatsache der Anfrage selbst. Ausgenommen sind Informationen, die öffentlich
        bekannt sind oder werden, ohne dass die Bank dies zu vertreten hat, die der Bank nachweislich bereits bekannt waren oder die sie
        rechtmäßig von Dritten ohne Vertraulichkeitspflicht erhalten hat.
      </p>

      <h2>§ 3 Zweckbindung und zulässige Weitergabe</h2>
      <p>
        (1) Die Bank nutzt die Informationen ausschließlich zur Prüfung, Strukturierung, Entscheidung und Durchführung der angefragten
        Finanzierung.
      </p>
      <p>(2) Eine Weitergabe ist nur zulässig an</p>
      <ul>
        <li>Organe, Mitarbeitende und Kreditgremien der Bank und ihrer Konzerngesellschaften, soweit sie die Informationen benötigen,</li>
        <li>zur Verschwiegenheit verpflichtete Berater, Gutachter und Prüfer der Bank,</li>
        <li>
          potenzielle Konsortialbanken, Förder- und Refinanzierungsinstitute sowie Kreditversicherer – nur nach vorheriger Zustimmung der
          Anfragenden und bei gleichwertiger Vertraulichkeitspflicht,
        </li>
        <li>Aufsichtsbehörden, Gerichte und Behörden, soweit die Bank rechtlich dazu verpflichtet ist.</li>
      </ul>
      <p>
        Die Bank stellt sicher, dass Empfänger dieselben Pflichten einhalten. Bankgeheimnis und bankrechtliche Pflichten bleiben unberührt.
      </p>

      <h2>§ 4 Kennzeichnung und Protokoll</h2>
      <p>
        Jeder Abruf von Unterlagen wird mit Person und Zeitpunkt protokolliert. Unterlagen können den Namen des Empfängers tragen. Die Bank
        entfernt solche Kennzeichnungen nicht und lädt Unterlagen nicht automatisiert oder massenhaft herunter.
      </p>

      <h2>§ 5 Personenbezogene Daten</h2>
      <p>
        (1) Das Bankenpaket kann personenbezogene Daten Dritter enthalten, etwa von Flächen- und Dacheigentümern (Pacht- und
        Dienstbarkeitsverträge, Grundbuchauszüge) oder Stromabnehmern. Die Anfragenden geben nur weiter, was für Kreditentscheidung und
        Besicherung erforderlich ist.
      </p>
      <p>
        (2) Die Bank verarbeitet diese Daten als eigener Verantwortlicher nur für den Zweck nach § 3, schützt sie durch angemessene technische
        und organisatorische Maßnahmen und löscht sie, sobald sie nicht mehr benötigt werden und keine Aufbewahrungspflicht besteht. Anfragen
        betroffener Personen, die die Anfragenden betreffen, leitet sie weiter.
      </p>

      <h2>§ 6 Unverbindlichkeit</h2>
      <p>
        (1) Die Anfrage ist keine Zusage, mit der Bank abzuschließen. Die Anfragenden sind frei, mehrere Banken anzufragen und Angebote abzulehnen.
        Term Sheets gelten als indikativ, sofern sie nicht ausdrücklich als verbindlich bezeichnet sind.
      </p>
      <p>
        (2) Kosten der Prüfung trägt jede Seite selbst, soweit nicht schriftlich anders vereinbart (z. B. Bearbeitungsentgelt im Term Sheet).
      </p>

      <h2>§ 7 Keine Gewähr</h2>
      <p>
        Die Informationen werden nach bestem Wissen bereitgestellt. Finanzmodelle und Prognosen beruhen auf Annahmen mit Stand; eine Gewähr für
        Vollständigkeit, Richtigkeit oder den Eintritt von Prognosen übernehmen die Anfragenden nur im Rahmen des späteren Kreditvertrags. Die
        Bank nimmt ihre eigene Prüfung vor.
      </p>

      <h2>§ 8 Rückgabe, Löschung und Dauer</h2>
      <p>
        (1) Kommt keine Finanzierung zustande, löscht die Bank auf Anforderung die erhaltenen Unterlagen bzw. gibt sie zurück; ausgenommen sind
        Kopien, die sie aufgrund gesetzlicher oder aufsichtsrechtlicher Pflichten aufbewahren muss, und automatische Sicherungskopien – für diese
        gilt die Vertraulichkeit fort.
      </p>
      <p>
        (2) Die Pflichten gelten für die Dauer der Anfrage und darüber hinaus für{" "}
        <Platzhalter>z. B. 3 Jahre nach Ende der Anfrage bzw. für die Laufzeit eines Kreditverhältnisses</Platzhalter>.
      </p>
      <p>
        (3) Die Anfragenden können den Zugang jederzeit beenden, insbesondere nach Abschluss der Anfrage oder bei Verstößen gegen diese
        Bedingungen.
      </p>

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

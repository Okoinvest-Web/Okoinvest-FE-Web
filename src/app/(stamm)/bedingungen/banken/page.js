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
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata, bedingungenMetadataEn, STAND_BEDINGUNGEN } from "../_teile";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const PFAD = "/bedingungen/banken";

const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Vertraulichkeitsbedingungen Banken | ÖkoInvest",
  beschreibung:
    "Entwurf der Vertraulichkeitsbedingungen für Banken im Bank-Portal: Nutzung des Bankenpakets, zulässige Weitergabe, Zugang, Protokoll, Datenschutz und Dauer.",
  bild: "/img/team-praesentation.jpg",
  bildAlt: "Team bei einer Präsentation",
});

// Englisch (Sprachmodell): Übersetzung zur Information – maßgeblich ist die deutsche Fassung. ENTWURF.
const metadataEn = bedingungenMetadataEn({
  titel: "Confidentiality terms for banks | ÖkoInvest",
  beschreibung: "Draft of the confidentiality terms for banks in the bank portal: use of the bank package, permitted disclosure, access, log, data protection and duration.",
  bildAlt: "Team during a presentation",
});

const G = GESELLSCHAFT;

export default async function VertraulichkeitBankenPage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Confidentiality terms for banks" : "Vertraulichkeitsbedingungen für Banken"}
      pfad={PFAD}
      stand={STAND_BEDINGUNGEN}
      lead={en ? "Rules for banks and financing partners that review financing requests from the ÖkoInvest group in the bank portal and retrieve the bank package." : "Regeln für Banken und Finanzierungspartner, die im Bank-Portal Finanzierungsanfragen der ÖkoInvest-Gruppe prüfen und das Bankenpaket abrufen."}
    >
      <EntwurfHinweis />
      {en ? (
        <>
      <h2>§ 1 Scope and access</h2>
      <p>
        (1) {G.name} or the respective project company (“requesting party”) invites banks to a financing request via a personal, time-limited link. By
        retrieving documents for the first time, the bank accepts these terms. Existing individual confidentiality agreements, or those concluded later,
        take precedence.
      </p>
      <p>
        (2) Access is personal and tied to the invited e-mail address. Access data and links must not be passed on; further persons at the bank will be
        invited on request. The bank notifies us when an authorised person leaves.
      </p>

      <h2>§ 2 Confidential information</h2>
      <p>
        All information made available to the bank in connection with the request is confidential – in particular the <strong>bank package</strong>{" "}
        (project profile, financial model, yield assessment, contracts, permits, land register and easement documents), queries and answers, and the fact
        of the request itself. This excludes information that is or becomes publicly known through no fault of the bank, that was demonstrably already
        known to the bank or that it lawfully received from third parties without an obligation of confidentiality.
      </p>

      <h2>§ 3 Purpose limitation and permitted disclosure</h2>
      <p>
        (1) The bank uses the information exclusively to assess, structure, decide on and carry out the requested financing.
      </p>
      <p>(2) Disclosure is only permitted to</p>
      <ul>
        <li>corporate bodies, employees and credit committees of the bank and its group companies, insofar as they need the information,</li>
        <li>the bank&apos;s advisers, experts and auditors bound by confidentiality,</li>
        <li>
          potential syndicate banks, development and refinancing institutions and credit insurers – only with the prior consent of the requesting party
          and subject to an equivalent obligation of confidentiality,
        </li>
        <li>supervisory authorities, courts and authorities, insofar as the bank is legally obliged to do so.</li>
      </ul>
      <p>The bank ensures that recipients comply with the same obligations. Banking secrecy and obligations under banking law remain unaffected.</p>

      <h2>§ 4 Marking and log</h2>
      <p>
        Every retrieval of documents is logged with the person and time. Documents may bear the recipient&apos;s name. The bank does not remove such
        markings and does not download documents automatically or in bulk.
      </p>

      <h2>§ 5 Personal data</h2>
      <p>
        (1) The bank package may contain personal data of third parties, for example of landowners and roof owners (lease and easement agreements, land
        register extracts) or power offtakers. The requesting party only passes on what is necessary for the credit decision and collateral.
      </p>
      <p>
        (2) The bank processes this data as an independent controller only for the purpose under § 3, protects it with appropriate technical and
        organisational measures and deletes it as soon as it is no longer needed and there is no retention obligation. It forwards requests from data
        subjects that concern the requesting party.
      </p>

      <h2>§ 6 Non-binding nature</h2>
      <p>
        (1) The request is not a commitment to conclude with the bank. The requesting party is free to approach several banks and to reject offers. Term
        sheets are indicative unless expressly designated as binding.
      </p>
      <p>
        (2) Each party bears its own costs of the review, unless otherwise agreed in writing (e.g. an arrangement fee in the term sheet).
      </p>

      <h2>§ 7 No warranty</h2>
      <p>
        The information is provided to the best of our knowledge. Financial models and forecasts are based on assumptions as of a given date; the
        requesting party only gives a warranty of completeness, accuracy or the occurrence of forecasts within the scope of the subsequent loan agreement.
        The bank carries out its own review.
      </p>

      <h2>§ 8 Return, deletion and duration</h2>
      <p>
        (1) If no financing is concluded, the bank deletes or returns the documents received on request; this excludes copies it must retain due to legal or
        regulatory obligations and automatic backup copies – confidentiality continues to apply to these.
      </p>
      <p>
        (2) The obligations apply for the duration of the request and beyond that for{" "}
        <Platzhalter>e.g. 3 years after the end of the request or for the term of a loan relationship</Platzhalter>.
      </p>
      <p>
        (3) The requesting party may end access at any time, in particular after the request has been completed or in the event of breaches of these
        terms.
      </p>
        </>
      ) : (
        <>

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

        </>
      )}

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/bedingungen/banken", metadata, { en: metadataEn });

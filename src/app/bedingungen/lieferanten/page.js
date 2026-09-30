// src/app/bedingungen/lieferanten/page.js
//
// Teilnahmebedingungen für Energieversorger (Angebotsanfragen der
// Energiebeschaffung) – ENTWURF zur anwaltlichen Prüfung, noindex bis zur
// Freigabe (siehe ../_teile.js). Kurzfassung im Portal:
// src/lib/plattform/energie/texte.js (LIEFERANT_BEDINGUNGEN) – Inhalte hier
// nicht widersprechen. Offene Punkte: Vergütung durch Versorger (Platzhalter),
// Dauer des Direktansprache-Verbots, Kartellrechtsklausel prüfen.

import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT } from "@/data/site";
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata } from "../_teile";

const PFAD = "/bedingungen/lieferanten";

export const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Teilnahmebedingungen Energieversorger | ÖkoInvest",
  beschreibung:
    "Entwurf der Teilnahmebedingungen für Energieversorger: Einladung, verdeckte Angebote, Fristen und Bindefrist, Zuschlag nur mit Kundenfreigabe, Vertraulichkeit.",
  bild: "/img/pv-wind-abend.jpg",
  bildAlt: "Photovoltaik und Windkraft am Abend",
});

const G = GESELLSCHAFT;

export default function TeilnahmebedingungenLieferantenPage() {
  return (
    <LegalShell
      titel="Teilnahmebedingungen für Energieversorger"
      pfad={PFAD}
      lead="Regeln für Energieversorger, die ÖkoInvest zu Angebotsanfragen für die Stromlieferung an Unternehmen einlädt – im Versorger-Portal oder per Angebotslink."
    >
      <EntwurfHinweis />

      <h2>§ 1 Teilnahme</h2>
      <p>
        (1) Die {G.name} („ÖkoInvest“) holt im Auftrag ihrer Kunden Angebote für die Stromlieferung ein. Teilnehmen können nur Energieversorger,
        die ÖkoInvest einlädt – über ein Konto im Versorger-Portal oder einen persönlichen Angebotslink. Mit der ersten Angebotsabgabe bzw. der
        Annahme der Einladung erkennt der Versorger diese Bedingungen an.
      </p>
      <p>
        (2) Der Versorger benennt eine vertretungsberechtigte Ansprechperson und wirkt an der Firmenprüfung (KYB) mit. Er versichert, über die
        für die Belieferung erforderlichen Genehmigungen, Registrierungen und Bilanzkreisverträge im jeweiligen Land zu verfügen.
      </p>

      <h2>§ 2 Verfahren</h2>
      <p>
        (1) Die Angebotsanfrage ist <strong>kein förmliches Vergabeverfahren</strong>. ÖkoInvest behandelt alle eingeladenen Versorger nach
        denselben, vorab mitgeteilten Regeln: gleiche Unterlagen, gleiche Fristen, gleiche Informationen.
      </p>
      <p>
        (2) Die Unterlagen bestehen aus einem Los-Kennzeichen, gerundeten Kennzahlen (Jahresmenge, Lastspitze), einem normierten Wochenprofil,
        Monatsanteilen, Land, Spannungsebene, Messart, gewünschten Produktvarianten (z. B. Festpreis, Tranchen, Spot-Index), Lieferbeginn und
        -ende sowie dem Preisblatt.
      </p>
      <p>
        (3) Fragen stellt der Versorger über das Portal. Antworten gehen anonymisiert an alle eingeladenen Versorger. ÖkoInvest kann Unterlagen
        nachreichen, Fristen verlängern und Folgerunden durchführen; in einer Folgerunde wird höchstens die vorab angekündigte Information
        mitgeteilt (z. B. Rang, Abstand zum besten Angebot oder bester Preis) – <strong>nie Namen anderer Versorger</strong>.
      </p>

      <h2>§ 3 Angebote</h2>
      <p>
        (1) Angebote werden ausschließlich über das Preisblatt abgegeben, mit allen Pflichtangaben: Arbeitspreis bzw. Aufschlag auf den Index,
        Grundpreis, Herkunftsnachweise, Mengentoleranz, <strong>Bindefrist</strong>, Zahlungsziel und geforderte Sicherheiten. Abweichungen von den
        Vorgaben und eigene Vertragsbedingungen sind im Angebot ausdrücklich zu benennen; nicht benannte Bedingungen werden nicht Teil des
        Angebots.
      </p>
      <p>
        (2) Angebote sind <strong>verdeckt</strong>: Kein Versorger sieht Angebote, Namen oder die Anzahl anderer Versorger. Je Runde gilt das
        zuletzt abgegebene Angebot. Nach Ablauf der Angebotsfrist sind Angebote gesperrt.
      </p>
      <p>
        (3) Angebote sind bis zum Ende der angegebenen Bindefrist <strong>verbindlich</strong>. Wird der Zuschlag innerhalb der Bindefrist
        erteilt, ist der Versorger verpflichtet, den Liefervertrag zu den angebotenen Bedingungen abzuschließen.
      </p>

      <h2>§ 4 Zuschlag und Vertrag</h2>
      <p>
        (1) Der Zuschlag setzt die <strong>Freigabe durch den Kunden</strong> voraus. Ein Anspruch auf Zuschlag, auf Erstattung von
        Angebotskosten oder auf Mitteilung der Gründe besteht nicht; Kunden können das Verfahren ohne Zuschlag beenden.
      </p>
      <p>
        (2) Nach dem Zuschlag erhält der bezuschlagte Versorger ein Zuschlagsschreiben sowie Firma, Anschrift, Ansprechperson und Lokations-IDs des
        Kunden. Der Liefervertrag kommt <strong>unmittelbar zwischen Versorger und Kunde</strong> zustande. Nicht berücksichtigte Versorger werden
        benachrichtigt.
      </p>

      <h2>§ 5 Vertraulichkeit und Datennutzung</h2>
      <ul>
        <li>
          Unterlagen und Verbrauchsdaten sind vertraulich und dürfen <strong>nur für das jeweilige Angebot</strong> genutzt werden – nicht für
          Werbung, Profilbildung oder andere Zwecke.
        </li>
        <li>Versuche, Kunden aus den anonymisierten Daten zu identifizieren, sind untersagt.</li>
        <li>
          Kunden einer laufenden Angebotsanfrage dürfen bezüglich dieser Anfrage nicht außerhalb der Plattform angesprochen werden; dies gilt
          bis <Platzhalter>z. B. 12 Monate</Platzhalter> nach Ende der Anfrage. Bestehende Kundenbeziehungen bleiben unberührt.
        </li>
        <li>
          Nicht bezuschlagte Versorger löschen die Unterlagen nach Ende der Anfrage, soweit keine Aufbewahrungspflicht besteht. Nach dem
          Zuschlag verarbeitet der Versorger die Kundendaten als eigener Verantwortlicher nach den Datenschutzvorschriften.
        </li>
      </ul>

      <h2>§ 6 Wettbewerb</h2>
      <p>
        Absprachen zwischen Versorgern über Preise, Angebote oder die Teilnahme sind unzulässig. Bei Anhaltspunkten für wettbewerbswidriges
        Verhalten kann ÖkoInvest den Versorger vom Verfahren ausschließen.
      </p>

      <h2>§ 7 Vergütung, Bewertung</h2>
      <p>
        (1) Die Teilnahme ist für Versorger kostenfrei. <Platzhalter>Festlegen, ob und welche Vergütung Versorger an ÖkoInvest leisten; jede
        Vergütung wird dem Kunden offengelegt</Platzhalter>
      </p>
      <p>
        (2) ÖkoInvest dokumentiert intern die Zusammenarbeit (z. B. Reaktionszeit, Vollständigkeit der Angebote, Vertragsumsetzung) und
        berücksichtigt dies bei künftigen Einladungen.
      </p>

      <h2>§ 8 Ausschluss und Haftung</h2>
      <p>
        (1) ÖkoInvest kann Versorger von einer Anfrage ausschließen, insbesondere bei unvollständigen oder verspäteten Angeboten, fehlender
        Firmenprüfung, Verstößen gegen diese Bedingungen oder begründeten Zweifeln an der Lieferfähigkeit.
      </p>
      <p>
        (2) Die Angaben in den Unterlagen beruhen auf den Daten des Kunden; ÖkoInvest übernimmt keine Gewähr für deren Richtigkeit. Im Übrigen gilt
        die Haftungsregelung der Nutzungsbedingungen (§ 16).
      </p>

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

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
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata, bedingungenMetadataEn, STAND_BEDINGUNGEN } from "../_teile";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const PFAD = "/bedingungen/lieferanten";

const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Teilnahmebedingungen Energieversorger | ÖkoInvest",
  beschreibung:
    "Entwurf der Teilnahmebedingungen für Energieversorger: Einladung, verdeckte Angebote, Fristen und Bindefrist, Zuschlag nur mit Kundenfreigabe, Vertraulichkeit.",
  bild: "/img/pv-wind-abend.jpg",
  bildAlt: "Photovoltaik und Windkraft am Abend",
});

// Englisch (Sprachmodell): Übersetzung zur Information – maßgeblich ist die deutsche Fassung. ENTWURF.
const metadataEn = bedingungenMetadataEn({
  titel: "Terms of participation for energy suppliers | ÖkoInvest",
  beschreibung: "Draft of the terms of participation for energy suppliers: invitation, sealed offers, deadlines and validity period, award only with customer approval, confidentiality.",
  bildAlt: "Photovoltaics and wind power in the evening",
});

const G = GESELLSCHAFT;

export default async function TeilnahmebedingungenLieferantenPage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Terms of participation for energy suppliers" : "Teilnahmebedingungen für Energieversorger"}
      pfad={PFAD}
      stand={STAND_BEDINGUNGEN}
      lead={en ? "Rules for energy suppliers that ÖkoInvest invites to requests for quotation for the supply of electricity to companies – in the supplier portal or via an offer link." : "Regeln für Energieversorger, die ÖkoInvest zu Angebotsanfragen für die Stromlieferung an Unternehmen einlädt – im Versorger-Portal oder per Angebotslink."}
    >
      <EntwurfHinweis />
      {en ? (
        <>
      <h2>§ 1 Participation</h2>
      <p>
        (1) {G.name} (“ÖkoInvest”) obtains offers for the supply of electricity on behalf of its customers. Only energy suppliers invited by ÖkoInvest can
        take part – via an account in the supplier portal or a personal offer link. By submitting its first offer or accepting the invitation, the supplier
        accepts these terms.
      </p>
      <p>
        (2) The supplier appoints a contact person authorised to represent it and cooperates in the company check (KYB). It warrants that it holds the
        licences, registrations and balancing group agreements required for supply in the respective country.
      </p>

      <h2>§ 2 Procedure</h2>
      <p>
        (1) The request for quotation is <strong>not a formal award procedure</strong>. ÖkoInvest treats all invited suppliers according to the same rules
        communicated in advance: the same documents, the same deadlines, the same information.
      </p>
      <p>
        (2) The documents consist of a lot identifier, rounded key figures (annual volume, peak load), a standardised weekly profile, monthly shares,
        country, voltage level, metering type, the required product variants (e.g. fixed price, tranches, spot index), start and end of supply, and the
        price sheet.
      </p>
      <p>
        (3) The supplier asks questions via the portal. Answers go to all invited suppliers in anonymised form. ÖkoInvest may supply additional documents,
        extend deadlines and hold further rounds; in a further round, at most the information announced in advance is shared (e.g. rank, distance to the
        best offer or best price) – <strong>never the names of other suppliers</strong>.
      </p>

      <h2>§ 3 Offers</h2>
      <p>
        (1) Offers are submitted exclusively via the price sheet, with all mandatory information: energy price or mark-up on the index, standing charge,
        guarantees of origin, volume tolerance, <strong>validity period</strong>, payment terms and required collateral. Deviations from the
        specifications and the supplier&apos;s own contract terms must be expressly stated in the offer; terms not stated do not become part of the offer.
      </p>
      <p>
        (2) Offers are <strong>sealed</strong>: no supplier sees the offers, names or number of other suppliers. In each round, the offer submitted last
        applies. Offers are locked after the offer deadline has expired.
      </p>
      <p>
        (3) Offers are <strong>binding</strong> until the end of the stated validity period. If the award is made within the validity period, the
        supplier is obliged to conclude the supply contract on the terms offered.
      </p>

      <h2>§ 4 Award and contract</h2>
      <p>
        (1) The award requires <strong>approval by the customer</strong>. There is no entitlement to an award, to reimbursement of the costs of the offer
        or to be informed of the reasons; customers may end the procedure without an award.
      </p>
      <p>
        (2) After the award, the successful supplier receives a letter of award and the customer&apos;s company name, address, contact person and location
        IDs. The supply contract is concluded <strong>directly between the supplier and the customer</strong>. Unsuccessful suppliers are notified.
      </p>

      <h2>§ 5 Confidentiality and use of data</h2>
      <ul>
        <li>
          Documents and consumption data are confidential and may be used <strong>only for the respective offer</strong> – not for advertising,
          profiling or other purposes.
        </li>
        <li>Attempts to identify customers from the anonymised data are prohibited.</li>
        <li>
          Customers in an ongoing request for quotation must not be approached outside the platform regarding that request; this applies until{" "}
          <Platzhalter>e.g. 12 months</Platzhalter> after the end of the request. Existing customer relationships remain unaffected.
        </li>
        <li>
          Unsuccessful suppliers delete the documents after the end of the request, unless there is a retention obligation. After the award, the supplier
          processes the customer data as an independent controller in accordance with data protection law.
        </li>
      </ul>

      <h2>§ 6 Competition</h2>
      <p>
        Agreements between suppliers on prices, offers or participation are not permitted. If there are indications of anti-competitive conduct,
        ÖkoInvest may exclude the supplier from the procedure.
      </p>

      <h2>§ 7 Remuneration, assessment</h2>
      <p>
        (1) Participation is free of charge for suppliers.{" "}
        <Platzhalter>decide whether and what remuneration suppliers pay to ÖkoInvest; any remuneration will be disclosed to the customer</Platzhalter>
      </p>
      <p>
        (2) ÖkoInvest documents the cooperation internally (e.g. response time, completeness of offers, contract implementation) and takes this into
        account for future invitations.
      </p>

      <h2>§ 8 Exclusion and liability</h2>
      <p>
        (1) ÖkoInvest may exclude suppliers from a request, in particular in the case of incomplete or late offers, a missing company check, breaches of
        these terms or well-founded doubts about the ability to supply.
      </p>
      <p>
        (2) The information in the documents is based on the customer&apos;s data; ÖkoInvest gives no guarantee of its accuracy. Otherwise, the liability
        provisions of the terms of use (§ 16) apply.
      </p>
        </>
      ) : (
        <>

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

        </>
      )}

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/bedingungen/lieferanten", metadata, { en: metadataEn });

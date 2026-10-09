// src/app/bedingungen/energiebeschaffung/page.js
//
// Servicevertrag Energiebeschaffung (Besondere Bedingungen) – ENTWURF zur
// anwaltlichen Prüfung, noindex bis zur Freigabe (siehe ../_teile.js).
// Fachgrundlage: docs/ENERGIEBESCHAFFUNG.md, Vollmachtstext
// src/lib/plattform/energie/texte.js (VOLLMACHT_TEXT – Inhalte hier nicht
// widersprechen; bei Änderungen beide Stellen angleichen).
// Offene Punkte: Vergütungsmodell (Platzhalter), Haftungshöchstbetrag,
// Laufzeit/Kündigung, Gewerbe-/Registrierungspflicht als Energieberater
// bzw. -vermittler (AT/DE), Offenlegung etwaiger Versorgerprovisionen.

import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT } from "@/data/site";
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata, bedingungenMetadataEn, STAND_BEDINGUNGEN } from "../_teile";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const PFAD = "/bedingungen/energiebeschaffung";

const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Servicevertrag Energiebeschaffung | ÖkoInvest",
  beschreibung:
    "Entwurf des Servicevertrags Energiebeschaffung: Leistungen, Beschaffungsvollmacht, Mitwirkung, Vergütung, Vertraulichkeit, Haftung und Laufzeit für Unternehmen.",
  bild: "/img/gewerbedach.jpg",
  bildAlt: "Gewerbedach mit Photovoltaikanlage",
});

// Englisch (Sprachmodell): Übersetzung zur Information – maßgeblich ist die deutsche Fassung. ENTWURF.
const metadataEn = bedingungenMetadataEn({
  titel: "Energy procurement service agreement | ÖkoInvest",
  beschreibung: "Draft of the energy procurement service agreement: services, procurement mandate, cooperation, remuneration, confidentiality, liability and term for companies.",
  bildAlt: "Commercial roof with a photovoltaic system",
});

const G = GESELLSCHAFT;

export default async function ServicevertragEnergiePage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Energy procurement service agreement" : "Servicevertrag Energiebeschaffung"}
      pfad={PFAD}
      stand={STAND_BEDINGUNGEN}
      lead={en ? "Special terms for companies that have their electricity purchased via the ÖkoInvest platform – individually or pooled in the residual power pool." : "Besondere Bedingungen für Unternehmen, die ihren Strom über die ÖkoInvest-Plattform einkaufen lassen – einzeln oder gebündelt im Reststrom-Pool."}
    >
      <EntwurfHinweis />
      {en ? (
        <>
      <h2>§ 1 Subject matter of the agreement</h2>
      <p>
        (1) {G.name} (“ÖkoInvest”) supports the customer in purchasing electricity for the supply points specified in the portal. For this purpose, it
        obtains offers from energy suppliers, evaluates them and supports the switch. In doing so, ÖkoInvest acts as the <strong>customer&apos;s service
        provider</strong>; it becomes neither the electricity supplier nor a party to the supply contract.
      </p>
      <p>
        (2) The agreement is aimed at entrepreneurs. Public contracting authorities must observe § 9. The agreement is concluded by confirmation in the
        portal or by signature; the procurement mandate (§ 4) is a prerequisite for every request for quotation.
      </p>

      <h2>§ 2 Scope of services</h2>
      <p>(1) Depending on the instructions given in the portal, ÖkoInvest provides the following services:</p>
      <ul>
        <li>
          <strong>Data collection:</strong> recording of supply points, metering type, voltage level, current contracts and notice periods; import and
          check of the load profile (15-minute values).
        </li>
        <li>
          <strong>Analysis:</strong> consumption profile, influence of own PV and storage systems, costs of different procurement models (fixed price,
          tranches, spot index) retrospectively and as a forecast; recommendation on timing (tender, wait, extend).
        </li>
        <li>
          <strong>Request for quotation:</strong> selection and invitation of suitable energy suppliers, anonymised documents (lot, rounded key figures,
          standardised profile), deadlines, questions and answers, further rounds if necessary.
        </li>
        <li>
          <strong>Evaluation:</strong> comparison of offers on a uniform basis (energy price per consumption profile, contract terms, risks),
          sensitivities and a reasoned award proposal.
        </li>
        <li>
          <strong>Conclusion and switch:</strong> after approval by the customer, transmission of the award, forwarding of the contract data to the
          selected supplier and support with the termination of the previous contract and the change of supplier.
        </li>
        <li>
          <strong>Ongoing support:</strong> monitoring of contract terms and notice periods with reminders, regular switching analysis against the futures
          market.
        </li>
        <li>
          <strong>Pool (optional):</strong> bundling with other customers to achieve better terms. The supply contract is nevertheless concluded for each
          customer, unless expressly agreed otherwise.
        </li>
      </ul>
      <p>
        (2) In particular, the following are <strong>not owed</strong>: a specific price or saving, legal and tax advice, trading for own account, the
        assumption of balancing group, price or volume risks, payment processing with the supplier and the conduct of formal award procedures.
      </p>

      <h2>§ 3 Cooperation of the customer</h2>
      <ul>
        <li>complete and correct information on supply points, consumption, current contracts and notice periods, and a usable load profile,</li>
        <li>timely notification of material changes (e.g. new plant, site closure, shift pattern, jump in consumption),</li>
        <li>appointment of a contact person with decision-making authority,</li>
        <li>
          decision on the award proposal within the validity period of the offers – after the validity period has expired, the supplier is no longer
          bound,
        </li>
        <li>review and signature of the supply contract or the supplier&apos;s order confirmation.</li>
      </ul>
      <p>
        Delays or disadvantages resulting from missing or late cooperation – for example a missed notice period due to incorrect information – are not
        borne by ÖkoInvest.
      </p>

      <h2>§ 4 Procurement mandate</h2>
      <p>
        (1) In the portal (versioned text, time, IP address; on request additionally with an electronic signature), the customer authorises ÖkoInvest to
        obtain offers, to pass on anonymised consumption data for this purpose and, after the customer&apos;s express approval, to transmit the award and
        to initiate the change of supplier, including termination of the previous contract, in the customer&apos;s name.
      </p>
      <p>
        (2) <strong>No supply contract is concluded without the customer&apos;s approval in the portal.</strong> Only the successful supplier receives the
        name, address and location IDs, and only after approval.
      </p>
      <p>
        (3) The customer can revoke the mandate in the portal at any time. Awards already made and supply contracts already concluded remain unaffected;
        ongoing requests for quotation are ended.
      </p>

      <h2>§ 5 Remuneration</h2>
      <p>
        (1) The remuneration is set for each customer in the portal or in the offer. Possible components:
      </p>
      <ul>
        <li>
          <strong>Service fee</strong> per MWh supplied over the term of the contract: <Platzhalter>amount in €/MWh</Platzhalter>
        </li>
        <li>
          <strong>Success fee</strong> as a share of the saving compared with a reference set in advance (e.g. the previous supplier&apos;s renewal
          offer): <Platzhalter>percentage, reference and calculation period</Platzhalter>
        </li>
        <li>
          <strong>Minimum or flat fee</strong> for analysis without an award: <Platzhalter>amount or “not applicable”</Platzhalter>
        </li>
      </ul>
      <p>
        (2) Due date and invoicing: <Platzhalter>e.g. annually or after the start of supply, payment within 14 days</Platzhalter>. All amounts are
        subject to VAT.
      </p>
      <p>
        (3) <strong>Transparency:</strong> if ÖkoInvest receives remuneration from a supplier in connection with the customer&apos;s order, ÖkoInvest
        discloses this to the customer before the award. <Platzhalter>decision whether supplier commissions are excluded in principle</Platzhalter>
      </p>

      <h2>§ 6 Neutrality and equal treatment</h2>
      <p>
        ÖkoInvest treats all invited suppliers according to the same rules announced in advance and makes recommendations according to transparent
        criteria (price, contract terms, creditworthiness and capability of the supplier). Any connections to a supplier – for example via companies of
        the ÖKOVOLT Group – are indicated in the comparison.
      </p>

      <h2>§ 7 Confidentiality and data</h2>
      <p>
        (1) Both parties treat information received under the agreement confidentially. In the offer phase, suppliers only receive anonymised key figures,
        no names, locations, location IDs or time series. Suppliers&apos; offers are intended for the customer and must not be passed on to suppliers.
      </p>
      <p>
        (2) ÖkoInvest may use anonymised and aggregated data (e.g. price levels, profile key figures) for its own market monitoring and to improve its
        analyses, provided that no conclusions can be drawn about the customer. The processing of personal data is governed by the privacy policy
        (section “Energy procurement”).
      </p>

      <h2>§ 8 Liability</h2>
      <p>
        (1) Market analyses, forecasts and recommendations are based on market data as of a given date and on assumptions; they are{" "}
        <strong>assessments and not a commitment</strong> to future prices or savings. The customer decides on the award.
      </p>
      <p>
        (2) ÖkoInvest is not liable for the performance of the contract, the supplier&apos;s ability to deliver or its insolvency, nor for price
        components that are not subject to competition (grid charges, taxes, levies, surcharges).
      </p>
      <p>
        (3) Otherwise, ÖkoInvest is only liable for intent and gross negligence; the limitation does not apply to personal injury and the breach of
        material contractual obligations within the scope of the foreseeable, typical damage. Liability for slight negligence is – insofar as permissible –
        limited in amount to <Platzhalter>maximum amount, e.g. the remuneration for the last 12 months</Platzhalter>.
      </p>

      <h2>§ 9 Public contracting authorities</h2>
      <p>
        Municipalities, special-purpose associations and municipal companies are subject to public procurement law when purchasing electricity (in
        Germany in particular the GWB/VgV or, below the thresholds, the UVgO and state law; in Austria the BVergG 2018). The request for quotation does not
        replace a formal award procedure. For public contracting authorities, ÖkoInvest only provides the services as market research or in coordination
        with the contracting authority&apos;s award procedure; responsibility under procurement law remains with the contracting authority.
      </p>

      <h2>§ 10 Term and termination</h2>
      <p>
        (1) Term: <Platzhalter>e.g. 12 months, renewal for a further 12 months each time, notice period of 3 months to the end of the term</Platzhalter>.
        The right to terminate for good cause remains unaffected.
      </p>
      <p>
        (2) The procurement mandate expires when the agreement ends. Ongoing requests for quotation are ended unless the parties agree to complete them.
        Remuneration claims for supply contracts concluded during the term remain in place.
      </p>
        </>
      ) : (
        <>

      <h2>§ 1 Vertragsgegenstand</h2>
      <p>
        (1) Die {G.name} („ÖkoInvest“) unterstützt den Kunden beim Einkauf von Strom für die im Portal benannten Abnahmestellen. Sie holt dazu
        Angebote von Energieversorgern ein, wertet sie aus und begleitet den Wechsel. ÖkoInvest ist dabei <strong>Dienstleisterin des
        Kunden</strong>; sie wird weder Stromlieferantin noch Vertragspartei des Liefervertrags.
      </p>
      <p>
        (2) Der Vertrag richtet sich an Unternehmer. Öffentliche Auftraggeber beachten § 9. Der Vertrag kommt durch Bestätigung im Portal bzw.
        durch Unterzeichnung zustande; die Beschaffungsvollmacht (§ 4) ist Voraussetzung jeder Angebotsanfrage.
      </p>

      <h2>§ 2 Leistungsumfang</h2>
      <p>(1) ÖkoInvest erbringt – je nach Beauftragung im Portal – folgende Leistungen:</p>
      <ul>
        <li>
          <strong>Datenaufnahme:</strong> Erfassung der Abnahmestellen, Messart, Spannungsebene, laufenden Verträge und Kündigungsfristen;
          Import und Prüfung des Lastgangs (Viertelstundenwerte).
        </li>
        <li>
          <strong>Analyse:</strong> Verbrauchsprofil, Einfluss eigener PV- und Speicheranlagen, Kosten verschiedener Beschaffungsmodelle
          (Festpreis, Tranchen, Spot-Index) rückblickend und als Prognose; Empfehlung zum Zeitpunkt (ausschreiben, abwarten, verlängern).
        </li>
        <li>
          <strong>Angebotsanfrage:</strong> Auswahl und Einladung geeigneter Energieversorger, anonymisierte Unterlagen (Los, gerundete Kennzahlen,
          normiertes Profil), Fristen, Fragen und Antworten, bei Bedarf weitere Runden.
        </li>
        <li>
          <strong>Auswertung:</strong> Vergleich der Angebote auf einheitlicher Basis (Energiepreis je Verbrauchsprofil, Vertragsbedingungen,
          Risiken), Sensitivitäten und ein begründeter Zuschlagsvorschlag.
        </li>
        <li>
          <strong>Abschluss und Wechsel:</strong> nach Freigabe durch den Kunden Übermittlung des Zuschlags, Weitergabe der Vertragsdaten an den
          ausgewählten Versorger und Unterstützung bei Kündigung des bisherigen Vertrags und Lieferantenwechsel.
        </li>
        <li>
          <strong>Laufende Betreuung:</strong> Überwachung von Vertragslaufzeit und Kündigungsfristen mit Erinnerungen, regelmäßige
          Wechselanalyse gegenüber dem Terminmarkt.
        </li>
        <li>
          <strong>Pool (optional):</strong> Bündelung mit anderen Kunden, um bessere Konditionen zu erzielen. Der Liefervertrag wird dennoch
          je Kunde geschlossen, sofern nicht ausdrücklich anders vereinbart.
        </li>
      </ul>
      <p>
        (2) <strong>Nicht geschuldet</strong> sind insbesondere ein bestimmter Preis oder eine Ersparnis, Rechts- und Steuerberatung, der Handel
        auf eigene Rechnung, die Übernahme von Bilanzkreis-, Preis- oder Mengenrisiken, die Zahlungsabwicklung mit dem Versorger sowie die
        Durchführung förmlicher Vergabeverfahren.
      </p>

      <h2>§ 3 Mitwirkung des Kunden</h2>
      <ul>
        <li>vollständige und richtige Angaben zu Abnahmestellen, Verbrauch, laufenden Verträgen und Kündigungsfristen sowie ein verwertbarer Lastgang,</li>
        <li>rechtzeitige Mitteilung wesentlicher Änderungen (z. B. neue Anlage, Standortschließung, Schichtmodell, Verbrauchssprung),</li>
        <li>Benennung einer entscheidungsbefugten Ansprechperson,</li>
        <li>
          Entscheidung über den Zuschlagsvorschlag innerhalb der Bindefrist der Angebote – nach Ablauf der Bindefrist ist der Versorger nicht
          mehr gebunden,
        </li>
        <li>Prüfung und Unterzeichnung des Liefervertrags bzw. der Auftragsbestätigung des Versorgers.</li>
      </ul>
      <p>
        Verzögerungen oder Nachteile, die auf fehlender oder verspäteter Mitwirkung beruhen – etwa eine versäumte Kündigungsfrist wegen
        falscher Angaben –, gehen nicht zulasten von ÖkoInvest.
      </p>

      <h2>§ 4 Beschaffungsvollmacht</h2>
      <p>
        (1) Der Kunde bevollmächtigt ÖkoInvest im Portal (versionierter Text, Zeitpunkt, IP-Adresse; auf Wunsch zusätzlich mit elektronischer
        Unterschrift), Angebote einzuholen, dafür anonymisierte Verbrauchsdaten weiterzugeben und nach seiner ausdrücklichen Freigabe den Zuschlag
        zu übermitteln sowie den Lieferantenwechsel einschließlich Kündigung des bisherigen Vertrags in seinem Namen einzuleiten.
      </p>
      <p>
        (2) <strong>Ohne Freigabe des Kunden im Portal kommt kein Liefervertrag zustande.</strong> Name, Anschrift und Lokations-IDs erhält nur
        der bezuschlagte Versorger, und erst nach der Freigabe.
      </p>
      <p>
        (3) Der Kunde kann die Vollmacht jederzeit im Portal widerrufen. Bereits erteilte Zuschläge und abgeschlossene Lieferverträge bleiben
        davon unberührt; laufende Angebotsanfragen werden beendet.
      </p>

      <h2>§ 5 Vergütung</h2>
      <p>
        (1) Die Vergütung wird je Kunde im Portal bzw. im Angebot festgelegt. Mögliche Bestandteile:
      </p>
      <ul>
        <li>
          <strong>Servicefee</strong> je gelieferter MWh über die Vertragslaufzeit: <Platzhalter>Betrag in €/MWh</Platzhalter>
        </li>
        <li>
          <strong>Erfolgshonorar</strong> als Anteil an der Ersparnis gegenüber einer vorab festgelegten Referenz (z. B. Verlängerungsangebot
          des bisherigen Versorgers): <Platzhalter>Prozentsatz, Referenz und Berechnungszeitraum</Platzhalter>
        </li>
        <li>
          <strong>Mindest- bzw. Pauschalentgelt</strong> für Analyse ohne Zuschlag: <Platzhalter>Betrag oder „entfällt“</Platzhalter>
        </li>
      </ul>
      <p>
        (2) Fälligkeit und Abrechnung: <Platzhalter>z. B. jährlich bzw. nach Lieferbeginn, Zahlungsziel 14 Tage</Platzhalter>. Alle Beträge
        verstehen sich zuzüglich Umsatzsteuer.
      </p>
      <p>
        (3) <strong>Transparenz:</strong> Erhält ÖkoInvest von einem Versorger eine Vergütung im Zusammenhang mit dem Auftrag des Kunden, legt
        ÖkoInvest dies dem Kunden vor dem Zuschlag offen. <Platzhalter>Festlegung, ob Versorgerprovisionen grundsätzlich ausgeschlossen sind</Platzhalter>
      </p>

      <h2>§ 6 Neutralität und Gleichbehandlung</h2>
      <p>
        ÖkoInvest behandelt alle eingeladenen Versorger nach denselben, vorab bekanntgegebenen Regeln und empfiehlt nach nachvollziehbaren
        Kriterien (Preis, Vertragsbedingungen, Bonität und Leistungsfähigkeit des Versorgers). Bestehen Verbindungen zu einem Versorger – etwa
        über Gesellschaften der ÖKOVOLT Gruppe –, wird dies im Vergleich kenntlich gemacht.
      </p>

      <h2>§ 7 Vertraulichkeit und Daten</h2>
      <p>
        (1) Beide Seiten behandeln die im Rahmen des Vertrags erhaltenen Informationen vertraulich. Versorger erhalten in der Angebotsphase nur
        anonymisierte Kennzahlen, keine Namen, Orte, Lokations-IDs oder Zeitreihen. Angebote der Versorger sind für den Kunden bestimmt und
        dürfen nicht an Versorger weitergegeben werden.
      </p>
      <p>
        (2) ÖkoInvest darf anonymisierte und aggregierte Daten (z. B. Preisniveaus, Profilkennzahlen) für die eigene Marktbeobachtung und die
        Verbesserung der Analysen nutzen, sofern kein Rückschluss auf den Kunden möglich ist. Die Verarbeitung personenbezogener Daten richtet
        sich nach der Datenschutzerklärung (Abschnitt „Energiebeschaffung“).
      </p>

      <h2>§ 8 Haftung</h2>
      <p>
        (1) Marktanalysen, Prognosen und Empfehlungen beruhen auf Marktdaten mit Stand und auf Annahmen; sie sind <strong>Einschätzungen und
        keine Zusage</strong> künftiger Preise oder Ersparnisse. Die Entscheidung über den Zuschlag trifft der Kunde.
      </p>
      <p>
        (2) ÖkoInvest haftet nicht für die Vertragserfüllung, Lieferfähigkeit oder Insolvenz des Versorgers und nicht für Preisbestandteile, die
        nicht Gegenstand des Wettbewerbs sind (Netzentgelte, Steuern, Abgaben, Umlagen).
      </p>
      <p>
        (3) Im Übrigen haftet ÖkoInvest nur für Vorsatz und grobe Fahrlässigkeit; die Beschränkung gilt nicht für Personenschäden und die
        Verletzung wesentlicher Vertragspflichten im Rahmen des vorhersehbaren, typischen Schadens. Die Haftung für leichte Fahrlässigkeit ist –
        soweit zulässig – der Höhe nach begrenzt auf <Platzhalter>Höchstbetrag, z. B. die Vergütung der letzten 12 Monate</Platzhalter>.
      </p>

      <h2>§ 9 Öffentliche Auftraggeber</h2>
      <p>
        Kommunen, Zweckverbände und kommunale Unternehmen unterliegen bei der Strombeschaffung dem Vergaberecht (in Deutschland insbesondere
        GWB/VgV bzw. unterhalb der Schwellenwerte UVgO und Landesrecht, in Österreich das BVergG 2018). Die Angebotsanfrage ersetzt kein
        förmliches Vergabeverfahren. Für öffentliche Auftraggeber erbringt ÖkoInvest die Leistungen nur als Markterkundung oder in Abstimmung mit
        dem Vergabeverfahren des Auftraggebers; die vergaberechtliche Verantwortung bleibt beim Auftraggeber.
      </p>

      <h2>§ 10 Laufzeit und Kündigung</h2>
      <p>
        (1) Laufzeit: <Platzhalter>z. B. 12 Monate, Verlängerung um jeweils 12 Monate, Kündigungsfrist 3 Monate zum Laufzeitende</Platzhalter>.
        Das Recht zur Kündigung aus wichtigem Grund bleibt unberührt.
      </p>
      <p>
        (2) Mit Vertragsende erlischt die Beschaffungsvollmacht. Laufende Angebotsanfragen werden beendet, sofern die Parteien nicht vereinbaren,
        sie abzuschließen. Vergütungsansprüche für Lieferverträge, die während der Laufzeit zustande gekommen sind, bleiben bestehen.
      </p>

        </>
      )}

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/bedingungen/energiebeschaffung", metadata, { en: metadataEn });

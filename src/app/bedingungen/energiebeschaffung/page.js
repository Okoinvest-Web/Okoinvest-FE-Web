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
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata, STAND_BEDINGUNGEN } from "../_teile";

const PFAD = "/bedingungen/energiebeschaffung";

export const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Servicevertrag Energiebeschaffung | ÖkoInvest",
  beschreibung:
    "Entwurf des Servicevertrags Energiebeschaffung: Leistungen, Beschaffungsvollmacht, Mitwirkung, Vergütung, Vertraulichkeit, Haftung und Laufzeit für Unternehmen.",
  bild: "/img/gewerbedach.jpg",
  bildAlt: "Gewerbedach mit Photovoltaikanlage",
});

const G = GESELLSCHAFT;

export default function ServicevertragEnergiePage() {
  return (
    <LegalShell
      titel="Servicevertrag Energiebeschaffung"
      pfad={PFAD}
      stand={STAND_BEDINGUNGEN}
      lead="Besondere Bedingungen für Unternehmen, die ihren Strom über die ÖkoInvest-Plattform einkaufen lassen – einzeln oder gebündelt im Reststrom-Pool."
    >
      <EntwurfHinweis />

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

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

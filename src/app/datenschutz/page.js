// src/app/datenschutz/page.js
//
// Datenschutzerklärung der ÖkoInvest GmbH (DSGVO, österreichisches DSG).
// Beschreibt die tatsächlich eingesetzten Verarbeitungen dieser Website:
// Hosting, Server-Logs, Anfragen (POST /api/anfrage -> Vorgang im ERP),
// Portal-Konto & Rollen, Projektbörse (NDA-Protokoll, Datenraum), Rechner
// (lokal), Live-Strommarktdaten (Energy-Charts, serverseitig), Cookie-Banner
// und Google Analytics 4 (nur nach Einwilligung, siehe
// src/components/Statistik/GoogleAnalytics.js und src/components/Cookies).
//
// PLATZHALTER (sichtbar markiert, vor Livegang ersetzen):
//  - Datenschutzkontakt (E-Mail bzw. Datenschutzbeauftragter, falls bestellt)
//  - Hosting-Anbieter der Website und Betreiber/Standort des ERP-Systems
// TODO rechtlich prüfen: Löschfristen (Server-Logs, Anfragen ohne Vertrag,
// NDA-Protokolle) mit der tatsächlichen Konfiguration abgleichen.

import Link from "next/link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, abs } from "@/data/site";

const PAGE_URL = abs("/datenschutz");
const TITEL = "Datenschutzerklärung | ÖkoInvest";
const BESCHREIBUNG =
  "Wie die ÖkoInvest GmbH personenbezogene Daten verarbeitet: Anfragen, Portal, Projektbörse mit NDA und Datenraum, Rechner, Analyse nach Einwilligung und Ihre Rechte.";

/** Datum der letzten inhaltlichen Überarbeitung */
const STAND = "29. September 2026";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "de_AT",
    url: PAGE_URL,
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), alt: "Solarpark unter blauem Himmel" }],
  },
};

/** Sichtbar markierter Platzhalter – vor Livegang ersetzen. */
function Platzhalter({ children }) {
  return <mark className="rounded-md bg-sun-300/40 px-1.5 py-0.5 font-semibold text-ink-900">[Platzhalter: {children}]</mark>;
}

const G = GESELLSCHAFT;

const FRISTEN = [
  ["Server-Logdaten", "in der Regel 14 Tage, bei Sicherheitsvorfällen bis zur Klärung"],
  ["Anfragen ohne Vertragsabschluss", "bis zu 3 Jahre nach der letzten Kommunikation, sofern Sie nicht früher die Löschung verlangen"],
  ["Portal-Konto", "für die Dauer der Registrierung; nach Löschung des Kontos Entfernung binnen 30 Tagen, soweit keine Aufbewahrungspflicht besteht"],
  ["NDA-Protokolle und Datenraum-Zugriffe", "für die Dauer der Vertraulichkeitsverpflichtung zuzüglich der gesetzlichen Verjährungsfristen"],
  ["Vertrags-, Provisions- und Buchhaltungsunterlagen", "7 Jahre nach § 132 BAO bzw. § 212 UGB, bei Grundstücksbezug ggf. länger"],
  ["Einwilligung (Cookie-Einstellungen)", "12 Monate, danach fragen wir erneut"],
  ["Google-Analytics-Cookies", "bis zu 2 Jahre bzw. bis zum Widerruf; Ereignisdaten in Google Analytics höchstens 14 Monate"],
];

export default function DatenschutzPage() {
  return (
    <LegalShell
      titel="Datenschutzerklärung"
      pfad="/datenschutz"
      lead="Welche personenbezogenen Daten wir auf dieser Website, im Portal und in der Projektbörse verarbeiten, wozu, auf welcher Rechtsgrundlage – und welche Rechte Sie haben."
    >
      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website und in unserem Portal ist:</p>
      <address className="not-italic">
        <strong>{G.name}</strong>
        <br />
        {G.sitz}, {G.plz} {G.ort}, {G.land}
        <br />
        Firmenbuch {G.register}, {G.gericht}
        <br />
        Geschäftsführung: {G.geschaeftsfuehrung.join(", ")}
      </address>
      <p>
        <strong>Datenschutzkontakt:</strong>{" "}
        {KONTAKT.email ? <a href={`mailto:${KONTAKT.email}?subject=Datenschutz`}>{KONTAKT.email}</a> : <Platzhalter>E-Mail-Adresse für Datenschutzanfragen bzw. Datenschutzbeauftragter, falls bestellt</Platzhalter>}
        . Bis dahin erreichen Sie uns über das <Link href="/kontakt">Kontaktformular</Link> (Betreff „Datenschutz“) oder postalisch an die oben
        genannte Anschrift.
      </p>

      <h2>2. Grundsätze und Rechtsgrundlagen</h2>
      <p>
        Wir verarbeiten personenbezogene Daten nach der Datenschutz-Grundverordnung (DSGVO) und dem österreichischen Datenschutzgesetz (DSG) –
        nur, soweit es für den jeweiligen Zweck erforderlich ist. Rechtsgrundlagen sind insbesondere:
      </p>
      <ul>
        <li>
          <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Ihre Einwilligung (z. B. Google Analytics); jederzeit mit Wirkung für die Zukunft widerrufbar.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Vertrag oder vorvertragliche Maßnahmen (Anfragen, Portal-Konto, Projektbörse, NDA).
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> – rechtliche Verpflichtungen (z. B. unternehmensrechtliche und steuerliche Aufbewahrung).
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – berechtigte Interessen (sicherer Betrieb der Website, Nachweis von Vertraulichkeitsvereinbarungen,
          Missbrauchsabwehr, Zuordnung von Anfragen).
        </li>
      </ul>
      <p>Die Website wird ausschließlich verschlüsselt (TLS) ausgeliefert.</p>

      <h2>3. Hosting</h2>
      <p>
        Diese Website wird bei <Platzhalter>Name und Sitz des Hosting-Anbieters, Serverstandort</Platzhalter> betrieben. Der Anbieter verarbeitet
        die beim Aufruf anfallenden Daten ausschließlich in unserem Auftrag auf Grundlage eines Auftragsverarbeitungsvertrags nach Art. 28 DSGVO.
        Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren und stabilen Bereitstellung (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>4. Server-Logdaten</h2>
      <p>
        Bei jedem Aufruf speichert der Server automatisch technische Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, übertragene
        Datenmenge, Statuscode, verweisende Seite sowie Browser und Betriebssystem. Die Daten dienen der Auslieferung der Seiten, der
        Fehleranalyse und der Abwehr von Angriffen (Art. 6 Abs. 1 lit. f DSGVO). Sie werden nicht mit anderen Daten zusammengeführt und nach
        kurzer Frist gelöscht (siehe Abschnitt 13).
      </p>

      <h2>5. Anfragen über Formulare (Flächencheck, Projekt, Investor, Reststrom u. a.)</h2>
      <p>
        Wenn Sie uns über ein Formular eine Anfrage senden – etwa zum Flächencheck, zur Agri-PV, zu einem Projekt, als Investor, zum
        Reststrom-Pool, zu Energiegemeinschaften oder zur Genossenschaft –, verarbeiten wir Ihre Kontaktdaten (Anrede, Name, ggf. Firma,
        E-Mail, ggf. Telefon, PLZ, Ort, Land) und die Angaben zu Ihrem Anliegen (z. B. Lage und Größe einer Fläche, Projektkennzahlen,
        Stromverbrauch). Die Anfrage wird als <strong>Vorgang</strong> mit Vorgangsnummer in unserem Kundenverwaltungs- und ERP-System gespeichert,
        damit wir sie bearbeiten und Ihnen den Stand nachvollziehbar machen können.
      </p>
      <p>
        Zusätzlich übermitteln wir mit der Anfrage, <strong>ohne Cookies</strong>, über welchen Weg Sie auf die Website gekommen sind (z. B.
        Kampagnen-Parameter, verweisende Domain, Einstiegs- und Absendeseite). Diese Angaben werden nur im Arbeitsspeicher Ihres Browsers
        gehalten und ausschließlich zusammen mit einer Anfrage gesendet.
      </p>
      <p>
        Rechtsgrundlage ist die Durchführung vorvertraglicher Maßnahmen auf Ihre Anfrage (Art. 6 Abs. 1 lit. b DSGVO) sowie unser berechtigtes
        Interesse an einer geordneten Bearbeitung und Auswertung der Kontaktwege (Art. 6 Abs. 1 lit. f DSGVO). Registrieren Sie sich später
        mit derselben E-Mail-Adresse im Portal, wird Ihr Vorgang Ihrem Konto zugeordnet, damit Sie ihn dort weiterverfolgen können.
      </p>

      <h2>6. Portal-Konto und Rollen</h2>
      <p>
        Für die Nutzung des Portals legen Sie ein Konto an. Wir verarbeiten dabei Ihre Registrierungsdaten (Name, E-Mail, ggf. Firma, Telefon
        und Anschrift), Ihre Rolle (z. B. Flächeneigentümer, Landwirt, Investor, Projektanbieter, Unternehmen, Mitglied), Zugangsdaten
        (Passwörter nur als kryptografischer Hash), Anmeldezeitpunkte sowie die Inhalte, die Sie im Portal hinterlegen: Flächen, Projekte,
        Suchprofile, Nachrichten und Dokumente. Für die Anmeldung setzen wir technisch notwendige Sitzungs-Cookies ein.
      </p>
      <p>
        Die Verarbeitung ist für die Bereitstellung des Portals erforderlich (Art. 6 Abs. 1 lit. b DSGVO). Zur Sicherheit protokollieren wir
        sicherheitsrelevante Ereignisse wie Anmeldungen und Rechteänderungen (Art. 6 Abs. 1 lit. f DSGVO). Welche Inhalte andere Nutzer sehen,
        hängt von Ihrer Rolle und Ihren Freigaben ab; Mitarbeitende der ÖkoInvest GmbH sehen die Daten, soweit sie diese für die Prüfung,
        Betreuung und Vermittlung benötigen.
      </p>

      <h2>7. Projektbörse: Exposés, NDA und Datenraum</h2>
      <p>
        In der öffentlichen <Link href="/projektboerse">Projektbörse</Link> erscheinen nur anonymisierte Exposé-Teaser ohne Personenbezug. Details
        und Unterlagen sind erst nach Anmeldung und Abschluss einer Vertraulichkeitsvereinbarung (NDA) zugänglich.
      </p>
      <ul>
        <li>
          <strong>NDA-Protokoll:</strong> Beim Abschluss eines NDA speichern wir Name, Firma, E-Mail, das betroffene Projekt, die Version des
          NDA-Textes, den <strong>Zeitstempel</strong> und die <strong>IP-Adresse</strong>. Das Protokoll dient dem Nachweis, wer wann welcher
          Vertraulichkeitsverpflichtung zugestimmt hat (Art. 6 Abs. 1 lit. b und f DSGVO).
        </li>
        <li>
          <strong>Datenraum:</strong> Wir protokollieren, welches Konto wann welche Dokumente aufgerufen oder heruntergeladen hat. Das schützt die
          vertraulichen Unterlagen der Anbieter und ermöglicht die Aufklärung von Verstößen (Art. 6 Abs. 1 lit. f DSGVO).
        </li>
        <li>
          <strong>Weitergabe im Vermittlungsprozess:</strong> Bekunden Sie Interesse an einem Projekt oder schließen Sie ein NDA ab, erfährt der
          Anbieter des Projekts Ihren Namen, Ihre Firma und Ihre Kontaktdaten, soweit dies für die Anbahnung erforderlich ist. Umgekehrt erhalten
          Investoren nach NDA die Angaben, die der Anbieter für sein Projekt freigegeben hat (Art. 6 Abs. 1 lit. b DSGVO).
        </li>
        <li>
          <strong>Dokumente der Anbieter:</strong> Projektunterlagen können personenbezogene Daten Dritter enthalten (z. B. Grundstückseigentümer in
          Grundbuchauszügen oder Pachtverträgen). Anbieter sind dafür verantwortlich, solche Daten nur einzustellen, wenn sie dazu berechtigt
          sind, und sie soweit möglich zu schwärzen (siehe <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>).
        </li>
      </ul>

      <h2>8. Rechner und Werkzeuge</h2>
      <p>
        Unsere <Link href="/rechner">Rechner</Link> (z. B. Pacht-, Agri-PV-, Solarpark-, Projektbewertungs- und Reststrom-Rechner) rechnen
        <strong> lokal in Ihrem Browser</strong>. Ihre Eingaben werden dabei nicht an uns übertragen und nicht gespeichert. Erst wenn Sie ein
        Ergebnis ausdrücklich mit einer Anfrage an uns senden, verarbeiten wir es wie in Abschnitt 5 beschrieben.
      </p>

      <h2>9. Live-Strommarktdaten</h2>
      <p>
        Börsenstrompreise und Erzeugungsdaten (z. B. auf der Seite <Link href="/energie-live">Energie live</Link>) beziehen wir{" "}
        <strong>serverseitig</strong> von der Plattform Energy-Charts des Fraunhofer-Instituts für Solare Energiesysteme ISE. Ihr Browser baut
        dafür keine Verbindung zu Energy-Charts auf; es werden keine personenbezogenen Daten von Ihnen an Fraunhofer ISE übermittelt.
      </p>

      <h2>10. Cookies und Einwilligungsverwaltung</h2>
      <p>
        Technisch notwendige Cookies setzen wir ohne Einwilligung ein (§ 165 Abs. 3 Telekommunikationsgesetz 2021; Art. 6 Abs. 1 lit. f
        DSGVO) – etwa für die Anmeldung im Portal und um Ihre Auswahl im Cookie-Banner zu speichern (Cookie „cookieConsent“, Laufzeit 12
        Monate). Alle anderen Dienste werden erst nach Ihrer Einwilligung geladen (Art. 6 Abs. 1 lit. a DSGVO). Sofern auf einzelnen Seiten
        Kartendienste Dritter eingebunden sind, werden diese ebenfalls erst nach Einwilligung in die Kategorie „Funktional“ geladen.
      </p>
      <p>
        Ihre Auswahl können Sie jederzeit über <strong>„Privatsphäre-Einstellungen“</strong> im Fußbereich jeder Seite ändern oder widerrufen.
      </p>

      <h2>11. Google Analytics 4 (nur nach Einwilligung)</h2>
      <p>
        Nur wenn Sie in die Kategorie „Statistik“ einwilligen, nutzen wir Google Analytics 4 der Google Ireland Limited, Gordon House, Barrow
        Street, Dublin 4, Irland. Vor Ihrer Einwilligung wird das Skript nicht geladen. Google Analytics erfasst, welche Seiten aufgerufen
        werden, Verweildauer, Herkunft (z. B. Suchmaschine oder Kampagne), Gerät, Browser und ungefähren Standort (Land/Region) sowie Ereignisse
        wie gesendete Formulare. Google Signals und Werbefunktionen sind deaktiviert; IP-Adressen werden in Google Analytics 4 nach Angaben von
        Google nicht gespeichert. Dabei werden die Cookies „_ga“ und „_ga_*“ mit einer Laufzeit von bis zu 2 Jahren gesetzt.
      </p>
      <p>
        Eine Übermittlung in die USA ist möglich. Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert; die Übermittlung stützt
        sich auf den Angemessenheitsbeschluss der Europäischen Kommission (Art. 45 DSGVO). Widerrufen Sie Ihre Einwilligung, beenden wir die
        Messung sofort und löschen die Analytics-Cookies in Ihrem Browser. Weitere Informationen:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Datenschutzerklärung von Google<span className="sr-only"> (öffnet in neuem Tab)</span>
        </a>
        .
      </p>

      <h2>12. Empfänger und Auftragsverarbeiter</h2>
      <p>Personenbezogene Daten erhalten nur Stellen, die sie für den jeweiligen Zweck benötigen:</p>
      <ul>
        <li>
          <strong>ERP- und Portalsystem:</strong> Anfragen, Vorgänge, Portal-Konten, Nachrichten und Dokumente verwalten wir in einem ERP-System auf
          Basis des Open-Source-Frameworks Frappe. Betrieb und Hosting: <Platzhalter>Betreiber und Serverstandort des ERP-Systems</Platzhalter>.
          Soweit Dienstleister oder Gesellschaften der ÖKOVOLT Gruppe das System für uns betreiben oder warten, geschieht dies als
          Auftragsverarbeitung auf Grundlage eines Vertrags nach Art. 28 DSGVO.
        </li>
        <li>
          <strong>Hosting- und IT-Dienstleister</strong> (siehe Abschnitt 3), ebenfalls als Auftragsverarbeiter.
        </li>
        <li>
          <strong>Gesellschaften der ÖKOVOLT Gruppe</strong>, soweit sie an der Bearbeitung Ihres Anliegens beteiligt sind (z. B. Planung, Errichtung,
          Betrieb) – auf Grundlage von Art. 6 Abs. 1 lit. b bzw. f DSGVO.
        </li>
        <li>
          <strong>Projektanbieter und Investoren</strong> im Rahmen der Projektbörse, wie in Abschnitt 7 beschrieben.
        </li>
        <li>
          <strong>Steuerberatung, Wirtschaftsprüfung, Rechtsberatung und Behörden</strong>, soweit gesetzlich vorgeschrieben oder zur Durchsetzung
          von Ansprüchen erforderlich.
        </li>
      </ul>
      <p>Eine Übermittlung in Staaten außerhalb des EWR findet nur statt, soweit in dieser Erklärung beschrieben (Google Analytics).</p>

      <h2>13. Speicherdauer</h2>
      <p>
        Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten
        bestehen. Richtwerte:
      </p>
      <div className="not-prose -mx-1 overflow-x-auto" tabIndex={0} role="region" aria-label="Speicherfristen">
        <table className="mt-4 w-full min-w-[520px] border-collapse text-left text-[15px]">
          <caption className="sr-only">Speicherfristen nach Datenkategorie</caption>
          <thead>
            <tr className="border-b border-ink-200">
              <th scope="col" className="py-2.5 pr-4 font-semibold text-ink-900">Daten</th>
              <th scope="col" className="py-2.5 font-semibold text-ink-900">Speicherdauer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {FRISTEN.map(([daten, dauer]) => (
              <tr key={daten}>
                <th scope="row" className="py-2.5 pr-4 align-top font-medium text-ink-900">{daten}</th>
                <td className="py-2.5 align-top">{dauer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>14. Ihre Rechte</h2>
      <p>Sie haben gegenüber uns jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO),</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
        <li>Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
        <li>
          <strong>Widerspruch</strong> gegen Verarbeitungen, die auf berechtigten Interessen beruhen, aus Gründen, die sich aus Ihrer besonderen
          Situation ergeben (Art. 21 DSGVO),
        </li>
        <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
      </ul>
      <p>
        Wenden Sie sich dazu an den oben genannten Datenschutzkontakt. Zur Bestätigung Ihrer Identität können wir angemessene Nachweise
        verlangen.
      </p>

      <h2>15. Beschwerderecht</h2>
      <p>
        Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt, können Sie sich bei einer
        Aufsichtsbehörde beschweren. Für uns zuständig ist die:
      </p>
      <address className="not-italic">
        <strong>Österreichische Datenschutzbehörde</strong>
        <br />
        Barichgasse 40–42, 1030 Wien, Österreich
        <br />
        E-Mail: <a href="mailto:dsb@dsb.gv.at">dsb@dsb.gv.at</a>
        <br />
        Website:{" "}
        <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer">
          www.dsb.gv.at<span className="sr-only"> (öffnet in neuem Tab)</span>
        </a>
      </address>
      <p>
        Sie können sich auch an die Aufsichtsbehörde Ihres gewöhnlichen Aufenthaltsorts oder Arbeitsplatzes wenden, in Deutschland etwa an die
        Datenschutzbehörde Ihres Bundeslandes. Für Personen in der Schweiz ist zusätzlich der Eidgenössische Datenschutz- und
        Öffentlichkeitsbeauftragte (EDÖB) Ansprechpartner.
      </p>

      <h2>16. Pflicht zur Bereitstellung, keine automatisierten Entscheidungen</h2>
      <p>
        Die Nutzung der Website ist ohne Angabe personenbezogener Daten möglich. Für Anfragen, das Portal und die Projektbörse benötigen wir die
        als Pflichtfelder gekennzeichneten Angaben; ohne sie können wir das Anliegen nicht bearbeiten. Automatisierte Entscheidungen
        einschließlich Profiling im Sinne von Art. 22 DSGVO finden nicht statt. Die Prüfung und Freigabe von Projekten und Konten erfolgt durch
        Mitarbeitende.
      </p>

      <h2>17. Änderungen</h2>
      <p>
        Wir passen diese Erklärung an, wenn sich unsere Angebote oder die Rechtslage ändern. Es gilt die jeweils hier veröffentlichte Fassung.
        Stand: {STAND}.
      </p>
    </LegalShell>
  );
}

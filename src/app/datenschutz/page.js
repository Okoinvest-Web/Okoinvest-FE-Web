// src/app/datenschutz/page.js
//
// Datenschutzerklärung der ÖkoInvest GmbH (DSGVO, österreichisches DSG).
// Beschreibt die tatsächlich eingesetzten Verarbeitungen dieser Website:
// Hosting, Server-Logs, Anfragen (POST /api/anfrage -> Vorgang im ERP),
// Portal-Konto & Rollen, Anmeldung/Sitzungen/Geräte/2FA, Organisationen,
// Benachrichtigungen, CRM, Termine, Support, Dokumente, Projektbörse (NDA-
// Protokoll, Deal-Room, Datenraum), elektronische Unterschrift, Closing und
// Grundbuch, Rechner (lokal), KI-Assistent, KYC/KYB, Online-Identifizierung,
// Bonität, Register, Flächenakquise (Geodaten, Grundbuch, Brief), Energie-
// beschaffung, Finanzierung/Bank-Portal, Anlagen-Monitoring, Finanzen,
// Projektentwicklung/Gutachter, Live-Strommarktdaten (Energy-Charts,
// serverseitig), Cookie-Banner und Google Analytics 4 (nur nach Einwilligung,
// siehe src/components/Statistik/GoogleAnalytics.js und src/components/Cookies).
//
// ENTWURF zur datenschutzrechtlichen Prüfung (Stand Ausbaustufe 5).
// PLATZHALTER (sichtbar markiert, vor Livegang ersetzen):
//  - Datenschutzkontakt (E-Mail bzw. Datenschutzbeauftragter, falls bestellt)
//  - Hosting-Anbieter der Website und Betreiber/Standort des ERP-Systems
//  - Mailanbieter, Backup-Speicher, Server der Dienste (Geodaten, Messdaten)
//  - Identitätsanbieter, Auskunftei(en), Verrechnungsstelle Grundbuch/Firmenbuch
//  - Videokonferenzdienst für Beratungstermine
//  - Speicherfristen, die im Löschkonzept noch festzulegen sind
// Es werden bewusst KEINE abgeschlossenen AV-Verträge behauptet: Formulierungen
// „auf Grundlage eines Vertrags nach Art. 28 DSGVO“ beschreiben die Pflicht,
// die vor Einsatz des jeweiligen Anbieters erfüllt sein muss (GO-LIVE.md, Abschn. 9).
// TODO rechtlich prüfen: Löschfristen (Server-Logs, Anfragen ohne Vertrag,
// NDA-Protokolle, Akquise-Sperrliste, Monitoring) mit der tatsächlichen
// Konfiguration (site_config „oekoinvest_loeschfristen“) abgleichen;
// Rollenverteilung Identitätsanbieter (Auftragsverarbeiter oder eigener
// Verantwortlicher) und Verpflichtetenstellung nach GwG klären.

import Link from "next/link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, abs } from "@/data/site";

const PAGE_URL = abs("/datenschutz");
const TITEL = "Datenschutzerklärung | ÖkoInvest";
const BESCHREIBUNG =
  "Wie die ÖkoInvest GmbH personenbezogene Daten verarbeitet: Anfragen, Portal, Projektbörse, Signatur, Akquise, Energiebeschaffung, Finanzierung und Ihre Rechte.";

/** Datum der letzten inhaltlichen Überarbeitung */
const STAND = "30. September 2026";

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

/** Speicherfristen. Werte in eckigen Klammern sind im Löschkonzept noch festzulegen (Platzhalter). */
const FRISTEN = [
  ["Server-Logdaten", "in der Regel 14 Tage, bei Sicherheitsvorfällen bis zur Klärung"],
  ["Anfragen ohne Vertragsabschluss", "bis zu 3 Jahre nach der letzten Kommunikation, sofern Sie nicht früher die Löschung verlangen"],
  ["Portal-Konto", "für die Dauer der Registrierung; nach Löschung des Kontos Entfernung binnen 30 Tagen, soweit keine Aufbewahrungspflicht besteht"],
  ["Beendete Sitzungen und nicht angenommene Einladungen", "30 Tage"],
  ["Anmeldehistorie (erfolgreiche und fehlgeschlagene Anmeldungen)", "180 Tage"],
  ["Benachrichtigungen im Portal", "gelesene 12 Monate, alle übrigen höchstens 24 Monate"],
  ["NDA-Protokolle, Datenraum-Zugriffe und Exposé-Abrufe", "für die Dauer der Vertraulichkeitsverpflichtung zuzüglich der gesetzlichen Verjährungsfristen"],
  ["Signaturprotokolle und signierte Dokumente", "solange das zugrunde liegende Dokument aufzubewahren ist, mindestens bis zum Ablauf der Verjährungsfristen"],
  ["Termine", "Terminangaben bis zu 12 Monate nach dem Termin, soweit daraus kein Vorgang oder Vertrag entsteht; Verwaltungslinks werden mit dem Termin ungültig"],
  ["Support-Tickets", "bis zu 3 Jahre nach Abschluss des Tickets, soweit sie nicht zu einem Vertrag gehören"],
  ["Protokoll des KI-Assistenten (ohne Inhalte)", "12 Monate"],
  ["KYC/KYB-Unterlagen und Personenangaben", "5 Jahre ab Schluss des Kalenderjahres, in dem die Geschäftsbeziehung endet (abgelehnte Fälle ab Ablehnung)"],
  ["Bonitätsauskünfte", "[Platzhalter: bis zu 12 Monate nach Abschluss der Prüfung bzw. für die Dauer des Vertrags – wird im Löschkonzept festgelegt]"],
  ["Akquise: Eigentümerdaten aus dem Grundbuch ohne Rückmeldung", "12 Monate nach dem Anschreiben, danach Löschung"],
  ["Akquise: Sperrvermerk nach Widerspruch", "solange erforderlich, um den Widerspruch zu beachten (nur Name, Anschrift, Grundstücksbezug, Datum)"],
  ["Energiebeschaffung: Lastgänge, Abnahmestellen, Beschaffungsvollmacht", "für die Dauer des Beschaffungsauftrags; Vollmacht-Nachweis zuzüglich der Verjährungsfristen"],
  ["Bankenpaket und Abrufprotokolle der Banken", "für die Dauer der Finanzierungsanfrage bzw. des Kreditverhältnisses zuzüglich der Verjährungsfristen"],
  ["Messdaten der Anlagen (Monitoring)", "[Platzhalter: hochaufgelöste Werte z. B. 24 Monate, verdichtete Werte für die Vertragslaufzeit – wird im Löschkonzept festgelegt]"],
  ["Abrechnungsrelevante Zählerstände, Rechnungen, Gutschriften, Zahlungsläufe", "Österreich 7 Jahre (§ 132 BAO, § 212 UGB), bei Grundstücksbezug bis zu 22 Jahre; Deutschland bis zu 10 Jahre (§ 147 AO, § 257 HGB; Buchungsbelege nach aktuellem Stand 8 Jahre); Schweiz 10 Jahre (Art. 958f OR)"],
  ["Vertrags-, Provisions- und Buchhaltungsunterlagen", "7 Jahre nach § 132 BAO bzw. § 212 UGB, bei Grundstücksbezug ggf. länger; für deutsche und schweizerische Gesellschaften die dortigen Fristen (siehe oben)"],
  ["Grundbuch- und Dienstbarkeitsakten", "für die Laufzeit der Dienstbarkeit bzw. des Nutzungsvertrags zuzüglich der Verjährungsfristen"],
  ["Einwilligung (Cookie-Einstellungen)", "12 Monate, danach fragen wir erneut"],
  ["Google-Analytics-Cookies", "bis zu 2 Jahre bzw. bis zum Widerruf; Ereignisdaten in Google Analytics höchstens 14 Monate"],
];

export default function DatenschutzPage() {
  return (
    <LegalShell
      titel="Datenschutzerklärung"
      pfad="/datenschutz"
      lead="Welche personenbezogenen Daten wir auf dieser Website, im Portal, in der Projektbörse und in unseren Fachmodulen verarbeiten, wozu, auf welcher Rechtsgrundlage – und welche Rechte Sie haben."
    >
      <nav aria-label="Inhalt der Datenschutzerklärung" className="mb-10 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
        <p className="font-display text-[16px] font-bold text-ink-900">Schnellzugriff</p>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-2">
          <li><a href="#konto">Portal, Anmeldung und Teams (6–6g)</a></li>
          <li><a href="#boerse">Projektbörse, Signatur, Closing (7–7b)</a></li>
          <li><a href="#pruefungen">Identität, Bonität, Register (8b–8e)</a></li>
          <li><a href="#akquise">Flächenakquise und Grundbuch (8f)</a></li>
          <li><a href="#energie">Energiebeschaffung (8g)</a></li>
          <li><a href="#finanzierung">Finanzierung, Monitoring, Abrechnung (8h–8j)</a></li>
          <li><a href="#empfaenger">Empfänger (12)</a></li>
          <li><a href="#speicherdauer">Speicherdauer (13) und Ihre Rechte (14)</a></li>
        </ul>
      </nav>

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
      <p>
        Soweit Projektgesellschaften (z. B. Eigentümergesellschaften von Anlagen) oder andere Gesellschaften der ÖKOVOLT Gruppe Verträge mit
        Ihnen schließen – etwa als Rechnungsaussteller im Contracting oder als Pächterin einer Fläche –, sind sie für die Verarbeitung im Rahmen
        dieses Vertrags selbst verantwortlich; die ÖkoInvest GmbH betreibt die Plattform dann für sie. Welche Gesellschaft Ihr Vertragspartner
        ist, sehen Sie im Vertrag bzw. auf dem Beleg.
      </p>

      <h2>2. Grundsätze und Rechtsgrundlagen</h2>
      <p>
        Wir verarbeiten personenbezogene Daten nach der Datenschutz-Grundverordnung (DSGVO) und dem österreichischen Datenschutzgesetz (DSG) –
        nur, soweit es für den jeweiligen Zweck erforderlich ist. Rechtsgrundlagen sind insbesondere:
      </p>
      <ul>
        <li>
          <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Ihre Einwilligung (z. B. Google Analytics, Kontakt per Telefon oder E-Mail zu
          Werbezwecken); jederzeit mit Wirkung für die Zukunft widerrufbar.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Vertrag oder vorvertragliche Maßnahmen (Anfragen, Portal-Konto, Projektbörse, NDA,
          Energiebeschaffung, Abrechnung).
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> – rechtliche Verpflichtungen (z. B. unternehmensrechtliche und steuerliche Aufbewahrung,
          Sorgfaltspflichten zur Verhinderung von Geldwäsche, soweit sie für uns gelten).
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – berechtigte Interessen (sicherer Betrieb der Website, Nachweis von Vertraulichkeitsvereinbarungen
          und Unterschriften, Missbrauchsabwehr, Zuordnung von Anfragen, Suche geeigneter Flächen, Finanzierung eigener Projekte).
        </li>
        <li>
          <strong>Art. 9 Abs. 2 lit. a DSGVO</strong> – Ihre ausdrückliche Einwilligung, falls bei einer Online-Identifizierung biometrische Daten
          (Gesichtsabgleich) verarbeitet werden (Abschnitt 8c).
        </li>
      </ul>
      <p>
        Wo wir uns auf berechtigte Interessen stützen, haben wir eine Interessenabwägung vorgenommen; Sie können der Verarbeitung nach Art. 21
        DSGVO widersprechen (Abschnitt 14). Die Website wird ausschließlich verschlüsselt (TLS) ausgeliefert.
      </p>

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

      <h2 id="konto">6. Portal-Konto und Rollen</h2>
      <p>
        Für die Nutzung des Portals legen Sie ein Konto an. Wir verarbeiten dabei Ihre Registrierungsdaten (Name, E-Mail, ggf. Firma, Telefon
        und Anschrift), Ihre Rolle (z. B. Flächeneigentümer, Landwirt, Investor, Projektanbieter, Unternehmen, Mitglied oder Kommune),
        Zugangsdaten (Passwörter nur als kryptografischer Hash), Anmeldezeitpunkte sowie die Inhalte, die Sie im Portal hinterlegen: Flächen,
        Projekte, Suchprofile, Nachrichten und Dokumente. Für die Anmeldung setzen wir technisch notwendige Sitzungs-Cookies ein.
      </p>
      <p>
        Einige Rollen vergeben wir nur auf Einladung: <strong>Gutachter und Planer</strong> (für einen konkreten Auftrag in der
        Projektentwicklung), <strong>Energieversorger</strong> (für Angebotsanfragen der Energiebeschaffung) und <strong>Banken</strong> (für eine
        konkrete Finanzierungsanfrage). Für diese Konten verarbeiten wir zusätzlich die Einladung (eingeladene E-Mail-Adresse, Zeitpunkt,
        einladende Person) und die Zuordnung zu Auftrag, Ausschreibung bzw. Finanzierungsanfrage. Kommunen erhalten die Gemeinde-Sicht erst
        nach Prüfung ihres Anliegens; dort sehen sie nur vereinfachte Projektangaben ohne Eigentümer, Flurstücke oder Pachtkonditionen.
      </p>
      <p>
        Die Verarbeitung ist für die Bereitstellung des Portals erforderlich (Art. 6 Abs. 1 lit. b DSGVO). Zur Sicherheit protokollieren wir
        sicherheitsrelevante Ereignisse wie Anmeldungen und Rechteänderungen (Art. 6 Abs. 1 lit. f DSGVO). Welche Inhalte andere Nutzer sehen,
        hängt von Ihrer Rolle und Ihren Freigaben ab; Mitarbeitende der ÖkoInvest GmbH sehen die Daten, soweit sie diese für die Prüfung,
        Betreuung und Vermittlung benötigen. Intern ist der Zugriff nach Aufgabenbereichen (z. B. Akquise, Transaktion, Buchhaltung, Betrieb,
        Compliance, Energie, Projektleitung) beschränkt.
      </p>
      <p>
        Im Profil können Sie Ihre Daten jederzeit als Datei (JSON) exportieren und Ihr Konto löschen. Die Löschung anonymisiert Ihre
        Angaben und sperrt das Konto; Unterlagen mit gesetzlicher Aufbewahrungspflicht bleiben gesperrt erhalten, bis die Frist abläuft.
      </p>

      <h2>6a. Anmeldung, Sitzungen, Geräte und Zwei-Faktor-Anmeldung</h2>
      <p>
        Zum Schutz Ihres Kontos verarbeiten wir bei jeder Anmeldung und jeder aktiven Sitzung: Zeitpunkt, IP-Adresse, Browser und Betriebssystem
        (User-Agent), Anmeldeart (Passwort, E-Mail-Link, zweiter Faktor), Erfolg oder Fehlversuch sowie die letzte Aktivität (höchstens alle
        fünf Minuten aktualisiert). Unter <strong>Sicherheit</strong> im Portal sehen Sie Ihre aktiven Sitzungen, bekannten Geräte und die
        Anmeldehistorie und können Sitzungen beenden.
      </p>
      <ul>
        <li>
          <strong>Bekannte Geräte:</strong> Wir setzen ein Cookie mit einer zufälligen Gerätekennung; gespeichert wird bei uns nur deren Hash.
          Meldet sich jemand von einem neuen Gerät an, informieren wir Sie per Benachrichtigung und E-Mail. Diese Sicherheitsmeldungen lassen
          sich nicht abbestellen.
        </li>
        <li>
          <strong>Zwei-Faktor-Anmeldung (TOTP):</strong> Das Geheimnis für Ihre Authenticator-App speichern wir verschlüsselt,
          Wiederherstellungscodes nur als Hash. Die Authenticator-App selbst wählen Sie; sie erhält von uns keine Daten außer dem einmalig
          angezeigten QR-Code.
        </li>
        <li>
          <strong>Kontosperre:</strong> Nach wiederholten Fehlversuchen sperren wir die Anmeldung vorübergehend und informieren Sie.
        </li>
        <li>
          <strong>Passwortprüfung (optional):</strong> Ist sie aktiviert, prüfen wir neue Passwörter gegen den Dienst „Have I Been Pwned“. Dabei
          verlassen nur die ersten fünf Zeichen eines Hash-Werts unseren Server – weder Ihr Passwort noch Ihre E-Mail-Adresse.
        </li>
      </ul>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (sichere Bereitstellung des Kontos) und lit. f DSGVO (Abwehr unbefugter Zugriffe).
        Speicherdauer siehe Abschnitt 13.
      </p>

      <h2>6b. Organisationen und Teams</h2>
      <p>
        Sie können eine Organisation anlegen und Kolleginnen und Kollegen per E-Mail einladen. Wir verarbeiten dafür die eingeladene
        E-Mail-Adresse, die Teamrolle (Inhaber, Admin, Mitglied, Nur lesen), Zeitpunkt und einladende Person sowie Annahme oder Austritt.
        Mitglieder sehen die Objekte der Organisation (z. B. Flächen, Projekte, Interessen, Anlagen) im Umfang ihrer Teamrolle; Inhaber und
        Admins sehen die Mitgliederliste. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO gegenüber dem Konto der Organisation bzw. lit. f
        DSGVO (Zusammenarbeit im Team) gegenüber eingeladenen Personen.
      </p>

      <h2>6c. Benachrichtigungen und E-Mails</h2>
      <p>
        Über Ereignisse in Ihren Vorgängen (z. B. neue Nachricht, Statuswechsel, Fristen, Suchprofil-Treffer, Termine, Ausschreibungen)
        informieren wir Sie im Portal (Glocke) und – je nach Ihrer Einstellung unter „Benachrichtigungen“ – per E-Mail. E-Mails enthalten
        keine Nachrichtentexte und keine vertraulichen Projektdaten, nur einen Hinweis und einen Link ins Portal. Pflicht-E-Mails
        (Bestätigung der Adresse, Passwort, Anmelde-Link, Sicherheitshinweise, Bestätigungscodes für Unterschriften) versenden wir immer.
        Diese E-Mails dienen der Vertragsdurchführung (Art. 6 Abs. 1 lit. b DSGVO); Werbe-E-Mails versenden wir nur mit Ihrer Einwilligung.
        Für den Versand nutzen wir <Platzhalter>Mailanbieter bzw. eigener Mailserver, Standort</Platzhalter>.
      </p>

      <h2>6d. Kundenverwaltung, Aufgaben und Aktivitätsprotokoll</h2>
      <p>
        Kontakte und Organisationen aus Anfragen, Registrierungen, Veranstaltungen oder öffentlichen Quellen (z. B. Gemeinden, Behörden,
        Netzbetreiber) führen wir in einer Kundenverwaltung mit Aktivitäten, Wiedervorlagen und Zuständigkeiten. Automatische Regeln helfen
        dem Team bei der Priorisierung (z. B. „Großfläche“, „Kommunale Anfrage“); sie treffen keine Entscheidungen über Sie. Wichtige Aktionen
        im Portal – etwa Statuswechsel, Freigaben, Downloads und Exporte – schreiben wir in ein Aktivitätsprotokoll, das durch eine
        Hash-Kette gegen nachträgliche Veränderung gesichert ist. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO (Bearbeitung,
        Nachweisbarkeit, Missbrauchsaufklärung).
      </p>

      <h2>6e. Terminbuchung</h2>
      <p>
        Termine (z. B. Flächenbesichtigung, Beratung per Telefon oder Video, Gemeindetermin, Datenraum-Session) können Sie im Portal oder
        ohne Konto über die Seite „Termin vereinbaren“ buchen. Wir verarbeiten Name, E-Mail, ggf. Telefon (Pflicht beim Rückruf), Firma
        bzw. Gemeinde, PLZ und Ort, Terminart, Zeitpunkt, Ihre Nachricht und die zuständige Person. Sie erhalten eine Bestätigung mit
        Kalenderdatei (ICS) und eine Erinnerung 24 Stunden vorher. Zum Umbuchen oder Absagen senden wir einen <strong>persönlichen
        Einmal-Link</strong>; die zugehörige Seite ist nicht für Suchmaschinen freigegeben und übergibt keine Verweisadresse an Dritte. Wer
        den Link kennt, kann den Termin verwalten – bitte leiten Sie ihn nicht weiter. Für Videotermine nutzen wir{" "}
        <Platzhalter>Videokonferenzdienst und Anbieter</Platzhalter>. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO; bei der Buchung ohne
        Konto bestätigen Sie, dass wir Ihre Angaben dafür verarbeiten und Ihnen Bestätigung und Erinnerung senden.
      </p>

      <h2>6f. Support-Anfragen</h2>
      <p>
        Anliegen im Bereich „Support“ speichern wir als Ticket mit Betreff, Beschreibung, Anhängen, Verlauf, Zuständigkeit und Bearbeitungsfristen.
        Mitarbeitende können interne Notizen ergänzen, die Sie nicht sehen. Störungen Ihrer Anlage können automatisch ein Ticket erzeugen.
        Soweit eingesetzt, verwalten wir Tickets im Modul „Helpdesk“ unseres ERP-Systems (Abschnitt 12). Rechtsgrundlage: Art. 6 Abs. 1
        lit. b DSGVO.
      </p>

      <h2>6g. Dokumente und Ablage</h2>
      <p>
        Dokumente, die Sie hochladen oder die wir Ihnen bereitstellen, speichern wir im ERP-System außerhalb des öffentlich erreichbaren
        Bereichs; der Dateityp wird beim Hochladen geprüft. Für die interne Zusammenarbeit können Dokumente zusätzlich in die Dokumentenablage
        des ERP-Systems (Frappe Drive) gespiegelt werden; wer ein Dokument sehen darf, bestimmt weiterhin die Plattform. Unterlagen der
        Identitätsprüfung sind davon ausgenommen bzw. nur verschlüsselt und getrennt abgelegt. Interne Wissensartikel des Teams sind für
        Kunden nie sichtbar.
      </p>

      <h2 id="boerse">7. Projektbörse: Exposés, NDA, Deal-Room und Datenraum</h2>
      <p>
        In der öffentlichen <Link href="/projektboerse">Projektbörse</Link> erscheinen nur anonymisierte Exposé-Teaser ohne Personenbezug. Details
        und Unterlagen sind erst nach Anmeldung und Abschluss einer Vertraulichkeitsvereinbarung (NDA) zugänglich.
      </p>
      <ul>
        <li>
          <strong>NDA-Protokoll:</strong> Beim Abschluss eines NDA speichern wir Name, Firma, E-Mail, das betroffene Projekt, die Version des
          NDA-Textes, den <strong>Zeitstempel</strong> und die <strong>IP-Adresse</strong>. Das Protokoll dient dem Nachweis, wer wann welcher
          Vertraulichkeitsverpflichtung zugestimmt hat (Art. 6 Abs. 1 lit. b und f DSGVO). Entsprechend protokollieren wir die Zustimmung zur
          Provisionsvereinbarung (Zeitpunkt, IP-Adresse, Textversion).
        </li>
        <li>
          <strong>Datenraum:</strong> Wir protokollieren, welches Konto wann welche Dokumente aufgerufen oder heruntergeladen hat. Das schützt die
          vertraulichen Unterlagen der Anbieter und ermöglicht die Aufklärung von Verstößen (Art. 6 Abs. 1 lit. f DSGVO).
        </li>
        <li>
          <strong>Kennzeichnung von Unterlagen:</strong> Das vertrauliche Exposé nennt auf jeder Seite den Empfänger (Name, E-Mail, Zeitpunkt);
          heruntergeladene Datenraum-Dateien tragen Empfänger und Datum im Dateinamen. So lässt sich die Herkunft weitergegebener Unterlagen
          nachvollziehen.
        </li>
        <li>
          <strong>Deal-Room (Fragen und Antworten, Bieterverfahren):</strong> Fragen, Antworten und Gebote werden vom Backoffice moderiert. Bis zur
          Kontaktfreigabe sehen Anbieter Investoren nur unter einem Pseudonym (z. B. „Investor A“) und Investoren den Anbieter nur als
          „Anbieter“. Aus Freitexten entfernen wir automatisch E-Mail-Adressen, Links und Telefonnummern; das Original sieht nur das
          Backoffice. Gebote (Preis, Bedingungen, Finanzierung, Zeitplan, ggf. Finanzierungsnachweis) sind verdeckt: Andere Bieter sehen sie
          nie. Der Anbieter sieht das Zugriffsprotokoll auf seinen Datenraum nur pseudonym.
        </li>
        <li>
          <strong>Absichtserklärung (LOI):</strong> Angaben zu Preis, Struktur, Bedingungen und Finanzierung speichern wir zum Interesse und
          geben sie im Rahmen der Anbahnung an den Anbieter weiter (Art. 6 Abs. 1 lit. b DSGVO).
        </li>
        <li>
          <strong>Private Arbeitsmittel:</strong> Notizen, Tags und Suchprofile in Ihrer Deal-Pipeline sind nur für Sie sichtbar. Suchprofile
          nutzen wir, um Ihnen passende Projekte zu melden (Passungswert); das ist eine Empfehlung, keine Entscheidung über Sie.
        </li>
        <li>
          <strong>Weitergabe im Vermittlungsprozess:</strong> Bekunden Sie Interesse an einem Projekt oder schließen Sie ein NDA ab, erfährt der
          Anbieter des Projekts Ihren Namen, Ihre Firma und Ihre Kontaktdaten, soweit dies für die Anbahnung erforderlich ist – im Deal-Room
          erst mit der Kontaktfreigabe. Umgekehrt erhalten Investoren nach NDA die Angaben, die der Anbieter für sein Projekt freigegeben hat
          (Art. 6 Abs. 1 lit. b DSGVO).
        </li>
        <li>
          <strong>Dokumente der Anbieter:</strong> Projektunterlagen können personenbezogene Daten Dritter enthalten (z. B. Grundstückseigentümer in
          Grundbuchauszügen oder Pachtverträgen). Anbieter sind dafür verantwortlich, solche Daten nur einzustellen, wenn sie dazu berechtigt
          sind, und sie soweit möglich zu schwärzen (siehe <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>).
        </li>
      </ul>

      <h2>7a. Elektronische Unterschrift</h2>
      <p>
        Bestimmte Dokumente (z. B. NDA, Provisionsvereinbarung, Pacht-Absichtserklärung, Gutachterauftrag, Beschaffungsvollmacht) können Sie im
        Portal elektronisch unterschreiben. Es handelt sich um eine <strong>einfache elektronische Signatur</strong>; wir setzen dafür keinen
        externen Signaturdienst ein. Verarbeitet werden Name und E-Mail der Unterzeichnenden, die gezeichnete Unterschrift als Bild oder der
        getippte Name, ein per E-Mail gesandter Bestätigungscode, der Zustimmungstext, Zeitpunkt, <strong>IP-Adresse</strong>,{" "}
        <strong>Browser (User-Agent)</strong> sowie <strong>Prüfsummen (SHA-256)</strong> des Dokuments vor und nach jeder Unterschrift, dazu
        Reihenfolge, Erinnerungen, Widerruf oder Ablehnung mit Grund.
      </p>
      <p>
        Nach der letzten Unterschrift erhält das Dokument eine angehängte Prüfseite mit diesen Protokollangaben. Sie ist für alle Unterzeichnenden
        und alle, die das Dokument später rechtmäßig erhalten (z. B. Vertragspartner, Notar, finanzierende Bank), sichtbar. Zweck ist der
        Nachweis, wer wann welches unveränderte Dokument unterschrieben hat. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsschluss)
        und lit. f DSGVO (Beweissicherung).
      </p>

      <h2>7b. Vertragsabschluss (Closing), Grundbuch und Dienstbarkeiten</h2>
      <p>
        Für den Abschluss eines Projektkaufs führen wir einen Closing-Raum mit Kaufpreis, Zahlungsmeilensteinen, Bedingungen,
        Verantwortlichen, Nachweisen und Notartermin. Voraussetzung ist die abgeschlossene Identitätsprüfung beider Seiten (Abschnitt 8b).
        Käufer und Verkäufer sehen einander erst nach der Kontaktfreigabe namentlich. Empfänger sind – soweit für den Abschluss nötig – die
        andere Vertragspartei, der beauftragte Notar bzw. die Urkundsperson, ein Treuhänder und finanzierende Banken.
      </p>
      <p>
        Zur dinglichen Sicherung von Anlagen (Dienstbarkeit, Servitut, Baurecht) führen wir je Grundstück bzw. Dach eine Grundbuch-Akte mit
        Eigentümern und Miteigentümern, Grundstücksbezeichnung, Belastungen (einschließlich Grundpfandgläubigern, deren Rangrücktritt nötig
        ist), Vertrags- und Beglaubigungsstand, Aktenzeichen bzw. Tagebuchzahl und Grundbuchauszug. Empfänger sind Notare, Grundbuchgerichte
        bzw. -ämter, betroffene Grundpfandgläubiger und die finanzierende Bank. Eigentümer sehen ihre eigene Akte im Portal. Rechtsgrundlage:
        Art. 6 Abs. 1 lit. b DSGVO (Nutzungsvertrag) und lit. c DSGVO (grundbuchrechtliche Formvorschriften).
      </p>

      <h2>8. Rechner und Werkzeuge</h2>
      <p>
        Unsere <Link href="/rechner">Rechner</Link> (z. B. Pacht-, Agri-PV-, Solarpark-, Projektbewertungs- und Reststrom-Rechner) rechnen
        <strong> lokal in Ihrem Browser</strong>. Ihre Eingaben werden dabei nicht an uns übertragen und nicht gespeichert. Erst wenn Sie ein
        Ergebnis ausdrücklich mit einer Anfrage an uns senden, verarbeiten wir es wie in Abschnitt 5 beschrieben.
      </p>
      <p>
        Im Portal können Sie Bewertungen und Finanzierungsszenarien (Bewertungswerkzeug, Finanzierungscockpit) speichern. Diese Szenarien sind
        Ihrem Konto zugeordnet und für andere Nutzer nicht sichtbar (Art. 6 Abs. 1 lit. b DSGVO).
      </p>

      <h2>8a. KI-Assistent im Portal (optional)</h2>
      <p>
        Im Portal können Sie optional einen Assistenten nutzen: Exposé-Entwürfe, Zusammenfassung von Anfragen, Fragen zu freigegebenen
        Projektunterlagen, Erläuterungen zu Ihrer Fläche und Entwürfe für Nachrichten. Ist der KI-Modus aktiviert, übermitteln wir nur die für
        die jeweilige Aufgabe erforderlichen und für Sie freigegebenen Angaben an den Dienst Claude der Anthropic PBC (USA) bzw. deren
        Vertragspartner als Auftragsverarbeiter – Projektdaten, Angaben zu Ihrer Fläche, den Nachrichtenverlauf zum jeweiligen Vorgang und Ihre
        Frage. <strong>Nicht übermittelt werden E-Mail-Adressen, Telefonnummern und IP-Adressen.</strong> Rechtsgrundlage ist Art. 6 Abs. 1
        lit. b DSGVO (Nutzung des Portals) bzw. lit. f DSGVO (effiziente Bearbeitung). Für die Übermittlung in die USA gelten{" "}
        <mark>[EU-US Data Privacy Framework bzw. Standardvertragsklauseln – wird juristisch festgelegt]</mark>. Die Ergebnisse sind Entwürfe,
        die ein Mensch prüft; es findet keine automatisierte Entscheidung im Sinne von Art. 22 DSGVO statt.
      </p>
      <p>
        <strong>Protokoll:</strong> Wir speichern, welches Konto wann welche Assistenzfunktion zu welchem Objekt genutzt hat, sowie technische
        Verbrauchswerte – <strong>keine Fragen, Eingaben oder Antworten</strong>. Zweck: Missbrauchsschutz, Tages-Kontingent und
        Kostenkontrolle. Speicherdauer: <mark>[12 Monate – wird festgelegt]</mark>. Ohne KI-Modus arbeitet der Assistent regelbasiert; Ihre
        Angaben verlassen die Plattform dabei nicht.
      </p>

      <h2 id="pruefungen">8b. Identitäts- und Firmenprüfung (KYC/KYB)</h2>
      <p>
        Bevor Sie den Datenraum nutzen, Absichtserklärungen oder Gebote abgeben, Projekte veröffentlichen, Pachtzahlungen erhalten oder
        Contracting-Verträge schließen, prüfen wir Ihre Identität bzw. die Ihres Unternehmens, die wirtschaftlich Berechtigten, eine mögliche
        Stellung als politisch exponierte Person sowie einen Abgleich mit Sanktionslisten der EU. Verarbeitet werden Name, Geburtsdatum und
        -ort, Staatsangehörigkeit, Anschrift, Ausweisdaten und -kopie, Registerauszüge, Angaben zu wirtschaftlich Berechtigten und Vertretern,
        Herkunft der Mittel, Bankverbindung und Eigentumsnachweise.
      </p>
      <p>
        <strong>Rechtsgrundlage</strong> ist Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit dem Geldwäschegesetz bzw. den entsprechenden
        Vorschriften in Österreich und der Schweiz, soweit wir dazu verpflichtet sind; im Übrigen Art. 6 Abs. 1 lit. b DSGVO
        (Vertragsanbahnung und -durchführung, z. B. Auszahlungen) und lit. f DSGVO (berechtigtes Interesse, Betrug und Geldwäsche auf der
        Plattform zu verhindern). <strong>Speicherdauer:</strong> fünf Jahre ab Schluss des Kalenderjahres, in dem die Geschäftsbeziehung
        endet, danach Löschung. <strong>Empfänger:</strong> ausschließlich die Compliance-Mitarbeiter der ÖkoInvest GmbH, unser technischer
        Dienstleister (Auftragsverarbeitung), bei einer Online-Identifizierung der beauftragte, zugelassene Identifizierungsanbieter und bei
        gesetzlicher Pflicht Behörden. Unterlagen werden <strong>verschlüsselt</strong> gespeichert, jeder Zugriff wird protokolliert. Bitte
        schwärzen Sie auf Ausweiskopien nicht benötigte Angaben (Hinweis im Portal). Ohne die Angaben können wir die genannten Schritte nicht
        freigeben. Eine automatisierte Entscheidung im Sinne von Art. 22 DSGVO findet nicht statt; der Sanktionsabgleich liefert nur
        Hinweise, entschieden wird durch Menschen.
      </p>

      <h2>8c. Online-Identifizierung über externe Anbieter</h2>
      <p>
        Statt Ausweiskopie und manueller Prüfung können Sie sich – sofern angeboten – online über einen spezialisierten Identifizierungsanbieter
        ausweisen: <Platzhalter>Anbieter noch nicht festgelegt, z. B. Veriff (Estland), Sumsub oder IDnow (Deutschland); Name, Sitz, Speicherort</Platzhalter>.
        Sie werden dazu auf die Seite des Anbieters geleitet. Dieser erfasst Bilder Ihres Ausweises und je nach Verfahren ein Foto oder Video
        Ihres Gesichts, prüft die Echtheit des Dokuments und vergleicht das Gesicht mit dem Ausweisfoto. Uns meldet er das Ergebnis
        (bestanden, abgelehnt, zu prüfen) und die ausgelesenen Ausweisdaten; die Meldung wird signiert übertragen und dem KYC-Fall zugeordnet.
      </p>
      <p>
        Der Gesichtsabgleich verarbeitet <strong>biometrische Daten</strong> (Art. 9 DSGVO). Er findet nur mit Ihrer <strong>ausdrücklichen
        Einwilligung</strong> statt (Art. 9 Abs. 2 lit. a DSGVO), die Sie vor Beginn geben und jederzeit widerrufen können; ohne Einwilligung
        steht Ihnen die Prüfung mit Ausweiskopie offen. Ob der Anbieter als unser Auftragsverarbeiter (Art. 28 DSGVO) tätig wird oder für Teile
        der Verarbeitung – etwa eigene Betrugsprävention oder gesetzliche Pflichten – selbst verantwortlich ist, richtet sich nach dem Vertrag
        mit dem Anbieter; <Platzhalter>Rollenverteilung und Link zu den Datenschutzhinweisen des Anbieters</Platzhalter>. Wir informieren Sie
        darüber vor Beginn der Prüfung.
      </p>
      <p>
        Unabhängig davon können Sie die maschinenlesbare Zone Ihres Ausweises zur <strong>automatischen Vorprüfung</strong> eingeben. Die
        Prüfziffern werden zuerst in Ihrem Browser geprüft; erst auf Ihren Klick senden wir die Zeile an unseren Server, der die Prüfung
        wiederholt und mit Ihren Angaben abgleicht. Gespeichert wird nur das Ergebnis.
      </p>

      <h2>8d. Bonitätsauskünfte</h2>
      <p>
        Bevor Sie eine Absichtserklärung oder ein verbindliches Gebot abgeben oder einen Vertrag mit finanziellem Ausfallrisiko schließen (z. B.
        Kauf eines Projekts, Contracting), kann das Backoffice eine Bonitätsauskunft über Ihr Unternehmen einholen. Übermittelt werden dafür
        Firma, Anschrift, Register- bzw. Firmenbuchnummer und – bei Einzelunternehmen, Personengesellschaften oder wenn es auf die Person
        ankommt – Name, Anschrift und Geburtsdatum. Die Auskunftei übermittelt uns Bonitätsindex bzw. Rating, Zahlungserfahrungen und
        Registerangaben. Auskunfteien: <Platzhalter>noch nicht festgelegt, z. B. KSV1870 (Österreich), Creditreform (Deutschland), CRIF (Österreich/Deutschland/Schweiz)</Platzhalter>.
        Die Auskunftei ist für ihre eigene Datenverarbeitung selbst verantwortlich und informiert über diese in ihren Datenschutzhinweisen.
      </p>
      <p>
        <strong>Rechtsgrundlage</strong> ist unser berechtigtes Interesse, uns und die Vertragspartner auf der Plattform vor Zahlungsausfällen zu
        schützen (Art. 6 Abs. 1 lit. f DSGVO), bzw. die Vertragsanbahnung (lit. b). Wir holen Auskünfte nur bei konkreter Vertragsanbahnung
        mit wirtschaftlichem Risiko ein, dokumentieren den Anlass und <strong>informieren Sie vor der Abfrage</strong> (Art. 14 DSGVO) – ohne
        Ihnen das Ergebnis vorwegzunehmen. Über die Freigabe entscheidet ein Mensch mit schriftlicher Begründung; eine Ablehnung allein
        aufgrund eines Scores gibt es nicht (keine automatisierte Entscheidung im Sinne von Art. 22 DSGVO). Sie können Ihren Standpunkt darlegen
        und eine erneute Prüfung verlangen.
      </p>

      <h2>8e. Registerabrufe und Gründung von Projektgesellschaften</h2>
      <p>
        Zur Prüfung von Unternehmen rufen wir Angaben aus öffentlichen Registern ab – Firmenbuch (Österreich), Handelsregister und
        Unternehmensregister (Deutschland), Zefix bzw. UID-Register (Schweiz) sowie, soweit wir berechtigt sind, Register der wirtschaftlichen
        Eigentümer (WiEReG-Register, Transparenzregister). Abgerufen werden Firma, Sitz, Rechtsform, Registernummer, vertretungsbefugte Personen,
        Gesellschafter und ggf. wirtschaftlich Berechtigte. Der Abruf wird mit Datum im KYC-Fall hinterlegt. Herkunft dieser Daten sind die
        genannten öffentlichen Register (Art. 14 Abs. 2 lit. f DSGVO); Rechtsgrundlage ist Art. 6 Abs. 1 lit. c bzw. f DSGVO. Abrufe beim
        österreichischen Firmenbuch können über eine Verrechnungsstelle erfolgen: <Platzhalter>Verrechnungsstelle</Platzhalter>.
      </p>
      <p>
        Für die Gründung eigener Projektgesellschaften verarbeiten wir die Daten der künftigen Gesellschafter, Geschäftsführer und
        wirtschaftlich Berechtigten und übermitteln sie – soweit gesetzlich vorgesehen – an Notariat, Firmenbuch bzw. Handelsregister,
        Finanzamt, Register der wirtschaftlichen Eigentümer und die kontoführende Bank (Art. 6 Abs. 1 lit. b und c DSGVO).
      </p>

      <h2 id="akquise">8f. Flächenakquise: Geodaten, Grundbuch und postalische Erstansprache</h2>
      <p>
        Um geeignete Flächen für Photovoltaik-Freiflächen- und Agri-PV-Anlagen zu finden, werten wir <strong>öffentliche Geodaten</strong> aus –
        amtlicher Kataster (ohne Eigentümerangaben), landwirtschaftliche Schläge, Gelände, Schutzgebiete, Siedlungsabstände und die Entfernung zu
        Umspannwerken aus offenen Daten. Diese Auswertung enthält <strong>keine Angaben zu Personen</strong>; sie bewertet Grundstücke nach
        technischen und planerischen Kriterien.
      </p>
      <p>
        Erscheint eine Fläche geeignet, ermitteln wir die Eigentümer über eine <strong>Grundbuchabfrage</strong>. Wir fragen ausschließlich nach
        dem Grundstück (Katastralgemeinde bzw. Gemarkung und Grundstücksnummer), nie nach einer Person, und nur über den amtlichen Zugang bzw.
        eine zugelassene Verrechnungsstelle (<Platzhalter>Verrechnungsstelle bzw. Zugangsweg je Land</Platzhalter>). In Deutschland und der
        Schweiz erfolgt eine Einsicht nur, soweit die dortigen Vorschriften sie zulassen. Jede Abfrage wird mit Zweck, Person und Grundstück
        protokolliert. Verarbeitet werden Name, Anschrift und Eigentumsanteil der Eigentümer sowie die Grundstücksangaben.
      </p>
      <p>
        <strong>Zweck</strong> ist eine einmalige, postalische Kontaktaufnahme mit dem Angebot, die Fläche für eine Solaranlage zu pachten oder
        anderweitig zu nutzen. <strong>Rechtsgrundlage</strong> ist unser berechtigtes Interesse an der Standortsuche für erneuerbare Energie
        und an der Direktansprache möglicher Vertragspartner (Art. 6 Abs. 1 lit. f DSGVO); wir halten die Ansprache auf das Nötigste begrenzt.
        Das Anschreiben enthält die Informationen nach <strong>Art. 14 DSGVO</strong> – Verantwortlicher, Zweck, Rechtsgrundlage,{" "}
        <strong>Herkunft der Daten (Grundbuch)</strong>, Speicherdauer und Ihre Rechte – sowie einen deutlichen Hinweis auf Ihr
        Widerspruchsrecht. Grundstücksangaben sind von außen nicht sichtbar.
      </p>
      <ul>
        <li>Wir schreiben Sie <strong>einmal per Brief</strong> an; ohne Rückmeldung folgen keine weiteren Zusendungen.</li>
        <li>
          Anrufe, E-Mails oder SMS erhalten Sie von uns <strong>nur mit Ihrer vorherigen Einwilligung</strong>.
        </li>
        <li>
          <strong>Widerspruch:</strong> Sie können jederzeit ohne Angabe von Gründen widersprechen (Art. 21 Abs. 2 DSGVO) – formlos per Brief
          oder über das <Link href="/kontakt">Kontaktformular</Link>. Wir nehmen Sie dann sofort in unsere <strong>Sperrliste</strong> auf und
          verwenden Ihre Daten nicht mehr zur Ansprache. Auf der Sperrliste behalten wir nur Name, Anschrift, Grundstücksbezug und Datum, damit
          Sie nicht erneut angeschrieben werden.
        </li>
        <li>
          Melden Sie sich nicht, löschen wir die Eigentümerdaten 12 Monate nach dem Anschreiben. Zeigen Sie Interesse, führen wir Ihre Daten als
          Anfrage weiter (Abschnitt 5).
        </li>
      </ul>
      <p>
        Gemeinden, Behörden und Netzbetreiber sprechen wir als Organisationen an; dabei verarbeiten wir die dienstlichen Kontaktdaten der
        zuständigen Personen aus öffentlichen Quellen oder aus bisherigem Kontakt (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2 id="energie">8g. Energiebeschaffung und Versorger-Ausschreibung</h2>
      <p>
        Beauftragen Sie uns mit dem Einkauf Ihres Stroms, verarbeiten wir die Stammdaten Ihrer Abnahmestellen (Anschrift, Markt- und
        Messlokation bzw. Zählpunktnummer, Netzbetreiber, Spannungsebene, Messart), Ihren Verbrauch und <strong>Lastgang</strong>
        (Viertelstundenwerte), Angaben zu eigener PV und Speicher, Ihre laufenden Lieferverträge (Lieferant, Preise, Laufzeit, Kündigungsfrist)
        sowie Angebote, Vergleiche, Freigaben und Zuschläge. Lastgänge von Kapitalgesellschaften sind in der Regel keine personenbezogenen
        Daten, bei Einzelunternehmen oder Personengesellschaften können sie es sein; wir behandeln sie in jedem Fall als Geschäftsgeheimnis.
      </p>
      <ul>
        <li>
          <strong>Beschaffungsvollmacht:</strong> Ihre Zustimmung speichern wir mit Textversion, Zeitpunkt, IP-Adresse und Browser, auf Wunsch
          zusätzlich mit elektronischer Unterschrift (Abschnitt 7a). Sie können die Vollmacht im Portal widerrufen.
        </li>
        <li>
          <strong>Anonymisierte Weitergabe an Energieversorger:</strong> In der Angebotsanfrage erhalten die eingeladenen Versorger nur ein
          Los-Kennzeichen, gerundete Kennzahlen (Jahresmenge, Lastspitze), ein normiertes Wochenprofil, Monatsanteile, Land, Spannungsebene und
          Messart – <strong>keinen Namen, keine Anschrift, keine Lokations-IDs und keine Zeitreihe</strong>. Werden mehrere Kunden gebündelt
          (Pool), gilt das für alle Beteiligten.
        </li>
        <li>
          <strong>Nach Zuschlag:</strong> Erst nach Ihrer ausdrücklichen Freigabe im Portal übermitteln wir dem ausgewählten Versorger Firma,
          Anschrift, Ansprechpartner und Lokations-IDs, damit er den Liefervertrag schließen und den Lieferantenwechsel durchführen kann; dabei
          erfährt Ihr bisheriger Lieferant von der Kündigung.
        </li>
        <li>
          <strong>Laufende Wechselanalyse:</strong> Wir vergleichen Ihren Vertrag mit Marktpreisen und erinnern Sie an Kündigungsfristen. Die
          Empfehlung ist ein Vorschlag; entschieden wird durch Sie.
        </li>
        <li>
          <strong>Energieversorger als Nutzer:</strong> Von eingeladenen Versorgern verarbeiten wir Firma, Ansprechpartner, Angebote,
          Teilnahmehistorie, Firmenprüfung und eine interne Bewertung der Zusammenarbeit (Art. 6 Abs. 1 lit. b und f DSGVO).
        </li>
      </ul>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Beschaffungsauftrag); für Versorger lit. b bzw. f DSGVO. Die Markt-Preisdaten beziehen
        wir serverseitig (Abschnitt 9) bzw. aus lizenzierten Quellen; sie enthalten keine Angaben zu Ihnen.
      </p>

      <h2 id="finanzierung">8h. Finanzierung eigener Projekte und Bank-Portal</h2>
      <p>
        Projekte, die wir oder unsere Projektgesellschaften selbst betreiben, finanzieren wir teilweise über Banken. Dafür stellen wir ein{" "}
        <strong>Bankenpaket</strong> zusammen (z. B. Projektsteckbrief, Finanzmodell, Ertragsgutachten, Verträge, Genehmigungen) und übermitteln
        es an die <strong>Banken, die wir anfragen</strong>. Die Banken erhalten einen persönlichen, befristeten Einladungslink und sehen im
        Bank-Portal nur die Anfragen ihres Hauses und nur die Bausteine, die wir freigegeben haben; jeder Abruf wird protokolliert.
      </p>
      <p>
        Das Bankenpaket kann personenbezogene Daten Dritter enthalten, insbesondere von <strong>Flächen- und Dacheigentümern</strong> (Pacht- oder
        Nutzungsvertrag, Dienstbarkeit, Grundbuchauszug) und Vertragspartnern (z. B. Stromabnehmer im Contracting). Wir geben nur weiter, was die
        Bank für ihre Kreditentscheidung und Besicherung benötigt, und schwärzen darüber hinausgehende Angaben. Rechtsgrundlage ist unser
        berechtigtes Interesse an der Finanzierung der Anlage (Art. 6 Abs. 1 lit. f DSGVO) bzw. die Durchführung des Nutzungsvertrags, der eine
        Besicherung vorsieht (lit. b). Die Banken sind für ihre eigene Verarbeitung selbst verantwortlich.
      </p>
      <p>
        Von Bank-Nutzern verarbeiten wir Name, dienstliche Kontaktdaten, Rückfragen, Term Sheets und Absagen (Art. 6 Abs. 1 lit. b und f DSGVO).
        Während der Kreditlaufzeit berichten wir der Bank Kennzahlen (z. B. Schuldendienstdeckung) aus den Ertragsdaten der Anlage – aggregiert,
        ohne Verbrauchsdaten einzelner Stromabnehmer.
      </p>

      <h2>8i. Anlagen-Monitoring im Contracting</h2>
      <p>
        Betreiben wir eine Anlage bei Ihnen (Contracting), erfassen Datenlogger vor Ort laufend technische Messwerte: Erzeugung und Leistung,
        Zählerstände für Netzbezug und Einspeisung, Verbrauch vor Ort, Ladezustand und Leistung eines Speichers, Status- und Fehlermeldungen.
        Verbrauchswerte können Rückschlüsse auf Betriebszeiten zulassen und sind bei Einzelunternehmen personenbezogen. Zwecke: Betrieb und
        Wartung, Störungserkennung und -meldung, Ihre Übersicht „Mein Solarstrom“ und – ausschließlich aus geeichten Zählern – die Abrechnung.
        Die Messwerte werden verschlüsselt übertragen und in einer eigenen Zeitreihendatenbank gespeichert (<Platzhalter>Betreiber und Standort
        des Messdaten-Servers</Platzhalter>). Zugriff haben Sie bzw. die Mitglieder Ihrer Organisation und unser Betriebsteam. Rechtsgrundlage:
        Art. 6 Abs. 1 lit. b DSGVO (Contracting-Vertrag).
      </p>

      <h2>8j. Finanzen, Abrechnung und Auszahlungen</h2>
      <p>
        Für Pachtzahlungen (Gutschriften), Contracting-Rechnungen und Provisionsrechnungen verarbeiten wir Name bzw. Firma, Anschrift,
        UID-Nummer, Vertragsdaten, Abrechnungszeiträume, Mengen, Beträge, Zahlungsstatus und Mahnhinweise sowie Ihre <strong>Bankverbindung
        (IBAN, BIC, Kontoinhaber)</strong>. Die Bankverbindung für Auszahlungen übernehmen wir ausschließlich aus der geprüften Verifizierung
        (Abschnitt 8b). Auszahlungen erstellen wir als SEPA-Datei, die unsere Bank ausführt; die Bank erhält dafür Empfänger, IBAN, Betrag und
        Verwendungszweck. Von der Datei selbst speichern wir nur eine Prüfsumme.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag) und lit. c DSGVO (Buchführungs- und Aufbewahrungspflichten). Buchhaltungsdaten
        werden – soweit eingesetzt – im Finanzmodul unseres ERP-Systems geführt. Empfänger sind unsere Bank, Steuerberatung und
        Wirtschaftsprüfung sowie Finanzbehörden. Aufbewahrung: in Österreich 7 Jahre (§ 132 BAO, § 212 UGB), bei Grundstücksbezug bis zu 22
        Jahre; für deutsche Gesellschaften bis zu 10 Jahre (§ 147 AO, § 257 HGB); für schweizerische Gesellschaften 10 Jahre (Art. 958f OR).
      </p>

      <h2>8k. Projektentwicklung, Gutachter und Planer</h2>
      <p>
        Für die Entwicklung von Projekten bis zur Baureife führen wir Projektakten mit Flächen, Meilensteinen, Risiken, Kosten, Entscheidungen
        und Beteiligten. Darin verarbeiten wir Daten der Flächeneigentümer, dienstliche Kontaktdaten von Behörden, Gemeinden, Netzbetreibern und
        weiteren Beteiligten sowie von <strong>Gutachtern und Planern</strong>. Gutachter laden wir per E-Mail zu einem konkreten Auftrag ein;
        sie sehen nur die ihnen zugewiesenen Aufgaben und Unterlagen, und wir speichern ihre Kontaktdaten, Qualifikationsnachweise, Uploads und
        Rückfragen. Flächeneigentümer sehen eine vereinfachte Sicht ihres Projekts; Investoren in einer Co-Entwicklung sehen nur ausdrücklich
        freigegebene Angaben. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO. Informationen zur Verarbeitung von Beschäftigtendaten (z. B.
        Zeiterfassung, Vertretungen) erhalten unsere Mitarbeitenden gesondert.
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
      <p>Im Portal verwenden wir folgende technisch notwendige Cookies:</p>
      <ul>
        <li>
          <strong>„oi_sitzung“</strong> – Ihre Anmeldung (signierte Sitzungskennung, bis zu 7 Tage bzw. bis zur Abmeldung),
        </li>
        <li>
          <strong>„oi_2fa“</strong> – Zwischenschritt der Zwei-Faktor-Anmeldung (5 Minuten),
        </li>
        <li>
          <strong>„oi_geraet“</strong> – zufällige Gerätekennung zur Erkennung neuer Geräte und für „Gerät merken“ (höchstens 400 Tage).
        </li>
      </ul>
      <p>
        Im Betrieb tragen diese Namen das Präfix „__Host-“. Zusätzlich speichert das Portal Komfort-Einstellungen wie gespeicherte Listenansichten
        oder „Zuletzt verwendet“ nur im Speicher Ihres Browsers; sie werden nicht an uns übertragen.
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

      <h2 id="empfaenger">12. Empfänger und Auftragsverarbeiter</h2>
      <p>
        Personenbezogene Daten erhalten nur Stellen, die sie für den jeweiligen Zweck benötigen. Dienstleister, die in unserem Auftrag tätig
        werden, setzen wir nur auf Grundlage eines Vertrags nach Art. 28 DSGVO ein. Wo ein Anbieter noch nicht feststeht, ist dies unten
        markiert; wir ergänzen die Angaben vor dem Einsatz.
      </p>
      <p>
        <strong>Auftragsverarbeiter (in unserem Auftrag):</strong>
      </p>
      <ul>
        <li>
          <strong>ERP- und Portalsystem:</strong> Anfragen, Vorgänge, Portal-Konten, Nachrichten und Dokumente verwalten wir in einem ERP-System auf
          Basis des Open-Source-Frameworks Frappe (ggf. mit den Modulen für Finanzen, Personal, Dokumentenablage und Helpdesk). Betrieb und
          Hosting: <Platzhalter>Betreiber und Serverstandort des ERP-Systems</Platzhalter>. Soweit Dienstleister oder Gesellschaften der ÖKOVOLT
          Gruppe das System für uns betreiben oder warten, geschieht dies als Auftragsverarbeitung auf Grundlage eines Vertrags nach Art. 28
          DSGVO.
        </li>
        <li>
          <strong>Hosting- und IT-Dienstleister</strong> der Website (siehe Abschnitt 3), ebenfalls als Auftragsverarbeiter.
        </li>
        <li>
          <strong>E-Mail-Versand:</strong> <Platzhalter>Mailanbieter bzw. eigener Mailserver, Standort</Platzhalter>.
        </li>
        <li>
          <strong>Datensicherung:</strong> verschlüsselte Sicherungskopien bei <Platzhalter>Anbieter und Standort des Backup-Speichers</Platzhalter>.
        </li>
        <li>
          <strong>Geodaten-Dienst</strong> (ohne Personenbezug) und <strong>Messdaten-Dienst</strong> für Anlagen:{" "}
          <Platzhalter>Betreiber und Standort der Server</Platzhalter>.
        </li>
        <li>
          <strong>KI-Assistent:</strong> Anthropic PBC (USA), nur bei aktiviertem KI-Modus (Abschnitt 8a).
        </li>
        <li>
          <strong>Online-Identifizierung:</strong> <Platzhalter>Identitätsanbieter</Platzhalter> – als Auftragsverarbeiter bzw. für Teile der
          Verarbeitung selbst verantwortlich (Abschnitt 8c).
        </li>
        <li>
          <strong>Videokonferenzen</strong> für Beratungstermine: <Platzhalter>Videokonferenzdienst</Platzhalter>.
        </li>
      </ul>
      <p>
        <strong>Eigenständig Verantwortliche und weitere Empfänger:</strong>
      </p>
      <ul>
        <li>
          <strong>Gesellschaften der ÖKOVOLT Gruppe und Projektgesellschaften</strong>, soweit sie an der Bearbeitung Ihres Anliegens beteiligt oder
          Ihr Vertragspartner sind (z. B. Planung, Errichtung, Betrieb, Eigentum einer Anlage) – auf Grundlage von Art. 6 Abs. 1 lit. b bzw. f
          DSGVO.
        </li>
        <li>
          <strong>Projektanbieter und Investoren</strong> im Rahmen der Projektbörse und des Deal-Rooms, wie in Abschnitt 7 beschrieben.
        </li>
        <li>
          <strong>Energieversorger</strong> in der Angebotsanfrage nur anonymisiert, nach Zuschlag und Ihrer Freigabe mit Ihren Vertragsdaten
          (Abschnitt 8g).
        </li>
        <li>
          <strong>Banken</strong>, die wir für die Finanzierung eigener Projekte anfragen, sowie unsere kontoführende Bank für Zahlungen
          (Abschnitte 8h und 8j).
        </li>
        <li>
          <strong>Gutachter und Planer</strong> im Rahmen ihres Auftrags (Abschnitt 8k).
        </li>
        <li>
          <strong>Auskunfteien</strong> (Abschnitt 8d) und <strong>Registerstellen</strong> bzw. Verrechnungsstellen für Grundbuch- und
          Firmenbuchabfragen (Abschnitte 8e und 8f).
        </li>
        <li>
          <strong>Notare, Urkundspersonen, Treuhänder, Grundbuchgerichte und -ämter</strong> beim Vertragsabschluss und bei Dienstbarkeiten
          (Abschnitt 7b).
        </li>
        <li>
          <strong>Netzbetreiber, Messstellenbetreiber und Förderstellen</strong>, soweit für Netzanschluss, Messung, Lieferantenwechsel oder
          Förderung erforderlich.
        </li>
        <li>
          <strong>Google Ireland Limited</strong> für Google Analytics – nur nach Einwilligung (Abschnitt 11).
        </li>
        <li>
          <strong>Steuerberatung, Wirtschaftsprüfung, Rechtsberatung und Behörden</strong>, soweit gesetzlich vorgeschrieben oder zur Durchsetzung
          von Ansprüchen erforderlich.
        </li>
      </ul>
      <p>
        Eine Übermittlung in Staaten außerhalb des EWR findet nur statt, soweit in dieser Erklärung beschrieben (Google Analytics, KI-Assistent
        und ggf. ein Identitätsanbieter mit Sitz oder Unterauftragnehmern außerhalb des EWR). Die Schweiz verfügt über einen
        Angemessenheitsbeschluss der Europäischen Kommission; Daten zu Schweizer Projekten und Vertragspartnern können daher an Beteiligte in der
        Schweiz übermittelt werden.
      </p>

      <h2 id="speicherdauer">13. Speicherdauer</h2>
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
                <td className="py-2.5 align-top">
                  {dauer.startsWith("[Platzhalter: ") ? <Platzhalter>{dauer.slice(14, -1)}</Platzhalter> : dauer}
                </td>
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
          Situation ergeben (Art. 21 Abs. 1 DSGVO),
        </li>
        <li>
          <strong>Widerspruch gegen Direktwerbung</strong> – etwa gegen unser Anschreiben zur Flächenakquise – jederzeit und ohne Begründung
          (Art. 21 Abs. 2 und 3 DSGVO),
        </li>
        <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
      </ul>
      <p>
        Wenden Sie sich dazu an den oben genannten Datenschutzkontakt. Zur Bestätigung Ihrer Identität können wir angemessene Nachweise
        verlangen. Registrierte Nutzer können ihre Daten im Profil selbst exportieren und ihr Konto löschen.
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
      <p>
        Das gilt auch für Hilfsmittel, die Werte berechnen: Passungswerte zwischen Suchprofil und Projekt, Bewertungen von Flächen aus Geodaten,
        Prioritäten in der Kundenverwaltung, Treffer im Sanktionsabgleich, Bonitätsindizes und Empfehlungen der Wechselanalyse sind Hinweise
        für Menschen. Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung für Sie – etwa über eine Freigabe, einen Zuschlag oder
        eine Ablehnung – trifft stets ein Mitarbeitender.
      </p>

      <h2>17. Änderungen</h2>
      <p>
        Wir passen diese Erklärung an, wenn sich unsere Angebote oder die Rechtslage ändern. Es gilt die jeweils hier veröffentlichte Fassung.
        Stand: {STAND}.
      </p>
    </LegalShell>
  );
}

import Link from "next/link";
import LegalShell from "@/components/Reusable/LegalShell";

const PAGE_URL = "https://www.oekovolt.de/barrierefreiheit";
const TITEL = "Erklärung zur Barrierefreiheit | Ökovolt Deutschland";
const BESCHREIBUNG =
  "Erklärung zur Barrierefreiheit der Website www.oekovolt.de nach dem Barrierefreiheitsstärkungsgesetz (BFSG): Standards, Stand der Vereinbarkeit, bekannte Einschränkungen und Kontakt.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: PAGE_URL,
    siteName: "Ökovolt Deutschland",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: "https://www.oekovolt.de/og-image.jpg", width: 1200, height: 630, alt: "Ökovolt Deutschland" }],
  },
};

/** Datum der Erstellung bzw. letzten Überprüfung dieser Erklärung */
const STAND = "14. September 2026";

export default function BarrierefreiheitPage() {
  return (
    <LegalShell
      titel="Erklärung zur Barrierefreiheit"
      pfad="/barrierefreiheit"
      lead="Wir möchten, dass alle Menschen unsere Website und unsere Online-Dienste ohne Hürden nutzen können – unabhängig von Einschränkungen, Endgerät oder Hilfsmitteln."
    >
      <>
        <h2>Geltungsbereich</h2>
        <p>
          Diese Erklärung gilt für die Website <strong>www.oekovolt.de</strong> der ÖKOVOLT GmbH Solartechnik einschließlich der dort
          angebotenen Online-Dienste:
        </p>
        <ul className="space-y-1.5">
          <li>Angebots-Konfigurator (Anfrage einer Photovoltaik-Ersteinschätzung)</li>
          <li>Rechner und Werkzeuge (u. a. Solarrechner, Stromspeicher-, Wärmepumpen- und Finanzierungsrechner, Fördercheck)</li>
          <li>Rückruf-Service und Online-Terminbuchung</li>
          <li>Kontaktformular und Kurzbewerbung</li>
        </ul>
      </>

      <>
        <h2>Angewandte Standards</h2>
        <p>
          Grundlage sind das Barrierefreiheitsstärkungsgesetz (BFSG) und die zugehörige Verordnung (BFSGV). Technisch orientieren wir uns an
          der harmonisierten europäischen Norm <strong>EN 301 549 V3.2.1</strong> und den darin in Bezug genommenen
          <strong> Web Content Accessibility Guidelines (WCAG) 2.1, Konformitätsstufe AA</strong>.
        </p>
      </>

      <>
        <h2>So ist unser Angebot barrierefrei nutzbar</h2>
        <ul className="space-y-1.5">
          <li>
            <strong>Bedienung per Tastatur:</strong> Alle Menüs, Formulare, Rechner und Dialoge lassen sich ohne Maus bedienen. Ein Sprunglink
            führt direkt zum Hauptinhalt, der Tastaturfokus ist deutlich sichtbar. Dialoge (Menü, Rückruf, Cookie-Einstellungen) halten den
            Fokus, lassen sich mit der Escape-Taste schließen und geben den Fokus an den Auslöser zurück.
          </li>
          <li>
            <strong>Screenreader:</strong> Seiten sind mit Überschriften, Landmarken und Listen gegliedert. Bedienelemente, Formularfelder,
            Pflichtfelder und Fehlermeldungen sind programmatisch beschriftet; Statusmeldungen werden angesagt. Tabellen haben Beschriftungen
            und Kopfzellen, Diagramme eine textliche bzw. tabellarische Alternative.
          </li>
          <li>
            <strong>Kontraste und Farbe:</strong> Texte und Bedienelemente erfüllen die geforderten Mindestkontraste. Informationen werden nicht
            allein über Farbe vermittelt.
          </li>
          <li>
            <strong>Bewegung:</strong> Die Einstellung „Bewegung reduzieren“ Ihres Betriebssystems wird berücksichtigt – Animationen und das
            Hintergrundvideo entfallen dann. Das Hintergrundvideo und das Logo-Laufband lassen sich außerdem jederzeit anhalten.
          </li>
          <li>
            <strong>Zoom und Darstellung:</strong> Die Inhalte lassen sich bis 400 % vergrößern und passen sich ohne horizontales Scrollen an
            schmale Bildschirme an (breite Tabellen scrollen innerhalb ihres Rahmens).
          </li>
          <li>
            <strong>Keine Zeitbegrenzungen:</strong> Formulare und Terminbuchung haben keine Zeitlimits; Eingaben gehen beim Wechsel zwischen
            den Schritten nicht verloren.
          </li>
          <li>
            <strong>Sprache:</strong> Die Seiten sind als deutschsprachig ausgezeichnet, damit Vorleseprogramme die richtige Aussprache
            verwenden.
          </li>
        </ul>
      </>

      <>
        <h2>Stand der Vereinbarkeit</h2>
        <p>
          Die Website ist mit den oben genannten Anforderungen <strong>weitgehend vereinbar</strong>. Die folgenden Inhalte bzw. Funktionen sind
          aus den genannten Gründen noch nicht vollständig barrierefrei.
        </p>

        <h3>Bekannte Einschränkungen</h3>
        <ul className="space-y-1.5">
          <li>
            <strong>Eingebettete Google-Maps-Karte</strong> (Kontaktseite): Die Karte eines Drittanbieters ist nicht vollständig per Tastatur
            und Screenreader bedienbar. <em>Alternative:</em> Unsere Anschrift steht als Text auf der Kontaktseite, im Fußbereich jeder Seite und in
            dieser Erklärung.
          </li>
          <li>
            <strong>Interaktive Karten</strong> (Referenzkarte, Förderkarte der Bundesländer): Die grafische Karte selbst ist nur eingeschränkt
            für Screenreader erschlossen. <em>Alternative:</em> Die Inhalte stehen zusätzlich als Liste bzw. Auswahl neben der Karte bereit.
          </li>
          <li>
            <strong>Inhalte von Drittanbietern</strong> (z. B. Energiemarktdaten der Energy-Charts, verlinkte Profile in sozialen Netzwerken,
            Buchungs- und Telefoniesysteme unserer Dienstleister): Auf deren Barrierefreiheit haben wir nur begrenzt Einfluss.
          </li>
          <li>
            <strong>PDF-Dokumente und Bilder aus dem Redaktionssystem</strong> (z. B. Datenblätter, Stellenanzeigen, Referenzfotos): Ältere
            Dokumente sind teilweise nicht barrierefrei getaggt; einzelne Bilder haben noch keine aussagekräftige Textalternative. Wir
            überarbeiten diese Inhalte schrittweise. <em>Alternative:</em> Auf Anfrage senden wir Ihnen die Informationen in einem für Sie
            zugänglichen Format.
          </li>
          <li>
            <strong>Diagramme mit Mausinteraktion</strong> (Börsenstrompreis, Stromerzeugung, Rechner-Verläufe): Einzelwerte sind per Tastatur
            abrufbar; die vollständigen Daten stehen zusätzlich als Tabelle bzw. Text zur Verfügung.
          </li>
          <li>
            <strong>Ältere Unterseiten</strong>, die noch nicht auf das aktuelle Design umgestellt sind, können vereinzelt Kontrast- oder
            Strukturmängel aufweisen. Sie werden bei der laufenden Überarbeitung angepasst.
          </li>
          <li>
            <strong>Leichte Sprache und Gebärdensprache:</strong> Informationen in Leichter Sprache oder Deutscher Gebärdensprache bieten wir
            derzeit nicht an.
          </li>
        </ul>

        <h3>Alternative Zugangswege</h3>
        <p>
          Alle Leistungen, die Sie online anfragen können, erreichen Sie auch persönlich: telefonisch unter{" "}
          <a href="tel:+498245967880">08245 96 788 0</a> (Mo–Do 8–16 Uhr, Fr 8–13 Uhr) oder per E-Mail an{" "}
          <a href="mailto:office@oekovolt.de">office@oekovolt.de</a>. Wir beraten Sie gern auch vor Ort.
        </p>
      </>

      <>
        <h2>Erstellung dieser Erklärung</h2>
        <p>
          Diese Erklärung wurde am <strong>{STAND}</strong> erstellt. Grundlage ist eine Selbstbewertung: automatisierte Prüfungen mit axe-core
          (WCAG 2.1 A/AA) auf den wichtigsten Seiten in Desktop- und Smartphone-Breite sowie manuelle Tests der Tastaturbedienung,
          Fokusführung, Kontraste, Vergrößerung und reduzierten Bewegung. Die Erklärung wird bei wesentlichen Änderungen der Website, mindestens
          jedoch jährlich, überprüft.
        </p>
      </>

      <>
        <h2>Feedback und Kontakt</h2>
        <p>
          Sind Ihnen Barrieren aufgefallen oder benötigen Sie Informationen in einer anderen Form? Bitte schreiben Sie uns – wir antworten in der
          Regel innerhalb von zwei Wochen und suchen gemeinsam mit Ihnen eine Lösung.
        </p>
        <address className="mt-4 not-italic">
          <strong>ÖKOVOLT GmbH Solartechnik</strong>
          <br />
          Stichwort „Barrierefreiheit“
          <br />
          Schlingener Straße 1a
          <br />
          86842 Türkheim
          <br />
          Telefon: <a href="tel:+498245967880">08245 96 788 0</a>
          <br />
          E-Mail: <a href="mailto:office@oekovolt.de?subject=Barrierefreiheit">office@oekovolt.de</a>
        </address>
        <p className="mt-4">
          Alternativ erreichen Sie uns über unser <Link href="/kontakt">Kontaktformular</Link>.
        </p>
      </>

      <>
        <h2>Marktüberwachung und Schlichtung</h2>
        <p>
          Wenn Sie der Meinung sind, dass unser Angebot die Anforderungen an die Barrierefreiheit nicht erfüllt, und wir Ihr Anliegen nicht
          zufriedenstellend lösen konnten, können Sie sich an die zuständige Marktüberwachungsbehörde wenden:
        </p>
        <p>
          <strong>Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF)</strong>
          <br />
          Magdeburg
          <br />
          <a href="https://www.mlbf-barrierefrei.de" target="_blank" rel="noopener noreferrer">
            www.mlbf-barrierefrei.de<span className="sr-only"> (öffnet in neuem Tab)</span>
          </a>
        </p>
        <p>
          Zur außergerichtlichen Beilegung von Streitigkeiten können Sie außerdem die Schlichtungsstelle nach dem
          Behindertengleichstellungsgesetz beim Beauftragten der Bundesregierung für die Belange von Menschen mit Behinderungen anrufen
          (§ 34 BFSG):{" "}
          <a href="https://www.schlichtungsstelle-bgg.de" target="_blank" rel="noopener noreferrer">
            www.schlichtungsstelle-bgg.de<span className="sr-only"> (öffnet in neuem Tab)</span>
          </a>
          .
        </p>
      </>
    </LegalShell>
  );
}

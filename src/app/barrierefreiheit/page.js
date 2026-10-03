// src/app/barrierefreiheit/page.js
//
// Erklärung zur Barrierefreiheit (übernommen von der Ökovolt-DE-Website und
// auf ÖkoInvest angepasst). Sitz in Österreich -> Barrierefreiheitsgesetz
// (BaFG) mit Marktüberwachung durch das Sozialministeriumservice; für Nutzer
// in Deutschland zusätzlich BFSG-Hinweise.
//
// TODO vor Livegang: vollständige Selbstbewertung (axe-core auf allen Seitentypen +
// manuelle Tests: Tastatur, Screenreader, 400 % Zoom, Kontrast) durchführen und danach
// „Stand der Vereinbarkeit“, Einschränkungen und STAND aktualisieren.
//
// Paket D (03.10.2026): Die Erklärung behauptete eine durchgeführte Selbstbewertung und
// erfüllte Kontraste. Belegt ist bisher nur der automatisierte axe-Lauf aus Paket F
// (qa/axe.mjs, 10 Kernseiten + Cookie-Banner; Altlasten in qa/axe-baseline.json).
// Deshalb jetzt „teilweise vereinbar“ mit den bekannten Mängeln – keine Aussage ohne Prüfung.

import Link from "next/link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";

const PAGE_URL = abs("/barrierefreiheit");
const TITEL = "Erklärung zur Barrierefreiheit | ÖkoInvest";
const BESCHREIBUNG =
  "Erklärung zur Barrierefreiheit der ÖkoInvest-Website nach Barrierefreiheitsgesetz (AT) und BFSG (DE): Standards, Stand der Vereinbarkeit, Einschränkungen, Kontakt.";

/** Datum der Erstellung bzw. letzten Überprüfung dieser Erklärung */
const STAND = "3. Oktober 2026";

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

const G = GESELLSCHAFT;
const domain = SITE.url.replace(/^https?:\/\//, "");

export default function BarrierefreiheitPage() {
  return (
    <LegalShell
      titel="Erklärung zur Barrierefreiheit"
      pfad="/barrierefreiheit"
      lead="Wir möchten, dass alle Menschen unsere Website, die Rechner, das Portal und die Projektbörse ohne Hürden nutzen können – unabhängig von Einschränkungen, Endgerät oder Hilfsmitteln."
    >
      <h2>Geltungsbereich</h2>
      <p>
        Diese Erklärung gilt für die Website <strong>{domain}</strong> der {G.name} einschließlich der dort angebotenen Online-Dienste:
      </p>
      <ul className="space-y-1.5">
        <li>Anfrageformulare (u. a. Flächencheck, Agri-PV, Projekt anbieten, Investoren-Suchprofil, Reststrom, Energiegemeinschaft)</li>
        <li>Rechner und Werkzeuge (Pacht-, Agri-PV-, Solarpark-, Projektbewertungs-, Reststrom-, Solarcarport- und Kommunal-Rechner)</li>
        <li>Portal mit Registrierung, Anmeldung, Nachrichten und Dokumenten</li>
        <li>Projektbörse mit Exposés, Vertraulichkeitsvereinbarung (NDA) und Datenraum</li>
        <li>Live-Strommarktdaten, Ratgeber und Lexikon</li>
      </ul>

      <h2>Rechtlicher Rahmen und angewandte Standards</h2>
      <p>
        Die {G.name} hat ihren Sitz in Österreich. Maßgeblich sind das österreichische <strong>Barrierefreiheitsgesetz (BaFG)</strong>, das seit
        28. Juni 2025 gilt, und – für Nutzerinnen und Nutzer in Deutschland – das <strong>Barrierefreiheitsstärkungsgesetz (BFSG)</strong>. Beide
        setzen den European Accessibility Act (Richtlinie (EU) 2019/882) um. Unsere Angebote richten sich überwiegend an Unternehmen; wir wenden
        die Anforderungen dennoch auf die gesamte Website an.
      </p>
      <p>
        Technisch orientieren wir uns an der harmonisierten europäischen Norm <strong>EN 301 549</strong> und den darin in Bezug genommenen{" "}
        <strong>Web Content Accessibility Guidelines (WCAG) 2.1, Konformitätsstufe AA</strong>.
      </p>

      <h2>Was wir umsetzen</h2>
      <p>
        Die folgenden Punkte sind Ziel unserer Umsetzung. Ob sie auf allen Seiten erfüllt sind, ist noch nicht vollständig geprüft – siehe
        „Stand der Vereinbarkeit“.
      </p>
      <ul className="space-y-1.5">
        <li>
          <strong>Bedienung per Tastatur:</strong> Menüs, Formulare, Rechner und Dialoge sollen sich ohne Maus bedienen lassen. Ein Sprunglink führt
          direkt zum Hauptinhalt. Dialoge (Menü, Privatsphäre-Einstellungen) halten den Fokus, lassen sich mit der Escape-Taste schließen und geben
          den Fokus an den Auslöser zurück.
        </li>
        <li>
          <strong>Screenreader:</strong> Seiten sind mit Überschriften, Landmarken und Listen gegliedert. Bedienelemente und Formularfelder sind
          programmatisch beschriftet; Tabellen haben Beschriftungen und Kopfzellen, Diagramme eine textliche bzw. tabellarische Alternative.
        </li>
        <li>
          <strong>Kontraste und Farbe:</strong> Ziel sind die Mindestkontraste nach WCAG 2.1 AA; Informationen sollen nicht allein über Farbe
          vermittelt werden.
        </li>
        <li>
          <strong>Bewegung:</strong> Die Einstellung „Bewegung reduzieren“ Ihres Betriebssystems wird berücksichtigt – Animationen entfallen dann
          oder werden stark verkürzt.
        </li>
        <li>
          <strong>Zoom und Darstellung:</strong> Die Inhalte sollen sich bis 400 % vergrößern lassen und sich an schmale Bildschirme anpassen
          (breite Tabellen scrollen innerhalb ihres Rahmens).
        </li>
        <li>
          <strong>Keine Zeitbegrenzungen</strong> in Formularen und Rechnern.
        </li>
        <li>
          <strong>Sprache:</strong> Die deutschsprachigen Seiten sind als deutsch, die englischen Seiten im Inhaltsbereich als englisch
          ausgezeichnet, damit Vorleseprogramme die richtige Aussprache verwenden.
        </li>
      </ul>

      <h2>Stand der Vereinbarkeit</h2>
      <p>
        Die Website ist mit den oben genannten Anforderungen <strong>teilweise vereinbar</strong>. Eine vollständige Prüfung steht noch aus. Die
        folgenden Inhalte bzw. Funktionen sind bekanntermaßen noch nicht vollständig barrierefrei.
      </p>

      <h3>Bekannte Einschränkungen</h3>
      <ul className="space-y-1.5">
        <li>
          <strong>Kontraste:</strong> Auf einzelnen Seiten (u. a. Freiflächen-PV und Projektbörse) erreichen einige Texte den geforderten
          Mindestkontrast noch nicht. Wir beheben das schrittweise.
        </li>
        <li>
          <strong>Aufzählungen mit Kennzahlen:</strong> Auf einzelnen Seiten (u. a. Für Landwirte, Kontakt) sind Kennzahlen-Listen technisch nicht
          korrekt ausgezeichnet; Screenreader lesen sie teils ohne Zuordnung von Bezeichnung und Wert vor.
        </li>
        <li>
          <strong>Mehrstufige Formulare:</strong> Beim Flächencheck können Eingaben aus früheren Schritten derzeit verloren gehen. Alternative:
          Schildern Sie Ihr Anliegen über das Kontaktformular.
        </li>
        <li>
          <strong>Karten und Flächendarstellungen</strong> (z. B. Lage einer Fläche oder eines Projekts): Die grafische Karte ist nur eingeschränkt
          für Screenreader erschlossen. <em>Alternative:</em> Die wesentlichen Angaben (Region, Größe, Kennzahlen) stehen zusätzlich als Text.
        </li>
        <li>
          <strong>Diagramme mit Mausinteraktion</strong> (Börsenstrompreis, Erzeugung, Rechner-Verläufe): Einzelwerte sind per Tastatur abrufbar;
          die vollständigen Daten stehen zusätzlich als Tabelle bzw. Text zur Verfügung.
        </li>
        <li>
          <strong>Dokumente im Datenraum und von Anbietern hochgeladene Unterlagen</strong> (z. B. Pläne, Gutachten, Verträge als PDF): Auf deren
          Barrierefreiheit haben wir nur begrenzt Einfluss. <em>Alternative:</em> Auf Anfrage unterstützen wir Sie dabei, die Informationen in
          einer für Sie zugänglichen Form zu erhalten.
        </li>
        <li>
          <strong>Inhalte von Drittanbietern</strong> (z. B. Energiemarktdaten der Energy-Charts, verlinkte externe Quellen): Auf deren
          Barrierefreiheit haben wir nur begrenzt Einfluss.
        </li>
        <li>
          <strong>Leichte Sprache und Gebärdensprache:</strong> Informationen in Leichter Sprache oder Gebärdensprache bieten wir derzeit nicht
          an.
        </li>
      </ul>

      <h3>Alternative Zugangswege</h3>
      <p>
        Alle Leistungen, die Sie online anfragen können, erreichen Sie auch auf anderem Weg: über das <Link href="/kontakt">Kontaktformular</Link>
        {KONTAKT.telefon && (
          <>
            , telefonisch unter <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`}>{KONTAKT.telefon}</a>
          </>
        )}
        {KONTAKT.email && (
          <>
            , per E-Mail an <a href={`mailto:${KONTAKT.email}?subject=Barrierefreiheit`}>{KONTAKT.email}</a>
          </>
        )}{" "}
        oder postalisch. Wir beraten Sie gern auch persönlich.
      </p>

      <h2>Erstellung dieser Erklärung</h2>
      <p>
        Diese Erklärung wurde am <strong>{STAND}</strong> erstellt. Grundlage sind bisher automatisierte Prüfungen (axe-core, WCAG 2.1 A/AA) auf
        zehn zentralen Seiten. Eine vollständige Selbstbewertung mit manuellen Tests (Tastatur, Screenreader, Vergrößerung) ist noch nicht
        abgeschlossen; danach aktualisieren wir diese Erklärung. Sie wird außerdem bei wesentlichen Änderungen der Website, mindestens jedoch
        jährlich, überprüft.
      </p>

      <h2>Feedback und Kontakt</h2>
      <p>
        Sind Ihnen Barrieren aufgefallen oder benötigen Sie Informationen in einer anderen Form? Bitte schreiben Sie uns – wir antworten in der
        Regel innerhalb von zwei Wochen und suchen gemeinsam mit Ihnen eine Lösung.
      </p>
      <address className="mt-4 not-italic">
        <strong>{G.name}</strong>
        <br />
        Stichwort „Barrierefreiheit“
        <br />
        {G.sitz}
        <br />
        {G.plz} {G.ort}, {G.land}
        {KONTAKT.email && (
          <>
            <br />
            E-Mail: <a href={`mailto:${KONTAKT.email}?subject=Barrierefreiheit`}>{KONTAKT.email}</a>
          </>
        )}
      </address>
      <p className="mt-4">
        Online erreichen Sie uns über das <Link href="/kontakt">Kontaktformular</Link>.
      </p>

      <h2>Marktüberwachung und Beschwerde</h2>
      <p>
        Wenn Sie der Meinung sind, dass unser Angebot die Anforderungen an die Barrierefreiheit nicht erfüllt, und wir Ihr Anliegen nicht
        zufriedenstellend lösen konnten, können Sie sich an die zuständige Marktüberwachungsbehörde wenden:
      </p>
      <p>
        <strong>Österreich:</strong> Sozialministeriumservice, Marktüberwachung digitale Barrierefreiheit (Landesstelle Oberösterreich),{" "}
        <a href="mailto:bafg@sozialministeriumservice.gv.at">bafg@sozialministeriumservice.gv.at</a>,{" "}
        <a
          href="https://www.sozialministeriumservice.gv.at/Marktueberwachung_digitale_Barrierefreiheit/Allgemeine_Informationen_zum_Barrierefreiheitsgesetz/Allgemeine-Informationen-zum-Barrierefreiheitsgesetz.de.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Informationen zum Barrierefreiheitsgesetz<span className="sr-only"> (öffnet in neuem Tab)</span>
        </a>
        .
      </p>
      <p>
        <strong>Deutschland:</strong> Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF),
        Magdeburg,{" "}
        <a href="https://www.mlbf-barrierefrei.de" target="_blank" rel="noopener noreferrer">
          www.mlbf-barrierefrei.de<span className="sr-only"> (öffnet in neuem Tab)</span>
        </a>
        .
      </p>
    </LegalShell>
  );
}

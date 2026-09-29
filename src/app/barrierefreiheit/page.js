// src/app/barrierefreiheit/page.js
//
// Erklärung zur Barrierefreiheit (übernommen von der Ökovolt-DE-Website und
// auf ÖkoInvest angepasst). Sitz in Österreich -> Barrierefreiheitsgesetz
// (BaFG) mit Marktüberwachung durch das Sozialministeriumservice; für Nutzer
// in Deutschland zusätzlich BFSG-Hinweise.
//
// TODO vor Livegang: Selbstbewertung (axe-core + manuelle Tests) für die
// ÖkoInvest-Seiten durchführen und STAND/Einschränkungen aktualisieren.

import Link from "next/link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";

const PAGE_URL = abs("/barrierefreiheit");
const TITEL = "Erklärung zur Barrierefreiheit | ÖkoInvest";
const BESCHREIBUNG =
  "Erklärung zur Barrierefreiheit der ÖkoInvest-Website nach Barrierefreiheitsgesetz (AT) und BFSG (DE): Standards, Stand der Vereinbarkeit, Einschränkungen, Kontakt.";

/** Datum der Erstellung bzw. letzten Überprüfung dieser Erklärung */
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

      <h2>So ist unser Angebot barrierefrei nutzbar</h2>
      <ul className="space-y-1.5">
        <li>
          <strong>Bedienung per Tastatur:</strong> Menüs, Formulare, Rechner und Dialoge lassen sich ohne Maus bedienen. Ein Sprunglink führt direkt
          zum Hauptinhalt, der Tastaturfokus ist deutlich sichtbar. Dialoge (Menü, Privatsphäre-Einstellungen) halten den Fokus, lassen sich mit
          der Escape-Taste schließen und geben den Fokus an den Auslöser zurück.
        </li>
        <li>
          <strong>Screenreader:</strong> Seiten sind mit Überschriften, Landmarken und Listen gegliedert. Bedienelemente, Formularfelder,
          Pflichtfelder und Fehlermeldungen sind programmatisch beschriftet; Statusmeldungen werden angesagt. Tabellen haben Beschriftungen und
          Kopfzellen, Diagramme eine textliche bzw. tabellarische Alternative.
        </li>
        <li>
          <strong>Kontraste und Farbe:</strong> Texte und Bedienelemente erfüllen die geforderten Mindestkontraste. Informationen werden nicht
          allein über Farbe vermittelt.
        </li>
        <li>
          <strong>Bewegung:</strong> Die Einstellung „Bewegung reduzieren“ Ihres Betriebssystems wird berücksichtigt – Animationen entfallen dann
          oder werden stark verkürzt.
        </li>
        <li>
          <strong>Zoom und Darstellung:</strong> Die Inhalte lassen sich bis 400 % vergrößern und passen sich ohne horizontales Scrollen an schmale
          Bildschirme an (breite Tabellen scrollen innerhalb ihres Rahmens).
        </li>
        <li>
          <strong>Keine Zeitbegrenzungen</strong> in Formularen und Rechnern; Eingaben gehen beim Wechsel zwischen Schritten nicht verloren.
        </li>
        <li>
          <strong>Sprache:</strong> Die Seiten sind als deutschsprachig ausgezeichnet, damit Vorleseprogramme die richtige Aussprache verwenden.
        </li>
      </ul>

      <h2>Stand der Vereinbarkeit</h2>
      <p>
        Die Website ist mit den oben genannten Anforderungen <strong>weitgehend vereinbar</strong>. Die folgenden Inhalte bzw. Funktionen sind aus
        den genannten Gründen noch nicht vollständig barrierefrei.
      </p>

      <h3>Bekannte Einschränkungen</h3>
      <ul className="space-y-1.5">
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
        Diese Erklärung wurde am <strong>{STAND}</strong> erstellt. Grundlage ist eine Selbstbewertung: automatisierte Prüfungen (WCAG 2.1 A/AA)
        auf den wichtigsten Seiten in Desktop- und Smartphone-Breite sowie manuelle Tests der Tastaturbedienung, Fokusführung, Kontraste,
        Vergrößerung und reduzierten Bewegung. Die Erklärung wird bei wesentlichen Änderungen der Website, mindestens jedoch jährlich, überprüft.
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

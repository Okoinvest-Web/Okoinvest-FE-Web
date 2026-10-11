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

import Link from "@/components/Land/Link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { datumText } from "@/lib/sprache/format";

const PAGE_URL = abs("/barrierefreiheit");
const TITEL = "Erklärung zur Barrierefreiheit | ÖkoInvest";
const BESCHREIBUNG =
  "Erklärung zur Barrierefreiheit der ÖkoInvest-Website nach Barrierefreiheitsgesetz (AT) und BFSG (DE): Standards, Stand der Vereinbarkeit, Einschränkungen, Kontakt.";

/** Datum der Erstellung bzw. letzten Überprüfung dieser Erklärung */
const STAND = "3. Oktober 2026";

const metadata = {
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

// Englisch (Sprachmodell): Übersetzung zur Information – maßgeblich ist die deutsche Fassung.
const metadataEn = {
  title: "Accessibility statement | ÖkoInvest",
  description: "Accessibility statement for the ÖkoInvest website under the Austrian Accessibility Act (BaFG) and the German BFSG: standards, compliance status, limitations, contact.",
  openGraph: {
    locale: "en_GB",
    title: "Accessibility statement | ÖkoInvest",
    description: "Accessibility statement for the ÖkoInvest website under the Austrian Accessibility Act (BaFG) and the German BFSG: standards, compliance status, limitations, contact.",
    images: [{ alt: "Solar park under a blue sky" }],
  },
};

export default async function BarrierefreiheitPage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Accessibility statement" : "Erklärung zur Barrierefreiheit"}
      pfad="/barrierefreiheit"
      lead={en ? "We want everyone to be able to use our website, the calculators, the portal and the project exchange without barriers – regardless of impairments, device or assistive technology." : "Wir möchten, dass alle Menschen unsere Website, die Rechner, das Portal und die Projektbörse ohne Hürden nutzen können – unabhängig von Einschränkungen, Endgerät oder Hilfsmitteln."}
    >
      {en ? (
        <>
      <h2>Scope</h2>
      <p>
        This statement applies to the website <strong>{domain}</strong> of {G.name}, including the online services offered there:
      </p>
      <ul className="space-y-1.5">
        <li>Enquiry forms (including land check, agrivoltaics, offer a project, investor search profile, residual power, energy community)</li>
        <li>Calculators and tools (including lease, agrivoltaics, solar park, project valuation, residual power, solar carport, municipal and building power calculators, commercial power check, land passport with map, grid connection companion)</li>
        <li>Portal with registration, sign-in, messages and documents</li>
        <li>Project exchange with exposés, non-disclosure agreement (NDA) and data room</li>
        <li>Live power market data, market data pages, facts and sources register, guides and glossary</li>
        <li>Newsletter sign-up and newsroom</li>
      </ul>

      <h2>Legal framework and standards applied</h2>
      <p>
        {G.name} is based in Austria. The applicable law is the Austrian <strong>Accessibility Act (Barrierefreiheitsgesetz, BaFG)</strong>, in force
        since 28 June 2025, and – for users in Germany – the <strong>German Accessibility Strengthening Act (Barrierefreiheitsstärkungsgesetz, BFSG)</strong>.
        Both implement the European Accessibility Act (Directive (EU) 2019/882). Our offers are aimed predominantly at businesses; we nevertheless
        apply the requirements to the entire website.
      </p>
      <p>
        Technically, we follow the harmonised European standard <strong>EN 301 549</strong> and the{" "}
        <strong>Web Content Accessibility Guidelines (WCAG) 2.1, conformance level AA</strong> referenced therein.
      </p>

      <h2>What we implement</h2>
      <p>
        The following points are the goals of our implementation. Whether they are met on all pages has not yet been fully checked – see
        “Compliance status”.
      </p>
      <ul className="space-y-1.5">
        <li>
          <strong>Keyboard operation:</strong> menus, forms, calculators and dialogs should be operable without a mouse. A skip link leads directly to
          the main content. Dialogs (menu, privacy settings) keep the focus, can be closed with the Escape key and return the focus to the element
          that opened them.
        </li>
        <li>
          <strong>Screen readers:</strong> pages are structured with headings, landmarks and lists. Controls and form fields are programmatically
          labelled; tables have captions and header cells, and charts have a text or tabular alternative.
        </li>
        <li>
          <strong>Contrast and colour:</strong> the goal is the minimum contrast ratios under WCAG 2.1 AA; information should not be conveyed by colour
          alone.
        </li>
        <li>
          <strong>Motion:</strong> your operating system&apos;s “reduce motion” setting is respected – animations are then omitted or greatly shortened.
        </li>
        <li>
          <strong>Zoom and display:</strong> content should be enlargeable up to 400 % and adapt to narrow screens (wide tables scroll within their
          frame).
        </li>
        <li>
          <strong>No time limits</strong> in forms and calculators.
        </li>
        <li>
          <strong>Language:</strong> German-language pages are marked up as German and the content area of English pages as English, so that screen
          readers use the correct pronunciation.
        </li>
      </ul>

      <h2>Compliance status</h2>
      <p>
        The website is <strong>partially compliant</strong> with the requirements listed above. A full review is still pending. The following content
        and functions are known not yet to be fully accessible.
      </p>

      <h3>Known limitations</h3>
      <ul className="space-y-1.5">
        <li>
          <strong>Contrast:</strong> on some pages (including ground-mounted PV and the project exchange), some texts do not yet reach the required
          minimum contrast. We are fixing this step by step.
        </li>
        <li>
          <strong>Lists of key figures:</strong> on some pages (including For farmers and Contact), lists of key figures are not marked up correctly;
          screen readers sometimes read them out without linking the label and the value.
        </li>
        <li>
          <strong>Multi-step forms:</strong> in the land check, entries from earlier steps can currently be lost. Alternative: describe your request via
          the contact form.
        </li>
        <li>
          <strong>Maps and site illustrations</strong> (e.g. the location of a piece of land or a project): the graphical map is only partially
          accessible to screen readers. <em>Alternative:</em> the key information (region, size, key figures) is also provided as text.
        </li>
        <li>
          <strong>Charts with mouse interaction</strong> (exchange power price, generation, calculator curves): individual values can be accessed by
          keyboard; the complete data is also available as a table or text.
        </li>
        <li>
          <strong>Documents in the data room and documents uploaded by sellers</strong> (e.g. plans, expert reports, contracts as PDF): we have only
          limited influence on their accessibility. <em>Alternative:</em> on request, we will help you obtain the information in a form that is
          accessible to you.
        </li>
        <li>
          <strong>Third-party content</strong> (e.g. energy market data from Energy-Charts, linked external sources): we have only limited influence on
          its accessibility.
        </li>
        <li>
          <strong>Easy-to-read language and sign language:</strong> we do not currently offer information in easy-to-read language or sign language.
        </li>
      </ul>

      <h3>Alternative ways to reach us</h3>
      <p>
        Every service you can request online is also available by other means: via the <Link href="/kontakt">contact form</Link>
        {KONTAKT.telefon && (
          <>
            , by phone on <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`}>{KONTAKT.telefon}</a>
          </>
        )}
        {KONTAKT.email && (
          <>
            , by e-mail to <a href={`mailto:${KONTAKT.email}?subject=Accessibility`}>{KONTAKT.email}</a>
          </>
        )}{" "}
        or by post. We are also happy to advise you in person.
      </p>

      <h2>Preparation of this statement</h2>
      <p>
        This statement was prepared on <strong>{datumText(STAND, "en")}</strong>. It is based so far on automated tests (axe-core, WCAG 2.1 A/AA) on ten
        key pages. A full self-assessment with manual tests (keyboard, screen reader, magnification) has not yet been completed; we will update this
        statement afterwards. It is also reviewed whenever the website changes significantly, and at least once a year.
      </p>

      <h2>Feedback and contact</h2>
      <p>
        Have you come across barriers or do you need information in a different form? Please write to us – we usually reply within two weeks and will
        work with you to find a solution.
      </p>
      <address className="mt-4 not-italic">
        <strong>{G.name}</strong>
        <br />
        Reference “Accessibility” (Barrierefreiheit)
        <br />
        {G.sitz}
        <br />
        {G.plz} {G.ort}, Austria
        {KONTAKT.email && (
          <>
            <br />
            E-mail: <a href={`mailto:${KONTAKT.email}?subject=Accessibility`}>{KONTAKT.email}</a>
          </>
        )}
      </address>
      <p className="mt-4">
        Online, you can reach us via the <Link href="/kontakt">contact form</Link>.
      </p>

      <h2>Market surveillance and complaints</h2>
      <p>
        If you believe that our offering does not meet the accessibility requirements and we have not been able to resolve your concern
        satisfactorily, you can contact the competent market surveillance authority:
      </p>
      <p>
        <strong>Austria:</strong> Sozialministeriumservice (Federal Social Ministry Service), market surveillance of digital accessibility (Upper Austria
        regional office), <a href="mailto:bafg@sozialministeriumservice.gv.at">bafg@sozialministeriumservice.gv.at</a>,{" "}
        <a
          href="https://www.sozialministeriumservice.gv.at/Marktueberwachung_digitale_Barrierefreiheit/Allgemeine_Informationen_zum_Barrierefreiheitsgesetz/Allgemeine-Informationen-zum-Barrierefreiheitsgesetz.de.html"
          target="_blank"
          rel="noopener noreferrer"
          hrefLang="de"
        >
          Information on the Accessibility Act (in German)<span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>
      <p>
        <strong>Germany:</strong> Joint market surveillance body of the federal states for the accessibility of products and services
        (Marktüberwachungsstelle der Länder, MLBF), Magdeburg,{" "}
        <a href="https://www.mlbf-barrierefrei.de" target="_blank" rel="noopener noreferrer" hrefLang="de">
          www.mlbf-barrierefrei.de<span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>
        </>
      ) : (
        <>
      <h2>Geltungsbereich</h2>
      <p>
        Diese Erklärung gilt für die Website <strong>{domain}</strong> der {G.name} einschließlich der dort angebotenen Online-Dienste:
      </p>
      <ul className="space-y-1.5">
        <li>Anfrageformulare (u. a. Flächencheck, Agri-PV, Projekt anbieten, Investoren-Suchprofil, Reststrom, Energiegemeinschaft)</li>
        <li>Rechner und Werkzeuge (u. a. Pacht-, Agri-PV-, Solarpark-, Projektbewertungs-, Reststrom-, Solarcarport-, Kommunal- und Gebäudestrom-Rechner, Gewerbestrom-Check, Flächenpass mit Karte, Netzanschluss-Begleiter)</li>
        <li>Portal mit Registrierung, Anmeldung, Nachrichten und Dokumenten</li>
        <li>Projektbörse mit Exposés, Vertraulichkeitsvereinbarung (NDA) und Datenraum</li>
        <li>Live-Strommarktdaten, Marktdaten-Seiten, Fakten- und Quellenregister, Ratgeber und Lexikon</li>
        <li>Newsletter-Anmeldung und Newsroom</li>
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
        </>
      )}
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/barrierefreiheit", metadata, { en: metadataEn });

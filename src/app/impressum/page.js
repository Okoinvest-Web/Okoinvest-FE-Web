// src/app/impressum/page.js
//
// Impressum der ÖkoInvest GmbH nach österreichischem Recht:
//  - § 5 E-Commerce-Gesetz (ECG)       Diensteanbieter-Informationen
//  - § 14 Unternehmensgesetzbuch (UGB) Angaben auf Geschäftspapieren/Websites
//  - § 25 Mediengesetz (MedienG)        Offenlegung
// Alle Stammdaten kommen aus src/data/site.js (GESELLSCHAFT, KONTAKT).
//
// TODO vor Livegang (fachlich/rechtlich zu ergänzen, bewusst NICHT im Text):
//  - UID-Nummer: GESELLSCHAFT.uid ist noch null -> Zeile erscheint automatisch,
//    sobald sie eingetragen ist.
//  - Kammerzugehörigkeit (voraussichtlich Wirtschaftskammer Oberösterreich) und
//    Fachgruppe prüfen und ergänzen (§ 5 Abs. 1 Z 5 ECG).
//  - Gewerbe/Berufsrecht und zuständige Aufsichtsbehörde (Gewerbebehörde,
//    voraussichtlich Bezirkshauptmannschaft Braunau am Inn) prüfen und ergänzen
//    (§ 5 Abs. 1 Z 4 und 6 ECG) – nur, wenn eine Gewerbeberechtigung besteht.
//  - Beteiligungsverhältnisse (Gesellschafter mit Anteilen) nach § 25 Abs. 2
//    MedienG aus dem aktuellen Firmenbuchauszug ergänzen.
//  - Telefon/E-Mail: erscheinen automatisch, sobald KONTAKT freigegeben ist.
//    § 5 Abs. 1 Z 3 ECG verlangt Angaben, die eine rasche und unmittelbare
//    Kontaktaufnahme ermöglichen, einschließlich E-Mail-Adresse -> vor
//    Livegang zwingend freigeben.
//  - Verbraucherschlichtung: Teilnahmebereitschaft (AStG) rechtlich festlegen.

import Link from "next/link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";

const PAGE_URL = abs("/impressum");
const TITEL = "Impressum | ÖkoInvest";
const BESCHREIBUNG =
  "Impressum und Offenlegung der ÖkoInvest GmbH, Ostermiething (Österreich): Firmenbuch, Geschäftsführung, Unternehmensgegenstand und Angaben nach ECG, UGB und MedienG.";

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
    images: [{ url: abs("/img/firmensitz.jpg"), alt: "Firmensitz der ÖkoInvest GmbH" }],
  },
};

const G = GESELLSCHAFT;

export default function ImpressumPage() {
  return (
    <LegalShell
      titel="Impressum"
      pfad="/impressum"
      lead="Informationen nach § 5 E-Commerce-Gesetz und § 14 Unternehmensgesetzbuch sowie Offenlegung nach § 25 Mediengesetz."
    >
      <h2>Diensteanbieter und Medieninhaber</h2>
      <address className="not-italic">
        <strong>{G.name}</strong>
        <br />
        {G.sitz}
        <br />
        {G.plz} {G.ort}
        <br />
        {G.land}
      </address>

      <h2>Kontakt</h2>
      {KONTAKT.telefon && (
        <p>
          Telefon: <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`}>{KONTAKT.telefon}</a>
        </p>
      )}
      {KONTAKT.email && (
        <p>
          E-Mail: <a href={`mailto:${KONTAKT.email}`}>{KONTAKT.email}</a>
        </p>
      )}
      <p>
        Sie erreichen uns schriftlich über das <Link href="/kontakt">Kontaktformular</Link> oder – nach Registrierung – über die
        Nachrichtenfunktion im Portal. Die Postanschrift finden Sie oben.
      </p>

      <h2>Unternehmensangaben</h2>
      <ul>
        <li>
          <strong>Firma und Rechtsform:</strong> {G.name}, Gesellschaft mit beschränkter Haftung
        </li>
        <li>
          <strong>Sitz:</strong> {G.ort}, {G.land}
        </li>
        <li>
          <strong>Firmenbuchnummer:</strong> {G.register}
        </li>
        <li>
          <strong>Firmenbuchgericht:</strong> {G.gericht}
        </li>
        {G.uid && (
          <li>
            <strong>UID-Nummer:</strong> {G.uid}
          </li>
        )}
        <li>
          <strong>Geschäftsführung:</strong> {G.geschaeftsfuehrung.join(", ")}
        </li>
        <li>
          <strong>Unternehmensgegenstand:</strong> {G.gegenstand}
        </li>
      </ul>

      <h2>Offenlegung nach § 25 Mediengesetz</h2>
      <p>
        <strong>Medieninhaber:</strong> {G.name}, {G.sitz}, {G.plz} {G.ort}, {G.land}.
      </p>
      <p>
        <strong>Unternehmensgegenstand:</strong> {G.gegenstand}.
      </p>
      <p>
        <strong>Geschäftsführung:</strong> {G.geschaeftsfuehrung.join(", ")}.
      </p>
      <p>
        Die {G.name} ist Teil der {SITE.gruppe}.
        {G.beteiligungen?.length > 0 && (
          <>
            {" "}
            Beteiligungen der Gesellschaft:{" "}
            {G.beteiligungen.map((b, i) => (
              <span key={b.name}>
                {i > 0 && "; "}
                {b.name} ({b.register}, {b.anteil})
              </span>
            ))}
            .
          </>
        )}
      </p>
      <p>
        <strong>Grundlegende Richtung:</strong> Information über Projektentwicklung, Planung, Finanzierung und Betrieb von Photovoltaik-Kraftwerken
        (Freifläche, Agri-PV, Solarcarports) und Großspeichern, über die Projektbörse und die Investoren-Plattform sowie über Stromlieferung,
        virtuelle Kraftwerke und Energiegemeinschaften in Deutschland, Österreich und der Schweiz.
      </p>

      <h2>Online-Streitbeilegung und Verbraucherschlichtung</h2>
      <p>
        Die frühere Plattform der Europäischen Kommission zur Online-Streitbeilegung (OS-Plattform) wurde durch die Verordnung (EU) 2024/3228
        mit Wirkung zum 20. Juli 2025 eingestellt; ein Hinweis darauf ist daher nicht mehr vorgesehen. Unsere Angebote richten sich überwiegend
        an Unternehmen, Landwirte, Kommunen und Investoren. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle sind wir nicht verpflichtet und nehmen daran grundsätzlich nicht teil. Anliegen klären wir gern direkt mit
        Ihnen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Wir erstellen die Inhalte dieser Website mit Sorgfalt. Ratgeber, Lexikon, Rechner und Marktdaten dienen der allgemeinen Information und
        geben Orientierungswerte mit dem jeweils angegebenen Stand wieder. Sie ersetzen keine Rechts-, Steuer- oder Anlageberatung und kein
        verbindliches Angebot. Für Richtigkeit, Vollständigkeit und Aktualität übernehmen wir – soweit gesetzlich zulässig – keine Gewähr.
      </p>
      <p>
        Angaben zu Projekten in der <Link href="/projektboerse">Projektbörse</Link> stammen von den jeweiligen Anbietern. Ergänzend gelten unsere{" "}
        <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unsere Website enthält Verweise auf Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für diese Inhalte ist der jeweilige
        Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Werden uns Rechtsverletzungen bekannt,
        entfernen wir die betreffenden Links umgehend (§ 17 ECG).
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Texte, Grafiken, Rechner und Fotos dieser Website sind urheberrechtlich geschützt. Eine Verwendung außerhalb der Grenzen des
        Urheberrechts bedarf unserer vorherigen schriftlichen Zustimmung. Kurze Zitate mit Quellenangabe und Link sind willkommen.
      </p>

      <h2>Weitere Rechtstexte</h2>
      <p>
        <Link href="/datenschutz">Datenschutzerklärung</Link> · <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link> ·{" "}
        <Link href="/barrierefreiheit">Erklärung zur Barrierefreiheit</Link>
      </p>
    </LegalShell>
  );
}

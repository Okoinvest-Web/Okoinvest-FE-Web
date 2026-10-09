// src/app/impressum/page.js
//
// Impressum der ÖkoInvest GmbH nach österreichischem Recht:
//  - § 5 E-Commerce-Gesetz (ECG)       Diensteanbieter-Informationen
//  - § 14 Unternehmensgesetzbuch (UGB) Angaben auf Geschäftspapieren/Websites
//  - § 25 Mediengesetz (MedienG)        Offenlegung
// Alle Stammdaten kommen aus src/data/site.js (GESELLSCHAFT, KONTAKT).
//
// Prüfung durch die Rechtsabteilung (Gesamtabnahme der Website) – offen:
//  - Kammer, Fachgruppe, Gewerbeberechtigungen und Aufsichtsbehörde sind aus dem
//    Sitz abgeleitet (GESELLSCHAFT.kammer/aufsichtsbehoerde/berufsrecht) – bestätigen.
//  - Verbraucherschlichtung: Teilnahmebereitschaft (AStG) bestätigen.
//
// TODO Inhaber (W0-3/E2, Stand 03.10.2026 NICHT freigegeben): Telefon, Funktionspostfach
// (E-Mail) und UID in src/data/site.js (KONTAKT/GESELLSCHAFT) eintragen. Bis dahin zeigt die
// Seite sichtbar „offen“ statt still nichts – die E-Mail ist Pflichtangabe nach § 5 Abs. 1
// Z 3 ECG; ohne sie darf die Seite nicht öffentlich gehen. Nichts erfinden.
//
// Bild: firmensitz.jpg zeigt das Gebäude der Muttergesellschaft in Türkheim (DE), nicht den
// Sitz der ÖkoInvest GmbH in Ostermiething (AT) – Bildtext entsprechend (Paket D).

import Link from "@/components/Land/Link";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";

const PAGE_URL = abs("/impressum");
const TITEL = "Impressum | ÖkoInvest";
const BESCHREIBUNG =
  "Impressum und Offenlegung der ÖkoInvest GmbH, Ostermiething (Österreich): Firmenbuch, Geschäftsführung, Unternehmensgegenstand und Angaben nach ECG, UGB und MedienG.";

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
    images: [{ url: abs("/img/firmensitz.jpg"), alt: "Firmengebäude der Muttergesellschaft ÖKOVOLT GmbH Solartechnik in Türkheim" }],
  },
};

const G = GESELLSCHAFT;

// Englisch (Sprachmodell): Übersetzung zur Information – maßgeblich ist die deutsche Fassung (Hinweis in LegalShell).
// Gesetzesbezeichnungen bleiben im Original und werden beim ersten Auftreten erklärt. Prüfung durch die Rechtsabteilung.
const metadataEn = {
  title: "Legal notice | ÖkoInvest",
  description: "Legal notice and disclosure of ÖkoInvest GmbH, Ostermiething (Austria): commercial register, management, business purpose and information under the ECG, UGB and MedienG.",
  openGraph: {
    locale: "en_GB",
    title: "Legal notice | ÖkoInvest",
    description: "Legal notice and disclosure of ÖkoInvest GmbH, Ostermiething (Austria): commercial register, management, business purpose and information under the ECG, UGB and MedienG.",
    images: [{ alt: "Office building of the parent company ÖKOVOLT GmbH Solartechnik in Türkheim" }],
  },
};
const GEGENSTAND_EN = "Project development, construction and operation of photovoltaic power plants (ground-mounted, agrivoltaics), contracting and power purchase agreements (PPA)";
const BETEILIGUNG_EN = { "Betrieb von PV-Kraftwerken": "operation of PV power plants", "Gemeinschaftsgesellschaft mit der Prime Energy Solutions GmbH": "joint company with Prime Energy Solutions GmbH" };

/** Sichtbarer Platzhalter für noch nicht freigegebene Pflichtangaben (siehe TODO oben). */
function Offen({ en = false }) {
  return (
    <span data-todo="kontaktdaten" className="rounded bg-sun-100 px-1.5 py-0.5 text-[14px] font-semibold text-ink-900 ring-1 ring-sun-300">
      {en ? "open – will be added after approval" : "offen – wird nach Freigabe ergänzt"}
    </span>
  );
}

export default async function ImpressumPage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Legal notice" : "Impressum"}
      pfad="/impressum"
      lead={en ? "Information under § 5 of the Austrian E-Commerce Act (ECG) and § 14 of the Austrian Business Code (UGB), and disclosure under § 25 of the Austrian Media Act (MedienG)." : "Informationen nach § 5 E-Commerce-Gesetz und § 14 Unternehmensgesetzbuch sowie Offenlegung nach § 25 Mediengesetz."}
    >
      {en ? (
        <>
      <h2>Service provider and media owner</h2>
      <div className="not-prose mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <address className="relative overflow-hidden rounded-2xl bg-sand-50 p-5 not-italic ring-1 ring-ink-200/70 md:p-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-ov-500 to-ov-300" />
          <strong className="font-display text-[17px]">{G.name}</strong>
          <br />
          {G.sitz}
          <br />
          {G.plz} {G.ort}
          <br />
          Austria
        </address>
        <div className="rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70 md:p-6">
          <h2 className="!mt-0 !mb-2 !text-[17px]">Contact</h2>
          {KONTAKT.telefon && (
            <p>
              Phone: <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`}>{KONTAKT.telefon}</a>
            </p>
          )}
          <p>
            E-mail: {KONTAKT.email ? <a href={`mailto:${KONTAKT.email}`}>{KONTAKT.email}</a> : <Offen en />}
          </p>
          <p>
            You can reach us in writing via the <Link href="/kontakt">contact form</Link> or – after registering – via the messaging function in
            the portal. Our postal address is shown above.
          </p>
        </div>
      </div>

      <h2>Company details</h2>
      <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-ink-200/70 ring-1 ring-ink-200/70 sm:grid-cols-2">
        {[
          ["Company name and legal form", `${G.name}, Gesellschaft mit beschränkter Haftung (limited liability company)`],
          ["Registered office", `${G.ort}, Austria`],
          ["Commercial register number (Firmenbuchnummer)", G.register],
          ["Register court", `${G.gericht} (regional court)`],
          ["VAT ID (UID)", G.uid || <Offen key="uid" en />],
          ["Management", G.geschaeftsfuehrung.join(", ")],
          ...(G.vertretung ? [["Representation", "Each managing director has sole power of representation."]] : []),
          ...(G.kammer ? [["Chamber membership", `${G.kammer} (Upper Austrian Chamber of Commerce)`]] : []),
          ...(G.aufsichtsbehoerde ? [["Supervisory and trade authority", `${G.aufsichtsbehoerde} (district authority)`]] : []),
          ...(G.berufsrecht
            ? [["Professional regulations", <>Austrian Trade Regulation Act 1994 (Gewerbeordnung, GewO), available at <a href={G.berufsrecht.url} rel="noopener noreferrer">{G.berufsrecht.url.replace("https://", "")}</a></>]]
            : []),
          ["Business purpose", GEGENSTAND_EN, true],
        ].map(([dt, dd, breit]) => (
          <div key={dt} className={`bg-white px-5 py-4 ${breit ? "sm:col-span-2" : ""}`}>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">{dt}</dt>
            <dd className="mt-1 font-medium leading-relaxed text-ink-900">{dd}</dd>
          </div>
        ))}
      </dl>

      <h2>Disclosure under § 25 of the Austrian Media Act</h2>
      <p>
        <strong>Media owner:</strong> {G.name}, {G.sitz}, {G.plz} {G.ort}, Austria.
      </p>
      <p>
        <strong>Business purpose:</strong> {GEGENSTAND_EN}.
      </p>
      <p>
        <strong>Management:</strong> {G.geschaeftsfuehrung.join(", ")}.
      </p>
      {G.gesellschafter?.length > 0 && (
        <p>
          <strong>Ownership structure (shareholders):</strong>{" "}
          {G.gesellschafter.map((g, i) => (
            <span key={g.name}>
              {i > 0 && "; "}
              {g.name} ({g.anteil.replace(",", ".")})
            </span>
          ))}
          .
        </p>
      )}
      <p>
        {G.name} is part of the {SITE.gruppe}.
        {G.beteiligungen?.length > 0 && (
          <>
            {" "}
            Shareholdings of the company:{" "}
            {G.beteiligungen.map((b, i) => (
              <span key={b.name}>
                {i > 0 && "; "}
                {b.name} ({b.register}, {b.anteil}{BETEILIGUNG_EN[b.text] ? `, ${BETEILIGUNG_EN[b.text]}` : ""})
              </span>
            ))}
            .
          </>
        )}
      </p>
      <p>
        <strong>Editorial line:</strong> information on the project development, planning, financing and operation of photovoltaic power plants
        (ground-mounted, agrivoltaics, solar carports) and battery storage, on the project exchange and the investor platform, and on power supply,
        virtual power plants and energy communities in Germany, Austria and Switzerland.
      </p>

      <h2>Online dispute resolution and consumer arbitration</h2>
      <p>
        The European Commission&apos;s former online dispute resolution platform (ODR platform) was discontinued with effect from 20 July 2025 by
        Regulation (EU) 2024/3228; a reference to it is therefore no longer required. Our offers are aimed predominantly at businesses, farmers,
        municipalities and investors. We are not obliged to take part in dispute resolution proceedings before a consumer arbitration body and, as a
        rule, do not do so. We are happy to resolve any concerns directly with you.
      </p>

      <h2>Liability for content</h2>
      <p>
        We create the content of this website with care. Guides, glossary, calculators and market data are provided for general information and
        give guide values as of the date stated in each case. They do not replace legal, tax or investment advice or a binding offer. To the extent
        permitted by law, we accept no liability for accuracy, completeness or timeliness.
      </p>
      <p>
        Information on projects on the <Link href="/projektboerse">project exchange</Link> comes from the respective sellers. Our{" "}
        <Link href="/nutzungsbedingungen">terms of use</Link> also apply.
      </p>

      <h2>Liability for links</h2>
      <p>
        Our website contains links to third-party websites over whose content we have no influence. The respective provider is responsible for this
        content. No legal infringements were apparent at the time of linking. If we become aware of any infringements, we will remove the links
        concerned without delay (§ 17 ECG).
      </p>

      <h2>Copyright</h2>
      <p>
        The texts, graphics, calculators and photos on this website are protected by copyright. Any use beyond the limits of copyright law requires
        our prior written consent. Short quotations with a source reference and link are welcome.
      </p>

      <h2>More legal texts</h2>
      <p>
        <Link href="/datenschutz">Privacy policy</Link> · <Link href="/nutzungsbedingungen">Terms of use</Link> ·{" "}
        <Link href="/barrierefreiheit">Accessibility statement</Link>
      </p>
        </>
      ) : (
        <>
      <h2>Diensteanbieter und Medieninhaber</h2>
      <div className="not-prose mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <address className="relative overflow-hidden rounded-2xl bg-sand-50 p-5 not-italic ring-1 ring-ink-200/70 md:p-6">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-ov-500 to-ov-300" />
          <strong className="font-display text-[17px]">{G.name}</strong>
          <br />
          {G.sitz}
          <br />
          {G.plz} {G.ort}
          <br />
          {G.land}
        </address>
        <div className="rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70 md:p-6">
          <h2 className="!mt-0 !mb-2 !text-[17px]">Kontakt</h2>
          {KONTAKT.telefon && (
            <p>
              Telefon: <a href={KONTAKT.telefonHref || `tel:${KONTAKT.telefon.replace(/[^+\d]/g, "")}`}>{KONTAKT.telefon}</a>
            </p>
          )}
          <p>
            E-Mail: {KONTAKT.email ? <a href={`mailto:${KONTAKT.email}`}>{KONTAKT.email}</a> : <Offen />}
          </p>
          <p>
            Sie erreichen uns schriftlich über das <Link href="/kontakt">Kontaktformular</Link> oder – nach Registrierung – über die
            Nachrichtenfunktion im Portal. Die Postanschrift finden Sie oben.
          </p>
        </div>
      </div>

      <h2>Unternehmensangaben</h2>
      <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-ink-200/70 ring-1 ring-ink-200/70 sm:grid-cols-2">
        {[
          ["Firma und Rechtsform", `${G.name}, Gesellschaft mit beschränkter Haftung`],
          ["Sitz", `${G.ort}, ${G.land}`],
          ["Firmenbuchnummer", G.register],
          ["Firmenbuchgericht", G.gericht],
          ["UID-Nummer", G.uid || <Offen key="uid" />],
          ["Geschäftsführung", G.geschaeftsfuehrung.join(", ")],
          ...(G.vertretung ? [["Vertretung", G.vertretung]] : []),
          ...(G.kammer ? [["Kammerzugehörigkeit", G.kammer]] : []),
          ...(G.aufsichtsbehoerde ? [["Aufsichts- und Gewerbebehörde", G.aufsichtsbehoerde]] : []),
          ...(G.berufsrecht
            ? [["Berufsrecht", <>{G.berufsrecht.text}, abrufbar unter <a href={G.berufsrecht.url} rel="noopener noreferrer">{G.berufsrecht.url.replace("https://", "")}</a></>]]
            : []),
          ["Unternehmensgegenstand", G.gegenstand, true],
        ].map(([dt, dd, breit]) => (
          <div key={dt} className={`bg-white px-5 py-4 ${breit ? "sm:col-span-2" : ""}`}>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">{dt}</dt>
            <dd className="mt-1 font-medium leading-relaxed text-ink-900">{dd}</dd>
          </div>
        ))}
      </dl>

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
      {G.gesellschafter?.length > 0 && (
        <p>
          <strong>Beteiligungsverhältnisse (Gesellschafter):</strong>{" "}
          {G.gesellschafter.map((g, i) => (
            <span key={g.name}>
              {i > 0 && "; "}
              {g.name} ({g.anteil})
            </span>
          ))}
          .
        </p>
      )}
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
        </>
      )}
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/impressum", metadata, { en: metadataEn });

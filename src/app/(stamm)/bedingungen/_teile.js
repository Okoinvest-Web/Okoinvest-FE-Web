// src/app/bedingungen/_teile.js
//
// Gemeinsame Bausteine der Besonderen Bedingungen (/bedingungen/*).
// Datei mit Unterstrich = kein Route-Segment. Alle Seiten sind ENTWÜRFE zur
// anwaltlichen Prüfung und stehen bis zur Freigabe auf noindex
// (FREIGEGEBEN = true setzen, sobald die Fassungen geprüft sind; dann
// zusätzlich in Sitemap und Footer aufnehmen – Koordinator).

import Link from "@/components/Land/Link";
import { AlertTriangle } from "lucide-react";
import { abs } from "@/data/site";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { datumText } from "@/lib/sprache/format";

export const FREIGEGEBEN = false;

/** Stand der Entwürfe */
export const STAND_BEDINGUNGEN = "30. September 2026";

export const BEDINGUNGEN = [
  { href: "/bedingungen/projektboerse", titel: "Besondere Bedingungen Projektbörse", kurz: "Projektbörse" },
  { href: "/bedingungen/energiebeschaffung", titel: "Servicevertrag Energiebeschaffung", kurz: "Energiebeschaffung" },
  { href: "/bedingungen/lieferanten", titel: "Teilnahmebedingungen für Energieversorger", kurz: "Energieversorger" },
  { href: "/bedingungen/banken", titel: "Vertraulichkeitsbedingungen für Banken", kurz: "Banken" },
];

/** Englisch (Sprachmodell): Titel der besonderen Bedingungen (Übersetzung zur Information, maßgeblich ist Deutsch). */
export const BEDINGUNGEN_EN = {
  "/bedingungen/projektboerse": "Special terms for the project exchange",
  "/bedingungen/energiebeschaffung": "Energy procurement service agreement",
  "/bedingungen/lieferanten": "Terms of participation for energy suppliers",
  "/bedingungen/banken": "Confidentiality terms for banks",
};

/** Englische Metadaten je Bedingungsseite (für seitenMetadata(…, { en })) */
export function bedingungenMetadataEn({ titel, beschreibung, bildAlt = "Solar park under a blue sky" }) {
  return { title: titel, description: beschreibung, openGraph: { locale: "en_GB", title: titel, description: beschreibung, images: [{ alt: bildAlt }] } };
}

/** Metadaten je Bedingungsseite – noindex bis zur Freigabe. */
export function bedingungenMetadata({ pfad, titel, beschreibung, bild = "/img/solarpark-himmel.jpg", bildAlt = "Solarpark unter blauem Himmel" }) {
  const url = abs(pfad);
  return {
    title: titel,
    description: beschreibung,
    alternates: { canonical: url },
    robots: FREIGEGEBEN ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "de_AT",
      url,
      siteName: "ÖkoInvest",
      title: titel,
      description: beschreibung,
      images: [{ url: abs(bild), alt: bildAlt }],
    },
  };
}

/** Sichtbar markierter Platzhalter – vor Freigabe ersetzen. */
export function Platzhalter({ children }) {
  const en = spracheDerAnfrage() === "en";
  return <mark className="rounded-md bg-sun-300/40 px-1.5 py-0.5 font-semibold text-ink-900">[{en ? "Placeholder" : "Platzhalter"}: {children}]</mark>;
}

/** Entwurfs-Hinweis oben auf jeder Seite (als aside, damit .ov-legal die Innenabstände nicht zurücksetzt). */
export function EntwurfHinweis({ children }) {
  if (FREIGEGEBEN) return null;
  const en = spracheDerAnfrage() === "en";
  return (
    <aside role="note" className="mb-10 flex gap-4 rounded-2xl bg-sun-300/20 p-5 ring-1 ring-sun-300/60 md:p-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-navy-950">
        <AlertTriangle aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="font-display text-[16.5px] font-bold text-ink-900">{en ? "Draft – to be reviewed by our lawyers" : "Entwurf – anwaltlich zu prüfen"}</p>
        <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-700">
          {children ||
            (en
              ? "These terms are a draft and have not yet been legally approved. Until then, only what is expressly agreed in writing or in the portal in the individual case is binding."
              : "Diese Bedingungen sind ein Entwurf und noch nicht rechtlich freigegeben. Verbindlich ist bis dahin nur, was im Einzelfall schriftlich oder im Portal ausdrücklich vereinbart wird.")}
        </p>
      </div>
    </aside>
  );
}

/** Verweise auf die übrigen Bedingungen und die allgemeinen Rechtstexte (Seitenende). */
export function WeitereBedingungen({ pfad, stand = STAND_BEDINGUNGEN }) {
  if (spracheDerAnfrage() === "en") {
    return (
      <>
        <h2>Relationship to other provisions, version</h2>
        <p>
          The platform&apos;s <Link href="/nutzungsbedingungen">terms of use</Link> also apply; in the event of conflicts, these special terms take
          precedence, and individual written agreements take precedence over both. How we process personal data is described in the{" "}
          <Link href="/datenschutz">privacy policy</Link>. As of: {datumText(stand, "en")}.
        </p>
        <nav aria-label="More special terms" className="mt-8 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
          <p className="font-display text-[15.5px] font-bold text-ink-900">More special terms</p>
          <ul className="mt-2 space-y-1 text-[15px]">
            {BEDINGUNGEN.filter((b) => b.href !== pfad).map((b) => (
              <li key={b.href}>
                <Link href={b.href}>{BEDINGUNGEN_EN[b.href] ?? b.titel}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </>
    );
  }
  return (
    <>
      <h2>Verhältnis zu anderen Regelungen, Stand</h2>
      <p>
        Ergänzend gelten die <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link> der Plattform; bei Widersprüchen gehen diese
        besonderen Bedingungen vor, individuelle schriftliche Vereinbarungen gehen beiden vor. Wie wir personenbezogene Daten verarbeiten,
        beschreibt die <Link href="/datenschutz">Datenschutzerklärung</Link>. Stand: {stand}.
      </p>
      <nav aria-label="Weitere besondere Bedingungen" className="mt-8 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/60">
        <p className="font-display text-[15.5px] font-bold text-ink-900">Weitere besondere Bedingungen</p>
        <ul className="mt-2 space-y-1 text-[15px]">
          {BEDINGUNGEN.filter((b) => b.href !== pfad).map((b) => (
            <li key={b.href}>
              <Link href={b.href}>{b.titel}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

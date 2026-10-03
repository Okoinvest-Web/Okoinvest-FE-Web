// src/app/bedingungen/_teile.js
//
// Gemeinsame Bausteine der Besonderen Bedingungen (/bedingungen/*).
// Datei mit Unterstrich = kein Route-Segment. Alle Seiten sind ENTWÜRFE zur
// anwaltlichen Prüfung und stehen bis zur Freigabe auf noindex
// (FREIGEGEBEN = true setzen, sobald die Fassungen geprüft sind; dann
// zusätzlich in Sitemap und Footer aufnehmen – Koordinator).

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { abs } from "@/data/site";

export const FREIGEGEBEN = false;

/** Stand der Entwürfe */
export const STAND_BEDINGUNGEN = "30. September 2026";

export const BEDINGUNGEN = [
  { href: "/bedingungen/projektboerse", titel: "Besondere Bedingungen Projektbörse", kurz: "Projektbörse" },
  { href: "/bedingungen/energiebeschaffung", titel: "Servicevertrag Energiebeschaffung", kurz: "Energiebeschaffung" },
  { href: "/bedingungen/lieferanten", titel: "Teilnahmebedingungen für Energieversorger", kurz: "Energieversorger" },
  { href: "/bedingungen/banken", titel: "Vertraulichkeitsbedingungen für Banken", kurz: "Banken" },
];

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
  return <mark className="rounded-md bg-sun-300/40 px-1.5 py-0.5 font-semibold text-ink-900">[Platzhalter: {children}]</mark>;
}

/** Entwurfs-Hinweis oben auf jeder Seite (als aside, damit .ov-legal die Innenabstände nicht zurücksetzt). */
export function EntwurfHinweis({ children }) {
  if (FREIGEGEBEN) return null;
  return (
    <aside role="note" className="mb-10 flex gap-4 rounded-2xl bg-sun-300/20 p-5 ring-1 ring-sun-300/60 md:p-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-navy-950">
        <AlertTriangle aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="font-display text-[16.5px] font-bold text-ink-900">Entwurf – anwaltlich zu prüfen</p>
        <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-700">
          {children ||
            "Diese Bedingungen sind ein Entwurf und noch nicht rechtlich freigegeben. Verbindlich ist bis dahin nur, was im Einzelfall schriftlich oder im Portal ausdrücklich vereinbart wird."}
        </p>
      </div>
    </aside>
  );
}

/** Verweise auf die übrigen Bedingungen und die allgemeinen Rechtstexte (Seitenende). */
export function WeitereBedingungen({ pfad, stand = STAND_BEDINGUNGEN }) {
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

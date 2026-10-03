"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Clock, Mail, MapPin, Phone } from "lucide-react";

import CookieBanner from "../Cookies/cookiecomponent";
import { NAVIGATION } from "@/data/navigation";
import { GESELLSCHAFT, KONTAKT, SITE } from "@/data/site";
import LiveTicker from "@/components/ui/LiveTicker";
import Logo from "@/components/ui/Logo";
import Stagger from "@/components/ui/Stagger";

// Spalten aus der zentralen Navigation ableiten
const spalte = (titel, neu) => {
  const n = NAVIGATION.find((x) => x.title === titel);
  return n ? { titel: neu || n.title, links: n.groups.flatMap((g) => g.items).map(({ name, href }) => ({ name, href })) } : null;
};

const SPALTEN = [
  spalte("Lösungen"),
  spalte("Für Sie", "Zielgruppen"),
  spalte("Energie"),
  {
    titel: "Plattform & Wissen",
    links: [
      { name: "Projektbörse", href: "/projektboerse" },
      { name: "Projekt anbieten", href: "/projektboerse/anbieten" },
      { name: "Bestandsanlagen", href: "/bestandsanlagen" },
      { name: "Marktdaten", href: "/marktdaten" },
      { name: "Regionen DACH", href: "/regionen" },
      { name: "Alle Rechner", href: "/rechner" },
      { name: "Ratgeber", href: "/ratgeber" },
      { name: "Lexikon", href: "/wissen/lexikon" },
      { name: "FAQ", href: "/faq" },
      { name: "Über ÖkoInvest", href: "/unternehmen" },
      { name: "Referenzen", href: "/referenzen" },
      { name: "Warum ÖkoInvest", href: "/warum-oekoinvest" },
      { name: "English", href: "/en" },
      { name: "Kontakt", href: "/kontakt" },
      { name: "Portal-Login", href: "/login" },
    ],
  },
].filter(Boolean);

export default function Footer() {
  const [popup, setPopup] = useState(false);
  const jahr = new Date().getFullYear();

  return (
    <footer role="contentinfo" aria-label="Fußbereich ÖkoInvest" className="ov-noise relative isolate overflow-hidden bg-navy-950 text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-60" />
      <div aria-hidden="true" className="absolute -left-40 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-ov-500/15 blur-[140px]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />

      <div className="ov-container pt-16 md:pt-20">
        {/* Kopfzeile */}
        <div className="flex flex-col gap-8 border-b border-white/10 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <Link href="/" className="block h-[58px]" aria-label="Zur Startseite">
              <Logo tone="dark" />
            </Link>
            <p className="mt-6 font-display text-[clamp(1.4rem,1.1rem+1vw,2rem)] font-bold leading-tight tracking-tight">
              Flächen. Projekte. Kapital. <span className="ov-text-gradient-light">Strom für den Mittelstand.</span>
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/flaechencheck" className="ov-press group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold shadow-gruen transition-[background-color,transform] hover:bg-ov-700">
              Fläche prüfen
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 ease-ov-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5" />
            </Link>
            <Link href="/projektboerse" className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10">
              Zur Projektbörse
            </Link>
          </div>
        </div>

        {/* Linkspalten */}
        <Stagger schritt={70} className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          <div className="space-y-6 text-[15px] text-white/70">
            <div className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
              <address className="not-italic">
                {GESELLSCHAFT.name}<br />
                {KONTAKT.strasse}<br />
                {KONTAKT.ort}, {KONTAKT.land}
              </address>
            </div>
            <p className="flex gap-3">
              <Building2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
              <span>{GESELLSCHAFT.register} · {GESELLSCHAFT.gericht}</span>
            </p>
            {KONTAKT.email && (
              <p className="flex gap-3">
                <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
                <a href={`mailto:${KONTAKT.email}`} className="transition-colors hover:text-white">{KONTAKT.email}</a>
              </p>
            )}
            {KONTAKT.telefon && (
              <p className="flex gap-3">
                <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
                <a href={KONTAKT.telefonHref} className="transition-colors hover:text-white">{KONTAKT.telefon}</a>
              </p>
            )}
            <div className="flex gap-3">
              <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {KONTAKT.oeffnungszeiten.map((o) => (
                  <div key={o.tage} className="contents">
                    <dt>{o.tage}</dt>
                    <dd className="ov-num text-white">{o.zeit}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="text-[13.5px] leading-relaxed text-white/55">
              Ein Unternehmen der{" "}
              <a href={SITE.gruppeUrl} target="_blank" rel="noopener noreferrer" className="text-white/80 underline decoration-white/30 hover:text-white">ÖKOVOLT Gruppe</a>
              {" "}– seit 2010 Solarkraftwerke planen, bauen und betreiben.
            </p>
          </div>

          {SPALTEN.map((s) => (
            <nav key={s.titel} aria-label={s.titel}>
              {/* role="heading" statt <h2>: globale h2-Regeln (Display-Schrift, Laufweite) würden das Aussehen ändern */}
              <p role="heading" aria-level={2} className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">{s.titel}</p>
              <ul className="mt-5 space-y-3">
                {s.links.map((l) => (
                  <li key={l.href + l.name}>
                    <Link
                      href={l.href}
                      className="relative text-[14.5px] text-white/75 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-ov-300/70 after:transition-transform after:duration-300 after:ease-ov-out hover:text-ov-300 hover:after:scale-x-100 focus-visible:after:scale-x-100"
                    >
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </Stagger>

        {/* Live-Leiste */}
        <div className="flex flex-col gap-4 rounded-2xl bg-white/[0.04] px-5 py-4 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between">
          <LiveTicker />
          <p className="text-[12px] text-white/60">Daten: Fraunhofer ISE Energy-Charts (CC BY 4.0)</p>
        </div>

        {/* Rechtliches */}
        <div className="flex flex-col gap-4 py-8 text-[13.5px] text-white/50 md:flex-row md:items-center md:justify-between">
          <p suppressHydrationWarning>© {jahr} {GESELLSCHAFT.name} · Alle Rechte vorbehalten</p>
          <nav aria-label="Rechtliche Links">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li><button type="button" onClick={() => setPopup(true)} className="transition-colors hover:text-white">Privatsphäre-Einstellungen</button></li>
              <li><Link href="/impressum" className="transition-colors hover:text-white">Impressum</Link></li>
              <li><Link href="/datenschutz" className="transition-colors hover:text-white">Datenschutz</Link></li>
              <li><Link href="/nutzungsbedingungen" className="transition-colors hover:text-white">Nutzungsbedingungen</Link></li>
              <li><Link href="/barrierefreiheit" className="transition-colors hover:text-white">Barrierefreiheit</Link></li>
            </ul>
          </nav>
        </div>
      </div>

      {popup && <CookieBanner forceShow={popup} onClose={() => setPopup(false)} />}
    </footer>
  );
}

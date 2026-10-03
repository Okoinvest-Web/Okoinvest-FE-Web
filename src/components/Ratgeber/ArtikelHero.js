// Artikel-Hero im Stil der Produktseiten: dunkle Bühne, Titel links,
// gerahmtes Titelbild rechts mit schwebender Kennzahl.
import Image from "next/image";
import HeroTitel from "@/components/Unternehmen/HeroTitel";
import { BadgeCheck, CalendarClock, Clock, ListTree } from "lucide-react";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { datumLang } from "@/lib/ratgeber";
import { thema, themaAnker } from "./themen";

/**
 * props:
 *  artikel   Eintrag aus @/lib/ratgeber
 *  titel     h1 (JSX erlaubt), Standard artikel.title
 *  kennzahl  { wert, text } – schwebende Kennzahl auf dem Bild
 *  badge     JSX – Alternative zur Kennzahl (ältere Aufrufe)
 *  abschnitte Anzahl Kapitel (für die Meta-Zeile)
 */
export default function ArtikelHero({ artikel, titel, kennzahl, badge, abschnitte }) {
  const meta = thema(artikel.kategorie);
  const Icon = meta.icon;
  const quellen = artikel.quellen?.length || 0;

  return (
    <section aria-labelledby="artikel-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[480px] w-[480px] rounded-full bg-ov-500/20 blur-[120px]" />

      <div className="ov-container pb-14 pt-6 sm:pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ name: "Ratgeber", href: "/ratgeber" }, { name: artikel.kurzTitel || artikel.title }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-x-12 xl:gap-x-16">
          <div className="min-w-0">
            <a
              href={`/ratgeber#${themaAnker(artikel.kategorie)}`}
              className="ov-hero-in group inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.06] py-1.5 pl-2 pr-3.5 text-[13px] font-medium text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
              style={{ "--ov-delay": "40ms" }}
            >
              <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-ov-300 text-navy-950">
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 truncate">{artikel.kategorie}</span>
            </a>

            <h1 id="artikel-titel" className="ov-h1 mt-6 text-balance md:mt-7">
              <HeroTitel>{titel || artikel.title}</HeroTitel>
            </h1>

            {artikel.excerpt && (
              <p className="ov-lead ov-hero-in mt-5 max-w-[40rem] text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
                {artikel.excerpt}
              </p>
            )}

            <div className="ov-hero-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-white/10 pt-6 md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <div className="flex items-center gap-3">
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-[14px] font-extrabold text-navy-950">
                  ÖI
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ov-500 text-white ring-2 ring-navy-950">
                    <BadgeCheck aria-hidden="true" className="h-2.5 w-2.5" />
                  </span>
                </span>
                <div className="leading-tight">
                  <p className="text-[14.5px] font-semibold text-white">Projektteam ÖkoInvest</p>
                  <p className="text-[12.5px] text-white/60">Projektentwicklung Freiflächen- und Agri-PV</p>
                </div>
              </div>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-white/75">
                <li className="flex items-center gap-2">
                  <CalendarClock aria-hidden="true" className="h-4 w-4 text-ov-300" />
                  <span>
                    Aktualisiert <time dateTime={artikel.aktualisiert}>{datumLang(artikel.aktualisiert)}</time>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock aria-hidden="true" className="h-4 w-4 text-ov-300" />
                  {artikel.lesezeit} Min. Lesezeit
                </li>
                {abschnitte > 0 && (
                  <li className="flex items-center gap-2">
                    <ListTree aria-hidden="true" className="h-4 w-4 text-ov-300" />
                    {abschnitte} Kapitel{quellen > 0 ? ` · ${quellen} Quellen` : ""}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {artikel.bild && (
            <figure className="ov-hero-in relative mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none" style={{ "--ov-delay": "200ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.2),transparent_70%)] blur-2xl" />
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.75rem] bg-navy-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 lg:aspect-[5/4]">
                <Image src={artikel.bild} alt={artikel.bildAlt || ""} fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
              </div>
              {(kennzahl || badge) && (
                <div className="relative -mt-10 ml-4 mr-4 sm:absolute sm:-bottom-8 sm:left-auto sm:right-6 sm:m-0 sm:max-w-[300px] lg:-left-8 lg:right-auto">
                  {kennzahl ? (
                    <div className="rounded-2xl bg-white p-5 text-ink-900 shadow-e4 ring-1 ring-ink-100">
                      <p className="ov-overline text-ov-700">Kennzahl</p>
                      <p className="ov-kpi mt-2 text-ink-900">{kennzahl.wert}</p>
                      <p className="mt-1.5 text-[13px] leading-snug text-ink-600">{kennzahl.text}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white p-5 text-ink-900 shadow-e4 ring-1 ring-ink-100">{badge}</div>
                  )}
                </div>
              )}
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

// Hero der Ratgeber-Übersicht: Suche als Hauptaktion, rechts eine Magazin-Bühne
// mit den drei empfohlenen Artikeln und dem Themenmix (echte Artikelzahlen).
import Image from "next/image";
import HeroTitel from "@/components/Unternehmen/HeroTitel";
import Link from "@/components/Land/Link";
import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { cn } from "@/components/ui/cn";
import { artikelPfad, datumLang, kategorieName } from "@/lib/ratgeber";
import HeroSuche from "./HeroSuche";
import { TON, thema } from "./themen";

// Sprachmodell: feste Texte des Heros (Server-Komponente, Sprache kommt von der Seite)
const TEXTE = {
  de: {
    ratgeber: "Ratgeber",
    stand: "Stand",
    zuletzt: "zuletzt aktualisiert",
    titel: (
      <>
        Wissen für <span className="ov-text-gradient-light">Fläche, Projekt und Kapital.</span>
      </>
    ),
    lead: (
      <>
        Was bringt eine Fläche an Pacht, wie läuft ein Bebauungsplan, was ist ein Projekt in welcher Phase wert und wie funktionieren PPA und
        Energiegemeinschaften? <span className="font-medium text-white">Fachartikel für Deutschland, Österreich und die Schweiz</span> – mit Quellen,
        Rechenbeispielen und ehrlichen Grenzen.
      </>
    ),
    anfang: "Hier fangen die meisten an",
    lesezeit: (m) => `${m} Min. Lesezeit`,
    mix: "Themenmix",
    artikel: (n) => `${n} Artikel`,
  },
  en: {
    ratgeber: "Guides",
    stand: "As of",
    zuletzt: "last updated",
    titel: (
      <>
        Knowledge for <span className="ov-text-gradient-light">land, projects and capital.</span>
      </>
    ),
    lead: (
      <>
        What lease can land earn, how does a development plan work, what is a project worth in which phase, and how do PPAs and energy
        communities work? <span className="font-medium text-white">Specialist articles for Germany, Austria and Switzerland</span> – with sources,
        worked examples and honest limits. Articles marked “in German” have not yet been translated.
      </>
    ),
    anfang: "Where most readers start",
    lesezeit: (m) => `${m} min read`,
    mix: "Topic mix",
    artikel: (n) => `${n} articles`,
  },
};

/**
 * props:
 *  empfohlen  [artikel, artikel, artikel] – Titelgeschichte zuerst
 *  themen     [{ name, anzahl }]
 *  kennzahlen [{ wert, label }]
 *  stand      Text, z. B. „September 2026“
 *  aktualisiert ISO-Datum des zuletzt aktualisierten Artikels
 */
export default function RatgeberHero({ empfohlen = [], themen = [], kennzahlen = [], stand, aktualisiert, sprache = "de" }) {
  const t = TEXTE[sprache] || TEXTE.de;
  const [titel, ...weitere] = empfohlen;
  const gesamt = themen.reduce((s, t) => s + t.anzahl, 0) || 1;

  return (
    <section aria-labelledby="ratgeber-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/60" />

      <div className="ov-container pb-20 pt-6 sm:pt-8 md:pb-28 md:pt-10">
        <Breadcrumbs items={[{ name: t.ratgeber }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12 xl:gap-x-20">
          {/* ---------- Text ---------- */}
          <div className="max-w-[37rem]">
            <p
              className="ov-hero-in inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15"
              style={{ "--ov-delay": "40ms" }}
            >
              <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{t.stand}</span>
              <span className="min-w-0 truncate">
                {stand} · {t.zuletzt} <time dateTime={aktualisiert}>{datumLang(aktualisiert, sprache)}</time>
              </span>
            </p>

            <h1 id="ratgeber-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <HeroTitel>{t.titel}</HeroTitel>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {t.lead}
            </p>

            <div className="ov-hero-in mt-8 md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <HeroSuche />
            </div>

            {kennzahlen.length > 0 && (
              <dl className="ov-hero-in mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-7 sm:gap-6" style={{ "--ov-delay": "340ms" }}>
                {kennzahlen.map((k) => (
                  <div key={k.label} className="min-w-0">
                    <dt className="sr-only">{k.label}</dt>
                    <dd className="ov-kpi text-white">{k.wert}</dd>
                    <dd className="mt-1.5 text-[13px] leading-snug text-white/65">{k.label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* ---------- Magazin-Bühne ---------- */}
          {titel && (
            <div className="ov-hero-in relative mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none" style={{ "--ov-delay": "220ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -inset-y-14 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />

              <p className="mb-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">
                <span aria-hidden="true" className="h-px w-8 bg-ov-300/60" />
                {t.anfang}
              </p>

              <div className="relative">
                {/* Hintere Karten als angedeuteter Stapel (dekorativ) */}
                {weitere.slice(0, 2).map((a, i) => (
                  <div
                    key={a.slug}
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-6 top-0 hidden h-full overflow-hidden rounded-[1.75rem] ring-1 ring-white/10 sm:block",
                      i === 0 ? "-translate-y-4 scale-[0.96] opacity-70" : "-translate-y-8 scale-[0.92] opacity-40"
                    )}
                  >
                    <Image src={a.bild} alt="" fill sizes="480px" className="object-cover" />
                    <div className="absolute inset-0 bg-navy-950/60" />
                  </div>
                ))}

                {/* Titelgeschichte */}
                <article className="group relative overflow-hidden rounded-[1.75rem] bg-white text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-ov-300">
                  <div className="relative aspect-[16/9] overflow-hidden bg-ink-100">
                    <Image
                      src={titel.bild}
                      alt={titel.bildAlt}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/55 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-ink-800 shadow-sm">
                      {titel.kategorieLabel || titel.kategorie}
                    </span>
                    <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-navy-950/70 px-3 py-1 text-[12px] font-medium text-white backdrop-blur">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                      {t.lesezeit(titel.lesezeit)}
                    </span>
                  </div>
                  <div className="flex items-start gap-4 p-5 sm:p-6">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-[19px] font-extrabold leading-snug tracking-tight sm:text-[21px]">
                        <Link href={artikelPfad(titel.slug)} className="outline-none after:absolute after:inset-0 after:content-['']">
                          {titel.title}
                        </Link>
                      </h2>
                      <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-ink-600">{titel.excerpt}</p>
                    </div>
                    <span aria-hidden="true" className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ov-600 text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none sm:flex">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              </div>

              {/* Zwei weitere Empfehlungen als kompakte Links */}
              {weitere.length > 0 && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {weitere.slice(0, 2).map((a) => (
                    <li key={a.slug} className="flex">
                      <Link
                        href={artikelPfad(a.slug)}
                        className="group flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                      >
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
                          <Image src={a.bild} alt="" fill sizes="56px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ov-300">{a.kategorieLabel || a.kategorie}</span>
                          <span className="mt-0.5 block text-[14.5px] font-semibold leading-snug text-white">{a.kurzTitel || a.title}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transition-none" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* Themenmix: Anteil der Artikel je Themenbereich */}
              {themen.length > 0 && (
                <figure className="ov-glass mt-4 rounded-2xl p-4 sm:p-5">
                  <figcaption className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="font-semibold uppercase tracking-[0.12em] text-white/70">{t.mix}</span>
                    <span className="ov-num text-white/60">{t.artikel(gesamt)}</span>
                  </figcaption>
                  <div className="mt-3 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
                    {themen.map((th) => (
                      <span key={th.name} className={cn("h-full rounded-full", TON[thema(th.name).ton].balken)} style={{ width: `${(th.anzahl / gesamt) * 100}%` }} />
                    ))}
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] text-white/75 sm:grid-cols-3">
                    {themen.map((th) => (
                      <li key={th.name} className="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", TON[thema(th.name).ton].balken)} />
                        <span className="min-w-0 truncate">{kategorieName(th.name, sprache)}</span>
                        <span className="ov-num ml-auto text-white/55">{th.anzahl}</span>
                      </li>
                    ))}
                  </ul>
                </figure>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

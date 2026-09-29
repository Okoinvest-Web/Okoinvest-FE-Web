import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, BadgeCheck, CalendarClock, Check, Clock, Hash, Info, Lightbulb, Scale } from "lucide-react";

import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import InlineText from "./InlineText";
import { artikelPfad, datumLang, weitereArtikel } from "@/lib/ratgeber";

/* ------------------------------------------------------------------
   Redaktionelle Bausteine für Ratgeber-Artikel (Magazin-Look).
   Server-Komponenten – kein JavaScript im Browser nötig.
   ------------------------------------------------------------------ */

/** Abschnitt mit Anker: h2 mit Sprunglink, Abstand zur klebenden Navigation. */
export function Abschnitt({ id, titel, children, className }) {
  return (
    <section id={id} aria-labelledby={`${id}-titel`} className={cn("scroll-mt-28 pt-14 first:pt-0", className)}>
      <h2 id={`${id}-titel`} className="group font-display text-[clamp(1.5rem,1.2rem+1vw,2.05rem)] font-extrabold leading-[1.15] tracking-tight text-ink-900">
        {titel}
        <a
          href={`#${id}`}
          aria-label={`Direktlink zu „${typeof titel === "string" ? titel : id}“`}
          className="ml-2 inline-flex translate-y-[-2px] align-middle text-ink-300 opacity-0 transition-opacity hover:text-ov-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Hash aria-hidden="true" className="h-5 w-5" />
        </a>
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Fließtext im Artikelstil (`ov-prose`). */
export function Prosa({ children, className }) {
  return <div className={cn("ov-prose max-w-[68ch]", className)}>{children}</div>;
}

/** Zwischenüberschrift h3 im Artikel. */
export function Zwischentitel({ children, className }) {
  return <h3 className={cn("mt-10 font-display text-[20px] font-bold leading-snug text-ink-900", className)}>{children}</h3>;
}

/** Interner Link im Fließtext. */
export function TextLink({ href, children }) {
  return (
    <Link href={href} className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-[3px] transition-colors hover:decoration-current">
      {children}
    </Link>
  );
}

/** „Das Wichtigste in Kürze“ – zitierfähige Kernaussagen oben im Artikel. */
export function KurzFazit({ punkte = [], id = "kurz", titel = "Das Wichtigste in Kürze" }) {
  return (
    <section id={id} aria-labelledby={`${id}-titel`} className="scroll-mt-28">
      <div className="relative overflow-hidden rounded-3xl bg-ov-50 p-6 ring-1 ring-ov-100 md:p-8">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-ov-200/50 blur-3xl" />
        <h2 id={`${id}-titel`} className="relative flex items-center gap-2.5 font-display text-[19px] font-extrabold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ov-500 text-white">
            <Lightbulb aria-hidden="true" className="h-4 w-4" />
          </span>
          {titel}
        </h2>
        <ul className="relative mt-5 space-y-3.5">
          {punkte.map((p, i) => (
            <li key={typeof p === "string" ? p : i} className="flex gap-3 text-[16px] leading-relaxed text-ink-700">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-ov-600 ring-1 ring-ov-200">
                <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const KASTEN = {
  info: { icon: Info, rahmen: "bg-navy-50/60 ring-navy-100", icon_c: "bg-navy-700 text-white", titel: "Gut zu wissen" },
  tipp: { icon: Lightbulb, rahmen: "bg-ov-50 ring-ov-100", icon_c: "bg-ov-500 text-white", titel: "Unser Tipp" },
  wichtig: { icon: AlertTriangle, rahmen: "bg-sun-300/20 ring-sun-300/60", icon_c: "bg-sun-400 text-navy-950", titel: "Wichtig" },
  recht: { icon: Scale, rahmen: "bg-sand-100 ring-ink-200/70", icon_c: "bg-ink-900 text-white", titel: "Rechtslage" },
};

/** Info-/Merkkasten. variant: info | tipp | wichtig | recht */
export function Merkkasten({ variant = "info", titel, children, className }) {
  const k = KASTEN[variant] || KASTEN.info;
  const Icon = k.icon;
  return (
    // role="note" statt <aside>: Merkkästen stehen im Artikel, keine eigenständige Landmark
    <div role="note" className={cn("my-8 flex gap-4 rounded-2xl p-5 ring-1 md:p-6", k.rahmen, className)}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", k.icon_c)}>
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[16.5px] font-bold text-ink-900">{titel || k.titel}</p>
        <div className="mt-1.5 text-[15.5px] leading-relaxed text-ink-700 [&_a]:font-medium [&_a]:text-ov-700 [&_a]:underline [&_a]:decoration-ov-300 [&_a]:underline-offset-2">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Große Kennzahl-Hervorhebung (dunkel). */
export function Kennzahlband({ icon: Icon, titel, text, wert }) {
  return (
    <div className="ov-noise relative my-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
      <div aria-hidden="true" className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-ov-500/30 blur-[80px]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        {wert ? (
          <p className="ov-num shrink-0 font-display text-[40px] font-extrabold leading-none tracking-tight text-ov-300 md:text-[48px]">{wert}</p>
        ) : (
          Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300">
              <Icon aria-hidden="true" className="h-6 w-6" />
            </span>
          )
        )}
        <div className="sm:border-l sm:border-white/15 sm:pl-6">
          <p className="font-display text-[18px] font-bold">{titel}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{text}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Tabelle im Magazinstil. Echte <table> (Featured Snippets), horizontal
 * scrollbar nur innerhalb des Rahmens.
 * kopf: ["Spalte", ...]; zeilen: [[th, td, td], ...]; hervorheben: Spaltenindex
 */
export function Tabelle({ caption, kopf = [], zeilen = [], hervorheben, fussnote, minBreite = 520, markierteZeile }) {
  return (
    <figure className="my-8">
      {/* Scrollbarer Bereich per Tastatur erreichbar (WCAG 2.1.1) */}
      <div tabIndex={0} role="region" aria-label={caption || "Tabelle"} className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ink-200/80">
        <table className="w-full border-collapse text-left text-[15px]" style={{ minWidth: minBreite }}>
          <caption className="sr-only">{caption}</caption>
          {kopf.length > 0 && (
            <thead>
              <tr className="border-b border-ink-200 bg-sand-50">
                {kopf.map((k) => (
                  <th key={k} scope="col" className="px-5 py-3.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-600">
                    {k || <span className="sr-only">Merkmal</span>}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-ink-100">
            {zeilen.map((z, i) => (
              <tr key={i} className={cn("transition-colors hover:bg-sand-50/70", markierteZeile === i && "bg-ov-50/70")}>
                {z.map((zelle, j) =>
                  j === 0 ? (
                    <th key={j} scope="row" className="px-5 py-3.5 font-semibold text-ink-900">
                      {zelle}
                    </th>
                  ) : (
                    <td key={j} className={cn("ov-num px-5 py-3.5", hervorheben === j ? "font-bold text-ov-700" : "text-ink-700")}>
                      {zelle}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fussnote && <figcaption className="mt-3 text-[13px] leading-relaxed text-ink-500">{typeof fussnote === "string" ? <InlineText text={fussnote} /> : fussnote}</figcaption>}
    </figure>
  );
}

/** Karten-Raster innerhalb des Artikels (z. B. Kostenbestandteile). */
export function KartenRaster({ items = [], cols = 2 }) {
  return (
    <div className={cn("my-8 grid gap-3", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
      {items.map((it, i) => (
        <div key={it.titel} className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
          <p className="flex items-center gap-2.5 font-display text-[16.5px] font-bold text-ink-900">
            {it.icon ? (
              <it.icon aria-hidden="true" className="h-[18px] w-[18px] text-ov-600" />
            ) : (
              <span className="ov-num flex h-6 w-6 items-center justify-center rounded-md bg-ov-50 text-[12px] font-bold text-ov-700">{i + 1}</span>
            )}
            {it.titel}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{it.text}</p>
        </div>
      ))}
    </div>
  );
}

/** Checkliste ohne Aufzählungspunkte. */
export function Checkliste({ punkte = [] }) {
  return (
    <ul className="my-6 space-y-3">
      {punkte.map((p) => (
        <li key={typeof p === "string" ? p : p.key} className="flex gap-3 text-[16px] leading-relaxed text-ink-700">
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white">
            <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

/** Nummerierter Ablauf im Artikel mit Verbindungslinie. */
export function Ablauf({ schritte = [] }) {
  return (
    <ol className="relative my-8 space-y-6 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-ov-200">
      {schritte.map(([titel, text], i) => (
        <li key={titel} className="relative flex gap-5">
          <span className="ov-num relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-display text-[15px] font-extrabold text-ov-700 ring-2 ring-ov-200">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="pt-1.5">
            <h3 className="font-display text-[17.5px] font-bold text-ink-900">{titel}</h3>
            <p className="mt-1.5 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-600">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Meta-Zeile für den Artikel-Hero: Autor, Datum, Lesezeit. */
export function ArtikelMeta({ artikel }) {
  return (
    <div className="ov-hero-in mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink-200 pt-7" style={{ "--ov-delay": "300ms" }}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-navy-950 font-display text-[14px] font-extrabold text-white ring-2 ring-white">
          ÖV
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ov-500 ring-2 ring-white">
            <BadgeCheck aria-hidden="true" className="h-2.5 w-2.5" />
          </span>
        </span>
        <div className="leading-tight">
          <p className="text-[14.5px] font-semibold text-ink-900">Ökovolt-Redaktion</p>
          <p className="text-[12.5px] text-ink-500">Fachbetrieb für Photovoltaik</p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-[14px] text-ink-600">
        <CalendarClock aria-hidden="true" className="h-4 w-4 text-ov-600" />
        Aktualisiert <time dateTime={artikel.aktualisiert}>{datumLang(artikel.aktualisiert)}</time>
      </p>
      <p className="flex items-center gap-2 text-[14px] text-ink-600">
        <Clock aria-hidden="true" className="h-4 w-4 text-ov-600" />
        {artikel.lesezeit} Min. Lesezeit
      </p>
    </div>
  );
}

/** Autorenbox am Artikelende (E-E-A-T). */
export function Autorenbox({ artikel }) {
  return (
    <div className="mt-16 flex flex-col gap-5 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 sm:flex-row sm:items-start md:p-8">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy-950 font-display text-[20px] font-extrabold text-white">ÖV</span>
      <div>
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">Über die Redaktion</p>
        <p className="mt-1.5 font-display text-[19px] font-extrabold text-ink-900">Ökovolt-Redaktion</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          Geschrieben von unseren Fachleuten aus Planung und Montage – dem Fachbetrieb für Photovoltaik aus Türkheim mit über 15 Jahren Erfahrung.
          Zahlen und Rechtsstand prüfen wir regelmäßig; zuletzt am <time dateTime={artikel.aktualisiert}>{datumLang(artikel.aktualisiert)}</time>.
          Die Inhalte ersetzen keine Steuer- oder Rechtsberatung.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          <Link href="/uber-uns/team" className="font-semibold text-ov-700 hover:underline">Unser Team</Link>
          <Link href="/wissen/lexikon" className="font-semibold text-ov-700 hover:underline">Photovoltaik-Lexikon</Link>
          <a href="mailto:office@oekovolt.de" className="font-semibold text-ov-700 hover:underline">Fehler gefunden? Schreiben Sie uns</a>
        </p>
      </div>
    </div>
  );
}

/** Kleine Verweis-Karten („Passend dazu“). */
export function LinkKarten({ links = [] }) {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {links.map((l) => (
        <li key={l.href} className="flex">
          <Link href={l.href} className="group ov-card-hover flex w-full items-start justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 hover:ring-ov-200">
            <span>
              <span className="block font-display text-[16.5px] font-bold text-ink-900 transition-colors group-hover:text-ov-700">{l.titel}</span>
              <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-600">{l.text}</span>
            </span>
            <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-600" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Artikelkarte für Hub und „Weitere Artikel“. */
export function ArtikelKarte({ artikel, gross = false, delay = 0 }) {
  return (
    <Reveal as="article" delay={delay} className="flex">
      <div className="group ov-card-hover relative flex w-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70 focus-within:ring-2 focus-within:ring-ov-500 hover:ring-ov-200">
        <div className={cn("relative overflow-hidden bg-ink-100", gross ? "aspect-[16/10] lg:aspect-auto lg:min-h-[320px] lg:flex-1" : "aspect-[16/10]")}>
          <Image
            src={artikel.bild}
            alt={artikel.bildAlt}
            fill
            sizes={gross ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 768px) 100vw, 33vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-ink-800 shadow-sm backdrop-blur">
            {artikel.kategorie}
          </span>
        </div>
        <div className={cn("flex flex-col p-6", gross ? "md:p-8" : "flex-1")}>
          <h3 className={cn("font-display font-extrabold leading-snug tracking-tight text-ink-900 transition-colors group-hover:text-ov-700", gross ? "text-[clamp(1.4rem,1.1rem+1vw,1.9rem)]" : "text-[19px]")}>
            {/* Stretched Link: genau EIN Link je Karte */}
            <Link href={artikelPfad(artikel.slug)} className="outline-none after:absolute after:inset-0 after:content-['']">
              {artikel.title}
            </Link>
          </h3>
          <p className={cn("mt-3 text-ink-600", gross ? "text-[16.5px] leading-relaxed" : "line-clamp-3 text-[15px] leading-relaxed")}>{artikel.excerpt}</p>
          <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-[13px] text-ink-500">
            <span className="flex items-center gap-3">
              <time dateTime={artikel.aktualisiert}>{datumLang(artikel.aktualisiert)}</time>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ink-300" />
              <span className="flex items-center gap-1.5">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                {artikel.lesezeit} Min.
              </span>
            </span>
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-all group-hover:bg-ov-500 group-hover:text-white">
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/** „Weiterlesen“-Raster am Artikelende. */
export function WeitereArtikel({ slug }) {
  const liste = weitereArtikel(slug, 3);
  if (liste.length === 0) return null;
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2", liste.length >= 3 && "lg:grid-cols-3")}>
      {liste.map((a, i) => (
        <ArtikelKarte key={a.slug} artikel={a} delay={i * 80} />
      ))}
    </div>
  );
}

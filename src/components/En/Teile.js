// Gemeinsame Abschnittsbausteine der englischen Seiten (Server-Komponenten).
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";

/**
 * Faktenleiste, die den Hero unten überlappt (wie Referenzseite).
 * items: [{ icon, wert, einheit, text }]
 */
export function FaktenLeiste({ titel, items }) {
  return (
    <section data-abschnitt="fakten" aria-label={titel} className="relative z-10 -mt-10 md:-mt-14">
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className={cn("grid px-5 sm:grid-cols-2 sm:px-2 lg:px-0 lg:py-3", items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {items.map((f, i) => (
              <div
                key={f.einheit}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i === 2 && items.length === 3 && "sm:col-span-2 lg:col-span-1",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-1 row-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-2 row-start-1 flex items-center gap-3 lg:col-start-1 lg:row-start-1">
                  {f.icon && (
                    <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                      <f.icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="ov-kpi-l ov-num block whitespace-nowrap text-right text-ink-900 lg:text-left">{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * Wegweiser-Karten: große, klickbare Routen mit Nummer und Pfeil.
 * items: [{ href, icon, titel, text, label, hrefLang?, hervor? }]
 */
export function Wegweiser({ items, className }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((w, i) => (
        <Reveal as="li" key={w.href} delay={i * 60} className="h-full">
          <Link
            href={w.href}
            hrefLang={w.hrefLang}
            className={cn(
              "ov-lift group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] p-6 ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 md:p-7",
              w.hervor ? "ov-verlauf-nacht text-white ring-white/10" : "bg-white text-ink-900 ring-ink-200/80 hover:ring-ov-300"
            )}
          >
            {w.hervor && <span aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40" />}
            <span className="relative flex items-start justify-between gap-4">
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-colors", w.hervor ? "bg-white/10 text-ov-300 ring-white/15" : "bg-ov-50 text-ov-600 ring-ov-200 group-hover:bg-ov-600 group-hover:text-white")}>
                <w.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className={cn("ov-num font-display text-[13px] font-extrabold tracking-[0.12em]", w.hervor ? "text-white/40" : "text-ink-300")}>{String(i + 1).padStart(2, "0")}</span>
            </span>
            <span className={cn("relative mt-6 block font-display text-[21px] font-bold leading-tight tracking-[-0.01em]", w.hervor ? "text-white" : "text-ink-900")}>{w.titel}</span>
            <span className={cn("relative mt-2.5 block flex-1 text-[15px] leading-relaxed", w.hervor ? "text-white/70" : "text-ink-600")}>{w.text}</span>
            <span className={cn("relative mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold", w.hervor ? "text-ov-300" : "text-ov-700")}>
              {w.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}

/** Sprungleiste unter dem Hero (Ankerlinks), mobil horizontal scrollbar */
export function SprungLeiste({ items, label = "On this page" }) {
  return (
    <nav aria-label={label} className="ov-container relative z-10 mt-10 md:mt-12">
      <ul className="ov-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {items.map((s) => (
          <li key={s.href} className="shrink-0">
            <a
              href={s.href}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13.5px] font-semibold text-ink-700 ring-1 ring-ink-200 transition-colors hover:text-ov-700 hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Kleine Link-Karte (z. B. Tools auf Deutsch) */
export function LinkKarte({ href, icon: Icon, titel, text, hrefLang, dunkel = false }) {
  return (
    <Link
      href={href}
      hrefLang={hrefLang}
      className={cn(
        "ov-lift group flex items-start gap-5 rounded-[1.6rem] p-6 ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 md:p-7",
        dunkel ? "bg-white/[0.05] text-white ring-white/10 hover:bg-white/[0.08]" : "bg-white ring-ink-200/80 hover:ring-ov-300"
      )}
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors", dunkel ? "bg-white/10 text-ov-300" : "bg-ov-50 text-ov-600 group-hover:bg-ov-600 group-hover:text-white")}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("flex items-center justify-between gap-3 font-display text-[19px] font-bold", dunkel ? "text-white" : "text-ink-900")}>
          {titel}
          <ArrowUpRight aria-hidden="true" className={cn("h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none", dunkel ? "text-ov-300" : "text-ink-300 group-hover:text-ov-600")} />
        </span>
        <span className={cn("mt-1.5 block text-[15px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{text}</span>
      </span>
    </Link>
  );
}

/**
 * Ablauf als Karten mit Schrittnummer und Verbindungslinie.
 * items: [{ icon, title, text }], dunkel, cols (3 | 4 | 5 | 6)
 */
export function Ablauf({ items, dunkel = false, cols = 3, className }) {
  const raster = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-3" }[cols] || "lg:grid-cols-3";
  return (
    <ol className={cn("relative grid gap-4 sm:grid-cols-2", raster, className)}>
      {items.map((s, i) => {
        const Icon = s.icon;
        return (
          <Reveal
            as="li"
            key={s.title}
            delay={i * 70}
            className={cn("relative flex flex-col rounded-[1.4rem] p-6 ring-1", dunkel ? "bg-white/[0.04] ring-white/10" : "bg-white ring-ink-200/80")}
          >
            <span className="flex items-center gap-3">
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1", dunkel ? "bg-ov-500/15 text-ov-300 ring-ov-300/30" : "bg-ov-50 text-ov-600 ring-ov-200")}>
                {Icon ? <Icon aria-hidden="true" className="h-5 w-5" /> : null}
              </span>
              <span aria-hidden="true" className={cn("h-px flex-1", dunkel ? "bg-gradient-to-r from-white/20 to-transparent" : "bg-gradient-to-r from-ov-300 to-transparent")} />
              <span className={cn("ov-num font-display text-[13px] font-extrabold tracking-[0.12em]", dunkel ? "text-ov-300" : "text-ov-700")}>
                <span className="sr-only">Step </span>
                {String(i + 1).padStart(2, "0")}
              </span>
            </span>
            <h3 className={cn("mt-5 font-display text-[18.5px] font-bold leading-snug", dunkel ? "text-white" : "text-ink-900")}>{s.title}</h3>
            <p className={cn("mt-2 text-[15px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{s.text}</p>
          </Reveal>
        );
      })}
    </ol>
  );
}

/**
 * Karten-Raster für Leistungen (ohne Link, optional mit Link).
 * items: [{ icon, title, text, href?, hrefLang? }]
 */
export function LeistungsKarten({ items, className }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((k, i) => {
        const Icon = k.icon;
        const inhalt = (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="mt-5 flex items-center justify-between gap-3 font-display text-[19px] font-bold leading-snug text-ink-900">
              {k.title}
              {k.href && <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-300 transition-colors group-hover:text-ov-600" />}
            </span>
            <span className="mt-2 block text-[15px] leading-relaxed text-ink-600">{k.text}</span>
          </>
        );
        return (
          <Reveal as="li" key={k.title} delay={i * 60} className="h-full">
            {k.href ? (
              <Link href={k.href} hrefLang={k.hrefLang} className="ov-lift group flex h-full flex-col rounded-[1.4rem] bg-white p-6 ring-1 ring-ink-200/80 hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 md:p-7">
                {inhalt}
              </Link>
            ) : (
              <div className="flex h-full flex-col rounded-[1.4rem] bg-white p-6 ring-1 ring-ink-200/80 md:p-7">{inhalt}</div>
            )}
          </Reveal>
        );
      })}
    </ul>
  );
}

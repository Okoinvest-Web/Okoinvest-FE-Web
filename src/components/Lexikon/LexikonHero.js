// Hero des Lexikons: Suche als Hauptaktion, rechts das Alphabet als
// Dichtekarte (echte Begriffszahl je Buchstabe) und der Begriff im Fokus.
import { ArrowDown } from "lucide-react";
import HeroTitel from "@/components/Unternehmen/HeroTitel";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import HeroSuche from "./HeroSuche";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * props:
 *  anzahl     Gesamtzahl Begriffe
 *  proBuchstabe { A: 12, … }
 *  kennzahlen [{ wert, label }]
 *  fokus      { id, begriff, kurz } | null
 *  beliebt    [{ id, begriff }]
 *  stand      Text, z. B. „September 2026“
 */
export default function LexikonHero({ anzahl, proBuchstabe = {}, kennzahlen = [], fokus, beliebt = [], stand }) {
  const max = Math.max(1, ...Object.values(proBuchstabe));

  return (
    <section aria-labelledby="lexikon-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      {/* Großes Monogramm als Bühnenhintergrund */}
      <p aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-[-2rem] -z-10 select-none font-display text-[15rem] font-extrabold leading-none tracking-tighter text-white/[0.03] md:text-[22rem]">
        A–Z
      </p>

      <div className="ov-container pb-20 pt-6 sm:pt-8 md:pb-28 md:pt-10">
        <Breadcrumbs items={[{ name: "Ratgeber", href: "/wissen/ratgeber" }, { name: "Lexikon" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-x-12 xl:gap-x-20">
          {/* ---------- Text ---------- */}
          <div className="max-w-[37rem]">
            <p
              className="ov-hero-in inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15"
              style={{ "--ov-delay": "40ms" }}
            >
              <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">Wissen</span>
              <span className="min-w-0 truncate">Stand {stand} · laufend gepflegt</span>
            </p>

            <h1 id="lexikon-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <HeroTitel><>Lexikon: <span className="ov-text-gradient-light">Fachbegriffe</span> von A bis Z</></HeroTitel>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              Von Aufstellungsbeschluss bis Zuschlagswert: die Begriffe aus Pachtvertrag, Bebauungsplan, Netzanschluss, Ausschreibung und Projektkauf –{" "}
              <span className="font-medium text-white">jeweils mit einer Definition in einem Satz</span>, einer Erklärung für Deutschland, Österreich und
              die Schweiz und dem Weg zum passenden Rechner.
            </p>

            <div className="ov-hero-in mt-8 md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <HeroSuche />
              {beliebt.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px]">
                  <span className="mr-1 text-white/60">Zum Einstieg:</span>
                  {beliebt.map((b) => (
                    <a
                      key={b.id}
                      href={`#${b.id}`}
                      className="inline-flex min-h-[34px] items-center rounded-full bg-white/[0.06] px-3.5 font-medium text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                    >
                      {b.begriff}
                    </a>
                  ))}
                </div>
              )}
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

          {/* ---------- Bühne: Alphabet-Dichtekarte + Begriff im Fokus ---------- */}
          <div className="ov-hero-in relative mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none" style={{ "--ov-delay": "220ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -inset-y-14 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.2),transparent_70%)] blur-2xl" />

            <nav aria-label="Begriffe nach Anfangsbuchstabe" className="ov-glass rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-white/70">Begriffe je Buchstabe</p>
                <p className="ov-num text-[12.5px] text-white/60">{anzahl} gesamt</p>
              </div>
              <ul className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
                {ALPHABET.map((l) => {
                  const n = proBuchstabe[l] || 0;
                  if (!n)
                    return (
                      <li key={l} aria-hidden="true" className="flex aspect-square items-center justify-center rounded-xl font-display text-[15px] font-bold text-white/20 ring-1 ring-inset ring-white/5">
                        {l}
                      </li>
                    );
                  const staerke = 0.1 + (n / max) * 0.45;
                  return (
                    <li key={l}>
                      <a
                        href={`#buchstabe-${l}`}
                        aria-label={`${l}: ${n} ${n === 1 ? "Begriff" : "Begriffe"}`}
                        className="group relative flex aspect-square flex-col items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 motion-reduce:transition-none"
                        style={{ backgroundColor: `rgba(140, 186, 88, ${staerke.toFixed(2)})` }}
                      >
                        <span className="font-display text-[15px] font-extrabold leading-none text-white sm:text-[17px]">{l}</span>
                        <span className="ov-num mt-0.5 text-[10.5px] font-semibold leading-none text-white/85 sm:mt-1 sm:text-[11px]">{n}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex items-center gap-2 text-[11.5px] text-white/60" aria-hidden="true">
                <span>wenige</span>
                <span className="h-1.5 w-20 rounded-full bg-gradient-to-r from-ov-400/20 to-ov-400/60" />
                <span>viele Begriffe</span>
              </div>
            </nav>

            {fokus && (
              <div className="relative mt-4 rounded-[1.5rem] bg-white p-5 text-ink-900 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] sm:p-6 lg:-ml-10 lg:mr-10">
                <p className="ov-overline text-ov-700">Begriff im Fokus</p>
                <p className="mt-2 font-display text-[22px] font-extrabold tracking-tight">{fokus.begriff}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{fokus.kurz}</p>
                <a href={`#${fokus.id}`} className="mt-4 inline-flex items-center gap-2 rounded text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  Ganze Erklärung lesen
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

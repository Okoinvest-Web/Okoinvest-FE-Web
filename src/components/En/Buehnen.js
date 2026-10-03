// Hero-Bühnen und Datengrafiken der englischen Seiten (reine Server-Komponenten, Inline-SVG/CSS).
// Alle Marktwerte kommen aus src/lib/invest/markt.js – hier nur Darstellung.
// Beispielansichten mit fiktiven Werten sind als solche beschriftet (Bildunterschrift im Hero).
import { BadgePercent, Bell, Check, Eye, EyeOff, FileText, FolderLock, KeyRound, Lock, MapPin, Search, SlidersHorizontal, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { PHASE_EN, RISIKO_EN } from "./PhaseModel";
import { fmtEn, fmtEurEn } from "./sprachpaare";

const RISIKO_STUFE = { "sehr hoch": 5, hoch: 4, "mittel–hoch": 3, mittel: 2, gering: 1, "sehr gering": 0 };
const ENTWICKLUNG = PHASEN.filter((p) => p.id !== "cod");
const COD = PHASEN.find((p) => p.id === "cod");
const RTB = PHASEN.find((p) => p.id === "rtb");
const SKALA = Math.max(...ENTWICKLUNG.map((p) => p.preisProKwp.max));
const SPANNE = `${fmtEn(PROVISION.verkaeufer.min * 100, 1)}–${fmtEn(PROVISION.verkaeufer.max * 100)}%`;

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

/** Helles Produktfenster mit Titelleiste */
function Fenster({ titel, rechts, className, children }) {
  return (
    <div className={cn("overflow-hidden rounded-[1.4rem] bg-white text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/20", className)}>
      <div className="flex items-center gap-3 border-b border-ink-100 bg-sand-50/80 px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-600">{titel}</span>
        {rechts}
      </div>
      {children}
    </div>
  );
}

/** Risiko als fünf Segmente */
export function RisikoBalken({ risiko, dunkel = false, className }) {
  const stufe = RISIKO_STUFE[risiko] ?? 3;
  return (
    <span aria-hidden="true" className={cn("flex gap-[3px]", className)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={cn("h-1.5 w-3 rounded-full", s <= stufe ? (stufe >= 4 ? "bg-sun-500" : "bg-sun-400") : dunkel ? "bg-white/15" : "bg-ink-200")} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Phasenleiter – Preisband je Entwicklungsstufe (echte Marktspannen)   */
/* ------------------------------------------------------------------ */

export function PhasenLeiter({ className, kompakt = false }) {
  return (
    <Fenster
      className={className}
      titel="Price by development stage · €/kWp"
      rechts={<span className="shrink-0 rounded-full bg-ov-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ov-700">DACH</span>}
    >
      <ol className="divide-y divide-ink-100 px-4 sm:px-5">
        {ENTWICKLUNG.map((p, i) => {
          const links = (p.preisProKwp.min / SKALA) * 100;
          const breite = ((p.preisProKwp.max - p.preisProKwp.min) / SKALA) * 100;
          return (
            <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_5.5rem]">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ov-50 text-[11px] font-extrabold text-ov-700">{i + 1}</span>
                <span className="truncate text-[13px] font-semibold text-ink-800">{PHASE_EN[p.id].kurz}</span>
              </span>
              <span className="relative col-span-2 h-2 rounded-full bg-ink-100 sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-hidden="true">
                <span className="absolute inset-y-0 rounded-full bg-gradient-to-r from-ov-400 to-ov-600" style={{ left: `${links}%`, width: `${breite}%` }} />
              </span>
              <span className="ov-num col-start-2 row-start-1 text-right text-[13px] font-bold text-ink-900 sm:col-start-3">
                €{fmtEn(p.preisProKwp.min)}–{fmtEn(p.preisProKwp.max)}
              </span>
              {!kompakt && (
                <span className="col-span-2 flex items-center gap-2 text-[11.5px] text-ink-500 sm:col-span-3">
                  <RisikoBalken risiko={p.risiko} />
                  <span>Risk {RISIKO_EN[p.risiko]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{p.monateBisRtb ? `≈ ${p.monateBisRtb} months to RTB` : "ready to build"}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-ink-100 bg-navy-950 px-4 py-3 text-white sm:px-5">
        <span className="text-[12.5px] font-semibold text-white/80">Operating assets (asset value)</span>
        <span className="ov-num text-[14px] font-extrabold text-ov-300">
          €{fmtEn(COD.preisProKwp.min)}–{fmtEn(COD.preisProKwp.max)}<span className="text-[11px] font-bold text-white/60"> /kWp</span>
        </span>
      </div>
    </Fenster>
  );
}

/* ------------------------------------------------------------------ */
/* Teaser-Karte (fiktive Beispielwerte)                                 */
/* ------------------------------------------------------------------ */

function ModulReihen() {
  // stilisierte Modulreihen als Kopfbild der Teaser-Karte
  return (
    <svg viewBox="0 0 320 96" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="en-himmel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c2650" />
          <stop offset="1" stopColor="#1f5aa1" />
        </linearGradient>
        <linearGradient id="en-modul" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b4f86" />
          <stop offset="1" stopColor="#14305e" />
        </linearGradient>
      </defs>
      <rect width="320" height="96" fill="url(#en-himmel)" />
      <circle cx="262" cy="22" r="11" fill="#f5c451" opacity="0.9" />
      <path d="M0 58 Q80 44 160 52 T320 46 V96 H0Z" fill="#5b8a2e" opacity="0.55" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r} transform={`translate(${-14 + r * 6} ${56 + r * 10})`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M${i * 38} 0 h34 l-5 8 h-34z`} fill="url(#en-modul)" stroke="#8cba58" strokeOpacity="0.35" strokeWidth="0.6" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function TeaserKarte({ className, schmal = false }) {
  return (
    <div className={cn("overflow-hidden rounded-[1.4rem] bg-white text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/20", className)}>
      <div className="relative h-24">
        <ModulReihen />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-navy-900">Ground-mounted PV</span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-navy-950/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <EyeOff aria-hidden="true" className="h-3 w-3" /> Anonymous
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-500">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" /> Bavaria, Germany
          <span className="ml-auto rounded-full bg-sun-300 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-navy-950">Example</span>
        </p>
        <p className="mt-1 font-display text-[17px] font-bold leading-snug">Solar park with grid commitment</p>
        <dl className={cn("mt-3 grid gap-2", schmal ? "grid-cols-2" : "grid-cols-3")}>
          {[
            ["Capacity", "12.4 MWp"],
            ["Stage", "Grid commitment"],
            ...(schmal ? [] : [["Offtake", "EEG / PPA"]]),
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-sand-50 px-2.5 py-2 ring-1 ring-ink-100">
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">{k}</dt>
              <dd className="ov-num mt-0.5 truncate text-[13px] font-bold text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 rounded-xl border border-dashed border-ink-200 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            <Lock aria-hidden="true" className="h-3 w-3" /> After NDA
          </p>
          <ul className="mt-2 space-y-1.5">
            {["Municipality", "Plots", "Grid operator"].map((t, i) => (
              <li key={t} className="flex items-center justify-between gap-3 text-[12px] text-ink-600">
                {t}
                <span aria-hidden="true" className="h-2 rounded-full bg-ink-200" style={{ width: `${[54, 40, 64][i]}px` }} />
              </li>
            ))}
          </ul>
        </div>
        <span className="mt-3 flex h-9 items-center justify-center gap-2 rounded-full bg-ov-600 text-[13px] font-semibold text-white">
          <KeyRound aria-hidden="true" className="h-3.5 w-3.5" /> Accept NDA
        </span>
      </div>
    </div>
  );
}

/** Kleine Datenraum-Karte (ohne Zahlen) */
function DatenraumKarte({ className }) {
  return (
    <div className={cn("rounded-2xl bg-navy-900/95 p-4 text-white shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur", className)}>
      <p className="flex items-center gap-2 text-[12.5px] font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ov-400/15 text-ov-300">
          <FolderLock aria-hidden="true" className="h-4 w-4" />
        </span>
        Data room released
      </p>
      <ul className="mt-3 space-y-2">
        {["Lease agreements", "Grid commitment", "Expert reports"].map((t) => (
          <li key={t} className="flex items-center gap-2 text-[12px] text-white/80">
            <FileText aria-hidden="true" className="h-3.5 w-3.5 text-white/50" />
            <span className="min-w-0 flex-1 truncate">{t}</span>
            <Check aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" strokeWidth={3} />
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[11px] text-white/60">
        <Eye aria-hidden="true" className="h-3 w-3" /> Every access is logged
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero-Kompositionen                                                  */
/* ------------------------------------------------------------------ */

/** Startseite: Phasenleiter + schwebende Teaser-Karte */
export function StartBuehne() {
  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-0 -z-10 h-2/3 w-2/3 rounded-full bg-ov-400/20 blur-[90px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-0 -z-10 h-56 w-56 rounded-full bg-sun-400/[0.12] blur-[80px]" />
      <div className="sm:pr-[34%] lg:pr-[30%]">
        <div className="ov-hero-in" style={{ "--ov-delay": "200ms" }}>
          <PhasenLeiter kompakt />
        </div>
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute -bottom-10 right-0 hidden w-[44%] max-w-[270px] sm:block lg:-right-2 xl:-right-6" style={{ "--ov-delay": "420ms" }}>
        <TeaserKarte schmal />
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute -top-5 right-[4%] hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold tracking-[0.1em] text-white ring-1 ring-white/20 backdrop-blur sm:flex" style={{ "--ov-delay": "520ms" }}>
        {["DE", "AT", "CH"].map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <span className="h-1 w-1 rounded-full bg-ov-300" />}
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Investoren: Suchprofil → Treffer (fiktive Beispielwerte) */
export function SuchprofilBuehne() {
  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-0 -z-10 h-2/3 w-2/3 rounded-full bg-ov-400/20 blur-[90px]" />
      <div className="sm:pr-[30%]">
        <div className="ov-hero-in" style={{ "--ov-delay": "200ms" }}>
          <Fenster titel="Investor portal · example (fictitious values)" rechts={<SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />}>
            <div className="p-4 sm:p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Countries", ["DE", "AT"]],
                  ["Stages", ["Building rights", "RTB"]],
                  ["Technology", ["PV", "Storage"]],
                  ["Capacity", ["5–30 MWp"]],
                ].map(([k, werte]) => (
                  <div key={k}>
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">{k}</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {werte.map((w) => (
                        <span key={w} className="rounded-full bg-ov-50 px-2.5 py-1 text-[12px] font-semibold text-ov-800 ring-1 ring-ov-200">{w}</span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t border-ink-100 pt-4">
                <p className="flex items-center gap-2 text-[12px] font-bold text-ink-800">
                  <Zap aria-hidden="true" className="h-3.5 w-3.5 text-sun-500" /> Matching projects
                </p>
                <ul className="mt-2.5 space-y-2">
                  {[
                    ["Ground-mounted PV · Upper Austria", "18.0 MWp", "Building rights"],
                    ["PV + storage · Saxony", "24.5 MWp", "RTB"],
                  ].map(([t, mw, st]) => (
                    <li key={t} className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-2.5 ring-1 ring-ink-100">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-ov-600 ring-1 ring-ink-100">
                        <Search aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-ink-900">{t}</span>
                        <span className="ov-num block text-[11.5px] text-ink-500">{mw} · {st}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-navy-950 px-2 py-0.5 text-[10.5px] font-semibold text-white">Teaser</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Fenster>
        </div>
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute -bottom-8 right-0 hidden w-[40%] max-w-[250px] sm:block xl:-right-6" style={{ "--ov-delay": "420ms" }}>
        <DatenraumKarte />
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute right-[2%] top-[18%] hidden w-[34%] max-w-[210px] rounded-2xl bg-white p-3.5 text-ink-900 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:block xl:-right-4" style={{ "--ov-delay": "540ms" }}>
        <p className="flex items-center gap-2 text-[12px] font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sun-100 text-sun-700"><Bell aria-hidden="true" className="h-3.5 w-3.5" /></span>
          New match
        </p>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-600">Notified before the project appears publicly.</p>
      </div>
    </div>
  );
}

/** Projektbörse: Teaser-Karte + Datenraum */
export function BoersenBuehne() {
  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-0 -z-10 h-2/3 w-2/3 rounded-full bg-ov-400/20 blur-[90px]" />
      <div className="mx-auto max-w-[380px] sm:mx-0 sm:ml-[6%] sm:max-w-none sm:pr-[38%]">
        <div className="ov-hero-in sm:origin-left sm:[transform:perspective(2000px)_rotateY(5deg)]" style={{ "--ov-delay": "200ms" }}>
          <TeaserKarte />
        </div>
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute bottom-[12%] right-0 hidden w-[42%] max-w-[260px] sm:block xl:-right-4" style={{ "--ov-delay": "420ms" }}>
        <DatenraumKarte />
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute right-[6%] top-[6%] hidden w-[36%] max-w-[220px] rounded-2xl bg-white p-3.5 text-ink-900 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:block" style={{ "--ov-delay": "540ms" }}>
        <p className="flex items-center gap-2 text-[12px] font-bold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ov-50 text-ov-700"><KeyRound aria-hidden="true" className="h-3.5 w-3.5" /></span>
          NDA accepted
        </p>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-600">Back office releases the data room.</p>
      </div>
    </div>
  );
}

/** Verkäufer: Rechenbeispiel Erfolgsprovision (echte Werte) + was Käufer sehen */
export function ProvisionBuehne({ mwp = 10 }) {
  const preis = Math.round((RTB.preisProKwp.min + RTB.preisProKwp.max) / 2);
  const kaufpreis = mwp * 1000 * preis;
  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-0 -z-10 h-2/3 w-2/3 rounded-full bg-ov-400/20 blur-[90px]" />
      <div className="sm:pr-[26%]">
        <div className="ov-hero-in" style={{ "--ov-delay": "200ms" }}>
          <Fenster titel="Worked example · success fee" rechts={<BadgePercent aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" />}>
            <div className="p-4 sm:p-6">
              <p className="text-[12.5px] text-ink-500">
                {mwp} MWp ready-to-build × €{fmtEn(preis)}/kWp
              </p>
              <p className="ov-num mt-1 font-display text-[clamp(1.75rem,1.4rem+1.4vw,2.4rem)] font-extrabold leading-none tracking-tight">{fmtEurEn(kaufpreis)}</p>
              <p className="mt-1 text-[12px] font-medium text-ink-500">Purchase price, project rights</p>

              <div className="mt-5" aria-hidden="true">
                <div className="flex h-4 overflow-hidden rounded-full bg-ink-100">
                  <span className="h-full bg-gradient-to-r from-ov-400 to-ov-600" style={{ width: `${100 - PROVISION.verkaeufer.max * 100}%` }} />
                  <span className="h-full bg-sun-400" style={{ width: `${PROVISION.verkaeufer.min * 100}%` }} />
                  <span className="h-full bg-sun-200" style={{ width: `${(PROVISION.verkaeufer.max - PROVISION.verkaeufer.min) * 100}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-500">
                  <span>Stays with you</span>
                  <span>Fee {SPANNE}</span>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-sand-50 p-3 ring-1 ring-ink-100">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Fee on closing</dt>
                  <dd className="ov-num mt-1 text-[14px] font-extrabold text-ink-900">
                    {fmtEurEn(kaufpreis * PROVISION.verkaeufer.min)}–{fmtEurEn(kaufpreis * PROVISION.verkaeufer.max)}
                  </dd>
                </div>
                <div className="rounded-xl bg-ov-50 p-3 ring-1 ring-ov-200">
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ov-800">Listing fee</dt>
                  <dd className="ov-num mt-1 text-[14px] font-extrabold text-ov-800">€0</dd>
                </div>
              </dl>
            </div>
          </Fenster>
        </div>
      </div>
      <div aria-hidden="true" className="ov-hero-in absolute -bottom-10 right-0 hidden w-[44%] max-w-[260px] rounded-2xl bg-navy-900/95 p-4 text-white shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur sm:block xl:-right-6" style={{ "--ov-delay": "420ms" }}>
        <p className="text-[12.5px] font-bold">What buyers see</p>
        <ul className="mt-2.5 space-y-1.5 text-[12px]">
          {[
            ["Region & capacity", true],
            ["Stage & price indication", true],
            ["Municipality & plots", false],
            ["Documents", false],
          ].map(([t, sichtbar]) => (
            <li key={t} className="flex items-center gap-2">
              {sichtbar ? <Eye className="h-3.5 w-3.5 text-ov-300" /> : <Lock className="h-3.5 w-3.5 text-white/45" />}
              <span className={sichtbar ? "text-white/85" : "text-white/50"}>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-white/60">Locked details open only after NDA.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Zeitachse bis RTB (echte Monatswerte)                                */
/* ------------------------------------------------------------------ */

export function RtbZeitachse({ dunkel = false, className }) {
  const max = Math.max(...ENTWICKLUNG.map((p) => p.monateBisRtb));
  return (
    <div className={cn("rounded-[1.75rem] p-5 sm:p-7", dunkel ? "bg-white/[0.04] ring-1 ring-white/10" : "bg-white shadow-e2 ring-1 ring-ink-200/70", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", dunkel ? "text-ov-300" : "text-ov-700")}>Typical time to ready-to-build</p>
        <p className={cn("text-[12px]", dunkel ? "text-white/55" : "text-ink-500")}>months remaining, approx.</p>
      </div>
      <ol className="relative mt-6 grid gap-4 sm:mt-10 sm:grid-cols-5 sm:gap-2">
        <span aria-hidden="true" className={cn("absolute left-[11px] top-2 bottom-2 w-px sm:left-0 sm:right-0 sm:top-[11px] sm:bottom-auto sm:h-px sm:w-auto", dunkel ? "bg-white/15" : "bg-ink-200")} />
        <span aria-hidden="true" className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-sun-400 via-ov-400 to-ov-600 sm:left-0 sm:right-0 sm:top-[11px] sm:bottom-auto sm:h-[2px] sm:w-auto sm:bg-gradient-to-r" />
        {ENTWICKLUNG.map((p, i) => {
          const ziel = p.monateBisRtb === 0;
          return (
            <li key={p.id} className="relative flex items-start gap-4 sm:block">
              <span
                className={cn(
                  "relative z-10 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ring-4",
                  ziel ? "bg-ov-500 text-white" : "bg-white text-ink-800",
                  dunkel ? "ring-navy-950" : "ring-white"
                )}
              >
                {ziel ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3.5} /> : i + 1}
              </span>
              <span className="min-w-0 sm:mt-4 sm:block">
                <span className={cn("ov-num block font-display text-[22px] font-extrabold leading-none tracking-tight", dunkel ? "text-white" : "text-ink-900")}>
                  {ziel ? "RTB" : `≈ ${p.monateBisRtb}`}
                  {!ziel && <span className={cn("ml-1 text-[12px] font-bold", dunkel ? "text-white/55" : "text-ink-500")}>mo.</span>}
                </span>
                <span className={cn("mt-1.5 block text-[13px] leading-snug", dunkel ? "text-white/70" : "text-ink-600")}>{PHASE_EN[p.id].label}</span>
                <span aria-hidden="true" className={cn("mt-2 hidden h-1 rounded-full sm:block", dunkel ? "bg-white/10" : "bg-ink-100")}>
                  <span className="block h-full rounded-full bg-ov-500/70" style={{ width: `${max ? (p.monateBisRtb / max) * 100 : 0}%` }} />
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// src/components/Portal/ui.js
//
// Bausteine des Portals (Server- und Client-tauglich, ohne Hooks).
// Nur Tokens des Design-Systems: ov-*, navy-*, ink-*, sand-*, sun-* (sparsam).
// Design-System 2.0 (docs/DESIGN.md): Props abwärtskompatibel, neue Props optional.
// Neue Primitives (Dialog, Tabs, Toast, Tooltip, KpiKachel, Skeleton …) liegen
// unter src/components/ui und werden hier nur ergänzend genutzt.

import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { PROZESSE, statusInfo } from "@/lib/plattform/prozesse";
import { datumZeit } from "@/lib/plattform/format";
import Sparkline from "@/components/ui/Sparkline";
import Skeleton from "@/components/ui/Skeleton";
import { Trend } from "@/components/ui/KpiKachel";

const TOENE = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  info: "bg-navy-50 text-navy-700 ring-navy-100",
  ok: "bg-ov-50 text-ov-800 ring-ov-200",
  warn: "bg-sun-300/25 text-ink-900 ring-sun-400/50",
  dunkel: "bg-navy-900 text-white ring-navy-800",
  // 2.0
  success: "bg-ov-50 text-ov-800 ring-ov-200",
  danger: "bg-danger-50 text-danger-700 ring-danger-200",
  marke: "bg-ov-600 text-white ring-ov-700/40",
};
const PUNKT = { ok: "bg-ov-500", success: "bg-ov-500", warn: "bg-sun-500", info: "bg-navy-500", danger: "bg-danger-500", marke: "bg-white", dunkel: "bg-ov-300" };

export function Badge({ ton = "neutral", children, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", TOENE[ton] || TOENE.neutral, className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ art, status, className }) {
  const s = statusInfo(art, status);
  return (
    <Badge ton={s.ton} className={className}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", PUNKT[s.ton] || "bg-ink-400")} />
      {s.label}
    </Badge>
  );
}

export function DemoBadge({ className }) {
  return <Badge ton="warn" className={className}>Demo</Badge>;
}

/**
 * Weiße Karte mit optionalem Kopf.
 * 2.0: ton hell (Standard) | ruhig (Sand) | erhaben (mehr Tiefe, für die eine
 * wichtigste Karte je Ansicht); icon im Kopf; laedt = Skeleton-Inhalt.
 */
export function Karte({ titel, untertitel, aktion, children, className, innen = "p-5 md:p-6", as: Tag = "section", id, ton = "hell", icon: Icon, laedt = false }) {
  const flaeche = {
    hell: "bg-white ring-1 ring-ink-200/70 shadow-e1",
    ruhig: "bg-sand-50 ring-1 ring-sand-200",
    erhaben: "bg-white ring-1 ring-ink-200/60 shadow-e3",
  }[ton] || "bg-white ring-1 ring-ink-200/70 shadow-e1";
  return (
    <Tag id={id} className={cn("min-w-0 rounded-3xl", flaeche, className)} aria-busy={laedt || undefined}>
      {(titel || aktion) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              {titel && <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink-900">{titel}</h2>}
              {untertitel && <p className="mt-0.5 text-[13.5px] text-ink-500">{untertitel}</p>}
            </div>
          </div>
          {aktion}
        </div>
      )}
      <div className={innen}>
        {laedt ? (
          <div aria-hidden="true" className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          children
        )}
      </div>
    </Tag>
  );
}

/** Kopf einer Portalseite */
export function SeitenKopf({ eyebrow, titel, text, aktionen, children }) {
  return (
    <div className="ov-ein mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-[clamp(1.65rem,1.35rem+1.1vw,2.25rem)] font-extrabold leading-[1.1] tracking-[-0.025em] text-ink-900">{titel}</h1>
        {text && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">{text}</p>}
        {children}
      </div>
      {aktionen && <div className="flex shrink-0 flex-wrap gap-2">{aktionen}</div>}
    </div>
  );
}

/**
 * Kennzahl-Kachel.
 * 2.0 (optional): trend { wert, text, richtung }, verlauf (Zahlenliste → Sparkline),
 * einheit, laedt. Für neue Dashboards: KpiKachel aus @/components/ui/KpiKachel.
 */
export function Kennzahl({ label, wert, hinweis, icon: Icon, href, ton = "hell", trend, verlauf, einheit, laedt = false }) {
  const dunkel = ton === "dunkel";
  const inhalt = laedt ? (
    <div aria-hidden="true">
      <Skeleton dunkel={dunkel} className="h-3.5 w-24" />
      <Skeleton dunkel={dunkel} className="mt-4 h-7 w-20" />
      <Skeleton dunkel={dunkel} className="mt-3 h-3 w-32" />
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-[13px] font-medium", dunkel ? "text-white/70" : "text-ink-500")}>{label}</p>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors", dunkel ? "bg-white/10 text-ov-300" : "bg-ov-50 text-ov-600", href && !dunkel && "group-hover:bg-ov-600 group-hover:text-white")}>
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={cn("ov-kpi", dunkel ? "text-white" : "text-ink-900")}>
          {wert}
          {einheit && <span className="ov-einheit">{einheit}</span>}
        </p>
        {verlauf?.length > 1 && <Sparkline werte={verlauf} ton={dunkel ? "hell" : "marke"} breite={84} hoehe={28} label={`Verlauf ${label}`} />}
      </div>
      {(hinweis || trend) && (
        <p className={cn("mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]", dunkel ? "text-white/70" : "text-ink-500")}>
          {trend && <Trend {...trend} aufDunkel={dunkel} />}
          {hinweis && <span>{hinweis}</span>}
        </p>
      )}
    </>
  );
  const klassen = cn(
    "group block min-w-0 rounded-3xl p-5",
    dunkel ? "ov-verlauf-nacht text-white ring-1 ring-white/10 shadow-kante" : "bg-white ring-1 ring-ink-200/70 shadow-e1",
    href && "ov-lift ov-press",
    href && (dunkel ? "hover:ring-ov-400" : "hover:ring-ov-200")
  );
  if (laedt) return <div className={klassen} aria-busy="true">{inhalt}</div>;
  return href ? (
    <Link href={href} className={klassen}>
      {inhalt}
    </Link>
  ) : (
    <div className={klassen}>{inhalt}</div>
  );
}

/**
 * Leerer Zustand. 2.0: illustration (JSX, z. B. von T7) statt Icon;
 * sekundaer (zweite, leise Aktion).
 */
export function Leer({ icon: Icon, titel, text, aktion, sekundaer, illustration, className }) {
  return (
    <div className={cn("ov-ein flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center", className)}>
      {illustration ? (
        <div aria-hidden="true" className="mb-1 w-full max-w-[220px]">{illustration}</div>
      ) : (
        Icon && (
          <span className="relative isolate flex h-14 w-14 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-100">
            <span aria-hidden="true" className="absolute -inset-2 -z-10 rounded-3xl bg-ov-50/60" />
            <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
          </span>
        )
      )}
      <p className="mt-4 font-display text-[18px] font-bold text-ink-900">{titel}</p>
      {text && <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-ink-600">{text}</p>}
      {(aktion || sekundaer) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {aktion}
          {sekundaer}
        </div>
      )}
    </div>
  );
}

/** Schlüssel-Wert-Liste */
export function Angaben({ items, spalten = 2 }) {
  const liste = items.filter((i) => i && i.wert !== undefined && i.wert !== null && i.wert !== "");
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", spalten === 3 ? "grid-cols-2 lg:grid-cols-3" : spalten === 1 ? "" : "sm:grid-cols-2")}>
      {liste.map((i) => (
        <div key={i.label} className={cn("min-w-0", i.breit && "col-span-full")}>
          <dt className="text-[12.5px] font-medium text-ink-500">{i.label}</dt>
          <dd className="mt-0.5 break-words text-[15px] text-ink-900">{i.wert}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Statusverlauf als Timeline */
export function Timeline({ art, verlauf = [], leerText = "Noch keine Einträge." }) {
  if (!verlauf.length) return <p className="text-[14px] text-ink-500">{leerText}</p>;
  const liste = [...verlauf].reverse();
  return (
    <ol className="relative space-y-5 pl-7">
      <span aria-hidden="true" className="absolute bottom-2 left-[9px] top-2 w-px bg-ink-200" />
      {liste.map((e, i) => {
        const s = statusInfo(art, e.status);
        return (
          <li key={`${e.status}-${e.am}-${i}`} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-7 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full ring-4 ring-white",
                i === 0 ? "bg-ov-500 text-white" : "bg-ink-200 text-ink-500"
              )}
            >
              {i === 0 ? <Check className="h-3 w-3" strokeWidth={3} /> : <Circle className="h-2 w-2 fill-current" />}
            </span>
            <p className="flex flex-wrap items-center gap-x-2 text-[14.5px] font-semibold text-ink-900">
              {s.label}
              <span className="text-[12.5px] font-normal text-ink-500">{datumZeit(e.am)}</span>
            </p>
            {e.kommentar && <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink-600">{e.kommentar}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Fortschritt durch die Pipeline (Stepper). Abgelehnt/zurückgezogen wird gesondert gezeigt. */
export function Stepper({ art, status, kompakt = false }) {
  if (!kompakt) {
    return (
      <>
        <div className="md:hidden"><StepperInnen art={art} status={status} kompakt /></div>
        <div className="hidden md:block"><StepperInnen art={art} status={status} /></div>
      </>
    );
  }
  return <StepperInnen art={art} status={status} kompakt />;
}

function StepperInnen({ art, status, kompakt = false }) {
  const p = PROZESSE[art];
  const pipeline = p.pipeline.filter((s) => s !== "entwurf" || status === "entwurf");
  const idx = pipeline.indexOf(status);
  const aussen = idx < 0;
  return (
    <div className="min-w-0">
      {aussen && (
        <p className="mb-3">
          <StatusBadge art={art} status={status} />
        </p>
      )}
      <ol className={cn("flex min-w-0 gap-1.5", kompakt ? "" : "overflow-x-auto pb-1 ov-no-scrollbar")} aria-label="Fortschritt">
        {pipeline.map((s, i) => {
          const fertig = !aussen && i < idx;
          const aktiv = !aussen && i === idx;
          return (
            <li key={s} className={cn("min-w-0 flex-1", !kompakt && "min-w-[92px]")} aria-current={aktiv ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full", fertig ? "bg-ov-500" : aktiv ? "bg-ov-500" : aussen ? "bg-ink-200" : "bg-ink-200")} />
              {!kompakt && (
                <span className={cn("mt-2 block text-[12px] leading-tight", aktiv ? "font-semibold text-ink-900" : fertig ? "text-ink-600" : "text-ink-500")}>
                  {statusInfo(art, s).label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {kompakt && !aussen && <p className="mt-1.5 text-[12.5px] text-ink-500">{statusInfo(art, status).label} · Schritt {idx + 1} von {pipeline.length}</p>}
    </div>
  );
}

/** Link mit Pfeil (z. B. „Alle ansehen“) */
export function PfeilLink({ href, children, className }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800", className)}>
      {children}
      <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Tabelle mit horizontalem Scroll auf kleinen Bildschirmen (per Tastatur erreichbar, WCAG 2.1.1 / axe scrollable-region-focusable) */
export function Tabelle({ kopf = [], children, className }) {
  return (
    <div tabIndex={0} role="region" aria-label="Tabelle, horizontal scrollbar" className={cn("-mx-5 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 md:-mx-6", className)}>
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
            {kopf.map((k, i) => (
              <th key={i} scope="col" className="px-5 py-3 font-semibold first:pl-5 md:px-6">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 [&>tr]:transition-colors [&>tr:hover]:bg-ink-50/70">{children}</tbody>
      </table>
    </div>
  );
}

export const zelle = "px-5 py-3.5 align-top md:px-6";

/** Hinweisbox */
export function Hinweis({ ton = "info", titel, children, className, icon: Icon }) {
  const t = {
    info: "bg-navy-50 text-navy-900 ring-navy-100",
    ok: "bg-ov-50 text-ov-900 ring-ov-200",
    warn: "bg-sun-300/20 text-ink-900 ring-sun-400/40",
    neutral: "bg-ink-50 text-ink-800 ring-ink-200",
    danger: "bg-danger-50 text-danger-800 ring-danger-200",
    success: "bg-ov-50 text-ov-900 ring-ov-200",
  }[ton] || "bg-navy-50 text-navy-900 ring-navy-100";
  return (
    <div className={cn("flex gap-3 rounded-2xl px-4 py-3.5 text-[14px] leading-relaxed ring-1 ring-inset", t, className)}>
      {Icon && <Icon aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" />}
      <div className="min-w-0">
        {titel && <p className="font-semibold">{titel}</p>}
        <div className={titel ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

/** Fortschrittsbalken „Datenraum-Qualität“ (auch in Karten nutzbar) */
// labelId: Beschriftung als Element (z. B. übersetzt über <T>) – dann benennt aria-labelledby den Balken
export function QualitaetsBalken({ quote, label = "Datenraum-Qualität", klein = false, labelId }) {
  const q = Math.max(0, Math.min(100, Number(quote) || 0));
  return (
    <div className="min-w-0">
      <div className={cn("flex items-baseline justify-between gap-2", klein ? "text-[12px]" : "text-[13px]")}>
        <span id={labelId} className="text-ink-600">{label}</span>
        <span className="ov-num font-bold text-ink-900">{q} %</span>
      </div>
      <div className={cn("mt-1 rounded-full bg-ink-100", klein ? "h-1.5" : "h-2")} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={q} aria-label={labelId ? undefined : label} aria-labelledby={labelId}>
        <div className={cn("rounded-full", klein ? "h-1.5" : "h-2", q >= 80 ? "bg-ov-500" : q >= 50 ? "bg-ov-400" : "bg-sun-400")} style={{ width: `${Math.max(3, q)}%` }} />
      </div>
    </div>
  );
}

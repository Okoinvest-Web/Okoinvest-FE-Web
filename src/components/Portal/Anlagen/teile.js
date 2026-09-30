// src/components/Portal/Anlagen/teile.js
//
// Kleine Bausteine „Anlagen & Monitoring“ (Server- und Client-tauglich, ohne Hooks).
// Ampelfarben aus dem Design-System: Grün (ov), Sonne (sun), Störung wie Fehlermeldungen im Portal (red, sparsam), Grau (ink).

import { cn } from "@/components/ui/cn";
import { AMPEL, STOERUNG_SCHWERE, STOERUNG_STATUS } from "@/lib/plattform/anlagen";

export const AMPEL_KLASSE = {
  laeuft: { badge: "bg-ov-50 text-ov-800 ring-ov-200", punkt: "bg-ov-500", fill: "fill-ov-500", text: "text-ov-700" },
  warnung: { badge: "bg-sun-300/25 text-ink-900 ring-sun-400/50", punkt: "bg-sun-500", fill: "fill-sun-500", text: "text-ink-900" },
  stoerung: { badge: "bg-red-50 text-red-800 ring-red-200", punkt: "bg-red-600", fill: "fill-red-600", text: "text-red-700" },
  offline: { badge: "bg-ink-100 text-ink-700 ring-ink-200", punkt: "bg-ink-400", fill: "fill-ink-400", text: "text-ink-600" },
};

export function AmpelBadge({ id = "offline", grund, className, klein = false }) {
  const k = AMPEL_KLASSE[id] || AMPEL_KLASSE.offline;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", klein ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12px]", k.badge, className)}
      title={grund || AMPEL[id]?.text}
    >
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", k.punkt, id === "laeuft" && "motion-safe:animate-pulse")} />
      {AMPEL[id]?.label || id}
      {grund && <span className="sr-only">: {grund}</span>}
    </span>
  );
}

const SCHWERE_KLASSE = {
  info: "bg-ink-100 text-ink-700 ring-ink-200",
  niedrig: "bg-navy-50 text-navy-700 ring-navy-100",
  mittel: "bg-sun-300/25 text-ink-900 ring-sun-400/50",
  hoch: "bg-red-50 text-red-800 ring-red-200",
  kritisch: "bg-red-700 text-white ring-red-700",
};

export function SchwereBadge({ schwere }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", SCHWERE_KLASSE[schwere] || SCHWERE_KLASSE.info)}>{STOERUNG_SCHWERE[schwere]?.label || schwere}</span>;
}

const STATUS_KLASSE = { offen: "bg-sun-300/25 text-ink-900 ring-sun-400/50", in_arbeit: "bg-navy-50 text-navy-700 ring-navy-100", behoben: "bg-ov-50 text-ov-800 ring-ov-200" };

export function StoerungStatusBadge({ status }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", STATUS_KLASSE[status] || STATUS_KLASSE.offen)}>{STOERUNG_STATUS[status]?.label || status}</span>;
}

/** Kompakte Kennzahl für Anlagen-Seiten */
export function Wert({ label, wert, hinweis, icon: Icon, ton = "hell", className }) {
  const dunkel = ton === "dunkel";
  return (
    <div className={cn("min-w-0 rounded-3xl p-4 md:p-5", dunkel ? "bg-navy-950 text-white ring-1 ring-navy-800" : "bg-white ring-1 ring-ink-200/70", className)}>
      <p className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", dunkel ? "text-white/70" : "text-ink-500")}>
        {Icon && <Icon aria-hidden="true" className={cn("h-3.5 w-3.5", dunkel ? "text-ov-300" : "text-ov-600")} />}
        {label}
      </p>
      <p className={cn("ov-num mt-2 truncate font-display text-[22px] font-extrabold leading-tight tracking-tight md:text-[24px]", dunkel ? "text-white" : "text-ink-900")}>{wert}</p>
      {hinweis && <p className={cn("mt-1 truncate text-[12px]", dunkel ? "text-white/60" : "text-ink-500")}>{hinweis}</p>}
    </div>
  );
}

export const pct = (v) => (v == null || !Number.isFinite(Number(v)) ? "–" : `${Math.round(Number(v) * 100).toLocaleString("de-DE")} %`);
export const eur0 = (v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v)).toLocaleString("de-DE")} €` : "–");

/** „vor 12 s“, „vor 4 Min.“, „vor 3 Std.“ */
export function alterText(iso, jetzt = Date.now()) {
  if (!iso) return "–";
  const s = Math.max(0, Math.round((jetzt - new Date(iso).getTime()) / 1000));
  if (s < 60) return `vor ${s} s`;
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  return `vor ${Math.floor(s / 86400)} Tg.`;
}

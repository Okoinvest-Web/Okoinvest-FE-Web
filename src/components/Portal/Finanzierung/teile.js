// src/components/Portal/Finanzierung/teile.js – Formatierung und kleine Bausteine der Finanzierung (Server + Client, ohne Hooks)

import { cn } from "@/components/ui/cn";
import { AMPEL_FZ } from "@/lib/plattform/finanzierung/bank";

export const eur = (x) => (Number.isFinite(x) ? `${Math.round(x).toLocaleString("de-DE")} €` : "–");
export const teur = (x) => (Number.isFinite(x) ? `${Math.round(x / 1000).toLocaleString("de-DE")} T€` : "–");
export const pct = (x, s = 1) => (Number.isFinite(x) ? `${(x * 100).toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s })} %` : "–");
export const fx = (x, s = 2) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s })}x` : "–");
export const jahre = (x) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { maximumFractionDigits: 1 })} J.` : "–");
export const datumDe = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–");

/** Herkunft des Capex eines Finanzierungsfalls (capexQuelle aus dem Backend) als kurzer Text */
export function capexQuelleText(q) {
  if (q?.art === "kostenkalkulation") return `aus Kostenkalkulation Stand ${[q.standLabel, q.am ? `vom ${datumDe(q.am)}` : ""].filter(Boolean).join(" ") || "–"}`;
  if (q?.art === "standard") return "Standard-Capex (Marktwerte) + Entwicklungsbudget";
  if (q?.art === "manuell") return "manuell angepasst";
  return "";
}

const AMPEL_KLASSE = {
  gruen: "bg-ov-50 text-ov-800 ring-ov-200",
  gelb: "bg-sun-300/25 text-ink-900 ring-sun-400/50",
  rot: "bg-red-50 text-red-800 ring-red-200",
  grau: "bg-ink-100 text-ink-700 ring-ink-200",
};
const PUNKT = { gruen: "bg-ov-500", gelb: "bg-sun-500", rot: "bg-red-600", grau: "bg-ink-400" };

/** Covenant-Ampel mit Text (nie nur Farbe) */
export function AmpelBadge({ id = "grau", className, kurz = false }) {
  const a = AMPEL_FZ[id] || AMPEL_FZ.grau;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", AMPEL_KLASSE[id] || AMPEL_KLASSE.grau, className)}>
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", PUNKT[id] || PUNKT.grau)} />
      {kurz ? { gruen: "Grün", gelb: "Gelb", rot: "Rot", grau: "Keine Daten" }[id] : a.label}
    </span>
  );
}

export const HINWEIS_BERATUNG = "Orientierungsrechnung auf Basis Ihrer Annahmen und der Marktwerte in markt.js – keine Anlage-, Finanzierungs- oder Steuerberatung. Steuereffekte sind Näherungen; bitte mit Bank und Steuerberatung prüfen.";

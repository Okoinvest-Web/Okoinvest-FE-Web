// src/components/Portal/Betrieb/teile.js
//
// Kleine Bausteine der Betriebsführung (Server- und Client-tauglich, ohne Hooks): SLA-Ampel, Fristen, Ergebnis.
// Farben wie im Anlagen-Leitstand (ov / sun / red sparsam / ink).

import { cn } from "@/components/ui/cn";

const KLASSE = {
  gruen: "bg-ov-50 text-ov-800 ring-ov-200",
  gelb: "bg-sun-300/25 text-ink-900 ring-sun-400/50",
  rot: "bg-danger-50 text-danger-800 ring-danger-200",
  grau: "bg-ink-100 text-ink-700 ring-ink-200",
};
const basis = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset";

export function SlaBadge({ sla }) {
  if (!sla) return null;
  return (
    <span className={cn(basis, KLASSE[sla.ampel] || KLASSE.grau)} title={`Vorgabe: Reaktion ${sla.vorgabe.reaktionH} h${sla.vorgabe.loesungH ? `, Lösung ${sla.vorgabe.loesungH} h` : ""}`}>
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", sla.ampel === "rot" ? "bg-danger-600" : sla.ampel === "gelb" ? "bg-sun-500" : "bg-ov-500")} />
      {sla.text}
    </span>
  );
}

const FRIST = { ueberfaellig: ["rot", "überfällig"], fehlt: ["gelb", "fehlt"], dringend: ["gelb", ""], bald: ["grau", ""], spaeter: ["grau", ""] };

export function FristBadge({ frist: f }) {
  const [ton, text] = FRIST[f.stufe] || FRIST.bald;
  const datum = f.datum ? f.datum.split("-").reverse().join(".") : "";
  return (
    <span className={cn(basis, KLASSE[ton])}>
      {f.stufe === "fehlt" ? "nicht gepflegt" : `${datum}${f.tage !== null ? ` · ${f.tage < 0 ? `${-f.tage} Tg. ${text}` : `in ${f.tage} Tg.`}` : ""}`}
    </span>
  );
}

const ERGEBNIS = { bestanden: ["gruen", "Bestanden"], maengel: ["gelb", "Mängel"], nicht_bestanden: ["rot", "Nicht bestanden"] };

export function ErgebnisBadge({ ergebnis }) {
  const [ton, text] = ERGEBNIS[ergebnis] || ["grau", ergebnis];
  return <span className={cn(basis, KLASSE[ton])}>{text}</span>;
}

const PLAUS = { ok: ["gruen", "plausibel"], hinweis: ["grau", "Hinweis"], warnung: ["gelb", "prüfen"], fehler: ["rot", "auffällig"] };

export function PlausiBadge({ stufe }) {
  const [ton, text] = PLAUS[stufe] || PLAUS.hinweis;
  return <span className={cn(basis, KLASSE[ton])}>{text}</span>;
}

export const prozent = (x, s = 1) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : `${(Number(x) * 100).toLocaleString("de-DE", { maximumFractionDigits: s, minimumFractionDigits: s })} %`);

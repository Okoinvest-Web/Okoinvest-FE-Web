// src/components/Portal/Entwicklung/SteuerungTeile.js – Anzeige-Bausteine der Entwicklungssteuerung (Server- und Client-tauglich,
// ohne Hooks): Ampelpunkt, Ampelzeile, Auslastungszelle, Vorlagen-Status. Nur Tokens des Design-Systems (Rot nur für „kritisch“
// wie im Bestand der Projektentwicklung).

import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { AMPEL, AMPEL_DIMENSIONEN, VORLAGE_STATUS } from "@/lib/plattform/entwicklung-steuerung";

const PUNKT = { gruen: "bg-ov-500", gelb: "bg-sun-400", rot: "bg-danger-600", grau: "bg-ink-300" };
const TEXT = { gruen: "text-ov-800", gelb: "text-ink-900", rot: "text-danger-700", grau: "text-ink-500" };

export function AmpelPunkt({ farbe = "grau", titel, gross = false }) {
  return (
    <span className="inline-flex items-center" title={titel}>
      <span aria-hidden="true" className={cn("inline-block rounded-full ring-2 ring-white", gross ? "h-3.5 w-3.5" : "h-2.5 w-2.5", PUNKT[farbe] || PUNKT.grau)} />
      <span className="sr-only">{`${titel ? `${titel}: ` : ""}${AMPEL[farbe]?.label || "keine Daten"}`}</span>
    </span>
  );
}

export function AmpelBadge({ farbe = "grau", children }) {
  const ton = farbe === "gruen" ? "ok" : farbe === "rot" ? "warn" : farbe === "gelb" ? "warn" : "neutral";
  return (
    <Badge ton={ton} className={farbe === "rot" ? "bg-danger-50 text-danger-800 ring-danger-200" : undefined}>
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", PUNKT[farbe] || PUNKT.grau)} />
      {children || AMPEL[farbe]?.label}
    </Badge>
  );
}

/** Ampel je Dimension als Liste mit Begründung */
export function AmpelListe({ ampel }) {
  return (
    <ul className="divide-y divide-ink-100">
      {Object.entries(AMPEL_DIMENSIONEN).map(([id, label]) => (
        <li key={id} className="flex items-start gap-3 py-2.5">
          <span className="mt-1"><AmpelPunkt farbe={ampel?.[id]?.farbe} titel={label} /></span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink-900">{label}</span>
            <span className={cn("block text-[13px]", TEXT[ampel?.[id]?.farbe] || TEXT.grau)}>{ampel?.[id]?.grund || "–"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AuslastungZelle({ wert = 0, farbe = "gruen", stunden }) {
  return (
    <span className={cn("ov-num inline-flex min-w-[3.2rem] justify-end rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold", farbe === "rot" ? "bg-danger-50 text-danger-800" : farbe === "gelb" ? "bg-sun-300/30 text-ink-900" : "bg-ov-50 text-ov-800")} title={stunden !== undefined ? `${stunden} h` : undefined}>
      {Math.round(wert * 100)} %
    </span>
  );
}

export function VorlageStatusBadge({ status }) {
  const s = VORLAGE_STATUS[status] || { label: status, ton: "neutral" };
  return <Badge ton={s.ton}>{s.label}</Badge>;
}

// Kleine Bausteine der Gründungsansichten (WP5) – ohne Hooks, server- und clientseitig nutzbar.

import { AlarmClock, CircleCheck, CircleDashed, CircleDot, Hourglass, MinusCircle } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";

export const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
export const eurDe = (x) => (x === null || x === undefined || x === "" ? "–" : `${Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
export const zahlDe = (x, s = 0) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? "–" : Number(x).toLocaleString("de-DE", { maximumFractionDigits: s }));

/** Frist mit Ampel */
export function FristBadge({ frist, ampel }) {
  if (!frist) return null;
  const ton = ampel === "ueberfaellig" ? "warn" : ampel === "bald" ? "info" : "neutral";
  return (
    <Badge ton={ton}>
      <AlarmClock aria-hidden="true" className="h-3.5 w-3.5" />
      {ampel === "ueberfaellig" ? "überfällig seit " : "bis "}
      {datumDe(frist)}
    </Badge>
  );
}

const SYMBOL = { offen: CircleDashed, in_arbeit: CircleDot, wartet_extern: Hourglass, erledigt: CircleCheck, entfaellt: MinusCircle };
/** Symbol für den Schrittstatus */
export function SchrittSymbol({ status, className }) {
  const I = SYMBOL[status] || CircleDashed;
  return <I aria-hidden="true" className={cn("h-5 w-5 shrink-0", status === "erledigt" ? "text-ov-600" : status === "wartet_extern" ? "text-sun-500" : status === "in_arbeit" ? "text-navy-600" : "text-ink-400", className)} />;
}

/** Liste von Befunden/Hinweisen mit Stufe */
export function Befunde({ liste = [], leer = "" }) {
  if (!liste.length) return leer ? <p className="text-[14px] text-ink-500">{leer}</p> : null;
  return (
    <ul className="space-y-1.5 text-[14px] leading-relaxed">
      {liste.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden="true" className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", b.stufe === "fehler" ? "bg-red-500" : b.stufe === "warn" ? "bg-sun-500" : "bg-navy-400")} />
          <span className="min-w-0">
            {b.text}
            {b.quelle && <span className="ml-1 text-[12.5px] text-ink-500">({b.quelle})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Kurze Muster-Kennzeichnung für Generator und Vorlagen */
export function MusterHinweis({ className }) {
  return (
    <p className={cn("rounded-xl bg-sand-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-600 ring-1 ring-inset ring-ink-200", className)}>
      Alle Dokumente sind <strong className="font-semibold text-ink-800">Muster zur rechtlichen Prüfung</strong> (Rechtsstand ElWG 01.10.2026) – kein Ersatz für Rechts- oder Steuerberatung. Jede Version wird mit Prüfsumme (SHA-256) abgelegt.
    </p>
  );
}

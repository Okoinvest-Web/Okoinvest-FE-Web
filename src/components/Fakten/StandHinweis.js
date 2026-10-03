// src/components/Fakten/StandHinweis.js
//
// Stand und Prüfstatus eines Fakts (Welle 2, Paket B1, Masterplan H7):
//  - geprüft:     „Stand 03.10.2026 · am Original geprüft“
//  - zu prüfen:   „Stand 01.09.2026 · Prüfung ausstehend“ bzw. „eigene Einschätzung“ (Klasse C)
//  - abgelaufen:  „Stand abgelaufen, wird geprüft“ (Warnfarbe, role="status") – NIE als aktuell
// Status nie nur über Farbe: Text ist immer dabei. Ohne Hooks (Server und Client).
//
//   <StandHinweis id="recht.ch.gmp.hoechstgebotRp" land="CH" />
//   <StandHinweis fakt={f} heute="2027-01-15" />

import { CircleCheck, Clock, TriangleAlert, PencilRuler } from "lucide-react";
import { fakt as faktAusRegister, anzeigeStatus, datumDe, HINWEIS_ABGELAUFEN } from "@/lib/fakten";
import { cn } from "@/components/ui/cn";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", DACH: "DACH" };

/** Text und Ton des Hinweises – auch für Berichte (B4) nutzbar */
export function standText(f, heute = new Date()) {
  if (!f) return { status: "fehlt", ton: "neutral", text: "Wert in Prüfung" };
  const status = anzeigeStatus(f, heute);
  if (status === "abgelaufen") {
    return { status, ton: "warn", text: f.gueltigBis ? `${HINWEIS_ABGELAUFEN} (gültig bis ${datumDe(f.gueltigBis)})` : HINWEIS_ABGELAUFEN };
  }
  const stand = f.abruf ? `Stand ${datumDe(f.abruf)}` : "Stand offen";
  if (status === "geprueft") return { status, ton: "ok", text: `${stand} · am Original geprüft` };
  if (status === "entwurf") return { status, ton: "neutral", text: `${stand} · Entwurf, nicht freigegeben` };
  if (f.klasse === "C" || f.quelle?.art === "eigen") return { status, ton: "neutral", text: `${stand} · eigene Einschätzung` };
  return { status, ton: "neutral", text: `${stand} · Prüfung ausstehend` };
}

const TON = {
  ok: "bg-ov-50 text-ov-800 ring-ov-200",
  warn: "bg-sun-50 text-sun-700 ring-sun-200",
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
};
const ICON = { geprueft: CircleCheck, abgelaufen: TriangleAlert, zu_pruefen: Clock, entwurf: PencilRuler, fehlt: Clock };

export default function StandHinweis({ id, land = "DE", fakt, heute, zeigeLand = false, className }) {
  const f = fakt || (id ? faktAusRegister(id, land) : null);
  const { status, ton, text } = standText(f, heute || new Date());
  const Icon = (status === "zu_pruefen" && f?.klasse === "C" ? PencilRuler : ICON[status]) || Clock;
  const landKurz = f?.land || land;
  return (
    <span
      role={status === "abgelaufen" ? "status" : undefined}
      data-fakt-status={status}
      className={cn("inline-flex max-w-full items-center gap-1.5 rounded-2xl px-2.5 py-1 text-left text-[12px] font-semibold ring-1 ring-inset", TON[ton], className)}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {zeigeLand && landKurz ? (
        <>
          <abbr title={LAND_NAME[landKurz] || landKurz} className="no-underline">
            {landKurz}
          </abbr>
          <span aria-hidden="true">·</span>
        </>
      ) : null}
      <span className="min-w-0">{text}</span>
    </span>
  );
}

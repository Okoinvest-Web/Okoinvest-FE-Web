"use client";

// src/components/formular/AusfuellFortschritt.js
//
// Ruhiger Ausfüll-Fortschritt für Formulare: schmaler Balken (nur transform: scaleX) + „2 von 4 Pflichtangaben“.
// Sobald alles vollständig ist, federt ein Häkchen auf und der Text wechselt zu „Alles bereit“.
// Zählt live beim Tippen (reine Nutzerführung – Fehlermeldungen erscheinen weiterhin erst beim Verlassen des Felds).
//
//   const n = pflichtErfuellt(schema, werte, ["vorname", "nachname", "email", "einwilligung"]);
//   <AusfuellFortschritt erfuellt={n} gesamt={4} />
//
// Barrierefreiheit: Balken ist Deko (aria-hidden); der Text ist normaler Text (kein Live-Bereich – sonst
// würde jede Eingabe angesagt). Reduzierte Bewegung: globaler Block schaltet Übergänge ab.

import { ErfolgsZeichen } from "./Textfeld";
import { cn } from "@/components/ui/cn";

/** Anzahl der Pflichtfelder, deren Regeln (aus dem Formularschema) aktuell erfüllt sind */
export function pflichtErfuellt(schema, werte, pflicht) {
  let n = 0;
  for (const k of pflicht) {
    const regeln = schema?.[k] || [];
    if (regeln.every((r) => !r(werte?.[k], werte))) n += 1;
  }
  return n;
}

export default function AusfuellFortschritt({ erfuellt = 0, gesamt = 1, dunkel = false, bereitText = "Alles bereit – jetzt absenden", className }) {
  const anteil = gesamt ? Math.max(0, Math.min(1, erfuellt / gesamt)) : 0;
  const fertig = erfuellt >= gesamt;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div aria-hidden="true" className={cn("h-1.5 min-w-0 flex-1 overflow-hidden rounded-full", dunkel ? "bg-white/12" : "bg-ink-100")}>
        <div
          className={cn("ov-fortschritt h-full w-full rounded-full", dunkel ? "bg-gradient-to-r from-ov-400 to-ov-300" : "bg-gradient-to-r from-ov-600 to-ov-400")}
          style={{ transform: `scaleX(${Math.max(0.04, anteil)})` }}
        />
      </div>
      <p className={cn("flex shrink-0 items-center gap-2 text-[12.5px] font-semibold", dunkel ? "text-white/80" : "text-ink-600")}>
        {fertig ? (
          <>
            <ErfolgsZeichen dunkel={dunkel} className="h-4 w-4" />
            <span className={dunkel ? "text-white" : "text-ov-800"}>{bereitText}</span>
          </>
        ) : (
          <span className="ov-num">
            {erfuellt} von {gesamt} Pflichtangaben
          </span>
        )}
      </p>
    </div>
  );
}

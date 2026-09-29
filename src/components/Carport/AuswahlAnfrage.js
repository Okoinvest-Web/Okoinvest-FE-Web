"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";

/**
 * Anfrageformular mit vorgeschalteten Auswahlfeldern (Chips). Die Auswahl
 * geht als `daten` mit der Anfrage. Genutzt auf /solarcarport, /grossspeicher
 * und /kommunen.
 *
 * gruppen: [{ id, legende, optionen: [{ id, label }], mehrfach?, start }]
 */
export default function AuswahlAnfrage({ typ, gruppen = [], felder, button, erfolgText, titel, text, dunkel = false }) {
  const [werte, setWerte] = useState(() => Object.fromEntries(gruppen.map((g) => [g.id, g.start ?? (g.mehrfach ? [] : g.optionen[0]?.id)])));

  const waehle = (g, id) =>
    setWerte((w) => {
      if (!g.mehrfach) return { ...w, [g.id]: id };
      const liste = w[g.id] || [];
      return { ...w, [g.id]: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id] };
    });

  return (
    <div className="space-y-6">
      {titel && (
        <div>
          <p className={cn("font-display text-[22px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>
          {text && <p className={cn("mt-1.5 text-[15px] leading-relaxed", dunkel ? "text-white/70" : "text-ink-600")}>{text}</p>}
        </div>
      )}
      {gruppen.map((g) => (
        <fieldset key={g.id}>
          <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>{g.legende}</legend>
          <div className="flex flex-wrap gap-2">
            {g.optionen.map((o) => {
              const aktiv = g.mehrfach ? (werte[g.id] || []).includes(o.id) : werte[g.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "inline-flex min-h-10 cursor-pointer items-center rounded-full px-4 text-[13.5px] font-semibold ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                    aktiv ? "bg-ov-600 text-white ring-ov-600" : dunkel ? "bg-white/[0.06] text-white/80 ring-white/15 hover:bg-white/10" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
                  )}
                >
                  <input type={g.mehrfach ? "checkbox" : "radio"} name={`${typ}-${g.id}`} checked={aktiv} onChange={() => waehle(g, o.id)} className="sr-only" />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className={cn(gruppen.length && "border-t pt-6", dunkel ? "border-white/10" : "border-ink-200")}>
        <AnfrageFormular typ={typ} dunkel={dunkel} felder={felder} daten={werte} button={button} erfolgText={erfolgText} />
      </div>
    </div>
  );
}

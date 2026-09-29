"use client";

import { useId, useState } from "react";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { cn } from "@/components/ui/cn";

/**
 * Fachliche Zusatzfelder + einheitliches Anfrageformular.
 * Die Zusatzfelder landen als `daten` in der Anfrage.
 *
 * zusatz: [{ name, label, art: "select" | "text" | "zahl" | "chips", optionen?: [{ id, label }], platzhalter?, breit? }]
 * legende: Überschrift des Zusatzblocks
 * formular: Props für AnfrageFormular (typ, felder, button, erfolgText …)
 */
export default function AnfrageMitDaten({ zusatz = [], legende = "Ihr Vorhaben", formular = {}, festeDaten = {} }) {
  const id = useId();
  const [werte, setWerte] = useState(() =>
    Object.fromEntries(zusatz.map((f) => [f.name, f.art === "select" || f.art === "chips" ? f.optionen?.[0]?.id ?? "" : ""]))
  );
  const setze = (name, wert) => setWerte((w) => ({ ...w, [name]: wert }));

  const feld =
    "block h-12 w-full rounded-xl bg-white px-4 text-[15px] text-ink-900 outline-none ring-1 ring-ink-200 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500";
  const label = "mb-1.5 block text-[13.5px] font-semibold text-ink-700";

  return (
    <div className="space-y-6">
      {zusatz.length > 0 && (
        <fieldset className="rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70">
          <legend className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">{legende}</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {zusatz.map((f) => {
              const fid = `${id}-${f.name}`;
              if (f.art === "chips") {
                return (
                  <fieldset key={f.name} className="sm:col-span-2">
                    <legend className={label}>{f.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {f.optionen.map((o) => {
                        const an = werte[f.name] === o.id;
                        return (
                          <label
                            key={o.id}
                            className={cn(
                              "inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[14px] font-medium ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                              an ? "bg-navy-950 text-white ring-navy-950" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
                            )}
                          >
                            <input type="radio" name={fid} value={o.id} checked={an} onChange={() => setze(f.name, o.id)} className="sr-only" />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              }
              return (
                <div key={f.name} className={f.breit ? "sm:col-span-2" : undefined}>
                  <label htmlFor={fid} className={label}>
                    {f.label}
                  </label>
                  {f.art === "select" ? (
                    <select id={fid} value={werte[f.name]} onChange={(e) => setze(f.name, e.target.value)} className={feld}>
                      {f.optionen.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={fid}
                      inputMode={f.art === "zahl" ? "decimal" : undefined}
                      placeholder={f.platzhalter}
                      value={werte[f.name]}
                      onChange={(e) => setze(f.name, e.target.value)}
                      className={feld}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
      <AnfrageFormular {...formular} daten={{ ...festeDaten, ...werte }} />
    </div>
  );
}

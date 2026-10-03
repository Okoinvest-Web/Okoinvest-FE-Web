"use client";

import { useId, useState } from "react";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { auswahlKlasse, feldKlasse, labelKlasse } from "@/components/formular/stil";

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

  // Gleiche Feldoptik wie das Anfrageformular darunter (formular/stil): Rahmen mit ausreichendem Kontrast, 16 px mobil
  const feld = feldKlasse(false);
  const label = labelKlasse(false);

  return (
    <div className="space-y-6">
      {zusatz.length > 0 && (
        <fieldset className="rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70 sm:p-6">
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
                              "inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[14px] font-medium ring-1 transition-[background-color,color,box-shadow,transform] duration-200 ease-ov-out active:scale-[0.97] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500 has-[:focus-visible]:ring-offset-2",
                              an ? "bg-navy-950 text-white ring-navy-950" : "bg-white text-ink-700 ring-ink-300 hover:ring-ov-400"
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
                    <div className="relative">
                      <select id={fid} value={werte[f.name]} onChange={(e) => setze(f.name, e.target.value)} className={auswahlKlasse(false)}>
                        {f.optionen.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                    </div>
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

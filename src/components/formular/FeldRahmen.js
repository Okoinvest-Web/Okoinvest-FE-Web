// src/components/formular/FeldRahmen.js
//
// Label über dem Feld, Hilfetext darunter, Fehler (mit Icon) ersetzt den Hilfetext.
// IDs: Hilfetext `${id}-hinweis`, Fehler `${id}-fehler` – passend zu beschreibungIds().

import { cn } from "@/components/ui/cn";
import { fehlerKlasse, hinweisKlasse, labelKlasse } from "./stil";

export function FehlerIcon({ className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={cn("mt-[1px] h-3.5 w-3.5 shrink-0 fill-current", className)}>
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.2c.5 0 .8.4.8.8v3.6a.8.8 0 0 1-1.6 0V5c0-.4.3-.8.8-.8Zm0 6.2a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z" />
    </svg>
  );
}

/** Fehlermeldung am Feld */
export function FeldMeldung({ id, fehler, hinweis, dunkel = false }) {
  if (fehler) {
    return (
      <p id={`${id}-fehler`} className={cn(fehlerKlasse(dunkel), "animate-ov-einblenden")}>
        <FehlerIcon />
        <span className="min-w-0">{fehler}</span>
      </p>
    );
  }
  if (hinweis) return <p id={`${id}-hinweis`} className={hinweisKlasse(dunkel)}>{hinweis}</p>;
  return null;
}

export default function FeldRahmen({ id, label, pflicht = false, optional = false, hinweis, fehler, zusatz, dunkel = false, className, labelClassName, children }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className={cn(labelKlasse(dunkel), labelClassName)}>
            {label}
            {pflicht && (
              <>
                <span aria-hidden="true" className={dunkel ? "text-ov-300" : "text-ov-700"}> *</span>
                <span className="sr-only"> (Pflichtfeld)</span>
              </>
            )}
            {optional && <span className={cn("ml-1 font-normal", dunkel ? "text-white/65" : "text-ink-500")}>(optional)</span>}
          </label>
          {zusatz && <span className="mb-1.5 shrink-0 text-[13px]">{zusatz}</span>}
        </div>
      )}
      {children}
      <FeldMeldung id={id} fehler={fehler} hinweis={hinweis} dunkel={dunkel} />
    </div>
  );
}

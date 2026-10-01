"use client";

// src/components/formular/Textfeld.js
//
// Ein Feld = Label + Eingabe + Hilfetext/Fehler + Erfolgshäkchen.
//   <Textfeld id="x" label="E-Mail" pflicht type="email" {...form.feld("email")} />
// Props: als="input" | "textarea" | "select"; gueltig (Häkchen rechts); rechts (eigenes Element rechts im Feld,
// z. B. Passwort-Knopf); dunkel; feldClassName; alle übrigen Props gehen an das Eingabeelement.
// Barrierefreiheit: aria-invalid, aria-describedby (Fehler bzw. Hilfetext), aria-required.

import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import FeldRahmen from "./FeldRahmen";
import { auswahlKlasse, beschreibungIds, feldKlasse, textbereichKlasse } from "./stil";

export function ErfolgsZeichen({ dunkel = false, className }) {
  return (
    <span aria-hidden="true" className={cn("ov-erfolg pointer-events-none flex h-5 w-5 items-center justify-center rounded-full", dunkel ? "bg-ov-300 text-navy-950" : "bg-ov-600 text-white", className)}>
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" className="ov-linie" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function Textfeld({
  id,
  label,
  pflicht = false,
  optional = false,
  hinweis,
  fehler,
  gueltig = false,
  zusatz,
  rechts,
  dunkel = false,
  als = "input",
  className,
  feldClassName,
  children,
  "aria-describedby": describedbyExtra,
  ...rest
}) {
  const zeigeHaken = gueltig && !fehler && als !== "select";
  const describedby = beschreibungIds(id, { hinweis, fehler, extra: describedbyExtra });
  const gemeinsam = {
    id,
    "aria-invalid": fehler ? true : undefined,
    "aria-describedby": describedby,
    "aria-required": pflicht || undefined,
    required: pflicht || undefined,
    ...rest,
  };

  let feld;
  if (als === "textarea") {
    feld = <textarea {...gemeinsam} className={cn(textbereichKlasse(dunkel), feldClassName)} />;
  } else if (als === "select") {
    feld = (
      <>
        <select {...gemeinsam} className={cn(auswahlKlasse(dunkel), feldClassName)}>
          {children}
        </select>
        <ChevronDown aria-hidden="true" className={cn("pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2", dunkel ? "text-white/70" : "text-ink-500")} />
      </>
    );
  } else {
    feld = <input {...gemeinsam} className={cn(feldKlasse(dunkel), (zeigeHaken || rechts) && "pr-12", rechts && zeigeHaken && "pr-20", feldClassName)} />;
  }

  return (
    <FeldRahmen id={id} label={label} pflicht={pflicht} optional={optional} hinweis={hinweis} fehler={fehler} zusatz={zusatz} dunkel={dunkel} className={className}>
      <div className="relative">
        {feld}
        {(zeigeHaken || rechts) && als !== "select" && (
          <div className={cn("pointer-events-none absolute right-1.5 flex items-center gap-1", als === "textarea" ? "top-3 right-3" : "inset-y-0")}>
            {zeigeHaken && <ErfolgsZeichen dunkel={dunkel} className={rechts ? "" : "mr-2"} />}
            {rechts && <span className="pointer-events-auto">{rechts}</span>}
          </div>
        )}
      </div>
    </FeldRahmen>
  );
}

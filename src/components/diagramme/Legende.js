// src/components/diagramme/Legende.js
//
// Legende des Chart-Systems (server- und client-tauglich). Marke zeigt Farbe UND Form (Fläche, Linie, gestrichelt,
// Punkt), damit Reihen nicht nur über Farbe unterscheidbar sind (WCAG 1.4.1).
// eintraege: [{ name, farbe, stil?: "flaeche"|"linie"|"strich"|"punkt", gestrichelt?: bool, wert?: string }]

import { cn } from "@/components/ui/cn";

export function LegendenMarke({ farbe, stil = "flaeche", gestrichelt = false }) {
  if (stil === "linie" || stil === "strich" || gestrichelt) {
    return (
      <svg aria-hidden="true" width="18" height="10" viewBox="0 0 18 10" className="shrink-0">
        <line x1="1" x2="17" y1="5" y2="5" stroke={farbe} strokeWidth={stil === "strich" ? 3 : 2.5} strokeLinecap="round" strokeDasharray={gestrichelt ? "4 3" : undefined} />
      </svg>
    );
  }
  if (stil === "punkt") return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: farbe }} />;
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: farbe }} />;
}

export default function Legende({ eintraege = [], dunkel = false, className }) {
  if (!eintraege.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]", dunkel ? "text-white/75" : "text-ink-600", className)}>
      {eintraege.map((e) => (
        <li key={e.name} className="inline-flex items-center gap-1.5">
          <LegendenMarke farbe={e.farbe} stil={e.stil} gestrichelt={e.gestrichelt} />
          {e.name}
          {e.wert != null && <span className={cn("ov-num font-semibold", dunkel ? "text-white" : "text-ink-900")}>{e.wert}</span>}
        </li>
      ))}
    </ul>
  );
}

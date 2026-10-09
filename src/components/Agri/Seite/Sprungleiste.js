// Sprungnavigation zu den Abschnitten einer langen Seite (Server-Komponente, reine Anker)
// Mobil: horizontal wischbare Chip-Leiste, ab md eine Zeile mit Titel.
import { ArrowDownRight } from "lucide-react";
import { spracheDerAnfrage } from "@/lib/land/seite";

/** ziele: [{ href, label, nr? }] */
export default function Sprungleiste({ titel: titelProp, ziele }) {
  const titel = titelProp ?? (spracheDerAnfrage() === "en" ? "On this page" : "Auf dieser Seite");
  return (
    <nav aria-label={titel} className="bg-white pb-2 pt-12 md:pt-16">
      <div className="ov-container">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <p className="ov-overline shrink-0 text-ink-500">{titel}</p>
          <ul className="ov-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {ziele.map((z, i) => (
              <li key={z.href} className="shrink-0">
                <a
                  href={z.href}
                  className="group inline-flex h-10 items-center gap-2 rounded-full bg-sand-50 pl-2 pr-4 text-[14px] font-medium text-ink-700 ring-1 ring-inset ring-ink-200/80 transition-colors hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold tabular-nums text-ink-500 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {z.label}
                  <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:text-ov-600 motion-reduce:transition-none" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}

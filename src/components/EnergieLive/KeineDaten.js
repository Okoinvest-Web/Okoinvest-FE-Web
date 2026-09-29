import { CloudOff, ExternalLink } from "lucide-react";

/** Ruhiger Ersatzzustand, wenn eine Datenquelle ausfällt – nie ein leeres Diagramm. */
export default function KeineDaten({ titel, text }) {
  return (
    <div className="flex flex-col items-center rounded-[2rem] bg-white px-6 py-14 text-center shadow-xl ring-1 ring-ink-200/70 md:py-20">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
        <CloudOff aria-hidden="true" className="h-7 w-7" />
      </span>
      <h3 className="ov-h3 mt-5 text-ink-900">{titel}</h3>
      <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-ink-600">{text}</p>
      <a
        href="https://www.energy-charts.info/?l=de&c=DE"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
      >
        Energy-Charts öffnen
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  );
}

// Kleine Datenvisualisierungen für die Agri-Seiten (Server-Komponenten, HTML/CSS)
import { cn } from "@/components/ui/cn";

/**
 * Spannendiagramm: horizontale Bereichsbalken auf gemeinsamer Achse.
 * zeilen: [{ label, sub, min, max, hervor? }], achse: { max, schritt, einheit }
 * Inhalte sind zusätzlich als Text in der Tabelle für Screenreader vorhanden.
 */
export function Spannen({ titel, zeilen, achse, fmt }) {
  const ticks = [];
  for (let v = 0; v <= achse.max; v += achse.schritt) ticks.push(v);
  const pos = (v) => `${(v / achse.max) * 100}%`;
  return (
    <figure className="rounded-[1.75rem] bg-white p-5 shadow-e2 ring-1 ring-ov-100 sm:p-7">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[16px] font-bold text-ink-900">{titel}</span>
        <span className="text-[12.5px] text-ink-500">{achse.einheit}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{titel}</caption>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.label}>
              <th scope="row">{z.label}</th>
              <td>
                {fmt(z.min)}–{fmt(z.max)} {achse.einheit}
                {z.sub ? `, ${z.sub}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden="true" className="mt-6 space-y-5">
        {zeilen.map((z, i) => (
          <div key={z.label} className="grid gap-2 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center sm:gap-5">
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <p className={cn("text-[14px] font-semibold leading-tight", z.hervor ? "text-ov-800" : "text-ink-800")}>{z.label}</p>
              <p className="ov-num text-[12.5px] text-ink-500 sm:mt-0.5">
                {fmt(z.min)}–{fmt(z.max)}
                {z.sub && <span className="text-ink-400"> · {z.sub}</span>}
              </p>
            </div>
            <div className="relative h-7">
              {ticks.map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-ink-100" style={{ left: pos(t) }} />
              ))}
              <span
                className={cn(
                  "ov-balken-x absolute top-[calc(50%-0.4375rem)] h-3.5 rounded-full",
                  z.hervor ? "bg-gradient-to-r from-ov-400 to-ov-600 shadow-[0_4px_12px_-4px_rgba(102,153,51,0.6)]" : "bg-gradient-to-r from-ink-300 to-ink-400"
                )}
                style={{ left: pos(z.min), width: `${((z.max - z.min) / achse.max) * 100}%`, "--ov-delay": `${150 + i * 90}ms` }}
              />
              <span className={cn("absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white", z.hervor ? "border-ov-600" : "border-ink-400")} style={{ left: pos(z.min) }} />
              <span className={cn("absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white", z.hervor ? "border-ov-600" : "border-ink-400")} style={{ left: pos(z.max) }} />
            </div>
          </div>
        ))}
        <div className="grid sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-5">
          <span className="hidden sm:block" />
          <div className="relative h-4 text-[11.5px] text-ink-400">
            {ticks.map((t, i) => (
              <span key={t} className={cn("ov-num absolute", i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2", i % 2 === 1 && "max-sm:hidden")} style={{ left: pos(t) }}>
                {fmt(t)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/**
 * Landnutzungseffizienz: Referenz 100 % gegen zwei Messwerte (dunkler Hintergrund).
 * werte: [{ label, wert (z. B. 1.6), text }]
 */
export function Landnutzung({ werte, quelle }) {
  const max = 2;
  return (
    <figure className="rounded-[1.75rem] bg-white/[0.04] p-6 ring-1 ring-inset ring-white/10 backdrop-blur-sm md:p-8">
      <figcaption className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ov-300">Landnutzungseffizienz</figcaption>
      <div className="mt-6 space-y-6">
        <Zeile label="Getrennte Nutzung" sub="Referenz: Ernte oder Strom je Fläche" wert={1} max={max} text="100 %" leise i={0} />
        {werte.map((w, i) => (
          <Zeile key={w.label} label={w.label} sub={w.sub} wert={w.wert} max={max} text={w.text} i={i + 1} />
        ))}
      </div>
      {quelle && <p className="mt-6 border-t border-white/10 pt-4 text-[12.5px] leading-relaxed text-white/55">{quelle}</p>}
    </figure>
  );
}

function Zeile({ label, sub, wert, max, text, leise = false, i = 0 }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-white">{label}</p>
          {sub && <p className="mt-0.5 text-[12.5px] text-white/55">{sub}</p>}
        </div>
        <p className={cn("ov-kpi shrink-0 text-[28px] md:text-[34px]", leise ? "text-white/60" : "text-white")}>{text}</p>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-3 rounded-full bg-white/[0.07]">
        <div
          className={cn("ov-balken-x h-full rounded-full", leise ? "bg-white/25" : "bg-gradient-to-r from-ov-500 via-ov-300 to-sun-300")}
          style={{ width: `${(wert / max) * 100}%`, "--ov-delay": `${200 + i * 220}ms` }}
        />
        <span className="absolute -top-1.5 h-6 w-px bg-white/40" style={{ left: "50%" }} />
      </div>
    </div>
  );
}

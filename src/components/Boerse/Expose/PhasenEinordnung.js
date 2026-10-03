// Einordnung der Phase im Exposé: Stufenleiste aller Phasen + Preisspannen je Phase (Marktannahmen)
// mit Markierung der Preisindikation des Projekts, sofern sie je kWp angegeben ist.
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { cn } from "@/components/ui/cn";

export default function PhasenEinordnung({ phase, preisProKwp }) {
  const idx = PHASEN.findIndex((x) => x.id === phase.id);
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const bestand = PHASEN.find((p) => p.id === "cod");
  const skalaMax = Math.ceil(Math.max(...entwicklung.map((p) => p.preisProKwp.max)) / 20) * 20;
  const zeigeMarke = typeof preisProKwp === "number" && preisProKwp > 0 && phase.id !== "cod" && preisProKwp <= skalaMax;
  const pos = (v) => `${(v / skalaMax) * 100}%`;

  return (
    <div className="ov-noise relative min-w-0 overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white md:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/20 blur-[100px]" />
      <div className="relative">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Einordnung der Phase</p>
        <h2 className="mt-3 font-display text-[24px] font-bold leading-tight md:text-[28px]">{phase.label}</h2>
        <p className="mt-1.5 text-[13.5px] text-white/60">Stufe {idx + 1} von {PHASEN.length}: {PHASEN[0].kurz} → {PHASEN[PHASEN.length - 1].kurz}</p>

        {/* Stufenleiste */}
        <ol className="mt-6 grid grid-cols-6 gap-1.5" aria-label="Entwicklungsphasen">
          {PHASEN.map((x, i) => (
            <li key={x.id} className="min-w-0" aria-current={i === idx ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full", i < idx ? "bg-ov-400" : i === idx ? "bg-ov-300 shadow-[0_0_0_3px_rgba(178,214,138,0.25)]" : "bg-white/15")} />
              <span className="sr-only">{x.label}</span>
            </li>
          ))}
        </ol>

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] text-white/55">Typisches Risiko</dt>
            <dd className="mt-1 font-display text-[17px] font-bold">{phase.risiko}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-white/55">Übliche Preise (Markt)</dt>
            <dd className="ov-num mt-1 font-display text-[17px] font-bold">{fmt(phase.preisProKwp.min)}–{fmt(phase.preisProKwp.max)} €/kWp</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-[12px] text-white/55">Typischer Abstand bis Baureife</dt>
            <dd className="mt-1 font-display text-[17px] font-bold">{phase.monateBisRtb ? `rund ${phase.monateBisRtb} Monate` : "baureif bzw. in Betrieb"}</dd>
          </div>
        </dl>

        {/* Preisspannen je Phase */}
        <figure className="mt-7 border-t border-white/10 pt-6">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Preisspannen je Phase (€/kWp)</span>
            {zeigeMarke && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-white/70">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun-300 ring-2 ring-navy-950" /> dieses Projekt: {fmt(preisProKwp)} €/kWp
              </span>
            )}
          </figcaption>
          <ul className="mt-4 space-y-2.5">
            {entwicklung.map((p) => {
              const aktiv = p.id === phase.id;
              return (
                <li key={p.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_5.5rem]">
                  <span className={cn("truncate text-[12.5px]", aktiv ? "font-semibold text-white" : "text-white/55")}>{p.kurz}</span>
                  <span className="relative h-2.5 rounded-full bg-white/[0.06]">
                    <span
                      className={cn("absolute inset-y-0 rounded-full", aktiv ? "bg-ov-300" : "bg-white/25")}
                      style={{ left: pos(p.preisProKwp.min), width: `calc(${pos(p.preisProKwp.max - p.preisProKwp.min)})` }}
                    />
                    {aktiv && zeigeMarke && (
                      <span aria-hidden="true" className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun-300 ring-[3px] ring-navy-950" style={{ left: pos(preisProKwp) }} />
                    )}
                  </span>
                  <span className={cn("ov-num hidden text-right text-[12px] sm:block", aktiv ? "font-semibold text-white" : "text-white/50")}>{fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)}</span>
                </li>
              );
            })}
          </ul>
          <div aria-hidden="true" className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_5.5rem]">
            <span />
            <span className="ov-num flex justify-between text-[10.5px] text-white/40"><span>0</span><span>{fmt(skalaMax / 2)}</span><span>{fmt(skalaMax)}</span></span>
          </div>
          <p className="mt-3 text-[12px] text-white/55">{bestand.kurz} (in Betrieb): {fmt(bestand.preisProKwp.min)}–{fmt(bestand.preisProKwp.max)} €/kWp – außerhalb der Skala.</p>
        </figure>

        <p className="mt-6 text-[12.5px] leading-relaxed text-white/50">Marktspannen DACH als Orientierung – stark abhängig von Netzanschluss, Größe, Vergütung und Standort. Für Käufer kostenfrei; Anbieter zahlen {PROVISION.verkaeufer.text}.</p>
      </div>
    </div>
  );
}

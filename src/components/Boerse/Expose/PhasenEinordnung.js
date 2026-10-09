// Einordnung der Phase im Exposé: Stufenleiste aller Phasen + Preisspannen je Phase (Marktannahmen)
// mit Markierung der Preisindikation des Projekts, sofern sie je kWp angegeben ist.
import { PHASEN, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { cn } from "@/components/ui/cn";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

const RISIKO_EN = { "sehr hoch": "very high", hoch: "high", "mittel–hoch": "medium–high", mittel: "medium", gering: "low", "sehr gering": "very low" };

export default function PhasenEinordnung({ phase, preisProKwp }) {
  const idx = PHASEN.findIndex((x) => x.id === phase.id);
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const bestand = PHASEN.find((p) => p.id === "cod");
  const skalaMax = Math.ceil(Math.max(...entwicklung.map((p) => p.preisProKwp.max)) / 20) * 20;
  const zeigeMarke = typeof preisProKwp === "number" && preisProKwp > 0 && phase.id !== "cod" && preisProKwp <= skalaMax;
  const pos = (v) => `${(v / skalaMax) * 100}%`;
  const en = spracheDerAnfrage() === "en";
  const f = (n) => (en ? fmtZahl(n, 0, "en") : fmt(n));
  const label = (x) => (en ? BEGRIFFE_EN.phase[x.id] ?? x.label : x.label);
  const kurz = (x) => (en ? BEGRIFFE_EN.phaseKurz[x.id] ?? x.kurz : x.kurz);

  return (
    <div className="ov-noise relative min-w-0 overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white md:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/20 blur-[100px]" />
      <div className="relative">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">{en ? "Stage classification" : "Einordnung der Phase"}</p>
        <h2 className="mt-3 font-display text-[24px] font-bold leading-tight md:text-[28px]">{label(phase)}</h2>
        <p className="mt-1.5 text-[13.5px] text-white/60">{en ? "Stage" : "Stufe"} {idx + 1} {en ? "of" : "von"} {PHASEN.length}: {kurz(PHASEN[0])} → {kurz(PHASEN[PHASEN.length - 1])}</p>

        {/* Stufenleiste */}
        <ol className="mt-6 grid grid-cols-6 gap-1.5" aria-label={en ? "Development stages" : "Entwicklungsphasen"}>
          {PHASEN.map((x, i) => (
            <li key={x.id} className="min-w-0" aria-current={i === idx ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full", i < idx ? "bg-ov-400" : i === idx ? "bg-ov-300 shadow-[0_0_0_3px_rgba(178,214,138,0.25)]" : "bg-white/15")} />
              <span className="sr-only">{label(x)}</span>
            </li>
          ))}
        </ol>

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-[12px] text-white/55">{en ? "Typical risk" : "Typisches Risiko"}</dt>
            <dd className="mt-1 font-display text-[17px] font-bold">{en ? RISIKO_EN[phase.risiko] ?? phase.risiko : phase.risiko}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-white/55">{en ? "Usual prices (market)" : "Übliche Preise (Markt)"}</dt>
            <dd className="ov-num mt-1 font-display text-[17px] font-bold">{f(phase.preisProKwp.min)}–{f(phase.preisProKwp.max)} €/kWp</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-[12px] text-white/55">{en ? "Typical time to ready-to-build" : "Typischer Abstand bis Baureife"}</dt>
            <dd className="mt-1 font-display text-[17px] font-bold">{phase.monateBisRtb ? (en ? `around ${phase.monateBisRtb} months` : `rund ${phase.monateBisRtb} Monate`) : en ? "ready-to-build or operating" : "baureif bzw. in Betrieb"}</dd>
          </div>
        </dl>

        {/* Preisspannen je Phase */}
        <figure className="mt-7 border-t border-white/10 pt-6">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">{en ? "Price ranges per stage (€/kWp)" : "Preisspannen je Phase (€/kWp)"}</span>
            {zeigeMarke && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-white/70">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun-300 ring-2 ring-navy-950" /> {en ? "this project" : "dieses Projekt"}: {f(preisProKwp)} €/kWp
              </span>
            )}
          </figcaption>
          <ul className="mt-4 space-y-2.5">
            {entwicklung.map((p) => {
              const aktiv = p.id === phase.id;
              return (
                <li key={p.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_5.5rem]">
                  <span className={cn("truncate text-[12.5px]", aktiv ? "font-semibold text-white" : "text-white/55")}>{kurz(p)}</span>
                  <span className="relative h-2.5 rounded-full bg-white/[0.06]">
                    <span
                      className={cn("absolute inset-y-0 rounded-full", aktiv ? "bg-ov-300" : "bg-white/25")}
                      style={{ left: pos(p.preisProKwp.min), width: `calc(${pos(p.preisProKwp.max - p.preisProKwp.min)})` }}
                    />
                    {aktiv && zeigeMarke && (
                      <span aria-hidden="true" className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sun-300 ring-[3px] ring-navy-950" style={{ left: pos(preisProKwp) }} />
                    )}
                  </span>
                  <span className={cn("ov-num hidden text-right text-[12px] sm:block", aktiv ? "font-semibold text-white" : "text-white/50")}>{f(p.preisProKwp.min)}–{f(p.preisProKwp.max)}</span>
                </li>
              );
            })}
          </ul>
          <div aria-hidden="true" className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_5.5rem]">
            <span />
            <span className="ov-num flex justify-between text-[10.5px] text-white/40"><span>0</span><span>{f(skalaMax / 2)}</span><span>{f(skalaMax)}</span></span>
          </div>
          <p className="mt-3 text-[12px] text-white/55">{en ? `${kurz(bestand)}: ${f(bestand.preisProKwp.min)}–${f(bestand.preisProKwp.max)} €/kWp – outside the scale.` : `${bestand.kurz} (in Betrieb): ${f(bestand.preisProKwp.min)}–${f(bestand.preisProKwp.max)} €/kWp – außerhalb der Skala.`}</p>
        </figure>

        <p className="mt-6 text-[12.5px] leading-relaxed text-white/50">{en ? `DACH market ranges as guidance – strongly dependent on grid connection, size, remuneration and location. Free of charge for buyers; sellers pay ${fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en")}–${fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en")} % of the purchase price, only on successful closing.` : `Marktspannen DACH als Orientierung – stark abhängig von Netzanschluss, Größe, Vergütung und Standort. Für Käufer kostenfrei; Anbieter zahlen ${PROVISION.verkaeufer.text}.`}</p>
      </div>
    </div>
  );
}

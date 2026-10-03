import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/**
 * Werttreppe eines Freiflächenprojekts: Kaufpreisspanne je kWp nach
 * Entwicklungsphase (ohne Bestand – der liegt eine Größenordnung höher und
 * würde die Skala sprengen; er steht als Fußnote darunter).
 * Reine Server-Komponente, Balken in CSS, Werte aus markt.js.
 *
 * Aufbau je Phase: Name + Risiko-Meter + Spanne in einer Zeile, darunter die
 * Spannen-Leiste auf einer gemeinsamen €-Skala mit Hilfslinien. So bleibt die
 * Beschriftung auch mobil vollständig lesbar (nie im Balken abgeschnitten).
 */
const RISIKO_STUFE = { "sehr hoch": 5, hoch: 4, "mittel–hoch": 3, mittel: 2, gering: 1, "sehr gering": 0 };

export default function Werttreppe() {
  const stufen = PHASEN.filter((p) => p.id !== "cod");
  const bestand = PHASEN.find((p) => p.id === "cod");
  const max = Math.max(...stufen.map((p) => p.preisProKwp.max));
  const skala = Math.ceil(max / 50) * 50;
  const ticks = Array.from({ length: skala / 50 + 1 }, (_, i) => i * 50);

  return (
    <figure className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-7 md:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-ov-100/70 blur-3xl" />
      <figcaption className="relative">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Orientierung für Käufer und Verkäufer</p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-display text-[20px] font-extrabold tracking-tight text-ink-900">Projektwert nach Phase</span>
          <span className="text-[12.5px] text-ink-500">Kaufpreis je kWp, Spanne DACH</span>
        </div>
      </figcaption>

      <ol className="relative mt-7 space-y-5">
        {stufen.map((p, i) => {
          const links = (p.preisProKwp.min / skala) * 100;
          const breite = ((p.preisProKwp.max - p.preisProKwp.min) / skala) * 100;
          const stufe = RISIKO_STUFE[p.risiko];
          return (
            <li key={p.id}>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold leading-tight text-ink-900">
                    <span className="ov-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10.5px] font-bold text-ink-600">{i + 1}</span>
                    <span className="truncate">{p.kurz}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 pl-7 text-[12px] text-ink-500">
                    {stufe !== undefined && (
                      <span aria-hidden="true" className="flex items-end gap-[2px]">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`w-[3px] rounded-full ${n <= stufe ? "bg-sun-500" : "bg-ink-200"}`} style={{ height: `${4 + n * 1.6}px` }} />
                        ))}
                      </span>
                    )}
                    Risiko {p.risiko}
                  </p>
                </div>
                <p className="ov-num shrink-0 whitespace-nowrap font-display text-[15px] font-bold text-ink-900">
                  {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)} <span className="text-[12px] font-semibold text-ink-500">€/kWp</span>
                </p>
              </div>
              <div aria-hidden="true" className="relative mt-2.5 h-3 rounded-full bg-ink-100/80">
                {ticks.slice(1, -1).map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-white" style={{ left: `${(t / skala) * 100}%` }} />
                ))}
                <span
                  className="ov-balken-x absolute inset-y-0 rounded-full bg-gradient-to-r from-ov-300 to-ov-600 shadow-[0_0_0_3px_rgba(255,255,255,0.9)]"
                  style={{ left: `${links}%`, width: `${breite}%`, "--i": i, opacity: 0.6 + (i / (stufen.length - 1)) * 0.4 }}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {/* gemeinsame Skala */}
      <div aria-hidden="true" className="relative mt-3 h-4 text-[11px] text-ink-400">
        {ticks.map((t, i) => (
          <span
            key={t}
            className="ov-num absolute"
            style={i === 0 ? { left: 0 } : i === ticks.length - 1 ? { right: 0 } : { left: `${(t / skala) * 100}%`, transform: "translateX(-50%)" }}
          >
            {t} €
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
        <span aria-hidden="true" className="mt-0.5 h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-navy-500 to-navy-800" />
        <p className="text-[12.5px] leading-relaxed text-ink-600">
          <span className="font-semibold text-ink-900">Bestandsanlagen (in Betrieb)</span> werden nach Ertragswert gehandelt, typischerweise{" "}
          <span className="ov-num font-semibold text-ink-900">{fmt(bestand.preisProKwp.min)}–{fmt(bestand.preisProKwp.max)} €</span> je kWp.
          Orientierungswerte – Netzanschluss, Tarif und Standort verschieben die Spanne deutlich.
        </p>
      </div>
    </figure>
  );
}

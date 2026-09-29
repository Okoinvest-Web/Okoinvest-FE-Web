import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/**
 * Werttreppe eines Freiflächenprojekts: Kaufpreisspanne je kWp nach
 * Entwicklungsphase (ohne Bestand – der liegt eine Größenordnung höher und
 * würde die Skala sprengen; er steht als Fußnote darunter).
 * Reine Server-Komponente, Balken in CSS, Werte aus markt.js.
 */
export default function Werttreppe() {
  const stufen = PHASEN.filter((p) => p.id !== "cod");
  const bestand = PHASEN.find((p) => p.id === "cod");
  const max = Math.max(...stufen.map((p) => p.preisProKwp.max));
  return (
    <figure className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 md:p-8">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[19px] font-bold text-ink-900">Projektwert nach Phase</span>
        <span className="text-[12.5px] text-ink-500">Kaufpreis je kWp, Spanne DACH</span>
      </figcaption>
      <ol className="mt-7 space-y-4">
        {stufen.map((p, i) => {
          const links = (p.preisProKwp.min / max) * 100;
          const breite = ((p.preisProKwp.max - p.preisProKwp.min) / max) * 100;
          return (
            <li key={p.id} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink-900">{p.kurz}</p>
                <p className="text-[12px] text-ink-500">Risiko {p.risiko}</p>
              </div>
              <div className="relative h-9 rounded-full bg-ink-100">
                <div
                  className="absolute inset-y-1 flex items-center justify-end rounded-full bg-gradient-to-r from-ov-400 to-ov-600 px-3"
                  style={{ left: `${links}%`, width: `${Math.max(breite, 18)}%`, opacity: 0.55 + (i / stufen.length) * 0.45 }}
                >
                  <span className="ov-num whitespace-nowrap text-[12px] font-bold text-white">
                    {fmt(p.preisProKwp.min)}–{fmt(p.preisProKwp.max)} €
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 border-t border-ink-100 pt-4 text-[12.5px] leading-relaxed text-ink-500">
        Bestandsanlagen (in Betrieb) werden nach Ertragswert gehandelt, typischerweise {fmt(bestand.preisProKwp.min)}–{fmt(bestand.preisProKwp.max)} € je kWp.
        Orientierungswerte – Netzanschluss, Tarif und Standort verschieben die Spanne deutlich.
      </p>
    </figure>
  );
}

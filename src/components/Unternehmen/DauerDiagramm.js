// Spannen-Diagramm: typische Dauer je Schritt der Freiflächen-Entwicklung.
// Datenquelle sind die Prozessdaten (/prozess) – dieselben Spannen, keine Zusagen.
import { ZIELGRUPPEN } from "@/components/Prozess/prozessDaten";

const MAX = 36;
const TICKS = [0, 6, 12, 18, 24, 30, 36];
const pct = (m) => `${(m / MAX) * 100}%`;

export default function DauerDiagramm() {
  const schritte = ZIELGRUPPEN[0].schritte.filter((s) => s.monate);
  return (
    <figure className="ov-flaeche-erhaben p-5 sm:p-7 md:p-8">
      <figcaption>
        <span className="block font-display text-[17px] font-bold text-ink-900">Typische Dauer je Schritt</span>
        <span className="mt-1 block text-[13.5px] text-ink-500">Freiflächen-Solarpark im DACH-Raum, in Monaten</span>
      </figcaption>

      <div className="relative mt-7">
        <div aria-hidden="true" className="absolute inset-0">
          {TICKS.map((t) => (
            <span key={t} className="absolute bottom-0 top-0 w-px bg-ink-100" style={{ left: pct(t) }} />
          ))}
        </div>
        <dl className="relative space-y-5">
          {schritte.map((s) => {
            const [a, b] = s.monate;
            const lang = b >= 12;
            return (
              <div key={s.titel}>
                <dt className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="font-semibold text-ink-900">{s.titel}</span>
                  <span className="ov-num shrink-0 text-[13px] font-semibold text-ink-600">{s.dauer}</span>
                </dt>
                <dd className="relative mt-2 h-3 rounded-full bg-ink-50" aria-hidden="true">
                  <span
                    className={`absolute inset-y-0 rounded-full ${lang ? "bg-gradient-to-r from-ov-500 to-sun-400" : "bg-ov-400"}`}
                    style={{ left: pct(a), width: `max(6px, ${pct(b - a)})` }}
                  />
                </dd>
              </div>
            );
          })}
        </dl>
        <div aria-hidden="true" className="relative mt-4 h-5">
          {TICKS.map((t) => (
            <span key={t} className="ov-num absolute top-0 -translate-x-1/2 text-[11.5px] text-ink-400 first:translate-x-0 last:-translate-x-full" style={{ left: pct(t) }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 border-t border-ink-100 pt-4 text-[12.5px] leading-relaxed text-ink-500">
        Typische Spannen, keine Zusagen – Gemeinde, Netzbetreiber und Behörden bestimmen das Tempo. Danach folgt der Betrieb über Jahrzehnte.
      </p>
    </figure>
  );
}

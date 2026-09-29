import { QUELLEN } from "./berechnung";

const farbe = (key) => QUELLEN.find((q) => q.key === key)?.farbe;

// Schematische Angebotskurve: Breite = verfügbare Leistung, Höhe = Grenzkosten.
// Bewusst ohne Zahlen – es geht um das Prinzip, nicht um exakte Werte.
const BLOECKE = [
  { name: "Wind & Solar", breite: 38, hoehe: 3, farbe: farbe("windOnshore") },
  { name: "Wasser & Biomasse", breite: 10, hoehe: 20, farbe: farbe("biomasse") },
  { name: "Braunkohle", breite: 13, hoehe: 40, farbe: farbe("braunkohle") },
  { name: "Steinkohle", breite: 10, hoehe: 56, farbe: farbe("steinkohle") },
  { name: "Erdgas", breite: 20, hoehe: 78, farbe: farbe("gas") },
  { name: "Öl & Reserve", breite: 9, hoehe: 100, farbe: "#97a0b0" },
];

const NACHFRAGE = [
  { nr: 1, pos: 30, titel: "Sonniger, windiger Mittag", text: "Wind und Solar decken fast alles – der Preis bleibt niedrig, bei Überschuss sogar negativ." },
  { nr: 2, pos: 84, titel: "Windstiller Winterabend", text: "Gaskraftwerke werden gebraucht – ihr teurer Strom setzt den Preis für alle." },
];

/** Merit-Order als responsive HTML-Grafik (keine skalierte Schrift, lesbar auf dem Smartphone). */
export default function MeritOrder() {
  return (
    <figure className="rounded-[2rem] bg-white p-5 text-ink-900 shadow-2xl sm:p-8">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[18px] font-bold">Merit-Order – so entsteht der Börsenpreis</span>
        <span className="text-[12.5px] text-ink-500">schematisch</span>
      </figcaption>

      <div className="relative mt-8 flex">
        {/* y-Achsenbeschriftung */}
        <div className="mr-2 flex w-5 shrink-0 items-center justify-center">
          <span className="-rotate-90 whitespace-nowrap text-[11.5px] text-ink-500">Grenzkosten →</span>
        </div>
        <div className="relative h-56 flex-1 border-b border-l border-ink-300 sm:h-64">
          <div className="absolute inset-0 flex items-end gap-[2px] pl-[2px]">
            {BLOECKE.map((b) => (
              <div
                key={b.name}
                className="rounded-t-[4px]"
                style={{ width: `calc(${b.breite}% - 2px)`, height: `${Math.max(b.hoehe, 3)}%`, background: b.farbe }}
                title={b.name}
              />
            ))}
          </div>
          {NACHFRAGE.map((n) => (
            <div key={n.nr} className="absolute inset-y-0" style={{ left: `${n.pos}%` }}>
              <div className="absolute -top-3 bottom-0 w-0 border-l-2 border-ink-900" />
              <span className="absolute -top-6 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-ink-900 text-[12px] font-bold text-white ring-2 ring-white">
                {n.nr}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-right text-[11.5px] text-ink-500">verfügbare Kraftwerksleistung →</p>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-600">
        {BLOECKE.map((b) => (
          <li key={b.name} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: b.farbe }} />
            {b.name}
          </li>
        ))}
      </ul>

      <ol className="mt-6 grid gap-3 border-t border-ink-100 pt-6 sm:grid-cols-2">
        {NACHFRAGE.map((n) => (
          <li key={n.nr} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[12px] font-bold text-white">{n.nr}</span>
            <span className="text-[14px] leading-snug text-ink-600">
              <strong className="block text-ink-900">{n.titel}</strong>
              {n.text}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

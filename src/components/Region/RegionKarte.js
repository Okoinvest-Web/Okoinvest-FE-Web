import { cn } from "@/components/ui/cn";
import { META } from "@/data/regionen/meta";
import { pfad, regionSchluessel } from "@/lib/land";

const ZELLE = 72;
const LUECKE = 6;
const SPALTEN = 8;
const ZEILEN = 7;

const FARBEN = {
  DE: { kachel: "fill-ov-600 group-hover:fill-ov-700 group-focus-visible:fill-ov-700", text: "fill-white" },
  AT: { kachel: "fill-navy-700 group-hover:fill-navy-800 group-focus-visible:fill-navy-800", text: "fill-white" },
  CH: { kachel: "fill-ink-700 group-hover:fill-ink-800 group-focus-visible:fill-ink-800", text: "fill-white" },
};

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };

/**
 * Stilisierte Kachelkarte DACH – jede Kachel ist ein Link auf die Regionalseite.
 * Schematisch, nicht maßstäblich: Die Lage der Kacheln gibt Nachbarschaften grob wieder.
 *
 * props:
 *  aktiv     slug der hervorgehobenen Region (Regionalseite)
 *  nachbarn  slugs, die leicht betont werden
 *  titel     zugänglicher Name der Karte
 */
export default function RegionKarte({ aktiv, nachbarn = [], titel = "Karte der Regionen in Deutschland, Österreich und der Schweiz", className }) {
  const breite = SPALTEN * ZELLE;
  const hoehe = ZEILEN * ZELLE;
  const hervor = new Set(nachbarn);

  return (
    <figure className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${breite} ${hoehe}`} role="group" aria-label={titel} className="h-auto w-full select-none">
        {/* Ländergrenze DE/AT-CH als dezente Linie */}
        <line x1={0} x2={breite} y1={5 * ZELLE - LUECKE / 2} y2={5 * ZELLE - LUECKE / 2} className="stroke-ink-200" strokeDasharray="4 6" strokeWidth={1.5} />
        {META.map((m) => {
          const w = m.karte.w || 1;
          const x = m.karte.x * ZELLE + LUECKE / 2;
          const y = m.karte.y * ZELLE + LUECKE / 2;
          const bw = w * ZELLE - LUECKE;
          const bh = ZELLE - LUECKE;
          const istAktiv = m.slug === aktiv;
          const gedimmt = aktiv && !istAktiv && !hervor.has(m.slug);
          const f = FARBEN[m.land];
          return (
            <a
              key={m.slug}
              href={pfad(regionSchluessel(m.slug))}
              aria-label={`Solarpark und Agri-PV in ${m.name} (${LAND_NAME[m.land]})`}
              aria-current={istAktiv ? "page" : undefined}
              className="group outline-none"
            >
              <title>{m.name}</title>
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={14}
                className={cn("transition-[fill,opacity] duration-200", istAktiv ? "fill-sun-400" : f.kachel, gedimmt && "opacity-45 group-hover:opacity-100")}
              />
              <rect
                x={x}
                y={y}
                width={bw}
                height={bh}
                rx={14}
                fill="none"
                strokeWidth={3}
                className="stroke-transparent group-focus-visible:stroke-sun-400"
              />
              <text
                x={x + bw / 2}
                y={y + bh / 2 + 7}
                textAnchor="middle"
                className={cn("pointer-events-none font-display text-[20px] font-extrabold", istAktiv ? "fill-navy-950" : f.text)}
              >
                {m.kurz}
              </text>
            </a>
          );
        })}
      </svg>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-600">
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[4px] bg-ov-600" />Deutschland</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[4px] bg-navy-700" />Österreich</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[4px] bg-ink-700" />Schweiz</span>
        {aktiv && <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[4px] bg-sun-400" />diese Seite</span>}
        <span className="text-ink-500">Schematische Darstellung, nicht maßstäblich</span>
      </figcaption>
    </figure>
  );
}

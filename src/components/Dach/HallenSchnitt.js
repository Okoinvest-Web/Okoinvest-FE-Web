import { cn } from "@/components/ui/cn";

/**
 * Schnitt durch eine Gewerbehalle mit PV auf dem Dach (Inline-SVG,
 * Server-Komponente). Nummern verweisen auf die Legende – die Grafik bleibt
 * so auch auf dem Handy lesbar.
 */

const LEGENDE = [
  { t: "Module auf dem Dach", x: "Geneigte Dächer parallel belegt, Flachdächer flach Ost/West aufgeständert – mit Ballast oder verklebt, ohne die Dachhaut zu durchdringen, wo möglich." },
  { t: "Statik & Tragreserve", x: "Tragwerksplaner prüft die Zusatzlast (meist ca. 12–25 kg/m²) samt Schnee und Wind. Ohne Reserve keine Belegung." },
  { t: "Dachhaut & Restnutzungsdauer", x: "Das Dach muss die Vertragslaufzeit halten – als Faustwert mindestens 25 Jahre. Sonst zuerst sanieren." },
  { t: "Brandschutzabstände", x: "Freie Streifen an Brandwänden, Lichtbändern und Rauchabzügen; Kabel sauber geführt. Feuerwehr und Versicherer werden früh eingebunden." },
  { t: "Dachzugang & Sicherung", x: "Fester Zugang, Absturzsicherung und Laufwege für Wartung – geregelt im Vertrag mit Anmeldung und Haftung." },
  { t: "Wechselrichter", x: "An der Fassade oder im Technikraum, gut belüftet, zugänglich für Service." },
  { t: "Netzanschluss", x: "Über den vorhandenen Hausanschluss oder eine eigene Übergabestation – bei größeren Anlagen oft Mittelspannung." },
  { t: "Stromverbrauch im Gebäude", x: "Wird der Dachstrom direkt im Gebäude genutzt, ersetzt er teuren Netzstrom – Grundlage für Dachstrom-PPA und Eigenverbrauch." },
];

function Marke({ x, y, n }) {
  return (
    <g>
      <circle cx={x} cy={y} r="17" className="fill-navy-950" />
      <circle cx={x} cy={y} r="17" fill="none" stroke="#fff" strokeWidth="2.5" />
      <text x={x} y={y + 6} textAnchor="middle" className="fill-white font-display text-[17px] font-extrabold">
        {n}
      </text>
    </g>
  );
}

export default function HallenSchnitt({ className }) {
  // Dach: Pultdach-ähnlich flach geneigt von (160,170) bis (1040,130)
  const dachY = (x) => 170 - ((x - 160) / 880) * 40;
  const reihen = [];
  for (let x = 250; x <= 930; x += 62) {
    if (x > 560 && x < 640) continue; // Brandschutzstreifen / Lichtband
    reihen.push(x);
  }
  return (
    <figure className={cn("overflow-hidden rounded-[2rem] bg-white ring-1 ring-ink-200/70", className)}>
      <div className="bg-gradient-to-b from-navy-50 to-white px-2 pt-4 sm:px-4">
        <svg viewBox="0 0 1200 440" className="block h-auto w-full" role="img" aria-labelledby="halle-titel halle-text">
          <title id="halle-titel">Schnitt durch eine Gewerbehalle mit Photovoltaik auf dem Dach</title>
          <desc id="halle-text">
            Flach geneigtes Hallendach mit Modulreihen, freiem Brandschutzstreifen in der Mitte, Dachzugang mit Geländer, Wechselrichter an der Fassade, Übergabestation und Kabel zum Stromnetz sowie Maschinen im Gebäude als Stromverbraucher.
          </desc>

          {/* Sonne */}
          <circle cx="110" cy="80" r="34" className="fill-sun-300" />
          <circle cx="110" cy="80" r="52" className="fill-sun-300" opacity="0.25" />

          {/* Boden */}
          <rect x="0" y="360" width="1200" height="80" className="fill-ink-100" />
          <rect x="0" y="356" width="1200" height="8" rx="4" className="fill-ink-300" />

          {/* Halle */}
          <polygon points="160,360 160,170 1040,130 1040,360" className="fill-sand-100" />
          <polygon points="160,360 160,170 1040,130 1040,360" fill="none" className="stroke-ink-400" strokeWidth="3" />
          {/* Dachhaut */}
          <line x1="150" y1="172" x2="1050" y2="129" className="stroke-navy-800" strokeWidth="8" strokeLinecap="round" />
          {/* Binder / Stützen */}
          {[380, 600, 820].map((x) => (
            <g key={x}>
              <rect x={x - 4} y={dachY(x)} width="8" height={360 - dachY(x)} className="fill-ink-300" />
              <line x1={x - 110} y1={dachY(x - 110) + 10} x2={x} y2={dachY(x) + 40} className="stroke-ink-300" strokeWidth="3" />
              <line x1={x + 110} y1={dachY(x + 110) + 10} x2={x} y2={dachY(x) + 40} className="stroke-ink-300" strokeWidth="3" />
            </g>
          ))}

          {/* Module */}
          {reihen.map((x) => {
            const y = dachY(x) - 6;
            const y2 = dachY(x + 54) - 6;
            return (
              <g key={x}>
                <polygon points={`${x},${y} ${x + 54},${y2} ${x + 54},${y2 - 7} ${x},${y - 7}`} className="fill-navy-500" />
                <line x1={x + 27} y1={(y + y2) / 2 - 7} x2={x + 27} y2={(y + y2) / 2} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
              </g>
            );
          })}
          {/* Brandschutzstreifen */}
          <g>
            <rect x="572" y={dachY(572) - 26} width="56" height="16" rx="3" className="fill-sun-300" opacity="0.55" />
          </g>

          {/* Dachzugang mit Geländer */}
          <g>
            <line x1="1070" y1="360" x2="1070" y2="140" className="stroke-ink-600" strokeWidth="4" />
            <line x1="1094" y1="360" x2="1094" y2="140" className="stroke-ink-600" strokeWidth="4" />
            {[340, 310, 280, 250, 220, 190, 160].map((y) => (
              <line key={y} x1="1070" x2="1094" y1={y} y2={y} className="stroke-ink-600" strokeWidth="3" />
            ))}
            <line x1="960" y1={dachY(960) - 34} x2="1040" y2={dachY(1040) - 34} className="stroke-ov-600" strokeWidth="3" />
            {[960, 1000, 1040].map((x) => (
              <line key={x} x1={x} x2={x} y1={dachY(x) - 34} y2={dachY(x) - 4} className="stroke-ov-600" strokeWidth="3" />
            ))}
          </g>

          {/* Wechselrichter an der Fassade */}
          <rect x="176" y="236" width="44" height="56" rx="6" className="fill-navy-700" />
          <path d="M198 248 l-8 14 h7 l-4 12 l12 -16 h-7 l4 -10 z" className="fill-sun-400" />
          <path d="M 250 170 V 200 H 198 V 236" fill="none" strokeDasharray="7 5" strokeWidth="3" className="stroke-ov-600" />

          {/* Maschinen im Gebäude */}
          <g>
            <rect x="420" y="296" width="120" height="64" rx="6" className="fill-ink-400" />
            <rect x="436" y="310" width="36" height="22" rx="3" className="fill-white" opacity="0.7" />
            <rect x="660" y="306" width="90" height="54" rx="6" className="fill-ink-400" />
            <circle cx="705" cy="333" r="14" className="fill-white" opacity="0.7" />
          </g>

          {/* Station + Netz */}
          <g>
            <rect x="40" y="300" width="90" height="60" rx="6" className="fill-navy-700" />
            <rect x="40" y="292" width="90" height="12" rx="4" className="fill-navy-900" />
            <path d="M88 312 l-10 18 h9 l-5 16 l16 -22 h-9 l5 -12 z" className="fill-sun-400" />
          </g>
          <path d="M 198 292 V 395 H 85 V 362" fill="none" strokeDasharray="8 6" strokeWidth="3" className="stroke-ov-600" />
          <path d="M 85 395 V 420 H 0" fill="none" strokeWidth="5" className="stroke-navy-700" />

          {/* Nummern */}
          <Marke x={420} y={100} n={1} />
          <Marke x={380} y={240} n={2} />
          <Marke x={840} y={200} n={3} />
          <Marke x={600} y={100} n={4} />
          <Marke x={1082} y={110} n={5} />
          <Marke x={240} y={264} n={6} />
          <Marke x={85} y={266} n={7} />
          <Marke x={600} y={268} n={8} />
        </svg>
      </div>
      <figcaption className="border-t border-ink-100 p-5 md:p-7">
        <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {LEGENDE.map((l, i) => (
            <li key={l.t} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-950 font-display text-[13px] font-extrabold text-white">{i + 1}</span>
              <span className="text-[14.5px] leading-snug text-ink-600">
                <strong className="block text-ink-900">{l.t}</strong>
                {l.x}
              </span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}

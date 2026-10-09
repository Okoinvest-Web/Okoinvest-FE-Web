import { cn } from "@/components/ui/cn";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

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

/** Sprachmodell: Texte der Grafik (en nur Texte, je Index wie LEGENDE). */
const TEXTE = {
  de: {
    legende: LEGENDE,
    titel: "Schnitt durch eine Gewerbehalle mit Photovoltaik auf dem Dach",
    beschreibung: "Flach geneigtes Hallendach mit Modulreihen, freiem Brandschutzstreifen in der Mitte, Dachzugang mit Geländer, Wechselrichter an der Fassade, Übergabestation und Kabel zum Stromnetz sowie Maschinen im Gebäude als Stromverbraucher.",
  },
  en: {
    legende: [
      { t: "Modules on the roof", x: "Pitched roofs covered in parallel, flat roofs with low east/west mounting – ballasted or bonded, without penetrating the roof membrane wherever possible." },
      { t: "Structure & load reserve", x: "A structural engineer checks the additional load (usually approx. 12–25 kg/m²) including snow and wind. No reserve, no installation." },
      { t: "Roof membrane & remaining service life", x: "The roof must last for the contract term – as a rule of thumb at least 25 years. Otherwise, renovate first." },
      { t: "Fire protection distances", x: "Clear strips at fire walls, roof lights and smoke vents; cables routed properly. The fire brigade and insurers are involved early." },
      { t: "Roof access & safety", x: "Permanent access, fall protection and walkways for maintenance – set out in the contract, including notification and liability." },
      { t: "Inverters", x: "On the façade or in the plant room, well ventilated and accessible for service." },
      { t: "Grid connection", x: "Via the existing building connection or a dedicated transfer station – often medium voltage for larger installations." },
      { t: "Power consumption in the building", x: "If the rooftop power is used directly in the building, it replaces expensive grid power – the basis for a rooftop PPA and self-consumption." },
    ],
    titel: "Cross-section of a commercial hall with photovoltaics on the roof",
    beschreibung: "Gently sloping hall roof with module rows, a clear fire protection strip in the middle, roof access with railing, inverters on the façade, a transfer station and cable to the power grid, and machines inside the building as power consumers.",
  },
};

function Marke({ x, y, n }) {
  return (
    <g className={aufbau.pop} style={{ "--i": n - 1 }}>
      <circle cx={x} cy={y} r="17" className="fill-navy-950" />
      <circle cx={x} cy={y} r="17" fill="none" stroke="#fff" strokeWidth="2.5" />
      <text x={x} y={y + 6} textAnchor="middle" className="fill-white font-display text-[17px] font-extrabold">
        {n}
      </text>
    </g>
  );
}

export default function HallenSchnitt({ className }) {
  const w = uebersetze(TEXTE, spracheDerAnfrage());
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
        <Aufbau schritt={70} style={{ "--pop-start": "1250ms", "--pop-schritt": "80ms" }}>
        <svg viewBox="0 0 1200 440" className="block h-auto w-full" role="img" aria-labelledby="halle-titel halle-text">
          <title id="halle-titel">{w.titel}</title>
          <desc id="halle-text">{w.beschreibung}</desc>

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
          {reihen.map((x, i) => {
            const y = dachY(x) - 6;
            const y2 = dachY(x + 54) - 6;
            return (
              <g key={x} className={aufbau.fallen} style={{ "--i": i + 2 }}>
                <polygon points={`${x},${y} ${x + 54},${y2} ${x + 54},${y2 - 7} ${x},${y - 7}`} className="fill-navy-500" />
                <line x1={x + 27} y1={(y + y2) / 2 - 7} x2={x + 27} y2={(y + y2) / 2} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
              </g>
            );
          })}
          {/* Brandschutzstreifen */}
          <g className={aufbau.ein} style={{ "--ein-start": "900ms" }}>
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
          <g className={aufbau.heben} style={{ "--i": 14 }}>
            <rect x="176" y="236" width="44" height="56" rx="6" className="fill-navy-700" />
            <path d="M198 248 l-8 14 h7 l-4 12 l12 -16 h-7 l4 -10 z" className="fill-sun-400" />
          </g>
          <path d="M 250 170 V 200 H 198 V 236" fill="none" strokeDasharray="7 5" strokeWidth="3" className={cn("stroke-ov-600", aufbau.ein)} style={{ "--ein-start": "1000ms" }} />

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
          <path d="M 198 292 V 395 H 85 V 362" fill="none" strokeDasharray="8 6" strokeWidth="3" className={cn("stroke-ov-600", aufbau.ein)} style={{ "--ein-start": "1100ms" }} />
          <path d="M 85 395 V 420 H 0" pathLength="1" fill="none" strokeWidth="5" className={cn("stroke-navy-700", aufbau.zeichnen)} style={{ "--zeichnen-start": "1200ms", "--zeichnen-dauer": "600ms" }} />

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
        </Aufbau>
      </div>
      <figcaption className="border-t border-ink-100 p-5 md:p-7">
        <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {w.legende.map((l, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-950 font-display text-[13px] font-extrabold text-white">{i + 1}</span>
              <span className="text-[14px] leading-relaxed text-ink-600">
                <strong className="mb-0.5 block font-display text-[15px] leading-snug text-ink-900">{l.t}</strong>
                {l.x}
              </span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}

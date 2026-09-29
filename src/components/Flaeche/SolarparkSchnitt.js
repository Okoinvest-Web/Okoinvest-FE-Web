import { cn } from "@/components/ui/cn";

/**
 * Schnitt durch einen naturverträglichen Solarpark (Inline-SVG, Server-Komponente).
 * Nummern im Bild verweisen auf die Legende darunter – so bleibt die Grafik auch
 * auf dem Handy lesbar, ohne winzige Beschriftungen.
 */

const LEGENDE = [
  { t: "Modultische", x: "Süd, ca. 15–25° geneigt, Unterkante ca. 0,8–1 m über Boden – darunter wächst weiter Gras." },
  { t: "Rammpfosten", x: "Stahlprofile ohne Beton, ca. 1,5–2,5 m tief gerammt, beim Rückbau vollständig ziehbar." },
  { t: "Reihenabstand", x: "Freier Streifen von einigen Metern, abgestimmt auf Verschattung, Pflege und Biodiversität." },
  { t: "Extensives Grünland", x: "Blühmischung, kein Dünger, keine Pflanzenschutzmittel – Boden erholt sich über 30 Jahre." },
  { t: "Beweidung oder Mahd", x: "Schafe halten den Aufwuchs kurz; alternativ späte, abschnittsweise Mahd." },
  { t: "Zaun mit Bodenabstand", x: "Ca. 15–20 cm Lücke, damit Igel, Hasen und Amphibien durchkommen." },
  { t: "Hecke & Randstreifen", x: "Sichtschutz, Lebensraum und Ausgleichsfläche in einem." },
  { t: "Wechselrichter & Station", x: "Trafo- bzw. Übergabestation bündelt den Strom auf Mittelspannung." },
  { t: "Erdkabel zum Netz", x: "Mittelspannungskabel zum Netzverknüpfungspunkt – je kürzer, desto besser." },
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

function Tisch({ x }) {
  // Boden y=360, 1 m ≈ 40 px. Unterkante 0,9 m, Oberkante ~2,9 m, Tiefe ~110 px
  return (
    <g>
      <rect x={x + 16} y={322} width="5" height="38" rx="1" className="fill-ink-500" />
      <rect x={x + 86} y={274} width="5" height="86" rx="1" className="fill-ink-500" />
      {/* gerammter Teil unter der Erde */}
      <line x1={x + 18.5} x2={x + 18.5} y1={362} y2={420} strokeDasharray="4 4" strokeWidth="3" className="stroke-ink-400" />
      <line x1={x + 88.5} x2={x + 88.5} y1={362} y2={420} strokeDasharray="4 4" strokeWidth="3" className="stroke-ink-400" />
      <polygon points={`${x},${328} ${x + 112},${252} ${x + 116},${258} ${x + 4},${334}`} className="fill-navy-800" />
      <polygon points={`${x + 2},${326} ${x + 110},${252} ${x + 113},${256} ${x + 5},${330}`} className="fill-navy-500" />
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={x + 2 + 108 * f} y1={326 - 74 * f} x2={x + 5 + 108 * f} y2={330 - 74 * f} stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
      ))}
    </g>
  );
}

function Blume({ x, y, farbe = "fill-sun-400" }) {
  return (
    <g>
      <line x1={x} x2={x} y1={y} y2={y + 14} strokeWidth="1.5" className="stroke-ov-600" />
      <circle cx={x} cy={y} r="4" className={farbe} />
    </g>
  );
}

function Schaf({ x, y }) {
  return (
    <g>
      <rect x={x + 6} y={y + 16} width="3" height="12" className="fill-ink-800" />
      <rect x={x + 26} y={y + 16} width="3" height="12" className="fill-ink-800" />
      <ellipse cx={x + 18} cy={y + 12} rx="20" ry="12" fill="#fff" className="stroke-ink-300" strokeWidth="1.5" />
      <ellipse cx={x - 2} cy={y + 8} rx="7" ry="6" className="fill-ink-800" />
    </g>
  );
}

export default function SolarparkSchnitt({ className }) {
  const tische = [300, 440, 580, 720, 860];
  return (
    <figure className={cn("overflow-hidden rounded-[2rem] bg-white ring-1 ring-ink-200/70", className)}>
      <div className="bg-gradient-to-b from-navy-50 to-white px-2 pt-4 sm:px-4">
        <svg viewBox="0 0 1200 440" className="block h-auto w-full" role="img" aria-labelledby="schnitt-titel schnitt-text">
          <title id="schnitt-titel">Schnitt durch einen Solarpark</title>
          <desc id="schnitt-text">
            Modulreihen auf gerammten Stahlpfosten über extensivem Grünland mit Blühpflanzen und Schafen, eingezäunt mit Bodenabstand für Kleintiere, Hecke am Rand, Übergabestation und Erdkabel zum Stromnetz.
          </desc>

          {/* Sonne */}
          <circle cx="110" cy="80" r="34" className="fill-sun-300" />
          <circle cx="110" cy="80" r="52" className="fill-sun-300" opacity="0.25" />

          {/* Boden */}
          <rect x="0" y="360" width="1200" height="80" className="fill-ink-100" />
          <rect x="0" y="356" width="1200" height="8" rx="4" className="fill-ov-300" />
          <line x1="0" x2="1200" y1="400" y2="400" strokeDasharray="2 10" className="stroke-ink-300" strokeWidth="2" />

          {/* Hecke */}
          {[70, 105, 140].map((x, i) => (
            <g key={x}>
              <rect x={x - 3} y={330} width="6" height="30" className="fill-ink-500" />
              <circle cx={x} cy={318 - (i % 2) * 10} r={30 - (i % 2) * 4} className={i % 2 ? "fill-ov-500" : "fill-ov-600"} />
            </g>
          ))}

          {/* Zaun mit Bodenabstand */}
          <g>
            {[200, 240].map((x) => (
              <rect key={x} x={x} y={286} width="4" height="74" className="fill-ink-600" />
            ))}
            {[292, 306, 320, 334].map((y) => (
              <line key={y} x1="196" x2="248" y1={y} y2={y} className="stroke-ink-400" strokeWidth="1.5" />
            ))}
            {[210, 222, 234].map((x) => (
              <line key={x} x1={x} x2={x} y1="288" y2="342" className="stroke-ink-400" strokeWidth="1.5" />
            ))}
            {/* Lücke am Boden */}
            <line x1="196" x2="248" y1="342" y2="342" className="stroke-ink-600" strokeWidth="2" />
          </g>

          {/* Blühstreifen */}
          {[270, 395, 410, 540, 548, 690, 830, 845, 985].map((x, i) => (
            <Blume key={x} x={x} y={338 + (i % 3) * 3} farbe={i % 2 ? "fill-sun-400" : "fill-ov-300"} />
          ))}

          {/* Modultische */}
          {tische.map((x) => (
            <Tisch key={x} x={x} />
          ))}

          {/* Reihenabstand */}
          <g>
            <line x1="556" x2="720" y1="236" y2="236" className="stroke-navy-700" strokeWidth="1.5" />
            <line x1="556" x2="556" y1="228" y2="244" className="stroke-navy-700" strokeWidth="1.5" />
            <line x1="720" x2="720" y1="228" y2="244" className="stroke-navy-700" strokeWidth="1.5" />
          </g>

          <Schaf x={655} y={328} />

          {/* Station */}
          <g>
            <rect x="1010" y="296" width="110" height="64" rx="6" className="fill-navy-700" />
            <rect x="1010" y="288" width="110" height="12" rx="4" className="fill-navy-900" />
            <path d="M1068 308 l-12 20 h10 l-6 18 l18 -24 h-10 l6 -14 z" className="fill-sun-400" />
          </g>

          {/* Kabel */}
          <path d="M 300 395 H 1065 V 362" fill="none" strokeDasharray="8 6" strokeWidth="3" className="stroke-ov-600" />
          <path d="M 1065 395 V 420 H 1200" fill="none" strokeWidth="5" className="stroke-navy-700" />
          <path d="M 1180 412 l 12 8 l -12 8" fill="none" strokeWidth="3" className="stroke-navy-700" />

          {/* Nummern */}
          <Marke x={370} y={228} n={1} />
          <Marke x={470} y={408} n={2} />
          <Marke x={638} y={206} n={3} />
          <Marke x={800} y={360} n={4} />
          <Marke x={676} y={300} n={5} />
          <Marke x={222} y={262} n={6} />
          <Marke x={105} y={262} n={7} />
          <Marke x={1065} y={262} n={8} />
          <Marke x={1140} y={390} n={9} />
        </svg>
      </div>
      <figcaption className="border-t border-ink-100 p-5 md:p-7">
        <ol className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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

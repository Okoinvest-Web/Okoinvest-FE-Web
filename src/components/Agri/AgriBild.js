/**
 * Flache Inline-SVG-Illustrationen der Agri-PV-Systeme (Server-Komponente).
 * typ: hoch | vertikal | tracker | bodennah
 * Maßstab grob: 1 m ≈ 22 px, Boden bei y = 170.
 */

const BODEN = 170;

function Boden() {
  return (
    <g>
      <rect x="-200" y={BODEN} width="720" height="30" className="fill-sand-100" />
      <g className="stroke-sand-200" strokeWidth="1.2">
        <line x1="-200" x2="520" y1={BODEN + 10} y2={BODEN + 10} />
        <line x1="-200" x2="520" y1={BODEN + 19} y2={BODEN + 19} />
      </g>
      <rect x="-200" y={BODEN - 3} width="720" height="6" rx="3" className="fill-ov-300" />
    </g>
  );
}

function Traktor({ x, s = 1 }) {
  return (
    <g transform={`translate(${x} ${BODEN}) scale(${s})`}>
      <rect x="0" y="-26" width="34" height="14" rx="3" className="fill-ov-600" />
      <rect x="18" y="-44" width="16" height="20" rx="2" className="fill-ov-700" />
      <rect x="21" y="-41" width="10" height="9" rx="1" className="fill-navy-100" />
      <circle cx="28" cy="-10" r="10" className="fill-ink-800" />
      <circle cx="28" cy="-10" r="4" className="fill-ink-300" />
      <circle cx="6" cy="-7" r="7" className="fill-ink-800" />
      <circle cx="6" cy="-7" r="2.5" className="fill-ink-300" />
    </g>
  );
}

function Getreide({ x, n = 6, abstand = 7 }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <line x1={x + i * abstand} x2={x + i * abstand} y1={BODEN - 2} y2={BODEN - 18} strokeWidth="1.5" className="stroke-ov-600" />
          <ellipse cx={x + i * abstand} cy={BODEN - 20} rx="2" ry="4" className="fill-sun-400" />
        </g>
      ))}
    </g>
  );
}

function Strauch({ x, r = 11 }) {
  return (
    <g>
      <rect x={x - 1.5} y={BODEN - 14} width="3" height="14" className="fill-ink-500" />
      <circle cx={x} cy={BODEN - 20} r={r} className="fill-ov-500" />
      <circle cx={x - 4} cy={BODEN - 22} r="2.2" className="fill-sun-500" />
      <circle cx={x + 5} cy={BODEN - 17} r="2.2" className="fill-sun-500" />
    </g>
  );
}

function Schaf({ x }) {
  return (
    <g>
      <rect x={x + 4} y={BODEN - 10} width="2.5" height="9" className="fill-ink-800" />
      <rect x={x + 18} y={BODEN - 10} width="2.5" height="9" className="fill-ink-800" />
      <ellipse cx={x + 12} cy={BODEN - 14} rx="13" ry="8" fill="#fff" strokeWidth="1.2" className="stroke-ink-300" />
      <ellipse cx={x - 1} cy={BODEN - 17} rx="5" ry="4" className="fill-ink-800" />
    </g>
  );
}

function Modul({ x1, y1, x2, y2, dick = 4 }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={dick} strokeLinecap="round" className="stroke-navy-700" />;
}

/** fuellen: true → Bild füllt einen höheren Rahmen (unten bündig, seitlich beschnitten) */
export default function AgriBild({ typ = "vertikal", className, titel, fuellen = false }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label={titel || BESCHREIBUNG[typ]} preserveAspectRatio={fuellen ? "xMidYMax slice" : undefined}>
      {/* Himmel: über den Rand hinaus, damit er beim Füllen nicht abreißt */}
      <rect x="-200" y="-400" width="720" height={BODEN + 400} className="fill-navy-50" />
      <circle cx="286" cy="30" r="46" className="fill-sun-100" opacity="0.55" />
      <circle cx="286" cy="30" r="26" className="fill-sun-200" opacity="0.6" />
      <circle cx="286" cy="30" r="14" className="fill-sun-300" />
      <g className="fill-white" opacity="0.9">
        <ellipse cx="72" cy="34" rx="22" ry="7" />
        <ellipse cx="86" cy="29" rx="13" ry="8" />
        <ellipse cx="190" cy="18" rx="16" ry="5" />
      </g>
      <path d={`M-200 ${BODEN - 18} C 20 ${BODEN - 34}, 90 ${BODEN - 26}, 160 ${BODEN - 20} S 280 ${BODEN - 34}, 520 ${BODEN - 22} L520 ${BODEN} L-200 ${BODEN} Z`} className="fill-ov-100" />
      {typ === "hoch" && <Hoch />}
      {typ === "vertikal" && <Vertikal />}
      {typ === "tracker" && <Tracker />}
      {typ === "bodennah" && <Bodennah />}
      <Boden />
    </svg>
  );
}

const BESCHREIBUNG = {
  hoch: "Hoch aufgeständerte Agri-PV: Modulreihen auf rund fünf Meter hohen Stützen über Obststräuchern, darunter fährt ein Traktor.",
  vertikal: "Vertikale bifaziale Agri-PV: senkrechte Modulzäune mit breiten Bewirtschaftungsgassen, in denen Getreide wächst und ein Traktor fährt.",
  tracker: "Nachgeführte Agri-PV: Module auf Drehachsen folgen der Sonne, zwischen den Reihen wird Ackerbau betrieben.",
  bodennah: "Bodennahe Agri-PV mit Beweidung: schräg aufgeständerte Module mit großem Reihenabstand, darunter und dazwischen weiden Schafe.",
};

function Hoch() {
  const stuetzen = [30, 130, 230];
  return (
    <g>
      {stuetzen.map((x) => (
        <rect key={x} x={x} y={62} width="5" height={BODEN - 62} className="fill-ink-500" />
      ))}
      <rect x="22" y="58" width="226" height="4" className="fill-ink-600" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Modul key={i} x1={28 + i * 31} y1={60} x2={46 + i * 31} y2={50} dick={5} />
      ))}
      {[62, 100, 165, 203].map((x) => (
        <Strauch key={x} x={x} />
      ))}
      <Traktor x={250} s={0.95} />
      {/* Höhenmaß */}
      <line x1="12" x2="12" y1="60" y2={BODEN} strokeDasharray="3 3" className="stroke-navy-400" />
      <text x="40" y="118" className="fill-navy-700 text-[10px] font-semibold">≥ 2,1 m</text>
    </g>
  );
}

function Vertikal() {
  const reihen = [40, 150, 260];
  return (
    <g>
      {reihen.map((x) => (
        <g key={x}>
          <rect x={x - 2} y={BODEN - 64} width="4" height="64" className="fill-ink-500" />
          <rect x={x - 4} y={BODEN - 60} width="8" height="42" rx="1.5" className="fill-navy-700" />
          <line x1={x} x2={x} y1={BODEN - 60} y2={BODEN - 18} stroke="#fff" strokeOpacity="0.4" />
        </g>
      ))}
      <Getreide x={58} n={11} abstand={7.5} />
      <Traktor x={180} s={0.9} />
      <Getreide x={228} n={3} abstand={7.5} />
      <line x1="44" x2="146" y1="186" y2="186" className="stroke-navy-700" strokeWidth="1.2" />
      <text x="95" y="197" textAnchor="middle" className="fill-navy-700 text-[9px] font-semibold">Gasse ca. 8–12 m</text>
    </g>
  );
}

function Tracker() {
  const achsen = [50, 160, 270];
  return (
    <g>
      {achsen.map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y={BODEN - 52} width="4" height="52" className="fill-ink-500" />
          <g transform={`rotate(${-28 + i * 0} ${x} ${BODEN - 54})`}>
            <rect x={x - 26} y={BODEN - 57} width="52" height="6" rx="1.5" className="fill-navy-700" />
          </g>
          <circle cx={x} cy={BODEN - 54} r="3" className="fill-ink-700" />
        </g>
      ))}
      <path d="M 140 88 A 24 24 0 0 1 182 88" fill="none" strokeWidth="1.6" strokeDasharray="3 3" className="stroke-sun-500" />
      <path d="M 182 88 l -6 -1 l 3 -5 z" className="fill-sun-500" />
      <Getreide x={80} n={9} abstand={6.5} />
      <Getreide x={190} n={9} abstand={6.5} />
    </g>
  );
}

function Bodennah() {
  const tische = [30, 140, 250];
  return (
    <g>
      {tische.map((x) => (
        <g key={x}>
          <rect x={x + 6} y={BODEN - 32} width="3.5" height="32" className="fill-ink-500" />
          <rect x={x + 44} y={BODEN - 58} width="3.5" height="58" className="fill-ink-500" />
          <Modul x1={x} y1={BODEN - 30} x2={x + 56} y2={BODEN - 62} dick={5} />
        </g>
      ))}
      <Schaf x={98} />
      <Schaf x={200} />
      <Schaf x={52} />
    </g>
  );
}

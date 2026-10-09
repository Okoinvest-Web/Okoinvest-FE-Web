// Agri-PV-Panorama für Heros (Server-Komponente, reines SVG)
// Perspektivische Morgenszene: links vertikale, bifaziale Modulzäune mit Gassen (Kategorie II),
// rechts vorn ein hoch aufgeständertes Moduldach über Beerensträuchern (Kategorie I).
// Schematisch – keine maßstäbliche Darstellung.

import { spracheDerAnfrage } from "@/lib/land/seite";

const VP = { x: 290, y: 196 }; // Fluchtpunkt auf dem Horizont
const UNTEN = 440;

/** Punkt auf einer Bodenlinie (Startpunkt bx am unteren Rand) in Tiefe d (1 = vorn) */
function boden(bx, d) {
  return { x: VP.x + (bx - VP.x) / d, y: VP.y + (UNTEN - VP.y) / d };
}

const r = (n) => Math.round(n * 10) / 10;

/** Ein Modulzaun aus senkrechten Paneelen entlang der Linie bx */
function Zaun({ bx, start = 1, n = 16, hoehe = 92 }) {
  const paneele = [];
  for (let i = 0; i < n; i++) {
    const d1 = start + i * 0.62;
    const d2 = d1 + 0.5;
    const a = boden(bx, d1);
    const b = boden(bx, d2);
    const ha = hoehe / d1;
    const hb = hoehe / d2;
    const sockelA = 14 / d1;
    const sockelB = 14 / d2;
    paneele.push(
      <g key={i}>
        {/* Pfosten */}
        <line x1={r(a.x)} y1={r(a.y)} x2={r(a.x)} y2={r(a.y - ha)} strokeWidth={r(Math.max(0.6, 3 / d1))} stroke="var(--color-ink-400)" />
        {/* Paneel */}
        <path
          d={`M${r(a.x)} ${r(a.y - sockelA)} L${r(b.x)} ${r(b.y - sockelB)} L${r(b.x)} ${r(b.y - hb)} L${r(a.x)} ${r(a.y - ha)} Z`}
          fill="url(#ap-modul)"
          stroke="var(--color-navy-300)"
          strokeOpacity="0.35"
          strokeWidth={r(Math.max(0.3, 0.9 / d1))}
        />
        {/* Zellteilung */}
        <path
          d={`M${r(a.x)} ${r(a.y - (sockelA + ha) / 2)} L${r(b.x)} ${r(b.y - (sockelB + hb) / 2)}`}
          stroke="#fff"
          strokeOpacity="0.16"
          strokeWidth={r(Math.max(0.3, 0.8 / d1))}
        />
      </g>
    );
  }
  // Schatten-/Grasstreifen am Fuß des Zauns
  const f1 = boden(bx, start);
  return (
    <g>
      <path d={`M${r(f1.x - 10)} ${UNTEN} L${VP.x} ${VP.y} L${r(f1.x + 10)} ${UNTEN} Z`} fill="var(--color-ov-900)" opacity="0.55" />
      {paneele}
    </g>
  );
}

/** Getreidereihen als perspektivische Linien in einer Gasse */
function Saat({ von, bis, n = 7 }) {
  const linien = [];
  for (let i = 0; i < n; i++) {
    const bx = von + ((bis - von) * (i + 0.5)) / n;
    linien.push(<line key={i} x1={r(bx)} y1={UNTEN} x2={VP.x} y2={VP.y} stroke="var(--color-sun-300)" strokeOpacity="0.42" strokeWidth="1.4" strokeDasharray="2 5" />);
  }
  return <g>{linien}</g>;
}

/** Kleiner Traktor in Tiefe d auf Linie bx */
function Traktor({ bx, d }) {
  const p = boden(bx, d);
  const s = 1.15 / d;
  return (
    <g transform={`translate(${r(p.x)} ${r(p.y)}) scale(${r(s * 100) / 100})`}>
      <ellipse cx="0" cy="0" rx="34" ry="5" fill="#000" opacity="0.25" />
      <rect x="-26" y="-30" width="40" height="16" rx="3" fill="var(--color-ov-500)" />
      <rect x="-4" y="-52" width="20" height="24" rx="3" fill="var(--color-ov-600)" />
      <rect x="0" y="-48" width="12" height="11" rx="1.5" fill="var(--color-navy-100)" opacity="0.85" />
      <circle cx="8" cy="-11" r="12" fill="var(--color-ink-900)" />
      <circle cx="8" cy="-11" r="4.5" fill="var(--color-ink-300)" />
      <circle cx="-19" cy="-8" r="8" fill="var(--color-ink-900)" />
      <circle cx="-19" cy="-8" r="3" fill="var(--color-ink-300)" />
    </g>
  );
}

/** Hoch aufgeständertes Moduldach (vorn rechts) */
function Moduldach() {
  const links = 356;
  const rechts = 612;
  const hoehe = 186; // Bildschirmhöhe der vorderen Stützen
  const tiefe = 2.2; // Tiefe der hinteren Stützen
  const vl = { x: links, y: UNTEN - 14 };
  const vr = { x: rechts, y: UNTEN - 14 };
  const hl = boden(links, tiefe);
  const hr = boden(rechts, tiefe);
  const dachV = vl.y - hoehe;
  const dachH = hl.y - hoehe / tiefe;
  // Moduldach: Viereck über den vier Stützen
  const dach = `M${vl.x - 14} ${dachV} L${vr.x + 14} ${dachV} L${r(hr.x + 7)} ${r(dachH)} L${r(hl.x - 7)} ${r(dachH)} Z`;
  // Modulreihen quer
  const reihen = [];
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const yL = dachV + (dachH - dachV) * t;
    const xL = vl.x - 14 + (hl.x - 7 - (vl.x - 14)) * t;
    const xR = vr.x + 14 + (hr.x + 7 - (vr.x + 14)) * t;
    reihen.push(<line key={`q${i}`} x1={r(xL)} y1={r(yL)} x2={r(xR)} y2={r(yL)} stroke="#fff" strokeOpacity="0.22" strokeWidth="1" />);
  }
  const spalten = [];
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const xV = vl.x - 14 + (vr.x - vl.x + 28) * t;
    const xH = hl.x - 7 + (hr.x - hl.x + 14) * t;
    spalten.push(<line key={`s${i}`} x1={r(xV)} y1={dachV} x2={r(xH)} y2={r(dachH)} stroke="#fff" strokeOpacity="0.14" strokeWidth="1" />);
  }
  // Beerensträucher unter dem Dach
  const straeucher = [];
  [1.15, 1.45, 1.8].forEach((d, zi) => {
    [400, 460, 520, 580].forEach((bx, si) => {
      const p = boden(bx, d);
      const rr = 15 / d;
      straeucher.push(
        <g key={`${zi}-${si}`}>
          <ellipse cx={r(p.x)} cy={r(p.y)} rx={r(rr * 1.1)} ry={r(rr * 0.25)} fill="#000" opacity="0.22" />
          <circle cx={r(p.x)} cy={r(p.y - rr * 0.9)} r={r(rr)} fill="var(--color-ov-600)" />
          <circle cx={r(p.x - rr * 0.35)} cy={r(p.y - rr * 1.2)} r={r(rr * 0.55)} fill="var(--color-ov-500)" />
          <circle cx={r(p.x - rr * 0.3)} cy={r(p.y - rr * 0.7)} r={r(Math.max(0.8, rr * 0.16))} fill="var(--color-danger-500)" />
          <circle cx={r(p.x + rr * 0.4)} cy={r(p.y - rr * 1.05)} r={r(Math.max(0.8, rr * 0.16))} fill="var(--color-danger-500)" />
          <circle cx={r(p.x + rr * 0.1)} cy={r(p.y - rr * 0.45)} r={r(Math.max(0.8, rr * 0.14))} fill="var(--color-sun-400)" />
        </g>
      );
    });
  });

  return (
    <g>
      {/* Schatten des Daches am Boden */}
      <path d={`M${vl.x - 30} ${UNTEN} L${vr.x + 30} ${UNTEN} L${r(hr.x + 10)} ${r(hr.y)} L${r(hl.x - 10)} ${r(hl.y)} Z`} fill="var(--color-navy-950)" opacity="0.3" />
      {/* hintere Stützen */}
      {[hl, hr].map((p, i) => (
        <rect key={i} x={r(p.x - 2)} y={r(dachH)} width="4" height={r(p.y - dachH)} fill="var(--color-ink-500)" />
      ))}
      {straeucher}
      {/* Dachfläche */}
      <path d={dach} fill="url(#ap-dach)" stroke="var(--color-navy-200)" strokeOpacity="0.5" strokeWidth="1.2" />
      {reihen}
      {spalten}
      {/* Lichtkante */}
      <line x1={vl.x - 14} y1={dachV} x2={vr.x + 14} y2={dachV} stroke="var(--color-sun-200)" strokeOpacity="0.7" strokeWidth="1.6" />
      {/* Traufe/Träger */}
      <rect x={vl.x - 14} y={dachV} width={vr.x - vl.x + 28} height="6" fill="var(--color-ink-600)" />
      {/* vordere Stützen */}
      {[vl, vr].map((p, i) => (
        <rect key={i} x={p.x - 4} y={dachV + 6} width="8" height={p.y - dachV - 6 + 14} fill="var(--color-ink-400)" />
      ))}
      {/* Höhenmaß */}
      <g>
        <line x1={vl.x + 22} x2={vl.x + 22} y1={dachV + 12} y2={UNTEN - 16} stroke="var(--color-sun-300)" strokeWidth="1.4" strokeDasharray="4 4" />
        <path d={`M${vl.x + 17} ${dachV + 17} L${vl.x + 22} ${dachV + 10} L${vl.x + 27} ${dachV + 17}`} fill="none" stroke="var(--color-sun-300)" strokeWidth="1.4" />
        <path d={`M${vl.x + 17} ${UNTEN - 21} L${vl.x + 22} ${UNTEN - 14} L${vl.x + 27} ${UNTEN - 21}`} fill="none" stroke="var(--color-sun-300)" strokeWidth="1.4" />
        <rect x={vl.x + 30} y={(dachV + UNTEN) / 2 - 14} width="66" height="24" rx="12" fill="var(--color-navy-950)" fillOpacity="0.8" stroke="var(--color-sun-300)" strokeOpacity="0.5" />
        <text x={vl.x + 63} y={(dachV + UNTEN) / 2 + 2} textAnchor="middle" fill="var(--color-sun-200)" fontSize="12" fontWeight="700">≥ 2,10 m</text>
      </g>
    </g>
  );
}

const TITEL = {
  de: "Schematische Agri-PV-Landschaft: links senkrechte, beidseitig aktive Modulzäune mit Getreidegassen und einem Traktor, rechts ein hoch aufgeständertes Moduldach mit mindestens 2,10 Metern lichter Höhe über Beerensträuchern.",
  en: "Schematic agrivoltaic landscape: on the left, upright bifacial module fences with cereal lanes and a tractor; on the right, an elevated module roof with at least 2.10 metres of clearance above berry bushes.",
};

export default function AgriPanorama({ className, titel: titelProp }) {
  const titel = titelProp ?? TITEL[spracheDerAnfrage() === "en" ? "en" : "de"];
  return (
    <svg viewBox="0 0 640 440" className={className} role="img" aria-label={titel} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ap-himmel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-navy-950)" />
          <stop offset="0.55" stopColor="var(--color-navy-800)" />
          <stop offset="1" stopColor="var(--color-sun-400)" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="ap-sonne" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--color-sun-200)" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="var(--color-sun-300)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--color-sun-300)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ap-feld" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-ov-700)" />
          <stop offset="0.35" stopColor="var(--color-ov-800)" />
          <stop offset="1" stopColor="var(--color-ov-900)" />
        </linearGradient>
        <linearGradient id="ap-modul" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-navy-500)" />
          <stop offset="0.55" stopColor="var(--color-navy-800)" />
          <stop offset="1" stopColor="var(--color-navy-900)" />
        </linearGradient>
        <linearGradient id="ap-dach" x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0" stopColor="var(--color-navy-700)" />
          <stop offset="0.6" stopColor="var(--color-navy-500)" />
          <stop offset="1" stopColor="var(--color-navy-300)" />
        </linearGradient>
        <linearGradient id="ap-dunst" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-sun-200)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--color-sun-200)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Himmel und Sonne */}
      <rect width="640" height={VP.y + 4} fill="url(#ap-himmel)" />
      <circle cx="214" cy="176" r="130" fill="url(#ap-sonne)" />
      <circle cx="214" cy="176" r="22" fill="var(--color-sun-200)" />

      {/* Hügelketten */}
      <path d="M0 182 C 80 166, 150 172, 220 180 S 360 168, 430 178 S 560 164, 640 174 L640 200 L0 200 Z" fill="var(--color-navy-700)" opacity="0.85" />
      <path d="M0 192 C 90 182, 170 190, 260 190 S 420 182, 500 190 S 600 184, 640 188 L640 204 L0 204 Z" fill="var(--color-ov-900)" />

      {/* Feld */}
      <rect y={VP.y} width="640" height={UNTEN - VP.y} fill="url(#ap-feld)" />
      <rect y={VP.y} width="640" height="40" fill="url(#ap-dunst)" />

      {/* Gassen mit Saatreihen */}
      <Saat von={-300} bis={-110} n={6} />
      <Saat von={-70} bis={110} n={6} />
      <Saat von={150} bis={330} n={6} />

      {/* Modulzäune Kategorie II */}
      <Zaun bx={-90} start={1.25} n={18} />
      <Zaun bx={130} start={1.05} n={18} />
      <Zaun bx={-330} start={1.6} n={16} />

      <Traktor bx={20} d={1.85} />

      {/* Moduldach Kategorie I */}
      <Moduldach />
    </svg>
  );
}

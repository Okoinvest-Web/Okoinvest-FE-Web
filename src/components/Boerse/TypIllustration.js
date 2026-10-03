// Flache Inline-Illustration je Projekttyp (Markenfarben Grün/Navy/Sand) – statt Fotos,
// da es keine echten Projektbilder gibt und die Lage anonym bleiben muss.

const FARBEN = {
  himmel: "#eef4fb",
  boden: "#e6f1d8",
  boden2: "#cde3b1",
  modul: "#003473",
  modulHell: "#1f5aa1",
  gruen: "#669933",
  sand: "#f5f3ea",
  sonne: "#ffc53d",
};

function Reihen({ y0 = 96, reihen = 4, hoch = false }) {
  return Array.from({ length: reihen }).map((_, r) => {
    const y = y0 + r * 16;
    const versatz = r * 10;
    return (
      <g key={r}>
        {Array.from({ length: 7 }).map((__, i) => {
          const x = 18 + i * 56 - versatz;
          return (
            <g key={i}>
              {hoch && <rect x={x + 22} y={y - 2} width="2.5" height="14" fill="#394050" opacity="0.45" />}
              <polygon points={`${x},${y + 8} ${x + 46},${y + 8} ${x + 52},${y - (hoch ? 6 : 2)} ${x + 6},${y - (hoch ? 6 : 2)}`} fill={i % 2 ? FARBEN.modul : FARBEN.modulHell} />
            </g>
          );
        })}
      </g>
    );
  });
}

// Leichte Variationen (Sonnenstand, Hügel, Himmel), damit Karten desselben Typs nicht identisch wirken.
// variante 0 entspricht der ursprünglichen Darstellung.
const VARIANTEN = [
  { sonne: [318, 60], himmel: FARBEN.himmel, h1: 0, h2: 0 },
  { sonne: [164, 46], himmel: "#f1f5ec", h1: 8, h2: -4 },
  { sonne: [236, 44], himmel: "#fbf6e8", h1: -6, h2: 6 },
  { sonne: [270, 56], himmel: "#ecf2f9", h1: 4, h2: 8 },
];

/** Stabile Variante aus einer beliebigen Kennung (z. B. Projekt-ID) */
export function varianteAus(kennung) {
  const t = String(kennung || "");
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return h % VARIANTEN.length;
}

export default function TypIllustration({ typ = "freiflaeche", className, variante = 0 }) {
  const v = VARIANTEN[Math.abs(Number(variante) || 0) % VARIANTEN.length];
  return (
    <svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <rect width="400" height="170" fill={v.himmel} />
      <circle cx={v.sonne[0]} cy={v.sonne[1]} r="17" fill={FARBEN.sonne} opacity="0.9" />
      <path d={`M0 ${78 + v.h1} C 80 ${60 - v.h1}, 160 ${70 + v.h1}, 240 ${62 - v.h1} S 360 ${58 + v.h1}, 400 ${66 - v.h1} L400 170 L0 170 Z`} fill={FARBEN.boden} />
      <path d={`M0 ${100 + v.h2} C 120 ${88 - v.h2}, 260 ${96 + v.h2}, 400 ${90 - v.h2} L400 170 L0 170 Z`} fill={FARBEN.boden2} opacity="0.7" />

      {typ === "freiflaeche" && <Reihen />}

      {typ === "agri" && (
        <>
          {Array.from({ length: 5 }).map((_, r) => (
            <path key={r} d={`M0 ${104 + r * 14} Q 200 ${98 + r * 14} 400 ${104 + r * 14}`} stroke={FARBEN.gruen} strokeWidth="3" strokeDasharray="2 6" fill="none" opacity="0.8" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <g key={i}>
              <rect x={30 + i * 62} y="70" width="4" height="70" fill="#394050" opacity="0.5" />
              <rect x={24 + i * 62} y="66" width="16" height="44" rx="2" fill={FARBEN.modul} />
            </g>
          ))}
        </>
      )}

      {typ === "carport" && (
        <>
          <rect x="0" y="120" width="400" height="50" fill="#dfe3ea" />
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={i}>
              <rect x={24 + i * 94} y="92" width="4" height="40" fill="#394050" />
              <rect x={86 + i * 94} y="92" width="4" height="40" fill="#394050" />
              <polygon points={`${14 + i * 94},92 ${100 + i * 94},92 ${96 + i * 94},80 ${18 + i * 94},80`} fill={FARBEN.modul} />
              <rect x={36 + i * 94} y="118" width="40" height="14" rx="5" fill={i % 2 ? FARBEN.gruen : "#97a0b0"} />
            </g>
          ))}
        </>
      )}

      {typ === "speicher" && (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i}>
              <rect x={30 + i * 70} y="84" width="56" height="46" rx="3" fill="#ffffff" stroke="#c4cad5" />
              <rect x={36 + i * 70} y="92" width="44" height="6" rx="2" fill={FARBEN.gruen} />
              <rect x={36 + i * 70} y="104" width="44" height="3" fill="#dfe3ea" />
              <rect x={36 + i * 70} y="112" width="44" height="3" fill="#dfe3ea" />
            </g>
          ))}
          <path d="M20 70 L 60 40 L 60 70 L 100 40" stroke={FARBEN.modul} strokeWidth="2" fill="none" opacity="0.5" />
        </>
      )}

      {typ === "dach" && (
        <>
          {/* Gewerbehalle mit flach geneigtem Dach und Modulreihen */}
          <rect x="60" y="92" width="280" height="56" fill="#ffffff" stroke="#c4cad5" />
          <polygon points="50,94 350,94 330,74 70,74" fill="#dfe3ea" />
          {Array.from({ length: 3 }).map((_, r) =>
            Array.from({ length: 9 }).map((__, i) => (
              <polygon key={`${r}-${i}`} points={`${84 + i * 27 + r * 3},${90 - r * 6} ${106 + i * 27 + r * 3},${90 - r * 6} ${108 + i * 27 + r * 3},${86 - r * 6} ${86 + i * 27 + r * 3},${86 - r * 6}`} fill={i % 2 ? FARBEN.modul : FARBEN.modulHell} />
            ))
          )}
          {Array.from({ length: 4 }).map((_, i) => (
            <rect key={i} x={84 + i * 62} y="108" width="34" height="16" rx="2" fill="#eef4fb" stroke="#c4cad5" />
          ))}
          <rect x="300" y="118" width="26" height="30" fill="#97a0b0" />
        </>
      )}

      {typ === "hybrid" && (
        <>
          <Reihen reihen={3} />
          <rect x="300" y="78" width="70" height="40" rx="3" fill="#ffffff" stroke="#c4cad5" />
          <rect x="308" y="86" width="54" height="6" rx="2" fill={FARBEN.gruen} />
        </>
      )}
    </svg>
  );
}

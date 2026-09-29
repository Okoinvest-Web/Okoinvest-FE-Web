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

export default function TypIllustration({ typ = "freiflaeche", className }) {
  return (
    <svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <rect width="400" height="170" fill={FARBEN.himmel} />
      <circle cx="318" cy="60" r="17" fill={FARBEN.sonne} opacity="0.9" />
      <path d="M0 78 C 80 60, 160 70, 240 62 S 360 58, 400 66 L400 170 L0 170 Z" fill={FARBEN.boden} />
      <path d="M0 100 C 120 88, 260 96, 400 90 L400 170 L0 170 Z" fill={FARBEN.boden2} opacity="0.7" />

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

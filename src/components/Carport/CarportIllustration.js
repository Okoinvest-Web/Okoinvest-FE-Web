/**
 * Flache Markenillustration: Parkplatz mit Solarcarport-Reihe, Ladesäulen
 * und Gebäude im Hintergrund. Rein dekorativ, Server-Komponente.
 */
export default function CarportIllustration({ className }) {
  const autos = [
    { x: 118, farbe: "#1f5aa1" },
    { x: 222, farbe: "#97a0b0" },
    { x: 326, farbe: "#ffffff" },
    { x: 430, farbe: "#669933" },
    { x: 534, farbe: "#c4cad5" },
  ];
  return (
    <svg viewBox="0 0 720 480" className={className} role="img" aria-label="Illustration: Solarcarport über einer Parkplatzreihe mit Ladesäulen vor einem Firmengebäude">
      <defs>
        <linearGradient id="cp-himmel" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#eef4fb" />
          <stop offset="100%" stopColor="#fbfaf6" />
        </linearGradient>
        <linearGradient id="cp-modul" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0b4488" />
          <stop offset="100%" stopColor="#03285a" />
        </linearGradient>
      </defs>
      <rect width="720" height="480" rx="32" fill="url(#cp-himmel)" />
      {/* Sonne */}
      <circle cx="610" cy="86" r="34" fill="#ffd873" />
      <circle cx="610" cy="86" r="56" fill="#ffd873" opacity="0.25" />
      {/* Gebäude */}
      <rect x="40" y="120" width="300" height="170" rx="6" fill="#dfe3ea" />
      <rect x="40" y="112" width="300" height="14" rx="4" fill="#c4cad5" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={62 + i * 56} y="150" width="38" height="46" rx="4" fill="#b2cbe9" />
      ))}
      <rect x="360" y="170" width="160" height="120" rx="6" fill="#eef0f4" />
      {Array.from({ length: 3 }, (_, i) => (
        <rect key={i} x={378 + i * 46} y="192" width="30" height="36" rx="4" fill="#d9e6f5" />
      ))}
      {/* Bäume */}
      {[560, 640].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="240" width="8" height="52" fill="#8a6a45" />
          <circle cx={x} cy="228" r="30" fill="#8cba58" />
          <circle cx={x + 14} cy="214" r="18" fill="#aed083" />
        </g>
      ))}
      {/* Boden */}
      <rect x="0" y="290" width="720" height="190" fill="#e6e8ec" />
      <rect x="0" y="286" width="720" height="8" fill="#cde3b1" />
      {/* Stellplatzmarkierung */}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={96 + i * 104} y="392" width="4" height="64" fill="#ffffff" />
      ))}
      {/* Autos */}
      {autos.map((a) => (
        <g key={a.x}>
          <rect x={a.x} y="392" width="84" height="44" rx="14" fill={a.farbe} stroke="#97a0b0" strokeWidth={a.farbe === "#ffffff" ? 1.5 : 0} />
          <rect x={a.x + 14} y="376" width="56" height="26" rx="10" fill={a.farbe} stroke="#97a0b0" strokeWidth={a.farbe === "#ffffff" ? 1.5 : 0} />
          <rect x={a.x + 20} y="381" width="44" height="14" rx="6" fill="#d9e6f5" opacity="0.9" />
          <circle cx={a.x + 18} cy="438" r="9" fill="#252b37" />
          <circle cx={a.x + 66} cy="438" r="9" fill="#252b37" />
        </g>
      ))}
      {/* Carport-Tragwerk */}
      {[110, 318, 526].map((x) => (
        <g key={x}>
          <rect x={x} y="318" width="10" height="140" rx="3" fill="#394050" />
          <rect x={x - 12} y="452" width="34" height="8" rx="3" fill="#6b7486" />
        </g>
      ))}
      <path d="M86 322 L660 322 L672 334 L74 334 Z" fill="#6b7486" />
      {/* Moduldach, leicht geneigt */}
      <path d="M70 318 L664 300 L690 322 L96 340 Z" fill="url(#cp-modul)" />
      {Array.from({ length: 12 }, (_, i) => {
        const x1 = 70 + ((664 - 70) / 12) * i;
        const y1 = 318 - ((318 - 300) / 12) * i;
        return <line key={i} x1={x1 + 26} y1={y1 + 22} x2={x1} y2={y1} stroke="#7fa7d6" strokeWidth="1.2" opacity="0.6" />;
      })}
      <line x1="83" y1="329" x2="677" y2="311" stroke="#7fa7d6" strokeWidth="1.2" opacity="0.6" />
      {/* Ladesäulen */}
      {[210, 418].map((x) => (
        <g key={x}>
          <rect x={x} y="400" width="18" height="56" rx="5" fill="#ffffff" stroke="#669933" strokeWidth="2.5" />
          <rect x={x + 4} y="408" width="10" height="10" rx="2" fill="#669933" />
          <path d={`M${x + 18} 426 C ${x + 34} 432, ${x + 30} 446, ${x + 40} 446`} stroke="#252b37" strokeWidth="3" fill="none" />
        </g>
      ))}
      {/* Energiefluss */}
      <path d="M470 300 C 430 250, 400 240, 380 230" stroke="#ffc53d" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
      <circle cx="380" cy="230" r="6" fill="#ffc53d" />
    </svg>
  );
}

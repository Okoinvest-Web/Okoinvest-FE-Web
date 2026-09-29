/**
 * Flache Illustration: Solarpark versorgt eine Gemeinschaft im Nahebereich
 * (Häuser, Rathaus, Betrieb). Rein dekorativ, Beschriftung im Text daneben.
 */
export default function GemeinschaftSvg({ className }) {
  const haus = (x, y, s = 1) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 22 L22 4 L44 22 V52 H0 Z" fill="#ffffff" stroke="#003473" strokeWidth="2" strokeLinejoin="round" />
      <path d="M-4 24 L22 2 L48 24" fill="none" stroke="#003473" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12 L20 1 L22 3 L8 15 Z" fill="#1f5aa1" opacity="0.9" />
      <rect x="16" y="34" width="12" height="18" rx="2" fill="#d9e6f5" />
    </g>
  );
  return (
    <svg viewBox="0 0 520 400" className={className} role="img" aria-labelledby="gem-svg-t">
      <title id="gem-svg-t">Ein Solarpark versorgt Haushalte, Gemeinde und Betriebe im Nahebereich</title>
      <rect width="520" height="400" rx="32" fill="#fbfaf6" />
      {/* Nahebereich */}
      <circle cx="330" cy="215" r="160" fill="#f4f9ee" stroke="#8cba58" strokeWidth="2" strokeDasharray="6 8" />
      <text x="330" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill="#436621" letterSpacing="1.5">NAHEBEREICH</text>

      {/* Solarpark */}
      <g transform="translate(34 250)">
        {[0, 1, 2].map((r) => (
          <g key={r} transform={`translate(${r * 14} ${r * 26})`}>
            {[0, 1, 2, 3].map((c) => (
              <path key={c} d={`M${c * 30} 0 h26 l-8 18 h-26 z`} fill="#003473" stroke="#4a7cbd" strokeWidth="1" />
            ))}
          </g>
        ))}
        <text x="60" y="108" textAnchor="middle" fontSize="14" fontWeight="700" fill="#151a24">Solarpark</text>
      </g>
      {/* Sonne */}
      <circle cx="78" cy="120" r="30" fill="#ffc53d" />
      <circle cx="78" cy="120" r="44" fill="none" stroke="#ffd873" strokeWidth="3" strokeDasharray="4 10" />

      {/* Leitungen */}
      <g fill="none" stroke="#669933" strokeWidth="3" strokeLinecap="round">
        <path d="M150 270 C 210 250, 230 170, 272 160" />
        <path d="M150 280 C 230 280, 300 250, 380 170" />
        <path d="M150 290 C 230 310, 280 300, 330 300" />
        <path d="M150 285 C 260 290, 360 280, 420 262" />
      </g>

      {/* Häuser */}
      {haus(250, 110, 0.9)}
      {haus(370, 118, 0.8)}
      {haus(415, 212, 0.85)}

      {/* Rathaus */}
      <g transform="translate(300 262)">
        <rect x="0" y="16" width="62" height="44" fill="#ffffff" stroke="#003473" strokeWidth="2" />
        <path d="M-4 18 L31 0 L66 18 Z" fill="#003473" />
        {[8, 22, 36, 50].map((x) => (
          <rect key={x} x={x} y="26" width="5" height="34" fill="#b2cbe9" />
        ))}
      </g>
      <text x="331" y="342" textAnchor="middle" fontSize="13" fontWeight="600" fill="#394050" paintOrder="stroke" stroke="#f4f9ee" strokeWidth="5" strokeLinejoin="round">Gemeinde</text>

      {/* Betrieb */}
      <g transform="translate(248 196)">
        <path d="M0 50 V20 L16 30 V20 L32 30 V20 L48 30 V50 Z" fill="#ffffff" stroke="#003473" strokeWidth="2" strokeLinejoin="round" />
        <rect x="36" y="4" width="8" height="20" fill="#003473" />
      </g>
      <text x="272" y="266" textAnchor="middle" fontSize="13" fontWeight="600" fill="#394050" paintOrder="stroke" stroke="#f4f9ee" strokeWidth="5" strokeLinejoin="round">Betrieb</text>
      <text x="300" y="104" textAnchor="middle" fontSize="13" fontWeight="600" fill="#394050" paintOrder="stroke" stroke="#f4f9ee" strokeWidth="5" strokeLinejoin="round">Haushalte</text>
    </svg>
  );
}

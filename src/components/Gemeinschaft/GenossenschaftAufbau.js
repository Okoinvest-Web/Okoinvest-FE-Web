/**
 * Schema der geplanten Energiegenossenschaft: Mitglieder → Generalversammlung
 * → Aufsichtsrat/Vorstand → Beteiligung an Parks → Erträge zurück.
 * Reines SVG, responsiv über viewBox; zwei Varianten (quer/hoch) per CSS.
 */
export default function GenossenschaftAufbau({ className }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 560 480" className="block h-auto w-full" role="img" aria-labelledby="eg-aufbau-t eg-aufbau-d">
        <title id="eg-aufbau-t">Aufbau der geplanten Energiegenossenschaft</title>
        <desc id="eg-aufbau-d">
          Mitglieder – Bürger, Landwirte, Gemeinden und Unternehmen – bilden die Generalversammlung mit einer Stimme je Mitglied. Sie wählt den Aufsichtsrat,
          der den Vorstand bestellt. Die Genossenschaft beteiligt sich an Solarparks; Überschüsse fließen nach Beschluss der Generalversammlung an die
          Mitglieder zurück.
        </desc>
        <rect width="560" height="480" rx="32" fill="#fbfaf6" />

        {/* Mitglieder */}
        {[
          { x: 70, t: "Bürger" },
          { x: 210, t: "Landwirte" },
          { x: 350, t: "Gemeinden" },
          { x: 490, t: "Betriebe" },
        ].map((m) => (
          <g key={m.t}>
            <circle cx={m.x} cy="62" r="26" fill="#ffffff" stroke="#003473" strokeWidth="2" />
            <circle cx={m.x} cy="55" r="8" fill="#003473" />
            <path d={`M${m.x - 13} 76 a13 11 0 0 1 26 0`} fill="#003473" />
            <text x={m.x} y="108" textAnchor="middle" fontSize="17" fontWeight="700" fill="#151a24">{m.t}</text>
            <path d={`M${m.x} 116 L280 150`} stroke="#c4cad5" strokeWidth="2" />
          </g>
        ))}

        {/* Generalversammlung */}
        <rect x="150" y="150" width="260" height="58" rx="18" fill="#003473" />
        <text x="280" y="177" textAnchor="middle" fontSize="20" fontWeight="800" fill="#ffffff">Generalversammlung</text>
        <text x="280" y="199" textAnchor="middle" fontSize="15" fill="#aed083">ein Mitglied, eine Stimme</text>

        {/* Organe */}
        <path d="M280 208 V232" stroke="#003473" strokeWidth="2" />
        <rect x="110" y="232" width="150" height="46" rx="14" fill="#ffffff" stroke="#003473" strokeWidth="2" />
        <text x="185" y="260" textAnchor="middle" fontSize="17" fontWeight="700" fill="#151a24">Aufsichtsrat</text>
        <rect x="300" y="232" width="150" height="46" rx="14" fill="#ffffff" stroke="#003473" strokeWidth="2" />
        <text x="375" y="260" textAnchor="middle" fontSize="17" fontWeight="700" fill="#151a24">Vorstand</text>
        <path d="M260 255 H300" stroke="#003473" strokeWidth="2" markerEnd="url(#eg-pfeil)" />
        <defs>
          <marker id="eg-pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#003473" />
          </marker>
          <marker id="eg-pfeil-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#669933" />
          </marker>
        </defs>

        {/* Beteiligung Parks */}
        <path d="M375 278 V318" stroke="#669933" strokeWidth="3" markerEnd="url(#eg-pfeil-g)" />
        <text x="386" y="304" fontSize="14.5" fill="#436621" fontWeight="600">beteiligt sich</text>
        <g transform="translate(300 322)">
          <rect width="200" height="96" rx="18" fill="#f4f9ee" stroke="#8cba58" strokeWidth="2" />
          {[0, 1, 2].map((c) => (
            <path key={c} d={`M${24 + c * 52} 34 h40 l-10 20 h-40 z`} fill="#003473" stroke="#4a7cbd" />
          ))}
          <text x="100" y="80" textAnchor="middle" fontSize="17" fontWeight="700" fill="#151a24">Solarparks</text>
        </g>

        {/* Rückfluss */}
        <path d="M300 380 C 180 380, 90 330, 70 130" fill="none" stroke="#669933" strokeWidth="3" strokeDasharray="6 7" markerEnd="url(#eg-pfeil-g)" />
        <text x="40" y="448" fontSize="15" fill="#436621" fontWeight="600">Überschuss nach Beschluss</text>
        <text x="40" y="466" fontSize="15" fill="#436621" fontWeight="600">der Generalversammlung</text>
      </svg>
    </div>
  );
}

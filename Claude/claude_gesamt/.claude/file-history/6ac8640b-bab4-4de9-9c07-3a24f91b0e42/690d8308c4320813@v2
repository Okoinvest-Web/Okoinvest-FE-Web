/**
 * Die Wertschöpfungskette als Kreislauf: Fläche → Projekt → Kapital → Strom
 * → (Pacht, Rendite, günstiger Strom fließen zurück). Dekorative Inline-SVG
 * im Markenstil; die Aussage steht zusätzlich als Text daneben (aria-hidden).
 */
export default function Kreislauf() {
  const knoten = [
    { x: 200, y: 54, titel: "Fläche", sub: "Eigentümer & Landwirte" },
    { x: 346, y: 200, titel: "Projekt", sub: "Entwicklung & Börse" },
    { x: 200, y: 346, titel: "Kapital", sub: "Investoren & Bürger" },
    { x: 54, y: 200, titel: "Strom", sub: "Mittelstand & Gemeinden" },
  ];
  return (
    <svg viewBox="0 0 400 400" className="h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="kl-ring" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8cba58" />
          <stop offset="1" stopColor="#436621" />
        </linearGradient>
        <marker id="kl-pfeil" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#669933" />
        </marker>
      </defs>
      <circle cx="200" cy="200" r="148" fill="none" stroke="#e6f1d8" strokeWidth="26" />
      <circle cx="200" cy="200" r="148" fill="none" stroke="url(#kl-ring)" strokeWidth="3" strokeDasharray="6 10" className="motion-safe:animate-[spin_60s_linear_infinite]" style={{ transformOrigin: "200px 200px" }} />
      {/* Pfeile zwischen den Knoten */}
      {[
        "M258 70 A148 148 0 0 1 330 142",
        "M330 258 A148 148 0 0 1 258 330",
        "M142 330 A148 148 0 0 1 70 258",
        "M70 142 A148 148 0 0 1 142 70",
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="#669933" strokeWidth="3" strokeLinecap="round" markerEnd="url(#kl-pfeil)" />
      ))}
      {/* Mitte */}
      <circle cx="200" cy="200" r="74" fill="#03122b" />
      <circle cx="200" cy="200" r="74" fill="none" stroke="#669933" strokeOpacity="0.45" strokeWidth="1.5" />
      <text x="200" y="192" textAnchor="middle" fontFamily="var(--font-manrope)" fontWeight="800" fontSize="20" fill="#fff">ÖkoInvest</text>
      <text x="200" y="215" textAnchor="middle" fontFamily="var(--font-inter)" fontWeight="600" fontSize="11.5" fill="#aed083">Plattform</text>
      {knoten.map((k) => (
        <g key={k.titel}>
          <circle cx={k.x} cy={k.y} r="50" fill="#fff" stroke="#cde3b1" strokeWidth="2" />
          <text x={k.x} y={k.y - 6} textAnchor="middle" fontFamily="var(--font-manrope)" fontWeight="800" fontSize="16" fill="#151a24">{k.titel}</text>
          {k.sub.split(" & ").map((zeile, i, alle) => (
            <text key={zeile} x={k.x} y={k.y + 11 + i * 11} textAnchor="middle" fontFamily="var(--font-inter)" fontSize="9" fill="#6b7486">
              {zeile}{i < alle.length - 1 ? " &" : ""}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

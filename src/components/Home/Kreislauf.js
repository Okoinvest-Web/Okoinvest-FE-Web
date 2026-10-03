import s from "./startseite.module.css";

/**
 * Die Wertschöpfungskette als Kreislauf: Fläche → Projekt → Kapital → Strom
 * → (Pacht, Rendite, günstiger Strom fließen zurück). Inline-SVG im Markenstil;
 * die Aussage steht zusätzlich als Text daneben (aria-hidden).
 *
 * Choreografie (sobald das umgebende Reveal sichtbar wird, nur CSS):
 * Mitte erscheint, dann leuchten die Stationen nacheinander auf und die Pfeile
 * zeichnen sich jeweils zur nächsten Station – der Kreislauf „läuft einmal herum“.
 * Danach dreht sich der gestrichelte Ring sehr langsam (transform, ov-endlos:
 * pausiert außerhalb des Bildes). Hover/Fokus auf eine Karte links hebt die
 * zugehörige Station hervor (CSS :has, siehe startseite.module.css).
 * Ohne JS / reduzierte Bewegung: Endzustand sofort, keine Drehung.
 */
const R = 148;
const M = 200;

// Bogen-Endpunkte; Pfeilspitze sitzt am Ende, Richtung = Tangente (im Uhrzeigersinn)
const BOEGEN = [
  [258, 70, 330, 142],
  [330, 258, 258, 330],
  [142, 330, 70, 258],
  [70, 142, 142, 70],
].map(([x1, y1, x2, y2]) => ({
  d: `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`,
  x: x2,
  y: y2,
  winkel: (Math.atan2(x2 - M, -(y2 - M)) * 180) / Math.PI,
}));

export const KNOTEN = [
  { id: "flaeche", x: 200, y: 54, titel: "Fläche", sub: "Eigentümer & Landwirte" },
  { id: "projekt", x: 346, y: 200, titel: "Projekt", sub: "Entwicklung & Börse" },
  { id: "kapital", x: 200, y: 346, titel: "Kapital", sub: "Investoren & Bürger" },
  { id: "strom", x: 54, y: 200, titel: "Strom", sub: "Mittelstand & Gemeinden" },
];

export default function Kreislauf() {
  return (
    <svg viewBox="0 0 400 400" className={`h-auto w-full overflow-visible ${s.kreislauf}`} aria-hidden="true">
      <defs>
        <linearGradient id="kl-ring" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8cba58" />
          <stop offset="1" stopColor="#436621" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r={R} fill="none" stroke="#e6f1d8" strokeWidth="26" />
      <g className={`${s.ring} ov-endlos`}>
        <circle cx="200" cy="200" r={R} fill="none" stroke="url(#kl-ring)" strokeWidth="3" strokeDasharray="6 10" />
      </g>

      {/* Pfeile zwischen den Stationen: Linie zeichnet sich, dann erscheint die Spitze */}
      {BOEGEN.map((b, i) => (
        <g key={b.d} style={{ "--i": i }}>
          <path d={b.d} pathLength="1" fill="none" stroke="#669933" strokeWidth="3" strokeLinecap="round" className={s.bogen} />
          <g transform={`translate(${b.x} ${b.y}) rotate(${b.winkel.toFixed(1)})`}>
            <path d="M-6 -5 L4 0 L-6 5 z" fill="#669933" className={s.spitze} />
          </g>
        </g>
      ))}

      {/* Mitte */}
      <g className={s.mitte}>
        <circle cx="200" cy="200" r="74" fill="#03122b" />
        <circle cx="200" cy="200" r="74" fill="none" stroke="#669933" strokeOpacity="0.45" strokeWidth="1.5" />
        <text x="200" y="192" textAnchor="middle" fontFamily="var(--font-manrope)" fontWeight="800" fontSize="20" fill="#fff">ÖkoInvest</text>
        <text x="200" y="215" textAnchor="middle" fontFamily="var(--font-inter)" fontWeight="600" fontSize="11.5" fill="#aed083">Plattform</text>
      </g>

      {KNOTEN.map((k, i) => (
        <g key={k.id} className={s.knoten} data-knoten={k.id} style={{ "--i": i }}>
          <g className={s.knotenInnen}>
            <circle cx={k.x} cy={k.y} r="57" fill="none" stroke="#8cba58" strokeWidth="2" className={s.halo} />
            <circle cx={k.x} cy={k.y} r="50" fill="#fff" stroke="#cde3b1" strokeWidth="2" className={s.scheibe} />
            <text x={k.x} y={k.y - 6} textAnchor="middle" fontFamily="var(--font-manrope)" fontWeight="800" fontSize="16" fill="#151a24">{k.titel}</text>
            {k.sub.split(" & ").map((zeile, j, alle) => (
              <text key={zeile} x={k.x} y={k.y + 11 + j * 11} textAnchor="middle" fontFamily="var(--font-inter)" fontSize="9" fill="#6b7486">
                {zeile}{j < alle.length - 1 ? " &" : ""}
              </text>
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}

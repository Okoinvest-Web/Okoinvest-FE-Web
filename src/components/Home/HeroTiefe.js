/**
 * Tiefen-Ebenen für dunkle Heros (Startseite, Landingpages).
 *
 * Rein dekorativ (aria-hidden), Server-Komponente, keine Hex-Werte:
 * Farben kommen über currentColor bzw. Token-Variablen.
 *
 *  1. Lichtkegel oben rechts (Sonne, sehr dezent) und grünes Bodenlicht
 *  2. Fluchtlinien wie Modulreihen, die zum Horizont laufen
 *  3. Energiefluss-Linien, die einmal einlaufen (ov-linie, stroke-dashoffset)
 *  4. wenige schwebende Lichtpunkte (animate-ov-float, nur transform)
 *
 * Unter prefers-reduced-motion steht alles still im Endzustand.
 * Elternelement braucht `relative isolate overflow-hidden`.
 */
const PUNKTE = [
  { x: 62, y: 22, r: 2.2, d: "-1.2s", o: 0.7 },
  { x: 78, y: 38, r: 1.6, d: "-3.4s", o: 0.55 },
  { x: 88, y: 18, r: 1.4, d: "-5.1s", o: 0.45 },
  { x: 70, y: 58, r: 2, d: "-2.3s", o: 0.5 },
  { x: 94, y: 48, r: 1.2, d: "-4.2s", o: 0.4 },
  { x: 54, y: 70, r: 1.4, d: "-6s", o: 0.35 },
];

export default function HeroTiefe({ className = "" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 ${className}`}>
      {/* 1 – Licht */}
      <div
        className="absolute -right-[10%] -top-[30%] h-[80%] w-[60%] rounded-full opacity-70"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-sun-300) 22%, transparent), transparent)" }}
      />
      <div
        className="absolute -bottom-[35%] left-[10%] h-[70%] w-[70%] rounded-full"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--color-ov-500) 26%, transparent), transparent)" }}
      />

      {/* 2 + 3 – Linien (nur ab Tablet, mobil bleibt die Fläche ruhig) */}
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid slice"
        className="ov-sofort absolute inset-0 hidden h-full w-full md:block"
      >
        <g className="text-white" stroke="currentColor" strokeWidth="0.08" fill="none" opacity="0.14">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={58 + i * 5.5} y1="60" x2={80 + i * 0.6} y2="30" />
          ))}
          {[38, 44, 52].map((y) => (
            <line key={y} x1="50" y1={y} x2="100" y2={y - 2} />
          ))}
        </g>
        <g className="text-ov-300" stroke="currentColor" fill="none" strokeLinecap="round">
          <path d="M 46 58 C 60 50, 66 40, 82 34 S 98 26, 104 22" strokeWidth="0.18" opacity="0.55" pathLength="1" className="ov-linie" style={{ "--ov-delay": "500ms" }} />
          <path d="M 58 62 C 70 52, 76 46, 90 42 S 100 38, 106 36" strokeWidth="0.12" opacity="0.35" pathLength="1" className="ov-linie" style={{ "--ov-delay": "750ms" }} />
        </g>
      </svg>

      {/* 4 – Lichtpunkte */}
      <div className="absolute inset-0 hidden md:block">
        {PUNKTE.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-ov-300 motion-safe:animate-ov-float"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.r * 3}px`,
              height: `${p.r * 3}px`,
              opacity: p.o,
              animationDelay: p.d,
              boxShadow: "0 0 12px 2px color-mix(in oklab, var(--color-ov-300) 55%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

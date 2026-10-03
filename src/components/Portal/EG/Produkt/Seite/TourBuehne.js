// Dekorative Bühnenmotive der Produkt-Tour (nur von Tour.js genutzt). Reines Inline-SVG, aria-hidden, ohne Bewegung.

/** Mitglied: Energie strahlt von der Region aus – konzentrische Ringe mit Sonnenpunkten */
function Ringe() {
  return (
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <g fill="none" stroke="var(--color-ov-500)">
        {[90, 150, 210, 270, 330].map((r, i) => (
          <circle key={r} cx="300" cy="300" r={r} strokeOpacity={0.22 - i * 0.035} strokeWidth="1.25" strokeDasharray={i % 2 ? "2 7" : undefined} />
        ))}
      </g>
      <g fill="var(--color-ov-500)">
        <circle cx="300" cy="90" r="5" fillOpacity="0.45" />
        <circle cx="510" cy="300" r="4" fillOpacity="0.3" />
        <circle cx="152" cy="448" r="4" fillOpacity="0.35" />
        <circle cx="448" cy="152" r="3" fillOpacity="0.3" />
      </g>
      <circle cx="300" cy="300" r="150" fill="var(--color-ov-200)" fillOpacity="0.35" />
    </svg>
  );
}

/** Zustimmung: zehn Werktage als Zifferblatt rund um den Bildschirm */
function Frist() {
  const tage = Array.from({ length: 10 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <circle cx="300" cy="300" r="250" fill="none" stroke="var(--color-sun-500)" strokeOpacity="0.18" strokeWidth="1.25" />
      {tage.map((i) => {
        const w = ((i / 10) * 360 - 90) * (Math.PI / 180);
        const x = 300 + Math.cos(w) * 250;
        const y = 300 + Math.sin(w) * 250;
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={i < 4 ? 7 : 5} fill="var(--color-sun-500)" fillOpacity={i < 4 ? 0.4 : 0.18} />;
      })}
      <circle cx="300" cy="300" r="170" fill="var(--color-sun-200)" fillOpacity="0.3" />
    </svg>
  );
}

/** Kassa: Kontobuch – feine Zeilen und Spalten, nach außen auslaufend */
function Kontobuch() {
  return (
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id="tour-kontobuch-maske" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="tour-kontobuch">
          <rect width="600" height="600" fill="url(#tour-kontobuch-maske)" />
        </mask>
      </defs>
      <g mask="url(#tour-kontobuch)" stroke="var(--color-navy-500)" strokeWidth="1">
        {Array.from({ length: 20 }, (_, i) => (
          <line key={`z${i}`} x1="0" x2="600" y1={i * 30 + 15} y2={i * 30 + 15} strokeOpacity="0.12" />
        ))}
        <line x1="120" x2="120" y1="0" y2="600" strokeOpacity="0.2" />
        <line x1="128" x2="128" y1="0" y2="600" strokeOpacity="0.2" />
        <line x1="470" x2="470" y1="0" y2="600" strokeOpacity="0.14" />
      </g>
      <circle cx="300" cy="280" r="170" fill="var(--color-navy-200)" fillOpacity="0.28" />
    </svg>
  );
}

export function TourBuehnenMotiv({ art }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {art === "mitglied" ? <Ringe /> : art === "zustimmung" ? <Frist /> : <Kontobuch />}
    </div>
  );
}

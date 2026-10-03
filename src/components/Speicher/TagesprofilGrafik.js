/**
 * Schematischer Tagesverlauf: Solarerzeugung, Börsenpreis und Fahrweise eines
 * Batteriespeichers (laden mittags, entladen morgens und abends). Illustration ohne
 * Messdaten – Server-Komponente. Legende als HTML darunter (lesbar auch mobil).
 *
 * Bewegung erzählt den Tag (startet, sobald ein Reveal-Vorfahre sichtbar wird): erst zeichnet sich der
 * Börsenpreis, dann wachsen die Ladebalken mittags nach unten und zuletzt die Entladebalken abends nach oben.
 * Ohne Reveal-Vorfahre, ohne JS oder bei reduzierter Bewegung steht die Grafik sofort vollständig.
 */
export function TagesprofilLegende({ className = "" }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/75 ${className}`}>
      <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-ov-300" /> Börsenpreis</li>
      <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-sun-300/80" /> Solarerzeugung</li>
      <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-navy-400" /> Speicher lädt</li>
      <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-ov-500" /> Speicher entlädt</li>
    </ul>
  );
}

export default function TagesprofilGrafik({ legende = true }) {
  const W = 720;
  const H = 300;
  const P = { l: 16, r: 16, t: 34, b: 34 };
  const x = (h) => P.l + (h / 24) * (W - P.l - P.r);
  const mitte = P.t + (H - P.t - P.b) * 0.66;
  // Preisform (relativ): morgens Spitze, mittags tief, abends Spitze
  const preis = [0.45, 0.42, 0.4, 0.4, 0.42, 0.52, 0.7, 0.82, 0.74, 0.55, 0.36, 0.22, 0.12, 0.1, 0.14, 0.26, 0.45, 0.72, 0.95, 1.0, 0.88, 0.7, 0.58, 0.5, 0.46];
  const yP = (v) => P.t + (1 - v) * (mitte - P.t - 12);
  const pfadPreis = preis.map((v, h) => `${h ? "L" : "M"}${x(h).toFixed(1)},${yP(v).toFixed(1)}`).join(" ");
  // Solar: Glocke 6–20 Uhr
  const solar = (h) => (h < 6 || h > 20 ? 0 : Math.pow(Math.sin(((h - 6) / 14) * Math.PI), 1.6));
  const punkteSolar = Array.from({ length: 49 }, (_, i) => i / 2);
  const ySo = (v) => mitte - v * (mitte - P.t - 40);
  const pfadSolar = `M${x(0)},${mitte} ` + punkteSolar.map((h) => `L${x(h).toFixed(1)},${ySo(solar(h)).toFixed(1)}`).join(" ") + ` L${x(24)},${mitte} Z`;
  const laden = [11, 12, 13, 14];
  const entladen = [7, 18, 19, 20];
  const balkenH = 34;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Schema: Der Speicher lädt mittags bei hoher Solarerzeugung und niedrigen Preisen und entlädt morgens und abends bei hohen Preisen.">
        <defs>
          <linearGradient id="sp-solar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffd873" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffd873" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="sp-laden" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7fa7d6" />
            <stop offset="100%" stopColor="#1f5aa1" />
          </linearGradient>
          <linearGradient id="sp-entladen" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#aed083" />
            <stop offset="100%" stopColor="#558227" />
          </linearGradient>
        </defs>
        {/* Zeitfenster hinterlegt */}
        <rect x={x(11)} y={P.t - 22} width={x(15) - x(11)} height={mitte + balkenH + 8 - P.t + 22} rx="10" fill="#4a7cbd" fillOpacity="0.1" />
        <rect x={x(18)} y={P.t - 22} width={x(21) - x(18)} height={mitte + balkenH + 8 - P.t + 22} rx="10" fill="#8cba58" fillOpacity="0.1" />
        <text x={(x(11) + x(15)) / 2} y={P.t - 6} textAnchor="middle" fill="#b2cbe9" fontSize="12" fontWeight="600">Mittagstief · laden</text>
        <text x={(x(18) + x(21)) / 2} y={P.t - 6} textAnchor="middle" fill="#cde3b1" fontSize="12" fontWeight="600">Abendspitze · entladen</text>

        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1={P.t} y2={mitte + balkenH + 4} stroke="rgba(255,255,255,0.07)" />
            <text x={x(h)} y={H - 8} textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} fill="rgba(255,255,255,0.55)" fontSize="12">{`${String(h).padStart(2, "0")}:00`}</text>
          </g>
        ))}
        <path d={pfadSolar} fill="url(#sp-solar)" className="ov-flaeche-ein" />
        <line x1={P.l} x2={W - P.r} y1={mitte} y2={mitte} stroke="rgba(255,255,255,0.25)" />
        <path d={pfadPreis} pathLength="1" className="ov-linie" fill="none" stroke="#aed083" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(13)} cy={yP(0.1)} r="5" fill="#03122b" stroke="#aed083" strokeWidth="2.5" className="ov-flaeche-ein" />
        <circle cx={x(19)} cy={yP(1)} r="5" fill="#03122b" stroke="#aed083" strokeWidth="2.5" className="ov-flaeche-ein" />
        {/* Ladebalken wachsen von der Mittellinie nach unten, Entladebalken nach oben – in Tagesreihenfolge */}
        {laden.map((h, i) => (
          <rect key={`l${h}`} x={x(h) + 3} y={mitte + 4} width={x(1) - x(0) - 6} height={balkenH} rx="6" fill="url(#sp-laden)" className="ov-balken-y" style={{ transformOrigin: "50% 0%", "--i": i * 2, "--ov-delay": "650ms" }} />
        ))}
        {entladen.map((h, i) => (
          <rect key={`e${h}`} x={x(h) + 3} y={mitte - balkenH - 4} width={x(1) - x(0) - 6} height={balkenH} rx="6" fill="url(#sp-entladen)" className="ov-balken-y" style={{ "--i": h < 12 ? 0 : (i - 1) * 2, "--ov-delay": h < 12 ? "450ms" : "1150ms" }} />
        ))}
      </svg>
      {legende && <TagesprofilLegende className="mt-4" />}
    </figure>
  );
}

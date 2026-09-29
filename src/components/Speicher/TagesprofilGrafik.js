/**
 * Schematischer Tagesverlauf: Solarerzeugung, Börsenpreis und Fahrweise eines
 * Batteriespeichers (laden mittags, entladen abends). Illustration ohne
 * Messdaten – Server-Komponente.
 */
export default function TagesprofilGrafik() {
  const W = 720;
  const H = 330;
  const P = { l: 30, r: 16, t: 20, b: 74 };
  const x = (h) => P.l + (h / 24) * (W - P.l - P.r);
  const mitte = P.t + (H - P.t - P.b) * 0.62;
  // Preisform (relativ): morgens Spitze, mittags tief/negativ, abends Spitze
  const preis = [0.45, 0.42, 0.4, 0.4, 0.42, 0.52, 0.7, 0.82, 0.74, 0.55, 0.36, 0.22, 0.12, 0.1, 0.14, 0.26, 0.45, 0.72, 0.95, 1.0, 0.88, 0.7, 0.58, 0.5, 0.46];
  const yP = (v) => P.t + (1 - v) * (mitte - P.t - 10);
  const pfadPreis = preis.map((v, h) => `${h ? "L" : "M"}${x(h).toFixed(1)},${yP(v).toFixed(1)}`).join(" ");
  // Solar: Glocke 6–20 Uhr
  const solar = (h) => (h < 6 || h > 20 ? 0 : Math.pow(Math.sin(((h - 6) / 14) * Math.PI), 1.6));
  const punkteSolar = Array.from({ length: 49 }, (_, i) => i / 2);
  const ySo = (v) => mitte - v * (mitte - P.t - 30);
  const pfadSolar = `M${x(0)},${mitte} ` + punkteSolar.map((h) => `L${x(h).toFixed(1)},${ySo(solar(h)).toFixed(1)}`).join(" ") + ` L${x(24)},${mitte} Z`;
  const laden = [11, 12, 13, 14];
  const entladen = [7, 18, 19, 20];
  const balkenH = 38;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Schema: Der Speicher lädt mittags bei hoher Solarerzeugung und niedrigen Preisen und entlädt morgens und abends bei hohen Preisen.">
      <defs>
        <linearGradient id="sp-solar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd873" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffd873" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {[0, 6, 12, 18, 24].map((h) => (
        <g key={h}>
          <line x1={x(h)} x2={x(h)} y1={P.t} y2={mitte + balkenH + 4} stroke="rgba(255,255,255,0.08)" />
          <text x={x(h)} y={H - 46} textAnchor="middle" className="fill-white/50 text-[12px]">{`${String(h).padStart(2, "0")}:00`}</text>
        </g>
      ))}
      <path d={pfadSolar} fill="url(#sp-solar)" />
      <line x1={P.l} x2={W - P.r} y1={mitte} y2={mitte} stroke="rgba(255,255,255,0.25)" />
      <path d={pfadPreis} fill="none" stroke="#aed083" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {laden.map((h) => (
        <rect key={`l${h}`} x={x(h) + 3} y={mitte + 4} width={x(1) - x(0) - 6} height={balkenH} rx="6" fill="#4a7cbd" />
      ))}
      {entladen.map((h) => (
        <rect key={`e${h}`} x={x(h) + 3} y={mitte - balkenH - 4} width={x(1) - x(0) - 6} height={balkenH} rx="6" fill="#669933" />
      ))}
      <text x={x(12.5)} y={mitte + balkenH + 22} textAnchor="middle" className="fill-navy-200 text-[12px] font-semibold">laden</text>
      <text x={x(19.5)} y={mitte - balkenH - 12} textAnchor="middle" className="fill-ov-300 text-[12px] font-semibold">entladen</text>
      <text x={x(7.5)} y={mitte - balkenH - 12} textAnchor="middle" className="fill-ov-300 text-[12px] font-semibold">entladen</text>
      <g transform={`translate(${P.l}, ${H - 28})`}>
        <rect width="250" height="26" rx="13" fill="rgba(255,255,255,0.06)" />
        <line x1="14" x2="30" y1="13" y2="13" stroke="#aed083" strokeWidth="3" strokeLinecap="round" />
        <text x="36" y="17" className="fill-white/75 text-[11.5px]">Börsenpreis</text>
        <rect x="118" y="7" width="14" height="12" rx="3" fill="#ffd873" opacity="0.8" />
        <text x="138" y="17" className="fill-white/75 text-[11.5px]">Solarerzeugung</text>
      </g>
    </svg>
  );
}

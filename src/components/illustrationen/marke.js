// Animiertes Marken-Motiv für Login / Registrierung (viewBox 320 × 320) – Team T7.
// Schwebende Energie-Insel: Solarreihen, Speicher, Haus mit PV, Windrad als Kontext,
// umlaufender Energiefluss. Standardmäßig animiert; unter reduzierter Bewegung still.

import { Baum, Block, Container, Fluss, Haus, Illu, Modulreihe, Sonne, Windrad, Wolke, farben, raum, s } from "./basis";

export function MarkenMotiv({ className, ton, animiert = true, titel }) {
  const r = raum(11, [160, 104]);
  const f = farben(ton);
  const Z = 1.2;
  const bahn = "M12 176A148 58 0 0 1 308 176";
  const bahnVorn = "M308 176A148 58 0 0 1 12 176";
  return (
    <Illu viewBox="0 0 320 320" className={className} ton={ton} animiert={animiert} titel={titel}>
      <ellipse className={s.puls} cx="160" cy="292" rx="70" ry="10" fill={f.d ? "rgba(255,255,255,0.08)" : f.sand[1]} stroke="none" />
      <Sonne f={f} x={66} y={70} rad={18} />
      <Wolke f={f} x={226} y={46} g={0.9} kontur={!f.d} />
      <Fluss f={f} d={bahn} breite={2} langsam />
      <g className={s.schweben}>
        <Block r={r} x={0.8} y={0.8} z={-1.6} b={10.4} t={10.4} h={1.6} m={f.tief} />
        <Block r={r} x={0} y={0} z={0} b={12} t={12} h={Z} m={f.d ? f.wiese : f.gruen} />
        <Windrad r={r} f={f} x={10.8} y={0.8} z={Z} h={7.4} />
        <Container r={r} f={f} x={8.4} y={2.6} z={Z} b={2.6} t={1.6} h={1.7} tueren={2} m={f.hell} />
        {[1.2, 3.8, 6.4].map((y) => (
          <Modulreihe key={y} r={r} f={f} x={0.9} y={y} z={Z} l={6.4} zellen={3} />
        ))}
        <Fluss f={f} points={r.pts([7.6, 2, Z + 0.05], [7.6, 9.2, Z + 0.05], [8.6, 9.2, Z + 0.05])} />
        <Fluss f={f} points={r.pts([9.6, 4.2, Z + 0.05], [9.6, 7.8, Z + 0.05])} langsam />
        <Haus r={r} f={f} x={8.4} y={7.8} z={Z} b={2.8} t={2.4} h={1.7} dh={1.2} pv />
        <Baum r={r} f={f} x={1.6} y={10.4} z={Z} />
        <Baum r={r} f={f} x={4.6} y={10.8} z={Z} g={0.8} />
      </g>
      <Fluss f={f} d={bahnVorn} breite={2} langsam />
    </Illu>
  );
}

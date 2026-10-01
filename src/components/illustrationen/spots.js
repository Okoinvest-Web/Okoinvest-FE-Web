// Spot-Grafiken für Feature-Karten (viewBox 96 × 96) – Team T7.
// Kleine Wiesen-Kachel 8 × 8 (E = 6), genau ein Motiv. Empfohlene Größe 64–96 px.

import { ILLU } from "@/components/ui/illustration";
import { Baum, Block, Container, Fluss, Haus, Illu, Mast, Modulreihe, farben, raum, s } from "./basis";

const Z = 0.5;

function linie(r, a, b) {
  return "M" + r.pts(a, b).replace(" ", "L");
}

function Kachel({ ton, className, animiert, titel, boden = "wiese", children }) {
  const r = raum(6, [48, 38]);
  const f = farben(ton);
  return (
    <Illu viewBox="0 0 96 96" className={className} ton={ton} animiert={animiert} titel={titel}>
      <Block r={r} x={0} y={0} b={8} t={8} h={Z} m={f[boden]} />
      {children(r, f)}
    </Illu>
  );
}

function Streifen({ r, f, von = 1, bis = 7, n = 5 }) {
  const l = [];
  for (let i = 0; i < n; i++) l.push(linie(r, [0.7, von + (i * (bis - von)) / (n - 1), Z], [7.3, von + (i * (bis - von)) / (n - 1), Z]));
  return <path d={l.join("")} stroke={f.d ? f.gruen[1] : f.gruen[2]} strokeWidth="2" strokeDasharray="1 4" />;
}

function Muenzen({ x, y, f, n = 3 }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const yy = y - i * 4;
        return (
          <g key={i}>
            <path d={`M${x - 8} ${yy}v2.5a8 4 0 0 0 16 0v-2.5z`} fill={f.sonne} strokeWidth="1.2" />
            <ellipse cx={x} cy={yy} rx="8" ry="4" fill={f.sonneHell} strokeWidth="1.2" />
          </g>
        );
      })}
    </g>
  );
}

export function SpotFreiflaeche(p) {
  return (
    <Kachel {...p}>
      {(r, f) => (
        <>
          {[0.8, 3.2, 5.6].map((y) => (
            <Modulreihe key={y} r={r} f={f} x={0.8} y={y} z={Z} l={5.6} zellen={2} />
          ))}
          <Baum r={r} f={f} x={7.3} y={6.6} z={Z} g={0.9} />
        </>
      )}
    </Kachel>
  );
}

export function SpotAgriPv(p) {
  return (
    <Kachel {...p}>
      {(r, f) => (
        <>
          <Streifen r={r} f={f} />
          <path d={[1, 6.4].map((x) => linie(r, [x, 5.2, Z], [x, 5.2, Z + 2.6]) + linie(r, [x, 3.4, Z], [x, 3.4, Z + 3.1])).join("")} stroke={f.linie} strokeWidth="1.2" />
          <Modulreihe r={r} f={f} x={0.6} y={3.4} z={Z + 2.6} l={6.4} t={1.8} h0={0.1} h1={0.6} zellen={3} beine={false} />
        </>
      )}
    </Kachel>
  );
}

export function SpotSolarcarport(p) {
  return (
    <Kachel {...p} boden="sand">
      {(r, f) => (
        <>
          <Block r={r} x={2.6} y={2.6} z={Z + 0.1} b={1.6} t={3} h={0.6} m={f.gruen} />
          <Block r={r} x={2.75} y={3.4} z={Z + 0.7} b={1.3} t={1.4} h={0.45} m={[f.glanz, f.modul[1], f.modul[2]]} />
          <path d={[1, 6.6].map((x) => linie(r, [x, 6.2, Z], [x, 6.2, Z + 2.2]) + linie(r, [x, 1.6, Z], [x, 1.6, Z + 2.9])).join("")} stroke={f.linie} strokeWidth="1.2" />
          <Modulreihe r={r} f={f} x={0.6} y={1.4} z={Z + 2.2} l={6.4} t={5} h0={0} h1={0.7} zellen={3} beine={false} />
        </>
      )}
    </Kachel>
  );
}

export function SpotGrossspeicher(p) {
  return (
    <Kachel {...p}>
      {(r, f) => {
        const [x, y] = r.p(3.4, 2.4, Z + 5.2);
        return (
          <>
            <Container r={r} f={f} x={1} y={2.2} z={Z} b={4.6} t={2} h={2.2} tueren={3} />
            <Block r={r} x={5.4} y={5.6} z={Z} b={1.6} t={1.4} h={1.4} m={f.hell} />
            <Fluss f={f} points={r.pts([4, 4.2, Z + 0.05], [4, 6.3, Z + 0.05], [5.4, 6.3, Z + 0.05])} breite={1.6} />
            <g className={s.schweben}>
              <rect x={x - 13} y={y - 6} width="26" height="12" rx="6" fill={f.hell[0]} strokeWidth="1.2" />
              {[0, 1, 2].map((i) => (
                <rect key={i} x={x - 8 + i * 6} y={y - 2.5} width="4" height="5" rx="1" fill={i < 2 ? ILLU.gruenRechts : f.hell[2]} stroke="none" />
              ))}
            </g>
          </>
        );
      }}
    </Kachel>
  );
}

export function SpotNetzanschluss(p) {
  return (
    <Kachel {...p}>
      {(r, f) => (
        <>
          <Mast r={r} f={f} x={5.2} y={2.6} z={Z} h={6.2} />
          <Fluss f={f} points={r.pts([2.6, 5.2, Z + 0.05], [5.2, 5.2, Z + 0.05], [5.2, 2.8, Z + 0.05])} breite={1.6} />
          <Block r={r} x={1} y={4.4} z={Z} b={1.8} t={1.8} h={1.5} m={f.hell} />
        </>
      )}
    </Kachel>
  );
}

export function SpotProjektboerse(p) {
  const hoehen = [1, 1.8, 2.6, 3.6];
  return (
    <Kachel {...p} boden="sand">
      {(r, f) => (
        <>
          {hoehen.map((h, i) => (
            <Block key={i} r={r} x={1 + i * 1.6} y={4.6} z={Z} b={1.1} t={1.1} h={h} m={i === 3 ? f.gruen : f.modul} />
          ))}
          <Fluss f={f} points={r.pts([1.4, 3.8, Z + 1.9], [3, 3.8, Z + 2.6], [4.6, 3.8, Z + 3.2], [6.6, 3.8, Z + 4.8])} breite={1.6} />
          <polygon points={r.pts([6.6, 3.8, Z + 5.4], [7.3, 3.8, Z + 4.4], [6, 3.8, Z + 4.6])} fill={f.strom} stroke="none" />
        </>
      )}
    </Kachel>
  );
}

export function SpotPacht(p) {
  return (
    <Kachel {...p}>
      {(r, f) => {
        const [x, y] = r.p(5.6, 2.8, Z);
        return (
          <>
            <Streifen r={r} f={f} />
            <polygon points={r.pts([0.8, 0.8, Z], [4.4, 0.8, Z], [4.4, 7.2, Z], [0.8, 7.2, Z])} fill="none" stroke={f.strom} strokeDasharray="3 3" />
            <Muenzen x={x} y={y - 3} f={f} />
          </>
        );
      }}
    </Kachel>
  );
}

export function SpotEnergiegemeinschaft(p) {
  const haeuser = [
    [0.8, 0.8, true],
    [4.8, 1.4, false],
    [2.4, 4.8, true],
  ];
  return (
    <Kachel {...p}>
      {(r, f) => (
        <>
          <Fluss f={f} points={r.pts([1.8, 2.6, Z + 0.05], [5.8, 3, Z + 0.05], [3.4, 6.4, Z + 0.05], [1.8, 2.6, Z + 0.05])} breite={1.6} langsam />
          {haeuser.map(([x, y, pv]) => (
            <Haus key={x} r={r} f={f} x={x} y={y} z={Z} b={2} t={1.8} h={1.3} dh={0.9} pv={pv} fenster={false} />
          ))}
        </>
      )}
    </Kachel>
  );
}

export function SpotVirtuellesKraftwerk(p) {
  return (
    <Kachel {...p} boden="sand">
      {(r, f) => {
        const [cx, cy] = r.p(4, 4, Z + 2.6);
        return (
          <>
            <Fluss f={f} d={[[1.4, 1.4], [6.6, 1.4], [1.4, 6.6], [6.6, 6.6]].map(([x, y]) => linie(r, [x, y, Z + 0.05], [4, 4, Z + 0.05])).join("")} breite={1.5} />
            <Block r={r} x={0.8} y={0.8} z={Z} b={1.2} t={1.2} h={1} m={f.modul} />
            <Block r={r} x={6} y={0.8} z={Z} b={1.2} t={1.2} h={1.4} m={f.hell} />
            <Block r={r} x={0.8} y={6} z={Z} b={1.2} t={1.2} h={0.8} m={f.gruen} />
            <Block r={r} x={3.3} y={3.3} z={Z} b={1.4} t={1.4} h={1.6} m={f.modul} />
            <Block r={r} x={6} y={6} z={Z} b={1.2} t={1.2} h={1.2} m={f.hell} />
            <circle className={s.puls} cx={cx} cy={cy - 4} r="5" fill={ILLU.gruenRechts} />
          </>
        );
      }}
    </Kachel>
  );
}

export function SpotReststrom(p) {
  return (
    <Kachel {...p} boden="sand">
      {(r, f) => (
        <>
          <Block r={r} x={1} y={1.6} z={Z} b={5.4} t={3.6} h={2.2} m={f.hell} />
          <polygon points={r.pts([1.6, 5.2, Z + 0.3], [3.2, 5.2, Z + 0.3], [3.2, 5.2, Z + 1.6], [1.6, 5.2, Z + 1.6])} fill={f.glanz} strokeWidth="1" />
          <Modulreihe r={r} f={f} x={1.4} y={1.9} z={Z + 2.2} l={4.6} t={1.3} h0={0.2} h1={0.7} zellen={2} beine={false} />
          <Modulreihe r={r} f={f} x={1.4} y={3.6} z={Z + 2.2} l={4.6} t={1.3} h0={0.2} h1={0.7} zellen={2} beine={false} />
          <Fluss f={f} points={r.pts([6.4, 4, Z + 0.05], [7.6, 4, Z + 0.05], [7.6, 7.6, Z + 0.05])} breite={1.6} />
        </>
      )}
    </Kachel>
  );
}

export function SpotFlaechencheck(p) {
  return (
    <Kachel {...p}>
      {(r, f) => (
        <>
          <polygon points={r.pts([1, 1.4, Z], [6.8, 1, Z], [7, 6.8, Z], [1.4, 7, Z])} fill={f.gruen[0]} stroke={f.strom} strokeDasharray="3 3" />
          <g className={s.schweben}>
            <path d="M48 22c-7 0-12 5-12 11c0 8 12 20 12 20s12-12 12-20c0-6-5-11-12-11z" fill={ILLU.gruenRechts} />
            <circle cx="48" cy="33" r="4.2" fill={ILLU.hellOben} />
          </g>
        </>
      )}
    </Kachel>
  );
}

export function SpotKommune(p) {
  return (
    <Kachel {...p}>
      {(r, f) => (
        <>
          <Block r={r} x={4.6} y={2} z={Z} b={1.2} t={1.2} h={4.6} m={f.hell} />
          <polygon points={r.pts([4.6, 3.2, Z + 4.6], [5.8, 3.2, Z + 4.6], [5.2, 2.6, Z + 5.8])} fill={f.modul[2]} />
          <polygon points={r.pts([5.8, 2, Z + 4.6], [5.8, 3.2, Z + 4.6], [5.2, 2.6, Z + 5.8])} fill={f.modul[1]} />
          <Haus r={r} f={f} x={1} y={3.4} z={Z} b={4} t={2.6} h={1.8} dh={1.1} pv />
          <Baum r={r} f={f} x={7.2} y={6.6} z={Z} g={0.85} />
        </>
      )}
    </Kachel>
  );
}

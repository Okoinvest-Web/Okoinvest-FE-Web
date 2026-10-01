// Leerzustände (viewBox 160 × 128, Ausschnitt einer 200 × 160-Bühne) – Team T7.
// Einheitliche Bühne: Sand-Sockel 9 × 9 Einheiten (E = 8), ein Objekt, ein grüner Akzent.
// Gedacht für <Leer illustration={<KeineDokumente />} … /> aus Portal/ui (max. 220 px breit).

import { ILLU } from "@/components/ui/illustration";
import { Block, Fluss, Haus, Illu, Mast, Modulreihe, Wolke, farben, haken, raum, s } from "./basis";

const Z = 0.5;

function linie(r, a, b) {
  return "M" + r.pts(a, b).replace(" ", "L");
}

/** Gemeinsame Bühne aller Leerzustände. */
function Buehne({ ton, className, animiert, titel, children }) {
  const r = raum(8, [100, 74]);
  const f = farben(ton);
  return (
    <Illu viewBox="20 24 160 128" className={className} ton={ton} animiert={animiert} titel={titel}>
      <Block r={r} x={0} y={0} b={9} t={9} h={Z} m={f.sand} />
      {children(r, f)}
    </Illu>
  );
}

function Busch({ r, f, x, y }) {
  const [sx, sy] = r.p(x, y, Z);
  return (
    <g>
      <circle cx={sx} cy={sy - 5} r="6" fill={f.gruen[1]} />
      <circle cx={sx - 2} cy={sy - 7} r="2.6" fill={f.gruen[0]} stroke="none" />
    </g>
  );
}

/** Senkrechte Fläche in der Ebene y = konstant (zeigt nach links vorn). */
function wand(r, x0, x1, y, z0, z1) {
  return r.pts([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]);
}

/** Liegendes Blatt mit Textzeilen. */
function Blatt({ r, f, x, y, z = Z, b, t, zeilen = 3 }) {
  const top = z + 0.12;
  const l = [];
  for (let i = 0; i < zeilen; i++) l.push(linie(r, [x + 0.5, y + 0.7 + i * 0.7, top], [x + b - (i === zeilen - 1 ? 1.6 : 0.6), y + 0.7 + i * 0.7, top]));
  return (
    <g>
      <Block r={r} x={x} y={y} z={z} b={b} t={t} h={0.12} m={f.hell} />
      <path d={l.join("")} stroke={f.hell[2]} strokeWidth="1.5" />
    </g>
  );
}

function Schatten({ x, y, rx = 22, f }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.36} fill={f.sand[1]} stroke="none" className={s.puls} />;
}

const plus = (x, y, g = 5) => `M${x - g} ${y}h${2 * g}M${x} ${y - g}v${2 * g}`;

export function KeineNachrichten(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Busch r={r} f={f} x={1.5} y={2} />
          <path d={linie(r, [4.5, 5.5, Z], [4.5, 5.5, Z + 2.6])} stroke={f.linie} strokeWidth="2.5" />
          <Block r={r} x={3.4} y={4.7} z={Z + 2.6} b={2.6} t={1.6} h={1.5} m={f.modul} />
          <path d={linie(r, [3.9, 6.3, Z + 3.5], [5.4, 6.3, Z + 3.5])} stroke={f.glanz} strokeWidth="1.6" />
          <path d={linie(r, [6, 5.1, Z + 3], [6, 5.1, Z + 5])} stroke={f.linie} />
          <polygon points={r.pts([6, 5.1, Z + 5], [6, 6.1, Z + 4.7], [6, 5.1, Z + 4.3])} fill={f.gruen[2]} />
          <g className={s.schweben}>
            <Block r={r} x={6.6} y={0.6} z={Z + 5.4} b={2.6} t={1.8} h={0.15} m={f.hell} />
            <polyline points={r.pts([6.6, 0.6, Z + 5.55], [7.9, 1.5, Z + 5.55], [9.2, 0.6, Z + 5.55])} fill="none" strokeWidth="1" />
          </g>
        </>
      )}
    </Buehne>
  );
}

export function KeineDokumente(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const zz = Z + 4;
        const [mx, my] = r.p(6.4, 2.8, zz);
        return (
          <>
            <Block r={r} x={1.5} y={2.6} z={Z} b={1.6} t={0.5} h={0.35} m={f.gruen} />
            <Block r={r} x={1.5} y={3} z={Z} b={4.5} t={3.4} h={0.35} m={f.gruen} />
            <Blatt r={r} f={f} x={2} y={3.4} z={Z + 0.35} b={3.6} t={2.6} />
            <Busch r={r} f={f} x={7.6} y={7.4} />
            <g className={s.schweben}>
              <polygon points={r.pts([4.6, 1.2, zz], [8.2, 1.2, zz], [8.2, 4.4, zz], [4.6, 4.4, zz])} fill={f.hell[0]} fillOpacity="0.7" stroke={f.strom} strokeDasharray="3 4" />
              <path d={plus(mx, my)} stroke={f.strom} strokeWidth="2" />
            </g>
          </>
        );
      }}
    </Buehne>
  );
}

export function KeineAufgaben(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Busch r={r} f={f} x={7.6} y={2} />
          <polygon points={r.pts([6.5, 5.5, Z], [6.5, 5.8, Z], [6.5, 5.8, Z + 5], [6.5, 5.5, Z + 5])} fill={f.modul[2]} />
          <polygon points={wand(r, 2.5, 6.5, 5.8, Z, Z + 5)} fill={f.modul[1]} />
          <polygon points={wand(r, 2.9, 6.1, 5.8, Z + 0.4, Z + 4.4)} fill={f.hell[0]} strokeWidth="1" />
          <Block r={r} x={3.8} y={5.5} z={Z + 4.5} b={1.4} t={0.5} h={0.6} m={f.hell} />
          {[0, 1, 2].map((i) => {
            const zi = Z + 3.3 - i * 1.1;
            const [cx, cy] = r.p(3.5, 5.8, zi + 0.3);
            return (
              <g key={i}>
                <polygon points={wand(r, 3.2, 3.8, 5.8, zi, zi + 0.6)} fill={f.gruen[2]} strokeWidth="1" />
                <path d={haken(cx, cy, 0.5)} stroke={f.hell[0]} strokeWidth="1.4" fill="none" />
                <path d={linie(r, [4.2, 5.8, zi + 0.3], [5.7, 5.8, zi + 0.3])} stroke={f.hell[2]} strokeWidth="2" />
              </g>
            );
          })}
        </>
      )}
    </Buehne>
  );
}

export function KeineProjekte(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <polygon points={r.pts([1.5, 1.5, Z], [7.5, 1.5, Z], [7.5, 7.5, Z], [1.5, 7.5, Z])} fill={f.gruen[0]} fillOpacity="0.6" stroke={f.strom} strokeDasharray="4 4" />
          <path d={[[1.5, 1.5], [7.5, 1.5], [7.5, 7.5], [1.5, 7.5]].map(([x, y]) => linie(r, [x, y, Z], [x, y, Z + 1])).join("")} stroke={f.linie} strokeWidth="2" />
          <path d={linie(r, [4.5, 4.5, Z], [4.5, 4.5, Z + 5.2])} stroke={f.linie} strokeWidth="2" />
          <polygon points={r.pts([4.5, 4.5, Z + 5.2], [7, 4.5, Z + 4.6], [4.5, 4.5, Z + 4])} fill={f.gruen[2]} />
        </>
      )}
    </Buehne>
  );
}

export function KeineAnlagen(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const [bx, by] = r.p(7.6, 0.8, Z + 4);
        return (
          <>
            <polygon points={r.pts([1.4, 1.6, Z + 1.4], [7.4, 1.6, Z + 1.4], [7.4, 3.2, Z + 0.5], [1.4, 3.2, Z + 0.5])} fill="none" stroke={f.strom} strokeDasharray="3 4" />
            <Modulreihe r={r} f={f} x={1.4} y={5} z={Z} l={6} zellen={3} />
            <g className={s.schweben}>
              <circle cx={bx} cy={by} r="10" fill={ILLU.gruenRechts} stroke="none" />
              <path d={plus(bx, by, 4.5)} stroke={f.hell[0]} strokeWidth="2.2" />
            </g>
          </>
        );
      }}
    </Buehne>
  );
}

export function KeineBelege(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const oben = [];
        for (let i = 0; i <= 8; i++) oben.push([5.2 - i * 0.4, 5, Z + 4.4 - (i % 2) * 0.3]);
        const [cx, cy] = r.p(6.8, 2.6, Z);
        return (
          <>
            {[0, 1, 2].map((i) => {
              const y = cy - 3 - i * 5;
              return (
                <g key={i}>
                  <path d={`M${cx - 10} ${y}v3a10 5 0 0 0 20 0v-3z`} fill={f.sonne} />
                  <ellipse cx={cx} cy={y} rx="10" ry="5" fill={f.sonneHell} />
                </g>
              );
            })}
            <polygon points={r.pts([2, 5, Z], [5.2, 5, Z], ...oben)} fill={f.hell[0]} />
            <path d={[0, 1, 2].map((i) => linie(r, [2.5, 5, Z + 3.4 - i * 0.7], [4.7, 5, Z + 3.4 - i * 0.7])).join("")} stroke={f.hell[2]} strokeWidth="1.8" />
            <path d={linie(r, [2.5, 5, Z + 0.9], [4.7, 5, Z + 0.9])} stroke={f.strom} strokeWidth="2.4" />
            <Busch r={r} f={f} x={1.6} y={2} />
          </>
        );
      }}
    </Buehne>
  );
}

export function SucheOhneTreffer(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Block r={r} x={1.2} y={1.4} z={Z} b={1.2} t={1.2} h={0.6} m={f.hell} />
          <Block r={r} x={7} y={6.6} z={Z} b={1.2} t={1.2} h={0.9} m={f.gruen} />
          <Schatten f={f} x={100} y={110} />
          <g className={s.schweben}>
            <path d="M114 74l14 14" stroke={f.modul[2]} strokeWidth="7" />
            <circle cx="100" cy="60" r="20" fill={f.hell[0]} fillOpacity="0.85" stroke={f.modul[1]} strokeWidth="4.5" />
            <path d="M91 60h18" stroke={f.hell[2]} strokeWidth="2.5" strokeDasharray="3 4" />
          </g>
        </>
      )}
    </Buehne>
  );
}

export function Offline(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const [sx, sy] = r.p(5.8, 5.4, Z + 1);
        return (
          <>
            <Block r={r} x={5} y={3} z={Z} b={2.4} t={2.4} h={1.8} m={f.hell} />
            <circle cx={sx - 2} cy={sy - 2} r="1.6" fill={f.modul[2]} strokeWidth="0.8" />
            <circle cx={sx + 4} cy={sy + 1} r="1.6" fill={f.modul[2]} strokeWidth="0.8" />
            <path d={"M" + r.pts([1.2, 6.4, Z + 0.5]).replace(",", " ") + "Q40 132 22 142"} fill="none" stroke={f.linie} strokeWidth="2" />
            <Block r={r} x={1.2} y={5.8} z={Z} b={1.8} t={1.3} h={1.1} m={f.modul} />
            <path d={linie(r, [3, 6.1, Z + 0.5], [3.6, 6.1, Z + 0.5]) + linie(r, [3, 6.7, Z + 0.5], [3.6, 6.7, Z + 0.5])} stroke={f.linie} strokeWidth="2" />
            <g className={s.schweben}>
              <Wolke f={f} x={108} y={48} g={0.9} kontur />
              <path d="M112 28l36 28" stroke={f.linie} strokeWidth="2.5" />
            </g>
          </>
        );
      }}
    </Buehne>
  );
}

export function Fehler(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Busch r={r} f={f} x={1.6} y={6.8} />
          <path d={linie(r, [4.5, 4.5, Z], [4.5, 4.5, Z + 3])} stroke={f.linie} strokeWidth="2.5" />
          <polygon points="100,44 123,82 77,82" fill={f.sonne} />
          <path d="M100 56v13" stroke={ILLU.kontur} strokeWidth="3" />
          <circle cx="100" cy="75" r="1.9" fill={ILLU.kontur} stroke="none" />
          <polygon points={r.pts([6, 5.6, Z], [7.8, 5.6, Z], [7.8, 5.6, Z + 1.1], [6, 5.6, Z + 1.6])} fill={f.hell[1]} />
          <polygon points={r.pts([6, 5.6, Z + 1.6], [7.8, 5.6, Z + 1.1], [7.8, 3.8, Z + 1.1], [6, 3.8, Z + 1.6])} fill={f.hell[0]} />
          <polygon points={r.pts([7.8, 3.8, Z], [7.8, 5.6, Z], [7.8, 5.6, Z + 1.1], [7.8, 3.8, Z + 1.1])} fill={f.hell[2]} />
        </>
      )}
    </Buehne>
  );
}

export function NichtGefunden(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          {[8, 6.5, 5].map((y) => (
            <Block key={y} r={r} x={3.9} y={y - 1} z={Z} b={1.2} t={1} h={0.12} m={f.hell} />
          ))}
          <polygon points={r.pts([3.9, 2.4, Z + 0.06], [5.1, 2.4, Z + 0.06], [5.1, 3.6, Z + 0.06], [3.9, 3.6, Z + 0.06])} fill="none" stroke={f.strom} strokeDasharray="3 3" />
          <path d={linie(r, [6.4, 3.2, Z], [6.4, 3.2, Z + 4.6])} stroke={f.linie} strokeWidth="2.5" />
          <polygon points={r.pts([6.4, 3.2, Z + 4.2], [8.6, 3.2, Z + 4.2], [9.1, 3.2, Z + 3.8], [8.6, 3.2, Z + 3.4], [6.4, 3.2, Z + 3.4])} fill={f.gruen[2]} />
          <polygon points={r.pts([6.4, 3.2, Z + 3], [6.4, 1, Z + 3], [6.4, 0.5, Z + 2.6], [6.4, 1, Z + 2.2], [6.4, 3.2, Z + 2.2])} fill={f.modul[1]} />
          <Busch r={r} f={f} x={1.6} y={2} />
        </>
      )}
    </Buehne>
  );
}

export function Erfolg(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Modulreihe r={r} f={f} x={1.5} y={4.6} z={Z} l={6} zellen={3} />
          <Busch r={r} f={f} x={7.8} y={8} />
          <g className={s.schweben}>
            <circle cx="100" cy="52" r="24" fill={f.gruen[0]} opacity="0.6" stroke="none" />
            <circle cx="100" cy="52" r="17" fill={ILLU.gruenRechts} stroke="none" />
            <path d={haken(100, 53, 1.7)} stroke={ILLU.hellOben} strokeWidth="3.5" fill="none" />
            <path d="M132 38l6-4M134 52h7M68 38l-6-4M66 52h-7" stroke={f.strom} strokeWidth="2" />
          </g>
        </>
      )}
    </Buehne>
  );
}

export function WartenNetzbetreiber(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Fluss f={f} points={r.pts([0.6, 7, Z + 0.05], [4.6, 7, Z + 0.05], [4.6, 4.4, Z + 0.05])} langsam />
          <Mast r={r} f={f} x={6.4} y={3.4} z={Z} h={6.2} />
          <g className={s.schweben}>
            <circle cx="62" cy="48" r="16" fill={f.hell[0]} stroke={f.modul[1]} strokeWidth="2.5" />
            <path d="M62 48v-7" stroke={ILLU.kontur} strokeWidth="2" />
            <g className={s.kreis}>
              <circle cx="62" cy="48" r="11" fill="none" stroke="none" />
              <path d="M62 48l8 3" stroke={f.strom} strokeWidth="2" />
            </g>
          </g>
        </>
      )}
    </Buehne>
  );
}

export function Unterschrift(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const top = Z + 0.12;
        const kringel = [];
        for (let i = 0; i <= 12; i++) kringel.push([2.2 + i * 0.3, 5.3 + Math.sin(i * 1.3) * 0.35, top]);
        return (
          <>
            <Blatt r={r} f={f} x={1.4} y={1.6} b={5.4} t={5} zeilen={3} />
            <path d={linie(r, [2, 5.9, top], [6, 5.9, top])} stroke={f.hell[2]} strokeWidth="1.2" />
            <polyline points={r.pts(...kringel)} fill="none" stroke={f.strom} strokeWidth="1.8" />
            <Block r={r} x={5.2} y={7.2} z={Z} b={3.2} t={0.4} h={0.4} m={f.modul} />
            <polygon points={r.pts([5.2, 7.2, Z + 0.4], [5.2, 7.6, Z + 0.4], [4.4, 7.4, Z + 0.1])} fill={f.hell[1]} />
          </>
        );
      }}
    </Buehne>
  );
}

export function Verifizierung(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const top = Z + 0.15;
        return (
          <>
            <Block r={r} x={1.4} y={3.8} z={Z} b={5} t={3.4} h={0.15} m={f.hell} />
            <polygon points={r.pts([1.9, 4.3, top], [3.4, 4.3, top], [3.4, 6.6, top], [1.9, 6.6, top])} fill={f.glanz} strokeWidth="1" />
            <path d={linie(r, [4, 4.6, top], [5.9, 4.6, top]) + linie(r, [4, 5.4, top], [5.9, 5.4, top]) + linie(r, [4, 6.2, top], [5.2, 6.2, top])} stroke={f.hell[2]} strokeWidth="1.6" />
            <g className={s.schweben}>
              <path d="M132 28l20 7v14c0 13-9 21-20 26c-11-5-20-13-20-26v-14z" fill={f.modul[2]} />
              <path d={haken(132, 51, 1.6)} stroke={ILLU.gruenOben} strokeWidth="3" fill="none" />
            </g>
          </>
        );
      }}
    </Buehne>
  );
}

export function KalenderLeer(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const y = 5;
        const raster = [Z + 1.2, Z + 2.2].map((z) => linie(r, [2.2, y, z], [6.8, y, z])).concat([3.4, 4.6, 5.8].map((x) => linie(r, [x, y, Z + 0.3], [x, y, Z + 3.1])));
        return (
          <>
            <Block r={r} x={2} y={4.4} z={Z} b={5} t={0.6} h={4.4} m={f.hell} />
            <polygon points={wand(r, 2, 7, y, Z + 3.4, Z + 4.4)} fill={f.modul[1]} />
            <path d={raster.join("")} stroke={f.hell[2]} strokeWidth="1.2" />
            <polygon points={wand(r, 4.75, 5.65, y, Z + 1.35, Z + 2.05)} fill="none" stroke={f.strom} strokeDasharray="2 2" />
            <path d={linie(r, [3.2, 4.7, Z + 4.1], [3.2, 4.7, Z + 4.9]) + linie(r, [5.8, 4.7, Z + 4.1], [5.8, 4.7, Z + 4.9])} stroke={f.linie} strokeWidth="2.2" />
            <Busch r={r} f={f} x={7.8} y={7.6} />
          </>
        );
      }}
    </Buehne>
  );
}

export function KeineBenachrichtigungen(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <Schatten f={f} x={100} y={108} rx={24} />
          <g className={s.schweben}>
            <path d="M80 86c2-5 5-8 5-19c0-10 7-17 15-17s15 7 15 17c0 11 3 14 5 19z" fill={f.modul[1]} />
            <path d="M96 50a4 4 0 0 1 8 0" fill="none" stroke={f.linie} strokeWidth="2" />
            <circle cx="100" cy="91" r="4.5" fill={ILLU.gruenRechts} />
            <path d="M92 60c-2 3-3 6-3 10" stroke={f.glanz} strokeWidth="2" fill="none" />
          </g>
          <Busch r={r} f={f} x={1.6} y={6.8} />
        </>
      )}
    </Buehne>
  );
}

export function KeineFlaechen(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <polygon points={r.pts([1, 1, Z], [8, 1, Z], [8, 8, Z], [1, 8, Z])} fill={f.gruen[0]} stroke={f.strom} strokeDasharray="4 4" />
          <path d={[[1, 1], [8, 1], [8, 8], [1, 8]].map(([x, y]) => linie(r, [x, y, Z], [x, y, Z + 1])).join("")} stroke={f.linie} strokeWidth="2" />
          <Schatten f={f} x={100} y={108} rx={14} />
          <g className={s.schweben}>
            <path d="M100 38c-10 0-17 7-17 16c0 12 17 28 17 28s17-16 17-28c0-9-7-16-17-16z" fill={ILLU.gruenRechts} />
            <circle cx="100" cy="54" r="6" fill={ILLU.hellOben} />
          </g>
        </>
      )}
    </Buehne>
  );
}

export function KeineGebote(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const y = 5;
        const [ax, ay] = r.p(6.6, y, Z + 3.4);
        return (
          <>
            <polygon points={r.pts([7.2, 4.7, Z], [7.2, y, Z], [7.2, y, Z + 4], [7.2, 4.7, Z + 4])} fill={f.hell[2]} />
            <polygon points={wand(r, 1.8, 7.2, y, Z, Z + 4)} fill={f.hell[0]} />
            <path d={linie(r, [2.4, y, Z + 3.5], [2.4, y, Z + 0.6]) + linie(r, [2.4, y, Z + 0.6], [6.7, y, Z + 0.6])} stroke={f.hell[2]} strokeWidth="1.5" />
            <path d={linie(r, [2.6, y, Z + 1.3], [6.5, y, Z + 1.3])} stroke={f.hell[2]} strokeWidth="2" strokeDasharray="3 3" />
            <polyline points={r.pts([2.6, y, Z + 1.3], [4.2, y, Z + 2], [5, y, Z + 1.8], [6.6, y, Z + 3.4])} fill="none" stroke={f.strom} strokeWidth="2.2" strokeDasharray="4 4" className={s.fluss2} />
            <circle cx={ax} cy={ay} r="3.5" fill={ILLU.gruenRechts} stroke="none" />
            <Busch r={r} f={f} x={7.8} y={7.8} />
          </>
        );
      }}
    </Buehne>
  );
}

function GeistHaus({ r, f, x, y, b = 2.6, t = 2.2, h = 1.6, dh = 1.1 }) {
  const m = t / 2;
  return (
    <g fill="none" stroke={f.strom} strokeDasharray="3 3">
      <polygon points={r.pts([x, y + t, Z], [x + b, y + t, Z], [x + b, y, Z], [x + b, y, Z + h], [x + b, y + m, Z + h + dh], [x, y + m, Z + h + dh], [x, y + t, Z + h])} />
      <path d={"M" + r.pts([x, y + t, Z + h], [x + b, y + t, Z + h], [x + b, y + t, Z]).replace(" ", "L").replace(" ", "L")} />
    </g>
  );
}

export function KeineMitglieder(p) {
  return (
    <Buehne {...p}>
      {(r, f) => (
        <>
          <GeistHaus r={r} f={f} x={5.6} y={1} />
          <Fluss f={f} points={r.pts([3, 6.4, Z + 0.05], [6.9, 6.4, Z + 0.05], [6.9, 3.2, Z + 0.05])} langsam />
          <Haus r={r} f={f} x={1.4} y={4.4} z={Z} b={2.6} t={2.2} h={1.6} dh={1.1} pv />
          <GeistHaus r={r} f={f} x={5.6} y={5.6} />
        </>
      )}
    </Buehne>
  );
}

export function KeineMesswerte(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const y = 5.4;
        return (
          <>
            <Fluss f={f} points={r.pts([4.4, y, Z + 0.05], [4.4, 8.6, Z + 0.05])} langsam />
            <Block r={r} x={3} y={4} z={Z} b={2.8} t={1.4} h={3.6} m={f.hell} />
            <polygon points={wand(r, 3.4, 5.4, y, Z + 2.1, Z + 3.2)} fill={f.modul[2]} />
            <path className={s.puls} d={linie(r, [3.7, y, Z + 2.65], [5.1, y, Z + 2.65])} stroke={ILLU.gruenOben} strokeWidth="1.8" />
            <polygon points={wand(r, 3.8, 5, y, Z + 0.8, Z + 1.4)} fill={f.hell[1]} strokeWidth="1" />
            <Busch r={r} f={f} x={1.6} y={2} />
            <Busch r={r} f={f} x={7.8} y={7.2} />
          </>
        );
      }}
    </Buehne>
  );
}

export function Wartung(p) {
  return (
    <Buehne {...p}>
      {(r, f) => {
        const kegel = (x, y) => {
          const [cx, cy] = r.p(x, y, Z);
          return (
            <g key={x}>
              <polygon points={`${cx - 9},${cy} ${cx + 9},${cy} ${cx},${cy - 26}`} fill={f.hell[0]} />
              <polygon points={`${cx - 6},${cy - 9} ${cx + 6},${cy - 9} ${cx + 3.6},${cy - 15.6} ${cx - 3.6},${cy - 15.6}`} fill={ILLU.gruenRechts} strokeWidth="1" />
            </g>
          );
        };
        return (
          <>
            <path d={linie(r, [3.4, 3, Z], [3.4, 3, Z + 2.4]) + linie(r, [7.4, 3, Z], [7.4, 3, Z + 2.4])} stroke={f.linie} strokeWidth="2" />
            <polygon points={wand(r, 3, 7.8, 3, Z + 1.7, Z + 2.5)} fill={f.gruen[2]} />
            <path d={[3.8, 5, 6.2].map((x) => linie(r, [x, 3, Z + 1.7], [x + 0.6, 3, Z + 2.5])).join("")} stroke={f.hell[0]} strokeWidth="2.5" />
            {kegel(2.2, 6.8)}
            {kegel(5.6, 7.4)}
          </>
        );
      }}
    </Buehne>
  );
}

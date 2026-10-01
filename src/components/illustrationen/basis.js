// Gemeinsame Bausteine der Illustrationsbibliothek (Team T7).
// Stil laut docs/DESIGN.md § 5: Isometrie 30°, drei Helligkeiten je Körper,
// 1,5-px-Konturen in Navy, Energiefluss als grüne Strichlinie (4 6).
// Alles reines Inline-SVG ohne Hooks – nutzbar in Server- und Client-Komponenten.

import { ILLU, iso, quader } from "@/components/ui/illustration";
import { cn } from "@/components/ui/cn";
import s from "./illustrationen.module.css";

export { s };

/** Dunkelflächen = Tokens --ov-nacht-3/-2/-1, ov-300 für Linien auf Dunkel. */
const NACHT = ["#0c2650", "#071c3d", "#03122b"];
const OV300 = "#aed083";

/** Farbsatz je Ton. Materialien als Tripel: oben, links, rechts. */
export function farben(ton) {
  const d = ton === "dunkel";
  return {
    d,
    k: d ? "rgba(255,255,255,0.22)" : ILLU.kontur,
    linie: d ? "rgba(255,255,255,0.55)" : ILLU.kontur,
    strom: d ? OV300 : ILLU.strom,
    glanz: ILLU.modulGlanz,
    sonne: ILLU.sonne,
    sonneHell: ILLU.sonneHell,
    gruen: [ILLU.gruenOben, ILLU.gruenLinks, ILLU.gruenRechts],
    tief: [ILLU.gruenLinks, ILLU.gruenRechts, ILLU.gruenTief],
    wiese: d ? NACHT : [ILLU.gruenOben, ILLU.gruenLinks, ILLU.gruenRechts],
    sand: d ? NACHT : [ILLU.boden, ILLU.bodenDunkel, ILLU.hellRechts],
    modul: [ILLU.modulOben, ILLU.modulLinks, ILLU.modulRechts],
    hell: [ILLU.hellOben, ILLU.hellLinks, ILLU.hellRechts],
    wolke: d ? "rgba(255,255,255,0.14)" : ILLU.hellOben,
    papier: ILLU.hellOben,
  };
}

/** Isometrischer Raum mit fester Einheit E (px) und Ursprung O. */
export function raum(E, O) {
  // Auf 0,1 px (Einzelpunkte) bzw. ganze Pixel (Flächen) runden – hält jedes Motiv unter 6 KB.
  const p = (x, y, z = 0) => iso(x, y, z, E, O).map((v) => Math.round(v * 10) / 10);
  const ganz = (str) => str.replace(/-?\d+\.\d+/g, (m) => String(Math.round(+m)));
  const q = (x, y, z, b, t, h) => {
    const k = quader(x, y, z, b, t, h, E, O);
    return { oben: ganz(k.oben), links: ganz(k.links), rechts: ganz(k.rechts) };
  };
  return {
    E,
    p,
    q,
    /** Punkte im Raum → points-String (ganze Pixel). */
    pts: (...l) => l.map((a) => p(...a).map((v) => Math.round(v)).join(",")).join(" "),
  };
}

/**
 * Wurzel-SVG jeder Illustration.
 * titel → role="img" + <title> (inhaltstragend); ohne titel → aria-hidden.
 */
export function Illu({ viewBox, titel, className, animiert, ton, children }) {
  const f = farben(ton);
  return (
    <svg
      viewBox={viewBox}
      className={cn(s.illu, animiert && s.an, className || "h-auto w-full")}
      role={titel ? "img" : undefined}
      aria-label={titel || undefined}
      aria-hidden={titel ? undefined : true}
      focusable="false"
    >
      {titel && <title>{titel}</title>}
      <g stroke={f.k} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}

/** Quader mit drei Flächen; m = Materialtripel aus farben(). */
export function Koerper({ q, m, className }) {
  return (
    <g className={className}>
      <polygon points={q.links} fill={m[1]} />
      <polygon points={q.rechts} fill={m[2]} />
      <polygon points={q.oben} fill={m[0]} />
    </g>
  );
}

/** Quader an Raumkoordinaten (Kurzform). */
export function Block({ r, x, y, z = 0, b, t, h, m, className }) {
  return <Koerper q={r.q(x, y, z, b, t, h)} m={m} className={className} />;
}

/** Geneigte Modulreihe (Süd-Ausrichtung zum Betrachter links-vorn). */
export function Modulreihe({ r, f, x, y, z = 0, l, t = 1.6, h0 = 0.5, h1 = 1.4, zellen = 3, beine = true }) {
  const d = 0.2;
  const zl = [];
  for (let i = 1; i < zellen; i++) {
    const xi = x + (l * i) / zellen;
    zl.push(r.pts([xi, y, z + h1], [xi, y + t, z + h0]));
  }
  return (
    <g>
      {beine && <polyline points={r.pts([x + 0.4, y + t, z], [x + 0.4, y + t, z + h0], [x + l - 0.4, y + t, z + h0], [x + l - 0.4, y + t, z])} fill="none" stroke={f.linie} strokeWidth="1.2" />}
      <polygon points={r.pts([x, y + t, z + h0], [x + l, y + t, z + h0], [x + l, y + t, z + h0 - d], [x, y + t, z + h0 - d])} fill={f.modul[1]} />
      <polygon points={r.pts([x + l, y, z + h1], [x + l, y + t, z + h0], [x + l, y + t, z + h0 - d], [x + l, y, z + h1 - d])} fill={f.modul[2]} />
      <polygon points={r.pts([x, y, z + h1], [x + l, y, z + h1], [x + l, y + t, z + h0], [x, y + t, z + h0])} fill={f.modul[0]} />
      {zl.length > 0 && <path d={zl.map((z2) => "M" + z2.replace(" ", "L")).join("")} stroke={f.glanz} strokeWidth="0.8" />}
    </g>
  );
}

/** Laubbaum: Stamm + Krone in zwei Grüntönen. */
export function Baum({ r, f, x, y, z = 0, g = 1 }) {
  const [sx, sy] = r.p(x, y, z);
  const E = r.E * g;
  return (
    <g>
      <line x1={sx} y1={sy} x2={sx} y2={sy - E * 1.1} strokeWidth="2" stroke={f.linie} />
      <circle cx={sx} cy={sy - E * 2} r={E * 1.05} fill={f.gruen[1]} />
      <circle cx={sx - E * 0.32} cy={sy - E * 2.3} r={E * 0.45} fill={f.gruen[0]} stroke="none" />
    </g>
  );
}

/** Windrad (nur Kontext). Rotor dreht bei animiert. */
export function Windrad({ r, f, x, y, z = 0, h = 8 }) {
  const [bx, by] = r.p(x, y, z);
  const ty = by - h * r.E;
  const L = h * r.E * 0.42;
  const fluegel = `-1.8,0 0,${-L} 1.8,0`;
  return (
    <g>
      <polygon points={`${bx - 2.6},${by} ${bx + 2.6},${by} ${bx + 1.1},${ty} ${bx - 1.1},${ty}`} fill={f.hell[1]} />
      <g transform={`translate(${bx} ${ty})`}>
        <g className={s.rotor}>
          <circle r={L} fill="none" stroke="none" />
          {[0, 120, 240].map((w) => (
            <polygon key={w} points={fluegel} transform={`rotate(${w})`} fill={f.hell[0]} />
          ))}
          <circle r="2.6" fill={f.hell[2]} />
        </g>
      </g>
    </g>
  );
}

/** Wolke in Bildschirmkoordinaten (x/y = linke Unterkante). */
export function Wolke({ f, x, y, g = 1, verz, kontur }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${g})`}>
      <path
        className={cn(s.wolke, verz && s.verz)}
        d="M0 0h44a9 9 0 0 0-3-17a12 12 0 0 0-22-6a9 9 0 0 0-15 7a8 8 0 0 0-4 16z"
        fill={f.wolke}
        stroke={kontur ? undefined : "none"}
      />
    </g>
  );
}

/** Sonne mit Schein und Strahlen (einziger Sonnen-Akzent je Bild). */
export function Sonne({ f, x, y, rad = 16, strahlen = true }) {
  const st = [];
  for (let i = 0; i < 8; i++) {
    const w = (i * Math.PI) / 4;
    const c = Math.cos(w);
    const n = Math.sin(w);
    st.push(`M${(x + c * (rad + 5)).toFixed(1)} ${(y + n * (rad + 5)).toFixed(1)}L${(x + c * (rad + 10)).toFixed(1)} ${(y + n * (rad + 10)).toFixed(1)}`);
  }
  return (
    <g>
      <circle cx={x} cy={y} r={rad * 1.9} fill={f.sonneHell} opacity={f.d ? 0.1 : 0.22} stroke="none" />
      {strahlen && <path className={s.strahlen} d={st.join("")} stroke={f.sonne} strokeWidth="2" />}
      <circle cx={x} cy={y} r={rad} fill={f.sonneHell} stroke="none" />
    </g>
  );
}

/** Energiefluss: gestrichelte grüne Linie (läuft bei animiert). */
export function Fluss({ f, points, d, breite = 2, langsam }) {
  const props = { fill: "none", stroke: f.strom, strokeWidth: breite, strokeDasharray: "4 6", className: langsam ? s.fluss2 : s.fluss };
  return d ? <path d={d} {...props} /> : <polyline points={points} {...props} />;
}

/** Haus mit Satteldach (First parallel zur x-Achse); pv = Module auf dem Dach. */
export function Haus({ r, f, x, y, z = 0, b = 3, t = 2.4, h = 1.8, dh = 1.2, pv = false, fenster = true }) {
  const m = t / 2;
  return (
    <g>
      <Block r={r} x={x} y={y} z={z} b={b} t={t} h={h} m={f.hell} />
      <polygon points={r.pts([x + b, y, z + h], [x + b, y + t, z + h], [x + b, y + m, z + h + dh])} fill={f.hell[2]} />
      <polygon points={r.pts([x, y + t, z + h], [x + b, y + t, z + h], [x + b, y + m, z + h + dh], [x, y + m, z + h + dh])} fill={pv ? f.modul[0] : f.modul[2]} />
      {pv && <path d={"M" + r.pts([x + b / 2, y + t, z + h], [x + b / 2, y + m, z + h + dh]).replace(" ", "L")} stroke={f.glanz} strokeWidth="0.8" />}
      {fenster && <polygon points={r.pts([x + b * 0.3, y + t, z + h * 0.35], [x + b * 0.3 + 0.7, y + t, z + h * 0.35], [x + b * 0.3 + 0.7, y + t, z + h * 0.75], [x + b * 0.3, y + t, z + h * 0.75])} fill={f.glanz} strokeWidth="1" />}
    </g>
  );
}

/** Strommast (Gittermast vereinfacht). */
export function Mast({ r, f, x, y, z = 0, h = 7 }) {
  const [bx, by] = r.p(x, y, z);
  const ty = by - h * r.E;
  const a1 = r.pts([x, y - 1.3, z + h * 0.78], [x, y + 1.3, z + h * 0.78]);
  const a2 = r.pts([x, y - 0.9, z + h * 0.58], [x, y + 0.9, z + h * 0.58]);
  const w = r.E * 0.5;
  return (
    <g fill="none" stroke={f.linie} strokeWidth="1.4">
      <path d={`M${bx - w} ${by}L${bx} ${ty}L${bx + w} ${by}M${bx - w * 0.6} ${by - (by - ty) * 0.4}L${bx + w * 0.6} ${by - (by - ty) * 0.4}M${bx - w * 0.8} ${by - (by - ty) * 0.15}L${bx + w * 0.4} ${by - (by - ty) * 0.45}`} />
      <path d={"M" + a1.replace(" ", "L") + "M" + a2.replace(" ", "L")} />
    </g>
  );
}

/** Speicher-/Technikcontainer mit Türlinien. */
export function Container({ r, f, x, y, z = 0, b = 4, t = 1.8, h = 2, tueren = 3, m }) {
  const lin = [];
  for (let i = 1; i <= tueren; i++) {
    const xi = x + (b * i) / (tueren + 1);
    lin.push("M" + r.pts([xi, y + t, z + 0.25], [xi, y + t, z + h - 0.25]).replace(" ", "L"));
  }
  return (
    <g>
      <Block r={r} x={x} y={y} z={z} b={b} t={t} h={h} m={m || f.hell} />
      <path d={lin.join("")} strokeWidth="1" />
    </g>
  );
}

/** Kleiner Kreis-Marker (Status) in Bildschirmkoordinaten. */
export function Marker({ x, y, rad = 9, fill, children, className }) {
  return (
    <g className={className}>
      <circle cx={x} cy={y} r={rad} fill={fill} />
      {children}
    </g>
  );
}

/** Häkchen-Pfad (Bildschirmkoordinaten, Mittelpunkt x/y). */
export function haken(x, y, g = 1) {
  return `M${x - 4 * g} ${y}l${3 * g} ${3 * g}l${5.5 * g} ${-6 * g}`;
}

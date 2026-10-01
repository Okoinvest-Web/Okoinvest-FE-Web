// Hero-Szenen (16:10, viewBox 480 × 300) – Team T7.
// Gemeinsame Bühne: Wiesen-Platte 26 × 18 Einheiten, E = 10 px.
// Props aller Motive: className, ton ("hell" | "dunkel"), animiert, titel.

import { ILLU } from "@/components/ui/illustration";
import { Baum, Block, Container, Fluss, Haus, Illu, Koerper, Mast, Modulreihe, Sonne, Windrad, Wolke, farben, raum, s } from "./basis";

const VB = "0 0 480 300";
const Z = 0.6;

function buehne(ton, O = [206, 64]) {
  return { r: raum(10, O), f: farben(ton) };
}

function Flaeche({ r, fill, x0, y0, x1, y1, z = Z }) {
  return <polygon points={r.pts([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z])} fill={fill} strokeWidth="1" />;
}

function linie(r, a, b) {
  return "M" + r.pts(a, b).replace(" ", "L");
}

/** Solarpark in hügelfreier Landschaft mit Weg, Trafo, Netzanschluss. */
export function SolarparkLandschaft({ className, ton, animiert, titel }) {
  const { r, f } = buehne(ton);
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Sonne f={f} x={92} y={74} />
      <Wolke f={f} x={318} y={62} />
      <Wolke f={f} x={36} y={128} g={0.7} verz />
      <Block r={r} x={0} y={0} b={26} t={18} h={Z} m={f.wiese} />
      <Windrad r={r} f={f} x={21} y={0.8} z={Z} h={9} />
      <Flaeche r={r} fill={f.sand[0]} x0={17.6} y0={0} x1={18.6} y1={18} />
      {[1.8, 4.8, 7.8, 10.8, 13.8].map((y) => (
        <Modulreihe key={y} r={r} f={f} x={1.5} y={y} z={Z} l={15} zellen={4} />
      ))}
      <Fluss f={f} points={r.pts([16.9, 2.6, Z + 0.1], [16.9, 15, Z + 0.1], [20, 15, Z + 0.1])} />
      <Container r={r} f={f} x={19.8} y={12.4} z={Z} b={2.6} t={2} h={1.8} tueren={1} />
      <Fluss f={f} points={r.pts([22.4, 13.4, Z + 0.1], [24.6, 13.4, Z + 0.1])} />
      <Baum r={r} f={f} x={24.6} y={4.5} z={Z} />
      <Baum r={r} f={f} x={24.4} y={8.6} z={Z} g={0.85} />
      <Baum r={r} f={f} x={3} y={16.9} z={Z} g={0.8} />
      <Mast r={r} f={f} x={24.8} y={13.4} z={Z} h={6} />
      <path d="M307 188Q392 214 478 182" fill="none" stroke={f.linie} strokeWidth="1" />
    </Illu>
  );
}

/** Agri-PV: hoch aufgeständerte Module über Ackerreihen, Hof mit PV-Dach. */
export function AgriPvFeld({ className, ton, animiert, titel }) {
  const { r, f } = buehne(ton);
  const streifen = [];
  for (let i = 0; i < 9; i++) streifen.push(linie(r, [1, 1.4 + i * 1.8, Z], [16.5, 1.4 + i * 1.8, Z]));
  const reihen = [2.4, 7.4, 12.4];
  const h = 3;
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Sonne f={f} x={92} y={74} />
      <Wolke f={f} x={330} y={56} />
      <Block r={r} x={0} y={0} b={26} t={18} h={Z} m={f.wiese} />
      <path d={streifen.join("")} stroke={f.d ? f.gruen[1] : f.gruen[2]} strokeWidth="2.5" strokeDasharray="1 5" />
      <Haus r={r} f={f} x={19} y={1.2} b={5.5} t={4} h={2.4} dh={1.6} pv />
      <Haus r={r} f={f} x={20} y={8} b={3} t={2.6} h={1.6} dh={1.1} />
      <Fluss f={f} points={r.pts([16, 14.4, Z + 0.1], [17.6, 14.4, Z + 0.1], [17.6, 5, Z + 0.1], [19, 5, Z + 0.1])} />
      {reihen.map((y) => (
        <g key={y}>
          <path
            d={[2, 8.5, 15].map((x) => linie(r, [x, y + 1.8, Z], [x, y + 1.8, Z + h + 0.2]) + linie(r, [x, y, Z], [x, y, Z + h + 0.8])).join("")}
            stroke={f.linie}
            strokeWidth="1.3"
          />
          <Modulreihe r={r} f={f} x={1.5} y={y} z={Z + h} l={14} t={1.8} h0={0.3} h1={0.9} zellen={4} beine={false} />
        </g>
      ))}
      <Baum r={r} f={f} x={24.4} y={13} z={Z} />
      <Baum r={r} f={f} x={24.8} y={16.6} z={Z} g={0.8} />
    </Illu>
  );
}

function Auto({ r, m, f, x, y }) {
  return (
    <g>
      <Block r={r} x={x} y={y} z={Z + 0.15} b={1.6} t={3.1} h={0.65} m={m} />
      <Block r={r} x={x + 0.15} y={y + 0.8} z={Z + 0.8} b={1.3} t={1.5} h={0.45} m={[f.glanz, f.modul[1], f.modul[2]]} />
    </g>
  );
}

/** Solarcarport: zwei Dächer mit Modulen, Speicher, Ladesäulen. */
export function Solarcarport({ className, ton, animiert, titel }) {
  const { r, f } = buehne(ton);
  const h = 2.6;
  const autos = [
    [2.4, 2.2, f.hell],
    [7.6, 2.2, f.modul],
    [5, 11, f.gruen],
    [12.8, 11, f.hell],
  ];
  const stuetzen = (y0, y1) => [2, 10, 18.4].map((x) => linie(r, [x, y1, Z], [x, y1, Z + h]) + linie(r, [x, y0, Z], [x, y0, Z + h + 0.9])).join("");
  const markierung = [];
  for (let j = 0; j < 8; j++) markierung.push(linie(r, [2 + j * 2.6, 1.8, Z], [2 + j * 2.6, 5.8, Z]), linie(r, [2 + j * 2.6, 10.6, Z], [2 + j * 2.6, 14.6, Z]));
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Sonne f={f} x={92} y={74} />
      <Wolke f={f} x={322} y={50} />
      <Block r={r} x={0} y={0} b={26} t={18} h={Z} m={f.wiese} />
      <Flaeche r={r} fill={f.d ? f.wiese[1] : f.hell[1]} x0={1} y0={1} x1={20} y1={17} />
      <path d={markierung.join("")} stroke={f.d ? f.k : f.hell[2]} strokeWidth="1.2" />
      <Block r={r} x={21} y={0.6} b={4.4} t={4.2} h={3.2} m={f.hell} />
      <Container r={r} f={f} x={21.4} y={7.2} b={2.8} t={1.8} h={1.8} tueren={2} m={f.gruen} />
      {autos.slice(0, 2).map(([x, y, m]) => (
        <Auto key={x + "a"} r={r} f={f} m={m} x={x} y={y} />
      ))}
      <path d={stuetzen(1.6, 6.4)} stroke={f.linie} strokeWidth="1.4" />
      <Modulreihe r={r} f={f} x={1.4} y={1.4} z={Z + h} l={17.6} t={5.2} h0={0} h1={0.9} zellen={6} beine={false} />
      {autos.slice(2).map(([x, y, m]) => (
        <Auto key={x + "b"} r={r} f={f} m={m} x={x} y={y} />
      ))}
      <path d={stuetzen(10.2, 15)} stroke={f.linie} strokeWidth="1.4" />
      <Modulreihe r={r} f={f} x={1.4} y={10} z={Z + h} l={17.6} t={5.2} h0={0} h1={0.9} zellen={6} beine={false} />
      <Fluss f={f} points={r.pts([19.4, 8.1, Z + 0.1], [21.4, 8.1, Z + 0.1])} />
      <Fluss f={f} points={r.pts([22.8, 9, Z + 0.1], [22.8, 16.4, Z + 0.1], [5, 16.4, Z + 0.1])} />
      {[5.6, 13.2].map((x) => (
        <Block key={x} r={r} x={x} y={15.6} z={Z} b={0.6} t={0.4} h={1.3} m={f.hell} />
      ))}
      <Baum r={r} f={f} x={24.6} y={12.5} z={Z} />
    </Illu>
  );
}

/** Großspeicher: Batteriecontainer, Trafo, Zaun, Netzanschluss. */
export function Grossspeicher({ className, ton, animiert, titel }) {
  const { r, f } = buehne(ton);
  const container = [];
  for (const y of [2.8, 7.6]) for (const x of [2.3, 7, 11.7]) container.push([x, y]);
  const [lx, ly] = r.p(9, 5, Z + 6.4);
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Sonne f={f} x={92} y={74} />
      <Wolke f={f} x={330} y={56} />
      <Block r={r} x={0} y={0} b={26} t={18} h={Z} m={f.wiese} />
      <Flaeche r={r} fill={f.sand[0]} x0={1.5} y0={1.5} x1={17.2} y1={16} />
      <Baum r={r} f={f} x={21} y={1.6} z={Z} />
      {container.map(([x, y]) => (
        <Container key={x + "-" + y} r={r} f={f} x={x} y={y} z={Z} b={4} t={1.8} h={2} />
      ))}
      <Fluss f={f} points={r.pts([16.2, 3.7, Z + 0.1], [16.2, 13.6, Z + 0.1], [15.6, 13.6, Z + 0.1])} />
      <Block r={r} x={12.4} y={12.4} z={Z} b={3.2} t={2.4} h={2} m={f.hell} />
      <path d={linie(r, [13.2, 13.4, Z + 2], [13.2, 13.4, Z + 2.7]) + linie(r, [14, 13.4, Z + 2], [14, 13.4, Z + 2.7]) + linie(r, [14.8, 13.4, Z + 2], [14.8, 13.4, Z + 2.7])} strokeWidth="1.2" />
      <polyline points={r.pts([17.4, 1.5, Z + 0.9], [17.4, 16.2, Z + 0.9], [1.5, 16.2, Z + 0.9])} fill="none" stroke={f.linie} strokeWidth="1" strokeDasharray="2 3" />
      <Fluss f={f} points={r.pts([15.6, 14.4, Z + 0.1], [22.6, 14.4, Z + 0.1])} langsam />
      <Mast r={r} f={f} x={22.6} y={14.4} z={Z} h={6.5} />
      <path d="M312 172Q396 196 478 166" fill="none" stroke={f.linie} strokeWidth="1" />
      <Baum r={r} f={f} x={24.4} y={6} z={Z} g={0.9} />
      <Baum r={r} f={f} x={24.6} y={9.6} z={Z} g={0.8} />
      <g className={s.schweben}>
        <rect x={lx - 26} y={ly - 13} width="52" height="26" rx="13" fill={f.hell[0]} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={lx - 17 + i * 9} y={ly - 5} width="6" height="10" rx="1.5" fill={i < 3 ? ILLU.gruenRechts : f.hell[2]} stroke="none" />
        ))}
      </g>
    </Illu>
  );
}

/** Energiegemeinschaft: Dorf mit PV-Dächern, Quartierspeicher, Energiefluss über die Straßen. */
export function EnergiegemeinschaftDorf({ className, ton, animiert, titel }) {
  const { r, f } = buehne(ton);
  const nord = [
    [2, 2.6, true],
    [6.8, 3, false],
    [15.4, 2.4, true],
  ];
  const sued = [
    [2.6, 12.2, false],
    [16, 11.8, true],
    [20.6, 12.4, true],
  ];
  const zweige = [
    ...nord.map(([x, y]) => linie(r, [x + 1.5, y + 2.4, Z + 0.05], [x + 1.5, 9.1, Z + 0.05])),
    ...sued.map(([x, y]) => linie(r, [x + 1.5, y + 1, Z + 0.05], [x + 1.5, 9.1, Z + 0.05])),
    linie(r, [21.9, 5.3, Z + 0.05], [21.9, 9.1, Z + 0.05]),
    linie(r, [9.2, 12, Z + 0.05], [9.2, 9.1, Z + 0.05]),
  ];
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Sonne f={f} x={92} y={74} />
      <Wolke f={f} x={300} y={46} verz />
      <Block r={r} x={0} y={0} b={26} t={18} h={Z} m={f.wiese} />
      <Windrad r={r} f={f} x={24.4} y={0.6} z={Z} h={8} />
      <Flaeche r={r} fill={f.sand[0]} x0={0} y0={8.6} x1={26} y1={9.6} />
      <Flaeche r={r} fill={f.sand[0]} x0={12} y0={0} x1={13} y1={18} />
      <Fluss f={f} d={zweige.join("") + linie(r, [0.5, 9.1, Z + 0.05], [25.5, 9.1, Z + 0.05]) + linie(r, [12.5, 0.5, Z + 0.05], [12.5, 17.5, Z + 0.05])} langsam />
      {nord.map(([x, y, pv]) => (
        <Haus key={x} r={r} f={f} x={x} y={y} z={Z} pv={pv} fenster={false} />
      ))}
      <Container r={r} f={f} x={20.4} y={3.6} z={Z} b={3} t={1.7} h={1.7} tueren={2} m={f.gruen} />
      <Block r={r} x={8.4} y={12.6} z={Z} b={1.1} t={1.1} h={4.2} m={f.hell} />
      <Haus r={r} f={f} x={7.4} y={12} z={Z} b={3.6} t={3} h={2.2} dh={1.3} pv />
      {sued.map(([x, y, pv]) => (
        <Haus key={x} r={r} f={f} x={x} y={y} z={Z} pv={pv} fenster={false} />
      ))}
      <Baum r={r} f={f} x={24.6} y={16.6} z={Z} g={0.85} />
    </Illu>
  );
}

/** Investoren-Dashboard (abstrakt): schwebende Karten mit Balken, Verlauf, Quote. */
export function InvestorenDashboard({ className, ton, animiert, titel }) {
  const r = raum(10, [205, 84]);
  const f = farben(ton);
  const H = 0.6;
  const balken = [1.2, 2, 1.6, 2.8, 3.4, 4.2];
  const verlauf = [3.6, 2.9, 3.2, 2.2, 2.4, 1.4, 0.9];
  const zB = 4.6;
  const kpi = r.p(4.5, 3.2, 3.6);
  const endpunkt = r.p(13.8 + 6 * 1.15, 1.6 + verlauf[6], zB + 0.4);
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Wolke f={f} x={380} y={70} g={0.8} />
      <Koerper q={r.q(0, 0, 0, 22, 14, H)} m={f.d ? [f.wiese[0], f.wiese[1], f.wiese[2]] : f.hell} />
      <path d={linie(r, [1.5, 8.5, H], [11, 8.5, H]) + linie(r, [1.5, 13, H], [11, 13, H])} stroke={f.d ? f.k : f.hell[2]} strokeWidth="1" />
      {balken.map((h, i) => (
        <Block key={i} r={r} x={1.8 + i * 1.5} y={10.6} z={H} b={1} t={1} h={h} m={i === balken.length - 1 ? f.gruen : f.modul} />
      ))}
      <Modulreihe r={r} f={f} x={13} y={9.4} z={H} l={7.5} t={1.6} zellen={3} />
      <g className={s.schweben}>
        <Fluss f={f} points={r.pts([5, 4.2, 3.2], [5, 4.2, H])} breite={1.5} />
        <Block r={r} x={1.6} y={1.2} z={3.2} b={6.4} t={4.2} h={0.4} m={f.modul} />
        <ellipse cx={kpi[0] + 14} cy={kpi[1] + 6} rx="16" ry="9.2" fill="none" stroke={f.modul[2]} strokeWidth="3.5" />
        <ellipse cx={kpi[0] + 14} cy={kpi[1] + 6} rx="16" ry="9.2" fill="none" stroke={f.strom} strokeWidth="3.5" strokeDasharray="56 100" />
        <path d={linie(r, [2.4, 2, 3.6], [5.6, 2, 3.6]) + linie(r, [2.4, 3, 3.6], [4.4, 3, 3.6])} stroke={f.hell[0]} strokeWidth="2" />
      </g>
      <g className={`${s.schweben} ${s.verz}`}>
        <Fluss f={f} points={r.pts([17, 5, zB], [17, 5, H])} breite={1.5} langsam />
        <Block r={r} x={13} y={1} z={zB} b={8.6} t={5.4} h={0.4} m={f.hell} />
        <polyline points={r.pts(...verlauf.map((v, i) => [13.8 + i * 1.15, 1.6 + v, zB + 0.4]))} fill="none" stroke={f.strom} strokeWidth="2.2" />
        <circle cx={endpunkt[0]} cy={endpunkt[1]} r="4" fill={f.sonne} />
      </g>
    </Illu>
  );
}

/** Netzanschluss: Solarpark speist über Umspannwerk ins Hochspannungsnetz. */
export function Netzanschluss({ className, ton, animiert, titel }) {
  const { r, f } = buehne(ton);
  const trafos = [3.4, 8];
  const portal = linie(r, [19.4, 3, Z], [19.4, 3, Z + 4.6]) + linie(r, [19.4, 11, Z], [19.4, 11, Z + 4.6]) + linie(r, [19.4, 3, Z + 4.6], [19.4, 11, Z + 4.6]);
  const [px, py] = r.p(19.4, 7, Z + 4.6);
  const [mx, my] = r.p(24.4, 15.4, Z + 7 * 0.78);
  return (
    <Illu viewBox={VB} className={className} ton={ton} animiert={animiert} titel={titel}>
      <Sonne f={f} x={92} y={74} />
      <Wolke f={f} x={320} y={44} />
      <Block r={r} x={0} y={0} b={26} t={18} h={Z} m={f.wiese} />
      <Flaeche r={r} fill={f.sand[0]} x0={11.4} y0={1.6} x1={21.6} y1={12.6} />
      {[1.8, 5.2, 8.6].map((y) => (
        <Modulreihe key={y} r={r} f={f} x={1.2} y={y} z={Z} l={8} zellen={2} />
      ))}
      <Fluss f={f} points={r.pts([9.6, 2.6, Z + 0.1], [9.6, 13.6, Z + 0.1], [14.6, 13.6, Z + 0.1], [14.6, 10.6, Z + 0.1])} />
      {trafos.map((y) => (
        <g key={y}>
          <Block r={r} x={13} y={y} z={Z} b={2.8} t={2.4} h={2.1} m={f.hell} />
          <path d={[13.6, 14.4, 15.2].map((x) => linie(r, [x, y + 1.2, Z + 2.1], [x, y + 1.2, Z + 2.9])).join("")} strokeWidth="1.3" />
        </g>
      ))}
      <path d={portal} stroke={f.linie} strokeWidth="1.6" />
      <Fluss f={f} d={linie(r, [15.8, 4.6, Z + 1.6], [19.4, 4.6, Z + 4.6]) + linie(r, [15.8, 9.2, Z + 1.6], [19.4, 9.2, Z + 4.6])} langsam />
      <polyline points={r.pts([21.8, 1.6, Z + 0.9], [21.8, 12.8, Z + 0.9], [11.2, 12.8, Z + 0.9])} fill="none" stroke={f.linie} strokeWidth="1" strokeDasharray="2 3" />
      <Mast r={r} f={f} x={24.4} y={15.4} z={Z} h={7} />
      <path d={`M${px} ${py}Q${(px + mx) / 2} ${Math.max(py, my) + 14} ${mx} ${my}M${mx} ${my}Q${(mx + 478) / 2} ${my + 18} 478 ${my - 10}`} fill="none" stroke={f.linie} strokeWidth="1" />
      <Baum r={r} f={f} x={2.4} y={14.6} z={Z} />
      <Baum r={r} f={f} x={6} y={16.4} z={Z} g={0.85} />
    </Illu>
  );
}

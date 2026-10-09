// Hero-Bühne /solarcarport: isometrischer Parkplatz mit Solarcarport-Reihe und Ladepunkten + zwei Karten
import { PlugZap, Sun } from "lucide-react";
import { isoProjektion, quader } from "@/components/Energie/Seite/iso";
import f from "@/components/Energie/fluss.module.css";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/** Sprachmodell: Texte der Bühne (Zahlen kommen formatiert von der Seite). */
const W = {
  de: {
    stellplaetze: "100 Stellplätze",
    beispiel: "Beispiel",
    leistung: "Leistung",
    ertrag: "Ertrag pro Jahr",
    quelle: "Werte aus dem Carport-Rechner (Süd-DE)",
    last: "Lastmanagement",
    lastText: "Solarstrom zuerst, Netzanschluss nicht überlasten",
    ladepunkt: (n) => `Ladepunkt ${n}`,
  },
  en: {
    stellplaetze: "100 parking spaces",
    beispiel: "Example",
    leistung: "Capacity",
    ertrag: "Yield per year",
    quelle: "Figures from the carport calculator (southern DE)",
    last: "Load management",
    lastText: "Solar power first, without overloading the grid connection",
    ladepunkt: (n) => `Charger ${n}`,
  },
};

// Bewegung (einmalig beim Laden): Solarstrom läuft vom Dach zu den drei Ladesäulen, danach füllen sich die
// Ladepunkte im Lastmanagement – erst Solar, dann das Netz. Reduziert: sofort im Endzustand.

const { p, pts } = isoProjektion({ s: 34, ox: 250, oy: 70 });

const FARBEN = ["#1f5aa1", "#e8edf3", "#669933", "#97a0b0", "#ffc53d", "#e8edf3", "#4a7cbd", "#c4cad5", "#558227", "#97a0b0"];

function Auto({ x, y, farbe }) {
  const unten = quader(pts, x, y, 0.08, 0.78, 1.5, 0.42);
  const oben = quader(pts, x + 0.08, y + 0.35, 0.5, 0.62, 0.8, 0.32);
  return (
    <g>
      <polygon points={unten.links} fill={farbe} opacity="0.78" />
      <polygon points={unten.rechts} fill={farbe} opacity="0.62" />
      <polygon points={unten.oben} fill={farbe} />
      <polygon points={oben.links} fill="#0b2a52" opacity="0.85" />
      <polygon points={oben.rechts} fill="#0b2a52" opacity="0.7" />
      <polygon points={oben.oben} fill={farbe} />
    </g>
  );
}

function Saeule({ x, y }) {
  const f = quader(pts, x, y, 0, 0.22, 0.22, 0.95);
  const [sx, sy] = p(x + 0.11, y + 0.22, 0.72);
  return (
    <g>
      <polygon points={f.links} fill="#e8edf3" />
      <polygon points={f.rechts} fill="#c4cfdc" />
      <polygon points={f.oben} fill="#ffffff" />
      <rect x={sx - 3} y={sy - 3} width="6" height="7" rx="1.5" fill="#8cba58" />
    </g>
  );
}

function Szene() {
  const reiheHinten = [0.7, 1.75, 2.8, 3.85, 4.9, 5.95, 7.0, 8.05, 9.1, 10.15];
  const reiheVorne = [0.7, 1.75, 3.85, 4.9, 7.0, 9.1, 10.15];
  // Dach: hinten höher (z 2.55), vorne 2.05
  const dach = pts([0.3, 0.6, 2.55], [11.2, 0.6, 2.55], [11.2, 2.9, 2.05], [0.3, 2.9, 2.05]);
  const modulX = Array.from({ length: 12 }, (_, i) => 0.3 + (i + 1) * 0.908);
  return (
    <svg viewBox="0 0 640 440" className="h-auto w-full" aria-hidden="true">
      <defs>
        <radialGradient id="cp-sonne" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd873" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd873" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cp-dach" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2b6cb8" />
          <stop offset="100%" stopColor="#0b4488" />
        </linearGradient>
      </defs>
      <circle cx="96" cy="86" r="76" fill="url(#cp-sonne)" />
      <circle cx="96" cy="86" r="15" fill="#ffd873" opacity="0.92" />

      {/* Parkfläche */}
      <polygon points={pts([0, 0, 0], [11.6, 0, 0], [11.6, 6.4, 0], [0, 6.4, 0])} fill="#10294d" stroke="rgba(174,208,131,0.3)" />
      {/* Fahrgasse */}
      <polygon points={pts([0, 3.05, 0], [11.6, 3.05, 0], [11.6, 4.35, 0], [0, 4.35, 0])} fill="#0c2141" />
      {[...Array(12)].map((_, i) => {
        const x = 0.6 + i * 1.05;
        const a = p(x, 0.5, 0);
        const b = p(x, 2.9, 0);
        const c = p(x, 4.5, 0);
        const d = p(x, 6.2, 0);
        return (
          <g key={i} stroke="rgba(255,255,255,0.22)" strokeWidth="1">
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
            <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
          </g>
        );
      })}
      {/* Pfeil Fahrgasse */}
      {(() => {
        const a = p(4.5, 3.7, 0);
        const b = p(7, 3.7, 0);
        return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="6 6" />;
      })()}

      {/* Autos unter dem Carport */}
      {reiheHinten.map((x, i) => (
        <Auto key={x} x={x + 0.1} y={0.95} farbe={FARBEN[i]} />
      ))}
      {/* Stützen */}
      {[0.9, 3.95, 7.0, 10.05].map((x) => {
        const hb = p(x, 0.8, 0);
        const ht = p(x, 0.8, 2.5);
        const vb = p(x, 2.7, 0);
        const vt = p(x, 2.7, 2.08);
        return (
          <g key={x} stroke="#b9c4d2" strokeWidth="4" strokeLinecap="round">
            <line x1={hb[0]} y1={hb[1]} x2={ht[0]} y2={ht[1]} />
            <line x1={vb[0]} y1={vb[1]} x2={vt[0]} y2={vt[1]} />
          </g>
        );
      })}
      {/* Solardach */}
      <polygon points={dach} fill="url(#cp-dach)" stroke="#7fa7d6" strokeWidth="1.2" />
      {modulX.map((x) => {
        const a = p(x, 0.6, 2.55);
        const b = p(x, 2.9, 2.05);
        return <line key={x} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(178,203,233,0.55)" strokeWidth="1" />;
      })}
      {(() => {
        const a = p(0.3, 1.75, 2.3);
        const b = p(11.2, 1.75, 2.3);
        return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(178,203,233,0.55)" strokeWidth="1" />;
      })()}
      {/* Glanz */}
      <polygon points={pts([0.3, 0.6, 2.55], [3.2, 0.6, 2.55], [2.2, 2.9, 2.05], [0.3, 2.9, 2.05])} fill="#ffffff" opacity="0.07" />

      {/* Ladesäulen vorne am Carport */}
      {[1.65, 4.75, 7.85].map((x) => (
        <Saeule key={x} x={x} y={2.92} />
      ))}
      {/* Impulse: Solarstrom vom Dach zu den Ladesäulen */}
      <g className="ov-sofort" style={{ "--fluss-start": "700ms", "--fluss-schritt": "180ms", "--fluss-dauer": "1300ms" }}>
        {[1.65, 4.75, 7.85].map((x, i) => {
          const a = p(x + 0.11, 2.2, 2.2);
          const b = p(x + 0.11, 2.92, 0.95);
          return <path key={x} d={`M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`} pathLength="1" className={f.impuls} stroke="#ffd873" strokeWidth="3" style={{ "--i": i }} />;
        })}
      </g>

      {/* offene Reihe vorne */}
      {reiheVorne.map((x, i) => (
        <Auto key={`v${x}`} x={x + 0.1} y={4.6} farbe={FARBEN[(i + 4) % FARBEN.length]} />
      ))}

      {/* Bäume */}
      {[
        [12.4, 1.2],
        [12.6, 4.4],
      ].map(([x, y]) => {
        const [bx, by] = p(x, y, 0);
        return (
          <g key={x + y}>
            <rect x={bx - 2} y={by - 30} width="4" height="30" fill="#5b4a2c" />
            <circle cx={bx} cy={by - 40} r="18" fill="#558227" />
            <circle cx={bx - 6} cy={by - 46} r="10" fill="#8cba58" opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

export default function HeroBuehne({ kwp, mwh }) {
  const w = uebersetze(W, spracheDerAnfrage());
  return (
    <div className="relative">
      <div className="relative sm:pb-10 sm:pt-14">
        <Szene />
      </div>

      <div className="relative -mt-4 rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:w-[46%] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-500">
            <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-500" /> {w.stellplaetze}
          </p>
          <span className="rounded-full bg-sun-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sun-700 ring-1 ring-sun-200">{w.beispiel}</span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[12px] text-ink-500">{w.leistung}</dt>
            <dd className="ov-num font-display text-[22px] font-extrabold leading-tight tracking-tight">≈ {kwp} kWp</dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-500">{w.ertrag}</dt>
            <dd className="ov-num font-display text-[22px] font-extrabold leading-tight tracking-tight">≈ {mwh} MWh</dd>
          </div>
        </dl>
        <p className="mt-2 text-[11.5px] text-ink-500">{w.quelle}</p>
      </div>

      <div className="relative mt-3 rounded-2xl bg-navy-900/85 p-4 text-white shadow-e4 ring-1 ring-white/15 backdrop-blur-md sm:absolute sm:bottom-0 sm:left-0 sm:mt-0 sm:w-[50%]">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-300">
          <PlugZap aria-hidden="true" className="h-3.5 w-3.5" /> {w.last}
        </p>
        <p className="mt-1 text-[13px] text-white/75">{w.lastText}</p>
        <div className="ov-sofort mt-3 space-y-2" aria-hidden="true" style={{ "--ov-delay": "1300ms" }}>
          {[
            [w.ladepunkt(1), 0.82, "bg-ov-400"],
            [w.ladepunkt(2), 0.55, "bg-ov-400"],
            [w.ladepunkt(3), 0.3, "bg-navy-300"],
          ].map(([l, anteil, farbe], i) => (
            <div key={l} className="flex items-center gap-3 text-[11.5px] text-white/65">
              <span className="w-[4.5rem] shrink-0">{l}</span>
              <span className="h-1.5 flex-1 rounded-full bg-white/10">
                <span className={`ov-balken-x block h-full rounded-full ${farbe}`} style={{ width: `${anteil * 100}%`, "--i": i * 3 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

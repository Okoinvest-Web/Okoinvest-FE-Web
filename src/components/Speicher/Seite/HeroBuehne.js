// Hero-Bühne /grossspeicher: isometrischer Speicherpark am Solarpark + zwei Leitstand-Karten (fiktive Beispielwerte)
// Bewegung (einmalig beim Laden, ov-sofort): Mittagsstrom fließt vom Solarpark in die Container, der Fahrplan
// zeichnet sich, der Ladezustand füllt sich auf 72 %. Danach Ruhe; reduziert: alles sofort im Endzustand.
import { BatteryCharging, Sun } from "lucide-react";
import { isoProjektion, quader } from "@/components/Energie/Seite/iso";
import Zaehler from "@/components/motion/Zaehler";
import f from "@/components/Energie/fluss.module.css";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const W = {
  de: { fahrplan: "Fahrplan heute", beispiel: "Beispiel", fahrText: "Börsenpreis und Fahrweise, schematisch", laden: "Laden 11–15 Uhr", entladen: "Entladen 18–21 Uhr", ladezustand: "Ladezustand", mittag: "lädt aus der Mittagsspitze", zahlen: "de-DE" },
  en: { fahrplan: "Today’s schedule", beispiel: "Example", fahrText: "Exchange price and operation, schematic", laden: "Charge 11 am–3 pm", entladen: "Discharge 6–9 pm", ladezustand: "State of charge", mittag: "charging from the midday peak", zahlen: "en-GB" },
};

const { p, pts } = isoProjektion({ s: 36, ox: 214, oy: 118 });

const CONTAINER = [
  [1.2, 1.0],
  [4.9, 1.0],
  [1.2, 3.0],
  [4.9, 3.0],
];
const PCS = [
  [8.8, 1.15],
  [8.8, 3.15],
];

function Container({ x, y, i }) {
  const w = 3.2;
  const d = 1.15;
  const h = 1.15;
  const f = quader(pts, x, y, 0, w, d, h);
  const rippen = Array.from({ length: 9 }, (_, k) => x + 0.25 + k * 0.34);
  return (
    <g>
      <polygon points={f.links} fill="#c4cfdc" />
      <polygon points={f.rechts} fill="#9fb0c4" />
      <polygon points={f.oben} fill="#eef2f7" />
      {rippen.map((rx) => (
        <line key={rx} x1={p(rx, y + d, 0.08)[0]} y1={p(rx, y + d, 0.08)[1]} x2={p(rx, y + d, h - 0.08)[0]} y2={p(rx, y + d, h - 0.08)[1]} stroke="#aebbcb" strokeWidth="1" />
      ))}
      {/* Statusleiste */}
      <polygon points={pts([x + 0.2, y + d, h - 0.22], [x + 1.4, y + d, h - 0.22], [x + 1.4, y + d, h - 0.3], [x + 0.2, y + d, h - 0.3])} fill={i === 1 ? "#ffc53d" : "#8cba58"} />
      {/* Lüfter oben */}
      <polygon points={pts([x + 2.3, y + 0.25, h], [x + 2.9, y + 0.25, h], [x + 2.9, y + 0.85, h], [x + 2.3, y + 0.85, h])} fill="#d3dbe6" />
    </g>
  );
}

function Kasten({ x, y, w, d, h, farben = ["#5b6b82", "#43526a", "#7b8aa0"] }) {
  const f = quader(pts, x, y, 0, w, d, h);
  return (
    <g>
      <polygon points={f.links} fill={farben[0]} />
      <polygon points={f.rechts} fill={farben[1]} />
      <polygon points={f.oben} fill={farben[2]} />
    </g>
  );
}

function Modulreihe({ x0, x1, y }) {
  const felder = [];
  for (let x = x0; x < x1 - 0.1; x += 0.9) felder.push(x);
  return (
    <g>
      {felder.map((x) => (
        <polygon key={x} points={pts([x, y + 0.7, 0.25], [x + 0.82, y + 0.7, 0.25], [x + 0.82, y, 0.75], [x, y, 0.75])} fill="#1f5aa1" stroke="#4a7cbd" strokeWidth="0.8" />
      ))}
    </g>
  );
}

function Szene() {
  const boden = pts([0, 0, 0], [12.4, 0, 0], [12.4, 5.2, 0], [0, 5.2, 0]);
  const zaun = [
    [0, 0],
    [12.4, 0],
    [12.4, 5.2],
    [0, 5.2],
  ];
  // Kabelweg: Container → PCS → Trafo → Netz
  const kabel = [p(8.1, 2.6, 0.02), p(10.6, 2.6, 0.02), p(10.6, 4.4, 0.02)];
  const mast = p(13.4, 4.4, 0);
  // Wege für die Lade-Impulse: von den Modulreihen hinunter zu den Containern
  const sonnenwege = [
    [p(2.6, -1.1, 0.5), p(2.8, 1.0, 1.15)],
    [p(6.3, -1.1, 0.5), p(6.5, 1.0, 1.15)],
  ].map(([a, b]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  const mastSpitze = p(13.4, 4.4, 3.2);
  return (
    <svg viewBox="0 0 640 450" className="h-auto w-full" aria-hidden="true">
      <defs>
        <radialGradient id="gs-sonne" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffd873" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd873" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gs-boden" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#13305a" />
          <stop offset="100%" stopColor="#0a2146" />
        </linearGradient>
      </defs>
      <circle cx="104" cy="92" r="78" fill="url(#gs-sonne)" />
      <circle cx="104" cy="92" r="15" fill="#ffd873" opacity="0.9" />

      {/* Solarpark dahinter (Co-Location) */}
      <polygon points={pts([-0.6, -3.7, 0], [9.6, -3.7, 0], [9.6, -0.5, 0], [-0.6, -0.5, 0])} fill="#0d2850" opacity="0.8" />
      {[-3.4, -2.4, -1.4].map((y) => (
        <Modulreihe key={y} x0={-0.3} x1={9.4} y={y} />
      ))}

      {/* Betriebsfläche */}
      <polygon points={boden} fill="url(#gs-boden)" stroke="rgba(174,208,131,0.35)" strokeWidth="1" />
      {zaun.map(([x, y], i) => {
        const [nx, ny] = zaun[(i + 1) % zaun.length];
        const a = p(x, y, 0.45);
        const b = p(nx, ny, 0.45);
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 4" />;
      })}

      {/* Kabelweg mit Fluss */}
      <polyline points={kabel.map((k) => k.join(",")).join(" ")} fill="none" stroke="#8cba58" strokeWidth="2" strokeOpacity="0.5" />
      {/* Impulse: Mittagsstrom vom Solarpark in die Container (laden) */}
      <g className="ov-sofort" style={{ "--fluss-start": "650ms", "--fluss-schritt": "260ms", "--fluss-dauer": "1700ms" }}>
        {sonnenwege.map((d, i) => (
          <path key={i} d={d} pathLength="1" className={f.impuls} stroke="#ffd873" strokeWidth="3.2" style={{ "--i": i }} />
        ))}
      </g>
      <polyline points={[p(10.6, 4.4, 0.02), p(13.4, 4.4, 0.02)].map((k) => k.join(",")).join(" ")} fill="none" stroke="#8cba58" strokeWidth="2" strokeOpacity="0.35" strokeDasharray="4 5" />

      {CONTAINER.map(([x, y], i) => (
        <Container key={i} x={x} y={y} i={i} />
      ))}
      {PCS.map(([x, y]) => (
        <Kasten key={y} x={x} y={y} w={1.1} d={0.9} h={0.95} />
      ))}
      {/* Transformator */}
      <Kasten x={10.1} y={3.9} w={1.3} d={1} h={1.25} farben={["#3f6a2a", "#2f5220", "#669933"]} />
      {[0.3, 0.65, 1.0].map((dx) => {
        const a = p(10.1 + dx, 4.4, 1.25);
        return <rect key={dx} x={a[0] - 2} y={a[1] - 12} width="4" height="12" rx="2" fill="#cde3b1" />;
      })}

      {/* Netz: Mast */}
      <line x1={mast[0]} y1={mast[1]} x2={mastSpitze[0]} y2={mastSpitze[1]} stroke="#7fa7d6" strokeWidth="2.5" />
      <line x1={mastSpitze[0] - 18} y1={mastSpitze[1] + 14} x2={mastSpitze[0] + 18} y2={mastSpitze[1] + 14} stroke="#7fa7d6" strokeWidth="2" />
      <line x1={mastSpitze[0] - 12} y1={mastSpitze[1] + 30} x2={mastSpitze[0] + 12} y2={mastSpitze[1] + 30} stroke="#7fa7d6" strokeWidth="2" />
      <path d={`M${mastSpitze[0] + 18},${mastSpitze[1] + 14} q 30 14 60 4`} fill="none" stroke="#7fa7d6" strokeOpacity="0.6" />
    </svg>
  );
}

function Fahrplan() {
  const W = 300;
  const H = 104;
  const x = (h) => 6 + (h / 24) * (W - 12);
  const preis = [0.45, 0.42, 0.4, 0.4, 0.42, 0.52, 0.7, 0.82, 0.74, 0.55, 0.36, 0.22, 0.12, 0.1, 0.14, 0.26, 0.45, 0.72, 0.95, 1.0, 0.88, 0.7, 0.58, 0.5, 0.46];
  const y = (v) => 10 + (1 - v) * 58;
  const pfad = preis.map((v, h) => `${h ? "L" : "M"}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ov-sofort h-auto w-full" aria-hidden="true" style={{ "--ov-delay": "420ms" }}>
      <rect x={x(11)} y="6" width={x(15) - x(11)} height="68" rx="6" fill="#4a7cbd" fillOpacity="0.18" />
      <rect x={x(18)} y="6" width={x(21) - x(18)} height="68" rx="6" fill="#8cba58" fillOpacity="0.2" />
      <line x1="6" x2={W - 6} y1="74" y2="74" stroke="rgba(255,255,255,0.15)" />
      <path d={`${pfad} L${x(24)},74 L${x(0)},74 Z`} fill="#aed083" fillOpacity="0.08" className="ov-flaeche-ein" />
      <path d={pfad} pathLength="1" className="ov-linie" fill="none" stroke="#aed083" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(19)} cy={y(1)} r="4" fill="#aed083" stroke="#03122b" strokeWidth="2" className={f.pop} style={{ "--ov-delay": "1250ms", transformBox: "fill-box", transformOrigin: "center" }} />
      {[0, 6, 12, 18, 24].map((h) => (
        <text key={h} x={x(h)} y="94" textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} fill="rgba(255,255,255,0.55)" fontSize="10">
          {String(h).padStart(2, "0")}
        </text>
      ))}
    </svg>
  );
}

export default function HeroBuehne() {
  const w = uebersetze(W, spracheDerAnfrage());
  return (
    <div className="relative">
      <div className="relative sm:pr-6 sm:pt-16 lg:pt-20">
        <Szene />
      </div>

      {/* Karte: Fahrplan heute */}
      <div className="relative -mt-6 rounded-2xl bg-navy-900/80 p-4 shadow-e4 ring-1 ring-white/15 backdrop-blur-md sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:w-[54%] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">{w.fahrplan}</p>
          <span className="rounded-full bg-sun-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sun-300 ring-1 ring-sun-400/30">{w.beispiel}</span>
        </div>
        <p className="mt-1 text-[13px] text-white/70">{w.fahrText}</p>
        <div className="mt-3">
          <Fahrplan />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-400/20 px-2.5 py-1 text-navy-100 ring-1 ring-navy-300/30">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-navy-400" /> {w.laden}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-500/20 px-2.5 py-1 text-ov-100 ring-1 ring-ov-400/30">
            <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-ov-400" /> {w.entladen}
          </span>
        </div>
      </div>

      {/* Karte: Ladezustand */}
      <div className="relative mt-3 flex items-center gap-4 rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:absolute sm:bottom-2 sm:left-0 sm:mt-0 sm:w-[46%]">
        <svg viewBox="0 0 48 48" className="ov-sofort h-14 w-14 shrink-0 -rotate-90" aria-hidden="true" style={{ "--ov-delay": "700ms" }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="#e6f1d8" strokeWidth="5" />
          <circle cx="24" cy="24" r="20" pathLength="1" className="ov-ring-wert" fill="none" stroke="#669933" strokeWidth="5" strokeLinecap="round" style={{ "--ov-p": 0.72 }} />
        </svg>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-500">
            <BatteryCharging aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" /> {w.ladezustand}
          </p>
          <p className="ov-num font-display text-[24px] font-extrabold leading-none tracking-tight">
            <Zaehler wert={72} nach=" %" verzoegerung={700} dauer={1100} sprache={w.zahlen} className="[&>span:last-child]:text-left" />
          </p>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-600">
            <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-500" /> {w.mittag}
          </p>
        </div>
      </div>
    </div>
  );
}

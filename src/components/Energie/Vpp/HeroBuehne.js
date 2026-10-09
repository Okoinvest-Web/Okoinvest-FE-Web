// Hero-Bühne /virtuelles-kraftwerk: Verbund als Konstellation (Leitwarte im Zentrum) + echtes Live-Signal
import { BatteryCharging, Car, Factory, Network, Sprout, Store, Sun, Zap } from "lucide-react";
import VppLiveSignal from "@/components/Energie/VppLiveSignal";
import f from "@/components/Energie/fluss.module.css";
import { spracheDerAnfrage } from "@/lib/land/seite";

/** Sprachmodell: Beschriftungen der Knoten (ids wie KNOTEN). */
const LABEL_EN = { park: "Solar park", agri: "Agrivoltaics", carport: "Carport", speicher: "Storage", industrie: "Industry", handel: "Retail", boerse: "Exchange & grid" };

// Bewegung (einmalig beim Laden): Die Verbindungen zeichnen sich von der Leitwarte aus, dann laufen drei
// Impulse von den Erzeugern und dem Speicher in die Leitwarte und weiter zu Handel, Industrie und Börse –
// „viele Anlagen, ein Kraftwerk“. Die Leitwarte leuchtet beim Eintreffen kurz auf. Danach Ruhe.
// Reduzierte Bewegung / ohne JS: Linien stehen sofort, keine Impulse.
const ERZEUGER = ["park", "agri", "carport", "speicher"];

const KNOTEN = [
  { id: "park", label: "Solarpark", icon: Sun, x: 92, y: 92, ton: "sonne" },
  { id: "agri", label: "Agri-PV", icon: Sprout, x: 60, y: 210, ton: "sonne" },
  { id: "carport", label: "Carport", icon: Car, x: 128, y: 318, ton: "sonne" },
  { id: "speicher", label: "Speicher", icon: BatteryCharging, x: 320, y: 352, ton: "gruen" },
  { id: "industrie", label: "Industrie", icon: Factory, x: 520, y: 290, ton: "navy" },
  { id: "handel", label: "Handel", icon: Store, x: 560, y: 160, ton: "navy" },
  { id: "boerse", label: "Börse & Netz", icon: Zap, x: 330, y: 44, ton: "weiss" },
];
const HUB = { x: 320, y: 200 };

const TOENE = {
  sonne: { ring: "#ffc53d", fill: "rgba(255,197,61,0.14)", text: "text-sun-300", strich: "#ffc53d" },
  gruen: { ring: "#8cba58", fill: "rgba(140,186,88,0.16)", text: "text-ov-300", strich: "#8cba58" },
  navy: { ring: "#7fa7d6", fill: "rgba(127,167,214,0.14)", text: "text-navy-200", strich: "#7fa7d6" },
  weiss: { ring: "rgba(255,255,255,0.6)", fill: "rgba(255,255,255,0.08)", text: "text-white", strich: "rgba(255,255,255,0.55)" },
};

export default function HeroBuehne({ live }) {
  const en = spracheDerAnfrage() === "en";
  return (
    <div className="relative">
      <div className="relative" aria-hidden="true">
        <svg viewBox="0 0 640 410" className="h-auto w-full">
          <defs>
            <radialGradient id="vk-hub" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#8cba58" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8cba58" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[150, 105].map((r) => (
            <circle key={r} cx={HUB.x} cy={HUB.y} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeDasharray="2 6" />
          ))}
          <g className="ov-sofort">
            {KNOTEN.map((k, i) => (
              <path key={k.id} d={`M${HUB.x} ${HUB.y} L${k.x} ${k.y}`} pathLength="1" className="ov-linie" stroke={TOENE[k.ton].strich} strokeOpacity="0.45" strokeWidth="2" style={{ "--ov-delay": `${250 + i * 70}ms` }} />
            ))}
          </g>
          {/* Impulse: Erzeuger → Leitwarte, dann Leitwarte → Abnehmer und Markt */}
          <g className="ov-sofort" style={{ "--fluss-start": "1100ms", "--fluss-dauer": "1600ms", "--fluss-schritt": "90ms" }}>
            {KNOTEN.filter((k) => ERZEUGER.includes(k.id)).map((k, i) => (
              <path key={k.id} d={`M${k.x} ${k.y} L${HUB.x} ${HUB.y}`} pathLength="1" className={f.impuls} stroke={TOENE[k.ton].strich} strokeWidth="4" style={{ "--i": i }} />
            ))}
          </g>
          <g className="ov-sofort" style={{ "--fluss-start": "1900ms", "--fluss-dauer": "1600ms", "--fluss-schritt": "110ms" }}>
            {KNOTEN.filter((k) => !ERZEUGER.includes(k.id)).map((k, i) => (
              <path key={k.id} d={`M${HUB.x} ${HUB.y} L${k.x} ${k.y}`} pathLength="1" className={f.impuls} stroke={k.ton === "weiss" ? "#ffffff" : "#b2cbe9"} strokeWidth="4" style={{ "--i": i }} />
            ))}
          </g>
          <circle cx={HUB.x} cy={HUB.y} r="80" fill="url(#vk-hub)" />
          <g className="ov-sofort" style={{ "--fluss-start": "1100ms", "--fluss-dauer": "1600ms", "--fluss-schritt": "0ms" }}>
            <circle cx={HUB.x} cy={HUB.y} r="56" fill="none" stroke="#aed083" strokeWidth="2" className={f.leuchten} />
          </g>
          <circle cx={HUB.x} cy={HUB.y} r="42" fill="#03122b" stroke="#8cba58" strokeWidth="3" />
          <circle cx={HUB.x} cy={HUB.y} r="52" fill="none" stroke="#8cba58" strokeOpacity="0.35" strokeWidth="2" />
          {KNOTEN.map((k) => (
            <g key={k.id}>
              <circle cx={k.x} cy={k.y} r="27" fill="#061a3a" />
              <circle cx={k.x} cy={k.y} r="27" fill={TOENE[k.ton].fill} stroke={TOENE[k.ton].ring} strokeWidth="2" />
            </g>
          ))}
        </svg>
        {/* Icons und Beschriftung als HTML (scharf, skaliert mit) */}
        <div className="absolute inset-0">
          <span className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${(HUB.x / 640) * 100}%`, top: `${(HUB.y / 410) * 100}%` }}>
            <Network className="h-6 w-6 text-ov-300 sm:h-7 sm:w-7" />
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-ov-500 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white sm:text-[11.5px]"
            style={{ left: `${(HUB.x / 640) * 100}%`, top: `${((HUB.y + 58) / 410) * 100}%` }}
          >
            {en ? "Control centre" : "Leitwarte"}
          </span>
          {KNOTEN.map((k) => (
            <span key={k.id}>
              <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(k.x / 640) * 100}%`, top: `${(k.y / 410) * 100}%` }}>
                <k.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${TOENE[k.ton].text}`} />
              </span>
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10.5px] font-semibold text-white/80 sm:text-[12.5px]"
                style={{ left: `${(k.x / 640) * 100}%`, top: `${((k.y + 32) / 410) * 100}%` }}
              >
                {en ? LABEL_EN[k.id] : k.label}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="relative z-10 mt-4 lg:-mt-6 lg:ml-auto lg:w-[86%]">
        <VppLiveSignal initial={live} />
      </div>
    </div>
  );
}

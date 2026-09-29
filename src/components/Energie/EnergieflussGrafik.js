"use client";

import { useEffect, useId, useState } from "react";
import { BatteryCharging, Car, Factory, Network, Pause, Play, Sprout, Store, Sun, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useBreite } from "@/components/Rechner/bausteine";

/**
 * Interaktive Energiefluss-Grafik des virtuellen Kraftwerks.
 * - Vier Situationen (Tabs): Mittag, Abend, Nacht, negative Preise
 * - Knoten anklickbar (Tastatur: Tab + Enter) → Erklärung daneben
 * - Fließende Striche per CSS; bei prefers-reduced-motion oder „Pause" statisch
 * - Zwei Layouts: breit (Querformat) und schmal (Hochformat), damit die
 *   Beschriftung auf dem Handy lesbar bleibt
 */

const KNOTEN = {
  netz: { label: "Strombörse & Netz", kurz: "Börse & Netz", icon: Zap, art: "markt", text: "Day-Ahead- und Intraday-Markt, Terminmarkt für die Tranchenbeschaffung und das öffentliche Netz. Überschüsse werden hier verkauft, Fehlmengen eingekauft." },
  hub: { label: "Pool & Leitwarte", kurz: "Leitwarte", icon: Network, art: "hub", text: "Das Herz des virtuellen Kraftwerks: Prognosen für Erzeugung und Verbrauch, Fahrpläne im Viertelstundenraster, Steuersignale an Parks und Speicher und die gebündelte Beschaffung für den Pool." },
  park: { label: "Solarpark", kurz: "Solarpark", icon: Sun, art: "erzeuger", text: "Freiflächenanlagen der Gruppe liefern tagsüber Solarstrom – vermarktet direkt oder per PPA an die Unternehmen im Pool." },
  agri: { label: "Agri-PV", kurz: "Agri-PV", icon: Sprout, art: "erzeuger", text: "Vertikale oder hoch aufgeständerte Agri-PV erzeugt Strom über den Tag verteilter – Ost/West-Anlagen liefern morgens und abends mehr als klassische Südanlagen." },
  carport: { label: "Solarcarport", kurz: "Carport", icon: Car, art: "erzeuger", text: "Parkplatz-PV direkt beim Verbraucher, oft mit Ladepunkten: Strom wird vor Ort genutzt, Überschüsse fließen in den Pool." },
  speicher: { label: "Großspeicher", kurz: "Speicher", icon: BatteryCharging, art: "speicher", text: "Batteriespeicher verschieben Mittagsstrom in den Abend, nutzen günstige oder negative Preise und können Regelleistung anbieten." },
  gewerbe: { label: "Produzierendes Gewerbe", kurz: "Industrie", icon: Factory, art: "verbraucher", text: "Mittelständische Betriebe mit Ein-, Zwei- oder Dreischichtbetrieb beziehen ihren Reststrom gebündelt über den Pool." },
  handel: { label: "Handel & Dienstleistung", kurz: "Handel", icon: Store, art: "verbraucher", text: "Märkte, Logistik und Büros mit Kühlung und Klima: gut planbare Last, oft mit Spielraum für Lastverschiebung." },
};

const LAYOUT = {
  breit: {
    w: 880, h: 545, r: 40, schrift: 17,
    pos: { netz: [440, 58], hub: [440, 262], park: [130, 100], agri: [130, 262], carport: [130, 420], speicher: [440, 440], gewerbe: [750, 160], handel: [750, 350] },
  },
  schmal: {
    w: 360, h: 660, r: 30, schrift: 14,
    pos: { netz: [180, 52], park: [58, 175], agri: [180, 175], carport: [302, 175], hub: [180, 330], speicher: [62, 480], gewerbe: [298, 480], handel: [180, 590] },
  },
};

// Verbindungen: jeweils zum Hub. `st` = Stärke 0–3, `rein` = Fluss zum Hub hin
const SZENARIEN = [
  {
    id: "mittag",
    label: "Mittag",
    sub: "Sonne satt",
    titel: "Mittags: Parkstrom deckt den Tagesbedarf",
    text: "Die Parks erzeugen mehr, als die Pool-Unternehmen gerade brauchen. Ein Teil fließt per PPA in die Betriebe, Überschüsse laden den Speicher oder werden an der Börse verkauft – statt zu Tiefstpreisen abgeregelt zu werden.",
    status: { park: "liefert viel", agri: "liefert", carport: "liefert", speicher: "lädt", gewerbe: "bezieht PPA-Strom", handel: "bezieht PPA-Strom", netz: "Verkauf von Überschüssen" },
    fluss: { park: [3, true], agri: [2, true], carport: [1, true], speicher: [2, false], gewerbe: [2, false], handel: [2, false], netz: [1, false] },
  },
  {
    id: "abend",
    label: "Abend",
    sub: "Preisspitze",
    titel: "Abends: Speicher statt Spitzenpreis",
    text: "Die Sonne ist weg, der Börsenpreis steigt. Der Speicher entlädt den Mittagsstrom genau in diese teuren Viertelstunden. Der Rest kommt aus den vorab gesicherten Tranchen – nicht zum Spotpreis des Augenblicks.",
    status: { park: "keine Erzeugung", agri: "Ost/West liefert wenig", carport: "keine Erzeugung", speicher: "entlädt", gewerbe: "bezieht aus dem Pool", handel: "bezieht aus dem Pool", netz: "Tranchen & Einkauf" },
    fluss: { park: [0, true], agri: [1, true], carport: [0, true], speicher: [3, true], gewerbe: [2, false], handel: [2, false], netz: [2, true] },
  },
  {
    id: "nacht",
    label: "Nacht",
    sub: "Wind & Terminmarkt",
    titel: "Nachts: strukturiert beschafft",
    text: "Nachts laufen vor allem Zwei- und Dreischichtbetriebe. Ihr Bedarf wird aus Tranchen gedeckt, die der Pool über Monate am Terminmarkt eingekauft hat. Weht viel Wind und ist Strom günstig, lädt der Speicher für den Morgen.",
    status: { park: "keine Erzeugung", agri: "keine Erzeugung", carport: "keine Erzeugung", speicher: "lädt günstig", gewerbe: "Schichtbetrieb", handel: "Grundlast", netz: "Tranchen aus dem Terminmarkt" },
    fluss: { park: [0, true], agri: [0, true], carport: [0, true], speicher: [1, false], gewerbe: [2, false], handel: [1, false], netz: [3, true] },
  },
  {
    id: "negativ",
    label: "Negative Preise",
    sub: "Überschuss im Netz",
    titel: "Negative Preise: Flexibilität zahlt sich aus",
    text: "An sonnigen Feiertagen fällt der Börsenpreis unter null. Die Leitwarte regelt Parks ab, deren Einspeisung dann Geld kosten würde, lädt den Speicher mit Netzstrom und zieht verschiebbare Last in diese Stunden vor – davon profitiert die Beschaffung des Pools.",
    status: { park: "abgeregelt", agri: "teilweise abgeregelt", carport: "Eigenverbrauch vor Ort", speicher: "lädt voll", gewerbe: "Last vorgezogen", handel: "Kühlung vorgezogen", netz: "Bezug zu negativen Preisen" },
    fluss: { park: [0, true], agri: [1, true], carport: [1, true], speicher: [3, false], gewerbe: [3, false], handel: [2, false], netz: [3, true] },
  },
];

// Kurzfassungen für das schmale Layout (drei Knoten nebeneinander)
const KURZ = {
  "teilweise abgeregelt": "teils abgeregelt",
  "Eigenverbrauch vor Ort": "vor Ort genutzt",
  "Ost/West liefert wenig": "liefert wenig",
  "keine Erzeugung": "ruht",
  "bezieht PPA-Strom": "PPA-Strom",
  "bezieht aus dem Pool": "aus dem Pool",
};

const FARBE = {
  erzeuger: { fill: "#f5f3ea", stroke: "#f5a70f", icon: "#f5a70f" },
  speicher: { fill: "#e6f1d8", stroke: "#669933", icon: "#436621" },
  verbraucher: { fill: "#eef4fb", stroke: "#1f5aa1", icon: "#003473" },
  markt: { fill: "#eef0f4", stroke: "#6b7486", icon: "#394050" },
  hub: { fill: "#03122b", stroke: "#8cba58", icon: "#aed083" },
};

export default function EnergieflussGrafik() {
  const [ref, breite] = useBreite(880);
  const [szenarioId, setSzenarioId] = useState("mittag");
  const [auswahl, setAuswahl] = useState("hub");
  const [pause, setPause] = useState(false);
  const [reduziert, setReduziert] = useState(false);
  const tabsId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const setzen = () => setReduziert(mq.matches);
    setzen();
    mq.addEventListener?.("change", setzen);
    return () => mq.removeEventListener?.("change", setzen);
  }, []);

  const L = breite < 640 ? LAYOUT.schmal : LAYOUT.breit;
  const sz = SZENARIEN.find((s) => s.id === szenarioId);
  const animiert = !pause && !reduziert;
  const [hx, hy] = L.pos.hub;
  const k = KNOTEN[auswahl];

  const tastatur = (e) => {
    const i = SZENARIEN.findIndex((s) => s.id === szenarioId);
    if (e.key === "ArrowRight") setSzenarioId(SZENARIEN[(i + 1) % SZENARIEN.length].id);
    if (e.key === "ArrowLeft") setSzenarioId(SZENARIEN[(i - 1 + SZENARIEN.length) % SZENARIEN.length].id);
  };

  return (
    <div ref={ref} className="rounded-[2rem] bg-white p-4 shadow-xl ring-1 ring-ink-200/70 sm:p-6 md:p-8">
      <style>{`
        @keyframes vpp-lauf { to { stroke-dashoffset: -36; } }
        .vpp-an .vpp-fluss { animation: vpp-lauf 1.4s linear infinite; }
        .vpp-an .vpp-fluss[data-st="3"] { animation-duration: 0.8s; }
        .vpp-an .vpp-fluss[data-st="2"] { animation-duration: 1.1s; }
        @keyframes vpp-puls { 0%,100% { opacity: .35; } 50% { opacity: .75; } }
        .vpp-an .vpp-puls { animation: vpp-puls 2.4s ease-in-out infinite; }
      `}</style>

      {/* Situationen */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Situation im virtuellen Kraftwerk" onKeyDown={tastatur} className="grid grid-cols-2 gap-1.5 rounded-2xl bg-ink-100/80 p-1.5 sm:flex">
          {SZENARIEN.map((s) => {
            const aktiv = s.id === szenarioId;
            return (
              <button
                key={s.id}
                role="tab"
                id={`${tabsId}-${s.id}`}
                aria-selected={aktiv}
                aria-controls={`${tabsId}-panel`}
                tabIndex={aktiv ? 0 : -1}
                onClick={() => setSzenarioId(s.id)}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                  aktiv ? "bg-white font-semibold text-ink-900 shadow-[0_2px_8px_-2px_rgba(21,26,36,0.18)] ring-1 ring-ink-200/70" : "text-ink-600 hover:text-ink-900"
                )}
              >
                <span className="text-[14px]">{s.label}</span>
                <span className={cn("text-[11.5px]", aktiv ? "text-ov-700" : "text-ink-500")}>{s.sub}</span>
              </button>
            );
          })}
        </div>
        {!reduziert && (
          <button
            type="button"
            onClick={() => setPause((p) => !p)}
            aria-pressed={pause}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-4 text-[13.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 sm:self-auto"
          >
            {pause ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
            {pause ? "Animation starten" : "Animation anhalten"}
          </button>
        )}
      </div>

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${szenarioId}`} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <figure className="min-w-0">
          <svg
            viewBox={`0 0 ${L.w} ${L.h}`}
            className={cn("block h-auto w-full", animiert && "vpp-an")}
            role="img"
            aria-labelledby={`${tabsId}-titel ${tabsId}-desc`}
          >
            <title id={`${tabsId}-titel`}>{`Energieflüsse im virtuellen Kraftwerk – ${sz.label}`}</title>
            <desc id={`${tabsId}-desc`}>
              {Object.entries(sz.status).map(([id, st]) => `${KNOTEN[id].label}: ${st}`).join(". ")}
            </desc>

            {/* Raster */}
            <defs>
              <pattern id={`${tabsId}-raster`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke="#eef0f4" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={L.w} height={L.h} rx="24" fill={`url(#${tabsId}-raster)`} />

            {/* Steuersignale (gestrichelt, dünn) + Energieflüsse */}
            {Object.entries(L.pos).map(([id, [x, y]]) => {
              if (id === "hub") return null;
              const [st, rein] = sz.fluss[id] || [0, true];
              const farbe = KNOTEN[id].art === "erzeuger" ? "#f5a70f" : KNOTEN[id].art === "speicher" ? "#669933" : KNOTEN[id].art === "markt" ? "#6b7486" : "#1f5aa1";
              // Pfad immer in Flussrichtung zeichnen – die Animation läuft dann „vorwärts"
              const [x1, y1, x2, y2] = rein ? [x, y, hx, hy] : [hx, hy, x, y];
              return (
                <g key={id}>
                  <line x1={x} y1={y} x2={hx} y2={hy} stroke="#dfe3ea" strokeWidth="2" strokeDasharray="2 6" />
                  {st > 0 && (
                    <>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={farbe} strokeOpacity="0.18" strokeWidth={4 + st * 4} strokeLinecap="round" />
                      <line
                        className="vpp-fluss"
                        data-st={st}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={farbe}
                        strokeWidth={2 + st}
                        strokeLinecap="round"
                        strokeDasharray="6 12"
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Knoten */}
            {Object.entries(L.pos).map(([id, [x, y]]) => {
              const kn = KNOTEN[id];
              const f = FARBE[kn.art];
              const Icon = kn.icon;
              const gewaehlt = auswahl === id;
              const r = id === "hub" ? L.r + 8 : L.r;
              const st = sz.fluss[id]?.[0] ?? 1;
              const aus = id !== "hub" && st === 0;
              const status = id === "hub" ? "steuert" : sz.status[id];
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={gewaehlt}
                  aria-label={`${kn.label}: ${status}`}
                  onClick={() => setAuswahl(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAuswahl(id);
                    }
                  }}
                  className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-ov-600"
                  style={{ opacity: aus ? 0.55 : 1 }}
                >
                  {id === "hub" && <circle className="vpp-puls" cx={x} cy={y} r={r + 14} fill="#8cba58" opacity="0.35" />}
                  <circle className="ring" cx={x} cy={y} r={r + 6} fill="none" stroke={gewaehlt ? "#669933" : "transparent"} strokeWidth="3" />
                  <circle cx={x} cy={y} r={r} fill={f.fill} stroke={f.stroke} strokeWidth="2" />
                  <Icon x={x - 13} y={y - 13} width={26} height={26} color={f.icon} strokeWidth={1.9} aria-hidden="true" />
                  <text x={x} y={y + r + 21} textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="5" strokeLinejoin="round" fontSize={L.schrift} fontWeight="700" fill="#151a24" fontFamily="var(--font-display, sans-serif)">
                    {L === LAYOUT.schmal ? kn.kurz : kn.label}
                  </text>
                  {id !== "hub" && (
                    <text x={x} y={y + r + 21 + L.schrift + 3} textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="5" strokeLinejoin="round" fontSize={L.schrift - 2} fill={aus ? "#97a0b0" : "#558227"}>
                      {L === LAYOUT.schmal ? KURZ[status] || status : status}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-500">
            <Legende farbe="#f5a70f">Erzeugung</Legende>
            <Legende farbe="#669933">Speicher</Legende>
            <Legende farbe="#1f5aa1">Verbrauch im Pool</Legende>
            <Legende farbe="#6b7486">Börse & Netz</Legende>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block w-6 border-t-2 border-dashed border-ink-300" />
              Steuersignal
            </span>
          </figcaption>
        </figure>

        <div className="min-w-0 space-y-4" aria-live="polite">
          <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">Situation</p>
            <h3 className="mt-2 font-display text-[20px] font-bold leading-snug text-ink-900">{sz.titel}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{sz.text}</p>
          </div>
          <div className="rounded-3xl bg-navy-950 p-5 text-white md:p-6">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">
              <k.icon aria-hidden="true" className="h-4 w-4" />
              Baustein
            </p>
            <h3 className="mt-2 font-display text-[19px] font-bold leading-snug">{k.label}</h3>
            {auswahl !== "hub" && <p className="mt-1 text-[13.5px] font-semibold text-ov-300">Jetzt: {sz.status[auswahl]}</p>}
            <p className="mt-2 text-[14.5px] leading-relaxed text-white/70">{k.text}</p>
            <p className="mt-3 text-[12.5px] text-white/45">Tipp: Tippen Sie auf einen Baustein in der Grafik.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legende({ farbe, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="inline-block h-1.5 w-6 rounded-full" style={{ background: farbe }} />
      {children}
    </span>
  );
}

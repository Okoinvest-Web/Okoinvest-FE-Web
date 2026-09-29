"use client";

import { useMemo, useState } from "react";
import { useBreite, Tooltip } from "@/components/Rechner/bausteine";
import { fmt } from "@/lib/rechner/annahmen";

/**
 * EEG-Ausschreibungen Solar erstes Segment – interaktives SVG-Diagramm.
 * Ansichten: Zuschlagswerte je Gebotstermin (Ø, Spanne, Höchstwert),
 * Mengen je Jahr (Gebote vs. Zuschläge) und Tabelle. Zeitraumfilter.
 *
 * props:
 *  termine  AUSSCHREIBUNGEN aus @/data/marktdaten
 *  jahre    AUSSCHREIBUNGEN_JAHR aus @/data/marktdaten
 */

const FARBE = {
  mittel: "#558227", // ov-600
  spanne: "#e6f1d8", // ov-100
  hoechst: "#1f5aa1", // navy-500
  gebote: "#4a7cbd", // navy-400
  zuschlag: "#558227", // ov-600
  raster: "#eef0f4", // ink-100
  achse: "#6b7486", // ink-500
  text: "#4e5667", // ink-600
};

const ANSICHTEN = [
  { id: "werte", label: "Zuschlagswerte" },
  { id: "mengen", label: "Mengen" },
  { id: "tabelle", label: "Tabelle" },
];
const ZEITRAEUME = [
  { id: "alle", label: "Seit 2017", ab: 2017 },
  { id: "eeg23", label: "Seit 2023", ab: 2023 },
];

const MONATE = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const termin = (iso) => `${Number(iso.slice(8, 10))}. ${MONATE[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const ct = (v) => `${fmt(v, 2)} ct`;
const mw = (v) => `${fmt(v)} MW`;

export default function AusschreibungsChart({ termine, jahre }) {
  const [ansicht, setAnsicht] = useState("werte");
  const [zeitraum, setZeitraum] = useState("alle");
  const ab = ZEITRAEUME.find((z) => z.id === zeitraum).ab;
  const t = useMemo(() => termine.filter((a) => Number(a.datum.slice(0, 4)) >= ab), [termine, ab]);
  const j = useMemo(() => jahre.filter((a) => a.jahr >= ab), [jahre, ab]);

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Umschalter label="Ansicht" optionen={ANSICHTEN} wert={ansicht} setWert={setAnsicht} />
        <Umschalter label="Zeitraum" optionen={ZEITRAEUME} wert={zeitraum} setWert={setZeitraum} klein />
      </div>

      <div className="mt-6">
        {ansicht === "werte" && <WerteDiagramm daten={t} />}
        {ansicht === "mengen" && <MengenDiagramm daten={j} />}
        {ansicht === "tabelle" && <Tabelle daten={t} />}
      </div>
    </div>
  );
}

function Umschalter({ label, optionen, wert, setWert, klein = false }) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-full rounded-2xl bg-ink-100 p-1 sm:w-auto">
      {optionen.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={wert === o.id}
          onClick={() => setWert(o.id)}
          className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 font-semibold transition-colors sm:flex-none sm:px-4 ${klein ? "text-[13px]" : "text-[13.5px]"} ${
            wert === o.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Legende({ eintraege }) {
  return (
    <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-600">
      {eintraege.map((e) => (
        <li key={e.label} className="flex items-center gap-2">
          {e.art === "linie" && <span aria-hidden="true" className="h-0.5 w-5 rounded-full" style={{ background: e.farbe }} />}
          {e.art === "strich" && <span aria-hidden="true" className="w-5 border-t-2 border-dashed" style={{ borderColor: e.farbe }} />}
          {e.art === "flaeche" && <span aria-hidden="true" className="h-3 w-5 rounded-sm ring-1 ring-ov-200" style={{ background: e.farbe }} />}
          {e.art === "balken" && <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: e.farbe }} />}
          {e.label}
        </li>
      ))}
    </ul>
  );
}

/** Gemeinsame Achsenlogik: Band-Skala nach Index, lineare y-Skala */
function useGeometrie(breite, n, yMin, yMax) {
  const H = breite < 520 ? 280 : 360;
  const m = { l: breite < 520 ? 40 : 48, r: 12, t: 26, b: 30 };
  const pw = Math.max(10, breite - m.l - m.r);
  const ph = H - m.t - m.b;
  const band = pw / Math.max(1, n);
  const x = (i) => m.l + band * (i + 0.5);
  const y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * ph;
  return { H, m, pw, ph, band, x, y };
}

function Interaktion({ n, g, aktiv, setAktiv, label, children, breite }) {
  const ausPos = (clientX, el) => {
    const r = el.getBoundingClientRect();
    const i = Math.floor((clientX - r.left - g.m.l) / g.band);
    setAktiv(Math.max(0, Math.min(n - 1, i)));
  };
  return (
    <svg
      width="100%"
      height={g.H}
      viewBox={`0 0 ${breite} ${g.H}`}
      className="block touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2 rounded-xl"
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerMove={(e) => ausPos(e.clientX, e.currentTarget)}
      onPointerDown={(e) => ausPos(e.clientX, e.currentTarget)}
      onPointerLeave={() => setAktiv(null)}
      onBlur={() => setAktiv(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const d = e.key === "ArrowRight" ? 1 : -1;
          setAktiv((a) => (a == null ? (d > 0 ? 0 : n - 1) : Math.max(0, Math.min(n - 1, a + d))));
        }
        if (e.key === "Escape") setAktiv(null);
      }}
    >
      {children}
    </svg>
  );
}

function YAchse({ g, ticks, format, breite }) {
  return ticks.map((v) => (
    <g key={v}>
      <line x1={g.m.l} x2={breite - g.m.r} y1={g.y(v)} y2={g.y(v)} stroke={FARBE.raster} strokeWidth="1" />
      <text x={g.m.l - 8} y={g.y(v)} dy="0.32em" textAnchor="end" fontSize="11.5" fill={FARBE.achse} className="ov-num">
        {format(v)}
      </text>
    </g>
  ));
}

/* ------------------------------------------------------------------ */

function WerteDiagramm({ daten }) {
  const [ref, breite] = useBreite(760);
  const [aktiv, setAktiv] = useState(null);
  const n = daten.length;
  const yMin = 3;
  const yMax = 9.5;
  const g = useGeometrie(breite, n, yMin, yMax);
  const ticks = [3, 4, 5, 6, 7, 8, 9];

  const linie = daten.map((a, i) => `${i ? "L" : "M"}${g.x(i).toFixed(1)},${g.y(a.mittel).toFixed(1)}`).join("");
  const flaeche =
    daten.map((a, i) => `${i ? "L" : "M"}${g.x(i).toFixed(1)},${g.y(a.max).toFixed(1)}`).join("") +
    [...daten].reverse().map((a, k) => `L${g.x(n - 1 - k).toFixed(1)},${g.y(a.min).toFixed(1)}`).join("") +
    "Z";
  // Höchstwert als Treppenlinie über die Bandbreite je Termin
  const hoechst = daten
    .map((a, i) => {
      const x0 = g.m.l + g.band * i;
      const x1 = x0 + g.band;
      return `${i ? "L" : "M"}${x0.toFixed(1)},${g.y(a.hoechst).toFixed(1)}L${x1.toFixed(1)},${g.y(a.hoechst).toFixed(1)}`;
    })
    .join("");

  // Jahresmarken an der x-Achse: erster Termin eines Jahres; bei wenig Platz nur jedes zweite Jahr
  const jahresStarts = daten.map((a, i) => ({ i, jahr: a.datum.slice(0, 4) })).filter((d, k, arr) => k === 0 || arr[k - 1].jahr !== d.jahr);
  const jedes = breite < 520 && jahresStarts.length > 6 ? 2 : 1;
  const letzte = daten[n - 1];
  const a = aktiv != null ? daten[aktiv] : null;

  return (
    <figure>
      <Legende
        eintraege={[
          { art: "linie", farbe: FARBE.mittel, label: "Ø Zuschlagswert (mengengewichtet)" },
          { art: "flaeche", farbe: FARBE.spanne, label: "Spanne niedrigster–höchster Zuschlag" },
          { art: "strich", farbe: FARBE.hoechst, label: "Höchstwert" },
        ]}
      />
      <div ref={ref} className="relative">
        <Interaktion
          n={n}
          g={g}
          aktiv={aktiv}
          setAktiv={setAktiv}
          breite={breite}
          label={`Liniendiagramm: mengengewichtete Zuschlagswerte der Solar-Ausschreibungen von ${termin(daten[0].datum)} bis ${termin(letzte.datum)}, zuletzt ${ct(letzte.mittel)} je kWh. Mit Pfeiltasten durch die Gebotstermine blättern.`}
        >
          <YAchse g={g} ticks={ticks} format={(v) => fmt(v)} breite={breite} />
          <text x={2} y={10} fontSize="10.5" fill={FARBE.achse}>
            ct/kWh
          </text>
          {jahresStarts.map((d, k) =>
            k % jedes === 0 ? (
              <text key={d.jahr} x={g.m.l + g.band * d.i} y={g.H - 10} fontSize="11.5" fill={FARBE.achse} className="ov-num">
                {d.jahr}
              </text>
            ) : null
          )}
          <path d={flaeche} fill={FARBE.spanne} />
          <path d={hoechst} fill="none" stroke={FARBE.hoechst} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
          <path d={linie} fill="none" stroke={FARBE.mittel} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {a && (
            <g>
              <line x1={g.x(aktiv)} x2={g.x(aktiv)} y1={g.m.t} y2={g.H - g.m.b} stroke="#151a24" strokeOpacity="0.35" strokeWidth="1" />
              <circle cx={g.x(aktiv)} cy={g.y(a.mittel)} r="5" fill={FARBE.mittel} stroke="#fff" strokeWidth="2" />
            </g>
          )}
          {/* Direktbeschriftung letzter Wert */}
          <circle cx={g.x(n - 1)} cy={g.y(letzte.mittel)} r="4" fill={FARBE.mittel} stroke="#fff" strokeWidth="2" />
          <text x={g.x(n - 1) - 8} y={g.y(letzte.mittel) + 20} textAnchor="end" fontSize="12" fontWeight="700" fill="#151a24" className="ov-num">
            {ct(letzte.mittel)}
          </text>
        </Interaktion>
        {a && (
          <Tooltip x={g.x(aktiv)} y={g.y(a.hoechst) - 10} breite={breite}>
            <p className="font-semibold">Gebotstermin {termin(a.datum)}</p>
            <p>
              Ø Zuschlag: <strong className="ov-num">{ct(a.mittel)}</strong>
            </p>
            <p className="text-white/75">
              Spanne {fmt(a.min, 2)}–{fmt(a.max, 2)} ct · Höchstwert {fmt(a.hoechst, 2)} ct
            </p>
            <p className="text-white/75">
              {a.anzahl[0]} Zuschläge · {mw(a.zuschlag)}
            </p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
        Jeder Punkt ist ein Gebotstermin (gleichmäßig nebeneinander, unabhängig vom Datum). Werte in ct/kWh, anzulegender Wert für 20 Jahre. Quelle:
        Bundesnetzagentur.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function MengenDiagramm({ daten }) {
  const [ref, breite] = useBreite(760);
  const [aktiv, setAktiv] = useState(null);
  const n = daten.length;
  const maxWert = Math.max(...daten.map((d) => Math.max(d.gebote, d.volumen)));
  const schritt = maxWert > 8000 ? 4000 : maxWert > 4000 ? 2000 : 1000;
  const yMax = Math.ceil(maxWert / schritt) * schritt;
  const g = useGeometrie(breite, n, 0, yMax);
  const ticks = Array.from({ length: yMax / schritt + 1 }, (_, k) => k * schritt);
  const bw = Math.min(28, (g.band - 10) / 2);
  const a = aktiv != null ? daten[aktiv] : null;

  // Balken mit 4-px-Rundung oben, an der Grundlinie gerade
  const balken = (x, wert, farbe, key) => {
    const y0 = g.y(0);
    const y1 = g.y(wert);
    const h = Math.max(0, y0 - y1);
    const r = Math.min(4, h, bw / 2);
    const d = `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`;
    return <path key={key} d={d} fill={farbe} />;
  };

  return (
    <figure>
      <Legende
        eintraege={[
          { art: "balken", farbe: FARBE.gebote, label: "Eingereichte Gebotsmenge" },
          { art: "balken", farbe: FARBE.zuschlag, label: "Bezuschlagte Menge" },
        ]}
      />
      <div ref={ref} className="relative">
        <Interaktion
          n={n}
          g={g}
          aktiv={aktiv}
          setAktiv={setAktiv}
          breite={breite}
          label={`Balkendiagramm: eingereichte und bezuschlagte Mengen der Solar-Ausschreibungen je Jahr von ${daten[0].jahr} bis ${daten[n - 1].jahr} in Megawatt. Mit Pfeiltasten durch die Jahre blättern.`}
        >
          <YAchse g={g} ticks={ticks} format={(v) => (v >= 1000 ? `${fmt(v / 1000)} GW` : "0")} breite={breite} />
          {a && <rect x={g.m.l + g.band * aktiv + 2} y={g.m.t} width={g.band - 4} height={g.ph} rx="8" fill="#151a24" fillOpacity="0.04" />}
          {daten.map((d, i) => {
            const mitte = g.x(i);
            return (
              <g key={d.jahr}>
                {balken(mitte - bw - 1, d.gebote, FARBE.gebote, "g")}
                {balken(mitte + 1, d.zuschlag, FARBE.zuschlag, "z")}
                <text x={mitte} y={g.H - 10} textAnchor="middle" fontSize="11.5" fill={FARBE.achse} className="ov-num">
                  {breite < 520 ? `’${String(d.jahr).slice(2)}` : d.jahr}
                </text>
              </g>
            );
          })}
        </Interaktion>
        {a && (
          <Tooltip x={g.x(aktiv)} y={g.y(Math.max(a.gebote, a.volumen)) - 10} breite={breite}>
            <p className="font-semibold">
              {a.jahr} · {a.termine} {a.termine === 1 ? "Gebotstermin" : "Gebotstermine"}
            </p>
            <p>
              Ausgeschrieben: <strong className="ov-num">{mw(a.volumen)}</strong>
            </p>
            <p>
              Gebote: <strong className="ov-num">{mw(a.gebote)}</strong>
            </p>
            <p>
              Zuschläge: <strong className="ov-num">{mw(a.zuschlag)}</strong>
            </p>
            <p className="text-white/75">
              {a.ueberzeichnung >= 1 ? `${fmt(a.ueberzeichnung, 1)}-fach überzeichnet` : `unterzeichnet (${fmt(a.ueberzeichnung * 100)} % des Volumens)`} · Ø{" "}
              {fmt(a.mittel, 2)} ct
            </p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
        Summen aller Gebotstermine eines Jahres in MW; {daten[n - 1].jahr} bis einschließlich Juli. Quelle: Bundesnetzagentur, eigene Summenbildung.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function Tabelle({ daten }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1" tabIndex={0} role="region" aria-label="Tabelle der Gebotstermine, horizontal scrollbar">
      <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">
        <caption className="sr-only">EEG-Ausschreibungen Solaranlagen erstes Segment je Gebotstermin</caption>
        <thead>
          <tr className="border-b border-ink-200 text-[12px] uppercase tracking-[0.08em] text-ink-500">
            <th scope="col" className="py-2.5 pr-3 font-semibold">Gebotstermin</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">Volumen MW</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">Gebote MW</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">Zuschläge MW</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">Ø ct/kWh</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">Spanne</th>
            <th scope="col" className="py-2.5 text-right font-semibold">Höchstwert</th>
          </tr>
        </thead>
        <tbody>
          {[...daten].reverse().map((a) => (
            <tr key={a.datum} className="border-b border-ink-100 text-ink-700">
              <th scope="row" className="py-2 pr-3 font-medium text-ink-900">
                {termin(a.datum)}
              </th>
              <td className="ov-num py-2 pr-3 text-right">{fmt(a.volumen)}</td>
              <td className="ov-num py-2 pr-3 text-right">{fmt(a.gebote)}</td>
              <td className="ov-num py-2 pr-3 text-right">{fmt(a.zuschlag)}</td>
              <td className="ov-num py-2 pr-3 text-right font-semibold text-ink-900">{fmt(a.mittel, 2)}</td>
              <td className="ov-num py-2 pr-3 text-right">
                {fmt(a.min, 2)}–{fmt(a.max, 2)}
              </td>
              <td className="ov-num py-2 text-right">{fmt(a.hoechst, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

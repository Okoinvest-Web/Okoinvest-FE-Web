"use client";

import { useMemo, useState } from "react";
import { useBreite, Tooltip } from "@/components/Rechner/bausteine";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";

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

const ZEITRAEUME_AB = { alle: 2017, eeg23: 2023 };

// Sprachmodell: Texte des Diagramms (Zahlen im Format der Sprache über useFormate)
const TEXTE = {
  de: {
    ansichten: [
      { id: "werte", label: "Zuschlagswerte" },
      { id: "mengen", label: "Mengen" },
      { id: "tabelle", label: "Tabelle" },
    ],
    zeitraeume: [
      { id: "alle", label: "Seit 2017" },
      { id: "eeg23", label: "Seit 2023" },
    ],
    monate: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."],
    termin: (m, iso) => `${Number(iso.slice(8, 10))}. ${m[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`,
    ansicht: "Ansicht",
    zeitraum: "Zeitraum",
    legMittel: "Ø Zuschlagswert (mengengewichtet)",
    legSpanne: "Spanne niedrigster–höchster Zuschlag",
    legHoechst: "Höchstwert",
    werteAria: (a, b, c) => `Liniendiagramm: mengengewichtete Zuschlagswerte der Solar-Ausschreibungen von ${a} bis ${b}, zuletzt ${c} je kWh. Mit Pfeiltasten durch die Gebotstermine blättern.`,
    gebotstermin: "Gebotstermin",
    oZuschlag: "Ø Zuschlag:",
    spanneZeile: (a, b, c) => `Spanne ${a}–${b} ct · Höchstwert ${c} ct`,
    zuschlaege: (n, x) => `${n} Zuschläge · ${x}`,
    werteFuss: "Jeder Punkt ist ein Gebotstermin (gleichmäßig nebeneinander, unabhängig vom Datum). Werte in ct/kWh, anzulegender Wert für 20 Jahre. Quelle: Bundesnetzagentur.",
    legGebote: "Eingereichte Gebotsmenge",
    legZuschlag: "Bezuschlagte Menge",
    mengenAria: (a, b) => `Balkendiagramm: eingereichte und bezuschlagte Mengen der Solar-Ausschreibungen je Jahr von ${a} bis ${b} in Megawatt. Mit Pfeiltasten durch die Jahre blättern.`,
    termine: (n) => (n === 1 ? "Gebotstermin" : "Gebotstermine"),
    ausgeschrieben: "Ausgeschrieben:",
    gebote: "Gebote:",
    zuschlaegeL: "Zuschläge:",
    ueber: (f, u) => (u >= 1 ? `${f.fmt(u, 1)}-fach überzeichnet` : `unterzeichnet (${f.fmt(u * 100)} % des Volumens)`),
    mengenFuss: (j) => `Summen aller Gebotstermine eines Jahres in MW; ${j} bis einschließlich Juli. Quelle: Bundesnetzagentur, eigene Summenbildung.`,
    tabelleAria: "Tabelle der Gebotstermine, horizontal scrollbar",
    caption: "EEG-Ausschreibungen Solaranlagen erstes Segment je Gebotstermin",
    kopf: ["Gebotstermin", "Volumen MW", "Gebote MW", "Zuschläge MW", "Ø ct/kWh", "Spanne", "Höchstwert"],
  },
  en: {
    ansichten: [{ label: "Award values" }, { label: "Volumes" }, { label: "Table" }],
    zeitraeume: [{ label: "Since 2017" }, { label: "Since 2023" }],
    monate: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    termin: (m, iso) => `${Number(iso.slice(8, 10))} ${m[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`,
    ansicht: "View",
    zeitraum: "Period",
    legMittel: "Ø award value (volume-weighted)",
    legSpanne: "Range lowest–highest award",
    legHoechst: "Maximum value",
    werteAria: (a, b, c) => `Line chart: volume-weighted award values of the solar tenders from ${a} to ${b}, most recently ${c} per kWh. Use the arrow keys to move through the bidding dates.`,
    gebotstermin: "Bidding date",
    oZuschlag: "Ø award:",
    spanneZeile: (a, b, c) => `Range ${a}–${b} ct · maximum ${c} ct`,
    zuschlaege: (n, x) => `${n} awards · ${x}`,
    werteFuss: "Each point is one bidding date (evenly spaced, regardless of the date). Values in ct/kWh, award value for 20 years. Source: Bundesnetzagentur (Federal Network Agency).",
    legGebote: "Volume bid",
    legZuschlag: "Volume awarded",
    mengenAria: (a, b) => `Bar chart: volumes bid and awarded in the solar tenders per year from ${a} to ${b} in megawatts. Use the arrow keys to move through the years.`,
    termine: (n) => (n === 1 ? "bidding date" : "bidding dates"),
    ausgeschrieben: "Tendered:",
    gebote: "Bids:",
    zuschlaegeL: "Awards:",
    ueber: (f, u) => (u >= 1 ? `${f.fmt(u, 1)}× oversubscribed` : `undersubscribed (${f.pct(u * 100)} of the volume)`),
    mengenFuss: (j) => `Totals of all bidding dates in a year in MW; ${j} up to and including July. Source: Bundesnetzagentur, own totals.`,
    tabelleAria: "Table of bidding dates, horizontally scrollable",
    caption: "EEG tenders for solar installations, first segment, by bidding date",
    kopf: ["Bidding date", "Volume MW", "Bids MW", "Awards MW", "Ø ct/kWh", "Range", "Maximum"],
  },
};

function useTeile() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  return {
    t,
    f,
    fmt: f.fmt,
    termin: (iso) => t.termin(t.monate, iso),
    ct: (v) => `${f.fmt(v, 2)} ct`,
    mw: (v) => `${f.fmt(v)} MW`,
  };
}

export default function AusschreibungsChart({ termine, jahre }) {
  const { t: tx } = useTeile();
  const [ansicht, setAnsicht] = useState("werte");
  const [zeitraum, setZeitraum] = useState("alle");
  const ab = ZEITRAEUME_AB[zeitraum];
  const t = useMemo(() => termine.filter((a) => Number(a.datum.slice(0, 4)) >= ab), [termine, ab]);
  const j = useMemo(() => jahre.filter((a) => a.jahr >= ab), [jahre, ab]);

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Umschalter label={tx.ansicht} optionen={tx.ansichten} wert={ansicht} setWert={setAnsicht} />
        <Umschalter label={tx.zeitraum} optionen={tx.zeitraeume} wert={zeitraum} setWert={setZeitraum} klein />
      </div>

      <div className="mt-6">
        {/* lauf = Zeitraum: Beim Umschalten zeichnen sich Linie bzw. Balken neu (Feedback, dass sich die Datenbasis geändert hat).
            Die Einlauf-Klassen (ov-linie, ov-balken-y, ov-flaeche-ein) starten über das umgebende Reveal bzw. sofort danach. */}
        {ansicht === "werte" && <WerteDiagramm lauf={zeitraum} daten={t} />}
        {ansicht === "mengen" && <MengenDiagramm lauf={zeitraum} daten={j} />}
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

function WerteDiagramm({ daten, lauf }) {
  const { t, fmt, termin, ct, mw } = useTeile();
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
          { art: "linie", farbe: FARBE.mittel, label: t.legMittel },
          { art: "flaeche", farbe: FARBE.spanne, label: t.legSpanne },
          { art: "strich", farbe: FARBE.hoechst, label: t.legHoechst },
        ]}
      />
      <div ref={ref} className="relative">
        <Interaktion
          n={n}
          g={g}
          aktiv={aktiv}
          setAktiv={setAktiv}
          breite={breite}
          label={t.werteAria(termin(daten[0].datum), termin(letzte.datum), ct(letzte.mittel))}
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
          {/* Einlauf: Ø-Linie zeichnet sich von 2017 bis heute, Spanne und Höchstwert blenden als Kontext dazu */}
          <g key={lauf}>
            <path d={flaeche} fill={FARBE.spanne} className="ov-flaeche-ein" />
            <g className="ov-flaeche-ein">
              <path d={hoechst} fill="none" stroke={FARBE.hoechst} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
            </g>
            <path d={linie} pathLength="1" fill="none" stroke={FARBE.mittel} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="ov-linie" />
          </g>
          {a && (
            <g>
              <line x1={g.x(aktiv)} x2={g.x(aktiv)} y1={g.m.t} y2={g.H - g.m.b} stroke="#151a24" strokeOpacity="0.35" strokeWidth="1" />
              <circle cx={g.x(aktiv)} cy={g.y(a.mittel)} r="5" fill={FARBE.mittel} stroke="#fff" strokeWidth="2" />
            </g>
          )}
          {/* Direktbeschriftung letzter Wert – erscheint, wenn die Linie dort ankommt */}
          <g key={`ende-${lauf}`} className="ov-flaeche-ein" style={{ animationDelay: "1000ms" }}>
            <circle cx={g.x(n - 1)} cy={g.y(letzte.mittel)} r="4" fill={FARBE.mittel} stroke="#fff" strokeWidth="2" />
            <text x={g.x(n - 1) - 8} y={g.y(letzte.mittel) + 20} textAnchor="end" fontSize="12" fontWeight="700" fill="#151a24" className="ov-num">
              {ct(letzte.mittel)}
            </text>
          </g>
        </Interaktion>
        {a && (
          <Tooltip x={g.x(aktiv)} y={g.y(a.hoechst) - 10} breite={breite}>
            <p className="font-semibold">{t.gebotstermin} {termin(a.datum)}</p>
            <p>
              {t.oZuschlag} <strong className="ov-num">{ct(a.mittel)}</strong>
            </p>
            <p className="text-white/75">{t.spanneZeile(fmt(a.min, 2), fmt(a.max, 2), fmt(a.hoechst, 2))}</p>
            <p className="text-white/75">{t.zuschlaege(a.anzahl[0], mw(a.zuschlag))}</p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
        {t.werteFuss}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function MengenDiagramm({ daten, lauf }) {
  const { t, f, fmt, mw } = useTeile();
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
  const balken = (x, wert, farbe, key, i) => {
    const y0 = g.y(0);
    const y1 = g.y(wert);
    const h = Math.max(0, y0 - y1);
    const r = Math.min(4, h, bw / 2);
    const d = `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`;
    // Balken wachsen gestaffelt von der Grundlinie (transform, kein Layout)
    return <path key={key} d={d} fill={farbe} className="ov-balken-y" style={{ "--i": i }} />;
  };

  return (
    <figure>
      <Legende
        eintraege={[
          { art: "balken", farbe: FARBE.gebote, label: t.legGebote },
          { art: "balken", farbe: FARBE.zuschlag, label: t.legZuschlag },
        ]}
      />
      <div ref={ref} className="relative">
        <Interaktion
          n={n}
          g={g}
          aktiv={aktiv}
          setAktiv={setAktiv}
          breite={breite}
          label={t.mengenAria(daten[0].jahr, daten[n - 1].jahr)}
        >
          <YAchse g={g} ticks={ticks} format={(v) => (v >= 1000 ? `${fmt(v / 1000)} GW` : "0")} breite={breite} />
          {a && <rect x={g.m.l + g.band * aktiv + 2} y={g.m.t} width={g.band - 4} height={g.ph} rx="8" fill="#151a24" fillOpacity="0.04" />}
          {daten.map((d, i) => {
            const mitte = g.x(i);
            return (
              <g key={`${lauf}-${d.jahr}`}>
                {balken(mitte - bw - 1, d.gebote, FARBE.gebote, "g", i)}
                {balken(mitte + 1, d.zuschlag, FARBE.zuschlag, "z", i + 0.5)}
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
              {a.jahr} · {a.termine} {t.termine(a.termine)}
            </p>
            <p>
              {t.ausgeschrieben} <strong className="ov-num">{mw(a.volumen)}</strong>
            </p>
            <p>
              {t.gebote} <strong className="ov-num">{mw(a.gebote)}</strong>
            </p>
            <p>
              {t.zuschlaegeL} <strong className="ov-num">{mw(a.zuschlag)}</strong>
            </p>
            <p className="text-white/75">
              {t.ueber(f, a.ueberzeichnung)} · Ø {fmt(a.mittel, 2)} ct
            </p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
        {t.mengenFuss(daten[n - 1].jahr)}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

function Tabelle({ daten }) {
  const { t, fmt, termin } = useTeile();
  return (
    <div className="-mx-1 overflow-x-auto px-1" tabIndex={0} role="region" aria-label={t.tabelleAria}>
      <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr className="border-b border-ink-200 text-[12px] uppercase tracking-[0.08em] text-ink-500">
            <th scope="col" className="py-2.5 pr-3 font-semibold">{t.kopf[0]}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.kopf[1]}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.kopf[2]}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.kopf[3]}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.kopf[4]}</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">{t.kopf[5]}</th>
            <th scope="col" className="py-2.5 text-right font-semibold">{t.kopf[6]}</th>
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

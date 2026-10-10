"use client";

// Ausschreibungs-Monitor DACH (Welle 3, Paket B9) – Länderfilter, letzte Runde je Programm, Termine
// (kommend / Ergebnis ausstehend) und Zeitreihe je Programm im Stil von AusschreibungsChart.
// Daten kommen fertig vom Server (src/lib/marktdaten/monitor.js); hier wird nur angezeigt und gefiltert.
//
// Ländertrennung: Auf /de, /at, /ch bekommt die Komponente nur die Reihen des Landes (kein Filter).
// Auf der gemeinsamen Seite filtert der Besucher; jede Zeile trägt die Länderkennung. Werte
// verschiedener Länder stehen nie in einer gemeinsamen Achse (Einheiten ct/kWh, CHF/kW, Rp./kWh).

import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, Hourglass } from "lucide-react";
import { useBreite, Tooltip } from "@/components/Rechner/bausteine";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";

const FARBE = {
  mittel: "#558227", // ov-600
  spanne: "#e6f1d8", // ov-100
  hoechst: "#1f5aa1", // navy-500
  volumen: "#c9d3e3", // navy-100
  zuschlag: "#558227",
  raster: "#eef0f4",
  achse: "#6b7486",
};

const TEXTE = {
  de: {
    laender: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" },
    alle: "Alle Länder",
    filter: "Länderfilter",
    monate: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    datum: (m, iso) => `${Number(iso.slice(8, 10))}. ${m[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`,
    letzteTitel: "Letzte Runde je Programm",
    oZuschlag: "Ø Zuschlagswert",
    spanne: (a, b) => `bezuschlagt ${a} bis ${b}`,
    hoechst: (h) => `Höchstwert ${h}`,
    hoechstOffen: "Höchstwert nicht veröffentlicht",
    menge: (z, v) => (v != null ? `${z} von ${v} MW bezuschlagt` : `${z} MW bezuschlagt`),
    ueber: (x) => `${x}-fach überzeichnet`,
    unter: (x) => `unterzeichnet (${x} des Volumens)`,
    vorlaeufig: "provisorisch",
    termineTitel: "Termine",
    kommend: "Kommende Gebotstermine",
    keineKommend: "Für dieses Land sind derzeit keine weiteren Termine amtlich bekannt gegeben.",
    ausstehend: "Gebotstermin vorbei, Ergebnis ausstehend",
    laeuft: "Gebotsfenster offen",
    gebotstermin: "Gebotstermin",
    fenster: (a, b) => `Gebote ${a} bis ${b}`,
    volumen: (v, e = "MW") => `Volumen ${v} ${e}`,
    volumenOffen: "Volumen noch nicht bekannt gegeben",
    hoechstTermin: (h) => `Höchstwert ${h}`,
    quelle: "Quelle",
    mehr: (n) => `Alle ${n} Termine zeigen`,
    weniger: "Weniger zeigen",
    zeitreiheTitel: "Zeitreihe je Programm",
    programm: "Programm",
    ansicht: "Ansicht",
    ansichten: [
      { id: "werte", label: "Zuschlagswerte" },
      { id: "mengen", label: "Mengen" },
      { id: "tabelle", label: "Tabelle" },
    ],
    legMittel: "Ø Zuschlagswert (mengengewichtet)",
    legSpanne: "Spanne niedrigster bis höchster Zuschlag",
    legHoechst: "Höchstwert",
    legVolumen: "Ausgeschriebenes Volumen",
    legZuschlag: "Bezuschlagte Menge",
    werteAria: (p, a, b, c) => `Liniendiagramm ${p}: mengengewichtete Zuschlagswerte von ${a} bis ${b}, zuletzt ${c}. Mit Pfeiltasten durch die Gebotstermine blättern.`,
    mengenAria: (p, a, b) => `Balkendiagramm ${p}: ausgeschriebene und bezuschlagte Mengen von ${a} bis ${b} in Megawatt. Mit Pfeiltasten durch die Gebotstermine blättern.`,
    keinWert: "kein Wert veröffentlicht",
    zuschlaegeZeile: (n, m) => (n != null ? `${n} Zuschläge · ${m} MW` : `${m} MW bezuschlagt`),
    fussWerte: (stelle) => `Jeder Punkt ist ein Gebotstermin (in gleichem Abstand, unabhängig vom Datum). Quelle: ${stelle}.`,
    fussMengen: (stelle) => `Mengen je Gebotstermin in MW (Österreich: MWp). Quelle: ${stelle}.`,
    kopf: ["Gebotstermin", "Volumen MW", "Gebote MW", "Zuschläge MW", "Ø", "Spanne", "Höchstwert"],
    tabelleAria: (p) => `Tabelle ${p}, horizontal scrollbar`,
    nichtVeroeffentlicht: "– = nicht veröffentlicht",
  },
  en: {
    laender: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
    alle: "All countries",
    filter: "Country filter",
    monate: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    datum: (m, iso) => `${Number(iso.slice(8, 10))} ${m[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`,
    letzteTitel: "Latest round per programme",
    oZuschlag: "Ø award value",
    spanne: (a, b) => `awarded ${a} to ${b}`,
    hoechst: (h) => `maximum ${h}`,
    hoechstOffen: "maximum value not published",
    menge: (z, v) => (v != null ? `${z} of ${v} MW awarded` : `${z} MW awarded`),
    ueber: (x) => `${x}× oversubscribed`,
    unter: (x) => `undersubscribed (${x} of the volume)`,
    vorlaeufig: "provisional",
    termineTitel: "Dates",
    kommend: "Upcoming bidding dates",
    keineKommend: "No further dates have currently been officially announced for this country.",
    ausstehend: "Bidding date passed, result pending",
    laeuft: "Bidding window open",
    gebotstermin: "Bidding date",
    fenster: (a, b) => `Bids ${a} to ${b}`,
    volumen: (v, e = "MW") => `Volume ${v} ${e}`,
    volumenOffen: "Volume not yet announced",
    hoechstTermin: (h) => `Maximum ${h}`,
    quelle: "Source",
    mehr: (n) => `Show all ${n} dates`,
    weniger: "Show fewer",
    zeitreiheTitel: "Time series per programme",
    programm: "Programme",
    ansicht: "View",
    ansichten: [{ label: "Award values" }, { label: "Volumes" }, { label: "Table" }],
    legMittel: "Ø award value (volume-weighted)",
    legSpanne: "Range lowest to highest award",
    legHoechst: "Maximum value",
    legVolumen: "Volume tendered",
    legZuschlag: "Volume awarded",
    werteAria: (p, a, b, c) => `Line chart ${p}: volume-weighted award values from ${a} to ${b}, most recently ${c}. Use the arrow keys to move through the bidding dates.`,
    mengenAria: (p, a, b) => `Bar chart ${p}: volumes tendered and awarded from ${a} to ${b} in megawatts. Use the arrow keys to move through the bidding dates.`,
    keinWert: "no value published",
    zuschlaegeZeile: (n, m) => (n != null ? `${n} awards · ${m} MW` : `${m} MW awarded`),
    fussWerte: (stelle) => `Each point is one bidding date (evenly spaced, regardless of the date). Source: ${stelle}.`,
    fussMengen: (stelle) => `Volumes per bidding date in MW (Austria: MWp). Source: ${stelle}.`,
    kopf: ["Bidding date", "Volume MW", "Bids MW", "Awards MW", "Ø", "Range", "Maximum"],
    tabelleAria: (p) => `Table ${p}, horizontally scrollable`,
    nichtVeroeffentlicht: "– = not published",
  },
};

function useTeile() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const en = useSprache() === "en";
  return {
    t,
    f,
    en,
    datum: (iso) => t.datum(t.monate, iso),
    wert: (v, einheit) => (v == null ? "–" : `${f.fmt(v, einheit === "CHF/kW" && Number.isInteger(v) ? 0 : 2)} ${einheit}`),
    zahl: (v, s = 2) => (v == null ? "–" : f.fmt(v, s)),
    mw: (v) => (v == null ? "–" : f.fmt(v, v >= 100 ? 0 : 1)),
  };
}

/**
 * props:
 *  serien   [{ id, land, name, nameEn, kurz, kurzEn, einheit, stelle, runden: [...] }]
 *  termine  { kommend: [...], ausstehend: [...] } (aus termineAm)
 *  quellen  { schluessel: { titel, titelEn, url } }
 *  land     Land der Seite ("DE" | "AT" | "CH") oder null (gemeinsame Seite → Länderfilter)
 */
export default function AusschreibungsMonitor({ serien, termine, quellen, land = null }) {
  const { t } = useTeile();
  const [filter, setFilter] = useState(land || "alle");
  const sichtbar = useMemo(() => serien.filter((s) => filter === "alle" || s.land === filter), [serien, filter]);
  const ids = new Set(sichtbar.map((s) => s.id));
  const kommend = termine.kommend.filter((x) => ids.has(x.serie));
  const ausstehend = termine.ausstehend.filter((x) => ids.has(x.serie));
  const laenderDa = [...new Set(serien.map((s) => s.land))];

  return (
    <div>
      {!land && laenderDa.length > 1 && (
        <Umschalter
          label={t.filter}
          optionen={[{ id: "alle", label: t.alle }, ...laenderDa.map((l) => ({ id: l, label: t.laender[l], kurz: l }))]}
          wert={filter}
          setWert={setFilter}
        />
      )}

      <h3 className="mt-10 font-display text-[20px] font-bold text-ink-900">{t.letzteTitel}</h3>
      <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sichtbar.map((s) => (
          <ProgrammKarte key={s.id} serie={s} zeigeLand={!land} />
        ))}
      </ul>

      <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-10">
        <TerminListe
          titel={t.kommend}
          icon={CalendarDays}
          eintraege={kommend}
          leer={t.keineKommend}
          serien={serien}
          quellen={quellen}
          zeigeLand={!land}
        />
        {ausstehend.length > 0 && (
          <TerminListe titel={t.ausstehend} icon={Hourglass} eintraege={ausstehend} serien={serien} quellen={quellen} zeigeLand={!land} />
        )}
      </div>

      <h3 className="mt-14 font-display text-[20px] font-bold text-ink-900">{t.zeitreiheTitel}</h3>
      <Zeitreihe key={filter} serien={sichtbar} zeigeLand={!land} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Umschalter({ label, optionen, wert, setWert, klein = false }) {
  return (
    <div role="group" aria-label={label} className="ov-no-scrollbar -mx-1 flex overflow-x-auto px-1 sm:overflow-visible">
      <div className="inline-flex rounded-2xl bg-ink-100 p-1 sm:flex-wrap">
        {optionen.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={wert === o.id}
            onClick={() => setWert(o.id)}
            className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 font-semibold transition-colors sm:px-4 ${klein ? "text-[13px]" : "text-[13.5px]"} ${
              wert === o.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {o.kurz && <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10.5px] font-bold text-navy-700 ring-1 ring-inset ring-navy-100">{o.kurz}</span>}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LandMarke({ land }) {
  return <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">{land}</span>;
}

function ProgrammKarte({ serie: s, zeigeLand }) {
  const { t, en, f, datum, wert, mw } = useTeile();
  const mitWert = s.runden.filter((x) => x.mittel != null);
  const l = mitWert[mitWert.length - 1];
  if (!l) return null;
  const ueber = l.gebote != null && l.volumen ? l.gebote / l.volumen : null;
  return (
    <li className="flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[17px] font-bold leading-snug text-ink-900">{en ? s.nameEn : s.name}</p>
          <p className="mt-1 text-[13.5px] text-ink-600">{en ? s.kurzEn : s.kurz}</p>
        </div>
        {zeigeLand && <LandMarke land={s.land} />}
      </div>
      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        {t.oZuschlag} · {datum(l.datum)}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="ov-num font-display text-[30px] font-bold leading-tight text-ink-900">{f.fmt(l.mittel, 2)}</span>
        <span className="text-[14px] font-bold text-ink-500">{s.einheit}</span>
        {l.vorlaeufig && <span className="rounded-full bg-sun-50 px-2 py-0.5 text-[11.5px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">{t.vorlaeufig}</span>}
      </p>
      <ul className="mt-4 space-y-1.5 text-[14px] leading-relaxed text-ink-700">
        <li>{t.spanne(wert(l.min, s.einheit), wert(l.max, s.einheit))}</li>
        <li>{l.hoechst != null ? t.hoechst(wert(l.hoechst, s.einheit)) : <span className="text-ink-500">{t.hoechstOffen}</span>}</li>
        <li>
          {t.menge(mw(l.zuschlag), l.volumen != null ? mw(l.volumen) : null)}
          {ueber != null && <span className="text-ink-500"> · {ueber >= 1 ? t.ueber(f.fmt(ueber, 1)) : t.unter(f.pct(ueber * 100))}</span>}
        </li>
      </ul>
    </li>
  );
}

const TERMINE_SICHTBAR = 6;

/** Herausgebende Stelle in der Sprache der Seite (Bundesnetzagentur und Pronovo sind Eigennamen). */
const STELLE_EN = { "EAG-Förderabwicklungsstelle": "EAG funding settlement agency (EAG-Förderabwicklungsstelle)" };
const stelleText = (s, en) => (en ? STELLE_EN[s.stelle] || s.stelle : s.stelle);

function TerminListe({ titel, icon: Icon, eintraege, leer, serien, quellen, zeigeLand }) {
  const { t, en, datum, wert, mw } = useTeile();
  const [alle, setAlle] = useState(false);
  const liste = alle ? eintraege : eintraege.slice(0, TERMINE_SICHTBAR);
  return (
    <div>
      <h3 className="inline-flex items-center gap-2 font-display text-[19px] font-bold text-ink-900">
        <Icon aria-hidden="true" className="h-5 w-5 text-ov-600" />
        {titel}
      </h3>
      {eintraege.length === 0 ? (
        <p className="mt-4 rounded-3xl bg-sand-50 p-5 text-[14.5px] text-ink-600 ring-1 ring-ink-200/60">{leer}</p>
      ) : (
        <>
          <ol className="mt-4 divide-y divide-ink-100 rounded-3xl bg-white ring-1 ring-ink-200/70">
            {liste.map((x) => {
              const s = serien.find((y) => y.id === x.serie);
              const q = quellen[x.quelle];
              return (
                <li key={`${x.serie}-${x.datum}`} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="ov-num text-[14.5px] font-bold text-ink-900">{x.beginn ? t.fenster(datum(x.beginn), datum(x.datum)) : datum(x.datum)}</p>
                    {zeigeLand && <LandMarke land={s.land} />}
                    {x.laufend && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ov-50 px-2 py-0.5 text-[11.5px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-200">
                        <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                        {t.laeuft}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[14.5px] font-medium text-ink-800">{en ? s.nameEn : s.name}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">
                    {x.volumen != null ? t.volumen(mw(x.volumen), s.land === "AT" ? "MWp" : "MW") : t.volumenOffen}
                    {x.hoechst != null && ` · ${t.hoechstTermin(wert(x.hoechst, s.einheit))}`}
                    {q && (
                      <>
                        {" · "}
                        <a href={q.url} target="_blank" rel="noopener noreferrer" title={en ? q.titelEn : q.titel} className="underline decoration-ink-300 underline-offset-2 hover:text-ov-700">
                          {t.quelle}
                          <span className="sr-only">: {en ? q.titelEn : q.titel}</span>
                        </a>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
          {eintraege.length > TERMINE_SICHTBAR && (
            <button
              type="button"
              aria-expanded={alle}
              onClick={() => setAlle((a) => !a)}
              className="mt-3 inline-flex min-h-10 items-center rounded-xl px-2 text-[14px] font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
            >
              {alle ? t.weniger : t.mehr(eintraege.length)}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Zeitreihe({ serien, zeigeLand }) {
  const { t, en } = useTeile();
  const [id, setId] = useState(serien[0]?.id);
  const [ansicht, setAnsicht] = useState("werte");
  const s = serien.find((x) => x.id === id) || serien[0];
  if (!s) return null;
  const name = `${en ? s.nameEn : s.name}${zeigeLand ? ` (${s.land})` : ""}`;
  return (
    <div className="mt-5 rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4">
        {serien.length > 1 && (
          <Umschalter label={t.programm} optionen={serien.map((x) => ({ id: x.id, label: en ? x.nameEn : x.name, kurz: zeigeLand ? x.land : undefined }))} wert={s.id} setWert={setId} />
        )}
        <Umschalter label={t.ansicht} optionen={t.ansichten.map((a, i) => ({ id: TEXTE.de.ansichten[i].id, label: a.label }))} wert={ansicht} setWert={setAnsicht} klein />
      </div>
      <div className="mt-6">
        {ansicht === "werte" && <WerteDiagramm key={s.id} serie={s} name={name} />}
        {ansicht === "mengen" && <MengenDiagramm key={s.id} serie={s} name={name} />}
        {ansicht === "tabelle" && <Tabelle serie={s} name={name} />}
      </div>
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

/** „Schöne“ Achsenschritte für einen Wertebereich */
function achse(lo, hi, ziel = 6) {
  const roh = Math.max((hi - lo) / ziel, 1e-9);
  const p = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= roh) || 10 * p;
  const a = Math.floor(lo / schritt) * schritt;
  const b = Math.ceil(hi / schritt) * schritt;
  const ticks = [];
  for (let v = a; v <= b + schritt / 2; v += schritt) ticks.push(Number(v.toFixed(6)));
  return { lo: a, hi: b, ticks };
}

function useGeometrie(breite, n, yMin, yMax) {
  const H = breite < 520 ? 280 : 340;
  const m = { l: breite < 520 ? 44 : 52, r: 12, t: 26, b: 30 };
  const pw = Math.max(10, breite - m.l - m.r);
  const ph = H - m.t - m.b;
  const band = pw / Math.max(1, n);
  return { H, m, pw, ph, band, x: (i) => m.l + band * (i + 0.5), y: (v) => m.t + (1 - (v - yMin) / (yMax - yMin || 1)) * ph };
}

function Flaeche({ g, n, aktiv, setAktiv, label, breite, children }) {
  const ausPos = (clientX, el) => {
    const r = el.getBoundingClientRect();
    setAktiv(Math.max(0, Math.min(n - 1, Math.floor((clientX - r.left - g.m.l) / g.band))));
  };
  return (
    <svg
      width="100%"
      height={g.H}
      viewBox={`0 0 ${breite} ${g.H}`}
      className="block touch-pan-y select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2"
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

function JahresMarken({ daten, g, breite }) {
  const starts = daten.map((a, i) => ({ i, jahr: a.datum.slice(0, 4) })).filter((d, k, arr) => k === 0 || arr[k - 1].jahr !== d.jahr);
  // Jahreszahlen dürfen sich nicht überlappen (z. B. AT: 2022 nur eine Runde): Mindestabstand 34 px
  let letzteX = -Infinity;
  return starts.map((d) => {
    const x = g.m.l + g.band * d.i;
    if (x - letzteX < 34) return null;
    letzteX = x;
    return (
      <text key={d.jahr} x={x} y={g.H - 10} fontSize="11.5" fill={FARBE.achse} className="ov-num">
        {d.jahr}
      </text>
    );
  }
  );
}

/** Pfad aus Punkten; Lücken (null) unterbrechen die Linie */
function pfadAus(punkte) {
  let d = "";
  let neu = true;
  for (const p of punkte) {
    if (!p) {
      neu = true;
      continue;
    }
    d += `${neu ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    neu = false;
  }
  return d;
}

function WerteDiagramm({ serie: s, name }) {
  const { t, f, en, datum, wert, mw } = useTeile();
  const [ref, breite] = useBreite(760);
  const [aktiv, setAktiv] = useState(null);
  const daten = s.runden;
  const n = daten.length;
  const werte = daten.flatMap((a) => [a.mittel, a.min, a.max, a.hoechst]).filter((v) => v != null);
  const { lo, hi, ticks } = achse(Math.min(...werte), Math.max(...werte), 5);
  const g = useGeometrie(breite, n, lo, hi);
  const linie = pfadAus(daten.map((a, i) => (a.mittel != null ? [g.x(i), g.y(a.mittel)] : null)));
  const mitSpanne = daten.map((a, i) => ({ a, i })).filter(({ a }) => a.min != null && a.max != null);
  const flaeche = mitSpanne.length > 1 ? pfadAus(mitSpanne.map(({ a, i }) => [g.x(i), g.y(a.max)])) + [...mitSpanne].reverse().map(({ a, i }) => `L${g.x(i).toFixed(1)},${g.y(a.min).toFixed(1)}`).join("") + "Z" : "";
  const hoechst = daten
    .map((a, i) => (a.hoechst == null ? "" : `M${(g.m.l + g.band * i).toFixed(1)},${g.y(a.hoechst).toFixed(1)}L${(g.m.l + g.band * (i + 1)).toFixed(1)},${g.y(a.hoechst).toFixed(1)}`))
    .join("");
  const mitWert = daten.map((a, i) => ({ a, i })).filter(({ a }) => a.mittel != null);
  const letzte = mitWert[mitWert.length - 1];
  const a = aktiv != null ? daten[aktiv] : null;
  const fmtAchse = (v) => f.fmt(v, Math.abs(hi - lo) < 20 ? 1 : 0);

  return (
    <figure>
      <Legende
        eintraege={[
          { art: "linie", farbe: FARBE.mittel, label: t.legMittel },
          { art: "flaeche", farbe: FARBE.spanne, label: t.legSpanne },
          ...(daten.some((x) => x.hoechst != null) ? [{ art: "strich", farbe: FARBE.hoechst, label: t.legHoechst }] : []),
        ]}
      />
      <div ref={ref} className="relative">
        <Flaeche g={g} n={n} aktiv={aktiv} setAktiv={setAktiv} breite={breite} label={t.werteAria(name, datum(daten[0].datum), datum(daten[n - 1].datum), letzte ? wert(letzte.a.mittel, s.einheit) : "–")}>
          <YAchse g={g} ticks={ticks} format={fmtAchse} breite={breite} />
          <text x={2} y={10} fontSize="10.5" fill={FARBE.achse}>
            {s.einheit}
          </text>
          <JahresMarken daten={daten} g={g} breite={breite} />
          <g>
            {flaeche && <path d={flaeche} fill={FARBE.spanne} className="ov-flaeche-ein" />}
            <g className="ov-flaeche-ein">
              <path d={hoechst} fill="none" stroke={FARBE.hoechst} strokeWidth="2" strokeDasharray="5 4" />
            </g>
            <path d={linie} pathLength="1" fill="none" stroke={FARBE.mittel} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="ov-linie" />
            {n < 12 && mitWert.map(({ a: p, i }) => <circle key={p.datum} cx={g.x(i)} cy={g.y(p.mittel)} r="3" fill={FARBE.mittel} />)}
          </g>
          {a && (
            <g>
              <line x1={g.x(aktiv)} x2={g.x(aktiv)} y1={g.m.t} y2={g.H - g.m.b} stroke="#151a24" strokeOpacity="0.35" strokeWidth="1" />
              {a.mittel != null && <circle cx={g.x(aktiv)} cy={g.y(a.mittel)} r="5" fill={FARBE.mittel} stroke="#fff" strokeWidth="2" />}
            </g>
          )}
          {letzte && (
            <g className="ov-flaeche-ein" style={{ animationDelay: "1000ms" }}>
              <circle cx={g.x(letzte.i)} cy={g.y(letzte.a.mittel)} r="4" fill={FARBE.mittel} stroke="#fff" strokeWidth="2" />
              <text x={g.x(letzte.i) - 8} y={g.y(letzte.a.mittel) + 20} textAnchor="end" fontSize="12" fontWeight="700" fill="#151a24" className="ov-num">
                {f.fmt(letzte.a.mittel, 2)}
              </text>
            </g>
          )}
        </Flaeche>
        {a && (
          <Tooltip x={g.x(aktiv)} y={g.y(a.hoechst ?? a.max ?? a.mittel ?? lo) - 10} breite={breite}>
            <p className="font-semibold">{datum(a.datum)}</p>
            <p>
              Ø <strong className="ov-num">{a.mittel != null ? wert(a.mittel, s.einheit) : t.keinWert}</strong>
            </p>
            {a.min != null && <p className="text-white/75">{t.spanne(wert(a.min, s.einheit), wert(a.max, s.einheit))}</p>}
            {a.hoechst != null && <p className="text-white/75">{t.hoechst(wert(a.hoechst, s.einheit))}</p>}
            <p className="text-white/75">{t.zuschlaegeZeile(a.nZuschlaege, mw(a.zuschlag))}</p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{t.fussWerte(stelleText(s, en))}</figcaption>
    </figure>
  );
}

function MengenDiagramm({ serie: s, name }) {
  const { t, f, en, datum, mw } = useTeile();
  const [ref, breite] = useBreite(760);
  const [aktiv, setAktiv] = useState(null);
  const daten = s.runden;
  const n = daten.length;
  const { hi, ticks } = achse(0, Math.max(...daten.map((d) => Math.max(d.volumen || 0, d.zuschlag || 0, d.gebote || 0))), 5);
  const g = useGeometrie(breite, n, 0, hi);
  const bw = Math.max(2, Math.min(18, (g.band - 6) / 2));
  const a = aktiv != null ? daten[aktiv] : null;
  const balken = (x, v, farbe, key, i) => {
    if (v == null) return null;
    const y0 = g.y(0);
    const y1 = g.y(v);
    const h = Math.max(0, y0 - y1);
    const r = Math.min(3, h, bw / 2);
    return <path key={key} d={`M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`} fill={farbe} className="ov-balken-y" style={{ "--i": i }} />;
  };
  return (
    <figure>
      <Legende
        eintraege={[
          { art: "balken", farbe: FARBE.volumen, label: t.legVolumen },
          { art: "balken", farbe: FARBE.zuschlag, label: t.legZuschlag },
        ]}
      />
      <div ref={ref} className="relative">
        <Flaeche g={g} n={n} aktiv={aktiv} setAktiv={setAktiv} breite={breite} label={t.mengenAria(name, datum(daten[0].datum), datum(daten[n - 1].datum))}>
          <YAchse g={g} ticks={ticks} format={(v) => f.fmt(v)} breite={breite} />
          <text x={2} y={10} fontSize="10.5" fill={FARBE.achse}>
            MW
          </text>
          <JahresMarken daten={daten} g={g} breite={breite} />
          {a && <rect x={g.m.l + g.band * aktiv + 1} y={g.m.t} width={Math.max(0, g.band - 2)} height={g.ph} rx="6" fill="#151a24" fillOpacity="0.04" />}
          {daten.map((d, i) => (
            <g key={d.datum}>
              {balken(g.x(i) - bw - 0.5, d.volumen, FARBE.volumen, "v", i / 2)}
              {balken(g.x(i) + 0.5, d.zuschlag, FARBE.zuschlag, "z", i / 2 + 0.25)}
            </g>
          ))}
        </Flaeche>
        {a && (
          <Tooltip x={g.x(aktiv)} y={g.y(Math.max(a.volumen || 0, a.zuschlag || 0)) - 10} breite={breite}>
            <p className="font-semibold">{datum(a.datum)}</p>
            <p>
              {t.legVolumen}: <strong className="ov-num">{mw(a.volumen)} MW</strong>
            </p>
            {a.gebote != null && (
              <p>
                {t.kopf[2]}: <strong className="ov-num">{mw(a.gebote)}</strong>
              </p>
            )}
            <p>
              {t.legZuschlag}: <strong className="ov-num">{mw(a.zuschlag)} MW</strong>
            </p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{t.fussMengen(stelleText(s, en))}</figcaption>
    </figure>
  );
}

function Tabelle({ serie: s, name }) {
  const { t, en, datum, zahl, mw } = useTeile();
  const notizen = s.runden.filter((x) => x.notiz);
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1" tabIndex={0} role="region" aria-label={t.tabelleAria(name)}>
        <table className="w-full min-w-[720px] border-collapse text-left text-[13.5px]">
          <caption className="sr-only">{name}</caption>
          <thead>
            <tr className="border-b border-ink-200 text-[12px] uppercase tracking-[0.08em] text-ink-500">
              {t.kopf.map((k, i) => (
                <th key={k} scope="col" className={`py-2.5 pr-3 font-semibold ${i > 0 ? "text-right" : ""}`}>
                  {i >= 4 ? `${k} ${s.einheit}` : k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...s.runden].reverse().map((a) => (
              <tr key={a.datum} className="border-b border-ink-100 text-ink-700">
                <th scope="row" className="py-2 pr-3 font-medium text-ink-900">
                  {datum(a.datum)}
                  {a.notiz ? <sup aria-hidden="true">*</sup> : null}
                </th>
                <td className="ov-num py-2 pr-3 text-right">{mw(a.volumen)}</td>
                <td className="ov-num py-2 pr-3 text-right">{mw(a.gebote)}</td>
                <td className="ov-num py-2 pr-3 text-right">{mw(a.zuschlag)}</td>
                <td className="ov-num py-2 pr-3 text-right font-semibold text-ink-900">{zahl(a.mittel)}</td>
                <td className="ov-num py-2 pr-3 text-right">{a.min != null ? `${zahl(a.min)}–${zahl(a.max)}` : "–"}</td>
                <td className="ov-num py-2 text-right">{zahl(a.hoechst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{t.nichtVeroeffentlicht}</p>
      {notizen.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12.5px] leading-relaxed text-ink-500">
          {notizen.map((x) => (
            <li key={x.datum}>
              * {datum(x.datum)}: {en && x.notizEn ? x.notizEn : x.notiz}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

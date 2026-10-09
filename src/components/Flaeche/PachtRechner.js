"use client";

import { SperrEingaben } from "@/components/Rechner/LaenderSperre";
import { useMemo, useState } from "react";
import { CalendarClock, Coins, HandCoins, Sun, TrendingUp, Wheat } from "lucide-react";
import ZumFlaechencheck from "@/components/Flaeche/Seite/ZumFlaechencheck";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { PACHT, REGIONEN } from "@/lib/invest/markt";
import { PACHTMODELLE, REGION_KURZ, pachtRechnung } from "@/lib/rechner/pacht";
import { landVonRegion } from "@/lib/invest/markt";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";

const FARBE = { solar: "#669933", db: "#f5a70f", acker: "#97a0b0", raster: "#eef0f4" };
const tsdStellen = (v) => (v >= 1e6 ? 0 : v >= 1e5 ? 0 : 1);

// Sprachmodell: Texte des Rechners (Zahlen im Format der Sprache über useFormate)
const TEXTE = {
  de: {
    region: "Region",
    regionLabel: (id, label) => label,
    pachtJahr: "Pacht/Jahr",
    jahre: (n) => `${n} Jahre`,
    ggAckerpacht: "ggü. Ackerpacht",
    ggAckerbau: "ggü. Ackerbau",
    flaeche: "Fläche",
    flaechengroesse: "Flächengröße",
    flaecheHinweis: (f, mwp, gwh) => `≈ ${f.fmt(mwp, 1)} MWp Solarpark, ${f.fmt(gwh, 1)} GWh Strom pro Jahr`,
    pachtmodell: "Pachtmodell",
    modell: "Modell",
    modelle: { fest: ["Festpacht", "€/ha, gleichbleibend"], index: ["Indexiert", "€/ha + Inflation"], umsatz: ["Umsatz", "% der Stromerlöse"] },
    startpacht: "Startpacht",
    pacht: "Pacht",
    proHa: (f, v) => `${f.fmt(v)} €/ha`,
    spanne: (f, min, max, idx) => `Übliche Spanne ${f.fmt(min)}–${f.fmt(max)} €/ha${idx != null ? `, danach +${f.fmt(idx, 1)} % pro Jahr` : ""}`,
    anteil: "Anteil an den Stromerlösen",
    anteilHinweis: (f, min, max) => `Üblich ${f.fmt(min)}–${f.fmt(max)} % – gerechnet mit EEG-Wert, nach 20 Jahren mit Marktwert`,
    mindestpacht: "Mindestpacht",
    keine: "keine",
    laufzeit: "Laufzeit",
    einheitJahre: "Jahre",
    laufzeitHinweis: (n, v) => `Üblich ${n} Jahre + ${v}`,
    vorlauf: "Vorlauf bis Baubeginn",
    vorlaufText: "Reservierungsprämie, Fläche wird weiter bewirtschaftet",
    jahreBis: "Jahre bis Baubeginn",
    einheitJ: "J.",
    vergleich: "Vergleich Landwirtschaft",
    ackerpacht: "Heutige Ackerpacht",
    ackerHinweis: (f, v) => `Durchschnitt Deutschland rund ${f.fmt(v)} €/ha`,
    db: "Deckungsbeitrag Ackerbau",
    dbHinweis: (f, min, max) => `Getreide typisch ${f.fmt(min)}–${f.fmt(max)} €/ha, stark schwankend`,
    sr: (a, n, b) => `Pacht im ersten Betriebsjahr ${a} Euro, über ${n} Jahre ${b} Euro.`,
    ihrePacht: "Ihre Pacht",
    pacht1: "Pacht 1. Betriebsjahr",
    summe: (n) => `Summe ${n} Jahre`,
    proJahrSchnitt: (x) => `Ø ${x} pro Jahr`,
    kumuliert: "Kumulierte Einnahmen",
    zeigen: "Zeigen oder tippen für Jahreswerte",
    umsatzHinweis: (f, gwh) => `Umsatzbeteiligung auf ${f.fmt(gwh, 1)} GWh Jahresertrag (−0,4 % pro Jahr Degradation). Steigen die Strompreise nach Ende der Förderung, steigt auch Ihre Pacht – fallen sie, greift die Mindestpacht.`,
    weiter: "Mit diesem Ergebnis weiter",
    proJahrPruefen: "pro Jahr – unverbindlich prüfen lassen",
    uebernehmen: "Größe und Region übernehmen wir in den Flächencheck.",
    pruefen: "Mit diesem Ergebnis prüfen",
    nominal: "Nominal und vor Steuern – eine Orientierung, kein Angebot. Das konkrete Pachtangebot hängt von Netzanschluss, Kulisse und Baurecht ab.",
    vorlaufKurz: "Vorlauf",
    achse: (f, v) => (v >= 1e6 ? `${f.fmt(v / 1e6, 1)} Mio.` : `${f.fmt(v / 1000)} Tsd.`),
    jahrKurz: (j) => `${j} J.`,
    aria: (n, a, b, c) => `Diagramm: Nach ${n} Jahren summiert sich die Solarpacht auf ${a} Euro, der Deckungsbeitrag im Ackerbau auf ${b} Euro und die Ackerpacht auf ${c} Euro.`,
    jahr: "Jahr",
    solarpacht: "Solarpacht",
    summeSolar: "Summe Solar",
    summeAckerbau: "Summe Ackerbau",
    summeAckerpacht: "Summe Ackerpacht",
    legendeDb: "Deckungsbeitrag Ackerbau",
    legendeAcker: "Ackerpacht",
  },
  en: {
    region: "Region",
    regionLabel: (id, label) => regionEn(id, "kurz", label),
    pachtJahr: "Lease/year",
    jahre: (n) => `${n} years`,
    ggAckerpacht: "vs. arable lease",
    ggAckerbau: "vs. arable farming",
    flaeche: "Land",
    flaechengroesse: "Plot size",
    flaecheHinweis: (f, mwp, gwh) => `≈ ${f.fmt(mwp, 1)} MWp solar park, ${f.fmt(gwh, 1)} GWh of electricity per year`,
    pachtmodell: "Lease model",
    modell: "Model",
    modelle: { fest: ["Fixed lease", "€/ha, constant"], index: ["Indexed", "€/ha + inflation"], umsatz: ["Revenue", "% of power revenue"] },
    startpacht: "Starting lease",
    pacht: "Lease",
    proHa: (f, v) => f.eur(v, "/ha"),
    spanne: (f, min, max, idx) => `Typical range ${f.eur(min)}–${f.eur(max, "/ha")}${idx != null ? `, then +${f.pct(idx, 1)} per year` : ""}`,
    anteil: "Share of power revenue",
    anteilHinweis: (f, min, max) => `Typically ${f.fmt(min)}–${f.pct(max)} – calculated with the EEG value, after 20 years with the market value`,
    mindestpacht: "Minimum lease",
    keine: "none",
    laufzeit: "Term",
    einheitJahre: "years",
    laufzeitHinweis: (n, v) => `Typically ${n} years + ${String(v).replace(/ Jahre Option$/, "-year option")}`,
    vorlauf: "Lead time until construction",
    vorlaufText: "Reservation fee; the land continues to be farmed",
    jahreBis: "Years until construction",
    einheitJ: "yrs",
    vergleich: "Comparison with farming",
    ackerpacht: "Current arable lease",
    ackerHinweis: (f, v) => `German average around ${f.eur(v, "/ha")}`,
    db: "Gross margin, arable farming",
    dbHinweis: (f, min, max) => `Cereals typically ${f.eur(min)}–${f.eur(max, "/ha")}, highly variable`,
    sr: (a, n, b) => `Lease in the first operating year ${a} euros, over ${n} years ${b} euros.`,
    ihrePacht: "Your lease",
    pacht1: "Lease, 1st operating year",
    summe: (n) => `Total over ${n} years`,
    proJahrSchnitt: (x) => `Ø ${x} per year`,
    kumuliert: "Cumulative income",
    zeigen: "Hover or tap for annual values",
    umsatzHinweis: (f, gwh) => `Revenue share based on ${f.fmt(gwh, 1)} GWh annual yield (−0.4% degradation per year). If electricity prices rise after the subsidy ends, your lease rises too – if they fall, the minimum lease applies.`,
    weiter: "Take this result further",
    proJahrPruefen: "per year – have it checked without obligation",
    uebernehmen: "We carry the size and region over into the land check.",
    pruefen: "Check with this result",
    nominal: "Nominal and before tax – for guidance only, not an offer. The actual lease offer depends on the grid connection, eligible area and planning law.",
    vorlaufKurz: "Lead time",
    achse: (f, v) => (v >= 1e6 ? `${f.fmt(v / 1e6, 1)}m` : `${f.fmt(v / 1000)}k`),
    jahrKurz: (j) => `${j} yrs`,
    aria: (n, a, b, c) => `Chart: after ${n} years, the solar lease adds up to ${a} euros, the gross margin from arable farming to ${b} euros and the arable lease to ${c} euros.`,
    jahr: "Year",
    solarpacht: "Solar lease",
    summeSolar: "Total solar",
    summeAckerbau: "Total arable farming",
    summeAckerpacht: "Total arable lease",
    legendeDb: "Gross margin, arable farming",
    legendeAcker: "Arable lease",
  },
};

// `start` (optional): Vorbelegung, z. B. von der personalisierten Angebotsseite /angebot/[code] – { ha, regionId, proHa }
export default function PachtRechner({ start = {} } = {}) {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  const tsd = (v) => f.tsd(v, tsdStellen(v));
  const modellLabel = (id) => t.modelle[id]?.[0] ?? PACHTMODELLE.find((m) => m.id === id)?.label;
  const MODELLE = PACHTMODELLE.map((m) => ({ ...m, label: t.modelle[m.id]?.[0] ?? m.label, sub: t.modelle[m.id]?.[1] ?? m.sub }));
  const [ha, setHa] = useState(Number(start.ha) > 0 ? Math.round(Number(start.ha) * 10) / 10 : 10);
  const [regionId, setRegionId] = useState(() => (REGIONEN.some((x) => x.id === start.regionId) ? start.regionId : landStart({ regionId: "de-sued" }, seitenLand).regionId));
  const [modell, setModell] = useState("fest");
  const [proHa, setProHa] = useState(Number(start.proHa) > 0 ? Number(start.proHa) : PACHT.freiflaecheProHa.mittel);
  const [umsatzPct, setUmsatzPct] = useState(6);
  const [mindestProHa, setMindestProHa] = useState(PACHT.freiflaecheProHa.min);
  const [laufzeit, setLaufzeit] = useState(PACHT.laufzeit);
  const [ackerProHa, setAckerProHa] = useState(PACHT.ackerProHa);
  const [dbProHa, setDbProHa] = useState(PACHT.deckungsbeitragAcker.mittel);
  const [vorlauf, setVorlauf] = useState(false);
  const [vorlaufJahre, setVorlaufJahre] = useState(2);

  // Eingaben der Rechnung – dieselben gehen an den Bericht (Paket B4: der Server rechnet damit neu)
  const eingaben = useMemo(
    () => ({
      ha,
      regionId,
      modell,
      proHa,
      umsatzAnteil: umsatzPct / 100,
      mindestProHa,
      laufzeit,
      ackerProHa,
      dbProHa,
      vorlaufJahre: vorlauf ? vorlaufJahre : 0,
      reservierungProHa: (PACHT.reservierungProHa.min + PACHT.reservierungProHa.max) / 2,
    }),
    [ha, regionId, modell, proHa, umsatzPct, mindestProHa, laufzeit, ackerProHa, dbProHa, vorlauf, vorlaufJahre]
  );
  const r = useMemo(() => pachtRechnung(eingaben), [eingaben]);

  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard bzw. von der Vorbelegung)
  const SETZER = {
    ha: setHa, regionId: setRegionId, modell: setModell, proHa: setProHa, umsatzPct: setUmsatzPct, mindestProHa: setMindestProHa,
    laufzeit: setLaufzeit, ackerProHa: setAckerProHa, dbProHa: setDbProHa, vorlauf: setVorlauf, vorlaufJahre: setVorlaufJahre,
  };
  useTeilbarerZustand(
    { ha, regionId, modell, proHa, umsatzPct, mindestProHa, laufzeit, ackerProHa, dbProHa, vorlauf, vorlaufJahre },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { regionId: REGIONEN.map((x) => x.id), modell: PACHTMODELLE.map((m) => m.id) },
      grenzen: { ha: [1, 100], proHa: [1000, 5000], umsatzPct: [3, 10], mindestProHa: [0, 3000], laufzeit: [20, 40], ackerProHa: [100, 1200], dbProHa: [0, 1500], vorlaufJahre: [1, 4] },
    }
  );

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende={t.region}
      wert={regionId}
      onChange={setRegionId}
      spalten={3}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, REGION_KURZ[x.id] || x.label), sub: `${fmt(x.ertrag)} kWh/kWp` }))}
    />
  );

  return (
    <RechnerRahmen
      mitlaufend
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              [t.pachtJahr, fmtEur(r.ersteJahrespacht)],
              [t.jahre(laufzeit), tsd(r.summeSolar)],
              [t.ggAckerpacht, r.faktorAcker ? `${fmt(r.faktorAcker, 1)}×` : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.flaeche}>
              <Regler label={t.flaechengroesse} wert={ha} min={1} max={100} step={0.5} stellen={ha % 1 ? 1 : 0} einheit="ha" onChange={setHa} hinweis={t.flaecheHinweis(f, r.kwp / 1000, r.kwh / 1e6)} />
              {regionWahl}
            </Gruppe>

            <Gruppe titel={t.pachtmodell}>
              <Auswahl legende={t.modell} wert={modell} onChange={setModell} optionen={MODELLE} />
              {modell !== "umsatz" ? (
                <Regler
                  label={modell === "index" ? t.startpacht : t.pacht}
                  wert={proHa}
                  min={1000}
                  max={5000}
                  step={100}
                  format={(v) => t.proHa(f, v)}
                  onChange={setProHa}
                  hinweis={t.spanne(f, PACHT.freiflaecheProHa.min, PACHT.freiflaecheProHa.max, modell === "index" ? PACHT.indexierung * 100 : null)}
                />
              ) : (
                <>
                  <Regler label={t.anteil} wert={umsatzPct} min={3} max={10} step={0.5} stellen={umsatzPct % 1 ? 1 : 0} einheit="%" onChange={setUmsatzPct} hinweis={t.anteilHinweis(f, PACHT.umsatzbeteiligung.min * 100, PACHT.umsatzbeteiligung.max * 100)} />
                  <Regler label={t.mindestpacht} wert={mindestProHa} min={0} max={3000} step={100} format={(v) => (v ? t.proHa(f, v) : t.keine)} onChange={setMindestProHa} />
                </>
              )}
              <Regler label={t.laufzeit} wert={laufzeit} min={20} max={40} step={1} einheit={t.einheitJahre} onChange={setLaufzeit} hinweis={t.laufzeitHinweis(PACHT.laufzeit, PACHT.verlaengerung)} />
              <Schalter icon={CalendarClock} label={t.vorlauf} beschreibung={t.vorlaufText} an={vorlauf} onChange={setVorlauf}>
                <Regler label={t.jahreBis} wert={vorlaufJahre} min={1} max={4} step={1} einheit={t.einheitJ} onChange={setVorlaufJahre} />
              </Schalter>
            </Gruppe>

            <Gruppe titel={t.vergleich}>
              <Regler label={t.ackerpacht} wert={ackerProHa} min={100} max={1200} step={10} format={(v) => t.proHa(f, v)} onChange={setAckerProHa} hinweis={t.ackerHinweis(f, PACHT.ackerProHa)} />
              <Regler label={t.db} wert={dbProHa} min={0} max={1500} step={10} format={(v) => t.proHa(f, v)} onChange={setDbProHa} hinweis={t.dbHinweis(f, PACHT.deckungsbeitragAcker.min, PACHT.deckungsbeitragAcker.max)} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(Math.round(r.ersteJahrespacht), laufzeit, Math.round(r.summeSolar))}
          </p>
          <ErgebnisKopf titel={t.ihrePacht} plakette={`${fmt(ha, ha % 1 ? 1 : 0)} ha · ${modellLabel(modell)}`} />

          <Hauptzahl className="mt-5" icon={HandCoins} label={t.pacht1} zusatz={t.proHa(f, r.proHaErstesJahr)}>
            <Zahl wert={Math.round(r.ersteJahrespacht)} format={(v) => fmtEur(v)} />
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={Coins} label={t.summe(r.jahre.length)} zusatz={t.proJahrSchnitt(fmtEur(r.durchschnitt))}>
              {tsd(r.summeSolar)}
            </Kennzahl>
            <Kennzahl icon={Wheat} label={t.ggAckerpacht} zusatz={`+${tsd(r.mehrGgAcker)}`}>
              {r.faktorAcker ? <Zahl wert={r.faktorAcker} stellen={1} suffix="×" /> : "–"}
            </Kennzahl>
            <Kennzahl icon={TrendingUp} label={t.ggAckerbau} zusatz={r.mehrGgDb >= 0 ? `+${tsd(r.mehrGgDb)}` : `−${tsd(-r.mehrGgDb)}`}>
              {r.faktorDb ? <Zahl wert={r.faktorDb} stellen={1} suffix="×" /> : "∞"}
            </Kennzahl>
          </Belege>

          <div className="mt-7 rounded-3xl ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">{t.kumuliert}</h3>
              <p className="text-[12.5px] text-ink-500">{t.zeigen}</p>
            </div>
            <Diagramm r={r} vorlaufJahre={vorlauf ? vorlaufJahre : 0} t={t} f={f} />
          </div>

          {modell === "umsatz" && (
            <p className="mt-4 flex gap-2.5 rounded-2xl bg-ink-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-600">
              <Sun aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />
              {t.umsatzHinweis(f, r.kwh / 1e6)}
            </p>
          )}

          <div className="mt-7 border-t border-ink-100 pt-6">
            <div className="flex flex-col gap-4 rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 sm:flex-row sm:items-center sm:justify-between md:p-6">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ov-800">{t.weiter}</p>
                <p className="mt-1 font-display text-[19px] font-bold leading-snug text-ink-900">
                  ≈ <span className="ov-num">{fmtEur(r.ersteJahrespacht)}</span> {t.proJahrPruefen}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-ink-600">{t.uebernehmen}</p>
              </div>
              <ZumFlaechencheck ha={ha} regionId={regionId} size="lg" className="shrink-0" data-ov-cta>
                {t.pruefen}
              </ZumFlaechencheck>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
              {t.nominal}
            </p>
            {!sperre && <BerichtAnfordern rechner="pacht" land={landVonRegion(regionId)} eingaben={eingaben} />}
          </div>
        </>
      }
    />
  );
}

function Diagramm({ r, vorlaufJahre, t, f }) {
  const { fmtEur } = f;
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = schmal ? 250 : 300;
  const P = { l: schmal ? 60 : 66, r: schmal ? 12 : 22, t: 20, b: 36 };
  const n = r.jahre.length;
  const max = Math.max(r.summeSolar, r.summeDb, r.summeAcker) * 1.05 || 1;
  const x = (j) => Math.round((P.l + (j / n) * (W - P.l - P.r)) * 10) / 10;
  const y = (v) => Math.round((P.t + (1 - v / max) * (H - P.t - P.b)) * 10) / 10;
  const pfad = (key) => `M${x(0)},${y(0)} ` + r.jahre.map((p) => `L${x(p.jahr)},${y(p[key])}`).join(" ");
  const flaeche = `${pfad("sumSolar")} L${x(n)},${y(0)} Z`;
  const ticks = schrittweite(max);
  const aktiv = hover != null ? r.jahre[hover - 1] : null;

  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(1, Math.min(n, Math.round(((px - P.l) / (W - P.l - P.r)) * n)));
  };

  return (
    <div ref={ref} className="relative px-2 pb-4 md:px-3">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={t.aria(n, Math.round(r.summeSolar), Math.round(r.summeDb), Math.round(r.summeAcker))}
      >
        <defs>
          <linearGradient id="ov-pacht-flaeche" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={FARBE.solar} stopOpacity="0.18" />
            <stop offset="100%" stopColor={FARBE.solar} stopOpacity="0" />
          </linearGradient>
        </defs>
        {vorlaufJahre > 0 && (
          <g>
            <rect x={x(0)} y={P.t} width={x(vorlaufJahre) - x(0)} height={H - P.t - P.b} fill="#fbfaf6" />
            <text x={x(0) + 6} y={P.t + 14} className="fill-ink-500 text-[11px]">{t.vorlaufKurz}</text>
          </g>
        )}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={FARBE.raster} />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[11px]">
              {t.achse(f, v)}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter((j) => j <= n && (!schmal || j % 10 === 0 || j === n)).map((j) => (
          <text key={j} x={x(j)} y={H - P.b + 20} textAnchor={j === n ? "end" : "middle"} className="fill-ink-500 text-[11px]">
            {j === n ? t.jahrKurz(j) : j}
          </text>
        ))}
        <path d={flaeche} fill="url(#ov-pacht-flaeche)" />
        <path d={pfad("sumAcker")} fill="none" stroke={FARBE.acker} strokeWidth="2" strokeDasharray="5 5" />
        <path d={pfad("sumDb")} fill="none" stroke={FARBE.db} strokeWidth="2.25" />
        <path d={pfad("sumSolar")} fill="none" stroke={FARBE.solar} strokeWidth="2.75" strokeLinejoin="round" />
        <circle cx={x(n)} cy={y(r.summeSolar)} r="5" fill={FARBE.solar} stroke="#fff" strokeWidth="2" />

        {aktiv && (
          <g pointerEvents="none">
            <line x1={x(aktiv.jahr)} x2={x(aktiv.jahr)} y1={P.t} y2={H - P.b} stroke="#151a24" strokeWidth="1" />
            <circle cx={x(aktiv.jahr)} cy={y(aktiv.sumAcker)} r="4" fill="#fff" stroke={FARBE.acker} strokeWidth="2" />
            <circle cx={x(aktiv.jahr)} cy={y(aktiv.sumDb)} r="4" fill="#fff" stroke={FARBE.db} strokeWidth="2" />
            <circle cx={x(aktiv.jahr)} cy={y(aktiv.sumSolar)} r="5" fill={FARBE.solar} stroke="#fff" strokeWidth="2" />
          </g>
        )}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={(e) => setHover(ausZeiger(e))}
          onPointerDown={(e) => setHover(ausZeiger(e))}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {aktiv && (
        <Tooltip x={x(aktiv.jahr)} y={Math.max(y(aktiv.sumSolar) - 20, 0)} breite={W}>
          <p className="font-semibold">{t.jahr} {aktiv.jahr}{aktiv.betrieb ? "" : ` · ${t.vorlaufKurz}`}</p>
          <p className="text-white/70">{t.solarpacht} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.solar)}</span></p>
          <p className="text-white/70">{t.summeSolar} <span className="ov-num font-semibold text-ov-300">{fmtEur(aktiv.sumSolar)}</span></p>
          <p className="text-white/70">{t.summeAckerbau} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumDb)}</span></p>
          <p className="text-white/70">{t.summeAckerpacht} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumAcker)}</span></p>
        </Tooltip>
      )}
      <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2 px-3 text-[12.5px] text-ink-600">
        <li className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full bg-ov-500" aria-hidden="true" />{t.solarpacht}</li>
        <li className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full bg-sun-500" aria-hidden="true" />{t.legendeDb}</li>
        <li className="flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-ink-400" aria-hidden="true" />{t.legendeAcker}</li>
      </ul>
    </div>
  );
}

/** Runde Achsenschritte (4–6 Linien) */
function schrittweite(max) {
  const roh = max / 5;
  const pot = Math.pow(10, Math.floor(Math.log10(roh)));
  const s = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((v) => max / v <= 6) || pot * 10;
  const out = [];
  for (let v = 0; v <= max; v += s) out.push(v);
  return out;
}

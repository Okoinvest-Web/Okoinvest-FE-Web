"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Coins, HandCoins, Sun, TrendingUp, Wheat } from "lucide-react";
import Button from "@/components/ui/Button";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { PACHT, REGIONEN } from "@/lib/invest/markt";
import { PACHTMODELLE, REGION_KURZ, pachtRechnung } from "@/lib/rechner/pacht";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const FARBE = { solar: "#669933", db: "#f5a70f", acker: "#97a0b0", raster: "#eef0f4" };
const tsd = (v) => `${fmt(v / 1000, v >= 1e6 ? 0 : v >= 1e5 ? 0 : 1)} Tsd. €`;

// `start` (optional): Vorbelegung, z. B. von der personalisierten Angebotsseite /angebot/[code] – { ha, regionId, proHa }
export default function PachtRechner({ start = {} } = {}) {
  const [ha, setHa] = useState(Number(start.ha) > 0 ? Math.round(Number(start.ha) * 10) / 10 : 10);
  const [regionId, setRegionId] = useState(REGIONEN.some((x) => x.id === start.regionId) ? start.regionId : "de-sued");
  const [modell, setModell] = useState("fest");
  const [proHa, setProHa] = useState(Number(start.proHa) > 0 ? Number(start.proHa) : PACHT.freiflaecheProHa.mittel);
  const [umsatzPct, setUmsatzPct] = useState(6);
  const [mindestProHa, setMindestProHa] = useState(PACHT.freiflaecheProHa.min);
  const [laufzeit, setLaufzeit] = useState(PACHT.laufzeit);
  const [ackerProHa, setAckerProHa] = useState(PACHT.ackerProHa);
  const [dbProHa, setDbProHa] = useState(PACHT.deckungsbeitragAcker.mittel);
  const [vorlauf, setVorlauf] = useState(false);
  const [vorlaufJahre, setVorlaufJahre] = useState(2);

  const r = useMemo(
    () =>
      pachtRechnung({
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

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["Pacht/Jahr", `${fmt(Math.round(r.ersteJahrespacht))} €`],
              [`${laufzeit} Jahre`, tsd(r.summeSolar)],
              ["ggü. Ackerpacht", r.faktorAcker ? `${fmt(r.faktorAcker, 1)}×` : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Fläche">
              <Regler label="Flächengröße" wert={ha} min={1} max={100} step={0.5} stellen={ha % 1 ? 1 : 0} einheit="ha" onChange={setHa} hinweis={`≈ ${fmt(r.kwp / 1000, 1)} MWp Solarpark, ${fmt(r.kwh / 1e6, 1)} GWh Strom pro Jahr`} />
              <Auswahl
                legende="Region"
                wert={regionId}
                onChange={setRegionId}
                spalten={3}
                klein
                optionen={REGIONEN.map((x) => ({ id: x.id, label: REGION_KURZ[x.id] || x.label, sub: `${fmt(x.ertrag)} kWh/kWp` }))}
              />
            </Gruppe>

            <Gruppe titel="Pachtmodell">
              <Auswahl legende="Modell" wert={modell} onChange={setModell} optionen={PACHTMODELLE} />
              {modell !== "umsatz" ? (
                <Regler
                  label={modell === "index" ? "Startpacht" : "Pacht"}
                  wert={proHa}
                  min={1000}
                  max={5000}
                  step={100}
                  format={(v) => `${fmt(v)} €/ha`}
                  onChange={setProHa}
                  hinweis={`Übliche Spanne ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha${modell === "index" ? `, danach +${fmt(PACHT.indexierung * 100, 1)} % pro Jahr` : ""}`}
                />
              ) : (
                <>
                  <Regler label="Anteil an den Stromerlösen" wert={umsatzPct} min={3} max={10} step={0.5} stellen={umsatzPct % 1 ? 1 : 0} einheit="%" onChange={setUmsatzPct} hinweis={`Üblich ${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} % – gerechnet mit EEG-Wert, nach 20 Jahren mit Marktwert`} />
                  <Regler label="Mindestpacht" wert={mindestProHa} min={0} max={3000} step={100} format={(v) => (v ? `${fmt(v)} €/ha` : "keine")} onChange={setMindestProHa} />
                </>
              )}
              <Regler label="Laufzeit" wert={laufzeit} min={20} max={40} step={1} einheit="Jahre" onChange={setLaufzeit} hinweis={`Üblich ${PACHT.laufzeit} Jahre + ${PACHT.verlaengerung}`} />
              <Schalter icon={CalendarClock} label="Vorlauf bis Baubeginn" beschreibung="Reservierungsprämie, Fläche wird weiter bewirtschaftet" an={vorlauf} onChange={setVorlauf}>
                <Regler label="Jahre bis Baubeginn" wert={vorlaufJahre} min={1} max={4} step={1} einheit="J." onChange={setVorlaufJahre} />
              </Schalter>
            </Gruppe>

            <Gruppe titel="Vergleich Landwirtschaft">
              <Regler label="Heutige Ackerpacht" wert={ackerProHa} min={100} max={1200} step={10} format={(v) => `${fmt(v)} €/ha`} onChange={setAckerProHa} hinweis={`Durchschnitt Deutschland rund ${fmt(PACHT.ackerProHa)} €/ha`} />
              <Regler label="Deckungsbeitrag Ackerbau" wert={dbProHa} min={0} max={1500} step={10} format={(v) => `${fmt(v)} €/ha`} onChange={setDbProHa} hinweis={`Getreide typisch ${fmt(PACHT.deckungsbeitragAcker.min)}–${fmt(PACHT.deckungsbeitragAcker.max)} €/ha, stark schwankend`} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Pacht im ersten Betriebsjahr ${Math.round(r.ersteJahrespacht)} Euro, über ${laufzeit} Jahre ${Math.round(r.summeSolar)} Euro.`}
          </p>
          <ErgebnisKopf titel="Ihre Pacht" plakette={`${fmt(ha, ha % 1 ? 1 : 0)} ha · ${PACHTMODELLE.find((m) => m.id === modell).label}`} />

          <Hauptzahl className="mt-5" icon={HandCoins} label="Pacht 1. Betriebsjahr" zusatz={`${fmt(r.proHaErstesJahr)} €/ha`}>
            <Zahl wert={Math.round(r.ersteJahrespacht)} suffix=" €" />
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={Coins} label={`Summe ${r.jahre.length} Jahre`} zusatz={`Ø ${fmtEur(r.durchschnitt)} pro Jahr`}>
              {tsd(r.summeSolar)}
            </Kennzahl>
            <Kennzahl icon={Wheat} label="ggü. Ackerpacht" zusatz={`+${tsd(r.mehrGgAcker)}`}>
              {r.faktorAcker ? <Zahl wert={r.faktorAcker} stellen={1} suffix="×" /> : "–"}
            </Kennzahl>
            <Kennzahl icon={TrendingUp} label="ggü. Ackerbau" zusatz={r.mehrGgDb >= 0 ? `+${tsd(r.mehrGgDb)}` : `−${tsd(-r.mehrGgDb)}`}>
              {r.faktorDb ? <Zahl wert={r.faktorDb} stellen={1} suffix="×" /> : "∞"}
            </Kennzahl>
          </Belege>

          <div className="mt-7 rounded-3xl ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">Kumulierte Einnahmen</h3>
              <p className="text-[12.5px] text-ink-500">Zeigen oder tippen für Jahreswerte</p>
            </div>
            <Diagramm r={r} vorlaufJahre={vorlauf ? vorlaufJahre : 0} />
          </div>

          {modell === "umsatz" && (
            <p className="mt-4 flex gap-2.5 rounded-2xl bg-ink-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-600">
              <Sun aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />
              Umsatzbeteiligung auf {fmt(r.kwh / 1e6, 1)} GWh Jahresertrag (−0,4 % pro Jahr Degradation). Steigen die Strompreise nach Ende der Förderung, steigt auch Ihre Pacht – fallen sie, greift die Mindestpacht.
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              Nominal und vor Steuern – eine Orientierung, kein Angebot. Das konkrete Pachtangebot hängt von Netzanschluss, Kulisse und Baurecht ab.
            </p>
            <Button href="/flaechencheck" size="lg" pfeil className="shrink-0">
              Fläche prüfen lassen
            </Button>
          </div>
        </>
      }
    />
  );
}

function Diagramm({ r, vorlaufJahre }) {
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
        aria-label={`Diagramm: Nach ${n} Jahren summiert sich die Solarpacht auf ${Math.round(r.summeSolar)} Euro, der Deckungsbeitrag im Ackerbau auf ${Math.round(r.summeDb)} Euro und die Ackerpacht auf ${Math.round(r.summeAcker)} Euro.`}
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
            <text x={x(0) + 6} y={P.t + 14} className="fill-ink-500 text-[11px]">Vorlauf</text>
          </g>
        )}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={FARBE.raster} />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[11px]">
              {v >= 1e6 ? `${fmt(v / 1e6, 1)} Mio.` : `${fmt(v / 1000)} Tsd.`}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45].filter((j) => j <= n && (!schmal || j % 10 === 0 || j === n)).map((j) => (
          <text key={j} x={x(j)} y={H - P.b + 20} textAnchor={j === n ? "end" : "middle"} className="fill-ink-500 text-[11px]">
            {j === n ? `${j} J.` : j}
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
          <p className="font-semibold">Jahr {aktiv.jahr}{aktiv.betrieb ? "" : " · Vorlauf"}</p>
          <p className="text-white/70">Solarpacht <span className="ov-num font-semibold text-white">{fmtEur(aktiv.solar)}</span></p>
          <p className="text-white/70">Summe Solar <span className="ov-num font-semibold text-ov-300">{fmtEur(aktiv.sumSolar)}</span></p>
          <p className="text-white/70">Summe Ackerbau <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumDb)}</span></p>
          <p className="text-white/70">Summe Ackerpacht <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumAcker)}</span></p>
        </Tooltip>
      )}
      <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2 px-3 text-[12.5px] text-ink-600">
        <li className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full bg-ov-500" aria-hidden="true" />Solarpacht</li>
        <li className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full bg-sun-500" aria-hidden="true" />Deckungsbeitrag Ackerbau</li>
        <li className="flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-ink-400" aria-hidden="true" />Ackerpacht</li>
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

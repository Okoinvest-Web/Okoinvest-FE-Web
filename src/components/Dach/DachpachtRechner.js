"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Coins, Hammer, HandCoins, Info, PiggyBank, Sun, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Gruppe, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "@/components/Rechner/bausteine";
import { ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { DACH, REGIONEN } from "@/lib/invest/markt";
import { STANDARD, NETZSTROM_CT, rechneDach } from "@/lib/rechner/dachpacht";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const FARBE = { pacht: "#97a0b0", ppa: "#1f5aa1", eigen: "#669933", raster: "#eef0f4" };
const tsd = (v) => `${v < 0 ? "−" : ""}${fmt(Math.abs(v) / 1000)} Tsd. €`;
const pct = (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : `${fmt(v * 100, s)} %`);

const REGION_KURZ = { "de-nord": "Nord", "de-ost": "Ost", "de-west": "West/Mitte", "de-sued": "Süd", at: "Österreich", ch: "Schweiz" };

export default function DachpachtRechner() {
  const [m2, setM2] = useState(STANDARD.m2);
  const [dachart, setDachart] = useState(STANDARD.dachart);
  const [ausrichtung, setAusrichtung] = useState(STANDARD.ausrichtung);
  const [regionId, setRegionId] = useState(STANDARD.regionId);
  const [pachtProM2, setPachtProM2] = useState(STANDARD.pachtProM2);
  const [laufzeit, setLaufzeit] = useState(STANDARD.laufzeit);
  const [strompreisCt, setStrompreis] = useState(STANDARD.strompreisCt);
  const [eigenPct, setEigenPct] = useState(STANDARD.eigenverbrauch * 100);
  const [ppaCt, setPpaCt] = useState(STANDARD.ppaCt);
  const [capexKwp, setCapex] = useState(STANDARD.capexKwp);
  const [sanierung, setSanierung] = useState(false);

  const r = useMemo(
    () => rechneDach({ m2, dachart, ausrichtung, regionId, pachtProM2, laufzeit, strompreisCt, eigenverbrauch: eigenPct / 100, ppaCt, capexKwp, sanierung }),
    [m2, dachart, ausrichtung, regionId, pachtProM2, laufzeit, strompreisCt, eigenPct, ppaCt, capexKwp, sanierung]
  );

  const eingaben = (
    <>
      <MobilKurz
        werte={
          r.belegbar
            ? [
                ["Leistung", `${fmt(r.kwp)} kWp`],
                ["Pacht/Jahr", fmtEur(r.pachtJahr)],
                [`${laufzeit} Jahre`, tsd(r.wege.pacht.summe)],
              ]
            : [
                ["Dach", "nicht belegbar"],
                ["Sanierung ca.", tsd(r.sanierungKosten)],
                ["Fläche", `${fmt(m2)} m²`],
              ]
        }
      />
      <div className="space-y-8">
        <Gruppe titel="Dach">
          <Regler
            label="Nutzbare Dachfläche"
            wert={m2}
            min={500}
            max={30000}
            step={250}
            format={(v) => `${fmt(v)} m²`}
            onChange={setM2}
            hinweis={r.belegbar ? `≈ ${fmt(r.kwp)} kWp · ${fmt(r.kwhJahr1 / 1000)} MWh im ersten Jahr` : "Ohne Dachsanierung nicht belegbar"}
          />
          {m2 < DACH.mindestM2 && (
            <Hinweis ton="warnung" icon={Info}>
              Unter {fmt(DACH.mindestM2)} m² lohnt sich eine Verpachtung an einen Betreiber selten – eine eigene Anlage ist dann meist der bessere Weg.
            </Hinweis>
          )}
          <Auswahl
            legende="Dachart"
            wert={dachart}
            onChange={setDachart}
            spalten={2}
            klein
            optionen={DACH.dacharten.map((d) => ({ id: d.id, label: d.label, sub: d.belegbar ? d.sub : "nicht belegbar" }))}
          />
          {dachart !== "flach" && dachart !== "faserzement" ? (
            <Auswahl
              legende="Ausrichtung"
              wert={ausrichtung}
              onChange={setAusrichtung}
              spalten={2}
              klein
              optionen={DACH.ausrichtung.map((a) => ({ id: a.id, label: a.label, sub: a.faktor === 1 ? "Referenz" : `−${fmt((1 - a.faktor) * 100)} % Ertrag` }))}
            />
          ) : dachart === "flach" ? (
            <p className="rounded-2xl bg-white/70 px-4 py-3 text-[13px] leading-relaxed text-ink-600 ring-1 ring-ink-200">
              Flachdächer belegen wir in der Regel mit flacher Ost/West-Aufständerung – mehr Leistung je m², gleichmäßigere Erzeugung über den Tag, die Dachrichtung spielt kaum eine Rolle.
            </p>
          ) : null}
          <Auswahl
            legende="Region"
            wert={regionId}
            onChange={setRegionId}
            spalten={3}
            klein
            optionen={REGIONEN.map((x) => ({ id: x.id, label: REGION_KURZ[x.id] || x.label, sub: `${fmt(x.ertrag)} kWh/kWp` }))}
          />
          <Schalter icon={Hammer} label="Dach ist sanierungsbedürftig" beschreibung="Neueindeckung vor der Belegung nötig" an={sanierung} onChange={setSanierung} />
        </Gruppe>

        <Gruppe titel="Dachpacht">
          <Regler
            label="Pacht"
            wert={pachtProM2}
            min={0.5}
            max={4}
            step={0.1}
            stellen={2}
            format={(v) => `${fmt(v, 2)} €/m²`}
            onChange={setPachtProM2}
            hinweis={`Orientierung ${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} €/m² bzw. ${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} €/kWp und Jahr`}
          />
          <Regler label="Laufzeit" wert={laufzeit} min={15} max={30} step={1} einheit="Jahre" onChange={setLaufzeit} hinweis={`Üblich ${DACH.laufzeit} Jahre + ${DACH.verlaengerung}`} />
        </Gruppe>

        <Gruppe titel="Strom & Eigeninvestition">
          <Regler
            label="Ihr Netzstrompreis"
            wert={strompreisCt}
            min={10}
            max={35}
            step={0.5}
            stellen={1}
            format={(v) => `${fmt(v, 1)} ct/kWh`}
            onChange={setStrompreis}
            hinweis={`Arbeitspreis netto inkl. Netzentgelt, Umlagen, Steuern. Richtwert Mittelstand DE rund ${fmt(NETZSTROM_CT, 1)} ct.`}
          />
          <Regler
            label="Eigenverbrauch vor Ort"
            wert={eigenPct}
            min={0}
            max={90}
            step={5}
            einheit="%"
            onChange={setEigenPct}
            hinweis={`Anteil des Dachstroms, den Sie oder Ihr Mieter direkt verbrauchen – Gewerbe ohne Speicher meist ${fmt(DACH.eigenverbrauch.min * 100)}–${fmt(DACH.eigenverbrauch.max * 100)} %.`}
          />
          <Regler
            label="PPA-Preis Dachstrom"
            wert={ppaCt}
            min={8}
            max={20}
            step={0.5}
            stellen={1}
            format={(v) => `${fmt(v, 1)} ct/kWh`}
            onChange={setPpaCt}
            hinweis={`Stromlieferung vom Betreiber an Sie, üblich ${fmt(DACH.ppaVorOrtCt.min)}–${fmt(DACH.ppaVorOrtCt.max)} ct/kWh`}
          />
          <Regler
            label="Investition bei Eigenbau"
            wert={capexKwp}
            min={500}
            max={1200}
            step={10}
            format={(v) => `${fmt(v)} €/kWp`}
            onChange={setCapex}
            hinweis={`Gewerbedach schlüsselfertig ${fmt(DACH.capexProKwp.min)}–${fmt(DACH.capexProKwp.max)} €/kWp, ohne Dachsanierung und Netzausbau`}
          />
        </Gruppe>
      </div>
    </>
  );

  if (!r.belegbar) {
    return (
      <RechnerRahmen
        mitlaufend
        eingaben={eingaben}
        ergebnis={
          <>
            <ErgebnisKopf titel="Ihr Dach" plakette="Faserzement" />
            <div className="mt-5 rounded-3xl bg-sun-300/15 p-6 ring-1 ring-sun-400/50 md:p-8">
              <AlertTriangle aria-hidden="true" className="h-7 w-7 text-sun-500" />
              <p className="mt-4 font-display text-[20px] font-bold text-ink-900">Faserzement-Dächer werden nicht belegt.</p>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-700">
                Wellplatten aus Faserzement – bei Gebäuden vor 1993 häufig asbesthaltig – dürfen nach der Gefahrstoffverordnung nicht überbaut oder angebohrt werden. Auch asbestfreie Platten tragen Module selten dauerhaft sicher.
                Der Weg führt über eine <strong>Dachsanierung</strong>: neue Eindeckung, danach PV.
              </p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                  <dt className="text-[12.5px] text-ink-500">Neueindeckung grob</dt>
                  <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">
                    {tsd(m2 * DACH.sanierungProM2.min)} – {tsd(m2 * DACH.sanierungProM2.max)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                  <dt className="text-[12.5px] text-ink-500">Danach möglich (Trapez, Süd)</dt>
                  <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">
                    {fmt(rechneDach({ m2, dachart: "trapez", ausrichtung: "sued", regionId }).kwp)} kWp
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-[13.5px] leading-relaxed text-ink-600">
                Modelle mit <strong>Dachsanierung als Gegenleistung</strong> sind möglich: Der Betreiber finanziert die neue Eindeckung ganz oder teilweise und verrechnet sie mit der Pacht. Stellen Sie das Dach trotzdem vor – wir prüfen, was geht.
              </p>
            </div>
            <div className="mt-7 flex justify-end border-t border-ink-100 pt-6">
              <Button href="/dachflaeche-verpachten#anfrage" size="lg" pfeil>
                Dach vorstellen
              </Button>
            </div>
          </>
        }
      />
    );
  }

  const wege = [r.wege.pacht, r.wege.ppa, r.wege.eigen];
  const maxBw = Math.max(...wege.map((w) => Math.abs(w.barwert)), 1);

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={eingaben}
      unten={
        <div className="rounded-3xl ring-1 ring-ink-200/70">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 md:px-6">
            <h3 className="font-display text-[17px] font-bold text-ink-900">Kumuliert über {laufzeit} Jahre</h3>
            <p className="text-[12.5px] text-ink-500">Zeigen oder tippen für Jahreswerte</p>
          </div>
          <Verlauf r={r} />
        </div>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Leistung ${Math.round(r.kwp)} Kilowatt Peak, Pacht ${Math.round(r.pachtJahr)} Euro pro Jahr, über ${laufzeit} Jahre ${Math.round(r.wege.pacht.summe)} Euro.`}
          </p>
          <ErgebnisKopf titel="Ihr Dach" plakette={`${fmt(r.kwp)} kWp · ${fmt(r.spezErtrag)} kWh/kWp`} />

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kennzahl ton="navy" icon={HandCoins} label="Pacht pro Jahr" zusatz={`${fmt(r.pachtProKwp, 1)} €/kWp`}>
              <Zahl wert={Math.round(r.pachtJahr)} suffix=" €" />
            </Kennzahl>
            <Kennzahl ton="gruen" icon={Coins} label={`Summe ${laufzeit} Jahre`} zusatz="nominal, fest">
              {tsd(r.wege.pacht.summe)}
            </Kennzahl>
            <Kennzahl icon={Banknote} label="alternativ einmalig" zusatz="Barwert der Pacht">
              {tsd(r.einmalzahlung)}
            </Kennzahl>
            <Kennzahl icon={Sun} label="Stromertrag" zusatz="im ersten Jahr">
              <Zahl wert={r.kwhJahr1 / 1000} suffix=" MWh" />
            </Kennzahl>
          </div>

          <div className="mt-4 rounded-2xl bg-ink-50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
              <span className="font-semibold text-ink-800">Übliche Pachtspanne für Ihr Dach</span>
              <span className="ov-num text-ink-700">
                {fmtEur(r.pachtSpanne.min)} – {fmtEur(r.pachtSpanne.max)} / Jahr
              </span>
            </div>
            <SpannenBalken min={r.pachtSpanne.min} max={r.pachtSpanne.max} wert={r.pachtJahr} />
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              Ihre Pacht entspricht {pct(r.pachtAnteilErloes)} der Stromerlöse bei Volleinspeisung ({fmt(DACH.eegDachCt, 1)} ct/kWh, Ø Zuschläge Dach 2025).
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {r.pachtAnteilErloes > 0.12 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                Mehr als 12 % der Stromerlöse als Pacht tragen Dachprojekte heute nur unter sehr guten Bedingungen (großes Dach, Netzanschluss am Gebäude, Stromabnehmer vor Ort). Rechnen Sie vorsichtshalber auch mit dem mittleren Wert.
              </Hinweis>
            )}
            {sanierung && (
              <Hinweis ton="neutral" icon={Hammer}>
                Neueindeckung grob {tsd(r.sanierungKosten)} – das entspricht rund {fmt(r.sanierungInPachtjahren, 0)} Jahren Pacht. Übernimmt der Betreiber die Sanierung als Gegenleistung, sinkt oder entfällt die laufende Pacht; oft ist eine Mischung sinnvoll.
              </Hinweis>
            )}
          </div>

          <h3 className="mt-7 font-display text-[17px] font-bold text-ink-900">Drei Wege im Vergleich</h3>
          <p className="mt-1 text-[12.5px] text-ink-500">Barwert bei {pct(r.eingabe.diskont)} Kalkulationszins · nominale Summe über {laufzeit} Jahre</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { w: r.wege.pacht, icon: HandCoins, farbe: FARBE.pacht, text: "Kein Kapital, kein Betriebsrisiko. Betreiber trägt Bau, Versicherung und Wartung." },
              { w: r.wege.ppa, icon: Zap, farbe: FARBE.ppa, text: `Reduzierte Pacht plus günstiger Dachstrom zu ${fmt(ppaCt, 1)} ct statt ${fmt(strompreisCt, 1)} ct.` },
              { w: r.wege.eigen, icon: PiggyBank, farbe: FARBE.eigen, text: `Investition ${tsd(r.capex)}, IRR ${pct(r.wege.eigen.irr)}${r.wege.eigen.amortisation ? `, Amortisation ${fmt(r.wege.eigen.amortisation, 1)} Jahre` : ""}.` },
            ].map(({ w, icon: Icon, farbe, text }) => (
              <li key={w.id} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-800">
                  <Icon aria-hidden="true" className="h-4 w-4" style={{ color: farbe }} />
                  {w.label}
                </p>
                <p className="ov-num mt-2 font-display text-[22px] font-extrabold tracking-tight text-ink-900">{tsd(w.barwert)}</p>
                <p className="text-[12px] text-ink-500">Barwert · Summe {tsd(w.summe)}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                  <div className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${Math.max(0, (w.barwert / maxBw) * 100)}%`, background: farbe }} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">{text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              Orientierung vor Steuern, kein Angebot. Statik, Restnutzungsdauer des Dachs, Brandschutz und Netzanschluss entscheiden über das konkrete Angebot.
            </p>
            <Button href="/dachflaeche-verpachten#anfrage" size="lg" pfeil className="shrink-0">
              Dach prüfen lassen
            </Button>
          </div>
        </>
      }
    />
  );
}

function SpannenBalken({ min, max, wert }) {
  const unten = min * 0.5;
  const oben = max * 1.25;
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - unten) / (oben - unten)) * 100))}%`;
  return (
    <div className="relative mt-3 h-3 rounded-full bg-ink-100" role="img" aria-label={`Spanne ${fmtEur(min)} bis ${fmtEur(max)}, Ihre Eingabe ${fmtEur(wert)}`}>
      <div className="absolute inset-y-0 rounded-full bg-ov-200" style={{ left: pos(min), right: `calc(100% - ${pos(max)})` }} />
      <div className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-ov-600 shadow motion-safe:transition-[left] motion-safe:duration-300" style={{ left: pos(wert) }} />
    </div>
  );
}

function Verlauf({ r }) {
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = schmal ? 250 : 290;
  const P = { l: schmal ? 58 : 66, r: 14, t: 18, b: 34 };
  const n = r.jahre.length;
  const werte = r.jahre.flatMap((j) => [j.sumA, j.sumB, j.sumC]);
  const max = Math.max(...werte, 1) * 1.06;
  const min = Math.min(-r.capex, 0) * 1.06;
  const x = (j) => Math.round((P.l + (j / n) * (W - P.l - P.r)) * 10) / 10;
  const y = (v) => Math.round((P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b)) * 10) / 10;
  const pfad = (key, start) => `M${x(0)},${y(start)} ` + r.jahre.map((p) => `L${x(p.jahr)},${y(p[key])}`).join(" ");
  const aktiv = hover != null ? r.jahre[hover - 1] : null;

  const schritt = (() => {
    const roh = (max - min) / 5;
    const pot = Math.pow(10, Math.floor(Math.log10(roh)));
    return [1, 2, 2.5, 5, 10].map((f) => f * pot).find((s) => (max - min) / s <= 6) || pot * 10;
  })();
  const ticks = [];
  for (let v = Math.ceil(min / schritt) * schritt; v <= max; v += schritt) ticks.push(v);

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
        aria-label={`Diagramm: Nach ${n} Jahren summiert sich die Dachpacht auf ${fmtEur(r.wege.pacht.summe)}, Pacht plus Dachstrom auf ${fmtEur(r.wege.ppa.summe)} und die Eigeninvestition nach Abzug der Investition auf ${fmtEur(r.wege.eigen.summe)}.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-6 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[11px]">
              {Math.abs(v) < 1e-6 ? "0" : Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)} Mio.` : `${fmt(v / 1000)} Tsd.`}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30].filter((j) => j <= n && (!schmal || j % 10 === 0 || j === n)).map((j) => (
          <text key={j} x={x(j)} y={H - P.b + 20} textAnchor={j === n ? "end" : "middle"} className="fill-ink-500 text-[11px]">
            {j === n ? `${j} J.` : j}
          </text>
        ))}
        <path d={pfad("sumA", 0)} fill="none" stroke={FARBE.pacht} strokeWidth="2.25" strokeDasharray="5 5" />
        <path d={pfad("sumB", 0)} fill="none" stroke={FARBE.ppa} strokeWidth="2.5" />
        <path d={pfad("sumC", -r.capex)} fill="none" stroke={FARBE.eigen} strokeWidth="2.75" strokeLinejoin="round" />
        {aktiv && (
          <g pointerEvents="none">
            <line x1={x(aktiv.jahr)} x2={x(aktiv.jahr)} y1={P.t} y2={H - P.b} stroke="#151a24" strokeWidth="1" />
            <circle cx={x(aktiv.jahr)} cy={y(aktiv.sumA)} r="4" fill="#fff" stroke={FARBE.pacht} strokeWidth="2" />
            <circle cx={x(aktiv.jahr)} cy={y(aktiv.sumB)} r="4" fill="#fff" stroke={FARBE.ppa} strokeWidth="2" />
            <circle cx={x(aktiv.jahr)} cy={y(aktiv.sumC)} r="5" fill={FARBE.eigen} stroke="#fff" strokeWidth="2" />
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
        <Tooltip x={x(aktiv.jahr)} y={Math.max(y(Math.max(aktiv.sumA, aktiv.sumB, aktiv.sumC)) - 20, 0)} breite={W}>
          <p className="font-semibold">Jahr {aktiv.jahr}</p>
          <p className="text-white/70">Dachpacht <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumA)}</span></p>
          <p className="text-white/70">Pacht + Dachstrom <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumB)}</span></p>
          <p className="text-white/70">Eigeninvestition <span className={cn("ov-num font-semibold", aktiv.sumC < 0 ? "text-sun-300" : "text-ov-300")}>{fmtEur(aktiv.sumC)}</span></p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: "Dachpacht", farbe: FARBE.pacht, linie: true },
            { label: "Pacht + Dachstrom (PPA)", farbe: FARBE.ppa, linie: true },
            { label: "Eigeninvestition (nach Investition)", farbe: FARBE.eigen, linie: true },
          ]}
        />
      </div>
    </div>
  );
}

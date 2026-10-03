"use client";

import { SperrEingaben } from "./LaenderSperre";
import { useMemo, useState } from "react";
import { BatteryCharging, CalendarClock, Handshake, Leaf, PiggyBank, PlugZap, Sun, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Tooltip, Zahl, useBreite } from "./bausteine";
import { ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { useDiagrammTastatur } from "./ToolTeile";
import { useTeilbarerZustand } from "./kontext";
import { STANDARD, rechneCarport } from "@/lib/rechner/carport";
import { CARPORT, REGIONEN } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";

const FARBE = { kauf: "#669933", contracting: "#1f5aa1", raster: "#eef0f4" };
const tsd = (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 2)} Mio. €` : `${fmt(Math.round(v / 1000))} T€`);

export default function CarportRechner() {
  const [stellplaetze, setStellplaetze] = useState(STANDARD.stellplaetze);
  const [regionId, setRegionId] = useState(STANDARD.regionId);
  const [strompreisCt, setStrompreis] = useState(STANDARD.strompreisCt);
  const [eigenverbrauch, setEigenverbrauch] = useState(STANDARD.eigenverbrauch);
  const [ac, setAc] = useState(STANDARD.ac);
  const [dc, setDc] = useState(STANDARD.dc);
  const [capexKwp, setCapex] = useState(STANDARD.capexKwp);

  const setzer = { stellplaetze: setStellplaetze, regionId: setRegionId, strompreisCt: setStrompreis, eigenverbrauch: setEigenverbrauch, ac: setAc, dc: setDc, capexKwp: setCapex };
  useTeilbarerZustand({ stellplaetze, regionId, strompreisCt, eigenverbrauch, ac, dc, capexKwp }, (neu) => Object.entries(neu).forEach(([k, v]) => setzer[k]?.(v)), {
    optionen: { regionId: REGIONEN.map((x) => x.id) },
    grenzen: { stellplaetze: [10, 1000], strompreisCt: [10, 35], eigenverbrauch: [0.2, 1], ac: [0, 100], dc: [0, 20], capexKwp: [1000, 1900] },
    pruefen: rechneCarport,
  });

  const r = useMemo(() => rechneCarport({ stellplaetze, regionId, strompreisCt, eigenverbrauch, ac, dc, capexKwp }), [stellplaetze, regionId, strompreisCt, eigenverbrauch, ac, dc, capexKwp]);
  const con = r.contracting;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende="Region"
      wert={regionId}
      onChange={setRegionId}
      spalten={2}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: x.label.replace("West- & Mitteldeutschland", "West & Mitte"), sub: `${fmt(Math.round(x.ertrag * CARPORT.ertragFaktor))} kWh/kWp` }))}
    />
  );

  return (
    <RechnerRahmen
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              ["Leistung", `${fmt(r.kwp)} kWp`],
              ["Vorteil/Jahr", tsd(r.kauf.nettoJahr1)],
              ["Amortisation", r.kauf.amortisation ? `${fmt(r.kauf.amortisation, 1)} J.` : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Parkplatz">
              <Regler label="Überdachte Stellplätze" wert={stellplaetze} min={10} max={1000} step={5} onChange={setStellplaetze} hinweis={`≈ ${fmt(r.kwp)} kWp (${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz) auf rund ${fmt(r.flaecheM2)} m² Parkfläche inkl. Fahrgassen`} />
              {regionWahl}
              <Regler label="Baukosten Carport" wert={capexKwp} min={1000} max={1900} step={25} format={(v) => `${fmt(v)} €/kWp`} onChange={setCapex} hinweis={`Richtwert ${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp inkl. Stahlbau, Fundamente, Entwässerung.`} />
            </Gruppe>

            <Gruppe titel="Strom im Unternehmen">
              <Regler label="Heutiger Strompreis (netto)" wert={strompreisCt} min={10} max={35} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct/kWh`} onChange={setStrompreis} hinweis="Arbeitspreis inkl. Netzentgelte, Umlagen und Stromsteuer, ohne USt." />
              <Regler
                label="Eigenverbrauch"
                wert={eigenverbrauch}
                min={0.2}
                max={1}
                step={0.05}
                format={(v) => `${fmt(v * 100)} %`}
                onChange={setEigenverbrauch}
                hinweis="Anteil des Solarstroms, den Gebäude und Ladepunkte direkt nutzen. Mit Tagbetrieb, Kühlung und E-Flotte oft 60–90 %."
              />
            </Gruppe>

            <Gruppe titel="Ladeinfrastruktur">
              <Regler label="AC-Ladepunkte (11/22 kW)" wert={ac} min={0} max={100} step={1} onChange={setAc} hinweis={`je rund ${fmtEur(CARPORT.ladepunktAc)} inkl. Installation`} />
              <Regler label="DC-Schnelllader (50–150 kW)" wert={dc} min={0} max={20} step={1} onChange={setDc} hinweis={`je rund ${fmtEur(CARPORT.ladepunktDc)} – ohne Netzausbau und Baukostenzuschuss`} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`${fmt(r.kwp)} Kilowatt-Peak, Investition ${fmtEur(r.invest.summe)}, Amortisation ${r.kauf.amortisation ? fmt(r.kauf.amortisation, 1) : "über"} Jahre, Contracting-Preis ${con.preisCt ? fmt(con.preisCt, 1) : "–"} Cent`}
          </p>
          <ErgebnisKopf plakette={`${fmt(r.ertrag / 1000)} MWh im Jahr`} />

          <Hauptzahl
            className="mt-5"
            icon={PiggyBank}
            label="Vorteil/Jahr (Kauf)"
            zusatz="Ersparnis + Einspeisung − Betrieb"
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                  Amortisation
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  {r.kauf.amortisation ? <Zahl wert={r.kauf.amortisation} stellen={1} suffix=" Jahre" delta="dunkel" /> : `> ${CARPORT.laufzeit} J.`}
                </p>
                <p className="text-[12.5px] text-white/75">Kauf, inkl. Ladepunkte</p>
              </div>
            }
          >
            <Zahl wert={r.kauf.nettoJahr1} format={tsd} delta="dunkel" einlauf />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Sun} label="Leistung" zusatz={`${fmt(r.spez)} kWh/kWp`}>
              <Zahl wert={r.kwp} suffix=" kWp" delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Wallet} label="Investition" zusatz={r.invest.laden ? `davon Laden ${tsd(r.invest.laden)}` : "ohne Ladepunkte"}>
              <Zahl wert={r.invest.summe} format={tsd} delta="hell" />
            </Kennzahl>
          </Belege>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Variante
              titel="Selbst investieren"
              icon={Wallet}
              aktiv
              farbe={FARBE.kauf}
              zeilen={[
                ["Investition", tsd(r.invest.summe)],
                ["Ersparnis Jahr 1", tsd(r.kauf.ersparnisJahr1)],
                ["Einspeisung Überschuss", tsd(r.kauf.einspeisungJahr1)],
                ["Betrieb & Wartung", `−${tsd(r.opexPv)}`],
                [`Überschuss nach ${CARPORT.laufzeit} Jahren`, tsd(r.kauf.ueberschuss)],
              ]}
              text="Höchster Vorteil über die Laufzeit, dafür Kapitalbindung und Betrieb im eigenen Haus. Abschreibung und Steuerwirkung klären Sie mit Ihrer Steuerberatung."
            />
            <Variante
              titel="Contracting / PPA"
              icon={Handshake}
              farbe={FARBE.contracting}
              zeilen={[
                ["Ihre Investition", r.invest.laden ? `${tsd(r.invest.laden)} (Laden)` : "0 €"],
                ["Solarstrompreis", con.preisCt ? `${fmt(con.preisCt, 1)} ct/kWh` : "–"],
                ["statt Netzstrom", `${fmt(strompreisCt, 1)} ct/kWh`],
                ["Ersparnis Jahr 1", tsd(con.ersparnisJahr1)],
                [`Überschuss nach ${CARPORT.laufzeit} Jahren`, tsd(con.ueberschuss)],
              ]}
              text={`Wir bauen und betreiben, Sie kaufen den Strom vor Ort – ${CARPORT.contractingJahre} Jahre fest, danach Übernahme der Anlage. Der Preis ist aus Vollkosten hergeleitet.`}
            />
          </div>

          {!con.lohntSich && con.preisCt && (
            <Hinweis ton="warnung" icon={BatteryCharging} className="mt-4">
              Bei {fmt(eigenverbrauch * 100)} % Eigenverbrauch liegt der kostendeckende Contracting-Preis über Ihrem heutigen Strompreis. Mehr Eigenverbrauch – etwa durch Ladepunkte oder einen Speicher – ändert das.
            </Hinweis>
          )}

          <div className="mt-6 rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">Kumulierter Vorteil über {CARPORT.laufzeit} Jahre</h3>
              <p className="text-[12.5px] text-ink-500">Strompreis steigt mit der Inflation, Contracting-Preis bleibt fest</p>
            </div>
            <Verlauf r={r} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
            {[
              [Leaf, "CO₂ vermieden", `${fmt(r.co2Tonnen)} t/Jahr`],
              [PlugZap, "Ladeleistung", `${fmt(r.ladeleistungKw)} kW`],
              [Sun, "Eigenverbrauch", `${fmt(r.eigenKwh / 1000)} MWh/Jahr`],
            ].map(([Icon, k, v]) => (
              <div key={k} className="rounded-2xl bg-ink-50 px-4 py-3">
                <dt className="flex items-center gap-1.5 text-ink-500">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
                  {k}
                </dt>
                <dd className="ov-num mt-0.5 font-display text-[16px] font-bold text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">Orientierung ohne Förderung und Steuern – wir rechnen gern mit Ihrem Lastgang und Lageplan.</p>
            <Button href={seitenPfad("/solarcarport#anfrage")} size="lg" pfeil className="shrink-0">
              Carport anfragen
            </Button>
          </div>
        </>
      }
    />
  );
}

function Variante({ titel, icon: Icon, zeilen, text, farbe }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: farbe }}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <h3 className="font-display text-[17px] font-bold text-ink-900">{titel}</h3>
      </div>
      <dl className="mt-4 divide-y divide-ink-100 text-[13.5px]">
        {zeilen.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-ink-600">{k}</dt>
            <dd className="ov-num shrink-0 font-semibold text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}

function Verlauf({ r }) {
  const [ref, W] = useBreite(640);
  const [hover, setHover] = useState(null);
  const H = W < 520 ? 230 : 260;
  const P = { l: 58, r: 14, t: 16, b: 30 };
  const kauf = [-r.invest.summe, ...r.kauf.jahre.map((j) => j.kumuliert)];
  const con = [-r.contracting.invest, ...r.contracting.jahre.map((j) => j.kumuliert)];
  const alle = [...kauf, ...con, 0];
  const min = Math.min(...alle) * 1.08;
  const max = Math.max(...alle) * 1.08 || 1;
  const n = kauf.length - 1;
  const x = (i) => Math.round((P.l + (i / n) * (W - P.l - P.r)) * 10) / 10;
  const y = (v) => Math.round((P.t + ((max - v) / (max - min || 1)) * (H - P.t - P.b)) * 10) / 10;
  const pfad = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const spanne = max - min;
  const roh = spanne / 4;
  const pot = Math.pow(10, Math.floor(Math.log10(roh || 1)));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((s) => s >= roh) || pot * 10;
  const ticks = [];
  for (let v = Math.ceil(min / schritt) * schritt; v <= max; v += schritt) ticks.push(v);

  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n, Math.round(((px - P.l) / (W - P.l - P.r)) * n)));
  };
  const tastatur = useDiagrammTastatur(n + 1, setHover);

  return (
    <div ref={ref} className="ov-reveal relative px-2 pb-4 pt-2 md:px-3" data-dir="ohne" suppressHydrationWarning>
      <div {...tastatur} role="group" aria-label="Kumulierter Vorteil – mit den Pfeiltasten durch die Jahre" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={`Kumulierter Vorteil nach ${n} Jahren: Kauf ${tsd(kauf[n])}, Contracting ${tsd(con[n])}.`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {Math.abs(v) < 1 ? "0" : tsd(v).replace("-", "−")}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25].filter((t) => t <= n).map((t) => (
          <text key={t} x={x(t)} y={H - P.b + 18} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
            {t}
          </text>
        ))}
        <line x1={x(CARPORT.contractingJahre)} x2={x(CARPORT.contractingJahre)} y1={P.t} y2={H - P.b} stroke="#7fa7d6" strokeDasharray="3 4" />
        <path d={pfad(con)} fill="none" stroke={FARBE.contracting} strokeWidth="2.25" strokeLinejoin="round" pathLength="1" className="ov-linie" style={{ "--ov-delay": "120ms" }} />
        <path d={pfad(kauf)} fill="none" stroke={FARBE.kauf} strokeWidth="2.75" strokeLinejoin="round" pathLength="1" className="ov-linie" />
        {hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#97a0b0" strokeDasharray="2 3" />
            <circle cx={x(hover)} cy={y(kauf[hover])} r="4" fill="#fff" stroke={FARBE.kauf} strokeWidth="2" />
            <circle cx={x(hover)} cy={y(con[hover])} r="4" fill="#fff" stroke={FARBE.contracting} strokeWidth="2" />
          </g>
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} onClick={(e) => setHover(ausZeiger(e))} />
      </svg>
      </div>
      {hover != null && (
        <Tooltip x={x(hover)} y={Math.max(Math.min(y(kauf[hover]), y(con[hover])) - 60, 0)} breite={W}>
          <p className="font-semibold">{hover === 0 ? "Start" : `Nach Jahr ${hover}`}</p>
          <p className="text-white/70">
            Kauf <span className={cn("ov-num font-semibold", kauf[hover] >= 0 ? "text-ov-300" : "text-sun-300")}>{tsd(kauf[hover])}</span>
          </p>
          <p className="text-white/70">
            Contracting <span className={cn("ov-num font-semibold", con[hover] >= 0 ? "text-ov-300" : "text-sun-300")}>{tsd(con[hover])}</span>
          </p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: "Selbst investieren", farbe: FARBE.kauf, linie: true },
            { label: "Contracting / PPA", farbe: FARBE.contracting, linie: true },
            { label: `Vertragsende Jahr ${CARPORT.contractingJahre}`, farbe: "#7fa7d6", linie: true },
          ]}
        />
      </div>
    </div>
  );
}

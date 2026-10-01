"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarRange, HandCoins, Info, Landmark, MapPinned, Receipt, TrendingUp } from "lucide-react";
import Button from "@/components/ui/Button";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "./bausteine";
import { ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { useDiagrammTastatur } from "./ToolTeile";
import { useTeilbarerZustand } from "./kontext";
import { STANDARD, rechneKommune } from "@/lib/rechner/kommune";
import { KOMMUNE, PACHT, REGIONEN, ERLOESE, ALLGEMEIN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const QUELLEN = [
  { id: "p6", label: "§ 6 EEG-Beteiligung", farbe: "#669933" },
  { id: "gewSt", label: "Gewerbesteuer", farbe: "#1f5aa1" },
  { id: "pacht", label: "Pacht Gemeindeflächen", farbe: "#c98500" },
];
const tsd = (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 2)} Mio. €` : `${fmt(Math.round(v / 1000))} T€`);

export default function KommuneRechner() {
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [regionId, setRegionId] = useState(STANDARD.regionId);
  const [hebesatz, setHebesatz] = useState(STANDARD.hebesatz);
  const [paragraph6, setP6] = useState(STANDARD.paragraph6);
  const [gemeindeflaeche, setGemeindeflaeche] = useState(STANDARD.gemeindeflaeche);
  const [anteilGemeinde, setAnteil] = useState(STANDARD.anteilGemeinde);
  const [pachtHa, setPachtHa] = useState(STANDARD.pachtHa);
  const [sitzInGemeinde, setSitz] = useState(STANDARD.sitzInGemeinde);
  const [preisCt, setPreisCt] = useState(STANDARD.preisCt);

  const setzer = { mwp: setMwp, regionId: setRegionId, hebesatz: setHebesatz, paragraph6: setP6, gemeindeflaeche: setGemeindeflaeche, anteilGemeinde: setAnteil, pachtHa: setPachtHa, sitzInGemeinde: setSitz, preisCt: setPreisCt };
  useTeilbarerZustand(
    { mwp, regionId, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt },
    (neu) => Object.entries(neu).forEach(([k, v]) => setzer[k]?.(v)),
    { optionen: { regionId: REGIONEN.map((x) => x.id) }, grenzen: { anteilGemeinde: [0, 1] }, pruefen: rechneKommune }
  );

  const r = useMemo(
    () => rechneKommune({ mwp, regionId, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt }),
    [mwp, regionId, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt]
  );
  const maxQuelle = Math.max(...QUELLEN.map((q) => r.gesamtLaufzeit[q.id]), 1);
  const haushalte = r.ertragJahr1 / ALLGEMEIN.haushaltKwh;

  return (
    <RechnerRahmen
      eingaben={
        <>
          <MobilKurz
            werte={[
              ["Ø pro Jahr", tsd(r.proJahr)],
              [`${r.N} Jahre`, tsd(r.gesamt.summe)],
              [`${r.L} Jahre`, tsd(r.gesamtLaufzeit.summe)],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Solarpark">
              <Regler label="Leistung" wert={mwp} min={1} max={150} step={1} einheit="MWp" onChange={setMwp} hinweis={`≈ ${fmt(r.flaecheHa, 1)} ha · ${fmt(r.ertragJahr1 / 1e6, 1)} GWh im Jahr – rechnerisch rund ${fmt(Math.round(haushalte / 100) * 100)} Haushalte`} />
              <Auswahl
                legende="Region"
                wert={regionId}
                onChange={setRegionId}
                spalten={2}
                klein
                optionen={REGIONEN.filter((x) => x.land === "DE").map((x) => ({ id: x.id, label: x.label.replace("West- & Mitteldeutschland", "West & Mitte"), sub: x.sub }))}
              />
              <Regler
                label="Erlös des Parks"
                wert={preisCt}
                min={4}
                max={8}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 1)} ct/kWh`}
                onChange={setPreisCt}
                hinweis={`EEG-Zuschlag oder PPA. Bestimmt den Gewinn und damit die Gewerbesteuer. Zuletzt um ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh.`}
              />
            </Gruppe>

            <Gruppe titel="Gemeinde">
              <Regler
                label="Gewerbesteuer-Hebesatz"
                wert={hebesatz}
                min={KOMMUNE.hebesatzSpanne.min}
                max={KOMMUNE.hebesatzSpanne.max}
                step={0.05}
                format={(v) => `${fmt(v * 100)} %`}
                onChange={setHebesatz}
                hinweis={`Durchschnitt in Deutschland rund ${fmt(KOMMUNE.hebesatz * 100)} %.`}
              />
              <Schalter icon={HandCoins} label="§ 6 EEG-Beteiligung" beschreibung={`${fmt(KOMMUNE.beteiligungCt, 1)} ct je kWh – freiwillig, per Vertrag`} an={paragraph6} onChange={setP6} />
              <Schalter icon={MapPinned} label="Flächen der Gemeinde" beschreibung="Park steht ganz oder teilweise auf Gemeindeflächen" an={gemeindeflaeche} onChange={setGemeindeflaeche}>
                <div className="space-y-5">
                  <Regler label="Anteil Gemeindefläche" wert={anteilGemeinde} min={0.1} max={1} step={0.05} format={(v) => `${fmt(v * 100)} %`} onChange={setAnteil} />
                  <Regler label="Pacht" wert={pachtHa} min={PACHT.freiflaecheProHa.min} max={PACHT.freiflaecheProHa.max + 500} step={100} format={(v) => `${fmt(v)} €/ha`} onChange={setPachtHa} />
                </div>
              </Schalter>
              <Schalter icon={Building2} label="Betreiber mit Sitz in der Gemeinde" beschreibung="z. B. Projektgesellschaft vor Ort: 100 % statt 90 % der Gewerbesteuer" an={sitzInGemeinde} onChange={setSitz} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{`Einnahmen der Gemeinde: durchschnittlich ${tsd(r.proJahr)} pro Jahr, ${tsd(r.gesamt.summe)} in ${r.N} Jahren`}</p>
          <ErgebnisKopf titel="Einnahmen der Gemeinde" plakette={`${mwp} MWp · Hebesatz ${fmt(hebesatz * 100)} %`} />

          <Hauptzahl
            className="mt-5"
            icon={TrendingUp}
            label="Ø pro Jahr"
            zusatz={`in den ersten ${r.N} Jahren`}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
                  Summe {r.N} Jahre
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.gesamt.summe} format={tsd} />
                </p>
                <p className="text-[12.5px] text-white/75">alle Quellen</p>
              </div>
            }
          >
            <Zahl wert={r.proJahr} format={tsd} delta="dunkel" einlauf />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={CalendarRange} label={`Summe ${r.L} Jahre`} zusatz="gesamte Laufzeit">
              <Zahl wert={r.gesamtLaufzeit.summe} format={tsd} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Receipt} label="Gewerbesteuer" zusatz={r.ersteGewSt ? `Ø Jahr ${KOMMUNE.afaJahre + 1}–${r.L} · erstmals Jahr ${r.ersteGewSt}` : `nicht in ${r.L} Jahren`}>
              {r.gewStNachAfa > 0 ? `${tsd(r.gewStNachAfa)}/J.` : "–"}
            </Kennzahl>
          </Belege>

          <div className="mt-6 rounded-3xl bg-ink-50 p-5 md:p-6">
            <h3 className="font-display text-[17px] font-bold text-ink-900">Einnahmen je Quelle</h3>
            <ul className="mt-4 space-y-4">
              {QUELLEN.map((q) => (
                <li key={q.id}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[13.5px]">
                    <span className="font-semibold text-ink-800">{q.label}</span>
                    <span className="ov-num text-ink-600">
                      {r.N} J. <strong className="text-ink-900">{tsd(r.gesamt[q.id])}</strong> · {r.L} J. <strong className="text-ink-900">{tsd(r.gesamtLaufzeit[q.id])}</strong>
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-white" role="img" aria-label={`${q.label}: ${tsd(r.gesamt[q.id])} in ${r.N} Jahren, ${tsd(r.gesamtLaufzeit[q.id])} in ${r.L} Jahren`}>
                    <div className="ov-fortschritt absolute inset-0 rounded-full opacity-35" style={{ transform: `scaleX(${r.gesamtLaufzeit[q.id] / maxQuelle})`, background: q.farbe }} />
                    <div className="ov-fortschritt absolute inset-0 rounded-full" style={{ transform: `scaleX(${r.gesamt[q.id] / maxQuelle})`, background: q.farbe }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12.5px] text-ink-500">Kräftig: erste {r.N} Jahre · hell: bis Jahr {r.L}</p>
          </div>

          <div className="mt-6 rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">Einnahmen Jahr für Jahr</h3>
              <p className="text-[12.5px] text-ink-500">Gewerbesteuer setzt meist erst ein, wenn Abschreibung und Zinsen abgebaut sind</p>
            </div>
            <Jahre r={r} />
          </div>

          {!r.ersteGewSt || r.ersteGewSt > 12 ? (
            <Hinweis icon={Info} className="mt-4">
              Solarparks zahlen in den ersten Jahren kaum Gewerbesteuer: Die Abschreibung über {KOMMUNE.afaJahre} Jahre und die Zinsen drücken den Gewinn, Anlaufverluste werden vorgetragen. Umso
              wichtiger ist die § 6-Zahlung ab dem ersten Jahr.
            </Hinweis>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              Vereinfachte Modellrechnung für Deutschland, keine Steuerberatung. Wir rechnen gern mit Ihrem Hebesatz und konkreten Flächen.
            </p>
            <Button href="/kommunen#anfrage" size="lg" pfeil className="shrink-0">
              Gespräch anfragen
            </Button>
          </div>
        </>
      }
    />
  );
}

function Jahre({ r }) {
  const [ref, W] = useBreite(640);
  const [hover, setHover] = useState(null);
  const H = W < 520 ? 220 : 250;
  const P = { l: 52, r: 10, t: 14, b: 28 };
  const n = r.jahre.length;
  const max = Math.max(...r.jahre.map((j) => j.summe), 1) * 1.12;
  const band = (W - P.l - P.r) / n;
  const bw = Math.max(2, band * 0.68);
  const x = (i) => Math.round((P.l + i * band + (band - bw) / 2) * 10) / 10;
  const h = (v) => (v / max) * (H - P.t - P.b);
  const basis = H - P.b;
  const roh = max / 3;
  const pot = Math.pow(10, Math.floor(Math.log10(roh)));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((s) => s >= roh);
  const ticks = [];
  for (let v = 0; v <= max; v += schritt) ticks.push(v);
  const aktiv = hover != null ? r.jahre[hover] : null;
  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)));
  };
  const tastatur = useDiagrammTastatur(n, setHover);

  return (
    <div ref={ref} className="ov-reveal relative px-2 pb-4 pt-2 md:px-3" data-dir="ohne" suppressHydrationWarning>
      <div {...tastatur} role="group" aria-label="Einnahmen Jahr für Jahr – mit den Pfeiltasten durch die Jahre" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={`Gestapelte Säulen der Gemeindeeinnahmen über ${n} Jahre, zusammen ${tsd(r.gesamtLaufzeit.summe)}.`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={basis - h(v)} y2={basis - h(v)} stroke={v === 0 ? "#97a0b0" : "#eef0f4"} />
            <text x={P.l - 6} y={basis - h(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {v === 0 ? "0" : tsd(v)}
            </text>
          </g>
        ))}
        <line x1={P.l + r.N * band} x2={P.l + r.N * band} y1={P.t} y2={basis} stroke="#c98500" strokeDasharray="3 4" />
        {r.jahre.map((j, i) => {
          let y = basis;
          return (
            <g key={j.jahr} opacity={hover == null || hover === i ? 1 : 0.55} className="transition-opacity duration-150">
              <g className="ov-balken-y" style={{ "--i": Math.min(i, 30) * 0.5 }}>
                {QUELLEN.map((q) => {
                  const hh = h(j[q.id]);
                  y -= hh;
                  // Einheitsrechteck, Lage/Höhe per transform – gleitet bei neuen Werten
                  return hh > 0 ? <rect key={q.id} x={0} y={0} width={1} height={1} fill={q.farbe} className="ov-rechner-balken" style={{ transform: `translate(${x(i)}px, ${y}px) scale(${bw}, ${hh})` }} /> : null;
                })}
              </g>
            </g>
          );
        })}
        {r.jahre.map((j, i) =>
          j.jahr === 1 || j.jahr % 5 === 0 ? (
            <text key={j.jahr} x={x(i) + bw / 2} y={H - P.b + 18} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
              {j.jahr}
            </text>
          ) : null
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} onClick={(e) => setHover(ausZeiger(e))} />
      </svg>
      </div>
      {aktiv && (
        <Tooltip x={x(hover) + bw / 2} y={Math.max(basis - h(aktiv.summe) - 40, 0)} breite={W}>
          <p className="font-semibold">Jahr {aktiv.jahr}</p>
          {QUELLEN.map((q) => (
            <p key={q.id} className="text-white/70">
              {q.label} <span className="ov-num font-semibold text-white">{fmt(Math.round(aktiv[q.id]))} €</span>
            </p>
          ))}
          <p className="text-white/70">
            Zusammen <span className="ov-num font-semibold text-ov-300">{fmt(Math.round(aktiv.summe))} €</span>
          </p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende items={[...QUELLEN.map((q) => ({ label: q.label, farbe: q.farbe })), { label: `Ende Jahr ${r.N}`, farbe: "#c98500", linie: true }]} />
      </div>
    </div>
  );
}

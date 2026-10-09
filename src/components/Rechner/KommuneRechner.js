"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarRange, HandCoins, Info, Landmark, MapPinned, Receipt, TrendingUp } from "lucide-react";
import Button from "@/components/ui/Button";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "./bausteine";
import { ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { useDiagrammTastatur } from "./ToolTeile";
import { useTeilbarerZustand } from "./kontext";
import { SperrEingaben } from "./LaenderSperre";
import { STANDARD, rechneKommune } from "@/lib/rechner/kommune";
import { KOMMUNE, PACHT, REGIONEN, ERLOESE, ALLGEMEIN } from "@/lib/invest/markt";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { pfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";

const QUELLEN_BASIS = [
  { id: "p6", farbe: "#669933" },
  { id: "gewSt", farbe: "#1f5aa1" },
  { id: "pacht", farbe: "#c98500" },
];
const MONATE = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const tsdMit = (f) => (v) =>
  f.sprache === "en"
    ? Math.abs(v) >= 1e6
      ? `€${f.fmt(v / 1e6, 2)}m`
      : `€${f.fmt(Math.round(v / 1000))}k`
    : Math.abs(v) >= 1e6
      ? `${f.fmt(v / 1e6, 2)} Mio. €`
      : `${f.fmt(Math.round(v / 1000))} T€`;

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    quellen: { p6: "§ 6 EEG-Beteiligung", gewSt: "Gewerbesteuer", pacht: "Pacht Gemeindeflächen" },
    regionLabel: (id, l) => l.replace("West- & Mitteldeutschland", "West & Mitte"),
    regionSub: (id, s) => s,
    datum: (d) => d,
    region: "Region",
    proJahr: "Ø pro Jahr",
    jahre: (n) => `${n} Jahre`,
    solarpark: "Solarpark",
    leistung: "Leistung",
    leistungHinweis: (ha, gwh, hh) => `≈ ${ha} ha · ${gwh} GWh im Jahr – rechnerisch rund ${hh} Haushalte`,
    erloes: "Erlös des Parks",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    erloesHinweis: (x) => `EEG-Zuschlag oder PPA. Bestimmt den Gewinn und damit die Gewerbesteuer. Zuletzt um ${x} ct/kWh.`,
    gemeinde: "Gemeinde",
    hebesatz: "Gewerbesteuer-Hebesatz",
    pct: (f, v) => `${f.fmt(v)} %`,
    hebesatzHinweis: (x) => `Durchschnitt in Deutschland rund ${x} %.`,
    p6: "§ 6 EEG-Beteiligung",
    p6Text: (x) => `${x} ct je kWh – freiwillig, per Vertrag`,
    flaechen: "Flächen der Gemeinde",
    flaechenText: "Park steht ganz oder teilweise auf Gemeindeflächen",
    anteil: "Anteil Gemeindefläche",
    pacht: "Pacht",
    proHa: (f, v) => `${f.fmt(v)} €/ha`,
    sitz: "Betreiber mit Sitz in der Gemeinde",
    sitzText: "z. B. Projektgesellschaft vor Ort: 100 % statt 90 % der Gewerbesteuer",
    sr: (a, b, n) => `Einnahmen der Gemeinde: durchschnittlich ${a} pro Jahr, ${b} in ${n} Jahren`,
    einnahmen: "Einnahmen der Gemeinde",
    plakette: (m, h) => `${m} MWp · Hebesatz ${h} %`,
    ersten: (n) => `in den ersten ${n} Jahren`,
    summe: (n) => `Summe ${n} Jahre`,
    alle: "alle Quellen",
    laufzeit: "gesamte Laufzeit",
    gewSt: "Gewerbesteuer",
    gewStZusatz: (a, b, c) => (c ? `Ø Jahr ${a}–${b} · erstmals Jahr ${c}` : `nicht in ${b} Jahren`),
    proJ: (x) => `${x}/J.`,
    jeQuelle: "Einnahmen je Quelle",
    jKurz: (n) => `${n} J.`,
    quelleAria: (q, a, n, b, l) => `${q}: ${a} in ${n} Jahren, ${b} in ${l} Jahren`,
    kraeftig: (n, l) => `Kräftig: erste ${n} Jahre · hell: bis Jahr ${l}`,
    jahrFuerJahr: "Einnahmen Jahr für Jahr",
    jahrText: "Gewerbesteuer setzt meist erst ein, wenn Abschreibung und Zinsen abgebaut sind",
    landesregeln: (l, s) => `Nur § 6 EEG gerechnet, und nur für geförderten Strom in der EEG-Förderphase (Erstattung nach § 6 Abs. 5 EEG). Mehrere Länder regeln Beteiligungen inzwischen per Landesgesetz, teils verpflichtend (${l}; Übersicht der Fachagentur Wind und Solar, Stand ${s}). Diese Zahlungen sind hier nicht enthalten – in diesen Ländern kann die Gemeinde mehr erhalten.`,
    kaumGewSt: (n) => `Solarparks zahlen in den ersten Jahren kaum Gewerbesteuer: Die Abschreibung über ${n} Jahre und die Zinsen drücken den Gewinn, Anlaufverluste werden vorgetragen. Umso wichtiger ist die § 6-Zahlung ab dem ersten Jahr.`,
    fuss: "Vereinfachte Modellrechnung für Deutschland, keine Steuerberatung. Wir rechnen gern mit Ihrem Hebesatz und konkreten Flächen.",
    gespraech: "Gespräch anfragen",
    tastaturAria: "Einnahmen Jahr für Jahr – mit den Pfeiltasten durch die Jahre",
    saeulenAria: (n, x) => `Gestapelte Säulen der Gemeindeeinnahmen über ${n} Jahre, zusammen ${x}.`,
    jahr: "Jahr",
    zusammen: "Zusammen",
    ende: (n) => `Ende Jahr ${n}`,
  },
  en: {
    quellen: { p6: "§ 6 EEG participation", gewSt: "Trade tax", pacht: "Lease on municipal land" },
    regionLabel: (id, l) => regionEn(id, "label", l).replace("Western & central Germany", "West & Central"),
    regionSub: (id, s) => regionEn(id, "sub", s),
    datum: (d) => {
      const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(d));
      return m ? `${Number(m[1])} ${MONATE[Number(m[2]) - 1]} ${m[3]}` : d;
    },
    region: "Region",
    proJahr: "Ø per year",
    jahre: (n) => `${n} years`,
    solarpark: "Solar park",
    leistung: "Capacity",
    leistungHinweis: (ha, gwh, hh) => `≈ ${ha} ha · ${gwh} GWh per year – equivalent to around ${hh} households`,
    erloes: "Park revenue",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    erloesHinweis: (x) => `EEG award or PPA. Determines the profit and therefore the trade tax. Recently around ${x} ct/kWh.`,
    gemeinde: "Municipality",
    hebesatz: "Trade tax multiplier (Hebesatz)",
    pct: (f, v) => f.pct(v),
    hebesatzHinweis: (x) => `German average around ${x}%.`,
    p6: "§ 6 EEG participation",
    p6Text: (x) => `${x} ct per kWh – voluntary, by contract`,
    flaechen: "Municipal land",
    flaechenText: "The park stands wholly or partly on municipal land",
    anteil: "Share of municipal land",
    pacht: "Lease",
    proHa: (f, v) => f.eur(v, "/ha"),
    sitz: "Operator based in the municipality",
    sitzText: "e.g. local project company: 100% instead of 90% of the trade tax",
    sr: (a, b, n) => `Municipal income: an average of ${a} per year, ${b} over ${n} years`,
    einnahmen: "Municipal income",
    plakette: (m, h) => `${m} MWp · multiplier ${h}%`,
    ersten: (n) => `in the first ${n} years`,
    summe: (n) => `Total over ${n} years`,
    alle: "all sources",
    laufzeit: "entire term",
    gewSt: "Trade tax",
    gewStZusatz: (a, b, c) => (c ? `Ø years ${a}–${b} · first in year ${c}` : `not within ${b} years`),
    proJ: (x) => `${x}/yr`,
    jeQuelle: "Income by source",
    jKurz: (n) => `${n} yrs`,
    quelleAria: (q, a, n, b, l) => `${q}: ${a} over ${n} years, ${b} over ${l} years`,
    kraeftig: (n, l) => `Solid: first ${n} years · light: up to year ${l}`,
    jahrFuerJahr: "Income year by year",
    jahrText: "Trade tax usually only starts once depreciation and interest have been worked off",
    landesregeln: (l, s) => `Only § 6 EEG is calculated, and only for subsidised power during the EEG support phase (reimbursement under § 6(5) EEG). Several federal states now regulate participation by state law, partly on a mandatory basis (${l}; overview by the Fachagentur Wind und Solar, as of ${s}). These payments are not included here – in these states, the municipality may receive more.`,
    kaumGewSt: (n) => `Solar parks pay hardly any trade tax in the first years: depreciation over ${n} years and interest reduce the profit, and start-up losses are carried forward. This makes the § 6 payment from the first year all the more important.`,
    fuss: "Simplified model calculation for Germany, not tax advice. We are happy to calculate with your multiplier and specific plots.",
    gespraech: "Request a meeting",
    tastaturAria: "Income year by year – use the arrow keys to move through the years",
    saeulenAria: (n, x) => `Stacked columns of municipal income over ${n} years, totalling ${x}.`,
    jahr: "Year",
    zusammen: "Total",
    ende: (n) => `End of year ${n}`,
  },
};

export default function KommuneRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt } = f;
  const tsd = tsdMit(f);
  const QUELLEN = QUELLEN_BASIS.map((q) => ({ ...q, label: t.quellen[q.id] }));
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [regionId, setRegionId] = useState(() => landStart(STANDARD, seitenLand).regionId);
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
    // Länder-Sperre (Paket E): Teilen-Links nur mit DE-Regionen – § 6 EEG und Gewerbesteuer sind deutsches Recht
    { optionen: { regionId: REGIONEN.filter((x) => x.land === "DE").map((x) => x.id) }, grenzen: { anteilGemeinde: [0, 1] }, pruefen: rechneKommune }
  );

  // Eingaben der Rechnung – dieselben gehen an den Bericht (Paket B4: der Server rechnet damit neu)
  const eingaben = useMemo(
    () => ({ mwp, regionId, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt }),
    [mwp, regionId, hebesatz, paragraph6, gemeindeflaeche, anteilGemeinde, pachtHa, sitzInGemeinde, preisCt]
  );
  const r = useMemo(() => rechneKommune(eingaben), [eingaben]);
  const maxQuelle = Math.max(...QUELLEN.map((q) => r.gesamtLaufzeit[q.id]), 1);
  const haushalte = r.ertragJahr1 / ALLGEMEIN.haushaltKwh;

  // Länder-Sperre (Paket E): auf /at bzw. /ch (Region vorgewählt) nur die Regionswahl und der Hinweis aus markt.js –
  // § 6 EEG und Gewerbesteuer sind deutsches Recht, also keine Werte für AT/CH
  const sperre = r.sperre;

  return (
    <RechnerRahmen
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>
          <Auswahl
            legende={t.region}
            wert={regionId}
            onChange={setRegionId}
            spalten={2}
            klein
            optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, x.label), sub: t.regionSub(x.id, x.sub) }))}
          />
        </SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              [t.proJahr, tsd(r.proJahr)],
              [t.jahre(r.N), tsd(r.gesamt.summe)],
              [t.jahre(r.L), tsd(r.gesamtLaufzeit.summe)],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.solarpark}>
              <Regler label={t.leistung} wert={mwp} min={1} max={150} step={1} einheit="MWp" onChange={setMwp} hinweis={t.leistungHinweis(fmt(r.flaecheHa, 1), fmt(r.ertragJahr1 / 1e6, 1), fmt(Math.round(haushalte / 100) * 100))} />
              <Auswahl
                legende={t.region}
                wert={regionId}
                onChange={setRegionId}
                spalten={2}
                klein
                optionen={REGIONEN.filter((x) => x.land === "DE").map((x) => ({ id: x.id, label: t.regionLabel(x.id, x.label), sub: t.regionSub(x.id, x.sub) }))}
              />
              <Regler
                label={t.erloes}
                wert={preisCt}
                min={4}
                max={8}
                step={0.1}
                stellen={1}
                format={(v) => t.ct(f, v)}
                onChange={setPreisCt}
                hinweis={t.erloesHinweis(fmt(ERLOESE.eegFreiflaecheCt, 1))}
              />
            </Gruppe>

            <Gruppe titel={t.gemeinde}>
              <Regler
                label={t.hebesatz}
                wert={hebesatz}
                min={KOMMUNE.hebesatzSpanne.min}
                max={KOMMUNE.hebesatzSpanne.max}
                step={0.05}
                format={(v) => t.pct(f, v * 100)}
                onChange={setHebesatz}
                hinweis={t.hebesatzHinweis(fmt(KOMMUNE.hebesatz * 100))}
              />
              <Schalter icon={HandCoins} label={t.p6} beschreibung={t.p6Text(fmt(KOMMUNE.beteiligungCt, 1))} an={paragraph6} onChange={setP6} />
              <Schalter icon={MapPinned} label={t.flaechen} beschreibung={t.flaechenText} an={gemeindeflaeche} onChange={setGemeindeflaeche}>
                <div className="space-y-5">
                  <Regler label={t.anteil} wert={anteilGemeinde} min={0.1} max={1} step={0.05} format={(v) => t.pct(f, v * 100)} onChange={setAnteil} />
                  <Regler label={t.pacht} wert={pachtHa} min={PACHT.freiflaecheProHa.min} max={PACHT.freiflaecheProHa.max + 500} step={100} format={(v) => t.proHa(f, v)} onChange={setPachtHa} />
                </div>
              </Schalter>
              <Schalter icon={Building2} label={t.sitz} beschreibung={t.sitzText} an={sitzInGemeinde} onChange={setSitz} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{t.sr(tsd(r.proJahr), tsd(r.gesamt.summe), r.N)}</p>
          <ErgebnisKopf titel={t.einnahmen} plakette={t.plakette(mwp, fmt(hebesatz * 100))} />

          <Hauptzahl
            className="mt-5"
            icon={TrendingUp}
            label={t.proJahr}
            zusatz={t.ersten(r.N)}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.summe(r.N)}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={r.gesamt.summe} format={tsd} />
                </p>
                <p className="text-[12.5px] text-white/75">{t.alle}</p>
              </div>
            }
          >
            <Zahl wert={r.proJahr} format={tsd} delta="dunkel" einlauf />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={CalendarRange} label={t.summe(r.L)} zusatz={t.laufzeit}>
              <Zahl wert={r.gesamtLaufzeit.summe} format={tsd} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Receipt} label={t.gewSt} zusatz={t.gewStZusatz(KOMMUNE.afaJahre + 1, r.L, r.ersteGewSt)}>
              {r.gewStNachAfa > 0 ? t.proJ(tsd(r.gewStNachAfa)) : "–"}
            </Kennzahl>
          </Belege>

          <div className="mt-6 rounded-3xl bg-ink-50 p-5 md:p-6">
            <h3 className="font-display text-[17px] font-bold text-ink-900">{t.jeQuelle}</h3>
            <ul className="mt-4 space-y-4">
              {QUELLEN.map((q) => (
                <li key={q.id}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[13.5px]">
                    <span className="font-semibold text-ink-800">{q.label}</span>
                    <span className="ov-num text-ink-600">
                      {t.jKurz(r.N)} <strong className="text-ink-900">{tsd(r.gesamt[q.id])}</strong> · {t.jKurz(r.L)} <strong className="text-ink-900">{tsd(r.gesamtLaufzeit[q.id])}</strong>
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-white" role="img" aria-label={t.quelleAria(q.label, tsd(r.gesamt[q.id]), r.N, tsd(r.gesamtLaufzeit[q.id]), r.L)}>
                    <div className="ov-fortschritt absolute inset-0 rounded-full opacity-35" style={{ transform: `scaleX(${r.gesamtLaufzeit[q.id] / maxQuelle})`, background: q.farbe }} />
                    <div className="ov-fortschritt absolute inset-0 rounded-full" style={{ transform: `scaleX(${r.gesamt[q.id] / maxQuelle})`, background: q.farbe }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12.5px] text-ink-500">{t.kraeftig(r.N, r.L)}</p>
          </div>

          <div className="mt-6 rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">{t.jahrFuerJahr}</h3>
              <p className="text-[12.5px] text-ink-500">{t.jahrText}</p>
            </div>
            <Jahre r={r} quellen={QUELLEN} />
          </div>

          {r.landesregeln && !r.landesregeln.gerechnet ? (
            <Hinweis icon={Info} className="mt-4">
              {t.landesregeln(r.landesregeln.laender.join(", "), t.datum(r.landesregeln.stand))}
            </Hinweis>
          ) : null}

          {!r.ersteGewSt || r.ersteGewSt > 12 ? (
            <Hinweis icon={Info} className="mt-4">
              {t.kaumGewSt(KOMMUNE.afaJahre)}
            </Hinweis>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              {t.fuss}
            </p>
            <Button href={pfad("/kommunen#anfrage")} size="lg" pfeil className="shrink-0">
              {t.gespraech}
            </Button>
          </div>
          {/* Kommunalrechner: § 6 EEG und Gewerbesteuer sind deutsches Recht – nur DE-Regionen wählbar */}
          {!r.sperre && <BerichtAnfordern rechner="kommune" land="DE" eingaben={eingaben} />}
        </>
      }
    />
  );
}

function Jahre({ r, quellen: QUELLEN }) {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt } = f;
  const tsd = tsdMit(f);
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
      <div {...tastatur} role="group" aria-label={t.tastaturAria} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={t.saeulenAria(n, tsd(r.gesamtLaufzeit.summe))}>
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
          <p className="font-semibold">{t.jahr} {aktiv.jahr}</p>
          {QUELLEN.map((q) => (
            <p key={q.id} className="text-white/70">
              {q.label} <span className="ov-num font-semibold text-white">{f.fmtEur(aktiv[q.id])}</span>
            </p>
          ))}
          <p className="text-white/70">
            {t.zusammen} <span className="ov-num font-semibold text-ov-300">{f.fmtEur(aktiv.summe)}</span>
          </p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende items={[...QUELLEN.map((q) => ({ label: q.label, farbe: q.farbe })), { label: t.ende(r.N), farbe: "#c98500", linie: true }]} />
      </div>
    </div>
  );
}

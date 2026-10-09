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
import { pfad as seitenPfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";

const FARBE = { kauf: "#669933", contracting: "#1f5aa1", raster: "#eef0f4" };
const tsdMit = (f) => (v) =>
  f.sprache === "en"
    ? `${v < 0 ? "-" : ""}${Math.abs(v) >= 1e6 ? `€${f.fmt(Math.abs(v) / 1e6, 2)}m` : `€${f.fmt(Math.round(Math.abs(v) / 1000))}k`}`
    : Math.abs(v) >= 1e6
      ? `${f.fmt(v / 1e6, 2)} Mio. €`
      : `${f.fmt(Math.round(v / 1000))} T€`;

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    regionLabel: (id, l) => l.replace("West- & Mitteldeutschland", "West & Mitte"),
    region: "Region",
    leistung: "Leistung",
    vorteilJahr: "Vorteil/Jahr",
    amortisation: "Amortisation",
    jKurz: (f, v) => `${f.fmt(v, 1)} J.`,
    parkplatz: "Parkplatz",
    stellplaetze: "Überdachte Stellplätze",
    stellHinweis: (a, b, c) => `≈ ${a} kWp (${b} kWp je Stellplatz) auf rund ${c} m² Parkfläche inkl. Fahrgassen`,
    baukosten: "Baukosten Carport",
    proKwp: (f, v) => `${f.fmt(v)} €/kWp`,
    baukostenHinweis: (a, b) => `Richtwert ${a}–${b} €/kWp inkl. Stahlbau, Fundamente, Entwässerung.`,
    stromU: "Strom im Unternehmen",
    preis: "Heutiger Strompreis (netto)",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    preisHinweis: "Arbeitspreis inkl. Netzentgelte, Umlagen und Stromsteuer, ohne USt.",
    eigen: "Eigenverbrauch",
    pct: (f, v) => `${f.fmt(v)} %`,
    eigenHinweis: "Anteil des Solarstroms, den Gebäude und Ladepunkte direkt nutzen. Mit Tagbetrieb, Kühlung und E-Flotte oft 60–90 %.",
    laden: "Ladeinfrastruktur",
    ac: "AC-Ladepunkte (11/22 kW)",
    acHinweis: (x) => `je rund ${x} inkl. Installation`,
    dc: "DC-Schnelllader (50–150 kW)",
    dcHinweis: (x) => `je rund ${x} – ohne Netzausbau und Baukostenzuschuss`,
    sr: (a, b, c, d) => `${a} Kilowatt-Peak, Investition ${b}, Amortisation ${c ?? "über"} Jahre, Contracting-Preis ${d ?? "–"} Cent`,
    mwhJahr: (x) => `${x} MWh im Jahr`,
    vorteilKauf: "Vorteil/Jahr (Kauf)",
    vorteilZusatz: "Ersparnis + Einspeisung − Betrieb",
    jahreSuffix: " Jahre",
    ueberLaufzeit: (n) => `> ${n} J.`,
    kaufInkl: "Kauf, inkl. Ladepunkte",
    kwhKwp: (f, v) => `${f.fmt(v)} kWh/kWp`,
    investition: "Investition",
    davonLaden: (x) => `davon Laden ${x}`,
    ohneLaden: "ohne Ladepunkte",
    selbst: "Selbst investieren",
    ersparnis1: "Ersparnis Jahr 1",
    einspeisung: "Einspeisung Überschuss",
    betrieb: "Betrieb & Wartung",
    ueberschussNach: (n) => `Überschuss nach ${n} Jahren`,
    selbstText: "Höchster Vorteil über die Laufzeit, dafür Kapitalbindung und Betrieb im eigenen Haus. Abschreibung und Steuerwirkung klären Sie mit Ihrer Steuerberatung.",
    contracting: "Contracting / PPA",
    ihreInvestition: "Ihre Investition",
    ladenKlammer: (x) => `${x} (Laden)`,
    null: "0 €",
    solarpreis: "Solarstrompreis",
    stattNetz: "statt Netzstrom",
    conText: (n) => `Wir bauen und betreiben, Sie kaufen den Strom vor Ort – ${n} Jahre fest, danach Übernahme der Anlage. Der Preis ist aus Vollkosten hergeleitet.`,
    lohntNicht: (x) => `Bei ${x} % Eigenverbrauch liegt der kostendeckende Contracting-Preis über Ihrem heutigen Strompreis. Mehr Eigenverbrauch – etwa durch Ladepunkte oder einen Speicher – ändert das.`,
    kumuliert: (n) => `Kumulierter Vorteil über ${n} Jahre`,
    kumText: "Strompreis steigt mit der Inflation, Contracting-Preis bleibt fest",
    co2: "CO₂ vermieden",
    co2Wert: (f, v) => `${f.fmt(v)} t/Jahr`,
    ladeleistung: "Ladeleistung",
    eigenWert: (f, v) => `${f.fmt(v)} MWh/Jahr`,
    fuss: "Orientierung ohne Förderung und Steuern – wir rechnen gern mit Ihrem Lastgang und Lageplan.",
    anfragen: "Carport anfragen",
    tastaturAria: "Kumulierter Vorteil – mit den Pfeiltasten durch die Jahre",
    verlaufAria: (n, a, b) => `Kumulierter Vorteil nach ${n} Jahren: Kauf ${a}, Contracting ${b}.`,
    start: "Start",
    nachJahr: (i) => `Nach Jahr ${i}`,
    kauf: "Kauf",
    contractingKurz: "Contracting",
    vertragsende: (n) => `Vertragsende Jahr ${n}`,
  },
  en: {
    regionLabel: (id, l) => regionEn(id, "label", l).replace("Western & central Germany", "West & Central"),
    region: "Region",
    leistung: "Capacity",
    vorteilJahr: "Benefit/year",
    amortisation: "Payback",
    jKurz: (f, v) => `${f.fmt(v, 1)} yrs`,
    parkplatz: "Car park",
    stellplaetze: "Covered parking spaces",
    stellHinweis: (a, b, c) => `≈ ${a} kWp (${b} kWp per space) on around ${c} m² of parking area incl. driving lanes`,
    baukosten: "Carport construction costs",
    proKwp: (f, v) => f.eur(v, "/kWp"),
    baukostenHinweis: (a, b) => `Guide value €${a}–${b}/kWp incl. steelwork, foundations, drainage.`,
    stromU: "Power in your business",
    preis: "Current electricity price (net)",
    ct: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    preisHinweis: "Energy price incl. grid fees, levies and electricity tax, excl. VAT.",
    eigen: "Self-consumption",
    pct: (f, v) => f.pct(v),
    eigenHinweis: "Share of the solar power used directly by the building and charging points. With daytime operation, cooling and an e-fleet often 60–90%.",
    laden: "Charging infrastructure",
    ac: "AC charging points (11/22 kW)",
    acHinweis: (x) => `around ${x} each incl. installation`,
    dc: "DC fast chargers (50–150 kW)",
    dcHinweis: (x) => `around ${x} each – excluding grid upgrades and construction cost contribution`,
    sr: (a, b, c, d) => `${a} kilowatts peak, investment ${b}, payback ${c ?? "more than the term in"} years, contracting price ${d ?? "–"} cents`,
    mwhJahr: (x) => `${x} MWh per year`,
    vorteilKauf: "Benefit/year (purchase)",
    vorteilZusatz: "savings + feed-in − operation",
    jahreSuffix: " years",
    ueberLaufzeit: (n) => `> ${n} yrs`,
    kaufInkl: "purchase, incl. charging points",
    kwhKwp: (f, v) => `${f.fmt(v)} kWh/kWp`,
    investition: "Investment",
    davonLaden: (x) => `of which charging ${x}`,
    ohneLaden: "without charging points",
    selbst: "Invest yourself",
    ersparnis1: "Savings year 1",
    einspeisung: "Feed-in of surplus",
    betrieb: "Operation & maintenance",
    ueberschussNach: (n) => `Surplus after ${n} years`,
    selbstText: "The highest benefit over the term, but capital is tied up and operation is handled in-house. Clarify depreciation and tax effects with your tax adviser.",
    contracting: "Contracting / PPA",
    ihreInvestition: "Your investment",
    ladenKlammer: (x) => `${x} (charging)`,
    null: "€0",
    solarpreis: "Solar power price",
    stattNetz: "instead of grid power",
    conText: (n) => `We build and operate, you buy the power on site – fixed for ${n} years, then you take over the plant. The price is derived from full costs.`,
    lohntNicht: (x) => `At ${x}% self-consumption, the cost-covering contracting price is above your current electricity price. More self-consumption – for example through charging points or storage – changes that.`,
    kumuliert: (n) => `Cumulative benefit over ${n} years`,
    kumText: "Electricity price rises with inflation, contracting price stays fixed",
    co2: "CO₂ avoided",
    co2Wert: (f, v) => `${f.fmt(v)} t/year`,
    ladeleistung: "Charging capacity",
    eigenWert: (f, v) => `${f.fmt(v)} MWh/year`,
    fuss: "Guidance without subsidies and taxes – we are happy to calculate with your load profile and site plan.",
    anfragen: "Enquire about a carport",
    tastaturAria: "Cumulative benefit – use the arrow keys to move through the years",
    verlaufAria: (n, a, b) => `Cumulative benefit after ${n} years: purchase ${a}, contracting ${b}.`,
    start: "Start",
    nachJahr: (i) => `After year ${i}`,
    kauf: "Purchase",
    contractingKurz: "Contracting",
    vertragsende: (n) => `End of contract, year ${n}`,
  },
};

export default function CarportRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  const tsd = tsdMit(f);
  const [stellplaetze, setStellplaetze] = useState(STANDARD.stellplaetze);
  const [regionId, setRegionId] = useState(() => landStart(STANDARD, seitenLand).regionId);
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
      legende={t.region}
      wert={regionId}
      onChange={setRegionId}
      spalten={2}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, x.label), sub: `${fmt(Math.round(x.ertrag * CARPORT.ertragFaktor))} kWh/kWp` }))}
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
              [t.leistung, `${fmt(r.kwp)} kWp`],
              [t.vorteilJahr, tsd(r.kauf.nettoJahr1)],
              [t.amortisation, r.kauf.amortisation ? t.jKurz(f, r.kauf.amortisation) : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.parkplatz}>
              <Regler label={t.stellplaetze} wert={stellplaetze} min={10} max={1000} step={5} onChange={setStellplaetze} hinweis={t.stellHinweis(fmt(r.kwp), fmt(CARPORT.kwpProStellplatz, 1), fmt(r.flaecheM2))} />
              {regionWahl}
              <Regler label={t.baukosten} wert={capexKwp} min={1000} max={1900} step={25} format={(v) => t.proKwp(f, v)} onChange={setCapex} hinweis={t.baukostenHinweis(fmt(CARPORT.capexProKwp.min), fmt(CARPORT.capexProKwp.max))} />
            </Gruppe>

            <Gruppe titel={t.stromU}>
              <Regler label={t.preis} wert={strompreisCt} min={10} max={35} step={0.5} stellen={1} format={(v) => t.ct(f, v)} onChange={setStrompreis} hinweis={t.preisHinweis} />
              <Regler
                label={t.eigen}
                wert={eigenverbrauch}
                min={0.2}
                max={1}
                step={0.05}
                format={(v) => t.pct(f, v * 100)}
                onChange={setEigenverbrauch}
                hinweis={t.eigenHinweis}
              />
            </Gruppe>

            <Gruppe titel={t.laden}>
              <Regler label={t.ac} wert={ac} min={0} max={100} step={1} onChange={setAc} hinweis={t.acHinweis(fmtEur(CARPORT.ladepunktAc))} />
              <Regler label={t.dc} wert={dc} min={0} max={20} step={1} onChange={setDc} hinweis={t.dcHinweis(fmtEur(CARPORT.ladepunktDc))} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(fmt(r.kwp), fmtEur(r.invest.summe), r.kauf.amortisation ? fmt(r.kauf.amortisation, 1) : null, con.preisCt ? fmt(con.preisCt, 1) : null)}
          </p>
          <ErgebnisKopf plakette={t.mwhJahr(fmt(r.ertrag / 1000))} />

          <Hauptzahl
            className="mt-5"
            icon={PiggyBank}
            label={t.vorteilKauf}
            zusatz={t.vorteilZusatz}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.amortisation}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  {r.kauf.amortisation ? <Zahl wert={r.kauf.amortisation} stellen={1} suffix={t.jahreSuffix} delta="dunkel" /> : t.ueberLaufzeit(CARPORT.laufzeit)}
                </p>
                <p className="text-[12.5px] text-white/75">{t.kaufInkl}</p>
              </div>
            }
          >
            <Zahl wert={r.kauf.nettoJahr1} format={tsd} delta="dunkel" einlauf />
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Sun} label={t.leistung} zusatz={t.kwhKwp(f, r.spez)}>
              <Zahl wert={r.kwp} suffix=" kWp" delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Wallet} label={t.investition} zusatz={r.invest.laden ? t.davonLaden(tsd(r.invest.laden)) : t.ohneLaden}>
              <Zahl wert={r.invest.summe} format={tsd} delta="hell" />
            </Kennzahl>
          </Belege>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Variante
              titel={t.selbst}
              icon={Wallet}
              aktiv
              farbe={FARBE.kauf}
              zeilen={[
                [t.investition, tsd(r.invest.summe)],
                [t.ersparnis1, tsd(r.kauf.ersparnisJahr1)],
                [t.einspeisung, tsd(r.kauf.einspeisungJahr1)],
                [t.betrieb, `−${tsd(r.opexPv)}`],
                [t.ueberschussNach(CARPORT.laufzeit), tsd(r.kauf.ueberschuss)],
              ]}
              text={t.selbstText}
            />
            <Variante
              titel={t.contracting}
              icon={Handshake}
              farbe={FARBE.contracting}
              zeilen={[
                [t.ihreInvestition, r.invest.laden ? t.ladenKlammer(tsd(r.invest.laden)) : t.null],
                [t.solarpreis, con.preisCt ? t.ct(f, con.preisCt) : "–"],
                [t.stattNetz, t.ct(f, strompreisCt)],
                [t.ersparnis1, tsd(con.ersparnisJahr1)],
                [t.ueberschussNach(CARPORT.laufzeit), tsd(con.ueberschuss)],
              ]}
              text={t.conText(CARPORT.contractingJahre)}
            />
          </div>

          {!con.lohntSich && con.preisCt && (
            <Hinweis ton="warnung" icon={BatteryCharging} className="mt-4">
              {t.lohntNicht(fmt(eigenverbrauch * 100))}
            </Hinweis>
          )}

          <div className="mt-6 rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">{t.kumuliert(CARPORT.laufzeit)}</h3>
              <p className="text-[12.5px] text-ink-500">{t.kumText}</p>
            </div>
            <Verlauf r={r} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
            {[
              [Leaf, t.co2, t.co2Wert(f, r.co2Tonnen)],
              [PlugZap, t.ladeleistung, `${fmt(r.ladeleistungKw)} kW`],
              [Sun, t.eigen, t.eigenWert(f, r.eigenKwh / 1000)],
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
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">{t.fuss}</p>
            <Button href={seitenPfad("/solarcarport#anfrage")} size="lg" pfeil className="shrink-0">
              {t.anfragen}
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
  const t = useTexte(TEXTE);
  const tsd = tsdMit(useFormate());
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
      <div {...tastatur} role="group" aria-label={t.tastaturAria} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={t.verlaufAria(n, tsd(kauf[n]), tsd(con[n]))}>
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
          <p className="font-semibold">{hover === 0 ? t.start : t.nachJahr(hover)}</p>
          <p className="text-white/70">
            {t.kauf} <span className={cn("ov-num font-semibold", kauf[hover] >= 0 ? "text-ov-300" : "text-sun-300")}>{tsd(kauf[hover])}</span>
          </p>
          <p className="text-white/70">
            {t.contractingKurz} <span className={cn("ov-num font-semibold", con[hover] >= 0 ? "text-ov-300" : "text-sun-300")}>{tsd(con[hover])}</span>
          </p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: t.selbst, farbe: FARBE.kauf, linie: true },
            { label: t.contracting, farbe: FARBE.contracting, linie: true },
            { label: t.vertragsende(CARPORT.contractingJahre), farbe: "#7fa7d6", linie: true },
          ]}
        />
      </div>
    </div>
  );
}

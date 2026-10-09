"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CalendarClock, Cable, Percent, Scale, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import ErgebnisAnfrage from "./ErgebnisAnfrage";
import { Ansicht, ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { BalkenJahre, DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { DAUERN, EBENEN, ERLOESNIVEAUS, STANDARD, STANDORTE, erloesAufteilung, rechneSpeicher, vergleichStandorte } from "@/lib/rechner/grossspeicher";
import { SPEICHER } from "@/lib/invest/markt";
import { pfad } from "@/lib/land";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { datumText } from "@/lib/sprache/format";

/** Formatierer in der Sprache der Seite */
function hilfen(f) {
  const en = f.sprache === "en";
  return {
    ...f,
    pct: (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : f.fmtPct(v, s)),
    tsd: (v) => (en ? `€${f.fmt(v / 1000)}k` : `${f.fmt(v / 1000)} T€`),
    mio: en ? " m€" : " Mio. €",
  };
}

const opt = (liste, tab) => liste.map((x) => ({ ...x, label: tab[x.id]?.[0] ?? x.label, sub: tab[x.id]?.[1] ?? x.sub }));

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    standorte: { colocation: ["Co-Location", "am Solarpark"], standalone: ["Stand-alone", "eigener Anschluss"] },
    ebenen: { ms: ["Mittelspannung", "bis ~ 20 MW"], hs: ["Hochspannung", "110 kV"] },
    niveaus: { vorsichtig: ["Vorsichtig", "Floor/Tolling-Niveau"], mittel: ["Mittel", "Merchant, realistisch"], optimistisch: ["Optimistisch", "gute Vermarktung"] },
    irr: "Projekt-IRR",
    invest: "Invest",
    amortisation: "Amortisation",
    jKurz: (h, v) => `${h.fmt(v, 1)} J.`,
    speicher: "Speicher",
    leistung: "Leistung",
    dauer: "Speicherdauer",
    systempreis: "Systempreis schlüsselfertig",
    proKwh: (h, v) => `${h.fmt(v)} €/kWh`,
    systemHinweis: (h) => `Richtwert 2026: ${h.fmt(SPEICHER.capexProKwh.min)}–${h.fmt(SPEICHER.capexProKwh.max)} €/kWh (2-h-System, stark fallend).`,
    standortNetz: "Standort & Netz",
    standort: "Standort",
    netzebene: "Netzebene",
    netzdienlich: "Netzdienlicher Betrieb (BKZ-Abschlag)",
    netzdienlichText: (x) => `Einzelne Netzbetreiber senken den Baukostenzuschuss auf ${x} %`,
    befreiung: "Netzentgeltbefreiung",
    befreiungText: (d) => `§ 118 Abs. 6 EnWG: Inbetriebnahme bis ${d}`,
    erloeseTitel: "Erlöse je MW und Jahr (2-h-Basis)",
    niveau: "Erlösniveau",
    tsdMw: (h, v) => `${h.fmt(v / 1000)} T€/MW`,
    arbitrage: "Arbitrage (Day-Ahead, Intraday)",
    afrr: "Sekundärregelleistung aFRR",
    fcr: "Primärregelleistung FCR",
    summeText: (a, b) => `Summe ${a} T€/MW·a. Zum Vergleich: Der ISEA-Index weist für 2025 theoretisch ${b} T€/MW aus – mit perfekter Voraussicht, real deutlich weniger.`,
    technik: "Technik & Markt",
    degradation: "Degradation (Kapazität)",
    paEinheit: "% p. a.",
    trend: "Erlöstrend",
    trendFormat: (h, v) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${h.fmt(Math.abs(v), 1)} % p. a.`,
    trendHinweis: "Mehr Speicher im Markt drückt Preisspreads und Regelenergiepreise.",
    zyklen: "Vollzyklen pro Jahr",
    zyklenHinweis: (x) => `≈ ${x} Zyklen pro Tag – Garantiebedingungen des Herstellers beachten.`,
    dauerJahre: "Betrachtungsdauer",
    jahreEinheit: "Jahre",
    sr: (irr, inv, am) => `Projektrendite ${irr}, Investition ${inv}, Amortisation ${am ?? "nicht innerhalb der Laufzeit"}.`,
    jahre: (h, v) => `${h.fmt(v, 1)} Jahre`,
    plakette: (a, b) => `${a} MW / ${b} MWh · vor Steuern`,
    ohneFinanzierung: (n) => `ohne Finanzierung, ${n} Jahre`,
    investition: "Investition",
    gesamtKwh: (h, v) => `${h.fmt(v)} €/kWh gesamt`,
    pctSuffix: " %",
    deltaPkt: (h, d) => `${h.fmt(d, 1)} %-Pkt.`,
    statisch: "statisch, kumuliert",
    jSuffix: " J.",
    laufzeitUeber: "> Laufzeit",
    kapitalwert: "Kapitalwert",
    abgezinst: (x) => `abgezinst mit ${x}`,
    erloes1: "Erlös Jahr 1",
    jeMw: (x) => `${x} je MW`,
    cf1: "Cashflow Jahr 1",
    nachBetrieb: "nach Betrieb & Vermarktung",
    bkzHinweis: (x) => `Baukostenzuschuss ${x} – seit dem BGH-Beschluss vom 15.07.2025 auch für Speicher zulässig. Höhe je Netzbetreiber, früh anfragen.`,
    ohneBefreiung: (x) => `Ohne Befreiung rechnen wir grob mit ${x} ct/kWh Netzentgelt auf den Ladestrom – die Reform der Netzentgelte ist nach aktuellem Stand offen.`,
    zyklenWarn: "Über 1,5 Zyklen pro Tag beschleunigen die Alterung – Degradation und Garantie entsprechend prüfen.",
    satzOhne: "Standort und Anschluss gemeinsam prüfen",
    satzMit: "Projekt-IRR – Standort und Anschluss gemeinsam prüfen",
    nachricht: (mw, mwh, st, eb, n, irr, inv) => `Aus dem Großspeicher-Rechner: ${mw} MW / ${mwh} MWh, ${st}, ${eb}, ${n} Jahre. Ergebnis (Modellrechnung): Projekt-IRR ${irr}, Investition ${inv}. Bitte Standort und Netzanschluss mit mir prüfen.`,
    planen: "Großspeicher planen",
    anfrageHinweis: "Modellrechnung vor Steuern und Finanzierung, ohne Gewähr. Erlöse sind stark marktabhängig – für Banken zählen Tolling- oder Floor-Verträge.",
    jahrTitel: "Erlöse und Kosten je Jahr",
    kumTitel: "Kumulierter Cashflow",
    jahrZusatz: "Erlösmix nach Markt, Kosten nach unten",
    kumZusatz: "Ab dem Nulldurchgang ist die Investition zurückverdient",
    ansichtLabel: "Diagrammansicht",
    jeJahr: "Je Jahr",
    kumuliert: "Kumuliert",
    kostenSerie: "Betrieb, Vermarktung, Netz",
    cashflow: "Cashflow",
    balkenAria: (n, x) => `Erlöse und Kosten je Jahr über ${n} Jahre; Cashflow im ersten Jahr ${x}.`,
    jahr: "Jahr",
    kosten: "Kosten",
    ihreWahl: " (Ihre Wahl)",
    linienAria: (n) => `Kumulierter Cashflow von Co-Location und Stand-alone über ${n} Jahre.`,
    nachJahr: (i) => `Nach Jahr ${i}`,
    davonNetz: "davon Netz + BKZ",
    coText: (x) => `Nutzt den Netzanschluss des Solarparks mit – kein zusätzlicher BKZ, dafür ${x} % Erlösabschlag für geteilte Anschlussleistung.`,
    saText: "Freie Fahrweise und volle Erlöse, aber eigener Netzanschluss und Baukostenzuschuss.",
    system: "Speichersystem",
    netzanschluss: "Netzanschluss",
    bkz: "Baukostenzuschuss",
  },
  en: {
    standorte: { colocation: ["Co-location", "at the solar park"], standalone: ["Stand-alone", "own connection"] },
    ebenen: { ms: ["Medium voltage", "up to ~20 MW"], hs: ["High voltage", "110 kV"] },
    niveaus: { vorsichtig: ["Cautious", "floor/tolling level"], mittel: ["Base", "merchant, realistic"], optimistisch: ["Optimistic", "strong marketing"] },
    irr: "Project IRR",
    invest: "Investment",
    amortisation: "Payback",
    jKurz: (h, v) => `${h.fmt(v, 1)} yrs`,
    speicher: "Storage",
    leistung: "Power",
    dauer: "Storage duration",
    systempreis: "Turnkey system price",
    proKwh: (h, v) => h.eur(v, "/kWh"),
    systemHinweis: (h) => `Guide value 2026: ${h.eur(SPEICHER.capexProKwh.min)}–${h.eur(SPEICHER.capexProKwh.max, "/kWh")} (2-hour system, falling sharply).`,
    standortNetz: "Location & grid",
    standort: "Location",
    netzebene: "Voltage level",
    netzdienlich: "Grid-supportive operation (contribution discount)",
    netzdienlichText: (x) => `Some grid operators reduce the construction cost contribution to ${x}%`,
    befreiung: "Grid fee exemption",
    befreiungText: (d) => `§ 118(6) EnWG: commissioning by ${datumText(d, "en")}`,
    erloeseTitel: "Revenue per MW per year (2-hour basis)",
    niveau: "Revenue level",
    tsdMw: (h, v) => `€${h.fmt(v / 1000)}k/MW`,
    arbitrage: "Arbitrage (day-ahead, intraday)",
    afrr: "Secondary control reserve aFRR",
    fcr: "Primary control reserve FCR",
    summeText: (a, b) => `Total €${a}k/MW·yr. For comparison: the ISEA index shows a theoretical €${b}k/MW for 2025 – with perfect foresight; in reality considerably less.`,
    technik: "Technology & market",
    degradation: "Degradation (capacity)",
    paEinheit: "% p.a.",
    trend: "Revenue trend",
    trendFormat: (h, v) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${h.fmt(Math.abs(v), 1)}% p.a.`,
    trendHinweis: "More storage in the market compresses price spreads and balancing prices.",
    zyklen: "Full cycles per year",
    zyklenHinweis: (x) => `≈ ${x} cycles per day – observe the manufacturer’s warranty conditions.`,
    dauerJahre: "Period under review",
    jahreEinheit: "years",
    sr: (irr, inv, am) => `Project return ${irr}, investment ${inv}, payback ${am ?? "not within the term"}.`,
    jahre: (h, v) => `${h.fmt(v, 1)} years`,
    plakette: (a, b) => `${a} MW / ${b} MWh · before tax`,
    ohneFinanzierung: (n) => `without financing, ${n} years`,
    investition: "Investment",
    gesamtKwh: (h, v) => `${h.eur(v, "/kWh")} in total`,
    pctSuffix: "%",
    deltaPkt: (h, d) => `${h.fmt(d, 1)} pp`,
    statisch: "static, cumulative",
    jSuffix: " yrs",
    laufzeitUeber: "> term",
    kapitalwert: "Net present value",
    abgezinst: (x) => `discounted at ${x}`,
    erloes1: "Revenue, year 1",
    jeMw: (x) => `${x} per MW`,
    cf1: "Cash flow, year 1",
    nachBetrieb: "after operation & marketing",
    bkzHinweis: (x) => `Construction cost contribution ${x} – permissible for storage too since the BGH decision of 15 July 2025. The amount varies by grid operator; enquire early.`,
    ohneBefreiung: (x) => `Without the exemption, we roughly assume ${x} ct/kWh of grid fees on charging power – the grid fee reform is still open at the time of writing.`,
    zyklenWarn: "More than 1.5 cycles per day accelerate ageing – check degradation and warranty accordingly.",
    satzOhne: "Review location and connection together",
    satzMit: "project IRR – review location and connection together",
    nachricht: (mw, mwh, st, eb, n, irr, inv) => `From the battery storage calculator: ${mw} MW / ${mwh} MWh, ${st}, ${eb}, ${n} years. Result (model calculation): project IRR ${irr}, investment ${inv}. Please review the location and grid connection with me.`,
    planen: "Plan battery storage",
    anfrageHinweis: "Model calculation before tax and financing, without guarantee. Revenues depend heavily on the market – banks look at tolling or floor contracts.",
    jahrTitel: "Revenues and costs per year",
    kumTitel: "Cumulative cash flow",
    jahrZusatz: "Revenue mix by market, costs shown downwards",
    kumZusatz: "From the zero crossing, the investment has been recouped",
    ansichtLabel: "Chart view",
    jeJahr: "Per year",
    kumuliert: "Cumulative",
    kostenSerie: "Operation, marketing, grid",
    cashflow: "Cash flow",
    balkenAria: (n, x) => `Revenues and costs per year over ${n} years; cash flow in the first year ${x}.`,
    jahr: "Year",
    kosten: "Costs",
    ihreWahl: " (your choice)",
    linienAria: (n) => `Cumulative cash flow of co-location and stand-alone over ${n} years.`,
    nachJahr: (i) => `After year ${i}`,
    davonNetz: "of which grid + contribution",
    coText: (x) => `Shares the solar park’s grid connection – no additional construction cost contribution, but a ${x}% revenue discount for the shared connection capacity.`,
    saText: "Free operating strategy and full revenues, but its own grid connection and construction cost contribution.",
    system: "Storage system",
    netzanschluss: "Grid connection",
    bkz: "Construction cost contribution",
  },
};

export default function GrossspeicherRechner() {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtEur, fmtMio, pct, tsd } = h;
  const [e, setE] = useState(STANDARD);
  const [niveau, setNiveau] = useState("mittel");
  const [ansicht, setAnsicht] = useState("jahr");
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const setErloes = (k) => (v) => {
    setNiveau(null);
    setE((a) => ({ ...a, erloese: { ...a.erloese, [k]: v } }));
  };
  const waehleNiveau = (id) => {
    setNiveau(id);
    setE((a) => ({ ...a, erloese: erloesAufteilung(ERLOESNIVEAUS.find((n) => n.id === id).proMw) }));
  };
  // Teilen-Link inkl. individuellem Erlösmix: das Objekt `erloese` wird für die Adresszeile in drei Zahlen aufgeteilt
  // (erlArbitrage, erlAfrr, erlFcr); beim Übernehmen wieder zusammengesetzt und das passende Erlösniveau erkannt.
  const mitMix = (z, alt) => {
    const { erlArbitrage, erlAfrr, erlFcr, ...rest } = z;
    const basis = rest.erloese || alt.erloese;
    const erloese = {
      ...basis,
      ...(erlArbitrage != null && { arbitrage: erlArbitrage }),
      ...(erlAfrr != null && { afrr: erlAfrr }),
      ...(erlFcr != null && { fcr: erlFcr }),
    };
    return { ...alt, ...rest, erloese };
  };
  const niveauVon = (erl) =>
    ERLOESNIVEAUS.find((n) => {
      const x = erloesAufteilung(n.proMw);
      return x.arbitrage === erl.arbitrage && x.afrr === erl.afrr && x.fcr === erl.fcr;
    })?.id ?? null;
  useTeilbarerZustand(
    { ...e, erlArbitrage: e.erloese.arbitrage, erlAfrr: e.erloese.afrr, erlFcr: e.erloese.fcr },
    (neu) => {
      const z = mitMix(neu, e);
      setNiveau(niveauVon(z.erloese));
      setE(z);
    },
    {
      optionen: { standort: STANDORTE.map((s) => s.id), ebene: EBENEN.map((x) => x.id) },
      grenzen: {
        mw: [1, 200], dauer: [1, 4], capexKwh: [150, 450], zyklen: [150, 730], lebensdauer: [10, 20], degradation: [0.01, 0.04], erloesTrend: [-0.06, 0.02],
        erlArbitrage: [0, 150000], erlAfrr: [0, 150000], erlFcr: [0, 80000],
      },
      pruefen: (z) => rechneSpeicher(mitMix(z, STANDARD)),
    }
  );
  const r = useMemo(() => rechneSpeicher(e), [e]);
  const vergleich = useMemo(() => vergleichStandorte(e), [e]);
  const summeProMw = e.erloese.arbitrage + e.erloese.afrr + e.erloese.fcr;
  const inv = r.investition;

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz
            werte={[
              [t.irr, pct(r.projektIrr)],
              [t.invest, fmtMio(inv.summe)],
              [t.amortisation, r.amortisation ? t.jKurz(h, r.amortisation) : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.speicher}>
              <Regler label={t.leistung} wert={e.mw} min={1} max={200} step={1} einheit="MW" onChange={set("mw")} />
              <Auswahl legende={t.dauer} wert={e.dauer} onChange={set("dauer")} optionen={DAUERN.map((d) => ({ id: d, label: `${d} h`, sub: `${fmt(e.mw * d)} MWh` }))} />
              <Regler
                label={t.systempreis}
                wert={e.capexKwh}
                min={150}
                max={450}
                step={5}
                format={(v) => t.proKwh(h, v)}
                onChange={set("capexKwh")}
                hinweis={t.systemHinweis(h)}
              />
            </Gruppe>

            <Gruppe titel={t.standortNetz}>
              <Auswahl legende={t.standort} wert={e.standort} onChange={set("standort")} optionen={opt(STANDORTE, t.standorte)} />
              {e.standort === "standalone" && (
                <>
                  <Auswahl legende={t.netzebene} wert={e.ebene} onChange={set("ebene")} optionen={opt(EBENEN, t.ebenen)} />
                  <Schalter
                    icon={Cable}
                    label={t.netzdienlich}
                    beschreibung={t.netzdienlichText(fmt(SPEICHER.bkzNetzdienlichFaktor * 100))}
                    an={e.netzdienlich}
                    onChange={set("netzdienlich")}
                  />
                </>
              )}
              <Schalter
                icon={Scale}
                label={t.befreiung}
                beschreibung={t.befreiungText(SPEICHER.netzentgeltBefreiungBis)}
                an={e.netzentgeltBefreit}
                onChange={set("netzentgeltBefreit")}
              />
            </Gruppe>

            <Gruppe titel={t.erloeseTitel}>
              <Auswahl legende={t.niveau} wert={niveau} onChange={waehleNiveau} optionen={ERLOESNIVEAUS.map((n) => ({ id: n.id, label: t.niveaus[n.id]?.[0] ?? n.label, sub: t.tsdMw(h, n.proMw) }))} klein />
              <Regler label={t.arbitrage} wert={e.erloese.arbitrage} min={0} max={150000} step={1000} format={tsd} onChange={setErloes("arbitrage")} />
              <Regler label={t.afrr} wert={e.erloese.afrr} min={0} max={150000} step={1000} format={tsd} onChange={setErloes("afrr")} />
              <Regler label={t.fcr} wert={e.erloese.fcr} min={0} max={80000} step={1000} format={tsd} onChange={setErloes("fcr")} />
              <p className="-mt-2 text-[13px] leading-relaxed text-ink-500">{t.summeText(fmt(summeProMw / 1000), fmt(SPEICHER.indexErloes2025.gesamt2h / 1000))}</p>
            </Gruppe>

            <Gruppe titel={t.technik}>
              <Regler label={t.degradation} wert={e.degradation * 100} min={1} max={4} step={0.25} stellen={2} einheit={t.paEinheit} onChange={(v) => set("degradation")(v / 100)} />
              <Regler
                label={t.trend}
                wert={e.erloesTrend * 100}
                min={-6}
                max={2}
                step={0.5}
                stellen={1}
                format={(v) => t.trendFormat(h, v)}
                onChange={(v) => set("erloesTrend")(v / 100)}
                hinweis={t.trendHinweis}
              />
              <Regler label={t.zyklen} wert={e.zyklen} min={150} max={730} step={10} onChange={set("zyklen")} hinweis={t.zyklenHinweis(fmt(e.zyklen / 365, 1))} />
              <Regler label={t.dauerJahre} wert={e.lebensdauer} min={10} max={20} step={1} einheit={t.jahreEinheit} onChange={set("lebensdauer")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{t.sr(pct(r.projektIrr), fmtMio(inv.summe), r.amortisation ? t.jahre(h, r.amortisation) : null)}</p>
          <ErgebnisKopf plakette={t.plakette(fmt(e.mw), fmt(r.mwh))} />
          <Hauptzahl
            className="mt-5"
            icon={Percent}
            label={t.irr}
            zusatz={t.ohneFinanzierung(e.lebensdauer)}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <BatteryCharging aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.investition}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  <Zahl wert={inv.summe} format={(v) => fmtMio(v, 2)} />
                </p>
                <p className="text-[12.5px] text-white/75">{t.gesamtKwh(h, r.investProKwh)}</p>
              </div>
            }
          >
            {r.projektIrr == null ? "–" : <Zahl wert={r.projektIrr * 100} stellen={1} suffix={t.pctSuffix} delta="dunkel" deltaFormat={(d) => t.deltaPkt(h, d)} einlauf />}
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={CalendarClock} label={t.amortisation} zusatz={t.statisch}>
              {r.amortisation ? <Zahl wert={r.amortisation} stellen={1} suffix={t.jSuffix} delta="hell" /> : t.laufzeitUeber}
            </Kennzahl>
            <Kennzahl icon={Scale} label={t.kapitalwert} zusatz={t.abgezinst(pct(e.diskont, 0))}>
              <span className={r.kapitalwert < 0 ? "text-sun-700" : undefined}>
                <Zahl wert={r.kapitalwert} format={(v) => fmtMio(v, 2)} delta="hell" />
              </span>
            </Kennzahl>
            <Kennzahl icon={Zap} label={t.erloes1} zusatz={t.jeMw(tsd(r.erloesProMwJahr1))}>
              <Zahl wert={r.erloesJahr1} format={tsd} />
            </Kennzahl>
            <Kennzahl icon={Cable} label={t.cf1} zusatz={t.nachBetrieb}>
              <Zahl wert={r.cfJahr1} format={tsd} />
            </Kennzahl>
          </Belege>

          <InvestZeile inv={inv} />

          <div className="mt-4 space-y-2.5">
            {e.standort === "standalone" && inv.bkz > 0 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                {t.bkzHinweis(fmtEur(inv.bkz))}
              </Hinweis>
            )}
            {!e.netzentgeltBefreit && (
              <Hinweis ton="neutral" icon={Scale}>
                {t.ohneBefreiung(fmt(SPEICHER.netzentgeltCt, 1))}
              </Hinweis>
            )}
            {e.zyklen > 550 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                {t.zyklenWarn}
              </Hinweis>
            )}
          </div>

          <ErgebnisAnfrage
            typ="speicher"
            href="/kontakt?anliegen=speicher#formular"
            kennzahl={r.projektIrr == null ? null : <Zahl wert={r.projektIrr * 100} stellen={1} suffix={t.pctSuffix} />}
            satz={r.projektIrr == null ? t.satzOhne : t.satzMit}
            signal={`${r.projektIrr}|${inv.summe}`}
            nachricht={t.nachricht(fmt(e.mw), fmt(r.mwh), t.standorte[e.standort]?.[0] || e.standort, t.ebenen[e.ebene]?.[0] || e.ebene, e.lebensdauer, pct(r.projektIrr), fmtMio(inv.summe))}
            sekundaer={[{ href: pfad("/grossspeicher"), label: t.planen }]}
            hinweis={t.anfrageHinweis}
          />
        </>
      }
      unten={
        <div className="space-y-6">
          <DiagrammKarte
            titel={ansicht === "jahr" ? t.jahrTitel : t.kumTitel}
            zusatz={ansicht === "jahr" ? t.jahrZusatz : t.kumZusatz}
            rechts={
              <Ansicht
                name="bess-ansicht"
                label={t.ansichtLabel}
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "jahr", label: t.jeJahr },
                  { id: "kumuliert", label: t.kumuliert },
                ]}
              />
            }
          >
            {ansicht === "jahr" ? (
              <BalkenJahre
                zeilen={r.jahre.map((j) => ({ label: String(j.jahr), werte: { arbitrage: j.arbitrage, afrr: j.afrr, fcr: j.fcr, kosten: -j.kosten, cf: j.cf } }))}
                serien={[
                  { key: "afrr", label: "aFRR", farbe: FARBEN.gruen },
                  { key: "arbitrage", label: "Arbitrage", farbe: FARBEN.gruenHell },
                  { key: "fcr", label: "FCR", farbe: FARBEN.sunHell },
                  { key: "kosten", label: t.kostenSerie, farbe: FARBEN.grau },
                ]}
                linie={{ key: "cf", label: t.cashflow, farbe: FARBEN.ink }}
                ariaLabel={t.balkenAria(e.lebensdauer, fmtEur(r.cfJahr1))}
                tooltip={(z, i) => {
                  const j = r.jahre[i];
                  return (
                    <>
                      <p className="font-semibold">{t.jahr} {j.jahr}</p>
                      <p className="text-white/70">aFRR <span className="ov-num font-semibold text-white">{tsd(j.afrr)}</span></p>
                      <p className="text-white/70">Arbitrage <span className="ov-num font-semibold text-white">{tsd(j.arbitrage)}</span></p>
                      <p className="text-white/70">FCR <span className="ov-num font-semibold text-white">{tsd(j.fcr)}</span></p>
                      <p className="text-white/70">{t.kosten} <span className="ov-num font-semibold text-white">−{tsd(j.kosten)}</span></p>
                      <p className="text-white/70">{t.cashflow} <span className="ov-num font-semibold text-ov-300">{tsd(j.cf)}</span></p>
                    </>
                  );
                }}
              />
            ) : (
              <Linien
                xLabels={r.kumuliert.map((_, i) => String(i))}
                serien={vergleich.map((v) => ({ key: v.id, label: `${t.standorte[v.id]?.[0] ?? v.label}${v.id === e.standort ? t.ihreWahl : ""}`, farbe: v.id === "colocation" ? FARBEN.gruen : FARBEN.navy, werte: v.r.kumuliert, dick: v.id === e.standort }))}
                ariaLabel={t.linienAria(e.lebensdauer)}
                tooltip={(i) => (
                  <>
                    <p className="font-semibold">{i === 0 ? t.investition : t.nachJahr(i)}</p>
                    {vergleich.map((v) => (
                      <p key={v.id} className="text-white/70">
                        {t.standorte[v.id]?.[0] ?? v.label} <span className="ov-num font-semibold text-white">{fmtMio(v.r.kumuliert[i], 2)}</span>
                      </p>
                    ))}
                  </>
                )}
              />
            )}
          </DiagrammKarte>

          <div className="grid gap-4 md:grid-cols-2">
            {vergleich.map((v) => (
              <div key={v.id} className={cn("rounded-3xl p-5 ring-1 md:p-6", v.id === e.standort ? "bg-ov-50/60 ring-ov-200" : "bg-sand-50 ring-ink-200/60")}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-[18px] font-extrabold text-ink-900">{t.standorte[v.id]?.[0] ?? v.label}</p>
                  <p className="ov-num font-display text-[20px] font-extrabold text-ink-900">{pct(v.r.projektIrr)}</p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
                  <dt className="text-ink-500">{t.investition}</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{fmtMio(v.r.investition.summe, 2)}</dd>
                  <dt className="text-ink-500">{t.davonNetz}</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{fmtMio(v.r.investition.netz + v.r.investition.bkz, 2)}</dd>
                  <dt className="text-ink-500">{t.erloes1}</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{tsd(v.r.erloesJahr1)}</dd>
                  <dt className="text-ink-500">{t.amortisation}</dt>
                  <dd className="ov-num text-right font-semibold text-ink-800">{v.r.amortisation ? t.jKurz(h, v.r.amortisation) : "–"}</dd>
                </dl>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
                  {v.id === "colocation"
                    ? t.coText(fmt((1 - SPEICHER.coLocationErloesFaktor) * 100))
                    : t.saText}
                </p>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function InvestZeile({ inv }) {
  const t = useTexte(TEXTE);
  const { fmt, fmtEur, fmtMio } = useFormate();
  const teile = [
    [t.system, inv.system, FARBEN.gruen],
    [t.netzanschluss, inv.netz, FARBEN.navy],
    [t.bkz, inv.bkz, FARBEN.sunHell],
  ].filter(([, v]) => v > 0);
  return (
    <div className="mt-4 rounded-2xl bg-ink-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-800">{t.investition} {fmtMio(inv.summe, 2)}</span>
        <span className="ov-num text-ink-600">{fmt(inv.kwh / 1000)} MWh</span>
      </div>
      <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={teile.map(([k, v]) => `${k} ${fmtEur(v)}`).join(", ")}>
        {teile.map(([k, v, f]) => (
          <div key={k} style={{ width: `${(v / inv.summe) * 100}%`, background: f }} className="motion-safe:transition-[width] motion-safe:duration-500" />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-600">
        {teile.map(([k, v, f]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: f }} aria-hidden="true" />
            {k} <span className="ov-num">{fmtMio(v, 2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Coins, Hammer, HandCoins, Info, PiggyBank, Sun, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { SperrEingaben } from "@/components/Rechner/LaenderSperre";
import { DACH, REGIONEN } from "@/lib/invest/markt";
import { STANDARD, NETZSTROM_CT, rechneDach } from "@/lib/rechner/dachpacht";
import { pfad as seitenPfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { optionEn } from "@/lib/sprache/rechnerBegriffe";

const FARBE = { pacht: "#97a0b0", ppa: "#1f5aa1", eigen: "#669933", raster: "#eef0f4" };

/** Formatierer in der Sprache der Seite */
function hilfen(f) {
  return {
    ...f,
    tsd: (v) => `${v < 0 ? "−" : ""}${f.tsd(Math.abs(v))}`,
    pct: (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : f.fmtPct(v, s)),
  };
}

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    regionKurz: { "de-nord": "Nord", "de-ost": "Ost", "de-west": "West/Mitte", "de-sued": "Süd", at: "Österreich", ch: "Schweiz" },
    dacharten: { trapez: ["Trapezblech", "geneigt, Aufdach"], sandwich: ["Sandwichpaneel", "Halle, gedämmt"], flach: ["Flachdach", "Folie/Bitumen, Ost/West"], faserzement: ["Faserzement", "Wellplatten"] },
    ausrichtungen: { sued: "Süd", suedOstWest: "Südost/-west", ostWest: "Ost/West", nord: "Nord, flach geneigt" },
    wege: { pacht: "Dachpacht", ppa: "Pacht + Dachstrom (PPA)", eigen: "Eigeninvestition" },
    region: "Region",
    leistung: "Leistung",
    pachtJahr: "Pacht/Jahr",
    jahre: (n) => `${n} Jahre`,
    dach: "Dach",
    nichtBelegbar: "nicht belegbar",
    sanierungCa: "Sanierung ca.",
    flaeche: "Fläche",
    nutzbar: "Nutzbare Dachfläche",
    m2Hinweis: (kwp, mwh) => `≈ ${kwp} kWp · ${mwh} MWh im ersten Jahr`,
    ohneSanierung: "Ohne Dachsanierung nicht belegbar",
    mindest: (x) => `Unter ${x} m² lohnt sich eine Verpachtung an einen Betreiber selten – eine eigene Anlage ist dann meist der bessere Weg.`,
    dachart: "Dachart",
    ausrichtung: "Ausrichtung",
    referenz: "Referenz",
    minusErtrag: (x) => `−${x} % Ertrag`,
    flachText: "Flachdächer belegen wir in der Regel mit flacher Ost/West-Aufständerung – mehr Leistung je m², gleichmäßigere Erzeugung über den Tag, die Dachrichtung spielt kaum eine Rolle.",
    sanierung: "Dach ist sanierungsbedürftig",
    sanierungText: "Neueindeckung vor der Belegung nötig",
    dachpacht: "Dachpacht",
    pacht: "Pacht",
    proM2: (h, v) => `${h.fmt(v, 2)} €/m²`,
    pachtHinweis: (h) => `Orientierung ${h.fmt(DACH.pachtProM2.min, 2)}–${h.fmt(DACH.pachtProM2.max, 2)} €/m² bzw. ${h.fmt(DACH.pachtProKwp.min)}–${h.fmt(DACH.pachtProKwp.max)} €/kWp und Jahr`,
    laufzeit: "Laufzeit",
    jahreEinheit: "Jahre",
    laufzeitHinweis: (n, v) => `Üblich ${n} Jahre + ${v}`,
    stromEigen: "Strom & Eigeninvestition",
    netzpreis: "Ihr Netzstrompreis",
    ct: (h, v) => `${h.fmt(v, 1)} ct/kWh`,
    netzHinweis: (x) => `Arbeitspreis netto inkl. Netzentgelt, Umlagen, Steuern. Richtwert Mittelstand DE rund ${x} ct.`,
    eigenverbrauch: "Eigenverbrauch vor Ort",
    eigenHinweis: (a, b) => `Anteil des Dachstroms, den Sie oder Ihr Mieter direkt verbrauchen – Gewerbe ohne Speicher meist ${a}–${b} %.`,
    ppaPreis: "PPA-Preis Dachstrom",
    ppaHinweis: (a, b) => `Stromlieferung vom Betreiber an Sie, üblich ${a}–${b} ct/kWh`,
    invest: "Investition bei Eigenbau",
    proKwp: (h, v) => `${h.fmt(v)} €/kWp`,
    investHinweis: (a, b) => `Gewerbedach schlüsselfertig ${a}–${b} €/kWp, ohne Dachsanierung und Netzausbau`,
    ihrDach: "Ihr Dach",
    faserzement: "Faserzement",
    fzTitel: "Faserzement-Dächer werden nicht belegt.",
    fzText: (
      <>
        Wellplatten aus Faserzement – bei Gebäuden vor 1993 häufig asbesthaltig – dürfen nach der Gefahrstoffverordnung nicht überbaut oder angebohrt werden. Auch asbestfreie Platten tragen Module selten dauerhaft sicher. Der Weg führt über eine <strong>Dachsanierung</strong>: neue Eindeckung, danach PV.
      </>
    ),
    neueindeckung: "Neueindeckung grob",
    danach: "Danach möglich (Trapez, Süd)",
    gegenleistung: (
      <>
        Modelle mit <strong>Dachsanierung als Gegenleistung</strong> sind möglich: Der Betreiber finanziert die neue Eindeckung ganz oder teilweise und verrechnet sie mit der Pacht. Stellen Sie das Dach trotzdem vor – wir prüfen, was geht.
      </>
    ),
    vorstellen: "Dach vorstellen",
    kumuliert: (n) => `Kumuliert über ${n} Jahre`,
    zeigen: "Zeigen oder tippen für Jahreswerte",
    sr: (k, p, n, s) => `Leistung ${k} Kilowatt Peak, Pacht ${p} Euro pro Jahr, über ${n} Jahre ${s} Euro.`,
    pachtProJahr: "Pacht pro Jahr",
    proKwp1: (h, v) => `${h.fmt(v, 1)} €/kWp`,
    summe: (n) => `Summe ${n} Jahre`,
    nominalFest: "nominal, fest",
    einmalig: "alternativ einmalig",
    barwertPacht: "Barwert der Pacht",
    stromertrag: "Stromertrag",
    ersteJahr: "im ersten Jahr",
    spanne: "Übliche Pachtspanne für Ihr Dach",
    proJahr: "/ Jahr",
    anteil: (p, ct) => `Ihre Pacht entspricht ${p} der Stromerlöse bei Volleinspeisung (${ct} ct/kWh, Ø Zuschläge Dach 2025).`,
    warn12: "Mehr als 12 % der Stromerlöse als Pacht tragen Dachprojekte heute nur unter sehr guten Bedingungen (großes Dach, Netzanschluss am Gebäude, Stromabnehmer vor Ort). Rechnen Sie vorsichtshalber auch mit dem mittleren Wert.",
    sanierungHinweis: (k, j) => `Neueindeckung grob ${k} – das entspricht rund ${j} Jahren Pacht. Übernimmt der Betreiber die Sanierung als Gegenleistung, sinkt oder entfällt die laufende Pacht; oft ist eine Mischung sinnvoll.`,
    dreiWege: "Drei Wege im Vergleich",
    barwertBei: (p, n) => `Barwert bei ${p} Kalkulationszins · nominale Summe über ${n} Jahre`,
    wegPacht: "Kein Kapital, kein Betriebsrisiko. Betreiber trägt Bau, Versicherung und Wartung.",
    wegPpa: (a, b) => `Reduzierte Pacht plus günstiger Dachstrom zu ${a} ct statt ${b} ct.`,
    wegEigen: (i, irr, am) => `Investition ${i}, IRR ${irr}${am ? `, Amortisation ${am} Jahre` : ""}.`,
    barwertSumme: (x) => `Barwert · Summe ${x}`,
    fuss: "Orientierung vor Steuern, kein Angebot. Statik, Restnutzungsdauer des Dachs, Brandschutz und Netzanschluss entscheiden über das konkrete Angebot.",
    pruefen: "Dach prüfen lassen",
    spanneAria: (a, b, c) => `Spanne ${a} bis ${b}, Ihre Eingabe ${c}`,
    verlaufAria: (n, a, b, c) => `Diagramm: Nach ${n} Jahren summiert sich die Dachpacht auf ${a}, Pacht plus Dachstrom auf ${b} und die Eigeninvestition nach Abzug der Investition auf ${c}.`,
    achse: (h, v) => (Math.abs(v) >= 1e6 ? `${h.fmt(v / 1e6, 1)} Mio.` : `${h.fmt(v / 1000)} Tsd.`),
    jahrKurz: (j) => `${j} J.`,
    jahr: "Jahr",
    legPacht: "Dachpacht",
    legPpa: "Pacht + Dachstrom (PPA)",
    legEigen: "Eigeninvestition (nach Investition)",
    ttPpa: "Pacht + Dachstrom",
    ttEigen: "Eigeninvestition",
  },
  en: {
    regionKurz: { "de-nord": "North", "de-ost": "East", "de-west": "West/Central", "de-sued": "South", at: "Austria", ch: "Switzerland" },
    dacharten: { trapez: ["Trapezoidal sheet", "pitched, on-roof"], sandwich: ["Sandwich panel", "warehouse, insulated"], flach: ["Flat roof", "membrane/bitumen, east/west"], faserzement: ["Fibre cement", "corrugated sheets"] },
    ausrichtungen: { sued: "South", suedOstWest: "South-east/-west", ostWest: "East/West", nord: "North, low pitch" },
    wege: { pacht: "Roof lease", ppa: "Lease + rooftop power (PPA)", eigen: "Own investment" },
    region: "Region",
    leistung: "Capacity",
    pachtJahr: "Lease/year",
    jahre: (n) => `${n} years`,
    dach: "Roof",
    nichtBelegbar: "not usable",
    sanierungCa: "Refurbishment approx.",
    flaeche: "Area",
    nutzbar: "Usable roof area",
    m2Hinweis: (kwp, mwh) => `≈ ${kwp} kWp · ${mwh} MWh in the first year`,
    ohneSanierung: "Not usable without roof refurbishment",
    mindest: (x) => `Below ${x} m², leasing to an operator rarely pays off – your own plant is then usually the better option.`,
    dachart: "Roof type",
    ausrichtung: "Orientation",
    referenz: "Reference",
    minusErtrag: (x) => `−${x}% yield`,
    flachText: "We usually fit flat roofs with low east/west mounting – more capacity per m², more even generation over the day; the roof’s orientation hardly matters.",
    sanierung: "Roof needs refurbishment",
    sanierungText: "New roof covering required before installation",
    dachpacht: "Roof lease",
    pacht: "Lease",
    proM2: (h, v) => h.eur(v, "/m²", 2),
    pachtHinweis: (h) => `Guide ${h.eur(DACH.pachtProM2.min, "", 2)}–${h.eur(DACH.pachtProM2.max, "/m²", 2)} or ${h.eur(DACH.pachtProKwp.min)}–${h.eur(DACH.pachtProKwp.max, "/kWp")} per year`,
    laufzeit: "Term",
    jahreEinheit: "years",
    laufzeitHinweis: (n, v) => `Typically ${n} years + ${optionEn(v)}`,
    stromEigen: "Power & own investment",
    netzpreis: "Your grid electricity price",
    ct: (h, v) => `${h.fmt(v, 1)} ct/kWh`,
    netzHinweis: (x) => `Net energy price incl. grid fees, levies and taxes. Guide value for German SMEs around ${x} ct.`,
    eigenverbrauch: "On-site self-consumption",
    eigenHinweis: (a, b) => `Share of the rooftop power that you or your tenant consume directly – businesses without storage usually ${a}–${b}%.`,
    ppaPreis: "PPA price for rooftop power",
    ppaHinweis: (a, b) => `Power supplied by the operator to you, typically ${a}–${b} ct/kWh`,
    invest: "Investment if you build yourself",
    proKwp: (h, v) => h.eur(v, "/kWp"),
    investHinweis: (a, b) => `Commercial roof, turnkey €${a}–€${b}/kWp, excluding roof refurbishment and grid upgrades`,
    ihrDach: "Your roof",
    faserzement: "Fibre cement",
    fzTitel: "Fibre cement roofs are not used.",
    fzText: (
      <>
        Corrugated fibre cement sheets – often containing asbestos in buildings from before 1993 – must not be built over or drilled under the German Hazardous Substances Ordinance. Even asbestos-free sheets rarely carry modules safely in the long term. The way forward is a <strong>roof refurbishment</strong>: new covering, then PV.
      </>
    ),
    neueindeckung: "New roof covering, roughly",
    danach: "Possible afterwards (trapezoidal, south)",
    gegenleistung: (
      <>
        Models with <strong>roof refurbishment as consideration</strong> are possible: the operator finances all or part of the new covering and offsets it against the lease. Present your roof anyway – we will check what is possible.
      </>
    ),
    vorstellen: "Present your roof",
    kumuliert: (n) => `Cumulative over ${n} years`,
    zeigen: "Hover or tap for annual values",
    sr: (k, p, n, s) => `Capacity ${k} kilowatts peak, lease ${p} euros per year, over ${n} years ${s} euros.`,
    pachtProJahr: "Lease per year",
    proKwp1: (h, v) => h.eur(v, "/kWp", 1),
    summe: (n) => `Total over ${n} years`,
    nominalFest: "nominal, fixed",
    einmalig: "alternatively one-off",
    barwertPacht: "Present value of the lease",
    stromertrag: "Power yield",
    ersteJahr: "in the first year",
    spanne: "Typical lease range for your roof",
    proJahr: "/ year",
    anteil: (p, ct) => `Your lease corresponds to ${p} of the power revenue with full grid feed-in (${ct} ct/kWh, average rooftop awards 2025).`,
    warn12: "Rooftop projects today can only bear a lease of more than 12% of power revenue under very good conditions (large roof, grid connection at the building, power offtaker on site). To be safe, also calculate with the middle value.",
    sanierungHinweis: (k, j) => `New roof covering roughly ${k} – equivalent to around ${j} years of lease. If the operator takes on the refurbishment as consideration, the ongoing lease falls or is waived; a mix often makes sense.`,
    dreiWege: "Three options compared",
    barwertBei: (p, n) => `Present value at a ${p} discount rate · nominal total over ${n} years`,
    wegPacht: "No capital, no operating risk. The operator bears construction, insurance and maintenance.",
    wegPpa: (a, b) => `Reduced lease plus cheaper rooftop power at ${a} ct instead of ${b} ct.`,
    wegEigen: (i, irr, am) => `Investment ${i}, IRR ${irr}${am ? `, payback ${am} years` : ""}.`,
    barwertSumme: (x) => `Present value · total ${x}`,
    fuss: "For guidance before tax, not an offer. Structural load, remaining life of the roof, fire protection and grid connection determine the actual offer.",
    pruefen: "Have your roof checked",
    spanneAria: (a, b, c) => `Range ${a} to ${b}, your input ${c}`,
    verlaufAria: (n, a, b, c) => `Chart: after ${n} years, the roof lease adds up to ${a}, lease plus rooftop power to ${b} and own investment, after deducting the investment, to ${c}.`,
    achse: (h, v) => (Math.abs(v) >= 1e6 ? `${h.fmt(v / 1e6, 1)}m` : `${h.fmt(v / 1000)}k`),
    jahrKurz: (j) => `${j} yrs`,
    jahr: "Year",
    legPacht: "Roof lease",
    legPpa: "Lease + rooftop power (PPA)",
    legEigen: "Own investment (after investment)",
    ttPpa: "Lease + rooftop power",
    ttEigen: "Own investment",
  },
};

export default function DachpachtRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtEur, tsd, pct } = h;
  const [m2, setM2] = useState(STANDARD.m2);
  const [dachart, setDachart] = useState(STANDARD.dachart);
  const [ausrichtung, setAusrichtung] = useState(STANDARD.ausrichtung);
  const [regionId, setRegionId] = useState(() => landStart(STANDARD, seitenLand).regionId);
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

  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard)
  const SETZER = {
    m2: setM2, dachart: setDachart, ausrichtung: setAusrichtung, regionId: setRegionId, pachtProM2: setPachtProM2, laufzeit: setLaufzeit,
    strompreisCt: setStrompreis, eigenPct: setEigenPct, ppaCt: setPpaCt, capexKwp: setCapex, sanierung: setSanierung,
  };
  useTeilbarerZustand(
    { m2, dachart, ausrichtung, regionId, pachtProM2, laufzeit, strompreisCt, eigenPct, ppaCt, capexKwp, sanierung },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { dachart: DACH.dacharten.map((d) => d.id), ausrichtung: DACH.ausrichtung.map((a) => a.id), regionId: REGIONEN.map((x) => x.id) },
      grenzen: { m2: [500, 30000], pachtProM2: [0.5, 4], laufzeit: [15, 30], strompreisCt: [10, 35], eigenPct: [0, 90], ppaCt: [8, 20], capexKwp: [500, 1200] },
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
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionKurz[x.id] || x.label, sub: `${fmt(x.ertrag)} kWh/kWp` }))}
    />
  );
  const eingabenVoll = (
    <>
      <MobilKurz
        werte={
          r.belegbar
            ? [
                [t.leistung, `${fmt(r.kwp)} kWp`],
                [t.pachtJahr, fmtEur(r.pachtJahr)],
                [t.jahre(laufzeit), tsd(r.wege.pacht.summe)],
              ]
            : [
                [t.dach, t.nichtBelegbar],
                [t.sanierungCa, tsd(r.sanierungKosten)],
                [t.flaeche, `${fmt(m2)} m²`],
              ]
        }
      />
      <div className="space-y-8">
        <Gruppe titel={t.dach}>
          <Regler
            label={t.nutzbar}
            wert={m2}
            min={500}
            max={30000}
            step={250}
            format={(v) => `${fmt(v)} m²`}
            onChange={setM2}
            hinweis={r.belegbar ? t.m2Hinweis(fmt(r.kwp), fmt(r.kwhJahr1 / 1000)) : t.ohneSanierung}
          />
          {m2 < DACH.mindestM2 && (
            <Hinweis ton="warnung" icon={Info}>
              {t.mindest(fmt(DACH.mindestM2))}
            </Hinweis>
          )}
          <Auswahl
            legende={t.dachart}
            wert={dachart}
            onChange={setDachart}
            spalten={2}
            klein
            optionen={DACH.dacharten.map((d) => ({ id: d.id, label: t.dacharten[d.id]?.[0] ?? d.label, sub: d.belegbar ? t.dacharten[d.id]?.[1] ?? d.sub : t.nichtBelegbar }))}
          />
          {dachart !== "flach" && dachart !== "faserzement" ? (
            <Auswahl
              legende={t.ausrichtung}
              wert={ausrichtung}
              onChange={setAusrichtung}
              spalten={2}
              klein
              optionen={DACH.ausrichtung.map((a) => ({ id: a.id, label: t.ausrichtungen[a.id] ?? a.label, sub: a.faktor === 1 ? t.referenz : t.minusErtrag(fmt((1 - a.faktor) * 100)) }))}
            />
          ) : dachart === "flach" ? (
            <p className="rounded-2xl bg-white/70 px-4 py-3 text-[13px] leading-relaxed text-ink-600 ring-1 ring-ink-200">
              {t.flachText}
            </p>
          ) : null}
          {regionWahl}
          <Schalter icon={Hammer} label={t.sanierung} beschreibung={t.sanierungText} an={sanierung} onChange={setSanierung} />
        </Gruppe>

        <Gruppe titel={t.dachpacht}>
          <Regler
            label={t.pacht}
            wert={pachtProM2}
            min={0.5}
            max={4}
            step={0.1}
            stellen={2}
            format={(v) => t.proM2(h, v)}
            onChange={setPachtProM2}
            hinweis={t.pachtHinweis(h)}
          />
          <Regler label={t.laufzeit} wert={laufzeit} min={15} max={30} step={1} einheit={t.jahreEinheit} onChange={setLaufzeit} hinweis={t.laufzeitHinweis(DACH.laufzeit, DACH.verlaengerung)} />
        </Gruppe>

        <Gruppe titel={t.stromEigen}>
          <Regler
            label={t.netzpreis}
            wert={strompreisCt}
            min={10}
            max={35}
            step={0.5}
            stellen={1}
            format={(v) => t.ct(h, v)}
            onChange={setStrompreis}
            hinweis={t.netzHinweis(fmt(NETZSTROM_CT, 1))}
          />
          <Regler
            label={t.eigenverbrauch}
            wert={eigenPct}
            min={0}
            max={90}
            step={5}
            einheit="%"
            onChange={setEigenPct}
            hinweis={t.eigenHinweis(fmt(DACH.eigenverbrauch.min * 100), fmt(DACH.eigenverbrauch.max * 100))}
          />
          <Regler
            label={t.ppaPreis}
            wert={ppaCt}
            min={8}
            max={20}
            step={0.5}
            stellen={1}
            format={(v) => t.ct(h, v)}
            onChange={setPpaCt}
            hinweis={t.ppaHinweis(fmt(DACH.ppaVorOrtCt.min), fmt(DACH.ppaVorOrtCt.max))}
          />
          <Regler
            label={t.invest}
            wert={capexKwp}
            min={500}
            max={1200}
            step={10}
            format={(v) => t.proKwp(h, v)}
            onChange={setCapex}
            hinweis={t.investHinweis(fmt(DACH.capexProKwp.min), fmt(DACH.capexProKwp.max))}
          />
        </Gruppe>
      </div>
    </>
  );
  const eingaben = sperre ? <SperrEingaben>{regionWahl}</SperrEingaben> : eingabenVoll;

  if (!r.belegbar) {
    return (
      <RechnerRahmen
        mitlaufend
        sperre={sperre}
        eingaben={eingaben}
        ergebnis={
          <>
            <ErgebnisKopf titel={t.ihrDach} plakette={t.faserzement} />
            <div className="mt-5 rounded-3xl bg-sun-300/15 p-6 ring-1 ring-sun-400/50 md:p-8">
              <AlertTriangle aria-hidden="true" className="h-7 w-7 text-sun-500" />
              <p className="mt-4 font-display text-[20px] font-bold text-ink-900">{t.fzTitel}</p>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-700">{t.fzText}</p>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                  <dt className="text-[12.5px] text-ink-500">{t.neueindeckung}</dt>
                  <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">
                    {tsd(m2 * DACH.sanierungProM2.min)} – {tsd(m2 * DACH.sanierungProM2.max)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                  <dt className="text-[12.5px] text-ink-500">{t.danach}</dt>
                  <dd className="ov-num mt-1 font-display text-[22px] font-extrabold text-ink-900">
                    {fmt(rechneDach({ m2, dachart: "trapez", ausrichtung: "sued", regionId }).kwp)} kWp
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-[13.5px] leading-relaxed text-ink-600">{t.gegenleistung}</p>
            </div>
            <div className="mt-7 flex justify-end border-t border-ink-100 pt-6">
              <Button href={seitenPfad("/dachflaeche-verpachten#anfrage")} size="lg" pfeil>
                {t.vorstellen}
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
      sperre={sperre}
      eingaben={eingaben}
      unten={
        <div className="rounded-3xl ring-1 ring-ink-200/70">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 md:px-6">
            <h3 className="font-display text-[17px] font-bold text-ink-900">{t.kumuliert(laufzeit)}</h3>
            <p className="text-[12.5px] text-ink-500">{t.zeigen}</p>
          </div>
          <Verlauf r={r} />
        </div>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(Math.round(r.kwp), Math.round(r.pachtJahr), laufzeit, Math.round(r.wege.pacht.summe))}
          </p>
          <ErgebnisKopf titel={t.ihrDach} plakette={`${fmt(r.kwp)} kWp · ${fmt(r.spezErtrag)} kWh/kWp`} />

          <Hauptzahl className="mt-5" icon={HandCoins} label={t.pachtProJahr} zusatz={t.proKwp1(h, r.pachtProKwp)}>
            <Zahl wert={Math.round(r.pachtJahr)} format={(v) => fmtEur(v)} />
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={Coins} label={t.summe(laufzeit)} zusatz={t.nominalFest}>
              {tsd(r.wege.pacht.summe)}
            </Kennzahl>
            <Kennzahl icon={Banknote} label={t.einmalig} zusatz={t.barwertPacht}>
              {tsd(r.einmalzahlung)}
            </Kennzahl>
            <Kennzahl icon={Sun} label={t.stromertrag} zusatz={t.ersteJahr}>
              <Zahl wert={r.kwhJahr1 / 1000} suffix=" MWh" />
            </Kennzahl>
          </Belege>

          <div className="mt-4 rounded-2xl bg-ink-50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
              <span className="font-semibold text-ink-800">{t.spanne}</span>
              <span className="ov-num text-ink-700">
                {fmtEur(r.pachtSpanne.min)} – {fmtEur(r.pachtSpanne.max)} {t.proJahr}
              </span>
            </div>
            <SpannenBalken min={r.pachtSpanne.min} max={r.pachtSpanne.max} wert={r.pachtJahr} />
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              {t.anteil(pct(r.pachtAnteilErloes), fmt(DACH.eegDachCt, 1))}
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {r.pachtAnteilErloes > 0.12 && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                {t.warn12}
              </Hinweis>
            )}
            {sanierung && (
              <Hinweis ton="neutral" icon={Hammer}>
                {t.sanierungHinweis(tsd(r.sanierungKosten), fmt(r.sanierungInPachtjahren, 0))}
              </Hinweis>
            )}
          </div>

          <h3 className="mt-7 font-display text-[17px] font-bold text-ink-900">{t.dreiWege}</h3>
          <p className="mt-1 text-[12.5px] text-ink-500">{t.barwertBei(pct(r.eingabe.diskont), laufzeit)}</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { w: r.wege.pacht, icon: HandCoins, farbe: FARBE.pacht, text: t.wegPacht },
              { w: r.wege.ppa, icon: Zap, farbe: FARBE.ppa, text: t.wegPpa(fmt(ppaCt, 1), fmt(strompreisCt, 1)) },
              { w: r.wege.eigen, icon: PiggyBank, farbe: FARBE.eigen, text: t.wegEigen(tsd(r.capex), pct(r.wege.eigen.irr), r.wege.eigen.amortisation ? fmt(r.wege.eigen.amortisation, 1) : null) },
            ].map(({ w, icon: Icon, farbe, text }) => (
              <li key={w.id} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-800">
                  <Icon aria-hidden="true" className="h-4 w-4" style={{ color: farbe }} />
                  {t.wege[w.id] ?? w.label}
                </p>
                <p className="ov-num mt-2 font-display text-[22px] font-extrabold tracking-tight text-ink-900">{tsd(w.barwert)}</p>
                <p className="text-[12px] text-ink-500">{t.barwertSumme(tsd(w.summe))}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                  <div className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${Math.max(0, (w.barwert / maxBw) * 100)}%`, background: farbe }} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">{text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              {t.fuss}
            </p>
            <Button href={seitenPfad("/dachflaeche-verpachten#anfrage")} size="lg" pfeil className="shrink-0">
              {t.pruefen}
            </Button>
          </div>
        </>
      }
    />
  );
}

function SpannenBalken({ min, max, wert }) {
  const t = useTexte(TEXTE);
  const { fmtEur } = useFormate();
  const unten = min * 0.5;
  const oben = max * 1.25;
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - unten) / (oben - unten)) * 100))}%`;
  return (
    <div className="relative mt-3 h-3 rounded-full bg-ink-100" role="img" aria-label={t.spanneAria(fmtEur(min), fmtEur(max), fmtEur(wert))}>
      <div className="absolute inset-y-0 rounded-full bg-ov-200" style={{ left: pos(min), right: `calc(100% - ${pos(max)})` }} />
      <div className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-ov-600 shadow motion-safe:transition-[left] motion-safe:duration-300" style={{ left: pos(wert) }} />
    </div>
  );
}

function Verlauf({ r }) {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmtEur } = h;
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
        aria-label={t.verlaufAria(n, fmtEur(r.wege.pacht.summe), fmtEur(r.wege.ppa.summe), fmtEur(r.wege.eigen.summe))}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-6 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[11px]">
              {Math.abs(v) < 1e-6 ? "0" : t.achse(h, v)}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30].filter((j) => j <= n && (!schmal || j % 10 === 0 || j === n)).map((j) => (
          <text key={j} x={x(j)} y={H - P.b + 20} textAnchor={j === n ? "end" : "middle"} className="fill-ink-500 text-[11px]">
            {j === n ? t.jahrKurz(j) : j}
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
          <p className="font-semibold">{t.jahr} {aktiv.jahr}</p>
          <p className="text-white/70">{t.legPacht} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumA)}</span></p>
          <p className="text-white/70">{t.ttPpa} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.sumB)}</span></p>
          <p className="text-white/70">{t.ttEigen} <span className={cn("ov-num font-semibold", aktiv.sumC < 0 ? "text-sun-300" : "text-ov-300")}>{fmtEur(aktiv.sumC)}</span></p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: t.legPacht, farbe: FARBE.pacht, linie: true },
            { label: t.legPpa, farbe: FARBE.ppa, linie: true },
            { label: t.legEigen, farbe: FARBE.eigen, linie: true },
          ]}
        />
      </div>
    </div>
  );
}

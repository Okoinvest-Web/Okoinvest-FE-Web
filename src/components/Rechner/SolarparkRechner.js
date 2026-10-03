"use client";

import { SperrEingaben } from "./LaenderSperre";
import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, CalendarClock, ChevronDown, Gauge, Landmark, Percent, Scale, SlidersHorizontal, TableProperties } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "./bausteine";
import { Ansicht, ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { useDiagrammTastatur } from "./ToolTeile";
import { useTeilbarerZustand } from "./kontext";
import ErgebnisAnfrage from "./ErgebnisAnfrage";
import { ERLOESMODELLE, STANDARD, rechneSolarpark, sensitivitaet } from "@/lib/rechner/solarpark";
import { REGIONEN, BAUART, FREIFLAECHE, ERLOESE, PACHT, FINANZIERUNG, AGRI, ZUSCHLAEGE, letzteZuschlaege } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtMio } from "@/lib/rechner/annahmen";

const FARBE = { erloes: "#669933", kosten: "#c4cad5", dienst: "#1f5aa1", cf: "#151a24", ek: "#669933", projekt: "#1f5aa1", raster: "#eef0f4" };
const pct = (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : `${fmt(v * 100, s)} %`);
const tsd = (v) => `${fmt(v / 1000)} T€`;

export default function SolarparkRechner() {
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [regionId, setRegionId] = useState(STANDARD.regionId);
  const [bauart, setBauart] = useState(STANDARD.bauart);
  const [capexKwp, setCapex] = useState(STANDARD.capexKwp);
  const [entwicklungKwp, setEntwicklung] = useState(STANDARD.entwicklungKwp);
  const [netzKm, setNetzKm] = useState(STANDARD.netzKm);
  const [modell, setModellRoh] = useState(STANDARD.modell);
  const [preisCt, setPreisCt] = useState(STANDARD.preisCt);
  const [vertragJahre, setVertragJahre] = useState(STANDARD.vertragJahre);
  const [merchantCt, setMerchantCt] = useState(STANDARD.merchantCt);
  const [negativAnteil, setNegativAnteil] = useState(STANDARD.negativAnteil);
  const [pachtHa, setPachtHa] = useState(STANDARD.pachtHa);
  const [opexKwp, setOpex] = useState(STANDARD.opexKwp);
  const [degradation, setDegradation] = useState(STANDARD.degradation);
  const [fkQuote, setFkQuote] = useState(STANDARD.fkQuote);
  const [zins, setZins] = useState(STANDARD.zins);
  const [tilgungJahre, setTilgung] = useState(STANDARD.tilgungJahre);
  const [laufzeit, setLaufzeit] = useState(STANDARD.laufzeit);
  const [dscrBegrenzen, setDscrBegrenzen] = useState(true);
  const [ansicht, setAnsicht] = useState("jahr");
  const [matrixWert, setMatrixWert] = useState("projekt");

  const setModell = (m) => {
    setModellRoh(m);
    setPreisCt(m === "merchant" ? merchantCt : ERLOESMODELLE[m].preisCt);
    if (m !== "merchant") setVertragJahre(ERLOESMODELLE[m].vertragJahre);
  };
  const setBauartMitCapex = (b) => {
    setBauart(b);
    // Richtwerte übernehmen, wenn die Bauart die Kosten deutlich ändert
    if (b === "agriVertikal") setCapex(AGRI.capexProKwp.vertikal.mittel);
    else if (b === "agriHoch") setCapex(AGRI.capexProKwp.hoch.mittel);
    else if (bauart.startsWith("agri")) setCapex(FREIFLAECHE.capexProKwp.mittel);
  };

  // Teilbarer Link und Szenario-Vergleich: alle Eingaben (ohne Nebenwirkungen der Komfort-Setzer)
  const setzer = {
    mwp: setMwp,
    regionId: setRegionId,
    bauart: setBauart,
    capexKwp: setCapex,
    entwicklungKwp: setEntwicklung,
    netzKm: setNetzKm,
    modell: setModellRoh,
    preisCt: setPreisCt,
    vertragJahre: setVertragJahre,
    merchantCt: setMerchantCt,
    negativAnteil: setNegativAnteil,
    pachtHa: setPachtHa,
    opexKwp: setOpex,
    degradation: setDegradation,
    fkQuote: setFkQuote,
    zins: setZins,
    tilgungJahre: setTilgung,
    laufzeit: setLaufzeit,
    dscrBegrenzen: setDscrBegrenzen,
  };
  useTeilbarerZustand(
    { mwp, regionId, bauart, capexKwp, entwicklungKwp, netzKm, modell, preisCt, vertragJahre, merchantCt, negativAnteil, pachtHa, opexKwp, degradation, fkQuote, zins, tilgungJahre, laufzeit, dscrBegrenzen },
    (neu) => Object.entries(neu).forEach(([k, v]) => setzer[k]?.(v)),
    {
      optionen: { regionId: REGIONEN.map((x) => x.id), bauart: Object.keys(BAUART), modell: ["eeg", "ppa", "merchant"] },
      grenzen: {
        mwp: [1, 100],
        capexKwp: [400, 1400],
        entwicklungKwp: [0, 150],
        netzKm: [0, 15],
        preisCt: [3, 9],
        vertragJahre: [3, 20],
        merchantCt: [2, 8],
        negativAnteil: [0, 0.5],
        pachtHa: [800, 6000],
        opexKwp: [6, 22],
        degradation: [0.002, 0.008],
        fkQuote: [0, 0.9],
        zins: [0.02, 0.08],
        tilgungJahre: [8, 25],
        laufzeit: [20, 40],
      },
      pruefen: rechneSolarpark,
    }
  );

  const eingabe = {
    mwp,
    regionId,
    bauart,
    capexKwp,
    entwicklungKwp,
    netzKm,
    modell,
    preisCt: modell === "merchant" ? merchantCt : preisCt,
    vertragJahre,
    merchantCt,
    negativAnteil,
    pachtHa,
    opexKwp,
    degradation,
    fkQuote,
    zins,
    tilgungJahre,
    laufzeit,
    dscrBegrenzen,
  };
  const r = useMemo(() => rechneSolarpark(eingabe), [JSON.stringify(eingabe)]); // eslint-disable-line react-hooks/exhaustive-deps
  const matrix = useMemo(() => sensitivitaet(eingabe), [JSON.stringify(eingabe)]); // eslint-disable-line react-hooks/exhaustive-deps

  const zielEk = FINANZIERUNG.diskont;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende="Region"
      wert={regionId}
      onChange={setRegionId}
      spalten={2}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: x.label.replace("West- & Mitteldeutschland", "West & Mitte"), sub: `${fmt(x.ertrag)} kWh/kWp` }))}
    />
  );

  return (
    <RechnerRahmen
      mitlaufend
      unten={
        <div className="space-y-6">
          <div className="rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">Cashflow über {laufzeit} Jahre</h3>
              <Ansicht
                name="cf-ansicht"
                label="Diagrammansicht"
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "jahr", label: "Je Jahr" },
                  { id: "kumuliert", label: "Kumuliert" },
                ]}
              />
            </div>
            {ansicht === "jahr" ? <CashflowJahre r={r} /> : <CashflowKumuliert r={r} />}
          </div>

          <div className="rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70 lg:grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-center lg:gap-4">
            <div className="flex flex-col gap-4 px-5 pt-5 md:px-6 lg:self-stretch lg:border-r lg:border-ink-100 lg:py-6">
              <div>
                <h3 className="font-display text-[17px] font-bold text-ink-900">Sensitivität</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">Investition (Zeilen) gegen Strompreis (Spalten, wirkt auf Vertrags- und Marktpreis)</p>
              </div>
              <Ansicht
                name="matrix-wert"
                label="Kennzahl der Matrix"
                wert={matrixWert}
                onChange={setMatrixWert}
                optionen={[
                  { id: "projekt", label: "Projekt-IRR" },
                  { id: "ek", label: "EK-IRR" },
                ]}
              />
              <ul aria-hidden="true" className="hidden space-y-2 text-[12.5px] text-ink-600 lg:mt-auto lg:block">
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ov-500" />erreicht {matrixWert === "ek" ? "die EK-Renditeerwartung" : "die Kapitalkosten"}</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ov-100 ring-1 ring-inset ring-ov-200" />bis 1,5 Prozentpunkte darunter</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ink-100 ring-1 ring-inset ring-ink-200" />deutlich darunter</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded ring-2 ring-inset ring-ink-900" />Ihre Eingabe</li>
              </ul>
            </div>
            <Matrix matrix={matrix} wert={matrixWert} ziel={matrixWert === "ek" ? zielEk : r.wacc} capexKwp={capexKwp} />
          </div>

          <Jahrestabelle r={r} />
        </div>
      }
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              ["Projekt-IRR", pct(r.projektIrr)],
              ["EK-IRR", pct(r.ekIrr)],
              ["LCOE", `${fmt(r.lcoeCt, 2)} ct`],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Anlage & Standort">
              <Regler
                label="Leistung"
                wert={mwp}
                min={1}
                max={100}
                step={1}
                einheit="MWp"
                onChange={setMwp}
                hinweis={`≈ ${fmt(r.flaecheHa, 1)} ha Fläche · ${fmt(r.ertragJahr1 / 1e6, 1)} GWh im ersten Jahr`}
              />
              {regionWahl}
              <Auswahl
                legende="Bauart"
                wert={bauart}
                onChange={setBauartMitCapex}
                spalten={2}
                klein
                optionen={Object.entries(BAUART).map(([id, b]) => ({ id, label: b.label, sub: `${b.faktor >= 1 ? "+" : "−"}${fmt(Math.abs(b.faktor - 1) * 100)} % Ertrag` }))}
              />
            </Gruppe>

            <Gruppe titel="Investition">
              <Regler
                label="Anlage (EPC)"
                wert={capexKwp}
                min={400}
                max={1400}
                step={10}
                format={(v) => `${fmt(v)} €/kWp`}
                onChange={setCapex}
                hinweis={`Richtwert Freifläche ${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp ohne Netzanschluss; Agri-PV deutlich höher.`}
              />
              <Regler
                label="Projektrechte / Entwicklung"
                wert={entwicklungKwp}
                min={0}
                max={150}
                step={5}
                format={(v) => `${fmt(v)} €/kWp`}
                onChange={setEntwicklung}
                hinweis="Eigene Entwicklungskosten oder Kaufpreis der Projektrechte (RTB meist 60–130 €/kWp)."
              />
              <Regler
                label="Entfernung zum Netzanschluss"
                wert={netzKm}
                min={0}
                max={15}
                step={0.5}
                stellen={1}
                format={(v) => `${fmt(v, 1)} km`}
                onChange={setNetzKm}
                hinweis={`Netzanschluss gesamt ≈ ${fmtEur(r.investition.netz)} (Kabel ${fmt(FREIFLAECHE.kabelProMeter)} €/m + Übergabestation)`}
              />
            </Gruppe>

            <Gruppe titel="Erlöse">
              <Auswahl
                legende="Erlösmodell"
                wert={modell}
                onChange={setModell}
                optionen={[
                  { id: "eeg", label: "EEG", sub: "Zuschlag" },
                  { id: "ppa", label: "PPA", sub: "fester Preis" },
                  { id: "merchant", label: "Merchant", sub: "Marktpreis" },
                ]}
              />
              {modell !== "merchant" && (
                <Regler
                  label={modell === "eeg" ? "Zuschlagswert" : "PPA-Preis"}
                  wert={preisCt}
                  min={3}
                  max={9}
                  step={0.05}
                  format={(v) => `${fmt(v, 2)} ct/kWh`}
                  onChange={setPreisCt}
                  hinweis={
                    modell === "eeg"
                      ? `Zuletzt ${letzteZuschlaege(ZUSCHLAEGE.freiflaeche).map((z) => fmt(z.ct, 2)).join(" · ")} ct/kWh (Bundesnetzagentur, ${letzteZuschlaege(ZUSCHLAEGE.freiflaeche)[0].termin} bis ${letzteZuschlaege(ZUSCHLAEGE.freiflaeche).at(-1).termin}). Wirkt als Untergrenze – ein höherer Marktwert bleibt Ihnen.`
                      : `Solar-PPA (pay-as-produced) grob ${fmt(ERLOESE.ppaCt.min, 1)}–${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh.`
                  }
                />
              )}
              {modell === "ppa" && <Regler label="PPA-Laufzeit" wert={vertragJahre} min={3} max={20} step={1} einheit="Jahre" onChange={setVertragJahre} />}
              {modell === "eeg" && (
                <Regler
                  label="Erzeugung bei negativen Preisen"
                  wert={negativAnteil}
                  min={0}
                  max={0.5}
                  step={0.01}
                  format={(v) => `${fmt(v * 100)} %`}
                  onChange={setNegativAnteil}
                  hinweis={`§ 51 EEG: In Zeiträumen mit negativem Börsenpreis entfällt die Förderung. 2025 fielen rund ${fmt(ERLOESE.paragraph51.anteilNegativ * 100, 1)} % der Solarerzeugung in solche Stunden (LfL Bayern). Gerechnet: Abregelung, ohne Verlängerung nach § 51a.`}
                />
              )}
              <Regler
                label={modell === "merchant" ? "Marktwert Solar (heute)" : `Marktwert nach Jahr ${modell === "eeg" ? 20 : vertragJahre}`}
                wert={merchantCt}
                min={2}
                max={8}
                step={0.1}
                format={(v) => `${fmt(v, 1)} ct/kWh`}
                onChange={setMerchantCt}
                hinweis={`Heutiger Wert, fortgeschrieben mit ${fmt(ERLOESE.merchantSteigerung * 100, 1)} % p. a. – bewusst unter der Inflation (Kannibalisierung).`}
              />
            </Gruppe>

            <details className="group rounded-2xl bg-white/70 ring-1 ring-ink-200/70 open:bg-transparent open:ring-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 group-open:px-0 [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100">
                  <SlidersHorizontal aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink-800">Betrieb & Finanzierung (Experten)</span>
                  <span className="ov-num block truncate text-[12.5px] text-ink-500">
                    Pacht {fmt(pachtHa)} €/ha · FK {fmt(fkQuote * 100)} % · Zins {fmt(zins * 100, 2)} % · {laufzeit} J.
                  </span>
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="animate-ov-einblenden space-y-8 pt-6">
            <Gruppe titel="Betrieb">
              <Regler
                label="Pacht"
                wert={pachtHa}
                min={800}
                max={6000}
                step={100}
                format={(v) => `${fmt(v)} €/ha`}
                onChange={setPachtHa}
                hinweis={`${fmt(r.flaecheHa, 1)} ha × ${fmt(pachtHa)} € = ${fmtEur(r.flaecheHa * pachtHa)} im Jahr, indexiert ${fmt(PACHT.indexierung * 100, 1)} % p. a.`}
              />
              <Regler
                label="Betriebskosten ohne Pacht"
                wert={opexKwp}
                min={6}
                max={22}
                step={0.5}
                stellen={1}
                format={(v) => `${fmt(v, 1)} €/kWp·a`}
                onChange={setOpex}
                hinweis="Wartung, Versicherung, Direktvermarktung, Überwachung, Verwaltung – steigt mit der Inflation."
              />
              <Regler label="Degradation" wert={degradation} min={0.002} max={0.008} step={0.0005} format={(v) => `${fmt(v * 100, 2)} % p. a.`} onChange={setDegradation} />
            </Gruppe>

            <Gruppe titel="Finanzierung">
              <Regler label="Fremdkapitalquote (Wunsch)" wert={fkQuote} min={0} max={0.9} step={0.05} format={(v) => `${fmt(v * 100)} %`} onChange={setFkQuote} />
              <Regler label="Zins" wert={zins} min={0.02} max={0.08} step={0.0025} format={(v) => `${fmt(v * 100, 2)} %`} onChange={setZins} />
              <Regler label="Darlehenslaufzeit" wert={tilgungJahre} min={8} max={25} step={1} einheit="Jahre" onChange={setTilgung} />
              <Regler label="Betrachtungsdauer" wert={laufzeit} min={20} max={40} step={1} einheit="Jahre" onChange={setLaufzeit} hinweis="Pacht üblich 30 Jahre plus Verlängerungsoptionen." />
              <Schalter
                icon={Landmark}
                label={`Darlehen auf DSCR ${fmt(FINANZIERUNG.dscrZiel, 2)} begrenzen`}
                beschreibung="Wie Banken rechnen: Kredithöhe folgt dem Cashflow"
                an={dscrBegrenzen}
                onChange={setDscrBegrenzen}
              />
            </Gruppe>
              </div>
            </details>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Projektrendite ${pct(r.projektIrr)}, Eigenkapitalrendite ${pct(r.ekIrr)}, Stromgestehungskosten ${fmt(r.lcoeCt, 2)} Cent je Kilowattstunde`}
          </p>
          <ErgebnisKopf plakette={`${laufzeit} Jahre · vor Steuern`} />

          <Hauptzahl
            className="mt-5"
            icon={Percent}
            label="Projekt-IRR"
            zusatz={`ohne Finanzierung · WACC ${pct(r.wacc)}`}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Banknote aria-hidden="true" className="h-3.5 w-3.5" />
                  Eigenkapital-IRR
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  {r.ekIrr == null ? "–" : <Zahl wert={r.ekIrr * 100} stellen={1} suffix=" %" delta="dunkel" deltaFormat={(dd) => `${fmt(dd, 1)} %-Pkt.`} />}
                </p>
                <p className="text-[12.5px] text-white/75">
                  EK {fmtMio(r.ek)} · FK {pct(r.fkQuoteEff, 0)}
                </p>
              </div>
            }
          >
            {r.projektIrr == null ? "–" : <Zahl wert={r.projektIrr * 100} stellen={1} suffix=" %" delta="dunkel" deltaFormat={(dd) => `${fmt(dd, 1)} %-Pkt.`} einlauf />}
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Gauge} label="LCOE" zusatz={`Fraunhofer ISE 2024: ${fmt(ERLOESE.lcoeIseCt.min, 1)}–${fmt(ERLOESE.lcoeIseCt.max, 1)} ct`}>
              <Zahl wert={r.lcoeCt} stellen={2} suffix=" ct" delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Scale} label="Kapitalwert (NPV)" zusatz={`Projekt, abgezinst mit ${pct(r.wacc)}`}>
              <span className={r.kapitalwert < 0 ? "text-sun-700" : undefined}>
                <Zahl wert={r.kapitalwert / 1e6} stellen={2} suffix=" Mio. €" delta="hell" />
              </span>
            </Kennzahl>
            <Kennzahl icon={CalendarClock} label="Amortisation" zusatz="Projekt, kumuliert">
              {r.amortisation ? <Zahl wert={r.amortisation} stellen={1} suffix=" Jahre" delta="hell" /> : "> Laufzeit"}
            </Kennzahl>
            <Kennzahl icon={Landmark} label="DSCR min." zusatz={r.dscrMittel ? `Ø ${fmt(r.dscrMittel, 2)} über ${tilgungJahre} Jahre` : "ohne Fremdkapital"}>
              {r.dscrMin == null ? (
                "–"
              ) : (
                <span className={r.dscrMin < 1.1 ? "text-sun-700" : undefined}>
                  <Zahl wert={r.dscrMin} stellen={2} />
                </span>
              )}
            </Kennzahl>
          </Belege>

          <div className="mt-4 space-y-2.5">
            {r.fkBegrenzt && (
              <Hinweis ton="warnung" icon={AlertTriangle}>
                Bei DSCR {fmt(FINANZIERUNG.dscrZiel, 2)} trägt der Cashflow nur {pct(r.fkQuoteEff, 0)} Fremdkapital statt {pct(fkQuote, 0)} – den Rest ({fmtMio(r.fk ? r.fkWunsch - r.fk : 0)}) müsste
                Eigenkapital decken.
              </Hinweis>
            )}
            {r.ekIrr != null && r.projektIrr != null && r.ekIrr < r.projektIrr && r.fk > 0 && (
              <Hinweis ton="neutral" icon={AlertTriangle}>
                Negativer Hebel: Der Zins ({pct(zins, 2)}) liegt über der Projektrendite – Fremdkapital senkt hier die Eigenkapitalrendite.
              </Hinweis>
            )}
            <InvestZeile r={r} />
          </div>

          <ErgebnisAnfrage
            typ="investor"
            href="/kontakt?anliegen=investor#formular"
            kennzahl={r.projektIrr == null ? null : <Zahl wert={r.projektIrr * 100} stellen={1} suffix=" %" />}
            satz={r.projektIrr == null ? "Mit Ihren Projektdaten nachrechnen lassen" : "Projekt-IRR – mit Ihren Projektdaten nachrechnen lassen"}
            signal={`${r.projektIrr}|${r.ekIrr}`}
            nachricht={`Aus dem Solarpark-Renditerechner: ${fmt(mwp, mwp % 1 ? 1 : 0)} MWp, Region ${REGIONEN.find((x) => x.id === regionId)?.label || regionId}, Erlösmodell ${ERLOESMODELLE[modell]?.label || modell}, ${laufzeit} Jahre. Ergebnis (Modellrechnung): Projekt-IRR ${pct(r.projektIrr)}, Eigenkapital-IRR ${pct(r.ekIrr)}, LCOE ${fmt(r.lcoeCt, 2)} ct/kWh. Bitte mit mir über passende Projekte sprechen.`}
            sekundaer={[
              { href: "/projektboerse", label: "Projekte ansehen" },
              { href: "/registrieren?rolle=investor", label: "Suchprofil anlegen" },
            ]}
            hinweis="Modellrechnung vor Steuern, ohne Gewähr – ersetzt kein Ertragsgutachten und keine Bankrechnung. Wir rechnen gern mit Ihren Projektdaten."
          />
        </>
      }
    />
  );
}

function InvestZeile({ r }) {
  const teile = [
    ["Anlage", r.investition.anlage, "#669933"],
    ["Netzanschluss", r.investition.netz, "#1f5aa1"],
    ["Projektrechte", r.investition.entwicklung, "#c98500"],
  ].filter(([, v]) => v > 0);
  return (
    <div className="rounded-2xl bg-ink-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-800">Investition {fmtMio(r.investition.summe, 2)}</span>
        <span className="ov-num text-ink-600">{fmt(r.investProKwp)} €/kWp gesamt</span>
      </div>
      <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={teile.map(([k, v]) => `${k} ${fmtEur(v)}`).join(", ")}>
        {teile.map(([k, v, f]) => (
          <div key={k} style={{ width: `${(v / r.investition.summe) * 100}%`, background: f }} />
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

/* ------------------------------------------------------------------ */
/* Cashflow je Jahr: Erlös nach oben, Kosten + Schuldendienst nach unten */
/* ------------------------------------------------------------------ */

function CashflowJahre({ r }) {
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = schmal ? 260 : 310;
  const P = { l: 56, r: 12, t: 18, b: 30 };
  const jahre = r.jahre;
  const maxOben = Math.max(...jahre.map((j) => j.erloes)) * 1.08;
  const maxUnten = Math.max(...jahre.map((j) => j.kosten + j.schuldendienst)) * 1.08;
  const innenH = H - P.t - P.b;
  const nullY = P.t + (maxOben / (maxOben + maxUnten)) * innenH;
  const skala = innenH / (maxOben + maxUnten);
  const n = jahre.length;
  const band = (W - P.l - P.r) / n;
  const bw = Math.max(2, band * 0.68);
  const x = (i) => Math.round((P.l + i * band + (band - bw) / 2) * 10) / 10;
  const yv = (v) => Math.round((nullY - v * skala) * 10) / 10;
  const schritt = maxOben > 5e6 ? 2e6 : maxOben > 2e6 ? 1e6 : maxOben > 8e5 ? 5e5 : maxOben > 3e5 ? 2e5 : 1e5;
  const ticks = [];
  for (let v = -Math.floor(maxUnten / schritt) * schritt; v <= maxOben; v += schritt) ticks.push(v);
  const aktiv = hover != null ? jahre[hover] : null;
  const vertragEnde = r.vertragJahre;

  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)));
  };
  const tastatur = useDiagrammTastatur(n, setHover);

  return (
    <div ref={ref} className="ov-reveal relative px-2 pb-4 pt-2 md:px-3" data-dir="ohne" suppressHydrationWarning>
      <div {...tastatur} role="group" aria-label="Cashflow je Jahr – mit den Pfeiltasten durch die Jahre" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={`Balkendiagramm: jährliche Erlöse, Kosten und Schuldendienst über ${n} Jahre. Freier Cashflow im ersten Jahr ${fmtEur(jahre[0].cfEk)}.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={yv(v)} y2={yv(v)} stroke={v === 0 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={yv(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {v === 0 ? "0" : `${v < 0 ? "−" : ""}${fmt(Math.abs(v) / 1e6, schritt < 1e6 ? 1 : 0)} Mio.`}
            </text>
          </g>
        ))}
        {vertragEnde > 0 && vertragEnde < n && (
          <g>
            <line x1={P.l + vertragEnde * band} x2={P.l + vertragEnde * band} y1={P.t - 4} y2={H - P.b} stroke="#c98500" strokeDasharray="3 4" />
            <text x={P.l + vertragEnde * band + 4} y={P.t + 6} className="fill-sun-700 text-[10.5px] font-semibold">
              {schmal ? "Markt" : "ab hier Marktpreis"}
            </text>
          </g>
        )}
        {jahre.map((j, i) => (
          <g key={j.jahr} opacity={hover == null || hover === i ? 1 : 0.55} className="transition-opacity duration-150">
            {/* Erlös wächst von der Nulllinie nach oben, Kosten nach unten */}
            <g className="ov-balken-y" style={{ "--i": Math.min(i, 40) * 0.4 }}>
              <rect x={x(i)} y={yv(j.erloes)} width={bw} height={Math.max(0, nullY - yv(j.erloes))} rx={Math.min(3, bw / 3)} fill={FARBE.erloes} />
            </g>
            <g className="ov-balken-y" style={{ "--i": Math.min(i, 40) * 0.4, transformOrigin: "50% 0%" }}>
              <rect x={x(i)} y={nullY} width={bw} height={j.kosten * skala} fill={FARBE.kosten} />
              <rect x={x(i)} y={nullY + j.kosten * skala} width={bw} height={j.schuldendienst * skala} fill={FARBE.dienst} />
            </g>
          </g>
        ))}
        <path
          d={jahre.map((j, i) => `${i ? "L" : "M"}${(x(i) + bw / 2).toFixed(1)},${yv(j.cfEk).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={FARBE.cf}
          strokeWidth="2"
          strokeLinejoin="round"
          pathLength="1"
          className="ov-linie"
          style={{ "--ov-delay": "400ms" }}
        />
        {jahre.map((j, i) =>
          j.jahr === 1 || j.jahr % 5 === 0 ? (
            <text key={j.jahr} x={x(i) + bw / 2} y={H - P.b + 18} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
              {j.jahr}
            </text>
          ) : null,
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} onClick={(e) => setHover(ausZeiger(e))} />
      </svg>
      </div>
      {aktiv && (
        <Tooltip x={x(hover) + bw / 2} y={Math.max(yv(aktiv.erloes) - 20, 0)} breite={W}>
          <p className="font-semibold">
            Jahr {aktiv.jahr} · {fmt(aktiv.preisCt, 2)} ct/kWh{aktiv.imVertrag ? "" : " (Markt)"}
          </p>
          <p className="text-white/70">
            Erlös <span className="ov-num font-semibold text-white">{tsd(aktiv.erloes)}</span>
          </p>
          <p className="text-white/70">
            Betrieb & Pacht <span className="ov-num font-semibold text-white">−{tsd(aktiv.kosten)}</span>
          </p>
          {aktiv.schuldendienst > 0 && (
            <p className="text-white/70">
              Schuldendienst <span className="ov-num font-semibold text-white">−{tsd(aktiv.schuldendienst)}</span>
            </p>
          )}
          <p className="text-white/70">
            Frei für EK <span className={cn("ov-num font-semibold", aktiv.cfEk >= 0 ? "text-ov-300" : "text-sun-300")}>{tsd(aktiv.cfEk)}</span>
          </p>
          {aktiv.dscr != null && (
            <p className="text-white/70">
              DSCR <span className="ov-num font-semibold text-white">{fmt(aktiv.dscr, 2)}</span>
            </p>
          )}
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: "Stromerlös", farbe: FARBE.erloes },
            { label: "Betrieb, Pacht, Rückbau", farbe: FARBE.kosten },
            { label: "Zins & Tilgung", farbe: FARBE.dienst },
            { label: "Frei für Eigenkapital", farbe: FARBE.cf, linie: true },
          ]}
        />
      </div>
    </div>
  );
}

function CashflowKumuliert({ r }) {
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = schmal ? 260 : 310;
  const P = { l: 56, r: 14, t: 18, b: 30 };
  const reihe = (start, key) => {
    let k = start;
    return [start, ...r.jahre.map((j) => (k += j[key]))];
  };
  const projekt = reihe(-r.investition.summe, "cfProjekt");
  const ek = reihe(-r.ek, "cfEk");
  const alle = [...projekt, ...ek];
  const min = Math.min(...alle, 0) * 1.08;
  const max = Math.max(...alle, 0) * 1.08;
  const n = projekt.length - 1;
  const x = (i) => Math.round((P.l + (i / n) * (W - P.l - P.r)) * 10) / 10;
  const y = (v) => Math.round((P.t + ((max - v) / (max - min || 1)) * (H - P.t - P.b)) * 10) / 10;
  const pfad = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const spanne = max - min;
  const schritt = spanne > 3e7 ? 1e7 : spanne > 1.2e7 ? 5e6 : spanne > 6e6 ? 2e6 : spanne > 2.5e6 ? 1e6 : 5e5;
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
      <div {...tastatur} role="group" aria-label="Kumulierter Cashflow – mit den Pfeiltasten durch die Jahre" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={`Kumulierter Cashflow: Projekt nach ${n} Jahren ${fmtMio(projekt[n])}, Eigenkapital ${fmtMio(ek[n])}.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {Math.abs(v) < 1 ? "0" : `${v < 0 ? "−" : ""}${fmt(Math.abs(v) / 1e6, schritt < 1e6 ? 1 : 0)} Mio.`}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30, 35, 40]
          .filter((t) => t <= n)
          .map((t) => (
            <text key={t} x={x(t)} y={H - P.b + 18} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
              {t}
            </text>
          ))}
        <path d={pfad(projekt)} fill="none" stroke={FARBE.projekt} strokeWidth="2.25" strokeLinejoin="round" pathLength="1" className="ov-linie" />
        <path d={pfad(ek)} fill="none" stroke={FARBE.ek} strokeWidth="2.75" strokeLinejoin="round" pathLength="1" className="ov-linie" style={{ "--ov-delay": "150ms" }} />
        {r.amortisation && r.amortisation <= n && (
          <g>
            <circle cx={x(r.amortisation)} cy={y(0)} r="5.5" fill="#fff" stroke={FARBE.projekt} strokeWidth="2.5" />
            <text x={x(r.amortisation)} y={y(0) - 10} textAnchor="middle" className="fill-navy-500 text-[10.5px] font-semibold">
              {fmt(r.amortisation, 1)} J.
            </text>
          </g>
        )}
        {hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#97a0b0" strokeDasharray="2 3" />
            <circle cx={x(hover)} cy={y(projekt[hover])} r="4" fill="#fff" stroke={FARBE.projekt} strokeWidth="2" />
            <circle cx={x(hover)} cy={y(ek[hover])} r="4" fill="#fff" stroke={FARBE.ek} strokeWidth="2" />
          </g>
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} onClick={(e) => setHover(ausZeiger(e))} />
      </svg>
      </div>
      {hover != null && (
        <Tooltip x={x(hover)} y={Math.max(Math.min(y(projekt[hover]), y(ek[hover])) - 60, 0)} breite={W}>
          <p className="font-semibold">{hover === 0 ? "Investition (Jahr 0)" : `Nach Jahr ${hover}`}</p>
          <p className="text-white/70">
            Projekt <span className="ov-num font-semibold text-white">{fmtMio(projekt[hover], 2)}</span>
          </p>
          <p className="text-white/70">
            Eigenkapital <span className="ov-num font-semibold text-white">{fmtMio(ek[hover], 2)}</span>
          </p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: "Projekt (ohne Finanzierung)", farbe: FARBE.projekt, linie: true },
            { label: "Eigenkapital (nach Schuldendienst)", farbe: FARBE.ek, linie: true },
          ]}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sensitivitätsmatrix                                                 */
/* ------------------------------------------------------------------ */

function Matrix({ matrix, wert, ziel, capexKwp }) {
  const sp = matrix[0].zellen.map((z) => z.preis);
  const vz = (d) => (d === 0 ? "±0 %" : `${d > 0 ? "+" : "−"}${fmt(Math.abs(d) * 100)} %`);
  return (
    <div className="px-3 pb-5 pt-4 md:px-4">
      <div tabIndex={0} role="region" aria-label="Sensitivitätsmatrix" className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center text-[13px]">
          <caption className="sr-only">{wert === "ek" ? "Eigenkapitalrendite" : "Projektrendite"} bei veränderter Investition und verändertem Strompreis</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1.5 text-left text-[11.5px] font-semibold text-ink-500">
                Capex ↓ · Preis →
              </th>
              {sp.map((p) => (
                <th key={p} scope="col" className={cn("px-2 py-1.5 text-[12px] font-semibold", p === 0 ? "text-ink-900" : "text-ink-500")}>
                  {vz(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((z) => (
              <tr key={z.capex}>
                <th scope="row" className={cn("whitespace-nowrap px-2 py-1.5 text-left text-[12px] font-semibold", z.capex === 0 ? "text-ink-900" : "text-ink-500")}>
                  {vz(z.capex)} <span className="font-normal text-ink-500">· {fmt(z.capexKwp)} €</span>
                </th>
                {z.zellen.map((c) => {
                  const v = wert === "ek" ? c.ekIrr : c.projektIrr;
                  const mitte = z.capex === 0 && c.preis === 0;
                  const gut = v != null && v >= ziel;
                  const knapp = v != null && !gut && v >= ziel - 0.015;
                  return (
                    <td
                      key={c.preis}
                      className={cn(
                        "ov-num rounded-lg px-2 py-2 font-semibold",
                        gut ? "bg-ov-500 text-white" : knapp ? "bg-ov-100 text-ov-800" : "bg-ink-100 text-ink-600",
                        mitte && "ring-2 ring-ink-900",
                      )}
                    >
                      {pct(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-500">
        Grün: erreicht {wert === "ek" ? `die EK-Renditeerwartung von ${pct(ziel)}` : `die Kapitalkosten (WACC ${pct(ziel)})`}; hellgrün: bis 1,5 Prozentpunkte darunter. Umrandet: Ihre Eingabe (
        {fmt(capexKwp)} €/kWp).
      </p>
    </div>
  );
}

function Jahrestabelle({ r }) {
  return (
    <details className="group rounded-3xl bg-white ring-1 ring-ink-200/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 md:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5 font-display text-[17px] font-bold text-ink-900">
          <TableProperties aria-hidden="true" className="h-5 w-5 text-ov-600" /> Jahrestabelle
        </span>
        <span className="text-[13px] font-semibold text-ov-700 group-open:hidden">Aufklappen</span>
        <span className="hidden text-[13px] font-semibold text-ov-700 group-open:inline">Zuklappen</span>
      </summary>
      <div tabIndex={0} role="region" aria-label="Jahrestabelle Cashflow" className="max-h-[420px] overflow-auto border-t border-ink-100">
        <table className="w-full min-w-[640px] text-right text-[12.5px]">
          <thead className="sticky top-0 bg-sand-50 text-[11.5px] uppercase tracking-[0.08em] text-ink-500">
            <tr>
              {["Jahr", "MWh", "ct/kWh", "Erlös", "Kosten", "Zins + Tilgung", "Frei für EK", "DSCR"].map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-semibold first:text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="ov-num divide-y divide-ink-100 text-ink-700">
            {r.jahre.map((j) => (
              <tr key={j.jahr} className={j.imVertrag ? "" : "bg-sun-300/10"}>
                <td className="px-3 py-1.5 text-left font-semibold text-ink-900">{j.jahr}</td>
                <td className="px-3 py-1.5">{fmt(j.erzeugung / 1000)}</td>
                <td className="px-3 py-1.5">{fmt(j.preisCt, 2)}</td>
                <td className="px-3 py-1.5">{tsd(j.erloes)}</td>
                <td className="px-3 py-1.5">{tsd(j.kosten)}</td>
                <td className="px-3 py-1.5">{j.schuldendienst ? tsd(j.schuldendienst) : "–"}</td>
                <td className={cn("px-3 py-1.5 font-semibold", j.cfEk < 0 ? "text-sun-500" : "text-ink-900")}>{tsd(j.cfEk)}</td>
                <td className="px-3 py-1.5">{j.dscr != null ? fmt(j.dscr, 2) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

"use client";

import { SperrEingaben } from "@/components/Rechner/LaenderSperre";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BadgePercent, CalendarClock, Gauge, Handshake, Landmark, Percent, ScrollText, Wrench } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { Ansicht, ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { BESTAND, ERLOESE, PROVISION, REGIONEN } from "@/lib/invest/markt";
import { PHASE_BESTAND, STANDARD, rechneBestand, sensitivitaet, tornado, verguetungRichtwert } from "@/lib/rechner/bestandsanlage";
import { pfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { provisionTextEn } from "@/lib/sprache/rechnerBegriffe";

const FARBE = { foerder: "#669933", markt: "#ffc53d", kosten: "#c4cad5", raster: "#eef0f4", minus: "#1f5aa1" };

/** Formatierer in der Sprache der Seite (useFormate) */
function hilfen(f) {
  const { fmt } = f;
  return {
    ...f,
    pct: (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : f.fmtPct(v, s)),
    geld: (v) => (Math.abs(v) >= 1e6 ? f.fmtMio(v, 2) : f.tsd(v)),
    leistung: (kwp) => (kwp >= 1000 ? `${fmt(kwp / 1000, kwp % 1000 ? 1 : 0)} MWp` : `${fmt(kwp)} kWp`),
    proKwp: (v, stellen = 0) => f.eur(v, "/kWp", stellen),
  };
}

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    regionKurz: { "de-nord": "Nord", "de-ost": "Ost", "de-west": "West/Mitte", "de-sued": "Süd", at: "Österreich", ch: "Schweiz" },
    tornado: { ertrag: "Ertrag ±10 %", diskont: "Diskontsatz ±1 Pp.", markt: "Marktpreis nach Förderung ±25 %", opex: "Betriebskosten ±20 %", laufzeit: "Nutzungsdauer ±5 Jahre" },
    regionLegende: "Region (für den Prognosevergleich)",
    cashflowBis: (j) => `Cashflow je Jahr bis ${j}`,
    zeigen: "Zeigen oder tippen für Jahreswerte",
    sensitivitaet: "Sensitivität",
    matrixText: "Wert je kWp: Diskontsatz (Zeilen) gegen Marktpreis nach Förderende (Spalten)",
    tornadoText: "Wirkung einzelner Annahmen auf den Ertragswert",
    ansichtLabel: "Ansicht der Sensitivität",
    matrix: "Matrix",
    werttreiber: "Werttreiber",
    ertragswert: "Ertragswert",
    jeKwp: "je kWp",
    foerderung: "Förderung",
    jahreKurz: (n) => `${n} J.`,
    ausgelaufen: "ausgelaufen",
    anlage: "Anlage",
    leistungL: "Leistung",
    anlagentyp: "Anlagentyp",
    freiflaeche: "Freifläche",
    dach: "Dach",
    ibn: "Inbetriebnahme",
    ibnHinweis: (a, e) => `Heute ${a} Jahre in Betrieb · Nutzung bis ${e}`,
    ertragL: "Ø Ertrag der letzten Jahre",
    ertragHinweis: (x) => `Gemessen, am besten Mittel aus 3 Jahren. Prognose für Alter und Region: ${x} kWh/kWp.`,
    verguetungsform: "Vergütungsform",
    fest: ["Feste Vergütung", "EEG-Tarif"],
    marktpraemie: ["Marktprämie", "Zuschlag als Untergrenze"],
    verguetung: "Vergütung",
    anzulegend: "Anzulegender Wert",
    verguetungHinweis: (j, ct) => `Vorbelegt mit grobem Richtwert für ${j} (${ct} ct). Bitte Wert aus Abrechnung oder Zuschlag eintragen.`,
    foerderdauer: "Förderdauer ab Inbetriebnahme",
    jahreEinheit: "Jahre",
    foerderHinweis: (e, r) => `Ende ${e} – Restlaufzeit ${r} Jahre. DE: 20 Jahre plus Rest des IBN-Jahres; AT/CH laut Bescheid.`,
    marktwert: "Marktwert Solar nach Förderende",
    marktHinweis: (s, d) => `Heutiger Wert, +${s} % p. a., abzüglich ${d} ct Direktvermarktung.`,
    kostenVertraege: "Kosten & Verträge",
    betriebskosten: "Betriebskosten",
    opexFormat: (h, v) => `${h.fmt(v, 1)} €/kWp·a`,
    opexHinweis: "Wartung, Versicherung, Betriebsführung, Direktvermarktung – ohne Pacht.",
    pacht: "Pacht",
    pachtFormat: (h, v) => (v ? `${h.fmt(v)} €/Jahr` : "keine"),
    pachtHinweis: (h, v) => (v != null ? `${h.fmt(v, 1)} €/kWp, indexiert` : "Eigene Fläche bzw. eigenes Dach"),
    vertragBis: "Pacht- bzw. Dachvertrag bis",
    verlaengerung: "Verlängerung gesichert",
    verlaengerungText: "Option im Vertrag bis zum Ende der Nutzungsdauer",
    nutzungsdauer: "Technische Nutzungsdauer",
    wrTausch: "Wechselrichtertausch",
    wrText: (a, b) => `Lebensdauer meist ${a}–${b} Jahre`,
    imJahr: "im Jahr",
    kosten: "Kosten",
    bewertung: "Bewertung",
    diskont: "Diskontsatz",
    diskontHinweis: (a, b) => `Renditeerwartung des Käufers, unverschuldet. Für Bestandsanlagen häufig ${a}–${b} %.`,
    kaufpreisPruefen: "Kaufpreis prüfen",
    kaufpreisText: "Welche Rendite bringt ein konkretes Angebot?",
    kaufpreis: "Kaufpreis",
    sr: (w, k) => `Ertragswert ${w} Euro, ${k} Euro je Kilowatt Peak.`,
    plakette: (l, j) => `${l} · IBN ${j}`,
    spanne: (a, b) => `Spanne ${a} – ${b}`,
    wertJeKwp: "Wert je kWp",
    spanneKwp: (h, a, b) => `Spanne ${h.fmt(a)}–${h.fmt(b)} €`,
    foerderBis: "Förderung bis",
    noch: (n) => `noch ${n} Jahre`,
    bereitsAus: "bereits ausgelaufen",
    wertFoerder: "Wert aus Förderphase",
    restMarkt: (e) => `Rest bis ${e} Markt`,
    kaufHinweis: (h, k, g, irr, ueber, erw) => (
      <>
        Bei {h.fmt(k)} €/kWp ({g}) erzielt der Käufer rechnerisch <strong>{irr}</strong> Rendite vor Steuern und Fremdkapital – {ueber ? "über" : "unter"} Ihrer Erwartung von {erw}.
      </>
    ),
    minderertrag: (p) => `Der gemessene Ertrag liegt bei ${p} der Prognose für Alter und Region. Vor einem Kauf oder Verkauf: technische Due Diligence mit Thermografie, Kennlinienmessung und Prüfung von Wechselrichtern und Verschattung.`,
    vertragEndet: (a, b) => `Der Vertrag endet ${a}, die Anlage könnte bis ${b} laufen. Eine Verlängerungsoption vor dem Verkauf zu sichern, hebt den Wert oft deutlich.`,
    provision: (p, a, b) => `Verkauf über die Projektbörse: Erfolgsprovision ${p} – bei diesem Wert rund ${a} bis ${b}. Für Käufer kostenfrei.`,
    provisionText: (x) => x,
    fuss: "Ertragswert vor Steuern und ohne Fremdkapital – eine Orientierung, kein Gutachten. Grundlage einer Transaktion sind Datenraum, technische und rechtliche Due Diligence.",
    bewertenLassen: "Anlage bewerten lassen",
    lage: { unter: "unter", ueber: "über", innerhalb: "innerhalb" },
    einordnung: "Einordnung gegen übliche Preise für Bestandsanlagen",
    markt: (h, a, b) => `Markt ${h.fmt(a)}–${h.fmt(b)} €/kWp`,
    einordnungAria: (h, w, l, a, b) => `Ihr Wert ${h.fmt(w)} Euro je kWp liegt ${l} der üblichen Spanne von ${h.fmt(a)} bis ${h.fmt(b)} Euro je kWp.`,
    einordnungText: (l) => (
      <>
        Ihr Wert liegt <strong className="text-ink-800">{l}</strong> der Spanne für jüngere Anlagen mit heutigen Tarifen bzw. PPA. Ältere Anlagen mit hohem EEG-Tarif können darüber liegen, Anlagen kurz vor Förderende oder mit kurzem Pachtvertrag deutlich darunter.
      </>
    ),
    keinCashflow: "Die Anlage hat ihre Nutzungsdauer erreicht – kein Cashflow mehr.",
    cashflowAria: (a, b, c) => `Balkendiagramm: freier Cashflow je Jahr von ${a} bis ${b}. Im ersten Jahr ${c}.`,
    achse: (h, v) => (Math.abs(v) >= 1e6 ? `${h.fmt(v / 1e6, 1)} Mio.` : `${h.fmt(v / 1000)} Tsd.`),
    phaseFoerder: "Förderung",
    phaseMarkt: "Markt",
    erloes: "Erlös",
    betriebPacht: "Betrieb + Pacht",
    wechselrichter: "Wechselrichter",
    rueckbau: "Rückbau",
    cashflow: "Cashflow",
    legFoerder: "Förderphase",
    legMarkt: "Marktphase",
    legNegativ: "negativ (Tausch, Rückbau)",
    matrixAria: "Sensitivitätsmatrix Wert je kWp",
    matrixCaption: "Wert je kWp bei verändertem Diskontsatz und Marktpreis nach Förderende",
    matrixKopf: "Diskont ↓ · Preis →",
    vz: (h, d) => (d === 0 ? "±0 %" : `${d > 0 ? "+" : "−"}${h.fmt(Math.abs(d) * 100)} %`),
    zelle: (h, v) => `${h.fmt(v)} €`,
    matrixText2: (h, a, b) => `Hellgrün: innerhalb der üblichen Spanne (${h.fmt(a)}–${h.fmt(b)} €/kWp), grün: darüber, grau: darunter. Umrandet: Ihre Eingabe.`,
    tornadoFuss: (g) => `Veränderung des Ertragswerts gegenüber ${g} – blau: Wertverlust, grün: Wertgewinn. Oben steht, worauf eine Due Diligence am meisten achten sollte.`,
  },
  en: {
    regionKurz: { "de-nord": "North", "de-ost": "East", "de-west": "West/Central", "de-sued": "South", at: "Austria", ch: "Switzerland" },
    tornado: { ertrag: "Yield ±10%", diskont: "Discount rate ±1 pp", markt: "Market price after subsidy ±25%", opex: "Operating costs ±20%", laufzeit: "Useful life ±5 years" },
    regionLegende: "Region (for the forecast comparison)",
    cashflowBis: (j) => `Cash flow per year until ${j}`,
    zeigen: "Hover or tap for annual values",
    sensitivitaet: "Sensitivity",
    matrixText: "Value per kWp: discount rate (rows) against market price after the subsidy ends (columns)",
    tornadoText: "Effect of individual assumptions on the income value",
    ansichtLabel: "Sensitivity view",
    matrix: "Matrix",
    werttreiber: "Value drivers",
    ertragswert: "Income value",
    jeKwp: "per kWp",
    foerderung: "Subsidy",
    jahreKurz: (n) => `${n} yrs`,
    ausgelaufen: "expired",
    anlage: "Plant",
    leistungL: "Capacity",
    anlagentyp: "Plant type",
    freiflaeche: "Ground-mounted",
    dach: "Rooftop",
    ibn: "Commissioning",
    ibnHinweis: (a, e) => `In operation for ${a} years today · use until ${e}`,
    ertragL: "Ø yield of recent years",
    ertragHinweis: (x) => `Measured, ideally the average of 3 years. Forecast for age and region: ${x} kWh/kWp.`,
    verguetungsform: "Type of remuneration",
    fest: ["Fixed feed-in tariff", "EEG tariff"],
    marktpraemie: ["Market premium", "Award value as floor"],
    verguetung: "Feed-in tariff",
    anzulegend: "Award value (anzulegender Wert)",
    verguetungHinweis: (j, ct) => `Pre-filled with a rough guide value for ${j} (${ct} ct). Please enter the value from your statement or award.`,
    foerderdauer: "Subsidy term from commissioning",
    jahreEinheit: "years",
    foerderHinweis: (e, r) => `Ends ${e} – remaining term ${r} years. DE: 20 years plus the rest of the commissioning year; AT/CH according to the subsidy notice.`,
    marktwert: "Solar market value after the subsidy",
    marktHinweis: (s, d) => `Today’s value, +${s}% p.a., less ${d} ct for direct marketing.`,
    kostenVertraege: "Costs & contracts",
    betriebskosten: "Operating costs",
    opexFormat: (h, v) => h.eur(v, "/kWp·yr", 1),
    opexHinweis: "Maintenance, insurance, operations management, direct marketing – excluding lease.",
    pacht: "Lease",
    pachtFormat: (h, v) => (v ? h.eur(v, "/year") : "none"),
    pachtHinweis: (h, v) => (v != null ? `${h.eur(v, "/kWp", 1)}, indexed` : "Own land or own roof"),
    vertragBis: "Land or roof lease until",
    verlaengerung: "Extension secured",
    verlaengerungText: "Contractual option until the end of the useful life",
    nutzungsdauer: "Technical useful life",
    wrTausch: "Inverter replacement",
    wrText: (a, b) => `Lifetime usually ${a}–${b} years`,
    imJahr: "in year",
    kosten: "Costs",
    bewertung: "Valuation",
    diskont: "Discount rate",
    diskontHinweis: (a, b) => `Buyer’s expected return, unlevered. For operating assets often ${a}–${b}%.`,
    kaufpreisPruefen: "Check a purchase price",
    kaufpreisText: "What return does a specific offer deliver?",
    kaufpreis: "Purchase price",
    sr: (w, k) => `Income value ${w} euros, ${k} euros per kilowatt peak.`,
    plakette: (l, j) => `${l} · commissioned ${j}`,
    spanne: (a, b) => `Range ${a} – ${b}`,
    wertJeKwp: "Value per kWp",
    spanneKwp: (h, a, b) => `Range ${h.eur(a)}–${h.eur(b)}`,
    foerderBis: "Subsidy until",
    noch: (n) => `${n} years remaining`,
    bereitsAus: "already expired",
    wertFoerder: "Value from subsidy phase",
    restMarkt: (e) => `Rest until ${e} at market`,
    kaufHinweis: (h, k, g, irr, ueber, erw) => (
      <>
        At {h.eur(k, "/kWp")} ({g}) the buyer achieves a calculated return of <strong>{irr}</strong> before tax and debt – {ueber ? "above" : "below"} your expectation of {erw}.
      </>
    ),
    minderertrag: (p) => `The measured yield is ${p} of the forecast for age and region. Before buying or selling: technical due diligence with thermography, I-V curve measurement and a check of inverters and shading.`,
    vertragEndet: (a, b) => `The contract ends in ${a}, but the plant could run until ${b}. Securing an extension option before the sale often raises the value considerably.`,
    provision: (p, a, b) => `Sale via the project exchange: success fee of ${p} – at this value around ${a} to ${b}. Free of charge for buyers.`,
    provisionText: (x) => provisionTextEn(x),
    fuss: "Income value before tax and without debt – for guidance only, not an expert valuation. A transaction is based on a data room and technical and legal due diligence.",
    bewertenLassen: "Have the plant valued",
    lage: { unter: "below", ueber: "above", innerhalb: "within" },
    einordnung: "Benchmark against typical prices for operating assets",
    markt: (h, a, b) => `Market ${h.eur(a)}–${h.eur(b, "/kWp")}`,
    einordnungAria: (h, w, l, a, b) => `Your value of ${h.fmt(w)} euros per kWp is ${l} the typical range of ${h.fmt(a)} to ${h.fmt(b)} euros per kWp.`,
    einordnungText: (l) => (
      <>
        Your value is <strong className="text-ink-800">{l}</strong> the range for younger plants with today’s tariffs or PPAs. Older plants with a high EEG tariff can be above it; plants close to the end of their subsidy or with a short lease well below it.
      </>
    ),
    keinCashflow: "The plant has reached the end of its useful life – no further cash flow.",
    cashflowAria: (a, b, c) => `Bar chart: free cash flow per year from ${a} to ${b}. In the first year ${c}.`,
    achse: (h, v) => (Math.abs(v) >= 1e6 ? `${h.fmt(v / 1e6, 1)}m` : `${h.fmt(v / 1000)}k`),
    phaseFoerder: "Subsidy",
    phaseMarkt: "Market",
    erloes: "Revenue",
    betriebPacht: "Operation + lease",
    wechselrichter: "Inverters",
    rueckbau: "Decommissioning",
    cashflow: "Cash flow",
    legFoerder: "Subsidy phase",
    legMarkt: "Market phase",
    legNegativ: "negative (replacement, decommissioning)",
    matrixAria: "Sensitivity matrix, value per kWp",
    matrixCaption: "Value per kWp with a changed discount rate and market price after the subsidy ends",
    matrixKopf: "Discount ↓ · Price →",
    vz: (h, d) => (d === 0 ? "±0%" : `${d > 0 ? "+" : "−"}${h.fmt(Math.abs(d) * 100)}%`),
    zelle: (h, v) => h.eur(v),
    matrixText2: (h, a, b) => `Light green: within the typical range (${h.eur(a)}–${h.eur(b, "/kWp")}), green: above, grey: below. Outlined: your input.`,
    tornadoFuss: (g) => `Change in income value compared with ${g} – blue: loss of value, green: gain in value. At the top is what a due diligence should focus on most.`,
  },
};

export default function BestandsRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtEur, pct, geld, leistung } = h;
  const [kwp, setKwp] = useState(STANDARD.kwp);
  const [typ, setTyp] = useState(STANDARD.typ);
  const [regionId, setRegionId] = useState(() => landStart(STANDARD, seitenLand).regionId);
  const [ibnJahr, setIbnRoh] = useState(STANDARD.ibnJahr);
  const [ertragKwhKwp, setErtrag] = useState(STANDARD.ertragKwhKwp);
  const [modell, setModell] = useState(STANDARD.modell);
  const [verguetungCt, setVerguetung] = useState(STANDARD.verguetungCt);
  const [foerderJahre, setFoerderJahre] = useState(STANDARD.foerderJahre);
  const [opexKwp, setOpex] = useState(STANDARD.opexKwp);
  const [pachtJahr, setPacht] = useState(STANDARD.pachtJahr);
  const [pachtEndeJahr, setPachtEnde] = useState(STANDARD.pachtEndeJahr);
  const [pachtVerlaengerbar, setVerlaengerbar] = useState(STANDARD.pachtVerlaengerbar);
  const [nutzungsdauer, setNutzungsdauer] = useState(STANDARD.nutzungsdauer);
  const [wrTausch, setWrTausch] = useState(STANDARD.wrTausch);
  const [wrJahr, setWrJahr] = useState(STANDARD.wrJahr);
  const [wrProKwp, setWrProKwp] = useState(STANDARD.wrProKwp);
  const [diskont, setDiskont] = useState(STANDARD.diskont);
  const [merchantCt, setMerchant] = useState(STANDARD.merchantCt);
  const [mitKaufpreis, setMitKaufpreis] = useState(false);
  const [kaufProKwp, setKaufProKwp] = useState(700);
  const [ansicht, setAnsicht] = useState("matrix");

  // Beim Wechsel des Inbetriebnahmejahres den Richtwert der Vergütung vorbelegen
  const setIbn = (j) => {
    setIbnRoh(j);
    setVerguetung(verguetungRichtwert(j));
    setModell(j >= 2015 ? "marktpraemie" : "fest");
  };

  const eingabe = {
    kwp, typ, regionId, ibnJahr, ertragKwhKwp, modell, verguetungCt, foerderJahre, opexKwp, pachtJahr, pachtEndeJahr,
    pachtVerlaengerbar, nutzungsdauer, wrTausch, wrJahr, wrProKwp, diskont, merchantCt, kaufpreis: mitKaufpreis ? kaufProKwp * kwp : 0,
  };
  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard), geteilter Link stellt sie wieder her
  const SETZER = {
    kwp: setKwp, typ: setTyp, regionId: setRegionId, ibnJahr: setIbnRoh, ertragKwhKwp: setErtrag, modell: setModell, verguetungCt: setVerguetung,
    foerderJahre: setFoerderJahre, opexKwp: setOpex, pachtJahr: setPacht, pachtEndeJahr: setPachtEnde, pachtVerlaengerbar: setVerlaengerbar,
    nutzungsdauer: setNutzungsdauer, wrTausch: setWrTausch, wrJahr: setWrJahr, wrProKwp: setWrProKwp, diskont: setDiskont, merchantCt: setMerchant,
    mitKaufpreis: setMitKaufpreis, kaufProKwp: setKaufProKwp,
  };
  useTeilbarerZustand(
    { ...eingabe, kaufpreis: undefined, mitKaufpreis, kaufProKwp },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { typ: ["freiflaeche", "dach"], modell: ["fest", "marktpraemie"], regionId: REGIONEN.map((x) => x.id) },
      grenzen: {
        kwp: [100, 20000], ibnJahr: [2005, 2025], ertragKwhKwp: [650, 1350], verguetungCt: [3, 40], foerderJahre: [10, 25], merchantCt: [2, 8],
        opexKwp: [6, 25], pachtJahr: [0, 150000], pachtEndeJahr: [BESTAND.bewertungsjahr, 2065], nutzungsdauer: [BESTAND.nutzungsdauerSpanne.min, BESTAND.nutzungsdauerSpanne.max],
        wrJahr: [BESTAND.bewertungsjahr, 2050], wrProKwp: [30, 120], diskont: [0.03, 0.1], kaufProKwp: [100, 2500],
      },
    }
  );
  const schluessel = JSON.stringify(eingabe);
  const r = useMemo(() => rechneBestand(eingabe), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps
  const matrix = useMemo(() => sensitivitaet(eingabe), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps
  const tor = useMemo(() => tornado(eingabe), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps

  const band = PHASE_BESTAND.preisProKwp;
  const minderertrag = r.performance != null && r.performance < BESTAND.minderertragWarnung;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende={t.regionLegende}
      wert={regionId}
      onChange={setRegionId}
      spalten={3}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionKurz[x.id] || x.label }))}
    />
  );

  return (
    <RechnerRahmen
      mitlaufend
      unten={
        <div className="space-y-6">
          <div className="rounded-3xl ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">{t.cashflowBis(r.ende)}</h3>
              <p className="text-[12.5px] text-ink-500">{t.zeigen}</p>
            </div>
            <CashflowBalken r={r} />
          </div>
          <div className="rounded-3xl ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
              <div>
                <h3 className="font-display text-[17px] font-bold text-ink-900">{t.sensitivitaet}</h3>
                <p className="text-[12.5px] text-ink-500">{ansicht === "matrix" ? t.matrixText : t.tornadoText}</p>
              </div>
              <Ansicht
                name="bestand-sens"
                label={t.ansichtLabel}
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "matrix", label: t.matrix },
                  { id: "tornado", label: t.werttreiber },
                ]}
              />
            </div>
            {ansicht === "matrix" ? <Matrix matrix={matrix} band={band} /> : <Tornado liste={tor} basis={r.wert} />}
          </div>
        </div>
      }
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              [t.ertragswert, geld(r.wert)],
              [t.jeKwp, t.zelle(h, r.wertProKwp)],
              [t.foerderung, r.foerderRest ? t.jahreKurz(r.foerderRest) : t.ausgelaufen],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.anlage}>
              <Regler label={t.leistungL} wert={kwp} min={100} max={20000} step={100} format={leistung} onChange={setKwp} />
              <Auswahl
                legende={t.anlagentyp}
                wert={typ}
                onChange={setTyp}
                optionen={[
                  { id: "freiflaeche", label: t.freiflaeche },
                  { id: "dach", label: t.dach },
                ]}
              />
              <Regler label={t.ibn} wert={ibnJahr} min={2005} max={2025} step={1} format={(v) => String(v)} onChange={setIbn} hinweis={t.ibnHinweis(r.alter, r.technischEnde)} />
              {regionWahl}
              <Regler
                label={t.ertragL}
                wert={ertragKwhKwp}
                min={650}
                max={1350}
                step={10}
                format={(v) => `${fmt(v)} kWh/kWp`}
                onChange={setErtrag}
                hinweis={t.ertragHinweis(fmt(r.prognose))}
              />
            </Gruppe>

            <Gruppe titel={t.foerderung}>
              <Auswahl
                legende={t.verguetungsform}
                wert={modell}
                onChange={setModell}
                optionen={[
                  { id: "fest", label: t.fest[0], sub: t.fest[1] },
                  { id: "marktpraemie", label: t.marktpraemie[0], sub: t.marktpraemie[1] },
                ]}
              />
              <Regler
                label={modell === "fest" ? t.verguetung : t.anzulegend}
                wert={verguetungCt}
                min={3}
                max={40}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 2)} ct/kWh`}
                onChange={setVerguetung}
                hinweis={t.verguetungHinweis(ibnJahr, fmt(verguetungRichtwert(ibnJahr), 1))}
              />
              <Regler label={t.foerderdauer} wert={foerderJahre} min={10} max={25} step={1} einheit={t.jahreEinheit} onChange={setFoerderJahre} hinweis={t.foerderHinweis(r.foerderEnde, r.foerderRest)} />
              <Regler
                label={t.marktwert}
                wert={merchantCt}
                min={2}
                max={8}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 1)} ct/kWh`}
                onChange={setMerchant}
                hinweis={t.marktHinweis(fmt(ERLOESE.merchantSteigerung * 100), fmt(BESTAND.direktvermarktungCt, 1))}
              />
            </Gruppe>

            <Gruppe titel={t.kostenVertraege}>
              <Regler label={t.betriebskosten} wert={opexKwp} min={6} max={25} step={0.5} stellen={1} format={(v) => t.opexFormat(h, v)} onChange={setOpex} hinweis={t.opexHinweis} />
              <Regler label={t.pacht} wert={pachtJahr} min={0} max={150000} step={500} format={(v) => t.pachtFormat(h, v)} onChange={setPacht} hinweis={t.pachtHinweis(h, pachtJahr ? pachtJahr / kwp : null)} />
              <Regler label={t.vertragBis} wert={pachtEndeJahr} min={BESTAND.bewertungsjahr} max={2065} step={1} format={(v) => String(v)} onChange={setPachtEnde} />
              <Schalter icon={ScrollText} label={t.verlaengerung} beschreibung={t.verlaengerungText} an={pachtVerlaengerbar} onChange={setVerlaengerbar} />
              <Regler label={t.nutzungsdauer} wert={nutzungsdauer} min={BESTAND.nutzungsdauerSpanne.min} max={BESTAND.nutzungsdauerSpanne.max} step={1} einheit={t.jahreEinheit} onChange={setNutzungsdauer} />
              <Schalter icon={Wrench} label={t.wrTausch} beschreibung={t.wrText(BESTAND.wechselrichterJahre.min, BESTAND.wechselrichterJahre.max)} an={wrTausch} onChange={setWrTausch}>
                <div className="space-y-5">
                  <Regler label={t.imJahr} wert={wrJahr} min={BESTAND.bewertungsjahr} max={2050} step={1} format={(v) => String(v)} onChange={setWrJahr} />
                  <Regler label={t.kosten} wert={wrProKwp} min={30} max={120} step={5} format={(v) => h.proKwp(v)} onChange={setWrProKwp} hinweis={`≈ ${fmtEur(wrProKwp * kwp)}`} />
                </div>
              </Schalter>
            </Gruppe>

            <Gruppe titel={t.bewertung}>
              <Regler
                label={t.diskont}
                wert={diskont}
                min={0.03}
                max={0.1}
                step={0.0025}
                format={(v) => pct(v, 2)}
                onChange={setDiskont}
                hinweis={t.diskontHinweis(fmt(BESTAND.diskont.min * 100, 1), fmt(BESTAND.diskont.max * 100, 1))}
              />
              <Schalter icon={Handshake} label={t.kaufpreisPruefen} beschreibung={t.kaufpreisText} an={mitKaufpreis} onChange={setMitKaufpreis}>
                <Regler label={t.kaufpreis} wert={kaufProKwp} min={100} max={2500} step={10} format={(v) => h.proKwp(v)} onChange={setKaufProKwp} hinweis={`= ${geld(kaufProKwp * kwp)}`} />
              </Schalter>
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(Math.round(r.wert), Math.round(r.wertProKwp))}
          </p>
          <ErgebnisKopf titel={t.ertragswert} plakette={t.plakette(leistung(kwp), ibnJahr)} />

          <Hauptzahl className="mt-5" icon={Landmark} label={t.ertragswert} zusatz={t.spanne(geld(r.spanne.min), geld(r.spanne.max))}>
            {geld(r.wert)}
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={Gauge} label={t.wertJeKwp} zusatz={t.spanneKwp(h, r.spanneProKwp.min, r.spanneProKwp.max)}>
              <Zahl wert={r.wertProKwp} format={(v) => t.zelle(h, v)} />
            </Kennzahl>
            <Kennzahl icon={CalendarClock} label={t.foerderBis} zusatz={r.foerderRest ? t.noch(r.foerderRest) : t.bereitsAus}>
              {r.foerderEnde}
            </Kennzahl>
            <Kennzahl icon={Percent} label={t.wertFoerder} zusatz={t.restMarkt(r.ende)}>
              {pct(r.anteilFoerderung, 0)}
            </Kennzahl>
          </Belege>

          <Einordnung wert={r.wertProKwp} spanne={r.spanneProKwp} band={band} />

          <div className="mt-4 space-y-2.5">
            {mitKaufpreis && (
              <Hinweis ton={r.kaufIrr != null && r.kaufIrr >= diskont ? "gut" : "warnung"} icon={Handshake}>
                {t.kaufHinweis(h, kaufProKwp, geld(kaufProKwp * kwp), pct(r.kaufIrr), r.kaufIrr != null && r.kaufIrr >= diskont, pct(diskont, 2))}
              </Hinweis>
            )}
            {minderertrag && (
              <Hinweis ton="warnung" icon={Activity}>
                {t.minderertrag(pct(r.performance, 0))}
              </Hinweis>
            )}
            {!pachtVerlaengerbar && pachtEndeJahr < r.technischEnde && (
              <Hinweis ton="warnung" icon={ScrollText}>
                {t.vertragEndet(pachtEndeJahr, r.technischEnde)}
              </Hinweis>
            )}
            <Hinweis ton="neutral" icon={BadgePercent}>
              {t.provision(t.provisionText(PROVISION.verkaeufer.text), geld(r.wert * PROVISION.verkaeufer.min), geld(r.wert * PROVISION.verkaeufer.max))}
            </Hinweis>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              {t.fuss}
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button href={pfad("/bestandsanlagen#anfrage")} size="lg" pfeil>
                {t.bewertenLassen}
              </Button>
            </div>
          </div>
        </>
      }
    />
  );
}

function Einordnung({ wert, spanne, band }) {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const oben = Math.max(band.max * 1.4, spanne.max * 1.1, 1);
  const pos = (v) => `${Math.max(0, Math.min(100, (v / oben) * 100))}%`;
  const text = t.lage[wert < band.min ? "unter" : wert > band.max ? "ueber" : "innerhalb"];
  return (
    <div className="mt-4 rounded-2xl bg-ink-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-800">{t.einordnung}</span>
        <span className="ov-num text-ink-600">{t.markt(h, band.min, band.max)}</span>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-ink-100" role="img" aria-label={t.einordnungAria(h, wert, text, band.min, band.max)}>
        <div className="absolute inset-y-0 rounded-full bg-ink-300/70" style={{ left: pos(band.min), right: `calc(100% - ${pos(band.max)})` }} />
        <div className="absolute inset-y-0 rounded-full bg-ov-300" style={{ left: pos(spanne.min), right: `calc(100% - ${pos(spanne.max)})` }} />
        <div className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-ov-600 shadow motion-safe:transition-[left] motion-safe:duration-300" style={{ left: pos(wert) }} />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
        {t.einordnungText(text)}
      </p>
    </div>
  );
}

function CashflowBalken({ r }) {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtEur } = h;
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = schmal ? 240 : 280;
  const P = { l: 58, r: 12, t: 16, b: 30 };
  const jahre = r.jahre;
  const n = Math.max(jahre.length, 1);
  const maxOben = Math.max(...jahre.map((j) => j.cf), 1) * 1.1;
  const minUnten = Math.min(...jahre.map((j) => j.cf), 0) * 1.1;
  const innenH = H - P.t - P.b;
  const skala = innenH / (maxOben - minUnten || 1);
  const nullY = P.t + maxOben * skala;
  const band = (W - P.l - P.r) / n;
  const bw = Math.max(2, band * 0.7);
  const x = (i) => P.l + i * band + (band - bw) / 2;
  const y = (v) => nullY - v * skala;
  const aktiv = hover != null ? jahre[hover] : null;
  const roh = (maxOben - minUnten) / 4;
  const pot = Math.pow(10, Math.floor(Math.log10(Math.max(roh, 1))));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((s) => (maxOben - minUnten) / s <= 5) || pot * 10;
  const ticks = [];
  for (let v = Math.ceil(minUnten / schritt) * schritt; v <= maxOben; v += schritt) ticks.push(v);

  if (!jahre.length) return <p className="px-6 pb-6 pt-3 text-[14px] text-ink-600">{t.keinCashflow}</p>;

  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)));
  };

  return (
    <div ref={ref} className="relative px-2 pb-4 pt-2 md:px-3">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={t.cashflowAria(r.start, r.ende, fmtEur(r.cfJahr1))}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-6 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {Math.abs(v) < 1e-6 ? "0" : t.achse(h, v)}
            </text>
          </g>
        ))}
        {jahre.map((j, i) => (
          <rect
            key={j.jahr}
            x={x(i)}
            width={bw}
            y={j.cf >= 0 ? y(j.cf) : nullY}
            height={Math.max(Math.abs(j.cf) * skala, 1)}
            rx={Math.min(3, bw / 3)}
            fill={j.cf < 0 ? FARBE.minus : j.gefoerdert ? FARBE.foerder : FARBE.markt}
            opacity={hover == null || hover === i ? 1 : 0.55}
          />
        ))}
        {jahre.filter((_, i) => i % (schmal ? 5 : 3) === 0 || i === n - 1).map((j) => (
          <text key={j.jahr} x={x(jahre.indexOf(j)) + bw / 2} y={H - P.b + 18} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
            {j.jahr}
          </text>
        ))}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerDown={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} />
      </svg>
      {aktiv && (
        <Tooltip x={x(hover) + bw / 2} y={Math.max(y(Math.max(aktiv.cf, 0)) - 30, 0)} breite={W}>
          <p className="font-semibold">
            {aktiv.jahr} · {aktiv.gefoerdert ? t.phaseFoerder : t.phaseMarkt}
          </p>
          <p className="text-white/70">{t.erloes} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.erloes)}</span> ({fmt(aktiv.preisCt, 2)} ct)</p>
          <p className="text-white/70">{t.betriebPacht} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.opex + aktiv.pacht)}</span></p>
          {aktiv.wr > 0 && <p className="text-white/70">{t.wechselrichter} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.wr)}</span></p>}
          {aktiv.rueckbau > 0 && <p className="text-white/70">{t.rueckbau} <span className="ov-num font-semibold text-white">{fmtEur(aktiv.rueckbau)}</span></p>}
          <p className="text-white/70">{t.cashflow} <span className={cn("ov-num font-semibold", aktiv.cf < 0 ? "text-sun-300" : "text-ov-300")}>{fmtEur(aktiv.cf)}</span></p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: t.legFoerder, farbe: FARBE.foerder },
            { label: t.legMarkt, farbe: FARBE.markt },
            { label: t.legNegativ, farbe: FARBE.minus },
          ]}
        />
      </div>
    </div>
  );
}

function Matrix({ matrix, band }) {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const sp = matrix[0].zellen.map((z) => z.preis);
  const vz = (d) => t.vz(h, d);
  return (
    <div className="px-3 pb-5 pt-4 md:px-4">
      <div tabIndex={0} role="region" aria-label={t.matrixAria} className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center text-[13px]">
          <caption className="sr-only">{t.matrixCaption}</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1.5 text-left text-[11.5px] font-semibold text-ink-500">{t.matrixKopf}</th>
              {sp.map((p) => (
                <th key={p} scope="col" className={cn("px-2 py-1.5 text-[12px] font-semibold", p === 0 ? "text-ink-900" : "text-ink-500")}>
                  {vz(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((z) => (
              <tr key={z.diskont}>
                <th scope="row" className={cn("whitespace-nowrap px-2 py-1.5 text-left text-[12px] font-semibold", z.diskont === 0 ? "text-ink-900" : "text-ink-500")}>
                  {h.pct(z.wertDiskont, 2)}
                </th>
                {z.zellen.map((c) => {
                  const mitte = z.diskont === 0 && c.preis === 0;
                  const im = c.wertProKwp >= band.min && c.wertProKwp <= band.max;
                  const drueber = c.wertProKwp > band.max;
                  return (
                    <td key={c.preis} className={cn("ov-num rounded-lg px-2 py-2 font-semibold", drueber ? "bg-ov-500 text-white" : im ? "bg-ov-100 text-ov-800" : "bg-ink-100 text-ink-600", mitte && "ring-2 ring-ink-900")}>
                      {t.zelle(h, c.wertProKwp)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-500">
        {t.matrixText2(h, band.min, band.max)}
      </p>
    </div>
  );
}

function Tornado({ liste, basis }) {
  const t = useTexte(TEXTE);
  const { geld } = hilfen(useFormate());
  const max = Math.max(...liste.flatMap((x) => [Math.abs(x.tief), Math.abs(x.hoch)]), 1);
  return (
    <div className="px-5 pb-6 pt-5 md:px-6">
      <ul className="space-y-4">
        {liste.map((x) => {
          const links = Math.min(x.tief, x.hoch);
          const rechts = Math.max(x.tief, x.hoch);
          return (
            <li key={x.id}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-ink-800">{t.tornado[x.id] ?? x.label}</span>
                <span className="ov-num text-ink-600">
                  {links < 0 ? "−" : "+"}{geld(Math.abs(links))} / {rechts < 0 ? "−" : "+"}{geld(Math.abs(rechts))}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-ink-100" aria-hidden="true">
                <div className="absolute inset-y-0 left-1/2 w-px bg-ink-400" />
                {links < 0 && <div className="absolute inset-y-0 rounded-l-full bg-navy-500" style={{ right: "50%", width: `${(Math.abs(links) / max) * 50}%` }} />}
                {rechts > 0 && <div className="absolute inset-y-0 rounded-r-full bg-ov-500" style={{ left: "50%", width: `${(rechts / max) * 50}%` }} />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
        {t.tornadoFuss(geld(basis))}
      </p>
    </div>
  );
}

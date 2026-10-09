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
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { regionEn } from "@/lib/sprache/begriffe";
import { datumText } from "@/lib/sprache/format";

const FARBE = { erloes: "#669933", kosten: "#c4cad5", dienst: "#1f5aa1", cf: "#151a24", ek: "#669933", projekt: "#1f5aa1", raster: "#eef0f4" };

/** Formatierer in der Sprache der Seite */
function hilfen(f) {
  const en = f.sprache === "en";
  return {
    ...f,
    en,
    pct: (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : f.fmtPct(v, s)),
    tsd: (v) => (en ? `${v < 0 ? "-" : ""}€${f.fmt(Math.abs(v) / 1000)}k` : `${f.fmt(v / 1000)} T€`),
    mioAchse: (v, s) => (en ? `${v < 0 ? "−" : ""}€${f.fmt(Math.abs(v) / 1e6, s)}m` : `${v < 0 ? "−" : ""}${f.fmt(Math.abs(v) / 1e6, s)} Mio.`),
  };
}

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    bauarten: {},
    modelle: {},
    regionLabel: (id, l) => l.replace("West- & Mitteldeutschland", "West & Mitte"),
    regionLang: (id, l) => l,
    datum: (d) => d,
    region: "Region",
    cashflowUeber: (n) => `Cashflow über ${n} Jahre`,
    ansichtLabel: "Diagrammansicht",
    jeJahr: "Je Jahr",
    kumuliert: "Kumuliert",
    sensitivitaet: "Sensitivität",
    sensText: "Investition (Zeilen) gegen Strompreis (Spalten, wirkt auf Vertrags- und Marktpreis)",
    matrixLabel: "Kennzahl der Matrix",
    projektIrr: "Projekt-IRR",
    ekIrr: "EK-IRR",
    erreicht: (ek) => `erreicht ${ek ? "die EK-Renditeerwartung" : "die Kapitalkosten"}`,
    bis15: "bis 1,5 Prozentpunkte darunter",
    deutlich: "deutlich darunter",
    ihreEingabe: "Ihre Eingabe",
    anlageStandort: "Anlage & Standort",
    leistung: "Leistung",
    leistungHinweis: (ha, gwh) => `≈ ${ha} ha Fläche · ${gwh} GWh im ersten Jahr`,
    bauart: "Bauart",
    ertragDelta: (f, plus, v) => `${plus ? "+" : "−"}${f.fmt(v)} % Ertrag`,
    investition: "Investition",
    epc: "Anlage (EPC)",
    proKwp: (f, v) => `${f.fmt(v)} €/kWp`,
    epcHinweis: (a, b) => `Richtwert Freifläche ${a}–${b} €/kWp ohne Netzanschluss; Agri-PV deutlich höher.`,
    rechte: "Projektrechte / Entwicklung",
    rechteHinweis: "Eigene Entwicklungskosten oder Kaufpreis der Projektrechte (RTB meist 60–130 €/kWp).",
    netzKm: "Entfernung zum Netzanschluss",
    netzHinweis: (a, b) => `Netzanschluss gesamt ≈ ${a} (Kabel ${b} €/m + Übergabestation)`,
    erloese: "Erlöse",
    erloesmodell: "Erlösmodell",
    optEeg: ["EEG", "Zuschlag"],
    optPpa: ["PPA", "fester Preis"],
    optMerchant: ["Merchant", "Marktpreis"],
    zuschlagswert: "Zuschlagswert",
    ppaPreis: "PPA-Preis",
    ct2: (f, v) => `${f.fmt(v, 2)} ct/kWh`,
    ct1: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    eegHinweis: (werte, von, bis) => `Zuletzt ${werte} ct/kWh (Bundesnetzagentur, ${von} bis ${bis}). Wirkt als Untergrenze – ein höherer Marktwert bleibt Ihnen.`,
    ppaHinweis: (a, b) => `Solar-PPA (pay-as-produced) grob ${a}–${b} ct/kWh.`,
    ppaLaufzeit: "PPA-Laufzeit",
    jahreEinheit: "Jahre",
    negativ: "Erzeugung bei negativen Preisen",
    pctFmt: (f, v) => `${f.fmt(v)} %`,
    negativHinweis: (x) => `§ 51 EEG: In Zeiträumen mit negativem Börsenpreis entfällt die Förderung. 2025 fielen rund ${x} % der Solarerzeugung in solche Stunden (LfL Bayern). Gerechnet: Abregelung, ohne Verlängerung nach § 51a.`,
    marktHeute: "Marktwert Solar (heute)",
    marktNach: (j) => `Marktwert nach Jahr ${j}`,
    marktHinweis: (x) => `Heutiger Wert, fortgeschrieben mit ${x} % p. a. – bewusst unter der Inflation (Kannibalisierung).`,
    experten: "Betrieb & Finanzierung (Experten)",
    expertenZeile: (f, p, fk, z, n) => `Pacht ${f.fmt(p)} €/ha · FK ${f.fmt(fk)} % · Zins ${f.fmt(z, 2)} % · ${n} J.`,
    betrieb: "Betrieb",
    pacht: "Pacht",
    proHa: (f, v) => `${f.fmt(v)} €/ha`,
    pachtHinweis: (f, ha, p, s, i) => `${f.fmt(ha, 1)} ha × ${f.fmt(p)} € = ${s} im Jahr, indexiert ${f.fmt(i, 1)} % p. a.`,
    opex: "Betriebskosten ohne Pacht",
    opexFmt: (f, v) => `${f.fmt(v, 1)} €/kWp·a`,
    opexHinweis: "Wartung, Versicherung, Direktvermarktung, Überwachung, Verwaltung – steigt mit der Inflation.",
    degradation: "Degradation",
    pa2: (f, v) => `${f.fmt(v, 2)} % p. a.`,
    finanzierung: "Finanzierung",
    fkQuote: "Fremdkapitalquote (Wunsch)",
    zins: "Zins",
    pct2: (f, v) => `${f.fmt(v, 2)} %`,
    darlehen: "Darlehenslaufzeit",
    betrachtung: "Betrachtungsdauer",
    betrachtungHinweis: "Pacht üblich 30 Jahre plus Verlängerungsoptionen.",
    dscrLabel: (x) => `Darlehen auf DSCR ${x} begrenzen`,
    dscrText: "Wie Banken rechnen: Kredithöhe folgt dem Cashflow",
    sr: (a, b, c) => `Projektrendite ${a}, Eigenkapitalrendite ${b}, Stromgestehungskosten ${c} Cent je Kilowattstunde`,
    plakette: (n) => `${n} Jahre · vor Steuern`,
    ohneFin: (w) => `ohne Finanzierung · WACC ${w}`,
    ekIrrLang: "Eigenkapital-IRR",
    pctSuffix: " %",
    deltaPkt: (f, d) => `${f.fmt(d, 1)} %-Pkt.`,
    ekFk: (a, b) => `EK ${a} · FK ${b}`,
    lcoeZusatz: (a, b) => `Fraunhofer ISE 2024: ${a}–${b} ct`,
    ctSuffix: " ct",
    npv: "Kapitalwert (NPV)",
    npvZusatz: (w) => `Projekt, abgezinst mit ${w}`,
    amortisation: "Amortisation",
    projektKum: "Projekt, kumuliert",
    jahreSuffix: " Jahre",
    laufzeitUeber: "> Laufzeit",
    dscrMin: "DSCR min.",
    dscrSchnitt: (f, a, n) => `Ø ${f.fmt(a, 2)} über ${n} Jahre`,
    ohneFk: "ohne Fremdkapital",
    fkBegrenzt: (d, a, b, c) => `Bei DSCR ${d} trägt der Cashflow nur ${a} Fremdkapital statt ${b} – den Rest (${c}) müsste Eigenkapital decken.`,
    negHebel: (z) => `Negativer Hebel: Der Zins (${z}) liegt über der Projektrendite – Fremdkapital senkt hier die Eigenkapitalrendite.`,
    satzOhne: "Mit Ihren Projektdaten nachrechnen lassen",
    satzMit: "Projekt-IRR – mit Ihren Projektdaten nachrechnen lassen",
    nachricht: (mwp, reg, mod, n, a, b, c) => `Aus dem Solarpark-Renditerechner: ${mwp} MWp, Region ${reg}, Erlösmodell ${mod}, ${n} Jahre. Ergebnis (Modellrechnung): Projekt-IRR ${a}, Eigenkapital-IRR ${b}, LCOE ${c} ct/kWh. Bitte mit mir über passende Projekte sprechen.`,
    projekteAnsehen: "Projekte ansehen",
    suchprofil: "Suchprofil anlegen",
    anfrageHinweis: "Modellrechnung vor Steuern, ohne Gewähr – ersetzt kein Ertragsgutachten und keine Bankrechnung. Wir rechnen gern mit Ihren Projektdaten.",
    anlage: "Anlage",
    netzanschluss: "Netzanschluss",
    projektrechte: "Projektrechte",
    investGesamt: (f, v) => `${f.fmt(v)} €/kWp gesamt`,
    cfJahrAria: "Cashflow je Jahr – mit den Pfeiltasten durch die Jahre",
    balkenAria: (n, x) => `Balkendiagramm: jährliche Erlöse, Kosten und Schuldendienst über ${n} Jahre. Freier Cashflow im ersten Jahr ${x}.`,
    markt: "Markt",
    abHier: "ab hier Marktpreis",
    jahr: "Jahr",
    marktKlammer: " (Markt)",
    erloes: "Erlös",
    betriebPacht: "Betrieb & Pacht",
    schuldendienst: "Schuldendienst",
    freiEk: "Frei für EK",
    legErloes: "Stromerlös",
    legKosten: "Betrieb, Pacht, Rückbau",
    legDienst: "Zins & Tilgung",
    legFrei: "Frei für Eigenkapital",
    kumAria: "Kumulierter Cashflow – mit den Pfeiltasten durch die Jahre",
    kumSvgAria: (n, a, b) => `Kumulierter Cashflow: Projekt nach ${n} Jahren ${a}, Eigenkapital ${b}.`,
    jKurz: (f, v) => `${f.fmt(v, 1)} J.`,
    jahr0: "Investition (Jahr 0)",
    nachJahr: (i) => `Nach Jahr ${i}`,
    projekt: "Projekt",
    eigenkapital: "Eigenkapital",
    legProjekt: "Projekt (ohne Finanzierung)",
    legEk: "Eigenkapital (nach Schuldendienst)",
    vz: (f, d) => (d === 0 ? "±0 %" : `${d > 0 ? "+" : "−"}${f.fmt(Math.abs(d) * 100)} %`),
    matrixAria: "Sensitivitätsmatrix",
    matrixCaption: (ek) => `${ek ? "Eigenkapitalrendite" : "Projektrendite"} bei veränderter Investition und verändertem Strompreis`,
    matrixKopf: "Capex ↓ · Preis →",
    eurZelle: (f, v) => `${f.fmt(v)} €`,
    matrixFuss: (ek, z, capex) => `Grün: erreicht ${ek ? `die EK-Renditeerwartung von ${z}` : `die Kapitalkosten (WACC ${z})`}; hellgrün: bis 1,5 Prozentpunkte darunter. Umrandet: Ihre Eingabe (${capex} €/kWp).`,
    jahrestabelle: "Jahrestabelle",
    aufklappen: "Aufklappen",
    zuklappen: "Zuklappen",
    tabelleAria: "Jahrestabelle Cashflow",
    spalten: ["Jahr", "MWh", "ct/kWh", "Erlös", "Kosten", "Zins + Tilgung", "Frei für EK", "DSCR"],
  },
  en: {
    bauarten: { sued: "South, fixed", ostWest: "East/West, fixed", tracker: "Single-axis tracker", agriVertikal: "Agrivoltaics, vertical bifacial", agriHoch: "Agrivoltaics, elevated" },
    modelle: { eeg: "EEG award", ppa: "PPA", merchant: "Merchant" },
    regionLabel: (id, l) => regionEn(id, "label", l).replace("Western & central Germany", "West & Central"),
    regionLang: (id, l) => regionEn(id, "label", l),
    datum: (d) => datumText(d, "en"),
    region: "Region",
    cashflowUeber: (n) => `Cash flow over ${n} years`,
    ansichtLabel: "Chart view",
    jeJahr: "Per year",
    kumuliert: "Cumulative",
    sensitivitaet: "Sensitivity",
    sensText: "Investment (rows) against electricity price (columns, affects contract and market price)",
    matrixLabel: "Matrix metric",
    projektIrr: "Project IRR",
    ekIrr: "Equity IRR",
    erreicht: (ek) => `reaches ${ek ? "the expected equity return" : "the cost of capital"}`,
    bis15: "up to 1.5 percentage points below",
    deutlich: "significantly below",
    ihreEingabe: "Your input",
    anlageStandort: "Plant & site",
    leistung: "Capacity",
    leistungHinweis: (ha, gwh) => `≈ ${ha} ha of land · ${gwh} GWh in the first year`,
    bauart: "Design",
    ertragDelta: (f, plus, v) => `${plus ? "+" : "−"}${f.pct(v)} yield`,
    investition: "Investment",
    epc: "Plant (EPC)",
    proKwp: (f, v) => f.eur(v, "/kWp"),
    epcHinweis: (a, b) => `Guide value ground-mounted €${a}–${b}/kWp excluding grid connection; agrivoltaics considerably higher.`,
    rechte: "Project rights / development",
    rechteHinweis: "Your own development costs or the purchase price of the project rights (RTB usually €60–130/kWp).",
    netzKm: "Distance to the grid connection",
    netzHinweis: (a, b) => `Grid connection in total ≈ ${a} (cable €${b}/m + transfer station)`,
    erloese: "Revenue",
    erloesmodell: "Revenue model",
    optEeg: ["EEG", "award"],
    optPpa: ["PPA", "fixed price"],
    optMerchant: ["Merchant", "market price"],
    zuschlagswert: "Award value",
    ppaPreis: "PPA price",
    ct2: (f, v) => `${f.fmt(v, 2)} ct/kWh`,
    ct1: (f, v) => `${f.fmt(v, 1)} ct/kWh`,
    eegHinweis: (werte, von, bis) => `Recently ${werte} ct/kWh (Bundesnetzagentur, ${von} to ${bis}). Acts as a floor – a higher market value is yours to keep.`,
    ppaHinweis: (a, b) => `Solar PPA (pay-as-produced) roughly ${a}–${b} ct/kWh.`,
    ppaLaufzeit: "PPA term",
    jahreEinheit: "years",
    negativ: "Generation at negative prices",
    pctFmt: (f, v) => f.pct(v),
    negativHinweis: (x) => `§ 51 EEG: support does not apply in periods with a negative exchange price. In 2025, around ${x}% of solar generation fell into such hours (LfL Bayern). Modelled as curtailment, without the extension under § 51a.`,
    marktHeute: "Solar market value (today)",
    marktNach: (j) => `Market value after year ${j}`,
    marktHinweis: (x) => `Today’s value, projected at ${x}% p.a. – deliberately below inflation (cannibalisation).`,
    experten: "Operation & financing (experts)",
    expertenZeile: (f, p, fk, z, n) => `Lease €${f.fmt(p)}/ha · debt ${f.pct(fk)} · interest ${f.pct(z, 2)} · ${n} yrs`,
    betrieb: "Operation",
    pacht: "Lease",
    proHa: (f, v) => f.eur(v, "/ha"),
    pachtHinweis: (f, ha, p, s, i) => `${f.fmt(ha, 1)} ha × €${f.fmt(p)} = ${s} per year, indexed at ${f.pct(i, 1)} p.a.`,
    opex: "Operating costs excluding lease",
    opexFmt: (f, v) => f.eur(v, "/kWp·yr", 1),
    opexHinweis: "Maintenance, insurance, direct marketing, monitoring, administration – rises with inflation.",
    degradation: "Degradation",
    pa2: (f, v) => `${f.pct(v, 2)} p.a.`,
    finanzierung: "Financing",
    fkQuote: "Debt ratio (target)",
    zins: "Interest rate",
    pct2: (f, v) => f.pct(v, 2),
    darlehen: "Loan term",
    betrachtung: "Period under review",
    betrachtungHinweis: "Leases usually run 30 years plus extension options.",
    dscrLabel: (x) => `Cap the loan at a DSCR of ${x}`,
    dscrText: "As banks calculate: loan size follows the cash flow",
    sr: (a, b, c) => `Project return ${a}, equity return ${b}, levelised cost of electricity ${c} cents per kilowatt hour`,
    plakette: (n) => `${n} years · before tax`,
    ohneFin: (w) => `without financing · WACC ${w}`,
    ekIrrLang: "Equity IRR",
    pctSuffix: "%",
    deltaPkt: (f, d) => `${f.fmt(d, 1)} pp`,
    ekFk: (a, b) => `Equity ${a} · debt ${b}`,
    lcoeZusatz: (a, b) => `Fraunhofer ISE 2024: ${a}–${b} ct`,
    ctSuffix: " ct",
    npv: "Net present value (NPV)",
    npvZusatz: (w) => `project, discounted at ${w}`,
    amortisation: "Payback",
    projektKum: "project, cumulative",
    jahreSuffix: " years",
    laufzeitUeber: "> term",
    dscrMin: "Min. DSCR",
    dscrSchnitt: (f, a, n) => `Ø ${f.fmt(a, 2)} over ${n} years`,
    ohneFk: "without debt",
    fkBegrenzt: (d, a, b, c) => `At a DSCR of ${d}, the cash flow only supports ${a} debt instead of ${b} – the rest (${c}) would have to be covered by equity.`,
    negHebel: (z) => `Negative leverage: the interest rate (${z}) is above the project return – here, debt lowers the equity return.`,
    satzOhne: "Have it recalculated with your project data",
    satzMit: "project IRR – have it recalculated with your project data",
    nachricht: (mwp, reg, mod, n, a, b, c) => `From the solar park return calculator: ${mwp} MWp, region ${reg}, revenue model ${mod}, ${n} years. Result (model calculation): project IRR ${a}, equity IRR ${b}, LCOE ${c} ct/kWh. Please discuss suitable projects with me.`,
    projekteAnsehen: "View projects",
    suchprofil: "Create a search profile",
    anfrageHinweis: "Model calculation before tax, without guarantee – does not replace a yield assessment or a bank’s calculation. We are happy to calculate with your project data.",
    anlage: "Plant",
    netzanschluss: "Grid connection",
    projektrechte: "Project rights",
    investGesamt: (f, v) => `${f.eur(v, "/kWp")} in total`,
    cfJahrAria: "Cash flow per year – use the arrow keys to move through the years",
    balkenAria: (n, x) => `Bar chart: annual revenue, costs and debt service over ${n} years. Free cash flow in the first year ${x}.`,
    markt: "Market",
    abHier: "market price from here",
    jahr: "Year",
    marktKlammer: " (market)",
    erloes: "Revenue",
    betriebPacht: "Operation & lease",
    schuldendienst: "Debt service",
    freiEk: "Free for equity",
    legErloes: "Power revenue",
    legKosten: "Operation, lease, decommissioning",
    legDienst: "Interest & repayment",
    legFrei: "Free for equity",
    kumAria: "Cumulative cash flow – use the arrow keys to move through the years",
    kumSvgAria: (n, a, b) => `Cumulative cash flow: project after ${n} years ${a}, equity ${b}.`,
    jKurz: (f, v) => `${f.fmt(v, 1)} yrs`,
    jahr0: "Investment (year 0)",
    nachJahr: (i) => `After year ${i}`,
    projekt: "Project",
    eigenkapital: "Equity",
    legProjekt: "Project (without financing)",
    legEk: "Equity (after debt service)",
    vz: (f, d) => (d === 0 ? "±0%" : `${d > 0 ? "+" : "−"}${f.fmt(Math.abs(d) * 100)}%`),
    matrixAria: "Sensitivity matrix",
    matrixCaption: (ek) => `${ek ? "Equity return" : "Project return"} with changed investment and electricity price`,
    matrixKopf: "Capex ↓ · Price →",
    eurZelle: (f, v) => f.eur(v),
    matrixFuss: (ek, z, capex) => `Green: reaches ${ek ? `the expected equity return of ${z}` : `the cost of capital (WACC ${z})`}; light green: up to 1.5 percentage points below. Outlined: your input (€${capex}/kWp).`,
    jahrestabelle: "Annual table",
    aufklappen: "Expand",
    zuklappen: "Collapse",
    tabelleAria: "Annual cash flow table",
    spalten: ["Year", "MWh", "ct/kWh", "Revenue", "Costs", "Interest + repayment", "Free for equity", "DSCR"],
  },
};

export default function SolarparkRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtEur, fmtMio, pct } = h;
  const [mwp, setMwp] = useState(STANDARD.mwp);
  const [regionId, setRegionId] = useState(() => landStart(STANDARD, seitenLand).regionId);
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
      legende={t.region}
      wert={regionId}
      onChange={setRegionId}
      spalten={2}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, x.label), sub: `${fmt(x.ertrag)} kWh/kWp` }))}
    />
  );

  return (
    <RechnerRahmen
      mitlaufend
      unten={
        <div className="space-y-6">
          <div className="rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">{t.cashflowUeber(laufzeit)}</h3>
              <Ansicht
                name="cf-ansicht"
                label={t.ansichtLabel}
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "jahr", label: t.jeJahr },
                  { id: "kumuliert", label: t.kumuliert },
                ]}
              />
            </div>
            {ansicht === "jahr" ? <CashflowJahre r={r} /> : <CashflowKumuliert r={r} />}
          </div>

          <div className="rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70 lg:grid lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-center lg:gap-4">
            <div className="flex flex-col gap-4 px-5 pt-5 md:px-6 lg:self-stretch lg:border-r lg:border-ink-100 lg:py-6">
              <div>
                <h3 className="font-display text-[17px] font-bold text-ink-900">{t.sensitivitaet}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{t.sensText}</p>
              </div>
              <Ansicht
                name="matrix-wert"
                label={t.matrixLabel}
                wert={matrixWert}
                onChange={setMatrixWert}
                optionen={[
                  { id: "projekt", label: t.projektIrr },
                  { id: "ek", label: t.ekIrr },
                ]}
              />
              <ul aria-hidden="true" className="hidden space-y-2 text-[12.5px] text-ink-600 lg:mt-auto lg:block">
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ov-500" />{t.erreicht(matrixWert === "ek")}</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ov-100 ring-1 ring-inset ring-ov-200" />{t.bis15}</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-ink-100 ring-1 ring-inset ring-ink-200" />{t.deutlich}</li>
                <li className="flex items-center gap-2"><span className="h-3 w-3 rounded ring-2 ring-inset ring-ink-900" />{t.ihreEingabe}</li>
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
              [t.projektIrr, pct(r.projektIrr)],
              [t.ekIrr, pct(r.ekIrr)],
              ["LCOE", `${fmt(r.lcoeCt, 2)} ct`],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.anlageStandort}>
              <Regler
                label={t.leistung}
                wert={mwp}
                min={1}
                max={100}
                step={1}
                einheit="MWp"
                onChange={setMwp}
                hinweis={t.leistungHinweis(fmt(r.flaecheHa, 1), fmt(r.ertragJahr1 / 1e6, 1))}
              />
              {regionWahl}
              <Auswahl
                legende={t.bauart}
                wert={bauart}
                onChange={setBauartMitCapex}
                spalten={2}
                klein
                optionen={Object.entries(BAUART).map(([id, b]) => ({ id, label: t.bauarten[id] ?? b.label, sub: t.ertragDelta(h, b.faktor >= 1, Math.abs(b.faktor - 1) * 100) }))}
              />
            </Gruppe>

            <Gruppe titel={t.investition}>
              <Regler
                label={t.epc}
                wert={capexKwp}
                min={400}
                max={1400}
                step={10}
                format={(v) => t.proKwp(h, v)}
                onChange={setCapex}
                hinweis={t.epcHinweis(fmt(FREIFLAECHE.capexProKwp.min), fmt(FREIFLAECHE.capexProKwp.max))}
              />
              <Regler
                label={t.rechte}
                wert={entwicklungKwp}
                min={0}
                max={150}
                step={5}
                format={(v) => t.proKwp(h, v)}
                onChange={setEntwicklung}
                hinweis={t.rechteHinweis}
              />
              <Regler
                label={t.netzKm}
                wert={netzKm}
                min={0}
                max={15}
                step={0.5}
                stellen={1}
                format={(v) => `${fmt(v, 1)} km`}
                onChange={setNetzKm}
                hinweis={t.netzHinweis(fmtEur(r.investition.netz), fmt(FREIFLAECHE.kabelProMeter))}
              />
            </Gruppe>

            <Gruppe titel={t.erloese}>
              <Auswahl
                legende={t.erloesmodell}
                wert={modell}
                onChange={setModell}
                optionen={[
                  { id: "eeg", label: t.optEeg[0], sub: t.optEeg[1] },
                  { id: "ppa", label: t.optPpa[0], sub: t.optPpa[1] },
                  { id: "merchant", label: t.optMerchant[0], sub: t.optMerchant[1] },
                ]}
              />
              {modell !== "merchant" && (
                <Regler
                  label={modell === "eeg" ? t.zuschlagswert : t.ppaPreis}
                  wert={preisCt}
                  min={3}
                  max={9}
                  step={0.05}
                  format={(v) => t.ct2(h, v)}
                  onChange={setPreisCt}
                  hinweis={
                    modell === "eeg"
                      ? t.eegHinweis(
                          letzteZuschlaege(ZUSCHLAEGE.freiflaeche).map((z) => fmt(z.ct, 2)).join(" · "),
                          t.datum(letzteZuschlaege(ZUSCHLAEGE.freiflaeche)[0].termin),
                          t.datum(letzteZuschlaege(ZUSCHLAEGE.freiflaeche).at(-1).termin)
                        )
                      : t.ppaHinweis(fmt(ERLOESE.ppaCt.min, 1), fmt(ERLOESE.ppaCt.max, 1))
                  }
                />
              )}
              {modell === "ppa" && <Regler label={t.ppaLaufzeit} wert={vertragJahre} min={3} max={20} step={1} einheit={t.jahreEinheit} onChange={setVertragJahre} />}
              {modell === "eeg" && (
                <Regler
                  label={t.negativ}
                  wert={negativAnteil}
                  min={0}
                  max={0.5}
                  step={0.01}
                  format={(v) => t.pctFmt(h, v * 100)}
                  onChange={setNegativAnteil}
                  hinweis={t.negativHinweis(fmt(ERLOESE.paragraph51.anteilNegativ * 100, 1))}
                />
              )}
              <Regler
                label={modell === "merchant" ? t.marktHeute : t.marktNach(modell === "eeg" ? 20 : vertragJahre)}
                wert={merchantCt}
                min={2}
                max={8}
                step={0.1}
                format={(v) => t.ct1(h, v)}
                onChange={setMerchantCt}
                hinweis={t.marktHinweis(fmt(ERLOESE.merchantSteigerung * 100, 1))}
              />
            </Gruppe>

            <details className="group rounded-2xl bg-white/70 ring-1 ring-ink-200/70 open:bg-transparent open:ring-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 group-open:px-0 [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100">
                  <SlidersHorizontal aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink-800">{t.experten}</span>
                  <span className="ov-num block truncate text-[12.5px] text-ink-500">{t.expertenZeile(h, pachtHa, fkQuote * 100, zins * 100, laufzeit)}</span>
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="animate-ov-einblenden space-y-8 pt-6">
            <Gruppe titel={t.betrieb}>
              <Regler
                label={t.pacht}
                wert={pachtHa}
                min={800}
                max={6000}
                step={100}
                format={(v) => t.proHa(h, v)}
                onChange={setPachtHa}
                hinweis={t.pachtHinweis(h, r.flaecheHa, pachtHa, fmtEur(r.flaecheHa * pachtHa), PACHT.indexierung * 100)}
              />
              <Regler
                label={t.opex}
                wert={opexKwp}
                min={6}
                max={22}
                step={0.5}
                stellen={1}
                format={(v) => t.opexFmt(h, v)}
                onChange={setOpex}
                hinweis={t.opexHinweis}
              />
              <Regler label={t.degradation} wert={degradation} min={0.002} max={0.008} step={0.0005} format={(v) => t.pa2(h, v * 100)} onChange={setDegradation} />
            </Gruppe>

            <Gruppe titel={t.finanzierung}>
              <Regler label={t.fkQuote} wert={fkQuote} min={0} max={0.9} step={0.05} format={(v) => t.pctFmt(h, v * 100)} onChange={setFkQuote} />
              <Regler label={t.zins} wert={zins} min={0.02} max={0.08} step={0.0025} format={(v) => t.pct2(h, v * 100)} onChange={setZins} />
              <Regler label={t.darlehen} wert={tilgungJahre} min={8} max={25} step={1} einheit={t.jahreEinheit} onChange={setTilgung} />
              <Regler label={t.betrachtung} wert={laufzeit} min={20} max={40} step={1} einheit={t.jahreEinheit} onChange={setLaufzeit} hinweis={t.betrachtungHinweis} />
              <Schalter
                icon={Landmark}
                label={t.dscrLabel(fmt(FINANZIERUNG.dscrZiel, 2))}
                beschreibung={t.dscrText}
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
            {t.sr(pct(r.projektIrr), pct(r.ekIrr), fmt(r.lcoeCt, 2))}
          </p>
          <ErgebnisKopf plakette={t.plakette(laufzeit)} />

          <Hauptzahl
            className="mt-5"
            icon={Percent}
            label={t.projektIrr}
            zusatz={t.ohneFin(pct(r.wacc))}
            rechts={
              <div className="sm:text-right">
                <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                  <Banknote aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.ekIrrLang}
                </p>
                <p className="ov-kpi mt-0.5 text-white">
                  {r.ekIrr == null ? "–" : <Zahl wert={r.ekIrr * 100} stellen={1} suffix={t.pctSuffix} delta="dunkel" deltaFormat={(dd) => t.deltaPkt(h, dd)} />}
                </p>
                <p className="text-[12.5px] text-white/75">{t.ekFk(fmtMio(r.ek), pct(r.fkQuoteEff, 0))}</p>
              </div>
            }
          >
            {r.projektIrr == null ? "–" : <Zahl wert={r.projektIrr * 100} stellen={1} suffix={t.pctSuffix} delta="dunkel" deltaFormat={(dd) => t.deltaPkt(h, dd)} einlauf />}
          </Hauptzahl>
          <Belege spalten={2}>
            <Kennzahl ton="akzent" icon={Gauge} label="LCOE" zusatz={t.lcoeZusatz(fmt(ERLOESE.lcoeIseCt.min, 1), fmt(ERLOESE.lcoeIseCt.max, 1))}>
              <Zahl wert={r.lcoeCt} stellen={2} suffix={t.ctSuffix} delta="hell" />
            </Kennzahl>
            <Kennzahl icon={Scale} label={t.npv} zusatz={t.npvZusatz(pct(r.wacc))}>
              <span className={r.kapitalwert < 0 ? "text-sun-700" : undefined}>
                <Zahl wert={r.kapitalwert} format={(v) => fmtMio(v, 2)} delta="hell" />
              </span>
            </Kennzahl>
            <Kennzahl icon={CalendarClock} label={t.amortisation} zusatz={t.projektKum}>
              {r.amortisation ? <Zahl wert={r.amortisation} stellen={1} suffix={t.jahreSuffix} delta="hell" /> : t.laufzeitUeber}
            </Kennzahl>
            <Kennzahl icon={Landmark} label={t.dscrMin} zusatz={r.dscrMittel ? t.dscrSchnitt(h, r.dscrMittel, tilgungJahre) : t.ohneFk}>
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
                {t.fkBegrenzt(fmt(FINANZIERUNG.dscrZiel, 2), pct(r.fkQuoteEff, 0), pct(fkQuote, 0), fmtMio(r.fk ? r.fkWunsch - r.fk : 0))}
              </Hinweis>
            )}
            {r.ekIrr != null && r.projektIrr != null && r.ekIrr < r.projektIrr && r.fk > 0 && (
              <Hinweis ton="neutral" icon={AlertTriangle}>
                {t.negHebel(pct(zins, 2))}
              </Hinweis>
            )}
            <InvestZeile r={r} />
          </div>

          <ErgebnisAnfrage
            typ="investor"
            href="/kontakt?anliegen=investor#formular"
            kennzahl={r.projektIrr == null ? null : <Zahl wert={r.projektIrr * 100} stellen={1} suffix={t.pctSuffix} />}
            satz={r.projektIrr == null ? t.satzOhne : t.satzMit}
            signal={`${r.projektIrr}|${r.ekIrr}`}
            nachricht={t.nachricht(fmt(mwp, mwp % 1 ? 1 : 0), t.regionLang(regionId, REGIONEN.find((x) => x.id === regionId)?.label || regionId), t.modelle[modell] ?? (ERLOESMODELLE[modell]?.label || modell), laufzeit, pct(r.projektIrr), pct(r.ekIrr), fmt(r.lcoeCt, 2))}
            sekundaer={[
              { href: "/projektboerse", label: t.projekteAnsehen },
              { href: "/registrieren?rolle=investor", label: t.suchprofil },
            ]}
            hinweis={t.anfrageHinweis}
          />
        </>
      }
    />
  );
}

function InvestZeile({ r }) {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmtEur, fmtMio } = h;
  const teile = [
    [t.anlage, r.investition.anlage, "#669933"],
    [t.netzanschluss, r.investition.netz, "#1f5aa1"],
    [t.projektrechte, r.investition.entwicklung, "#c98500"],
  ].filter(([, v]) => v > 0);
  return (
    <div className="rounded-2xl bg-ink-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-800">{t.investition} {fmtMio(r.investition.summe, 2)}</span>
        <span className="ov-num text-ink-600">{t.investGesamt(h, r.investProKwp)}</span>
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
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtEur, tsd } = h;
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
      <div {...tastatur} role="group" aria-label={t.cfJahrAria} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={t.balkenAria(n, fmtEur(jahre[0].cfEk))}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={yv(v)} y2={yv(v)} stroke={v === 0 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={yv(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {v === 0 ? "0" : h.mioAchse(v, schritt < 1e6 ? 1 : 0)}
            </text>
          </g>
        ))}
        {vertragEnde > 0 && vertragEnde < n && (
          <g>
            <line x1={P.l + vertragEnde * band} x2={P.l + vertragEnde * band} y1={P.t - 4} y2={H - P.b} stroke="#c98500" strokeDasharray="3 4" />
            <text x={P.l + vertragEnde * band + 4} y={P.t + 6} className="fill-sun-700 text-[10.5px] font-semibold">
              {schmal ? t.markt : t.abHier}
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
            {t.jahr} {aktiv.jahr} · {fmt(aktiv.preisCt, 2)} ct/kWh{aktiv.imVertrag ? "" : t.marktKlammer}
          </p>
          <p className="text-white/70">
            {t.erloes} <span className="ov-num font-semibold text-white">{tsd(aktiv.erloes)}</span>
          </p>
          <p className="text-white/70">
            {t.betriebPacht} <span className="ov-num font-semibold text-white">−{tsd(aktiv.kosten)}</span>
          </p>
          {aktiv.schuldendienst > 0 && (
            <p className="text-white/70">
              {t.schuldendienst} <span className="ov-num font-semibold text-white">−{tsd(aktiv.schuldendienst)}</span>
            </p>
          )}
          <p className="text-white/70">
            {t.freiEk} <span className={cn("ov-num font-semibold", aktiv.cfEk >= 0 ? "text-ov-300" : "text-sun-300")}>{tsd(aktiv.cfEk)}</span>
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
            { label: t.legErloes, farbe: FARBE.erloes },
            { label: t.legKosten, farbe: FARBE.kosten },
            { label: t.legDienst, farbe: FARBE.dienst },
            { label: t.legFrei, farbe: FARBE.cf, linie: true },
          ]}
        />
      </div>
    </div>
  );
}

function CashflowKumuliert({ r }) {
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, fmtMio } = h;
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
      <div {...tastatur} role="group" aria-label={t.kumAria} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block touch-pan-y select-none"
        role="img"
        aria-label={t.kumSvgAria(n, fmtMio(projekt[n]), fmtMio(ek[n]))}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {Math.abs(v) < 1 ? "0" : h.mioAchse(v, schritt < 1e6 ? 1 : 0)}
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
              {t.jKurz(h, r.amortisation)}
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
          <p className="font-semibold">{hover === 0 ? t.jahr0 : t.nachJahr(hover)}</p>
          <p className="text-white/70">
            {t.projekt} <span className="ov-num font-semibold text-white">{fmtMio(projekt[hover], 2)}</span>
          </p>
          <p className="text-white/70">
            {t.eigenkapital} <span className="ov-num font-semibold text-white">{fmtMio(ek[hover], 2)}</span>
          </p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: t.legProjekt, farbe: FARBE.projekt, linie: true },
            { label: t.legEk, farbe: FARBE.ek, linie: true },
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
  const t = useTexte(TEXTE);
  const h = hilfen(useFormate());
  const { fmt, pct } = h;
  const sp = matrix[0].zellen.map((z) => z.preis);
  const vz = (d) => t.vz(h, d);
  return (
    <div className="px-3 pb-5 pt-4 md:px-4">
      <div tabIndex={0} role="region" aria-label={t.matrixAria} className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center text-[13px]">
          <caption className="sr-only">{t.matrixCaption(wert === "ek")}</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1.5 text-left text-[11.5px] font-semibold text-ink-500">
                {t.matrixKopf}
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
                  {vz(z.capex)} <span className="font-normal text-ink-500">· {t.eurZelle(h, z.capexKwp)}</span>
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
        {t.matrixFuss(wert === "ek", pct(ziel), fmt(capexKwp))}
      </p>
    </div>
  );
}

function Jahrestabelle({ r }) {
  const t = useTexte(TEXTE);
  const { fmt, tsd } = hilfen(useFormate());
  return (
    <details className="group rounded-3xl bg-white ring-1 ring-ink-200/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 md:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5 font-display text-[17px] font-bold text-ink-900">
          <TableProperties aria-hidden="true" className="h-5 w-5 text-ov-600" /> {t.jahrestabelle}
        </span>
        <span className="text-[13px] font-semibold text-ov-700 group-open:hidden">{t.aufklappen}</span>
        <span className="hidden text-[13px] font-semibold text-ov-700 group-open:inline">{t.zuklappen}</span>
      </summary>
      <div tabIndex={0} role="region" aria-label={t.tabelleAria} className="max-h-[420px] overflow-auto border-t border-ink-100">
        <table className="w-full min-w-[640px] text-right text-[12.5px]">
          <thead className="sticky top-0 bg-sand-50 text-[11.5px] uppercase tracking-[0.08em] text-ink-500">
            <tr>
              {t.spalten.map((s) => (
                <th key={s} scope="col" className="px-3 py-2.5 font-semibold first:text-left">
                  {s}
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

"use client";

// Öffentlicher Ersparnis-Rechner Energiegemeinschaft Österreich (WP6). Reine Funktion eg/interesse.js rechnerOeffentlich
// (= Python eg_portal_kern.rechner_oeffentlich, API POST /api/eg/rechner): Netzentgelt aus der Regeltabelle (SNE-V 2018 bis
// Ende 2026, Arbeitshypothese ab 2027), Abgabenbefreiung nur EEG, Standardpreise aus src/lib/invest/markt.js.
//
// Props (alle optional, Standard = Verhalten der Rechner-Seite /energiegemeinschaften/rechner):
//   ctaHref, ctaLabel      Haupt-Button im Ergebnis
//   ctaHinweis             kleine Zeile unter den Buttons
//   zweitCta               { label, href } – zweiter, leiserer Button
//   perspektive            "mitglied" | "vorstand" (Vorstand rechnet für ein Beispielmitglied)
//   ueberschriftEbene      2 | 3 – Ebene der Ergebnis-Überschrift (Standard: 2, bei perspektive="vorstand" 3)

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeftRight, ChevronDown, Info, Leaf, PiggyBank, Plug, Sun, Users, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import FortschrittsRing from "@/components/ui/FortschrittsRing";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Kennzahl, Regler, Zahl, eingabeMerken } from "@/components/Rechner/bausteine";
import { Hinweis, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { RECHNER_DECKUNG, RECHNER_MODELLE, RECHNER_PROFILE, RECHNER_ROLLEN, RECHNER_STANDARD, rechnerOeffentlich } from "@/lib/plattform/eg/interesse";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { DECKUNG_EN, MODELLE_EN, PROFILE_EN, ROLLEN_EN, hinweisEn, quelleEn, regelTextEn, teilEn } from "./ersparnisEn";

const opt = (o) => Object.entries(o).map(([id, x]) => ({ id, label: typeof x === "string" ? x : x.label, sub: typeof x === "string" ? undefined : x.sub }));
/** Optionen mit englischen Beschriftungen (gleiche ids), sonst deutsch */
const optEn = (o, en, tabelle) => (en ? opt(o).map((x) => ({ ...x, ...(typeof tabelle[x.id] === "string" ? { label: tabelle[x.id] } : tabelle[x.id] || {}) })) : opt(o));
/** Geldbetrag in der Sprache der Seite (de „−12 €“, en „−€12“) */
const useEuro = () => {
  const { fmtEur } = useFormate();
  return (v) => `${v < 0 ? "−" : ""}${fmtEur(Math.abs(Math.round(v)))}`;
};

/* Sprachmodell: feste Texte je Sprache */
const TEXTE = {
  de: {
    rolle: "Rolle", einordnung: "Zur Einordnung", typisch: (a, b) => `Typisch sind ${a}–${b} € im Jahr je Haushalt`, lage: { unter: "unter", über: "über", in: "in" },
    lageText: (l) => ` – dieses Ergebnis liegt ${l} der typischen Spanne`, eur: (v) => `${v} €`,
    zusammen: (v) => `So setzt sich ${v ? "der" : "Ihr"} Vorteil zusammen`, nettoBleibt: "netto bleibt", abzuege: "Abzüge", gebuehren: "Gebühren und Beitrag", nachteil: "Nachteil netto", vorteil: "Vorteil netto",
    ueberschuss: (kwh, v, pct) => `${kwh} kWh ${v ? "des" : "Ihres"} Überschusses nutzt die Gemeinschaft (ca. ${pct} %).`,
    ctaLabel: "Gemeinschaft finden",
    ansage: (neg, betrag, v, quote, modell, jahr) => `${neg ? "Nachteil" : "Vorteil"} netto ${betrag} pro Jahr${v ? " je Mitglied" : ""}${quote != null ? `, ${quote} Prozent des Verbrauchs aus der Gemeinschaft` : ""}, ${modell}, Regeln ${jahr}.`,
    ab2027: "ab 2027", mobilVorteil: "Vorteil netto", mobilAus: "aus Gemeinschaft",
    angabenV: "Angaben zum Beispielmitglied", angaben: "Ihre Angaben", beispielmitglied: "Beispielmitglied", sie: "Sie",
    verbrauch: "Verbrauch", jahresverbrauch: "Jahresverbrauch", hinweisV: "steht auf der Jahresabrechnung des Mitglieds", hinweisSie: "steht auf Ihrer Jahresabrechnung",
    pv: "PV-Anlage", erzeugungJahr: (v) => `≈ ${v} kWh Erzeugung pro Jahr`, eigenverbrauch: "Eigenverbrauch im Haus",
    gemeinschaft: "Gemeinschaft", modell: "Modell", erzeugungGem: "Erzeugung in der Gemeinschaft", verhaeltnis: "Erzeugung im Verhältnis zum Verbrauch der Gemeinschaft",
    regeln: "Netzentgelt-Regeln", hypothese: "Arbeitshypothese", preise: "Preise", preiseNetto: "Preise netto (ct/kWh)", angepasst: "angepasst", vorbelegt: "Vorbelegt mit üblichen Werten – anpassen, wenn Sie Ihre Preise kennen.",
    lieferant: "Energiepreis Ihres Lieferanten", lieferantH: "nur Energieanteil, ohne Netz und Abgaben", gemPreis: "Preis in der Gemeinschaft", gemPreisH: "üblich 9–14 ct (Marktbeobachtung)",
    netzAp: "Netznutzungs-Arbeitspreis", netzApH: "je Netzgebiet verschieden, siehe Netzrechnung", einspeise: "Einspeisepreis der Gemeinschaft", markt: "Alternative: Marktpreis Überschuss", eurJahr: (v) => `${v} €/Jahr`,
    ergebnisV: "Ergebnis je Mitglied", ergebnis: "Ihr Ergebnis", vorteilJahrV: "Vorteil netto je Mitglied und Jahr", vorteilJahr: "Vorteil netto pro Jahr", nach: (v) => `nach ${v} Gebühren und Beitrag`,
    ringLabel: (v) => `${v} Prozent des Verbrauchs aus der Gemeinschaft`, ringTextV: "des Verbrauchs aus der Gemeinschaft", ringText: "Ihres Verbrauchs aus der Gemeinschaft",
    ausGem: "Aus der Gemeinschaft", desVerbrauchs: (v) => `${v} % des Verbrauchs`, inGem: "In die Gemeinschaft", eingebracht: "eingebrachter Überschuss",
    jeKwh: "Vorteil je kWh", jeKwhZ: "Energie + Netz + Abgabe", co2: "CO₂ (rechnerisch)", co2Z: "UBA-Faktor; österr. Strommix meist darunter",
    nichtGesichert: "Noch nicht gesichert: ", netzentgelt: "Netzentgelt: ", abgabe: "; Elektrizitätsabgabe entfällt für Gemeinschaftsstrom", quelle: "Quelle: ", achtung: "Achtung: ",
    fuss: (v) => `Erste Einschätzung, netto. Maßgeblich sind die Viertelstundenwerte ${v ? "des" : "Ihres"} Netzbetreibers und das Preisblatt ${v ? "der" : "Ihrer"} Gemeinschaft.`,
  },
  en: {
    rolle: "Role", einordnung: "For context", typisch: (a, b) => `Typical: €${a}–${b} a year per household`, lage: { unter: "below", über: "above", in: "within" },
    lageText: (l) => ` – this result is ${l} the typical range`, eur: (v) => `€${v}`,
    zusammen: (v) => (v ? "How the benefit is made up" : "How your benefit is made up"), nettoBleibt: "net remaining", abzuege: "Deductions", gebuehren: "Fees and contribution", nachteil: "Net disadvantage", vorteil: "Net benefit",
    ueberschuss: (kwh, v, pct) => `The community uses ${kwh} kWh of ${v ? "the" : "your"} surplus (approx. ${pct} %).`,
    ctaLabel: "Find a community",
    ansage: (neg, betrag, v, quote, modell, jahr) => `${neg ? "Net disadvantage" : "Net benefit"} ${betrag} per year${v ? " per member" : ""}${quote != null ? `, ${quote} percent of consumption from the community` : ""}, ${modell}, rules ${jahr}.`,
    ab2027: "from 2027", mobilVorteil: "Net benefit", mobilAus: "from community",
    angabenV: "Details of the example member", angaben: "Your details", beispielmitglied: "Example member", sie: "You",
    verbrauch: "Consumption", jahresverbrauch: "Annual consumption", hinweisV: "shown on the member’s annual bill", hinweisSie: "shown on your annual bill",
    pv: "PV installation", erzeugungJahr: (v) => `≈ ${v} kWh generation per year`, eigenverbrauch: "Self-consumption in the home",
    gemeinschaft: "Community", modell: "Model", erzeugungGem: "Generation in the community", verhaeltnis: "Generation in relation to the community’s consumption",
    regeln: "Grid fee rules", hypothese: "working hypothesis", preise: "Prices", preiseNetto: "Prices net (ct/kWh)", angepasst: "adjusted", vorbelegt: "Pre-filled with typical values – adjust them if you know your prices.",
    lieferant: "Your supplier’s energy price", lieferantH: "energy component only, excluding grid and levies", gemPreis: "Price in the community", gemPreisH: "typically 9–14 ct (market observation)",
    netzAp: "Grid usage energy charge", netzApH: "differs by grid area, see your grid bill", einspeise: "Community feed-in price", markt: "Alternative: market price for surplus", eurJahr: (v) => `€${v}/year`,
    ergebnisV: "Result per member", ergebnis: "Your result", vorteilJahrV: "Net benefit per member and year", vorteilJahr: "Net benefit per year", nach: (v) => `after ${v} fees and contribution`,
    ringLabel: (v) => `${v} percent of consumption from the community`, ringTextV: "of consumption from the community", ringText: "of your consumption from the community",
    ausGem: "From the community", desVerbrauchs: (v) => `${v} % of consumption`, inGem: "Into the community", eingebracht: "contributed surplus",
    jeKwh: "Benefit per kWh", jeKwhZ: "energy + grid + levy", co2: "CO₂ (calculated)", co2Z: "UBA factor (German Environment Agency); Austrian power mix usually lower",
    nichtGesichert: "Not yet confirmed: ", netzentgelt: "Grid fee: ", abgabe: "; electricity levy waived for community power", quelle: "Source: ", achtung: "Note: ",
    fuss: (v) => `Initial estimate, net. What counts are the quarter-hourly values from ${v ? "the" : "your"} grid operator and the price sheet of ${v ? "the" : "your"} community.`,
  },
};
const useTexteEr = () => TEXTE[useSprache() === "en" ? "en" : "de"];

/** Farbcodierung der Bestandteile – dieselbe Farbe für Punkt (Legende) und Balkensegment */
const FARBE = { energie: "bg-ov-500", netz: "bg-navy-600", abgaben: "bg-ov-300", erzeuger: "bg-sun-400" };
const PREIS_FELDER = ["lieferantCt", "gemeinschaftCt", "netzApCt", "einspeiseEgCt", "marktCt", "gebuehrenJahr"];
/** Schraffur für Abzüge (Gebühren) – im Balken und in der Legende gleich */
const SCHRAFFUR = "bg-[repeating-linear-gradient(135deg,var(--color-ink-400)_0_3px,var(--color-ink-200)_3px_6px)]";

/** Einordnungsskala: typische Spanne laut Hinweis „50–200 € im Jahr je Haushalt“ */
const SKALA_MAX = 250;
const TYPISCH = [50, 200];

/** Rolle als große Wahlkarten mit Symbol (echte Radios, einhändig gut zu treffen) */
const ROLLEN_ICON = { verbraucher: Plug, erzeuger: Sun, prosumer: ArrowLeftRight };
function RolleWahl({ wert, onChange }) {
  const name = useId();
  const en = useSprache() === "en";
  const w = useTexteEr();
  return (
    <fieldset>
      <legend className="mb-2.5 text-[14.5px] font-semibold text-ink-800">{w.rolle}</legend>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(en ? { ...RECHNER_ROLLEN, ...ROLLEN_EN } : RECHNER_ROLLEN).map(([id, label]) => {
          const aktiv = wert === id;
          const Icon = ROLLEN_ICON[id] || Zap;
          return (
            <label
              key={id}
              className={cn(
                "relative flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-center text-[13px] leading-tight ring-1 transition-[background-color,box-shadow,color] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                aktiv ? "bg-white font-semibold text-ink-900 shadow-e2 ring-ov-400" : "bg-white/50 text-ink-600 ring-ink-200 hover:bg-white hover:text-ink-900"
              )}
            >
              <input
                type="radio"
                name={name}
                value={id}
                checked={aktiv}
                onChange={() => {
                  eingabeMerken();
                  onChange(id);
                }}
                className="sr-only"
              />
              <span aria-hidden="true" className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200", aktiv ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-500")}>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Nummerierter Gruppentitel – führt durch die Eingaben */
function Schritt({ n, children }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 text-[11.5px] font-bold tracking-normal text-white">{n}</span>
      {children}
    </span>
  );
}

/** Einordnung auf der Skala 0–250 € mit hervorgehobener typischer Spanne (dunkle Karte) */
function Einordnung({ netto }) {
  const w = useTexteEr();
  const pos = Math.max(0, Math.min(100, (netto / SKALA_MAX) * 100));
  const ueber = netto > SKALA_MAX;
  const lage = w.lage[netto < TYPISCH[0] ? "unter" : netto > TYPISCH[1] ? "über" : "in"];
  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12.5px]">
        <p className="font-semibold text-white">{w.einordnung}</p>
        <p className="text-white/75">
          {w.typisch(TYPISCH[0], TYPISCH[1])}
          <span className="sr-only">{w.lageText(lage)}</span>
        </p>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-2 rounded-full bg-white/10">
        <div className="absolute inset-y-0 rounded-full bg-ov-400/35 ring-1 ring-ov-300/40" style={{ left: `${(TYPISCH[0] / SKALA_MAX) * 100}%`, width: `${((TYPISCH[1] - TYPISCH[0]) / SKALA_MAX) * 100}%` }} />
        <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-e3 ring-4 ring-ov-500/50 transition-[left] duration-500 ease-ov-out motion-reduce:transition-none" style={{ left: `${pos}%` }} />
      </div>
      <div aria-hidden="true" className="relative mt-2 h-4 text-[11.5px] text-white/60">
        <span className="absolute left-0 hidden sm:inline">{w.eur(0)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(TYPISCH[0] / SKALA_MAX) * 100}%` }}>{w.eur(TYPISCH[0])}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(TYPISCH[1] / SKALA_MAX) * 100}%` }}>{w.eur(TYPISCH[1])}</span>
        <span className="absolute right-0 hidden sm:inline">{ueber ? `> ${w.eur(SKALA_MAX)}` : w.eur(SKALA_MAX)}</span>
      </div>
    </div>
  );
}

/** Zusammensetzung: ein Balken (Bestandteile), Abzüge schraffiert vom Ende her – was übrig bleibt, ist netto */
function Zusammensetzung({ r, vorstand, teileId }) {
  const w = useTexteEr();
  const { fmt } = useFormate();
  const euro = useEuro();
  const positiv = r.teile.filter((t) => t.eur > 0);
  const summe = positiv.reduce((s, t) => s + t.eur, 0);
  const abzug = Math.max(0, summe - r.nettoEur);
  const abzugPct = summe > 0 ? Math.min(100, (abzug / summe) * 100) : 100;
  const gebuehren = -Math.abs(r.gebuehrenEur || 0);
  return (
    <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 md:p-5">
      <p id={teileId} className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-600">{w.zusammen(vorstand)}</p>

      <div aria-hidden="true" className="mt-4">
        <div className="relative">
          <div className="flex h-4 gap-[3px] overflow-hidden rounded-full bg-ink-100">
            {positiv.map((t, i) => (
              <div
                key={t.id}
                className={cn("ov-balken-x ov-sofort h-full transition-[width] duration-500 ease-ov-out first:rounded-l-full last:rounded-r-full motion-reduce:transition-none", FARBE[t.id] || FARBE.energie)}
                style={{ width: `${(t.eur / (summe || 1)) * 100}%`, "--i": i }}
              />
            ))}
          </div>
          {abzug > 0 && (
            <div className={cn("absolute inset-y-0 right-0 rounded-r-full border-l-2 border-white transition-[width] duration-500 ease-ov-out motion-reduce:transition-none", SCHRAFFUR)} style={{ width: `${abzugPct}%` }} />
          )}
        </div>
        <div className="relative mt-2 flex h-4 text-[11.5px] font-medium text-ink-500">
          <span>{r.nettoEur >= 0 ? w.nettoBleibt : ""}</span>
          {abzug > 0 && <span className="absolute right-0 whitespace-nowrap">{w.abzuege}</span>}
        </div>
      </div>

      <ul aria-labelledby={teileId} className="mt-3 divide-y divide-ink-100">
        {r.teile.map((t) => {
          const negativ = t.eur < 0;
          return (
            <li key={t.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[13.5px]">
              <span className="flex min-w-0 items-baseline text-ink-700">
                <span aria-hidden="true" className={cn("mr-2.5 inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-full", negativ ? "bg-danger-500" : FARBE[t.id] || FARBE.energie)} />
                <span className="min-w-0">
                  {t.label}
                  {Number.isFinite(t.ct) && t.ct !== 0 && <span className="ml-1.5 whitespace-nowrap text-[12px] text-ink-500">({fmt(t.ct, 2)} ct/kWh)</span>}
                  <span className="sr-only">: </span>
                </span>
              </span>
              <span className={cn("ov-num shrink-0 font-semibold", negativ ? "text-danger-700" : "text-ink-900")}>{euro(t.eur)}</span>
            </li>
          );
        })}
        <li className="flex items-baseline justify-between gap-3 py-2.5 text-[13.5px]">
          <span className="flex min-w-0 items-baseline text-ink-700">
            <span aria-hidden="true" className={cn("mr-2.5 inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[3px]", SCHRAFFUR)} />
            <span className="min-w-0">{w.gebuehren}<span className="sr-only">: </span></span>
          </span>
          <span className="ov-num shrink-0 font-semibold text-ink-700">{euro(gebuehren)}</span>
        </li>
        <li className="flex items-baseline justify-between gap-3 pt-3 font-display text-[16px] font-bold text-ink-900">
          <span>{r.nettoEur < 0 ? w.nachteil : w.vorteil}<span className="sr-only">: </span></span>
          <span className={cn("ov-num", r.nettoEur < 0 && "text-danger-700")}>{euro(r.nettoEur)}</span>
        </li>
      </ul>
      {r.eingebrachtKwh > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-sun-50 px-3 py-2 text-[12.5px] leading-snug text-ink-700">
          <Sun aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-600" />
          <span>{w.ueberschuss(fmt(r.eingebrachtKwh), vorstand, fmt(r.nutzungsgradPct * 0.85))}</span>
        </p>
      )}
    </div>
  );
}

export default function ErsparnisRechner({
  ctaHref = "/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt",
  ctaLabel: ctaLabelProp,
  ctaHinweis,
  zweitCta,
  perspektive = "mitglied",
  ueberschriftEbene,
}) {
  const sprache = useSprache();
  const en = sprache === "en";
  const w = TEXTE[en ? "en" : "de"];
  const { fmt } = useFormate();
  const euro = useEuro();
  const ctaLabel = ctaLabelProp ?? w.ctaLabel;
  const [e, setE] = useState({ ...RECHNER_STANDARD });
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const rRoh = useMemo(() => rechnerOeffentlich(e), [e]);
  // Anzeige: englische Beschriftungen über die ids (Rechnung unverändert)
  const r = useMemo(
    () =>
      en
        ? {
            ...rRoh,
            teile: rRoh.teile.map((t) => teilEn(t, rRoh.regel.reduktionPct)),
            hinweise: rRoh.hinweise.map(hinweisEn),
            regel: { ...rRoh.regel, text: regelTextEn(rRoh.regel), quelle: quelleEn(rRoh.regel.quelle) },
          }
        : rRoh,
    [rRoh, en]
  );
  const modellLabel = (id) => (en ? MODELLE_EN[id]?.label : null) ?? RECHNER_MODELLE[id].label;
  const verbraucht = e.rolle !== "erzeuger";
  const erzeugt = e.rolle !== "verbraucher";
  const vorstand = perspektive === "vorstand";
  const Ueberschrift = (ueberschriftEbene ?? (vorstand ? 3 : 2)) === 3 ? "h3" : "h2";
  const ids = useId();
  const teileId = `${ids}-teile`;

  // Preise: mobil eingeklappt (Ergebnis rückt nach oben), ab lg offen
  const [preiseOffen, setPreiseOffen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const t = setTimeout(() => {
      if (window.matchMedia("(min-width: 1024px)").matches) setPreiseOffen(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const preiseAngepasst = PREIS_FELDER.some((k) => e[k] !== RECHNER_STANDARD[k]);

  // Live-Ansage entprellt und deutsch formatiert; beim Laden still
  const regelJahr = e.jahr === 2027 ? w.ab2027 : "2026";
  const ansage = w.ansage(r.nettoEur < 0, euro(Math.abs(r.nettoEur)), vorstand, verbraucht ? fmt(r.quotePct) : null, modellLabel(e.modell), regelJahr);
  const [live, setLive] = useState("");
  const startAnsage = useRef(ansage);
  useEffect(() => {
    if (startAnsage.current === ansage) return undefined;
    startAnsage.current = null;
    const t = setTimeout(() => setLive(ansage), 700);
    return () => clearTimeout(t);
  }, [ansage]);

  const gesichert = r.regel.status === "gesichert";
  // Deckung: lange Zusatzzeilen („Erzeugung ≈ 70 % des Verbrauchs“) als kurze Prozentangabe, Erklärung darunter
  const deckungOptionen = en
    ? optEn(RECHNER_DECKUNG, true, DECKUNG_EN)
    : opt(RECHNER_DECKUNG).map((o) => ({ ...o, sub: o.sub?.replace(/^Erzeugung\s*/, "").replace(/\s*des Verbrauchs$/, "") }));

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz werte={[[w.mobilVorteil, euro(r.nettoEur)], [w.mobilAus, `${fmt(r.quotePct)} %`], ["CO₂", `${fmt(r.co2Kg)} kg`]]} />
          <Ueberschrift className="sr-only">{vorstand ? w.angabenV : w.angaben}</Ueberschrift>
          <div className="space-y-9">
            <Gruppe titel={<Schritt n={1}>{vorstand ? w.beispielmitglied : w.sie}</Schritt>}>
              <RolleWahl wert={e.rolle} onChange={set("rolle")} />
              {verbraucht && <Auswahl legende={w.verbrauch} wert={e.profil} onChange={set("profil")} optionen={optEn(RECHNER_PROFILE, en, PROFILE_EN)} spalten={2} klein />}
              {verbraucht && <Regler label={w.jahresverbrauch} wert={e.verbrauchKwh} min={500} max={60000} step={100} format={(v) => `${fmt(v)} kWh`} onChange={set("verbrauchKwh")} hinweis={vorstand ? w.hinweisV : w.hinweisSie} />}
              {erzeugt && <Regler label={w.pv} wert={e.kwp} min={1} max={500} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} kWp`} onChange={set("kwp")} hinweis={w.erzeugungJahr(fmt(r.erzeugungKwh))} />}
              {erzeugt && <Regler label={w.eigenverbrauch} wert={e.eigenverbrauchPct} min={0} max={90} step={5} format={(v) => `${fmt(v)} %`} onChange={set("eigenverbrauchPct")} />}
            </Gruppe>
            <Gruppe titel={<Schritt n={2}>{w.gemeinschaft}</Schritt>}>
              <Auswahl legende={w.modell} wert={e.modell} onChange={set("modell")} optionen={optEn(RECHNER_MODELLE, en, MODELLE_EN)} spalten={2} klein />
              <div>
                <Auswahl legende={w.erzeugungGem} wert={e.deckung} onChange={set("deckung")} optionen={deckungOptionen} klein />
                <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{w.verhaeltnis}</p>
              </div>
              <Auswahl legende={w.regeln} wert={String(e.jahr)} onChange={(v) => set("jahr")(Number(v))} optionen={[{ id: "2026", label: "2026", sub: "SNE-V 2018" }, { id: "2027", label: w.ab2027, sub: w.hypothese }]} klein />
            </Gruppe>
            <div className="space-y-5">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-500"><Schritt n={3}>{w.preise}</Schritt></p>
              <details className="group rounded-2xl bg-white shadow-e1 ring-1 ring-ink-200/70" open={preiseOffen} onToggle={(ev) => setPreiseOffen(ev.currentTarget.open)}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink-800">
                      {w.preiseNetto}
                      {preiseAngepasst && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-50 px-2 py-0.5 text-[11px] font-semibold text-ov-800 ring-1 ring-ov-200">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
                          {w.angepasst}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">{w.vorbelegt}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors group-hover:bg-ink-200">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 ease-ov-out group-open:rotate-180 motion-reduce:transition-none" />
                  </span>
                </summary>
                <Gruppe className="border-t border-ink-100 px-4 pb-5 pt-5">
                  {verbraucht && <Regler label={w.lieferant} wert={e.lieferantCt} min={5} max={30} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("lieferantCt")} hinweis={w.lieferantH} />}
                  {verbraucht && <Regler label={w.gemPreis} wert={e.gemeinschaftCt} min={3} max={25} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("gemeinschaftCt")} hinweis={w.gemPreisH} />}
                  {verbraucht && <Regler label={w.netzAp} wert={e.netzApCt} min={2} max={12} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("netzApCt")} hinweis={w.netzApH} />}
                  {erzeugt && <Regler label={w.einspeise} wert={e.einspeiseEgCt} min={2} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("einspeiseEgCt")} />}
                  {erzeugt && <Regler label={w.markt} wert={e.marktCt} min={0} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("marktCt")} />}
                  <Regler label={w.gebuehren} wert={e.gebuehrenJahr} min={0} max={150} step={5} format={(v) => w.eurJahr(fmt(v))} onChange={set("gebuehrenJahr")} />
                </Gruppe>
              </details>
            </div>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{live}</p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Ueberschrift className="font-display text-[22px] font-extrabold tracking-tight text-ink-900 md:text-[26px]">{vorstand ? w.ergebnisV : w.ergebnis}</Ueberschrift>
            <span className="inline-flex items-center gap-2 rounded-full bg-ov-50 px-3 py-1 text-[12.5px] font-semibold text-ov-800 ring-1 ring-ov-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              {modellLabel(e.modell)} · {regelJahr}
            </span>
          </div>

          {/* Die eine laute Zahl, mit Anteil-Ring und Einordnung */}
          <div className="ov-verlauf-nacht relative mt-5 overflow-hidden rounded-3xl p-5 text-white shadow-e4 ring-1 ring-white/10 sm:p-6 md:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ov-500/20 blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[13px] font-medium text-white/75">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-ov-300"><PiggyBank className="h-4 w-4" /></span>
                  {vorstand ? w.vorteilJahrV : w.vorteilJahr}
                </p>
                <p className={cn("ov-kpi-xl mt-3", r.nettoEur < 0 ? "text-danger-200" : "text-white")}>
                  <Zahl wert={r.nettoEur} prefix={en ? "€" : ""} suffix={en ? "" : " €"} delta="dunkel" deltaFormat={(d) => w.eur(fmt(Math.round(d)))} />
                </p>
                <p className="mt-2 text-[13.5px] leading-snug text-white/75">{w.nach(w.eur(fmt(r.gebuehrenEur)))}</p>
              </div>
              {verbraucht && (
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 pr-4 ring-1 ring-white/10">
                  <FortschrittsRing wert={Math.round(r.quotePct)} groesse={64} staerke={6} ton="hell" dunkel sofort label={w.ringLabel(fmt(r.quotePct))} className="text-[13px] font-bold text-white" />
                  <p className="max-w-[9rem] text-[12.5px] leading-snug text-white/75">{vorstand ? w.ringTextV : w.ringText}</p>
                </div>
              )}
            </div>
            <div className="relative">
              <Einordnung netto={r.nettoEur} />
            </div>
          </div>

          <Belege spalten={3}>
            {verbraucht ? (
              <Kennzahl ton="akzent" icon={Users} label={w.ausGem} zusatz={w.desVerbrauchs(fmt(r.quotePct))}><Zahl wert={r.bezugKwh} suffix=" kWh" /></Kennzahl>
            ) : (
              <Kennzahl ton="akzent" icon={Sun} label={w.inGem} zusatz={w.eingebracht}><Zahl wert={r.eingebrachtKwh} suffix=" kWh" /></Kennzahl>
            )}
            <Kennzahl icon={Zap} label={w.jeKwh} zusatz={w.jeKwhZ}>{verbraucht ? `${fmt(r.vorteilJeKwhCt, 2)} ct` : "–"}</Kennzahl>
            <Kennzahl icon={Leaf} label={w.co2} zusatz={w.co2Z} className="col-span-2 xl:col-span-1"><Zahl wert={r.co2Kg} suffix=" kg" /></Kennzahl>
          </Belege>

          <Zusammensetzung r={r} vorstand={vorstand} teileId={teileId} />

          <div className="mt-4 space-y-2.5">
            <Hinweis ton={gesichert ? "neutral" : "warnung"} icon={gesichert ? Info : AlertTriangle}>
              {!gesichert && <strong className="font-semibold">{w.nichtGesichert}</strong>}
              {w.netzentgelt}{r.regel.text}{r.regel.abgabenBefreit ? w.abgabe : ""}. {w.quelle}{r.regel.quelle}.
            </Hinweis>
            {r.hinweise.map((h) => (
              <Hinweis key={h.id} ton={h.id === "negativ" ? "warnung" : "neutral"} icon={h.id === "negativ" ? AlertTriangle : Info}>
                {h.id === "negativ" && <strong className="font-semibold">{w.achtung}</strong>}
                {h.text}
              </Hinweis>
            ))}
          </div>

          {/* Nächster Schritt: Haupt-Button zuerst, mobil volle Breite (Daumenzone) */}
          <div className="mt-6 rounded-3xl bg-sand-50 p-4 ring-1 ring-sand-200 sm:p-5 md:p-6">
            <p className="text-[13px] leading-relaxed text-ink-600">{w.fuss(vorstand)}</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button href={ctaHref} size="lg" pfeil className="w-full justify-center px-5! sm:w-auto sm:px-8!">{ctaLabel}</Button>
              {zweitCta?.href && zweitCta?.label && <Button href={zweitCta.href} size="lg" variant="secondary" className="w-full justify-center px-5! sm:w-auto sm:px-8!">{zweitCta.label}</Button>}
            </div>
            {ctaHinweis && <p className="mt-3 text-[12.5px] text-ink-500">{ctaHinweis}</p>}
          </div>
        </>
      }
    />
  );
}

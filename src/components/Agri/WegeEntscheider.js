"use client";

import { useMemo, useState } from "react";
import Link from "@/components/Land/Link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { wegeFuer } from "./wege";
import { pfad } from "@/lib/land";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/**
 * „Welcher Weg passt?“ – fünf Fragen, Punkte je Weg, Empfehlung mit Begründung.
 * Jede Antwort vergibt Punkte an die Wege (pacht | eigen | investor | genossenschaft)
 * und liefert je Weg einen Begründungssatz.
 */
const FRAGEN = [
  {
    id: "flaeche",
    frage: "Wie wichtig ist es Ihnen, die Fläche selbst weiter zu bewirtschaften?",
    antworten: [
      { id: "egal", label: "Nicht so wichtig", sub: "Fläche darf ganz in den Solarpark", p: { pacht: 3, investor: 0, genossenschaft: 0, eigen: 0 }, g: { pacht: "Sie müssen die Fläche nicht selbst nutzen – ein klassischer Solarpark bringt je Hektar die höchste Pacht." } },
      { id: "wichtig", label: "Wichtig", sub: "Ackerbau oder Grünland soll weiterlaufen", p: { pacht: 0, investor: 2, genossenschaft: 2, eigen: 1 }, g: { investor: "Mit Agri-PV bleibt die Fläche zum größten Teil in Ihrer Bewirtschaftung.", genossenschaft: "Mit Agri-PV bleibt die Fläche zum größten Teil in Ihrer Bewirtschaftung." } },
      { id: "sehr", label: "Sehr wichtig", sub: "Die Landwirtschaft hat Vorrang", p: { pacht: -2, investor: 3, genossenschaft: 2, eigen: 2 }, g: { investor: "Agri-PV nach DIN SPEC 91434 stellt die Landwirtschaft in den Vordergrund – Sie ernten weiter.", eigen: "Als Eigentümer der Anlage bestimmen Sie Reihenabstände und Bewirtschaftung selbst mit." } },
    ],
  },
  {
    id: "kapital",
    frage: "Möchten oder können Sie eigenes Kapital einsetzen?",
    antworten: [
      { id: "nein", label: "Nein", sub: "Kein Kapital binden", p: { pacht: 2, investor: 2, genossenschaft: 0, eigen: -4 }, g: { pacht: "Sie investieren nichts – der Betreiber trägt Kosten und Risiko.", investor: "Sie investieren nichts und behalten trotzdem Ihre Ernte." } },
      { id: "etwas", label: "Einen Teil", sub: "Z. B. Anteile im fünf- bis sechsstelligen Bereich", p: { pacht: 0, investor: 1, genossenschaft: 3, eigen: 0 }, g: { genossenschaft: "Über Anteile an der Genossenschaft beteiligen Sie sich in der Höhe, die zu Ihnen passt." } },
      { id: "ja", label: "Ja, auch größer", sub: "Mit Bankfinanzierung", p: { pacht: -1, investor: 0, genossenschaft: 1, eigen: 4 }, g: { eigen: "Sie haben die Kapitalbasis, um die Wertschöpfung der Anlage selbst zu halten." } },
    ],
  },
  {
    id: "risiko",
    frage: "Wie viel Risiko passt zu Ihrem Betrieb?",
    antworten: [
      { id: "sicher", label: "Sicher & planbar", sub: "Feste Einnahmen zählen", p: { pacht: 2, investor: 2, genossenschaft: 0, eigen: -1 }, g: { pacht: "Eine feste oder indexierte Pacht ist das planbarste Einkommen über 30 Jahre.", investor: "Die Pacht ist fest vereinbart – Strompreis- und Technikrisiko trägt der Investor." } },
      { id: "mittel", label: "Ausgewogen", sub: "Etwas Risiko für mehr Ertrag", p: { pacht: 0, investor: 1, genossenschaft: 2, eigen: 0 }, g: { genossenschaft: "Feste Pacht plus Ausschüttung – das Risiko teilen Sie mit den anderen Mitgliedern." } },
      { id: "rendite", label: "Rendite zählt", sub: "Unternehmerisch denken", p: { pacht: -1, investor: 0, genossenschaft: 1, eigen: 3 }, g: { eigen: "Als Eigentümer erhalten Sie die gesamten Stromerlöse – mit Chancen und Risiken." } },
    ],
  },
  {
    id: "zeit",
    frage: "Wie viel Zeit möchten Sie in das Thema Energie stecken?",
    antworten: [
      { id: "wenig", label: "Möglichst wenig", sub: "Der Hof ist genug Arbeit", p: { pacht: 2, investor: 2, genossenschaft: 1, eigen: -2 }, g: { pacht: "Nach der Unterschrift läuft alles ohne Ihr Zutun.", investor: "Technik, Betrieb und Vermarktung liegen komplett beim Investor." } },
      { id: "etwas", label: "Etwas", sub: "Mitreden, aber nicht alles selbst", p: { pacht: 0, investor: 1, genossenschaft: 2, eigen: 1 }, g: { genossenschaft: "In der Genossenschaft reden Sie mit – die Arbeit machen Vorstand und Betriebsführung." } },
      { id: "viel", label: "Gern mehr", sub: "Energie als zweites Standbein", p: { pacht: -1, investor: 0, genossenschaft: 1, eigen: 3 }, g: { eigen: "Sie möchten Energie als eigenes Standbein aufbauen – wir nehmen Ihnen Technik und Vermarktung ab." } },
    ],
  },
  {
    id: "ziel",
    frage: "Was ist Ihr wichtigstes Ziel?",
    antworten: [
      { id: "einkommen", label: "Zusatzeinkommen", sub: "Unabhängig von Ernte und Preisen", p: { pacht: 2, investor: 2, genossenschaft: 1, eigen: 0 }, g: { pacht: "Die Pacht ist wetter- und marktunabhängig – ein stabiles zweites Standbein.", investor: "Pacht und Ernte zusammen streuen Ihr Risiko." } },
      { id: "eigenstrom", label: "Eigenstrom für den Hof", sub: "Stall, Kühlung, Trocknung", p: { pacht: 0, investor: 0, genossenschaft: 1, eigen: 3 }, g: { eigen: "Mit eigener Anlage können Sie Strom für Stall, Kühlung oder Trocknung selbst nutzen – je nach Anschlusskonzept." } },
      { id: "vermoegen", label: "Vermögen & Hofnachfolge", sub: "Werte für die nächste Generation", p: { pacht: 0, investor: 1, genossenschaft: 2, eigen: 2 }, g: { eigen: "Eine eigene Anlage ist ein Vermögenswert, der an die nächste Generation übergeht.", genossenschaft: "Genossenschaftsanteile lassen sich übertragen – und die Landwirtschaft bleibt erhalten." } },
      { id: "region", label: "Region & Gemeinschaft", sub: "Nachbarn und Gemeinde beteiligen", p: { pacht: 0, investor: 0, genossenschaft: 4, eigen: 0 }, g: { genossenschaft: "In einer Genossenschaft profitieren Nachbarn und Gemeinde mit – das stärkt auch die Akzeptanz." } },
    ],
  },
];

/** Englisch (Sprachmodell): nur Texte, gleiche Reihenfolge wie FRAGEN (Punkte und ids aus FRAGEN). */
const FRAGEN_EN = [
  {
    frage: "How important is it to you to keep farming the land yourself?",
    antworten: [
      { label: "Not so important", sub: "The whole site can go into the solar park", g: { pacht: "You do not need to use the land yourself – a conventional solar park brings the highest lease per hectare." } },
      { label: "Important", sub: "Arable farming or grassland should continue", g: { investor: "With agrivoltaics, most of the land stays in your hands for farming.", genossenschaft: "With agrivoltaics, most of the land stays in your hands for farming." } },
      { label: "Very important", sub: "Farming takes priority", g: { investor: "Agrivoltaics under DIN SPEC 91434 puts farming first – you keep harvesting.", eigen: "As owner of the installation, you have a say in row spacing and farming." } },
    ],
  },
  {
    frage: "Do you want to, or can you, invest your own capital?",
    antworten: [
      { label: "No", sub: "Do not tie up capital", g: { pacht: "You invest nothing – the operator bears the costs and the risk.", investor: "You invest nothing and still keep your harvest." } },
      { label: "Some of it", sub: "E.g. shares in the five- to six-figure range", g: { genossenschaft: "Through shares in the cooperative, you participate to the extent that suits you." } },
      { label: "Yes, larger amounts too", sub: "With bank financing", g: { eigen: "You have the capital base to keep the installation’s added value yourself." } },
    ],
  },
  {
    frage: "How much risk suits your farm?",
    antworten: [
      { label: "Safe & predictable", sub: "Fixed income matters", g: { pacht: "A fixed or indexed lease is the most predictable income over 30 years.", investor: "The lease is fixed by contract – the investor bears the power price and technology risk." } },
      { label: "Balanced", sub: "Some risk for a higher return", g: { genossenschaft: "Fixed lease plus distribution – you share the risk with the other members." } },
      { label: "Returns matter", sub: "Thinking like an entrepreneur", g: { eigen: "As owner, you receive all the power revenue – with opportunities and risks." } },
    ],
  },
  {
    frage: "How much time do you want to spend on energy?",
    antworten: [
      { label: "As little as possible", sub: "The farm is enough work", g: { pacht: "After signing, everything runs without your involvement.", investor: "Technology, operation and marketing lie entirely with the investor." } },
      { label: "Some", sub: "Have a say, but not do everything yourself", g: { genossenschaft: "In the cooperative you have a say – the board and operational management do the work." } },
      { label: "Happy to do more", sub: "Energy as a second pillar", g: { eigen: "You want to build energy into a business of its own – we take care of the technology and marketing for you." } },
    ],
  },
  {
    frage: "What is your most important goal?",
    antworten: [
      { label: "Additional income", sub: "Independent of harvests and prices", g: { pacht: "The lease does not depend on weather or markets – a stable second pillar.", investor: "Lease and harvest together spread your risk." } },
      { label: "Own power for the farm", sub: "Barn, cooling, drying", g: { eigen: "With your own installation, you can use power for the barn, cooling or drying yourself – depending on the connection concept." } },
      { label: "Assets & farm succession", sub: "Value for the next generation", g: { eigen: "Your own installation is an asset that passes to the next generation.", genossenschaft: "Cooperative shares can be transferred – and farming continues." } },
      { label: "Region & community", sub: "Involve neighbours and the municipality", g: { genossenschaft: "In a cooperative, neighbours and the municipality benefit too – which also strengthens acceptance." } },
    ],
  },
];

/** Feste Texte der Entscheidungshilfe. */
const W = {
  de: {
    empfehlung: "Ihre Empfehlung",
    frageVon: (n, m) => `Frage ${n} von ${m}`,
    fortschritt: "Fortschritt",
    zurueck: "Zurück",
    passt: "Am besten passt",
    weg: (b, t) => `Weg ${b}: ${t}`,
    knappA: "Knapp dahinter: ",
    knappB: (b, t) => `Weg ${b} – ${t}`,
    knappC: ". Beide Wege lassen sich oft auch kombinieren, etwa Pacht für einen Teil und Beteiligung für den Rest.",
    mehr: (b) => `Mehr zu Weg ${b}`,
    durchrechnen: "Wege durchrechnen",
    gemeinsam: "Lieber gleich gemeinsam prüfen?",
    anfrage: (b) => `Anfrage zu Weg ${b} stellen`,
    persoenlich: "– wir melden uns persönlich.",
    abgleich: "Alle Wege im Abgleich mit Ihren Antworten",
    orientierung: "Eine Orientierung, keine Beratung. Welcher Weg wirtschaftlich passt, hängt von Fläche, Netz und Betrieb ab – das rechnen wir gern gemeinsam durch.",
    neu: "Neu starten",
  },
  en: {
    empfehlung: "Your recommendation",
    frageVon: (n, m) => `Question ${n} of ${m}`,
    fortschritt: "Progress",
    zurueck: "Back",
    passt: "Best match",
    weg: (b, t) => `Route ${b}: ${t}`,
    knappA: "Close behind: ",
    knappB: (b, t) => `Route ${b} – ${t}`,
    knappC: ". The two routes can often be combined, for example a lease for one part and participation for the rest.",
    mehr: (b) => `More about route ${b}`,
    durchrechnen: "Calculate the routes",
    gemeinsam: "Prefer to look at it together straight away?",
    anfrage: (b) => `Send an enquiry about route ${b}`,
    persoenlich: "– we will get back to you personally.",
    abgleich: "All routes compared with your answers",
    orientierung: "For guidance only, not advice. Which route makes economic sense depends on the land, the grid and the farm – we are happy to work it out with you.",
    neu: "Start again",
  },
};

export default function WegeEntscheider() {
  const sprache = useSprache();
  const WEGE = wegeFuer(sprache);
  const FRAGEN_S = useMemo(() => uebersetze({ de: FRAGEN, en: FRAGEN_EN }, sprache), [sprache]);
  const w = uebersetze(W, sprache);
  const [antworten, setAntworten] = useState({});
  const [schritt, setSchritt] = useState(0);
  const [richtung, setRichtung] = useState("vor");
  const fertig = schritt >= FRAGEN.length;

  const ergebnis = useMemo(() => {
    if (!fertig) return null;
    const punkte = Object.fromEntries(WEGE.map((x) => [x.id, 0]));
    const gruende = Object.fromEntries(WEGE.map((x) => [x.id, []]));
    for (const f of FRAGEN_S) {
      const a = f.antworten.find((x) => x.id === antworten[f.id]);
      if (!a) continue;
      for (const [w, p] of Object.entries(a.p)) punkte[w] += p;
      for (const [w, g] of Object.entries(a.g || {})) gruende[w].push(g);
    }
    const max = Math.max(...Object.values(punkte));
    const min = Math.min(...Object.values(punkte));
    const liste = WEGE.map((x) => ({ ...x, punkte: punkte[x.id], anteil: max === min ? 1 : (punkte[x.id] - min) / (max - min), gruende: gruende[x.id] })).sort((a, b) => b.punkte - a.punkte);
    return liste;
  }, [fertig, antworten, FRAGEN_S, WEGE]);

  function waehle(fid, aid) {
    setAntworten((alt) => ({ ...alt, [fid]: aid }));
    setRichtung("vor");
    setTimeout(() => setSchritt((s) => Math.min(s + 1, FRAGEN.length)), 180);
  }

  function zurueck() {
    setRichtung("zurueck");
    setSchritt((s) => Math.max(0, s - 1));
  }

  function neu() {
    setAntworten({});
    setRichtung("zurueck");
    setSchritt(0);
  }

  const f = FRAGEN_S[schritt];

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-50px_rgba(3,18,43,0.55)] ring-1 ring-ink-200/70">
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-sand-50/70 px-5 py-4 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {fertig ? w.empfehlung : w.frageVon(schritt + 1, FRAGEN.length)}
        </p>
        <div className="flex h-2 w-32 overflow-hidden rounded-full bg-ink-100 sm:w-48" role="progressbar" aria-valuemin={0} aria-valuemax={FRAGEN.length} aria-valuenow={Math.min(schritt, FRAGEN.length)} aria-label={w.fortschritt}>
          <div className="ov-fortschritt h-full w-full rounded-full bg-ov-500" style={{ transform: `scaleX(${Math.min(schritt, FRAGEN.length) / FRAGEN.length})` }} />
        </div>
      </div>

      <div className="p-5 sm:p-8 md:p-10">
        <div key={schritt} className={richtung === "vor" ? "ov-step-vor" : "ov-step-zurueck"}>
          {!fertig && (
            <fieldset>
              <legend className="font-display text-[clamp(1.3rem,1.05rem+0.9vw,1.75rem)] font-extrabold leading-snug tracking-tight text-ink-900">{f.frage}</legend>
              <div className={cn("mt-6 grid gap-3", f.antworten.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
                {f.antworten.map((a) => {
                  const an = antworten[f.id] === a.id;
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        "ov-press relative flex cursor-pointer flex-col rounded-3xl p-5 pr-12 transition-[background-color,box-shadow,transform] focus-within:ring-2 focus-within:ring-ov-500",
                        an ? "bg-ov-50 ring-2 ring-ov-500" : "bg-sand-50 ring-1 ring-ink-200 hover:bg-white hover:ring-ink-300"
                      )}
                    >
                      <input type="radio" name={f.id} value={a.id} checked={an} onChange={() => waehle(f.id, a.id)} className="sr-only" />
                      <span className="font-display text-[17px] font-bold text-ink-900">{a.label}</span>
                      <span className="mt-1 text-[14px] leading-snug text-ink-500">{a.sub}</span>
                      <span aria-hidden="true" className={cn("absolute right-4 top-5 flex h-6 w-6 items-center justify-center rounded-full", an ? "ov-erfolg bg-ov-500 text-white" : "bg-white ring-1 ring-ink-300")}>
                        {an && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
              {schritt > 0 && (
                <button type="button" onClick={zurueck} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 hover:bg-ink-100">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {w.zurueck}
                </button>
              )}
            </fieldset>
          )}

          {fertig && ergebnis && <Empfehlung liste={ergebnis} onNeu={neu} onZurueck={zurueck} w={w} />}
        </div>
      </div>
    </div>
  );
}

function Empfehlung({ liste, onNeu, onZurueck, w }) {
  const [erster, ...rest] = liste;
  const zweiter = rest[0];
  const knapp = zweiter && erster.punkte - zweiter.punkte <= 1;
  const Icon = erster.icon;
  return (
    <div aria-live="polite">
      <div className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[90px]" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">
            <Sparkles aria-hidden="true" className="h-4 w-4" /> {w.passt}
          </p>
          <div className="mt-4 flex items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ov-500 text-white sm:flex">
              <Icon aria-hidden="true" className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[clamp(1.4rem,1.1rem+1.2vw,2rem)] font-extrabold leading-tight tracking-tight">
                {w.weg(erster.buchstabe, erster.titel)}
              </h3>
              <p className="mt-1 text-[15.5px] text-white/70">{erster.kurz}</p>
            </div>
          </div>
          {erster.gruende.length > 0 && (
            <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
              {erster.gruende.map((g) => (
                <li key={g} className="flex gap-2.5 text-[15px] leading-relaxed text-white/85">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300" strokeWidth={3} />
                  {g}
                </li>
              ))}
            </ul>
          )}
          {knapp && (
            <p className="mt-5 rounded-2xl bg-white/[0.07] px-4 py-3 text-[14px] leading-relaxed text-white/75 ring-1 ring-white/10">
              {w.knappA}<strong className="text-white">{w.knappB(zweiter.buchstabe, zweiter.titel)}</strong>{w.knappC}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={erster.href} className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950">
              {w.mehr(erster.buchstabe)}
              <ArrowRight aria-hidden="true" className="ov-pfeil h-4 w-4" />
            </Link>
            <Link href={pfad("/rechner/agri-pv")} className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/35 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
              {w.durchrechnen}
            </Link>
          </div>
          <p className="mt-5 text-[14px] text-white/70">
            {w.gemeinsam}{" "}
            <a href="#anfrage" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
              {w.anfrage(erster.buchstabe)}
            </a>{" "}
            {w.persoenlich}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">{w.abgleich}</p>
        <ul className="ov-sofort mt-3 space-y-2.5" style={{ "--ov-delay": "250ms" }}>
          {liste.map((x, i) => (
            <li key={x.id} className="grid grid-cols-[2rem_1fr] items-center gap-3 sm:grid-cols-[2rem_minmax(0,16rem)_1fr]">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full font-display text-[13px] font-extrabold", x.id === erster.id ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-600")}>{x.buchstabe}</span>
              <span className="text-[14.5px] font-semibold text-ink-800">{x.titel}</span>
              <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-ink-100 sm:col-span-1">
                <span className={cn("ov-balken-x block h-full rounded-full", x.id === erster.id ? "bg-ov-500" : "bg-ov-200")} style={{ width: `${Math.max(6, x.anteil * 100)}%`, "--i": i * 3 }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
        <p className="max-w-xl text-[13px] leading-relaxed text-ink-500">{w.orientierung}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onZurueck} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 hover:bg-ink-100">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {w.zurueck}
          </button>
          <button type="button" onClick={onNeu} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50">
            <RotateCcw aria-hidden="true" className="h-4 w-4" /> {w.neu}
          </button>
        </div>
      </div>
    </div>
  );
}


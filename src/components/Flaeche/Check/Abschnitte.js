// Abschnitte der Seite /flaechencheck: Hero mit Ergebnis-Vorschau und „So bewerten wir“ als Punkteskala
import { ArrowDown, ArrowUp, Banknote, ClipboardCheck, Gauge, Sun, TrafficCone } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import { TextEnthuellung } from "@/components/motion";
import { HeroBuehne, HeroPille, Haken } from "@/components/Flaeche/Seite/teile";
import { LAENDER, einstiegPfad, pfad } from "@/lib/land";
import { spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

/** Sprachmodell: Texte der Abschnitte (en nur Texte, Listen je Index). */
const W = {
  de: {
    start: "Start 50",
    skalaSr: "Skala von 0 bis 100 Punkten: unter 40 rot, ab 40 gelb, ab 65 grün; jede Fläche startet bei 50 Punkten.",
    ergebnis: [
      { t: "Ampel mit Begründung", x: "jeder Punkt nachvollziehbar" },
      { t: "Mögliche Leistung", x: "in kWp bzw. MWp" },
      { t: "Stromertrag", x: "für Ihre Region" },
      { t: "Pachtspanne", x: "realistisch, je Hektar und Jahr" },
      { t: "Persönliche Prüfung", x: "auf Wunsch im Anschluss" },
    ],
    krumenRechner: "Rechner & Tools",
    krumenCheck: "Flächencheck",
    landName: (land) => LAENDER[land].name,
    pilleDe: "Flächencheck für Solarpark und Agri-PV · DE · AT · CH",
    pilleLand: (land) => `Flächencheck für Freiflächen-PV und Agri-PV ${LAENDER[land].inLand}`,
    titelA: "Hat Ihre Fläche das Zeug ",
    titelB: "zum Solarpark?",
    leadDe: "Vier kurze Schritte: Lage, Größe, Besonderheiten, Netz. Sie erhalten eine Ampel mit Begründung, die mögliche Leistung, den Stromertrag und eine realistische Pachtspanne.",
    leadLand: "Vier kurze Schritte: Lage, Größe, Besonderheiten, Netz. Sie erhalten eine Ampel mit Begründung, die mögliche Leistung und den Stromertrag. Pachtwerte zeigt der Check für dieses Land noch nicht – sie folgen nach fachlicher Prüfung.",
    chips: ["Kostenlos & ohne Anmeldung", "Ergebnis sofort", "Mit Agri-PV-Option"],
    zumCheck: "Zum Flächencheck",
    ihrErgebnis: "Ihr Ergebnis",
    skala: "Punkteskala der Ampel",
    marke: "2 Min.",
    eyebrow: "So bewerten wir",
    titel: "Eine offene Punkteliste statt einer Blackbox.",
    lead: "Jede Fläche startet bei 50 Punkten. Größe, Nutzung, Besonderheiten, Netzkosten je kWp und Eigentumsverhältnisse schieben den Wert nach oben oder unten – jeder Punkt wird im Ergebnis begründet.",
    rot: "rot unter 40",
    gelb: "gelb ab 40",
    gruen: "grün ab 65",
    plus: "Plus: ",
    minus: "Minus: ",
  },
  en: {
    start: "Start 50",
    skalaSr: "Scale from 0 to 100 points: below 40 red, from 40 yellow, from 65 green; every site starts at 50 points.",
    ergebnis: [
      { t: "Traffic light with reasons", x: "every point traceable" },
      { t: "Possible capacity", x: "in kWp or MWp" },
      { t: "Power yield", x: "for your region" },
      { t: "Lease range", x: "realistic, per hectare per year" },
      { t: "Personal assessment", x: "afterwards, if you wish" },
    ],
    krumenRechner: "Calculators & tools",
    krumenCheck: "Land check",
    landName: (land) => LAENDER[land].en.name,
    pilleDe: "Land check for solar parks and agrivoltaics · DE · AT · CH",
    pilleLand: (land) => `Land check for ground-mounted PV and agrivoltaics ${LAENDER[land].en.inLand}`,
    titelA: "Does your land have what it takes ",
    titelB: "to become a solar park?",
    leadDe: "Four short steps: location, size, special features, grid. You receive a traffic light with reasons, the possible capacity, the power yield and a realistic lease range.",
    leadLand: "Four short steps: location, size, special features, grid. You receive a traffic light with reasons, the possible capacity and the power yield. The check does not yet show lease rates for this country – they will follow after a specialist review.",
    chips: ["Free of charge & no registration", "Instant result", "With agrivoltaics option"],
    zumCheck: "To the land check",
    ihrErgebnis: "Your result",
    skala: "Points scale of the traffic light",
    marke: "2 min",
    faktoren: [
      { t: "Size", x: "Economical from around 3 ha, 10–100 ha ideal.", hoch: "large, compact site", runter: "very small site" },
      { t: "Use", x: "Conversion sites and roadside strips at the top, protected areas almost always ruled out.", hoch: "conversion, roadside strip", runter: "protected area" },
      { t: "Grid", x: "Cable route and transfer station per kWp – small parks are more sensitive.", hoch: "short cable route", runter: "long route, small park" },
      { t: "Ownership", x: "Sole ownership is fastest; communities of owners need every signature.", hoch: "sole ownership", runter: "many parties" },
    ],
    eyebrow: "How we assess",
    titel: "An open points list instead of a black box.",
    lead: "Every site starts at 50 points. Size, use, special features, grid costs per kWp and ownership push the score up or down – every point is explained in the result.",
    rot: "red below 40",
    gelb: "yellow from 40",
    gruen: "green from 65",
    plus: "Plus: ",
    minus: "Minus: ",
  },
};

/** Skala 0–100 mit den Ampelgrenzen des Checks (gelb ab 40, grün ab 65) und dem Startwert 50 */
export function Punkteskala({ dunkel = false, className }) {
  const w = uebersetze(W, spracheDerAnfrage());
  return chBaum(
    <div className={className}>
      <div className="relative">
        <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full">
          <span className="bg-ink-300" style={{ width: "40%" }} />
          <span className="bg-sun-400" style={{ width: "25%" }} />
          <span className="bg-ov-500" style={{ width: "35%" }} />
        </div>
        {/* Startmarke */}
        <span aria-hidden="true" className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded-full bg-navy-950 ring-2 ring-white" style={{ left: "50%" }} />
      </div>
      <div className={cn("relative mt-2 h-4 text-[11.5px] font-semibold", dunkel ? "text-white/70" : "text-ink-500")}>
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: "40%" }}>40</span>
        <span className={cn("absolute -translate-x-1/2 font-bold", dunkel ? "text-white" : "text-navy-950")} style={{ left: "50%" }}>{w.start}</span>
        <span className="absolute -translate-x-1/2" style={{ left: "65%" }}>65</span>
        <span className="absolute right-0">100</span>
      </div>
      <p className="sr-only">{w.skalaSr}</p>
    </div>
  );
}

const ERGEBNIS = [
  { icon: TrafficCone, t: "Ampel mit Begründung", x: "jeder Punkt nachvollziehbar" },
  { icon: Gauge, t: "Mögliche Leistung", x: "in kWp bzw. MWp" },
  { icon: Sun, t: "Stromertrag", x: "für Ihre Region" },
  { icon: Banknote, t: "Pachtspanne", x: "realistisch, je Hektar und Jahr", nurDe: true },
  // AT/CH: keine Pachtwerte bis zur Freigabe (B1) – stattdessen der nächste Schritt
  { icon: ClipboardCheck, t: "Persönliche Prüfung", x: "auf Wunsch im Anschluss", nichtDe: true },
];

/** land: Land der Route (Welle 2). DE: wie bisher; AT/CH: ohne Pachtspanne (Länder-Sperre, B1). */
export function CheckHero({ land = "DE" }) {
  const w = uebersetze(W, spracheDerAnfrage());
  const de = land === "DE";
  const krumen = de ? [{ name: w.krumenRechner, href: pfad("/rechner") }, { name: w.krumenCheck }] : [{ name: w.landName(land), href: einstiegPfad(land) }, { name: w.krumenCheck }];
  const ergebnis = ERGEBNIS.map((e, i) => ({ ...e, ...w.ergebnis[i] }));
  return chBaum(
    <HeroBuehne breadcrumbs={krumen} unten="pb-28 md:pb-32">
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-y-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-x-16">
        <div className="max-w-[38rem]">
          <HeroPille marke={w.marke}>{de ? w.pilleDe : w.pilleLand(land)}</HeroPille>
          <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
            <TextEnthuellung verzoegerung={80}>
              {w.titelA}<span className="ov-text-gradient-light">{w.titelB}</span>
            </TextEnthuellung>
          </h1>
          <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
            {de ? w.leadDe : w.leadLand}
          </p>
          <ul className="ov-hero-in mt-7 flex flex-wrap gap-2" style={{ "--ov-delay": "260ms" }}>
            {w.chips.map((x) => (
              <li key={x} className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] py-1.5 pl-2 pr-3.5 text-[13.5px] font-medium text-white/90 ring-1 ring-white/15">
                <Haken dunkel className="mt-0" />
                {x}
              </li>
            ))}
            <li>
              <a
                href="#check"
                className="group inline-flex min-h-[34px] items-center gap-2 rounded-full bg-sun-400 py-1.5 pl-3.5 pr-3 text-[13.5px] font-bold text-navy-950 transition-colors hover:bg-sun-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                {w.zumCheck}
                <ArrowDown aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none" />
              </a>
            </li>
          </ul>
        </div>

        {/* Ergebnis-Vorschau: was der Check liefert */}
        <div className="ov-hero-in hidden rounded-[1.6rem] bg-white/[0.05] p-6 ring-1 ring-white/12 backdrop-blur-sm lg:block xl:p-7" style={{ "--ov-delay": "220ms" }}>
          <p className="ov-overline text-ov-300">{w.ihrErgebnis}</p>
          <ul className="mt-5 grid grid-cols-2 gap-3">
            {ergebnis.filter((e) => (de ? !e.nichtDe : !e.nurDe)).map((e) => (
              <li key={e.t} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <e.icon aria-hidden="true" className="h-5 w-5 text-ov-300" />
                <p className="mt-3 font-display text-[15px] font-bold leading-snug text-white">{e.t}</p>
                <p className="mt-0.5 text-[12.5px] text-white/65">{e.x}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="mb-3 text-[13px] font-medium text-white/80">{w.skala}</p>
            <Punkteskala dunkel />
          </div>
        </div>
      </div>
    </HeroBuehne>
  );
}

const FAKTOREN = [
  { t: "Größe", x: "Ab rund 3 ha wirtschaftlich, 10–100 ha ideal.", hoch: "große, kompakte Fläche", runter: "sehr kleine Fläche" },
  { t: "Nutzung", x: "Konversion und Randstreifen vorne, Schutzgebiete fast immer ausgeschlossen.", hoch: "Konversion, Randstreifen", runter: "Schutzgebiet" },
  { t: "Netz", x: "Kabeltrasse und Übergabestation je kWp – kleine Parks reagieren empfindlicher.", hoch: "kurze Trasse", runter: "weite Trasse, kleiner Park" },
  { t: "Eigentum", x: "Alleineigentum ist am schnellsten; Gemeinschaften brauchen alle Unterschriften.", hoch: "Alleineigentum", runter: "viele Beteiligte" },
];

export function SoBewertenWir() {
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const faktoren = sprache === "en" ? FAKTOREN.map((f, i) => ({ ...f, ...W.en.faktoren[i] })) : FAKTOREN;
  return chBaum(
    <div>
      <SectionHeading eyebrow={w.eyebrow} title={w.titel} lead={w.lead} />
      <Reveal className="mt-8 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold">
          <span className="inline-flex items-center gap-2 text-ink-700"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ink-300" />{w.rot}</span>
          <span className="inline-flex items-center gap-2 text-ink-700"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun-400" />{w.gelb}</span>
          <span className="inline-flex items-center gap-2 text-ink-700"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ov-500" />{w.gruen}</span>
        </div>
        <Punkteskala className="mt-4" />
      </Reveal>
      <ul className="mt-6 divide-y divide-ink-100 rounded-3xl bg-white ring-1 ring-ink-200/70">
        {faktoren.map((f, i) => (
          <Reveal as="li" key={i} delay={i * 60} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-6">
            <div className="min-w-0">
              <p className="font-display text-[16.5px] font-bold text-ink-900">{f.t}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{f.x}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-50 px-2.5 py-1 text-[12.5px] font-semibold text-ov-800 ring-1 ring-ov-200">
                <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" /> <span className="sr-only">{w.plus}</span>{f.hoch}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-[12.5px] font-semibold text-ink-700 ring-1 ring-ink-200">
                <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" /> <span className="sr-only">{w.minus}</span>{f.runter}
              </span>
            </div>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

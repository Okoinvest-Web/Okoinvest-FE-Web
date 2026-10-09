// Pachtmodelle + Vergleich mit Ackerpacht – Beispielrechnung über pachtRechnung (keine eigenen Zahlen)
import Link from "@/components/Land/Link";
import { ArrowRight, BadgePercent, CalendarClock, Lock, TrendingUp } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { Zaehler } from "@/components/motion";
import { BEISPIEL_HA } from "@/components/Flaeche/Verpachten/Hero";
import { PACHT, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pachtRechnung } from "@/lib/rechner/pacht";
import { pfad, zahlenModus } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";

// Länderinhalt: Die Beispielrechnung nutzt geprüfte Werte für Deutschland. In AT/CH zeigt der Abschnitt
// die Modelle ohne Euro-Werte und statt des Acker-Vergleichs den LandHinweis (zahlenModus „hinweis“).
// Österreich: Ackerland 364 €/ha, Dauergrünland 257 €/ha – Statistik Austria, Pachtpreise 2024
// (Datenstand 30.01.2026, abgerufen 04.10.2026); VPI-Wertsicherung laut Checkliste LK Oberösterreich.
const TEXTE = {
  gemeinsam: { lead: null, k: {}, x: {}, hinweis: undefined },
  AT: {
    lead: "Drei Pachtmodelle und eine Reservierungsprämie bis Baubeginn. Die Höhe nennen wir Ihnen nach der Prüfung Ihrer Fläche – Ihre eigenen Werte rechnen Sie im Pachtrechner.",
    k: { Festpacht: "€ je Hektar", Indexiert: "VPI-gesichert", Umsatzbeteiligung: "Anteil am Erlös", Reservierungsprämie: "bis Baubeginn" },
    x: {
      Indexiert: "Festpacht, die an den Verbraucherpreisindex (VPI) gekoppelt ist – oder mit fester Staffel steigt.",
      Umsatzbeteiligung: "Anteil an den Stromerlösen – aus EAG-Marktprämie oder Stromliefervertrag –, meist mit Mindestpacht als Untergrenze.",
    },
    hinweis:
      "Pachtwerte für Österreich werden geprüft – Ergebnis auf Anfrage. Zum Vergleich die landwirtschaftliche Pacht im Bundesschnitt 2024: Ackerland 364 €/ha, Dauergrünland 257 €/ha (Statistik Austria).",
  },
};

// Englisch: Übersetzung des AT-Länderinhalts (gleiche Quellen, Schlüssel = deutsche Modellnamen)
const TEXTE_EN = {
  gemeinsam: {},
  AT: {
    lead: "Three lease models and a reservation fee until construction starts. We will tell you the amounts after assessing your land – you can calculate your own figures in the lease calculator.",
    k: { Festpacht: "€ per hectare", Indexiert: "CPI-linked", Umsatzbeteiligung: "Share of revenue", Reservierungsprämie: "until construction" },
    x: {
      Indexiert: "A fixed lease linked to the consumer price index (VPI) – or rising in fixed steps.",
      Umsatzbeteiligung: "A share of the power revenue – from the EAG market premium or a power purchase agreement – usually with a minimum lease as a floor.",
    },
    hinweis:
      "Lease rates for Austria are being reviewed – result on request. For comparison, the national average agricultural lease in 2024: arable land €364/ha, permanent grassland €257/ha (Statistik Austria).",
  },
};

/** Sprachmodell: feste Texte des Abschnitts (en nur Texte). */
const W = {
  de: {
    tsd: (v) => `${fmt(Math.round(v / 1000))} Tsd. €`,
    zahlen: "de-DE",
    modelle: [
      { t: "Festpacht", k: `${fmt(PACHT.freiflaecheProHa.mittel)} €/ha`, x: "Ein fester Betrag je Hektar und Jahr. Maximal planbar, aber ohne Inflationsausgleich." },
      { t: "Indexiert", k: `+${fmt(PACHT.indexierung * 100, 1)} % p. a.`, x: "Festpacht, die an den Verbraucherpreisindex gekoppelt ist – oder mit fester Staffel steigt." },
      { t: "Umsatzbeteiligung", k: `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} %`, x: "Anteil an den Stromerlösen, meist mit Mindestpacht als Untergrenze. Sie profitieren von hohen Strompreisen.", zusatz: "bei 6 %" },
    ],
    nachPruefung: "nach Prüfung",
    balken: ["Solarpacht indexiert", "Solarpacht fest", "Deckungsbeitrag Ackerbau (selbst bewirtschaftet)", "Ackerpacht (Durchschnitt DE)"],
    eyebrow: "Pachtmodelle",
    titel: "Vier Bausteine – Sie entscheiden, was zu Ihnen passt.",
    lead: `Beispielrechnung für ${BEISPIEL_HA} Hektar in Süddeutschland über ${PACHT.laufzeit} Jahre. Jede Säule ist ein Jahr – Ihre eigenen Werte rechnen Sie im Pachtrechner.`,
    link: "Mit eigenen Werten rechnen",
    modell: (n) => `Modell ${n}`,
    jahrKurz: (j) => `J. ${j}`,
    summe: (zusatz) => `Summe ${PACHT.laufzeit} J.${zusatz ? ` (${zusatz})` : ""}`,
    zusaetzlich: "zusätzlich",
    reservierung: "Reservierungsprämie",
    reservierungWert: `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha`,
    reservierungText: "Jährlich ab Unterschrift bis Baubeginn – zusätzlich zur weiterlaufenden Bewirtschaftung.",
    unterschrift: "Unterschrift",
    baubeginn: "Baubeginn → Pacht",
    weiter: "Sie bewirtschaften weiter wie bisher",
    hinweisThema: "Pachtwerte",
    hinweisThemaEn: "Lease rates",
    vergleichKopf: `${BEISPIEL_HA} ha über ${PACHT.laufzeit} Jahre`,
    vergleichText: "bringt schon die Festpacht im Vergleich zur durchschnittlichen Ackerpacht – bei gleicher Fläche.",
    vergleichTitel: "Einnahmen im Vergleich",
    fuss: `Nominal, vor Steuern; Ackerpacht ${fmt(PACHT.ackerProHa)} €/ha und Deckungsbeitrag ${fmt(PACHT.deckungsbeitragAcker.mittel)} €/ha jeweils mit ${fmt(PACHT.indexierung * 100, 1)} % p. a. fortgeschrieben. Stand ${STAND}.`,
  },
  en: {
    tsd: (v) => `€${fmtZahl(Math.round(v / 1000), 0, "en")}k`,
    zahlen: "en-GB",
    modelle: [
      { t: "Fixed lease", k: `€${fmtZahl(PACHT.freiflaecheProHa.mittel, 0, "en")}/ha`, x: "A fixed amount per hectare per year. Maximum predictability, but no inflation adjustment." },
      { t: "Indexed", k: `+${fmtZahl(PACHT.indexierung * 100, 1, "en")} % p.a.`, x: "A fixed lease linked to the consumer price index – or rising in fixed steps." },
      { t: "Revenue share", k: `${fmtZahl(PACHT.umsatzbeteiligung.min * 100, 0, "en")}–${fmtZahl(PACHT.umsatzbeteiligung.max * 100, 0, "en")} %`, x: "A share of the power revenue, usually with a minimum lease as a floor. You benefit from high power prices.", zusatz: "at 6 %" },
    ],
    nachPruefung: "after assessment",
    balken: ["Solar lease, indexed", "Solar lease, fixed", "Contribution margin from arable farming (self-farmed)", "Arable lease (German average)"],
    eyebrow: "Lease models",
    titel: "Four building blocks – you decide what suits you.",
    lead: `Example calculation for ${BEISPIEL_HA} hectares in southern Germany over ${PACHT.laufzeit} years. Each bar is one year – you can calculate your own figures in the lease calculator.`,
    link: "Calculate with your own figures",
    modell: (n) => `Model ${n}`,
    jahrKurz: (j) => `Yr ${j}`,
    summe: (zusatz) => `Total ${PACHT.laufzeit} yrs${zusatz ? ` (${zusatz})` : ""}`,
    zusaetzlich: "in addition",
    reservierung: "Reservation fee",
    reservierungWert: `€${fmtZahl(PACHT.reservierungProHa.min, 0, "en")}–${fmtZahl(PACHT.reservierungProHa.max, 0, "en")}/ha`,
    reservierungText: "Paid annually from signing until construction starts – in addition to continued farming.",
    unterschrift: "Signing",
    baubeginn: "Construction → lease",
    weiter: "You keep farming as before",
    vergleichKopf: `${BEISPIEL_HA} ha over ${PACHT.laufzeit} years`,
    vergleichText: "is what even the fixed lease earns compared with the average arable lease – on the same land.",
    vergleichTitel: "Income compared",
    fuss: `Nominal, before tax; arable lease €${fmtZahl(PACHT.ackerProHa, 0, "en")}/ha and contribution margin €${fmtZahl(PACHT.deckungsbeitragAcker.mittel, 0, "en")}/ha, each projected at ${fmtZahl(PACHT.indexierung * 100, 1, "en")} % p.a. As of ${datumText(STAND, "en")}.`,
  },
};

/** Jahrespacht als feine Säulen (Jahr 1–30), gemeinsame Skala für alle Modelle */
export function JahresSaeulen({ jahre, max, ton }) {
  const B = 240;
  const H = 56;
  const w = B / jahre.length;
  return (
    <svg viewBox={`0 0 ${B} ${H}`} className="h-14 w-full" aria-hidden="true" preserveAspectRatio="none">
      {jahre.map((j, i) => {
        const h = Math.max(2, (j.solar / max) * H);
        return <rect key={j.jahr} x={i * w + 0.6} y={H - h} width={w - 1.2} height={h} rx="1" className={cn("ov-balken-y", ton)} style={{ "--ov-delay": `${i * 12}ms` }} />;
      })}
    </svg>
  );
}

export default function Pachtmodelle() {
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const tsd = w.tsd;
  const ohneWerte = zahlenModus(land, ["DE"]) === "hinweis";
  const t = inhaltFuerSprache({ de: TEXTE, en: TEXTE_EN }, land, sprache);
  const fest = pachtRechnung({ ha: BEISPIEL_HA, modell: "fest" });
  const index = pachtRechnung({ ha: BEISPIEL_HA, modell: "index" });
  const umsatz = pachtRechnung({ ha: BEISPIEL_HA, modell: "umsatz", umsatzAnteil: 0.06 });
  const max = Math.max(...[fest, index, umsatz].flatMap((r) => r.jahre.map((j) => j.solar)));

  const MODELLE = [
    { id: "Festpacht", icon: Lock, ...w.modelle[0], s: tsd(fest.summeSolar), r: fest, ton: "fill-ov-400" },
    { id: "Indexiert", icon: TrendingUp, ...w.modelle[1], s: tsd(index.summeSolar), r: index, ton: "fill-ov-600" },
    { id: "Umsatzbeteiligung", icon: BadgePercent, ...w.modelle[2], s: `${tsd(umsatz.summeSolar)}`, r: umsatz, ton: "fill-navy-500" },
  ];

  // Länderinhalt nach den deutschen Modellnamen (id) geschlüsselt
  if (ohneWerte) for (const m of MODELLE) Object.assign(m, { k: t.k[m.id] || w.nachPruefung, x: t.x[m.id] || m.x });

  const balken = [
    { l: w.balken[0], v: index.summeSolar, c: "bg-gradient-to-r from-ov-600 to-ov-400" },
    { l: w.balken[1], v: fest.summeSolar, c: "bg-ov-400" },
    { l: w.balken[2], v: fest.summeDb, c: "bg-sun-400" },
    { l: w.balken[3], v: fest.summeAcker, c: "bg-white/40" },
  ];

  return (
    <Section tone="white" space="lg" id="pachtmodelle" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SectionHeading
          eyebrow={w.eyebrow}
          title={w.titel}
          lead={ohneWerte && t.lead ? t.lead : w.lead}
        />
        <Reveal>
          <Link href={pfad("/rechner/pacht")} className="group inline-flex items-center gap-2 rounded-full bg-ov-50 px-4 py-2.5 text-[14.5px] font-semibold text-ov-800 ring-1 ring-ov-200 transition-colors hover:bg-ov-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
            {w.link}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MODELLE.map((m, i) => (
          <Reveal key={m.id} delay={i * 70} className="ov-card-hover flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200">
                <m.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="ov-num rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-600 ring-1 ring-ink-200">{w.modell(i + 1)}</span>
            </div>
            <h3 className="mt-5 font-display text-[19px] font-bold text-ink-900">{m.t}</h3>
            <p className="ov-num mt-1 font-display text-[26px] font-extrabold tracking-tight text-ov-700">{m.k}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{m.x}</p>
            {!ohneWerte && <div className="mt-auto pt-6">
              <div className="rounded-2xl bg-white px-3 pb-2 pt-3 ring-1 ring-ink-200/70">
                <JahresSaeulen jahre={m.r.jahre} max={max} ton={m.ton} />
                <div className="mt-1 flex justify-between text-[10.5px] font-medium text-ink-500">
                  <span>{w.jahrKurz(1)}</span>
                  <span>{w.jahrKurz(PACHT.laufzeit)}</span>
                </div>
              </div>
              <p className="mt-3 flex items-baseline justify-between gap-2 text-[13.5px]">
                <span className="text-ink-600">{w.summe(m.zusatz)}</span>
                <span className="ov-num font-bold text-ink-900">{m.s}</span>
              </p>
            </div>}
          </Reveal>
        ))}

        {/* Baustein 4: Reservierungsprämie – kommt zusätzlich, daher eigene Optik */}
        <Reveal delay={210} className="relative flex flex-col overflow-hidden rounded-3xl bg-sun-50 p-6 ring-1 ring-sun-200 md:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sun-200/60 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sun-600 shadow-e1 ring-1 ring-sun-200">
              <CalendarClock aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-sun-400 px-2.5 py-1 text-[11.5px] font-bold text-navy-950">{w.zusaetzlich}</span>
          </div>
          <h3 className="relative mt-5 font-display text-[19px] font-bold text-ink-900">{w.reservierung}</h3>
          <p className="ov-num relative mt-1 font-display text-[26px] font-extrabold tracking-tight text-sun-700">
            {ohneWerte ? t.k.Reservierungsprämie || w.nachPruefung : w.reservierungWert}
          </p>
          <p className="relative mt-3 text-[15px] leading-relaxed text-ink-700">{w.reservierungText}</p>
          <div className="relative mt-auto pt-6">
            <div className="rounded-2xl bg-white p-3 ring-1 ring-sun-200">
              <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
                <span className="h-[30%] flex-1 rounded-md bg-sun-300" />
                <span className="h-[30%] flex-1 rounded-md bg-sun-300" />
                <span className="h-[30%] flex-1 rounded-md bg-sun-300" />
                <span className="mx-1 w-px self-stretch bg-ink-200" />
                <span className="h-full flex-[3] rounded-md bg-gradient-to-r from-ov-300 to-ov-500" />
              </div>
              <div className="mt-1 flex justify-between text-[10.5px] font-medium text-ink-500">
                <span>{w.unterschrift}</span>
                <span>{w.baubeginn}</span>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] font-semibold text-ink-800">{w.weiter}</p>
          </div>
        </Reveal>
      </div>

      {/* Vergleich Acker – in AT/CH ohne geprüfte Werte der LandHinweis */}
      {ohneWerte ? (
        <LandHinweis land={land} thema={W.de.hinweisThema} themaEn={W.de.hinweisThemaEn} text={TEXTE[land]?.hinweis} textEn={TEXTE_EN[land]?.hinweis} className="mt-6 md:mt-8" />
      ) : (
      <Reveal className="ov-noise relative mt-6 overflow-hidden rounded-[2rem] bg-navy-950 text-white md:mt-8">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-ov-500/25 blur-[90px]" />
        <div className="relative grid gap-8 p-6 sm:p-8 md:p-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14">
          <div>
            <p className="ov-overline text-ov-300">{w.vergleichKopf}</p>
            <p className="mt-4 font-display text-[64px] font-extrabold leading-none tracking-[-0.04em] md:text-[84px]">
              ≈ <Zaehler wert={Math.round(fest.faktorAcker)} dauer={1200} sprache={w.zahlen} /><span className="text-sun-300">×</span>
            </p>
            <p className="mt-3 max-w-xs text-[16px] leading-relaxed text-white/80">
              {w.vergleichText}
            </p>
          </div>
          <div>
            <h3 className="sr-only">{w.vergleichTitel}</h3>
            <ul className="space-y-5">
              {balken.map((b, i) => (
                <li key={b.l}>
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="text-white/80">{b.l}</span>
                    <span className="ov-num shrink-0 font-display text-[17px] font-bold text-white">{tsd(b.v)}</span>
                  </div>
                  <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("ov-balken-x h-full rounded-full", b.c)} style={{ width: `${(b.v / index.summeSolar) * 100}%`, "--ov-delay": `${i * 90}ms` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12.5px] leading-relaxed text-white/60">
              {w.fuss}
              {!land && <> <GiltFuer dunkel /></>}
            </p>
          </div>
        </div>
      </Reveal>
      )}
    </Section>
  );
}

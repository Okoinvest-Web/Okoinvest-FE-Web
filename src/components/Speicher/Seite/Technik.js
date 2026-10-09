// Technik & Sicherheit: Systemkette (Container → PCS → Trafo → Netz, darüber EMS/Vermarkter), Kennzeichen, Schutzebenen
import { BatteryCharging, Cpu, Flame, LineChart, ShieldCheck, Thermometer, Waves, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import { SPEICHER } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

const KETTE = [
  { icon: BatteryCharging, t: "Batterie-Container", s: "LFP-Zellen" },
  { icon: Waves, t: "Wechselrichter", s: "PCS" },
  { icon: Zap, t: "Transformator", s: "Mittel-/Hochspannung" },
  { icon: LineChart, t: "Netz & Markt", s: "Börse, Regelenergie" },
];

const SCHUTZ = [
  { icon: Thermometer, t: "Überwachung", x: "Temperatur, Spannung und Gas je Modul, automatische Abschaltung." },
  { icon: ShieldCheck, t: "Abstände & Normen", x: "Container-Abstände und Prüfungen nach anerkannten Normen für Batteriesysteme." },
  { icon: Flame, t: "Löschkonzept", x: "Abgestimmt mit der Feuerwehr, inkl. Zufahrt, Löschwasser und Einsatzplan." },
  { icon: BatteryCharging, t: "Betrieb", x: "Fernüberwachung rund um die Uhr, Wartung und klare Zuständigkeiten." },
];

/** Sprachmodell: Texte (en nur Texte, Listen je Index). */
const W = {
  de: {
    kette: KETTE,
    schutz: SCHUTZ,
    daten: () => [
      ["Zellchemie", "LFP", "Lithium-Eisenphosphat (LFP): langlebig, thermisch stabil, ohne Kobalt."],
      ["Dauer", "2 h · 4 h", "2-Stunden-Systeme für Regelenergie und Tagesarbitrage; 4-Stunden-Systeme verschieben mehr Solarstrom in den Abend und gewinnen an Bedeutung."],
      ["Aufbau", "PCS + Trafo", "Batterie-Container, Wechselrichter (PCS), Transformatoren, Energiemanagement und Anbindung an den Vermarkter."],
      ["Lebensdauer", `${fmt(SPEICHER.zyklenProJahr)} / Jahr`, `Rund ${fmt(SPEICHER.zyklenProJahr)} Vollzyklen pro Jahr; Kapazitätsverlust wird über Erweiterung (Augmentation) oder Garantie ausgeglichen.`],
    ],
    eyebrow: "Technik & Sicherheit",
    titel: "LFP, 2 oder 4 Stunden – und Brandschutz von Anfang an.",
    aufbau: "So ist ein Großspeicher aufgebaut",
    steuern: "Energiemanagement & Vermarkter steuern alles",
    sicherheit: "Sicherheit in Schichten",
    brandschutz: "Ein Brandschutzkonzept ist Teil jeder Genehmigung.",
    ebene: (n) => `Ebene ${n}: `,
  },
  en: {
    kette: [
      { t: "Battery containers", s: "LFP cells" },
      { t: "Inverters", s: "PCS" },
      { t: "Transformer", s: "Medium/high voltage" },
      { t: "Grid & market", s: "Exchange, balancing power" },
    ],
    schutz: [
      { t: "Monitoring", x: "Temperature, voltage and gas per module, automatic shutdown." },
      { t: "Spacing & standards", x: "Distances between containers and testing to recognised standards for battery systems." },
      { t: "Firefighting concept", x: "Agreed with the fire brigade, including access, firefighting water and an operations plan." },
      { t: "Operation", x: "Remote monitoring around the clock, maintenance and clear responsibilities." },
    ],
    daten: () => [
      ["Cell chemistry", "LFP", "Lithium iron phosphate (LFP): durable, thermally stable, cobalt-free."],
      ["Duration", "2 h · 4 h", "2-hour systems for balancing power and daily arbitrage; 4-hour systems shift more solar power into the evening and are becoming more important."],
      ["Set-up", "PCS + transformer", "Battery containers, inverters (PCS), transformers, energy management and connection to the trader."],
      ["Service life", `${fmtZahl(SPEICHER.zyklenProJahr, 0, "en")} / year`, `Around ${fmtZahl(SPEICHER.zyklenProJahr, 0, "en")} full cycles per year; capacity loss is offset by augmentation or warranty.`],
    ],
    eyebrow: "Technology & safety",
    titel: "LFP, 2 or 4 hours – and fire protection from the start.",
    aufbau: "How a battery storage system is set up",
    steuern: "Energy management & trader control everything",
    sicherheit: "Safety in layers",
    brandschutz: "A fire protection concept is part of every permit.",
    ebene: (n) => `Layer ${n}: `,
  },
};

export default function Technik() {
  const w = uebersetze(W, spracheDerAnfrage());
  const DATEN = w.daten();

  return (
    <Section tone="sand" space="lg" data-abschnitt="technik" aria-labelledby="technik-titel">
      <Kopf id="technik-titel" eyebrow={w.eyebrow} titel={w.titel} className="mb-12 md:mb-16" />

      {/* Systemkette */}
      <Reveal className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-e2 ring-1 ring-ink-200/70 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="ov-overline text-ov-700">{w.aufbau}</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-[12.5px] font-semibold text-navy-700 ring-1 ring-navy-100">
            <Cpu aria-hidden="true" className="h-3.5 w-3.5" /> {w.steuern}
          </p>
        </div>
        <ol className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          <span aria-hidden="true" className="absolute left-[12%] right-[12%] top-[2.1rem] hidden h-0.5 bg-gradient-to-r from-ov-300 via-navy-300 to-navy-500 lg:block" />
          {w.kette.map((k, i) => (
            <li key={i} className="relative flex items-center gap-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 lg:flex-col lg:bg-transparent lg:p-0 lg:text-center lg:ring-0">
              <span aria-hidden="true" className="relative flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e3 ring-1 ring-ink-200/70">
                <k.icon className="h-7 w-7" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <p className="font-display text-[17px] font-bold text-ink-900">{k.t}</p>
                <p className="text-[14px] text-ink-500">{k.s}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <dl className="grid h-full gap-px overflow-hidden rounded-[2rem] bg-ink-200/70 ring-1 ring-ink-200/70 sm:grid-cols-2">
            {DATEN.map(([k, gross, v]) => (
              <div key={k} className="flex flex-col bg-white p-6 md:p-7">
                <dt className="ov-overline text-ov-700">{k}</dt>
                <dd className="mt-3">
                  <span className="ov-num block font-display text-[26px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[30px]">{gross}</span>
                  <span className="mt-3 block text-[15px] leading-relaxed text-ink-600">{v}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={80} className="relative overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white sm:p-8">
          <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 text-ov-300 opacity-30">
            {[90, 70, 50, 30].map((r) => (
              <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray={r === 90 ? "3 5" : undefined} />
            ))}
            <circle cx="100" cy="100" r="12" fill="currentColor" />
          </svg>
          <p className="ov-overline relative text-ov-300">{w.sicherheit}</p>
          <h3 className="relative mt-3 font-display text-[22px] font-bold leading-snug">{w.brandschutz}</h3>
          <ol className="relative mt-6 space-y-4">
            {w.schutz.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-ov-300 ring-1 ring-white/15">
                  <s.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    <span className="sr-only">{w.ebene(i + 1)}</span>
                    {s.t}
                  </p>
                  <p className="mt-0.5 text-[14.5px] leading-relaxed text-white/70">{s.x}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </Section>
  );
}

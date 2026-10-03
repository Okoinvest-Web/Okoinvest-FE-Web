// ElWG – dunkler Anker in der Seitenmitte: Zeitleiste + Regel-Karten mit Paragraphen-Badges
import { BadgeCheck, HandCoins, Landmark, Repeat, ScrollText, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

/*
 * Fachtexte (`text`) sind wörtlich übernommen. Kennzahl, Paragraphen-Badge und
 * Mini-Grafik wiederholen nur, was im Text steht – sie sind für Screenreader
 * ausgeblendet, damit nichts doppelt vorgelesen wird.
 */
const ELWG = [
  {
    icon: Repeat,
    para: "§ 71 Abs. 5",
    vor: "≤",
    zahl: "5",
    einheit: "",
    zahlText: "Gemeinschaften je Zählpunkt, Σ ≤ 100 %",
    grafik: "faktoren",
    title: "Bis zu fünf Gemeinschaften",
    text: "Ein Zählpunkt kann an bis zu fünf gemeinsamen Energienutzungen teilnehmen; Teilnahmefaktor ganzzahlig, zusammen höchstens 100 % (ElWG § 71 Abs. 5).",
    plattform: "In der Plattform: Regeln Σ ≤ 100 % und max. 5 je Zählpunkt geprüft",
  },
  {
    icon: HandCoins,
    para: "SNE-V § 5 Abs. 1a",
    zahl: "−57",
    einheit: "%",
    zahlText: "lokal auf den Netznutzungs-Arbeitspreis, bis Ende 2026",
    grafik: "netzentgelt",
    title: "Netzentgelt nach Nahebereich",
    text: "Bis Ende 2026 gelten für EEG lokal −57 % bzw. regional −28 %/−64 % auf den Netznutzungs-Arbeitspreis. Ab 2027 soll eine neue Verordnung nach Nahebereich staffeln – die Höhe steht noch aus (zu bestätigen).",
  },
  {
    icon: BadgeCheck,
    para: "§ 69",
    vor: ">",
    zahl: "100",
    einheit: "kW",
    zahlText: "Erzeugung (Haushalte über 30 kW)",
    grafik: "pflichten",
    title: "Pflichten ab 100 kW",
    text: "Gemeinschaften mit mehr als 100 kW Erzeugung (Haushalte über 30 kW) brauchen AGB, Informationsblatt und Rechnungen mit Pflichtinhalten – ein Organisator kann sie übernehmen (§ 69).",
  },
  {
    icon: Landmark,
    para: "§ 68 Abs. 6",
    vor: "≥",
    zahl: "10",
    einheit: "%",
    zahlText: "der Menge für schutzbedürftige Haushalte",
    grafik: "quote",
    title: "Sozialquote für Gemeinden",
    text: "Nehmen Gebietskörperschaften mit eigener Erzeugung teil, sollen mindestens 10 % der Menge schutzbedürftigen Haushalten zugutekommen (§ 68 Abs. 6).",
  },
];

/* Geschützte Leerzeichen: „§ 71“, „57 %“, „Abs. 5“ nie über Zeilen trennen */
const fest = (t) => t.replace(/(§§?|Abs\.|Nr\.) /g, "$1 ").replace(/ (%|kW|Abs\.)/g, " $1");

/* Zeitleiste – nur Stichworte; die Einzelheiten (Prozentsätze, Fundstellen) stehen in den Regelkarten darunter,
   damit dieselben Sätze nicht zweimal untereinander stehen. */
const ZEITLEISTE = [
  { wann: "Seit 1. Oktober 2026", was: "Neue Regeln gelten, bestehende Gemeinschaften werden übergeführt.", stand: "jetzt" },
  { wann: "Bis Ende 2026", was: "Reduziertes Netzentgelt für EEG auf den Netznutzungs-Arbeitspreis.", stand: "gilt" },
  { wann: "Ab 2027", was: "Staffelung nach Nahebereich – die Höhe steht noch aus.", stand: "offen" },
];

function Zeitleiste() {
  return (
    <Reveal dir="right" delay={120} className="relative rounded-[1.75rem] bg-white/[0.04] p-6 ring-1 ring-inset ring-white/10 backdrop-blur-sm md:p-7">
      <p className="ov-overline text-white/60">Zeitleiste</p>
      <ol className="relative mt-5 space-y-6">
        {/* Verbindungslinie */}
        <span aria-hidden="true" className="absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-ov-300/70 via-white/20 to-white/10" />
        {ZEITLEISTE.map((z) => (
          <li key={z.wann} className="relative pl-8">
            <span aria-hidden="true" className="absolute left-0 top-[3px] flex h-[15px] w-[15px] items-center justify-center">
              {z.stand === "jetzt" ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-ov-400/30" />
                  <span className="h-[9px] w-[9px] rounded-full bg-ov-300" />
                </>
              ) : z.stand === "gilt" ? (
                <span className="h-[11px] w-[11px] rounded-full bg-navy-950 ring-2 ring-ov-300/80" />
              ) : (
                <span className="h-[11px] w-[11px] rounded-full bg-navy-950 ring-2 ring-sun-300/70" />
              )}
            </span>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-display text-[15px] font-bold text-white">{z.wann}</span>
              {z.stand === "offen" && (
                <span className="rounded-full bg-sun-300/10 px-2 py-0.5 text-[11.5px] font-semibold text-sun-300 ring-1 ring-inset ring-sun-300/30">zu bestätigen</span>
              )}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-white/70 [hyphens:manual]">{fest(z.was)}</p>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

/* Mini-Grafiken je Regel (rein dekorativ, Inhalt steht im Text) */
function Grafik({ art }) {
  if (art === "faktoren") {
    const teile = [40, 30, 20, 10];
    return (
      <div>
        <div className="flex h-2.5 gap-1 overflow-hidden rounded-full">
          {teile.map((t, i) => (
            <span key={i} className="rounded-full" style={{ width: `${t}%`, background: `color-mix(in oklab, var(--color-ov-300) ${100 - i * 20}%, transparent)` }} />
          ))}
        </div>
        <p className="mt-2 text-[12px] text-white/55">Beispiel: 40 + 30 + 20 + 10 = 100 % in vier Gemeinschaften</p>
      </div>
    );
  }
  if (art === "netzentgelt") {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-ov-300/10 px-3 py-1 text-[12.5px] font-semibold text-ov-200 ring-1 ring-inset ring-ov-300/25">lokal −57 %</span>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] font-semibold text-white/80 ring-1 ring-inset ring-white/15">regional −28 %/−64 %</span>
        <span className="rounded-full border border-dashed border-sun-300/40 px-3 py-1 text-[12.5px] font-semibold text-sun-300">ab 2027 offen</span>
      </div>
    );
  }
  if (art === "pflichten") {
    return (
      <div className="flex flex-wrap gap-2">
        {["AGB", "Informationsblatt", "Rechnungen mit Pflichtinhalten"].map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-ov-300" />
            {p}
          </span>
        ))}
      </div>
    );
  }
  // Sozialquote: 1 von 10 Feldern
  return (
    <div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i === 0 ? "h-2.5 rounded-full bg-ov-300" : "h-2.5 rounded-full bg-white/10"} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-white/55">mindestens ein Zehntel der Menge</p>
    </div>
  );
}

function RegelKarte({ r, i }) {
  const Icon = r.icon;
  return (
    <Reveal
      as="li"
      delay={i * 80}
      className="group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-6 ring-1 ring-inset ring-white/10 transition-colors duration-300 hover:ring-white/20 md:p-8"
    >
      {/* feiner Lichtrand oben */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-ov-300/50 to-transparent" />

      <div aria-hidden="true" className="flex items-center justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-300/10 text-ov-300 ring-1 ring-inset ring-ov-300/20">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="ov-num rounded-full bg-white/[0.06] px-3 py-1 font-display text-[12.5px] font-bold tracking-wide text-white/85 ring-1 ring-inset ring-white/15">
          {r.para}
        </span>
      </div>

      <div aria-hidden="true" className="mt-7">
        <p className="ov-num flex items-baseline whitespace-nowrap font-display text-[48px] font-extrabold leading-none tracking-[-0.03em] text-white md:text-[56px]">
          {r.vor && <span className="mr-2 text-[0.62em] font-bold text-white/60">{r.vor}</span>}
          {r.zahl}
          {r.einheit && <span className="ml-1.5 text-[0.45em] font-bold tracking-normal text-ov-300">{r.einheit}</span>}
        </p>
        <p className="mt-2.5 text-[13px] leading-snug text-white/60 [hyphens:manual]">{r.zahlText}</p>
      </div>

      <h3 className="mt-6 font-display text-[20px] font-bold leading-snug text-white md:text-[22px]">{r.title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-white/75">{fest(r.text)}</p>

      <div aria-hidden="true" className="mt-auto pt-6">
        <div className="border-t border-white/10 pt-5">
          <Grafik art={r.grafik} />
        </div>
      </div>

      {r.plattform && (
        <p className="mt-4 flex items-start gap-2 text-[13px] font-medium leading-snug text-ov-200">
          <ShieldCheck aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
          {fest(r.plattform)}
        </p>
      )}
    </Reveal>
  );
}

export default function Elwg() {
  return (
    <Section data-abschnitt="elwg" tone="navy" space="lg" id="elwg" bare className="ov-noise scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-ov-500/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 h-[30rem] w-[30rem] rounded-full bg-navy-500/20 blur-3xl" />

      <div className="ov-container relative">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <SectionHeading
            dark
            eyebrow="Seit 1. Oktober 2026"
            title="Was das ElWG für Gemeinschaften ändert"
            lead="Bestehende Gemeinschaften werden übergeführt; Verträge und Statuten sollten angepasst werden. Die Plattform bildet die neuen Regeln ab."
            className="lg:col-span-7"
          />
          <div className="lg:col-span-5">
            <Zeitleiste />
          </div>
        </div>

        <ul aria-label="Die wichtigsten Regeln des ElWG" className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 md:gap-5">
          {ELWG.map((r, i) => (
            <RegelKarte key={r.title} r={r} i={i} />
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-6 rounded-[1.75rem] bg-white/[0.03] p-5 ring-1 ring-inset ring-white/10 md:mt-10 md:flex-row md:items-center md:justify-between md:gap-10 md:p-6">
          <div className="flex gap-4">
            <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70 ring-1 ring-inset ring-white/10">
              <ScrollText className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <p className="max-w-3xl text-[13px] leading-relaxed text-white/70">
              <span className="font-semibold text-white/85">Quellen: </span>
              {fest("ElWG BGBl. I Nr. 91/2025 (§§ 65–72), SNE-V 2018 § 5 Abs. 1a, Koordinationsstelle für Energiegemeinschaften (FAQ zum ElWG). Keine Rechts- oder Steuerberatung; Details der neuen Netzentgelt-Verordnung zu bestätigen.")}
            </p>
          </div>
          <Button href="#pakete" variant="white" pfeil className="shrink-0 self-start md:self-auto">Welches Paket passt?</Button>
        </div>
      </div>
    </Section>
  );
}

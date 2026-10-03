// Prüfung am Kartentisch, Weg bis zur ersten Pacht, Anfrage (dunkle Bühne) – /flaeche-verpachten
import Link from "next/link";
import {
  ArrowRight, ClipboardCheck, FileSignature, HandCoins, LayoutDashboard, PlugZap, ShieldCheck, Wheat,
} from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { Haken } from "@/components/Flaeche/Seite/teile";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";
import { PACHT, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------ */
/* Was wir prüfen – Ebenen am Kartentisch                              */
/* ------------------------------------------------------------------ */

const PRUEFPUNKTE = [
  { t: "Planungsrecht", x: "Lage im Regional- und Flächennutzungsplan, Haltung der Gemeinde" },
  { t: "Schutzgebiete", x: "Schutzgebiete, Biotope, Wasserschutz, Überschwemmungsgebiete" },
  { t: "Förderkulisse", x: "EEG-Flächenkulisse bzw. Förderung in AT und CH" },
  { t: "Netz", x: "Netzverknüpfungspunkt, freie Kapazität, Trassenverlauf" },
  { t: "Sonne & Gelände", x: "Einstrahlung, Verschattung, Hangneigung und Zuschnitt" },
  { t: "Zufahrt & Boden", x: "Zufahrt, Baugrund, Leitungen und Altlasten" },
  { t: "Eigentum", x: "Eigentumsverhältnisse, Grundbuch, bestehende Pachtverträge" },
];

const EBENEN_FARBEN = ["#ffffff", "#e9f3dc", "#d4e8bb", "#fff1c7", "#dbe7f5", "#e9f3dc", "#f2efe4"];

/** Gestapelte Kartenebenen (isometrisch) – oben die Flurkarte mit Ihrer Fläche */
function Kartenstapel({ className }) {
  const cx = 210;
  const hw = 165;
  const hh = 66;
  const abstand = 30;
  const y0 = 84;
  const raute = (y) => `${cx - hw},${y} ${cx},${y - hh} ${cx + hw},${y} ${cx},${y + hh}`;
  const ebenen = PRUEFPUNKTE.map((_, i) => i);
  return (
    <svg viewBox="0 0 440 340" className={className} aria-hidden="true">
      <defs>
        <clipPath id="vp-stapel-oben">
          <polygon points={raute(y0)} />
        </clipPath>
      </defs>
      {/* Schatten */}
      <ellipse cx={cx} cy={y0 + abstand * 6 + hh + 8} rx={hw * 0.9} ry="16" fill="#03122b" fillOpacity="0.08" />
      {[...ebenen].reverse().map((i) => {
        const y = y0 + i * abstand;
        return (
          <g key={i} className={aufbau.fallen} style={{ "--i": PRUEFPUNKTE.length - 1 - i }}>
            <polygon points={raute(y + 5)} fill="#03122b" fillOpacity="0.06" />
            <polygon points={raute(y)} fill={EBENEN_FARBEN[i]} stroke="#558227" strokeOpacity={i === 0 ? 0.5 : 0.25} />
          </g>
        );
      })}
      {/* Oberste Ebene: Flurkarte */}
      <g clipPath="url(#vp-stapel-oben)" className={aufbau.ein} style={{ "--ein-start": "720ms" }}>
        {[-120, -60, 0, 60, 120].map((d) => (
          <line key={`a${d}`} x1={cx - hw + d} y1={y0 - hh} x2={cx + d + 40} y2={y0 + hh} stroke="#a3abba" strokeOpacity="0.45" />
        ))}
        {[-40, 0, 40].map((d) => (
          <line key={`b${d}`} x1={cx - hw} y1={y0 + d} x2={cx + hw} y2={y0 + d - 50} stroke="#a3abba" strokeOpacity="0.45" />
        ))}
        <polygon points={`${cx - 40},${y0 - 8} ${cx + 38},${y0 - 34} ${cx + 70},${y0 + 4} ${cx - 6},${y0 + 32}`} fill="#8cba58" fillOpacity="0.35" stroke="#436621" strokeWidth="1.6" />
        {[0, 1, 2, 3, 4].map((k) => (
          <line key={k} x1={cx - 30 + k * 9} y1={y0 - 2 + k * 6} x2={cx + 44 + k * 4} y2={y0 - 26 + k * 7} stroke="#436621" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
        ))}
        <path d={`M${cx + 70} ${y0 + 2} C ${cx + 100} ${y0 + 10}, ${cx + 120} ${y0 - 10}, ${cx + 132} ${y0 - 22}`} stroke="#f5a70f" strokeWidth="2" strokeDasharray="4 4" fill="none" />
        <circle cx={cx + 134} cy={y0 - 24} r="5" fill="#f5a70f" />
      </g>
      {/* Nummern an der rechten Kante */}
      {ebenen.map((i) => {
        const y = y0 + i * abstand;
        return (
          <g key={`n${i}`} className={aufbau.pop} style={{ "--i": i }}>
            <line x1={cx + hw} y1={y} x2={cx + hw + 20} y2={y} stroke="#558227" strokeOpacity="0.4" />
            <circle cx={cx + hw + 32} cy={y} r="12" fill={i === 0 ? "#558227" : "#ffffff"} stroke="#558227" strokeOpacity="0.5" />
            <text x={cx + hw + 32} y={y + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="800" fill={i === 0 ? "#ffffff" : "#436621"}>{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Pruefung() {
  return (
    <Section tone="green" space="lg" className="overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_60%_at_80%_50%,#000,transparent)]" />
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Was wir prüfen"
            title="Bevor wir Ihnen ein Angebot machen."
            lead="Kein Pachtangebot ins Blaue: Wir prüfen Ihre Fläche erst am Kartentisch und sagen Ihnen offen, wenn sie nicht passt – auch das ist eine Antwort, die Zeit spart."
          />
          <ol className="mt-8 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {PRUEFPUNKTE.map((p, i) => (
              <Reveal as="li" key={p.t} delay={i * 40} className="flex gap-3 border-t border-ov-200/70 py-3.5">
                <span aria-hidden="true" className={cn("ov-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold", i === 0 ? "bg-ov-600 text-white" : "bg-white text-ov-700 ring-1 ring-ov-300")}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block font-display text-[15.5px] font-bold text-ink-900">{p.t}</span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-ink-600">{p.x}</span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal dir="scale" className="relative mx-auto w-full max-w-[520px]">
          <div aria-hidden="true" className="absolute inset-8 rounded-full bg-white/70 blur-3xl" />
          <Aufbau schritt={90} style={{ "--pop-start": "760ms", "--pop-schritt": "70ms" }} className="relative">
            <Kartenstapel className="h-auto w-full" />
          </Aufbau>
          <p className="relative mt-2 text-center text-[13px] text-ink-600">Sieben Ebenen, eine Fläche: Wir legen alles übereinander, bevor wir ein Angebot schreiben.</p>
        </Reveal>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Weg bis zur ersten Pachtzahlung                                     */
/* ------------------------------------------------------------------ */

const SCHRITTE = [
  { icon: ClipboardCheck, title: "Flächencheck", text: "Sie nennen Flurstücke oder zeichnen die Fläche ein. Wir prüfen kostenfrei am Kartentisch – Rückmeldung in der Regel innerhalb weniger Wochen.", phase: 0 },
  { icon: HandCoins, title: "Pachtangebot", text: "Sie erhalten ein schriftliches Angebot mit Pachtmodell und Vertragsentwurf – und so viel Zeit, wie Sie für die Prüfung brauchen.", phase: 0 },
  { icon: FileSignature, title: "Vertrag & Grundbuch", text: "Unterschrift, notarielle Dienstbarkeit. Ab jetzt läuft die Reservierungsprämie, Sie bewirtschaften weiter.", phase: 1 },
  { icon: PlugZap, title: "Netz & Baurecht", text: "Wir sichern den Netzanschluss und führen das Verfahren mit der Gemeinde. Jeder Meilenstein erscheint im Portal.", phase: 1 },
  { icon: ShieldCheck, title: "Bürgschaft & Bau", text: "Vor Baubeginn wird die Rückbaubürgschaft hinterlegt. Der Bau selbst dauert meist nur wenige Monate.", phase: 1 },
  { icon: Wheat, title: "Erste Pachtzahlung", text: "Mit Bau- bzw. Betriebsbeginn fließt die volle Pacht – für 30 Jahre und mehr.", phase: 2 },
];

const PHASEN = [
  { t: "Kostenfrei für Sie", x: "Prüfung und Angebot", c: "bg-white text-ink-700 ring-1 ring-ink-200", span: "lg:col-span-2" },
  { t: "Reservierungsprämie", x: `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha·a · Sie bewirtschaften weiter`, c: "bg-sun-100 text-sun-700 ring-1 ring-sun-200", span: "lg:col-span-3" },
  { t: "Volle Pacht", x: `${PACHT.laufzeit} Jahre und mehr`, c: "bg-gradient-to-r from-ov-600 to-ov-500 text-white", span: "lg:col-span-1" },
];

export function Weg() {
  return (
    <Section tone="white" space="lg">
      <SectionHeading
        eyebrow="Schritt für Schritt"
        title="Der Weg bis zur ersten Pachtzahlung"
        lead="Sechs Schritte, drei Phasen – und in keiner davon zahlen Sie etwas drauf. Realistisch vergehen von der Unterschrift bis zum Bau meist 2 bis 4 Jahre."
        align="center"
        className="mb-14"
      />

      {/* Phasenband (ab lg über den Schritten) */}
      <Aufbau schritt={160} className="mb-8 hidden gap-3 lg:grid lg:grid-cols-6">
        {PHASEN.map((p, i) => (
          <div key={p.t} className={cn("rounded-2xl px-4 py-3", aufbau.heben, p.c, p.span)} style={{ "--i": i }}>
            <span className="block font-display text-[15px] font-bold leading-tight">{p.t}</span>
            <span className="mt-0.5 block text-[12.5px] font-medium leading-snug opacity-90">{p.x}</span>
          </div>
        ))}
      </Aufbau>

      <Aufbau as="ol" verzoegerung={150} className="relative grid gap-0 lg:grid-cols-6 lg:gap-5">
        <span aria-hidden="true" style={{ "--dauer": "1600ms" }} className={"absolute hidden lg:block lg:left-6 lg:right-[calc((100%-100px)/6-24px)] lg:top-6 lg:h-px lg:w-auto bg-gradient-to-r from-ink-200 via-sun-300 to-ov-500 " + aufbau.wachsen} />
        {SCHRITTE.map((s, i) => {
          const phase = PHASEN[s.phase];
          const erster = i === 0 || SCHRITTE[i - 1].phase !== s.phase;
          return (
            <Reveal as="li" key={s.title} delay={i * 70} className="relative flex gap-5 pb-8 last:pb-0 lg:block lg:pb-0">
              {i < SCHRITTE.length - 1 && (
                <span aria-hidden="true" className={cn("absolute bottom-0 left-[23px] top-12 w-px lg:hidden", s.phase === 0 ? "bg-ink-200" : "bg-sun-300")} />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-e2 ring-1",
                  s.phase === 2 ? "bg-ov-600 text-white ring-ov-600" : s.phase === 1 ? "bg-white text-sun-600 ring-sun-200" : "bg-white text-ov-600 ring-ink-200"
                )}
              >
                <s.icon className="h-5 w-5" />
                <span className="ov-num absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <div className="min-w-0 pt-1 lg:pt-5">
                {erster && (
                  <p className={cn("mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-bold lg:hidden", phase.c)}>{phase.t}</p>
                )}
                <h3 className="font-display text-[17px] font-bold leading-snug text-ink-900">
                  <span className="sr-only">Schritt {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{s.text}</p>
              </div>
            </Reveal>
          );
        })}
      </Aufbau>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Anfrage                                                             */
/* ------------------------------------------------------------------ */

const NACH_DEM_ABSENDEN = [
  { t: "Vorgangsnummer sofort", x: "Direkt nach dem Absenden – mit derselben E-Mail sehen Sie den Vorgang später im Portal." },
  { t: "Prüfung am Kartentisch", x: "Planungsrecht, Schutzgebiete, Netz, Kulisse und Eigentum – kostenfrei." },
  { t: "Ehrliche Antwort", x: "Passt die Fläche, erhalten Sie ein schriftliches Angebot. Passt sie nicht, sagen wir es offen." },
];

export function Anfrage() {
  return (
    <Section tone="navy" space="lg" id="anfrage" bare aria-labelledby="anfrage-titel" className="ov-verlauf-nacht ov-noise scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_20%_30%,#000,transparent)]" />
      <div className="ov-container relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="lg:self-start lg:pt-4">
          <Eyebrow dark className="mb-4">Kostenlos & unverbindlich</Eyebrow>
          <h2 id="anfrage-titel" className="ov-h2 text-white">
            Fläche melden – <span className="ov-text-gradient-light">wir melden uns.</span>
          </h2>
          <p className="ov-lead mt-5 max-w-xl text-white/75">
            Nennen Sie uns Ort, Größe und wenn möglich die Flurstücke. Wir prüfen und melden uns persönlich.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {[`${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)}`, "Keine Verpflichtung"].map((t) => (
              <li key={t} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2 text-[14px] font-medium text-white/90 ring-1 ring-white/15">
                <Haken dunkel className="mt-0" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-12 hidden border-t border-white/10 pt-10 lg:block">
            <h3 className="text-ov-300"><span className="ov-overline block font-sans">Was nach dem Absenden passiert</span></h3>
            <ol className="mt-6">
              {NACH_DEM_ABSENDEN.map((s, i) => (
                <li key={s.t} className="relative flex gap-4 pb-7 last:pb-0">
                  {i < NACH_DEM_ABSENDEN.length - 1 && <span aria-hidden="true" className="absolute bottom-1 left-[17px] top-10 w-px bg-gradient-to-b from-ov-400/60 to-white/10" />}
                  <span aria-hidden="true" className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[13px] font-bold text-ov-300 ring-1 ring-white/15">{i + 1}</span>
                  <div className="min-w-0 pt-1">
                    <p className="font-display text-[16.5px] font-bold text-white">{s.t}</p>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-white/70">{s.x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Portal */}
          <div className="mt-10 flex gap-4 rounded-3xl bg-white/[0.05] p-5 ring-1 ring-white/10 md:p-6">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-ov-300/30">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[17px] font-bold text-white">Status Ihrer Fläche jederzeit im Portal</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/70">
                Prüfergebnis, Angebot, Vertragsentwürfe, Meilensteine von Netzanfrage bis Satzungsbeschluss und Nachrichten an Ihren Ansprechpartner – alles an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.
              </p>
              <Link href="/registrieren?rolle=flaeche" className="mt-3 inline-flex items-center gap-2 rounded text-[15px] font-semibold text-ov-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                Zugang zum Portal anlegen <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute -inset-6 rounded-[2.75rem] bg-ov-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white text-ink-900 shadow-e4 ring-1 ring-white/20">
            <div className="border-b border-ink-200/70 bg-gradient-to-r from-ov-50 to-white px-6 py-5 sm:px-8 md:px-10">
              <p className="font-display text-[20px] font-bold leading-tight text-ink-900">Ihre Fläche melden</p>
              <p className="mt-1 text-[14px] text-ink-600">Dauert etwa zwei Minuten. Flurstücke sind hilfreich, aber kein Muss.</p>
            </div>
            <div className="p-6 sm:p-8 md:p-10">
              <AnfrageFormular
                typ="flaeche"
                daten={{ quelle: "flaeche-verpachten" }}
                felder={["telefon", "plz", "ort", "land", "nachricht"]}
                titel="Ihre Fläche"
                text="Bitte in der Nachricht ungefähre Größe, aktuelle Nutzung und – falls zur Hand – Gemarkung und Flurstücke angeben."
                button="Fläche melden"
              />
            </div>
          </div>
        </Reveal>

        {/* mobil: Ablauf nach dem Formular */}
        <div className="lg:hidden">
          <h3 className="text-ov-300"><span className="ov-overline block font-sans">Was nach dem Absenden passiert</span></h3>
          <ol className="mt-5 space-y-5">
            {NACH_DEM_ABSENDEN.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span aria-hidden="true" className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[13px] font-bold text-ov-300 ring-1 ring-white/15">{i + 1}</span>
                <div className="min-w-0 pt-1">
                  <p className="font-display text-[16.5px] font-bold text-white">{s.t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-white/70">{s.x}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

// Hero der Seite /flaeche-verpachten
// Aufbau: Pille → Headline → Lead → Handlungen → Zusagen (2×2) | Bühne „Pachtsteckbrief“ (Beispielrechnung 10 ha)
import { ArrowRight, Gauge, Landmark, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { TextEnthuellung, Zaehler } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { Flurkarte, HeroBuehne, HeroPille, Haken } from "@/components/Flaeche/Seite/teile";
import { PACHT } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pachtRechnung, REGION_KURZ } from "@/lib/rechner/pacht";
import { pfad } from "@/lib/land";

export const BEISPIEL_HA = 10;

const ZUSAGEN = ["Prüfung & Vertrag kostenfrei", "Rückbaubürgschaft ab Baubeginn", "Weiter bewirtschaften bis zum Bau", "Status jederzeit im Portal"];

const tsd = (v) => `${fmt(Math.round(v / 1000))} Tsd. €`;

/** Kumulierte Einnahmen als Linien – Solarpacht indexiert, fest und Ackerpacht */
function KumuliertChart({ index, fest }) {
  const B = 300;
  const H = 120;
  const max = index.summeSolar;
  const n = index.jahre.length;
  const x = (i) => ((i + 1) / n) * B;
  const y = (v) => H - (v / max) * (H - 6);
  const linie = (reihe, feld) => `M0 ${H} ` + reihe.map((p, i) => `L${x(i).toFixed(1)} ${y(p[feld]).toFixed(1)}`).join(" ");
  const flaeche = `${linie(index.jahre, "sumSolar")} L${B} ${H} Z`;
  return (
    <svg viewBox={`0 0 ${B} ${H + 2}`} className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="vp-hero-flaeche" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#558227" stopOpacity="0.28" />
          <stop offset="1" stopColor="#558227" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={B} y1={H * f} y2={H * f} stroke="#e6e9ef" strokeDasharray="2 4" />
      ))}
      <line x1="0" x2={B} y1={H} y2={H} stroke="#dfe3ea" />
      <path d={flaeche} fill="url(#vp-hero-flaeche)" className="ov-flaeche-ein" />
      <path d={linie(index.jahre, "sumSolar")} pathLength="1" fill="none" stroke="#436621" strokeWidth="2.5" strokeLinejoin="round" className="ov-linie ov-sofort" />
      <path d={linie(fest.jahre, "sumSolar")} pathLength="1" fill="none" stroke="#8cba58" strokeWidth="2" strokeLinejoin="round" className="ov-linie ov-sofort" />
      <path d={linie(fest.jahre, "sumAcker")} fill="none" stroke="#a3abba" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx={B} cy={y(index.summeSolar)} r="4" fill="#436621" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function PachtKomposition() {
  const fest = pachtRechnung({ ha: BEISPIEL_HA, modell: "fest" });
  const index = pachtRechnung({ ha: BEISPIEL_HA, modell: "index" });
  return (
    <div className="relative">
      {/* Hauptkarte */}
      <div className="relative overflow-hidden rounded-[1.6rem] bg-white text-ink-900 shadow-e5 ring-1 ring-white/30">
        <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto truncate rounded-md bg-white px-3 py-0.5 text-[11.5px] text-ink-600 ring-1 ring-ink-200"><span className="max-sm:hidden">Beispiel · </span>Pachtsteckbrief · {BEISPIEL_HA} ha</span>
          <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-sun-700 sm:invisible">Beispiel</span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-[12.5px] font-medium text-ink-600">{BEISPIEL_HA} ha · {REGION_KURZ["de-sued"]} · Festpacht {fmt(PACHT.freiflaecheProHa.mittel)} €/ha</p>
              <p className="mt-1.5 font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ink-900 sm:text-[40px]">
                <Zaehler className="ov-num" wert={Math.round(fest.ersteJahrespacht)} nach=" €" dauer={1300} verzoegerung={350} />
                <span className="ml-1.5 text-[15px] font-bold tracking-normal text-ink-500">/ Jahr</span>
              </p>
            </div>
            <p className="rounded-xl bg-ov-50 px-3 py-2 text-[12.5px] leading-snug text-ov-900 ring-1 ring-ov-200">
              <span className="block font-bold">{PACHT.laufzeit} Jahre</span>
              ab Inbetriebnahme
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-white ring-1 ring-ink-100">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
              <p className="text-[12.5px] font-semibold text-ink-800">Einnahmen kumuliert</p>
              <p className="text-[11.5px] text-ink-500">nominal, vor Steuern</p>
            </div>
            <div className="px-4 pb-2 pt-3">
              <KumuliertChart index={index} fest={fest} />
              <div className="mt-1.5 flex justify-between text-[11px] font-medium text-ink-500">
                <span>Jahr 1</span>
                <span>Jahr {PACHT.laufzeit / 2}</span>
                <span>Jahr {PACHT.laufzeit}</span>
              </div>
            </div>
            <ul className="grid gap-px border-t border-ink-100 bg-ink-100 text-[12px] sm:grid-cols-3">
              {[
                { l: "Indexiert", v: index.summeSolar, c: "bg-ov-700" },
                { l: "Festpacht", v: fest.summeSolar, c: "bg-ov-400" },
                { l: "Ackerpacht Ø", v: fest.summeAcker, c: "bg-ink-400", gestrichelt: true },
              ].map((r) => (
                <li key={r.l} className="flex items-center justify-between gap-2 bg-white px-4 py-2.5 sm:block">
                  <span className="flex items-center gap-2 text-ink-600">
                    <span aria-hidden="true" className={cn("h-[3px] w-4 rounded-full", r.c, r.gestrichelt && "opacity-70")} />
                    {r.l}
                  </span>
                  <span className="ov-num font-bold text-ink-900 sm:mt-0.5 sm:block">{tsd(r.v)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Schwebend: Faktor gegenüber Ackerpacht */}
      <div className="absolute -right-3 -top-14 hidden rounded-2xl bg-navy-900/90 px-4 py-3 text-white shadow-e4 ring-1 ring-white/15 backdrop-blur sm:block lg:-right-6">
        <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-sun-300">
          <Gauge aria-hidden="true" className="h-3.5 w-3.5" /> Vergleich
        </p>
        <p className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight">
          ≈ <Zaehler wert={Math.round(fest.faktorAcker)} dauer={1100} verzoegerung={900} /><span className="text-[18px] text-sun-300">×</span>
        </p>
        <p className="mt-1 text-[12px] text-white/70">die Ø-Ackerpacht in {PACHT.laufzeit} Jahren</p>
      </div>

      {/* Schwebend: Sicherheiten */}
      <div className="relative -mt-6 ml-4 mr-10 rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:absolute sm:-bottom-24 sm:-left-8 sm:m-0 sm:w-[300px]">
        <ul className="space-y-2.5 text-[13px]">
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white"><ShieldCheck className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block font-bold leading-tight">Rückbaubürgschaft</span><span className="text-ink-600">vor Baubeginn hinterlegt</span></span>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-white"><Landmark className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block font-bold leading-tight">Dienstbarkeit im Grundbuch</span><span className="text-ink-600">bindet auch Rechtsnachfolger</span></span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <HeroBuehne breadcrumbs={[{ name: "Fläche verpachten" }]}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12 xl:gap-x-20">
        <div className="max-w-[36rem]">
          <HeroPille marke="Eigentümer">Acker, Grünland oder Konversionsfläche · DE · AT · CH</HeroPille>

          <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
            <TextEnthuellung verzoegerung={80}>
              Ihre Fläche für den Solarpark. <span className="ov-text-gradient-light">30 Jahre planbare Einnahmen.</span>
            </TextEnthuellung>
          </h1>

          <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
            Verpachten Sie Acker, Grünland oder Konversionsfläche für einen Solarpark: mit fairer Pacht, Rückbausicherheit im Grundbuch und einem Ansprechpartner, der Ihnen den Stand jederzeit im Portal zeigt.
          </p>

          <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
            <Button href="#anfrage" size="lg" pfeil magnetisch className="w-full sm:w-auto">Fläche prüfen lassen</Button>
            <Button href={pfad("/rechner/pacht")} size="lg" variant="outlineLight" className="w-full sm:w-auto">Pacht berechnen</Button>
          </div>
          <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
            Kostenfrei · unverbindlich · persönliche Rückmeldung
          </p>

          <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {ZUSAGEN.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-[14px] leading-snug text-white/85">
                  <Haken dunkel className="mt-px" />
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
              <span>
                Lieber erst selbst einschätzen?{" "}
                <a href={pfad("/flaechencheck")} className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                  Flächencheck in zwei Minuten
                </a>
              </span>
            </p>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-[560px] lg:mx-0 lg:ml-auto">
          <Flurkarte className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[640px] w-[640px] text-white opacity-70 max-lg:hidden" />
          <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
          <div className="ov-hero-in" style={{ "--ov-delay": "220ms" }}>
            <PachtKomposition />
          </div>
          <figcaption className="mt-8 text-center text-[12px] text-white/60 sm:mt-28">
            Beispielrechnung mit Marktmittelwerten – Ihre Werte im Pachtrechner
          </figcaption>
        </figure>
      </div>
    </HeroBuehne>
  );
}

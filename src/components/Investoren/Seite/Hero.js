// Hero der Seite /investoren
// Aufbau: Eyebrow → Headline → Lead → Handlungen → Versprechen | Deal-Bühne (Exposé-Teaser + Match + Datenraum)
import { ArrowRight, BellRing, Check, FileText, FolderLock, Lock, MapPin, Search, ShieldCheck, Sun } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import { BeispielPlakette, Fenster } from "./teile";

const VERSPRECHEN = ["Projektrechte bis Bestand", "Geprüfte Kernunterlagen", "Digitaler Datenraum nach NDA", "Für Käufer kostenfrei"];

export default function Hero() {
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: "Für Investoren" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-x-12 xl:gap-x-16">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-300" />
              Für Investoren · DE · AT · CH
            </p>

            {/* Headline baut sich Wort für Wort auf (reines CSS, erstes Wort nach ~100 ms – LCP-sicher, ohne JS sichtbar) */}
            <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <TextEnthuellung verzoegerung={80}>
                Solarprojekte <span className="whitespace-nowrap">kaufen&nbsp;–</span> <span className="ov-text-gradient-light">in der Phase, die zu Ihnen passt.</span>
              </TextEnthuellung>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              Projektrechte ab der Flächensicherung, baureife Solarparks, Bestandsanlagen und Co-Development im DACH-Raum. Geprüfte Unterlagen, digitaler Datenraum&nbsp;– <span className="font-medium text-white">und für Käufer kostenfrei.</span>
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="/registrieren?rolle=investor" size="lg" pfeil magnetisch className="w-full sm:w-auto">Als Investor registrieren</Button>
              <Button href="/projektboerse" size="lg" variant="outlineLight" icon={Search} className="w-full sm:w-auto">Zur Projektbörse</Button>
            </div>
            <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
              Oder ohne Konto: <a href="#suchprofil" className="rounded font-semibold text-white underline decoration-ov-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">Suchprofil senden</a>
            </p>

            <ul className="ov-hero-in mt-9 grid gap-x-6 gap-y-3 border-t border-white/10 pt-7 sm:grid-cols-2 md:mt-10" style={{ "--ov-delay": "360ms" }}>
              {VERSPRECHEN.map((x, i) => (
                <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                  <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                    <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative mx-auto w-full max-w-[620px] lg:mx-0 lg:max-w-none">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            <DealBuehne />
            <figcaption className="mt-8 text-center text-[12px] text-white/60 lg:mt-10">Beispielansicht mit fiktiven Werten</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Deal-Bühne */

const UNTERLAGEN = ["Pachtverträge", "Netzanschlusszusage", "Baurecht", "Ertragsgutachten"];

function DealBuehne() {
  const rtb = PHASEN.find((p) => p.id === "rtb");
  const index = PHASEN.findIndex((p) => p.id === "rtb");
  return (
    <div
      role="img"
      aria-label="Beispiel eines anonymen Exposé-Teasers: baureifes Freiflächenprojekt mit 20 MWp, Phase Ready-to-Build, Kernunterlagen geprüft; daneben eine Match-Benachrichtigung und ein Datenraum, der nach NDA geöffnet wird."
      className="relative pt-12 sm:px-6 lg:px-0"
    >
      <div aria-hidden="true">
        {/* Match-Benachrichtigung */}
        <div className="ov-hero-in absolute right-0 top-0 z-20 w-[min(272px,78%)] rounded-2xl bg-white/95 p-3.5 text-ink-900 shadow-e4 ring-1 ring-ink-900/10 backdrop-blur sm:right-2 lg:-right-4 xl:-right-8" style={{ "--ov-delay": "520ms" }}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white">
              <BellRing className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12.5px] font-bold">Neues Match <BeispielPlakette /></p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-600">passt zu Ihrem Suchprofil: Baureif · 5–20 MWp · Deutschland</p>
            </div>
          </div>
        </div>

        {/* Exposé-Teaser */}
        <Fenster titel="Projektbörse · Exposé-Teaser" className="ov-hero-in relative z-10 mr-6 sm:mr-14 lg:mr-10" >
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Anonymer Teaser</p>
                <p className="mt-1 font-display text-[17px] font-bold leading-tight text-ink-900 sm:text-[19px]">Freiflächen-PV, 20 MWp</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500"><MapPin className="h-3.5 w-3.5" /> Deutschland · Region verborgen bis NDA</p>
              </div>
              <BeispielPlakette />
            </div>

            {/* Phasenleiste */}
            <div className="mt-4 rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
              <div className="flex items-center justify-between text-[10.5px] font-semibold text-ink-600">
                <span>Phase</span>
                <span className="rounded-full bg-ov-600 px-2 py-0.5 text-white">{rtb.label}</span>
              </div>
              {/* Phasenleiste füllt sich beim Laden bis „Baureif“ – zeigt, wie weit das Beispielprojekt ist (reines CSS) */}
              <div className="ov-sofort mt-3 grid grid-cols-6 gap-1" style={{ "--ov-delay": "760ms" }}>
                {PHASEN.map((p, i) => (
                  <span key={p.id} className="h-1.5 rounded-full bg-ink-200">
                    {i <= index && <span className={cn("ov-balken-x block h-full rounded-full", i < index ? "bg-ov-400" : "bg-ov-600")} style={{ "--i": i * 3 }} />}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[9.5px] text-ink-500">
                <span>Fläche</span>
                <span>Baureif</span>
                <span>Bestand</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl p-3 ring-1 ring-ink-200/80">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">Marktspanne RTB</p>
                <p className="ov-num mt-1 font-display text-[16px] font-extrabold text-ink-900">{fmt(rtb.preisProKwp.min)}–{fmt(rtb.preisProKwp.max)}<span className="ml-1 text-[11px] font-bold text-ink-500">€/kWp</span></p>
              </div>
              <div className="rounded-xl p-3 ring-1 ring-ink-200/80">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">Technologie</p>
                <p className="mt-1 flex items-center gap-1.5 font-display text-[14px] font-bold text-ink-900"><Sun className="h-4 w-4 text-sun-500" /> Freifläche</p>
              </div>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {UNTERLAGEN.map((u) => (
                <li key={u} className="flex items-center gap-1.5 text-[11.5px] text-ink-700">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ov-100 text-ov-700"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
                  {u}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
              <span className="flex items-center gap-1.5 text-[11px] text-ink-500"><Lock className="h-3.5 w-3.5" /> Details nach NDA</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-navy-800 px-3 py-1.5 text-[11px] font-semibold text-white">NDA starten <ArrowRight className="h-3 w-3" /></span>
            </div>
            <div className="h-6 sm:h-10" />
          </div>
        </Fenster>

        {/* Datenraum */}
        <div className="ov-hero-in relative z-20 -mt-6 ml-auto w-[min(300px,86%)] sm:-mt-10 sm:ml-0 rounded-2xl bg-navy-900/95 p-3.5 text-white shadow-e4 ring-1 ring-white/15 backdrop-blur sm:-ml-2 lg:-ml-6" style={{ "--ov-delay": "640ms" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[12.5px] font-bold"><FolderLock className="h-4 w-4 text-ov-300" /> Datenraum</p>
            <span className="flex items-center gap-1 rounded-full bg-ov-400/15 px-2 py-0.5 text-[10px] font-semibold text-ov-200 ring-1 ring-inset ring-ov-300/30"><ShieldCheck className="h-3 w-3" /> NDA unterzeichnet</span>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {["Pachtverträge", "Netzzusage", "Ertragsgutachten P50/P90"].map((d) => (
              <li key={d} className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/85">
                <FileText className="h-3.5 w-3.5 text-white/60" /> {d}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-white/60">Jeder Zugriff wird protokolliert</p>
        </div>
      </div>
    </div>
  );
}

// Hero der Seite /kommunen – dunkle Bühne wie /energiegemeinschaften/software.
// Rechts: „Haushaltsblatt“ der Gemeinde (Beispielrechnung aus rechneKommune) über einer stilisierten Gemarkung.
import { ArrowRight, Calculator, Check, Landmark, Vote } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { KOMMUNE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import Zaehler from "@/components/motion/Zaehler";
import EinnahmenBalken, { Legende } from "./EinnahmenBalken";
import { BEISPIEL, tsdFuer } from "./daten";
import { landHinweisText, landHinweisTextEn, pfad } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

// Länderinhalt: Österreich ohne § 6 EEG und Gewerbesteuer (deutsches Recht); Beispielrechnung nur für DE geprüft
const TEXTE = {
  gemeinsam: {
    punkte: ["§ 6 EEG: 0,2 ct/kWh", "90 % Gewerbesteuer am Standort", "Planungskosten trägt der Entwickler", "Bürgerbeteiligung"],
    leadFett: "Gewerbesteuer, § 6 EEG-Beteiligung, Pacht und Bürgerbeteiligung:",
    leadRest: "Wir entwickeln Solarparks mit der Gemeinde – transparent vom Aufstellungsbeschluss bis zum Betrieb.",
    beispiel: true,
    unterschrift: "Vereinfachte Modellrechnung ohne Pacht auf Gemeindeflächen",
  },
  AT: {
    punkte: ["Widmung bleibt Sache der Gemeinde", "Pacht auf Gemeindeflächen", "Planungskosten trägt der Entwickler", "Energiegemeinschaft und Bürgerbeteiligung"],
    leadFett: "Widmung, Pacht, Bürgerbeteiligung und Energiegemeinschaft:",
    leadRest: "Wir entwickeln Solarparks mit der Gemeinde – transparent vom Gemeinderatsbeschluss bis zum Betrieb.",
    beispiel: false,
    unterschrift: "Beispielrechnung für Ihre Gemeinde auf Anfrage",
  },
  // Schweiz: ohne § 6 EEG und Gewerbesteuer (deutsches Recht); Verfahren nach RPG (src/data/laender/ch/freiflaeche.js)
  CH: {
    punkte: ["Baugesuch bei der Gemeinde", "Pacht auf Gemeindeflächen", "Planungskosten trägt der Entwickler", "Bürgerbeteiligung und LEG"],
    leadFett: "Baugesuch, Pacht, Bürgerbeteiligung und Strom in der Gemeinde:",
    leadRest: "Wir entwickeln Solarparks mit der Gemeinde – transparent vom Baugesuch bis zum Betrieb.",
    beispiel: false,
    unterschrift: "Beispielrechnung für Ihre Gemeinde auf Anfrage",
  },
};

// Englisch: Länderinhalt (gemeinsam und AT), gleiche Aussagen
const TEXTE_EN = {
  gemeinsam: {
    punkte: ["§ 6 EEG: 0.2 ct/kWh", "90 % of trade tax at the site", "Planning costs paid by the developer", "Citizen participation"],
    leadFett: "Trade tax, § 6 EEG participation, lease and citizen participation:",
    leadRest: "we develop solar parks together with the municipality – transparently from the resolution to draw up a plan to operation.",
    unterschrift: "Simplified model calculation without lease on municipal land",
  },
  AT: {
    punkte: ["Zoning remains a matter for the municipality", "Lease on municipal land", "Planning costs paid by the developer", "Energy community and citizen participation"],
    leadFett: "Zoning, lease, citizen participation and energy community:",
    leadRest: "we develop solar parks together with the municipality – transparently from the council resolution to operation.",
    unterschrift: "Example calculation for your municipality on request",
  },
  CH: {
    punkte: ["Building application to the municipality", "Lease on municipal land", "Planning costs paid by the developer", "Citizen participation and LEG"],
    leadFett: "Building application, lease, citizen participation and power within the municipality:",
    leadRest: "we develop solar parks together with the municipality – transparently from the building application to operation.",
    unterschrift: "Example calculation for your municipality on request",
  },
};

/** Sprachmodell: feste Texte des Heros. */
const W = {
  de: {
    f: (n, s = 0) => fmt(n, s),
    brotkrumen: "Kommunen & Stadtwerke",
    marke: "Kommunen",
    pille: "Planungshoheit bei Ihnen – so läuft es",
    titelA: "Ein Solarpark, von dem ",
    titelB: "die Gemeinde etwas hat.",
    primaer: "Gespräch anfragen",
    sekundaer: "Kommunal-Rechner",
    fuer: "Für Gemeinden, Stadtwerke und Landkreise · Deutschland, Österreich, Schweiz",
    beispiel: "Beispielrechnung",
    atHinweis: (land) => `Einnahmen der Gemeinde rechnen wir für ${land === "CH" ? "die Schweiz" : "Österreich"} gesondert – aus Pacht auf Gemeindeflächen, Beteiligungsmodellen und ${land === "CH" ? "lokaler Elektrizitätsgemeinschaft" : "Energiegemeinschaft"}. Zahlungen nach § 6 EEG und Gewerbesteuer sind deutsches Recht. ${landHinweisText(land)}.`,
    kopf: (mwp, hebesatz) => `${mwp} MWp · Süddeutschland · Hebesatz ${hebesatz} %`,
    mio: " Mio. €",
    einnahmen: (l) => `Einnahmen der Gemeinde über ${l} Jahre`,
    jahr: (n) => `Jahr ${n}`,
    afa: "Ende der Abschreibung",
    p6: "§ 6 EEG pro Jahr",
    gewst: (j) => `Gewerbesteuer ab Jahr ${j}`,
    proJahr: "/J.",
    rat: "Der Gemeinderat entscheidet",
    kosten: "Planungskosten trägt der Entwickler",
    zahlen: "de-DE",
  },
  en: {
    f: (n, s = 0) => fmtZahl(n, s, "en"),
    brotkrumen: "Municipalities & utilities",
    marke: "Municipalities",
    pille: "Planning authority stays with you – how it works",
    titelA: "A solar park ",
    titelB: "that benefits the municipality.",
    primaer: "Request a meeting",
    sekundaer: "Municipal calculator",
    fuer: "For municipalities, municipal utilities and districts · Germany, Austria, Switzerland",
    beispiel: "Example calculation",
    atHinweis: (land) => `For ${land === "CH" ? "Switzerland" : "Austria"}, we calculate the municipality’s income separately – from lease on municipal land, participation models and ${land === "CH" ? "a local electricity community" : "an energy community"}. Payments under § 6 EEG and trade tax are German law. ${landHinweisTextEn(land)}.`,
    kopf: (mwp, hebesatz) => `${mwp} MWp · southern Germany · trade tax multiplier ${hebesatz} %`,
    mio: "m",
    einnahmen: (l) => `Municipal income over ${l} years`,
    jahr: (n) => `Year ${n}`,
    afa: "End of depreciation",
    p6: "§ 6 EEG per year",
    gewst: (j) => `Trade tax from year ${j}`,
    proJahr: "/yr",
    rat: "The municipal council decides",
    kosten: "Planning costs paid by the developer",
    zahlen: "en-GB",
  },
};

/** Stilisierte Gemarkung: Flurstücke, Feldweg, Ortslage – und eine Fläche mit Modulreihen */
function Gemarkung({ className }) {
  const reihen = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg aria-hidden="true" viewBox="0 0 560 460" fill="none" preserveAspectRatio="xMidYMid slice" className={className}>
      <g stroke="currentColor" strokeOpacity="0.14">
        <path d="M0 120 L190 80 L260 210 L40 260 Z" />
        <path d="M190 80 L420 30 L470 170 L260 210 Z" />
        <path d="M40 260 L260 210 L300 360 L70 420 Z" />
        <path d="M260 210 L470 170 L540 330 L300 360 Z" />
        <path d="M420 30 L560 0 M470 170 L560 150 M300 360 L330 460 M70 420 L60 460" />
      </g>
      {/* Feldweg */}
      <path d="M0 300 C140 270 240 250 330 240 S 500 205 560 196" stroke="currentColor" strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" />
      <path d="M0 300 C140 270 240 250 330 240 S 500 205 560 196" stroke="#03122b" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 10" />
      {/* Solarpark-Fläche */}
      <g>
        <path d="M200 96 L410 50 L452 166 L262 204 Z" fill="#669933" fillOpacity="0.1" stroke="#aed083" strokeOpacity="0.45" />
        {reihen.map((i) => {
          const t = (i + 0.7) / 10;
          const x1 = 200 + (262 - 200) * t;
          const y1 = 96 + (204 - 96) * t;
          const x2 = 410 + (452 - 410) * t;
          const y2 = 50 + (166 - 50) * t;
          return <line key={i} x1={x1 + 6} y1={y1} x2={x2 - 6} y2={y2} stroke="#8cba58" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />;
        })}
      </g>
      {/* Ortslage */}
      <g fill="currentColor" fillOpacity="0.16">
        <rect x="360" y="270" width="18" height="14" rx="2" />
        <rect x="386" y="262" width="14" height="12" rx="2" />
        <rect x="372" y="292" width="22" height="16" rx="2" />
        <rect x="404" y="284" width="16" height="13" rx="2" />
        <rect x="350" y="300" width="14" height="12" rx="2" />
      </g>
      <circle cx="392" cy="288" r="48" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 6" />
    </svg>
  );
}

export default function Hero() {
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const tsd = tsdFuer(sprache);
  const t = inhaltFuerSprache({ de: TEXTE, en: TEXTE_EN }, land, sprache);
  const PUNKTE = t.punkte;
  const p6Jahr = BEISPIEL.jahre[0].p6;
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: w.brotkrumen }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-12 xl:gap-x-16">
          <div className="max-w-[36rem]">
            <a
              href="#verfahren"
              className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
              style={{ "--ov-delay": "40ms" }}
            >
              <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{w.marke}</span>
              <span className="min-w-0 truncate">
                {w.pille}
              </span>
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>

            <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <TextEnthuellung verzoegerung={80}>
                {w.titelA}<span className="ov-text-gradient-light">{w.titelB}</span>
              </TextEnthuellung>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 [hyphens:manual] md:mt-6" style={{ "--ov-delay": "180ms" }}>
              <span className="font-medium text-white">{t.leadFett}</span> {t.leadRest}
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="#anfrage" size="lg" pfeil magnetisch className="w-full sm:w-auto">{w.primaer}</Button>
              <Button href={pfad("/rechner/kommune")} size="lg" variant="outlineLight" icon={Calculator} className="w-full sm:w-auto">
                {w.sekundaer}
              </Button>
            </div>
            <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
              {w.fuer}
            </p>

            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {PUNKTE.map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[14px] leading-snug text-white/85">
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              {!land && <GiltFuer dunkel className="mt-3 block" />}
            </div>
          </div>

          {/* Bühne: Haushaltsblatt über der Gemarkung */}
          <figure className="relative mx-auto w-full max-w-[600px] lg:mx-0 lg:max-w-none">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-20 -inset-y-24 -z-10 [mask-image:radial-gradient(closest-side,#000_45%,transparent)] max-sm:-inset-x-6">
              <Gemarkung className="h-full w-full text-white" />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.2),transparent_70%)] blur-2xl" />

            <div className="ov-hero-in relative" style={{ "--ov-delay": "220ms" }}>
              {/* Schild oben rechts */}
              <div className="absolute -top-5 right-4 z-10 inline-flex items-center gap-2 rounded-full bg-sun-400 px-3.5 py-1.5 text-[12.5px] font-bold text-navy-950 shadow-[0_10px_30px_-10px_rgba(245,167,15,0.7)] sm:right-8">
                <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
                {w.beispiel}
              </div>

              {!t.beispiel ? (
                <LandHinweis
                  land={land}
                  className="shadow-e4"
                  text={W.de.atHinweis(land)}
                  textEn={W.en.atHinweis(land)}
                />
              ) : (
              <div className="rounded-[1.75rem] bg-white p-5 text-ink-900 shadow-e4 ring-1 ring-white/20 sm:p-7">
                <p className="text-[12.5px] font-medium text-ink-500">
                  {w.kopf(w.f(BEISPIEL.eingabe.mwp), w.f(KOMMUNE.hebesatz * 100))}
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                  <div>
                    <p className="ov-kpi-l text-ink-900">
                      {BEISPIEL.gesamtLaufzeit.summe >= 1e6 ? (
                        w.zahlen === "en-GB" ? (
                          <Zaehler wert={Math.round(BEISPIEL.gesamtLaufzeit.summe / 1e5) / 10} nachkomma={1} vor="€" nach={w.mio} sprache="en-GB" verzoegerung={500} dauer={1600} className="[&>span:last-child]:text-left" />
                        ) : (
                          <Zaehler wert={Math.round(BEISPIEL.gesamtLaufzeit.summe / 1e5) / 10} nachkomma={1} nach=" Mio. €" verzoegerung={500} dauer={1600} className="[&>span:last-child]:text-left" />
                        )
                      ) : (
                        tsd(BEISPIEL.gesamtLaufzeit.summe)
                      )}
                    </p>
                    <p className="text-[14px] text-ink-600">{w.einnahmen(BEISPIEL.L)}</p>
                  </div>
                  <Legende jahre={BEISPIEL.jahre} className="pb-1" />
                </div>

                <EinnahmenBalken jahre={BEISPIEL.jahre} variante="mini" className="ov-sofort mt-6" style={{ "--ov-delay": "450ms" }} />
                <div aria-hidden="true" className="relative mt-2 h-4 text-[11.5px] text-ink-400">
                  <span className="absolute left-0">{w.jahr(1)}</span>
                  <span className="absolute -translate-x-1/2 max-sm:hidden" style={{ left: `${(KOMMUNE.afaJahre / BEISPIEL.L) * 100}%` }}>{w.afa}</span>
                  <span className="absolute right-0">{w.jahr(BEISPIEL.L)}</span>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-100">
                  <div className="bg-sand-50 p-4">
                    <dt className="text-[12.5px] text-ink-500">{w.p6}</dt>
                    <dd className="ov-num mt-0.5 font-display text-[20px] font-extrabold tracking-tight text-ov-700">{tsd(p6Jahr)}</dd>
                  </div>
                  <div className="bg-sand-50 p-4">
                    <dt className="text-[12.5px] text-ink-500">{w.gewst(KOMMUNE.afaJahre + 1)}</dt>
                    <dd className="ov-num mt-0.5 font-display text-[20px] font-extrabold tracking-tight text-sun-700">≈ {tsd(BEISPIEL.gewStNachAfa)}{w.proJahr}</dd>
                  </div>
                </dl>
              </div>
              )}

              {/* schwebende Karte: Planungshoheit */}
              <div className="relative z-10 mt-4 flex items-center gap-3 rounded-2xl bg-navy-900/90 p-3.5 pr-5 ring-1 ring-white/15 backdrop-blur-md sm:absolute sm:-bottom-10 sm:-left-8 sm:m-0 sm:max-w-[19rem]">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/30">
                  <Vote className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug text-white">{w.rat}</span>
                  <span className="block text-[12.5px] leading-snug text-white/65">{w.kosten}</span>
                </span>
              </div>
            </div>

            <figcaption className={cn("mt-6 text-center text-[12px] text-white/60 sm:mt-16 lg:text-right")}>
              {t.unterschrift}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

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
import { landHinweisText, landHinweisTextEn, pfad, zahlenModus } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import Link from "@/components/Land/Link";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

export const BEISPIEL_HA = 10;

const ZUSAGEN = ["Prüfung & Vertrag kostenfrei", "Rückbaubürgschaft ab Baubeginn", "Weiter bewirtschaften bis zum Bau", "Status jederzeit im Portal"];

/** Sprachmodell: Texte des Heros (en nur Texte). */
const W = {
  de: {
    zusagen: ZUSAGEN,
    tsd: (v) => `${fmt(Math.round(v / 1000))} Tsd. €`,
    zahlen: "de-DE",
    beispiel: "Beispiel · ",
    steckbrief: `Pachtsteckbrief · ${BEISPIEL_HA} ha`,
    beispielMarke: "Beispiel",
    zeile: (region) => `${BEISPIEL_HA} ha · ${region} · Festpacht ${fmt(PACHT.freiflaecheProHa.mittel)} €/ha`,
    proJahr: "/ Jahr",
    jahre: `${PACHT.laufzeit} Jahre`,
    abIbn: "ab Inbetriebnahme",
    kumuliert: "Einnahmen kumuliert",
    nominal: "nominal, vor Steuern",
    jahr: (j) => `Jahr ${j}`,
    reihen: ["Indexiert", "Festpacht", "Ackerpacht Ø"],
    vergleich: "Vergleich",
    vergleichText: `die Ø-Ackerpacht in ${PACHT.laufzeit} Jahren`,
    buergschaft: "Rückbaubürgschaft",
    buergschaftText: "vor Baubeginn hinterlegt",
    dienstbarkeit: "Dienstbarkeit im Grundbuch",
    dienstbarkeitText: "bindet auch Rechtsnachfolger",
    unterschriftLand: (land) => `Beispielrechnung mit Werten für Deutschland – ${landHinweisText(land, "Pachtwerte")}`,
    unterschrift: "Beispielrechnung mit Marktmittelwerten – Ihre Werte im Pachtrechner",
    brotkrumen: "Fläche verpachten",
    marke: "Eigentümer",
    pille: "Acker, Grünland oder Konversionsfläche · DE · AT · CH",
    titelA: "Ihre Fläche für den Solarpark. ",
    titelB: "30 Jahre planbare Einnahmen.",
    lead: "Verpachten Sie Acker, Grünland oder Konversionsfläche für einen Solarpark: mit fairer Pacht, Rückbausicherheit im Grundbuch und einem Ansprechpartner, der Ihnen den Stand jederzeit im Portal zeigt.",
    primaer: "Fläche prüfen lassen",
    sekundaer: "Pacht berechnen",
    hinweis: "Kostenfrei · unverbindlich · persönliche Rückmeldung",
    selbst: "Lieber erst selbst einschätzen?",
    check: "Flächencheck in zwei Minuten",
  },
  en: {
    zusagen: ["Assessment & contract free of charge", "Decommissioning guarantee from the start of construction", "Keep farming until construction", "Status in the portal at any time"],
    tsd: (v) => `€${fmtZahl(Math.round(v / 1000), 0, "en")}k`,
    zahlen: "en-GB",
    beispiel: "Example · ",
    steckbrief: `Lease profile · ${BEISPIEL_HA} ha`,
    beispielMarke: "Example",
    zeile: (region) => `${BEISPIEL_HA} ha · ${region} · fixed lease €${fmtZahl(PACHT.freiflaecheProHa.mittel, 0, "en")}/ha`,
    proJahr: "/ year",
    jahre: `${PACHT.laufzeit} years`,
    abIbn: "from commissioning",
    kumuliert: "Cumulative income",
    nominal: "nominal, before tax",
    jahr: (j) => `Year ${j}`,
    reihen: ["Indexed", "Fixed lease", "Avg. arable lease"],
    vergleich: "Comparison",
    vergleichText: `the average arable lease over ${PACHT.laufzeit} years`,
    buergschaft: "Decommissioning guarantee",
    buergschaftText: "deposited before construction",
    dienstbarkeit: "Easement in the land register",
    dienstbarkeitText: "also binds legal successors",
    unterschriftLand: (land) => `Example calculation with figures for Germany – ${landHinweisTextEn(land, "Lease rates")}`,
    unterschrift: "Example calculation with market averages – your own figures in the lease calculator",
    brotkrumen: "Lease your land",
    marke: "Owners",
    pille: "Arable land, grassland or conversion site · DE · AT · CH",
    titelA: "Your land for a solar park. ",
    titelB: "30 years of predictable income.",
    lead: "Lease arable land, grassland or a conversion site for a solar park: with a fair lease, decommissioning security in the land register and a contact person who shows you the status in the portal at any time.",
    primaer: "Have your land checked",
    sekundaer: "Calculate lease",
    hinweis: "Free of charge · without obligation · personal reply",
    selbst: "Prefer to assess it yourself first?",
    check: "Land check in two minutes",
  },
};

/** Regionsname des Beispiels (REGION_KURZ ist deutsch) */
const REGION_EN = { "de-sued": "Southern Germany" };

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

function PachtKomposition({ w, sprache }) {
  const tsd = w.tsd;
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
          <span className="mx-auto truncate rounded-md bg-white px-3 py-0.5 text-[11.5px] text-ink-600 ring-1 ring-ink-200"><span className="max-sm:hidden">{w.beispiel}</span>{w.steckbrief}</span>
          <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-sun-700 sm:invisible">{w.beispielMarke}</span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-[12.5px] font-medium text-ink-600">{w.zeile(sprache === "en" ? REGION_EN["de-sued"] : REGION_KURZ["de-sued"])}</p>
              <p className="mt-1.5 font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-ink-900 sm:text-[40px]">
                {sprache === "en" ? (
                  <Zaehler className="ov-num" wert={Math.round(fest.ersteJahrespacht)} vor="€" dauer={1300} verzoegerung={350} sprache="en-GB" />
                ) : (
                  <Zaehler className="ov-num" wert={Math.round(fest.ersteJahrespacht)} nach=" €" dauer={1300} verzoegerung={350} />
                )}
                <span className="ml-1.5 text-[15px] font-bold tracking-normal text-ink-500">{w.proJahr}</span>
              </p>
            </div>
            <p className="rounded-xl bg-ov-50 px-3 py-2 text-[12.5px] leading-snug text-ov-900 ring-1 ring-ov-200">
              <span className="block font-bold">{w.jahre}</span>
              {w.abIbn}
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-white ring-1 ring-ink-100">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
              <p className="text-[12.5px] font-semibold text-ink-800">{w.kumuliert}</p>
              <p className="text-[11.5px] text-ink-500">{w.nominal}</p>
            </div>
            <div className="px-4 pb-2 pt-3">
              <KumuliertChart index={index} fest={fest} />
              <div className="mt-1.5 flex justify-between text-[11px] font-medium text-ink-500">
                <span>{w.jahr(1)}</span>
                <span>{w.jahr(PACHT.laufzeit / 2)}</span>
                <span>{w.jahr(PACHT.laufzeit)}</span>
              </div>
            </div>
            <ul className="grid gap-px border-t border-ink-100 bg-ink-100 text-[12px] sm:grid-cols-3">
              {[
                { l: w.reihen[0], v: index.summeSolar, c: "bg-ov-700" },
                { l: w.reihen[1], v: fest.summeSolar, c: "bg-ov-400" },
                { l: w.reihen[2], v: fest.summeAcker, c: "bg-ink-400", gestrichelt: true },
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
          <Gauge aria-hidden="true" className="h-3.5 w-3.5" /> {w.vergleich}
        </p>
        <p className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight">
          ≈ <Zaehler wert={Math.round(fest.faktorAcker)} dauer={1100} verzoegerung={900} sprache={w.zahlen} /><span className="text-[18px] text-sun-300">×</span>
        </p>
        <p className="mt-1 text-[12px] text-white/70">{w.vergleichText}</p>
      </div>

      {/* Schwebend: Sicherheiten */}
      <div className="relative -mt-6 ml-4 mr-10 rounded-2xl bg-white p-4 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:absolute sm:-bottom-24 sm:-left-8 sm:m-0 sm:w-[300px]">
        <ul className="space-y-2.5 text-[13px]">
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white"><ShieldCheck className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block font-bold leading-tight">{w.buergschaft}</span><span className="text-ink-600">{w.buergschaftText}</span></span>
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-white"><Landmark className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block font-bold leading-tight">{w.dienstbarkeit}</span><span className="text-ink-600">{w.dienstbarkeitText}</span></span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Hero() {
  // Länderinhalt: Das Beispiel rechnet mit geprüften Werten für Deutschland. In AT/CH sagt die
  // Bildunterschrift das ausdrücklich und verweist auf die laufende Prüfung (src/lib/land/inhalte.js).
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const unterschrift = zahlenModus(land, ["DE"]) === "hinweis" ? w.unterschriftLand(land) : w.unterschrift;
  return (
    <HeroBuehne breadcrumbs={[{ name: w.brotkrumen }]}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12 xl:gap-x-20">
        <div className="max-w-[36rem]">
          <HeroPille marke={w.marke}>{w.pille}</HeroPille>

          <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
            <TextEnthuellung verzoegerung={80}>
              {w.titelA}<span className="ov-text-gradient-light">{w.titelB}</span>
            </TextEnthuellung>
          </h1>

          <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
            {w.lead}
          </p>

          <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
            <Button href="#anfrage" size="lg" pfeil magnetisch className="w-full sm:w-auto">{w.primaer}</Button>
            <Button href={pfad("/rechner/pacht")} size="lg" variant="outlineLight" className="w-full sm:w-auto">{w.sekundaer}</Button>
          </div>
          <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
            {w.hinweis}
          </p>

          <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {w.zusagen.map((x) => (
                <li key={x} className="flex items-start gap-2.5 text-[14px] leading-snug text-white/85">
                  <Haken dunkel className="mt-px" />
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
              <span>
                {w.selbst}{" "}
                <Link href={pfad("/flaechencheck")} className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                  {w.check}
                </Link>
              </span>
            </p>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-[560px] lg:mx-0 lg:ml-auto">
          <Flurkarte className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[640px] w-[640px] text-white opacity-70 max-lg:hidden" />
          <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
          <div className="ov-hero-in" style={{ "--ov-delay": "220ms" }}>
            <PachtKomposition w={w} sprache={sprache} />
          </div>
          <figcaption className="mt-8 text-center text-[12px] text-white/60 sm:mt-28">
            {unterschrift}
          </figcaption>
        </figure>
      </div>
    </HeroBuehne>
  );
}

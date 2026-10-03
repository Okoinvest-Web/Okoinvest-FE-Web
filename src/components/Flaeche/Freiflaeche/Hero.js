// Hero der Seite /freiflaeche
// Text links | Bühne rechts: Parkplan (Draufsicht) eines Beispiel-Solarparks mit abgeleiteten Kennzahlen
import { ArrowRight, Leaf, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { HeroBuehne, HeroPille, Haken } from "@/components/Flaeche/Seite/teile";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";
import { TextEnthuellung, Zaehler } from "@/components/motion";
import { FREIFLAECHE, REGIONEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

const BEISPIEL_HA = 20;

const ZUSAGEN = ["Flächensicherung bis Betrieb aus einer Hand", "Genehmigungswege in DE, AT und CH", "Rückbau vertraglich und per Bürgschaft gesichert", "Naturverträglich geplant"];

/** Draufsicht: Flurstück mit Modulreihen, Hecke, Zufahrt, Station und Kabel zum Netz */
function Parkplan() {
  const reihen = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg viewBox="0 0 520 360" className="h-auto w-full" aria-hidden="true">
      <defs>
        <clipPath id="ff-park-clip">
          <path d="M92 70 L408 46 L436 286 L118 312 Z" />
        </clipPath>
        <pattern id="ff-acker" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#d4e8bb" strokeWidth="1" />
        </pattern>
      </defs>
      {/* Umgebung: Nachbarfelder */}
      <rect width="520" height="360" fill="#f4f8ee" />
      <path d="M0 0 L120 0 L92 70 L0 80 Z" fill="url(#ff-acker)" />
      <path d="M408 46 L520 30 L520 200 L428 214 Z" fill="url(#ff-acker)" />
      <path d="M0 230 L110 250 L118 312 L0 330 Z" fill="#eef5e4" />
      {/* Feldweg / Zufahrt */}
      <path d="M-10 196 C 40 190, 70 200, 104 196" stroke="#e7e1cf" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M-10 196 C 40 190, 70 200, 104 196" stroke="#d9d1b8" strokeWidth="1" strokeDasharray="6 6" fill="none" />
      {/* Fläche mit Grünland */}
      <path d="M92 70 L408 46 L436 286 L118 312 Z" fill="#dcecc6" />
      <path d="M92 70 L408 46 L436 286 L118 312 Z" pathLength="1" fill="none" stroke="#558227" strokeWidth="2" className={aufbau.zeichnen} style={{ "--zeichnen-dauer": "900ms" }} />
      {/* Modulreihen */}
      <g clipPath="url(#ff-park-clip)">
        {reihen.map((i) => (
          <g key={i} className={aufbau.fallen} style={{ "--i": i + 4 }}>
            <g transform={`rotate(-4.5 260 ${78 + i * 18})`}>
              <rect x="112" y={74 + i * 18} width="304" height="9" rx="1.5" fill="#1d3f74" />
              <rect x="112" y={74 + i * 18} width="304" height="3" rx="1" fill="#3c6aa8" />
            </g>
          </g>
        ))}
        {/* Wartungsgasse */}
        <rect x="250" y="40" width="14" height="300" fill="#dcecc6" transform="rotate(-4.5 257 190)" />
      </g>
      {/* Hecke am Rand */}
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={96 + i * 1.6 + 2} cy={84 + i * 14} r="6.5" fill="#558227" fillOpacity={0.75 - (i % 3) * 0.12} className={aufbau.pop} style={{ "--i": i }} />
      ))}
      {/* Station */}
      <g className={aufbau.pop} style={{ "--i": 18 }}>
        <rect x="400" y="262" width="26" height="18" rx="3" fill="#03122b" />
        <path d="M414 265 L409 272 L414 272 L411 278 L419 270 L414 270 Z" fill="#f5a70f" />
      </g>
      {/* Kabel zum Netzverknüpfungspunkt */}
      <path d="M426 271 C 460 280, 470 320, 500 330" stroke="#f5a70f" strokeWidth="2.2" strokeDasharray="6 6" fill="none" className={aufbau.ein} style={{ "--ein-start": "1350ms" }} />
      <g className={aufbau.pop} style={{ "--i": 21 }}>
        <circle cx="502" cy="331" r="7" fill="#f5a70f" />
        <circle cx="502" cy="331" r="14" fill="none" stroke="#f5a70f" strokeOpacity="0.4" />
      </g>
      {/* Nordpfeil */}
      <g transform="translate(476 40)">
        <circle r="15" fill="#fff" stroke="#dfe3ea" />
        <path d="M0 -9 L5 5 L0 2 L-5 5 Z" fill="#03122b" />
      </g>
    </svg>
  );
}

function ParkKomposition() {
  const sued = REGIONEN.find((r) => r.id === "de-sued");
  const mwp = BEISPIEL_HA / FREIFLAECHE.haProMwp;
  const mwh = mwp * sued.ertrag;
  const haushalte = Math.round(mwh / 3.5 / 10) * 10;
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-white text-ink-900 shadow-e5 ring-1 ring-white/30">
        <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6159]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto truncate rounded-md bg-white px-3 py-0.5 text-[11.5px] text-ink-600 ring-1 ring-ink-200">Parkplan · Beispiel {BEISPIEL_HA} ha</span>
          <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-sun-700">Schema</span>
        </div>
        <div className="relative">
          <Aufbau sofort verzoegerung={260} schritt={60} style={{ "--pop-start": "250ms", "--pop-schritt": "45ms" }}>
            <Parkplan />
          </Aufbau>
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-ink-800 shadow-e2 ring-1 ring-ink-200 sm:left-4 sm:top-4">
            Grünland unter den Modulen
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-navy-950 px-2.5 py-1 text-[11.5px] font-semibold text-white shadow-e2 sm:bottom-4 sm:right-12">
            Kabel zum Netz
          </span>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100">
          {[
            { w: Math.round(mwp), n: 0, e: "MWp", l: "Leistung" },
            { w: Math.round(mwh / 1000), n: 0, e: "GWh/a", l: "Strom (Süd-DE)" },
            { w: Math.round(haushalte / 100) / 10, n: 1, e: "Tsd.", l: "Haushalte" },
          ].map((k, i) => (
            <div key={k.l} className="px-3 py-3.5 sm:px-5">
              <dt className="text-[11.5px] font-medium text-ink-500">{k.l}</dt>
              <dd className="ov-num mt-1 font-display text-[19px] font-extrabold leading-none tracking-tight text-ink-900 sm:text-[24px]">
                ≈ <Zaehler wert={k.w} nachkomma={k.n} dauer={1200} verzoegerung={700 + i * 120} />
                <span className="mt-1 block text-[12px] font-bold tracking-normal text-ink-500 sm:ml-1 sm:mt-0 sm:inline">{k.e}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="absolute -left-10 -top-20 hidden rounded-2xl bg-navy-900/90 px-4 py-3 text-white shadow-e4 ring-1 ring-white/15 backdrop-blur sm:block">
        <p className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-300">
          <Leaf aria-hidden="true" className="h-3.5 w-3.5" /> Versiegelung
        </p>
        <p className="mt-1 font-display text-[22px] font-extrabold leading-none tracking-tight">meist &lt; 5 %</p>
        <p className="mt-1 text-[12px] text-white/70">der Fläche – der Rest bleibt Grünland</p>
      </div>

      <div className="relative mt-3 w-fit rounded-2xl bg-white p-3.5 pr-5 text-ink-900 shadow-e4 ring-1 ring-ink-200/70 sm:absolute sm:-right-8 sm:top-[42%] sm:m-0">
        <p className="flex items-center gap-3 text-[13px]">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white"><ShieldCheck className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block font-bold leading-tight">Rückbau nach {FREIFLAECHE.laufzeit} Jahren</span><span className="text-ink-600">per Bürgschaft gesichert</span></span>
        </p>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <HeroBuehne breadcrumbs={[{ name: "Freiflächen-PV" }]}>
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-12 xl:gap-x-20">
        <div className="max-w-[36rem]">
          <HeroPille marke="DACH">Freiflächen-Photovoltaik ab rund {FREIFLAECHE.mindestHa} Hektar</HeroPille>
          <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
            <TextEnthuellung verzoegerung={80}>
              Solarparks, die <span className="ov-text-gradient-light">genehmigt werden</span> – und 30 Jahre tragen.
            </TextEnthuellung>
          </h1>
          <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
            Wir entwickeln Freiflächenanlagen ab rund 3 Hektar: von der Flächensicherung über Netzanschluss und Bebauungsplan bis zum Bau und Betrieb – als Teil einer Gruppe, die seit 2012 eigene Solarparks betreibt.
          </p>
          <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
            <Button href={pfad("/flaechencheck")} size="lg" pfeil magnetisch className="w-full sm:w-auto">Fläche prüfen</Button>
            <Button href={pfad("/rechner/pacht")} size="lg" variant="outlineLight" className="w-full sm:w-auto">Pacht berechnen</Button>
          </div>
          <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
            Flächencheck kostenlos und ohne Anmeldung · Ergebnis sofort
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
                Eigentümer einer Fläche?{" "}
                <a href={pfad("/flaeche-verpachten")} className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                  So funktioniert die Verpachtung
                </a>
              </span>
            </p>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-[600px] lg:mx-0 lg:ml-auto">
          <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
          <div className="ov-hero-in" style={{ "--ov-delay": "220ms" }}>
            <ParkKomposition />
          </div>
          <figcaption className="mt-8 text-center text-[12px] text-white/60 sm:mt-16">
            Schematische Darstellung · Kennzahlen aus {fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp und regionalem Ertrag
          </figcaption>
        </figure>
      </div>
    </HeroBuehne>
  );
}

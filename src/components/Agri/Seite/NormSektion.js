// DIN SPEC 91434: zwei Kategorien als Querschnitt-Grafik + Messleisten (Server-Komponente)
import { Check } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { Eyebrow } from "@/components/ui/SectionHeading";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/** Sprachmodell: Texte des Abschnitts (en nur Texte). */
const W = {
  de: {
    kat1Label: "Querschnitt Kategorie I: Moduldach auf hohen Stützen, darunter Beerensträucher und ein Traktor; lichte Höhe mindestens 2,10 Meter.",
    kat2Label: "Querschnitt Kategorie II: senkrechte Modulreihen mit breiten Gassen, in denen Getreide wächst und ein Traktor fährt.",
    kategorien: [
      { k: "Kategorie I", t: "Hoch aufgeständert", p: ["Bewirtschaftung unter den Modulen", "lichte Höhe mind. 2,10 m"] },
      { k: "Kategorie II", t: "Bodennah", p: ["Bewirtschaftung zwischen den Reihen", "vertikal, nachgeführt oder geneigt"] },
    ],
    titel: "Wann eine Anlage als Agri-PV gilt.",
    lead: "Die DIN SPEC 91434 (2021) ist in Deutschland die Grundlage für Förderfähigkeit in der GAP, die EEG-Förderung als besondere Solaranlage und die baurechtliche Privilegierung. Sie verlangt ein landwirtschaftliches Nutzungskonzept – vor der Planung der Module.",
    hoehe: "≥ 2,10 m",
    gasse: "Gasse nach Arbeitsbreite",
    verlust: "Flächenverlust ≤ ",
    verlustLabel: "Flächenverlust durch Aufbauten",
    beide: "Für beide Kategorien",
    beideA: "Der landwirtschaftliche Ertrag muss mindestens ",
    beideB: (p) => `${p} des Referenzertrags`,
    beideC: " ohne Anlage erreichen, die Bewirtschaftung mit üblicher Technik muss möglich bleiben, und der Rückbau muss gesichert sein. Für die Nutzung mit Tieren und für Dauerkulturen gelten ergänzende Anforderungen.",
    ertragA: "Landwirtschaftlicher Ertrag",
    ertragB: " gegenüber Referenz",
    mindest: "Mindestwert",
    referenz: "100 % Referenz",
  },
  en: {
    kat1Label: "Cross-section of category I: module roof on tall supports, with berry bushes and a tractor underneath; clearance at least 2.10 metres.",
    kat2Label: "Cross-section of category II: upright module rows with wide lanes in which cereals grow and a tractor drives.",
    kategorien: [
      { k: "Category I", t: "Elevated", p: ["Farming underneath the modules", "clearance of at least 2.10 m"] },
      { k: "Category II", t: "Ground-level", p: ["Farming between the rows", "vertical, tracking or tilted"] },
    ],
    titel: "When an installation counts as agrivoltaics.",
    lead: "In Germany, DIN SPEC 91434 (2021) is the basis for eligibility under the CAP (Common Agricultural Policy), EEG funding as a special solar installation and privileged status under building law. It requires an agricultural use concept – before the modules are planned.",
    hoehe: "≥ 2.10 m",
    gasse: "Lane per working width",
    verlust: "Land loss ≤ ",
    verlustLabel: "Land loss through structures",
    beide: "For both categories",
    beideA: "The agricultural yield must reach at least ",
    beideB: (p) => `${p} of the reference yield`,
    beideC: " without the installation, farming with standard machinery must remain possible, and decommissioning must be secured. Additional requirements apply to use with livestock and to permanent crops.",
    ertragA: "Agricultural yield",
    ertragB: " compared with reference",
    mindest: "Minimum",
    referenz: "100 % reference",
  },
};

/* ---------- Querschnitte ---------- */

function Traktor({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="-26" width="36" height="14" rx="3" className="fill-ov-600" />
      <rect x="18" y="-46" width="17" height="21" rx="2.5" className="fill-ov-700" />
      <rect x="21.5" y="-42.5" width="10" height="9" rx="1" className="fill-navy-100" />
      <circle cx="28" cy="-10" r="10" className="fill-ink-800" />
      <circle cx="28" cy="-10" r="3.6" className="fill-ink-300" />
      <circle cx="6" cy="-7" r="7" className="fill-ink-800" />
      <circle cx="6" cy="-7" r="2.4" className="fill-ink-300" />
    </g>
  );
}

function Strauch({ x, y }) {
  return (
    <g>
      <rect x={x - 1.5} y={y - 12} width="3" height="12" className="fill-ink-500" />
      <circle cx={x} cy={y - 19} r="11" className="fill-ov-500" />
      <circle cx={x - 4} cy={y - 23} r="5" className="fill-ov-400" />
      <circle cx={x - 4} cy={y - 16} r="2" className="fill-danger-500" />
      <circle cx={x + 5} cy={y - 20} r="2" className="fill-danger-500" />
    </g>
  );
}

function Halme({ x, y, n, abstand = 6 }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <line x1={x + i * abstand} x2={x + i * abstand} y1={y - 1} y2={y - 16} strokeWidth="1.4" className="stroke-ov-600" />
          <ellipse cx={x + i * abstand} cy={y - 18} rx="1.8" ry="3.6" className="fill-sun-400" />
        </g>
      ))}
    </g>
  );
}

function SchnittKat1({ w }) {
  const boden = 168;
  return (
    <svg viewBox="0 0 360 200" className="block h-auto w-full" role="img" aria-label={w.kat1Label}>
      <rect width="360" height={boden} className="fill-navy-50" />
      <circle cx="320" cy="34" r="16" className="fill-sun-300" />
      {/* Stützen und Dach */}
      {[54, 180, 306].map((x) => (
        <rect key={x} x={x - 2.5} y="58" width="5" height={boden - 58} className="fill-ink-500" />
      ))}
      <rect x="40" y="54" width="280" height="5" rx="1" className="fill-ink-600" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={46 + i * 34} y1="54" x2={70 + i * 34} y2="42" strokeWidth="6" strokeLinecap="round" className="stroke-navy-700" />
      ))}
      {/* Schatten */}
      <ellipse cx="180" cy={boden + 2} rx="150" ry="6" className="fill-navy-900/10" />
      {[90, 128, 222, 262].map((x) => (
        <Strauch key={x} x={x} y={boden} />
      ))}
      <Traktor x={150} y={boden} s={0.95} />
      {/* Höhenmaß */}
      <line x1="24" x2="24" y1="62" y2={boden - 3} strokeDasharray="3 3" strokeWidth="1.4" className="stroke-ov-700" />
      <path d={`M19 68 L24 61 L29 68 M19 ${boden - 9} L24 ${boden - 2} L29 ${boden - 9}`} fill="none" strokeWidth="1.4" className="stroke-ov-700" />
      <rect x="31" y="98" width="62" height="22" rx="11" className="fill-white stroke-ov-300" />
      <text x="62" y="113" textAnchor="middle" className="fill-ov-800 text-[11px] font-bold">{w.hoehe}</text>
      {/* Boden */}
      <rect y={boden} width="360" height="32" className="fill-sand-100" />
      <rect y={boden - 3} width="360" height="6" rx="3" className="fill-ov-300" />
      <text x="180" y="190" textAnchor="middle" className="fill-ink-600 text-[10px] font-semibold">{w.kategorien[0].p[0]}</text>
    </svg>
  );
}

function SchnittKat2({ w }) {
  const boden = 168;
  const reihen = [40, 180, 320];
  return (
    <svg viewBox="0 0 360 200" className="block h-auto w-full" role="img" aria-label={w.kat2Label}>
      <rect width="360" height={boden} className="fill-navy-50" />
      <circle cx="320" cy="34" r="16" className="fill-sun-300" />
      {reihen.map((x) => (
        <g key={x}>
          <rect x={x - 2} y={boden - 74} width="4" height="74" className="fill-ink-500" />
          <rect x={x - 5} y={boden - 70} width="10" height="50" rx="2" className="fill-navy-700" />
          <line x1={x} x2={x} y1={boden - 70} y2={boden - 20} stroke="#fff" strokeOpacity="0.45" />
        </g>
      ))}
      <Halme x={56} y={boden} n={4} abstand={7} />
      <Traktor x={92} y={boden} s={0.95} />
      <Halme x={140} y={boden} n={4} abstand={7} />
      <Halme x={196} y={boden} n={17} abstand={7} />
      {/* Gassenmaß */}
      <line x1="46" x2="174" y1="78" y2="78" strokeDasharray="3 3" strokeWidth="1.4" className="stroke-ov-700" />
      <path d="M52 73 L45 78 L52 83 M168 73 L175 78 L168 83" fill="none" strokeWidth="1.4" className="stroke-ov-700" />
      <rect x="44" y="40" width="132" height="24" rx="12" className="fill-white stroke-ov-300" />
      <text x="110" y="56" textAnchor="middle" className="fill-ov-800 text-[11px] font-bold">{w.gasse}</text>
      <rect y={boden} width="360" height="32" className="fill-sand-100" />
      <rect y={boden - 3} width="360" height="6" rx="3" className="fill-ov-300" />
      <text x="180" y="190" textAnchor="middle" className="fill-ink-600 text-[10px] font-semibold">{w.kategorien[1].p[0]}</text>
    </svg>
  );
}

/* ---------- Messleiste ---------- */

/** Horizontaler Balken mit Grenzmarke; wert/skala in Anteilen (0–1) */
function Grenzleiste({ label, wert, skala = 0.2, text, ton = "ov" }) {
  const breite = `${Math.min(100, (wert / skala) * 100)}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="ov-num font-display text-[15px] font-bold text-ink-900">≤ {text}</span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-ink-100" aria-hidden="true">
        <div className={ton === "ov" ? "h-full rounded-full bg-gradient-to-r from-ov-300 to-ov-500" : "h-full rounded-full bg-gradient-to-r from-navy-300 to-navy-600"} style={{ width: breite }} />
        <span className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-ink-900" style={{ left: breite }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-500" aria-hidden="true">
        <span>0 %</span>
        <span>{Math.round(skala * 100)} %</span>
      </div>
    </div>
  );
}

/* ---------- Abschnitt ---------- */

export default function NormSektion({ id, kat1Verlust, kat2Verlust, mindestErtrag, pct }) {
  const w = uebersetze(W, spracheDerAnfrage());
  const kategorien = [
    { ...w.kategorien[0], bild: <SchnittKat1 w={w} />, verlust: kat1Verlust },
    { ...w.kategorien[1], bild: <SchnittKat2 w={w} />, verlust: kat2Verlust },
  ];

  return (
    <section id={id} data-abschnitt="norm" aria-labelledby="norm-titel" className="scroll-mt-24 bg-white py-20 md:py-28">
      <div className="ov-container">
        <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <Reveal>
            <Eyebrow className="mb-4">DIN SPEC 91434</Eyebrow>
            <h2 id="norm-titel" className="ov-h2 text-balance text-ink-900">{w.titel}</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">{w.lead}</p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2">
          {kategorien.map((c, i) => (
            <Reveal key={c.k} delay={i * 90} className="flex flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-e2 ring-1 ring-ink-200/70">
              <div className="border-b border-ink-100 bg-navy-50">{c.bild}</div>
              <div className="flex flex-1 flex-col p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-ov-50 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ov-700 ring-1 ring-inset ring-ov-200">{c.k}</span>
                </div>
                <h3 className="ov-h3 mt-4 text-ink-900">{c.t}</h3>
                <ul className="mt-4 space-y-2.5">
                  {c.p.map((x) => (
                    <li key={x} className="flex gap-2.5 text-[15px] text-ink-700">
                      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-50 ring-1 ring-inset ring-ov-200">
                        <Check className="h-3 w-3 text-ov-600" strokeWidth={3} />
                      </span>
                      {x}
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-[15px] text-ink-700">
                    <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-50 ring-1 ring-inset ring-ov-200">
                      <Check className="h-3 w-3 text-ov-600" strokeWidth={3} />
                    </span>
                    {w.verlust}{pct(c.verlust)}
                  </li>
                </ul>
                <div className="mt-auto pt-7">
                  <Grenzleiste label={w.verlustLabel} wert={c.verlust} text={pct(c.verlust)} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Für beide Kategorien */}
        <Reveal delay={120} className="ov-noise relative mt-5 overflow-hidden rounded-[1.75rem] bg-navy-950 p-6 text-white md:p-10">
          <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-40" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/25 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14">
            <div>
              <p className="ov-overline text-ov-300">{w.beide}</p>
              <p className="mt-3 text-pretty text-[16px] leading-relaxed text-white/75">
                {w.beideA}<strong className="text-white">{w.beideB(pct(mindestErtrag))}</strong>{w.beideC}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10 md:p-6">
              <div className="flex items-end justify-between gap-4">
                <p className="text-[13px] font-medium text-white/70">{w.ertragA}<br className="sm:hidden" />{w.ertragB}</p>
                <p className="ov-kpi-l shrink-0 whitespace-nowrap text-white">
                  ≥&nbsp;{Math.round(mindestErtrag * 100)}
                  <span className="ov-einheit">%</span>
                </p>
              </div>
              <div className="relative mt-4 h-3 rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-ov-500 to-ov-300" style={{ width: `${mindestErtrag * 100}%` }} />
                <span className="absolute -top-1.5 h-6 w-0.5 rounded-full bg-sun-300" style={{ left: `${mindestErtrag * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11.5px] text-white/55" aria-hidden="true">
                <span>0 %</span>
                <span className="text-sun-200">{w.mindest}</span>
                <span>{w.referenz}</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

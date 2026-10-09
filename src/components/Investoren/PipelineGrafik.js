import { PHASEN } from "@/lib/invest/markt";
import { KENNZAHLEN } from "@/data/site";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

const TEXTE = {
  de: {
    bau: "Bau",
    titel: "Drei Jahrgänge im Zeitverlauf",
    region: "Schematische Projektpipeline",
    aria: (mw, m) => `Schema: Jedes Jahr starten rund ${mw} MWp neu in die Entwicklung; bis zur Baureife vergehen typischerweise rund ${m} Monate, danach folgt der Bau.`,
    jahr: (j) => `Jahr ${j}`,
    rtb: "Baureife (RTB) – ab hier kaufen viele institutionelle Investoren",
    fuss: "Schematische Darstellung mit typischen Dauern je Phase. Nicht jede Fläche wird zum Projekt: Netz, Planung oder Gemeinde können ein Vorhaben stoppen oder verzögern.",
  },
  en: {
    bau: "Construction",
    titel: "Three annual cohorts over time",
    region: "Schematic project pipeline",
    aria: (mw, m) => `Diagram: each year, around ${mw} MWp of new capacity enters development; reaching ready-to-build typically takes around ${m} months, followed by construction.`,
    jahr: (j) => `Year ${j}`,
    rtb: "Ready-to-build (RTB) – many institutional investors buy from here",
    fuss: "Schematic illustration with typical durations per stage. Not every site becomes a project: the grid, planning or the municipality can stop or delay a project.",
  },
};

/**
 * Schematische Pipeline: Jedes Jahr gehen rund 50 MWp neu in die Entwicklung,
 * baureif werden sie typischerweise erst Jahre später. Die Segmentlängen
 * folgen den typischen Monaten bis RTB aus PHASEN. Server-Komponente, SVG.
 */

const FARBEN = ["#cde3b1", "#aed083", "#8cba58", "#669933", "#1f5aa1"];

export default function PipelineGrafik() {
  const sprache = spracheDerAnfrage();
  const t = uebersetze(TEXTE, sprache);
  const kurz = (p) => (sprache === "en" ? BEGRIFFE_EN.phaseKurz[p.id] ?? p.kurz : p.kurz);
  const phasen = PHASEN.filter((p) => p.id !== "cod");
  // Segmente: Dauer von Phase i bis Phase i+1 in Monaten
  const segmente = phasen.slice(0, -1).map((p, i) => ({ id: p.id, label: kurz(p), monate: p.monateBisRtb - phasen[i + 1].monateBisRtb }));
  const bau = 9; // Bau bis Inbetriebnahme, grob
  segmente.push({ id: "bau", label: t.bau, monate: bau });
  const jahrgaenge = 3;
  const monateGesamt = 12 * (jahrgaenge - 1) + phasen[0].monateBisRtb + bau;
  const W = 760;
  const L = 96;
  const R = 12;
  const zeileH = 50;
  const oben = 34;
  const H = oben + jahrgaenge * zeileH + 64;
  const x = (m) => L + (m / monateGesamt) * (W - L - R);
  const jahre = Math.ceil(monateGesamt / 12);

  return (
    <figure className="rounded-[1.75rem] bg-white p-4 shadow-e2 ring-1 ring-ink-200/70 md:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1">
        <p className="font-display text-[16px] font-bold text-ink-900">{t.titel}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-600">
          {segmente.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: FARBEN[i] || "#1f5aa1" }} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t.region}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={t.aria(KENNZAHLEN.entwicklungMwProJahr, phasen[0].monateBisRtb)}>
          {Array.from({ length: jahre + 1 }, (_, j) => (
            <g key={j}>
              <line x1={x(j * 12)} x2={x(j * 12)} y1={oben - 10} y2={oben + jahrgaenge * zeileH} stroke="#eef0f4" />
              {j < jahre && (
                <text x={x(j * 12 + 6)} y={oben - 16} textAnchor="middle" className="fill-ink-500 text-[12px]">
                  {t.jahr(j + 1)}
                </text>
              )}
            </g>
          ))}
          {Array.from({ length: jahrgaenge }, (_, k) => {
            let m = k * 12;
            const y = oben + k * zeileH + 8;
            return (
              <g key={k}>
                <text x={L - 12} y={y + 19} textAnchor="end" className="fill-ink-700 text-[12.5px] font-semibold">
                  {`+ ${KENNZAHLEN.entwicklungMwProJahr} MWp`}
                </text>
                {/* Einlauf (über das umgebende Reveal): Jeder Jahrgang wächst Phase für Phase nach rechts,
                    der nächste startet versetzt – so wird sichtbar, dass Baureife zeitversetzt entsteht */}
                {segmente.map((s, i) => {
                  const x0 = x(m);
                  m += s.monate;
                  const w = x(m) - x0 - 2;
                  return (
                    <g key={s.id}>
                      <rect x={x0} y={y} width={w} height={30} rx={8} fill={FARBEN[i] || "#1f5aa1"} className="ov-balken-x" style={{ "--i": k * 4 + i * 2 }} />
                    </g>
                  );
                })}
                <circle cx={x(k * 12 + phasen[0].monateBisRtb)} cy={y + 14} r="5" fill="#ffc53d" stroke="#fff" strokeWidth="2" className="ov-flaeche-ein" style={{ animationDelay: `${(k * 4 + segmente.length * 2) * 40 + 380}ms` }} />
              </g>
            );
          })}
          <g transform={`translate(${L}, ${oben + jahrgaenge * zeileH + 30})`}>
            <circle cx="6" cy="0" r="5" fill="#ffc53d" />
            <text x="18" y="4" className="fill-ink-600 text-[12px]">{t.rtb}</text>
          </g>
        </svg>
      </div>
      <figcaption className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-500">
        {t.fuss}
      </figcaption>
    </figure>
  );
}

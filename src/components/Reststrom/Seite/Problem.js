// „Das Problem“ – drei Gründe plus Schema „Stichtag vs. Tranchen“
// Paket D: Tranchen-Aussage ohne Ersparnisversprechen; Teil-Marktrisiko beim Kunden
// offengelegt (vgl. docs/ENERGIEBESCHAFFUNG.md, Abschnitt Tranchen).
import { CalendarClock, FileSignature, Layers } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

const PROBLEME = [
  { icon: FileSignature, title: "Einzelvertrag", text: "Mit ein paar hundert MWh ist ein Betrieb für Lieferanten ein kleiner Kunde. Verhandlungsmacht hat, wer Menge bündelt – nicht, wer allein anfragt." },
  { icon: CalendarClock, title: "Stichtagsrisiko", text: "Der gesamte Jahresbedarf wird oft an einem Tag eingekauft. Erwischt die Ausschreibung eine Preisspitze, zahlen Sie sie zwei oder drei Jahre lang." },
  { icon: Layers, title: "Aufschläge und Risikoprämien", text: "Vertriebsmarge, Strukturierungskosten und Prämien für das Mengenrisiko stecken unsichtbar im Arbeitspreis – bei kleinen Abnehmern besonders hoch." },
];

/* Schematischer Preisverlauf (keine echten Daten) */
const PUNKTE = [42, 46, 44, 52, 60, 74, 92, 80, 66, 58, 63, 55, 50, 54, 48, 45, 50, 47, 43, 46];
const W = 560;
const H = 200;
const x = (i) => 24 + (i / (PUNKTE.length - 1)) * (W - 48);
const y = (v) => H - 30 - ((v - 30) / 70) * (H - 60);
const pfad = PUNKTE.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
const TRANCHEN = [1, 4, 7, 10, 13, 16, 19];
const stichtag = 6;

export default function Problem() {
  return (
    <section data-abschnitt="problem" aria-labelledby="problem-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow="Das Problem"
          title={<span id="problem-titel">Warum der Einzelvertrag für den Mittelstand oft teuer wird</span>}
          lead="Große Industrie beschafft strukturiert, mit eigenen Händlern und PPAs. Der Mittelstand unterschreibt meist einen Einzelvertrag – und trägt dessen Risiken allein."
          className="mb-10 md:mb-14"
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-8">
          {/* Schema */}
          <Reveal className="relative overflow-hidden rounded-[1.75rem] bg-navy-950 p-5 text-white sm:p-7">
            <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-display text-[17px] font-bold">Stichtag oder Tranchen?</p>
              <p className="text-[12px] text-white/60">Schema, keine echten Kurse</p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="relative mt-4 h-auto w-full" role="img" aria-label="Schema: Ein Einkauf am Stichtag kann genau auf eine Preisspitze fallen. Ein Einkauf in mehreren Tranchen über einen längeren Zeitraum glättet den Durchschnitt – er kann aber auch Preistäler verpassen.">
              <defs>
                <linearGradient id="rs-flaeche" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#8cba58" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#8cba58" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((k) => (
                <line key={k} x1="24" x2={W - 24} y1={30 + k * 46.6} y2={30 + k * 46.6} stroke="rgba(255,255,255,0.07)" />
              ))}
              {/* Einlauf (über das umgebende Reveal): Preiskurve zeichnet sich, der Stichtag landet auf der Spitze,
                  danach erscheinen die Tranchen nacheinander und ihr geglätteter Durchschnitt – die Aussage als Abfolge */}
              <path d={`${pfad} L${x(PUNKTE.length - 1)},${H - 30} L${x(0)},${H - 30} Z`} fill="url(#rs-flaeche)" className="ov-flaeche-ein" />
              <path d={pfad} pathLength="1" fill="none" stroke="#aed083" strokeWidth="2.5" strokeLinejoin="round" className="ov-linie" />
              {/* Durchschnitt Tranchen */}
              {(() => {
                const avg = TRANCHEN.reduce((s, i) => s + PUNKTE[i], 0) / TRANCHEN.length;
                return (
                  <g className="ov-flaeche-ein" style={{ animationDelay: `${1350 + TRANCHEN.length * 90}ms` }}>
                    <line x1="24" x2={W - 24} y1={y(avg)} y2={y(avg)} stroke="#aed083" strokeDasharray="5 5" strokeOpacity="0.8" />
                    <text x={W - 26} y={y(avg) - 8} textAnchor="end" fontSize="15" fill="#cde3b1" fontWeight="600">Ø Pool in Tranchen</text>
                  </g>
                );
              })()}
              {TRANCHEN.map((i, k) => (
                <circle key={i} cx={x(i)} cy={y(PUNKTE[i])} r="5" fill="#0b1a33" stroke="#aed083" strokeWidth="2.5" className="ov-flaeche-ein" style={{ animationDelay: `${1300 + k * 90}ms` }} />
              ))}
              <g className="ov-flaeche-ein" style={{ animationDelay: "800ms" }}>
                <circle cx={x(stichtag)} cy={y(PUNKTE[stichtag])} r="8" fill="#f5a70f" stroke="#0b1a33" strokeWidth="3" />
                <text x={x(stichtag) + 14} y={y(PUNKTE[stichtag]) + 4} fontSize="15" fill="#ffd27a" fontWeight="700">Stichtag</text>
              </g>
              <text x="24" y={H - 8} fontSize="13" fill="rgba(255,255,255,0.6)">Zeit bis Lieferbeginn →</text>
            </svg>
            <div className="relative mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
              <p className="flex items-start gap-2.5 text-white/75"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full bg-sun-500" />Einzelvertrag: ganzer Bedarf an einem Tag&nbsp;– Spitze inklusive.</p>
              <p className="flex items-start gap-2.5 text-white/75"><span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-ov-300" />Tranchen: viele Einkäufe über Monate&nbsp;– Spitzen und Täler mitteln sich.</p>
            </div>
            <p className="relative mt-3 text-[12.5px] leading-relaxed text-white/60">
              Tranchen glätten den Preis, machen ihn aber nicht automatisch niedriger. Ein Teil des Marktrisikos bleibt bei Ihnen; welches Modell passt (Festpreis, Tranchen, Spot), klären wir vor der Ausschreibung.
            </p>
          </Reveal>

          {/* Gründe */}
          <ol className="grid gap-3">
            {PROBLEME.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 70} className="flex gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70 sm:p-6">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-700 ring-1 ring-ov-200">
                  <p.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <span className="ov-num block text-[12px] font-bold tracking-[0.12em] text-ov-700">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-0.5 font-display text-[18px] font-bold text-ink-900">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

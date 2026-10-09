// Marktbild unter dem Hero: echte Kennzahlen der Börse + Verteilung nach Phase.
// Alle Werte werden aus den veröffentlichten Projekten berechnet – keine festen Zahlen.
import { PHASEN } from "@/lib/invest/markt";
import { LAENDER } from "@/lib/plattform/konstanten";
import { fmt } from "@/lib/rechner/annahmen";
import { cn } from "@/components/ui/cn";
import Reveal from "@/components/ui/Reveal";
import Zaehler from "@/components/motion/Zaehler";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

// Phasen von früh (hell) nach spät (kräftig) – eine Farbfamilie, damit der Reifegrad lesbar bleibt
const PHASEN_FARBE = ["bg-ov-200", "bg-ov-300", "bg-ov-400", "bg-ov-500", "bg-ov-700", "bg-navy-800"];

export default function Marktbild({ projekte = [], kennzahlen }) {
  if (!projekte.length || !kennzahlen) return null;
  const anzahl = projekte.length;
  const proPhase = PHASEN.map((p, i) => ({ ...p, farbe: PHASEN_FARBE[i], n: projekte.filter((x) => x.phase === p.id).length })).filter((p) => p.n > 0);
  const laender = Object.keys(LAENDER).filter((k) => projekte.some((p) => p.land === k));

  const en = spracheDerAnfrage() === "en";
  const kurz = (p) => (en ? BEGRIFFE_EN.phaseKurz[p.id] ?? p.kurz : p.kurz);
  const zahlen = en
    ? [
        { wert: fmtZahl(kennzahlen.anzahl, 0, "en"), zahl: kennzahlen.anzahl, stellen: 0, einheit: kennzahlen.anzahl === 1 ? "project" : "projects", text: "currently published on the exchange" },
        { wert: fmtZahl(kennzahlen.mwp, kennzahlen.mwp < 100 ? 1 : 0, "en"), zahl: Number(kennzahlen.mwp), stellen: kennzahlen.mwp < 100 ? 1 : 0, einheit: "MWp", text: "capacity across all projects" },
        { wert: fmtZahl(kennzahlen.laender, 0, "en"), zahl: kennzahlen.laender, stellen: 0, einheit: kennzahlen.laender === 1 ? "country" : "countries", text: laender.map((k) => BEGRIFFE_EN.land[k] ?? LAENDER[k]).join(", ") },
      ]
    : [
        { wert: fmt(kennzahlen.anzahl), zahl: kennzahlen.anzahl, stellen: 0, einheit: kennzahlen.anzahl === 1 ? "Projekt" : "Projekte", text: "aktuell in der Börse veröffentlicht" },
        { wert: fmt(kennzahlen.mwp, kennzahlen.mwp < 100 ? 1 : 0), zahl: Number(kennzahlen.mwp), stellen: kennzahlen.mwp < 100 ? 1 : 0, einheit: "MWp", text: "Leistung über alle Projekte" },
        { wert: fmt(kennzahlen.laender), zahl: kennzahlen.laender, stellen: 0, einheit: kennzahlen.laender === 1 ? "Land" : "Länder", text: laender.map((k) => LAENDER[k]).join(", ") },
      ];

  return (
    <section data-abschnitt="marktbild" aria-labelledby="marktbild-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="marktbild-titel" className="sr-only">{en ? "The exchange in figures" : "Die Börse in Zahlen"}</h2>
      <div className="ov-container">
        <div className="relative grid rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid grid-cols-1 px-5 sm:grid-cols-3 sm:px-2 lg:px-0 lg:py-3">
            {zahlen.map((z, i) => (
              <div key={z.einheit} className={cn("grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline gap-x-3 border-ink-100 py-4 sm:block sm:px-5 sm:py-6 lg:px-7 lg:py-5", i > 0 && "border-t sm:border-l sm:border-t-0")}>
                <dt className="sr-only">{z.einheit}</dt>
                <dd className="ov-num font-display text-[30px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[34px]">
                  {/* Count-up mit den echten Börsenwerten (Server-HTML enthält den Endwert) */}
                  {Number.isFinite(z.zahl) ? <Zaehler wert={z.zahl} nachkomma={z.stellen} verzoegerung={i * 100} dauer={1200} sprache={en ? "en-GB" : undefined} /> : z.wert}<span className="ml-1.5 text-[15px] font-bold tracking-normal text-ov-700">{z.einheit}</span>
                </dd>
                <dd className="text-[13px] leading-snug text-ink-500 sm:mt-2">{z.text}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-ink-100 px-5 py-5 sm:px-7 lg:border-l lg:border-t-0 lg:py-7">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">{en ? "Projects by stage" : "Projekte nach Phase"}</p>
              <p className="text-[12px] text-ink-500">{en ? "early → operating" : "früh → in Betrieb"}</p>
            </div>
            {/* Verteilung baut sich beim Eintritt von früh nach spät auf (Segmente wachsen gestaffelt, nur transform) */}
            <Reveal dir="ohne" className="mt-3 flex h-3 gap-[3px] overflow-hidden rounded-full" role="img" aria-label={`${en ? "Distribution by stage" : "Verteilung nach Phase"}: ${proPhase.map((p) => `${kurz(p)} ${p.n}`).join(", ")}`} style={{ "--ov-delay": "200ms" }}>
              {proPhase.map((p, i) => (
                <span key={p.id} className={cn("ov-balken-x h-full first:rounded-l-full last:rounded-r-full", p.farbe)} style={{ width: `${(p.n / anzahl) * 100}%`, "--i": i * 3 }} />
              ))}
            </Reveal>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-600" aria-hidden="true">
              {proPhase.map((p) => (
                <li key={p.id} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-ink-900/5", p.farbe)} />
                  {kurz(p)} <span className="ov-num font-semibold text-ink-900">{p.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// Hero-Bühne „Projekt anbieten“: Anbieter-Cockpit als Beispielansicht (fiktive Werte) –
// Inserat mit Prüfstatus, Resonanz-Statistik und Provision nur bei Abschluss.
import { BadgePercent, Bookmark, Check, Eye, FileSignature, KeyRound } from "lucide-react";

const SCHRITTE = ["Erfasst", "Geprüft", "Veröffentlicht"];
// Beispielwerte für die Wochenkurve der Aufrufe (fiktiv, nur Darstellung)
const KURVE = [6, 9, 8, 13, 12, 17, 15, 21, 19, 24, 27, 26];
const STATISTIK = [
  { icon: Eye, label: "Aufrufe", wert: "248" },
  { icon: Bookmark, label: "Merker", wert: "19" },
  { icon: KeyRound, label: "NDA-Anfragen", wert: "7" },
  { icon: FileSignature, label: "LOIs", wert: "2" },
];

function Kurve() {
  const max = Math.max(...KURVE);
  const pts = KURVE.map((v, i) => [(i / (KURVE.length - 1)) * 100, 36 - (v / max) * 30]);
  const linie = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-14 w-full">
      <defs>
        <linearGradient id="ab-flaeche" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8cba58" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8cba58" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linie} L100,40 L0,40 Z`} fill="url(#ab-flaeche)" />
      <path d={linie} fill="none" stroke="#b2d68a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnbieterBuehne() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] select-none lg:max-w-none" aria-hidden="true">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-4">
        {/* Inserat mit Prüfstatus */}
        <div className="rounded-2xl bg-white p-4 text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,8,30,0.8)] ring-1 ring-ink-200/70 sm:row-span-2 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">Ihr Inserat</p>
            <span className="rounded-full bg-sun-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-navy-950">Beispiel</span>
          </div>
          <p className="mt-2 font-display text-[15px] font-bold leading-snug sm:text-[17px]">Agri-PV, Aufstellungsbeschluss</p>
          <p className="mt-1 text-[11.5px] text-ink-500">Region · Bundesland · Land</p>
          <ol className="mt-4 flex items-center gap-1.5">
            {SCHRITTE.map((s, i) => (
              <li key={s} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <span className="flex w-full items-center gap-1.5">
                  <span className={`h-px flex-1 ${i === 0 ? "bg-transparent" : "bg-ov-300"}`} />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-600 text-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>
                  <span className={`h-px flex-1 ${i === SCHRITTE.length - 1 ? "bg-transparent" : "bg-ov-300"}`} />
                </span>
                <span className="text-[10.5px] font-semibold text-ink-700">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-200/60 max-sm:hidden">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">Öffentlich sichtbar</p>
            <ul className="mt-2 flex flex-wrap gap-1">
              {["Typ", "Leistung", "Phase", "Region", "Preis"].map((x) => (
                <li key={x} className="rounded-full bg-ov-50 px-2 py-0.5 text-[10.5px] font-medium text-ov-800 ring-1 ring-inset ring-ov-200">{x}</li>
              ))}
            </ul>
            <p className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">Erst nach NDA</p>
            <ul className="mt-2 flex flex-wrap gap-1">
              {["Gemeinde", "Flurstücke", "Netzbetreiber"].map((x) => (
                <li key={x} className="rounded-full bg-ink-50 px-2 py-0.5 text-[10.5px] font-medium text-ink-400 ring-1 ring-inset ring-ink-200">{x}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Resonanz */}
        <div className="rounded-2xl bg-navy-900/90 p-4 text-white shadow-e4 ring-1 ring-inset ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-semibold text-white/85">Resonanz</p>
            <span className="text-[10px] text-white/55">letzte 12 Wochen</span>
          </div>
          <Kurve />
          <dl className="mt-2 grid grid-cols-2 gap-1.5">
            {STATISTIK.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5">
                  <dt className="flex items-center gap-1 text-[10px] text-white/60"><Icon className="h-3 w-3 text-ov-300" />{s.label}</dt>
                  <dd className="ov-num font-display text-[15px] font-extrabold">{s.wert}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Provision */}
        <div className="flex items-center gap-3 rounded-2xl bg-ov-600 p-4 text-white shadow-e4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><BadgePercent className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">Erfolgsprovision</p>
            <p className="font-display text-[15px] font-extrabold leading-tight">nur bei Abschluss</p>
          </div>
        </div>
      </div>
    </div>
  );
}

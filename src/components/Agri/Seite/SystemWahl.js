"use client";
// Systemwahl: vier Agri-PV-Bauweisen als Reiter mit großer Illustration und Kennwerten.
// Kennwerte kommen als fertige Texte/Zahlen von der Seite (Quelle: lib/invest/markt).
import { useRef, useState } from "react";
import { Check, Minus } from "lucide-react";
import AgriBild from "@/components/Agri/AgriBild";
import { cn } from "@/components/ui/cn";
import { useTexte } from "@/components/Sprache/SpracheKontext";

/** Sprachmodell: feste Texte (System-Texte kommen übersetzt von der Seite). */
const TEXTE = {
  de: { tabs: "Agri-PV-Bauweisen", flaeche: "Fläche je MWp", ertrag: "Stromertrag je kWp*", marke: "100 % = Süd, fest", invest: "Investition", kulturen: "Typische Kulturen: ", staerken: "Stärken", grenzen: "Grenzen" },
  en: { tabs: "Agrivoltaic designs", flaeche: "Land per MWp", ertrag: "Power yield per kWp*", marke: "100 % = south-facing, fixed", invest: "Investment", kulturen: "Typical crops: ", staerken: "Strengths", grenzen: "Limitations" },
};

/**
 * systeme: [{ typ, titel, kat, text, kulturen, staerken, grenzen,
 *            flaeche: { min, max, text }, ertrag: { wert, text }, invest: { min, max, text } }]
 * skala:   { flaeche, ertrag, invest } – Achsenmaximum der Balken
 */
export default function SystemWahl({ systeme, skala, fussnote }) {
  const [aktiv, setAktiv] = useState(0);
  const reiter = useRef([]);
  const s = systeme[aktiv];
  const w = useTexte(TEXTE);

  function taste(e) {
    let n = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (aktiv + 1) % systeme.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (aktiv - 1 + systeme.length) % systeme.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = systeme.length - 1;
    if (n === null) return;
    e.preventDefault();
    setAktiv(n);
    reiter.current[n]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-e3 ring-1 ring-ink-200/70 md:rounded-[2rem]">
      {/* Reiter */}
      <div role="tablist" aria-label={w.tabs} className="ov-no-scrollbar flex gap-1 overflow-x-auto border-b border-ink-100 bg-sand-50/70 p-2 lg:grid lg:grid-cols-4 lg:gap-2 lg:p-2.5">
        {systeme.map((x, i) => {
          const an = i === aktiv;
          return (
            <button
              key={x.typ}
              ref={(el) => (reiter.current[i] = el)}
              id={`sys-tab-${x.typ}`}
              role="tab"
              type="button"
              aria-selected={an}
              aria-controls={`sys-panel-${x.typ}`}
              tabIndex={an ? 0 : -1}
              onClick={() => setAktiv(i)}
              onKeyDown={taste}
              className={cn(
                "group flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 md:px-3.5",
                an ? "bg-white text-ink-900 shadow-e2 ring-1 ring-ink-200/80" : "text-ink-600 hover:bg-white/70 hover:text-ink-900"
              )}
            >
              <span aria-hidden="true" className={cn("hidden w-14 shrink-0 overflow-hidden rounded-lg ring-1 xl:block", an ? "ring-ov-300" : "ring-ink-200/70 opacity-80 group-hover:opacity-100")}>
                <AgriBild typ={x.typ} className="block h-auto w-full" titel="" />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap font-display text-[14.5px] font-bold leading-tight">{x.titel}</span>
                <span className={cn("mt-0.5 block whitespace-nowrap text-[12px]", an ? "text-ov-700" : "text-ink-500")}>{x.katKurz}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Inhalt */}
      <div id={`sys-panel-${s.typ}`} role="tabpanel" aria-labelledby={`sys-tab-${s.typ}`} tabIndex={0} className="ov-tab-panel grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" key={s.typ}>
        <div className="flex flex-col border-b border-ink-100 lg:border-b-0 lg:border-r">
          <div className="relative bg-navy-50">
            <AgriBild typ={s.typ} className="block h-auto w-full" />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ov-700 shadow-e1 ring-1 ring-ov-200 backdrop-blur">
              {s.kat}
            </span>
          </div>
          {/* Kennwerte */}
          <dl className="flex-1 space-y-4 bg-sand-50/60 p-6 md:p-8">
            <Kennwert label={w.flaeche} text={s.flaeche.text} min={s.flaeche.min} max={s.flaeche.max} skala={skala.flaeche} ton="sand" />
            <Kennwert label={w.ertrag} text={s.ertrag.text} max={s.ertrag.wert} skala={skala.ertrag} ton="sun" marke={1} markeText={w.marke} />
            <Kennwert label={w.invest} text={s.invest.text} min={s.invest.min} max={s.invest.max} skala={skala.invest} ton="navy" />
          </dl>
        </div>

        <div className="flex flex-col p-6 md:p-8 lg:p-10">
          <h3 className="ov-h3 text-ink-900">{s.titel}</h3>
          <p className="mt-3 text-pretty text-[15.5px] leading-relaxed text-ink-600">{s.text}</p>
          <p className="mt-4 text-[14px] text-ink-700">
            <span className="font-semibold text-ink-900">{w.kulturen}</span>
            {s.kulturen}
          </p>

          <div className="mt-6 grid gap-4 border-t border-ink-100 pt-6 sm:grid-cols-2">
            <div>
              <p className="ov-overline text-ov-700">{w.staerken}</p>
              <ul className="mt-2 space-y-1.5">
                {s.staerken.map((x) => (
                  <li key={x} className="flex gap-2 text-[14px] leading-snug text-ink-700">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" strokeWidth={2.6} />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="ov-overline text-ink-500">{w.grenzen}</p>
              <ul className="mt-2 space-y-1.5">
                {s.grenzen.map((x) => (
                  <li key={x} className="flex gap-2 text-[14px] leading-snug text-ink-700">
                    <Minus aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2.6} />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {fussnote && <p className="border-t border-ink-100 bg-sand-50/60 px-6 py-3 text-[12.5px] leading-relaxed text-ink-500 md:px-8">{fussnote}</p>}
    </div>
  );
}

const TON = {
  sand: "bg-gradient-to-r from-ov-300 to-ov-500",
  sun: "bg-gradient-to-r from-sun-300 to-sun-500",
  navy: "bg-gradient-to-r from-navy-300 to-navy-600",
};

/** Kennwert mit Balken (min/max als Spanne, nur max als Balken ab 0); ohne Zahl nur Text */
function Kennwert({ label, text, min, max, skala, ton, marke, markeText }) {
  const hatZahl = typeof max === "number";
  const links = typeof min === "number" ? (min / skala) * 100 : 0;
  const rechts = hatZahl ? (max / skala) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[13px] font-medium text-ink-600">{label}</dt>
        <dd className="ov-num text-right font-display text-[15.5px] font-bold text-ink-900">{text}</dd>
      </div>
      <div aria-hidden="true" className="relative mt-2 h-2 rounded-full bg-ink-100">
        {hatZahl ? (
          <div className={cn("absolute inset-y-0 rounded-full transition-[left,width] duration-500 ease-out motion-reduce:transition-none", TON[ton])} style={{ left: `${links}%`, width: `${Math.max(2, rechts - links)}%` }} />
        ) : (
          <div className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(45deg,var(--color-ink-200)_0_4px,transparent_4px_8px)]" />
        )}
        {marke && (
          <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink-900/70" style={{ left: `${(marke / skala) * 100}%` }} title={markeText} />
        )}
      </div>
    </div>
  );
}

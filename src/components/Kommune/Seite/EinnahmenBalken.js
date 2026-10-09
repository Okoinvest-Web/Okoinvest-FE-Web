// Gestapelte Jahresbalken „Einnahmen der Gemeinde“ (§ 6 EEG, Gewerbesteuer, ggf. Pacht) – reines HTML/CSS,
// damit Beschriftungen auf jeder Breite lesbar bleiben. Server-Komponente, keine Abhängigkeiten.
// variante: "voll" (Achsen, Markierung Ende AfA, Tabelle) | "mini" (nur Balken, für den Hero)
// Bewegung: Die Jahressäulen wachsen Jahr für Jahr von links nach rechts (ov-balken-y) – so wird sichtbar,
// dass die Gewerbesteuer erst nach der Abschreibung dazukommt. Auslöser: Reveal-Vorfahre (.is-visible)
// oder .ov-sofort (Hero). Ohne Auslöser, ohne JS oder bei reduzierter Bewegung stehen die Säulen sofort.
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";

export const FARBEN = {
  p6: { balken: "bg-ov-500", punkt: "bg-ov-500", label: "§ 6 EEG-Beteiligung" },
  gewSt: { balken: "bg-sun-400", punkt: "bg-sun-400", label: "Gewerbesteuer" },
  pacht: { balken: "bg-navy-500", punkt: "bg-navy-500", label: "Pacht" },
};

/** Sprachmodell: Beschriftungen und Zahlenformat je Sprache (Server-Komponente). */
const WORTE = {
  de: {
    labels: { p6: FARBEN.p6.label, gewSt: FARBEN.gewSt.label, pacht: FARBEN.pacht.label },
    tEuro: (v) => `${fmt(Math.round(v / 1000))} T€`,
    zahl: (v) => fmt(v),
    jahrTitel: (j, s) => `Jahr ${j}: ${s}`,
    afa: "Ende der Abschreibung",
    achse: "Betriebsjahr · Werte in Tausend Euro",
    tabelle: "Alle Werte als Tabelle",
    jahr: "Jahr",
    summe: "Summe",
  },
  en: {
    labels: { p6: "§ 6 EEG participation", gewSt: "Trade tax", pacht: "Lease" },
    tEuro: (v) => `€${fmtZahl(Math.round(v / 1000), 0, "en")}k`,
    zahl: (v) => fmtZahl(v, 0, "en"),
    jahrTitel: (j, s) => `Year ${j}: ${s}`,
    afa: "End of depreciation",
    achse: "Year of operation · values in thousand euros",
    tabelle: "All values as a table",
    jahr: "Year",
    summe: "Total",
  },
};
const worte = () => WORTE[spracheDerAnfrage() === "en" ? "en" : "de"];

/** „schöne“ Obergrenze der Achse in 20-T€-Schritten */
function achsenMax(jahre) {
  const max = Math.max(...jahre.map((j) => j.summe));
  return Math.max(20000, Math.ceil(max / 20000) * 20000);
}

export function Legende({ jahre, dunkel = false, className }) {
  const w = worte();
  const keys = ["p6", "gewSt", "pacht"].filter((k) => jahre.some((j) => j[k] > 0));
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2 text-[13px]", dunkel ? "text-white/75" : "text-ink-600", className)}>
      {keys.map((k) => (
        <li key={k} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-[3px]", FARBEN[k].punkt)} />
          {w.labels[k]}
        </li>
      ))}
    </ul>
  );
}

export default function EinnahmenBalken({ jahre, afaJahre, variante = "voll", className, style }) {
  const w = worte();
  const max = achsenMax(jahre);
  const mini = variante === "mini";
  const schritte = [0, 0.5, 1].map((f) => f * max);
  const keys = ["p6", "gewSt", "pacht"];
  const markeLinks = afaJahre && afaJahre < jahre.length ? (afaJahre / jahre.length) * 100 : null;

  return (
    <div className={cn("relative", className)} style={style}>
      <div className={cn("relative", mini ? "h-24" : "h-56 pl-12 sm:h-64 md:pl-14")}>
        {/* Gitterlinien mit Achsenbeschriftung */}
        {!mini &&
          schritte.map((s) => (
            <div key={s} aria-hidden="true" className="absolute inset-x-0 flex items-center" style={{ bottom: `${(s / max) * 100}%` }}>
              <span className="ov-num w-10 -translate-y-px pr-2 text-right text-[11.5px] text-ink-400 md:w-12">{w.zahl(s / 1000)}</span>
              <span className={cn("h-px flex-1", s === 0 ? "bg-ink-300" : "border-t border-dashed border-ink-200")} />
            </div>
          ))}

        {/* Balken */}
        <div aria-hidden="true" className={cn("absolute inset-0 flex items-end", mini ? "gap-[3px]" : "left-12 gap-[2px] sm:gap-1 md:left-14")}>
          {jahre.map((j, i) => (
            <div key={j.jahr} title={w.jahrTitel(j.jahr, w.tEuro(j.summe))} className="ov-balken-y flex h-full min-w-0 flex-1 flex-col-reverse" style={{ "--i": i * 0.8 }}>
              {keys.map((k) =>
                j[k] > 0 ? (
                  <span
                    key={k}
                    className={cn("block w-full first:rounded-b-[2px] last:rounded-t-[3px]", FARBEN[k].balken, mini && "opacity-95")}
                    style={{ height: `${(j[k] / max) * 100}%` }}
                  />
                ) : null
              )}
            </div>
          ))}
        </div>

        {/* Markierung: Ende der Abschreibung */}
        {!mini && markeLinks != null && (
          <div aria-hidden="true" className="absolute inset-y-0 left-12 right-0 md:left-14">
            <div className="absolute -top-1 bottom-0 border-l border-dashed border-ink-400" style={{ left: `${markeLinks}%` }}>
              <span className="absolute -top-2 right-2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 shadow-e1 ring-1 ring-ink-200 sm:right-3">
                {w.afa}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* x-Achse */}
      {!mini && (
        <div aria-hidden="true" className="ov-num relative ml-12 mt-2 h-4 text-[11.5px] text-ink-400 md:ml-14">
          {[1, 5, 10, 15, 20, 25, jahre.length].map((n) => (
            <span key={n} className="absolute -translate-x-1/2" style={{ left: `${((n - 0.5) / jahre.length) * 100}%` }}>
              {n}
            </span>
          ))}
        </div>
      )}
      {!mini && <p aria-hidden="true" className="ml-12 mt-1 text-[11.5px] text-ink-400 md:ml-14">{w.achse}</p>}
    </div>
  );
}

/** Werte als Tabelle – für Screenreader und zum Nachlesen */
export function EinnahmenTabelle({ jahre }) {
  const w = worte();
  const tEuro = w.tEuro;
  const keys = ["p6", "gewSt", "pacht"].filter((k) => jahre.some((j) => j[k] > 0));
  return (
    <details className="group mt-6 rounded-2xl bg-sand-50 ring-1 ring-inset ring-ink-200/70">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 text-[14px] font-semibold text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 [&::-webkit-details-marker]:hidden">
        {w.tabelle}
        <span aria-hidden="true" className="text-ink-400 transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
      </summary>
      <div className="max-h-80 overflow-auto px-4 pb-4">
        <table className="ov-num w-full text-left text-[13.5px]">
          <thead className="sticky top-0 bg-sand-50 text-ink-500">
            <tr>
              <th scope="col" className="py-2 pr-3 font-semibold">{w.jahr}</th>
              {keys.map((k) => (
                <th key={k} scope="col" className="py-2 pr-3 text-right font-semibold">{w.labels[k]}</th>
              ))}
              <th scope="col" className="py-2 text-right font-semibold">{w.summe}</th>
            </tr>
          </thead>
          <tbody className="text-ink-700">
            {jahre.map((j) => (
              <tr key={j.jahr} className="border-t border-ink-200/70">
                <th scope="row" className="py-1.5 pr-3 font-medium">{j.jahr}</th>
                {keys.map((k) => (
                  <td key={k} className="py-1.5 pr-3 text-right">{tEuro(j[k])}</td>
                ))}
                <td className="py-1.5 text-right font-semibold text-ink-900">{tEuro(j.summe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

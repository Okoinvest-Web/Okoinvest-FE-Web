import { Check, Minus, CircleDot } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { spracheDerAnfrage } from "@/lib/land/seite";

/**
 * Vergleich der Geschäftsmodelle im PV-Projekthandel (ohne Namen einzelner
 * Anbieter). Server-Komponente: Ab md eine echte Tabelle, darunter je
 * Kriterium eine Karte – so läuft auf dem Handy nichts über.
 *
 * zeilen: [{ kriterium, werte: [{ t, stufe: "gut" | "teils" | "nein" }, …] }]
 * spalten: [{ id, titel, sub, hervorheben? }]
 */
const ICON = { gut: Check, teils: CircleDot, nein: Minus };
const LABEL = { gut: "erfüllt", teils: "teilweise", nein: "nicht üblich" };
const LABEL_EN = { gut: "met", teils: "partly", nein: "not usual" };

function Stufe({ stufe, hell, en = false }) {
  const Icon = ICON[stufe];
  return (
    <span
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        stufe === "gut" ? "bg-ov-500 text-white" : stufe === "teils" ? (hell ? "bg-white text-sun-500 ring-1 ring-sun-400" : "bg-sun-300/40 text-ink-800") : "bg-ink-200 text-ink-500"
      )}
    >
      <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
      <span className="sr-only">{(en ? LABEL_EN : LABEL)[stufe]}: </span>
    </span>
  );
}

export default function ModellVergleich({ spalten, zeilen }) {
  const en = spracheDerAnfrage() === "en";
  return (
    <div>
      {/* Tabelle ab md */}
      <div className="hidden overflow-hidden rounded-[2rem] bg-white ring-1 ring-ink-200/70 md:block">
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">{en ? "Comparison of the marketplace, broker and developer platform models" : "Vergleich der Modelle Marktplatz, Makler und Entwickler-Plattform"}</caption>
          <colgroup>
            <col className="w-[22%]" />
            {spalten.map((s) => (
              <col key={s.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="px-5 py-5 align-bottom text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {en ? "Criterion" : "Kriterium"}
              </th>
              {spalten.map((s) => (
                <th key={s.id} scope="col" className={cn("px-5 py-5 align-bottom", s.hervorheben && "bg-navy-950 text-white")}>
                  <span className={cn("block font-display text-[18px] font-bold", s.hervorheben ? "text-white" : "text-ink-900")}>{s.titel}</span>
                  <span className={cn("mt-1 block text-[13px] font-normal", s.hervorheben ? "text-white/70" : "text-ink-500")}>{s.sub}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.kriterium} className="border-t border-ink-100">
                <th scope="row" className="px-5 py-4 align-top text-[14.5px] font-semibold text-ink-900">
                  {z.kriterium}
                </th>
                {z.werte.map((w, i) => (
                  <td key={spalten[i].id} className={cn("px-5 py-4 align-top", spalten[i].hervorheben && "bg-ov-50")}>
                    <span className="flex gap-2.5 text-[14px] leading-relaxed text-ink-700">
                      <Stufe stufe={w.stufe} en={en} />
                      <span>{w.t}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Karten unter md */}
      <ul className="space-y-3 md:hidden">
        {zeilen.map((z) => (
          <li key={z.kriterium} className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
            <p className="font-display text-[16.5px] font-bold text-ink-900">{z.kriterium}</p>
            <dl className="mt-3 space-y-3">
              {z.werte.map((w, i) => (
                <div key={spalten[i].id} className={cn("rounded-2xl px-3.5 py-3", spalten[i].hervorheben ? "bg-ov-50 ring-1 ring-ov-200" : "bg-sand-50")}>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">{spalten[i].titel}</dt>
                  <dd className="mt-1.5 flex gap-2.5 text-[14px] leading-relaxed text-ink-700">
                    <Stufe stufe={w.stufe} hell en={en} />
                    <span>{w.t}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-500">
        {["gut", "teils", "nein"].map((s) => (
          <span key={s} className="inline-flex items-center gap-2">
            <Stufe stufe={s} hell en={en} />
            {en ? (s === "gut" ? "typically met" : s === "teils" ? "partly / depending on provider" : "not usual in this model") : s === "gut" ? "typisch erfüllt" : s === "teils" ? "teilweise / je nach Anbieter" : "im Modell nicht üblich"}
          </span>
        ))}
      </p>
    </div>
  );
}

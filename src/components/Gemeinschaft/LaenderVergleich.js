import { laenderFuer } from "./laender";
import { spracheDerAnfrage } from "@/lib/land/seite";

/**
 * Vergleichstabelle DE/AT/CH. Ab md echte Tabelle, darunter je Land eine
 * Karte (gleiche Daten) – nichts läuft auf dem Handy horizontal über.
 */
export default function LaenderVergleich() {
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const { laender: LAENDER, kriterien: KRITERIEN } = laenderFuer(sprache);
  return (
    <>
      <div className="hidden overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-ink-200/70 md:block">
        <table className="w-full table-fixed border-collapse text-left text-[14.5px]">
          <caption className="sr-only">{en ? "Energy communities in Germany, Austria and Switzerland compared" : "Energiegemeinschaften in Deutschland, Österreich und der Schweiz im Vergleich"}</caption>
          <thead>
            <tr className="bg-navy-950 text-white">
              <th scope="col" className="w-[19%] px-5 py-4 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-white/60">
                {en ? "Criterion" : "Kriterium"}
              </th>
              {LAENDER.map((l) => (
                <th key={l.id} scope="col" className="px-5 py-4 font-display text-[17px] font-bold">
                  <span className="mr-2 inline-flex h-7 w-9 items-center justify-center rounded-md bg-white/10 text-[12px] font-bold text-ov-300">{l.kurz}</span>
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KRITERIEN.map((k, i) => (
              <tr key={k.id} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                <th scope="row" className="px-5 py-4 align-top text-[13.5px] font-semibold text-ink-900">
                  {k.label}
                </th>
                {LAENDER.map((l) => (
                  <td key={l.id} className="px-5 py-4 align-top leading-relaxed text-ink-600">
                    {l.werte[k.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {LAENDER.map((l) => (
          <article key={l.id} className="rounded-3xl bg-white p-5 shadow-lg ring-1 ring-ink-200/70">
            <h3 className="flex items-center gap-2 font-display text-[19px] font-bold text-ink-900">
              <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-navy-950 text-[12px] font-bold text-ov-300">{l.kurz}</span>
              {l.name}
            </h3>
            <dl className="mt-4 divide-y divide-ink-200/70">
              {KRITERIEN.map((k) => (
                <div key={k.id} className="py-2.5">
                  <dt className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">{k.label}</dt>
                  <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-700">{l.werte[k.id]}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

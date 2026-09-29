import Link from "next/link";
import SchnellWeiter from "@/components/Portal/SchnellWeiter";
import { SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { PROZESSE, statusInfo } from "@/lib/plattform/prozesse";
import { ha, relativ } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Flächen-Pipeline" };

const SPALTEN = ["entwurf", ...PROZESSE.flaeche.pipeline, "abgelehnt"];

export default async function AdminFlaechen() {
  const n = await portalNutzer({ admin: true });
  const flaechen = await backend().flaechen(n, { alle: true });
  const gruppen = Object.fromEntries(SPALTEN.map((s) => [s, flaechen.filter((f) => f.status === s)]));

  return (
    <div>
      <SeitenKopf
        eyebrow="Backoffice"
        titel="Flächen-Pipeline"
        text={`${fmt(flaechen.length)} Flächen mit ${ha(flaechen.filter((f) => f.status !== "abgelehnt").reduce((s, f) => s + (f.ha || 0), 0))}. Einfache Schritte direkt hier, Pachtangebot und Ablehnung in der Detailansicht.`}
      />
      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        <ol className="flex min-w-max gap-4">
          {SPALTEN.map((s) => {
            const liste = gruppen[s];
            const info = statusInfo("flaeche", s);
            return (
              <li key={s} className="flex w-[272px] shrink-0 flex-col rounded-3xl bg-ink-100/70 p-3">
                <h2 className="flex items-center justify-between px-2 pb-3 pt-1">
                  <span className="text-[13.5px] font-bold text-ink-900">{info.label}</span>
                  <span className="ov-num rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-ink-600">{liste.length}</span>
                </h2>
                <ul className="space-y-2.5">
                  {liste.map((f) => (
                    <li key={f.id} className="relative rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-ink-200/70 hover:ring-ov-300">
                      <Link href={`/portal/flaechen/${f.id}`} className="block text-[14px] font-semibold leading-snug text-ink-900 after:absolute after:inset-0 hover:text-ov-700">{f.bezeichnung}</Link>
                      <p className="mt-1 text-[12.5px] text-ink-500">{[ha(f.ha), [f.plz, f.ort].filter(Boolean).join(" "), f.land, f.agri ? "Agri" : null].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 truncate text-[12px] text-ink-400">{f.eigentuemer ? `${f.eigentuemer.vorname} ${f.eigentuemer.nachname}` : "ohne Konto"} · {relativ(f.geaendertAm)}</p>
                      <div className="mt-2.5"><SchnellWeiter art="flaeche" id={f.id} status={f.status} /></div>
                    </li>
                  ))}
                  {!liste.length && <li className="rounded-2xl border border-dashed border-ink-300 px-3 py-6 text-center text-[12.5px] text-ink-400">leer</li>}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

"use client";

// Filter-Insel der Projektbörse: die Liste wird serverseitig vollständig gerendert
// (SEO), Filter und Sortierung laufen im Browser und stehen in der URL.

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X, SearchX } from "lucide-react";
import { cn } from "@/components/ui/cn";
import ProjektKarte from "./ProjektKarte";
import MerkenKnopf from "./MerkenKnopf";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { PHASEN } from "@/lib/invest/markt";
import { eingabe, auswahlfeld } from "@/components/Portal/felder";

const LEER = { typ: "", land: "", phase: "", mwpMin: "", mwpMax: "", sortierung: "neu", ansicht: "alle" };

function chipKlasse(aktiv) {
  return cn(
    "inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium ring-1 ring-inset transition-colors",
    aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
  );
}

export default function BoerseListe({ projekte = [], basisHref = "/projektboerse/", portal = false, start = {} }) {
  const [f, setF] = useState({ ...LEER, ...start });
  const [offen, setOffen] = useState(false);
  const setze = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && v !== LEER[k]) q.set(k, v);
    const url = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [f]);

  const liste = useMemo(() => {
    const num = (v) => (v === "" ? null : Number(String(v).replace(",", ".")));
    const min = num(f.mwpMin);
    const max = num(f.mwpMax);
    let l = projekte.filter(
      (p) =>
        (!f.typ || p.typ === f.typ) &&
        (!f.land || p.land === f.land) &&
        (!f.phase || p.phase === f.phase) &&
        (min === null || p.mwp >= min) &&
        (max === null || p.mwp <= max) &&
        (f.ansicht !== "merkliste" || p.meinInteresse?.gemerkt) &&
        (f.ansicht !== "aktiv" || (p.meinInteresse && p.meinInteresse.status !== "gemerkt"))
    );
    if (f.sortierung === "gross") l = [...l].sort((a, b) => b.mwp - a.mwp);
    else if (f.sortierung === "passung") l = [...l].sort((a, b) => (b.matching?.score || 0) - (a.matching?.score || 0));
    else if (f.sortierung === "phase") l = [...l].sort((a, b) => PHASEN.findIndex((x) => x.id === b.phase) - PHASEN.findIndex((x) => x.id === a.phase));
    return l;
  }, [projekte, f]);

  const aktiveFilter = ["typ", "land", "phase", "mwpMin", "mwpMax"].filter((k) => f[k]).length;

  const filter = (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Projekttyp</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chipKlasse(!f.typ)} aria-pressed={!f.typ} onClick={() => setze("typ", "")}>Alle</button>
          {Object.entries(PROJEKT_TYPEN).map(([k, v]) => (
            <button key={k} type="button" className={chipKlasse(f.typ === k)} aria-pressed={f.typ === k} onClick={() => setze("typ", f.typ === k ? "" : k)}>{v}</button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Land</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipKlasse(!f.land)} aria-pressed={!f.land} onClick={() => setze("land", "")}>Alle</button>
            {Object.keys(LAENDER).map((k) => (
              <button key={k} type="button" className={chipKlasse(f.land === k)} aria-pressed={f.land === k} onClick={() => setze("land", f.land === k ? "" : k)} title={LAENDER[k]}>{k}</button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="filter-phase" className="mb-2 block text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Phase</label>
          <select id="filter-phase" className={cn(auswahlfeld, "h-10")} value={f.phase} onChange={(e) => setze("phase", e.target.value)}>
            <option value="">Alle Phasen</option>
            {PHASEN.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <p id="filter-mwp" className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Leistung (MWp)</p>
          <div className="flex items-center gap-2" role="group" aria-labelledby="filter-mwp">
            <input aria-label="MWp von" inputMode="decimal" placeholder="von" className={cn(eingabe, "h-10")} value={f.mwpMin} onChange={(e) => setze("mwpMin", e.target.value)} />
            <span className="text-ink-400">–</span>
            <input aria-label="MWp bis" inputMode="decimal" placeholder="bis" className={cn(eingabe, "h-10")} value={f.mwpMax} onChange={(e) => setze("mwpMax", e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="filter-sort" className="mb-2 block text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Sortierung</label>
          <select id="filter-sort" className={cn(auswahlfeld, "h-10")} value={f.sortierung} onChange={(e) => setze("sortierung", e.target.value)}>
            <option value="neu">Neueste zuerst</option>
            <option value="gross">Größte zuerst</option>
            <option value="phase">Am weitesten entwickelt</option>
            {portal && <option value="passung">Beste Passung (Suchprofil)</option>}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {portal && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Ansicht">
          {[
            ["alle", "Alle Projekte"],
            ["merkliste", "Merkliste"],
            ["aktiv", "NDA & Datenräume"],
          ].map(([k, v]) => (
            <button key={k} type="button" className={chipKlasse(f.ansicht === k)} aria-pressed={f.ansicht === k} onClick={() => setze("ansicht", k)}>{v}</button>
          ))}
        </div>
      )}

      <div className="mb-6 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 md:p-6">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <button type="button" onClick={() => setOffen((o) => !o)} aria-expanded={offen} aria-controls="boerse-filter" className="inline-flex h-10 items-center gap-2 rounded-full bg-sand-50 px-4 text-[14px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Filter{aktiveFilter ? ` (${aktiveFilter})` : ""}
          </button>
          <p className="text-[13.5px] text-ink-500" aria-live="polite">{liste.length} Projekte</p>
        </div>
        <div id="boerse-filter" className={cn("md:block", offen ? "mt-4 block" : "hidden")}>{filter}</div>
        <div className="mt-4 hidden items-center justify-between border-t border-ink-100 pt-4 md:flex">
          <p className="text-[14px] text-ink-600" aria-live="polite"><span className="ov-num font-semibold text-ink-900">{liste.length}</span> {liste.length === 1 ? "Projekt" : "Projekte"} gefunden</p>
          {aktiveFilter > 0 && (
            <button type="button" onClick={() => setF((x) => ({ ...LEER, sortierung: x.sortierung, ansicht: x.ansicht }))} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
              <X aria-hidden="true" className="h-4 w-4" /> Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {liste.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((p) => (
            <li key={p.id}>
              <ProjektKarte
                projekt={p}
                href={`${basisHref}${portal ? p.id : p.slug}`}
                extra={
                  portal && (p.matching || (p.meinInteresse && p.meinInteresse.status !== "gemerkt")) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.matching && (
                        <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", p.matching.score >= 70 ? "bg-ov-50 text-ov-800 ring-ov-200" : "bg-ink-50 text-ink-600 ring-ink-200")}>
                          {p.matching.score} % Passung
                        </span>
                      )}
                      {p.meinInteresse && p.meinInteresse.status !== "gemerkt" && (
                        <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[12px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">{statusInfo("interesse", p.meinInteresse.status).label}</span>
                      )}
                    </div>
                  ) : null
                }
                aktion={portal ? <MerkenKnopf projektId={p.id} gemerkt={!!p.meinInteresse?.gemerkt} /> : null}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center">
          <SearchX aria-hidden="true" className="h-8 w-8 text-ink-400" />
          <p className="mt-3 font-display text-[18px] font-bold text-ink-900">Keine passenden Projekte</p>
          <p className="mt-1 max-w-md text-[14.5px] text-ink-600">
            {portal ? "Passen Sie die Filter an – oder hinterlegen Sie ein Suchprofil, dann melden wir uns, sobald ein passendes Projekt eingeht." : "Passen Sie die Filter an oder legen Sie als Investor ein Suchprofil an – wir melden uns, sobald ein passendes Projekt eingeht."}
          </p>
        </div>
      )}
    </div>
  );
}

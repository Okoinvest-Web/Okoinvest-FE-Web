"use client";

// Portfolio der Projektentwicklung: Umschalter Liste (DatenListe mit Filter, Sortierung, CSV) · Kanban nach Phase · Karte (DACH,
// je Bundesland/Kanton gebündelt). Ansicht in der URL (?ansicht=liste|kanban|karte), Tasten „v“ wechselt.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KanbanSquare, List, Map as KarteIcon, TriangleAlert } from "lucide-react";
import { cn } from "@/components/ui/cn";
import DatenListe from "@/components/Portal/Bedienung/Liste/DatenListe";
import { KARTE, LAENDER_PFADE, projiziere, regionPunkt } from "@/components/Boerse/KarteGeo";
import { ENTWICKLUNG_STATUS, ENTWICKLUNG_TYPEN, phaseLabel } from "@/lib/plattform/entwicklung";
import { LAENDER } from "@/lib/plattform/konstanten";
import { PHASEN } from "@/lib/invest/markt";
import { Fortschritt, PhaseBadge, ProjektStatusBadge, eurKurz, monatText, mwpText } from "./teile";
import { tabTasten } from "@/components/Portal/Bedienung/tabTasten"; // UIUX: Pfeiltasten in Tablisten (WAI-ARIA)

const ANSICHTEN = [
  { id: "liste", label: "Liste", icon: List },
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "karte", label: "Karte", icon: KarteIcon },
];
const SPALTEN_PHASE = [null, ...PHASEN.map((p) => p.id)];

function Verzug({ p }) {
  if (!p.meilensteine?.ueberfaellig) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-danger-700">
      <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
      {p.meilensteine.ueberfaellig} überfällig{p.meilensteine.kritischUeberfaellig ? ` · ${p.meilensteine.kritischUeberfaellig} kritisch` : ""}
    </span>
  );
}

function Kanban({ projekte }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="grid min-w-[1100px] grid-cols-7 gap-3">
        {SPALTEN_PHASE.map((ph) => {
          const liste = projekte.filter((p) => (p.phase || null) === ph);
          const mwp = liste.reduce((s, p) => s + (p.mwp || 0), 0);
          return (
            <section key={ph || "akquise"} aria-label={`Phase ${phaseLabel(ph)}`} className="min-w-0 rounded-3xl bg-sand-50 p-2.5 ring-1 ring-ink-200/70">
              <header className="px-2 pb-2 pt-1">
                <h3 className="font-display text-[14px] font-bold text-ink-900">{phaseLabel(ph)}</h3>
                <p className="ov-num text-[12px] text-ink-500">{liste.length} · {mwpText(mwp)}</p>
              </header>
              <ul className="space-y-2">
                {liste.map((p) => (
                  <li key={p.id}>
                    <Link href={`/portal/admin/entwicklung/${p.id}`} className="block rounded-2xl bg-white p-3 ring-1 ring-ink-200/70 transition-shadow hover:ring-ov-300">
                      <p className="line-clamp-2 text-[13.5px] font-semibold text-ink-900">{p.titel}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-500">{p.land} · {p.bundesland} · {mwpText(p.mwp)}</p>
                      <div className="mt-2"><Fortschritt wert={p.fortschritt} klein /></div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[12px] text-ink-600">
                        <span className="ov-num">{eurKurz(p.pipeline.wert)}</span>
                        <span>COD {monatText((p.prognoseCod || "").slice(0, 7))}</span>
                      </div>
                      <Verzug p={p} />
                    </Link>
                  </li>
                ))}
                {!liste.length && <li className="px-2 py-3 text-[12.5px] text-ink-400">–</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Karte({ projekte }) {
  const [region, setRegion] = useState("");
  const gruppen = useMemo(() => {
    const m = new Map();
    for (const p of projekte) {
      const key = `${p.land}|${p.bundesland}`;
      const g = m.get(key) || { key, land: p.land, bundesland: p.bundesland, projekte: [], mwp: 0, verzug: 0 };
      g.projekte.push(p);
      g.mwp += p.mwp || 0;
      g.verzug += p.meilensteine?.kritischUeberfaellig || 0;
      m.set(key, g);
    }
    return [...m.values()].map((g) => ({ ...g, punkt: regionPunkt(g.land, g.bundesland) })).filter((g) => g.punkt);
  }, [projekte]);
  const max = Math.max(1, ...gruppen.map((g) => g.mwp));
  const aktiv = gruppen.find((g) => g.key === region) || null;
  const liste = aktiv ? aktiv.projekte : projekte;
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <figure className="min-w-0 overflow-hidden rounded-3xl bg-sand-50 ring-1 ring-ink-200/70">
        <svg viewBox={`-10 -10 ${KARTE.breite + 20} ${KARTE.hoehe + 20}`} className="mx-auto block h-auto w-full max-w-[440px]" role="group" aria-label="Entwicklungsprojekte nach Region (stilisierte Karte DACH)">
          {LAENDER_PFADE.map((l) => {
            const [x, y] = projiziere(l.label);
            return (
              <g key={l.id}>
                <path d={l.pfad} className="fill-white stroke-ink-300" strokeWidth="1.4" strokeLinejoin="round" />
                <text x={x} y={y + (l.id === "DE" ? 0 : 26)} textAnchor="middle" aria-hidden="true" className="fill-ink-200 font-display text-[22px] font-extrabold tracking-[0.2em]">{l.id}</text>
              </g>
            );
          })}
          {gruppen.map((g) => {
            const r = 9 + 12 * Math.sqrt(g.mwp / max);
            const an = g.key === region;
            return (
              <g key={g.key} role="button" tabIndex={0} aria-pressed={an} aria-label={`${g.bundesland}: ${g.projekte.length} Projekte, ${mwpText(g.mwp)}`} className="cursor-pointer outline-none" onClick={() => setRegion(an ? "" : g.key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRegion(an ? "" : g.key); } }}>
                <circle cx={g.punkt[0]} cy={g.punkt[1]} r={r} className={cn(g.verzug ? "fill-danger-500/80" : "fill-ov-500/85", an ? "stroke-navy-900" : "stroke-white")} strokeWidth={an ? 3 : 2} />
                <text x={g.punkt[0]} y={g.punkt[1] + 4} textAnchor="middle" className="pointer-events-none fill-white text-[12px] font-bold">{g.projekte.length}</text>
                <title>{`${g.bundesland}: ${g.projekte.length} Projekte, ${mwpText(g.mwp)}`}</title>
              </g>
            );
          })}
        </svg>
        <figcaption className="px-5 pb-4 text-[12px] text-ink-500">Punkte je Bundesland/Kanton (Größe nach MWp, rot: kritischer Verzug). Keine genaue Lage.</figcaption>
      </figure>
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-[16px] font-bold text-ink-900">{aktiv ? `${aktiv.bundesland} (${LAENDER[aktiv.land]})` : "Alle Regionen"}</h3>
          {aktiv && <button type="button" onClick={() => setRegion("")} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800">Filter aufheben</button>}
        </div>
        <ul className="divide-y divide-ink-100 rounded-3xl bg-white ring-1 ring-ink-200/70">
          {liste.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/portal/admin/entwicklung/${p.id}`} className="block truncate font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                <p className="truncate text-[12.5px] text-ink-500">{p.typLabel} · {mwpText(p.mwp)} · {p.bundesland}</p>
                <Verzug p={p} />
              </div>
              <PhaseBadge label={p.phaseLabel} phase={p.phase} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Portfolio({ projekte = [], ansicht: start = "liste" }) {
  const router = useRouter();
  const pfad = usePathname();
  const sp = useSearchParams();
  const [ansicht, setAnsicht] = useState(ANSICHTEN.some((a) => a.id === start) ? start : "liste");
  const wechseln = (id) => {
    setAnsicht(id);
    const q = new URLSearchParams(sp?.toString() || "");
    if (id === "liste") q.delete("ansicht");
    else q.set("ansicht", id);
    router.replace(`${pfad}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  useEffect(() => {
    const taste = (e) => {
      if (e.key !== "v" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable) return;
      const i = ANSICHTEN.findIndex((a) => a.id === ansicht);
      wechseln(ANSICHTEN[(i + 1) % ANSICHTEN.length].id);
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  });

  return (
    <div className="min-w-0">
      <div role="tablist" aria-label="Ansicht (Taste v)" onKeyDown={tabTasten} className="mb-4 inline-flex rounded-full bg-white p-1 ring-1 ring-ink-200/70">
        {ANSICHTEN.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={ansicht === a.id} onClick={() => wechseln(a.id)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors", ansicht === a.id ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>
            <a.icon aria-hidden="true" className="h-4 w-4" />
            {a.label}
          </button>
        ))}
      </div>
      {ansicht === "kanban" && <Kanban projekte={projekte.filter((p) => ["aktiv", "pausiert"].includes(p.status))} />}
      {ansicht === "karte" && <Karte projekte={projekte.filter((p) => p.status !== "abgebrochen")} />}
      {ansicht === "liste" && (
        <DatenListe
          id="entwicklung-portfolio"
          titel="Entwicklungsprojekte"
          csvName="entwicklungsprojekte"
          zeilen={projekte}
          suche={{ platzhalter: "Titel, Gemeinde, Bundesland", felder: (p) => [p.titel, p.gemeinde, p.bundesland, p.id, p.projektleiter?.name] }}
          spalten={[
            { id: "titel", label: "Projekt", pflicht: true, mobil: "titel", wert: (p) => p.titel, zelle: (p) => (<><Link href={`/portal/admin/entwicklung/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link><p className="text-[12.5px] text-ink-500">{[p.typLabel, p.gemeinde, p.bundesland, p.land].filter(Boolean).join(" · ")}</p><Verzug p={p} /></>) },
            { id: "phase", label: "Phase", mobil: "badge", wert: (p) => SPALTEN_PHASE.indexOf(p.phase || null), csvWert: (p) => p.phaseLabel, zelle: (p) => <PhaseBadge label={p.phaseLabel} phase={p.phase} /> },
            { id: "status", label: "Status", standard: false, wert: (p) => p.status, csvWert: (p) => ENTWICKLUNG_STATUS[p.status]?.label, zelle: (p) => <ProjektStatusBadge status={p.status} /> },
            { id: "mwp", label: "MWp", wert: (p) => p.mwp ?? 0, zelle: (p) => <span className="ov-num whitespace-nowrap">{mwpText(p.mwp)}</span> },
            { id: "fortschritt", label: "Fortschritt", wert: (p) => p.fortschritt, klasse: "min-w-[140px]", zelle: (p) => <Fortschritt wert={p.fortschritt} klein /> },
            { id: "wert", label: "Pipeline-Wert", wert: (p) => p.pipeline.wert, zelle: (p) => <span className="ov-num whitespace-nowrap" title={`${Math.round(p.pipeline.wahrscheinlichkeit * 100)} % × ${eurKurz(p.pipeline.volumen)}`}>{eurKurz(p.pipeline.wert)}</span> },
            { id: "cod", label: "COD (Prognose)", wert: (p) => p.prognoseCod || "", zelle: (p) => <span className={cn("whitespace-nowrap", p.codVerzugMonate ? "font-semibold text-danger-700" : "text-ink-700")}>{monatText((p.prognoseCod || "").slice(0, 7))}{p.codVerzugMonate ? ` (+${p.codVerzugMonate} M.)` : ""}</span> },
            { id: "leitung", label: "Projektleitung", standard: false, wert: (p) => p.projektleiter?.name || "", zelle: (p) => p.projektleiter?.name || "–" },
            { id: "flaeche", label: "Fläche gesichert", standard: false, wert: (p) => p.flaecheGesichertHa, zelle: (p) => <span className="ov-num">{p.flaecheGesichertHa} / {p.flaecheHa} ha</span> },
            { id: "risiko", label: "Risiko max.", standard: false, wert: (p) => p.risikoMax, zelle: (p) => <span className={cn("ov-num font-semibold", p.risikoMax >= 15 ? "text-danger-700" : "text-ink-700")}>{p.risikoMax || "–"}</span> },
            { id: "budget", label: "Budget Ist/Plan", standard: false, wert: (p) => p.budgetIst, zelle: (p) => <span className="ov-num whitespace-nowrap">{eurKurz(p.budgetIst)} / {eurKurz(p.budgetPlan)}</span> },
          ]}
          filter={[
            { id: "phase", label: "Phase", wert: (p) => p.phase || "akquise", optionen: SPALTEN_PHASE.map((ph) => ({ wert: ph || "akquise", label: phaseLabel(ph) })) },
            { id: "land", label: "Land", wert: (p) => p.land, optionen: Object.entries(LAENDER).map(([k, l]) => ({ wert: k, label: l })) },
            { id: "typ", label: "Typ", wert: (p) => p.typ, optionen: Object.entries(ENTWICKLUNG_TYPEN).map(([k, l]) => ({ wert: k, label: l })).filter((o) => projekte.some((p) => p.typ === o.wert)) },
            { id: "status", label: "Status", wert: (p) => p.status, optionen: Object.entries(ENTWICKLUNG_STATUS).map(([k, s]) => ({ wert: k, label: s.label })) },
            { id: "verzug", label: "Verzug", wert: (p) => (p.meilensteine?.kritischUeberfaellig ? "kritisch" : p.meilensteine?.ueberfaellig ? "ja" : "nein"), optionen: [{ wert: "kritisch", label: "Kritischer Verzug" }, { wert: "ja", label: "Verzug" }, { wert: "nein", label: "Im Plan" }] },
          ]}
          ansichten={[{ id: "verzug", label: "Mit Verzug", zustand: { filter: { verzug: ["kritisch", "ja"] } } }, { id: "rtb", label: "Baureif", zustand: { filter: { phase: ["rtb"] } } }]}
          auswahl={false}
        />
      )}
    </div>
  );
}

"use client";

// Filter-Insel der Projektbörse: die Liste wird serverseitig vollständig gerendert
// (SEO), Filter und Sortierung laufen im Browser und stehen in der URL.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/Land/Link";
import { Columns3, SlidersHorizontal, X, SearchX, List, Map as KarteIcon } from "lucide-react";
import { cn } from "@/components/ui/cn";
import ProjektKarte from "./ProjektKarte";
import MerkenKnopf from "./MerkenKnopf";
import KarteDach from "./KarteDach"; // Deal-Room-Team: Kartenansicht (Filter synchron)
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { PHASEN } from "@/lib/invest/markt";
import { eingabe, auswahlfeld } from "@/components/Portal/felder";
import Button from "@/components/ui/Button";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

const TEXTE = {
  de: {
    projekttyp: "Projekttyp",
    alle: "Alle",
    land: "Land",
    phase: "Phase",
    allePhasen: "Alle Phasen",
    leistung: "Leistung (MWp)",
    von: "von",
    bis: "bis",
    mwpVon: "MWp von",
    mwpBis: "MWp bis",
    sortierung: "Sortierung",
    sort: { neu: "Neueste zuerst", gross: "Größte zuerst", phase: "Am weitesten entwickelt", passung: "Beste Passung (Suchprofil)" },
    ansicht: "Ansicht",
    ansichten: { alle: "Alle Projekte", merkliste: "Merkliste", aktiv: "NDA & Datenräume" },
    vergleichen: "Merkliste vergleichen",
    filter: "Filter",
    projekt: (n) => (n === 1 ? "Projekt" : "Projekte"),
    gefunden: "gefunden",
    region: "Region:",
    entfernen: "entfernen",
    zuruecksetzen: "Filter zurücksetzen",
    darstellung: "Darstellung",
    liste: "Liste",
    karte: "Karte",
    passung: "% Passung",
    keine: "Keine passenden Projekte",
    keinePortal: "Passen Sie die Filter an – oder hinterlegen Sie ein Suchprofil, dann melden wir uns, sobald ein passendes Projekt eingeht.",
    keineOeffentlich: "Passen Sie die Filter an oder legen Sie als Investor ein Suchprofil an – wir melden uns, sobald ein passendes Projekt eingeht.",
    suchprofil: "Suchprofil anlegen",
  },
  en: {
    projekttyp: "Project type",
    alle: "All",
    land: "Country",
    phase: "Stage",
    allePhasen: "All stages",
    leistung: "Capacity (MWp)",
    von: "from",
    bis: "to",
    mwpVon: "MWp from",
    mwpBis: "MWp to",
    sortierung: "Sort by",
    sort: { neu: "Newest first", gross: "Largest first", phase: "Most advanced", passung: "Best match (search profile)" },
    ansicht: "View",
    ansichten: { alle: "All projects", merkliste: "Watchlist", aktiv: "NDAs & data rooms" },
    vergleichen: "Compare watchlist",
    filter: "Filters",
    projekt: (n) => (n === 1 ? "project" : "projects"),
    gefunden: "found",
    region: "Region:",
    entfernen: "remove",
    zuruecksetzen: "Reset filters",
    darstellung: "Display",
    liste: "List",
    karte: "Map",
    passung: "% match",
    keine: "No matching projects",
    keinePortal: "Adjust the filters – or set up a search profile and we will get in touch as soon as a suitable project comes in.",
    keineOeffentlich: "Adjust the filters or create a search profile as an investor – we will get in touch as soon as a suitable project comes in.",
    suchprofil: "Create a search profile",
  },
};

const KURVE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * FLIP-Übergang für die Kartenliste: Bleibende Karten gleiten an ihren neuen Platz,
 * neu hinzukommende blenden gestaffelt ein. Nur transform/opacity (Web Animations API),
 * nichts beim ersten Rendern, nichts bei reduzierter Bewegung, nur im sichtbaren Bereich.
 */
function messen(ul) {
  const m = new Map();
  if (ul) for (const li of ul.children) m.set(li.dataset.id, { x: li.offsetLeft, y: li.offsetTop });
  return m;
}

function useFlipListe(schluessel) {
  const ref = useRef(null);
  const positionen = useRef(null);
  const leer = schluessel === ""; // Liste ein-/ausgeblendet → Beobachter neu anhängen
  // Positionen relativ zur Liste (ul ist `relative`); bei Größenänderung (Spaltenwechsel) neu erfassen,
  // damit der nächste Filterwechsel nicht von veralteten Plätzen aus animiert
  useEffect(() => {
    const ul = ref.current;
    if (!ul || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      positionen.current = messen(ref.current);
    });
    ro.observe(ul);
    return () => ro.disconnect();
  }, [leer]);
  useLayoutEffect(() => {
    const ul = ref.current;
    const alt = positionen.current;
    const neu = messen(ul);
    positionen.current = neu;
    if (!ul || !alt || typeof ul.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hoehe = window.innerHeight;
    let neuIndex = 0;
    for (const li of ul.children) {
      const r = li.getBoundingClientRect();
      if (r.bottom < -40 || r.top > hoehe + 40) continue; // außerhalb des Bildes: nichts animieren
      const a = alt.get(li.dataset.id);
      const n = neu.get(li.dataset.id);
      if (a) {
        const dx = a.x - n.x;
        const dy = a.y - n.y;
        if (dx || dy) li.animate([{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: "none" }], { duration: 460, easing: KURVE });
      } else {
        li.animate(
          [{ opacity: 0, transform: "translate3d(0, 14px, 0) scale(0.97)" }, { opacity: 1, transform: "none" }],
          { duration: 380, delay: Math.min(neuIndex++, 6) * 50, easing: KURVE, fill: "backwards" }
        );
      }
    }
  }, [schluessel]);
  return ref;
}

const LEER = { typ: "", land: "", phase: "", mwpMin: "", mwpMax: "", sortierung: "neu", ansicht: "alle", darstellung: "liste", region: "" };

function chipKlasse(aktiv) {
  return cn(
    "inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium ring-1 ring-inset transition-colors",
    aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
  );
}

export default function BoerseListe({ projekte = [], basisHref = "/projektboerse/", portal = false, start = {}, karte = true }) {
  const sprache = useSprache();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const [f, setF] = useState({ ...LEER, ...start });
  const [offen, setOffen] = useState(false);
  const setze = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && v !== LEER[k]) q.set(k, v);
    const url = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [f]);

  const basisListe = useMemo(() => {
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
  // Region (Bundesland/Kanton) aus der Karte – wirkt auf die Liste, die Karte zeigt alle übrigen Treffer
  const liste = useMemo(() => (f.region ? basisListe.filter((p) => p.bundesland === f.region) : basisListe), [basisListe, f.region]);

  const aktiveFilter = ["typ", "land", "phase", "mwpMin", "mwpMax", "region"].filter((k) => f[k]).length;
  const listeRef = useFlipListe(liste.map((p) => p.id).join("|"));
  // Trefferzahl: kurzer Einblend-Impuls bei jeder Änderung (Feedback auf den Filter)
  const anzahl = (
    <span key={liste.length} className="ov-num font-semibold text-ink-900 motion-safe:animate-ov-einblenden">{liste.length}</span>
  );
  const gemerkt = projekte.filter((p) => p.meinInteresse?.gemerkt).length;

  const filter = (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">{t.projekttyp}</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chipKlasse(!f.typ)} aria-pressed={!f.typ} onClick={() => setze("typ", "")}>{t.alle}</button>
          {Object.entries(PROJEKT_TYPEN).map(([k, v]) => (
            <button key={k} type="button" className={chipKlasse(f.typ === k)} aria-pressed={f.typ === k} onClick={() => setze("typ", f.typ === k ? "" : k)}>{en ? BEGRIFFE_EN.projektTyp[k] ?? v : v}</button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">{t.land}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipKlasse(!f.land)} aria-pressed={!f.land} onClick={() => setze("land", "")}>{t.alle}</button>
            {Object.keys(LAENDER).map((k) => (
              <button key={k} type="button" className={chipKlasse(f.land === k)} aria-pressed={f.land === k} onClick={() => setze("land", f.land === k ? "" : k)} title={en ? BEGRIFFE_EN.land[k] ?? LAENDER[k] : LAENDER[k]}>{k}</button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="filter-phase" className="mb-2 block text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">{t.phase}</label>
          <select id="filter-phase" className={cn(auswahlfeld, "h-10")} value={f.phase} onChange={(e) => setze("phase", e.target.value)}>
            <option value="">{t.allePhasen}</option>
            {PHASEN.map((p) => <option key={p.id} value={p.id}>{en ? BEGRIFFE_EN.phase[p.id] ?? p.label : p.label}</option>)}
          </select>
        </div>
        <div>
          <p id="filter-mwp" className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">{t.leistung}</p>
          <div className="flex items-center gap-2" role="group" aria-labelledby="filter-mwp">
            <input aria-label={t.mwpVon} inputMode="decimal" placeholder={t.von} className={cn(eingabe, "h-10")} value={f.mwpMin} onChange={(e) => setze("mwpMin", e.target.value)} />
            <span className="text-ink-400">–</span>
            <input aria-label={t.mwpBis} inputMode="decimal" placeholder={t.bis} className={cn(eingabe, "h-10")} value={f.mwpMax} onChange={(e) => setze("mwpMax", e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="filter-sort" className="mb-2 block text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">{t.sortierung}</label>
          <select id="filter-sort" className={cn(auswahlfeld, "h-10")} value={f.sortierung} onChange={(e) => setze("sortierung", e.target.value)}>
            <option value="neu">{t.sort.neu}</option>
            <option value="gross">{t.sort.gross}</option>
            <option value="phase">{t.sort.phase}</option>
            {portal && <option value="passung">{t.sort.passung}</option>}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {portal && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.ansicht}>
          {["alle", "merkliste", "aktiv"].map((k) => [k, t.ansichten[k]]).map(([k, v]) => (
            <button key={k} type="button" className={chipKlasse(f.ansicht === k)} aria-pressed={f.ansicht === k} onClick={() => setze("ansicht", k)}>{v}</button>
          ))}
        </div>
          {gemerkt >= 2 && (
            <Link href="/portal/boerse/vergleich" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[13.5px] font-semibold text-white hover:bg-ov-700 sm:ml-auto">
              <Columns3 aria-hidden="true" className="h-4 w-4" /> {t.vergleichen} ({Math.min(4, gemerkt)})
            </Link>
          )}
        </div>
      )}

      <div className="mb-6 rounded-3xl bg-white p-4 shadow-e1 ring-1 ring-ink-200/70 md:mb-8 md:p-6">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <button type="button" onClick={() => setOffen((o) => !o)} aria-expanded={offen} aria-controls="boerse-filter" className="inline-flex h-10 items-center gap-2 rounded-full bg-sand-50 px-4 text-[14px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> {t.filter}{aktiveFilter ? ` (${aktiveFilter})` : ""}
          </button>
          <p className="text-[13.5px] text-ink-500" aria-live="polite">{anzahl} {t.projekt(liste.length)}</p>
        </div>
        <div id="boerse-filter" className={cn("md:block", offen ? "mt-4 block" : "hidden")}>{filter}</div>
        <div className={cn("flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4", karte ? "mt-4" : "mt-4 max-md:hidden")}>
          <p className="hidden text-[14px] text-ink-600 md:block" aria-live="polite">{anzahl} {t.projekt(liste.length)} {t.gefunden}</p>
          {f.region && (
            <button type="button" onClick={() => setze("region", "")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ov-50 px-3 text-[13px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-200 hover:bg-ov-100">
              {t.region} {f.region} <X aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">{t.entfernen}</span>
            </button>
          )}
          {aktiveFilter > 0 && (
            <button type="button" onClick={() => setF((x) => ({ ...LEER, sortierung: x.sortierung, ansicht: x.ansicht, darstellung: x.darstellung }))} className="inline-flex items-center gap-1.5 rounded-full text-[13.5px] font-semibold text-ink-600 hover:text-ink-900">
              <X aria-hidden="true" className="h-4 w-4" /> {t.zuruecksetzen}
            </button>
          )}
          {karte && (
            <div className="ml-auto inline-flex rounded-full bg-sand-50 p-1 ring-1 ring-inset ring-ink-200" role="group" aria-label={t.darstellung}>
              {[["liste", t.liste, List], ["karte", t.karte, KarteIcon]].map(([k, label, Icon]) => (
                <button key={k} type="button" aria-pressed={f.darstellung === k} onClick={() => setze("darstellung", k)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors", f.darstellung === k ? "bg-navy-900 text-white shadow-e1" : "text-ink-700 hover:bg-white")}>
                  <Icon aria-hidden="true" className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {karte && f.darstellung === "karte" && (
        <div className="ov-tab-panel mb-8">
          <KarteDach projekte={basisListe} region={f.region} onRegion={(r) => setze("region", r)} />
        </div>
      )}

      {liste.length ? (
        <ul ref={listeRef} className="relative grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((p) => (
            <li key={p.id} data-id={p.id}>
              <ProjektKarte
                projekt={p}
                href={`${basisHref}${portal ? p.id : p.slug}`}
                extra={
                  portal && (p.matching || (p.meinInteresse && p.meinInteresse.status !== "gemerkt")) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {p.matching && (
                        <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", p.matching.score >= 70 ? "bg-ov-50 text-ov-800 ring-ov-200" : "bg-ink-50 text-ink-600 ring-ink-200")}>
                          {p.matching.score} {t.passung}
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
        <div className="ov-tab-panel flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center">
          <SearchX aria-hidden="true" className="h-8 w-8 text-ink-400" />
          <p className="mt-3 font-display text-[18px] font-bold text-ink-900">{t.keine}</p>
          <p className="mt-1 max-w-md text-[14.5px] text-ink-600">
            {portal ? t.keinePortal : t.keineOeffentlich}
          </p>
          {/* Leere Trefferliste ist ein Einstieg, keine Sackgasse: Filter lösen oder Suchprofil anlegen */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {aktiveFilter > 0 && (
              <Button variant="secondary" onClick={() => setF((x) => ({ ...LEER, sortierung: x.sortierung, ansicht: x.ansicht, darstellung: x.darstellung }))}>
                {t.zuruecksetzen}
              </Button>
            )}
            {!portal && (
              <Button href="/registrieren?rolle=investor" pfeil>
                {t.suchprofil}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

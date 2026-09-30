"use client";

// Gemeinsame Listen-/Tabellenkomponente für Portal und Backoffice:
// Suche (unscharf), Filter-Chips, Sortierung (aria-sort), gespeicherte Ansichten, Spaltenauswahl,
// Mehrfachauswahl mit Massenaktionen, „Mehr laden“, mobil als Karten. Zustand optional in der URL.
//
// Die Daten kommen serverseitig rechtegeprüft; hier wird nur angezeigt, gefiltert und sortiert.
// Massenaktionen rufen die bestehenden, rechtegeprüften APIs auf.
//
// spalten:  [{ id, label, wert:(z)=>Sortier-/CSV-Wert, zelle?:(z)=>Node, sortierbar=true, standard=true, pflicht=false,
//             mobil?: "titel"|"badge"|"meta"|false, klasse? }]
// filter:   [{ id, label, optionen:[{ wert, label }], wert:(z)=>Wert|Wert[] }]
// ansichten:[{ id, label, zustand:{ q?, filter?, sortierung? } }]  (vordefiniert; eigene speichert der Browser)
// aktionen: [{ id, label, icon?, ausfuehren: async (zeilen) => "Meldung"|void, gefahr?, bestaetigen? }]

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Bookmark, Check, ChevronDown, Columns3, FileSpreadsheet, Loader2, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { rangieren } from "@/lib/plattform/suche";
import { csv } from "@/lib/plattform/csv";
import { speicherLesen, speicherSchreiben } from "../speicher";
import LeerZustand from "../LeerZustand";

const LEER_ZUSTAND = { q: "", filter: {}, sortierung: null };

function vergleich(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1;
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "de", { numeric: true, sensitivity: "base" });
}

/** Kleines Aufklapp-Menü (Filter, Spalten, Ansichten) – schließt bei Esc/Klick daneben */
function Menue({ label, icon: Icon, zaehler, children, rechts = false, breit = false, knopfKlasse }) {
  const [offen, setOffen] = useState(false);
  const ref = useRef(null);
  const knopf = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!offen) return undefined;
    const klick = (e) => !ref.current?.contains(e.target) && setOffen(false);
    const taste = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOffen(false);
        knopf.current?.focus();
      }
    };
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);
  return (
    <div className="relative" ref={ref}>
      <button
        ref={knopf}
        type="button"
        aria-expanded={offen}
        aria-controls={id}
        onClick={() => setOffen((o) => !o)}
        className={cn("inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-medium ring-1 ring-inset transition-colors", zaehler ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300", knopfKlasse)}
      >
        {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
        {label}
        {zaehler ? <span className="ov-num rounded-full bg-white/20 px-1.5 text-[11.5px] font-bold">{zaehler}</span> : null}
        <ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition-transform", offen && "rotate-180")} />
      </button>
      {offen && (
        <div id={id} className={cn("absolute z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_20px_50px_-20px_rgba(3,18,43,0.45)] ring-1 ring-ink-200", rechts ? "right-0" : "left-0", breit ? "w-[300px]" : "w-[250px]", "max-w-[calc(100vw-32px)]")}>
          {typeof children === "function" ? children(() => setOffen(false)) : children}
        </div>
      )}
    </div>
  );
}

function Haken({ an }) {
  return (
    <span aria-hidden="true" className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] ring-1 ring-inset", an ? "bg-ov-600 text-white ring-ov-600" : "bg-white ring-ink-300")}>
      {an && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

export default function DatenListe({
  id: listenId,
  titel,
  zeilen = [],
  spalten = [],
  filter = [],
  ansichten = [],
  aktionen = [],
  suche = null,
  start = {},
  urlSync = false,
  seiteGroesse = 25,
  csvName = null,
  leer = null,
  kopfAktion = null,
  auswahl: auswahlAn = true,
  zeileKlasse,
}) {
  const basis = useId().replace(/:/g, "");
  const speicherSpalten = `oi-liste:${listenId}:spalten`;
  const speicherAnsichten = `oi-liste:${listenId}:ansichten`;
  const standardSpalten = useMemo(() => spalten.filter((s) => s.standard !== false).map((s) => s.id), [spalten]);

  const [z, setZ] = useState(() => ({ ...LEER_ZUSTAND, ...start, filter: { ...(start.filter || {}) } }));
  const [sichtbar, setSichtbar] = useState(standardSpalten);
  const [eigene, setEigene] = useState([]);
  const [ausgewaehlt, setAusgewaehlt] = useState(() => new Set());
  const [anzahl, setAnzahl] = useState(seiteGroesse);
  const [meldung, setMeldung] = useState(null);
  const [laeuft, setLaeuft] = useState("");
  const [neuerName, setNeuerName] = useState("");

  useEffect(() => {
    const gespeichert = speicherLesen(speicherSpalten, null);
    if (Array.isArray(gespeichert)) setSichtbar(spalten.filter((s) => s.pflicht || gespeichert.includes(s.id)).map((s) => s.id));
    const a = speicherLesen(speicherAnsichten, []);
    if (Array.isArray(a)) setEigene(a.filter((x) => x && typeof x.label === "string" && x.zustand).slice(0, 12));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speicherSpalten, speicherAnsichten]);

  // Zustand in der URL (teilbare Links, Zurück-Taste)
  useEffect(() => {
    if (!urlSync) return;
    const q = new URLSearchParams(window.location.search);
    for (const k of ["q", "sort", ...filter.map((f) => f.id)]) q.delete(k);
    if (z.q) q.set("q", z.q);
    for (const f of filter) if (z.filter[f.id]?.length) q.set(f.id, z.filter[f.id].join(","));
    if (z.sortierung) q.set("sort", `${z.sortierung.spalte}:${z.sortierung.richtung}`);
    const s = q.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [z, urlSync, filter]);

  useEffect(() => setAnzahl(seiteGroesse), [z, seiteGroesse]);

  const gefiltert = useMemo(() => {
    let l = zeilen.filter((zeile) =>
      filter.every((f) => {
        const gewaehlt = z.filter[f.id];
        if (!gewaehlt?.length) return true;
        const w = f.wert(zeile);
        return Array.isArray(w) ? w.some((x) => gewaehlt.includes(String(x))) : gewaehlt.includes(String(w));
      })
    );
    if (z.q && suche) l = rangieren(l, z.q, suche.felder, { limit: 5000, mindestens: 0.3 });
    if (z.sortierung) {
      const s = spalten.find((x) => x.id === z.sortierung.spalte);
      if (s) {
        const r = z.sortierung.richtung === "ab" ? -1 : 1;
        l = [...l].sort((a, b) => r * vergleich(s.wert(a), s.wert(b)));
      }
    }
    return l;
  }, [zeilen, filter, z, suche, spalten]);

  const angezeigt = gefiltert.slice(0, anzahl);
  const aktiveSpalten = spalten.filter((s) => s.pflicht || sichtbar.includes(s.id));
  const auswahlZeilen = zeilen.filter((x) => ausgewaehlt.has(x.id));
  const alleGewaehlt = gefiltert.length > 0 && gefiltert.every((x) => ausgewaehlt.has(x.id));
  const aktiveFilter = Object.values(z.filter).reduce((s, v) => s + (v?.length || 0), 0);

  // Auswahl bereinigen, wenn Zeilen wegfallen (z. B. nach router.refresh)
  useEffect(() => {
    setAusgewaehlt((alt) => {
      const ids = new Set(zeilen.map((x) => x.id));
      const neu = new Set([...alt].filter((x) => ids.has(x)));
      return neu.size === alt.size ? alt : neu;
    });
  }, [zeilen]);

  const setzeFilter = (fid, wert) =>
    setZ((x) => {
      const alt = x.filter[fid] || [];
      const neu = alt.includes(wert) ? alt.filter((y) => y !== wert) : [...alt, wert];
      return { ...x, filter: { ...x.filter, [fid]: neu } };
    });

  const sortieren = (sid) =>
    setZ((x) => {
      if (x.sortierung?.spalte !== sid) return { ...x, sortierung: { spalte: sid, richtung: "auf" } };
      if (x.sortierung.richtung === "auf") return { ...x, sortierung: { spalte: sid, richtung: "ab" } };
      return { ...x, sortierung: null };
    });

  const umschalten = (zid) =>
    setAusgewaehlt((alt) => {
      const neu = new Set(alt);
      if (neu.has(zid)) neu.delete(zid);
      else neu.add(zid);
      return neu;
    });

  const alleUmschalten = () => setAusgewaehlt(alleGewaehlt ? new Set() : new Set(gefiltert.map((x) => x.id)));

  const spalteUmschalten = (sid) => {
    const neu = sichtbar.includes(sid) ? sichtbar.filter((x) => x !== sid) : [...sichtbar, sid];
    setSichtbar(neu);
    speicherSchreiben(speicherSpalten, neu);
  };

  const ansichtSpeichern = () => {
    const label = neuerName.trim().slice(0, 40) || `Ansicht ${eigene.length + 1}`;
    const neu = [...eigene.filter((a) => a.label !== label), { id: `eigen-${Date.now().toString(36)}`, label, zustand: { q: z.q, filter: z.filter, sortierung: z.sortierung } }].slice(-12);
    setEigene(neu);
    speicherSchreiben(speicherAnsichten, neu);
    setNeuerName("");
    setMeldung({ ton: "ok", text: `Ansicht „${label}“ gespeichert.` });
  };

  const ansichtLoeschen = (aid) => {
    const neu = eigene.filter((a) => a.id !== aid);
    setEigene(neu);
    speicherSchreiben(speicherAnsichten, neu);
  };

  const ausfuehren = useCallback(
    async (a) => {
      const liste = zeilen.filter((x) => ausgewaehlt.has(x.id));
      if (!liste.length) return;
      if (a.bestaetigen && !window.confirm(typeof a.bestaetigen === "function" ? a.bestaetigen(liste) : a.bestaetigen)) return;
      setLaeuft(a.id);
      setMeldung(null);
      try {
        const text = await a.ausfuehren(liste);
        setMeldung({ ton: "ok", text: text || `${liste.length} ${liste.length === 1 ? "Eintrag" : "Einträge"} bearbeitet.` });
        setAusgewaehlt(new Set());
      } catch (e) {
        setMeldung({ ton: "fehler", text: e?.message || "Die Aktion ist fehlgeschlagen." });
      } finally {
        setLaeuft("");
      }
    },
    [ausgewaehlt, zeilen]
  );

  const csvExport = () => {
    const liste = auswahlZeilen.length ? auswahlZeilen : gefiltert;
    const text = csv(aktiveSpalten.filter((s) => s.csv !== false).map((s) => ({ label: s.label, wert: s.csvWert || s.wert })), liste);
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName || listenId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMeldung({ ton: "ok", text: `${liste.length} ${liste.length === 1 ? "Zeile" : "Zeilen"} als CSV exportiert.` });
  };

  const titelSpalte = spalten.find((s) => s.mobil === "titel") || spalten[0];
  const badgeSpalten = aktiveSpalten.filter((s) => s.mobil === "badge");
  const metaSpalten = aktiveSpalten.filter((s) => s.mobil === "meta" || (!s.mobil && s !== titelSpalte && s.mobil !== false));

  const alleAnsichten = [...ansichten, ...eigene];
  const aktiveAnsicht = alleAnsichten.find((a) => JSON.stringify({ ...LEER_ZUSTAND, ...a.zustand, filter: a.zustand.filter || {} }) === JSON.stringify({ q: z.q, filter: Object.fromEntries(Object.entries(z.filter).filter(([, v]) => v?.length)), sortierung: z.sortierung }));

  return (
    <div className="min-w-0">
      {/* Werkzeugleiste */}
      <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-3 ring-1 ring-ink-200/70 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {suche && (
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{suche.label || "Liste durchsuchen"}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
              <input
                type="search"
                value={z.q}
                onChange={(e) => setZ((x) => ({ ...x, q: e.target.value.slice(0, 80) }))}
                placeholder={suche.platzhalter || "Suchen …"}
                className="h-10 w-full rounded-full bg-sand-50 pl-10 pr-4 text-[14.5px] text-ink-900 outline-none ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500"
              />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {filter.map((f) => (
              <Menue key={f.id} label={f.label} icon={SlidersHorizontal} zaehler={z.filter[f.id]?.length || 0}>
                <fieldset>
                  <legend className="px-2 pb-1 pt-1 text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">{f.label}</legend>
                  {f.optionen.map((o) => {
                    const an = (z.filter[f.id] || []).includes(String(o.wert));
                    const zahl = zeilen.filter((zeile) => {
                      const w = f.wert(zeile);
                      return Array.isArray(w) ? w.map(String).includes(String(o.wert)) : String(w) === String(o.wert);
                    }).length;
                    return (
                      <label key={o.wert} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-[14px] text-ink-800 hover:bg-sand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
                        <input type="checkbox" className="sr-only" checked={an} onChange={() => setzeFilter(f.id, String(o.wert))} />
                        <Haken an={an} />
                        <span className="min-w-0 flex-1 truncate">{o.label}</span>
                        <span className="ov-num text-[12px] text-ink-400">{zahl}</span>
                      </label>
                    );
                  })}
                </fieldset>
              </Menue>
            ))}
            {(ansichten.length > 0 || true) && (
              <Menue label={aktiveAnsicht ? aktiveAnsicht.label : "Ansichten"} icon={Bookmark} breit rechts>
                {(schliessen) => (
                  <div>
                    <p className="px-2 pb-1 pt-1 text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Ansicht wählen</p>
                    <button type="button" onClick={() => { setZ({ ...LEER_ZUSTAND }); schliessen(); }} className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[14px] text-ink-800 hover:bg-sand-50">
                      <span className="flex-1">Alle anzeigen</span>
                    </button>
                    {alleAnsichten.map((a) => (
                      <div key={a.id} className="flex items-center gap-1">
                        <button type="button" onClick={() => { setZ({ ...LEER_ZUSTAND, ...a.zustand, filter: { ...(a.zustand.filter || {}) } }); schliessen(); }} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left text-[14px] hover:bg-sand-50", aktiveAnsicht?.id === a.id ? "font-semibold text-ov-800" : "text-ink-800")}>
                          {aktiveAnsicht?.id === a.id && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                          <span className="truncate">{a.label}</span>
                        </button>
                        {a.id.startsWith("eigen-") && (
                          <button type="button" onClick={() => ansichtLoeschen(a.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-700" aria-label={`Ansicht „${a.label}“ löschen`}>
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <form
                      className="mt-2 border-t border-ink-100 px-1 pt-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        ansichtSpeichern();
                        schliessen();
                      }}
                    >
                      <label htmlFor={`${basis}-ansicht`} className="px-1 text-[12px] font-semibold text-ink-600">Aktuelle Filter als Ansicht speichern</label>
                      <div className="mt-1.5 flex gap-1.5">
                        <input id={`${basis}-ansicht`} value={neuerName} onChange={(e) => setNeuerName(e.target.value)} maxLength={40} placeholder="Name, z. B. Meine offenen" className="h-9 min-w-0 flex-1 rounded-lg bg-sand-50 px-2.5 text-[13.5px] outline-none ring-1 ring-inset ring-ink-200 focus-visible:ring-2 focus-visible:ring-ov-500" />
                        <button type="submit" className="inline-flex h-9 items-center gap-1 rounded-lg bg-navy-700 px-2.5 text-[13px] font-semibold text-white hover:bg-navy-800">
                          <Plus aria-hidden="true" className="h-4 w-4" /> Speichern
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </Menue>
            )}
            <Menue label="Spalten" icon={Columns3} rechts knopfKlasse="max-md:hidden">
              <fieldset>
                <legend className="px-2 pb-1 pt-1 text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Sichtbare Spalten</legend>
                {spalten.map((s) => {
                  const an = s.pflicht || sichtbar.includes(s.id);
                  return (
                    <label key={s.id} className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2 text-[14px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", s.pflicht ? "cursor-not-allowed text-ink-400" : "cursor-pointer text-ink-800 hover:bg-sand-50")}>
                      <input type="checkbox" className="sr-only" checked={an} disabled={s.pflicht} onChange={() => spalteUmschalten(s.id)} />
                      <Haken an={an} />
                      <span className="flex-1">{s.label}</span>
                      {s.pflicht && <span className="text-[11.5px]">immer</span>}
                    </label>
                  );
                })}
              </fieldset>
            </Menue>
            <button type="button" onClick={csvExport} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 text-[13.5px] font-medium text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-ink-300">
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4" /> CSV{auswahlZeilen.length ? ` (${auswahlZeilen.length})` : ""}
            </button>
            {kopfAktion}
          </div>
        </div>

        {/* aktive Filter als entfernbare Chips */}
        {(aktiveFilter > 0 || z.q) && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3">
            {z.q && (
              <button type="button" onClick={() => setZ((x) => ({ ...x, q: "" }))} className="inline-flex h-8 items-center gap-1 rounded-full bg-ov-50 px-3 text-[13px] font-medium text-ov-900 ring-1 ring-inset ring-ov-200 hover:bg-ov-100" aria-label={`Suche „${z.q}“ entfernen`}>
                „{z.q}“ <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
            {filter.flatMap((f) =>
              (z.filter[f.id] || []).map((w) => (
                <button key={`${f.id}:${w}`} type="button" onClick={() => setzeFilter(f.id, w)} className="inline-flex h-8 items-center gap-1 rounded-full bg-navy-50 px-3 text-[13px] font-medium text-navy-800 ring-1 ring-inset ring-navy-100 hover:bg-navy-100" aria-label={`Filter ${f.label}: ${f.optionen.find((o) => String(o.wert) === w)?.label || w} entfernen`}>
                  <span className="text-navy-600">{f.label}:</span> {f.optionen.find((o) => String(o.wert) === w)?.label || w} <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              ))
            )}
            <button type="button" onClick={() => setZ((x) => ({ ...LEER_ZUSTAND, sortierung: x.sortierung }))} className="ml-1 text-[13px] font-semibold text-ink-500 hover:text-ink-900">Alle Filter entfernen</button>
          </div>
        )}
      </div>

      {/* Massenaktionen */}
      {auswahlAn && ausgewaehlt.size > 0 && (
        <div role="region" aria-label="Massenaktionen" className="sticky top-[72px] z-10 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-950 px-4 py-2.5 text-white shadow-lg">
          <p className="mr-2 text-[14px] font-semibold"><span className="ov-num">{ausgewaehlt.size}</span> ausgewählt</p>
          {aktionen.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.id} type="button" disabled={!!laeuft} onClick={() => ausfuehren(a)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 ring-inset disabled:opacity-50", a.gefahr ? "text-white ring-white/30 hover:bg-white/10" : "bg-ov-600 ring-ov-600 hover:bg-ov-500")}>
                {laeuft === a.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
                {a.label}
              </button>
            );
          })}
          <button type="button" onClick={csvExport} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 ring-inset ring-white/30 hover:bg-white/10">
            <FileSpreadsheet aria-hidden="true" className="h-4 w-4" /> Als CSV
          </button>
          <button type="button" onClick={() => setAusgewaehlt(new Set())} className="ml-auto inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13.5px] text-white/75 hover:bg-white/10 hover:text-white">
            <X aria-hidden="true" className="h-4 w-4" /> Auswahl aufheben
          </button>
        </div>
      )}
      <p role="status" aria-live="polite" className={meldung ? cn("mb-3 rounded-xl px-4 py-2.5 text-[14px] ring-1", meldung.ton === "fehler" ? "bg-red-50 text-red-800 ring-red-200" : "bg-ov-50 text-ov-900 ring-ov-200") : "sr-only"}>
        {meldung?.text || ""}
      </p>

      {gefiltert.length === 0 ? (
        zeilen.length === 0 && leer ? (
          leer
        ) : (
          <LeerZustand
            art="suche"
            kompakt
            titel="Keine Treffer"
            text="Mit diesen Filtern gibt es keine Einträge. Entfernen Sie einzelne Filter oder die Suche."
            aktion={<button type="button" onClick={() => setZ({ ...LEER_ZUSTAND })} className="inline-flex h-10 items-center rounded-full bg-navy-700 px-4 text-[14px] font-semibold text-white hover:bg-navy-800">Alle Filter zurücksetzen</button>}
          />
        )
      ) : (
        <div className="rounded-3xl bg-white ring-1 ring-ink-200/70">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 md:px-6">
            <h2 className="font-display text-[16px] font-bold text-ink-900">
              {titel ? `${titel} · ` : ""}
              <span className="ov-num">{gefiltert.length}</span>
              {gefiltert.length !== zeilen.length && <span className="font-sans text-[13px] font-normal text-ink-500"> von {zeilen.length}</span>}
            </h2>
            {/* Sortierung mobil */}
            <label className="flex items-center gap-2 text-[13px] text-ink-600 md:hidden">
              <span>Sortieren</span>
              <select
                value={z.sortierung ? `${z.sortierung.spalte}:${z.sortierung.richtung}` : ""}
                onChange={(e) => {
                  const [spalte, richtung] = e.target.value.split(":");
                  setZ((x) => ({ ...x, sortierung: spalte ? { spalte, richtung } : null }));
                }}
                className="h-9 rounded-full bg-sand-50 px-3 text-[13px] ring-1 ring-inset ring-ink-200"
              >
                <option value="">Standard</option>
                {spalten.filter((s) => s.sortierbar !== false).flatMap((s) => [
                  <option key={`${s.id}:auf`} value={`${s.id}:auf`}>{s.label} ↑</option>,
                  <option key={`${s.id}:ab`} value={`${s.id}:ab`}>{s.label} ↓</option>,
                ])}
              </select>
            </label>
            {auswahlAn && (
              <button type="button" onClick={alleUmschalten} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800 md:hidden">
                {alleGewaehlt ? "Keine auswählen" : "Alle auswählen"}
              </button>
            )}
          </div>

          {/* Tabelle ab md */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">{titel || "Liste"} – Spaltenköpfe sortieren per Klick</caption>
              <thead>
                <tr className="border-b border-ink-100 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                  {auswahlAn && (
                    <th scope="col" className="w-12 py-3 pl-6 pr-2">
                      <label className="flex cursor-pointer items-center">
                        <input type="checkbox" className="sr-only peer" checked={alleGewaehlt} onChange={alleUmschalten} aria-label={alleGewaehlt ? "Auswahl aufheben" : `Alle ${gefiltert.length} auswählen`} />
                        <span className="rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-ov-500"><Haken an={alleGewaehlt} /></span>
                      </label>
                    </th>
                  )}
                  {aktiveSpalten.map((s) => {
                    const sort = z.sortierung?.spalte === s.id ? z.sortierung.richtung : null;
                    return (
                      <th key={s.id} scope="col" aria-sort={sort === "auf" ? "ascending" : sort === "ab" ? "descending" : undefined} className={cn("px-4 py-3 font-semibold first:pl-6 last:pr-6", s.klasse)}>
                        {s.sortierbar === false ? (
                          s.label
                        ) : (
                          <button type="button" onClick={() => sortieren(s.id)} className={cn("group inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink-900", sort && "text-ink-900")}>
                            {s.label}
                            {sort === "auf" ? <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" /> : sort === "ab" ? <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" /> : <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {angezeigt.map((zeile) => {
                  const an = ausgewaehlt.has(zeile.id);
                  return (
                    <tr key={zeile.id} className={cn(an ? "bg-ov-50/60" : "hover:bg-sand-50", zeileKlasse?.(zeile))}>
                      {auswahlAn && (
                        <td className="py-3.5 pl-6 pr-2 align-top">
                          <label className="flex cursor-pointer items-center pt-0.5">
                            <input type="checkbox" className="sr-only peer" checked={an} onChange={() => umschalten(zeile.id)} aria-label={`${String(titelSpalte.wert(zeile) ?? zeile.id)} auswählen`} />
                            <span className="rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-ov-500"><Haken an={an} /></span>
                          </label>
                        </td>
                      )}
                      {aktiveSpalten.map((s) => (
                        <td key={s.id} className={cn("px-4 py-3.5 align-top first:pl-6 last:pr-6", s.klasse)}>{s.zelle ? s.zelle(zeile) : String(s.wert(zeile) ?? "–")}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Karten mobil */}
          <ul className="divide-y divide-ink-100 md:hidden">
            {angezeigt.map((zeile) => {
              const an = ausgewaehlt.has(zeile.id);
              return (
                <li key={zeile.id} className={cn("flex gap-3 px-4 py-4", an && "bg-ov-50/60")}>
                  {auswahlAn && (
                    <label className="flex cursor-pointer pt-0.5">
                      <input type="checkbox" className="sr-only peer" checked={an} onChange={() => umschalten(zeile.id)} aria-label={`${String(titelSpalte.wert(zeile) ?? zeile.id)} auswählen`} />
                      <span className="rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-ov-500"><Haken an={an} /></span>
                    </label>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="min-w-0">{titelSpalte.zelle ? titelSpalte.zelle(zeile) : String(titelSpalte.wert(zeile) ?? "")}</div>
                    {badgeSpalten.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{badgeSpalten.map((s) => <span key={s.id}>{s.zelle ? s.zelle(zeile) : String(s.wert(zeile) ?? "")}</span>)}</div>}
                    {metaSpalten.length > 0 && (
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                        {metaSpalten.map((s) => (
                          <div key={s.id} className="min-w-0">
                            <dt className="text-[11.5px] text-ink-400">{s.label}</dt>
                            <dd className="min-w-0 break-words text-ink-700">{s.zelle ? s.zelle(zeile) : String(s.wert(zeile) ?? "–")}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {gefiltert.length > angezeigt.length && (
            <div className="flex flex-col items-center gap-1 border-t border-ink-100 px-4 py-4">
              <button type="button" onClick={() => setAnzahl((a) => a + seiteGroesse)} className="inline-flex h-10 items-center rounded-full bg-white px-5 text-[14px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:ring-ink-300">
                Mehr laden
              </button>
              <p className="text-[12.5px] text-ink-500"><span className="ov-num">{angezeigt.length}</span> von <span className="ov-num">{gefiltert.length}</span> angezeigt</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

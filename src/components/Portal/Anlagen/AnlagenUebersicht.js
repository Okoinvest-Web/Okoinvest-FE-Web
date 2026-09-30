"use client";

// Übersicht der Bestandsanlagen: Summen (Leistung jetzt, Erzeugung heute/Monat/Jahr, Verbrauch, Eigenverbrauchsquote,
// Autarkie, Netzbezug, Einspeisung, CO₂), Ampel-Filter, Suche („/“), Typ-Filter, Ansicht Kacheln | Liste | Karte („v“).
// Aktualisiert sich alle 30 s (nur sichtbarer Tab) über /api/portal/anlagen – Rechte prüft der Server.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, BatteryCharging, Factory, Gauge, LayoutGrid, Leaf, List, Map as MapIcon, PlugZap, RefreshCw, Search, Sun, Zap } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { ANLAGE_TYPEN, AMPEL, kw, kwh, kwpText, tonnen } from "@/lib/plattform/anlagen";
import { AMPEL_KLASSE, AmpelBadge, Wert, alterText, pct } from "./teile";
import AnlagenKarte from "./AnlagenKarte";

const ANSICHTEN = [
  { id: "kacheln", label: "Kacheln", icon: LayoutGrid },
  { id: "liste", label: "Liste", icon: List },
  { id: "karte", label: "Karte", icon: MapIcon },
];

function speichern(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* privat */
  }
}
function laden(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export default function AnlagenUebersicht({ initial }) {
  const [daten, setDaten] = useState(initial);
  const [ansicht, setAnsicht] = useState("kacheln");
  const [q, setQ] = useState("");
  const [typ, setTyp] = useState("");
  const [ampel, setAmpel] = useState("");
  const [region, setRegion] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [jetzt, setJetzt] = useState(null); // erst nach dem Laden (sonst Hydration-Abweichung)
  const suchRef = useRef(null);

  useEffect(() => {
    const a = laden("oi-anlagen-ansicht");
    if (ANSICHTEN.some((x) => x.id === a)) setAnsicht(a);
  }, []);
  const ansichtSetzen = (a) => {
    setAnsicht(a);
    speichern("oi-anlagen-ansicht", a);
  };

  const aktualisieren = useCallback(async () => {
    setLaedt(true);
    try {
      const r = await fetch("/api/portal/anlagen", { cache: "no-store", credentials: "same-origin" });
      if (r.ok) setDaten(await r.json());
    } catch {
      /* nächster Versuch */
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") aktualisieren();
    }, 30000);
    setJetzt(Date.now());
    const u = setInterval(() => setJetzt(Date.now()), 5000);
    return () => {
      clearInterval(t);
      clearInterval(u);
    };
  }, [aktualisieren]);

  // Tastatur: „/“ Suche, „v“ Ansicht wechseln (nicht in Eingabefeldern)
  useEffect(() => {
    const taste = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target?.tagName || "") || e.target?.isContentEditable) return;
      if (e.key === "/") {
        e.preventDefault();
        suchRef.current?.focus();
      } else if (e.key === "v") {
        const i = ANSICHTEN.findIndex((x) => x.id === ansicht);
        ansichtSetzen(ANSICHTEN[(i + 1) % ANSICHTEN.length].id);
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  });

  const alle = useMemo(() => daten.anlagen || [], [daten.anlagen]);
  const liste = useMemo(() => {
    const s = q.trim().toLowerCase();
    return alle
      .filter((a) => !typ || a.typ === typ)
      .filter((a) => !ampel || a.ampel?.id === ampel)
      .filter((a) => !region || `${a.land}|${a.bundesland}` === region)
      .filter((a) => !s || [a.name, a.ort, a.bundesland, a.typLabel, a.organisation?.name, a.kunde?.firma, a.eigentuemer].join(" ").toLowerCase().includes(s)); // auch nach Eigentümergesellschaft
  }, [alle, q, typ, ampel, region]);
  const typen = useMemo(() => [...new Set(alle.map((a) => a.typ))], [alle]);
  const s = daten.summe || {};
  const filterAktiv = q || typ || ampel || region;

  return (
    <div className="space-y-6">
      {daten.messfehler && (
        <p role="status" className="rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-900 ring-1 ring-inset ring-sun-400/40">
          Messdaten derzeit nicht verfügbar: {daten.messfehler} Stammdaten und Störungen werden weiter angezeigt.
        </p>
      )}

      {/* Summen */}
      <section aria-label="Summen über alle Anlagen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Wert ton="dunkel" icon={Zap} label="PV-Leistung jetzt" wert={kw(s.leistungKw)} hinweis={`${kwpText(s.kwp)} installiert · Verbrauch ${kw(s.verbrauchKw)}`} />
        <Wert icon={Sun} label="Erzeugung heute" wert={kwh(s.heute?.erzeugungKwh)} hinweis={`Eigenverbrauch ${pct(s.quotenHeute?.eigenverbrauchsquote)}`} />
        <Wert icon={Sun} label="Erzeugung Monat" wert={kwh(s.monat?.erzeugungKwh)} hinweis={`Verbrauch ${kwh(s.monat?.verbrauchKwh)}`} />
        <Wert icon={Sun} label="Erzeugung Jahr" wert={kwh(s.jahr?.erzeugungKwh)} hinweis={`seit 1. Januar`} />
      </section>
      <section aria-label="Kennzahlen im laufenden Jahr" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert icon={Factory} label="Verbrauch Jahr" wert={kwh(s.jahr?.verbrauchKwh)} />
        <Wert icon={Gauge} label="Eigenverbrauchsquote" wert={pct(s.quotenJahr?.eigenverbrauchsquote)} hinweis="Anteil PV vor Ort" />
        <Wert icon={BatteryCharging} label="Autarkie" wert={pct(s.quotenJahr?.autarkie)} hinweis="Verbrauch aus PV" />
        <Wert icon={ArrowDownToLine} label="Netzbezug Jahr" wert={kwh(s.jahr?.netzbezugKwh)} />
        <Wert icon={ArrowUpFromLine} label="Einspeisung Jahr" wert={kwh(s.jahr?.einspeisungKwh)} />
        <Wert icon={Leaf} label="CO₂ vermieden" wert={tonnen(s.co2JahrKg)} hinweis="im laufenden Jahr" />
      </section>

      {/* Werkzeugleiste */}
      <section aria-label="Filter und Ansicht" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {["laeuft", "warnung", "stoerung", "offline"].map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={ampel === id}
              onClick={() => setAmpel(ampel === id ? "" : id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 ring-inset transition-colors",
                ampel === id ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-800 ring-ink-200 hover:ring-ink-300"
              )}
            >
              <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", AMPEL_KLASSE[id].punkt)} />
              {AMPEL[id].label}
              <span className="ov-num rounded-full bg-ink-100 px-1.5 text-[12px] text-ink-700">{daten.ampeln?.[id] || 0}</span>
            </button>
          ))}
          <span className="ml-auto inline-flex items-center gap-2 text-[12.5px] text-ink-500" aria-live="polite">
            <button type="button" onClick={aktualisieren} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100" aria-label="Jetzt aktualisieren">
              <RefreshCw aria-hidden="true" className={cn("h-4 w-4", laedt && "motion-safe:animate-spin")} />
            </button>
            {jetzt ? `Stand ${alterText(daten.stand, jetzt)}` : ""}
            {daten.quelle === "simulator" && <span className="rounded-full bg-sun-300/25 px-2 py-0.5 text-[11.5px] font-semibold text-ink-800 ring-1 ring-inset ring-sun-400/40">Simulierte Messdaten</span>}
          </span>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Anlagen durchsuchen</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              ref={suchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, Ort, Bundesland … (Taste /)"
              className="block h-11 w-full rounded-full bg-white pl-10 pr-4 text-[14.5px] text-ink-900 outline-none ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500"
            />
          </label>
          <div className="flex min-w-0 gap-2 overflow-x-auto ov-no-scrollbar">
            <select value={typ} onChange={(e) => setTyp(e.target.value)} aria-label="Anlagentyp" className="h-11 shrink-0 rounded-full bg-white px-4 text-[14px] text-ink-800 outline-none ring-1 ring-inset ring-ink-200 focus-visible:ring-2 focus-visible:ring-ov-500">
              <option value="">Alle Typen</option>
              {typen.map((t) => (
                <option key={t} value={t}>{ANLAGE_TYPEN[t]?.label || t}</option>
              ))}
            </select>
            <div role="group" aria-label="Ansicht (Taste v)" className="flex shrink-0 rounded-full bg-white p-1 ring-1 ring-inset ring-ink-200">
              {ANSICHTEN.map((x) => {
                const Icon = x.icon;
                return (
                  <button key={x.id} type="button" aria-pressed={ansicht === x.id} onClick={() => ansichtSetzen(x.id)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold", ansicht === x.id ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    <span className="hidden sm:inline">{x.label}</span>
                    <span className="sr-only sm:hidden">{x.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {filterAktiv ? (
          <p className="text-[13px] text-ink-600">
            {liste.length} von {alle.length} Anlagen ·{" "}
            <button type="button" className="font-semibold text-ov-700 hover:text-ov-800" onClick={() => { setQ(""); setTyp(""); setAmpel(""); setRegion(""); }}>
              Filter zurücksetzen
            </button>
          </p>
        ) : null}
      </section>

      {ansicht === "karte" && <AnlagenKarte anlagen={alle} region={region} onRegion={setRegion} />}

      {ansicht === "liste" ? (
        <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-ink-200/70">
          <table className="w-full min-w-[900px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-ink-100 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                <th scope="col" className="px-5 py-3">Anlage</th>
                <th scope="col" className="px-3 py-3">Zustand</th>
                <th scope="col" className="px-3 py-3 text-right">Nennleistung</th>
                <th scope="col" className="px-3 py-3 text-right">Jetzt</th>
                <th scope="col" className="px-3 py-3 text-right">Heute</th>
                <th scope="col" className="px-3 py-3 text-right">Monat</th>
                <th scope="col" className="px-3 py-3 text-right">Jahr</th>
                <th scope="col" className="px-5 py-3 text-right">Eigenverbr.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {liste.map((a) => (
                <tr key={a.id} className="hover:bg-sand-50">
                  <td className="px-5 py-3">
                    <Link href={`/portal/anlagen/${a.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{a.name}</Link>
                    <p className="text-[12.5px] text-ink-500">{a.typLabel} · {a.ort || a.bundesland}</p>
                  </td>
                  <td className="px-3 py-3"><AmpelBadge id={a.ampel?.id} grund={a.ampel?.grund} klein /></td>
                  <td className="ov-num px-3 py-3 text-right">{a.kwp ? kwpText(a.kwp) : `${a.speicherKwh} kWh`}</td>
                  <td className={cn("ov-num px-3 py-3 text-right font-semibold", a.veraltet && "text-ink-400")}>{a.live ? kw(a.live.pvKw) : "–"}</td>
                  <td className="ov-num px-3 py-3 text-right">{kwh(a.heute?.erzeugungKwh)}</td>
                  <td className="ov-num px-3 py-3 text-right">{kwh(a.monat?.erzeugungKwh)}</td>
                  <td className="ov-num px-3 py-3 text-right">{kwh(a.jahr?.erzeugungKwh)}</td>
                  <td className="ov-num px-5 py-3 text-right">{pct(a.jahr?.erzeugungKwh ? a.jahr.eigenverbrauchKwh / a.jahr.erzeugungKwh : null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {liste.map((a) => (
            <li key={a.id} className="min-w-0">
              <AnlagenKachel a={a} jetzt={jetzt} />
            </li>
          ))}
        </ul>
      )}
      {!liste.length && alle.length > 0 && <p className="rounded-3xl border border-dashed border-ink-200 bg-white/60 p-6 text-center text-[14.5px] text-ink-600">Keine Anlage passt zu den Filtern.</p>}
    </div>
  );
}

function AnlagenKachel({ a, jetzt }) {
  const pv = Number(a.live?.pvKw) || 0;
  const anteil = a.kwp ? Math.min(1, pv / a.kwp) : 0;
  const soc = a.live?.speicherSocPct;
  return (
    <Link href={`/portal/anlagen/${a.id}`} className="group block h-full min-w-0 overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(3,18,43,0.35)] hover:ring-ov-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[16.5px] font-bold text-ink-900 group-hover:text-ov-800">{a.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-500">{a.typLabel} · {a.ort || a.bundesland} · {a.kwp ? kwpText(a.kwp) : `${a.speicherKwh.toLocaleString("de-DE")} kWh`}</p>
        </div>
        <AmpelBadge id={a.ampel?.id} grund={a.ampel?.grund} klein />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-ink-500">{a.kwp ? "PV-Leistung jetzt" : "Speicherleistung jetzt"}</p>
          <p className={cn("ov-num font-display text-[26px] font-extrabold leading-tight tracking-tight", a.veraltet ? "text-ink-400" : "text-ink-900")}>
            {a.kwp ? kw(pv) : kw(a.live?.speicherKw)}
          </p>
        </div>
        <div className="shrink-0 text-right text-[12.5px] text-ink-600">
          <p>Heute <span className="ov-num font-semibold text-ink-900">{kwh(a.kwp ? a.heute?.erzeugungKwh : a.heute?.entladenKwh)}</span></p>
          {soc != null && <p>Speicher <span className="ov-num font-semibold text-ink-900">{Math.round(soc)} %</span></p>}
        </div>
      </div>
      {a.kwp > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-ink-100" aria-hidden="true">
          <div className="h-1.5 rounded-full bg-ov-500 transition-[width] duration-700" style={{ width: `${Math.max(1, anteil * 100)}%` }} />
        </div>
      )}
      <p className={cn("mt-3 flex min-w-0 flex-wrap items-center gap-x-2 text-[12px]", a.veraltet ? "font-semibold text-ink-600" : "text-ink-500")}>
        <PlugZap aria-hidden="true" className="h-3.5 w-3.5" />
        {a.live?.ts ? (jetzt ? `Letzte Messung ${alterText(a.live.ts, jetzt)}` : "Letzte Messung") : "Noch keine Messwerte"}
        {a.ampel?.id !== "laeuft" && a.ampel?.grund && <span className={cn("min-w-0 max-w-full truncate", AMPEL_KLASSE[a.ampel.id]?.text)}>· {a.ampel.grund}</span>}
      </p>
    </Link>
  );
}

"use client";

// Akquise-Pipeline Flächen (Client): Tabelle mit Auswahl, Priorität inline, Massen-Zuweisung
// (nach Gebiet oder an eine Person), Score-Details, SLA-Ampel; Gebiets-Editor.
// Tastatur: j/k bewegt die Markierung, Leertaste wählt aus, a/b/c setzt die Priorität der markierten Zeile.

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPinned, Plus, Save, Trash2, UserCheck, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { fmt } from "@/lib/rechner/annahmen";
import { BUNDESLAENDER, LAENDER } from "@/lib/plattform/konstanten";
import { AKQUISE_BESONDERHEITEN, AKQUISE_NETZ } from "@/lib/plattform/akquise";
import { auswahlfeld, Chip, eingabe, ErfolgBox, Feld, FehlerBox } from "@/components/Portal/felder";

const name = (k) => [k?.vorname, k?.nachname].filter(Boolean).join(" ") || k?.email || "–";
const AMPEL = { gruen: "bg-ov-500", gelb: "bg-sun-400", rot: "bg-danger-600", grau: "bg-ink-300" };
const AMPEL_TEXT = { gruen: "im Plan", gelb: "knapp / verspätet", rot: "überfällig", grau: "–" };

export function SlaAmpel({ sla }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-700" title={sla.fristBis ? `Frist bis ${new Date(sla.fristBis).toLocaleString("de-DE", { timeZone: "Europe/Vienna" })}` : undefined}>
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", AMPEL[sla.ampel] || AMPEL.grau)} aria-hidden="true" />
      <span className="sr-only">SLA {AMPEL_TEXT[sla.ampel]}:</span>
      {sla.text}
    </span>
  );
}

function ScoreBalken({ score, ampel }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="ov-num w-8 text-right font-bold text-ink-900">{score}</span>
      <span className="h-1.5 w-14 rounded-full bg-ink-100" aria-hidden="true">
        <span className={cn("block h-1.5 rounded-full", ampel === "gruen" ? "bg-ov-500" : ampel === "gelb" ? "bg-sun-400" : "bg-danger-500")} style={{ width: `${Math.max(4, score)}%` }} />
      </span>
    </span>
  );
}

export function AkquiseTabelle({ flaechen, konten, darfSchreiben }) {
  const router = useRouter();
  const [auswahl, setAuswahl] = useState([]);
  const [fokus, setFokus] = useState(0);
  const [offen, setOffen] = useState(null);
  const [person, setPerson] = useState("");
  const [ueber, setUeber] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const umschalten = (id) => setAuswahl((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  async function prio(id, wert) {
    setFehler("");
    try {
      await senden(`/api/admin/akquise/${id}`, { method: "PATCH", body: { prioritaet: wert } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  async function zuweisen(modus) {
    setFehler("");
    setMeldung("");
    try {
      const r = await senden("/api/admin/akquise", { body: { ids: auswahl, modus, zustaendigId: modus === "person" ? person : undefined, ueberschreiben: ueber } });
      const e = r.ergebnis;
      setMeldung(`${e.zugewiesen} zugewiesen${e.uebersprungen ? `, ${e.uebersprungen} übersprungen (schon zuständig)` : ""}${e.ohneGebiet ? `, ${e.ohneGebiet} ohne passendes Gebiet` : ""}.`);
      setAuswahl([]);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  useEffect(() => {
    const h = (e) => {
      if (e.target.closest?.("input, textarea, select, button, a, [contenteditable]")) return;
      const f = flaechen[fokus];
      if (e.key === "j") setFokus((i) => Math.min(flaechen.length - 1, i + 1));
      else if (e.key === "k") setFokus((i) => Math.max(0, i - 1));
      else if (e.key === " " && f) umschalten(f.id);
      else if (["a", "b", "c"].includes(e.key) && f && darfSchreiben) prio(f.id, e.key.toUpperCase());
      else if (e.key === "Enter" && f) setOffen((o) => (o === f.id ? null : f.id));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="space-y-3">
      {darfSchreiben && auswahl.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-950 px-4 py-3 text-white shadow-lg" role="region" aria-label="Massenaktionen">
          <span className="text-[13.5px] font-semibold">{auswahl.length} Flächen</span>
          <button type="button" onClick={() => zuweisen("gebiet")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3 text-[13px] font-semibold hover:bg-ov-700">
            <MapPinned aria-hidden="true" className="h-4 w-4" /> Nach Gebiet zuweisen
          </button>
          <label className="sr-only" htmlFor="akq-person">Person</label>
          <select id="akq-person" value={person} onChange={(e) => setPerson(e.target.value)} className="h-9 rounded-full bg-white/10 px-3 text-[13px] text-white outline-none ring-1 ring-white/20">
            <option value="" className="text-ink-900">Person …</option>
            {konten.map((k) => <option key={k.id} value={k.id} className="text-ink-900">{name(k)}</option>)}
          </select>
          <button type="button" disabled={!person} onClick={() => zuweisen("person")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50">
            <UserCheck aria-hidden="true" className="h-4 w-4" /> Zuweisen
          </button>
          <label className="flex items-center gap-1.5 text-[12.5px] text-white/80">
            <input type="checkbox" checked={ueber} onChange={(e) => setUeber(e.target.checked)} className="h-4 w-4 accent-[#aed083]" /> bestehende überschreiben
          </label>
          <button type="button" onClick={() => setAuswahl([])} className="ml-auto inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] text-white/80 hover:text-white">
            <X aria-hidden="true" className="h-4 w-4" /> Aufheben
          </button>
        </div>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{meldung}</ErfolgBox>
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
        <div className="hidden grid-cols-[1.5rem_minmax(0,2.2fr)_5.5rem_7rem_minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)] gap-3 border-b border-ink-100 px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500 lg:grid">
          <input type="checkbox" aria-label="Alle auswählen" checked={auswahl.length === flaechen.length && flaechen.length > 0} onChange={() => setAuswahl(auswahl.length === flaechen.length ? [] : flaechen.map((f) => f.id))} className="h-4 w-4 accent-[#558227]" />
          <span>Fläche</span>
          <span>Prio</span>
          <span>Score</span>
          <span>SLA Erstkontakt</span>
          <span>Zuständig / Gebiet</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-ink-100">
          {flaechen.map((f, i) => (
            <li key={f.id} className={cn("px-5 py-3.5", fokus === i && "bg-sand-50 outline outline-2 -outline-offset-2 outline-ov-300", auswahl.includes(f.id) && "bg-ov-50/60")} onClick={() => setFokus(i)}>
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2 lg:grid-cols-[1.5rem_minmax(0,2.2fr)_5.5rem_7rem_minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)]">
                <input type="checkbox" checked={auswahl.includes(f.id)} onChange={() => umschalten(f.id)} aria-label={`${f.bezeichnung} auswählen`} className="h-4 w-4 self-start accent-[#558227] lg:self-center" disabled={!darfSchreiben} />
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <Link href={`/portal/flaechen/${f.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{f.bezeichnung}</Link>
                  <p className="truncate text-[12.5px] text-ink-500">
                    {fmt(f.ha, f.ha < 10 ? 1 : 0)} ha{f.agri ? " · Agri-PV" : ""} · ≈ {fmt(f.mwp, 1)} MWp · {[f.plz, f.ort].filter(Boolean).join(" ")} · {f.bundesland || LAENDER[f.land]}
                  </p>
                  {f.kontakt && <p className="truncate text-[12.5px] text-ink-500">{f.kontakt.id ? <Link href={`/portal/admin/crm/${f.kontakt.id}`} className="hover:text-ov-700">{f.kontakt.name}</Link> : f.kontakt.name}</p>}
                  {f.tags.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{f.tags.map((t) => <span key={t} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">#{t}</span>)}</p>}
                </div>
                <div className="col-start-2 flex items-center gap-1 lg:col-start-auto" role="group" aria-label={`Priorität ${f.bezeichnung}`}>
                  {["A", "B", "C"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={!darfSchreiben}
                      onClick={() => prio(f.id, f.prioritaetManuell && f.prioritaet === p ? "" : p)}
                      aria-pressed={f.prioritaet === p}
                      title={f.prioritaet === p && !f.prioritaetManuell ? "automatisch (Score und Größe)" : p === f.prioritaetAuto ? "automatischer Vorschlag" : undefined}
                      className={cn("h-7 w-7 rounded-lg text-[12.5px] font-bold ring-1 ring-inset", f.prioritaet === p ? (p === "A" ? "bg-navy-900 text-white ring-navy-900" : p === "B" ? "bg-ov-600 text-white ring-ov-600" : "bg-ink-500 text-white ring-ink-500") : "bg-white text-ink-500 ring-ink-200 hover:ring-ink-400", f.prioritaet === p && !f.prioritaetManuell && "opacity-80")}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setOffen(offen === f.id ? null : f.id)} aria-expanded={offen === f.id} className="text-left" title="Score-Details">
                  <ScoreBalken score={f.score} ampel={f.ampel} />
                </button>
                <div className="col-span-2 col-start-2 lg:col-span-1 lg:col-start-auto"><SlaAmpel sla={f.sla} /></div>
                <div className="col-start-2 min-w-0 text-[13px] lg:col-start-auto">
                  <p className="truncate text-ink-900">{f.zustaendig ? name(f.zustaendig) : <span className="text-ink-400">nicht zugewiesen</span>}</p>
                  {f.gebiet ? <p className="truncate text-[12px] text-ink-500" title={f.gebiet.grund}>Gebiet: {f.gebiet.name}{f.gebiet.mitarbeiter && (!f.zustaendig || f.zustaendig.id !== f.gebiet.mitarbeiter.id) ? ` → ${name(f.gebiet.mitarbeiter)}` : ""}</p> : <p className="text-[12px] text-ink-400">kein Gebiet</p>}
                </div>
                <span className="text-[13px] text-ink-700">{f.statusLabel}</span>
              </div>
              {offen === f.id && <ScoreDetails f={f} darfSchreiben={darfSchreiben} />}
            </li>
          ))}
        </ul>
        {!flaechen.length && <p className="px-5 py-10 text-center text-[14px] text-ink-500">Keine Flächen mit diesen Filtern.</p>}
      </div>
      <p className="text-[12.5px] text-ink-500">
        Tastatur: <kbd className="rounded bg-ink-100 px-1.5 font-mono">j</kbd>/<kbd className="rounded bg-ink-100 px-1.5 font-mono">k</kbd> Zeile · <kbd className="rounded bg-ink-100 px-1.5 font-mono">Leertaste</kbd> auswählen · <kbd className="rounded bg-ink-100 px-1.5 font-mono">a</kbd>/<kbd className="rounded bg-ink-100 px-1.5 font-mono">b</kbd>/<kbd className="rounded bg-ink-100 px-1.5 font-mono">c</kbd> Priorität · <kbd className="rounded bg-ink-100 px-1.5 font-mono">Enter</kbd> Score-Details
      </p>
    </div>
  );
}

function ScoreDetails({ f, darfSchreiben }) {
  const router = useRouter();
  const [bes, setBes] = useState(f.besonderheiten);
  const [netz, setNetz] = useState(f.netz);
  const [fehler, setFehler] = useState("");
  async function speichern() {
    setFehler("");
    try {
      await senden(`/api/admin/akquise/${f.id}`, { method: "PATCH", body: { besonderheiten: bes, netz } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  return (
    <div className="mt-3 grid gap-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 lg:grid-cols-2">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Flächencheck</p>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink-700">
          {f.gruende.map((g, i) => (
            <li key={i} className="flex gap-2">
              <span className={cn("ov-num w-9 shrink-0 text-right font-bold", g.punkte > 0 ? "text-ov-700" : g.punkte < 0 ? "text-danger-700" : "text-ink-400")}>{g.punkte > 0 ? `+${g.punkte}` : g.punkte || "·"}</span>
              <span>{g.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Angaben aus der Prüfung (verbessern den Score)</p>
        <div className="flex flex-wrap gap-1.5">
          {AKQUISE_BESONDERHEITEN.map((b) => (
            <Chip key={b.id} name={`bes-${f.id}`} value={b.id} checked={bes.includes(b.id)} onChange={() => darfSchreiben && setBes(bes.includes(b.id) ? bes.filter((x) => x !== b.id) : [...bes, b.id])}>{b.label}</Chip>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-600">Entfernung Netzverknüpfungspunkt</span>
          <select value={netz} onChange={(e) => setNetz(e.target.value)} disabled={!darfSchreiben} className={cn(auswahlfeld, "h-10")}>
            {AKQUISE_NETZ.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <FehlerBox>{fehler}</FehlerBox>
        {darfSchreiben && <Button type="button" size="sm" icon={Save} onClick={speichern}>Neu bewerten</Button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Gebiete

export function GebieteEditor({ gebiete: start, konten, darfSchreiben }) {
  const id = useId();
  const router = useRouter();
  const [liste, setListe] = useState(() => start.map((g) => ({ ...g, plzText: (g.plz || []).join(", ") })));
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const setze = (i, feld, wert) => setListe((l) => l.map((g, j) => (j === i ? { ...g, [feld]: wert } : g)));
  async function speichern() {
    setFehler("");
    setOk("");
    try {
      await senden("/api/admin/akquise/gebiete", { method: "PUT", body: { gebiete: liste.map((g) => ({ id: g.id, name: g.name, land: g.land, bundeslaender: g.bundeslaender, plz: g.plzText.split(",").map((x) => x.trim()).filter(Boolean), mitarbeiterId: g.mitarbeiterId, aktiv: g.aktiv !== false })) } });
      setOk("Gebietszuordnung gespeichert.");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {liste.map((g, i) => (
          <li key={g.id || i} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_6rem_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
              <Feld id={`${id}-${i}-n`} label="Gebiet"><input id={`${id}-${i}-n`} className={cn(eingabe, "h-10")} value={g.name} disabled={!darfSchreiben} onChange={(e) => setze(i, "name", e.target.value)} /></Feld>
              <Feld id={`${id}-${i}-l`} label="Land">
                <select id={`${id}-${i}-l`} className={cn(auswahlfeld, "h-10")} value={g.land} disabled={!darfSchreiben} onChange={(e) => setze(i, "land", e.target.value)}>
                  <option value="">alle</option>
                  {Object.keys(LAENDER).map((l) => <option key={l}>{l}</option>)}
                </select>
              </Feld>
              <Feld id={`${id}-${i}-p`} label="PLZ-Bereiche" hinweis="z. B. 80-87, 9, 5020"><input id={`${id}-${i}-p`} className={cn(eingabe, "h-10")} value={g.plzText} disabled={!darfSchreiben} onChange={(e) => setze(i, "plzText", e.target.value)} /></Feld>
              <Feld id={`${id}-${i}-m`} label="Zuständig">
                <select id={`${id}-${i}-m`} className={cn(auswahlfeld, "h-10")} value={g.mitarbeiterId} disabled={!darfSchreiben} onChange={(e) => setze(i, "mitarbeiterId", e.target.value)}>
                  {konten.map((k) => <option key={k.id} value={k.id}>{name(k)}</option>)}
                </select>
              </Feld>
              {darfSchreiben && (
                <button type="button" onClick={() => setListe((l) => l.filter((_, j) => j !== i))} aria-label={`Gebiet ${g.name} entfernen`} className="self-end rounded-full p-2.5 text-ink-400 hover:bg-white hover:text-danger-700">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
            {g.land && (BUNDESLAENDER[g.land] || []).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-600">Bundesländer / Kantone ({g.bundeslaender.length})</summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {BUNDESLAENDER[g.land].map((b) => (
                    <Chip key={b} name={`${id}-${i}-bl`} value={b} checked={g.bundeslaender.includes(b)} onChange={() => darfSchreiben && setze(i, "bundeslaender", g.bundeslaender.includes(b) ? g.bundeslaender.filter((x) => x !== b) : [...g.bundeslaender, b])}>{b}</Chip>
                  ))}
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      {darfSchreiben && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setListe((l) => [...l, { name: "Neues Gebiet", land: "DE", bundeslaender: [], plzText: "", mitarbeiterId: konten[0]?.id || "", aktiv: true }])}>Gebiet hinzufügen</Button>
          <Button type="button" size="sm" icon={Save} onClick={speichern}>Gebiete speichern</Button>
        </div>
      )}
      <p className="text-[12.5px] text-ink-500">Reihenfolge der Zuordnung: PLZ-Bereich vor Bundesland vor ganzem Land. Ein Land ohne PLZ und Bundesland gilt als Auffanggebiet.</p>
    </div>
  );
}

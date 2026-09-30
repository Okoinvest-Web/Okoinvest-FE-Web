"use client";

// Interne Wissensdatenbank: Suche (Taste „/“), Kategorien, Artikel lesen, anlegen und bearbeiten (Versionen).
// Inhalte als einfaches Textformat: „## Überschrift“, „- Punkt“, „1. Schritt“, **fett** – ohne HTML (sicher gerendert).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, History, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Badge, Leer } from "@/components/Portal/ui";
import { FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { WISSEN_KATEGORIEN, wissenTreffer } from "@/lib/plattform/hr";
import { datum } from "@/lib/plattform/format";

function inline(text) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((t, i) => (t.startsWith("**") && t.endsWith("**") ? <strong key={i}>{t.slice(2, -2)}</strong> : t));
}

export function TextAnsicht({ inhalt }) {
  const bloecke = [];
  let liste = null;
  for (const zeile of String(inhalt || "").split("\n")) {
    const z = zeile.trimEnd();
    const ul = /^\s*[-•]\s+(.*)$/.exec(z);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(z);
    if (ul || ol) {
      const art = ul ? "ul" : "ol";
      if (!liste || liste.art !== art) bloecke.push((liste = { art, punkte: [] }));
      liste.punkte.push((ul || ol)[1]);
      continue;
    }
    liste = null;
    if (/^#{1,3}\s+/.test(z)) bloecke.push({ art: "h", text: z.replace(/^#{1,3}\s+/, "") });
    else if (z.trim()) bloecke.push({ art: "p", text: z });
  }
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-700">
      {bloecke.map((b, i) =>
        b.art === "h" ? <h3 key={i} className="pt-2 font-display text-[17px] font-bold text-ink-900">{inline(b.text)}</h3>
        : b.art === "ul" ? <ul key={i} className="list-disc space-y-1 pl-5 marker:text-ov-500">{b.punkte.map((p, j) => <li key={j}>{inline(p)}</li>)}</ul>
        : b.art === "ol" ? <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-ov-600">{b.punkte.map((p, j) => <li key={j}>{inline(p)}</li>)}</ol>
        : <p key={i}>{inline(b.text)}</p>
      )}
    </div>
  );
}

function Editor({ artikel, onFertig }) {
  const router = useRouter();
  const [w, setW] = useState({ titel: artikel?.titel || "", kategorie: artikel?.kategorie || "prozesse", inhalt: artikel?.inhalt || "", tags: (artikel?.tags || []).join(", ") });
  const [fehler, setFehler] = useState("");
  const s = (f) => (e) => setW((x) => ({ ...x, [f]: e.target.value }));
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    try {
      const body = { ...w, tags: w.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const r = artikel?.id ? await senden(`/api/admin/wissen/${artikel.id}`, { method: "PATCH", body }) : await senden("/api/admin/wissen", { body });
      onFertig(r.artikel);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }
  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <Feld id="wi-t" label="Titel" pflicht><input id="wi-t" value={w.titel} onChange={s("titel")} className={eingabe} required minLength={4} maxLength={160} /></Feld>
        <Feld id="wi-k" label="Kategorie">
          <select id="wi-k" value={w.kategorie} onChange={s("kategorie")} className={auswahlfeld}>
            {Object.entries(WISSEN_KATEGORIEN).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </Feld>
      </div>
      <Feld id="wi-i" label="Inhalt" pflicht hinweis="„## Überschrift“, „- Punkt“, „1. Schritt“, **fett**. Keine personenbezogenen Kundendaten.">
        <textarea id="wi-i" value={w.inhalt} onChange={s("inhalt")} className={cn(textbereich, "min-h-[280px] font-mono text-[13.5px]")} required minLength={20} maxLength={20000} />
      </Feld>
      <Feld id="wi-g" label="Schlagworte (kommagetrennt)"><input id="wi-g" value={w.tags} onChange={s("tags")} className={eingabe} maxLength={300} /></Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex gap-2">
        <Button type="submit" size="sm">Speichern</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onFertig(null)}>Abbrechen</Button>
      </div>
    </form>
  );
}

export default function Wissen({ artikel: start = [], aktiv: aktivStart = null, darfSchreiben = false }) {
  const router = useRouter();
  const suchRef = useRef(null);
  const [q, setQ] = useState("");
  const [kategorie, setKategorie] = useState("");
  const [aktiv, setAktiv] = useState(aktivStart);
  const [modus, setModus] = useState("lesen");
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    const taste = (e) => {
      if (e.key === "/" && !e.target.closest?.("input,textarea,select,[contenteditable]")) {
        e.preventDefault();
        suchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, []);

  const treffer = useMemo(
    () => start.filter((a) => !kategorie || a.kategorie === kategorie).map((a) => ({ a, p: wissenTreffer({ ...a, inhalt: a.auszug }, q) })).filter((x) => x.p > 0).sort((x, y) => y.p - x.p).map((x) => x.a),
    [start, q, kategorie]
  );

  async function oeffnen(id) {
    setFehler("");
    setModus("lesen");
    try {
      const r = await fetch(`/api/admin/wissen/${id}`, { credentials: "same-origin", cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setAktiv(j.artikel);
      window.history.replaceState(null, "", `/portal/admin/wissen?artikel=${id}`);
    } catch (e) {
      setFehler(e.message || "Artikel konnte nicht geladen werden.");
    }
  }

  async function loeschen() {
    if (!aktiv || !window.confirm(`„${aktiv.titel}“ löschen?`)) return;
    try {
      await senden(`/api/admin/wissen/${aktiv.id}`, { method: "DELETE" });
      setAktiv(null);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <label htmlFor="wi-q" className="sr-only">Wissensdatenbank durchsuchen</label>
          <input id="wi-q" ref={suchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen … (Taste /)" className={cn(eingabe, "pl-10")} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setKategorie("")} className={cn("rounded-full px-3 py-1 text-[12.5px] font-semibold", !kategorie ? "bg-navy-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200")}>Alle</button>
          {Object.entries(WISSEN_KATEGORIEN).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setKategorie(id)} className={cn("rounded-full px-3 py-1 text-[12.5px] font-semibold", kategorie === id ? "bg-navy-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200")}>{l}</button>
          ))}
        </div>
        {darfSchreiben && <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => { setAktiv(null); setModus("neu"); }}>Neuer Artikel</Button>}
        <ul className="divide-y divide-ink-100 rounded-2xl bg-white ring-1 ring-ink-200/70" aria-label="Artikel">
          {treffer.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => oeffnen(a.id)} className={cn("block w-full px-4 py-3 text-left hover:bg-ink-50", aktiv?.id === a.id && "bg-ov-50")}>
                <span className="block font-semibold text-ink-900">{a.titel}</span>
                <span className="block text-[12px] text-ink-500">{a.kategorieLabel} · {datum(a.geaendertAm)}</span>
                <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-600">{a.auszug}</span>
              </button>
            </li>
          ))}
          {!treffer.length && <li className="px-4 py-6 text-center text-[13.5px] text-ink-500">Keine Treffer.</li>}
        </ul>
      </div>
      <div className="min-w-0">
        <FehlerBox>{fehler}</FehlerBox>
        {modus === "neu" || modus === "bearbeiten" ? (
          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
            <Editor artikel={modus === "bearbeiten" ? aktiv : null} onFertig={(a) => { if (a) setAktiv(a); setModus("lesen"); }} />
          </div>
        ) : aktiv ? (
          <article className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">{aktiv.kategorieLabel}</p>
                <h2 className="mt-1 font-display text-[24px] font-extrabold leading-tight text-ink-900">{aktiv.titel}</h2>
                <p className="mt-1 text-[12.5px] text-ink-500">Version {aktiv.version} · {aktiv.autor} · {datum(aktiv.geaendertAm)}</p>
              </div>
              {darfSchreiben && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModus("bearbeiten")} className="rounded-full p-2 text-ink-600 hover:bg-ink-100" aria-label="Bearbeiten"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={loeschen} className="rounded-full p-2 text-ink-600 hover:bg-ink-100" aria-label="Löschen"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            {aktiv.tags?.length > 0 && <p className="mt-3 flex flex-wrap gap-1.5">{aktiv.tags.map((t) => <Badge key={t}>{t}</Badge>)}</p>}
            <div className="mt-5"><TextAnsicht inhalt={aktiv.inhalt} /></div>
            {aktiv.versionen?.length > 0 && (
              <p className="mt-6 flex items-center gap-1.5 border-t border-ink-100 pt-4 text-[12.5px] text-ink-500">
                <History aria-hidden="true" className="h-3.5 w-3.5" /> Frühere Versionen: {aktiv.versionen.map((v) => `v${v.version} (${datum(v.am)}, ${v.autor})`).join(" · ")}
              </p>
            )}
          </article>
        ) : (
          <Leer icon={BookOpen} titel="Artikel auswählen" text="Wählen Sie links einen Artikel oder suchen Sie nach Stichworten wie „NDA“, „Netzanschluss“ oder „§ 6 EEG“." />
        )}
      </div>
    </div>
  );
}

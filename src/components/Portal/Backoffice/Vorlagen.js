"use client";

// Vorlagen-Editor (Client): Liste, Bearbeiten mit Platzhalter-Palette (Klick fügt an der Cursorposition
// ein), Vorschau (Beispielwerte oder echtes Objekt), Versionen mit Wiederherstellen.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, History, Mail, MessageSquare, Plus, RotateCcw, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { datumZeit } from "@/lib/plattform/format";
import { PLATZHALTER, VORLAGE_KANAELE, platzhalterIn, PLATZHALTER_SCHLUESSEL } from "@/lib/plattform/vorlagen";
import { auswahlfeld, eingabe, ErfolgBox, Feld, FehlerBox, textbereich } from "@/components/Portal/felder";

const LEER = { id: null, name: "", kanal: "email", betreff: "", text: "", versionen: [], verwendetIn: [], aktiv: true };

export function VorlagenEditor({ vorlagen, darfSchreiben }) {
  const router = useRouter();
  const id = useId();
  const [aktivId, setAktivId] = useState(vorlagen[0]?.id || null);
  const aktuell = vorlagen.find((v) => v.id === aktivId) || null;
  const [d, setD] = useState(aktuell || LEER);
  const [kommentar, setKommentar] = useState("");
  const [vorschau, setVorschau] = useState(null);
  const [objekt, setObjekt] = useState({ art: "flaeche", id: "" });
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [feld, setFeld] = useState("text");
  const textRef = useRef(null);
  const betreffRef = useRef(null);

  useEffect(() => {
    setD(vorlagen.find((v) => v.id === aktivId) || LEER);
    setVorschau(null);
    setKommentar("");
  }, [aktivId, vorlagen]);

  const unbekannt = useMemo(() => [...new Set([...platzhalterIn(d.betreff), ...platzhalterIn(d.text)].filter((k) => !PLATZHALTER_SCHLUESSEL.has(k)))], [d.betreff, d.text]);
  const gruppen = useMemo(() => PLATZHALTER.reduce((acc, p) => ((acc[p.gruppe] = acc[p.gruppe] || []).push(p), acc), {}), []);
  const geaendert = aktuell ? aktuell.betreff !== d.betreff || aktuell.text !== d.text || aktuell.name !== d.name || aktuell.kanal !== d.kanal : !!(d.name || d.text);

  function einfuegen(schluessel) {
    const ref = feld === "betreff" ? betreffRef : textRef;
    const el = ref.current;
    const t = `{{${schluessel}}}`;
    const wert = d[feld] || "";
    const start = el?.selectionStart ?? wert.length;
    const ende = el?.selectionEnd ?? wert.length;
    const neu = wert.slice(0, start) + t + wert.slice(ende);
    setD({ ...d, [feld]: neu });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + t.length, start + t.length);
    });
  }

  async function zeigen() {
    setFehler("");
    try {
      const r = await senden("/api/admin/vorlagen/vorschau", { body: { betreff: d.betreff, text: d.text, ...(objekt.id.trim() ? { bezugArt: objekt.art, bezugId: objekt.id.trim().toUpperCase() } : {}) } });
      setVorschau(r.vorschau);
    } catch (e) {
      setFehler(e.message);
    }
  }
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    setOk("");
    try {
      const body = { name: d.name, kanal: d.kanal, betreff: d.betreff, text: d.text, kommentar };
      const r = d.id ? await senden(`/api/admin/vorlagen/${d.id}`, { method: "PATCH", body }) : await senden("/api/admin/vorlagen", { body });
      setOk(d.id ? `Gespeichert als Version ${r.vorlage.version}.` : "Vorlage angelegt.");
      setAktivId(r.vorlage.id);
      setKommentar("");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }
  async function wiederherstellen(version) {
    setFehler("");
    try {
      const r = await senden(`/api/admin/vorlagen/${d.id}/wiederherstellen`, { body: { version } });
      setOk(`Version ${version} als Version ${r.vorlage.version} wiederhergestellt.`);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <nav aria-label="Vorlagen" className="space-y-2">
        {darfSchreiben && (
          <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setAktivId(null)} className="w-full">
            Neue Vorlage
          </Button>
        )}
        <ul className="space-y-1.5">
          {vorlagen.map((v) => {
            const Icon = v.kanal === "email" ? Mail : MessageSquare;
            return (
              <li key={v.id}>
                <button type="button" onClick={() => setAktivId(v.id)} aria-current={aktivId === v.id ? "true" : undefined} className={cn("flex w-full items-start gap-2.5 rounded-2xl px-3.5 py-3 text-left ring-1 ring-inset transition-colors", aktivId === v.id ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-800 ring-ink-200/70 hover:bg-sand-50")}>
                  <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", aktivId === v.id ? "text-ov-300" : "text-ov-600")} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{v.name}</span>
                    <span className={cn("block text-[12px]", aktivId === v.id ? "text-white/70" : "text-ink-500")}>v{v.version} · {VORLAGE_KANAELE[v.kanal]}{v.verwendetIn.length ? ` · in ${v.verwendetIn.length} Regel(n)` : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 space-y-5">
        <form onSubmit={speichern} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
            <Feld id={`${id}-n`} label="Name" pflicht><input id={`${id}-n`} className={eingabe} value={d.name} disabled={!darfSchreiben} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={120} /></Feld>
            <Feld id={`${id}-k`} label="Kanal">
              <select id={`${id}-k`} className={auswahlfeld} value={d.kanal} disabled={!darfSchreiben} onChange={(e) => setD({ ...d, kanal: e.target.value })}>
                {Object.entries(VORLAGE_KANAELE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Feld>
          </div>
          {d.kanal === "email" && (
            <Feld id={`${id}-b`} label="Betreff" pflicht>
              <input id={`${id}-b`} ref={betreffRef} onFocus={() => setFeld("betreff")} className={eingabe} value={d.betreff} disabled={!darfSchreiben} onChange={(e) => setD({ ...d, betreff: e.target.value })} maxLength={200} />
            </Feld>
          )}
          <Feld id={`${id}-t`} label="Text" pflicht hinweis="Reiner Text. Platzhalter aus der Palette einfügen – vertrauliche Projektangaben stehen nie zur Verfügung.">
            <textarea id={`${id}-t`} ref={textRef} onFocus={() => setFeld("text")} className={cn(textbereich, "min-h-[220px] font-[inherit]")} value={d.text} disabled={!darfSchreiben} onChange={(e) => setD({ ...d, text: e.target.value })} maxLength={8000} />
          </Feld>
          {unbekannt.length > 0 && <FehlerBox>Unbekannte Platzhalter: {unbekannt.map((k) => `{{${k}}}`).join(", ")}</FehlerBox>}
          {darfSchreiben && (
            <div className="rounded-2xl bg-sand-50 p-3.5 ring-1 ring-ink-200/60">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Platzhalter einfügen ({feld === "betreff" ? "Betreff" : "Text"})</p>
              <div className="mt-2 space-y-2">
                {Object.entries(gruppen).map(([g, liste]) => (
                  <div key={g} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-20 shrink-0 text-[12px] font-semibold text-ink-600">{g}</span>
                    {liste.map((p) => (
                      <button key={p.schluessel} type="button" title={`${p.text} – z. B. „${p.beispiel}“`} onClick={() => einfuegen(p.schluessel)} className="rounded-full bg-white px-2.5 py-1 font-mono text-[11.5px] text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-300">
                        {`{{${p.schluessel}}}`}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {darfSchreiben && (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Feld id={`${id}-c`} label="Änderungsnotiz (für die Versionsliste)"><input id={`${id}-c`} className={eingabe} value={kommentar} onChange={(e) => setKommentar(e.target.value)} maxLength={200} placeholder="z. B. Ton angepasst, Link ergänzt" /></Feld>
              <Button type="submit" icon={Save} disabled={!geaendert || unbekannt.length > 0} className="self-end">{d.id ? "Als neue Version speichern" : "Vorlage anlegen"}</Button>
            </div>
          )}
          <FehlerBox>{fehler}</FehlerBox>
          <ErfolgBox>{ok}</ErfolgBox>
        </form>

        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
          <div className="flex flex-wrap items-end gap-2">
            <p className="mr-auto flex items-center gap-2 font-display text-[16px] font-bold text-ink-900"><Eye aria-hidden="true" className="h-4 w-4 text-ov-600" /> Vorschau</p>
            <label className="sr-only" htmlFor={`${id}-oa`}>Objektart</label>
            <select id={`${id}-oa`} className={cn(auswahlfeld, "h-10 w-32 text-[14px]")} value={objekt.art} onChange={(e) => setObjekt({ ...objekt, art: e.target.value })}>
              <option value="vorgang">Vorgang</option>
              <option value="flaeche">Fläche</option>
              <option value="projekt">Projekt</option>
              <option value="interesse">Interesse</option>
            </select>
            <label className="sr-only" htmlFor={`${id}-oi`}>Kennung</label>
            <input id={`${id}-oi`} className={cn(eingabe, "h-10 w-44 font-mono text-[13px]")} placeholder="Kennung (optional)" value={objekt.id} onChange={(e) => setObjekt({ ...objekt, id: e.target.value })} />
            <Button type="button" size="sm" variant="navy" onClick={zeigen}>Vorschau erzeugen</Button>
          </div>
          {vorschau ? (
            <div className="mt-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
              {vorschau.beispiel && <p className="mb-2 text-[12px] font-semibold text-ink-500">Mit Beispielwerten</p>}
              {d.kanal === "email" && <p className="text-[14.5px] font-semibold text-ink-900">{vorschau.betreff}</p>}
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{vorschau.text}</p>
              {vorschau.leer.length > 0 && <p className="mt-3 text-[12.5px] text-ink-500">Ohne Wert für dieses Objekt: {vorschau.leer.map((k) => `{{${k}}}`).join(", ")}</p>}
            </div>
          ) : (
            <p className="mt-3 text-[13.5px] text-ink-500">Ohne Kennung mit Beispielwerten, sonst mit den echten Daten des Objekts.</p>
          )}
        </div>

        {d.id && (
          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
            <p className="flex items-center gap-2 font-display text-[16px] font-bold text-ink-900"><History aria-hidden="true" className="h-4 w-4 text-ov-600" /> Versionen</p>
            {d.verwendetIn.length > 0 && <p className="mt-1 text-[12.5px] text-ink-500">Verwendet in: {d.verwendetIn.map((r) => r.name).join(", ")} – Regeln nutzen immer die aktuelle Version.</p>}
            <ol className="mt-3 divide-y divide-ink-100">
              {d.versionen.map((v) => (
                <li key={v.version} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
                  <span className={cn("ov-num rounded-full px-2.5 py-1 text-[12px] font-bold", v.version === d.version ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-700")}>v{v.version}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-ink-900">{v.kommentar || "ohne Notiz"}</p>
                    <p className="text-[12px] text-ink-500">{datumZeit(v.am)} · {v.von}</p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-600">Inhalt</summary>
                      {v.betreff && <p className="mt-1 text-[13px] font-semibold text-ink-800">{v.betreff}</p>}
                      <p className="mt-1 whitespace-pre-line text-[13px] text-ink-600">{v.text}</p>
                    </details>
                  </div>
                  {darfSchreiben && v.version !== d.version && (
                    <Button type="button" size="sm" variant="ghost" icon={RotateCcw} onClick={() => wiederherstellen(v.version)}>Wiederherstellen</Button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

// Zentrale Dokumentablage (Querschnitt, Team 10): Suche und Filter (Kategorie, Bezug, Prüfstatus), nur aktuelle
// Versionen mit Versionsverlauf, neue Version hochladen, Prüfstatus (Backoffice setzt ihn), Löschen eigener Uploads.
// Rechte prüft der Server (Upload, Freigabe, Versionen); hier nur Bedienung und Vorprüfung der Datei.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Download, FileImage, FileText, History, Search, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { senden } from "@/lib/plattform/client";
import { BEZUG_LABEL, DOKUMENT_KATEGORIEN, UPLOAD } from "@/lib/plattform/konstanten";
import { DOKUMENT_FREIGABE, DOKUMENT_FREIGABE_IDS, aktuelleVersionen, dokumenteFiltern, freigabeVon } from "@/lib/plattform/querschnitt";
import { datum, dateigroesse } from "@/lib/plattform/format";
import { auswahlfeld, eingabe, textbereich, FehlerBox, ErfolgBox } from "../felder";

async function versionHochladen(id, datei) {
  const fd = new FormData();
  fd.append("datei", datei);
  const res = await fetch(`/api/portal/querschnitt/dokumente/${id}/version`, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Upload fehlgeschlagen (${res.status})`);
  return json.dokument;
}

function FreigabeBadge({ d }) {
  const st = freigabeVon(d);
  const info = DOKUMENT_FREIGABE[st];
  return <Badge ton={info.ton} className="px-2 py-0.5 text-[11.5px]">{info.label}</Badge>;
}

function Versionen({ id }) {
  const [liste, setListe] = useState(null);
  const [fehler, setFehler] = useState("");
  useEffect(() => {
    let aktiv = true;
    fetch(`/api/portal/querschnitt/dokumente/${id}/versionen`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => aktiv && (j.ok ? setListe(j.versionen || []) : setFehler(j.error || "Versionen nicht verfügbar.")))
      .catch(() => aktiv && setFehler("Versionen nicht verfügbar."));
    return () => {
      aktiv = false;
    };
  }, [id]);
  if (fehler) return <p className="text-[13px] text-ink-500">{fehler}</p>;
  if (!liste) return <p className="text-[13px] text-ink-500">Lade Versionen …</p>;
  return (
    <ol className="space-y-1.5">
      {[...liste].reverse().map((v) => (
        <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="ov-num w-8 shrink-0 font-bold text-ink-700">v{v.version || 1}</span>
          <a href={`/api/portal/dokumente/${v.id}?anzeigen=1`} target="_blank" rel="noopener" className="min-w-0 max-w-full truncate font-semibold text-ink-900 hover:text-ov-700">{v.name}</a>
          <span className="text-ink-500">{datum(v.am)}{v.vonName ? ` · ${v.vonName}` : ""} · {dateigroesse(v.groesse)}</span>
          <FreigabeBadge d={v} />
        </li>
      ))}
    </ol>
  );
}

function FreigabeFormular({ d, fertig }) {
  const router = useRouter();
  const [status, setStatus] = useState(freigabeVon(d) === "eingegangen" ? "freigegeben" : freigabeVon(d));
  const [kommentar, setKommentar] = useState(d.freigabe?.kommentar || "");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  async function speichern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/portal/querschnitt/dokumente/${d.id}/freigabe`, { body: { status, kommentar } });
      fertig();
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={speichern} className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-start">
      <label className="min-w-0">
        <span className="sr-only">Prüfstatus</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(auswahlfeld, "h-10 text-[14px]")}>
          {DOKUMENT_FREIGABE_IDS.map((k) => <option key={k} value={k}>{DOKUMENT_FREIGABE[k].label}</option>)}
        </select>
      </label>
      <label className="min-w-0">
        <span className="sr-only">Hinweis an den Nutzer</span>
        <textarea rows={1} value={kommentar} onChange={(e) => setKommentar(e.target.value)} maxLength={1000} placeholder={status === "abgelehnt" ? "Was muss nachgebessert werden? (Pflicht)" : "Hinweis (optional)"} className={cn(textbereich, "min-h-10 py-2 text-[14px]")} />
      </label>
      <button type="submit" disabled={laeuft} className="h-10 rounded-full bg-navy-700 px-4 text-[14px] font-semibold text-white hover:bg-navy-800 disabled:opacity-50">{laeuft ? "Speichert …" : "Speichern"}</button>
      <div className="sm:col-span-3"><FehlerBox>{fehler}</FehlerBox></div>
    </form>
  );
}

function Zeile({ d, admin, nutzerId, zeigeBezug }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [offen, setOffen] = useState(null); // "versionen" | "freigabe"
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const Icon = d.mime === "application/pdf" ? FileText : FileImage;
  const eigen = d.hochgeladenVon === nutzerId;
  const versionErlaubt = d.kategorie !== "datenraum" && (admin || eigen);

  async function neueVersion(datei) {
    if (!datei) return;
    setFehler("");
    setErfolg("");
    if (!UPLOAD.typen[datei.type]) return setFehler(`„${datei.name}“: erlaubt sind PDF, JPG und PNG.`);
    if (datei.size > UPLOAD.maxBytes) return setFehler(`„${datei.name}“ ist größer als 10 MB.`);
    setLaeuft(true);
    try {
      const neu = await versionHochladen(d.id, datei);
      setErfolg(`Version ${neu.version} hochgeladen.`);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  async function loeschen() {
    if (!window.confirm(`„${d.name}“ wirklich löschen?`)) return;
    try {
      await senden(`/api/portal/dokumente/${d.id}`, { method: "DELETE" });
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Icon aria-hidden="true" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <a href={`/api/portal/dokumente/${d.id}?anzeigen=1`} target="_blank" rel="noopener" className="min-w-0 max-w-full truncate text-[14.5px] font-semibold text-ink-900 hover:text-ov-700">{d.name}</a>
            {(d.freigabe || eigen || admin) && <FreigabeBadge d={d} />}{/* Unterlagen des Backoffice ohne Prüfstatus */}
            {(d.version || 1) > 1 && <span className="ov-num rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] font-semibold text-ink-600">v{d.version}</span>}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
            {DOKUMENT_KATEGORIEN[d.kategorie] || d.kategorie} · {dateigroesse(d.groesse)} · {datum(d.am)}
            {zeigeBezug && d.bezugTitel && <>{" · "}{d.bezugLink ? <Link href={d.bezugLink} className="underline underline-offset-2 hover:text-ov-700">{d.bezugTitel}</Link> : d.bezugTitel}</>}
          </p>
          {d.freigabe?.kommentar && freigabeVon(d) !== "freigegeben" && <p className="mt-1 text-[13px] text-ink-700">Hinweis des Backoffice: {d.freigabe.kommentar}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(d.vorversionen > 0 || (d.version || 1) > 1) && (
              <button type="button" onClick={() => setOffen(offen === "versionen" ? null : "versionen")} aria-expanded={offen === "versionen"} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
                <History aria-hidden="true" className="h-3.5 w-3.5" /> Versionen
                <ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition-transform", offen === "versionen" && "rotate-180")} />
              </button>
            )}
            {versionErlaubt && (
              <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
                <UploadCloud aria-hidden="true" className="h-3.5 w-3.5" /> {laeuft ? "Lädt …" : "Neue Version"}
                <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" disabled={laeuft} onChange={(e) => neueVersion(e.target.files?.[0])} />
              </label>
            )}
            {admin && (
              <button type="button" onClick={() => setOffen(offen === "freigabe" ? null : "freigabe")} aria-expanded={offen === "freigabe"} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" /> Prüfstatus
              </button>
            )}
          </div>
        </div>
        <a href={`/api/portal/dokumente/${d.id}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 hover:text-ink-900" aria-label={`${d.name} herunterladen`}><Download aria-hidden="true" className="h-4 w-4" /></a>
        {(admin || eigen) && (
          <button type="button" onClick={loeschen} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label={`${d.name} löschen`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
        )}
      </div>
      {offen && (
        <div className="ml-0 mt-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-200/70 sm:ml-[3.25rem]">
          {offen === "versionen" ? <Versionen id={d.id} /> : <FreigabeFormular d={d} fertig={() => setOffen(null)} />}
        </div>
      )}
      <div className="sm:ml-[3.25rem]"><FehlerBox>{fehler}</FehlerBox><ErfolgBox>{erfolg}</ErfolgBox></div>
    </li>
  );
}

export default function DokumentAblage({ dokumente = [], admin = false, nutzerId, startQ = "" }) {
  const [q, setQ] = useState(startQ);
  const [kategorie, setKategorie] = useState("");
  const [bezugArt, setBezugArt] = useState("");
  const [freigabe, setFreigabe] = useState("");
  const [alleVersionen, setAlleVersionen] = useState(false);
  const basis = useMemo(() => (alleVersionen ? dokumente : aktuelleVersionen(dokumente)), [dokumente, alleVersionen]);
  const liste = useMemo(() => dokumenteFiltern(basis, { q, kategorie, bezugArt, freigabe }), [basis, q, kategorie, bezugArt, freigabe]);
  const bezuege = [...new Set(dokumente.map((d) => d.bezugArt))].filter(Boolean);
  const kategorien = [...new Set(dokumente.map((d) => d.kategorie))].filter(Boolean);
  const aktiv = q || kategorie || bezugArt || freigabe;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Dokumente durchsuchen</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Fläche, Projekt …" className={cn(eingabe, "h-10 pl-10 text-[14px]")} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Kategorie</span>
          <select value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={cn(auswahlfeld, "h-10 text-[14px]")}>
            <option value="">Alle Kategorien</option>
            {kategorien.map((k) => <option key={k} value={k}>{DOKUMENT_KATEGORIEN[k] || k}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Bezug</span>
          <select value={bezugArt} onChange={(e) => setBezugArt(e.target.value)} className={cn(auswahlfeld, "h-10 text-[14px]")}>
            <option value="">Alle Bezüge</option>
            {bezuege.map((k) => <option key={k} value={k}>{BEZUG_LABEL[k] || k}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Prüfstatus</span>
          <select value={freigabe} onChange={(e) => setFreigabe(e.target.value)} className={cn(auswahlfeld, "h-10 text-[14px]")}>
            <option value="">Jeder Prüfstatus</option>
            {DOKUMENT_FREIGABE_IDS.map((k) => <option key={k} value={k}>{DOKUMENT_FREIGABE[k].label}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-500">
        <p aria-live="polite">{liste.length} von {basis.length} {alleVersionen ? "Dateien" : "Dokumenten"}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={alleVersionen} onChange={(e) => setAlleVersionen(e.target.checked)} className="h-4 w-4 accent-[#558227]" /> Alle Versionen zeigen
          </label>
          {aktiv && (
            <button type="button" onClick={() => { setQ(""); setKategorie(""); setBezugArt(""); setFreigabe(""); }} className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">
              <X aria-hidden="true" className="h-3.5 w-3.5" /> Filter zurücksetzen
            </button>
          )}
        </div>
      </div>
      {liste.length ? (
        <ul className="divide-y divide-ink-100">
          {liste.map((d) => <Zeile key={d.id} d={d} admin={admin} nutzerId={nutzerId} zeigeBezug />)}
        </ul>
      ) : (
        <p className="rounded-2xl bg-sand-50 px-4 py-6 text-center text-[14px] text-ink-500">{dokumente.length ? "Kein Dokument passt zu Suche und Filter." : "Noch keine Dokumente vorhanden. Unterlagen zu einer Fläche oder einem Projekt laden Sie direkt dort hoch – oder rechts als allgemeines Dokument."}</p>
      )}
    </div>
  );
}

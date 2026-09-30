"use client";

// Datenraum 2.0: Ordner nach Standard-Index, Dokumentversionen, Freigabestufen (Stufe 1 nach NDA,
// Stufe 2 nach LOI), Download mit Empfänger + Datum im Dateinamen, jeder Zugriff protokolliert.
// Anbieter/Backoffice ordnen ein, laden neue Versionen hoch und legen die Stufe fest.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, Eye, FileText, FileUp, History, Lock, Search, Upload } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { dateigroesse, datum } from "@/lib/plattform/format";
import { DATENRAUM_ORDNER, DATENRAUM_STUFEN } from "@/lib/plattform/dealroom";
import { Badge } from "@/components/Portal/ui";
import { auswahlfeld, eingabe, FehlerBox, ErfolgBox } from "@/components/Portal/felder";

async function hochladen(datei, felder) {
  const fd = new FormData();
  fd.append("datei", datei);
  for (const [k, v] of Object.entries(felder)) if (v !== undefined && v !== null && v !== "") fd.append(k, String(v));
  const res = await fetch("/api/portal/datenraum/upload", { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Upload fehlgeschlagen (${res.status})`);
  return json;
}

const dokLink = (id, anzeigen) => `/api/portal/datenraum/dokumente/${id}${anzeigen ? "?anzeigen=1" : ""}`;

function DokZeile({ d, verwalten, projektId, setMeldung }) {
  const router = useRouter();
  const [versionen, setVersionen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const datei = useRef(null);

  async function einordnen(feld, wert) {
    setLaeuft(true);
    try {
      await senden(`/api/portal/datenraum/dokumente/${d.id}`, { method: "PATCH", body: { [feld]: wert } });
      setMeldung({ ok: `„${d.name}“ aktualisiert.` });
      router.refresh();
    } catch (e) {
      setMeldung({ fehler: e.message });
    } finally {
      setLaeuft(false);
    }
  }

  async function neueVersion(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLaeuft(true);
    try {
      await hochladen(f, { projektId, versionVon: d.id, ordner: d.ordner, stufe: d.stufe });
      setMeldung({ ok: `Neue Version von „${d.name}“ hochgeladen (v${d.version + 1}).` });
      router.refresh();
    } catch (err) {
      setMeldung({ fehler: err.message });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <li className="px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", d.gesperrt ? "bg-ink-100 text-ink-400" : "bg-ov-50 text-ov-700")}>
          {d.gesperrt ? <Lock aria-hidden="true" className="h-4 w-4" /> : <FileText aria-hidden="true" className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("break-words text-[14.5px] font-semibold", d.gesperrt ? "text-ink-500" : "text-ink-900")}>{d.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-500">
            <span>{datum(d.am)}</span>
            <span aria-hidden="true">·</span>
            <span>{dateigroesse(d.groesse)}</span>
            {d.version > 1 && <Badge ton="info" className="py-0.5">Version {d.version}</Badge>}
            <Badge ton={d.stufe === 2 ? "warn" : "neutral"} className="py-0.5">{DATENRAUM_STUFEN[d.stufe].label}</Badge>
            {d.kategorie !== "datenraum" && verwalten && <Badge className="py-0.5">nicht im Investoren-Datenraum</Badge>}
          </p>
          {d.gesperrt && <p className="mt-1 text-[12.5px] text-ink-500">Freigabe {DATENRAUM_STUFEN[2].text}.</p>}
        </div>
        {!d.gesperrt && (
          <div className="flex shrink-0 gap-1.5">
            <a href={dokLink(d.id, true)} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
              <Eye aria-hidden="true" className="h-4 w-4" /> Ansehen
            </a>
            <a href={dokLink(d.id)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy-900 px-3 text-[13px] font-semibold text-white hover:bg-navy-800" aria-label={`${d.name} herunterladen`}>
              <Download aria-hidden="true" className="h-4 w-4" /> <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        )}
      </div>
      {verwalten && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
          <label className="sr-only" htmlFor={`ordner-${d.id}`}>Ordner</label>
          <select id={`ordner-${d.id}`} disabled={laeuft} className={cn(auswahlfeld, "h-9 w-auto min-w-[180px] text-[13px]")} value={d.ordner} onChange={(e) => einordnen("ordner", e.target.value)}>
            {DATENRAUM_ORDNER.map((o) => <option key={o.id} value={o.id}>{o.nr} {o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor={`stufe-${d.id}`}>Freigabestufe</label>
          <select id={`stufe-${d.id}`} disabled={laeuft} className={cn(auswahlfeld, "h-9 w-auto text-[13px]")} value={d.stufe} onChange={(e) => einordnen("stufe", Number(e.target.value))}>
            <option value={1}>Stufe 1 · nach NDA</option>
            <option value={2}>Stufe 2 · nach LOI</option>
          </select>
          <button type="button" disabled={laeuft} onClick={() => datei.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50">
            <FileUp aria-hidden="true" className="h-4 w-4" /> Neue Version
          </button>
          <input ref={datei} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1} onChange={neueVersion} aria-label={`Neue Version von ${d.name}`} />
        </div>
      )}
      {d.versionen?.length > 0 && (
        <div className="mt-2 pl-12">
          <button type="button" onClick={() => setVersionen((x) => !x)} aria-expanded={versionen} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-600 hover:text-ink-900">
            <History aria-hidden="true" className="h-3.5 w-3.5" /> {d.versionen.length} ältere {d.versionen.length === 1 ? "Version" : "Versionen"}
            <ChevronRight aria-hidden="true" className={cn("h-3.5 w-3.5 transition-transform", versionen && "rotate-90")} />
          </button>
          {versionen && (
            <ul className="mt-1.5 space-y-1">
              {d.versionen.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-600">
                  <Badge className="py-0.5">v{x.version}</Badge>
                  <span className="min-w-0 break-words">{x.name}</span>
                  <span className="text-ink-400">{datum(x.am)}</span>
                  {!x.gesperrt && <a href={dokLink(x.id)} className="font-semibold text-ov-700 hover:text-ov-800">Download</a>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function DatenraumBaum({ projektId, datenraum, verwalten = false }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [meldung, setMeldung] = useState({});
  const [upOrdner, setUpOrdner] = useState("planung");
  const [upStufe, setUpStufe] = useState(1);
  const [laeuft, setLaeuft] = useState(false);
  const eingabeRef = useRef(null);

  const ordner = useMemo(() => {
    const t = q.trim().toLowerCase();
    return datenraum.ordner.map((o) => ({ ...o, dokumente: t ? o.dokumente.filter((d) => d.name.toLowerCase().includes(t)) : o.dokumente }));
  }, [datenraum, q]);

  async function upload(e) {
    const dateien = [...(e.target.files || [])];
    e.target.value = "";
    if (!dateien.length) return;
    setLaeuft(true);
    setMeldung({});
    try {
      for (const f of dateien) await hochladen(f, { projektId, ordner: upOrdner, stufe: upStufe });
      setMeldung({ ok: `${dateien.length} ${dateien.length === 1 ? "Dokument" : "Dokumente"} hochgeladen.` });
      router.refresh();
    } catch (err) {
      setMeldung({ fehler: err.message });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Datenraum durchsuchen</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className={cn(eingabe, "h-10 pl-9 text-[14px]")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dokument suchen …" />
        </label>
        {verwalten && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="up-ordner">Zielordner</label>
            <select id="up-ordner" className={cn(auswahlfeld, "h-10 w-auto text-[13.5px]")} value={upOrdner} onChange={(e) => setUpOrdner(e.target.value)}>
              {DATENRAUM_ORDNER.map((o) => <option key={o.id} value={o.id}>{o.nr} {o.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="up-stufe">Freigabestufe</label>
            <select id="up-stufe" className={cn(auswahlfeld, "h-10 w-auto text-[13.5px]")} value={upStufe} onChange={(e) => setUpStufe(Number(e.target.value))}>
              <option value={1}>Stufe 1</option>
              <option value={2}>Stufe 2</option>
            </select>
            <button type="button" disabled={laeuft} onClick={() => eingabeRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
              <Upload aria-hidden="true" className="h-4 w-4" /> {laeuft ? "Lädt …" : "Hochladen"}
            </button>
            <input ref={eingabeRef} type="file" multiple accept="application/pdf,image/jpeg,image/png" className="sr-only" tabIndex={-1} onChange={upload} aria-label="Dokumente in den Datenraum hochladen" />
          </div>
        )}
      </div>
      {(meldung.fehler || meldung.ok) && (
        <div>
          <FehlerBox>{meldung.fehler}</FehlerBox>
          <ErfolgBox>{meldung.ok}</ErfolgBox>
        </div>
      )}
      <div className="space-y-3">
        {ordner.map((o) => (
          <details key={o.id} open={o.dokumente.length > 0} className="group overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 md:px-5 [&::-webkit-details-marker]:hidden">
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-90" />
              <span className="ov-num w-7 shrink-0 font-display text-[13px] font-extrabold text-ov-700">{o.nr}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15.5px] font-bold text-ink-900">{o.label}</span>
                <span className="block truncate text-[12.5px] text-ink-500">{o.text}</span>
              </span>
              <span className="ov-num shrink-0 rounded-full bg-ink-50 px-2.5 py-0.5 text-[12px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200">{o.dokumente.length}</span>
            </summary>
            {o.dokumente.length ? (
              <ul className="divide-y divide-ink-100 border-t border-ink-100">
                {o.dokumente.map((d) => <DokZeile key={`${d.id}-${d.ordner}-${d.stufe}-${d.version}`} d={d} verwalten={verwalten} projektId={projektId} setMeldung={setMeldung} />)}
              </ul>
            ) : (
              <p className="border-t border-ink-100 px-5 py-4 text-[13.5px] text-ink-500">{q ? "Kein Treffer in diesem Ordner." : "Noch keine Unterlagen."}</p>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}

"use client";

// Dokumentliste mit Download, Löschen (eigene Uploads) und optionalem Upload.
// Prüfung von Typ (PDF/JPG/PNG an den ersten Bytes) und Größe (≤ 10 MB) erfolgt serverseitig;
// hier nur Vorprüfung für schnelle Rückmeldung.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileImage, FileText, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { hochladen, senden } from "@/lib/plattform/client";
import { DOKUMENT_KATEGORIEN, UPLOAD } from "@/lib/plattform/konstanten";
import { datum, dateigroesse } from "@/lib/plattform/format";
import { auswahlfeld, FehlerBox, ErfolgBox } from "./felder";

export function DokumentListe({ dokumente = [], nutzerId, admin = false, zeigeBezug = false, leerText = "Noch keine Dokumente." }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");

  async function loeschen(d) {
    if (!window.confirm(`„${d.name}“ wirklich löschen?`)) return;
    try {
      await senden(`/api/portal/dokumente/${d.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  if (!dokumente.length) return <p className="text-[14px] text-ink-500">{leerText}</p>;
  return (
    <div className="space-y-2">
      <FehlerBox>{fehler}</FehlerBox>
      <ul className="divide-y divide-ink-100">
        {dokumente.map((d) => {
          const Icon = d.mime === "application/pdf" ? FileText : FileImage;
          return (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <a href={`/api/portal/dokumente/${d.id}?anzeigen=1`} target="_blank" rel="noopener" className="block truncate text-[14.5px] font-semibold text-ink-900 hover:text-ov-700">
                  {d.name}
                </a>
                <p className="truncate text-[12.5px] text-ink-500">
                  {DOKUMENT_KATEGORIEN[d.kategorie] || d.kategorie} · {dateigroesse(d.groesse)} · {datum(d.am)}
                  {zeigeBezug && d.bezugTitel && (
                    <>
                      {" · "}
                      {d.bezugLink ? <Link href={d.bezugLink} className="underline underline-offset-2 hover:text-ov-700">{d.bezugTitel}</Link> : d.bezugTitel}
                    </>
                  )}
                </p>
              </div>
              <a href={`/api/portal/dokumente/${d.id}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 hover:text-ink-900" aria-label={`${d.name} herunterladen`}>
                <Download aria-hidden="true" className="h-4 w-4" />
              </a>
              {(admin || d.hochgeladenVon === nutzerId) && (
                <button type="button" onClick={() => loeschen(d)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label={`${d.name} löschen`}>
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DokumentUpload({ bezugArt, bezugId, kategorien = ["allgemein"], hinweis }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [kategorie, setKategorie] = useState(kategorien[0]);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [ziehen, setZiehen] = useState(false);

  async function dateienVerarbeiten(liste) {
    setFehler("");
    setErfolg("");
    const dateien = Array.from(liste || []).slice(0, 5);
    if (!dateien.length) return;
    for (const f of dateien) {
      if (!UPLOAD.typen[f.type]) return setFehler(`„${f.name}“: erlaubt sind PDF, JPG und PNG.`);
      if (f.size > UPLOAD.maxBytes) return setFehler(`„${f.name}“ ist größer als 10 MB.`);
    }
    setLaeuft(true);
    try {
      for (const f of dateien) await hochladen(f, { bezugArt, bezugId, kategorie });
      setErfolg(dateien.length === 1 ? "Dokument hochgeladen." : `${dateien.length} Dokumente hochgeladen.`);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {kategorien.length > 1 && (
        <div>
          <label htmlFor={`kat-${bezugId}`} className="mb-1.5 block text-[13px] font-semibold text-ink-700">Ablage</label>
          <select id={`kat-${bezugId}`} value={kategorie} onChange={(e) => setKategorie(e.target.value)} className={cn(auswahlfeld, "h-11")}>
            {kategorien.map((k) => (
              <option key={k} value={k}>{DOKUMENT_KATEGORIEN[k]}</option>
            ))}
          </select>
        </div>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setZiehen(true);
        }}
        onDragLeave={() => setZiehen(false)}
        onDrop={(e) => {
          e.preventDefault();
          setZiehen(false);
          dateienVerarbeiten(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
          ziehen ? "border-ov-500 bg-ov-50" : "border-ink-200 bg-sand-50 hover:border-ov-300"
        )}
      >
        <UploadCloud aria-hidden="true" className="h-7 w-7 text-ov-600" />
        <span className="mt-2 text-[14px] font-semibold text-ink-800">{laeuft ? "Wird hochgeladen …" : "Datei wählen oder hierher ziehen"}</span>
        <span className="mt-0.5 text-[12.5px] text-ink-500">{hinweis || "PDF, JPG oder PNG, höchstens 10 MB"}</span>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple className="sr-only" disabled={laeuft} onChange={(e) => dateienVerarbeiten(e.target.files)} />
      </label>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
    </div>
  );
}

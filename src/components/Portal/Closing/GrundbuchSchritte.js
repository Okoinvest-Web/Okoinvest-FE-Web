"use client";

// Grundbuch-Akte (Backoffice): Schritte je Land mit Status, Datum, Frist, Nachweis (Aktenzeichen/TZ bzw. Upload), Notiz und
// „Zur Unterschrift senden“ (Signatur-Modul). Reihenfolge und Pflichtnachweise prüft der Server (409/422 mit Hinweis).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle, CircleDashed, FileSignature, Loader2, Paperclip, Save, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { GB_SCHRITT_STATUS } from "@/lib/plattform/closing/grundbuch";

const ICON = { erledigt: CheckCircle2, in_arbeit: Loader2, entfaellt: CircleDashed, offen: Circle };
const datumText = (d) => (d ? d.split("-").reverse().join(".") : "");

async function hochladenNachweis(id, schritt, datei) {
  const fd = new FormData();
  fd.append("datei", datei);
  fd.append("schritt", schritt);
  const res = await fetch(`/api/admin/grundbuch/${id}/dokumente`, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || `Fehler ${res.status}`);
  return j.dokument;
}

function Zeile({ akteId, s, schreiben, onNeu }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [status, setStatus] = useState(s.status === "offen" ? "erledigt" : s.status);
  const [datum, setDatum] = useState(s.datum || new Date().toISOString().slice(0, 10));
  const [wert, setWert] = useState(s.nachweisWert || "");
  const [notiz, setNotiz] = useState(s.notiz || "");
  const [frist, setFrist] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const Icon = ICON[s.status] || Circle;

  async function speichern(ev) {
    ev.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const body = { schluessel: s.schluessel, status, datum, notiz, ...(s.nachweis ? { nachweisWert: wert } : {}), ...(frist ? { frist } : {}) };
      const r = await senden(`/api/admin/grundbuch/${akteId}/schritt`, { body });
      onNeu(r.akte);
      setOffen(false);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function upload(ev) {
    const datei = ev.target.files?.[0];
    ev.target.value = "";
    if (!datei) return;
    setFehler("");
    setErfolg("");
    setLaeuft(true);
    try {
      const d = await hochladenNachweis(akteId, s.schluessel, datei);
      setErfolg(`Nachweis „${d.name}“ hochgeladen.`);
      const r = await senden(`/api/admin/grundbuch/${akteId}`, { method: "GET" }).catch(() => null);
      if (r?.akte) onNeu(r.akte);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function signatur() {
    setFehler("");
    setErfolg("");
    setLaeuft(true);
    try {
      const r = await senden(`/api/admin/grundbuch/${akteId}/signatur`, { body: {} });
      onNeu(r.akte);
      setErfolg(`Signaturvorgang ${r.signaturId} angelegt – der Eigentümer wurde benachrichtigt.`);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <Icon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", s.status === "erledigt" ? "text-ov-600" : s.status === "in_arbeit" ? "text-navy-600" : "text-ink-300")} />
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">
              {s.label}
              {s.optional && <span className="font-normal text-ink-500"> (entfällt ohne Grundpfandrechte)</span>}
            </p>
            {s.text && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{s.text}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-700">
              {s.datum && <span>Erledigt am {datumText(s.datum)}</span>}
              {s.frist && !["erledigt", "entfaellt"].includes(s.status) && (
                <span className={cn("inline-flex items-center gap-1", s.ueberfaellig && "font-semibold text-danger-700")}>
                  {s.ueberfaellig && <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />}Frist {datumText(s.frist)}{s.ueberfaellig ? " – überfällig" : ""}
                </span>
              )}
              {s.nachweisWert && <span>Nachweis: {s.nachweisWert}</span>}
              {s.dokumentId && (
                <a href={`/api/portal/grundbuch/${akteId}/dokumente/${s.dokumentId}`} className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">
                  <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />Dokument
                </a>
              )}
              {s.signatur && (
                <a href={`/portal/signatur/${s.signatur.id}`} className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">
                  <FileSignature aria-hidden="true" className="h-3.5 w-3.5" />Signatur {s.signatur.status === "abgeschlossen" ? "abgeschlossen" : s.signatur.status === "laufend" ? "läuft" : s.signatur.status}
                </a>
              )}
              {s.notiz && <span className="text-ink-500">{s.notiz}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge ton={GB_SCHRITT_STATUS[s.status]?.ton}>{s.statusLabel}</Badge>
          {schreiben && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>
              {offen ? "Schließen" : "Bearbeiten"}
            </Button>
          )}
        </div>
      </div>
      {offen && (
        <form onSubmit={speichern} className="mt-3 grid gap-2 rounded-2xl bg-ink-50 p-3 sm:grid-cols-2">
          <label className="sr-only" htmlFor={`gb-st-${s.schluessel}`}>Status</label>
          <select id={`gb-st-${s.schluessel}`} value={status} onChange={(e) => setStatus(e.target.value)} className={auswahlfeld}>
            {Object.entries(GB_SCHRITT_STATUS).filter(([k]) => k !== "entfaellt" || s.optional).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
          </select>
          <input aria-label="Datum der Erledigung" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={eingabe} />
          {s.nachweis && <input aria-label={s.nachweisLabel} value={wert} onChange={(e) => setWert(e.target.value)} placeholder={s.nachweisLabel} className={cn(eingabe, "sm:col-span-2")} />}
          <input aria-label="Notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Notiz (intern)" className={eingabe} />
          <input aria-label="Frist manuell setzen" type="date" value={frist} onChange={(e) => setFrist(e.target.value)} title="Frist manuell setzen (optional)" className={eingabe} />
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="submit" size="sm" variant="navy" icon={Save} disabled={laeuft}>Speichern</Button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-ink-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
              <Upload aria-hidden="true" className="h-4 w-4" />Nachweis hochladen
              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={upload} className="sr-only" />
            </label>
            {s.signaturMoeglich && s.status !== "erledigt" && s.signatur?.status !== "laufend" && (
              <Button type="button" size="sm" variant="secondary" icon={FileSignature} onClick={signatur} disabled={laeuft}>Zur Unterschrift senden</Button>
            )}
          </div>
          <div className="sm:col-span-2 space-y-2">
            <FehlerBox>{fehler}</FehlerBox>
            <ErfolgBox>{erfolg}</ErfolgBox>
          </div>
        </form>
      )}
      {!offen && (fehler || erfolg) && <div className="mt-2 space-y-2"><FehlerBox>{fehler}</FehlerBox><ErfolgBox>{erfolg}</ErfolgBox></div>}
    </li>
  );
}

export default function GrundbuchSchritte({ akte, schreiben }) {
  const [a, setA] = useState(akte);
  return (
    <ol className="divide-y divide-ink-100">
      {a.schritte.map((s) => (
        <Zeile key={`${s.schluessel}-${s.status}-${s.datum}-${s.dokumentId || ""}-${s.signatur?.status || ""}`} akteId={a.id} s={s} schreiben={schreiben && !a.abgebrochen} onNeu={setA} />
      ))}
    </ol>
  );
}

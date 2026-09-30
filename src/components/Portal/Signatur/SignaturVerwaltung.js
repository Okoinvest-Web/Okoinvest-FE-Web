"use client";

// Backoffice: Signaturvorgang anlegen (PDF, Unterzeichner in Reihenfolge, Frist), Aktionen (erinnern, widerrufen)
// und Einstellung „Klick oder Signatur“ für NDA und Provisionsvereinbarung.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BellRing, Plus, Trash2, Upload, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { SIGNATUR_ARTEN, SIGNATUR_GRENZEN, SIGNATUR_MODI } from "@/lib/plattform/signatur";

export function SignaturNeu({ vorschlaege = [] }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [titel, setTitel] = useState("");
  const [art, setArt] = useState("nda");
  const [datei, setDatei] = useState(null);
  const [liste, setListe] = useState([""]);
  const [reihenfolge, setReihenfolge] = useState(true);
  const [fristTage, setFristTage] = useState(SIGNATUR_GRENZEN.fristTageStandard);
  const [nachricht, setNachricht] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  const setzen = (i, wert) => setListe((l) => l.map((x, j) => (j === i ? wert : x)));
  const schieben = (i, d) => setListe((l) => {
    const n = [...l];
    const j = i + d;
    if (j < 0 || j >= n.length) return n;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  async function absenden(e) {
    e.preventDefault();
    setFehler("");
    if (!datei) return setFehler("Bitte wählen Sie die PDF-Datei.");
    setLaeuft(true);
    try {
      const fd = new FormData();
      fd.append("datei", datei);
      fd.append("daten", JSON.stringify({ titel, art, unterzeichner: liste.filter((x) => x.trim()).map((email) => ({ email: email.trim() })), reihenfolge, fristTage, nachricht }));
      const res = await fetch("/api/admin/signatur", { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || `Fehler ${res.status}`);
      router.push(`/portal/signatur/${json.vorgang.id}`);
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  if (!offen) return <Button type="button" size="sm" icon={Plus} onClick={() => setOffen(true)}>Dokument zur Unterschrift</Button>;

  return (
    <form onSubmit={absenden} className="w-full space-y-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <h2 className="font-display text-[18px] font-bold text-ink-900">Dokument zur Unterschrift bereitstellen</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Feld id="sn-titel" label="Titel" pflicht>
          <input id="sn-titel" value={titel} onChange={(e) => setTitel(e.target.value)} className={eingabe} maxLength={160} required minLength={3} placeholder="z. B. NDA Projekt Süd" />
        </Feld>
        <Feld id="sn-art" label="Dokumentart">
          <select id="sn-art" value={art} onChange={(e) => setArt(e.target.value)} className={auswahlfeld}>
            {Object.entries(SIGNATUR_ARTEN).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}
          </select>
        </Feld>
      </div>
      <Feld id="sn-datei" label="PDF-Datei (höchstens 10 MB)" pflicht hinweis="Das Original bleibt unverändert; die Prüfseite wird nach der letzten Unterschrift angehängt. Keine kennwortgeschützten PDFs.">
        <label htmlFor="sn-datei" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50 px-4 py-3 text-[14px] text-ink-700 hover:border-ov-400">
          <Upload aria-hidden="true" className="h-5 w-5 text-ov-600" />
          <span className="min-w-0 truncate">{datei ? `${datei.name} (${Math.round(datei.size / 1024)} KB)` : "PDF auswählen"}</span>
          <input id="sn-datei" type="file" accept="application/pdf" className="sr-only" onChange={(e) => setDatei(e.target.files?.[0] || null)} />
        </label>
      </Feld>
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-700">Unterzeichner (Portal-Konten, E-Mail-Adresse)</legend>
        {liste.map((x, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="ov-num w-5 shrink-0 text-right text-[13px] text-ink-500">{i + 1}.</span>
            <input value={x} onChange={(e) => setzen(i, e.target.value)} list="sn-vorschlaege" type="email" required={i === 0} className={cn(eingabe, "h-11")} aria-label={`Unterzeichner ${i + 1}`} placeholder="name@beispiel.de" />
            <button type="button" onClick={() => schieben(i, -1)} disabled={i === 0} className="rounded-full p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label="Nach oben"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => schieben(i, 1)} disabled={i === liste.length - 1} className="rounded-full p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label="Nach unten"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" onClick={() => setListe((l) => l.filter((_, j) => j !== i))} disabled={liste.length === 1} className="rounded-full p-2 text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label="Entfernen"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <datalist id="sn-vorschlaege">{vorschlaege.map((v) => <option key={v.email} value={v.email}>{v.name}</option>)}</datalist>
        {liste.length < SIGNATUR_GRENZEN.maxUnterzeichner && (
          <button type="button" onClick={() => setListe((l) => [...l, ""])} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-ov-700 hover:bg-ov-50">
            <Plus aria-hidden="true" className="h-4 w-4" /> Unterzeichner hinzufügen
          </button>
        )}
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Feld id="sn-frist" label="Frist (Tage)">
          <input id="sn-frist" type="number" min={1} max={SIGNATUR_GRENZEN.fristTageMax} value={fristTage} onChange={(e) => setFristTage(Number(e.target.value))} className={eingabe} />
        </Feld>
        <label className="flex items-center gap-2 self-end pb-3 text-[14px] text-ink-700">
          <input type="checkbox" checked={reihenfolge} onChange={(e) => setReihenfolge(e.target.checked)} className="h-4 w-4 accent-ov-600" />
          Feste Reihenfolge (nacheinander unterschreiben)
        </label>
      </div>
      <Feld id="sn-nachricht" label="Nachricht an die Unterzeichner (optional)">
        <textarea id="sn-nachricht" value={nachricht} onChange={(e) => setNachricht(e.target.value)} className={textbereich} maxLength={1000} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={laeuft}>{laeuft ? "Wird bereitgestellt …" : "Zur Unterschrift senden"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
      </div>
    </form>
  );
}

export function SignaturAktionen({ id, darfErinnern, darfWiderrufen }) {
  const router = useRouter();
  const [grund, setGrund] = useState("");
  const [widerruf, setWiderruf] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [info, setInfo] = useState("");

  async function aktion(body) {
    setLaeuft(true);
    setFehler("");
    setInfo("");
    try {
      await senden(`/api/portal/signatur/${id}`, { body });
      setInfo(body.aktion === "erinnern" ? "Erinnerung gesendet." : "Vorgang widerrufen.");
      setWiderruf(false);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {darfErinnern && <Button type="button" size="sm" variant="secondary" icon={BellRing} disabled={laeuft} onClick={() => aktion({ aktion: "erinnern" })}>Erinnern</Button>}
        {darfWiderrufen && <Button type="button" size="sm" variant="ghost" icon={XCircle} disabled={laeuft} onClick={() => setWiderruf((x) => !x)}>Widerrufen</Button>}
      </div>
      {widerruf && (
        <form onSubmit={(e) => { e.preventDefault(); aktion({ aktion: "widerrufen", grund }); }} className="space-y-2">
          <Feld id="sw-grund" label="Grund des Widerrufs" pflicht hinweis="Nur vor der letzten Unterschrift möglich. Alle Unterzeichner werden benachrichtigt.">
            <input id="sw-grund" value={grund} onChange={(e) => setGrund(e.target.value)} className={eingabe} minLength={3} maxLength={300} required />
          </Feld>
          <Button type="submit" size="sm" variant="navy" disabled={laeuft}>Widerruf bestätigen</Button>
        </form>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{info}</ErfolgBox>
    </div>
  );
}

export function SignaturEinstellungen({ einstellungen, darfBearbeiten }) {
  const [werte, setWerte] = useState({ ndaModus: einstellungen?.ndaModus || "klick", provisionModus: einstellungen?.provisionModus || "klick" });
  const [status, setStatus] = useState("");
  async function speichern(neu) {
    setWerte(neu);
    setStatus("");
    try {
      await senden("/api/admin/signatur/einstellungen", { method: "PATCH", body: neu });
      setStatus("Gespeichert.");
    } catch (e) {
      setStatus(e.message);
    }
  }
  const zeile = (schluessel, label) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[14px] font-semibold text-ink-900">{label}</p>
      <select value={werte[schluessel]} disabled={!darfBearbeiten} onChange={(e) => speichern({ ...werte, [schluessel]: e.target.value })} className={cn(auswahlfeld, "h-10 sm:w-[280px]")} aria-label={label}>
        {Object.entries(SIGNATUR_MODI).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <div className="space-y-3">
      {zeile("ndaModus", "Klick-NDA der Projektbörse")}
      {zeile("provisionModus", "Provisionsvereinbarung (Anbieter)")}
      <p className="text-[12.5px] leading-relaxed text-ink-500">Standard ist die bisherige Klick-Bestätigung. Mit „Elektronische Unterschrift“ erhalten Investoren bzw. Anbieter das Dokument als PDF zur Unterschrift; nach Abschluss wird die NDA bzw. Provisionsvereinbarung automatisch wie bisher vermerkt.</p>
      {status && <p role="status" className="text-[13px] text-ink-600">{status}</p>}
    </div>
  );
}

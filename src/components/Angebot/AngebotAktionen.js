"use client";

// src/components/Angebot/AngebotAktionen.js – interaktive Teile der personalisierten Angebotsseite /angebot/[code]:
// Aufruf melden (Rücklauf-Tracking, einmal je Sitzung), Anfrage-Formular (inkl. optionaler Einwilligung Telefon),
// Widerspruch (Art. 21 DSGVO → Sperrliste). Keine Eigentümerdaten im Browser – nur der Code.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldBan } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { ErfolgBox, FehlerBox, Feld, eingabe, textbereich } from "@/components/Portal/felder";

export function AufrufMelden({ code }) {
  useEffect(() => {
    const schluessel = `oi-angebot-${code}`;
    try {
      if (sessionStorage.getItem(schluessel)) return;
      sessionStorage.setItem(schluessel, "1");
    } catch {
      /* ohne sessionStorage trotzdem melden */
    }
    senden(`/api/angebot/${code}/aufruf`, { body: {} }).catch(() => null);
  }, [code]);
  return null;
}

export function AngebotAnfrage({ code, bereitsGestellt = false }) {
  const [f, setF] = useState({ anrede: "", vorname: "", nachname: "", email: "", telefon: "", plz: "", ort: "", nachricht: "", rueckruf: false, einwilligung: false, website: "" });
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: bereitsGestellt });
  if (status.ok) {
    return (
      <ErfolgBox>
        Vielen Dank – Ihre Anfrage ist bei uns eingegangen. Wir melden uns bei Ihnen{f.rueckruf ? " telefonisch oder" : ""} per E-Mail. Sie können uns auch jederzeit per Brief antworten.
      </ErfolgBox>
    );
  }
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus({ laeuft: true, fehler: "", ok: false });
        try {
          await senden(`/api/angebot/${code}/anfrage`, { body: { kontakt: { anrede: f.anrede, vorname: f.vorname, nachname: f.nachname, email: f.email, telefon: f.telefon, plz: f.plz, ort: f.ort }, nachricht: f.nachricht, rueckrufEinwilligung: f.rueckruf, einwilligung: f.einwilligung, website: f.website } });
          setStatus({ laeuft: false, fehler: "", ok: true });
        } catch (err) {
          setStatus({ laeuft: false, fehler: err.message, ok: false });
        }
      }}
    >
      <Feld id="a-vorname" label="Vorname" pflicht><input id="a-vorname" required autoComplete="given-name" value={f.vorname} onChange={(e) => setF({ ...f, vorname: e.target.value })} className={eingabe} /></Feld>
      <Feld id="a-nachname" label="Nachname" pflicht><input id="a-nachname" required autoComplete="family-name" value={f.nachname} onChange={(e) => setF({ ...f, nachname: e.target.value })} className={eingabe} /></Feld>
      <Feld id="a-email" label="E-Mail" pflicht><input id="a-email" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={eingabe} /></Feld>
      <Feld id="a-tel" label="Telefon (optional)"><input id="a-tel" type="tel" autoComplete="tel" value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} className={eingabe} /></Feld>
      <Feld id="a-nachricht" label="Ihre Nachricht (optional)" className="sm:col-span-2"><textarea id="a-nachricht" value={f.nachricht} onChange={(e) => setF({ ...f, nachricht: e.target.value })} className={textbereich} placeholder="z. B. Fragen zur Pacht, zu Agri-PV oder zu einem Termin vor Ort" /></Feld>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className="hidden" aria-hidden="true" />
      <label className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-700 sm:col-span-2">
        <input type="checkbox" checked={f.rueckruf} onChange={(e) => setF({ ...f, rueckruf: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-[#558227]" />
        Ich willige ein, dass ÖkoInvest mich zu dieser Fläche telefonisch kontaktiert (nur mit angegebener Telefonnummer, jederzeit widerrufbar).
      </label>
      <label className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-700 sm:col-span-2">
        <input type="checkbox" required checked={f.einwilligung} onChange={(e) => setF({ ...f, einwilligung: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-[#558227]" />
        <span>Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Bearbeitung der Anfrage verarbeitet. Hinweise in der <a href="/datenschutz" className="font-semibold text-ov-700 underline">Datenschutzerklärung</a>. *</span>
      </label>
      <div className="sm:col-span-2">
        <FehlerBox>{status.fehler}</FehlerBox>
        <button type="submit" disabled={status.laeuft} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
          <Check className="h-4 w-4" aria-hidden="true" /> Unverbindlich Kontakt aufnehmen
        </button>
      </div>
    </form>
  );
}

export function Widerspruch({ code }) {
  const router = useRouter();
  const [bestaetigt, setBestaetigt] = useState(false);
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: false });
  if (status.ok) return <ErfolgBox>Ihr Widerspruch ist vermerkt. Wir schreiben Sie nicht mehr an; Ihr persönlicher Code ist deaktiviert.</ErfolgBox>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus({ laeuft: true, fehler: "", ok: false });
        try {
          await senden(`/api/angebot/${code}/widerspruch`, { body: { bestaetigt } });
          setStatus({ laeuft: false, fehler: "", ok: true });
          router.refresh();
        } catch (err) {
          setStatus({ laeuft: false, fehler: err.message, ok: false });
        }
      }}
    >
      <label className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-700">
        <input type="checkbox" required checked={bestaetigt} onChange={(e) => setBestaetigt(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#558227]" />
        Ich widerspreche der Verwendung meiner Daten für Anschreiben zu dieser und weiteren Flächen (Art. 21 Abs. 2 DSGVO).
      </label>
      <FehlerBox>{status.fehler}</FehlerBox>
      <button type="submit" disabled={status.laeuft} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 disabled:opacity-60">
        <ShieldBan className="h-4 w-4" aria-hidden="true" /> Nicht mehr anschreiben
      </button>
    </form>
  );
}

export function CodeEingabe() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.toUpperCase().replace(/[\s-]/g, "");
        if (c) router.push(`/angebot/${encodeURIComponent(c)}`);
      }}
    >
      <label htmlFor="code" className="sr-only">Ihr persönlicher Code</label>
      <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="z. B. ABCDE-23456" autoComplete="off" spellCheck={false} className={`${eingabe} font-mono uppercase tracking-wider sm:max-w-xs`} />
      <button type="submit" className="inline-flex h-12 items-center justify-center rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700">Steckbrief öffnen</button>
    </form>
  );
}

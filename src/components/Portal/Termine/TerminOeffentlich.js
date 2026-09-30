"use client";

// Öffentliche Terminbuchung (Website /termin, Einstieg aus Kontakt- und Flächencheck-Formularen):
// Terminart → freies Zeitfenster → Kontaktangaben + Einwilligung → Bestätigung mit Link zum Umbuchen/Absagen.
// Ohne Konto; wer angemeldet ist, bucht automatisch mit seinem Konto (Termin erscheint im Portal).

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, Feld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TERMIN_ARTEN, zeitraumText } from "@/lib/plattform/termine";
import SlotAuswahl from "./SlotAuswahl";
import { ArtWahl } from "./TerminBuchen";

export default function TerminOeffentlich({ arten, startArt, herkunft = "website", flaeche = null }) {
  const [art, setArt] = useState(startArt && arten.includes(startArt) ? startArt : arten[0]);
  const [slot, setSlot] = useState(null);
  const [k, setK] = useState({ name: "", email: "", telefon: "", firma: "", plz: flaeche?.plz || "", ort: flaeche?.ort || "", land: flaeche?.land || "DE" });
  const [notiz, setNotiz] = useState(flaeche?.notiz || "");
  const [einwilligung, setEinwilligung] = useState(false);
  const [honig, setHonig] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const a = TERMIN_ARTEN[art];
  const vorOrt = a?.kanal === "vor_ort";
  const setze = (f) => (e) => setK((x) => ({ ...x, [f]: e.target.value }));

  async function buchen(e) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/termine/oeffentlich", { body: { art, start: slot.start, kontakt: k, notiz, einwilligung, herkunft, website: honig } });
      setErgebnis(r);
    } catch (err) {
      setFehler(err.message);
      if (/nicht \(mehr\) frei/.test(err.message)) setSlot(null);
    } finally {
      setLaeuft(false);
    }
  }

  if (ergebnis) {
    const t = ergebnis.termin;
    return (
      <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-10">
        <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-ov-600" />
        <h2 className="ov-h3 mt-4 text-ink-900">Ihr Termin ist gebucht</h2>
        <p className="mt-2 text-[16px] text-ink-700">{t.artLabel}: <strong>{t.zeitraum}</strong>{t.mitarbeiter?.name ? ` mit ${t.mitarbeiter.name}` : ""}.</p>
        <p className="mt-3 flex gap-2 text-[15px] text-ink-600"><Mail aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> Die Bestätigung mit Kalenderdatei (ICS) haben wir an {k.email} geschickt.</p>
        {ergebnis.verwaltenToken && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={`/termin/verwalten?token=${ergebnis.verwaltenToken}`} prefetch={false} variant="secondary">Termin verschieben oder absagen</Button>
            <Button href="/registrieren" variant="ghost">Konto anlegen und Termine im Portal sehen</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={buchen} className="space-y-8">
      <div>
        <h2 className="ov-h3 text-ink-900">1. Worum geht es?</h2>
        <div className="mt-4"><ArtWahl arten={arten} art={art} setArt={(x) => { setArt(x); setSlot(null); }} /></div>
      </div>
      <div>
        <h2 className="ov-h3 text-ink-900">2. Freien Termin wählen</h2>
        <p className="mt-1 text-[14.5px] text-ink-600">{a.dauer} Minuten · alle Zeiten in mitteleuropäischer Zeit (Wien/Berlin)</p>
        <div className="mt-4"><SlotAuswahl art={art} gewaehlt={slot} onWahl={setSlot} /></div>
      </div>
      <fieldset disabled={!slot} className={cn("space-y-4 transition-opacity", !slot && "opacity-50")}>
        <legend className="ov-h3 text-ink-900">3. Ihre Angaben</legend>
        {slot && <ErfolgBox><CalendarCheck2 aria-hidden="true" className="mr-1.5 inline h-4 w-4" />{a.label}: {zeitraumText(slot.start, slot.ende)}</ErfolgBox>}
        <div className="grid gap-4 md:grid-cols-2">
          <Feld id="to-name" label="Name" pflicht><input id="to-name" value={k.name} onChange={setze("name")} className={eingabe} autoComplete="name" required minLength={2} maxLength={120} /></Feld>
          <Feld id="to-email" label="E-Mail" pflicht><input id="to-email" type="email" value={k.email} onChange={setze("email")} className={eingabe} autoComplete="email" required maxLength={160} /></Feld>
          <Feld id="to-tel" label={a.kanal === "telefon" ? "Telefon (für den Rückruf)" : "Telefon (optional)"} pflicht={a.kanal === "telefon"}><input id="to-tel" type="tel" value={k.telefon} onChange={setze("telefon")} className={eingabe} autoComplete="tel" required={a.kanal === "telefon"} maxLength={40} /></Feld>
          <Feld id="to-firma" label={art === "gemeinde" ? "Gemeinde / Behörde" : "Firma (optional)"}><input id="to-firma" value={k.firma} onChange={setze("firma")} className={eingabe} autoComplete="organization" maxLength={120} /></Feld>
          {vorOrt && (
            <>
              <Feld id="to-plz" label="PLZ des Ortes"><input id="to-plz" value={k.plz} onChange={setze("plz")} className={eingabe} inputMode="numeric" maxLength={10} /></Feld>
              <Feld id="to-ort" label="Ort / Gemarkung"><input id="to-ort" value={k.ort} onChange={setze("ort")} className={eingabe} maxLength={80} /></Feld>
            </>
          )}
        </div>
        <Feld id="to-notiz" label="Ihre Nachricht (optional)"><textarea id="to-notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} className={textbereich} maxLength={1000} /></Feld>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={honig} onChange={(e) => setHonig(e.target.value)} /></label>
        </div>
        <label className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
          <input type="checkbox" checked={einwilligung} onChange={(e) => setEinwilligung(e.target.checked)} required className="mt-1 h-4 w-4 shrink-0 accent-ov-600" />
          <span>Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Vereinbarung und Durchführung dieses Termins verarbeitet und mir eine Bestätigung sowie eine Erinnerung per E-Mail sendet. Details in der <Link href="/datenschutz" className="font-semibold text-ov-700 underline-offset-2 hover:underline">Datenschutzerklärung</Link>.</span>
        </label>
        <FehlerBox>{fehler}</FehlerBox>
        <Button type="submit" size="lg" disabled={laeuft || !slot} icon={CalendarCheck2}>{laeuft ? "Wird gebucht …" : "Termin verbindlich buchen"}</Button>
      </fieldset>
      {!slot && <FehlerBox>{fehler}</FehlerBox>}
    </form>
  );
}

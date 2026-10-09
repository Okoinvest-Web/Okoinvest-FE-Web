"use client";

// Öffentliche Terminbuchung (Website /termin, Einstieg aus Kontakt- und Flächencheck-Formularen):
// Terminart → freies Zeitfenster → Kontaktangaben + Einwilligung → Bestätigung mit Link zum Umbuchen/Absagen.
// Ohne Konto; wer angemeldet ist, bucht automatisch mit seinem Konto (Termin erscheint im Portal).

import { useState } from "react";
import Link from "@/components/Land/Link";
import { CalendarCheck2, CheckCircle2, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, Feld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TERMIN_ARTEN, zeitraumText } from "@/lib/plattform/termine";
import SlotAuswahl from "./SlotAuswahl";
import { ArtWahl } from "./TerminBuchen";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { meldungFuer } from "@/lib/sprache/meldungen";
import { terminArt, zeitraumTextEn } from "@/lib/sprache/termine";

const TEXTE = {
  de: {
    gebucht: "Ihr Termin ist gebucht",
    mit: (n) => ` mit ${n}`,
    bestaetigung: (m) => `Die Bestätigung mit Kalenderdatei (ICS) haben wir an ${m} geschickt.`,
    verschieben: "Termin verschieben oder absagen",
    konto: "Konto anlegen und Termine im Portal sehen",
    schritt1: "1. Worum geht es?",
    schritt2: "2. Freien Termin wählen",
    dauer: (d) => `${d} Minuten · alle Zeiten in mitteleuropäischer Zeit (Wien/Berlin)`,
    schritt3: "3. Ihre Angaben",
    name: "Name",
    email: "E-Mail",
    telRueckruf: "Telefon (für den Rückruf)",
    telOptional: "Telefon (optional)",
    gemeinde: "Gemeinde / Behörde",
    firma: "Firma (optional)",
    plz: "PLZ des Ortes",
    ort: "Ort / Gemarkung",
    nachricht: "Ihre Nachricht (optional)",
    einwilligung: "Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Vereinbarung und Durchführung dieses Termins verarbeitet und mir eine Bestätigung sowie eine Erinnerung per E-Mail sendet. Details in der ",
    datenschutz: "Datenschutzerklärung",
    bucht: "Wird gebucht …",
    buchen: "Termin verbindlich buchen",
  },
  en: {
    gebucht: "Your appointment is booked",
    mit: (n) => ` with ${n}`,
    bestaetigung: (m) => `We have sent the confirmation with a calendar file (ICS) to ${m}.`,
    verschieben: "Reschedule or cancel the appointment",
    konto: "Create an account and see your appointments in the portal",
    schritt1: "1. What is it about?",
    schritt2: "2. Choose a free slot",
    dauer: (d) => `${d} minutes · all times in Central European Time (Vienna/Berlin)`,
    schritt3: "3. Your details",
    name: "Name",
    email: "E-mail",
    telRueckruf: "Phone (for the call)",
    telOptional: "Phone (optional)",
    gemeinde: "Municipality / authority",
    firma: "Company (optional)",
    plz: "Postcode of the site",
    ort: "Town / cadastral district",
    nachricht: "Your message (optional)",
    einwilligung: "I agree that ÖkoInvest may process my details to arrange and hold this appointment and send me a confirmation and a reminder by e-mail. Details in the ",
    datenschutz: "privacy policy",
    bucht: "Booking …",
    buchen: "Book appointment",
  },
};

export default function TerminOeffentlich({ arten, startArt, herkunft = "website", flaeche = null }) {
  const sprache = useSprache();
  const en = sprache === "en";
  const tx = uebersetze(TEXTE, sprache);
  const [art, setArt] = useState(startArt && arten.includes(startArt) ? startArt : arten[0]);
  const [slot, setSlot] = useState(null);
  const [k, setK] = useState({ name: "", email: "", telefon: "", firma: "", plz: flaeche?.plz || "", ort: flaeche?.ort || "", land: flaeche?.land || "DE" });
  const [notiz, setNotiz] = useState(flaeche?.notiz || "");
  const [einwilligung, setEinwilligung] = useState(false);
  const [honig, setHonig] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const a = terminArt(TERMIN_ARTEN[art], art, sprache);
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
      setFehler(meldungFuer(err.message, sprache));
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
        <h2 className="ov-h3 mt-4 text-ink-900">{tx.gebucht}</h2>
        <p className="mt-2 text-[16px] text-ink-700">{en ? a.label : t.artLabel}: <strong>{en && slot ? zeitraumTextEn(slot.start, slot.ende) : t.zeitraum}</strong>{t.mitarbeiter?.name ? tx.mit(t.mitarbeiter.name) : ""}.</p>
        <p className="mt-3 flex gap-2 text-[15px] text-ink-600"><Mail aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> {tx.bestaetigung(k.email)}</p>
        {ergebnis.verwaltenToken && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={`/termin/verwalten?token=${ergebnis.verwaltenToken}`} prefetch={false} variant="secondary">{tx.verschieben}</Button>
            <Button href="/registrieren" variant="ghost">{tx.konto}</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={buchen} className="space-y-8">
      <div>
        <h2 className="ov-h3 text-ink-900">{tx.schritt1}</h2>
        <div className="mt-4"><ArtWahl arten={arten} art={art} setArt={(x) => { setArt(x); setSlot(null); }} /></div>
      </div>
      <div>
        <h2 className="ov-h3 text-ink-900">{tx.schritt2}</h2>
        <p className="mt-1 text-[14.5px] text-ink-600">{tx.dauer(a.dauer)}</p>
        <div className="mt-4"><SlotAuswahl art={art} gewaehlt={slot} onWahl={setSlot} /></div>
      </div>
      <fieldset disabled={!slot} className={cn("space-y-4 transition-opacity", !slot && "opacity-50")}>
        <legend className="ov-h3 text-ink-900">{tx.schritt3}</legend>
        {slot && <ErfolgBox><CalendarCheck2 aria-hidden="true" className="mr-1.5 inline h-4 w-4" />{a.label}: {en ? zeitraumTextEn(slot.start, slot.ende) : zeitraumText(slot.start, slot.ende)}</ErfolgBox>}
        <div className="grid gap-4 md:grid-cols-2">
          <Feld id="to-name" label={tx.name} pflicht><input id="to-name" value={k.name} onChange={setze("name")} className={eingabe} autoComplete="name" required minLength={2} maxLength={120} /></Feld>
          <Feld id="to-email" label={tx.email} pflicht><input id="to-email" type="email" value={k.email} onChange={setze("email")} className={eingabe} autoComplete="email" required maxLength={160} /></Feld>
          <Feld id="to-tel" label={a.kanal === "telefon" ? tx.telRueckruf : tx.telOptional} pflicht={a.kanal === "telefon"}><input id="to-tel" type="tel" value={k.telefon} onChange={setze("telefon")} className={eingabe} autoComplete="tel" required={a.kanal === "telefon"} maxLength={40} /></Feld>
          <Feld id="to-firma" label={art === "gemeinde" ? tx.gemeinde : tx.firma}><input id="to-firma" value={k.firma} onChange={setze("firma")} className={eingabe} autoComplete="organization" maxLength={120} /></Feld>
          {vorOrt && (
            <>
              <Feld id="to-plz" label={tx.plz}><input id="to-plz" value={k.plz} onChange={setze("plz")} className={eingabe} inputMode="numeric" maxLength={10} /></Feld>
              <Feld id="to-ort" label={tx.ort}><input id="to-ort" value={k.ort} onChange={setze("ort")} className={eingabe} maxLength={80} /></Feld>
            </>
          )}
        </div>
        <Feld id="to-notiz" label={tx.nachricht}><textarea id="to-notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} className={textbereich} maxLength={1000} /></Feld>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={honig} onChange={(e) => setHonig(e.target.value)} /></label>
        </div>
        <label className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
          <input type="checkbox" checked={einwilligung} onChange={(e) => setEinwilligung(e.target.checked)} required className="mt-1 h-4 w-4 shrink-0 accent-ov-600" />
          <span>{tx.einwilligung}<Link href="/datenschutz" className="font-semibold text-ov-700 underline-offset-2 hover:underline">{tx.datenschutz}</Link>.</span>
        </label>
        <FehlerBox>{fehler}</FehlerBox>
        <Button type="submit" size="lg" disabled={laeuft || !slot} icon={CalendarCheck2}>{laeuft ? tx.bucht : tx.buchen}</Button>
      </fieldset>
      {!slot && <FehlerBox>{fehler}</FehlerBox>}
    </form>
  );
}

"use client";

// Termin im Portal buchen (angemeldetes Konto): Terminart → Zeitfenster → Notiz → Buchung mit ICS-Bestätigung per E-Mail.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck2, MapPin, Phone, Video } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, Feld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TERMIN_ARTEN, zeitraumText } from "@/lib/plattform/termine";
import SlotAuswahl from "./SlotAuswahl";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { terminArt } from "@/lib/sprache/termine";

export const KANAL_ICON = { vor_ort: MapPin, telefon: Phone, video: Video };

export function ArtWahl({ arten, art, setArt, dunkel = false }) {
  const sprache = useSprache();
  return (
    <div role="radiogroup" aria-label={sprache === "en" ? "Appointment type" : "Terminart"} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {arten.map((id) => {
        const a = terminArt(TERMIN_ARTEN[id], id, sprache);
        const Icon = KANAL_ICON[a.kanal];
        const aktiv = art === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={aktiv}
            onClick={() => setArt(id)}
            className={cn(
              "flex min-w-0 items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
              aktiv ? "bg-ov-50 ring-ov-500" : dunkel ? "bg-white/5 ring-white/15 hover:bg-white/10" : "bg-white ring-ink-200 hover:ring-ink-300"
            )}
          >
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", aktiv ? "bg-ov-600 text-white" : "bg-ov-50 text-ov-700")}>
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[14.5px] font-semibold", aktiv || !dunkel ? "text-ink-900" : "text-white")}>{a.label}</span>
              <span className={cn("block text-[12.5px] leading-snug", aktiv || !dunkel ? "text-ink-500" : "text-white/60")}>{a.dauer} {sprache === "en" ? "minutes" : "Minuten"} · {a.text}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function TerminBuchen({ arten, startArt }) {
  const router = useRouter();
  const [art, setArt] = useState(startArt && arten.includes(startArt) ? startArt : arten[0]);
  const [slot, setSlot] = useState(null);
  const [notiz, setNotiz] = useState("");
  const [telefon, setTelefon] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState(null);

  async function buchen(e) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/termine", { body: { art, start: slot.start, notiz, telefon } });
      setErfolg(r.termin);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
      if (/nicht \(mehr\) frei/.test(err.message)) setSlot(null);
    } finally {
      setLaeuft(false);
    }
  }

  if (erfolg) {
    return (
      <div className="space-y-4">
        <ErfolgBox>
          {erfolg.artLabel} gebucht: {erfolg.zeitraum}. Die Bestätigung mit Kalenderdatei (ICS) ist unterwegs.
        </ErfolgBox>
        <Button type="button" size="sm" variant="secondary" onClick={() => { setErfolg(null); setSlot(null); }}>Weiteren Termin buchen</Button>
      </div>
    );
  }

  return (
    <form onSubmit={buchen} className="space-y-5">
      <ArtWahl arten={arten} art={art} setArt={(a) => { setArt(a); setSlot(null); }} />
      <SlotAuswahl art={art} gewaehlt={slot} onWahl={setSlot} />
      {slot && (
        <div className="space-y-4 rounded-2xl bg-sand-100 p-4">
          <p className="text-[14.5px] font-semibold text-ink-900">
            <CalendarCheck2 aria-hidden="true" className="mr-1.5 inline h-4 w-4 text-ov-700" />
            {TERMIN_ARTEN[art].label}: {zeitraumText(slot.start, slot.ende)}
          </p>
          {TERMIN_ARTEN[art].kanal === "telefon" && (
            <Feld id="tb-tel" label="Telefonnummer für den Rückruf">
              <input id="tb-tel" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={eingabe} autoComplete="tel" maxLength={40} />
            </Feld>
          )}
          <Feld id="tb-notiz" label="Worum geht es? (optional)">
            <textarea id="tb-notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} className={textbereich} maxLength={1000} />
          </Feld>
          <FehlerBox>{fehler}</FehlerBox>
          <Button type="submit" disabled={laeuft} icon={CalendarCheck2}>{laeuft ? "Wird gebucht …" : "Termin verbindlich buchen"}</Button>
        </div>
      )}
      {!slot && <FehlerBox>{fehler}</FehlerBox>}
    </form>
  );
}

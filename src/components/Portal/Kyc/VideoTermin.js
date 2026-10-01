"use client";

// Videoidentifizierung durch die Compliance (Weg „video_intern“) im Verifizierungs-Assistenten: Termin buchen
// (vorhandene Terminbuchung, Terminart „identifizierung“), Stand, Link zum Videogespräch, Datenschutzhinweis.

import { useEffect, useState } from "react";
import { CalendarCheck2, ExternalLink, ShieldCheck, Video } from "lucide-react";
import Button from "@/components/ui/Button";
import { Hinweis } from "@/components/Portal/ui";
import SlotAuswahl from "@/components/Portal/Termine/SlotAuswahl";
import { senden } from "@/lib/plattform/client";
import { zeitraumText } from "@/lib/plattform/termine";
import { bestaetigen } from "@/components/ui/Rueckfrage";

const STATUS_TEXT = {
  offen: "Noch kein Termin gebucht.",
  gebucht: "Termin gebucht.",
  laufend: "Das Gespräch läuft gerade.",
  abgeschlossen: "Das Videogespräch hat stattgefunden. Das Ergebnis fließt in die Prüfung Ihrer Verifizierung ein.",
  abgebrochen: "Das letzte Gespräch konnte nicht abgeschlossen werden – bitte buchen Sie einen neuen Termin.",
};

export default function VideoTermin({ onGeaendert }) {
  const [daten, setDaten] = useState(null);
  const [slot, setSlot] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function laden() {
    try {
      setDaten(await senden("/api/portal/kyc/video", { method: "GET" }));
    } catch (e) {
      setFehler(e.message);
    }
  }
  useEffect(() => {
    laden();
  }, []);

  async function aktion(body) {
    setFehler("");
    setLaeuft(true);
    try {
      setDaten(await senden("/api/portal/kyc/video", { body }));
      setSlot(null);
      await onGeaendert?.();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  const v = daten?.video;
  return (
    <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200">
      <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900">
        <Video aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-navy-700" /> Videogespräch mit unserer Compliance
      </p>
      <p className="mt-1 text-[13px] leading-snug text-ink-600">Etwa 30 Minuten. Halten Sie Ihren Ausweis bereit – wir bitten Sie, ihn vor die Kamera zu halten, zu kippen und die Dokumentnummer vorzulesen. Während des Gesprächs erhalten Sie einen Einmalcode per E-Mail.</p>
      {!daten && !fehler && <p className="mt-3 text-[13px] text-ink-500">Wird geladen …</p>}
      {v && <p className="mt-3 text-[13.5px] text-ink-800" role="status">{STATUS_TEXT[v.status] || v.status}</p>}
      {v?.termin && (
        <div className="mt-3 rounded-2xl bg-ov-50 p-3 ring-1 ring-inset ring-ov-200">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ov-900"><CalendarCheck2 aria-hidden="true" className="h-4 w-4" />{v.termin.zeitraum || zeitraumText(v.termin.start, v.termin.ende)}</p>
          {daten.videoLink ? (
            <a href={daten.videoLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-800 underline underline-offset-2">
              Zum Videogespräch <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="mt-1 text-[13px] text-ink-700">Den Link zum Gespräch erhalten Sie rechtzeitig vor dem Termin im Portal.</p>
          )}
          <div className="mt-3">
            <Button size="sm" variant="secondary" disabled={laeuft} onClick={async () => (await bestaetigen({ titel: "Videotermin absagen?", text: "Der Termin wird freigegeben, Sie können danach einen neuen buchen.", bestaetigenText: "Termin absagen", gefahr: true })) && aktion({ aktion: "stornieren" })}>Termin absagen</Button>
          </div>
        </div>
      )}
      {daten?.buchbar && (
        <div className="mt-3 space-y-3">
          <SlotAuswahl art="identifizierung" gewaehlt={slot} onWahl={setSlot} />
          {slot && (
            <Button size="sm" icon={CalendarCheck2} disabled={laeuft} onClick={() => aktion({ aktion: "buchen", start: slot.start })}>
              {laeuft ? "Wird gebucht …" : `Termin buchen: ${zeitraumText(slot.start, slot.ende)}`}
            </Button>
          )}
        </div>
      )}
      {fehler && <p role="alert" className="mt-2 text-[13px] font-medium text-red-700">{fehler}</p>}
      {daten?.datenschutz && (
        <Hinweis ton="neutral" icon={ShieldCheck} className="mt-3 text-[13px]">{daten.datenschutz}</Hinweis>
      )}
    </div>
  );
}

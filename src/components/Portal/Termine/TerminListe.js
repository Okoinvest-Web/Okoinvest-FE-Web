"use client";

// Eigene Termine: Kalenderdatei, Umbuchen (freies Zeitfenster wählen), Absagen. Auch für die Verwaltung per E-Mail-Link
// (Prop `token`: Aufrufe über /api/portal/termine/oeffentlich/verwalten statt der Portal-API).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarX2, Download, MapPin, Phone, UserRound, Video } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/Portal/ui";
import { FehlerBox } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TERMIN_STATUS, zeitraumText } from "@/lib/plattform/termine";
import SlotAuswahl from "./SlotAuswahl";

const KANAL = { vor_ort: MapPin, telefon: Phone, video: Video };

export function TerminKarte({ t: start, token = null, onGeaendert }) {
  const router = useRouter();
  const [t, setT] = useState(start);
  const [modus, setModus] = useState(null); // umbuchen | stornieren
  const [slot, setSlot] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const Icon = KANAL[t.kanal] || CalendarClock;
  const aktiv = ["gebucht", "bestaetigt"].includes(t.status);

  async function aendern(body) {
    setLaeuft(true);
    setFehler("");
    try {
      const r = token
        ? await senden("/api/portal/termine/oeffentlich/verwalten", { body: { token, ...body } })
        : await senden(`/api/portal/termine/${t.id}`, { method: "PATCH", body });
      setT(r.termin);
      setModus(null);
      setSlot(null);
      onGeaendert?.(r.termin);
      if (!token) router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <article className="min-w-0 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-bold text-ink-900">{t.artLabel}</h3>
            <p className="text-[14.5px] text-ink-700">{t.zeitraum || zeitraumText(t.start, t.ende)}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-500">
              {t.mitarbeiter?.name && <span className="inline-flex items-center gap-1"><UserRound aria-hidden="true" className="h-3.5 w-3.5" /> {t.mitarbeiter.name}{t.vertretungFuer ? ` (Vertretung für ${t.vertretungFuer.name})` : ""}</span>}
              <span>{t.kanalLabel}{t.ort ? ` · ${t.ort}` : ""}</span>
            </p>
          </div>
        </div>
        <Badge ton={TERMIN_STATUS[t.status]?.ton || "neutral"}>{t.statusLabel}</Badge>
      </div>
      {t.notiz && <p className="mt-3 whitespace-pre-line text-[14px] text-ink-600">{t.notiz}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {!token && <Button href={`/api/portal/termine/${t.id}/ics`} prefetch={false} size="sm" variant="secondary" icon={Download}>Kalenderdatei</Button>}
        {t.darfUmbuchen && aktiv && (
          <>
            <Button type="button" size="sm" variant="secondary" icon={CalendarClock} onClick={() => setModus(modus === "umbuchen" ? null : "umbuchen")}>Umbuchen</Button>
            <Button type="button" size="sm" variant="ghost" icon={CalendarX2} onClick={() => setModus(modus === "stornieren" ? null : "stornieren")}>Absagen</Button>
          </>
        )}
      </div>
      {modus === "umbuchen" && (
        <div className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          <SlotAuswahl art={t.art} gewaehlt={slot} onWahl={setSlot} />
          <Button type="button" size="sm" disabled={!slot || laeuft} onClick={() => aendern({ aktion: "umbuchen", start: slot.start })}>
            {slot ? `Auf ${zeitraumText(slot.start, slot.ende)} verschieben` : "Neuen Zeitpunkt wählen"}
          </Button>
        </div>
      )}
      {modus === "stornieren" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
          <p className="text-[14px] text-ink-700">Termin wirklich absagen?</p>
          <Button type="button" size="sm" variant="navy" disabled={laeuft} onClick={() => aendern({ aktion: "stornieren" })}>Ja, absagen</Button>
        </div>
      )}
      <div className="mt-3"><FehlerBox>{fehler}</FehlerBox></div>
    </article>
  );
}

export default function TerminListe({ termine = [], leer }) {
  if (!termine.length) return leer || null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {termine.map((t) => <TerminKarte key={`${t.id}-${t.sequenz}-${t.status}`} t={t} />)}
    </div>
  );
}

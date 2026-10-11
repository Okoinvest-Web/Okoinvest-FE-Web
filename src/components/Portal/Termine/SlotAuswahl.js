"use client";

// Auswahl freier Zeitfenster (Woche für Woche). Lädt /api/portal/termine/slots – öffentlich für öffentliche Terminarten.
// Zeiten in Europe/Vienna. Tastatur: Pfeile/Tab über die Zeit-Buttons, Auswahl mit Enter/Leertaste.

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { TZ, heuteTag, tagPlus } from "@/lib/plattform/termine";
import { useSprache } from "@/components/Sprache/SpracheKontext";

const LOCALE = { de: "de-DE", en: "en-GB" };
const tagTextIn = (tag, l = "de") => new Date(`${tag}T12:00:00Z`).toLocaleDateString(LOCALE[l] || LOCALE.de, { weekday: "short", day: "2-digit", month: l === "en" ? "short" : "2-digit", timeZone: "UTC" });
const zeitIn = (iso, l = "de") => new Date(iso).toLocaleTimeString(LOCALE[l] || LOCALE.de, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const tagVon = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });

export default function SlotAuswahl({ art, gewaehlt, onWahl, mitarbeiterId = "", tage = 7, dunkel = false }) {
  const sprache = useSprache();
  const en = sprache === "en";
  const tagText = (tag) => tagTextIn(tag, sprache);
  const zeit = (iso) => zeitIn(iso, sprache);
  const [von, setVon] = useState(() => heuteTag());
  const [daten, setDaten] = useState({ slots: [], laden: true, fehler: "" });

  useEffect(() => {
    let aktiv = true;
    setDaten((d) => ({ ...d, laden: true, fehler: "" }));
    const bis = tagPlus(von, tage - 1);
    fetch(`/api/portal/termine/slots?art=${encodeURIComponent(art)}&von=${von}&bis=${bis}${mitarbeiterId ? `&mitarbeiter=${mitarbeiterId}` : ""}`, { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => aktiv && setDaten({ slots: ok ? j.slots || [] : [], laden: false, fehler: ok ? "" : j.error || (en ? "Appointments could not be loaded." : "Termine konnten nicht geladen werden.") }))
      .catch(() => aktiv && setDaten({ slots: [], laden: false, fehler: en ? "No connection." : "Keine Verbindung." }));
    return () => {
      aktiv = false;
    };
  }, [art, von, tage, mitarbeiterId, en]);

  const jeTag = useMemo(() => {
    const m = new Map();
    for (let i = 0; i < tage; i++) m.set(tagPlus(von, i), []);
    for (const s of daten.slots) m.get(tagVon(s.start))?.push(s);
    return [...m.entries()];
  }, [daten.slots, von, tage]);

  const heute = heuteTag();
  const maxVon = tagPlus(heute, 42 - tage);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => setVon((v) => (tagPlus(v, -tage) < heute ? heute : tagPlus(v, -tage)))} disabled={von <= heute} className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset disabled:opacity-30", dunkel ? "text-white ring-white/30 hover:bg-white/10" : "text-ink-700 ring-ink-200 hover:bg-ink-50")} aria-label={en ? "Earlier appointments" : "Frühere Termine"}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className={cn("text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-900")} aria-live="polite">
          {tagText(von)} – {tagText(tagPlus(von, tage - 1))}
        </p>
        <button type="button" onClick={() => setVon((v) => (tagPlus(v, tage) > maxVon ? maxVon : tagPlus(v, tage)))} disabled={von >= maxVon} className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset disabled:opacity-30", dunkel ? "text-white ring-white/30 hover:bg-white/10" : "text-ink-700 ring-ink-200 hover:bg-ink-50")} aria-label={en ? "Later appointments" : "Spätere Termine"}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {daten.fehler && <p role="alert" className="mb-3 rounded-xl bg-danger-50 px-4 py-3 text-[14px] text-danger-800 ring-1 ring-danger-200">{daten.fehler}</p>}
      {/* Laden: nicht per Deckkraft dimmen – das drückte die Tagesbeschriftungen unter 4,5:1 Kontrast
          (axe-portal, WCAG 1.4.3). Spinner + aria-busy zeigen den Zustand, Klicks sind gesperrt. */}
      <div className={cn("relative grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7", daten.laden && "pointer-events-none select-none")} aria-busy={daten.laden}>
        {daten.laden && <Loader2 aria-hidden="true" className="absolute left-1/2 top-6 h-6 w-6 -translate-x-1/2 animate-spin text-ov-600" />}
        {jeTag.map(([tag, liste]) => (
          <div key={tag} className={cn("min-w-0 rounded-2xl p-2.5 ring-1 ring-inset", dunkel ? "bg-white/5 ring-white/10" : "bg-ink-50/60 ring-ink-100")}>
            <p className={cn("mb-2 text-center text-[12.5px] font-semibold", dunkel ? "text-white/80" : "text-ink-600")}>{tagText(tag)}</p>
            {liste.length ? (
              <ul className="flex flex-col gap-1.5" aria-label={en ? `Free times on ${tagText(tag)}` : `Freie Zeiten am ${tagText(tag)}`}>
                {liste.map((s) => {
                  const aktiv = gewaehlt?.start === s.start;
                  return (
                    <li key={s.start}>
                      <button
                        type="button"
                        onClick={() => onWahl?.(s)}
                        aria-pressed={aktiv}
                        className={cn(
                          "ov-num w-full rounded-full px-2 py-1.5 text-[13.5px] font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                          aktiv ? "bg-ov-600 text-white ring-ov-600" : dunkel ? "bg-white/10 text-white ring-white/20 hover:bg-white/20" : "bg-white text-ink-800 ring-ink-200 hover:ring-ov-400"
                        )}
                      >
                        {zeit(s.start)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={cn("py-2 text-center text-[12.5px]", dunkel ? "text-white/40" : "text-ink-400")}>–</p>
            )}
          </div>
        ))}
      </div>
      {!daten.laden && !daten.slots.length && !daten.fehler && <p className={cn("mt-3 text-[13.5px]", dunkel ? "text-white/70" : "text-ink-500")}>{en ? "Nothing is free this week – please browse on." : "In dieser Woche ist nichts mehr frei – bitte blättern Sie weiter."}</p>}
    </div>
  );
}

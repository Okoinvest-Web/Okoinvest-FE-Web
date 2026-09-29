"use client";

// Nachrichtenverlauf zu einem Objekt (Vorgang, Fläche, Projekt, Interesse, Allgemein)
// mit Antwortfeld. Systemmeldungen (Statuswechsel, Uploads) erscheinen zentriert.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Info } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { datumZeit } from "@/lib/plattform/format";
import { textbereich, FehlerBox } from "./felder";

export default function NachrichtenThread({ bezugArt, bezugId, nachrichten = [], leerText = "Noch keine Nachrichten. Schreiben Sie uns – wir antworten in der Regel innerhalb von zwei Werktagen.", platzhalter = "Ihre Nachricht …", hoehe = "max-h-[520px]" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const listeRef = useRef(null);

  useEffect(() => {
    const el = listeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [nachrichten.length]);

  async function absenden(e) {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/portal/nachrichten", { body: { bezugArt, bezugId, text } });
      setText("");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div ref={listeRef} className={cn("min-w-0 space-y-3 overflow-y-auto pr-1", hoehe)} aria-live="polite">
        {nachrichten.length === 0 && <p className="py-6 text-center text-[14px] text-ink-500">{leerText}</p>}
        {nachrichten.map((m) =>
          m.system ? (
            <div key={m.id} className="flex justify-center">
              <p className="inline-flex max-w-[92%] items-start gap-2 rounded-2xl bg-ink-50 px-3.5 py-2 text-[13px] leading-relaxed text-ink-600 ring-1 ring-inset ring-ink-100">
                <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="min-w-0 whitespace-pre-line break-words">
                  {m.text}
                  <span className="ml-1.5 whitespace-nowrap text-[11.5px] text-ink-400">{datumZeit(m.am)}</span>
                </span>
              </p>
            </div>
          ) : (
            <div key={m.id} className={cn("flex", m.eigene ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", m.eigene ? "rounded-br-md bg-navy-700 text-white" : "rounded-bl-md bg-white text-ink-800 ring-1 ring-ink-200")}>
                <p className={cn("text-[12px] font-semibold", m.eigene ? "text-white/70" : m.vonAdmin ? "text-ov-700" : "text-ink-500")}>
                  {m.eigene ? "Sie" : m.vonName}
                  {m.neu && !m.eigene && <span className="ml-2 rounded-full bg-ov-500 px-1.5 py-px text-[10.5px] font-bold uppercase text-white">neu</span>}
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-[14.5px] leading-relaxed">{m.text}</p>
                <p className={cn("mt-1.5 text-[11.5px]", m.eigene ? "text-white/55" : "text-ink-400")}>{datumZeit(m.am)}</p>
              </div>
            </div>
          )
        )}
      </div>
      <form onSubmit={absenden} className="space-y-2">
        <label htmlFor={`antwort-${bezugArt}-${bezugId}`} className="sr-only">Nachricht</label>
        <textarea
          id={`antwort-${bezugArt}-${bezugId}`}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) absenden(e);
          }}
          placeholder={platzhalter}
          maxLength={5000}
          className={textbereich}
        />
        <FehlerBox>{fehler}</FehlerBox>
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[12px] text-ink-400 sm:block">Strg + Enter zum Senden</p>
          <button
            type="submit"
            disabled={laeuft || text.trim().length < 2}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-ov-700 disabled:opacity-50"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {laeuft ? "Wird gesendet …" : "Senden"}
          </button>
        </div>
      </form>
    </div>
  );
}

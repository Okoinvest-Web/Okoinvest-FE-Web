"use client";

// „Frag das Projekt“ – Fragen zu genau einem Projekt, beantwortet ausschließlich aus den für diesen
// Investor freigegebenen Projektdaten und Dokument-Metadaten (Rechteprüfung serverseitig), mit Quellen.

import { useId, useMemo, useState } from "react";
import { MessageCircleQuestion, Square } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { textbereich } from "@/components/Portal/felder";
import { KiDatenschutz, KiFehler, KiKennzeichnung, KiKnopf, KiLaedt, KiQuellen, KiText } from "./KiBausteine";
import { useKi, useKiStatus } from "./useKi";

const BEISPIELE = ["Wie ist der Stand beim Netzanschluss?", "Welche Unterlagen liegen im Datenraum?", "Ist die Fläche vertraglich gesichert?", "Welcher spezifische Ertrag wird erwartet?"];

export default function KiFrage({ projektId, nachrichtenAnker = "#projekt-nachrichten", className }) {
  const id = useId();
  const [frage, setFrage] = useState("");
  const [gestellt, setGestellt] = useState("");
  const status = useKiStatus();
  const ki = useKi("frage");

  const zitierte = useMemo(() => {
    const s = new Set();
    for (const m of String(ki.text || "").matchAll(/\[(Q\d{1,3})\]/g)) s.add(m[1]);
    return s;
  }, [ki.text]);

  function fragen(e, text = frage) {
    e?.preventDefault();
    const f = text.trim();
    if (f.length < 3 || ki.laeuft) return;
    setGestellt(f);
    setFrage("");
    ki.starten({ projektId, frage: f, stream: true });
  }

  return (
    <section className={cn("min-w-0 rounded-3xl bg-white ring-1 ring-ink-200/70", className)} aria-labelledby={`${id}-t`}>
      <div className="border-b border-ink-100 px-5 py-4 md:px-6">
        <h2 id={`${id}-t`} className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
          <MessageCircleQuestion aria-hidden="true" className="h-5 w-5 text-ov-600" /> Frag das Projekt
        </h2>
        <p className="mt-0.5 text-[13.5px] text-ink-500">Antworten nur aus den freigegebenen Angaben und der Dokumentenliste – mit Quellen.</p>
      </div>
      <div className="space-y-4 p-5 md:p-6">
        {gestellt && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-navy-700 px-4 py-2.5 text-[14px] leading-relaxed text-white">{gestellt}</p>
          </div>
        )}
        {ki.laeuft && !ki.text && <KiLaedt text="Antwort wird aus den Projektdaten erstellt …" />}
        <KiFehler>{ki.fehler}</KiFehler>
        {ki.text && (
          <div className="space-y-3">
            <KiKennzeichnung modus={ki.modus} hinweis={ki.hinweis} />
            <KiText text={ki.text} laeuft={ki.laeuft} />
            {!ki.laeuft && <KiQuellen quellen={ki.quellen} zitierte={zitierte.size ? zitierte : null} titel="Quellen aus diesem Projekt" />}
            {!ki.laeuft && (
              <p className="text-[13px] leading-relaxed text-ink-600">
                Verbindlich klären Sie Fragen über die{" "}
                <a href={nachrichtenAnker} className="font-semibold text-ov-700 underline underline-offset-2 hover:text-ov-800">
                  Nachrichten zu diesem Projekt
                </a>{" "}
                – das Backoffice stimmt sich mit dem Anbieter ab.
              </p>
            )}
          </div>
        )}
        {!gestellt && (
          <div className="flex flex-wrap gap-2">
            {BEISPIELE.map((b) => (
              <button key={b} type="button" onClick={() => fragen(null, b)} className="rounded-full bg-sand-50 px-3 py-1.5 text-left text-[13px] font-medium text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ov-50 hover:ring-ov-200">
                {b}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={fragen} className="space-y-2">
          <label htmlFor={`${id}-f`} className="sr-only">Ihre Frage zum Projekt</label>
          <textarea
            id={`${id}-f`}
            rows={2}
            maxLength={800}
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) fragen(e);
            }}
            placeholder="Ihre Frage zum Projekt …"
            className={cn(textbereich, "min-h-[76px]")}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-ink-400">Enter zum Senden · Umschalt + Enter für neue Zeile</p>
            {ki.laeuft ? (
              <KiKnopf onClick={ki.abbrechen} icon={Square}>Stopp</KiKnopf>
            ) : (
              <KiKnopf type="submit" variante="gruen" disabled={frage.trim().length < 3}>Fragen</KiKnopf>
            )}
          </div>
        </form>
        <KiDatenschutz aktiv={status?.aktiv} />
      </div>
    </section>
  );
}

"use client";

// Nachrichtenverlauf zu einem Objekt (Vorgang, Fläche, Projekt, Interesse, Allgemein)
// mit Antwortfeld. Systemmeldungen (Statuswechsel, Uploads) erscheinen zentriert.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Info, Paperclip, X, FileText, Check, CheckCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { hochladen, senden } from "@/lib/plattform/client";
import { datumZeit, dateigroesse } from "@/lib/plattform/format";
import { UPLOAD } from "@/lib/plattform/konstanten";
import { textbereich, FehlerBox } from "./felder";
import KiNachrichtEntwurf from "./Ki/KiNachrichtEntwurf";
import { KiKennzeichnung } from "./Ki/KiBausteine";

export default function NachrichtenThread({ bezugArt, bezugId, nachrichten = [], leerText = "Noch keine Nachrichten. Schreiben Sie uns – wir antworten in der Regel innerhalb von zwei Werktagen.", platzhalter = "Ihre Nachricht …", hoehe = "max-h-[520px]" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [kiMarke, setKiMarke] = useState(null); // Kennzeichnung eines Assistenten-Entwurfs im Antwortfeld
  const [dateien, setDateien] = useState([]); // Querschnitt: Anhänge (PDF/JPG/PNG, je ≤ 10 MB, höchstens 5)
  const listeRef = useRef(null);
  const dateiRef = useRef(null);

  function dateienWaehlen(liste) {
    setFehler("");
    const neu = [...dateien];
    for (const f of Array.from(liste || [])) {
      if (!UPLOAD.typen[f.type]) return setFehler(`„${f.name}“: erlaubt sind PDF, JPG und PNG.`);
      if (f.size > UPLOAD.maxBytes) return setFehler(`„${f.name}“ ist größer als 10 MB.`);
      if (neu.length < 5) neu.push(f);
    }
    setDateien(neu);
    if (dateiRef.current) dateiRef.current.value = "";
  }

  useEffect(() => {
    const el = listeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [nachrichten.length]);

  async function absenden(e) {
    e.preventDefault();
    if (text.trim().length < 2 && !dateien.length) return;
    setLaeuft(true);
    setFehler("");
    try {
      const anhaenge = [];
      for (const f of dateien) anhaenge.push((await hochladen(f, { bezugArt, bezugId, kategorie: "allgemein", anhang: true })).id);
      await senden("/api/portal/nachrichten", { body: { bezugArt, bezugId, text, anhaenge } });
      setText("");
      setDateien([]);
      setKiMarke(null);
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
                {m.anhaenge?.length > 0 && (
                  <ul className="mt-2 space-y-1" aria-label="Anhänge">
                    {m.anhaenge.map((a) => (
                      <li key={a.id}>
                        <a href={`/api/portal/dokumente/${a.id}?anzeigen=1`} target="_blank" rel="noopener" className={cn("inline-flex max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold", m.eigene ? "bg-white/10 text-white hover:bg-white/15" : "bg-sand-50 text-ink-800 ring-1 ring-inset ring-ink-200 hover:text-ov-700")}>
                          <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{a.name}</span>
                          <span className={cn("shrink-0 font-normal", m.eigene ? "text-white/60" : "text-ink-500")}>{dateigroesse(a.groesse)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={cn("mt-1.5 flex items-center gap-1.5 text-[11.5px]", m.eigene ? "text-white/55" : "text-ink-400")}>
                  {datumZeit(m.am)}
                  {m.eigene && typeof m.gelesen === "boolean" && (
                    <span className="inline-flex items-center gap-0.5" title={m.gelesen ? "Vom Gegenüber gelesen" : "Zugestellt, noch nicht gelesen"}>
                      {m.gelesen ? <CheckCheck aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" /> : <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                      <span className="sr-only">{m.gelesen ? "gelesen" : "zugestellt"}</span>
                      <span aria-hidden="true">{m.gelesen ? "gelesen" : "zugestellt"}</span>
                    </span>
                  )}
                </p>
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
        {dateien.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Ausgewählte Anhänge">
            {dateien.map((f, i) => (
              <li key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sand-50 py-1 pl-3 pr-1 text-[12.5px] text-ink-700 ring-1 ring-inset ring-ink-200">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => setDateien(dateien.filter((_, j) => j !== i))} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-ink-100" aria-label={`Anhang ${f.name} entfernen`}>
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <FehlerBox>{fehler || kiMarke?.fehler}</FehlerBox>
        {kiMarke?.modus && text.trim() && <KiKennzeichnung modus={kiMarke.modus} hinweis={kiMarke.hinweis} />}
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[12px] text-ink-400 sm:block">Strg + Enter zum Senden</p>
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500" title="PDF, JPG oder PNG, je höchstens 10 MB">
            <Paperclip aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Anhang</span>
            <span className="sr-only sm:hidden">Anhang hinzufügen</span>
            <input ref={dateiRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" disabled={laeuft || dateien.length >= 5} onChange={(e) => dateienWaehlen(e.target.files)} />
          </label>
          <KiNachrichtEntwurf bezugArt={bezugArt} bezugId={bezugId} text={text} setText={setText} onKennzeichnung={setKiMarke} />
          <button
            type="submit"
            disabled={laeuft || (text.trim().length < 2 && !dateien.length)}
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

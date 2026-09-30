"use client";

// Flächen-Assistent (Eigentümer/Landwirt): erklärt Status und nächste Schritte der eigenen Fläche in
// einfacher Sprache und beantwortet Fragen zu Pacht und Agri-PV anhand der Ratgeber- und Lexikon-Inhalte.

import { useId, useState } from "react";
import { Square, Sprout } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { eingabe } from "@/components/Portal/felder";
import { KiDatenschutz, KiFehler, KiKennzeichnung, KiKnopf, KiLaedt, KiQuellen, KiText } from "./KiBausteine";
import { useKi, useKiStatus } from "./useKi";

export default function KiFlaeche({ flaecheId, agri = false, className }) {
  const id = useId();
  const [frage, setFrage] = useState("");
  const [gestellt, setGestellt] = useState(null);
  const status = useKiStatus();
  const ki = useKi("flaeche");
  const beispiele = agri
    ? ["Bleibt meine Fläche GAP-förderfähig?", "Was bedeutet DIN SPEC 91434?", "Welche Modelle gibt es für Landwirte?"]
    : ["Wie hoch ist eine übliche Pacht pro Hektar?", "Was steht in einem Pachtvertrag?", "Was passiert mit der Erbschaftsteuer?"];

  function starten(f) {
    if (ki.laeuft) return;
    const t = (f ?? "").trim();
    setGestellt(t);
    setFrage("");
    ki.starten({ flaecheId, frage: t, stream: true });
  }

  return (
    <section className={cn("min-w-0 rounded-3xl bg-white ring-1 ring-ink-200/70", className)} aria-labelledby={`${id}-t`}>
      <div className="border-b border-ink-100 px-5 py-4 md:px-6">
        <h2 id={`${id}-t`} className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
          <Sprout aria-hidden="true" className="h-5 w-5 text-ov-600" /> Flächen-Assistent
        </h2>
        <p className="mt-0.5 text-[13.5px] text-ink-500">Stand Ihrer Fläche einfach erklärt – und Antworten zu Pacht{agri ? " und Agri-PV" : ""}.</p>
      </div>
      <div className="space-y-4 p-5 md:p-6">
        {gestellt === null && (
          <KiKnopf variante="gruen" onClick={() => starten("")} className="w-full sm:w-auto">
            Status & nächste Schritte erklären
          </KiKnopf>
        )}
        {gestellt && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-navy-700 px-4 py-2.5 text-[14px] leading-relaxed text-white">{gestellt}</p>
          </div>
        )}
        {ki.laeuft && !ki.text && <KiLaedt text="Einen Moment …" />}
        <KiFehler>{ki.fehler}</KiFehler>
        {ki.text && (
          <div className="space-y-3">
            <KiKennzeichnung modus={ki.modus} hinweis={ki.hinweis} />
            <KiText text={ki.text} laeuft={ki.laeuft} />
            {!ki.laeuft && <KiQuellen quellen={ki.quellen} titel="Zum Weiterlesen" />}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {beispiele.map((b) => (
            <button key={b} type="button" onClick={() => starten(b)} disabled={ki.laeuft} className="rounded-full bg-sand-50 px-3 py-1.5 text-left text-[13px] font-medium text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ov-50 hover:ring-ov-200 disabled:opacity-50">
              {b}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (frage.trim().length >= 3) starten(frage);
          }}
          className="flex gap-2"
        >
          <label htmlFor={`${id}-f`} className="sr-only">Ihre Frage</label>
          <input id={`${id}-f`} maxLength={800} value={frage} onChange={(e) => setFrage(e.target.value)} placeholder="Eigene Frage stellen …" className={cn(eingabe, "h-11")} />
          {ki.laeuft ? (
            <KiKnopf onClick={ki.abbrechen} icon={Square} className="h-11 shrink-0">Stopp</KiKnopf>
          ) : (
            <KiKnopf type="submit" variante="gruen" className="h-11 shrink-0" disabled={frage.trim().length < 3}>
              Fragen
            </KiKnopf>
          )}
        </form>
        <p className="text-[12.5px] leading-relaxed text-ink-500">Der Assistent ersetzt keine Rechts- oder Steuerberatung. Verbindliche Auskünfte erhalten Sie per Nachricht von Ihrem Ansprechpartner.</p>
        <KiDatenschutz aktiv={status?.aktiv} />
      </div>
    </section>
  );
}

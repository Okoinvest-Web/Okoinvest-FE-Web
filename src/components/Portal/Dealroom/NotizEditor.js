"use client";

// Private Notiz und Tags je Projekt (nur für den Investor selbst sichtbar – weder Anbieter noch Backoffice).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Save, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { relativ } from "@/lib/plattform/format";
import { NOTIZ_TAGS_MAX } from "@/lib/plattform/dealroom";
import { eingabe, textbereich, FehlerBox } from "@/components/Portal/felder";

export default function NotizEditor({ projektId, notiz, vorschlaege = [], onGespeichert, kompakt = false }) {
  const router = useRouter();
  const [text, setText] = useState(notiz?.text || "");
  const [tags, setTags] = useState(notiz?.tags || []);
  const [neu, setNeu] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [gespeichert, setGespeichert] = useState(notiz?.geaendertAm || null);

  const tagDazu = (t) => {
    const s = String(t || "").trim().replace(/^#/, "").slice(0, 30);
    if (s && !tags.includes(s) && tags.length < NOTIZ_TAGS_MAX) setTags((x) => [...x, s]);
    setNeu("");
  };

  async function speichern(e) {
    e?.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/portal/pipeline", { method: "PUT", body: { projektId, text, tags } });
      setGespeichert(r.notiz.geaendertAm);
      onGespeichert?.(r.notiz);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  const frei = vorschlaege.filter((t) => !tags.includes(t)).slice(0, 6);
  return (
    <form onSubmit={speichern} className="space-y-3">
      <label htmlFor={`notiz-${projektId}`} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-700">
        <Lock aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" /> Private Notiz <span className="font-normal text-ink-500">(nur für Sie)</span>
      </label>
      <textarea id={`notiz-${projektId}`} rows={kompakt ? 3 : 4} className={textbereich} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && speichern(e)} placeholder="Einschätzung, offene Punkte, nächste Schritte …" />
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-[12.5px] font-semibold text-navy-800 ring-1 ring-inset ring-navy-100">
              #{t}
              <button type="button" onClick={() => setTags((x) => x.filter((y) => y !== t))} className="rounded-full text-navy-500 hover:text-navy-900" aria-label={`Tag ${t} entfernen`}>
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {tags.length < NOTIZ_TAGS_MAX && (
            <input
              aria-label="Tag hinzufügen"
              className={cn(eingabe, "h-8 w-36 rounded-full px-3 text-[13px]")}
              value={neu}
              onChange={(e) => setNeu(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  tagDazu(neu);
                }
              }}
              onBlur={() => neu && tagDazu(neu)}
              placeholder="+ Tag"
            />
          )}
        </div>
        {frei.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
            Vorschläge:
            {frei.map((t) => (
              <button key={t} type="button" onClick={() => tagDazu(t)} className="rounded-full px-2 py-0.5 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">#{t}</button>
            ))}
          </p>
        )}
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" icon={laeuft ? Loader2 : Save} disabled={laeuft}>Speichern</Button>
        {gespeichert && <span className="text-[12.5px] text-ink-500">gespeichert {relativ(gespeichert)}</span>}
      </div>
    </form>
  );
}

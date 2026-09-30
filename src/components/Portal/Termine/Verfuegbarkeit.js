"use client";

// Verfügbarkeiten je Mitarbeiter: buchbare Terminarten und Arbeitszeiten je Wochentag („09:00-12:00, 13:00-17:00“).
// Abwesenheiten (HR) und Feiertage sperren Tage automatisch – Pflege unter „Team & HR“.

import { useState } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Chip, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { TERMIN_ARTEN, WOCHENTAGE } from "@/lib/plattform/termine";

const alsText = (fenster = []) => fenster.map(([a, b]) => `${a}-${b}`).join(", ");
const ausText = (t) =>
  String(t || "")
    .split(/[,;]/)
    .map((x) => x.trim().match(/^(\d{1,2}):?(\d{2})\s*[-–]\s*(\d{1,2}):?(\d{2})$/))
    .filter(Boolean)
    .map((m) => [`${m[1].padStart(2, "0")}:${m[2]}`, `${m[3].padStart(2, "0")}:${m[4]}`]);

function Mitarbeiter({ m, darfBearbeiten }) {
  const [arten, setArten] = useState(m.terminarten || []);
  const [zeiten, setZeiten] = useState(() => Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((w) => [w, alsText(m.arbeitszeiten?.[w])])));
  const [aktiv, setAktiv] = useState(m.aktiv);
  const [status, setStatus] = useState("");

  async function speichern() {
    setStatus("");
    try {
      const arbeitszeiten = Object.fromEntries(Object.entries(zeiten).map(([w, t]) => [w, ausText(t)]));
      await senden("/api/admin/termine/verfuegbarkeit", { method: "PATCH", body: { kontoId: m.id, terminarten: arten, arbeitszeiten, aktiv } });
      setStatus("Gespeichert.");
    } catch (e) {
      setStatus(e.message);
    }
  }

  return (
    <details className="group rounded-2xl bg-white ring-1 ring-ink-200/70 open:ring-ov-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink-900">{m.name}</span>
          <span className="block truncate text-[12.5px] text-ink-500">{arten.length ? arten.map((a) => TERMIN_ARTEN[a]?.kurz).join(" · ") : "keine buchbaren Terminarten"}{m.abwesenheiten?.length ? ` · abwesend ab ${m.abwesenheiten[0].von.split("-").reverse().join(".")}` : ""}</span>
        </span>
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", aktiv && arten.length ? "bg-ov-500" : "bg-ink-300")} aria-label={aktiv ? "buchbar" : "nicht buchbar"} />
      </summary>
      <fieldset disabled={!darfBearbeiten} className="space-y-4 border-t border-ink-100 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TERMIN_ARTEN).map(([id, a]) => (
            <Chip key={id} checked={arten.includes(id)} onChange={() => setArten((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))}>{a.label}</Chip>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7].map((w) => (
            <label key={w} className="flex items-center gap-2 text-[13.5px] text-ink-700">
              <span className="w-7 shrink-0 font-semibold">{WOCHENTAGE[w]}</span>
              <input value={zeiten[w]} onChange={(e) => setZeiten((z) => ({ ...z, [w]: e.target.value }))} className={cn(eingabe, "h-10 text-[14px]")} placeholder="frei" aria-label={`Arbeitszeiten ${WOCHENTAGE[w]}`} />
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[14px] text-ink-700">
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} className="h-4 w-4 accent-ov-600" /> Online buchbar
        </label>
        {darfBearbeiten && <Button type="button" size="sm" icon={Save} onClick={speichern}>Speichern</Button>}
        {status && <p role="status" className="text-[13px] text-ink-600">{status}</p>}
      </fieldset>
    </details>
  );
}

export default function Verfuegbarkeit({ mitarbeiter = [], darfBearbeiten = false }) {
  return (
    <div className="space-y-2">
      {mitarbeiter.map((m) => <Mitarbeiter key={m.id} m={m} darfBearbeiten={darfBearbeiten} />)}
      <p className="pt-1 text-[12.5px] text-ink-500">Format: „09:00-12:00, 13:00-17:00“. Feiertage und Abwesenheiten sperren Tage automatisch.</p>
    </div>
  );
}

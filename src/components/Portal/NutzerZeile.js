"use client";

// Rollen und Sperre eines Kontos im Backoffice ändern

import { useState } from "react";
import { useRouter } from "next/navigation";
import { senden } from "@/lib/plattform/client";
import { ALLE_ROLLEN_IDS, rolleLabel } from "@/lib/plattform/konstanten";
import { cn } from "@/components/ui/cn";

export default function NutzerZeile({ nutzer, eigen }) {
  const router = useRouter();
  const [rollen, setRollen] = useState(nutzer.rollen);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const geaendert = [...rollen].sort().join() !== [...nutzer.rollen].sort().join();

  async function speichern(body) {
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/admin/nutzer/${nutzer.id}`, { method: "PATCH", body });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {ALLE_ROLLEN_IDS.map((r) => {
          const an = rollen.includes(r);
          return (
            <button
              key={r}
              type="button"
              aria-pressed={an}
              onClick={() => setRollen((x) => (an ? x.filter((y) => y !== r) : [...x, r]))}
              className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", an ? (r === "admin" ? "bg-navy-900 text-white ring-navy-900" : "bg-ov-600 text-white ring-ov-600") : "bg-white text-ink-500 ring-ink-200 hover:ring-ink-300")}
            >
              {rolleLabel(r)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {geaendert && (
          <button type="button" disabled={laeuft} onClick={() => speichern({ rollen })} className="h-8 rounded-full bg-ov-600 px-3 text-[12.5px] font-semibold text-white hover:bg-ov-700">
            Rollen speichern
          </button>
        )}
        {!eigen && (
          <button type="button" disabled={laeuft} onClick={() => speichern({ aktiv: !nutzer.aktiv })} className="h-8 rounded-full px-3 text-[12.5px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
            {nutzer.aktiv ? "Sperren" : "Entsperren"}
          </button>
        )}
      </div>
      {fehler && <p role="alert" className="text-[12.5px] text-red-700">{fehler}</p>}
    </div>
  );
}

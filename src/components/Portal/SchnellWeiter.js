"use client";

// Ein-Klick-Weiterschaltung im Kanban: nur Übergänge ohne Pflichtangaben.
// Alles andere (Pachtangebot, Ablehnung mit Grund) in der Detailansicht.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { erlaubteUebergaenge } from "@/lib/plattform/prozesse";
import { senden } from "@/lib/plattform/client";

export default function SchnellWeiter({ art, id, status }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const u = erlaubteUebergaenge(art, status, "admin").find((x) => !x.pflicht?.length && !["abgelehnt"].includes(x.nach));
  if (!u) return null;

  async function los() {
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/admin/status", { body: { art, id, nach: u.nach, extra: {} } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="relative z-10">
      <button type="button" onClick={los} disabled={laeuft} className="inline-flex h-8 items-center gap-1 rounded-full bg-ov-600 px-3 text-[12.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
        {laeuft ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
        {u.aktion}
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {fehler && <p role="alert" className="mt-1 text-[12px] text-danger-700">{fehler}</p>}
    </div>
  );
}

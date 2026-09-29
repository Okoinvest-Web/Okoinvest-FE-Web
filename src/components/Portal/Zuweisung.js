"use client";

// Zuständigen im Backoffice setzen (Vorgang, Fläche, Projekt)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { senden } from "@/lib/plattform/client";
import { auswahlfeld, FehlerBox } from "./felder";
import { cn } from "@/components/ui/cn";

export default function Zuweisung({ art, id, zustaendigId, konten = [] }) {
  const router = useRouter();
  const [wert, setWert] = useState(zustaendigId || "");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function aendern(neu) {
    setWert(neu);
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/admin/zuweisen", { body: { art, id, zustaendigId: neu || null } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div>
      <label htmlFor={`zust-${id}`} className="mb-1.5 block text-[13px] font-semibold text-ink-700">Zuständig</label>
      <select id={`zust-${id}`} value={wert} disabled={laeuft} onChange={(e) => aendern(e.target.value)} className={cn(auswahlfeld, "h-11")}>
        <option value="">– niemand –</option>
        {konten.map((k) => (
          <option key={k.id} value={k.id}>{[k.vorname, k.nachname].filter(Boolean).join(" ")}</option>
        ))}
      </select>
      <div className="mt-2"><FehlerBox>{fehler}</FehlerBox></div>
    </div>
  );
}

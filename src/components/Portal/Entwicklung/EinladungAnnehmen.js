"use client";

// Gutachter-Einladung annehmen (angemeldet mit der eingeladenen E-Mail-Adresse) → Projekt öffnen.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { FehlerBox } from "@/components/Portal/felder";

export default function GutachterEinladungAnnehmen({ token }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  return (
    <div className="space-y-4">
      <FehlerBox>{fehler}</FehlerBox>
      <button
        type="button"
        disabled={laeuft}
        onClick={async () => {
          setLaeuft(true);
          setFehler("");
          try {
            const r = await senden("/api/portal/entwicklung/einladung", { body: { token } });
            router.replace(`/portal/entwicklung/${r.projektId}`);
            router.refresh();
          } catch (e) {
            setFehler(e.message);
            setLaeuft(false);
          }
        }}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 disabled:opacity-60"
      >
        {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}
        Einladung annehmen
      </button>
    </div>
  );
}

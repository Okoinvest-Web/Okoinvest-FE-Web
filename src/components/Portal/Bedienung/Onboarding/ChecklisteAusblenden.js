"use client";

// „Ausblenden“ der Checkliste „Erste Schritte“ – speichert serverseitig am Konto.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { senden } from "@/lib/plattform/client";

export default function ChecklisteAusblenden() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  return (
    <button
      type="button"
      disabled={laeuft}
      onClick={async () => {
        setLaeuft(true);
        try {
          await senden("/api/portal/onboarding", { method: "PUT", body: { checklisteAus: true } });
          router.refresh();
        } catch {
          setLaeuft(false);
        }
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-50"
    >
      <X aria-hidden="true" className="h-4 w-4" /> Ausblenden
    </button>
  );
}

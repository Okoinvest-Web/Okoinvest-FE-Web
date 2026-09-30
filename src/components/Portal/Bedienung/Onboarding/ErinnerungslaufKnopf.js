"use client";

// Erinnerungslauf „offene Einstiegsschritte“ (3/7 Tage) von Hand starten – nur Leitung (Server prüft).
import { useState } from "react";
import { Send } from "lucide-react";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";

export default function ErinnerungslaufKnopf() {
  const [laeuft, setLaeuft] = useState(false);
  const [text, setText] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={laeuft} onClick={async () => {
        setLaeuft(true);
        setText("");
        try {
          const r = await senden("/api/admin/onboarding/lauf", { body: {} });
          setText(r.versendet ? `${r.versendet} Erinnerung(en) im Postausgang` : "Keine Erinnerung fällig");
        } catch (e) {
          setText(e.message);
        } finally {
          setLaeuft(false);
        }
      }}>
        <Send aria-hidden="true" className="mr-1.5 inline h-4 w-4" /> {laeuft ? "Läuft …" : "Erinnerungen senden"}
      </Button>
      {text && <span role="status" className="text-[13px] text-ink-600">{text}</span>}
    </span>
  );
}

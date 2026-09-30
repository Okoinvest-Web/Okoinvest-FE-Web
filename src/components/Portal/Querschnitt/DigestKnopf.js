"use client";

// Tages-Digest manuell auslösen (nur Leitung). Im Betrieb versendet ihn der Scheduler täglich (Frappe hooks.py).

import { useState } from "react";
import { Send } from "lucide-react";
import { senden } from "@/lib/plattform/client";

export default function DigestKnopf() {
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState("");
  async function los() {
    setLaeuft(true);
    setMeldung("");
    try {
      const r = await senden("/api/admin/leitung/digest", { body: { erzwingen: true } });
      setMeldung(r.mails ? `${r.mails} Digest-E-Mail(s) versendet.` : "Keine vorgemerkten Ereignisse.");
    } catch (e) {
      setMeldung(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={los} disabled={laeuft} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:opacity-50">
        <Send aria-hidden="true" className="h-3.5 w-3.5" /> {laeuft ? "Läuft …" : "Tages-Digest jetzt senden"}
      </button>
      {meldung && <span role="status" className="text-[12.5px] text-ink-600">{meldung}</span>}
    </span>
  );
}

"use client";

// Aufnahme bzw. Ablehnung eines Mitgliedsantrags durch den Vorstand (Organe-Sicht). Prüfung und Statuswechsel serverseitig.

import { useState } from "react";
import { Knopf, useAktion } from "@/components/Portal/Mitglied/teile";

export function AufnahmeKnoepfe({ mitgliedId, url }) {
  const a = useAktion(url);
  const [grund, setGrund] = useState("");
  const [ablehnen, setAblehnen] = useState(false);
  return (
    <span className="flex flex-wrap items-center gap-2">
      {!ablehnen ? (
        <>
          <Knopf variante="primary" disabled={a.laeuft} onClick={async () => { const r = await a.ausfuehren({ aktion: "mitglied_status", id: mitgliedId, nach: "geprueft" }, "Geprüft."); if (r) await a.ausfuehren({ aktion: "mitglied_status", id: mitgliedId, nach: "aufgenommen" }, "Aufgenommen."); }}>Aufnehmen</Knopf>
          <Knopf onClick={() => setAblehnen(true)}>Ablehnen</Knopf>
        </>
      ) : (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "mitglied_status", id: mitgliedId, nach: "abgelehnt", grund }, "Abgelehnt."); }}>
          <label className="sr-only" htmlFor={`grund-${mitgliedId}`}>Grund</label>
          <input id={`grund-${mitgliedId}`} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="Grund (Pflicht)" className="h-9 rounded-full px-3 text-[13.5px] ring-1 ring-inset ring-ink-200" />
          <Knopf variante="gefahr" type="submit" disabled={a.laeuft || !grund.trim()}>Ablehnen</Knopf>
        </form>
      )}
      {a.fehler && <span role="alert" className="w-full text-[12.5px] text-red-700">{a.fehler}</span>}
    </span>
  );
}

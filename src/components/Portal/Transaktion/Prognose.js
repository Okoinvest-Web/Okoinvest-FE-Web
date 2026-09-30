"use client";

// src/components/Portal/Transaktion/Prognose.js – Wahrscheinlichkeit/erwartetes Closing je Deal überschreiben (mit Begründung)

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { eingabe, labelKlasse, FehlerBox } from "@/components/Portal/felder";

export default function Prognose({ karte }) {
  const router = useRouter();
  const [w, setW] = useState(karte.manuell ? Math.round(karte.wahrscheinlichkeit * 100) : "");
  const [c, setC] = useState(karte.override ? karte.closingErwartet : "");
  const [notiz, setNotiz] = useState(karte.notiz || "");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  async function speichern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/admin/projekte/pipeline/${karte.projektId}`, { body: { wahrscheinlichkeit: w === "" ? null : Number(w), closingErwartet: c, notiz } });
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[12.5px] font-semibold text-ov-700">Prognose anpassen</summary>
      <form onSubmit={speichern} className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><label htmlFor={`pw-${karte.projektId}`} className={labelKlasse}>Wahrscheinl. %</label><input id={`pw-${karte.projektId}`} type="number" min="0" max="100" className={eingabe} value={w} placeholder={String(Math.round(karte.wahrscheinlichkeitStandard * 100))} onChange={(e) => setW(e.target.value)} /></div>
          <div><label htmlFor={`pc-${karte.projektId}`} className={labelKlasse}>Closing (Monat)</label><input id={`pc-${karte.projektId}`} type="month" className={eingabe} value={c} onChange={(e) => setC(e.target.value)} /></div>
        </div>
        <input aria-label="Begründung" className={eingabe} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Begründung (Pflicht bei eigener Wahrscheinlichkeit)" />
        <button type="submit" disabled={laeuft} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[13px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50">{laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}Speichern</button>
        <p className="text-[11.5px] text-ink-500">Leer lassen = Standard der Phase.</p>
        {fehler && <FehlerBox>{fehler}</FehlerBox>}
      </form>
    </details>
  );
}

"use client";

// Klick-NDA: Text lesen, Zustimmung anklicken – Version, Zeitpunkt, IP und Browser werden protokolliert.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { NDA } from "@/lib/plattform/konstanten";
import { FehlerBox } from "@/components/Portal/felder";

export default function NdaAnfrage({ projektId }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  async function anfragen() {
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/portal/boerse/${projektId}/nda`, { body: { akzeptiert: ok } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-64 overflow-y-auto rounded-2xl bg-sand-50 p-4 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200" tabIndex={0} aria-label="Text der Vertraulichkeitsvereinbarung">
        <p className="font-semibold text-ink-900">{NDA.titel} · Fassung {NDA.version}</p>
        {NDA.absaetze.map((a, i) => (
          <p key={i} className="mt-2">{i + 1}. {a}</p>
        ))}
      </div>
      <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-700">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
        <span>Ich akzeptiere die Vertraulichkeitsvereinbarung. Zeitpunkt, IP-Adresse und Browser werden zum Nachweis protokolliert.</span>
      </label>
      <FehlerBox>{fehler}</FehlerBox>
      <button
        type="button"
        onClick={anfragen}
        disabled={!ok || laeuft}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-ov-700 disabled:opacity-50"
      >
        {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <KeyRound aria-hidden="true" className="h-4 w-4" />}
        NDA akzeptieren & Datenraum anfragen
      </button>
    </div>
  );
}

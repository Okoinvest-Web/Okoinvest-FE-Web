"use client";

// Backoffice: Kontaktfreigabe je Interessent (Umgehungsschutz). Erst danach sehen sich Anbieter und
// Investor namentlich – im Q&A, im Zugriffsprotokoll und in der Vergleichsmatrix.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { statusLabel } from "@/lib/plattform/prozesse";
import { DATENRAUM_STATUS } from "@/lib/plattform/prozesse";
import { FehlerBox } from "@/components/Portal/felder";
import { bestaetigen } from "@/components/ui/Rueckfrage";

export default function KontaktFreigabe({ projektId, interessenten = [] }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  async function umschalten(i) {
    if (!i.kontaktFrei && !(await bestaetigen({ titel: `Kontakt zu ${i.pseudonym} freigeben?`, text: "Anbieter und Interessent sehen sich danach namentlich.", details: [{ label: "Pseudonym", wert: i.pseudonym }, { label: "Investor", wert: `${i.investor?.vorname} ${i.investor?.nachname}` }], bestaetigenText: "Kontakt freigeben" }))) return;
    setLaeuft(i.id);
    setFehler("");
    try {
      await senden("/api/admin/dealroom/freigabe", { body: { projektId, interesseId: i.id, an: !i.kontaktFrei } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft("");
    }
  }
  if (!interessenten.length) return <p className="text-[14px] text-ink-500">Noch keine Interessenten mit Datenraum.</p>;
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-ink-100">
        {interessenten.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink-900">{i.pseudonym} · {i.investor?.vorname} {i.investor?.nachname}</p>
              <p className="text-[12.5px] text-ink-500">{i.investor?.firma ? `${i.investor.firma} · ` : ""}{statusLabel("interesse", i.status)}</p>
            </div>
            <button
              type="button"
              disabled={laeuft === i.id || (!i.kontaktFrei && !DATENRAUM_STATUS.includes(i.status))}
              onClick={() => umschalten(i)}
              aria-pressed={i.kontaktFrei}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset disabled:opacity-50", i.kontaktFrei ? "bg-ov-50 text-ov-800 ring-ov-200" : "text-ink-700 ring-ink-200 hover:bg-ink-50")}
            >
              {i.kontaktFrei ? <LockOpen aria-hidden="true" className="h-4 w-4" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
              {i.kontaktFrei ? "Kontakt frei" : "Anonym"}
            </button>
          </li>
        ))}
      </ul>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}

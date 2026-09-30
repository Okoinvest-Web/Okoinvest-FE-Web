"use client";

// Organisationswechsel im Portal-Kopf: persönlicher Bereich oder eine Organisation (Team).
// Tastatur: Pfeiltasten im Menü, Escape schließt. Die Auswahl gilt für diese Sitzung (serverseitig gespeichert).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Loader2, Plus, UserRound } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { teamRolleLabel } from "@/lib/plattform/organisation";
import { cn } from "@/components/ui/cn";

export default function OrgWechsler({ organisationen = [], aktiv = null, kompakt = false }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!offen) return undefined;
    const klick = (e) => !ref.current?.contains(e.target) && setOffen(false);
    const taste = (e) => {
      if (e.key === "Escape") setOffen(false);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = [...(ref.current?.querySelectorAll("[role=menuitemradio],[role=menuitem]") || [])];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        e.preventDefault();
      }
    };
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  async function wechseln(id) {
    setLaeuft(true);
    setFehler("");
    try {
      await senden("/api/portal/organisation/wechseln", { body: { organisationId: id } });
      setOffen(false);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  const name = aktiv ? aktiv.name : "Persönlich";
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={offen}
        aria-label={`Kontext: ${name}. Organisation wechseln`}
        className={cn("flex h-10 min-w-10 max-w-[180px] items-center justify-center gap-2 rounded-full px-2 text-[13.5px] sm:px-2.5 font-semibold ring-1 ring-inset transition-colors", aktiv ? "bg-navy-50 text-navy-800 ring-navy-100 hover:bg-navy-100" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}
      >
        {laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : aktiv ? <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" /> : <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />}
        <span className={cn("min-w-0 truncate", kompakt && "hidden sm:inline")}>{name}</span>
        <ChevronsUpDown aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 opacity-60", kompakt && "hidden sm:block")} />
      </button>
      {offen && (
        <div role="menu" className="fixed inset-x-4 top-16 z-40 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(3,18,43,0.45)] ring-1 ring-ink-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-72">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">Arbeiten als</p>
          <button role="menuitemradio" aria-checked={!aktiv} type="button" onClick={() => wechseln(null)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] text-ink-800 hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none">
            <UserRound aria-hidden="true" className="h-4 w-4 text-ink-500" />
            <span className="min-w-0 flex-1 truncate">Persönlich</span>
            {!aktiv && <Check aria-hidden="true" className="h-4 w-4 text-ov-600" />}
          </button>
          {organisationen.map((o) => (
            <button key={o.id} role="menuitemradio" aria-checked={aktiv?.id === o.id} type="button" onClick={() => wechseln(o.id)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] text-ink-800 hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none">
              <Building2 aria-hidden="true" className="h-4 w-4 text-navy-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.name}</span>
                <span className="block text-[12px] text-ink-500">{teamRolleLabel(o.rolle)}</span>
              </span>
              {aktiv?.id === o.id && <Check aria-hidden="true" className="h-4 w-4 text-ov-600" />}
            </button>
          ))}
          {fehler && <p role="alert" className="px-3 py-2 text-[12.5px] text-red-700">{fehler}</p>}
          <div className="my-1 h-px bg-ink-100" />
          <Link role="menuitem" href="/portal/organisation" onClick={() => setOffen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] text-ink-700 hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none">
            <Plus aria-hidden="true" className="h-4 w-4" /> Organisationen verwalten
          </Link>
        </div>
      )}
    </div>
  );
}

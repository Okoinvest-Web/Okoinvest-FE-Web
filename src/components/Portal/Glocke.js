"use client";

// Benachrichtigungszentrale im Portal-Kopf: Glocke mit Zähler, Aufklappliste der neuesten
// Ereignisse, „Alle als gelesen“, Link zur Übersichtsseite. Klick auf einen Eintrag markiert ihn
// als gelesen und öffnet das Objekt (nur interne Portal-Pfade).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden, sicheresZiel } from "@/lib/plattform/client";
import { relativ } from "@/lib/plattform/format";
import { BENACHRICHTIGUNG_ARTEN } from "@/lib/plattform/konstanten";
import { ART_ICON } from "./benachrichtigungIcons";

export function HinweisEintrag({ b, onOeffnen, kompakt = false }) {
  const Icon = ART_ICON[b.art] || Bell;
  return (
    <button
      type="button"
      onClick={() => onOeffnen(b)}
      className={cn("group flex w-full gap-3 rounded-2xl text-left transition-colors", kompakt ? "px-3 py-2.5 hover:bg-ink-50" : "p-4 hover:bg-sand-50", !b.gelesen && (kompakt ? "bg-ov-50/60" : "bg-ov-50/50"))}
    >
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", b.gelesen ? "bg-ink-100 text-ink-500" : "bg-ov-100 text-ov-700")}>
        <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
          {BENACHRICHTIGUNG_ARTEN[b.art]?.label || b.art}
          {!b.gelesen && <span className="h-1.5 w-1.5 rounded-full bg-ov-500" aria-label="ungelesen" />}
        </span>
        <span className={cn("mt-0.5 block text-[14px] leading-snug text-ink-900 group-hover:text-ov-800", !b.gelesen && "font-semibold", kompakt && "line-clamp-2")}>{b.titel}</span>
        {b.text && <span className={cn("mt-0.5 block text-[13px] leading-snug text-ink-600", kompakt ? "line-clamp-2" : "")}>{b.text}</span>}
        <span className="mt-1 block text-[12px] text-ink-400" suppressHydrationWarning>{relativ(b.am)}</span>
      </span>
    </button>
  );
}

export default function Glocke({ start = { eintraege: [], ungelesen: 0 } }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [daten, setDaten] = useState(start);
  const ref = useRef(null);

  useEffect(() => setDaten(start), [start]);

  useEffect(() => {
    if (!offen) return undefined;
    let aktiv = true;
    fetch("/api/portal/benachrichtigungen?limit=8", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => aktiv && j?.ok && setDaten({ eintraege: j.eintraege, ungelesen: j.ungelesen }))
      .catch(() => {});
    const klick = (e) => !ref.current?.contains(e.target) && setOffen(false);
    const taste = (e) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      aktiv = false;
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  async function oeffnen(b) {
    setOffen(false);
    if (!b.gelesen) {
      setDaten((d) => ({ eintraege: d.eintraege.map((x) => (x.id === b.id ? { ...x, gelesen: true } : x)), ungelesen: Math.max(0, d.ungelesen - 1) }));
      await senden("/api/portal/benachrichtigungen", { body: { ids: [b.id] } }).catch(() => {});
    }
    router.push(sicheresZiel(b.link, "/portal/benachrichtigungen"));
    router.refresh();
  }

  async function alleGelesen() {
    setDaten((d) => ({ eintraege: d.eintraege.map((x) => ({ ...x, gelesen: true })), ungelesen: 0 }));
    await senden("/api/portal/benachrichtigungen", { body: { alle: true } }).catch(() => {});
    router.refresh();
  }

  const n = daten.ungelesen || 0;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        aria-haspopup="dialog"
        aria-label={n ? `Benachrichtigungen, ${n} ungelesen` : "Benachrichtigungen"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {n > 0 && (
          <span aria-hidden="true" className="ov-num absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ov-600 px-1 text-[10.5px] font-bold text-white ring-2 ring-white">
            {n > 99 ? "99+" : n}
          </span>
        )}
      </button>
      {offen && (
        <div role="dialog" aria-label="Benachrichtigungen" className="fixed inset-x-3 top-16 z-40 overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-24px_rgba(3,18,43,0.5)] ring-1 ring-ink-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[25rem]">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <p className="font-display text-[15.5px] font-bold text-ink-900">
              Benachrichtigungen{n > 0 && <span className="ml-2 text-[13px] font-semibold text-ov-700">{n} neu</span>}
            </p>
            {n > 0 && (
              <button type="button" onClick={alleGelesen} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900">
                <CheckCheck aria-hidden="true" className="h-4 w-4" /> Alle gelesen
              </button>
            )}
          </div>
          <div className="max-h-[min(60vh,28rem)] space-y-1 overflow-y-auto p-2">
            {daten.eintraege.length ? (
              daten.eintraege.map((b) => <HinweisEintrag key={b.id} b={b} onOeffnen={oeffnen} kompakt />)
            ) : (
              <p className="px-3 py-8 text-center text-[14px] text-ink-500">Keine Benachrichtigungen.</p>
            )}
          </div>
          <div className="border-t border-ink-100 p-2">
            <Link href="/portal/benachrichtigungen" onClick={() => setOffen(false)} className="block rounded-2xl px-3 py-2.5 text-center text-[14px] font-semibold text-ov-700 hover:bg-ov-50">
              Alle Benachrichtigungen & E-Mail-Einstellungen
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

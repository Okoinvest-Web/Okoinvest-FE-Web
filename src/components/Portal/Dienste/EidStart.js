"use client";

// Start-Schaltflächen „Mit ID Austria / Online-Ausweis identifizieren“ – zum Einbetten im KYC-Assistenten (Team 1).
// Props: methoden = eidVerfuegbar() bzw. GET /api/portal/dienste/eid → methoden. Startet den Vorgang und leitet weiter.

import { useState } from "react";
import { BadgeCheck, IdCard } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/Portal/ui";
import { FehlerBox } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const ICONS = { BadgeCheck, IdCard };

export default function EidStart({ methoden = [] }) {
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState("");
  if (!methoden.length) return null;

  async function starten(id) {
    setFehler("");
    setLaeuft(id);
    try {
      const r = await senden("/api/portal/dienste/eid", { body: { methode: id } });
      window.location.assign(r.url);
    } catch (x) {
      setFehler(x.message);
      setLaeuft("");
    }
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {methoden.map((m) => (
          <li key={m.id} className="flex min-w-0 flex-col rounded-2xl p-4 ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-[15px] font-bold text-ink-900">{m.label}</p>
              <Badge ton="neutral">{m.land}</Badge>
              {m.demo && <Badge ton="warn">Demo</Badge>}
            </div>
            <p className="mt-1 flex-1 text-[13.5px] leading-relaxed text-ink-600">{m.kurz}</p>
            <div className="mt-3">
              <Button type="button" size="sm" variant="primary" icon={ICONS[m.icon] || BadgeCheck} disabled={!!laeuft} onClick={() => starten(m.id)}>
                {laeuft === m.id ? "Weiterleitung …" : `Mit ${m.label} identifizieren`}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}

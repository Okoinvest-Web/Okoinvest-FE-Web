// Reiterleiste je Gemeinschaft (Backoffice bzw. Organe-Sicht). Liste aus src/lib/plattform/eg/navigation.js – jede Seite unter
// /portal/admin/eg/[id]/… bzw. /portal/eg/[id]/… bindet sie oben ein: <EgReiter gemeinschaftId={id} aktiv="eda" art="admin" />
// `rechte` (optional, aus egKontext/egGemeinschaft): blendet Organ-Reiter ohne Mindestrecht aus.

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { EG_ADMIN_REITER, EG_ORGAN_REITER } from "@/lib/plattform/eg/navigation";

export default function EgReiter({ gemeinschaftId, aktiv = "stammdaten", art = "admin", rechte = null }) {
  const basis = art === "admin" ? `/portal/admin/eg/${gemeinschaftId}` : `/portal/eg/${gemeinschaftId}`;
  const liste = art === "admin" ? EG_ADMIN_REITER : EG_ORGAN_REITER.filter((r) => !rechte || (rechte[r.recht] || 0) >= 1);
  return (
    <nav aria-label="Bereiche der Gemeinschaft" className="-mx-1 mb-6 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1">
        {liste.map((r) => {
          const an = r.id === aktiv;
          return (
            <li key={r.id}>
              <Link
                href={`${basis}${r.pfad}`}
                aria-current={an ? "page" : undefined}
                className={cn("inline-flex rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition", an ? "bg-ov-600 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ov-50 hover:text-ov-800")}
              >
                {r.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

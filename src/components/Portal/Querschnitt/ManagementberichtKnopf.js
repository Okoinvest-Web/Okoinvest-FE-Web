"use client";

// Management-Bericht (Leitung) als PDF: Monat wählen, Download über natives <a> (Datei-Route, kein Client-Router).

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import { auswahlfeld } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default function ManagementberichtKnopf() {
  const optionen = useMemo(() => {
    const d = new Date();
    const liste = [];
    for (let i = 0; i < 12; i++) {
      const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 15));
      liste.push([x.toISOString().slice(0, 7), `${MONATE[x.getUTCMonth()]} ${x.getUTCFullYear()}`]);
    }
    return liste;
  }, []);
  const [monat, setMonat] = useState(optionen[0][0]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="leitung-monat">Monat für den Management-Bericht</label>
      <select id="leitung-monat" value={monat} onChange={(e) => setMonat(e.target.value)} className={cn(auswahlfeld, "h-10 w-[12.75rem] text-[14px]")}>
        {optionen.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
      </select>
      <DateiLink href={`/api/admin/leitung/bericht?monat=${monat}`} icon={FileDown} variant="primary">Management-Bericht PDF</DateiLink>
    </div>
  );
}

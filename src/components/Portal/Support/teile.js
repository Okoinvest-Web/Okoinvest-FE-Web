// src/components/Portal/Support/teile.js – Anzeige-Bausteine Service & Support (Server- und Client-tauglich)

import Link from "next/link";
import { LifeBuoy, Lock, Paperclip } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { TICKET_STATUS, restText } from "@/lib/plattform/tickets";
import { datumZeit, relativ } from "@/lib/plattform/format";

const AMPEL = { ok: ["ok", "SLA im Plan"], warn: ["warn", "SLA knapp"], verletzt: ["warn", "SLA überschritten"], erledigt: ["neutral", "erledigt"] };

export function TicketStatus({ status, label }) {
  return <Badge ton={TICKET_STATUS[status]?.ton || "neutral"}>{label || TICKET_STATUS[status]?.label || status}</Badge>;
}

export function SlaBadge({ sla }) {
  if (!sla?.ampel) return null;
  const [ton, text] = AMPEL[sla.ampel] || AMPEL.ok;
  const rest = sla.loesung && !sla.loesung.erfuellt ? restText(sla.loesung.restMin) : sla.reaktion && !sla.reaktion.erfuellt ? `Reaktion ${restText(sla.reaktion.restMin)}` : "";
  return (
    <Badge ton={ton} className={cn(sla.ampel === "verletzt" && "ring-red-300 bg-red-50 text-red-800")}>
      {text}
      {rest ? ` · ${rest}` : ""}
    </Badge>
  );
}

export function TicketZeile({ t, href, backoffice = false }) {
  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.ungelesen ? "bg-ov-600 text-white" : "bg-ov-50 text-ov-700")}>
          <LifeBuoy aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <Link href={href || `/portal/support/${t.id}`} className="block truncate font-semibold text-ink-900 hover:text-ov-700">
            {t.betreff}
          </Link>
          <p className="truncate text-[12.5px] text-ink-500">
            {t.id} · {t.kategorieLabel} · {t.prioritaetLabel}
            {backoffice && t.kunde ? ` · ${t.kunde.name}` : ""}
            {t.anlage ? ` · ${t.anlage.name}` : ""} · {relativ(t.geaendertAm)}
          </p>
          {backoffice && <p className="truncate text-[12.5px] text-ink-500">Zuständig: {t.zustaendig?.name || "–"}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
        {backoffice && t.offen && <SlaBadge sla={t.sla} />}
        <TicketStatus status={t.status} label={t.statusLabel} />
      </div>
    </li>
  );
}

export function TicketVerlauf({ nachrichten = [], anhaenge = [], ticketId }) {
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {nachrichten.map((m) => (
          <li key={m.id} className={cn("flex", m.ich ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[80%]", m.intern ? "bg-sun-300/25 ring-1 ring-inset ring-sun-400/50" : m.ich ? "bg-ov-600 text-white" : m.backoffice ? "bg-navy-50 text-ink-900" : "bg-ink-50 text-ink-900")}>
              <p className={cn("text-[12px] font-semibold", m.ich && !m.intern ? "text-white/80" : "text-ink-500")}>
                {m.intern && <Lock aria-hidden="true" className="mr-1 inline h-3 w-3" />}
                {m.intern ? "Interne Notiz · " : ""}
                {m.vonName} · {datumZeit(m.am)}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-[14.5px] leading-relaxed">{m.text}</p>
            </div>
          </li>
        ))}
      </ol>
      {anhaenge.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Anhänge">
          {anhaenge.map((a) => (
            <li key={a.id}>
              <a href={`/api/portal/support/${ticketId}/anhang/${a.id}`} className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-200 hover:ring-ov-400">
                <Paperclip aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{a.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

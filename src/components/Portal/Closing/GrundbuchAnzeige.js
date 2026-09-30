// Anzeige-Bausteine Grundbuch (Server- und Client-tauglich, ohne Hooks): Schrittfolge für Eigentümer („Was bedeutet das
// für Sie?“), Kostenschätzung, Muster-Links, Kurzanzeige an Fläche/Anlage.

import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed, FileDown, Loader2, ScrollText } from "lucide-react";
import { Badge, Karte } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { GB_SCHRITT_STATUS, GB_STATUS } from "@/lib/plattform/closing/grundbuch";

const ICON = { erledigt: CheckCircle2, in_arbeit: Loader2, entfaellt: CircleDashed, offen: Circle };
const datumText = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");
const geld = (x, w = "EUR") => `${Math.round(Number(x) || 0).toLocaleString("de-DE")} ${w === "CHF" ? "CHF" : "€"}`;

export function StatusBadgeGb({ status, label }) {
  return <Badge ton={GB_STATUS[status]?.ton}>{label || GB_STATUS[status]?.label || status}</Badge>;
}

/** Schrittfolge für Eigentümer/Dachgeber (vereinfacht) */
export function SchritteEigentuemer({ akte }) {
  return (
    <ol className="relative space-y-5">
      {akte.schritte.map((s, i) => {
        const Icon = ICON[s.status] || Circle;
        const aktiv = akte.naechster?.schluessel === s.schluessel;
        return (
          <li key={s.schluessel} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon aria-hidden="true" className={cn("h-6 w-6 shrink-0", s.status === "erledigt" ? "text-ov-600" : aktiv ? "text-navy-700" : "text-ink-300")} />
              {i < akte.schritte.length - 1 && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-ink-200" />}
            </div>
            <div className={cn("min-w-0 flex-1 rounded-2xl p-4 ring-1 ring-inset", aktiv ? "bg-navy-50 ring-navy-100" : "bg-white ring-ink-200/70")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{s.label}</p>
                <Badge ton={GB_SCHRITT_STATUS[s.status]?.ton}>{s.status === "erledigt" && s.datum ? `Erledigt ${datumText(s.datum)}` : s.statusLabel}</Badge>
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700"><span className="font-semibold text-ink-900">Was bedeutet das für Sie? </span>{s.portal}</p>
              {s.status === "entfaellt" && <p className="mt-1 text-[13px] text-ink-500">Entfällt – es sind keine Grundpfandrechte eingetragen.</p>}
              {s.signatur && s.signatur.status === "laufend" && <p className="mt-2 text-[13.5px]"><Link href={`/portal/signatur/${s.signatur.id}`} className="font-semibold text-ov-700 hover:text-ov-800">Vertrag jetzt ansehen und unterschreiben</Link></p>}
              {s.schluessel === "eintragung" && s.nachweisWert && <p className="mt-1 text-[13px] text-ink-600">Eintragung: {s.nachweisWert}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function KostenTabelle({ kosten, text }) {
  return (
    <div>
      {text && <p className="mb-3 text-[14px] text-ink-600">{text}</p>}
      <ul className="divide-y divide-ink-100 text-[14px]">
        {kosten.positionen.map((p) => (
          <li key={p.label} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-ink-900">{p.label}</p>
              <p className="text-[12px] leading-snug text-ink-500">{p.quelle}</p>
            </div>
            <p className="ov-num whitespace-nowrap font-semibold text-ink-900">{p.von !== undefined ? `${geld(p.von, kosten.waehrung)} – ${geld(p.bis, kosten.waehrung)}` : geld(p.betrag, kosten.waehrung)}</p>
          </li>
        ))}
        <li className="flex justify-between gap-4 py-2.5 font-semibold"><span>Summe (Schätzung)</span><span className="ov-num">{geld(kosten.summe, kosten.waehrung)}</span></li>
      </ul>
      <p className="mt-2 text-[12px] leading-snug text-ink-500">{kosten.hinweis}</p>
    </div>
  );
}

export function MusterLinks({ akte }) {
  return (
    <ul className="space-y-2">
      {akte.vorlagen.map((v) => (
        <li key={v.id}>
          <a href={`/api/portal/grundbuch/${akte.id}/muster?vorlage=${v.id}`} className="inline-flex items-start gap-2 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
            <FileDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{v.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Kurzanzeige an Fläche bzw. Anlage (nur Akten, die der Nutzer sehen darf) */
export function GrundbuchKurz({ akten, admin = false }) {
  if (!akten?.length) return null;
  return (
    <Karte titel="Grundbuch & Dienstbarkeit" untertitel="Sicherung des Nutzungsrechts im Grundbuch">
      <ul className="space-y-3">
        {akten.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <ScrollText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              <div className="min-w-0">
                <Link href={admin ? `/portal/admin/grundbuch/${a.id}` : `/portal/grundbuch/${a.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{a.titel}</Link>
                <p className="text-[12.5px] text-ink-500">{a.fortschritt.erledigt} von {a.fortschritt.gesamt} Schritten{a.naechster ? ` · nächster Schritt: ${a.naechster.label}` : ""}</p>
              </div>
            </div>
            <StatusBadgeGb status={a.status} label={a.statusLabel} />
          </li>
        ))}
      </ul>
    </Karte>
  );
}

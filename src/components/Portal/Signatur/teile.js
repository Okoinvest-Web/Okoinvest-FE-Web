// src/components/Portal/Signatur/teile.js – Anzeige-Bausteine der elektronischen Unterschrift (Server- und Client-tauglich)

import Link from "next/link";
import { Check, Circle, Clock, FileSignature, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { SIGNATUR_STATUS, UNTERZEICHNER_STATUS, hashKurz } from "@/lib/plattform/signatur";
import { datum, datumZeit } from "@/lib/plattform/format";

export function SignaturStatus({ status, label }) {
  const s = SIGNATUR_STATUS[status] || { label: label || status, ton: "neutral" };
  return <Badge ton={s.ton}>{label || s.label}</Badge>;
}

export function Fortschritt({ unterschrieben, gesamt }) {
  const q = gesamt ? Math.round((unterschrieben / gesamt) * 100) : 0;
  return (
    <div className="min-w-[110px]">
      <div className="flex items-baseline justify-between text-[12px] text-ink-500">
        <span>Unterschriften</span>
        <span className="ov-num font-semibold text-ink-900">
          {unterschrieben}/{gesamt}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={gesamt} aria-valuenow={unterschrieben} aria-label="Fortschritt der Unterschriften">
        <div className="h-1.5 rounded-full bg-ov-500" style={{ width: `${Math.max(4, q)}%` }} />
      </div>
    </div>
  );
}

/** Karte je Vorgang in Listen */
export function VorgangZeile({ v }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", v.ichBinDran ? "bg-ov-600 text-white" : "bg-ov-50 text-ov-700")}>
          <FileSignature aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <Link href={`/portal/signatur/${v.id}`} className="block truncate font-semibold text-ink-900 hover:text-ov-700">
            {v.titel}
          </Link>
          <p className="truncate text-[12.5px] text-ink-500">
            {v.artLabel} · {v.id} · {v.status === "abgeschlossen" ? `abgeschlossen ${datum(v.abgeschlossenAm)}` : v.frist ? `Frist ${datum(v.frist)}` : `seit ${datum(v.erstelltAm)}`}
          </p>
          {v.ichBinDran && <p className="mt-1 text-[13px] font-semibold text-ov-700">Sie sind an der Reihe – bitte unterschreiben</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 pl-[52px] sm:pl-0">
        <Fortschritt {...v.fortschritt} />
        <SignaturStatus status={v.status} label={v.statusLabel} />
      </div>
    </li>
  );
}

const ICON = { unterschrieben: Check, offen: Clock, wartet: Circle, abgelehnt: X };

/** Unterzeichner in Reihenfolge */
export function UnterzeichnerListe({ unterzeichner = [], reihenfolge = true }) {
  return (
    <ol className="relative space-y-4 pl-8">
      <span aria-hidden="true" className="absolute bottom-2 left-[11px] top-2 w-px bg-ink-200" />
      {unterzeichner.map((u) => {
        const Icon = ICON[u.status] || Circle;
        const fertig = u.status === "unterschrieben";
        return (
          <li key={u.id} className="relative">
            <span aria-hidden="true" className={cn("absolute -left-8 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white", fertig ? "bg-ov-500 text-white" : u.status === "offen" ? "bg-navy-700 text-white" : u.status === "abgelehnt" ? "bg-sun-400 text-ink-900" : "bg-ink-200 text-ink-500")}>
              <Icon className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <p className="flex flex-wrap items-center gap-x-2 text-[14.5px] font-semibold text-ink-900">
              {reihenfolge && <span className="ov-num text-ink-400">{u.position}.</span>}
              {u.name}
              {u.ich && <Badge ton="info">Sie</Badge>}
              <span className="text-[12.5px] font-normal text-ink-500">{UNTERZEICHNER_STATUS[u.status]?.label || u.statusLabel}</span>
            </p>
            {u.email && <p className="text-[12.5px] text-ink-500">{u.email}</p>}
            {u.unterschrift && (
              <p className="mt-0.5 text-[12.5px] text-ink-600">
                {u.unterschrift.art === "gezeichnet" ? "Gezeichnet" : `Getippt: „${u.unterschrift.name}“`} · {datumZeit(u.unterschrift.am)} Uhr · IP {u.unterschrift.ip || "–"}
              </p>
            )}
            {u.unterschrift?.bild && (
              // eslint-disable-next-line @next/next/no-img-element -- Unterschrift als data:-PNG (nur für Berechtigte ausgeliefert)
              <img src={u.unterschrift.bild} alt={`Unterschrift von ${u.name}`} className="mt-2 h-14 w-auto rounded-lg bg-white p-1 ring-1 ring-ink-200" />
            )}
            {u.abgelehnt && <p className="mt-0.5 text-[12.5px] text-ink-700">Abgelehnt am {datumZeit(u.abgelehnt.am)}: {u.abgelehnt.grund}</p>}
          </li>
        );
      })}
    </ol>
  );
}

const PROTOKOLL_LABEL = {
  erstellt: "Bereitgestellt", code: "Code gesendet", code_falsch: "Falscher Code", unterschrieben: "Unterschrieben", abgeschlossen: "Abgeschlossen",
  abgelehnt: "Abgelehnt", widerrufen: "Widerrufen", erinnert: "Erinnerung", download: "Abruf", hash_abweichung: "Prüfsumme weicht ab",
};

/** Revisionsprotokoll des Vorgangs */
export function Protokoll({ eintraege = [] }) {
  return (
    <ol className="divide-y divide-ink-100">
      {[...eintraege].reverse().map((e) => (
        <li key={e.id} className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
          <p className="text-[12.5px] text-ink-500">{datumZeit(e.am)} Uhr</p>
          <div className="min-w-0">
            <p className="text-[14px] text-ink-900">
              <span className={cn("font-semibold", e.art === "hash_abweichung" && "text-red-700")}>{PROTOKOLL_LABEL[e.art] || e.art}</span> · {e.text}
            </p>
            <p className="break-all text-[12px] text-ink-500">
              {e.name}
              {e.ip ? ` · IP ${e.ip}` : ""}
              {e.userAgent ? ` · ${String(e.userAgent).slice(0, 90)}` : ""}
              {e.sha256 ? ` · SHA-256 ${hashKurz(e.sha256)}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

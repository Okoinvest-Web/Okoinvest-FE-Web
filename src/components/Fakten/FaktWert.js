// src/components/Fakten/FaktWert.js
//
// Ein Wert aus dem Faktenregister mit Einheit, Land, Stand und Quelle (Welle 2, Paket B1).
// Länderfähig: land="DE" | "AT" | "CH" (CH zeigt Franken/Rappen in Schweizer Schreibweise).
// Ein abgelaufener Wert wird NIE als aktuell ausgegeben: Er erscheint als „zuletzt belegt“
// mit dem Hinweis „Stand abgelaufen, wird geprüft“ (Masterplan H7). Fehlt der Wert für das
// Land, steht dort „für <Land> noch in Prüfung“ – es wird kein Wert eines anderen Landes gezeigt.
// Ohne Hooks: in Server- und Client-Komponenten nutzbar.
//
//   <FaktWert id="pacht.ackerProHa" land="DE" />                       Karte mit Stand und Quelle
//   <FaktWert id="erloese.negativAnteilSolar" variante="inline" />     im Fließtext
//   <FaktWert id="…" format={(f) => "…"} />                             eigene Formatierung

import Link from "@/components/Land/Link";
import { fakt as faktAusRegister, anzeigeStatus, fmtFaktWert, KLASSEN } from "@/lib/fakten";
import { ankerFuer } from "@/lib/quellen/fakten";
import { cn } from "@/components/ui/cn";
import StandHinweis from "./StandHinweis";
import Quellenzeile from "./Quellenzeile";

const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "die Schweiz" };
const LAND_KURZ_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", DACH: "Deutschland, Österreich, Schweiz" };

export default function FaktWert({ id, land = "DE", fakt, titel, heute, format, variante = "karte", zeigeQuelle = true, className }) {
  const f = fakt || faktAusRegister(id, land);
  const jetzt = heute || new Date();

  if (!f) {
    const hinweis = `für ${LAND_NAME[land] || land} noch in Prüfung`;
    if (variante === "inline") {
      return (
        <span className={cn("text-ink-500", className)} data-fakt={id} data-fakt-status="fehlt">
          {hinweis}
        </span>
      );
    }
    return (
      <figure className={cn("rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70 md:p-6", className)} data-fakt={id} data-fakt-land={land} data-fakt-status="fehlt">
        <div className="flex items-start justify-between gap-3">
          <figcaption className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">{titel || id}</figcaption>
          <span className="shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">{land}</span>
        </div>
        <p className="mt-2 font-display text-[clamp(1.1rem,1rem+0.4vw,1.3rem)] font-bold leading-snug text-ink-600">Wert {hinweis}</p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">Für dieses Land ist noch kein belegter Wert im Register. Wir zeigen bewusst keinen Wert aus einem anderen Land.</p>
      </figure>
    );
  }

  const status = anzeigeStatus(f, jetzt);
  const abgelaufen = status === "abgelaufen";
  const text = format ? format(f, land) : fmtFaktWert(f, land);

  if (variante === "inline") {
    return (
      <span className={className} data-fakt={f.id} data-fakt-land={f.land} data-fakt-status={status}>
        {abgelaufen ? <span className="whitespace-nowrap text-ink-500">zuletzt belegt {text}</span> : <span className="whitespace-nowrap font-semibold text-ink-900">{text}</span>}
        {/* GEO/Zitierfähigkeit: der Stand-Chip führt zum stabilen Zitier-Anker des Fakts im Faktenregister */}
        <Link href={`/quellen#${ankerFuer(f.id, f.land)}`} title="Quelle, Stand und Zitier-Link im Faktenregister" className="no-underline">
          <StandHinweis fakt={f} heute={jetzt} className="ml-1.5 align-[1px]" />
        </Link>
      </span>
    );
  }

  return (
    <figure
      className={cn("rounded-3xl bg-white p-5 shadow-sm ring-1 ring-ink-200/70 md:p-6", abgelaufen && "bg-sun-50/40 ring-sun-200", className)}
      data-fakt={f.id}
      data-fakt-land={f.land}
      data-fakt-status={status}
    >
      <div className="flex items-start justify-between gap-3">
        <figcaption className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">{titel || f.id}</figcaption>
        <span className="shrink-0 rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100" title={LAND_KURZ_NAME[f.land]}>
          {f.land}
        </span>
      </div>
      <p className={cn("mt-2 font-display text-[clamp(1.35rem,1.2rem+0.6vw,1.75rem)] font-extrabold leading-tight tracking-tight", abgelaufen ? "text-ink-500" : "text-ink-900")}>
        {abgelaufen ? <span className="mr-1.5 block text-[13px] font-semibold tracking-normal text-ink-500">zuletzt belegt</span> : null}
        {text}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StandHinweis fakt={f} heute={jetzt} />
        <span className="text-[12px] text-ink-500">Klasse {f.klasse}: {KLASSEN[f.klasse]}</span>
      </div>
      {f.notiz ? <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">{f.notiz}</p> : null}
      {zeigeQuelle ? <Quellenzeile fakt={f} className="mt-3 border-t border-ink-200/70 pt-3" /> : null}
    </figure>
  );
}

// src/components/Fakten/Quellenzeile.js
//
// Quellenangabe zu einem Fakt aus dem Faktenregister (Welle 2, Paket B1):
// „Quelle: <Titel> · abgerufen 03.10.2026“ – bei eigener Einschätzung ausdrücklich so benannt.
// Ohne Hooks: in Server- und Client-Komponenten nutzbar.
//
//   <Quellenzeile id="pacht.ackerProHa" land="DE" />
//   <Quellenzeile fakt={f} />

import { ExternalLink } from "lucide-react";
import Link from "@/components/Land/Link";
import { fakt as faktAusRegister, datumDe } from "@/lib/fakten";
import { ankerFuer } from "@/lib/quellen/fakten";
import { cn } from "@/components/ui/cn";

export default function Quellenzeile({ id, land = "DE", fakt, className, dunkel = false }) {
  const f = fakt || (id ? faktAusRegister(id, land) : null);
  if (!f?.quelle) return null;
  const { titel, url, art } = f.quelle;
  const eigen = art === "eigen";
  const ton = dunkel ? "text-white/70" : "text-ink-500";
  const link = dunkel ? "text-white decoration-white/40 hover:decoration-white" : "text-ink-700 decoration-ink-300 hover:text-navy-700 hover:decoration-navy-400";
  return (
    <p className={cn("text-[12.5px] leading-relaxed", ton, className)} data-fakt-quelle={f.id}>
      <span className="font-semibold">{eigen ? "Grundlage: " : "Quelle: "}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={cn("underline underline-offset-2 transition-colors", link)}>
          {titel}
          <ExternalLink aria-hidden="true" className="ml-0.5 inline h-3 w-3 align-[-1px]" />
          <span className="sr-only"> (öffnet in neuem Fenster)</span>
        </a>
      ) : (
        <span>{titel}</span>
      )}
      {f.abruf ? <span> · {eigen ? "Stand" : "abgerufen"} {datumDe(f.abruf)}</span> : null}
      {/* GEO/Zitierfähigkeit: stabiler Anker des Fakts im Faktenregister (/quellen#fakt-<land>-<id>) */}
      <span> · </span>
      <Link href={`/quellen#${ankerFuer(f.id, f.land)}`} className={cn("underline underline-offset-2 transition-colors", link)}>
        im Faktenregister
      </Link>
    </p>
  );
}

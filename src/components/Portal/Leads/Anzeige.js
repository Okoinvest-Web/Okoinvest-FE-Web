// src/components/Portal/Leads/Anzeige.js
//
// Darstellungsbausteine des Lead-Desks (Welle 2, Paket B3) – ohne Hooks, Server- und Client-tauglich.
// Nur Tokens des Design-Systems (ov-*, navy-*, ink-*, sand-*, sun-*, danger-*). Zielzeiten sind INTERN.

import { AlarmClock, CircleCheck, CircleDashed, CircleHelp, CircleX, Hourglass } from "lucide-react";
import { Badge, Tabelle, zelle } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";

export const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", unbekannt: "Land unbekannt" };
export const ZWECK_KURZ = { werbeanruf: "Anruf", newsletter: "Newsletter", weitergabe_partner: "Partner", bericht: "Bericht" };

/** Minuten → „45 min“ / „1,5 h“ / „2,3 Tg“ (Geschäftszeit: 1 Tag = 9 h) */
export function dauer(min, { geschaeft = true } = {}) {
  if (min === null || min === undefined || !Number.isFinite(Number(min))) return "–";
  const m = Number(min);
  if (m < 90) return `${fmt(Math.round(m))} min`;
  const tagStunden = geschaeft ? 9 : 24;
  if (m / 60 < tagStunden * 2) return `${fmt(m / 60, 1)} h`;
  return `${fmt(m / 60 / tagStunden, 1)} ${geschaeft ? "Gtg" : "Tg"}`;
}

const AMPEL = {
  erledigt: { ton: "ok", icon: CircleCheck, label: "in Frist" },
  verspaetet: { ton: "warn", icon: AlarmClock, label: "verspätet" },
  offen: { ton: "info", icon: Hourglass, label: "läuft" },
  faellig: { ton: "warn", icon: AlarmClock, label: "fällig" },
  ueberfaellig: { ton: "danger", icon: CircleX, label: "überfällig" },
  unbekannt: { ton: "neutral", icon: CircleHelp, label: "unbekannt" },
};

/** SLA-Ampel mit Text (Farbe nie allein: Icon + Wort) */
export function SlaAmpel({ sla, klein = false }) {
  const a = AMPEL[sla?.status] || AMPEL.unbekannt;
  const Icon = a.icon;
  return (
    <span className="inline-flex min-w-0 flex-col items-start gap-1">
      <Badge ton={a.ton}>
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {a.label}
      </Badge>
      {!klein && sla?.text && <span className="text-[12px] leading-snug text-ink-500">{sla.text}</span>}
    </span>
  );
}

const SCORE_TON = { A: "marke", B: "info", C: "neutral" };

export function ScoreBadge({ score }) {
  if (!score?.klasse) return <Badge>–</Badge>;
  return (
    <span title={score.begruendung} className="inline-flex">
      <Badge ton={SCORE_TON[score.klasse]}>
        Score {score.klasse}
        <span className="font-normal opacity-80">· {score.punkte}</span>
      </Badge>
    </span>
  );
}

const KANAL_STAND = {
  erteilt: { ton: "ok", text: "erlaubt" },
  doi_ausstehend: { ton: "warn", text: "DOI offen" },
  widerrufen: { ton: "danger", text: "widerrufen" },
  keine: { ton: "neutral", text: "gesperrt" },
};

/** Kanal-Ampel je Werbe-Zweck: nur „erlaubt“ öffnet den Kanal */
export function KanalAmpel({ kanaele }) {
  if (!kanaele) return <span className="text-[12.5px] text-ink-500">kein Protokoll (Altbestand)</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Werbekanäle">
      {Object.entries(kanaele).map(([z, stand]) => {
        const s = KANAL_STAND[stand] || KANAL_STAND.keine;
        return (
          <li key={z}>
            <Badge ton={s.ton} className="px-2 py-0.5 text-[11.5px]">
              {ZWECK_KURZ[z] || z}: {s.text}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

/** Kennzahlen-Tabelle (je Land bzw. je Land × Typ) */
export function SlaTabelle({ zeilen, mitTyp = false, typLabel = {} }) {
  return (
    <Tabelle kopf={[mitTyp ? "Land · Typ" : "Land", "Anfragen", "Erstkontakt", "in Frist", "überfällig", "ohne Zuständ.", "Median", "P90"]}>
      {zeilen.map((z) => (
        <tr key={`${z.land}|${z.typ || ""}`}>
          <th scope="row" className={cn(zelle, "font-semibold text-ink-900")}>
            {LAND_NAME[z.land] || z.land}
            {mitTyp && <span className="block text-[12.5px] font-normal text-ink-500">{typLabel[z.typ] || z.typ}</span>}
          </th>
          <td className={cn(zelle, "tabular-nums")}>{fmt(z.anzahl)}</td>
          <td className={cn(zelle, "tabular-nums")}>{fmt(z.mitErstkontakt)}</td>
          <td className={cn(zelle, "whitespace-nowrap tabular-nums")}>{z.mitErstkontakt ? `${fmt((z.inFrist / z.mitErstkontakt) * 100)} %` : "–"}</td>
          <td className={cn(zelle, "tabular-nums", z.ueberfaellig ? "font-semibold text-danger-700" : "text-ink-500")}>{fmt(z.ueberfaellig)}</td>
          <td className={cn(zelle, "tabular-nums", z.ohneZustaendigkeit ? "font-semibold text-ink-900" : "text-ink-500")}>{fmt(z.ohneZustaendigkeit)}</td>
          <td className={cn(zelle, "tabular-nums")}>{dauer(z.geschaeftsMin?.median)}</td>
          <td className={cn(zelle, "tabular-nums")}>{dauer(z.geschaeftsMin?.p90)}</td>
        </tr>
      ))}
    </Tabelle>
  );
}

/** Leerer Zustand ohne Illustration (kompakt) */
export function LeerZeile({ children }) {
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-sand-50 px-4 py-6 text-[14px] text-ink-500">
      <CircleDashed aria-hidden="true" className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

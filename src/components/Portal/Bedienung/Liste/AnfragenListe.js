"use client";

// „Meine Anfragen“ auf Basis der gemeinsamen DatenListe (ohne Massenaktionen, CSV möglich).

import Link from "next/link";
import Button from "@/components/ui/Button";
import DatenListe from "./DatenListe";
import { StatusBadge, Stepper } from "@/components/Portal/ui";
import { PROZESSE, statusInfo } from "@/lib/plattform/prozesse";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { datum, relativ } from "@/lib/plattform/format";
import LeerZustand from "../LeerZustand";
import { pfad } from "@/lib/land";

const GESCHLOSSEN = ["abgeschlossen", "abgelehnt", "zurueckgezogen"];

export default function AnfragenListe({ vorgaenge, jetzt }) {
  // fester Zeitpunkt vom Server – gleiche relative Zeitangaben bei Server-Rendering und Hydration
  const typen = [...new Set(vorgaenge.map((v) => v.typ))];
  return (
    <DatenListe
      id="portal-anfragen"
      titel="Anfragen"
      csvName="meine-anfragen"
      zeilen={vorgaenge}
      suche={{ platzhalter: "Anfrage oder Nummer suchen", felder: (v) => [VORGANG_TYPEN[v.typ], v.id, v.letzterKommentar] }}
      spalten={[
        {
          id: "anfrage", label: "Anfrage", pflicht: true, mobil: "titel", wert: (v) => VORGANG_TYPEN[v.typ] || v.typ,
          zelle: (v) => (
            <>
              <Link href={`/portal/anfragen/${v.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{VORGANG_TYPEN[v.typ]}</Link>
              <p className="ov-num text-[12.5px] text-ink-500">{v.id} · {datum(v.erstelltAm)}</p>
            </>
          ),
        },
        { id: "status", label: "Status", mobil: "badge", wert: (v) => PROZESSE.vorgang.pipeline.indexOf(v.status), csvWert: (v) => statusInfo("vorgang", v.status).label, zelle: (v) => <StatusBadge art="vorgang" status={v.status} /> },
        { id: "fortschritt", label: "Fortschritt", sortierbar: false, csv: false, mobil: "meta", wert: (v) => v.status, klasse: "min-w-[200px]", zelle: (v) => <Stepper art="vorgang" status={v.status} kompakt /> },
        { id: "stand", label: "Letzter Stand", sortierbar: false, wert: (v) => v.letzterKommentar || statusInfo("vorgang", v.status).text, zelle: (v) => <span className="line-clamp-2 text-[13.5px] text-ink-600">{v.letzterKommentar || statusInfo("vorgang", v.status).text}</span> },
        { id: "aktualisiert", label: "Aktualisiert", wert: (v) => v.geaendertAm, zelle: (v) => <span className="whitespace-nowrap text-ink-500">{relativ(v.geaendertAm, jetzt)}</span> },
      ]}
      filter={[
        { id: "status", label: "Status", wert: (v) => v.status, optionen: Object.entries(PROZESSE.vorgang.status).map(([k, s]) => ({ wert: k, label: s.label })) },
        typen.length > 1 && { id: "typ", label: "Thema", wert: (v) => v.typ, optionen: typen.map((k) => ({ wert: k, label: VORGANG_TYPEN[k] || k })) },
      ].filter(Boolean)}
      ansichten={[{ id: "offen", label: "Nur offene", zustand: { filter: { status: Object.keys(PROZESSE.vorgang.status).filter((k) => !GESCHLOSSEN.includes(k)) } } }]}
      auswahl={false}
      leer={
        <LeerZustand
          art="anfrage"
          titel="Noch keine Anfragen"
          text="Sobald Sie über die Website eine Anfrage stellen, sehen Sie hier den Status – Schritt für Schritt."
          aktion={<Button href={pfad("/flaechencheck")} size="sm" pfeil>Fläche prüfen lassen</Button>}
          zweite={<Button href="/portal/nachrichten" size="sm" variant="secondary">Frage an das Backoffice</Button>}
        />
      }
    />
  );
}

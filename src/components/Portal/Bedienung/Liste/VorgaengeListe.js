"use client";

// Backoffice „Alle Vorgänge“ auf Basis der gemeinsamen DatenListe.
// Massenaktionen: mir zuweisen / Zuweisung entfernen (bestehende API /api/admin/zuweisen, rechtegeprüft).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCheck, UserMinus } from "lucide-react";
import DatenListe from "./DatenListe";
import { StatusBadge } from "@/components/Portal/ui";
import { senden } from "@/lib/plattform/client";
import { PROZESSE } from "@/lib/plattform/prozesse";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { datum, relativ } from "@/lib/plattform/format";
import LeerZustand from "../LeerZustand";

const GESCHLOSSEN = ["abgeschlossen", "abgelehnt", "zurueckgezogen"];
const name = (k) => [k?.vorname, k?.nachname].filter(Boolean).join(" ");

export default function VorgaengeListe({ vorgaenge, ichId, start, jetzt }) {
  // fester Zeitpunkt vom Server – gleiche relative Zeitangaben bei Server-Rendering und Hydration
  const router = useRouter();
  const zustaendigkeit = (v) => (v.zustaendig?.id === ichId ? "ich" : v.zustaendig ? "andere" : GESCHLOSSEN.includes(v.status) ? "keiner" : "ohne");

  async function zuweisen(liste, zustaendigId) {
    let ok = 0;
    const fehler = [];
    for (const v of liste) {
      try {
        await senden("/api/admin/zuweisen", { body: { art: "vorgang", id: v.id, zustaendigId } });
        ok++;
      } catch (e) {
        fehler.push(`${v.id}: ${e.message}`);
      }
    }
    router.refresh();
    if (fehler.length) throw new Error(`${ok} erledigt, ${fehler.length} fehlgeschlagen – ${fehler[0]}`);
    return zustaendigId ? `${ok} ${ok === 1 ? "Vorgang" : "Vorgänge"} Ihnen zugewiesen.` : `Zuweisung bei ${ok} ${ok === 1 ? "Vorgang" : "Vorgängen"} entfernt.`;
  }

  return (
    <DatenListe
      id="admin-vorgaenge"
      titel="Vorgänge"
      csvName="vorgaenge-auswahl"
      urlSync
      zeilen={vorgaenge}
      start={start}
      suche={{ platzhalter: "Name, E-Mail, Firma, Nummer", felder: (v) => [v.id, name(v.kontakt), v.kontakt?.email, v.kontakt?.firma, VORGANG_TYPEN[v.typ]] }}
      spalten={[
        {
          id: "vorgang", label: "Vorgang", pflicht: true, mobil: "titel", wert: (v) => VORGANG_TYPEN[v.typ] || v.typ, csvWert: (v) => v.id,
          zelle: (v) => (
            <>
              <Link href={`/portal/admin/vorgaenge/${v.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{VORGANG_TYPEN[v.typ]}</Link>
              <p className="ov-num text-[12.5px] text-ink-500">{v.id} · {datum(v.erstelltAm)}</p>
            </>
          ),
        },
        {
          id: "kontakt", label: "Kontakt", wert: (v) => name(v.kontakt),
          zelle: (v) => (
            <>
              <p className="text-ink-900">{name(v.kontakt)}</p>
              <p className="text-[12.5px] text-ink-500">{v.kontakt?.firma || v.kontakt?.email}{v.nutzerId ? " · Konto" : ""}</p>
            </>
          ),
        },
        { id: "status", label: "Status", mobil: "badge", wert: (v) => PROZESSE.vorgang.pipeline.indexOf(v.status), csvWert: (v) => PROZESSE.vorgang.status[v.status]?.label || v.status, zelle: (v) => <StatusBadge art="vorgang" status={v.status} /> },
        { id: "zustaendig", label: "Zuständig", wert: (v) => name(v.zustaendig), zelle: (v) => (v.zustaendig ? <span className="text-ink-700">{name(v.zustaendig)}</span> : <span className="text-ink-400">–</span>) },
        { id: "email", label: "E-Mail", standard: false, wert: (v) => v.kontakt?.email || "" },
        { id: "erstellt", label: "Eingegangen", standard: false, wert: (v) => v.erstelltAm, zelle: (v) => <span className="whitespace-nowrap text-ink-600">{datum(v.erstelltAm)}</span> },
        { id: "aktualisiert", label: "Aktualisiert", wert: (v) => v.geaendertAm, zelle: (v) => <span className="whitespace-nowrap text-ink-500">{relativ(v.geaendertAm, jetzt)}</span> },
      ]}
      filter={[
        { id: "status", label: "Status", wert: (v) => v.status, optionen: Object.entries(PROZESSE.vorgang.status).map(([k, s]) => ({ wert: k, label: s.label })) },
        { id: "typ", label: "Typ", wert: (v) => v.typ, optionen: Object.entries(VORGANG_TYPEN).map(([k, l]) => ({ wert: k, label: l })) },
        { id: "zust", label: "Zuständigkeit", wert: zustaendigkeit, optionen: [{ wert: "ich", label: "Mir zugewiesen" }, { wert: "ohne", label: "Offen ohne Zuständigen" }, { wert: "andere", label: "Andere Zuständige" }] },
      ]}
      ansichten={[
        { id: "neu", label: "Neu eingegangen", zustand: { filter: { status: ["eingegangen"] }, sortierung: { spalte: "erstellt", richtung: "ab" } } },
        { id: "meine", label: "Mir zugewiesen", zustand: { filter: { zust: ["ich"] } } },
        { id: "ohne", label: "Ohne Zuständigen", zustand: { filter: { zust: ["ohne"] } } },
      ]}
      aktionen={[
        { id: "mir", label: "Mir zuweisen", icon: UserCheck, ausfuehren: (l) => zuweisen(l, ichId) },
        { id: "keiner", label: "Zuweisung entfernen", icon: UserMinus, gefahr: true, bestaetigen: (l) => `Zuweisung bei ${l.length} ${l.length === 1 ? "Vorgang" : "Vorgängen"} entfernen?`, ausfuehren: (l) => zuweisen(l, null) },
      ]}
      leer={<LeerZustand art="anfrage" titel="Noch keine Vorgänge" text="Neue Anfragen über die Website erscheinen hier automatisch." />}
    />
  );
}

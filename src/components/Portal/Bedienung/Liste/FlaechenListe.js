"use client";

// „Meine Flächen“ auf Basis der gemeinsamen DatenListe: Fortschritt je Fläche, Filter, Sortierung,
// CSV der Auswahl. Mobil als Karten.

import Link from "next/link";
import Button from "@/components/ui/Button";
import DatenListe from "./DatenListe";
import { Badge, StatusBadge, Stepper } from "@/components/Portal/ui";
import { PROZESSE, statusInfo } from "@/lib/plattform/prozesse";
import { FLAECHE_NUTZUNG, LAENDER } from "@/lib/plattform/konstanten";
import { ha, relativ } from "@/lib/plattform/format";
import LeerZustand from "../LeerZustand";

export default function FlaechenListe({ flaechen, jetzt }) {
  // fester Zeitpunkt vom Server – gleiche relative Zeitangaben bei Server-Rendering und Hydration
  return (
    <DatenListe
      id="portal-flaechen"
      titel="Flächen"
      csvName="meine-flaechen"
      zeilen={flaechen}
      suche={{ platzhalter: "Bezeichnung, Ort oder PLZ", felder: (f) => [f.bezeichnung, f.ort, f.plz, f.gemarkung, f.id] }}
      spalten={[
        {
          id: "flaeche", label: "Fläche", pflicht: true, mobil: "titel", wert: (f) => f.bezeichnung,
          zelle: (f) => (
            <>
              <Link href={`/portal/flaechen/${f.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{f.bezeichnung}</Link>
              <p className="text-[12.5px] text-ink-500">{[FLAECHE_NUTZUNG[f.nutzung], [f.plz, f.ort].filter(Boolean).join(" "), LAENDER[f.land]].filter(Boolean).join(" · ")}</p>
            </>
          ),
        },
        { id: "status", label: "Status", mobil: "badge", wert: (f) => PROZESSE.flaeche.pipeline.indexOf(f.status), csvWert: (f) => statusInfo("flaeche", f.status).label, zelle: (f) => <StatusBadge art="flaeche" status={f.status} /> },
        { id: "agri", label: "Nutzung", mobil: "badge", wert: (f) => (f.agri ? "Agri-PV" : "Freifläche"), zelle: (f) => (f.agri ? <Badge ton="ok">Agri-PV</Badge> : <Badge>Freifläche</Badge>) },
        { id: "ha", label: "Größe", wert: (f) => f.ha ?? null, zelle: (f) => <span className="ov-num whitespace-nowrap text-ink-800">{f.ha ? ha(f.ha) : "–"}</span> },
        { id: "fortschritt", label: "Fortschritt", sortierbar: false, csv: false, wert: (f) => f.status, klasse: "min-w-[220px]", zelle: (f) => <Stepper art="flaeche" status={f.status} kompakt /> },
        { id: "naechstes", label: "Was jetzt passiert", sortierbar: false, standard: false, wert: (f) => statusInfo("flaeche", f.status).text, zelle: (f) => <span className="line-clamp-2 text-[13.5px] text-ink-600">{statusInfo("flaeche", f.status).text}</span> },
        { id: "aktualisiert", label: "Aktualisiert", wert: (f) => f.geaendertAm, zelle: (f) => <span className="whitespace-nowrap text-ink-500">{relativ(f.geaendertAm, jetzt)}</span> },
      ]}
      filter={[
        { id: "status", label: "Status", wert: (f) => f.status, optionen: Object.entries(PROZESSE.flaeche.status).map(([k, s]) => ({ wert: k, label: s.label })).filter((o) => flaechen.some((f) => f.status === o.wert)) },
        { id: "nutzung", label: "Nutzung", wert: (f) => (f.agri ? "agri" : "frei"), optionen: [{ wert: "agri", label: "Agri-PV" }, { wert: "frei", label: "Freifläche" }] },
      ]}
      leer={
        <LeerZustand
          art="flaeche"
          titel="Noch keine Fläche hinterlegt"
          text="Lage, Größe und – wenn zur Hand – die Flurstücke genügen. Wir melden uns mit einer ehrlichen Ersteinschätzung."
          aktion={<Button href="/portal/flaechen/neu" pfeil>Erste Fläche hinzufügen</Button>}
          zweite={<Button href="/rechner/pacht" variant="secondary">Pacht vorab berechnen</Button>}
        />
      }
    />
  );
}

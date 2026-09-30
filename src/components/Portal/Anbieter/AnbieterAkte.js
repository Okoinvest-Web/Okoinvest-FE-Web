"use client";

// Anbieter-Akte auf der Projektseite: Vermittlungsauftrag, Rückfragen des Backoffice, Anonymisierung, Interessenten &
// LOIs (Stellungnahme, Vorkenntnis) und – bei Bestandsanlagen – Ertragshistorie, Verträge, Förderung, technische DD.
// Daten: GET/POST /api/portal/anbieter/[projektId] (Backoffice: POST /api/admin/anbieter/[projektId]).

import { useState } from "react";
import { Badge, Karte } from "@/components/Portal/ui";
import Mandat from "./Mandat";
import Pruefpunkte, { Anonymitaet } from "./Pruefpunkte";
import Interessenten from "./Interessenten";
import Bestand from "./Bestand";

export default function AnbieterAkte({ akte: start }) {
  const [akte, setAkte] = useState(start);
  if (!akte) return null;
  if (akte.rolle === "investor") {
    return akte.projekt.bestandsanlage ? (
      <Karte id="bestand" titel="Bestandsanlage: Ist-Daten" untertitel="Angaben des Verkäufers – ungeprüft. Grundlage für Ihre technische und kaufmännische Due Diligence.">
        <Bestand akte={akte} setAkte={setAkte} />
      </Karte>
    ) : null;
  }
  const admin = akte.rolle === "admin";
  const offen = (akte.pruefpunkte || []).filter((x) => x.status === (admin ? "beantwortet" : "offen")).length;
  const lois = (akte.interessenten || []).filter((i) => i.votumMoeglich && !i.votum).length;
  return (
    <div id="anbieter" className="scroll-mt-24 space-y-6">
      <Karte titel="Vermittlungsauftrag" untertitel="Provisionsvereinbarung mit ÖkoInvest – einfacher Auftrag oder Exklusivität">
        <Mandat akte={akte} setAkte={setAkte} />
      </Karte>
      <Karte
        titel="Rückfragen & Nachbesserung"
        untertitel={admin ? "Prüfpunkte an den Anbieter – Pflichtpunkte sperren die Veröffentlichung" : "Prüfpunkte des Backoffice mit Frist"}
        aktion={offen ? <Badge ton="warn">{offen} {admin ? "zu prüfen" : "offen"}</Badge> : null}
      >
        <Pruefpunkte akte={akte} setAkte={setAkte} />
      </Karte>
      {["entwurf", "pruefung", "veroeffentlicht", "reserviert"].includes(akte.projekt.status) && (
        <Karte titel="Anonymisierung des Teasers" untertitel="Öffentlich sichtbar sind nur Titel, Region, Beschreibung und Highlights">
          <Anonymitaet akte={akte} />
        </Karte>
      )}
      <Karte titel="Interessenten & LOIs" untertitel={admin ? "Pseudonyme wie im Deal-Room, Stellungnahmen und Vorkenntnis-Meldungen des Verkäufers" : "Pseudonym bis zur Kontaktfreigabe – Stellungnahme zu LOIs und Vorkenntnis melden"} aktion={lois ? <Badge ton="warn">{lois} LOI ohne Stellungnahme</Badge> : null}>
        <Interessenten akte={akte} setAkte={setAkte} />
      </Karte>
      {akte.projekt.bestandsanlage && (
        <Karte id="bestand" className="scroll-mt-24" titel="Bestandsanlage: Ertragshistorie, Verträge, Förderung" untertitel="Investoren sehen diese Angaben nach der NDA-Freigabe (als Angaben des Verkäufers gekennzeichnet)">
          <Bestand akte={akte} setAkte={setAkte} />
        </Karte>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";

/**
 * Suchprofil-Kurzform für Investoren: Ticketgröße, Phasen, Länder und
 * Technologien auswählen – die Auswahl geht als `daten` mit der Anfrage
 * (typ "investor") an die Plattform.
 */

const TICKETS = [
  { id: "bis5", label: "bis 5 MWp" },
  { id: "5-20", label: "5–20 MWp" },
  { id: "20-50", label: "20–50 MWp" },
  { id: "ueber50", label: "über 50 MWp" },
];

export default function InvestorAnfrage({ phasen, dunkel = false }) {
  const [ticket, setTicket] = useState("5-20");
  const [gewaehltePhasen, setPhasen] = useState(["satzung", "rtb"]);
  const [laender, setLaender] = useState(["DE"]);
  const [technik, setTechnik] = useState(["freiflaeche"]);

  const umschalten = (liste, setListe, id) => setListe(liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>Ticketgröße</legend>
        <div className="flex flex-wrap gap-2">
          {TICKETS.map((t) => (
            <Chip key={t.id} typ="radio" name="ticket" aktiv={ticket === t.id} onChange={() => setTicket(t.id)} dunkel={dunkel}>
              {t.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>Phasen (Mehrfachauswahl)</legend>
        <div className="flex flex-wrap gap-2">
          {phasen.map((p) => (
            <Chip key={p.id} aktiv={gewaehltePhasen.includes(p.id)} onChange={() => umschalten(gewaehltePhasen, setPhasen, p.id)} dunkel={dunkel}>
              {p.kurz}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>Länder</legend>
          <div className="flex flex-wrap gap-2">
            {[
              ["DE", "Deutschland"],
              ["AT", "Österreich"],
              ["CH", "Schweiz"],
            ].map(([id, label]) => (
              <Chip key={id} aktiv={laender.includes(id)} onChange={() => umschalten(laender, setLaender, id)} dunkel={dunkel}>
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>Technologie</legend>
          <div className="flex flex-wrap gap-2">
            {[
              ["freiflaeche", "Freifläche"],
              ["agri", "Agri-PV"],
              ["speicher", "Speicher"],
              ["carport", "Parkplatz"],
            ].map(([id, label]) => (
              <Chip key={id} aktiv={technik.includes(id)} onChange={() => umschalten(technik, setTechnik, id)} dunkel={dunkel}>
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={cn("border-t pt-6", dunkel ? "border-white/10" : "border-ink-200")}>
        <AnfrageFormular
          typ="investor"
          dunkel={dunkel}
          rolle="investor"
          felder={["firma", "telefon", "nachricht"]}
          daten={{ ticket, phasen: gewaehltePhasen, laender, technologie: technik }}
          button="Suchprofil senden"
          erfolgText="Danke! Ihr Suchprofil ist eingegangen. Wir melden uns, sobald ein passendes Projekt verfügbar ist – oft bevor es öffentlich in der Börse steht."
        />
      </div>
    </div>
  );
}

function Chip({ typ = "checkbox", name, aktiv, onChange, dunkel, children }) {
  return (
    <label
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center rounded-full px-4 text-[13.5px] font-semibold ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
        aktiv
          ? "bg-ov-600 text-white ring-ov-600"
          : dunkel
            ? "bg-white/[0.06] text-white/80 ring-white/15 hover:bg-white/10"
            : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
      )}
    >
      <input type={typ} name={name} checked={aktiv} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

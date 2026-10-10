"use client";

import { useSeitenLand } from "@/components/Land/LandKontext";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

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

const TEXTE = {
  de: {
    ticket: "Ticketgröße",
    tickets: TICKETS.map((t) => t.label),
    phasen: "Phasen (Mehrfachauswahl)",
    laender: "Länder",
    laenderNamen: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" },
    technologie: "Technologie",
    technik: { freiflaeche: "Freifläche", agri: "Agri-PV", speicher: "Speicher", carport: "Parkplatz" },
    button: "Suchprofil senden",
    erfolg: "Danke! Ihr Suchprofil ist eingegangen. Wir melden uns, sobald ein passendes Projekt verfügbar ist – oft bevor es öffentlich in der Börse steht.",
  },
  en: {
    ticket: "Ticket size",
    tickets: ["up to 5 MWp", "5–20 MWp", "20–50 MWp", "over 50 MWp"],
    phasen: "Stages (multiple choice)",
    laender: "Countries",
    laenderNamen: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
    technologie: "Technology",
    technik: { freiflaeche: "Ground-mounted", agri: "Agrivoltaics", speicher: "Storage", carport: "Car park" },
    button: "Send search profile",
    erfolg: "Thank you! Your search profile has been received. We will get in touch as soon as a suitable project is available – often before it is listed publicly on the exchange.",
  },
};

export default function InvestorAnfrage({ phasen, dunkel = false }) {
  const sprache = useSprache();
  const t = uebersetze(TEXTE, sprache, useSeitenLand()); // Schweiz: ohne „ß“
  const [ticket, setTicket] = useState("5-20");
  const [gewaehltePhasen, setPhasen] = useState(["satzung", "rtb"]);
  const [laender, setLaender] = useState(["DE"]);
  const [technik, setTechnik] = useState(["freiflaeche"]);

  const umschalten = (liste, setListe, id) => setListe(liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>{t.ticket}</legend>
        <div className="flex flex-wrap gap-2">
          {TICKETS.map((k, i) => (
            <Chip key={k.id} typ="radio" name="ticket" aktiv={ticket === k.id} onChange={() => setTicket(k.id)} dunkel={dunkel}>
              {t.tickets[i]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>{t.phasen}</legend>
        <div className="flex flex-wrap gap-2">
          {phasen.map((p) => (
            <Chip key={p.id} aktiv={gewaehltePhasen.includes(p.id)} onChange={() => umschalten(gewaehltePhasen, setPhasen, p.id)} dunkel={dunkel}>
              {sprache === "en" ? BEGRIFFE_EN.phaseKurz[p.id] ?? p.kurz : p.kurz}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>{t.laender}</legend>
          <div className="flex flex-wrap gap-2">
            {["DE", "AT", "CH"].map((id) => [id, t.laenderNamen[id]]).map(([id, label]) => (
              <Chip key={id} aktiv={laender.includes(id)} onChange={() => umschalten(laender, setLaender, id)} dunkel={dunkel}>
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={cn("mb-2.5 text-[14px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>{t.technologie}</legend>
          <div className="flex flex-wrap gap-2">
            {["freiflaeche", "agri", "speicher", "carport"].map((id) => [id, t.technik[id]]).map(([id, label]) => (
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
          land={laender.length === 1 ? laender[0] : undefined} // Paket C: eindeutiges Zielland → kontakt.land (Routing je Land)
          felder={["firma", "telefon", "nachricht"]}
          daten={{ ticket, phasen: gewaehltePhasen, laender, technologie: technik }}
          button={t.button}
          erfolgText={t.erfolg}
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

"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { useTexte } from "@/components/Sprache/SpracheKontext";

/**
 * Anfrage zu Bestandsanlagen (Verkauf oder Kauf). Geht als typ="projekt"
 * mit daten.phase="cod" an /api/anfrage.
 */
const GRUPPEN = [
  {
    id: "absicht",
    legende: "Ihr Anliegen",
    optionen: [
      { id: "verkaufen", label: "Anlage verkaufen" },
      { id: "bewerten", label: "Nur bewerten lassen" },
      { id: "kaufen", label: "Bestand kaufen" },
    ],
  },
  {
    id: "anlagentyp",
    legende: "Anlage",
    optionen: [
      { id: "freiflaeche", label: "Freifläche" },
      { id: "dach", label: "Dach" },
      { id: "agri", label: "Agri-PV" },
      { id: "portfolio", label: "Portfolio" },
    ],
  },
  {
    id: "groesse",
    legende: "Leistung",
    optionen: [
      { id: "unter-1", label: "unter 1 MWp" },
      { id: "1-10", label: "1–10 MWp" },
      { id: "10+", label: "über 10 MWp" },
    ],
  },
  {
    id: "land",
    legende: "Land",
    optionen: [
      { id: "DE", label: "Deutschland" },
      { id: "AT", label: "Österreich" },
      { id: "CH", label: "Schweiz" },
    ],
  },
];

const TEXTE = {
  de: {
    gruppen: GRUPPEN,
    suchprofil: "Ihr Suchprofil",
    anlage: "Ihre Anlage",
    textKaufen: "Nennen Sie Größe, Region und Renditeerwartung – wir melden uns, sobald eine passende Bestandsanlage in die Börse kommt.",
    textVerkaufen: "Inbetriebnahmejahr, Leistung, Vergütung und – wenn zur Hand – Ertragsdaten der letzten Jahre bitte in die Nachricht.",
    buttonKaufen: "Suchprofil senden",
    buttonVerkaufen: "Anlage vorstellen",
    erfolg: "Danke! Ihre Anfrage ist eingegangen. Wir melden uns persönlich – registrieren Sie sich mit derselben E-Mail, dann sehen Sie den Stand im Portal.",
  },
  en: {
    gruppen: [
      { legende: "Your request", optionen: [{ label: "Sell a plant" }, { label: "Valuation only" }, { label: "Buy operating assets" }] },
      { legende: "Plant", optionen: [{ label: "Ground-mounted" }, { label: "Rooftop" }, { label: "Agrivoltaics" }, { label: "Portfolio" }] },
      { legende: "Capacity", optionen: [{ label: "under 1 MWp" }, { label: "1–10 MWp" }, { label: "over 10 MWp" }] },
      { legende: "Country", optionen: [{ label: "Germany" }, { label: "Austria" }, { label: "Switzerland" }] },
    ],
    suchprofil: "Your search profile",
    anlage: "Your plant",
    textKaufen: "Tell us the size, region and expected return – we will get in touch as soon as a suitable operating plant comes onto the exchange.",
    textVerkaufen: "Please include the year of commissioning, capacity, remuneration and – if to hand – yield data from recent years in your message.",
    buttonKaufen: "Send search profile",
    buttonVerkaufen: "Present your plant",
    erfolg: "Thank you! Your enquiry has been received. We will get back to you personally – register with the same e-mail address to see the status in the portal.",
  },
};

export default function BestandAnfrage() {
  const t = useTexte(TEXTE);
  const [werte, setWerte] = useState(() => Object.fromEntries(GRUPPEN.map((g) => [g.id, g.optionen[0].id])));
  const kaufen = werte.absicht === "kaufen";

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[22px] font-bold text-ink-900">{kaufen ? t.suchprofil : t.anlage}</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">
          {kaufen ? t.textKaufen : t.textVerkaufen}
        </p>
      </div>
      {t.gruppen.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-2.5 text-[14px] font-semibold text-ink-800">{g.legende}</legend>
          <div className="flex flex-wrap gap-2">
            {g.optionen.map((o) => {
              const aktiv = werte[g.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "inline-flex min-h-10 cursor-pointer items-center rounded-full px-4 text-[13.5px] font-semibold ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                    aktiv ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
                  )}
                >
                  <input type="radio" name={`bestand-${g.id}`} checked={aktiv} onChange={() => setWerte((w) => ({ ...w, [g.id]: o.id }))} className="sr-only" />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="border-t border-ink-200 pt-6">
        <AnfrageFormular
          typ="projekt"
          daten={{ phase: "cod", quelle: "bestandsanlagen", ...werte }}
          felder={["firma", "telefon", "land", "nachricht"]}
          button={kaufen ? t.buttonKaufen : t.buttonVerkaufen}
          erfolgText={t.erfolg}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { useTexte } from "@/components/Sprache/SpracheKontext";

/**
 * Anfrage für Dachflächen: Chips (Dachart, Größe, Interesse) vor dem
 * einheitlichen Anfrageformular. Geht als typ="flaeche" mit daten.art="dach"
 * an /api/anfrage.
 */
const GRUPPEN = [
  {
    id: "dachart",
    legende: "Dachart",
    optionen: [
      { id: "trapez", label: "Trapezblech" },
      { id: "sandwich", label: "Sandwichpaneel" },
      { id: "flach", label: "Flachdach" },
      { id: "faserzement", label: "Faserzement" },
      { id: "unbekannt", label: "Weiß ich nicht" },
    ],
  },
  {
    id: "groesse",
    legende: "Dachfläche ungefähr",
    optionen: [
      { id: "1000-3000", label: "1.000–3.000 m²" },
      { id: "3000-10000", label: "3.000–10.000 m²" },
      { id: "10000+", label: "über 10.000 m²" },
      { id: "unter-1000", label: "unter 1.000 m²" },
    ],
  },
  {
    id: "gebaeude",
    legende: "Gebäude",
    optionen: [
      { id: "gewerbe", label: "Gewerbe / Produktion" },
      { id: "logistik", label: "Logistik / Lager" },
      { id: "landwirtschaft", label: "Landwirtschaft" },
      { id: "handel", label: "Handel" },
      { id: "sonstiges", label: "Sonstiges" },
    ],
  },
  {
    id: "interesse",
    legende: "Was interessiert Sie?",
    mehrfach: true,
    start: ["pacht"],
    optionen: [
      { id: "pacht", label: "Dachpacht" },
      { id: "einmal", label: "Einmalzahlung" },
      { id: "ppa", label: "Günstiger Dachstrom" },
      { id: "sanierung", label: "Dachsanierung" },
      { id: "eigen", label: "Eigene Anlage" },
    ],
  },
];

/** Sprachmodell: Texte (en nur Texte, Listen je Index; ids bleiben). */
const TEXTE = {
  de: {
    gruppen: GRUPPEN,
    titel: "Ihr Dach",
    text: "Drei Klicks, dann Ihre Kontaktdaten. Adresse und – falls vorhanden – Baujahr, letzte Sanierung und Statikunterlagen gern in die Nachricht.",
    button: "Dach vorstellen",
    erfolg: "Danke! Ihr Dach ist bei uns eingegangen. Wir melden uns persönlich – registrieren Sie sich mit derselben E-Mail, dann sehen Sie den Stand im Portal.",
  },
  en: {
    gruppen: [
      { legende: "Roof type", optionen: [{ label: "Trapezoidal sheet" }, { label: "Sandwich panel" }, { label: "Flat roof" }, { label: "Fibre cement" }, { label: "Don’t know" }] },
      { legende: "Approximate roof area", optionen: [{ label: "1,000–3,000 m²" }, { label: "3,000–10,000 m²" }, { label: "over 10,000 m²" }, { label: "under 1,000 m²" }] },
      { legende: "Building", optionen: [{ label: "Commercial / production" }, { label: "Logistics / warehouse" }, { label: "Agriculture" }, { label: "Retail" }, { label: "Other" }] },
      { legende: "What are you interested in?", optionen: [{ label: "Roof lease" }, { label: "One-off payment" }, { label: "Low-cost rooftop power" }, { label: "Roof renovation" }, { label: "Own installation" }] },
    ],
    titel: "Your roof",
    text: "Three clicks, then your contact details. Feel free to add the address and – if available – year of construction, last renovation and structural documents in the message.",
    button: "Present your roof",
    erfolg: "Thank you! We have received your roof details. We will get back to you personally – register with the same email address to see the status in the portal.",
  },
};

export default function DachAnfrage() {
  const w = useTexte(TEXTE);
  const [werte, setWerte] = useState(() => Object.fromEntries(GRUPPEN.map((g) => [g.id, g.start ?? (g.mehrfach ? [] : g.optionen[0].id)])));

  const waehle = (g, id) =>
    setWerte((w) => {
      if (!g.mehrfach) return { ...w, [g.id]: id };
      const liste = w[g.id] || [];
      return { ...w, [g.id]: liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id] };
    });

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-[22px] font-bold text-ink-900">{w.titel}</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{w.text}</p>
      </div>
      {w.gruppen.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-2.5 text-[14px] font-semibold text-ink-800">{g.legende}</legend>
          <div className="flex flex-wrap gap-2">
            {g.optionen.map((o) => {
              const aktiv = g.mehrfach ? (werte[g.id] || []).includes(o.id) : werte[g.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "ov-press inline-flex min-h-10 cursor-pointer items-center rounded-full px-4 text-[13.5px] font-semibold ring-1 transition-[color,background-color,box-shadow,transform] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                    aktiv ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
                  )}
                >
                  <input type={g.mehrfach ? "checkbox" : "radio"} name={`dach-${g.id}`} checked={aktiv} onChange={() => waehle(g, o.id)} className="sr-only" />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="border-t border-ink-200 pt-6">
        <AnfrageFormular
          typ="flaeche"
          daten={{ art: "dach", quelle: "dachflaeche-verpachten", ...werte }}
          felder={["firma", "telefon", "plz", "ort", "land", "nachricht"]}
          button={w.button}
          erfolgText={w.erfolg}
        />
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";

/**
 * Anfrage zum Reststrom-Pool: fachliche Eckdaten (Verbrauch, Preis,
 * Vertragsende, Messart) + einheitliches Anfrageformular (typ="reststrom").
 */
export default function ReststromAnfrage() {
  const id = useId();
  const [verbrauch, setVerbrauch] = useState("");
  const [preis, setPreis] = useState("");
  const [vertragsende, setVertragsende] = useState("");
  const [messung, setMessung] = useState("rlm");

  const feld =
    "block h-12 w-full rounded-xl bg-white px-4 text-[15px] text-ink-900 outline-none ring-1 ring-ink-200 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500";
  const label = "mb-1.5 block text-[13.5px] font-semibold text-ink-700";

  return (
    <div className="space-y-6">
      <fieldset className="rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70">
        <legend className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">Ihr Strombezug (optional)</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-v`} className={label}>Jahresverbrauch in MWh</label>
            <input id={`${id}-v`} inputMode="decimal" placeholder="z. B. 450" value={verbrauch} onChange={(e) => setVerbrauch(e.target.value)} className={feld} />
          </div>
          <div>
            <label htmlFor={`${id}-p`} className={label}>Aktueller Preis in ct/kWh netto</label>
            <input id={`${id}-p`} inputMode="decimal" placeholder="z. B. 22,5" value={preis} onChange={(e) => setPreis(e.target.value)} className={feld} />
          </div>
          <div>
            <label htmlFor={`${id}-e`} className={label}>Vertragsende</label>
            <input id={`${id}-e`} type="month" value={vertragsende} onChange={(e) => setVertragsende(e.target.value)} className={feld} />
          </div>
          <div>
            <label htmlFor={`${id}-m`} className={label}>Messung</label>
            <select id={`${id}-m`} value={messung} onChange={(e) => setMessung(e.target.value)} className={feld}>
              <option value="rlm">Lastgangmessung (RLM)</option>
              <option value="slp">Standardlastprofil (SLP)</option>
              <option value="unbekannt">weiß ich nicht</option>
            </select>
          </div>
        </div>
      </fieldset>

      <AnfrageFormular
        typ="reststrom"
        felder={["firma", "telefon", "plz", "land", "nachricht"]}
        button="Pool-Angebot anfragen"
        erfolgText="Danke! Wir prüfen Ihre Angaben und melden uns in der Regel innerhalb von zwei Werktagen – bei Bedarf mit einer Vollmacht für den Lastgangabruf beim Netzbetreiber."
        daten={{
          verbrauchMwh: verbrauch || null,
          arbeitspreisCt: preis || null,
          vertragsende: vertragsende || null,
          messung,
        }}
      />
    </div>
  );
}

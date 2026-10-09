"use client";

import { useId, useState } from "react";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { useTexte } from "@/components/Sprache/SpracheKontext";

/* Sprachmodell: feste Texte je Sprache (Werte der Auswahl bleiben gleich) */
const TEXTE = {
  de: { legende: "Ihr Strombezug (optional)", verbrauch: "Jahresverbrauch in MWh", verbrauchBsp: "z. B. 450", preis: "Aktueller Preis in ct/kWh netto", preisBsp: "z. B. 22,5", ende: "Vertragsende", messung: "Messung", rlm: "Lastgangmessung (RLM)", slp: "Standardlastprofil (SLP)", unbekannt: "weiß ich nicht", button: "Pool-Angebot anfragen", erfolg: "Danke! Wir prüfen Ihre Angaben und melden uns bei Ihnen – bei Bedarf mit einer Vollmacht für den Lastgangabruf beim Netzbetreiber." },
  en: { legende: "Your power consumption (optional)", verbrauch: "Annual consumption in MWh", verbrauchBsp: "e.g. 450", preis: "Current price in ct/kWh, net", preisBsp: "e.g. 22.5", ende: "Contract end", messung: "Metering", rlm: "Interval metering (RLM, registered load profile)", slp: "Standard load profile (SLP)", unbekannt: "I don’t know", button: "Request a pool offer", erfolg: "Thank you! We will review your details and get back to you – if needed, with a power of attorney to retrieve your load profile from the grid operator." },
};

/**
 * Anfrage zum Reststrom-Pool: fachliche Eckdaten (Verbrauch, Preis,
 * Vertragsende, Messart) + einheitliches Anfrageformular (typ="reststrom").
 * Paket C: Land wählbar (PLZ-Regel je Land), keine Zeitzusage im Erfolgstext (erst nach gemessenem Nachweis, Masterplan Abschnitt 5).
 */
export default function ReststromAnfrage() {
  const id = useId();
  const t = useTexte(TEXTE);
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
        <legend className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">{t.legende}</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-v`} className={label}>{t.verbrauch}</label>
            <input id={`${id}-v`} inputMode="decimal" placeholder={t.verbrauchBsp} value={verbrauch} onChange={(e) => setVerbrauch(e.target.value)} className={feld} />
          </div>
          <div>
            <label htmlFor={`${id}-p`} className={label}>{t.preis}</label>
            <input id={`${id}-p`} inputMode="decimal" placeholder={t.preisBsp} value={preis} onChange={(e) => setPreis(e.target.value)} className={feld} />
          </div>
          <div>
            <label htmlFor={`${id}-e`} className={label}>{t.ende}</label>
            <input id={`${id}-e`} type="month" value={vertragsende} onChange={(e) => setVertragsende(e.target.value)} className={feld} />
          </div>
          <div>
            <label htmlFor={`${id}-m`} className={label}>{t.messung}</label>
            <select id={`${id}-m`} value={messung} onChange={(e) => setMessung(e.target.value)} className={feld}>
              <option value="rlm">{t.rlm}</option>
              <option value="slp">{t.slp}</option>
              <option value="unbekannt">{t.unbekannt}</option>
            </select>
          </div>
        </div>
      </fieldset>

      <AnfrageFormular
        typ="reststrom"
        felder={["firma", "telefon", "plz", "land", "nachricht"]}
        button={t.button}
        erfolgText={t.erfolg}
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

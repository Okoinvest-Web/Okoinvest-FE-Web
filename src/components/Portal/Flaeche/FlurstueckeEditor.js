"use client";

// Flurstücke je Land: DE Gemarkung/Flur/Zähler-Nenner/Grundbuchblatt, AT KG-Nr./Grundstücksnummer/EZ,
// CH Gemeinde/Parzelle/E-GRID – mit Formatprüfung am Feld und Summenflächen-Plausibilisierung.
// Die gleiche Prüfung läuft auf dem Server (flaecheFach.js bzw. flaeche_fach.py).

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { FLURSTUECK_FELDER, flurstueckFehler, summenPruefung } from "@/lib/plattform/flaecheFach";
import { eingabe } from "../felder";

const REIHENFOLGE = ["gemarkung", "gemarkungNr", "flur", "nummer", "grundbuch", "blatt", "egrid", "m2"];

export const leeresFlurstueck = (vorlage = {}) => ({ gemarkung: vorlage.gemarkung || "", gemarkungNr: vorlage.gemarkungNr || "", flur: "", nummer: "", grundbuch: vorlage.grundbuch || "", blatt: "", egrid: "", m2: "" });

const HILFE = {
  DE: "Die Angaben stehen im Grundbuchauszug (Bestandsverzeichnis) bzw. im Auszug aus dem Liegenschaftskataster. In Bayern gibt es keine Fluren – Feld leer lassen.",
  AT: "Die Angaben stehen im Grundbuchsauszug (A1-Blatt): Katastralgemeinde mit fünfstelliger KG-Nummer, Einlagezahl (EZ) und Grundstücksnummer. Bauflächen beginnen mit einem Punkt („.12“).",
  CH: "Die Angaben stehen im Grundbuchauszug oder im kantonalen Geoportal: Parzellennummer und eidgenössischer Grundstücksidentifikator (E-GRID).",
};

export default function FlurstueckeEditor({ land = "DE", liste, onChange, ha }) {
  const id = useId();
  const def = FLURSTUECK_FELDER[land] || FLURSTUECK_FELDER.DE;
  const felder = REIHENFOLGE.filter((k) => def[k]);
  const setze = (i, k, v) => onChange(liste.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const gefuellt = (s) => felder.some((k) => String(s[k] ?? "").trim());
  const normiert = (s) => ({ ...s, nummer: String(s.nummer || "").replace(/\s/g, ""), gemarkungNr: String(s.gemarkungNr || "").replace(/\s/g, ""), blatt: String(s.blatt || "").replace(/\s/g, ""), flur: String(s.flur || "").replace(/\s/g, ""), egrid: String(s.egrid || "").replace(/\s/g, "").toUpperCase() });
  const m2 = (w) => {
    const s = String(w ?? "").replace(/\s|m²/g, "");
    const n = Number(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const gefuellte = liste.filter(gefuellt).map((s) => ({ ...s, m2: m2(s.m2) }));
  const summe = summenPruefung(gefuellte, Number(String(ha ?? "").replace(",", ".")));

  return (
    <div>
      <p className="mb-3 text-[13.5px] leading-relaxed text-ink-500">{HILFE[land] || HILFE.DE}</p>
      <ol className="space-y-3">
        {liste.map((s, i) => {
          const fehler = gefuellt(s) ? flurstueckFehler(normiert(s), land) : [];
          const fehlerVon = (k) => fehler.find((x) => x.feld === k)?.text;
          return (
            <li key={i} className="rounded-2xl bg-white p-3 ring-1 ring-inset ring-ink-200/80">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink-700">Flurstück {i + 1}</p>
                <button
                  type="button"
                  onClick={() => onChange(liste.length > 1 ? liste.filter((_, j) => j !== i) : [leeresFlurstueck()])}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-800"
                  aria-label={`Flurstück ${i + 1} entfernen`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {felder.map((k) => {
                  const fid = `${id}-${i}-${k}`;
                  const f = fehlerVon(k);
                  return (
                    <div key={k} className={cn("min-w-0", k === "gemarkung" || k === "egrid" ? "col-span-2" : "")}>
                      <label htmlFor={fid} className="mb-1 block text-[12px] font-semibold text-ink-600">
                        {def[k].label}
                        {def[k].pflicht && <span aria-hidden="true"> *</span>}
                      </label>
                      <input
                        id={fid}
                        inputMode={["gemarkung", "grundbuch", "egrid"].includes(k) ? undefined : k === "nummer" && land === "CH" ? undefined : "numeric"}
                        placeholder={def[k].platzhalter || ""}
                        className={cn(eingabe, "h-11 text-[14.5px]", f && "ring-2 ring-red-300")}
                        value={s[k] ?? ""}
                        onChange={(e) => setze(i, k, e.target.value)}
                        aria-invalid={f ? true : undefined}
                        aria-describedby={f ? `${fid}-f` : undefined}
                      />
                      {f && <p id={`${fid}-f`} className="mt-1 text-[12px] font-medium text-red-700">{f}</p>}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      {liste.length < 50 && (
        <button type="button" onClick={() => onChange([...liste, leeresFlurstueck(liste.at(-1))])} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
          <Plus aria-hidden="true" className="h-4 w-4" /> Flurstück hinzufügen
        </button>
      )}
      {summe.stufe && (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ring-1 ring-inset",
            summe.stufe === "ok" ? "bg-ov-50 text-ov-900 ring-ov-200" : summe.stufe === "fehler" ? "bg-ink-900 text-white ring-ink-900" : summe.stufe === "warnung" ? "bg-sun-300/20 text-ink-900 ring-sun-400/40" : "bg-navy-50 text-navy-900 ring-navy-100"
          )}
        >
          {summe.text}
        </p>
      )}
    </div>
  );
}

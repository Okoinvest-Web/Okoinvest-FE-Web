"use client";

// Strukturierte Anfrage für Kommunen (Gemeinde, Stadtwerk, Landkreis) auf /kommunen.
// Die Angaben gehen als `daten` mit typ „kommune“ an /api/anfrage; der Server übernimmt sie über eine
// Positivliste (src/lib/plattform/kommune.js) und prüft den Gemeindeschlüssel je Land.

import { useId, useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { BAULEITPLANUNG_STAND, BUERGERBETEILIGUNG, KOMMUNE_ABSENDER, KOMMUNE_ROLLE, KOMMUNE_THEMEN, KRITERIENKATALOG } from "@/lib/plattform/kommune";
import { GEMEINDE_SCHLUESSEL } from "@/lib/plattform/flaecheFach";
import { KOMMUNE } from "@/lib/invest/markt";

const LAENDER = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const feld = "block h-12 w-full min-w-0 rounded-xl bg-white px-4 text-[15px] text-ink-900 outline-none ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500";
const label = "mb-1.5 block text-[13.5px] font-semibold text-ink-700";

function Chips({ legende, optionen, wert, mehrfach = false, onChange, name }) {
  const aktiv = (k) => (mehrfach ? (wert || []).includes(k) : wert === k);
  const waehle = (k) => (mehrfach ? onChange(aktiv(k) ? wert.filter((x) => x !== k) : [...(wert || []), k]) : onChange(k));
  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold text-ink-800">{legende}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(optionen).map(([k, l]) => (
          <label
            key={k}
            className={cn(
              "inline-flex min-h-10 cursor-pointer items-center rounded-full px-4 text-[13.5px] font-semibold ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
              aktiv(k) ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
            )}
          >
            <input type={mehrfach ? "checkbox" : "radio"} name={name} checked={aktiv(k)} onChange={() => waehle(k)} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function KommuneAnfrage() {
  const id = useId();
  const [d, setD] = useState({ land: "DE", absender: "gemeinde", gemeinde: "", gemeindeSchluessel: "", rolle: "", gemeindeFlaechenHa: "", interesse6: "", buergerbeteiligung: [], bauleitplanung: "", kriterienkatalog: "", themen: ["solarpark"] });
  const setze = (k) => (w) => setD((x) => ({ ...x, [k]: w }));
  const gs = GEMEINDE_SCHLUESSEL[d.land];
  const gsFehler = d.gemeindeSchluessel && !gs.muster.test(d.gemeindeSchluessel.replace(/\s/g, "")) ? gs.fehler : "";
  const daten = { ...d, gemeindeSchluessel: gsFehler ? "" : d.gemeindeSchluessel.replace(/\s/g, "") };

  return (
    <div className="space-y-6">
      <Chips legende="Sie schreiben für" name={`${id}-abs`} optionen={KOMMUNE_ABSENDER} wert={d.absender} onChange={setze("absender")} />
      <Chips legende="Land" name={`${id}-land`} optionen={LAENDER} wert={d.land} onChange={(l) => setD((x) => ({ ...x, land: l, interesse6: l === "DE" ? x.interesse6 : "" }))} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-g`} className={label}>Gemeinde / Stadt *</label>
          <input id={`${id}-g`} className={feld} value={d.gemeinde} onChange={(e) => setze("gemeinde")(e.target.value)} placeholder="z. B. Musterstadt" maxLength={120} />
        </div>
        <div>
          <label htmlFor={`${id}-gs`} className={label}>{gs.label}</label>
          <input id={`${id}-gs`} inputMode="numeric" className={cn(feld, gsFehler && "ring-2 ring-danger-300")} value={d.gemeindeSchluessel} onChange={(e) => setze("gemeindeSchluessel")(e.target.value)} placeholder="optional" aria-invalid={gsFehler ? true : undefined} aria-describedby={`${id}-gs-h`} />
          <p id={`${id}-gs-h`} className={cn("mt-1.5 text-[12.5px]", gsFehler ? "font-medium text-danger-700" : "text-ink-500")}>{gsFehler || "Hilft uns, Projekte eindeutig Ihrem Gebiet zuzuordnen."}</p>
        </div>
        <div>
          <label htmlFor={`${id}-r`} className={label}>Ihre Funktion</label>
          <select id={`${id}-r`} className={feld} value={d.rolle} onChange={(e) => setze("rolle")(e.target.value)}>
            <option value="">Bitte wählen</option>
            {Object.entries(KOMMUNE_ROLLE).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-ha`} className={label}>Flächen im Gemeindeeigentum (ha)</label>
          <input id={`${id}-ha`} inputMode="decimal" className={feld} value={d.gemeindeFlaechenHa} onChange={(e) => setze("gemeindeFlaechenHa")(e.target.value)} placeholder="optional, grob" />
        </div>
        <div>
          <label htmlFor={`${id}-bp`} className={label}>Stand der Planung</label>
          <select id={`${id}-bp`} className={feld} value={d.bauleitplanung} onChange={(e) => setze("bauleitplanung")(e.target.value)}>
            <option value="">Bitte wählen</option>
            {Object.entries(BAULEITPLANUNG_STAND).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-kk`} className={label}>Kriterienkatalog für Freiflächen-PV</label>
          <select id={`${id}-kk`} className={feld} value={d.kriterienkatalog} onChange={(e) => setze("kriterienkatalog")(e.target.value)}>
            <option value="">Bitte wählen</option>
            {Object.entries(KRITERIENKATALOG).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {d.land === "DE" && (
        <Chips
          legende={`Interesse an der Beteiligung nach § 6 EEG (bis ${String(KOMMUNE.beteiligungCt).replace(".", ",")} ct/kWh)?`}
          name={`${id}-p6`}
          optionen={{ ja: "Ja", nein: "Nein", unbekannt: "Noch offen" }}
          wert={d.interesse6}
          onChange={setze("interesse6")}
        />
      )}
      <Chips legende="Bürgerbeteiligung – was schwebt Ihnen vor?" name={`${id}-bb`} optionen={BUERGERBETEILIGUNG} wert={d.buergerbeteiligung} mehrfach onChange={setze("buergerbeteiligung")} />
      <Chips legende="Themen" name={`${id}-th`} optionen={KOMMUNE_THEMEN} wert={d.themen} mehrfach onChange={setze("themen")} />

      <div className="border-t border-ink-200 pt-6">
        {!d.gemeinde.trim() && <p className="mb-4 rounded-xl bg-sand-50 px-4 py-3 text-[13.5px] text-ink-700 ring-1 ring-inset ring-ink-200">Bitte oben den Namen der Gemeinde angeben – dann können Sie absenden.</p>}
        <fieldset disabled={!d.gemeinde.trim()} className="disabled:opacity-60">
          <AnfrageFormular typ="kommune" felder={["firma", "telefon", "plz", "ort", "nachricht"]} daten={daten} button="Gespräch anfragen" erfolgText="Danke! Wir bestätigen Ihre Gemeinde über die Verwaltung und melden uns mit einem Terminvorschlag. Nach der Registrierung sehen Sie im Portal die Projekte in Ihrem Gebiet." rolle="unternehmen" />
        </fieldset>
      </div>
    </div>
  );
}

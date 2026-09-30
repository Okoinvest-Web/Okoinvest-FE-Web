"use client";

// Backoffice: vollständiges Pachtangebot erfassen (Übergang „Pachtangebot senden“).
// Gleiche Punkte wie der Pachtangebot-Check (/rechner/pachtangebot-check) – der Eigentümer sieht sie
// im Portal als Angebotsbogen mit Ampel. Pflicht: Laufzeit + Pacht je ha bzw. Umsatzanteil (Server prüft).

import { useId } from "react";
import { INDEX_ARTEN, LAUFZEIT_BEGINN, PACHT_MODELLE, PACHT_OPTIONEN } from "@/lib/plattform/flaecheFach";
import { eingabe, textbereich, auswahlfeld, Feld } from "../felder";

function Auswahl({ id, label, werte, feld, setze, optionen, leer = "Nicht geregelt", hinweis, pflicht }) {
  return (
    <Feld id={id} label={label} hinweis={hinweis} pflicht={pflicht}>
      <select id={id} className={auswahlfeld} value={werte[feld] ?? ""} onChange={(e) => setze(feld, e.target.value)}>
        {leer !== null && <option value="">{leer}</option>}
        {Object.entries(optionen).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </Feld>
  );
}

function Zahl({ id, label, werte, feld, setze, hinweis, pflicht }) {
  return (
    <Feld id={id} label={label} hinweis={hinweis} pflicht={pflicht}>
      <input id={id} inputMode="decimal" className={eingabe} value={werte[feld] ?? ""} onChange={(e) => setze(feld, e.target.value)} />
    </Feld>
  );
}

export default function PachtangebotFelder({ werte, setze }) {
  const id = useId();
  const m = werte.modell || "fest";
  const p = { werte, setze };
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">Vergütung</legend>
        <Auswahl id={`${id}-m`} label="Modell" feld="modell" optionen={PACHT_MODELLE} leer={null} {...p} />
        {m === "fest" && <Zahl id={`${id}-e`} label="Pacht €/ha und Jahr" feld="euroProHaJahr" pflicht {...p} />}
        {m !== "fest" && <Zahl id={`${id}-u`} label="Umsatzanteil in %" feld="umsatzProzent" pflicht {...p} hinweis="Bezug (Netto-Erlös, Marktprämie) im Text erläutern" />}
        {m === "kombi" && <Zahl id={`${id}-mi`} label="Mindestpacht €/ha" feld="mindestProHa" pflicht {...p} />}
        {m !== "umsatz" && <Auswahl id={`${id}-i`} label="Wertsicherung" feld="indexierung" optionen={INDEX_ARTEN} {...p} />}
        {werte.indexierung === "fest" && <Zahl id={`${id}-is`} label="Steigerung % p. a." feld="indexSatzProzent" {...p} />}
        <Zahl id={`${id}-r`} label="Reservierungsprämie €/ha·a" feld="reservierungProHaJahr" hinweis="bis Baubeginn" {...p} />
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">Laufzeit</legend>
        <Zahl id={`${id}-l`} label="Feste Laufzeit (Jahre)" feld="laufzeitJahre" pflicht {...p} />
        <Auswahl id={`${id}-lb`} label="Laufzeit beginnt" feld="laufzeitBeginn" optionen={LAUFZEIT_BEGINN} {...p} />
        <Zahl id={`${id}-vj`} label="Verlängerungsoptionen (Jahre gesamt)" feld="verlaengerungJahre" {...p} />
        <Feld id={`${id}-v`} label="Optionen als Text" hinweis="z. B. „2 × 5 Jahre Option“">
          <input id={`${id}-v`} className={eingabe} value={werte.verlaengerung ?? ""} onChange={(e) => setze("verlaengerung", e.target.value)} />
        </Feld>
        <Zahl id={`${id}-of`} label="Späteste Frist bis Baubeginn (Jahre)" feld="optionsfristJahre" hinweis="0 = unbegrenzt" {...p} />
        <Zahl id={`${id}-vl`} label="Erwarteter Vorlauf (Jahre)" feld="vorlaufJahre" {...p} />
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">Bis zum Baubeginn &amp; Nichtbau</legend>
        <Auswahl id={`${id}-bw`} label="Bewirtschaftung bis Baubeginn" feld="bewirtschaftung" optionen={PACHT_OPTIONEN.bewirtschaftung} {...p} />
        <Auswahl id={`${id}-k`} label="Rücktrittsrecht des Pächters" feld="kuendigung" optionen={PACHT_OPTIONEN.kuendigung} {...p} />
        <Auswahl id={`${id}-nb`} label="Wenn nicht gebaut wird" feld="nichtbau" optionen={PACHT_OPTIONEN.nichtbau} {...p} />
        {werte.nichtbau === "entschaedigung" && <Zahl id={`${id}-nbe`} label="Entschädigung €/ha" feld="nichtbauEuroProHa" {...p} />}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">Sicherheit &amp; Grundbuch</legend>
        <Auswahl id={`${id}-rb`} label="Rückbausicherheit" feld="rueckbau" optionen={PACHT_OPTIONEN.rueckbau} {...p} />
        <Auswahl id={`${id}-ra`} label="Sicherheit liegt vor" feld="rueckbauAb" optionen={PACHT_OPTIONEN.rueckbauAb} {...p} />
        <Zahl id={`${id}-rh`} label="Höhe der Rückbausicherheit €" feld="rueckbauEuro" {...p} />
        <Auswahl id={`${id}-d`} label="Dienstbarkeit" feld="dienstbarkeit" optionen={PACHT_OPTIONEN.dienstbarkeit} {...p} />
        <Auswahl id={`${id}-rr`} label="Rangrücktritt der Grundpfandgläubiger" feld="rangruecktritt" optionen={{ true: "Ja, holt der Pächter ein", false: "Nein / nicht nötig" }} leer="Nicht angegeben" {...p} />
        <Auswahl id={`${id}-nf`} label="Nebenflächen" feld="nebenflaechen" optionen={PACHT_OPTIONEN.nebenflaechen} {...p} />
        <Feld id={`${id}-nft`} label="Nebenflächen – Details" className="sm:col-span-2" hinweis="Kabeltrasse, Zuwegung, Ausgleichsflächen: Lage, Fläche, Vergütung">
          <input id={`${id}-nft`} className={eingabe} value={werte.nebenflaechenText ?? ""} onChange={(e) => setze("nebenflaechenText", e.target.value)} />
        </Feld>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-500">Kosten &amp; Hinweise</legend>
        <Auswahl id={`${id}-a`} label="Anwalt/Notar übernimmt Pächter" feld="anwalt" optionen={PACHT_OPTIONEN.anwalt} {...p} />
        {werte.anwalt === "gedeckelt" && <Zahl id={`${id}-ab`} label="Höchstbetrag €" feld="anwaltEuro" {...p} />}
        <Feld id={`${id}-g`} label="Angebot gültig bis">
          <input id={`${id}-g`} type="date" className={eingabe} value={werte.gueltigBis ?? ""} onChange={(e) => setze("gueltigBis", e.target.value)} />
        </Feld>
        <Feld id={`${id}-st`} label="Steuerhinweis (optional)" className="sm:col-span-3" hinweis="Leer = allgemeiner Hinweis je Land im Angebotsbogen">
          <textarea id={`${id}-st`} rows={2} className={textbereich} value={werte.steuerhinweis ?? ""} onChange={(e) => setze("steuerhinweis", e.target.value)} />
        </Feld>
        <Feld id={`${id}-pt`} label="Erläuterung zum Angebot" className="sm:col-span-3">
          <textarea id={`${id}-pt`} rows={3} className={textbereich} value={werte.text ?? ""} onChange={(e) => setze("text", e.target.value)} />
        </Feld>
      </fieldset>
    </div>
  );
}

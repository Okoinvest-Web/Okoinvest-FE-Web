"use client";

// src/components/Portal/Entwicklung/Steuerung.js – interaktive Teile der Entwicklungssteuerung: Aufgaben erzeugen, Kapazität je
// Projektleitung (Leitung), Flächensicherung (Grundbuch, Optionsfrist), Entscheidungsvorlage anlegen/bearbeiten und entscheiden.
// Alle Prüfungen (Rechte, Zustandsautomat, Vier-Augen-Prinzip, Pflichtangaben) passieren serverseitig.

import { useId, useState } from "react";
import { senden } from "@/lib/plattform/client";
import { FehlerBox, ErfolgBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { AktionKnopf, Knopf, SchnellFormular, useAktion } from "./Formular";
import { GRUNDBUCH_SICHERUNG, KAPAZITAET, VERWERTUNG, VORLAGE_ARTEN } from "@/lib/plattform/entwicklung-steuerung";

const opt = (o) => Object.entries(o).map(([wert, x]) => ({ wert, label: typeof x === "string" ? x : x.label }));

export function AufgabenKnopf({ projektId = "" }) {
  return (
    <AktionKnopf
      klein
      fn={() => senden(projektId ? `/api/admin/entwicklung/${projektId}/steuerung` : "/api/admin/entwicklung/steuerung", { body: { aktion: "aufgaben", projektId } })}
      meldung={(r) => `${r.angelegt} Aufgabe(n) angelegt, ${r.erledigt} erledigt.`}
    >
      Aufgaben aus fälligen Meilensteinen erzeugen
    </AktionKnopf>
  );
}

export function KapazitaetForm({ zeile }) {
  const a = useAktion();
  const [h, setH] = useState(zeile.individuell ? String(zeile.stundenMonat) : "");
  const id = useId().replace(/:/g, "");
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        a.ausfuehren(() => senden("/api/admin/entwicklung/steuerung", { body: { aktion: "kapazitaet", nutzerId: zeile.id, stundenMonat: h === "" ? null : Number(h) } }), { meldung: "Gespeichert." });
      }}
    >
      <label htmlFor={id} className="sr-only">Kapazität {zeile.name} (Stunden je Monat)</label>
      <input id={id} inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} placeholder={String(KAPAZITAET.stundenMonat)} className={cn(eingabe, "h-8 w-20 px-2 text-[13px]")} />
      <button type="submit" disabled={a.laeuft} className="h-8 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 disabled:opacity-60">h/Monat</button>
      {a.fehler && <span role="alert" className="text-[12px] text-red-700">{a.fehler}</span>}
      {a.erfolg && <span role="status" className="text-[12px] text-ov-800">{a.erfolg}</span>}
    </form>
  );
}

export function SicherungForm({ projektId, flaeche }) {
  return (
    <SchnellFormular
      spalten={3}
      knopf="Sicherung speichern"
      felder={[
        { name: "grundbuch", label: "Grundbuch", typ: "auswahl", leer: false, optionen: opt(GRUNDBUCH_SICHERUNG) },
        { name: "grundbuchDatum", label: "Eintragung / Rang am", typ: "datum" },
        ...(flaeche.pachtStatus === "option" ? [{ name: "optionBis", label: "Option ausüben bis", typ: "datum", hinweis: "Erinnerung 14 Tage vorher als Aufgabe" }] : []),
      ]}
      start={{ grundbuch: flaeche.grundbuch || "keine", grundbuchDatum: flaeche.grundbuchDatum || "", optionBis: flaeche.optionBis || "" }}
      onSenden={(d) => senden(`/api/admin/entwicklung/${projektId}/steuerung`, { body: { aktion: "sicherung", flaecheId: flaeche.id, daten: d } })}
    />
  );
}

export function VorlageFormular({ projektId, vorlage = null, knopf }) {
  const [art, setArt] = useState(vorlage?.art || "gate_entwicklung");
  const a = VORLAGE_ARTEN[art];
  return (
    <div className="space-y-4">
      <Feld id="vorlage-art" label="Art der Vorlage">
        <select id="vorlage-art" value={art} onChange={(e) => setArt(e.target.value)} className={auswahlfeld}>
          {Object.entries(VORLAGE_ARTEN).map(([id, x]) => <option key={id} value={id}>{x.label}</option>)}
        </select>
      </Feld>
      <p className="text-[13px] text-ink-600">{a?.text}</p>
      <SchnellFormular
        key={art}
        spalten={2}
        knopf={knopf || (vorlage ? "Vorlage speichern" : "Entwurf anlegen")}
        meldung={vorlage ? "Gespeichert." : "Entwurf angelegt – jetzt prüfen und einreichen."}
        zuruecksetzen={!vorlage}
        felder={[
          { name: "titel", label: "Titel", typ: "text", breit: true, hinweis: "Leer lassen für den Standardtitel" },
          { name: "beschlussvorschlag", label: "Beschlussvorschlag", typ: "mehrzeilig", breit: true, pflicht: true, hinweis: "Was genau soll die Geschäftsführung beschließen? (mind. 20 Zeichen)" },
          { name: "sachverhalt", label: "Sachverhalt", typ: "mehrzeilig", breit: true, hinweis: "Stand, Ergebnisse, offene Punkte – Kennzahlen, Ampel, Termine und Risiken werden beim Einreichen automatisch beigefügt." },
          { name: "alternativen", label: "Alternativen", typ: "mehrzeilig", breit: true },
          { name: "risikenText", label: "Einschätzung Risiken", typ: "mehrzeilig", breit: true },
          ...(a?.budget ? [{ name: "budgetEur", label: "Beantragtes Budget (€)", typ: "zahl", pflicht: true }] : []),
          ...(a?.verwertung ? [{ name: "empfehlung", label: "Empfohlene Verwertung", typ: "auswahl", optionen: opt(VERWERTUNG), pflicht: true }] : []),
          { name: "entscheidungBis", label: "Entscheidung erbeten bis", typ: "datum" },
        ]}
        start={vorlage ? { ...vorlage, budgetEur: vorlage.budgetEur || "", titel: vorlage.titel } : {}}
        onSenden={(d) => senden(`/api/admin/entwicklung/${projektId}/steuerung`, { body: { aktion: "vorlage", id: vorlage?.id || null, daten: { ...d, art } } })}
      />
    </div>
  );
}

export function VorlageAktionen({ vorlage }) {
  const a = useAktion();
  const [begruendung, setBegruendung] = useState("");
  const [option, setOption] = useState(vorlage.empfehlung || "");
  const verwertung = !!VORLAGE_ARTEN[vorlage.art]?.verwertung;
  const entscheidung = vorlage.aktionen.some((x) => ["genehmigen", "ablehnen", "zurueckstellen"].includes(x.id));
  if (!vorlage.aktionen.length) return <p className="text-[14px] text-ink-500">Keine Aktionen möglich{vorlage.status === "eingereicht" && !vorlage.leitung ? " – über die Vorlage entscheidet die Leitung (Geschäftsführung)." : "."}</p>;
  const ausfuehren = (aktion) => a.ausfuehren(() => senden(`/api/admin/entwicklung/vorlagen/${vorlage.id}`, { body: { aktion, begruendung, option } }), { meldung: "Erledigt." });
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      {entscheidung && verwertung && (
        <Feld id="vorlage-option" label="Gewählte Verwertung">
          <select id="vorlage-option" value={option} onChange={(e) => setOption(e.target.value)} className={auswahlfeld}>
            <option value="">– bitte wählen –</option>
            {Object.entries(VERWERTUNG).map(([id, x]) => <option key={id} value={id}>{x.label}</option>)}
          </select>
        </Feld>
      )}
      {entscheidung && (
        <Feld id="vorlage-begruendung" label="Begründung / Auflagen" hinweis="Pflicht bei Ablehnung und Zurückstellung (mind. 10 Zeichen)">
          <textarea id="vorlage-begruendung" value={begruendung} onChange={(e) => setBegruendung(e.target.value)} className={cn(textbereich, "min-h-[88px]")} />
        </Feld>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <div className="flex flex-wrap gap-2">
        {vorlage.aktionen.map((x) => (
          <Knopf key={x.id} type="button" laeuft={a.laeuft} variante={x.id === "genehmigen" || x.id === "einreichen" ? "primaer" : x.id === "ablehnen" ? "gefahr" : "sekundaer"} onClick={() => ausfuehren(x.id)}>
            {x.label}
          </Knopf>
        ))}
      </div>
    </form>
  );
}

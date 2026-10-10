"use client";

// Strukturierte Anfrage für Kommunen (Gemeinde, Stadtwerk, Landkreis) auf /kommunen.
// Die Angaben gehen als `daten` mit typ „kommune“ an /api/anfrage; der Server übernimmt sie über eine
// Positivliste (src/lib/plattform/kommune.js) und prüft den Gemeindeschlüssel je Land.
// Paket C: Das Land aus dem Länder-Chip geht als land-Prop an das Formular (PLZ-Regel je Land, kontakt.land),
// die Registrierung danach nutzt die Rolle „kommune“ (vorher fälschlich „unternehmen“).

import { useSeitenLand } from "@/components/Land/LandKontext";
import { useId, useState } from "react";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { BAULEITPLANUNG_STAND, BUERGERBETEILIGUNG, KOMMUNE_ABSENDER, KOMMUNE_ROLLE, KOMMUNE_THEMEN, KRITERIENKATALOG } from "@/lib/plattform/kommune";
import { GEMEINDE_SCHLUESSEL } from "@/lib/plattform/flaecheFach";
import { KOMMUNE } from "@/lib/invest/markt";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const LAENDER = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };

/** Sprachmodell: Anzeige-Texte (Schlüssel der Auswahllisten bleiben, Werte gehen unverändert an /api/anfrage). */
const TEXTE = {
  de: {
    laender: LAENDER,
    absender: KOMMUNE_ABSENDER,
    rolle: KOMMUNE_ROLLE,
    planung: BAULEITPLANUNG_STAND,
    katalog: KRITERIENKATALOG,
    buerger: BUERGERBETEILIGUNG,
    themen: KOMMUNE_THEMEN,
    schluessel: { DE: GEMEINDE_SCHLUESSEL.DE.label, AT: GEMEINDE_SCHLUESSEL.AT.label, CH: GEMEINDE_SCHLUESSEL.CH.label },
    schluesselFehler: { DE: GEMEINDE_SCHLUESSEL.DE.fehler, AT: GEMEINDE_SCHLUESSEL.AT.fehler, CH: GEMEINDE_SCHLUESSEL.CH.fehler },
    e1: "Ihre Gemeinde",
    absenderLegende: "Sie schreiben für",
    land: "Land",
    gemeinde: "Gemeinde / Stadt *",
    gemeindePh: "z. B. Musterstadt",
    optional: "optional",
    schluesselHilfe: "Hilft uns, Projekte eindeutig Ihrem Gebiet zuzuordnen.",
    funktion: "Ihre Funktion",
    waehlen: "Bitte wählen",
    flaechen: "Flächen im Gemeindeeigentum (ha)",
    flaechenPh: "optional, grob",
    e2: "Ihr Vorhaben",
    stand: "Stand der Planung",
    katalogLabel: "Kriterienkatalog für Freiflächen-PV",
    p6: (ct) => `Interesse an der Beteiligung nach § 6 EEG (bis ${ct} ct/kWh)?`,
    p6Optionen: { ja: "Ja", nein: "Nein", unbekannt: "Noch offen" },
    buergerLegende: "Bürgerbeteiligung – was schwebt Ihnen vor?",
    themenLegende: "Themen",
    e3: "Ihre Kontaktdaten",
    erst: "Bitte oben den Namen der Gemeinde angeben – dann können Sie absenden.",
    button: "Gespräch anfragen",
    erfolg: "Danke! Wir bestätigen Ihre Gemeinde über die Verwaltung und melden uns mit einem Terminvorschlag. Nach der Registrierung sehen Sie im Portal die Projekte in Ihrem Gebiet.",
    ct: (v) => String(v).replace(".", ","),
  },
  en: {
    laender: { DE: "Germany", AT: "Austria", CH: "Switzerland" },
    absender: { gemeinde: "Municipality / town", stadtwerk: "Municipal utility / municipal company", landkreis: "District / association" },
    rolle: {
      buergermeister: "Mayor or municipal president",
      bauamt: "Building authority / local planning",
      kaemmerei: "Treasury / finance",
      klimaschutz: "Climate protection or energy management",
      rat: "Member of the municipal council",
      geschaeftsfuehrung: "Management of a municipal utility",
      sonstige: "Other role",
    },
    planung: {
      keine: "No planning for ground-mounted PV yet",
      kriterien: "Catalogue of criteria or site concept in progress",
      fnp: "Land use plan with special PV areas",
      aufstellung: "Resolution to draw up a plan adopted for a project",
      laufend: "Several procedures already under way",
    },
    katalog: { ja: "In place (adopted)", arbeit: "In progress", nein: "No" },
    buerger: {
      genossenschaft: "Citizens’ energy cooperative",
      darlehen: "Subordinated loan / savings certificate",
      gemeinschaft: "Energy community / energy sharing",
      stadtwerk: "Stake held by the municipal utility",
      offen: "Not decided yet",
    },
    themen: { solarpark: "Solar park", agri: "Agrivoltaics", kriterien: "Catalogue of criteria", beteiligung: "Citizen participation", carport: "Car parks", speicher: "Storage", dach: "Municipal roofs" },
    schluessel: { DE: "Official municipality key (AGS)", AT: "Municipality code (Gemeindekennziffer)", CH: "FSO municipality number (BFS)" },
    schluesselFehler: { DE: "AGS: exactly 8 digits, e.g. 09778123", AT: "Municipality code: exactly 5 digits", CH: "FSO municipality number: 1–4 digits" },
    e1: "Your municipality",
    absenderLegende: "You are writing on behalf of",
    land: "Country",
    gemeinde: "Municipality / town *",
    gemeindePh: "e.g. Sampletown",
    optional: "optional",
    schluesselHilfe: "Helps us assign projects clearly to your area.",
    funktion: "Your role",
    waehlen: "Please select",
    flaechen: "Land owned by the municipality (ha)",
    flaechenPh: "optional, rough figure",
    e2: "Your project",
    stand: "Planning status",
    katalogLabel: "Catalogue of criteria for ground-mounted PV",
    p6: (ct) => `Interested in participation under § 6 EEG (up to ${ct} ct/kWh)?`,
    p6Optionen: { ja: "Yes", nein: "No", unbekannt: "Not decided yet" },
    buergerLegende: "Citizen participation – what do you have in mind?",
    themenLegende: "Topics",
    e3: "Your contact details",
    erst: "Please enter the name of the municipality above – then you can submit.",
    button: "Request a meeting",
    erfolg: "Thank you! We will verify your municipality via the administration and get back to you with a proposed appointment. After registering, you will see the projects in your area in the portal.",
    ct: (v) => String(v),
  },
};
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

/** nummerierter Zwischentitel – gliedert das lange Formular in drei Etappen */
function Etappe({ nr, titel, id }) {
  return (
    <p id={id} className="flex items-center gap-2.5 font-display text-[16px] font-bold text-ink-900">
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-600 text-[12px] font-bold text-white">{nr}</span>
      {titel}
    </p>
  );
}

export default function KommuneAnfrage() {
  const id = useId();
  const w = uebersetze(TEXTE, useSprache(), useSeitenLand()); // Schweiz: ohne „ß“
  // Land aus der Länderfassung der Seite vorwählen (Länderfassung Österreich → Österreich), sonst Deutschland
  const seitenLand = useSeitenLand();
  const [d, setD] = useState({ land: seitenLand || "DE", absender: "gemeinde", gemeinde: "", gemeindeSchluessel: "", rolle: "", gemeindeFlaechenHa: "", interesse6: "", buergerbeteiligung: [], bauleitplanung: "", kriterienkatalog: "", themen: ["solarpark"] });
  const setze = (k) => (w) => setD((x) => ({ ...x, [k]: w }));
  const gs = GEMEINDE_SCHLUESSEL[d.land];
  const gsFehler = d.gemeindeSchluessel && !gs.muster.test(d.gemeindeSchluessel.replace(/\s/g, "")) ? w.schluesselFehler[d.land] : "";
  const daten = { ...d, gemeindeSchluessel: gsFehler ? "" : d.gemeindeSchluessel.replace(/\s/g, "") };

  return (
    <div className="space-y-10">
      <div role="group" aria-labelledby={`${id}-e1`} className="space-y-6">
      <Etappe nr={1} titel={w.e1} id={`${id}-e1`} />
      <Chips legende={w.absenderLegende} name={`${id}-abs`} optionen={w.absender} wert={d.absender} onChange={setze("absender")} />
      <Chips legende={w.land} name={`${id}-land`} optionen={w.laender} wert={d.land} onChange={(l) => setD((x) => ({ ...x, land: l, interesse6: l === "DE" ? x.interesse6 : "" }))} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-g`} className={label}>{w.gemeinde}</label>
          <input id={`${id}-g`} className={feld} value={d.gemeinde} onChange={(e) => setze("gemeinde")(e.target.value)} placeholder={w.gemeindePh} maxLength={120} />
        </div>
        <div>
          <label htmlFor={`${id}-gs`} className={label}>{w.schluessel[d.land]}</label>
          <input id={`${id}-gs`} inputMode="numeric" className={cn(feld, gsFehler && "ring-2 ring-danger-300")} value={d.gemeindeSchluessel} onChange={(e) => setze("gemeindeSchluessel")(e.target.value)} placeholder={w.optional} aria-invalid={gsFehler ? true : undefined} aria-describedby={`${id}-gs-h`} />
          <p id={`${id}-gs-h`} className={cn("mt-1.5 text-[12.5px]", gsFehler ? "font-medium text-danger-700" : "text-ink-500")}>{gsFehler || w.schluesselHilfe}</p>
        </div>
        <div>
          <label htmlFor={`${id}-r`} className={label}>{w.funktion}</label>
          <select id={`${id}-r`} className={feld} value={d.rolle} onChange={(e) => setze("rolle")(e.target.value)}>
            <option value="">{w.waehlen}</option>
            {Object.entries(w.rolle).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-ha`} className={label}>{w.flaechen}</label>
          <input id={`${id}-ha`} inputMode="decimal" className={feld} value={d.gemeindeFlaechenHa} onChange={(e) => setze("gemeindeFlaechenHa")(e.target.value)} placeholder={w.flaechenPh} />
        </div>
      </div>
      </div>

      <div role="group" aria-labelledby={`${id}-e2`} className="space-y-6 border-t border-ink-100 pt-8">
      <Etappe nr={2} titel={w.e2} id={`${id}-e2`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-bp`} className={label}>{w.stand}</label>
          <select id={`${id}-bp`} className={feld} value={d.bauleitplanung} onChange={(e) => setze("bauleitplanung")(e.target.value)}>
            <option value="">{w.waehlen}</option>
            {Object.entries(w.planung).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-kk`} className={label}>{w.katalogLabel}</label>
          <select id={`${id}-kk`} className={feld} value={d.kriterienkatalog} onChange={(e) => setze("kriterienkatalog")(e.target.value)}>
            <option value="">{w.waehlen}</option>
            {Object.entries(w.katalog).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {d.land === "DE" && (
        <Chips
          legende={w.p6(w.ct(KOMMUNE.beteiligungCt))}
          name={`${id}-p6`}
          optionen={w.p6Optionen}
          wert={d.interesse6}
          onChange={setze("interesse6")}
        />
      )}
      <Chips legende={w.buergerLegende} name={`${id}-bb`} optionen={w.buerger} wert={d.buergerbeteiligung} mehrfach onChange={setze("buergerbeteiligung")} />
      <Chips legende={w.themenLegende} name={`${id}-th`} optionen={w.themen} wert={d.themen} mehrfach onChange={setze("themen")} />
      </div>

      <div className="space-y-6 border-t border-ink-100 pt-8">
        <Etappe nr={3} titel={w.e3} />
        {!d.gemeinde.trim() && <p className="mb-4 rounded-xl bg-sand-50 px-4 py-3 text-[13.5px] text-ink-700 ring-1 ring-inset ring-ink-200">{w.erst}</p>}
        <fieldset disabled={!d.gemeinde.trim()} className="disabled:opacity-60">
          <AnfrageFormular typ="kommune" land={d.land} felder={["firma", "telefon", "plz", "ort", "nachricht"]} daten={daten} button={w.button} erfolgText={w.erfolg} rolle="kommune" />
        </fieldset>
      </div>
    </div>
  );
}

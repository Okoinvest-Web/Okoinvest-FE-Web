"use client";

// Strukturierte Fachangaben zur Fläche (optional, außer den markierten Pflichtangaben je Nutzung):
// Eigentum & Grundbuch · Bewirtschaftung & Förderbindungen · Boden · Schutzgebiete & Lage ·
// Agri-PV (nur bei Agri-PV-Interesse) · Dachfläche (nur bei Nutzung „Dachfläche“).
// Werte landen als `fach` an der Fläche; Prüfung und Ampel übernimmt flaecheFach.js (Server maßgeblich).

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import BegriffPopover from "../Bedienung/BegriffPopover";
import {
  AGRI_KATEGORIE, AGRI_KULTUREN, AGRI_SYSTEM, BELASTUNGEN, BEWIRTSCHAFTUNG, DACH_NETZ, DACH_NUTZER, DACHARTEN, EXPOSITION, GEMEINDE_SCHLUESSEL,
  JNU, LASTEN_LABEL, NACHWEIS_66, REFERENZ_EINHEIT, REFERENZ_QUELLE, STATIK, VERTRETUNG, WSG, ZUFAHRT,
} from "@/lib/plattform/flaecheFach";
import { AGRI } from "@/lib/invest/markt";
import { eingabe, auswahlfeld, labelKlasse, Feld } from "../felder";

const zahlText = (x) => String(x).replace(".", ",");

function Bereich({ titel, text, anzahl, offen, pflicht, children }) {
  const [start] = useState(!!offen); // nur beim ersten Anzeigen öffnen – danach entscheidet der Nutzer
  return (
    <details className="group rounded-2xl bg-white ring-1 ring-inset ring-ink-200/80" open={start}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-display text-[15px] font-bold text-ink-900">
            {titel}
            {pflicht && <span className="ml-2 rounded-full bg-sun-300/40 px-2 py-0.5 align-middle text-[11px] font-semibold text-ink-900">enthält Pflichtangaben</span>}
          </span>
          {text && <span className="mt-0.5 block text-[13px] leading-snug text-ink-500">{text}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[12.5px] text-ink-500">
          {anzahl > 0 && <span className="rounded-full bg-ov-50 px-2 py-0.5 font-semibold text-ov-800 ring-1 ring-ov-200">{anzahl} ausgefüllt</span>}
          <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid gap-4 border-t border-ink-200/70 p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

function Jnu({ name, label, wert, onChange, hilfe, pflicht, className }) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-700">
        {label}
        {pflicht && <span aria-hidden="true"> *</span>}
        {hilfe}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(JNU).map(([k, l]) => (
          <label
            key={k}
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center rounded-full px-3 text-[13px] font-medium ring-1 ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
              wert === k ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
            )}
          >
            <input type="radio" name={name} value={k} checked={wert === k} onChange={() => onChange(k)} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Beschriftung mit optionalem „?“ zum Lexikon – der Knopf steht bewusst außerhalb des <label> */
function Kopf({ fid, label, pflicht, hilfe }) {
  return (
    <div className="mb-1.5 flex items-center gap-1">
      <label htmlFor={fid} className={labelKlasse.replace("mb-1.5 ", "")}>
        {label}
        {pflicht && <span aria-hidden="true"> *</span>}
      </label>
      {hilfe}
    </div>
  );
}

function Auswahl({ k, bereich, feld, label, optionen, hinweis, pflicht, hilfe, className }) {
  const fid = `${k.id}-${bereich}-${feld}`;
  return (
    <Feld id={fid} hinweis={hinweis} className={className}>
      <Kopf fid={fid} label={label} pflicht={pflicht} hilfe={hilfe} />
      <select id={fid} className={auswahlfeld} value={k.w(bereich, feld)} onChange={(e) => k.s(bereich, feld)(e.target.value)}>
        <option value="">Bitte wählen</option>
        {Object.entries(optionen).map(([o, l]) => (
          <option key={o} value={o}>{l}</option>
        ))}
      </select>
    </Feld>
  );
}

function Eingabe({ k, bereich, feld, label, hinweis, zahl = true, platzhalter, className, hilfe }) {
  const fid = `${k.id}-${bereich}-${feld}`;
  return (
    <Feld id={fid} hinweis={hinweis} className={className}>
      <Kopf fid={fid} label={label} hilfe={hilfe} />
      <input id={fid} inputMode={zahl ? "decimal" : undefined} placeholder={platzhalter} className={eingabe} value={k.w(bereich, feld)} onChange={(e) => k.s(bereich, feld)(e.target.value)} />
    </Feld>
  );
}

function J({ k, bereich, feld, label, pflicht, hilfe, className }) {
  return <Jnu name={`${k.id}-${bereich}-${feld}`} label={label} wert={k.w(bereich, feld)} onChange={k.s(bereich, feld)} pflicht={pflicht} hilfe={hilfe} className={className} />;
}

export default function FachFormular({ f, setze, begriffe = {} }) {
  const id = useId();
  const fach = f.fach || {};
  const land = f.land || "DE";
  const dach = f.nutzung === "dach";
  const agri = !!f.agri && !dach;
  const B = (bid) => (begriffe[bid] ? <BegriffPopover eintrag={begriffe[bid]} /> : null);
  const w = (bereich, feld) => fach[bereich]?.[feld] ?? "";
  const s = (bereich, feld) => (wert) => setze(bereich, feld, wert);
  const anzahl = (bereich) => Object.values(fach[bereich] || {}).filter((x) => (Array.isArray(x) ? x.length : x !== "" && x !== null && x !== undefined)).length;

  const k = { id, w, s };

  const mehrEigentuemer = f.eigentum && f.eigentum !== "eigentum";
  const lasten = fach.eigentum?.belastungen || [];
  const gs = GEMEINDE_SCHLUESSEL[land];

  return (
    <div className="space-y-3">
      <Bereich titel="Eigentum & Grundbuch" text="Wer unterschreibt, welche Lasten sind eingetragen?" anzahl={anzahl("eigentum")} offen={mehrEigentuemer && !fach.eigentum?.vertretung} pflicht={mehrEigentuemer}>
        {mehrEigentuemer && <Eingabe k={k} bereich="eigentum" feld="anzahl" label="Anzahl Eigentümer / Miterben" />}
        <Auswahl k={k} bereich="eigentum" feld="vertretung" label="Wer unterschreibt?" optionen={VERTRETUNG} pflicht={mehrEigentuemer} hinweis={mehrEigentuemer ? "Bei mehreren Eigentümern müssen alle zustimmen oder bevollmächtigen." : undefined} />
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-700">
            {LASTEN_LABEL[land] || LASTEN_LABEL.DE}
            {B("grundbuch-abteilungen")}
          </legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {Object.entries(BELASTUNGEN).map(([k, l]) => (
              <label key={k} className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 text-[13.5px] text-ink-700 hover:bg-ink-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#558227]"
                  checked={lasten.includes(k)}
                  onChange={(e) => setze("eigentum", "belastungen", e.target.checked ? [...lasten, k] : lasten.filter((x) => x !== k))}
                />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <J k={k} bereich="eigentum" feld="lastenBekannt" label="Haben Sie einen aktuellen Grundbuchauszug geprüft?" />
        {lasten.includes("grundschuld") && <Eingabe k={k} bereich="eigentum" feld="glaeubiger" label="Gläubiger (Bank)" zahl={false} hinweis="Für den Rangrücktritt – optional" />}
      </Bereich>

      {!dach && (
        <Bereich titel="Bewirtschaftung & Förderbindungen" text="Laufende Pacht, Direktzahlungen, Agrarumwelt-Verpflichtungen" anzahl={anzahl("bewirtschaftung") + anzahl("foerderung")} offen={fach.bewirtschaftung?.art === "verpachtet" && !fach.bewirtschaftung?.pachtEnde && fach.bewirtschaftung?.kuendigungMonate == null}>
          <Auswahl k={k} bereich="bewirtschaftung" feld="art" label="Wer bewirtschaftet heute?" optionen={BEWIRTSCHAFTUNG} hilfe={B("landpachtvertrag")} />
          {fach.bewirtschaftung?.art === "verpachtet" && (
            <>
              <Eingabe k={k} bereich="bewirtschaftung" feld="paechter" label="Pächter (optional)" zahl={false} />
              <Feld id={`${id}-pe`} label="Pacht endet (Monat)" pflicht hinweis="oder Kündigungsfrist angeben">
                <input id={`${id}-pe`} type="month" className={eingabe} value={w("bewirtschaftung", "pachtEnde")} onChange={(e) => setze("bewirtschaftung", "pachtEnde", e.target.value)} />
              </Feld>
              <Eingabe k={k} bereich="bewirtschaftung" feld="kuendigungMonate" label="Kündigungsfrist in Monaten" hinweis={land === "DE" ? "Unbefristet: § 594a BGB – zum Ende des nächsten Pachtjahres" : undefined} />
            </>
          )}
          <J k={k} bereich="foerderung" feld="gap" label={land === "CH" ? "Direktzahlungen für die Fläche?" : "GAP-Direktzahlungen für die Fläche?"} hilfe={B("gap-direktzahlungen")} />
          <J k={k} bereich="foerderung" feld="aukm" label={land === "AT" ? "Laufende ÖPUL-Verpflichtung?" : land === "CH" ? "Biodiversitätsförderfläche / Vernetzung?" : "Laufende Agrarumwelt-Verpflichtung (AUKM)?"} hilfe={B("agrarumweltmassnahmen")} />
          {fach.foerderung?.aukm === "ja" && (
            <>
              <Eingabe k={k} bereich="foerderung" feld="aukmArt" label="Maßnahme" zahl={false} platzhalter="z. B. Blühstreifen, Ökolandbau" />
              <Eingabe k={k} bereich="foerderung" feld="aukmEnde" label="Verpflichtung endet (Jahr)" />
            </>
          )}
        </Bereich>
      )}

      {!dach && (
        <Bereich titel="Boden" text={land === "AT" ? "Bodenklimazahl und Ertragsmesszahl aus der Bodenschätzung" : land === "CH" ? "Bodeneignung und Fruchtfolgeflächen" : "Acker- bzw. Grünlandzahl aus der Bodenschätzung"} anzahl={anzahl("boden")}>
          {land === "DE" && <Eingabe k={k} bereich="boden" feld="ackerzahl" label="Ackerzahl" hinweis="1–120, steht im Liegenschaftskataster" hilfe={B("bodenschaetzung")} />}
          {land === "DE" && <Eingabe k={k} bereich="boden" feld="gruenlandzahl" label="Grünlandzahl" hinweis="bei Grünland" />}
          {land === "AT" && <Eingabe k={k} bereich="boden" feld="bodenklimazahl" label="Bodenklimazahl" hinweis="1–100, aus der Bodenschätzung" hilfe={B("bodenschaetzung")} />}
          {land === "AT" && <Eingabe k={k} bereich="boden" feld="ertragsmesszahl" label="Ertragsmesszahl (EMZ)" hinweis="steht im Grundstücksverzeichnis" />}
          {land === "CH" && <Eingabe k={k} bereich="boden" feld="quelle" label="Bodeneignung / Fruchtfolgefläche" zahl={false} platzhalter="z. B. FFF, Eignungsklasse 3" />}
          {land !== "CH" && <Eingabe k={k} bereich="boden" feld="quelle" label="Quelle" zahl={false} platzhalter="z. B. Katasterauszug 2025" />}
        </Bereich>
      )}

      <Bereich titel={dach ? "Lage & Gemeinde" : "Schutzgebiete & Lage"} text={dach ? "Gemeindeschlüssel" : "Schutzgebiete, Hangneigung, Zufahrt, Leitungen, Netz"} anzahl={anzahl("schutz") + anzahl("lage")}>
        <Eingabe k={k} bereich="lage" feld="gemeindeSchluessel" label={gs.label} hinweis="optional – eindeutige Zuordnung zur Gemeinde" platzhalter={land === "DE" ? "8 Ziffern" : land === "AT" ? "5 Ziffern" : "BFS-Nr."} />
        {!dach && (
          <>
            <J k={k} bereich="schutz" feld="natura2000" label="Natura 2000 (FFH/Vogelschutz)?" hilfe={B("natura-2000")} />
            <J k={k} bereich="schutz" feld="nsg" label="Naturschutzgebiet?" />
            <J k={k} bereich="schutz" feld="lsg" label="Landschaftsschutzgebiet?" />
            <Auswahl k={k} bereich="schutz" feld="wsg" label="Wasserschutzgebiet" optionen={WSG} hilfe={B("wasserschutzgebiet")} />
            <J k={k} bereich="schutz" feld="ueberschwemmung" label={land === "DE" ? "Überschwemmungsgebiet?" : "Hochwasser-Gefahrenzone?"} />
            <J k={k} bereich="schutz" feld="denkmal" label="Bau- oder Bodendenkmal?" />
            <J k={k} bereich="schutz" feld="biotop" label="Geschütztes Biotop auf der Fläche?" />
            <Eingabe k={k} bereich="lage" feld="hangneigung" label="Hangneigung in %" hinweis="eben = 0" />
            <Auswahl k={k} bereich="lage" feld="exposition" label="Ausrichtung des Hangs" optionen={EXPOSITION} />
            <Auswahl k={k} bereich="lage" feld="zufahrt" label="Zufahrt" optionen={ZUFAHRT} />
            <J k={k} bereich="lage" feld="waldAngrenzend" label="Grenzt Wald an?" />
            <J k={k} bereich="lage" feld="leitungen" label="Leitungen oder Drainagen auf der Fläche?" />
            {fach.lage?.leitungen === "ja" && <Eingabe k={k} bereich="lage" feld="leitungenText" label="Welche Leitungen?" zahl={false} platzhalter="z. B. 20-kV-Freileitung, Gasleitung, Drainage" />}
            <Eingabe k={k} bereich="lage" feld="netzKm" label="Entfernung zum Umspannwerk (km)" hinweis="falls bekannt" hilfe={B("netzverknuepfungspunkt")} />
          </>
        )}
      </Bereich>

      {agri && (
        <Bereich titel="Agri-PV" text="Kategorie nach DIN SPEC 91434, Kultur, Bewirtschaftung, Referenzertrag" anzahl={anzahl("agri")} offen={!fach.agri?.kultur} pflicht>
          <Auswahl k={k} bereich="agri" feld="kategorie" label="Kategorie nach DIN SPEC 91434" optionen={AGRI_KATEGORIE} hilfe={B("din-spec-91434")} hinweis={`Kategorie I: lichte Höhe ≥ 2,10 m, Flächenverlust ≤ ${Math.round(AGRI.flaechenverlustMaxKat1 * 100)} %. Kategorie II: ≤ ${Math.round(AGRI.flaechenverlustMaxKat2 * 100)} %.`} />
          <Auswahl k={k} bereich="agri" feld="system" label="Bauweise" optionen={AGRI_SYSTEM} />
          <Auswahl k={k} bereich="agri" feld="kultur" label="Geplante Kultur" optionen={AGRI_KULTUREN} pflicht />
          {fach.agri?.kultur === "sonstige" && <Eingabe k={k} bereich="agri" feld="kulturText" label="Welche Kultur?" zahl={false} />}
          <Eingabe k={k} bereich="agri" feld="arbeitsbreiteM" label="Größte Arbeitsbreite (m)" hinweis="z. B. Spritze, Mähwerk, Mähdrescher" />
          <Eingabe k={k} bereich="agri" feld="durchfahrtshoeheM" label="Benötigte Durchfahrtshöhe (m)" hinweis="höchste Maschine plus Reserve" />
          <Eingabe k={k} bereich="agri" feld="gassenbreiteM" label="Gewünschte Gassenbreite (m)" hinweis="lichter Abstand zwischen den Modulreihen" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Eingabe k={k} bereich="agri" feld="referenzertrag" label="Referenzertrag ohne Anlage" hilfe={B("referenzertrag")} />
            <Feld id={`${id}-re`} label="Einheit">
              <select id={`${id}-re`} className={auswahlfeld} value={w("agri", "referenzEinheit")} onChange={(e) => setze("agri", "referenzEinheit", e.target.value)}>
                <option value="">–</option>
                {Object.entries(REFERENZ_EINHEIT).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Feld>
          </div>
          <Auswahl k={k} bereich="agri" feld="referenzQuelle" label="Quelle des Referenzertrags" optionen={REFERENZ_QUELLE} />
          <Auswahl k={k} bereich="agri" feld="nachweis66" label={`Nachweis ${Math.round(AGRI.mindestErtrag * 100)} %-Regel`} optionen={NACHWEIS_66} hinweis={`Der landwirtschaftliche Ertrag muss mindestens ${Math.round(AGRI.mindestErtrag * 100)} % des Referenzertrags erreichen.`} />
          <J k={k} bereich="agri" feld="gapWeiter" label={land === "DE" ? `GAP-Förderung weiter beantragen (${Math.round(AGRI.gapFoerderfaehig * 100)} % bleiben förderfähig)?` : "Direktzahlungen weiter beantragen?"} hilfe={B("gap-direktzahlungen")} />
          {land === "DE" && <J k={k} bereich="agri" feld="hofbezug" label={`Liegt die Fläche nahe Ihrer Hofstelle (Privilegierung bis ${zahlText(AGRI.privilegierungHa)} ha)?`} hilfe={B("privilegierung-aussenbereich")} />}
          {land === "DE" && fach.agri?.hofbezug === "ja" && <Eingabe k={k} bereich="agri" feld="hofEntfernungM" label="Entfernung zur Hofstelle (m)" />}
        </Bereich>
      )}

      {dach && (
        <Bereich titel="Dachfläche" text="Dachart, Alter, Statik, Brandschutz, Asbest, Netz, Mieter" anzahl={anzahl("dach")} offen pflicht>
          <Auswahl k={k} bereich="dach" feld="dachart" label="Dachart / Eindeckung" optionen={DACHARTEN} pflicht />
          <J k={k} bereich="dach" feld="asbest" label="Enthält das Dach Asbest (Faserzement vor 1993)?" pflicht />
          <Eingabe k={k} bereich="dach" feld="dachflaecheM2" label="Nutzbare Dachfläche (m²)" />
          <Eingabe k={k} bereich="dach" feld="neigungGrad" label="Dachneigung (Grad)" />
          <Eingabe k={k} bereich="dach" feld="baujahrGebaeude" label="Baujahr Gebäude" />
          <Eingabe k={k} bereich="dach" feld="baujahrDach" label="Baujahr bzw. letzte Sanierung der Eindeckung" hinweis="für die Restnutzungsdauer" />
          <J k={k} bereich="dach" feld="sanierungGeplant" label="Ist eine Dachsanierung geplant?" />
          <Auswahl k={k} bereich="dach" feld="statik" label="Statik" optionen={STATIK} hilfe={B("dachstatik")} />
          {fach.dach?.statik === "reserve" && <Eingabe k={k} bereich="dach" feld="statikReserveKn" label="Statik-Reserve (kN/m²)" hinweis="laut Tragwerksplaner; PV braucht etwa 0,15–0,25 kN/m²" />}
          <J k={k} bereich="dach" feld="brandwaende" label="Gibt es Brandwände im Dach?" />
          <J k={k} bereich="dach" feld="blitzschutz" label="Ist eine Blitzschutzanlage vorhanden?" />
          <Auswahl k={k} bereich="dach" feld="netz" label="Netzanschluss am Gebäude" optionen={DACH_NETZ} />
          {fach.dach?.netz === "mittelspannung" && <Eingabe k={k} bereich="dach" feld="trafoKva" label="Trafoleistung (kVA)" />}
          <Auswahl k={k} bereich="dach" feld="nutzer" label="Wer nutzt das Gebäude?" optionen={DACH_NUTZER} pflicht />
          {(fach.dach?.nutzer === "vermietet" || fach.dach?.nutzer === "teilweise") && <Eingabe k={k} bereich="dach" feld="mieter" label="Mieter (optional)" zahl={false} />}
          <J k={k} bereich="dach" feld="dachstrom" label="Interesse an Dachstrom für Nutzer (PPA)?" hilfe={B("ppa")} />
          <J k={k} bereich="dach" feld="denkmal" label="Steht das Gebäude unter Denkmalschutz?" />
        </Bereich>
      )}
    </div>
  );
}

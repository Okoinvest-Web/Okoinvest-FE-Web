"use client";

// Formulare der Energiebeschaffung (Backoffice, Kunde, Versorger). Validierung maßgeblich auf dem Server
// (backend/demo/energie.js bzw. Frappe); hier nur Bedienung. Mutationen als JSON über senden() (CSRF: Origin + JSON).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileUp, Play, Plus, Send, Star, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Chip, ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { PRODUKT_ARTEN, SICHERHEITEN, BESTPREIS_REGELN, produktLabel } from "@/lib/plattform/energie/ausschreibung";
import { STRUKTUREN, VERGUETUNG_MODELLE } from "@/lib/plattform/energie/beschaffung";

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(url, body, { erfolgText = "Gespeichert.", danach } = {}) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(url, { body });
      setErfolg(typeof erfolgText === "function" ? erfolgText(r) : erfolgText);
      if (danach) danach(r);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, los, setFehler };
}

const inTagen = (t) => {
  const d = new Date(Date.now() + t * 86400e3);
  d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
};
const isoAusLokal = (s) => (s ? new Date(s).toISOString() : "");
// Gespeicherte ISO-Zeit (UTC) → Wert für datetime-local in lokaler Zeit (Gegenstück zu isoAusLokal)
const lokalAusIso = (s) => {
  const d = s ? new Date(s) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Einfacher Aktionsknopf (POST, danach neu laden) */
export function AktionKnopf({ url, body, label, bestaetigen, variant = "secondary", icon: Icon, erfolgText }) {
  const a = useAktion();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size="sm"
        variant={variant}
        icon={Icon}
        disabled={a.laeuft}
        onClick={async () => {
          if (bestaetigen && !window.confirm(bestaetigen)) return;
          await a.los(url, body, { erfolgText });
        }}
      >
        {a.laeuft ? "Bitte warten …" : label}
      </Button>
      {a.fehler && <span role="alert" className="max-w-xs text-[12.5px] text-red-700">{a.fehler}</span>}
      {a.erfolg && erfolgText && <span role="status" className="text-[12.5px] text-ov-800">{a.erfolg}</span>}
    </span>
  );
}

// ================================================================ Terminmarkt

export function TerminEingabe() {
  const a = useAktion();
  const [e, setE] = useState({ handelstag: new Date().toISOString().slice(0, 10), zone: "DE", produkt: "Cal-27", typ: "base", preisEurMwh: "", quelle: "" });
  const [csv, setCsv] = useState("");
  const [quelleStd, setQuelleStd] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (ev) => {
          ev.preventDefault();
          await a.los("/api/admin/energie/termin", { eintrag: e }, { erfolgText: "Terminpreis gespeichert." });
        }}
      >
        <p className="col-span-full text-[13.5px] font-semibold text-ink-800">Einzelwert erfassen</p>
        <Feld id="tp-tag" label="Handelstag" pflicht><input id="tp-tag" type="date" className={eingabe} value={e.handelstag} onChange={set("handelstag")} /></Feld>
        <Feld id="tp-zone" label="Zone" pflicht>
          <select id="tp-zone" className={auswahlfeld} value={e.zone} onChange={set("zone")}><option value="DE">DE (DE-LU)</option><option value="AT">AT</option></select>
        </Feld>
        <Feld id="tp-prod" label="Produkt" pflicht hinweis="Cal-27, Q1-27 oder M11-26"><input id="tp-prod" className={eingabe} value={e.produkt} onChange={set("produkt")} /></Feld>
        <Feld id="tp-typ" label="Typ" pflicht>
          <select id="tp-typ" className={auswahlfeld} value={e.typ} onChange={set("typ")}><option value="base">Base</option><option value="peak">Peak</option></select>
        </Feld>
        <Feld id="tp-preis" label="Preis (€/MWh)" pflicht><input id="tp-preis" inputMode="decimal" className={eingabe} value={e.preisEurMwh} onChange={set("preisEurMwh")} /></Feld>
        <Feld id="tp-quelle" label="Quelle" pflicht hinweis="Lizenzierter Feed oder zitierte Quelle mit Datum"><input id="tp-quelle" className={eingabe} value={e.quelle} onChange={set("quelle")} /></Feld>
        <div className="col-span-full flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" icon={Plus} disabled={a.laeuft}>Speichern</Button>
          <FehlerBox>{a.fehler}</FehlerBox>
          <ErfolgBox>{a.erfolg}</ErfolgBox>
        </div>
      </form>
      <form
        className="grid gap-3"
        onSubmit={async (ev) => {
          ev.preventDefault();
          const r = await a.los("/api/admin/energie/termin", { csv, quelleStandard: quelleStd }, { erfolgText: (x) => `${x.neu} neu, ${x.ersetzt} ersetzt${x.fehler?.length ? `, ${x.fehler.length} Zeilen mit Fehlern` : ""}.` });
          if (r) setErgebnis(r);
        }}
      >
        <p className="text-[13.5px] font-semibold text-ink-800">CSV einspielen</p>
        <p className="text-[12.5px] leading-snug text-ink-500">Kopfzeile: Handelstag;Zone;Produkt;Typ;Preis;Quelle – Semikolon oder Komma, Dezimalkomma erlaubt, höchstens 5.000 Zeilen.</p>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink-800 ring-1 ring-ink-200 hover:ring-ink-300">
          <FileUp aria-hidden="true" className="h-4 w-4" /> Datei wählen
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={async (ev) => {
              const f = ev.target.files?.[0];
              if (!f) return;
              if (f.size > 400000) return a.setFehler("Die Datei ist zu groß (höchstens 400 KB).");
              setCsv(await f.text());
            }}
          />
        </label>
        <textarea aria-label="CSV-Inhalt" className={cn(textbereich, "font-mono text-[12.5px]")} rows={5} value={csv} onChange={(ev) => setCsv(ev.target.value)} placeholder={"Handelstag;Zone;Produkt;Typ;Preis;Quelle\n29.09.2026;DE;Cal-27;base;98,40;EEX-Settlement (Lizenzfeed)"} />
        <Feld id="tp-qstd" label="Quelle für Zeilen ohne Quelle"><input id="tp-qstd" className={eingabe} value={quelleStd} onChange={(ev) => setQuelleStd(ev.target.value)} /></Feld>
        <div><Button type="submit" size="sm" icon={FileUp} disabled={a.laeuft || !csv}>Einspielen</Button></div>
        {ergebnis?.fehler?.length > 0 && (
          <ul className="max-h-32 overflow-auto rounded-xl bg-sand-50 p-3 text-[12.5px] text-ink-700">
            {ergebnis.fehler.map((f) => <li key={f.zeile}>Zeile {f.zeile}: {f.text}</li>)}
          </ul>
        )}
      </form>
    </div>
  );
}

// ================================================================ Portfolio

export function TrancheFormular({ lieferanten = [] }) {
  const a = useAktion();
  const [d, setD] = useState({ periode: "Q1-27", zone: "DE", mwh: "", preisEurMwh: "", gekauftAm: new Date().toISOString().slice(0, 10), lieferantId: "", bemerkung: "" });
  const set = (k) => (ev) => setD({ ...d, [k]: ev.target.value });
  return (
    <form
      className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7"
      onSubmit={async (ev) => {
        ev.preventDefault();
        await a.los("/api/admin/energie/portfolio", { aktion: "buchen", ...d }, { erfolgText: "Tranche gebucht." });
      }}
    >
      <Feld id="tr-p" label="Quartal" pflicht><input id="tr-p" className={eingabe} value={d.periode} onChange={set("periode")} /></Feld>
      <Feld id="tr-z" label="Zone"><select id="tr-z" className={auswahlfeld} value={d.zone} onChange={set("zone")}><option>DE</option><option>AT</option></select></Feld>
      <Feld id="tr-m" label="MWh" pflicht><input id="tr-m" inputMode="decimal" className={eingabe} value={d.mwh} onChange={set("mwh")} /></Feld>
      <Feld id="tr-pr" label="€/MWh" pflicht><input id="tr-pr" inputMode="decimal" className={eingabe} value={d.preisEurMwh} onChange={set("preisEurMwh")} /></Feld>
      <Feld id="tr-d" label="Gekauft am"><input id="tr-d" type="date" className={eingabe} value={d.gekauftAm} onChange={set("gekauftAm")} /></Feld>
      <Feld id="tr-l" label="Gegenpartei">
        <select id="tr-l" className={auswahlfeld} value={d.lieferantId} onChange={set("lieferantId")}>
          <option value="">– wählen –</option>
          {lieferanten.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Feld>
      <div className="flex items-end"><Button type="submit" size="sm" icon={Plus} disabled={a.laeuft}>Buchen</Button></div>
      <div className="col-span-full"><FehlerBox>{a.fehler}</FehlerBox><ErfolgBox>{a.erfolg}</ErfolgBox></div>
    </form>
  );
}

// ================================================================ Einstellungen

export function EinstellungenFormular({ einstellungen: e0 }) {
  const a = useAktion();
  const [e, setE] = useState(e0);
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value });
  const zahlFeld = (k, label, hinweis) => (
    <Feld id={`es-${k}`} label={label} hinweis={hinweis}><input id={`es-${k}`} inputMode="decimal" className={eingabe} value={e[k] ?? ""} onChange={set(k)} /></Feld>
  );
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={async (ev) => {
        ev.preventDefault();
        await a.los("/api/admin/energie/einstellungen", e, { erfolgText: "Einstellungen gespeichert." });
      }}
    >
      {zahlFeld("lieferantAufschlagCt", "Lieferantenaufschlag (ct/kWh)", "Annahme für die Wechselanalyse: Marge, Bilanzkreis, Risiko eines Vollversorgers")}
      {zahlFeld("profilAufschlagCt", "Profilaufschlag ohne Lastgang (ct/kWh)")}
      {zahlFeld("schwelleProzent", "Schwelle „jetzt ausschreiben“ (%)")}
      {zahlFeld("vorlaufTage", "Vorlauf vor Kündigungsstichtag (Tage)")}
      {zahlFeld("beobachtenTage", "Beobachten ab (Tage vor Stichtag)")}
      {zahlFeld("risikoSchockProzent", "Risiko: Preisbewegung (%)")}
      <Feld id="es-vm" label="Vergütungsmodell">
        <select id="es-vm" className={auswahlfeld} value={e.verguetungModell} onChange={set("verguetungModell")}>
          {Object.entries(VERGUETUNG_MODELLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Feld>
      {zahlFeld("serviceFeeEurMwh", "Servicefee (€/MWh)", "0 = nicht festgelegt")}
      {zahlFeld("erfolgsAnteil", "Erfolgshonorar (Anteil 0–1)", "z. B. 0,2 = 20 % der Ersparnis; 0 = nicht festgelegt")}
      <Feld id="es-bp" label="Bestpreis-Hinweis Runde 2 (Standard)">
        <select id="es-bp" className={auswahlfeld} value={e.bestpreisRegelStandard} onChange={set("bestpreisRegelStandard")}>
          {Object.entries(BESTPREIS_REGELN).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
        </select>
      </Feld>
      <label className="flex items-center gap-2 self-end text-[14px] text-ink-700">
        <input type="checkbox" checked={!!e.demoKurve} onChange={set("demoKurve")} className="h-4 w-4 accent-ov-600" />
        Demo-Terminkurve einblenden (gekennzeichnet)
      </label>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" icon={Check} disabled={a.laeuft}>Speichern</Button>
        <FehlerBox>{a.fehler}</FehlerBox>
        <ErfolgBox>{a.erfolg}</ErfolgBox>
      </div>
    </form>
  );
}

// ================================================================ Vertrag (Backoffice und Kunde)

export function VertragFormular({ url, vertrag = null, titel = "Stromvertrag erfassen" }) {
  const a = useAktion();
  const [offen, setOffen] = useState(!vertrag);
  const [d, setD] = useState({
    lieferant: vertrag?.lieferant || "", zone: vertrag?.zone || "DE", preisCt: vertrag?.preisCt ?? "", preisArt: vertrag?.preisArt || "energie", struktur: vertrag?.struktur || "fix",
    beginn: vertrag?.beginn || "", vertragEnde: vertrag?.vertragEnde || "", kuendigungsfristMonate: vertrag?.kuendigungsfristMonate ?? 3, verlaengerungMonate: vertrag?.verlaengerungMonate ?? 12,
    verlaengerungPreisCt: vertrag?.verlaengerungPreisCt ?? "", jahresKwh: vertrag?.jahresKwh ?? "", lastprofil: vertrag?.lastprofil || "einschicht", pvKwpGeplant: vertrag?.pvKwpGeplant ?? "", speicherKwhGeplant: vertrag?.speicherKwhGeplant ?? "", status: vertrag?.status || "aktiv",
  });
  const set = (k) => (ev) => setD({ ...d, [k]: ev.target.value });
  if (!offen) return <Button size="sm" variant="secondary" onClick={() => setOffen(true)}>Vertrag bearbeiten</Button>;
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const r = await a.los(url, { vertragId: vertrag?.id || null, daten: d }, { erfolgText: "Vertrag gespeichert." });
        if (r && vertrag) setOffen(false);
      }}
    >
      <p className="col-span-full text-[13.5px] font-semibold text-ink-800">{titel}</p>
      <Feld id="v-l" label="Bisheriger Lieferant" pflicht className="sm:col-span-2"><input id="v-l" className={eingabe} value={d.lieferant} onChange={set("lieferant")} /></Feld>
      <Feld id="v-z" label="Land / Zone"><select id="v-z" className={auswahlfeld} value={d.zone} onChange={set("zone")}><option value="DE">Deutschland</option><option value="AT">Österreich</option></select></Feld>
      <Feld id="v-s" label="Preisstruktur"><select id="v-s" className={auswahlfeld} value={d.struktur} onChange={set("struktur")}>{Object.entries(STRUKTUREN).map(([k, s]) => <option key={k} value={k}>{s.kurz}</option>)}</select></Feld>
      <Feld id="v-p" label="Arbeitspreis (ct/kWh, netto)" pflicht><input id="v-p" inputMode="decimal" className={eingabe} value={d.preisCt} onChange={set("preisCt")} /></Feld>
      <Feld id="v-pa" label="Preis umfasst">
        <select id="v-pa" className={auswahlfeld} value={d.preisArt} onChange={set("preisArt")}><option value="energie">nur Energie (ohne Netz/Abgaben)</option><option value="gesamt">Gesamtpreis inkl. Netz/Abgaben</option></select>
      </Feld>
      <Feld id="v-b" label="Vertragsbeginn"><input id="v-b" type="date" className={eingabe} value={d.beginn} onChange={set("beginn")} /></Feld>
      <Feld id="v-e" label="Vertragsende" pflicht><input id="v-e" type="date" className={eingabe} value={d.vertragEnde} onChange={set("vertragEnde")} /></Feld>
      <Feld id="v-k" label="Kündigungsfrist (Monate)"><input id="v-k" inputMode="numeric" className={eingabe} value={d.kuendigungsfristMonate} onChange={set("kuendigungsfristMonate")} /></Feld>
      <Feld id="v-vm" label="Verlängerung (Monate)"><input id="v-vm" inputMode="numeric" className={eingabe} value={d.verlaengerungMonate} onChange={set("verlaengerungMonate")} /></Feld>
      <Feld id="v-vp" label="Verlängerungsangebot (ct/kWh)" hinweis="falls vorhanden"><input id="v-vp" inputMode="decimal" className={eingabe} value={d.verlaengerungPreisCt} onChange={set("verlaengerungPreisCt")} /></Feld>
      <Feld id="v-j" label="Jahresmenge (kWh)" pflicht><input id="v-j" inputMode="numeric" className={eingabe} value={d.jahresKwh} onChange={set("jahresKwh")} /></Feld>
      <Feld id="v-lp" label="Lastprofil (ohne Lastgang)">
        <select id="v-lp" className={auswahlfeld} value={d.lastprofil} onChange={set("lastprofil")}><option value="einschicht">Einschicht</option><option value="zweischicht">Zweischicht</option><option value="dreischicht">Dreischicht</option><option value="handel">Handel & Büro</option></select>
      </Feld>
      <Feld id="v-pv" label="Geplante PV (kWp)"><input id="v-pv" inputMode="numeric" className={eingabe} value={d.pvKwpGeplant} onChange={set("pvKwpGeplant")} /></Feld>
      <Feld id="v-sp" label="Geplanter Speicher (kWh)"><input id="v-sp" inputMode="numeric" className={eingabe} value={d.speicherKwhGeplant} onChange={set("speicherKwhGeplant")} /></Feld>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" icon={Check} disabled={a.laeuft}>Speichern</Button>
        {vertrag && <Button type="button" size="sm" variant="ghost" icon={X} onClick={() => setOffen(false)}>Abbrechen</Button>}
        <FehlerBox>{a.fehler}</FehlerBox>
        <ErfolgBox>{a.erfolg}</ErfolgBox>
      </div>
    </form>
  );
}

// ================================================================ Ausschreibung anlegen (Backoffice)

const PRODUKT_VORSCHLAG = [
  { art: "fix", laufzeitJahre: 1 },
  { art: "fix", laufzeitJahre: 2 },
  { art: "tranchen", laufzeitJahre: 2, tranchen: 4 },
  { art: "spot", laufzeitJahre: 1 },
];

export function AusschreibungNeu({ kunden = [], lieferanten = [], standardRegel = "abstand" }) {
  const a = useAktion();
  const router = useRouter();
  const naechstesJahr = `${new Date().getFullYear() + 1}-01`;
  const [d, setD] = useState({ titel: "", zone: "DE", lieferbeginn: naechstesJahr, bestpreis: standardRegel, kommune: false, frist: inTagen(14) });
  const [kundenIds, setKundenIds] = useState([]);
  const [lieferantIds, setLieferantIds] = useState([]);
  const [produkte, setProdukte] = useState(PRODUKT_VORSCHLAG.slice(0, 3));
  const set = (k) => (ev) => setD({ ...d, [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value });
  const umschalten = (liste, setListe, id) => setListe(liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);
  const abschicken = async (starten) => {
    const r = await a.los("/api/admin/energie/ausschreibungen", { ...d, frist: isoAusLokal(d.frist), kundenIds, lieferantIds, produkte, starten }, { erfolgText: starten ? "Ausschreibung gestartet." : "Entwurf gespeichert." });
    if (r?.ausschreibung?.id) router.push(`/portal/admin/energie/ausschreibungen/${r.ausschreibung.id}`);
  };
  return (
    <form className="grid gap-5" onSubmit={(ev) => ev.preventDefault()}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Feld id="au-t" label="Titel (intern)" pflicht className="sm:col-span-2"><input id="au-t" className={eingabe} value={d.titel} onChange={set("titel")} placeholder="z. B. Reststrom-Pool Süd 2027" /></Feld>
        <Feld id="au-z" label="Gebotszone"><select id="au-z" className={auswahlfeld} value={d.zone} onChange={set("zone")}><option value="DE">DE-LU</option><option value="AT">AT</option></select></Feld>
        <Feld id="au-l" label="Lieferbeginn" pflicht><input id="au-l" type="month" className={eingabe} value={d.lieferbeginn} onChange={set("lieferbeginn")} /></Feld>
        <Feld id="au-f" label="Angebotsfrist Runde 1"><input id="au-f" type="datetime-local" className={eingabe} value={d.frist} onChange={set("frist")} /></Feld>
        <Feld id="au-b" label="Hinweis in Folgerunden">
          <select id="au-b" className={auswahlfeld} value={d.bestpreis} onChange={set("bestpreis")}>{Object.entries(BESTPREIS_REGELN).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select>
        </Feld>
        <label className="flex items-center gap-2 self-end pb-3 text-[14px] text-ink-700 sm:col-span-2">
          <input type="checkbox" checked={d.kommune} onChange={set("kommune")} className="h-4 w-4 accent-ov-600" />
          Öffentlicher Auftraggeber (Kommune) – nur Markterkundung, Vergaberecht beachten
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-800">Kunden (mehrere = Pool; nur mit aktiver Vollmacht)</legend>
        <div className="flex flex-wrap gap-2">
          {kunden.map((k) => (
            <Chip key={k.kunde.id} checked={kundenIds.includes(k.kunde.id)} onChange={() => umschalten(kundenIds, setKundenIds, k.kunde.id)} value={k.kunde.id}>
              {k.kunde.firma || k.kunde.name}{k.vollmacht !== "erteilt" ? " (ohne Vollmacht)" : ""}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-800">Produktvarianten</legend>
        <ul className="grid gap-2">
          {produkte.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <select aria-label="Art" className={cn(auswahlfeld, "h-10 w-auto")} value={p.art} onChange={(ev) => setProdukte(produkte.map((x, j) => (j === i ? { ...x, art: ev.target.value } : x)))}>
                {Object.entries(PRODUKT_ARTEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select aria-label="Laufzeit" className={cn(auswahlfeld, "h-10 w-auto")} value={p.laufzeitJahre} onChange={(ev) => setProdukte(produkte.map((x, j) => (j === i ? { ...x, laufzeitJahre: Number(ev.target.value) } : x)))}>
                {[1, 2, 3].map((j) => <option key={j} value={j}>{j} {j === 1 ? "Jahr" : "Jahre"}</option>)}
              </select>
              {p.art === "tranchen" && <input aria-label="Anzahl Tranchen" inputMode="numeric" className={cn(eingabe, "h-10 w-24")} value={p.tranchen ?? 4} onChange={(ev) => setProdukte(produkte.map((x, j) => (j === i ? { ...x, tranchen: ev.target.value } : x)))} />}
              <label className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!p.gruen} onChange={(ev) => setProdukte(produkte.map((x, j) => (j === i ? { ...x, gruen: ev.target.checked } : x)))} />Grünstrom (HKN)</label>
              <Button type="button" size="sm" variant="ghost" icon={X} onClick={() => setProdukte(produkte.filter((_, j) => j !== i))}>Entfernen</Button>
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="secondary" icon={Plus} className="mt-2" onClick={() => setProdukte([...produkte, { art: "fix", laufzeitJahre: 1 }])} disabled={produkte.length >= 8}>Variante</Button>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-800">Versorger einladen (mind. 2)</legend>
        <div className="flex flex-wrap gap-2">
          {lieferanten.filter((l) => l.status === "aktiv").map((l) => (
            <Chip key={l.id} checked={lieferantIds.includes(l.id)} onChange={() => umschalten(lieferantIds, setLieferantIds, l.id)} value={l.id}>
              {l.name} ({l.gebiete.join("/")}){!l.konten.length ? " – E-Mail" : ""}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" icon={Play} disabled={a.laeuft} onClick={() => abschicken(true)}>Anlegen und Runde 1 starten</Button>
        <Button type="button" variant="secondary" disabled={a.laeuft} onClick={() => abschicken(false)}>Als Entwurf speichern</Button>
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

// ================================================================ Ausschreibung steuern (Backoffice)

export function AusschreibungSteuerung({ a: x, lieferanten = [] }) {
  const a = useAktion();
  const url = `/api/admin/energie/ausschreibungen/${x.id}`;
  const [frist, setFrist] = useState(inTagen(7));
  const [shortlist, setShortlist] = useState([]);
  const [regel, setRegel] = useState(x.regeln?.bestpreis || "abstand");
  const [grund, setGrund] = useState("");
  const [nach, setNach] = useState([]);
  const eingeladen = new Set(x.runden.flatMap((r) => r.eingeladen || []));
  const mitAngebot = [...new Set(x.angebote.filter((g) => g.runde === x.runde?.nr && g.status === "abgegeben").map((g) => g.lieferantId))];
  const umschalten = (liste, setListe, id) => setListe(liste.includes(id) ? liste.filter((y) => y !== id) : [...liste, id]);
  const status = x.status;
  return (
    <div className="grid gap-5">
      {status === "entwurf" && (
        <div className="flex flex-wrap items-end gap-3">
          <Feld id="st-f" label="Angebotsfrist"><input id="st-f" type="datetime-local" className={eingabe} value={frist} onChange={(e) => setFrist(e.target.value)} /></Feld>
          <Button size="sm" icon={Play} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "starten", frist: isoAusLokal(frist) }, { erfolgText: "Runde 1 gestartet." })}>Runde 1 starten</Button>
        </div>
      )}
      {status === "laufend" && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Feld id="st-f2" label="Neue Frist"><input id="st-f2" type="datetime-local" className={eingabe} value={frist} onChange={(e) => setFrist(e.target.value)} /></Feld>
            <Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "frist", frist: isoAusLokal(frist) }, { erfolgText: "Frist geändert." })}>Frist ändern</Button>
            <Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "erinnern" }, { erfolgText: (r) => r.ausschreibung?.hinweis || "Erinnert." })}>Erinnern</Button>
            <Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => window.confirm("Runde jetzt beenden? Danach sind keine Angebote mehr möglich.") && a.los(url, { aktion: "beenden" }, { erfolgText: "Runde beendet." })}>Runde beenden</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-ink-600">Nachladen:</span>
            {lieferanten.filter((l) => l.status === "aktiv" && !eingeladen.has(l.id)).map((l) => (
              <Chip key={l.id} checked={nach.includes(l.id)} onChange={() => umschalten(nach, setNach, l.id)} value={l.id}>{l.name}</Chip>
            ))}
            {nach.length > 0 && <Button size="sm" icon={Send} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "einladen", lieferantIds: nach }, { erfolgText: "Eingeladen." })}>Einladen</Button>}
          </div>
        </div>
      )}
      {status === "auswertung" && (
        <div className="grid gap-3 rounded-2xl bg-sand-50 p-4">
          <p className="text-[13.5px] font-semibold text-ink-800">Nächste Runde (Shortlist aus Versorgern mit Angebot)</p>
          <div className="flex flex-wrap gap-2">
            {mitAngebot.map((id) => (
              <Chip key={id} checked={shortlist.includes(id)} onChange={() => umschalten(shortlist, setShortlist, id)} value={id}>{lieferanten.find((l) => l.id === id)?.name || id}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Feld id="st-f3" label="Frist"><input id="st-f3" type="datetime-local" className={eingabe} value={frist} onChange={(e) => setFrist(e.target.value)} /></Feld>
            <Feld id="st-r" label="Hinweis an Bieter">
              <select id="st-r" className={auswahlfeld} value={regel} onChange={(e) => setRegel(e.target.value)}>{Object.entries(BESTPREIS_REGELN).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select>
            </Feld>
            <Button size="sm" icon={Play} disabled={a.laeuft || !shortlist.length} onClick={() => a.los(url, { aktion: "naechsteRunde", frist: isoAusLokal(frist), lieferantIds: shortlist, bestpreisRegel: regel }, { erfolgText: "Nächste Runde gestartet." })}>Runde starten</Button>
          </div>
        </div>
      )}
      {status === "freigabe" && (
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "zuschlag" }, { erfolgText: "Zuschlag erteilt." })}>Zuschlag erteilen (nach Kundenfreigabe)</Button>
          <Button size="sm" variant="ghost" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "vorschlagZurueck" }, { erfolgText: "Vorschlag zurückgezogen." })}>Vorschlag zurückziehen</Button>
        </div>
      )}
      {!["zuschlag", "abgebrochen"].includes(status) && (
        <details className="rounded-2xl ring-1 ring-ink-200/70">
          <summary className="cursor-pointer px-4 py-3 text-[13.5px] font-semibold text-ink-700">Ausschreibung abbrechen</summary>
          <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
            <Feld id="st-g" label="Begründung" className="min-w-[240px] flex-1"><input id="st-g" className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} /></Feld>
            <Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "abbrechen", grund }, { erfolgText: "Abgebrochen – Absagen versendet." })}>Abbrechen</Button>
          </div>
        </details>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

/** Zuschlagsvorschlag aus einer Vergleichszeile */
export function VorschlagKnopf({ id, angebotId, produktId }) {
  const a = useAktion();
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  if (!offen) return <Button size="sm" variant="secondary" onClick={() => setOffen(true)}>Vorschlagen</Button>;
  return (
    <div className="grid min-w-[220px] gap-2">
      <textarea aria-label="Begründung für den Kunden" className={cn(textbereich, "min-h-[72px] text-[13.5px]")} value={text} onChange={(e) => setText(e.target.value)} placeholder="Begründung für den Kunden" />
      <div className="flex gap-2">
        <Button size="sm" icon={Send} disabled={a.laeuft} onClick={() => a.los(`/api/admin/energie/ausschreibungen/${id}`, { aktion: "zuschlagVorschlag", angebotId, produktId, begruendung: text }, { erfolgText: "An den Kunden gesendet." })}>Senden</Button>
        <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}

/** Antwort auf eine Bieterfrage */
export function AntwortFormular({ id, frageId }) {
  const a = useAktion();
  const [text, setText] = useState("");
  const [alle, setAlle] = useState(true);
  return (
    <div className="mt-2 grid gap-2">
      <textarea aria-label="Antwort" className={cn(textbereich, "min-h-[72px] text-[13.5px]")} value={text} onChange={(e) => setText(e.target.value)} />
      <label className="flex items-center gap-2 text-[13px] text-ink-600"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={alle} onChange={(e) => setAlle(e.target.checked)} />für alle eingeladenen Versorger sichtbar (ohne Absender)</label>
      <div><Button size="sm" disabled={a.laeuft || text.length < 3} onClick={() => a.los(`/api/admin/energie/ausschreibungen/${id}`, { aktion: "antworten", frageId, antwort: text, oeffentlich: alle }, { erfolgText: "Beantwortet." })}>Antworten</Button></div>
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}

// ================================================================ Lieferantenstamm

export function LieferantNeu() {
  const a = useAktion();
  const [d, setD] = useState({ name: "", land: "DE", gebiete: ["DE"], ap: "", email: "", notiz: "" });
  const set = (k) => (ev) => setD({ ...d, [k]: ev.target.value });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={async (ev) => {
        ev.preventDefault();
        await a.los("/api/admin/energie/lieferanten", { daten: { name: d.name, land: d.land, gebiete: d.gebiete, notiz: d.notiz, ansprechpartner: [{ name: d.ap, email: d.email }] } }, { erfolgText: "Versorger angelegt." });
      }}
    >
      <Feld id="lf-n" label="Versorger" pflicht className="sm:col-span-2"><input id="lf-n" className={eingabe} value={d.name} onChange={set("name")} /></Feld>
      <Feld id="lf-l" label="Sitz"><select id="lf-l" className={auswahlfeld} value={d.land} onChange={set("land")}><option>DE</option><option>AT</option><option>CH</option></select></Feld>
      <Feld id="lf-a" label="Ansprechpartner"><input id="lf-a" className={eingabe} value={d.ap} onChange={set("ap")} /></Feld>
      <Feld id="lf-e" label="E-Mail"><input id="lf-e" type="email" className={eingabe} value={d.email} onChange={set("email")} /></Feld>
      <div className="col-span-full flex flex-wrap items-center gap-3">
        {["DE", "AT"].map((g) => <Chip key={g} value={g} checked={d.gebiete.includes(g)} onChange={() => setD({ ...d, gebiete: d.gebiete.includes(g) ? d.gebiete.filter((x) => x !== g) : [...d.gebiete, g] })}>liefert {g}</Chip>)}
        <Button type="submit" size="sm" icon={Plus} disabled={a.laeuft}>Anlegen</Button>
        <FehlerBox>{a.fehler}</FehlerBox>
        <ErfolgBox>{a.erfolg}</ErfolgBox>
      </div>
    </form>
  );
}

export function LieferantAktionen({ l, ausschreibungen = [] }) {
  const a = useAktion();
  const [sterne, setSterne] = useState(4);
  const [text, setText] = useState("");
  const [email, setEmail] = useState(l.ansprechpartner?.find((x) => x.email)?.email || "");
  const [ausschreibungId, setAid] = useState("");
  const [link, setLink] = useState("");
  const url = `/api/admin/energie/lieferanten/${l.id}`;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-2">
        <p className="text-[13.5px] font-semibold text-ink-800">Bewerten</p>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Sterne">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sterne === s} aria-label={`${s} Sterne`} onClick={() => setSterne(s)} className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ov-500">
              <Star aria-hidden="true" className={cn("h-5 w-5", s <= sterne ? "fill-sun-400 text-sun-500" : "text-ink-300")} />
            </button>
          ))}
        </div>
        <input aria-label="Bemerkung" className={eingabe} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. schnelle, vollständige Angebote" />
        <div><Button size="sm" variant="secondary" disabled={a.laeuft} onClick={() => a.los(url, { aktion: "bewerten", sterne, text }, { erfolgText: "Bewertung gespeichert." })}>Bewertung speichern</Button></div>
      </div>
      <div className="grid gap-2">
        <p className="text-[13.5px] font-semibold text-ink-800">Ins Versorger-Portal einladen</p>
        <input aria-label="E-Mail" type="email" className={eingabe} value={email} onChange={(e) => setEmail(e.target.value)} />
        <select aria-label="Bezug" className={auswahlfeld} value={ausschreibungId} onChange={(e) => setAid(e.target.value)}>
          <option value="">ohne Bezug zu einer Ausschreibung</option>
          {ausschreibungen.map((x) => <option key={x.id} value={x.id}>{x.titel}</option>)}
        </select>
        <div><Button size="sm" icon={Send} disabled={a.laeuft} onClick={() => a.los(url, { aktion: "einladen", email, ausschreibungId: ausschreibungId || null }, { erfolgText: "Einladung per E-Mail gesendet (Postausgang).", danach: (r) => setLink(r.demoLink || "") })}>Einladung senden</Button></div>
        {link && <p className="break-all text-[12px] text-ink-500">Demo-Link: {link}</p>}
      </div>
      <div className="col-span-full"><FehlerBox>{a.fehler}</FehlerBox><ErfolgBox>{a.erfolg}</ErfolgBox></div>
    </div>
  );
}

// ================================================================ Kunde: Vollmacht und Freigabe

export function VollmachtKarte({ vollmacht, text, version }) {
  const a = useAktion();
  const [zustimmung, setZ] = useState(false);
  const aktiv = vollmacht?.status === "erteilt";
  return (
    <div className="grid gap-3">
      <details className="rounded-2xl bg-sand-50 ring-1 ring-sand-200">
        <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-ink-800">Text der Beschaffungsvollmacht (Version {version})</summary>
        <p className="whitespace-pre-line px-4 pb-4 text-[13.5px] leading-relaxed text-ink-700">{text}</p>
      </details>
      {aktiv ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-800"><Check aria-hidden="true" className="h-4 w-4" />Erteilt am {new Date(vollmacht.am).toLocaleDateString("de-DE")}</span>
          <a href="/api/portal/energie/dokument?art=vollmacht" className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">PDF</a>
          <Button size="sm" variant="ghost" disabled={a.laeuft} onClick={() => window.confirm("Vollmacht widerrufen? Laufende Ausschreibungen können dann nicht bezuschlagt werden.") && a.los("/api/portal/energie/vollmacht", { aktion: "widerrufen" }, { erfolgText: "Vollmacht widerrufen." })}>Widerrufen</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="flex items-start gap-2 text-[14px] leading-snug text-ink-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ov-600" checked={zustimmung} onChange={(e) => setZ(e.target.checked)} />
            Ich habe den Text gelesen und erteile die Beschaffungsvollmacht für mein Unternehmen. Zeitpunkt, IP-Adresse und Browser werden protokolliert.
          </label>
          <div><Button size="sm" icon={Check} disabled={a.laeuft || !zustimmung} onClick={() => a.los("/api/portal/energie/vollmacht", { aktion: "erteilen", zustimmung: true }, { erfolgText: "Vollmacht erteilt." })}>Vollmacht erteilen</Button></div>
        </div>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

export function FreigabeKnoepfe({ ausschreibungId }) {
  const a = useAktion();
  const [kommentar, setK] = useState("");
  return (
    <div className="grid gap-3">
      <textarea aria-label="Kommentar (optional)" className={cn(textbereich, "min-h-[72px]")} value={kommentar} onChange={(e) => setK(e.target.value)} placeholder="Kommentar (optional)" />
      <div className="flex flex-wrap gap-3">
        <Button icon={Check} disabled={a.laeuft} onClick={() => window.confirm("Zuschlag verbindlich freigeben? ÖkoInvest leitet dann Vertrag und Lieferantenwechsel ein.") && a.los("/api/portal/energie/freigabe", { ausschreibungId, entscheidung: "freigegeben", kommentar }, { erfolgText: (r) => (r.zuschlag ? "Freigegeben – der Zuschlag ist erteilt." : "Freigegeben – weitere Pool-Kunden stimmen noch zu.") })}>Zuschlag freigeben</Button>
        <Button variant="secondary" disabled={a.laeuft} onClick={() => a.los("/api/portal/energie/freigabe", { ausschreibungId, entscheidung: "abgelehnt", kommentar }, { erfolgText: "Abgelehnt – das Backoffice meldet sich." })}>Ablehnen</Button>
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

// ================================================================ Versorger: Preisblatt und Fragen

export function Preisblatt({ a: x, letztes = null }) {
  const a = useAktion();
  const start = Object.fromEntries(x.produkte.map((p) => {
    const alt = letztes?.positionen?.find((y) => y.produktId === p.id);
    return [p.id, { aktiv: !!alt || !letztes, arbeitspreisCt: alt?.arbeitspreisCt ?? "", aufschlagCt: alt?.aufschlagCt ?? "", grundpreisEurMonat: alt?.grundpreisEurMonat ?? "", hknCt: alt?.hknCt ?? "", mengentoleranzProzent: alt?.mengentoleranzProzent ?? "" }];
  }));
  const [pos, setPos] = useState(start);
  const bfStandard = () => {
    const d = new Date(Date.parse(x.runde?.frist || Date.now()) + 10 * 86400e3);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`;
  };
  const [kopf, setKopf] = useState({ bindefristBis: letztes?.bindefristBis ? lokalAusIso(letztes.bindefristBis) : bfStandard(), zahlungszielTage: letztes?.zahlungszielTage ?? 14, sicherheit: letztes?.sicherheit || "keine", bemerkung: letztes?.bemerkung || "" });
  const setP = (id, k) => (ev) => setPos({ ...pos, [id]: { ...pos[id], [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value } });
  return (
    <form
      className="grid gap-4"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const positionen = x.produkte.filter((p) => pos[p.id].aktiv).map((p) => ({ produktId: p.id, ...pos[p.id] }));
        await a.los(`/api/portal/ausschreibungen/${x.id}/angebot`, { positionen, ...kopf, bindefristBis: isoAusLokal(kopf.bindefristBis) }, { erfolgText: "Angebot verdeckt abgegeben. Sie können es bis zur Frist ändern." });
      }}
    >
      <div className="grid gap-3">
        {x.produkte.map((p) => (
          <fieldset key={p.id} className={cn("grid gap-3 rounded-2xl p-4 ring-1 sm:grid-cols-2 lg:grid-cols-5", pos[p.id].aktiv ? "bg-white ring-ink-200" : "bg-ink-50 ring-ink-100")}>
            <legend className="sr-only">{produktLabel(p)}</legend>
            <label className="col-span-full flex items-center gap-2 text-[14px] font-semibold text-ink-900">
              <input type="checkbox" className="h-4 w-4 accent-ov-600" checked={pos[p.id].aktiv} onChange={setP(p.id, "aktiv")} />
              {produktLabel(p)}
            </label>
            {pos[p.id].aktiv && (
              <>
                {p.art === "fix" ? (
                  <Feld id={`pb-ap-${p.id}`} label="Arbeitspreis (ct/kWh)" pflicht><input id={`pb-ap-${p.id}`} inputMode="decimal" className={eingabe} value={pos[p.id].arbeitspreisCt} onChange={setP(p.id, "arbeitspreisCt")} /></Feld>
                ) : (
                  <Feld id={`pb-au-${p.id}`} label={p.art === "spot" ? "Aufschlag auf Spot (ct/kWh)" : "Aufschlag je kWh (ct)"} pflicht><input id={`pb-au-${p.id}`} inputMode="decimal" className={eingabe} value={pos[p.id].aufschlagCt} onChange={setP(p.id, "aufschlagCt")} /></Feld>
                )}
                <Feld id={`pb-gp-${p.id}`} label="Grundpreis (€/Monat)" pflicht><input id={`pb-gp-${p.id}`} inputMode="decimal" className={eingabe} value={pos[p.id].grundpreisEurMonat} onChange={setP(p.id, "grundpreisEurMonat")} /></Feld>
                {p.gruen && <Feld id={`pb-hk-${p.id}`} label="HKN (ct/kWh)" pflicht><input id={`pb-hk-${p.id}`} inputMode="decimal" className={eingabe} value={pos[p.id].hknCt} onChange={setP(p.id, "hknCt")} /></Feld>}
                <Feld id={`pb-mt-${p.id}`} label="Mengentoleranz (± %)"><input id={`pb-mt-${p.id}`} inputMode="decimal" className={eingabe} value={pos[p.id].mengentoleranzProzent} onChange={setP(p.id, "mengentoleranzProzent")} /></Feld>
              </>
            )}
          </fieldset>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Feld id="pb-bf" label="Bindefrist" pflicht><input id="pb-bf" type="datetime-local" className={eingabe} value={kopf.bindefristBis} onChange={(e) => setKopf({ ...kopf, bindefristBis: e.target.value })} /></Feld>
        <Feld id="pb-zz" label="Zahlungsziel (Tage)" pflicht><input id="pb-zz" inputMode="numeric" className={eingabe} value={kopf.zahlungszielTage} onChange={(e) => setKopf({ ...kopf, zahlungszielTage: e.target.value })} /></Feld>
        <Feld id="pb-si" label="Geforderte Sicherheit" pflicht>
          <select id="pb-si" className={auswahlfeld} value={kopf.sicherheit} onChange={(e) => setKopf({ ...kopf, sicherheit: e.target.value })}>{Object.entries(SICHERHEITEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Feld>
        <Feld id="pb-bm" label="Bemerkung"><input id="pb-bm" className={eingabe} value={kopf.bemerkung} onChange={(e) => setKopf({ ...kopf, bemerkung: e.target.value })} /></Feld>
      </div>
      <p className="text-[12.5px] leading-snug text-ink-500">Preise netto ohne Netzentgelte, Umlagen, Abgaben und Steuern. Ihr Angebot ist verdeckt – andere Versorger sehen es nicht. Bis zur Frist können Sie es ersetzen.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" icon={Send} disabled={a.laeuft}>{letztes ? "Angebot ersetzen" : "Angebot abgeben"}</Button>
        <FehlerBox>{a.fehler}</FehlerBox>
        <ErfolgBox>{a.erfolg}</ErfolgBox>
      </div>
    </form>
  );
}

export function FrageFormular({ id }) {
  const a = useAktion();
  const [text, setText] = useState("");
  return (
    <form
      className="grid gap-2"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const r = await a.los(`/api/portal/ausschreibungen/${id}/fragen`, { text }, { erfolgText: "Frage gesendet. Antworten gehen anonymisiert an alle Bieter." });
        if (r) setText("");
      }}
    >
      <textarea aria-label="Ihre Frage" className={cn(textbereich, "min-h-[80px]")} value={text} onChange={(e) => setText(e.target.value)} placeholder="Frage zu Mengen, Profil, Produkten oder Fristen" />
      <div><Button type="submit" size="sm" variant="secondary" icon={Send} disabled={a.laeuft || text.length < 10}>Frage senden</Button></div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

// ================================================================ Einladung annehmen (öffentliche Seite)

export function EinladungAnnehmen({ token, angemeldet, kontoVorhanden }) {
  const a = useAktion();
  const router = useRouter();
  const [d, setD] = useState({ vorname: "", nachname: "", passwort: "" });
  if (a.erfolg) {
    return <ErfolgBox>{a.erfolg}</ErfolgBox>;
  }
  if (angemeldet) {
    return (
      <div className="grid gap-3">
        <Button icon={Check} disabled={a.laeuft} onClick={() => a.los("/api/portal/ausschreibungen/einladung", { token }, { erfolgText: "Einladung angenommen – Sie werden weitergeleitet.", danach: (r) => router.push(r.weiter || "/portal/ausschreibungen") })}>Einladung annehmen</Button>
        <FehlerBox>{a.fehler}</FehlerBox>
      </div>
    );
  }
  if (kontoVorhanden) {
    return (
      <div className="grid gap-3">
        <p className="text-[14.5px] text-ink-700">Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an und öffnen Sie danach den Link erneut.</p>
        <div><Button href={`/login?weiter=${encodeURIComponent(`/einladung/lieferant/${token}`)}`}>Anmelden</Button></div>
      </div>
    );
  }
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (ev) => {
        ev.preventDefault();
        await a.los("/api/portal/ausschreibungen/einladung", { token, ...d }, { erfolgText: "Konto angelegt. Bitte melden Sie sich jetzt mit Ihrer E-Mail-Adresse an.", danach: () => setTimeout(() => router.push(`/login?weiter=${encodeURIComponent("/portal/ausschreibungen")}`), 1200) });
      }}
    >
      <Feld id="ei-v" label="Vorname" pflicht><input id="ei-v" autoComplete="given-name" className={eingabe} value={d.vorname} onChange={(e) => setD({ ...d, vorname: e.target.value })} /></Feld>
      <Feld id="ei-n" label="Nachname" pflicht><input id="ei-n" autoComplete="family-name" className={eingabe} value={d.nachname} onChange={(e) => setD({ ...d, nachname: e.target.value })} /></Feld>
      <Feld id="ei-p" label="Passwort" pflicht hinweis="Mindestens 10 Zeichen, Buchstabe und Ziffer bzw. Sonderzeichen" className="sm:col-span-2"><input id="ei-p" type="password" autoComplete="new-password" className={eingabe} value={d.passwort} onChange={(e) => setD({ ...d, passwort: e.target.value })} /></Feld>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" icon={Check} disabled={a.laeuft}>Konto anlegen und annehmen</Button>
        <FehlerBox>{a.fehler}</FehlerBox>
      </div>
    </form>
  );
}

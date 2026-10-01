"use client";

// src/components/Portal/EG/Energie/SimulationRechner.js
//
// Simulation einer Energiegemeinschaft vor der Gründung (WP3, Fachkonzept 4.7) – Bedienoberfläche. Gerechnet wird im
// Backend (eg/simulation.js bzw. eg_energie_kern.py) mit der Netzentgelt-Regeltabelle; hier nur Eingabe und Darstellung.
// Eigene Lastgänge (CSV aus dem Netzbetreiber-Portal) werden im Browser zu Stundenwerten eines Jahres verdichtet.

import { useMemo, useState } from "react";
import { Calculator, Copy, Plus, Save, Trash2, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { Badge, Hinweis, Karte, Kennzahl } from "@/components/Portal/ui";
import { BalkenChart, FARBEN, Legende, LinienChart } from "@/components/Portal/Energie/Diagramme";
import { senden } from "@/lib/plattform/client";
import { csvParsen, lokalZeit } from "@/lib/plattform/eg/messwerte";
import { LASTPROFILE, SIM_STANDARD } from "@/lib/plattform/eg/simulation";

const zahl = (x, s = 0) => (Number.isFinite(Number(x)) && x !== null ? Number(x).toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");
const pct = (x, s = 1) => `${zahl(Number(x) * 100, s)} %`;
const eur = (x) => `${zahl(x, 0)} €`;
const ARTEN = { privat: "Haushalt", landwirt: "Landwirtschaft", kmu: "KMU", grossunternehmen: "Großunternehmen", gemeinde: "Gemeinde", oeffentlich: "Öffentlich", verein: "Verein" };
const MODELLE = { eeg: "EEG", beg: "BEG", gea: "GEA", p2p: "P2P", eigenversorgung: "Eigenversorgung" };
const PREISE = [
  ["lieferantCt", "Energiepreis Lieferant", "ct/kWh"],
  ["bezugCt", "Preis Gemeinschaft an Verbraucher", "ct/kWh"],
  ["einspeisCt", "Preis Gemeinschaft an Erzeuger", "ct/kWh"],
  ["marktwertCt", "Vergütung Restüberschuss", "ct/kWh"],
  ["netzApCt", "Netznutzungs-Arbeitspreis", "ct/kWh"],
  ["elAbgSonstCt", "Elektrizitätsabgabe (sonst)", "ct/kWh"],
  ["elAbgHaushaltCt", "Elektrizitätsabgabe (Haushalt)", "ct/kWh"],
  ["verwaltungEurJeTeilnehmer", "Verwaltung je Teilnehmer", "€/Jahr"],
  ["mitgliedsbeitragEur", "Mitgliedsbeitrag", "€/Jahr"],
];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
let lauf = 0;
const neueZeile = (d = {}) => ({ schluessel: `z${++lauf}`, name: "", art: "privat", profil: "", jahresverbrauchKwh: 3500, anzahl: 1, tf: 100, pvKwp: 0, waermepumpeKwh: 0, eautoKwh: 0, schutzbeduerftig: false, lastgang: null, lastgangInfo: "", ...d });
const neueAnlage = (d = {}) => ({ schluessel: `a${++lauf}`, name: "", kwp: 50, ausrichtung: 0, neigung: 25, tf: 100, gemeinde: false, ...d });
const STANDARD = {
  titel: "Neue Gemeinschaft", modell: "eeg", zonelevel: 3, verteilmodell: "dynamisch", ustStatus: "kleinunternehmer", standort: { lat: 48.2, lon: 13.5 },
  preise: { ...SIM_STANDARD },
  teilnehmer: [neueZeile({ name: "Haushalte", anzahl: 20 }), neueZeile({ name: "Gemeindeamt", art: "gemeinde", profil: "G1", jahresverbrauchKwh: 25000 }), neueZeile({ name: "Gewerbe", art: "kmu", jahresverbrauchKwh: 40000 }), neueZeile({ name: "Prosumer mit PV", anzahl: 5, pvKwp: 8 })],
  anlagen: [neueAnlage({ name: "PV Gemeindedach", kwp: 60, gemeinde: true })],
  speicher: { kapazitaetKwh: 0, leistungKw: 0, wirkungsgradPct: 90 },
};

function ausVorlage(v) {
  if (!v) return STANDARD;
  return { ...STANDARD, ...v, preise: { ...SIM_STANDARD, ...(v.preise || {}) }, teilnehmer: (v.teilnehmer || []).map((t) => neueZeile({ ...t, profil: t.profil === "lastgang" ? "" : t.profil || "", lastgang: null })), anlagen: (v.anlagen || []).map((a) => neueAnlage(a)), speicher: v.speicher || STANDARD.speicher };
}

/** CSV-Lastgang → 8.760 Stundenwerte (kWh) eines Normaljahres (Tag im Jahr ohne 29.02., Lokalzeit) */
function lastgangStunden(text) {
  const e = csvParsen(text);
  const r = e.reihen.find((x) => x.groesse === "verbrauch_gemessen") || e.reihen[0];
  const h = new Array(8760).fill(null);
  for (const p of r.punkte) {
    const l = lokalZeit(p.ms);
    const mo = Number(l.slice(5, 7));
    const d = Number(l.slice(8, 10));
    if (mo === 2 && d === 29) continue;
    const doy = Math.round((Date.UTC(2025, mo - 1, d) - Date.UTC(2025, 0, 1)) / 864e5);
    const i = doy * 24 + Number(l.slice(11, 13));
    h[i] = (h[i] || 0) + p.wert;
  }
  const fehlt = h.filter((x) => x === null).length;
  if (fehlt > 876) throw new Error(`Lastgang deckt kein ganzes Jahr ab (${Math.round((fehlt / 8760) * 100)} % der Stunden fehlen) – bitte 12 Monate exportieren.`);
  const mittel = Array.from({ length: 24 }, (_, s) => {
    const w = h.filter((x, i) => x !== null && i % 24 === s);
    return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
  });
  const voll = h.map((x, i) => (x === null ? mittel[i % 24] : x));
  return { stunden: voll, summe: voll.reduce((a, b) => a + b, 0), zaehlpunkt: e.zaehlpunktnummer, ergaenzt: fehlt };
}

export default function SimulationRechner({ url, vorlage = null, gemeinschaftId = "", gespeichert = [], darfSpeichern = false }) {
  const [e, setE] = useState(() => ausVorlage(vorlage));
  const [netzManuell, setNetzManuell] = useState(false);
  const [netz, setNetz] = useState({ reduktionPct: 57, abgabenBefreit: true });
  const [erg, setErg] = useState(null);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const setze = (k, v) => setE((x) => ({ ...x, [k]: v }));
  const zeile = (i, k, v) => setE((x) => ({ ...x, teilnehmer: x.teilnehmer.map((t, j) => (j === i ? { ...t, [k]: v } : t)) }));
  const anlage = (i, k, v) => setE((x) => ({ ...x, anlagen: x.anlagen.map((a, j) => (j === i ? { ...a, [k]: v } : a)) }));
  const summeTn = useMemo(() => e.teilnehmer.reduce((s, t) => s + (Number(t.anzahl) || 1), 0), [e.teilnehmer]);

  function daten(speichern = false) {
    return {
      titel: e.titel, gemeinschaftId: gemeinschaftId || undefined, modell: e.modell, zonelevel: Number(e.zonelevel), verteilmodell: e.verteilmodell, ustStatus: e.ustStatus, standort: e.standort, preise: e.preise, saat: e.saat,
      netz: netzManuell ? { reduktionPct: Number(netz.reduktionPct), abgabenBefreit: netz.abgabenBefreit } : undefined,
      teilnehmer: e.teilnehmer.map((t) => ({ id: t.id, name: t.name, art: t.art, profil: t.lastgang ? "lastgang" : t.profil || undefined, lastgang: t.lastgang || undefined, jahresverbrauchKwh: Number(t.jahresverbrauchKwh), anzahl: Number(t.anzahl) || 1, tf: Number(t.tf), tfErzeugung: Number(t.tfErzeugung || t.tf), pvKwp: Number(t.pvKwp) || 0, pvAusrichtung: Number(t.pvAusrichtung) || 0, pvNeigung: Number(t.pvNeigung ?? 30), waermepumpeKwh: Number(t.waermepumpeKwh) || 0, eautoKwh: Number(t.eautoKwh) || 0, schutzbeduerftig: !!t.schutzbeduerftig, schluesselPct: Number(t.schluesselPct) || 0 })),
      anlagen: e.anlagen.map((a) => ({ id: a.id, name: a.name, kwp: Number(a.kwp), ausrichtung: Number(a.ausrichtung), neigung: Number(a.neigung), tf: Number(a.tf), gemeinde: !!a.gemeinde })),
      speicher: Number(e.speicher?.kapazitaetKwh) > 0 ? { kapazitaetKwh: Number(e.speicher.kapazitaetKwh), leistungKw: Number(e.speicher.leistungKw) || Number(e.speicher.kapazitaetKwh) / 2, wirkungsgradPct: Number(e.speicher.wirkungsgradPct) || 90 } : null,
      speichern,
    };
  }
  async function rechnen(speichern = false) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(url, { body: { daten: daten(speichern) } });
      setErg(r.ergebnis);
      if (speichern) setErfolg(`Simulation gespeichert (${r.ergebnis.id}).`);
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  async function lastgangLaden(i, ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const l = lastgangStunden(await f.text());
      zeile(i, "lastgang", l.stunden);
      zeile(i, "lastgangInfo", `${f.name}: ${zahl(l.summe)} kWh/Jahr${l.ergaenzt ? `, ${l.ergaenzt} Stunden ergänzt` : ""}`);
      zeile(i, "anzahl", 1);
      zeile(i, "jahresverbrauchKwh", Math.round(l.summe));
    } catch (x) {
      setFehler(`Lastgang: ${x.message}`);
    }
  }

  return (
    <div className="space-y-6">
      {gespeichert.length > 0 && (
        <Karte titel="Gespeicherte Simulationen" untertitel="Laden übernimmt die Eingabe (ohne hochgeladene Lastgänge)">
          <ul className="divide-y divide-ink-100">
            {gespeichert.slice(0, 12).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0"><p className="text-[14px] font-semibold text-ink-900">{s.titel}</p><p className="text-[12.5px] text-ink-500">{s.gemeinschaft || "ohne Gemeinschaft"} · {s.teilnehmer} Zeilen · Eigendeckung {pct(s.kennzahlen?.eigendeckungsquote || 0)} · Vorteil {eur(s.kennzahlen?.vorteilEur || 0)}/Jahr · {String(s.erstelltAm).slice(0, 10)}</p></div>
                <Button type="button" size="sm" variant="ghost" icon={Copy} onClick={() => { setE(ausVorlage(s.eingabe)); setErg(s.ergebnis ? { ...s.ergebnis, kennzahlen: s.kennzahlen } : null); }}>Laden</Button>
              </li>
            ))}
          </ul>
        </Karte>
      )}

      <Karte titel="Rahmen" untertitel="Modell, Nahebereich und Standort – die Netzentgelt-Reduktion kommt aus der Regeltabelle (datums- und zonenabhängig)">
        <div className="grid gap-4 md:grid-cols-3">
          <Feld id="s-titel" label="Titel" className="md:col-span-3"><input id="s-titel" className={eingabe} value={e.titel} onChange={(x) => setze("titel", x.target.value)} /></Feld>
          <Feld id="s-modell" label="Modell"><select id="s-modell" className={auswahlfeld} value={e.modell} onChange={(x) => setze("modell", x.target.value)}>{Object.entries(MODELLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
          <Feld id="s-zl" label="Zonelevel" hinweis="1 Hauptleitung · 3 Trafostation · 4 Umspannwerk · 6 ohne"><select id="s-zl" className={auswahlfeld} value={e.zonelevel} onChange={(x) => setze("zonelevel", Number(x.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((z) => <option key={z} value={z}>{z}</option>)}</select></Feld>
          <Feld id="s-vm" label="Verteilmodell"><select id="s-vm" className={auswahlfeld} value={e.verteilmodell} onChange={(x) => setze("verteilmodell", x.target.value)}><option value="dynamisch">dynamisch</option><option value="statisch">statisch (Bestand)</option></select></Feld>
          <Feld id="s-lat" label="Breitengrad"><input id="s-lat" type="number" step="0.01" className={eingabe} value={e.standort.lat} onChange={(x) => setze("standort", { ...e.standort, lat: x.target.value })} /></Feld>
          <Feld id="s-lon" label="Längengrad"><input id="s-lon" type="number" step="0.01" className={eingabe} value={e.standort.lon} onChange={(x) => setze("standort", { ...e.standort, lon: x.target.value })} /></Feld>
          <Feld id="s-ust" label="Umsatzsteuer der Gemeinschaft"><select id="s-ust" className={auswahlfeld} value={e.ustStatus} onChange={(x) => setze("ustStatus", x.target.value)}><option value="kleinunternehmer">Kleinunternehmer</option><option value="regelbesteuert">regelbesteuert</option></select></Feld>
        </div>
        <label className="mt-4 flex items-center gap-2 text-[13.5px] text-ink-700"><input type="checkbox" checked={netzManuell} onChange={(x) => setNetzManuell(x.target.checked)} /> Netzentgelt-Reduktion selbst vorgeben (sonst Regeltabelle)</label>
        {netzManuell && (
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <Feld id="s-red" label="Reduktion Netznutzungs-AP %"><input id="s-red" type="number" className={eingabe} value={netz.reduktionPct} onChange={(x) => setNetz({ ...netz, reduktionPct: x.target.value })} /></Feld>
            <label className="flex items-center gap-2 pt-7 text-[13.5px] text-ink-700"><input type="checkbox" checked={netz.abgabenBefreit} onChange={(x) => setNetz({ ...netz, abgabenBefreit: x.target.checked })} /> Elektrizitätsabgabe befreit</label>
          </div>
        )}
      </Karte>

      <Karte titel={`Teilnehmer (${summeTn})`} untertitel="Standardlastprofile (angenähert, Lizenz der Originalprofile zu bestätigen) oder eigener Lastgang · Anzahl fasst gleichartige Teilnehmer zusammen">
        <div className="space-y-3">
          {e.teilnehmer.map((t, i) => (
            <div key={t.schluessel} className="rounded-2xl p-3 ring-1 ring-inset ring-ink-200">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <Feld id={`t-n-${i}`} label="Bezeichnung" className="col-span-2"><input id={`t-n-${i}`} className={eingabe} value={t.name} onChange={(x) => zeile(i, "name", x.target.value)} /></Feld>
                <Feld id={`t-a-${i}`} label="Art"><select id={`t-a-${i}`} className={auswahlfeld} value={t.art} onChange={(x) => zeile(i, "art", x.target.value)}>{Object.entries(ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
                <Feld id={`t-p-${i}`} label="Profil"><select id={`t-p-${i}`} className={auswahlfeld} value={t.lastgang ? "lastgang" : t.profil} disabled={!!t.lastgang} onChange={(x) => zeile(i, "profil", x.target.value)}><option value="">nach Art</option>{Object.entries(LASTPROFILE).filter(([k]) => k !== "lastgang" || t.lastgang).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
                <Feld id={`t-v-${i}`} label="kWh/Jahr je Teilnehmer"><input id={`t-v-${i}`} type="number" className={eingabe} value={t.jahresverbrauchKwh ?? ""} disabled={!!t.lastgang} onChange={(x) => zeile(i, "jahresverbrauchKwh", x.target.value)} /></Feld>
                <Feld id={`t-z-${i}`} label="Anzahl"><input id={`t-z-${i}`} type="number" min="1" className={eingabe} value={t.anzahl} disabled={!!t.lastgang} onChange={(x) => zeile(i, "anzahl", x.target.value)} /></Feld>
                <Feld id={`t-tf-${i}`} label="TF %"><input id={`t-tf-${i}`} type="number" min="1" max="100" className={eingabe} value={t.tf} onChange={(x) => zeile(i, "tf", x.target.value)} /></Feld>
                <Feld id={`t-pv-${i}`} label="eigene PV kWp"><input id={`t-pv-${i}`} type="number" min="0" step="0.1" className={eingabe} value={t.pvKwp} onChange={(x) => zeile(i, "pvKwp", x.target.value)} /></Feld>
                <Feld id={`t-wp-${i}`} label="Wärmepumpe kWh"><input id={`t-wp-${i}`} type="number" min="0" className={eingabe} value={t.waermepumpeKwh} onChange={(x) => zeile(i, "waermepumpeKwh", x.target.value)} /></Feld>
                <Feld id={`t-ev-${i}`} label="E-Auto kWh"><input id={`t-ev-${i}`} type="number" min="0" className={eingabe} value={t.eautoKwh} onChange={(x) => zeile(i, "eautoKwh", x.target.value)} /></Feld>
                {e.verteilmodell === "statisch" && <Feld id={`t-s-${i}`} label="Schlüssel %"><input id={`t-s-${i}`} type="number" min="0" max="100" step="0.1" className={eingabe} value={t.schluesselPct || 0} onChange={(x) => zeile(i, "schluesselPct", x.target.value)} /></Feld>}
                <div className="col-span-2 flex flex-wrap items-end gap-2 md:col-span-2">
                  <label className="inline-flex h-12 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Upload aria-hidden="true" className="h-4 w-4" />Lastgang<input type="file" accept=".csv,.txt" className="sr-only" onChange={(x) => lastgangLaden(i, x)} /></label>
                  <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-600"><input type="checkbox" checked={!!t.schutzbeduerftig} onChange={(x) => zeile(i, "schutzbeduerftig", x.target.checked)} /> schutzbedürftig</label>
                  <button type="button" aria-label={`Teilnehmer ${i + 1} entfernen`} onClick={() => setE((x) => ({ ...x, teilnehmer: x.teilnehmer.filter((_, j) => j !== i) }))} className="ml-auto rounded-full p-2 text-ink-500 hover:bg-ink-100"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                </div>
              </div>
              {t.lastgangInfo && <p className="mt-2 text-[12px] text-ov-700">{t.lastgangInfo} <button type="button" className="ml-2 underline" onClick={() => { zeile(i, "lastgang", null); zeile(i, "lastgangInfo", ""); }}>entfernen</button></p>}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setE((x) => ({ ...x, teilnehmer: [...x.teilnehmer, neueZeile()] }))}>Teilnehmer</Button>
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setE((x) => ({ ...x, teilnehmer: [...x.teilnehmer, neueZeile({ name: "Weitere Haushalte", anzahl: 10 })] }))}>10 Haushalte</Button>
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setE((x) => ({ ...x, teilnehmer: [...x.teilnehmer, neueZeile({ name: "Landwirtschaft", art: "landwirt", jahresverbrauchKwh: 15000, pvKwp: 30 })] }))}>Landwirt mit PV</Button>
          </div>
        </div>
      </Karte>

      <Karte titel="Gemeinschaftsanlagen und Speicher" untertitel="Anlagen ohne eigenen Verbrauch (Volleinspeisung in die Gemeinschaft); Ausrichtung 0 = Süd, −90 = Ost, 90 = West">
        <div className="space-y-3">
          {e.anlagen.map((a, i) => (
            <div key={a.schluessel} className="grid grid-cols-2 gap-3 rounded-2xl p-3 ring-1 ring-inset ring-ink-200 md:grid-cols-7">
              <Feld id={`a-n-${i}`} label="Bezeichnung" className="col-span-2"><input id={`a-n-${i}`} className={eingabe} value={a.name} onChange={(x) => anlage(i, "name", x.target.value)} /></Feld>
              <Feld id={`a-k-${i}`} label="kWp"><input id={`a-k-${i}`} type="number" min="0" className={eingabe} value={a.kwp} onChange={(x) => anlage(i, "kwp", x.target.value)} /></Feld>
              <Feld id={`a-r-${i}`} label="Ausrichtung °"><input id={`a-r-${i}`} type="number" className={eingabe} value={a.ausrichtung} onChange={(x) => anlage(i, "ausrichtung", x.target.value)} /></Feld>
              <Feld id={`a-g-${i}`} label="Neigung °"><input id={`a-g-${i}`} type="number" className={eingabe} value={a.neigung} onChange={(x) => anlage(i, "neigung", x.target.value)} /></Feld>
              <Feld id={`a-t-${i}`} label="TF %"><input id={`a-t-${i}`} type="number" min="1" max="100" className={eingabe} value={a.tf} onChange={(x) => anlage(i, "tf", x.target.value)} /></Feld>
              <div className="flex items-end gap-2">
                <label className="inline-flex items-center gap-1.5 pb-3 text-[12.5px] text-ink-600"><input type="checkbox" checked={!!a.gemeinde} onChange={(x) => anlage(i, "gemeinde", x.target.checked)} /> Gemeinde</label>
                <button type="button" aria-label={`Anlage ${i + 1} entfernen`} onClick={() => setE((x) => ({ ...x, anlagen: x.anlagen.filter((_, j) => j !== i) }))} className="mb-1.5 ml-auto rounded-full p-2 text-ink-500 hover:bg-ink-100"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setE((x) => ({ ...x, anlagen: [...x.anlagen, neueAnlage()] }))}>Anlage</Button>
          <div className="grid gap-4 border-t border-ink-100 pt-4 md:grid-cols-3">
            <Feld id="sp-k" label="Gemeinschaftsspeicher kWh" hinweis="0 = ohne Speicher"><input id="sp-k" type="number" min="0" className={eingabe} value={e.speicher?.kapazitaetKwh || 0} onChange={(x) => setze("speicher", { ...e.speicher, kapazitaetKwh: x.target.value })} /></Feld>
            <Feld id="sp-l" label="Leistung kW"><input id="sp-l" type="number" min="0" className={eingabe} value={e.speicher?.leistungKw || ""} placeholder="halbe Kapazität" onChange={(x) => setze("speicher", { ...e.speicher, leistungKw: x.target.value })} /></Feld>
            <Feld id="sp-w" label="Wirkungsgrad %"><input id="sp-w" type="number" min="50" max="100" className={eingabe} value={e.speicher?.wirkungsgradPct || 90} onChange={(x) => setze("speicher", { ...e.speicher, wirkungsgradPct: x.target.value })} /></Feld>
          </div>
        </div>
      </Karte>

      <Karte titel="Preise" untertitel="netto, Orientierung Österreich 2026 – je Gemeinschaft und Netzbereich anpassen (zu bestätigen)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {PREISE.map(([k, l, einheit]) => <Feld key={k} id={`p-${k}`} label={`${l} (${einheit})`}><input id={`p-${k}`} type="number" step="0.01" className={eingabe} value={e.preise[k]} onChange={(x) => setze("preise", { ...e.preise, [k]: x.target.value })} /></Feld>)}
        </div>
      </Karte>

      <div className="flex flex-wrap gap-2">
        <Button type="button" icon={Calculator} onClick={() => rechnen(false)} disabled={laeuft}>{laeuft ? "Rechnet …" : "Simulation rechnen"}</Button>
        {darfSpeichern && <Button type="button" variant="secondary" icon={Save} onClick={() => rechnen(true)} disabled={laeuft}>Rechnen und speichern</Button>}
      </div>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {erfolg && <ErfolgBox>{erfolg}</ErfolgBox>}
      {erg && <Ergebnis erg={erg} />}
    </div>
  );
}

function Ergebnis({ erg }) {
  const k = erg.kennzahlen;
  const tag = (t) => [
    { name: "Erzeugung × TF", farbe: FARBEN.sonne, flaeche: "rgba(245,167,15,0.18)", punkte: t.erzeugungTf.map((y, x) => ({ x, y: y * 4 })) },
    { name: "Verbrauch × TF", farbe: FARBEN.navy, punkte: t.verbrauchTf.map((y, x) => ({ x, y: y * 4 })) },
    { name: "Eigendeckung", farbe: FARBEN.gruen, flaeche: FARBEN.gruenHell, punkte: t.eigendeckung.map((y, x) => ({ x, y: y * 4 })) },
  ];
  const stunde = (x) => `${String(Math.floor(x / 4)).padStart(2, "0")}:00`;
  return (
    <div className="space-y-6" aria-live="polite">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Eigendeckungsquote" wert={pct(k.eigendeckungsquote)} hinweis={`${zahl(k.eigendeckungKwh)} von ${zahl(k.verbrauchTfKwh)} kWh`} ton="dunkel" />
        <Kennzahl label="Nutzungsgrad der Erzeugung" wert={pct(k.nutzungsgrad)} hinweis={`Restüberschuss ${zahl(k.restueberschussKwh)} kWh`} />
        <Kennzahl label="Vorteil je Teilnehmer" wert={eur(k.vorteilJeTeilnehmerEur)} hinweis={`gesamt ${eur(k.vorteilEur)} je Jahr`} />
        <Kennzahl label="Deckungsbeitrag Gemeinschaft" wert={eur(k.deckungsbeitragEur)} hinweis={`Umsatz ${eur(k.umsatzBruttoEur)} · ${k.kleinunternehmer === "unter_grenze" ? "Kleinunternehmer möglich" : "über der Grenze"}`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge ton="info">Netzentgelt −{zahl(k.netzReduktionPct)} %{erg.netzRegel?.status === "platzhalter" ? " (Platzhalter)" : ""}</Badge>
        <Badge ton={k.abgabenBefreit ? "ok" : "neutral"}>{k.abgabenBefreit ? "Elektrizitätsabgabe befreit" : "keine Abgabenbefreiung"}</Badge>
        <Badge ton={k.lieferantenpflichten ? "warn" : "neutral"}>{zahl(k.erzeugungsleistungKw, 1)} kW{k.lieferantenpflichten ? " · § 69 ElWG" : ""}</Badge>
        <Badge>Autarkie {pct(k.autarkie)}</Badge>
      </div>
      {erg.varianten?.length > 0 && (
        <Karte titel="Vergleich nach Nahebereich" untertitel={`Gleiche Zuteilung, Netzentgelt und Abgaben nach Regeltabelle (Stichtag ${erg.stichtag || "heute"})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead><tr className="text-left text-ink-500"><th className="py-1.5 pr-3 font-medium">Variante</th><th className="py-1.5 pr-3 text-right font-medium">Netz-AP</th><th className="py-1.5 pr-3 text-right font-medium">Vorteil gesamt</th><th className="py-1.5 pr-3 text-right font-medium">je Teilnehmer</th><th className="py-1.5 font-medium">Hinweis</th></tr></thead>
              <tbody>{erg.varianten.map((v) => <tr key={v.id} className="border-t border-ink-100 align-top"><td className="py-1.5 pr-3 font-semibold text-ink-900">{v.label}</td><td className="ov-num py-1.5 pr-3 text-right">−{zahl(v.reduktionPct)} %</td><td className="ov-num py-1.5 pr-3 text-right">{eur(v.vorteilEur)}</td><td className="ov-num py-1.5 pr-3 text-right">{eur(v.jeTeilnehmerEur)}</td><td className="py-1.5 text-[12px] text-ink-500">{v.hinweis}</td></tr>)}</tbody>
            </table>
          </div>
        </Karte>
      )}
      <Karte titel="Jahresverlauf" untertitel="Monatssummen in kWh">
        <BalkenChart kategorien={erg.monate.map((m) => MONATE[m.monat - 1])} reihen={[{ name: "Erzeugung × TF", farbe: FARBEN.sonne, werte: erg.monate.map((m) => m.erzeugungTfKwh) }, { name: "Verbrauch × TF", farbe: FARBEN.navy, werte: erg.monate.map((m) => m.verbrauchTfKwh) }, { name: "Eigendeckung", farbe: FARBEN.gruen, werte: erg.monate.map((m) => m.eigendeckungKwh) }]} yEinheit="kWh" format={(x) => zahl(x)} beschreibung="Monatliche Erzeugung, Verbrauch und Eigendeckung" />
        <Legende className="mt-3" eintraege={[{ name: "Erzeugung × TF", farbe: FARBEN.sonne }, { name: "Verbrauch × TF", farbe: FARBEN.navy }, { name: "Eigendeckung", farbe: FARBEN.gruen }]} />
      </Karte>
      {erg.typischerTag && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[["januar", "Typischer Tag im Januar"], ["juli", "Typischer Tag im Juli"]].map(([m, t]) => (
            <Karte key={m} titel={t} untertitel="mittlere Leistung in kW (MEZ)">
              <LinienChart reihen={tag(erg.typischerTag[m])} xTicks={[0, 24, 48, 72, 95]} xText={stunde} yEinheit="kW" hoehe={220} beschreibung={t} />
            </Karte>
          ))}
        </div>
      )}
      <Karte titel="Ergebnis je Teilnehmer" untertitel="Vorteil = Energiepreis (Lieferant − Gemeinschaft) + reduzierter Netz-AP + Abgaben (nur EEG) + Erzeugerpreis über Marktwert − Beitrag">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead><tr className="text-left text-ink-500"><th className="py-1.5 pr-3 font-medium">Teilnehmer</th><th className="py-1.5 pr-3 text-right font-medium">Verbrauch</th><th className="py-1.5 pr-3 text-right font-medium">Eigenverbr.</th><th className="py-1.5 pr-3 text-right font-medium">Eigendeckung</th><th className="py-1.5 pr-3 text-right font-medium">Deckung</th><th className="py-1.5 pr-3 text-right font-medium">eingebracht</th><th className="py-1.5 pr-3 text-right font-medium">Netz</th><th className="py-1.5 pr-3 text-right font-medium">Energie</th><th className="py-1.5 text-right font-medium">Vorteil/Jahr</th></tr></thead>
            <tbody>
              {erg.teilnehmer.map((t) => (
                <tr key={t.id} className="border-t border-ink-100">
                  <td className="py-1.5 pr-3"><span className="font-semibold text-ink-900">{t.name}</span>{t.anzahl > 1 && <span className="text-ink-500"> × {t.anzahl}</span>}<span className="block text-[11.5px] text-ink-500">{ARTEN[t.art]} · {t.profil}{t.schutzbeduerftig ? " · schutzbedürftig" : ""}</span></td>
                  <td className="ov-num py-1.5 pr-3 text-right">{zahl(t.verbrauchKwh)}</td>
                  <td className="ov-num py-1.5 pr-3 text-right">{zahl(t.eigenverbrauchKwh)}</td>
                  <td className="ov-num py-1.5 pr-3 text-right">{zahl(t.eigendeckungKwh)}</td>
                  <td className="ov-num py-1.5 pr-3 text-right">{zahl(t.deckungPct, 1)} %</td>
                  <td className="ov-num py-1.5 pr-3 text-right">{zahl(t.eingebrachtKwh)}</td>
                  <td className="ov-num py-1.5 pr-3 text-right">{eur(t.vorteil.netz)}</td>
                  <td className="ov-num py-1.5 pr-3 text-right">{eur(t.vorteil.energie)}</td>
                  <td className={cn("ov-num py-1.5 text-right font-semibold", t.vorteil.summe >= 0 ? "text-ov-800" : "text-danger-700")}>{eur(t.vorteil.summe)}{t.anzahl > 1 && <span className="block text-[11px] font-normal text-ink-500">{eur(t.vorteil.summe / t.anzahl)} je Teiln.</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {erg.anlagen?.length > 0 && <p className="mt-3 text-[12.5px] text-ink-600">Anlagen: {erg.anlagen.map((a) => `${a.name} ${zahl(a.kwp)} kWp → ${zahl(a.erzeugungKwh)} kWh (${zahl(a.spezErtrag)} kWh/kWp), davon ${zahl(a.eingebrachtKwh)} kWh in der Gemeinschaft genutzt`).join(" · ")}</p>}
      </Karte>
      {(erg.speicher || erg.sensitivitaet?.haushalte?.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {erg.speicher && <Karte titel="Gemeinschaftsspeicher"><p className="text-[13.5px] text-ink-700">{zahl(erg.speicher.kapazitaetKwh)} kWh / {zahl(erg.speicher.leistungKw)} kW: geladen {zahl(erg.speicher.geladenKwh)} kWh, entladen {zahl(erg.speicher.entladenKwh)} kWh, Verluste {zahl(erg.speicher.verlusteKwh)} kWh, {zahl(erg.speicher.zyklen, 1)} Vollzyklen im Jahr.</p></Karte>}
          {erg.sensitivitaet?.haushalte?.length > 0 && <Karte titel="Sensitivität"><ul className="space-y-1 text-[13.5px] text-ink-700">{erg.sensitivitaet.haushalte.map((h) => <li key={h.zusaetzlich}>+{h.zusaetzlich} Haushalte (3.500 kWh): Nutzungsgrad {pct(h.nutzungsgrad)}, Eigendeckungsquote {pct(h.eigendeckungsquote)}</li>)}<li>Je +1 ct Bezugspreis: Vorteil der Verbraucher {eur(erg.sensitivitaet.jeCtBezug)}; je +1 ct Einspeisepreis: Erzeuger {eur(erg.sensitivitaet.jeCtEinspeis)}</li></ul></Karte>}
        </div>
      )}
      {erg.hinweise?.length > 0 && <Hinweis ton="info" titel="Hinweise"><ul className="list-disc space-y-1 pl-5">{erg.hinweise.map((h) => <li key={h}>{h}</li>)}</ul></Hinweis>}
    </div>
  );
}

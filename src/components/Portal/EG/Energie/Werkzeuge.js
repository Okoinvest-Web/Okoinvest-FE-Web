"use client";

// src/components/Portal/EG/Energie/Werkzeuge.js
//
// Interaktive Werkzeuge der Energiedaten (WP3): Reklamation/Nachforderung, CSV-/Excel-Import aus dem Netzbetreiber-Portal
// (Vorschau → Übernehmen), Einzelwerte eines Zählpunkts (zweckgebunden, protokolliert), Mehrfachteilnahme-Optimierer.
// Prüfungen und Rechte im Backend; hier nur Bedienung. Mutationen als JSON über senden() (Origin-Prüfung).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LineChart, Scale, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { FARBEN, Legende, LinienChart } from "@/components/Portal/Energie/Diagramme";
import { senden } from "@/lib/plattform/client";

const zahl = (x, s = 0) => (Number.isFinite(Number(x)) && x !== null ? Number(x).toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");
const LABEL = { verbrauch_gemessen: "Verbrauch laut Messung", verbrauch_tf: "Verbrauch × TF", anteil_erzeugung: "Anteil an der Erzeugung", eigendeckung: "Eigendeckung", eigendeckung_ee: "Eigendeckung EE", erzeugung_gemessen: "Erzeugung laut Messung", erzeugung_tf: "Erzeugung × TF", restueberschuss: "Restüberschuss" };
const FARBE = { verbrauch_gemessen: FARBEN.navy, verbrauch_tf: FARBEN.grau, anteil_erzeugung: FARBEN.sonne, eigendeckung: FARBEN.gruen, eigendeckung_ee: FARBEN.gruenDunkel, erzeugung_gemessen: FARBEN.sonne, erzeugung_tf: FARBEN.navy, restueberschuss: FARBEN.grau };

async function holen(url) {
  const r = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error || `Fehler ${r.status}`);
  return j;
}

/** Reklamation eines Problemzeitraums (Nachforderung CR_REQ_PT über WP2) */
export function ReklamierenKnopf({ url, fall }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [text, setText] = useState("");
  async function los() {
    setLaeuft(true);
    setText("");
    try {
      const r = await senden(url, { body: { aktion: "reklamieren", zaehlpunktId: fall.zaehlpunktId, von: fall.von, bis: fall.bis, gruende: fall.gruende } });
      setText(r.hinweis || "Nachforderung gestellt.");
      router.refresh();
    } catch (e) {
      setText(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <div className="text-right">
      <Button type="button" variant="secondary" size="sm" onClick={los} disabled={laeuft} icon={Send}>{laeuft ? "Wird gestellt …" : "Nachfordern"}</Button>
      {text && <p className="mt-1 max-w-[240px] text-[11.5px] text-ink-600">{text}</p>}
    </div>
  );
}

/** CSV-/Excel-Import der Netzbetreiber-Portale (Ausweichweg, wenn EDA fehlt) */
export function CsvImportEnergie({ url, zaehlpunkte = [] }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [datei, setDatei] = useState("");
  const [zp, setZp] = useState("");
  const [vorschau, setVorschau] = useState(null);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function lesen(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) {
      setFehler("Excel-Dateien bitte als CSV speichern oder den Bereich in Excel kopieren und unten einfügen (Tabulator wird erkannt).");
      return;
    }
    setDatei(f.name);
    setCsv(await f.text());
    setVorschau(null);
  }
  async function senden2(ausfuehren) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await senden(url, { body: { aktion: "csv", csv, zaehlpunktId: zp, datei, ausfuehren } });
      setVorschau(r.vorschau);
      if (ausfuehren) {
        setErfolg(`Übernommen: ${r.ergebnis.tage} Tage, ${zahl(r.ergebnis.geaendertWerte)} Werte geändert${r.ergebnis.hinweis ? ` – ${r.ergebnis.hinweis}` : ""}.`);
        router.refresh();
      }
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-ink-600">Viertelstundenwerte aus dem Netzbetreiber-Portal (CSV, Semikolon oder Tabulator, Dezimalkomma). Erkannt werden Zeitspalten (Beginn bzw. Ende), Größen wie Verbrauch, Einspeisung, Eigendeckung, Restüberschuss, Einheit kW/kWh, Qualitätskennzeichen und die Zählpunktnummer im Dateikopf. Maßgeblich bleiben die EDA-Werte.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Feld id="en-datei" label="Datei"><input id="en-datei" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={lesen} className={eingabe} /></Feld>
        <Feld id="en-zp" label="Zählpunkt" hinweis="leer = aus der Datei"><select id="en-zp" className={auswahlfeld} value={zp} onChange={(e) => setZp(e.target.value)}><option value="">aus der Datei erkennen</option>{zaehlpunkte.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}</select></Feld>
      </div>
      <Feld id="en-csv" label="Inhalt (oder aus Excel einfügen)"><textarea id="en-csv" className={textbereich} rows={5} value={csv} onChange={(e) => { setCsv(e.target.value); setVorschau(null); }} placeholder="Datum;Zeit von;Zeit bis;Verbrauch (kWh);Eigendeckung (kWh)" /></Feld>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => senden2(false)} disabled={laeuft || !csv.trim()} icon={FileUp}>Vorschau</Button>
        {vorschau && <Button type="button" onClick={() => senden2(true)} disabled={laeuft}>Werte übernehmen</Button>}
      </div>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {erfolg && <ErfolgBox>{erfolg}</ErfolgBox>}
      {vorschau && (
        <div className="rounded-2xl bg-sand-50 p-4 text-[13px] ring-1 ring-inset ring-ink-100">
          <p className="font-semibold text-ink-900">{vorschau.zaehlpunktnummer}</p>
          <p className="text-ink-600">{zahl(vorschau.zeilen)} Zeilen · {vorschau.tage} Tage · {String(vorschau.von).slice(0, 16).replace("T", " ")} bis {String(vorschau.bis).slice(0, 16).replace("T", " ")} (UTC)</p>
          <ul className="mt-2 list-disc pl-5">{vorschau.reihen.map((r) => <li key={r.groesse}>{r.label}: {zahl(r.werte)} Werte, {zahl(r.summeKwh, 3)} kWh{r.einheit === "kW" ? " (aus kW umgerechnet)" : ""}</li>)}</ul>
          {vorschau.unvollstaendigeTage.length > 0 && <p className="mt-2 text-ink-600">Unvollständige Tage: {vorschau.unvollstaendigeTage.join(", ")}</p>}
          {vorschau.hinweise.map((h) => <p key={h} className="mt-1 text-ink-600">{h}</p>)}
          {vorschau.fehlerAnzahl > 0 && <p className="mt-2 text-red-700">{vorschau.fehlerAnzahl} Zeilen nicht lesbar, z. B. Zeile {vorschau.fehler[0]?.zeile}: {vorschau.fehler[0]?.text}</p>}
        </div>
      )}
    </div>
  );
}

/** Einzelwerte eines Zählpunkts (qh_einzeln – jede Einsicht wird protokolliert) */
export function ZpEinzelwerte({ url, zaehlpunkte = [], heute }) {
  const gestern = new Date(Date.parse(`${heute}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);
  const [zp, setZp] = useState(zaehlpunkte[0]?.id || "");
  const [von, setVon] = useState(new Date(Date.parse(`${heute}T12:00:00Z`) - 3 * 864e5).toISOString().slice(0, 10));
  const [bis, setBis] = useState(gestern);
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function laden() {
    setLaeuft(true);
    setFehler("");
    try {
      setDaten(await holen(`${url}?ansicht=messreihen&zaehlpunktId=${encodeURIComponent(zp)}&von=${von}&bis=${bis}`));
    } catch (e) {
      setFehler(e.message);
      setDaten(null);
    } finally {
      setLaeuft(false);
    }
  }
  const groessen = daten ? [...new Set(daten.bloecke.map((b) => b.groesse))] : [];
  const tage = daten ? [...new Set(daten.bloecke.map((b) => b.tag))].sort() : [];
  const reihen = groessen.map((g) => {
    const punkte = [];
    let x = 0;
    for (const t of tage) {
      const b = daten.bloecke.find((y) => y.tag === t && y.groesse === g);
      const n = b ? b.werte.length : 96;
      for (let i = 0; i < n; i++) punkte.push({ x: x++, y: b && b.werte[i] !== null ? b.werte[i] * 4 : NaN });
    }
    return { name: LABEL[g], farbe: FARBE[g], punkte, gestrichelt: g.endsWith("_tf") };
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Feld id="ez-zp" label="Zählpunkt" className="md:col-span-2"><select id="ez-zp" className={auswahlfeld} value={zp} onChange={(e) => setZp(e.target.value)}>{zaehlpunkte.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}</select></Feld>
        <Feld id="ez-von" label="Von"><input id="ez-von" type="date" className={eingabe} value={von} max={gestern} onChange={(e) => setVon(e.target.value)} /></Feld>
        <Feld id="ez-bis" label="Bis"><input id="ez-bis" type="date" className={eingabe} value={bis} max={gestern} onChange={(e) => setBis(e.target.value)} /></Feld>
      </div>
      <Button type="button" variant="secondary" onClick={laden} disabled={laeuft || !zp} icon={LineChart}>{laeuft ? "Lädt …" : "Viertelstundenwerte anzeigen"}</Button>
      <p className="text-[12px] text-ink-500">Zweckbindung (DSGVO Art. 5 Abs. 1 lit. b): Einzelwerte nur bei Bedarf (Klärfall, Abrechnung, Auskunft) – die Einsicht wird im Protokoll der Gemeinschaft vermerkt.</p>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {daten && (reihen.length ? (
        <div>
          <LinienChart reihen={reihen} xTicks={tage.map((_, i) => i * 96)} xText={(x) => { const t = tage[Math.round(x / 96)]; return t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.` : ""; }} yEinheit="kW" beschreibung="Viertelstundenwerte des Zählpunkts" />
          <Legende className="mt-2" eintraege={reihen.map((r) => ({ name: r.name, farbe: r.farbe }))} />
          <p className="mt-2 text-[12px] text-ink-500">{daten.bloecke.filter((b) => b.l3).length ? `${daten.bloecke.filter((b) => b.l3).length} Tagesblöcke mit L3-Werten · ` : ""}{daten.bloecke.filter((b) => b.fehlend).length ? `${daten.bloecke.filter((b) => b.fehlend).length} Tagesblöcke mit Lücken · ` : ""}{daten.protokolliert ? "Einsicht protokolliert" : "eigener Zählpunkt"}</p>
        </div>
      ) : <p className="text-[14px] text-ink-500">Keine Werte im Zeitraum.</p>)}
    </div>
  );
}

/** Mehrfachteilnahme-Optimierer (Fachkonzept 4.9) */
export function Optimierer({ url, zaehlpunkte = [] }) {
  const [zp, setZp] = useState(zaehlpunkte.find((z) => z.mehrfach)?.id || zaehlpunkte[0]?.id || "");
  const [erg, setErg] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function rechnen() {
    setLaeuft(true);
    setFehler("");
    try {
      setErg(await holen(`${url}?ansicht=optimierung&zaehlpunktId=${encodeURIComponent(zp)}`));
    } catch (e) {
      setFehler(e.message);
      setErg(null);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Feld id="opt-zp" label="Zählpunkt" className="min-w-[260px] flex-1"><select id="opt-zp" className={auswahlfeld} value={zp} onChange={(e) => setZp(e.target.value)}>{zaehlpunkte.map((z) => <option key={z.id} value={z.id}>{z.label}{z.mehrfach ? " · Mehrfachteilnahme" : ""}</option>)}</select></Feld>
        <Button type="button" variant="secondary" onClick={rechnen} disabled={laeuft || !zp} icon={Scale}>{laeuft ? "Rechnet …" : "Teilnahmefaktoren optimieren"}</Button>
      </div>
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
      {erg && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead><tr className="text-left text-ink-500"><th className="py-1.5 pr-3 font-medium">Gemeinschaft</th><th className="py-1.5 pr-3 text-right font-medium">Vorteil</th><th className="py-1.5 pr-3 text-right font-medium">TF heute</th><th className="py-1.5 pr-3 text-right font-medium">Empfehlung</th><th className="py-1.5 pr-3 text-right font-medium">geteilt / Jahr</th><th className="py-1.5 text-right font-medium">Wert / Jahr</th></tr></thead>
              <tbody>
                {erg.empfehlung.map((e) => (
                  <tr key={e.gemeinschaftId} className="border-t border-ink-100 align-top">
                    <td className="py-1.5 pr-3"><span className="font-semibold text-ink-900">{e.label}</span><span className="block text-[11.5px] text-ink-500">{e.datenbasis} · {e.netz} · {e.tarif}</span></td>
                    <td className="ov-num py-1.5 pr-3 text-right">{zahl(e.vorteilCtKwh, 2)} ct/kWh</td>
                    <td className="ov-num py-1.5 pr-3 text-right">{e.aktuellTf} %</td>
                    <td className="ov-num py-1.5 pr-3 text-right font-semibold text-ov-800">{e.empfohlenTf} %</td>
                    <td className="ov-num py-1.5 pr-3 text-right">{zahl(e.geteiltKwh)} kWh</td>
                    <td className="ov-num py-1.5 text-right">{zahl(e.wertEur, 2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[13.5px] text-ink-700">Empfehlung: Σ {erg.summeTf} % · Wert {zahl(erg.wertEur, 2)} € je Jahr statt {zahl(erg.aktuellWertEur, 2)} € ({erg.verbesserungEur >= 0 ? "+" : ""}{zahl(erg.verbesserungEur, 2)} €). Datenbasis: {erg.datenbasis}, {erg.stichprobeTage} repräsentative Tage hochgerechnet.</p>
          <ul className="list-disc space-y-0.5 pl-5 text-[12.5px] text-ink-500">{erg.hinweise.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

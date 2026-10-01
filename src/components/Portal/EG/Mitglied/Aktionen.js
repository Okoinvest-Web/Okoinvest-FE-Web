"use client";

// Aktionen des Mitglieds (WP6): Teilnahmefaktor-Wunsch, Kündigung bzw. Rückzug des Antrags. Prüfung serverseitig
// (ptTfWunsch, ptKuendigung); hier nur Eingabe, Bestätigung und Meldungen.

import { useState } from "react";
import { Klappe, Knopf, Meldung, useAktion } from "@/components/Portal/Mitglied/teile";
import { datumDe } from "./format";

const feld = "h-10 w-full rounded-xl border-0 bg-white px-3 text-[14.5px] text-ink-900 ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-ov-500";

export function TfWunsch({ teilnahme, freiTf = null }) {
  const [tf, setTf] = useState(teilnahme.teilnahmefaktor);
  const a = useAktion("/api/portal/eg/tf-wunsch");
  const max = freiTf === null ? 100 : Math.min(100, teilnahme.teilnahmefaktor + freiTf);
  async function absenden(e) {
    e.preventDefault();
    const r = await a.ausfuehren({ teilnahmeId: teilnahme.id, teilnahmefaktor: Number(tf) }, "Gespeichert.");
    if (r?.text) a.setOk(r.text);
  }
  return (
    <form onSubmit={absenden} className="space-y-3">
      <label className="block text-[13.5px] font-medium text-ink-700" htmlFor={`tf-${teilnahme.id}`}>Gewünschter Teilnahmefaktor (1–{max} %)</label>
      <div className="flex flex-wrap items-center gap-3">
        <input id={`tf-${teilnahme.id}`} type="range" min={1} max={max} value={tf} onChange={(e) => setTf(e.target.value)} className="ov-range min-w-[10rem] flex-1" aria-describedby={`tf-h-${teilnahme.id}`} />
        <input type="number" min={1} max={max} value={tf} onChange={(e) => setTf(e.target.value)} className={`${feld} w-24`} aria-label="Teilnahmefaktor in Prozent" />
        <Knopf type="submit" variante="primary" disabled={a.laeuft || Number(tf) === teilnahme.teilnahmefaktor}>{a.laeuft ? "Senden …" : "Wunsch senden"}</Knopf>
      </div>
      <p id={`tf-h-${teilnahme.id}`} className="text-[12.5px] leading-relaxed text-ink-500">
        {teilnahme.status === "entwurf" ? "Noch nicht angemeldet – wir übernehmen den Wert direkt." : "Die Gemeinschaft meldet die Änderung beim Netzbetreiber; derzeit ist eine Änderung pro Tag und Gemeinschaft möglich. Summe aller Gemeinschaften höchstens 100 %."}
      </p>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </form>
  );
}

export function Kuendigung({ mitglied, fruehestens, zurueckziehen = false }) {
  const [zum, setZum] = useState(fruehestens || "");
  const [sicher, setSicher] = useState(false);
  const a = useAktion("/api/portal/eg/kuendigung");
  async function absenden(e) {
    e.preventDefault();
    const r = await a.ausfuehren(zurueckziehen ? { mitgliedId: mitglied.id } : { mitgliedId: mitglied.id, zum }, zurueckziehen ? "Ihr Antrag ist zurückgezogen." : "Ihre Kündigung ist eingegangen.");
    if (r?.text) a.setOk(r.text);
  }
  return (
    <Klappe titel={zurueckziehen ? "Antrag zurückziehen" : "Mitgliedschaft kündigen"}>
      <form onSubmit={absenden} className="space-y-3">
        {!zurueckziehen && (
          <>
            <label className="block text-[13.5px] font-medium text-ink-700" htmlFor="eg-kuendigung-zum">Austritt zum</label>
            <input id="eg-kuendigung-zum" type="date" min={fruehestens} value={zum} onChange={(e) => setZum(e.target.value)} className={`${feld} max-w-xs`} required />
            <p className="text-[12.5px] leading-relaxed text-ink-500">Frühestens {datumDe(fruehestens)} (Kündigungsfrist laut Vertrag). Die Gemeinschaft meldet Ihre Zählpunkte zu diesem Tag beim Netzbetreiber ab – nicht rückwirkend – und erstellt die Schlussabrechnung.</p>
          </>
        )}
        {zurueckziehen && <p className="text-[13.5px] leading-relaxed text-ink-600">Ihr Beitrittsantrag wird zurückgezogen, noch nicht angemeldete Zählpunkte werden verworfen. Sie können jederzeit erneut beitreten.</p>}
        <label className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
          <input type="checkbox" checked={sicher} onChange={(e) => setSicher(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-300 text-ov-600 focus:ring-ov-500" />
          {zurueckziehen ? "Ja, ich ziehe meinen Antrag zurück." : "Ja, ich kündige meine Mitgliedschaft zum angegebenen Datum."}
        </label>
        <Knopf type="submit" variante="gefahr" disabled={!sicher || a.laeuft}>{a.laeuft ? "Senden …" : zurueckziehen ? "Antrag zurückziehen" : "Kündigung senden"}</Knopf>
        <Meldung fehler={a.fehler} ok={a.ok} />
      </form>
    </Klappe>
  );
}

/** Vorschlag des Mehrfachteilnahme-Optimierers auf Abruf (rechenintensiv, WP3) */
export function OptimiererVorschlag({ zaehlpunktId, label }) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [r, setR] = useState(null);
  async function holen() {
    setLaeuft(true);
    setFehler("");
    try {
      const res = await fetch(`/api/portal/eg/optimierung?zaehlpunkt=${encodeURIComponent(zaehlpunktId)}`, { credentials: "same-origin", cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || `Fehler ${res.status}`);
      setR(j);
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  if (!r) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Knopf variante="navy" onClick={holen} disabled={laeuft}>{laeuft ? "Berechnung läuft …" : `Beste Aufteilung berechnen${label ? ` (${label})` : ""}`}</Knopf>
        <span className="text-[12.5px] text-ink-500">Simuliert ein Jahr in Viertelstunden – dauert einige Sekunden.</span>
        {fehler && <Meldung fehler={fehler} />}
      </div>
    );
  }
  const v = r.vorschlag;
  return (
    <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200" role="status">
      {v ? (
        <>
          <p className="font-semibold text-ov-900">Vorschlag{v.mehrwertEur ? `: rund ${v.mehrwertEur.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € mehr im Jahr` : ""}</p>
          <ul className="mt-1.5 space-y-0.5 text-[13.5px] text-ink-700">{v.vorschlaege.map((x) => <li key={x.gemeinschaftId || x.teilnahmeId}>{x.label || x.gemeinschaftId}: {x.aktuellTf !== null ? `${x.aktuellTf} % → ` : ""}<strong>{x.teilnahmefaktor} %</strong></li>)}</ul>
        </>
      ) : <p className="text-[14px] text-ink-700">Ihre aktuelle Aufteilung ist bereits sinnvoll.</p>}
      {r.datenbasis && <p className="mt-2 text-[12.5px] text-ink-500">Datenbasis: {r.datenbasis}. Nur Empfehlung – übernehmen Sie Werte unten als Wunsch.</p>}
    </div>
  );
}

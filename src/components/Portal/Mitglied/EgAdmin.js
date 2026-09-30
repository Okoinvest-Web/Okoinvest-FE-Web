"use client";

// Backoffice Energiegemeinschaften (Client-Teile): Stammdaten der Gemeinschaft, Teilnahme-Status (Anmeldung beim
// Netzbetreiber, Aktivierung, Ablehnung, Ende) und Monatslauf (Abrechnung mit Messwerten oder Schätzung).

import { useId, useState } from "react";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { EG_FORMEN, GEMEINSCHAFT_STATUS, VERTEILSCHLUESSEL } from "@/lib/plattform/mitglied/gemeinschaft";
import { LAENDER } from "@/lib/plattform/konstanten";
import { Knopf, Meldung, useAktion } from "./teile";

const URL = "/api/admin/energiegemeinschaften";

export function EgStammdaten({ eg = null }) {
  const id = useId();
  const a = useAktion(URL);
  const [g, setG] = useState({
    name: eg?.name || "", land: eg?.land || "AT", form: eg?.form || "", status: eg?.status || "aufbau", rechtsform: eg?.rechtsform || "", netzbetreiber: eg?.netzbetreiber || "", gebiet: eg?.gebiet || "",
    plzListe: (eg?.plzListe || []).join(", "), tarifBezugCt: String(eg?.tarifBezugCt ?? ""), tarifEinspeisungCt: String(eg?.tarifEinspeisungCt ?? ""), grundgebuehrMonat: String(eg?.grundgebuehrMonat ?? "0"),
    verteilschluessel: eg?.verteilschluessel || "dynamisch", gemeinschaftsId: eg?.gemeinschaftsId || "", info: eg?.info || "",
  });
  const s = (k) => (e) => setG({ ...g, [k]: e.target.value, ...(k === "land" ? { form: "" } : {}) });
  const f = (k, label, breit = false) => (
    <Feld id={`${id}-${k}`} label={label} className={breit ? "sm:col-span-2" : ""}>
      <input id={`${id}-${k}`} className={eingabe} value={g[k]} onChange={s(k)} />
    </Feld>
  );
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "speichern", id: eg?.id || null, daten: g }, "Gemeinschaft gespeichert."); }}>
      <div className="grid gap-3 sm:grid-cols-4">
        {f("name", "Name", true)}
        <Feld id={`${id}-la`} label="Land"><select id={`${id}-la`} className={auswahlfeld} value={g.land} onChange={s("land")}>{Object.keys(EG_FORMEN).map((k) => <option key={k} value={k}>{LAENDER[k]}</option>)}</select></Feld>
        <Feld id={`${id}-fo`} label="Form"><select id={`${id}-fo`} className={auswahlfeld} value={g.form} onChange={s("form")}><option value="">– wählen –</option>{Object.entries(EG_FORMEN[g.land]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
        <Feld id={`${id}-st`} label="Status"><select id={`${id}-st`} className={auswahlfeld} value={g.status} onChange={s("status")}>{Object.entries(GEMEINSCHAFT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
        {f("rechtsform", "Rechtsform (Verein, Genossenschaft …)")}
        {f("netzbetreiber", "Netzbetreiber")}
        {f("gemeinschaftsId", g.land === "AT" ? "Gemeinschafts-ID (EDA)" : "Kennung beim Netzbetreiber")}
        {f("gebiet", g.land === "AT" ? "Trafostation bzw. Umspannwerk" : "Gebiet", true)}
        {f("plzListe", "Postleitzahlen im Gebiet (kommagetrennt)", true)}
        {f("tarifBezugCt", `Preis Bezug (${g.land === "CH" ? "Rp." : "ct"}/kWh)`)}
        {f("tarifEinspeisungCt", `Preis Einspeisung (${g.land === "CH" ? "Rp." : "ct"}/kWh)`)}
        {f("grundgebuehrMonat", "Grundgebühr je Monat")}
        <Feld id={`${id}-vs`} label="Verteilschlüssel"><select id={`${id}-vs`} className={auswahlfeld} value={g.verteilschluessel} onChange={s("verteilschluessel")}>{Object.entries(VERTEILSCHLUESSEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
        <Feld id={`${id}-in`} label="Information" className="sm:col-span-4"><textarea id={`${id}-in`} rows={2} className={textbereich} value={g.info} onChange={s("info")} /></Feld>
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>{eg ? "Speichern" : "Gemeinschaft anlegen"}</Knopf>
    </form>
  );
}

export function TeilnahmeAktionen({ t, heute }) {
  const a = useAktion(URL);
  const [ab, setAb] = useState(heute);
  const los = (teilnahmeAktion, rest = {}, text) => a.ausfuehren({ aktion: "teilnahme", id: t.id, teilnahmeAktion, ...rest }, text);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {t.status === "beantragt" && <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("anmelden", {}, "Als angemeldet markiert – Teilnehmer benachrichtigt.")}>Beim Netzbetreiber angemeldet</Knopf>}
        {t.status === "angemeldet" && (
          <>
            <input aria-label="Aktiv ab" type="date" className={`${eingabe} h-9 w-40`} value={ab} onChange={(e) => setAb(e.target.value)} />
            <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("aktivieren", { ab }, "Teilnahme aktiv.")}>Aktivieren</Knopf>
          </>
        )}
        {["beantragt", "angemeldet"].includes(t.status) && <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => { const g = window.prompt("Begründung für den Teilnehmer:"); if (g) los("ablehnen", { grund: g }, "Abgelehnt."); }}>Ablehnen</Knopf>}
        {["aktiv", "angemeldet"].includes(t.status) && <Knopf disabled={a.laeuft} onClick={() => window.confirm(`Teilnahme beenden${t.bis ? ` zum ${t.bis.split("-").reverse().join(".")}` : ""}?`) && los("beenden", { bis: t.bis || heute }, "Teilnahme beendet.")}>Beenden</Knopf>}
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Monatslauf: Messwerte je Teilnehmer (kWh) optional, sonst Schätzung aus Stammdaten */
export function Monatslauf({ eg, vormonat }) {
  const id = useId();
  const a = useAktion(URL);
  const aktiv = (eg.teilnehmer || []).filter((t) => ["aktiv", "beendet"].includes(t.status) && t.ab);
  const [mon, setMon] = useState(vormonat);
  const [mw, setMw] = useState({});
  const wert = (tid, k, v) => setMw({ ...mw, [tid]: { ...(mw[tid] || {}), [k]: v } });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (window.confirm(`Monat ${mon} abrechnen und Teilnehmer benachrichtigen?`)) a.ausfuehren({ aktion: "abrechnen", id: eg.id, monat: mon, messwerte: mw }, "Monatslauf erstellt – Abrechnungen versandt."); }}>
      <Feld id={`${id}-m`} label="Abrechnungsmonat"><input id={`${id}-m`} type="month" className={`${eingabe} w-48`} value={mon} onChange={(e) => setMon(e.target.value)} /></Feld>
      <p className="text-[13px] leading-relaxed text-ink-600">Messwerte (Monatssummen aus den Viertelstundenwerten des Netzbetreibers) eintragen – leere Felder werden aus den Stammdaten geschätzt und in der Abrechnung als Schätzung gekennzeichnet.</p>
      <div className="space-y-2">
        {aktiv.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="min-w-0 flex-1 font-medium text-ink-800">{t.name}</span>
            <input aria-label={`${t.name}: Verbrauch kWh`} placeholder="Verbrauch kWh" inputMode="decimal" className={`${eingabe} h-9 w-36`} value={mw[t.id]?.verbrauchKwh || ""} onChange={(e) => wert(t.id, "verbrauchKwh", e.target.value)} />
            {t.stamm?.rolle !== "bezug" && <input aria-label={`${t.name}: Erzeugung kWh`} placeholder="Einspeisung kWh" inputMode="decimal" className={`${eingabe} h-9 w-36`} value={mw[t.id]?.erzeugungKwh || ""} onChange={(e) => wert(t.id, "erzeugungKwh", e.target.value)} />}
          </div>
        ))}
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft || !aktiv.length}>Monat abrechnen</Knopf>
    </form>
  );
}

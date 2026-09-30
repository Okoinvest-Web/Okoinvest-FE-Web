"use client";

// Backoffice-Formulare des Investoren-Portfolios: Position anlegen, Stammdaten, Monatsertrag, Kapitalabruf (anlegen, Eingang,
// Storno), Ausschüttung (buchen, Storno), Statuswechsel, Börsen-Entwurf, Dokument hochladen, Fristenlauf.
// Alle Regeln prüft der Server (portfolio/kern.js) – hier nur Eingabe und Fehlermeldung.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Plus, Save, Send, Store, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const klein = `${eingabe} h-10 text-[14px]`;
const kleinAuswahl = `${auswahlfeld} h-10 text-[14px]`;

function useSenden() {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function los(url, body, { method = "POST", danach } = {}) {
    setFehler("");
    setOk("");
    setLaeuft(true);
    try {
      const r = await senden(url, { method, body });
      if (danach) danach(r);
      else router.refresh();
      return r;
    } catch (x) {
      setFehler(x.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { fehler, ok, setOk, laeuft, los };
}

const aktionUrl = (id) => `/api/admin/portfolio/${id}/aktion`;

export function PositionAnlegen({ auswahl }) {
  const router = useRouter();
  const { fehler, laeuft, los } = useSenden();
  const [d, setD] = useState({ art: "codev", investorId: auswahl.investoren[0]?.id || "", entwicklungId: "", titel: "", zusage: "", kaufpreis: "", anteilProzent: "100", mwp: "", land: "DE", typ: "freiflaeche", kaufdatum: "", spvName: "" });
  const setze = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  const codev = d.art === "codev";
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        los("/api/admin/portfolio", d, { danach: (r) => router.push(`/portal/admin/portfolio/${r.position.id}`) });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Feld id="pa-art" label="Art" pflicht>
          <select id="pa-art" value={d.art} onChange={setze("art")} className={auswahlfeld}>
            {Object.entries(auswahl.arten).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
          </select>
        </Feld>
        <Feld id="pa-inv" label="Investor" pflicht hinweis="Nur verifizierte Investoren (KYC/KYB).">
          <select id="pa-inv" value={d.investorId} onChange={setze("investorId")} className={auswahlfeld} required>
            {auswahl.investoren.map((u) => <option key={u.id} value={u.id}>{[u.firma, u.name].filter(Boolean).join(" – ")}</option>)}
          </select>
        </Feld>
        {codev ? (
          <Feld id="pa-ep" label="Entwicklungsprojekt" pflicht>
            <select id="pa-ep" value={d.entwicklungId} onChange={setze("entwicklungId")} className={auswahlfeld} required>
              <option value="">Bitte wählen</option>
              {auswahl.entwicklung.map((p) => <option key={p.id} value={p.id}>{p.titel}{p.codev.includes(d.investorId) ? " (Co-Development freigegeben)" : ""}</option>)}
            </select>
          </Feld>
        ) : (
          <Feld id="pa-titel" label="Titel" pflicht>
            <input id="pa-titel" value={d.titel} onChange={setze("titel")} className={eingabe} required minLength={3} maxLength={140} />
          </Feld>
        )}
        {codev ? (
          <Feld id="pa-zusage" label="Kapitalzusage (€)" pflicht>
            <input id="pa-zusage" inputMode="numeric" value={d.zusage} onChange={setze("zusage")} className={eingabe} required />
          </Feld>
        ) : (
          <Feld id="pa-kp" label="Kaufpreis 100 % (€)" pflicht>
            <input id="pa-kp" inputMode="numeric" value={d.kaufpreis} onChange={setze("kaufpreis")} className={eingabe} required />
          </Feld>
        )}
        <Feld id="pa-anteil" label="Anteil (%)">
          <input id="pa-anteil" type="number" min="1" max="100" step="0.01" value={d.anteilProzent} onChange={setze("anteilProzent")} className={eingabe} />
        </Feld>
        <Feld id="pa-datum" label={codev ? "Beteiligt seit" : "Erworben am"}>
          <input id="pa-datum" type="date" value={d.kaufdatum} onChange={setze("kaufdatum")} className={eingabe} />
        </Feld>
        <Feld id="pa-spv" label="Projektgesellschaft">
          <input id="pa-spv" value={d.spvName} onChange={setze("spvName")} maxLength={160} className={eingabe} />
        </Feld>
        {!codev && (
          <>
            <Feld id="pa-mwp" label="Leistung (MWp)"><input id="pa-mwp" inputMode="decimal" value={d.mwp} onChange={setze("mwp")} className={eingabe} /></Feld>
            <Feld id="pa-land" label="Land">
              <select id="pa-land" value={d.land} onChange={setze("land")} className={auswahlfeld}><option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option></select>
            </Feld>
            <Feld id="pa-typ" label="Typ">
              <select id="pa-typ" value={d.typ} onChange={setze("typ")} className={auswahlfeld}>{Object.entries(auswahl.typen).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
            </Feld>
          </>
        )}
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <Button type="submit" icon={Plus} disabled={laeuft}>Position anlegen</Button>
    </form>
  );
}

const STAMM = [
  ["p50KwhJahr", "P50 (kWh/Jahr)", "Ertragsgutachten, Basis für das Soll"],
  ["verguetungCt", "Vergütung / Erlös (ct/kWh)", "Marktprämie bzw. PPA-Preis"],
  ["opexJahr", "Betriebskosten (€/Jahr)", "ohne Schuldendienst"],
  ["schuldendienstJahr", "Schuldendienst (€/Jahr)", "Zins + Tilgung; leer = ohne Fremdkapital"],
  ["dscrLockup", "DSCR Lock-up", "leer = Marktwert"],
  ["dscrDefault", "DSCR Default", "leer = Marktwert"],
  ["degradation", "Degradation p. a.", "z. B. 0.004"],
  ["zusage", "Kapitalzusage (€)", "nur Co-Development/Projekt"],
  ["inbetriebnahme", "Inbetriebnahme (JJJJ-MM)", ""],
];

export function Stammdaten({ p }) {
  const { fehler, ok, setOk, laeuft, los } = useSenden();
  const [offen, setOffen] = useState(false);
  const [d, setD] = useState(() => Object.fromEntries(STAMM.map(([k]) => [k, k === "zusage" ? String(p.zusage || "") : k === "inbetriebnahme" ? String(p.inbetriebnahme || "").slice(0, 7) : p.stammdaten?.[k] ?? ""])));
  if (!offen) return <div className="mt-4"><Button type="button" size="sm" variant="secondary" icon={Save} onClick={() => setOffen(true)}>Stammdaten bearbeiten</Button></div>;
  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(Object.entries(d).map(([k, w]) => [k, w === "" ? null : w]));
        if (body.inbetriebnahme === null) body.inbetriebnahme = "";
        if (await los(`/api/admin/portfolio/${p.id}`, body, { method: "PATCH" })) setOk("Gespeichert.");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {STAMM.map(([k, label, hinweis]) => (
          <Feld key={k} id={`st-${k}`} label={label} hinweis={hinweis}>
            <input id={`st-${k}`} value={d[k] ?? ""} onChange={(e) => { setOk(""); setD((x) => ({ ...x, [k]: e.target.value })); }} className={klein} />
          </Feld>
        ))}
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <div className="flex gap-2">
        <Button type="submit" size="sm" icon={Save} disabled={laeuft}>Speichern</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOffen(false)}>Schließen</Button>
      </div>
    </form>
  );
}

export function ErtragErfassen({ positionId, vormonat }) {
  const { fehler, ok, setOk, laeuft, los } = useSenden();
  const [d, setD] = useState({ monat: vormonat, kwh: "", quelle: "Betriebsführung" });
  return (
    <form
      className="mt-5 flex flex-wrap items-end gap-2 border-t border-ink-100 pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await los(aktionUrl(positionId), { aktion: "ertrag", ...d })) setOk(`Ertrag ${d.monat} gespeichert.`);
      }}
    >
      <Feld id="er-monat" label="Monat"><input id="er-monat" type="month" value={d.monat} max={vormonat} onChange={(e) => setD((x) => ({ ...x, monat: e.target.value }))} className={klein} /></Feld>
      <Feld id="er-kwh" label="Erzeugung (kWh)" hinweis="Leer = Monatswert löschen" className="min-w-[160px]"><input id="er-kwh" inputMode="numeric" value={d.kwh} onChange={(e) => setD((x) => ({ ...x, kwh: e.target.value }))} className={klein} /></Feld>
      <Feld id="er-quelle" label="Quelle" className="min-w-[160px] flex-1"><input id="er-quelle" value={d.quelle} maxLength={80} onChange={(e) => setD((x) => ({ ...x, quelle: e.target.value }))} className={klein} /></Feld>
      <Button type="submit" size="sm" icon={Save} disabled={laeuft}>Monatswert speichern</Button>
      <div className="w-full"><FehlerBox>{fehler}</FehlerBox><ErfolgBox>{ok}</ErfolgBox></div>
    </form>
  );
}

export function AbrufAnlegen({ positionId, fruehestens, offen }) {
  const { fehler, laeuft, los } = useSenden();
  const [d, setD] = useState({ betrag: "", faelligAm: fruehestens, zweck: "", meilenstein: "" });
  const setze = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await los(aktionUrl(positionId), { aktion: "abruf", ...d })) setD({ betrag: "", faelligAm: fruehestens, zweck: "", meilenstein: "" });
      }}
    >
      <p className="text-[13.5px] font-semibold text-ink-800">Neuer Kapitalabruf <span className="font-normal text-ink-500">– offene Zusage {Math.round(offen).toLocaleString("de-DE")} €</span></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id="ka-betrag" label="Betrag (€)" pflicht><input id="ka-betrag" inputMode="numeric" required value={d.betrag} onChange={setze("betrag")} className={klein} /></Feld>
        <Feld id="ka-faellig" label="Fällig am" pflicht hinweis="Mindestens 10 Tage Frist."><input id="ka-faellig" type="date" min={fruehestens} required value={d.faelligAm} onChange={setze("faelligAm")} className={klein} /></Feld>
        <Feld id="ka-zweck" label="Zweck" pflicht><input id="ka-zweck" required minLength={5} maxLength={200} value={d.zweck} onChange={setze("zweck")} className={klein} /></Feld>
        <Feld id="ka-ms" label="Meilenstein (optional)"><input id="ka-ms" maxLength={160} value={d.meilenstein} onChange={setze("meilenstein")} className={klein} /></Feld>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
      <Button type="submit" size="sm" icon={Send} disabled={laeuft}>Abruf ankündigen</Button>
    </form>
  );
}

export function AbrufZeile({ positionId, abruf }) {
  const { fehler, laeuft, los } = useSenden();
  const [grund, setGrund] = useState("");
  if (!["angekuendigt", "gemeldet"].includes(abruf.status)) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" icon={Check} disabled={laeuft} onClick={() => los(aktionUrl(positionId), { aktion: "abruf_bestaetigen", abrufId: abruf.id })}>Eingang bestätigen</Button>
      <label className="sr-only" htmlFor={`st-${abruf.id}`}>Grund der Stornierung</label>
      <input id={`st-${abruf.id}`} placeholder="Grund für Storno" value={grund} onChange={(e) => setGrund(e.target.value)} className={`${klein} w-auto min-w-[160px] flex-1`} />
      <Button type="button" size="sm" variant="ghost" icon={X} disabled={laeuft} onClick={() => los(aktionUrl(positionId), { aktion: "abruf_stornieren", abrufId: abruf.id, grund })}>Stornieren</Button>
      <div className="w-full"><FehlerBox>{fehler}</FehlerBox></div>
    </div>
  );
}

export function AusschuettungBuchen({ positionId, heute, arten, gesperrt }) {
  const { fehler, laeuft, los } = useSenden();
  const [d, setD] = useState({ art: Object.keys(arten)[0], periode: heute.slice(0, 4), betrag: "", datum: heute, bankZustimmung: false, notiz: "" });
  const setze = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await los(aktionUrl(positionId), { aktion: "ausschuettung", ...d })) setD((x) => ({ ...x, betrag: "", notiz: "", bankZustimmung: false }));
      }}
    >
      <p className="text-[13.5px] font-semibold text-ink-800">Ausschüttung buchen</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id="as-art" label="Art"><select id="as-art" value={d.art} onChange={setze("art")} className={kleinAuswahl}>{Object.entries(arten).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></Feld>
        <Feld id="as-per" label="Periode" hinweis="2026, 2026-Q2 oder 2026-06"><input id="as-per" required value={d.periode} onChange={setze("periode")} className={klein} /></Feld>
        <Feld id="as-betrag" label="Betrag an den Investor (€)" pflicht><input id="as-betrag" inputMode="numeric" required value={d.betrag} onChange={setze("betrag")} className={klein} /></Feld>
        <Feld id="as-datum" label="Zahlungsdatum" pflicht><input id="as-datum" type="date" required value={d.datum} onChange={setze("datum")} className={klein} /></Feld>
      </div>
      {gesperrt && (
        <label className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
          <input type="checkbox" checked={d.bankZustimmung} onChange={setze("bankZustimmung")} className="mt-1 h-4 w-4 accent-ov-600" />
          <span>Die finanzierende Bank hat der Ausschüttung trotz Lock-up schriftlich zugestimmt (Nachweis als Dokument ablegen).</span>
        </label>
      )}
      <Feld id="as-notiz" label="Notiz (intern)"><input id="as-notiz" maxLength={300} value={d.notiz} onChange={setze("notiz")} className={klein} /></Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <Button type="submit" size="sm" icon={Plus} disabled={laeuft}>Buchen</Button>
    </form>
  );
}

export function AusschuettungStorno({ positionId, ausschuettung }) {
  const { fehler, laeuft, los } = useSenden();
  const [offen, setOffen] = useState(false);
  const [grund, setGrund] = useState("");
  if (ausschuettung.status === "storniert") return <span className="text-[12px] text-ink-500">storniert</span>;
  if (!offen) return <button type="button" onClick={() => setOffen(true)} className="text-[12.5px] font-semibold text-ink-500 hover:text-ov-700">Storno</button>;
  return (
    <div className="flex min-w-[220px] flex-col gap-1.5">
      <label className="sr-only" htmlFor={`as-st-${ausschuettung.id}`}>Grund der Stornierung</label>
      <input id={`as-st-${ausschuettung.id}`} placeholder="Grund" value={grund} onChange={(e) => setGrund(e.target.value)} className={klein} />
      <Button type="button" size="sm" variant="ghost" icon={X} disabled={laeuft} onClick={() => los(aktionUrl(positionId), { aktion: "ausschuettung_storno", ausschuettungId: ausschuettung.id, grund })}>Stornieren</Button>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}

export function StatusWechsel({ positionId, uebergaenge, labels }) {
  const { fehler, laeuft, los } = useSenden();
  const erlaubt = uebergaenge.filter((s) => !["verkauf_angefragt", "verkauf_boerse"].includes(s));
  const [nach, setNach] = useState(erlaubt[0] || "");
  const [grund, setGrund] = useState("");
  if (!erlaubt.length) return null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Feld id="sw-nach" label="Status ändern"><select id="sw-nach" value={nach} onChange={(e) => setNach(e.target.value)} className={kleinAuswahl}>{erlaubt.map((s) => <option key={s} value={s}>{labels[s]?.label || s}</option>)}</select></Feld>
      <Feld id="sw-grund" label="Hinweis (optional)" className="min-w-[180px] flex-1"><input id="sw-grund" value={grund} maxLength={200} onChange={(e) => setGrund(e.target.value)} className={klein} /></Feld>
      <Button type="button" size="sm" variant="secondary" disabled={laeuft || !nach} onClick={() => los(aktionUrl(positionId), { aktion: "status", nach, grund })}>Übernehmen</Button>
      <div className="w-full"><FehlerBox>{fehler}</FehlerBox></div>
    </div>
  );
}

export function BoerseUebernehmen({ positionId }) {
  const { fehler, laeuft, los } = useSenden();
  return (
    <div className="mt-4 space-y-2 border-t border-ink-100 pt-4">
      <p className="text-[13.5px] text-ink-600">Legt einen Börsen-Entwurf mit dem Investor als Anbieter an. Veröffentlichung wie jedes Projekt über die Projekt-Freigabe (KYB des Anbieters, Provision).</p>
      <Button type="button" size="sm" icon={Store} disabled={laeuft} onClick={() => los(aktionUrl(positionId), { aktion: "boerse" })}>In die Börse übernehmen</Button>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}

export function DokumentHochladen({ positionId }) {
  const router = useRouter();
  const [datei, setDatei] = useState(null);
  const [art, setArt] = useState("jahresabschluss");
  const [freigabe, setFreigabe] = useState(true);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function los(e) {
    e.preventDefault();
    if (!datei) return setFehler("Bitte eine Datei wählen.");
    setFehler("");
    setLaeuft(true);
    try {
      const fd = new FormData();
      fd.append("datei", datei);
      fd.append("art", art);
      fd.append("freigabe", freigabe ? "1" : "0");
      const res = await fetch(`/api/admin/portfolio/${positionId}/dokumente`, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.ok === false) throw new Error(j.error || `Upload fehlgeschlagen (${res.status})`);
      setDatei(null);
      e.target.reset();
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={los} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id="dk-art" label="Art"><select id="dk-art" value={art} onChange={(e) => setArt(e.target.value)} className={kleinAuswahl}><option value="jahresabschluss">Jahresabschluss</option><option value="steuer">Steuerbescheinigung</option><option value="bericht">Bericht der Betriebsführung</option><option value="vertrag">Vertrag</option><option value="gesellschafter">Gesellschafterbeschluss</option><option value="sonstiges">Sonstiges</option></select></Feld>
        <Feld id="dk-datei" label="Datei (PDF, JPG, PNG ≤ 10 MB)"><input id="dk-datei" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDatei(e.target.files?.[0] || null)} className="block w-full text-[13.5px] text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-ov-50 file:px-3 file:py-1.5 file:font-semibold file:text-ov-800" /></Feld>
      </div>
      <label className="flex items-center gap-2 text-[13.5px] text-ink-700"><input type="checkbox" checked={freigabe} onChange={(e) => setFreigabe(e.target.checked)} className="h-4 w-4 accent-ov-600" />Für den Investor freigeben (Benachrichtigung)</label>
      <FehlerBox>{fehler}</FehlerBox>
      <Button type="submit" size="sm" icon={Upload} disabled={laeuft}>Hochladen</Button>
    </form>
  );
}

export function FristenLauf() {
  const { fehler, ok, setOk, laeuft, los } = useSenden();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" icon={CalendarClock} disabled={laeuft} onClick={async () => { const r = await los("/api/admin/portfolio/fristen", {}); if (r) setOk(`Fristenlauf: ${r.lauf.erinnerungen} Erinnerungen, ${r.lauf.verzug} Verzugshinweise, ${r.lauf.covenant} Covenant-Hinweise.`); }}>Fristenlauf starten</Button>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
    </div>
  );
}


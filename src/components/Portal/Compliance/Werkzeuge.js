"use client";

// src/components/Portal/Compliance/Werkzeuge.js
//
// Interaktive Teile „Datenschutz & Geldwäsche“: Betroffenenanfrage erfassen und bearbeiten (Zustandsautomat serverseitig),
// Datenexport, Anonymisierung bei Löschersuchen, interner Verdachtshinweis und Verdachtsfall-Workflow, Fristen-Lauf KYC.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Download, Loader2, Play, Save, Send, ShieldAlert, UserX } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { eingabe, auswahlfeld, labelKlasse, textbereich, FehlerBox, ErfolgBox } from "@/components/Portal/felder";

const knopf = "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50";
const primaer = cn(knopf, "bg-ov-600 text-white hover:bg-ov-700");
const navy = cn(knopf, "bg-navy-700 text-white hover:bg-navy-800");
const hell = cn(knopf, "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50");

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  async function ausfuehren(fn, erfolg) {
    setLaeuft(true);
    setFehler("");
    setMeldung("");
    try {
      const r = await fn();
      if (erfolg) setMeldung(typeof erfolg === "function" ? erfolg(r) : erfolg);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, meldung, ausfuehren };
}
const Sp = ({ an, icon: Icon }) => (an ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null);
const Meldungen = ({ fehler, meldung }) => <>{fehler && <div className="mt-2"><FehlerBox>{fehler}</FehlerBox></div>}{meldung && <div className="mt-2"><ErfolgBox>{meldung}</ErfolgBox></div>}</>;

// ------------------------------------------------------------------ DSGVO

export function AnfrageFormular({ arten, heute }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [d, setD] = useState({ art: "auskunft", eingangAm: heute, land: "AT", kanal: "email", name: "", email: "", kontoId: "", beschreibung: "" });
  const feld = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden("/api/admin/compliance/datenschutz", { body: d }), (r) => `Anfrage ${r.anfrage.id} erfasst – Frist bis ${r.anfrage.frist.split("-").reverse().join(".")}.`); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="ds-art" className={labelKlasse}>Art</label><select id="ds-art" className={auswahlfeld} value={d.art} onChange={feld("art")}>{Object.entries(arten).map(([k, a]) => <option key={k} value={k}>{a.label} ({a.norm})</option>)}</select></div>
        <div><label htmlFor="ds-eingang" className={labelKlasse}>Eingang am</label><input id="ds-eingang" type="date" max={heute} className={eingabe} value={d.eingangAm} onChange={feld("eingangAm")} required /></div>
        <div><label htmlFor="ds-name" className={labelKlasse}>Name der betroffenen Person</label><input id="ds-name" className={eingabe} value={d.name} onChange={feld("name")} required /></div>
        <div><label htmlFor="ds-mail" className={labelKlasse}>E-Mail (optional)</label><input id="ds-mail" type="email" className={eingabe} value={d.email} onChange={feld("email")} /></div>
        <div><label htmlFor="ds-land" className={labelKlasse}>Recht</label><select id="ds-land" className={auswahlfeld} value={d.land} onChange={feld("land")}><option value="AT">Österreich (DSGVO)</option><option value="DE">Deutschland (DSGVO)</option><option value="CH">Schweiz (revDSG, 30 Tage)</option></select></div>
        <div><label htmlFor="ds-kanal" className={labelKlasse}>Kanal</label><select id="ds-kanal" className={auswahlfeld} value={d.kanal} onChange={feld("kanal")}><option value="email">E-Mail</option><option value="brief">Brief</option><option value="portal">Portal</option><option value="telefon">Telefon</option><option value="sonstiges">Sonstiges</option></select></div>
      </div>
      <div><label htmlFor="ds-konto" className={labelKlasse}>Portal-Konto (Kennung U-…, optional – sonst über E-Mail)</label><input id="ds-konto" className={eingabe} value={d.kontoId} onChange={feld("kontoId")} placeholder="U-26-…" /></div>
      <div><label htmlFor="ds-text" className={labelKlasse}>Inhalt der Anfrage</label><textarea id="ds-text" className={textbereich} value={d.beschreibung} onChange={feld("beschreibung")} /></div>
      <button type="submit" className={primaer} disabled={laeuft}><Sp an={laeuft} icon={Save} />Anfrage erfassen</button>
      <Meldungen fehler={fehler} meldung={meldung} />
    </form>
  );
}

const AKTIONEN = {
  eingegangen: [["identitaet_bestaetigen", "Identität bestätigt", "notiz", "Wie plausibilisiert? (z. B. Anfrage aus dem verifizierten Konto, Rückruf)"], ["identitaet_anfordern", "Identitätsnachweis anfordern", "notiz", "Was wurde angefordert, über welchen Weg?"], ["ablehnen", "Ablehnen", "begruendung", "Begründung (Art. 12 Abs. 5 DSGVO)"]],
  identitaet: [["identitaet_bestaetigen", "Identität bestätigt", "notiz", "Wie plausibilisiert?"], ["ablehnen", "Ablehnen", "begruendung", "Begründung"]],
  in_bearbeitung: [["erledigen", "Erledigen", "ergebnis", "Ergebnis/Antwort (was wurde wann wie übermittelt)"], ["verlaengern", "Frist um 2 Monate verlängern", "begruendung", "Grund (Komplexität/Anzahl) – wird der Person mitgeteilt"], ["ablehnen", "Ablehnen", "begruendung", "Begründung"]],
  verlaengert: [["erledigen", "Erledigen", "ergebnis", "Ergebnis/Antwort"], ["ablehnen", "Ablehnen", "begruendung", "Begründung"]],
};

export function AnfrageAktionen({ anfrage }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [aktion, setAktion] = useState("");
  const [text, setText] = useState("");
  const [loesch, setLoesch] = useState("");
  const [bestaetigung, setBestaetigung] = useState("");
  const [geprueft, setGeprueft] = useState(false);
  const [konto, setKonto] = useState("");
  const liste = AKTIONEN[anfrage.status] || [];
  const def = liste.find((x) => x[0] === aktion);
  const url = `/api/admin/compliance/datenschutz/${anfrage.id}`;
  if (!liste.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {liste.map(([id, label]) => <button key={id} type="button" className={cn(hell, aktion === id && "ring-2 ring-ov-500")} onClick={() => { setAktion(aktion === id ? "" : id); setText(""); }}>{label}</button>)}
        {anfrage.exportVerfuegbar && ["in_bearbeitung", "verlaengert"].includes(anfrage.status) && <a className={navy} href={`${url}/export`}><Download aria-hidden="true" className="h-4 w-4" />Datenexport (JSON)</a>}
      </div>
      {def && (
        <form className="space-y-2 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-200" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden(url, { body: { aktion, [def[2]]: text, loeschErgebnis: loesch } }), "Gespeichert."); }}>
          <label htmlFor={`ds-a-${anfrage.id}`} className={labelKlasse}>{def[3]}</label>
          <textarea id={`ds-a-${anfrage.id}`} className={cn(textbereich, "min-h-[80px]")} value={text} onChange={(e) => setText(e.target.value)} required minLength={10} />
          {aktion === "erledigen" && anfrage.art === "loeschung" && (
            <select aria-label="Löschergebnis" className={auswahlfeld} value={loesch} onChange={(e) => setLoesch(e.target.value)} required>
              <option value="">Löschergebnis wählen …</option>
              <option value="geloescht">gelöscht bzw. anonymisiert</option>
              <option value="gesperrt">gesperrt wegen Aufbewahrungspflicht (Art. 17 Abs. 3 lit. b)</option>
              <option value="keine_daten">keine Daten vorhanden</option>
            </select>
          )}
          <button type="submit" className={primaer} disabled={laeuft}><Sp an={laeuft} icon={Check} />Speichern</button>
        </form>
      )}
      {!anfrage.kontoId && (
        <form className="flex flex-wrap gap-1.5" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden(url, { body: { aktion: "konto_verknuepfen", kontoId: konto.startsWith("U-") ? konto : "", email: konto.includes("@") ? konto : "" } }), "Konto verknüpft."); }}>
          <input aria-label="Konto verknüpfen" className={cn(eingabe, "h-9 min-w-[220px] flex-1")} placeholder="Konto verknüpfen: U-… oder E-Mail" value={konto} onChange={(e) => setKonto(e.target.value)} />
          <button type="submit" className={hell} disabled={laeuft || !konto}>Verknüpfen</button>
        </form>
      )}
      {anfrage.art === "loeschung" && anfrage.kontoId && !anfrage.konto?.geloescht && ["in_bearbeitung", "verlaengert"].includes(anfrage.status) && (
        <form className="space-y-2 rounded-2xl bg-sun-300/15 p-3 ring-1 ring-sun-400/50" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden(url, { body: { aktion: "anonymisieren", bestaetigung, aufbewahrungGeprueft: geprueft } }), "Konto anonymisiert und gesperrt."); }}>
          <p className="text-[13px] text-ink-800">Konto anonymisieren: Stammdaten, Sitzungen, Geräte, 2FA, Benachrichtigungen und Entwürfe entfallen; Belege, NDA-/Einwilligungsnachweise und GwG-Unterlagen bleiben gesperrt bis Fristablauf.</p>
          <label className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={geprueft} onChange={(e) => setGeprueft(e.target.checked)} />Aufbewahrungspflichten geprüft</label>
          <div className="flex flex-wrap gap-1.5">
            <input aria-label="Bestätigung LÖSCHEN" className={cn(eingabe, "h-9 w-40")} placeholder="LÖSCHEN" value={bestaetigung} onChange={(e) => setBestaetigung(e.target.value)} />
            <button type="submit" className={navy} disabled={laeuft}><Sp an={laeuft} icon={UserX} />Anonymisieren</button>
          </div>
        </form>
      )}
      <Meldungen fehler={fehler} meldung={meldung} />
    </div>
  );
}

export function FristenLauf() {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  return (
    <div>
      <button type="button" className={navy} disabled={laeuft} onClick={() => ausfuehren(() => senden("/api/admin/compliance/fristen", { body: {} }), (r) => `Fristen-Lauf ausgeführt${r && typeof r === "object" ? `: ${Object.entries(r).filter(([k, v]) => k !== "ok" && typeof v === "number").map(([k, v]) => `${k} ${v}`).join(", ") || "ohne Änderungen"}` : ""}.`)}><Sp an={laeuft} icon={Play} />KYC-Fristen-Lauf jetzt ausführen</button>
      <Meldungen fehler={fehler} meldung={meldung} />
    </div>
  );
}

// ------------------------------------------------------------------ Geldwäsche-Verdacht

export function VerdachtFormular({ anlaesse, vorbelegt = {}, ziel = "/api/admin/compliance/verdacht" }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [d, setD] = useState({ anlass: "sonstiges", land: "AT", sachverhalt: "", kontoId: vorbelegt.kontoId || "", kycFallId: vorbelegt.kycFallId || "", betrag: "", transaktionSperren: false });
  const feld = (k) => (e) => setD({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); ausfuehren(() => senden(ziel, { body: d }), (r) => `${r.id} erfasst. ${r.hinweis}`); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="gw-anlass" className={labelKlasse}>Anlass</label><select id="gw-anlass" className={auswahlfeld} value={d.anlass} onChange={feld("anlass")}>{Object.entries(anlaesse).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label htmlFor="gw-land" className={labelKlasse}>Zuständige Meldestelle</label><select id="gw-land" className={auswahlfeld} value={d.land} onChange={feld("land")}><option value="AT">Österreich (A-FIU)</option><option value="DE">Deutschland (FIU)</option><option value="CH">Schweiz (MROS)</option></select></div>
        <div><label htmlFor="gw-konto" className={labelKlasse}>Konto (U-…, optional)</label><input id="gw-konto" className={eingabe} value={d.kontoId} onChange={feld("kontoId")} /></div>
        <div><label htmlFor="gw-betrag" className={labelKlasse}>Betrag € (optional)</label><input id="gw-betrag" type="number" min="0" className={eingabe} value={d.betrag} onChange={feld("betrag")} /></div>
      </div>
      <div><label htmlFor="gw-text" className={labelKlasse}>Sachverhalt (wer, was, wann, warum auffällig)</label><textarea id="gw-text" className={textbereich} value={d.sachverhalt} onChange={feld("sachverhalt")} required minLength={30} /></div>
      <label className="flex items-center gap-2 text-[13.5px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={d.transaktionSperren} onChange={feld("transaktionSperren")} />Laufende Transaktion/Auszahlung bis zur Klärung anhalten (intern vermerken)</label>
      <button type="submit" className={primaer} disabled={laeuft}><Sp an={laeuft} icon={ShieldAlert} />Vertraulich an Compliance melden</button>
      <p className="text-[12.5px] text-ink-500">Die betroffene Person darf nicht informiert werden (Tipping-off-Verbot). Die Plattform versendet nichts an Behörden – die Meldung erfolgt ggf. durch die/den Geldwäschebeauftragte/n über goAML.</p>
      <Meldungen fehler={fehler} meldung={meldung} />
    </form>
  );
}

const V_AKTIONEN = {
  erfasst: [["pruefen", "Prüfung übernehmen", null]],
  in_pruefung: [["meldung_vorbereiten", "Meldung erforderlich", "begruendung"], ["keine_meldung", "Keine Meldung (dokumentieren)", "begruendung"]],
  meldung_vorbereitet: [["gemeldet", "Meldung abgegeben (manuell über goAML)", "meldung"], ["keine_meldung", "Doch keine Meldung", "begruendung"]],
  gemeldet: [["abschliessen", "Abschließen", null]],
  keine_meldung: [["abschliessen", "Abschließen", null]],
};

export function VerdachtAktionen({ fall, heute }) {
  const { laeuft, fehler, meldung, ausfuehren } = useAktion();
  const [aktion, setAktion] = useState("");
  const [text, setText] = useState("");
  const [az, setAz] = useState("");
  const [am, setAm] = useState(heute);
  const [notiz, setNotiz] = useState("");
  const url = `/api/admin/compliance/verdacht/${fall.id}`;
  const liste = V_AKTIONEN[fall.status] || [];
  const def = liste.find((x) => x[0] === aktion);
  const los = (body, ok) => ausfuehren(() => senden(url, { body }), ok);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {liste.map(([id, label, feld]) => <button key={id} type="button" className={cn(feld ? hell : navy, aktion === id && "ring-2 ring-ov-500")} disabled={laeuft} onClick={() => (feld ? setAktion(aktion === id ? "" : id) : los({ aktion: id }, "Gespeichert."))}>{label}</button>)}
      </div>
      {def?.[2] === "begruendung" && (
        <form className="space-y-2 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-200" onSubmit={(e) => { e.preventDefault(); los({ aktion, begruendung: text }, "Entscheidung dokumentiert."); }}>
          <label htmlFor={`gw-b-${fall.id}`} className={labelKlasse}>Abwägung und Begründung (Vier-Augen: nicht die meldende Person)</label>
          <textarea id={`gw-b-${fall.id}`} className={cn(textbereich, "min-h-[80px]")} value={text} onChange={(e) => setText(e.target.value)} required minLength={20} />
          <button type="submit" className={primaer} disabled={laeuft}><Sp an={laeuft} icon={Check} />Speichern</button>
        </form>
      )}
      {def?.[2] === "meldung" && (
        <form className="grid gap-2 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-200 sm:grid-cols-[minmax(0,1fr)_160px_auto]" onSubmit={(e) => { e.preventDefault(); los({ aktion, aktenzeichen: az, gemeldetAm: am }, "Meldung vermerkt."); }}>
          <input aria-label="Aktenzeichen/Referenz der Meldestelle" className={eingabe} placeholder="Aktenzeichen / goAML-Referenz" value={az} onChange={(e) => setAz(e.target.value)} required />
          <input aria-label="Meldedatum" type="date" max={heute} className={eingabe} value={am} onChange={(e) => setAm(e.target.value)} required />
          <button type="submit" className={primaer} disabled={laeuft}><Sp an={laeuft} icon={Send} />Vermerken</button>
        </form>
      )}
      <form className="flex flex-wrap gap-1.5" onSubmit={(e) => { e.preventDefault(); los({ aktion: "notiz", text: notiz }, "Notiz gespeichert."); setNotiz(""); }}>
        <input aria-label="Notiz zur Akte" className={cn(eingabe, "h-9 min-w-[220px] flex-1")} placeholder="Notiz zur Akte (z. B. Unterlagen gesichert)" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        <button type="submit" className={hell} disabled={laeuft || notiz.trim().length < 5}>Notiz</button>
      </form>
      <Meldungen fehler={fehler} meldung={meldung} />
    </div>
  );
}

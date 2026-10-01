"use client";

// Formulare der Bank-Akte – Bank-Portal (/portal/bank/[id], /portal/bank/team) und Backoffice (/portal/admin/finanzierung/[id]/bank/[anfrageId]).
// Prüfungen und Teamrollen serverseitig (finanzierung/bankakte.js + Backend).

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { AktionKnopf, Knopf, SchnellFormular, useAktion } from "@/components/Portal/Entwicklung/Formular";
import { BANK_TEAMROLLEN, BERICHT_ARTEN, KREDIT_ERGEBNIS, QA_KATEGORIEN } from "@/lib/plattform/finanzierung/bankakte";

const optionen = (o) => Object.entries(o).map(([wert, x]) => ({ wert, label: typeof x === "string" ? x : x.label }));
const url = (anfrageId, bo) => (bo ? `/api/admin/finanzierung/bankakte/${anfrageId}` : `/api/portal/bank/${anfrageId}/akte`);
const aktion = (anfrageId, bo, body) => senden(url(anfrageId, bo), { body });
const inTagen = (t) => new Date(Date.now() + t * 86400e3).toISOString().slice(0, 10);

async function dateiHoch(anfrageId, bo, datei) {
  const fd = new FormData();
  fd.append("datei", datei);
  let res;
  try {
    res = await fetch(`${url(anfrageId, bo)}/dateien`, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  } catch {
    throw new Error("Keine Verbindung – bitte prüfen Sie Ihre Internetverbindung.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Fehler ${res.status}`);
  return json.datei;
}

/** Datei wählen, sofort hochladen, ID an den Aufrufer (für Antwort/Lieferung/Bericht) */
function DateiFeld({ anfrageId, bo, dateien, setDateien, mehrere = true }) {
  const a = useAktion();
  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">{dateien.map((d) => <li key={d.id} className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-3 py-1 text-[12.5px] ring-1 ring-ink-200">{d.name}<button type="button" onClick={() => setDateien(dateien.filter((x) => x.id !== d.id))} aria-label={`${d.name} entfernen`} className="text-ink-500 hover:text-danger-700"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button></li>)}</ul>
      {(mehrere || !dateien.length) && (
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
          {a.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Upload aria-hidden="true" className="h-4 w-4" />}Datei anhängen (PDF/JPG/PNG)
          <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={a.laeuft} onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const d = await a.ausfuehren(() => dateiHoch(anfrageId, bo, f), { aktualisieren: false });
            if (d) setDateien([...dateien, d]);
          }} />
        </label>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}

// ================================================================ Bank

/** Checkliste: mehrere Unterlagen auf einmal anfordern */
export function AnforderungFormular({ anfrageId, bausteine }) {
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const leer = () => ({ titel: "", beschreibung: "", baustein: "", frist: inTagen(10) });
  const [punkte, setPunkte] = useState([leer()]);
  const set = (i, k) => (e) => setPunkte((p) => p.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const r = await a.ausfuehren(() => aktion(anfrageId, false, { aktion: "anforderung", punkte }), { meldung: "Angefordert – ÖkoInvest wurde informiert." });
      if (r) setPunkte([leer()]);
    }}>
      {punkte.map((p, i) => (
        <div key={i} className="grid gap-3 rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-200/70 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_150px_auto]">
          <Feld id={`${basis}-t${i}`} label="Unterlage"><input id={`${basis}-t${i}`} required value={p.titel} onChange={set(i, "titel")} className={eingabe} maxLength={200} placeholder="z. B. Bodengutachten, Mietvertrag Umspannwerk" /></Feld>
          <Feld id={`${basis}-b${i}`} label="Baustein (optional)">
            <select id={`${basis}-b${i}`} value={p.baustein} onChange={set(i, "baustein")} className={auswahlfeld}><option value="">– frei –</option>{bausteine.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
          </Feld>
          <Feld id={`${basis}-f${i}`} label="Frist"><input id={`${basis}-f${i}`} type="date" required value={p.frist} onChange={set(i, "frist")} className={eingabe} /></Feld>
          <div className="flex items-end">{punkte.length > 1 && <button type="button" onClick={() => setPunkte(punkte.filter((_, j) => j !== i))} className="inline-flex h-11 items-center px-2 text-ink-500 hover:text-danger-700" aria-label="Punkt entfernen"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>}</div>
          <Feld id={`${basis}-d${i}`} label="Erläuterung" className="sm:col-span-4"><input id={`${basis}-d${i}`} value={p.beschreibung} onChange={set(i, "beschreibung")} className={eingabe} maxLength={1000} /></Feld>
        </div>
      ))}
      {punkte.length < 20 && <button type="button" onClick={() => setPunkte([...punkte, leer()])} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800"><Plus aria-hidden="true" className="h-4 w-4" />Weitere Unterlage</button>}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Unterlagen anfordern</Knopf>
    </form>
  );
}

export function AnforderungPruefen({ anfrageId, anforderung }) {
  const [nach, setNach] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <AktionKnopf klein variante="primaer" meldung="Akzeptiert." fn={() => aktion(anfrageId, false, { aktion: "anforderung_pruefen", anforderungId: anforderung.id, ergebnis: "akzeptiert" })}>Akzeptieren</AktionKnopf>
        <button type="button" onClick={() => setNach(!nach)} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Nachfordern</button>
      </div>
      {nach && <SchnellFormular spalten={2} knopf="Nachforderung senden" meldung="Nachgefordert." start={{ frist: inTagen(7) }} felder={[{ name: "kommentar", label: "Was fehlt?", typ: "text", pflicht: true }, { name: "frist", label: "Neue Frist", typ: "datum" }]} onSenden={(d) => aktion(anfrageId, false, { aktion: "anforderung_pruefen", anforderungId: anforderung.id, ergebnis: "nachforderung", ...d })} />}
    </div>
  );
}

export function FrageFormular({ anfrageId }) {
  return (
    <SchnellFormular spalten={1} zuruecksetzen knopf="Frage stellen" meldung="Frage gestellt – die Antwort erscheint hier."
      start={{ kategorie: "technik" }}
      felder={[{ name: "kategorie", label: "Kategorie", typ: "auswahl", optionen: optionen(QA_KATEGORIEN), leer: false }, { name: "frage", label: "Ihre Frage", typ: "mehrzeilig" }]}
      onSenden={(d) => aktion(anfrageId, false, { aktion: "frage", ...d })} />
  );
}

export function ZustaendigAuswahl({ anfrageId, team, aktuell }) {
  const a = useAktion();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`zust-${anfrageId}`}>Zuständig</label>
      <select id={`zust-${anfrageId}`} defaultValue={aktuell || ""} disabled={a.laeuft} onChange={(e) => e.target.value && a.ausfuehren(() => aktion(anfrageId, false, { aktion: "zustaendig", nutzerId: e.target.value }), { meldung: "Zuständigkeit gesetzt." })} className={`${auswahlfeld} h-10 max-w-xs`}>
        <option value="">– zuweisen –</option>
        {team.filter((t) => t.rolle !== "lesen").map((t) => <option key={t.id} value={t.id}>{t.name} ({BANK_TEAMROLLEN[t.rolle]?.label})</option>)}
      </select>
      {a.fehler && <span role="alert" className="text-[12.5px] text-danger-700">{a.fehler}</span>}
      {a.erfolg && <span role="status" className="text-[12.5px] text-ov-800">{a.erfolg}</span>}
    </div>
  );
}

export function KreditentscheidungFormular({ anfrageId, betrag }) {
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const heute = new Date().toISOString().slice(0, 10);
  const [k, setK] = useState({ ergebnis: "genehmigt", gremium: "", beschlussAm: heute, betrag: betrag || "", gueltigBis: inTagen(90), auflagen: "", begruendung: "" });
  const set = (x) => (e) => setK((y) => ({ ...y, [x]: e.target.value }));
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await a.ausfuehren(() => aktion(anfrageId, false, { aktion: "kreditentscheidung", entscheidung: { ...k, betrag: k.betrag === "" ? null : Number(k.betrag) } }), { meldung: "Kreditentscheidung übermittelt." }); }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Feld id={`${basis}-e`} label="Ergebnis"><select id={`${basis}-e`} value={k.ergebnis} onChange={set("ergebnis")} className={auswahlfeld}>{optionen(KREDIT_ERGEBNIS).map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}</select></Feld>
        <Feld id={`${basis}-g`} label="Gremium"><input id={`${basis}-g`} value={k.gremium} onChange={set("gremium")} className={eingabe} placeholder="z. B. Kreditausschuss" maxLength={120} /></Feld>
        <Feld id={`${basis}-d`} label="Beschluss vom"><input id={`${basis}-d`} type="date" required value={k.beschlussAm} onChange={set("beschlussAm")} className={eingabe} /></Feld>
        {k.ergebnis !== "abgelehnt" && (
          <>
            <Feld id={`${basis}-b`} label="Genehmigter Betrag (€)"><input id={`${basis}-b`} inputMode="numeric" value={k.betrag} onChange={set("betrag")} className={eingabe} /></Feld>
            <Feld id={`${basis}-v`} label="Zusage gültig bis"><input id={`${basis}-v`} type="date" value={k.gueltigBis} onChange={set("gueltigBis")} className={eingabe} /></Feld>
          </>
        )}
      </div>
      {k.ergebnis === "genehmigt_auflagen" && <Feld id={`${basis}-a`} label="Auflagen (eine je Zeile)"><textarea id={`${basis}-a`} value={k.auflagen} onChange={set("auflagen")} className={textbereich} /></Feld>}
      <Feld id={`${basis}-r`} label={k.ergebnis === "abgelehnt" ? "Begründung (Pflicht)" : "Bemerkung"}><textarea id={`${basis}-r`} value={k.begruendung} onChange={set("begruendung")} className={textbereich} maxLength={2000} /></Feld>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Kreditentscheidung übermitteln</Knopf>
    </form>
  );
}

export function CpBestaetigen({ anfrageId, cp }) {
  const [beanst, setBeanst] = useState(false);
  return (
    <span className="flex flex-col gap-2">
      <span className="flex flex-wrap gap-2">
        <AktionKnopf klein variante="primaer" meldung="Bestätigt." fn={() => aktion(anfrageId, false, { aktion: "cp_bestaetigen", cpId: cp.id, status: "bestaetigt" })}>Bestätigen</AktionKnopf>
        <button type="button" onClick={() => setBeanst(!beanst)} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Beanstanden</button>
      </span>
      {beanst && <SchnellFormular spalten={1} knopf="Beanstandung senden" meldung="Beanstandet – ÖkoInvest wurde informiert." felder={[{ name: "kommentar", label: "Begründung", typ: "text", pflicht: true }]} onSenden={(d) => aktion(anfrageId, false, { aktion: "cp_bestaetigen", cpId: cp.id, status: "beanstandet", kommentar: d.kommentar })} />}
    </span>
  );
}

export function AuszahlungEntscheiden({ anfrageId, x, leitung }) {
  const [ab, setAb] = useState(false);
  if (x.status === "beantragt" && !leitung) return <span className="text-[12.5px] text-ink-500">Freigabe durch die Leitung Ihres Hauses.</span>;
  return (
    <span className="flex flex-col gap-2">
      {x.status === "beantragt" && (
        <span className="flex flex-wrap gap-2">
          <AktionKnopf klein variante="primaer" meldung="Freigegeben." fn={() => aktion(anfrageId, false, { aktion: "auszahlung_entscheiden", auszahlungId: x.id, ergebnis: "freigegeben" })}>Freigeben</AktionKnopf>
          <button type="button" onClick={() => setAb(!ab)} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Ablehnen</button>
        </span>
      )}
      {ab && <SchnellFormular spalten={1} knopf="Ablehnen" meldung="Abgelehnt." felder={[{ name: "kommentar", label: "Begründung", typ: "text", pflicht: true }]} onSenden={(d) => aktion(anfrageId, false, { aktion: "auszahlung_entscheiden", auszahlungId: x.id, ergebnis: "abgelehnt", kommentar: d.kommentar })} />}
      {x.status === "freigegeben" && <SchnellFormular spalten={1} knopf="Als ausgezahlt melden" meldung="Auszahlung gemeldet." start={{ valuta: new Date().toISOString().slice(0, 10) }} felder={[{ name: "valuta", label: "Valuta", typ: "datum", pflicht: true }]} onSenden={(d) => aktion(anfrageId, false, { aktion: "auszahlung_entscheiden", auszahlungId: x.id, ergebnis: "ausgezahlt", valuta: d.valuta })} />}
    </span>
  );
}

export function BerichtAnfordern({ anfrageId }) {
  return (
    <SchnellFormular spalten={3} zuruecksetzen knopf="Bericht anfordern" meldung="Angefordert." start={{ art: "covenant", faelligAm: inTagen(30) }}
      felder={[{ name: "art", label: "Bericht", typ: "auswahl", optionen: optionen(BERICHT_ARTEN), leer: false }, { name: "periode", label: "Zeitraum", typ: "text", pflicht: true }, { name: "faelligAm", label: "Fällig am", typ: "datum", pflicht: true }, { name: "bemerkung", label: "Bemerkung", typ: "text", breit: true }]}
      onSenden={(d) => aktion(anfrageId, false, { aktion: "bericht_anfordern", ...d })} />
  );
}

export function BerichtPruefen({ anfrageId, bericht }) {
  const [be, setBe] = useState(false);
  return (
    <span className="flex flex-col gap-2">
      <span className="flex flex-wrap gap-2">
        <AktionKnopf klein variante="primaer" meldung="Als geprüft markiert." fn={() => aktion(anfrageId, false, { aktion: "bericht_pruefen", berichtId: bericht.id, ergebnis: "geprueft" })}>Geprüft</AktionKnopf>
        <button type="button" onClick={() => setBe(!be)} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Beanstanden</button>
      </span>
      {be && <SchnellFormular spalten={1} knopf="Beanstandung senden" meldung="Beanstandet." felder={[{ name: "kommentar", label: "Begründung", typ: "text", pflicht: true }]} onSenden={(d) => aktion(anfrageId, false, { aktion: "bericht_pruefen", berichtId: bericht.id, ergebnis: "beanstandet", kommentar: d.kommentar })} />}
    </span>
  );
}

/** Absage an die Anfrage (Teamrolle Leitung) – über die Bank-Aktion der Finanzierung */
export function BankAbsage({ anfrageId }) {
  return <SchnellFormular spalten={1} knopf="Absage übermitteln" meldung="Absage übermittelt." felder={[{ name: "text", label: "Grund der Absage (für ÖkoInvest)", typ: "mehrzeilig" }]} onSenden={(d) => senden(`/api/portal/bank/${anfrageId}`, { body: { aktion: "absage", text: d.text } })} />;
}

// ---------------------------------------------------------------- Team

export function TeamEinladen({ bankId, domain }) {
  const [link, setLink] = useState("");
  return (
    <SchnellFormular spalten={2} zuruecksetzen knopf="Einladen" meldung="Einladung versendet (7 Tage gültig)." start={{ rolle: "sachbearbeiter" }}
      felder={[{ name: "email", label: `E-Mail (@${domain})`, typ: "text", pflicht: true }, { name: "rolle", label: "Rolle", typ: "auswahl", optionen: optionen(BANK_TEAMROLLEN), leer: false }]}
      onSenden={async (d) => { const r = await senden("/api/portal/bank/team", { body: { aktion: "einladen", bankId, ...d } }); setLink(r.demoLink || ""); return r; }}
      zusatz={link ? <span className="break-all text-[12px] text-ink-500">Demo-Link: {link}</span> : null} />
  );
}

export function TeamRolle({ bankId, m }) {
  const a = useAktion();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`rolle-${m.id}`}>Rolle von {m.name}</label>
      <select id={`rolle-${m.id}`} defaultValue={m.rolle} disabled={a.laeuft} onChange={(e) => a.ausfuehren(() => senden("/api/portal/bank/team", { body: { aktion: "rolle", bankId, nutzerId: m.id, rolle: e.target.value } }), { meldung: "Rolle geändert." })} className={`${auswahlfeld} h-9 text-[13px]`}>
        {optionen(BANK_TEAMROLLEN).map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}
      </select>
      <AktionKnopf klein variante="gefahr" frage={`${m.name} aus dem Team entfernen? Der Zugang zu allen Anfragen Ihres Hauses endet sofort.`} meldung="Entfernt." fn={() => senden("/api/portal/bank/team", { body: { aktion: "entfernen", bankId, nutzerId: m.id } })}>Entfernen</AktionKnopf>
      {a.fehler && <span role="alert" className="text-[12.5px] text-danger-700">{a.fehler}</span>}
    </span>
  );
}

export function EinladungWiderrufen({ bankId, id }) {
  return <AktionKnopf klein variante="gefahr" meldung="Widerrufen." fn={() => senden("/api/portal/bank/team", { body: { aktion: "widerrufen", bankId, einladungId: id } })}>Widerrufen</AktionKnopf>;
}

export function TeamEinladungAnnehmen({ token }) {
  const router = useRouter();
  const a = useAktion();
  return (
    <div className="space-y-3">
      <button type="button" disabled={a.laeuft} onClick={async () => { const r = await a.ausfuehren(() => senden("/api/portal/bank/team/einladung", { body: { token } }), { aktualisieren: false }); if (r) router.push("/portal/bank"); }} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
        {a.laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Einladung annehmen
      </button>
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}

// ================================================================ ÖkoInvest (Backoffice)

export function AnforderungLiefern({ anfrageId, anforderung }) {
  const a = useAktion();
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState([]);
  const [frei, setFrei] = useState(!!anforderung.baustein);
  return (
    <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); await a.ausfuehren(() => aktion(anfrageId, true, { aktion: "anforderung_liefern", anforderungId: anforderung.id, text, dateiIds: dateien.map((d) => d.id), bausteinFreigeben: frei }), { meldung: "Geliefert – die Bank wurde informiert." }); }}>
      <label className="sr-only" htmlFor={`lief-${anforderung.id}`}>Antwort</label>
      <textarea id={`lief-${anforderung.id}`} value={text} onChange={(e) => setText(e.target.value)} className={`${textbereich} min-h-[72px]`} placeholder="Antwort bzw. Hinweis zur Unterlage" maxLength={2000} />
      <DateiFeld anfrageId={anfrageId} bo dateien={dateien} setDateien={setDateien} />
      {anforderung.baustein && <label className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" checked={frei} onChange={(e) => setFrei(e.target.checked)} className="h-4 w-4 accent-ov-600" />Baustein „{anforderung.bausteinLabel}“ im Bankenpaket für diese Bank freigeben</label>}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Liefern</Knopf>
    </form>
  );
}

export function FrageBeantworten({ anfrageId, frage }) {
  const a = useAktion();
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState([]);
  return (
    <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); await a.ausfuehren(() => aktion(anfrageId, true, { aktion: "antwort", frageId: frage.id, text, dateiIds: dateien.map((d) => d.id) }), { meldung: "Beantwortet – die Bank wurde informiert." }); }}>
      <label className="sr-only" htmlFor={`antw-${frage.id}`}>Antwort</label>
      <textarea id={`antw-${frage.id}`} required value={text} onChange={(e) => setText(e.target.value)} className={`${textbereich} min-h-[72px]`} placeholder="Antwort an die Bank" maxLength={4000} />
      <DateiFeld anfrageId={anfrageId} bo dateien={dateien} setDateien={setDateien} />
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Antworten</Knopf>
    </form>
  );
}

export function AuszahlungBeantragen({ anfrageId, verfuegbar }) {
  return (
    <SchnellFormular spalten={3} zuruecksetzen knopf="Auszahlung beantragen" meldung="Beantragt – die Bank entscheidet im Portal." start={{ wunschDatum: inTagen(5), betrag: verfuegbar > 0 ? String(Math.round(verfuegbar)) : "" }}
      felder={[{ name: "betrag", label: "Betrag (€)", typ: "zahl", pflicht: true }, { name: "wunschDatum", label: "Valuta gewünscht", typ: "datum", pflicht: true }, { name: "zweck", label: "Verwendungszweck", typ: "text", pflicht: true }]}
      onSenden={(d) => aktion(anfrageId, true, { aktion: "auszahlung_beantragen", ...d })} />
  );
}

export function BerichtEinreichen({ anfrageId, bericht = null }) {
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const [art, setArt] = useState(bericht?.art || "covenant");
  const [periode, setPeriode] = useState(bericht?.periode || "");
  const [bemerkung, setBemerkung] = useState("");
  const [dateien, setDateien] = useState([]);
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await a.ausfuehren(() => aktion(anfrageId, true, { aktion: "bericht_einreichen", berichtId: bericht?.id || "", art, periode, bemerkung, dateiId: dateien[0]?.id || "" }), { meldung: "Eingereicht – die Bank wurde informiert." }); }}>
      {!bericht && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id={`${basis}-a`} label="Bericht"><select id={`${basis}-a`} value={art} onChange={(e) => setArt(e.target.value)} className={auswahlfeld}>{optionen(BERICHT_ARTEN).map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}</select></Feld>
          <Feld id={`${basis}-p`} label="Zeitraum"><input id={`${basis}-p`} required value={periode} onChange={(e) => setPeriode(e.target.value)} className={eingabe} placeholder="z. B. Q3/2026" maxLength={40} /></Feld>
        </div>
      )}
      <Feld id={`${basis}-b`} label="Bemerkung"><input id={`${basis}-b`} value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} className={eingabe} maxLength={1000} /></Feld>
      {art === "covenant" ? <p className="text-[12.5px] text-ink-600">Der Covenant-Report wird als Momentaufnahme aus dem Covenant-Monitoring erzeugt (DSCR rollierend 12 Monate, LLCR, Ampel). Eine Anlage ist optional.</p> : null}
      <DateiFeld anfrageId={anfrageId} bo dateien={dateien} setDateien={setDateien} mehrere={false} />
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Bericht einreichen</Knopf>
    </form>
  );
}

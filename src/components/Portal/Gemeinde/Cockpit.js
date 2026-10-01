"use client";

// Gemeindecockpit (Client-Teile): Verfahrensschritt pflegen (Backoffice), Termine (Gemeinderat, Bürgerinformation, Fristen),
// Einnahmen (Backoffice), Stellungnahmen mit Antworten, Bürgerinfo-Material/Pressetexte als Entwurf (Vorschau, Kopieren, PDF).
// Prüfungen serverseitig (gemeinde/cockpit.js im Backend).

import { useId, useState } from "react";
import { Copy } from "lucide-react";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { SCHRITT_STATUS, TERMIN_ARTEN, TERMIN_STATUS, ZAHLUNG_ARTEN, ZAHLUNG_STATUS } from "@/lib/plattform/gemeinde/cockpit";
import { KOMMUNE } from "@/lib/invest/markt";
import { Klappe, Knopf, Meldung, PdfLink, useAktion } from "@/components/Portal/Mitglied/teile";
import { bestaetigen } from "@/components/ui/Rueckfrage";

const URL = "/api/portal/gemeinde";

export function SchrittPflege({ vorgangId, projektRef, s }) {
  const a = useAktion(URL);
  const [x, setX] = useState({ status: s.status, datum: s.datum || "", notiz: s.notiz || "" });
  return (
    <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ vorgangId, aktion: "schritt", projektRef, schritt: s.id, ...x }, "Gespeichert – die Gemeinde wurde benachrichtigt."); }}>
      <select aria-label="Status" className={`${auswahlfeld} h-9 w-36`} value={x.status} onChange={(e) => setX({ ...x, status: e.target.value })}>{Object.entries(SCHRITT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      <input aria-label="Datum" type="date" className={`${eingabe} h-9 w-40`} value={x.datum} onChange={(e) => setX({ ...x, datum: e.target.value })} />
      <input aria-label="Notiz" placeholder="Notiz" className={`${eingabe} h-9 min-w-0 flex-1`} value={x.notiz} onChange={(e) => setX({ ...x, notiz: e.target.value })} />
      <Knopf type="submit" disabled={a.laeuft}>Speichern</Knopf>
      <div className="w-full"><Meldung fehler={a.fehler} ok={a.ok} /></div>
    </form>
  );
}

export function TerminFormular({ vorgangId, projekte = [], termin = null }) {
  const id = useId();
  const a = useAktion(URL);
  const [t, setT] = useState({ art: termin?.art || "gemeinderat", titel: termin?.titel || "", beginn: termin?.beginn || "", ort: termin?.ort || "", projektRef: termin?.projektRef || "", status: termin?.status || "geplant", notiz: termin?.notiz || "", oeffentlich: termin?.oeffentlich ?? true });
  const s = (k) => (e) => setT({ ...t, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ vorgangId, aktion: "termin", id: termin?.id, ...t }, "Termin gespeichert."); }}>
      <Feld id={`${id}-a`} label="Art"><select id={`${id}-a`} className={auswahlfeld} value={t.art} onChange={s("art")}>{Object.entries(TERMIN_ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
      <Feld id={`${id}-t`} label="Titel" pflicht className="sm:col-span-2"><input id={`${id}-t`} required className={eingabe} value={t.titel} onChange={s("titel")} /></Feld>
      <Feld id={`${id}-b`} label="Datum und Uhrzeit" pflicht><input id={`${id}-b`} required type="datetime-local" className={eingabe} value={t.beginn} onChange={s("beginn")} /></Feld>
      <Feld id={`${id}-o`} label="Ort"><input id={`${id}-o`} className={eingabe} value={t.ort} onChange={s("ort")} /></Feld>
      <Feld id={`${id}-p`} label="Projekt"><select id={`${id}-p`} className={auswahlfeld} value={t.projektRef} onChange={s("projektRef")}><option value="">allgemein</option>{projekte.map((p) => <option key={p.ref} value={p.ref}>Nr. {p.nr} – {p.art}</option>)}</select></Feld>
      {termin && <Feld id={`${id}-st`} label="Status"><select id={`${id}-st`} className={auswahlfeld} value={t.status} onChange={s("status")}>{Object.entries(TERMIN_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>}
      <Feld id={`${id}-n`} label="Notiz / Beschluss" className={termin ? "sm:col-span-2" : "sm:col-span-3"}><input id={`${id}-n`} className={eingabe} value={t.notiz} onChange={s("notiz")} /></Feld>
      <label className="flex items-center gap-2 text-[13.5px] text-ink-700 sm:col-span-3"><input type="checkbox" checked={t.oeffentlich} onChange={s("oeffentlich")} className="h-4 w-4 accent-[#558227]" /> Öffentliche Sitzung bzw. öffentlicher Termin</label>
      <div className="sm:col-span-3"><Meldung fehler={a.fehler} ok={a.ok} /></div>
      <div className="sm:col-span-3"><Knopf variante="primary" type="submit" disabled={a.laeuft}>{termin ? "Termin speichern" : "Termin eintragen"}</Knopf></div>
    </form>
  );
}

export function TerminEntfernen({ vorgangId, t }) {
  const a = useAktion(URL);
  return (
    <span className="inline-flex flex-col gap-1">
      <Knopf variante="gefahr" disabled={a.laeuft} onClick={async () => (await bestaetigen({ titel: `Termin „${t.titel}“ entfernen?`, text: "Der Termin wird aus dem Vorgang entfernt.", bestaetigenText: "Termin entfernen", gefahr: true })) && a.ausfuehren({ vorgangId, aktion: "terminLoeschen", id: t.id }, "Entfernt.")}>Entfernen</Knopf>
      <Meldung fehler={a.fehler} />
    </span>
  );
}

export function ZahlungFormular({ vorgangId, land, projekte = [], jahr }) {
  const id = useId();
  const a = useAktion(URL);
  const arten = Object.entries(ZAHLUNG_ARTEN).filter(([, v]) => v.laender.includes(land));
  const [z, setZ] = useState({ art: arten[0]?.[0] || "sonstiges", jahr: String(jahr), status: "prognose", projektRef: "", kwh: "", ctProKwh: String(KOMMUNE.beteiligungCt), betragEur: "", faellig: "", gezahltAm: "", notiz: "" });
  const s = (k) => (e) => setZ({ ...z, [k]: e.target.value });
  const p = projekte.find((x) => x.ref === z.projektRef);
  return (
    <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ vorgangId, aktion: "zahlung", ...z }, "Einnahme gespeichert."); }}>
      <Feld id={`${id}-a`} label="Art" className="sm:col-span-2"><select id={`${id}-a`} className={auswahlfeld} value={z.art} onChange={s("art")}>{arten.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
      <Feld id={`${id}-j`} label="Jahr"><input id={`${id}-j`} inputMode="numeric" className={eingabe} value={z.jahr} onChange={s("jahr")} /></Feld>
      <Feld id={`${id}-s`} label="Status"><select id={`${id}-s`} className={auswahlfeld} value={z.status} onChange={s("status")}>{Object.entries(ZAHLUNG_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
      <Feld id={`${id}-p`} label="Projekt" className="sm:col-span-2"><select id={`${id}-p`} className={auswahlfeld} value={z.projektRef} onChange={s("projektRef")}><option value="">allgemein</option>{projekte.map((x) => <option key={x.ref} value={x.ref}>Nr. {x.nr} – {x.art}</option>)}</select></Feld>
      {z.art === "par6" ? (
        <>
          <Feld id={`${id}-k`} label="Eingespeiste kWh" hinweis={p?.par6?.kwh ? `Schätzung: ${p.par6.kwh.toLocaleString("de-DE")} kWh/Jahr` : undefined}><input id={`${id}-k`} inputMode="numeric" className={eingabe} value={z.kwh} onChange={s("kwh")} /></Feld>
          <Feld id={`${id}-c`} label="ct/kWh (höchstens 0,2)"><input id={`${id}-c`} inputMode="decimal" className={eingabe} value={z.ctProKwh} onChange={s("ctProKwh")} /></Feld>
        </>
      ) : (
        <Feld id={`${id}-b`} label="Betrag (€)" className="sm:col-span-2"><input id={`${id}-b`} inputMode="decimal" className={eingabe} value={z.betragEur} onChange={s("betragEur")} /></Feld>
      )}
      <Feld id={`${id}-f`} label="Fällig"><input id={`${id}-f`} type="date" className={eingabe} value={z.faellig} onChange={s("faellig")} /></Feld>
      <Feld id={`${id}-g`} label="Gezahlt am"><input id={`${id}-g`} type="date" className={eingabe} value={z.gezahltAm} onChange={s("gezahltAm")} /></Feld>
      <Feld id={`${id}-n`} label="Notiz" className="sm:col-span-2"><input id={`${id}-n`} className={eingabe} value={z.notiz} onChange={s("notiz")} /></Feld>
      <p className="text-[12.5px] leading-relaxed text-ink-500 sm:col-span-4">{ZAHLUNG_ARTEN[z.art]?.text}</p>
      <div className="sm:col-span-4"><Meldung fehler={a.fehler} ok={a.ok} /></div>
      <div className="sm:col-span-4"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Einnahme speichern</Knopf></div>
    </form>
  );
}

export function ZahlungEntfernen({ vorgangId, z }) {
  const a = useAktion(URL);
  if (z.status === "gezahlt") return null;
  return <Knopf variante="gefahr" disabled={a.laeuft} onClick={async () => (await bestaetigen({ titel: "Zahlung entfernen?", text: "Der Eintrag wird aus dem Vorgang entfernt.", bestaetigenText: "Zahlung entfernen", gefahr: true })) && a.ausfuehren({ vorgangId, aktion: "zahlungLoeschen", id: z.id }, "Entfernt.")}>Entfernen</Knopf>;
}

export function StellungnahmeFormular({ vorgangId, projekte = [], vorbelegung = null }) {
  const id = useId();
  const a = useAktion(URL);
  const [x, setX] = useState({ betreff: vorbelegung?.betreff || "", text: vorbelegung?.text || "", projektRef: "", frist: "" });
  const s = (k) => (e) => setX({ ...x, [k]: e.target.value });
  return (
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ vorgangId, aktion: "stellungnahme", ...x }, "Gesendet – die Gegenseite wurde benachrichtigt."); }}>
      <Feld id={`${id}-b`} label="Betreff" pflicht className="sm:col-span-2"><input id={`${id}-b`} required className={eingabe} value={x.betreff} onChange={s("betreff")} /></Feld>
      <Feld id={`${id}-f`} label="Antwort erbeten bis"><input id={`${id}-f`} type="date" className={eingabe} value={x.frist} onChange={s("frist")} /></Feld>
      <Feld id={`${id}-p`} label="Projekt"><select id={`${id}-p`} className={auswahlfeld} value={x.projektRef} onChange={s("projektRef")}><option value="">allgemein</option>{projekte.map((p) => <option key={p.ref} value={p.ref}>Nr. {p.nr} – {p.art}</option>)}</select></Feld>
      <Feld id={`${id}-t`} label="Stellungnahme bzw. Anfrage" pflicht className="sm:col-span-3"><textarea id={`${id}-t`} required rows={4} className={textbereich} value={x.text} onChange={s("text")} /></Feld>
      <div className="sm:col-span-3"><Meldung fehler={a.fehler} ok={a.ok} /></div>
      <div className="sm:col-span-3"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Senden</Knopf></div>
    </form>
  );
}

export function AntwortFormular({ vorgangId, s }) {
  const a = useAktion(URL);
  const [text, setText] = useState("");
  const [erledigt, setErledigt] = useState(false);
  if (s.status === "erledigt") return null;
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ vorgangId, aktion: "antwort", id: s.id, text, erledigt }, "Antwort gesendet."); }}>
      <textarea aria-label="Antwort" rows={2} className={textbereich} value={text} onChange={(e) => setText(e.target.value)} placeholder="Antwort" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" checked={erledigt} onChange={(e) => setErledigt(e.target.checked)} className="h-4 w-4 accent-[#558227]" /> damit erledigt</label>
        <Knopf variante="primary" type="submit" disabled={a.laeuft || text.trim().length < 2}>Antworten</Knopf>
        <Knopf disabled={a.laeuft} onClick={() => a.ausfuehren({ vorgangId, aktion: "erledigt", id: s.id }, "Als erledigt markiert.")}>Ohne Antwort erledigen</Knopf>
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </form>
  );
}

export function MaterialVorschau({ vorgangId, vorlagen = [], projekte = [] }) {
  const [art, setArt] = useState(vorlagen[0]?.id || "pressemitteilung");
  const [ref, setRef] = useState(projekte[0]?.ref || "");
  const [m, setM] = useState(null);
  const [fehler, setFehler] = useState("");
  const [kopiert, setKopiert] = useState(false);
  const q = `vorgang=${encodeURIComponent(vorgangId)}&art=${art}${ref ? `&projekt=${ref}` : ""}`;
  async function laden() {
    setFehler("");
    setKopiert(false);
    try {
      const r = await fetch(`/api/portal/gemeinde/material?${q}`, { credentials: "same-origin", cache: "no-store" });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j.error || `Fehler ${r.status}`);
      setM(j.material);
    } catch (e) {
      setFehler(e.message);
    }
  }
  async function kopieren() {
    try {
      await navigator.clipboard.writeText([m.titel, "", ...m.absaetze].join("\n\n"));
      setKopiert(true);
    } catch {
      setFehler("Kopieren nicht möglich – bitte Text markieren.");
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Feld id="mat-art" label="Vorlage"><select id="mat-art" className={`${auswahlfeld} w-64`} value={art} onChange={(e) => { setArt(e.target.value); setM(null); }}>{vorlagen.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></Feld>
        {projekte.length > 1 && <Feld id="mat-p" label="Projekt"><select id="mat-p" className={`${auswahlfeld} w-48`} value={ref} onChange={(e) => { setRef(e.target.value); setM(null); }}>{projekte.map((p) => <option key={p.ref} value={p.ref}>Nr. {p.nr} – {p.art}</option>)}</select></Feld>}
        <Knopf variante="primary" onClick={laden}>Entwurf anzeigen</Knopf>
        <PdfLink href={`/api/portal/gemeinde/material?${q}&format=pdf`}>PDF</PdfLink>
      </div>
      <Meldung fehler={fehler} />
      {m && (
        <article className="rounded-2xl bg-ink-50 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{m.label} · Entwurf</p>
          <h3 className="mt-1 font-display text-[17px] font-bold text-ink-900">{m.titel}</h3>
          <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-700">{m.absaetze.map((x, i) => <p key={i}>{x}</p>)}</div>
          <p className="mt-3 text-[12.5px] text-ink-500">{m.hinweis}</p>
          <div className="mt-3"><Knopf onClick={kopieren}><Copy className="h-4 w-4" /> {kopiert ? "Kopiert" : "Text kopieren"}</Knopf></div>
        </article>
      )}
    </div>
  );
}

export { Klappe };

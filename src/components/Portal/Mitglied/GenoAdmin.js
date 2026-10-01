"use client";

// Backoffice Genossenschaft (Client-Teile): Stammdaten, Aktionen je Mitglied (Zulassung, Einzahlung, Zeichnung, Kündigung,
// Auszahlung), Übertragungen, Generalversammlung (Anlage, Einladung, Abstimmung, Abschluss mit Auszählung im Saal),
// Ausschüttung (Berechnung, Beschluss, Auszahlung). Alle Regeln prüft das Backend (Bereich „genossenschaft“).

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { GENO_REGISTER, NACHSCHUSS, RECHTSFORM } from "@/lib/plattform/mitglied/genossenschaft";
import { GV_ARTEN, GV_FORMEN, MEHRHEITEN, TAGESORDNUNG_VORLAGE } from "@/lib/plattform/mitglied/versammlung";
import { LAENDER } from "@/lib/plattform/konstanten";
import { Klappe, Knopf, Meldung, useAktion } from "./teile";
import { abfragen, bestaetigen } from "@/components/ui/Rueckfrage";

const URL = "/api/admin/genossenschaft";
const eurDe = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 2 })} €`;
const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");

// ---------------------------------------------------------------- Stammdaten

export function GenoStammdaten({ geno = null }) {
  const id = useId();
  const a = useAktion(URL);
  const [g, setG] = useState({
    name: geno?.name || "", land: geno?.land || "DE", registerStatus: geno?.registerStatus || "aufbau", registerNr: geno?.registerNr || "", registergericht: geno?.registergericht || "", pruefungsverband: geno?.pruefungsverband || "",
    sitz: geno?.sitz || "", vorstand: geno?.vorstand || "", anteilEur: String(geno?.anteilEur ?? "250"), minAnteile: String(geno?.minAnteile ?? "1"), maxAnteile: String(geno?.maxAnteile ?? "100"), eintrittsgeldEur: String(geno?.eintrittsgeldEur ?? "0"),
    einzahlungsfristTage: String(geno?.einzahlungsfristTage ?? "14"), kuendigungsfristMonate: String(geno?.kuendigungsfristMonate ?? "3"), geschaeftsjahrEnde: geno?.geschaeftsjahrEnde || "12-31", nachschusspflicht: geno?.nachschusspflicht || "ausgeschlossen",
    haftsummeEur: String(geno?.haftsummeEur ?? "0"), iban: geno?.iban || "", bic: geno?.bic || "", kontoinhaber: geno?.kontoinhaber || "", satzungStand: geno?.satzungStand || "", onlineGv: !!geno?.onlineGv, einladungsfristTage: geno?.einladungsfristTage ? String(geno.einladungsfristTage) : "", info: geno?.info || "",
  });
  const s = (k) => (e) => setG({ ...g, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const f = (k, label, props = {}) => (
    <Feld id={`${id}-${k}`} label={label} className={props.breit ? "sm:col-span-2" : ""}>
      <input id={`${id}-${k}`} className={eingabe} value={g[k]} onChange={s(k)} {...(props.typ ? { type: props.typ } : {})} />
    </Feld>
  );
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "genoSpeichern", id: geno?.id || null, daten: g }, "Stammdaten gespeichert."); }}>
      <div className="grid gap-3 sm:grid-cols-4">
        {f("name", "Name", { breit: true })}
        <Feld id={`${id}-la`} label="Land / Rechtsform">
          <select id={`${id}-la`} className={auswahlfeld} value={g.land} onChange={s("land")}>{Object.keys(RECHTSFORM).map((k) => <option key={k} value={k}>{LAENDER[k]} ({RECHTSFORM[k]})</option>)}</select>
        </Feld>
        <Feld id={`${id}-rs`} label="Registerstatus">
          <select id={`${id}-rs`} className={auswahlfeld} value={g.registerStatus} onChange={s("registerStatus")}>{Object.entries(GENO_REGISTER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        </Feld>
        {f("registerNr", "Registernummer")}
        {f("registergericht", "Registergericht")}
        {f("pruefungsverband", g.land === "CH" ? "Revisionsstelle" : g.land === "AT" ? "Revisionsverband" : "Prüfungsverband", { breit: true })}
        {f("sitz", "Sitz")}
        {f("vorstand", "Vorstand")}
        {f("anteilEur", "Geschäftsanteil (€)")}
        {f("minAnteile", "Pflichtanteile")}
        {f("maxAnteile", "Höchstanteile")}
        {f("eintrittsgeldEur", "Eintrittsgeld (€)")}
        {f("einzahlungsfristTage", "Einzahlungsfrist (Tage)")}
        {f("kuendigungsfristMonate", "Kündigungsfrist (Monate)")}
        {f("geschaeftsjahrEnde", "Geschäftsjahresende (MM-TT)")}
        <Feld id={`${id}-ns`} label="Nachschusspflicht">
          <select id={`${id}-ns`} className={auswahlfeld} value={g.nachschusspflicht} onChange={s("nachschusspflicht")}>{Object.entries(NACHSCHUSS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Feld>
        {g.nachschusspflicht === "beschraenkt" && f("haftsummeEur", "Haftsumme je Anteil (€)")}
        {f("iban", "IBAN der Genossenschaft", { breit: true })}
        {f("bic", "BIC")}
        {f("kontoinhaber", "Kontoinhaber")}
        {f("satzungStand", "Satzung Stand", { typ: "date" })}
        {f("einladungsfristTage", "Einladungsfrist GV (Tage, laut Satzung)")}
        <label className="flex items-center gap-2 text-[13.5px] text-ink-700 sm:col-span-2 sm:pt-7">
          <input type="checkbox" checked={g.onlineGv} onChange={s("onlineGv")} className="h-4 w-4 accent-[#558227]" /> Online-Versammlung und elektronische Abstimmung laut Satzung zulässig
        </label>
        <Feld id={`${id}-info`} label="Information für Interessenten" className="sm:col-span-4">
          <textarea id={`${id}-info`} rows={3} className={textbereich} value={g.info} onChange={s("info")} />
        </Feld>
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>{geno ? "Stammdaten speichern" : "Genossenschaft anlegen"}</Knopf>
    </form>
  );
}

// ---------------------------------------------------------------- Mitglied

export function MitgliedAktionen({ m, heute }) {
  const a = useAktion(URL);
  const [unterschrift, setUnterschrift] = useState(false);
  const [e, setE] = useState({ betragEur: String(m.kennzahlen.offenEur || ""), am: heute, referenz: "" });
  const los = (mitgliedAktion, rest = {}, text = "Erledigt.") => a.ausfuehren({ aktion: "mitglied", id: m.id, mitgliedAktion, ...rest }, text);
  const grund = async (optionen) => (await abfragen(optionen)) || "";
  const kOffen = m.kuendigungen.filter((k) => ["eingereicht", "bestaetigt", "wirksam"].includes(k.status));
  const zOffen = m.zeichnungen.filter((z) => z.status === "beantragt");
  return (
    <div className="flex flex-col gap-2">
      {m.status === "erklaert" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" checked={unterschrift} onChange={(x) => setUnterschrift(x.target.checked)} className="h-4 w-4 accent-[#558227]" /> Unterschrift liegt vor</label>
          <Knopf variante="primary" disabled={a.laeuft || !unterschrift} onClick={() => los("zulassen", { unterschrift }, "Beitritt zugelassen – Mitglied benachrichtigt.")}>Zulassen</Knopf>
          <Knopf variante="gefahr" disabled={a.laeuft} onClick={async () => { const g = await grund({ titel: "Beitritt ablehnen?", text: "Das Mitglied wird benachrichtigt und sieht die Begründung.", label: "Begründung für das Mitglied", pflicht: true, mindestlaenge: 5, maxlaenge: 300, mehrzeilig: true, gefahr: true, bestaetigenText: "Beitritt ablehnen" }); if (g) los("ablehnen", { grund: g }, "Beitritt abgelehnt."); }}>Ablehnen</Knopf>
        </div>
      )}
      {["zugelassen", "aktiv"].includes(m.status) && m.kennzahlen.offenEur > 0 && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(x) => { x.preventDefault(); los("einzahlung", { betragEur: e.betragEur, am: e.am, referenz: e.referenz }, "Einzahlung gebucht."); }}>
          <input aria-label="Betrag" inputMode="decimal" className={`${eingabe} h-9 w-28`} value={e.betragEur} onChange={(x) => setE({ ...e, betragEur: x.target.value })} />
          <input aria-label="Eingang am" type="date" className={`${eingabe} h-9 w-40`} value={e.am} onChange={(x) => setE({ ...e, am: x.target.value })} />
          <input aria-label="Referenz" placeholder="Referenz" className={`${eingabe} h-9 w-36`} value={e.referenz} onChange={(x) => setE({ ...e, referenz: x.target.value })} />
          <Knopf variante="primary" type="submit" disabled={a.laeuft}>Einzahlung buchen</Knopf>
        </form>
      )}
      {zOffen.map((z) => (
        <div key={z.id} className="flex flex-wrap items-center gap-2 text-[13px] text-ink-700">
          Zeichnung {z.anteile} Anteile:
          <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("zeichnungZulassen", { zeichnungId: z.id }, "Zeichnung zugelassen.")}>Zulassen</Knopf>
          <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => los("zeichnungAblehnen", { zeichnungId: z.id }, "Zeichnung abgelehnt.")}>Ablehnen</Knopf>
        </div>
      ))}
      {kOffen.map((k) => (
        <div key={k.id} className="flex flex-wrap items-center gap-2 text-[13px] text-ink-700">
          Kündigung {k.art === "voll" ? "gesamt" : `${k.anteile} Anteile`} zum {datumDe(k.wirksamZum)}:
          {k.status === "eingereicht" && <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("kuendigungBestaetigen", { kuendigungId: k.id }, "Kündigung bestätigt.")}>Bestätigen</Knopf>}
          {k.status === "bestaetigt" && <Knopf disabled={a.laeuft || heute < k.wirksamZum} title={heute < k.wirksamZum ? `wirksam erst zum ${datumDe(k.wirksamZum)}` : ""} onClick={() => los("kuendigungVollziehen", { kuendigungId: k.id }, "Kündigung vollzogen.")}>Vollziehen</Knopf>}
          {k.status === "wirksam" && <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("auszahlung", { kuendigungId: k.id, am: heute }, "Auszahlung gebucht.")}>Auszahlung {eurDe(k.betragEur)} buchen</Knopf>}
        </div>
      ))}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

export function UebertragungAktionen({ u }) {
  const a = useAktion(URL);
  if (u.status !== "angenommen") return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Knopf variante="primary" disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "mitglied", id: u.id, mitgliedAktion: "uebertragungGenehmigen", uebertragungId: u.id }, "Übertragung durchgeführt.")}>Zustimmen</Knopf>
      <Knopf variante="gefahr" disabled={a.laeuft} onClick={async () => a.ausfuehren({ aktion: "mitglied", id: u.id, mitgliedAktion: "uebertragungAblehnen", uebertragungId: u.id, grund: (await abfragen({ titel: "Übertragung ablehnen?", label: "Begründung (optional)", mehrzeilig: true, gefahr: true, bestaetigenText: "Übertragung ablehnen" })) || "" }, "Übertragung abgelehnt.")}>Ablehnen</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </span>
  );
}

// ---------------------------------------------------------------- Generalversammlung

export function GvFormular({ genoId, gv = null }) {
  const id = useId();
  const a = useAktion(URL);
  const [g, setG] = useState({
    titel: gv?.titel || "", art: gv?.art || "ordentlich", form: gv?.form || "praesenz", datum: gv?.datum || "", ort: gv?.ort || "", zugang: gv?.zugang || "", abstimmungBis: gv?.abstimmungBis || "", einleitung: gv?.einleitung || "",
    tagesordnung: gv?.tagesordnung?.length ? gv.tagesordnung.map((t) => ({ ...t })) : TAGESORDNUNG_VORLAGE.map((t) => ({ ...t, text: "", satzung: false })),
    unterlagen: gv?.unterlagen?.map((u) => ({ ...u })) || [],
  });
  const s = (k) => (e) => setG({ ...g, [k]: e.target.value });
  const top = (i, k, v) => setG({ ...g, tagesordnung: g.tagesordnung.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  const unt = (i, k, v) => setG({ ...g, unterlagen: g.unterlagen.map((t, j) => (j === i ? { ...t, [k]: v } : t)) });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "gvSpeichern", id: gv?.id || null, genoId, daten: g }, "Versammlung gespeichert."); }}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Feld id={`${id}-t`} label="Titel" className="sm:col-span-2"><input id={`${id}-t`} className={eingabe} value={g.titel} onChange={s("titel")} /></Feld>
        <Feld id={`${id}-a`} label="Art"><select id={`${id}-a`} className={auswahlfeld} value={g.art} onChange={s("art")}>{Object.entries(GV_ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
        <Feld id={`${id}-f`} label="Form"><select id={`${id}-f`} className={auswahlfeld} value={g.form} onChange={s("form")}>{Object.entries(GV_FORMEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
        <Feld id={`${id}-d`} label="Beginn"><input id={`${id}-d`} type="datetime-local" className={eingabe} value={g.datum} onChange={s("datum")} /></Feld>
        <Feld id={`${id}-o`} label="Ort"><input id={`${id}-o`} className={eingabe} value={g.ort} onChange={s("ort")} /></Feld>
        <Feld id={`${id}-z`} label="Online-Zugang (Hinweis)"><input id={`${id}-z`} className={eingabe} value={g.zugang} onChange={s("zugang")} /></Feld>
        <Feld id={`${id}-b`} label="Online-Abstimmung bis"><input id={`${id}-b`} type="datetime-local" className={eingabe} value={g.abstimmungBis} onChange={s("abstimmungBis")} /></Feld>
        <Feld id={`${id}-e`} label="Einleitung" className="sm:col-span-4"><textarea id={`${id}-e`} rows={2} className={textbereich} value={g.einleitung} onChange={s("einleitung")} /></Feld>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-[13.5px] font-semibold text-ink-700">Tagesordnung</legend>
        {g.tagesordnung.map((t, i) => (
          <div key={i} className="grid gap-2 rounded-2xl p-3 ring-1 ring-inset ring-ink-200/80 sm:grid-cols-[1fr_auto_auto_auto_auto]">
            <input aria-label={`TOP ${i + 1}`} className={eingabe} value={t.titel} onChange={(e) => top(i, "titel", e.target.value)} />
            <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={!!t.beschluss} onChange={(e) => top(i, "beschluss", e.target.checked)} className="h-4 w-4 accent-[#558227]" /> Beschluss</label>
            <select aria-label="Mehrheit" className={`${auswahlfeld} h-10`} disabled={!t.beschluss} value={t.mehrheit || "einfach"} onChange={(e) => top(i, "mehrheit", e.target.value)}>{Object.entries(MEHRHEITEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
            <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" disabled={!t.beschluss} checked={!!t.satzung} onChange={(e) => top(i, "satzung", e.target.checked)} className="h-4 w-4 accent-[#558227]" /> Satzung</label>
            <button type="button" aria-label="TOP entfernen" className="text-ink-500 hover:text-red-700" onClick={() => setG({ ...g, tagesordnung: g.tagesordnung.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
            <textarea aria-label="Erläuterung" rows={1} placeholder="Erläuterung / Beschlussvorschlag" className={`${textbereich} min-h-[44px] sm:col-span-5`} value={t.text || ""} onChange={(e) => top(i, "text", e.target.value)} />
          </div>
        ))}
        <Knopf onClick={() => setG({ ...g, tagesordnung: [...g.tagesordnung, { titel: "", text: "", beschluss: true, mehrheit: "einfach", satzung: false }] })}><Plus className="h-4 w-4" /> Punkt hinzufügen</Knopf>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-[13.5px] font-semibold text-ink-700">Unterlagen</legend>
        {g.unterlagen.map((u, i) => (
          <div key={i} className="grid gap-2 rounded-2xl p-3 ring-1 ring-inset ring-ink-200/80">
            <div className="flex gap-2"><input aria-label="Titel der Unterlage" className={eingabe} value={u.titel} onChange={(e) => unt(i, "titel", e.target.value)} /><button type="button" aria-label="Unterlage entfernen" className="text-ink-500 hover:text-red-700" onClick={() => setG({ ...g, unterlagen: g.unterlagen.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button></div>
            <textarea aria-label="Inhalt" rows={3} className={textbereich} value={u.text} onChange={(e) => unt(i, "text", e.target.value)} />
          </div>
        ))}
        <Knopf onClick={() => setG({ ...g, unterlagen: [...g.unterlagen, { titel: "", text: "" }] })}><Plus className="h-4 w-4" /> Unterlage hinzufügen</Knopf>
      </fieldset>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>{gv ? "Änderungen speichern" : "Versammlung anlegen"}</Knopf>
    </form>
  );
}

export function GvAktionen({ gv }) {
  const id = useId();
  const a = useAktion(URL);
  const saal = ["praesenz", "hybrid"].includes(gv.form);
  const [x, setX] = useState({ versammlungsleiter: "", protokollfuehrer: "", anwesend: "0", notiz: "", tops: {} });
  const los = (gvAktion, rest = {}, text) => a.ausfuehren({ aktion: "gv", id: gv.id, gvAktion, ...rest }, text);
  const topWert = (t, k, v) => setX({ ...x, tops: { ...x.tops, [t]: { ...(x.tops[t] || {}), [k]: v } } });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {gv.status === "entwurf" && <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("einladen", {}, "Eingeladen – alle Mitglieder wurden benachrichtigt.")}>Einladen</Knopf>}
        {gv.status === "eingeladen" && gv.form !== "praesenz" && <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("oeffnen", {}, "Online-Abstimmung geöffnet.")}>Online-Abstimmung öffnen</Knopf>}
        {!["abgeschlossen", "abgesagt"].includes(gv.status) && <Knopf variante="gefahr" disabled={a.laeuft} onClick={async () => { const g = await abfragen({ titel: "Versammlung absagen?", text: "Eingeladene Mitglieder werden über die Absage informiert.", details: [{ label: "Versammlung", wert: gv.titel }], label: "Grund der Absage", pflicht: true, mindestlaenge: 5, maxlaenge: 300, mehrzeilig: true, gefahr: true, bestaetigenText: "Versammlung absagen" }); if (g) los("absagen", { grund: g }, "Abgesagt."); }}>Absagen</Knopf>}
      </div>
      {["eingeladen", "abstimmung"].includes(gv.status) && (
        <Klappe titel="Versammlung abschließen und Protokoll erstellen">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); if (await bestaetigen({ titel: "Versammlung abschließen?", text: "Danach sind keine Stimmen mehr möglich; Protokoll und Ergebnis gehen an die Mitglieder.", details: [{ label: "Versammlung", wert: gv.titel }], bestaetigenText: "Versammlung abschließen", gefahr: true })) los("abschliessen", x, "Abgeschlossen – Protokoll erstellt, Mitglieder benachrichtigt."); }}>
            <Feld id={`${id}-vl`} label="Versammlungsleitung"><input id={`${id}-vl`} className={eingabe} value={x.versammlungsleiter} onChange={(e) => setX({ ...x, versammlungsleiter: e.target.value })} /></Feld>
            <Feld id={`${id}-pf`} label="Protokollführung"><input id={`${id}-pf`} className={eingabe} value={x.protokollfuehrer} onChange={(e) => setX({ ...x, protokollfuehrer: e.target.value })} /></Feld>
            {saal && (
              <>
                <Feld id={`${id}-an`} label="Im Saal anwesende Mitglieder (ohne Online-Stimmen)"><input id={`${id}-an`} inputMode="numeric" className={eingabe} value={x.anwesend} onChange={(e) => setX({ ...x, anwesend: e.target.value })} /></Feld>
                <div className="sm:col-span-2 space-y-2">
                  <p className="text-[13px] font-semibold text-ink-700">Auszählung im Saal</p>
                  {gv.tagesordnung.filter((t) => t.beschluss).map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="min-w-0 flex-1">{t.titel}</span>
                      {["ja", "nein", "enthaltung"].map((k) => <input key={k} aria-label={`${t.titel}: ${k}`} placeholder={k} inputMode="numeric" className={`${eingabe} h-9 w-20`} value={x.tops[t.id]?.[k] || ""} onChange={(e) => topWert(t.id, k, e.target.value)} />)}
                    </div>
                  ))}
                </div>
              </>
            )}
            <Feld id={`${id}-no`} label="Weitere Feststellungen" className="sm:col-span-2"><textarea id={`${id}-no`} rows={2} className={textbereich} value={x.notiz} onChange={(e) => setX({ ...x, notiz: e.target.value })} /></Feld>
            <div className="sm:col-span-2"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Abschließen</Knopf></div>
          </form>
        </Klappe>
      )}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

// ---------------------------------------------------------------- Ausschüttung

export function AusschuettungFormular({ genoId, jahr }) {
  const id = useId();
  const a = useAktion(URL);
  const [x, setX] = useState({ art: "dividende", geschaeftsjahr: String(jahr), satzPct: "2", ctProKwh: "1", stichtag: "" });
  return (
    <form className="grid gap-3 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "ausschuettungAnlegen", genoId, daten: x }, "Vorschlag berechnet – bitte nach dem GV-Beschluss als beschlossen markieren."); }}>
      <Feld id={`${id}-a`} label="Art"><select id={`${id}-a`} className={auswahlfeld} value={x.art} onChange={(e) => setX({ ...x, art: e.target.value })}><option value="dividende">Dividende</option><option value="rueckverguetung">Rückvergütung</option></select></Feld>
      <Feld id={`${id}-j`} label="Geschäftsjahr"><input id={`${id}-j`} inputMode="numeric" className={eingabe} value={x.geschaeftsjahr} onChange={(e) => setX({ ...x, geschaeftsjahr: e.target.value })} /></Feld>
      {x.art === "dividende" ? (
        <Feld id={`${id}-s`} label="Satz in %"><input id={`${id}-s`} inputMode="decimal" className={eingabe} value={x.satzPct} onChange={(e) => setX({ ...x, satzPct: e.target.value })} /></Feld>
      ) : (
        <Feld id={`${id}-c`} label="ct je kWh"><input id={`${id}-c`} inputMode="decimal" className={eingabe} value={x.ctProKwh} onChange={(e) => setX({ ...x, ctProKwh: e.target.value })} /></Feld>
      )}
      <Feld id={`${id}-st`} label="Stichtag"><input id={`${id}-st`} type="date" className={eingabe} value={x.stichtag} onChange={(e) => setX({ ...x, stichtag: e.target.value })} /></Feld>
      <div className="sm:pt-7"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Berechnen</Knopf></div>
      <div className="sm:col-span-5"><Meldung fehler={a.fehler} ok={a.ok} /></div>
    </form>
  );
}

export function AusschuettungAktionen({ au, versammlungen = [], heute }) {
  const a = useAktion(URL);
  const [bd, setBd] = useState(heute);
  const [gvId, setGvId] = useState(versammlungen[0]?.id || "");
  const los = (ausschuettungAktion, rest = {}, text) => a.ausfuehren({ aktion: "ausschuettung", id: au.id, ausschuettungAktion, ...rest }, text);
  return (
    <div className="flex flex-col gap-2">
      {au.status === "entwurf" && (
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Beschlussdatum" type="date" className={`${eingabe} h-9 w-40`} value={bd} onChange={(e) => setBd(e.target.value)} />
          <select aria-label="Versammlung" className={`${auswahlfeld} h-9 w-56`} value={gvId} onChange={(e) => setGvId(e.target.value)}>
            <option value="">ohne Verknüpfung</option>
            {versammlungen.map((v) => <option key={v.id} value={v.id}>{v.titel}</option>)}
          </select>
          <Knopf variante="primary" disabled={a.laeuft} onClick={() => los("beschliessen", { beschlussDatum: bd, gvId }, "Als beschlossen markiert.")}>Beschluss erfassen</Knopf>
          <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => los("verwerfen", {}, "Entwurf verworfen.")}>Verwerfen</Knopf>
        </div>
      )}
      {au.status === "beschlossen" && <Knopf variante="primary" disabled={a.laeuft} onClick={async () => (await bestaetigen({ titel: "Auszahlung buchen?", text: "Die Auszahlung wird gebucht und die Mitglieder werden benachrichtigt.", details: [{ label: "Betrag netto", wert: eurDe(au.summe.nettoEur) }], bestaetigenText: "Auszahlung buchen", gefahr: true })) && los("auszahlen", { am: heute }, "Auszahlung gebucht – Mitglieder benachrichtigt.")}>Auszahlung buchen</Knopf>}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

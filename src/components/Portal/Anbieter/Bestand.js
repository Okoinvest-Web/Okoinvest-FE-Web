"use client";

// Bestandsanlage: Ertragshistorie (CSV-Import, Kennzahlen je Jahr), Verträge (Laufzeit, Übertragbarkeit),
// Förderung/Vermarktung (EEG/EAG/KEV, Register, Förderende) und technische Due-Diligence-Checkliste.
// Anbieter bearbeitet, Backoffice und Investoren mit freigegebenem Datenraum lesen.

import { useMemo, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Kennzahl, QualitaetsBalken, Tabelle, zelle } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { BESTAND_DD, DD_STATUS, REGISTER_LABEL, UEBERTRAGBAR, VERMARKTUNG, VERTRAG_ARTEN } from "@/lib/plattform/anbieter/bestand.js";
import { HinweisListe, knopfPrimaer, knopfSekundaer, pct, tag, useAnbieterAktion } from "./gemeinsam";

const zahlDe = (x, st = 0) => (x === null || x === undefined ? "–" : Number(x).toLocaleString("de-DE", { maximumFractionDigits: st }));

function Kennzahlen({ aw }) {
  const g = aw.ertrag.gesamt;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kennzahl label="Erfasste Monate" wert={g ? zahlDe(g.monate) : "0"} hinweis={g ? `${g.von} bis ${g.bis}` : "noch keine Daten"} />
      <Kennzahl label="Spez. Ertrag (volle Jahre)" wert={g?.spezErtragVollJahr ? `${zahlDe(g.spezErtragVollJahr)}` : "–"} hinweis="kWh/kWp und Jahr" />
      <Kennzahl label="Ist / Prognose" wert={pct(g?.istZuPrognose)} hinweis={g?.pr ? `Performance Ratio ${pct(g.pr)}` : "PR mit Einstrahlung"} />
      <Kennzahl label="Verfügbarkeit Ø" wert={g?.verfuegbarkeitPct != null ? `${zahlDe(g.verfuegbarkeitPct, 1)} %` : "–"} hinweis={aw.ertrag.rueckgangPctJahr != null ? `Rückgang ${zahlDe(aw.ertrag.rueckgangPctJahr, 1)} %/Jahr` : "Rückgang ab 3 vollen Jahren"} />
    </div>
  );
}

function Jahre({ jahre }) {
  if (!jahre.length) return null;
  return (
    <Tabelle kopf={["Jahr", "Monate", "Ertrag (MWh)", "kWh/kWp", "Ist/Prognose", "PR", "Verfügbarkeit"]}>
      {jahre.map((j) => (
        <tr key={j.jahr} className="border-t border-ink-100">
          <td className={zelle}>{j.jahr}</td>
          <td className={zelle}>{j.monate}{j.voll ? "" : " (Teiljahr)"}</td>
          <td className={`${zelle} ov-num`}>{zahlDe(j.ertragKwh / 1000, 1)}</td>
          <td className={`${zelle} ov-num`}>{zahlDe(j.spezErtrag)}</td>
          <td className={`${zelle} ov-num`}>{pct(j.istZuPrognose)}</td>
          <td className={`${zelle} ov-num`}>{pct(j.pr)}</td>
          <td className={`${zelle} ov-num`}>{j.verfuegbarkeitPct != null ? `${zahlDe(j.verfuegbarkeitPct, 1)} %` : "–"}</td>
        </tr>
      ))}
    </Tabelle>
  );
}

function Import({ akte, setAkte }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte);
  const [csv, setCsv] = useState("");
  const [ersetzen, setErsetzen] = useState(false);
  async function datei(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 200 * 1024) return a.setFehler("Die Datei ist zu groß (höchstens 200 KB).");
    setCsv(await f.text());
  }
  return (
    <form className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70" onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "ertrag_import", csv, ersetzen }, (x) => `Ertragshistorie übernommen (${x?.bestand?.auswertung?.ertrag?.gesamt?.monate || 0} Monate gespeichert).`); }}>
      <p className="font-display text-[15px] font-bold text-ink-900">Ertragshistorie importieren</p>
      <p className="text-[13px] leading-relaxed text-ink-600">Je Zeile ein Monat: <code className="rounded bg-white px-1">Monat; Ertrag kWh; Prognose kWh; Einstrahlung kWh/m²; Verfügbarkeit %</code> – z. B. <code className="rounded bg-white px-1">2025-06; 152.340,5; 149.000; 181,2; 99,4</code>. Nur Monat und Ertrag sind Pflicht. Export aus dem Monitoring (CSV) oder Excel (Semikolon) funktioniert direkt.</p>
      <label className={`${knopfSekundaer} cursor-pointer`}><Upload aria-hidden="true" className="h-4 w-4" /> CSV-Datei wählen<input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={datei} /></label>
      <label htmlFor="ertrag-csv" className="sr-only">Monatswerte</label>
      <textarea id="ertrag-csv" className={`${textbereich} font-mono text-[13px]`} value={csv} onChange={(e) => setCsv(e.target.value)} maxLength={200000} placeholder="Monat;Ertrag kWh;Prognose kWh;Einstrahlung kWh/m²;Verfügbarkeit %" />
      <label className="flex items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={ersetzen} onChange={(e) => setErsetzen(e.target.checked)} /> Vorhandene Werte vollständig ersetzen (sonst ergänzen/überschreiben je Monat)</label>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <button type="submit" className={knopfPrimaer} disabled={a.laeuft || csv.trim().length < 8}>Übernehmen</button>
    </form>
  );
}

const leerVertrag = () => ({ art: "om", partner: "", beginn: "", ende: "", kuendigungsfristMonate: "", kostenJahr: "", uebertragbar: "unklar", changeOfControl: false, dokumentId: "", bemerkung: "" });

function Vertraege({ akte, setAkte, schreiben }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte);
  const [liste, setListe] = useState(() => (akte.bestand.daten.vertraege || []).map((v) => ({ ...leerVertrag(), ...v, kuendigungsfristMonate: v.kuendigungsfristMonate ?? "", kostenJahr: v.kostenJahr ?? "", dokumentId: v.dokumentId || "" })));
  const setze = (i, k, w) => setListe((l) => l.map((x, j) => (j === i ? { ...x, [k]: w } : x)));
  if (!schreiben) {
    const vs = akte.bestand.daten.vertraege || [];
    if (!vs.length) return <p className="text-[14px] text-ink-500">Keine Verträge erfasst.</p>;
    return (
      <Tabelle kopf={["Vertrag", "Partner", "Laufzeit", "Kündigungsfrist", "Kosten p. a.", "Übertragbarkeit"]}>
        {vs.map((v) => (
          <tr key={v.id} className="border-t border-ink-100">
            <td className={zelle}>{VERTRAG_ARTEN[v.art]}</td>
            <td className={zelle}>{v.partner || "–"}</td>
            <td className={zelle}>{[tag(v.beginn), tag(v.ende)].filter(Boolean).join(" – ") || "–"}</td>
            <td className={zelle}>{v.kuendigungsfristMonate != null ? `${v.kuendigungsfristMonate} Mon.` : "–"}</td>
            <td className={`${zelle} ov-num`}>{v.kostenJahr != null ? `${zahlDe(v.kostenJahr)} €` : "–"}</td>
            <td className={zelle}>{UEBERTRAGBAR[v.uebertragbar]}{v.changeOfControl ? " · Change of Control" : ""}</td>
          </tr>
        ))}
      </Tabelle>
    );
  }
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "bestand_speichern", bestand: { vertraege: liste } }, "Verträge gespeichert."); }}>
      {liste.map((v, i) => (
        <fieldset key={v.id || `neu-${i}`} className="grid gap-3 rounded-2xl p-4 ring-1 ring-inset ring-ink-200/70 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="sr-only">Vertrag {i + 1}</legend>
          <Feld id={`va-${i}`} label="Vertragsart"><select id={`va-${i}`} className={auswahlfeld} value={v.art} onChange={(e) => setze(i, "art", e.target.value)}>{Object.entries(VERTRAG_ARTEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
          <Feld id={`vp-${i}`} label="Vertragspartner" hinweis="Sichtbar für Investoren mit Datenraum"><input id={`vp-${i}`} className={eingabe} value={v.partner} onChange={(e) => setze(i, "partner", e.target.value)} maxLength={120} /></Feld>
          <Feld id={`vu-${i}`} label="Übertragbarkeit"><select id={`vu-${i}`} className={auswahlfeld} value={v.uebertragbar} onChange={(e) => setze(i, "uebertragbar", e.target.value)}>{Object.entries(UEBERTRAGBAR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
          <Feld id={`vb-${i}`} label="Beginn"><input id={`vb-${i}`} type="date" className={eingabe} value={v.beginn} onChange={(e) => setze(i, "beginn", e.target.value)} /></Feld>
          <Feld id={`ve-${i}`} label="Ende"><input id={`ve-${i}`} type="date" className={eingabe} value={v.ende} onChange={(e) => setze(i, "ende", e.target.value)} /></Feld>
          <Feld id={`vk-${i}`} label="Kündigungsfrist (Monate)"><input id={`vk-${i}`} type="number" min={0} max={120} className={eingabe} value={v.kuendigungsfristMonate} onChange={(e) => setze(i, "kuendigungsfristMonate", e.target.value)} /></Feld>
          <Feld id={`vc-${i}`} label="Kosten bzw. Entgelt pro Jahr (€)"><input id={`vc-${i}`} inputMode="numeric" className={eingabe} value={v.kostenJahr} onChange={(e) => setze(i, "kostenJahr", e.target.value)} /></Feld>
          <Feld id={`vd-${i}`} label="Dokument im Datenraum"><select id={`vd-${i}`} className={auswahlfeld} value={v.dokumentId} onChange={(e) => setze(i, "dokumentId", e.target.value)}><option value="">– keines –</option>{(akte.dokumente || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Feld>
          <div className="flex items-end gap-3">
            <label className="flex h-12 items-center gap-2 text-[14px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!v.changeOfControl} onChange={(e) => setze(i, "changeOfControl", e.target.checked)} /> Change-of-Control-Klausel</label>
            <button type="button" className={knopfSekundaer} onClick={() => setListe((l) => l.filter((_, j) => j !== i))} aria-label={`Vertrag ${i + 1} entfernen`}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={knopfSekundaer} onClick={() => setListe((l) => [...l, leerVertrag()])} disabled={liste.length >= 30}><Plus aria-hidden="true" className="h-4 w-4" /> Vertrag hinzufügen</button>
        <button type="submit" className={knopfPrimaer} disabled={a.laeuft}>Verträge speichern</button>
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

function Foerderung({ akte, setAkte, schreiben }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte);
  const f0 = akte.bestand.daten.foerderung || {};
  const [f, setF] = useState({ inbetriebnahme: "", register: "", vermarktung: "", anzulegenderWertCt: "", zuschlagNr: "", direktvermarkter: "", foerderEndeManuell: "", redispatch: "", bemerkung: "", ...f0, anzulegenderWertCt: f0.anzulegenderWertCt ?? "" });
  const setze = (k, w) => setF((x) => ({ ...x, [k]: w }));
  const land = akte.projekt.land || "DE";
  const fe = akte.bestand.auswertung.foerderEnde;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "bestand_speichern", bestand: { foerderung: f } }, "Förderung & Vermarktung gespeichert."); }}>
      <fieldset disabled={!schreiben} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="sr-only">Förderung und Vermarktung</legend>
        <Feld id="f-ibn" label="Inbetriebnahme"><input id="f-ibn" type="date" className={eingabe} value={f.inbetriebnahme} onChange={(e) => setze("inbetriebnahme", e.target.value)} /></Feld>
        <Feld id="f-reg" label={REGISTER_LABEL[land] || REGISTER_LABEL.DE}><input id="f-reg" className={eingabe} value={f.register} onChange={(e) => setze("register", e.target.value)} maxLength={40} /></Feld>
        <Feld id="f-verm" label="Vermarktung"><select id="f-verm" className={auswahlfeld} value={f.vermarktung} onChange={(e) => setze("vermarktung", e.target.value)}><option value="">– bitte wählen –</option>{Object.entries(VERMARKTUNG).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
        <Feld id="f-aw" label={land === "DE" ? "Anzulegender Wert (ct/kWh)" : "Vergütung / Marktprämie (ct/kWh bzw. Rp./kWh)"}><input id="f-aw" inputMode="decimal" className={eingabe} value={f.anzulegenderWertCt} onChange={(e) => setze("anzulegenderWertCt", e.target.value)} /></Feld>
        <Feld id="f-zs" label="Zuschlag / Förderbescheid (Nr.)"><input id="f-zs" className={eingabe} value={f.zuschlagNr} onChange={(e) => setze("zuschlagNr", e.target.value)} maxLength={60} /></Feld>
        <Feld id="f-dv" label="Direktvermarkter / Abnehmer"><input id="f-dv" className={eingabe} value={f.direktvermarkter} onChange={(e) => setze("direktvermarkter", e.target.value)} maxLength={120} /></Feld>
        <Feld id="f-fe" label="Förderende (falls abweichend)" hinweis={fe?.datum ? `Aktuell: ${tag(fe.datum)} – ${fe.quelle}` : fe?.quelle || ""}><input id="f-fe" type="date" className={eingabe} value={f.foerderEndeManuell} onChange={(e) => setze("foerderEndeManuell", e.target.value)} /></Feld>
        {land === "DE" && <Feld id="f-rd" label="Redispatch 2.0 umgesetzt"><select id="f-rd" className={auswahlfeld} value={f.redispatch} onChange={(e) => setze("redispatch", e.target.value)}><option value="">– offen –</option><option value="ja">ja</option><option value="nein">nein</option><option value="nz">nicht zutreffend (&lt; 100 kW)</option></select></Feld>}
        <Feld id="f-bem" label="Bemerkung" className="sm:col-span-2 lg:col-span-3"><textarea id="f-bem" className={textbereich} value={f.bemerkung} onChange={(e) => setze("bemerkung", e.target.value)} maxLength={600} /></Feld>
      </fieldset>
      <HinweisListe hinweise={akte.bestand.auswertung.foerderHinweise} />
      {schreiben && <button type="submit" className={knopfPrimaer} disabled={a.laeuft}>Speichern</button>}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

function Dd({ akte, setAkte, schreiben }) {
  const a = useAnbieterAktion(akte.projekt.id, setAkte);
  const [dd, setDd] = useState(() => ({ ...(akte.bestand.daten.dd || {}) }));
  const setze = (id, k, w) => setDd((x) => ({ ...x, [id]: { ...(x[id] || {}), [k]: w } }));
  const stand = akte.bestand.auswertung.dd;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.los({ aktion: "bestand_speichern", bestand: { dd } }, "Checkliste gespeichert."); }}>
      <QualitaetsBalken quote={stand.quote} label={`Technische DD – ${stand.erfuellt} von ${stand.gesamt} Punkten`} />
      <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-inset ring-ink-200/70">
        {BESTAND_DD.map((p) => (
          <li key={p.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem] md:items-center">
            <span className="text-[14px] text-ink-800">{p.label}{p.pflicht && <span className="text-ink-500"> · Pflicht</span>}</span>
            <select aria-label={`Status: ${p.label}`} className={auswahlfeld} disabled={!schreiben} value={dd[p.id]?.status || ""} onChange={(e) => setze(p.id, "status", e.target.value)}>
              <option value="">– offen –</option>
              {Object.entries(DD_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select aria-label={`Dokument: ${p.label}`} className={auswahlfeld} disabled={!schreiben} value={dd[p.id]?.dokumentId || ""} onChange={(e) => setze(p.id, "dokumentId", e.target.value)}>
              <option value="">– kein Dokument –</option>
              {(akte.dokumente || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {schreiben && <button type="submit" className={knopfPrimaer} disabled={a.laeuft}>Checkliste speichern</button>}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

export default function Bestand({ akte, setAkte }) {
  const schreiben = akte.rolle === "anbieter" && akte.rechte?.schreiben && akte.projekt.status !== "verkauft";
  const aw = akte.bestand.auswertung;
  const hinweise = useMemo(() => [...aw.ertrag.hinweise, ...aw.vertraegeHinweise], [aw]);
  return (
    <div className="space-y-6">
      <Kennzahlen aw={aw} />
      <Jahre jahre={aw.ertrag.jahre} />
      <HinweisListe hinweise={hinweise} />
      {schreiben && <Import akte={akte} setAkte={setAkte} />}
      <section aria-labelledby="bestand-vertraege">
        <h3 id="bestand-vertraege" className="mb-3 font-display text-[16px] font-bold text-ink-900">Verträge</h3>
        <Vertraege key={akte.bestand.daten.geaendertAm || "v"} akte={akte} setAkte={setAkte} schreiben={schreiben} />
      </section>
      <section aria-labelledby="bestand-foerderung">
        <h3 id="bestand-foerderung" className="mb-3 font-display text-[16px] font-bold text-ink-900">Förderung & Vermarktung</h3>
        <Foerderung akte={akte} setAkte={setAkte} schreiben={schreiben} />
      </section>
      <section aria-labelledby="bestand-dd">
        <h3 id="bestand-dd" className="mb-3 font-display text-[16px] font-bold text-ink-900">Technische Due Diligence</h3>
        <Dd akte={akte} setAkte={setAkte} schreiben={schreiben} />
      </section>
    </div>
  );
}

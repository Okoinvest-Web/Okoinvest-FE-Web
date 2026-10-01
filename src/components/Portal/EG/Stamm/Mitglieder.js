"use client";

// Energiegemeinschaften WP1 – Mitglieder und Zählpunkte mit Massenbearbeitung (Mehrfachauswahl, Statuswechsel,
// Rechnungsweg, Smart Meter, TF-Entwürfe), CSV-Import mit Vorschau und CSV-Export. Rechte entscheidet der Server;
// `rechte` (Stufen je Recht aus egRechteVon) blendet nur Knöpfe aus. Tastatur: „/“ fokussiert die Suche.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, Upload } from "lucide-react";
import { Badge } from "@/components/Portal/ui";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { Knopf, Klappe, Meldung, useAktion } from "@/components/Portal/Mitglied/teile";
import { MITGLIED_ARTEN, MITGLIED_STATUS, RECHNUNGSWEGE, SMART_METER, STEUERSTATUS_ERZEUGER, TEILNAHME_STATUS, ZP_RICHTUNGEN } from "@/lib/plattform/eg/modell";
import { zaehlpunktFormatiert } from "@/lib/plattform/eg/zaehlpunkt";

const zelle = "px-3 py-2.5 align-top";

/**
 * @param {{mitglieder:object[], teilnahmen:object[], zaehlpunkte:object[], rechte:object, url:string, exportUrl:string}} p
 */
export function MitgliederTabelle({ mitglieder = [], teilnahmen = [], zaehlpunkte = [], rechte = {}, url, exportUrl }) {
  const sucheRef = useRef(null);
  const a = useAktion(url);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [auswahl, setAuswahl] = useState([]);
  const [massen, setMassen] = useState("rechnungsweg");
  const [wert, setWert] = useState("email");
  const [ergebnis, setErgebnis] = useState(null);
  const zp = useMemo(() => new Map(zaehlpunkte.map((z) => [z.id, z])), [zaehlpunkte]);
  const tnJe = useMemo(() => {
    const m = new Map();
    for (const t of teilnahmen) m.set(t.mitgliedId, [...(m.get(t.mitgliedId) || []), t]);
    return m;
  }, [teilnahmen]);
  useEffect(() => {
    const taste = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) { e.preventDefault(); sucheRef.current?.focus(); }
    };
    document.addEventListener("keydown", taste);
    return () => document.removeEventListener("keydown", taste);
  }, []);
  const such = q.trim().toLowerCase();
  const liste = mitglieder.filter((m) => (!status || m.status === status) && (!such || `${m.mitgliedsnummer} ${m.name} ${m.person?.email || ""} ${(tnJe.get(m.id) || []).map((t) => zp.get(t.zaehlpunktId)?.zaehlpunktnummer || "").join(" ")}`.toLowerCase().includes(such)));
  const alleGewaehlt = liste.length > 0 && liste.every((m) => auswahl.includes(m.id));
  const umschalten = (id) => setAuswahl(auswahl.includes(id) ? auswahl.filter((x) => x !== id) : [...auswahl, id]);
  const darfStamm = (rechte.stammdaten || 0) >= 2;
  const darfAufnahme = (rechte.mitglied_aufnehmen || 0) >= 2;
  const zaehler = Object.fromEntries(Object.keys(MITGLIED_STATUS).map((s) => [s, mitglieder.filter((m) => m.status === s).length]));

  async function massenLos() {
    const zpIds = auswahl.flatMap((mid) => (tnJe.get(mid) || []).map((t) => t.zaehlpunktId));
    const tnIds = auswahl.flatMap((mid) => (tnJe.get(mid) || []).filter((t) => t.status === "entwurf").map((t) => t.id));
    const def = {
      rechnungsweg: { ids: auswahl, werte: { wert } },
      mitglied_status: { ids: auswahl, werte: { nach: wert, zum: new Date().toISOString().slice(0, 10), grund: "Massenaktion" } },
      zp_smartmeter: { ids: zpIds, werte: { wert } },
      tf_entwurf: { ids: tnIds, werte: { teilnahmefaktor: Number(wert) } },
      anmeldung_vormerken: { ids: tnIds, werte: { wert: true } },
    }[massen];
    const r = await a.ausfuehren({ aktion: "massen", massenaktion: massen, ...def }, "Massenaktion ausgeführt.");
    if (r) setErgebnis(r);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-60">
          <span className="sr-only">Mitglieder durchsuchen</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input ref={sucheRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, Nr., E-Mail oder Zählpunkt (Taste /)" className={`${eingabe} pl-10`} />
        </label>
        {exportUrl && <a href={`${exportUrl}?export=mitglieder`} className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">CSV Mitglieder</a>}
        {exportUrl && darfStamm && <a href={`${exportUrl}?export=zaehlpunkte`} className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">CSV mit Zählpunkten</a>}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Nach Status filtern">
        {[["", `Alle (${mitglieder.length})`], ...Object.entries(MITGLIED_STATUS).filter(([s]) => zaehler[s]).map(([s, v]) => [s, `${v.label} (${zaehler[s]})`])].map(([s, l]) => (
          <button key={s || "alle"} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset ${status === s ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50"}`}>{l}</button>
        ))}
      </div>

      {(darfStamm || darfAufnahme) && auswahl.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-navy-50 p-3 ring-1 ring-navy-100" aria-live="polite">
          <p className="w-full text-[13.5px] font-semibold text-navy-900">{auswahl.length} ausgewählt</p>
          <select aria-label="Massenaktion" className={`${auswahlfeld} w-auto`} value={massen} onChange={(e) => { setMassen(e.target.value); setWert({ rechnungsweg: "email", mitglied_status: "aktiv", zp_smartmeter: "ja", tf_entwurf: "100", anmeldung_vormerken: "" }[e.target.value]); }}>
            {darfStamm && <option value="rechnungsweg">Rechnungsweg setzen</option>}
            {darfAufnahme && <option value="mitglied_status">Mitgliedsstatus ändern</option>}
            {darfStamm && <option value="zp_smartmeter">Smart Meter (Zählpunkte)</option>}
            {darfStamm && <option value="tf_entwurf">Teilnahmefaktor der Entwürfe</option>}
            {darfStamm && <option value="anmeldung_vormerken">Entwürfe zur EDA-Anmeldung vormerken</option>}
          </select>
          {massen === "rechnungsweg" && <select aria-label="Rechnungsweg" className={`${auswahlfeld} w-auto`} value={wert} onChange={(e) => setWert(e.target.value)}>{Object.entries(RECHNUNGSWEGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
          {massen === "mitglied_status" && <select aria-label="Neuer Status" className={`${auswahlfeld} w-auto`} value={wert} onChange={(e) => setWert(e.target.value)}>{Object.entries(MITGLIED_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>}
          {massen === "zp_smartmeter" && <select aria-label="Smart Meter" className={`${auswahlfeld} w-auto`} value={wert} onChange={(e) => setWert(e.target.value)}>{Object.entries(SMART_METER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
          {massen === "tf_entwurf" && <input aria-label="Teilnahmefaktor in Prozent" className={`${eingabe} w-28`} inputMode="numeric" value={wert} onChange={(e) => setWert(e.target.value)} />}
          <Knopf variante="navy" disabled={a.laeuft} onClick={massenLos}>Anwenden</Knopf>
          <Knopf onClick={() => setAuswahl([])}>Auswahl aufheben</Knopf>
        </div>
      )}
      <Meldung fehler={a.fehler} ok={a.ok} />
      {ergebnis?.fehler?.length > 0 && <p role="alert" className="rounded-xl bg-sand-50 px-4 py-3 text-[13.5px] text-ink-800 ring-1 ring-sun-300">{ergebnis.geaendert} geändert, {ergebnis.fehler.length} nicht möglich: {ergebnis.fehler.slice(0, 5).map((f) => f.fehler).join(" · ")}</p>}

      <div className="hidden overflow-x-auto rounded-2xl ring-1 ring-ink-200/70 md:block">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead className="bg-sand-50 text-[12.5px] uppercase tracking-wide text-ink-500">
            <tr>
              {(darfStamm || darfAufnahme) && <th className={zelle}><input type="checkbox" aria-label="Alle sichtbaren auswählen" checked={alleGewaehlt} onChange={() => setAuswahl(alleGewaehlt ? auswahl.filter((x) => !liste.some((m) => m.id === x)) : [...new Set([...auswahl, ...liste.map((m) => m.id)])])} /></th>}
              <th className={zelle}>Nr.</th><th className={zelle}>Mitglied</th><th className={zelle}>Status</th><th className={zelle}>Zählpunkte und Teilnahmen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 bg-white">
            {liste.map((m) => (
              <tr key={m.id}>
                {(darfStamm || darfAufnahme) && <td className={zelle}><input type="checkbox" aria-label={`${m.name} auswählen`} checked={auswahl.includes(m.id)} onChange={() => umschalten(m.id)} /></td>}
                <td className={`${zelle} ov-num text-ink-500`}>{m.mitgliedsnummer}</td>
                <td className={zelle}><span className="font-semibold text-ink-900">{m.name}</span><span className="block text-[12.5px] text-ink-500">{m.artLabel}{m.portalkonto ? " · Portalkonto" : ""}{m.schutzbeduerftig ? " · schutzbedürftig" : ""}</span></td>
                <td className={zelle}><Badge ton={MITGLIED_STATUS[m.status]?.ton}>{m.statusLabel}</Badge></td>
                <td className={zelle}>
                  <ul className="space-y-1">
                    {(tnJe.get(m.id) || []).map((t) => {
                      const z = zp.get(t.zaehlpunktId);
                      return (
                        <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                          <span className="font-mono text-[12px] text-ink-700">{zaehlpunktFormatiert(z?.zaehlpunktnummer || "")}</span>
                          <span className="text-ink-500">{ZP_RICHTUNGEN[z?.richtung]?.label} · TF {t.teilnahmefaktor} %</span>
                          <Badge ton={TEILNAHME_STATUS[t.status]?.ton}>{t.statusLabel}</Badge>
                        </li>
                      );
                    })}
                    {!(tnJe.get(m.id) || []).length && <li className="text-[13px] text-ink-400">kein Zählpunkt</li>}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {liste.map((m) => (
          <li key={m.id} className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
            <div className="flex items-start justify-between gap-3">
              <label className="flex min-w-0 items-start gap-2">
                {(darfStamm || darfAufnahme) && <input type="checkbox" className="mt-1" aria-label={`${m.name} auswählen`} checked={auswahl.includes(m.id)} onChange={() => umschalten(m.id)} />}
                <span className="min-w-0"><span className="block font-semibold text-ink-900">{m.mitgliedsnummer} · {m.name}</span><span className="block text-[12.5px] text-ink-500">{m.artLabel}</span></span>
              </label>
              <Badge ton={MITGLIED_STATUS[m.status]?.ton}>{m.statusLabel}</Badge>
            </div>
            <ul className="mt-2 space-y-1">
              {(tnJe.get(m.id) || []).map((t) => <li key={t.id} className="break-all text-[12.5px] text-ink-600">{zp.get(t.zaehlpunktId)?.zaehlpunktnummer} · TF {t.teilnahmefaktor} % · {t.statusLabel}</li>)}
            </ul>
          </li>
        ))}
      </ul>
      {!liste.length && <p className="text-[14px] text-ink-500">Keine Mitglieder für diese Auswahl.</p>}
    </div>
  );
}

/** Mitglied mit erstem Zählpunkt erfassen (legt Mitglied, Zählpunkt und Teilnahme-Entwurf an) */
export function MitgliedNeu({ url }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ art: "privat", vorname: "", nachname: "", firma: "", email: "", plz: "", ort: "", iban: "", steuerstatusErzeuger: "kleinunternehmer", uid: "", zaehlpunktnummer: "", richtung: "verbrauch", teilnahmefaktor: "100" });
  const s = (k) => (e) => setD({ ...d, [k]: e.target.value });
  async function los(e) {
    e.preventDefault();
    const m = await a.ausfuehren({ aktion: "mitglied", daten: { art: d.art, person: { vorname: d.vorname, nachname: d.nachname, firma: d.firma, email: d.email, plz: d.plz, ort: d.ort }, iban: d.iban, steuerstatusErzeuger: d.steuerstatusErzeuger, uid: d.uid, status: "aufgenommen" } }, "Mitglied angelegt.");
    if (!m?.mitglied || !d.zaehlpunktnummer) return;
    const z = await a.ausfuehren({ aktion: "zaehlpunkt", daten: { zaehlpunktnummer: d.zaehlpunktnummer, richtung: d.richtung } }, "Zählpunkt erfasst.");
    if (z?.zaehlpunkt) await a.ausfuehren({ aktion: "teilnahme", daten: { zaehlpunktId: z.zaehlpunkt.id, mitgliedId: m.mitglied.id, teilnahmefaktor: Number(d.teilnahmefaktor) } }, "Mitglied, Zählpunkt und Teilnahme-Entwurf angelegt – Anmeldung über EDA.");
  }
  const f = (k, label, extra = {}) => <Feld id={`${id}-${k}`} label={label} className={extra.breit ? "sm:col-span-2" : ""}><input id={`${id}-${k}`} className={eingabe} value={d[k]} onChange={s(k)} {...(extra.attr || {})} /></Feld>;
  return (
    <form className="space-y-3" onSubmit={los}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Feld id={`${id}-art`} label="Mitgliedsart"><select id={`${id}-art`} className={auswahlfeld} value={d.art} onChange={s("art")}>{Object.entries(MITGLIED_ARTEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
        {f("vorname", "Vorname")}{f("nachname", "Nachname")}{f("firma", "Firma / Organisation")}
        {f("email", "E-Mail (verknüpft vorhandenes Konto)", { breit: true, attr: { type: "email" } })}{f("plz", "PLZ", { attr: { inputMode: "numeric" } })}{f("ort", "Ort")}
        {f("iban", "IBAN", { breit: true })}
        <Feld id={`${id}-st`} label="Steuerstatus Erzeuger"><select id={`${id}-st`} className={auswahlfeld} value={d.steuerstatusErzeuger} onChange={s("steuerstatusErzeuger")}>{Object.entries(STEUERSTATUS_ERZEUGER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
        {f("uid", "UID (bei Regelbesteuerung)")}
        {f("zaehlpunktnummer", "Zählpunktnummer (33 Zeichen, optional)", { breit: true, attr: { spellCheck: false } })}
        <Feld id={`${id}-ri`} label="Richtung"><select id={`${id}-ri`} className={auswahlfeld} value={d.richtung} onChange={s("richtung")}>{Object.entries(ZP_RICHTUNGEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Feld>
        {f("teilnahmefaktor", "Teilnahmefaktor %", { attr: { inputMode: "numeric" } })}
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>Mitglied anlegen</Knopf>
    </form>
  );
}

/** CSV-Import mit Vorschau (Datei oder Einfügen) – Ausführen erst nach fehlerfreier Vorschau */
export function CsvImport({ url, spalten = [] }) {
  const id = useId();
  const a = useAktion(url);
  const [csv, setCsv] = useState("");
  const [vorschau, setVorschau] = useState(null);
  async function datei(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { a.setFehler("Die Datei ist zu groß (max. 2 MB)."); return; }
    setCsv(await f.text());
    setVorschau(null);
  }
  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-ink-600">Spalten (Semikolon oder Komma): <code className="break-all text-[12.5px]">{spalten.join(";")}</code>. Vorhandene Mitglieder werden über Mitgliedsnummer oder E-Mail erkannt und aktualisiert, Zählpunkte bei Mehrfachteilnahme wiederverwendet; neue Teilnahmen entstehen als Entwurf (Anmeldung über EDA).</p>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
        <Upload aria-hidden="true" className="h-4 w-4 text-ov-700" /> CSV-Datei wählen
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={datei} />
      </label>
      <Feld id={`${id}-csv`} label="oder Inhalt einfügen"><textarea id={`${id}-csv`} rows={5} className={`${textbereich} font-mono text-[12.5px]`} value={csv} onChange={(e) => { setCsv(e.target.value); setVorschau(null); }} /></Feld>
      <div className="flex flex-wrap gap-2">
        <Knopf disabled={a.laeuft || !csv.trim()} onClick={async () => setVorschau(await a.ausfuehren({ aktion: "csv_import", csv, ausfuehren: false }, "Vorschau erstellt."))}>Vorschau</Knopf>
        {vorschau && !vorschau.fehler?.length && vorschau.vorschau?.length > 0 && <Knopf variante="primary" disabled={a.laeuft} onClick={async () => { const r = await a.ausfuehren({ aktion: "csv_import", csv, ausfuehren: true }, "Import ausgeführt."); if (r) { setVorschau(null); setCsv(""); } }}>{vorschau.vorschau.length} Zeilen importieren</Knopf>}
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      {vorschau?.vorschau?.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-2xl ring-1 ring-ink-200/70">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-sand-50 text-ink-500"><tr><th className={zelle}>Zeile</th><th className={zelle}>Aktion</th><th className={zelle}>Name</th><th className={zelle}>Zählpunkt</th><th className={zelle}>Hinweis</th></tr></thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {vorschau.vorschau.map((v) => (
                <tr key={v.zeile} className={v.aktion === "fehler" ? "bg-red-50" : ""}>
                  <td className={zelle}>{v.zeile}</td><td className={zelle}><Badge ton={v.aktion === "fehler" ? "warn" : v.aktion === "neu" ? "ok" : "info"}>{v.aktion}</Badge></td>
                  <td className={zelle}>{v.name}</td><td className={`${zelle} break-all font-mono text-[12px]`}>{v.zaehlpunkt}</td><td className={zelle}>{v.fehler || v.hinweise?.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Dokumentierte Korrektur des Teilnahme-Status (nur Organisator; Begründung Pflicht, Protokoll) */
export function TeilnahmeKorrektur({ teilnahmen = [], zaehlpunkte = [], url }) {
  const id = useId();
  const a = useAktion(url);
  const zp = new Map(zaehlpunkte.map((z) => [z.id, z]));
  const [tid, setTid] = useState(teilnahmen[0]?.id || "");
  const t = teilnahmen.find((x) => x.id === tid);
  const ereignisse = Object.keys(TEILNAHME_STATUS[t?.status]?.ereignisse || {});
  const [ereignis, setEreignis] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [grund, setGrund] = useState("");
  return (
    <Klappe titel="Dokumentierte Korrektur eines Teilnahme-Status">
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "teilnahme_uebergang", id: tid, ereignis, datum, grund }, "Status korrigiert und protokolliert."); }}>
        <Feld id={`${id}-t`} label="Teilnahme" className="sm:col-span-2"><select id={`${id}-t`} className={auswahlfeld} value={tid} onChange={(e) => { setTid(e.target.value); setEreignis(""); }}>{teilnahmen.map((x) => <option key={x.id} value={x.id}>{zp.get(x.zaehlpunktId)?.zaehlpunktnummer} · {x.statusLabel}</option>)}</select></Feld>
        <Feld id={`${id}-e`} label="Ereignis"><select id={`${id}-e`} className={auswahlfeld} value={ereignis} onChange={(e) => setEreignis(e.target.value)}><option value="">– wählen –</option>{ereignisse.map((x) => <option key={x} value={x}>{x} → {TEILNAHME_STATUS[TEILNAHME_STATUS[t?.status]?.ereignisse[x]]?.label}</option>)}</select></Feld>
        <Feld id={`${id}-d`} label="Datum"><input id={`${id}-d`} type="date" className={eingabe} value={datum} onChange={(e) => setDatum(e.target.value)} /></Feld>
        <Feld id={`${id}-g`} label="Begründung (Pflicht, ohne EDA-Prozess)" className="sm:col-span-4"><input id={`${id}-g`} className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} /></Feld>
        <div className="sm:col-span-4"><Meldung fehler={a.fehler} ok={a.ok} /></div>
        <div className="sm:col-span-4"><Knopf variante="navy" type="submit" disabled={a.laeuft || !ereignis}>Korrektur speichern</Knopf></div>
      </form>
    </Klappe>
  );
}

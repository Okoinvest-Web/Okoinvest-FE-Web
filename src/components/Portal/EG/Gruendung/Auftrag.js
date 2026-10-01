"use client";

// Gründungsauftrag (WP5) – interaktive Teile: Schrittliste mit Fristen, Nachweisen und Aktionen, Angebot und Beauftragung,
// Gemeinschaft anlegen, Stichtag (Wechsel), Notizen. Alle Prüfungen serverseitig (backend/eg.js grAuftragAktion/grSchrittAktion).

import { useId, useState } from "react";
import { FileText, PenLine } from "lucide-react";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { Badge } from "@/components/Portal/ui";
import { Klappe, Knopf, Meldung, useAktion } from "@/components/Portal/Mitglied/teile";
import { FristBadge, SchrittSymbol, datumDe } from "./teile";

const FELD_LABEL = { zvrZahl: "ZVR-Zahl", firmenbuchnummer: "Firmenbuchnummer", iban: "IBAN", creditorId: "SEPA-Gläubiger-ID", steuernummer: "Steuernummer", uid: "UID-Nummer", marktpartnerId: "Marktpartner-ID", gemeinschaftsId: "Gemeinschafts-ID", edaAnbindung: "EDA-Anbindung (anwenderportal, email, kep)", statutenVersion: "Statuten-Version" };

function Schritt({ s, auftragId, bo, kunde, gemeinschaftId, statutenVorlage }) {
  const id = useId();
  const a = useAktion(`/api/portal/eg/gruendung/${auftragId}/schritt`);
  const [form, setForm] = useState("");
  const [w, setW] = useState({ datum: "", wert: "", notiz: "", grund: "", frist: s.frist || "" });
  const darf = bo || (kunde && s.zustaendig === "auftraggeber");
  const offen = !["erledigt", "entfaellt"].includes(s.status);
  const los = (aktion, extra = {}, text = "Gespeichert.") => a.ausfuehren({ schritt: s.schluessel, aktion, ...extra }, text).then((r) => r && setForm(""));
  const vorlageLink = s.vorlage ? `/api/portal/eg/dokument?vorlage=${encodeURIComponent(s.vorlage === "statuten" ? statutenVorlage : s.vorlage)}&${gemeinschaftId ? `gemeinschaftId=${gemeinschaftId}` : `auftragId=${auftragId}`}` : "";
  return (
    <li className="py-3.5">
      <div className="flex gap-3">
        <SchrittSymbol status={s.status} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[14.5px] font-semibold text-ink-900">{s.label}</p>
            {!s.pflicht && <Badge>optional</Badge>}
            <Badge ton={s.status === "erledigt" ? "ok" : s.status === "wartet_extern" ? "warn" : s.status === "in_arbeit" ? "info" : "neutral"}>{s.statusLabel}</Badge>
            <FristBadge frist={offen ? s.frist : ""} ampel={s.ampel} />
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {s.zustaendigLabel}
            {s.quelle ? ` · ${s.quelle}` : ""}
            {s.status === "erledigt" && s.datum ? ` · erledigt am ${datumDe(s.datum)}` : ""}
          </p>
          {s.text && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{s.text}</p>}
          {s.wert && <p className="mt-1 text-[13.5px] text-ink-800"><span className="text-ink-500">{FELD_LABEL[s.feld] || "Ergebnis"}:</span> {s.wert}</p>}
          {s.notiz && <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink-700">{s.notiz}</p>}
          {s.nachweise?.length > 0 && <p className="mt-1 text-[12.5px] text-ink-500">Nachweise: {s.nachweise.map((x) => x.titel).join(", ")}</p>}
          {offen && s.nachweisText && <p className="mt-1 text-[12.5px] text-ink-500">Nachweis: {s.nachweisText}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {s.hilfe && !["simulation", "foerdercheck", "organe", "import", "probeabrechnung", "eda_bereit"].includes(s.hilfe) && <a href={`#hilfe-${s.hilfe}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy-50 px-3 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-100"><PenLine aria-hidden="true" className="h-3.5 w-3.5" />Ausfüllhilfe</a>}
            {vorlageLink && <a href={vorlageLink} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ov-50 px-3 text-[12.5px] font-semibold text-ov-800 hover:bg-ov-100"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Muster ansehen</a>}
            {s.hilfe === "import" && <a href="#wechsel-import" className="inline-flex h-8 items-center rounded-full bg-navy-50 px-3 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-100">Zum Import-Assistenten</a>}
            {s.hilfe === "foerdercheck" && <a href="#foerdercheck" className="inline-flex h-8 items-center rounded-full bg-navy-50 px-3 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-100">Zum Förder-Check</a>}
            {darf && s.status === "offen" && <Knopf onClick={() => los("starten", {}, "Schritt begonnen.")} disabled={a.laeuft} className="h-8 text-[12.5px]">Beginnen</Knopf>}
            {darf && ["offen", "in_arbeit"].includes(s.status) && <Knopf onClick={() => los("warten", {}, "Wartet auf Behörde bzw. Netzbetreiber.")} disabled={a.laeuft} className="h-8 text-[12.5px]">Wartet extern</Knopf>}
            {darf && offen && <Knopf variante="primary" onClick={() => setForm(form === "erledigen" ? "" : "erledigen")} className="h-8 text-[12.5px]">Erledigt …</Knopf>}
            {bo && offen && <Knopf onClick={() => setForm(form === "entfaellt" ? "" : "entfaellt")} className="h-8 text-[12.5px]">Entfällt</Knopf>}
            {bo && offen && <Knopf onClick={() => setForm(form === "frist" ? "" : "frist")} className="h-8 text-[12.5px]">Frist</Knopf>}
            {bo && !offen && <Knopf onClick={() => los("wiedereroeffnen", {}, "Wieder geöffnet.")} disabled={a.laeuft} className="h-8 text-[12.5px]">Wieder öffnen</Knopf>}
            {!darf && kunde && offen && <Knopf onClick={() => setForm(form === "notiz" ? "" : "notiz")} className="h-8 text-[12.5px]">Notiz</Knopf>}
          </div>
          {form === "erledigen" && (
            <form className="mt-3 grid gap-3 rounded-2xl bg-ink-50 p-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); los("erledigen", { datum: w.datum, wert: w.wert, notiz: w.notiz, nachweis: w.notiz ? { titel: w.notiz.slice(0, 80) } : null }, "Schritt erledigt."); }}>
              <Feld id={`${id}-d`} label="Erledigt am"><input id={`${id}-d`} type="date" className={eingabe} value={w.datum} onChange={(e) => setW({ ...w, datum: e.target.value })} /></Feld>
              {s.feld && <Feld id={`${id}-w`} label={FELD_LABEL[s.feld] || "Wert"} pflicht className="sm:col-span-2"><input id={`${id}-w`} className={eingabe} value={w.wert} onChange={(e) => setW({ ...w, wert: e.target.value })} /></Feld>}
              <Feld id={`${id}-n`} label="Nachweis bzw. Notiz" className="sm:col-span-3" hinweis={s.nachweisText || ""}><textarea id={`${id}-n`} rows={2} className={textbereich} value={w.notiz} onChange={(e) => setW({ ...w, notiz: e.target.value })} /></Feld>
              <div className="sm:col-span-3"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Als erledigt speichern</Knopf></div>
            </form>
          )}
          {form === "entfaellt" && (
            <form className="mt-3 flex flex-col gap-2 rounded-2xl bg-ink-50 p-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); los("entfaellt", { grund: w.grund }, "Schritt entfällt."); }}>
              <Feld id={`${id}-g`} label="Begründung" className="flex-1"><input id={`${id}-g`} className={eingabe} value={w.grund} onChange={(e) => setW({ ...w, grund: e.target.value })} /></Feld>
              <Knopf type="submit" disabled={a.laeuft}>Speichern</Knopf>
            </form>
          )}
          {form === "frist" && (
            <form className="mt-3 flex flex-col gap-2 rounded-2xl bg-ink-50 p-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); los("frist", { frist: w.frist }, "Frist gesetzt."); }}>
              <Feld id={`${id}-f`} label="Frist (leer = Planwert)"><input id={`${id}-f`} type="date" className={eingabe} value={w.frist} onChange={(e) => setW({ ...w, frist: e.target.value })} /></Feld>
              <Knopf type="submit" disabled={a.laeuft}>Speichern</Knopf>
            </form>
          )}
          {form === "notiz" && (
            <form className="mt-3 flex flex-col gap-2 rounded-2xl bg-ink-50 p-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); los("notiz", { notiz: w.notiz }, "Notiz gespeichert."); }}>
              <Feld id={`${id}-no`} label="Notiz an ÖkoInvest" className="flex-1"><input id={`${id}-no`} className={eingabe} value={w.notiz} onChange={(e) => setW({ ...w, notiz: e.target.value })} /></Feld>
              <Knopf type="submit" disabled={a.laeuft}>Senden</Knopf>
            </form>
          )}
          <div className="mt-2"><Meldung fehler={a.fehler} ok={a.ok} /></div>
        </div>
      </div>
    </li>
  );
}

/** Schritte gruppiert nach Abschnitt */
export function SchrittListe({ auftragId, schritte = [], bo = false, kunde = false, gemeinschaftId = "", rechtsform = "verein" }) {
  const statutenVorlage = rechtsform === "egen" ? "statuten_egen" : "statuten_verein";
  const gruppen = [];
  for (const s of schritte) {
    const g = gruppen.find((x) => x.abschnitt === s.abschnitt);
    if (g) g.liste.push(s);
    else gruppen.push({ abschnitt: s.abschnitt, label: s.abschnittLabel, liste: [s] });
  }
  return (
    <div className="space-y-5">
      {gruppen.map((g) => {
        const fertig = g.liste.filter((s) => ["erledigt", "entfaellt"].includes(s.status)).length;
        return (
          <section key={g.abschnitt} aria-label={g.label}>
            <h3 className="flex items-center justify-between gap-3 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">
              {g.label}
              <span className="font-normal normal-case tracking-normal text-ink-500">{fertig}/{g.liste.length}</span>
            </h3>
            <ul className="mt-1 divide-y divide-ink-100">{g.liste.map((s) => <Schritt key={s.schluessel} s={s} auftragId={auftragId} bo={bo} kunde={kunde} gemeinschaftId={gemeinschaftId} statutenVorlage={statutenVorlage} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}

/** Aktionen am Auftrag (Backoffice bzw. Auftraggeber) */
export function AuftragAktionen({ auftrag: a, netzbetreiber = [], gemeinschaften = [] }) {
  const id = useId();
  const akt = useAktion(`/api/portal/eg/gruendung/${a.id}`);
  const [w, setW] = useState({ betragNetto: a.angebot?.betragNetto ?? "", gueltigTage: 30, zahlungsplan: a.angebot?.zahlungsplan || "", hinweise: a.angebot?.hinweise || "", nachweis: "", grund: "", stichtag: a.stichtag || "", gemeinschaftId: "", bestaetigt: false, nbIds: a.netzbetreiberId ? [a.netzbetreiberId] : [], strasse: "" });
  const s = (k) => (e) => setW({ ...w, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const hat = (x) => a.aktionen.includes(x);
  const los = (aktion, daten, text) => akt.ausfuehren({ aktion, ...daten }, text);
  return (
    <div className="space-y-3">
      {hat("annehmen") && (
        <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-inset ring-ov-200">
          <p className="text-[14px] font-semibold text-ink-900">Angebot annehmen</p>
          <label className="mt-2 flex items-start gap-2 text-[13.5px] text-ink-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-ov-600" checked={w.bestaetigt} onChange={s("bestaetigt")} />Ich beauftrage ÖkoInvest zu den Bedingungen des Angebots {a.angebot?.nummer}.</label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Knopf variante="primary" disabled={akt.laeuft || !w.bestaetigt} onClick={() => los("annehmen", { bestaetigt: true }, "Auftrag erteilt – vielen Dank.")}>Verbindlich beauftragen</Knopf>
            {hat("ablehnen") && <Knopf onClick={() => los("ablehnen", { grund: w.grund }, "Angebot abgelehnt.")} disabled={akt.laeuft}>Ablehnen</Knopf>}
          </div>
        </div>
      )}
      {!hat("annehmen") && hat("ablehnen") && <Knopf onClick={() => los("ablehnen", { grund: "" }, "Angebot abgelehnt.")} disabled={akt.laeuft}>Angebot ablehnen</Knopf>}
      {hat("angebot") && (
        <Klappe titel={a.angebot ? `Angebot ${a.angebot.nummer} ändern` : "Angebot erstellen"} offen={a.status === "anfrage"}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); los("angebot", { betragNetto: w.betragNetto, gueltigTage: w.gueltigTage, zahlungsplan: w.zahlungsplan, hinweise: w.hinweise }, "Angebot gespeichert und dem Auftraggeber mitgeteilt."); }}>
            <Feld id={`${id}-b`} label="Honorar netto (€)" pflicht><input id={`${id}-b`} className={eingabe} inputMode="decimal" value={w.betragNetto} onChange={s("betragNetto")} /></Feld>
            <Feld id={`${id}-g`} label="Gültig (Tage)"><input id={`${id}-g`} className={eingabe} inputMode="numeric" value={w.gueltigTage} onChange={s("gueltigTage")} /></Feld>
            <Feld id={`${id}-z`} label="Zahlungsplan" className="sm:col-span-2"><input id={`${id}-z`} className={eingabe} value={w.zahlungsplan} onChange={s("zahlungsplan")} placeholder="z. B. 50 % bei Auftrag, 50 % bei EDA-bereit" /></Feld>
            <Feld id={`${id}-h`} label="Hinweise" className="sm:col-span-2"><textarea id={`${id}-h`} rows={2} className={textbereich} value={w.hinweise} onChange={s("hinweise")} /></Feld>
            <div className="sm:col-span-2"><Knopf variante="primary" type="submit" disabled={akt.laeuft}>Angebot speichern</Knopf></div>
          </form>
        </Klappe>
      )}
      {hat("signatur") && <Knopf variante="navy" disabled={akt.laeuft} onClick={() => los("signatur", {}, "Auftrag zur elektronischen Unterschrift bereitgestellt.")}>Zur Unterschrift senden (Signatur-Modul)</Knopf>}
      {hat("beauftragt_manuell") && (
        <Klappe titel="Auftrag manuell erfassen (z. B. Unterschrift auf Papier)">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); los("beauftragt_manuell", { nachweis: w.nachweis }, "Auftrag erfasst."); }}>
            <Feld id={`${id}-n`} label="Nachweis" className="flex-1"><input id={`${id}-n`} className={eingabe} value={w.nachweis} onChange={s("nachweis")} /></Feld>
            <Knopf type="submit" disabled={akt.laeuft}>Erfassen</Knopf>
          </form>
        </Klappe>
      )}
      {hat("gemeinschaft_anlegen") && (
        <Klappe titel="Gemeinschaft anlegen (Stammdaten über WP1)" offen>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); los("gemeinschaft_anlegen", { daten: { netzbetreiber: w.nbIds, strasse: w.strasse } }, "Gemeinschaft angelegt."); }}>
            <Feld id={`${id}-nb`} label="Netzbetreiber"><select id={`${id}-nb`} multiple className={`${auswahlfeld} h-28 bg-none py-2`} value={w.nbIds} onChange={(e) => setW({ ...w, nbIds: [...e.target.selectedOptions].map((o) => o.value) })}>{netzbetreiber.map((nb) => <option key={nb.id} value={nb.id}>{nb.name}</option>)}</select></Feld>
            <Feld id={`${id}-st`} label="Sitz (Straße)"><input id={`${id}-st`} className={eingabe} value={w.strasse} onChange={s("strasse")} /></Feld>
            <div className="sm:col-span-2"><Knopf variante="primary" type="submit" disabled={akt.laeuft}>Anlegen und verknüpfen</Knopf></div>
          </form>
        </Klappe>
      )}
      {hat("gemeinschaft_verknuepfen") && gemeinschaften.length > 0 && (
        <Klappe titel="Mit bestehender Gemeinschaft verknüpfen">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); los("gemeinschaft_verknuepfen", { gemeinschaftId: w.gemeinschaftId }, "Verknüpft."); }}>
            <Feld id={`${id}-gv`} label="Gemeinschaft" className="flex-1"><select id={`${id}-gv`} className={auswahlfeld} value={w.gemeinschaftId} onChange={s("gemeinschaftId")}><option value="">– wählen –</option>{gemeinschaften.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Feld>
            <Knopf type="submit" disabled={akt.laeuft || !w.gemeinschaftId}>Verknüpfen</Knopf>
          </form>
        </Klappe>
      )}
      {hat("stichtag") && (
        <Klappe titel="Stichtag des Wechsels" offen={!a.stichtag}>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); los("stichtag", { stichtag: w.stichtag }, "Stichtag festgelegt."); }}>
            <Feld id={`${id}-sd`} label="Erster Abrechnungsmonat bei ÖkoInvest (Monatserster)" className="flex-1"><input id={`${id}-sd`} type="date" className={eingabe} value={w.stichtag} onChange={s("stichtag")} /></Feld>
            <Knopf type="submit" disabled={akt.laeuft}>Festlegen</Knopf>
          </form>
        </Klappe>
      )}
      <div className="flex flex-wrap gap-2">
        {hat("schritte_aktualisieren") && <Knopf onClick={() => los("schritte_aktualisieren", {}, "Schritte an Modell, Rechtsform und Schwellen angepasst.")} disabled={akt.laeuft}>Schritte aktualisieren</Knopf>}
        {hat("mitglieder_informieren") && <Knopf onClick={() => los("mitglieder_informieren", {}, "Mitglieder informiert.")} disabled={akt.laeuft}>Mitglieder informieren</Knopf>}
        {hat("uebergeben") && <Knopf variante="primary" onClick={() => los("uebergeben", {}, "Übergeben.")} disabled={akt.laeuft}>Übergabe abschließen</Knopf>}
        {hat("abbrechen") && <Knopf variante="gefahr" onClick={() => { const g = window.prompt("Grund für den Abbruch?"); if (g) los("abbrechen", { grund: g }, "Auftrag abgebrochen."); }} disabled={akt.laeuft}>Abbrechen</Knopf>}
      </div>
      <Meldung fehler={akt.fehler} ok={akt.ok} />
    </div>
  );
}

/** Notiz bzw. Nachricht zum Auftrag */
export function AuftragNotiz({ auftragId, bo = false }) {
  const id = useId();
  const a = useAktion(`/api/portal/eg/gruendung/${auftragId}`);
  const [t, setT] = useState("");
  const [intern, setIntern] = useState(false);
  return (
    <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); if (await a.ausfuehren({ aktion: "notiz", text: t, intern }, "Gespeichert.")) setT(""); }}>
      <Feld id={`${id}-t`} label={bo ? "Notiz bzw. Nachricht an den Auftraggeber" : "Nachricht an ÖkoInvest"}><textarea id={`${id}-t`} rows={2} className={textbereich} value={t} onChange={(e) => setT(e.target.value)} /></Feld>
      {bo && <label className="flex items-center gap-2 text-[13px] text-ink-600"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={intern} onChange={(e) => setIntern(e.target.checked)} />nur intern (für den Auftraggeber unsichtbar)</label>}
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf type="submit" disabled={a.laeuft || !t.trim()}>Senden</Knopf>
    </form>
  );
}

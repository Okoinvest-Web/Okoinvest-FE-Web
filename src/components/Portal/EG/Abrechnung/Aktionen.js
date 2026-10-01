"use client";

// Interaktive Teile der Abrechnung (WP4): Periode anlegen, Vorschau, Vier-Augen-Freigabe, Versand, Storno/Korrektur,
// Probe-Vergleich, Zahlungsläufe, Kontoauszug, Mahnlauf, Zahlung erfassen, Buchung/Kassa, Prüfvermerk, Einstellungen.
// Alle Regeln und Rechte prüft der Server (backend/*/eg-abrechnung.js); hier werden Knöpfe nur angeboten.

import { useState } from "react";
import { BadgeCheck, Calculator, FileCheck2, FileUp, Loader2, Lock, Play, Send, ShieldCheck, Trash2, Undo2, UsersRound } from "lucide-react";
import ErfolgsHaken from "@/components/ui/ErfolgsHaken";
import Rueckfrage from "./Rueckfrage";
import { Knopf, Meldung, useAktion } from "@/components/Portal/Mitglied/teile";
import { auswahlfeld, eingabe, labelKlasse, textbereich } from "@/components/Portal/felder";

const Lade = ({ an, icon: Icon }) => (an ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null);
const eur = (x) => `${(Number(x) || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Neue Periode bzw. Probe-Abrechnung anlegen (Vorschläge: letzte vollständige Periode) */
export function PeriodeAnlegen({ api, vorschlaege = [] }) {
  const a = useAktion(api);
  const [f, setF] = useState(() => ({ ...(vorschlaege[0] || { von: "", bis: "", art: "monat" }), probe: false }));
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "anlegen", ...f }, f.probe ? "Probe-Abrechnung angelegt." : "Periode angelegt."); }}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Vorschläge">
        {vorschlaege.map((v) => (
          <button key={v.art} type="button" onClick={() => setF({ ...f, ...v })} className="rounded-full bg-ov-50 px-3 py-1 text-[12.5px] font-semibold text-ov-800 ring-1 ring-ov-200 hover:bg-ov-100">
            {v.art === "monat" ? "Letzter Monat" : v.art === "quartal" ? "Letztes Quartal" : "Letztes Jahr"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block"><span className={labelKlasse}>Von</span><input type="date" className={eingabe} value={f.von} onChange={(e) => setF({ ...f, von: e.target.value })} required /></label>
        <label className="block"><span className={labelKlasse}>Bis</span><input type="date" className={eingabe} value={f.bis} onChange={(e) => setF({ ...f, bis: e.target.value })} required /></label>
        <label className="block"><span className={labelKlasse}>Art</span>
          <select className={auswahlfeld} value={f.art} onChange={(e) => setF({ ...f, art: e.target.value })}>
            <option value="monat">Monat</option><option value="quartal">Quartal</option><option value="jahr">Jahr</option><option value="schluss">Schlussabrechnung</option>
          </select>
        </label>
      </div>
      <label className="flex items-start gap-2 text-[13.5px] text-ink-700"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-ov-600" checked={f.probe} onChange={(e) => setF({ ...f, probe: e.target.checked })} />Probe-Abrechnung (Simulation ohne Belege, z. B. Kontrollabrechnung beim Wechsel)</label>
      <Knopf variante="primary" type="submit" disabled={a.laeuft}><Lade an={a.laeuft} icon={Play} />Anlegen</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </form>
  );
}

const tagDe = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "–");

/**
 * Aktionen einer Periode. `kann`: { rechnen, freigabe1, freigabe2, versand, storno } aus den Stufen;
 * Freigaben binden an den Fingerabdruck der Vorschau. Folgenreiche Schritte (Freigabe, Versand, Abschluss, Verwerfen)
 * laufen über einen Bestätigungsdialog mit Periode, Anzahl, Summe und Folgen (UX-Audit P0-3).
 */
export function PeriodeKnoepfe({ api, periode, kann = {}, meineFreigabe = false }) {
  const a = useAktion(api);
  const [grund, setGrund] = useState("");
  const [frage, setFrage] = useState("");
  const [dialog, setDialog] = useState("");
  const [fertig, setFertig] = useState(null);
  const akt = periode.aktionen || [];
  const fehlerAnzahl = periode.vorschau?.pruefung?.fehler?.length || 0;
  const k = periode.vorschau?.kennzahlen || {};
  const belege = periode.vorschau?.belege || [];
  const mitglieder = new Set(belege.map((x) => x.mitgliedsnummer).filter(Boolean)).size;
  const anzahl = (Number(k.rechnungen) || 0) + (Number(k.gutschriften) || 0) || periode.anzahlBelege || belege.length;
  const zeitraum = `${periode.artLabel || "Periode"} ${tagDe(periode.von)} – ${tagDe(periode.bis)}`;
  const fakten = [
    { label: "Periode", wert: zeitraum, breit: true },
    { label: "Rechnungen", wert: k.rechnungen !== undefined ? `${k.rechnungen} · ${eur(k.bruttoRechnungen)}` : "–" },
    { label: "Gutschriften", wert: k.gutschriften !== undefined ? `${k.gutschriften} · ${eur(k.bruttoGutschriften)}` : "–" },
  ];
  const auge = kann.freigabe1 ? 1 : 2;

  async function los(body, text, abschluss) {
    const r = await a.ausfuehren(body, text);
    setDialog("");
    if (r && abschluss) setFertig(abschluss);
    return r;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-start gap-2">
          {akt.includes("vorschau") && kann.rechnen && <Knopf variante={periode.vorschau ? "secondary" : "primary"} disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "vorschau" }, "Vorschau berechnet.")}><Lade an={a.laeuft && !dialog} icon={Calculator} />{periode.vorschau ? "Neu berechnen" : "Vorschau berechnen"}</Knopf>}
          {akt.includes("freigeben") && (kann.freigabe1 || kann.freigabe2) && !meineFreigabe && (
            <div>
              <Knopf variante="primary" disabled={a.laeuft || fehlerAnzahl > 0} aria-describedby={fehlerAnzahl ? "eg-freigabe-gesperrt" : undefined} onClick={() => setDialog("freigeben")}>
                <BadgeCheck aria-hidden="true" className="h-4 w-4" />Freigeben ({kann.freigabe1 ? "Kassier, 1. Auge" : "Vorstand, 2. Auge"})
              </Knopf>
              {fehlerAnzahl > 0 && <p id="eg-freigabe-gesperrt" className="mt-1.5 flex items-center gap-1 text-[12.5px] text-danger-700"><Lock aria-hidden="true" className="h-3.5 w-3.5" />Freigabe gesperrt: {fehlerAnzahl} {fehlerAnzahl === 1 ? "Prüfung" : "Prüfungen"} offen – siehe „Prüfungen“</p>}
            </div>
          )}
          {akt.includes("versenden") && kann.versand && <Knopf variante="primary" disabled={a.laeuft} onClick={() => setDialog("versenden")}><Send aria-hidden="true" className="h-4 w-4" />Belege versenden</Knopf>}
          {akt.includes("abschliessen") && (kann.freigabe1 || kann.versand) && <Knopf disabled={a.laeuft} onClick={() => setDialog("abschliessen")}><FileCheck2 aria-hidden="true" className="h-4 w-4" />Abschließen</Knopf>}
        </div>
        {((akt.includes("stornieren") && kann.storno) || (akt.includes("verwerfen") && kann.rechnen)) && (
          <div className="flex flex-wrap gap-2 sm:border-l sm:border-ink-100 sm:pl-4">
            {akt.includes("stornieren") && kann.storno && <Knopf variante="gefahr" disabled={a.laeuft} aria-expanded={frage === "storno"} onClick={() => setFrage(frage === "storno" ? "" : "storno")}><Undo2 aria-hidden="true" className="h-4 w-4" />Periode stornieren</Knopf>}
            {akt.includes("verwerfen") && kann.rechnen && <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => setDialog("verwerfen")}><Trash2 aria-hidden="true" className="h-4 w-4" />Verwerfen</Knopf>}
          </div>
        )}
      </div>
      {meineFreigabe && <p className="flex items-center gap-1.5 rounded-2xl bg-navy-50 px-3.5 py-2.5 text-[13px] text-navy-700 ring-1 ring-navy-100"><UsersRound aria-hidden="true" className="h-4 w-4 shrink-0" />Ihre Freigabe liegt vor – es fehlt die Freigabe der anderen Funktion (Vier-Augen-Prinzip).</p>}
      {frage === "storno" && (
        <div className="space-y-2 rounded-2xl bg-sand-100/60 p-4 ring-1 ring-ink-200">
          <label className="block"><span className={labelKlasse}>Grund des Stornos (erscheint auf jedem Stornobeleg)</span><input className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="z. B. Netzbetreiber hat Werte korrigiert" /></label>
          <Knopf variante="gefahr" disabled={a.laeuft || grund.trim().length < 5} onClick={() => setDialog("storno")}>Alle Belege stornieren …</Knopf>
        </div>
      )}
      {fertig && (
        <div role="status" className="animate-ov-einblenden flex items-center gap-3 rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200">
          <ErfolgsHaken groesse={44} />
          <p className="text-[14px] leading-relaxed text-ink-800"><strong className="text-ink-900">{fertig.titel}</strong><span className="block text-[13px] text-ink-600">{fertig.text}</span></p>
        </div>
      )}
      <Meldung fehler={a.fehler} ok={fertig ? "" : a.ok} />

      <Rueckfrage
        offen={dialog === "freigeben"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        icon={BadgeCheck}
        titel={`Abrechnung als ${auge}. Auge freigeben?`}
        text={auge === 1 ? "Sie bestätigen als Kassier, dass Sie die Vorschau geprüft haben. Danach gibt der Vorstand als zweite Person frei." : "Sie bestätigen als zweite Person (Vorstand). Danach werden die Belege nummeriert und können versendet werden."}
        fakten={[...fakten, { label: "Mitglieder", wert: String(mitglieder || "–") }, { label: "Hinweise", wert: String(periode.vorschau?.pruefung?.warnungen?.length || 0) }]}
        folgen={["Die Freigabe ist an genau diese Vorschau gebunden (Fingerabdruck) – jede Neuberechnung setzt sie zurück.", "Vier-Augen-Prinzip: Dieselbe Person kann nicht beide Freigaben erteilen."]}
        knopf={`Ja, als ${auge}. Auge freigeben`}
        onBestaetigen={() => los({ aktion: "freigeben", fingerabdruck: periode.fingerabdruck }, "Freigabe erteilt.", auge === 1 ? { titel: "1. Freigabe erteilt", text: "Jetzt fehlt nur noch die Freigabe des Vorstands." } : { titel: "Abrechnung freigegeben", text: "Belege sind nummeriert – als Nächstes versenden." })}
      >
        <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-700">
          {[1, 2].map((n) => (
            <span key={n} className={n < auge ? "inline-flex items-center gap-1 rounded-full bg-ov-50 px-2.5 py-1 font-semibold text-ov-800 ring-1 ring-ov-200" : n === auge ? "inline-flex items-center gap-1 rounded-full bg-navy-700 px-2.5 py-1 font-semibold text-white" : "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-ink-500 ring-1 ring-ink-200"}>
              {n < auge && <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />}{n}. Auge{n === 1 ? " · Kassier" : " · Vorstand"}{n === auge ? " (Sie)" : ""}
            </span>
          ))}
        </div>
      </Rueckfrage>

      <Rueckfrage
        offen={dialog === "versenden"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        icon={Send}
        titel={`${anzahl || "Alle"} ${anzahl === 1 ? "Beleg" : "Belege"}${mitglieder ? ` an ${mitglieder} ${mitglieder === 1 ? "Mitglied" : "Mitglieder"}` : ""} versenden?`}
        text="Die Mitglieder erhalten ihre Rechnungen und Gutschriften auf dem gewählten Weg (Portal, E-Mail oder Post). Das lässt sich nicht rückgängig machen – Korrekturen gehen danach nur per Storno."
        fakten={fakten}
        folgen={["Rechnungen per Lastschrift: Die Vorabankündigung steht auf dem Beleg.", "Gutschriften werden im nächsten Zahlungslauf überwiesen."]}
        knopf="Ja, versenden"
        onBestaetigen={() => los({ aktion: "versenden" }, "Belege versendet.", { titel: `${anzahl || "Alle"} ${anzahl === 1 ? "Beleg" : "Belege"} versendet`, text: `Alles erledigt für ${zeitraum}. Als Nächstes: Zahlungslauf in der Kassa erstellen und die Periode abschließen.` })}
      />

      <Rueckfrage
        offen={dialog === "abschliessen"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        icon={FileCheck2}
        titel={`${zeitraum} abschließen?`}
        text="Die Periode wird festgeschrieben. Danach sind nur noch Stornos einzelner Belege möglich."
        fakten={fakten}
        folgen={["Abgeschlossene Perioden erscheinen im Prüfpfad für die Rechnungsprüfung."]}
        knopf="Ja, abschließen"
        onBestaetigen={() => los({ aktion: "abschliessen" }, "Periode abgeschlossen.", { titel: "Periode abgeschlossen", text: `${zeitraum} ist festgeschrieben.` })}
      />

      <Rueckfrage
        offen={dialog === "verwerfen"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        ton="danger"
        icon={Trash2}
        titel={`${zeitraum} verwerfen?`}
        text="Die Vorschau und alle Entwürfe dieser Periode werden verworfen. Es wurden noch keine Belege versendet."
        fakten={fakten}
        knopf="Ja, Periode verwerfen"
        onBestaetigen={() => los({ aktion: "verwerfen" }, "Periode verworfen.")}
      />

      <Rueckfrage
        offen={dialog === "storno"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        ton="danger"
        icon={Undo2}
        titel={`Alle Belege von ${zeitraum} stornieren?`}
        text="Zu jedem Beleg entsteht ein Stornobeleg mit Ihrem Grund. Die Mitglieder werden informiert."
        fakten={[...fakten, { label: "Grund", wert: grund || "–", breit: true }]}
        knopf="Ja, alle stornieren"
        onBestaetigen={() => los({ aktion: "stornieren", grund }, "Stornobelege erstellt.")}
      />
    </div>
  );
}

/** Einzelnen Beleg stornieren, optional mit Korrekturbeleg aus den aktuellen Daten */
export function BelegStorno({ api, belegId, nummer }) {
  const a = useAktion(api);
  const [offen, setOffen] = useState(false);
  const [grund, setGrund] = useState("");
  const [korrektur, setKorrektur] = useState(true);
  if (!offen) return <Knopf variante="gefahr" className="h-8 px-3 text-[12.5px]" onClick={() => setOffen(true)}><Undo2 aria-hidden="true" className="h-3.5 w-3.5" />Storno</Knopf>;
  return (
    <div className="mt-2 w-full space-y-2 rounded-2xl bg-sand-100/60 p-3 ring-1 ring-ink-200">
      <label className="block"><span className={labelKlasse}>Grund (Storno zu {nummer})</span><input className={eingabe} value={grund} onChange={(e) => setGrund(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-[13px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={korrektur} onChange={(e) => setKorrektur(e.target.checked)} />Korrekturbeleg mit den aktuellen Daten erstellen</label>
      <div className="flex gap-2">
        <Knopf variante="gefahr" disabled={a.laeuft || grund.trim().length < 5} onClick={() => a.ausfuehren({ aktion: "beleg_stornieren", belegId, grund, korrektur }, "Storno erstellt.")}><Lade an={a.laeuft} icon={Undo2} />Stornieren</Knopf>
        <Knopf onClick={() => setOffen(false)}>Abbrechen</Knopf>
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Probe-Abrechnung: Belege des Vorsystems einfügen und zeilengenau vergleichen */
export function ProbeVergleich({ api }) {
  const a = useAktion(api);
  const [csv, setCsv] = useState("mitgliedsnummer;typ;netto\n");
  return (
    <div className="space-y-2">
      <label className="block"><span className={labelKlasse}>Netto-Beträge aus dem Vorsystem (Mitgliedsnummer;rechnung|gutschrift;Netto)</span><textarea className={textbereich} value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} /></label>
      <Knopf variante="primary" disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "vergleich", csv }, "Vergleich erstellt.")}><Lade an={a.laeuft} icon={Calculator} />Vergleichen</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Zahlungslauf starten (Lastschrift bzw. Gutschriften-Überweisung) */
export function ZahlungslaufStart({ api, heute }) {
  const a = useAktion(api);
  const [art, setArt] = useState("pain008");
  const [am, setAm] = useState(heute);
  const [info, setInfo] = useState(null);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelKlasse}>Art</span>
          <select className={auswahlfeld} value={art} onChange={(e) => setArt(e.target.value)}><option value="pain008">SEPA-Lastschrift (Rechnungen)</option><option value="pain001">SEPA-Überweisung (Gutschriften)</option></select>
        </label>
        <label className="block"><span className={labelKlasse}>{art === "pain008" ? "Einzugsdatum" : "Ausführungsdatum"}</span><input type="date" className={eingabe} value={am} min={heute} onChange={(e) => setAm(e.target.value)} /></label>
      </div>
      <Knopf variante="primary" disabled={a.laeuft} onClick={async () => setInfo(await a.ausfuehren({ art, ausfuehrungAm: am }, "Zahlungslauf erstellt."))}><Lade an={a.laeuft} icon={Play} />Lauf erstellen</Knopf>
      {info?.lauf?.uebersprungen?.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-[12.5px] text-ink-600">{info.lauf.uebersprungen.slice(0, 12).map((u) => <li key={u.belegId}>{u.nummer}: {u.grund}</li>)}</ul>}
      {info?.hinweis && <p className="text-[13px] text-ink-600">{info.hinweis}</p>}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Knöpfe eines Zahlungslaufs: Freigabe (zweite Person), Download, eingereicht, verwerfen */
export function ZahlungslaufKnoepfe({ api, lauf, eigeneFreigabe }) {
  const a = useAktion(api);
  const [dialog, setDialog] = useState("");
  const art = lauf.artLabel || (lauf.art === "pain008" ? "SEPA-Lastschrift" : lauf.art === "pain001" ? "SEPA-Überweisung" : lauf.art);
  const fakten = [
    { label: "Art", wert: art, breit: true },
    { label: "Posten", wert: String(lauf.anzahl ?? "–") },
    { label: "Summe", wert: eur(lauf.summe) },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {lauf.status === "erzeugt" && !eigeneFreigabe && <Knopf variante="primary" className="h-9 px-3.5 text-[12.5px]" disabled={a.laeuft} onClick={() => setDialog("freigeben")}><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />Freigeben (2. Person)</Knopf>}
      {lauf.status === "erzeugt" && eigeneFreigabe && <span className="text-[12.5px] text-ink-500">wartet auf Freigabe durch eine zweite Person</span>}
      {["freigegeben", "eingereicht", "gebucht"].includes(lauf.status) && lauf.hatDatei && <a href={api} className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">XML herunterladen</a>}
      {lauf.status === "freigegeben" && <Knopf className="h-9 px-3.5 text-[12.5px]" disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "eingereicht" }, "Als eingereicht markiert.")}>Bei der Bank eingereicht</Knopf>}
      {["erzeugt", "freigegeben", "eingereicht"].includes(lauf.status) && <Knopf variante="gefahr" className="ml-auto h-9 px-3.5 text-[12.5px]" disabled={a.laeuft} onClick={() => setDialog("verwerfen")}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" />Verwerfen</Knopf>}
      {a.fehler && <span role="alert" className="text-[12.5px] text-danger-700">{a.fehler}</span>}
      <Rueckfrage
        offen={dialog === "freigeben"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        icon={ShieldCheck}
        titel="Zahlungslauf als zweite Person freigeben?"
        text="Nach Ihrer Freigabe steht die SEPA-Datei zum Download bereit und kann bei der Bank eingereicht werden."
        fakten={fakten}
        folgen={["Vier-Augen-Prinzip: Erstellt hat den Lauf eine andere Person."]}
        knopf="Ja, freigeben"
        onBestaetigen={async () => { await a.ausfuehren({ aktion: "freigeben" }, "Lauf freigegeben."); setDialog(""); }}
      />
      <Rueckfrage
        offen={dialog === "verwerfen"}
        onSchliessen={() => setDialog("")}
        laeuft={a.laeuft}
        ton="danger"
        icon={Trash2}
        titel={`Zahlungslauf mit ${lauf.anzahl ?? ""} Posten verwerfen?`}
        text={lauf.status === "eingereicht" ? "Achtung: Der Lauf ist bereits als eingereicht markiert. Verwerfen Sie ihn nur, wenn die Bank ihn nicht ausgeführt hat." : "Die Posten werden wieder frei und können in einen neuen Lauf aufgenommen werden."}
        fakten={fakten}
        knopf="Ja, Lauf verwerfen"
        onBestaetigen={async () => { await a.ausfuehren({ aktion: "verwerfen" }, "Lauf verworfen."); setDialog(""); }}
      />
    </div>
  );
}

/** Kontoauszug camt.053/054 einlesen: Vorschau mit Zuordnung, dann Übernahme */
export function CamtImport({ api }) {
  const a = useAktion(api);
  const [xml, setXml] = useState("");
  const [vorschau, setVorschau] = useState(null);
  const datei = async (e) => {
    const f = e.target.files?.[0];
    if (f) setXml(await f.text());
  };
  return (
    <div className="space-y-3">
      <label className="block"><span className={labelKlasse}>Kontoauszug (camt.053 oder camt.054, XML)</span><input type="file" accept=".xml,application/xml,text/xml" onChange={datei} className="block w-full text-[13.5px] text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-ov-50 file:px-4 file:py-2 file:font-semibold file:text-ov-800" /></label>
      <div className="flex flex-wrap gap-2">
        <Knopf disabled={a.laeuft || !xml} onClick={async () => setVorschau(await a.ausfuehren({ xml }, "Vorschau erstellt – bitte prüfen."))}><Lade an={a.laeuft} icon={FileUp} />Vorschau</Knopf>
        {vorschau?.anzahl > 0 && <Knopf variante="primary" disabled={a.laeuft} onClick={async () => { await a.ausfuehren({ xml, ausfuehren: true }, "Sichere Zuordnungen übernommen."); setVorschau(null); }}>Sichere Zuordnungen übernehmen</Knopf>}
      </div>
      {vorschau?.buchungen?.length > 0 && (
        <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200">
          {vorschau.buchungen.slice(0, 40).map((b, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[13px]">
              <span className="min-w-0"><span className="ov-num font-semibold">{eur(b.betrag)}</span> · {b.datum} · {b.name || "–"} <span className="text-ink-500">{b.zweck?.slice(0, 60)}</span></span>
              <span className={b.vorschlag.art === "sicher" ? "text-ov-700" : "text-ink-600"}>{b.vorschlag.text}</span>
            </li>
          ))}
        </ul>
      )}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Mahnlauf ausführen (nur fällige Vorschläge) */
export function MahnlaufKnopf({ api, anzahl }) {
  const a = useAktion(api);
  return (
    <div className="space-y-2">
      <Knopf variante="primary" disabled={a.laeuft || !anzahl} onClick={() => a.ausfuehren({}, "Mahnungen erstellt – Mitglieder mit Portalzugang wurden benachrichtigt.")}><Lade an={a.laeuft} icon={Send} />{anzahl ? `${anzahl} Mahnung${anzahl === 1 ? "" : "en"} erstellen` : "Nichts zu mahnen"}</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Zahlung zu einem Beleg manuell erfassen */
export function ZahlungErfassen({ api, offen, heute }) {
  const a = useAktion(api);
  const [f, setF] = useState({ betrag: String(offen).replace(".", ","), datum: heute, geldkonto: "2800", referenz: "" });
  const [auf, setAuf] = useState(false);
  if (!auf) return <Knopf className="h-8 px-3 text-[12.5px]" onClick={() => setAuf(true)}>Zahlung erfassen</Knopf>;
  return (
    <form className="mt-2 grid w-full gap-2 rounded-2xl bg-sand-100/60 p-3 ring-1 ring-ink-200 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); a.ausfuehren(f, "Zahlung gebucht."); }}>
      <input aria-label="Betrag" className={eingabe} value={f.betrag} onChange={(e) => setF({ ...f, betrag: e.target.value })} />
      <input aria-label="Datum" type="date" className={eingabe} value={f.datum} max={heute} onChange={(e) => setF({ ...f, datum: e.target.value })} />
      <select aria-label="Geldkonto" className={auswahlfeld} value={f.geldkonto} onChange={(e) => setF({ ...f, geldkonto: e.target.value })}><option value="2800">Bank</option><option value="2700">Kassa (bar)</option></select>
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>Buchen</Knopf>
      <div className="sm:col-span-4"><Meldung fehler={a.fehler} ok={a.ok} /></div>
    </form>
  );
}

/** Buchung (Bank oder Kassa) erfassen – Belegprinzip: jede Buchung braucht eine Belegnummer bzw. Quittung */
export function BuchungNeu({ api, konten = {}, heute }) {
  const a = useAktion(api);
  const leer = { datum: heute, konto: "7600", betrag: "", ustSatz: 0, text: "", geldkonto: "2700", belegNr: "" };
  const [f, setF] = useState(leer);
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await a.ausfuehren({ aktion: "buchung", daten: f }, "Gebucht.")) setF(leer); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelKlasse}>Datum</span><input type="date" className={eingabe} value={f.datum} max={heute} onChange={(e) => setF({ ...f, datum: e.target.value })} /></label>
        <label className="block"><span className={labelKlasse}>Geldkonto</span><select className={auswahlfeld} value={f.geldkonto} onChange={(e) => setF({ ...f, geldkonto: e.target.value })}><option value="2700">Kassa (bar)</option><option value="2800">Bank</option></select></label>
        <label className="block sm:col-span-2"><span className={labelKlasse}>Konto</span><select className={auswahlfeld} value={f.konto} onChange={(e) => setF({ ...f, konto: e.target.value })}>{Object.entries(konten).map(([nr, l]) => <option key={nr} value={nr}>{nr} · {l}</option>)}</select></label>
        <label className="block"><span className={labelKlasse}>Betrag brutto (€)</span><input inputMode="decimal" className={eingabe} value={f.betrag} onChange={(e) => setF({ ...f, betrag: e.target.value })} required /></label>
        <label className="block"><span className={labelKlasse}>USt-Satz</span><select className={auswahlfeld} value={f.ustSatz} onChange={(e) => setF({ ...f, ustSatz: Number(e.target.value) })}><option value={0}>0 %</option><option value={10}>10 %</option><option value={13}>13 %</option><option value={20}>20 %</option></select></label>
        <label className="block"><span className={labelKlasse}>Beleg bzw. Quittung</span><input className={eingabe} value={f.belegNr} onChange={(e) => setF({ ...f, belegNr: e.target.value })} required /></label>
        <label className="block"><span className={labelKlasse}>Buchungstext</span><input className={eingabe} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required /></label>
      </div>
      <Knopf variante="primary" type="submit" disabled={a.laeuft}><Lade an={a.laeuft} icon={FileCheck2} />Buchen</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </form>
  );
}

/** Prüfvermerk der Rechnungsprüfung (VerG § 21) */
export function Pruefvermerk({ api, jahr }) {
  const a = useAktion(api);
  const [f, setF] = useState({ ergebnis: "ohne_beanstandung", text: "", jahr, stichproben: "" });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "pruefvermerk", daten: { ...f, stichproben: f.stichproben.split(/,|;|\s+/).filter(Boolean) } }, "Prüfvermerk gespeichert."); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelKlasse}>Geschäftsjahr</span><input className={eingabe} inputMode="numeric" value={f.jahr} onChange={(e) => setF({ ...f, jahr: e.target.value })} /></label>
        <label className="block"><span className={labelKlasse}>Ergebnis</span><select className={auswahlfeld} value={f.ergebnis} onChange={(e) => setF({ ...f, ergebnis: e.target.value })}><option value="ohne_beanstandung">Ohne Beanstandung</option><option value="mit_hinweisen">Mit Hinweisen</option><option value="beanstandet">Beanstandet</option></select></label>
      </div>
      <label className="block"><span className={labelKlasse}>Geprüfte Belege (Stichproben, Nummern durch Komma getrennt)</span><input className={eingabe} value={f.stichproben} onChange={(e) => setF({ ...f, stichproben: e.target.value })} placeholder="RE-2026-00004, GU-2026-00002" /></label>
      <label className="block"><span className={labelKlasse}>Bericht an die Generalversammlung</span><textarea className={textbereich} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></label>
      <Knopf variante="primary" type="submit" disabled={a.laeuft}><Lade an={a.laeuft} icon={ShieldCheck} />Prüfvermerk erteilen</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </form>
  );
}

/** Einstellungen: Zahlungsziel, Mitgliedsbeitrag, Aufrechnung, Netzentgelt-AP (Ersparnisausweis), Referenzpreise */
export function Einstellungen({ api, einstellungen = {}, darfBuchhaltung, darfTarife }) {
  const a = useAktion(api);
  const [f, setF] = useState({ zahlungszielTage: einstellungen.zahlungszielTage ?? 14, mitgliedsbeitragArt: einstellungen.mitgliedsbeitragArt || "unecht", aufrechnung: einstellungen.aufrechnung !== false, netzApCt: einstellungen.netzApCt ?? "", referenzLieferantCt: einstellungen.referenzLieferantCt ?? "", referenzEinspeisungCt: einstellungen.referenzEinspeisungCt ?? "" });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "einstellungen", daten: f }, "Einstellungen gespeichert."); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={labelKlasse}>Zahlungsziel (Tage)</span><input className={eingabe} inputMode="numeric" value={f.zahlungszielTage} disabled={!darfBuchhaltung} onChange={(e) => setF({ ...f, zahlungszielTage: e.target.value })} /></label>
        <label className="block"><span className={labelKlasse}>Mitgliedsbeitrag</span><select className={auswahlfeld} value={f.mitgliedsbeitragArt} disabled={!darfBuchhaltung} onChange={(e) => setF({ ...f, mitgliedsbeitragArt: e.target.value })}><option value="unecht">unecht – Leistungsentgelt, USt wie Lieferung</option><option value="echt">echt – nicht steuerbar (zu bestätigen)</option></select></label>
        <label className="block"><span className={labelKlasse}>Netznutzungs-Arbeitspreis (ct/kWh, für den Ersparnisausweis)</span><input className={eingabe} inputMode="decimal" value={f.netzApCt} disabled={!darfBuchhaltung && !darfTarife} onChange={(e) => setF({ ...f, netzApCt: e.target.value })} /></label>
        <label className="block"><span className={labelKlasse}>Vergleichspreis Lieferant (ct/kWh netto)</span><input className={eingabe} inputMode="decimal" value={f.referenzLieferantCt} disabled={!darfBuchhaltung && !darfTarife} onChange={(e) => setF({ ...f, referenzLieferantCt: e.target.value })} /></label>
        <label className="block"><span className={labelKlasse}>Marktpreis Überschuss (ct/kWh, Erzeugervorteil)</span><input className={eingabe} inputMode="decimal" value={f.referenzEinspeisungCt} disabled={!darfBuchhaltung && !darfTarife} onChange={(e) => setF({ ...f, referenzEinspeisungCt: e.target.value })} /></label>
        <label className="flex items-center gap-2 pt-6 text-[13.5px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={f.aufrechnung} disabled={!darfBuchhaltung} onChange={(e) => setF({ ...f, aufrechnung: e.target.checked })} />Prosumer: Rechnung und Gutschrift verrechnen (Aufrechnungsvereinbarung)</label>
      </div>
      <Knopf variante="primary" type="submit" disabled={a.laeuft}><Lade an={a.laeuft} icon={FileCheck2} />Speichern</Knopf>
      <Meldung fehler={a.fehler} ok={a.ok} />
    </form>
  );
}

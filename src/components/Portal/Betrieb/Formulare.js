"use client";

// Betriebsführung (Backoffice): Formulare und Aktionen – Serviceaufträge, Versicherungsfälle, Ticketdaten (Ursache,
// Ertragsausfall), Wartungspläne, Prüfprotokolle, Ersatzteile, Einstrahlung, Freigabe von Zählerständen.
// Validierung, Zustandsautomaten und Berechnungen maßgeblich auf dem Server (/api/admin/anlagen/betrieb/**).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { FehlerBox, eingabe, auswahlfeld } from "@/components/Portal/felder";
import { Felder } from "@/components/Portal/Anlagen/AdminFormulare";
import { senden } from "@/lib/plattform/client";
import { WARTUNG_ARTEN } from "@/lib/plattform/anlagen";
import {
  AUFTRAG_ARTEN, AUFTRAG_STATUS, AUFTRAG_UEBERGAENGE, ERSATZTEIL_BEWEGUNG, PRUEF_ARTEN, PRUEF_PUNKTE, URSACHEN, VERSICHERUNG_ARTEN, VERSICHERUNG_STATUS, VERSICHERUNG_UEBERGAENGE,
} from "@/lib/plattform/betrieb/kern";
import { abfragen, bestaetigen as rueckfrage } from "@/components/ui/Rueckfrage";

const opt = (o) => Object.entries(o).map(([k, x]) => [k, typeof x === "string" ? x : x.label]);
const API = "/api/admin/anlagen/betrieb";

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  async function los(url, body, { erfolg = "Gespeichert.", danach } = {}) {
    setLaeuft(true);
    setFehler("");
    setOk("");
    try {
      const r = await senden(url, { body });
      setOk(typeof erfolg === "function" ? erfolg(r) : erfolg);
      danach?.(r);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, ok, los, setFehler };
}

function Meldung({ a }) {
  return (
    <>
      <FehlerBox>{a.fehler}</FehlerBox>
      {a.ok && <p role="status" className="text-[13.5px] font-semibold text-ov-700">{a.ok}</p>}
    </>
  );
}

/** Einfacher Aktionsknopf (optional mit Rückfrage) */
export function AktionKnopf({ url, body = {}, label, erfolg, variant = "secondary", bestaetigen = "", icon }) {
  const a = useAktion();
  return (
    <div className="space-y-2">
      <Button size="sm" variant={variant} icon={icon} disabled={a.laeuft} onClick={async () => (!bestaetigen || (await rueckfrage({ titel: bestaetigen, bestaetigenText: label, gefahr: variant === "danger" }))) && a.los(url, body, { erfolg: erfolg || ((r) => r?.ergebnis ? `${r.ergebnis.fristen} Fristen, ${r.ergebnis.sla} SLA-Verletzungen, ${r.ergebnis.lager} Nachbestellungen gemeldet.` : "Erledigt.") })}>
        {a.laeuft ? "Läuft …" : label}
      </Button>
      <Meldung a={a} />
    </div>
  );
}

/** Aufklappbares Formular aus einem Feldschema (Felder aus Anlagen/AdminFormulare) */
export function SchemaFormular({ url, schema, start = {}, knopf = "Hinzufügen", titel, body = (w) => w, erfolg = "Gespeichert.", offen: offenStart = false, variant = "secondary" }) {
  const [offen, setOffen] = useState(offenStart);
  const [werte, setWerte] = useState(start);
  const a = useAktion();
  if (!offen) return <Button size="sm" variant={variant} icon={Plus} onClick={() => setOffen(true)}>{knopf}</Button>;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await a.los(url, body(werte), { erfolg });
        if (r && !offenStart) {
          setOffen(false);
          setWerte(start);
        }
      }}
      className="space-y-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink-900">{titel || knopf}</p>
        {!offenStart && (
          <button type="button" onClick={() => setOffen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-600 hover:bg-white" aria-label="Schließen">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
      <Felder schema={schema} werte={werte} setzen={setWerte} praefix={`bf-${String(url).replace(/\W/g, "")}`} />
      <Meldung a={a} />
      <Button type="submit" size="sm" disabled={a.laeuft}>{a.laeuft ? "Speichert …" : "Speichern"}</Button>
    </form>
  );
}

// ---------------------------------------------------------------- Serviceauftrag

export function auftragSchema() {
  return [
    { name: "art", label: "Art", typ: "auswahl", optionen: opt(AUFTRAG_ARTEN), pflicht: true },
    { name: "dienstleister", label: "Auftragnehmer", typ: "text", pflicht: true, hinweis: "Techniker, O&M-Dienstleister, Hersteller bzw. Netzbetreiber" },
    { name: "kontakt", label: "Ansprechpartner / Kontaktweg", typ: "text" },
    { name: "termin", label: "Wunschtermin", typ: "datum" },
    { name: "kostenEur", label: "Kostenrahmen (€ netto)", typ: "zahl" },
    { name: "bestellnummer", label: "Bestellnummer", typ: "text" },
    { name: "beschreibung", label: "Leistungsbeschreibung", typ: "textarea", pflicht: true, breit: true },
  ];
}

export function NeuerAuftrag({ anlageId, stoerungId = null, planId = null, knopf = "Serviceauftrag anlegen", vorbelegung = {} }) {
  return <SchemaFormular url={`${API}/auftraege`} schema={auftragSchema()} start={{ art: "dienstleister", ...vorbelegung }} knopf={knopf} body={(w) => ({ ...w, anlageId, stoerungId, planId })} erfolg="Auftrag angelegt – jetzt beauftragen und das Auftragsschreiben (PDF) senden." />;
}

export function AuftragAktionen({ auftrag: x }) {
  const a = useAktion();
  const [termin, setTermin] = useState(x.termin || "");
  const [bericht, setBericht] = useState(x.bericht || "");
  const [grund, setGrund] = useState("");
  const [modus, setModus] = useState("");
  const weiter = AUFTRAG_UEBERGAENGE[x.status] || [];
  const url = `${API}/auftraege/${x.id}`;
  if (!weiter.length) return null;
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {weiter.map((s) => (
          <button key={s} type="button" disabled={a.laeuft} onClick={() => (["terminiert", "erledigt", "storniert"].includes(s) ? setModus(modus === s ? "" : s) : a.los(url, { status: s }, { erfolg: `Status: ${AUFTRAG_STATUS[s]}` }))} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset disabled:opacity-50", s === "storniert" ? "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50" : s === "erledigt" ? "bg-ov-600 text-white ring-ov-600 hover:bg-ov-700" : "bg-navy-700 text-white ring-navy-700 hover:bg-navy-800")}>
            {AUFTRAG_STATUS[s]}
          </button>
        ))}
      </div>
      {modus === "terminiert" && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); a.los(url, { status: "terminiert", termin }, { erfolg: "Termin gespeichert – Kunde wurde informiert." }); }}>
          <label className="text-[13px] font-semibold text-ink-700">Termin<input type="datetime-local" required value={termin} onChange={(e) => setTermin(e.target.value)} className={cn(eingabe, "mt-1")} /></label>
          <Button type="submit" size="sm" disabled={a.laeuft}>Termin setzen</Button>
        </form>
      )}
      {modus === "erledigt" && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); a.los(url, { status: "erledigt", bericht }, { erfolg: "Auftrag abgeschlossen." }); }}>
          <label className="block text-[13px] font-semibold text-ink-700">Einsatzbericht (Befund, Maßnahme, Material)<textarea required minLength={10} value={bericht} onChange={(e) => setBericht(e.target.value)} className={cn(eingabe, "mt-1 h-24 py-2")} /></label>
          <Button type="submit" size="sm" disabled={a.laeuft}>Abschließen</Button>
        </form>
      )}
      {modus === "storniert" && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); a.los(url, { status: "storniert", grund }, { erfolg: "Auftrag storniert." }); }}>
          <label className="text-[13px] font-semibold text-ink-700">Stornogrund<input required value={grund} onChange={(e) => setGrund(e.target.value)} className={cn(eingabe, "mt-1")} /></label>
          <Button type="submit" size="sm" variant="secondary" disabled={a.laeuft}>Stornieren</Button>
        </form>
      )}
      <Meldung a={a} />
    </div>
  );
}

// ---------------------------------------------------------------- Versicherungsfall

export function versicherungSchema() {
  return [
    { name: "art", label: "Versicherung", typ: "auswahl", optionen: opt(VERSICHERUNG_ARTEN), pflicht: true },
    { name: "versicherer", label: "Versicherer", typ: "text", pflicht: true },
    { name: "police", label: "Polizzen-/Versicherungsnummer", typ: "text" },
    { name: "schadentag", label: "Schadentag", typ: "datum", pflicht: true },
    { name: "schadenEur", label: "Geschätzter Sachschaden (€)", typ: "zahl" },
    { name: "selbstbehaltEur", label: "Selbstbehalt (€)", typ: "zahl" },
    { name: "ertragsausfallEur", label: "Ertragsausfall (€, leer = aus Ticket)", typ: "zahl" },
    { name: "schadenbeschreibung", label: "Schadenbeschreibung", typ: "textarea", pflicht: true, breit: true, hinweis: "Hergang, betroffene Teile, Fotos/Befunde als Dokument ablegen." },
  ];
}

export function NeuerVersicherungsfall({ anlageId, stoerungId = null, vorbelegung = {} }) {
  return <SchemaFormular url={`${API}/versicherungen`} schema={versicherungSchema()} start={{ art: "allgefahren", ...vorbelegung }} knopf="Versicherungsfall anlegen" body={(w) => ({ ...w, anlageId, stoerungId })} erfolg="Versicherungsfall angelegt – Meldefrist läuft." />;
}

export function VersicherungAktionen({ fall: x }) {
  const a = useAktion();
  const [modus, setModus] = useState("");
  const [wert, setWert] = useState("");
  const [nummer, setNummer] = useState(x.schadennummer || "");
  const weiter = VERSICHERUNG_UEBERGAENGE[x.status] || [];
  const url = `${API}/versicherungen/${x.id}`;
  if (!weiter.length) return null;
  const senden_ = (e) => {
    e.preventDefault();
    const body = modus === "reguliert" ? { status: modus, erstattetEur: wert } : modus === "gemeldet" ? { status: modus, schadennummer: nummer } : { status: modus, grund: wert };
    a.los(url, body, { erfolg: `Status: ${VERSICHERUNG_STATUS[modus]}` }).then((r) => r && setModus(""));
  };
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {weiter.map((s) => (
          <button key={s} type="button" disabled={a.laeuft} onClick={() => (s === "in_pruefung" ? a.los(url, { status: s }, { erfolg: "Status: In Prüfung" }) : (setModus(modus === s ? "" : s), setWert("")))} className={cn("inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset disabled:opacity-50", ["abgelehnt", "zurueckgezogen"].includes(s) ? "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50" : "bg-navy-700 text-white ring-navy-700 hover:bg-navy-800")}>
            {s === "gemeldet" ? "Als gemeldet erfassen" : VERSICHERUNG_STATUS[s]}
          </button>
        ))}
      </div>
      {modus && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={senden_}>
          {modus === "gemeldet" ? (
            <label className="text-[13px] font-semibold text-ink-700">Schadennummer (falls vergeben)<input value={nummer} onChange={(e) => setNummer(e.target.value)} className={cn(eingabe, "mt-1")} /></label>
          ) : (
            <label className="text-[13px] font-semibold text-ink-700">{modus === "reguliert" ? "Erstattet (€)" : "Begründung"}<input required value={wert} inputMode={modus === "reguliert" ? "decimal" : undefined} onChange={(e) => setWert(e.target.value)} className={cn(eingabe, "mt-1")} /></label>
          )}
          <Button type="submit" size="sm" disabled={a.laeuft}>Bestätigen</Button>
        </form>
      )}
      <Meldung a={a} />
    </div>
  );
}

// ---------------------------------------------------------------- Ticket: Ursache, Ertragsausfall, Beheben

const lokal = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function TicketFormular({ ticket: t }) {
  const a = useAktion();
  const b = useAktion();
  const [w, setW] = useState({
    ursacheKategorie: t.ursacheKategorie || "", ursacheText: t.ursacheText || "", massnahme: t.massnahme || "",
    ausfallBeginn: lokal(t.ausfallBeginn || t.erkanntAm), ausfallEnde: lokal(t.ausfallEnde || t.behobenAm || ""), betroffenPct: t.betroffenPct ?? (t.regel === "offline" ? 100 : ""),
  });
  const setzen = (k) => (e) => setW({ ...w, [k]: e.target.value });
  const iso = (x) => (x ? new Date(x).toISOString() : "");
  const speichern = (e) => {
    e.preventDefault();
    a.los(`${API}/stoerung/${t.id}`, { aktion: "speichern", daten: { ...w, ausfallBeginn: iso(w.ausfallBeginn), ausfallEnde: iso(w.ausfallEnde) } }, { erfolg: "Ticket gespeichert – Ertragsausfall neu berechnet." });
  };
  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13.5px] font-semibold text-ink-700 sm:col-span-2">Ursache
          <select value={w.ursacheKategorie} onChange={setzen("ursacheKategorie")} className={cn(auswahlfeld, "mt-1.5")}>
            <option value="">– noch offen –</option>
            {opt(URSACHEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="block text-[13.5px] font-semibold text-ink-700 sm:col-span-2">Ursache – Details<textarea value={w.ursacheText} onChange={setzen("ursacheText")} className={cn(eingabe, "mt-1.5 h-20 py-2")} maxLength={1000} /></label>
        <label className="block text-[13.5px] font-semibold text-ink-700 sm:col-span-2">Maßnahme<textarea value={w.massnahme} onChange={setzen("massnahme")} className={cn(eingabe, "mt-1.5 h-20 py-2")} maxLength={1000} /></label>
        <label className="block text-[13.5px] font-semibold text-ink-700">Ausfall von<input type="datetime-local" value={w.ausfallBeginn} onChange={setzen("ausfallBeginn")} className={cn(eingabe, "mt-1.5")} /></label>
        <label className="block text-[13.5px] font-semibold text-ink-700">Ausfall bis<input type="datetime-local" value={w.ausfallEnde} onChange={setzen("ausfallEnde")} className={cn(eingabe, "mt-1.5")} /></label>
        <label className="block text-[13.5px] font-semibold text-ink-700">Betroffener Anteil (%)<input inputMode="decimal" value={w.betroffenPct} onChange={setzen("betroffenPct")} className={cn(eingabe, "mt-1.5")} /><span className="mt-1 block text-[12px] font-normal text-ink-500">100 = Totalausfall, z. B. 1 von 4 Wechselrichtern = 25</span></label>
        <div className="flex items-end">
          <button type="button" onClick={() => setW({ ...w, ausfallEnde: lokal(new Date().toISOString()) })} className="h-11 rounded-full px-4 text-[13.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50">Ende = jetzt</button>
        </div>
      </div>
      <Meldung a={a} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={a.laeuft}>{a.laeuft ? "Speichert …" : "Speichern & Ertragsausfall berechnen"}</Button>
        {t.status !== "behoben" && (
          <Button type="button" size="sm" variant="navy" icon={Check} disabled={b.laeuft} onClick={async () => (await rueckfrage({ titel: "Störung als behoben melden?", text: "Kunde und Team werden informiert.", bestaetigenText: "Behoben melden" })) && b.los(`${API}/stoerung/${t.id}`, { aktion: "beheben" }, { erfolg: "Störung behoben – Kunde informiert." })}>
            Behoben melden
          </Button>
        )}
      </div>
      <Meldung a={b} />
    </form>
  );
}

// ---------------------------------------------------------------- Wartungsplan

export function planSchema() {
  return [
    { name: "art", label: "Art", typ: "auswahl", optionen: opt(WARTUNG_ARTEN), pflicht: true },
    { name: "bezeichnung", label: "Bezeichnung", typ: "text", pflicht: true, breit: true },
    { name: "intervallMonate", label: "Intervall (Monate)", typ: "zahl", pflicht: true },
    { name: "naechsteFaelligkeit", label: "Nächste Fälligkeit", typ: "datum", pflicht: true },
    { name: "vorlaufTage", label: "Vorlauf (Tage, Aufgabe)", typ: "zahl" },
    { name: "dienstleister", label: "Dienstleister", typ: "text" },
    { name: "norm", label: "Grundlage / Norm", typ: "text", breit: true },
    { name: "aktiv", label: "Aktiv", typ: "check" },
  ];
}

export function NeuerPlan({ anlageId }) {
  return <SchemaFormular url={`${API}/anlage/${anlageId}`} schema={planSchema()} start={{ art: "inspektion", intervallMonate: "12", vorlaufTage: "30", aktiv: true }} knopf="Wartungsplan anlegen" body={(w) => ({ aktion: "plan", daten: w })} erfolg="Wartungsplan angelegt." />;
}

export function PlanBearbeiten({ anlageId, plan }) {
  const [offen, setOffen] = useState(false);
  const a = useAktion();
  if (!offen) {
    return (
      <div className="flex gap-1">
        <button type="button" onClick={() => setOffen(true)} className="h-8 rounded-full px-3 text-[12.5px] font-semibold text-ov-700 hover:bg-ov-50">Bearbeiten</button>
        <button type="button" aria-label="Plan löschen" onClick={async () => (await rueckfrage({ titel: "Wartungsplan löschen?", text: "Der Plan wird dauerhaft entfernt.", bestaetigenText: "Plan löschen", gefahr: true })) && a.los(`${API}/anlage/${anlageId}`, { aktion: "planLoeschen", id: plan.id }, { erfolg: "Gelöscht." })} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-danger-50 hover:text-danger-700"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
        <FehlerBox>{a.fehler}</FehlerBox>
      </div>
    );
  }
  return <div className="mt-3 w-full"><SchemaFormular url={`${API}/anlage/${anlageId}`} schema={planSchema()} start={{ ...plan }} titel="Plan bearbeiten" offen body={(w) => ({ aktion: "plan", daten: { ...w, id: plan.id } })} erfolg="Plan gespeichert." /></div>;
}

// ---------------------------------------------------------------- Prüfprotokoll

const leerString = (i) => ({ bezeichnung: `String ${i}`, uocV: "", uocSollV: "", iscA: "", rIsoMOhm: "" });

export function ProtokollFormular({ anlageId, plaene = [] }) {
  const [offen, setOffen] = useState(false);
  const [kopf, setKopf] = useState({ art: "wiederkehrend", datum: new Date().toISOString().slice(0, 10), pruefer: "", firma: "", norm: "", einstrahlungWm2: "", planId: "", bemerkung: "" });
  const [strings, setStrings] = useState([leerString(1), leerString(2)]);
  const [punkte, setPunkte] = useState({});
  const [thermo, setThermo] = useState([]);
  const [maengel, setMaengel] = useState([]);
  const a = useAktion();
  if (!offen) return <Button size="sm" icon={Plus} onClick={() => setOffen(true)}>Prüfprotokoll erfassen</Button>;
  const zelle = (liste, setListe, i, k) => (
    <input value={liste[i][k]} onChange={(e) => setListe(liste.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} inputMode={k === "bezeichnung" || k === "ort" || k === "text" ? undefined : "decimal"} aria-label={k} className="h-10 w-full min-w-[70px] rounded-xl border border-ink-200 bg-white px-2 text-[13.5px]" />
  );
  const setK = (k) => (e) => setKopf({ ...kopf, [k]: e.target.value });
  return (
    <form
      className="space-y-5 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await a.los(`${API}/anlage/${anlageId}`, { aktion: "protokoll", daten: { ...kopf, planId: kopf.planId || null, strings, punkte, thermografie: thermo, maengel } }, { erfolg: (x) => `Protokoll ${x.protokoll.id}: ${x.protokoll.ergebnisLabel}${x.protokoll.stoerungId ? " – Störung für die Mängel angelegt." : ""}` });
        if (r) setOffen(false);
      }}
    >
      <div className="flex items-center justify-between"><p className="font-semibold text-ink-900">Prüfprotokoll erfassen</p><button type="button" onClick={() => setOffen(false)} aria-label="Schließen" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white"><X aria-hidden="true" className="h-4 w-4" /></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] font-semibold text-ink-700">Art<select value={kopf.art} onChange={setK("art")} className={cn(auswahlfeld, "mt-1")}>{opt(PRUEF_ARTEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-[13px] font-semibold text-ink-700">Wartungsplan<select value={kopf.planId} onChange={setK("planId")} className={cn(auswahlfeld, "mt-1")}><option value="">– automatisch nach Art –</option>{plaene.map((p) => <option key={p.id} value={p.id}>{p.bezeichnung}</option>)}</select></label>
        <label className="text-[13px] font-semibold text-ink-700">Prüfdatum<input type="date" required value={kopf.datum} onChange={setK("datum")} className={cn(eingabe, "mt-1")} /></label>
        <label className="text-[13px] font-semibold text-ink-700">Einstrahlung bei Messung (W/m²)<input inputMode="decimal" value={kopf.einstrahlungWm2} onChange={setK("einstrahlungWm2")} className={cn(eingabe, "mt-1")} /></label>
        <label className="text-[13px] font-semibold text-ink-700">Prüfer (Elektrofachkraft)<input required value={kopf.pruefer} onChange={setK("pruefer")} className={cn(eingabe, "mt-1")} /></label>
        <label className="text-[13px] font-semibold text-ink-700">Firma<input value={kopf.firma} onChange={setK("firma")} className={cn(eingabe, "mt-1")} /></label>
        <label className="text-[13px] font-semibold text-ink-700 sm:col-span-2">Grundlage / Norm<input value={kopf.norm} onChange={setK("norm")} placeholder="z. B. DIN EN 62446-1, DGUV V3 / OVE E 8101 / NIV" className={cn(eingabe, "mt-1")} /></label>
      </div>
      {kopf.art !== "thermografie" && kopf.art !== "reinigung" && (
        <fieldset>
          <legend className="text-[13.5px] font-semibold text-ink-900">Messwerte je String (IEC 62446-1)</legend>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="py-1 pr-2">String</th><th className="pr-2">Uoc [V]</th><th className="pr-2">Uoc Soll [V]</th><th className="pr-2">Isc [A]</th><th className="pr-2">Riso [MΩ]</th><th /></tr></thead>
              <tbody>
                {strings.map((s, i) => (
                  <tr key={i}>
                    {["bezeichnung", "uocV", "uocSollV", "iscA", "rIsoMOhm"].map((k) => <td key={k} className="py-1 pr-2">{zelle(strings, setStrings, i, k)}</td>)}
                    <td><button type="button" aria-label="Zeile entfernen" onClick={() => setStrings(strings.filter((_, j) => j !== i))} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-white"><Trash2 aria-hidden="true" className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setStrings([...strings, leerString(strings.length + 1)])} className="mt-2 text-[13px] font-semibold text-ov-700">+ String</button>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(PRUEF_PUNKTE).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-[13px] ring-1 ring-inset ring-ink-200">
                <span className="min-w-0">{l}</span>
                <select value={punkte[k] === undefined ? "" : punkte[k] ? "ja" : "nein"} onChange={(e) => setPunkte({ ...punkte, [k]: e.target.value === "" ? undefined : e.target.value === "ja" })} className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-[13px]">
                  <option value="">–</option><option value="ja">i. O.</option><option value="nein">nicht i. O.</option>
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="text-[13.5px] font-semibold text-ink-900">Thermografie-Befunde (ΔT gegenüber Referenz)</legend>
        {thermo.map((t, i) => (
          <div key={i} className="mt-2 grid grid-cols-[1fr_90px_1.4fr_40px] gap-2">
            {zelle(thermo, setThermo, i, "ort")}{zelle(thermo, setThermo, i, "deltaK")}{zelle(thermo, setThermo, i, "text")}
            <button type="button" aria-label="Befund entfernen" onClick={() => setThermo(thermo.filter((_, j) => j !== i))} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-white"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setThermo([...thermo, { ort: "", deltaK: "", text: "" }])} className="mt-2 text-[13px] font-semibold text-ov-700">+ Befund (Ort, ΔT in K, Beschreibung)</button>
      </fieldset>
      <fieldset>
        <legend className="text-[13.5px] font-semibold text-ink-900">Weitere Mängel</legend>
        {maengel.map((m, i) => (
          <div key={i} className="mt-2 grid grid-cols-[1fr_130px_40px] gap-2">
            {zelle(maengel, setMaengel, i, "text")}
            <select value={m.schwere} onChange={(e) => setMaengel(maengel.map((x, j) => (j === i ? { ...x, schwere: e.target.value } : x)))} className="h-10 rounded-xl border border-ink-200 bg-white px-2 text-[13px]" aria-label="Schwere"><option value="gering">gering</option><option value="mittel">mittel</option><option value="gefahr">Gefahr</option></select>
            <button type="button" aria-label="Mangel entfernen" onClick={() => setMaengel(maengel.filter((_, j) => j !== i))} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-white"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setMaengel([...maengel, { text: "", schwere: "mittel" }])} className="mt-2 text-[13px] font-semibold text-ov-700">+ Mangel</button>
      </fieldset>
      <label className="block text-[13px] font-semibold text-ink-700">Bemerkung<textarea value={kopf.bemerkung} onChange={setK("bemerkung")} className={cn(eingabe, "mt-1 h-20 py-2")} /></label>
      <p className="text-[12.5px] text-ink-500">Die Bewertung (bestanden / Mängel / nicht bestanden) berechnet der Server aus Messwerten, Prüfpunkten und Befunden; Mängel legen automatisch eine Störung im Leitstand an. Das Ergebnis verantwortet die prüfende Elektrofachkraft.</p>
      <Meldung a={a} />
      <Button type="submit" size="sm" disabled={a.laeuft}>{a.laeuft ? "Speichert …" : "Protokoll speichern"}</Button>
    </form>
  );
}

// ---------------------------------------------------------------- Ersatzteile

export function ersatzteilSchema() {
  return [
    { name: "bezeichnung", label: "Bezeichnung", typ: "text", pflicht: true, breit: true },
    { name: "art", label: "Passend für", typ: "auswahl", optionen: [["wechselrichter", "Wechselrichter"], ["modul", "PV-Module / DC"], ["speicher", "Speicher"], ["zaehler", "Zähler"], ["datenlogger", "Datenlogger"], ["sonstiges", "Sonstiges"]] },
    { name: "hersteller", label: "Hersteller", typ: "text" },
    { name: "artikelnummer", label: "Artikelnummer", typ: "text" },
    { name: "bestand", label: "Anfangsbestand", typ: "zahl" },
    { name: "mindestbestand", label: "Mindestbestand", typ: "zahl" },
    { name: "zielbestand", label: "Zielbestand (Nachbestellung)", typ: "zahl" },
    { name: "lagerort", label: "Lagerort", typ: "text" },
    { name: "einheit", label: "Einheit", typ: "text" },
  ];
}

export function NeuesErsatzteil() {
  return <SchemaFormular url={`${API}/ersatzteile`} schema={ersatzteilSchema()} start={{ art: "wechselrichter", einheit: "Stück", mindestbestand: "1" }} knopf="Artikel anlegen" erfolg="Artikel angelegt." />;
}

export function BewegungFormular({ teil, anlagen = [], stoerungId = null, anlageId = null }) {
  const [w, setW] = useState({ bewegung: stoerungId ? "entnahme" : "zugang", menge: "", anlageId: anlageId || "", bemerkung: "" });
  const a = useAktion();
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); a.los(`${API}/ersatzteile/${teil.id}`, { ...w, stoerungId }, { erfolg: (r) => `Bestand jetzt ${r.teil.bestand} ${teil.einheit || ""}`.trim() }).then((r) => r && setW({ ...w, menge: "", bemerkung: "" })); }}>
      <label className="text-[12.5px] font-semibold text-ink-700">Buchung<select value={w.bewegung} onChange={(e) => setW({ ...w, bewegung: e.target.value })} className="mt-1 block h-10 rounded-xl border border-ink-200 bg-white px-2 text-[13px]">{opt(ERSATZTEIL_BEWEGUNG).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label className="text-[12.5px] font-semibold text-ink-700">Menge<input required inputMode="decimal" value={w.menge} onChange={(e) => setW({ ...w, menge: e.target.value })} className="mt-1 block h-10 w-20 rounded-xl border border-ink-200 bg-white px-2 text-[13px]" /></label>
      {w.bewegung === "entnahme" && !stoerungId && (
        <label className="text-[12.5px] font-semibold text-ink-700">Anlage<select required value={w.anlageId} onChange={(e) => setW({ ...w, anlageId: e.target.value })} className="mt-1 block h-10 max-w-[200px] rounded-xl border border-ink-200 bg-white px-2 text-[13px]"><option value="">– wählen –</option>{anlagen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      )}
      <label className="text-[12.5px] font-semibold text-ink-700">Bemerkung<input value={w.bemerkung} onChange={(e) => setW({ ...w, bemerkung: e.target.value })} className="mt-1 block h-10 w-40 rounded-xl border border-ink-200 bg-white px-2 text-[13px]" /></label>
      <Button type="submit" size="sm" variant="secondary" disabled={a.laeuft}>Buchen</Button>
      <div className="basis-full"><Meldung a={a} /></div>
    </form>
  );
}

// ---------------------------------------------------------------- Einstrahlung, Freigabe

export function EinstrahlungFormular({ anlageId }) {
  const monat = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  return (
    <SchemaFormular
      url={`${API}/anlage/${anlageId}`}
      schema={[
        { name: "monat", label: "Monat", typ: "monat", pflicht: true },
        { name: "kwhM2", label: "Einstrahlung Modulebene (kWh/m²)", typ: "zahl", pflicht: true },
        { name: "quelle", label: "Quelle", typ: "text", pflicht: true, breit: true, hinweis: "Pyranometer/Referenzzelle vor Ort oder Satellitendaten (Anbieter nennen)" },
      ]}
      start={{ monat }}
      knopf="Einstrahlung erfassen"
      body={(w) => ({ aktion: "einstrahlung", ...w })}
      erfolg="Einstrahlung gespeichert – Performance Ratio aktualisiert."
    />
  );
}

export function FreigabeKnopf({ anlageId, zeile }) {
  const a = useAktion();
  const freigeben = async () => {
    let begruendung = "";
    if (zeile.befund.stufe === "fehler") {
      begruendung = (await abfragen({ titel: "Auffälligen Wert freigeben?", text: "Der Wert ist auffällig. Die Freigabe braucht eine Begründung.", details: [{ label: "Monat", wert: zeile.monat }, { label: "Register", wert: zeile.register }], label: "Begründung", pflicht: true, mindestlaenge: 10, mehrzeilig: true, bestaetigenText: "Freigeben" })) || "";
      if (!begruendung) return;
    }
    a.los(`${API}/anlage/${anlageId}`, { aktion: "freigabe", messpunktId: zeile.messpunktId, register: zeile.register, monat: zeile.monat, begruendung }, { erfolg: "Freigegeben – steht der Contracting-Abrechnung zur Verfügung." });
  };
  return (
    <div>
      <button type="button" disabled={a.laeuft || zeile.befund.eichFehler} onClick={freigeben} className="h-8 rounded-full bg-ov-600 px-3 text-[12.5px] font-semibold text-white hover:bg-ov-700 disabled:cursor-not-allowed disabled:bg-ink-300">Freigeben</button>
      {a.fehler && <p className="mt-1 max-w-[220px] text-[12px] text-danger-700">{a.fehler}</p>}
    </div>
  );
}

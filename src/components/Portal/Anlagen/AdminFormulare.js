"use client";

// Backoffice-Formulare „Anlagen & Monitoring“: Assistent „Anlage anlegen“, Stammdaten, Einträge (Komponenten,
// Messpunkte, Wartungen, Vertrag, Monatswerte) und manuelle Störung. Validierung maßgeblich auf dem Server.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { BUNDESLAENDER, LAENDER } from "@/lib/plattform/konstanten";
import {
  ANLAGE_STATUS, ANLAGE_TYPEN, KOMPONENTEN_ARTEN, LASTPROFILE, MESSPUNKT_ARTEN, MESSSTELLEN, STOERUNG_SCHWERE, WARTUNG_ARTEN, WARTUNG_STATUS, kwpText, prognoseJahrKwh, kwh, regionFuer,
} from "@/lib/plattform/anlagen";
import { bestaetigen } from "@/components/ui/Rueckfrage";
import { BETRIEBSFUEHRER_STANDARD, DIENSTBARKEIT_STATUS, EIGENTUEMER_STANDARD, ENDSCHAFT, INDEX_BASIS } from "@/lib/plattform/anlagen"; // Eigentum & Vertragsdetails

const opt = (obj) => Object.entries(obj).map(([id, v]) => [id, typeof v === "string" ? v : v.label]);

// ---------------------------------------------------------------- Feldschemata

export function anlageSchema(kunden, land) {
  return [
    { name: "name", label: "Bezeichnung", typ: "text", pflicht: true, breit: true, hinweis: "Wie der Kunde die Anlage kennt, z. B. „Gewerbedach Halle 3“." },
    { name: "typ", label: "Anlagentyp", typ: "auswahl", optionen: opt(ANLAGE_TYPEN), pflicht: true },
    { name: "status", label: "Status", typ: "auswahl", optionen: opt(ANLAGE_STATUS), pflicht: true },
    { name: "inbetriebnahme", label: "Inbetriebnahme", typ: "datum" },
    { name: "land", label: "Land", typ: "auswahl", optionen: opt(LAENDER), pflicht: true },
    { name: "bundesland", label: land === "CH" ? "Kanton" : "Bundesland", typ: "auswahl", optionen: (BUNDESLAENDER[land] || []).map((b) => [b, b]), pflicht: true },
    { name: "ort", label: "Standort (grob)", typ: "text", hinweis: "Nur grob, z. B. „Raum Augsburg“ – keine Adresse." },
    { name: "kwp", label: "PV-Leistung (kWp)", typ: "zahl" },
    { name: "wechselrichterAnzahl", label: "Anzahl Wechselrichter", typ: "zahl" },
    { name: "speicherKwh", label: "Speicher (kWh)", typ: "zahl" },
    { name: "speicherKw", label: "Speicherleistung (kW)", typ: "zahl" },
    { name: "lastprofil", label: "Verbraucher vor Ort", typ: "auswahl", optionen: opt(LASTPROFILE) },
    { name: "lastJahrKwh", label: "Verbrauch pro Jahr (kWh)", typ: "zahl", hinweis: "Für Plausibilisierung und Eigenverbrauchsprognose." },
    { name: "kundeId", label: "Kundenkonto (Ansprechpartner)", typ: "auswahl", optionen: (kunden?.konten || []).map((k) => [k.id, `${k.name}${k.firma ? ` – ${k.firma}` : ""}`]), leer: "– kein Konto –" },
    { name: "organisationId", label: "Organisation (Team des Kunden)", typ: "auswahl", optionen: (kunden?.organisationen || []).map((o) => [o.id, o.name]), leer: "– keine Organisation –", hinweis: "Alle Mitglieder der Organisation sehen die Anlage." },
    // Eigentum & Betrieb: Anlage im Eigentum von ÖkoInvest bzw. einer Projektgesellschaft; Kunde = Stromabnehmer
    { name: "eigentuemerId", label: "Eigentümergesellschaft aus dem Verzeichnis", typ: "auswahl", optionen: (kunden?.gesellschaften || []).map((g) => [g.id, g.name]), leer: "– nicht verknüpft –", hinweis: "Bei Auswahl wird der Name übernommen." },
    { name: "eigentuemer", label: "Eigentümergesellschaft (Name)", typ: "text", pflicht: true, hinweis: "ÖkoInvest GmbH oder Projektgesellschaft (SPV)." },
    { name: "betriebsfuehrer", label: "Betriebsführer", typ: "text" },
    { name: "finanziertDurch", label: "Finanziert durch (intern)", typ: "text", hinweis: "Bank/Finanzierung; Covenants folgen in einem eigenen Modul." },
    { name: "dachgeberIstKunde", label: "Dachgeber bzw. Grundstückseigentümer ist der Stromabnehmer", typ: "check" },
    { name: "dachgeber", label: "Dachgeber / Grundstückseigentümer (falls abweichend)", typ: "text" },
    { name: "dienstbarkeitStatus", label: "Dienstbarkeit / Servitut", typ: "auswahl", optionen: opt(DIENSTBARKEIT_STATUS), leer: "– noch nicht geklärt –" },
    { name: "dienstbarkeitDatum", label: "Datum Antrag bzw. Eintragung", typ: "datum" },
    { name: "dienstbarkeitHinweis", label: "Grundbuch-Hinweis", typ: "text", hinweis: "z. B. Abteilung II, lfd. Nr. – bzw. AT: EZ/KG" },
    { name: "dienstbarkeitDokumentId", label: "Dokument (Grundbuchauszug, Kennung D-…)", typ: "text" },
    { name: "beschreibung", label: "Beschreibung", typ: "textarea", breit: true },
  ];
}

export const EINTRAG_SCHEMA = {
  komponente: [
    { name: "art", label: "Art", typ: "auswahl", optionen: opt(KOMPONENTEN_ARTEN), pflicht: true },
    { name: "hersteller", label: "Hersteller", typ: "text" },
    { name: "modell", label: "Modell", typ: "text" },
    { name: "seriennummer", label: "Seriennummer", typ: "text" },
    { name: "anzahl", label: "Anzahl", typ: "zahl" },
    { name: "leistungKw", label: "Leistung (kW)", typ: "zahl" },
    { name: "kapazitaetKwh", label: "Kapazität (kWh)", typ: "zahl" },
    { name: "inbetriebnahme", label: "Inbetriebnahme", typ: "datum" },
    { name: "garantieBis", label: "Garantie bis", typ: "datum" },
    { name: "bemerkung", label: "Bemerkung", typ: "text", breit: true },
  ],
  messpunkt: [
    { name: "bezeichnung", label: "Bezeichnung", typ: "text" },
    { name: "zaehlernummer", label: "Zählernummer", typ: "text", pflicht: true },
    { name: "art", label: "Art", typ: "auswahl", optionen: opt(MESSPUNKT_ARTEN), pflicht: true },
    { name: "messstelle", label: "Messstelle", typ: "auswahl", optionen: opt(MESSSTELLEN), pflicht: true },
    { name: "abrechnungsrelevant", label: "Abrechnungsrelevant (nur geeichte Messstelle / SMGW)", typ: "check" },
    { name: "smgw", label: "Smart-Meter-Gateway", typ: "check" },
    { name: "msb", label: "Messstellenbetreiber", typ: "text" },
    { name: "eichgueltigBis", label: "Eichung gültig bis", typ: "datum" },
    { name: "bemerkung", label: "Bemerkung", typ: "text", breit: true },
  ],
  wartung: [
    { name: "art", label: "Art", typ: "auswahl", optionen: opt(WARTUNG_ARTEN), pflicht: true },
    { name: "datum", label: "Datum", typ: "datum", pflicht: true },
    { name: "status", label: "Status", typ: "auswahl", optionen: opt(WARTUNG_STATUS) },
    { name: "dienstleister", label: "Dienstleister", typ: "text" },
    { name: "naechsteFaelligkeit", label: "Nächste Fälligkeit", typ: "datum" },
    { name: "kostenEur", label: "Kosten (€, intern)", typ: "zahl" },
    { name: "bericht", label: "Bericht", typ: "textarea", breit: true },
  ],
  vertrag: [
    { name: "nummer", label: "Vertragsnummer", typ: "text" },
    { name: "beginn", label: "Beginn", typ: "datum", pflicht: true },
    { name: "laufzeitJahre", label: "Laufzeit (Jahre)", typ: "zahl", pflicht: true },
    { name: "strompreisCt", label: "Arbeitspreis (ct/kWh netto)", typ: "zahl", pflicht: true },
    { name: "grundgebuehrMonat", label: "Grundgebühr (€/Monat netto)", typ: "zahl", pflicht: true },
    { name: "indexierungPct", label: "Indexierung (% p. a.)", typ: "zahl" },
    { name: "kuendigungsfristMonate", label: "Kündigungsfrist (Monate)", typ: "zahl" },
    { name: "status", label: "Status", typ: "auswahl", optionen: [["aktiv", "Aktiv"], ["gekuendigt", "Gekündigt"], ["beendet", "Beendet"]] },
    { name: "indexBasis", label: "Preisgleitung", typ: "auswahl", optionen: opt(INDEX_BASIS) },
    { name: "mindestabnahmeKwhJahr", label: "Mindestabnahme (kWh/Jahr)", typ: "zahl", hinweis: "Take-or-Pay: Fehlmengen werden zum Arbeitspreis ausgeglichen." },
    { name: "endschaft", label: "Endschaftsregelung", typ: "auswahl", optionen: opt(ENDSCHAFT), leer: "– offen –" },
    { name: "kaufoptionEur", label: "Kaufoption / Restwert (€ netto)", typ: "zahl" },
    { name: "endschaftText", label: "Endschaft – Details", typ: "text", breit: true },
    { name: "bemerkung", label: "Bemerkung", typ: "text", breit: true },
  ],
};

export function monatswertSchema(messpunkte = []) {
  const abr = messpunkte.filter((m) => m.abrechnungsrelevant);
  return [
    { name: "messpunktId", label: "Messpunkt (geeicht)", typ: "auswahl", optionen: abr.map((m) => [m.id, `${m.bezeichnung} – ${m.zaehlernummer}`]), pflicht: true },
    { name: "register", label: "Register (OBIS)", typ: "auswahl", optionen: [["1.8.0", "1.8.0 Bezug / Verbrauch / Laden"], ["2.8.0", "2.8.0 Einspeisung / Erzeugung / Entladen"]], pflicht: true },
    { name: "monat", label: "Monat", typ: "monat", pflicht: true },
    { name: "stand", label: "Zählerstand Monatsende (kWh)", typ: "zahl", pflicht: true },
    { name: "quelle", label: "Quelle", typ: "text", hinweis: "z. B. Messstellenbetreiber, Ablesung vor Ort" },
    { name: "geprueft", label: "Geprüft", typ: "check" },
  ];
}

// ---------------------------------------------------------------- Feld

function Eingabe({ feld, wert, setzen, id }) {
  if (feld.typ === "check") {
    return (
      <label className="flex min-h-12 items-center gap-2.5 text-[14.5px] text-ink-800">
        <input id={id} type="checkbox" checked={!!wert} onChange={(e) => setzen(e.target.checked)} className="h-5 w-5 accent-ov-600" />
        {feld.label}
      </label>
    );
  }
  if (feld.typ === "auswahl") {
    return (
      <select id={id} value={wert ?? ""} onChange={(e) => setzen(e.target.value)} className={auswahlfeld} required={feld.pflicht}>
        {(feld.leer || !feld.pflicht || !wert) && <option value="">{feld.leer || "– bitte wählen –"}</option>}
        {feld.optionen.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    );
  }
  if (feld.typ === "textarea") return <textarea id={id} value={wert ?? ""} onChange={(e) => setzen(e.target.value)} className={textbereich} maxLength={2000} />;
  return (
    <input
      id={id}
      type={feld.typ === "datum" ? "date" : feld.typ === "monat" ? "month" : "text"}
      inputMode={feld.typ === "zahl" ? "decimal" : undefined}
      value={wert ?? ""}
      onChange={(e) => setzen(e.target.value)}
      className={eingabe}
      required={feld.pflicht}
      maxLength={200}
    />
  );
}

export function Felder({ schema, werte, setzen, praefix = "f" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {schema.map((f) => (
        <Feld key={f.name} id={`${praefix}-${f.name}`} label={f.typ === "check" ? null : f.label} pflicht={f.pflicht} hinweis={f.hinweis} className={f.breit ? "sm:col-span-2" : ""}>
          <Eingabe feld={f} id={`${praefix}-${f.name}`} wert={werte[f.name]} setzen={(v) => setzen({ ...werte, [f.name]: v })} />
        </Feld>
      ))}
    </div>
  );
}

const ohneLeere = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// ---------------------------------------------------------------- Assistent „Anlage anlegen“

const SCHRITTE = [
  { id: "grund", titel: "Anlage", felder: ["name", "typ", "status", "inbetriebnahme"] },
  { id: "standort", titel: "Standort & Technik", felder: ["land", "bundesland", "ort", "kwp", "wechselrichterAnzahl", "speicherKwh", "speicherKw", "lastprofil", "lastJahrKwh"] },
  { id: "kunde", titel: "Eigentum & Kunde", felder: ["eigentuemer", "betriebsfuehrer", "finanziertDurch", "kundeId", "organisationId", "dachgeberIstKunde", "dachgeber", "dienstbarkeitStatus", "dienstbarkeitDatum", "dienstbarkeitHinweis", "beschreibung"] },
  { id: "vertrag", titel: "Vertrag", felder: [] },
];

export function AnlageAssistent({ kunden }) {
  const router = useRouter();
  const [schritt, setSchritt] = useState(0);
  const [werte, setWerte] = useState({ typ: "dach", status: "betrieb", land: "DE", bundesland: "Bayern", lastprofil: "gewerbe", wechselrichterAnzahl: "1", speicherKwh: "0", speicherKw: "0", eigentuemer: EIGENTUEMER_STANDARD, betriebsfuehrer: BETRIEBSFUEHRER_STANDARD, dachgeberIstKunde: true });
  const [vertrag, setVertrag] = useState({ laufzeitJahre: "20", indexierungPct: "0", kuendigungsfristMonate: "6", status: "aktiv" });
  const [mitVertrag, setMitVertrag] = useState(true);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const schema = useMemo(() => anlageSchema(kunden, werte.land), [kunden, werte.land]);
  const s = SCHRITTE[schritt];
  const prognose = prognoseJahrKwh({ ...werte, kwp: Number(String(werte.kwp || 0).replace(",", ".")), regionId: regionFuer(werte.land, werte.bundesland) });

  function pruefen() {
    if (s.id === "grund" && String(werte.name || "").trim().length < 3) return "Bitte geben Sie eine Bezeichnung an (mind. 3 Zeichen).";
    if (s.id === "grund" && werte.status === "betrieb" && !werte.inbetriebnahme) return "Für Anlagen in Betrieb ist das Inbetriebnahmedatum Pflicht.";
    if (s.id === "standort" && werte.typ !== "speicher" && !(Number(String(werte.kwp || "").replace(",", ".")) > 0)) return "Bitte geben Sie die PV-Leistung in kWp an.";
    if (s.id === "standort" && werte.typ === "speicher" && !(Number(String(werte.speicherKwh || "").replace(",", ".")) > 0)) return "Ein Batteriespeicher braucht eine Kapazität in kWh.";
    if (s.id === "kunde" && String(werte.eigentuemer || "").trim().length < 3) return "Bitte geben Sie die Eigentümergesellschaft an (ÖkoInvest GmbH oder Projektgesellschaft).";
    return "";
  }

  async function anlegen() {
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/admin/anlagen", { body: ohneLeere({ ...werte, kundeId: werte.kundeId || null, organisationId: werte.organisationId || null }) });
      const id = r.anlage.id;
      if (mitVertrag && vertrag.beginn) {
        await senden(`/api/admin/anlagen/${id}/eintraege`, { body: { art: "vertrag", daten: vertrag } }).catch((e) => setFehler(`Anlage angelegt, Vertrag nicht gespeichert: ${e.message}`));
      }
      router.push(`/portal/admin/anlagen/${id}?geraet=1`);
    } catch (e) {
      setFehler(e.message);
      setLaeuft(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white ring-1 ring-ink-200/70">
      <ol className="flex flex-wrap gap-2 border-b border-ink-100 px-5 py-4 md:px-6" aria-label="Schritte">
        {SCHRITTE.map((x, i) => (
          <li key={x.id} aria-current={i === schritt ? "step" : undefined} className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold", i === schritt ? "bg-navy-900 text-white" : i < schritt ? "bg-ov-50 text-ov-800" : "bg-ink-50 text-ink-500")}>
            <span className="ov-num">{i < schritt ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : i + 1}</span>
            {x.titel}
          </li>
        ))}
      </ol>
      <div className="space-y-5 p-5 md:p-6">
        {s.id === "vertrag" ? (
          <>
            <label className="flex items-center gap-2.5 text-[14.5px] font-semibold text-ink-800">
              <input type="checkbox" checked={mitVertrag} onChange={(e) => setMitVertrag(e.target.checked)} className="h-5 w-5 accent-ov-600" />
              Contracting-Vertrag jetzt erfassen
            </label>
            {mitVertrag && <Felder schema={EINTRAG_SCHEMA.vertrag} werte={vertrag} setzen={setVertrag} praefix="v" />}
            <div className="rounded-2xl bg-sand-50 p-4 text-[14px] text-ink-700 ring-1 ring-inset ring-ink-200/60">
              <p className="font-semibold text-ink-900">Zusammenfassung</p>
              <p className="mt-1">
                {werte.name || "–"} · {ANLAGE_TYPEN[werte.typ]?.label} · {werte.bundesland} · {werte.typ === "speicher" ? `${werte.speicherKwh} kWh` : kwpText(Number(String(werte.kwp || 0).replace(",", ".")))}
                {prognose > 0 ? ` · Erwartung rund ${kwh(prognose)} pro Jahr` : ""}
              </p>
              <p className="mt-1 text-ink-500">Nach dem Anlegen führt Sie der Assistent „Gerät verbinden“ zum MQTT-Zugang des Datenloggers.</p>
            </div>
          </>
        ) : (
          <Felder schema={schema.filter((f) => s.felder.includes(f.name))} werte={werte} setzen={(w) => setWerte(w.land !== werte.land ? { ...w, bundesland: BUNDESLAENDER[w.land]?.[0] || "" } : w)} praefix="a" />
        )}
        {s.id === "standort" && prognose > 0 && <p className="text-[13.5px] text-ink-600">Erwartete Erzeugung (Region, kWp, Bauart): <span className="font-semibold text-ink-900">{kwh(prognose)}</span> pro Jahr.</p>}
        <FehlerBox>{fehler}</FehlerBox>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" size="sm" icon={ChevronLeft} disabled={schritt === 0 || laeuft} onClick={() => setSchritt(schritt - 1)}>Zurück</Button>
          {schritt < SCHRITTE.length - 1 ? (
            <Button
              size="sm"
              onClick={() => {
                const f = pruefen();
                setFehler(f);
                if (!f) setSchritt(schritt + 1);
              }}
            >
              Weiter <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" disabled={laeuft} onClick={anlegen}>{laeuft ? "Wird angelegt …" : "Anlage anlegen"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Stammdaten

const FELDER_ANLAGE = ["name", "typ", "status", "inbetriebnahme", "land", "bundesland", "ort", "kwp", "wechselrichterAnzahl", "speicherKwh", "speicherKw", "lastprofil", "lastJahrKwh", "kundeId", "organisationId",
  "eigentuemer", "betriebsfuehrer", "finanziertDurch", "dachgeberIstKunde", "dachgeber", "dienstbarkeitStatus", "dienstbarkeitDatum", "dienstbarkeitHinweis", "dienstbarkeitDokumentId", // Eigentum & Betrieb
  "beschreibung"];

export function StammdatenFormular({ anlage, kunden }) {
  const router = useRouter();
  const start = Object.fromEntries(FELDER_ANLAGE.map((k) => [k, k === "kundeId" ? anlage.kunde?.id || "" : k === "organisationId" ? anlage.organisation?.id || "" : anlage[k] ?? ""]));
  const [werte, setWerte] = useState(start);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const schema = useMemo(() => anlageSchema(kunden, werte.land), [kunden, werte.land]);
  async function speichern(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    setOk("");
    try {
      await senden(`/api/admin/anlagen/${anlage.id}`, { method: "PATCH", body: { ...werte, kundeId: werte.kundeId || null, organisationId: werte.organisationId || null } });
      setOk("Gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={speichern} className="space-y-5">
      <Felder schema={schema} werte={werte} setzen={(w) => setWerte(w.land !== werte.land ? { ...w, bundesland: BUNDESLAENDER[w.land]?.[0] || "" } : w)} praefix="s" />
      <FehlerBox>{fehler}</FehlerBox>
      {ok && <p role="status" className="text-[14px] font-semibold text-ov-700">{ok}</p>}
      <Button type="submit" size="sm" disabled={laeuft}>{laeuft ? "Speichert …" : "Stammdaten speichern"}</Button>
    </form>
  );
}

// ---------------------------------------------------------------- Einträge (Liste + Bearbeiten)

const d = (x) => (x ? new Date(x).toLocaleDateString("de-DE") : "–");
const zahl = (x, e = "") => (x === null || x === undefined || x === "" ? "–" : `${Number(x).toLocaleString("de-DE")}${e}`);

/** Darstellung je Eintragsart (Client-seitig, da Funktionen nicht vom Server übergeben werden können) */
const ZEILE = {
  komponente: (e) => (
    <>
      <p className="font-semibold text-ink-900">{KOMPONENTEN_ARTEN[e.art] || e.art}: {e.modell || "–"}{e.anzahl > 1 ? ` × ${e.anzahl}` : ""}</p>
      <p className="text-[12.5px] text-ink-500">{[e.hersteller, e.seriennummer && `SN ${e.seriennummer}`, e.leistungKw && `${zahl(e.leistungKw, " kW")}`, e.kapazitaetKwh && `${zahl(e.kapazitaetKwh, " kWh")}`, e.garantieBis && `Garantie bis ${d(e.garantieBis)}`].filter(Boolean).join(" · ")}</p>
    </>
  ),
  messpunkt: (e) => (
    <>
      <p className="font-semibold text-ink-900">{e.bezeichnung} <span className="font-normal text-ink-500">({e.zaehlernummer})</span></p>
      <p className="text-[12.5px] text-ink-500">{MESSPUNKT_ARTEN[e.art]?.label || e.art} · {MESSSTELLEN[e.messstelle] || e.messstelle}{e.smgw ? " · SMGW" : ""} · {e.abrechnungsrelevant ? <span className="font-semibold text-ov-700">abrechnungsrelevant</span> : "Monitoring"}</p>
    </>
  ),
  wartung: (e) => (
    <>
      <p className="font-semibold text-ink-900">{WARTUNG_ARTEN[e.art] || e.art} · {d(e.datum)}</p>
      <p className="text-[12.5px] text-ink-500">{[WARTUNG_STATUS[e.status] || e.status, e.dienstleister, e.kostenEur != null && e.kostenEur !== "" && zahl(e.kostenEur, " €")].filter(Boolean).join(" · ")}</p>
      {e.bericht && <p className="mt-0.5 text-[13px] text-ink-700">{e.bericht}</p>}
    </>
  ),
  vertrag: (e) => (
    <>
      <p className="font-semibold text-ink-900">{e.nummer || "Vertrag"} · {zahl(e.strompreisCt, " ct/kWh")} · {zahl(e.grundgebuehrMonat, " €/Monat")}</p>
      <p className="text-[12.5px] text-ink-500">Beginn {d(e.beginn)} · {e.laufzeitJahre} Jahre · Indexierung {zahl(e.indexierungPct, " %")} · {e.status}</p>
    </>
  ),
  monatswert: (e) => (
    <>
      <p className="font-semibold text-ink-900">{e.monat} · {e.zaehlernummer} · {e.register}: {zahl(e.stand, " kWh")}</p>
      <p className="text-[12.5px] text-ink-500">Menge {zahl(e.menge, " kWh")} · {e.quelle}{e.geprueft ? " · geprüft" : ""}</p>
    </>
  ),
};

export function EintragBereich({ anlageId, art, eintraege = [], schema: schemaProp, messpunkte = [], einzeln = false, leer = "Noch keine Einträge." }) {
  const schema = schemaProp || (art === "monatswert" ? monatswertSchema(messpunkte) : EINTRAG_SCHEMA[art]);
  const spalten = ZEILE[art];
  const router = useRouter();
  const [bearbeiten, setBearbeiten] = useState(null); // null | "neu" | id
  const [werte, setWerte] = useState({});
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  const oeffnen = (e) => {
    setFehler("");
    setBearbeiten(e ? e.id : "neu");
    setWerte(e ? Object.fromEntries(schema.map((f) => [f.name, e[f.name] ?? ""])) : {});
  };
  async function speichern(ev) {
    ev.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/admin/anlagen/${anlageId}/eintraege`, { body: { art, id: bearbeiten !== "neu" ? bearbeiten : null, daten: werte } });
      setBearbeiten(null);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  async function loeschen(id) {
    if (!(await bestaetigen({ titel: "Eintrag löschen?", text: "Der Eintrag wird dauerhaft entfernt.", bestaetigenText: "Eintrag löschen", gefahr: true }))) return;
    try {
      await senden(`/api/admin/anlagen/${anlageId}/eintraege?art=${art}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  return (
    <div className="space-y-4">
      {eintraege.length ? (
        <ul className="divide-y divide-ink-100">
          {eintraege.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 text-[14px]">{spalten(e)}</div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => oeffnen(e)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100" aria-label="Bearbeiten">
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                </button>
                {!einzeln && (
                  <button type="button" onClick={() => loeschen(e.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-600 hover:bg-danger-50 hover:text-danger-700" aria-label="Löschen">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-500">{leer}</p>
      )}
      {bearbeiten ? (
        <form onSubmit={speichern} className="space-y-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink-900">{bearbeiten === "neu" ? "Neuer Eintrag" : "Eintrag bearbeiten"}</p>
            <button type="button" onClick={() => setBearbeiten(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-600 hover:bg-white" aria-label="Schließen">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <Felder schema={schema} werte={werte} setzen={setWerte} praefix={`${art}-${bearbeiten}`} />
          <FehlerBox>{fehler}</FehlerBox>
          <Button type="submit" size="sm" disabled={laeuft}>{laeuft ? "Speichert …" : "Speichern"}</Button>
        </form>
      ) : (
        (!einzeln || !eintraege.length) && (
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => oeffnen(null)}>Hinzufügen</Button>
        )
      )}
      {!bearbeiten && fehler && <FehlerBox>{fehler}</FehlerBox>}
    </div>
  );
}

// ---------------------------------------------------------------- Störung manuell erfassen

export function StoerungErfassen({ anlageId }) {
  const router = useRouter();
  const [werte, setWerte] = useState({ schwere: "mittel" });
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const schema = [
    { name: "titel", label: "Kurzbeschreibung", typ: "text", pflicht: true },
    { name: "schwere", label: "Schwere", typ: "auswahl", optionen: opt(STOERUNG_SCHWERE), pflicht: true },
    { name: "text", label: "Details", typ: "textarea", breit: true },
  ];
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    setOk("");
    try {
      await senden("/api/admin/anlagen/stoerungen", { body: { ...werte, anlageId } });
      setWerte({ schwere: "mittel" });
      setOk("Störung erfasst – Kunde und Betrieb wurden benachrichtigt (je nach Schwere).");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }
  return (
    <form onSubmit={speichern} className="space-y-4">
      <Felder schema={schema} werte={werte} setzen={setWerte} praefix="st" />
      <FehlerBox>{fehler}</FehlerBox>
      {ok && <p role="status" className="text-[14px] font-semibold text-ov-700">{ok}</p>}
      <Button type="submit" size="sm" variant="navy">Störung erfassen</Button>
    </form>
  );
}

"use client";

// Automationsregeln „Wenn – Und – Dann“ (Client): Regel-Editor ohne Code, Testlauf („was würde
// passieren“), Regelkarten mit Ein/Aus, Fristen prüfen. Bausteine: src/lib/plattform/automation.js.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlay, FlaskConical, Pencil, Plus, Power, RefreshCcw, Save, Trash2, X, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { relativ } from "@/lib/plattform/format";
import { PROZESSE } from "@/lib/plattform/prozesse";
import { AKTIONEN, AUSLOESER, BEDINGUNG_FELDER, FRISTEN, OBJEKT_ARTEN, OPERATOREN, PRIORITAETEN } from "@/lib/plattform/automation";
import { auswahlfeld, eingabe, ErfolgBox, Feld, FehlerBox, textbereich } from "@/components/Portal/felder";
import { bestaetigen } from "@/components/ui/Rueckfrage";

const name = (k) => [k?.vorname, k?.nachname].filter(Boolean).join(" ") || k?.email;
const klein = cn(auswahlfeld, "h-10 text-[14px]");
const kleinText = cn(eingabe, "h-10 text-[14px]");

function leereRegel() {
  return { name: "", aktiv: true, beschreibung: "", ausloeser: { typ: "vorgang_neu", art: "vorgang" }, bedingungen: [], aktionen: [{ typ: "tag", tag: "" }] };
}

function aktionStandard(typ, vorlagen) {
  switch (typ) {
    case "zustaendig":
      return { typ, mitarbeiterId: "gebiet" };
    case "aufgabe":
      return { typ, titel: "", faelligInTagen: 1, zustaendig: "zustaendig", beschreibung: "" };
    case "mail":
      return { typ, vorlageId: vorlagen.find((v) => v.kanal === "email")?.id || "", an: "kontakt" };
    case "nachricht":
      return { typ, vorlageId: vorlagen.find((v) => v.kanal === "nachricht")?.id || "" };
    case "status":
      return { typ, nach: "", kommentar: "" };
    case "prioritaet":
      return { typ, wert: "A" };
    default:
      return { typ, tag: "" };
  }
}

export function RegelEditor({ regel: start, vorlagen = [], konten = [], fertig, abbrechen }) {
  const id = useId();
  const router = useRouter();
  const [r, setR] = useState(() => (start ? structuredClone({ name: start.name, aktiv: start.aktiv, beschreibung: start.beschreibung || "", ausloeser: start.ausloeser, bedingungen: start.bedingungen || [], aktionen: start.aktionen || [] }) : leereRegel()));
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [test, setTest] = useState({ bezugId: "", score: "", kategorie: "" });
  const [ergebnis, setErgebnis] = useState(null);
  const a = r.ausloeser;
  const art = a.art || "vorgang";
  const statusListe = Object.entries(PROZESSE[art]?.status || {});
  const setA = (x) => setR({ ...r, ausloeser: { ...a, ...x } });
  const setB = (i, x) => setR({ ...r, bedingungen: r.bedingungen.map((b, j) => (j === i ? { ...b, ...x } : b)) });
  const setX = (i, x) => setR({ ...r, aktionen: r.aktionen.map((b, j) => (j === i ? { ...b, ...x } : b)) });

  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      if (start) await senden(`/api/admin/automationen/${start.id}`, { method: "PATCH", body: r });
      else await senden("/api/admin/automationen", { body: r });
      router.refresh();
      fertig?.();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  async function testen() {
    setFehler("");
    setErgebnis(null);
    try {
      const body = { regel: r, ...(test.bezugId.trim() ? { bezugArt: art, bezugId: test.bezugId.trim().toUpperCase() } : {}), ...(test.score !== "" ? { score: test.score } : {}), ...(test.kategorie ? { kategorie: test.kategorie } : {}) };
      const res = await senden("/api/admin/automationen/testlauf", { body });
      setErgebnis(res.testlauf);
    } catch (x) {
      setFehler(x.message);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Feld id={`${id}-n`} label="Name der Regel" pflicht>
          <input id={`${id}-n`} required minLength={3} maxLength={120} className={eingabe} value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="z. B. Großfläche priorisieren" />
        </Feld>
        <label className="flex items-center gap-2 self-end pb-3 text-[14px] font-semibold text-ink-700">
          <input type="checkbox" checked={r.aktiv} onChange={(e) => setR({ ...r, aktiv: e.target.checked })} className="h-4 w-4 accent-[#558227]" /> aktiv
        </label>
      </div>

      <fieldset className="rounded-2xl bg-navy-50/60 p-4 ring-1 ring-inset ring-navy-100">
        <legend className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-navy-700">Wenn</legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Feld id={`${id}-a`} label="Auslöser">
            <select id={`${id}-a`} className={klein} value={a.typ} onChange={(e) => setR({ ...r, ausloeser: { typ: e.target.value, art: e.target.value === "vorgang_neu" ? "vorgang" : e.target.value === "suchprofil" ? "projekt" : e.target.value === "frist" ? "flaeche" : a.art || "vorgang", ...(e.target.value === "frist" ? { frist: "sla_erstkontakt" } : {}) } })}>
              {Object.entries(AUSLOESER).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
            </select>
          </Feld>
          {["status", "dokument", "frist"].includes(a.typ) && (
            <Feld id={`${id}-ar`} label="Objektart">
              <select id={`${id}-ar`} className={klein} value={a.art || ""} onChange={(e) => setA({ art: e.target.value, nach: undefined, von: undefined, status: undefined })}>
                {a.typ === "dokument" && <option value="">jede</option>}
                {Object.entries(OBJEKT_ARTEN).filter(([k]) => !(a.typ === "dokument" && k === "provision")).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Feld>
          )}
          {a.typ === "status" && (
            <>
              <Feld id={`${id}-v`} label="von (optional)">
                <select id={`${id}-v`} className={klein} value={a.von || ""} onChange={(e) => setA({ von: e.target.value || undefined })}>
                  <option value="">beliebig</option>
                  {statusListe.map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </Feld>
              <Feld id={`${id}-z`} label="nach">
                <select id={`${id}-z`} className={klein} value={a.nach || ""} onChange={(e) => setA({ nach: e.target.value || undefined })}>
                  <option value="">jeder Wechsel</option>
                  {statusListe.map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </Feld>
            </>
          )}
          {a.typ === "frist" && (
            <>
              <Feld id={`${id}-f`} label="Frist">
                <select id={`${id}-f`} className={klein} value={a.frist || "sla_erstkontakt"} onChange={(e) => setA({ frist: e.target.value })}>
                  {Object.entries(FRISTEN).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
                </select>
              </Feld>
              {a.frist === "status_dauer" && (
                <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2 md:col-span-3">
                  <Feld id={`${id}-fs`} label="Status">
                    <select id={`${id}-fs`} className={klein} value={a.status || ""} onChange={(e) => setA({ status: e.target.value })}>
                      <option value="">bitte wählen</option>
                      {statusListe.map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                    </select>
                  </Feld>
                  <Feld id={`${id}-ft`} label="Tage"><input id={`${id}-ft`} type="number" min={1} max={365} className={kleinText} value={a.tage || 14} onChange={(e) => setA({ tage: e.target.value })} /></Feld>
                </div>
              )}
            </>
          )}
        </div>
        <p className="mt-2 text-[12.5px] text-navy-700/80">{AUSLOESER[a.typ]?.text}{a.typ === "frist" ? ` ${FRISTEN[a.frist]?.text || ""}` : ""}</p>
      </fieldset>

      <fieldset className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
        <legend className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-600">Und (alle Bedingungen)</legend>
        {r.bedingungen.length === 0 && <p className="text-[13px] text-ink-500">Keine Bedingung – die Regel greift bei jedem passenden Auslöser.</p>}
        <ul className="space-y-2">
          {r.bedingungen.map((b, i) => {
            const def = BEDINGUNG_FELDER[b.feld] || BEDINGUNG_FELDER.typ;
            const ops = def.art === "zahl" ? ["min", "max", "gleich", "ungleich"] : def.art === "auswahl" ? ["gleich", "ungleich", "in"] : ["gleich", "ungleich", "enthaelt", "beginnt", "in"];
            return (
              <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.4fr)_auto]">
                <select aria-label="Feld" className={klein} value={b.feld} onChange={(e) => setB(i, { feld: e.target.value, op: BEDINGUNG_FELDER[e.target.value].art === "zahl" ? "min" : "gleich", wert: "" })}>
                  {Object.entries(BEDINGUNG_FELDER).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
                </select>
                <select aria-label="Vergleich" className={klein} value={b.op} onChange={(e) => setB(i, { op: e.target.value, wert: e.target.value === "in" ? [] : "" })}>
                  {ops.map((o) => <option key={o} value={o}>{OPERATOREN[o]}</option>)}
                </select>
                {def.art === "auswahl" && b.op === "in" ? (
                  <select aria-label="Werte" multiple className={cn(auswahlfeld, "h-24 bg-none py-1 text-[13.5px]")} value={Array.isArray(b.wert) ? b.wert : []} onChange={(e) => setB(i, { wert: [...e.target.selectedOptions].map((o) => o.value) })}>
                    {Object.entries(def.werte).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                ) : def.art === "auswahl" ? (
                  <select aria-label="Wert" className={klein} value={b.wert} onChange={(e) => setB(i, { wert: e.target.value })}>
                    <option value="">bitte wählen</option>
                    {Object.entries(def.werte).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                ) : (
                  <input aria-label="Wert" className={kleinText} type={def.art === "zahl" ? "number" : "text"} value={Array.isArray(b.wert) ? b.wert.join(", ") : b.wert} placeholder={b.op === "in" ? "Werte, kommagetrennt" : ""} onChange={(e) => setB(i, { wert: b.op === "in" ? e.target.value.split(",").map((x) => x.trim()) : e.target.value })} />
                )}
                <button type="button" aria-label="Bedingung entfernen" onClick={() => setR({ ...r, bedingungen: r.bedingungen.filter((_, j) => j !== i) })} className="rounded-full p-2 text-ink-400 hover:bg-white hover:text-ink-800"><X aria-hidden="true" className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setR({ ...r, bedingungen: [...r.bedingungen, { feld: "typ", op: "gleich", wert: "" }] })} className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
          <Plus aria-hidden="true" className="h-4 w-4" /> Bedingung
        </button>
      </fieldset>

      <fieldset className="rounded-2xl bg-ov-50/60 p-4 ring-1 ring-inset ring-ov-200">
        <legend className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-ov-800">Dann</legend>
        <ul className="space-y-3">
          {r.aktionen.map((x, i) => (
            <li key={i} className="rounded-xl bg-white p-3 ring-1 ring-ink-200/70">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto]">
                <select aria-label="Aktion" className={klein} value={x.typ} onChange={(e) => setX(i, aktionStandard(e.target.value, vorlagen))}>
                  {Object.entries(AKTIONEN).map(([k, y]) => <option key={k} value={k}>{y.label}</option>)}
                </select>
                <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  {x.typ === "zustaendig" && (
                    <select aria-label="Person" className={klein} value={x.mitarbeiterId} onChange={(e) => setX(i, { mitarbeiterId: e.target.value })}>
                      <option value="gebiet">nach Gebietszuordnung</option>
                      {konten.map((k) => <option key={k.id} value={k.id}>{name(k)}</option>)}
                    </select>
                  )}
                  {x.typ === "aufgabe" && (
                    <>
                      <input aria-label="Titel der Aufgabe" className={cn(kleinText, "sm:col-span-2")} value={x.titel} onChange={(e) => setX(i, { titel: e.target.value })} placeholder="Titel – Platzhalter möglich, z. B. Rückruf {{nachname}}" />
                      <select aria-label="Zuständig" className={klein} value={x.zustaendig} onChange={(e) => setX(i, { zustaendig: e.target.value })}>
                        <option value="zustaendig">zuständige Person des Objekts</option>
                        <option value="gebiet">nach Gebiet</option>
                        {konten.map((k) => <option key={k.id} value={k.id}>{name(k)}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-[13px] text-ink-600">
                        fällig in <input type="number" min={0} max={60} className={cn(kleinText, "w-20")} value={x.faelligInTagen} onChange={(e) => setX(i, { faelligInTagen: e.target.value })} /> Tagen
                      </label>
                    </>
                  )}
                  {(x.typ === "mail" || x.typ === "nachricht") && (
                    <>
                      <select aria-label="Vorlage" className={klein} value={x.vorlageId} onChange={(e) => setX(i, { vorlageId: e.target.value })}>
                        <option value="">Vorlage wählen</option>
                        {vorlagen.filter((v) => v.kanal === (x.typ === "mail" ? "email" : "nachricht")).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      {x.typ === "mail" && (
                        <select aria-label="Empfänger" className={klein} value={x.an} onChange={(e) => setX(i, { an: e.target.value })}>
                          <option value="kontakt">an den Kontakt des Objekts</option>
                          <option value="zustaendig">an die zuständige Person</option>
                        </select>
                      )}
                    </>
                  )}
                  {x.typ === "tag" && <input aria-label="Tag" className={kleinText} value={x.tag} onChange={(e) => setX(i, { tag: e.target.value })} placeholder="z. B. Großfläche" />}
                  {x.typ === "status" && (
                    <>
                      <select aria-label="Zielstatus" className={klein} value={x.nach} onChange={(e) => setX(i, { nach: e.target.value })}>
                        <option value="">Zielstatus</option>
                        {statusListe.map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                      </select>
                      <input aria-label="Kommentar" className={kleinText} value={x.kommentar} onChange={(e) => setX(i, { kommentar: e.target.value })} placeholder="Kommentar / Begründung" />
                    </>
                  )}
                  {x.typ === "prioritaet" && (
                    <select aria-label="Priorität" className={klein} value={x.wert} onChange={(e) => setX(i, { wert: e.target.value })}>
                      {Object.entries(PRIORITAETEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  )}
                </div>
                <button type="button" aria-label="Aktion entfernen" onClick={() => setR({ ...r, aktionen: r.aktionen.filter((_, j) => j !== i) })} className="self-start rounded-full p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-800"><X aria-hidden="true" className="h-4 w-4" /></button>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-500">{AKTIONEN[x.typ]?.text}</p>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setR({ ...r, aktionen: [...r.aktionen, aktionStandard("aufgabe", vorlagen)] })} className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
          <Plus aria-hidden="true" className="h-4 w-4" /> Aktion
        </button>
      </fieldset>

      <Feld id={`${id}-b`} label="Beschreibung (optional)">
        <textarea id={`${id}-b`} className={cn(textbereich, "min-h-[64px]")} maxLength={500} value={r.beschreibung} onChange={(e) => setR({ ...r, beschreibung: e.target.value })} />
      </Feld>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900"><FlaskConical aria-hidden="true" className="h-4 w-4 text-ov-600" /> Testlauf – was würde passieren?</p>
        <p className="mt-0.5 text-[12.5px] text-ink-500">Mit Kennung: Ausführung auf einer Kopie der Daten (nichts wird gespeichert). Ohne Kennung: Rückblick, auf welche der letzten 50 {OBJEKT_ARTEN[art]}-Objekte die Bedingungen passen.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_auto]">
          <input aria-label="Kennung des Objekts" className={cn(kleinText, "font-mono")} placeholder={`${{ vorgang: "V", flaeche: "F", projekt: "P", interesse: "I", provision: "PV" }[art] || "V"}-26-… (optional)`} value={test.bezugId} onChange={(e) => setTest({ ...test, bezugId: e.target.value })} />
          {a.typ === "suchprofil" ? <input aria-label="Passung (Score)" type="number" min={0} max={100} className={kleinText} placeholder="Score" value={test.score} onChange={(e) => setTest({ ...test, score: e.target.value })} /> : <span />}
          {a.typ === "dokument" ? (
            <select aria-label="Kategorie" className={klein} value={test.kategorie} onChange={(e) => setTest({ ...test, kategorie: e.target.value })}>
              <option value="">Kategorie</option>
              {Object.entries(BEDINGUNG_FELDER.kategorie.werte).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          ) : <span />}
          <Button type="button" size="sm" variant="navy" icon={CirclePlay} onClick={testen}>Testlauf</Button>
        </div>
        {ergebnis && <TestErgebnis e={ergebnis} />}
      </div>

      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" icon={Save} disabled={laeuft}>{start ? "Regel speichern" : "Regel anlegen"}</Button>
        {abbrechen && <Button type="button" size="sm" variant="ghost" onClick={abbrechen}>Abbrechen</Button>}
      </div>
    </form>
  );
}

const STATUS_TON = { ausgefuehrt: "bg-ov-50 text-ov-800 ring-ov-200", teilweise: "bg-sun-300/30 text-ink-900 ring-sun-400/50", nicht_erfuellt: "bg-ink-50 text-ink-600 ring-ink-200", schleife: "bg-navy-50 text-navy-800 ring-navy-100", gedrosselt: "bg-navy-50 text-navy-800 ring-navy-100", testlauf: "bg-white text-ink-700 ring-ink-300" };
export const LAUF_LABEL = { ausgefuehrt: "ausgeführt", teilweise: "mit Fehlern", nicht_erfuellt: "Bedingung nicht erfüllt", schleife: "Schleife verhindert", gedrosselt: "gedrosselt", testlauf: "Testlauf" };

export function LaufStatus({ status }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", STATUS_TON[status] || STATUS_TON.nicht_erfuellt)}>{LAUF_LABEL[status] || status}</span>;
}

function TestErgebnis({ e }) {
  if (e.modus === "rueckblick") {
    return (
      <div className="mt-3 rounded-xl bg-sand-50 p-3 text-[13px] ring-1 ring-ink-200/60">
        <p className="font-semibold text-ink-900">Rückblick: {e.treffer} von {e.geprueft} Objekten erfüllen die Bedingungen.</p>
        <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
          {e.objekte.map((o) => (
            <li key={o.id} className={cn("flex flex-wrap items-center gap-2", !o.passt && "text-ink-400")}>
              <span className={cn("h-2 w-2 rounded-full", o.passt ? "bg-ov-500" : "bg-ink-300")} aria-hidden="true" />
              <span className="font-mono text-[12px]">{o.id}</span> {o.titel} · {o.status}
              {!o.passt && <span className="text-[11.5px]">({o.bedingungen.filter((b) => !b.erfuellt).map((b) => `${BEDINGUNG_FELDER[b.feld]?.label}: ${b.ist ?? "–"}`).join(", ")})</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const x = e.aenderungen;
  const nichts = !x.aufgaben.length && !x.mails.length && !x.nachrichten.length && !x.status && !x.zustaendig && !x.tags.length;
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-sand-50 p-3 text-[13px] ring-1 ring-ink-200/60">
      <p className="font-semibold text-ink-900">{e.objekt.titel} <span className="font-normal text-ink-500">({e.objekt.status})</span></p>
      <ul className="space-y-1">
        {e.protokoll.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2">
            <LaufStatus status={l.status} /> <span className="font-medium">{l.regelName}</span>
            {l.tiefe > 1 && <span className="text-[11.5px] text-ink-500">Folgeregel (Tiefe {l.tiefe})</span>}
            {l.bedingungen?.length > 0 && <span className="text-[11.5px] text-ink-500">{l.bedingungen.map((b) => `${BEDINGUNG_FELDER[b.feld]?.label}: ${Array.isArray(b.ist) ? b.ist.join(",") : b.ist ?? "–"} (${b.erfuellt ? "erfüllt" : "nicht erfüllt"})`).join(" · ")}</span>}
            {l.text && <span className="text-[11.5px] text-ink-500">{l.text}</span>}
          </li>
        ))}
      </ul>
      {nichts ? (
        <p className="text-ink-600">Es würde nichts geändert.</p>
      ) : (
        <ul className="list-disc space-y-0.5 pl-5 text-ink-700">
          {x.status && <li>Status: {x.status.von} → {x.status.nach}</li>}
          {x.zustaendig && <li>Zuständig: {x.zustaendig}</li>}
          {x.tags.map((t) => <li key={t}>Tag „{t}“</li>)}
          {x.aufgaben.map((t, i) => <li key={i}>Aufgabe „{t.titel}“ für {t.zustaendig}, fällig {t.faelligAm.split("-").reverse().join(".")}</li>)}
          {x.mails.map((m, i) => <li key={i}>E-Mail an {m.an}: „{m.betreff}“</li>)}
          {x.nachrichten.map((m, i) => <li key={i}>Portal-Nachricht: „{m.text.slice(0, 90)}{m.text.length > 90 ? " …" : ""}“</li>)}
        </ul>
      )}
    </div>
  );
}

export function RegelKarte({ regel, vorlagen, konten, darfSchreiben }) {
  const router = useRouter();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [fehler, setFehler] = useState("");
  const t = regel.beschreibungKurz;
  async function umschalten() {
    setFehler("");
    try {
      await senden(`/api/admin/automationen/${regel.id}`, { method: "PATCH", body: { ...regel, aktiv: !regel.aktiv } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  async function loeschen() {
    if (!(await bestaetigen({ titel: `Regel „${regel.name}“ löschen?`, text: "Die Regel wird entfernt, das Ausführungsprotokoll bleibt erhalten.", bestaetigenText: "Regel löschen", gefahr: true }))) return;
    try {
      await senden(`/api/admin/automationen/${regel.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }
  if (bearbeiten) {
    return (
      <li className="rounded-3xl bg-white p-5 ring-2 ring-ov-300">
        <RegelEditor regel={regel} vorlagen={vorlagen} konten={konten} fertig={() => setBearbeiten(false)} abbrechen={() => setBearbeiten(false)} />
      </li>
    );
  }
  return (
    <li className={cn("rounded-3xl bg-white p-5 ring-1 ring-ink-200/70", !regel.aktiv && "opacity-75")}>
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", regel.aktiv ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-500")}>
          <Zap aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16.5px] font-bold text-ink-900">{regel.name}</p>
          {regel.beschreibung && <p className="text-[13px] text-ink-600">{regel.beschreibung}</p>}
          <dl className="mt-2 grid gap-1 text-[13px]">
            <div className="flex gap-2"><dt className="w-12 shrink-0 font-bold text-navy-700">Wenn</dt><dd className="text-ink-800">{t.wenn}</dd></div>
            {t.und.length > 0 && <div className="flex gap-2"><dt className="w-12 shrink-0 font-bold text-ink-600">Und</dt><dd className="text-ink-800">{t.und.join(" · ")}</dd></div>}
            <div className="flex gap-2"><dt className="w-12 shrink-0 font-bold text-ov-800">Dann</dt><dd className="text-ink-800">{t.dann.join(" · ")}</dd></div>
          </dl>
          <p className="mt-2 text-[12px] text-ink-500">
            {regel.aktiv ? "aktiv" : "inaktiv"} · {regel.zaehler?.ausgefuehrt || 0}× ausgeführt{regel.letzterLauf ? ` · zuletzt ${relativ(regel.letzterLauf.am)} (${LAUF_LABEL[regel.letzterLauf.status] || regel.letzterLauf.status}, ${regel.letzterLauf.objektTitel})` : ""} · von {regel.erstelltVonName || "–"}
          </p>
          <FehlerBox>{fehler}</FehlerBox>
        </div>
        {darfSchreiben && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={umschalten} aria-pressed={regel.aktiv} title={regel.aktiv ? "Deaktivieren" : "Aktivieren"} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset", regel.aktiv ? "bg-ov-50 text-ov-800 ring-ov-200" : "bg-white text-ink-600 ring-ink-200")}>
              <Power aria-hidden="true" className="h-4 w-4" /> {regel.aktiv ? "An" : "Aus"}
            </button>
            <button type="button" onClick={() => setBearbeiten(true)} aria-label={`Regel ${regel.name} bearbeiten`} className="rounded-full p-2.5 text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-ink-900"><Pencil aria-hidden="true" className="h-4 w-4" /></button>
            <button type="button" onClick={loeschen} aria-label={`Regel ${regel.name} löschen`} className="rounded-full p-2.5 text-ink-500 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:text-danger-700"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </li>
  );
}

export function NeueRegel({ vorlagen, konten }) {
  const [offen, setOffen] = useState(false);
  if (!offen) return <Button type="button" size="sm" icon={Plus} onClick={() => setOffen(true)}>Neue Regel</Button>;
  return (
    <div className="rounded-3xl bg-white p-5 ring-2 ring-ov-300">
      <RegelEditor vorlagen={vorlagen} konten={konten} fertig={() => setOffen(false)} abbrechen={() => setOffen(false)} />
    </div>
  );
}

export function FristenPruefen() {
  const router = useRouter();
  const [meldung, setMeldung] = useState("");
  const [fehler, setFehler] = useState("");
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="secondary" icon={RefreshCcw} onClick={async () => { setFehler(""); try { const r = await senden("/api/admin/automationen/fristen", { body: {} }); setMeldung(`${r.ausgeloest} Frist-Ereignis(se) ausgelöst.`); router.refresh(); } catch (e) { setFehler(e.message); } }}>
        Fristen jetzt prüfen
      </Button>
      {meldung && <ErfolgBox>{meldung}</ErfolgBox>}
      {fehler && <FehlerBox>{fehler}</FehlerBox>}
    </div>
  );
}

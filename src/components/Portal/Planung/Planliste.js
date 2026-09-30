"use client";

// Planliste eines Entwicklungsprojekts (Backoffice-Reiter „Pläne“ und externe Sicht für Gutachter/Co-Investor):
// Planköpfe (Plannummer, Titel, Art, Maßstab, Blattformat, Index, Planstand, Planer, Status), Versionen mit Verlauf,
// Upload neuer Pläne bzw. Planstände (DWG, DXF, PDF, KML/KMZ, GeoJSON, Shapefile-ZIP), Statusaktionen, DWG-Konvertierung,
// Kennzahlen aus der DXF-Analyse mit Link zur Übernahme in die Kostenkalkulation. Rechte prüft der Server.

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Eye, FileUp, Loader2, Search } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge, Karte, Leer } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { ANNAHME_ENDUNGEN, FORMATE } from "@/lib/plattform/planung/regeln";
import { fmt } from "@/lib/rechner/annahmen";
import { useAktion } from "@/components/Portal/Entwicklung/Formular";

const TON = { entwurf: "neutral", pruefung: "warn", freigegeben: "ok", ersetzt: "neutral" };
const groesse = (b) => (b >= 1048576 ? `${fmt(b / 1048576, 1)} MB` : `${fmt(Math.max(1, b / 1024), 0)} KB`);
const datum = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" }) : "–");

export function PlanStatus({ status, label }) {
  return <Badge ton={TON[status] || "neutral"} className={status === "ersetzt" ? "line-through decoration-ink-400" : ""}>{label || status}</Badge>;
}

async function hochladen(datei, felder) {
  const fd = new FormData();
  fd.append("datei", datei);
  for (const [k, w] of Object.entries(felder)) if (w !== undefined && w !== null && w !== "") fd.append(k, String(w));
  let res;
  try {
    res = await fetch("/api/planung/upload", { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  } catch {
    throw new Error("Keine Verbindung – bitte prüfen Sie Ihre Internetverbindung.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Fehler ${res.status}`);
  return json;
}

/** Upload-Formular: neuer Plan (Plankopf) oder neuer Planstand zu einem Plan */
function UploadFormular({ projektId, plan = null, meilensteine = [], auswahl, onFertig }) {
  const basis = useId().replace(/:/g, "");
  const a = useAktion();
  const [datei, setDatei] = useState(null);
  const [w, setW] = useState({ plannummer: "", titel: "", planart: "lageplan", massstab: "1:1000", blattformat: "A1", planer: "", meilensteinId: meilensteine.length === 1 && !auswahl?.bo ? meilensteine[0].id : "", planstand: new Date().toISOString().slice(0, 10), aenderung: "" });
  const setze = (k, x) => setW((alt) => ({ ...alt, [k]: x }));
  const opt = (obj) => Object.entries(obj || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>);
  return (
    <form
      className="space-y-4 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!datei) return a.setFehler("Bitte eine Datei wählen.");
        const r = await a.ausfuehren(() => hochladen(datei, plan ? { projektId, planId: plan.id, planstand: w.planstand, aenderung: w.aenderung, planer: w.planer } : { projektId, ...w }), { meldung: (x) => `Hochgeladen: ${x.plan.plannummer} Index ${x.version.index} (${x.version.formatLabel}).` });
        if (r) {
          setDatei(null);
          onFertig?.(r);
        }
      }}
    >
      {!plan && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feld id={`${basis}-nr`} label="Plannummer" pflicht><input id={`${basis}-nr`} className={eingabe} value={w.plannummer} onChange={(e) => setze("plannummer", e.target.value)} maxLength={40} required placeholder="z. B. P-110" /></Feld>
          <Feld id={`${basis}-ti`} label="Plantitel" pflicht className="lg:col-span-2"><input id={`${basis}-ti`} className={eingabe} value={w.titel} onChange={(e) => setze("titel", e.target.value)} maxLength={160} required /></Feld>
          <Feld id={`${basis}-art`} label="Planart"><select id={`${basis}-art`} className={auswahlfeld} value={w.planart} onChange={(e) => setze("planart", e.target.value)}>{opt(auswahl?.planarten)}</select></Feld>
          <Feld id={`${basis}-ms`} label="Maßstab"><select id={`${basis}-ms`} className={auswahlfeld} value={w.massstab} onChange={(e) => setze("massstab", e.target.value)}>{(auswahl?.massstaebe || []).map((m) => <option key={m} value={m}>{m}</option>)}</select></Feld>
          <Feld id={`${basis}-bf`} label="Blattformat"><select id={`${basis}-bf`} className={auswahlfeld} value={w.blattformat} onChange={(e) => setze("blattformat", e.target.value)}>{(auswahl?.blattformate || []).map((m) => <option key={m} value={m}>{m}</option>)}</select></Feld>
          <Feld id={`${basis}-mst`} label="Meilenstein (optional)" className="sm:col-span-2 lg:col-span-3" hinweis="Gutachter/Planer sehen nur Pläne an ihren Meilensteinen.">
            <select id={`${basis}-mst`} className={auswahlfeld} value={w.meilensteinId} onChange={(e) => setze("meilensteinId", e.target.value)}>
              {auswahl?.bo && <option value="">– ohne Meilenstein –</option>}
              {meilensteine.map((m) => <option key={m.id} value={m.id}>{m.titel}</option>)}
            </select>
          </Feld>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Feld id={`${basis}-pl`} label="Planer"><input id={`${basis}-pl`} className={eingabe} value={w.planer} onChange={(e) => setze("planer", e.target.value)} maxLength={120} placeholder={plan?.planer || "Büro / Person"} /></Feld>
        <Feld id={`${basis}-ps`} label="Planstand"><input id={`${basis}-ps`} type="date" className={eingabe} value={w.planstand} onChange={(e) => setze("planstand", e.target.value)} /></Feld>
        <Feld id={`${basis}-ae`} label="Änderung gegenüber Vorstand"><input id={`${basis}-ae`} className={eingabe} value={w.aenderung} onChange={(e) => setze("aenderung", e.target.value)} maxLength={300} /></Feld>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
          <FileUp aria-hidden="true" className="h-4 w-4" />
          {datei ? datei.name.slice(0, 40) : "Datei wählen"}
          <input type="file" accept={ANNAHME_ENDUNGEN} className="sr-only" onChange={(e) => setDatei(e.target.files?.[0] || null)} />
        </label>
        <button type="submit" disabled={a.laeuft} className="inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">
          {a.laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {plan ? `Neuen Planstand zu ${plan.plannummer} hochladen` : "Plan hochladen"}
        </button>
      </div>
      <p className="text-[12px] text-ink-500">DWG/DXF bis 30 MB, PDF bis 25 MB, Shapefile als ZIP (.shp, .shx, .dbf, .prj) bis 20 MB, KML/KMZ/GeoJSON bis 10 MB. Der Dateityp wird am Inhalt erkannt. Neue Stände starten als Entwurf mit dem nächsten Änderungsindex.</p>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </form>
  );
}

function VersionZeile({ v, darfSchreiben, istPlaner, aktionen, kalkulationLink }) {
  const a = useAktion();
  const [offen, setOffen] = useState(false);
  const aktion = async (name) => {
    let kommentar = "";
    if (["zurueckweisen", "zurueckziehen"].includes(name)) {
      kommentar = window.prompt("Begründung (Pflicht):") || "";
      if (!kommentar) return;
    }
    await a.ausfuehren(() => senden(`/api/portal/planung/versionen/${v.id}`, { body: { aktion: name, kommentar } }), { meldung: "Gespeichert." });
  };
  const kz = v.analyse?.kennzahlen;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="ov-num inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-navy-900 px-2 text-[12.5px] font-bold text-white" title="Änderungsindex">{v.index}</span>
        <PlanStatus status={v.status} label={v.statusLabel} />
        <span className="text-[13px] text-ink-700">{v.formatLabel} · {groesse(v.datei.groesse || 0)} · Stand {datum(v.planstand)} · {v.planer || v.von}</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {v.vorschau && v.vorschau.art !== "pdf" && <Link href={v.vorschau.seite} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Eye aria-hidden="true" className="h-3.5 w-3.5" />Vorschau</Link>}
          {v.format === "pdf" && <a href={`${v.link}?anzeigen=1`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Eye aria-hidden="true" className="h-3.5 w-3.5" />Ansehen</a>}
          <a href={v.link} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download aria-hidden="true" className="h-3.5 w-3.5" />{v.format.toUpperCase()}</a>
          {v.abgeleitet && <a href={`${v.link}?abgeleitet=1`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download aria-hidden="true" className="h-3.5 w-3.5" />{v.abgeleitet.art.toUpperCase()} (abgeleitet)</a>}
          {v.status === "entwurf" && (darfSchreiben || istPlaner) && <button type="button" onClick={() => aktion("einreichen")} disabled={a.laeuft} className="inline-flex h-8 items-center rounded-full bg-navy-700 px-3 text-[12.5px] font-semibold text-white hover:bg-navy-800 disabled:opacity-60">{aktionen?.einreichen || "Zur Prüfung geben"}</button>}
          {v.status === "pruefung" && darfSchreiben && <button type="button" onClick={() => aktion("freigeben")} disabled={a.laeuft} className="inline-flex h-8 items-center rounded-full bg-ov-600 px-3 text-[12.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-60">Freigeben</button>}
          {v.status === "pruefung" && darfSchreiben && <button type="button" onClick={() => aktion("zurueckweisen")} disabled={a.laeuft} className="inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold text-red-700 hover:bg-red-50">Zurückweisen</button>}
          {v.status === "freigegeben" && darfSchreiben && <button type="button" onClick={() => aktion("zurueckziehen")} disabled={a.laeuft} className="inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold text-ink-600 hover:bg-ink-50">Freigabe zurücknehmen</button>}
          {v.format === "dwg" && darfSchreiben && v.konvertierung?.status !== "fertig" && <button type="button" onClick={() => aktion("konvertieren")} disabled={a.laeuft} className="inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Konvertieren</button>}
          {v.format === "dwg" && darfSchreiben && v.abgeleitet && !v.analyse?.kennzahlen && <button type="button" onClick={() => aktion("analysieren")} disabled={a.laeuft} className="inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Kennzahlen auswerten</button>}
          <button type="button" onClick={() => setOffen((x) => !x)} aria-expanded={offen} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-600 hover:bg-ink-50" aria-label={`Details Index ${v.index}`}><ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform", offen && "rotate-180")} /></button>
        </span>
      </div>
      {v.aenderung && <p className="mt-1.5 text-[13px] text-ink-600">{v.aenderung}</p>}
      {v.konvertierung && v.konvertierung.status !== "fertig" && <p className="mt-1.5 text-[12.5px] font-medium text-ink-600">DWG: {v.konvertierung.hinweis}</p>}
      {a.laeuft && <Loader2 aria-hidden="true" className="mt-1 h-4 w-4 animate-spin text-ink-500" />}
      <FehlerBox>{a.fehler}</FehlerBox>
      {offen && (
        <div className="mt-3 grid gap-3 rounded-2xl bg-ink-50/70 p-3 text-[12.5px] text-ink-700 md:grid-cols-2">
          {kz && (
            <div>
              <p className="font-semibold text-ink-900">Kennzahlen aus der Zeichnung</p>
              {kz.layerGefunden?.length ? (
                <ul className="mt-1 space-y-0.5">
                  {kz.tische > 0 && <li>{fmt(kz.tische)} Modultische · {fmt(kz.modulflaecheM2)} m² Modulfläche (≈ {fmt(kz.kwpGeschaetzt)} kWp geschätzt)</li>}
                  {kz.zaunM > 0 && <li>Zaun {fmt(kz.zaunM)} m</li>}
                  {kz.kabelMsM > 0 && <li>MS-Kabeltrasse {fmt(kz.kabelMsM)} m</li>}
                  {kz.wegeM2 > 0 && <li>Wege {fmt(kz.wegeM2)} m²</li>}
                  {kz.trafos > 0 && <li>{kz.trafos} Trafostation(en)</li>}
                  {kz.anlageHa > 0 && <li>Anlagenfläche (Baugrenze) {fmt(kz.anlageHa, 2)} ha</li>}
                </ul>
              ) : <p className="mt-1">{kz.hinweise?.[0]}</p>}
              {kz.layerGefunden?.length > 0 && kalkulationLink && <Link href={kalkulationLink} className="mt-2 inline-block font-semibold text-ov-700 hover:text-ov-800">In die Kostenkalkulation übernehmen …</Link>}
            </div>
          )}
          {v.analyse?.einheit && <div><p className="font-semibold text-ink-900">Zeichnung</p><p className="mt-1">Einheit: {v.analyse.einheit.label}{v.analyse.groesse ? ` · Ausdehnung ${fmt(v.analyse.groesse.breiteM)} × ${fmt(v.analyse.groesse.hoeheM)} m` : ""}{v.analyse.entitaeten ? ` · ${fmt(v.analyse.entitaeten)} Objekte` : ""}{v.analyse.dwgRelease ? ` · ${v.analyse.dwgRelease}` : ""}</p>{v.analyse.hinweis && <p className="mt-1 text-ink-900 font-semibold">{v.analyse.hinweis}</p>}{v.analyse.fehler && <p className="mt-1 text-red-700">{v.analyse.fehler}</p>}</div>}
          {v.statusVerlauf?.length > 0 && (
            <div className="md:col-span-2">
              <p className="font-semibold text-ink-900">Verlauf</p>
              <ol className="mt-1 space-y-0.5">{v.statusVerlauf.map((s, i) => <li key={i}>{new Date(s.am).toLocaleString("de-DE")} · {s.status} · {s.von}{s.kommentar ? ` – ${s.kommentar}` : ""}</li>)}</ol>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function Planliste({ projektId, daten, kalkulationLink = null, extern = false }) {
  const [filter, setFilter] = useState("");
  const [neu, setNeu] = useState(false);
  const [versionFuer, setVersionFuer] = useState(null);
  const auswahl = { ...daten.auswahl, bo: daten.rechte.backoffice };
  const liste = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? daten.plaene.filter((p) => `${p.plannummer} ${p.titel} ${p.planartLabel} ${p.planer}`.toLowerCase().includes(q)) : daten.plaene;
  }, [filter, daten.plaene]);
  const offenPruefung = daten.plaene.filter((p) => p.versionen.some((v) => v.status === "pruefung")).length;

  return (
    <div className="space-y-6">
      <Karte
        titel={extern ? "Pläne" : "Planunterlagen (CAD, PDF, Geodaten)"}
        untertitel={extern ? "Freigegebene bzw. Ihnen zugewiesene Pläne" : `${daten.plaene.length} Pläne${offenPruefung ? ` · ${offenPruefung} zur Prüfung` : ""}${daten.konverter ? " · DWG-Konvertierung aktiv" : " · DWG: Vorschau nach Konvertierung"}`}
        aktion={daten.rechte.neuerPlan ? <button type="button" onClick={() => setNeu((x) => !x)} aria-expanded={neu} className="inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700"><FileUp aria-hidden="true" className="h-4 w-4" />Neuer Plan</button> : null}
      >
        {neu && <div className="mb-5"><UploadFormular projektId={projektId} meilensteine={daten.meilensteine} auswahl={auswahl} onFertig={() => setNeu(false)} /></div>}
        {daten.plaene.length > 4 && (
          <div className="relative mb-4 max-w-sm">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Plannummer, Titel, Planer …" aria-label="Pläne filtern" className={cn(eingabe, "pl-10")} />
          </div>
        )}
        {!liste.length ? (
          <Leer titel="Noch keine Pläne" text={extern ? "Sobald Pläne für Sie freigegeben sind, erscheinen sie hier." : "Laden Sie Lagepläne, Belegungs- oder Trassenpläne als DWG/DXF, PDF oder georeferenziert hoch."} />
        ) : (
          <ul className="space-y-4">
            {liste.map((p) => (
              <li key={p.id} className="rounded-2xl ring-1 ring-ink-200/70">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500"><span className="ov-num">{p.plannummer}</span> · {p.planartLabel}</p>
                    <h3 className="mt-0.5 font-display text-[16px] font-bold text-ink-900">{p.titel}</h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-600">Maßstab {p.massstab} · {p.blattformat}{p.planer ? ` · ${p.planer}` : ""}{p.meilenstein ? ` · Meilenstein: ${p.meilenstein.titel}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.index && <span className="text-[12.5px] text-ink-600">Index <strong className="ov-num">{p.index}</strong></span>}
                    <PlanStatus status={p.status} label={p.statusLabel} />
                  </div>
                </div>
                <div className="px-4">
                  <ul className="divide-y divide-ink-100">
                    {p.versionen.map((v) => <VersionZeile key={v.id} v={v} darfSchreiben={daten.rechte.schreiben} istPlaner={p.istPlaner} aktionen={daten.auswahl?.aktionen} kalkulationLink={kalkulationLink} />)}
                  </ul>
                  {p.darfHochladen && (
                    <div className="pb-4">
                      {versionFuer === p.id ? <UploadFormular projektId={projektId} plan={p} auswahl={auswahl} onFertig={() => setVersionFuer(null)} /> : <button type="button" onClick={() => setVersionFuer(p.id)} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800">+ Neuen Planstand hochladen</button>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Karte>
      {!extern && (
        <Karte titel="Layer-Konvention für automatische Kennzahlen" untertitel="Gilt für DXF (auch aus DWG konvertiert) und georeferenzierte Dateien (Layer = Eigenschaft „layer“)">
          <ul className="grid gap-2 text-[13.5px] text-ink-700 sm:grid-cols-2">
            <li><strong>PV_Module</strong> – Modultische (geschlossene Konturen bzw. Blöcke) und Modulfläche</li>
            <li><strong>Zaun</strong> – Zaunlänge</li>
            <li><strong>Kabel_MS</strong> – Länge der Mittelspannungstrasse</li>
            <li><strong>Wege</strong> – Wegeflächen (geschlossene Konturen)</li>
            <li><strong>Trafostation</strong> – Anzahl Stationen</li>
            <li><strong>Baugrenze</strong> / Umgriff – Anlagenfläche in ha</li>
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-500">Groß-/Kleinschreibung egal, Präfix genügt (z. B. „PV_Module_Feld1“). Übernahme in die Kalkulation nur nach Bestätigung. Formate: {Object.values(FORMATE).map((f) => f.label).join(", ")}.</p>
        </Karte>
      )}
    </div>
  );
}

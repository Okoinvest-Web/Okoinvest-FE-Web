"use client";

// src/components/Portal/Akquise2/KampagneDetail.js – Kampagne: Kennzahlen, Start (Grundbuch-Aufgabenkette), Serienbrief-PDF,
// Versandliste, Versand bestätigen, Nachfassstufen, Zielflächen mit Eigentümer-Erfassung und Rücklauf je Empfänger.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, ChevronDown, Download, ExternalLink, FileText, Play, Send, ShieldBan, Trash2, UserPlus } from "lucide-react";
import { Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { EMPFAENGER_STATUS, KAMPAGNE_STATUS, NACHFASS_ARTEN, SPERR_GRUENDE, SPERR_QUELLEN, ZIEL_STATUS, codeLesbar } from "@/lib/plattform/akquise-kampagne";
import { Ampel, Mini, datum, eur, knopf, zahl } from "./teile";

const ZIEL_TON = { offen: "neutral", grundbuch: "info", ermittelt: "info", angeschrieben: "info", reaktion: "ok", termin: "ok", gesichert: "ok", abgelehnt: "neutral", gesperrt: "warn" };
const LEER_PERSON = { anrede: "", titel: "", vorname: "", nachname: "", firma: "", strasse: "", plz: "", ort: "", flurstuecke: [] };

function useAktion() {
  const router = useRouter();
  const [status, setStatus] = useState({ laeuft: false, fehler: "", ok: "" });
  async function los(fn, ok) {
    setStatus({ laeuft: true, fehler: "", ok: "" });
    try {
      const r = await fn();
      setStatus({ laeuft: false, fehler: "", ok: typeof ok === "function" ? ok(r) : ok || "" });
      router.refresh();
      return r;
    } catch (e) {
      setStatus({ laeuft: false, fehler: e.message, ok: "" });
      return null;
    }
  }
  return [status, los];
}

// ------------------------------------------------------------------------------------------------ Eigentümer erfassen

function GrundbuchFormular({ ziel, onFertig }) {
  const [personen, setPersonen] = useState([{ ...LEER_PERSON }]);
  const [kosten, setKosten] = useState("");
  const [status, los] = useAktion();
  const setze = (i, feld, wert) => setPersonen((l) => l.map((p, j) => (j === i ? { ...p, [feld]: wert } : p)));
  return (
    <form
      className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-100"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await los(() => senden(`/api/admin/geodaten/kampagnen/ziele/${ziel.id}/grundbuch`, { body: { empfaenger: personen, kostenIst: kosten } }), (x) => `${x.neu.length} Eigentümer erfasst${x.neu.some((y) => y.gesperrt) ? " – davon gesperrt (Sperrliste): " + x.neu.filter((y) => y.gesperrt).length : ""}.`);
        if (r) onFertig?.();
      }}
    >
      <p className="text-[13px] font-semibold text-ink-800">Ergebnis der Grundbuchabfrage erfassen</p>
      <p className="text-[12.5px] text-ink-600">Nur für diese Kampagne, keine Weitergabe. Vor dem Anlegen wird gegen die Sperrliste abgeglichen (Name + PLZ).</p>
      {personen.map((p, i) => (
        <fieldset key={i} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-ink-100 sm:grid-cols-6">
          <legend className="sr-only">Eigentümer {i + 1}</legend>
          <select aria-label="Anrede" value={p.anrede} onChange={(e) => setze(i, "anrede", e.target.value)} className={cn(auswahlfeld, "h-10 sm:col-span-1")}>
            <option value="">Anrede</option><option>Frau</option><option>Herr</option><option>Divers</option>
          </select>
          <input aria-label="Titel" placeholder="Titel" value={p.titel} onChange={(e) => setze(i, "titel", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-1")} />
          <input aria-label="Vorname" placeholder="Vorname" value={p.vorname} onChange={(e) => setze(i, "vorname", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-2")} />
          <input aria-label="Nachname" placeholder="Nachname" value={p.nachname} onChange={(e) => setze(i, "nachname", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-2")} />
          <input aria-label="Firma" placeholder="Firma / Erbengemeinschaft (optional)" value={p.firma} onChange={(e) => setze(i, "firma", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-3")} />
          <input aria-label="Straße" placeholder="Straße und Hausnummer" required value={p.strasse} onChange={(e) => setze(i, "strasse", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-3")} />
          <input aria-label="PLZ" placeholder="PLZ" required value={p.plz} onChange={(e) => setze(i, "plz", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-2")} />
          <input aria-label="Ort" placeholder="Ort" required value={p.ort} onChange={(e) => setze(i, "ort", e.target.value)} className={cn(eingabe, "h-10 sm:col-span-4")} />
          {ziel.parzellen.length > 1 && (
            <div className="flex flex-wrap gap-1.5 sm:col-span-6">
              <span className="text-[12px] text-ink-500">Flurstücke dieser Person (leer = alle):</span>
              {ziel.parzellen.map((x) => (
                <label key={x.id} className="inline-flex items-center gap-1 text-[12px] text-ink-700">
                  <input type="checkbox" checked={p.flurstuecke.includes(x.id)} onChange={(e) => setze(i, "flurstuecke", e.target.checked ? [...p.flurstuecke, x.id] : p.flurstuecke.filter((y) => y !== x.id))} className="h-3.5 w-3.5 accent-[#558227]" />
                  {x.gstNr}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className={knopf.klein} onClick={() => setPersonen((l) => [...l, { ...LEER_PERSON }])}><UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Weitere Person</button>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-700">
          Tatsächliche Kosten ({ziel.grundbuch?.schaetzung?.waehrung === "CHF" ? "CHF" : "€"})
          <input inputMode="decimal" value={kosten} onChange={(e) => setKosten(e.target.value)} className={cn(eingabe, "h-9 w-24")} placeholder={String(ziel.grundbuch?.schaetzung?.betrag ?? "")} />
        </label>
        <button type="submit" className={knopf.primaer} disabled={status.laeuft}>Speichern</button>
      </div>
      <FehlerBox>{status.fehler}</FehlerBox>
      <ErfolgBox>{status.ok}</ErfolgBox>
    </form>
  );
}

// ------------------------------------------------------------------------------------------------ Empfänger

function EmpfaengerZeile({ ziel, e, darfSchreiben }) {
  const [aktion, setAktion] = useState(null);
  const [wert, setWert] = useState({});
  const [status, los] = useAktion();
  const url = `/api/admin/geodaten/kampagnen/ziele/${ziel.id}/empfaenger/${e.id}`;
  const patch = (body, ok) => los(() => senden(url, { method: "PATCH", body }), ok).then((r) => r && setAktion(null));
  const name = [e.anrede, e.titel, e.vorname, e.nachname].filter(Boolean).join(" ") || e.firma;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink-900">{name}{e.firma && e.nachname ? ` · ${e.firma}` : ""}</p>
          <p className="text-[12.5px] text-ink-500">{e.strasse}, {e.plz} {e.ort}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-600">
            <span>Code <span className="font-mono font-semibold text-navy-700">{codeLesbar(e.code)}</span></span>
            <span>Briefe {e.briefe?.length || 0}{e.briefe?.[0] ? ` (seit ${datum(e.briefe[0].am)})` : ""}</span>
            <span>Aufrufe {e.aufrufe || 0}</span>
            <span>Anfragen {e.anfragen?.length || 0}</span>
            {e.termine?.length > 0 && <span>Termin {datum(e.termine.at(-1).am)}</span>}
            <span>Telefon: {e.einwilligungTelefon ? `Einwilligung (${datum(e.einwilligungTelefon.am)})` : "keine Einwilligung"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge ton={e.gesperrt ? "warn" : ["reaktion", "termin", "gesichert"].includes(e.status) ? "ok" : "neutral"}>{EMPFAENGER_STATUS[e.status] || e.status}</Badge>
          {!e.gesperrt && e.codeAktiv && (
            <a href={`/angebot/${e.code}`} target="_blank" rel="noopener noreferrer" className={knopf.klein} title="Angebotsseite ansehen (zählt als Aufruf)"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Seite</a>
          )}
        </div>
      </div>
      {darfSchreiben && !e.gesperrt && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[["rueckmeldung", "Rückmeldung"], ["termin", "Termin"], ["telefon", e.einwilligungTelefon ? "Einwilligung widerrufen" : "Einwilligung Telefon"], ["gesichert", "Gesichert"], ["abgelehnt", "Kein Interesse"]].map(([a, l]) => (
            <button key={a} type="button" className={knopf.klein} aria-pressed={aktion === a} onClick={() => (a === "telefon" && e.einwilligungTelefon ? patch({ einwilligungTelefon: null }, "Einwilligung widerrufen.") : setAktion(aktion === a ? null : a))}>{l}</button>
          ))}
          <button type="button" className={knopf.gefahr} aria-pressed={aktion === "sperren"} onClick={() => setAktion(aktion === "sperren" ? null : "sperren")}><ShieldBan className="h-3.5 w-3.5" aria-hidden="true" /> Widerspruch</button>
        </div>
      )}
      {aktion && (
        <form
          className="mt-2 grid gap-2 rounded-xl bg-sand-50 p-3 ring-1 ring-ink-100 sm:grid-cols-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (aktion === "rueckmeldung") patch({ rueckmeldung: wert.text || "Rückmeldung erhalten" }, "Rückmeldung erfasst.");
            if (aktion === "termin") patch({ termin: { am: wert.am, notiz: wert.text } }, "Termin erfasst.");
            if (aktion === "telefon") patch({ einwilligungTelefon: { quelle: wert.text, telefon: wert.telefon } }, "Einwilligung erfasst.");
            if (aktion === "gesichert") patch({ status: "gesichert", gesichertHa: wert.ha }, "Als gesichert markiert.");
            if (aktion === "abgelehnt") patch({ status: "abgelehnt" }, "Als „kein Interesse“ markiert.");
            if (aktion === "sperren") los(() => senden(url, { body: { grund: wert.grund || "widerspruch", quelle: wert.quelle || "brief", notiz: wert.text } }), "Gesperrt – gilt für alle Kampagnen.").then((r) => r && setAktion(null));
          }}
        >
          {aktion === "termin" && <input type="datetime-local" required aria-label="Termin" value={wert.am || ""} onChange={(x) => setWert({ ...wert, am: x.target.value })} className={cn(eingabe, "h-10")} />}
          {aktion === "telefon" && <input aria-label="Telefonnummer" placeholder="Telefon" value={wert.telefon || ""} onChange={(x) => setWert({ ...wert, telefon: x.target.value })} className={cn(eingabe, "h-10")} />}
          {aktion === "gesichert" && <input aria-label="Gesicherte Fläche (ha)" placeholder={`ha (Standard ${zahl(ziel.ha, 1)})`} inputMode="decimal" value={wert.ha || ""} onChange={(x) => setWert({ ...wert, ha: x.target.value })} className={cn(eingabe, "h-10")} />}
          {aktion === "sperren" && (
            <>
              <select aria-label="Grund" value={wert.grund || "widerspruch"} onChange={(x) => setWert({ ...wert, grund: x.target.value })} className={cn(auswahlfeld, "h-10")}>{Object.entries(SPERR_GRUENDE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <select aria-label="Eingang" value={wert.quelle || "brief"} onChange={(x) => setWert({ ...wert, quelle: x.target.value })} className={cn(auswahlfeld, "h-10")}>{Object.entries(SPERR_QUELLEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </>
          )}
          {aktion !== "abgelehnt" && aktion !== "gesichert" && (
            <input aria-label="Notiz" required={aktion === "telefon"} minLength={aktion === "telefon" ? 3 : 0} placeholder={aktion === "telefon" ? "Nachweis, z. B. „Rückantwortkarte vom …, unterschrieben“" : "Notiz"} value={wert.text || ""} onChange={(x) => setWert({ ...wert, text: x.target.value })} className={cn(eingabe, "h-10 sm:col-span-2")} />
          )}
          <button type="submit" className={aktion === "sperren" ? knopf.gefahr : knopf.primaer} disabled={status.laeuft}>{aktion === "sperren" ? "Sperren" : "Speichern"}</button>
        </form>
      )}
      <FehlerBox>{status.fehler}</FehlerBox>
      <ErfolgBox>{status.ok}</ErfolgBox>
    </li>
  );
}

function ZielKarte({ kampagne, ziel, darfSchreiben }) {
  const [offen, setOffen] = useState(false);
  const [formular, setFormular] = useState(false);
  const gb = ziel.grundbuch || {};
  return (
    <li className="rounded-2xl bg-white ring-1 ring-ink-200/70">
      <button type="button" onClick={() => setOffen((x) => !x)} aria-expanded={offen} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
        <Ampel ampel={ziel.ampel} wert={ziel.score} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold text-ink-900">{ziel.gemeinde} · {zahl(ziel.ha, 1)} ha · {zahl(ziel.mwp, 1)} MWp{ziel.demo ? " · DEMO" : ""}</span>
          <span className="block truncate text-[12px] text-ink-500">{ziel.id} · {ziel.parzellen.length} Flurstücke · Grundbuch {eur(gb.kostenIst ?? gb.schaetzung?.betrag, gb.schaetzung?.waehrung)}{gb.kostenIst == null ? " (Schätzung)" : ""} · {ziel.empfaengerAnzahl} Empfänger{ziel.auchInAndererKampagne ? " · auch in anderer Kampagne" : ""}</span>
        </span>
        <Badge ton={ZIEL_TON[ziel.status]}>{ZIEL_STATUS[ziel.status] || ziel.status}</Badge>
        <ChevronDown className={cn("h-4 w-4 text-ink-400 transition-transform", offen && "rotate-180")} aria-hidden="true" />
      </button>
      {offen && (
        <div className="space-y-3 border-t border-ink-100 px-4 py-3">
          <p className="text-[12.5px] text-ink-600">
            Flurstücke: {ziel.parzellen.map((p) => `${String(p.kg || "").replace(/^DEMO-(KG|Gemarkung)\s*/, "")} ${p.gstNr}${ziel.gesperrteFlurstuecke?.includes(p.id) ? " (gesperrt)" : ""}`).join(", ")}
          </p>
          {ziel.netz && <p className="text-[12.5px] text-ink-600">Netz: {ziel.netz.name || ziel.netz.art}, Trasse ≈ {zahl((ziel.netz.trasseM || 0) / 1000, 1)} km · Pacht (unverbindlich) {zahl(ziel.pacht?.proHaMin)}–{zahl(ziel.pacht?.proHaMax)} €/ha</p>}
          {ziel.widmungText && <p className="text-[12.5px] text-ink-600">{ziel.widmungText}</p>}
          <ul className="divide-y divide-ink-100">{(ziel.empfaenger || []).map((e) => <EmpfaengerZeile key={e.id} ziel={ziel} e={e} darfSchreiben={darfSchreiben} />)}</ul>
          {darfSchreiben && kampagne.status === "aktiv" && ziel.status !== "gesperrt" && (
            formular ? <GrundbuchFormular ziel={ziel} onFertig={() => setFormular(false)} /> : (
              <button type="button" className={knopf.sekundaer} onClick={() => setFormular(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> {ziel.empfaengerAnzahl ? "Weiteren Eigentümer erfassen" : "Grundbuch-Ergebnis erfassen"}</button>
            )
          )}
          {kampagne.status === "entwurf" && <p className="text-[12.5px] text-ink-500">Eigentümer werden erfasst, sobald die Kampagne gestartet ist (Grundbuch-Aufgabe).</p>}
        </div>
      )}
    </li>
  );
}

// ------------------------------------------------------------------------------------------------ Kampagne

function Einstellungen({ k, vorlagen, darfSchreiben }) {
  const [f, setF] = useState({ nachfass: k.nachfass.map((s) => ({ ...s })), vorlageId: k.vorlageId || "", porto: k.kosten?.porto ?? "", druck: k.kosten?.druck ?? "", sonstige: k.kosten?.sonstige ?? 0, beschreibung: k.beschreibung || "" });
  const [status, los] = useAktion();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        los(() => senden(`/api/admin/geodaten/kampagnen/${k.id}`, { method: "PATCH", body: { nachfass: f.nachfass, vorlageId: f.vorlageId || null, kosten: { porto: f.porto, druck: f.druck, sonstige: f.sonstige }, beschreibung: f.beschreibung } }), "Gespeichert.");
      }}
    >
      <fieldset>
        <legend className="mb-1 text-[13.5px] font-semibold text-ink-800">Nachfassstufen (Automationsregeln)</legend>
        <p className="mb-2 text-[12.5px] text-ink-600">Nach X Tagen ohne Reaktion (Anfrage, Termin, Rückmeldung, Widerspruch) legt die Kampagne eine Aufgabe an. Ein Seitenaufruf allein zählt nicht als Reaktion.</p>
        {f.nachfass.map((s, i) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 py-1 text-[13.5px] text-ink-800">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={s.aktiv} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, nachfass: f.nachfass.map((x, j) => (j === i ? { ...x, aktiv: e.target.checked } : x)) })} className="h-4 w-4 accent-[#558227]" />
              {NACHFASS_ARTEN[s.art]?.label}
            </label>
            <span>nach</span>
            <input aria-label="Tage" inputMode="numeric" value={s.nachTagen} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, nachfass: f.nachfass.map((x, j) => (j === i ? { ...x, nachTagen: e.target.value } : x)) })} className={cn(eingabe, "h-9 w-20")} />
            <span>Tagen</span>
          </div>
        ))}
        {k.land === "AT" && <Hinweis ton="warn" className="mt-2">Österreich: Nach der DSB-Praxis ist eine einmalige Zusendung zulässig – den zweiten Brief nur nach rechtlicher Prüfung aktivieren.</Hinweis>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-4">
        <Feld id="e-vl" label="Brieftext (Vorlage)" className="sm:col-span-4" hinweis="Standardtext oder eine Vorlage aus „Vorlagen“ mit Platzhaltern wie {{flaeche.gemeinde}}, {{flaeche.pachtMin}}, {{angebot.link}}. Datenschutz- und Widerspruchsblock sind fest.">
          <select id="e-vl" value={f.vorlageId} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, vorlageId: e.target.value })} className={auswahlfeld}>
            <option value="">Standard-Serienbrief (Flächenakquise)</option>
            {vorlagen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Feld>
        <Feld id="e-porto" label="Porto je Brief"><input id="e-porto" inputMode="decimal" value={f.porto} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, porto: e.target.value })} className={eingabe} placeholder="Standard" /></Feld>
        <Feld id="e-druck" label="Druck je Brief"><input id="e-druck" inputMode="decimal" value={f.druck} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, druck: e.target.value })} className={eingabe} placeholder="Standard" /></Feld>
        <Feld id="e-sonst" label="Sonstige Kosten" className="sm:col-span-2"><input id="e-sonst" inputMode="decimal" value={f.sonstige} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, sonstige: e.target.value })} className={eingabe} /></Feld>
        <Feld id="e-besch" label="Beschreibung / Strategie" className="sm:col-span-4"><textarea id="e-besch" value={f.beschreibung} disabled={!darfSchreiben} onChange={(e) => setF({ ...f, beschreibung: e.target.value })} className={textbereich} /></Feld>
      </div>
      {darfSchreiben && <button type="submit" className={knopf.primaer} disabled={status.laeuft}>Einstellungen speichern</button>}
      <FehlerBox>{status.fehler}</FehlerBox>
      <ErfolgBox>{status.ok}</ErfolgBox>
    </form>
  );
}

export default function KampagneDetail({ daten, darfSchreiben = false, leitung = false }) {
  const router = useRouter();
  const { kampagne: k, ziele, aufgaben, vorlagen } = daten;
  const z = k.kennzahlen;
  const [status, los] = useAktion();
  const [zeigeEinst, setZeigeEinst] = useState(false);
  const [filter, setFilter] = useState("");
  const bereit = useMemo(() => {
    const e = ziele.flatMap((x) => x.empfaenger || []);
    return {
      s1: e.filter((x) => !x.gesperrt && x.codeAktiv && !(x.briefe || []).length).length,
      s2: e.filter((x) => !x.gesperrt && (x.briefe || []).length === 1 && Object.entries(x.nachfass || {}).some(([id, n]) => n.ergebnis === "aufgabe" && k.nachfass.find((s) => s.id === id)?.art === "zweiter_brief") && !["reaktion", "termin", "gesichert", "abgelehnt", "widerspruch"].includes(x.status)).length,
    };
  }, [ziele, k.nachfass]);
  const sichtbar = filter ? ziele.filter((x) => x.status === filter) : ziele;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton={k.status === "aktiv" ? "ok" : "neutral"}>{KAMPAGNE_STATUS[k.status]}</Badge>
        {k.test && <Badge ton="warn">Testkampagne</Badge>}
        {k.demo && <Badge ton="warn">Demo-Daten</Badge>}
        <span className="text-[12.5px] text-ink-500">{k.id} · {{ DE: "Deutschland", AT: "Österreich", CH: "Schweiz" }[k.land]} · Quelle: {{ auswahl: "Kartenauswahl", filter: "Filter", gemeinde: `Gemeinde ${k.quelle?.gemeinde || ""}` }[k.quelle?.art]}{k.gestartetAm ? ` · gestartet ${datum(k.gestartetAm)}` : ""}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Mini label="Zielflächen" wert={zahl(z.ziele)} hinweis={`${zahl(z.ha, 1)} ha · ${zahl(z.mwp, 1)} MWp`} />
        <Mini label="Empfänger" wert={zahl(z.empfaenger)} hinweis={`${zahl(z.gesperrt)} gesperrt`} />
        <Mini label="Briefe" wert={zahl(z.briefe)} hinweis={`${zahl(z.flurstuecke)} Flurstücke`} />
        <Mini label="Aufrufe" wert={zahl(z.aufrufe)} hinweis={z.aufrufQuote != null ? `${zahl(z.aufrufQuote, 1)} % der Angeschriebenen` : "noch kein Versand"} />
        <Mini label="Anfragen / Termine" wert={`${zahl(z.anfragen)} / ${zahl(z.termine)}`} hinweis={z.ruecklaufQuote != null ? `Rücklauf ${zahl(z.ruecklaufQuote, 1)} %` : ""} />
        <Mini label="Gesichert" wert={`${zahl(z.gesichertHa, 1)} ha`} hinweis={z.kostenJeHa != null ? `${eur(z.kostenJeHa, z.kosten.waehrung)} je ha` : `Kosten ${eur(z.kosten.summe, z.kosten.waehrung)}`} />
      </div>
      <p className="text-[12.5px] text-ink-600">
        Kosten: Grundbuch {eur(z.kosten.grundbuch, z.kosten.waehrung)} (Plan {eur(z.kosten.grundbuchPlan, z.kosten.waehrung)}) · Versand {eur(z.kosten.versand, z.kosten.waehrung)} · Sonstige {eur(z.kosten.sonstige, z.kosten.waehrung)} · Widersprüche {zahl(z.widersprueche)}
      </p>

      <Karte titel="Ablauf" untertitel="1. Starten → Grundbuch-Aufgaben · 2. Eigentümer erfassen · 3. Serienbrief drucken + Versandliste · 4. Versand bestätigen · 5. Rücklauf pflegen, Nachfassen läuft automatisch">
        <div className="flex flex-wrap gap-2">
          {darfSchreiben && k.status === "entwurf" && (
            <button type="button" className={knopf.primaer} disabled={status.laeuft} onClick={() => los(() => senden(`/api/admin/geodaten/kampagnen/${k.id}/starten`, { body: {} }), (r) => `Gestartet – ${r.aufgaben} Grundbuch-Aufgaben angelegt.`)}>
              <Play className="h-4 w-4" aria-hidden="true" /> Kampagne starten
            </button>
          )}
          {[1, 2].map((st) => (bereit[`s${st}`] > 0 || st === 1) && (
            <span key={st} className="contents">
              <a href={`/api/admin/geodaten/kampagnen/${k.id}/serienbrief?stufe=${st}`} className={cn(knopf.navy, !bereit[`s${st}`] && "pointer-events-none opacity-50")} aria-disabled={!bereit[`s${st}`]}>
                <FileText className="h-4 w-4" aria-hidden="true" /> Serienbrief {st === 1 ? "" : "Stufe 2 "}PDF ({bereit[`s${st}`]})
              </a>
              <a href={`/api/admin/geodaten/kampagnen/${k.id}/versandliste?stufe=${st}`} className={cn(knopf.sekundaer, !bereit[`s${st}`] && "pointer-events-none opacity-50")} aria-disabled={!bereit[`s${st}`]}>
                <Download className="h-4 w-4" aria-hidden="true" /> Versandliste CSV
              </a>
              {darfSchreiben && k.status === "aktiv" && (
                <button type="button" className={knopf.sekundaer} disabled={status.laeuft || !bereit[`s${st}`]} onClick={() => window.confirm(`Versand von ${bereit[`s${st}`]} ${st === 1 ? "Erstbriefen" : "Zweitbriefen"} bestätigen? Danach laufen die Nachfassfristen.`) && los(() => senden(`/api/admin/geodaten/kampagnen/${k.id}/versand`, { body: { stufe: st } }), (r) => `${r.anzahl} Briefe als versandt vermerkt.`)}>
                  <Send className="h-4 w-4" aria-hidden="true" /> Versand bestätigen
                </button>
              )}
            </span>
          ))}
          <button type="button" className={knopf.sekundaer} onClick={() => setZeigeEinst((x) => !x)} aria-expanded={zeigeEinst}>Einstellungen</button>
          {darfSchreiben && k.status === "aktiv" && (
            <button type="button" className={knopf.sekundaer} disabled={status.laeuft} onClick={() => window.confirm("Kampagne abschließen? Danach keine Änderungen mehr.") && los(() => senden(`/api/admin/geodaten/kampagnen/${k.id}`, { method: "PATCH", body: { status: "abgeschlossen" } }), "Abgeschlossen.")}>
              <CalendarCheck className="h-4 w-4" aria-hidden="true" /> Abschließen
            </button>
          )}
          {darfSchreiben && (k.test ? leitung : k.status === "entwurf") && (
            <button type="button" className={knopf.gefahr} disabled={status.laeuft} onClick={async () => { if (!window.confirm(k.test ? "Testkampagne mit allen Testdaten löschen?" : "Entwurf löschen?")) return; const r = await los(() => senden(`/api/admin/geodaten/kampagnen/${k.id}`, { method: "DELETE" }), "Gelöscht."); if (r) router.push("/portal/admin/akquise/kampagnen"); }}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Löschen
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2"><FehlerBox>{status.fehler}</FehlerBox><ErfolgBox>{status.ok}</ErfolgBox></div>
        {zeigeEinst && <div className="mt-4 border-t border-ink-100 pt-4"><Einstellungen k={k} vorlagen={vorlagen} darfSchreiben={darfSchreiben && k.status !== "abgeschlossen"} /></div>}
      </Karte>

      <Karte titel={`Zielflächen (${ziele.length})`} aktion={
        <select aria-label="Status filtern" value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(auswahlfeld, "h-10 w-auto")}>
          <option value="">Alle Status</option>
          {Object.entries(ZIEL_STATUS).map(([s, l]) => <option key={s} value={s}>{l} ({ziele.filter((x) => x.status === s).length})</option>)}
        </select>
      }>
        <ul className="space-y-2">{sichtbar.map((x) => <ZielKarte key={x.id} kampagne={k} ziel={x} darfSchreiben={darfSchreiben && k.status !== "abgeschlossen"} />)}</ul>
      </Karte>

      {aufgaben.length > 0 && (
        <Karte titel="Aufgaben der Kampagne" untertitel="Grundbuchabfragen und Nachfassstufen" aktion={<Link href="/portal/admin/aufgaben" className="text-[13.5px] font-semibold text-ov-700">Alle Aufgaben</Link>}>
          <ul className="divide-y divide-ink-100 text-[13.5px]">
            {aufgaben.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 flex-1 text-ink-800">{a.titel}</span>
                <span className="text-[12px] text-ink-500">fällig {datum(a.faelligAm)} · {a.zustaendig}</span>
                <Badge ton={a.status === "offen" ? "info" : "ok"}>{a.status === "offen" ? "offen" : "erledigt"}</Badge>
              </li>
            ))}
          </ul>
        </Karte>
      )}
    </div>
  );
}

"use client";

// Formulare der Gutachteraufträge – Gutachter-Seite (/portal/gutachter/[id]) und Backoffice (/portal/admin/gutachter[/id]).
// Alle Prüfungen passieren serverseitig (gutachter/kern.js + Backend); die Formulare schicken nur JSON bzw. multipart.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { AktionKnopf, Knopf, SchnellFormular, useAktion } from "@/components/Portal/Entwicklung/Formular";
import { cn } from "@/components/ui/cn";
import { BEWERTUNG_KRITERIEN, HONORAR_ARTEN, LIEFER_ARTEN, TERMIN_ARTEN, UST_SAETZE, angebotSummen } from "@/lib/plattform/gutachter/kern";
import { abfragen } from "@/components/ui/Rueckfrage";

const eur = (x) => (Number.isFinite(x) ? `${x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–");
const optionen = (o) => Object.entries(o).map(([wert, label]) => ({ wert, label }));
const USTO = UST_SAETZE.map((s) => ({ wert: String(s), label: `${String(s).replace(".", ",")} %` }));
const zahl = (w) => (w === "" || w === null || w === undefined ? null : Number(String(w).replace(",", ".")));

/** URL der Aktions-API je Seite */
const aktionUrl = (id, bo) => (bo ? `/api/admin/gutachter/${id}` : `/api/portal/gutachter/${id}`);
const aktion = (id, bo, body) => senden(aktionUrl(id, bo), { body });

async function hochladen(url, datei, felder) {
  const fd = new FormData();
  fd.append("datei", datei);
  for (const [k, w] of Object.entries(felder)) if (w !== undefined && w !== null) fd.append(k, typeof w === "object" ? JSON.stringify(w) : String(w));
  let res;
  try {
    res = await fetch(url, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  } catch {
    throw new Error("Keine Verbindung – bitte prüfen Sie Ihre Internetverbindung.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Fehler ${res.status}`);
  return json;
}

// ================================================================ Gutachter

/** Angebot abgeben bzw. aktualisieren – Summen live, Prüfung serverseitig */
export function AngebotFormular({ id, start = null, land = "DE" }) {
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const [w, setW] = useState(() => ({
    honorarArt: start?.honorarArt || "pauschal", honorarNetto: start?.honorarNetto ?? "", stundensatz: start?.stundensatz ?? "", stunden: start?.stunden ?? "", nebenkostenPct: start?.nebenkostenPct ?? 0,
    ustPct: String(start?.ustPct ?? ({ DE: 19, AT: 20, CH: 8.1 }[land] || 19)), ustHinweis: start?.ustHinweis || "", liefertermin: start?.liefertermin || "", gueltigBis: start?.gueltigBis || "",
    abschlagPct: start?.abschlagPct ?? 0, zahlungszielTage: start?.zahlungszielTage ?? 30, termineVorschlag: start?.termineVorschlag || "", bemerkung: start?.bemerkung || "",
  }));
  const set = (k) => (e) => setW((x) => ({ ...x, [k]: e.target.value }));
  const s = angebotSummen({ ...w, honorarNetto: zahl(w.honorarNetto), stundensatz: zahl(w.stundensatz), stunden: zahl(w.stunden), nebenkostenPct: zahl(w.nebenkostenPct), ustPct: zahl(w.ustPct) });
  const feld = (k, label, typ = "text", zusatz = {}) => (
    <Feld id={`${basis}-${k}`} label={label} hinweis={zusatz.hinweis}>
      <input id={`${basis}-${k}`} type={typ === "datum" ? "date" : "text"} inputMode={typ === "zahl" ? "decimal" : undefined} value={w[k]} onChange={set(k)} className={eingabe} />
    </Feld>
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const angebot = { ...w, honorarNetto: zahl(w.honorarNetto), stundensatz: zahl(w.stundensatz), stunden: zahl(w.stunden), nebenkostenPct: zahl(w.nebenkostenPct), ustPct: zahl(w.ustPct), abschlagPct: zahl(w.abschlagPct), zahlungszielTage: zahl(w.zahlungszielTage) };
        await a.ausfuehren(() => aktion(id, false, { aktion: "angebot_abgeben", angebot }), { meldung: "Angebot übermittelt – die Projektleitung wurde informiert." });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Feld id={`${basis}-art`} label="Honorarart">
          <select id={`${basis}-art`} value={w.honorarArt} onChange={set("honorarArt")} className={auswahlfeld}>{optionen(HONORAR_ARTEN).map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}</select>
        </Feld>
        {w.honorarArt === "pauschal" ? feld("honorarNetto", "Pauschalhonorar netto (€)", "zahl") : (
          <>
            {feld("stundensatz", "Stundensatz netto (€)", "zahl")}
            {feld("stunden", "Geschätzte Stunden", "zahl")}
          </>
        )}
        {feld("nebenkostenPct", "Nebenkosten (% des Honorars)", "zahl", { hinweis: "Reisekosten, Druck, Material – pauschal" })}
        <Feld id={`${basis}-ust`} label="Umsatzsteuer">
          <select id={`${basis}-ust`} value={w.ustPct} onChange={set("ustPct")} className={auswahlfeld}>{USTO.map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}</select>
        </Feld>
        {Number(w.ustPct) === 0 && feld("ustHinweis", "Grund für 0 % USt", "text", { hinweis: "z. B. Reverse Charge, Kleinunternehmerregelung" })}
        {feld("liefertermin", "Liefertermin Endfassung", "datum")}
        {feld("gueltigBis", "Angebot gültig bis (Bindefrist)", "datum")}
        {feld("abschlagPct", "Abschlag während der Bearbeitung (%)", "zahl", { hinweis: "0 = nur Schlussrechnung, höchstens 50 %" })}
        {feld("zahlungszielTage", "Zahlungsziel (Tage)", "zahl")}
      </div>
      <Feld id={`${basis}-termine`} label="Terminvorschläge (Begehungen, Kartierzeiträume)">
        <input id={`${basis}-termine`} value={w.termineVorschlag} onChange={set("termineVorschlag")} className={eingabe} maxLength={500} />
      </Feld>
      <Feld id={`${basis}-bem`} label="Bemerkungen zum Angebot (Methodik, Annahmen, Ausschlüsse)">
        <textarea id={`${basis}-bem`} value={w.bemerkung} onChange={set("bemerkung")} className={cn(textbereich, "min-h-[88px]")} maxLength={2000} />
      </Feld>
      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-sand-50 p-4 text-[13.5px] ring-1 ring-ink-200/70 sm:grid-cols-4" aria-live="polite">
        <div><dt className="text-ink-500">Honorar</dt><dd className="ov-num font-semibold text-ink-900">{eur(s.honorar)}</dd></div>
        <div><dt className="text-ink-500">Nebenkosten</dt><dd className="ov-num font-semibold text-ink-900">{eur(s.nebenkosten)}</dd></div>
        <div><dt className="text-ink-500">Summe netto</dt><dd className="ov-num font-semibold text-ink-900">{eur(s.summeNetto)}</dd></div>
        <div><dt className="text-ink-500">Summe brutto</dt><dd className="ov-num font-semibold text-ink-900">{eur(s.summeBrutto)}</dd></div>
      </dl>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>{start ? "Angebot aktualisieren" : "Angebot abgeben"}</Knopf>
    </form>
  );
}

export function AnfrageAblehnen({ id }) {
  return <SchnellFormular spalten={1} knopf="Anfrage ablehnen" meldung="Abgelehnt – die Projektleitung wurde informiert." felder={[{ name: "grund", label: "Grund (optional, z. B. keine Kapazität im Zeitraum)", typ: "text" }]} onSenden={(d) => aktion(id, false, { aktion: "anfrage_ablehnen", grund: d.grund })} />;
}

export function AuftragBestaetigen({ id }) {
  const a = useAktion();
  const [ok, setOk] = useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await a.ausfuehren(() => aktion(id, false, { aktion: "auftrag_bestaetigen", zustimmung: ok }), { meldung: "Auftrag bestätigt – die Projektunterlagen sind jetzt freigeschaltet." }); }}>
      <label className="flex items-start gap-2.5 text-[14px] text-ink-800">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ov-600" required />
        <span>Ich nehme den Auftrag zu Leistung, Honorar und Liefertermin laut Auftragsbestätigung an und verpflichte mich zur Vertraulichkeit (Nutzungsbedingungen § 12).</span>
      </label>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Auftrag verbindlich bestätigen</Knopf>
    </form>
  );
}

export function BerichtFormular({ id, letzter = 0 }) {
  return (
    <SchnellFormular zuruecksetzen knopf="Zwischenstand melden" meldung="Zwischenstand gemeldet." start={{ fortschritt: letzter }}
      felder={[{ name: "fortschritt", label: "Fortschritt in %", typ: "zahl", pflicht: true }, { name: "text", label: "Was ist erledigt, was folgt?", typ: "mehrzeilig", breit: true }]}
      onSenden={(d) => aktion(id, false, { aktion: "bericht", ...d })} />
  );
}

/** Lieferung (Gutachten, Plan als PDF) mit Art hochladen – Version vergibt der Server */
export function LieferungHochladen({ id }) {
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const [art, setArt] = useState("endfassung");
  const [kommentar, setKommentar] = useState("");
  return (
    <div className="space-y-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id={`${basis}-art`} label="Art der Lieferung">
          <select id={`${basis}-art`} value={art} onChange={(e) => setArt(e.target.value)} className={auswahlfeld}>{optionen(LIEFER_ARTEN).map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}</select>
        </Feld>
        <Feld id={`${basis}-k`} label="Kommentar (z. B. erledigte Mängel)">
          <input id={`${basis}-k`} value={kommentar} onChange={(e) => setKommentar(e.target.value)} className={eingabe} maxLength={500} />
        </Feld>
      </div>
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
        {a.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Upload aria-hidden="true" className="h-4 w-4" />}
        Datei wählen und zur Prüfung einreichen
        <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={a.laeuft}
          onChange={async (e) => {
            const d = e.target.files?.[0];
            e.target.value = "";
            if (!d) return;
            await a.ausfuehren(() => hochladen(`/api/portal/gutachter/${id}/dateien`, d, { zweck: "lieferung", art, kommentar }), { meldung: `„${d.name}“ eingereicht – die Projektleitung prüft.` });
            setKommentar("");
          }} />
      </label>
      <p className="text-[12px] text-ink-500">PDF, JPG oder PNG, höchstens 10 MB. Pläne im CAD-Format (DWG/DXF) laden Sie im Bereich „Pläne“ des Projekts hoch.</p>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

/** Rechnung stellen: Rechnungsdaten + PDF; Summen und Grenzen prüft der Server */
export function RechnungHochladen({ id, arten = ["schluss"], ustPct = 19, rest = null }) {
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const heute = new Date().toISOString().slice(0, 10);
  const [r, setR] = useState({ art: arten[0], nummer: "", datum: heute, leistungVon: "", leistungBis: heute, netto: rest ? String(rest) : "", ustPct: String(ustPct), ustHinweis: "", iban: "" });
  const set = (k) => (e) => setR((x) => ({ ...x, [k]: e.target.value }));
  const [datei, setDatei] = useState(null);
  const netto = zahl(r.netto) || 0;
  const brutto = Math.round(netto * (1 + (zahl(r.ustPct) || 0) / 100) * 100) / 100;
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!datei) return a.setFehler("Bitte die Rechnung als PDF anhängen.");
      await a.ausfuehren(() => hochladen(`/api/portal/gutachter/${id}/dateien`, datei, { zweck: "rechnung", rechnung: { ...r, netto: zahl(r.netto), ustPct: zahl(r.ustPct) } }), { meldung: "Rechnung eingereicht – Sie sehen den Zahlungsstatus hier im Auftrag." });
    }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {arten.length > 1 && (
          <Feld id={`${basis}-art`} label="Art">
            <select id={`${basis}-art`} value={r.art} onChange={set("art")} className={auswahlfeld}>{arten.map((x) => <option key={x} value={x}>{x === "abschlag" ? "Abschlagsrechnung" : "Schlussrechnung"}</option>)}</select>
          </Feld>
        )}
        <Feld id={`${basis}-nr`} label="Rechnungsnummer" pflicht><input id={`${basis}-nr`} required value={r.nummer} onChange={set("nummer")} className={eingabe} maxLength={40} /></Feld>
        <Feld id={`${basis}-dat`} label="Rechnungsdatum" pflicht><input id={`${basis}-dat`} type="date" required value={r.datum} onChange={set("datum")} className={eingabe} /></Feld>
        <Feld id={`${basis}-von`} label="Leistung von" pflicht><input id={`${basis}-von`} type="date" required value={r.leistungVon} onChange={set("leistungVon")} className={eingabe} /></Feld>
        <Feld id={`${basis}-bis`} label="Leistung bis" pflicht><input id={`${basis}-bis`} type="date" required value={r.leistungBis} onChange={set("leistungBis")} className={eingabe} /></Feld>
        <Feld id={`${basis}-net`} label="Nettobetrag (€)" pflicht hinweis={rest !== null ? `Noch nicht berechnet: ${eur(rest)}` : undefined}><input id={`${basis}-net`} inputMode="decimal" required value={r.netto} onChange={set("netto")} className={eingabe} /></Feld>
        <Feld id={`${basis}-ust`} label="Umsatzsteuer">
          <select id={`${basis}-ust`} value={r.ustPct} onChange={set("ustPct")} className={auswahlfeld}>{USTO.map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}</select>
        </Feld>
        {Number(r.ustPct) === 0 && <Feld id={`${basis}-uh`} label="Hinweis auf der Rechnung"><input id={`${basis}-uh`} value={r.ustHinweis} onChange={set("ustHinweis")} className={eingabe} placeholder="Steuerschuldnerschaft des Leistungsempfängers" /></Feld>}
        <Feld id={`${basis}-iban`} label="IBAN (optional)"><input id={`${basis}-iban`} value={r.iban} onChange={set("iban")} className={eingabe} autoComplete="off" /></Feld>
      </div>
      <p className="text-[13.5px] text-ink-700">Brutto: <strong className="ov-num">{eur(brutto)}</strong></p>
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
        <Upload aria-hidden="true" className="h-4 w-4" />{datei ? datei.name : "Rechnung (PDF) wählen"}
        <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setDatei(e.target.files?.[0] || null)} />
      </label>
      <p className="text-[12px] text-ink-500">Pflichtangaben (u. a. Ihre Steuernummer bzw. UID, Leistungsbeschreibung) müssen auf der Rechnung selbst stehen – DE § 14 UStG, AT § 11 UStG, CH Art. 26 MWSTG.</p>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Rechnung einreichen</Knopf>
    </form>
  );
}

// ================================================================ Beide Seiten

export function TerminFormular({ id, bo = false }) {
  return (
    <SchnellFormular zuruecksetzen spalten={2} knopf="Termin vorschlagen" meldung="Termin vorgeschlagen – die andere Seite bestätigt."
      felder={[
        { name: "art", label: "Art", typ: "auswahl", optionen: optionen(TERMIN_ARTEN), leer: false },
        { name: "datum", label: "Datum", typ: "datum", pflicht: true },
        { name: "uhrzeit", label: "Uhrzeit (hh:mm)", typ: "text" },
        { name: "ort", label: "Ort / Treffpunkt / Link", typ: "text" },
        { name: "notiz", label: "Hinweis", typ: "text", breit: true },
      ]}
      start={{ art: "begehung" }}
      onSenden={(d) => aktion(id, bo, { aktion: "termin", termin: d })} />
  );
}

export function TerminKnoepfe({ id, bo = false, t, seite }) {
  if (["erledigt", "abgesagt"].includes(t.status)) return null;
  const eigen = t.vonSeite === seite;
  const heute = new Date().toISOString().slice(0, 10);
  return (
    <span className="flex flex-wrap gap-2">
      {t.status === "vorgeschlagen" && !eigen && <AktionKnopf klein variante="primaer" meldung="Bestätigt." fn={() => aktion(id, bo, { aktion: "termin_status", terminId: t.id, status: "bestaetigt" })}>Bestätigen</AktionKnopf>}
      {t.datum <= heute && <AktionKnopf klein meldung="Als erledigt markiert." fn={async () => aktion(id, bo, { aktion: "termin_status", terminId: t.id, status: "erledigt", protokoll: (await abfragen({ titel: "Termin als erledigt markieren?", label: "Kurzprotokoll (optional)", mehrzeilig: true, bestaetigenText: "Als erledigt markieren" })) || "" })}>Erledigt</AktionKnopf>}
      <AktionKnopf klein variante="gefahr" frage="Termin absagen?" meldung="Abgesagt." fn={() => aktion(id, bo, { aktion: "termin_status", terminId: t.id, status: "abgesagt" })}>Absagen</AktionKnopf>
    </span>
  );
}

export function RueckfrageFormular({ id, bo = false, antwortAuf = null, label }) {
  return (
    <SchnellFormular spalten={1} zuruecksetzen knopf={antwortAuf ? "Antworten" : "Senden"} meldung="Gesendet."
      felder={[{ name: "text", label: label || (bo ? "Nachricht an den Gutachter" : "Ihre Frage an die Projektleitung"), typ: "mehrzeilig" }]}
      onSenden={(d) => aktion(id, bo, { aktion: "rueckfrage", text: d.text, antwortAuf })} />
  );
}

// ================================================================ Backoffice

/** Leistungsanfrage an einen oder mehrere Gutachter */
export function AnfrageFormular({ projekte, gutachter, fachgebiete, startProjekt = "" }) {
  const router = useRouter();
  const a = useAktion();
  const basis = useId().replace(/:/g, "");
  const [d, setD] = useState({ projektId: startProjekt || projekte[0]?.id || "", meilensteinId: "", titel: "", fachgebiet: "", leistung: "", angebotsfrist: new Date(Date.now() + 14 * 86400e3).toISOString().slice(0, 10), wunschtermin: "", hinweise: "" });
  const [ids, setIds] = useState([]);
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value, ...(k === "projektId" ? { meilensteinId: "" } : {}) }));
  const p = projekte.find((x) => x.id === d.projektId);
  const passend = gutachter.filter((g) => !d.fachgebiet || g.fachgebiete.includes(d.fachgebiet));
  const andere = gutachter.filter((g) => d.fachgebiet && !g.fachgebiete.includes(d.fachgebiet));
  const chip = (g) => (
    <label key={g.id} className={cn("flex cursor-pointer items-start gap-2 rounded-2xl p-3 text-[13.5px] ring-1 ring-inset", ids.includes(g.id) ? "bg-ov-50 ring-ov-300" : "bg-white ring-ink-200")}>
      <input type="checkbox" checked={ids.includes(g.id)} onChange={(e) => setIds((x) => (e.target.checked ? [...x, g.id] : x.filter((y) => y !== g.id)))} className="mt-0.5 h-4 w-4 accent-ov-600" />
      <span className="min-w-0">
        <span className="block font-semibold text-ink-900">{g.name}{g.firma ? ` · ${g.firma}` : ""}</span>
        <span className="block text-[12px] text-ink-500">{g.schnitt ? `Bewertung ${String(g.schnitt.schnitt).replace(".", ",")} / 5 (${g.schnitt.anzahl})` : "noch nicht bewertet"}{g.termintreue !== null ? ` · termintreu ${g.termintreue} %` : ""} · {g.laufend} laufend</span>
      </span>
    </label>
  );
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const r = await a.ausfuehren(() => senden("/api/admin/gutachter", { body: { ...d, gutachterIds: ids } }), { meldung: (x) => `Anfrage an ${x.ids.length} Büro(s) gesendet.`, aktualisieren: false });
      if (r?.ids?.[0]) router.push(`/portal/admin/gutachter/${r.ids[0]}`);
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id={`${basis}-p`} label="Entwicklungsprojekt" pflicht>
          <select id={`${basis}-p`} value={d.projektId} onChange={set("projektId")} className={auswahlfeld} required>{projekte.map((x) => <option key={x.id} value={x.id}>{x.titel}</option>)}</select>
        </Feld>
        <Feld id={`${basis}-m`} label="Meilenstein (Zuweisung nach Bestätigung)">
          <select id={`${basis}-m`} value={d.meilensteinId} onChange={set("meilensteinId")} className={auswahlfeld}>
            <option value="">– ohne Meilenstein –</option>
            {(p?.meilensteine || []).map((m) => <option key={m.id} value={m.id}>{m.titel}{m.gutachten ? " (Gutachten)" : ""}</option>)}
          </select>
        </Feld>
        <Feld id={`${basis}-t`} label="Leistung (Titel)" pflicht><input id={`${basis}-t`} required value={d.titel} onChange={set("titel")} className={eingabe} maxLength={160} placeholder="z. B. Blendgutachten nach LAI-Hinweisen" /></Feld>
        <Feld id={`${basis}-f`} label="Fachgebiet" pflicht>
          <select id={`${basis}-f`} value={d.fachgebiet} onChange={set("fachgebiet")} className={auswahlfeld} required>
            <option value="">– bitte wählen –</option>
            {Object.entries(fachgebiete).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
        <Feld id={`${basis}-af`} label="Angebotsfrist" pflicht><input id={`${basis}-af`} type="date" required value={d.angebotsfrist} onChange={set("angebotsfrist")} className={eingabe} /></Feld>
        <Feld id={`${basis}-wt`} label="Gewünschter Abgabetermin"><input id={`${basis}-wt`} type="date" value={d.wunschtermin} onChange={set("wunschtermin")} className={eingabe} /></Feld>
      </div>
      <Feld id={`${basis}-l`} label="Leistungsbeschreibung (Umfang, Methodik, Ergebnisform, Abstimmungen)" pflicht>
        <textarea id={`${basis}-l`} required value={d.leistung} onChange={set("leistung")} className={textbereich} maxLength={4000} />
      </Feld>
      <Feld id={`${basis}-h`} label="Hinweise (für alle angefragten Büros sichtbar)"><input id={`${basis}-h`} value={d.hinweise} onChange={set("hinweise")} className={eingabe} maxLength={1500} /></Feld>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13.5px] font-semibold text-ink-700">Gutachter anfragen (für einen Angebotsvergleich meist drei)</legend>
        {gutachter.length === 0 ? <p className="text-[13.5px] text-ink-500">Noch keine Gutachter-Konten. Laden Sie Büros im Entwicklungsprojekt unter „Freigaben & Gutachter“ ein.</p> : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">{passend.map(chip)}</div>
            {andere.length > 0 && <details><summary className="cursor-pointer text-[13px] font-semibold text-ink-600">Weitere Büros ohne dieses Fachgebiet ({andere.length})</summary><div className="mt-2 grid gap-2 sm:grid-cols-2">{andere.map(chip)}</div></details>}
          </>
        )}
      </fieldset>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Knopf laeuft={a.laeuft}>Anfrage senden</Knopf>
    </form>
  );
}

export function BeauftragenFormular({ id, liefertermin }) {
  return (
    <SchnellFormular spalten={1} knopf="Angebot annehmen und beauftragen" meldung="Beauftragt – der Gutachter bestätigt im Portal. Andere Angebote der Anfrage wurden informiert."
      start={{ liefertermin }}
      felder={[{ name: "liefertermin", label: "Liefertermin (aus dem Angebot, änderbar)", typ: "datum", pflicht: true }, { name: "bedingungen", label: "Besondere Bedingungen (optional, erscheinen in der Auftragsbestätigung)", typ: "mehrzeilig" }]}
      onSenden={(d) => aktion(id, true, { aktion: "beauftragen", ...d })} />
  );
}

export function GrundAktion({ id, aktionName, knopf, label, meldung, pflicht = false, gefahr = false }) {
  return (
    <SchnellFormular spalten={1} knopf={knopf} meldung={meldung} felder={[{ name: "grund", label, typ: pflicht ? "mehrzeilig" : "text" }]} onSenden={(d) => aktion(id, true, { aktion: aktionName, grund: d.grund })} zusatz={gefahr ? <span className="text-[12.5px] text-ink-500">Der Gutachter wird informiert.</span> : null} />
  );
}

export function LieferungPruefen({ id, lieferung }) {
  const [modus, setModus] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <AktionKnopf variante="primaer" frage={lieferung.art === "endfassung" ? "Endfassung freigeben? Danach folgt die Abnahme." : "Entwurf freigeben?"} meldung="Freigegeben." fn={() => aktion(id, true, { aktion: "freigeben", lieferungId: lieferung.id })}>Version {lieferung.version} freigeben</AktionKnopf>
        <button type="button" onClick={() => setModus(modus ? "" : "maengel")} className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Mängel melden</button>
      </div>
      {modus === "maengel" && (
        <SchnellFormular spalten={1} knopf="Mängel an den Gutachter senden" meldung="Mängel gemeldet – der Gutachter bessert nach."
          felder={[{ name: "maengel", label: "Mängel (ein Punkt je Zeile)", typ: "mehrzeilig" }, { name: "kommentar", label: "Kommentar", typ: "text" }]}
          onSenden={(d) => aktion(id, true, { aktion: "maengel", lieferungId: lieferung.id, maengel: String(d.maengel || "").split("\n"), kommentar: d.kommentar })} />
      )}
    </div>
  );
}

export function AbnahmeFormular({ id }) {
  return (
    <SchnellFormular spalten={1} knopf="Leistung abnehmen" meldung="Abgenommen – der Gutachter kann die Schlussrechnung stellen."
      felder={[{ name: "vorbehalt", label: "Vorbehalte (optional, z. B. Nachreichung nach Behördenabstimmung)", typ: "mehrzeilig" }]}
      onSenden={(d) => aktion(id, true, { aktion: "abnehmen", vorbehalt: d.vorbehalt })} />
  );
}

export function LieferterminFormular({ id, liefertermin }) {
  return (
    <SchnellFormular spalten={2} knopf="Liefertermin ändern" meldung="Liefertermin geändert – der Gutachter wurde informiert." start={{ liefertermin }}
      felder={[{ name: "liefertermin", label: "Neuer Liefertermin", typ: "datum", pflicht: true }, { name: "grund", label: "Grund", typ: "text", pflicht: true }]}
      onSenden={(d) => aktion(id, true, { aktion: "liefertermin", ...d })} />
  );
}

export function RechnungPruefen({ id, rechnung }) {
  const [zurueck, setZurueck] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <AktionKnopf klein variante="primaer" meldung="Sachlich und rechnerisch geprüft – zur Zahlung an die Buchhaltung." fn={() => aktion(id, true, { aktion: "rechnung_pruefen", rechnungId: rechnung.id, ergebnis: "geprueft" })}>Sachlich richtig</AktionKnopf>
        <button type="button" onClick={() => setZurueck(!zurueck)} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Zurückweisen</button>
      </div>
      {zurueck && <SchnellFormular spalten={1} knopf="Rechnung zurückweisen" meldung="Zurückgewiesen – der Gutachter wurde informiert." felder={[{ name: "kommentar", label: "Grund (z. B. Pflichtangabe fehlt)", typ: "text", pflicht: true }]} onSenden={(d) => aktion(id, true, { aktion: "rechnung_pruefen", rechnungId: rechnung.id, ergebnis: "zurueckgewiesen", kommentar: d.kommentar })} />}
    </div>
  );
}

export function ZahlungFormular({ id, rechnung }) {
  return (
    <SchnellFormular spalten={2} knopf="Zahlung buchen" meldung="Zahlung gebucht – Ist-Kosten am Projekt erfasst." start={{ datum: new Date().toISOString().slice(0, 10), betrag: String(rechnung.brutto) }}
      felder={[{ name: "datum", label: "Zahlungsdatum", typ: "datum", pflicht: true }, { name: "betrag", label: "Betrag brutto (€)", typ: "zahl", pflicht: true }]}
      onSenden={(d) => senden(`/api/admin/gutachter/${id}/zahlung`, { body: { rechnungId: rechnung.id, ...d } })} />
  );
}

export function BewertungFormular({ id, start = null }) {
  const noten = [5, 4, 3, 2, 1].map((n) => ({ wert: String(n), label: `${n} – ${["", "mangelhaft", "ausreichend", "befriedigend", "gut", "sehr gut"][n]}` }));
  return (
    <SchnellFormular spalten={2} knopf={start ? "Bewertung aktualisieren" : "Intern bewerten"} meldung="Bewertung gespeichert (nur intern sichtbar)."
      start={start ? Object.fromEntries(Object.keys(BEWERTUNG_KRITERIEN).map((k) => [k, String(start[k])]).concat([["kommentar", start.kommentar || ""]])) : {}}
      felder={[...Object.entries(BEWERTUNG_KRITERIEN).map(([k, l]) => ({ name: k, label: l, typ: "auswahl", optionen: noten })), { name: "kommentar", label: "Kommentar (intern)", typ: "mehrzeilig", breit: true }]}
      onSenden={(d) => aktion(id, true, { aktion: "bewerten", bewertung: Object.fromEntries(Object.entries(d).map(([k, w]) => [k, k === "kommentar" ? w : Number(w)])) })} />
  );
}

export function NotizFormular({ id, notiz }) {
  return <SchnellFormular spalten={1} knopf="Notiz speichern" meldung="Gespeichert." start={{ notiz }} felder={[{ name: "notiz", label: "Interne Notiz (für den Gutachter nicht sichtbar)", typ: "mehrzeilig" }]} onSenden={(d) => aktion(id, true, { aktion: "notiz", notiz: d.notiz })} />;
}

"use client";

// Formulare und Aktionen der Bankfinanzierung (Backoffice) und des Bank-Portals. Alle Mutationen als JSON über die
// rechtegeprüften APIs; nach Erfolg lädt die Seite neu (router.refresh).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Send, Upload } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { eingabe, auswahlfeld, textbereich, FehlerBox, ErfolgBox, Chip } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { COCKPIT_FELDER } from "@/lib/plattform/finanzierung/kern";
import { SICHERHEITEN, CP_STANDARD, REFERENZZINSEN, BANKENPAKET } from "@/lib/plattform/finanzierung/bank";
import { TILGUNG_PROFILE } from "@/lib/plattform/finanzierung/kern";
import { GESCHAEFTSMODELLE } from "@/lib/plattform/finanzierung/geschaeftsmodell";
import { teur, pct, fx, capexQuelleText } from "./teile";

const knopf = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ov-600 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-ov-700 disabled:opacity-60";
const knopfHell = "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:ring-ink-300 disabled:opacity-60";

function useAktion() {
  const router = useRouter();
  const [s, setS] = useState({ laeuft: false, fehler: "", ok: "" });
  const los = async (url, body, { method = "POST", ok = "Gespeichert.", danach } = {}) => {
    setS({ laeuft: true, fehler: "", ok: "" });
    try {
      const r = await senden(url, { method, body });
      setS({ laeuft: false, fehler: "", ok });
      if (danach) danach(r);
      router.refresh();
      return r;
    } catch (e) {
      setS({ laeuft: false, fehler: e.message, ok: "" });
      return null;
    }
  };
  return [s, los];
}

const Meldung = ({ s }) => (
  <>
    <FehlerBox>{s.fehler}</FehlerBox>
    <ErfolgBox>{s.ok}</ErfolgBox>
  </>
);

function F({ label, children, className }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block text-[12.5px] font-semibold text-ink-700">{label}</span>
      {children}
    </label>
  );
}
const zahlFeld = cn(eingabe, "h-11 text-[14px]");

// ---------------------------------------------------------------- Fall anlegen

export function FallAnlegen({ auswahl }) {
  const router = useRouter();
  const [s, los] = useAktion();
  const [d, setD] = useState({ bezugArt: "entwicklung", bezugId: "", titel: "", spv: "", betragWunsch: "" });
  const liste = d.bezugArt === "entwicklung" ? auswahl.entwicklung : d.bezugArt === "anlage" ? auswahl.anlagen : [];
  const kk = d.bezugArt === "entwicklung" ? liste.find((x) => x.id === d.bezugId)?.kostenkalkulation : null;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await los("/api/admin/finanzierung", { ...d, betragWunsch: d.betragWunsch ? Number(d.betragWunsch) : undefined }, { ok: "Fall angelegt.", danach: (r) => router.push(`/portal/admin/finanzierung/${r.fall.id}`) });
      }}
    >
      <F label="Bezug">
        <select value={d.bezugArt} onChange={(e) => setD({ ...d, bezugArt: e.target.value, bezugId: "" })} className={cn(auswahlfeld, "h-11 text-[14px]")}>
          <option value="entwicklung">Entwicklungsprojekt (Eigenbetrieb)</option>
          <option value="anlage">Anlage im Betrieb (Refinanzierung/Contracting)</option>
          <option value="frei">Ohne Bezug</option>
        </select>
      </F>
      {d.bezugArt !== "frei" && (
        <F label={d.bezugArt === "entwicklung" ? "Entwicklungsprojekt" : "Anlage"}>
          <select required value={d.bezugId} onChange={(e) => setD({ ...d, bezugId: e.target.value })} className={cn(auswahlfeld, "h-11 text-[14px]")}>
            <option value="">Bitte wählen</option>
            {liste.map((x) => <option key={x.id} value={x.id}>{x.titel}</option>)}
          </select>
        </F>
      )}
      {d.bezugArt === "entwicklung" && d.bezugId && (
        <p className="text-[13px] leading-relaxed text-ink-600 sm:col-span-2" role="status">
          {kk
            ? <>Gesamtinvestition (Capex) <strong className="text-ink-900">{teur(kk.finanzierungsbedarf)}</strong> – Finanzierungsbedarf {capexQuelleText({ art: "kostenkalkulation", ...kk })}.</>
            : "Für dieses Projekt ist keine Projektkostenkalkulation übergeben – Vorbelegung mit Standard-Capex je kWp (Marktwerte) + Entwicklungsbudget."}
        </p>
      )}
      <F label="Titel (leer = aus dem Bezug)"><input value={d.titel} maxLength={120} onChange={(e) => setD({ ...d, titel: e.target.value })} className={zahlFeld} /></F>
      <F label="Projektgesellschaft (SPV)"><input value={d.spv} maxLength={160} onChange={(e) => setD({ ...d, spv: e.target.value })} className={zahlFeld} placeholder="z. B. Solarpark X GmbH & Co. KG" /></F>
      <F label="Finanzierungsbedarf in € (leer = Capex × FK-Quote)"><input type="number" min="0" value={d.betragWunsch} onChange={(e) => setD({ ...d, betragWunsch: e.target.value })} className={zahlFeld} /></F>
      <div className="flex items-end"><button disabled={s.laeuft} className={knopf}>{s.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}Fall anlegen</button></div>
      <div className="sm:col-span-2"><Meldung s={s} /></div>
    </form>
  );
}

// ---------------------------------------------------------------- Bankenstamm

export function BankFormular({ bank = null }) {
  const [s, los] = useAktion();
  const [d, setD] = useState(bank || { name: "", land: "DE", art: "geschaeftsbank", ansprechpartner: "", email: "", telefon: "", schwerpunkt: "" });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const r = await los("/api/admin/finanzierung/banken", d, { ok: bank ? "Bank gespeichert." : "Bank angelegt." }); if (r && !bank) setD({ name: "", land: "DE", art: "geschaeftsbank", ansprechpartner: "", email: "", telefon: "", schwerpunkt: "" }); }}>
      <F label="Name der Bank"><input required value={d.name} onChange={set("name")} className={zahlFeld} /></F>
      <F label="Land / Art">
        <div className="grid grid-cols-2 gap-2">
          <select value={d.land} onChange={set("land")} className={cn(auswahlfeld, "h-11 text-[14px]")}><option>DE</option><option>AT</option><option>CH</option></select>
          <select value={d.art} onChange={set("art")} className={cn(auswahlfeld, "h-11 text-[14px]")}>
            {[["geschaeftsbank", "Geschäftsbank"], ["foerderbank", "Förderbank"], ["sparkasse", "Sparkasse"], ["genossenschaft", "Genossenschaftsbank"], ["leasing", "Leasinggesellschaft"], ["sonstige", "Sonstige"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </F>
      <F label="Ansprechperson"><input value={d.ansprechpartner} onChange={set("ansprechpartner")} className={zahlFeld} /></F>
      <F label="E-Mail (erhält die Anfrage mit Einladungslink)"><input required type="email" value={d.email} onChange={set("email")} className={zahlFeld} /></F>
      <F label="Telefon"><input value={d.telefon} onChange={set("telefon")} className={zahlFeld} /></F>
      <F label="Schwerpunkt"><input value={d.schwerpunkt} onChange={set("schwerpunkt")} className={zahlFeld} /></F>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button disabled={s.laeuft} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />{bank ? "Speichern" : "Bank anlegen"}</button></div>
      <div className="sm:col-span-2"><Meldung s={s} /></div>
    </form>
  );
}

// ---------------------------------------------------------------- Anfragen an Banken

export function AnfrageSenden({ fallId, banken, angefragt = [] }) {
  const [s, los] = useAktion();
  const [ids, setIds] = useState([]);
  const [frist, setFrist] = useState(new Date(Date.now() + 21 * 86400e3).toISOString().slice(0, 10));
  const [nachricht, setNachricht] = useState("");
  const [links, setLinks] = useState([]);
  const frei = banken.filter((b) => !angefragt.includes(b.id));
  if (!frei.length) return <p className="text-[13.5px] text-ink-500">Alle Banken des Stamms sind angefragt. Weitere Banken unter „Banken“ anlegen.</p>;
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "anfragen", bankIds: ids, frist, nachricht }, { ok: "Anfrage(n) gesendet – E-Mails liegen im Postausgang.", danach: (r) => setLinks(r.demoLinks || []) }); setIds([]); }}>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-700">Banken wählen</legend>
        <div className="flex flex-wrap gap-2">{frei.map((b) => <Chip key={b.id} name="bank" value={b.id} checked={ids.includes(b.id)} onChange={(e) => setIds((x) => (e.target.checked ? [...x, b.id] : x.filter((y) => y !== b.id)))}>{b.name}</Chip>)}</div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
        <F label="Frist Term Sheet"><input type="date" required value={frist} onChange={(e) => setFrist(e.target.value)} className={zahlFeld} /></F>
        <F label="Nachricht (optional)"><input value={nachricht} maxLength={2000} onChange={(e) => setNachricht(e.target.value)} className={zahlFeld} placeholder="z. B. Wunsch nach KfW-Durchleitung" /></F>
      </div>
      <button disabled={s.laeuft || !ids.length} className={knopf}><Send aria-hidden="true" className="h-4 w-4" />Anfrage senden</button>
      <Meldung s={s} />
      {links.length > 0 && <p className="break-all rounded-xl bg-ink-50 p-3 text-[12px] text-ink-600">Nur Demo – Einladungslinks: {links.map((l) => l.link).join(" · ")}</p>}
    </form>
  );
}

export function AnfrageKnoepfe({ fallId, anfrageId }) {
  const [s, los] = useAktion();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={s.laeuft} onClick={() => los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "einladung_neu", anfrageId }, { ok: "Neuer Link gesendet." })} className={knopfHell}>Link erneuern</button>
      <button type="button" disabled={s.laeuft} onClick={() => los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "anfrage_zurueck", anfrageId }, { ok: "Zurückgezogen." })} className={knopfHell}>Zurückziehen</button>
      <Meldung s={s} />
    </div>
  );
}

// ---------------------------------------------------------------- Bankenpaket

export function PaketFreigabe({ fallId, paket }) {
  const [s, los] = useAktion();
  const [frei, setFrei] = useState(paket.filter((b) => b.freigegeben).map((b) => b.id));
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70">
        {paket.map((b) => (
          <li key={b.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <input type="checkbox" id={`pk-${b.id}`} checked={frei.includes(b.id)} onChange={(e) => setFrei((x) => (e.target.checked ? [...x, b.id] : x.filter((y) => y !== b.id)))} className="mt-1 h-4 w-4 accent-[var(--color-ov-600)]" />
            <label htmlFor={`pk-${b.id}`} className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink-900">{b.label}{b.pflicht ? "" : " (optional)"}</span>
              <span className="block text-[12.5px] text-ink-500">{b.text}</span>
              <span className={cn("mt-1 inline-block text-[12px] font-semibold", b.vorhanden ? "text-ov-700" : "text-ink-500")}>
                {b.quelle === "auto" ? "Wird von der Plattform erzeugt" : b.quelle === "kyb" ? `KYB: ${b.kyb?.statusLabel || (b.vorhanden ? "Unterlage vorhanden" : "keine SPV-Organisation verknüpft")}` : b.vorhanden ? `${b.dokumente.length} Dokument(e)` : "Noch kein Dokument"}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" disabled={s.laeuft} onClick={() => los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "paket", freigabe: frei }, { ok: "Freigabe gespeichert – Banken sehen nur diese Bausteine." })} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />Freigabe speichern</button>
      <Meldung s={s} />
    </div>
  );
}

export function DokumentHochladen({ fallId }) {
  const router = useRouter();
  const [baustein, setBaustein] = useState("ertragsgutachten");
  const [s, setS] = useState({ laeuft: false, fehler: "", ok: "" });
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget; // nach await ist e.currentTarget null
        if (s.laeuft) return;
        const datei = form.datei.files?.[0];
        if (!datei) return setS({ laeuft: false, fehler: "Bitte eine Datei wählen.", ok: "" });
        setS({ laeuft: true, fehler: "", ok: "" });
        const fd = new FormData();
        fd.append("datei", datei);
        fd.append("baustein", baustein);
        let res;
        try {
          res = await fetch(`/api/admin/finanzierung/${fallId}/dokumente`, { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
        } catch {
          return setS({ laeuft: false, fehler: "Keine Verbindung – bitte erneut versuchen.", ok: "" });
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok || j.ok === false) return setS({ laeuft: false, fehler: j.error || `Upload fehlgeschlagen (${res.status})`, ok: "" });
        setS({ laeuft: false, fehler: "", ok: "Hochgeladen." });
        form.reset();
        router.refresh();
      }}
    >
      <F label="Baustein" className="sm:w-72">
        <select value={baustein} onChange={(e) => setBaustein(e.target.value)} className={cn(auswahlfeld, "h-11 text-[14px]")}>
          {BANKENPAKET.filter((b) => b.quelle !== "auto").map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
      </F>
      <F label="Datei (PDF, JPG, PNG, max. 10 MB)" className="flex-1"><input name="datei" type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-[13px] file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-ink-100 file:px-4 file:font-semibold" /></F>
      <button disabled={s.laeuft} className={knopf}>{s.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Upload aria-hidden="true" className="h-4 w-4" />}Hochladen</button>
      <div className="sm:w-full"><Meldung s={s} /></div>
    </form>
  );
}

// ---------------------------------------------------------------- Term Sheet (Backoffice und Bank)

const TS_LEER = { betrag: "", laufzeitJahre: 18, zinsArt: "fix", zinsPct: "", referenzAnnahmePct: 2.7, margePct: "", tilgungsprofil: "annuitaet", tilgungsfreiJahre: 0, dscrSizing: 1.15, dscrCovenant: 1.05, dscrLockup: 1.1, llcrCovenant: "", dsraMonate: 6, bearbeitungPct: 1, bereitstellungPct: 0.25, sicherheiten: ["uebereignung", "abtretung", "konten"], cps: CP_STANDARD.map((c) => c.id), gueltigBis: "", bemerkung: "" };

export function TermsheetFormular({ url, anfrageId = null, vorschlagBetrag = "", knopfText = "Term Sheet speichern" }) {
  const [s, los] = useAktion();
  const [t, setT] = useState({ ...TS_LEER, betrag: vorschlagBetrag });
  const set = (k, num = true) => (e) => setT({ ...t, [k]: num && e.target.value !== "" ? Number(e.target.value) : e.target.value });
  const toggle = (k, id) => setT({ ...t, [k]: t[k].includes(id) ? t[k].filter((x) => x !== id) : [...t[k], id] });
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await los(url, anfrageId ? { aktion: "termsheet", anfrageId, termsheet: t } : { aktion: "termsheet", termsheet: t }, { ok: "Term Sheet gespeichert." }); }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <F label="Kreditbetrag €"><input required type="number" min="1" value={t.betrag} onChange={set("betrag")} className={zahlFeld} /></F>
        <F label="Laufzeit (Jahre)"><input required type="number" min="1" max="35" value={t.laufzeitJahre} onChange={set("laufzeitJahre")} className={zahlFeld} /></F>
        <F label="Zinsart"><select value={t.zinsArt} onChange={set("zinsArt", false)} className={cn(auswahlfeld, "h-11 text-[14px]")}>{Object.entries(REFERENZZINSEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></F>
        {t.zinsArt === "fix" ? (
          <F label="Festzins % p. a."><input required type="number" step="0.01" value={t.zinsPct} onChange={set("zinsPct")} className={zahlFeld} /></F>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <F label="Marge %"><input required type="number" step="0.01" value={t.margePct} onChange={set("margePct")} className={zahlFeld} /></F>
            <F label="Ref.-Annahme %"><input type="number" step="0.01" value={t.referenzAnnahmePct} onChange={set("referenzAnnahmePct")} className={zahlFeld} /></F>
          </div>
        )}
        <F label="Tilgungsprofil"><select value={t.tilgungsprofil} onChange={set("tilgungsprofil", false)} className={cn(auswahlfeld, "h-11 text-[14px]")}>{Object.entries(TILGUNG_PROFILE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></F>
        <F label="Tilgungsfreie Jahre"><input type="number" min="0" max="5" value={t.tilgungsfreiJahre} onChange={set("tilgungsfreiJahre")} className={zahlFeld} /></F>
        <F label="DSCR Sizing"><input type="number" step="0.01" value={t.dscrSizing} onChange={set("dscrSizing")} className={zahlFeld} /></F>
        <F label="DSCR Covenant (Default)"><input type="number" step="0.01" value={t.dscrCovenant} onChange={set("dscrCovenant")} className={zahlFeld} /></F>
        <F label="DSCR Lock-up"><input type="number" step="0.01" value={t.dscrLockup} onChange={set("dscrLockup")} className={zahlFeld} /></F>
        <F label="LLCR Covenant (optional)"><input type="number" step="0.01" value={t.llcrCovenant} onChange={set("llcrCovenant")} className={zahlFeld} /></F>
        <F label="DSRA (Monate)"><input type="number" min="0" max="24" value={t.dsraMonate} onChange={set("dsraMonate")} className={zahlFeld} /></F>
        <F label="Bearbeitungsgebühr %"><input type="number" step="0.05" value={t.bearbeitungPct} onChange={set("bearbeitungPct")} className={zahlFeld} /></F>
        <F label="Bereitstellungsprov. % p. a."><input type="number" step="0.05" value={t.bereitstellungPct} onChange={set("bereitstellungPct")} className={zahlFeld} /></F>
        <F label="Gültig bis"><input type="date" value={t.gueltigBis} onChange={set("gueltigBis", false)} className={zahlFeld} /></F>
      </div>
      <fieldset><legend className="mb-2 text-[12.5px] font-semibold text-ink-700">Sicherheiten</legend><div className="flex flex-wrap gap-2">{Object.entries(SICHERHEITEN).map(([k, l]) => <Chip key={k} name="sich" value={k} checked={t.sicherheiten.includes(k)} onChange={() => toggle("sicherheiten", k)}>{l}</Chip>)}</div></fieldset>
      <fieldset><legend className="mb-2 text-[12.5px] font-semibold text-ink-700">Auszahlungsvoraussetzungen (CPs)</legend><div className="flex flex-wrap gap-2">{CP_STANDARD.map((c) => <Chip key={c.id} name="cp" value={c.id} checked={t.cps.includes(c.id)} onChange={() => toggle("cps", c.id)}>{c.label}</Chip>)}</div></fieldset>
      <F label="Bemerkung"><textarea value={t.bemerkung} maxLength={1500} onChange={set("bemerkung", false)} className={textbereich} /></F>
      <button disabled={s.laeuft} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />{knopfText}</button>
      <Meldung s={s} />
    </form>
  );
}

export function Entscheidung({ fallId, zeilen }) {
  const [s, los] = useAktion();
  const [anfrageId, setA] = useState(zeilen[0]?.anfrageId || "");
  const [begruendung, setB] = useState("");
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "entscheidung", anfrageId, begruendung }, { ok: "Entscheidung gespeichert – die Banken wurden informiert." }); }}>
      <F label="Ausgewählte Bank"><select value={anfrageId} onChange={(e) => setA(e.target.value)} className={cn(auswahlfeld, "h-11 text-[14px]")}>{zeilen.map((z) => <option key={z.anfrageId} value={z.anfrageId}>{z.bank} – EK-IRR {pct(z.k.ekIrr)}, DSCR P90 {fx(z.k.dscrMinP90)}</option>)}</select></F>
      <F label="Begründung (Protokoll)"><textarea required minLength={10} value={begruendung} onChange={(e) => setB(e.target.value)} className={textbereich} /></F>
      <button disabled={s.laeuft} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />Bank auswählen</button>
      <Meldung s={s} />
    </form>
  );
}

export function KreditvertragFormular({ fallId, vorschlag = {} }) {
  const [s, los] = useAktion();
  const [k, setK] = useState({ nummer: "", unterzeichnetAm: "", auszahlungAm: "", betrag: vorschlag.betrag || "", zinsPct: vorschlag.zinsPct || "", laufzeitJahre: vorschlag.laufzeitJahre || 18, tilgungsprofil: vorschlag.tilgungsprofil || "annuitaet", dscrCovenant: vorschlag.dscrCovenant || 1.05, dscrLockup: vorschlag.dscrLockup || 1.1, dsraMonate: vorschlag.dsraMonate ?? 6 });
  const set = (f, num) => (e) => setK({ ...k, [f]: num && e.target.value !== "" ? Number(e.target.value) : e.target.value });
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "kreditvertrag", kreditvertrag: k }, { ok: "Kreditvertrag erfasst." }); }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <F label="Vertragsnummer"><input required value={k.nummer} onChange={set("nummer")} className={zahlFeld} /></F>
        <F label="Unterzeichnet am"><input required type="date" value={k.unterzeichnetAm} onChange={set("unterzeichnetAm")} className={zahlFeld} /></F>
        <F label="Auszahlung am (optional)"><input type="date" value={k.auszahlungAm} onChange={set("auszahlungAm")} className={zahlFeld} /></F>
        <F label="Betrag €"><input type="number" value={k.betrag} onChange={set("betrag", true)} className={zahlFeld} /></F>
        <F label="Zins % p. a. (all-in)"><input type="number" step="0.01" value={k.zinsPct} onChange={set("zinsPct", true)} className={zahlFeld} /></F>
        <F label="Laufzeit (Jahre)"><input type="number" value={k.laufzeitJahre} onChange={set("laufzeitJahre", true)} className={zahlFeld} /></F>
        <F label="DSCR Covenant / Lock-up"><div className="grid grid-cols-2 gap-2"><input type="number" step="0.01" value={k.dscrCovenant} onChange={set("dscrCovenant", true)} className={zahlFeld} aria-label="DSCR Covenant" /><input type="number" step="0.01" value={k.dscrLockup} onChange={set("dscrLockup", true)} className={zahlFeld} aria-label="DSCR Lock-up" /></div></F>
        <F label="DSRA (Monate)"><input type="number" value={k.dsraMonate} onChange={set("dsraMonate", true)} className={zahlFeld} /></F>
      </div>
      <button disabled={s.laeuft} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />Kreditvertrag speichern</button>
      <Meldung s={s} />
    </form>
  );
}

export function CpSchalter({ fallId, cp, darf }) {
  const [s, los] = useAktion();
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" disabled={!darf || s.laeuft} checked={cp.erledigt} onChange={(e) => los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "cp", cpId: cp.id, erledigt: e.target.checked, nachweis: cp.nachweis || "" }, { ok: "" })} className="mt-0.5 h-4 w-4 accent-[var(--color-ov-600)]" />
      <span className="min-w-0 text-[14px] text-ink-800">{cp.label}{cp.erledigt && <span className="block text-[12px] text-ink-500">erledigt {cp.am ? new Date(cp.am).toLocaleDateString("de-DE") : ""}{cp.von ? ` · ${cp.von}` : ""}</span>}{s.fehler && <span className="block text-[12px] text-red-700">{s.fehler}</span>}</span>
    </label>
  );
}

export function KnopfAktion({ url, body = {}, text, ok = "Erledigt.", hell = false }) {
  const [s, los] = useAktion();
  return (
    <div className="space-y-2">
      <button type="button" disabled={s.laeuft} onClick={() => los(url, body, { ok })} className={hell ? knopfHell : knopf}>{s.laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{text}</button>
      <Meldung s={s} />
    </div>
  );
}

// ---------------------------------------------------------------- Financial Model bearbeiten

export function ModellBearbeiten({ fallId, eingaben }) {
  const [s, los] = useAktion();
  const [e, setE] = useState(eingaben);
  const felder = COCKPIT_FELDER.filter((f) => ["projekt", "finanzierung"].includes(f.gruppe) && !f.typ);
  return (
    <form className="space-y-3" onSubmit={async (ev) => { ev.preventDefault(); await los(`/api/admin/finanzierung/${fallId}`, { eingaben: e }, { method: "PATCH", ok: "Financial Model aktualisiert." }); }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {felder.map((f) => (
          <F key={f.id} label={`${f.label} (${f.einheit})`}>
            <input type="number" step={f.prozent ? f.schritt * 100 : f.schritt} value={f.prozent ? Math.round((e[f.id] ?? 0) * 10000) / 100 : e[f.id] ?? ""} onChange={(ev) => setE({ ...e, [f.id]: f.prozent ? Number(ev.target.value) / 100 : Number(ev.target.value) })} className={zahlFeld} />
          </F>
        ))}
      </div>
      <button disabled={s.laeuft} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />Übernehmen</button>
      <Meldung s={s} />
    </form>
  );
}

// ---------------------------------------------------------------- Geschäftsmodell

export function GeschaeftsmodellRechner({ fallId = "", eingaben = null, darfEntscheiden = false, start = null }) {
  const [s, los] = useAktion();
  const [a, setA] = useState({ verkaufspreisKwp: "", epcMargePct: 0, finanzierung: "skulptiert", lieferpreisCt: "", lieferAnteil: "", nutzungsentgeltJahr: "" });
  const [v, setV] = useState(start);
  const [gewaehlt, setG] = useState(start?.beste || "verkauf");
  const [begruendung, setB] = useState("");
  const rechnen = async () => {
    setV(null);
    const r = await los("/api/admin/finanzierung/geschaeftsmodell", { fallId, eingaben: eingaben || {}, annahmen: a }, { ok: "" });
    if (r) {
      setV(r.vergleich);
      setG(r.vergleich.beste);
    }
  };
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <F label="Verkaufspreis Rechte €/kWp"><input type="number" value={a.verkaufspreisKwp} placeholder={v?.annahmen?.verkaufspreisKwp} onChange={set("verkaufspreisKwp")} className={zahlFeld} /></F>
        <F label="EPC-Marge Konzern %"><input type="number" value={a.epcMargePct} onChange={set("epcMargePct")} className={zahlFeld} /></F>
        <F label="Finanzierung"><select value={a.finanzierung} onChange={set("finanzierung")} className={cn(auswahlfeld, "h-11 text-[14px]")}><option value="skulptiert">Projektfinanzierung</option><option value="annuitaet">Annuität</option><option value="foerder">Förderkredit</option><option value="ek">100 % EK</option></select></F>
        <F label="Lieferpreis Contracting ct"><input type="number" step="0.1" value={a.lieferpreisCt} placeholder={v?.annahmen?.lieferpreisCt} onChange={set("lieferpreisCt")} className={zahlFeld} /></F>
        <F label="Anteil Direktlieferung (0–1)"><input type="number" step="0.05" value={a.lieferAnteil} placeholder={v?.annahmen?.lieferAnteil} onChange={set("lieferAnteil")} className={zahlFeld} /></F>
        <F label="Nutzungsentgelt Verpachtung €/a"><input type="number" value={a.nutzungsentgeltJahr} placeholder={v?.annahmen?.nutzungsentgeltJahr} onChange={set("nutzungsentgeltJahr")} className={zahlFeld} /></F>
      </div>
      <button type="button" onClick={rechnen} disabled={s.laeuft} className={knopfHell}>{s.laeuft && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Vergleich rechnen</button>
      <FehlerBox>{s.fehler}</FehlerBox>
      {v && (
        <>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-ink-200/70">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-4 py-2.5">Geschäftsmodell</th><th className="px-3 py-2.5 text-right">Liquidität heute</th><th className="px-3 py-2.5 text-right">Barwert</th><th className="px-3 py-2.5 text-right">EK-Bindung</th><th className="px-3 py-2.5 text-right">EK-IRR</th><th className="px-4 py-2.5">Abwägung</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {v.zeilen.map((z) => (
                  <tr key={z.id} className={cn(z.id === v.beste && "bg-ov-50/60")}>
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold text-ink-900">{z.label}{z.id === v.beste && <span className="ml-2 text-[11.5px] font-semibold text-ov-700">höchster Barwert</span>}</th>
                    <td className="ov-num px-3 py-2.5 text-right">{teur(z.heute)}</td>
                    <td className="ov-num px-3 py-2.5 text-right font-semibold">{teur(z.barwert)}</td>
                    <td className="ov-num px-3 py-2.5 text-right">{teur(z.kapitalbindung)}</td>
                    <td className="ov-num px-3 py-2.5 text-right">{pct(z.irr)}</td>
                    <td className="px-4 py-2.5 text-[12px] text-ink-600">+ {z.vorteile[0]} · − {z.risiken[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[13.5px] leading-relaxed text-ink-700">{v.empfehlung}</p>
          {fallId && darfEntscheiden && (
            <form className="grid gap-3 sm:grid-cols-[260px_minmax(0,1fr)_auto] sm:items-end" onSubmit={async (e) => { e.preventDefault(); await los(`/api/admin/finanzierung/${fallId}/aktion`, { aktion: "geschaeftsmodell", gewaehlt, annahmen: a, begruendung }, { ok: "Entscheidung gespeichert." }); }}>
              <F label="Entscheidung Geschäftsführung"><select value={gewaehlt} onChange={(e) => setG(e.target.value)} className={cn(auswahlfeld, "h-11 text-[14px]")}>{Object.entries(GESCHAEFTSMODELLE).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</select></F>
              <F label="Begründung"><input value={begruendung} onChange={(e) => setB(e.target.value)} className={zahlFeld} /></F>
              <button disabled={s.laeuft} className={knopf}><Check aria-hidden="true" className="h-4 w-4" />Festlegen</button>
            </form>
          )}
          <ErfolgBox>{s.ok}</ErfolgBox>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Bank-Portal

export function BankRueckmeldung({ anfrageId }) {
  const [s, los] = useAktion();
  const [text, setText] = useState("");
  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      <F label="Rückfrage oder Absagegrund"><textarea value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} className={textbereich} /></F>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={s.laeuft} onClick={() => los(`/api/portal/bank/${anfrageId}`, { aktion: "rueckfrage", text }, { ok: "Rückfrage gesendet." })} className={knopfHell}>Rückfrage senden</button>
        <button type="button" disabled={s.laeuft} onClick={() => los(`/api/portal/bank/${anfrageId}`, { aktion: "absage", text }, { ok: "Absage übermittelt." })} className={knopfHell}>Absagen</button>
      </div>
      <Meldung s={s} />
    </form>
  );
}

export function BankEinladungAnnehmen({ token }) {
  const router = useRouter();
  const [s, los] = useAktion();
  return (
    <div className="space-y-3">
      <button type="button" disabled={s.laeuft} onClick={() => los("/api/portal/bank/einladung", { token }, { ok: "Angenommen.", danach: (r) => router.replace(`/portal/bank/${r.anfrageId}`) })} className={cn(knopf, "w-full")}>{s.laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}Zugang annehmen</button>
      <FehlerBox>{s.fehler}</FehlerBox>
    </div>
  );
}

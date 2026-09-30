"use client";

// CRM-Bausteine (Client): Kontaktliste mit Auswahl und Massenaktionen, Formulare für Kontakt und
// Organisation, Aktivität erfassen (mit Wiedervorlage), Beziehung setzen, Vorlage senden, Dubletten.
// Tastatur: „/“ fokussiert die Suche, „n“ öffnet „Neuer Kontakt“, Strg+Enter speichert Formulare.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, GitMerge, Link2, Mail, MessageSquarePlus, Phone, Plus, Save, Send, StickyNote, Tag, Users, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { relativ } from "@/lib/plattform/format";
import { LAENDER } from "@/lib/plattform/konstanten";
import { AKTIVITAET_TYPEN, BEZUG_ROLLEN, KONTAKT_ROLLEN, ORG_ARTEN } from "@/lib/plattform/crm";
import { auswahlfeld, Chip, eingabe, ErfolgBox, Feld, FehlerBox, textbereich } from "@/components/Portal/felder";

const TYP_ICON = { anruf: Phone, termin: CalendarPlus, email: Mail, notiz: StickyNote };
const tagPlus = (t) => new Date(Date.now() + t * 86400e3).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
const name = (k) => [k?.vorname, k?.nachname].filter(Boolean).join(" ") || k?.firma || k?.email || "–";

function useStrgEnter(ref, fn) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        fn();
      }
    };
    el.addEventListener("keydown", h);
    return () => el.removeEventListener("keydown", h);
  });
}

/** Globale Tastenkürzel der CRM-Liste */
export function CrmTasten({ neu }) {
  useEffect(() => {
    const h = (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key === "/") {
        const f = document.getElementById("crm-suche");
        if (f) {
          e.preventDefault();
          f.focus();
        }
      }
      if (e.key === "n" && neu) {
        e.preventDefault();
        neu();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [neu]);
  return null;
}

// ---------------------------------------------------------------- Kontaktliste

export function KontaktListe({ kontakte, konten = [], organisationen = [] }) {
  const router = useRouter();
  const [auswahl, setAuswahl] = useState([]);
  const [tag, setTag] = useState("");
  const [zust, setZust] = useState("");
  const [fehler, setFehler] = useState("");
  const [meldung, setMeldung] = useState("");
  const [neuOffen, setNeuOffen] = useState(false);
  const alle = auswahl.length === kontakte.length && kontakte.length > 0;
  const umschalten = (id) => setAuswahl((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  async function massen(daten) {
    setFehler("");
    setMeldung("");
    try {
      const r = await senden("/api/admin/crm/massenaktion", { body: { ids: auswahl, ...daten } });
      setMeldung(`${r.geaendert} Kontakt(e) aktualisiert.`);
      setAuswahl([]);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <CrmTasten neu={() => setNeuOffen(true)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-500">
          Tastatur: <kbd className="rounded bg-ink-100 px-1.5 font-mono text-[12px]">/</kbd> Suche · <kbd className="rounded bg-ink-100 px-1.5 font-mono text-[12px]">n</kbd> neuer Kontakt
        </p>
        <Button size="sm" icon={Plus} onClick={() => setNeuOffen((x) => !x)} aria-expanded={neuOffen}>
          Neuer Kontakt
        </Button>
      </div>
      {neuOffen && (
        <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70">
          <KontaktFormular organisationen={organisationen} konten={konten} fertig={(k) => router.push(`/portal/admin/crm/${k.id}`)} abbrechen={() => setNeuOffen(false)} />
        </div>
      )}

      {auswahl.length > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-navy-950 px-4 py-3 text-white shadow-lg" role="region" aria-label="Massenaktionen">
          <span className="text-[13.5px] font-semibold">{auswahl.length} ausgewählt</span>
          <label className="sr-only" htmlFor="crm-mass-tag">Tag</label>
          <input id="crm-mass-tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" className="h-9 w-32 rounded-full bg-white/10 px-3 text-[13.5px] text-white placeholder:text-white/50 outline-none ring-1 ring-white/20 focus:ring-ov-300" />
          <button type="button" disabled={tag.trim().length < 2} onClick={() => massen({ tag: tag.trim() })} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3 text-[13px] font-semibold hover:bg-ov-700 disabled:opacity-50">
            <Tag aria-hidden="true" className="h-4 w-4" /> Tag setzen
          </button>
          <label className="sr-only" htmlFor="crm-mass-zust">Zuständig</label>
          <select id="crm-mass-zust" value={zust} onChange={(e) => setZust(e.target.value)} className="h-9 rounded-full bg-white/10 px-3 text-[13px] text-white outline-none ring-1 ring-white/20">
            <option value="" className="text-ink-900">Zuständig …</option>
            {konten.map((k) => <option key={k.id} value={k.id} className="text-ink-900">{name(k)}</option>)}
          </select>
          <button type="button" disabled={!zust} onClick={() => massen({ zustaendigId: zust })} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50">
            <Users aria-hidden="true" className="h-4 w-4" /> Zuweisen
          </button>
          <button type="button" onClick={() => setAuswahl([])} className="ml-auto inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] text-white/80 hover:text-white">
            <X aria-hidden="true" className="h-4 w-4" /> Aufheben
          </button>
        </div>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{meldung}</ErfolgBox>

      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
        <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
          <input type="checkbox" checked={alle} onChange={() => setAuswahl(alle ? [] : kontakte.map((k) => k.id))} aria-label="Alle auswählen" className="h-4 w-4 accent-[#558227]" />
          <span>{kontakte.length} Kontakte</span>
        </div>
        <ul className="divide-y divide-ink-100">
          {kontakte.map((k) => (
            <li key={k.id} className={cn("flex gap-3 px-5 py-3.5 hover:bg-sand-50", auswahl.includes(k.id) && "bg-ov-50/60")}>
              <input type="checkbox" checked={auswahl.includes(k.id)} onChange={() => umschalten(k.id)} aria-label={`${name(k)} auswählen`} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/portal/admin/crm/${k.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{name(k)}</Link>
                  {k.nutzerId && <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">Portal-Konto</span>}
                  {k.dublette && <Link href="/portal/admin/crm/dubletten" className="rounded-full bg-sun-300/30 px-2 py-0.5 text-[11px] font-semibold text-ink-900 ring-1 ring-inset ring-sun-400/50">mögliche Dublette</Link>}
                  {k.wiedervorlage && <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200">Wiedervorlage {k.wiedervorlage.split("-").reverse().join(".")}</span>}
                </div>
                <p className="mt-0.5 truncate text-[13px] text-ink-600">
                  {[k.funktion, k.organisation || k.firma, [k.plz, k.ort].filter(Boolean).join(" "), k.email].filter(Boolean).join(" · ") || "–"}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {k.rollen.map((r) => <span key={r} className="rounded-full bg-ov-50 px-2 py-0.5 text-[11px] font-semibold text-ov-800">{KONTAKT_ROLLEN[r] || r}</span>)}
                  {k.tags.map((t) => <span key={t} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">#{t}</span>)}
                </p>
              </div>
              <div className="hidden shrink-0 text-right text-[12.5px] text-ink-500 sm:block">
                <p>{k.zustaendig ? name(k.zustaendig) : "–"}</p>
                <p>{k.letzteAktivitaet ? `${AKTIVITAET_TYPEN[k.letzteAktivitaet.typ] || ""} ${relativ(k.letzteAktivitaet.am)}` : "keine Aktivität"}</p>
                <p>{k.bezuege} Objekt(e)</p>
              </div>
            </li>
          ))}
        </ul>
        {!kontakte.length && <p className="px-5 py-10 text-center text-[14px] text-ink-500">Keine Kontakte mit diesen Filtern.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Formulare

export function KontaktFormular({ kontakt, organisationen = [], konten = [], fertig, abbrechen }) {
  const id = useId();
  const router = useRouter();
  const form = useRef(null);
  const [d, setD] = useState(() => ({
    anrede: kontakt?.anrede || "",
    vorname: kontakt?.vorname || "",
    nachname: kontakt?.nachname || "",
    firma: kontakt?.firma || "",
    funktion: kontakt?.funktion || "",
    email: kontakt?.email || "",
    telefon: kontakt?.telefon || "",
    plz: kontakt?.plz || "",
    ort: kontakt?.ort || "",
    land: kontakt?.land || "DE",
    organisationId: kontakt?.organisationId || "",
    rollen: kontakt?.rollen || [],
    tags: (kontakt?.tags || []).join(", "),
    notiz: kontakt?.notiz || "",
    zustaendigId: kontakt?.zustaendigId || kontakt?.zustaendig?.id || "",
  }));
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [doppelt, setDoppelt] = useState(false);
  const f = (k) => (e) => setD({ ...d, [k]: e.target.value });

  async function speichern(e, trotzdem = false) {
    e?.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const body = { ...d, tags: d.tags.split(",").map((x) => x.trim()).filter(Boolean), organisationId: d.organisationId || null, zustaendigId: d.zustaendigId || null, trotzdem };
      const r = kontakt ? await senden(`/api/admin/crm/kontakte/${kontakt.id}`, { method: "PATCH", body }) : await senden("/api/admin/crm/kontakte", { body });
      setDoppelt(false);
      if (fertig) fertig(r.kontakt);
      else router.refresh();
    } catch (x) {
      setFehler(x.message);
      setDoppelt(x.status === 409);
    } finally {
      setLaeuft(false);
    }
  }
  useStrgEnter(form, () => speichern());

  return (
    <form ref={form} onSubmit={speichern} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
        <Feld id={`${id}-an`} label="Anrede">
          <select id={`${id}-an`} className={auswahlfeld} value={d.anrede} onChange={f("anrede")}>
            <option value="">–</option>
            <option>Frau</option>
            <option>Herr</option>
            <option>Divers</option>
          </select>
        </Feld>
        <Feld id={`${id}-vn`} label="Vorname"><input id={`${id}-vn`} className={eingabe} value={d.vorname} onChange={f("vorname")} maxLength={80} /></Feld>
        <Feld id={`${id}-nn`} label="Nachname" pflicht><input id={`${id}-nn`} className={eingabe} value={d.nachname} onChange={f("nachname")} maxLength={80} /></Feld>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id={`${id}-org`} label="Organisation">
          <select id={`${id}-org`} className={auswahlfeld} value={d.organisationId} onChange={f("organisationId")}>
            <option value="">– keine –</option>
            {organisationen.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-fu`} label="Funktion"><input id={`${id}-fu`} className={eingabe} value={d.funktion} onChange={f("funktion")} maxLength={80} placeholder="z. B. Bürgermeisterin" /></Feld>
        <Feld id={`${id}-fi`} label="Firma (ohne Organisation)"><input id={`${id}-fi`} className={eingabe} value={d.firma} onChange={f("firma")} maxLength={120} /></Feld>
        <Feld id={`${id}-em`} label="E-Mail"><input id={`${id}-em`} type="email" className={eingabe} value={d.email} onChange={f("email")} maxLength={190} /></Feld>
        <Feld id={`${id}-te`} label="Telefon"><input id={`${id}-te`} className={eingabe} value={d.telefon} onChange={f("telefon")} maxLength={40} /></Feld>
        <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem] gap-3">
          <Feld id={`${id}-plz`} label="PLZ"><input id={`${id}-plz`} className={eingabe} value={d.plz} onChange={f("plz")} maxLength={10} /></Feld>
          <Feld id={`${id}-ort`} label="Ort"><input id={`${id}-ort`} className={eingabe} value={d.ort} onChange={f("ort")} maxLength={80} /></Feld>
          <Feld id={`${id}-la`} label="Land">
            <select id={`${id}-la`} className={auswahlfeld} value={d.land} onChange={f("land")}>
              {Object.keys(LAENDER).map((l) => <option key={l}>{l}</option>)}
            </select>
          </Feld>
        </div>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[13.5px] font-semibold text-ink-700">Rollen</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(KONTAKT_ROLLEN).map(([k, l]) => (
            <Chip key={k} name="rollen" value={k} checked={d.rollen.includes(k)} onChange={() => setD({ ...d, rollen: d.rollen.includes(k) ? d.rollen.filter((x) => x !== k) : [...d.rollen, k] })}>{l}</Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Feld id={`${id}-tg`} label="Tags" hinweis="Kommagetrennt, z. B. Entscheider, Messe 2026"><input id={`${id}-tg`} className={eingabe} value={d.tags} onChange={f("tags")} /></Feld>
        <Feld id={`${id}-zu`} label="Zuständig">
          <select id={`${id}-zu`} className={auswahlfeld} value={d.zustaendigId} onChange={f("zustaendigId")}>
            <option value="">– niemand –</option>
            {konten.map((k) => <option key={k.id} value={k.id}>{name(k)}</option>)}
          </select>
        </Feld>
      </div>
      <Feld id={`${id}-no`} label="Notiz"><textarea id={`${id}-no`} className={cn(textbereich, "min-h-[80px]")} value={d.notiz} onChange={f("notiz")} maxLength={3000} /></Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" icon={Save} disabled={laeuft}>{laeuft ? "Speichert …" : kontakt ? "Speichern" : "Kontakt anlegen"}</Button>
        {doppelt && <Button type="button" size="sm" variant="secondary" onClick={() => speichern(null, true)}>Trotzdem anlegen</Button>}
        {abbrechen && <Button type="button" size="sm" variant="ghost" onClick={abbrechen}>Abbrechen</Button>}
        <span className="self-center text-[12px] text-ink-400">Strg + Enter</span>
      </div>
    </form>
  );
}

export function OrganisationFormular({ organisation, fertig, abbrechen }) {
  const id = useId();
  const router = useRouter();
  const [d, setD] = useState(() => ({ name: organisation?.name || "", art: organisation?.art || "gemeinde", plz: organisation?.plz || "", ort: organisation?.ort || "", land: organisation?.land || "DE", bundesland: organisation?.bundesland || "", website: organisation?.website || "", telefon: organisation?.telefon || "", email: organisation?.email || "", tags: (organisation?.tags || []).join(", "), notiz: organisation?.notiz || "" }));
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const f = (k) => (e) => setD({ ...d, [k]: e.target.value });
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const body = { ...d, tags: d.tags.split(",").map((x) => x.trim()).filter(Boolean) };
      const r = organisation ? await senden(`/api/admin/crm/organisationen/${organisation.id}`, { method: "PATCH", body }) : await senden("/api/admin/crm/organisationen", { body });
      if (fertig) fertig(r.organisation);
      else router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Feld id={`${id}-n`} label="Name" pflicht><input id={`${id}-n`} required minLength={2} className={eingabe} value={d.name} onChange={f("name")} maxLength={160} /></Feld>
        <Feld id={`${id}-a`} label="Art">
          <select id={`${id}-a`} className={auswahlfeld} value={d.art} onChange={f("art")}>
            {Object.entries(ORG_ARTEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Feld>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Feld id={`${id}-p`} label="PLZ"><input id={`${id}-p`} className={eingabe} value={d.plz} onChange={f("plz")} /></Feld>
        <Feld id={`${id}-o`} label="Ort"><input id={`${id}-o`} className={eingabe} value={d.ort} onChange={f("ort")} /></Feld>
        <Feld id={`${id}-l`} label="Land">
          <select id={`${id}-l`} className={auswahlfeld} value={d.land} onChange={f("land")}>
            {Object.keys(LAENDER).map((l) => <option key={l}>{l}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-b`} label="Bundesland"><input id={`${id}-b`} className={eingabe} value={d.bundesland} onChange={f("bundesland")} /></Feld>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Feld id={`${id}-w`} label="Website"><input id={`${id}-w`} className={eingabe} value={d.website} onChange={f("website")} /></Feld>
        <Feld id={`${id}-t`} label="Telefon"><input id={`${id}-t`} className={eingabe} value={d.telefon} onChange={f("telefon")} /></Feld>
        <Feld id={`${id}-e`} label="E-Mail"><input id={`${id}-e`} type="email" className={eingabe} value={d.email} onChange={f("email")} /></Feld>
      </div>
      <Feld id={`${id}-tg`} label="Tags"><input id={`${id}-tg`} className={eingabe} value={d.tags} onChange={f("tags")} /></Feld>
      <Feld id={`${id}-no`} label="Notiz"><textarea id={`${id}-no`} className={cn(textbereich, "min-h-[80px]")} value={d.notiz} onChange={f("notiz")} /></Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex gap-2">
        <Button type="submit" size="sm" icon={Save} disabled={laeuft}>{organisation ? "Speichern" : "Organisation anlegen"}</Button>
        {abbrechen && <Button type="button" size="sm" variant="ghost" onClick={abbrechen}>Abbrechen</Button>}
      </div>
    </form>
  );
}

/** Aufklappbarer Bereich mit Formular (z. B. „Bearbeiten“, „Neue Organisation“) */
export function Aufklapper({ label, icon: Icon = Plus, children, variant = "secondary" }) {
  const [offen, setOffen] = useState(false);
  return (
    <div>
      {!offen ? (
        <Button type="button" size="sm" variant={variant} icon={Icon} onClick={() => setOffen(true)}>{label}</Button>
      ) : (
        <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70">{typeof children === "function" ? children(() => setOffen(false)) : children}</div>
      )}
    </div>
  );
}

export function NeueOrganisation() {
  const router = useRouter();
  return <Aufklapper label="Neue Organisation">{(zu) => <OrganisationFormular fertig={(o) => router.push(`/portal/admin/crm/organisation/${o.id}`)} abbrechen={zu} />}</Aufklapper>;
}

export function KontaktBearbeiten({ kontakt, organisationen, konten }) {
  return <Aufklapper label="Stammdaten bearbeiten">{(zu) => <KontaktFormular kontakt={kontakt} organisationen={organisationen} konten={konten} abbrechen={zu} />}</Aufklapper>;
}

export function OrganisationBearbeiten({ organisation }) {
  return <Aufklapper label="Bearbeiten">{(zu) => <OrganisationFormular organisation={organisation} abbrechen={zu} />}</Aufklapper>;
}

// ---------------------------------------------------------------- Aktivität

export function AktivitaetErfassen({ kontaktId, organisationId, konten = [], nutzerId, bezuege = [] }) {
  const id = useId();
  const router = useRouter();
  const form = useRef(null);
  const leer = { typ: "anruf", betreff: "", text: "", bezug: "", ergebnis: "", dauerMin: "", wv: false, wiedervorlageAm: tagPlus(3), zustaendigId: nutzerId || "" };
  const [d, setD] = useState(leer);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function speichern(e) {
    e?.preventDefault();
    setFehler("");
    setOk("");
    setLaeuft(true);
    try {
      const [bezugArt, bezugId] = d.bezug ? d.bezug.split(":") : [];
      await senden("/api/admin/crm/aktivitaeten", {
        body: { kontaktId, organisationId, typ: d.typ, betreff: d.betreff, text: d.text, ergebnis: d.ergebnis, dauerMin: d.dauerMin || undefined, ...(bezugArt ? { bezugArt, bezugId } : {}), ...(d.wv ? { wiedervorlageAm: d.wiedervorlageAm, zustaendigId: d.zustaendigId } : {}) },
      });
      setD({ ...leer, typ: d.typ });
      setOk(d.wv ? "Aktivität gespeichert, Wiedervorlage angelegt." : "Aktivität gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }
  useStrgEnter(form, () => speichern());
  return (
    <form ref={form} onSubmit={speichern} className="space-y-3">
      <div role="radiogroup" aria-label="Art der Aktivität" className="flex flex-wrap gap-2">
        {Object.entries(AKTIVITAET_TYPEN).map(([k, l]) => {
          const Icon = TYP_ICON[k];
          return (
            <Chip key={k} type="radio" name={`${id}-typ`} value={k} checked={d.typ === k} onChange={() => setD({ ...d, typ: k })}>
              <Icon aria-hidden="true" className="h-4 w-4" /> {l}
            </Chip>
          );
        })}
      </div>
      <Feld id={`${id}-b`} label="Betreff" pflicht>
        <input id={`${id}-b`} required minLength={3} maxLength={160} className={eingabe} value={d.betreff} onChange={(e) => setD({ ...d, betreff: e.target.value })} placeholder={d.typ === "anruf" ? "z. B. Rückruf zur Zuwegung" : "Worum ging es?"} />
      </Feld>
      <Feld id={`${id}-t`} label="Notiz">
        <textarea id={`${id}-t`} maxLength={3000} className={cn(textbereich, "min-h-[72px]")} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} />
      </Feld>
      <div className="grid gap-3 sm:grid-cols-2">
        {bezuege.length > 0 && (
          <Feld id={`${id}-o`} label="Zu Objekt">
            <select id={`${id}-o`} className={auswahlfeld} value={d.bezug} onChange={(e) => setD({ ...d, bezug: e.target.value })}>
              <option value="">– allgemein –</option>
              {bezuege.map((b) => <option key={`${b.art}:${b.id}`} value={`${b.art}:${b.id}`}>{b.titel}</option>)}
            </select>
          </Feld>
        )}
        {(d.typ === "anruf" || d.typ === "termin") && (
          <Feld id={`${id}-e`} label="Ergebnis">
            <input id={`${id}-e`} className={eingabe} maxLength={160} value={d.ergebnis} onChange={(e) => setD({ ...d, ergebnis: e.target.value })} placeholder="z. B. nicht erreicht, Termin vereinbart" />
          </Feld>
        )}
      </div>
      <label className="flex items-center gap-2 text-[14px] font-medium text-ink-700">
        <input type="checkbox" checked={d.wv} onChange={(e) => setD({ ...d, wv: e.target.checked })} className="h-4 w-4 accent-[#558227]" /> Wiedervorlage anlegen
      </label>
      {d.wv && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id={`${id}-w`} label="Wiedervorlage am">
            <input id={`${id}-w`} type="date" className={eingabe} value={d.wiedervorlageAm} onChange={(e) => setD({ ...d, wiedervorlageAm: e.target.value })} />
          </Feld>
          <Feld id={`${id}-z`} label="Zuständig">
            <select id={`${id}-z`} className={auswahlfeld} value={d.zustaendigId} onChange={(e) => setD({ ...d, zustaendigId: e.target.value })}>
              {konten.map((k) => <option key={k.id} value={k.id}>{name(k)}</option>)}
            </select>
          </Feld>
        </div>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" icon={MessageSquarePlus} disabled={laeuft}>{laeuft ? "Speichert …" : "Aktivität speichern"}</Button>
        <span className="text-[12px] text-ink-400">Strg + Enter</span>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Beziehung

export function BeziehungSetzen({ kontaktId }) {
  const id = useId();
  const router = useRouter();
  const [d, setD] = useState({ art: "flaeche", id: "", rolle: "Ansprechpartner" });
  const [fehler, setFehler] = useState("");
  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    try {
      await senden(`/api/admin/crm/kontakte/${kontaktId}/beziehung`, { body: { ...d, id: d.id.trim().toUpperCase() } });
      setD({ ...d, id: "" });
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }
  return (
    <form onSubmit={speichern} className="space-y-2">
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-2">
        <label className="sr-only" htmlFor={`${id}-a`}>Objektart</label>
        <select id={`${id}-a`} className={cn(auswahlfeld, "h-10")} value={d.art} onChange={(e) => setD({ ...d, art: e.target.value })}>
          <option value="vorgang">Vorgang</option>
          <option value="flaeche">Fläche</option>
          <option value="projekt">Projekt</option>
          <option value="interesse">Interesse</option>
        </select>
        <label className="sr-only" htmlFor={`${id}-i`}>Kennung</label>
        <input id={`${id}-i`} required className={cn(eingabe, "h-10 font-mono text-[13.5px]")} placeholder="z. B. F-26-ABC123" value={d.id} onChange={(e) => setD({ ...d, id: e.target.value })} />
        <label className="sr-only" htmlFor={`${id}-r`}>Rolle</label>
        <select id={`${id}-r`} className={cn(auswahlfeld, "h-10 col-span-1")} value={d.rolle} onChange={(e) => setD({ ...d, rolle: e.target.value })}>
          {BEZUG_ROLLEN.map((r) => <option key={r}>{r}</option>)}
        </select>
        <Button type="submit" size="sm" variant="secondary" icon={Link2}>Verknüpfen</Button>
      </div>
      <FehlerBox>{fehler}</FehlerBox>
    </form>
  );
}

export function BeziehungEntfernen({ kontaktId, art, id }) {
  const router = useRouter();
  return (
    <button type="button" aria-label="Beziehung entfernen" title="Beziehung entfernen" onClick={async () => { await senden(`/api/admin/crm/kontakte/${kontaktId}/beziehung`, { body: { art, id, entfernen: true } }).catch(() => {}); router.refresh(); }} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-800">
      <X aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

// ---------------------------------------------------------------- Vorlage senden

export function VorlageSenden({ kontaktId, vorlagen = [], bezuege = [], hatEmail }) {
  const id = useId();
  const router = useRouter();
  const [vorlageId, setVorlageId] = useState(vorlagen[0]?.id || "");
  const [bezug, setBezug] = useState(bezuege[0] ? `${bezuege[0].art}:${bezuege[0].id}` : "");
  const [vorschau, setVorschau] = useState(null);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const vl = vorlagen.find((v) => v.id === vorlageId);
  const [bezugArt, bezugId] = bezug ? bezug.split(":") : [];

  async function zeigen() {
    setFehler("");
    try {
      const r = await senden("/api/admin/vorlagen/vorschau", { body: { vorlageId, kontaktId, ...(bezugArt ? { bezugArt, bezugId } : {}) } });
      setVorschau(r.vorschau);
    } catch (x) {
      setFehler(x.message);
    }
  }
  async function abschicken() {
    setFehler("");
    setOk("");
    try {
      const r = await senden("/api/admin/vorlagen/senden", { body: { vorlageId, kontaktId, ...(bezugArt ? { bezugArt, bezugId } : {}) } });
      setOk(r.kanal === "email" ? "E-Mail liegt im Postausgang." : "Nachricht im Portal gesendet.");
      setVorschau(null);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }
  if (!vorlagen.length) return <p className="text-[14px] text-ink-500">Noch keine Vorlagen – <Link href="/portal/admin/vorlagen" className="font-semibold text-ov-700">Vorlagen anlegen</Link>.</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Feld id={`${id}-v`} label="Vorlage">
          <select id={`${id}-v`} className={cn(auswahlfeld, "h-10")} value={vorlageId} onChange={(e) => { setVorlageId(e.target.value); setVorschau(null); }}>
            {vorlagen.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.kanal === "email" ? "E-Mail" : "Nachricht"})</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-o`} label="Objekt (für Platzhalter)">
          <select id={`${id}-o`} className={cn(auswahlfeld, "h-10")} value={bezug} onChange={(e) => { setBezug(e.target.value); setVorschau(null); }}>
            <option value="">– ohne Objekt –</option>
            {bezuege.map((b) => <option key={`${b.art}:${b.id}`} value={`${b.art}:${b.id}`}>{b.titel}</option>)}
          </select>
        </Feld>
      </div>
      {vorschau && (
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
          {vl?.kanal === "email" && <p className="text-[13.5px] font-semibold text-ink-900">{vorschau.betreff}</p>}
          <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">{vorschau.text}</p>
          {vorschau.leer.length > 0 && <p className="mt-2 text-[12px] text-ink-500">Ohne Wert: {vorschau.leer.map((x) => `{{${x}}}`).join(", ")}</p>}
        </div>
      )}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={zeigen}>Vorschau</Button>
        <Button type="button" size="sm" icon={Send} onClick={abschicken} disabled={!vorschau || (vl?.kanal === "email" && !hatEmail) || (vl?.kanal === "nachricht" && !bezug)}>
          {vl?.kanal === "email" ? "E-Mail senden" : "Nachricht senden"}
        </Button>
      </div>
      {vl?.kanal === "email" && !hatEmail && <p className="text-[12.5px] text-ink-500">Für diesen Kontakt ist keine E-Mail-Adresse hinterlegt.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Dubletten

export function DublettenListe({ paare }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState("");
  const [erledigt, setErledigt] = useState([]);
  const sichtbar = useMemo(() => paare.filter((p) => !erledigt.includes(`${p.a.id}|${p.b.id}`)), [paare, erledigt]);
  async function zusammen(zielId, quelleId, schluessel) {
    setFehler("");
    setLaeuft(schluessel);
    try {
      await senden("/api/admin/crm/dubletten", { body: { zielId, quelleId } });
      setErledigt((e) => [...e, schluessel]);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft("");
    }
  }
  if (!sichtbar.length) return <p className="text-[14px] text-ink-500">Keine möglichen Dubletten gefunden.</p>;
  return (
    <div className="space-y-3">
      <FehlerBox>{fehler}</FehlerBox>
      <ul className="space-y-3">
        {sichtbar.map((p) => {
          const s = `${p.a.id}|${p.b.id}`;
          return (
            <li key={s} className={cn("rounded-3xl bg-white p-4 ring-1 ring-ink-200/70", laeuft === s && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("ov-num rounded-full px-2.5 py-1 text-[12px] font-bold", p.score >= 85 ? "bg-sun-300/40 text-ink-900" : "bg-ink-100 text-ink-700")}>{p.score} %</span>
                <span className="text-[13px] text-ink-600">{p.gruende.join(" · ")}</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[[p.a, p.b], [p.b, p.a]].map(([k, andere]) => (
                  <div key={k.id} className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl bg-sand-50 p-3.5 ring-1 ring-ink-200/60">
                    <div className="min-w-0">
                      <Link href={`/portal/admin/crm/${k.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{name(k)}</Link>
                      {k.nutzerId && <span className="ml-2 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">Portal-Konto</span>}
                      <p className="mt-0.5 break-words text-[12.5px] text-ink-600">{[k.email, k.telefon, [k.plz, k.ort].filter(Boolean).join(" "), k.organisation || k.firma].filter(Boolean).join(" · ")}</p>
                      <p className="text-[12px] text-ink-500">{k.bezuege} Objekt(e) · Quelle {k.quelle} · angelegt {relativ(k.erstelltAm)}</p>
                    </div>
                    <Button type="button" size="sm" variant="secondary" icon={GitMerge} disabled={!!laeuft} onClick={() => zusammen(k.id, andere.id, s)}>
                      Hier zusammenführen
                    </Button>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-500"><Check aria-hidden="true" className="h-4 w-4" /> Beim Zusammenführen bleiben alle Aktivitäten, Objekte, Rollen und Tags erhalten; leere Felder werden ergänzt.</p>
    </div>
  );
}

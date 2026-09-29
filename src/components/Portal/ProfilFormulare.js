"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { LAENDER, PROJEKT_TYPEN, ROLLEN } from "@/lib/plattform/konstanten";
import { passwortFehler } from "@/lib/plattform/validierung";
import { PHASEN } from "@/lib/invest/markt";
import { eingabe, Feld, FehlerBox, ErfolgBox, Chip } from "./felder";

function useSpeichern() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(fn, text = "Gespeichert.") {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      await fn();
      setErfolg(text);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  return { laeuft, fehler, erfolg, los };
}

export function StammdatenFormular({ nutzer }) {
  const id = useId();
  const s = useSpeichern();
  const [f, setF] = useState({ vorname: nutzer.vorname || "", nachname: nutzer.nachname || "", firma: nutzer.firma || "", telefon: nutzer.telefon || "" });
  const [rollen, setRollen] = useState(nutzer.rollen.filter((r) => r !== "admin"));
  const setze = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        s.los(() => senden("/api/portal/profil", { method: "PATCH", body: { ...f, rollen } }));
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id={`${id}-v`} label="Vorname" pflicht><input id={`${id}-v`} required className={eingabe} value={f.vorname} onChange={(e) => setze("vorname", e.target.value)} autoComplete="given-name" /></Feld>
        <Feld id={`${id}-n`} label="Nachname" pflicht><input id={`${id}-n`} required className={eingabe} value={f.nachname} onChange={(e) => setze("nachname", e.target.value)} autoComplete="family-name" /></Feld>
        <Feld id={`${id}-f`} label="Unternehmen / Betrieb"><input id={`${id}-f`} className={eingabe} value={f.firma} onChange={(e) => setze("firma", e.target.value)} autoComplete="organization" /></Feld>
        <Feld id={`${id}-t`} label="Telefon"><input id={`${id}-t`} type="tel" className={eingabe} value={f.telefon} onChange={(e) => setze("telefon", e.target.value)} autoComplete="tel" /></Feld>
        <Feld id={`${id}-e`} label="E-Mail-Adresse" hinweis="Änderung der Anmeldeadresse bitte per Nachricht an das Backoffice." className="sm:col-span-2">
          <input id={`${id}-e`} disabled className={eingabe} value={nutzer.email} />
        </Feld>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Meine Rollen</legend>
        <div className="flex flex-wrap gap-2">
          {ROLLEN.map((r) => (
            <Chip key={r.id} name="rolle" value={r.id} checked={rollen.includes(r.id)} onChange={() => setRollen((x) => (x.includes(r.id) ? x.filter((y) => y !== r.id) : [...x, r.id]))}>
              {r.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <FehlerBox>{s.fehler}</FehlerBox>
      <ErfolgBox>{s.erfolg}</ErfolgBox>
      <Button type="submit" disabled={s.laeuft}>{s.laeuft ? "Wird gespeichert …" : "Speichern"}</Button>
    </form>
  );
}

export function PasswortAendernFormular() {
  const id = useId();
  const s = useSpeichern();
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const hinweis = neu ? passwortFehler(neu) : "";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hinweis) return;
        s.los(async () => {
          await senden("/api/portal/passwort", { body: { alt, neu } });
          setAlt("");
          setNeu("");
        }, "Passwort geändert. Andere Sitzungen wurden abgemeldet.");
      }}
      className="space-y-4"
    >
      <Feld id={`${id}-a`} label="Bisheriges Passwort"><input id={`${id}-a`} type="password" required autoComplete="current-password" className={eingabe} value={alt} onChange={(e) => setAlt(e.target.value)} /></Feld>
      <Feld id={`${id}-n`} label="Neues Passwort" hinweis={hinweis || "Mindestens 10 Zeichen, Buchstaben und Ziffer oder Sonderzeichen."}>
        <input id={`${id}-n`} type="password" required minLength={10} autoComplete="new-password" className={eingabe} value={neu} onChange={(e) => setNeu(e.target.value)} />
      </Feld>
      <FehlerBox>{s.fehler}</FehlerBox>
      <ErfolgBox>{s.erfolg}</ErfolgBox>
      <Button type="submit" variant="secondary" disabled={s.laeuft || !!hinweis}>Passwort ändern</Button>
    </form>
  );
}

export function SuchprofilFormular({ profil }) {
  const id = useId();
  const s = useSpeichern();
  const [p, setP] = useState({
    mwpMin: profil?.mwpMin ?? "",
    mwpMax: profil?.mwpMax ?? "",
    ticketMin: profil?.ticketMin ?? "",
    ticketMax: profil?.ticketMax ?? "",
    phasen: profil?.phasen || [],
    laender: profil?.laender || [],
    typen: profil?.typen || [],
    benachrichtigen: profil?.benachrichtigen ?? true,
  });
  const setze = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const umschalten = (k, v) => setP((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        s.los(() => senden("/api/portal/suchprofil", { method: "PUT", body: p }), "Suchprofil gespeichert – die Passung wird neu berechnet.");
      }}
      className="space-y-5"
    >
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Projekttypen</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROJEKT_TYPEN).map(([k, v]) => <Chip key={k} value={k} checked={p.typen.includes(k)} onChange={() => umschalten("typen", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Entwicklungsphasen</legend>
        <div className="flex flex-wrap gap-2">
          {PHASEN.map((ph) => <Chip key={ph.id} value={ph.id} checked={p.phasen.includes(ph.id)} onChange={() => umschalten("phasen", ph.id)}>{ph.kurz}</Chip>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Länder</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LAENDER).map(([k, v]) => <Chip key={k} value={k} checked={p.laender.includes(k)} onChange={() => umschalten("laender", k)}>{v}</Chip>)}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id={`${id}-m1`} label="Leistung von (MWp)"><input id={`${id}-m1`} inputMode="decimal" className={eingabe} value={p.mwpMin} onChange={(e) => setze("mwpMin", e.target.value)} /></Feld>
        <Feld id={`${id}-m2`} label="Leistung bis (MWp)"><input id={`${id}-m2`} inputMode="decimal" className={eingabe} value={p.mwpMax} onChange={(e) => setze("mwpMax", e.target.value)} /></Feld>
        <Feld id={`${id}-t1`} label="Ticket von (€)"><input id={`${id}-t1`} inputMode="decimal" className={eingabe} value={p.ticketMin} onChange={(e) => setze("ticketMin", e.target.value)} /></Feld>
        <Feld id={`${id}-t2`} label="Ticket bis (€)"><input id={`${id}-t2`} inputMode="decimal" className={eingabe} value={p.ticketMax} onChange={(e) => setze("ticketMax", e.target.value)} /></Feld>
      </div>
      <label className="flex items-start gap-3 text-[14px] text-ink-700">
        <input type="checkbox" checked={p.benachrichtigen} onChange={(e) => setze("benachrichtigen", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#558227]" />
        Bei neuen passenden Projekten im Portal benachrichtigen
      </label>
      <FehlerBox>{s.fehler}</FehlerBox>
      <ErfolgBox>{s.erfolg}</ErfolgBox>
      <Button type="submit" disabled={s.laeuft}>{s.laeuft ? "Wird gespeichert …" : "Suchprofil speichern"}</Button>
    </form>
  );
}

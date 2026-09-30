"use client";

// Geführte Verifizierung (KYC/KYB) im Portal: Kontotyp → Person → Ausweis → (Unternehmen → Berechtigte & Vertreter)
// → Erklärungen → (Auszahlung & Eigentum) → Einreichen. Jeder Schritt speichert serverseitig (PATCH /api/portal/kyc);
// Prüfungen (Pflichtangaben, IBAN-Prüfziffer, Dateityp an den ersten Bytes, Größe) erfolgen auf dem Server –
// hier nur Vorprüfung für schnelle Rückmeldung.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Check, CheckCircle2, CircleDashed, Eye, FileText, Landmark, Plus, Send, ShieldCheck, Trash2, UploadCloud, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Karte, Hinweis } from "@/components/Portal/ui";
import { Feld, FehlerBox, ErfolgBox, Chip, eingabe, auswahlfeld, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { datum, dateigroesse } from "@/lib/plattform/format";
import {
  KYC_DOKUMENTE, KYC_KONTOTYPEN, KYC_KONTROLLE_ARTEN, KYC_LAENDER, KYC_MITTEL_QUELLEN, KYC_REGISTER, KYC_SCHWAERZEN_HINWEIS, KYC_TICKETS, KYC_UPLOAD, ibanPruefen,
} from "@/lib/plattform/kyc";
import { Fortschritt, KycStatusBadge } from "./teile";

const LAENDER_OPTIONEN = Object.entries(KYC_LAENDER);

async function kycHochladen(datei, felder) {
  const fd = new FormData();
  fd.append("datei", datei);
  for (const [k, w] of Object.entries(felder)) if (w) fd.append(k, w);
  const res = await fetch("/api/portal/kyc/dokumente", { method: "POST", body: fd, headers: { "X-Plattform-Upload": "1" }, credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Upload fehlgeschlagen (${res.status})`);
  return json.dokument;
}

function LandAuswahl({ id, value, onChange, disabled, leer = "Bitte wählen" }) {
  return (
    <select id={id} className={auswahlfeld} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{leer}</option>
      {LAENDER_OPTIONEN.map(([k, l]) => (
        <option key={k} value={k}>{l}</option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------- Unterlagen

function DokumentZeile({ d, bearbeitbar, onLoeschen }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
        <FileText aria-hidden="true" className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <a href={`/api/portal/kyc/dokumente/${d.id}?anzeigen=1`} target="_blank" rel="noopener" className="block truncate text-[14px] font-semibold text-ink-900 hover:text-ov-700">{d.name}</a>
        <p className="truncate text-[12.5px] text-ink-500">
          {dateigroesse(d.groesse)} · {datum(d.am)} · {d.status === "ok" ? "geprüft" : d.status === "abgelehnt" ? "nicht akzeptiert" : "hochgeladen"} · verschlüsselt gespeichert
        </p>
        {d.status === "abgelehnt" && d.grund && <p className="mt-0.5 text-[12.5px] font-medium text-red-700">{d.grund}</p>}
      </div>
      <a href={`/api/portal/kyc/dokumente/${d.id}?anzeigen=1`} target="_blank" rel="noopener" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100" aria-label={`${d.name} ansehen`}>
        <Eye aria-hidden="true" className="h-4 w-4" />
      </a>
      {bearbeitbar && d.status !== "ok" && (
        <button type="button" onClick={() => onLoeschen(d)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label={`${d.name} löschen`}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function Unterlage({ art, label, hinweis, pflicht = true, dokumente, bearbeitbar, felder = {}, mitDatum = false, onGeaendert }) {
  const input = useRef(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ausgestelltAm, setAusgestelltAm] = useState("");
  const eigene = dokumente.filter((d) => d.art === art && (!felder.flaecheId || d.flaecheId === felder.flaecheId) && (!felder.personId || d.personId === felder.personId));
  const vorhanden = eigene.some((d) => d.status !== "abgelehnt");

  async function waehlen(e) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    setFehler("");
    if (datei.size > KYC_UPLOAD.maxBytes) return setFehler("Die Datei ist größer als 10 MB.");
    if (!/\.(pdf|jpe?g|png)$/i.test(datei.name)) return setFehler("Erlaubt sind PDF, JPG und PNG.");
    if (mitDatum && !ausgestelltAm) return setFehler("Bitte geben Sie das Ausstellungsdatum des Auszugs an.");
    setLaeuft(true);
    try {
      await kycHochladen(datei, { art, ...felder, ausgestelltAm: mitDatum ? ausgestelltAm : "" });
      await onGeaendert();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function loeschen(d) {
    if (!window.confirm(`„${d.name}“ wirklich löschen?`)) return;
    try {
      await senden(`/api/portal/kyc/dokumente/${d.id}`, { method: "DELETE" });
      await onGeaendert();
    } catch (err) {
      setFehler(err.message);
    }
  }

  return (
    <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900">
            {vorhanden ? <CheckCircle2 aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-ov-600" /> : <CircleDashed aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-ink-400" />}
            <span className="min-w-0">{label}</span>
            {!pflicht && <span className="text-[12px] font-normal text-ink-500">optional</span>}
          </p>
          {hinweis && <p className="mt-1 text-[13px] leading-snug text-ink-600">{hinweis}</p>}
        </div>
        {bearbeitbar && (
          <div className="flex flex-wrap items-end gap-2">
            {mitDatum && (
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-600">Ausgestellt am</span>
                <input type="date" className={cn(eingabe, "h-10 w-[160px]")} value={ausgestelltAm} onChange={(e) => setAusgestelltAm(e.target.value)} />
              </label>
            )}
            <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="sr-only" onChange={waehlen} aria-label={`${label} hochladen`} />
            <Button size="sm" variant={vorhanden ? "secondary" : "primary"} icon={UploadCloud} onClick={() => input.current?.click()} disabled={laeuft}>
              {laeuft ? "Wird verschlüsselt …" : vorhanden ? "Weitere Datei" : "Hochladen"}
            </Button>
          </div>
        )}
      </div>
      {eigene.length > 0 && <ul className="mt-2 divide-y divide-ink-100">{eigene.map((d) => <DokumentZeile key={d.id} d={d} bearbeitbar={bearbeitbar} onLoeschen={loeschen} />)}</ul>}
      {fehler && <p role="alert" className="mt-2 text-[13px] font-medium text-red-700">{fehler}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Personenlisten (UBO, Vertreter)

const neueZeile = (extra = {}) => ({ id: `n${Math.random().toString(36).slice(2, 10)}`, vorname: "", nachname: "", geburtsdatum: "", ...extra });

function PersonenListe({ titel, liste, setListe, felder, bearbeitbar, neu }) {
  const setze = (i, k, w) => setListe(liste.map((x, j) => (j === i ? { ...x, [k]: w } : x)));
  return (
    <div className="space-y-3">
      {liste.map((p, i) => (
        <fieldset key={p.id} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200" disabled={!bearbeitbar}>
          <legend className="px-1 text-[13px] font-semibold text-ink-700">{titel} {i + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Feld id={`${p.id}-v`} label="Vorname" pflicht><input id={`${p.id}-v`} className={eingabe} value={p.vorname} onChange={(e) => setze(i, "vorname", e.target.value)} autoComplete="off" /></Feld>
            <Feld id={`${p.id}-n`} label="Nachname" pflicht><input id={`${p.id}-n`} className={eingabe} value={p.nachname} onChange={(e) => setze(i, "nachname", e.target.value)} autoComplete="off" /></Feld>
            <Feld id={`${p.id}-g`} label="Geburtsdatum" pflicht><input id={`${p.id}-g`} type="date" className={eingabe} value={p.geburtsdatum} onChange={(e) => setze(i, "geburtsdatum", e.target.value)} /></Feld>
            {felder(p, (k, w) => setze(i, k, w))}
          </div>
          {bearbeitbar && (
            <button type="button" onClick={() => setListe(liste.filter((_, j) => j !== i))} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 hover:text-ink-900">
              <Trash2 aria-hidden="true" className="h-4 w-4" /> Entfernen
            </button>
          )}
        </fieldset>
      ))}
      {bearbeitbar && (
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setListe([...liste, neu()])}>{titel} hinzufügen</Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Hauptkomponente

export default function KycAssistent({ start, rollen = [] }) {
  const router = useRouter();
  const [daten, setDaten] = useState(start);
  const fall = daten.fall;
  const typ = fall?.kontotyp || "";
  const vorgaben = fall?.investorVorgaben || daten.investorVorgaben || null; // Investorentyp aus dem Suchprofil
  const bearbeitbar = !fall || fall.bearbeitbar;
  const investor = rollen.includes("investor");
  const eigentuemer = rollen.includes("flaeche") || rollen.includes("landwirt");

  const schritte = useMemo(() => [
    { id: "start", label: "Kontotyp" },
    { id: "person", label: "Person" },
    { id: "ausweis", label: "Ausweis" },
    typ === "unternehmen" && { id: "firma", label: "Unternehmen" },
    typ === "unternehmen" && { id: "berechtigte", label: "Berechtigte & Vertreter" },
    { id: "erklaerungen", label: "Erklärungen" },
    eigentuemer && { id: "auszahlung", label: "Auszahlung & Eigentum" },
    { id: "einreichen", label: "Einreichen" },
  ].filter(Boolean), [typ, eigentuemer]);

  const [schritt, setSchritt] = useState(() => (!fall ? "start" : fall.status === "offen" ? "person" : "einreichen"));
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  // Formularzustände
  const [person, setPerson] = useState(() => ({ vorname: "", nachname: "", geburtsdatum: "", geburtsort: "", staatsangehoerigkeit: "DE", ...fall?.person, adresse: { strasse: "", plz: "", ort: "", land: "DE", ...fall?.person?.adresse }, ausweis: { art: "personalausweis", nummer: "", behoerde: "", gueltigBis: "", ...fall?.person?.ausweis } }));
  const [firma, setFirma] = useState(() => ({ name: "", rechtsform: "", registernummer: "", registergericht: "", land: "DE", sitz: "", mehrstufig: false, treuhand: false, ...fall?.firma }));
  const [vertretung, setVertretung] = useState(fall?.einreicherVertretungsberechtigt ?? true);
  const [ubos, setUbos] = useState(() => (fall?.ubos?.length ? fall.ubos : []));
  const [vertreter, setVertreter] = useState(() => (fall?.vertreter?.length ? fall.vertreter : []));
  const [pep, setPep] = useState(() => ({ istPep: undefined, naheStehend: undefined, funktion: "", ...fall?.pep }));
  const [mittel, setMittel] = useState(() => ({ ticket: "", quellen: [], text: "", ...fall?.mittelherkunft }));
  const [steuer, setSteuer] = useState(() => ({ land: "", steuerId: "", ...fall?.steuer }));
  const [bank, setBank] = useState(() => ({ iban: "", kontoinhaber: "", bic: "", ...fall?.bank }));

  const idx = schritte.findIndex((s) => s.id === schritt);
  // Schritt erledigt = alle Pflichtpunkte seiner Gruppen erfüllt (nicht nur „schon besucht“)
  const GRUPPEN = { start: ["Start"], person: ["Angaben"], ausweis: ["Unterlagen"], firma: ["Unternehmen"], berechtigte: ["Wirtschaftlich Berechtigte", "Vertretung"], erklaerungen: ["Erklärungen"], auszahlung: ["Auszahlung", "Eigentum"] };
  const schrittOk = (id) => {
    if (id === "einreichen") return !!fall && !fall.bearbeitbar;
    const punkte = (daten.anforderungen || []).filter((a) => (GRUPPEN[id] || []).includes(a.gruppe));
    const pflicht = punkte.filter((a) => a.pflicht);
    return !!fall && (pflicht.length ? pflicht.every((a) => a.erfuellt) : punkte.some((a) => a.erfuellt));
  };
  const naechster = schritte[idx + 1]?.id;
  const dokumente = fall?.dokumente || [];
  const fehlend = daten.fortschritt?.fehlend || [];

  async function neuLaden() {
    const r = await senden("/api/portal/kyc", { method: "GET" });
    setDaten(r);
    return r;
  }

  async function speichern(abschnitt, werte, { weiter = true } = {}) {
    setFehler("");
    setErfolg("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/kyc", { method: "PATCH", body: { abschnitt, daten: werte } });
      setDaten((d) => ({ ...d, ...r }));
      if (weiter && naechster) setSchritt(abschnitt === "kontotyp" ? "person" : naechster);
      else setErfolg("Gespeichert.");
      return true;
    } catch (e) {
      setFehler(e.message);
      return false;
    } finally {
      setLaeuft(false);
    }
  }

  async function mehrfachSpeichern(liste) {
    for (const [abschnitt, werte] of liste) if (!(await speichern(abschnitt, werte, { weiter: false }))) return;
    setErfolg("");
    if (naechster) setSchritt(naechster);
  }

  async function einreichen() {
    setFehler("");
    setLaeuft(true);
    try {
      await senden("/api/portal/kyc/einreichen", {});
      await neuLaden();
      setErfolg("Vielen Dank – Ihre Verifizierung liegt jetzt zur Prüfung vor.");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function erneut() {
    if (!window.confirm("Erneute Prüfung starten? Bis zur erneuten Bestätigung sind Freigaben (z. B. Datenraum, Auszahlungen) gesperrt.")) return;
    setFehler("");
    try {
      await senden("/api/portal/kyc/erneut", {});
      await neuLaden();
      setSchritt("person");
    } catch (e) {
      setFehler(e.message);
    }
  }

  const ibanInfo = bank.iban ? ibanPruefen(bank.iban) : null;
  const reg = KYC_REGISTER[firma.land] || KYC_REGISTER.DE;
  const zurueck = idx > 0 ? (
    <Button variant="ghost" size="md" onClick={() => setSchritt(schritte[idx - 1].id)}>Zurück</Button>
  ) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        {/* Schrittleiste */}
        <nav aria-label="Schritte der Verifizierung" className="-mx-1 overflow-x-auto pb-1 ov-no-scrollbar">
          <ol className="flex gap-1.5 px-1 max-md:min-w-max md:flex-wrap">
            {schritte.map((s, i) => {
              const aktiv = s.id === schritt;
              const gesperrt = !fall && s.id !== "start";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={gesperrt}
                    onClick={() => setSchritt(s.id)}
                    aria-current={aktiv ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-semibold ring-1 ring-inset transition-colors disabled:opacity-40",
                      aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
                    )}
                  >
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px]", schrittOk(s.id) ? "bg-ov-500 text-white" : aktiv ? "bg-white/15" : "bg-ink-100 text-ink-600")}>
                      {schrittOk(s.id) ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> : i + 1}
                    </span>
                    {s.label}
                    {schrittOk(s.id) && <span className="sr-only"> (erledigt)</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {fall?.status === "nachgefordert" && fall.nachforderung && (
          <Hinweis ton="warn" icon={AlertTriangle} titel="Bitte ergänzen Sie Ihre Unterlagen">{fall.nachforderung}</Hinweis>
        )}
        {fall && !bearbeitbar && fall.status !== "verifiziert" && (
          <Hinweis ton="info" icon={ShieldCheck} titel="Ihre Angaben liegen zur Prüfung vor">Während der Prüfung können Angaben und Unterlagen nicht geändert werden. Sie erhalten eine Benachrichtigung im Portal.</Hinweis>
        )}
        {fall?.status === "verifiziert" && (
          <Hinweis ton="ok" icon={ShieldCheck} titel="Verifizierung abgeschlossen">
            Geprüft am {datum(fall.verifiziertAm)}{fall.naechstePruefung ? ` · nächste regelmäßige Überprüfung ${datum(fall.naechstePruefung)}` : ""}. Haben sich Angaben geändert (z. B. neuer Ausweis, neue Bankverbindung)?{" "}
            <button type="button" onClick={erneut} className="font-semibold underline underline-offset-2">Erneute Prüfung starten</button>
          </Hinweis>
        )}

        <FehlerBox>{fehler}</FehlerBox>
        <ErfolgBox>{erfolg}</ErfolgBox>

        {schritt === "start" && (
          <Karte titel="Wie handeln Sie auf der Plattform?" untertitel="Davon hängen die benötigten Unterlagen ab. Sie können dies später nur über eine erneute Prüfung ändern.">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(KYC_KONTOTYPEN).map(([k, t]) => {
                const Icon = k === "privat" ? UserRound : Building2;
                const gewaehlt = typ === k;
                const empfohlen = !typ && vorgaben?.kontotyp === k;
                return (
                  <button key={k} type="button" disabled={!bearbeitbar || laeuft} onClick={() => speichern("kontotyp", { kontotyp: k })}
                    className={cn("flex min-w-0 items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition", gewaehlt ? "bg-ov-50 ring-2 ring-ov-500" : "bg-white ring-ink-200 hover:ring-ov-300")}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block font-display text-[16px] font-bold text-ink-900">{t.label}{empfohlen && <span className="ml-2 align-middle text-[11.5px] font-semibold uppercase tracking-wide text-ov-700">Empfohlen</span>}</span>
                      <span className="mt-1 block text-[13.5px] leading-snug text-ink-600">{t.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {vorgaben && (
              <p className="mt-4 rounded-2xl bg-sand-100 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700">
                <strong className="text-ink-900">Aus Ihrem Suchprofil: {vorgaben.label}.</strong> {vorgaben.hinweis}
              </p>
            )}
            <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
              Warum? Bei der Vermittlung von Projekten, Pachtverträgen und Beteiligungen müssen wir Vertragspartner und wirtschaftlich Berechtigte nach dem Geldwäscherecht identifizieren. Ihre Unterlagen werden verschlüsselt gespeichert und nur von unserer Compliance eingesehen.
            </p>
          </Karte>
        )}

        {schritt === "person" && (
          <Karte titel={typ === "unternehmen" ? "Angaben zu Ihrer Person (handelnde Person)" : "Angaben zur Person"} untertitel="Wie in Ihrem Ausweis angegeben.">
            <fieldset disabled={!bearbeitbar} className="grid gap-4 sm:grid-cols-2">
              <Feld id="k-vor" label="Vorname(n)" pflicht><input id="k-vor" className={eingabe} autoComplete="given-name" value={person.vorname} onChange={(e) => setPerson({ ...person, vorname: e.target.value })} /></Feld>
              <Feld id="k-nach" label="Nachname" pflicht><input id="k-nach" className={eingabe} autoComplete="family-name" value={person.nachname} onChange={(e) => setPerson({ ...person, nachname: e.target.value })} /></Feld>
              <Feld id="k-geb" label="Geburtsdatum" pflicht><input id="k-geb" type="date" className={eingabe} autoComplete="bday" value={person.geburtsdatum} onChange={(e) => setPerson({ ...person, geburtsdatum: e.target.value })} /></Feld>
              <Feld id="k-gebort" label="Geburtsort" pflicht><input id="k-gebort" className={eingabe} value={person.geburtsort} onChange={(e) => setPerson({ ...person, geburtsort: e.target.value })} /></Feld>
              <Feld id="k-staat" label="Staatsangehörigkeit" pflicht><LandAuswahl id="k-staat" value={person.staatsangehoerigkeit} onChange={(w) => setPerson({ ...person, staatsangehoerigkeit: w })} /></Feld>
              <div className="hidden sm:block" />
              <Feld id="k-str" label="Straße und Hausnummer" pflicht className="sm:col-span-2"><input id="k-str" className={eingabe} autoComplete="street-address" value={person.adresse.strasse} onChange={(e) => setPerson({ ...person, adresse: { ...person.adresse, strasse: e.target.value } })} /></Feld>
              <Feld id="k-plz" label="PLZ" pflicht><input id="k-plz" className={eingabe} autoComplete="postal-code" inputMode="numeric" value={person.adresse.plz} onChange={(e) => setPerson({ ...person, adresse: { ...person.adresse, plz: e.target.value } })} /></Feld>
              <Feld id="k-ort" label="Ort" pflicht><input id="k-ort" className={eingabe} autoComplete="address-level2" value={person.adresse.ort} onChange={(e) => setPerson({ ...person, adresse: { ...person.adresse, ort: e.target.value } })} /></Feld>
              <Feld id="k-land" label="Land (Wohnsitz)" pflicht><LandAuswahl id="k-land" value={person.adresse.land} onChange={(w) => setPerson({ ...person, adresse: { ...person.adresse, land: w } })} /></Feld>
            </fieldset>
            <h3 className="mt-6 font-display text-[15px] font-bold text-ink-900">Ausweisdokument</h3>
            <fieldset disabled={!bearbeitbar} className="mt-3 grid gap-4 sm:grid-cols-2">
              <Feld id="k-art" label="Art" pflicht>
                <select id="k-art" className={auswahlfeld} value={person.ausweis.art} onChange={(e) => setPerson({ ...person, ausweis: { ...person.ausweis, art: e.target.value } })}>
                  <option value="personalausweis">Personalausweis / Identitätskarte</option>
                  <option value="reisepass">Reisepass</option>
                  <option value="aufenthaltstitel">Aufenthaltstitel mit Lichtbild</option>
                </select>
              </Feld>
              <Feld id="k-nr" label="Ausweisnummer" pflicht hinweis="Die Nummer ist nach dem Geldwäschegesetz aufzuzeichnen (nicht die Zugangsnummer/CAN)."><input id="k-nr" className={eingabe} autoComplete="off" value={person.ausweis.nummer} onChange={(e) => setPerson({ ...person, ausweis: { ...person.ausweis, nummer: e.target.value } })} /></Feld>
              <Feld id="k-beh" label="Ausstellende Behörde" pflicht><input id="k-beh" className={eingabe} value={person.ausweis.behoerde} onChange={(e) => setPerson({ ...person, ausweis: { ...person.ausweis, behoerde: e.target.value } })} /></Feld>
              <Feld id="k-gb" label="Gültig bis" pflicht hinweis="Wir erinnern Sie rechtzeitig vor dem Ablauf."><input id="k-gb" type="date" className={eingabe} value={person.ausweis.gueltigBis} onChange={(e) => setPerson({ ...person, ausweis: { ...person.ausweis, gueltigBis: e.target.value } })} /></Feld>
            </fieldset>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {zurueck}
              {bearbeitbar && <Button onClick={() => speichern("person", person)} disabled={laeuft} pfeil>Speichern und weiter</Button>}
            </div>
          </Karte>
        )}

        {schritt === "ausweis" && (
          <Karte titel="Ausweis hochladen" untertitel="PDF, JPG oder PNG, höchstens 10 MB je Datei. Ihre Dateien werden verschlüsselt gespeichert.">
            <Hinweis ton="info" titel="Bitte vor dem Hochladen schwärzen" className="mb-4">{KYC_SCHWAERZEN_HINWEIS}</Hinweis>
            <div className="space-y-3">
              {person.ausweis.art === "reisepass" ? (
                <Unterlage art="pass_datenseite" label={KYC_DOKUMENTE.pass_datenseite.label} dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
              ) : (
                <>
                  <Unterlage art="ausweis_vorne" label={KYC_DOKUMENTE.ausweis_vorne.label} hinweis="Zugangsnummer (CAN) schwärzen." dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
                  <Unterlage art="ausweis_hinten" label={KYC_DOKUMENTE.ausweis_hinten.label} hinweis="Anschrift und ausstellende Behörde müssen lesbar sein." dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
                </>
              )}
              <Unterlage art="selfie" label={KYC_DOKUMENTE.selfie.label} pflicht={false} hinweis="Hilft beim Abgleich mit dem Ausweisfoto. Eine Video- oder Online-Identifizierung erfolgt – falls nötig – nur über einen zugelassenen Anbieter." dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {zurueck}
              <Button onClick={() => setSchritt(naechster)} pfeil>Weiter</Button>
            </div>
          </Karte>
        )}

        {schritt === "firma" && (
          <Karte titel="Angaben zum Unternehmen" untertitel={`${reg.firma} · ${reg.nummer}`}>
            <fieldset disabled={!bearbeitbar} className="grid gap-4 sm:grid-cols-2">
              <Feld id="f-name" label="Firma (laut Register)" pflicht className="sm:col-span-2"><input id="f-name" className={eingabe} autoComplete="organization" value={firma.name} onChange={(e) => setFirma({ ...firma, name: e.target.value })} /></Feld>
              <Feld id="f-rf" label="Rechtsform" pflicht><input id="f-rf" className={eingabe} placeholder="z. B. GmbH, GmbH & Co. KG, AG, eG" value={firma.rechtsform} onChange={(e) => setFirma({ ...firma, rechtsform: e.target.value })} /></Feld>
              <Feld id="f-land" label="Sitzstaat" pflicht>
                <select id="f-land" className={auswahlfeld} value={firma.land} onChange={(e) => setFirma({ ...firma, land: e.target.value })}>
                  <option value="DE">Deutschland</option><option value="AT">Österreich</option><option value="CH">Schweiz</option>
                  {LAENDER_OPTIONEN.filter(([k]) => !["DE", "AT", "CH"].includes(k)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Feld>
              <Feld id="f-reg" label="Registernummer" pflicht><input id="f-reg" className={eingabe} placeholder={reg.nummer} value={firma.registernummer} onChange={(e) => setFirma({ ...firma, registernummer: e.target.value })} /></Feld>
              <Feld id="f-gericht" label="Registergericht / Behörde"><input id="f-gericht" className={eingabe} value={firma.registergericht} onChange={(e) => setFirma({ ...firma, registergericht: e.target.value })} /></Feld>
              <Feld id="f-sitz" label="Anschrift des Sitzes" pflicht className="sm:col-span-2"><input id="f-sitz" className={eingabe} value={firma.sitz} onChange={(e) => setFirma({ ...firma, sitz: e.target.value })} /></Feld>
            </fieldset>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Struktur">
              <Chip name="mehrstufig" value="1" checked={!!firma.mehrstufig} onChange={(e) => bearbeitbar && setFirma({ ...firma, mehrstufig: e.target.checked })}>Mehrstufige Beteiligungsstruktur</Chip>
              <Chip name="treuhand" value="1" checked={!!firma.treuhand} onChange={(e) => bearbeitbar && setFirma({ ...firma, treuhand: e.target.checked })}>Treuhand / Stiftung beteiligt</Chip>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Vertretungsberechtigung">
              <Chip type="radio" name="vertretung" value="ja" checked={vertretung === true} onChange={() => bearbeitbar && setVertretung(true)}>Ich bin vertretungsberechtigt</Chip>
              <Chip type="radio" name="vertretung" value="nein" checked={vertretung === false} onChange={() => bearbeitbar && setVertretung(false)}>Ich handle mit Vollmacht</Chip>
            </div>
            <div className="mt-5 space-y-3">
              <Unterlage art="registerauszug" label={`${reg.firma} – Auszug`} hinweis="Nicht älter als 3 Monate (aktueller oder chronologischer Ausdruck)." mitDatum dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
              <Unterlage art="transparenzregister" label={reg.ubo} hinweis="Nachweis der wirtschaftlich Berechtigten." dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
              <Unterlage art="gesellschafterliste" label={KYC_DOKUMENTE.gesellschafterliste.label} pflicht={false} dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
              <Unterlage art="satzung" label={KYC_DOKUMENTE.satzung.label} pflicht={false} dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
              {vertretung === false && <Unterlage art="vollmacht" label={KYC_DOKUMENTE.vollmacht.label} hinweis="Unterzeichnet von vertretungsberechtigten Personen." dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />}
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {zurueck}
              {bearbeitbar && <Button onClick={() => speichern("firma", { ...firma, einreicherVertretungsberechtigt: vertretung })} disabled={laeuft} pfeil>Speichern und weiter</Button>}
            </div>
          </Karte>
        )}

        {schritt === "berechtigte" && (
          <Karte titel="Wirtschaftlich Berechtigte und Vertretung" untertitel="Wer mehr als 25 % der Anteile oder Stimmrechte hält oder auf andere Weise Kontrolle ausübt.">
            <PersonenListe
              titel="Berechtigte Person" liste={ubos} setListe={setUbos} bearbeitbar={bearbeitbar}
              neu={() => neueZeile({ staatsangehoerigkeit: "DE", wohnsitzland: "DE", anteil: "", kontrolleArt: "anteil", pep: false })}
              felder={(p, setze) => (
                <>
                  <Feld id={`${p.id}-w`} label="Wohnsitzland" pflicht><LandAuswahl id={`${p.id}-w`} value={p.wohnsitzland} onChange={(w) => setze("wohnsitzland", w)} /></Feld>
                  <Feld id={`${p.id}-s`} label="Staatsangehörigkeit"><LandAuswahl id={`${p.id}-s`} value={p.staatsangehoerigkeit} onChange={(w) => setze("staatsangehoerigkeit", w)} /></Feld>
                  <Feld id={`${p.id}-k`} label="Art der Kontrolle" pflicht>
                    <select id={`${p.id}-k`} className={auswahlfeld} value={p.kontrolleArt} onChange={(e) => setze("kontrolleArt", e.target.value)}>
                      {Object.entries(KYC_KONTROLLE_ARTEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Feld>
                  <Feld id={`${p.id}-a`} label="Anteil in %"><input id={`${p.id}-a`} className={eingabe} inputMode="decimal" value={p.anteil ?? ""} onChange={(e) => setze("anteil", e.target.value.replace(",", "."))} /></Feld>
                  <label className="flex items-center gap-2 self-end pb-3 text-[14px] text-ink-700">
                    <input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!p.pep} onChange={(e) => setze("pep", e.target.checked)} /> politisch exponiert (PEP)
                  </label>
                </>
              )}
            />
            <h3 className="mt-7 font-display text-[15px] font-bold text-ink-900">Vertretungsberechtigte Personen</h3>
            <p className="mt-1 text-[13.5px] text-ink-600">Geschäftsführung bzw. Vorstand; je Person ein Ausweis. Für Sie selbst genügt der Ausweis aus Schritt „Ausweis“.</p>
            <div className="mt-3">
              <PersonenListe
                titel="Vertreter" liste={vertreter} setListe={setVertreter} bearbeitbar={bearbeitbar}
                neu={() => neueZeile({ funktion: "", istEinreicher: false })}
                felder={(p, setze) => (
                  <>
                    <Feld id={`${p.id}-f`} label="Funktion" pflicht><input id={`${p.id}-f`} className={eingabe} placeholder="z. B. Geschäftsführer" value={p.funktion} onChange={(e) => setze("funktion", e.target.value)} /></Feld>
                    <label className="flex items-center gap-2 self-end pb-3 text-[14px] text-ink-700">
                      <input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!p.istEinreicher} onChange={(e) => setze("istEinreicher", e.target.checked)} /> das bin ich
                    </label>
                  </>
                )}
              />
            </div>
            {(fall?.vertreter || []).filter((x) => !x.istEinreicher).length > 0 && (
              <div className="mt-5 space-y-3">
                {(fall?.vertreter || []).filter((x) => !x.istEinreicher).map((x) => (
                  <Unterlage key={x.id} art="vertreter_ausweis" label={`Ausweis ${[x.vorname, x.nachname].filter(Boolean).join(" ")}`} hinweis="Zugangsnummer (CAN) schwärzen." felder={{ personId: x.id }} dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {zurueck}
              {bearbeitbar && <Button onClick={() => mehrfachSpeichern([["ubos", { liste: ubos }], ["vertreter", { liste: vertreter }]])} disabled={laeuft} pfeil>Speichern und weiter</Button>}
            </div>
          </Karte>
        )}

        {schritt === "erklaerungen" && (
          <Karte titel="Erklärungen" untertitel="Selbstauskunft zu politisch exponierten Personen, Herkunft der Mittel und steuerlicher Ansässigkeit.">
            <fieldset disabled={!bearbeitbar} className="space-y-5">
              <div>
                <p className="text-[14.5px] font-semibold text-ink-900">Üben Sie ein hochrangiges öffentliches Amt aus oder haben Sie es in den letzten zwölf Monaten ausgeübt (z. B. Minister, Abgeordneter, Richter an einem obersten Gericht, Botschafter, Mitglied der Leitung einer Zentralbank oder eines Staatsunternehmens)? *</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Politisch exponierte Person">
                  <Chip type="radio" name="pep" value="nein" checked={pep.istPep === false} onChange={() => setPep({ ...pep, istPep: false })}>Nein</Chip>
                  <Chip type="radio" name="pep" value="ja" checked={pep.istPep === true} onChange={() => setPep({ ...pep, istPep: true })}>Ja</Chip>
                </div>
              </div>
              <div>
                <p className="text-[14.5px] font-semibold text-ink-900">Sind Sie Familienangehöriger einer solchen Person oder ihr bekanntermaßen nahestehend? *</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Nahestehende Person">
                  <Chip type="radio" name="nahe" value="nein" checked={pep.naheStehend === false} onChange={() => setPep({ ...pep, naheStehend: false })}>Nein</Chip>
                  <Chip type="radio" name="nahe" value="ja" checked={pep.naheStehend === true} onChange={() => setPep({ ...pep, naheStehend: true })}>Ja</Chip>
                </div>
              </div>
              {(pep.istPep || pep.naheStehend) && (
                <Feld id="pep-f" label="Amt bzw. Beziehung" pflicht hinweis="In diesem Fall gelten verstärkte Sorgfaltspflichten – wir melden uns ggf. mit Rückfragen."><input id="pep-f" className={eingabe} value={pep.funktion || ""} onChange={(e) => setPep({ ...pep, funktion: e.target.value })} /></Feld>
              )}
              {investor && (
                <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200">
                  <p className="text-[14.5px] font-semibold text-ink-900">Geplante Ticketgröße und Herkunft der Mittel *</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Ticketgröße">
                    {Object.entries(KYC_TICKETS).map(([k, t]) => <Chip key={k} type="radio" name="ticket" value={k} checked={mittel.ticket === k} onChange={() => setMittel({ ...mittel, ticket: k })}>{t.label}</Chip>)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Herkunft der Mittel">
                    {Object.entries(KYC_MITTEL_QUELLEN).map(([k, l]) => (
                      <Chip key={k} name="quellen" value={k} checked={(mittel.quellen || []).includes(k)} onChange={(e) => setMittel({ ...mittel, quellen: e.target.checked ? [...(mittel.quellen || []), k] : (mittel.quellen || []).filter((x) => x !== k) })}>{l}</Chip>
                    ))}
                  </div>
                  <Feld id="m-text" label="Erläuterung (optional)" className="mt-3"><textarea id="m-text" className={textbereich} value={mittel.text || ""} onChange={(e) => setMittel({ ...mittel, text: e.target.value })} /></Feld>
                  {(KYC_TICKETS[mittel.ticket]?.betrag || 0) >= 1000000 && (
                    <div className="mt-3"><Unterlage art="mittelherkunft" label={KYC_DOKUMENTE.mittelherkunft.label} hinweis="Ab 1 Mio. € (z. B. Bestätigung der Bank, Jahresabschluss, Kaufvertrag)." dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} /></div>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Feld id="st-land" label="Steuerliche Ansässigkeit (optional)"><LandAuswahl id="st-land" value={steuer.land} onChange={(w) => setSteuer({ ...steuer, land: w })} leer="keine Angabe" /></Feld>
                <Feld id="st-id" label="Steuer-ID / UID (optional)"><input id="st-id" className={eingabe} value={steuer.steuerId || ""} onChange={(e) => setSteuer({ ...steuer, steuerId: e.target.value })} /></Feld>
              </div>
            </fieldset>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {zurueck}
              {bearbeitbar && <Button onClick={() => mehrfachSpeichern([["pep", pep], ...(investor ? [["mittelherkunft", mittel]] : []), ["steuer", steuer]])} disabled={laeuft} pfeil>Speichern und weiter</Button>}
            </div>
          </Karte>
        )}

        {schritt === "auszahlung" && (
          <Karte titel="Auszahlung und Eigentum" untertitel="Für Pachtzahlungen und Gutschriften: Konto auf Ihren Namen bzw. Ihre Firma und je Fläche ein Eigentumsnachweis.">
            <fieldset disabled={!bearbeitbar} className="grid gap-4 sm:grid-cols-2">
              <Feld id="b-iban" label="IBAN" className="sm:col-span-2" fehler={ibanInfo && !ibanInfo.ok ? ibanInfo.fehler : ""} hinweis={ibanInfo?.ok ? "Prüfziffer korrekt." : "Wir prüfen die Prüfziffer automatisch."}>
                <input id="b-iban" className={cn(eingabe, "font-mono tracking-wide")} autoComplete="off" inputMode="text" value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value.toUpperCase() })} placeholder="DE00 0000 0000 0000 0000 00" />
              </Feld>
              <Feld id="b-inh" label="Kontoinhaber" pflicht hinweis="Muss mit der verifizierten Person bzw. Firma übereinstimmen."><input id="b-inh" className={eingabe} value={bank.kontoinhaber} onChange={(e) => setBank({ ...bank, kontoinhaber: e.target.value })} /></Feld>
              <Feld id="b-bic" label="BIC (optional)"><input id="b-bic" className={eingabe} value={bank.bic || ""} onChange={(e) => setBank({ ...bank, bic: e.target.value.toUpperCase() })} /></Feld>
            </fieldset>
            <div className="mt-5 space-y-3">
              {(daten.flaechen || []).length === 0 && <p className="text-[14px] text-ink-500">Sobald Sie eine Fläche angelegt haben, laden Sie hier den Eigentumsnachweis hoch.</p>}
              {(daten.flaechen || []).map((f) => (
                <Unterlage key={f.id} art="eigentumsnachweis" label={`Eigentumsnachweis: ${f.bezeichnung}`} hinweis={`${(KYC_REGISTER[f.land] || KYC_REGISTER.DE).grundbuch}. Nicht benötigte Abteilungen dürfen Sie schwärzen.`} pflicht={false} felder={{ flaecheId: f.id }} dokumente={dokumente} bearbeitbar={bearbeitbar} onGeaendert={neuLaden} />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              {zurueck}
              {bearbeitbar && <Button icon={Landmark} onClick={() => (bank.iban ? speichern("bank", bank) : setSchritt(naechster))} disabled={laeuft || (ibanInfo && !ibanInfo.ok)}>Speichern und weiter</Button>}
            </div>
          </Karte>
        )}

        {schritt === "einreichen" && (
          <Karte titel={fall?.status === "verifiziert" ? "Ihre Verifizierung" : "Prüfen und einreichen"} untertitel="Überblick über alle Angaben und Unterlagen.">
            <ul className="divide-y divide-ink-100">
              {(daten.anforderungen || []).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  {a.erfuellt ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ov-600" /> : <CircleDashed aria-hidden="true" className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", a.pflicht ? "text-sun-500" : "text-ink-300")} />}
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink-900">{a.label}{!a.pflicht && <span className="text-ink-500"> · optional</span>}</p>
                    {a.hinweis && !a.erfuellt && <p className="text-[12.5px] text-ink-500">{a.hinweis}</p>}
                  </div>
                  <span className="ml-auto shrink-0 text-[12px] text-ink-400">{a.gruppe}</span>
                </li>
              ))}
            </ul>
            {bearbeitbar && (
              <div className="mt-6 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-sand-100">
                <p className="text-[13.5px] leading-relaxed text-ink-700">
                  Mit dem Einreichen bestätigen Sie, dass Ihre Angaben richtig und vollständig sind und dass Sie im eigenen Namen bzw. für das angegebene Unternehmen handeln. Änderungen (z. B. neue wirtschaftlich Berechtigte) teilen Sie uns bitte unverzüglich mit.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button icon={Send} onClick={einreichen} disabled={laeuft || fehlend.length > 0}>Zur Prüfung einreichen</Button>
                  {fehlend.length > 0 && <span className="text-[13px] text-ink-600">Noch {fehlend.length} Pflichtpunkt{fehlend.length === 1 ? "" : "e"} offen.</span>}
                </div>
              </div>
            )}
          </Karte>
        )}
      </div>

      {/* Seitenspalte: Status, Fortschritt, fehlende Unterlagen, Wofür */}
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start" aria-label="Stand der Verifizierung">
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[16px] font-bold text-ink-900">Stand</p>
            <KycStatusBadge status={fall?.status || null} />
          </div>
          <Fortschritt className="mt-4" quote={daten.fortschritt?.quote || 0} text={`${daten.fortschritt?.erfuellt || 0} von ${daten.fortschritt?.gesamt || 0} Pflichtpunkten`} />
          {fehlend.length > 0 && bearbeitbar && (
            <div className="mt-4">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Es fehlen noch</p>
              <ul className="mt-2 space-y-1.5">
                {fehlend.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex gap-2 text-[13.5px] leading-snug text-ink-700"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" />{a.label}</li>
                ))}
              </ul>
            </div>
          )}
          {fall?.person?.ausweis?.gueltigBis && <p className="mt-4 text-[12.5px] text-ink-500">Ausweis gültig bis {datum(fall.person.ausweis.gueltigBis)}</p>}
        </div>
        <div className="rounded-3xl bg-navy-950 p-5 text-white ring-1 ring-navy-800">
          <p className="font-display text-[15px] font-bold">Wofür die Verifizierung nötig ist</p>
          <ul className="mt-3 space-y-2">
            {Object.entries(daten.freigaben || {}).map(([k, f]) => (
              <li key={k} className="flex items-start gap-2 text-[13.5px] text-white/80">
                {fall?.status === "verifiziert" ? <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> : <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />}
                <span>{f.label}{f.aktiv && fall?.status !== "verifiziert" ? <span className="text-sun-300"> · derzeit gesperrt</span> : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-relaxed text-white/55">Unterlagen liegen verschlüsselt vor; Einsicht nur durch Sie und unsere Compliance, jeder Zugriff wird protokolliert. Aufbewahrung nach Geldwäscherecht in der Regel 5 Jahre nach Ende der Geschäftsbeziehung.</p>
        </div>
      </aside>
    </div>
  );
}

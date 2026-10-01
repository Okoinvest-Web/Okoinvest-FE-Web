"use client";

// Beitritt online (WP6, Fachkonzept 2.4; Marktanalyse P0 Nr. 2 „Online-Beitritt in unter 5 Minuten“): Zählpunkte mit
// Eignungscheck → Angaben → Zahlung → Verträge → Unterschrift → Weiterleitung in die Zustimmung beim Netzbetreiber.
// Dieselben Regeln wie im Backend (eg/interesse.js eignungPruefen, beitrittBereinigen); verbindlich prüft der Server.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock, FileSignature, Loader2, Lock, Plus, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import ErfolgsHaken from "@/components/ui/ErfolgsHaken";
import { signal } from "@/components/ui/motion";
import { senden } from "@/lib/plattform/client";
import { BEITRITT_DOKUMENTE, beitrittBereinigen, eignungPruefen } from "@/lib/plattform/eg/interesse";
import { ibanPruefen } from "@/lib/plattform/kyc";
import { EG_MODELLE, MITGLIED_ARTEN, RECHNUNGSWEGE, SMART_METER, STEUERSTATUS_ERZEUGER } from "@/lib/plattform/eg/modell";
import { AnleitungSchritte, Schrittfolge } from "./Teile";
import { ct, eur } from "./format";

const feld = "h-12 w-full rounded-2xl border-0 bg-white px-4 text-[16px] text-ink-900 ring-1 ring-inset ring-ink-200 transition-shadow placeholder:text-ink-400 focus:ring-2 focus:ring-ov-500 md:text-[15px]";
const SCHRITTE = [
  { id: "zaehlpunkte", label: "Zählpunkte", min: 2 },
  { id: "angaben", label: "Ihre Angaben", min: 1 },
  { id: "zahlung", label: "Zahlung", min: 1 },
  { id: "vertraege", label: "Verträge", min: 1 },
  { id: "unterschrift", label: "Unterschrift", min: 0.5 },
];
const leerZp = () => ({ zaehlpunktnummer: "", richtung: "verbrauch", smartMeter: "ja", teilnahmefaktor: 100, kwp: "", fremdTf: 0, bezeichnung: "" });

export default function BeitrittAssistent({ gemeinschaft, netzbetreiber = [], vorbelegung = {} }) {
  const g = gemeinschaft;
  const [schritt, setSchritt] = useState(0);
  const [zps, setZps] = useState([leerZp()]);
  const [art, setArt] = useState(vorbelegung.art || "privat");
  const [person, setPerson] = useState({ vorname: vorbelegung.vorname || "", nachname: vorbelegung.nachname || "", firma: vorbelegung.firma || "", strasse: "", plz: vorbelegung.plz || "", ort: "", telefon: vorbelegung.telefon || "" });
  const [steuer, setSteuer] = useState({ steuerstatusErzeuger: art === "landwirt" ? "pauschalierter_landwirt" : "kleinunternehmer", uid: "", mitarbeiter: "" });
  const [iban, setIban] = useState("");
  const [rechnungsweg, setRechnungsweg] = useState("portal");
  const [zustimmungen, setZustimmungen] = useState({});
  const [unterschrift, setUnterschrift] = useState({ name: "", bestaetigt: false });
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [richtung, setRichtung] = useState("vor");
  const fehlerRef = useRef(null);
  const formRef = useRef(null);
  const ersterLauf = useRef(true);
  // Nach jedem Schrittwechsel Fokus auf die neue Überschrift (Screenreader, Tastatur); Fehler kurz schütteln.
  useEffect(() => {
    if (ersterLauf.current) { ersterLauf.current = false; return; }
    const form = formRef.current;
    form?.querySelector("[data-schritt-kopf]")?.focus({ preventScroll: true });
    if (form && form.getBoundingClientRect().top < 0) form.scrollIntoView({ block: "start" });
  }, [schritt]);
  useEffect(() => {
    if (fehler && fehlerRef.current) signal(fehlerRef.current, "schuetteln");
  }, [fehler]);

  const erzeugung = zps.some((z) => z.richtung === "erzeugung");
  const firma = ["kmu", "grossunternehmen", "gemeinde", "oeffentlich", "verein"].includes(art);
  const eignung = useMemo(() => zps.map((z) => (z.zaehlpunktnummer.replace(/\s/g, "").length >= 10 ? eignungPruefen({ ...z, art }, { gemeinschaft: g, netzbetreiber }) : null)), [zps, art, g, netzbetreiber]);
  const daten = {
    art, person, steuerstatusErzeuger: steuer.steuerstatusErzeuger, uid: steuer.uid, iban, rechnungsweg,
    unternehmensgroesse: { mitarbeiter: steuer.mitarbeiter },
    zaehlpunkte: zps.map((z) => ({ ...z, teilnahmefaktor: Number(z.teilnahmefaktor), fremdTf: Number(z.fremdTf) || 0, fremdAnzahl: Number(z.fremdTf) > 0 ? 1 : 0, kwp: z.kwp })),
    zustimmungen, unterschrift,
  };
  // Live-Hinweis zur IBAN (nur Anzeige ab 15 Zeichen; verbindlich prüft der Server)
  const ibanRoh = iban.replace(/\s/g, "");
  const ibanStatus = ibanRoh.length >= 15 ? ibanPruefen(ibanRoh) : null;
  const dokumente = BEITRITT_DOKUMENTE.filter((d) => d.nurMit !== "iban" || iban.replace(/\s/g, ""));

  function pruefeSchritt(i) {
    const id = SCHRITTE[i].id;
    if (id === "zaehlpunkte") {
      if (!zps.length) return "Bitte geben Sie mindestens einen Zählpunkt an.";
      const nein = eignung.map((e, k) => (e ? e.punkte.find((p) => p.ok === false) && { k, p: e.punkte.find((p) => p.ok === false) } : { k, p: { text: "Bitte die Zählpunktnummer (33 Zeichen) eingeben." } })).find(Boolean);
      if (nein) return `Zählpunkt ${nein.k + 1}: ${nein.p.text}`;
    }
    if (id === "angaben") {
      if (!(firma ? person.firma : person.nachname)) return firma ? "Bitte den Namen der Organisation angeben." : "Bitte Ihren Nachnamen angeben.";
      if (!person.strasse || !/^\d{4}$/.test(person.plz) || !person.ort) return "Bitte die Anschrift vollständig angeben (Straße, vierstellige PLZ, Ort).";
      if (erzeugung && STEUERSTATUS_ERZEUGER[steuer.steuerstatusErzeuger]?.uidPflicht && !/^ATU\d{8}$/i.test(steuer.uid.replace(/\s/g, ""))) return "Für diesen Steuerstatus ist die UID-Nummer Pflicht (ATU + 8 Ziffern).";
    }
    if (id === "vertraege") {
      const offen = dokumente.find((d) => d.pflicht && !zustimmungen[d.id]);
      if (offen) return `Bitte bestätigen Sie: ${offen.titel}.`;
    }
    return "";
  }
  function weiter() {
    const f = pruefeSchritt(schritt);
    setFehler(f);
    if (!f) { setRichtung("vor"); setSchritt((s) => Math.min(SCHRITTE.length - 1, s + 1)); }
  }
  async function absenden(e) {
    e.preventDefault();
    setFehler("");
    try {
      beitrittBereinigen(daten, { gemeinschaft: g, netzbetreiber });
    } catch (x) {
      setFehler(x.message);
      return;
    }
    setLaeuft(true);
    try {
      setErgebnis(await senden(`/api/portal/eg/${g.id}/beitritt`, { body: { daten } }));
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  if (ergebnis) return <Erfolg ergebnis={ergebnis} gemeinschaft={g} />;

  return (
    <form ref={formRef} onSubmit={absenden} className="relative scroll-mt-24 overflow-hidden rounded-[2rem] bg-white shadow-e3 ring-1 ring-ink-200/70" noValidate>
      <div className="border-b border-ink-100 bg-sand-50 px-4 pb-4 pt-4 md:px-8 md:pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          <p className="font-semibold text-ink-700">Schritt {schritt + 1} von {SCHRITTE.length} · <span className="text-ov-700">{SCHRITTE[schritt].label}</span></p>
          <p className="flex items-center gap-1.5 text-ink-500"><Clock aria-hidden="true" className="h-3.5 w-3.5" />noch ca. {Math.max(1, Math.round(SCHRITTE.slice(schritt).reduce((x, y) => x + y.min, 0)))} Min.</p>
        </div>
        <ol className="flex items-start" aria-label="Schritte des Beitritts">
          {SCHRITTE.map((st, i) => {
            const fertig = i < schritt;
            const jetzt = i === schritt;
            return (
              <li key={st.id} aria-current={jetzt ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center">
                {i > 0 && (
                  <span aria-hidden="true" className="absolute right-1/2 top-[15px] h-0.5 w-full overflow-hidden rounded-full bg-ink-200">
                    <span className={cn("block h-full origin-left rounded-full bg-ov-500 transition-transform duration-500 ease-ov-out", i <= schritt ? "scale-x-100" : "scale-x-0")} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { if (i < schritt) { setFehler(""); setRichtung("zurueck"); setSchritt(i); } }}
                  disabled={i > schritt}
                  aria-label={`${i + 1}. ${st.label}${fertig ? " – erledigt, zurückspringen" : jetzt ? " – aktueller Schritt" : ""}`}
                  className="group relative z-10 flex flex-col items-center gap-1.5 rounded-xl px-1 outline-none focus-visible:ring-2 focus-visible:ring-ov-500 disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-transform duration-300 ease-ov-out",
                      fertig && "bg-ov-600 text-white group-hover:scale-105",
                      jetzt && "scale-110 bg-white text-ov-700 shadow-e2 ring-2 ring-ov-500",
                      !fertig && !jetzt && "bg-white text-ink-500 ring-1 ring-inset ring-ink-200"
                    )}
                  >
                    {fertig ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("hidden text-center text-[12.5px] leading-tight sm:block", jetzt ? "font-semibold text-ink-900" : fertig ? "text-ink-700" : "text-ink-500")}>{st.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div key={schritt} className={cn("space-y-6 p-5 md:p-8", richtung === "vor" ? "ov-step-vor" : "ov-step-zurueck")}>
        {SCHRITTE[schritt].id === "zaehlpunkte" && (
          <>
            <Kopf titel="Welche Zählpunkte bringen Sie ein?" text="Die 33-stellige Zählpunktnummer steht auf Ihrer Netzrechnung (beginnt mit AT). Für eine PV-Anlage mit Überschusseinspeisung haben Sie meist zwei: Verbrauch und Erzeugung." />
            <ul className="space-y-4">
              {zps.map((z, i) => (
                <li key={i} className="animate-ov-einblenden rounded-3xl bg-sand-50 p-4 ring-1 ring-sand-200 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">Zählpunkt {i + 1}</p>
                    {zps.length > 1 && <button type="button" onClick={() => setZps((l) => l.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 hover:text-ink-800"><Trash2 aria-hidden="true" className="h-4 w-4" /> Entfernen</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
                    <Feld label="Zählpunktnummer"><input value={z.zaehlpunktnummer} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, zaehlpunktnummer: e.target.value.toUpperCase() } : x)))} className={cn(feld, "font-mono tracking-wide md:text-[14px]")} placeholder="AT00…" autoComplete="off" spellCheck={false} aria-describedby={`eg-zp-zaehler-${i}`} /><ZpZaehler id={`eg-zp-zaehler-${i}`} wert={z.zaehlpunktnummer} /></Feld>
                    <Wahl label="Richtung" wert={z.richtung} optionen={{ verbrauch: "Verbrauch", erzeugung: "Erzeugung" }} onChange={(v) => setZps((l) => l.map((x, k) => (k === i ? { ...x, richtung: v } : x)))} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Feld label="Smart Meter"><select value={z.smartMeter} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, smartMeter: e.target.value } : x)))} className={feld}>{Object.entries(SMART_METER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
                    <Feld label={`Teilnahmefaktor: ${z.teilnahmefaktor} %`} hilfe="Anteil dieses Zählpunkts für diese Gemeinschaft"><input type="range" min={1} max={100} value={z.teilnahmefaktor} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, teilnahmefaktor: e.target.value } : x)))} className="ov-range mt-3 w-full" /></Feld>
                    {z.richtung === "erzeugung" ? (
                      <Feld label="Anlagenleistung (kWp)"><input inputMode="decimal" value={z.kwp} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, kwp: e.target.value } : x)))} className={feld} placeholder="z. B. 9,9" /></Feld>
                    ) : (
                      <Feld label="Bezeichnung (optional)"><input value={z.bezeichnung} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, bezeichnung: e.target.value } : x)))} className={feld} placeholder="z. B. Wohnung" /></Feld>
                    )}
                  </div>
                  <details className="mt-3 text-[13.5px] text-ink-600">
                    <summary className="cursor-pointer font-semibold text-ink-700">Schon in einer anderen Gemeinschaft?</summary>
                    <div className="mt-2 max-w-xs"><Feld label="Teilnahmefaktor dort in Summe (%)" hilfe="Ein Zählpunkt darf in bis zu fünf Gemeinschaften sein, zusammen höchstens 100 %."><input type="number" min={0} max={99} value={z.fremdTf} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, fremdTf: e.target.value } : x)))} className={feld} /></Feld></div>
                  </details>
                  {eignung[i] && <Eignung e={eignung[i]} />}
                </li>
              ))}
            </ul>
            {zps.length < 10 && <button type="button" onClick={() => setZps((l) => [...l, { ...leerZp(), richtung: l.some((x) => x.richtung === "erzeugung") ? "verbrauch" : "erzeugung" }])} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><Plus aria-hidden="true" className="h-4 w-4" /> Weiteren Zählpunkt hinzufügen</button>}
          </>
        )}

        {SCHRITTE[schritt].id === "angaben" && (
          <>
            <Kopf titel="Als wer treten Sie bei?" text={g.modell === "eeg" ? "In einer Erneuerbare-Energie-Gemeinschaft dürfen Privatpersonen, Landwirte, KMU, Gemeinden und Vereine Mitglied sein – Großunternehmen nicht." : "Die Mitgliedsart bestimmt Verträge und steuerliche Behandlung."} />
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(MITGLIED_ARTEN).filter(([k]) => k !== "grossunternehmen" || g.modell !== "eeg").map(([k, a]) => (
                <label key={k} className={cn("cursor-pointer rounded-2xl px-3.5 py-3 text-[14px] font-semibold ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", art === k ? "bg-ov-50 text-ink-900 ring-ov-400" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}>
                  <input type="radio" name="eg-art" value={k} checked={art === k} onChange={() => { setArt(k); if (k === "landwirt") setSteuer((s) => ({ ...s, steuerstatusErzeuger: "pauschalierter_landwirt" })); if (k === "gemeinde") setSteuer((s) => ({ ...s, steuerstatusErzeuger: "gemeinde_bga" })); }} className="sr-only" />
                  {a.label}
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {firma ? <Feld label="Name der Organisation" breit><input value={person.firma} onChange={(e) => setPerson({ ...person, firma: e.target.value })} className={feld} autoComplete="organization" /></Feld> : (
                <>
                  <Feld label="Vorname"><input value={person.vorname} onChange={(e) => setPerson({ ...person, vorname: e.target.value })} className={feld} autoComplete="given-name" /></Feld>
                  <Feld label="Nachname"><input value={person.nachname} onChange={(e) => setPerson({ ...person, nachname: e.target.value })} className={feld} autoComplete="family-name" /></Feld>
                </>
              )}
              <Feld label="Straße und Hausnummer" breit><input value={person.strasse} onChange={(e) => setPerson({ ...person, strasse: e.target.value })} className={feld} autoComplete="street-address" /></Feld>
              <Feld label="PLZ"><input inputMode="numeric" maxLength={4} value={person.plz} onChange={(e) => setPerson({ ...person, plz: e.target.value.replace(/\D/g, "") })} className={feld} autoComplete="postal-code" /></Feld>
              <Feld label="Ort"><input value={person.ort} onChange={(e) => setPerson({ ...person, ort: e.target.value })} className={feld} autoComplete="address-level2" /></Feld>
              <Feld label="Telefon (optional, für Rückfragen)"><input value={person.telefon} onChange={(e) => setPerson({ ...person, telefon: e.target.value })} className={feld} autoComplete="tel" /></Feld>
              {art === "kmu" && <Feld label="Anzahl Mitarbeitende" hilfe="Ab 250 gilt ein Unternehmen als groß (ElWG § 6)."><input inputMode="numeric" value={steuer.mitarbeiter} onChange={(e) => setSteuer({ ...steuer, mitarbeiter: e.target.value })} className={feld} /></Feld>}
            </div>
            {erzeugung && (
              <div className="rounded-3xl bg-sand-50 p-4 ring-1 ring-ink-200/70 md:p-5">
                <p className="font-semibold text-ink-900">Steuerlicher Status als Erzeuger</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Bestimmt, wie die Gutschrift für Ihren eingebrachten Strom ausgestellt wird (z. B. 13 % bei pauschalierten Landwirten, Reverse Charge bei Unternehmen). Keine Steuerberatung – im Zweifel bitte nachfragen.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Feld label="Status"><select value={steuer.steuerstatusErzeuger} onChange={(e) => setSteuer({ ...steuer, steuerstatusErzeuger: e.target.value })} className={feld}>{Object.entries(STEUERSTATUS_ERZEUGER).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></Feld>
                  {STEUERSTATUS_ERZEUGER[steuer.steuerstatusErzeuger]?.uidPflicht && <Feld label="UID-Nummer"><input value={steuer.uid} onChange={(e) => setSteuer({ ...steuer, uid: e.target.value.toUpperCase() })} className={feld} placeholder="ATU12345678" /></Feld>}
                </div>
              </div>
            )}
          </>
        )}

        {SCHRITTE[schritt].id === "zahlung" && (
          <>
            <Kopf titel="Wie möchten Sie zahlen?" text="Mit einem SEPA-Lastschriftmandat bucht die Gemeinschaft Ihre Rechnungen automatisch ab – Gutschriften überweist sie auf dasselbe Konto. Ohne IBAN zahlen Sie per Überweisung." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld label="IBAN (optional)" breit hilfe="Ihre IBAN sehen nur Kassa und Betriebsführung; im Portal wird sie maskiert angezeigt."><input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} className={cn(feld, "font-mono tracking-wide", ibanStatus && !ibanStatus.ok && "ring-danger-300")} placeholder="AT.. .... .... .... ...." autoComplete="off" spellCheck={false} aria-invalid={ibanStatus ? !ibanStatus.ok : undefined} aria-describedby="eg-iban-status" />{ibanStatus && <span id="eg-iban-status" aria-live="polite" className={cn("mt-1.5 flex items-center gap-1.5 text-[13px]", ibanStatus.ok ? "text-ov-800" : "text-danger-700")}>{ibanStatus.ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <TriangleAlert aria-hidden="true" className="h-4 w-4" />}{ibanStatus.ok ? `Prüfziffer korrekt (${ibanStatus.land})` : ibanStatus.fehler}</span>}</Feld>
              <Wahl label="Belege erhalten per" wert={rechnungsweg} optionen={RECHNUNGSWEGE} onChange={setRechnungsweg} />
            </div>
          </>
        )}

        {SCHRITTE[schritt].id === "vertraege" && (
          <>
            <Kopf titel="Verträge und Preisblatt" text="Bitte lesen und bestätigen. Die vollständigen Fassungen erhalten Sie nach dem Absenden zusätzlich per E-Mail und im Portal." />
            <div className="ov-verlauf-nacht rounded-3xl p-5 text-white shadow-e2 md:p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Preisblatt {g.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Preis label="Bezug" wert={g.bezugspreisCt !== null ? `${ct(g.bezugspreisCt)}/kWh` : "folgt"} />
                <Preis label="Einspeisung" wert={g.einspeisepreisCt !== null ? `${ct(g.einspeisepreisCt)}/kWh` : "folgt"} />
                <Preis label="Mitgliedsbeitrag" wert={g.mitgliedsbeitragJahr ? `${eur(g.mitgliedsbeitragJahr)}/Jahr` : "keiner"} />
                <Preis label="Beitrittsgebühr" wert={g.einmalgebuehrBeitritt ? eur(g.einmalgebuehrBeitritt) : "keine"} />
              </dl>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/75">Preise netto. Netzentgelte und Abgaben rechnet weiterhin Ihr Netzbetreiber ab – die Reduktion für Gemeinschaftsstrom zieht er direkt ab. Ihren übrigen Strom liefert Ihr bisheriger Lieferant.</p>
            </div>
            <ul className="space-y-3">
              {dokumente.map((d) => (
                <li key={d.id}>
                  <label className={cn("flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 ring-inset transition-colors", zustimmungen[d.id] ? "bg-ov-50 ring-ov-300" : "bg-white ring-ink-200 hover:bg-ink-50")}>
                    <input type="checkbox" checked={!!zustimmungen[d.id]} onChange={(e) => setZustimmungen({ ...zustimmungen, [d.id]: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 text-ov-600 focus:ring-ov-500" />
                    <span className="min-w-0"><span className="block text-[14.5px] font-semibold text-ink-900">{d.titel}</span><span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-600">{d.text}</span></span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        {SCHRITTE[schritt].id === "unterschrift" && (
          <>
            <Kopf titel="Unterschreiben und absenden" text="Mit Ihrem Namen und der Bestätigung unterschreiben Sie den Beitrittsantrag elektronisch. Wir speichern Zeitpunkt und einen Prüfwert (Hash) als Nachweis." />
            <div className="rounded-3xl bg-sand-50 p-4 ring-1 ring-ink-200/70 md:p-5">
              <ul className="space-y-1.5 text-[14px] text-ink-700">
                <li><strong>{g.name}</strong> · {EG_MODELLE[g.modell]?.label}</li>
                <li>{firma ? person.firma : [person.vorname, person.nachname].filter(Boolean).join(" ")} · {person.strasse}, {person.plz} {person.ort}</li>
                {zps.map((z, i) => <li key={i}>{z.richtung === "erzeugung" ? "Erzeugung" : "Verbrauch"} …{z.zaehlpunktnummer.replace(/\s/g, "").slice(-6)} · Teilnahmefaktor {z.teilnahmefaktor} %</li>)}
                <li>{iban ? "SEPA-Lastschrift" : "Überweisung"} · Belege per {RECHNUNGSWEGE[rechnungsweg]}</li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld label="Vollständiger Name als Unterschrift" breit><input value={unterschrift.name} onChange={(e) => setUnterschrift({ ...unterschrift, name: e.target.value })} className={cn(feld, "font-display text-[18px] italic")} placeholder={firma ? person.firma : [person.vorname, person.nachname].filter(Boolean).join(" ")} autoComplete="name" /></Feld>
            </div>
            <label className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-700">
              <input type="checkbox" checked={unterschrift.bestaetigt} onChange={(e) => setUnterschrift({ ...unterschrift, bestaetigt: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 text-ov-600 focus:ring-ov-500" />
              Ich beantrage die Mitgliedschaft und unterschreibe den Antrag mit den bestätigten Verträgen elektronisch.
            </label>
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-500"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Danach entscheidet die Gemeinschaft über die Aufnahme. Wir melden Ihren Zählpunkt beim Netzbetreiber an – Sie stimmen dort nur noch zu. Wir begleiten Sie durch jeden Schritt.</p>
          </>
        )}

        {fehler && <p ref={fehlerRef} role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-50 px-4 py-3 text-[14px] text-danger-700 ring-1 ring-danger-200"><TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />{fehler}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
          {schritt > 0 ? <button type="button" onClick={() => { setFehler(""); setRichtung("zurueck"); setSchritt((s) => s - 1); }} className="ov-press inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-[14.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück</button> : <p className="flex items-center gap-1.5 text-[12.5px] text-ink-500"><Lock aria-hidden="true" className="h-3.5 w-3.5" />Verschlüsselt übertragen · jederzeit abbrechen</p>}
          {schritt < SCHRITTE.length - 1 ? (
            <button type="button" onClick={weiter} className="ov-press group inline-flex h-12 items-center gap-1.5 rounded-full bg-ov-600 px-6 text-[14.5px] font-semibold text-white shadow-gruen hover:bg-ov-700">Weiter<span className="hidden sm:inline">: {SCHRITTE[schritt + 1].label}</span> <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></button>
          ) : (
            <button type="submit" disabled={laeuft || !unterschrift.bestaetigt} aria-busy={laeuft} className="ov-press inline-flex h-12 items-center gap-2 rounded-full bg-ov-600 px-6 text-[14.5px] font-semibold text-white shadow-gruen hover:bg-ov-700 disabled:opacity-50">{laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileSignature aria-hidden="true" className="h-4 w-4" />}{laeuft ? "Wird gesendet …" : "Verbindlich beantragen"}</button>
          )}
        </div>
      </div>
    </form>
  );
}

function Eignung({ e }) {
  const titel = { geeignet: "Passt", pruefen: "Passt – mit Hinweisen", nicht_geeignet: "So nicht möglich" }[e.ergebnis];
  return (
    <div className={cn("animate-ov-einblenden mt-4 rounded-2xl p-3.5 ring-1", e.ergebnis === "nicht_geeignet" ? "bg-warn-50 ring-warn-200" : e.ergebnis === "geeignet" ? "bg-ov-50 ring-ov-200" : "bg-white ring-ink-200/70")} aria-live="polite">
      <p className="text-[13.5px] font-semibold text-ink-900">Eignungscheck: {titel}</p>
      <ul className="mt-2 space-y-1.5">
        {e.punkte.map((p) => (
          <li key={p.id} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-700">
            {p.ok === true ? <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> : p.ok === false ? <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-700" /> : <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />}
            {p.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Erfolg({ ergebnis, gemeinschaft }) {
  const t = ergebnis.teilnahmen?.[0];
  return (
    <div className="animate-ov-skalieren overflow-hidden rounded-[2rem] bg-white shadow-e3 ring-1 ring-ink-200/70" role="status">
      <div className="ov-verlauf-nacht p-6 text-white md:p-8">
        <ErfolgsHaken groesse={60} ton="hell" />
        <h2 className="mt-4 font-display text-[26px] font-extrabold tracking-tight">Antrag eingegangen – willkommen bei {gemeinschaft.name}</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/75">Als Nächstes entscheidet die Gemeinschaft über Ihre Aufnahme. Danach melden wir Ihren Zählpunkt beim Netzbetreiber an und Sie bekommen eine E-Mail mit der Bitte um Zustimmung.</p>
        <p className="mt-3 text-[12.5px] text-white/70">Nachweis: {ergebnis.nachweis?.hash?.slice(0, 16)}… · {String(ergebnis.nachweis?.am || "").slice(0, 16).replace("T", " ")} Uhr</p>
      </div>
      <div className="space-y-6 p-6 md:p-8">
        {t && <Schrittfolge schritte={t.schritte.schritte} />}
        {t?.anleitung && (
          <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70">
            <p className="mb-3 font-display text-[16px] font-bold text-ink-900">Schon jetzt wissen, wie die Zustimmung geht: {t.anleitung.titel.replace("So stimmen Sie bei ", "")}</p>
            <AnleitungSchritte anleitung={t.anleitung} />
          </div>
        )}
        <Link href={`/portal/eg/${gemeinschaft.id}`} className="ov-press inline-flex h-12 items-center gap-1.5 rounded-full bg-ov-600 px-6 text-[14.5px] font-semibold text-white shadow-gruen hover:bg-ov-700">Zu meinem Dashboard <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

/** Zeichenzähler und lesbare Gruppierung der Zählpunktnummer (33 Zeichen, beginnt mit AT) */
function ZpZaehler({ id, wert }) {
  const roh = String(wert || "").replace(/\s/g, "");
  if (!roh) return <span id={id} className="mt-1 block text-[13px] text-ink-500">33 Zeichen, beginnt mit AT – steht auf Ihrer Netzrechnung.</span>;
  const gruppiert = roh.length > 2 ? `${roh.slice(0, 2)} ${roh.slice(2, 8)} ${roh.slice(8, 13)} ${roh.slice(13, 23)} ${roh.slice(23)}`.trim() : roh;
  const ok = roh.length === 33 && roh.startsWith("AT");
  return (
    <span id={id} aria-live="polite" className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[13px]">
      <span className="font-mono text-ink-600">{gruppiert}</span>
      <span className={cn("ov-num inline-flex items-center gap-1 font-semibold", ok ? "text-ov-800" : roh.length > 33 ? "text-danger-700" : "text-ink-500")}>{ok && <Check aria-hidden="true" className="h-3.5 w-3.5" />}{roh.length}/33</span>
    </span>
  );
}

function Kopf({ titel, text }) {
  return (
    <div>
      <h2 data-schritt-kopf tabIndex={-1} className="font-display text-[22px] font-extrabold tracking-tight text-ink-900 outline-none md:text-[26px]">{titel}</h2>
      {text && <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-600">{text}</p>}
    </div>
  );
}
function Feld({ label, hilfe, children, breit = false }) {
  return (
    <label className={cn("block min-w-0", breit && "sm:col-span-2")}>
      <span className="mb-1.5 block text-[14px] font-semibold text-ink-900">{label}</span>
      {children}
      {hilfe && <span className="mt-1 block text-[13px] text-ink-500">{hilfe}</span>}
    </label>
  );
}
function Wahl({ label, wert, optionen, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[14px] font-semibold text-ink-900">{label}</legend>
      <div className="flex rounded-2xl bg-white p-1 ring-1 ring-inset ring-ink-200">
        {Object.entries(optionen).map(([k, v]) => (
          <label key={k} className={cn("flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-xl px-2 text-center text-[13.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", wert === k ? "bg-ov-600 text-white shadow-e1" : "text-ink-600 hover:text-ink-900")}>
            <input type="radio" value={k} checked={wert === k} onChange={() => onChange(k)} className="sr-only" />
            {v}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function Preis({ label, wert }) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
      <dt className="text-[12px] text-white/75">{label}</dt>
      <dd className="ov-num mt-0.5 font-display text-[16px] font-bold">{wert}</dd>
    </div>
  );
}

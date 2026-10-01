"use client";

// Beitritt online (WP6, Fachkonzept 2.4; Marktanalyse P0 Nr. 2 „Online-Beitritt in unter 5 Minuten“): Zählpunkte mit
// Eignungscheck → Angaben → Zahlung → Verträge → Unterschrift → Weiterleitung in die Zustimmung beim Netzbetreiber.
// Dieselben Regeln wie im Backend (eg/interesse.js eignungPruefen, beitrittBereinigen); verbindlich prüft der Server.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileSignature, Plus, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { BEITRITT_DOKUMENTE, beitrittBereinigen, eignungPruefen } from "@/lib/plattform/eg/interesse";
import { EG_MODELLE, MITGLIED_ARTEN, RECHNUNGSWEGE, SMART_METER, STEUERSTATUS_ERZEUGER } from "@/lib/plattform/eg/modell";
import { AnleitungSchritte, Schrittfolge } from "./Teile";
import { ct, eur } from "./format";

const feld = "h-11 w-full rounded-xl border-0 bg-white px-3.5 text-[15px] text-ink-900 ring-1 ring-inset ring-ink-200 placeholder:text-ink-400 focus:ring-2 focus:ring-ov-500";
const SCHRITTE = [
  { id: "zaehlpunkte", label: "Zählpunkte" },
  { id: "angaben", label: "Ihre Angaben" },
  { id: "zahlung", label: "Zahlung" },
  { id: "vertraege", label: "Verträge" },
  { id: "unterschrift", label: "Unterschrift" },
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

  const erzeugung = zps.some((z) => z.richtung === "erzeugung");
  const firma = ["kmu", "grossunternehmen", "gemeinde", "oeffentlich", "verein"].includes(art);
  const eignung = useMemo(() => zps.map((z) => (z.zaehlpunktnummer.replace(/\s/g, "").length >= 10 ? eignungPruefen({ ...z, art }, { gemeinschaft: g, netzbetreiber }) : null)), [zps, art, g, netzbetreiber]);
  const daten = {
    art, person, steuerstatusErzeuger: steuer.steuerstatusErzeuger, uid: steuer.uid, iban, rechnungsweg,
    unternehmensgroesse: { mitarbeiter: steuer.mitarbeiter },
    zaehlpunkte: zps.map((z) => ({ ...z, teilnahmefaktor: Number(z.teilnahmefaktor), fremdTf: Number(z.fremdTf) || 0, fremdAnzahl: Number(z.fremdTf) > 0 ? 1 : 0, kwp: z.kwp })),
    zustimmungen, unterschrift,
  };
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
    if (!f) setSchritt((s) => Math.min(SCHRITTE.length - 1, s + 1));
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
    <form onSubmit={absenden} className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70" noValidate>
      <ol className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-sand-50 px-4 py-3 md:px-6" aria-label="Schritte des Beitritts">
        {SCHRITTE.map((s, i) => (
          <li key={s.id} aria-current={i === schritt ? "step" : undefined} className="min-w-[88px] flex-1">
            <button type="button" onClick={() => i < schritt && setSchritt(i)} disabled={i > schritt} className="w-full text-left disabled:cursor-default">
              <span className={cn("block h-1.5 rounded-full", i <= schritt ? "bg-ov-500" : "bg-ink-200")} />
              <span className={cn("mt-2 block text-[12.5px] leading-tight", i === schritt ? "font-semibold text-ink-900" : i < schritt ? "text-ink-600" : "text-ink-400")}>{i + 1}. {s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="space-y-6 p-5 md:p-8">
        {SCHRITTE[schritt].id === "zaehlpunkte" && (
          <>
            <Kopf titel="Welche Zählpunkte bringen Sie ein?" text="Die 33-stellige Zählpunktnummer steht auf Ihrer Netzrechnung (beginnt mit AT). Für eine PV-Anlage mit Überschusseinspeisung haben Sie meist zwei: Verbrauch und Erzeugung." />
            <ul className="space-y-4">
              {zps.map((z, i) => (
                <li key={i} className="rounded-3xl bg-sand-50 p-4 ring-1 ring-ink-200/70 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">Zählpunkt {i + 1}</p>
                    {zps.length > 1 && <button type="button" onClick={() => setZps((l) => l.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 hover:text-ink-800"><Trash2 aria-hidden="true" className="h-4 w-4" /> Entfernen</button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
                    <Feld label="Zählpunktnummer"><input value={z.zaehlpunktnummer} onChange={(e) => setZps((l) => l.map((x, k) => (k === i ? { ...x, zaehlpunktnummer: e.target.value.toUpperCase() } : x)))} className={cn(feld, "font-mono text-[14px] tracking-wide")} placeholder="AT0030000491000000000000000000001" autoComplete="off" spellCheck={false} /></Feld>
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
              <Feld label="IBAN (optional)" breit hilfe="Ihre IBAN sehen nur Kassa und Betriebsführung; im Portal wird sie maskiert angezeigt."><input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} className={cn(feld, "font-mono tracking-wide")} placeholder="AT61 1904 3002 3457 3201" autoComplete="off" spellCheck={false} /></Feld>
              <Wahl label="Belege erhalten per" wert={rechnungsweg} optionen={RECHNUNGSWEGE} onChange={setRechnungsweg} />
            </div>
          </>
        )}

        {SCHRITTE[schritt].id === "vertraege" && (
          <>
            <Kopf titel="Verträge und Preisblatt" text="Bitte lesen und bestätigen. Die vollständigen Fassungen erhalten Sie nach dem Absenden zusätzlich per E-Mail und im Portal." />
            <div className="rounded-3xl bg-navy-950 p-5 text-white md:p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Preisblatt {g.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Preis label="Bezug" wert={g.bezugspreisCt !== null ? `${ct(g.bezugspreisCt)}/kWh` : "folgt"} />
                <Preis label="Einspeisung" wert={g.einspeisepreisCt !== null ? `${ct(g.einspeisepreisCt)}/kWh` : "folgt"} />
                <Preis label="Mitgliedsbeitrag" wert={g.mitgliedsbeitragJahr ? `${eur(g.mitgliedsbeitragJahr)}/Jahr` : "keiner"} />
                <Preis label="Beitrittsgebühr" wert={g.einmalgebuehrBeitritt ? eur(g.einmalgebuehrBeitritt) : "keine"} />
              </dl>
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">Preise netto. Netzentgelte und Abgaben rechnet weiterhin Ihr Netzbetreiber ab – die Reduktion für Gemeinschaftsstrom zieht er direkt ab. Ihren übrigen Strom liefert Ihr bisheriger Lieferant.</p>
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

        {fehler && <p role="alert" className="flex items-start gap-2 rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-900 ring-1 ring-sun-400/50"><TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />{fehler}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
          {schritt > 0 ? <button type="button" onClick={() => { setFehler(""); setSchritt((s) => s - 1); }} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück</button> : <span />}
          {schritt < SCHRITTE.length - 1 ? (
            <button type="button" onClick={weiter} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700">Weiter <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
          ) : (
            <button type="submit" disabled={laeuft || !unterschrift.bestaetigt} className="inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50"><FileSignature aria-hidden="true" className="h-4 w-4" />{laeuft ? "Wird gesendet …" : "Verbindlich beantragen"}</button>
          )}
        </div>
      </div>
    </form>
  );
}

function Eignung({ e }) {
  const titel = { geeignet: "Passt", pruefen: "Passt – mit Hinweisen", nicht_geeignet: "So nicht möglich" }[e.ergebnis];
  return (
    <div className={cn("mt-4 rounded-2xl p-3.5 ring-1", e.ergebnis === "nicht_geeignet" ? "bg-sun-300/15 ring-sun-400/50" : "bg-white ring-ink-200/70")} aria-live="polite">
      <p className="text-[13.5px] font-semibold text-ink-900">Eignungscheck: {titel}</p>
      <ul className="mt-2 space-y-1.5">
        {e.punkte.map((p) => (
          <li key={p.id} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-700">
            {p.ok === true ? <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> : p.ok === false ? <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" /> : <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />}
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
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70" role="status">
      <div className="bg-navy-950 p-6 text-white md:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-500"><Check aria-hidden="true" className="h-6 w-6" strokeWidth={3} /></span>
        <h2 className="mt-4 font-display text-[26px] font-extrabold tracking-tight">Antrag eingegangen – willkommen bei {gemeinschaft.name}</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/75">Als Nächstes entscheidet die Gemeinschaft über Ihre Aufnahme. Danach melden wir Ihren Zählpunkt beim Netzbetreiber an und Sie bekommen eine E-Mail mit der Bitte um Zustimmung.</p>
        <p className="mt-3 text-[12px] text-white/50">Nachweis: {ergebnis.nachweis?.hash?.slice(0, 16)}… · {String(ergebnis.nachweis?.am || "").slice(0, 16).replace("T", " ")} Uhr</p>
      </div>
      <div className="space-y-6 p-6 md:p-8">
        {t && <Schrittfolge schritte={t.schritte.schritte} />}
        {t?.anleitung && (
          <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70">
            <p className="mb-3 font-display text-[16px] font-bold text-ink-900">Schon jetzt wissen, wie die Zustimmung geht: {t.anleitung.titel.replace("So stimmen Sie bei ", "")}</p>
            <AnleitungSchritte anleitung={t.anleitung} />
          </div>
        )}
        <Link href={`/portal/eg/${gemeinschaft.id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700">Zu meinem Dashboard <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

function Kopf({ titel, text }) {
  return (
    <div>
      <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink-900">{titel}</h2>
      {text && <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-600">{text}</p>}
    </div>
  );
}
function Feld({ label, hilfe, children, breit = false }) {
  return (
    <label className={cn("block min-w-0", breit && "sm:col-span-2")}>
      <span className="mb-1.5 block text-[13.5px] font-medium text-ink-700">{label}</span>
      {children}
      {hilfe && <span className="mt-1 block text-[12.5px] text-ink-500">{hilfe}</span>}
    </label>
  );
}
function Wahl({ label, wert, optionen, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[13.5px] font-medium text-ink-700">{label}</legend>
      <div className="flex rounded-xl bg-white p-1 ring-1 ring-inset ring-ink-200">
        {Object.entries(optionen).map(([k, v]) => (
          <label key={k} className={cn("flex-1 cursor-pointer rounded-lg px-2 py-2 text-center text-[13.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", wert === k ? "bg-ov-600 text-white" : "text-ink-600 hover:text-ink-900")}>
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
      <dt className="text-[12px] text-white/60">{label}</dt>
      <dd className="ov-num mt-0.5 font-display text-[16px] font-bold">{wert}</dd>
    </div>
  );
}

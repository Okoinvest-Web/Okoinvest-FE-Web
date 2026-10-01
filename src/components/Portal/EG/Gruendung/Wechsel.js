"use client";

// Wechsel-Assistent (WP5, Fachkonzept 2.6): Import aus CSV bzw. aus Excel kopierten Zellen mit Anbieter-Erkennung,
// Spaltenzuordnung, Plausibilitätsprüfung und Übernahme über die WP1-Operationen; Kontrollabrechnung gegen die letzte
// Altabrechnung. Regeln: eg/wechsel.js (serverseitig).

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Feld, auswahlfeld, textbereich } from "@/components/Portal/felder";
import { Badge, Tabelle, zelle } from "@/components/Portal/ui";
import { Klappe, Knopf, Meldung } from "@/components/Portal/Mitglied/teile";
import { senden } from "@/lib/plattform/client";
import { eurDe, zahlDe } from "./teile";

/** Datei als Text lesen (UTF-8, bei Ersatzzeichen Windows-1252 – typisch für Excel-CSV) */
async function dateiText(datei) {
  const buf = await datei.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export function ImportAssistent({ gemeinschaftId, auftragId = "", importe = [] }) {
  const id = useId();
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [dateiname, setDateiname] = useState("");
  const [v, setV] = useState(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const [opt, setOpt] = useState({ ohneFehlerzeilen: true, tarifUebernehmen: true });
  const url = `/api/portal/eg/${gemeinschaftId}/import`;

  async function vorschau(extra = {}) {
    setLaeuft(true);
    setFehler("");
    setOk("");
    try {
      const body = v && !extra.neu ? { importId: v.import.id, anbieter: extra.anbieter ?? v.import.anbieter, zuordnung: extra.zuordnung ?? v.zuordnung } : { csv, dateiname, auftragId };
      setV(await senden(url, { body }));
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  async function ausfuehren() {
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden(`${url}/ausfuehren`, { body: { importId: v.import.id, ...opt } });
      setOk(`Übernommen: ${r.ergebnis.angelegt} neu, ${r.ergebnis.geaendert} aktualisiert, ${r.ergebnis.aktiviert} aktiviert${r.ergebnis.tarifId ? ", Tarif als Entwurf" : ""}. ${r.ergebnis.podlist}`);
      setV(null);
      setCsv("");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  const zuordnungSetzen = (spalte, feld) => {
    const z = Object.fromEntries(Object.entries(v.zuordnung).filter(([f, i]) => i !== spalte && f !== feld));
    if (feld) z[feld] = spalte;
    vorschau({ zuordnung: z });
  };
  const feldVon = (i) => Object.entries(v?.zuordnung || {}).find(([, s]) => s === i)?.[0] || "";
  const p = v?.plausibilitaet;

  return (
    <div className="space-y-4">
      {!v && (
        <div className="space-y-3">
          <label htmlFor={`${id}-f`} className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-300 bg-white px-4 py-6 text-center hover:border-ov-400">
            <Upload aria-hidden="true" className="h-6 w-6 text-ov-600" />
            <span className="text-[14px] font-semibold text-ink-900">{dateiname || "CSV-Datei wählen"}</span>
            <span className="text-[12.5px] text-ink-500">Export aus energiedigital, EEG Faktura, EGON, EDA-Portal oder Excel (als CSV speichern). Eine Zeile je Zählpunkt.</span>
            <input id={`${id}-f`} type="file" accept=".csv,.txt,.tsv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setDateiname(f.name); setCsv(await dateiText(f)); } }} />
          </label>
          <Feld id={`${id}-t`} label="… oder Zellen aus Excel einfügen (mit Kopfzeile)"><textarea id={`${id}-t`} rows={4} className={textbereich} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"Mitgliedsnummer\tVorname\tNachname\tE-Mail\tZählpunkt\tEnergierichtung\tTeilnahmefaktor\tConsent-ID\tkWp"} /></Feld>
          <Knopf variante="primary" onClick={() => vorschau({ neu: true })} disabled={laeuft || !csv.trim()}>{laeuft ? "Prüfe …" : "Vorschau und Prüfung"}</Knopf>
        </div>
      )}
      {v && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton="info">{v.import.dateiname}</Badge>
            <Badge>{v.import.zeilen} Zeilen</Badge>
            <Badge ton={v.erkannt.sicherheit === "hoch" ? "ok" : v.erkannt.sicherheit === "mittel" ? "info" : "neutral"}>erkannt: {v.anbieterProfile[v.erkannt.anbieter]?.label} ({v.erkannt.sicherheit === "keine" ? "unsicher" : v.erkannt.sicherheit})</Badge>
            <select aria-label="Anbieter" className={`${auswahlfeld} h-9 w-auto text-[13.5px]`} value={v.import.anbieter} onChange={(e) => vorschau({ anbieter: e.target.value })}>{Object.entries(v.anbieterProfile).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select>
            <Knopf onClick={() => setV(null)}>Andere Datei</Knopf>
          </div>
          <p className="text-[12.5px] text-ink-500">{v.anbieterProfile[v.import.anbieter]?.export} Spaltennamen der Anbieter (zu bestätigen) – bitte die Zuordnung prüfen.</p>
          <Klappe titel={`Spaltenzuordnung (${Object.keys(v.zuordnung).length} von ${v.kopf.length} Spalten zugeordnet)`} offen>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {v.kopf.map((k, i) => (
                <label key={i} className="flex min-w-0 items-center gap-2 text-[13px]">
                  <span className="w-32 shrink-0 truncate font-medium text-ink-800" title={k}>{k || `Spalte ${i + 1}`}</span>
                  <select className={`${auswahlfeld} h-9 text-[13px]`} value={feldVon(i)} onChange={(e) => zuordnungSetzen(i, e.target.value)} disabled={laeuft}>
                    <option value="">– nicht übernehmen –</option>
                    {Object.entries(v.felder).map(([f, l]) => <option key={f} value={f}>{l}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </Klappe>
          <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
            {[["Mitglieder", p.kennzahlen.mitglieder], ["Zählpunkte", p.kennzahlen.zaehlpunkte], ["Verbrauch / Erzeugung", `${p.kennzahlen.verbrauch} / ${p.kennzahlen.erzeugung}`], ["Erzeugung", `${zahlDe(p.kennzahlen.kwp, 1)} kWp`], ["ohne Consent-ID", p.kennzahlen.ohneConsent], ["Consent „Migration“", p.kennzahlen.migrationConsent], ["Preise", p.kennzahlen.tarife], ["offene Salden", eurDe(p.kennzahlen.saldoEur)]].map(([l, w]) => (
              <div key={l} className="rounded-xl bg-ink-50 px-3 py-2"><p className="text-ink-500">{l}</p><p className="ov-num font-semibold text-ink-900">{w}</p></div>
            ))}
          </div>
          {p.fehler.length > 0 && (
            <div className="rounded-2xl bg-danger-50 p-3 ring-1 ring-inset ring-danger-200">
              <p className="text-[13.5px] font-semibold text-danger-800">{p.fehler.length} Fehler in {p.kennzahlen.fehlerZeilen} Zeile(n)</p>
              <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-[13px] text-danger-800">{p.fehler.slice(0, 200).map((f, i) => <li key={i}>Zeile {f.zeile}: {f.text}</li>)}</ul>
            </div>
          )}
          {p.warnungen.length > 0 && <Klappe titel={`${p.warnungen.length} Hinweis(e) zur Prüfung`}><ul className="max-h-48 space-y-0.5 overflow-y-auto text-[13px] text-ink-700">{p.warnungen.slice(0, 300).map((w, i) => <li key={i}>{w.zeile ? `Zeile ${w.zeile}: ` : ""}{w.text}</li>)}</ul></Klappe>}
          {p.hinweise.length > 0 && <ul className="space-y-1 text-[13px] text-ink-600">{p.hinweise.map((h, i) => <li key={i}>– {h.text} ({h.quelle})</li>)}</ul>}
          <Tabelle kopf={["Zeile", "Mitglied", "Zählpunkt", "Richtung", "TF", "Consent-ID", "Status"]}>
            {v.vorschau.slice(0, 50).map((z) => (
              <tr key={z.zeile}>
                <td className={zelle}>{z.zeile}</td>
                <td className={zelle}><span className="font-medium text-ink-900">{z.name || "–"}</span>{z.mitgliedsnummer ? <span className="block text-[12px] text-ink-500">Nr. {z.mitgliedsnummer}</span> : null}</td>
                <td className={`${zelle} font-mono text-[12px]`}>{z.zaehlpunkt || "–"}</td>
                <td className={zelle}>{z.richtung || "–"}</td>
                <td className={zelle}>{z.teilnahmefaktor ?? "–"}</td>
                <td className={zelle}>{z.consentId || "–"}</td>
                <td className={zelle}><Badge ton={z.status === "fehler" ? "warn" : z.status === "warnung" ? "info" : "ok"}>{z.status}</Badge></td>
              </tr>
            ))}
          </Tabelle>
          <div className="flex flex-wrap items-center gap-4 text-[13.5px] text-ink-700">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={opt.ohneFehlerzeilen} onChange={(e) => setOpt({ ...opt, ohneFehlerzeilen: e.target.checked })} />Fehlerzeilen auslassen</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={opt.tarifUebernehmen} onChange={(e) => setOpt({ ...opt, tarifUebernehmen: e.target.checked })} />Preise als Tarif-Entwurf übernehmen</label>
          </div>
          <Knopf variante="primary" onClick={ausfuehren} disabled={laeuft || (!opt.ohneFehlerzeilen && p.fehler.length > 0)}>{laeuft ? "Übernehme …" : "Übernehmen (Mitglieder, Zählpunkte, Teilnahmen)"}</Knopf>
          <p className="text-[12.5px] text-ink-500">Teilnahmen werden als Entwurf mit Consent-ID angelegt; Aktivierung nach dem Abgleich mit der Zählpunktliste des Netzbetreibers (EC_PODLIST, WP2). Keine Ab- oder Neuanmeldung.</p>
        </div>
      )}
      <Meldung fehler={fehler} ok={ok} />
      {importe.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-ink-700">Bisherige Importe</p>
          <ul className="mt-1 divide-y divide-ink-100 text-[13.5px]">
            {importe.map((i) => <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{i.dateiname} · {i.anbieterLabel} · {i.zeilen} Zeilen</span><Badge ton={i.status === "ausgefuehrt" ? "ok" : i.status === "fehlgeschlagen" ? "warn" : "neutral"}>{i.status === "ausgefuehrt" ? `übernommen (${i.ergebnis?.angelegt ?? 0} neu)` : i.status}</Badge></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Zeilen „Schlüssel;Name;kWh;Betrag“ (Semikolon, Komma oder Tabulator) lesen */
function werteLesen(text) {
  return String(text || "").split(/\r?\n/).map((z) => z.split(z.includes("\t") ? "\t" : z.includes(";") ? ";" : ",").map((x) => x.trim())).filter((z) => z[0] && !/schl|zaehl|zähl|nummer/i.test(z[0]) && z.length >= 3).map((z) => ({ schluessel: z[0], name: z.length >= 4 ? z[1] : "", kwh: Number(String(z[z.length - 2]).replace(/\./g, "").replace(",", ".")) || 0, betragEur: Number(String(z[z.length - 1]).replace(/\./g, "").replace(",", ".")) || 0 }));
}

export function Kontrollabrechnung({ auftragId, kontrolle = null, stichtag = "" }) {
  const id = useId();
  const router = useRouter();
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  async function los() {
    setLaeuft(true);
    setFehler("");
    try {
      await senden(`/api/portal/eg/gruendung/${auftragId}`, { body: { aktion: "probeabrechnung", alt: werteLesen(alt), neu: werteLesen(neu) } });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }
  const v = kontrolle?.vergleich;
  return (
    <div className="space-y-3">
      <p className="text-[13.5px] leading-relaxed text-ink-600">Letzte Abrechnung des bisherigen Dienstleisters einfügen (je Zeile Mitgliedsnummer bzw. Zählpunkt; Name; kWh; Betrag €). Die Probe-Abrechnung rechnet über WP4 nach{stichtag ? ` – Parallelmonat vor dem Stichtag` : ""}; ist sie noch nicht verfügbar, können eigene Werte daneben gestellt werden.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Feld id={`${id}-a`} label="Altabrechnung"><textarea id={`${id}-a`} rows={5} className={textbereich} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={"1;Max Muster;212,4;23,36\n2;Erika Beispiel;180;19,80"} /></Feld>
        <Feld id={`${id}-n`} label="Neue Werte (nur ohne WP4-Probeabrechnung)"><textarea id={`${id}-n`} rows={5} className={textbereich} value={neu} onChange={(e) => setNeu(e.target.value)} /></Feld>
      </div>
      <Knopf variante="primary" onClick={los} disabled={laeuft || !alt.trim()}>{laeuft ? "Vergleiche …" : "Kontrollabrechnung starten"}</Knopf>
      <Meldung fehler={fehler} />
      {kontrolle && (
        <div className="space-y-2">
          <p className="text-[13px] text-ink-600">{kontrolle.wp4?.text}</p>
          {v && (
            <>
              <div className="flex flex-wrap gap-2"><Badge ton="ok">{v.summe.gleich} gleich</Badge><Badge ton={v.summe.abweichung ? "warn" : "neutral"}>{v.summe.abweichung} Abweichung(en)</Badge><Badge>{v.summe.nurAlt} nur alt</Badge><Badge>{v.summe.nurNeu} nur neu</Badge><Badge ton="info">Δ {eurDe(v.summe.diffEur)}</Badge></div>
              {v.zeilen?.length > 0 && (
                <Tabelle kopf={["Schlüssel", "kWh alt / neu", "€ alt / neu", "Status"]}>
                  {v.zeilen.slice(0, 100).map((z) => (
                    <tr key={z.schluessel}>
                      <td className={zelle}><span className="font-medium">{z.schluessel}</span>{z.name ? <span className="block text-[12px] text-ink-500">{z.name}</span> : null}</td>
                      <td className={zelle}>{zahlDe(z.altKwh, 2)} / {zahlDe(z.neuKwh, 2)}</td>
                      <td className={zelle}>{eurDe(z.altEur)} / {eurDe(z.neuEur)}</td>
                      <td className={zelle}><Badge ton={z.status === "gleich" ? "ok" : "warn"}>{z.status.replace("_", " ")}</Badge>{z.erklaerung && <span className="mt-1 block text-[12px] text-ink-500">{z.erklaerung}</span>}</td>
                    </tr>
                  ))}
                </Tabelle>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

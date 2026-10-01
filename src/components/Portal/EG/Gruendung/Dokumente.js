"use client";

// Dokumentgenerator (WP5): Vorlage wählen, offene Angaben ergänzen, Muster als PDF erzeugen (versioniert mit SHA-256).
// Vorlagen und Felder liefert der Server (eg/vorlagen/**); Prüfung der Statuten (VerG § 3 Abs. 2) serverseitig.

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FileText } from "lucide-react";
import { Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { Badge } from "@/components/Portal/ui";
import { Knopf, Meldung } from "@/components/Portal/Mitglied/teile";
import { senden } from "@/lib/plattform/client";
import { Befunde, MusterHinweis, datumDe } from "./teile";

const GRUPPEN = { statuten: "Statuten und Gründung", verein: "Vereinsorganisation", mitglied: "Verträge mit Mitgliedern", lieferant: "Lieferantenpflichten (§ 69 ElWG)", organisator: "Organisator und Datenschutz", auftrag: "Auftrag", wechsel: "Wechsel und ElWG-Anpassung" };
const OHNE_EINGABE = ["name", "sitzOrt", "modellLabel", "netzbetreiberName", "gemeinschaftsId", "marktpartnerId", "mitgliedName", "mitgliedAnschrift", "zaehlpunkt", "anlageBezeichnung", "anlageKwp", "einspeisepreisCt", "bezugspreisCt", "auftraggeberName", "paketLabel", "angebotNetto", "angebotGueltigBis"];

export function DokumentGenerator({ vorlagen = [], felder = {}, auftragId = "", gemeinschaftId = "", dokumente = [], vorgaben = {} }) {
  const id = useId();
  const router = useRouter();
  const [vorlage, setVorlage] = useState(vorlagen[0]?.id || "");
  const [werte, setWerte] = useState(vorgaben);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState(null);
  const eingabeFelder = useMemo(() => (felder[vorlage] || []).filter((f) => !OHNE_EINGABE.includes(f.id)), [felder, vorlage]);
  const bezug = gemeinschaftId ? `gemeinschaftId=${encodeURIComponent(gemeinschaftId)}` : `auftragId=${encodeURIComponent(auftragId)}`;
  const gruppiert = Object.entries(GRUPPEN).map(([k, l]) => [l, vorlagen.filter((v) => v.gruppe === k)]).filter(([, l]) => l.length);

  async function erzeugen(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const daten = Object.fromEntries(eingabeFelder.map((f) => [f.id, werte[f.id] ?? ""]).filter(([, v]) => v !== ""));
      const r = await senden("/api/portal/eg/dokument", { body: { vorlage, auftragId, gemeinschaftId, daten } });
      setErgebnis(r);
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="space-y-4">
      <MusterHinweis />
      <form onSubmit={erzeugen} className="space-y-3">
        <Feld id={`${id}-v`} label="Vorlage">
          <select id={`${id}-v`} className={auswahlfeld} value={vorlage} onChange={(e) => { setVorlage(e.target.value); setErgebnis(null); }}>
            {gruppiert.map(([l, liste]) => <optgroup key={l} label={l}>{liste.map((v) => <option key={v.id} value={v.id}>{v.titel}</option>)}</optgroup>)}
          </select>
        </Feld>
        {eingabeFelder.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {eingabeFelder.map((f) => (
              <Feld key={f.id} id={`${id}-${f.id}`} label={f.label} pflicht={f.pflicht}>
                {["onlineGv", "aufsichtsrat"].includes(f.id) ? (
                  <select id={`${id}-${f.id}`} className={auswahlfeld} value={String(werte[f.id] ?? "")} onChange={(e) => setWerte({ ...werte, [f.id]: e.target.value === "" ? "" : e.target.value === "true" })}><option value="">Standard</option><option value="true">ja</option><option value="false">nein</option></select>
                ) : (
                  <input id={`${id}-${f.id}`} type={["versammlungAm", "stichtag", "letzteAltabrechnung", "frist", "ab"].includes(f.id) ? "date" : "text"} className={eingabe} value={werte[f.id] ?? ""} onChange={(e) => setWerte({ ...werte, [f.id]: e.target.value })} />
                )}
              </Feld>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Knopf variante="primary" type="submit" disabled={laeuft || !vorlage}>{laeuft ? "Wird erzeugt …" : "Dokument erzeugen und ablegen"}</Knopf>
          {vorlage && <a href={`/api/portal/eg/dokument?vorlage=${encodeURIComponent(vorlage)}&${bezug}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><FileText aria-hidden="true" className="h-4 w-4 text-ov-700" />Vorschau (PDF)</a>}
        </div>
        <Meldung fehler={fehler} />
      </form>
      {ergebnis && (
        <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-inset ring-ov-200">
          <p className="text-[14px] font-semibold text-ink-900">{ergebnis.unveraendert ? "Unverändert – vorhandene Version" : "Abgelegt"}: {ergebnis.dokument.titel} · Version {ergebnis.dokument.version}</p>
          <p className="mt-1 break-all text-[12px] text-ink-500">SHA-256 {ergebnis.dokument.sha256}</p>
          {ergebnis.fehlend?.length > 0 && <p className="mt-1 text-[13px] text-ink-700">Noch offen (im PDF als „……“): {ergebnis.fehlend.join(", ")}</p>}
          {ergebnis.pruefung && <div className="mt-2"><Befunde liste={ergebnis.pruefung.befunde} /></div>}
          <a href={`/api/portal/eg/dokument?id=${encodeURIComponent(ergebnis.dokument.id)}`} target="_blank" rel="noopener" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ov-600 px-3.5 text-[13.5px] font-semibold text-white hover:bg-ov-700"><FileDown aria-hidden="true" className="h-4 w-4" />PDF öffnen</a>
        </div>
      )}
      {dokumente.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-ink-700">Abgelegte Versionen</p>
          <ul className="mt-2 divide-y divide-ink-100">
            {dokumente.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink-900">{d.titel}</p>
                  <p className="text-[12.5px] text-ink-500">Version {d.version} · {datumDe(d.erstelltAm)} · SHA-256 {String(d.sha256).slice(0, 12)}…</p>
                </div>
                <div className="flex items-center gap-2">
                  {d.fehlend > 0 && <Badge ton="warn">{d.fehlend} offen</Badge>}
                  <a href={`/api/portal/eg/dokument?id=${encodeURIComponent(d.id)}`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><FileDown aria-hidden="true" className="h-3.5 w-3.5 text-ov-700" />PDF</a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

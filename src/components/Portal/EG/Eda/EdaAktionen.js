"use client";

// Bedienung der EDA-Seiten (WP2): Teilnahmen mit Mehrfachauswahl (Anmelden, Abmelden, TF ändern, Nachforderung),
// Massenaktionen (ausstehende Zustimmungen erneut anstoßen, Erinnerungen, Zählpunktliste, Fristenlauf, Simulator),
// manuelles Einspielen einer EDA-Nachricht, Reklamation an den Netzbetreiber und Vier-Augen-Freigaben (Vorstand).
// Fachliche Prüfung ausschließlich im Backend (eg/eda/*.js bzw. Frappe); hier nur Bedienung. Mutationen per senden().

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Download, FileUp, ListChecks, Mail, RefreshCw, Send, Timer, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Chip, ErfolgBox, FehlerBox, Feld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { Ampel, Zp, tag } from "./EdaTeile";

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [details, setDetails] = useState(null);
  async function los(schluessel, url, body, text) {
    setLaeuft(schluessel);
    setFehler("");
    setErfolg("");
    setDetails(null);
    try {
      const r = await senden(url, { body });
      setErfolg(typeof text === "function" ? text(r) : text || "Erledigt.");
      setDetails(r);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft("");
    }
  }
  return { laeuft, fehler, erfolg, details, los };
}

const LINK_KNOPF = "inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition hover:bg-ink-50 hover:ring-ink-300";
const morgen = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const FILTER = [
  ["alle", "Alle"],
  ["handeln", "Handlungsbedarf"],
  ["entwurf", "Entwurf"],
  ["zustimmung_offen", "Zustimmung offen"],
  ["wartet_technik", "Technik"],
  ["aktiv", "Aktiv"],
  ["abgelehnt", "Abgelehnt/abgelaufen"],
];

function Fehlerliste({ details }) {
  const f = details?.fehler || [];
  const u = details?.uebersprungen || [];
  if (!f.length && !u.length) return null;
  return (
    <div className="rounded-xl bg-sun-300/20 px-4 py-3 text-[13.5px] text-ink-900 ring-1 ring-inset ring-sun-400/40">
      {f.length > 0 && <p className="font-semibold">{f.length} nicht ausgeführt:</p>}
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {f.slice(0, 12).map((x, i) => <li key={i}>{x.fehler || String(x)}</li>)}
        {u.slice(0, 12).map((x, i) => <li key={`u${i}`}>Übersprungen: {x.grund}</li>)}
      </ul>
    </div>
  );
}

/** Teilnahmen der Gemeinschaft mit Auswahl und EDA-Aktionen */
export function EdaTeilnahmen({ teilnahmen = [], url, darf, vierAugenAb = 3 }) {
  const a = useAktion();
  const [filter, setFilter] = useState("handeln");
  const [auswahl, setAuswahl] = useState(new Set());
  const [zum, setZum] = useState(morgen());
  const [tf, setTf] = useState("");
  const [ab, setAb] = useState(morgen());
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [q, setQ] = useState("");
  const liste = useMemo(() => {
    const such = q.trim().toLowerCase();
    return teilnahmen.filter((t) => {
      if (such && !`${t.mitgliedName} ${t.zaehlpunktnummer}`.toLowerCase().includes(such)) return false;
      if (filter === "alle") return true;
      if (filter === "handeln") return ["entwurf", "abgelehnt", "abgelaufen", "zustimmung_offen", "wartet_technik"].includes(t.status) || t.letzterProzess?.ampel?.ampel === "rot";
      if (filter === "abgelehnt") return ["abgelehnt", "abgelaufen"].includes(t.status);
      return t.status === filter;
    });
  }, [teilnahmen, filter, q]);
  const gewaehlt = teilnahmen.filter((t) => auswahl.has(t.id));
  const toggle = (id) => setAuswahl((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const alleSichtbar = liste.length > 0 && liste.every((t) => auswahl.has(t.id));
  const ids = [...auswahl];
  const nachAktion = (r) => {
    if (r) setAuswahl(new Set());
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter">
          {FILTER.map(([k, l]) => (
            <Chip key={k} type="radio" name="eda-filter" value={k} checked={filter === k} onChange={() => setFilter(k)}>
              {l} <span className="opacity-70">{k === "alle" ? teilnahmen.length : ""}</span>
            </Chip>
          ))}
        </div>
        <input className={cn(eingabe, "h-10 md:max-w-xs")} placeholder="Mitglied oder Zählpunkt suchen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Suche" />
      </div>
      <div tabIndex={0} role="region" aria-label="Tabelle, horizontal scrollbar" className="-mx-5 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500 md:-mx-6">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-ink-100 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
              <th scope="col" className="w-10 px-5 py-3 md:px-6">
                <input type="checkbox" aria-label="Alle sichtbaren auswählen" checked={alleSichtbar} onChange={() => setAuswahl(alleSichtbar ? new Set() : new Set(liste.map((t) => t.id)))} className="h-4 w-4 accent-ov-600" />
              </th>
              <th scope="col" className="px-3 py-3">Mitglied / Zählpunkt</th>
              <th scope="col" className="px-3 py-3">Teilnahme</th>
              <th scope="col" className="px-3 py-3">TF</th>
              <th scope="col" className="px-3 py-3">Letzter EDA-Prozess</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {liste.map((t) => (
              <tr key={t.id} className={auswahl.has(t.id) ? "bg-ov-50/60" : ""}>
                <td className="px-5 py-3 align-top md:px-6">
                  <input type="checkbox" aria-label={`${t.mitgliedName} auswählen`} checked={auswahl.has(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 accent-ov-600" />
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="font-semibold text-ink-900">{t.mitgliedName || "–"}</p>
                  <p className="mt-0.5"><Zp nr={t.zaehlpunktnummer} /> <span className="text-[12px] text-ink-500">· {t.richtung === "erzeugung" ? "Erzeugung" : "Verbrauch"}{t.smartMeter === "nein" ? " · kein Smart Meter" : ""}</span></p>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="text-ink-900">{t.statusLabel}</p>
                  <p className="text-[12px] text-ink-500">{t.status === "zustimmung_offen" && t.fristBis ? `Frist ${tag(t.fristBis)}` : t.gueltigAb ? `seit ${tag(t.gueltigAb)}` : t.anmeldungVorgemerkt ? "zur Anmeldung vorgemerkt" : ""}</p>
                </td>
                <td className="px-3 py-3 align-top tabular-nums">{t.teilnahmefaktor} %</td>
                <td className="px-3 py-3 align-top">
                  {t.letzterProzess ? (
                    <a href={`${url.replace("/api/admin", "/portal/admin")}/${t.letzterProzess.id}`} className="block hover:underline">
                      <Ampel ampel={t.letzterProzess.ampel} />
                      <span className="block text-[12px] text-ink-500">{t.letzterProzess.prozesscode}{t.letzterProzess.responsecode ? ` · Code ${t.letzterProzess.responsecode}` : ""}</span>
                    </a>
                  ) : (
                    <span className="text-[13px] text-ink-400">noch keiner</span>
                  )}
                </td>
              </tr>
            ))}
            {!liste.length && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[14px] text-ink-500">Keine Teilnahmen in dieser Ansicht.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {darf ? (
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
          <p className="text-[13.5px] font-semibold text-ink-900">{gewaehlt.length ? `${gewaehlt.length} ausgewählt` : "Teilnahmen auswählen, um EDA-Prozesse auszulösen"}</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-wrap items-end gap-2">
              <Button size="sm" icon={Send} disabled={!ids.length || !!a.laeuft} onClick={async () => nachAktion(await a.los("anmelden", url, { aktion: "anmelden", teilnahmeIds: ids }, (r) => `${r.prozesse.length} Anmeldung(en) (EC_REQ_ONL) gesendet${r.fehler.length ? `, ${r.fehler.length} nicht möglich` : ""}.`))}>
                Anmelden
              </Button>
              <Button size="sm" variant="secondary" icon={BellRing} disabled={!ids.length || !!a.laeuft} onClick={async () => nachAktion(await a.los("erinnern", url, { aktion: "erinnern", teilnahmeIds: ids }, (r) => `${r.erinnert} Erinnerung(en): ${r.perPortal} über Portal/E-Mail, ${r.vorbereitet} als Text vorbereitet.`))}>
                Erinnern
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Feld id="eda-zum" label="Abmelden zum (letzter Tag)" className="w-44">
                <input id="eda-zum" type="date" className={cn(eingabe, "h-10")} value={zum} onChange={(e) => setZum(e.target.value)} />
              </Feld>
              <Button size="sm" variant="secondary" icon={X} disabled={!ids.length || !zum || !!a.laeuft} onClick={async () => nachAktion(await a.los("abmelden", url, { aktion: "abmelden", teilnahmeIds: ids, zum }, (r) => (r.freigabeNoetig ? `${r.prozesse.length} Abmeldungen warten auf die Freigabe des Vorstands (Vier-Augen ab ${vierAugenAb}).` : `${r.prozesse.length} Abmeldung(en) (CM_REV_SP) gesendet.`)))}>
                Abmelden
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Feld id="eda-tf" label="Neuer TF (%)" className="w-28">
                <input id="eda-tf" type="number" min={1} max={100} step={1} inputMode="numeric" className={cn(eingabe, "h-10")} value={tf} onChange={(e) => setTf(e.target.value)} />
              </Feld>
              <Feld id="eda-ab" label="gültig ab" className="w-44">
                <input id="eda-ab" type="date" className={cn(eingabe, "h-10")} value={ab} onChange={(e) => setAb(e.target.value)} />
              </Feld>
              <Button size="sm" variant="secondary" icon={RefreshCw} disabled={!ids.length || !tf || !!a.laeuft} onClick={async () => nachAktion(await a.los("tf", url, { aktion: "tf", aenderungen: ids.map((teilnahmeId) => ({ teilnahmeId, teilnahmefaktor: Number(tf), ab })) }, (r) => (r.freigabeNoetig ? `${r.prozesse.length} TF-Änderungen warten auf die Freigabe des Vorstands.` : `${r.prozesse.length} TF-Änderung(en) (EC_PRTFACT_CHG) gesendet.`)))}>
                TF ändern
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Feld id="eda-von" label="Daten nachfordern von" className="w-40">
                <input id="eda-von" type="date" className={cn(eingabe, "h-10")} value={von} onChange={(e) => setVon(e.target.value)} />
              </Feld>
              <Feld id="eda-bis" label="bis" className="w-40">
                <input id="eda-bis" type="date" className={cn(eingabe, "h-10")} value={bis} onChange={(e) => setBis(e.target.value)} />
              </Feld>
              <Button size="sm" variant="secondary" icon={Download} disabled={ids.length !== 1 || !von || !bis || !!a.laeuft} onClick={async () => nachAktion(await a.los("nachforderung", url, { aktion: "nachforderung", teilnahmeId: ids[0], von, bis }, "Nachforderung (CR_REQ_PT) gesendet."))}>
                Nachfordern
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-500">Teilnahmefaktor ganzzahlig 1–100 %, eine Änderung je Tag und Zählpunkt; Abmeldungen nicht rückwirkend. Ab {vierAugenAb} Teilnahmen gibt der Vorstand frei (Vier-Augen-Prinzip).</p>
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-500">Ihre Rolle erlaubt das Lesen der EDA-Kommunikation; Prozesse löst die Betriebsführung (Organisator) aus.</p>
      )}
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <FehlerBox>{a.fehler}</FehlerBox>
      <Fehlerliste details={a.details} />
    </div>
  );
}

/** Massenaktionen und Simulator */
export function EdaMassenaktionen({ url, darf, simulator, kennzahlen }) {
  const a = useAktion();
  const [xml, setXml] = useState("");
  if (!darf) return <p className="text-[13.5px] text-ink-500">Massenaktionen löst die Betriebsführung (Organisator) aus.</p>;
  const knopf = (k, label, icon, body, text, variant = "secondary") => (
    <Button size="sm" variant={variant} icon={icon} disabled={!!a.laeuft} onClick={() => a.los(k, url, body, text)}>
      {a.laeuft === k ? "Läuft …" : label}
    </Button>
  );
  const vorschau = a.details?.erinnerungen?.[0] || a.details?.liste?.[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {knopf("erneut", `Ausstehende Zustimmungen erneut anstoßen${kennzahlen?.abgelehnt || kennzahlen?.zustimmungOffen ? ` (${(kennzahlen.abgelehnt || 0) + (kennzahlen.zustimmungOffen || 0)})` : ""}`, RefreshCw, { aktion: "erneut" }, (r) => `${r.erneut} Anmeldung(en) neu gestartet, ${r.erinnert} Erinnerung(en) an Mitglieder${r.uebersprungen.length ? `, ${r.uebersprungen.length} übersprungen (Responsecode verlangt Klärung)` : ""}.`, "primary")}
        {knopf("erinnern", "Alle offenen Zustimmungen erinnern", BellRing, { aktion: "erinnern" }, (r) => `${r.erinnert} Erinnerung(en): ${r.perPortal} über Portal/E-Mail, ${r.vorbereitet} als Text vorbereitet.`)}
        {knopf("podlist", "Zählpunktliste anfordern (Abgleich)", ListChecks, { aktion: "podlist" }, (r) => (r.bereitsOffen ? "Eine Anforderung läuft bereits." : "EC_PODLIST angefordert – Abgleich im Prozessdetail."))}
        {knopf("fristenlauf", "Fristenlauf jetzt", Timer, { aktion: "fristenlauf" }, (r) => `${r.aktionen.length} Frist-Aktion(en) ausgeführt.`)}
      </div>
      {simulator?.aktiv && (
        <div className="rounded-2xl bg-navy-50 p-4 ring-1 ring-inset ring-navy-100">
          <p className="text-[13.5px] font-semibold text-navy-900">Simulator-Netzbetreiber (Test und Vorführung)</p>
          <p className="mt-1 text-[13px] text-navy-900/80">1 Simulationstag ≈ {simulator.zeitrafferSekunden} s. Ausstehende Antworten: {simulator.ausstehend}.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {knopf("sim-zustellen", "Alle ausstehenden Antworten jetzt zustellen", Send, { aktion: "simulator", simulatorAktion: "zustellen", alle: true }, (r) => `${r.zugestellt} Nachricht(en) zugestellt und verarbeitet.`)}
            {knopf("sim-daten", "Energiedaten für gestern liefern", Download, { aktion: "simulator", simulatorAktion: "energiedaten" }, (r) => `${r.nachrichten} CR_MSG empfangen (${r.weitergeleitet ?? r.nachrichten} an Energiedaten weitergegeben), ${r.luecken} Lieferlücke(n) simuliert.`)}
          </div>
        </div>
      )}
      <details className="rounded-2xl ring-1 ring-inset ring-ink-200/80">
        <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-ink-900">EDA-Nachricht manuell einspielen (z. B. Export aus dem EDA-Anwenderportal)</summary>
        <div className="space-y-3 border-t border-ink-100 px-4 py-4">
          <textarea className={cn(textbereich, "font-mono text-[12.5px]")} rows={6} value={xml} onChange={(e) => setXml(e.target.value)} placeholder="XML der Nachricht einfügen" aria-label="XML der EDA-Nachricht" />
          <Button size="sm" variant="secondary" icon={FileUp} disabled={!xml.trim() || !!a.laeuft} onClick={async () => {
            const r = await a.los("eingang", url, { aktion: "eingang", xml }, (x) => (x.doppelt ? "Diese Nachricht ist bereits verarbeitet (gleiche Message-ID)." : x.ok ? `Verarbeitet: ${x.ereignisse.join(", ") || "protokolliert"}.` : `Nicht verarbeitbar: ${(x.fehler || []).join(" ")}`));
            if (r?.ok) setXml("");
          }}>
            Einspielen
          </Button>
        </div>
      </details>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <FehlerBox>{a.fehler}</FehlerBox>
      <Fehlerliste details={a.details} />
      {vorschau && (
        <details className="rounded-2xl bg-white ring-1 ring-inset ring-ink-200/80" open>
          <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-ink-900">Erinnerung an {vorschau.name || "das Mitglied"} ({vorschau.kanal === "portal" ? "über Portal und E-Mail versendet" : vorschau.email ? `bitte an ${vorschau.email} senden` : "bitte zustellen"})</summary>
          <pre className="whitespace-pre-wrap border-t border-ink-100 px-4 py-4 font-sans text-[13.5px] leading-relaxed text-ink-800">{vorschau.betreff}{"\n\n"}{vorschau.text}</pre>
        </details>
      )}
    </div>
  );
}

/** Aktionen im Prozessdetail */
export function EdaProzessAktionen({ url, prozess, darf }) {
  const a = useAktion();
  if (!darf) return null;
  const neu = ["abgelehnt", "zeitueberschreitung", "fehler"].includes(prozess.status) && ["EC_REQ_ONL", "EC_REQ_OFF"].includes(prozess.prozesscode) && !prozess.nachfolgerId && prozess.teilnahmeId;
  if (!neu) return null;
  return (
    <div className="space-y-3">
      <Button size="sm" icon={RefreshCw} disabled={!!a.laeuft} onClick={() => a.los("erneut", url, { aktion: "erneut", teilnahmeIds: [prozess.teilnahmeId] }, (r) => (r.erneut ? "Anmeldung neu gestartet." : r.uebersprungen.length ? `Nicht neu gestartet: ${r.uebersprungen[0].grund}` : "Keine Änderung."))}>
        Anmeldung erneut anstoßen
      </Button>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <FehlerBox>{a.fehler}</FehlerBox>
      <Fehlerliste details={a.details} />
    </div>
  );
}

/** Reklamation an den Netzbetreiber: Vorlage bearbeiten, protokollieren, Antwort erfassen */
export function EdaReklamation({ url, vorlage, netzbetreiber, befunde = 0, darf, reklamationen = [] }) {
  const a = useAktion();
  const [betreff, setBetreff] = useState(vorlage?.betreff || "");
  const [text, setText] = useState(vorlage?.text || "");
  const [antwort, setAntwort] = useState({});
  const csvUrl = useMemo(() => (vorlage?.csv ? `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${vorlage.csv}`)}` : ""), [vorlage]);
  const mailto = netzbetreiber?.kontaktEmail ? `mailto:${netzbetreiber.kontaktEmail}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text.slice(0, 1800))}` : "";
  return (
    <div className="space-y-5">
      {darf && befunde > 0 && (
        <div className="space-y-3">
          <Feld id="rek-betreff" label="Betreff">
            <input id="rek-betreff" className={eingabe} value={betreff} onChange={(e) => setBetreff(e.target.value)} />
          </Feld>
          <Feld id="rek-text" label="Text der Reklamation" hinweis="Vorlage mit Befunden, Rechtsgrundlagen und Antwortfrist – vor dem Versand prüfen und bei Bedarf anpassen.">
            <textarea id="rek-text" className={cn(textbereich, "min-h-[260px] text-[13.5px]")} value={text} onChange={(e) => setText(e.target.value)} />
          </Feld>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={Check} disabled={!!a.laeuft || !text.trim()} onClick={() => a.los("anlegen", url, { aktion: "reklamation", reklamationAktion: "anlegen", netzbetreiberId: netzbetreiber?.id, betreff, text }, (r) => `Reklamation ${r.prozess.id} protokolliert – Antwortfrist ${tag(r.prozess.fristBis)}.`)}>
              Als versendet protokollieren
            </Button>
            {mailto && <Button size="sm" variant="secondary" icon={Mail} href={mailto}>E-Mail öffnen</Button>}
            {csvUrl && (
              <a className={LINK_KNOPF} href={csvUrl} download="befunde.csv">
                <Download aria-hidden="true" className="h-4 w-4" /> Befundliste (CSV)
              </a>
            )}
          </div>
        </div>
      )}
      {darf && befunde === 0 && <p className="text-[13.5px] text-ink-500">Keine Befunde für diesen Netzbetreiber – keine Reklamation nötig.</p>}
      {reklamationen.length > 0 && (
        <div className="space-y-3">
          <p className="text-[13.5px] font-semibold text-ink-900">Reklamationen (Protokoll)</p>
          {reklamationen.map((r) => (
            <div key={r.id} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{r.ergebnis?.betreff || r.id}</p>
                  <p className="text-[12.5px] text-ink-500">{r.ergebnis?.netzbetreiberName} · {r.statusLabel} · {r.ergebnis?.befunde ?? "–"} Befunde</p>
                </div>
                <Ampel ampel={r.ampel} />
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <a className={LINK_KNOPF} href={`${url}?akte=${r.id}&datei=1`} download>
                  <Download aria-hidden="true" className="h-4 w-4" /> Beschwerdeakte
                </a>
                {darf && r.status !== "abgeschlossen" && (
                  <>
                    <input className={cn(eingabe, "h-10 min-w-0 flex-1 sm:max-w-md")} placeholder="Antwort des Netzbetreibers einfügen" value={antwort[r.id] || ""} onChange={(e) => setAntwort((x) => ({ ...x, [r.id]: e.target.value }))} aria-label="Antwort des Netzbetreibers" />
                    <Button size="sm" variant="secondary" disabled={!antwort[r.id]?.trim() || !!a.laeuft} onClick={() => a.los(`ant-${r.id}`, url, { aktion: "reklamation", reklamationAktion: "antwort", prozessId: r.id, antwortText: antwort[r.id] }, "Antwort protokolliert.")}>Antwort erfassen</Button>
                    <Button size="sm" variant="secondary" disabled={!!a.laeuft} onClick={() => a.los(`erl-${r.id}`, url, { aktion: "reklamation", reklamationAktion: "erledigt", prozessId: r.id }, "Reklamation erledigt.")}>Erledigt</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}

/**
 * Vier-Augen-Freigaben für den Vorstand (Einbindung z. B. in /portal/eg/[id]/verwaltung – WP1/WP6):
 * <EdaFreigaben gemeinschaftId={id} freigaben={…} darf={…} /> – Daten aus GET /api/portal/eg/[id]/eda.
 */
export function EdaFreigaben({ gemeinschaftId, freigaben = [], darf = false }) {
  const a = useAktion();
  const [auswahl, setAuswahl] = useState(new Set(freigaben.map((p) => p.id)));
  const [grund, setGrund] = useState("");
  const url = `/api/portal/eg/${gemeinschaftId}/eda`;
  if (!freigaben.length) return <p className="text-[13.5px] text-ink-500">Keine EDA-Vorgänge warten auf Ihre Freigabe.</p>;
  const ids = [...auswahl];
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-inset ring-ink-200/80">
        {freigaben.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-3">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-ov-600" checked={auswahl.has(p.id)} onChange={() => setAuswahl((s) => {
              const n = new Set(s);
              if (n.has(p.id)) n.delete(p.id);
              else n.add(p.id);
              return n;
            })} aria-label={`${p.kurz} ${p.mitgliedName} auswählen`} />
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{p.kurz}: {p.mitgliedName || p.zaehlpunktnummer}</p>
              <p className="text-[12.5px] text-ink-500">{p.prozesscode === "CM_REV_SP" ? `Abmeldung zum ${tag(p.parameter?.zum)}` : `Teilnahmefaktor ${p.parameter?.vorher} → ${p.parameter?.teilnahmefaktor} % ab ${tag(p.parameter?.ab)}`} · <Zp nr={p.zaehlpunktnummer} /></p>
            </div>
          </li>
        ))}
      </ul>
      {darf ? (
        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" icon={Check} disabled={!ids.length || !!a.laeuft} onClick={() => a.los("frei", url, { prozessIds: ids, entscheidung: "erteilen" }, (r) => `${r.freigegeben} freigegeben und an den Netzbetreiber gesendet${r.fehler.length ? `, ${r.fehler.length} nicht möglich` : ""}.`)}>
            Freigeben
          </Button>
          <input className={cn(eingabe, "h-10 min-w-0 flex-1 sm:max-w-xs")} placeholder="Grund bei Ablehnung" value={grund} onChange={(e) => setGrund(e.target.value)} aria-label="Grund der Ablehnung" />
          <Button size="sm" variant="secondary" icon={X} disabled={!ids.length || !grund.trim() || !!a.laeuft} onClick={() => a.los("ab", url, { prozessIds: ids, entscheidung: "ablehnen", grund }, (r) => `${r.abgelehnt} abgelehnt.`)}>
            Ablehnen
          </Button>
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-500">Freigeben kann nur der Vorstand (Obmann/Obfrau, Stellvertretung).</p>
      )}
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <FehlerBox>{a.fehler}</FehlerBox>
      <Fehlerliste details={a.details} />
    </div>
  );
}

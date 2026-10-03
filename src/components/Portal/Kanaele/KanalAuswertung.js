"use client";

// src/components/Portal/Kanaele/KanalAuswertung.js
//
// Backoffice: Leads je Gruppen- und Partnerkanal und je Kennung und Land (Welle 2, Paket GRP).
// Daten: GET /api/admin/kanaele (nur Zählwerte, keine Personendaten). Dazu das Partner-Register (nur TODO-
// Platzhalter, bis der Inhaber echte Einträge freigibt) und der Verweis-Baustein zum Kopieren für die Gruppe.
// Keine Provisions-, Vergütungs- oder Erfolgsaussagen.
//
// Einbau: Seite /portal/admin/kanaele (eigene Seite außerhalb dieses Pakets) →
//   <KanalAuswertung />  – lädt selbst; optional `daten` für Vorschau/Tests.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Copy, Handshake, Link2, ListChecks, Users } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, Tabelle, zelle } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { verweisHtml, verweisText, verweisUrl } from "@/components/Gruppe/VerweisBaustein";
import Offenlegung from "@/components/Gruppe/Offenlegung";
import { mediumFuerArt } from "@/lib/gruppe/partner-register";

const LAND_LABEL = { DE: "DE", AT: "AT", CH: "CH", "–": "ohne Land" };
const ZEITRAEUME = [
  [30, "30 Tage"],
  [90, "90 Tage"],
  [365, "12 Monate"],
];

function Umschalter({ werte, wert, setzen, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-ink-100 p-1 text-[13px] font-semibold">
      {werte.map(([k, t]) => (
        <button key={k} type="button" role="radio" aria-checked={wert === k} onClick={() => setzen(k)} className={cn("rounded-full px-3 py-1.5 transition-colors", wert === k ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900")}>
          {t}
        </button>
      ))}
    </div>
  );
}

function LaenderZellen({ laender, reihenfolge }) {
  return reihenfolge.map((l) => (
    <td key={l} className={cn(zelle, "tabular-nums", !laender[l] && "text-ink-400")}>
      {laender[l] || 0}
    </td>
  ));
}

function StatusEtikett({ status, wirksam }) {
  if (status === "aktiv") return <Badge ton="ok">aktiv</Badge>;
  if (status === "entwurf") return <Badge ton="warn">{wirksam ? "Entwurf (nur Test)" : "Entwurf – greift nicht"}</Badge>;
  return <Badge ton="danger">{status}</Badge>;
}

/** Verweis-Baustein: Kennung und Ziel wählen, HTML/Text kopieren (Einbau durch die Gruppe, nicht aus diesem Repo). */
function VerweisGenerator({ register, ziele }) {
  const wirksam = register.filter((e) => e.wirksam);
  const [kennung, setKennung] = useState(wirksam[0]?.kennung || "");
  const eintrag = wirksam.find((e) => e.kennung === kennung);
  const [ziel, setZiel] = useState("start");
  const [format, setFormat] = useState("html");
  const [kopiert, setKopiert] = useState(false);
  const zielOk = eintrag?.ziele.includes(ziel) ? ziel : "start";
  const code = useMemo(() => (kennung ? (format === "html" ? verweisHtml({ kennung, ziel: zielOk }) : verweisText({ kennung, ziel: zielOk })) : null), [kennung, zielOk, format]);
  const url = kennung ? verweisUrl({ kennung, ziel: zielOk }) : null;

  if (!wirksam.length) return <Leer icon={Link2} titel="Keine wirksame Kennung" text="Im Produktionsmodus greifen nur aktive Register-Einträge. Echte Einträge trägt der Inhaber ein (E9)." />;

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(code || "");
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      setKopiert(false);
    }
  };

  const feld = "mt-1 block w-full rounded-xl border border-ink-350 bg-white px-3 py-2.5 text-[14px] text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ov-600";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[13px] font-semibold text-ink-700">
          Kennung
          <select className={feld} value={kennung} onChange={(e) => setKennung(e.target.value)}>
            {wirksam.map((e) => (
              <option key={e.kennung} value={e.kennung}>
                {e.kennung} ({e.land})
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-semibold text-ink-700">
          Zielseite
          <select className={feld} value={zielOk} onChange={(e) => setZiel(e.target.value)}>
            {ziele
              .filter((z) => eintrag?.ziele.includes(z.id) || z.id === "start")
              .map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
          </select>
        </label>
        <div className="text-[13px] font-semibold text-ink-700">
          <span aria-hidden="true">Format</span>
          <div className="mt-1">
            <Umschalter label="Format" werte={[["html", "HTML"], ["text", "Text"]]} wert={format} setzen={setFormat} />
          </div>
        </div>
      </div>
      {url && (
        <p className="text-[13px] text-ink-600">
          Kurzlink: <code className="break-all rounded bg-ink-100 px-1.5 py-0.5 text-[12.5px] text-ink-800">{url}</code> → utm_medium={mediumFuerArt(eintrag?.art)}
        </p>
      )}
      <div className="relative">
        <pre className="max-h-72 overflow-auto rounded-2xl bg-navy-950 p-4 pt-12 text-[12.5px] leading-relaxed text-white/90" tabIndex={0} aria-label="Vorlage zum Kopieren">
          <code>{code}</code>
        </pre>
        <button type="button" onClick={kopieren} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20">
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          {kopiert ? "Kopiert" : "Kopieren"}
        </button>
        <span className="sr-only" aria-live="polite">
          {kopiert ? "Vorlage kopiert" : ""}
        </span>
      </div>
      <Hinweis ton="neutral" titel="Einbau nur durch die Gruppe bzw. den Partner">
        Die Vorlage wird auf oekovolt.de/.com bzw. beim Partner eingebaut – nicht aus diesem System. Kein Skript, kein Pixel, kein Cookie. Wortlaut: Prüfung Rechtsabteilung.
      </Hinweis>
    </div>
  );
}

export default function KanalAuswertung({ daten: vorgabe = null }) {
  const [tage, setTage] = useState(365);
  const [daten, setDaten] = useState(vorgabe);
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState(!vorgabe);

  const laden = useCallback(async (t) => {
    setLaedt(true);
    setFehler("");
    try {
      const res = await fetch(`/api/admin/kanaele?tage=${t}`, { credentials: "same-origin", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || `Fehler ${res.status}`);
      setDaten(json);
    } catch (e) {
      setFehler(e.message || "Laden fehlgeschlagen.");
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    if (!vorgabe) laden(tage);
  }, [laden, tage, vorgabe]);

  const a = daten?.auswertung;
  const reihenfolge = a?.laender || ["DE", "AT", "CH", "–"];
  const summe = a ? a.kanaele.reduce((s, k) => s + k.anfragen, 0) : 0;
  const vorschauHerkunft = useMemo(() => {
    const e = daten?.register?.find((x) => x.wirksam && x.art !== "gruppe") || daten?.register?.find((x) => x.wirksam);
    return e ? { utm_source: e.kennung, utm_medium: mediumFuerArt(e.art) } : { referrer: "oekovolt.de" };
  }, [daten]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Anfragen über offengelegte Verweise der ÖKOVOLT Gruppe und von Partnern – gezählt nach Kanal, Kennung und Land. Nur Zählwerte, keine Personendaten, keine Vergütung.
        </p>
        <Umschalter label="Zeitraum" werte={ZEITRAEUME} wert={tage} setzen={setTage} />
      </div>

      {fehler && (
        <Hinweis ton="danger" titel="Auswertung nicht verfügbar">
          {fehler}
        </Hinweis>
      )}
      {daten?.unvollstaendig && <Hinweis ton="warn">Sehr viele Vorgänge im Zeitraum – die Auswertung umfasst nur die neuesten 2.000.</Hinweis>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kennzahl label="Anfragen über Gruppe" wert={a ? a.kanaele[0].anfragen : "–"} icon={Building2} laedt={laedt && !a} hinweis={a ? `von ${a.gesamt} Anfragen gesamt` : undefined} />
        <Kennzahl label="Anfragen über Partner" wert={a ? a.kanaele[1].anfragen : "–"} icon={Handshake} laedt={laedt && !a} hinweis={a ? `${a.kennungen.filter((k) => k.kanal === "Partner" && k.kennung).length} Kennungen mit Anfragen` : undefined} />
        <Kennzahl label="Register-Einträge" wert={daten?.register ? daten.register.length : "–"} icon={ListChecks} laedt={laedt && !daten} hinweis={daten?.register ? `${daten.register.filter((e) => e.status === "aktiv").length} aktiv · Rest TODO-Inhaber` : undefined} />
      </div>

      <Karte titel="Anfragen je Kanal und Land" untertitel={daten ? `Eingang in den letzten ${daten.zeitraum.tage} Tagen` : "Wird geladen …"} laedt={laedt && !a} icon={Users}>
        {a && summe === 0 ? (
          <Leer icon={Handshake} titel="Noch keine Anfragen über Gruppe oder Partner" text="Sobald Verweise mit Kennung eingebaut sind, erscheinen die Anfragen hier – je Kanal, Kennung und Land." />
        ) : a ? (
          <Tabelle kopf={["Kanal", ...reihenfolge.map((l) => LAND_LABEL[l]), "Gesamt", "Abgeschlossen"]}>
            {a.kanaele.map((k) => (
              <tr key={k.kanal}>
                <th scope="row" className={cn(zelle, "font-semibold text-ink-900")}>{k.kanal}</th>
                <LaenderZellen laender={k.laender} reihenfolge={reihenfolge} />
                <td className={cn(zelle, "font-semibold tabular-nums")}>{k.anfragen}</td>
                <td className={cn(zelle, "tabular-nums")}>{k.abgeschlossen}</td>
              </tr>
            ))}
          </Tabelle>
        ) : null}
      </Karte>

      {a && summe > 0 && (
        <Karte titel="Anfragen je Kennung" untertitel="Kennungen aus dem Partner-Register; ohne gültige Kennung zählt nur der echte Gruppen-Verweis.">
          <Tabelle kopf={["Kennung", "Kanal", "Register", ...reihenfolge.map((l) => LAND_LABEL[l]), "Gesamt"]}>
            {a.kennungen.map((k) => (
              <tr key={`${k.kanal}:${k.kennung || "ohne"}`}>
                <th scope="row" className={cn(zelle, "whitespace-nowrap font-mono text-[13px] font-medium text-ink-900")}>{k.kennung || <span className="font-sans text-ink-500">ohne Kennung</span>}</th>
                <td className={zelle}>{k.kanal}</td>
                <td className={zelle}>{k.registerStatus ? <Badge ton={k.registerStatus === "aktiv" ? "ok" : "warn"}>{k.registerStatus}</Badge> : "–"}</td>
                <LaenderZellen laender={k.laender} reihenfolge={reihenfolge} />
                <td className={cn(zelle, "font-semibold tabular-nums")}>{k.anfragen}</td>
              </tr>
            ))}
          </Tabelle>
        </Karte>
      )}

      {daten?.register && (
        <Karte titel="Partner-Register" untertitel="Kennungen sind kurze, nicht personenbezogene Slugs. Echte Gruppengesellschaften und Partner trägt der Inhaber ein (E9).">
          <Tabelle kopf={["Kennung", "Art", "Land", "Status", "Zielseiten", "Offen"]}>
            {daten.register.map((e) => (
              <tr key={e.kennung}>
                <th scope="row" className={cn(zelle, "whitespace-nowrap font-mono text-[13px] font-medium text-ink-900")}>{e.kennung}</th>
                <td className={zelle}>{e.artLabel}</td>
                <td className={zelle}>{e.land}</td>
                <td className={zelle}>
                  <StatusEtikett status={e.status} wirksam={e.wirksam} />
                </td>
                <td className={cn(zelle, "text-[13px] text-ink-600")}>{e.ziele.join(", ")}</td>
                <td className={cn(zelle, "max-w-[280px] text-[13px] text-ink-600")}>{e.todo}</td>
              </tr>
            ))}
          </Tabelle>
        </Karte>
      )}

      {daten?.register && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Karte titel="Verweis-Baustein für die Gruppe" icon={Link2}>
            <VerweisGenerator register={daten.register} ziele={daten.ziele || []} />
          </Karte>
          <Karte titel="Vorschau Offenlegung" untertitel="So sehen Besucher den Hinweis auf der Zielseite." innen="p-0 pb-5 md:pb-6">
            <Offenlegung vorschau={vorschauHerkunft} className="!px-5 md:!px-6" />
          </Karte>
        </div>
      )}
    </div>
  );
}

"use client";

// Vorlage-Assistent „Neues Projekt aus Fläche“: Fläche wählen (oder leer starten) → Vorschlag für Typ, Land, MWp →
// Vorschau des Meilenstein-Plans mit Soll-Terminen und kritischem Pfad → anlegen. Plan und Termine rechnet der Server.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Badge, Karte } from "@/components/Portal/ui";
import { FehlerBox, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { ENTWICKLUNG_TYPEN, KATEGORIEN, VERMARKTUNG, vermarktungLabel } from "@/lib/plattform/entwicklung";
import { BUNDESLAENDER, LAENDER } from "@/lib/plattform/konstanten";
import { senden } from "@/lib/plattform/client";
import { Knopf } from "./Formular";
import { datumKurz } from "./teile";

export default function Assistent({ auswahl, startFlaeche = "" }) {
  const router = useRouter();
  const [flaecheId, setFlaecheId] = useState(startFlaeche);
  const [d, setD] = useState({ titel: "", typ: "freiflaeche", land: "DE", bundesland: "", gemeinde: "", mwp: "", mwh: "", vermarktung: "eeg", projektleiterId: "", start: new Date().toISOString().slice(0, 10) });
  const [vorschau, setVorschau] = useState(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const setze = (k, w) => setD((x) => ({ ...x, [k]: w }));

  // Vorschlag aus Fläche übernehmen
  useEffect(() => {
    if (!flaecheId) return;
    let aktiv = true;
    setLaden(true);
    fetch(`/api/admin/entwicklung/assistent?flaecheId=${encodeURIComponent(flaecheId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!aktiv || !j.ok) return;
        const v = j.vorschlag;
        setD((x) => ({ ...x, titel: v.titel || x.titel, typ: v.typ, land: v.land, bundesland: v.bundesland || "", gemeinde: v.gemeinde || "", mwp: v.mwp ?? "" }));
      })
      .catch(() => {}) // Vorschlag ist optional – ohne Antwort bleibt das Formular leer bedienbar
      .finally(() => aktiv && setLaden(false));
    return () => {
      aktiv = false;
    };
  }, [flaecheId]);

  // Plan-Vorschau je Land/Typ/Start
  useEffect(() => {
    let aktiv = true;
    const q = new URLSearchParams({ land: d.land, typ: d.typ, start: d.start });
    fetch(`/api/admin/entwicklung/assistent?${q}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => aktiv && j.ok && setVorschau(j))
      .catch(() => {});
    return () => {
      aktiv = false;
    };
  }, [d.land, d.typ, d.start]);

  const flaeche = auswahl.flaechen.find((f) => f.id === flaecheId);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Karte titel="1. Fläche und Eckdaten" untertitel="Aus einer Plattform-Fläche starten oder frei anlegen">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLaeuft(true);
            setFehler("");
            try {
              const r = await senden("/api/admin/entwicklung", { body: { ...d, mwp: d.mwp === "" ? null : Number(String(d.mwp).replace(",", ".")), mwh: d.mwh === "" ? null : Number(String(d.mwh).replace(",", ".")), flaecheId: flaecheId || undefined, zielCod: vorschau?.vorschlag?.zielCod } });
              router.push(`/portal/admin/entwicklung/${r.projekt.id}`);
            } catch (x) {
              setFehler(x.message);
              setLaeuft(false);
            }
          }}
        >
          <Feld id="as-flaeche" label="Plattform-Fläche (optional)" hinweis={flaeche ? `${flaeche.eigentuemer} · Status ${flaeche.status}${flaeche.verknuepft ? " · bereits in einem Projekt" : ""}` : "Der Eigentümer sieht nach dem Anlegen den vereinfachten Fortschritt."}>
            <select id="as-flaeche" value={flaecheId} onChange={(e) => setFlaecheId(e.target.value)} className={auswahlfeld}>
              <option value="">– ohne Plattform-Fläche –</option>
              {auswahl.flaechen.map((f) => <option key={f.id} value={f.id} disabled={f.verknuepft}>{f.bezeichnung} · {f.ha || "?"} ha · {f.bundesland || f.land}{f.verknuepft ? " (verknüpft)" : ""}</option>)}
            </select>
          </Feld>
          {laden && <p className="flex items-center gap-2 text-[13px] text-ink-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Vorschlag wird berechnet …</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="as-titel" label="Projekttitel" pflicht className="sm:col-span-2"><input id="as-titel" value={d.titel} onChange={(e) => setze("titel", e.target.value)} className={eingabe} required /></Feld>
            <Feld id="as-typ" label="Typ"><select id="as-typ" value={d.typ} onChange={(e) => setze("typ", e.target.value)} className={auswahlfeld}>{Object.entries(ENTWICKLUNG_TYPEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
            <Feld id="as-land" label="Land"><select id="as-land" value={d.land} onChange={(e) => { setze("land", e.target.value); setze("bundesland", ""); }} className={auswahlfeld}>{Object.entries(LAENDER).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
            <Feld id="as-bl" label="Bundesland / Kanton" pflicht><select id="as-bl" value={d.bundesland} onChange={(e) => setze("bundesland", e.target.value)} className={auswahlfeld} required><option value="">– bitte wählen –</option>{(BUNDESLAENDER[d.land] || []).map((b) => <option key={b} value={b}>{b}</option>)}</select></Feld>
            <Feld id="as-gem" label="Gemeinde"><input id="as-gem" value={d.gemeinde} onChange={(e) => setze("gemeinde", e.target.value)} className={eingabe} /></Feld>
            <Feld id="as-mwp" label={d.typ === "speicher" ? "Leistung (MW)" : "Leistung (MWp)"} hinweis={flaeche ? "Vorschlag aus der Fläche (ca. 1,1 ha je MWp, Agri-PV größer)" : undefined}><input id="as-mwp" inputMode="decimal" value={d.mwp} onChange={(e) => setze("mwp", e.target.value)} className={eingabe} /></Feld>
            {["speicher", "hybrid"].includes(d.typ) && <Feld id="as-mwh" label="Speicher (MWh)"><input id="as-mwh" inputMode="decimal" value={d.mwh} onChange={(e) => setze("mwh", e.target.value)} className={eingabe} /></Feld>}
            <Feld id="as-verm" label="Vermarktung"><select id="as-verm" value={d.vermarktung} onChange={(e) => setze("vermarktung", e.target.value)} className={auswahlfeld}>{Object.keys(VERMARKTUNG).map((k) => <option key={k} value={k}>{vermarktungLabel(k, d.land)}</option>)}</select></Feld>
            <Feld id="as-pl" label="Projektleitung"><select id="as-pl" value={d.projektleiterId} onChange={(e) => setze("projektleiterId", e.target.value)} className={auswahlfeld}><option value="">– ich –</option>{auswahl.projektleiter.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Feld>
            <Feld id="as-start" label="Projektstart"><input id="as-start" type="date" value={d.start} onChange={(e) => setze("start", e.target.value)} className={eingabe} /></Feld>
          </div>
          <FehlerBox>{fehler}</FehlerBox>
          <Knopf laeuft={laeuft}><Sparkles aria-hidden="true" className="h-4 w-4" />Projekt mit Plan anlegen</Knopf>
        </form>
      </Karte>
      <Karte titel="2. Meilenstein-Plan nach Vorlage" untertitel={vorschau ? `${LAENDER[d.land]} · ${ENTWICKLUNG_TYPEN[d.typ]} · ${vorschau.plan.length} Meilensteine · ca. ${vorschau.monateBisCod} Monate bis Inbetriebnahme (Ziel-COD ${vorschau.vorschlag.zielCod})` : "wird geladen …"} innen="p-0">
        {vorschau && (
          <ol className="divide-y divide-ink-100">
            {vorschau.plan.map((m) => (
              <li key={m.schluessel} className="flex items-start justify-between gap-3 px-5 py-2.5 md:px-6">
                <div className="min-w-0">
                  <p className={m.kritisch ? "text-[13.5px] font-bold text-navy-900" : "text-[13.5px] font-semibold text-ink-900"}>{m.titel}</p>
                  <p className="text-[12px] text-ink-500">{KATEGORIEN[m.kategorie]?.label} · {datumKurz(m.sollStart)} – {datumKurz(m.sollEnde)}{m.dokumentPflicht?.length ? ` · Nachweis: ${m.dokumentPflicht.join(", ")}` : ""}</p>
                </div>
                <span className="flex shrink-0 gap-1">{m.kritisch && <Badge ton="dunkel">kritisch</Badge>}{m.gutachten && <Badge>Gutachten</Badge>}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="border-t border-ink-100 p-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
          Planwerte zur Vorbelegung – Verfahrensdauern hängen von Gemeinde, Behörden und Saison (Kartierungen) ab und sind im Projekt je Meilenstein änderbar.
        </div>
      </Karte>
    </div>
  );
}

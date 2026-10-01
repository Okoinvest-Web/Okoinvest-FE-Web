"use client";

// Portal-Börse: Umschalter „Karten | Tabelle“. Karten = bestehende BoerseListe (unverändert),
// Tabelle = gemeinsame DatenListe mit Profi-Funktionen (Sortierung, Filter-Chips, Spalten,
// gespeicherte Ansichten, Mehrfachauswahl: merken / vergleichen). Wahl bleibt im Browser gespeichert.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Columns3, Heart, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import BoerseListe from "@/components/Boerse/BoerseListe";
import DatenListe from "./DatenListe";
import { Badge, QualitaetsBalken } from "@/components/Portal/ui";
import { senden } from "@/lib/plattform/client";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { mwp, preisGesamt, preisText } from "@/lib/plattform/format";
import { PHASEN, phaseById } from "@/lib/invest/markt";
import { speicherLesen, speicherSchreiben } from "../speicher";

const SPEICHER = "oi-boerse-ansicht";

export default function BoerseAnsicht({ projekte, start }) {
  const router = useRouter();
  const [ansicht, setAnsicht] = useState("karten");
  useEffect(() => {
    const w = speicherLesen(SPEICHER, "karten");
    if (w === "tabelle") setAnsicht("tabelle");
  }, []);
  const waehlen = (a) => {
    setAnsicht(a);
    speicherSchreiben(SPEICHER, a);
  };

  async function merken(liste) {
    for (const p of liste) await senden(`/api/portal/boerse/${encodeURIComponent(p.id)}/merken`, { body: { an: true } });
    router.refresh();
    return `${liste.length} ${liste.length === 1 ? "Projekt" : "Projekte"} auf der Merkliste.`;
  }

  async function vergleichen(liste) {
    if (liste.length < 2 || liste.length > 4) throw new Error("Bitte wählen Sie 2 bis 4 Projekte für den Vergleich.");
    for (const p of liste.filter((x) => !x.meinInteresse?.gemerkt)) await senden(`/api/portal/boerse/${encodeURIComponent(p.id)}/merken`, { body: { an: true } });
    router.push(`/portal/boerse/vergleich?ids=${liste.map((p) => encodeURIComponent(p.id)).join(",")}`);
    return "Vergleich wird geöffnet …";
  }

  const umschalter = (
    <div role="group" aria-label="Darstellung" className="inline-flex rounded-full bg-white p-1 ring-1 ring-inset ring-ink-200">
      {[
        ["karten", "Karten", LayoutGrid],
        ["tabelle", "Tabelle", Rows3],
      ].map(([k, l, Icon]) => (
        <button key={k} type="button" aria-pressed={ansicht === k} onClick={() => waehlen(k)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold", ansicht === k ? "bg-navy-900 text-white" : "text-ink-600 hover:text-ink-900")}>
          <Icon aria-hidden="true" className="h-4 w-4" /> {l}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">{umschalter}</div>
      {ansicht === "karten" ? (
        <BoerseListe projekte={projekte} basisHref="/portal/boerse/" portal start={start} />
      ) : (
        <DatenListe
          id="portal-boerse"
          titel="Projekte"
          csvName="projektboerse"
          zeilen={projekte}
          start={start?.sortierung === "passung" ? { sortierung: { spalte: "passung", richtung: "ab" } } : {}}
          suche={{ platzhalter: "Titel, Region, Land", felder: (p) => [p.titel, p.region, p.bundesland, LAENDER[p.land], PROJEKT_TYPEN[p.typ]] }}
          spalten={[
            {
              id: "projekt", label: "Projekt", pflicht: true, mobil: "titel", klasse: "min-w-[260px]", wert: (p) => p.titel,
              zelle: (p) => (
                <>
                  <Link href={`/portal/boerse/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                  <p className="text-[12.5px] text-ink-500">{[p.region, p.bundesland].filter(Boolean).join(" · ")}</p>
                </>
              ),
            },
            { id: "typ", label: "Typ", wert: (p) => PROJEKT_TYPEN[p.typ] || p.typ, zelle: (p) => <span className="whitespace-nowrap">{PROJEKT_TYPEN[p.typ] || p.typ}</span> },
            { id: "land", label: "Land", wert: (p) => p.land, csvWert: (p) => LAENDER[p.land], zelle: (p) => <span title={LAENDER[p.land]}>{p.land}</span> },
            { id: "phase", label: "Phase", wert: (p) => PHASEN.findIndex((x) => x.id === p.phase), csvWert: (p) => phaseById(p.phase)?.label, zelle: (p) => <span className="whitespace-nowrap">{phaseById(p.phase)?.kurz || "–"}</span> },
            { id: "mwp", label: "Leistung", wert: (p) => p.mwp ?? null, zelle: (p) => <span className="ov-num whitespace-nowrap">{mwp(p.mwp)}</span> },
            { id: "preis", label: "Preis", wert: (p) => preisGesamt(p), csvWert: (p) => preisText(p), zelle: (p) => <span className="whitespace-nowrap text-ink-700">{preisText(p)}</span> },
            { id: "passung", label: "Passung", mobil: "badge", wert: (p) => p.matching?.score ?? null, zelle: (p) => (p.matching ? <Badge ton={p.matching.score >= 70 ? "ok" : "neutral"}>{p.matching.score} %</Badge> : <span className="text-ink-500">–</span>) },
            { id: "datenraum", label: "Datenraum", standard: false, wert: (p) => p.datenraumQualitaet ?? null, klasse: "min-w-[150px]", zelle: (p) => <QualitaetsBalken quote={p.datenraumQualitaet} label="Qualität" klein /> },
            {
              id: "interesse", label: "Mein Stand", mobil: "badge", wert: (p) => (p.meinInteresse ? (p.meinInteresse.status === "gemerkt" ? "Gemerkt" : statusInfo("interesse", p.meinInteresse.status).label) : ""),
              zelle: (p) =>
                p.meinInteresse ? (
                  <span className="inline-flex flex-wrap gap-1">
                    {p.meinInteresse.gemerkt && <Badge ton="ok"><Heart aria-hidden="true" className="h-3 w-3" /> Gemerkt</Badge>}
                    {p.meinInteresse.status !== "gemerkt" && <Badge ton="info">{statusInfo("interesse", p.meinInteresse.status).label}</Badge>}
                  </span>
                ) : (
                  <span className="text-ink-500">–</span>
                ),
            },
          ]}
          filter={[
            { id: "typ", label: "Typ", wert: (p) => p.typ, optionen: Object.entries(PROJEKT_TYPEN).map(([k, l]) => ({ wert: k, label: l })) },
            { id: "land", label: "Land", wert: (p) => p.land, optionen: Object.entries(LAENDER).map(([k, l]) => ({ wert: k, label: l })) },
            { id: "phase", label: "Phase", wert: (p) => p.phase, optionen: PHASEN.map((x) => ({ wert: x.id, label: x.label })) },
            { id: "merk", label: "Merkliste", wert: (p) => (p.meinInteresse?.gemerkt ? "ja" : "nein"), optionen: [{ wert: "ja", label: "Gemerkt" }, { wert: "nein", label: "Nicht gemerkt" }] },
          ]}
          ansichten={[
            { id: "passend", label: "Beste Passung", zustand: { sortierung: { spalte: "passung", richtung: "ab" } } },
            { id: "gross", label: "Größte zuerst", zustand: { sortierung: { spalte: "mwp", richtung: "ab" } } },
            { id: "merkliste", label: "Nur Merkliste", zustand: { filter: { merk: ["ja"] } } },
          ]}
          aktionen={[
            { id: "merken", label: "Merken", icon: Heart, ausfuehren: merken },
            { id: "vergleich", label: "Vergleichen", icon: Columns3, ausfuehren: vergleichen },
          ]}
        />
      )}
    </div>
  );
}

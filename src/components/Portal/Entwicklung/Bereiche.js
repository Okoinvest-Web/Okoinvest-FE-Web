"use client";

// Reiter des Entwicklungsprojekts im Backoffice (außer Plan): Stammdaten, Flächen, Risiken, Kontakte, Entscheidungen, Kosten,
// Freigaben & Gutachter, Übergaben. Alle Änderungen über /api/admin/entwicklung/[id]/… – Rechte und Regeln prüft der Server.

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge, Karte } from "@/components/Portal/ui";
import {
  BUDGET_KATEGORIEN, ENTSCHEIDUNG_ARTEN, ENTWICKLUNG_TYPEN, GUTACHTER_FACHGEBIETE, GUTACHTER_QUALIFIKATION, KONTAKT_ROLLEN_ENTWICKLUNG, PACHT_STATUS, RISIKO_KATEGORIEN, RISIKO_STATUS, RISIKO_STUFEN, VERMARKTUNG,
  vermarktungLabel,
} from "@/lib/plattform/entwicklung";
import { BUNDESLAENDER, LAENDER } from "@/lib/plattform/konstanten";
import { senden } from "@/lib/plattform/client";
import { AktionKnopf, Hochladen, SchnellFormular, eintragSenden } from "./Formular";
import { PachtBadge, RisikoBadge, datumKurz, eurKurz } from "./teile";

const opt = (obj) => Object.entries(obj).map(([k, l]) => ({ wert: k, label: typeof l === "string" ? l : l.label }));
const loeschen = (pid, art, id) => senden(`/api/admin/entwicklung/${pid}/eintraege?art=${art}&id=${id}`, { method: "DELETE" });

// ---------------------------------------------------------------- Stammdaten

export function Stammdaten({ projekt, auswahl }) {
  if (!projekt.darfBearbeiten) return null;
  const alleBl = [...new Set(Object.values(BUNDESLAENDER).flat())];
  return (
    <Karte titel="Stammdaten bearbeiten" untertitel="Änderungen werden im Aktivitätsprotokoll festgehalten">
      <SchnellFormular
        spalten={3}
        felder={[
          { name: "titel", label: "Projekttitel", typ: "text", breit: true, pflicht: true },
          { name: "typ", label: "Typ", typ: "auswahl", leer: false, optionen: opt(ENTWICKLUNG_TYPEN) },
          { name: "land", label: "Land", typ: "auswahl", leer: false, optionen: opt(LAENDER) },
          { name: "bundesland", label: "Bundesland / Kanton", typ: "auswahl", optionen: (BUNDESLAENDER[projekt.land] || alleBl).map((b) => ({ wert: b, label: b })), hinweis: "Nach Landwechsel erst speichern, dann wählen." },
          { name: "gemeinde", label: "Gemeinde", typ: "text" },
          { name: "landkreis", label: "Landkreis / Bezirk", typ: "text" },
          { name: "mwp", label: projekt.typ === "speicher" ? "Leistung (MW)" : "Leistung (MWp)", typ: "zahl" },
          { name: "mwh", label: "Speicher (MWh)", typ: "zahl" },
          { name: "nvp", label: "Netzverknüpfungspunkt", typ: "text" },
          { name: "netzbetreiber", label: "Netzbetreiber", typ: "text" },
          { name: "zielCod", label: "Ziel-Inbetriebnahme", typ: "monat" },
          { name: "vermarktung", label: "Vermarktung", typ: "auswahl", leer: false, optionen: Object.keys(VERMARKTUNG).map((k) => ({ wert: k, label: vermarktungLabel(k, projekt.land) })) },
          { name: "projektleiterId", label: "Projektleitung", typ: "auswahl", optionen: auswahl.projektleiter.map((u) => ({ wert: u.id, label: u.name })) },
          { name: "status", label: "Status", typ: "auswahl", leer: false, optionen: [{ wert: "aktiv", label: "In Entwicklung" }, { wert: "pausiert", label: "Pausiert" }, { wert: "abgebrochen", label: "Abgebrochen" }, ...(["boerse", "bau"].includes(projekt.status) ? [{ wert: projekt.status, label: projekt.statusLabel }] : [])] },
          { name: "wahrscheinlichkeit", label: "Wahrscheinlichkeit (0–1, leer = nach Phase)", typ: "zahl" },
          { name: "begruendung", label: "Begründung bei Statuswechsel", typ: "text", hinweis: "Wird ins Entscheidungsprotokoll übernommen." },
          { name: "beschreibung", label: "Beschreibung", typ: "mehrzeilig", breit: true },
        ]}
        start={{ ...projekt, projektleiterId: projekt.projektleiter?.id || "", wahrscheinlichkeit: projekt.wahrscheinlichkeit ?? "", mwh: projekt.mwh || "", begruendung: "" }}
        onSenden={(d) => senden(`/api/admin/entwicklung/${projekt.id}`, { method: "PATCH", body: d })}
      />
    </Karte>
  );
}

// ---------------------------------------------------------------- Übergaben

export function Uebergaben({ projekt }) {
  const rtb = ["rtb", "cod"].includes(projekt.phase);
  return (
    <Karte titel="Übergabe" untertitel="An die Projektbörse (Verkauf) oder an Bau & Betrieb (Anlage im Monitoring)">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
          <p className="font-semibold text-ink-900">Projektbörse</p>
          <p className="mt-1 text-[13px] text-ink-600">Legt einen Börsen-Entwurf mit Phase, MWp, Region und vertraulichen Angaben an. Veröffentlichung wie gewohnt über „Projekt-Freigabe“.</p>
          <div className="mt-3">
            {projekt.boerseProjektId ? (
              <Link href={`/portal/projekte/${projekt.boerseProjektId}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">Börsen-Projekt {projekt.boerseProjektId}<ExternalLink aria-hidden="true" className="h-4 w-4" /></Link>
            ) : projekt.darfBearbeiten ? (
              <AktionKnopf variante="navy" frage="Börsen-Projekt als Entwurf anlegen und dieses Entwicklungsprojekt als übergeben markieren?" meldung={(r) => `Börsen-Projekt ${r.boerseProjektId} angelegt.`} fn={() => senden(`/api/admin/entwicklung/${projekt.id}/aktion`, { body: { aktion: "uebergabe_boerse" } })}>An Börse übergeben</AktionKnopf>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/70">
          <p className="font-semibold text-ink-900">Bau & Betrieb</p>
          <p className="mt-1 text-[13px] text-ink-600">Ab Baureife (RTB): Anlage im Anlagen-Monitoring mit Status „Im Bau“ anlegen. Braucht zusätzlich das Recht „Anlagen & Monitoring“.</p>
          <div className="mt-3">
            {projekt.anlageId ? (
              <Link href={`/portal/admin/anlagen/${projekt.anlageId}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">Anlage {projekt.anlageId}<ExternalLink aria-hidden="true" className="h-4 w-4" /></Link>
            ) : projekt.darfBearbeiten ? (
              <AktionKnopf variante={rtb ? "primaer" : "sekundaer"} frage="Anlage im Monitoring anlegen und an Bau/Betrieb übergeben?" meldung={(r) => `Anlage ${r.anlageId} angelegt.`} fn={() => senden(`/api/admin/entwicklung/${projekt.id}/aktion`, { body: { aktion: "uebergabe_anlage" } })}>{rtb ? "An Bau übergeben" : "An Bau übergeben (erst ab RTB)"}</AktionKnopf>
            ) : null}
          </div>
        </div>
      </div>
    </Karte>
  );
}

// ---------------------------------------------------------------- Flächen

export function Flaechen({ projekt, auswahl }) {
  const darf = projekt.darfBearbeiten;
  return (
    <div className="space-y-6">
      <Karte titel="Projektflächen" untertitel={`${projekt.flaecheGesichertHa} von ${projekt.flaecheHa} ha gesichert (Option oder Pachtvertrag)`} innen="p-0">
        <ul className="divide-y divide-ink-100">
          {projekt.flaechen.map((f) => (
            <li key={f.id} className="px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{f.bezeichnung} <span className="font-normal text-ink-500">· {f.ha} ha</span></p>
                  <p className="text-[13px] text-ink-600">{f.eigentuemerName || "Eigentümer unbekannt"}{f.eigentuemerKonto ? ` · Portal-Konto ${f.eigentuemerKonto.email}` : ""}{f.pachtEurHa ? ` · ${eurKurz(f.pachtEurHa)}/ha·a` : ""}{f.pachtBeginn ? ` · ab ${datumKurz(f.pachtBeginn)}` : ""}</p>
                  {f.plattformFlaeche && <Link href={`/portal/flaechen/${f.plattformFlaeche.id}`} className="text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Plattform-Fläche {f.plattformFlaeche.id} – Eigentümer sieht den vereinfachten Fortschritt</Link>}
                  {f.notiz && <p className="mt-1 text-[12.5px] text-ink-500">{f.notiz}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <PachtBadge status={f.pachtStatus} />
                  {darf && <AktionKnopf klein variante="gefahr" frage="Projektfläche entfernen?" fn={() => loeschen(projekt.id, "flaeche", f.id)}>Entfernen</AktionKnopf>}
                </div>
              </div>
              {darf && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[13px] font-semibold text-ink-700">Pachtstatus und Angaben ändern</summary>
                  <div className="mt-3">
                    <SchnellFormular spalten={3} felder={[
                      { name: "pachtStatus", label: "Pachtstatus", typ: "auswahl", leer: false, optionen: opt(PACHT_STATUS) },
                      { name: "ha", label: "Fläche (ha)", typ: "zahl" },
                      { name: "pachtEurHa", label: "Pacht €/ha·a", typ: "zahl" },
                      { name: "pachtBeginn", label: "Pacht ab", typ: "datum" },
                      { name: "pachtEnde", label: "Pacht bis", typ: "datum" },
                      { name: "eigentuemerName", label: "Eigentümer (intern)", typ: "text" },
                      { name: "notiz", label: "Notiz (intern)", typ: "mehrzeilig", breit: true },
                    ]} start={{ ...f, pachtEurHa: f.pachtEurHa ?? "" }} onSenden={(d) => eintragSenden(projekt.id, "flaeche", d, f.id)} />
                  </div>
                </details>
              )}
            </li>
          ))}
          {!projekt.flaechen.length && <li className="px-6 py-6 text-[14px] text-ink-500">Noch keine Flächen verknüpft.</li>}
        </ul>
      </Karte>
      {darf && (
        <Karte titel="Fläche verknüpfen" untertitel="Plattform-Fläche wählen (Eigentümer erhält dann die vereinfachte Sicht) oder Fläche ohne Konto erfassen">
          <SchnellFormular zuruecksetzen knopf="Verknüpfen" meldung="Fläche verknüpft." spalten={3} felder={[
            { name: "flaecheId", label: "Plattform-Fläche", typ: "auswahl", leer: "– ohne Konto –", optionen: auswahl.flaechen.filter((f) => !f.verknuepft).map((f) => ({ wert: f.id, label: `${f.bezeichnung} · ${f.ha || "?"} ha · ${f.eigentuemer}` })) },
            { name: "bezeichnung", label: "Bezeichnung (ohne Konto)", typ: "text" },
            { name: "eigentuemerName", label: "Eigentümer (intern)", typ: "text" },
            { name: "ha", label: "Fläche (ha)", typ: "zahl" },
            { name: "pachtStatus", label: "Pachtstatus", typ: "auswahl", leer: false, optionen: opt(PACHT_STATUS) },
          ]} start={{ pachtStatus: "angefragt" }} onSenden={(d) => eintragSenden(projekt.id, "flaeche", Object.fromEntries(Object.entries(d).filter(([, w]) => w !== "" && w !== null)))} />
        </Karte>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Risiken

function Matrix({ risiken }) {
  const zelle = (e, a) => risiken.filter((r) => r.eintritt === e && r.auswirkung === a && r.status !== "geschlossen");
  return (
    <figure className="min-w-0">
      <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-[11px]">
        <span />
        {[1, 2, 3, 4, 5].map((a) => <span key={a} className="text-center font-semibold text-ink-500">{a}</span>)}
        {[5, 4, 3, 2, 1].map((e) => (
          <div key={e} className="contents">
            <span className="flex items-center pr-1 font-semibold text-ink-500">{e}</span>
            {[1, 2, 3, 4, 5].map((a) => {
              const s = e * a;
              const liste = zelle(e, a);
              return (
                <span key={a} title={liste.map((r) => r.titel).join(", ") || `${e} × ${a}`} className={`flex aspect-square items-center justify-center rounded-lg font-bold ${s >= 15 ? "bg-red-100 text-red-800" : s >= 8 ? "bg-sun-300/40 text-ink-900" : "bg-ov-50 text-ov-800"}`}>
                  {liste.length || ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-[12px] text-ink-500">Zeilen: Eintrittswahrscheinlichkeit 1–5 · Spalten: Auswirkung 1–5 · Zahl = offene Risiken</figcaption>
    </figure>
  );
}

export function Risiken({ projekt, auswahl }) {
  const darf = projekt.darfBearbeiten;
  const felder = [
    { name: "titel", label: "Risiko", typ: "text", breit: true, pflicht: true },
    { name: "kategorie", label: "Kategorie", typ: "auswahl", leer: false, optionen: opt(RISIKO_KATEGORIEN) },
    { name: "eintritt", label: "Eintritt (1–5)", typ: "auswahl", leer: false, optionen: Object.entries(RISIKO_STUFEN).map(([k, l]) => ({ wert: k, label: `${k} – ${l}` })) },
    { name: "auswirkung", label: "Auswirkung (1–5)", typ: "auswahl", leer: false, optionen: Object.entries(RISIKO_STUFEN).map(([k, l]) => ({ wert: k, label: `${k} – ${l}` })) },
    { name: "status", label: "Status", typ: "auswahl", leer: false, optionen: opt(RISIKO_STATUS) },
    { name: "verantwortlichId", label: "Verantwortlich", typ: "auswahl", optionen: auswahl.projektleiter.map((u) => ({ wert: u.id, label: u.name })) },
    { name: "meilensteinId", label: "Bezug Meilenstein", typ: "auswahl", optionen: projekt.meilensteine.map((m) => ({ wert: m.id, label: m.titel })) },
    { name: "massnahme", label: "Maßnahmen", typ: "mehrzeilig", breit: true },
    { name: "extern", label: "Für Co-Investoren sichtbar", typ: "check", breit: true },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Karte titel="Risikoregister" untertitel="Score = Eintritt × Auswirkung (ab 15 hoch, ab 8 mittel)" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {projekt.risiken.map((r) => (
              <li key={r.id} className="px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{r.titel}</p>
                    <p className="text-[12.5px] text-ink-500">{r.kategorieLabel} · {r.statusLabel} · {r.eintritt} × {r.auswirkung}{r.verantwortlich ? ` · ${r.verantwortlich.name}` : ""}{r.extern ? " · für Co-Investoren sichtbar" : ""}</p>
                    {r.massnahme && <p className="mt-1 text-[13.5px] text-ink-700">Maßnahme: {r.massnahme}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <RisikoBadge score={r.score} ampel={r.ampel} />
                    {darf && <AktionKnopf klein variante="gefahr" frage="Risiko löschen? (Besser: Status „Geschlossen“)" fn={() => loeschen(projekt.id, "risiko", r.id)}>Löschen</AktionKnopf>}
                  </div>
                </div>
                {darf && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[13px] font-semibold text-ink-700">Bearbeiten</summary>
                    <div className="mt-3"><SchnellFormular spalten={3} felder={felder} start={{ ...r, eintritt: String(r.eintritt), auswirkung: String(r.auswirkung), verantwortlichId: r.verantwortlichId || "", meilensteinId: r.meilensteinId || "" }} onSenden={(d) => eintragSenden(projekt.id, "risiko", { ...d, eintritt: Number(d.eintritt), auswirkung: Number(d.auswirkung) }, r.id)} /></div>
                  </details>
                )}
              </li>
            ))}
            {!projekt.risiken.length && <li className="px-6 py-6 text-[14px] text-ink-500">Noch keine Risiken erfasst.</li>}
          </ul>
        </Karte>
        <Karte titel="Matrix"><Matrix risiken={projekt.risiken} /></Karte>
      </div>
      {darf && (
        <Karte titel="Risiko erfassen">
          <SchnellFormular spalten={3} zuruecksetzen knopf="Erfassen" meldung="Risiko erfasst." felder={felder} start={{ kategorie: "genehmigung", eintritt: "3", auswirkung: "3", status: "offen" }} onSenden={(d) => eintragSenden(projekt.id, "risiko", { ...d, eintritt: Number(d.eintritt), auswirkung: Number(d.auswirkung) })} />
        </Karte>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Kontakte (CRM)

export function Kontakte({ projekt, auswahl }) {
  const darf = projekt.darfBearbeiten;
  return (
    <div className="space-y-6">
      <Karte titel="Behörden & Stakeholder" untertitel="Verknüpft aus dem CRM – Stammdaten und Aktivitäten pflegen Sie dort" innen="p-0">
        <ul className="divide-y divide-ink-100">
          {projekt.kontakte.map((k) => (
            <li key={k.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 md:px-6">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{k.kontakt ? <Link href={`/portal/admin/crm/${k.kontakt.id}`} className="hover:text-ov-700">{k.kontakt.name}</Link> : "Kontakt gelöscht"}</p>
                <p className="text-[13px] text-ink-600">{[k.kontakt?.funktion, k.kontakt?.firma].filter(Boolean).join(" · ")}</p>
                {k.kontakt?.email && <p className="break-all text-[12.5px] text-ink-500">{k.kontakt.email}{k.kontakt.telefon ? ` · ${k.kontakt.telefon}` : ""}</p>}
                {k.notiz && <p className="mt-1 text-[13px] text-ink-700">{k.notiz}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge ton="info">{k.rolleLabel}</Badge>
                {darf && <AktionKnopf klein variante="gefahr" fn={() => loeschen(projekt.id, "kontakt", k.id)}>Lösen</AktionKnopf>}
              </div>
            </li>
          ))}
          {!projekt.kontakte.length && <li className="px-6 py-6 text-[14px] text-ink-500">Noch keine Kontakte verknüpft.</li>}
        </ul>
      </Karte>
      {darf && (
        <Karte titel="Kontakt aus dem CRM verknüpfen" untertitel={<>Neue Person? <Link href="/portal/admin/crm" className="font-semibold text-ov-700">Im CRM anlegen</Link> und hier verknüpfen.</>}>
          <SchnellFormular zuruecksetzen knopf="Verknüpfen" meldung="Kontakt verknüpft." spalten={3} felder={[
            { name: "kontaktId", label: "CRM-Kontakt", typ: "auswahl", optionen: auswahl.kontakte.map((k) => ({ wert: k.id, label: `${k.name}${k.firma && k.firma !== k.name ? ` (${k.firma})` : ""}` })) },
            { name: "rolle", label: "Rolle im Projekt", typ: "auswahl", leer: false, optionen: opt(KONTAKT_ROLLEN_ENTWICKLUNG) },
            { name: "notiz", label: "Notiz", typ: "text" },
          ]} start={{ rolle: "gemeinde" }} onSenden={(d) => eintragSenden(projekt.id, "kontakt", d)} />
        </Karte>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Entscheidungen

export function Entscheidungen({ projekt }) {
  return (
    <div className="space-y-6">
      <Karte titel="Entscheidungsprotokoll" untertitel="Unveränderlich – Korrekturen als neue Entscheidung erfassen" innen="p-0">
        <ol className="divide-y divide-ink-100">
          {projekt.entscheidungen.map((e) => (
            <li key={e.id} className="px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ov-num text-[13px] font-semibold text-ink-500">{datumKurz(e.datum)}</span>
                <Badge ton={e.art === "nogo" ? "warn" : e.art === "go" ? "ok" : "info"}>{e.artLabel}</Badge>
                <span className="font-semibold text-ink-900">{e.titel}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-[14px] text-ink-700">{e.beschluss}</p>
              {e.begruendung && <p className="mt-1 text-[13px] text-ink-600">Begründung: {e.begruendung}</p>}
              <p className="mt-1 text-[12px] text-ink-500">{[e.beteiligte, e.von?.name && `erfasst von ${e.von.name}`].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
          {!projekt.entscheidungen.length && <li className="px-6 py-6 text-[14px] text-ink-500">Noch keine Entscheidungen protokolliert.</li>}
        </ol>
      </Karte>
      {projekt.darfBearbeiten && (
        <Karte titel="Entscheidung protokollieren">
          <SchnellFormular zuruecksetzen knopf="Protokollieren" meldung="Entscheidung protokolliert." spalten={3} felder={[
            { name: "datum", label: "Datum", typ: "datum" },
            { name: "art", label: "Art", typ: "auswahl", leer: false, optionen: opt(ENTSCHEIDUNG_ARTEN) },
            { name: "beteiligte", label: "Beteiligte", typ: "text" },
            { name: "titel", label: "Titel", typ: "text", breit: true, pflicht: true },
            { name: "beschluss", label: "Beschluss", typ: "mehrzeilig", breit: true },
            { name: "begruendung", label: "Begründung", typ: "mehrzeilig", breit: true },
          ]} start={{ art: "go" }} onSenden={(d) => eintragSenden(projekt.id, "entscheidung", d)} />
        </Karte>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Kosten

export function Kosten({ projekt }) {
  const darf = projekt.darfBearbeiten;
  const summe = (k, f) => projekt.budget.filter((b) => b.kategorie === k).reduce((s, b) => s + (Number(b[f]) || 0), 0);
  const kategorien = Object.keys(BUDGET_KATEGORIEN).filter((k) => projekt.budget.some((b) => b.kategorie === k));
  const quote = projekt.budgetPlan ? Math.round((projekt.budgetIst / projekt.budgetPlan) * 100) : 0;
  return (
    <div className="space-y-6">
      <Karte
        titel="Budget und Ist-Kosten"
        untertitel={`Ist ${eurKurz(projekt.budgetIst)} von ${eurKurz(projekt.budgetPlan)} (${quote} %) · Ist aus ERPNext, sofern angebunden – sonst manuell`}
        aktion={darf && <AktionKnopf klein meldung="Mit ERPNext abgeglichen." fn={() => senden(`/api/admin/entwicklung/${projekt.id}/aktion`, { body: { aktion: "erpnext_sync" } })}>Mit ERPNext abgleichen</AktionKnopf>}
        innen="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead className="border-b border-ink-100 text-[12px] uppercase tracking-wide text-ink-500">
              <tr><th className="px-5 py-3 font-semibold md:px-6">Position</th><th className="px-3 py-3 text-right font-semibold">Plan</th><th className="px-3 py-3 text-right font-semibold">Ist</th><th className="px-3 py-3 font-semibold">Quelle</th><th className="px-5 py-3 md:px-6"><span className="sr-only">Aktionen</span></th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {kategorien.map((k) => (
                <tr key={k} className="bg-sand-50/60"><td className="px-5 py-2 font-semibold text-ink-800 md:px-6">{BUDGET_KATEGORIEN[k]}</td><td className="ov-num px-3 py-2 text-right font-semibold">{eurKurz(summe(k, "planEur"))}</td><td className={`ov-num px-3 py-2 text-right font-semibold ${summe(k, "istEur") > summe(k, "planEur") ? "text-red-700" : ""}`}>{eurKurz(summe(k, "istEur"))}</td><td colSpan={2} /></tr>
              ))}
              {projekt.budget.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-2.5 md:px-6"><span className="text-ink-900">{b.bezeichnung}</span><span className="block text-[12px] text-ink-500">{b.kategorieLabel}{b.notiz ? ` · ${b.notiz}` : ""}</span></td>
                  <td className="ov-num px-3 py-2.5 text-right">{eurKurz(b.planEur)}</td>
                  <td className={`ov-num px-3 py-2.5 text-right ${b.istEur > b.planEur ? "font-semibold text-red-700" : ""}`}>{eurKurz(b.istEur)}</td>
                  <td className="px-3 py-2.5"><Badge ton={b.istQuelle === "erpnext" ? "info" : "neutral"}>{b.istQuelle === "erpnext" ? "ERPNext" : b.istQuelle === "demo" ? "Demo" : "manuell"}</Badge></td>
                  <td className="px-5 py-2.5 text-right md:px-6">{darf && b.istQuelle !== "erpnext" && <AktionKnopf klein variante="gefahr" fn={() => loeschen(projekt.id, "budget", b.id)}>Löschen</AktionKnopf>}</td>
                </tr>
              ))}
              {!projekt.budget.length && <tr><td colSpan={5} className="px-6 py-6 text-ink-500">Noch keine Budgetpositionen.</td></tr>}
            </tbody>
          </table>
        </div>
      </Karte>
      {darf && (
        <Karte titel="Budgetposition anlegen oder Ist nachtragen" untertitel="Gleiche Bezeichnung überschreibt nicht – bestehende Positionen bitte über ERPNext bzw. neu anlegen">
          <SchnellFormular zuruecksetzen knopf="Anlegen" meldung="Budgetposition angelegt." spalten={3} felder={[
            { name: "kategorie", label: "Kategorie", typ: "auswahl", leer: false, optionen: opt(BUDGET_KATEGORIEN) },
            { name: "bezeichnung", label: "Bezeichnung", typ: "text" },
            { name: "planEur", label: "Plan (€)", typ: "zahl" },
            { name: "istEur", label: "Ist (€, manuell)", typ: "zahl" },
            { name: "notiz", label: "Notiz", typ: "text", breit: true },
          ]} start={{ kategorie: "gutachten" }} onSenden={(d) => eintragSenden(projekt.id, "budget", Object.fromEntries(Object.entries(d).filter(([, w]) => w !== null && w !== "")))} />
        </Karte>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Freigaben, Gutachter, Dokumente

export function Freigaben({ projekt, auswahl }) {
  const darf = projekt.darfBearbeiten;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Co-Development-Investoren" untertitel="Sehen Fortschritt, Termine, freigegebene Risiken und Dokumente – keine Kosten, Eigentümer oder Notizen" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {projekt.freigaben.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 md:px-6">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{f.nutzer?.name || f.organisation?.name}</p>
                  <p className="text-[12.5px] text-ink-500">{f.nutzer?.email || "Organisation"} · seit {datumKurz(f.seit)} · Risiken {f.risiken ? "ja" : "nein"} · Dokumente {f.dokumente ? "ja" : "nein"}</p>
                </div>
                {darf && <AktionKnopf klein variante="gefahr" frage="Freigabe entziehen?" fn={() => loeschen(projekt.id, "freigabe", f.id)}>Entziehen</AktionKnopf>}
              </li>
            ))}
            {!projekt.freigaben.length && <li className="px-6 py-5 text-[14px] text-ink-500">Keine Freigaben.</li>}
          </ul>
          {darf && (
            <div className="border-t border-ink-100 p-5 md:p-6">
              <SchnellFormular zuruecksetzen knopf="Freigeben" meldung="Freigabe erteilt – der Investor wird benachrichtigt." spalten={2} felder={[
                { name: "nutzerId", label: "Investorenkonto", typ: "auswahl", optionen: auswahl.investoren.map((u) => ({ wert: u.id, label: `${u.name}${u.firma ? ` (${u.firma})` : ""}` })) },
                { name: "organisationId", label: "oder Organisation", typ: "auswahl", optionen: auswahl.organisationen.map((o) => ({ wert: o.id, label: o.name })) },
                { name: "risiken", label: "Externe Risiken zeigen", typ: "check" },
                { name: "dokumente", label: "Freigegebene Dokumente zeigen", typ: "check" },
              ]} start={{ risiken: true, dokumente: true }} onSenden={(d) => eintragSenden(projekt.id, "freigabe", Object.fromEntries(Object.entries(d).filter(([, w]) => w !== "")))} />
            </div>
          )}
        </Karte>
        <Karte titel="Gutachter & Planer" untertitel="Sehen nur zugewiesene Meilensteine, laden Gutachten hoch, stellen Rückfragen">
          {projekt.gutachterProfile?.length > 0 && (
            <ul className="mb-4 space-y-3">
              {projekt.gutachterProfile.map((g) => (
                <li key={g.nutzerId} className="rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-200/70">
                  <p className="font-semibold text-ink-900">{g.name}{g.buero ? <span className="font-normal text-ink-600"> · {g.buero}</span> : null}</p>
                  <p className="text-[12.5px] text-ink-600">{g.qualifikationLabel || "Qualifikation nicht erfasst"}{g.nachweis ? ` · ${g.nachweis}` : ""}</p>
                  {g.fachgebieteLabel?.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{g.fachgebieteLabel.map((f) => <Badge key={f}>{f}</Badge>)}</div>}
                  {darf && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-700">Fachgebiet & Qualifikation pflegen</summary>
                      <div className="mt-2">
                        <SchnellFormular spalten={2} felder={[
                          { name: "fachgebiete", label: "Fachgebiete", typ: "mehrfach", breit: true, optionen: opt(GUTACHTER_FACHGEBIETE) },
                          { name: "qualifikation", label: "Qualifikation", typ: "auswahl", optionen: opt(GUTACHTER_QUALIFIKATION) },
                          { name: "buero", label: "Büro / Firma", typ: "text" },
                          { name: "nachweis", label: "Nachweis (z. B. bestellende Kammer, Zertifikat-Nr.)", typ: "text", breit: true },
                        ]} start={g} onSenden={(d) => eintragSenden(projekt.id, "gutachterprofil", d, g.nutzerId)} />
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
          <ul className="mb-4 space-y-2">
            {projekt.meilensteine.filter((m) => m.gutachter?.length).map((m) => (
              <li key={m.id} className="text-[13.5px]"><span className="font-semibold text-ink-900">{m.titel}</span><span className="text-ink-600"> – {m.gutachter.map((g) => g.name).join(", ")}</span>{m.eingereichtAm && <Badge ton="ok" className="ml-2">eingereicht</Badge>}</li>
            ))}
            {!projekt.meilensteine.some((m) => m.gutachter?.length) && <li className="text-[14px] text-ink-500">Noch keine Gutachter zugewiesen.</li>}
          </ul>
          {projekt.einladungen.length > 0 && (
            <ul className="mb-4 space-y-1 text-[12.5px] text-ink-600">
              {projekt.einladungen.map((e) => <li key={e.id}>Einladung {e.email} · {e.status} · {e.meilensteinIds.length} Meilenstein(e) · bis {datumKurz(e.ablauf)}</li>)}
            </ul>
          )}
          {darf && (
            <SchnellFormular zuruecksetzen knopf="Einladen" meldung={"Einladung versendet (Demo: Link im Postausgang)."} spalten={1} felder={[
              { name: "email", label: "E-Mail des Gutachters / Planungsbüros", typ: "text", pflicht: true },
              { name: "fachgebiete", label: "Fachgebiete", typ: "mehrfach", optionen: opt(GUTACHTER_FACHGEBIETE) },
              { name: "qualifikation", label: "Qualifikation", typ: "auswahl", optionen: opt(GUTACHTER_QUALIFIKATION), hinweis: "z. B. öffentlich bestellt und vereidigt – wird am Konto gespeichert" },
              { name: "buero", label: "Büro / Firma", typ: "text" },
              { name: "meilensteinIds", label: "Auftrag (Meilensteine)", typ: "mehrfach", optionen: projekt.meilensteine.filter((m) => m.status !== "erledigt").map((m) => ({ wert: m.id, label: `${m.gutachten ? "★ " : ""}${m.titel}` })), hinweis: "★ = typischer Gutachten-/Planungsauftrag" },
            ]} onSenden={(d) => senden(`/api/admin/entwicklung/${projekt.id}/gutachter`, { body: d })} />
          )}
        </Karte>
      </div>
      <Karte titel="Projektdokumente" untertitel="Nachweise je Meilenstein (Reiter Plan) und allgemeine Unterlagen" innen="p-0">
        <ul className="divide-y divide-ink-100">
          {projekt.dokumente.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 md:px-6">
              <div className="min-w-0">
                <a href={d.link} className="font-semibold text-ov-700 hover:text-ov-800">{d.name}</a>
                <p className="text-[12.5px] text-ink-500">{projekt.meilensteine.find((m) => m.id === d.meilensteinId)?.titel || "Projekt allgemein"}{d.pflicht ? ` · ${d.pflicht}` : ""} · {d.von} · {datumKurz(d.am)}</p>
              </div>
              <span className="flex gap-1.5">{d.freigabeInvestor && <Badge ton="info">Co-Investoren</Badge>}{d.fuerGutachter && <Badge>Gutachter</Badge>}</span>
            </li>
          ))}
          {!projekt.dokumente.length && <li className="px-6 py-5 text-[14px] text-ink-500">Noch keine Dokumente.</li>}
        </ul>
        {darf && <div className="border-t border-ink-100 p-5 md:p-6"><Hochladen felder={{ projektId: projekt.id }} mitFreigabe label="Allgemeines Dokument hochladen" /></div>}
      </Karte>
    </div>
  );
}


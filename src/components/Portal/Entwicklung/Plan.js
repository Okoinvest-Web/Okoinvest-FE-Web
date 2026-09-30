"use client";

// Reiter „Plan & Gantt“ im Backoffice: Gantt mit kritischem Pfad, Meilenstein bearbeiten (Status, Soll/Ist, Dauer,
// Abhängigkeiten, Verantwortliche, Gutachter, Dokumentenpflicht, externer Titel, Notiz), Nachweise hochladen, Rückfragen
// der Gutachter beantworten, Meilenstein ergänzen, Plan neu berechnen. Regeln prüft der Server (409/422 mit Klartext).

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, MessageSquare, TriangleAlert } from "lucide-react";
import { Badge, Karte } from "@/components/Portal/ui";
import { KATEGORIEN, MEILENSTEIN_STATUS } from "@/lib/plattform/entwicklung";
import { PHASEN } from "@/lib/invest/markt";
import { senden } from "@/lib/plattform/client";
import Gantt from "./Gantt";
import { AktionKnopf, Hochladen, SchnellFormular, eintragSenden } from "./Formular";
import { MeilensteinBadge, datumKurz } from "./teile";

function Editor({ projekt, m, auswahl }) {
  const andere = projekt.meilensteine.filter((x) => x.id !== m.id);
  const doks = projekt.dokumente.filter((d) => d.meilensteinId === m.id);
  const fragen = projekt.rueckfragen.filter((r) => r.meilensteinId === m.id);
  const darf = projekt.darfBearbeiten;
  return (
    <Karte titel={m.titel} untertitel={`${KATEGORIEN[m.kategorie]?.label || ""} · Soll ${datumKurz(m.sollStart)} – ${datumKurz(m.sollEnde)}${m.kritisch ? " · kritischer Pfad" : ` · Puffer ${m.puffer ?? "–"} Tage`}`} aktion={<MeilensteinBadge m={m} />}>
      <div className="space-y-6">
        {m.pflichtErfuellt?.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold text-ink-700">Dokumentenpflicht</h3>
            <ul className="flex flex-wrap gap-2">
              {m.pflichtErfuellt.map((p) => (
                <li key={p.name}><Badge ton={p.erfuellt ? "ok" : "warn"}>{p.erfuellt ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />}{p.name}</Badge></li>
              ))}
            </ul>
            {m.nachweisVerzicht && <p className="mt-2 text-[12.5px] text-ink-500">Verzicht begründet: {m.nachweisVerzicht}</p>}
          </div>
        )}
        {darf ? (
          <SchnellFormular
            key={`${m.id}-${m.status}-${m.sollEnde}`}
            spalten={3}
            felder={[
              { name: "status", label: "Status", typ: "auswahl", leer: false, optionen: Object.entries(MEILENSTEIN_STATUS).map(([k, s]) => ({ wert: k, label: s.label })) },
              { name: "dauerMonate", label: "Dauer (Monate)", typ: "zahl" },
              { name: "verantwortlichId", label: "Verantwortlich", typ: "auswahl", leer: "– Projektleitung –", optionen: auswahl.projektleiter.map((u) => ({ wert: u.id, label: u.name })) },
              { name: "sollStart", label: "Soll-Start", typ: "datum", hinweis: "Beide Soll-Termine setzen = fixieren" },
              { name: "sollEnde", label: "Soll-Ende", typ: "datum" },
              { name: "phase", label: "Erreicht Phase", typ: "auswahl", leer: "– keine –", optionen: PHASEN.map((p) => ({ wert: p.id, label: p.kurz })) },
              { name: "istStart", label: "Ist-Start", typ: "datum" },
              { name: "istEnde", label: "Ist-Ende", typ: "datum", hinweis: "Beim Erledigen Standard: heute" },
              { name: "gutachterIds", label: "Gutachter / Planer", typ: "mehrfach", optionen: auswahl.gutachter.map((u) => ({ wert: u.id, label: `${u.name}${u.firma ? ` (${u.firma})` : ""}${u.fachgebieteLabel?.length ? ` – ${u.fachgebieteLabel.join(", ")}` : ""}${u.qualifikation === "oebuv" ? " · ö.b.u.v." : ""}` })), hinweis: "Neue Gutachter über „Gutachter einladen“ (Reiter Freigaben)." },
              { name: "nach", label: "Abhängig von (Vorgänger)", typ: "mehrfach", breit: true, optionen: andere.map((x) => ({ wert: x.id, label: x.titel })), hinweis: "Strg/⌘ + Klick für Mehrfachauswahl. Kreise werden abgelehnt." },
              { name: "titel", label: "Titel (intern)", typ: "text", breit: true },
              { name: "externTitel", label: "Titel für Eigentümer (leer = nicht sichtbar)", typ: "text", breit: true },
              { name: "dokumentPflicht", label: "Dokumentenpflicht (eine je Zeile)", typ: "mehrzeilig" },
              { name: "nachweisVerzicht", label: "Verzicht auf Nachweis – Begründung", typ: "mehrzeilig", hinweis: "Nur nötig, wenn Pflichtdokumente fehlen (mind. 10 Zeichen, wird protokolliert)." },
              { name: "notiz", label: "Interne Notiz", typ: "mehrzeilig" },
            ]}
            start={{ ...m, verantwortlichId: m.verantwortlichId || "", phase: m.phase || "", dokumentPflicht: (m.dokumentPflicht || []).join("\n"), gutachterIds: m.gutachterIds || [], nach: m.nach || [], sollStart: m.sollStart || "", sollEnde: m.sollEnde || "", istStart: m.istStart || "", istEnde: m.istEnde || "" }}
            onSenden={(d) => {
              const daten = { ...d, dokumentPflicht: String(d.dokumentPflicht || "").split("\n").map((s) => s.trim()).filter(Boolean) };
              for (const k of ["sollStart", "sollEnde", "istStart", "istEnde"]) if (daten[k] === (m[k] || "")) delete daten[k];
              return eintragSenden(projekt.id, "meilenstein", daten, m.id);
            }}
            zusatz={m.status !== "erledigt" && <AktionKnopf variante="gefahr" frage="Meilenstein wirklich entfernen? Nachfolger übernehmen seine Vorgänger." fn={() => senden(`/api/admin/entwicklung/${projekt.id}/eintraege?art=meilenstein&id=${m.id}`, { method: "DELETE" })}>Entfernen</AktionKnopf>}
          />
        ) : (
          <p className="text-[14px] text-ink-600">{m.notiz || "Keine Notiz."}</p>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-ink-700"><FileText aria-hidden="true" className="h-4 w-4" />Nachweise ({doks.length})</h3>
            <ul className="mb-3 space-y-1.5">
              {doks.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 text-[13.5px]">
                  <a href={d.link} className="font-semibold text-ov-700 hover:text-ov-800">{d.name}</a>
                  {d.pflicht && <Badge ton="ok">{d.pflicht}</Badge>}
                  {d.freigabeInvestor && <Badge ton="info">Co-Investoren</Badge>}
                  <span className="text-[12px] text-ink-500">{d.von} · {datumKurz(d.am)}</span>
                </li>
              ))}
            </ul>
            {darf && <Hochladen felder={{ projektId: projekt.id, meilensteinId: m.id }} pflichtOptionen={m.dokumentPflicht || []} mitFreigabe />}
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-ink-700"><MessageSquare aria-hidden="true" className="h-4 w-4" />Rückfragen der Gutachter ({fragen.length})</h3>
            <ul className="mb-3 space-y-2">
              {fragen.map((r) => (
                <li key={r.id} className={r.backoffice ? "rounded-2xl bg-ov-50 p-3 text-[13.5px] ring-1 ring-ov-200" : "rounded-2xl bg-white p-3 text-[13.5px] ring-1 ring-ink-200"}>
                  <p className="text-[12px] font-semibold text-ink-500">{r.von?.name || ""} · {datumKurz(r.am)}</p>
                  <p className="mt-0.5 whitespace-pre-line text-ink-800">{r.text}</p>
                </li>
              ))}
            </ul>
            {darf && m.gutachter?.length > 0 && (
              <SchnellFormular
                spalten={1}
                felder={[
                  { name: "anId", label: "An", typ: "auswahl", leer: false, optionen: m.gutachter.map((g) => ({ wert: g.id, label: g.name })) },
                  { name: "text", label: "Nachricht an den Gutachter", typ: "mehrzeilig" },
                ]}
                start={{ anId: m.gutachter[0].id }}
                knopf="Senden"
                meldung="Gesendet."
                zuruecksetzen
                onSenden={(d) => senden(`/api/admin/entwicklung/${projekt.id}/rueckfrage`, { body: { meilensteinId: m.id, ...d } })}
              />
            )}
          </div>
        </div>
      </div>
    </Karte>
  );
}

export default function Plan({ projekt, auswahl, heute }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [gewaehlt, setGewaehlt] = useState(sp?.get("ms") || null);
  const m = useMemo(() => projekt.meilensteine.find((x) => x.id === gewaehlt) || null, [projekt, gewaehlt]);
  const waehlen = (id) => {
    setGewaehlt(id);
    const q = new URLSearchParams(sp?.toString() || "");
    q.set("reiter", "plan");
    q.set("ms", id);
    router.replace(`?${q}`, { scroll: false });
    setTimeout(() => document.getElementById("meilenstein-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  return (
    <div className="space-y-6">
      <Karte
        titel="Terminplan"
        untertitel={`Prognose Ende ${datumKurz(projekt.projektEnde)} · Ziel-COD ${projekt.zielCod || "–"} · Zeile anklicken zum Bearbeiten`}
        aktion={projekt.darfBearbeiten && <AktionKnopf klein frage="Alle nicht erledigten Soll-Termine neu vorwärts berechnen (fixierte Termine werden gelöst)?" meldung="Plan neu berechnet." fn={() => senden(`/api/admin/entwicklung/${projekt.id}/aktion`, { body: { aktion: "plan_neu" } })}>Plan neu berechnen</AktionKnopf>}
      >
        <Gantt meilensteine={projekt.meilensteine} heute={heute} onAuswahl={waehlen} auswahl={gewaehlt} />
      </Karte>
      <div id="meilenstein-editor" className="scroll-mt-24">
        {m ? <Editor projekt={projekt} m={m} auswahl={auswahl} /> : (
          <Karte titel="Meilensteine" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {projekt.meilensteine.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => waehlen(x.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3 text-left hover:bg-sand-50 md:px-6">
                    <span className="min-w-0">
                      <span className={x.kritisch ? "font-bold text-navy-900" : "font-semibold text-ink-900"}>{x.titel}</span>
                      <span className="block text-[12.5px] text-ink-500">Soll {datumKurz(x.sollEnde)}{x.istEnde ? ` · Ist ${datumKurz(x.istEnde)}` : ""}{x.gutachter?.length ? ` · ${x.gutachter.map((g) => g.name).join(", ")}` : ""}{x.rueckfragen ? ` · ${x.rueckfragen} Rückfragen` : ""}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {x.kritisch && <Badge ton="dunkel">kritisch</Badge>}
                      <MeilensteinBadge m={x} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Karte>
        )}
      </div>
      {projekt.darfBearbeiten && (
        <Karte titel="Meilenstein ergänzen" untertitel="Termine werden aus Dauer und Vorgängern berechnet">
          <SchnellFormular
            spalten={3}
            zuruecksetzen
            knopf="Hinzufügen"
            meldung="Meilenstein hinzugefügt."
            felder={[
              { name: "titel", label: "Titel", typ: "text", pflicht: true },
              { name: "kategorie", label: "Kategorie", typ: "auswahl", leer: false, optionen: Object.entries(KATEGORIEN).map(([k, x]) => ({ wert: k, label: x.label })) },
              { name: "dauerMonate", label: "Dauer (Monate)", typ: "zahl" },
              { name: "nach", label: "Abhängig von", typ: "mehrfach", breit: true, optionen: projekt.meilensteine.map((x) => ({ wert: x.id, label: x.titel })) },
            ]}
            start={{ kategorie: "gemeinde", dauerMonate: "1" }}
            onSenden={(d) => eintragSenden(projekt.id, "meilenstein", d)}
          />
        </Karte>
      )}
    </div>
  );
}

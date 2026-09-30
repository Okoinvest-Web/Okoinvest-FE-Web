"use client";

// Auftrag eines Gutachters/Planers an einem Meilenstein: Unterlagen hochladen, „in Arbeit“ bzw. „eingereicht“ melden,
// Rückfragen an die Projektleitung. Erledigen kann nur die Projektleitung von ÖkoInvest.

import { CheckCircle2, FileText, MessageSquare, TriangleAlert } from "lucide-react";
import { Badge, Karte } from "@/components/Portal/ui";
import { senden } from "@/lib/plattform/client";
import { AktionKnopf, Hochladen, SchnellFormular } from "./Formular";
import { datumKurz } from "./teile";

export default function GutachterAuftrag({ projektId, a }) {
  const offen = !["erledigt", "entfaellt"].includes(a.status);
  return (
    <Karte
      titel={a.titel}
      untertitel={`${a.kategorieLabel || ""} · Soll ${datumKurz(a.sollStart)} – ${datumKurz(a.sollEnde)}`}
      aktion={a.ueberfaellig ? <Badge className="bg-red-50 text-red-800 ring-red-200"><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />Überfällig</Badge> : <Badge ton={a.status === "erledigt" ? "ok" : a.status === "in_arbeit" ? "info" : "neutral"}>{a.statusLabel}</Badge>}
    >
      <div className="space-y-5">
        {a.dokumentPflicht?.length > 0 && (
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold text-ink-700">Erwartete Unterlagen</h3>
            <ul className="flex flex-wrap gap-2">
              {a.dokumentPflicht.map((p) => {
                const da = a.dokumente.some((d) => d.pflicht === p);
                return <li key={p}><Badge ton={da ? "ok" : "warn"}>{da ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : null}{p}</Badge></li>;
              })}
            </ul>
          </div>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-ink-700"><FileText aria-hidden="true" className="h-4 w-4" />Unterlagen ({a.dokumente.length})</h3>
            <ul className="mb-3 space-y-1.5">
              {a.dokumente.map((d) => (
                <li key={d.id} className="text-[13.5px]"><a href={d.link} className="font-semibold text-ov-700 hover:text-ov-800">{d.name}</a> <span className="text-[12px] text-ink-500">{d.eigenes ? "von Ihnen" : "von ÖkoInvest"} · {datumKurz(d.am)}</span></li>
              ))}
            </ul>
            {offen && <Hochladen felder={{ projektId, meilensteinId: a.id }} pflichtOptionen={a.dokumentPflicht || []} label="Gutachten / Unterlage hochladen" />}
            {offen && (
              <div className="mt-3 flex flex-wrap gap-2">
                {a.status === "offen" && <AktionKnopf meldung="Als „in Arbeit“ gemeldet." fn={() => senden(`/api/portal/entwicklung/${projektId}/meilensteine/${a.id}`, { body: { aktion: "in_arbeit" } })}>Arbeit begonnen</AktionKnopf>}
                <AktionKnopf variante="primaer" meldung="Eingereicht – die Projektleitung prüft." frage="Unterlagen zur Prüfung einreichen?" fn={() => senden(`/api/portal/entwicklung/${projektId}/meilensteine/${a.id}`, { body: { aktion: "eingereicht" } })}>{a.eingereichtAm ? "Erneut einreichen" : "Zur Prüfung einreichen"}</AktionKnopf>
              </div>
            )}
            {a.eingereichtAm && <p className="mt-2 text-[12.5px] text-ink-600">Eingereicht am {datumKurz(a.eingereichtAm)}.</p>}
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-ink-700"><MessageSquare aria-hidden="true" className="h-4 w-4" />Rückfragen</h3>
            <ul className="mb-3 space-y-2">
              {a.rueckfragen.map((r) => (
                <li key={r.id} className={r.backoffice ? "rounded-2xl bg-ov-50 p-3 text-[13.5px] ring-1 ring-ov-200" : "rounded-2xl bg-white p-3 text-[13.5px] ring-1 ring-ink-200"}>
                  <p className="text-[12px] font-semibold text-ink-500">{r.von} · {datumKurz(r.am)}</p>
                  <p className="mt-0.5 whitespace-pre-line text-ink-800">{r.text}</p>
                </li>
              ))}
              {!a.rueckfragen.length && <li className="text-[13.5px] text-ink-500">Noch keine Rückfragen.</li>}
            </ul>
            <SchnellFormular spalten={1} zuruecksetzen knopf="Rückfrage senden" meldung="Gesendet." felder={[{ name: "text", label: "Ihre Frage an die Projektleitung", typ: "mehrzeilig" }]} onSenden={(d) => senden(`/api/portal/entwicklung/${projektId}/rueckfragen`, { body: { meilensteinId: a.id, text: d.text } })} />
          </div>
        </div>
      </div>
    </Karte>
  );
}

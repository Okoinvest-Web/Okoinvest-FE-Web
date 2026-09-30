// Detailansicht eines Vorgangs – für Nutzer (/portal/anfragen/[id]) und Backoffice (/portal/admin/vorgaenge/[id]).

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Angaben, Hinweis, Karte, SeitenKopf, StatusBadge, Stepper, Timeline } from "./ui";
import StatusAktionen from "./StatusAktionen";
import NachrichtenThread from "./NachrichtenThread";
import { DokumentListe, DokumentUpload } from "./Dokumente";
import Zuweisung from "./Zuweisung";
import { VORGANG_TYPEN, LAENDER } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { datumZeit, feldLabel, wertText } from "@/lib/plattform/format";

export default function VorgangDetail({ vorgang: v, thread, dokumente, nutzer, admin = false, adminKonten = [], zusatz = null }) {
  const k = v.kontakt || {};
  const daten = Object.entries(v.daten || {}).filter(([, x]) => x !== "" && x !== null && x !== undefined);
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow={admin ? "Vorgang" : "Anfrage"}
        titel={VORGANG_TYPEN[v.typ] || v.typ}
        text={`Vorgangsnummer ${v.id} · eingegangen am ${datumZeit(v.erstelltAm)}`}
        aktionen={<StatusBadge art="vorgang" status={v.status} className="text-[13px]" />}
      />

      <Karte>
        <Stepper art="vorgang" status={v.status} />
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">{statusInfo("vorgang", v.status).text}</p>
        {v.flaecheId && (
          <Link href={`/portal/flaechen/${v.flaecheId}`} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
            Zugehörige Fläche öffnen <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
        {v.typ === "kommune" && (
          <Link href={admin ? `/portal/kommune?vorgang=${v.id}` : "/portal/kommune"} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
            Gemeinde-Sicht öffnen <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </Karte>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Nachrichten" untertitel={admin ? "Antworten erscheinen sofort im Portal des Nutzers." : "Ihr direkter Draht zum Backoffice."}>
            <NachrichtenThread bezugArt="vorgang" bezugId={v.id} nachrichten={thread?.nachrichten || []} {...(admin ? { leerText: "Noch keine Nachrichten zu diesem Vorgang.", platzhalter: "Antwort an den Nutzer …" } : {})} />
          </Karte>

          <Karte titel="Angaben">
            <Angaben
              items={[
                { label: "Name", wert: [k.anrede, k.vorname, k.nachname].filter(Boolean).join(" ") },
                { label: "Unternehmen", wert: k.firma },
                { label: "E-Mail", wert: v.email },
                { label: "Telefon", wert: k.telefon },
                { label: "Ort", wert: [k.plz, k.ort].filter(Boolean).join(" ") },
                { label: "Land", wert: LAENDER[k.land] },
                ...daten.map(([key, wert]) => ({ label: feldLabel(key), wert: wertText(wert), breit: typeof wert === "string" && wert.length > 60 })),
              ]}
            />
            {admin && (
              <div className="mt-5 border-t border-ink-100 pt-4 text-[13px] text-ink-500">
                <p>Einwilligung: {datumZeit(v.einwilligung?.am)}{v.einwilligung?.ip ? ` · IP ${v.einwilligung.ip}` : ""}</p>
                {v.herkunft && Object.keys(v.herkunft).length > 0 && <p className="mt-1">Herkunft: {wertText(v.herkunft)}</p>}
                <p className="mt-1">Konto: {v.nutzer ? `${v.nutzer.vorname} ${v.nutzer.nachname} (${v.nutzer.email})` : "noch nicht registriert"}</p>
              </div>
            )}
          </Karte>
        </div>

        <div className="min-w-0 space-y-6">
          <Karte titel={admin ? "Bearbeitung" : "Aktionen"}>
            {admin && (
              <div className="mb-5">
                <Zuweisung art="vorgang" id={v.id} zustaendigId={v.zustaendigId} konten={adminKonten} />
              </div>
            )}
            <StatusAktionen
              art="vorgang"
              id={v.id}
              status={v.status}
              als={admin ? "admin" : "eigentuemer"}
              leerText={admin ? "Keine weiteren Schritte vorgesehen." : "Aktuell ist nichts von Ihnen zu tun."}
            />
            {!admin && v.zustaendig && (
              <p className="mt-4 text-[13.5px] text-ink-500">Ihr Ansprechpartner: <span className="font-semibold text-ink-800">{v.zustaendig.vorname} {v.zustaendig.nachname}</span></p>
            )}
          </Karte>

          <Karte titel="Verlauf">
            <Timeline art="vorgang" verlauf={v.statusVerlauf} />
          </Karte>

          <Karte titel="Dokumente">
            <DokumentListe dokumente={dokumente} nutzerId={nutzer.id} admin={admin} leerText="Noch keine Dokumente zu dieser Anfrage." />
            <div className="mt-4">
              <DokumentUpload bezugArt="vorgang" bezugId={v.id} kategorien={admin ? ["vertrag", "allgemein"] : ["allgemein"]} />
            </div>
          </Karte>

          {admin && zusatz}

          {!admin && v.status === "abgelehnt" && (
            <Hinweis ton="neutral" titel="Warum abgelehnt?">
              Die Begründung finden Sie im Verlauf. Bei Rückfragen schreiben Sie uns gern eine Nachricht.
            </Hinweis>
          )}
        </div>
      </div>
    </div>
  );
}

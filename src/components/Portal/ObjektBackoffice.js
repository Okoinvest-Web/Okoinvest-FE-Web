// Backoffice-Bausteine für Detailseiten (Vorgang, Fläche, Projekt): Aufgaben am Objekt und
// Aktivitäts-Feed („wer hat wann was geändert“). Server-Komponenten – nur für Admins einbinden.

import {
  Activity, ArrowRightLeft, Download, FileDown, FilePen, FileUp, KeyRound, ListTodo, LogIn, MessageSquareText, Pencil, PlusCircle, Sparkles, Trash2, UserCog,
} from "lucide-react";
import { AufgabeFormular, AufgabenListe } from "./Aufgaben";
import { Karte } from "./ui";
import { backend } from "@/lib/plattform/backend";
import { datumZeit, relativ } from "@/lib/plattform/format";

const AKTION = {
  status: { icon: ArrowRightLeft, label: "Status" },
  anlegen: { icon: PlusCircle, label: "Angelegt" },
  aendern: { icon: Pencil, label: "Geändert" },
  upload: { icon: FileUp, label: "Upload" },
  download: { icon: Download, label: "Download" },
  expose: { icon: FileDown, label: "Exposé" },
  loeschen: { icon: Trash2, label: "Gelöscht" },
  nachricht: { icon: MessageSquareText, label: "Nachricht" },
  zuweisen: { icon: UserCog, label: "Zuständig" },
  nda: { icon: KeyRound, label: "NDA" },
  aufgabe: { icon: ListTodo, label: "Aufgabe" },
  provision_akzeptiert: { icon: FilePen, label: "Provision" },
  provision: { icon: FilePen, label: "Provision" },
  suchprofil_treffer: { icon: Sparkles, label: "Suchprofil" },
  anfrage: { icon: LogIn, label: "Anfrage" },
};

/** Aktivitäts-Feed eines Objekts (inkl. zugehöriger Objekte, z. B. Interessen eines Projekts) */
export async function AktivitaetsFeed({ nutzer, objektId, weitereIds = [], titel = "Aktivität", limit = 60 }) {
  const eintraege = await backend().aktivitaeten(nutzer, { objektId, objektIds: weitereIds, limit });
  return (
    <Karte titel={titel} untertitel="Wer hat wann was geändert – aus dem Aktivitätsprotokoll">
      {eintraege.length ? (
        <ol className="relative space-y-4 pl-8">
          <span aria-hidden="true" className="absolute bottom-2 left-[13px] top-2 w-px bg-ink-200" />
          {eintraege.map((a) => {
            const info = AKTION[a.aktion] || { icon: Activity, label: a.aktion };
            const Icon = info.icon;
            return (
              <li key={a.id} className="relative">
                <span aria-hidden="true" className="absolute -left-8 top-0 flex h-[27px] w-[27px] items-center justify-center rounded-full bg-white text-ink-500 ring-1 ring-ink-200">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[13.5px] leading-snug text-ink-800">
                  <span className="font-semibold text-ink-900">{a.nutzer}</span> · {a.text}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-400" title={datumZeit(a.am)}>
                  {info.label} · {relativ(a.am)}
                  {a.objektId !== objektId ? ` · ${a.objektId}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[14px] text-ink-500">Noch keine Einträge.</p>
      )}
    </Karte>
  );
}

/** Aufgaben & Wiedervorlagen an einem Objekt */
export async function AufgabenKarte({ nutzer, bezugArt, bezugId }) {
  const b = backend();
  const [aufgaben, konten] = await Promise.all([b.aufgaben(nutzer, { bezugArt, bezugId }), b.adminKonten(nutzer)]);
  const offen = aufgaben.filter((a) => a.status === "offen").length;
  return (
    <Karte titel="Aufgaben & Wiedervorlagen" untertitel={offen ? `${offen} offen` : "Keine offenen Aufgaben"}>
      <AufgabenListe aufgaben={aufgaben} zeigeBezug={false} leerText="Noch keine Aufgaben zu diesem Objekt." />
      <div className="mt-4 border-t border-ink-100 pt-4">
        <AufgabeFormular konten={konten} nutzerId={nutzer.id} bezugArt={bezugArt} bezugId={bezugId} kompakt />
      </div>
    </Karte>
  );
}

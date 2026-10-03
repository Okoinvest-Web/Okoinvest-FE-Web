import { DokumentUpload } from "@/components/Portal/Dokumente";
import DokumentAblage from "@/components/Portal/Querschnitt/DokumentAblage"; // Querschnitt: Suche, Versionen, Prüfstatus
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { DOKUMENT_FREIGABE, freigabeVon } from "@/lib/plattform/querschnitt";

export const metadata = { title: "Dokumente" };

export default async function Dokumente({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const admin = istAdmin(n);
  const dokumente = await backend().dokumente(n);
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  const offen = dokumente.filter((d) => !d.ersetztDurch && ["eingegangen", "in_pruefung"].includes(freigabeVon(d)) && (admin ? d.hochgeladenVon !== n.id : d.hochgeladenVon === n.id)).length;
  const nachbessern = dokumente.filter((d) => !d.ersetztDurch && freigabeVon(d) === "abgelehnt" && d.hochgeladenVon === n.id).length;
  return (
    <div>
      <SeitenKopf
        eyebrow="Dokumente"
        titel={admin ? "Alle Dokumente" : "Meine Dokumente"}
        text="Angebote, Verträge, Pläne und Ihre eigenen Uploads – zu jedem Vorgang. Suchen und filtern, neue Versionen hochladen und den Prüfstatus sehen. Unterlagen zu einer Fläche oder einem Projekt laden Sie direkt dort hoch."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Karte titel="Ablage" untertitel={admin ? `${offen} Uploads warten auf Prüfung` : nachbessern ? `${nachbessern} ${nachbessern === 1 ? "Dokument braucht" : "Dokumente brauchen"} eine neue Version` : `${offen} in Prüfung beim Backoffice`}>
          <DokumentAblage dokumente={dokumente} admin={admin} nutzerId={n.id} startQ={q} />
        </Karte>
        <div className="min-w-0 space-y-6 self-start">
          {!admin && (
            <Karte titel="Allgemeines Dokument senden" untertitel="z. B. Vollmacht, Grundbuchauszug ohne Bezug zu einer Fläche">
              <DokumentUpload bezugArt="nutzer" bezugId={n.id} />
            </Karte>
          )}
          <Karte titel="Prüfstatus">
            <ul className="space-y-2 text-[13.5px] text-ink-600">
              {Object.values(DOKUMENT_FREIGABE).map((f) => (
                <li key={f.label}><strong className="text-ink-900">{f.label}:</strong> {f.text}</li>
              ))}
            </ul>
          </Karte>
        </div>
      </div>
    </div>
  );
}

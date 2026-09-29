import { DokumentListe, DokumentUpload } from "@/components/Portal/Dokumente";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";

export const metadata = { title: "Dokumente" };

export default async function Dokumente() {
  const n = await portalNutzer();
  const admin = istAdmin(n);
  const dokumente = await backend().dokumente(n);
  return (
    <div>
      <SeitenKopf
        eyebrow="Dokumente"
        titel={admin ? "Alle Dokumente" : "Meine Dokumente"}
        text="Angebote, Verträge, Pläne und Ihre eigenen Uploads – zu jedem Vorgang. Unterlagen zu einer Fläche oder einem Projekt laden Sie direkt dort hoch."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Karte titel={`${dokumente.length} ${dokumente.length === 1 ? "Dokument" : "Dokumente"}`}>
          <DokumentListe dokumente={dokumente} nutzerId={n.id} admin={admin} zeigeBezug leerText="Noch keine Dokumente vorhanden." />
        </Karte>
        {!admin && (
          <Karte titel="Allgemeines Dokument senden" untertitel="z. B. Vollmacht, Grundbuchauszug ohne Bezug zu einer Fläche">
            <DokumentUpload bezugArt="nutzer" bezugId={n.id} />
          </Karte>
        )}
      </div>
    </div>
  );
}

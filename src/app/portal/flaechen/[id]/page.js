import Link from "next/link";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { MessageSquareText } from "lucide-react";
import FlaecheFormular from "@/components/Portal/FlaecheFormular";
import Checkliste from "@/components/Portal/Checkliste";
import { AktivitaetsFeed, AufgabenKarte } from "@/components/Portal/ObjektBackoffice";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import NachrichtenThread from "@/components/Portal/NachrichtenThread";
import KiFlaeche from "@/components/Portal/Ki/KiFlaeche";
import Zuweisung from "@/components/Portal/Zuweisung";
import { DokumentListe, DokumentUpload } from "@/components/Portal/Dokumente";
import { Angaben, Hinweis, Karte, SeitenKopf, StatusBadge, Stepper, Timeline } from "@/components/Portal/ui";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { FLAECHE_NUTZUNG, LAENDER } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { datumZeit, ha } from "@/lib/plattform/format";
import { AGRI } from "@/lib/invest/markt";
// Fachprüfung Flächen: Pipeline-Erklärung, Prüfhinweise, Fachangaben, Angebotsbogen
import { Angebotsbogen, FachAngaben, FachPruefungListe, PipelineHinweis, begriffeFuer } from "@/components/Portal/Flaeche/Fachanzeige";
import { pachtVorschlag } from "@/lib/plattform/flaecheFach";
import { fachBackend } from "@/lib/plattform/backend/kommune";
import GrundbuchAmObjekt from "@/components/Portal/Closing/GrundbuchAmObjekt"; // Grundbuch & Closing
import PachtakteAmObjekt from "@/components/Portal/Pachtakte/AmObjekt"; // Pachtakte (Team 1)

export const metadata = { title: "Fläche" };

export default async function Flaeche({ params }) {
  const { id } = await params;
  const n = await portalNutzer();
  const b = backend();
  await fachBackend().fachDemoBereit(); // Demo: Fachangaben der Demo-Flächen einmalig ergänzen (Frappe: nichts)
  const f = await laden(() => b.flaeche(n, id));
  const admin = istAdmin(n);
  const eigen = f.nutzerId === n.id || f.meinZugriff === "schreiben"; // Team: Teamrolle ≥ Mitglied bearbeitet wie der Eigentümer
  const [thread, dokumente, adminKonten] = await Promise.all([
    b.nachrichten(n, "flaeche", id),
    b.dokumente(n, { bezugArt: "flaeche", bezugId: id }),
    admin ? b.adminKonten(n) : [],
  ]);
  const bearbeitbar = admin || (eigen && ["entwurf", "eingegangen"].includes(f.status));

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow={admin && !eigen ? "Fläche · Backoffice" : "Fläche"}
        titel={f.bezeichnung}
        text={[ha(f.ha), FLAECHE_NUTZUNG[f.nutzung], [f.plz, f.ort].filter(Boolean).join(" "), LAENDER[f.land]].filter(Boolean).join(" · ")}
        aktionen={<StatusBadge art="flaeche" status={f.status} className="text-[13px]" />}
      />

      <Karte>
        <Stepper art="flaeche" status={f.status} />
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">{statusInfo("flaeche", f.status).text}</p>
        {f.status === "abgelehnt" && f.ablehnGrund && <p className="mt-2 text-[14.5px] font-medium text-ink-800">Begründung: {f.ablehnGrund}</p>}
        <PipelineHinweis status={f.status} land={f.land} className="mt-5" />
      </Karte>

      <Angebotsbogen
        flaeche={f}
        aktionen={
          eigen && f.status === "pachtangebot" ? (
            <>
              <StatusAktionen art="flaeche" id={f.id} status={f.status} als="eigentuemer" />
              <Link href="#nachrichten" className="inline-flex items-center gap-2 text-[14px] font-semibold text-white/80 hover:text-white">
                <MessageSquareText aria-hidden="true" className="h-4 w-4" /> Rückfrage stellen
              </Link>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {eigen && <KiFlaeche flaecheId={f.id} agri={!!f.agri} />}

          <Karte titel="Nachrichten" id="nachrichten" untertitel="Rückfragen und Abstimmung zu dieser Fläche">
            <NachrichtenThread bezugArt="flaeche" bezugId={f.id} nachrichten={thread.nachrichten} />
          </Karte>

          <Karte titel="Angaben zur Fläche">
            <Angaben
              items={[
                { label: "Bundesland / Kanton", wert: f.bundesland },
                { label: "Größe", wert: ha(f.ha) },
                { label: "Nutzung", wert: FLAECHE_NUTZUNG[f.nutzung] },
                { label: "Agri-PV gewünscht", wert: f.agri ? "Ja" : "Nein" },
                { label: "Hinweise", wert: f.hinweise, breit: true },
                { label: "Angelegt", wert: datumZeit(f.erstelltAm) },
                admin && f.eigentuemer ? { label: "Eigentümer (Konto)", wert: `${f.eigentuemer.vorname} ${f.eigentuemer.nachname} · ${f.eigentuemer.email}` } : null,
                admin && f.vorgangId ? { label: "Aus Anfrage", wert: <Link className="text-ov-700 underline" href={`/portal/admin/vorgaenge/${f.vorgangId}`}>{f.vorgangId}</Link> } : null,
              ]}
            />
            <div className="mt-5 border-t border-ink-100 pt-5">
              <FachAngaben flaeche={f} />
            </div>
            {bearbeitbar && (
              <details className="group mt-6 rounded-2xl bg-sand-50 ring-1 ring-ink-200/70" open={f.status === "entwurf" && eigen}>
                <summary className="cursor-pointer list-none px-4 py-3 text-[14.5px] font-semibold text-ov-700 [&::-webkit-details-marker]:hidden">
                  {f.status === "entwurf" ? "Angaben vervollständigen & einreichen" : "Angaben bearbeiten"}
                </summary>
                <div className="border-t border-ink-200/70 p-4 md:p-5">
                  <FlaecheFormular flaeche={f} begriffe={begriffeFuer()} />
                </div>
              </details>
            )}
          </Karte>
        </div>

        <div className="min-w-0 space-y-6">
          {(admin || eigen) && (
            <Karte titel={admin && !eigen ? "Bearbeitung (Backoffice)" : "Aktionen"}>
              {admin && (
                <div className="mb-5">
                  <Zuweisung art="flaeche" id={f.id} zustaendigId={f.zustaendigId} konten={adminKonten} />
                </div>
              )}
              {eigen && f.status === "pachtangebot" && <p className="text-[14px] leading-relaxed text-ink-600">Bitte prüfen Sie das Pachtangebot oben: annehmen oder Rückfrage per Nachricht stellen.</p>}
              {eigen && f.status !== "pachtangebot" && <StatusAktionen art="flaeche" id={f.id} status={f.status} als="eigentuemer" leerText={admin ? undefined : "Aktuell ist nichts von Ihnen zu tun – wir melden uns."} />}
              {admin && (
                <StatusAktionen
                  art="flaeche"
                  id={f.id}
                  status={f.status}
                  als="admin"
                  kontext={{ pachtVorschlag: pachtVorschlag(f) }}
                  leerText="Keine weiteren Schritte vorgesehen."
                />
              )}
              {!admin && f.zustaendig && <p className="mt-4 text-[13.5px] text-ink-500">Ihr Ansprechpartner: <span className="font-semibold text-ink-800">{f.zustaendig.vorname} {f.zustaendig.nachname}</span></p>}
            </Karte>
          )}

          {(admin || eigen) && (
            <Karte titel="Fachliche Vorprüfung" untertitel="Einordnung Ihrer Angaben mit Ampel">
              <FachPruefungListe flaeche={f} />
            </Karte>
          )}

          <Karte titel="Verlauf">
            <Timeline art="flaeche" verlauf={f.statusVerlauf} />
          </Karte>

          <GrundbuchAmObjekt nutzer={n} bezugArt="flaeche" bezugId={f.id} />{/* Grundbuch & Closing: Dienstbarkeit */}
          <PachtakteAmObjekt nutzer={n} flaeche={f} />{/* Pachtakte (Team 1): Vertrag, Fristen, Anliegen */}

          {(admin || eigen) && (
            <Karte titel="Unterlagen zur Fläche" untertitel="Damit wir schnell und verbindlich prüfen können">
              <Checkliste checkliste={f.checkliste} bezugArt="flaeche" bezugId={f.id} kategorie="allgemein" kategorieJePunkt={{ flurkarte: "plan" }} darfHochladen={admin || eigen} />
            </Karte>
          )}

          <Karte titel="Dokumente" untertitel="Grundbuchauszug, Lageplan, Pachtangebot">
            <DokumentListe dokumente={dokumente} nutzerId={n.id} admin={admin} leerText="Noch keine Dokumente." />
            <div className="mt-4">
              <DokumentUpload bezugArt="flaeche" bezugId={f.id} kategorien={admin ? ["vertrag", "plan", "allgemein"] : ["allgemein", "plan"]} />
            </div>
          </Karte>

          {admin && <AufgabenKarte nutzer={n} bezugArt="flaeche" bezugId={f.id} />}
          {admin && <AktivitaetsFeed nutzer={n} objektId={f.id} weitereIds={f.vorgangId ? [f.vorgangId] : []} />}

          {f.agri && (
            <Hinweis ton="ok" titel="Agri-PV">
              Die landwirtschaftliche Nutzung bleibt Hauptnutzung. Wir planen nach <Begriff id="din-spec-91434">DIN SPEC 91434</Begriff>: Der landwirtschaftliche Ertrag muss mindestens {Math.round(AGRI.mindestErtrag * 100)} % des Referenzertrags erreichen; in Deutschland bleiben {Math.round(AGRI.gapFoerderfaehig * 100)} % der Fläche GAP-förderfähig.
            </Hinweis>
          )}
        </div>
      </div>
    </div>
  );
}

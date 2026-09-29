import Link from "next/link";
import { FileSignature, MessageSquareText } from "lucide-react";
import FlaecheFormular from "@/components/Portal/FlaecheFormular";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import NachrichtenThread from "@/components/Portal/NachrichtenThread";
import Zuweisung from "@/components/Portal/Zuweisung";
import { DokumentListe, DokumentUpload } from "@/components/Portal/Dokumente";
import { Angaben, Hinweis, Karte, SeitenKopf, StatusBadge, Stepper, Timeline } from "@/components/Portal/ui";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { FLAECHE_NUTZUNG, LAENDER } from "@/lib/plattform/konstanten";
import { statusInfo } from "@/lib/plattform/prozesse";
import { datum, datumZeit, eur, ha } from "@/lib/plattform/format";
import { PACHT } from "@/lib/invest/markt";

export const metadata = { title: "Fläche" };

export default async function Flaeche({ params }) {
  const { id } = await params;
  const n = await portalNutzer();
  const b = backend();
  const f = await laden(() => b.flaeche(n, id));
  const admin = istAdmin(n);
  const eigen = f.nutzerId === n.id;
  const [thread, dokumente, adminKonten] = await Promise.all([
    b.nachrichten(n, "flaeche", id),
    b.dokumente(n, { bezugArt: "flaeche", bezugId: id }),
    admin ? b.adminKonten(n) : [],
  ]);
  const bearbeitbar = admin || (eigen && ["entwurf", "eingegangen"].includes(f.status));
  const pa = f.pachtangebot;

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
      </Karte>

      {pa && (
        <section aria-labelledby="pachtangebot" className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-ov-500/30 blur-[90px]" />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">
                <FileSignature aria-hidden="true" className="h-4 w-4" /> Pachtangebot vom {datum(pa.am)}
              </p>
              <dl className="mt-4 grid gap-5 sm:grid-cols-3">
                <div>
                  <dt className="text-[12.5px] text-white/60">Pacht je Hektar und Jahr</dt>
                  <dd className="ov-num mt-1 font-display text-[28px] font-extrabold">{eur(pa.euroProHaJahr)}</dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-white/60">Für Ihre {ha(f.ha)} pro Jahr</dt>
                  <dd className="ov-num mt-1 font-display text-[28px] font-extrabold">{f.ha ? eur(pa.euroProHaJahr * f.ha) : "–"}</dd>
                </div>
                <div>
                  <dt className="text-[12.5px] text-white/60">Laufzeit</dt>
                  <dd className="mt-1 font-display text-[22px] font-bold">{pa.laufzeitJahre} Jahre{pa.verlaengerung ? <span className="block text-[13px] font-normal text-white/60">{pa.verlaengerung}</span> : null}</dd>
                </div>
              </dl>
              {pa.text && <p className="mt-4 max-w-2xl whitespace-pre-line text-[14.5px] leading-relaxed text-white/75">{pa.text}</p>}
              <p className="mt-3 text-[12.5px] text-white/50">Zur Einordnung: übliche Pacht für Freiflächen-PV {eur(PACHT.freiflaecheProHa.min)}–{eur(PACHT.freiflaecheProHa.max)} je ha und Jahr (DACH). Verbindlich ist allein der Vertrag.</p>
            </div>
            {eigen && f.status === "pachtangebot" && (
              <div className="flex flex-col gap-2">
                <StatusAktionen art="flaeche" id={f.id} status={f.status} als="eigentuemer" />
                <Link href="#nachrichten" className="inline-flex items-center gap-2 text-[14px] font-semibold text-white/80 hover:text-white">
                  <MessageSquareText aria-hidden="true" className="h-4 w-4" /> Rückfrage stellen
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
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
                { label: "Flurstücke", wert: f.flurstuecke?.length ? f.flurstuecke.map((s) => [s.gemarkung, s.flur && `Flur ${s.flur}`, s.nummer && `Nr. ${s.nummer}`].filter(Boolean).join(" ")).join("; ") : "", breit: true },
                { label: "Hinweise", wert: f.hinweise, breit: true },
                { label: "Angelegt", wert: datumZeit(f.erstelltAm) },
                admin && f.eigentuemer ? { label: "Eigentümer (Konto)", wert: `${f.eigentuemer.vorname} ${f.eigentuemer.nachname} · ${f.eigentuemer.email}` } : null,
                admin && f.vorgangId ? { label: "Aus Anfrage", wert: <Link className="text-ov-700 underline" href={`/portal/admin/vorgaenge/${f.vorgangId}`}>{f.vorgangId}</Link> } : null,
              ]}
            />
            {bearbeitbar && (
              <details className="group mt-6 rounded-2xl bg-sand-50 ring-1 ring-ink-200/70" open={f.status === "entwurf" && eigen}>
                <summary className="cursor-pointer list-none px-4 py-3 text-[14.5px] font-semibold text-ov-700 [&::-webkit-details-marker]:hidden">
                  {f.status === "entwurf" ? "Angaben vervollständigen & einreichen" : "Angaben bearbeiten"}
                </summary>
                <div className="border-t border-ink-200/70 p-4 md:p-5">
                  <FlaecheFormular flaeche={f} />
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
                  kontext={{ pachtVorschlag: { euroProHaJahr: f.agri ? PACHT.agriProHa.mittel : PACHT.freiflaecheProHa.mittel, laufzeitJahre: PACHT.laufzeit, verlaengerung: PACHT.verlaengerung } }}
                  leerText="Keine weiteren Schritte vorgesehen."
                />
              )}
              {!admin && f.zustaendig && <p className="mt-4 text-[13.5px] text-ink-500">Ihr Ansprechpartner: <span className="font-semibold text-ink-800">{f.zustaendig.vorname} {f.zustaendig.nachname}</span></p>}
            </Karte>
          )}

          <Karte titel="Verlauf">
            <Timeline art="flaeche" verlauf={f.statusVerlauf} />
          </Karte>

          <Karte titel="Dokumente" untertitel="Grundbuchauszug, Lageplan, Pachtangebot">
            <DokumentListe dokumente={dokumente} nutzerId={n.id} admin={admin} leerText="Noch keine Dokumente." />
            <div className="mt-4">
              <DokumentUpload bezugArt="flaeche" bezugId={f.id} kategorien={admin ? ["vertrag", "plan", "allgemein"] : ["allgemein", "plan"]} />
            </div>
          </Karte>

          {f.agri && (
            <Hinweis ton="ok" titel="Agri-PV">
              Die landwirtschaftliche Nutzung bleibt Hauptnutzung. Wir planen nach DIN SPEC 91434 – Details stimmen wir mit Ihnen ab.
            </Hinweis>
          )}
        </div>
      </div>
    </div>
  );
}

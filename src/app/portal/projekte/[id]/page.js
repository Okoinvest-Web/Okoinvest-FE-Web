import { Eye, ExternalLink, FileSignature, Heart, KeyRound, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import ProjektFormular from "@/components/Portal/ProjektFormular";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import NachrichtenThread from "@/components/Portal/NachrichtenThread";
import Zuweisung from "@/components/Portal/Zuweisung";
import { DokumentListe, DokumentUpload } from "@/components/Portal/Dokumente";
import { Angaben, Hinweis, Karte, Kennzahl, SeitenKopf, StatusBadge, Stepper, Timeline } from "@/components/Portal/ui";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { statusInfo, statusLabel } from "@/lib/plattform/prozesse";
import { VERTRAULICH_FELDER } from "@/lib/plattform/oeffentlich";
import { datumZeit, eur, mwp, preisText, prozent } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { phaseById, PROVISION } from "@/lib/invest/markt";

export const metadata = { title: "Projekt" };

export default async function Projekt({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const n = await portalNutzer();
  const b = backend();
  const p = await laden(() => b.projekt(n, id));
  const admin = istAdmin(n);
  const eigen = p.anbieterId === n.id;
  const [thread, dokumente, interessen, adminKonten] = await Promise.all([
    b.nachrichten(n, "projekt", id),
    b.dokumente(n, { bezugArt: "projekt", bezugId: id }),
    admin ? b.interessen(n, { alle: true, projektId: id }) : [],
    admin ? b.adminKonten(n) : [],
  ]);
  const bearbeiten = eigen && p.status === "entwurf";
  const schritt = Number(sp?.schritt) || 0;
  const interessenten = interessen
    .filter((i) => ["nda_freigegeben", "loi_abgegeben", "loi_angenommen"].includes(i.status))
    .map((i) => ({ id: i.id, label: `${i.investor?.vorname} ${i.investor?.nachname}${i.investor?.firma ? ` (${i.investor.firma})` : ""} – ${statusLabel("interesse", i.status)}` }));
  const phase = p.phase ? phaseById(p.phase) : null;

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow={admin && !eigen ? "Projekt · Backoffice" : "Mein Projekt"}
        titel={p.titel || "Neues Projekt"}
        text={[PROJEKT_TYPEN[p.typ], mwp(p.mwp), LAENDER[p.land], p.region].filter(Boolean).join(" · ")}
        aktionen={
          <>
            <StatusBadge art="projekt" status={p.status} className="text-[13px]" />
            {["veroeffentlicht", "reserviert"].includes(p.status) && (
              <Button href={`/projektboerse/${p.slug}`} size="sm" variant="secondary" icon={ExternalLink} target="_blank">
                Öffentliche Ansicht
              </Button>
            )}
          </>
        }
      />

      {sp?.eingereicht && <Hinweis ton="ok" titel="Eingereicht">Ihr Projekt liegt dem Backoffice zur Prüfung vor. Sie erhalten eine Nachricht, sobald es veröffentlicht ist oder Rückfragen bestehen.</Hinweis>}

      <Karte>
        <Stepper art="projekt" status={p.status} />
        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">{statusInfo("projekt", p.status).text}</p>
        {p.status === "abgelehnt" && p.ablehnGrund && <p className="mt-2 text-[14.5px] font-medium text-ink-800">Begründung: {p.ablehnGrund}</p>}
      </Karte>

      {bearbeiten ? (
        <Karte titel="Projekt bearbeiten" untertitel="Fünf Schritte – jeder wird gespeichert">
          <ProjektFormular projekt={p} schrittStart={schritt} />
        </Karte>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kennzahl label="Aufrufe" wert={fmt(p.statistik.aufrufe)} icon={Eye} />
          <Kennzahl label="Merker" wert={fmt(p.statistik.merker)} icon={Heart} />
          <Kennzahl label="NDA-Anfragen" wert={fmt(p.statistik.ndaAnfragen)} icon={KeyRound} />
          <Kennzahl label="LOIs" wert={fmt(p.statistik.lois)} icon={FileSignature} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {!bearbeiten && (
            <Karte titel="Exposé (öffentlicher Teaser)" aktion={eigen && p.status !== "entwurf" ? <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-500"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Bearbeiten nur im Entwurf</span> : null}>
              <Angaben
                items={[
                  { label: "Phase", wert: phase?.label },
                  { label: "Netzanschluss", wert: NETZANSCHLUSS[p.netzanschluss] },
                  { label: "Geplante Inbetriebnahme", wert: p.codGeplant },
                  { label: "Preisindikation", wert: preisText(p) },
                  { label: "Bundesland / Kanton", wert: p.bundesland },
                  { label: "Fläche", wert: p.flaecheHa ? `${fmt(p.flaecheHa, 1)} ha` : "" },
                  { label: "Speicher", wert: p.mwhSpeicher ? `${fmt(p.mwhSpeicher)} MWh` : "" },
                  { label: "Beschreibung", wert: p.beschreibung, breit: true },
                  { label: "Highlights", wert: p.highlights?.join(" · "), breit: true },
                ]}
              />
            </Karte>
          )}
          {!bearbeiten && (
            <Karte titel="Vertrauliche Angaben" untertitel="Nur Backoffice und Investoren mit freigegebenem NDA">
              <Angaben items={Object.entries(VERTRAULICH_FELDER).map(([k, label]) => ({ label, wert: p.vertraulich?.[k] === undefined || p.vertraulich?.[k] === null ? "" : String(p.vertraulich[k]), breit: k === "details" }))} />
              {!Object.values(p.vertraulich || {}).some(Boolean) && <p className="text-[14px] text-ink-500">Keine vertraulichen Angaben hinterlegt.</p>}
            </Karte>
          )}
          <Karte titel="Nachrichten" untertitel="Abstimmung mit dem Backoffice zu diesem Projekt">
            <NachrichtenThread bezugArt="projekt" bezugId={p.id} nachrichten={thread.nachrichten} />
          </Karte>
        </div>

        <div className="min-w-0 space-y-6">
          <Karte titel={admin && !eigen ? "Prüfung & Freigabe" : "Aktionen"}>
            {admin && (
              <div className="mb-5 space-y-3">
                <Zuweisung art="projekt" id={p.id} zustaendigId={p.zustaendigId} konten={adminKonten} />
                {p.anbieter && <p className="text-[13.5px] text-ink-600">Anbieter: <span className="font-semibold text-ink-900">{p.anbieter.vorname} {p.anbieter.nachname}</span>{p.anbieter.firma ? ` · ${p.anbieter.firma}` : ""} · {p.anbieter.email}</p>}
                <p className="text-[13.5px] text-ink-600">Provisionsvereinbarung: {p.provisionAkzeptiert ? `akzeptiert am ${datumZeit(p.provisionAkzeptiert.am)}${p.provisionAkzeptiert.ip ? ` (IP ${p.provisionAkzeptiert.ip})` : ""}` : "noch nicht akzeptiert"}</p>
              </div>
            )}
            {eigen && !bearbeiten && <StatusAktionen art="projekt" id={p.id} status={p.status} als="eigentuemer" leerText={admin ? undefined : "Aktuell ist nichts von Ihnen zu tun."} />}
            {eigen && bearbeiten && <p className="text-[14px] text-ink-600">Vervollständigen Sie die fünf Schritte und reichen Sie das Projekt im letzten Schritt ein.</p>}
            {admin && <StatusAktionen art="projekt" id={p.id} status={p.status} als="admin" kontext={{ interessenten }} className={eigen ? "mt-4" : ""} leerText="Keine weiteren Schritte vorgesehen." />}
            {p.provisionSatz != null && <p className="mt-4 text-[13.5px] text-ink-600">Vereinbarter Provisionssatz: <span className="font-semibold text-ink-900">{prozent(p.provisionSatz, 1)}</span> ({PROVISION.verkaeufer.text})</p>}
          </Karte>

          {p.provision && (
            <Karte titel="Abschluss & Provision">
              <Angaben
                spalten={1}
                items={[
                  { label: "Kaufpreis", wert: eur(p.provision.kaufpreis) },
                  { label: "Provision", wert: `${eur(p.provision.betrag)} (${prozent(p.provision.satz, 1)})` },
                  { label: "Status", wert: <StatusBadge art="provision" status={p.provision.status} /> },
                ]}
              />
            </Karte>
          )}

          <Karte titel="Datenraum & Dokumente" untertitel="Datenraum-Dokumente sehen nur Investoren mit freigegebenem NDA.">
            <DokumentListe dokumente={dokumente} nutzerId={n.id} admin={admin} leerText="Noch keine Unterlagen. Typisch: Lageplan, Netzzusage, B-Plan-Stand, Pachtverträge (geschwärzt), Ertragsgutachten." />
            {(eigen || admin) && (
              <div className="mt-4">
                <DokumentUpload bezugArt="projekt" bezugId={p.id} kategorien={["datenraum", "plan", "allgemein"]} />
              </div>
            )}
          </Karte>

          <Karte titel="Verlauf">
            <Timeline art="projekt" verlauf={p.statusVerlauf} />
          </Karte>

          {admin && interessen.length > 0 && (
            <Karte titel="Interessenten">
              <ul className="space-y-3">
                {interessen.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="min-w-0 truncate">{i.investor?.vorname} {i.investor?.nachname}{i.investor?.firma ? ` · ${i.investor.firma}` : ""}</span>
                    <StatusBadge art="interesse" status={i.status} />
                  </li>
                ))}
              </ul>
            </Karte>
          )}
        </div>
      </div>
    </div>
  );
}

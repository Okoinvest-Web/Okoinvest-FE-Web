import { Check, ExternalLink, FolderLock, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import TypIllustration from "@/components/Boerse/TypIllustration";
import { PhaseBadge } from "@/components/Boerse/ProjektKarte";
import MerkenKnopf from "@/components/Boerse/MerkenKnopf";
import NdaAnfrage from "@/components/Boerse/NdaAnfrage";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import NachrichtenThread from "@/components/Portal/NachrichtenThread";
import { DokumentListe } from "@/components/Portal/Dokumente";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf, StatusBadge, Timeline } from "@/components/Portal/ui";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { VERTRAULICH_FELDER } from "@/lib/plattform/oeffentlich";
import { statusInfo } from "@/lib/plattform/prozesse";
import { datumZeit, eur, mwp, preisText } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { phaseById } from "@/lib/invest/markt";

export const metadata = { title: "Exposé" };

export default async function PortalExpose({ params }) {
  const { id } = await params;
  const n = await portalNutzer({ rollen: ["investor"] });
  const b = backend();
  const d = await laden(() => b.boerseDetail(n, id, { zaehlen: true }));
  const p = d.projekt;
  const i = d.interesse;
  const thread = i ? await b.nachrichten(n, "interesse", i.id) : null;
  const phase = phaseById(p.phase);
  const frei = d.zugriff !== "oeffentlich";

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Exposé"
        titel={p.titel}
        text={[PROJEKT_TYPEN[p.typ], mwp(p.mwp), p.region, LAENDER[p.land]].filter(Boolean).join(" · ")}
        aktionen={
          <>
            {i && i.status !== "gemerkt" && <StatusBadge art="interesse" status={i.status} className="text-[13px]" />}
            <MerkenKnopf projektId={p.id} gemerkt={!!i?.gemerkt} mitText />
            {p.slug && <Button href={`/projektboerse/${p.slug}`} size="sm" variant="ghost" icon={ExternalLink}>Öffentlich</Button>}
          </>
        }
      />
      {p.demo && <Hinweis ton="warn">Demo-Projekt – alle Angaben sind fiktiv.</Hinweis>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
            <div className="relative">
              <TypIllustration typ={p.typ} className="h-40 w-full" />
              <div className="absolute left-4 top-4 flex gap-2">
                <PhaseBadge phase={p.phase} />
                {p.status === "reserviert" && <Badge ton="dunkel">Reserviert</Badge>}
              </div>
            </div>
            <div className="p-5 md:p-6">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{p.beschreibung}</p>
              {p.highlights?.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[14px] text-ink-700"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />{h}</li>
                  ))}
                </ul>
              )}
              <div className="mt-6 border-t border-ink-100 pt-5">
                <Angaben
                  spalten={3}
                  items={[
                    { label: "Leistung", wert: `${mwp(p.mwp)}${p.mwhSpeicher ? ` · ${fmt(p.mwhSpeicher)} MWh` : ""}` },
                    { label: "Phase", wert: phase.label },
                    { label: "Netzanschluss", wert: NETZANSCHLUSS[p.netzanschluss] },
                    { label: "COD geplant", wert: p.codGeplant },
                    { label: "Preisindikation", wert: preisText(p) },
                    { label: "Fläche", wert: p.flaecheHa ? `${fmt(p.flaecheHa, 1)} ha` : "" },
                    { label: "Region", wert: [p.region, p.bundesland].filter(Boolean).join(", ") },
                    { label: "Marktspanne der Phase", wert: `${fmt(phase.preisProKwp.min)}–${fmt(phase.preisProKwp.max)} €/kWp` },
                    { label: "Risiko (typisch)", wert: phase.risiko },
                  ]}
                />
              </div>
            </div>
          </div>

          <Karte titel="Vertrauliche Angaben" aktion={frei ? <Badge ton="ok">Freigeschaltet</Badge> : <Lock aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
            {frei ? (
              Object.keys(d.vertraulich || {}).length ? (
                <Angaben items={Object.entries(d.vertraulich).map(([k, w]) => ({ label: VERTRAULICH_FELDER[k] || k, wert: String(w), breit: k === "details" }))} />
              ) : (
                <p className="text-[14px] text-ink-500">Der Anbieter hat noch keine vertraulichen Angaben hinterlegt – Unterlagen finden Sie im Datenraum.</p>
              )
            ) : (
              <p className="text-[14.5px] leading-relaxed text-ink-600">Gemeinde, Flurstücke, Netzbetreiber, Einspeisepunkt, Ertrag und Unterlagen werden sichtbar, sobald das Backoffice Ihre NDA-Anfrage freigegeben hat.</p>
            )}
          </Karte>

          {i && thread && (
            <Karte titel="Nachrichten zu diesem Projekt" untertitel="Fragen zum Projekt beantwortet das Backoffice – der Anbieter bleibt bis zur Freigabe anonym.">
              <NachrichtenThread bezugArt="interesse" bezugId={i.id} nachrichten={thread.nachrichten} />
            </Karte>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {(!i || i.status === "gemerkt") && (
            <Karte titel="Datenraum anfragen">
              {p.status === "reserviert" && <p className="mb-4 text-[13.5px] text-ink-600">Das Projekt ist reserviert. Sie können trotzdem Interesse anmelden – falls die Gespräche scheitern, melden wir uns.</p>}
              <NdaAnfrage projektId={p.id} />
            </Karte>
          )}
          {i && i.status === "nda_angefragt" && (
            <Hinweis ton="warn" titel="NDA-Anfrage liegt vor">
              Sie haben die Vertraulichkeitsvereinbarung am {datumZeit(i.nda?.am)} akzeptiert. Das Backoffice prüft die Freigabe – in der Regel innerhalb von zwei Werktagen.
            </Hinweis>
          )}
          {frei && (
            <Karte titel="Datenraum" aktion={<FolderLock aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <DokumentListe dokumente={d.dokumente} nutzerId={n.id} leerText="Noch keine Unterlagen im Datenraum." />
              <p className="mt-3 text-[12.5px] text-ink-500">Zugriffe werden protokolliert. Weitergabe nur gemäß NDA.</p>
            </Karte>
          )}
          {i && ["nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen", "abgelehnt"].includes(i.status) && (
            <Karte titel="Absichtserklärung (LOI)">
              {i.loi ? (
                <Angaben
                  spalten={1}
                  items={[
                    { label: "Abgegeben", wert: datumZeit(i.loi.am) },
                    { label: "Indikativer Kaufpreis", wert: i.loi.betrag ? eur(i.loi.betrag) : "" },
                    { label: "Inhalt", wert: i.loi.text },
                    { label: "Bedingungen", wert: i.loi.bedingungen },
                  ]}
                />
              ) : (
                <p className="mb-4 text-[14px] leading-relaxed text-ink-600">Nach Prüfung des Datenraums können Sie hier eine unverbindliche Absichtserklärung abgeben.</p>
              )}
              <StatusAktionen art="interesse" id={i.id} status={i.status} als="eigentuemer" className={i.loi ? "mt-4" : ""} />
              <p className="mt-4 text-[13.5px] text-ink-500">{statusInfo("interesse", i.status).text}</p>
            </Karte>
          )}
          {i && (
            <Karte titel="Verlauf">
              <Timeline art="interesse" verlauf={i.statusVerlauf} />
            </Karte>
          )}
        </div>
      </div>
    </div>
  );
}

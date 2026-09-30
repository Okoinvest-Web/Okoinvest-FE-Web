import { Check, ExternalLink, FileDown, FolderLock, Gavel, Lock } from "lucide-react";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import DateiLink from "@/components/Portal/DateiLink";
import { QualitaetsBalken } from "@/components/Portal/ui";
import Button from "@/components/ui/Button";
import TypIllustration from "@/components/Boerse/TypIllustration";
import { PhaseBadge } from "@/components/Boerse/ProjektKarte";
import MerkenKnopf from "@/components/Boerse/MerkenKnopf";
import NdaAnfrage from "@/components/Boerse/NdaAnfrage";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import NachrichtenThread from "@/components/Portal/NachrichtenThread";
import KiFrage from "@/components/Portal/Ki/KiFrage";
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
import KycHinweisServer from "@/components/Portal/Kyc/KycHinweisServer"; // KYC/KYB: Hinweis vor Datenraum-Freigabe
// Fachprüfung Kapitalseite: Datenblatt, Due-Diligence-Index, Bewertungswerkzeug, strukturierte LOI, Suchprofil-Passung
import { Calculator } from "lucide-react";
import { DatenblattAnzeige, DdIndexKarte } from "@/components/Portal/Fach/DdIndex";
import LoiFormular from "@/components/Portal/Fach/LoiFormular";
import { loiZeilen } from "@/lib/plattform/fach/loi";
import { passungHinweise } from "@/lib/plattform/fach/suchprofil";
import AnbieterAkte from "@/components/Portal/Anbieter/AnbieterAkte"; // Anbieter: Bestandsanlage (Ist-Daten) nach NDA
import { anbieterBackend } from "@/lib/plattform/backend/anbieter";

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
  const bestandAkte = frei && p.phase === "cod" ? await anbieterBackend().anbieterAkte(n, p.id).catch(() => null) : null; // Bestandsanlage: Ertragshistorie, Verträge, Förderung, DD

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
            {frei ? (
              <>
                <Button href={`/portal/dealroom/${p.id}`} size="sm" variant="navy" icon={Gavel}>Deal-Room</Button>
                <Button href={`/portal/boerse/${p.id}/bewertung`} size="sm" variant="secondary" icon={Calculator}>Bewerten</Button>
                <Button href={`/portal/finanzierung?projekt=${p.id}`} size="sm" variant="secondary" icon={Calculator}>Finanzierung</Button>{/* Finanzierungscockpit */}
                <DateiLink href={`/api/portal/projekte/${p.id}/expose`} icon={FileDown} variant="primary">Exposé (PDF)</DateiLink>
              </>
            ) : (
              p.slug && <DateiLink href={`/api/boerse/${p.slug}/teaser`} icon={FileDown} neuesFenster>Teaser (PDF)</DateiLink>
            )}
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
              {typeof p.datenraumQualitaet === "number" && (
                <div className="mt-5 max-w-sm">
                  <QualitaetsBalken quote={p.datenraumQualitaet} />
                </div>
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

          {frei && <DatenblattAnzeige projekt={{ ...p, vertraulich: d.vertraulich || {}, datenblatt: d.datenblatt || {} }} untertitel="Angaben des Anbieters – Wirtschaftlichkeit ungeprüft" />}
          {bestandAkte && <AnbieterAkte akte={bestandAkte} />}

          {frei && <KiFrage projektId={p.id} />}

          {i && thread && (
            <Karte id="projekt-nachrichten" titel="Nachrichten zu diesem Projekt" untertitel="Fragen zum Projekt beantwortet das Backoffice – der Anbieter bleibt bis zur Freigabe anonym.">
              <NachrichtenThread bezugArt="interesse" bezugId={i.id} nachrichten={thread.nachrichten} />
            </Karte>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          {!frei && <KycHinweisServer schritt="nda" nutzer={n} />}
          {(() => {
            const h = passungHinweise(p, n.suchprofil, frei ? d.datenblatt : null);
            return h.passt.length || h.pruefen.length ? (
              <Karte titel="Passung zu Ihrem Suchprofil" untertitel={p.matching ? `Matching-Score ${p.matching.score} %` : undefined}>
                <ul className="space-y-1.5 text-[14px]">
                  {h.passt.map((x) => <li key={x} className="flex items-start gap-2 text-ink-800"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />{x}</li>)}
                  {h.pruefen.map((x) => <li key={x} className="flex items-start gap-2 text-ink-700"><span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sun-400" />{x}</li>)}
                </ul>
              </Karte>
            ) : null;
          })()}
          {frei && d.ddIndex && <DdIndexKarte index={d.ddIndex} kompakt aktion={<Button href={`/portal/boerse/${p.id}/bewertung`} size="sm" variant="ghost" icon={Calculator}>Bewerten</Button>} />}
          {(!i || i.status === "gemerkt") && (
            <Karte titel={<>Datenraum anfragen <Begriff id="nda" nurIcon /></>}>
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
            <Karte titel={<>Datenraum <Begriff id="datenraum" nurIcon /></>} aktion={<FolderLock aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <DokumentListe dokumente={d.dokumente} nutzerId={n.id} leerText="Noch keine Unterlagen im Datenraum." />
              <p className="mt-3 text-[12.5px] text-ink-500">Zugriffe werden protokolliert. Weitergabe nur gemäß NDA. Das Exposé-PDF enthält Ihren Namen als Empfänger.</p>
            </Karte>
          )}
          {i && ["nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen", "abgelehnt"].includes(i.status) && (
            <Karte titel={<>Absichtserklärung (LOI) <Begriff id="loi" nurIcon /></>}>
              {i.loi ? (
                <Angaben spalten={1} items={[{ label: "Abgegeben", wert: datumZeit(i.loi.am) }, ...loiZeilen(i.loi)]} />
              ) : i.status === "nda_freigegeben" ? (
                <>
                  <p className="mb-4 text-[14px] leading-relaxed text-ink-600">Nach Prüfung des Datenraums geben Sie hier eine unverbindliche Absichtserklärung ab – mit Preisbasis, Struktur, Bedingungen und Exklusivität wie im Markt üblich. Tipp: Rechnen Sie Ihr Angebot vorher im <a href={`/portal/boerse/${p.id}/bewertung`} className="font-semibold text-ov-700 hover:text-ov-800">Bewertungswerkzeug</a>.</p>
                  <KycHinweisServer schritt="loi" nutzer={n} />
                  <LoiFormular interesseId={i.id} mwp={p.mwp} vorschlag={p.preisModus === "proKwp" ? { preisProKwp: p.preisProKwp } : p.preisModus === "gesamt" ? { betrag: p.preis } : null} />
                </>
              ) : (
                <p className="mb-4 text-[14px] leading-relaxed text-ink-600">Nach Prüfung des Datenraums können Sie hier eine unverbindliche Absichtserklärung abgeben.</p>
              )}
              {i.status !== "nda_freigegeben" && <StatusAktionen art="interesse" id={i.id} status={i.status} als="eigentuemer" className={i.loi ? "mt-4" : ""} />}
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

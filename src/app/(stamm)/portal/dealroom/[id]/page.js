import Link from "next/link";
import {
  ArrowRight, BarChart3, Eye, EyeOff, FileDown, FolderLock, Gavel, Handshake, KeyRound, LayoutDashboard, LockOpen, MessageCircleQuestion, ScrollText, ShieldCheck,
} from "lucide-react";
import Button from "@/components/ui/Button";
import DateiLink from "@/components/Portal/DateiLink";
import { Badge, Hinweis, Karte, Kennzahl, PfeilLink, SeitenKopf, StatusBadge, Stepper } from "@/components/Portal/ui";
import DealTabs from "@/components/Portal/Dealroom/Tabs";
import QaBereich from "@/components/Portal/Dealroom/QaBereich";
import DatenraumBaum from "@/components/Portal/Dealroom/DatenraumBaum";
import BieterBereich from "@/components/Portal/Dealroom/BieterBereich";
import Zugriffsprotokoll from "@/components/Portal/Dealroom/Zugriffsprotokoll";
import NotizEditor from "@/components/Portal/Dealroom/NotizEditor";
import KontaktFreigabe from "@/components/Portal/Dealroom/KontaktFreigabe";
import Countdown from "@/components/Portal/Dealroom/Countdown";
import { Trichter, Zeitverlauf } from "@/components/Portal/Dealroom/Diagramme";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { dealroom } from "@/lib/plattform/backend/dealroom";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { DATENRAUM_STUFEN, RUNDEN_ARTEN, VERFAHREN_STATUS } from "@/lib/plattform/dealroom";
import { datumZeit, eur, mwp } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Deal-Room" };

const TAB_IDS = ["uebersicht", "datenraum", "qa", "bieter", "zugriffe"];

export default async function DealroomSeite({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const n = await portalNutzer();
  const d = dealroom();
  const kopf = await laden(() => d.dealroomKopf(n, id));
  const { rolle, projekt: p } = kopf;
  const investor = rolle === "investor";
  const tab = TAB_IDS.includes(sp?.tab) && !(investor && sp.tab === "zugriffe") ? sp.tab : "uebersicht";
  const basis = `/portal/dealroom/${p.id}`;

  const [qa, bv] = await Promise.all([laden(() => d.qaListe(n, p.id)), laden(() => d.bieterverfahren(n, p.id))]);
  const vf = bv.verfahren;
  const laeuft = vf && ["laufend", "auswertung"].includes(vf.status);

  const tabs = [
    { id: "uebersicht", label: investor ? "Übersicht" : "Cockpit", icon: investor ? LayoutDashboard : BarChart3 },
    { id: "datenraum", label: "Datenraum", icon: FolderLock },
    { id: "qa", label: "Q&A", icon: MessageCircleQuestion, zaehler: rolle === "admin" ? qa.zaehler.moderation : rolle === "anbieter" ? qa.fragen.filter((f) => f.status === "freigegeben").length : 0 },
    { id: "bieter", label: "Bieterverfahren", icon: Gavel, zaehler: laeuft && investor && vf.zugelassen && vf.runde.offen && !vf.eigeneGebote?.some((g) => g.runde === vf.runde.nr && g.status === "abgegeben") ? 1 : 0 },
    ...(!investor ? [{ id: "zugriffe", label: "Zugriffsprotokoll", icon: ScrollText }] : []),
  ];

  let inhalt = null;
  if (tab === "datenraum") {
    const dr = await laden(() => d.datenraum(n, p.id, { besuch: investor }));
    inhalt = (
      <div className="space-y-5">
        <Hinweis ton={investor ? "info" : "neutral"} icon={ShieldCheck} titel={investor ? `Ihre Freigabe: ${DATENRAUM_STUFEN[kopf.stufe]?.label} (${DATENRAUM_STUFEN[kopf.stufe]?.text})` : "Datenraum verwalten"}>
          {investor
            ? `Jeder Zugriff wird protokolliert; Downloads tragen Ihren Namen und das Datum im Dateinamen. Weitergabe nur gemäß NDA.${dr.gesperrt ? ` ${dr.gesperrt} ${dr.gesperrt === 1 ? "Unterlage wird" : "Unterlagen werden"} erst ${DATENRAUM_STUFEN[2].text} freigegeben.` : ""}`
            : "Ordner nach Standard-Index, Freigabestufe je Dokument (Stufe 1 nach NDA, Stufe 2 nach LOI bzw. Zulassung zur verbindlichen Runde) und neue Versionen. Investoren sehen nur Datenraum-Dokumente."}
        </Hinweis>
        <DatenraumBaum projektId={p.id} datenraum={dr} verwalten={!investor} />
      </div>
    );
  } else if (tab === "qa") {
    inhalt = <QaBereich projektId={p.id} rolle={rolle} fragen={qa.fragen} kannFragen={investor && ["veroeffentlicht", "reserviert"].includes(p.status)} />;
  } else if (tab === "bieter") {
    inhalt = <BieterBereich projekt={{ ...bv.projekt, id: p.id }} rolle={rolle} verfahren={vf} interessenten={kopf.interessenten || []} />;
  } else if (tab === "zugriffe") {
    const zg = await laden(() => d.datenraumZugriffe(n, p.id));
    inhalt = (
      <Karte titel="Zugriffsprotokoll" untertitel={rolle === "anbieter" ? "Investoren erscheinen als Pseudonym, bis ÖkoInvest den Kontakt freigibt." : "Alle Zugriffe der Investoren auf den Datenraum."}>
        <Zugriffsprotokoll zugriffe={zg} />
      </Karte>
    );
  } else if (investor) {
    const [dr, pl] = await Promise.all([laden(() => d.datenraum(n, p.id)), d.pipeline(n).catch(() => null)]);
    const karte = pl?.karten.find((k) => k.projekt.id === p.id);
    const eigeneOffen = qa.fragen.filter((f) => f.eigen && f.status === "offen").length;
    const beantwortet = qa.fragen.filter((f) => f.status === "beantwortet").length;
    inhalt = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Ihr Stand">
            <Stepper art="interesse" status={kopf.interesse.status} />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Kennzahl label="Datenraum" wert={DATENRAUM_STUFEN[kopf.stufe]?.label} hinweis={`${dr.anzahl - dr.gesperrt} von ${dr.anzahl} Unterlagen offen`} icon={FolderLock} href={`${basis}?tab=datenraum`} />
              <Kennzahl label="Ihre offenen Fragen" wert={fmt(eigeneOffen)} hinweis={`${beantwortet} beantwortet`} icon={MessageCircleQuestion} href={`${basis}?tab=qa`} />
              <Kennzahl label="Bieterverfahren" wert={vf ? VERFAHREN_STATUS[vf.status]?.label : "–"} hinweis={vf ? `Runde ${vf.runde.nr} · ${RUNDEN_ARTEN[vf.runde.art]?.kurz}` : "derzeit keines"} icon={Gavel} href={`${basis}?tab=bieter`} />
            </div>
          </Karte>
          {vf && vf.status === "laufend" && vf.zugelassen && (
            <Karte titel={`${RUNDEN_ARTEN[vf.runde.art]?.label} – Runde ${vf.runde.nr}`} aktion={<Countdown frist={vf.runde.frist} label="Angebotsfrist" />}>
              <p className="text-[14.5px] leading-relaxed text-ink-700">
                {vf.eigeneGebote?.some((g) => g.runde === vf.runde.nr && g.status === "abgegeben") ? "Ihr Gebot liegt vor. Bis zum Fristende können Sie es aktualisieren oder zurückziehen." : "Sie sind zur Angebotsabgabe eingeladen. Gebote sind verdeckt – niemand außer ÖkoInvest sieht Ihren Namen."}
              </p>
              <Button href={`${basis}?tab=bieter`} size="sm" className="mt-4" pfeil>Zum Gebot</Button>
            </Karte>
          )}
          <Karte titel="Notizen & Tags">
            <NotizEditor projektId={p.id} notiz={karte?.notiz} vorschlaege={pl?.tags || []} />
          </Karte>
        </div>
        <div className="min-w-0 space-y-6">
          <Karte titel="Anbieter" aktion={kopf.kontaktFrei ? <Badge ton="ok"><LockOpen aria-hidden="true" className="h-3.5 w-3.5" /> Kontakt frei</Badge> : <Badge><EyeOff aria-hidden="true" className="h-3.5 w-3.5" /> anonym</Badge>}>
            {kopf.kontaktFrei ? (
              <p className="text-[14.5px] text-ink-800"><span className="font-semibold">{kopf.anbieter.firma || kopf.anbieter.name}</span>{kopf.anbieter.firma ? ` · ${kopf.anbieter.name}` : ""}</p>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink-600">Der Anbieter bleibt anonym, bis ÖkoInvest den Kontakt freigibt (Umgehungsschutz laut NDA). Fragen stellen Sie über das Q&A – ÖkoInvest leitet sie anonymisiert weiter.</p>
            )}
          </Karte>
          <Karte titel="Schnellzugriff">
            <ul className="space-y-3">
              <li><PfeilLink href={`${basis}?tab=datenraum`}>Datenraum ({dr.anzahl} Unterlagen)</PfeilLink></li>
              <li><PfeilLink href={`${basis}?tab=qa`}>Fragen & Antworten ({qa.fragen.length})</PfeilLink></li>
              <li><PfeilLink href={`/portal/boerse/${p.id}`}>Exposé, LOI & Nachrichten</PfeilLink></li>
              <li><PfeilLink href="/portal/pipeline">Meine Deal-Pipeline</PfeilLink></li>
            </ul>
          </Karte>
        </div>
      </div>
    );
  } else {
    const c = await laden(() => d.dealCockpit(n, p.id, { tage: 60 }));
    const t = Object.fromEntries(c.trichter.map((x) => [x.id, x.wert]));
    const letzte30 = c.verlauf.slice(-30).reduce((s, x) => s + x.aufrufe, 0);
    const vor30 = c.verlauf.slice(0, 30).reduce((s, x) => s + x.aufrufe, 0);
    const bester = c.bieter?.matrix?.filter((g) => g.runde === c.bieter.runde.nr).sort((a, b) => (b.preisGesamt || 0) - (a.preisGesamt || 0))[0];
    inhalt = (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kennzahl label="Aufrufe gesamt" wert={fmt(t.aufrufe)} hinweis={`${fmt(letzte30)} in 30 Tagen${vor30 ? ` (${letzte30 >= vor30 ? "+" : ""}${fmt(Math.round(((letzte30 - vor30) / vor30) * 100))} %)` : ""}`} icon={Eye} />
          <Kennzahl label="NDA" wert={fmt(t.nda)} hinweis={`${fmt(t.merker)} Merker`} icon={KeyRound} />
          <Kennzahl label="Datenraum" wert={fmt(t.datenraum)} hinweis={`${c.zugriffe.investoren.length} mit Zugriffen`} icon={FolderLock} href={`${basis}?tab=zugriffe`} />
          <Kennzahl label="Angebote" wert={fmt(t.angebote)} hinweis={c.bieter ? `Bieterverfahren: ${VERFAHREN_STATUS[c.bieter.status]?.label}` : "LOIs und Gebote"} icon={Handshake} href={`${basis}?tab=bieter`} ton="dunkel" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Karte titel="Trichter" untertitel="Aufrufe → Merker → NDA → Datenraum → Angebote (Umwandlung je Stufe)">
            <Trichter stufen={c.trichter} />
          </Karte>
          <Karte titel="Aufrufe über Zeit" untertitel={`Letzte ${c.verlauf.length} Tage · ${fmt(c.aufrufeZeitraum)} Aufrufe des Exposés`}>
            <Zeitverlauf punkte={c.verlauf} />
          </Karte>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Karte titel="Offene Fragen" aktion={<PfeilLink href={`${basis}?tab=qa`}>Q&A</PfeilLink>} untertitel={rolle === "admin" ? `${qa.zaehler.moderation || 0} warten auf Moderation` : "Anonymisiert von ÖkoInvest weitergeleitet"}>
            {c.fragen.offen.length ? (
              <ul className="space-y-3">
                {c.fragen.offen.slice(0, 5).map((f) => (
                  <li key={f.id} className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
                      <Badge ton="info" className="py-0.5">{f.kategorieLabel}</Badge>
                      {f.von?.pseudonym}
                      {f.fristAm && <span className={f.ueberfaellig ? "font-semibold text-ink-900" : ""}>· Frist {datumZeit(f.fristAm)}{f.ueberfaellig ? " (überschritten)" : ""}</span>}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14px] text-ink-800">{f.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Keine offenen Fragen.</p>
            )}
          </Karte>
          <Karte titel="Bieterstand" aktion={<PfeilLink href={`${basis}?tab=bieter`}>Verfahren</PfeilLink>}>
            {!c.bieter ? (
              <p className="text-[14px] text-ink-500">Noch kein Bieterverfahren. {rolle === "admin" ? "Starten Sie es im Reiter „Bieterverfahren“." : "ÖkoInvest startet es, sobald genügend Interessenten den Datenraum geprüft haben."}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge ton={VERFAHREN_STATUS[c.bieter.status]?.ton}>{VERFAHREN_STATUS[c.bieter.status]?.label}</Badge>
                  <Badge ton="info">Runde {c.bieter.runde.nr} · {RUNDEN_ARTEN[c.bieter.runde.art]?.kurz}</Badge>
                </div>
                {["laufend", "auswertung"].includes(c.bieter.status) && <Countdown frist={c.bieter.runde.beendetAm || c.bieter.runde.frist} label="Angebotsfrist" />}
                {c.bieter.matrix ? (
                  <p className="text-[14.5px] text-ink-800">
                    <span className="ov-num font-bold">{c.bieter.geboteAnzahl}</span> {c.bieter.geboteAnzahl === 1 ? "Gebot" : "Gebote"} in der aktuellen Runde
                    {bester ? <> · bestes <span className="ov-num font-bold">{eur(bester.preisGesamt)}</span> ({bester.von?.pseudonym}{bester.proKwp ? `, ${fmt(bester.proKwp)} €/kWp` : ""})</> : null}
                  </p>
                ) : (
                  <p className="text-[14px] text-ink-500">Gebote sind verdeckt – der anonymisierte Vergleich erscheint nach Freigabe durch ÖkoInvest.</p>
                )}
              </div>
            )}
          </Karte>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Karte titel="Datenraum-Zugriffe" aktion={<PfeilLink href={`${basis}?tab=zugriffe`}>Protokoll</PfeilLink>}>
            <Zugriffsprotokoll zugriffe={c.zugriffe} kompakt />
          </Karte>
          {rolle === "admin" ? (
            <Karte titel="Kontaktfreigabe" untertitel="Umgehungsschutz: Namen erst nach Freigabe">
              <KontaktFreigabe projektId={p.id} interessenten={kopf.interessenten || []} />
            </Karte>
          ) : (
            <Karte titel="Anonymität">
              <p className="text-[14px] leading-relaxed text-ink-600">Investoren erscheinen als „Investor A, B …“. Namen und Kontaktdaten gibt ÖkoInvest frei, sobald ein Abschluss konkret wird. Bitte nehmen Sie keinen direkten Kontakt auf (Umgehungsschutz).</p>
            </Karte>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SeitenKopf
        eyebrow={rolle === "admin" ? "Deal-Room · Backoffice" : rolle === "anbieter" ? "Deal-Room · Anbieter" : "Deal-Room"}
        titel={p.titel}
        text={[PROJEKT_TYPEN[p.typ], mwp(p.mwp), p.region, LAENDER[p.land]].filter(Boolean).join(" · ")}
        aktionen={
          <>
            {investor && <StatusBadge art="interesse" status={kopf.interesse.status} className="text-[13px]" />}
            {!investor && <StatusBadge art="projekt" status={p.status} className="text-[13px]" />}
            <DateiLink href={`/api/portal/projekte/${p.id}/expose`} icon={FileDown}>Exposé (PDF)</DateiLink>
            <Button href={investor ? `/portal/boerse/${p.id}` : `/portal/projekte/${p.id}`} size="sm" variant="secondary" icon={ArrowRight}>{investor ? "Exposé & LOI" : "Projektseite"}</Button>
          </>
        }
      />
      {p.demo && <Hinweis ton="warn" className="mb-5">Demo-Projekt – alle Angaben, Fragen und Gebote sind fiktiv.</Hinweis>}
      <DealTabs basis={basis} aktiv={tab} tabs={tabs} />
      {inhalt}
      <p className="mt-8 text-[12.5px] text-ink-500">
        Vertraulich gemäß NDA. {investor ? "Der Anbieter sieht Sie nur als Pseudonym." : "Investoren erscheinen als Pseudonym, bis ÖkoInvest den Kontakt freigibt."} <Link href="/portal/nachrichten" className="font-semibold text-ov-700 hover:text-ov-800">Nachricht an ÖkoInvest</Link>
      </p>
    </div>
  );
}

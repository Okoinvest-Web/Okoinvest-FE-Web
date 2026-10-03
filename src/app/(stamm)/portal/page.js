import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Eye, FileSignature, FolderKanban, Heart, Inbox, KeyRound, LandPlot, MailWarning, MessagesSquare, Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import KpiKachel from "@/components/ui/KpiKachel";
import Stagger from "@/components/ui/Stagger";
import { Badge, Hinweis, Karte, Leer, PfeilLink, SeitenKopf, StatusBadge, Stepper } from "@/components/Portal/ui";
import { KeineFlaechen, KeineNachrichten, KeineProjekte, KeineDokumente, SucheOhneTreffer } from "@/components/illustrationen";
import { portalNutzer, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { rolleLabel, VORGANG_TYPEN, PROJEKT_TYPEN, LAENDER } from "@/lib/plattform/konstanten";
import { statusLabel } from "@/lib/plattform/prozesse";
import { datum, ha, mwp, preisText, relativ } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { phaseById } from "@/lib/invest/markt";
import ErsteSchritte from "@/components/Portal/Bedienung/Onboarding/ErsteSchritte";
import { pfad } from "@/lib/land";
import { BriefcaseBusiness } from "lucide-react"; // Portfolio
import { portfolioBackend } from "@/lib/plattform/backend/portfolio"; // Portfolio

// Die Vorlage „%s | Portal ÖkoInvest“ greift nur für Unterseiten – hier daher absolut (einheitliche Tab-Titel)
export const metadata = { title: { absolute: "Übersicht | Portal ÖkoInvest" } };

const ZEITZONE = "Europe/Berlin";

/** Begrüßung nach Tageszeit (Server, Zeitzone des Unternehmens) */
function begruessung(jetzt = new Date()) {
  const stunde = Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", hourCycle: "h23", timeZone: ZEITZONE }).format(jetzt));
  if (stunde >= 5 && stunde < 11) return "Guten Morgen";
  if (stunde >= 11 && stunde < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Anzahl je Kalenderwoche (älteste zuerst) – für Mini-Verläufe */
function jeWoche(liste, feld, wochen = 8) {
  const jetzt = Date.now();
  const werte = new Array(wochen).fill(0);
  for (const x of liste) {
    const t = new Date(x[feld]).getTime();
    if (!Number.isFinite(t)) continue;
    const i = Math.floor((jetzt - t) / (7 * 864e5));
    if (i >= 0 && i < wochen) werte[wochen - 1 - i] += 1;
  }
  return werte;
}

export default async function PortalStart({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const b = backend();
  // Rollenbereiche nur für tatsächlich gewählte Rollen (Admin sieht sein Cockpit separat)
  const hat = (...r) => r.some((x) => n.rollen.includes(x));
  const flaecheRolle = hat("flaeche", "landwirt");
  const anbieter = hat("anbieter");
  const investor = hat("investor");
  const admin = istAdmin(n);

  const [vorgaenge, flaechen, projekte, interessen, boerse, threads, uebersicht] = await Promise.all([
    b.vorgaenge(n),
    flaecheRolle ? b.flaechen(n) : [],
    anbieter ? b.projekte(n) : [],
    investor ? b.interessen(n) : [],
    investor ? b.boerse(n) : null,
    b.nachrichtenThreads(n),
    admin ? b.adminUebersicht(n) : null,
  ]);

  const ungelesen = threads.reduce((s, t) => s + t.ungelesen, 0);
  const offeneVorgaenge = vorgaenge.filter((v) => !["abgeschlossen", "abgelehnt", "zurueckgezogen"].includes(v.status));
  const passende = investor && boerse ? boerse.projekte.filter((p) => p.matching).sort((a, c) => c.matching.score - a.matching.score).slice(0, 3) : [];
  const datenraeume = interessen.filter((i) => ["nda_freigegeben", "loi_abgegeben", "loi_angenommen"].includes(i.status));
  const merkliste = interessen.filter((i) => i.gemerkt);

  // ---------------------------------------------------------------- Als Nächstes (nach Dringlichkeit)
  // prio: 1 = Entscheidung liegt bei Ihnen, 2 = Weg fortsetzen, 3 = Einrichtung/Hinweis
  const schritte = [];
  for (const f of flaechen.filter((x) => x.status === "pachtangebot")) schritte.push({ prio: 1, icon: FileSignature, titel: `Ihr Pachtangebot für „${f.bezeichnung}“ liegt vor`, text: "Eckdaten prüfen, dann annehmen oder eine Rückfrage stellen. Sie entscheiden ohne Zeitdruck.", href: `/portal/flaechen/${f.id}`, cta: "Angebot jetzt prüfen" });
  for (const i of interessen.filter((x) => x.status === "nda_freigegeben")) schritte.push({ prio: 1, icon: KeyRound, titel: `Datenraum offen: ${i.projekt?.titel}`, text: "Unterlagen prüfen und bei Interesse eine LOI abgeben.", href: `/portal/boerse/${i.projektId}`, cta: "Zum Datenraum" });
  if (ungelesen) schritte.push({ prio: 2, icon: MessagesSquare, titel: `${ungelesen} ungelesene Nachricht${ungelesen === 1 ? "" : "en"}`, text: "Das Backoffice hat Ihnen geschrieben.", href: "/portal/nachrichten", cta: "Lesen" });
  for (const f of flaechen.filter((x) => x.status === "entwurf")) schritte.push({ prio: 2, icon: LandPlot, titel: `Fläche vervollständigen: ${f.bezeichnung}`, text: "Ergänzen Sie Ort und Größe und reichen Sie die Fläche zur Prüfung ein.", href: `/portal/flaechen/${f.id}`, cta: "Fläche ergänzen", dauer: "ca. 3 Min." });
  for (const p of projekte.filter((x) => x.status === "entwurf")) schritte.push({ prio: 2, icon: FolderKanban, titel: `Projekt einreichen: ${p.titel}`, text: p.provisionAkzeptiert ? "Angaben prüfen und zur Freigabe einreichen." : "Provisionsvereinbarung akzeptieren und einreichen.", href: `/portal/projekte/${p.id}`, cta: "Zum Projekt" });
  if (flaecheRolle && !flaechen.length) schritte.push({ prio: 2, icon: LandPlot, titel: "Erste Fläche hinzufügen", text: "Lage, Größe und Flurstücke genügen für eine kostenlose Vorprüfung.", href: "/portal/flaechen/neu", cta: "Fläche hinzufügen", dauer: "ca. 2 Min." });
  if (anbieter && !projekte.length) schritte.push({ prio: 2, icon: FolderKanban, titel: "Erstes Projekt anlegen", text: "Anonymer Teaser, vertraulicher Datenraum – Provision nur bei Abschluss.", href: "/portal/projekte/neu", cta: "Projekt anlegen" });
  if (investor && !n.suchprofil) schritte.push({ prio: 2, icon: Sparkles, titel: "Suchprofil anlegen", text: "Wir zeigen Ihnen passende Projekte mit Matching-Score.", href: "/portal/profil#suchprofil", cta: "Suchprofil anlegen", dauer: "ca. 2 Min." });
  if (!n.emailBestaetigt) schritte.push({ prio: 3, icon: MailWarning, titel: "E-Mail-Adresse bestätigen", text: "Danach ordnen wir frühere Anfragen mit Ihrer Adresse automatisch zu.", href: "/portal/profil", cta: "Mehr erfahren" });
  schritte.sort((a, c) => a.prio - c.prio);
  const [erster, ...weitere] = schritte;

  // ---------------------------------------------------------------- Kennzahlen
  const kacheln = [];
  if (flaecheRolle) kacheln.push({ label: "Flächen", wert: flaechen.length, hinweis: `${ha(flaechen.reduce((s, f) => s + (f.ha || 0), 0))} insgesamt`, icon: LandPlot, href: "/portal/flaechen" });
  if (anbieter) {
    kacheln.push({ label: "Projekte in der Börse", wert: projekte.filter((p) => ["veroeffentlicht", "reserviert"].includes(p.status)).length, hinweis: `${fmt(projekte.length)} Projekte gesamt`, icon: FolderKanban, href: "/portal/projekte" });
    kacheln.push({ label: "Aufrufe & Merker", wert: projekte.reduce((s, p) => s + p.statistik.aufrufe, 0), hinweis: `${fmt(projekte.reduce((s, p) => s + p.statistik.merker, 0))} Merker · ${fmt(projekte.reduce((s, p) => s + p.statistik.ndaAnfragen, 0))} NDA-Anfragen`, icon: Eye, href: "/portal/projekte" });
  }
  if (investor) {
    kacheln.push({ label: "Passende Projekte", wert: boerse?.projekte.filter((p) => (p.matching?.score || 0) >= 70).length || 0, hinweis: n.suchprofil ? "Matching-Score ≥ 70" : "Suchprofil fehlt", icon: Sparkles, href: "/portal/boerse?sortierung=passung" });
    kacheln.push({ label: "Merkliste", wert: merkliste.length, hinweis: `${fmt(datenraeume.length)} Datenräume frei`, icon: Heart, href: "/portal/boerse?ansicht=merkliste" });
    const pf = await portfolioBackend().pfMeine(n).catch(() => null); // Portfolio: Positionen nach dem Kauf
    if (pf?.positionen.length) kacheln.push({ label: "Portfolio", wert: pf.kennzahlen.anzahl, hinweis: pf.kennzahlen.offeneAbrufe ? `${fmt(pf.kennzahlen.offeneAbrufe)} Kapitalabruf(e) offen` : `${fmt(pf.kennzahlen.mwp)} MWp anteilig`, icon: BriefcaseBusiness, href: "/portal/portfolio" });
  }
  const anfragenVerlauf = vorgaenge.length >= 3 ? jeWoche(vorgaenge, "erstelltAm") : null;
  kacheln.push({ label: "Offene Anfragen", wert: offeneVorgaenge.length, hinweis: anfragenVerlauf ? `${fmt(vorgaenge.length)} gesamt · 8 Wochen` : `${fmt(vorgaenge.length)} gesamt`, icon: Inbox, href: "/portal/anfragen", verlauf: anfragenVerlauf?.some(Boolean) ? anfragenVerlauf : undefined });
  kacheln.push({ label: "Ungelesene Nachrichten", wert: ungelesen, hinweis: `${fmt(threads.length)} ${threads.length === 1 ? "Unterhaltung" : "Unterhaltungen"}`, icon: MessagesSquare, href: "/portal/nachrichten" });

  // ---------------------------------------------------------------- Aktivität
  const aktivitaet = [
    ...flaechen.flatMap((f) => (f.statusVerlauf || []).map((e) => ({ ...e, art: "flaeche", titel: f.bezeichnung, href: `/portal/flaechen/${f.id}` }))),
    ...projekte.flatMap((p) => (p.statusVerlauf || []).map((e) => ({ ...e, art: "projekt", titel: p.titel, href: `/portal/projekte/${p.id}` }))),
    ...interessen.flatMap((i) => (i.statusVerlauf || []).map((e) => ({ ...e, art: "interesse", titel: i.projekt?.titel || i.projektId, href: `/portal/boerse/${i.projektId}` }))),
    ...vorgaenge.map((v) => ({ status: v.status, am: v.geaendertAm, art: "vorgang", titel: `Anfrage ${VORGANG_TYPEN[v.typ]}`, href: `/portal/anfragen/${v.id}`, kommentar: v.letzterKommentar })),
  ]
    .sort((a, c) => String(c.am).localeCompare(String(a.am)))
    .slice(0, 7);

  const hinweis = sp?.hinweis;
  const heute = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: ZEITZONE }).format(new Date());
  const offenText = !erster
    ? "Heute ist nichts von Ihnen zu tun – wir melden uns, sobald es weitergeht."
    : schritte.length === 1
      ? "Ein Punkt wartet auf Sie. Alles Weitere sehen Sie darunter."
      : `${schritte.length} Punkte warten auf Sie – der wichtigste steht oben.`;
  const ErsterIcon = erster?.icon;

  return (
    <div className="space-y-6 md:space-y-8">
      <SeitenKopf
        eyebrow={heute}
        titel={`${begruessung()}, ${n.vorname}`}
        text={offenText}
        aktionen={
          <div className="flex flex-wrap gap-1.5">
            {n.rollen.map((r) => (
              <Badge key={r} ton={r === "admin" ? "dunkel" : "neutral"}>{rolleLabel(r)}</Badge>
            ))}
          </div>
        }
      />

      {hinweis === "email-bestaetigt" && <Hinweis ton="ok" titel="E-Mail-Adresse bestätigt">Vielen Dank. Frühere Anfragen mit dieser Adresse sind jetzt Ihrem Konto zugeordnet.</Hinweis>}
      {hinweis === "willkommen" && <Hinweis ton="ok" titel="Willkommen im Portal">Ihr Konto ist angelegt. Hier verfolgen Sie ab sofort alle Schritte.</Hinweis>}
      {hinweis === "einstieg-fertig" && <Hinweis ton="ok" titel="Einstieg abgeschlossen">Ihr Portal ist eingerichtet. Tipp: Mit Strg + K (Mac: ⌘ + K) finden Sie alles in Sekunden.</Hinweis>}

      {/* Als Nächstes – die eine dunkle Karte dieser Ansicht */}
      <section aria-labelledby="als-naechstes" className="ov-ein ov-verlauf-nacht relative overflow-hidden rounded-3xl p-6 text-white shadow-e3 ring-1 ring-white/10 md:p-8" style={{ "--ov-delay": "60ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="als-naechstes" className="ov-overline text-ov-300">Als Nächstes</h2>
          {schritte.length > 1 && <Badge ton="dunkel" groesse="sm">{schritte.length} offen</Badge>}
        </div>
        {erster ? (
          <>
            <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300 ring-1 ring-white/10">
                <ErsterIcon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[clamp(1.15rem,1.05rem+0.45vw,1.45rem)] font-bold leading-snug tracking-[-0.015em]">{erster.titel}</p>
                <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-white/75">
                  {erster.text}
                  {erster.dauer && <span className="ml-1.5 whitespace-nowrap text-white/75">· {erster.dauer}</span>}
                </p>
              </div>
              <Button href={erster.href} variant="primary" pfeil className="shrink-0 self-start md:self-center">
                {erster.cta}
              </Button>
            </div>
            {weitere.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-[12.5px] font-semibold text-white/75">Danach</p>
                <Stagger as="ul" className="mt-2 grid gap-2 md:grid-cols-2" delay={120}>
                  {weitere.slice(0, 4).map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <li key={`${s.titel}-${i}`}>
                        <Link href={s.href} className="group flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10 transition-colors duration-150 hover:bg-white/[0.09] hover:ring-white/20">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ov-300">
                            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-semibold">{s.titel}</span>
                            <span className="block truncate text-[12.5px] text-white/75">{s.cta}</span>
                          </span>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-white/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white" />
                        </Link>
                      </li>
                    );
                  })}
                </Stagger>
                {weitere.length > 4 && <p className="mt-3 text-[12.5px] text-white/75">… und {weitere.length - 4} weitere – alle Vorgänge unter <Link href="/portal/anfragen" className="font-semibold text-white underline underline-offset-2">Meine Anfragen</Link>.</p>}
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-300/15 text-ov-300 ring-1 ring-ov-300/20">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[20px] font-bold leading-snug">Alles erledigt</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-white/75">Aktuell ist nichts von Ihnen zu tun. Wir melden uns, sobald es weitergeht.</p>
            </div>
            <Button href="/portal/anfragen" variant="outlineLight" size="sm">Anfragen ansehen</Button>
          </div>
        )}
      </section>

      <Stagger className={`grid grid-cols-2 gap-3 md:gap-4 ${kacheln.length >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
        {kacheln.slice(0, 4).map((k) => (
          <KpiKachel key={k.label} {...k} />
        ))}
      </Stagger>

      {/* Einarbeitung unter der nächsten Aktion, damit sie den ersten Bildschirm nicht belegt */}
      <ErsteSchritte nutzer={n} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {admin && uebersicht && (
            <Karte titel="Backoffice" untertitel="Was heute auf dem Tisch liegt" aktion={<PfeilLink href="/portal/admin">Zum Cockpit</PfeilLink>}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Neue Vorgänge (7 Tage)", wert: uebersicht.vorgaenge.neu7, href: "/portal/admin/vorgaenge?status=eingegangen" },
                  { label: "Projekte in Prüfung", wert: uebersicht.projekte.inPruefung, href: "/portal/admin/projekte" },
                  { label: "NDA-Anfragen offen", wert: uebersicht.interessen.ndaOffen, href: "/portal/admin/interessen" },
                  { label: "Ungelesene Nachrichten", wert: uebersicht.nachrichten.ungelesen, href: "/portal/nachrichten" },
                ].map((k) => (
                  <Link key={k.label} href={k.href} className="ov-lift ov-press rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 hover:ring-ov-300">
                    <p className="ov-kpi text-ink-900">{fmt(k.wert)}</p>
                    <p className="mt-1 text-[12.5px] leading-snug text-ink-600">{k.label}</p>
                  </Link>
                ))}
              </div>
            </Karte>
          )}

          {flaecheRolle && (
            <Karte titel="Meine Flächen" icon={LandPlot} aktion={<PfeilLink href="/portal/flaechen">Alle Flächen</PfeilLink>}>
              {flaechen.length ? (
                <ul className="space-y-5">
                  {flaechen.slice(0, 4).map((f) => (
                    <li key={f.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/portal/flaechen/${f.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{f.bezeichnung}</Link>
                        <StatusBadge art="flaeche" status={f.status} />
                      </div>
                      <p className="mb-2.5 mt-0.5 text-[13px] text-ink-500">{[ha(f.ha), [f.plz, f.ort].filter(Boolean).join(" "), f.agri ? "Agri-PV" : null].filter(Boolean).join(" · ")}</p>
                      <Stepper art="flaeche" status={f.status} kompakt />
                    </li>
                  ))}
                </ul>
              ) : (
                <Leer illustration={<KeineFlaechen />} titel="Noch keine Fläche" text="Fügen Sie Ihre erste Fläche hinzu – die Vorprüfung ist kostenlos und dauert etwa zwei Minuten." aktion={<Button href="/portal/flaechen/neu" size="sm" pfeil>Fläche hinzufügen</Button>} />
              )}
            </Karte>
          )}

          {anbieter && (
            <Karte titel="Meine Projekte" icon={FolderKanban} aktion={<PfeilLink href="/portal/projekte">Alle Projekte</PfeilLink>}>
              {projekte.length ? (
                <ul className="divide-y divide-ink-100">
                  {projekte.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <Link href={`/portal/projekte/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                        <p className="text-[13px] text-ink-500">{[PROJEKT_TYPEN[p.typ], mwp(p.mwp), phaseById(p.phase)?.kurz].filter(Boolean).join(" · ")}</p>
                      </div>
                      <p className="flex gap-3 text-[12.5px] text-ink-500">
                        <span><Eye aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" /><span className="sr-only">Aufrufe </span>{fmt(p.statistik.aufrufe)}</span>
                        <span><Heart aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" /><span className="sr-only">Merker </span>{fmt(p.statistik.merker)}</span>
                        <span><KeyRound aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" /><span className="sr-only">NDA-Anfragen </span>{fmt(p.statistik.ndaAnfragen)}</span>
                      </p>
                      <StatusBadge art="projekt" status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Leer illustration={<KeineProjekte />} titel="Noch kein Projekt" text="Stellen Sie Ihr erstes Projekt in die Börse – geprüft und vertraulich." aktion={<Button href="/portal/projekte/neu" size="sm" pfeil>Projekt anlegen</Button>} />
              )}
            </Karte>
          )}

          {investor && (
            <Karte titel="Passende Projekte" icon={Sparkles} untertitel={n.suchprofil ? "Nach Ihrem Suchprofil" : "Legen Sie ein Suchprofil an, um Projekte nach Passung zu sortieren."} aktion={<PfeilLink href="/portal/boerse">Zur Börse</PfeilLink>}>
              {passende.length ? (
                <Stagger as="ul" className="grid gap-3 md:grid-cols-3">
                  {passende.map((p) => (
                    <li key={p.id}>
                      <Link href={`/portal/boerse/${p.id}`} className="ov-lift ov-press flex h-full flex-col rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 hover:ring-ov-300">
                        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <Badge ton={p.matching.score >= 70 ? "ok" : "neutral"}>{p.matching.score} % Passung</Badge>
                          <span className="text-[12.5px] text-ink-500">{LAENDER[p.land]}</span>
                        </span>
                        <span className="mt-3 font-semibold leading-snug text-ink-900">{p.titel}</span>
                        <span className="mt-auto pt-3 text-[13px] text-ink-600">{mwp(p.mwp)} · {phaseById(p.phase).kurz} · {preisText(p)}</span>
                      </Link>
                    </li>
                  ))}
                </Stagger>
              ) : (
                <Leer illustration={<SucheOhneTreffer />} titel="Suchprofil anlegen" text="Größe, Phasen, Länder und Ticket – dann zeigen wir Ihnen die passenden Projekte zuerst." aktion={<Button href="/portal/profil#suchprofil" size="sm" pfeil>Suchprofil anlegen</Button>} />
              )}
            </Karte>
          )}

          <Karte titel="Meine Anfragen" icon={Inbox} aktion={<PfeilLink href="/portal/anfragen">Alle Anfragen</PfeilLink>}>
            {vorgaenge.length ? (
              <ul className="divide-y divide-ink-100">
                {vorgaenge.slice(0, 5).map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
                    <Link href={`/portal/anfragen/${v.id}`} className="min-w-0 flex-1 font-semibold text-ink-900 hover:text-ov-700">
                      {VORGANG_TYPEN[v.typ]} <span className="ov-num block text-[12.5px] font-normal text-ink-500 sm:inline sm:text-[inherit]"><span className="hidden sm:inline"> · </span>{v.id}</span>
                    </Link>
                    <span className="text-[12.5px] text-ink-500">{datum(v.erstelltAm)}</span>
                    <StatusBadge art="vorgang" status={v.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <Leer illustration={<KeineDokumente />} titel="Noch keine Anfragen" text="Anfragen, die Sie über die Website senden, erscheinen hier – mit Status und Nachrichten." />
            )}
          </Karte>
        </div>

        <div className="min-w-0 space-y-6">
          <Karte titel="Letzte Nachrichten" icon={MessagesSquare} aktion={<PfeilLink href="/portal/nachrichten">Alle</PfeilLink>}>
            {threads.length ? (
              <ul className="space-y-1">
                {threads.slice(0, 5).map((t) => (
                  <li key={`${t.bezugArt}:${t.bezugId}`}>
                    <Link href={`/portal/nachrichten?bezug=${t.bezugArt}:${t.bezugId}`} className="-mx-2 flex gap-3 rounded-xl p-2 transition-colors duration-150 hover:bg-sand-50">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.ungelesen ? "bg-ov-500" : "bg-transparent"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[14px] ${t.ungelesen ? "font-bold text-ink-900" : "font-semibold text-ink-800"}`}>
                            {t.ungelesen ? <span className="sr-only">Ungelesen: </span> : null}
                            {t.titel}
                          </span>
                          <span className="shrink-0 text-[12px] text-ink-500">{relativ(t.letzte.am)}</span>
                        </span>
                        <span className="line-clamp-2 text-[13px] leading-snug text-ink-500">{t.letzte.text}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-2 py-4 text-center">
                <KeineNachrichten className="w-32" />
                <p className="mt-3 font-display text-[15px] font-bold text-ink-900">Noch keine Nachrichten</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">Fragen zu Ihren Vorgängen beantwortet das Backoffice direkt hier.</p>
              </div>
            )}
          </Karte>

          <Karte titel="Status-Timeline" untertitel="Letzte Änderungen an Ihren Vorgängen">
            {aktivitaet.length ? (
              <ol className="relative space-y-4 pl-6">
                <span aria-hidden="true" className="absolute bottom-1 left-[7px] top-1 w-px bg-ink-200" />
                {aktivitaet.map((a, i) => (
                  <li key={`${a.href}-${a.am}-${i}`} className="relative">
                    <span aria-hidden="true" className={`absolute -left-6 top-1 h-[15px] w-[15px] rounded-full ring-4 ring-white ${i === 0 ? "bg-ov-500" : "bg-ink-200"}`} />
                    <Link href={a.href} className="block text-[14px] font-semibold leading-snug text-ink-900 hover:text-ov-700">{a.titel}</Link>
                    <p className="text-[12.5px] text-ink-500">
                      {statusLabel(a.art, a.status)} · {relativ(a.am)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine Aktivität – sobald sich ein Status ändert, sehen Sie es hier.</p>
            )}
          </Karte>

          <div className="rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200">
            <p className="font-display text-[16px] font-bold text-ink-900">Neue Anfrage stellen</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Weitere Fläche, Reststrom oder Beteiligung? Starten Sie über die passende Seite.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px] font-semibold">
              <Link href={pfad("/flaechencheck")} className="inline-flex min-h-[24px] items-center gap-1 text-ov-700 hover:text-ov-800">Flächencheck <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
              <Link href={pfad("/reststrom")} className="inline-flex min-h-[24px] items-center gap-1 text-ov-700 hover:text-ov-800">Reststrom <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
              <Link href={pfad("/genossenschaft")} className="inline-flex min-h-[24px] items-center gap-1 text-ov-700 hover:text-ov-800">Genossenschaft <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

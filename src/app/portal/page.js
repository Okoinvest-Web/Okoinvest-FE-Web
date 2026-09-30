import Link from "next/link";
import {
  ArrowRight, Eye, FileSignature, FolderKanban, Heart, Inbox, KeyRound, LandPlot, MailWarning, MessagesSquare, Sparkles, TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte, Kennzahl, Leer, PfeilLink, SeitenKopf, StatusBadge, Stepper } from "@/components/Portal/ui";
import { portalNutzer, istAdmin } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { rolleLabel, VORGANG_TYPEN, PROJEKT_TYPEN, LAENDER } from "@/lib/plattform/konstanten";
import { statusLabel } from "@/lib/plattform/prozesse";
import { datum, ha, mwp, preisText, relativ } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { phaseById } from "@/lib/invest/markt";
import ErsteSchritte from "@/components/Portal/Bedienung/Onboarding/ErsteSchritte";

export const metadata = { title: "Übersicht" };

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

  // ---------------------------------------------------------------- nächste Schritte
  const schritte = [];
  if (!n.emailBestaetigt) schritte.push({ icon: MailWarning, titel: "E-Mail-Adresse bestätigen", text: "Danach ordnen wir frühere Anfragen mit Ihrer Adresse automatisch zu.", href: "/portal/profil", cta: "Mehr erfahren" });
  for (const f of flaechen.filter((x) => x.status === "pachtangebot")) schritte.push({ icon: FileSignature, titel: `Pachtangebot prüfen: ${f.bezeichnung}`, text: "Ihr Angebot liegt vor. Annehmen oder Rückfrage stellen.", href: `/portal/flaechen/${f.id}`, cta: "Angebot ansehen" });
  for (const f of flaechen.filter((x) => x.status === "entwurf")) schritte.push({ icon: LandPlot, titel: `Fläche vervollständigen: ${f.bezeichnung}`, text: "Ergänzen Sie Ort und Größe und reichen Sie die Fläche zur Prüfung ein.", href: `/portal/flaechen/${f.id}`, cta: "Fläche ergänzen" });
  if (flaecheRolle && !flaechen.length) schritte.push({ icon: LandPlot, titel: "Erste Fläche hinzufügen", text: "Lage, Größe und Flurstücke genügen für eine kostenlose Vorprüfung.", href: "/portal/flaechen/neu", cta: "Fläche hinzufügen" });
  for (const p of projekte.filter((x) => x.status === "entwurf")) schritte.push({ icon: FolderKanban, titel: `Projekt einreichen: ${p.titel}`, text: p.provisionAkzeptiert ? "Angaben prüfen und zur Freigabe einreichen." : "Provisionsvereinbarung akzeptieren und einreichen.", href: `/portal/projekte/${p.id}`, cta: "Zum Projekt" });
  if (anbieter && !projekte.length) schritte.push({ icon: FolderKanban, titel: "Erstes Projekt anlegen", text: "Anonymer Teaser, vertraulicher Datenraum – Provision nur bei Abschluss.", href: "/portal/projekte/neu", cta: "Projekt anlegen" });
  if (investor && !n.suchprofil) schritte.push({ icon: Sparkles, titel: "Suchprofil anlegen", text: "Wir zeigen Ihnen passende Projekte mit Matching-Score.", href: "/portal/profil#suchprofil", cta: "Suchprofil anlegen" });
  for (const i of interessen.filter((x) => x.status === "nda_freigegeben")) schritte.push({ icon: KeyRound, titel: `Datenraum offen: ${i.projekt?.titel}`, text: "Unterlagen prüfen und bei Interesse eine LOI abgeben.", href: `/portal/boerse/${i.projektId}`, cta: "Zum Datenraum" });
  if (ungelesen) schritte.push({ icon: MessagesSquare, titel: `${ungelesen} ungelesene Nachricht${ungelesen === 1 ? "" : "en"}`, text: "Das Backoffice hat Ihnen geschrieben.", href: "/portal/nachrichten", cta: "Lesen" });
  if (!schritte.length) schritte.push({ icon: Inbox, titel: "Alles erledigt", text: "Aktuell ist nichts von Ihnen zu tun. Wir melden uns, sobald es weitergeht.", href: "/portal/anfragen", cta: "Anfragen ansehen" });

  // ---------------------------------------------------------------- Kennzahlen
  const kacheln = [];
  if (flaecheRolle) kacheln.push({ label: "Flächen", wert: fmt(flaechen.length), hinweis: `${ha(flaechen.reduce((s, f) => s + (f.ha || 0), 0))} insgesamt`, icon: LandPlot, href: "/portal/flaechen" });
  if (anbieter) {
    kacheln.push({ label: "Projekte in der Börse", wert: fmt(projekte.filter((p) => ["veroeffentlicht", "reserviert"].includes(p.status)).length), hinweis: `${fmt(projekte.length)} Projekte gesamt`, icon: FolderKanban, href: "/portal/projekte" });
    kacheln.push({ label: "Aufrufe & Merker", wert: fmt(projekte.reduce((s, p) => s + p.statistik.aufrufe, 0)), hinweis: `${fmt(projekte.reduce((s, p) => s + p.statistik.merker, 0))} Merker · ${fmt(projekte.reduce((s, p) => s + p.statistik.ndaAnfragen, 0))} NDA-Anfragen`, icon: Eye, href: "/portal/projekte" });
  }
  if (investor) {
    kacheln.push({ label: "Passende Projekte", wert: fmt(boerse?.projekte.filter((p) => (p.matching?.score || 0) >= 70).length || 0), hinweis: n.suchprofil ? "Matching-Score ≥ 70" : "Suchprofil fehlt", icon: Sparkles, href: "/portal/boerse?sortierung=passung" });
    kacheln.push({ label: "Merkliste", wert: fmt(merkliste.length), hinweis: `${fmt(datenraeume.length)} Datenräume frei`, icon: Heart, href: "/portal/boerse?ansicht=merkliste" });
  }
  kacheln.push({ label: "Offene Anfragen", wert: fmt(offeneVorgaenge.length), hinweis: `${fmt(vorgaenge.length)} gesamt`, icon: Inbox, href: "/portal/anfragen" });
  kacheln.push({ label: "Ungelesene Nachrichten", wert: fmt(ungelesen), hinweis: `${fmt(threads.length)} ${threads.length === 1 ? "Unterhaltung" : "Unterhaltungen"}`, icon: MessagesSquare, href: "/portal/nachrichten" });

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

  return (
    <div className="space-y-6 md:space-y-8">
      <SeitenKopf
        eyebrow="Übersicht"
        titel={`Guten Tag, ${n.vorname}`}
        text="Hier sehen Sie den Stand all Ihrer Vorgänge, Flächen und Projekte – und was als Nächstes ansteht."
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
      <ErsteSchritte nutzer={n} />

      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${kacheln.length >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
        {kacheln.slice(0, 4).map((k) => (
          <Kennzahl key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {/* Nächster Schritt */}
          <section aria-labelledby="naechster-schritt" className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-7">
            <div aria-hidden="true" className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ov-500/30 blur-[90px]" />
            <p id="naechster-schritt" className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Nächster Schritt</p>
            <ul className="relative mt-4 space-y-3">
              {schritte.slice(0, 3).map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={`${s.titel}-${i}`} className="flex flex-col gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:flex-row sm:items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-500/20 text-ov-300">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{s.titel}</p>
                      <p className="mt-0.5 text-[13.5px] leading-relaxed text-white/65">{s.text}</p>
                    </div>
                    <Button href={s.href} size="sm" variant={i === 0 ? "primary" : "outlineLight"} pfeil={i === 0}>
                      {s.cta}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>

          {admin && uebersicht && (
            <Karte titel="Backoffice" untertitel="Was heute auf dem Tisch liegt" aktion={<PfeilLink href="/portal/admin">Zum Cockpit</PfeilLink>}>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Neue Vorgänge (7 Tage)", wert: uebersicht.vorgaenge.neu7, href: "/portal/admin/vorgaenge?status=eingegangen" },
                  { label: "Projekte in Prüfung", wert: uebersicht.projekte.inPruefung, href: "/portal/admin/projekte" },
                  { label: "NDA-Anfragen offen", wert: uebersicht.interessen.ndaOffen, href: "/portal/admin/interessen" },
                  { label: "Ungelesene Nachrichten", wert: uebersicht.nachrichten.ungelesen, href: "/portal/nachrichten" },
                ].map((k) => (
                  <Link key={k.label} href={k.href} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 hover:ring-ov-300">
                    <p className="ov-num font-display text-[24px] font-extrabold text-ink-900">{fmt(k.wert)}</p>
                    <p className="mt-1 text-[12.5px] leading-snug text-ink-600">{k.label}</p>
                  </Link>
                ))}
              </div>
            </Karte>
          )}

          {flaecheRolle && (
            <Karte titel="Meine Flächen" aktion={<PfeilLink href="/portal/flaechen">Alle Flächen</PfeilLink>}>
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
                <Leer icon={LandPlot} titel="Noch keine Fläche" text="Fügen Sie Ihre erste Fläche hinzu – die Vorprüfung ist kostenlos." aktion={<Button href="/portal/flaechen/neu" size="sm" pfeil>Fläche hinzufügen</Button>} />
              )}
            </Karte>
          )}

          {anbieter && (
            <Karte titel="Meine Projekte" aktion={<PfeilLink href="/portal/projekte">Alle Projekte</PfeilLink>}>
              {projekte.length ? (
                <ul className="divide-y divide-ink-100">
                  {projekte.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <Link href={`/portal/projekte/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                        <p className="text-[13px] text-ink-500">{[PROJEKT_TYPEN[p.typ], mwp(p.mwp), phaseById(p.phase)?.kurz].filter(Boolean).join(" · ")}</p>
                      </div>
                      <p className="flex gap-3 text-[12.5px] text-ink-500">
                        <span><Eye aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{fmt(p.statistik.aufrufe)}</span>
                        <span><Heart aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{fmt(p.statistik.merker)}</span>
                        <span><KeyRound aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{fmt(p.statistik.ndaAnfragen)}</span>
                      </p>
                      <StatusBadge art="projekt" status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Leer icon={FolderKanban} titel="Noch kein Projekt" text="Stellen Sie Ihr erstes Projekt in die Börse – geprüft und vertraulich." aktion={<Button href="/portal/projekte/neu" size="sm" pfeil>Projekt anlegen</Button>} />
              )}
            </Karte>
          )}

          {investor && (
            <Karte titel="Passende Projekte" untertitel={n.suchprofil ? "Nach Ihrem Suchprofil" : "Legen Sie ein Suchprofil an, um Projekte nach Passung zu sortieren."} aktion={<PfeilLink href="/portal/boerse">Zur Börse</PfeilLink>}>
              {passende.length ? (
                <ul className="grid gap-3 md:grid-cols-3">
                  {passende.map((p) => (
                    <li key={p.id}>
                      <Link href={`/portal/boerse/${p.id}`} className="flex h-full flex-col rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60 hover:ring-ov-300">
                        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <Badge ton={p.matching.score >= 70 ? "ok" : "neutral"}>{p.matching.score} % Passung</Badge>
                          <span className="text-[12px] text-ink-500">{LAENDER[p.land]}</span>
                        </span>
                        <span className="mt-3 font-semibold leading-snug text-ink-900">{p.titel}</span>
                        <span className="mt-auto pt-3 text-[13px] text-ink-600">{mwp(p.mwp)} · {phaseById(p.phase).kurz} · {preisText(p)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Leer icon={TrendingUp} titel="Suchprofil anlegen" text="Größe, Phasen, Länder und Ticket – dann zeigen wir Ihnen die passenden Projekte zuerst." aktion={<Button href="/portal/profil#suchprofil" size="sm" pfeil>Suchprofil anlegen</Button>} />
              )}
            </Karte>
          )}

          <Karte titel="Meine Anfragen" aktion={<PfeilLink href="/portal/anfragen">Alle Anfragen</PfeilLink>}>
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
              <Leer icon={Inbox} titel="Keine Anfragen" text="Anfragen, die Sie über die Website senden, erscheinen hier – mit Status und Nachrichten." />
            )}
          </Karte>
        </div>

        <div className="min-w-0 space-y-6">
          <Karte titel="Letzte Nachrichten" aktion={<PfeilLink href="/portal/nachrichten">Alle</PfeilLink>}>
            {threads.length ? (
              <ul className="space-y-1">
                {threads.slice(0, 5).map((t) => (
                  <li key={`${t.bezugArt}:${t.bezugId}`}>
                    <Link href={`/portal/nachrichten?bezug=${t.bezugArt}:${t.bezugId}`} className="-mx-2 flex gap-3 rounded-xl p-2 hover:bg-sand-50">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.ungelesen ? "bg-ov-500" : "bg-transparent"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-[14px] ${t.ungelesen ? "font-bold text-ink-900" : "font-semibold text-ink-800"}`}>{t.titel}</span>
                          <span className="shrink-0 text-[11.5px] text-ink-400">{relativ(t.letzte.am)}</span>
                        </span>
                        <span className="line-clamp-2 text-[13px] leading-snug text-ink-500">{t.letzte.text}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine Nachrichten.</p>
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
              <p className="text-[14px] text-ink-500">Noch keine Aktivität.</p>
            )}
          </Karte>

          <div className="rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200">
            <p className="font-display text-[16px] font-bold text-ink-900">Neue Anfrage stellen</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">Weitere Fläche, Reststrom oder Beteiligung? Starten Sie über die passende Seite.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[13.5px] font-semibold">
              <Link href="/flaechencheck" className="inline-flex items-center gap-1 text-ov-700 hover:text-ov-800">Flächencheck <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
              <Link href="/reststrom" className="inline-flex items-center gap-1 text-ov-700 hover:text-ov-800">Reststrom <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
              <Link href="/genossenschaft" className="inline-flex items-center gap-1 text-ov-700 hover:text-ov-800">Genossenschaft <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

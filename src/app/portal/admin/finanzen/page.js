import Link from "next/link";
import { AlertTriangle, BadgeEuro, Banknote, Building2, Calculator, ClipboardCheck, FileSpreadsheet, Gauge, Landmark, ListChecks, ReceiptText, Scale, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte, SeitenKopf } from "@/components/Portal/ui";
import Reiter from "@/components/Portal/Anlagen/Reiter";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { euro, euro0, tag, zeitraum } from "@/components/Portal/Finanzen/teile";
import { AnlageAktivieren, BelegTabelle, KlaerfallAktionen, KostenBuchen, LaufStarten, VpiFormular, Zahlungsvorschlag, ZahlungslaufAktionen } from "@/components/Portal/Finanzen/Aktionen";
import VertragFormular from "@/components/Portal/Finanzen/VertragFormular";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";
import { darfLesen, darfSchreiben } from "@/lib/plattform/rechte";
import { ABRECHNUNG_ARTEN, AFA } from "@/lib/plattform/finanzen/konstanten";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Finanzen & Abrechnung" };

const REITER = [
  { id: "uebersicht", label: "Übersicht", icon: Gauge },
  { id: "belege", label: "Belege & offene Posten", icon: ReceiptText },
  { id: "klaerfaelle", label: "Klärfälle", icon: AlertTriangle },
  { id: "zahlungen", label: "Auszahlungen & SEPA", icon: Banknote },
  { id: "vertraege", label: "Pachtverträge", icon: Scale },
  { id: "index", label: "Index (VPI)", icon: Calculator },
  { id: "anlagen", label: "Anlagen & Projekte", icon: Building2 },
];

const ARTEN_FILTER = [["", "Alle"], ["pacht", "Pacht"], ["contracting", "Contracting"], ["provision", "Provision"]];
const STATUS_FILTER = [["", "Alle"], ["offen", "Offen"], ["ueberfaellig", "Überfällig"], ["angewiesen", "Angewiesen"], ["bezahlt", "Bezahlt"], ["storniert", "Storniert"]];

function FilterLeiste({ art, status }) {
  const link = (a, s) => `/portal/admin/finanzen?tab=belege${a ? `&art=${a}` : ""}${s ? `&status=${s}` : ""}`;
  const chip = (aktiv) => cn("inline-flex h-8 items-center rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset", aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50");
  return (
    <div className="flex flex-col gap-2 px-5 pb-4 pt-1 md:px-6">
      <div className="flex flex-wrap gap-1.5" aria-label="Art">{ARTEN_FILTER.map(([id, l]) => <Link key={id} href={link(id, status)} className={chip(art === id)} aria-current={art === id ? "true" : undefined}>{l}</Link>)}</div>
      <div className="flex flex-wrap gap-1.5" aria-label="Status">{STATUS_FILTER.map(([id, l]) => <Link key={id} href={link(art, id)} className={chip(status === id)} aria-current={status === id ? "true" : undefined}>{l}</Link>)}</div>
    </div>
  );
}

export default async function FinanzenBackofficeSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const tab = REITER.some((r) => r.id === sp.tab) ? sp.tab : "uebersicht";
  const b = finanzenBackend();
  const cockpit = await laden(() => b.finanzCockpit(n));
  const darf = darfSchreiben(n, "finanzen");
  const k = cockpit.kennzahlen;
  const heute = cockpit.heute;
  const vormonat = (() => {
    const [j, m] = heute.split("-").map(Number);
    return m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, "0")}`;
  })();

  const tabs = REITER.map((r) => ({ ...r, zaehler: r.id === "klaerfaelle" ? k.klaerfaelleOffen : r.id === "zahlungen" ? k.gutschriftenAnzahl : 0 }));

  let inhalt = null;
  if (tab === "uebersicht") {
    inhalt = (
      <>
        <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Wert ton="dunkel" icon={Wallet} label="Offene Forderungen" wert={euro0(k.forderungenOffen)} hinweis={`${k.forderungenAnzahl} Rechnungen`} />
          <Wert icon={AlertTriangle} label="Überfällig" wert={euro0(k.ueberfaellig)} hinweis={`${k.ueberfaelligAnzahl} Rechnungen`} />
          <Wert icon={Banknote} label="Offene Gutschriften" wert={euro0(k.gutschriftenOffen)} hinweis={`${k.gutschriftenGesperrt} ohne KYC-Freigabe`} />
          <Wert icon={ListChecks} label="Klärfälle" wert={String(k.klaerfaelleOffen)} />
          <Wert icon={Scale} label="Pachtverträge aktiv" wert={String(k.pachtvertraegeAktiv)} />
          <Wert icon={BadgeEuro} label={`Erlöse ${heute.slice(0, 4)} (netto)`} wert={euro0(k.jahr.contracting + k.jahr.provision)} hinweis={`Pacht ${euro0(k.jahr.pacht)}`} />
        </section>
        {cockpit.warnungen.length > 0 && (
          <div role="status" className="mb-6 space-y-1.5 rounded-3xl bg-sun-300/20 p-5 text-[14px] text-ink-900 ring-1 ring-sun-400/50">
            {cockpit.warnungen.map((w, i) => <p key={i} className="flex gap-2"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{w}</p>)}
          </div>
        )}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Karte titel="Abrechnungslauf" untertitel="Täglich automatisch (Frappe-Scheduler) – hier manuell prüfen oder nachholen. Je Periode entsteht höchstens ein Beleg.">
            {darf ? <LaufStarten heute={heute} vormonat={vormonat} /> : <p className="text-[14px] text-ink-500">Ihre Rolle darf Läufe nur einsehen.</p>}
          </Karte>
          <Karte titel="Mahnvorschläge" untertitel="Überfällige Rechnungen mit erreichter Mahnstufe (Hinweis – der Versand erfolgt durch die Buchhaltung)" innen="p-0">
            {cockpit.mahnvorschlaege.length ? (
              <ul className="divide-y divide-ink-100">
                {cockpit.mahnvorschlaege.map((m) => (
                  <li key={m.id} className="px-5 py-3 md:px-6">
                    <p className="flex flex-wrap items-center justify-between gap-2 text-[14px]"><span className="ov-num font-semibold text-ink-900">{m.nummer}</span><span className="ov-num font-semibold">{euro(m.brutto)}</span></p>
                    <p className="text-[12.5px] text-ink-600">{m.empfaenger} · {m.mahnhinweis?.text}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="px-6 py-6 text-[14px] text-ink-500">Keine Mahnvorschläge.</p>}
          </Karte>
          <Karte titel="Letzte Läufe" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {cockpit.laeufe.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px] md:px-6">
                  <span className="font-semibold text-ink-900">{l.artLabel} · {tag(l.stichtag)}</span>
                  <span className="text-ink-600">{l.erzeugt} Belege ({euro0(l.summe)}) · {l.klaerfaelle} Klärfälle · {l.vonName || "System"}</span>
                </li>
              ))}
            </ul>
          </Karte>
          <Karte titel="Je Gesellschaft" untertitel={`Erlöse und Pachtaufwand ${heute.slice(0, 4)} (netto) – ÖkoInvest GmbH und Projektgesellschaften`} innen="p-0">
            <ul className="divide-y divide-ink-100">
              {cockpit.jeGesellschaft.map((g) => (
                <li key={g.id} className="px-5 py-3 text-[13.5px] md:px-6">
                  <p className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-ink-900">{g.name}{g.spv && <Badge className="ml-2">SPV</Badge>}</span><span className="text-ink-500">{g.anlagen} Anlagen</span></p>
                  <p className="text-ink-600">Contracting {euro0(g.erloese.contracting)} · Provision {euro0(g.erloese.provision)} · Pacht {euro0(g.pachtaufwand)} · offen {euro0(g.forderungenOffen)}</p>
                </li>
              ))}
            </ul>
          </Karte>
        </div>
        <Karte className="mt-6" titel="Buchhaltungssystem" untertitel={cockpit.einstellungen.erpnext.modus}>
          <p className="text-[14px] leading-relaxed text-ink-700">{cockpit.einstellungen.erpnext.hinweis}</p>
          <p className="mt-2 text-[13px] text-ink-500">Aussteller: {cockpit.einstellungen.firma.name}, {cockpit.einstellungen.firma.anschrift} · {cockpit.einstellungen.firma.firmenbuch} · UID {cockpit.einstellungen.firma.uid || "fehlt"} · Zahlungsziel {cockpit.einstellungen.zahlungszielTage} Tage</p>
        </Karte>
      </>
    );
  } else if (tab === "belege") {
    const art = ABRECHNUNG_ARTEN[sp.art] ? sp.art : "";
    const status = ["offen", "ueberfaellig", "angewiesen", "bezahlt", "storniert"].includes(sp.status) ? sp.status : "";
    const belege = await laden(() => b.finanzAbrechnungen(n, { art, status, limit: 400 }));
    inhalt = (
      <Karte
        titel="Belege"
        untertitel={`${belege.length} Belege · Summe ${euro(belege.reduce((s, x) => s + x.brutto, 0))}`}
        aktion={darfLesen(n, "export") ? <Button href={`/api/admin/finanzen/abrechnungen?format=csv${art ? `&art=${art}` : ""}${status ? `&status=${status}` : ""}`} size="sm" variant="secondary" icon={FileSpreadsheet}>CSV</Button> : null}
        innen="p-0"
      >
        <FilterLeiste art={art} status={status} />
        <BelegTabelle belege={belege} darf={darf} leer="Keine Belege für diesen Filter." />
      </Karte>
    );
  } else if (tab === "klaerfaelle") {
    const liste = await laden(() => b.klaerfaelle(n, { status: sp.status === "alle" ? "alle" : "offen" }));
    inhalt = (
      <Karte titel="Klärfälle" untertitel="Statt einer falschen Rechnung: fehlende Monatswerte, fehlender Index, unklare Empfänger. Nach Behebung erzeugt der nächste Lauf den Beleg und schließt den Klärfall." aktion={<Link href={`/portal/admin/finanzen?tab=klaerfaelle${sp.status === "alle" ? "" : "&status=alle"}`} className="text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">{sp.status === "alle" ? "Nur offene" : "Alle anzeigen"}</Link>} innen="p-0">
        {liste.length ? (
          <ul className="divide-y divide-ink-100">
            {liste.map((kf) => (
              <li key={kf.id} className="px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge ton={kf.status === "offen" ? "warn" : kf.status === "erledigt" ? "ok" : "neutral"}>{kf.statusLabel}</Badge>
                  <Badge>{kf.artLabel}</Badge>
                  <span className="text-[12.5px] text-ink-500">seit {tag(kf.erstelltAm?.slice(0, 10))}{kf.anzahl > 1 ? ` · ${kf.anzahl}× gemeldet` : ""}</span>
                </div>
                <p className="mt-1.5 font-semibold text-ink-900">{kf.bezugText}</p>
                <ul className="mt-1 list-disc pl-5 text-[13.5px] text-ink-700">{kf.gruende.map((g, i) => <li key={i}>{g}</li>)}</ul>
                {kf.kommentar && <p className="mt-1 text-[13px] text-ink-500">Kommentar: {kf.kommentar}</p>}
                {darf && kf.status === "offen" && <KlaerfallAktionen klaerfall={kf} />}
                {kf.bezug?.anlageId && <Link href={`/portal/admin/anlagen/${kf.bezug.anlageId}`} className="mt-2 inline-block text-[13px] font-semibold text-ov-700 hover:text-ov-800">Anlage & Zählerstände öffnen</Link>}
              </li>
            ))}
          </ul>
        ) : <p className="px-6 py-8 text-center text-[14px] text-ink-500">Keine Klärfälle.</p>}
      </Karte>
    );
  } else if (tab === "zahlungen") {
    const vorschlag = await laden(() => b.zahlungsvorschlag(n, {}));
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Zahlungsvorschlag" untertitel={`Offene Pacht-Gutschriften fällig bis ${tag(vorschlag.bis)} · frei ${euro(vorschlag.summeFrei)} · gesperrt ${euro(vorschlag.summeGesperrt)}`}>
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-600">Ausgezahlt wird nur an Eigentümer mit abgeschlossener Verifizierung (KYC) und geprüfter Bankverbindung – die IBAN stammt ausschließlich aus der Verifizierung. Die SEPA-Datei (pain.001.001.09) wird im Online-Banking eingereicht; die Plattform führt keine Zahlung selbst aus.</p>
          <Zahlungsvorschlag daten={vorschlag} darf={darf} heute={heute} />
        </Karte>
        <Karte titel="Zahlungsläufe" untertitel="Nach Ausführung durch die Bank bestätigen – die Gutschriften gelten dann als bezahlt" innen="p-0">
          {cockpit.zahlungslaeufe.length ? (
            <ul className="divide-y divide-ink-100">
              {cockpit.zahlungslaeufe.map((z) => (
                <li key={z.id} className="px-5 py-3 text-[13.5px] md:px-6">
                  <p className="flex flex-wrap items-center justify-between gap-2"><span className="ov-num font-semibold text-ink-900">{z.id}</span><Badge ton={z.status === "ausgefuehrt" ? "ok" : z.status === "verworfen" ? "neutral" : "info"}>{z.status === "erstellt" ? "eingereicht?" : z.status === "ausgefuehrt" ? "ausgeführt" : "verworfen"}</Badge></p>
                  <p className="text-ink-600">{z.anzahl} Zahlungen · {euro(z.summe)} · Ausführung {tag(z.ausfuehrungAm)} · {z.gesellschaft || "ÖkoInvest GmbH"}</p>
                  <p className="text-[12px] text-ink-500">SHA-256 {z.sha256?.slice(0, 16)}… · {z.vonName}</p>
                  {darf && <ZahlungslaufAktionen lauf={z} />}
                </li>
              ))}
            </ul>
          ) : <p className="px-6 py-6 text-[14px] text-ink-500">Noch keine Zahlungsläufe.</p>}
        </Karte>
      </div>
    );
  } else if (tab === "vertraege") {
    const [vertraege, auswahl] = await Promise.all([laden(() => b.pachtvertraege(n, {})), darf ? laden(() => b.pachtAuswahl(n)) : null]);
    inhalt = (
      <>
        <Karte titel="Pachtverträge" untertitel={`${vertraege.length} Verträge · Gutschriften entstehen je Fälligkeit im Abrechnungslauf`} innen="p-0">
          <ul className="divide-y divide-ink-100">
            {vertraege.map((v) => (
              <li key={v.id} className="px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{v.bezeichnung} <span className="ov-num text-[12.5px] font-normal text-ink-500">{v.id}</span></p>
                    <p className="text-[13px] text-ink-600">{v.eigentuemer?.name} · {v.modellLabel} · {v.faelligkeitLabel} {v.zahlweise === "vorschuessig" ? "vorschüssig" : "nachschüssig"} · Pächter {v.gesellschaft} · {v.steuer.label}</p>
                    <p className="text-[13px] text-ink-500">Beginn {v.beginn ? tag(v.beginn) : `offen (${v.beginnLabel})`} · Laufzeit {v.laufzeitJahre} J. · {v.belege} Belege{v.jahrespachtAktuell !== null ? ` · Jahrespacht ${euro(v.jahrespachtAktuell)}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge ton={v.status === "aktiv" ? "ok" : "neutral"}>{v.statusLabel}</Badge>
                    <Badge ton={v.auszahlung.ok ? "ok" : "warn"}>{v.auszahlung.ok ? "Auszahlung frei" : `KYC: ${v.auszahlung.kycStatus}`}</Badge>
                  </div>
                </div>
                {darf && auswahl && (
                  <details className="mt-3 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-200">
                    <summary className="cursor-pointer text-[13.5px] font-semibold text-ov-700">Vertrag bearbeiten</summary>
                    <div className="mt-4"><VertragFormular auswahl={auswahl} vertrag={v} /></div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </Karte>
        {darf && auswahl && (
          <Karte className="mt-6" titel="Neuer Pachtvertrag" untertitel="Eigentümer (Konto), Modell, Beginn = Baubeginn/Inbetriebnahme, Fälligkeit – Bankverbindung kommt aus der Verifizierung (KYC)">
            <VertragFormular auswahl={auswahl} />
          </Karte>
        )}
      </>
    );
  } else if (tab === "index") {
    const vpi = await laden(() => b.vpiWerte(n));
    const reihen = Object.keys(vpi.reihen);
    inhalt = (
      <>
        <Karte titel="Verbraucherpreisindizes" untertitel="Jahresdurchschnitte für die Wertsicherung. Maßgeblich ist die amtliche Veröffentlichung – Demo-Startwerte sind gerundete Beispielwerte.">
          <div className="grid gap-5 md:grid-cols-3">
            {reihen.map((r) => (
              <div key={r} className="min-w-0">
                <p className="font-semibold text-ink-900">{vpi.reihen[r].label}</p>
                <p className="mb-2 text-[12.5px] text-ink-500">{vpi.reihen[r].quelle}</p>
                <table className="w-full text-[13.5px]">
                  <tbody className="divide-y divide-ink-100">
                    {vpi.werte.filter((w) => w.reihe === r).map((w) => (
                      <tr key={w.jahr}><th scope="row" className="py-1.5 text-left font-medium text-ink-700">{w.jahr}</th><td className="ov-num py-1.5 text-right font-semibold text-ink-900" title={w.quelle}>{Number(w.wert).toLocaleString("de-DE", { minimumFractionDigits: 1 })}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Karte>
        {darf && <Karte className="mt-6" titel="Indexwert pflegen"><VpiFormular reihen={vpi.reihen} /></Karte>}
      </>
    );
  } else if (tab === "anlagen") {
    const [anlagen, projekte] = await Promise.all([laden(() => b.finanzAnlagen(n)), b.entwicklungKosten(n).catch(() => [])]);
    const jahr = Number(heute.slice(0, 4));
    inhalt = (
      <>
        <Karte titel="Anlagenbuchhaltung" untertitel="Eigene Contracting-Anlagen als Anlagevermögen (ERPNext Asset in der Company der Eigentümergesellschaft) – lineare AfA" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {anlagen.map((a) => (
              <li key={a.anlageId} className="px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{a.name}</p>
                    <p className="text-[13px] text-ink-600">{a.gesellschaft} · {a.land} · {a.kwp ? `${a.kwp.toLocaleString("de-DE")} kWp` : "Speicher"} · Inbetriebnahme {tag(a.inbetriebnahme)}</p>
                    {a.aktiviert ? (
                      <p className="text-[13px] text-ink-700">Anschaffung {euro0(a.asset.anschaffungswert)} · {a.asset.nutzungsdauerJahre} Jahre · AfA {jahr} {euro0(a.afaJahr)} · Buchwert Ende {jahr} {euro0(a.buchwert)}</p>
                    ) : <p className="text-[13px] text-ink-500">Noch nicht aktiviert – Vorschlag: {a.vorschlag.nutzungsdauerJahre} Jahre, Regel {a.regel}</p>}
                  </div>
                  {darf && <AnlageAktivieren anlage={a} />}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] leading-relaxed text-ink-500 md:px-6">{AFA.regeln.AT.text} {AFA.regeln.DE.text}</p>
        </Karte>
        <Karte className="mt-6" titel="Projektcontrolling Entwicklung" untertitel="Ist-Kosten je Entwicklungsprojekt (ERPNext: Eingangsrechnungen, Journalbuchungen, Timesheets) – Budget vs. Ist, Kosten je MWp" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {projekte.map((p) => (
              <li key={p.projektId} className="px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{p.bezeichnung}</p>
                    <p className="text-[13px] text-ink-600">Ist {euro0(p.ist)}{p.budget ? ` von ${euro0(p.budget)} Budget` : ""}{p.jeMwp ? ` · ${euro0(p.jeMwp)} je MWp` : ""} · {p.anzahl} Buchungen</p>
                  </div>
                  <Badge ton={p.ampel === "rot" ? "warn" : p.ampel === "gelb" ? "info" : p.ampel === "gruen" ? "ok" : "neutral"}>{p.quote !== null ? `${Math.round(p.quote * 100)} % vom Budget` : "ohne Budget"}</Badge>
                </div>
                {p.budget ? (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden="true"><div className={cn("h-full rounded-full", p.ampel === "rot" ? "bg-sun-500" : "bg-ov-500")} style={{ width: `${Math.min(100, Math.round((p.quote || 0) * 100))}%` }} /></div>
                ) : null}
              </li>
            ))}
          </ul>
        </Karte>
        {darf && projekte.length > 0 && <Karte className="mt-6" titel="Kosten buchen" untertitel="Nur ohne ERPNext – mit ERPNext kommen die Ist-Kosten aus den Buchungen mit Projektbezug"><KostenBuchen projekte={projekte} kostenarten={projekte[0]?.kostenarten || { planung: "Planung & Gutachten", sonstiges: "Sonstiges" }} /></Karte>}
      </>
    );
  }

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Buchhaltung"
        titel="Finanzen & Abrechnung"
        text="Pachtabrechnung, Contracting-Rechnungen und Provisionen, Klärfälle, offene Posten und Auszahlungen mit SEPA-Export. Steuerliche Behandlung als Vorlage – mit der Steuerberatung abstimmen."
        aktionen={<Button href="/portal/admin/deals" size="sm" variant="secondary" icon={Landmark}>Deals & Provisionen</Button>}
      />
      <Reiter basis="/portal/admin/finanzen" aktiv={tab} tabs={tabs} label="Bereiche Finanzen" />
      {inhalt}
      <p className="mt-8 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
        <ClipboardCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        Belege enthalten die Pflichtangaben nach § 14 Abs. 4 UStG bzw. § 11 Abs. 1 UStG 1994 (Checkliste in der Doku). Die Vorlagen zur Umsatzsteuer (Pacht steuerfrei/Option, Kleinunternehmer, Reverse Charge) sind Vorschläge und vor dem Livegang mit der Steuerberatung abzustimmen.
      </p>
    </>
  );
}

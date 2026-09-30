import Link from "next/link";
import { BadgeEuro, CalendarClock, FileText, Info, ReceiptText, ShieldAlert, SunMedium, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BelegListe, MonatsDiagramm, euro, euro0, kwh, tag, zeitraum } from "@/components/Portal/Finanzen/teile";
import { cn } from "@/components/ui/cn";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge"; // Mahnungen & Stornobelege (Buchhaltung)

export const metadata = { title: "Abrechnungen" };

function JahrWahl({ jahre, jahr }) {
  if (jahre.length < 2) return null;
  return (
    <nav aria-label="Jahr wählen" className="-mx-4 mb-6 overflow-x-auto px-4 ov-no-scrollbar md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1.5 rounded-full bg-white p-1.5 ring-1 ring-ink-200/70 md:inline-flex md:min-w-0">
        {jahre.map((j) => (
          <li key={j}>
            <Link href={`/portal/abrechnungen?jahr=${j}`} scroll={false} aria-current={j === jahr ? "page" : undefined} className={cn("ov-num inline-flex h-9 items-center rounded-full px-4 text-[14px] font-semibold", j === jahr ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}>
              {j}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Vertrag({ v }) {
  return (
    <li className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[17px] font-bold text-ink-900">{v.bezeichnung}</p>
          <p className="text-[13px] text-ink-500">{v.modellLabel} · {v.objektLabel}{v.flaecheHa ? ` · ${v.flaecheHa.toLocaleString("de-DE")} ha` : ""} · {v.land}</p>
        </div>
        {v.jahrespachtAktuell !== null && (
          <div className="text-right">
            <p className="text-[12px] text-ink-500">Jahrespacht aktuell</p>
            <p className="ov-num font-display text-[20px] font-extrabold text-ink-900">{euro(v.jahrespachtAktuell)}</p>
          </div>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13.5px] sm:grid-cols-4">
        <div><dt className="text-ink-500">Pachtbeginn</dt><dd className="font-semibold text-ink-900">{v.beginn ? tag(v.beginn) : `mit ${v.beginnLabel || "Baubeginn"}`}</dd></div>
        <div><dt className="text-ink-500">Laufzeit</dt><dd className="font-semibold text-ink-900">{v.laufzeitJahre} Jahre{v.ende ? ` (bis ${tag(v.ende)})` : ""}</dd></div>
        <div><dt className="text-ink-500">Zahlung</dt><dd className="font-semibold text-ink-900">{v.faelligkeitLabel}, {v.zahlweise === "vorschuessig" ? "im Voraus" : "im Nachhinein"}</dd></div>
        <div>
          <dt className="text-ink-500">Nächste Zahlung</dt>
          <dd className="font-semibold text-ink-900">{v.naechsteZahlung ? `${tag(v.naechsteZahlung.faelligAm)} · ${v.naechsteZahlung.mindestens ? "mind. " : ""}${euro(v.naechsteZahlung.betrag)}` : "–"}</dd>
        </div>
      </dl>
      {v.erklaerung?.length > 0 && (
        <details className="group mt-4 rounded-2xl bg-sand-100/70 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-semibold text-ink-900">
            <Info aria-hidden="true" className="h-4 w-4 text-ov-600" />
            So wird Ihre Pacht berechnet
            <span aria-hidden="true" className="ml-auto text-ink-400 transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-ink-700">
            {v.erklaerung.map((z, i) => <li key={i}>{z}</li>)}
            {v.naechsteZahlung?.phase === "reservierung" && <li>Bis zum Pachtbeginn erhalten Sie die vereinbarte Reservierungsprämie.</li>}
          </ul>
        </details>
      )}
    </li>
  );
}

export default async function AbrechnungenSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = (await searchParams) || {};
  const d = await laden(() => finanzenBackend().meineAbrechnungen(n, { jahr: sp.jahr }));
  const { pacht, contracting, provision, jahr } = d;
  const nichts = !pacht.sichtbar && !contracting.sichtbar && !provision.sichtbar;
  const imJahr = (liste) => liste.filter((b) => String(b.zeitraum?.von || "").startsWith(String(jahr)));
  const schreiben = await werkzeugeBackend().bhMeineDokumente(n).catch(() => []); // Mahnungen & Stornobelege

  return (
    <>
      <SeitenKopf
        eyebrow="Portal · Finanzen"
        titel="Abrechnungen"
        text="Pachtabrechnungen, Rechnungen und Zahlungen an einem Ort – jede Abrechnung als PDF, mit Status und Erläuterung."
      />
      {nichts ? (
        <Leer icon={ReceiptText} titel="Noch keine Abrechnungen" text="Sobald ein Pachtvertrag läuft, eine Contracting-Anlage abgerechnet oder eine Provision fällig wird, erscheinen die Belege hier – mit PDF und Zahlungsstatus." aktion={<Button href="/portal" size="sm" variant="secondary">Zur Übersicht</Button>} />
      ) : (
        <>
          <JahrWahl jahre={d.jahre} jahr={jahr} />

          {pacht.sichtbar && (
            <section aria-labelledby="pacht" className="mb-10">
              <h2 id="pacht" className="mb-4 font-display text-[20px] font-bold text-ink-900">Pacht</h2>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Wert ton="dunkel" icon={Wallet} label={`Pacht ${jahr}`} wert={euro0(pacht.jahr.brutto)} hinweis={`${pacht.jahr.anzahl} Gutschriften`} />
                <Wert icon={BadgeEuro} label="Ausgezahlt" wert={euro0(pacht.jahr.bezahlt)} />
                <Wert icon={FileText} label="Offen" wert={euro0(pacht.jahr.offen)} />
                <Wert icon={CalendarClock} label="Nächste Zahlung" wert={pacht.naechsteZahlung ? tag(pacht.naechsteZahlung.faelligAm) : "–"} hinweis={pacht.naechsteZahlung ? `${pacht.naechsteZahlung.mindestens ? "mind. " : ""}${euro(pacht.naechsteZahlung.betrag)} · ${pacht.naechsteZahlung.vertrag}` : ""} />
              </div>
              {pacht.auszahlung && !pacht.auszahlung.ok && (
                <div role="status" className="mb-5 flex flex-col gap-3 rounded-3xl bg-sun-300/20 p-5 ring-1 ring-sun-400/50 sm:flex-row sm:items-center">
                  <ShieldAlert aria-hidden="true" className="h-6 w-6 shrink-0 text-ink-900" />
                  <p className="text-[14.5px] leading-relaxed text-ink-900">
                    <strong>Auszahlung vorbereitet, aber noch gesperrt.</strong> {pacht.auszahlung.hinweis} Ihre Gutschriften bleiben erhalten und werden danach überwiesen.
                  </p>
                  <Button href="/portal/verifizierung" size="sm" variant="navy" className="sm:ml-auto">Zur Verifizierung</Button>
                </div>
              )}
              {pacht.vertraege.length > 0 && <ul className="mb-5 grid gap-4 xl:grid-cols-2">{pacht.vertraege.map((v) => <Vertrag key={v.id} v={v} />)}</ul>}
              <Karte titel={`Gutschriften ${jahr}`} untertitel={pacht.auszahlung?.ibanMaskiert ? `Auszahlung auf ${pacht.auszahlung.ibanMaskiert}` : "Pachtabrechnungen als Gutschrift"} innen="p-0">
                <BelegListe belege={imJahr(pacht.belege)} leer={`Keine Gutschriften für ${jahr}.`} betragLabel="Auszahlung" />
              </Karte>
              <p className="mt-3 text-[13px] text-ink-500">Jahresbescheinigung als PDF, Fristen, Rückbausicherheit und Anliegen wie Kündigung, Eigentümerwechsel oder Erbfall: <Link href="/portal/pachtvertraege" className="font-semibold text-ov-700 hover:text-ov-800">Pachtverträge</Link>.</p>{/* Pachtakte (Team 1) */}
            </section>
          )}

          {contracting.sichtbar && (
            <section aria-labelledby="contracting" className="mb-10">
              <h2 id="contracting" className="mb-4 font-display text-[20px] font-bold text-ink-900">Contracting-Strom</h2>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Wert ton="dunkel" icon={SunMedium} label={`PV-Strom ${jahr}`} wert={kwh(contracting.monate.reduce((s, m) => s + m.kwh, 0))} hinweis="aus geeichten Zählerständen" />
                <Wert icon={ReceiptText} label="Rechnungen" wert={euro0(contracting.jahr.brutto)} hinweis={`${contracting.jahr.anzahl} Rechnungen`} />
                <Wert icon={BadgeEuro} label="Bezahlt" wert={euro0(contracting.jahr.bezahlt)} />
                <Wert icon={FileText} label="Offen" wert={euro0(contracting.jahr.offen)} />
              </div>
              <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <Karte titel="Verbrauch je Monat" untertitel="Gelieferter PV-Strom aller Anlagen">
                  <MonatsDiagramm monate={contracting.monate} />
                </Karte>
                <Karte titel="Monatsübersicht" innen="p-0">
                  <ul className="divide-y divide-ink-100">
                    {contracting.monate.length ? [...contracting.monate].reverse().map((m) => (
                      <li key={m.monat} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px] md:px-6">
                        <span className="font-semibold text-ink-900">{m.monat.slice(5)}/{m.monat.slice(0, 4)}</span>
                        <span className="text-ink-600">{kwh(m.kwh)} · {m.anlagen} Anlage{m.anlagen === 1 ? "" : "n"}</span>
                        <span className="ov-num font-semibold text-ink-900">{euro(m.brutto)}</span>
                      </li>
                    )) : <li className="px-6 py-6 text-[14px] text-ink-500">Keine Abrechnungen in {jahr}.</li>}
                  </ul>
                </Karte>
              </div>
              <Karte titel={`Rechnungen ${jahr}`} untertitel="Je Anlage und Monat: Arbeitspreis × gelieferte kWh + Grundgebühr" innen="p-0">
                <BelegListe belege={imJahr(contracting.belege)} leer={`Keine Rechnungen für ${jahr}.`} />
              </Karte>
              <p className="mt-3 text-[13px] text-ink-500">Die Live-Werte Ihrer Anlagen finden Sie unter <Link href="/portal/anlagen" className="font-semibold text-ov-700 hover:text-ov-800">Meine Anlagen</Link>. Abgerechnet wird ausschließlich über die geeichten Zähler. Stimmt eine Rechnung nicht? <Link href="/portal/anliegen?art=einspruch#neu" className="font-semibold text-ov-700 hover:text-ov-800">Einspruch einlegen</Link> – die Mahnung ruht, bis entschieden ist.</p>
            </section>
          )}

          {provision.sichtbar && (
            <section aria-labelledby="provision" className="mb-10">
              <h2 id="provision" className="mb-4 font-display text-[20px] font-bold text-ink-900">Provisionen</h2>
              <Karte titel="Provisionsrechnungen" untertitel="Vermittlungsprovision laut Provisionsvereinbarung – fällig nur bei Abschluss" innen="p-0">
                <BelegListe belege={provision.belege} leer="Keine Provisionsrechnungen." />
              </Karte>
              <p className="mt-3 text-[13px] text-ink-500">Zu Ihren verkauften Projekten: <Link href="/portal/projekte" className="font-semibold text-ov-700 hover:text-ov-800">Meine Projekte</Link>.</p>
            </section>
          )}
          {schreiben.length > 0 && (
            <section aria-labelledby="schreiben" className="mb-10">
              <h2 id="schreiben" className="mb-4 font-display text-[20px] font-bold text-ink-900">Mahnungen & Stornobelege</h2>
              <Karte innen="p-0">
                <ul className="divide-y divide-ink-100">
                  {schreiben.map((x) => (
                    <li key={`${x.art}-${x.nr}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[14px] md:px-6">
                      <span><span className="font-semibold text-ink-900">{x.titel}</span> <span className="ov-num text-ink-600">{x.nr}</span> <span className="text-ink-500">zu {x.nummer} · {tag(x.datum)}{x.frist ? ` · zahlbar bis ${tag(x.frist)}` : ""}</span></span>
                      <span className="flex items-center gap-3"><span className="ov-num font-semibold">{euro(x.betrag)}</span><a href={`/api/portal/finanzen/${x.belegId}/dokument?art=${x.art}${x.art === "mahnung" ? `&nr=${encodeURIComponent(x.nr)}` : ""}&anzeigen=1`} target="_blank" rel="noopener" className="font-semibold text-ov-700 hover:text-ov-800">PDF</a></span>
                    </li>
                  ))}
                </ul>
              </Karte>
            </section>
          )}
          <p className="text-[12.5px] leading-relaxed text-ink-500">
            Fragen zu einer Abrechnung? Schreiben Sie uns über <Link href="/portal/nachrichten" className="font-semibold text-ov-700 hover:text-ov-800">Nachrichten</Link> – bitte mit der Belegnummer. Zeitraum der Anzeige: {zeitraum({ von: `${jahr}-01-01`, bis: `${jahr}-12-31` })}.
          </p>
        </>
      )}
    </>
  );
}

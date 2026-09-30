import Link from "next/link";
import { AlertTriangle, CalendarClock, Hourglass, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { Karte, Kennzahl, SeitenKopf, Tabelle, zelle, Badge } from "@/components/Portal/ui";
import { KycStatusBadge, RisikoBadge } from "@/components/Portal/Kyc/teile";
import ComplianceWerkzeuge from "@/components/Portal/Kyc/ComplianceWerkzeuge";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { kycBackend } from "@/lib/plattform/backend/kyc";
import { cn } from "@/components/ui/cn";
import { datum } from "@/lib/plattform/format";
import { kycSla } from "@/lib/plattform/compliance/sla"; // SLA der Warteschlange (Team Backoffice-Werkzeuge)

export const metadata = { title: "Compliance · KYC/KYB" };

const FILTER = [
  ["offen", "Warteschlange"],
  ["zweitpruefung", "Zweitfreigabe"],
  ["treffer", "Sanktionstreffer"],
  ["nachgefordert", "Nachgefordert"],
  ["faellig", "Wiederholung fällig"],
  ["verifiziert", "Verifiziert"],
  ["abgelehnt", "Abgelehnt"],
  ["alle", "Alle"],
];

export default async function CompliancePage({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const status = FILTER.some(([k]) => k === sp?.status) ? sp.status : "offen";
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  const b = kycBackend();
  const daten = await laden(() => b.kycWarteschlange(n, { status, q }));
  const einstellungen = daten.schreiben ? await laden(() => b.kycEinstellungen(n)) : null;
  const k = daten.kennzahlen;

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Compliance"
        titel="KYC/KYB-Prüfung"
        text="Warteschlange der Verifizierungen mit Risikoeinstufung, Sanktionslisten-Abgleich und Vier-Augen-Freigabe bei hohem Risiko. Unterlagen sehen nur Konten mit der Rolle „Compliance“; jeder Zugriff wird im Revisionsprotokoll vermerkt."
        aktionen={<><Link href="/portal/admin/compliance/datenschutz" className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Datenschutz (DSGVO)</Link><Link href="/portal/admin/compliance/gwg" className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Geldwäsche-Verdacht</Link></>}
      />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kennzahl ton="dunkel" icon={Hourglass} label="Warteschlange" wert={String(k.warteschlange)} href="/portal/admin/compliance" />
        <Kennzahl icon={Users} label="Zweitfreigabe" wert={String(k.zweitpruefung)} href="/portal/admin/compliance?status=zweitpruefung" />
        <Kennzahl icon={ShieldAlert} label="Sanktionstreffer" wert={String(k.treffer)} href="/portal/admin/compliance?status=treffer" />
        <Kennzahl icon={AlertTriangle} label="Risiko hoch" wert={String(k.hoch)} />
        <Kennzahl icon={CalendarClock} label="Wiederholung ≤ 30 Tage" wert={String(k.faellig)} href="/portal/admin/compliance?status=faellig" />
        <Kennzahl icon={ShieldCheck} label="Verifiziert" wert={String(k.verifiziert)} href="/portal/admin/compliance?status=verifiziert" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Karte
          titel="Vorgänge"
          untertitel={`${daten.faelle.length} ${daten.faelle.length === 1 ? "Fall" : "Fälle"} · sortiert nach Zweitfreigabe, Risiko und Wartezeit`}
          innen="p-0"
          className="self-start"
          aktion={
            <form role="search" className="w-full sm:w-auto" action="/portal/admin/compliance">
              <input type="hidden" name="status" value={status} />
              <label htmlFor="c-suche" className="sr-only">Suche</label>
              <input id="c-suche" name="q" defaultValue={q} placeholder="Name, E-Mail, Kennung" className="h-10 w-full rounded-full bg-white px-4 text-[14px] ring-1 ring-inset ring-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 sm:w-[220px]" />
            </form>
          }
        >
          <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 ov-no-scrollbar md:px-6">
            {FILTER.map(([key, label]) => (
              <Link key={key} href={`/portal/admin/compliance?status=${key}`} aria-current={status === key ? "page" : undefined}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>
                {label}
              </Link>
            ))}
          </nav>
          {daten.faelle.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-ink-500 md:px-6">Keine Vorgänge in dieser Ansicht.</p>
          ) : (
            <>
              <ul className="divide-y divide-ink-100 md:hidden">
                {daten.faelle.map((f) => (
                  <li key={f.id} className="px-5 py-4">
                    <Link href={`/portal/admin/compliance/${f.id}`} className="block font-semibold text-ink-900 hover:text-ov-700">{f.bezeichnung}</Link>
                    <p className="mt-0.5 text-[12.5px] text-ink-500">{f.id} · {f.kontotyp === "unternehmen" ? "KYB" : "KYC"} · wartet {f.wartetTage ?? "–"} Tg.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <KycStatusBadge status={f.status} intern />
                      <RisikoBadge stufe={f.risiko} />
                      {f.sanktionen === "treffer_pruefen" && <Badge ton="warn">Treffer prüfen</Badge>}
                      {f.pep && <Badge ton="warn">PEP</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden px-6 md:block">
                <Tabelle kopf={["Fall", "Art", "Status", "Risiko", "Hinweise", "Eingereicht", "Bearbeitung"]}>
                  {daten.faelle.map((f) => (
                    <tr key={f.id} className="hover:bg-ink-50/60">
                      <td className={zelle}>
                        <Link href={`/portal/admin/compliance/${f.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{f.bezeichnung}</Link>
                        <p className="text-[12.5px] text-ink-500">{f.id}{f.konto?.email ? ` · ${f.konto.email}` : ""}</p>
                      </td>
                      <td className={zelle}>{f.kontotyp === "unternehmen" ? "KYB" : "KYC"}</td>
                      <td className={zelle}><KycStatusBadge status={f.status} intern /></td>
                      <td className={zelle}><RisikoBadge stufe={f.risiko} /></td>
                      <td className={zelle}>
                        <div className="flex flex-wrap gap-1.5">
                          {f.sanktionen === "treffer_pruefen" && <Badge ton="warn">Treffer prüfen</Badge>}
                          {f.sanktionen === "bestaetigt" && <Badge ton="dunkel">Treffer bestätigt</Badge>}
                          {f.pep && <Badge ton="warn">PEP</Badge>}
                          {f.naechstePruefung && f.status === "verifiziert" && <Badge>bis {datum(f.naechstePruefung)}</Badge>}
                        </div>
                      </td>
                      <td className={zelle}>{f.eingereichtAm ? <>{datum(f.eingereichtAm)}<p className="text-[12.5px] text-ink-500">wartet {f.wartetTage} Tg.</p>{(() => { const s = kycSla(f, new Date().toISOString().slice(0, 10)); return s.ampel === "rot" ? <Badge ton="warn">SLA überschritten</Badge> : s.ampel === "gelb" ? <Badge>SLA heute</Badge> : null; })()}</> : "–"}</td>
                      <td className={zelle}>{f.bearbeiter || "–"}</td>
                    </tr>
                  ))}
                </Tabelle>
              </div>
            </>
          )}
        </Karte>

        <div className="min-w-0 space-y-6">
          <Karte titel="Sanktionsliste" untertitel={daten.liste.demo ? "Fiktive Testliste (Demo)" : daten.liste.quelle}>
            <p className="text-[14px] text-ink-700">Stand <strong>{daten.liste.stand || "–"}</strong> · {daten.liste.anzahl} Einträge</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
              Offizielle Quelle: konsolidierte Finanzsanktionsliste der EU (Financial Sanctions Files, webgate.ec.europa.eu/fsd/fsf). Import manuell per Befehl: <code className="rounded bg-ink-100 px-1">node scripts/kyc-sanktionsliste-import.mjs &lt;datei.xml|csv&gt;</code>. Treffer führen immer zur manuellen Prüfung.
            </p>
          </Karte>
          {daten.schreiben ? (
            <ComplianceWerkzeuge einstellungen={JSON.parse(JSON.stringify(einstellungen))} />
          ) : (
            <Karte titel="Nur Übersicht"><p className="text-[14px] text-ink-600">Unterlagen, Prüfung und Einstellungen sind der Backoffice-Rolle „Compliance“ vorbehalten.</p></Karte>
          )}
        </div>
      </div>
    </>
  );
}

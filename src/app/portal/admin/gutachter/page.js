import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Euro, FileSearch, Inbox, Star, TriangleAlert } from "lucide-react";
import { Badge, Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import { FristenListe, datum, eur } from "@/components/Portal/Gutachter/Akte";
import { AnfrageFormular } from "@/components/Portal/Gutachter/Aktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";
import { AUFTRAG_STATUS } from "@/lib/plattform/gutachter/kern";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Gutachteraufträge" };

const FILTER = [["", "Alle"], ["offen", "Offen"], ["angebot", "Angebote zu entscheiden"], ["in_pruefung", "Lieferung in Prüfung"], ["abnahmebereit", "Abnahme offen"], ["abgerechnet", "Rechnung offen"], ["abgeschlossen", "Abgeschlossen"]];

// Backoffice (Bereich „entwicklung“): alle Gutachter-/Planeraufträge, Leistungsanfrage an mehrere Büros, Bewertungen, Fristen
export default async function GutachterAdminSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const projektId = /^[A-Z]{1,3}-[0-9A-Z-]{4,40}$/.test(String(sp.projekt || "")) ? sp.projekt : "";
  const status = FILTER.some(([k]) => k === sp.status) ? sp.status : "";
  const d = await laden(() => gutachterBackend().gaUebersicht(n, { projektId, status }));
  const k = d.kennzahlen;
  const q = (x) => `/portal/admin/gutachter?${new URLSearchParams(Object.entries({ projekt: projektId, status, ...x }).filter(([, w]) => w)).toString()}`;
  const projekt = d.projekte.find((p) => p.id === projektId);
  return (
    <>
      {projekt && <Link href={`/portal/admin/entwicklung/${projekt.id}`} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{projekt.titel}</Link>}
      <SeitenKopf eyebrow="Projektentwicklung" titel="Gutachter- und Planeraufträge" text="Angebote einholen und vergleichen, beauftragen, Lieferungen prüfen, abnehmen, Rechnungen freigeben und Büros bewerten." />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kennzahl label="Offene Anfragen" wert={k.offeneAnfragen} icon={Inbox} href={q({ status: "offen" })} />
        <Kennzahl label="Angebote zu entscheiden" wert={k.angeboteZuEntscheiden} icon={FileSearch} href={q({ status: "angebot" })} />
        <Kennzahl label="Lieferungen in Prüfung" wert={k.inPruefung} icon={ClipboardCheck} href={q({ status: "in_pruefung" })} />
        <Kennzahl label="Überfällig" wert={k.ueberfaellig} icon={TriangleAlert} />
        <Kennzahl label="Offene Rechnungen" wert={eur(k.rechnungenOffen)} icon={Euro} hinweis={`Auftragsvolumen ${eur(k.auftragsvolumen)} netto`} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <nav aria-label="Filter" className="flex flex-wrap gap-2">
            {FILTER.map(([id, label]) => <Link key={id || "alle"} href={q({ status: id })} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === id ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")} aria-current={status === id ? "page" : undefined}>{label}</Link>)}
            {projekt && <Link href={`/portal/admin/gutachter${status ? `?status=${status}` : ""}`} className="rounded-full bg-ov-50 px-3.5 py-1.5 text-[13px] font-semibold text-ov-800 ring-1 ring-inset ring-ov-200">Projekt: {projekt.titel} ×</Link>}
          </nav>
          {d.auftraege.length === 0 ? (
            <Leer icon={FileSearch} titel="Keine Aufträge" text={status || projektId ? "Für diesen Filter gibt es keine Aufträge." : "Holen Sie über „Neue Leistungsanfrage“ Angebote von Gutachtern und Planern ein."} />
          ) : (
            <Karte titel={`Aufträge (${d.auftraege.length})`} innen="p-0">
              <ul className="divide-y divide-ink-100">
                {d.auftraege.map((a) => (
                  <li key={a.id}>
                    <Link href={`/portal/admin/gutachter/${a.id}`} className="flex flex-col gap-2 px-5 py-3.5 hover:bg-ink-50/60 md:flex-row md:items-center md:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-semibold text-ink-900">{a.titel}</p>
                        <p className="text-[12.5px] text-ink-500">{a.gutachter.name}{a.gutachter.firma ? ` · ${a.gutachter.firma}` : ""} · {a.projekt?.titel}</p>
                        <p className="text-[12.5px] text-ink-600">{a.angebot ? `${eur(a.angebot.summeNetto)} netto` : `Angebotsfrist ${datum(a.angebotsfrist)}`}{a.liefertermin ? ` · Liefertermin ${datum(a.liefertermin)}` : ""}{a.rechnungsstand.offenBrutto > 0 ? ` · offen ${eur(a.rechnungsstand.offenBrutto)}` : ""}{a.bewertung ? ` · Bewertung ${String(a.bewertung.schnitt).replace(".", ",")}` : ""}</p>
                      </div>
                      <span className="flex flex-wrap gap-2">{a.ueberfaellig && <Badge className="bg-danger-50 text-danger-800 ring-danger-200">überfällig</Badge>}<Badge ton={AUFTRAG_STATUS[a.status]?.ton}>{a.statusLabel}</Badge></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Karte>
          )}
          {d.darfSchreiben && (
            <Karte titel="Neue Leistungsanfrage" untertitel="Ein Auftrag je angefragtem Büro; die Angebote erscheinen nebeneinander im Vergleich.">
              <details open={!d.auftraege.length}><summary className="cursor-pointer text-[14px] font-semibold text-ov-700">Formular öffnen</summary><div className="mt-4"><AnfrageFormular projekte={d.projekte} gutachter={d.gutachter} fachgebiete={d.fachgebiete} startProjekt={projektId} /></div></details>
            </Karte>
          )}
        </div>
        <div className="space-y-6">
          <Karte titel="Fristen" untertitel="nächste 14 Tage und Überfälliges"><FristenListe fristen={d.fristen} link={(f) => `/portal/admin/gutachter/${f.auftragId}`} /></Karte>
          <Karte titel="Gutachter & Planer" untertitel="Interne Bewertung aus abgenommenen Aufträgen" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {d.gutachter.map((g) => (
                <li key={g.id} className="px-5 py-3">
                  <p className="text-[14px] font-semibold text-ink-900">{g.name}{g.firma ? <span className="font-normal text-ink-600"> · {g.firma}</span> : null}</p>
                  <p className="text-[12.5px] text-ink-500">{g.fachgebieteLabel.join(", ") || "Fachgebiete nicht gepflegt"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-700">
                    <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="h-3.5 w-3.5 text-sun-400" />{g.schnitt ? `${String(g.schnitt.schnitt).replace(".", ",")} / 5 (${g.schnitt.anzahl})` : "nicht bewertet"}</span>
                    <span>· {g.laufend} laufend · {g.gesamt} gesamt</span>{g.termintreue !== null && <span>· termintreu {g.termintreue} %</span>}
                  </p>
                </li>
              ))}
              {!d.gutachter.length && <li className="px-5 py-4 text-[14px] text-ink-500">Noch keine Gutachter-Konten – Einladung im Entwicklungsprojekt unter „Freigaben & Gutachter“.</li>}
            </ul>
          </Karte>
        </div>
      </div>
    </>
  );
}

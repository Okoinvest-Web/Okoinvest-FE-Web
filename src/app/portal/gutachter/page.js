import Link from "next/link";
import { ArrowRight, ClipboardList, FileSearch, Inbox, Receipt, TriangleAlert } from "lucide-react";
import { Badge, Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import { FristenListe, datum, eur } from "@/components/Portal/Gutachter/Akte";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";
import { LAENDER } from "@/lib/plattform/konstanten";

export const metadata = { title: "Aufträge & Angebote" };

const GRUPPEN = [
  { id: "anfragen", titel: "Angebotsanfragen", text: "Angebot abgeben oder ablehnen", status: ["angefragt", "angebot"] },
  { id: "laufend", titel: "Laufende Aufträge", text: "Bestätigen, Termine, Zwischenstände, Lieferungen", status: ["beauftragt", "in_arbeit", "in_pruefung", "nachbesserung", "abnahmebereit"] },
  { id: "abrechnung", titel: "Abnahme & Abrechnung", text: "Schlussrechnung und Zahlungsstatus", status: ["abgenommen", "abgerechnet"] },
  { id: "erledigt", titel: "Abgeschlossen", text: "Bezahlt, abgelehnt, nicht beauftragt oder storniert", status: ["abgeschlossen", "abgelehnt", "nicht_beauftragt", "storniert"] },
];

// Gutachter/Planer: alle eigenen Anfragen und Aufträge über alle Projekte (Rolle „gutachter“; andere Rollen 404)
export default async function GutachterSeite() {
  const n = await portalNutzer({ rollen: ["gutachter"] });
  const d = await laden(() => gutachterBackend().gaMeine(n));
  const k = d.kennzahlen;
  return (
    <>
      <SeitenKopf eyebrow="Gutachter & Planer" titel="Aufträge & Angebote" text="Angebotsanfragen von ÖkoInvest, beauftragte Leistungen, Termine, Lieferungen und Rechnungen – für alle Projekte an einem Ort." />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Offene Anfragen" wert={k.anfragen} icon={Inbox} hinweis="Angebot abgeben" />
        <Kennzahl label="Laufende Aufträge" wert={k.laufend} icon={ClipboardList} />
        <Kennzahl label="Überfällig" wert={k.ueberfaellig} icon={TriangleAlert} hinweis="Frist oder Liefertermin überschritten" />
        <Kennzahl label="Offene Rechnungen" wert={eur(k.offenBrutto)} icon={Receipt} hinweis="brutto, noch nicht bezahlt" />
      </section>
      {d.auftraege.length === 0 ? (
        <Leer icon={FileSearch} titel="Noch keine Anfragen" text="Sobald ÖkoInvest Sie um ein Angebot bittet, erscheint die Anfrage hier und Sie erhalten eine E-Mail. Bereits zugewiesene Meilensteine finden Sie unter „Projektentwicklung“." aktion={<Link href="/portal/entwicklung" className="text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zur Projektentwicklung</Link>} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {GRUPPEN.map((g) => {
              const liste = d.auftraege.filter((a) => g.status.includes(a.status));
              if (!liste.length) return null;
              return (
                <Karte key={g.id} titel={`${g.titel} (${liste.length})`} untertitel={g.text} innen="p-0">
                  <ul className="divide-y divide-ink-100">
                    {liste.map((a) => (
                      <li key={a.id}>
                        <Link href={`/portal/gutachter/${a.id}`} className="group flex flex-col gap-2 px-5 py-4 hover:bg-ink-50/60 md:flex-row md:items-center md:px-6">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-ink-900">{a.titel}</p>
                            <p className="text-[12.5px] text-ink-500">{a.projekt?.titel} · {LAENDER[a.projekt?.land] || a.projekt?.land}{a.projekt?.meilenstein ? ` · ${a.projekt.meilenstein.titel}` : ""}</p>
                            <p className="text-[12.5px] text-ink-600">{a.status === "angefragt" ? `Angebotsfrist ${datum(a.angebotsfrist)}` : a.liefertermin ? `Liefertermin ${datum(a.liefertermin)}` : ""}{a.angebot ? ` · ${eur(a.angebot.summeNetto)} netto` : ""}{a.rechnungsstand.offenBrutto > 0 ? ` · offen ${eur(a.rechnungsstand.offenBrutto)}` : ""}</p>
                          </div>
                          <span className="flex flex-wrap items-center gap-2">
                            {a.ueberfaellig && <Badge className="bg-red-50 text-red-800 ring-red-200"><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />überfällig</Badge>}
                            <Badge ton={a.statusTon}>{a.statusLabel}</Badge>
                            <ArrowRight aria-hidden="true" className="hidden h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5 md:block" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Karte>
              );
            })}
          </div>
          <div className="space-y-6">
            <Karte titel="Fristen & Termine" untertitel="nächste 14 Tage und Überfälliges"><FristenListe fristen={d.fristen} link={(f) => `/portal/gutachter/${f.auftragId}`} /></Karte>
            <Karte titel="So läuft ein Auftrag">
              <ol className="list-decimal space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-ink-700">
                <li>Angebot mit Honorar, Liefertermin und Zahlungsbedingungen abgeben.</li>
                <li>Nach der Annahme durch die Projektleitung den Auftrag bestätigen – dann sind die freigegebenen Projektunterlagen und Pläne sichtbar.</li>
                <li>Termine abstimmen, Zwischenstände melden, Rückfragen stellen.</li>
                <li>Lieferung hochladen (Entwurf bzw. Endfassung) – Prüfung, ggf. Nachbesserung, Freigabe.</li>
                <li>Nach der Abnahme die Schlussrechnung einreichen; den Zahlungsstatus sehen Sie hier.</li>
              </ol>
            </Karte>
          </div>
        </div>
      )}
    </>
  );
}

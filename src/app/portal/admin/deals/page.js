import { FileSpreadsheet } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import Link from "next/link";
import { Coins, HandCoins, Receipt } from "lucide-react";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import { Karte, Kennzahl, Leer, SeitenKopf, StatusBadge } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { datum, eur, mwp, prozent } from "@/lib/plattform/format";
import { PROVISION } from "@/lib/invest/markt";

export const metadata = { title: "Deals & Provisionen" };

export default async function AdminDeals() {
  const n = await portalNutzer({ admin: true });
  const b = backend();
  const [provisionen, projekte] = await Promise.all([b.provisionen(n), b.projekte(n, { alle: true, status: "reserviert" })]);
  const summe = (st) => provisionen.filter((p) => st.includes(p.status)).reduce((s, p) => s + p.betrag, 0);

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Deals & Provisionen" text={`Provisionen werden beim Statuswechsel „Verkauft“ automatisch berechnet (${PROVISION.verkaeufer.text}).`} aktionen={<DateiLink href="/api/admin/export/provisionen" icon={FileSpreadsheet}>CSV-Export</DateiLink>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Kennzahl label="Offen (noch keine Rechnung)" wert={eur(summe(["offen"]))} icon={Coins} />
        <Kennzahl label="In Rechnung" wert={eur(summe(["in_rechnung"]))} icon={Receipt} />
        <Kennzahl label="Bezahlt" wert={eur(summe(["bezahlt"]))} icon={HandCoins} ton="dunkel" />
      </div>

      <Karte titel="Provisionen">
        {provisionen.length ? (
          <ul className="divide-y divide-ink-100">
            {provisionen.map((pv) => (
              <li key={pv.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/portal/projekte/${pv.projektId}`} className="font-semibold text-ink-900 hover:text-ov-700">{pv.projekt?.titel}</Link>
                    <StatusBadge art="provision" status={pv.status} />
                  </div>
                  <p className="mt-1 text-[13.5px] text-ink-600">
                    Kaufpreis {eur(pv.kaufpreis)} × {prozent(pv.satz, 1)} = <span className="ov-num font-bold text-ink-900">{eur(pv.betrag)}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">
                    {mwp(pv.projekt?.mwp)} · Anbieter: {pv.anbieter?.firma || pv.anbieter?.email} · Käufer: {pv.investor?.firma || pv.investor?.email} · {datum(pv.erstelltAm)}
                  </p>
                </div>
                <StatusAktionen art="provision" id={pv.id} status={pv.status} als="admin" leerText="Abgeschlossen." />
              </li>
            ))}
          </ul>
        ) : (
          <Leer icon={Coins} titel="Noch keine Provisionen" text="Sobald ein Projekt als verkauft markiert wird, erscheint die Provision hier." />
        )}
      </Karte>

      <Karte titel="Reservierte Projekte (in Verhandlung)">
        {projekte.length ? (
          <ul className="space-y-3">
            {projekte.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/portal/projekte/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                <span className="text-[13px] text-ink-500">Provisionssatz {p.provisionSatz != null ? prozent(p.provisionSatz, 1) : "–"} · Verkauf in der Projektansicht abschließen</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-500">Keine reservierten Projekte.</p>
        )}
      </Karte>
    </div>
  );
}

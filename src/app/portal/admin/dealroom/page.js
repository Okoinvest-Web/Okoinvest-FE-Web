import Link from "next/link";
import { Clock, Gavel, LockOpen, MessageCircleQuestion, ScrollText } from "lucide-react";
import { Badge, Karte, Kennzahl, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import QaBereich from "@/components/Portal/Dealroom/QaBereich";
import Countdown from "@/components/Portal/Dealroom/Countdown";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { dealroom } from "@/lib/plattform/backend/dealroom";
import { RUNDEN_ARTEN, VERFAHREN_STATUS } from "@/lib/plattform/dealroom";
import { eur } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Deal-Room – Moderation & Bieterverfahren" };

export default async function AdminDealroom() {
  const n = await portalNutzer({ admin: true });
  const u = await dealroom().dealroomUebersicht(n);
  const k = u.kennzahlen;

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Deal-Room" text="Moderation der Fragen und Antworten (Anonymisierung, Fristen), laufende Bieterverfahren und Zugriffe – projektübergreifend." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Zu moderieren" wert={fmt(k.moderation)} hinweis={`${fmt(k.fragenGesamt)} Fragen insgesamt`} icon={MessageCircleQuestion} ton={k.moderation ? "dunkel" : "hell"} />
        <Kennzahl label="Antwortfrist überschritten" wert={fmt(k.ueberfaellig)} hinweis="Fragen beim Anbieter" icon={Clock} />
        <Kennzahl label="Bieterverfahren" wert={fmt(u.verfahren.filter((v) => ["laufend", "auswertung"].includes(v.status)).length)} hinweis={`${u.verfahren.length} insgesamt`} icon={Gavel} />
        <Kennzahl label="Datenraum-Zugriffe (7 Tage)" wert={fmt(k.zugriffe7)} hinweis={`${k.kontaktfreigaben} Kontaktfreigaben`} icon={ScrollText} />
      </div>

      <Karte titel="Bieterverfahren" innen="px-5 pb-2 md:px-6">
        {u.verfahren.length ? (
          <Tabelle kopf={["Projekt", "Status", "Runde", "Frist", "Gebote", "Bestes Gebot"]}>
            {u.verfahren.map((v) => (
              <tr key={v.id}>
                <td className={zelle}><Link href={`/portal/dealroom/${v.projektId}?tab=bieter`} className="font-semibold text-ink-900 hover:text-ov-700">{v.projektTitel}</Link></td>
                <td className={zelle}><Badge ton={VERFAHREN_STATUS[v.status]?.ton}>{VERFAHREN_STATUS[v.status]?.label}</Badge></td>
                <td className={zelle}>{v.runde.nr} · {RUNDEN_ARTEN[v.runde.art]?.kurz}</td>
                <td className={zelle}>{["laufend", "auswertung"].includes(v.status) ? <Countdown frist={v.runde.frist} label="Frist" /> : "–"}</td>
                <td className={`${zelle} ov-num`}>{v.gebote} / {v.teilnehmer}</td>
                <td className={`${zelle} ov-num font-semibold`}>{v.bester ? eur(v.bester) : "–"}</td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <p className="py-4 text-[14px] text-ink-500">Noch keine Bieterverfahren. Starten Sie eines im Deal-Room eines veröffentlichten Projekts.</p>
        )}
      </Karte>

      <section>
        <h2 className="mb-3 font-display text-[19px] font-bold text-ink-900">Moderation</h2>
        <QaBereich projektId="" rolle="admin" fragen={u.moderation} />
      </section>

      {u.beimAnbieter.length > 0 && (
        <Karte titel="Beim Anbieter offen" untertitel="Freigegebene Fragen, Antwort ausstehend">
          <ul className="divide-y divide-ink-100">
            {u.beimAnbieter.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/portal/dealroom/${f.projektId}?tab=qa`} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800">{f.projektTitel}</Link>
                  <p className="line-clamp-1 text-[14px] text-ink-800">{f.text}</p>
                </div>
                <Badge ton="info">{f.kategorieLabel}</Badge>
                {f.ueberfaellig ? <Badge ton="warn">Frist überschritten</Badge> : <Badge><LockOpen aria-hidden="true" className="h-3.5 w-3.5" /> {f.von?.pseudonym}</Badge>}
              </li>
            ))}
          </ul>
        </Karte>
      )}
    </div>
  );
}

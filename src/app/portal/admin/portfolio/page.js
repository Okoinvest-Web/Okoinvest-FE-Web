// /portal/admin/portfolio – Investoren-Portfolio: Positionen nach Closing und Co-Development, offene Kapitalabrufe,
// Wiederverkaufsanfragen, Covenant-Warnungen, Fristenlauf, neue Position (Bereich „portfolio“).
import Link from "next/link";
import { BriefcaseBusiness, HandCoins, Store, TriangleAlert } from "lucide-react";
import { Badge, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { Ampel, datum, dscrText, eur, pct } from "@/components/Portal/Portfolio/teile";
import { FristenLauf, PositionAnlegen } from "@/components/Portal/Portfolio/BackofficeFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const metadata = { title: "Investoren-Portfolio" };

export default async function PortfolioBackoffice() {
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => portfolioBackend().pfUebersicht(n));
  const auswahl = d.schreiben ? await laden(() => portfolioBackend().pfAuswahl(n)) : null;
  const k = d.kennzahlen;
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Transaktion & Buchhaltung" titel="Investoren-Portfolio" text="Nach dem Closing: Übergabe, Monatserträge, Covenants, Ausschüttungen und Berichte je Position – Co-Development mit Kapitalzusage und Abrufen – und Wiederverkauf über die Börse." aktionen={d.schreiben && <FristenLauf />} />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={BriefcaseBusiness} label="Aktive Positionen" wert={String(k.positionen)} hinweis={k.uebernahme ? `${k.uebernahme} in Übernahme` : "alle übernommen"} />
        <Kennzahl icon={HandCoins} label="Offene Kapitalabrufe" wert={String(k.abrufeOffen)} hinweis={k.abrufeUeberfaellig ? `${k.abrufeUeberfaellig} überfällig` : "keine überfällig"} />
        <Kennzahl icon={TriangleAlert} label="Covenant-Warnungen" wert={String(k.covenantWarnungen)} hinweis="DSCR unter Lock-up bzw. Default" />
        <Kennzahl icon={Store} label="Ausschüttungen 12 Monate" wert={eur(k.ausgeschuettet12)} hinweis={`${d.wiederverkauf.length} Wiederverkaufsanfrage(n)`} />
      </section>

      {d.abrufe.length > 0 && (
        <Karte titel="Offene Kapitalabrufe" className="mb-6" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {d.abrufe.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/admin/portfolio/${a.positionId}`} className="font-semibold text-ink-900 hover:text-ov-700">{a.position} · Abruf Nr. {a.nummer}</Link>
                  <p className="text-[12.5px] text-ink-500">{eur(a.betrag)} · {a.zweck} · fällig {datum(a.faelligAm)}</p>
                </div>
                <div className="flex items-center gap-2">{a.verzugTage > 0 && <Badge ton="warn">{a.verzugTage} Tage überfällig</Badge>}<Badge ton={a.statusTon}>{a.statusLabel}</Badge></div>
              </li>
            ))}
          </ul>
        </Karte>
      )}

      <Karte titel="Positionen" innen="p-0" className="mb-6">
        {d.positionen.length ? (
          <Tabelle kopf={["Position", "Investor", "Status", "Kapital", "Ertrag 12 M", "DSCR"]}>
            {d.positionen.map((p) => (
              <tr key={p.id}>
                <td className={zelle}>
                  <Link href={`/portal/admin/portfolio/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                  <span className="block text-[12.5px] text-ink-500">{p.artLabel} · {p.landLabel}{p.anteilProzent < 100 ? ` · ${p.anteilProzent.toLocaleString("de-DE")} %` : ""}</span>
                </td>
                <td className={zelle}>{p.investor?.anzeige}</td>
                <td className={zelle}><Badge ton={p.statusTon}>{p.statusLabel}</Badge></td>
                <td className={`${zelle} ov-num`}>{p.art === "codev" ? `${eur(p.kennzahlen.zusage.bezahlt, p.land)} / ${eur(p.zusage, p.land)}` : eur(p.kennzahlen.paidIn, p.land)}</td>
                <td className={zelle}>{p.ertragAbw12 !== null ? <span className="flex items-center gap-2"><span className="ov-num">{pct(p.ertragAbw12)}</span><Ampel wert={p.ertragAmpel} /></span> : "–"}</td>
                <td className={zelle}>{p.dscr !== null ? <span className="flex items-center gap-2"><span className="ov-num">{dscrText(p.dscr)}</span><Ampel wert={p.covenantAmpel} /></span> : "–"}</td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <Leer icon={BriefcaseBusiness} titel="Noch keine Positionen" text="Vollzogene Closings werden automatisch übernommen; Co-Development-Beteiligungen legen Sie unten an." className="m-5" />
        )}
      </Karte>

      {auswahl && (
        <Karte titel="Position anlegen" untertitel="Co-Development-Beteiligung oder Kauf außerhalb der Plattform (z. B. Bestandsübernahme)">
          <PositionAnlegen auswahl={auswahl} />
        </Karte>
      )}
    </>
  );
}

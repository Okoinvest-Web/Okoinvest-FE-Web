// /portal/portfolio – Investor: gekaufte Anlagen und Projekte, Co-Development-Beteiligungen, Kennzahlen, Warnungen
import Link from "next/link";
import { BriefcaseBusiness, Coins, HandCoins, TriangleAlert } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { Ampel, dscrText, eur, datum, pct } from "@/components/Portal/Portfolio/teile";
import { PositionLeer } from "@/components/Portal/Portfolio/PositionAnsicht";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const metadata = { title: "Portfolio" };

export default async function PortfolioSeite() {
  const n = await portalNutzer({ rollen: ["investor"] });
  const { positionen, kennzahlen: k } = await laden(() => portfolioBackend().pfMeine(n));
  return (
    <>
      <SeitenKopf eyebrow="Mein Portal" titel="Portfolio" text="Ihre Anlagen und Beteiligungen nach dem Kauf: Ertrag Soll/Ist, Ausschüttungen, Kapitalabrufe, Covenants, Berichte und Steuerunterlagen – und der Weg zurück in die Börse." />
      {positionen.length ? (
        <>
          <section aria-label="Kennzahlen Portfolio" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kennzahl ton="dunkel" icon={BriefcaseBusiness} label="Aktive Positionen" wert={String(k.anzahl)} hinweis={`${k.mwp.toLocaleString("de-DE")} MWp anteilig`} />
            <Kennzahl icon={Coins} label="Eingesetztes Kapital" wert={eur(k.paidIn)} hinweis={k.offeneZusage ? `offene Zusagen ${eur(k.offeneZusage)}` : "Kaufpreisanteile und bezahlte Abrufe"} />
            <Kennzahl icon={HandCoins} label="Ausschüttungen 12 Monate" wert={eur(k.ausgeschuettet12)} hinweis={`gesamt ${eur(k.ausgeschuettet)}`} />
            <Kennzahl icon={TriangleAlert} label="Offene Kapitalabrufe" wert={eur(k.offenerAbrufBetrag)} hinweis={k.warnungen ? `${k.warnungen} Position(en) mit Hinweis` : "keine Warnungen"} />
          </section>
          <Karte titel="Ihre Positionen" innen="p-0">
            <Tabelle kopf={["Position", "Status", "Kapital", "Ausschüttungen", "Ertrag 12 M", "DSCR", ""]}>
              {positionen.map((p) => (
                <tr key={p.id}>
                  <td className={zelle}>
                    <Link href={`/portal/portfolio/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                    <span className="block text-[12.5px] text-ink-500">{p.artLabel} · {p.mwp ? `${p.mwp.toLocaleString("de-DE")} MWp · ` : ""}{p.landLabel}{p.anteilProzent < 100 ? ` · Anteil ${p.anteilProzent.toLocaleString("de-DE")} %` : ""}</span>
                  </td>
                  <td className={zelle}><Badge ton={p.statusTon}>{p.statusLabel}</Badge></td>
                  <td className={`${zelle} ov-num`}>{p.art === "codev" ? <>{eur(p.kennzahlen.zusage.bezahlt, p.land)}<span className="block text-[12px] text-ink-500">von {eur(p.zusage, p.land)} Zusage</span></> : eur(p.kennzahlen.paidIn, p.land)}</td>
                  <td className={`${zelle} ov-num`}>{eur(p.kennzahlen.ausgeschuettet, p.land)}{p.kennzahlen.dpi !== null && <span className="block text-[12px] text-ink-500">DPI {dscrText(p.kennzahlen.dpi)}</span>}</td>
                  <td className={zelle}>{p.ertragAbw12 !== null ? <span className="flex items-center gap-2"><span className="ov-num">{pct(p.ertragAbw12)}</span><Ampel wert={p.ertragAmpel} /></span> : <span className="text-ink-400">–</span>}</td>
                  <td className={zelle}>{p.dscr !== null ? <span className="flex items-center gap-2"><span className="ov-num">{dscrText(p.dscr)}</span><Ampel wert={p.covenantAmpel} /></span> : <span className="text-ink-400">–</span>}</td>
                  <td className={zelle}>{p.offeneAbrufe > 0 && <Badge ton="warn">{p.ueberfaellig ? "Abruf überfällig" : `Abruf fällig ${datum(p.naechsteFaelligkeit)}`}</Badge>}</td>
                </tr>
              ))}
            </Tabelle>
          </Karte>
          <Hinweis ton="neutral" className="mt-6">Kennzahlen aus den im Portal erfassten Werten (Monatserträge der Betriebsführung, gebuchte Ausschüttungen und Einzahlungen). Verbindlich sind Jahresabschluss und Bescheinigungen der Projektgesellschaft – keine Anlage- oder Steuerberatung.</Hinweis>
        </>
      ) : (
        <PositionLeer />
      )}
    </>
  );
}

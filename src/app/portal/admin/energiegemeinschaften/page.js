// /portal/admin/energiegemeinschaften – Backoffice (Bereich „genossenschaft“): Energiegemeinschaften (AT EEG/BEG, DE Energy
// Sharing, CH LEG/ZEV), Teilnehmer mit Anmeldung beim Netzbetreiber, Monatsläufe mit Abrechnung je Teilnehmer.

import Link from "next/link";
import { ArrowRight, Info, Receipt, Users, Zap } from "lucide-react";
import { Badge, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { EgStammdaten, Monatslauf, TeilnahmeAktionen } from "@/components/Portal/Mitglied/EgAdmin";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { GEMEINSCHAFT_STATUS, TEILNAHME_STATUS } from "@/lib/plattform/mitglied/gemeinschaft";
import { datum, eur } from "@/lib/plattform/format";

export const metadata = { title: "Energiegemeinschaften" };
const kwh = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 0 })} kWh`;

export default async function EnergiegemeinschaftenAdmin() {
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => mitgliedBackend().boEg(n));
  const s = d.darfSchreiben;
  const v = new Date(`${d.heute.slice(0, 7)}-15T12:00:00Z`);
  v.setUTCMonth(v.getUTCMonth() - 1);
  const vormonat = v.toISOString().slice(0, 7);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Energiegemeinschaften" text="Teilnehmer beim Netzbetreiber anmelden, Teilnahme aktivieren und monatlich abrechnen. Die Viertelstunden-Zuordnung liefert in Österreich der Netzbetreiber über EDA, in Deutschland und der Schweiz der Messstellenbetreiber." aktionen={<Link href="/portal/admin/genossenschaft" className="text-[14px] font-semibold text-ov-700 hover:text-ov-800">Genossenschaft</Link>} />
      <Hinweis ton="info" icon={Info} titel="Neues Modul Energiegemeinschaften (ElWG)">
        Diese Seite ist der bisherige Prototyp und bleibt bis zur Migration lesbar. Österreichische Gemeinschaften (EEG, BEG, GEA) betreuen Sie im neuen Modul mit Stammdaten, EDA, Energiedaten, Abrechnung und Gründung; Formen für Deutschland und die Schweiz bleiben hier.{" "}
        <Link href="/portal/admin/eg" className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">Zum neuen Modul<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </Hinweis>
      {d.gemeinschaften.map((g) => (
        <section key={g.id} aria-label={g.name} className="space-y-6">
          <Karte titel={<span className="inline-flex flex-wrap items-center gap-2">{g.name} <Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge></span>} untertitel={`${g.formLabel} · ${g.netzbetreiber} · ${g.rabatt?.label || ""}`} aktion={<Zap aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            {s ? <Klappe titel="Stammdaten bearbeiten"><EgStammdaten eg={g} /></Klappe> : <p className="text-[14px] text-ink-500">Nur lesen.</p>}
          </Karte>
          <Karte titel="Teilnehmer" untertitel={`${g.teilnehmerAktiv} aktiv`} aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            {g.teilnehmer.length ? (
              <Tabelle kopf={["Teilnehmer", "Zählpunkt", "Rolle", "Status", "Aktionen"]}>
                {g.teilnehmer.map((t) => (
                  <tr key={t.id}>
                    <td className={zelle}><span className="font-semibold text-ink-900">{t.name}</span><span className="block text-[12.5px] text-ink-500">{t.email || "ohne Portalkonto"}</span></td>
                    <td className={`${zelle} break-all text-[13px]`}>{t.stamm?.zaehlpunkt || t.stamm?.maloId || "–"}</td>
                    <td className={zelle}>{t.stamm?.rolle === "beides" ? "Prosumer" : t.stamm?.rolle === "einspeisung" ? "Erzeuger" : "Verbraucher"}</td>
                    <td className={zelle}><Badge ton={TEILNAHME_STATUS[t.status]?.ton}>{t.statusLabel}</Badge>{t.ab && <span className="block text-[12.5px] text-ink-500">ab {datum(t.ab)}{t.bis ? ` bis ${datum(t.bis)}` : ""}</span>}</td>
                    <td className={zelle}>{s && <TeilnahmeAktionen t={t} heute={d.heute} />}</td>
                  </tr>
                ))}
              </Tabelle>
            ) : (
              <p className="text-[14px] text-ink-500">Noch keine Teilnehmer. Mitglieder treten im Portal unter „Energiegemeinschaft“ bei.</p>
            )}
          </Karte>
          <Karte titel="Monatsläufe" aktion={<Receipt aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            <div className="space-y-4">
              {g.laeufe.length > 0 && (
                <Tabelle kopf={["Monat", "Erzeugung", "Geteilt", "Überschuss", "Bezug", "Gutschriften", "Teilnehmer", "Grundlage"]}>
                  {g.laeufe.map((l) => (
                    <tr key={l.id}>
                      <td className={zelle}>{l.monat.split("-").reverse().join("/")}</td>
                      <td className={`${zelle} ov-num`}>{kwh(l.erzeugungKwh)}</td>
                      <td className={`${zelle} ov-num`}>{kwh(l.geteiltKwh)}</td>
                      <td className={`${zelle} ov-num`}>{kwh(l.ueberschussKwh)}</td>
                      <td className={`${zelle} ov-num`}>{eur(l.summe.bezugEur)}</td>
                      <td className={`${zelle} ov-num`}>{eur(l.summe.gutschriftEur)}</td>
                      <td className={`${zelle} ov-num`}>{l.anzahl}</td>
                      <td className={zelle}>{l.geschaetzt ? "teilweise geschätzt" : "Messwerte"}</td>
                    </tr>
                  ))}
                </Tabelle>
              )}
              {s && g.status === "aktiv" && <Klappe titel="Monat abrechnen"><Monatslauf eg={g} vormonat={vormonat} /></Klappe>}
              {g.status !== "aktiv" && <Hinweis ton="neutral">Abgerechnet wird, sobald die Gemeinschaft aktiv ist.</Hinweis>}
            </div>
          </Karte>
        </section>
      ))}
      {s && <Karte titel="Neue Gemeinschaft"><Klappe titel="Stammdaten erfassen"><EgStammdaten /></Klappe></Karte>}
    </div>
  );
}

// /portal/beteiligung – Mitgliederbereich: Überblick über Genossenschaft (Mitgliedschaft, Anteile, Ausschüttungen),
// Generalversammlungen und Energiegemeinschaft. Details auf den Unterseiten genossenschaft, versammlung/[id], energiegemeinschaft.
// Ehrlicher Stand: Genossenschaften „im Aufbau“ nehmen nur Vormerkungen an; Beitritt erst nach Eintragung.

import Link from "next/link";
import { ArrowRight, CalendarDays, Coins, HandHeart, Info, Users, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { EingehendeUebertragung } from "@/components/Portal/Mitglied/Portal";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { GENO_REGISTER, MITGLIED_STATUS } from "@/lib/plattform/mitglied/genossenschaft";
import { GV_STATUS } from "@/lib/plattform/mitglied/versammlung";
import { TEILNAHME_STATUS } from "@/lib/plattform/mitglied/gemeinschaft";
import { datum, eur } from "@/lib/plattform/format";
import { pfad } from "@/lib/land";

export const metadata = { title: "Genossenschaft & Gemeinschaft" };

const zeit = (s) => (s ? `${datum(s)}, ${s.slice(11, 16)} Uhr` : "–");

function Weiter({ href, children }) {
  return (
    <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
      {children} <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

export default async function BeteiligungSeite() {
  const n = await portalNutzer({ rollen: ["mitglied"] });
  const d = await laden(() => mitgliedBackend().mgUebersicht(n));
  const aktiv = d.mitgliedschaften.filter((m) => m.status === "aktiv");
  const guthaben = aktiv.reduce((s, m) => s + m.kennzahlen.guthabenEur, 0);
  const offen = d.mitgliedschaften.reduce((s, m) => s + (["zugelassen", "aktiv"].includes(m.status) ? m.kennzahlen.offenEur : 0), 0);
  const gvOffen = d.versammlungen.find((v) => v.darfAbstimmen) || d.versammlungen.find((v) => ["eingeladen", "abstimmung"].includes(v.status));
  const letzteAus = d.ausschuettungen.slice().sort((a, b) => b.geschaeftsjahr - a.geschaeftsjahr)[0];
  const tAktiv = d.eg.teilnahmen.find((t) => ["aktiv", "angemeldet", "beantragt"].includes(t.status));
  const letzteAbr = d.eg.abrechnungen[0];

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Mitglied"
        titel="Genossenschaft & Energiegemeinschaft"
        text="Ihre Geschäftsanteile, Generalversammlungen mit Online-Abstimmung und der Strom aus der Nachbarschaft – an einem Ort."
        aktionen={<Button href={pfad("/genossenschaft")} size="sm" variant="ghost" icon={Info}>Mehr zur Genossenschaft</Button>}
      />

      {d.eingehend.map((u) => (
        <Hinweis key={u.id} ton="warn" titel="Übertragung von Geschäftsanteilen">
          <EingehendeUebertragung u={u} />
        </Hinweis>
      ))}
      {gvOffen?.darfAbstimmen && (
        <Hinweis ton="info" icon={CalendarDays} titel={`Abstimmung offen: ${gvOffen.titel}`}>
          Sie können bis {zeit(gvOffen.abstimmungBis)} online abstimmen. <Link className="font-semibold underline" href={`/portal/beteiligung/versammlung/${gvOffen.id}`}>Zur Abstimmung</Link>
        </Hinweis>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kennzahl icon={HandHeart} label="Geschäftsanteile" wert={String(aktiv.reduce((s, m) => s + m.anteile, 0))} hinweis={aktiv.length ? `in ${aktiv.length} Genossenschaft${aktiv.length > 1 ? "en" : ""}` : "noch keine Mitgliedschaft"} href="/portal/beteiligung/genossenschaft" />
        <Kennzahl icon={Coins} label="Geschäftsguthaben" wert={eur(guthaben)} hinweis={offen ? `offen: ${eur(offen)}` : "vollständig eingezahlt"} href="/portal/beteiligung/genossenschaft" />
        <Kennzahl icon={Zap} label="Energiegemeinschaft" wert={tAktiv ? TEILNAHME_STATUS[tAktiv.status]?.label.split(" –")[0] : "–"} hinweis={letzteAbr ? `Saldo ${letzteAbr.monat.split("-").reverse().join("/")}: ${eur(letzteAbr.saldoEur)}` : "noch keine Abrechnung"} href="/portal/beteiligung/energiegemeinschaft" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Genossenschaft" untertitel="Beitritt, Anteile, Einzahlung, Kündigung und Übertragung" aktion={<HandHeart aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <ul className="divide-y divide-ink-100">
            {d.genos.map((g) => {
              const m = d.mitgliedschaften.find((x) => x.genoId === g.id && !["abgelehnt", "zurueckgezogen"].includes(x.status));
              return (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">{g.name}</span>
                    <span className="text-[13px] text-ink-500">{m ? `${m.anteile} Anteile · Guthaben ${eur(m.kennzahlen.guthabenEur)}${m.nr ? ` · Nr. ${m.nr}` : ""}` : GENO_REGISTER[g.registerStatus]?.text}</span>
                  </span>
                  <Badge ton={m ? MITGLIED_STATUS[m.status]?.ton : GENO_REGISTER[g.registerStatus]?.ton}>{m ? m.statusLabel : g.registerLabel}</Badge>
                </li>
              );
            })}
            {!d.genos.length && <li className="text-[14px] text-ink-500">Derzeit ist keine Genossenschaft auf der Plattform hinterlegt. Merken Sie sich unverbindlich vor – wir informieren Sie über die Gründung.</li>}
          </ul>
          <Weiter href="/portal/beteiligung/genossenschaft">{aktiv.length ? "Mitgliedschaft verwalten" : "Beitreten oder vormerken"}</Weiter>
        </Karte>

        <Karte titel="Generalversammlung" untertitel="Einladung, Unterlagen, Online-Abstimmung und Protokoll" aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {d.versammlungen.length ? (
            <ul className="divide-y divide-ink-100">
              {d.versammlungen.slice(0, 4).map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <Link href={`/portal/beteiligung/versammlung/${v.id}`} className="min-w-0 font-semibold text-ov-700 hover:text-ov-800">
                    {v.titel}
                    <span className="block text-[13px] font-normal text-ink-500">{zeit(v.datum)}</span>
                  </Link>
                  <Badge ton={v.eigeneStimme ? "ok" : GV_STATUS[v.status]?.ton}>{v.eigeneStimme ? "abgestimmt" : v.statusLabel}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Einladungen zu Generalversammlungen erhalten Sie hier und per E-Mail, sobald Sie Mitglied sind.</p>
          )}
        </Karte>

        <Karte titel="Energiegemeinschaft" untertitel="Teilnahme mit Zählpunkt bzw. Marktlokation" aktion={<Zap aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <p className="text-[14px] leading-relaxed text-ink-600">
            {tAktiv ? `${tAktiv.egName}: ${tAktiv.statusLabel}${tAktiv.ab ? ` seit ${datum(tAktiv.ab)}` : ""}.` : d.eg.stamm ? "Ihre Teilnahmedaten sind gespeichert – wählen Sie eine Gemeinschaft in Ihrem Netzgebiet." : "Österreich: EEG bzw. BEG mit Zählpunktnummer. Deutschland: Energy Sharing mit Marktlokations-ID. Schweiz: LEG bzw. ZEV."}
          </p>
          {letzteAbr && <p className="mt-2 text-[13.5px] text-ink-500">Letzte Abrechnung {letzteAbr.monat.split("-").reverse().join("/")}: {letzteAbr.bezugGemeinschaftKwh.toLocaleString("de-DE")} kWh geteilt, Saldo {eur(letzteAbr.saldoEur)}{letzteAbr.geschaetzt ? " (geschätzt)" : ""}.</p>}
          <Weiter href="/portal/beteiligung/energiegemeinschaft">{tAktiv ? "Abrechnungen ansehen" : "Teilnahme einrichten"}</Weiter>
        </Karte>

        <Karte titel="Ausschüttungen" untertitel="Dividende auf das Geschäftsguthaben bzw. Rückvergütung" aktion={<Coins aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {letzteAus ? (
            <p className="text-[14px] leading-relaxed text-ink-600">
              {letzteAus.artLabel} {letzteAus.geschaeftsjahr}: {eur(letzteAus.positionen.reduce((s, p) => s + p.nettoEur, 0))} netto{letzteAus.ausgezahltAm ? `, ausgezahlt am ${datum(letzteAus.ausgezahltAm)}` : ", Auszahlung folgt"}.
            </p>
          ) : (
            <p className="text-[14px] text-ink-500">Über Ausschüttungen entscheidet die Generalversammlung mit dem Jahresabschluss. Sie sind nicht garantiert.</p>
          )}
          <Weiter href="/portal/beteiligung/genossenschaft#ausschuettungen">Alle Mitteilungen</Weiter>
        </Karte>
      </div>
    </div>
  );
}

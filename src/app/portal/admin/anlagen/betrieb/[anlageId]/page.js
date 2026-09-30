import Link from "next/link";
import { Activity, FileDown, Gauge, Settings2, SunMedium, TrendingDown } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { SchwereBadge, Wert } from "@/components/Portal/Anlagen/teile";
import { AktionKnopf, AuftragAktionen, EinstrahlungFormular, FreigabeKnopf, NeuerAuftrag, NeuerPlan, NeuerVersicherungsfall, PlanBearbeiten, ProtokollFormular, VersicherungAktionen } from "@/components/Portal/Betrieb/Formulare";
import { ErgebnisBadge, FristBadge, PlausiBadge, SlaBadge, prozent } from "@/components/Portal/Betrieb/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";
import { kennzahlenMonate, plausibilisierung } from "@/lib/plattform/betrieb/auswertung";
import { datum, datumZeit } from "@/lib/plattform/format";
import { kwh } from "@/lib/plattform/anlagen";

export const metadata = { title: "Betriebsführung Anlage" };

const monatText = (m) => (m ? `${m.slice(5)}/${m.slice(0, 4)}` : "–");

export default async function BetriebAnlageSeite({ params }) {
  const { anlageId } = await params;
  const n = await portalNutzer({ admin: true });
  const b = await laden(() => betriebBackend().betriebAnlage(n, anlageId));
  const [k, p] = await Promise.all([laden(() => kennzahlenMonate(n, anlageId, { betrieb: b })), laden(() => plausibilisierung(n, anlageId))]);
  const a = b.anlage;
  const s = b.darfSchreiben;
  const g = k.gesamt;
  const jetzt = new Date();
  const letzteMonate = [1, 2, 3].map((i) => new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  const offenFreigabe = p.zeilen.filter((z) => !z.geprueft);

  return (
    <>
      <SeitenKopf
        eyebrow={`Betriebsführung · ${a.land}`}
        titel={a.name}
        text={`${a.id} · ${a.kwp ? `${a.kwp.toLocaleString("de-DE")} kWp` : "Speicher"} · Eigentümer ${a.eigentuemer || "–"} · Betriebsführer ${a.betriebsfuehrer || "–"}`}
        aktionen={
          <>
            <Button href={`/portal/anlagen/${a.id}`} size="sm" variant="secondary" icon={Activity}>Monitoring</Button>
            {s && <Button href={`/portal/admin/anlagen/${a.id}`} size="sm" variant="secondary" icon={Settings2}>Stammdaten & Zähler</Button>}
          </>
        }
      />
      <nav aria-label="Betriebsführung" className="mb-5 text-[13.5px]"><Link href="/portal/admin/anlagen/betrieb" className="font-semibold text-ov-700 hover:text-ov-800">← Betriebsführung (alle Anlagen)</Link></nav>

      <section aria-label="Kennzahlen 12 Monate" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" icon={SunMedium} label="Erzeugung 12 Monate" wert={kwh(g.istKwh)} hinweis={`Soll ${kwh(g.sollKwh)}`} />
        <Wert icon={Gauge} label="Ist / Soll" wert={prozent(g.performanceIndex, 0)} hinweis="Prognose ohne Wetterbereinigung" />
        <Wert icon={Gauge} label="Performance Ratio" wert={g.pr !== null ? prozent(g.pr) : "–"} hinweis={g.prMonate ? `aus ${g.prMonate} Monaten mit Einstrahlung` : "Einstrahlung erfassen"} />
        <Wert icon={Activity} label="Verfügbarkeit (energ.)" wert={prozent(g.verfuegbarkeit)} hinweis="1 − Ausfall / Soll" />
        <Wert icon={TrendingDown} label="Ertragsausfall" wert={kwh(g.ausfallKwh)} hinweis="aus Tickets" />
        <Wert icon={SunMedium} label="Spez. Ertrag" wert={g.spezErtragKwhKwp !== null ? `${Math.round(g.spezErtragKwhKwp).toLocaleString("de-DE")} kWh/kWp` : "–"} />
      </section>
      {k.messfehler && <Hinweis ton="warn" className="mb-6">Messdaten nicht verfügbar: {k.messfehler} – Kennzahlen nur aus Zählerwerten.</Hinweis>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Karte titel="Soll-Ist je Monat" untertitel="Ist: geprüfte Monatswerte des geeichten Erzeugungszählers, sonst Monitoring · PR nach IEC 61724-1 nur mit Einstrahlung" innen="p-5 md:p-6">
          <Tabelle kopf={["Monat", "Ist", "Quelle", "Soll", "Ist/Soll", "PR", "Verfügb."]}>
            {k.zeilen.map((r) => (
              <tr key={r.monat}>
                <td className={zelle}>{monatText(r.monat)}</td>
                <td className={`${zelle} ov-num`}>{kwh(r.istKwh)}</td>
                <td className={`${zelle} text-[12.5px] text-ink-500`}>{{ zaehler_geprueft: "Zähler (geprüft)", zaehler: "Zähler", monitoring: "Monitoring" }[r.istQuelle] || "–"}</td>
                <td className={`${zelle} ov-num`}>{r.laufend ? "läuft" : kwh(r.sollKwh)}</td>
                <td className={`${zelle} ov-num`}>{prozent(r.performanceIndex, 0)}</td>
                <td className={`${zelle} ov-num`}>{r.pr !== null ? <span className={r.prPlausibel === false ? "text-red-700" : ""}>{prozent(r.pr)}</span> : "–"}</td>
                <td className={`${zelle} ov-num`}>{prozent(r.verfuegbarkeit)}</td>
              </tr>
            ))}
          </Tabelle>
          {s && <div className="mt-4"><EinstrahlungFormular anlageId={a.id} /></div>}
        </Karte>

        <div className="min-w-0 space-y-6">
          <Karte titel="Berichte (PDF)" untertitel="Monats- und Jahresbericht: Soll-Ist, PR, Verfügbarkeit, Störungen mit Ursache, Wartung, Fristen">
            <div className="flex flex-wrap gap-2">
              {letzteMonate.map((m) => <a key={m} href={`/api/admin/anlagen/betrieb/bericht?anlageId=${a.id}&zeitraum=${m}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><FileDown aria-hidden="true" className="h-4 w-4" />Monat {monatText(m)}</a>)}
              {[jetzt.getUTCFullYear() - 1, jetzt.getUTCFullYear()].map((j) => <a key={j} href={`/api/admin/anlagen/betrieb/bericht?anlageId=${a.id}&zeitraum=${j}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy-900 px-3.5 text-[13px] font-semibold text-white hover:bg-navy-800"><FileDown aria-hidden="true" className="h-4 w-4" />Jahr {j}{j === jetzt.getUTCFullYear() ? " (laufend)" : ""}</a>)}
            </div>
          </Karte>
          <Karte titel="Fristen dieser Anlage" innen="p-0">
            {b.fristen.length ? (
              <ul className="divide-y divide-ink-100">{b.fristen.map((f, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 md:px-6"><span className="min-w-0 text-[14px] text-ink-900">{f.titel}</span><FristBadge frist={f} /></li>)}</ul>
            ) : <p className="p-5 text-[14px] text-ink-500">Keine Fristen in den nächsten Monaten.</p>}
          </Karte>
        </div>
      </div>

      <Karte titel="Zählerablesung plausibilisieren" untertitel="Vor der Contracting-Abrechnung: Eichfrist, Abgleich mit dem Monitoring (> 10 % prüfen, > 25 % auffällig), Prognose – freigegebene Werte gelten als geprüft" className="mt-6" innen="p-5 md:p-6">
        {p.messfehler && <Hinweis ton="warn" className="mb-4">Monitoring nicht verfügbar: {p.messfehler}</Hinweis>}
        {p.zeilen.length ? (
          <Tabelle kopf={["Monat", "Zähler / Register", "Stand", "Menge", "Monitoring", "Befund", s ? "Freigabe" : "Status"]}>
            {p.zeilen.slice(0, 40).map((z) => (
              <tr key={`${z.messpunktId}-${z.register}-${z.monat}`}>
                <td className={zelle}>{monatText(z.monat)}</td>
                <td className={zelle}><span className="font-semibold text-ink-900">{z.zaehlernummer}</span><span className="block text-[12px] text-ink-500">{z.register} {z.registerLabel}</span></td>
                <td className={`${zelle} ov-num`}>{Math.round(z.stand).toLocaleString("de-DE")}</td>
                <td className={`${zelle} ov-num`}>{z.menge !== null && z.menge !== undefined ? kwh(z.menge) : "–"}</td>
                <td className={`${zelle} ov-num`}>{z.monitoringKwh !== null ? kwh(z.monitoringKwh) : "–"}</td>
                <td className={zelle}><PlausiBadge stufe={z.befund.stufe} />{z.befund.befunde.filter((x) => x.stufe !== "hinweis").map((x, i) => <span key={i} className="mt-1 block max-w-[280px] text-[12px] leading-snug text-ink-600">{x.text}</span>)}</td>
                <td className={zelle}>{z.geprueft ? <Badge ton="ok">geprüft</Badge> : s ? <FreigabeKnopf anlageId={a.id} zeile={z} /> : <Badge>offen</Badge>}</td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <p className="text-[14px] text-ink-500">Keine Monatswerte – zuerst einen abrechnungsrelevanten (geeichten) Messpunkt anlegen.</p>
        )}
        <p className="mt-3 text-[12.5px] text-ink-500">{offenFreigabe.length} Werte noch nicht freigegeben. Die Contracting-Abrechnung (Finanzen) weist nicht geprüfte Werte als Hinweis aus; bei abgelaufener Eichfrist ist keine Freigabe möglich.</p>
      </Karte>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Karte titel="Wartungsplan" untertitel={`Wiederkehrende Wartung nach Landesvorlage ${a.land} – Fälligkeit erzeugt Aufgaben (Vorlauf)`} innen="p-0">
          {b.plaene.length ? (
            <ul className="divide-y divide-ink-100">
              {b.plaene.map((pl) => (
                <li key={pl.id} className="px-5 py-3.5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{pl.bezeichnung}</p>
                      <p className="text-[12.5px] text-ink-500">{pl.artLabel} · alle {pl.intervallMonate} Monate · {pl.norm || "–"}{pl.letzteDurchfuehrung ? ` · zuletzt ${datum(pl.letzteDurchfuehrung)}` : ""}</p>
                      {pl.hinweis && <p className="text-[12px] text-ink-500">{pl.hinweis}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {pl.aktiv ? <FristBadge frist={{ stufe: pl.stand.stufe === "ueberfaellig" ? "ueberfaellig" : pl.stand.stufe === "faellig" ? "dringend" : "bald", datum: pl.naechsteFaelligkeit, tage: pl.stand.tage }} /> : <Badge>inaktiv</Badge>}
                      {s && <PlanBearbeiten anlageId={a.id} plan={pl} />}
                    </div>
                  </div>
                  {s && pl.aktiv && ["faellig", "ueberfaellig"].includes(pl.stand.stufe) && <div className="mt-2"><NeuerAuftrag anlageId={a.id} planId={pl.id} knopf="Auftrag für diese Wartung" vorbelegung={{ beschreibung: pl.bezeichnung, dienstleister: pl.dienstleister || "" }} /></div>}
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-[14px] text-ink-500">Noch kein Wartungsplan.</p>}
          {s && (
            <div className="flex flex-wrap gap-3 border-t border-ink-100 px-5 py-4 md:px-6">
              {b.vorschlag.length > 0 && <AktionKnopf url={`/api/admin/anlagen/betrieb/anlage/${a.id}`} body={{ aktion: "vorschlag" }} label={`Standardplan ${a.land} übernehmen (${b.vorschlag.length})`} erfolg="Wartungsplan aus der Vorlage übernommen." variant="primary" />}
              <NeuerPlan anlageId={a.id} />
            </div>
          )}
        </Karte>

        <Karte titel="Prüfprotokolle" untertitel="E-Check / DGUV V3 (DE), ESV / OVE E 8101 (AT), NIV-Sicherheitsnachweis (CH), Thermografie IEC TS 62446-3" innen="p-0">
          {b.protokolle.length ? (
            <ul className="divide-y divide-ink-100">
              {b.protokolle.map((x) => (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3.5 md:px-6">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{x.artLabel} · {datum(x.datum)}</p>
                    <p className="text-[12.5px] text-ink-500">{x.pruefer}{x.firma ? `, ${x.firma}` : ""} · {x.befunde.length} Befund(e){x.stoerungId ? " · Störung angelegt" : ""}</p>
                    <a href={`/api/admin/anlagen/betrieb/protokolle/${x.id}`} className="text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Protokoll (PDF)</a>
                  </div>
                  <ErgebnisBadge ergebnis={x.ergebnis} />
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-[14px] text-ink-500">Noch keine Prüfprotokolle erfasst.</p>}
          {s && <div className="border-t border-ink-100 px-5 py-4 md:px-6"><ProtokollFormular anlageId={a.id} plaene={b.plaene.filter((x) => x.aktiv).map((x) => ({ id: x.id, bezeichnung: x.bezeichnung }))} /></div>}
        </Karte>

        <Karte titel="Störungen (Tickets)" innen="p-0">
          {b.tickets.length ? (
            <ul className="divide-y divide-ink-100">
              {b.tickets.slice(0, 15).map((t) => (
                <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 md:px-6">
                  <div className="min-w-0">
                    <Link href={`/portal/admin/anlagen/betrieb/stoerung/${t.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{t.titel}</Link>
                    <p className="text-[12.5px] text-ink-500">{datumZeit(t.erkanntAm)} · {t.status === "behoben" ? `behoben${t.ursacheLabel ? ` – ${t.ursacheLabel}` : " – Ursache fehlt"}` : t.status}{t.ertragsausfall ? ` · Ausfall ${kwh(t.ertragsausfall.ausfallKwh)}` : ""}</p>
                  </div>
                  <div className="flex gap-2"><SchwereBadge schwere={t.schwere} />{t.status !== "behoben" && <SlaBadge sla={t.sla} />}</div>
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-[14px] text-ink-500">Keine Störungen.</p>}
        </Karte>

        <Karte titel="Aufträge & Versicherung" innen="p-0">
          {b.auftraege.length ? (
            <ul className="divide-y divide-ink-100">
              {b.auftraege.slice(0, 15).map((x) => (
                <li key={x.id} className="px-5 py-3 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-semibold text-ink-900">{x.dienstleister || x.artLabel}</p><p className="text-[12.5px] text-ink-500">{x.beschreibung.slice(0, 120)}</p><a href={`/api/admin/anlagen/betrieb/auftraege/${x.id}`} className="text-[12.5px] font-semibold text-ov-700">Auftragsschreiben (PDF)</a></div>
                    <Badge ton={x.offen ? "info" : "neutral"}>{x.statusLabel}</Badge>
                  </div>
                  {s && x.offen && <AuftragAktionen auftrag={x} />}
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-[14px] text-ink-500">Keine Serviceaufträge.</p>}
          {b.versicherungen.length > 0 && (
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {b.versicherungen.map((f) => (
                <li key={f.id} className="px-5 py-3 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold text-ink-900">{f.versicherer} · {datum(f.schadentag)}</p><Badge ton={f.offen ? "warn" : "neutral"}>{f.statusLabel}</Badge></div>
                  {s && f.offen && <VersicherungAktionen fall={f} />}
                </li>
              ))}
            </ul>
          )}
          {s && <div className="flex flex-wrap gap-3 border-t border-ink-100 px-5 py-4 md:px-6"><NeuerAuftrag anlageId={a.id} /><NeuerVersicherungsfall anlageId={a.id} /></div>}
        </Karte>
      </div>
    </>
  );
}

// src/components/Portal/Portfolio/PositionAnsicht.js
//
// Detailansicht einer Portfolio-Position (Server-Komponente) – gemeinsam für Investor (/portal/portfolio/[id]) und
// Backoffice (/portal/admin/portfolio/[id]). Das Backoffice reicht seine Formulare über `bo` in die Abschnitte.

import Link from "next/link";
import { FileDown, FileText, HardHat, Receipt, Stamp } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, Kennzahl, Leer, Tabelle, zelle } from "@/components/Portal/ui";
import { Ampel, ErtragDiagramm, ZusageBalken, datum, dscrText, eur, monatLang, mwh, pct } from "./teile";
import { AbrufMelden, ProvisionAnnehmen, WiederverkaufAnfragen, WiederverkaufZurueck } from "./Aktionen";
import { PROVISION } from "@/lib/invest/markt";

const MS_STATUS = { erledigt: { label: "erledigt", ton: "ok" }, entfaellt: { label: "entfällt", ton: "neutral" }, in_arbeit: { label: "läuft", ton: "info" }, offen: { label: "geplant", ton: "neutral" } };
const DOK_ART = { jahresabschluss: "Jahresabschluss", steuer: "Steuerunterlage", bericht: "Bericht", vertrag: "Vertrag", gesellschafter: "Gesellschafterbeschluss", sonstiges: "Dokument" };

export default function PositionAnsicht({ p, basis = "/api/portal/portfolio", bo = {}, heute }) {
  const k = p.kennzahlen;
  const codev = p.art === "codev";
  const mitErtrag = !!p.stammdaten?.p50KwhJahr;
  return (
    <div className="space-y-6">
      <section aria-label="Kennzahlen der Position" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {codev ? (
          <Kennzahl ton="dunkel" label="Kapitalzusage" wert={eur(p.zusage, p.land)} hinweis={`abgerufen ${pct(k.zusage.quote, 0)}`} />
        ) : (
          <Kennzahl ton="dunkel" label="Eingesetztes Kapital" wert={eur(k.paidIn, p.land)} hinweis={`Kaufpreisanteil ${p.anteilProzent} %`} />
        )}
        <Kennzahl label="Ausschüttungen gesamt" wert={eur(k.ausgeschuettet, p.land)} hinweis={k.dpi !== null ? `DPI ${dscrText(k.dpi)}` : "noch keine"} />
        {codev ? (
          <Kennzahl label="Offene Abrufe" wert={eur(p.offenerAbrufBetrag, p.land)} hinweis={p.naechsteFaelligkeit ? `nächste Fälligkeit ${datum(p.naechsteFaelligkeit)}` : "keine offen"} />
        ) : (
          <Kennzahl label="Ausschüttungsrendite 12 Monate" wert={pct(k.cashRendite12)} hinweis={`${eur(k.ausgeschuettet12, p.land)} in 12 Monaten`} />
        )}
        {mitErtrag ? (
          <Kennzahl label="Ertrag 12 Monate vs. P50" wert={p.ertrag?.summe12 ? pct(p.ertrag.summe12.abw) : "–"} hinweis={p.covenant?.aktiv ? `DSCR ${dscrText(p.covenant.dscr)}` : p.ertrag?.spezifisch12 ? `${p.ertrag.spezifisch12.toLocaleString("de-DE")} kWh/kWp` : "Soll/Ist aus Monatswerten"} />
        ) : (
          <Kennzahl label="Fortschritt Entwicklung" wert={p.entwicklung ? `${p.entwicklung.fortschritt} %` : "–"} hinweis={p.entwicklung?.zielCod ? `COD-Ziel ${monatLang(p.entwicklung.zielCod)}` : "Meilensteine im Projekt"} />
        )}
      </section>

      {p.status === "uebernahme" && p.uebergabe && (
        <Hinweis ton="warn" icon={Stamp} titel="Übergabe läuft">
          {p.uebergabe.erledigt} von {p.uebergabe.gesamt} Übergabepunkten erledigt. Sobald alle Punkte abgehakt sind, wechselt die Position automatisch in den Betrieb.{" "}
          <Link href={p.uebergabe.link} className="font-semibold text-ov-700 hover:text-ov-800">Zum Closing-Raum</Link>
        </Hinweis>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {mitErtrag && (
            <Karte titel="Ertrag Soll/Ist" untertitel={p.ertrag?.bis ? `12 Monate bis ${monatLang(p.ertrag.bis)} · Soll = P50 × Monatsverteilung × Degradation` : "Noch keine Monatswerte"} aktion={<Ampel wert={p.ertrag?.ampel} />}>
              {p.ertrag?.monate?.some((m) => m.ist !== null) ? (
                <>
                  <ErtragDiagramm monate={p.ertrag.monate} />
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-4">
                    <Wert label="Soll 12 Monate" wert={mwh(p.ertrag.summe12?.soll)} />
                    <Wert label="Ist 12 Monate" wert={mwh(p.ertrag.summe12?.ist)} />
                    <Wert label="Abweichung" wert={pct(p.ertrag.summe12?.abw)} />
                    <Wert label="Erlöse (Ist)" wert={eur(p.ertrag.summe12?.erloes, p.land)} />
                  </div>
                </>
              ) : (
                <p className="text-[14px] text-ink-600">Die Betriebsführung meldet die Monatswerte nach Ablesung bzw. aus dem Datenlogger. Sobald Werte vorliegen, sehen Sie hier Soll und Ist.</p>
              )}
              {bo.ertrag}
            </Karte>
          )}

          {codev && (
            <Karte titel="Co-Development: Kapitalzusage und Meilensteine" untertitel={p.entwicklung ? `${p.entwicklung.titel} · Fortschritt ${p.entwicklung.fortschritt} %` : "Beteiligung an der Projektentwicklung"} aktion={p.entwicklung && <Link href={p.entwicklung.link} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800"><HardHat aria-hidden="true" className="h-4 w-4" />Projekt öffnen</Link>}>
              <ZusageBalken zusage={k.zusage} />
              {p.entwicklung?.meilensteine?.length ? (
                <ol className="mt-5 space-y-2.5">
                  {p.entwicklung.meilensteine.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                      <span className="min-w-0 text-ink-800">{m.titel}</span>
                      <span className="flex items-center gap-2 text-[12.5px] text-ink-500">{m.istEnde ? datum(m.istEnde) : m.sollEnde ? `Plan ${datum(m.sollEnde)}` : ""}<Badge ton={MS_STATUS[m.status]?.ton}>{MS_STATUS[m.status]?.label || m.status}</Badge></span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-[14px] text-ink-600">Die Meilensteine sehen Sie nach der Co-Development-Freigabe unter „Projektentwicklung“.</p>
              )}
            </Karte>
          )}

          {(codev || p.abrufe.length > 0 || bo.abrufe) && (
            <Karte titel="Kapitalabrufe" untertitel="Einzahlungen nach Beteiligungsvertrag – Frist mindestens 10 Tage" innen="p-0">
              {p.abrufe.length ? (
                <ul className="divide-y divide-ink-100">
                  {p.abrufe.map((a) => (
                    <li key={a.id} className="px-5 py-4 md:px-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">Nr. {a.nummer} · {eur(a.betrag, p.land)}</p>
                          <p className="text-[13px] text-ink-600">{a.zweck}{a.meilenstein ? ` · Meilenstein: ${a.meilenstein}` : ""}</p>
                          <p className="text-[12.5px] text-ink-500">Angekündigt {datum(a.angekuendigtAm)} · fällig {datum(a.faelligAm)}{a.bezahltAm ? ` · bezahlt ${datum(a.bezahltAm)}` : ""}{a.gemeldetAm && a.status === "gemeldet" ? ` · gemeldet ${datum(a.gemeldetAm)}` : ""}{a.referenz ? ` · Ref. ${a.referenz}` : ""}</p>
                          {a.status === "storniert" && a.grund && <p className="text-[12.5px] text-ink-500">Storniert: {a.grund}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {a.verzugTage > 0 && <Badge ton="warn">{a.verzugTage} Tage überfällig</Badge>}
                          <Badge ton={a.statusTon}>{a.statusLabel}</Badge>
                        </div>
                      </div>
                      {a.darfMelden && <AbrufMelden positionId={p.id} abrufId={a.id} />}
                      {bo.abrufZeile?.(a)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-[14px] text-ink-600 md:px-6">Noch keine Kapitalabrufe. Sie erhalten jeden Abruf mit Betrag, Zweck und Frist per Benachrichtigung.</p>
              )}
              {bo.abrufe && <div className="border-t border-ink-100 px-5 py-4 md:px-6">{bo.abrufe}</div>}
            </Karte>
          )}

          <Karte titel="Ausschüttungen" untertitel="Gewinnausschüttungen, Entnahmen, Zinsen und Tilgung aus der Projektgesellschaft" innen="p-0">
            {p.ausschuettungen.length ? (
              <Tabelle kopf={["Datum", "Art", "Periode", "Betrag", ""]}>
                {p.ausschuettungen.map((a) => (
                  <tr key={a.id} className={a.status === "storniert" ? "text-ink-400 line-through" : ""}>
                    <td className={zelle}>{datum(a.datum)}</td>
                    <td className={zelle}>{a.artLabel}{a.bankZustimmung ? <span className="block text-[12px] text-ink-500">mit Zustimmung der Bank</span> : null}</td>
                    <td className={zelle}>{a.periode}</td>
                    <td className={`${zelle} ov-num font-semibold`}>{eur(a.betrag, p.land)}</td>
                    <td className={zelle}>{bo.ausschuettungZeile?.(a)}</td>
                  </tr>
                ))}
              </Tabelle>
            ) : (
              <p className="px-5 py-4 text-[14px] text-ink-600 md:px-6">{codev ? "In der Entwicklungsphase gibt es in der Regel keine Ausschüttungen – Rückflüsse folgen beim Verkauf bzw. nach Inbetriebnahme." : "Noch keine Ausschüttungen gebucht."}</p>
            )}
            {p.ausschuettungen.find((a) => a.quellensteuer) && <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] text-ink-600 md:px-6">{p.ausschuettungen.find((a) => a.quellensteuer).quellensteuer.text}</p>}
            {bo.ausschuettungen && <div className="border-t border-ink-100 px-5 py-4 md:px-6">{bo.ausschuettungen}</div>}
          </Karte>
        </div>

        <div className="min-w-0 space-y-6">
          <Karte titel="Eckdaten">
            <Angaben
              spalten={1}
              items={[
                { label: "Art", wert: p.artLabel },
                { label: "Projektgesellschaft", wert: p.spvName || "–" },
                { label: "Ihr Anteil", wert: `${p.anteilProzent.toLocaleString("de-DE")} %` },
                { label: codev ? "Beteiligt seit" : "Erworben am", wert: datum(p.kaufdatum) },
                !codev && { label: "Kaufpreis (100 %)", wert: eur(p.kaufpreis, p.land) },
                { label: "Leistung", wert: p.mwp ? `${p.mwp.toLocaleString("de-DE")} MWp · ${p.typLabel}` : p.typLabel },
                { label: "Standort", wert: [p.bundesland, p.landLabel].filter(Boolean).join(", ") },
                p.inbetriebnahme && { label: "Inbetriebnahme", wert: monatLang(p.inbetriebnahme) },
                p.stammdaten?.verguetungCt && { label: "Vergütung / Erlös", wert: `${p.stammdaten.verguetungCt.toLocaleString("de-DE")} ct/kWh` },
              ].filter(Boolean)}
            />
            {bo.stammdaten}
          </Karte>

          {p.covenant?.aktiv && (
            <Karte titel="Finanzierung & Covenants" untertitel="DSCR aus Ist-Erlösen der letzten 12 Monate" aktion={<Ampel wert={p.covenant.ampel} label={p.covenant.ampel === "gelb" ? "Lock-up" : p.covenant.ampel === "rot" ? "Default-Grenze" : undefined} />}>
              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <Wert label="DSCR" wert={dscrText(p.covenant.dscr)} />
                <Wert label="Lock-up / Default" wert={`${dscrText(p.covenant.grenzen.lockup)} / ${dscrText(p.covenant.grenzen.default)}`} />
                <Wert label="CFADS p. a." wert={eur(p.covenant.cfads, p.land)} />
                <Wert label="Schuldendienst p. a." wert={eur(p.covenant.schuldendienstJahr, p.land)} />
              </div>
              <p className="mt-3 text-[13px] text-ink-600">{p.covenant.grund}{p.covenant.hochgerechnet ? " Hochgerechnet aus weniger als 12 Monatswerten." : ""}</p>
              {p.covenant.gesperrt && <Hinweis ton="warn" className="mt-3">Solange der DSCR unter der Lock-up-Grenze liegt, sind Ausschüttungen nach üblichen Kreditverträgen gesperrt – Ausnahmen nur mit Zustimmung der Bank.</Hinweis>}
            </Karte>
          )}

          <Karte titel="Berichte" untertitel="Quartals- und Jahresbericht als PDF (Ertrag, Covenants, Ausschüttungen, Kapitalabrufe)">
            {p.perioden.quartal.length || p.perioden.jahr.length ? (
              <div className="space-y-4">
                {p.perioden.quartal.length > 0 && (
                  <div>
                    <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Quartalsberichte</p>
                    <div className="flex flex-wrap gap-2">
                      {p.perioden.quartal.slice(0, 6).map((q) => (
                        <a key={q} href={`${basis}/${p.id}/bericht?art=quartal&periode=${q}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-[13px] font-semibold text-ink-800 ring-1 ring-ink-200 hover:ring-ov-300"><FileDown aria-hidden="true" className="h-3.5 w-3.5" />{q.replace("-", " ")}</a>
                      ))}
                    </div>
                  </div>
                )}
                {p.perioden.jahr.length > 0 && (
                  <div>
                    <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Jahresberichte (mit Steuerhinweisen)</p>
                    <div className="flex flex-wrap gap-2">
                      {p.perioden.jahr.map((j) => (
                        <a key={j} href={`${basis}/${p.id}/bericht?art=jahr&periode=${j}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-[13px] font-semibold text-ink-800 ring-1 ring-ink-200 hover:ring-ov-300"><FileDown aria-hidden="true" className="h-3.5 w-3.5" />{j}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-ink-600">Der erste Quartalsbericht steht nach Ablauf des ersten vollen Quartals bereit.</p>
            )}
          </Karte>

          <Karte titel="Dokumente" untertitel="Jahresabschlüsse, Steuerbescheinigungen, Verträge" innen="p-0">
            {p.dokumente.length ? (
              <ul className="divide-y divide-ink-100">
                {p.dokumente.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-[14px] md:px-6">
                    <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
                    <a href={d.link} className="min-w-0 break-all font-semibold text-ov-700 hover:text-ov-800">{d.name}</a>
                    <span className="text-[12px] text-ink-500">{DOK_ART[d.art] || "Dokument"} · {datum(d.am)}{!d.freigabe ? " · intern" : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-[14px] text-ink-600 md:px-6">Noch keine Dokumente bereitgestellt. Jahresabschluss und Steuerbescheinigung der Gesellschaft folgen nach Feststellung.</p>
            )}
            {bo.dokumente && <div className="border-t border-ink-100 px-5 py-4 md:px-6">{bo.dokumente}</div>}
          </Karte>

          <Karte titel="Steuerunterlagen" untertitel={`Hinweise für ${p.landLabel}`}>
            <ul className="list-disc space-y-2 pl-5 text-[13.5px] leading-relaxed text-ink-700">
              {p.steuer.punkte.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Für die Steuererklärung in der Regel nötig</p>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink-700">
              {p.steuer.unterlagen.map((t) => <li key={t} className="flex gap-2"><Receipt aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />{t}</li>)}
            </ul>
            <p className="mt-3 text-[12.5px] text-ink-500">{p.steuer.hinweis}</p>
          </Karte>

          {!codev && (
            <Karte titel="Wiederverkauf" untertitel="Position über die Projektbörse anbieten – vertraulich, mit NDA und Datenraum">
              {p.wiederverkauf && !p.wiederverkauf.zurueckgezogenAm && ["verkauf_angefragt", "verkauf_boerse"].includes(p.status) ? (
                <div className="space-y-3 text-[14px] text-ink-700">
                  <p>Angefragt am {datum(p.wiederverkauf.angefragtAm)}: {p.wiederverkauf.strukturLabel}, {p.wiederverkauf.anteilProzent} %, ab {monatLang(p.wiederverkauf.zeitpunkt)}{p.wiederverkauf.preisvorstellung ? `, Preisvorstellung ${eur(p.wiederverkauf.preisvorstellung, p.land)}` : ""}.</p>
                  {p.status === "verkauf_angefragt" && <p className="text-ink-600">ÖkoInvest prüft die Anfrage und bereitet das Angebot in der Projektbörse vor.</p>}
                  {p.wiederverkauf.boerse && <p>Börsen-Entwurf: <span className="font-semibold">{p.wiederverkauf.boerse.titel}</span> ({p.wiederverkauf.boerse.status})</p>}
                  {p.darf?.provision && <ProvisionAnnehmen positionId={p.id} text={PROVISION.verkaeufer.text} />}
                  {p.darf?.zurueckziehen && <WiederverkaufZurueck positionId={p.id} />}
                </div>
              ) : p.darf?.wiederverkauf ? (
                <WiederverkaufAnfragen positionId={p.id} anteilMax={p.anteilProzent} heuteMonat={heute.slice(0, 7)} />
              ) : (
                <p className="text-[14px] text-ink-600">{p.status === "verkauft" ? "Die Position wurde verkauft." : "Ein Wiederverkauf ist für Positionen im Bau oder in Betrieb möglich."}</p>
              )}
              {bo.wiederverkauf}
            </Karte>
          )}

          <Karte titel="Verlauf" innen="p-0">
            {p.verlauf.length ? (
              <ol className="max-h-[360px] divide-y divide-ink-100 overflow-y-auto">
                {[...p.verlauf].reverse().map((e, i) => (
                  <li key={i} className="px-5 py-3 text-[13.5px] md:px-6"><span className="block text-[12px] text-ink-500">{datum(e.am)}</span>{e.text}</li>
                ))}
              </ol>
            ) : (
              <p className="px-5 py-4 text-[14px] text-ink-600 md:px-6">Noch keine Einträge.</p>
            )}
          </Karte>
        </div>
      </div>
    </div>
  );
}

function Wert({ label, wert }) {
  return (
    <div className="min-w-0 rounded-2xl bg-ink-50 px-3.5 py-3">
      <p className="text-[12px] text-ink-500">{label}</p>
      <p className="ov-num mt-0.5 font-display text-[16px] font-bold text-ink-900">{wert}</p>
    </div>
  );
}

export function PositionLeer() {
  return <Leer icon={Stamp} titel="Noch keine Positionen" text="Nach dem Closing übernimmt ÖkoInvest gekaufte Anlagen und Projekte automatisch in Ihr Portfolio. Co-Development-Beteiligungen erscheinen hier nach Unterzeichnung." />;
}

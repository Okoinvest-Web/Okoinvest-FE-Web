import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Gauge, Handshake, Landmark, Package, Scale, ScrollText, ShieldCheck } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import Reiter from "@/components/Portal/Anlagen/Reiter";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { AmpelBadge, eur, teur, pct, fx, datumDe, HINWEIS_BERATUNG } from "@/components/Portal/Finanzierung/teile";
import { AnfrageKnoepfe, AnfrageSenden, CpSchalter, DokumentHochladen, Entscheidung, GeschaeftsmodellRechner, KnopfAktion, KreditvertragFormular, ModellBearbeiten, PaketFreigabe, TermsheetFormular } from "@/components/Portal/Finanzierung/Aktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { ANFRAGE_STATUS, FALL_STATUS, REFERENZZINSEN, SICHERHEITEN } from "@/lib/plattform/finanzierung/bank";
import { ERLOES_MODELLE, TILGUNG_PROFILE, TYPEN_FZ } from "@/lib/plattform/finanzierung/kern";

export const metadata = { title: "Finanzierungsfall" };

const REITER = [
  { id: "uebersicht", label: "Financial Model", icon: Gauge },
  { id: "banken", label: "Banken & Term Sheets", icon: Handshake },
  { id: "paket", label: "Bankenpaket", icon: Package },
  { id: "vertrag", label: "Kreditvertrag & CPs", icon: ScrollText },
  { id: "covenants", label: "Covenants & Reporting", icon: ShieldCheck },
  { id: "geschaeftsmodell", label: "Geschäftsmodell", icon: Scale },
];

const tsZins = (t) => (t.zinsArt === "fix" ? `${String(t.zinsPct).replace(".", ",")} % fest` : `${REFERENZZINSEN[t.zinsArt]} + ${String(t.margePct).replace(".", ",")} %`);

export default async function FinanzierungsFallSeite({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = (await searchParams) || {};
  const tab = REITER.some((r) => r.id === sp.tab) ? sp.tab : "uebersicht";
  const f = await laden(() => finanzierungBackend().fzFall(n, id));
  const e = f.eingaben;
  const darf = f.darfSchreiben;
  const basis = `/portal/admin/finanzierung/${f.id}`;
  const tabs = REITER.map((r) => ({ ...r, zaehler: r.id === "covenants" && ["gelb", "rot"].includes(f.covenant?.ampel?.id) ? 1 : 0 }));

  let inhalt = null;
  if (tab === "uebersicht") {
    const p = f.modell.projekt;
    inhalt = (
      <div className="space-y-6">
        <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Wert ton="dunkel" label="Gesamtinvestition" wert={teur(e.capex)} hinweis={`${Math.round(p.capexProKwp)} €/kWp`} />
          <Wert label="Finanzierungsbedarf" wert={teur(f.betragWunsch)} />
          <Wert label="Projekt-IRR (P50)" wert={pct(p.projektIrr)} hinweis={`P90 ${pct(p.projektIrrP90)}`} />
          <Wert label="NPV (WACC)" wert={teur(p.npv)} />
          <Wert label="LCOE" wert={`${(p.lcoeCt ?? 0).toFixed(2).replace(".", ",")} ct`} />
          <Wert label="CFADS Jahr 1" wert={teur(p.cfadsJahr1)} />
        </section>
        <Karte titel="Finanzierungsstruktur" untertitel="Varianten auf Basis des Financial Model – Bemessung auf die Mindest-DSCR" innen="p-0" aktion={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/admin/finanzierung/${f.id}/modell`} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50"><FileText aria-hidden="true" className="h-4 w-4" />Financial Model PDF</a>
            <a href={`/api/admin/finanzierung/${f.id}/modell?format=csv`} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50"><FileSpreadsheet aria-hidden="true" className="h-4 w-4" />CSV</a>
            <a href={`/api/admin/finanzierung/${f.id}/modell?art=steckbrief`} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50"><Download aria-hidden="true" className="h-4 w-4" />Steckbrief</a>
          </div>
        }>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-5 py-2.5">Variante</th><th className="px-3 py-2.5 text-right">EK-Bedarf</th><th className="px-3 py-2.5 text-right">Fremdkapital</th><th className="px-3 py-2.5 text-right">DSCR min P50/P90</th><th className="px-3 py-2.5 text-right">LLCR</th><th className="px-3 py-2.5 text-right">EK-IRR</th><th className="px-5 py-2.5 text-right">Fin.-Kosten</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {f.modell.varianten.map((v) => (
                  <tr key={v.art}><th scope="row" className="px-5 py-2.5 text-left font-semibold text-ink-900">{v.kurz}{v.fkBegrenzt && <Badge ton="warn" className="ml-2">gekürzt</Badge>}</th><td className="ov-num px-3 py-2.5 text-right">{teur(v.kapitalbedarfEk)}</td><td className="ov-num px-3 py-2.5 text-right">{teur(v.fremdkapital)}</td><td className="ov-num px-3 py-2.5 text-right">{v.dscrMin != null ? `${fx(v.dscrMin)} / ${fx(v.dscrMinP90)}` : "–"}</td><td className="ov-num px-3 py-2.5 text-right">{fx(v.llcr)}</td><td className="ov-num px-3 py-2.5 text-right">{pct(v.ekIrr)}</td><td className="ov-num px-5 py-2.5 text-right">{teur(v.gesamtkostenFinanzierung)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Karte>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Karte titel="Annahmen des Financial Model" untertitel={`${ERLOES_MODELLE[e.modell]} · ${TYPEN_FZ[e.typ]} · ${e.land}`}>
            {darf ? <ModellBearbeiten fallId={f.id} eingaben={e} /> : <Angaben items={[{ label: "Ertrag P50/P90", wert: `${e.p50} / ${e.p90} kWh/kWp` }, { label: "Preis", wert: `${e.preisCt} ct/kWh` }]} />}
          </Karte>
          <Karte titel="Verlauf" innen="p-0">
            <ul className="max-h-[420px] divide-y divide-ink-100 overflow-y-auto">
              {f.verlauf.map((x, i) => <li key={i} className="px-5 py-2.5 text-[13px]"><span className="text-ink-500">{new Date(x.am).toLocaleString("de-DE")} · {x.von}</span><br />{x.text}</li>)}
            </ul>
          </Karte>
        </div>
      </div>
    );
  } else if (tab === "banken") {
    const v = f.vergleich;
    inhalt = (
      <div className="space-y-6">
        <Karte titel="Anfragen" innen="p-0">
          {f.anfragen.length === 0 ? <p className="px-6 py-5 text-[14px] text-ink-500">Noch keine Bank angefragt.</p> : (
            <ul className="divide-y divide-ink-100">
              {f.anfragen.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 px-5 py-3.5 md:flex-row md:items-center md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-ink-900">{a.bank}</p>
                    <p className="text-[12.5px] text-ink-500">{a.ansprechpartner} · gesendet {datumDe(a.gesendetAm)} · Frist {datumDe(a.frist)}{a.termsheet ? ` · Term Sheet ${datumDe(a.termsheet.am)} (${a.termsheet.von === "bank" ? "über Portal" : "erfasst"})` : ""}</p>
                    {a.verlauf.filter((x) => /Rückfrage|Absage/.test(x.text)).slice(-1).map((x, i) => <p key={i} className="mt-1 text-[12.5px] text-ink-700">{x.text}</p>)}
                  </div>
                  <Badge ton={ANFRAGE_STATUS[a.status]?.ton}>{ANFRAGE_STATUS[a.status]?.label}</Badge>
                  {darf && ["offen", "in_pruefung"].includes(a.status) && <AnfrageKnoepfe fallId={f.id} anfrageId={a.id} />}
                </li>
              ))}
            </ul>
          )}
        </Karte>
        {darf && !f.entscheidung && f.status !== "abgebrochen" && <Karte titel="Finanzierungsanfrage senden" untertitel="Jede Bank erhält eine E-Mail mit persönlichem, 14 Tage gültigem Link zum Bankenpaket (Anmeldung Pflicht, nur freigegebene Bausteine)."><AnfrageSenden fallId={f.id} banken={f.banken} angefragt={f.anfragen.filter((a) => !["abgesagt", "zurueckgezogen"].includes(a.status)).map((a) => a.bankId)} /></Karte>}
        <Karte titel="Term-Sheet-Vergleich" untertitel="Gegen das Financial Model gerechnet: DSCR P50/P90, LLCR, EK-Bedarf inkl. Gebühren und DSRA, EK-IRR, Effektivkosten p. a." innen="p-0">
          {v.zeilen.length === 0 ? <p className="px-6 py-5 text-[14px] text-ink-500">Noch keine Term Sheets.</p> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-[13px]">
                  <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-5 py-2.5">Rang / Bank</th><th className="px-3 py-2.5 text-right">Betrag</th><th className="px-3 py-2.5">Zins / Laufzeit</th><th className="px-3 py-2.5">Tilgung</th><th className="px-3 py-2.5 text-right">DSCR P50/P90</th><th className="px-3 py-2.5 text-right">Covenant / Lock-up</th><th className="px-3 py-2.5 text-right">EK-Bedarf</th><th className="px-3 py-2.5 text-right">EK-IRR</th><th className="px-3 py-2.5 text-right">Effektiv p. a.</th><th className="px-5 py-2.5 text-right">Kosten</th></tr></thead>
                  <tbody className="divide-y divide-ink-100">
                    {v.zeilen.map((z) => (
                      <tr key={z.anfrageId} className={z.rang === 1 ? "bg-ov-50/60" : ""}>
                        <th scope="row" className="px-5 py-2.5 text-left font-semibold text-ink-900">{z.rang}. {z.bank}{!z.k.covenantHaltbar && <Badge ton="warn" className="ml-2">Covenant P90 verletzt</Badge>}</th>
                        <td className="ov-num px-3 py-2.5 text-right">{teur(z.termsheet.betrag)}</td>
                        <td className="px-3 py-2.5">{tsZins(z.termsheet)} · {z.termsheet.laufzeitJahre} J.</td>
                        <td className="px-3 py-2.5">{TILGUNG_PROFILE[z.termsheet.tilgungsprofil]}{z.termsheet.tilgungsfreiJahre ? `, ${z.termsheet.tilgungsfreiJahre} tilgungsfrei` : ""}</td>
                        <td className="ov-num px-3 py-2.5 text-right">{fx(z.k.dscrMin)} / {fx(z.k.dscrMinP90)}</td>
                        <td className="ov-num px-3 py-2.5 text-right">{fx(z.termsheet.dscrCovenant)} / {fx(z.termsheet.dscrLockup)}</td>
                        <td className="ov-num px-3 py-2.5 text-right">{teur(z.k.kapitalbedarfEk)}</td>
                        <td className="ov-num px-3 py-2.5 text-right font-semibold">{pct(z.k.ekIrr)}</td>
                        <td className="ov-num px-3 py-2.5 text-right">{pct(z.k.effektivPa, 2)}</td>
                        <td className="ov-num px-5 py-2.5 text-right">{teur(z.k.kostenSumme)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 border-t border-ink-100 px-5 py-4 text-[13px] text-ink-700 md:px-6">
                <p>{v.empfehlung}</p>
                {v.zeilen.map((z) => <p key={z.anfrageId} className="text-[12.5px] text-ink-500"><strong className="text-ink-700">{z.bank}:</strong> Sicherheiten {z.termsheet.sicherheiten.map((s) => SICHERHEITEN[s]).join(", ") || "–"} · {z.termsheet.cps.length} CPs · DSRA {z.termsheet.dsraMonate} Monate · Gebühr {String(z.termsheet.bearbeitungPct).replace(".", ",")} %{z.termsheet.gueltigBis ? ` · gültig bis ${datumDe(z.termsheet.gueltigBis)}` : ""}{z.termsheet.bemerkung ? ` · ${z.termsheet.bemerkung}` : ""}</p>)}
              </div>
            </>
          )}
        </Karte>
        {f.entscheidung ? (
          <Hinweis ton="ok" titel={`Entschieden: ${f.entscheidung.bank}`}>{f.entscheidung.begruendung} ({f.entscheidung.von}, {datumDe(f.entscheidung.am)})</Hinweis>
        ) : v.zeilen.length > 0 && darf ? (
          <Karte titel="Entscheidung" untertitel="Nur die Unterrolle Leitung kann die Bank auswählen. Alle angefragten Banken werden informiert.">
            {f.leitung ? <Entscheidung fallId={f.id} zeilen={v.zeilen} /> : <p className="text-[14px] text-ink-500">Die Bankentscheidung trifft die Leitung.</p>}
          </Karte>
        ) : null}
        {darf && !f.entscheidung && f.anfragen.some((a) => ["offen", "in_pruefung", "termsheet"].includes(a.status)) && (
          <Karte titel="Term Sheet erfassen (per E-Mail erhalten)" untertitel="Banken mit Portalzugang geben ihr Term Sheet selbst ab.">
            <details>
              <summary className="cursor-pointer text-[14px] font-semibold text-ov-700">Formular öffnen</summary>
              <div className="mt-4 space-y-3">
                {f.anfragen.filter((a) => ["offen", "in_pruefung", "termsheet"].includes(a.status)).map((a) => (
                  <details key={a.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60"><summary className="cursor-pointer font-semibold text-ink-900">{a.bank}</summary><div className="mt-4"><TermsheetFormular url={`/api/admin/finanzierung/${f.id}/aktion`} anfrageId={a.id} vorschlagBetrag={f.betragWunsch} /></div></details>
                ))}
              </div>
            </details>
          </Karte>
        )}
      </div>
    );
  } else if (tab === "paket") {
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Karte titel="Bankenpaket – Freigabe je Baustein" untertitel="Banken sehen ausschließlich freigegebene Bausteine. Steckbrief und Financial Model erzeugt die Plattform, alle Abrufe werden protokolliert.">
          {darf ? <PaketFreigabe fallId={f.id} paket={f.paket} /> : <ul className="space-y-1 text-[14px]">{f.paket.map((b) => <li key={b.id}>{b.label}: {b.freigegeben ? "freigegeben" : "gesperrt"}</li>)}</ul>}
        </Karte>
        <div className="space-y-6">
          {darf && <Karte titel="Dokument hochladen"><DokumentHochladen fallId={f.id} /></Karte>}
          <Karte titel="Dokumente" innen="p-0">
            {f.dokumente.length === 0 ? <p className="px-6 py-5 text-[14px] text-ink-500">Noch keine Dokumente.</p> : (
              <ul className="divide-y divide-ink-100">{f.dokumente.map((d) => <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]"><FileText aria-hidden="true" className="h-4 w-4 text-ov-600" /><a className="min-w-0 flex-1 truncate font-semibold text-ink-900 hover:text-ov-700" href={`/api/admin/finanzierung/${f.id}/dokumente/${d.id}`}>{d.name}</a><span className="text-[12px] text-ink-500">{f.paket.find((b) => b.id === d.baustein)?.label}</span></li>)}</ul>
            )}
          </Karte>
        </div>
      </div>
    );
  } else if (tab === "vertrag") {
    const kv = f.kreditvertrag;
    const ts = f.entscheidung ? f.anfragen.find((a) => a.id === f.entscheidung.anfrageId)?.termsheet?.daten : null;
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Karte titel="Kreditvertrag">
          {kv ? (
            <Angaben spalten={3} items={[
              { label: "Bank", wert: kv.bank }, { label: "Vertragsnummer", wert: kv.nummer }, { label: "Unterzeichnet", wert: datumDe(kv.unterzeichnetAm) },
              { label: "Auszahlung", wert: kv.auszahlungAm ? datumDe(kv.auszahlungAm) : "offen" }, { label: "Betrag", wert: eur(kv.betrag) }, { label: "Zins all-in", wert: `${String(kv.zinsPct).replace(".", ",")} %` },
              { label: "Laufzeit", wert: `${kv.laufzeitJahre} Jahre` }, { label: "Tilgung", wert: TILGUNG_PROFILE[kv.tilgungsprofil] }, { label: "DSCR Covenant / Lock-up", wert: `${fx(kv.dscrCovenant)} / ${fx(kv.dscrLockup)}` },
              { label: "DSRA", wert: `${kv.dsraMonate} Monate` }, { label: "Berichtspflichten", wert: (kv.berichtspflichten || []).join(" · "), breit: true },
            ]} />
          ) : f.entscheidung && darf ? (
            <KreditvertragFormular fallId={f.id} vorschlag={ts ? { betrag: ts.betrag, zinsPct: ts.zinsArt === "fix" ? ts.zinsPct : Math.round(((ts.referenzAnnahmePct || 0) + (ts.margePct || 0)) * 100) / 100, laufzeitJahre: ts.laufzeitJahre, tilgungsprofil: ts.tilgungsprofil, dscrCovenant: ts.dscrCovenant, dscrLockup: ts.dscrLockup, dsraMonate: ts.dsraMonate } : {}} />
          ) : (
            <p className="text-[14px] text-ink-500">Der Kreditvertrag wird nach der Bankentscheidung erfasst.</p>
          )}
        </Karte>
        <Karte titel="Auszahlungsvoraussetzungen (CPs)" untertitel={`${f.cps.filter((c) => c.erledigt).length} von ${f.cps.length} erfüllt`}>
          <ul className="space-y-3">{f.cps.map((c) => <li key={c.id}><CpSchalter fallId={f.id} cp={c} darf={darf} /></li>)}</ul>
        </Karte>
      </div>
    );
  } else if (tab === "covenants") {
    const c = f.covenantDetail;
    inhalt = !f.kreditvertrag ? (
      <Hinweis ton="info">Covenant-Monitoring beginnt mit dem Kreditvertrag. Grundlage sind die Zählerwerte der verknüpften Anlage.</Hinweis>
    ) : (
      <div className="space-y-6">
        <section aria-label="Covenants" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70"><p className="text-[12.5px] font-medium text-ink-500">Ampel</p><div className="mt-2"><AmpelBadge id={c?.ampel?.id} /></div></div>
          <Wert label="DSCR (12 Monate)" wert={fx(c?.letzte?.dscr)} hinweis={c?.letzte?.periode} />
          <Wert label="Lock-up / Covenant" wert={`${fx(f.kreditvertrag.dscrLockup)} / ${fx(f.kreditvertrag.dscrCovenant)}`} />
          <Wert label="LLCR" wert={fx(c?.llcr)} />
          <Wert label="Restschuld" wert={teur(c?.restschuld)} />
        </section>
        {c?.ampel && <Hinweis ton={c.ampel.id === "gruen" ? "ok" : c.ampel.id === "grau" ? "neutral" : "warn"} titel={c.ampel.id === "rot" ? "Handlungsbedarf" : c.ampel.id === "gelb" ? "Frühwarnung" : "Status"}>{c.ampel.grund}</Hinweis>}
        <Karte titel="Prüftermine (DSCR rollierend 12 Monate)" untertitel={`Zuletzt geprüft ${c?.geprueftAm ? new Date(c.geprueftAm).toLocaleString("de-DE") : "–"} · Reporting-Frist ${datumDe(f.reporting?.naechsteFrist)}`} aktion={
          <div className="flex flex-wrap gap-2">
            {darf && <KnopfAktion url={`/api/admin/finanzierung/${f.id}/aktion`} body={{ aktion: "covenant" }} text="Jetzt prüfen" ok="Geprüft." hell />}
            <a href={`/api/admin/finanzierung/${f.id}/reporting`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ov-600 px-4 text-[13px] font-semibold text-white hover:bg-ov-700"><Download aria-hidden="true" className="h-4 w-4" />Bank-Reporting PDF</a>
          </div>
        } innen="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-5 py-2.5">Periode</th><th className="px-3 py-2.5 text-right">CFADS</th><th className="px-3 py-2.5 text-right">Schuldendienst</th><th className="px-3 py-2.5 text-right">DSCR</th><th className="px-5 py-2.5">Ampel</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {(c?.pruefungen || []).map((p) => <tr key={p.periode}><th scope="row" className="px-5 py-2.5 text-left font-medium">{p.periode}</th><td className="ov-num px-3 py-2.5 text-right">{teur(p.cfads)}</td><td className="ov-num px-3 py-2.5 text-right">{teur(p.schuldendienst)}</td><td className="ov-num px-3 py-2.5 text-right font-semibold">{fx(p.dscr)}</td><td className="px-5 py-2.5"><AmpelBadge id={p.ampel.id} /></td></tr>)}
              </tbody>
            </table>
          </div>
          {(!c?.pruefungen || c.pruefungen.length === 0) && <p className="px-6 py-4 text-[13.5px] text-ink-500">Noch keine 12 vollständigen Monate an Zählerwerten.</p>}
        </Karte>
        {c?.monate?.length > 0 && (
          <Karte titel="Monatswerte aus der Zählererfassung" untertitel="Erlöse = Direktlieferung × Arbeitspreis + Grundgebühr + Einspeisung × Marktwert; Kosten planmäßig (Opex, Pacht)" innen="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-5 py-2.5">Monat</th><th className="px-3 py-2.5 text-right">Erzeugung kWh</th><th className="px-3 py-2.5 text-right">Einspeisung kWh</th><th className="px-3 py-2.5 text-right">CFADS</th><th className="px-5 py-2.5 text-right">Schuldendienst</th></tr></thead>
                <tbody className="divide-y divide-ink-100">{c.monate.slice(-12).map((m) => <tr key={m.monat}><th scope="row" className="px-5 py-2 text-left font-medium">{m.monat}</th><td className="ov-num px-3 py-2 text-right">{Math.round(m.erzeugung).toLocaleString("de-DE")}</td><td className="ov-num px-3 py-2 text-right">{Math.round(m.einspeisung).toLocaleString("de-DE")}</td><td className="ov-num px-3 py-2 text-right">{eur(m.cfads)}</td><td className="ov-num px-5 py-2 text-right">{eur(m.schuldendienst)}</td></tr>)}</tbody>
              </table>
            </div>
          </Karte>
        )}
      </div>
    );
  } else {
    inhalt = (
      <div className="space-y-6">
        {f.geschaeftsmodell && <Hinweis ton="ok" titel={`Festgelegt: ${f.geschaeftsmodell.label}`}>{f.geschaeftsmodell.begruendung || "Ohne Begründung."} ({f.geschaeftsmodell.von}, {datumDe(f.geschaeftsmodell.am)})</Hinweis>}
        <Karte titel="Geschäftsmodell für dieses Projekt" untertitel="Verkaufserlös heute (Build-to-Sell) gegen Barwert im Eigenbetrieb nach Finanzierung, Contracting und Verpachtung – Entscheidungsgrundlage für die Geschäftsführung.">
          <GeschaeftsmodellRechner fallId={f.id} darfEntscheiden={darf && f.leitung} />
        </Karte>
      </div>
    );
  }

  return (
    <>
      <Link href="/portal/admin/finanzierung" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Alle Finanzierungsfälle</Link>
      <SeitenKopf eyebrow={f.spv || "Finanzierungsfall"} titel={f.titel} text={`${String(e.mwp).replace(".", ",")} MWp · ${TYPEN_FZ[e.typ]} · ${e.land} · Bedarf ${teur(f.betragWunsch)}${f.bezug ? ` · ${f.bezug.art === "anlage" ? "Anlage" : "Entwicklungsprojekt"}: ${f.bezug.titel}` : ""}`}>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge ton={FALL_STATUS[f.status]?.ton}>{f.statusLabel}</Badge>
          {f.covenant && <AmpelBadge id={f.covenant.ampel?.id} />}
          {f.bezug && <Link href={f.bezug.link} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ov-700 hover:text-ov-800"><Landmark aria-hidden="true" className="h-3.5 w-3.5" />Zum Bezug</Link>}
        </div>
      </SeitenKopf>
      <Reiter basis={basis} aktiv={tab} tabs={tabs} label="Bereiche des Finanzierungsfalls" />
      {inhalt}
      <p className="mt-8 text-[12px] leading-relaxed text-ink-500">{HINWEIS_BERATUNG}</p>
    </>
  );
}

// Bank-Akte einer Finanzierungsanfrage – gemeinsame Darstellung für das Bank-Portal (sicht „bank“) und das Backoffice (sicht „bo“).
// Server-Komponente; Formulare aus ./BankAkte. Sichtbarkeit der Aktionen nach Teamrolle (Bank) bzw. Schreibrecht (Backoffice) –
// die API prüft jede Aktion selbst.

import { CheckCircle2, CircleDashed, FileText, TriangleAlert } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte } from "@/components/Portal/ui";
import { AmpelBadge, teur, fx, datumDe } from "./teile";
import { cn } from "@/components/ui/cn";
import {
  AnforderungFormular, AnforderungLiefern, AnforderungPruefen, AuszahlungBeantragen, AuszahlungEntscheiden, BerichtAnfordern, BerichtEinreichen, BerichtPruefen,
  CpBestaetigen, FrageBeantworten, FrageFormular, KreditentscheidungFormular,
} from "./BankAkte";

const ROT = "bg-danger-50 text-danger-800 ring-danger-200";
const StatusBadge = ({ ton, children }) => <Badge ton={ton === "rot" ? "neutral" : ton} className={ton === "rot" ? ROT : undefined}>{children}</Badge>;
const eur = (x) => (Number.isFinite(x) ? `${Math.round(x).toLocaleString("de-DE")} €` : "–");
const Dateien = ({ liste }) => (liste?.length ? <span className="mt-1 flex flex-wrap gap-2">{liste.map((d) => <a key={d.id} href={d.link} className="inline-flex max-w-full items-center gap-1 truncate text-[12.5px] font-semibold text-ov-700 hover:text-ov-800"><FileText aria-hidden="true" className="h-3.5 w-3.5" />{d.name}</a>)}</span> : null);

/** Q&A und Unterlagen-Anforderungen (vor und nach der Entscheidung) */
export function AkteAnforderungen({ akte, darf }) {
  const bo = akte.sicht === "bo";
  const offen = akte.anfrageStatus !== "abgesagt" && akte.anfrageStatus !== "nicht_ausgewaehlt";
  return (
    <Karte titel="Angeforderte Unterlagen" untertitel={`${akte.stand.anforderungenOffen} offen${akte.stand.anforderungenUeberfaellig ? `, ${akte.stand.anforderungenUeberfaellig} überfällig` : ""} · ${akte.stand.anforderungenZuPruefen} zur Prüfung bei der Bank`} innen="p-0">
      <ul className="divide-y divide-ink-100">
        {akte.anforderungen.map((x) => (
          <li key={x.id} className="px-5 py-3.5 md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-ink-900">{x.titel}</p>
              <StatusBadge ton={x.statusTon}>{x.statusLabel}</StatusBadge>
              {x.ueberfaellig && <Badge className={ROT}><TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />Frist {datumDe(x.frist)}</Badge>}
            </div>
            <p className="text-[12.5px] text-ink-500">{x.bausteinLabel ? `${x.bausteinLabel} · ` : ""}Frist {datumDe(x.frist)}{x.beschreibung ? ` · ${x.beschreibung}` : ""}</p>
            {x.lieferung && <p className="mt-1 text-[13px] text-ink-700">Geliefert {datumDe(x.lieferung.am)}{x.lieferung.text ? `: ${x.lieferung.text}` : ""}{x.lieferung.bausteinFreigegeben ? " (Baustein im Bankenpaket freigegeben)" : ""}</p>}
            {x.lieferung && <Dateien liste={x.lieferung.dateien} />}
            {x.pruefung?.kommentar && <p className="mt-1 text-[12.5px] text-ink-600">Bank: {x.pruefung.kommentar}</p>}
            {bo && darf && ["offen", "nachforderung"].includes(x.status) && <details className="mt-2"><summary className="cursor-pointer text-[13px] font-semibold text-ov-700">Liefern</summary><div className="mt-2"><AnforderungLiefern anfrageId={akte.anfrageId} anforderung={x} /></div></details>}
            {!bo && darf && x.status === "geliefert" && <div className="mt-2"><AnforderungPruefen anfrageId={akte.anfrageId} anforderung={x} /></div>}
          </li>
        ))}
        {!akte.anforderungen.length && <li className="px-5 py-4 text-[14px] text-ink-500 md:px-6">{bo ? "Die Bank hat noch keine Unterlagen angefordert." : "Noch keine Anforderungen. Fehlt Ihnen etwas für die Kreditprüfung, fordern Sie es hier mit Frist an."}</li>}
      </ul>
      {!bo && darf && offen && <div className="border-t border-ink-100 px-5 py-4 md:px-6"><details><summary className="cursor-pointer text-[14px] font-semibold text-ov-700">Unterlagen anfordern (Checkliste)</summary><div className="mt-3"><AnforderungFormular anfrageId={akte.anfrageId} bausteine={akte.bausteine} /></div></details></div>}
    </Karte>
  );
}

export function AkteQa({ akte, darf }) {
  const bo = akte.sicht === "bo";
  return (
    <Karte titel="Fragen & Antworten" untertitel={`${akte.stand.fragenOffen} offen`} innen="p-0">
      <ul className="divide-y divide-ink-100">
        {akte.qa.map((q) => (
          <li key={q.id} className="px-5 py-3.5 md:px-6">
            <p className="text-[12px] font-semibold text-ink-500">{q.kategorieLabel} · {q.von} · {datumDe(q.am)}</p>
            <p className="mt-0.5 whitespace-pre-line text-[14px] text-ink-900">{q.frage}</p>
            {q.antwort ? (
              <div className="mt-2 rounded-2xl bg-ov-50 p-3 text-[13.5px] ring-1 ring-ov-200">
                <p className="text-[12px] font-semibold text-ink-500">ÖkoInvest · {datumDe(q.antwort.am)}</p>
                <p className="whitespace-pre-line text-ink-800">{q.antwort.text}</p>
                <Dateien liste={q.antwort.dateien} />
              </div>
            ) : bo && darf ? (
              <details className="mt-2" open><summary className="cursor-pointer text-[13px] font-semibold text-ov-700">Beantworten</summary><div className="mt-2"><FrageBeantworten anfrageId={akte.anfrageId} frage={q} /></div></details>
            ) : <p className="mt-1 text-[12.5px] text-ink-500">Antwort ausstehend</p>}
          </li>
        ))}
        {!akte.qa.length && <li className="px-5 py-4 text-[14px] text-ink-500 md:px-6">Noch keine Fragen.</li>}
      </ul>
      {!bo && darf && <div className="border-t border-ink-100 px-5 py-4 md:px-6"><FrageFormular anfrageId={akte.anfrageId} /></div>}
    </Karte>
  );
}

/** Nach der Auswahl: Kreditentscheidung, Kreditvertrag, CPs, Auszahlungen, Monitoring */
export function AkteNachAuswahl({ akte, darf, leitung }) {
  const bo = akte.sicht === "bo";
  if (akte.anfrageStatus !== "ausgewaehlt") return null;
  const k = akte.kreditentscheidung;
  const kv = akte.kreditvertrag;
  const verfuegbar = kv ? kv.betrag - akte.auszahlungen.filter((x) => x.status !== "abgelehnt").reduce((s, x) => s + x.betrag, 0) : 0;
  return (
    <>
      <Karte titel="Kreditentscheidung" untertitel="Beschluss des Kreditgremiums der Bank nach Auswahl durch ÖkoInvest">
        {k ? (
          <div className="space-y-2">
            <StatusBadge ton={k.ton}>{k.label}</StatusBadge>
            <Angaben spalten={3} items={[
              { label: "Beschluss", wert: `${datumDe(k.beschlussAm)}${k.gremium ? ` · ${k.gremium}` : ""}` },
              ...(k.betrag ? [{ label: "Genehmigter Betrag", wert: eur(k.betrag) }, { label: "Zusage gültig bis", wert: datumDe(k.gueltigBis) }] : []),
              ...(k.auflagen?.length ? [{ label: "Auflagen", wert: k.auflagen.join(" · "), breit: true }] : []),
              ...(k.begruendung ? [{ label: k.ergebnis === "abgelehnt" ? "Begründung" : "Bemerkung", wert: k.begruendung, breit: true }] : []),
            ]} />
          </div>
        ) : !bo && leitung && !kv ? (
          <KreditentscheidungFormular anfrageId={akte.anfrageId} betrag={akte.termsheetBetrag} />
        ) : <p className="text-[14px] text-ink-500">{bo ? "Die Bank hat noch keine Kreditentscheidung gemeldet." : "Die Kreditentscheidung meldet die Leitung Ihres Hauses."}</p>}
      </Karte>
      {kv ? (
        <>
          <Karte titel="Kreditvertrag" untertitel={`Vertrag ${kv.nummer} vom ${datumDe(kv.unterzeichnetAm)}`}>
            <Angaben spalten={3} items={[
              { label: "Betrag", wert: eur(kv.betrag) }, { label: "Zins / Laufzeit", wert: `${String(kv.zinsPct).replace(".", ",")} % p. a. · ${kv.laufzeitJahre} Jahre` },
              { label: "DSCR Covenant / Lock-up", wert: `${fx(kv.dscrCovenant)} / ${fx(kv.dscrLockup)}` }, { label: "DSRA", wert: `${kv.dsraMonate} Monate` },
              { label: "Ausgezahlt", wert: `${eur(akte.ausgezahlt)} von ${eur(kv.betrag)}` }, { label: "Erste Auszahlung", wert: kv.auszahlungAm ? datumDe(kv.auszahlungAm) : "offen" },
              ...(kv.berichtspflichten?.length ? [{ label: "Berichtspflichten", wert: kv.berichtspflichten.join(" · "), breit: true }] : []),
            ]} />
          </Karte>
          <Karte titel="Auszahlungsvoraussetzungen (CPs)" untertitel={akte.cpOffen ? `${akte.cpOffen} noch nicht erfüllt bzw. nicht von der Bank bestätigt` : "Alle erfüllt und von der Bank bestätigt"} innen="p-0">
            <ul className="divide-y divide-ink-100">
              {akte.cps.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-start md:px-6">
                  <span className="flex min-w-0 flex-1 items-start gap-2 text-[14px] text-ink-800">
                    {c.erledigt && c.bank?.status === "bestaetigt" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> : <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />}
                    <span>{c.label}<span className="block text-[12px] text-ink-500">{c.erledigt ? `von ÖkoInvest erfüllt ${datumDe(c.am)}${c.nachweis ? ` · ${c.nachweis}` : ""}` : "noch nicht erfüllt"}{c.bank ? ` · Bank: ${c.bank.status === "bestaetigt" ? "bestätigt" : `beanstandet – ${c.bank.kommentar}`}` : ""}</span></span>
                  </span>
                  {!bo && darf && c.erledigt && c.bank?.status !== "bestaetigt" && <CpBestaetigen anfrageId={akte.anfrageId} cp={c} />}
                </li>
              ))}
            </ul>
            {bo && <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] text-ink-500 md:px-6">CPs als erfüllt melden Sie im Reiter „Kreditvertrag & CPs“ des Finanzierungsfalls; die Bank bestätigt hier.</p>}
          </Karte>
          <Karte titel="Auszahlungen (Ziehungen)" untertitel={`verfügbar ${eur(verfuegbar)}`} innen="p-0">
            <ul className="divide-y divide-ink-100">
              {akte.auszahlungen.map((x) => (
                <li key={x.id} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-start md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink-900">{eur(x.betrag)} zum {datumDe(x.wunschDatum)} <StatusBadge ton={x.statusTon}>{x.statusLabel}</StatusBadge></p>
                    <p className="text-[12.5px] text-ink-500">{x.zweck}{x.valuta ? ` · Valuta ${datumDe(x.valuta)}` : ""}{x.entscheid?.kommentar ? ` · ${x.entscheid.kommentar}` : ""}</p>
                  </div>
                  {!bo && darf && ["beantragt", "freigegeben"].includes(x.status) && <AuszahlungEntscheiden anfrageId={akte.anfrageId} x={x} leitung={leitung} />}
                </li>
              ))}
              {!akte.auszahlungen.length && <li className="px-5 py-4 text-[14px] text-ink-500 md:px-6">Noch keine Auszahlung beantragt.</li>}
            </ul>
            {bo && darf && verfuegbar > 0 && k?.ergebnis !== "abgelehnt" && (
              <div className="border-t border-ink-100 px-5 py-4 md:px-6">
                {akte.cpOffen ? <Hinweis ton="warn">Auszahlung erst möglich, wenn alle CPs erfüllt und von der Bank bestätigt sind ({akte.cpOffen} offen).</Hinweis> : <AuszahlungBeantragen anfrageId={akte.anfrageId} verfuegbar={verfuegbar} />}
              </div>
            )}
          </Karte>
          <Karte titel="Monitoring" untertitel={akte.covenant ? `Covenant-Prüfung vom ${datumDe(akte.covenant.geprueftAm)} aus den Zählerwerten der Anlage` : "Noch keine Covenant-Prüfung"}>
            {akte.covenant ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3"><AmpelBadge id={akte.covenant.ampel?.id} /><span className="text-[13.5px] text-ink-700">{akte.covenant.ampel?.grund}</span></div>
                <Angaben spalten={3} items={[{ label: "DSCR (12 Monate)", wert: fx(akte.covenant.letzte?.dscr) }, { label: "LLCR", wert: fx(akte.covenant.llcr) }, { label: "Restschuld", wert: teur(akte.covenant.restschuld) }]} />
                {akte.covenant.pruefungen?.length > 0 && (
                  <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-[13px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="py-2">Periode</th><th className="py-2 text-right">CFADS</th><th className="py-2 text-right">Schuldendienst</th><th className="py-2 text-right">DSCR</th><th className="py-2 pl-3">Ampel</th></tr></thead>
                    <tbody className="divide-y divide-ink-100">{akte.covenant.pruefungen.map((p) => <tr key={p.periode}><th scope="row" className="py-2 text-left font-semibold text-ink-900">{p.periode}</th><td className="ov-num py-2 text-right">{teur(p.cfads)}</td><td className="ov-num py-2 text-right">{teur(p.schuldendienst)}</td><td className="ov-num py-2 text-right">{fx(p.dscr)}</td><td className="py-2 pl-3"><AmpelBadge id={p.ampel?.id} kurz /></td></tr>)}</tbody></table></div>
                )}
              </div>
            ) : <p className="text-[14px] text-ink-500">Das Covenant-Monitoring startet mit Messdaten der Anlage nach der Auszahlung.</p>}
          </Karte>
          <Karte titel="Berichte" untertitel={`${akte.stand.berichteFaellig} angefordert${akte.stand.berichteUeberfaellig ? `, ${akte.stand.berichteUeberfaellig} überfällig` : ""} · ${akte.stand.berichteZuPruefen} zur Prüfung`} innen="p-0">
            <ul className="divide-y divide-ink-100">
              {akte.berichte.map((x) => (
                <li key={x.id} className="px-5 py-3.5 md:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink-900">{x.artLabel} · {x.periode}</p>
                    <StatusBadge ton={x.statusTon}>{x.statusLabel}</StatusBadge>
                    {x.ueberfaellig && <Badge className={ROT}>fällig seit {datumDe(x.faelligAm)}</Badge>}
                  </div>
                  <p className="text-[12.5px] text-ink-500">{x.faelligAm ? `Fällig ${datumDe(x.faelligAm)}` : "ohne Anforderung eingereicht"}{x.eingereichtAm ? ` · eingereicht ${datumDe(x.eingereichtAm)}` : ""}{x.kennzahlen ? ` · DSCR ${fx(x.kennzahlen.dscr)}, LLCR ${fx(x.kennzahlen.llcr)}` : ""}{x.bemerkung ? ` · ${x.bemerkung}` : ""}</p>
                  <span className="flex flex-wrap gap-3">{x.pdf && <a href={x.pdf} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ov-700 hover:text-ov-800"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Covenant-Report (PDF)</a>}{x.datei && <Dateien liste={[x.datei]} />}</span>
                  {x.pruefung?.kommentar && <p className="mt-1 text-[12.5px] text-ink-600">Bank: {x.pruefung.kommentar}</p>}
                  {bo && darf && ["angefordert", "beanstandet"].includes(x.status) && <details className="mt-2"><summary className="cursor-pointer text-[13px] font-semibold text-ov-700">Einreichen</summary><div className="mt-2"><BerichtEinreichen anfrageId={akte.anfrageId} bericht={x} /></div></details>}
                  {!bo && darf && x.status === "eingereicht" && <div className="mt-2"><BerichtPruefen anfrageId={akte.anfrageId} bericht={x} /></div>}
                </li>
              ))}
              {!akte.berichte.length && <li className="px-5 py-4 text-[14px] text-ink-500 md:px-6">Noch keine Berichte.</li>}
            </ul>
            <div className={cn("border-t border-ink-100 px-5 py-4 md:px-6", !darf && "hidden")}>
              <details><summary className="cursor-pointer text-[14px] font-semibold text-ov-700">{bo ? "Bericht unaufgefordert einreichen" : "Bericht anfordern"}</summary><div className="mt-3">{bo ? <BerichtEinreichen anfrageId={akte.anfrageId} /> : <BerichtAnfordern anfrageId={akte.anfrageId} />}</div></details>
            </div>
          </Karte>
        </>
      ) : (
        <Hinweis ton="neutral" titel="Kreditvertrag">Sobald der Kreditvertrag unterzeichnet und von ÖkoInvest erfasst ist, erscheinen hier Auszahlungsvoraussetzungen, Ziehungen und das Monitoring.</Hinweis>
      )}
    </>
  );
}

export function AkteVerlauf({ akte }) {
  if (!akte.verlauf.length) return null;
  return (
    <Karte titel="Verlauf der Akte" innen="p-0">
      <ul className="max-h-72 divide-y divide-ink-100 overflow-y-auto">{akte.verlauf.map((x, i) => <li key={i} className="px-5 py-2.5 text-[13px]"><span className="text-ink-500">{new Date(x.am).toLocaleString("de-DE")} · {x.von}</span><br />{x.text}</li>)}</ul>
    </Karte>
  );
}

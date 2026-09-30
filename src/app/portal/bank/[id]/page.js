import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { teur, datumDe, HINWEIS_BERATUNG } from "@/components/Portal/Finanzierung/teile";
import { BankRueckmeldung, TermsheetFormular } from "@/components/Portal/Finanzierung/Aktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { ANFRAGE_STATUS, REFERENZZINSEN } from "@/lib/plattform/finanzierung/bank";
import { ERLOES_MODELLE, TYPEN_FZ } from "@/lib/plattform/finanzierung/kern";

export const metadata = { title: "Bankenpaket" };

// Eine Anfrage aus Sicht der Bank: nur freigegebene Bausteine, eigene Term Sheets, keine anderen Banken (fremd → 404)
export default async function BankAnfrageSeite({ params }) {
  const n = await portalNutzer({ rollen: ["bank"] });
  const { id } = await params;
  const d = await laden(() => finanzierungBackend().fzBankAnfrage(n, id));
  const a = d.anfrage;
  const v = d.vorhaben;
  const ts = a.termsheet?.daten;
  return (
    <>
      <Link href="/portal/bank" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Alle Anfragen</Link>
      <SeitenKopf eyebrow="Finanzierungsanfrage · vertraulich" titel={v.titel} text={`Frist für Ihr Term Sheet: ${datumDe(a.frist)}`}>
        <div className="mt-3 flex flex-wrap gap-2"><Badge ton={ANFRAGE_STATUS[a.status]?.ton}>{ANFRAGE_STATUS[a.status]?.label}</Badge></div>
      </SeitenKopf>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Karte titel="Vorhaben">
            <Angaben spalten={3} items={[
              { label: "Projektgesellschaft", wert: v.spv || "in Gründung" }, { label: "Land / Typ", wert: `${v.land} · ${TYPEN_FZ[v.typ] || v.typ}` }, { label: "Leistung", wert: `${String(v.mwp).replace(".", ",")} MWp` },
              { label: "Gesamtinvestition", wert: teur(v.capex) }, { label: "Finanzierungsbedarf", wert: teur(v.betragWunsch) }, { label: "Erlösmodell", wert: `${ERLOES_MODELLE[v.modell]}, ${v.vertragJahre} Jahre` },
              { label: "Nachricht von ÖkoInvest", wert: a.nachricht, breit: true },
            ]} />
          </Karte>
          <Karte titel="Bankenpaket" untertitel={`Freigegebene Unterlagen${d.nichtFreigegeben ? ` – ${d.nichtFreigegeben} weitere Bausteine folgen nach Freigabe` : ""}. Jeder Abruf wird protokolliert.`} innen="p-0">
            <ul className="divide-y divide-ink-100">
              {d.paket.map((b) => (
                <li key={b.id} className="px-5 py-3.5 md:px-6">
                  <p className="text-[14.5px] font-semibold text-ink-900">{b.label}</p>
                  <p className="text-[12.5px] text-ink-500">{b.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.quelle === "auto" && <a href={`/api/portal/bank/${a.id}/dokument/${b.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50"><FileText aria-hidden="true" className="h-3.5 w-3.5" />PDF</a>}
                    {b.id === "financial_model" && <a href={`/api/portal/bank/${a.id}/dokument/financial_model?format=csv`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50"><FileSpreadsheet aria-hidden="true" className="h-3.5 w-3.5" />CSV</a>}
                    {b.dokumente.map((x) => <a key={x.id} href={`/api/portal/bank/${a.id}/dokument/${x.id}`} className="inline-flex h-9 max-w-full items-center gap-1.5 truncate rounded-full px-3.5 text-[12.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:ring-ink-300"><FileText aria-hidden="true" className="h-3.5 w-3.5" />{x.name}</a>)}
                    {b.quelle !== "auto" && b.dokumente.length === 0 && <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-500"><Lock aria-hidden="true" className="h-3.5 w-3.5" />Unterlage wird nachgereicht</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Karte>
        </div>
        <div className="space-y-6">
          {ts && (
            <Karte titel="Ihr Term Sheet" untertitel={`Stand ${datumDe(a.termsheet.am)} · Version ${a.termsheet.version}`}>
              <Angaben items={[
                { label: "Betrag", wert: teur(ts.betrag) }, { label: "Laufzeit", wert: `${ts.laufzeitJahre} Jahre` },
                { label: "Zins", wert: ts.zinsArt === "fix" ? `${String(ts.zinsPct).replace(".", ",")} % fest` : `${REFERENZZINSEN[ts.zinsArt]} + ${String(ts.margePct).replace(".", ",")} %` },
                { label: "DSCR Covenant / Lock-up", wert: `${ts.dscrCovenant} / ${ts.dscrLockup}` },
              ]} />
            </Karte>
          )}
          {d.darfTermsheet ? (
            <Karte titel={ts ? "Term Sheet aktualisieren" : "Term Sheet abgeben"} untertitel="Indikativ – ÖkoInvest vergleicht alle Angebote gegen das Financial Model.">
              <TermsheetFormular url={`/api/portal/bank/${a.id}`} vorschlagBetrag={v.betragWunsch} knopfText="Term Sheet übermitteln" />
            </Karte>
          ) : (
            <Hinweis ton="neutral">Für diese Anfrage ist keine Abgabe mehr möglich ({ANFRAGE_STATUS[a.status]?.label}).</Hinweis>
          )}
          {d.darfTermsheet && <Karte titel="Rückfrage oder Absage"><BankRueckmeldung anfrageId={a.id} /></Karte>}
          <Karte titel="Verlauf" innen="p-0">
            <ul className="divide-y divide-ink-100">{a.verlauf.slice().reverse().map((x, i) => <li key={i} className="px-5 py-2.5 text-[13px]"><span className="text-ink-500">{new Date(x.am).toLocaleString("de-DE")}</span><br />{x.text}</li>)}</ul>
          </Karte>
          <p className="text-[12px] leading-relaxed text-ink-500">{HINWEIS_BERATUNG}</p>
        </div>
      </div>
    </>
  );
}

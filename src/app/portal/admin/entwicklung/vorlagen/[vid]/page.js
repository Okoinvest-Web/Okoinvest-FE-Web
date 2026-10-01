import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { Angaben, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Wert, datumKurz, eurKurz, monatText, mwpText } from "@/components/Portal/Entwicklung/teile";
import { AmpelBadge, AmpelListe, VorlageStatusBadge } from "@/components/Portal/Entwicklung/SteuerungTeile";
import { VorlageAktionen, VorlageFormular } from "@/components/Portal/Entwicklung/Steuerung";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { steuerungBackend } from "@/lib/plattform/backend/entwicklung-steuerung";
import { VERWERTUNG, VORLAGE_ARTEN } from "@/lib/plattform/entwicklung-steuerung";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Entscheidungsvorlage" };

export default async function VorlageSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { vid } = await params;
  const x = await laden(() => steuerungBackend().vorlageHolen(n, vid));
  const s = x.snapshot;
  const art = VORLAGE_ARTEN[x.art];

  return (
    <>
      <Link href={`/portal/admin/entwicklung/${x.projektId}?reiter=steuerung`} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{x.projektTitel}</Link>
      <SeitenKopf
        eyebrow={`Entscheidungsvorlage · ${x.id}`}
        titel={x.titel}
        text={`${x.artLabel} · erstellt von ${x.ersteller?.name || "–"} am ${datumKurz(x.erstelltAm)}${x.eingereichtAm ? ` · eingereicht ${datumKurz(x.eingereichtAm)}` : ""}`}
        aktionen={<a href={`/api/admin/entwicklung/vorlagen/${x.id}/pdf?anzeigen=1`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><FileDown aria-hidden="true" className="h-4 w-4" />PDF für die Geschäftsführung</a>}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2"><VorlageStatusBadge status={x.status} />{s?.ampel && <AmpelBadge farbe={s.ampel.gesamt.farbe}>Ampel beim Einreichen: {s.ampel.gesamt.label}</AmpelBadge>}</div>
      </SeitenKopf>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Karte titel="Beschlussvorschlag">
            <p className="whitespace-pre-line text-[15px] font-semibold text-ink-900">{x.beschlussvorschlag || "–"}</p>
            {art?.verwertung && x.empfehlung && <p className="mt-3 text-[14px] text-ink-700">Empfohlene Verwertung: <strong>{VERWERTUNG[x.empfehlung]?.label}</strong>. {VERWERTUNG[x.empfehlung]?.folge}</p>}
            {art?.budget && <p className="mt-3 text-[14px] text-ink-700">Beantragtes Budget: <strong className="ov-num">{fmt(x.budgetEur || 0)} €</strong> (wird bei Genehmigung als Budgetposition angelegt).</p>}
          </Karte>
          <Karte titel="Sachverhalt">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-800">{x.sachverhalt || "–"}</p>
            {x.alternativen && <><h3 className="mt-4 text-[14px] font-semibold text-ink-900">Alternativen</h3><p className="mt-1 whitespace-pre-line text-[14px] text-ink-800">{x.alternativen}</p></>}
            {x.risikenText && <><h3 className="mt-4 text-[14px] font-semibold text-ink-900">Einschätzung Risiken</h3><p className="mt-1 whitespace-pre-line text-[14px] text-ink-800">{x.risikenText}</p></>}
          </Karte>
          {s ? (
            <Karte titel="Momentaufnahme beim Einreichen" untertitel={`Stand ${datumKurz(s.stand)} – bleibt unverändert, auch wenn sich das Projekt weiterentwickelt`}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Wert ton="dunkel" label="Leistung" wert={mwpText(s.projekt.mwp)} hinweis={s.projekt.vermarktungLabel} />
                <Wert label="Phase" wert={s.phaseLabel || "Akquise"} hinweis={`${s.fortschritt} % Fortschritt`} />
                <Wert ton={s.codVerzugMonate ? "warn" : undefined} label="COD Prognose" wert={monatText((s.prognoseCod || "").slice(0, 7))} hinweis={s.codVerzugMonate ? `+${s.codVerzugMonate} Monate` : "im Ziel"} />
                <Wert label="Budget Ist / Plan" wert={eurKurz(s.budgetIst)} hinweis={`von ${eurKurz(s.budgetPlan)}`} />
              </div>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div><h3 className="text-[14px] font-semibold text-ink-900">Ampel</h3><AmpelListe ampel={s.ampel} /></div>
                <div>
                  <h3 className="text-[14px] font-semibold text-ink-900">Nächste Meilensteine</h3>
                  <ul className="mt-1 divide-y divide-ink-100 text-[13.5px]">
                    {s.meilensteine.map((m, i) => <li key={i} className="flex justify-between gap-3 py-2"><span className={m.kritisch ? "font-semibold text-danger-700" : "text-ink-800"}>{m.titel}</span><span className="ov-num shrink-0 text-ink-600">{datumKurz(m.prognoseEnde || m.sollEnde)}</span></li>)}
                    {!s.meilensteine.length && <li className="py-2 text-ink-500">Keine offenen Meilensteine.</li>}
                  </ul>
                </div>
              </div>
              {s.risiken.length > 0 && (
                <>
                  <h3 className="mt-5 text-[14px] font-semibold text-ink-900">Wesentliche Risiken · erwartete Risikokosten {eurKurz(s.risikokosten)}</h3>
                  <ul className="mt-1 divide-y divide-ink-100 text-[13.5px]">
                    {s.risiken.map((r, i) => <li key={i} className="flex justify-between gap-3 py-2"><span className="min-w-0 text-ink-800">{r.titel}<span className="block text-[12px] text-ink-500">{r.kategorieLabel}{r.massnahme ? ` · ${r.massnahme}` : ""}</span></span><AmpelBadge farbe={r.score >= 15 ? "rot" : r.score >= 8 ? "gelb" : "gruen"}>{r.score}{r.restScore ? ` → ${r.restScore}` : ""}</AmpelBadge></li>)}
                  </ul>
                </>
              )}
            </Karte>
          ) : <Hinweis ton="neutral">Kennzahlen, Ampel, Termine, Risiken und – bei Verwertungsentscheidungen – der Geschäftsmodell-Vergleich werden beim Einreichen als Momentaufnahme beigefügt.</Hinweis>}
          {x.bearbeitbar && (
            <Karte titel="Vorlage bearbeiten">
              <VorlageFormular projektId={x.projektId} vorlage={x} />
            </Karte>
          )}
        </div>
        <div className="space-y-6">
          <Karte titel={x.status === "eingereicht" ? "Entscheidung" : "Aktionen"}>
            {x.entscheidung && (
              <Angaben spalten={1} items={[
                { label: "Entschieden", wert: `${datumKurz(x.entscheidung.am)} · ${x.entscheidung.von}` },
                { label: "Verwertung", wert: x.entscheidung.option ? VERWERTUNG[x.entscheidung.option]?.label : "" },
                { label: "Begründung", wert: x.entscheidung.begruendung },
              ].filter((i) => i.wert)} />
            )}
            <div className={x.entscheidung ? "mt-4" : ""}><VorlageAktionen vorlage={x} /></div>
          </Karte>
          {s?.geschaeftsmodell && art?.verwertung && (
            <Karte titel="Geschäftsmodell-Vergleich" untertitel={s.geschaeftsmodell.quelle}>
              <ul className="divide-y divide-ink-100 text-[13.5px]">
                {s.geschaeftsmodell.zeilen.map((z) => <li key={z.id} className={`flex justify-between gap-3 py-2 ${z.id === s.geschaeftsmodell.beste ? "font-semibold text-ink-900" : "text-ink-700"}`}><span>{z.label}</span><span className="ov-num shrink-0">{eurKurz(z.barwert)}</span></li>)}
              </ul>
              <p className="mt-3 text-[12.5px] text-ink-500">{s.geschaeftsmodell.empfehlung}</p>
            </Karte>
          )}
          <Karte titel="Verlauf" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {[...x.verlauf].reverse().map((e, i) => <li key={i} className="px-5 py-3 text-[13.5px]"><p className="text-ink-800">{e.text}</p><p className="text-[12px] text-ink-500">{datumKurz(e.am)} · {e.von}</p></li>)}
            </ul>
          </Karte>
        </div>
      </div>
    </>
  );
}

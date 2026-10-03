import Link from "next/link";
import { ArrowLeft, FileDown, FileText, Layers } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { AngebotAngaben, AuftragHinweis, AuftragSchritte, FristenListe, LieferungenListe, RechnungenKarte, RueckfragenKarte, TermineKarte, VerlaufKarte, datum, eur } from "@/components/Portal/Gutachter/Akte";
import { AngebotFormular, AnfrageAblehnen, AuftragBestaetigen, BerichtFormular, LieferungHochladen } from "@/components/Portal/Gutachter/Aktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";
import { planungBackend } from "@/lib/plattform/backend/planung";
import { LAENDER } from "@/lib/plattform/konstanten";

export const metadata = { title: "Gutachterauftrag" };

// Auftrag aus Sicht des Gutachters: nur eigener Auftrag (fremd → 404); Unterlagen und Pläne erst nach Bestätigung
export default async function GutachterAuftragSeite({ params }) {
  const n = await portalNutzer({ rollen: ["gutachter"] });
  const { id } = await params;
  const a = await laden(() => gutachterBackend().gaAuftrag(n, id));
  const r = a.rechte;
  const bestaetigt = !!a.beauftragung?.bestaetigtAm;
  // Planunterlagen am Meilenstein (Modul Planung) – nur sichtbar, wenn der Gutachter dem Meilenstein zugewiesen ist
  let plaene = [];
  if (bestaetigt && a.projekt?.meilenstein) {
    try {
      const pl = await planungBackend().planungListe(n, a.projekt.id);
      plaene = (pl.plaene || []).filter((p) => p.meilensteinId === a.projekt.meilenstein.id);
    } catch {
      plaene = [];
    }
  }
  const letzte = a.lieferungen[0];
  return (
    <>
      <Link href="/portal/gutachter" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Alle Aufträge</Link>
      <SeitenKopf eyebrow={`${a.fachgebietLabel} · ${a.projekt?.titel || ""}`} titel={a.titel} text={[a.projekt?.gemeinde, a.projekt?.bundesland, LAENDER[a.projekt?.land]].filter(Boolean).join(" · ")}>
        <div className="mt-3 flex flex-wrap items-center gap-2"><Badge ton={a.statusTon}>{a.statusLabel}</Badge>{a.beauftragung?.nummer && <Badge>{a.beauftragung.nummer}</Badge>}</div>
        <div className="mt-3"><AuftragSchritte schritt={a.schritt} status={a.statusLabel} /></div>
      </SeitenKopf>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AuftragHinweis a={a} />
          {a.status === "nachbesserung" && letzte?.maengel?.length > 0 && <Hinweis ton="warn" titel={`Nachbesserung zu Version ${letzte.version}`}>Bitte die gemeldeten Punkte bearbeiten und eine neue Version hochladen.</Hinweis>}
          {a.status === "beauftragt" && (
            <Karte titel="Auftrag bestätigen" untertitel={`Beauftragt am ${datum(a.beauftragung.am)} · Liefertermin ${datum(a.beauftragung.liefertermin)}`}>
              <div className="space-y-4">
                {a.beauftragung.bedingungen && <p className="whitespace-pre-line text-[14px] text-ink-700">{a.beauftragung.bedingungen}</p>}
                <a href={`/api/portal/gutachter/${a.id}/pdf?art=auftrag`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><FileDown aria-hidden="true" className="h-4 w-4" />Auftragsbestätigung (PDF)</a>
                <AuftragBestaetigen id={a.id} />
              </div>
            </Karte>
          )}
          <Karte titel="Leistung">
            <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink-800">{a.leistung}</p>
            {a.hinweise && <p className="mt-3 text-[13.5px] text-ink-600">Hinweise: {a.hinweise}</p>}
            <div className="mt-4"><Angaben spalten={3} items={[
              { label: "Projekt", wert: `${a.projekt?.titel || ""}${a.projekt?.mwp ? ` · ${String(a.projekt.mwp).replace(".", ",")} ${a.projekt.typ === "speicher" ? "MW" : "MWp"}` : ""}` },
              { label: "Meilenstein", wert: a.projekt?.meilenstein?.titel || "–" },
              { label: a.status === "angefragt" ? "Angebotsfrist" : "Liefertermin", wert: datum(a.status === "angefragt" ? a.angebotsfrist : a.liefertermin) },
              ...(a.wunschtermin ? [{ label: "Gewünschter Abgabetermin", wert: datum(a.wunschtermin) }] : []),
            ]} /></div>
          </Karte>
          {r.angebot ? (
            <Karte titel={a.angebot ? `Ihr Angebot (Version ${a.angebot.version}) aktualisieren` : "Angebot abgeben"} untertitel={`Frist ${datum(a.angebotsfrist)} – Honorar netto, Nebenkosten, Umsatzsteuer und Zahlungsbedingungen`}>
              <AngebotFormular id={a.id} start={a.angebot} land={a.projekt?.land} />
              <details className="mt-5"><summary className="cursor-pointer text-[13.5px] font-semibold text-ink-600">Anfrage ablehnen</summary><div className="mt-3"><AnfrageAblehnen id={a.id} /></div></details>
            </Karte>
          ) : a.angebot ? (
            <Karte titel="Angebot" untertitel={`Version ${a.angebot.version}`} aktion={a.beauftragung ? <a href={`/api/portal/gutachter/${a.id}/pdf?art=auftrag`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ov-700 hover:text-ov-800"><FileDown aria-hidden="true" className="h-4 w-4" />Auftragsbestätigung</a> : null}><AngebotAngaben g={a.angebot} /></Karte>
          ) : null}
          {bestaetigt && a.status !== "storniert" && (
            <Karte titel="Lieferungen" untertitel="Jede Einreichung erhält eine Version; die Projektleitung prüft und gibt frei oder meldet Mängel.">
              <LieferungenListe a={a} />
              {r.liefern && <div className="mt-4"><LieferungHochladen id={a.id} /></div>}
              {a.abnahme && <p className="mt-4 text-[13.5px] text-ov-800">Abgenommen am {datum(a.abnahme.am)} (Version {a.abnahme.version}). <a href={`/api/portal/gutachter/${a.id}/pdf?art=abnahme`} className="font-semibold underline">Abnahmeprotokoll (PDF)</a></p>}
            </Karte>
          )}
          {bestaetigt && (r.bericht || a.berichte.length > 0) && (
            <Karte titel="Zwischenstände" untertitel={`Fortschritt ${a.fortschritt} %`}>
              <ul className="mb-4 space-y-2">{a.berichte.map((b) => <li key={b.id} className="text-[13.5px]"><span className="font-semibold text-ink-900">{b.fortschritt} %</span> <span className="text-ink-500">· {datum(b.am)}</span><br /><span className="text-ink-700">{b.text}</span></li>)}</ul>
              {r.bericht && <BerichtFormular id={a.id} letzter={a.fortschritt} />}
            </Karte>
          )}
          {bestaetigt && <RechnungenKarte a={a} bo={false} />}
        </div>
        <div className="space-y-6">
          <Karte titel="Fristen"><FristenListe fristen={a.fristen} leer="Keine offenen Fristen." /></Karte>
          {bestaetigt ? (
            <Karte titel="Projektunterlagen" untertitel="Von ÖkoInvest für Sie freigegeben" innen="p-0">
              <ul className="divide-y divide-ink-100">
                {a.unterlagen.map((d) => <li key={d.id} className="flex items-center gap-2 px-5 py-3 text-[14px]"><FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" /><a href={d.link} className="min-w-0 truncate font-semibold text-ov-700 hover:text-ov-800">{d.name}</a><span className="ml-auto text-[12px] text-ink-500">{datum(d.am)}</span></li>)}
                {plaene.map((p) => <li key={p.id} className="flex items-center gap-2 px-5 py-3 text-[14px]"><Layers aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />{p.versionen[0]?.vorschau?.seite ? <Link href={p.versionen[0].vorschau.seite} className="min-w-0 truncate font-semibold text-ov-700 hover:text-ov-800">{p.plannummer} {p.titel}</Link> : <span className="min-w-0 truncate font-semibold text-ink-900">{p.plannummer} {p.titel}</span>}<span className="ml-auto text-[12px] text-ink-500">Index {p.index || "–"} · {p.statusLabel}</span></li>)}
                {!a.unterlagen.length && !plaene.length && <li className="px-5 py-4 text-[14px] text-ink-500">Noch keine Unterlagen freigegeben – fragen Sie bei Bedarf über „Rückfragen“ nach.</li>}
              </ul>
              {a.projekt && <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] text-ink-500">Alle Pläne des Projekts: <Link href={`/portal/entwicklung/${a.projekt.id}`} className="font-semibold text-ov-700 hover:text-ov-800">Projektentwicklung</Link></p>}
            </Karte>
          ) : (
            <Hinweis ton="neutral" titel="Projektunterlagen">Freigegebene Unterlagen und Pläne sehen Sie, sobald Sie beauftragt wurden und den Auftrag bestätigt haben.</Hinweis>
          )}
          {bestaetigt && <TermineKarte a={a} bo={false} />}
          <RueckfragenKarte a={a} bo={false} />
          {a.angebot && <p className="text-[12.5px] text-ink-500">Auftragssumme {eur(a.angebot.summeNetto)} netto / {eur(a.angebot.summeBrutto)} brutto.</p>}
          <VerlaufKarte verlauf={a.verlauf} />
        </div>
      </div>
    </>
  );
}

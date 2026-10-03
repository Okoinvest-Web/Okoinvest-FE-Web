import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { AngebotAngaben, AuftragHinweis, AuftragSchritte, FristenListe, LieferungenListe, RechnungenKarte, RueckfragenKarte, TermineKarte, VerlaufKarte, datum, eur } from "@/components/Portal/Gutachter/Akte";
import { AbnahmeFormular, BeauftragenFormular, BewertungFormular, GrundAktion, LieferterminFormular, LieferungPruefen, NotizFormular } from "@/components/Portal/Gutachter/Aktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";
import { AUFTRAG_STATUS, BEWERTUNG_KRITERIEN } from "@/lib/plattform/gutachter/kern";

export const metadata = { title: "Gutachterauftrag" };

// Backoffice-Sicht eines Auftrags: Angebotsvergleich der Anfragegruppe, Beauftragung, Prüfung, Abnahme, Rechnungen, Bewertung
export default async function GutachterAuftragAdmin({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const a = await laden(() => gutachterBackend().gaAuftrag(n, id));
  const r = a.darfSchreiben ? a.rechte : {};
  const inPruefung = a.lieferungen.find((l) => l.status === "zur_pruefung");
  return (
    <>
      <Link href={a.projekt ? `/portal/admin/gutachter?projekt=${a.projekt.id}` : "/portal/admin/gutachter"} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Gutachteraufträge</Link>
      <SeitenKopf eyebrow={`${a.fachgebietLabel} · ${a.projekt?.titel || ""}`} titel={a.titel} text={`${a.gutachter.name}${a.gutachter.firma ? `, ${a.gutachter.firma}` : ""}${a.verantwortlich ? ` · verantwortlich ${a.verantwortlich}` : ""}`}>
        <div className="mt-3 flex flex-wrap items-center gap-2"><Badge ton={a.statusTon}>{a.statusLabel}</Badge>{a.beauftragung?.nummer && <Badge>{a.beauftragung.nummer}</Badge>}{a.projekt && <Link href={`/portal/admin/entwicklung/${a.projekt.id}`} className="text-[13px] font-semibold text-ov-700 hover:text-ov-800">Zum Entwicklungsprojekt</Link>}</div>
        <div className="mt-3"><AuftragSchritte schritt={a.schritt} status={a.statusLabel} /></div>
      </SeitenKopf>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AuftragHinweis a={a} />
          {a.gruppe.auftraege.length > 1 && (
            <Karte titel="Angebotsvergleich" untertitel="Punkte: 50 % Preis, 25 % Liefertermin, 25 % interne Bewertung – Entscheidung trifft die Projektleitung" innen="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-ink-500"><th className="px-5 py-2.5">Büro</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Netto</th><th className="px-3 py-2.5">Liefertermin</th><th className="px-3 py-2.5 text-right">Bewertung</th><th className="px-5 py-2.5 text-right">Punkte</th></tr></thead>
                  <tbody className="divide-y divide-ink-100">
                    {a.gruppe.auftraege.map((x) => {
                      const v = a.gruppe.vergleich.find((z) => z.id === x.id);
                      return (
                        <tr key={x.id} className={x.id === a.id ? "bg-ov-50/60" : ""}>
                          <th scope="row" className="px-5 py-2.5 text-left font-semibold text-ink-900"><Link href={`/portal/admin/gutachter/${x.id}`} className="hover:text-ov-700">{v ? `${v.rang}. ` : ""}{x.gutachter.name}</Link></th>
                          <td className="px-3 py-2.5"><Badge ton={AUFTRAG_STATUS[x.status]?.ton}>{x.statusLabel}</Badge></td>
                          <td className="ov-num px-3 py-2.5 text-right">{x.angebot ? eur(x.angebot.summeNetto) : "–"}{v?.guenstigstes ? " (günstigstes)" : ""}</td>
                          <td className="px-3 py-2.5">{x.angebot ? datum(x.angebot.liefertermin) : "–"}</td>
                          <td className="ov-num px-3 py-2.5 text-right">{x.gutachter.schnitt ? String(x.gutachter.schnitt.schnitt).replace(".", ",") : "–"}</td>
                          <td className="ov-num px-5 py-2.5 text-right font-semibold">{v ? String(v.punkte).replace(".", ",") : "–"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Karte>
          )}
          <Karte titel="Leistung" untertitel={`Angefragt am ${datum(a.erstelltAm)} · Angebotsfrist ${datum(a.angebotsfrist)}${a.wunschtermin ? ` · Wunschtermin ${datum(a.wunschtermin)}` : ""}`}>
            <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink-800">{a.leistung}</p>
            {a.hinweise && <p className="mt-3 text-[13.5px] text-ink-600">Hinweise: {a.hinweise}</p>}
            {a.projekt?.meilenstein && <p className="mt-3 text-[13.5px] text-ink-600">Meilenstein: <strong className="text-ink-900">{a.projekt.meilenstein.titel}</strong> – Zuweisung nach Bestätigung durch den Gutachter.</p>}
          </Karte>
          <Karte titel="Angebot" untertitel={a.angebot ? `Version ${a.angebot.version} vom ${datum(a.angebot.am)}` : "Noch nicht abgegeben"} aktion={a.beauftragung ? <a href={`/api/admin/gutachter/${a.id}/pdf?art=auftrag`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ov-700 hover:text-ov-800"><FileDown aria-hidden="true" className="h-4 w-4" />Auftragsbestätigung</a> : null}>
            <AngebotAngaben g={a.angebot} />
            {a.beauftragung && <p className="mt-4 text-[13.5px] text-ink-700">Beauftragt {datum(a.beauftragung.am)} von {a.beauftragung.von} · Liefertermin {datum(a.beauftragung.liefertermin)} · {a.beauftragung.bestaetigtAm ? `bestätigt ${datum(a.beauftragung.bestaetigtAm)}` : "Bestätigung durch den Gutachter offen"}</p>}
            {r.beauftragen && <div className="mt-5 border-t border-ink-100 pt-5"><BeauftragenFormular id={a.id} liefertermin={a.angebot?.liefertermin} /></div>}
            {r.ablehnen && <details className="mt-4"><summary className="cursor-pointer text-[13.5px] font-semibold text-ink-600">{a.status === "angefragt" ? "Anfrage zurückziehen" : "Angebot nicht annehmen"}</summary><div className="mt-3"><GrundAktion id={a.id} aktionName="angebot_ablehnen" knopf="Nicht beauftragen" label="Grund (optional, für den Gutachter sichtbar)" meldung="Der Gutachter wurde informiert." /></div></details>}
          </Karte>
          {(a.lieferungen.length > 0 || a.beauftragung) && (
            <Karte titel="Lieferungen & Prüfung" untertitel="Freigabe der Endfassung macht den Auftrag abnahmebereit">
              <LieferungenListe a={a} />
              {r.pruefen && inPruefung && <div className="mt-4 border-t border-ink-100 pt-4"><LieferungPruefen id={a.id} lieferung={inPruefung} /></div>}
              {r.abnehmen && <div className="mt-4 border-t border-ink-100 pt-4"><AbnahmeFormular id={a.id} /></div>}
              {a.abnahme && <p className="mt-4 text-[13.5px] text-ov-800">Abgenommen {datum(a.abnahme.am)} von {a.abnahme.von} (Version {a.abnahme.version}){a.abnahme.vorbehalt ? ` – Vorbehalt: ${a.abnahme.vorbehalt}` : ""}. <a href={`/api/admin/gutachter/${a.id}/pdf?art=abnahme`} className="font-semibold underline">Abnahmeprotokoll (PDF)</a></p>}
            </Karte>
          )}
          {a.berichte.length > 0 && (
            <Karte titel="Zwischenstände" untertitel={`Fortschritt ${a.fortschritt} %`}>
              <ul className="space-y-2">{a.berichte.map((b) => <li key={b.id} className="text-[13.5px]"><span className="font-semibold text-ink-900">{b.fortschritt} %</span> <span className="text-ink-500">· {datum(b.am)}</span><br /><span className="text-ink-700">{b.text}</span></li>)}</ul>
            </Karte>
          )}
          {a.beauftragung && <RechnungenKarte a={a} bo darfZahlung={a.darfZahlung} />}
        </div>
        <div className="space-y-6">
          <Karte titel="Fristen"><FristenListe fristen={a.fristen} leer="Keine offenen Fristen." /></Karte>
          {r.liefertermin && <Karte titel="Liefertermin ändern" untertitel={`Aktuell ${datum(a.liefertermin)}`}><LieferterminFormular id={a.id} liefertermin={a.liefertermin} /></Karte>}
          {a.beauftragung && <TermineKarte a={{ ...a, rechte: r }} bo />}
          <RueckfragenKarte a={{ ...a, rechte: r }} bo />
          {(r.bewerten || a.bewertung) && (
            <Karte titel="Interne Bewertung" untertitel="Nur für das Backoffice sichtbar – fließt in den Angebotsvergleich ein">
              {a.bewertung && <div className="mb-4"><Angaben spalten={2} items={[...Object.entries(BEWERTUNG_KRITERIEN).map(([k, l]) => ({ label: l, wert: `${a.bewertung[k]} / 5` })), { label: "Durchschnitt", wert: String(a.bewertung.schnitt).replace(".", ",") }, ...(a.bewertung.kommentar ? [{ label: "Kommentar", wert: a.bewertung.kommentar, breit: true }] : [])]} /></div>}
              {r.bewerten && <details><summary className="cursor-pointer text-[14px] font-semibold text-ov-700">{a.bewertung ? "Bewertung ändern" : "Jetzt bewerten"}</summary><div className="mt-3"><BewertungFormular id={a.id} start={a.bewertung} /></div></details>}
            </Karte>
          )}
          {a.darfSchreiben && <Karte titel="Interne Notiz"><NotizFormular id={a.id} notiz={a.notiz} /></Karte>}
          {r.stornieren && (
            <Karte titel="Auftrag stornieren">
              <Hinweis ton="warn">Eine Stornierung nach Beauftragung kann Vergütungsansprüche für bereits erbrachte Leistungen auslösen – vorher mit dem Büro und ggf. der Rechtsberatung klären.</Hinweis>
              <div className="mt-3"><GrundAktion id={a.id} aktionName="stornieren" knopf="Stornieren" label="Begründung (für den Gutachter sichtbar)" meldung="Storniert." pflicht gefahr /></div>
            </Karte>
          )}
          <VerlaufKarte verlauf={a.verlauf} />
        </div>
      </div>
    </>
  );
}

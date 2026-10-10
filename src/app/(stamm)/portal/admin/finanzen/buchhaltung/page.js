import Link from "next/link";
import { AlertTriangle, BellRing, BookOpenCheck, CalendarCheck2, FileDown, FileSpreadsheet, Hash, Landmark, ListChecks, ReceiptText, Undo2, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte, SeitenKopf } from "@/components/Portal/ui";
import Reiter from "@/components/Portal/Anlagen/Reiter";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { euro, euro0, tag } from "@/components/Portal/Finanzen/teile";
import { AbschlussCheckliste, BelegAktionen, ExportFormular, KontenFormular, MahnKonfig, Mahnlauf, StornoFormular, ZahlungImport, ZahlungsListe } from "@/components/Portal/Buchhaltung/Werkzeuge";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";
import { ALTERSKLASSEN } from "@/lib/plattform/buchhaltung/op";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Buchhaltung – OP, Mahnwesen, Zahlungen, Abschluss" };

const REITER = [
  { id: "uebersicht", label: "Offene Posten", icon: Wallet },
  { id: "mahnwesen", label: "Mahnwesen", icon: BellRing },
  { id: "zahlungen", label: "Zahlungseingang", icon: Landmark },
  { id: "storno", label: "Storno & Korrektur", icon: Undo2 },
  { id: "export", label: "Export & Konten", icon: FileDown },
  { id: "abschluss", label: "Monatsabschluss", icon: CalendarCheck2 },
  { id: "nummern", label: "Nummernkreise & Steuer", icon: Hash },
];

const vormonatVon = (heute) => {
  const [j, m] = heute.split("-").map(Number);
  return m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, "0")}`;
};

export default async function BuchhaltungSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const tab = REITER.some((r) => r.id === sp.tab) ? sp.tab : "uebersicht";
  const w = werkzeugeBackend();
  const u = await laden(() => w.bhUebersicht(n));
  const darf = u.darfSchreiben;
  const s = u.op.summen;
  const vormonat = vormonatVon(u.heute);
  const tabs = REITER.map((r) => ({ ...r, zaehler: r.id === "mahnwesen" ? u.mahnvorschlaege.filter((x) => x.faellig).length : r.id === "zahlungen" ? u.eingaenge.offen : r.id === "nummern" ? u.steuerCheck.length : 0 }));

  let inhalt = null;
  if (tab === "uebersicht") {
    const maxKlasse = Math.max(1, ...Object.values(s.jeKlasse));
    inhalt = (
      <>
        <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Wert ton="dunkel" icon={Wallet} label="Forderungen offen" wert={euro0(s.forderungen)} hinweis={`${u.op.posten.filter((p) => p.richtung === "forderung").length} Rechnungen`} />
          <Wert icon={AlertTriangle} label="davon überfällig" wert={euro0(s.ueberfaellig)} />
          <Wert icon={ReceiptText} label="Verbindlichkeiten (Gutschriften)" wert={euro0(s.verbindlichkeiten)} />
          <Wert icon={BellRing} label="Mahnkosten offen" wert={euro(s.mahnkosten)} />
        </section>
        <Karte className="mb-6" titel="Altersstruktur der Forderungen" untertitel="Offene Beträge nach Tagen über Fälligkeit">
          <ul className="space-y-2">
            {ALTERSKLASSEN.map((k) => (
              <li key={k.id} className="grid grid-cols-[110px_minmax(0,1fr)_110px] items-center gap-3 text-[13.5px]">
                <span className="text-ink-700">{k.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true"><span className={cn("block h-full rounded-full", k.id === "t90" || k.id === "t61_90" ? "bg-sun-500" : "bg-ov-500")} style={{ width: `${Math.round((s.jeKlasse[k.id] / maxKlasse) * 100)}%` }} /></span>
                <span className="ov-num text-right font-semibold text-ink-900">{euro0(s.jeKlasse[k.id])}</span>
              </li>
            ))}
          </ul>
        </Karte>
        <Karte titel="OP-Liste" untertitel={`${u.op.anzahl} offene Posten · Forderungen und Gutschriften`} innen="p-0" aktion={u.darfExport ? <Button href="/api/admin/finanzen/buchhaltung/export?format=op" size="sm" variant="secondary" icon={FileSpreadsheet}>CSV</Button> : null}>
          {u.op.posten.length ? (
            <ul className="divide-y divide-ink-100">
              {u.op.posten.map((p) => (
                <li key={p.id} className="px-5 py-3 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink-900"><span className="ov-num">{p.nummer}</span> <span className="font-normal text-ink-600">· {p.empfaenger}</span></p>
                      <p className="text-[12.5px] text-ink-600">{p.richtung === "forderung" ? "Forderung" : "Gutschrift"} · fällig {tag(p.faelligAm)} · {p.altersklasseLabel}{p.mahnstufe ? ` · Mahnstufe ${p.mahnstufe}` : ""}{p.gezahlt ? ` · bereits gezahlt ${euro(p.gezahlt)}` : ""}{p.gesellschaft ? ` · ${p.gesellschaft}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="ov-num font-semibold text-ink-900">{euro(p.offen)}</p>
                      {p.tageUeberfaellig > 0 ? <Badge ton="warn">{p.tageUeberfaellig} Tage</Badge> : <Badge>{p.status === "angewiesen" ? "angewiesen" : "offen"}</Badge>}
                    </div>
                  </div>
                  {darf && <BelegAktionen beleg={{ id: p.id, beleg: p.beleg, art: p.art, status: p.status }} heute={u.heute} />}
                </li>
              ))}
            </ul>
          ) : <p className="px-6 py-8 text-center text-[14px] text-ink-500">Keine offenen Posten.</p>}
        </Karte>
      </>
    );
  } else if (tab === "mahnwesen") {
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Karte titel="Mahnvorschläge" untertitel="Überfällige Rechnungen – Stufe, Gebühr und neue Frist nach Konfiguration" innen="p-0">
          <Mahnlauf vorschlaege={u.mahnvorschlaege} darf={darf} />
        </Karte>
        <div className="min-w-0 space-y-6">
          <Karte titel="Erstellte Mahnungen" innen="p-0">
            {u.mahnungen.length ? (
              <ul className="divide-y divide-ink-100">
                {u.mahnungen.map((m) => (
                  <li key={m.nr} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px] md:px-6">
                    <span><span className="ov-num font-semibold text-ink-900">{m.nr}</span> · {m.label} zu {m.nummer} · {m.empfaenger}{m.storniert ? " · storniert" : ""}</span>
                    <span className="flex items-center gap-2"><span className="ov-num">{euro(m.gesamt)}</span><a className="font-semibold text-ov-700 hover:text-ov-800" href={`/api/admin/finanzen/buchhaltung/belege/${m.belegId}/dokument?art=mahnung&nr=${encodeURIComponent(m.nr)}&anzeigen=1`} target="_blank" rel="noopener">PDF</a></span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-6 py-6 text-[14px] text-ink-500">Noch keine Mahnungen erstellt.</p>}
          </Karte>
          <Karte titel="Mahnstufen & Gebühren" untertitel="Konfiguration für alle Gesellschaften">
            {darf ? <MahnKonfig konfig={u.mahnwesen} /> : <p className="text-[14px] text-ink-600">{u.mahnwesen.stufen.map((x) => `${x.label}: ab ${x.abTagen} Tagen, ${euro(x.gebuehr)}, Frist ${x.fristTage} Tage`).join(" · ")}</p>}
          </Karte>
        </div>
      </div>
    );
  } else if (tab === "zahlungen") {
    const offene = u.op.posten.filter((p) => p.richtung === "forderung" || p.status === "angewiesen").map((p) => ({ id: p.id, nummer: p.nummer, beleg: p.beleg, empfaenger: p.empfaenger, offen: p.offen }));
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="min-w-0 space-y-6">
          {darf && <Karte titel="Kontoauszug einlesen"><ZahlungImport /></Karte>}
          <Karte titel="Letzte Importe" innen="p-0">
            {u.importe.length ? (
              <ul className="divide-y divide-ink-100">
                {u.importe.map((i) => <li key={i.id} className="px-5 py-3 text-[13.5px] md:px-6"><p className="font-semibold text-ink-900">{i.dateiname} <Badge className="ml-1">{i.format.toUpperCase()}</Badge></p><p className="text-ink-600">{tag(i.am.slice(0, 10))} · {i.neu} neu · {i.doppelt} Dubletten · {i.sicher} sichere Treffer · {i.vonName}</p></li>)}
              </ul>
            ) : <p className="px-6 py-6 text-[14px] text-ink-500">Noch kein Kontoauszug importiert.</p>}
          </Karte>
        </div>
        <Karte titel="Buchungen" untertitel={`${u.eingaenge.offen} offen · Eingänge → Rechnungen, Ausgänge → angewiesene Gutschriften (SEPA-Referenz = Belegnummer)`} innen="p-0">
          <ZahlungsListe eingaenge={u.eingaenge.liste} offeneBelege={offene} darf={darf} />
        </Karte>
      </div>
    );
  } else if (tab === "storno") {
    const belege = darf ? await laden(() => finanzenBackend().finanzAbrechnungen(n, { limit: 400 })) : [];
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {darf && <Karte titel="Beleg stornieren" untertitel="Stornorechnung bzw. Storno-Gutschrift mit Verweis auf den Ursprungsbeleg"><StornoFormular belege={belege.filter((b) => b.status !== "storniert").map((b) => ({ id: b.id, nummer: b.nummer, empfaenger: b.empfaenger, brutto: b.brutto, status: b.status, beleg: b.beleg, art: b.art }))} /></Karte>}
        <Karte titel="Stornobelege" innen="p-0">
          {u.stornos.length ? (
            <ul className="divide-y divide-ink-100">
              {u.stornos.map((x) => (
                <li key={x.id} className="px-5 py-3 text-[13.5px] md:px-6">
                  <p className="flex flex-wrap items-center justify-between gap-2"><span><span className="ov-num font-semibold text-ink-900">{x.nummer}</span> storniert {x.ursprungNummer} · {x.empfaenger}</span><span className="ov-num font-semibold">{euro(x.brutto)}</span></p>
                  <p className="text-ink-600">{tag(x.datum)} · {x.grund} · {x.vonName}{x.erstattung ? ` · ${x.erstattung.richtung === "an_empfaenger" ? "Erstattung" : "Rückforderung"} ${euro(x.erstattung.betrag)} (Aufgabe angelegt)` : ""}</p>
                  <a className="text-[13px] font-semibold text-ov-700 hover:text-ov-800" href={`/api/admin/finanzen/buchhaltung/belege/${x.ursprungId}/dokument?art=storno&anzeigen=1`} target="_blank" rel="noopener">Stornobeleg (PDF)</a>
                </li>
              ))}
            </ul>
          ) : <p className="px-6 py-6 text-[14px] text-ink-500">Noch keine Stornobelege.</p>}
        </Karte>
      </div>
    );
  } else if (tab === "export") {
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Buchungsexport an die Steuerberatung" untertitel="DATEV (Deutschland) oder BMD (Österreich)">
          {u.darfExport ? <ExportFormular vormonat={vormonat} /> : <p className="text-[14px] text-ink-600">Ihre Rolle erlaubt keine Exporte.</p>}
          {u.exporte.length > 0 && (
            <ul className="mt-5 divide-y divide-ink-100 border-t border-ink-100 text-[13px]">
              {u.exporte.map((x) => <li key={x.id} className="py-2 text-ink-600"><span className="font-semibold text-ink-900">{x.format.toUpperCase()}</span> {tag(x.von)} – {tag(x.bis)} · {x.anzahl} Buchungen · {tag(x.am.slice(0, 10))} · {x.vonName}</li>)}
            </ul>
          )}
        </Karte>
        <Karte titel="Kontenzuordnung" untertitel="Sachkonten, Personenkonten, Bank">
          {darf ? <KontenFormular konten={u.konten} /> : <p className="text-[14px] text-ink-600">Nur für Buchhaltung und Leitung.</p>}
        </Karte>
      </div>
    );
  } else if (tab === "abschluss") {
    const monat = /^20\d\d-(0[1-9]|1[0-2])$/.test(String(sp.monat || "")) && sp.monat <= u.heute.slice(0, 7) ? sp.monat : vormonat;
    const a = await laden(() => w.bhAbschluss(n, monat));
    const monate = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(Number(u.heute.slice(0, 4)), Number(u.heute.slice(5, 7)) - 1 - i, 1));
      monate.push(d.toISOString().slice(0, 7));
    }
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Karte titel={`Monatsabschluss ${monat.split("-").reverse().join("/")}`} untertitel={`${a.statusLabel}${a.vonName ? ` · ${a.vonName}` : ""} · ${a.erledigt} von ${a.gesamt} Punkten erledigt`} innen="p-0">
          <AbschlussCheckliste abschluss={a} darf={darf} />
        </Karte>
        <div className="min-w-0 space-y-6">
          <Karte titel="Monat wählen">
            <div className="flex flex-wrap gap-1.5">
              {monate.map((m) => {
                const st = u.abschluesse.find((x) => x.monat === m)?.status;
                return <Link key={m} href={`/portal/admin/finanzen/buchhaltung?tab=abschluss&monat=${m}`} aria-current={m === monat ? "page" : undefined} className={cn("inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ring-1 ring-inset", m === monat ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200")}>{m.split("-").reverse().join("/")}{st === "abgeschlossen" && <BookOpenCheck aria-hidden="true" className="h-3.5 w-3.5" />}</Link>;
              })}
            </div>
          </Karte>
          <Karte titel="Steuerfristen (Orientierung)" untertitel="Nach aktuellem Stand – mit der Steuerberatung abstimmen">
            <ul className="space-y-2 text-[13.5px] text-ink-700">{a.fristen.map((f) => <li key={f.land}><strong>{f.land}</strong> · {f.text}</li>)}</ul>
          </Karte>
          {a.ust && (
            <Karte titel="USt-Verprobung des Monats" untertitel={`${a.ust.summen.belege} Belege nach Rechnungsdatum – Vorbereitung UVA/UStVA/MWST`} innen="p-0">
              {a.ust.zeilen.length === 0 ? <p className="p-4 text-[13.5px] text-ink-600">Keine Belege im Monat.</p> : (
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-ink-100 text-left text-ink-500"><th className="px-4 py-2 font-semibold">Steuervorlage</th><th className="px-2 py-2 text-right font-semibold">Belege</th><th className="px-2 py-2 text-right font-semibold">Netto</th><th className="px-4 py-2 text-right font-semibold">USt</th></tr></thead>
                  <tbody>
                    {a.ust.zeilen.map((z) => (
                      <tr key={z.vorlage} className="border-b border-ink-100/60 text-ink-700">
                        <td className="px-4 py-1.5">{z.label}{z.stornos > 0 && <span className="text-ink-400"> · {z.stornos} Storno{z.stornos > 1 ? "s" : ""}</span>}</td>
                        <td className="px-2 py-1.5 text-right">{z.anzahl + z.stornos}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{euro(z.netto)}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums">{euro(z.steuer)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold text-ink-800"><td className="px-4 py-2">Summe</td><td className="px-2 py-2 text-right">{a.ust.summen.belege}</td><td className="px-2 py-2 text-right tabular-nums">{euro(a.ust.summen.netto)}</td><td className="px-4 py-2 text-right tabular-nums">{euro(a.ust.summen.steuer)}</td></tr>
                  </tbody>
                </table>
              )}
              <p className="px-4 pb-3 pt-2 text-[12.5px] text-ink-500">{a.ust.hinweis}</p>
            </Karte>
          )}
          {a.verlauf.length > 0 && <Karte titel="Verlauf"><ul className="space-y-1 text-[13px] text-ink-600">{a.verlauf.slice().reverse().map((x, i) => <li key={i}>{tag(x.am.slice(0, 10))} · {x.vonName}: {x.text}</li>)}</ul></Karte>}
        </div>
      </div>
    );
  } else if (tab === "nummern") {
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Nummernkreise" untertitel="Fortlaufend je Kreis und Jahr, lückenlos (Pflichtangabe „fortlaufende Nummer“)" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {u.nummernkreise.map((k) => <li key={`${k.kreis}-${k.jahr}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px] md:px-6"><span><strong className="ov-num">{k.kreis}</strong> · {k.label} · {k.jahr}</span><span className="ov-num text-ink-600">{k.anzahl} vergeben · zuletzt {k.letzte} · nächste {k.naechste}</span></li>)}
          </ul>
          {u.luecken.length > 0 ? (
            <p className="border-t border-ink-100 px-5 py-3 text-[13px] text-ink-700 md:px-6"><AlertTriangle aria-hidden="true" className="mr-1 inline h-4 w-4" />Lücken prüfen: {u.luecken.map((l) => `${l.kreis}: ${l.fehlt.slice(0, 5).join(", ")}${l.fehlt.length > 5 ? " …" : ""}`).join(" · ")} (z. B. Testbelege – dokumentieren)</p>
          ) : <p className="border-t border-ink-100 px-5 py-3 text-[13px] text-ink-500 md:px-6">Keine Lücken in den vergebenen Nummern.</p>}
        </Karte>
        <Karte titel="Steuer-Check" untertitel="Pflichtangaben, UID und Reverse Charge je Beleg" innen="p-0">
          {u.steuerCheck.length ? (
            <ul className="divide-y divide-ink-100">
              {u.steuerCheck.map((x) => <li key={x.id} className="px-5 py-3 text-[13.5px] md:px-6"><p className="font-semibold text-ink-900"><span className="ov-num">{x.nummer}</span> · {x.empfaenger} <Badge className="ml-1">{x.status}</Badge></p><p className="text-ink-600">{x.steuer} · fehlt: {x.fehlt.join(", ")}</p></li>)}
            </ul>
          ) : <p className="px-6 py-6 text-[14px] text-ink-500">Keine Auffälligkeiten.</p>}
          <p className="border-t border-ink-100 px-5 py-3 text-[12.5px] leading-relaxed text-ink-500 md:px-6">Reverse Charge (AT § 3a Abs. 6 / § 19 UStG 1994, DE § 13b UStG) nur mit gültiger UID des Empfängers (Bestätigungsverfahren/MIAS) und beiden UID auf der Rechnung; Zusammenfassende Meldung beachten. AT: über 10.000 € brutto UID des Empfängers Pflicht. CH: Leistungen an Empfänger in der Schweiz sind in AT nicht steuerbar – MWST-Pflicht in der Schweiz prüfen.</p>
        </Karte>
      </div>
    );
  }

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Buchhaltung"
        titel="Buchhaltung"
        text="Offene Posten, Mahnwesen mit Stufen und Gebühren, Zahlungseingang aus CAMT/CSV, Storno- und Korrekturbelege, DATEV-/BMD-Export und Monatsabschluss. Abrechnungsläufe, SEPA und Pachtverträge unter „Finanzen & Abrechnung“."
        aktionen={<Button href="/portal/admin/finanzen" size="sm" variant="secondary" icon={ListChecks}>Finanzen & Abrechnung</Button>}
      />
      <Reiter basis="/portal/admin/finanzen/buchhaltung" aktiv={tab} tabs={tabs} label="Bereiche Buchhaltung" />
      {inhalt}
    </>
  );
}

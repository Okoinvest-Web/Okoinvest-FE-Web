// /portal/kommune – Gemeindecockpit (Rolle kommune; Backoffice mit ?vorgang= als „Sicht der Gemeinde“ mit Pflege)
// Eigene kommunale Anliegen; Projekte im Gemeindegebiet erst nach Prüfung durch das Backoffice, nur ab Bauleitplanung und
// nur vereinfacht (keine Eigentümer, Flurstücke oder Pachtkonditionen). Cockpit (Team 5): Verfahrensstand je Projekt
// (Bauleitplanung bzw. Flächenwidmung) mit Terminen, Gemeinderat, Einnahmen (§ 6 EEG, Gemeindebeitrag), Bürgerbeteiligung,
// Bürgerinfo-Material/Pressetexte, Stellungnahmen und Unterlagen.

import Link from "next/link";
import { Building2, CalendarDays, Coins, FileText, LandPlot, Megaphone, MessagesSquare, Route, UserRound, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf, StatusBadge, Tabelle, zelle } from "@/components/Portal/ui";
import { DokumentListe, DokumentUpload } from "@/components/Portal/Dokumente";
import { AntwortFormular, Klappe, MaterialVorschau, SchrittPflege, StellungnahmeFormular, TerminEntfernen, TerminFormular, ZahlungEntfernen, ZahlungFormular } from "@/components/Portal/Gemeinde/Cockpit";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { fachBackend } from "@/lib/plattform/backend/kommune";
import { gemeindeBackend } from "@/lib/plattform/backend/gemeinde";
import { backend } from "@/lib/plattform/backend";
import { BAULEITPLANUNG_STAND, BUERGERBETEILIGUNG, KOMMUNE_ABSENDER, KOMMUNE_ROLLE, KOMMUNE_SICHTBAR, KOMMUNE_PHASE, KOMMUNE_THEMEN, KRITERIENKATALOG } from "@/lib/plattform/kommune";
import { SCHRITT_STATUS, STELLUNGNAHME_STATUS, TERMIN_ARTEN, TERMIN_STATUS, ZAHLUNG_ARTEN, ZAHLUNG_STATUS } from "@/lib/plattform/gemeinde/cockpit";
import { KOMMUNE } from "@/lib/invest/markt";
import { datum, datumZeit, eur } from "@/lib/plattform/format";
import { LAENDER } from "@/lib/plattform/konstanten";
import { darfLesen } from "@/lib/plattform/rechte";
import { pfad } from "@/lib/land";

export const metadata = { title: "Gemeinde" };

const fmtHa = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ha`;
const zeit = (s) => (s ? `${datum(s)}, ${s.slice(11, 16)} Uhr` : "–");

function PhasenLeiste({ status }) {
  const i = KOMMUNE_SICHTBAR.indexOf(status);
  return (
    <ol className="flex items-center gap-1" aria-label={`Phase: ${KOMMUNE_PHASE[status] || status}`}>
      {KOMMUNE_SICHTBAR.map((s, j) => (
        <li key={s} className={`h-1.5 w-8 rounded-full ${j <= i ? "bg-ov-500" : "bg-ink-200"}`} title={KOMMUNE_PHASE[s]} />
      ))}
    </ol>
  );
}

function Verfahren({ c, p }) {
  const v = p.verfahren;
  return (
    <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-semibold text-ink-900">Projekt Nr. {p.nr}: {p.art}, {fmtHa(p.ha)}</span>
          <span className="text-[13px] text-ink-500">{p.phase}{p.seit ? ` seit ${datum(p.seit)}` : ""}{p.par6 ? ` · § 6 EEG ca. ${eur(p.par6.euroProJahr)}/Jahr` : ""}</span>
        </span>
        <span className="flex items-center gap-3"><PhasenLeiste status={p.status} /><Badge ton="info">{v.erledigt}/{v.gesamt} Schritte</Badge></span>
      </div>
      {v.naechster && <p className="mt-2 text-[13.5px] text-ink-700">Nächster Schritt: <strong>{v.naechster.label}</strong>{v.naechster.datum ? ` – ${v.naechster.status === "geplant" ? "geplant" : ""} ${datum(v.naechster.datum)}` : ""}</p>}
      <details className="mt-3">
        <summary className="cursor-pointer text-[13.5px] font-semibold text-ov-700">Verfahrensschritte ({c.gemeinde.land === "DE" ? "Bauleitplanung" : c.gemeinde.land === "AT" ? "Flächenwidmung" : "Nutzungsplanung"})</summary>
        <ol className="mt-3 space-y-2">
          {v.schritte.map((s) => (
            <li key={s.id} className="rounded-xl bg-ink-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
                <span className="min-w-0 text-ink-900">{s.label} <span className="text-[12px] text-ink-500">({s.norm})</span></span>
                <span className="flex items-center gap-2">{s.datum && <span className="text-[12.5px] text-ink-500">{datum(s.datum)}</span>}<Badge ton={SCHRITT_STATUS[s.status]?.ton}>{SCHRITT_STATUS[s.status]?.label}</Badge></span>
              </div>
              {s.notiz && <p className="mt-1 text-[12.5px] text-ink-600">{s.notiz}</p>}
              {c.backofficeSchreiben && <SchrittPflege vorgangId={c.vorgangId} projektRef={p.ref} s={s} />}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function Cockpit({ c, dokumente, nutzer }) {
  const g = c.gemeinde;
  const naechster = c.termine.kommend[0];
  const jahr = Number(new Date().toISOString().slice(0, 4));
  const vereinbart = c.einnahmen.vereinbart + c.einnahmen.abgerechnet;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl icon={LandPlot} label={`Projekte in ${g.name}`} wert={String(c.projekte.length)} hinweis={`${fmtHa(c.projekte.reduce((s, p) => s + p.ha, 0))} ab Bauleitplanung`} />
        <Kennzahl icon={Coins} label={g.land === "DE" ? "§ 6 EEG pro Jahr (Schätzung)" : "Vereinbarte Beiträge"} wert={g.land === "DE" ? eur(c.par6Prognose) : eur(vereinbart)} hinweis={g.land === "DE" ? `bis ${String(KOMMUNE.beteiligungCt).replace(".", ",")} ct/kWh ab Inbetriebnahme` : "in AT/CH nur vertraglich"} />
        <Kennzahl icon={Coins} label="Gezahlt bisher" wert={eur(c.einnahmen.gezahlt)} hinweis={vereinbart ? `vereinbart/abgerechnet: ${eur(vereinbart)}` : "noch keine Zahlungen"} />
        <Kennzahl icon={CalendarDays} label="Nächster Termin" wert={naechster ? datum(naechster.beginn) : "–"} hinweis={naechster ? naechster.titel : "keine Termine eingetragen"} />
      </div>

      <Karte titel="Projekte und Verfahrensstand" untertitel="Vereinfachter Fortschritt – Details stimmen wir im Verfahren mit der Verwaltung ab" aktion={<Route aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        {c.projekte.length ? <div className="space-y-4">{c.projekte.map((p) => <Verfahren key={p.ref} c={c} p={p} />)}</div> : <p className="text-[14px] text-ink-500">Derzeit keine Projekte ab Bauleitplanung in {g.name}.</p>}
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
          {g.land === "DE" ? <><Begriff id="kommunalbeteiligung">§ 6 EEG</Begriff>: freiwillige Zahlung des Betreibers an die Gemeinde, vertraglich vereinbart, frühestens ab Inbetriebnahme. Zusätzlich fließen bei Solaranlagen 90 % des Gewerbesteuermessbetrags an die Standortgemeinde (§ 29 GewStG).</> : g.land === "AT" ? "In Österreich entscheidet der Gemeinderat über die Umwidmung (Grünland-Photovoltaik bzw. Sonderwidmung nach Landesrecht); eine Beteiligung der Gemeinde wird vertraglich vereinbart." : "In der Schweiz beschließt die Gemeinde die Nutzungsplanung, der Kanton genehmigt (Art. 26 RPG)."}
        </p>
      </Karte>

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Termine" untertitel="Gemeinderat, Ausschüsse, Bürgerinformation und Fristen" aktion={<CalendarDays aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {c.termine.kommend.length + c.termine.vergangen.length ? (
            <ul className="divide-y divide-ink-100">
              {[...c.termine.kommend, ...c.termine.vergangen.slice(0, 5)].map((t) => {
                const eigen = c.rolle === "backoffice" ? c.backofficeSchreiben : t.von === "gemeinde";
                return (
                  <li key={t.id} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0"><span className="block font-semibold text-ink-900">{t.titel}</span><span className="text-[13px] text-ink-500">{TERMIN_ARTEN[t.art]} · {zeit(t.beginn)}{t.ort ? ` · ${t.ort}` : ""}</span></span>
                      <Badge ton={t.status === "geplant" ? "info" : "neutral"}>{TERMIN_STATUS[t.status]}</Badge>
                    </div>
                    {t.notiz && <p className="mt-1 text-[13px] text-ink-600">{t.notiz}</p>}
                    {eigen && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Klappe titel="Bearbeiten" className="min-w-0 flex-1"><TerminFormular vorgangId={c.vorgangId} projekte={c.projekte} termin={t} /></Klappe>
                        <TerminEntfernen vorgangId={c.vorgangId} t={t} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Noch keine Termine. Tragen Sie Sitzungstermine des Gemeinderats ein – wir planen Unterlagen und Vorlagen danach.</p>
          )}
          {c.darfSchreiben && <Klappe titel="Termin eintragen" className="mt-4"><TerminFormular vorgangId={c.vorgangId} projekte={c.projekte} /></Klappe>}
        </Karte>

        <Karte titel="Einnahmen der Gemeinde" untertitel={g.land === "DE" ? "§ 6 EEG, Pacht, Gewerbesteuer (Prognose)" : "Gemeindebeitrag laut Vertrag, Pacht"} aktion={<Coins aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {c.zahlungen.length ? (
            <Tabelle kopf={["Jahr", "Art", "Betrag", "Status", ""]}>
              {c.zahlungen.map((z) => (
                <tr key={z.id}>
                  <td className={zelle}>{z.jahr}</td>
                  <td className={zelle}>{ZAHLUNG_ARTEN[z.art]?.label}{z.art === "par6" && z.kwh ? <span className="block text-[12.5px] text-ink-500">{z.kwh.toLocaleString("de-DE")} kWh × {String(z.ctProKwh).replace(".", ",")} ct</span> : null}{z.notiz && <span className="block text-[12.5px] text-ink-500">{z.notiz}</span>}</td>
                  <td className={`${zelle} ov-num font-semibold`}>{eur(z.betragEur)}</td>
                  <td className={zelle}><Badge ton={ZAHLUNG_STATUS[z.status]?.ton}>{ZAHLUNG_STATUS[z.status]?.label}</Badge>{z.gezahltAm ? <span className="block text-[12.5px] text-ink-500">{datum(z.gezahltAm)}</span> : z.faellig ? <span className="block text-[12.5px] text-ink-500">fällig {datum(z.faellig)}</span> : null}</td>
                  <td className={zelle}>{c.backofficeSchreiben && <ZahlungEntfernen vorgangId={c.vorgangId} z={z} />}</td>
                </tr>
              ))}
            </Tabelle>
          ) : (
            <p className="text-[14px] text-ink-500">Vereinbarte Zahlungen erscheinen hier mit Jahr, Grundlage und Status – ab Inbetriebnahme mit den gemessenen Strommengen.</p>
          )}
          {c.backofficeSchreiben && <Klappe titel="Einnahme erfassen" className="mt-4"><ZahlungFormular vorgangId={c.vorgangId} land={g.land} projekte={c.projekte} jahr={jahr} /></Klappe>}
        </Karte>

        <Karte titel="Bürgerbeteiligung" untertitel="Angebote für Bürgerinnen und Bürger der Gemeinde" aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {c.angebote.length ? (
            <ul className="space-y-3">
              {c.angebote.map((a) => (
                <li key={`${a.art}-${a.titel}`} className="rounded-2xl bg-ink-50 px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">{a.titel} <Badge ton="info">{a.status}</Badge></p>
                  <p className="mt-0.5 text-[13.5px] text-ink-600">{a.text} <Link className="font-semibold text-ov-700 underline" href={a.link}>Mehr</Link></p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Beteiligungsmodelle (Genossenschaft, Energiegemeinschaft) stimmen wir mit Ihnen ab.</p>
          )}
          <p className="mt-3 text-[12.5px] text-ink-500">Beteiligungen sind unternehmerische Entscheidungen der Bürgerinnen und Bürger; die Gemeinde informiert, berät aber nicht zur Anlage.</p>
        </Karte>

        <Karte titel="Bürgerinfo und Pressetexte" untertitel="Entwürfe aus den Projektdaten – vor Veröffentlichung abstimmen" aktion={<Megaphone aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {c.projekte.length ? <MaterialVorschau vorgangId={c.vorgangId} vorlagen={c.vorlagen} projekte={c.projekte} /> : <p className="text-[14px] text-ink-500">Material steht bereit, sobald ein Projekt im Gemeindegebiet in der Bauleitplanung ist.</p>}
        </Karte>
      </div>

      <Karte titel="Stellungnahmen und Abstimmung" untertitel="Anfragen, Stellungnahmen im Verfahren und Antworten – mit Frist" aktion={<MessagesSquare aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        {c.stellungnahmen.length ? (
          <ul className="space-y-4">
            {c.stellungnahmen.map((s) => (
              <li key={s.id} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0"><span className="block font-semibold text-ink-900">{s.betreff}</span><span className="text-[13px] text-ink-500">{s.von === "gemeinde" ? "Gemeinde" : "ÖkoInvest"} · {datumZeit(s.am)}{s.frist ? ` · Frist ${datum(s.frist)}` : ""}</span></span>
                  <Badge ton={STELLUNGNAHME_STATUS[s.status]?.ton}>{STELLUNGNAHME_STATUS[s.status]?.label}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{s.text}</p>
                {s.antworten.map((a) => (
                  <div key={a.id} className="mt-3 rounded-xl bg-ink-50 px-3 py-2.5">
                    <p className="text-[12.5px] text-ink-500">{a.von === "gemeinde" ? "Gemeinde" : "ÖkoInvest"}{a.vonName ? ` (${a.vonName})` : ""} · {datumZeit(a.am)}</p>
                    <p className="mt-1 whitespace-pre-line text-[14px] text-ink-800">{a.text}</p>
                  </div>
                ))}
                {c.darfSchreiben && <AntwortFormular vorgangId={c.vorgangId} s={s} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-500">Noch keine Stellungnahmen.</p>
        )}
        {c.darfSchreiben && <Klappe titel={c.rolle === "gemeinde" ? "Stellungnahme bzw. Anfrage senden" : "Um Stellungnahme bitten"} className="mt-4"><StellungnahmeFormular vorgangId={c.vorgangId} projekte={c.projekte} /></Klappe>}
      </Karte>

      <Karte titel="Unterlagen austauschen" untertitel="Planunterlagen, Beschlüsse, Verträge (PDF, JPG, PNG bis 10 MB)" aktion={<FileText aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <DokumentListe dokumente={dokumente} nutzerId={nutzer.id} admin={istAdmin(nutzer)} leerText="Noch keine Unterlagen." />
        <div className="mt-4"><DokumentUpload bezugArt="vorgang" bezugId={c.vorgangId} kategorien={istAdmin(nutzer) ? ["vertrag", "allgemein"] : ["allgemein"]} /></div>
      </Karte>
    </div>
  );
}

export default async function Kommune({ searchParams }) {
  const n = await portalNutzer();
  const sp = (await searchParams) || {};
  const admin = istAdmin(n);
  const vorgangId = admin && typeof sp.vorgang === "string" ? sp.vorgang : undefined;
  const d = await laden(() => fachBackend().kommuneUebersicht(n, { vorgangId }));

  if (admin && !vorgangId) {
    return (
      <div className="space-y-6">
        <SeitenKopf eyebrow="Backoffice · Kommunen" titel="Gemeinde-Sicht" text="Kommunale Anliegen. Die Gemeinde sieht Projekte und Cockpit erst, wenn Sie das Anliegen als „qualifiziert“ markiert haben – vorher bitte die Gemeinde über einen unabhängigen Weg bestätigen (z. B. Rückruf über die Zentrale der Verwaltung)." />
        <Karte titel="Kommunale Anliegen">
          {d.anliegen.length ? (
            <ul className="divide-y divide-ink-100">
              {d.anliegen.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">{a.gemeinde || "Ohne Gemeindename"}</span>
                    <span className="ml-2 text-[13px] text-ink-500">{a.id} · {LAENDER[a.land] || a.land} · {datum(a.erstelltAm)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge art="vorgang" status={a.status} />
                    <Link className="text-[14px] font-semibold text-ov-700 hover:text-ov-800" href={`/portal/kommune?vorgang=${a.id}`}>Cockpit der Gemeinde</Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Noch keine kommunalen Anliegen.</p>
          )}
        </Karte>
      </div>
    );
  }

  const kannCockpit = admin ? darfLesen(n, "kommunen") : n.rollen.includes("kommune"); // Altkonten ohne Rolle kommune: nur Übersicht
  const cockpit = d.geprueft && kannCockpit ? await laden(() => gemeindeBackend().gdCockpit(n, { vorgangId: vorgangId || d.gemeinden[0]?.vorgangId })) : null;
  const dokumente = cockpit ? await laden(() => backend().dokumente(n, { bezugArt: "vorgang", bezugId: cockpit.vorgangId })) : [];
  const ap = d.gemeinden.find((g) => g.vorgangId === cockpit?.vorgangId)?.ansprechpartner || d.gemeinden[0]?.ansprechpartner;

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow={admin ? "Backoffice · Sicht der Gemeinde" : "Gemeinde"}
        titel="Solarprojekte in Ihrer Gemeinde"
        text="Verfahrensstand der Bauleitplanung bzw. Flächenwidmung, Termine, Einnahmen der Gemeinde, Bürgerbeteiligung und Abstimmung mit ÖkoInvest. Eigentümer- und Vertragsdaten bleiben vertraulich."
        aktionen={admin ? <Button href="/portal/kommune" variant="secondary">Alle Anliegen</Button> : null}
      />

      {!d.anliegen.length && (
        <Leer icon={Building2} titel="Noch kein kommunales Anliegen" text="Stellen Sie Ihre Gemeinde kurz vor – nach einer Prüfung sehen Sie hier die Projekte in Ihrem Gebiet." aktion={<Button href={pfad("/kommunen#anfrage")}>Anliegen schildern</Button>} />
      )}

      {d.anliegen.length > 0 && !d.geprueft && (
        <Hinweis ton="info" titel="Wir prüfen Ihr Anliegen">
          Bevor wir Projektdaten zeigen, bestätigen wir die Gemeinde über einen unabhängigen Weg (in der Regel ein Rückruf über die Verwaltung). Danach erscheinen hier alle Projekte im Gemeindegebiet ab der Bauleitplanung mit Verfahrensstand, Terminen und Einnahmen.
        </Hinweis>
      )}

      {cockpit && <Cockpit c={cockpit} dokumente={dokumente} nutzer={n} />}

      {ap && (
        <Hinweis ton="ok" icon={UserRound} titel="Ihr Ansprechpartner">
          {ap.vorname} {ap.nachname} – erreichbar über <Link className="font-semibold underline" href="/portal/nachrichten">Nachrichten</Link> oder die Stellungnahmen oben.
        </Hinweis>
      )}

      {d.anliegen.length > 0 && (
        <Karte titel="Ihre Anliegen">
          <ul className="divide-y divide-ink-100">
            {d.anliegen.map((a) => {
              const x = a.daten || {};
              return (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/portal/anfragen/${a.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{a.gemeinde || a.typ}</Link>
                    <StatusBadge art="vorgang" status={a.status} />
                    <span className="text-[13px] text-ink-500">{datum(a.erstelltAm)}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
                    {[
                      KOMMUNE_ABSENDER[x.absender],
                      KOMMUNE_ROLLE[x.rolle],
                      x.bauleitplanung && `Planung: ${BAULEITPLANUNG_STAND[x.bauleitplanung]}`,
                      x.kriterienkatalog && `Kriterienkatalog: ${KRITERIENKATALOG[x.kriterienkatalog]}`,
                      x.interesse6 && `§ 6 EEG: ${x.interesse6 === "ja" ? "Interesse" : x.interesse6 === "nein" ? "kein Interesse" : "offen"}`,
                      x.gemeindeFlaechenHa ? `${fmtHa(x.gemeindeFlaechenHa)} gemeindeeigene Flächen` : "",
                      x.buergerbeteiligung?.length ? `Beteiligung: ${x.buergerbeteiligung.map((b) => BUERGERBETEILIGUNG[b]).filter(Boolean).join(", ")}` : "",
                      x.themen?.length ? `Themen: ${x.themen.map((t) => KOMMUNE_THEMEN[t]).filter(Boolean).join(", ")}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
        </Karte>
      )}
    </div>
  );
}

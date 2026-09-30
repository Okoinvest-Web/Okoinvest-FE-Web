// /portal/kommune – Gemeinde-Sicht (Fachprüfung Kommunen)
// Eigene kommunale Anliegen; Projekte im Gemeindegebiet erst nach Prüfung durch das Backoffice,
// nur ab Bauleitplanung und nur vereinfacht (keine Eigentümer, Flurstücke oder Pachtkonditionen).
// § 6 EEG als Schätzung – Platzhalter bis zum Finanzmodul.

import Link from "next/link";
import { Building2, Coins, LandPlot, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Hinweis, Karte, Kennzahl, Leer, SeitenKopf, StatusBadge, Tabelle, zelle } from "@/components/Portal/ui";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { fachBackend } from "@/lib/plattform/backend/kommune";
import { BAULEITPLANUNG_STAND, BUERGERBETEILIGUNG, KOMMUNE_ABSENDER, KOMMUNE_ROLLE, KOMMUNE_SICHTBAR, KOMMUNE_PHASE, KOMMUNE_THEMEN, KRITERIENKATALOG } from "@/lib/plattform/kommune";
import { KOMMUNE } from "@/lib/invest/markt";
import { datum, eur } from "@/lib/plattform/format";
import { LAENDER } from "@/lib/plattform/konstanten";

export const metadata = { title: "Gemeinde" };

const fmtHa = (x) => `${Number(x || 0).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ha`;

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

export default async function Kommune({ searchParams }) {
  const n = await portalNutzer();
  const sp = (await searchParams) || {};
  const admin = istAdmin(n);
  const vorgangId = admin && typeof sp.vorgang === "string" ? sp.vorgang : undefined;
  const d = await laden(() => fachBackend().kommuneUebersicht(n, { vorgangId }));

  if (admin && !vorgangId) {
    return (
      <div className="space-y-6">
        <SeitenKopf eyebrow="Backoffice · Kommunen" titel="Gemeinde-Sicht" text="Kommunale Anliegen. Die Gemeinde sieht Projekte in ihrem Gebiet erst, wenn Sie das Anliegen als „qualifiziert“ markiert haben – vorher bitte die Gemeinde über einen unabhängigen Weg bestätigen (z. B. Rückruf über die Zentrale der Verwaltung)." />
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
                    <Link className="text-[14px] font-semibold text-ov-700 hover:text-ov-800" href={`/portal/kommune?vorgang=${a.id}`}>Sicht der Gemeinde</Link>
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

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow={admin ? "Backoffice · Sicht der Gemeinde" : "Gemeinde"}
        titel="Solarprojekte in Ihrer Gemeinde"
        text="Vereinfachter Stand der Projekte im Gemeindegebiet, Ihre Anliegen und Ihr Ansprechpartner. Eigentümer- und Vertragsdaten bleiben vertraulich."
        aktionen={admin ? <Button href="/portal/kommune" variant="secondary">Alle Anliegen</Button> : null}
      />

      {!d.anliegen.length && (
        <Leer icon={Building2} titel="Noch kein kommunales Anliegen" text="Stellen Sie Ihre Gemeinde kurz vor – nach einer Prüfung sehen Sie hier die Projekte in Ihrem Gebiet." aktion={<Button href="/kommunen#anfrage">Anliegen schildern</Button>} />
      )}

      {d.anliegen.length > 0 && !d.geprueft && (
        <Hinweis ton="info" titel="Wir prüfen Ihr Anliegen">
          Bevor wir Projektdaten zeigen, bestätigen wir die Gemeinde über einen unabhängigen Weg (in der Regel ein Rückruf über die Verwaltung). Danach erscheinen hier alle Projekte im Gemeindegebiet ab der Bauleitplanung.
        </Hinweis>
      )}

      {d.gemeinden.map((g) => (
        <section key={`${g.name}-${g.land}`} aria-label={`Gemeinde ${g.name}`} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kennzahl icon={LandPlot} label={`Projekte in ${g.name}`} wert={String(g.summe.anzahl)} hinweis="ab Bauleitplanung" />
            <Kennzahl icon={LandPlot} label="Fläche zusammen" wert={fmtHa(g.summe.ha)} hinweis="gerundet" />
            <Kennzahl
              icon={Coins}
              label="§ 6 EEG pro Jahr (Schätzung)"
              wert={g.summe.par6EuroProJahr !== null ? eur(g.summe.par6EuroProJahr) : "–"}
              hinweis={g.land === "DE" ? `bis ${String(KOMMUNE.beteiligungCt).replace(".", ",")} ct/kWh ab Inbetriebnahme` : "in AT/CH nicht vorgesehen"}
            />
          </div>

          <Karte titel="Projekte im Gemeindegebiet" untertitel="Vereinfachter Fortschritt – Details stimmen wir im Verfahren mit der Verwaltung ab">
            {g.projekte.length ? (
              <Tabelle kopf={["Nr.", "Art", "Größe", "Phase", "Seit", "§ 6 EEG / Jahr"]}>
                {g.projekte.map((p) => (
                  <tr key={p.nr}>
                    <td className={zelle}>{p.nr}</td>
                    <td className={zelle}>{p.art}</td>
                    <td className={`${zelle} ov-num`}>{fmtHa(p.ha)}</td>
                    <td className={zelle}>
                      <span className="block text-[14px] text-ink-900">{p.phase}</span>
                      <PhasenLeiste status={p.status} />
                    </td>
                    <td className={zelle}>{p.seit ? datum(p.seit) : "–"}</td>
                    <td className={`${zelle} ov-num`}>{p.par6 ? `ca. ${eur(p.par6.euroProJahr)}` : "–"}</td>
                  </tr>
                ))}
              </Tabelle>
            ) : (
              <p className="text-[14px] text-ink-500">Derzeit keine Projekte ab Bauleitplanung in {g.name}.</p>
            )}
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
              <Begriff id="kommunalbeteiligung">§ 6 EEG</Begriff>: freiwillige Zahlung des Betreibers an die Gemeinde, vertraglich vereinbart, frühestens ab Inbetriebnahme. Die Werte sind grobe Schätzungen aus Fläche und regionalem Ertrag – verbindliche Beträge folgen aus dem Vertrag und den gemessenen Strommengen (Anzeige der Zahlungen folgt mit dem Finanzmodul). Zusätzlich fließen 90 % der Gewerbesteuer der Anlage an die Standortgemeinde.
            </p>
          </Karte>

          {g.ansprechpartner && (
            <Hinweis ton="ok" icon={UserRound} titel="Ihr Ansprechpartner">
              {g.ansprechpartner.vorname} {g.ansprechpartner.nachname} – erreichbar über <Link className="font-semibold underline" href="/portal/nachrichten">Nachrichten</Link>.
            </Hinweis>
          )}
        </section>
      ))}

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

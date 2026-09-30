// /portal/admin/genossenschaft – Backoffice (Bereich „genossenschaft“): Stammdaten der Genossenschaften, Mitgliederliste mit
// Zulassung/Einzahlung/Kündigung/Auszahlung, Übertragungen, Generalversammlungen, Ausschüttungen und offene Rechtspunkte.

import Link from "next/link";
import { Coins, Gavel, HandHeart, Scale, Users } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { AusschuettungAktionen, AusschuettungFormular, GenoStammdaten, GvAktionen, GvFormular, MitgliedAktionen, UebertragungAktionen } from "@/components/Portal/Mitglied/GenoAdmin";
import { Klappe, PdfLink } from "@/components/Portal/Mitglied/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { AUSSCHUETTUNG_STATUS, GENO_REGISTER, MITGLIED_STATUS, UEBERTRAGUNG_STATUS } from "@/lib/plattform/mitglied/genossenschaft";
import { GV_FORMEN, GV_STATUS } from "@/lib/plattform/mitglied/versammlung";
import { datum, eur } from "@/lib/plattform/format";

export const metadata = { title: "Genossenschaft" };
const zeit = (s) => (s ? `${datum(s)}, ${s.slice(11, 16)} Uhr` : "–");

export default async function GenossenschaftAdmin() {
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => mitgliedBackend().boGeno(n));
  const k = d.kennzahlen;
  const s = d.darfSchreiben;
  const jahr = Number(d.heute.slice(0, 4)) - 1;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Genossenschaft" text="Mitglieder, Einzahlungen, Generalversammlungen und Ausschüttungen. Zulassung und Beschlüsse trifft der Vorstand bzw. die Generalversammlung – das Portal dokumentiert sie." aktionen={<Link href="/portal/admin/energiegemeinschaften" className="text-[14px] font-semibold text-ov-700 hover:text-ov-800">Energiegemeinschaften</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl icon={Users} label="Aktive Mitglieder" wert={String(k.mitglieder)} hinweis={`${k.anteile} Anteile`} />
        <Kennzahl icon={Coins} label="Geschäftsguthaben" wert={eur(k.guthabenEur)} hinweis={k.offeneEinzahlungenEur ? `offen: ${eur(k.offeneEinzahlungenEur)}` : "keine offenen Einzahlungen"} />
        <Kennzahl icon={HandHeart} label="Offene Beitritte" wert={String(k.offeneErklaerungen)} hinweis="Unterschrift prüfen, zulassen" />
        <Kennzahl icon={Gavel} label="Offene Kündigungen / Übertragungen" wert={`${k.offeneKuendigungen} / ${k.offeneUebertragungen}`} hinweis="bestätigen bzw. zustimmen" />
      </div>

      <Karte titel="Offene Rechtspunkte vor dem ersten echten Beitritt" aktion={<Scale aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <ul className="grid gap-3 md:grid-cols-2">
          {d.rechtOffen.map((r) => (
            <li key={r.id} className="rounded-2xl bg-ink-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700"><span className="font-semibold text-ink-900">{r.titel}.</span> {r.text}</li>
          ))}
        </ul>
      </Karte>

      {d.genos.map((g) => {
        const mitglieder = d.mitglieder.filter((m) => m.genoId === g.id);
        const versammlungen = d.versammlungen.filter((v) => v.genoId === g.id);
        const aus = d.ausschuettungen.filter((a) => a.genoId === g.id);
        const ueb = d.uebertragungen.filter((u) => u.genoId === g.id);
        return (
          <section key={g.id} aria-label={g.name} className="space-y-6">
            <Karte titel={<span className="inline-flex flex-wrap items-center gap-2">{g.name} <Badge ton={GENO_REGISTER[g.registerStatus]?.ton}>{g.registerLabel}</Badge></span>} untertitel={`${g.rechtsform} · ${g.registerName} ${g.registerNr || "–"} · Anteil ${eur(g.anteilEur)}`}>
              {s ? <Klappe titel="Stammdaten bearbeiten"><GenoStammdaten geno={g} /></Klappe> : <p className="text-[14px] text-ink-500">Nur lesen.</p>}
            </Karte>

            <Karte titel="Mitglieder" untertitel="Mitgliederliste mit Status und Geschäftsguthaben">
              {mitglieder.length ? (
                <Tabelle kopf={["Nr.", "Mitglied", "Status", "Anteile", "Guthaben / offen", "Aktionen"]}>
                  {mitglieder.map((m) => (
                    <tr key={m.id}>
                      <td className={zelle}>{m.nr || "–"}</td>
                      <td className={zelle}><span className="font-semibold text-ink-900">{m.name}</span><span className="block text-[12.5px] text-ink-500">{m.email || "ohne Portalkonto"}{m.vorgangId ? " · " : ""}{m.vorgangId && <Link className="text-ov-700 underline" href={`/portal/admin/vorgaenge/${m.vorgangId}`}>Vorgang</Link>}</span></td>
                      <td className={zelle}><Badge ton={MITGLIED_STATUS[m.status]?.ton}>{m.statusLabel}</Badge></td>
                      <td className={`${zelle} ov-num`}>{m.anteile}</td>
                      <td className={`${zelle} ov-num`}>{eur(m.kennzahlen.guthabenEur)}{m.kennzahlen.offenEur ? <span className="block text-[12.5px] text-ink-500">offen {eur(m.kennzahlen.offenEur)}</span> : null}</td>
                      <td className={zelle}>
                        <div className="flex flex-col gap-2">
                          <span className="flex flex-wrap gap-2"><PdfLink href={`/api/portal/mitglied/pdf?art=beitritt&id=${m.id}`}>Erklärung</PdfLink>{m.status === "aktiv" && <PdfLink href={`/api/portal/mitglied/pdf?art=bestaetigung&id=${m.id}`}>Bestätigung</PdfLink>}</span>
                          {s && <MitgliedAktionen m={m} heute={d.heute} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Tabelle>
              ) : (
                <Leer icon={Users} titel="Noch keine Mitglieder" text={g.registerStatus === "eingetragen" ? "Beitrittserklärungen erscheinen hier, sobald Mitglieder sie im Portal abgeben." : "Beitritte sind erst nach Eintragung möglich (Registerstatus „eingetragen“)."} />
              )}
            </Karte>

            {ueb.length > 0 && (
              <Karte titel="Übertragungen von Geschäftsguthaben">
                <Tabelle kopf={["Datum", "Von", "An", "Anteile", "Status", ""]}>
                  {ueb.map((u) => (
                    <tr key={u.id}>
                      <td className={zelle}>{datum(u.am)}</td>
                      <td className={zelle}>{u.von}</td>
                      <td className={zelle}>{u.an}</td>
                      <td className={`${zelle} ov-num`}>{u.anteile} ({eur(u.betragEur)})</td>
                      <td className={zelle}>{UEBERTRAGUNG_STATUS[u.status]}</td>
                      <td className={zelle}>{s && <UebertragungAktionen u={u} />}</td>
                    </tr>
                  ))}
                </Tabelle>
              </Karte>
            )}

            <Karte titel="Generalversammlungen" untertitel={`Einladungsfrist mindestens ${g.einladungsfrist} Tage · ${g.onlineGv ? "Online-Abstimmung laut Satzung zulässig" : "keine Online-Abstimmung laut Satzung"}`}>
              <div className="space-y-4">
                {versammlungen.map((v) => (
                  <div key={v.id} className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200/80">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900">{v.titel}</span>
                        <span className="text-[13px] text-ink-500">{zeit(v.datum)} · {GV_FORMEN[v.form]} · Stimmen {v.abgegeben}/{v.stimmberechtigt}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge ton={GV_STATUS[v.status]?.ton}>{v.statusLabel}</Badge>
                        <PdfLink href={`/api/portal/mitglied/pdf?art=einladung&id=${v.id}`}>Einladung</PdfLink>
                        {v.status === "abgeschlossen" && <PdfLink href={`/api/portal/mitglied/pdf?art=protokoll&id=${v.id}`}>Protokoll</PdfLink>}
                      </span>
                    </div>
                    {v.zwischenstand && (
                      <p className="mt-2 text-[13px] text-ink-600">Zwischenstand: {v.zwischenstand.tops.map((t) => `${t.titel.slice(0, 40)} – Ja ${t.ja}, Nein ${t.nein}, Enth. ${t.enthaltung}`).join(" · ")}</p>
                    )}
                    {v.ergebnis && <p className="mt-2 text-[13px] text-ink-600">Ergebnis: {v.ergebnis.tops.map((t) => `${t.titel.slice(0, 40)}: ${t.angenommen ? "angenommen" : "abgelehnt"}`).join(" · ")}</p>}
                    {s && (
                      <div className="mt-3 space-y-3">
                        {v.status === "entwurf" && <Klappe titel="Bearbeiten"><GvFormular genoId={g.id} gv={v} /></Klappe>}
                        <GvAktionen gv={v} />
                      </div>
                    )}
                  </div>
                ))}
                {!versammlungen.length && <p className="text-[14px] text-ink-500">Noch keine Versammlung angelegt.</p>}
                {s && <Klappe titel="Neue Versammlung anlegen"><GvFormular genoId={g.id} /></Klappe>}
              </div>
            </Karte>

            <Karte titel="Ausschüttungen" untertitel="Vorschlag berechnen → Beschluss der Generalversammlung erfassen → Auszahlung buchen">
              <div className="space-y-4">
                {aus.length > 0 && (
                  <Tabelle kopf={["Jahr", "Art", "Mitglieder", "Brutto", "Steuer", "Netto", "Status", ""]}>
                    {aus.map((a) => (
                      <tr key={a.id}>
                        <td className={zelle}>{a.geschaeftsjahr}</td>
                        <td className={zelle}>{a.art === "dividende" ? `Dividende ${String(a.satzPct).replace(".", ",")} %` : `Rückvergütung ${String(a.ctProKwh).replace(".", ",")} ct/kWh`}</td>
                        <td className={`${zelle} ov-num`}>{a.anzahl}</td>
                        <td className={`${zelle} ov-num`}>{eur(a.summe.bruttoEur)}</td>
                        <td className={`${zelle} ov-num`}>{eur(a.summe.steuerEur)}</td>
                        <td className={`${zelle} ov-num font-semibold`}>{eur(a.summe.nettoEur)}</td>
                        <td className={zelle}>{AUSSCHUETTUNG_STATUS[a.status]}{a.ausgezahltAm ? ` ${datum(a.ausgezahltAm)}` : ""}</td>
                        <td className={zelle}>{a.status !== "entwurf" && <PdfLink href={`/api/portal/mitglied/pdf?art=ausschuettung&id=${a.id}`}>Liste</PdfLink>}{s && <AusschuettungAktionen au={a} heute={d.heute} versammlungen={versammlungen.filter((v) => v.status === "abgeschlossen")} />}</td>
                      </tr>
                    ))}
                  </Tabelle>
                )}
                {s && g.registerStatus !== "aufbau" && <Klappe titel="Ausschüttung berechnen"><AusschuettungFormular genoId={g.id} jahr={jahr} /></Klappe>}
              </div>
            </Karte>
          </section>
        );
      })}

      {!d.genos.length && <Hinweis ton="info" titel="Noch keine Genossenschaft">Legen Sie die Stammdaten an. Solange der Registerstatus „im Aufbau“ ist, sehen Mitglieder nur die unverbindliche Vormerkung.</Hinweis>}
      {s && <Karte titel="Genossenschaft anlegen"><Klappe titel="Stammdaten erfassen"><GenoStammdaten /></Klappe></Karte>}
    </div>
  );
}

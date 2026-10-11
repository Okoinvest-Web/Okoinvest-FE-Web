// /portal/admin/newsletter – Newsletter-Backoffice (Plattform-Armee, Paket MARKETING)
//
// Empfängerlisten je Land und Thema, Status (offen/aktiv), Abmeldungen (Grabsteine ohne Personendaten),
// Einwilligungsverlauf je Empfänger (DSGVO sichtbar), Datenexport (Art. 15/20) und Löschung (Art. 17) je Empfänger.
// Dazu die Presse-Entwürfe des Newsrooms (öffentlich erst nach Freigabe). Recht: Bereich „CRM“; der Export je
// Empfänger braucht zusätzlich „CSV-Export“ (prüft die API). Läuft NUR gegen das Demo-Backend – außerhalb zeigt
// die Seite nur den Hinweis „startet mit dem Livegang“.

import { notFound } from "next/navigation";
import { CheckCircle2, FileText, Hourglass, Inbox, Mail, MailX, Newspaper, UserRoundX } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { EmpfaengerAktionen } from "@/components/Portal/Backoffice/Newsletter";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { newsletterBackend, NEWSLETTER_AUS } from "@/lib/plattform/backend/newsletter";
import { darfLesen, darfSchreiben, stufe } from "@/lib/plattform/rechte";
import { datumZeit } from "@/lib/plattform/format";
import { NEWSLETTER_LAENDER, THEMEN } from "@/lib/newsletter/themen";
import { MELDUNGEN } from "@/content/newsroom";

export const metadata = { title: "Newsletter" };

const THEMA_LABEL = Object.fromEntries(THEMEN.map((t) => [t.id, t.de]));
const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
const ZUSTAND = {
  aktiv: ["ok", "aktiv"],
  offen: ["warn", "Bestätigung offen"],
  abgemeldet: ["neutral", "abgemeldet"],
  ersetzt: ["neutral", "ersetzt"],
  abgelaufen: ["neutral", "abgelaufen"],
};
const AMPEL = { erteilt: ["ok", "Einwilligung erteilt"], doi_ausstehend: ["warn", "DOI ausstehend"], widerrufen: ["dunkel", "widerrufen"], keine: ["neutral", "keine Einwilligung"] };
const EINWILLIGUNG_ART = { einwilligung: "Einwilligung", doi: "Bestätigung (DOI)", widerruf: "Widerruf", hinweis: "Hinweis" };

export default async function NewsletterBackoffice() {
  const n = await portalNutzer({ admin: true });
  if (!darfLesen(n, "crm")) notFound();
  const schreiben = darfSchreiben(n, "crm");
  const darfExport = stufe(n, "export") >= 1;

  let d = null;
  let aus = "";
  try {
    d = await newsletterBackend().newsletterUebersicht();
  } catch (e) {
    aus = e?.code === "newsletter_aus" ? NEWSLETTER_AUS : "Die Newsletter-Daten sind gerade nicht erreichbar.";
  }

  const entwuerfe = MELDUNGEN.filter((m) => m.status !== "freigegeben");
  const freigegeben = MELDUNGEN.filter((m) => m.status === "freigegeben");

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice · Marketing"
        titel="Newsletter"
        text="Empfänger je Land und Thema aus der Double-Opt-in-Anmeldung (/newsletter). Einwilligungen sind je Empfänger sichtbar; Export (Art. 15/20) und Löschung (Art. 17) direkt hier. Es wird nichts versendet – der Versanddienst ist noch nicht gewählt (Inhaber)."
      />

      {aus ? (
        <Hinweis ton="warn" icon={MailX} titel="Keine Live-Daten">{aus}</Hinweis>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kennzahl label="Bestätigte Abos" wert={String(d.kennzahlen.aktiv)} hinweis="Double-Opt-in abgeschlossen" icon={CheckCircle2} ton="dunkel" />
            <Kennzahl label="Bestätigung offen" wert={String(d.kennzahlen.offen)} hinweis="verfallen automatisch" icon={Hourglass} />
            <Kennzahl label="Abmeldungen (30 Tage)" wert={String(d.kennzahlen.abmeldungen30)} icon={UserRoundX} />
            <Kennzahl label="Verfallen (30 Tage)" wert={String(d.kennzahlen.abgelaufen30)} hinweis="DOI nicht bestätigt" icon={MailX} />
          </div>

          <Karte titel="Empfänger je Land und Thema" untertitel="Nur bestätigte Abos · ein Abo kann mehrere Themen haben" icon={Inbox}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12.5px] uppercase tracking-wide text-ink-500">
                    <th className="py-2 pr-3 font-semibold">Thema</th>
                    {NEWSLETTER_LAENDER.map((l) => (
                      <th key={l} className="py-2 pr-3 font-semibold">{LAND_NAME[l]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {THEMEN.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 pr-3 font-semibold text-ink-900">{t.de}</td>
                      {NEWSLETTER_LAENDER.map((l) => (
                        <td key={l} className="py-2 pr-3 tabular-nums text-ink-700">{d.matrix[l]?.[t.id] || 0}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Karte>

          <Karte titel="Empfänger" untertitel={`${d.abos.length} Einträge (aktiv und offen) · neueste zuerst · Einwilligungskette je Empfänger`} icon={Mail}>
            {d.abos.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-ink-500">Noch keine Anmeldungen. Die öffentliche Anmeldung läuft über /newsletter (je Land, Double-Opt-in).</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {d.abos.map((a) => {
                  const [tonZ, labelZ] = ZUSTAND[a.zustand] || ["neutral", a.zustand];
                  const [tonA, labelA] = AMPEL[a.ampel] || ["neutral", a.ampel];
                  return (
                    <li key={a.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-mono text-[13px] font-semibold text-ov-700">{a.id}</span>
                          <span className="truncate text-[14px] font-semibold text-ink-900">{a.email || "–"}</span>
                          <Badge ton={tonZ}>{labelZ}</Badge>
                          <Badge ton={tonA}>{labelA}</Badge>
                        </p>
                        <p className="mt-1 text-[13px] text-ink-500">
                          {LAND_NAME[a.land] || a.land} · {a.sprache === "en" ? "Englisch" : "Deutsch"} · {(a.themen || []).map((t) => THEMA_LABEL[t] || t).join(", ") || "ohne Thema"}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-500">
                          Angemeldet {datumZeit(a.erstelltAm)}
                          {a.bestaetigtAm ? ` · bestätigt ${datumZeit(a.bestaetigtAm)}` : ""}
                          {a.quelle ? ` · Quelle ${a.quelle}` : ""}
                          {a.kanal ? ` · Kanal ${a.kanal}` : ""}
                        </p>
                      </div>
                      <details className="min-w-0 text-[13px]">
                        <summary className="cursor-pointer font-semibold text-ov-700">Einwilligungen ({a.einwilligungen.length})</summary>
                        <ul className="mt-1.5 space-y-1 text-ink-600">
                          {a.einwilligungen.map((e, i) => (
                            <li key={i}>
                              {datumZeit(e.zeit)} · {EINWILLIGUNG_ART[e.art] || e.art} · Kanal {e.kanal}
                              {e.textId ? ` · Text ${e.textId} ${e.textVersion}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                      <EmpfaengerAktionen aboId={a.id} email={a.email} darfSchreiben={schreiben} />
                    </li>
                  );
                })}
              </ul>
            )}
            {!darfExport && <p className="mt-3 text-[12.5px] text-ink-500">Hinweis: Der Export je Empfänger braucht zusätzlich das Recht „CSV-Export“.</p>}
          </Karte>

          <Karte titel="Abmeldungen und Verfallenes" untertitel="Grabsteine ohne Personendaten – die Adresse ist gelöscht, der Abmeldelink bleibt gültig" icon={UserRoundX}>
            {d.abmeldungen.length === 0 ? (
              <p className="py-4 text-center text-[14px] text-ink-500">Keine Abmeldungen.</p>
            ) : (
              <ul className="space-y-1 text-[13px] text-ink-600">
                {d.abmeldungen.map((g) => (
                  <li key={g.id}>
                    <span className="font-mono text-[12.5px]">{g.id}</span> · {ZUSTAND[g.status]?.[1] || g.status} · {datumZeit(g.am)}
                  </li>
                ))}
              </ul>
            )}
          </Karte>
        </>
      )}

      <Karte titel="Newsroom: Presse-Entwürfe" untertitel="Öffentlich ist nur, was die Geschäftsführung freigegeben hat – Entwürfe erscheinen nirgends" icon={Newspaper}>
        {MELDUNGEN.length === 0 ? (
          <p className="py-4 text-center text-[14px] text-ink-500">Keine Meldungen angelegt.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {[...entwuerfe, ...freigegeben].map((m) => (
              <li key={m.slug} className="flex flex-wrap items-center gap-2 py-3 first:pt-0 last:pb-0">
                <Badge ton={m.status === "freigegeben" ? "ok" : "warn"}>{m.status === "freigegeben" ? "freigegeben" : "Entwurf"}</Badge>
                <Badge>{m.typ === "pressemitteilung" ? "Pressemitteilung" : "Fachbeitrag"}</Badge>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-900">{m.title}</span>
                <span className="text-[12.5px] text-ink-500">
                  {(m.laender || []).join(", ")}
                  {m.datum ? ` · ${m.datum}` : ""}
                  {m.freigabe?.von ? ` · Freigabe: ${m.freigabe.von} (${m.freigabe.am})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-500">
          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
          Meldungen liegen als Code unter src/content/newsroom (eine Quelle, versioniert). Neue Entwürfe legt das Redaktionsteam dort an; Zahlen nur aus dem Faktenregister mit Quelle und Stand.
        </p>
      </Karte>
    </div>
  );
}

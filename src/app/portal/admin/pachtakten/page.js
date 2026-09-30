// /portal/admin/pachtakten – Backoffice-Arbeitsliste der Pachtakten (Team 1): offene Anliegen der Eigentümer
// (Kündigung, Eigentümerwechsel, Erbfall, Zahlungsaufteilung, Verlängerung), eingereichte Agri-PV-Nachweise und alle
// Pachtverträge mit Rückbau-/Sicherheitsstand und nächster Frist. Bereich „pachtakte“ (rechte.js).

import Link from "next/link";
import { AlertTriangle, ClipboardList, Leaf, ShieldAlert } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { AgriBackofficeSchritte, AnliegenBackofficeSchritte } from "@/components/Portal/Pachtakte/Formulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";
import { ANLIEGEN_STATUS, AGRI_NACHWEIS_ARTEN, AGRI_NACHWEIS_EINHEITEN, AGRI_NACHWEIS_KULTUREN, datumDe } from "@/lib/plattform/pachtakte";
import { heute as heuteWien } from "@/lib/plattform/finanzen/basis.js";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Pachtakten" };

export default async function PachtaktenSeite() {
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => pachtakteBackend().pachtakteBackoffice(n));
  const heute = heuteWien();
  const ueberfaellig = d.anliegen.filter((a) => a.bearbeitungBis && a.bearbeitungBis < heute).length;
  const warnSicherheit = d.vertraege.filter((x) => x.sicherheitWarnung).length;
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Pacht" titel="Pachtakten" text="Alles nach der Unterschrift: Anliegen der Eigentümer mit Wirkung auf Vertrag und Abrechnung, Agri-PV-Bewirtschaftungsnachweise, Rückbausicherheiten und Rückbau bis zur Abnahme." />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={ClipboardList} label="Offene Anliegen" wert={String(d.anliegen.length)} hinweis={`Bearbeitungsziel ${14} Tage`} />
        <Kennzahl icon={AlertTriangle} label="Über Bearbeitungsziel" wert={String(ueberfaellig)} />
        <Kennzahl icon={Leaf} label="Agri-PV-Nachweise zur Prüfung" wert={String(d.nachweise.length)} />
        <Kennzahl icon={ShieldAlert} label="Sicherheit fehlt ab Baubeginn" wert={String(warnSicherheit)} />
      </section>

      <div className="space-y-6">
        <Karte titel="Offene Anliegen" untertitel="Sortiert nach Bearbeitungsziel – Erledigen wirkt auf Vertrag, Fläche und künftige Gutschriften">
          {d.anliegen.length ? (
            <ul className="space-y-4">
              {d.anliegen.map((a) => (
                <li key={a.id} className={cn("rounded-2xl p-4 ring-1 ring-inset ring-ink-200/70", a.bearbeitungBis && a.bearbeitungBis < heute ? "bg-sun-300/10" : "bg-white")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{a.artLabel} · <Link href={`/portal/admin/pachtakten/${a.vertragId}`} className="text-ov-700 hover:text-ov-800">{a.vertrag}</Link></p>
                      <p className="text-[13px] text-ink-600">{a.zusammenfassung}</p>
                      <p className="text-[12.5px] text-ink-500">{a.konto} · {a.email} · {a.land} · eingereicht {new Date(a.erstelltAm).toLocaleDateString("de-DE")} · Ziel {datumDe(a.bearbeitungBis)}</p>
                    </div>
                    <Badge ton={ANLIEGEN_STATUS[a.status]?.ton}>{a.statusLabel}</Badge>
                  </div>
                  <details className="mt-2 text-[13px] text-ink-700">
                    <summary className="cursor-pointer font-semibold text-ov-700">Angaben, Unterlagen und Verlauf</summary>
                    <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-800">{JSON.stringify(a.daten, null, 2)}</pre>
                    {a.unterlagen.length > 0 && <p className="mt-2">Unterlagen anfordern: {a.unterlagen.join(" · ")}</p>}
                    <ul className="mt-2 space-y-1">{a.verlauf.map((x, i) => <li key={i}>{new Date(x.am).toLocaleString("de-DE")} · {x.name || (x.wer === "admin" ? "Backoffice" : "Eigentümer")}: {ANLIEGEN_STATUS[x.nach]?.label}{x.text ? ` – ${x.text}` : ""}</li>)}</ul>
                  </details>
                  {d.schreiben && <div className="mt-3"><AnliegenBackofficeSchritte anliegen={a} konten={d.konten || []} /></div>}
                </li>
              ))}
            </ul>
          ) : (
            <Leer icon={ClipboardList} titel="Keine offenen Anliegen" text="Neue Anliegen der Eigentümer erscheinen hier und als Aufgabe beim zuständigen Kollegen." />
          )}
        </Karte>

        {d.nachweise.length > 0 && (
          <Karte titel="Agri-PV-Nachweise zur Prüfung" untertitel="DIN SPEC 91434: ≥ 66 % des Referenzertrags, Flächenverlust ≤ 10 % (Kat. I) / ≤ 15 % (Kat. II)">
            <ul className="space-y-4">
              {d.nachweise.map((x) => (
                <li key={x.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70">
                  <p className="font-semibold text-ink-900">{x.vertrag} · {x.daten.jahr} · {AGRI_NACHWEIS_ARTEN[x.daten.art]}</p>
                  <p className="text-[13px] text-ink-600">{x.konto} · {AGRI_NACHWEIS_KULTUREN[x.daten.kultur]} · {String(x.daten.ertrag).replace(".", ",")} {AGRI_NACHWEIS_EINHEITEN[x.daten.einheit]} · {String(x.daten.bewirtschaftetHa).replace(".", ",")}/{String(x.daten.gesamtHa).replace(".", ",")} ha</p>
                  <ul className="mt-2 space-y-1 text-[13px]">{x.pruefung.punkte.map((p) => <li key={p.id} className={p.stufe === "risiko" ? "font-semibold text-ink-900" : "text-ink-600"}>{p.titel} – {p.text}</li>)}</ul>
                  {x.daten.besonderheiten && <p className="mt-2 text-[13px] text-ink-600">Besonderheiten: {x.daten.besonderheiten}</p>}
                  {d.schreiben && <div className="mt-3"><AgriBackofficeSchritte id={x.id} aktionen={x.aktionen} /></div>}
                </li>
              ))}
            </ul>
          </Karte>
        )}

        <Karte titel="Pachtverträge" untertitel="Rückbau, Sicherheit und nächste Frist je Vertrag" innen="p-0">
          {d.vertraege.length ? (
            <Tabelle kopf={["Vertrag", "Eigentümer", "Status", "Sicherheit", "Rückbau", "Nächste Frist"]}>
              {d.vertraege.map((x) => (
                <tr key={x.id}>
                  <td className={zelle}><Link href={`/portal/admin/pachtakten/${x.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{x.bezeichnung}</Link><p className="text-[12.5px] text-ink-500">{x.id} · {x.land}{x.offeneAnliegen ? ` · ${x.offeneAnliegen} offen` : ""}</p></td>
                  <td className={zelle}>{x.eigentuemer}</td>
                  <td className={zelle}>{x.statusLabel}</td>
                  <td className={cn(zelle, x.sicherheitWarnung && "font-semibold text-ink-900")}>{x.sicherheitLabel}{x.sicherheitWarnung ? " – fehlt" : ""}</td>
                  <td className={zelle}>{x.rueckbauLabel}</td>
                  <td className={cn(zelle, "whitespace-nowrap")}>{x.naechsteFrist ? `${datumDe(x.naechsteFrist.datum)} · ${x.naechsteFrist.titel}` : "–"}</td>
                </tr>
              ))}
            </Tabelle>
          ) : (
            <div className="p-6"><Leer icon={ClipboardList} titel="Keine Pachtverträge" text="Pachtverträge legt die Buchhaltung unter „Finanzen & Abrechnung“ an." /></div>
          )}
        </Karte>
        <Hinweis ton="neutral">Rechtliche Hinweise in den Anliegen (Kündigung, § 566/§ 593b BGB, § 1120 ABGB, Art. 290 OR, Erbnachweise) sind Orientierung für Eigentümer – im Einzelfall juristisch prüfen. Übertragungen nur mit geprüften Nachweisen (Grundbuchauszug, Erbnachweis).</Hinweis>
      </div>
    </>
  );
}

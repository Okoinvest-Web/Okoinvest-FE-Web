// /portal/admin/eg/[id]/eda – EDA-Marktkommunikation einer Gemeinschaft (WP2): Fristen-Ampel, Teilnahmen mit EDA-Aktionen
// (Anmeldung, Abmeldung, TF-Änderung, Nachforderung), Massenaktionen (ausstehende Zustimmungen erneut anstoßen, Erinnerungen
// mit Anleitung je Netzbetreiber-Portal, Zählpunktliste, Fristenlauf), Prozessliste und Simulator (Demo/Test).

import { AlarmClock, CircleCheck, FileWarning, Hourglass, ShieldCheck } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { Ampel, EdaUnterNav, Zp, zeit } from "@/components/Portal/EG/Eda/EdaTeile";
import { EdaMassenaktionen, EdaTeilnahmen } from "@/components/Portal/EG/Eda/EdaAktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "EDA-Marktkommunikation" };

export default async function EdaSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const d = await laden(() => egBackend().edaUebersicht(n, id));
  const g = d.gemeinschaft;
  const k = d.kennzahlen;
  const url = `/api/admin/eg/${g.id}/eda`;
  const darf = (d.rechte.eda_ausloesen || 0) >= 2;
  const fristen = d.prozesse.filter((p) => ["rot", "gelb"].includes(p.ampel?.ampel) && p.prozesscode !== "CR_MSG").sort((a, b) => (a.ampel.ampel === b.ampel.ampel ? (a.ampel.tageRest ?? 999) - (b.ampel.tageRest ?? 999) : a.ampel.ampel === "rot" ? -1 : 1));
  const liste = d.prozesse.filter((p) => p.prozesscode !== "CR_MSG").slice(0, 60);
  const empfang = d.prozesse.filter((p) => p.prozesscode === "CR_MSG").slice(0, 3);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`EDA · Marktpartner ${g.marktpartnerId || "–"} · ${g.edaAnbindung === "kep" ? "KEP" : g.edaAnbindung === "email" ? "E-Mail-Anbindung" : "EDA-Anwenderportal"}`} titel={g.name} text={g.gemeinschaftsId ? `Gemeinschafts-ID ${g.gemeinschaftsId} · Verteilmodell ${g.verteilmodell}` : "Gemeinschafts-ID noch nicht vergeben"}>
        <div className="mt-3 flex flex-wrap gap-2">
          {d.rollen.map((r) => <Badge key={r} ton="info">{r}</Badge>)}
          {d.simulator?.aktiv && <Badge ton="warn">Simulator-Netzbetreiber</Badge>}
        </div>
      </SeitenKopf>
      <EgReiter gemeinschaftId={g.id} aktiv="eda" art="admin" />
      <EdaUnterNav gemeinschaftId={g.id} aktiv="uebersicht" />
      {d.voraussetzungen.length > 0 && (
        <Hinweis ton="warn" titel="EDA noch nicht möglich">
          <ul className="list-disc space-y-1 pl-5">{d.voraussetzungen.map((v) => <li key={v}>{v}</li>)}</ul>
        </Hinweis>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kennzahl label="Fristen rot" wert={k.fristRot} hinweis={`${k.fristGelb} gelb`} icon={AlarmClock} />
        <Kennzahl label="Zustimmung offen" wert={k.zustimmungOffen} hinweis="Mitglied muss im Netzbetreiber-Portal zustimmen" icon={Hourglass} />
        <Kennzahl label="Offene Prozesse" wert={k.prozesseOffen} hinweis={`${k.wartetTechnik} warten auf Technik`} icon={CircleCheck} />
        <Kennzahl label="Freigaben offen" wert={k.freigabenOffen} hinweis="Vier-Augen durch den Vorstand" icon={ShieldCheck} />
        <Kennzahl label="Datenlücken (14 Tage)" wert={k.lueckenTage} hinweis={`${k.zpMitLuecken} Zählpunkt(e)`} icon={FileWarning} href={`/portal/admin/eg/${g.id}/eda/reklamation`} />
      </div>

      <Karte titel="Fristen-Ampel" untertitel="Rot: jetzt handeln (Frist ≤ 3 Tage, abgelehnt, Zeitüberschreitung) · Gelb: beobachten">
        {fristen.length ? (
          <ul className="divide-y divide-ink-100">
            {fristen.slice(0, 25).map((p) => (
              <li key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <a href={`/portal/admin/eg/${g.id}/eda/${p.id}`} className="min-w-0 hover:underline">
                  <p className="font-semibold text-ink-900">{p.mitgliedName || p.kurz} <span className="font-normal text-ink-500">· {p.kurz}</span></p>
                  <p className="text-[12.5px] text-ink-500"><Zp nr={p.zaehlpunktnummer} />{p.responsecode ? ` · ${p.responsecode} ${p.response?.text || ""}` : ""}</p>
                </a>
                <Ampel ampel={p.ampel} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-600">Keine Fristen mit Handlungsbedarf.</p>
        )}
      </Karte>

      <Karte titel="Massenaktionen" untertitel="Abgelehnte und abgelaufene Anmeldungen neu starten, offene Zustimmungen mit Anleitung erinnern, Bestand abgleichen">
        <EdaMassenaktionen url={url} darf={darf} simulator={d.simulator} kennzahlen={k} />
      </Karte>

      <Karte titel="Teilnahmen" untertitel="EDA-Prozesse je Zählpunkt auslösen – Status ändert sich nur durch die Antworten des Netzbetreibers">
        <EdaTeilnahmen teilnahmen={d.teilnahmen} url={url} darf={darf} vierAugenAb={d.vierAugenAb} />
      </Karte>

      <Karte titel="EDA-Prozesse" untertitel={`Letzte ${liste.length} – Details mit Nachrichten und Rohinhalten`}>
        {liste.length ? (
          <Tabelle kopf={["Prozess", "Mitglied / Zählpunkt", "Status", "Antwort", "Frist", "Zuletzt"]}>
            {liste.map((p) => (
              <tr key={p.id}>
                <td className={zelle}><a className="font-semibold text-ink-900 hover:underline" href={`/portal/admin/eg/${g.id}/eda/${p.id}`}>{p.kurz}</a><span className="block font-mono text-[11.5px] text-ink-500">{p.prozesscode}</span></td>
                <td className={zelle}>{p.mitgliedName || "–"}<span className="block"><Zp nr={p.zaehlpunktnummer} /></span></td>
                <td className={zelle}><Badge ton={p.ton}>{p.statusLabel}</Badge></td>
                <td className={zelle}>{p.responsecode ? <span title={p.response?.loesung}>{p.responsecode} · {p.response?.text}</span> : "–"}</td>
                <td className={zelle}><Ampel ampel={p.ampel} /></td>
                <td className={`${zelle} whitespace-nowrap text-[13px] text-ink-500`}>{zeit(p.verlauf?.at(-1)?.am)}</td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <Leer titel="Noch keine EDA-Prozesse" text="Sobald Teilnahmen angemeldet werden, erscheinen hier Anmeldungen, Änderungen und Abmeldungen." />
        )}
        {empfang.length > 0 && <p className="mt-4 text-[13px] text-ink-500">Energiedaten (CR_MSG): {empfang.map((p) => `${p.prozessdatum.slice(0, 7)}: ${p.ergebnis?.nachrichten || 0} Nachrichten`).join(" · ")} – Weitergabe an „Energiedaten“.</p>}
      </Karte>

      <Karte titel="Zustimmung im Netzbetreiber-Portal – Anleitung für Mitglieder" untertitel="Wird automatisch in jede Erinnerung übernommen. Portalbezeichnungen vor dem Versand prüfen (zu bestätigen).">
        <div className="grid gap-4 md:grid-cols-2">
          {d.netzbetreiber.map((nb) => (
            <div key={nb.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
              <p className="font-semibold text-ink-900">{nb.kurzname || nb.name}</p>
              <p className="text-[12.5px] text-ink-500">{nb.anleitung.portal}{nb.marktpartnerId ? ` · EDA ${nb.marktpartnerId}` : ""}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] text-ink-700">
                {nb.anleitung.schritte.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <p className="mt-2 text-[12.5px] text-ink-500">{nb.anleitung.hinweis}</p>
            </div>
          ))}
        </div>
      </Karte>
    </div>
  );
}

// /portal/admin/eg/[id]/eda/[prozessId] – ein EDA-Prozess (WP2): Status, Responsecode im Klartext mit Handlungsempfehlung,
// Verlauf, alle Nachrichten mit Rohinhalt und SHA-256, Abgleich der Zählpunktliste (EC_PODLIST), Erinnerungen.

import { Angaben, Badge, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { Ampel, EdaUnterNav, Zp, kurzHash, tag, zeit } from "@/components/Portal/EG/Eda/EdaTeile";
import { EdaProzessAktionen } from "@/components/Portal/EG/Eda/EdaAktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "EDA-Prozess" };

const ART = { fehlt_beim_nb: "Fehlt beim Netzbetreiber", fehlt_bei_uns: "Fehlt in der Plattform", tf_abweichend: "Teilnahmefaktor abweichend", consent_abweichend: "Consent-ID abweichend", consent_fehlt: "Consent-ID fehlt", ok: "Übereinstimmung" };

export default async function EdaProzessSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id, prozessId } = await params;
  const d = await laden(() => egBackend().edaProzess(n, prozessId));
  const p = d.prozess;
  const g = d.gemeinschaft;
  const darf = (d.rechte.eda_ausloesen || 0) >= 2;
  const par = p.parameter || {};
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${g.name} · EDA`} titel={`${p.label}`} text={`${p.prozesscode} · Conversation ${p.conversationId}`}>
        <div className="mt-3 flex flex-wrap items-center gap-3"><Badge ton={p.ton}>{p.statusLabel}</Badge><Ampel ampel={p.ampel} />{p.merker?.includes("klaerfall") && <Badge ton="warn">Klärfall</Badge>}</div>
      </SeitenKopf>
      <EgReiter gemeinschaftId={id} aktiv="eda" art="admin" />
      <EdaUnterNav gemeinschaftId={id} aktiv="uebersicht" />
      {p.responsecode && (
        <Hinweis ton={p.response?.kategorie === "ok" ? "ok" : "warn"} titel={`Responsecode ${p.responsecode}: ${p.response?.text}`}>
          {p.response?.loesung || "Keine Aktion nötig."}
          {!p.response?.bekannt && " Klartext laut Sekundärquelle nicht hinterlegt (zu bestätigen)."}
        </Hinweis>
      )}
      <Karte titel="Angaben">
        <Angaben spalten={3} items={[
          { label: "Mitglied", wert: p.mitgliedName || "–" },
          { label: "Zählpunkt", wert: p.zaehlpunktnummer ? <Zp nr={p.zaehlpunktnummer} /> : "–" },
          { label: "Teilnahme", wert: d.teilnahme ? `${d.teilnahme.statusLabel} · TF ${d.teilnahme.teilnahmefaktor} %` : "–" },
          { label: "Netzbetreiber (EDA)", wert: p.empfaenger || p.netzbetreiberId || "–" },
          { label: "Prozessdatum", wert: tag(p.prozessdatum) },
          { label: "Schema", wert: p.version ? `${p.version} (zu bestätigen)` : "–" },
          { label: "Frist", wert: p.fristBis ? tag(p.fristBis) : "–" },
          { label: "Sendeversuche", wert: String(p.versuche || 0) },
          { label: "Parameter", wert: par.teilnahmefaktor ? `TF ${par.vorher ? `${par.vorher} → ` : ""}${par.teilnahmefaktor} %${par.ab ? ` ab ${tag(par.ab)}` : ""}` : par.zum ? `zum ${tag(par.zum)}` : par.von ? `${tag(par.von)} – ${tag(par.bis)}` : par.pct ? `${par.pct} %` : "–" },
          { label: "Freigabe", wert: p.freigabe?.status ? `${p.freigabe.status}${p.freigabe.am ? ` am ${zeit(p.freigabe.am)}` : ""}` : "nicht nötig" },
          { label: "Nachfolger", wert: p.nachfolgerId ? <a className="text-ov-700 underline" href={`/portal/admin/eg/${id}/eda/${p.nachfolgerId}`}>{p.nachfolgerId}</a> : "–" },
          { label: "Erinnerungen", wert: p.erinnerungen?.length ? p.erinnerungen.map((e) => `${tag(e.am)} (${e.kanal})`).join(", ") : "–" },
        ]} />
        <div className="mt-5"><EdaProzessAktionen url={`/api/admin/eg/${id}/eda`} prozess={p} darf={darf} /></div>
      </Karte>

      {d.abgleich && (
        <Karte titel="Abgleich Zählpunktliste (Soll Plattform ↔ Ist Netzbetreiber)" untertitel={`${d.abgleich.filter((x) => x.art !== "ok").length} Abweichung(en) – maßgeblich für die Zuteilung ist der Netzbetreiber`}>
          <Tabelle kopf={["Zählpunkt", "Ergebnis", "Empfehlung"]}>
            {d.abgleich.map((x, i) => (
              <tr key={i}>
                <td className={zelle}><Zp nr={x.zaehlpunktnummer} /></td>
                <td className={zelle}><Badge ton={x.art === "ok" ? "ok" : "warn"}>{ART[x.art] || x.art}</Badge><span className="mt-1 block text-[12.5px] text-ink-500">{x.text}</span></td>
                <td className={`${zelle} text-[13px] text-ink-700`}>{x.empfehlung || "–"}</td>
              </tr>
            ))}
          </Tabelle>
        </Karte>
      )}

      <Karte titel="Verlauf">
        <ol className="space-y-3">
          {(p.verlauf || []).map((v, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ov-500" />
              <div className="min-w-0">
                <p className="text-[14px] text-ink-900">{v.text}</p>
                <p className="text-[12.5px] text-ink-500">{zeit(v.am)}{v.nachricht ? ` · ${v.nachricht}` : ""} · {v.von || "–"} → {v.nach}</p>
              </div>
            </li>
          ))}
        </ol>
      </Karte>

      <Karte titel="Nachrichten" untertitel="Rohinhalte unverändert gespeichert, Prüfsumme SHA-256 (Beweissicherung)">
        <div className="space-y-3">
          {d.nachrichten.map((m) => (
            <details key={m.id} className="rounded-2xl ring-1 ring-inset ring-ink-200/80">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[14px]">
                <Badge ton={m.richtung === "aus" ? "info" : "ok"}>{m.richtung === "aus" ? "an Netzbetreiber" : "vom Netzbetreiber"}</Badge>
                <span className="font-semibold text-ink-900">{m.nachrichtencode}</span>
                <span className="text-ink-500">{m.codeLabel}</span>
                <span className="text-[12.5px] text-ink-500">{zeit(m.zeitpunkt)} · {m.kanal}</span>
                {m.fehler && <Badge ton="warn">Hinweis</Badge>}
              </summary>
              <div className="space-y-2 border-t border-ink-100 px-4 py-3">
                <p className="break-all font-mono text-[12px] text-ink-500">Message-ID {m.messageId} · SHA-256 {kurzHash(m.sha256)} · {m.groesse} Zeichen</p>
                {m.fehler && <p className="text-[13px] text-ink-800">{m.fehler}</p>}
                {m.hinweise?.length > 0 && <ul className="list-disc pl-5 text-[13px] text-ink-600">{m.hinweise.map((h, i) => <li key={i}>{h}</li>)}</ul>}
                {m.rohinhalt ? <pre className="max-h-96 overflow-auto rounded-xl bg-navy-950 p-4 font-mono text-[11.5px] leading-relaxed text-white/90">{m.rohinhalt}</pre> : <p className="text-[13px] text-ink-500">Rohinhalt archiviert (Prüfsumme bleibt erhalten).</p>}
              </div>
            </details>
          ))}
          {!d.nachrichten.length && <p className="text-[14px] text-ink-500">Noch keine Nachrichten.</p>}
        </div>
      </Karte>
    </div>
  );
}

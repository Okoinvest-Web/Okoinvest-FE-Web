// /portal/admin/eg/[id]/eda/journal – Nachrichtenjournal (WP2): alle ein- und ausgehenden EDA-Nachrichten mit Code, Zählpunkt,
// Message-/Conversation-ID, Kanal, Verarbeitung und SHA-256; Filter per Formular (GET), Rohinhalt je Nachricht (?nachricht=).

import { Badge, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { EdaUnterNav, Zp, kurzHash, tag, zeit } from "@/components/Portal/EG/Eda/EdaTeile";
import { auswahlfeld, eingabe } from "@/components/Portal/felder";
import Button from "@/components/ui/Button";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "EDA-Nachrichtenjournal" };

export default async function EdaJournal({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = (await searchParams) || {};
  const filter = { richtung: ["aus", "ein"].includes(sp.richtung) ? sp.richtung : "", code: String(sp.code || "").slice(0, 40), q: String(sp.q || "").slice(0, 80), limit: 300 };
  const b = egBackend();
  const d = await laden(() => b.edaJournal(n, id, filter));
  const einzel = sp.nachricht ? await laden(() => b.edaJournal(n, id, { nachrichtId: String(sp.nachricht) })) : null;
  const m1 = einzel?.nachricht;
  const basis = `/portal/admin/eg/${id}/eda/journal`;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${d.gemeinschaft.name} · EDA`} titel="Nachrichtenjournal" text="Jede Nachricht unverändert mit Prüfsumme – Eingänge sind je Absender und Message-ID idempotent. Grundlage für Klärfälle, Reklamationen und die Schlichtungsstelle der E-Control." />
      <EgReiter gemeinschaftId={id} aktiv="eda" art="admin" />
      <EdaUnterNav gemeinschaftId={id} aktiv="journal" />
      {m1 && (
        <Karte titel={`${m1.nachrichtencode} · ${m1.codeLabel}`} untertitel={`${m1.richtung === "aus" ? "an" : "von"} ${m1.richtung === "aus" ? m1.empfaenger : m1.absender} · ${zeit(m1.zeitpunkt)}`}>
          <p className="break-all font-mono text-[12px] text-ink-500">Message-ID {m1.messageId} · Conversation {m1.conversationId} · SHA-256 {m1.sha256}</p>
          {m1.fehler && <p className="mt-2 text-[13.5px] text-ink-800">{m1.fehler}</p>}
          {m1.kennzahlen?.groessen && <p className="mt-2 text-[13.5px] text-ink-700">{Object.entries(m1.kennzahlen.groessen).map(([k, v]) => `${k}: ${v.toLocaleString("de-DE", { maximumFractionDigits: 3 })} kWh`).join(" · ")}</p>}
          {m1.rohinhalt ? <pre className="mt-3 max-h-[28rem] overflow-auto rounded-xl bg-navy-950 p-4 font-mono text-[11.5px] leading-relaxed text-white/90">{m1.rohinhalt}</pre> : <p className="mt-3 text-[13px] text-ink-500">Rohinhalt archiviert (Prüfsumme bleibt erhalten).</p>}
        </Karte>
      )}
      <Karte titel={`${d.gesamt} Nachricht(en)`} untertitel={d.gesamt > d.nachrichten.length ? `angezeigt: die neuesten ${d.nachrichten.length}` : undefined}>
        <form method="get" action={basis} className="mb-5 grid gap-3 sm:grid-cols-4">
          <select name="richtung" defaultValue={filter.richtung} className={auswahlfeld} aria-label="Richtung">
            <option value="">Ein- und Ausgang</option>
            <option value="ein">Eingang</option>
            <option value="aus">Ausgang</option>
          </select>
          <select name="code" defaultValue={filter.code} className={auswahlfeld} aria-label="Nachrichtencode">
            <option value="">Alle Nachrichtencodes</option>
            {d.codes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input name="q" defaultValue={filter.q} className={eingabe} placeholder="Zählpunkt, Message-ID, Prüfsumme" aria-label="Suche" />
          <Button type="submit" variant="secondary">Filtern</Button>
        </form>
        <Tabelle kopf={["Zeit", "Richtung", "Nachricht", "Zählpunkt", "Kanal / Status", "Prüfsumme"]}>
          {d.nachrichten.map((m) => (
            <tr key={m.id} className={m.fehler ? "bg-sun-300/10" : ""}>
              <td className={`${zelle} whitespace-nowrap text-[13px]`}>{zeit(m.zeitpunkt)}{m.tag ? <span className="block text-[12px] text-ink-500">Datentag {tag(m.tag)}</span> : null}</td>
              <td className={zelle}><Badge ton={m.richtung === "aus" ? "info" : "ok"}>{m.richtung === "aus" ? "Ausgang" : "Eingang"}</Badge></td>
              <td className={zelle}><a className="font-semibold text-ink-900 hover:underline" href={`${basis}?nachricht=${m.id}`}>{m.nachrichtencode}</a><span className="block text-[12px] text-ink-500">{m.codeLabel}</span></td>
              <td className={zelle}>{m.zaehlpunktnummer ? <Zp nr={m.zaehlpunktnummer} /> : "–"}</td>
              <td className={`${zelle} text-[13px]`}>{m.kanal}{m.versandStatus ? ` · ${m.versandStatus}` : ""}{m.richtung === "ein" ? (m.verarbeitet ? " · verarbeitet" : " · nicht verarbeitet") : ""}{m.weitergeleitet ? " · an Energiedaten" : ""}{m.fehler ? <span className="block text-[12px] text-ink-700">{m.fehler.slice(0, 140)}</span> : null}</td>
              <td className={`${zelle} font-mono text-[11.5px] text-ink-500`}>{kurzHash(m.sha256)}</td>
            </tr>
          ))}
        </Tabelle>
      </Karte>
    </div>
  );
}

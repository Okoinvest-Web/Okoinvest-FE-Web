// /portal/admin/eg/[id]/eda/reklamation – Datenqualität und Reklamation an den Netzbetreiber (WP2): Lücken je Zählpunkt aus dem
// Nachrichtenjournal (Empfang seit Anbindung), L3-Anteile, unbeantwortete Prozesse, verzögerte Aktivierungen und Abweichungen der
// Zählpunktliste → Vorlage mit Rechtsgrundlagen und Antwortfrist, Protokoll und Beschwerdeakte (Schlichtungsstelle der E-Control).

import Link from "next/link";
import { Badge, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { EdaUnterNav, Zp, tag } from "@/components/Portal/EG/Eda/EdaTeile";
import { EdaReklamation } from "@/components/Portal/EG/Eda/EdaAktionen";
import { cn } from "@/components/ui/cn";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { BEFUND_ARTEN } from "@/lib/plattform/eg/eda/daten";

export const metadata = { title: "EDA-Datenqualität und Reklamation" };

export default async function EdaReklamationSeite({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = (await searchParams) || {};
  const b = egBackend();
  const u = await laden(() => b.edaUebersicht(n, id));
  const nbId = u.netzbetreiber.some((x) => x.id === sp.nb) ? sp.nb : u.netzbetreiber[0]?.id || "";
  const d = await laden(() => b.edaReklamation(n, id, { reklamationAktion: "vorschau", netzbetreiberId: nbId }));
  const darf = (u.rechte.eda_ausloesen || 0) >= 2;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${u.gemeinschaft.name} · EDA`} titel="Datenqualität & Reklamation" text="Fehlende oder nicht belastbare Energiedaten verzögern die Abrechnung aller Mitglieder. Die Plattform sammelt die Befunde je Netzbetreiber, bereitet eine dokumentierte Reklamation vor und führt das Protokoll." />
      <EgReiter gemeinschaftId={id} aktiv="eda" art="admin" />
      <EdaUnterNav gemeinschaftId={id} aktiv="reklamation" />
      {u.netzbetreiber.length > 1 && (
        <nav aria-label="Netzbetreiber" className="flex flex-wrap gap-2">
          {u.netzbetreiber.map((x) => (
            <Link key={x.id} href={`/portal/admin/eg/${id}/eda/reklamation?nb=${x.id}`} className={cn("rounded-full px-3.5 py-2 text-[13.5px] font-semibold ring-1 ring-inset", x.id === nbId ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200")}>{x.kurzname || x.name}</Link>
          ))}
        </nav>
      )}
      <Karte titel={`Befunde für ${d.netzbetreiber.kurzname || d.netzbetreiber.name}`} untertitel={`${d.befunde.length} Befund(e) · Lücken ab Beginn des Datenempfangs über die Plattform, höchstens 60 Tage`}>
        {d.befunde.length ? (
          <Tabelle kopf={["Art", "Zählpunkt", "Befund", "Grundlage"]}>
            {d.befunde.map((x, i) => (
              <tr key={i}>
                <td className={zelle}><Badge ton="warn">{BEFUND_ARTEN[x.art]?.label || x.art}</Badge></td>
                <td className={zelle}>{x.zaehlpunktnummer ? <Zp nr={x.zaehlpunktnummer} /> : "Gemeinschaft"}</td>
                <td className={`${zelle} text-[13.5px]`}>{x.text}</td>
                <td className={`${zelle} text-[12.5px] text-ink-500`}>{BEFUND_ARTEN[x.art]?.quelle}</td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <p className="text-[14px] text-ink-600">Keine Auffälligkeiten – alle erwarteten Energiedaten sind eingegangen.</p>
        )}
      </Karte>
      {d.luecken.length > 0 && (
        <Karte titel="Fehlende Datentage je Zählpunkt" untertitel="Energiedaten kommen D+1; ab 2 Tagen Verzug gilt ein Tag als Lücke. Einzelne Tage lassen sich unter „Prozesse & Fristen“ nachfordern (CR_REQ_PT).">
          <ul className="divide-y divide-ink-100">
            {d.luecken.map((l) => (
              <li key={l.zaehlpunktnummer} className="py-3">
                <p className="text-[14px]"><Zp nr={l.zaehlpunktnummer} /> <span className="text-ink-500">· {l.anzahl} Tag(e), ältester {tag(l.aeltester)}</span></p>
                <p className="mt-1 flex flex-wrap gap-1">{l.fehlend.slice(-31).map((t) => <span key={t} className="rounded-md bg-sun-300/25 px-1.5 py-0.5 font-mono text-[11.5px] text-ink-800">{t.slice(5).split("-").reverse().join(".")}</span>)}</p>
              </li>
            ))}
          </ul>
        </Karte>
      )}
      <Karte titel="Reklamation vorbereiten" untertitel={d.netzbetreiber.kontaktEmail ? `Kontakt laut Stammdaten: ${d.netzbetreiber.kontaktEmail}` : "Kontaktweg des Netzbetreibers in den Netzbetreiber-Stammdaten pflegen"}>
        <EdaReklamation url={`/api/admin/eg/${id}/eda`} vorlage={d.vorlage} netzbetreiber={d.netzbetreiber} befunde={d.befunde.length} darf={darf} reklamationen={d.reklamationen} />
      </Karte>
      <Hinweis ton="info" titel="Eskalation">
        Bleibt die Antwort bis zur Frist aus, markiert der Fristenlauf die Reklamation rot. Die Beschwerdeakte (Verlauf, Schriftverkehr mit Prüfsummen) ist die Grundlage für eine Schlichtung bei der E-Control.
      </Hinweis>
    </div>
  );
}

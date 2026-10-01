// /portal/eg/mehrfach – Mehrfachteilnahme (WP6, ElWG § 71 Abs. 5): jeder eigene Zählpunkt mit seinen Gemeinschaften,
// Teilnahmefaktoren (Summe ≤ 100 %, höchstens 5 Gemeinschaften), freiem Anteil und TF-Wunsch je Teilnahme.

import { Info, SlidersHorizontal } from "lucide-react";
import { Hinweis, Karte, Leer, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import { TfBalken } from "@/components/Portal/EG/Mitglied/Teile";
import { TfWunsch } from "@/components/Portal/EG/Mitglied/Aktionen";
import { zpLang } from "@/components/Portal/EG/Mitglied/format";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Mehrfachteilnahme" };

export default async function Mehrfach() {
  const n = await portalNutzer();
  const d = await egBackend().ptUebersicht(n);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Energiegemeinschaft" titel="Mehrfachteilnahme" text="Ein Zählpunkt darf an bis zu fünf Gemeinschaften teilnehmen. Der Teilnahmefaktor legt fest, welcher Anteil Ihres Verbrauchs bzw. Ihrer Erzeugung auf welche Gemeinschaft entfällt – ganzzahlig, zusammen höchstens 100 %." />
      <Hinweis ton="info" icon={Info} titel="So funktioniert es">
        Änderungen meldet die jeweilige Gemeinschaft elektronisch beim Netzbetreiber – derzeit einmal pro Tag und Gemeinschaft, ab April 2028 voraussichtlich mehrmals täglich (zu bestätigen). Teilnahmen in Gemeinschaften außerhalb der Plattform kennen nur Sie und Ihr Netzbetreiber; geben Sie diese beim Beitritt an.
      </Hinweis>
      {d.mehrfach.length ? d.mehrfach.map((z) => (
        <Karte key={z.zaehlpunktId} titel={`${z.richtung === "erzeugung" ? "Erzeugung" : "Verbrauch"}${z.bezeichnung ? ` · ${z.bezeichnung}` : ""}`} untertitel={zpLang(z.zaehlpunktnummer)} aktion={<span className="ov-num text-[13.5px] font-semibold text-ink-700">{z.anzahl} von {z.maxAnzahl} · Σ {z.summeTf} %</span>}>
          <TfBalken z={z} />
          {z.hinweise.length > 0 && <ul className="mt-3 space-y-1 text-[13.5px] text-ink-600">{z.hinweise.map((h) => <li key={h}>{h}</li>)}</ul>}
          <div className="mt-4 space-y-3">
            {z.teilnahmen.filter((t) => ["entwurf", "aktiv"].includes(t.status)).map((t) => (
              <Klappe key={t.teilnahmeId} titel={`${t.gemeinschaft}: ${t.teilnahmefaktor} % (${t.statusLabel})`}>
                <TfWunsch teilnahme={{ id: t.teilnahmeId, status: t.status, teilnahmefaktor: t.teilnahmefaktor }} freiTf={z.freiTf} />
              </Klappe>
            ))}
          </div>
          {z.richtung === "erzeugung" && z.freiTf > 0 && <div className="mt-4"><PfeilLink href="/portal/eg/beitritt">Freien Anteil einer weiteren Gemeinschaft anbieten</PfeilLink></div>}
        </Karte>
      )) : <Leer icon={SlidersHorizontal} titel="Noch keine Zählpunkte" text="Sobald Sie einer Gemeinschaft beigetreten sind, verteilen Sie hier Ihre Anteile." aktion={<PfeilLink href="/portal/eg/beitritt">Gemeinschaft finden</PfeilLink>} />}
    </div>
  );
}

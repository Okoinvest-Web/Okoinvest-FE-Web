import Link from "next/link";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { DeskNavigation, EmpfehlungBadge, FristBadge, Hinweis, Tabelle, ct, datum, eur, fmt } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const metadata = { title: "Kunden & Wechselanalyse" };

export default async function EnergieKunden() {
  const n = await portalNutzer({ admin: true });
  const kunden = await laden(() => energieBackend().energieKunden(n));
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Energiebeschaffung" titel="Kunden & Wechselanalyse" text="Laufende Stromverträge der Kunden im Vergleich zur Terminkurve – sortiert nach dem nächsten Kündigungsstichtag. Empfehlung „ausschreiben“, „abwarten“ oder „verlängern“ mit Begründung in der Kundenanalyse." />
      <DeskNavigation aktiv="kunden" />
      <Karte titel="Kunden" untertitel={`${kunden.length} Unternehmen mit Vertrag, Vollmacht oder Abnahmestelle`} innen="p-0 md:p-2">
        <Tabelle
          kopf={["Kunde", "Vertrag bis", "Frist", "Vertrag", "Markt", "Δ €/Jahr", "Empfehlung", "Vollmacht"]}
          rechts={[3, 4, 5]}
          zeilen={kunden.map((k) => [
            <div key={k.kunde.id} className="min-w-0">
              <Link href={`/portal/admin/energie/kunden/${k.kunde.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{k.kunde.firma || k.kunde.name}</Link>
              <p className="text-[12px] text-ink-500">{fmt((k.jahresKwh || 0) / 1000)} MWh/Jahr{k.lastgang ? " · Lastgang" : ""}{k.poolVertraege ? " · Pool" : ""}</p>
            </div>,
            k.vertrag ? `${datum(k.vertrag.vertragEnde)} (${k.vertrag.lieferantName || "–"})` : "–",
            <FristBadge key="f" tage={k.analyse?.tageBisStichtag} />,
            ct(k.analyse?.vertragCt),
            ct(k.analyse?.marktCt),
            eur(k.analyse?.deltaEurJahr),
            k.analyse ? <EmpfehlungBadge key="e" empfehlung={k.analyse.empfehlung} /> : "–",
            k.vollmacht === "erteilt" ? "erteilt" : k.vollmacht === "widerrufen" ? "widerrufen" : "fehlt",
          ])}
        />
      </Karte>
      <div className="mt-6">
        <Hinweis>Δ €/Jahr = (Energiepreis des Vertrags − Marktpreis) × Jahresmenge; positiv heißt, der Markt ist derzeit günstiger. Marktpreis = Terminpreis Base des Folgejahres × Profilfaktor + Lieferantenaufschlag (Annahmen im Handelsdesk).</Hinweis>
      </div>
    </>
  );
}

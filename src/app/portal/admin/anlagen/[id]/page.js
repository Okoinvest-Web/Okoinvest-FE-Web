import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import Button from "@/components/ui/Button";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import GeraetAssistent from "@/components/Portal/Anlagen/GeraetAssistent";
import { EintragBereich, StammdatenFormular, StoerungErfassen } from "@/components/Portal/Anlagen/AdminFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { istDemo } from "@/lib/plattform/backend";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Anlage pflegen" };

export default async function AnlagePflegeSeite({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const n = await portalNutzer({ admin: true });
  if (!darfSchreiben(n, "anlagen")) notFound();
  const b = anlagenBackend();
  const [a, kunden, monatswerte] = await Promise.all([laden(() => b.anlage(n, id)), laden(() => b.anlagenKunden(n)), laden(() => b.zaehlerMonatswerte(n, id))]);
  const gespeicherteMonatswerte = monatswerte.filter((m) => m.id);

  return (
    <>
      <SeitenKopf
        eyebrow={`Backoffice · ${a.typLabel}`}
        titel={a.name}
        text={`${a.id} · ${a.organisation?.name || "ohne Organisation"}${a.kunde ? ` · ${a.kunde.name}` : ""}`}
        aktionen={<Button href={`/portal/anlagen/${a.id}`} size="sm" variant="secondary" icon={Activity}>Monitoring</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <Karte id="geraete" titel="Geräte (MQTT)" untertitel="Je Datenlogger ein Zugang – Passwort nur einmal sichtbar, gespeichert wird nur der Hash">
            <GeraetAssistent anlage={{ id: a.id, kwp: a.kwp, speicherKwh: a.speicherKwh }} geraete={a.geraete || []} demo={istDemo()} sofort={sp?.geraet === "1"} />
          </Karte>
          <Karte titel="Stammdaten & Kunde">
            <StammdatenFormular anlage={a} kunden={kunden} />
          </Karte>
        </div>
        <div className="min-w-0 space-y-6">
          <Karte titel="Contracting-Vertrag" untertitel="Arbeitspreis, Grundgebühr, Laufzeit – Grundlage der Kosten-/Ersparnisanzeige für den Kunden">
            <EintragBereich anlageId={a.id} art="vertrag" eintraege={a.vertrag ? [a.vertrag] : []} einzeln leer="Noch kein Vertrag hinterlegt." />
          </Karte>
          <Karte titel="Komponenten">
            <EintragBereich anlageId={a.id} art="komponente" eintraege={a.komponenten || []} />
          </Karte>
          <Karte titel="Messpunkte & Zähler" untertitel="Abrechnungsrelevant nur mit geeichter Messstelle bzw. Smart-Meter-Gateway">
            <EintragBereich anlageId={a.id} art="messpunkt" eintraege={a.messpunkte || []} />
          </Karte>
          <Karte titel="Zählerstand-Monatswerte (Abrechnung)" untertitel="Vom Messstellenbetreiber bzw. Ablesung – Stände müssen steigen">
            {(a.messpunkte || []).some((m) => m.abrechnungsrelevant) ? (
              <EintragBereich anlageId={a.id} art="monatswert" eintraege={gespeicherteMonatswerte} messpunkte={a.messpunkte} leer="Noch keine erfassten Monatswerte (Demo: fehlende Monate werden aus der Simulation abgeleitet)." />
            ) : (
              <Hinweis ton="neutral">Zuerst einen abrechnungsrelevanten Messpunkt anlegen.</Hinweis>
            )}
          </Karte>
          <Karte titel="Wartungen">
            <EintragBereich anlageId={a.id} art="wartung" eintraege={a.wartungen || []} />
          </Karte>
          <Karte titel="Störung manuell erfassen" untertitel="Z. B. Meldung des Kunden, Befund bei der Wartung">
            <StoerungErfassen anlageId={a.id} />
          </Karte>
        </div>
      </div>
    </>
  );
}

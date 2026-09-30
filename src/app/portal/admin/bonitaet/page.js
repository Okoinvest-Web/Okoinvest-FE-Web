// /portal/admin/bonitaet – Bonitätsauskünfte (nur Leitung, Transaktion, Compliance): offene LOI-Voraussetzungen, Auskünfte,
// Beauftragung mit Information des Betroffenen, manuelle Freigabe, Pflicht vor LOI/Gebot; Registersuche für die Registernummer.
import { AlertTriangle, CheckCircle2, ClipboardList, Gauge } from "lucide-react";
import { Hinweis, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import BonitaetWerkzeuge from "@/components/Portal/Dienste/BonitaetWerkzeuge";
import RegisterSuche from "@/components/Portal/Dienste/RegisterSuche";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { diensteBackend } from "@/lib/plattform/backend/dienste";
import { darfLesen, darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Bonitätsauskünfte" };

export default async function BonitaetSeite() {
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => diensteBackend().bonitaetUebersicht(n, {}));
  const gueltig = d.auskuenfte.filter((a) => a.gueltig).length;
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Transaktion & Compliance"
        titel="Bonitätsauskünfte"
        text="Vor einer Absichtserklärung (LOI) bzw. einem Gebot prüfen wir die Zahlungsfähigkeit erwerbender Unternehmen. Ergebnisse sehen nur Leitung, Transaktion und Compliance; jede Einsicht wird protokolliert, Betroffene werden informiert."
      />
      {d.konfig.demo && <Hinweis ton="neutral" className="mb-5">Demo-Betrieb: Die Auskünfte stammen aus einem Simulator (deterministisch je Firmenname). Für den Betrieb BONITAET_ANBIETER, BONITAET_API_URL und BONITAET_API_KEY setzen – Vertrag mit KSV1870, Creditreform, CRIF oder Dun &amp; Bradstreet nötig (docs/DIENSTE-EXTERN.md).</Hinweis>}
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={ClipboardList} label="Offene Voraussetzungen" wert={String(d.offen.length)} />
        <Kennzahl icon={Gauge} label="Auskünfte" wert={String(d.auskuenfte.length)} />
        <Kennzahl icon={CheckCircle2} label="Gültig" wert={String(gueltig)} />
        <Kennzahl icon={AlertTriangle} label="Rot / ohne Daten" wert={String(d.auskuenfte.filter((a) => ["rot", "unbekannt"].includes(a.ampel)).length)} />
      </section>
      <BonitaetWerkzeuge daten={JSON.parse(JSON.stringify(d))} />
      {darfLesen(n, "register") && (
        <div className="mt-6">
          <RegisterSuche schreiben={darfSchreiben(n, "register")} titel="Registernummer ermitteln" />
        </div>
      )}
    </>
  );
}

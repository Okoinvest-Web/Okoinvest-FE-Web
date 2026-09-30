// /portal/verifizierung/identitaet?sitzung=IP-… – Demo-Simulator des Identitätsanbieters (nur Demo-Anbieter, nur eigene Sitzung)
import { notFound } from "next/navigation";
import { SeitenKopf } from "@/components/Portal/ui";
import IdentDemoSimulator from "@/components/Portal/Dienste/IdentDemoSimulator";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const metadata = { title: "Online-Identifizierung (Simulation)", robots: { index: false } };

export default async function IdentSimulatorSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const id = typeof sp?.sitzung === "string" ? sp.sitzung : "";
  const d = await laden(() => diensteBackend().identStatus(n));
  const s = (d.sitzungen || []).find((x) => x.id === id && x.status === "ausstehend");
  if (!d.konfig?.demo || !s) notFound();
  return (
    <>
      <SeitenKopf eyebrow="Verifizierung · Demo" titel="Online-Identifizierung" text="Vorführmodus ohne echten Anbieter. Im Betrieb leitet die Plattform an den vertraglich angebundenen Identitätsanbieter weiter." />
      <IdentDemoSimulator sitzungId={s.id} />
    </>
  );
}

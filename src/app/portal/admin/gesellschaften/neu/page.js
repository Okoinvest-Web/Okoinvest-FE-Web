// /portal/admin/gesellschaften/neu[?projekt=EP-…] – Gründungsassistent (Leitung/Transaktion)
import { notFound } from "next/navigation";
import { SeitenKopf } from "@/components/Portal/ui";
import GruendungsAssistent from "@/components/Portal/Dienste/GruendungsAssistent";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { diensteBackend } from "@/lib/plattform/backend/dienste";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Neue Projektgesellschaft" };

export default async function NeueGesellschaftSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  if (!darfSchreiben(n, "gesellschaften")) notFound();
  const sp = await searchParams;
  const auswahl = await laden(() => diensteBackend().gesellschaftAuswahl(n));
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Gesellschaften"
        titel="Projektgesellschaft gründen"
        text="Der Assistent erstellt die Gründungsdaten und ein Dokumentenpaket als MUSTER zur notariellen Prüfung. Notariate bieten in der Regel keine offene Schnittstelle – Termin, Beurkundung und Eintragung werden in der Checkliste nachgehalten."
      />
      <GruendungsAssistent auswahl={JSON.parse(JSON.stringify(auswahl))} vorauswahl={typeof sp?.projekt === "string" ? sp.projekt : ""} />
    </>
  );
}

import Assistent from "@/components/Portal/Bedienung/Onboarding/Assistent";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { nutzerFuerBrowser } from "@/lib/plattform/server/route";
import { backend } from "@/lib/plattform/backend";
import { bedienung } from "@/lib/plattform/backend/bedienung";
import { hauptRolle, ONBOARDING_SCHRITTE } from "@/lib/plattform/onboarding";

export const metadata = { title: "Geführter Einstieg" };

export default async function Willkommen({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const rolle = hauptRolle(n.rollen);
  const [zustand, flaechen] = await Promise.all([
    bedienung().onboarding(n),
    rolle === "flaeche" ? backend().flaechen(n).catch(() => []) : [],
  ]);
  // Einstieg über ?schritt=objekt (Checkliste) – sonst dort weitermachen, wo zuletzt aufgehört
  const gewuenscht = ONBOARDING_SCHRITTE.indexOf(String(sp?.schritt || ""));
  const start = gewuenscht >= 0 ? gewuenscht : zustand.status === "laufend" ? Math.min(zustand.schritt, ONBOARDING_SCHRITTE.length - 1) : 0;
  return <Assistent nutzer={nutzerFuerBrowser(n)} rolle={rolle} startSchritt={start} anzahl={{ flaechen: flaechen.length }} />;
}

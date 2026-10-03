// /portal/willkommen – Onboarding-Assistent je Rolle und Untertyp (Team B1).
// ?schritt=<id> springt direkt zu einem Schritt (Wiedereinstieg aus der Checkliste „Erste Schritte“),
// sonst zum nächsten offenen Schritt. Konten ohne passenden Pfad erhalten eine kurze Übersicht.

import { Compass } from "lucide-react";
import Assistent from "@/components/Portal/Bedienung/Onboarding/Assistent";
import { lexikonEintrag } from "@/components/Portal/Bedienung/Begriff";
import { Leer } from "@/components/Portal/ui";
import Button from "@/components/ui/Button";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { nutzerFuerBrowser } from "@/lib/plattform/server/route";
import { assistentLaden } from "@/lib/plattform/server/onboarding";

export const metadata = { title: "Geführter Einstieg" };

export default async function Willkommen({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const a = await laden(() => assistentLaden(n));
  if (!a.pfad) {
    return <Leer icon={Compass} titel="Kein Einstieg für Ihre Rollen" text="Ergänzen Sie im Profil, wofür Sie das Portal nutzen – danach führt Sie der Einstieg Schritt für Schritt." aktion={<Button href="/portal/profil" pfeil>Zum Profil</Button>} />;
  }
  const begriffe = Object.fromEntries(a.pfad.schritte.filter((s) => s.begriff).map((s) => [s.begriff, lexikonEintrag(s.begriff)]).filter(([, e]) => e));
  const startSchritt = typeof sp?.schritt === "string" ? sp.schritt.slice(0, 40) : null;
  return <Assistent key={a.pfad.id} nutzer={nutzerFuerBrowser(n)} start={a.pfad} pfade={a.pfade} startSchritt={startSchritt} begriffe={begriffe} anzahl={{ flaechen: a.fakten.flaechen }} />;
}

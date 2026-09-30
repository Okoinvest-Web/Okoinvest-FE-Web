import { redirect } from "next/navigation";
import AuthRahmen from "@/components/Plattform/AuthRahmen";
import LoginFormular from "@/components/Plattform/LoginFormular";
import { abs } from "@/data/site";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { istDemo } from "@/lib/plattform/backend";
import { sicheresZiel } from "@/lib/plattform/client";
import { DEMO_KONTEN, DEMO_PASSWORT } from "@/lib/plattform/backend/demo/seed";
import { rolleLabel } from "@/lib/plattform/konstanten";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Anmelden | ÖkoInvest",
  description: "Anmeldung zum Portal von ÖkoInvest: Status Ihrer Anfragen, Flächen und Projekte, Projektbörse, Dokumente und Nachrichten an einem Ort.",
  alternates: { canonical: abs("/login") },
  robots: { index: false, follow: true },
};

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  const weiter = typeof sp?.weiter === "string" ? sicheresZiel(sp.weiter, "") : "";
  const nutzer = await aktuellerNutzer().catch(() => null);
  if (nutzer) redirect(weiter || "/portal");

  const demoKonten = istDemo()
    ? DEMO_KONTEN.map((k) => ({ email: k.email, passwort: DEMO_PASSWORT(), label: rolleLabel(k.rollen[0]) }))
    : [];

  return (
    <AuthRahmen eyebrow="Portal" titel="Willkommen zurück" text="Melden Sie sich an, um Status, Dokumente und Nachrichten zu Ihren Vorgängen zu sehen.">
      <LoginFormular weiter={weiter} hinweis={typeof sp?.hinweis === "string" ? sp.hinweis : ""} demoKonten={demoKonten} demo={istDemo()} />
    </AuthRahmen>
  );
}

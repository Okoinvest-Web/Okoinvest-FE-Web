import { redirect } from "next/navigation";
import AuthRahmen from "@/components/Plattform/AuthRahmen";
import RegistrierFormular from "@/components/Plattform/RegistrierFormular";
import { abs } from "@/data/site";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { sicheresZiel } from "@/lib/plattform/client";
import { ROLLEN_IDS, rolleLabel } from "@/lib/plattform/konstanten";
import { kennung } from "@/lib/plattform/validierung";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kostenlos registrieren | ÖkoInvest",
  description: "Kostenloses Konto für Flächeneigentümer, Landwirte, Investoren, Projektentwickler, Unternehmen und Mitglieder – Status, Dokumente und Nachrichten im Portal.",
  alternates: { canonical: abs("/registrieren") },
  robots: { index: false, follow: true },
};

export default async function Registrieren({ searchParams }) {
  const sp = await searchParams;
  const rolle = ROLLEN_IDS.includes(sp?.rolle) ? sp.rolle : "";
  const vorgang = kennung(sp?.vorgang);
  const weiter = typeof sp?.weiter === "string" ? sicheresZiel(sp.weiter, "") : "";
  const nutzer = await aktuellerNutzer().catch(() => null);
  if (nutzer) redirect(weiter || "/portal");

  return (
    <AuthRahmen
      rolle={rolle}
      nutzenOben
      eyebrow={rolle ? `Registrierung · ${rolleLabel(rolle)}` : "Registrierung"}
      titel="Kostenloses Konto anlegen"
      text="In zwei Minuten startklar. Ihre Daten nutzen wir nur für die Bearbeitung Ihrer Vorgänge."
    >
      <RegistrierFormular rolleStart={rolle} vorgang={vorgang} weiter={weiter} />
    </AuthRahmen>
  );
}

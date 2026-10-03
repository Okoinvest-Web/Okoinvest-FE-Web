import { Lock } from "lucide-react";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { VerdachtFormular } from "@/components/Portal/Compliance/Werkzeuge";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { VERDACHT_ANLAESSE } from "@/lib/plattform/compliance/verdacht";

export const metadata = { title: "Vertraulicher Hinweis an Compliance" };

export default async function HinweisSeite({ searchParams }) {
  await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  return (
    <>
      <SeitenKopf eyebrow="Backoffice" titel="Vertraulicher Hinweis an Compliance" text="Ihnen ist bei einem Kunden, einer Zahlung oder einem Dokument etwas aufgefallen, das auf Geldwäsche, Terrorismusfinanzierung oder Sanktionsumgehung hindeuten könnte? Melden Sie es hier – vertraulich und ohne Rückfrage bei der betroffenen Person." />
      <Hinweis ton="info" titel="So geht es weiter" icon={Lock}>Der Hinweis geht ausschließlich an die Backoffice-Rolle „Compliance“ (Geldwäschebeauftragte/r). Sie sehen die Akte danach nicht. Informieren Sie die betroffene Person nicht (Tipping-off-Verbot) und setzen Sie laufende Auszahlungen bis zur Klärung aus.</Hinweis>
      <Karte className="mt-6" titel="Hinweis geben">
        <VerdachtFormular anlaesse={VERDACHT_ANLAESSE} vorbelegt={{ kontoId: typeof sp.konto === "string" ? sp.konto.slice(0, 20) : "" }} ziel="/api/admin/hinweis" />
      </Karte>
    </>
  );
}

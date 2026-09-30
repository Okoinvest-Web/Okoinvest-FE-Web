import { SeitenKopf } from "@/components/Portal/ui";
import { VorlagenEditor } from "@/components/Portal/Backoffice/Vorlagen";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Vorlagen" };

export default async function AdminVorlagen() {
  const n = await portalNutzer({ admin: true });
  const vorlagen = await backend().vorlagen(n);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="E-Mail- und Nachrichtenvorlagen" text="Mit Platzhaltern wie {{vorname}} oder {{flaeche.ha}}, Vorschau an echten Objekten und Versionen. Genutzt im CRM und in Automationen." />
      <VorlagenEditor vorlagen={vorlagen} darfSchreiben={darfSchreiben(n, "vorlagen")} />
    </div>
  );
}

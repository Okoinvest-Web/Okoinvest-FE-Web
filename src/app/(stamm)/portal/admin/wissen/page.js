import { Lock } from "lucide-react";
import { SeitenKopf } from "@/components/Portal/ui";
import Wissen from "@/components/Portal/Team/Wissen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Wissensdatenbank" };

export default async function WissenSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const s = serviceBackend();
  const artikel = await laden(() => s.wissen(n, {}));
  const aktivId = typeof sp?.artikel === "string" ? sp.artikel : artikel[0]?.id;
  const aktiv = aktivId ? await s.wissenArtikel(n, aktivId).catch(() => null) : null;
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · intern" titel="Wissensdatenbank" text="Abläufe, Checklisten, Recht und Technik für das Team – durchsuchbar, mit Versionen.">
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-500"><Lock aria-hidden="true" className="h-3.5 w-3.5" /> Nur für Backoffice-Konten sichtbar – nie für Kunden oder die Website.</p>
      </SeitenKopf>
      <Wissen artikel={artikel} aktiv={aktiv} darfSchreiben={darfSchreiben(n, "wissen")} />
    </>
  );
}

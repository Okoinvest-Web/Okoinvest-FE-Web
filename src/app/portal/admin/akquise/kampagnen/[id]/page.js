import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SeitenKopf } from "@/components/Portal/ui";
import KampagneDetail from "@/components/Portal/Akquise2/KampagneDetail";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { darfSchreiben, unterrollen } from "@/lib/plattform/rechte";

export const metadata = { title: "Akquise-Kampagne" };

// Kampagne im Detail – enthält Eigentümerdaten: nur Backoffice-Unterrollen Leitung/Akquise (Bereich „geodaten“), sonst 404.
export default async function KampagneSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const d = await laden(() => akquise2Backend().kampagne(n, id));
  return (
    <div className="space-y-2">
      <Link href="/portal/admin/akquise/kampagnen" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Alle Kampagnen
      </Link>
      <SeitenKopf eyebrow="Backoffice · Akquise-Kampagne" titel={d.kampagne.name} text={d.kampagne.beschreibung || undefined} />
      <KampagneDetail daten={d} darfSchreiben={darfSchreiben(n, "geodaten") && darfSchreiben(n, "akquise")} leitung={unterrollen(n).includes("leitung")} />
    </div>
  );
}

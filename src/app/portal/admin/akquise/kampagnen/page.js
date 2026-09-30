import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SeitenKopf } from "@/components/Portal/ui";
import KampagnenListe from "@/components/Portal/Akquise2/KampagnenListe";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { darfSchreiben, unterrollen } from "@/lib/plattform/rechte";
import * as geo from "@/lib/plattform/geodaten";

export const metadata = { title: "Akquise-Kampagnen" };

// Akquise-Kampagnen (A1b): nur Backoffice-Unterrollen mit Bereich „geodaten“ (Leitung, Akquise) – sonst 404.
export default async function KampagnenSeite() {
  const n = await portalNutzer({ admin: true });
  const r = await laden(() => akquise2Backend().kampagnen(n));
  const u = geo.geodatenModus() ? await laden(() => geo.uebersicht(n)) : { gebiete: {} };
  return (
    <div className="space-y-2">
      <Link href="/portal/admin/akquise" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Akquise-Pipeline
      </Link>
      <SeitenKopf
        eyebrow="Backoffice · Akquise"
        titel="Akquise-Kampagnen"
        text="Aus Kandidatenflächen eine Kampagne bilden: Eigentümer über das Grundbuch ermitteln, Serienbrief mit persönlichem Link drucken und versenden, Rücklauf verfolgen, automatisch nachfassen – Widersprüche sperren über alle Kampagnen."
      />
      <KampagnenListe kampagnen={r.kampagnen} sperrlisteAnzahl={r.sperrlisteAnzahl} gebiete={u.gebiete || {}} darfSchreiben={darfSchreiben(n, "geodaten") && darfSchreiben(n, "akquise")} leitung={unterrollen(n).includes("leitung")} />
    </div>
  );
}
